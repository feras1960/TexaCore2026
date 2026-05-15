# 🔧 تعليمات إصلاح نظام الاتصال — للتنفيذ المباشر

> **تاريخ الإنشاء**: 2026-05-15
> **أُنشئ بواسطة**: Claude Opus (تحليل معمّق)
> **الهدف**: إصلاح 4 مشاكل جذرية في نظام الاتصال ليعمل بشكل مباشر وصحيح

---

## ⚠️ ملاحظات حرجة قبل البدء

1. **لا تُعدّل** أي ملف غير مذكور هنا
2. **لا تُلغِ** تسجيل SIP من المتصفح (تم تعطيله مسبقاً وهو صحيح)
3. **الترتيب مهم** — نفّذ المراحل بالتسلسل
4. **SSH للسيرفر**: `sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17`
5. **بيانات الـ PBX**: Domain=`pbx.texacore.ai`, Ext=`100`, Pass=`TexaCore2026Pbx100`

---

## المرحلة 1: إصلاح تسجيل السوفت فون المكتبي (الأهم!)

### الملف: `texacore-softphone/src/renderer/hooks/useSipEngine.ts`

### المشكلة:
السوفت فون يسجّل مرة واحدة فقط عند البدء. إذا انقطع WebSocket (شبكة، إعادة تشغيل Asterisk، انتهاء expires) لا يعيد التسجيل أبداً → يظهر "غير متصل" ولا يرن.

### الحل:
استبدل كامل دالة `connectSip` (تبدأ من السطر 96 تقريباً) بالكود التالي:

```typescript
  const connectSip = useCallback(async () => {
    // Cleanup previous UA if exists
    if (uaRef.current) {
      try {
        if (registererRef.current) {
          await registererRef.current.dispose();
          registererRef.current = null;
        }
        await uaRef.current.stop();
        uaRef.current = null;
      } catch (e) {
        console.warn('[SIP] Cleanup error (safe to ignore):', e);
      }
    }

    const domain = localStorage.getItem('pbx_domain') || import.meta.env.VITE_PBX_DOMAIN || 'pbx.texacore.ai';
    const extension = localStorage.getItem('pbx_ext') || import.meta.env.VITE_SIP_USERNAME || '100';
    const password = localStorage.getItem('pbx_pass') || import.meta.env.VITE_SIP_PASSWORD || 'TexaCore2026Pbx100';

    if (!domain || !extension || !password) {
      console.warn('[SIP] Missing PBX credentials');
      return;
    }

    const wssServer = `wss://${domain}:8089/ws`;
    const uri = UserAgent.makeURI(`sip:${extension}@${domain}`);
    if (!uri) return;

    console.log(`[SIP] Connecting to ${wssServer} as ${extension}...`);

    const ua = new UserAgent({
      uri,
      authorizationUsername: extension,
      authorizationPassword: password,
      transportOptions: {
        server: wssServer,
        connectionTimeout: 10,
        keepAliveInterval: 15,
      },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      },
      delegate: {
        onInvite: (invitation: Invitation) => {
          const number = invitation.remoteIdentity.uri.user || 'Unknown';
          console.log(`[SIP] 📞 Incoming call from: ${number}`);
          setActiveNumber(number);
          setCallState('ringing');
          callDirectionRef.current = 'inbound';
          callStartTimeRef.current = 0;
          sessionRef.current = invitation;
          
          startRingtone();
          
          try {
            new Notification('مكالمة واردة 📞', {
              body: `اتصال من: ${number}`,
            });
          } catch(e) {
            console.error("Notif error:", e);
          }
          
          invitation.stateChange.addListener((state) => {
            if (state === SessionState.Established) {
              setCallState('connected');
              stopRingtone();
              callStartTimeRef.current = Date.now();
              setupRemoteAudio(invitation);
            } else if (state === SessionState.Terminated) {
              handleCallEnd();
            }
          });
        }
      }
    });

    uaRef.current = ua;

    try {
      await ua.start();
      console.log('[SIP] ✅ UserAgent started');

      // --- Auto-reconnect on transport disconnect ---
      const transport = ua.transport as any;
      if (transport && typeof transport.onDisconnect === 'function') {
        // sip.js >=0.20 style
        const originalOnDisconnect = transport.onDisconnect.bind(transport);
        transport.onDisconnect = (error?: Error) => {
          originalOnDisconnect(error);
          console.warn('[SIP] ⚠️ Transport disconnected:', error?.message);
          setIsRegistered(false);
          setTimeout(() => {
            console.log('[SIP] 🔄 Attempting reconnect...');
            connectSip();
          }, 3000);
        };
      } else if (transport) {
        // Fallback: poll WebSocket state
        const wsCheckInterval = setInterval(() => {
          const ws = transport.ws || transport._ws;
          if (ws && ws.readyState > 1) { // CLOSING or CLOSED
            console.warn('[SIP] ⚠️ WebSocket closed, reconnecting...');
            setIsRegistered(false);
            clearInterval(wsCheckInterval);
            setTimeout(() => connectSip(), 3000);
          }
        }, 5000);
      }

      const reg = new Registerer(ua, { expires: 120 });
      registererRef.current = reg;
      
      reg.stateChange.addListener((regState) => {
        const registered = regState === RegistererState.Registered;
        setIsRegistered(registered);
        console.log(`[SIP] Registration: ${regState}${registered ? ' ✅' : ''}`);
        
        // Auto re-register if lost
        if (regState === RegistererState.Unregistered) {
          console.warn('[SIP] ⚠️ Registration lost — will re-register in 3s');
          setTimeout(async () => {
            try {
              if (registererRef.current && uaRef.current) {
                await registererRef.current.register();
                console.log('[SIP] ✅ Re-registered successfully');
              }
            } catch (e) {
              console.warn('[SIP] Re-register failed, full reconnect in 5s');
              setTimeout(() => connectSip(), 5000);
            }
          }, 3000);
        }
      });

      await reg.register();
      console.log('[SIP] ✅ Registered successfully as', extension);
    } catch (err) {
      console.error('[SIP] ❌ Connect error:', err);
      setIsRegistered(false);
      // Retry on failure
      setTimeout(() => {
        console.log('[SIP] 🔄 Retrying connection...');
        connectSip();
      }, 5000);
    }
  }, []);
```

### أيضاً: تعديل useEffect الأولي (سطر 60-73)

استبدل `useEffect` بالتالي لإضافة cleanup أنظف:

```typescript
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = true;

    connectSip();

    return () => {
      if (registererRef.current) {
        try { registererRef.current.dispose(); } catch(e) {}
      }
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch(e) {}
      }
      stopRingtone();
    };
  }, []);
```

### بعد التعديل — بناء وتثبيت:
```bash
cd "/Users/macbook/TexaCore-Backups-2026-03-25/erpsystem supabase/texacore-softphone"
npm run build
# إغلاق التطبيق الحالي
osascript -e 'tell application "TexaCore Softphone" to quit' 2>/dev/null
sleep 2
# تثبيت النسخة الجديدة
hdiutil attach "release/TexaCore Softphone-1.0.0-arm64.dmg" -nobrowse -quiet
cp -R "/Volumes/TexaCore Softphone/TexaCore Softphone.app" /Applications/
hdiutil detach "/Volumes/TexaCore Softphone" -quiet
sleep 1
open -a "TexaCore Softphone"
```

### التحقق:
```bash
# انتظر 5 ثوان ثم تحقق
sleep 5
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "pjsip show contacts" | grep "100/"'
# يجب أن يظهر contact واحد فقط لـ 100
```

---

## المرحلة 2: إصلاح Asterisk Dialplan

### المشكلة:
`click-to-call-context` يسمح فقط بالامتداد 700. عندما يعاود الأدمن الاتصال ويرسل `100` للزائر، Asterisk يرفض المكالمة بـ `CALL_REJECTED`.

### الحل — عبر SSH:
```bash
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 'cat > /etc/asterisk/extensions_click_to_call.conf << '\''CONF'\''
[click-to-call-context]
; Direct call to extension 100 (agent callback - when admin calls visitor back)
exten => 100,1,NoOp(Direct WebRTC-to-Agent call from ${CHANNEL(peerip)})
same  =>     n,Set(GROUP()=webrtc-guests)
same  =>     n,GotoIf($[${GROUP_COUNT(webrtc-guests)} > 10]?spam)
same  =>     n,Answer()
same  =>     n,Wait(0.5)
same  =>     n,Dial(PJSIP/100,60,m(texacore-ivr))
same  =>     n,Hangup()

; IVR call via 700 (visitor initiates call)
exten => 700,1,NoOp(WebRTC Guest from ${CHANNEL(peerip)})
same  =>     n,Set(GROUP()=webrtc-guests)
same  =>     n,GotoIf($[${GROUP_COUNT(webrtc-guests)} > 10]?spam)
same  =>     n,Answer()
same  =>     n,Wait(0.5)
same  =>     n,Dial(PJSIP/100,60,m(texacore-ivr))
same  =>     n,Hangup()

exten => _X.,1,Hangup(CALL_REJECTED)
exten => _X.,n(spam),Playback(all-circuits-busy-now)
same  =>     n,Hangup(INTERWORKING)
exten => i,1,Hangup(CALL_REJECTED)
exten => t,1,Hangup(NORMAL_CLEARING)
exten => h,1,NoOp(Call ended)
CONF'
```

### ثم أعد تحميل الـ dialplan:
```bash
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "dialplan reload"'
```

### التحقق:
```bash
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "dialplan show 100@click-to-call-context"'
# يجب أن يظهر الـ route الجديد للامتداد 100
```

---

## المرحلة 3: إصلاح "معاودة الاتصال" من ERP

### الملف: `src/features/pbx/components/OnlineVisitorsList.tsx`
### السطر: 131

### التغيير:
```diff
- agent_ext: '700'
+ agent_ext: '100'
```

**الكود الكامل للسياق** (سطر 126-133):
```typescript
      await channelRef.current.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          to_uuid: visitor.uuid,
          agent_ext: '100'   // ← كان '700' — غيّره لـ '100' للاتصال المباشر
        }
      });
```

---

## المرحلة 4: إصلاح Landing Page Widget

### الملف: `texacore-astro/public/widgets/webrtc-call.js`  
### ملاحظة: هذا الملف في مشروع **texacore-astro** وليس erpsystem supabase!
### السطر: 103

### التغيير:
```diff
- showIncomingCallUI(payload.payload.agent_ext || '700');
+ showIncomingCallUI(payload.payload.agent_ext || '100');
```

---

## المرحلة 5: اختبار شامل

### اختبار 1 — تسجيل السوفت فون:
```bash
# تأكد أن السوفت فون مسجّل
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "pjsip show contacts" | grep "100/"'
# النتيجة المتوقعة: سطر واحد يحتوي على contact لـ 100
```

### اختبار 2 — مكالمة داخلية:
```bash
# أرسل مكالمة اختبار من Asterisk للسوفت فون
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "channel originate PJSIP/100 application Playback hello-world"'
# انتظر 3 ثوان ثم تحقق
sleep 3
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "core show channels"'
# النتيجة المتوقعة: قناة PJSIP/100 في حالة Ringing
# (أغلق المكالمة بعدها)
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "core show channels" | grep PJSIP/100 | awk "{print \$1}" | xargs -I{} asterisk -rx "channel request hangup {}"'
```

### اختبار 3 — route الـ 100 في dialplan:
```bash
sshpass -p 'XBe-W+ehuTRm/gz5' ssh -o StrictHostKeyChecking=no root@153.92.222.17 \
  'asterisk -rx "dialplan show 100@click-to-call-context"'
# يجب أن يعرض الـ route: NoOp, Set, GotoIf, Answer, Wait, Dial
```

### اختبار 4 — يدوي من Landing Page:
1. افتح Landing Page في المتصفح
2. اضغط زر "اتصل بنا مجاناً"
3. راقب السوفت فون المكتبي ← يجب أن يرن
4. اردد → المكالمة تتصل ← أنهِ المكالمة
5. تأكد أن السوفت فون يعود لـ "متاح" بعد الإنهاء

### اختبار 5 — يدوي "معاودة الاتصال":
1. افتح Landing Page في نافذة (لتظهر كزائر)
2. في ERP → صفحة PBX → قائمة "زوار الموقع المتصلين"
3. اضغط "اتصال" بجانب الزائر
4. في Landing Page يجب أن يظهر "مكالمة واردة من خدمة العملاء"
5. اقبل المكالمة ← السوفت فون يجب أن يرن
6. ارد من السوفت فون ← المكالمة تتصل

---

## ملخص سريع للتغييرات

| # | الملف | ماذا تغيّر | لماذا |
|---|---|---|---|
| 1 | `texacore-softphone/.../useSipEngine.ts` | إعادة كتابة `connectSip` مع auto-reconnect | السوفت فون يفقد التسجيل بصمت |
| 2 | `/etc/asterisk/extensions_click_to_call.conf` | إضافة route لـ ext 100 | Asterisk يرفض 100 من WebRTC |
| 3 | `src/.../OnlineVisitorsList.tsx` سطر 131 | `'700'` → `'100'` | معاودة الاتصال تدخل IVR |
| 4 | `texacore-astro/.../webrtc-call.js` سطر 103 | `'700'` → `'100'` | نفس المشكلة من جهة الزائر |

---

## 🚫 تحذيرات

1. **لا تُعيد تفعيل SIP في المتصفح** — `SoftphoneContext.tsx` معطّل عمداً
2. **لا تُعدّل `pjsip.conf`** — الإعدادات صحيحة
3. **لا تُعدّل `extensions.conf`** — فقط `extensions_click_to_call.conf`
4. **بعد تعديل useSipEngine.ts** يجب إعادة بناء التطبيق (`npm run build`) وتثبيته
5. **كلمة مرور SSH قد تحتاج محاولتين** — أحياناً الأولى تفشل وتنجح الثانية

# NexaConnect - Architecture & Development Documentation

تم إنشاء هذا التوثيق ليكون المرجع الشامل والأساسي لفهم بنية تطبيق **NexaConnect** والميزات التي تم تنفيذها.

> آخر تحديث: 17 مايو 2026 — v17

---

## 1. نظرة عامة على النظام (System Overview)
تطبيق **NexaConnect** هو تطبيق اتصالات موحد (Unified Communications) مبني بـ Flutter للعمل على منصات متعددة (Web, iOS, Android). 
يعتمد التطبيق على تقنيتين أساسيتين:
1. **LiveKit (WebRTC)**: لنظام PTT (Push-to-Talk) والمكالمات الصوتية/المرئية الخاصة.
2. **Supabase**: للمصادقة، Realtime Signaling، تخزين التسجيلات، وتحليل AI.
3. **SIP/Asterisk** *(اختياري)*: للاتصال بالمقاسم الخارجية (PSTN) فقط.

---

## 2. البنية التحتية (Infrastructure)

### 2.1 LiveKit Server
| المكون | التفاصيل |
|---|---|
| الإصدار | v1.12.0 |
| الموقع | `153.92.222.17:7880` |
| WSS Proxy | `wss://pbx.texacore.ai:7443` → `localhost:7880` (Nginx) |
| API Key | `APITexaCore456c6933` |
| API Secret | محفوظ في `/etc/livekit/.env` |
| Systemd | `livekit.service` — يبدأ تلقائياً |
| SSL | شهادات `pbx.texacore.ai` مربوطة بـ Nginx |

### 2.2 Token Generator
- **Edge Function**: `livekit-token` على Supabase
- يُنشئ JWT token لكل مستخدم + غرفة
- يُستخدم من `livekit_service.dart` و `livekit_call_service.dart`

### 2.3 Supabase
- **Realtime**: إشارات PTT (قفل المتحدث) + إشارات المكالمات (رنين/رد/إنهاء)
- **Storage**: تخزين تسجيلات PTT والمكالمات
- **Edge Functions**: `livekit-token`, `analyze-call`
- **Database**: جداول القنوات، الأعضاء، سجلات المكالمات، التحليلات

---

## 3. الوحدات الأساسية (Core Modules)

### 3.1 نظام PTT — NexaLive
> **النظام الأساسي:** LiveKit Rooms + Supabase Realtime

**الملفات:**
- `lib/core/services/livekit_service.dart` — الخدمة الأساسية (Room دائم)
- `lib/core/services/livekit_ptt_service.dart` — إدارة قنوات PTT
- `lib/features/talkie/screens/nexa_talkie_screen.dart` — الواجهة الرئيسية
- `lib/features/talkie/widgets/ptt_button.dart` — زر PTT (كبس + سحب للفيديو)

**آلية العمل:**
```
المستخدم يدخل التطبيق
→ LiveKitService.connect() — اتصال بغرفة القناة المختارة
→ ضغط PTT → setMicrophoneEnabled(true) + broadcast "يتحدث"
→ إفلات → setMicrophoneEnabled(false) + رفع التسجيل لـ Storage
→ الآخرون: يسمعون مباشرة + يُقفل زر PTT عندهم
```

**الميزات المنفذة:**
- ✅ صوت PTT مباشر عبر LiveKit WebRTC
- ✅ قفل ميكروفون (Half-Duplex): شخص واحد يتحدث
- ✅ مؤشر "فلان يتحدث الآن" مع قفل الزر
- ✅ تاريخ الرسائل الصوتية متزامن (Supabase Storage + Realtime)
- ✅ فلاتر القنوات (فريق المستودع، فريق المبيعات، الكل)
- ✅ مانع الصدى + كبت الضوضاء (AEC + Noise Suppression)
- ✅ مؤشر حالة الشبكة (أخضر/أحمر)
- ✅ Guest UUID تلقائي للتجربة

### 3.2 Video PTT — بث فيديو مباشر
> **ميزة فريدة — غير موجودة في Zello أو أي منافس مجاني**

**آلية العمل:**
```
كبس مطوّل على زر PTT → صوت فقط 🎤
كبس مطوّل + سحب للأعلى → صوت + فيديو 📹🎤
إفلات → إيقاف البث

عند المستقبل:
→ يظهر فيديو بملء الشاشة تلقائياً
→ اسم المتحدث + مؤشر "بث مباشر"
→ يُغلق تلقائياً عند انتهاء البث
```

**الميزات:**
- ✅ سحب للأعلى = تفعيل الكاميرا
- ✅ عرض الفيديو المحلي (300px) مع زر تبديل كاميرا
- ✅ فيديو ملء الشاشة عند المستقبل (`_FullScreenVideoOverlay`)
- ✅ تبديل كاميرا أمامية ↔ خلفية (`switchCamera()`)
- ✅ إغلاق تلقائي عند توقف المتحدث

### 3.3 مكالمات خاصة 1↔1 (مثل واتساب)
> **غرفة LiveKit مستقلة** — لا تؤثر على PTT

**الملفات:**
- `lib/core/services/livekit_call_service.dart` — خدمة مكالمات مستقلة
- `lib/features/calls/screens/livekit_call_screen.dart` — واجهة المكالمة
- `lib/core/services/call_recording_service.dart` — تسجيل المكالمات

**آلية العمل:**
```
المتصل يضغط "اتصال مباشر" من NexaLive
→ يختار الشخص من القائمة
→ Supabase Realtime broadcast: call_invite
→ المستقبل يرى شاشة رنين
→ يقبل → كلاهما ينضمان لغرفة LiveKit خاصة (call_room)
→ صوت مباشر HD + خيار فيديو
→ إنهاء → حفظ في سجل المكالمات
```

**الفصل المعماري:**
```
PTT  → LiveKitService._room        ← دائماً متصلة بالقناة
Call → LiveKitCallService._callRoom ← تتصل عند المكالمة فقط
= يمكن إجراء مكالمة خاصة أثناء بقاء PTT متصل!
```

### 3.4 تسجيل وتحليل AI
**الملفات:**
- `lib/core/services/call_recording_service.dart`
- Edge Function: `analyze-call`

**آلية العمل:**
```
المكالمة تنتهي
→ التسجيل يُرفع لـ Supabase Storage (مشفر)
→ Edge Function تستدعي OpenAI Whisper → تحويل صوت لنص
→ GPT-4o-mini → ملخص + مشاعر + نقاط عمل (Action Items)
→ النتائج تُحفظ في جدول `call_analyses`
→ التسجيل الصوتي يُحذف (خصوصية)
```

### 3.5 وحدة المكالمات SIP (للمقاسم الخارجية)
- **الموقع**: `lib/core/services/sip_service.dart`
- **الاستخدام**: الاتصال بالمقاسم والخطوط الأرضية عبر Asterisk
- **ملاحظة**: SIP يُستخدم فقط للمقاسم — PTT والمكالمات الداخلية عبر LiveKit

### 3.6 وحدة المحادثات النصية (Chats Module)
- **البنية التحتية:**
  - جداول `chat_conversations`, `chat_participants`, `chat_messages`, `chat_read_receipts`
  - محمية بـ **RLS (Row Level Security)**
  - **Supabase Realtime** لاستقبال الرسائل فورياً

---

## 4. هيكل الملفات

```
nexa_connect/lib/
├── core/
│   ├── config/
│   │   └── env.dart                        ✅ LiveKit URL + API Key
│   ├── providers/
│   │   └── livekit_provider.dart            ✅ PTT + Call providers
│   ├── models/
│   │   └── call_log.dart                    ✅
│   └── services/
│       ├── livekit_service.dart             ✅ الخدمة الأساسية (PTT Room)
│       ├── livekit_ptt_service.dart         ✅ إدارة قنوات PTT
│       ├── livekit_call_service.dart        ✅ مكالمات 1↔1 (Room مستقل)
│       ├── call_log_service.dart            ✅ سجل المكالمات
│       ├── call_recording_service.dart      ✅ تسجيل + AI تحليل
│       ├── sip_service.dart                 ✅ للمقاسم الخارجية فقط
│       └── ptt_service.dart                 ⚠️ [legacy] SIP PTT القديم
├── features/
│   ├── calls/
│   │   └── screens/
│   │       └── livekit_call_screen.dart     ✅ مكالمة صوت + فيديو
│   ├── talkie/
│   │   ├── screens/
│   │   │   └── nexa_talkie_screen.dart      ✅ PTT + Video PTT + Remote Video
│   │   └── widgets/
│   │       └── ptt_button.dart              ✅ سحب للأعلى = فيديو
│   └── home/
│       └── screens/
│           └── main_screen.dart             ✅ استقبال المكالمات
```

---

## 5. المعايير التصميمية للواجهة (UI/UX Guidelines)
1. **الأسلوب الزجاجي (Glassmorphism)**: `BackdropFilter` مع تدرجات شفافة.
2. **شريط الفلاتر العائم**: بدل الأزرار التقليدية.
3. **تعدد اللغات**: ملفات `en.json` و `ar.json`.

---

## 6. Supabase Edge Functions

| الوظيفة | الوصف |
|---|---|
| `livekit-token` | إنشاء JWT token لدخول غرف LiveKit |
| `analyze-call` | تحليل تسجيل المكالمة: Whisper → GPT → ملخص + نقاط عمل |

---

## 7. جداول قاعدة البيانات (PTT + Calls)

| الجدول | الوصف |
|---|---|
| `nexa_ptt_channels` | قنوات PTT (اسم، نوع، conference_room) |
| `nexa_ptt_members` | أعضاء القنوات (user_id, role, is_online) |
| `nexa_ptt_invitations` | دعوات الانضمام للقنوات |
| `nexa_ptt_activity` | نشاط PTT (تسجيلات صوتية) |
| `pbx_call_logs` | سجل المكالمات (caller, callee, duration, status) |
| `call_analyses` | تحليلات AI للمكالمات (transcript, summary, sentiment) |

---

*تم إعداد هذا المستند ليتم الرجوع إليه عند بدء أي جلسة برمجة جديدة، لضمان استمرارية السياق وجودة التنفيذ.*

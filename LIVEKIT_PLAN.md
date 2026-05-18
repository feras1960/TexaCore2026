# 🗺️ خارطة طريق NexaLive — الخطة الشاملة المُحدّثة

> آخر تحديث: 17 مايو 2026 — v14

---

## 🏗️ البنية التحتية

| المكون | الحالة | التفاصيل |
|---|:---:|---|
| LiveKit Server | ✅ يعمل | v1.12.0 على `153.92.222.17:7880` |
| WSS Proxy (Nginx) | ✅ يعمل | `wss://pbx.texacore.ai:7443` → `localhost:7880` |
| Token Generator | ✅ يعمل | Supabase Edge Function `livekit-token` |
| Flutter SDK | ✅ مثبت | `livekit_client: ^2.7.0` |
| API Key | ✅ جاهز | `APITexaCore456c6933` |
| API Secret | ✅ جاهز | محفوظ في `/etc/livekit/.env` |
| Systemd Service | ✅ يعمل | يبدأ تلقائياً مع السيرفر |
| SSL Certificates | ✅ جاهزة | شهادات `pbx.texacore.ai` مربوطة بـ Nginx |

---

## 📋 المراحل التنفيذية

### المرحلة A: البنية الأساسية ✅ مكتملة
> **الهدف:** ربط التطبيق بـ LiveKit وتشغيل أول اتصال صوتي

| # | المهمة | الملف | الحالة |
|---|---|---|:---:|
| A1 | إضافة حزم LiveKit | `pubspec.yaml` | ✅ |
| A2 | إنشاء خدمة LiveKit | `livekit_service.dart` | ✅ |
| A3 | إنشاء Token Generator | Edge Function `livekit-token` | ✅ |
| A4 | إعدادات LiveKit | `env.dart` — `wss://pbx.texacore.ai:7443` | ✅ |

---

### المرحلة B: PTT — NexaLive ✅ مكتملة
> **الهدف:** استبدال Asterisk ConfBridge بغرف LiveKit للـ PTT

| # | المهمة | الملف | الحالة |
|---|---|---|:---:|
| B1 | إنشاء خدمة PTT | `livekit_ptt_service.dart` | ✅ |
| B2 | ربط زر PTT | `ptt_button.dart` → LiveKit | ✅ |
| B3 | تعديل شاشة التوكي | `nexa_talkie_screen.dart` → غرف LiveKit | ✅ |
| B4 | Realtime Signaling | Supabase Realtime — قفل PTT بين المستخدمين | ✅ |
| B5 | Rebranding | NexaTalkie → **NexaLive** | ✅ |
| B6 | مانع الصدى | Echo Cancellation + Noise Suppression | ✅ |
| B7 | مؤشر حالة الشبكة | أيقونة ديناميكية (أخضر/أحمر) | ✅ |
| B8 | Guest IDs | UUID تلقائي للتجربة بدون تسجيل دخول | ✅ |
| B9 | حماية الضغط السريع | `_isBusy` guard لمنع race conditions | ✅ |
| B10 | تحديد محاولات SIP | 3 محاولات فقط بدل loop لانهائي | ✅ |

**الإنجاز:**
```
قبل (Asterisk):
  PTT → SIP REGISTER → انتظار → INVITE → ConfBridge → صوت عبر RTP
  ⏱️ 3-5 ثواني + retry loop لانهائي عند الفشل

بعد (LiveKit):
  PTT → LiveKit Room.connect() → نشر AudioTrack → صوت عبر WebRTC
  ⏱️ < 500ms + إعادة اتصال تلقائية فورية
```

---

### المرحلة C: مكالمات صوتية 1↔1 (مثل واتساب) ✅ مكتملة
> **الهدف:** اتصال مباشر بين مستخدمين داخل التطبيق

| # | المهمة | الملف | الحالة |
|---|---|---|:---:|
| C1 | شاشة المكالمة | `livekit_call_screen.dart` | ✅ |
| C2 | نظام الرنين | Supabase Realtime Broadcast | ✅ |
| C3 | خدمة المكالمات المستقلة | `livekit_call_service.dart` (غرفة Room منفصلة عن PTT) | ✅ |
| C4 | تاريخ المكالمات | جدول `pbx_call_logs` | ✅ |
| C5 | إشعارات Push | `call_notification_service.dart` | 🔴 قادمة |

**التدفق:**
```
المتصل يضغط اتصال → Supabase Realtime يُبلغ المستقبل
→ المستقبل يرد → كلاهما ينضمان لغرفة LiveKit خاصة (منفصلة عن PTT)
→ صوت HD مباشر مشفر ← بدون أي تأخير
```

**ملاحظة معمارية:**
```
PTT  → LiveKitService (_room)        ← دائماً متصلة بالقناة
Call → LiveKitCallService (_callRoom) ← غرفة مستقلة تتصل عند المكالمة فقط
= لا تعارض! يمكن إجراء مكالمة خاصة بدون فصل قناة PTT
```

---

### المرحلة D: مكالمات فيديو + Video PTT ✅ مكتملة
> **الهدف:** فيديو 1↔1 + Video PTT في القنوات

| # | المهمة | الملف | الحالة |
|---|---|---|:---:|
| D1 | فيديو في المكالمة 1↔1 | `livekit_call_screen.dart` — زر فيديو + PiP | ✅ |
| D2 | Video PTT (سحب للأعلى) | `ptt_button.dart` — سحب للأعلى = كاميرا | ✅ |
| D3 | عرض فيديو المتحدث | `nexa_talkie_screen.dart` — VideoTrackRenderer | ✅ |
| D4 | تبديل كاميرا أمامية/خلفية | `livekit_service.dart` + UI | 🔄 جاري |
| D5 | مكالمات جماعية (Grid) | `livekit_group_call_screen.dart` | 🔴 قادمة |

**طريقة عمل Video PTT:**
```
كبس مطوّل      → PTT صوتي عادي 🎤
كبس + سحب أعلى → PTT صوت + فيديو 📹🎤
إفلات           → إيقاف البث
الطرف الآخر يرى فيديو المتحدث تلقائياً
```

---

### المرحلة E: التسجيل والتحليل ✅ مكتملة
> **الهدف:** تسجيل المكالمات + تحويل صوت لنص + تحليل AI

| # | المهمة | الحالة | التفاصيل |
|---|---|:---:|---|
| E1 | خدمة التسجيل | ✅ | `call_recording_service.dart` — رفع لـ Storage |
| E2 | Edge Function تحليل AI | ✅ | `analyze-call` — Whisper + GPT-4o-mini |
| E3 | جدول التحليلات | ✅ | `call_analyses` — transcript + summary + sentiment |
| E4 | تسجيل كل متحدث منفصلاً | 🔴 | Track Recording — كل شخص في ملف مستقل |
| E5 | حذف تلقائي بعد التحليل | ✅ | `deleteRecording()` في الخدمة |

---

### المرحلة F: التشفير المتقدم (E2EE) 🔴 قادمة
> **الهدف:** تشفير من طرف لطرف مثل Signal — للمكالمات الخاصة

| # | المهمة | التفاصيل |
|---|---|---|
| F1 | تفعيل E2EE في LiveKit | Insertable Streams — تشفير في المتصفح قبل الإرسال |
| F2 | إدارة مفاتيح التشفير | مفتاح فريد لكل مكالمة/غرفة — تبادل عبر Supabase |
| F3 | تشفير التسجيلات (AES-256) | تشفير الملف الصوتي قبل رفعه لـ Storage |
| F4 | فك تشفير مؤقت للتحليل | Edge Function تفك → Whisper → نص → حذف الصوت |
| F5 | مؤشر القفل في UI | 🔒 أيقونة تظهر للمستخدم عند تفعيل E2EE |

**مسار التشفير الكامل:**
```
أثناء المكالمة:
  🎤 → تشفير E2EE في المتصفح → السيرفر أعمى → فك في متصفح المستقبل → 🔊

التسجيل والتحليل:
  📼 تسجيل محلي → AES-256 → رفع مشفر → فك مؤقت → Whisper → نص → 🗑️ حذف الصوت
```

**ما يمكن الترويج له:**
> 🔒 **"تشفير من طرف لطرف — الصوت لا يُخزن أبداً بشكل مكشوف"**

---

## 📁 هيكل الملفات المُحدّث

```
nexa_connect/lib/
├── core/
│   ├── config/
│   │   └── env.dart                        ✅ (LiveKit URL + API Key)
│   ├── providers/
│   │   └── livekit_provider.dart            ✅ (PTT + Call providers)
│   ├── models/
│   │   └── call_log.dart                    ✅
│   └── services/
│       ├── livekit_service.dart             ✅ الخدمة الأساسية (PTT Room)
│       ├── livekit_ptt_service.dart         ✅ PTT عبر LiveKit
│       ├── livekit_call_service.dart        ✅ مكالمات 1↔1 (Call Room مستقل)
│       ├── call_log_service.dart            ✅ سجل المكالمات
│       ├── call_recording_service.dart      ✅ تسجيل + رفع + تحليل AI
│       ├── call_notification_service.dart   🔴 [قادم] إشعارات Push
│       ├── sip_service.dart                 ✅ [يبقى] للمقاسم فقط
│       └── ptt_service.dart                 ⚠️ [legacy] SIP PTT القديم
├── features/
│   ├── calls/
│   │   └── screens/
│   │       └── livekit_call_screen.dart     ✅ مكالمة صوت + فيديو
│   ├── talkie/
│   │   ├── screens/
│   │   │   └── nexa_talkie_screen.dart      ✅ (PTT + Video PTT + Remote Video)
│   │   └── widgets/
│   │       └── ptt_button.dart              ✅ (سحب للأعلى = فيديو)
│   └── home/
│       └── screens/
│           └── main_screen.dart             ✅ (استقبال المكالمات)
```

---

## ⏱️ الجدول الزمني المُحدّث

```
✅ 16 مايو — المرحلة A+B: البنية + PTT
✅ 17 مايو — المرحلة C: مكالمات صوتية 1↔1
✅ 17 مايو — المرحلة D: مكالمات فيديو + Video PTT
✅ 17 مايو — المرحلة E: تسجيل + Edge Function تحليل AI
🔄 جاري — D4: تبديل كاميرا أمامية/خلفية
📅 قادم — D5: مكالمات جماعية (Grid View)
📅 قادم — C5: إشعارات Push (Firebase/APNs)
📅 مستقبلاً — المرحلة F: E2EE (تشفير Signal-level)
```

---

## 🧪 نتائج الاختبار

| الاختبار | النتيجة | الملاحظات |
|---|:---:|---|
| جودة الصوت PTT | ✅ ممتاز | واضح بدون صدى أو تقطيع |
| سرعة الاتصال | ✅ ممتاز | أسرع بكثير من Asterisk |
| إعادة الاتصال | ✅ ممتاز | تلقائي وفوري |
| عدة أجهزة | ✅ يعمل | تبويبين/جهازين متزامنين |
| مانع الصدى | ✅ يعمل | AEC + Noise Suppression مفعّل |
| قفل PTT | ✅ يعمل | عند تحدث شخص يُقفل الزر عند الآخرين |
| مكالمة 1↔1 | ✅ يعمل | رنين + رد + صوت ثنائي |
| Video PTT | ✅ يعمل | سحب للأعلى يفعّل الكاميرا |
| فصل PTT عن المكالمات | ✅ يعمل | غرفتين مستقلتين - لا تعارض |

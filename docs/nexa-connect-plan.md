# 🚀 Nexa Connect — خطة التطوير النهائية

> ⚠️ **تحذير للمطور / AI Agent (Gemini):**
> هذا الملف هو **مرجع ثابت لا يُحذف ولا يُعدّل**. عند التنفيذ، أنشئ ملف `task.md` منفصل لتتبع التقدم. لا تحذف أي قسم من هذه الخطة. إذا احتجت لإضافة ملاحظات، أضفها في نهاية الملف فقط.

---

## القرارات المعتمدة

| البند | القرار |
|-------|--------|
| **الاسم** | Nexa Connect |
| **التقنية** | Flutter (Dart) — كود واحد لكل المنصات |
| **المنصات** | iOS + Android + macOS + Windows + Linux |
| **التصميم** | Material Design 3 (Material You) — وضع صباحي/مسائي |
| **Backend** | Supabase (Auth + DB + Realtime + Storage) |
| **الاتصالات** | SIP/WebRTC عبر Asterisk |
| **اللغات** | ar (RTL), en, uk, ru — اكتشاف تلقائي |

---

## المنصات المتوافقة

Nexa Connect يعمل مع أي منصة ERP:
- **TexaCore** (صناعة وتجارة)
- **NeedCore** / **MedCore** / **FinCore** (مستقبلاً)
- الربط عبر Supabase + Deep Links + REST API

---

## الميزات الكاملة

### 📞 المكالمات
- Dialpad مع Haptic Feedback و Ripple Effect
- اتصال صادر/وارد عبر SIP
- CallKit (iOS) / ConnectionService (Android)
- كتم / انتظار / تحويل / تسجيل
- سجل مكالمات (واردة، صادرة، فائتة)

### 💬 المحادثات
- محادثات فردية ومجموعات
- Supabase Realtime للرسائل الفورية
- حالة الرسائل: ✓ ✓✓ 🔵
- مؤشر كتابة + رد مقتبس + حذف
- بحث + آخر ظهور 🟢

### 📷 الوسائط
- صور (كاميرا/معرض) مع ضغط تلقائي
- ملفات (PDF، فواتير)
- رسائل صوتية
- إرسال الموقع 📍 + موقع مباشر (Live Location)

### 👥 جهات الاتصال
- مزامنة جهات الهاتف الأصلية (بإذن المستخدم)
- جهات ERP (عملاء + موردين) من `get_softphone_contacts` RPC
- **فلتر رباعي**: الكل → جهات الهاتف → العملاء → الموردين
- بحث موحد + ترتيب أبجدي + شريط حروف جانبي
- بطاقة جهة اتصال مع إجراءات (اتصال / رسالة / موقع)

### 🔄 المزامنة مع ERP
- سجل المكالمات → لوحة التحكم
- حالة الموظفين (متصل 🟢 / مشغول 🔴 / غير متاح ⚪)
- موقع السائقين → خريطة مباشرة
- إعلانات من ERP → إشعار لكل الموظفين
- إحصائيات (عدد مكالمات، متوسط مدة، أوقات ذروة)

### 📡 الأجهزة (FXO & GSM Gateways)
- **FXO**: Grandstream HT813 (~$55) / GXW4104 (~$150)
- **GSM/SIM**: GoIP 1 (~$65) / Yeastar TG200 (~$270)
- Auto-provisioning: أدخل IP → النظام يضبط Trunk تلقائياً

### 🔐 الأمان
- Supabase Auth (نفس حساب ERP)
- صلاحيات حسب الدور + RLS
- TLS + SRTP + بصمة/Face ID

---

## التصميم — Material Design 3

| العنصر | Light Mode | Dark Mode |
|--------|-----------|-----------|
| خلفية | أبيض نقي + تدرجات | `#0f1419` → `#1a1f2e` |
| لون أساسي | `#2d5a4c` | نسخة مضيئة |
| أشكال | زوايا 28px (بطاقات)، 16px (أزرار) | نفسه |
| حركات | Spring + Ripple + Shared Element | نفسه |
| خطوط | Inter + Noto Sans Arabic | نفسه |
| أيقونات | Material Symbols Rounded | نفسه |
| Dynamic Color | نعم (Android 12+) | نعم |

---

## مراحل التنفيذ

### Sprint 1: البنية الأساسية + المكالمات (أسبوعان)
- [ ] إنشاء مشروع Flutter: `nexa_connect`
- [ ] إعداد Material You theme (Light/Dark + ThemeProvider)
- [ ] شاشة Dialpad + SIP Engine
- [ ] شاشة سجل المكالمات
- [ ] شاشة جهات الاتصال + فلتر رباعي + مزامنة جهات الهاتف
- [ ] إعداد i18n (ar, en, uk, ru) مع اكتشاف تلقائي
- [ ] شاشة الإعدادات (سنترال + لغة + وضع + بصمة)
- [ ] ربط مع Supabase Auth

### Sprint 2: المحادثات والوسائط (أسبوعان)
- [ ] جداول DB: conversations, messages, participants, read_receipts, user_presence
- [ ] RLS policies لكل الجداول
- [ ] Supabase Realtime للرسائل
- [ ] شاشة قائمة المحادثات
- [ ] شاشة المحادثة (فقاعات + رد + حذف)
- [ ] إرسال صور عبر Storage + رسائل صوتية
- [ ] إرسال الموقع (حالي + مباشر)
- [ ] مؤشر كتابة + حالة رسائل ✓✓🔵
- [ ] إنشاء مجموعات

### Sprint 3: الربط مع ERP + الأجهزة (أسبوع)
- [ ] Deep Linking: `nexaconnect://call/...` و `nexaconnect://chat/...`
- [ ] تعديل TexaMobile لدعم الروابط
- [ ] مزامنة مع لوحة تحكم ERP
- [ ] صفحة "إدارة الأجهزة" في ERP (FXO + GSM Gateways)
- [ ] Auto-provisioning للأجهزة

### Sprint 4: التكامل مع OS + التحسينات (أسبوعان)
- [ ] CallKit (iOS) + ConnectionService (Android)
- [ ] Push Notifications
- [ ] Haptic Feedback + تسجيل مكالمات
- [ ] Live Location sharing
- [ ] Widget للشاشة الرئيسية
- [ ] اختبار شامل iOS + Android + Desktop
- [ ] بناء نسخ التوزيع

---

## هيكل مشروع Flutter

```
nexa_connect/
├── lib/
│   ├── main.dart
│   ├── app.dart                     # MaterialApp + Theme + Router
│   ├── core/
│   │   ├── theme/                   # Material You Light/Dark
│   │   ├── i18n/                    # ar, en, uk, ru
│   │   ├── services/               # Supabase, SIP, Storage
│   │   ├── models/                  # Data classes
│   │   └── utils/                   # Helpers, formatters
│   ├── features/
│   │   ├── auth/                    # Login + Biometric
│   │   ├── calls/                   # Dialpad + History + Active Call
│   │   ├── chat/                    # Conversations + Messages + Groups
│   │   ├── contacts/               # Contacts + Filters + Phone Sync
│   │   └── settings/               # Settings + Language + Theme
│   └── widgets/                     # Shared (Avatar, Badge, Bubble...)
├── assets/                          # Icons, fonts, sounds
├── pubspec.yaml                     # Dependencies
└── platform-specific/
    ├── android/                     # ConnectionService, Firebase
    ├── ios/                         # CallKit, PushKit
    ├── macos/                       # Menu bar, notifications
    └── windows/                     # System tray, shortcuts
```

## Flutter Packages المطلوبة

```yaml
# pubspec.yaml - الحزم الأساسية
dependencies:
  # UI
  flutter_material_3: latest      # Material You
  google_fonts: latest             # Inter, Noto Sans Arabic
  flutter_animate: latest          # Animations

  # Backend
  supabase_flutter: latest         # Supabase client
  
  # VoIP
  flutter_webrtc: latest           # WebRTC
  sip_ua: latest                   # SIP protocol
  callkeep: latest                 # CallKit/ConnectionService
  
  # Chat
  image_picker: latest             # Camera/Gallery
  record: latest                   # Voice recording
  audioplayers: latest             # Audio playback
  geolocator: latest               # Location
  google_maps_flutter: latest      # Map display
  
  # Contacts
  flutter_contacts: latest         # Phone contacts
  
  # System
  local_auth: latest               # Biometric
  flutter_local_notifications: latest
  shared_preferences: latest       # Settings storage
  
  # State
  riverpod: latest                 # State management
  go_router: latest                # Navigation
```

---

## المنظومة الكاملة

```
🏢 TexaCore ERP (الويب) ✅ جاهز
 ├── محاسبة ومبيعات ومخزون
 ├── لوحة تحكم الاتصالات
 ├── إدارة الأجهزة (FXO + GSM)
 └── مراقبة الموظفين والسائقين

📱💻 Nexa Connect (Flutter) ← سنبنيه
 ├── مكالمات VoIP
 ├── محادثات ورسائل وصور وصوتيات
 ├── جهات اتصال (هاتف + عملاء + موردين)
 └── موقع مباشر

💻 TexaCore Softphone (Electron) ✅ جاهز
 └── سيُستبدل لاحقاً بنسخة Nexa Connect Desktop

🌐 TexaCore Website ✅ جاهز
 └── زر "تحدث معنا" → اتصال بالسنترال

📞 FXO Gateway ($55+) → خط أرضي → سنترال سحابي
📲 GSM/SIM Gateway ($65+) → شريحة SIM → سنترال سحابي
```

---

## ⚠️ تعليمات التنفيذ لـ Gemini AI

> **قواعد صارمة عند تنفيذ هذه الخطة:**
> 1. **لا تحذف هذا الملف ولا تعدّل محتواه** — هو مرجع ثابت.
> 2. أنشئ ملف `task.md` منفصل لتتبع التقدم.
> 3. نفّذ المراحل بالترتيب (Sprint 1 → 2 → 3 → 4).
> 4. عند الانتهاء من مهمة، حدّث `task.md` فقط بعلامة ✅.
> 5. لا تُنشئ ملفات توثيق كثيرة — ركّز على الكود.
> 6. استخدم Flutter 3.x+ مع Material 3 مفعّل (`useMaterial3: true`).
> 7. اتبع هيكل الملفات المذكور أعلاه بدقة.
> 8. كل شاشة يجب أن تدعم Light + Dark mode.
> 9. كل نص في الواجهة يجب أن يمر عبر i18n.
> 10. اختبر على iOS + Android قبل الانتقال للمرحلة التالية.

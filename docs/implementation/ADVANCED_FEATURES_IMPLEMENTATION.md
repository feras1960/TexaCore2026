# 📘 توثيق تنفيذ الميزات المتقدمة (Advanced Features Implementation)
> **تاريخ التحديث**: 2026-02-09
> **الحالة**: المرحلة 1 و 2 (مكتملة جزئياً - البنية التحتية والخدمات الأساسية)

يوثق هذا المستند جميع التغييرات التي تمت على قاعدة البيانات والخدمات (Backend/Frontend Services) لتنفيذ خطة الميزات المتقدمة (AI، الاتصالات، QR، الشحن).

---

## 1️⃣ قاعدة البيانات (Database Schema)

تم تنفيذ التغييرات عبر ملفين SQL رئيسيين:
1. `STEP_1_CONTINUED.sql`: لتأسيس جداول QR و Telegram.
2. `STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql`: لتأسيس جداول الاتصالات والشحن.

### 📌 الجداول الجديدة والمعدلة

| الجدول | الوصف | الحقول الرئيسية الجديدة |
| :--- | :--- | :--- |
| **`customers`** | بيانات العملاء | `telegram_username`, `telegram_chat_id` |
| **`user_profiles`** | بيانات الموظفين | `telegram_username`, `telegram_chat_id` |
| **`qr_codes`** | سجل رموز QR | `code`, `entity_type`, `entity_id`, `current_status` |
| **`qr_scans`** | سجل المسح | `scanned_by_telegram_id`, `action_type`, `location_data` |
| **`call_logs`** | سجل المكالمات | `caller_number`, `duration`, `recording_url`, `status` |
| **`call_analyses`** | تحليل AI للمكالمات | `summary`, `customer_mood`, `category`, `ai_model` |
| **`shipments_tracking`** | تتبع الشحنات | `tracking_number`, `provider`, `status_history` |
| **`bank_integrations`** | الربط البنكي | `bank_name`, `api_key` |

---

## 2️⃣ الخدمات (Frontend Services)

تم إنشاء خدمة جديدة `qrCodeService.ts` للتعامل مع منطق QR Codes من جانب العميل.

### 🧩 `src/services/qrCodeService.ts`

توفر هذه الخدمة الوظائف التالية:

#### 1. `getOrCreateQRCode(entityType, entityId)`
- **الهدف**: إنشاء كود QR جديد لأي كيان (مادة، فاتورة، رولون) أو جلب الكود الموجود.
- **المنطق**:
  - تتحقق أولاً من وجود كود سابق لهذا الكيان.
  - إذا لم يوجد، تقوم بتوليد كود جديد بصيغة: `TYPE-RANDOM`.
  - **مهم**: تقوم بجلب `tenant_id` من جلسة المستخدم الحالية لضمان العزل بين المستأجرين.

#### 2. `getByCode(code)`
- **الهدف**: البحث عن بيانات الـ QR عند قيام المستخدم بمسحه.
- **الاستخدام**: سيتم استخدامه في صفحة "الماسح الضوئي" (Scanner Page).

#### 3. `getScanHistory(qrCodeId)`
- **الهدف**: عرض سجل المسح لهذا الكود (من قام بالمسح، متى، وأين).

---

## 3️⃣ الأمان والصلاحيات (RLS & Security)

تم تطبيق سياسات Row Level Security (RLS) صارمة على جميع الجداول الجديدة:

- **الموظفون (Employees)**:
  - يمكنهم **قراءة** جميع سجلات QR والمكالمات والشحنات التابعة لشركتهم (`tenant_id`).
  - يمكنهم **إنشاء** رموز QR جديدة وسجلات مسح.
  - يمكنهم **تحديث** حالة التتبع للشحنات.

- **المدراء (Managers)**:
  - لديهم صلاحية حصرية لإدارة **تكامل البنوك** (`bank_integrations`).

- **المستخدمون (Users)**:
  - يمكنهم تعديل **تفضيلات الإشعارات** الخاصة بهم فقط (`notification_preferences`).

---

## 4️⃣ واجهة المستخدم (UI Components)

### 📱 4.1 مكون عرض QR (`QRCodeDisplay.tsx`)
- مكون قابل لإعادة الاستخدام لعرض الـ QR Code لأي مادة.
- يدعم خاصية الطباعة (Print) المباشرة.
- المسار: `src/components/shared/QR/QRCodeDisplay.tsx`

### 🔫 4.2 صفحة الماسح المتقدم (`AdvancedQRScannerPage.tsx`)
- صفحة مخصصة لمحاكاة عملية المسح (Scanning Simulation).
- تتيح إدخال كود الـ QR يدوياً (لعدم توفر الكاميرا في المتصفح أحياناً).
- تقوم بجلب بيانات الكيان (فاتورة، مادة) وعرض حالتها الحالية.
- تتيح **تغيير حالة الكيان** (Scanned, Received, Delivered) بنقرة زر واحدة.
- تستدعي الدالة الآمنة في قاعدة البيانات `update_entity_status_on_scan`.
- المسار: `src/pages/advanced/AdvancedQRScannerPage.tsx`
- الرابط في التطبيق: `/qr-scan`

---

## 5️⃣ الخطوات القادمة (Next Steps)

1.  **الأتمتة (n8n)**:
    - إعداد Workflow لاستقبال رسائل Telegram وربطها بجدول `qr_scans`.
    - إعداد Workflow لتحليل المكالمات باستخدام Gemini AI.

---

> **ملاحظة للمطورين**: عند استخدام `qrCodeService.getOrCreateQRCode`، تأكد دائماً أن المستخدم مسجل دخول، حيث ستفشل الدالة إذا لم تتمكن من تحديد `tenant_id`.

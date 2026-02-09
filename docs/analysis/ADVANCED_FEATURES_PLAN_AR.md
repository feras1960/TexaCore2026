# 📘 خطة التنفيذ الشاملة: النظام المتقدم (AI، اتصالات، QR، شحن)

> **التاريخ**: 09 فبراير 2026
> **الإصدار**: 1.0
> **الحالة**: جاهز للتنفيذ

يقدم هذا المستند تحليلاً تقنياً ومعمارياً للميزات المتقدمة المطلوبة لنظام TexaCore ERP، مع التركيز على استخدام n8n كمحرك مركزي للعمليات (Orchestrator).

---

## 1️⃣ نظام الاتصالات المتقدم (Grandstream + AI)

### 🎯 الهدف
تحويل نظام الاتصالات إلى أداة ذكية تدعم خدمة العملاء وتحلل الأداء تلقائياً، مع ميزات الرد الآلي (IVR) والاتصال السريع.

### 🏗️ البنية المعمارية
يتم الربط بين **Grandstream UCM** و **n8n** عبر بروتوكولين:
1.  **AMI (Asterisk Manager Interface)**: للأحداث اللحظية (رنين، رد، إنهاء المكالمة).
2.  **API/CDR**: لسحب السجلات والتسجيلات بعد انتهاء المكالمة.

### 🧠 سيناريو الذكاء الاصطناعي (AI Analysis)
عند انتهاء المكالمة، يقوم n8n بسحب ملف التسجيل وإرساله إلى Gemini AI للتحليل:
1.  **Transcription**: تحويل الصوت إلى نص.
2.  **Sentiment Analysis**: تحديد حالة العميل (سعيد، غاضب، محايد).
3.  **Categorization**: تصنيف المكالمة (شكوى، مبيعات، متابعة، حجز).
4.  **Summarization**: ملخص تنفيذي للمانيجر.

### 🗄️ الجداول الجديدة المطلوبة (Database Schema)

```sql
-- سجل المكالمات
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    external_id VARCHAR(100), -- ID من Grandstream
    caller_number VARCHAR(50),
    receiver_number VARCHAR(50),
    direction VARCHAR(20), -- inbound, outbound
    duration INT, -- بالثواني
    status VARCHAR(20), -- answered, missed, failed
    recording_url TEXT,
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تحليل المكالمات (AI)
CREATE TABLE call_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES call_logs(id),
    summary TEXT, -- ملخص المكالمة
    customer_mood VARCHAR(50), -- happy, angry, neutral
    category VARCHAR(50), -- sales, support, complaint
    action_required BOOLEAN DEFAULT false,
    transcript TEXT, -- النص الكامل
    ai_model VARCHAR(50) DEFAULT 'gemini-2.0-flash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2️⃣ نظام QR Code الذكي الشامل (Smart QR)

### 🎯 الهدف
رمز QR واحد ذكي لكل كيان في النظام (مواد، رولونات، فواتير، قيود، عينات)، يتغير سلوكه بناءً على **من يقوم بالمسح**.

### 📱 السلوك التفاعلي (Context-Aware)
يتم توجيه جميع رموز QR إلى بوت تليجرام (`t.me/Texacorebot?start=CODE`).

| الكيان الممسوح | الزائر (غير مسجل) | العميل (المسجل) | المانيجر / الموظف |
|----------------|--------------------|-----------------|-------------------|
| **مادة / عينة** | تفاصيل عامة، سعر التجزئة | سعره الخاص، تاريخ آخر شراء | الكميات بالمخزون، التكلفة، الموقع |
| **رولون** | تفاصيل القماش، الوزن | (غير متاح) | طول الرول، مكان الرف، الحجز |
| **فاتورة** | (يطلب تسجيل دخول) | تفاصيل فاتورته، حالة الدفع | تفاصيل الفاتورة، القيود المرتبطة |
| **قيد محاسبي** | (غير مصرح) | (غير مصرح) | تفاصيل القيد، المرفقات، التدقيق |

### 🗄️ الجداول الجديدة المطلوبة

```sql
-- جدول رموز الاستجابة السريعة
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    entity_type VARCHAR(50), -- material, roll, invoice, entry
    entity_id UUID, -- ID السجل المرتبط
    code VARCHAR(100) UNIQUE, -- الكود المطبوع
    scans_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل المسح (للتحليلات التسويقية)
CREATE TABLE qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID REFERENCES qr_codes(id),
    scanned_by_id UUID, -- user_id if known
    scanned_by_role VARCHAR(50), -- visitor, customer, manager
    location JSONB, -- Coordinates if available
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3️⃣ البنوك والشحن (التوافق الدولي - أوكرانيا)

### 🚚 تكامل شركات الشحن (Nova Poshta / Ukrposhta)
الربط يتم عبر n8n HTTP Request مع APIs شركات الشحن.

**الميزات:**
1.  **إنشاء بوليصة الشحن (Waybill)** تلقائياً عند إنشاء "إرسالية" في النظام.
2.  **تتبع الشحنة**: تحديث حالة الطلب في ERP بناءً على الـ Webhook من شركة الشحن.
3.  **حساب التكلفة**: جلب تكلفة الشحن قبل تأكيد الطلب.

### 🏦 التكامل البنكي (Monobank / PrivatBank)
معظم البنوك الأوكرانية توفر "Business API".

**آلية العمل:**
1.  n8n يسحب كشف الحساب (Statement) كل 10 دقائق.
2.  يقارن الدفعات الواردة مع الفواتير المفتوحة (عبر المطابقة بالمبلغ أو الرقم المرجعي).
3.  يقوم بإنشاء "سند قبض" (Receipt Voucher) تلقائياً في Supabase.

### 🗄️ الجداول الجديدة المطلوبة

```sql
-- تتبع الشحنات
CREATE TABLE shipments_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID, -- ربط مع shipments الموجود
    provider VARCHAR(50), -- nova_poshta, dhl, aramex
    tracking_number VARCHAR(100),
    current_status VARCHAR(50),
    status_history JSONB, -- سجل الحالات الكامل
    label_url TEXT, -- رابط بوليصة الشحن
    updated_at TIMESTAMPTZ
);

-- إعدادات التكامل البنكي
CREATE TABLE bank_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(50), -- monobank, privatbank
    api_key TEXT, -- مشفر
    account_id UUID REFERENCES accounts(id), -- الحساب في شجرة الحسابات
    last_sync_at TIMESTAMPTZ
);
```

---

## 4️⃣ نظام الإشعارات الموجهة (Role-Based)

### 🔔 آلية العمل
بدلاً من إرسال الإشعارات للجميع، يتم توجيهها بناءً على الصلاحيات أو المنطقة الجغرافية.

*   **أمين المستودع**: يصله إشعار "طلب تجهيز" عندما يتم تأكيد فاتورة مبيعات.
*   **السائق**: يصله موقع العميل (Google Maps) وقائمة المواد عند خروج البضاعة.
*   **المانيجر**: يصله إشعار "تحصيل مالي" أو "شكوى عميل VIP".

```sql
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY,
    channels JSONB DEFAULT '["telegram"]', -- telegram, email, sms
    events JSONB -- {"new_order": true, "payment": false}
);
```

---

## 🚀 خطة العمل (Roadmap)

نظراً لضخامة المتطلبات، سنقسم التنفيذ إلى مراحل منطقية لضمان استقرار النظام:

### ✅ المرحلة 1: التأسيس (الآن)
1.  إنشاء الجداول الجديدة في قاعدة البيانات (SQL Schema).
2.  تحديث سياسات الأمان (RLS) لتشمل الجداول الجديدة.
3.  تجهيز Gemini API للعمل مع التحليلات.

### ⏳ المرحلة 2: QR Code الذكي
1.  تعديل `Texacorebot` في n8n للتعامل مع معلمات `start` (Deep Linking).
2.  بناء منطق "التحقق من المستخدم" (هل هو مانيجر، عميل، أم زائر؟).
3.  تصميم رسائل الرد لكل نوع من الكيانات (مواد، رولونات...).

### ⏳ المرحلة 3: الاتصالات (عند توفر الجهاز)
1.  ربط n8n مع Grandstream UCM.
2.  تفعيل تحليل المكالمات (AI).
3.  بناء لوحة التحكم بالمكالمات.

### ⏳ المرحلة 4: الشحن والبنوك
1.  الحصول على API Keys للبنوك وشركات الشحن.
2.  بناء workflows للمزامنة.

---

## 📝 المطلوب منك الآن
للبدء في **المرحلة 1 (التأسيس)**، سأقوم بإنشاء ملف SQL يحتوي على جميع الجداول المذكورة أعلاه. هل تأذن لي بإنشاء وتشغيل ملف `CREATE_ADVANCED_FEATURES_SCHEMA.sql`؟

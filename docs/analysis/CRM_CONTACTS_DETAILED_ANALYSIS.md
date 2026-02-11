# 📊 تحليل شامل: وحدة إدارة جهات الاتصال (CRM Contacts Module)

> **التاريخ:** 2026-02-09  
> **المرجع:** أفضل ممارسات Salesforce, HubSpot, Odoo CRM  
> **النمط:** UnifiedAccountingSheet + NexaDataTable  

---

## 1. 🎯 الرؤية الشاملة

### ما هي "جهات الاتصال"؟
جهة الاتصال هي أي شخص أو كيان تم التواصل معه أو أبدى اهتماماً بالشركة، **قبل** أن يصبح عميلاً رسمياً. هذا يشمل:

| المصدر (Source) | الوصف | أيقونة |
|---|---|---|
| `phone_inbound` | مكالمة واردة من رقم غير مسجل | 📞 |
| `phone_outbound` | مكالمة صادرة لرقم جديد | 📱 |
| `google_ads` | إعلانات Google | 🔍 |
| `facebook_ads` | إعلانات Facebook/Instagram | 📘 |
| `website` | الموقع الإلكتروني (نموذج اتصال) | 🌐 |
| `telegram` | بوت Telegram | ✈️ |
| `online_store` | المتجر الإلكتروني | 🛒 |
| `referral` | إحالة من عميل آخر | 🤝 |
| `walk_in` | زيارة مباشرة | 🚶 |
| `exhibition` | معرض أو فعالية | 🏛️ |
| `whatsapp` | واتساب | 💬 |
| `manual` | إدخال يدوي | ✏️ |

### مراحل دورة الحياة (Contact Lifecycle)

```
📥 Lead (جهة اتصال جديدة)
  ↓
🔄 Contacted (تم التواصل)
  ↓
💡 Interested (مهتم)
  ↓
📋 Qualified (مؤهل)
  ↓
✅ Converted → ينتقل إلى جدول customers كعميل رسمي
  ↓
❌ Lost / Archived (خسرناه / مؤرشف)
```

---

## 2. 📐 تصميم قاعدة البيانات

### جدول `contacts` الجديد

```sql
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- المعلومات الأساسية
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200) GENERATED ALWAYS AS (
        COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    ) STORED,
    
    -- الشركة/المنظمة
    organization VARCHAR(200),
    job_title VARCHAR(100),
    
    -- معلومات الاتصال
    email VARCHAR(200),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    whatsapp VARCHAR(50),
    telegram_username VARCHAR(100),
    telegram_chat_id BIGINT,
    
    -- العنوان
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    
    -- التصنيف
    source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (
        source IN ('phone_inbound', 'phone_outbound', 'google_ads', 
                   'facebook_ads', 'website', 'telegram', 'online_store',
                   'referral', 'walk_in', 'exhibition', 'whatsapp', 'manual')
    ),
    
    contact_type VARCHAR(30) DEFAULT 'lead' CHECK (
        contact_type IN ('lead', 'prospect', 'wholesale_lead', 'retail_lead', 
                         'partner_lead', 'existing_customer')
    ),
    
    lifecycle_stage VARCHAR(30) DEFAULT 'new' CHECK (
        lifecycle_stage IN ('new', 'contacted', 'interested', 'qualified', 
                           'converted', 'lost', 'archived')
    ),
    
    -- التقييم والأولوية
    priority VARCHAR(10) DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    ),
    lead_score INT DEFAULT 0, -- 0-100 تقييم تلقائي
    
    -- المسؤول
    assigned_to UUID REFERENCES user_profiles(id),
    
    -- التحويل
    converted_customer_id UUID REFERENCES customers(id),
    converted_at TIMESTAMPTZ,
    
    -- التتبع
    last_interaction_at TIMESTAMPTZ,
    last_interaction_type VARCHAR(50), -- 'call', 'email', 'meeting', 'note'
    interaction_count INT DEFAULT 0,
    
    -- البيانات الإضافية
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- النظام
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'inactive', 'converted', 'archived', 'blacklisted')
    ),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### جدول `contact_interactions` (سجل التفاعلات)

```sql
CREATE TABLE IF NOT EXISTS contact_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    interaction_type VARCHAR(30) NOT NULL CHECK (
        interaction_type IN ('call', 'email', 'meeting', 'note', 'sms', 
                            'whatsapp', 'telegram', 'visit', 'task')
    ),
    
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    
    subject VARCHAR(200),
    content TEXT,
    
    -- ربط بسجل المكالمات (إن وُجد)
    call_log_id UUID REFERENCES call_logs(id),
    
    -- المدة والحالة
    duration_seconds INT,
    outcome VARCHAR(50), -- 'answered', 'voicemail', 'callback_requested'
    
    -- المواعيد
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- المسؤول
    performed_by UUID REFERENCES user_profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. 🖥️ تصميم الواجهة (UI Architecture)

### 3.1 الجدول الرئيسي — ContactsTable.tsx

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 جهات الاتصال                    [+ إضافة جهة] [📥 استيراد] │
│  ──────────────────────────────────────────────────────────────  │
│  🔍 بحث...  [المصدر ▾] [المرحلة ▾] [الأولوية ▾] [المسؤول ▾]   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ الاسم        | الشركة    | المصدر  | المرحلة  | آخر     │   │
│  │              |           |         |          | تواصل   │   │
│  ├──────────────┼───────────┼─────────┼──────────┼─────────┤   │
│  │ 🟢 أحمد محمد | شركة ABC  | 📞 مكالمة| 💡 مهتم  | 2 ساعة  │   │
│  │    📧 a@x.com|           |         |          |         │   │
│  ├──────────────┼───────────┼─────────┼──────────┼─────────┤   │
│  │ 🟡 سارة علي  | ---       | 🔍 Google| 📥 جديد  | 1 يوم   │   │
│  │    📱 +380...|           |         |          |         │   │
│  ├──────────────┼───────────┼─────────┼──────────┼─────────┤   │
│  │ 🟣 Viktor K. | Fabric Co | 🛒 المتجر| 📋 مؤهل  | 3 أيام  │   │
│  │    📧 v@f.co |           |         |          |         │   │
│  └──────────────┴───────────┴─────────┴──────────┴─────────┘   │
│                                                                  │
│  📊 42 جهة اتصال | 12 جديد | 8 مؤهل | 5 محوّل هذا الشهر      │
└─────────────────────────────────────────────────────────────────┘
```

**أعمدة NexaDataTable:**
| العمود | النوع | الخصائص |
|---|---|---|
| الاسم + البريد | composite | صورة/أيقونة + اسم + بريد |
| الشركة | text | organization |
| الهاتف | phone | dir="ltr" |
| المصدر | badge | أيقونة ملونة حسب المصدر |
| النوع | badge | lead / wholesale |
| المرحلة | pipeline badge | ألوان متدرجة حسب المرحلة |
| الأولوية | priority dots | 🔴🟡🟢 |
| المسؤول | avatar | صورة الموظف |
| آخر تواصل | relative time | "منذ 2 ساعة" |
| عدد التفاعلات | number | count |

### 3.2 شيت التفاصيل — UnifiedAccountingSheet (docType: 'contact')

عند الضغط على جهة اتصال، يُفتح الشيت الموحد بالتبويبات التالية:

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ ▶  👤 أحمد محمد — شركة ABC          [تحرير] [✅ تحويل لعميل]│
│  ──────────────────────────────────────────────────────────────  │
│  [نظرة عامة] [المكالمات] [التفاعلات] [المالية] [الملاحظات]     │
│  ══════════════════════════════════════════════════════════════  │
```

#### Tab 1: نظرة عامة (Overview)
```
┌─────────────────────────────────────────────────────────────┐
│  👤 المعلومات الشخصية          📊 الإحصائيات               │
│  ─────────────────────         ─────────────────────         │
│  الاسم: أحمد محمد              المرحلة: 💡 مهتم             │
│  الشركة: شركة ABC              التقييم: ████░░ 70/100       │
│  المسمى: مدير المشتريات        عدد التفاعلات: 12            │
│  المصدر: 📞 مكالمة واردة       أول تواصل: 15/01/2026       │
│                                 آخر تواصل: 09/02/2026       │
│  📧 ahmed@abc.com                                            │
│  📱 +380 67 123 4567      [📞 اتصال] [💬 واتساب] [✈️ تلغرام]│
│  🌍 أوكرانيا، كييف                                          │
│                                                              │
│  🏷️ Tags: [جملة] [نسيج] [مهتم بالأقمشة الإيطالية]          │
│                                                              │
│  📝 ملاحظات:                                                 │
│  يبحث عن أقمشة قطنية عالية الجودة، ميزانية ~50,000$        │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 2: المكالمات (Calls) ⭐ الأهم
```
┌─────────────────────────────────────────────────────────────┐
│  📞 سجل المكالمات                    [📞 اتصال مزدوج]      │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌── 📞 09/02 14:30 — واردة — 4:23 دقيقة ──────────────┐   │
│  │  🟢 تم الرد                                           │   │
│  │  🎤 [▶ تشغيل التسجيل ─────────●── 4:23]              │   │
│  │                                                        │   │
│  │  🤖 تحليل AI:                                         │   │
│  │  ┌────────────────────────────────────────────┐       │   │
│  │  │ 📋 الملخص: العميل يسأل عن أقمشة قطنية     │       │   │
│  │  │           إيطالية، يحتاج 500 متر، موعد     │       │   │
│  │  │           التسليم خلال 3 أسابيع             │       │   │
│  │  │ 😊 المزاج: محايد → إيجابي                   │       │   │
│  │  │ 📂 التصنيف: استفسار مبيعات                  │       │   │
│  │  │ ⚡ مطلوب إجراء: إرسال عرض سعر               │       │   │
│  │  └────────────────────────────────────────────┘       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── 📞 07/02 10:15 — صادرة — 2:10 دقيقة ──────────────┐   │
│  │  🟢 تم الرد | 🤖 متابعة أولية                        │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**ميزة الاتصال المزدوج:**
- زر "📞 اتصال مزدوج" يتصل بالسنترال (Grandstream) عبر API
- السنترال يتصل بالموظف أولاً ثم يربط مع جهة الاتصال
- التسجيل يبدأ تلقائياً ويُحفظ في `call_logs`

#### Tab 3: التفاعلات (Interactions / Activity Timeline)
```
┌─────────────────────────────────────────────────────────────┐
│  📜 سجل التفاعلات                [+ إضافة ملاحظة]          │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ○ 09/02 14:30  📞 مكالمة واردة (4:23 دق)                  │
│  │              → استفسار عن أقمشة قطنية                    │
│  │                                                           │
│  ○ 07/02 10:15  📞 مكالمة صادرة (2:10 دق)                  │
│  │              → متابعة أولية بعد تسجيل الاهتمام            │
│  │                                                           │
│  ○ 05/02 —      📧 بريد إلكتروني                            │
│  │              → أرسل نموذج من الموقع الإلكتروني            │
│  │                                                           │
│  ○ 03/02 —      🌐 تسجيل من الموقع                         │
│                  → أول تواصل: زار صفحة الأقمشة               │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 4: المالية (Financial) — يظهر بعد التحويل
```
┌─────────────────────────────────────────────────────────────┐
│  💰 الملخص المالي                                           │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ⚠️ لم يتم تحويل جهة الاتصال إلى عميل بعد                 │
│     [✅ تحويل إلى عميل]                                     │
│                                                              │
│  — أو بعد التحويل —                                         │
│                                                              │
│  الرصيد: $12,500                                            │
│  إجمالي المبيعات: $45,000                                   │
│  عدد الفواتير: 8                                            │
│                                                              │
│  [كشف حساب كامل — LedgerTab]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 🏗️ خطة التنفيذ التقنية

### المرحلة A: قاعدة البيانات
1. إنشاء جدول `contacts` مع RLS بالنمط الرسمي
2. إنشاء جدول `contact_interactions` مع RLS
3. إضافة فهارس الأداء
4. دالة `convert_contact_to_customer()` — RPC

### المرحلة B: Backend Service
1. `contactsService.ts` — CRUD + بحث + تصفية
2. `contactInteractionsService.ts` — سجل التفاعلات

### المرحلة C: Frontend — الجدول
1. تحديث `ContactsTable.tsx` بأعمدة NexaDataTable الكاملة
2. فلاتر ذكية (source, lifecycle_stage, priority, assigned_to)
3. أزرار الإجراءات (إضافة، استيراد، تصدير)
4. شريط إحصائيات سريع (counts by stage)

### المرحلة D: Frontend — الشيت
1. إضافة `docType: 'contact'` في `UnifiedAccountingSheet`
2. إنشاء التبويبات:
   - `ContactOverviewTab.tsx` — المعلومات الأساسية
   - `ContactCallsTab.tsx` — المكالمات + AI + اتصال مزدوج
   - `ContactInteractionsTab.tsx` — Timeline
   - `ContactFinancialTab.tsx` — كشف حساب (بعد التحويل)
   - `ContactNotesTab.tsx` — ملاحظات
3. زر "تحويل لعميل" في الـ header

### المرحلة E: الربط
1. ربط المكالمات الواردة تلقائياً بجهات الاتصال (via phone number)
2. ربط نماذج الموقع/التلغرام بإنشاء جهات اتصال تلقائية
3. ربط AI Analysis بتبويب المكالمات

---

## 5. 🌟 أفضل الممارسات العالمية المُطبقة

### من Salesforce:
- **Lead Scoring** — تقييم تلقائي للعملاء المحتملين
- **Lead Conversion** — عملية تحويل منظمة من جهة اتصال لعميل
- **Activity Timeline** — سجل زمني شامل لكل التفاعلات

### من HubSpot:
- **Multi-Channel Tracking** — تتبع من أين جاء العميل
- **Lifecycle Stages** — مراحل واضحة لدورة حياة جهة الاتصال
- **Contact Properties** — حقول مخصصة مرنة (custom_fields JSONB)

### من Odoo CRM:
- **Source Attribution** — ربط كل جهة اتصال بمصدرها
- **Pipeline Integration** — ربط مع أنبوب المبيعات
- **Call Integration** — اتصال مباشر من الواجهة (VoIP)

### إضافات TexaCore الفريدة:
- **AI Call Analysis** — تحليل ذكي لكل مكالمة عبر Gemini
- **Dual-Call Feature** — اتصال مزدوج عبر Grandstream
- **Telegram Bot Integration** — إنشاء جهات اتصال تلقائياً من التلغرام
- **QR Tracking** — ربط مسح QR بنشاط جهة الاتصال

---

## 6. 📊 ملخص تنفيذي

| العنصر | التفاصيل |
|---|---|
| **جداول جديدة** | `contacts`, `contact_interactions` |
| **docType جديد** | `'contact'` في UnifiedAccountingSheet |
| **تبويبات الشيت** | Overview, Calls, Interactions, Financial, Notes |
| **أعمدة الجدول** | 10+ أعمدة مع badges و pipeline colors |
| **RLS** | النمط الرسمي (Brand → Tenant → Company) |
| **RPC Functions** | `convert_contact_to_customer()` |
| **التكاملات** | Grandstream + Gemini AI + Telegram Bot |

---

## 7. هل نبدأ التنفيذ؟

أقترح البدء بـ:
1. **أولاً**: سكربت SQL لإنشاء الجداول + RLS
2. **ثانياً**: `contactsService.ts` 
3. **ثالثاً**: `ContactsTable.tsx` (الجدول الرئيسي)
4. **رابعاً**: التبويبات في الشيت الموحد

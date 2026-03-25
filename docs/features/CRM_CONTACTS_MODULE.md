# 📋 CRM Contacts Module — التوثيق الشامل

> **الوحدة:** CRM — إدارة جهات الاتصال  
> **التاريخ:** 2026-02-09  
> **الحالة:** ✅ مُنفّذ بالكامل (Backend + Frontend + Sheet)  
> **المشروع:** TexaCore ERP

---

## 📊 نظرة عامة

وحدة إدارة جهات الاتصال (CRM Contacts) هي المكون الأساسي لنظام CRM في TexaCore ERP. تُدير العملاء المحتملين (Leads)، المرشحين (Prospects)، وجهات الاتصال الحالية عبر مراحل دورة حياة كاملة — من أول تواصل حتى التحويل إلى عميل رسمي.

### ✨ الميزات الرئيسية
- **9 لغات** للتسمية (ar, en, ru, uk, ro, pl, tr, de, it)
- **14 مصدر** لجهات الاتصال (مكالمات، إعلانات، واتساب، تلغرام...)
- **Pipeline** بـ 8 مراحل مع تصور بصري
- **تسجيل تفاعلات** تلقائي (مكالمات، إيميلات، اجتماعات...)
- **تحويل تلقائي** إلى عميل رسمي (`convert_contact_to_customer`)
- **ربط تلقائي** للمكالمات بجهات الاتصال عبر رقم الهاتف

---

## 🏗️ البنية التقنية

### الملفات الرئيسية

```
📁 Backend (Database)
supabase/scripts/
└── STEP_3_CRM_CONTACTS_SCHEMA.sql     # Schema + RLS + Triggers + Functions

📁 Frontend (React)
src/
├── services/
│   └── contactsService.ts              # خدمة CRUD + البحث + التحويل
│
├── features/crm/
│   ├── CRM.tsx                         # النقطة الرئيسية (MainTabsBar)
│   ├── tabs/
│   │   └── ContactsTable.tsx           # جدول NexaDataTable + UnifiedAccountingSheet
│   └── components/
│       └── AddContactSheet.tsx         # (Deprecated — مُستبدل بـ UnifiedAccountingSheet)
│
├── features/accounting/components/unified/
│   ├── types.ts                        # UnifiedDocType → 'contact' ✅
│   ├── configs/
│   │   └── documentConfigs.ts          # contactConfig ✅
│   ├── tabs/
│   │   ├── ContactOverviewTab.tsx      # 🆕 نموذج الإنشاء/التعديل/المعاينة
│   │   ├── ContactInteractionsTab.tsx  # 🆕 Timeline التفاعلات + إضافة تفاعل
│   │   ├── ContactCallsTab.tsx         # 🆕 سجل المكالمات + إحصائيات
│   │   ├── ContactNotesTab.tsx         # 🆕 ملاحظات + وسوم + تقييم
│   │   └── index.ts                    # تصدير التبويبات
│   └── UnifiedAccountingSheet.tsx      # الشيت الموحد (مُحدّث)
```

---

## 🔧 Backend — قاعدة البيانات

### الجداول

#### `contacts` — جهات الاتصال
| الحقل | النوع | الوصف |
|---|---|---|
| `id` | UUID (PK) | معرّف فريد |
| `tenant_id` | UUID (FK) | عزل المستأجر |
| `company_id` | UUID (FK) | الشركة |
| `first_name` | VARCHAR(100) | الاسم الأول |
| `last_name` | VARCHAR(100) | الاسم الأخير |
| `display_name` | VARCHAR(255) | الاسم المعروض (يُولّد تلقائياً) |
| `name_ar..name_it` | VARCHAR(255) ×9 | أسماء بـ 9 لغات |
| `email` | VARCHAR(255) | البريد الإلكتروني |
| `phone` | VARCHAR(50) | الهاتف |
| `mobile` | VARCHAR(50) | الجوال |
| `whatsapp` | VARCHAR(50) | واتساب |
| `telegram_username` | VARCHAR(100) | تلغرام |
| `organization` | VARCHAR(255) | الشركة/المنظمة |
| `job_title` | VARCHAR(255) | المسمى الوظيفي |
| `country` | VARCHAR(100) | الدولة |
| `city` | VARCHAR(100) | المدينة |
| `address` | TEXT | العنوان التفصيلي |
| `source` | VARCHAR(30) | مصدر جهة الاتصال |
| `contact_type` | VARCHAR(30) | النوع (lead, prospect, wholesale...) |
| `lifecycle_stage` | VARCHAR(30) | المرحلة الحالية |
| `priority` | VARCHAR(10) | الأولوية (low, medium, high, urgent) |
| `lead_score` | SMALLINT | تقييم العميل المحتمل (0-100) |
| `assigned_to` | UUID (FK) | المسؤول |
| `tags` | JSONB | وسوم تصنيفية |
| `notes` | TEXT | ملاحظات |
| `status` | VARCHAR(20) | الحالة (active, inactive, converted...) |
| `converted_customer_id` | UUID (FK) | مرجع العميل المُحوّل |
| `converted_at` | TIMESTAMPTZ | تاريخ التحويل |

#### `contact_interactions` — سجل التفاعلات
| الحقل | النوع | الوصف |
|---|---|---|
| `id` | UUID (PK) | معرّف فريد |
| `tenant_id` | UUID (FK) | عزل المستأجر |
| `contact_id` | UUID (FK) | جهة الاتصال |
| `interaction_type` | VARCHAR(30) | النوع (call, email, meeting, note...) |
| `direction` | VARCHAR(10) | الاتجاه (inbound, outbound) |
| `subject` | VARCHAR(255) | الموضوع |
| `content` | TEXT | المحتوى |
| `call_log_id` | UUID (FK) | ربط بسجل المكالمة |
| `duration_seconds` | INTEGER | مدة التفاعل بالثواني |
| `outcome` | VARCHAR(30) | النتيجة (answered, missed, follow_up...) |
| `performed_by` | UUID (FK) | المنفّذ |

### مصادر جهات الاتصال (`source`)
| المصدر | الوصف (AR) | الوصف (EN) |
|---|---|---|
| `phone_inbound` | مكالمة واردة | Inbound Call |
| `phone_outbound` | مكالمة صادرة | Outbound Call |
| `google_ads` | إعلانات جوجل | Google Ads |
| `facebook_ads` | فيسبوك | Facebook Ads |
| `instagram_ads` | انستغرام | Instagram Ads |
| `website` | الموقع | Website |
| `telegram` | تلغرام | Telegram |
| `whatsapp` | واتساب | WhatsApp |
| `online_store` | المتجر | Online Store |
| `referral` | إحالة | Referral |
| `walk_in` | زيارة | Walk-in |
| `exhibition` | معرض | Exhibition |
| `email_campaign` | حملة بريدية | Email Campaign |
| `manual` | يدوي | Manual |

### مراحل دورة الحياة (`lifecycle_stage`)
```
┌─────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐
│   New   │ → │ Contacted │ → │Interested│ → │Qualified │ → │ Negotiation │
│  جديد   │   │تم التواصل │   │   مهتم   │   │  مؤهل    │   │   تفاوض     │
└─────────┘   └───────────┘   └──────────┘   └──────────┘   └──────┬──────┘
                                                                    │
                                          ┌─────────┐     ┌────────┴────────┐
                                          │  Lost   │ ←── │   Converted     │
                                          │ خسارة   │     │   محوّل لعميل   │
                                          └─────────┘     └─────────────────┘
```

### الدوال والتريغرات

| النوع | الاسم | الوظيفة |
|---|---|---|
| **Trigger** | `trg_contacts_updated_at` | تحديث `updated_at` تلقائياً عند تعديل جهة الاتصال |
| **Trigger** | `trg_contact_interaction_stats` | تحديث `interaction_count`, `last_interaction_at`, `total_calls` عند إضافة/حذف تفاعل |
| **Trigger** | `trg_auto_link_call` | ربط المكالمة الجديدة بجهة الاتصال تلقائياً عبر رقم الهاتف |
| **Function** | `auto_link_call_to_contact()` | البحث في contacts ثم customers عن مطابقة رقم |
| **Function** | `convert_contact_to_customer()` | تحويل جهة اتصال → عميل رسمي مع نقل البيانات |

### سياسات RLS (8 سياسات)

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `contacts` | ✅ Brand+Tenant | ✅ Same Tenant | ✅ Same Tenant | ✅ Tenant Admin |
| `contact_interactions` | ✅ Brand+Tenant | ✅ Same Tenant | ✅ Same Tenant | ✅ Tenant Admin |

**النمط:** `DROP POLICY IF EXISTS` → `CREATE POLICY` (idempotent)

---

## 🎨 Frontend — واجهة المستخدم

### ContactsTable (`src/features/crm/tabs/ContactsTable.tsx`)

الجدول الرئيسي لعرض جهات الاتصال بـ `NexaDataTable`:

- **8 أعمدة**: الاسم، الهاتف، البريد، المصدر، المرحلة، الأولوية، التفاعلات، آخر نشاط
- **بطاقات Pipeline**: 5 بطاقات إحصائية قابلة للنقر (تعمل كفلاتر)
- **فلاتر متقدمة**: المصدر، الأولوية، الحالة
- **بحث**: في الاسم، البريد، الهاتف، الشركة (9 لغات)
- **النقر على صف**: يفتح `UnifiedAccountingSheet` مع `docType='contact'`

### UnifiedAccountingSheet — Contact Mode

الشيت الموحد يعمل بـ **3 وضعيات**:

#### 🟢 وضع الإنشاء (`create`)
- التبويبات: **نظرة عامة**, **ملاحظات**
- الأزرار: **حفظ**, **إلغاء**
- النموذج يتضمن: الأسماء بـ 9 لغات (قابل للطي)، معلومات الاتصال، العنوان، التصنيف

#### 🔵 وضع المعاينة (`view`)
- التبويبات: **نظرة عامة**, **التفاعلات**, **المكالمات**, **ملاحظات**, **النشاط**
- الأزرار: **تعديل**, **تحويل إلى عميل**, **حذف**
- بطاقات إحصائية: التفاعلات، المكالمات، نقاط العميل، آخر نشاط
- شريط Pipeline المرئي (badges)

#### 🟡 وضع التعديل (`edit`)
- التبويبات: **نظرة عامة**, **التفاعلات**, **المكالمات**, **ملاحظات**
- الأزرار: **حفظ**, **إلغاء**
- جميع الحقول قابلة للتعديل

### التبويبات

#### 1. ContactOverviewTab — نظرة عامة / النموذج
**الملف:** `tabs/ContactOverviewTab.tsx`

| القسم | المحتوى |
|---|---|
| **بطاقات إحصائية** (عرض فقط) | التفاعلات، المكالمات، نقاط العميل، آخر نشاط |
| **شريط Pipeline** (عرض فقط) | badges ملونة لكل مرحلة |
| **المعلومات الأساسية** | الاسم الأول والأخير، الأسماء بـ 9 لغات (قابل للطي)، الشركة، المسمى |
| **معلومات الاتصال** | هاتف، جوال، بريد، واتساب، تلغرام |
| **العنوان** | الدولة، المدينة، العنوان التفصيلي |
| **التصنيف** | المصدر (14 خيار)، الأولوية، النوع، المرحلة |
| **بادج التحويل** | يظهر عند التحويل لعميل مع التاريخ |

#### 2. ContactInteractionsTab — التفاعلات
**الملف:** `tabs/ContactInteractionsTab.tsx`

- **Timeline** احترافي بخط زمني
- **11 نوع تفاعل**: مكالمة، بريد، اجتماع، ملاحظة، SMS، واتساب، تلغرام، زيارة، مهمة، تغيير حالة، تغيير مسؤول
- **ألوان وأيقونات** مخصصة لكل نوع
- **نموذج إضافة** تفاعل مع اختيار النوع والاتجاه والنتيجة
- **عرض المدة** بصيغة `MM:SS`

#### 3. ContactCallsTab — المكالمات
**الملف:** `tabs/ContactCallsTab.tsx`

- **4 بطاقات إحصائية**: إجمالي، واردة، صادرة، فائتة
- **متوسط مدة المكالمة**
- **قائمة مكالمات** مع أيقونات اتجاه ملونة
- **Outcome badges**: تم الرد، فائتة، لا رد، بريد صوتي، مشغول، متابعة مطلوبة...
- يُفلتر تلقائياً `interaction_type = 'call'`

#### 4. ContactNotesTab — الملاحظات
**الملف:** `tabs/ContactNotesTab.tsx`

- **نص ملاحظات** حر (Textarea)
- **وسوم (Tags)**: إضافة/حذف بـ badges ملونة (indigo)
- **تقييم العميل المحتمل (Lead Score)**: شريط تقدم 0-100 بتدرج ألوان
- **سبب الخسارة**: يظهر عند مرحلة `lost`

---

## 🔌 خدمة البيانات — contactsService.ts

**الملف:** `src/services/contactsService.ts`

### الأنواع المُصدّرة
```typescript
Contact               // جهة الاتصال الكاملة
ContactInteraction     // تفاعل
ContactFilters         // فلاتر البحث
ContactSource          // 14 مصدر
ContactType            // 6 أنواع
LifecycleStage         // 8 مراحل
```

### الدوال المتاحة
| الدالة | الوصف | المُعاملات |
|---|---|---|
| `getContacts(companyId, filters?)` | جلب جهات الاتصال مع فلاتر | `ContactFilters` اختياري |
| `getContact(contactId)` | جلب جهة اتصال واحدة | UUID |
| `createContact(data)` | إنشاء جديد (auto display_name) | `Partial<Contact>` |
| `updateContact(id, data)` | تحديث | UUID + `Partial<Contact>` |
| `archiveContact(id)` | حذف ناعم (soft delete) | UUID |
| `convertToCustomer(id, options?)` | تحويل إلى عميل عبر RPC | UUID + خيارات |
| `getInteractions(contactId, type?)` | جلب التفاعلات مع فلتر نوع اختياري | UUID + نوع التفاعل |
| `addInteraction(data)` | إضافة تفاعل جديد | `Partial<ContactInteraction>` |
| `getPipelineStats(companyId)` | إحصائيات Pipeline | UUID |
| `getContactName(contact, lang)` | استخراج الاسم بلغة محددة | Helper function |

---

## ⚙️ التكوين — documentConfigs.ts

### `contactConfig`
```typescript
{
    type: 'contact',
    titleKey: 'crm.contacts',
    icon: 'Users',
    iconColor: 'bg-indigo-600',
    defaultTab: 'contactOverview',
    supportsModes: ['view', 'edit', 'create'],
    tabs: [
        { id: 'contactOverview',      icon: 'LayoutDashboard', component: 'ContactOverviewTab' },
        { id: 'contactInteractions',  icon: 'MessageSquare',   component: 'ContactInteractionsTab', showInModes: ['view', 'edit'] },
        { id: 'contactCalls',        icon: 'Phone',            component: 'ContactCallsTab',        showInModes: ['view', 'edit'] },
        { id: 'contactNotes',        icon: 'StickyNote',       component: 'ContactNotesTab' },
        { id: 'activity',            icon: 'Clock',            component: 'ActivityTab',            showInModes: ['view'] },
    ],
    actions: [
        { id: 'save',              showInModes: ['create', 'edit'] },
        { id: 'cancel',            showInModes: ['create', 'edit'] },
        { id: 'edit',              showInModes: ['view'] },
        { id: 'convertToCustomer', showInModes: ['view'] },       // 🆕 CRM-specific
        { id: 'delete',            showInModes: ['view'], requiresConfirm: true },
    ],
    stats: [
        { id: 'interactions', valueKey: 'interaction_count' },
        { id: 'calls',        valueKey: 'total_calls' },
        { id: 'score',        valueKey: 'lead_score', colorClass: 'text-amber-600' },
    ],
}
```

---

## 🔄 تدفق العمل — Workflows

### إنشاء جهة اتصال جديدة
```
1. المستخدم يضغط "إضافة جهة اتصال" → ContactsTable
2. يُفتح UnifiedAccountingSheet (mode: 'create', docType: 'contact')
3. يَظهر تبويب ContactOverviewTab + ContactNotesTab
4. المستخدم يملأ البيانات ← يضغط "حفظ"
5. handleSave → contactsService.createContact() → Supabase INSERT
6. display_name يُولّد تلقائياً من name_ar || name_en || first+last
7. React Query invalidates → الجدول يتحدث تلقائياً
```

### عرض ومعاينة جهة اتصال
```
1. المستخدم ينقر على صف في الجدول
2. يُفتح UnifiedAccountingSheet (mode: 'view')
3. تَظهر: بطاقات إحصائية + شريط Pipeline + 5 تبويبات
4. ContactInteractionsTab يجلب التفاعلات تلقائياً
5. ContactCallsTab يجلب المكالمات (interaction_type = 'call')
```

### تحويل إلى عميل
```
1. في وضع العرض → المستخدم يضغط "تحويل إلى عميل"
2. window.confirm للتأكيد
3. contactsService.convertToCustomer(id) → RPC: convert_contact_to_customer()
4. الدالة تُنشئ سجل في customers + تُحدّث contacts.status = 'converted'
5. toast.success + onRefresh → تحديث الجدول
```

### ربط المكالمات التلقائي
```
1. مكالمة جديدة تُسجّل في call_logs (INSERT)
2. Trigger: trg_auto_link_call → auto_link_call_to_contact()
3. البحث في contacts.phone, contacts.mobile عن تطابق
4. إذا وُجدت مطابقة → call_logs.contact_id = contact.id
5. إذا لم تُوجد → البحث في customers.phone, customers.mobile
6. إذا وُجد → call_logs.customer_id = customer.id
```

---

## 🧪 كيفية الاختبار

### اختبار إنشاء جهة اتصال
1. الذهاب إلى CRM → جهات الاتصال
2. الضغط على "إضافة جهة اتصال"
3. ملء: الاسم العربي، الهاتف، المصدر = "واتساب"، الأولوية = "عالي"
4. حفظ ← التحقق من ظهور جهة الاتصال في الجدول

### اختبار التفاعلات
1. الضغط على جهة اتصال موجودة (وضع العرض)
2. التبويب "التفاعلات" → "إضافة تفاعل"
3. اختيار نوع "مكالمة" + اتجاه "صادر" + إدخال محتوى
4. حفظ ← التحقق من ظهور التفاعل في Timeline
5. التبويب "المكالمات" ← التحقق من ظهور المكالمة

### اختبار التحويل إلى عميل
1. فتح جهة اتصال (وضع العرض)
2. الضغط على "تحويل إلى عميل"
3. التأكيد ← التحقق من:
   - ظهور بادج "تم التحويل" في القسم السفلي
   - تغيير المرحلة إلى "Converted"
   - إنشاء سجل عميل جديد

---

## 🔗 التكامل مع الوحدات الأخرى

| الوحدة | نوع التكامل | التفاصيل |
|---|---|---|
| **Call Center** | `call_logs.contact_id` | ربط تلقائي للمكالمات |
| **Customers** | `convert_contact_to_customer()` | تحويل Lead → Customer |
| **Telegram** | `telegram_username`, `telegram_chat_id` | التواصل عبر بوت |
| **n8n** | Webhook Trigger | إشعارات عند إنشاء/تحديث جهات اتصال |
| **NexaDataTable** | `persistKey: crm_contacts_table` | حفظ تفضيلات الجدول |
| **UnifiedAccountingSheet** | `docType: 'contact'` | الشيت الموحد |

---

*آخر تحديث: 2026-02-09 21:11 UTC*

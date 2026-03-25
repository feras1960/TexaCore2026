# 📋 سجل التغييرات — 2026-02-09
## TexaCore ERP — Advanced Features Deployment + CRM Contacts Module

> **التاريخ:** 2026-02-09  
> **الجلسة:** نشر الميزات المتقدمة + تأسيس وحدة CRM  
> **الحالة:** ✅ تم التنفيذ بنجاح

---

## 📊 ملخص سريع

| العنصر | العدد |
|---|---|
| سكربتات SQL مُنفّذة | 5 |
| جداول جديدة | 9 |
| سياسات RLS جديدة | 36 (9 جداول × 4 سياسات) |
| دوال جديدة (Functions) | 9 |
| تريغرات جديدة (Triggers) | 5 |
| فهارس جديدة (Indexes) | 25+ |
| ملفات n8n مُحدّثة | 3 |

---

## 🗂️ السكربتات المُنفّذة بالترتيب

### 1️⃣ `STEP_1_ADVANCED_FEATURES_SCHEMA.sql`
📂 `supabase/scripts/STEP_1_ADVANCED_FEATURES_SCHEMA.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | QR Codes + Telegram Integration |
| **الجداول** | `qr_codes`, `qr_scans` |
| **أعمدة جديدة** | `telegram_username`, `telegram_chat_id`, `preferred_language`, `last_interaction_at` → `customers` |
| **أعمدة جديدة** | `telegram_username`, `telegram_chat_id`, `is_manager`, `qr_access_level` → `user_profiles` |
| **RLS** | 4 سياسات لـ `qr_codes` + 4 سياسات لـ `qr_scans` |
| **Triggers** | `trg_qr_codes_updated_at` — تحديث `updated_at` تلقائياً |
| **Functions** | `update_entity_status_on_scan()` — تحديث حالة الكيان عند المسح |
| **النمط** | Brand → Tenant → Company, `tablename_operation_policy` |
| **ملاحظات** | `qr_scans` معاملة كسجلات غير قابلة للتعديل (UPDATE = false) |

---

### 2️⃣ `STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql`
📂 `supabase/scripts/STEP_2_COMMUNICATIONS_AND_SHIPMENTS_SCHEMA.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | Call Center + Shipments + Bank + Notifications |
| **الجداول** | `call_logs`, `call_analyses`, `shipments_tracking`, `bank_integrations`, `notification_preferences` |
| **RLS** | 4 سياسات لكل جدول = 20 سياسة |
| **CHECK Constraints** | `direction`, `status`, `sentiment`, `tracking_status`, `integration_type`, `channel` |
| **Indexes** | أداء عالي لكل جدول |
| **النمط** | النمط الرسمي مع قيود خاصة: |
| | - `bank_integrations` → `is_tenant_admin()` فقط |
| | - `call_analyses` → UPDATE = false (سجلات غير قابلة للتعديل) |

---

### 3️⃣ `supabase-rpc-functions.sql`
📂 `n8n-workflows/supabase-rpc-functions.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | دوال RPC للتقارير — تكامل n8n |
| **Functions** | |
| | `get_daily_stats(p_tenant_id, target_date)` — إحصائيات يومية |
| | `get_monthly_summary(p_tenant_id, target_month)` — ملخص شهري |
| | `get_fund_balances(p_tenant_id)` — أرصدة الصناديق |
| | `get_monthly_sales(p_tenant_id, months)` — مبيعات شهرية |
| | `get_monthly_expenses(p_tenant_id, months)` — مصروفات شهرية |
| **عزل المستأجر** | `get_user_tenant_id()` — الدالة الرسمية |
| **الصلاحيات** | `REVOKE anon` + `GRANT authenticated, service_role` |
| **النوع** | `SECURITY DEFINER` |

---

### 4️⃣ `supabase-webhook-trigger.sql`
📂 `n8n-workflows/supabase-webhook-trigger.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | إرسال الأحداث لـ n8n عبر Webhook |
| **Trigger** | `trg_journal_entries_n8n` — INSERT + UPDATE على `journal_entries` |
| **Function** | `notify_n8n_journal_entry()` |
| **Payload** | يتضمن `tenant_id` للعزل متعدد المستأجرين |
| **حماية** | `EXCEPTION WHEN OTHERS` — فشل الـ webhook لا يكسر المعاملة |
| **ملاحظة** | يتطلب تفعيل `pg_net` وتعيين URL الـ webhook |

---

### 5️⃣ `STEP_3_CRM_CONTACTS_SCHEMA.sql` 🆕
📂 `supabase/scripts/STEP_3_CRM_CONTACTS_SCHEMA.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | وحدة CRM — جهات الاتصال (Leads/Prospects) |
| **الجداول** | `contacts`, `contact_interactions` |
| **أعمدة جديدة** | `contact_id`, `customer_id`, `notes` → `call_logs` |
| **اللغات** | **9 لغات كاملة**: `name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it` |
| **RLS** | 4 سياسات لـ `contacts` + 4 سياسات لـ `contact_interactions` |
| **Indexes** | 15 فهرس أداء (phone, email, source, lifecycle, etc.) |

#### الدوال والتريغرات:

| النوع | الاسم | الوظيفة |
|---|---|---|
| Trigger | `trg_contacts_updated_at` | تحديث `updated_at` تلقائياً |
| Trigger | `trg_contact_interaction_stats` | تحديث `interaction_count`, `last_interaction_at`, `total_calls` تلقائياً |
| Trigger | `trg_auto_link_call` | ربط المكالمة بجهة الاتصال تلقائياً عبر رقم الهاتف |
| Function | `auto_link_call_to_contact()` | بحث تلقائي عن جهة اتصال/عميل بنفس الرقم |
| Function | `convert_contact_to_customer()` | تحويل جهة اتصال إلى عميل رسمي |

#### حقل `contacts.source` — مصادر جهات الاتصال:
```
phone_inbound, phone_outbound, google_ads, facebook_ads, 
instagram_ads, website, telegram, online_store, referral, 
walk_in, exhibition, whatsapp, email_campaign, manual
```

#### حقل `contacts.lifecycle_stage` — مراحل دورة الحياة:
```
new → contacted → interested → qualified → negotiation → converted
                                                        → lost
                                                        → archived
```

---

## 📁 ملفات n8n المُحدّثة

| الملف | التعديل |
|---|---|
| `01-telegram-notifications.json` | إصلاح حرف JSON غير صالح |
| `02-qr-scan-workflow.json` | تحويل من PostgreSQL مباشر إلى REST API (توافق Supabase Free Tier) + معالجة "QR not found" |
| `03-ai-telegram-assistant.json` | بدون تغيير (جاهز للاستخدام) |

---

## 📐 وثائق التحليل

| الملف | المحتوى |
|---|---|
| `docs/analysis/CRM_AND_CALL_CENTER_ANALYSIS.md` | خطة هجرة CRM من المشروع القديم |
| `docs/analysis/CRM_CONTACTS_DETAILED_ANALYSIS.md` 🆕 | تحليل شامل لوحدة جهات الاتصال مع أفضل الممارسات العالمية (Salesforce, HubSpot, Odoo) |

---

## 🔒 معايير الأمان المُطبّقة

1. **النمط الرسمي**: Brand → Tenant → Company
2. **تسمية السياسات**: `tablename_operation_policy`
3. **الدوال المساعدة المُستخدمة**:
   - `get_user_tenant_id()` — عزل المستأجر
   - `is_platform_admin()` — صلاحيات المنصة
   - `is_partner_or_reseller()` + `get_partner_tenant_ids()` — الشركاء
   - `is_same_brand(tenant_id)` — عزل العلامة التجارية
   - `is_tenant_admin()` — مدير المستأجر
4. **SECURITY DEFINER** لكل الدوال الحساسة
5. **EXCEPTION blocks** في التريغرات الخارجية
6. **Immutable logs**: `qr_scans` و `call_analyses` (UPDATE = false)

---

## 📊 الجداول الجديدة — ملخص شامل

| # | الجدول | الغرض | RLS | Policies |
|---|---|---|---|---|
| 1 | `qr_codes` | رموز QR | ✅ | 4 |
| 2 | `qr_scans` | سجل المسح | ✅ | 4 |
| 3 | `call_logs` | سجل المكالمات | ✅ | 4 |
| 4 | `call_analyses` | تحليلات AI للمكالمات | ✅ | 4 |
| 5 | `shipments_tracking` | تتبع الشحنات | ✅ | 4 |
| 6 | `bank_integrations` | تكامل البنوك | ✅ | 4 |
| 7 | `notification_preferences` | تفضيلات الإشعارات | ✅ | 4 |
| 8 | `contacts` 🆕 | جهات الاتصال CRM | ✅ | 4 |
| 9 | `contact_interactions` 🆕 | سجل التفاعلات | ✅ | 4 |
| | **المجموع** | | **9/9** | **36** |

---

## ⏳ الخطوات التالية

1. ~~نشر STEP 1 — QR + Telegram~~ ✅
2. ~~نشر STEP 2 — Communications + Shipments~~ ✅
3. ~~نشر RPC Functions~~ ✅
4. ~~نشر Webhook Trigger~~ ✅
5. ~~نشر STEP 3 — CRM Contacts~~ ✅
6. ~~تطوير `ContactsTable.tsx`~~ ✅
7. ~~تطوير الشيت الموحد — `docType: 'contact'`~~ ✅
8. ~~`contactsService.ts`~~ ✅
9. **→ تكوين n8n** — استيراد Workflows وتفعيلها
10. **→ تطوير Call Center Dashboard** — لوحة تحكم المكالمات
11. ~~تطوير Pipeline Board~~ ✅ — لوحة Kanban + إنشاء مستندات بيع

---

## 🆕 Frontend CRM — مكونات جديدة (2026-02-09 21:10 UTC)

### الملفات المُنشأة/المُعدّلة

| الملف | العملية | الوصف |
|---|---|---|
| `tabs/ContactOverviewTab.tsx` | 🆕 إنشاء | نموذج إنشاء/تعديل/معاينة مع 9 لغات |
| `tabs/ContactInteractionsTab.tsx` | 🆕 إنشاء | Timeline تفاعلات + نموذج إضافة |
| `tabs/ContactCallsTab.tsx` | 🆕 إنشاء | سجل مكالمات + إحصائيات |
| `tabs/ContactNotesTab.tsx` | 🆕 إنشاء | ملاحظات + وسوم + Lead Score |
| `tabs/index.ts` | ✏️ تعديل | إضافة تصدير CRM tabs |
| `types.ts` | ✏️ تعديل | `'contact'` → `UnifiedDocType` |
| `configs/documentConfigs.ts` | ✏️ تعديل | `contactConfig` (5 تبويبات + 5 أزرار + 3 إحصائيات) |
| `UnifiedAccountingSheet.tsx` | ✏️ تعديل | `renderTabContent` + `convertToCustomer` action |
| `ContactsTable.tsx` | ✏️ تعديل | استبدال `AddContactSheet` بـ `UnifiedAccountingSheet` |
| `contactsService.ts` | ✏️ تعديل | `getInteractions(id, type?)` — فلتر نوع اختياري |

### الشيت الموحد — 3 وضعيات

| الوضعية | التبويبات | الأزرار |
|---|---|---|
| **إنشاء** | نظرة عامة, ملاحظات | حفظ, إلغاء |
| **معاينة** | نظرة عامة, تفاعلات, مكالمات, ملاحظات, نشاط | تعديل, تحويل لعميل, حذف |
| **تعديل** | نظرة عامة, تفاعلات, مكالمات, ملاحظات | حفظ, إلغاء |

### التوثيق
| الملف | المحتوى |
|---|---|
| `docs/features/CRM_CONTACTS_MODULE.md` | التوثيق الشامل (Backend + Frontend + Workflows + Testing) |

---

## 🏗️ Pipeline Board — سير المبيعات (2026-02-09 21:30 UTC)

### الملفات المُنشأة/المُعدّلة

| الملف | العملية | الوصف |
|---|---|---|
| `crm/tabs/PipelineBoard.tsx` | 🔄 إعادة بناء كامل | مقابل 15 سطراً فقط → **700+ سطر** |

### الميزات المُضافة

| الميزة | التفاصيل |
|---|---|
| **عرض Kanban** | 6 أعمدة (عروض أسعار → حجوزات → أوامر بيع → تسليم → فوترة → مكتمل) |
| **عرض جدولي** | `NexaDataTable` مع بحث + pagination |
| **تبديل العرض** | زر Kanban/List |
| **بطاقات إحصائية** | قيمة Pipeline، صفقات نشطة، مكتمل، معدل التحويل |
| **فلتر تاريخ** | DateRangePicker (آخر 3 أشهر افتراضياً) |
| **إنشاء مستندات** | قائمة إجراءات سريعة (عرض سعر / أمر بيع / إذن تسليم / فاتورة) |
| **سحب وإفلات** | Drag & Drop → يفتح نافذة إنشاء المستند المطلوب تلقائياً |
| **زر المرحلة التالية** | على كل بطاقة — ينقل للخطوة التالية في Pipeline |
| **دمج UnifiedTradeSheet** | لإنشاء مستندات البيع مباشرة من Pipeline |
| **دمج Contact Sheet** | عرض/تعديل جهة الاتصال من داخل الكانبان |
| **RTL + Dark Mode** | دعم كامل للغة العربية والوضع الليلي |

### منطق تحديد المرحلة
```
فاتورة مدفوعة → مكتمل
فاتورة → فوترة
تسليم → تسليم
أمر بيع → أوامر البيع
حجز → حجوزات
الباقي → عروض أسعار
```

---

### 6️⃣ `SALES_WORKFLOW_COMPLETE_SETUP.sql`
📂 `supabase/scripts/SALES_WORKFLOW_COMPLETE_SETUP.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | محرك سير العمل الديناميكي للمبيعات |
| **الجداول** | `status_groups`, `custom_statuses`, `status_transitions`, `status_history`, `workflow_notification_settings`, `workflow_scenario_toggles` |
| **RLS** | 12 سياسة أولية (تم استبدالها لاحقاً — انظر سكربت 7) |
| **Functions** | `change_document_status()`, `deduct_inventory()`, `execute_pos_delivery()`, `get_status_color_class()` |
| **البيانات** | 4 مجموعات حالات افتراضية: `invoice`, `order`, `journal_entry`, `payment` |
| **ملاحظات** | الدوال تستخدم `SECURITY DEFINER` للتجاوز الآمن لـ RLS |

#### التصحيحات المهمة في هذا السكربت:
| الخطأ القديم | التصحيح |
|---|---|
| `user_profiles.user_id` | → `user_profiles.id` (PK = auth.uid()) |
| `user_profiles.tenant_id` | → عبر `companies.tenant_id` |
| `inventory_transactions` | → `inventory_movements` |
| `delivery_items` / `delivery_id` | → `delivery_note_items` / `delivery_note_id` |

### 7️⃣ `FIX_WORKFLOW_RLS_POLICIES.sql` ⚡ إصلاح عاجل
📂 `supabase/scripts/FIX_WORKFLOW_RLS_POLICIES.sql`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | إصلاح خطأ 403 Forbidden عند الوصول لجداول الوورك فلو |
| **السبب** | السياسات كانت تستخدم JOIN بدل Subquery + `FOR ALL` بدل `INSERT WITH CHECK` |
| **الحل** | إعادة بناء 22 سياسة RLS بالنمط المعياري للمشروع |
| **النمط** | `SELECT tenant_id FROM companies WHERE id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())` |

#### تفصيل السياسات الجديدة (22 سياسة):
| الجدول | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `status_groups` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ (is_system=false) |
| `custom_statuses` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ (is_system=false) |
| `status_transitions` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ |
| `status_history` | ✅ | ✅ WITH CHECK | — | — |
| `workflow_notification_settings` | ✅ | ✅ WITH CHECK | ✅ | ✅ |
| `workflow_scenario_toggles` | ✅ | ✅ WITH CHECK | ✅ | ✅ |

---

## 🤖 n8n Workflows — الاستيراد والتشغيل

### الحالة: ✅ n8n v2.6.4 شغّال على `http://localhost:5678`

### الـ Workflows المستوردة (5):

| ID | الاسم | الملف |
|---|---|---|
| `S9M7SRIFjxrV862e` | TexaCore — ERP Telegram Notifications | `01-telegram-notifications.json` |
| `jtvsAzsvCBwS95Dt` | TexaCore — Daily Financial Report | `02-daily-report.json` |
| `bAR0Uo6Cfb8s2C9P` | TexaCore — QR Scan Processing Workflow | `02-qr-scan-workflow.json` |
| `k7O4DEM1BW9lyNql` | TexaCore — AI Telegram Assistant | `03-ai-telegram-assistant.json` |
| `f3pAcvfnx2NhWgli` | Sales Workflow Automation | `04-sales-workflow-automation.json` |

### ملف المبيعات الرئيسي `04-sales-workflow-automation.json`:
```
[Webhook] → [Is Status Change?] → [Is Delivery?] → [Get Status Code]
    → [Delivered?] → [Get Delivery from delivery_notes]
        ├→ [Auto-Create Invoice in sales_invoices]
        │       └→ [Notify via Telegram]
        └→ [Deduct from inventory_movements]
```

### تصحيحات n8n:
| الاستعلام | التصحيح |
|---|---|
| `sales_deliveries` | → `delivery_notes` |
| `delivery_items` + `delivery_id` | → `delivery_note_items` + `delivery_note_id` |
| `inventory_transactions` | → `inventory_movements` (مع الأعمدة المطلوبة) |
| `delivery_number` | → `note_number` |

---

## 📊 الملخص النهائي المُحدّث

| العنصر | العدد |
|---|---|
| سكربتات SQL مُنفّذة | **7** |
| جداول جديدة | **15** (9 سابقة + 6 وورك فلو) |
| سياسات RLS | **58** (36 سابقة + 22 وورك فلو) |
| دوال جديدة | **13** (9 سابقة + 4 وورك فلو) |
| ملفات n8n مستوردة | **5** |
| تصحيحات كود | **3** (TradeService + n8n JSON + RLS) |

---

*آخر تحديث: 2026-02-09 23:33 UTC*

### 8️⃣ إصلاح Frontend — `tenant_id` vs `company.id` ⚡
📂 `src/features/sales/pages/SalesWorkflowSettings.tsx`

| العنصر | التفاصيل |
|---|---|
| **الغرض** | إصلاح خطأ 403 المستمر بعد إصلاح RLS |
| **السبب الجذري** | الكود كان يرسل `companyId` (= `companies.id`) كـ `tenant_id`، لكن RLS تتحقق أن `tenant_id` = `companies.tenant_id` — **وهما مختلفان** |
| **الإصلاح** | استخراج `company.tenant_id` من `useCompany()` واستخدامه في كل INSERT |
| **التغيير** | `tenant_id: companyId` → `tenant_id: tenantId \|\| companyId` (مع `tenantId = company?.tenant_id`) |

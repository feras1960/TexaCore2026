# 🔄 Sales Workflow System — التوثيق الشامل لنظام سير عمل المبيعات

> **التاريخ:** 2026-02-09  
> **الحالة:** ✅ مُنفّذ على الـ Production Database  
> **الملف المصدري:** `supabase/scripts/SALES_WORKFLOW_COMPLETE_SETUP.sql`

---

## 📋 الفهرس

1. [نظرة عامة](#نظرة-عامة)
2. [البنية المعمارية](#البنية-المعمارية)
3. [الجداول](#الجداول)
4. [سياسات RLS](#سياسات-rls)
5. [الدوال (RPC Functions)](#الدوال)
6. [خدمة الفرونت إند](#خدمة-الفرونت-إند)
7. [واجهة الإعدادات](#واجهة-الإعدادات)
8. [تكامل n8n](#تكامل-n8n)
9. [خريطة أسماء الجداول](#خريطة-أسماء-الجداول)
10. [أمثلة عملية](#أمثلة-عملية)

---

## نظرة عامة

نظام سير عمل المبيعات في TexaCore يتبنى نهج **Dynamic Workflow Engine** — محرك ديناميكي يسمح لكل شركة (Tenant) بتخصيص مسار المبيعات حسب أعمالها، بدلاً من تثبيت الحالات مباشرة في الجداول.

### المكونات الأساسية:

```
┌──────────────────────────────────────────────────────┐
│                  Workflow Engine                       │
│                                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────┐ │
│  │   Status     │──▶│   Custom    │──▶│  Status    │ │
│  │   Groups     │   │  Statuses   │   │ Transitions│ │
│  └─────────────┘   └─────────────┘   └────────────┘ │
│                           │                           │
│                           ▼                           │
│                    ┌─────────────┐                    │
│                    │   Status    │                    │
│                    │   History   │                    │
│                    └─────────────┘                    │
├──────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌────────────────┐               │
│  │  Notification │   │    Scenario    │               │
│  │   Settings    │   │    Toggles     │               │
│  └──────────────┘   └────────────────┘               │
└──────────────────────────────────────────────────────┘
```

### الأهداف:
- ✅ كل شركة تُحدد مراحلها الخاصة (مسودة → مؤكد → مُسلّم → مدفوع)
- ✅ قواعد تحويل بين الحالات مع صلاحيات حسب الدور
- ✅ سجل تدقيق كامل لكل تغيير حالة
- ✅ إجراءات تلقائية عند تغيير الحالة (JSONB)
- ✅ تكامل مع n8n للأتمتة المتقدمة (Telegram، تقارير، AI)
- ✅ إعدادات إشعارات قابلة للتخصيص لكل حدث

---

## البنية المعمارية

### مسار الربط بين المستخدم والشركة (Tenant Resolution)

```
⚠️ مهم جداً — هذا النمط الصحيح والوحيد:

user_profiles.id = auth.uid()           ← المفتاح الأساسي
user_profiles.company_id → companies.id → companies.tenant_id

✅ الصحيح:
  SELECT c.tenant_id FROM companies c
  JOIN user_profiles up ON up.company_id = c.id
  WHERE up.id = auth.uid()

❌ خطأ شائع:
  SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  (لا يوجد عمود user_id ولا tenant_id في user_profiles)
```

### طبقات النظام:

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│  SalesWorkflowSettings.tsx          │
│  statusService.ts                   │
├─────────────────────────────────────┤
│         Supabase Client             │
│  .from() / .rpc()                   │
├─────────────────────────────────────┤
│         PostgreSQL + RLS            │
│  6 جداول + 4 دوال + 22 سياسة       │
├─────────────────────────────────────┤
│         n8n (اختياري)               │
│  Webhooks + Automation Scenarios    │
└─────────────────────────────────────┘
```

---

## الجداول

### 1. `status_groups` — مجموعات الحالات

تُجمّع الحالات بشكل منطقي لكل نوع مستند.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف الفريد |
| `tenant_id` | UUID FK → tenants | NULL = حالة نظام مشتركة |
| `doc_type` | VARCHAR(50) | نوع المستند: `invoice`, `order`, `journal_entry`, `payment` |
| `code` | VARCHAR(50) | كود المجموعة |
| `name_ar` | VARCHAR(100) | الاسم بالعربية |
| `name_en` | VARCHAR(100) | الاسم بالإنجليزية |
| `sort_order` | INT | ترتيب العرض |
| `is_system` | BOOLEAN | حماية من الحذف |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ التحديث |

**القيد الفريد:** `UNIQUE(tenant_id, doc_type, code)`

### 2. `custom_statuses` — الحالات المخصصة

الحالات الفعلية التي يمر بها المستند.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف الفريد |
| `tenant_id` | UUID FK → tenants | NULL = مشترك |
| `group_id` | UUID FK → status_groups | المجموعة الأم |
| `doc_type` | VARCHAR(50) | نوع المستند |
| `code` | VARCHAR(50) | كود الحالة: `draft`, `confirmed`, `delivered`, `paid` |
| `name_ar` | VARCHAR(100) | الاسم بالعربية |
| `name_en` | VARCHAR(100) | الاسم بالإنجليزية |
| `color` | VARCHAR(20) | اللون: `gray`, `blue`, `green`, `red`, `yellow`, `orange`, `purple`, `indigo`, `cyan`, `teal`, `pink` |
| `icon` | VARCHAR(50) | أيقونة (Lucide icon name) |
| `sort_order` | INT | ترتيب العرض |
| `is_system` | BOOLEAN | حماية من الحذف |
| `is_initial` | BOOLEAN | ✅ الحالة المبدئية للمستند الجديد |
| `is_final` | BOOLEAN | ✅ الحالة النهائية (يُغلق المستند) |
| `time_norm_hours` | INT | المدة المعيارية (SLA) |
| `can_view_roles` | TEXT[] | الأدوار المسموح لها بالرؤية |
| `can_set_roles` | TEXT[] | الأدوار المسموح لها بالتعيين |
| `auto_actions` | JSONB | إجراءات تلقائية عند الدخول |

**القيد الفريد:** `UNIQUE(tenant_id, doc_type, code)`

### 3. `status_transitions` — قواعد الانتقال

تحدد المسارات المسموحة بين الحالات (Directed Graph).

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف |
| `tenant_id` | UUID FK → tenants | |
| `doc_type` | VARCHAR(50) | نوع المستند |
| `from_status_id` | UUID FK → custom_statuses | الحالة المصدر |
| `to_status_id` | UUID FK → custom_statuses | الحالة الهدف |
| `allowed_roles` | TEXT[] | الأدوار المسموحة |
| `requires_comment` | BOOLEAN | يتطلب تعليق |
| `requires_approval` | BOOLEAN | يتطلب موافقة |
| `approval_roles` | TEXT[] | أدوار الموافقة |
| `auto_actions` | JSONB | إجراءات تلقائية عند التحويل |

**القيد الفريد:** `UNIQUE(tenant_id, doc_type, from_status_id, to_status_id)`

### 4. `status_history` — سجل التدقيق

سجل غير قابل للتغيير لكل تغيير حالة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | UUID PK | المعرف |
| `tenant_id` | UUID FK → tenants | |
| `doc_type` | VARCHAR(50) | نوع المستند |
| `doc_id` | UUID | معرف المستند الأصلي |
| `from_status_id` | UUID FK | الحالة السابقة (NULL إذا أول حالة) |
| `to_status_id` | UUID FK | الحالة الجديدة |
| `changed_by` | UUID FK → auth.users | المستخدم الذي غيّر |
| `comment` | TEXT | تعليق (إجباري أحياناً) |
| `metadata` | JSONB | بيانات إضافية |
| `created_at` | TIMESTAMPTZ | التاريخ والوقت |

### 5. `workflow_notification_settings` — إعدادات الإشعارات

إعدادات الإشعارات لكل حدث في سير العمل.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `tenant_id` | UUID FK → tenants | |
| `event_id` | VARCHAR(100) | معرف الحدث: `quotation_created`, `invoice_paid` |
| `doc_type` | VARCHAR(50) | نوع المستند |
| `in_app` | BOOLEAN | إشعار داخلي |
| `email` | BOOLEAN | بريد إلكتروني |
| `telegram` | BOOLEAN | تلغرام |
| `sms` | BOOLEAN | رسائل SMS |
| `recipients` | JSONB | قائمة المستلمين |

**القيد الفريد:** `UNIQUE(tenant_id, event_id)`

### 6. `workflow_scenario_toggles` — تفعيل السيناريوهات

حالة تفعيل سيناريوهات الأتمتة لكل شركة.

| العمود | النوع | الوصف |
|--------|-------|-------|
| `tenant_id` | UUID FK → tenants | |
| `scenario_id` | VARCHAR(100) | معرف السيناريو |
| `is_active` | BOOLEAN | مُفعّل أم لا |
| `config` | JSONB | إعدادات إضافية |
| `activated_by` | UUID FK → auth.users | مَن فعّله |

**القيد الفريد:** `UNIQUE(tenant_id, scenario_id)`

---

## سياسات RLS

كل الجداول الستة مفعّل عليها RLS.

> ⚠️ **مهم:** تم إصلاح السياسات في `FIX_WORKFLOW_RLS_POLICIES.sql` بتاريخ 2026-02-09

### النمط المعتمد (Subquery — المعيار الموحد في كل المشروع):
```sql
-- ✅ النمط الصحيح المعتمد:
SELECT tenant_id FROM companies WHERE id IN (
  SELECT company_id FROM user_profiles WHERE id = auth.uid()
)

-- ❌ النمط القديم (تسبب في 403 Forbidden):
SELECT c.tenant_id FROM companies c
JOIN user_profiles up ON up.company_id = c.id
WHERE up.id = auth.uid()
```

### لماذا Subquery وليس JOIN؟
- بعض إصدارات PostgreSQL/RLS تتعامل مع JOIN بشكل مختلف في RLS policies
- النمط الموحد في كل المشروع يستخدم Subquery (انظر 00003, 00006, 00018...)
- `FOR ALL` لا يعمل بشكل صحيح مع INSERT — يجب فصل العمليات

### جدول السياسات (22 سياسة):

| الجدول | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `status_groups` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ (is_system=false) |
| `custom_statuses` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ (is_system=false) |
| `status_transitions` | ✅ + NULL | ✅ WITH CHECK | ✅ | ✅ |
| `status_history` | ✅ | ✅ WITH CHECK | — | — |
| `workflow_notification_settings` | ✅ | ✅ WITH CHECK | ✅ | ✅ |
| `workflow_scenario_toggles` | ✅ | ✅ WITH CHECK | ✅ | ✅ |

---

## الدوال

### 1. `change_document_status()`

تغيير حالة المستند مع التحقق من صحة الانتقال.

```sql
SELECT change_document_status(
  p_tenant_id  := '...',
  p_doc_type   := 'invoice',
  p_doc_id     := '...',
  p_new_status_id := '...',
  p_comment    := 'تمت الموافقة'
);
-- Returns: UUID (history record ID)
```

**المنطق:**
1. يجلب آخر حالة من `status_history`
2. يتحقق من وجود انتقال مسموح في `status_transitions`
3. يسجل التغيير في `status_history`
4. يرجع `history_id`

### 2. `deduct_inventory()`

خصم المخزون — متوافق مع أعمدة `inventory_movements` الفعلية.

```sql
SELECT deduct_inventory(
  p_warehouse_id   := '...',
  p_product_id     := '...',
  p_quantity       := 5,
  p_reference_type := 'pos_sale',
  p_reference_id   := '...'
);
```

**ملاحظة مهمة:** `inventory_movements` يتطلب:
- `company_id` (NOT NULL) — يُجلب من `user_profiles.company_id`
- `movement_number` (NOT NULL) — يُولّد تلقائياً: `AUTO-YYYYMMDD-HHMMSS-XXXX`
- `movement_type` (NOT NULL) — يُعيّن `'out'`
- `created_by` (NOT NULL) — يُعيّن `auth.uid()`

### 3. `execute_pos_delivery()`

تنفيذ بيع POS شامل (فاتورة → إذن تسليم → خصم مخزون).

```sql
SELECT execute_pos_delivery(
  p_invoice_id   := '...',
  p_warehouse_id := '...',
  p_tenant_id    := '...'
);
-- Returns: JSONB { success, invoice_id, delivery_id, message }
```

**ملاحظة:** يستخدم `delivery_notes` + `delivery_note_items` (ليس `sales_deliveries`).

### 4. `get_status_color_class()`

دالة مساعدة لتحويل اسم اللون إلى كلاسات CSS.

```sql
SELECT get_status_color_class('green');
-- Returns: 'bg-green-100 text-green-700'
```

الألوان المدعومة: `gray`, `blue`, `green`, `red`, `yellow`, `orange`, `purple`, `indigo`, `cyan`, `teal`, `pink`

---

## خدمة الفرونت إند

### `statusService.ts`

**المسار:** `src/services/statusService.ts`

| الدالة | الوصف |
|--------|-------|
| `getStatusGroups(docType)` | جلب مجموعات الحالات لنوع مستند |
| `getStatuses(docType)` | جلب كل الحالات لنوع مستند |
| `getStatusByCode(docType, code)` | البحث عن حالة بالكود |
| `changeStatus(...)` | تنفيذ تغيير حالة (يستدعي RPC) |
| `getAllowedTransitions(...)` | جلب التحويلات المسموحة للحالة الحالية ودور المستخدم |
| `getStatusHistory(docType, docId)` | جلب سجل تغيير الحالات لمستند |

### خريطة الألوان `STATUS_COLORS`:

```typescript
export const STATUS_COLORS = {
  gray:   { bg, text, border, dark },
  blue:   { bg, text, border, dark },
  green:  { bg, text, border, dark },
  red:    { bg, text, border, dark },
  yellow: { bg, text, border, dark },
  // ... 11 لون إجمالاً
};
```

### `TradeService.ts`

**المسار:** `src/features/trade/services/TradeService.ts`

| الدالة | الوصف |
|--------|-------|
| `createTradeDocument(doc, docType, currency)` | إنشاء مستند تجاري (عرض سعر, أمر, فاتورة...) |
| `createPOSSale(doc, currency)` | بيع POS شامل (فاتورة + تسليم + خصم مخزون) |
| `convertDocument(sourceId, sourceType, targetType)` | تحويل مستند (عرض سعر → أمر → فاتورة) |
| `updateTradeDocument(id, updates, docType)` | تحديث مستند |
| `getNextReferenceNumber(docType)` | توليد رقم مرجعي |

**خريطة الجداول في TradeService:**

| نوع المستند | الجدول الرئيسي | جدول البنود |
|-------------|---------------|------------|
| `quotation` | `quotations` | `quotation_items` |
| `reservation` | `transit_reservations` | `reservation_items` |
| `order` | `sales_orders` | `sales_order_items` |
| `delivery` | `sales_deliveries` | `delivery_note_items` ✅ |
| `invoice` | `sales_invoices` | `sales_invoice_items` |

---

## واجهة الإعدادات

### `SalesWorkflowSettings.tsx`

**المسار:** `src/features/sales/pages/SalesWorkflowSettings.tsx`

واجهة شاملة لتكوين سير العمل من خلال **6 تبويبات**:

| التبويب | الوصف |
|---------|-------|
| **المراحل** (Statuses) | إضافة / تعديل / حذف / ترتيب الحالات |
| **قواعد التحويل** (Transitions) | تحديد المسارات المسموحة بين الحالات |
| **الرسم البصري** (Visual Flow) | عرض بصري لمسار الوورك فلو |
| **الإشعارات** (Notifications) | تفعيل/تعطيل الإشعارات لكل حدث ولكل قناة |
| **السيناريوهات** (Scenarios) | تفعيل سيناريوهات الأتمتة المسبقة البناء |
| **الإجراءات التلقائية** (Auto Actions) | ربط إجراءات بأحداث تغيير الحالة |

### تبويب الإشعارات:

أحداث الإشعار المتاحة:

| الحدث | الوصف |
|-------|-------|
| `quotation_created` | إنشاء عرض سعر |
| `order_confirmed` | تأكيد أمر مبيعات |
| `delivery_started` | بدء التسليم |
| `delivery_completed` | اكتمال التسليم |
| `invoice_created` | إنشاء فاتورة |
| `invoice_paid` | دفع فاتورة |
| `low_stock_alert` | تنبيه انخفاض المخزون |
| `payment_overdue` | تأخر الدفع |

القنوات: **داخلي** (In-App) | **بريد إلكتروني** | **تلغرام**

### تبويب السيناريوهات:

4 سيناريوهات أتمتة جاهزة مبنية على n8n:

| السيناريو | الملف | الوصف |
|-----------|-------|-------|
| إشعارات تلغرام الفورية | `01-telegram-notifications.json` | إشعار فوري عند إنشاء/تحديث المستندات |
| التقرير اليومي الآلي | `02-daily-report.json` | ملخص يومي بالمبيعات والمخزون |
| مساعد AI عبر تلغرام | `03-ai-telegram-assistant.json` | مساعد ذكي يجيب على استفسارات المبيعات |
| أتمتة سير العمل | `04-sales-workflow-automation.json` | فاتورة تلقائية + خصم مخزون + إشعار |

---

## تكامل n8n

### `04-sales-workflow-automation.json`

**سير العمل الرئيسي للمبيعات:**

```
[Webhook Trigger]
       │
       ▼
[Is Status Change?] ──No──▶ [No Action]
       │ Yes
       ▼
[Is Delivery?] ──No──▶ [No Action]
       │ Yes
       ▼
[Get Status Code]
       │
       ▼
[Status = Delivered?] ──No──▶ [No Action]
       │ Yes
       ▼
[Get Delivery Details from delivery_notes]
       │
       ├──▶ [Auto-Create Invoice in sales_invoices]
       │          │
       │          ▼
       │    [Notify via Telegram]
       │
       └──▶ [Deduct Inventory from inventory_movements]
```

### استعلامات SQL المُصححة في n8n:

```sql
-- جلب تفاصيل التسليم (delivery_notes، ليس sales_deliveries)
SELECT dn.*, c.name as customer_name 
FROM delivery_notes dn 
LEFT JOIN contacts c ON c.id = dn.customer_id 
WHERE dn.id = '{{doc_id}}'

-- خصم المخزون (inventory_movements مع الأعمدة المطلوبة)
INSERT INTO inventory_movements (
  tenant_id, company_id, movement_number, movement_date,
  movement_type, product_id, from_warehouse_id,
  quantity, reference_type, reference_id, notes, created_by
)
SELECT ...
FROM delivery_note_items dni
JOIN delivery_notes dn ON dn.id = dni.delivery_note_id
```

### ملفات n8n:

```
n8n-workflows/
├── 01-telegram-notifications.json     # إشعارات تلغرام
├── 02-daily-report.json               # التقرير اليومي
├── 03-ai-telegram-assistant.json      # مساعد AI
├── 04-sales-workflow-automation.json   # أتمتة المبيعات ✅
├── sales-workflow-triggers.sql        # SQL Triggers (قديم)
├── supabase-rpc-functions.sql         # RPC functions
├── supabase-webhook-trigger.sql       # Webhook trigger
└── README.md
```

---

## خريطة أسماء الجداول

> ⚠️ **مهم جداً:** هذه الخريطة تمثل الأسماء **الفعلية** في قاعدة البيانات

| الاسم المتوقع | الاسم الفعلي | ملاحظات |
|---------------|-------------|---------|
| `inventory_transactions` | `inventory_movements` ✅ | يتطلب: `company_id`, `movement_number`, `created_by` |
| `delivery_items` | `delivery_note_items` ✅ | FK: `delivery_note_id` (ليس `delivery_id`) |
| `sales_deliveries` (للبنود) | `delivery_notes` ✅ | جدول إذن التسليم الرئيسي |
| `user_profiles.user_id` | `user_profiles.id` ✅ | PK = `auth.uid()` مباشرة |
| `user_profiles.tenant_id` | **لا يوجد** ✅ | الربط عبر: `companies.tenant_id` |

### مخطط العلاقات:

```
auth.users.id
     │
     ▼
user_profiles.id (PK = auth.uid())
     │
     ├── .company_id ──▶ companies.id ──▶ companies.tenant_id ──▶ tenants.id
     │
     └── .role (admin | owner | manager | user)
```

---

## أمثلة عملية

### 1. إنشاء مسار مبيعات مخصص لشركة:

```sql
-- 1. إنشاء مجموعة حالات
INSERT INTO status_groups (tenant_id, doc_type, code, name_ar, name_en, sort_order)
VALUES ('TENANT_UUID', 'order', 'sales_flow', 'مسار المبيعات', 'Sales Flow', 1);

-- 2. إنشاء الحالات
INSERT INTO custom_statuses (tenant_id, group_id, doc_type, code, name_ar, color, is_initial, is_final, sort_order)
VALUES
  ('TENANT_UUID', 'GROUP_UUID', 'order', 'draft',     'مسودة',   'gray',  true,  false, 1),
  ('TENANT_UUID', 'GROUP_UUID', 'order', 'confirmed', 'مؤكد',    'blue',  false, false, 2),
  ('TENANT_UUID', 'GROUP_UUID', 'order', 'delivered', 'مُسلّم',  'green', false, false, 3),
  ('TENANT_UUID', 'GROUP_UUID', 'order', 'paid',      'مدفوع',   'green', false, true,  4),
  ('TENANT_UUID', 'GROUP_UUID', 'order', 'cancelled', 'ملغي',    'red',   false, true,  5);

-- 3. تعريف قواعد الانتقال
INSERT INTO status_transitions (tenant_id, doc_type, from_status_id, to_status_id, allowed_roles)
VALUES
  ('TENANT_UUID', 'order', 'DRAFT_ID',     'CONFIRMED_ID', ARRAY['admin','manager']),
  ('TENANT_UUID', 'order', 'CONFIRMED_ID', 'DELIVERED_ID', ARRAY['admin','manager','warehouse']),
  ('TENANT_UUID', 'order', 'DELIVERED_ID', 'PAID_ID',      ARRAY['admin','accountant']),
  ('TENANT_UUID', 'order', 'DRAFT_ID',     'CANCELLED_ID', ARRAY['admin']);
```

### 2. تغيير حالة مستند من الفرونت إند:

```typescript
import { statusService } from '@/services/statusService';

// جلب التحويلات المتاحة
const transitions = await statusService.getAllowedTransitions(
  'order', currentStatusId, userRole
);

// تنفيذ تغيير الحالة
const result = await statusService.changeStatus(
  tenantId, 'order', orderId, newStatusId, 'تمت الموافقة على الطلب'
);
```

### 3. بيع POS من الفرونت إند:

```typescript
import { TradeService } from '@/features/trade/services/TradeService';

const result = await TradeService.createPOSSale({
  party_id: customerId,
  warehouse_id: warehouseId,
  items: [
    { item_id: productId, quantity: 3, unit_price: 100, total: 300 }
  ],
  subtotal: 300,
  grand_total: 345, // شامل الضريبة
}, 'SAR');

// النتيجة: { invoice, delivery }
// ✅ تم إنشاء الفاتورة
// ✅ تم إنشاء إذن التسليم (delivery_notes)
// ✅ تم خصم المخزون (inventory_movements)
```

---

## 📁 ملفات المشروع ذات الصلة

```
الباك إند:
├── supabase/scripts/SALES_WORKFLOW_COMPLETE_SETUP.sql  ← السكربت الشامل ✅
├── supabase/scripts/FIX_WORKFLOW_RLS_POLICIES.sql      ← إصلاح RLS (403) ⚡
├── supabase/migrations/00017_custom_statuses.sql       ← Migration الأصلي
├── supabase/migrations/00007_add_inventory_and_products.sql  ← inventory_movements
├── supabase/migrations/20260202_warehouse_enhancements.sql   ← delivery_notes

الفرونت إند:
├── src/services/statusService.ts                       ← خدمة الحالات
├── src/features/sales/pages/SalesWorkflowSettings.tsx  ← واجهة الإعدادات
├── src/features/trade/services/TradeService.ts         ← خدمة المستندات التجارية

الأتمتة (n8n):
├── n8n-workflows/04-sales-workflow-automation.json     ← سير عمل المبيعات
├── n8n-workflows/01-telegram-notifications.json        ← إشعارات تلغرام
├── n8n-workflows/02-daily-report.json                  ← التقرير اليومي
├── n8n-workflows/03-ai-telegram-assistant.json         ← مساعد AI
```

---

## 🔄 سجل التحديثات

| التاريخ | التغيير |
|---------|---------|
| 2026-02-09 | ✅ إنشاء وتنفيذ `SALES_WORKFLOW_COMPLETE_SETUP.sql` |
| 2026-02-09 | ✅ إصلاح `user_id` → `id` في كل سياسات RLS |
| 2026-02-09 | ✅ إصلاح `delivery_items` → `delivery_note_items` في TradeService |
| 2026-02-09 | ✅ إصلاح `inventory_transactions` → `inventory_movements` في n8n |
| 2026-02-09 | ✅ إضافة جدولي `workflow_notification_settings` و `workflow_scenario_toggles` |
| 2026-02-09 | ✅ إنشاء 4 دوال RPC: `change_document_status`, `deduct_inventory`, `execute_pos_delivery`, `get_status_color_class` |
| 2026-02-09 | ⚡ إصلاح خطأ 403: تحويل RLS من JOIN إلى Subquery (22 سياسة) — `FIX_WORKFLOW_RLS_POLICIES.sql` |
| 2026-02-09 | ✅ تشغيل n8n v2.6.4 واستيراد 5 workflows بنجاح |
| 2026-02-09 | ✅ توثيق شامل لكل العمليات والتصحيحات |

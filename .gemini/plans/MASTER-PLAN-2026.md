# 🏆 الخطة الرئيسية الشاملة — TexaCore ERP
**آخر تحديث:** 2026-02-21T03:08 UTC  
**الحالة:** 🔄 قيد التنفيذ التدريجي

---

## 🗺️ خارطة الطريق الاستراتيجية — مارس 2026

> **الفلسفة:** جودة قبل كمية — كل موديول يُطلَق كامل ومختبر وليس MVP مكسور

### المرحلة 1 — ERP متكامل بدون تصنيع (الأسبوعان القادمان)
```
الأسبوع 1 (22-28 فبراير):
  ✦ شجرة الحسابات — UnifiedSheet كامل
  ✦ المناقلات بين المستودعات
  ✦ دورة المبيعات كاملة (قيود + COGS + real-time)

الأسبوع 2 (1-7 مارس):
  ✦ الصرافة والحوالات (Exchange + Transfers)
  ✦ ربط CRM كموديول إضافي (النظام جاهز ✅)
  ✦ HR — شؤون الموظفين والوكلاء والإنتاجية
```

### المرحلة 2 — الذكاء والتوسعة (الأسبوع 3-4)
```
  ✦ AI Analytics — مؤشرات ذكية وتنبؤات
  ✦ BI Dashboards — لوحات تحكم تفاعلية
  ✦ سيناريوهات What-If (تحليل "ماذا لو")
  ✦ المتجر الإلكتروني — ربط كامل (جاهز مبدئياً ✅)
```

### 🏢 موديول HR — المواصفات العالمية
```
الطبقة 1: إدارة الموظفين الأساسية
  ✦ ملف موظف كامل (بيانات + عقد + وثائق)
  ✦ الحضور والغياب + الإجازات
  ✦ هيكل تنظيمي (Org Chart)

الطبقة 2: الرواتب والتعويضات
  ✦ راتب أساسي + بدلات + اقتطاعات
  ✦ ربط تلقائي بسلة المحاسبة (قيد الرواتب)

الطبقة 3: الوكلاء والعمولات
  ✦ إدارة الوكلاء الخارجيين
  ✦ حساب العمولات والحوافز تلقائياً
  ✦ ربط بفواتير المبيعات

الطبقة 4: الإنتاجية وKPI
  ✦ أهداف لكل موظف/وكيل
  ✦ قياس الإنتاجية (KPI Dashboard)
  ✦ تقارير الأداء الفردي والجماعي
  ✦ ربط بـ AI لتحليل الأنماط
```

> **هذا المستوى = HR عالمي** يتفوق على معظم أنظمة HR المستقلة في السوق العربي

### المرحلة 3 — التصنيع (2-3 أسابيع مستقلة)
```
  ✦ BOM — قوائم المواد
  ✦ Work Orders — أوامر الإنتاج
  ✦ قيود تكلفة صناعية
  ✦ مراحل الإنتاج + جودة
```

### النتيجة النهائية
```
┌─────────────────────────────────────────────────────┐
│  TexaCore ERP — منصة SaaS متكاملة عالمية           │
│                                                      │
│  ✅ محاسبة    ✅ مخزون       ✅ مشتريات             │
│  ✅ مبيعات   ✅ كونتينرات    ✅ صرافة/حوالات        │
│  ✅ CRM      ✅ متجر إلكتروني  ✅ طباعة/عقود        │
│  ✅ HR+وكلاء+KPI  ✅ AI/BI Analytics               │
│  ✅ Multi-tenant  ✅ RTL/LTR  ✅ Mobile             │
│  🔄 تصنيع (المرحلة 3)                               │
└─────────────────────────────────────────────────────┘
```

> **هذا المنتج = منافس حقيقي لـ Odoo + SAP B1 + HubSpot + BambooHR معاً** 🏆

---

## 🖨️ مركز الطباعة والعقود — Print & Contract Center

> **الفكرة:** نظام قوالب موحّد يعمل على كل مستندات النظام مع متغيرات ديناميكية

### المكونات الأساسية

**أ) محرر القوالب (Template Builder)**
```
قوالب مرئية WYSIWYG تدعم:
  ✦ متغيرات ديناميكية: {{company_name}}, {{invoice_total}}, {{client_name}}
  ✦ جداول بيانات من DB تلقائياً
  ✦ شعار الشركة + ترويسة وتذييل قابلين للتخصيص
  ✦ RTL/LTR لكل حقل على حدة
  ✦ حفظ وإعادة استخدام القوالب
```

**ب) القوالب المغطاة**
| المستند | المتغيرات الرئيسية |
|---------|-------------------|
| فاتورة مبيعات | `{{invoice_number}}`, `{{client}}`, `{{items_table}}`, `{{total}}`, `{{qr_code}}` |
| فاتورة شراء | `{{supplier}}`, `{{po_number}}`, `{{payment_terms}}` |
| قيد محاسبي | `{{entry_number}}`, `{{dr_lines}}`, `{{cr_lines}}`, `{{posted_by}}` |
| إشعار الكونتينر | `{{container_number}}`, `{{items}}`, `{{landed_cost}}`, `{{customs}}` |
| عقد مورد/عميل | `{{party_name}}`, `{{contract_date}}`, `{{terms}}`, `{{signatures}}` |
| قسيمة راتب | `{{employee_name}}`, `{{basic}}`, `{{allowances}}`, `{{deductions}}`, `{{net}}` |
| عمولة وكيل | `{{agent_name}}`, `{{sales_total}}`, `{{commission_rate}}`, `{{commission}}` |

**ج) مركز الطباعة (Print Center)**
```
أي مستند في النظام → زر 🖨️ "طباعة / PDF"
    ↓
اختيار القالب المناسب
    ↓
معاينة مباشرة قبل الطباعة
    ↓
PDF جاهز × إرسال بالإيميل × طباعة مباشرة
```

**د) إدارة العقود**
```
✦ إنشاء عقد من قالب + ملء المتغيرات تلقائياً من بيانات الطرف
✦ تتبع حالة العقد: مسودة → مراجعة → موقّع → منتهٍ
✦ تنبيه تلقائي قبل انتهاء العقد (30 يوم)
✦ ربط العقد بالفواتير والمدفوعات
✦ توقيع رقمي (Digital Signature)
```

### التقنيات المقترحة
```typescript
// PDF Generation
@react-pdf/renderer  // أو puppeteer للقوالب المعقدة

// المتغيرات الديناميكية
Handlebars.js  // {{variable}} syntax
// أو
Mustache.js

// Template Builder UI
react-email  // للقوالب المرئية

// QR Code للفواتير
qrcode.react
```

### الجدول الزمني المقترح
```
المرحلة 1 (يومان): PDF Generator الأساسي للفواتير والقيود
المرحلة 2 (يومان): محرر القوالب + المتغيرات الديناميكية
المرحلة 3 (يوم): مركز الطباعة الموحد لكل المستندات
المرحلة 4 (يومان): إدارة العقود + تتبع الحالة
```

---

## ⚡ التقنيات المتقدمة المقترحة — Tech Upgrades

### 🔴 أولوية عالية — تأثير فوري

**T1 — Supabase Realtime على القيود والفواتير**
```typescript
// تحديث فوري لجميع المستخدمين المتصلين
supabase.channel('accounting')
  .on('postgres_changes', { event: '*', table: 'journal_entries' },
      () => queryClient.invalidateQueries(['journal_entries']))
  .on('postgres_changes', { event: '*', table: 'containers' },
      () => queryClient.invalidateQueries(['containers']))
  .subscribe();
```
**الأثر:** محاسبان يعملان معاً — يرى كل منهما تغييرات الآخر فوراً
**الوقت:** 2-3 ساعات

---

**T2 — PDF Generation شامل**
```
كل مستند في النظام → PDF احترافي جاهز للطباعة
فاتورة، قيد، كونتينر، عقد، قسيمة راتب
```
**التقنية:** `@react-pdf/renderer`  
**الوقت:** 1-2 يوم

---

**T3 — Zod Validation شامل**
```typescript
// منع الأخطاء قبل إرسالها لـ Supabase
// رسائل خطأ واضحة بالعربي والإنجليزي
const InvoiceSchema = z.object({
  total: z.number().positive(),
  currency: z.string().length(3),
  due_date: z.date().min(new Date()),
});
```
**الوقت:** نصف يوم

---

### 🟡 أولوية متوسطة — قيمة استراتيجية

**T4 — Gemini AI Assistant داخل النظام**
```
"ما مجموع فواتير هذا الشهر؟"
"من أكثر المورّدين شراءً؟"
"توقع رصيد الخزينة نهاية الشهر"
→ يُترجم السؤال إلى SQL ويُعيد إجابة ذكية
```
**الوقت:** 2-3 أيام

---

**T5 — `pg_cron` للمهام التلقائية**
```sql
-- تقارير يومية تلقائية
SELECT cron.schedule('0 6 * * *', 'SELECT generate_daily_snapshot()');

-- حساب الرواتب أول كل شهر
SELECT cron.schedule('0 0 1 * *', 'SELECT process_monthly_payroll()');

-- تنبيهات انتهاء العقود
SELECT cron.schedule('0 8 * * *', 'SELECT check_expiring_contracts()');
```
**الوقت:** نصف يوم

---

**T6 — OCR لاستيراد الفواتير (Gemini Vision)**
```
صورة فاتورة مورد
    ↓
Gemini Vision يستخرج: المبلغ، التاريخ، الضريبة، البنود
    ↓
فاتورة شراء مسبقة الملء في النظام
    ↓
المحاسب يراجع ويوافق فقط
```
**الأثر:** توفير 80% من وقت إدخال البيانات
**الوقت:** 2-3 أيام

---

### ترتيب التنفيذ المقترح (ضمن خطة الأسابيع القادمة)

```
اليوم 1-2:  ✦ شجرة الحسابات (UnifiedSheet)
اليوم 3:    ✦ Realtime + Zod (سريع)
اليوم 4-5:  ✦ المناقلات + دورة المبيعات
اليوم 6-7:  ✦ PDF Generator + مركز الطباعة (المرحلة 1)
اليوم 8-9:  ✦ محرر القوالب + متغيرات ديناميكية
اليوم 10:   ✦ الصرافة والحوالات
اليوم 11-12: ✦ CRM ربط + HR أساسي
اليوم 13:   ✦ pg_cron + مهام تلقائية
اليوم 14:   ✦ Gemini AI Assistant
اليوم 15-17: ✦ OCR فواتير + إدارة العقود
```

---

## ✅ الإنجازات المكتملة (محقَّقة فعلاً في الكود)

---

### 🏛️ قسم أول: نظام الاستلام والمخزون

#### ✅ M1 — تسجيل حركات المخزون (inventory_movements)
- **الوضع:** `createInventoryMovements()` مفعّلة وتُستدعى في `completeReceipt()`
- **الكود:** `receiptCompletionService.ts` السطر 134-135
- **التفاصيل:** تسجيل `movement_type = 'receipt'` أو `'container_receipt'` لكل رولون مستلَم

#### ✅ M2 — تصحيح cost_per_meter في الرولونات
- **الوضع:** `syncFabricRolls()` تُحدّث التكلفة من `sourceItem.unit_price`
- **الكود:** `receiptCompletionService.ts` السطر 648-746
- **إضافة:** `finalizeFabricRollCosts()` (خاص بالكونتينرات) تُحدّث من `container_items.final_unit_cost`

#### ✅ M3 — القيد المحاسبي الصحيح للاستلام
- **الوضع:** `handleAccountingEntry()` متطورة وتعمل بحسابات حقيقية من COA
- **للكونتينر:** Dr. مخزون / Cr. حساب الكونتينر (الحساب المخصص)
- **للفاتورة:** Dr. مخزون / Cr. ذمم دائنة
- **لأمر الشراء:** Dr. مخزون / Cr. بضاعة مستلمة غير مفوترة (GRNI)
- **الحسابات:** تُحلَّل من `company_accounting_settings` + `chart_of_accounts`

#### ✅ M4 — تحديث receipt_status التلقائي
- **الوضع:** `receipt_status = 'received'` (كامل) أو `'partial'` (جزئي)
- **الكود:** `receiptCompletionService.ts` السطر 467-468

#### ✅ M5 — سجل النشاط (Activity Log)
- **الوضع:** `recordActivityLog()` مفعّلة وتكتب في `document_activity`
- **الكود:** السطر 1172-1263
- **يسجّل:** `goods_received`, `receipt_completed`, `journal_entry_created`

#### ✅ M6 — حماية المستند من التكرار (Duplicate Guard)
- **الوضع:** فحص مسبق لمنع إنشاء إذن استلام مكرر لنفس المستند المصدر

#### ✅ M7 — قفل المستند المصدر عند الاستلام
- **الوضع:** عند إنشاء مسودة → `receipt_status = 'in_progress'`
- **عرض:** badge "قيد الاستلام" في قائمة المعلقات مع `animate-pulse`

#### ✅ M8 — نظام معلقات الاستلام (Pending Receipts)
- **الوضع:** يعرض الفواتير + أوامر الشراء + الكونتينرات المناسبة
- **الفلتر:** الكونتينرات فقط بحالة `customs`, `cleared`, `at_port`
- **Realtime:** listener لـ `containers` + `purchase_receipts`

#### ✅ M9 — حفظ المسودة واسترجاعها (Draft System)
- **الوضع:** `loadDraft` يشمل `container_id` + `invoice_id` + `order_id`
- **عرض:** عداد الوقت "منذ X ساعة"، كبسة "متابعة" للحالتين draft + in_progress

---

### 🎨 قسم ثاني: واجهة المستخدم — المخزون (InventoryPage)

#### ✅ UI-1 — تطوير فلاتر صفحة المخزون
- فلتر المستودع ✅
- فلتر الموسم (شتاء/ربيع/صيف/خريف) ✅
- فلتر العملة ✅
- فلتر الحالة (متوفر/منخفض/نفذ) ✅
- فلتر اللون الداخلي (داخل المادة المُفتوحة) ✅
- **محذوف بقرار:** فلتر المادة وفلتر اللون الخارجي (البحث يكفي)

#### ✅ UI-2 — بحث ذكي متعدد الأبعاد
```
البحث يشمل:
✅ اسم المادة (عربي + إنجليزي)
✅ كود المادة
✅ اسم اللون (عربي + إنجليزي) — جديد
```

#### ✅ UI-3 — تحسين رأس الجدول
- حجم النص: من `text-[10px]` إلى `text-xs` (12px)
- الوزن: من `font-semibold` إلى `font-bold`
- اللون: من `text-gray-400` إلى `text-gray-600`
- خلفية أقوى: `bg-gray-100 border-b-2`

---

### 🛡️ قسم ثالث: Business Rules — دورة التجارة

#### ✅ BR-1 — إصلاح تحديث القائمة بعد الحذف
- **المشكلة:** `invalidateTradeQueries()` تُبطل `['purchase_transactions_list']` لكن الصفحة تستخدم `['purchase_transactions_recent']`
- **الحل:** إضافة `purchase_transactions_recent` + `purchase_transactions_full` للـ invalidation

#### ✅ BR-2 — حماية الفواتير المُنفَّذة من الحذف
```
المشتريات: received + posted + receiving → ❌ محظور
           رسالة: "استخدم مرتجع الشراء لعكس العملية"

المبيعات: delivered + invoiced + posted + completed → ❌ محظور
          رسالة: "استخدم مرتجع المبيعات لعكس العملية"

المسودات والطلبات: ✅ يُسمح بالحذف مع تأكيد
```

---

## ⏳ المتبقي من التنفيذ — مُرتَّب بالأولوية

---

## 🔜 المرحلة A: تفعيل UnifiedAccountingSheet في الحسابات والأطراف
**الأولوية:** 🔴 التالي مباشرة  
**المدة التقديرية:** 3-4 ساعات

### A.1 — شجرة الحسابات (ChartOfAccounts.tsx)
- **الحالي:** `UniversalDetailSheet` — يعرض تفاصيل ثابتة فقط
- **الهدف:** `UnifiedAccountingSheet` بـ `docType = 'account'`
- **التبويبات المتوقعة:**
  - 📋 معلومات الحساب (الاسم، الكود، النوع، الحالة)
  - 📒 الأستاذ العام (حركات الحساب)
  - 🧾 القيود المرتبطة
  - 📎 المرفقات
  - 🕒 سجل النشاط

### A.2 — الموردون (Parties.tsx → Suppliers tab)
- **الحالي:** `UniversalDetailSheet`
- **الهدف:** `UnifiedAccountingSheet` بـ `docType = 'supplier'`
- **التبويبات المتوقعة:**
  - 📋 بيانات المورد
  - 💰 الذمم الدائنة والمدفوعات
  - 🧾 فواتير الشراء المرتبطة
  - 📦 الكونتينرات والاستلامات
  - 📎 المرفقات + سجل النشاط

### A.3 — الزبائن / العملاء (Parties.tsx → Customers tab)
- **الحالي:** `UniversalDetailSheet`
- **الهدف:** `UnifiedAccountingSheet` بـ `docType = 'customer'`
- **التبويبات المتوقعة:**
  - 📋 بيانات العميل
  - 💰 الذمم المدينة والمتحصَّل
  - 🧾 فواتير المبيعات المرتبطة
  - 📦 أوامر وتسليمات
  - 📎 المرفقات + سجل النشاط

---

## 🔜 المرحلة B: إكمال نظام المخزون (ما بقي)
**الأولوية:** 🟠 بعد المرحلة A  
**المدة التقديرية:** 3-4 ساعات

### B.1 — إنشاء الدفعات (Batches) عند إغلاق الكونتينر
**المشكلة:** لا يوجد INSERT إلى جدول `batches` في `receiptCompletionService.ts`  
**الحل:** إضافة دالة `createContainerBatches()` تُستدعى بعد `finalizeFabricRollCosts()`

```
لكل مادة في الكونتينر → إنشاء batch بـ:
  - batch_number: BATCH-{container_number}-{mat_code}
  - supplier_unit_cost: container_items.unit_cost
  - final_unit_cost: container_items.final_unit_cost
  - total_meters + total_rolls من الرولونات
  - ربط fabric_rolls.batch_id بالدفعة
```

### B.2 — إغلاق الكونتينر بشكل صحيح ✅ **مُنجز 2026-02-21**
~~**المشكلة:** `status → 'received'` لكن يجب أن يصبح `'closed'` بعد الاكتمال~~

**ما تم تنفيذه فعلياً:**
- ✅ `containers.status = 'closed'` + `closed_at` عند الإغلاق
- ✅ قيد إقفال حقيقي: Dr. بضاعة جاهزة (1141) / Cr. كونتينر (114xx)
- ✅ State Machine مرئي: مفتوح → مثبّت → مغلق
- ✅ DB Migration: `closing_journal_entry_id` في جدول containers
- ✅ DB Trigger: تحديث `current_balance` تلقائياً
- ✅ مصدر حساب المخزون من `companies.accounting_settings.default_accounts`

### B.3 — خدمة المناقلات بين المستودعات
**الملف الجديد:** `transferCompletionService.ts`

```typescript
// المنطق:
// 1. UPDATE fabric_rolls SET warehouse_id = to_warehouse WHERE id IN (...)
// 2. INSERT INTO inventory_movements (movement_type = 'transfer',
//    from_warehouse_id, to_warehouse_id, quantity, unit_cost)
// 3. قيد محاسبي اختياري (إن كانت حسابات منفصلة للمستودعات)
```

**واجهة مستخدم:** زر "نقل" في صفحة المخزون يفتح Dialog بـ:
- اختيار المستودع المقصد
- اختيار الرولونات المراد نقلها
- تأكيد + تنفيذ

---

### B.4 — مصروف لاحق بعد إغلاق الكونتينر (Post-Close Settlement)
**الأولوية:** 🔴 عالية | **السبب:** يؤثّر على دقة تكلفة المخزون

**السيناريو:** كونتينر مغلق ثم جاءت غرامة جمركية إضافية

**القيد المطلوب:**
```
A) تسجيل المصروف:
   Dr. مصاريف كونتينر (حساب الدائن)  +X
   Cr. الدائن (مورد/بنك)              -X

B) تعديل تكلفة المخزون:
   Dr. بضاعة جاهزة (1141)      +X (تعديل التكلفة)
   Cr. فروق تكلفة مخزون (592)  -X
```

**الواجهة:**
- زر "مصروف لاحق ⇔ تسوية" (برتقالي — موجود في UI)
- لكن منطق التسوية **لم يُكتب بعد** — مؤجل للجلسة القادمة

**الملفات المتأثرة:**
- `ContainerExpensesTab.tsx` — زر مصروف لاحق `setShowAddActualForm`
- `useSheetActions.ts` — إضافة case `post_close_expense`
- DB: تسجيل في `container_expenses` + `journal_entries`

---

### B.5 — منع Race Condition عند إغلاق الكونتينر
**الأولوية:** 🟡 متوسطة

```typescript
// في useSheetActions — فحص قبل إنشاء القيد
const { data: existing } = await supabase
    .from('containers').select('status, closing_journal_entry_id')
    .eq('id', closeDocId).single();
if (existing?.status === 'closed' || existing?.closing_journal_entry_id) {
    toast.error('الكونتينر مغلق بالفعل'); return;
}
```

جاهز للتنفيذ — تم تجهيزه منذ قليل 👆

---

## 🔜 المرحلة C: تفعيل دورة المبيعات
**الأولوية:** 🟡 بعد المرحلة B  
**المدة التقديرية:** 5-7 ساعات

### C.1 — مراجعة شاملة لدورة المبيعات
- فاتورة المبيعات → تسليم → سجل مخزون
- هل `inventory_movements` تُسجَّل عند التسليم؟
- هل `cost_of_goods_sold` يُحسَّب صحيحًا؟

### C.2 — إصلاح القيد المحاسبي للمبيعات
```
Dr. ذمم مدينة (عميل)          XXX
Cr. إيراد المبيعات             XXX

Dr. تكلفة البضاعة المباعة (COGS)  XXX
Cr. مخزون                         XXX
```

### C.3 — RealTime + تحديث القائمة
- تطبيق نفس إصلاح queryKeys الذي عملناه للمشتريات على المبيعات

### C.4 — Business Rules المبيعات
- حماية فواتير مُسلَّمة من الحذف ✅ (مكتمل)
- باقي قواعد العمل حسب ما يظهر عند المراجعة

---

## 📊 لوحة تتبع الحالة

| المرحلة | الوصف | الحالة | التالي |
|---------|-------|--------|--------|
| **نظام الاستلام الأساسي** | inventory_movements + costs + journal | ✅ **مكتمل** | — |
| **واجهة المخزون** | Filters + Search + Table headers | ✅ **مكتمل** | — |
| **Business Rules** | Delete protection + queryKeys | ✅ **مكتمل** | — |
| **B.2 — إغلاق الكونتينر** | State Machine + قيد إقفال + DB Trigger | ✅ **مكتمل 2026-02-21** | — |
| **A — UnifiedSheet للحسابات** | COA + Suppliers + Customers | 🔜 **التالي** | ابدأ هنا |
| **B.1 — Batches** | إنشاء الدفعات عند إغلاق الكونتينر | ⏳ قيد الانتظار | بعد A |
| **B.3 — المناقلات** | transferCompletionService | ⏳ قيد الانتظار | بعد A |
| **B.4 — Post-Close Settlement** | مصروف لاحق + تسوية تكلفة مخزون | 🔴 مصمّم / لم يُنفّذ | بعد A |
| **B.5 — Race Condition** | منع إغلاق الكونتينر مرتين | ✅ **مكتمل 2026-02-21** | — |
| **C — دورة المبيعات** | مراجعة شاملة + إصلاحات | ⏳ قيد الانتظار | بعد B |

---

## 📌 ملاحظات مهمة

1. **document_activity** (وليس document_activity_log) — اسم الجدول الصحيح في DB
2. **container_account_id** — يُنشأ تلقائياً بـ trigger عند إنشاء الكونتينر
3. **companies.accounting_settings.default_accounts** — المصدر الوحيد للحسابات الافتراضية (خلف company_accounting_settings)
4. **QueryKeys الصحيحة** لصفحة الشراء: `purchase_transactions_recent` + `purchase_transactions_full`
5. **UnifiedAccountingSheet** — المكوّن الموحد لجميع مستندات النظام — يجب أن يُستخدم في كل مكان
6. **journal_entry_lines.entry_id** (وليس journal_entry_id) — اسم العمود الصحيح
7. **chart_of_accounts.name_ar** (وليس account_name_ar) — اسم العمود الصحيح

---

**آخر تحديث:** 2026-02-21T02:56 UTC  
**المرحلة التالية:** A — UnifiedAccountingSheet في شجرة الحسابات والأطراف

# خطة التنفيذ: المرحلة 6B + المرحلة 7 (محدثة مع التوحيد)

> ⚠️ **هذا الملف أصبح مرجعاً تاريخياً فقط (أرشيف)**
> **الخطة الرسمية الحالية:** `.agent/artifacts/next_phase_plan.md`
> تاريخ الأرشفة: 2026-02-18

تاريخ التحديث: 2026-02-17 | الحالة: ~~معتمدة~~ → أُرشفت 2026-02-18
**تشمل: توحيد containers/shipments + مصاريف تقديرية/حقيقية + دورة الحياة**

---

## البنية الحالية (قبل التوحيد)

```
النظام القديم (المستخدم فعليا — 9 ملفات):
  containers ← الجدول الرئيسي
  container_items ← بنود البضائع
  container_expenses ← المصاريف

النظام الجديد (شبه مهجور — 3 ملفات فقط):
  shipments ← مكرر مع containers
  shipment_items ← مكرر مع container_items  
  shipment_costs ← غير مستخدم نهائيا!
  transit_reservations ← حجوزات (TransitCartDrawer فقط)

المشكلة: AddContainerSheet ينشئ container + shipment مكرر
         TransitCartDrawer يكتب في shipment_items بدل container_items
         صفحة Shipments.tsx فارغة تماما
```

## البنية الهدف (بعد التوحيد)

```
containers ← الجدول الوحيد
container_items ← بنود البضائع (+ حقول الحجز)
container_expenses ← المصاريف (تقديرية + حقيقية + قيود)
container_reservations ← الحجوزات (محولة من transit_reservations)

shipments ← محذوف
shipment_items ← محذوف
shipment_costs ← محذوف
transit_reservations ← محذوف
Shipments.tsx ← محذوف
```

---

## الاقسام التنفيذية (13 قسم)

### المرحلة 0: التوحيد والتنظيف (3 اقسام)

---

### القسم 0-1: تحديث container_items — اضافة حقول الحجز
> الوقت: 15 دقيقة | مستقل

**الهدف:** اضافة الاعمدة الموجودة في shipment_items ولكنها ناقصة من container_items

```sql
-- اضافة حقول الحجز (كانت في shipment_items)
ALTER TABLE container_items
ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(15,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_quantity DECIMAL(15,3) DEFAULT 0;
```

**ملاحظة:** باقي الاعمدة (material_id, color_id, expected_quantity...) موجودة اصلا.

**الملفات:**
- supabase/migrations/20260217_01_unify_container_items.sql (جديد)

---

### القسم 0-2: تعديل TransitCartDrawer — التحويل من shipments الى containers
> الوقت: 30 دقيقة | بعد 0-1

**الهدف:** تعديل TransitCartDrawer ليكتب في container_items و container_reservations بدل shipment_items و transit_reservations

**التغييرات:**

1. **انشاء جدول container_reservations:**
```sql
CREATE TABLE IF NOT EXISTS container_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    reservation_number VARCHAR(50) NOT NULL,
    reservation_date DATE DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    container_id UUID NOT NULL REFERENCES containers(id),
    container_item_id UUID REFERENCES container_items(id),
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    reserved_quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'meter',
    unit_price DECIMAL(15,4),
    total_amount DECIMAL(15,2),
    advance_amount DECIMAL(15,2) DEFAULT 0,
    advance_received BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    UNIQUE(tenant_id, reservation_number)
);
```

2. **تعديل TransitCartDrawer.tsx:**
   - تبديل `from('transit_reservations')` → `from('container_reservations')`
   - تبديل `from('shipment_items')` → `from('container_items')`
   - تبديل `shipment_id` → `container_id`
   - تبديل `shipment_item_id` → `container_item_id`

3. **تعديل containersService.ts:**
   - تحديث دالة getContainerReservations لتقرأ من container_reservations
   - تحديث دالة createReservation

**الملفات:**
- supabase/migrations/20260217_02_container_reservations.sql (جديد)
- src/features/trade/components/TransitCartDrawer.tsx (تعديل)
- src/services/containersService.ts (تعديل)

---

### القسم 0-3: ايقاف انشاء shipment المكرر + تنظيف
> الوقت: 20 دقيقة | بعد 0-2

**الهدف:** ايقاف الكود المكرر وحذف الملفات غير المستخدمة

**التغييرات:**

1. **تعديل AddContainerSheet.tsx:**
   - حذف الكود الذي ينشئ shipment مكرر (السطور 150-185 تقريبا)
   - حذف ربط containers.shipment_id
   - ابقاء فقط: انشاء container + ربط الفواتير

2. **حذف صفحة Shipments الفارغة:**
   - حذف src/features/shipments/Shipments.tsx
   - حذف route المرتبط بها من App.tsx (ان وجد)

3. **حذف عمود shipment_id من containers:**
```sql
ALTER TABLE containers DROP COLUMN IF EXISTS shipment_id;
```

4. **ارشفة الجداول القديمة (امان اضافي):**
```sql
-- اعادة تسمية بدل الحذف (احتياطي)
ALTER TABLE IF EXISTS shipments RENAME TO _archived_shipments;
ALTER TABLE IF EXISTS shipment_items RENAME TO _archived_shipment_items;
ALTER TABLE IF EXISTS shipment_costs RENAME TO _archived_shipment_costs;
ALTER TABLE IF EXISTS transit_reservations RENAME TO _archived_transit_reservations;
```

**الملفات:**
- src/features/purchases/components/AddContainerSheet.tsx (تعديل)
- src/features/shipments/Shipments.tsx (حذف)
- supabase/migrations/20260217_03_archive_shipments.sql (جديد)

---

### المرحلة 6B: المصاريف التقديرية والحقيقية (5 اقسام)

---

### القسم 6B-1: ترحيل قاعدة البيانات — اضافة اعمدة المصاريف
> الوقت: 15 دقيقة | بعد 0-3

**الهدف:** اضافة الاعمدة الناقصة في container_expenses و container_items

```sql
-- container_expenses: اعمدة التصنيف والقيد
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS expense_category VARCHAR(20) DEFAULT 'actual',
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS vendor_account_id UUID,
ADD COLUMN IF NOT EXISTS container_account_id UUID,
ADD COLUMN IF NOT EXISTS journal_description TEXT;

-- container_items: عمود التكلفة التقريبية
ALTER TABLE container_items
ADD COLUMN IF NOT EXISTS estimated_unit_cost DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS estimated_total_cost DECIMAL(15,2);

-- containers: التحقق من وجود اعمدة Landed Cost
ALTER TABLE containers
ADD COLUMN IF NOT EXISTS cost_allocation_method VARCHAR(20) DEFAULT 'by_value',
ADD COLUMN IF NOT EXISTS is_cost_finalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finalized_by UUID,
ADD COLUMN IF NOT EXISTS provisional_goods_cost DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS final_goods_cost DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_expected_costs DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_actual_costs DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_landed_cost DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS provisional_journal_entry_id UUID,
ADD COLUMN IF NOT EXISTS final_journal_entry_id UUID;
```

**الملفات:**
- supabase/migrations/20260217_04_expenses_enhancement.sql (جديد)

---

### القسم 6B-2: الخدمات الخلفية — المصاريف بطبقتين + انشاء قيد
> الوقت: 30 دقيقة | بعد 6B-1

**الهدف:** دوال خدمة لادارة المصاريف بطبقتين + انشاء قيد محاسبي

**الدوال الجديدة في containersService.ts:**

1. `getEstimatedExpenses(containerId)` — جلب المصاريف التقديرية فقط
2. `getActualExpenses(containerId)` — جلب المصاريف الحقيقية فقط
3. `calculateEstimatedLandedCost(containerId)` — حساب التكلفة التقريبية
4. `createExpenseJournalEntry(expense)` — انشاء قيد: مدين كونتينر / دائن شركة
5. `postExpenseJournalEntry(expenseId)` — ترحيل القيد

**منطق القيد:**
```typescript
async function createExpenseJournalEntry(expense) {
  const entry = await journalEntriesService.create({
    company_id: expense.company_id,
    entry_date: expense.date,
    description: expense.journal_description,
    lines: [
      { account_id: expense.container_account_id,
        debit: expense.amount, credit: 0 },
      { account_id: expense.vendor_account_id,
        debit: 0, credit: expense.amount },
    ]
  });
  await updateContainerExpense(expense.id, {
    journal_entry_id: entry.id
  });
  return entry;
}
```

**الملفات:**
- src/services/containersService.ts (تعديل)

---

### القسم 6B-3: الواجهة — سطر المصاريف التقديرية
> الوقت: 40 دقيقة | بعد 6B-2

**الهدف:** بناء سطر المصاريف التقديرية داخل ContainerExpensesTab

**المكونات:**
1. قسم Collapsible بعنوان "المصاريف التقديرية"
2. جدول بسيط: نوع المصروف + المبلغ المتوقع + زر اضافة/حذف
3. اختيار طريقة التوزيع: حسب القيمة او حسب الكمية
4. اجمالي المصاريف المتوقعة
5. مزامنة مباشرة: تحدث container_items.estimated_unit_cost

**الملفات:**
- src/features/accounting/components/unified/tabs/ContainerExpensesTab.tsx (تعديل)

---

### القسم 6B-4: المصاريف الحقيقية — حساب + مورد + قيد فوري + تعديل/حذف
> الوقت: 90 دقيقة | بعد 6B-3

**الهدف:** بناء واجهة المصاريف الحقيقية بنمط: اختر حساب المصروف → اختر حساب المورد → أدخل المبلغ → **💾 حفظ = ترحيل فوري للقيد** → المصروف يظهر كصف منطوي مع خيارات **✏️ تعديل** و **🗑️ حذف**

---

#### 6B-4 الخطوة 1: ~~DB Migration~~ ← ✅ غير مطلوبة! الأعمدة موجودة مسبقاً

**تم التحقق من Supabase مباشرة (2026-02-17):**

جميع الأعمدة المطلوبة **موجودة فعلاً** في `container_expenses`:

| العمود | الوصف | الحالة |
|--------|-------|--------|
| `expense_account_id` | حساب المصروف المدين | ✅ موجود |
| `vendor_account_id` | حساب المورد الدائن | ✅ موجود |
| `container_account_id` | حساب الكونتينر (بضاعة بالطريق) | ✅ موجود |
| `is_posted` | هل القيد مرحّل؟ | ✅ موجود |
| `journal_entry_id` | ربط القيد المحاسبي | ✅ موجود |
| `journal_description` | بيان القيد | ✅ موجود |
| `tax_rate` | نسبة الضريبة | ✅ موجود |
| `tax_amount` | مبلغ الضريبة | ✅ موجود |
| `amount_before_tax` | المبلغ الصافي | ✅ موجود |
| `is_tax_recoverable` | ضريبة مستردة؟ | ✅ موجود |
| `expense_category` | تصنيف المصروف | ✅ موجود |
| `vendor_id` | مرجع المورد | ✅ موجود |
| `vendor_name` | اسم المورد | ✅ موجود |
| `currency` | العملة | ✅ موجود |
| `exchange_rate` | سعر الصرف | ✅ موجود |

**→ يمكن البدء مباشرة بالخطوة 2 (بناء الواجهة)**

---

#### 6B-4 الخطوة 2: واجهة إضافة مصروف حقيقي (سطر الإدخال)

عند الضغط على **"+ إضافة مصروف"** — يظهر سطر إدخال:

```
┌──────────────────────────────────────────────────────────────────┐
│  حساب المصروف: [🔍 SmartAccountSelector — مثل: بضاعة بالطريق]  │
│  ├── حساب المورد: [🔍 SmartAccountSelector — مثل: شركة ميرسك]  │
│                                                                  │
│  المبلغ: [______]  العملة: [USD ▼]  سعر الصرف: [______]         │
│  البيان: [شحن بحري كونتينر CNT-0001 — ميرسك________________]    │
│                                                                  │
│              [💾 حفظ وترحيل]              [❌ إلغاء]             │
└──────────────────────────────────────────────────────────────────┘
```

| # | الحقل | النوع | مطلوب | ملاحظة |
|---|-------|-------|-------|--------|
| 1 | **حساب المصروف** | SmartAccountSelector | ✅ | الحساب المدين (بضاعة بالطريق / مصاريف شحن...) |
| 2 | **حساب المورد** | SmartAccountSelector | ✅ | الحساب الدائن (شركة ميرسك / المخلص الجمركي...) |
| 3 | **المبلغ** | Input number | ✅ | المبلغ الصافي |
| 4 | **العملة** | Select | ✅ | USD, UAH, SAR... |
| 5 | **سعر الصرف** | Input number | ✅ | تحويل للعملة الأساسية |
| 6 | **البيان** | Input text | ✅ | وصف المصروف (يُنسخ للقيد تلقائياً) |

**⚡ سلوك زر "💾 حفظ وترحيل" (عملية واحدة):**

```
الضغط على [💾 حفظ وترحيل]:
  1. حفظ المصروف في container_expenses
  2. إنشاء قيد يومية فوراً:
     مدين: حساب المصروف (expense_account_id)    المبلغ
     دائن: حساب المورد (vendor_account_id)       المبلغ
  3. ترحيل القيد فوراً (is_posted = true) — لا توجد مرحلة مسودة!
  4. ربط القيد بالمصروف (journal_entry_id)
  5. ربط القيد بالكونتينر (container_id في القيد)
  6. إغلاق سطر الإدخال
  7. المصروف يظهر كصف منطوي في قائمة المصاريف الحقيقية
```

#### 6B-4 الخطوة 3: عرض المصاريف المحفوظة (صفوف منطوية + تعديل/حذف)

كل مصروف محفوظ يظهر كصف قابل للفتح والإغلاق مع أزرار **تعديل ✏️** و **حذف 🗑️**:

```
━━━ المصاريف الحقيقية (3 مصاريف — إجمالي: 11,200 USD) ━━━━━━━━━━━

▶ 🚢 شحن بحري    │ ميرسك          │ 5,000 USD │ مرحّل ✅ │ ✏️ │ 🗑️
▶ 🛡️ تأمين       │ AIG للتأمين     │   200 USD │ مرحّل ✅ │ ✏️ │ 🗑️
▶ 🏛️ رسوم جمركية │ التخليص السريع  │ 6,000 USD │ مرحّل ✅ │ ✏️ │ 🗑️

                        [+ إضافة مصروف]
```

**عند الضغط على صف ▶ يُفتح ويعرض تفاصيل القيد:**

```
▼ 🚢 شحن بحري    │ ميرسك          │ 5,000 USD │ مرحّل ✅ │ ✏️ │ 🗑️
  ┌─────────────────────────────────────────────────────┐
  │  📋 القيد: JE-2026-0045                            │
  │  📅 التاريخ: 2026-02-15                             │
  │  📝 البيان: شحن بحري كونتينر CNT-0001 — ميرسك      │
  │                                                     │
  │  الحساب                    │  مدين   │  دائن        │
  │  ─────────────────────────────────────────────────  │
  │  بضاعة بالطريق             │  5,000  │     —        │
  │  شركة ميرسك للشحن          │    —    │  5,000       │
  │                                                     │
  │  الحالة: ✅ مرحّل                                   │
  └─────────────────────────────────────────────────────┘
```

---

#### 6B-4 الخطوة 4: تعديل المصروف (✏️)

عند الضغط على **✏️** — الصف يتحول لوضع التحرير (نفس حقول الإدخال):

```
✏️ تعديل — شحن بحري
  ┌──────────────────────────────────────────────────────────┐
  │  حساب المصروف: [بضاعة بالطريق ▼]                        │
  │  ├── حساب المورد: [شركة ميرسك ▼]                        │
  │                                                          │
  │  المبلغ: [5,500]  العملة: [USD ▼]  سعر الصرف: [1.00]    │
  │  البيان: [شحن بحري كونتينر CNT-0001 — ميرسك]            │
  │                                                          │
  │         [💾 حفظ التعديل وترحيل]        [❌ إلغاء]        │
  └──────────────────────────────────────────────────────────┘
```

**⚡ سلوك زر "💾 حفظ التعديل وترحيل":**

```
الضغط على [💾 حفظ التعديل وترحيل]:
  1. عكس القيد القديم (قيد عكسي تلقائي — reversing entry)
  2. تحديث المصروف في container_expenses بالمبلغ/البيان الجديد
  3. إنشاء قيد يومية جديد بالمبلغ الجديد
  4. ترحيل القيد الجديد فوراً
  5. ربط القيد الجديد بالمصروف (journal_entry_id = القيد الجديد)
  6. إعادة حساب إجمالي المصاريف والتكلفة الواصلة
  7. إغلاق وضع التحرير — الصف يرجع منطوي
```

---

#### 6B-4 الخطوة 5: حذف المصروف (🗑️) + حماية القيود

**عند الضغط على 🗑️:**

```
الضغط على [🗑️]:
  1. رسالة تأكيد: "هل تريد حذف هذا المصروف وعكس القيد المرتبط؟"
  2. [نعم]:
     ← عكس القيد (قيد عكسي)
     ← حذف المصروف من container_expenses
     ←إعادة حساب إجمالي المصاريف والتكلفة الواصلة
  3. [لا]: إلغاء

⚠️ حماية القيود المرتبطة:
  محاولة حذف القيد من صفحة القيود المحاسبية:
  → رسالة منع: "هذا القيد مربوط بكونتينر CNT-0001 — يُحذف فقط من تبويب المصاريف"
  → الحذف مرفوض!
```

---

#### 6B-4 الخطوة 6: تعديل حساب Landed Cost

```typescript
// التكلفة الواصلة = المبلغ الصافي فقط (بدون ضريبة إن وجدت)
const totalExpenses = expenses.reduce((sum, exp) => {
  const amount = exp.amount_before_tax || exp.actual_amount || exp.expected_amount || 0;
  return sum + amount;
}, 0);
```

---

#### 6B-4 الخطوة 7: الدوال الخلفية المطلوبة

```typescript
// 1. حفظ مصروف جديد + إنشاء قيد + ترحيل فوري
async function saveAndPostExpense(expense: ExpenseInput) {
  const saved = await createContainerExpense(expense);
  const entry = await journalEntriesService.create({
    description: expense.description,
    container_id: expense.container_id,
    lines: [
      { account_id: expense.expense_account_id, debit: expense.amount, credit: 0 },
      { account_id: expense.vendor_account_id, debit: 0, credit: expense.amount },
    ]
  });
  await journalEntriesService.post(entry.id);
  await updateContainerExpense(saved.id, { journal_entry_id: entry.id, is_posted: true });
  return { expense: saved, journalEntry: entry };
}

// 2. تعديل مصروف: عكس القيد القديم + تحديث + قيد جديد + ترحيل
async function updateAndRepostExpense(expenseId: string, updates: Partial<ExpenseInput>) {
  const old = await getContainerExpense(expenseId);

  // عكس القيد القديم
  if (old.journal_entry_id) {
    await journalEntriesService.reverse(old.journal_entry_id);
  }

  // تحديث المصروف
  const updated = await updateContainerExpense(expenseId, updates);

  // إنشاء قيد جديد + ترحيل
  const newEntry = await journalEntriesService.create({
    description: updates.description || old.description,
    container_id: old.container_id,
    lines: [
      { account_id: updates.expense_account_id || old.expense_account_id,
        debit: updates.amount || old.amount, credit: 0 },
      { account_id: updates.vendor_account_id || old.vendor_account_id,
        debit: 0, credit: updates.amount || old.amount },
    ]
  });
  await journalEntriesService.post(newEntry.id);
  await updateContainerExpense(expenseId, { journal_entry_id: newEntry.id });

  // إعادة حساب الإجماليات
  await updateContainerTotals(old.container_id);
  return { expense: updated, journalEntry: newEntry };
}

// 3. حذف مصروف + عكس القيد
async function deleteExpenseWithReversal(expenseId: string) {
  const expense = await getContainerExpense(expenseId);
  if (expense.journal_entry_id) {
    await journalEntriesService.reverse(expense.journal_entry_id);
  }
  await deleteContainerExpense(expenseId);
  await updateContainerTotals(expense.container_id);
}
```

**الملفات:**
- `src/features/accounting/components/unified/tabs/ContainerExpensesTab.tsx`
- `src/services/containersService.ts`
- `src/services/journalEntriesService.ts` (إضافة container_id + دالة reverse)

---

### القسم 6B-4b: معالجة ضريبة المشتريات الدولية + تحديث سعر البيع
> الوقت: 40 دقيقة | بعد 6B-4

**الهدف:** عند دفع الجمارك — الضريبة تُحسب لكل مادة وتُضاف لحساب ضريبة المدخلات، ثم تنعكس على سعر البيع

---

#### المشكلة

في المشتريات الدولية، الفاتورة الأصلية **بدون ضريبة** (0% VAT من المورد الأجنبي). 
الضريبة تُدفع **عند الجمركة** بأحد شكلين:

| الشكل | المثال | الحساب |
|-------|--------|--------|
| **نسبة على المادة** | 15% ضريبة على قيمة البضاعة | كل مادة × نسبة الضريبة |
| **مبلغ ثابت على الكمية** | 2 ريال/متر ضريبة | الكمية × المبلغ |

---

#### تدفق الضريبة — المشتريات الدولية

```
1. فاتورة المورد الأجنبي (PI-2026-00011):
   ├── قطن سادة 100% = 10,000 meter × 1.00 USD = 10,000 USD
   ├── ضريبة = 0% ← ✅ صحيح (دولي)
   └── تُسجل في container_items.unit_cost = 1.00

2. وصول الكونتينر + دخول الجمارك:
   ├── المخلص الجمركي يحسب الضريبة
   ├── ضريبة القيمة المضافة = 15% × قيمة البضاعة = 1,500
   └── هذا المبلغ يُسجل كمصروف نوع "ضريبة جمركية"

3. القيد المحاسبي:
   ├── مدين: ضريبة المدخلات (Input VAT)    1,500
   └── دائن: النقد / بنك / مخلص جمركي       1,500
   ⚠️ لا يُضاف للتكلفة! (الضريبة مستردة)

4. توزيع الضريبة على المواد (للتتبع فقط):
   ├── قطن سادة: 1,500 / 10,000 = 0.15 لكل متر
   └── يُحفظ في container_items.tax_per_unit = 0.15

5. تأثير على سعر البيع:
   ├── سعر البيع الصافي = 1.70 (تكلفة واصلة + هامش)
   ├── + ضريبة المخرجات (Output VAT) 15% = 0.255
   └── سعر البيع للعميل = 1.955
```

---

#### التغييرات المطلوبة

**أ. إضافة حقل ضريبة لكل بند:**

```sql
ALTER TABLE container_items
ADD COLUMN IF NOT EXISTS customs_tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customs_tax_per_unit DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customs_tax_total DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN container_items.customs_tax_rate IS 'نسبة ضريبة الجمارك على المادة';
COMMENT ON COLUMN container_items.customs_tax_per_unit IS 'مبلغ الضريبة لكل وحدة';
COMMENT ON COLUMN container_items.customs_tax_total IS 'إجمالي الضريبة على البند';
```

**ب. عند تسجيل مصروف "ضريبة جمركية" — توزيع تلقائي:**

```typescript
// عند حفظ مصروف نوع customs_vat:
async function distributeCustomsTax(containerId: string, taxAmount: number) {
  const items = await getContainerItems(containerId);
  const totalValue = items.reduce((s, i) => s + (i.unit_cost * i.expected_quantity), 0);
  
  for (const item of items) {
    const itemValue = item.unit_cost * item.expected_quantity;
    const itemTaxShare = (itemValue / totalValue) * taxAmount;
    const taxPerUnit = itemTaxShare / item.expected_quantity;
    
    await updateContainerItem(item.id, {
      customs_tax_rate: (taxAmount / totalValue) * 100,
      customs_tax_per_unit: taxPerUnit,
      customs_tax_total: itemTaxShare,
    });
  }
}
```

**ج. عرض الضريبة في تبويب بنود البضائع:**

إضافة عمود **"ضريبة الجمركة"** في ShipmentItemsTab.tsx:

| المادة | سعر المورد | التكلفة التقديرية | التكلفة الواصلة | ضريبة الجمركة |
|--------|-----------|-------------------|----------------|---------------|
| قطن سادة | 1.00 | 1.70 | — | 0.15/unit |

**د. تأثير على فاتورة البيع:**

عند إنشاء فاتورة بيع لبضاعة من كونتينر:
- `unit_price` = سعر البيع الصافي (التكلفة الواصلة + هامش)
- `tax_rate` = نسبة ضريبة المخرجات (15% مثلاً)
- `tax_amount` = محسوب تلقائي
- ← **هذا يعمل بالفعل** في `salesTransactionService.ts` ✅

**الملفات:**
- `supabase/migrations/20260217_06_customs_tax_fields.sql` (جديد)
- `src/services/containersService.ts` (دوال توزيع الضريبة)
- `src/features/trade/components/tabs/ShipmentItemsTab.tsx` (عمود ضريبة الجمركة)
- `src/features/accounting/components/unified/tabs/ContainerExpensesTab.tsx` (نوع مصروف ضريبة جمركية)

---


### القسم 6B-5: مزامنة التكاليف مع البنود
> الوقت: 25 دقيقة | بعد 6B-3

**الهدف:** عرض عمودين في بنود البضائع: تقريبي + حقيقي

**التغييرات في ShipmentItemsTab.tsx:**
- عمود "التكلفة التقريبية" (برتقالي): سعر المورد + مصاريف تقديرية موزعة
- عمود "التكلفة الحقيقية" (اخضر): final_unit_cost بعد التثبيت

**الملفات:**
- src/features/trade/components/tabs/ShipmentItemsTab.tsx (تعديل)

---

### المرحلة 7: دورة حياة الكونتينر + الاستلام (5 اقسام)

---

### القسم 7-1: توحيد حالات الكونتينر + شريط المراحل
> الوقت: 30 دقيقة | مستقل (يمكن بالتوازي مع 6B)

**الحالات النهائية:**

| الرقم | الحالة            | بالعربي       | اللون       | الايقونة |
|-------|-------------------|--------------|-------------|---------|
| 1     | draft             | مسودة         | رمادي       | 📝      |
| 2     | loading           | تم التحميل    | اصفر        | 📦      |
| 3     | at_sea            | بالبحر        | ازرق        | 🚢      |
| 4     | customs_clearance | بالجمارك      | برتقالي     | 🏛️      |
| 5     | customs_cleared   | تم التخليص    | اخضر فاتح   | ✅      |
| 6     | received          | تم الاستلام   | اخضر        | 📥      |
| 7     | closed            | مغلق          | رمادي غامق  | 🔒      |

**التغييرات:**
- تحديث ContainerStatusStepper.tsx (موجود فعلا)
- تحديث ContainerStatus type في containersService.ts
- اضافة الشريط في اعلى تبويبات الكونتينر

**الملفات:**
- src/features/trade/components/ContainerStatusStepper.tsx (تعديل)
- src/services/containersService.ts (تعديل)

---

### القسم 7-2: تغيير حالة الكونتينر مع التحقق
> الوقت: 20 دقيقة | بعد 7-1

**الهدف:** دالة خلفية امنة لتغيير الحالة

**القواعد:**
- لا يمكن القفز بين المراحل (يجب الترتيب)
- عند received: تحديث received_date
- عند closed: يتطلب is_cost_finalized = true

**الملفات:**
- src/services/containersService.ts (تعديل)

---

### القسم 7-3: اشعار امين المستودع عند الاستلام
> الوقت: 25 دقيقة | بعد 7-2

**الهدف:** عند تغيير الحالة الى received:
- ادراج سجل في activity_log مع type = container_received
- تحديث containers.received_date

**الملفات:**
- src/services/containersService.ts (تعديل)

---

### القسم 7-4: قائمة الاستلامات المعلقة في المستودع
> الوقت: 35 دقيقة | بعد 7-3

**الهدف:** عرض الكونتينرات الجاهزة للاستلام في صفحة المستودع

**الاستعلام:**
```sql
SELECT * FROM containers
WHERE status = 'received'
  AND is_cost_finalized = false
ORDER BY received_date DESC
```

**الواجهة:**
- شارة في المستودع: "3 كونتينرات تنتظر الاستلام"
- قائمة: رقم الكونتينر + المورد + عدد البنود + تاريخ الوصول
- زر "بدء الاستلام"

**الملفات:**
- مكون جديد للمستودع
- src/services/containersService.ts (دالة getPendingReceipts)

---

### القسم 7-5: ربط الاستلام الفعلي بالكونتينر
> الوقت: 40 دقيقة | بعد 7-4

**الهدف:** عند فتح استلام من كونتينر:
1. البنود محملة من container_items
2. المستخدم يدخل الكميات المستلمة فعليا
3. عند الحفظ: تحديث container_items.received_quantity + حركة مخزنية
4. اذا كل البنود مستلمة: الكونتينر ينتقل لحالة closed

**الملفات:**
- src/features/warehouse/components/tabs/GoodsReceiptItemsTab.tsx (تعديل)
- src/services/containersService.ts (تعديل)

---

## مخطط التبعيات

```
المرحلة 0 (التوحيد):
  0-1 (اعمدة container_items)
    |
    v
  0-2 (تحويل TransitCartDrawer) 
    |
    v
  0-3 (ايقاف المكرر + ارشفة shipments)

المرحلة 6B (المصاريف):          المرحلة 7 (دورة الحياة):
  6B-1 (DB اعمدة مصاريف)          7-1 (حالات + شريط)
    |                               |
    v                               v
  6B-2 (خدمات خلفية)              7-2 (تغيير حالة)
    |                               |
    v                               v
  6B-3 (واجهة تقديرية) → 6B-5    7-3 (اشعار مستودع)
    |                               |
    v                               v
  6B-4 (واجهة حقيقية + قيود)     7-4 (استلامات معلقة)
                                    |
                                    v
                                  7-5 (استلام فعلي)
```

**ملاحظة:** المرحلة 6B والمرحلة 7 يمكن العمل عليها بالتوازي بعد انتهاء المرحلة 0.

---

## تقدير الوقت الاجمالي

| المرحلة    | عدد الاقسام | الوقت          |
|------------|-------------|--------------- |
| 0 (توحيد)  | 3 اقسام    | حوالي 1 ساعة   |
| 6B         | 5 اقسام    | حوالي 2.5 ساعة |
| 7          | 5 اقسام    | حوالي 2.5 ساعة |
| **المجموع** | **13 قسم** | **حوالي 6 ساعات** |

---

## ترتيب التنفيذ المقترح

```
الجلسة 1: المرحلة 0 (التوحيد — 3 اقسام)
  0-1 → 0-2 → 0-3
  [فحص: التطبيق يعمل بدون اخطاء]

الجلسة 2: المرحلة 6B (المصاريف — 5 اقسام)
  6B-1 → 6B-2 → 6B-3 → 6B-5 → 6B-4
  [فحص: المصاريف التقديرية والحقيقية تعمل]

الجلسة 3: المرحلة 7 (دورة الحياة — 5 اقسام)
  7-1 → 7-2 → 7-3 → 7-4 → 7-5
  [فحص: الحالات والاستلام يعمل]
```

---

## نقطة البداية: القسم 0-1 (اضافة حقول الحجز الى container_items)

---

## 🔴 قسم حرج: معالجة الضريبة (VAT/Tax) في المشتريات والمصاريف

> تاريخ الإضافة: 2026-02-17 | الأولوية: عالية — يؤثر على الفواتير والمصاريف والقيود

### الحالة الحالية (المشكلة)

| المكون | الوضع الحالي | المشكلة |
|--------|-------------|---------|
| فاتورة المشتريات | `tax_rate` + `tax_amount` محسوبة لكل بند | ✅ سليم |
| container_items | `unit_cost` = سعر المورد بدون ضريبة | ✅ صحيح (المبلغ الصافي للتكلفة) |
| container_expenses | لا يوجد حقل ضريبة إطلاقاً | ⚠️ ناقص |
| قيد المصروف | لا يفصل الضريبة عن المبلغ | ⚠️ ناقص |

### السيناريوهين الرئيسيين

#### 1️⃣ المشتريات الدولية (كونتينر / شحنة)

```
فاتورة المورد الأجنبي:
  ├── المبلغ الصافي = 10,000 USD (بدون ضريبة ✅)
  ├── الضريبة = 0% (معفي من VAT عند المنشأ)
  └── يُسجل في container_items.unit_cost ✅

مصاريف الشحنة:
  ├── شحن بحري = 5,000 (بدون ضريبة ✅)
  ├── تأمين = 200 (بدون ضريبة ✅)
  └── رسوم جمركية = 6,000 ← ⚠️ هنا الضريبة!
      ├── رسوم جمركية صافية = 5,000
      └── ضريبة المدخلات (Input VAT) = 1,000 (مثلاً 15%-20%)

عند الجمركة (Customs Clearance):
  ├── الضريبة المدفوعة → حساب "ضريبة المدخلات" (Input VAT)
  ├── لا تُضاف للتكلفة! (قابلة للاسترداد)
  └── تُسوّى مع "ضريبة المخرجات" عند البيع

عند البيع:
  ├── سعر البيع + ضريبة المخرجات (Output VAT)
  └── صافي الضريبة = المخرجات - المدخلات (يُدفع للحكومة)
```

#### 2️⃣ المشتريات المحلية (فاتورة مباشرة)

```
فاتورة المورد المحلي:
  ├── المبلغ الصافي = 10,000
  ├── الضريبة = 15% = 1,500 (مضافة في الفاتورة ✅)
  ├── الإجمالي = 11,500
  └── الضريبة → حساب "ضريبة المدخلات" مباشرة ✅

عند البيع:
  ├── سعر البيع + ضريبة المخرجات
  └── صافي الضريبة = المخرجات - المدخلات
```

### التغييرات المطلوبة

#### أ. إضافة حقول الضريبة لمصاريف الكونتينر

```sql
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_before_tax DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS is_tax_recoverable BOOLEAN DEFAULT true;

COMMENT ON COLUMN container_expenses.tax_rate IS 'نسبة الضريبة على المصروف';
COMMENT ON COLUMN container_expenses.tax_amount IS 'مبلغ الضريبة (يُنقل لحساب ضريبة المدخلات)';
COMMENT ON COLUMN container_expenses.amount_before_tax IS 'المبلغ الصافي بدون ضريبة (هذا يُوزع على البضائع)';
COMMENT ON COLUMN container_expenses.is_tax_recoverable IS 'هل الضريبة قابلة للاسترداد؟ (عادة نعم)';
```

#### ب. تعديل حساب التكلفة (Landed Cost)

```
التكلفة الواصلة = سعر المورد + المصاريف الصافية (بدون ضريبة!)
  ├── سعر المورد = unit_cost (بدون ضريبة ✅)
  ├── + المصاريف الموزعة = amount_before_tax (ليس actual_amount!)
  └── الضريبة المدفوعة → حساب ضريبة المدخلات (لا تُضاف للتكلفة!)
```

#### ج. تعديل القيد المحاسبي للمصروف

```
القيد الحالي (خطأ):
  مدين: حساب الكونتينر     11,200 (كل المبلغ شاملاً الضريبة!)
  دائن: حساب المورد/الشركة  11,200

القيد الصحيح:
  مدين: حساب الكونتينر      10,000 (المبلغ الصافي فقط)
  مدين: ضريبة المدخلات       1,200 (الضريبة المستردة)
  دائن: حساب المورد/الشركة   11,200 (الإجمالي المدفوع)
```

#### د. تعديل واجهة المصاريف

في ContainerExpensesTab.tsx — لكل مصروف:
- حقل **المبلغ الصافي** (amount_before_tax)
- حقل **نسبة الضريبة** (tax_rate) — dropdown: 0%, 5%, 15%, أخرى
- حقل **مبلغ الضريبة** (محسوب تلقائياً)
- checkbox: **ضريبة قابلة للاسترداد** (is_tax_recoverable) — default: true

### مصفوفة القرار: متى تُضاف الضريبة للتكلفة؟

| نوع المصروف | ضريبة مستردة؟ | تُضاف للتكلفة؟ | أين تذهب الضريبة؟ |
|-------------|---------------|----------------|------------------|
| شحن بحري | نعم | ❌ لا | ضريبة المدخلات |
| رسوم جمركية | نعم | ❌ لا | ضريبة المدخلات |
| تأمين | نعم | ❌ لا | ضريبة المدخلات |
| نقل داخلي | نعم | ❌ لا | ضريبة المدخلات |
| تخليص جمركي | نعم | ❌ لا | ضريبة المدخلات |
| غرامات (demurrage) | ❌ لا | ✅ نعم | جزء من التكلفة |

### أين يؤثر هذا في الكود؟

| الملف | التأثير |
|-------|---------|
| `containersService.ts` → `calculateLandedCost` | يجب استخدام `amount_before_tax` بدل `actual_amount` |
| `containersService.ts` → `saveEstimatedDistribution` | نفس الشيء — المبلغ الصافي فقط |
| `containersService.ts` → `createExpenseJournalEntry` | يجب فصل الضريبة كسطر مدين منفصل |
| `ContainerExpensesTab.tsx` | إضافة حقول الضريبة في واجهة المصاريف |
| `purchaseAccountingService.ts` | التأكد من فصل الضريبة في قيد فاتورة المشتريات |
| `salesTransactionService.ts` | التأكد من حساب ضريبة المخرجات عند البيع |

### ترتيب التنفيذ المقترح — محدّث

```
المرحلة الحالية (✅ منجزة):
  - التكلفة التقديرية تعمل (بدون ضريبة = صحيح مبدئياً)
  - التكلفة الواصلة مفصولة عن التقديرية ✅

المرحلة القادمة — ضمن 6B-4 (المصاريف الحقيقية):
  1. DB Migration: إضافة أعمدة الضريبة → container_expenses ← ✅ منجز
  2. تعديل واجهة المصاريف: حقول الضريبة ← ✅ منجز
  3. تعديل calculateLandedCost: استخدام amount_before_tax ← ✅ منجز
  4. تعديل createExpenseJournalEntry: فصل الضريبة في القيد ← ✅ منجز
  5. اختبار: سيناريو دولي + سيناريو محلي ← 🔲 متبقي
```

### ملاحظة مهمة

> في الكونتينر الحالي CNT-0001، المصاريف التقديرية محسوبة **بدون ضريبة** وهذا **صحيح** لأن:
> - المصاريف التقديرية هي للتخطيط فقط
> - الضريبة ستُحسب عند إدخال المصاريف الحقيقية
> - التكلفة الواصلة محسوبة من المبلغ الصافي (بدون ضريبة) ✅

---

## � القسم 6B-4b: ضريبة المشتريات الدولية — تحليل شامل

> تاريخ الإضافة: 2026-02-17 23:52 | الأولوية: يُنفَّذ بعد اكتمال الأقسام السابقة

---

### 🎯 الهدف

عند استيراد بضائع عبر كونتينر، تُدفع ضريبة المشتريات (VAT) **عند التخليص الجمركي**.
هذه الضريبة:
- تُسجَّل كمصروف فعلي من نوع **"ضريبة مشتريات"**
- تذهب لحساب **ضريبة المدخلات (1160)**
- **لا تُضاف لتكلفة البضاعة** (قابلة للاسترداد)
- تُوزَّع على المواد **للتتبع فقط** (لا تؤثر على التكلفة الواصلة)
- تُسترد عند البيع عبر ضريبة المخرجات

---

### 📋 دورة حياة الضريبة — من الاستيراد للبيع

```
┌──────────────────────────────────────────────────────────────────────┐
│                   دورة حياة ضريبة المشتريات الدولية                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1️⃣ فاتورة المورد الأجنبي (بدون ضريبة = 0% ✅)                     │
│     └── 10,000 متر × 1.00 USD = 10,000 USD                         │
│                                                                      │
│  2️⃣ وصول الكونتينر → التخليص الجمركي                               │
│     ├── يُضاف مصروف "ضريبة مشتريات" في المصاريف الفعلية            │
│     ├── الخيار أ: مبلغ ثابت = 1,500 USD                             │
│     ├── الخيار ب: نسبة 15% × قيمة البضاعة = 1,500 USD              │
│     └── في كلا الحالتين النتيجة: مبلغ ضريبة = 1,500                 │
│                                                                      │
│  3️⃣ القيد المحاسبي (تلقائي عند الحفظ):                             │
│     ├── مدين: ضريبة المدخلات (1160)    1,500                        │
│     ├── دائن: حساب المخلص الجمركي      1,500                        │
│     └── ⚠️ لا يدخل حساب بضاعة بالطريق! (الضريبة مستردة)            │
│                                                                      │
│  4️⃣ توزيع على المواد (للتتبع والتسعير):                            │
│     ├── قطن سادة: 1,500 × (10,000/15,000) = 1,000                  │
│     │   → ضريبة لكل متر = 1,000 / 10,000 = 0.10                    │
│     ├── حرير: 1,500 × (5,000/15,000) = 500                         │
│     │   → ضريبة لكل متر = 500 / 5,000 = 0.10                       │
│     └── يُحفظ في container_items للمرجع                              │
│                                                                      │
│  5️⃣ عند البيع:                                                      │
│     ├── سعر البيع = تكلفة واصلة + هامش                               │
│     ├── + ضريبة المخرجات (15%) = ضريبة يدفعها العميل                │
│     └── صافي الضريبة = مخرجات (من العميل) - مدخلات (للجمارك)       │
│         → الفرق يُدفع للحكومة                                       │
│                                                                      │
│  6️⃣ تسوية نهاية الفترة:                                             │
│     ├── ضريبة مخرجات (2141) - ضريبة مدخلات (1160)                   │
│     └── الفرق = مستحق للحكومة أو مسترد منها                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 🆚 الفرق عن المصاريف العادية

| البند | مصروف عادي (شحن/تخليص/تأمين) | ضريبة مشتريات |
|-------|-------------------------------|---------------|
| **القيد المدين** | حساب بضاعة بالطريق (رسملة) | ✅ حساب ضريبة المدخلات (1160) |
| **يُضاف لتكلفة البضاعة؟** | ✅ نعم (المبلغ الصافي) | ❌ لا (مبلغ مسترد) |
| **يُوزَّع على المواد؟** | ✅ نعم (يزيد التكلفة الواصلة) | 📊 للتتبع فقط (لا يزيد التكلفة) |
| **يُسترد؟** | ❌ لا | ✅ نعم (عبر ضريبة المخرجات) |
| **القيد عند الترحيل** | مدين: بضاعة بالطريق / دائن: مورد | مدين: ضريبة مدخلات / دائن: مخلص جمركي |

---

### 🗃️ التغييرات المطلوبة

#### أ. إضافة نوع مصروف جديد

```typescript
// إضافة لـ EXPENSE_TYPES:
{ value: 'customs_vat', labelAr: 'ضريبة مشتريات (VAT)', labelEn: 'Purchase VAT', icon: '🧾' },
```

#### ب. إضافة أعمدة لـ container_items (توزيع الضريبة)

```sql
ALTER TABLE container_items
ADD COLUMN IF NOT EXISTS customs_tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customs_tax_per_unit DECIMAL(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS customs_tax_total DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN container_items.customs_tax_rate IS 'نسبة ضريبة المشتريات المحسوبة على المادة';
COMMENT ON COLUMN container_items.customs_tax_per_unit IS 'مبلغ الضريبة لكل وحدة (للتتبع)';
COMMENT ON COLUMN container_items.customs_tax_total IS 'إجمالي ضريبة المادة في هذا الكونتينر';
```

#### ج. تعديل القيد المحاسبي

**الحالة الحالية (✅ صحيحة جزئياً):**
```
القيد الحالي يفصل الضريبة عن الرسملة:
  مدين: بضاعة بالطريق    (المبلغ الصافي فقط)
  مدين: ضريبة مدخلات     (مبلغ الضريبة)
  دائن: حساب المورد       (الإجمالي)
```

**التعديل المطلوب لنوع `customs_vat`:**
```
عند حفظ مصروف نوعه customs_vat:
  ⚠️ كل المبلغ → ضريبة مدخلات (وليس بضاعة بالطريق!)
  
  مدين: ضريبة المدخلات (1160)    المبلغ الكامل
  دائن: حساب المخلص الجمركي      المبلغ الكامل
  
  → لا يدخل حساب بضاعة بالطريق إطلاقاً!
  → لا يُضاف للتكلفة الواصلة!
```

#### د. تعديل منطق الـ handleSaveAndPostBatch

```typescript
// في حلقة بناء القيد (handleSaveAndPostBatch):
for (const pe of pendingExpenses) {
  const netInLocal = pe.amount_before_tax * (pe.exchange_rate || 1);
  const taxInLocal = pe.tax_amount * (pe.exchange_rate || 1);
  const totalInLocal = netInLocal + taxInLocal;
  
  if (pe.expense_type === 'customs_vat') {
    // ── ضريبة مشتريات: كل المبلغ → ضريبة مدخلات ──
    // لا يدخل بضاعة بالطريق!
    totalTaxInLocal += totalInLocal; // كامل المبلغ ضريبة
    // لا نضيف لـ totalAmountInLocal (لأنه لا يُرسمَل)
  } else {
    // ── مصروف عادي: يُرسمَل ──
    totalAmountInLocal += netInLocal; // الصافي فقط يُرسمَل
    totalTaxInLocal += taxInLocal;     // الضريبة تذهب لحسابها
  }
  
  // دائن: حساب المورد (نفس المنطق لكل الأنواع)
  journalLines.push({...});
}
```

#### ه. توزيع الضريبة على المواد (تلقائي بعد الحفظ)

```typescript
async function distributeCustomsTax(containerId: string, taxAmount: number) {
  // جلب بنود الكونتينر
  const items = await getContainerItems(containerId);
  const totalValue = items.reduce((s, i) => s + (i.unit_cost * i.expected_quantity), 0);
  
  if (totalValue === 0) return;
  
  for (const item of items) {
    const itemValue = item.unit_cost * item.expected_quantity;
    const itemTaxShare = (itemValue / totalValue) * taxAmount; // حسب القيمة
    const taxPerUnit = itemTaxShare / item.expected_quantity;
    
    await supabase
      .from('container_items')
      .update({
        customs_tax_rate: (taxAmount / totalValue) * 100,
        customs_tax_per_unit: taxPerUnit,
        customs_tax_total: itemTaxShare,
      })
      .eq('id', item.id);
  }
}
```

#### و. عرض الضريبة في بنود البضائع

إضافة عمود في `ShipmentItemsTab.tsx`:

```
| المادة  | سعر المورد | التكلفة الواصلة | ضريبة المشتريات | إجمالي مع ضريبة |
|---------|-----------|----------------|-----------------|----------------|
| قطن     | 1.00      | 1.70            | 0.10/متر        | 1.80           |
```

**هذا العمود للعرض فقط — الضريبة لا تدخل في التكلفة الواصلة!**

---

### 📝 واجهة المستخدم — إضافة مصروف ضريبة مشتريات

عند اختيار نوع المصروف `ضريبة مشتريات (VAT) 🧾`:

```
┌──────────────────────────────────────────────────────────────────┐
│  نوع المصروف: [🧾 ضريبة مشتريات]  ← يتغير سلوك النموذج       │
│                                                                  │
│  ── طريقة الحساب: ──                                             │
│  ○ مبلغ ثابت    ○ نسبة من قيمة البضاعة                          │
│                                                                  │
│  المبلغ: [1,500]  أو  النسبة: [15]% × 10,000 = 1,500           │
│                                                                  │
│  حساب المورد: [🔍 المخلص الجمركي — 211321]                      │
│  العملة: [USD ▼]   سعر الصرف: [1.00]                            │
│  البيان: [ضريبة مشتريات — جمركة كونتينر CNT-0002]              │
│                                                                  │
│  ℹ️ هذا المبلغ سيُسجَّل في حساب ضريبة المدخلات (1160)          │
│     ولن يُضاف لتكلفة البضاعة (مبلغ مسترد)                       │
│                                                                  │
│         [➕ إضافة للدفعة]              [❌ إلغاء]                 │
└──────────────────────────────────────────────────────────────────┘
```

---

### 🔄 خطوات التنفيذ (6B-4b)

| الخطوة | الوصف | التفاصيل |
|--------|-------|----------|
| **4b-1** | DB Migration: أعمدة الضريبة في container_items | `customs_tax_rate`, `customs_tax_per_unit`, `customs_tax_total` |
| **4b-2** | إضافة نوع مصروف `customs_vat` | في EXPENSE_TYPES + تعريف سلوك خاص |
| **4b-3** | تعديل منطق القيد المحاسبي | عند `customs_vat`: كل المبلغ → ضريبة مدخلات |
| **4b-4** | توزيع الضريبة على البنود (تلقائي) | بعد حفظ المصروف → `distributeCustomsTax()` |
| **4b-5** | عرض الضريبة في ShipmentItemsTab | عمود "ضريبة المشتريات" (للعرض فقط) |
| **4b-6** | خيار النسبة/المبلغ في UI | radio button: مبلغ ثابت أو نسبة % |

---

### ⚠️ ملاحظات مهمة

> **1. الضريبة لا تُؤثر على Landed Cost:**
> - التكلفة الواصلة = سعر المورد + المصاريف العادية (شحن + تخليص + تأمين...)
> - ضريبة المشتريات = مبلغ مسترد → يذهب لحساب 1160 فقط

> **2. القيد الحالي يدعم الضريبة جزئياً:**
> - الكود الحالي (سطر 547-590) يفصل `totalTaxInLocal` عن الرسملة
> - لكنه يتعامل مع الضريبة كنسبة على مصروف عادي فقط
> - المطلوب: نوع مصروف كامل حيث 100% من المبلغ = ضريبة

> **3. تسلسل الاسترداد:**
> - ضريبة مدخلات (1160) تتراكم مع كل كونتينر
> - ضريبة مخرجات (2141) تتراكم مع كل فاتورة بيع
> - نهاية الفترة: تسوية 1160 ↔ 2141 → الفرق يُدفع/يُسترد

> **4. التأثير على تسعير البيع:**
> - سعر البيع = تكلفة واصلة + هامش ربح (بدون ضريبة المشتريات)
> - ضريبة المخرجات تُضاف فوق سعر البيع (يدفعها العميل)
> - هذا يعمل بالفعل في `salesTransactionService.ts` ✅

---

## �📊 تحديث التقدم — 2026-02-17 (v3 — آخر تحديث 23:43)

---

### ✅ المرحلة 0: التوحيد والتنظيف

| القسم | الوصف | الحالة | ملاحظة |
|-------|-------|--------|--------|
| 0-1 | إضافة حقول الحجز لـ container_items | 🔲 لم يبدأ | |
| 0-2 | تحويل TransitCartDrawer من shipments → containers | 🔲 لم يبدأ | |
| 0-3 | إيقاف إنشاء shipment المكرر + أرشفة | 🔲 لم يبدأ | |

---

### ✅ المرحلة 6B: المصاريف التقديرية والحقيقية

| القسم | الوصف | الحالة | ملاحظة |
|-------|-------|--------|--------|
| 6B-1 | DB Migration — أعمدة المصاريف | ✅ **منجز** | كل الأعمدة موجودة في container_expenses |
| 6B-2 | الخدمات الخلفية | ✅ **منجز** | مدمج inside ContainerExpensesTab |
| 6B-3 | واجهة المصاريف التقديرية | ✅ **منجز** | تعمل + مغلقة افتراضياً |
| 6B-4 | المصاريف الحقيقية + قيود + تعديل + حذف | ✅ **منجز** | حفظ + ترحيل + تعديل (unpost→update→repost) + حذف (unpost→delete) |
| 6B-4b | ضريبة المشتريات الدولية | 🔲 لم يبدأ | تحليل شامل جاهز — يُنفّذ لاحقاً |
| 6B-5 | مزامنة التكاليف مع البنود + Landed Cost | ✅ **منجز** | calculateLandedCost + saveEstimatedDistribution + saveActualDistribution + finalizeLandedCost |

#### تفاصيل 6B-4 (المصاريف الحقيقية):

| الخطوة | الوصف | الحالة |
|--------|-------|--------|
| خطوة 1 | DB — أعمدة الضريبة + الحسابات + الترحيل | ✅ |
| خطوة 2 | واجهة إضافة مصروف (SmartAccountSelector + الحقول) | ✅ |
| خطوة 3 | عرض المصاريف المحفوظة (صفوف + دفعات) | ✅ |
| خطوة 4 | تعديل المصروف ✏️ (unpost → update → repost) | ✅ |
| خطوة 5 | حذف المصروف 🗑️ (unpost → delete — بدون عكس) | ✅ |
| خطوة 6 | حساب Landed Cost (calculateLandedCost + finalize) | ✅ |
| خطوة 7 | دوال خلفية في containersService.ts | ✅ (calculateLandedCost, saveEstimatedDistribution, saveActualDistribution, finalizeLandedCost, allocateCostsToItems) |

---

### � نظام دفعات المصاريف (M1-M4)

| المرحلة | الوصف | الحالة |
|---------|-------|--------|
| **M1** | إصلاح `currency` + القائمة المؤقتة | ✅ **منجز** |
| **M2** | الحفظ الجماعي + القيد الموحّد | ✅ **منجز** |
| **M3** | عرض الدفعات المحفوظة كبطاقات | ✅ **منجز جزئياً** — تظهر كصفوف |
| **M4** | تعديل/حذف الدفعات (بدون عكس قيود) | ✅ **منجز** — unpost+update/delete |

---

### 🆕 أعمال إضافية أُنجزت (خارج الخطة الأصلية)

| # | البند | الحالة | التفاصيل |
|---|-------|--------|----------|
| 1 | **شجرة حسابات — مقدمو خدمات لوجستية (2113)** | ✅ | مجموعة 2113 + 5 مجموعات فرعية (21131-21135) + حسابات تفصيلية افتراضية |
| 2 | **تحديث 3 قوالب شجرة** | ✅ | simple + extended + fabric_extended |
| 3 | **تبسيط النموذج → حساب مورد فقط** | ✅ | إزالة expense_account_id من الفورم، الاعتماد على vendor_account_id |
| 4 | **إصلاح SmartAccountSelector** | ✅ | سكرول، إخفاء مجموعات، فلتر بكود 2113 |
| 5 | **إصلاح خطأ UUID فارغ** | ✅ | `expense_account_id: '' → null` |
| 6 | **إصلاح فلتر المصاريف الفعلية** | ✅ | تغيير من `expense_account_id` → `vendor_account_id` |
| 7 | **الشجرة الافتراضية: 5800 + 1160** | ✅ | مصاريف مشتريات + ضريبة مدخلات |

---

### 🎯 المتبقي — الأولويات

#### ✅ منجز حديثاً
- **حماية القيود المرتبطة** — القيود المولّدة من الكونتينر/الفواتير لا يمكن تعديلها/حذفها/إلغاء ترحيلها من صفحة القيود
  - حماية frontend (NewJournalEntrySheet + EntryActionToolbar): أزرار معطلة + Badge "مرتبط بـ..."
  - حماية backend (journalEntriesService): unpost + delete يرفضان القيود المرتبطة
  - يشمل: container, purchase_invoice, sales_invoice, goods_receipt + container_expense, auto, provisional
- **تعديل `calculateLandedCost`** — يستخدم الآن `amount_before_tax` بدل `amount` لاستبعاد الضريبة المستردة
- **✅ تحسين تبويب معلومات الكونتينر** (ContainerMainTab V2)
  - شريط حالات الكونتينر (Status Stepper) دائماً ظاهر في الأعلى مع gradient background
  - معلومات الكونتينر + شركة الشحن في Collapsible — مطوي افتراضياً عند العرض، مفتوح عند الإنشاء
  - مسار الشحن والتواريخ في Collapsible — مع badges ملخصة (موانئ + ETA)
  - **جديد**: مستودعات الاستلام (Collapsible) — اختيار مستودع + أمين المستودع + ملاحظات استلام
  - جميع الأقسام تعرض Summary Badges عند الطي للاطلاع السريع
- **✅ إعدادات إشعارات على مستوى الكونتينر** (Per-Container Notification Rules)
  - قسم Collapsible جديد "إعدادات الإشعارات" بألوان violet
  - زرين لإضافة قاعدة: "إشعار مبيعات" (افتراضي: عند الجمركة) + "إشعار مستودع" (افتراضي: عند التخليص)
  - كل قاعدة: Switch تفعيل + نوع (مبيعات/مستودع) + اختيار الشخص + اختيار الحالة المحفزة
  - ملخص الإشعارات في وضع العرض + عداد القواعد النشطة كـ Badge
  - أمين المستودع يُملأ تلقائياً من قسم مستودعات الاستلام

- **✅ نظام الإشعارات العام (Backend + Frontend)** — تم التنفيذ 2026-02-18
  - جدول `notifications` مع RLS (المستخدم يرى إشعاراته فقط)
  - Trigger `fn_container_status_notification` على `containers.status` — يفحص `notification_rules` تلقائياً
  - Realtime مُفعّل → الإشعارات تصل فوراً عبر Supabase Channels
  - `notificationService.ts` — خدمة CRUD + اشتراك لحظي
  - `NotificationBell.tsx` — مركز إشعارات premium في الـ Header
    - تصميم glassmorphism + gradient header بنفسجي
    - تصنيف حسب التاريخ (اليوم/أمس/سابقاً) + عداد الغير مقروءة
    - Toast فوري عند إشعار جديد + أنيميشن pulse على الجرس
    - قراءة إشعار واحد / قراءة الكل / حذف
  - Helper functions: `fn_mark_notifications_read`, `fn_mark_all_notifications_read`
  - 4 إشعارات تجريبية للمستخدم الرئيسي

- **✅ توحيد Shipments → Containers + أرشفة** — تم 2026-02-18
  - حذف صفحة `Shipments.tsx` الفارغة (placeholder) ومجلد `features/shipments/`
  - إزالة module `shipments` من `modules.ts` — الكونتينرات تُدار من قسم المشتريات
  - أرشفة migrations القديمة: `00010_add_shipments_module.sql`, `20260211_shipment_items_enhancements.sql`, `20260217_01_unify_containers_archive_shipments.sql` → `_archive/shipments_legacy/`
  - الجداول القديمة بالفعل مؤرشفة في DB: `_archived_shipments`, `_archived_shipment_items`, `_archived_shipment_documents`
- **✅ إشعارات الفواتير (Purchase + Sales Invoice Triggers)** — تم 2026-02-18
  - `fn_purchase_invoice_notification` trigger على `purchase_invoices.status`
  - `fn_sales_invoice_notification` trigger على `sales_invoices.status`
  - عند تغيير حالة الفاتورة → إشعار لـ `created_by` مع تفاصيل i18n (AR|EN)
  - `NotificationBell.tsx` محدّث: أيقونات مصدر مختلفة (🚢 كونتينر / 🛒 مبيعات / � مشتريات)
- **✅ دورة حياة الكونتينر** — مُكتملة فعلياً
  - Status Stepper مع 9 حالات + تدرجات لونية
  - كل المراحل + الاستلام + إعدادات الإشعارات تعمل

#### أولوية عالية � (مؤجلة لبكرا)

1. **6B-4b — ضريبة المشتريات الدولية** (تحليل شامل جاهز ↑)
   - نوع مصروف `customs_vat` جديد
   - كل المبلغ → ضريبة مدخلات (1160) وليس بضاعة بالطريق
   - توزيع على البنود للتتبع فقط

---

### � 6B-5 — نظام المرفقات الموحد (Unified Document Attachments)
> **تاريخ التحليل:** 2026-02-18 | **الحالة:** ⬜ مخطط | **الأولوية:** 🔴 عالية
> **الهدف:** نظام مرفقات مركزي يعمل على مستوى النظام بالكامل

#### 📊 ملخص القرارات المُعتمدة

| القرار | الاختيار |
|--------|---------|
| نهج التخزين | **النهج A — جدول `documents` الموحد** (موجود من Migration 00018) |
| أنواع الملفات | PDF + صور (JPG, PNG, WebP) |
| أوضاع العرض | 3 أوضاع: جدول + بطاقات + معرض (Gallery) |
| حجم الملف الواحد | **5 MB** |
| إجمالي لكل مستند | **20 MB** |
| عدد الملفات لكل مستند | **10 ملفات** |
| حقول إضافية عند الرفع | اسم المستند + تصنيف + ملاحظات + تاريخ المستند + رقم المستند الأصلي (كلها اختيارية) |
| الكيانات المدعومة | كونتينرات + فواتير مشتريات + فواتير مبيعات + قيود + موردين + عملاء + وثائق الشركة |
| استعراض مباشر | نعم — مع تكبير/تصغير داخل البرنامج |

#### 🗂️ الكيانات التي تدعم المرفقات

| # | الكيان | `entity_type` | أمثلة المرفقات |
|---|--------|--------------|---------------|
| 1 | 🚢 كونتينرات | `container` | بوليصة شحن, شهادة منشأ, تأمين, فاتورة شحن |
| 2 | 📦 فواتير مشتريات | `purchase_invoice` | فاتورة أصلية, عقد, إيصال دفع |
| 3 | 🛒 فواتير مبيعات | `sales_invoice` | فاتورة رسمية, إيصال تسليم |
| 4 | 📝 قيود محاسبية | `journal_entry` | مستند مرفق, إيصال بنكي |
| 5 | 👤 موردين | `supplier` | سجل تجاري, عقد توريد, هوية |
| 6 | 👥 عملاء | `customer` | عقد بيع, كفالة, هوية |
| 7 | 🏢 وثائق الشركة | `company` | شعار, رخصة, سجل تجاري, عقد إيجار, تراخيص |

#### 📐 بنية مسار التخزين في Storage

```
document-attachments/
├── {tenant_id}/
│   ├── container/{container_id}/
│   │   ├── 1708234567_bill_of_lading.pdf
│   │   └── 1708234890_certificate.jpg
│   ├── purchase_invoice/{invoice_id}/
│   │   └── 1708235123_original_invoice.pdf
│   ├── sales_invoice/{invoice_id}/
│   │   └── ...
│   ├── journal_entry/{entry_id}/
│   │   └── ...
│   ├── supplier/{supplier_id}/
│   │   └── ...
│   ├── customer/{customer_id}/
│   │   └── ...
│   └── company/
│       ├── logo.png
│       ├── commercial_register.pdf
│       └── ...
```

---

#### 🔧 خطة التنفيذ — 6 خطوات

##### الخطوة 1: البنية التحتية (Backend) ⬜
> **المدة المقدرة:** 15 دقيقة | **ملفات:** SQL migration

| # | المهمة | التفاصيل |
|---|--------|----------|
| 1.1 | إنشاء Storage Bucket | تنفيذ `20260211_document_attachments_storage.sql` الجاهز |
| 1.2 | تحديث جدول `documents` | إضافة أعمدة: `document_title`, `document_number`, `document_date`, `notes` |
| 1.3 | Storage RLS | سياسات: INSERT/SELECT/DELETE حسب `tenant_id` من folder path |
| 1.4 | تحديث MIME types | إضافة `image/jpeg`, `image/png`, `image/webp` بجانب `application/pdf` |
| 1.5 | تحديث `file_size_limit` | من 3MB إلى 5MB (5242880 bytes) |

```sql
-- 1.2 أعمدة إضافية لجدول documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_title VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_number VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1.4 تحديث Bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880
WHERE id = 'document-attachments';
```

**معايير القبول:**
- [ ] Bucket `document-attachments` موجود وفعّال
- [ ] Upload/Download/Delete يعمل من Supabase Dashboard
- [ ] RLS يمنع الوصول عبر tenants

---

##### الخطوة 2: خدمة المرفقات الموحدة (Service Layer) ⬜
> **المدة المقدرة:** 30 دقيقة | **ملف:** `src/services/attachmentService.ts`

| # | المهمة | التفاصيل |
|---|--------|----------|
| 2.1 | إنشاء `attachmentService.ts` | خدمة موحدة جديدة (بديل عن الكود المبعثر) |
| 2.2 | `uploadAttachment()` | رفع ملف → Storage + INSERT في `documents` |
| 2.3 | `getAttachments()` | جلب مرفقات entity معين مع أنواعها |
| 2.4 | `deleteAttachment()` | حذف من Storage + DELETE من `documents` |
| 2.5 | `getSignedUrl()` | رابط مؤقت (5 دقائق) للعرض/التحميل |
| 2.6 | `downloadAttachment()` | تنزيل مباشر مع اسم الملف الأصلي |
| 2.7 | Validation | فحص نوع + حجم + عدد الملفات (max 10) + إجمالي (max 20MB) |

```typescript
// API المتوقع
interface AttachmentUploadParams {
  file: File;
  entityType: EntityType; // 'container' | 'purchase_invoice' | ...
  entityId: string;
  category?: string;       // 'contract' | 'bill_of_lading' | ...
  documentTitle?: string;   // اسم المستند (اختياري)
  documentNumber?: string;  // رقم المستند الأصلي (اختياري)
  documentDate?: string;    // تاريخ المستند (اختياري)
  notes?: string;           // ملاحظات (اختياري)
}

// الاستخدام
const result = await attachmentService.upload(params);
const files  = await attachmentService.getByEntity('container', containerId);
const url    = await attachmentService.getSignedUrl(documentId);
await attachmentService.delete(documentId);
```

**معايير القبول:**
- [ ] رفع ملف PDF/صورة وحفظه في Storage + جدول documents
- [ ] استرجاع المرفقات مع كل البيانات الوصفية
- [ ] حذف من Storage + DB معاً
- [ ] التحقق من الحدود (5MB, 10 ملفات, 20MB إجمالي)

---

##### الخطوة 3: مكون الرفع المحسّن (Upload Dialog) ⬜
> **المدة المقدرة:** 30 دقيقة | **ملف:** إعادة كتابة `DocumentAttachmentsTab.tsx`

| # | المهمة | التفاصيل |
|---|--------|----------|
| 3.1 | Upload Dialog جديد | Sheet/Dialog يظهر عند الرفع مع حقول إضافية |
| 3.2 | حقل اسم المستند | Input text — اختياري |
| 3.3 | حقل رقم المستند الأصلي | Input text — لرقم الفاتورة/العقد الأصلي |
| 3.4 | حقل تاريخ المستند | Date picker — تاريخ المستند الأصلي |
| 3.5 | حقل التصنيف | Select — محسّن مع أيقونات |
| 3.6 | حقل ملاحظات | Textarea — اختياري |
| 3.7 | Drag & Drop + Click | منطقة رفع محسّنة مع preview فوري |
| 3.8 | Progress bar | شريط تقدم حقيقي أثناء الرفع |

```
╔══════════════════════════════════════════════════════════╗
║  📎 رفع مرفق جديد                              [✕]    ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ┌──────────────────────────────────────────────┐        ║
║  │     📄 اسحب ملف هنا أو انقر للاختيار        │        ║
║  │     PDF, JPG, PNG • حد أقصى 5 MB             │        ║
║  └──────────────────────────────────────────────┘        ║
║                                                          ║
║  اسم المستند:  [_________________________]    (اختياري)  ║
║  التصنيف:      [▼ عقد / فاتورة / بوليصة...]             ║
║  رقم المستند:  [_________________________]    (اختياري)  ║
║  تاريخ المستند:[📅___/___/____]               (اختياري)  ║
║  ملاحظات:      [_________________________]    (اختياري)  ║
║                                                          ║
║                              [إلغاء]  [📤 رفع المرفق]   ║
╚══════════════════════════════════════════════════════════╝
```

**معايير القبول:**
- [ ] Dialog يظهر مع كل الحقول الاختيارية
- [ ] Preview فوري للملف المختار (صورة مصغرة أو أيقونة PDF)
- [ ] الرفع يحفظ في Storage + DB مع كل الحقول
- [ ] Toast نجاح + تحديث القائمة تلقائياً

---

##### الخطوة 4: أوضاع العرض الثلاثة ⬜
> **المدة المقدرة:** 45 دقيقة | **ملف:** ضمن `DocumentAttachmentsTab.tsx`

| # | وضع العرض | التفاصيل |
|---|-----------|----------|
| 4.1 | 📋 **جدول (Table)** | صفوف مع أعمدة: اسم + تصنيف + حجم + تاريخ رفع + تاريخ مستند + رقم مستند + إجراءات |
| 4.2 | 🃏 **بطاقات (Cards)** | كل ملف في بطاقة مع: thumbnail/أيقونة + اسم + تصنيف badge + حجم + أزرار إجراءات |
| 4.3 | 🖼️ **معرض (Gallery)** | شبكة مصغرات كبيرة — مثالي للصور — مع hover actions |
| 4.4 | Toggle buttons | أزرار تبديل بين الأوضاع الثلاثة (icons) |
| 4.5 | حفظ التفضيل | تذكر آخر وضع عرض اختاره المستخدم |

```
┌─[📋]─[🃏]─[🖼️]──── Toggle View ────────────────────────┐
│                                                           │
│  وضع الجدول:                                              │
│  ┌──────┬──────────┬───────┬──────┬──────┬──────┬─────┐   │
│  │ نوع  │ اسم      │ تصنيف │ حجم  │ تاريخ│ رقم  │ ⚙️  │   │
│  ├──────┼──────────┼───────┼──────┼──────┼──────┼─────┤   │
│  │ 📄   │ عقد..    │ عقد   │ 1.2M │ 2/18 │ C-01 │ 👁️⬇️🗑│   │
│  │ 🖼️   │ إيصال..  │ إيصال │ 0.8M │ 2/17 │      │ 👁️⬇️🗑│   │
│  └──────┴──────────┴───────┴──────┴──────┴──────┴─────┘   │
│                                                           │
│  وضع البطاقات:                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│  │  📄 PDF  │ │  🖼️ IMG │ │  📄 PDF  │                     │
│  │ عقد..   │ │ إيصال.. │ │ بوليصة  │                      │
│  │ 1.2 MB  │ │ 0.8 MB  │ │ 2.1 MB  │                     │
│  │ [👁️][⬇️] │ │ [👁️][⬇️] │ │ [👁️][⬇️] │                     │
│  └─────────┘ └─────────┘ └─────────┘                     │
│                                                           │
│  وضع المعرض:                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────────┐     │
│  │               │ │               │ │              │     │
│  │   [صورة       │ │   [صورة       │ │   📄 PDF     │     │
│  │    مصغرة]     │ │    مصغرة]     │ │   أيقونة    │     │
│  │               │ │               │ │              │     │
│  │  عقد توريد    │ │  إيصال دفع    │ │  بوليصة شحن │     │
│  └───────────────┘ └───────────────┘ └──────────────┘     │
└───────────────────────────────────────────────────────────┘
```

**معايير القبول:**
- [ ] 3 أوضاع عرض تعمل بسلاسة مع أنيميشن التبديل
- [ ] كل وضع يعرض كل بيانات المرفق (اسم, تصنيف, حجم, تواريخ, رقم)
- [ ] أزرار إجراءات في كل وضع (عرض, تحميل, حذف)
- [ ] Gallery يعرض thumbnails فعلية للصور

---

##### الخطوة 5: المستعرض الداخلي (Document Viewer) ⬜
> **المدة المقدرة:** 30 دقيقة | **ملف:** `src/components/shared/DocumentViewer.tsx`

| # | المهمة | التفاصيل |
|---|--------|----------|
| 5.1 | Modal كامل الشاشة | Overlay أسود شفاف مع المستند في المنتصف |
| 5.2 | عرض PDF | `<iframe>` أو `react-pdf` مع التنقل بين الصفحات |
| 5.3 | عرض صور | `<img>` مع object-fit + gestures |
| 5.4 | تكبير/تصغير (Zoom) | أزرار + / - / Reset + Mouse wheel zoom |
| 5.5 | التنقل بين المرفقات | أسهم ← → للتنقل بين ملفات نفس المستند |
| 5.6 | شريط معلومات | اسم الملف + حجم + تصنيف + تاريخ في أعلى المستعرض |
| 5.7 | زر تحميل | تنزيل مباشر من داخل المستعرض |
| 5.8 | إغلاق | زر X + مفتاح Escape + نقر خارج المستند |

```
╔══════════════════════════════════════════════════════════════╗
║  📄 عقد توريد أقمشة — C-2024-001          [⬇️] [✕]        ║
║  عقد • 1.2 MB • 18/02/2026                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║                    ┌──────────────────┐                      ║
║                    │                  │                      ║
║                    │                  │                      ║
║                    │    محتوى PDF     │                      ║
║                    │    أو صورة       │                      ║
║                    │                  │                      ║
║                    │                  │                      ║
║                    └──────────────────┘                      ║
║                                                              ║
║   [◀ السابق]     [🔍- 75% 🔍+]     [التالي ▶]              ║
╚══════════════════════════════════════════════════════════════╝
```

**معايير القبول:**
- [ ] PDF يعرض بشكل صحيح مع zoom عامل
- [ ] الصور تعرض مع تكبير/تصغير بالـ wheel + أزرار
- [ ] التنقل بين ملفات نفس المستند يعمل
- [ ] زر التحميل ينزّل الملف الأصلي
- [ ] Escape / X / نقر خارج = إغلاق

---

##### الخطوة 6: التكامل على مستوى النظام ⬜
> **المدة المقدرة:** 30 دقيقة | **ملفات:** TabContentRenderer + Sheet configs

| # | المهمة | التفاصيل |
|---|--------|----------|
| 6.1 | تكامل الكونتينرات | تبويب المرفقات يستخدم `attachmentService` + أوضاع العرض الجديدة |
| 6.2 | تكامل فواتير المشتريات | إضافة تبويب مرفقات في sheet فاتورة المشتريات |
| 6.3 | تكامل فواتير المبيعات | إضافة تبويب مرفقات في sheet فاتورة المبيعات |
| 6.4 | تكامل القيود المحاسبية | إضافة تبويب مرفقات في sheet القيد |
| 6.5 | تكامل الموردين/العملاء | إضافة تبويب مرفقات في sheet المورد/العميل |
| 6.6 | وثائق الشركة | قسم مرفقات في إعدادات الشركة (CompanyProfileTab) |
| 6.7 | تحديث `TabContentRenderer` | component واحد `<UnifiedAttachmentsTab>` يعمل مع أي entity |

**معايير القبول:**
- [ ] كل الكيانات أعلاه فيها تبويب مرفقات يعمل
- [ ] الرفع والعرض والتحميل والحذف يعمل من كل مكان
- [ ] لا duplicated code — خدمة واحدة + مكون واحد

---

#### ⏱️ ملخص الجهد المطلوب

| الخطوة | المدة | الاعتماديات |
|--------|-------|-------------|
| 1. Backend (SQL) | 15 دقيقة | — |
| 2. Service Layer | 30 دقيقة | خطوة 1 |
| 3. Upload Dialog | 30 دقيقة | خطوة 2 |
| 4. أوضاع العرض | 45 دقيقة | خطوة 2 |
| 5. Document Viewer | 30 دقيقة | خطوة 2 |
| 6. التكامل الشامل | 30 دقيقة | خطوات 3-5 |
| **المجموع** | **~3 ساعات** | |

---

### �📌 ملاحظات مهمة

> **الضريبة:**
> - تُسجّل كـ "ضريبة مدخلات" (مدين 1160) — سطر واحد = مجموع ضرائب الدفعة
> - دفع الضريبة = قيد منفصل من الخزينة
> - تسوية نهاية الفترة: 1160 ↔ 2141

> **الشجرة المحاسبية (للمشتركين الجدد):**
> - **1160** ضريبة مدخلات
> - **2113** مقدمو خدمات الشحن والتوريد (5 مجموعات فرعية + حسابات تفصيلية)
> - **5800** مصاريف المشتريات: شحن (5810) + جمارك (5820) + تأمين (5830) + أخرى (5840)


---

## 📦 القسم الجديد: تحديث المخزون المباشر + التعديل المباشر + سجل النشاط

> **المرجع الكامل:** `.agent/artifacts/in_place_edit_standard.md`
> **تاريخ الإضافة:** 2026-02-18
> **الحالة:** 🔄 قيد التنفيذ

---

### 📋 ملخص الفكرة

| المعيار | الوصف |
|---------|-------|
| **تحديث المخزون المباشر** | عند ترحيل فاتورة POS أو مشتريات محلية → تحديث المخزون تلقائياً بدون إذن استلام/تسليم منفصل |
| **التعديل المباشر (In-Place Edit)** | عند تعديل مستند مرحّل → تعديل القيد الأصلي بنفسه + نفس التاريخ (لا قيد عكسي + جديد) |
| **سجل النشاط (Activity Log)** | تسجيل كل حدث مهم في دورة حياة المستند (إنشاء، تأكيد، ترحيل، تعديل، طباعة، دفع...) |

---

### 🔧 المرحلة A: تحديث المخزون المباشر (Direct Stock Update)

#### ✅ الخطوة A-1: أعمدة قاعدة البيانات — مكتملة
> تمت إضافة `auto_update_stock`, `stock_warehouse_id`, `stock_movement_id` في migration سابق

| # | المهمة | الحالة |
|---|--------|--------|
| A-1.1 | إضافة أعمدة `auto_update_stock`, `stock_warehouse_id`, `stock_movement_id` لـ `purchase_transactions` | ✅ |
| A-1.2 | إضافة أعمدة `auto_update_stock`, `stock_warehouse_id`, `stock_movement_id` لـ `sales_transactions` | ✅ |

#### ✅ الخطوة A-2: واجهة المستخدم — مكتملة

| # | المهمة | الحالة |
|---|--------|--------|
| A-2.1 | Checkbox "تحديث المخزون مباشرة" في `TradeHeader.tsx` | ✅ |
| A-2.2 | Toggle "نقطة بيع / سير عمل" للمبيعات في `TradeHeader.tsx` | ✅ |
| A-2.3 | POS يفعّل `auto_update_stock` تلقائياً | ✅ |
| A-2.4 | إزالة dropdown المستودع المكرر + إضافة ملاحظة | ✅ |
| A-2.5 | حفظ/تحميل تفضيلات المستخدم في `TradeMainTab.tsx` | ✅ |

#### ✅ الخطوة A-3: خدمة تحديث المخزون — مكتملة

| # | المهمة | الملف | الحالة |
|---|--------|-------|--------|
| A-3.1 | إنشاء `directStockUpdateService.ts` (خدمة موحدة للمشتريات+المبيعات) | `src/services/directStockUpdateService.ts` | ✅ |
| A-3.2 | دعم المشتريات: زيادة المخزون + متوسط مرجح | `directStockUpdateService.ts` | ✅ |
| A-3.3 | دعم المبيعات: نقص المخزون + فحص الكمية | `directStockUpdateService.ts` | ✅ |
| A-3.4 | دالة العكس `reverseDirectStockUpdate` | `directStockUpdateService.ts` | ✅ |
| A-3.5 | دمج مع `purchaseAccountingService` — ترحيل | `purchaseAccountingService.ts` | ✅ |
| A-3.6 | دمج مع `purchaseAccountingService` — إلغاء ترحيل + عكس مخزون | `purchaseAccountingService.ts` | ✅ |
| A-3.7 | دمج مع `salesAccountingService` — ترحيل | ⏳ لا يوجد service بعد |
| A-3.8 | دمج مع `salesAccountingService` — إلغاء ترحيل + عكس مخزون | ⏳ لا يوجد service بعد |

---

### 🔧 المرحلة B: البنية التحتية — سجل التعديلات + النشاط

#### ✅ الخطوة B-1: SQL Migration — مكتملة

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| B-1.1 | إضافة `edit_history` JSONB | للجداول: `purchase_transactions`, `sales_transactions`, `journal_entries` | ✅ |
| B-1.2 | إضافة `activity_log` JSONB | نفس الجداول أعلاه | ✅ |
| B-1.3 | إضافة `last_edited_at`, `last_edited_by`, `edit_count` | نفس الجداول أعلاه | ✅ |
| B-1.4 | تنفيذ Migration | `20260218_edit_history_activity_log.sql` | ✅ تم التنفيذ |

> **ملاحظة:** ملف Migration جاهز: `supabase/migrations/20260218_edit_history_activity_log.sql`

#### ⬜ الخطوة B-2: خدمة سجل النشاط

> ⚠️ **يوجد حالياً**: `systemService.ts` → `getAuditLogs()` يستخدم جدول `audit_logs` المستقل
> **الجديد**: خدمة `activityLogService.ts` تُسجّل الأحداث في حقل `activity_log` JSONB على المستند نفسه (سجل مضمّن — لا جدول منفصل)
> **العلاقة**: النظامان متكاملان — `audit_logs` لسجل الأمان العام، `activity_log` لسجل دورة حياة المستند

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| B-2.1 | إنشاء `activityLogService.ts` | خدمة `logEvent`, `logEdit`, `getLog` | ✅ أُنشئت |
| B-2.2 | أنواع الأحداث: `created`, `confirmed`, `posted`, `edited`, `printed`, `paid`, `cancelled`... | 14 نوع | ✅ معرّفة |
| B-2.3 | هيكل JSONB: `{ event, at, by, by_name, details }` | | ✅ |

---

### 🔧 المرحلة C: دمج سجل النشاط في الخدمات الحالية

> تسجيل الأحداث تلقائياً في نقاط الاتصال الموجودة

#### ✅ الخطوة C-1: المشتريات — مكتملة

| # | المهمة | أين يُضاف | الحالة |
|---|--------|----------|--------|
| C-1.1 | تسجيل `created` | `purchaseTransactionService.create()` | ✅ |
| C-1.2 | تسجيل `confirmed` / `received` / `cancelled` | `purchaseTransactionService.advanceStage()` | ✅ |
| C-1.3 | تسجيل `posted` | يتم عبر `advanceStage` | ✅ |
| C-1.4 | تسجيل `stock_updated` | سيتم لاحقاً مع In-Place Edit | ⏳ |
| C-1.5 | تسجيل `unposted` | سيتم لاحقاً مع In-Place Edit | ⏳ |
| C-1.6 | تسجيل `printed` | `purchaseTransactionService.recordPrint()` | ✅ |

#### ✅ الخطوة C-2: المبيعات — مكتملة

| # | المهمة | أين يُضاف | الحالة |
|---|--------|----------|--------|
| C-2.1 | تسجيل `created` | `salesTransactionService.create()` | ✅ |
| C-2.2 | تسجيل `confirmed` / `delivered` / `cancelled` | `salesTransactionService.advanceStage()` | ✅ |
| C-2.3 | تسجيل `printed` | `salesTransactionService.recordPrint()` | ✅ |

#### ✅ الخطوة C-3: القيود المحاسبية — مكتملة

| # | المهمة | أين يُضاف | الحالة |
|---|--------|----------|--------|
| C-3.1 | تسجيل `created` | `journalEntriesService.create()` | ✅ |
| C-3.2 | تسجيل `posted` | `journalEntriesService.post()` | ✅ |
| C-3.3 | تسجيل `unposted` | `journalEntriesService.unpost()` | ✅ |

#### ✅ الخطوة C-4: الكونتينرات — مكتملة

| # | المهمة | أين يُضاف | الحالة |
|---|--------|----------|--------|
| C-4.1 | إضافة `activity_log` + `edit_history` للجدول | SQL Migration | ✅ |
| C-4.2 | تسجيل `created` | `containersService.createContainer()` | ✅ |
| C-4.3 | تسجيل تغيير الحالة | `containersService.updateContainer()` | ✅ |


---

### 🔧 المرحلة D: التعديل المباشر (In-Place Edit)

#### ✅ الخطوة D-1: خدمة التعديل المباشر — مكتملة

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| D-1.1 | إنشاء `inPlaceEditService.ts` | واجهة موحدة لكل أنواع التعديل | ✅ |
| D-1.2 | فحص الأهلية (`checkEditEligibility`) | يحدد وضع التعديل: full / price_only / journal | ✅ |
| D-1.3 | تعديل Header الفاتورة (`editTransactionHeader`) | تعديل ملاحظات + تاريخ + شروط | ✅ |
| D-1.4 | تعديل البنود (`editTransactionItems`) | POS: شامل / Workflow: سعر فقط | ✅ |
| D-1.5 | تعديل القيود اليدوية (`editJournalEntry`) | مع فحص التوازن | ✅ |
| D-1.6 | `getEditHistory` + `isEdited` | لعرض السجل والبادج | ✅ |

#### ⬜ الخطوة D-2: تعديل POS (شامل)

```
POS مرحّلة → تعديل كمية + سعر + أصناف → حفظ →
  ① حساب فرق الكميات
  ② تحديث المخزون بالفرق فقط
  ③ إعادة حساب متوسط التكلفة
  ④ تعديل بنود القيد المحاسبي (نفس JE ID)
  ⑤ تسجيل في edit_history + activity_log
```

| # | المهمة | الحالة |
|---|--------|--------|
| D-2.1 | حساب فرق الكميات والأسعار | ⬜ |
| D-2.2 | تعديل المخزون بالفرق (لا عكس كامل) | ⬜ |
| D-2.3 | تعديل بنود القيد المحاسبي مباشرة | ⬜ |
| D-2.4 | تسجيل edit_history + activity_log | ⬜ |

#### ⬜ الخطوة D-3: تعديل Workflow مُسلّمة/مُستلمة (سعر فقط)

```
Workflow مُسلّمة → تعديل السعر فقط → حفظ →
  ① تحديث السعر في البنود
  ② إعادة حساب المبالغ (مجموع + ضريبة + إجمالي)
  ③ تعديل القيد المحاسبي (فرق المبلغ)
  ④ تحديث متوسط التكلفة (مشتريات فقط)
  ⑤ تسجيل في edit_history + activity_log
```

| # | المهمة | الحالة |
|---|--------|--------|
| D-3.1 | قفل حقول الكمية والأصناف في الواجهة | ⬜ |
| D-3.2 | تعديل بنود القيد المحاسبي (فرق السعر) | ⬜ |
| D-3.3 | تحديث متوسط التكلفة (مشتريات) | ⬜ |
| D-3.4 | تسجيل edit_history + activity_log | ⬜ |

#### ⬜ الخطوة D-4: تعديل القيود اليدوية

| # | المهمة | الحالة |
|---|--------|--------|
| D-4.1 | تعديل بنود القيد مباشرة (حسابات + مبالغ) | ⬜ |
| D-4.2 | التحقق من التوازن (مدين = دائن) | ⬜ |
| D-4.3 | إضافة "⚡ معدّل" في الوصف + تاريخ التعديل | ⬜ |
| D-4.4 | تسجيل edit_history + activity_log | ⬜ |

---

### 🔧 المرحلة E: واجهة Timeline (سجل النشاط)

#### ✅ الخطوة E-1: عنصر العرض — مكتملة

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| E-1.1 | إنشاء `ActivityTimeline.tsx` | عنصر يعرض سجل النشاط كـ Timeline عمودي | ✅ |
| E-1.2 | عرض الأيقونة + اللون + الوصف + التاريخ + اسم المستخدم | لكل حدث (14 نوع) | ✅ |
| E-1.3 | عرض تفاصيل التعديل (القيم القديمة → الجديدة) | عند حدث `edited` | ✅ |
| E-1.4 | دعم العربية والإنجليزية | تنسيق التاريخ + Labels + RTL | ✅ |
| E-1.5 | وضع مختصر (compact) | آخر N أحداث فقط | ✅ |

#### ✅ الخطوة E-2: الدمج في الشاشات — مكتملة

> **نهج موحد**: تم دمج `ActivityTimeline` مباشرة في `ActivityTabV2` الذي يخدم جميع الشاشات عبر `UnifiedAccountingSheet`.
> - فلتر "دورة الحياة" (Lifecycle): يعرض Timeline كاملاً من `activity_log` JSONB
> - فلتر "الكل" (All): يعرض ملخص مختصر (آخر 4 أحداث) + الملاحظات اليدوية

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| E-2.1 | دمج في sheet المشتريات | عبر ActivityTabV2 الموحد | ✅ |
| E-2.2 | دمج في sheet المبيعات | عبر ActivityTabV2 الموحد | ✅ |
| E-2.3 | دمج في sheet القيد المحاسبي | عبر ActivityTabV2 الموحد | ✅ |
| E-2.4 | دمج في sheet الكونتينر | عبر ActivityTabV2 الموحد | ✅ |

---

### 🔧 المرحلة F: الصلاحيات

| # | المهمة | التفاصيل | الحالة |
|---|--------|----------|--------|
| F-1 | إضافة `can_edit_posted_purchase` | صلاحية تعديل مشتريات مرحّلة | ⬜ |
| F-2 | إضافة `can_edit_posted_sales` | صلاحية تعديل مبيعات مرحّلة | ⬜ |
| F-3 | إضافة `can_edit_posted_journal` | صلاحية تعديل قيود مرحّلة | ⬜ |
| F-4 | إضافة `can_edit_closed_period` | تعديل في فترات مقفلة (مدير فقط) | ⬜ |
| F-5 | فحص الصلاحيات في الواجهة | إخفاء/تعطيل زر التعديل | ⬜ |
| F-6 | فحص الصلاحيات في الخدمات | رفض الطلب إذا لا صلاحية | ⬜ |

---

### 📊 مصفوفة التعديل الشاملة (مرجع سريع)

| المستند | المرحلة | الكمية | السعر | الأصناف | القيد | المخزون |
|---------|---------|--------|-------|---------|-------|---------|
| POS | مرحّلة | ✅ | ✅ | ✅ | يُعدّل | يُعدّل الفرق |
| مشتريات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مشتريات Workflow | مُستلمة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مشتريات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | تكلفة فقط |
| مبيعات Workflow | مسودة/مؤكدة | ✅ | ✅ | ✅ | — | — |
| مبيعات Workflow | مُسلّمة | ❌ | ✅ | ❌ | يُعدّل | — |
| مبيعات Workflow | مرحّلة | ❌ | ✅ | ❌ | يُعدّل | — |
| قيد يدوي | مرحّل | — | — | — | يُعدّل مباشرة | — |

---

### ⏱️ ملخص الجهد المقدر

| المرحلة | المدة | الاعتماديات |
|---------|-------|-------------|
| A: تحديث المخزون المباشر | ✅ مكتمل | — |
| B: البنية التحتية (Migration + Services) | 30 دقيقة | — |
| C: دمج سجل النشاط | 45 دقيقة | B |
| D: التعديل المباشر (In-Place Edit) | 2 ساعة | B + C |
| E: واجهة Timeline | 45 دقيقة | B |
| F: الصلاحيات | 30 دقيقة | D |
| **المجموع** | **~5 ساعات** | |

---

### 📌 ملاحظات مهمة

> **العلاقة بين `activity_log` و `audit_logs`:**
> - `activity_log` (JSONB على المستند) = **سجل دورة الحياة** — يُعرض للمستخدم كـ Timeline
> - `audit_logs` (جدول `systemService.ts`) = **سجل الأمان** — للمراقبة والتدقيق الداخلي
> - النظامان **متكاملان** ولا يتعارضان

> **التوثيق في الدستور:**
> - القانون 20 — **In-Place Edit Law** — تم إضافته رسمياً للدستور
> - المرجع الكامل: `.agent/artifacts/in_place_edit_standard.md`

---

## 📊 تقرير حالة Phase 6B (تاريخ المراجعة: 2026-02-18 — مُحدّث)

### ✅ المراحل المكتملة

| المرحلة | الوصف | الحالة | ملاحظات |
|---------|-------|--------|---------|
| **0 (التوحيد)** | توحيد shipments → containers + أرشفة | ✅ مكتمل | 2026-02-18 |
| **6B-1** | DB Migration: أعمدة المصاريف | ✅ مكتمل | — |
| **6B-2** | الخدمات الخلفية — المصاريف بطبقتين | ✅ مكتمل | — |
| **6B-3** | واجهة المصاريف التقديرية | ✅ مكتمل | — |
| **6B-4** | المصاريف الحقيقية + قيد فوري + ضريبة مدخلات | ✅ مكتمل | حقول `tax_rate`, `tax_amount`, `amount_before_tax` + قيد 1160 |
| **6B-5 (مزامنة)** | مزامنة التكاليف مع البنود | ✅ مكتمل | calculateLandedCost يستخدم amount_before_tax |
| **6B-5 (مرفقات)** | نظام المرفقات الموحد | ✅ مكتمل | `attachmentService.ts` (884 سطر) + `DocumentAttachmentsTab.tsx` (830 سطر) + Supabase Storage + Google Drive |
| **A (المخزون)** | تحديث المخزون المباشر (A-1 → A-3.6) | ✅ مكتمل | directStockUpdateService + دمج مع purchaseAccountingService |
| **B (البنية التحتية)** | Migration + activityLogService + editFlowService | ✅ مكتمل | `20260218_edit_history_activity_log.sql` + 3 خدمات |
| **C (دمج النشاط)** | تسجيل الأحداث في 4 خدمات | ✅ مكتمل | purchases + sales + journal + containers |
| **D-1** | خدمة التعديل المباشر (inPlaceEditService) | ✅ مكتمل | 768 سطر — checkEditEligibility + editHeader + editItems + editJournal |
| **D-2** | تعديل POS (شامل: كمية + سعر + أصناف) | ✅ مكتمل (Backend) | `editMode: 'full'` — إضافة/تعديل/حذف بنود + إعادة حساب الإجماليات |
| **D-3** | تعديل Workflow (سعر فقط) | ✅ مكتمل (Backend) | `editMode: 'price_only'` — فقط unit_price + إعادة حساب |
| **D-4** | تعديل القيود اليدوية | ✅ مكتمل (Backend) | `editJournalEntry()` — تعديل البنود مع فحص التوازن |
| **E (Timeline)** | عنصر ActivityTimeline + دمج في ActivityTabV2 | ✅ مكتمل | فلتر lifecycle + عرض مختصر |

### ⬜ المراحل المتبقية

| المرحلة | الوصف | الحالة | ملاحظات |
|---------|-------|--------|---------|
| **D-2/3/4 (واجهة)** | ربط واجهة التعديل (أزرار + validation + حوارات) | ⬜ | Backend جاهز — الواجهة لم تُربط بعد |
| **D-2 (مخزون)** | تعديل المخزون بالفرق عند تعديل POS | ⬜ | `stockUpdated: false` — يحتاج حساب فرق الكميات |
| **D-2/3 (قيد)** | تعديل القيد المحاسبي المرتبط بالفاتورة | ⬜ | `journalEntryUpdated: false` — يحتاج تعديل القيد المرتبط |
| **A-3.7/A-3.8** | دمج المخزون المباشر مع المبيعات | ⚠️ جزئي | `postSalesInvoice` يعمل عبر RPC — لكن لا يستدعي `directStockUpdateService` |
| **6B-4b** | ضريبة المشتريات الدولية (توزيع + تسجيل customs_vat) | ⬜ **لم يُنفّذ** | الحقول موجودة — لكن التوزيع والتسجيل المحاسبي للضريبة الدولية لم يُنفّذ |
| **F** | الصلاحيات الخاصة (special_permissions) | ⬜ → **خطة مستقلة** | `.agent/artifacts/rbac_master_plan.md` |

### 📈 نسبة الإكمال

```
المراحل المكتملة (Backend):  15 من 21 = ~71%
المراحل المتبقية:              6 من 21

تصنيف المتبقي:
├── 🔴 R-1→R-7: الصلاحيات الشاملة → خطة مستقلة: .agent/artifacts/rbac_master_plan.md
├── � D-2/3/4 (واجهة): ربط أزرار التعديل في UnifiedAccountingSheet
├── 🟡 D-2 (مخزون+قيد): تعديل المخزون والقيد بالفرق عند تعديل POS
├── 🟡 A-3.7/A-3.8: دمج directStockUpdate مع ترحيل المبيعات
└── � 6B-4b: ضريبة المشتريات الدولية — التوزيع والتسجيل
```

### 🔗 ملفات مرتبطة

| الملف | الوصف |
|-------|-------|
| `.agent/artifacts/rbac_master_plan.md` | ⭐ خطة الصلاحيات الشاملة المستقلة (7 مراحل) |
| `.agent/artifacts/permissions_study.md` | دراسة نظام الصلاحيات الحالي + المقترحات |
| `.agent/artifacts/in_place_edit_standard.md` | معيار التعديل المباشر |
| `src/services/inPlaceEditService.ts` | خدمة التعديل المباشر (768 سطر) — Backend جاهز |
| `src/services/editFlowService.ts` | خدمة سير التعديل — فحص الأهلية وإعدادات المحاسبة (351 سطر) |
| `src/services/attachmentService.ts` | خدمة المرفقات الموحدة (884 سطر) |
| `src/hooks/useEditFlow.ts` | Hook واجهة التعديل (264 سطر) — غير مُستخدم في الشاشات بعد |


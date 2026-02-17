# خطة التنفيذ: المرحلة 6B + المرحلة 7 (محدثة مع التوحيد)

تاريخ التحديث: 2026-02-17 | الحالة: معتمدة — جاهزة للتنفيذ
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

## 📊 تحديث التقدم — 2026-02-17 (v2)

### ✅ ما أُنجز في القسم 6B-4

| # | البند | الحالة | الملف |
|---|-------|--------|-------|
| 1 | أعمدة DB (ضريبة + حسابات + ترحيل) | ✅ | Migration SQL |
| 2 | تبسيط النموذج → **حساب واحد** بدل اثنين | ✅ | `ContainerExpensesTab.tsx` |
| 3 | إصلاح SmartAccountSelector — سكرول + إخفاء المجموعات | ✅ | `SmartAccountSelector.tsx` |
| 4 | الشجرة الافتراضية: مصاريف المشتريات (5800) + ضريبة مدخلات (1160) | ✅ | `create_default_chart_of_accounts.sql` |
| 5 | المصاريف التقديرية مغلقة بشكل افتراضي | ✅ | `ContainerExpensesTab.tsx` |

### 🔄 تغيير التصميم — نظام دفعات المصاريف (Batch Expenses)

> **القرار:** المصاريف الفعلية تعمل كـ **نظام فواتير/دفعات**:
> - إضافة **واحد أو أكثر** من المصاريف في نفس الجلسة (قائمة مؤقتة - state)
> - عند الحفظ → **قيد محاسبي واحد** يشمل كل مصاريف الدفعة
> - في جلسة لاحقة → **قيد جديد** مستقل
> - كل دفعة تُعرض كبطاقة مع تفاصيل القيد

```
┌────────────────────────────────────────────────────────┐
│ دفعة 1 (JE-0042) — 2026-02-17                         │
│  مايرسك — شحن بحري           $3,000                    │
│  وكيل جمركي                  $500                      │
│  تأمين بحري                   $200                      │
│                          الإجمالي: $3,700               │
├────────────────────────────────────────────────────────┤
│ دفعة 2 (JE-0058) — 2026-02-24                         │
│  رسوم جمركية                 $1,200                    │
│  رسوم ميناء                   $150                      │
│                          الإجمالي: $1,350               │
└────────────────────────────────────────────────────────┘
```

**القيد الموحّد لكل دفعة:**
```
مدين  5811  مايرسك — شحن بحري        $3,000
مدين  1160  ضريبة مدخلات (إن وجدت)    $450
مدين  5821  وكيل جمركي                $500
مدين  5831  تأمين بحري                 $200
  دائن  حساب الكونتينر               $4,150
```

### 🔲 مراحل التنفيذ الجديدة

| المرحلة | الوصف | الحالة |
|---------|-------|--------|
| **M1** | إصلاح خطأ `currency` + القائمة المؤقتة (إضافة/حذف محلي) | 🔄 **الآن** |
| **M2** | الحفظ الجماعي + القيد الموحّد | بعد M1 |
| **M3** | عرض الدفعات المحفوظة كبطاقات منطوية | بعد M2 |
| **M4** | تعديل/حذف الدفعات + عكس القيود | لاحقاً |

#### M1: القائمة المؤقتة (الآن)
1. ✅ ~~إصلاح خطأ `currency` → `currency_code`~~
2. 🔲 تعديل `newActual` لاستخدام `currency_code`
3. 🔲 إضافة `pendingExpenses[]` — قائمة مؤقتة (state فقط)
4. 🔲 زر "إضافة" → يضيف سطر للقائمة (لا يحفظ في DB)
5. 🔲 عرض القائمة المؤقتة بجدول + ❌ حذف لكل سطر
6. � عرض إجمالي الدفعة

#### M2: الحفظ الجماعي
1. 🔲 زر "💾 حفظ وترحيل الدفعة" → bulk insert + قيد واحد
2. 🔲 ربط `journal_entry_id` بكل مصاريف الدفعة
3. 🔲 تصفير القائمة المعلقة بعد الحفظ

#### M3: عرض الدفعات
1. 🔲 تجميع المصاريف حسب `journal_entry_id`
2. 🔲 عرض كل دفعة كبطاقة منطوية (رقم القيد + التاريخ + الإجمالي)
3. 🔲 زر عرض تفاصيل القيد

#### M4: تعديل/حذف
1. � حذف دفعة = عكس القيد + حذف المصاريف
2. 🔲 تعديل دفعة = عكس القيد القديم + قيد جديد

### 📌 ملاحظات مهمة

> **الضريبة:**
> - تُسجّل كـ "ضريبة مدخلات" (مدين 1160) — سطر واحد = مجموع ضرائب الدفعة
> - دفع الضريبة = قيد منفصل من الخزينة
> - تسوية نهاية الفترة: 1160 ↔ 2141

> **الشجرة المحاسبية (للمشتركين الجدد):**
> - **1160** ضريبة مدخلات
> - **5800** مصاريف المشتريات: شحن (5810) + جمارك (5820) + تأمين (5830) + أخرى (5840)

> **خطأ يجب إصلاحه أولاً:**
> - الكود يرسل `currency` بينما الجدول يحتوي فقط على `currency_code`
> - الحل: استبدال كل `currency` بـ `currency_code` في `expenseData`


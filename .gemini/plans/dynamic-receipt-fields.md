# 🎯 خطة حقول الاستلام الديناميكية — Dynamic Receipt Fields

> **تاريخ:** 2026-02-19  
> **الهدف:** جعل حقول الاستلام ديناميكية تتكيف مع محتوى المستند المصدر  
> **المبدأ:** الحقول الإضافية (اللون/الرسمة) تأتي من المستند المصدر حصراً

---

## 📊 تحليل الوضع الحالي

### البيانات الفعلية في قاعدة البيانات

| الجدول | حالة اللون | حالة الرسمة/التصميم | ملاحظات |
|--------|-----------|-------------------|---------|
| `container_items` | ✅ `color_id` + `color_name` | ❌ غير موجود | بند واحد حالياً بدون لون |
| `purchase_transaction_items` (أرشيف) | ✅ `color_id` + `color_name` | ❌ غير موجود | بعض البنود لها ألوان فعلية |
| `purchase_invoice_items` (جديد) | ❌ غير موجود | ❌ غير موجود | فارغ — لا بيانات بعد |
| `purchase_order_items` | ❌ غير موجود | ❌ غير موجود | — |
| `purchase_receipt_items` | ❌ غير موجود | ❌ غير موجود | بند الاستلام لا يحفظ اللون |
| `fabric_rolls` | ✅ `color_id` | ❌ غير موجود | الرول يحفظ اللون |
| `inventory_movements` | ❌ غير موجود | ❌ غير موجود | — |
| `inventory_stock` | ❌ غير موجود | ❌ غير موجود | — |
| `fabric_colors` | ✅ 10 ألوان مُعرّفة | — | جدول مرجعي عام |
| `fabric_designs` | — | ❌ الجدول غير موجود | يحتاج إنشاء لاحقاً |

### بيانات تجريبية فعلية (purchase_transaction_items)

```
✅ مع لون:   قطن سادة 100% — بني    (color_id: 1cdc8eae)  → 200 متر
✅ مع لون:   حرير طبيعي — زيتي      (color_id: 09756c8c)  → 100 متر  
✅ مع لون:   قطني حموي ملون — أحمر   (color_id: f065f1cc)  → 40 متر
❌ بدون لون:  قطن تويل 100%                               → 200 متر
❌ بدون لون:  حموي ملون                                    → 500 متر
```

### الواجهة الحالية (GoodsReceiptItemsTab)

```
الحالي — حقول ثابتة:
┌──────────┬────────┬──────────┬────────┐
│  المادة  │  اللون │ الطول(م) │ الجودة │  ← دائماً 4 حقول
│ dropdown │ نص حر  │  رقم    │dropdown│
└──────────┴────────┴──────────┴────────┘
  ↑ يدوي    ↑ يدوي    ↑ يدوي    ↑ يدوي
  
المشاكل:
1. اللون حقل نص حر — لا يأخذ من المستند المصدر
2. لا يوجد حقل رسمة/تصميم
3. الحقول ثابتة دائماً — حتى للمواد بدون ألوان
4. عند اختيار بند المستند → فقط المادة تُملأ، اللون لا يُملأ
```

---

## 🎨 التصميم المستهدف

### المبدأ الأساسي: "البنود تقود الحقول"

```
المقترح — حقول ديناميكية:

عند اختيار بند من المستند المصدر:

السيناريو A: بند مع لون
┌──────────────┬──────────────┬──────────┬────────┐
│ قطن سادة 100%│  🟤 بني      │ الطول(م) │ الجودة │
│  (مُعبَّأ)   │ (مُعبَّأ)   │  رقم    │dropdown│
└──────────────┴──────────────┴──────────┴────────┘

السيناريو B: بند بدون لون  
┌──────────────┬──────────┬────────┐
│  قطن تويل    │ الطول(م) │ الجودة │  ← حقل اللون مخفي
│  (مُعبَّأ)   │  رقم    │dropdown│
└──────────────┴──────────┴────────┘

السيناريو C: بند مع لون + رسمة (مستقبلي)
┌──────────────┬──────────────┬──────────────┬──────────┬────────┐
│ قطن مطبوع    │ 🌹 ورود      │  🔴 أحمر     │ الطول(م) │ الجودة │
│  (مُعبَّأ)   │ (مُعبَّأ)   │ (مُعبَّأ)    │  رقم    │dropdown│
└──────────────┴──────────────┴──────────────┴──────────┴────────┘

الحقول التي تظهر/تختفي:
  - المادة    → دائماً ظاهرة  (auto-fill من المستند)
  - اللون     → يظهر فقط إذا البند لديه color_id أو color_name
  - الرسمة    → يظهر فقط إذا البند لديه design_id أو design_name (مستقبلي)
  - الطول     → دائماً ظاهر
  - الجودة    → دائماً ظاهر
```

---

## 📋 مراحل التنفيذ

### المرحلة 1: قاعدة البيانات — إضافة الأعمدة الناقصة
> **ملف:** `supabase/migrations/20260219_dynamic_receipt_colors.sql`

#### 1.1 إضافة `color_id` + `color_name` للجداول الناقصة

```sql
-- purchase_invoice_items — فواتير الشراء الجديدة
ALTER TABLE purchase_invoice_items 
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES fabric_colors(id),
  ADD COLUMN IF NOT EXISTS color_name text;

-- purchase_order_items — أوامر الشراء
ALTER TABLE purchase_order_items 
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES fabric_colors(id),
  ADD COLUMN IF NOT EXISTS color_name text;

-- purchase_receipt_items — بنود الاستلام
ALTER TABLE purchase_receipt_items 
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES fabric_colors(id),
  ADD COLUMN IF NOT EXISTS color_name text;

-- inventory_movements — حركات المخزون  
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES fabric_colors(id),
  ADD COLUMN IF NOT EXISTS color_name text;

-- inventory_stock — أرصدة المخزون (للتتبع بالألوان)
ALTER TABLE inventory_stock 
  ADD COLUMN IF NOT EXISTS color_id uuid REFERENCES fabric_colors(id);
```

#### 1.2 (مؤجّل) إنشاء جدول `fabric_designs` للرسمات
```sql
-- سيُنشأ لاحقاً عند الحاجة  
-- CREATE TABLE fabric_designs (...)
```

---

### المرحلة 2: تحديث `SourceDocumentItem` — إضافة حقول اللون
> **ملف:** `src/features/warehouse/hooks/useReceiptSources.ts`

#### 2.1 تحديث الـ interface

```typescript
export interface SourceDocumentItem {
    id: string;
    material_id?: string;
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    total: number;
    unit?: string;
    notes?: string;
    received_quantity?: number;
    // ─── حقول ديناميكية جديدة ───
    color_id?: string;       // معرف اللون
    color_name?: string;     // اسم اللون
    // design_id?: string;   // مستقبلي: معرف الرسمة
    // design_name?: string; // مستقبلي: اسم الرسمة
}
```

#### 2.2 تحديث `mapItems` لتمرير اللون

```typescript
const mapItems = (raw: any[], fkField: string, parentId: string): SourceDocumentItem[] =>
    raw.filter((i: any) => i[fkField] === parentId).map((i: any) => ({
        // ... الحقول الحالية ...
        color_id: i.color_id || null,
        color_name: i.color_name || null,
        // design_id: i.design_id || null,    // مستقبلي
        // design_name: i.design_name || null, // مستقبلي
    }));
```

---

### المرحلة 3: تحديث واجهة الاستلام — حقول ديناميكية
> **ملف:** `src/features/warehouse/components/tabs/GoodsReceiptItemsTab.tsx`

#### 3.1 تحديث `SourceDocumentItem` interface (محلي)

إضافة `color_id` و `color_name` لمطابقة الـ hook.

#### 3.2 تحديث `handleSelectSourceItem` — تعبئة اللون تلقائياً

```typescript
const handleSelectSourceItem = useCallback((si: SourceDocumentItem) => {
    setSelectedSourceItemId(si.id);
    if (si.material_id) setMaterialId(si.material_id);
    // ─── ديناميكي: تعبئة اللون من المستند المصدر ───
    if (si.color_name) setColorName(si.color_name);
    else if (si.color_id) {
        // جلب اسم اللون من fabric_colors إذا لزم
        // أو نستخدم color_id مباشرة
    } else {
        setColorName(''); // لا لون → نمسح الحقل
    }
    setTimeout(() => rollLengthInputRef.current?.focus(), 150);
}, []);
```

#### 3.3 إخفاء/إظهار حقل اللون ديناميكياً

```tsx
// حساب: هل البند المختار يحتاج حقل لون؟
const selectedSourceItem = sourceItems.find(s => s.id === selectedSourceItemId);
const showColorField = !selectedSourceItemId // إدخال يدوي → نظهر اللون دائماً
    || selectedSourceItem?.color_id 
    || selectedSourceItem?.color_name;

// في الـ JSX:
{showColorField && (
    <div className="w-[110px] space-y-1.5">
        <Label>اللون</Label>
        <Input value={colorName} onChange={...} 
               readOnly={!!selectedSourceItem?.color_name} />
    </div>
)}
```

#### 3.4 عرض اللون في جدول بنود المستند المصدر

```tsx
// إضافة عمود "اللون" في جدول بنود المستند المصدر
<th>المادة</th>
<th>اللون</th>       <!-- جديد -->
<th>الكمية المطلوبة</th>
...
<td>{si.color_name || '—'}</td>  <!-- جديد -->
```

---

### المرحلة 4: تحديث `receiptCompletionService` — حفظ اللون
> **ملف:** `src/features/warehouse/services/receiptCompletionService.ts`

#### 4.1 تمرير `color_id` و `color_name` عند إنشاء `purchase_receipt_items`
#### 4.2 تمرير `color_id` عند إنشاء `fabric_rolls`
#### 4.3 تمرير `color_id` عند إنشاء `inventory_movements`

---

### المرحلة 5: بيانات تجريبية
> **يدوي أو migration**

إضافة بنود كونتينر مع ألوان مختلفة:

```sql
-- بند 1: قطن سادة + أبيض → 5,000 متر
INSERT INTO container_items (container_id, material_id, item_description, 
    color_id, color_name, expected_quantity, unit_cost, total_cost, unit, tenant_id)
VALUES ('517da98b-...', '4a9b437a-...', 'قطن سادة 100%',
    '41b1c713-...', 'أبيض', 5000, 1.7, 8500, 'meter', '...');

-- بند 2: قطن سادة + كحلي → 3,000 متر
INSERT INTO container_items (container_id, material_id, item_description,
    color_id, color_name, expected_quantity, unit_cost, total_cost, unit, tenant_id)
VALUES ('517da98b-...', '4a9b437a-...', 'قطن سادة 100%',
    'e1501bf9-...', 'كحلي', 3000, 1.7, 5100, 'meter', '...');

-- بند 3: بوليستر ساتان بدون لون → 2,000 متر
INSERT INTO container_items (container_id, material_id, item_description,
    expected_quantity, unit_cost, total_cost, unit, tenant_id)
VALUES ('517da98b-...', '5df9330c-...', 'بوليستر ساتان',
    2000, 2.5, 5000, 'meter', '...');
```

---

## 🗂️ خريطة الملفات المتأثرة

| # | الملف | المرحلة | التعديل |
|---|-------|---------|---------|
| 1 | `migrations/20260219_dynamic_receipt_colors.sql` | 1 | **جديد** — DDL |
| 2 | `useReceiptSources.ts` | 2 | تحديث interface + mapItems |
| 3 | `GoodsReceiptItemsTab.tsx` | 3 | حقول ديناميكية + تعبئة تلقائية |
| 4 | `receiptCompletionService.ts` | 4 | حفظ color_id/color_name |
| 5 | `receiptLocalStore.ts` | 3 | تحديث ReceiptItem type |

---

## ⏱️ ترتيب التنفيذ

```
المرحلة 1 (DB)  ← نبدأ هنا — 5 دقائق
    ↓
المرحلة 2 (useReceiptSources)  ← تمرير اللون — 5 دقائق
    ↓  
المرحلة 3 (GoodsReceiptItemsTab)  ← الحقول الديناميكية — 15 دقيقة
    ↓
المرحلة 4 (receiptCompletionService)  ← حفظ اللون — 10 دقائق
    ↓
المرحلة 5 (بيانات تجريبية)  ← اختبار — 5 دقائق
```

**الوقت المقدر: ~40 دقيقة**

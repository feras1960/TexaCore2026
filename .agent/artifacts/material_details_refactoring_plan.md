# 📋 خطة تطوير تبويبات تفاصيل المادة — استبدال البيانات التجريبية ببيانات حقيقية
## Material Details Tabs — Mock to Real Data Refactoring Plan

---

## 📊 تحليل الوضع الحالي

### التبويبات وحالة البيانات:

| # | التبويب | الملف | البيانات الحالية | الأولوية |
|---|---------|-------|-----------------|----------|
| 1 | **المخزون** (Inventory) | `MaterialInventoryTab.tsx` | ❌ Mock بالكامل (setTimeout + بيانات ثابتة) | 🔴 عالية |
| 2 | **الحركات** (Movements) | `MaterialMovementsTab.tsx` | ❌ Mock بالكامل (`generateSampleMovements()`) | 🔴 عالية |
| 3 | **المبيعات** (Sales) | `MaterialPricingTab.tsx` → `MaterialSalesTab` | ❌ Mock بالكامل (بيانات ثابتة) | 🟡 متوسطة |
| 4 | **المشتريات** (Purchases) | `MaterialPricingTab.tsx` → `MaterialPurchasesTab` | ❌ Mock بالكامل (بيانات ثابتة) | 🟡 متوسطة |
| 5 | **الرولونات** (Rolls) | `MaterialRollsTab.tsx` | ❌ Mock (`mockRolls`) | 🟡 متوسطة |
| 6 | **المعلومات الإضافية** (Additional Info) | `MaterialAdditionalInfoTab.tsx` | ⚠️ Mock جزئي (الموردين + المستودعات) | 🟢 منخفضة |
| 7 | **النظرة العامة** (Overview) | `MaterialOverviewTab.tsx` | ✅ بيانات حقيقية من `data` prop | — |
| 8 | **المعلومات الأساسية** (Basic Info) | `MaterialBasicInfoTab.tsx` | ✅ بيانات حقيقية (مع fallback للمجموعات) | — |
| 9 | **المواصفات** (Specs) | `MaterialSpecsTab.tsx` | ✅ بيانات حقيقية من `data` prop | — |
| 10 | **الصور** (Images) | `MaterialImagesTab.tsx` | ✅ بيانات حقيقية (Supabase Storage) | — |
| 11 | **المتغيرات** (Variants) | `MaterialVariantsTab.tsx` | ✅ بيانات حقيقية | — |
| 12 | **التسعير** (Pricing) | `MaterialPricingTab.tsx` | ✅ بيانات حقيقية من `data` prop | — |

---

## 🏗️ خطة التنفيذ المرحلية

### المرحلة 1: تبويب المخزون (MaterialInventoryTab) — الأولوية القصوى 🔴

**الملف:** `MaterialInventoryTab.tsx` (263 سطر)

**المشكلة الحالية:**
```typescript
// Mock data - replace with actual API call
setTimeout(() => {
    setInventoryData([
        { id: '1', warehouse_name: 'المستودع الرئيسي', ... },
        ...
    ]);
}, 500);
```

**الحل المقترح:**

1. **إضافة دالة جديدة في `warehouseService.ts`:**
```typescript
// Get material stock levels across all warehouses
async getMaterialStockByWarehouse(companyId: string, materialId: string): Promise<{
    warehouse_id: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    warehouse_code: string;
    total_quantity: number;
    available_quantity: number;
    reserved_quantity: number;
}[]>
```

2. **مصادر البيانات المحتملة:**
   - **جدول `inventory_movements`** — تجميع الحركات حسب المستودع لحساب الرصيد
   - **جدول `fabric_rolls`** — تجميع الرولونات حسب المستودع وحساب الكميات
   - **أو RPC function** — `get_material_stock_summary(material_id, company_id)`

3. **خطوات التنفيذ:**
   - [ ] التحقق من وجود جدول `inventory_movements` وعموده `product_id`
   - [ ] إنشاء RPC function `get_material_stock_by_warehouse` في Supabase
   - [ ] إضافة `getMaterialStockByWarehouse()` في `warehouseService.ts`
   - [ ] تعديل `MaterialInventoryTab.tsx` لاستخدام الخدمة الجديدة
   - [ ] إضافة Loading state و Error handling
   - [ ] إضافة حالة "لا توجد بيانات" عندما لا يوجد مخزون

**المتطلبات من قاعدة البيانات:**
```sql
-- RPC Function
CREATE OR REPLACE FUNCTION get_material_stock_by_warehouse(
    p_material_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    warehouse_id UUID,
    warehouse_code TEXT,
    warehouse_name_ar TEXT,
    warehouse_name_en TEXT,
    total_quantity NUMERIC,
    available_quantity NUMERIC,
    reserved_quantity NUMERIC,
    last_movement_date TIMESTAMPTZ
) AS $$ ... $$;
```

---

### المرحلة 2: تبويب الحركات (MaterialMovementsTab) — الأولوية القصوى 🔴

**الملف:** `MaterialMovementsTab.tsx` (609 سطر)

**المشكلة الحالية:**
```typescript
const generateSampleMovements = (language: string): StockMovement[] => [
    { id: 'MOV-001', type: 'sale', ... },  // 12 حركة وهمية
    ...
];
// Load sample data
setMovements(generateSampleMovements(language));
```

**الحل المقترح:**

1. **استخدام الخدمة الموجودة:**
   - `warehouseService.getInventoryMovements()` — **موجودة أصلاً!**
   - تدعم `materialId` filter (تُرسل كـ `product_id`)

2. **خطوات التنفيذ:**
   - [ ] استيراد `warehouseService` في التبويب
   - [ ] استيراد `useCompany` hook للحصول على `companyId`
   - [ ] استبدال `generateSampleMovements()` بـ `warehouseService.getInventoryMovements(companyId, { materialId: data.id })`
   - [ ] تحويل بيانات الـ API إلى الـ `StockMovement` interface
   - [ ] ربط فلترات التاريخ والنوع بالـ API
   - [ ] إضافة Loading و Error states
   - [ ] حذف دالة `generateSampleMovements` بالكامل

3. **ملاحظات مهمة:**
   - جدول `inventory_movements` يستخدم `product_id` وليس `material_id`
   - يجب التحقق أن `movement_type` values تتطابق مع الفلاتر الحالية
   - جدول `inventory_movements` لا يحتوي على عمود `status`

---

### المرحلة 3: تبويب المبيعات (MaterialSalesTab) — أولوية متوسطة 🟡

**الملف:** `MaterialPricingTab.tsx` → دالة `MaterialSalesTab` (سطر 338-447)

**المشكلة الحالية:**
```typescript
// Sample sales data
const salesStats = { totalOrders: 28, ... };  // بيانات ثابتة
const recentSales = [
    { id: 'INV-2024-045', customer: '...', ... },
    ...
];
```

**الحل المقترح:**

1. **إضافة دالة جديدة في `warehouseService.ts` أو خدمة جديدة:**
```typescript
// Get sales invoices/items for a specific material
async getMaterialSalesHistory(companyId: string, materialId: string, limit?: number): Promise<{
    invoice_id: string;
    invoice_number: string;
    invoice_date: string;
    customer_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    status: string;
}[]>
```

2. **مصادر البيانات:**
   - جدول `sales_invoices` + `sales_invoice_items` (مع JOIN على `product_id/material_id`)
   - أو استخدام RPC function

3. **خطوات التنفيذ:**
   - [ ] فحص هيكل جداول `sales_invoices` و `sales_invoice_items`
   - [ ] إنشاء query أو RPC لجلب الفواتير المرتبطة بمادة معينة
   - [ ] إضافة دالة `getMaterialSalesHistory()` في الخدمة
   - [ ] حساب الإحصائيات (totalOrders, totalQuantity, etc.) من البيانات الحقيقية
   - [ ] استبدال `salesStats` و `recentSales` بالبيانات المُجلبة
   - [ ] إضافة Loading و Error states

---

### المرحلة 4: تبويب المشتريات (MaterialPurchasesTab) — أولوية متوسطة 🟡

**الملف:** `MaterialPricingTab.tsx` → دالة `MaterialPurchasesTab` (سطر 450-559)

**المشكلة الحالية:**
```typescript
// Sample purchase data
const purchaseStats = { totalOrders: 12, ... };
const recentPurchases = [
    { id: 'PO-2024-018', supplier: '...', ... },
    ...
];
```

**الحل المقترح:**
- مشابه لـ المبيعات، لكن من جداول المشتريات
- `purchase_orders` + `purchase_order_items`

**خطوات التنفيذ:**
   - [ ] فحص هيكل جداول `purchase_orders` و `purchase_order_items`
   - [ ] إنشاء query أو RPC
   - [ ] إضافة دالة `getMaterialPurchaseHistory()`
   - [ ] حساب الإحصائيات من البيانات الحقيقية
   - [ ] استبدال البيانات المحلية
   - [ ] Loading و Error states

---

### المرحلة 5: تبويب الرولونات (MaterialRollsTab) — أولوية متوسطة 🟡

**الملف:** `MaterialRollsTab.tsx` (433 سطر)

**المشكلة الحالية:**
```typescript
// Mock data for demo
const mockRolls: FabricRoll[] = [
    { roll_number: 'RL-2024-001', ... },
    ...
];
const [rolls] = useState<FabricRoll[]>(data?.rolls || mockRolls);
```

**الحل المقترح:**

1. **استخدام الخدمة الموجودة:**
   - `warehouseService.getRolls()` — **موجودة أصلاً!**
   - تدعم `materialId` filter

2. **خطوات التنفيذ:**
   - [ ] استيراد `warehouseService` و `useCompany`
   - [ ] استبدال `mockRolls` بجلب البيانات عبر `warehouseService.getRolls(companyId, { materialId: data.id })`
   - [ ] تحويل بيانات API إلى `FabricRoll` interface
   - [ ] إضافة Loading و Error states
   - [ ] حذف `mockRolls` بالكامل

---

### المرحلة 6: تبويب المعلومات الإضافية (MaterialAdditionalInfoTab) — أولوية منخفضة 🟢

**الملف:** `MaterialAdditionalInfoTab.tsx` (322 سطر)

**المشكلة الحالية:**
```typescript
// Mock suppliers if not provided
const mockSuppliers = suppliers.length > 0 ? suppliers : [
    { id: '1', name_ar: 'شركة النسيج العالمية', ... },
    ...
];

// Hardcoded warehouse options
<SelectItem value="wh-1">المستودع الرئيسي</SelectItem>
```

**الحل المقترح:**

1. **جلب الموردين:**
   - إنشاء query من جدول `suppliers` أو `contacts`
   - أو تمرير بيانات الموردين من `MaterialsPage.tsx` عبر props

2. **جلب المستودعات:**
   - استخدام `warehouseService.getAll(companyId)` — **موجودة أصلاً!**

3. **خطوات التنفيذ:**
   - [ ] جلب الموردين من قاعدة البيانات
   - [ ] استبدال خيارات المستودعات الثابتة بـ `warehouseService.getAll()`
   - [ ] حذف `mockSuppliers`

---

## 🔧 متطلبات البنية التحتية

### خدمات جديدة مطلوبة في `warehouseService.ts`:

| الدالة | الجدول المصدر | ملاحظات |
|--------|--------------|---------|
| `getMaterialStockByWarehouse()` | `inventory_movements` / `fabric_rolls` | تجميع أرصدة حسب المستودع |
| `getMaterialSalesHistory()` | `sales_invoices` + items | فواتير مبيعات لمادة معينة |
| `getMaterialPurchaseHistory()` | `purchase_orders` + items | أوامر شراء لمادة معينة |

### خدمات موجودة يمكن استخدامها:

| الدالة | الاستخدام |
|--------|----------|
| `warehouseService.getInventoryMovements()` | ✅ تبويب الحركات |
| `warehouseService.getRolls()` | ✅ تبويب الرولونات |
| `warehouseService.getAll()` | ✅ قائمة المستودعات |

### SQL Functions المطلوبة في Supabase:

1. **`get_material_stock_by_warehouse(material_id, company_id)`** — تجميع المخزون
2. *(اختياري)* **`get_material_sales_summary(material_id, company_id)`** — ملخص المبيعات
3. *(اختياري)* **`get_material_purchase_summary(material_id, company_id)`** — ملخص المشتريات

---

## 📅 الجدول الزمني المقترح

| المرحلة | المدة التقديرية | المتطلب المسبق |
|---------|----------------|----------------|
| مرحلة 1 — المخزون | ~2 ساعات | SQL function + service |
| مرحلة 2 — الحركات | ~1 ساعة | الخدمة موجودة ✅ |
| مرحلة 3 — المبيعات | ~2 ساعات | فحص جداول المبيعات |
| مرحلة 4 — المشتريات | ~2 ساعات | فحص جداول المشتريات |
| مرحلة 5 — الرولونات | ~1 ساعة | الخدمة موجودة ✅ |
| مرحلة 6 — المعلومات الإضافية | ~1 ساعة | الخدمة موجودة ✅ |

**المدة الإجمالية التقديرية: ~9 ساعات عمل**

---

## ✅ معايير القبول

لكل تبويب يجب تحقيق:
- [ ] عدم وجود أي بيانات تجريبية (mock/sample/hardcoded)
- [ ] جلب البيانات من Supabase عند فتح التبويب
- [ ] عرض حالة التحميل (Loading spinner)
- [ ] عرض حالة الخطأ (Error message)
- [ ] عرض حالة "لا توجد بيانات" عندما يكون الجدول فارغاً
- [ ] عمل فلاتر البحث والتصفية مع البيانات الحقيقية
- [ ] عدم وجود أخطاء TypeScript
- [ ] الأداء مقبول (لا تأخير ملحوظ)

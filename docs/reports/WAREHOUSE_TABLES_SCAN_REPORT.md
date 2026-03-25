# 📊 تقرير المسح الشامل لجداول المستودعات
# Warehouse Tables Complete Scan Report

**تاريخ التقرير**: 2 فبراير 2026  
**إجمالي الجداول في قاعدة البيانات**: 175 جدول

---

## 🔍 جدول المطابقة: الاسم المتوقع ↔ الاسم الفعلي

| الاسم المتوقع (في التوثيق) | الاسم الفعلي (في قاعدة البيانات) | الحالة | الصفوف |
|----------------------------|----------------------------------|--------|--------|
| `warehouses` | `warehouses` ✅ | موجود | 1 |
| `warehouse_locations` | `bin_locations` ✅ | موجود بإسم مختلف | 0 |
| `warehouse_settings` | `warehouse_settings` ✅ | موجود | 0 |
| `warehouse_assignments` | `warehouse_assignments` ✅ | موجود | 0 |
| `fabric_materials` | `fabric_materials` ✅ | موجود | 9 |
| `fabric_groups` | `fabric_groups` ✅ | موجود | 5 |
| `fabric_colors` | `fabric_colors` ✅ | موجود | 10 |
| `fabric_material_colors` | ⚠️ يستخدم `fabric_colors` مباشرة | بديل | - |
| `fabric_rolls` | `fabric_rolls` ✅ | موجود | 0 |
| `roll_movements` | `inventory_movements` ✅ | موجود بإسم مختلف | 0 |
| `roll_reservations` | `reservations` + `reservation_items` ✅ | موجود بإسم مختلف | 0 |
| `inventory_movements` | `inventory_movements` ✅ | موجود | 0 |
| `inventory_batches` | `batches` ✅ | موجود بإسم مختلف | 0 |
| `inventory_stock` | `stock_ledger` ✅ | موجود بإسم مختلف | 0 |
| `stock_counts` | ❌ غير موجود | مفقود | - |
| `stock_count_items` | ❌ غير موجود | مفقود | - |
| `sample_requests` | `sample_cuttings` + `sample_cutting_items` ✅ | موجود بإسم مختلف | 0 |
| `fabric_samples` | `sample_cuttings` ✅ | موجود بإسم مختلف | 0 |
| `containers` | `containers` ✅ | موجود | 3 |
| `container_items` | `container_items` ✅ | موجود | 18 |
| `container_expenses` | `container_expenses` ✅ | موجود | 12 |
| `container_reservations` | `container_reservations` ✅ | موجود | 4 |
| `delivery_notes` | `delivery_notes` ✅ | موجود | 0 |
| `delivery_note_items` | `delivery_note_items` ✅ | موجود | 0 |

---

## ✅ الجداول الموجودة مع الإحصائيات الكاملة

### 📦 جداول المستودعات الأساسية

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `warehouses` | 80 KB | 16 KB | 64 KB | **1** | 30 |
| `bin_locations` | 16 KB | 0 | 16 KB | **0** | 20 |
| `warehouse_settings` | 32 KB | 8 KB | 24 KB | **0** | 3 |
| `warehouse_assignments` | 112 KB | 16 KB | 96 KB | **0** | 6 |

### 🧵 جداول المواد والأقمشة

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `fabric_materials` | 80 KB | 48 KB | 32 KB | **9** | 648 |
| `fabric_groups` | 48 KB | 16 KB | 32 KB | **5** | 16 |
| `fabric_colors` | 48 KB | 16 KB | 32 KB | **10** | 26 |
| `fabric_rolls` | 40 KB | 8 KB | 32 KB | **0** | 216 |

### 📦 جداول الكونتينرات

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `containers` | 176 KB | 16 KB | 160 KB | **3** | 35 |
| `container_items` | 80 KB | 16 KB | 64 KB | **18** | 24 |
| `container_expenses` | 96 KB | 16 KB | 80 KB | **12** | 25 |
| `container_reservations` | 112 KB | 16 KB | 96 KB | **4** | 16 |
| `container_quotations` | 80 KB | 16 KB | 64 KB | **3** | 15 |
| `container_quotation_items` | 16 KB | 8 KB | 8 KB | **0** | 11 |
| `container_expense_allocations` | 16 KB | 0 | 16 KB | **0** | 21 |
| `container_cost_allocations` | 8 KB | 0 | 8 KB | **0** | 11 |

### 📋 جداول الحركات والتسليم

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `inventory_movements` | 16 KB | 8 KB | 8 KB | **0** | 187 |
| `delivery_notes` | 88 KB | 8 KB | 80 KB | **0** | 10 |
| `delivery_note_items` | 48 KB | 8 KB | 40 KB | **0** | 5 |

### 📊 جداول الحجوزات والعينات

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `reservations` | 88 KB | 8 KB | 80 KB | **0** | 50 |
| `reservation_items` | 24 KB | 8 KB | 16 KB | **0** | 18 |
| `sample_cuttings` | 24 KB | 8 KB | 16 KB | **0** | 1540 |
| `sample_cutting_items` | 16 KB | 8 KB | 8 KB | **0** | 19 |

### 📈 جداول المخزون والدفعات

| الجدول | الحجم | البيانات | الفهارس | الصفوف | عدد الأعمدة |
|--------|-------|----------|---------|--------|-------------|
| `batches` | 24 KB | 8 KB | 16 KB | **0** | 20 |
| `stock_ledger` | 16 KB | 0 | 16 KB | **0** | 20 |

---

## ❌ الجداول المفقودة فعلياً

| الجدول | الوصف | الأهمية |
|--------|-------|---------|
| `stock_counts` | جرد المخزون | ⭐⭐⭐ مطلوب |
| `stock_count_items` | بنود الجرد | ⭐⭐⭐ مطلوب |

---

## 🔄 جدول التحويل للـ warehouseService.ts

يجب تحديث الـ service ليستخدم الأسماء الصحيحة:

```typescript
// الاسم في الكود          →  الاسم الصحيح في قاعدة البيانات
'warehouse_locations'      →  'bin_locations'
'roll_movements'           →  'inventory_movements'
'roll_reservations'        →  'reservations'
'inventory_batches'        →  'batches'
'inventory_stock'          →  'stock_ledger'
'sample_requests'          →  'sample_cuttings'
'fabric_samples'           →  'sample_cuttings'
```

---

## ✅ الخلاصة

### ✅ موجود ويعمل:
- 21 جدول خاص بالمستودعات موجود ومُفعّل
- `warehouses` - المستودعات ✅
- `bin_locations` - مواقع التخزين ✅
- `fabric_*` - جداول الأقمشة ✅
- `container_*` - جداول الكونتينرات ✅
- `delivery_*` - جداول التسليم ✅
- `reservations` - الحجوزات ✅
- `sample_cuttings` - العينات ✅
- `inventory_movements` - الحركات ✅
- `batches` - الدفعات ✅
- `stock_ledger` - سجل المخزون ✅

### ⚠️ يحتاج تحديث في الكود:
- تحديث أسماء الجداول في `warehouseService.ts`

### ❌ مفقود:
- `stock_counts` - جدول الجرد
- `stock_count_items` - بنود الجرد

---

**ملاحظة**: الجداول موجودة بأسماء مختلفة عما هو موثق. يجب تحديث التوثيق والـ Service Layer.

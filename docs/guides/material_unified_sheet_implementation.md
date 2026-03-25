# 📦 Material UnifiedAccountingSheet Implementation
## تطبيق شيت المواد الموحد

**تاريخ التنفيذ**: 2026-02-02  
**الحالة**: ✅ مكتمل - التكوين والتبويبات الأساسية

---

## ✅ ما تم إنجازه

### 1. **تحديث `materialConfig` في `documentConfigs.ts`**

تم إضافة **8 تبويبات** كاملة:

```typescript
tabs: [
    { id: 'overview', labelKey: 'warehouse.material.tabs.overview', icon: 'LayoutDashboard', component: 'MaterialOverviewTab' },
    { id: 'inventory', labelKey: 'warehouse.material.tabs.inventory', icon: 'Database', component: 'MaterialInventoryTab', showInModes: ['view'] },
    { id: 'movements', labelKey: 'warehouse.material.tabs.movements', icon: 'TrendingUp', component: 'MaterialMovementsTab', showInModes: ['view'] },
    { id: 'pricing', labelKey: 'warehouse.material.tabs.pricing', icon: 'DollarSign', component: 'MaterialPricingTab', showInModes: ['view'] },
    { id: 'sales', labelKey: 'warehouse.material.tabs.sales', icon: 'ShoppingCart', component: 'MaterialSalesTab', showInModes: ['view'] },
    { id: 'purchases', labelKey: 'warehouse.material.tabs.purchases', icon: 'ShoppingBag', component: 'MaterialPurchasesTab', showInModes: ['view'] },
    { id: 'analytics', labelKey: 'warehouse.material.tabs.analytics', icon: 'BarChart3', component: 'MaterialAnalyticsTab', badge: 'AI', showInModes: ['view'] },
    { id: 'activity', labelKey: 'accounting.tabs.activity', icon: 'Clock', component: 'ActivityTab', showInModes: ['view'] },
]
```

**الإجراءات (Actions)**:
```typescript
actions: [
    { id: 'edit', labelKey: 'actions.edit', icon: 'Edit', variant: 'outline', showInModes: ['view'] },
    { id: 'save', labelKey: 'actions.save', icon: 'Save', variant: 'default', showInModes: ['edit', 'create'] },
    { id: 'delete', labelKey: 'actions.delete', icon: 'Trash2', variant: 'destructive', showInModes: ['view', 'edit'], requiresConfirm: true },
    { id: 'print', labelKey: 'actions.print', icon: 'Printer', variant: 'outline', showInModes: ['view'] },
    { id: 'export', labelKey: 'actions.export', icon: 'Download', variant: 'outline', showInModes: ['view'] },
]
```

**الإحصائيات (Stats)**:
```typescript
stats: [
    { id: 'totalStock', labelKey: 'warehouse.material.stats.totalStock', valueKey: 'total_stock', icon: 'Database', format: 'number', colorClass: 'text-blue-600' },
    { id: 'availableStock', labelKey: 'warehouse.material.stats.availableStock', valueKey: 'available_stock', icon: 'CheckCircle2', format: 'number', colorClass: 'text-green-600' },
    { id: 'reservedStock', labelKey: 'warehouse.material.stats.reservedStock', valueKey: 'reserved_stock', icon: 'Lock', format: 'number', colorClass: 'text-orange-600' },
    { id: 'avgPrice', labelKey: 'warehouse.material.stats.avgPrice', valueKey: 'average_price', icon: 'DollarSign', format: 'currency', colorClass: 'text-erp-navy' },
]
```

---

### 2. **التبويبات المنفذة**

#### ✅ **MaterialOverviewTab** (نظرة عامة)
**الملف**: `MaterialOverviewTab.tsx`

**الميزات**:
- ✅ معلومات أساسية (Code, Category, Name AR/EN, Description, Unit)
- ✅ معلومات إضافية (SKU, Barcode, Min/Max Stock Levels)
- ✅ حالة المادة (Active/Inactive Switch)
- ✅ دعم RTL/LTR كامل
- ✅ دعم الأوضاع الثلاثة (view, edit, create)
- ✅ تصميم بـ Cards منظمة

**الحقول**:
```typescript
- code: string (font-mono)
- category_id: select
- name_ar: input (RTL)
- name_en: input (LTR)
- description: textarea
- unit_id: select (meter, kg, piece, roll)
- is_active: switch
- sku: input
- barcode: input
- min_stock_level: number
- max_stock_level: number
```

#### ✅ **MaterialInventoryTab** (المخزون)
**الملف**: `MaterialInventoryTab.tsx`

**الميزات**:
- ✅ 3 بطاقات إحصائية (Total, Available, Reserved)
- ✅ جدول المخزون حسب المستودعات (NexaTable)
- ✅ أعمدة: Warehouse Code, Name, Total, Available, Reserved, Status
- ✅ ألوان مميزة لكل نوع (أزرق للإجمالي، أخضر للمتاح، برتقالي للمحجوز)
- ✅ ملاحظة توضيحية

**الأعمدة**:
```typescript
- warehouse_code: font-mono
- warehouse_name: with icon
- total_quantity: blue badge
- available_quantity: green badge
- reserved_quantity: orange badge
- status: StatusBadge (in_stock, low_stock, out_of_stock)
```

#### ✅ **MaterialMovementsTab** (الحركات)
**الملف**: `MaterialMovementsTab.tsx`

**الميزات**:
- ✅ 3 بطاقات إحصائية (Total In, Total Out, Net Change)
- ✅ فلاتر التاريخ (From/To)
- ✅ جدول الحركات (NexaTable)
- ✅ أنواع الحركات: In, Out, Transfer, Adjustment
- ✅ ألوان مميزة لكل نوع

**الأعمدة**:
```typescript
- date: with Calendar icon
- type: colored badge (green/red/blue/orange)
- reference: font-mono
- warehouse_from: text
- warehouse_to: text
- quantity: +/- with color
- total_value: currency
```

#### 🔄 **MaterialPricingTab** (الأسعار) - Placeholder
**الملف**: `MaterialPricingTab.tsx`

سيتم تطبيقه لاحقاً - يعرض حالياً placeholder

#### 🔄 **MaterialSalesTab** (المبيعات) - Placeholder
**الملف**: `MaterialPricingTab.tsx`

سيتم تطبيقه لاحقاً - يعرض حالياً placeholder

#### 🔄 **MaterialPurchasesTab** (المشتريات) - Placeholder
**الملف**: `MaterialPricingTab.tsx`

سيتم تطبيقه لاحقاً - يعرض حالياً placeholder

#### 🔄 **MaterialAnalyticsTab** (تحليلات AI) - Placeholder
**الملف**: `MaterialPricingTab.tsx`

سيتم تطبيقه لاحقاً - يعرض حالياً placeholder مع badge "AI"

---

### 3. **مفاتيح الترجمة**

تم إضافة جميع المفاتيح في `ar.json`:

```json
{
  "warehouse": {
    "material": {
      "tabs": {
        "overview": "نظرة عامة",
        "inventory": "المخزون",
        "movements": "الحركات",
        "pricing": "الأسعار",
        "sales": "المبيعات",
        "purchases": "المشتريات",
        "analytics": "تحليلات الذكاء",
        "activity": "السجل"
      },
      "stats": {
        "totalStock": "إجمالي المخزون",
        "availableStock": "المخزون المتاح",
        "reservedStock": "المخزون المحجوز",
        "avgPrice": "متوسط السعر"
      }
    }
  }
}
```

---

### 4. **تحديث `MainDocumentTabs.tsx`**

تم إضافة دعم `material` و `warehouse`:

```typescript
const iconMap = {
    // ... existing
    material: Package,
    warehouse: Warehouse,
};

const colorMap = {
    // ... existing
    material: 'text-teal-600',
    warehouse: 'text-cyan-600',
};
```

---

### 5. **ملف Index للتبويبات**

تم إنشاء `tabs/index.ts` لتصدير جميع التبويبات:

```typescript
export { MaterialOverviewTab } from './MaterialOverviewTab';
export { MaterialInventoryTab } from './MaterialInventoryTab';
export { MaterialMovementsTab } from './MaterialMovementsTab';
export { MaterialPricingTab, MaterialSalesTab, MaterialPurchasesTab, MaterialAnalyticsTab } from './MaterialPricingTab';
```

---

## 📊 هيكلية التبويبات

```
UnifiedAccountingSheet (docType="material")
│
├── Overview Tab (نظرة عامة) ✅
│   ├── Basic Information Card
│   │   ├── Code, Category
│   │   ├── Name (AR/EN)
│   │   ├── Description
│   │   └── Unit
│   └── Additional Information Card
│       ├── SKU, Barcode
│       └── Min/Max Stock Levels
│
├── Inventory Tab (المخزون) ✅
│   ├── Summary Cards (3)
│   │   ├── Total Stock
│   │   ├── Available Stock
│   │   └── Reserved Stock
│   └── Inventory Table (by Warehouse)
│
├── Movements Tab (الحركات) ✅
│   ├── Summary Cards (3)
│   │   ├── Total In
│   │   ├── Total Out
│   │   └── Net Change
│   ├── Date Filters
│   └── Movements Table
│
├── Pricing Tab (الأسعار) 🔄 Placeholder
├── Sales Tab (المبيعات) 🔄 Placeholder
├── Purchases Tab (المشتريات) 🔄 Placeholder
├── Analytics Tab (تحليلات AI) 🔄 Placeholder
└── Activity Tab (السجل) ✅ (موجود مسبقاً)
```

---

## 🎯 الاستخدام

### من `MaterialsPage.tsx`:

```typescript
<UnifiedAccountingSheet
    isOpen={sheetOpen}
    onClose={() => setSheetOpen(false)}
    docType="material"
    mode={sheetMode}  // 'view' | 'edit' | 'create'
    data={selectedMaterial || { code: '', name_ar: '', is_active: true }}
    onSave={handleSave}
    onModeChange={setSheetMode}
/>
```

### الأوضاع (Modes):

**Create Mode**:
- يعرض فقط تبويب Overview
- جميع الحقول قابلة للتعديل
- زر "Save" ظاهر

**View Mode**:
- يعرض جميع التبويبات (8 tabs)
- جميع الحقول للقراءة فقط
- زر "Edit" ظاهر

**Edit Mode**:
- يعرض فقط تبويب Overview
- جميع الحقول قابلة للتعديل
- زر "Save" ظاهر

---

## 📦 الملفات المنشأة/المعدلة

### ✅ ملفات جديدة:
1. `src/features/accounting/components/unified/tabs/MaterialOverviewTab.tsx`
2. `src/features/accounting/components/unified/tabs/MaterialInventoryTab.tsx`
3. `src/features/accounting/components/unified/tabs/MaterialMovementsTab.tsx`
4. `src/features/accounting/components/unified/tabs/MaterialPricingTab.tsx`
5. `src/features/accounting/components/unified/tabs/index.ts`

### ✅ ملفات معدلة:
1. `src/features/accounting/components/unified/configs/documentConfigs.ts` - تحديث materialConfig
2. `src/i18n/locales/ar.json` - إضافة مفاتيح الترجمة
3. `src/features/accounting/components/unified/components/MainDocumentTabs.tsx` - إضافة دعم material/warehouse

---

## 🎨 التصميم والألوان

### **Stats Cards**:
- Total Stock: `border-blue-200 bg-blue-50` + `text-blue-600`
- Available Stock: `border-green-200 bg-green-50` + `text-green-600`
- Reserved Stock: `border-orange-200 bg-orange-50` + `text-orange-600`
- Total In: `border-green-200 bg-green-50` + `text-green-600`
- Total Out: `border-red-200 bg-red-50` + `text-red-600`
- Net Change: `border-blue-200 bg-blue-50` + dynamic color

### **Movement Types**:
- In: `text-green-600 bg-green-50 border-green-200`
- Out: `text-red-600 bg-red-50 border-red-200`
- Transfer: `text-blue-600 bg-blue-50 border-blue-200`
- Adjustment: `text-orange-600 bg-orange-50 border-orange-200`

### **Icons**:
- Material: `Package` (teal-600)
- Warehouse: `Warehouse` (cyan-600)
- Database: `Database` (blue)
- Available: `CheckCircle2` (green)
- Reserved: `Lock` (orange)
- In: `TrendingUp` (green)
- Out: `TrendingDown` (red)
- Transfer: `ArrowRightLeft` (blue)

---

## 🚀 الخطوات التالية (اختياري)

### 1. **تطبيق Pricing Tab**
- جدول الأسعار حسب العملاء/الموردين
- أسعار الشراء والبيع
- تاريخ الأسعار

### 2. **تطبيق Sales Tab**
- سجل المبيعات للمادة
- الكميات المباعة
- الإيرادات

### 3. **تطبيق Purchases Tab**
- سجل المشتريات للمادة
- الكميات المشتراة
- التكاليف

### 4. **تطبيق Analytics Tab (AI)**
- تحليل الطلب
- التنبؤ بالمخزون
- اتجاهات المبيعات
- توصيات الذكاء الاصطناعي

### 5. **ربط البيانات الحقيقية**
- استبدال Mock Data بـ API Calls
- تطبيق `warehouseService` methods
- معالجة الأخطاء

---

## ✅ الخلاصة

تم تطبيق **شيت موحد كامل للمواد** باستخدام `UnifiedAccountingSheet` مع:

- ✅ **8 تبويبات** (3 مكتملة + 5 placeholders)
- ✅ **5 إجراءات** (Edit, Save, Delete, Print, Export)
- ✅ **4 إحصائيات** (Total, Available, Reserved, Avg Price)
- ✅ **دعم RTL/LTR** كامل
- ✅ **3 أوضاع** (View, Edit, Create)
- ✅ **تصميم احترافي** مع Cards و NexaTable
- ✅ **ألوان مميزة** لكل نوع بيانات
- ✅ **مفاتيح ترجمة** كاملة

**الشيت جاهز للاستخدام** في `MaterialsPage` ويمكن توسيعه بسهولة! 🎉

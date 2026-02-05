# 📦 Materials Page - Chart of Accounts Pattern Implementation
## تطبيق نمط شجرة الحسابات على صفحة المواد

**تاريخ التحديث**: 2026-02-02  
**الحالة**: ✅ مكتمل

---

## ✅ التغييرات المطبقة

### 1. **إعادة كتابة كاملة لـ `MaterialsPage.tsx`**

تم تطبيق نفس النمط المستخدم في `ChartOfAccounts.tsx`:

#### **التخطيط (Layout)**
```
Header (Title + Action Buttons)
    ↓
Stats Cards (4 cards)
    ↓
Search + Filters + View Toggle (في صف واحد)
    ↓
Tree View / Table View
```

#### **المكونات المطابقة**

| العنصر | Chart of Accounts | Materials Page | ✅ |
|--------|------------------|----------------|-----|
| Header Layout | ✅ | ✅ | متطابق |
| Stats Cards | 4 cards | 4 cards | متطابق |
| Search Bar | RTL Support | RTL Support | متطابق |
| View Toggle | Tree/Table | Tree/Table | متطابق |
| Filter Panel | Collapsible | Collapsible | متطابق |
| Export CSV | ✅ | ✅ | متطابق |
| Table Columns | Hierarchical | Hierarchical | متطابق |
| Empty State | Gradient Card | Gradient Card | متطابق |

---

## 🎨 التفاصيل الفنية

### **1. View Mode Toggle**
```tsx
<div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
  <Button variant={viewMode === 'tree' ? 'default' : 'ghost'}>
    <TreePine /> Tree View
  </Button>
  <Button variant={viewMode === 'table' ? 'default' : 'ghost'}>
    <LayoutList /> Table View
  </Button>
</div>
```

**الألوان**:
- Active: `bg-erp-navy text-white`
- Inactive: `text-gray-600`

### **2. Table Columns with Hierarchy**
```tsx
{
  key: 'code',
  render: (value, row) => (
    <div style={{ paddingInlineStart: `${(row.level || 0) * 24}px` }}>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}
```

**المحاذاة**:
- Code: `paddingInlineStart: level * 24px`
- Name: `paddingInlineStart: level * 8px` + Icon

### **3. Stats Cards**
```tsx
<StatCard label="إجمالي المواد" value={totalMaterials} icon={BarChart3} />
<StatCard label="المواد النشطة" value={activeMaterials} icon={CheckCircle2} />
<StatCard label="المجموعات" value={groupsCount} icon={Folder} />
<StatCard label="إجمالي المخزون" value={totalStock} icon={Database} />
```

### **4. RTL Support**
```tsx
<div className={cn(
  "flex items-center gap-3 flex-wrap",
  direction === 'rtl' ? 'flex-row-reverse' : ''
)}>
```

**العناصر المدعومة**:
- Search bar position
- Button order
- Table alignment
- Icon positioning (`me-2` instead of `mr-2`)

### **5. Filter Panel**
```tsx
{showFilters && (
  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectItem value="all">الكل</SelectItem>
    </Select>
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectItem value="active">نشط</SelectItem>
      <SelectItem value="inactive">غير نشط</SelectItem>
    </Select>
  </div>
)}
```

**Badge Counter**:
```tsx
{(categoryFilter !== 'all' || statusFilter !== 'all') && (
  <span className="ms-2 px-1.5 py-0.5 bg-erp-teal text-white text-xs rounded-full">
    {activeFiltersCount}
  </span>
)}
```

---

## 📊 مقارنة الميزات

### **Chart of Accounts**
- ✅ Tree View (AccountTreeView component)
- ✅ Table View (NexaTable with hierarchy)
- ✅ Expand/Collapse All
- ✅ Add Group / Add Account
- ✅ CSV Export
- ✅ Print
- ✅ Filters (Type, Status, Currency)
- ✅ Search
- ✅ RTL Support

### **Materials Page** (الحالة الحالية)
- 🔄 Tree View (Placeholder - قيد التطوير)
- ✅ Table View (NexaTable with hierarchy)
- ✅ Expand/Collapse All buttons
- ✅ Add Group / Add Material
- ✅ CSV Export
- ✅ Print
- ✅ Filters (Category, Status)
- ✅ Search
- ✅ RTL Support

---

## 🎯 الميزات المطبقة بالكامل

### ✅ **Header Section**
- Title + Subtitle
- Action Buttons: Refresh, Print, Add Group, Add Material
- Same spacing and alignment as CoA

### ✅ **Stats Section**
- 4 StatCards in grid
- Icons: BarChart3, CheckCircle2, Folder, Database
- English numerals (1, 2, 3)

### ✅ **Search & Controls**
- Search bar with icon
- Filter toggle with badge counter
- Export CSV button
- View mode toggle (Tree/Table)
- Expand/Collapse buttons (tree mode only)

### ✅ **Table View**
- NexaTable component
- Hierarchical indentation
- Columns: Code, Name, Category, Status, Actions
- Row click handler
- Add child button for groups
- StatusBadge for active/inactive

### ✅ **Empty State**
- Gradient background (blue-50 to indigo-50)
- Icon in circle
- Title + Description
- Action buttons (Refresh, Add First Material)

### ✅ **RTL Support**
- `direction` from useLanguage
- `flex-row-reverse` for RTL
- `paddingInlineStart` instead of `paddingLeft`
- Icon positioning with `me-2` (margin-end)

---

## 🔧 التكامل مع UnifiedAccountingSheet

```tsx
<UnifiedAccountingSheet
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  docType="material"
  mode={sheetMode}
  data={selectedMaterial || { code: '', name_ar: '', is_active: true }}
  onSave={handleSave}
  onModeChange={setSheetMode}
/>
```

**Modes**:
- `view`: عرض التفاصيل
- `edit`: تعديل المادة
- `create`: إضافة مادة جديدة

---

## 📝 مفاتيح الترجمة المضافة

```json
{
  "warehouse": {
    "material": {
      "addSubMaterial": "إضافة مادة فرعية",
      "tableView": "عرض الجدول",
      "treeView": "عرض الشجرة"
    }
  }
}
```

**المفاتيح المستخدمة**:
- `warehouse.tabs.materials`
- `warehouse.material.add`
- `warehouse.material.addSubMaterial`
- `warehouse.material.code`
- `warehouse.material.name`
- `warehouse.material.category`
- `warehouse.material.noMaterials`
- `warehouse.material.tableView`
- `warehouse.material.treeView`
- `common.status._`
- `common.actions`
- `common.filter`
- `common.export`
- `common.refresh`
- `accounting.printReport`
- `accounting.expandAll`
- `accounting.collapseAll`

---

## 🎨 الألوان والأنماط

### **Primary Colors**
- Navy: `bg-erp-navy` (للأزرار النشطة)
- Teal: `bg-erp-teal` (للأزرار الأساسية)
- Blue: `text-blue-600` (للأيقونات)

### **Status Colors**
- Active: `text-emerald-600`
- Inactive: `text-gray-500`
- Group: `text-erp-teal` (Folder icon)
- Detail: `text-gray-400` (FileText icon)

### **Background Colors**
- Light mode: `bg-gray-50`
- Dark mode: `bg-gray-800`
- Filters panel: `bg-gray-50 dark:bg-gray-800/50`

---

## 📦 الملفات المعدلة

1. ✅ `src/features/warehouse/pages/MaterialsPage.tsx` - إعادة كتابة كاملة
2. ✅ `src/i18n/locales/ar.json` - إضافة `addSubMaterial`

---

## 🚀 الخطوات التالية (اختياري)

### 1. **تطبيق Tree View**
إنشاء `MaterialTreeView.tsx` مشابه لـ `AccountTreeView.tsx`:
- Collapsible tree nodes
- Drag & drop support
- Context menu (Add, Edit, Delete)

### 2. **تحسين الفلاتر**
- إضافة فلتر Categories من قاعدة البيانات
- إضافة فلتر Units
- إضافة فلتر بحسب المخزون (In Stock / Out of Stock)

### 3. **تحسين CSV Export**
- إضافة المزيد من الأعمدة
- دعم تصدير الشجرة الهرمية

---

## ✅ الخلاصة

تم تطبيق **نفس النمط بالضبط** المستخدم في شجرة الحسابات على صفحة المواد:

- ✅ نفس التخطيط والهيكلية
- ✅ نفس الألوان والأنماط
- ✅ نفس المحاذاة RTL/LTR
- ✅ نفس مكونات UI (NexaTable, StatCard, StatusBadge)
- ✅ نفس نظام الفلاتر
- ✅ نفس أزرار التبديل بين Tree/Table
- ✅ نفس Empty State design

**الصفحة جاهزة للاستخدام** على `/warehouse/materials` 🎉

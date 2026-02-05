# ✅ Material CRUD - Final Implementation
## تطبيق نهائي لعمليات المواد مع `fabric_materials`

**تاريخ التطبيق**: 2026-02-02  
**الحالة**: ✅ جاهز للاختبار

---

## 🎯 الملخص

تم تطبيق CRUD كامل للمواد باستخدام جدول `fabric_materials` الموجود فعلياً في قاعدة البيانات، مع مطابقة أسماء الأعمدة الصحيحة.

---

## 📋 Schema الحقيقي: `fabric_materials`

### **الأعمدة الموجودة**:

```sql
CREATE TABLE fabric_materials (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID,
    
    -- Basic Info
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    
    -- Grouping
    group_id UUID REFERENCES fabric_groups(id),  -- NOT category_id!
    
    -- Details
    composition VARCHAR(500),                     -- NOT description!
    category VARCHAR(50) DEFAULT 'mixed',
    
    -- Measurements
    default_width DECIMAL(10,2) DEFAULT 150,
    weight_per_meter DECIMAL(10,4),
    thread_count INT,
    shrinkage_percent DECIMAL(5,2),
    
    -- Unit & Pricing
    unit VARCHAR(20) DEFAULT 'meter',             -- NOT unit_id!
    purchase_price DECIMAL(15,4) DEFAULT 0,
    selling_price DECIMAL(15,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Stock
    min_stock DECIMAL(15,2) DEFAULT 0,            -- NOT min_stock_level!
    reorder_point DECIMAL(15,2) DEFAULT 0,        -- NOT max_stock_level!
    
    -- Supplier
    origin_country VARCHAR(100),
    default_supplier_id UUID,
    
    -- Media
    images JSONB DEFAULT '[]',
    swatch_url TEXT,
    
    -- Online
    slug VARCHAR(200),
    is_visible_online BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Misc
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',             -- For color, sku, barcode!
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',          -- NOT is_active!
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);
```

---

## 🔄 Mapping: Form → Database

### **من النموذج إلى قاعدة البيانات**:

| Form Field | DB Column | Notes |
|------------|-----------|-------|
| `category_id` | `group_id` | ⚠️ اسم مختلف |
| `description` | `composition` | ⚠️ اسم مختلف |
| `unit_id` | `unit` | ⚠️ VARCHAR بدلاً من UUID |
| `color` | `custom_fields.color` | ⚠️ في JSONB |
| `color_hex` | `custom_fields.color_hex` | ⚠️ في JSONB |
| `sku` | `custom_fields.sku` | ⚠️ في JSONB |
| `barcode` | `custom_fields.barcode` | ⚠️ في JSONB |
| `min_stock_level` | `min_stock` | ⚠️ اسم مختلف |
| `max_stock_level` | `reorder_point` | ⚠️ اسم ومعنى مختلف |
| `is_active` | `status` | ⚠️ Boolean → VARCHAR |

---

## ✅ التعديلات المطبقة

### **1. `warehouseService.ts`**

#### **أ. تحديث `getMaterials()`**:
```typescript
async getMaterials(companyId: string, filters?: {...}): Promise<any[]> {
    let query = supabase
        .from('fabric_materials')  // ✅ NOT 'materials'
        .select(`
            *,
            group:fabric_groups(id, name_ar, name_en)  // ✅ NOT material_categories
        `)
        .eq('company_id', companyId)
        .order('code');

    if (filters?.categoryId) {
        query = query.eq('group_id', filters.categoryId);  // ✅ NOT category_id
    }
    // ...
}
```

#### **ب. تحديث `createMaterial()`**:
```typescript
async createMaterial(materialData: any) {
    const { data, error } = await supabase
        .from('fabric_materials')  // ✅
        .insert([materialData])
        .select()
        .single();
    // ...
}
```

#### **ج. تحديث `createMaterials()`**:
```typescript
async createMaterials(materialsData: any[]) {
    const { data, error } = await supabase
        .from('fabric_materials')  // ✅
        .insert(materialsData)
        .select();
    // ...
}
```

#### **د. تحديث `updateMaterial()`**:
```typescript
async updateMaterial(id: string, updates: any) {
    const { data, error } = await supabase
        .from('fabric_materials')  // ✅
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    // ...
}
```

#### **هـ. تحديث `deleteMaterial()`**:
```typescript
async deleteMaterial(id: string) {
    const { error } = await supabase
        .from('fabric_materials')  // ✅
        .delete()
        .eq('id', id);
    // ...
}
```

---

### **2. `MaterialsPage.tsx`**

#### **أ. إضافة `user` من `useAuth`**:
```typescript
const { companyId, user } = useAuth();  // ✅ Added user
```

#### **ب. تحديث `handleSave()` مع Mapping صحيح**:
```typescript
const handleSave = async (data: any) => {
    // Map form data to fabric_materials schema
    const materialData = {
        tenant_id: user?.user_metadata?.tenant_id,
        company_id: companyId,
        code: data.code,
        name_ar: data.name_ar,
        name_en: data.name_en,
        
        // ✅ Correct mappings
        group_id: data.category_id || data.group_id,
        composition: data.description || data.composition,
        category: data.category || 'mixed',
        unit: data.unit_id || data.unit || 'meter',
        
        // ✅ Store in custom_fields
        custom_fields: {
            ...(data.custom_fields || {}),
            color: data.color,
            color_hex: data.color_hex,
            sku: data.sku,
            barcode: data.barcode,
        },
        
        // ✅ Correct column names
        min_stock: data.min_stock_level || data.min_stock || 0,
        reorder_point: data.max_stock_level || data.reorder_point || 0,
        
        // ✅ Boolean to VARCHAR
        status: (data.is_active ?? true) ? 'active' : 'inactive',
        
        notes: data.notes,
    };

    // Create or Update logic...
};
```

---

## 🎨 المتغيرات (Variants)

عند تفعيل المتغيرات:

```typescript
if (data.has_variants && data.variant_colors && data.variant_colors.length > 0) {
    const materialsToCreate = data.variant_colors.map((color: string) => ({
        ...materialData,
        name_ar: `${data.name_ar} - ${color}`,
        name_en: data.name_en ? `${data.name_en} - ${color}` : undefined,
        code: `${data.code}-${color.substring(0, 3).toUpperCase()}`,
        custom_fields: {
            ...materialData.custom_fields,
            color: color,  // ✅ Each variant has its color
        },
    }));

    await warehouseService.createMaterials(materialsToCreate);
}
```

**مثال**:
- Input: قماش قطني + [أحمر، أزرق، أخضر]
- Output:
  - `FAB-1234-أحم` - قماش قطني - أحمر
  - `FAB-1234-أزر` - قماش قطني - أزرق
  - `FAB-1234-أخض` - قماش قطني - أخضر

---

## 📊 Data Flow

### **Create Material**:
```
1. User fills form
2. MaterialOverviewTab collects data
3. handleSave() maps to fabric_materials schema
4. warehouseService.createMaterial()
5. INSERT INTO fabric_materials
6. loadMaterials() refreshes list
7. Material appears in table ✅
```

### **Create Variants**:
```
1. User fills form + selects 3 colors
2. handleSave() creates array of 3 materials
3. warehouseService.createMaterials()
4. INSERT INTO fabric_materials (3 rows)
5. loadMaterials() refreshes list
6. All 3 materials appear in table ✅
```

### **Update Material**:
```
1. User clicks Edit
2. MaterialOverviewTab shows data
3. User modifies fields
4. handleSave() maps to fabric_materials schema
5. warehouseService.updateMaterial()
6. UPDATE fabric_materials
7. loadMaterials() refreshes list
8. Material updated in table ✅
```

### **Delete Material**:
```
1. User clicks Delete
2. Confirmation dialog
3. onDelete() handler
4. warehouseService.deleteMaterial()
5. DELETE FROM fabric_materials
6. loadMaterials() refreshes list
7. Material removed from table ✅
```

---

## ⚠️ ملاحظات هامة

### **1. لا يوجد Tree Structure في `fabric_materials`**
- ❌ لا يوجد `parent_id`
- ❌ لا يوجد `is_group`
- ❌ لا يوجد `level`
- ❌ لا يوجد `path`

**الحل**: استخدام `fabric_groups` للتصنيفات الهرمية.

### **2. الحقول المخزنة في `custom_fields`**
- `color` (text)
- `color_hex` (hex code)
- `sku` (SKU code)
- `barcode` (barcode)

### **3. `status` بدلاً من `is_active`**
- `'active'` = Active
- `'inactive'` = Inactive
- يمكن أيضاً: `'discontinued'`, `'out_of_stock'`, etc.

### **4. `unit` هو VARCHAR وليس UUID**
- قيم مباشرة: `'meter'`, `'kg'`, `'piece'`, `'roll'`
- ليس foreign key إلى جدول units

---

## ✅ الملفات المعدلة

| الملف | التغييرات |
|------|-----------|
| `warehouseService.ts` | ✅ تحديث جميع الدوال لاستخدام `fabric_materials` |
| `MaterialsPage.tsx` | ✅ تحديث `handleSave` مع mapping صحيح |
| `MaterialsPage.tsx` | ✅ إضافة `user` من `useAuth` |

---

## 🧪 الاختبار

### **Test Case 1: إضافة مادة واحدة**
```
1. Click "مادة جديدة"
2. Select category: "أقمشة"
3. Code auto-generated: "FAB-1234"
4. Fill:
   - Name AR: "قماش قطني"
   - Name EN: "Cotton Fabric"
   - Description: "قماش قطني عالي الجودة"
   - Unit: "متر"
   - Color: "أبيض"
5. Click "حفظ"
6. Check database:
   - fabric_materials table should have 1 new row
   - custom_fields should contain color data
7. Check UI:
   - Material should appear in table
```

### **Test Case 2: إضافة مادة بمتغيرات**
```
1. Click "مادة جديدة"
2. Fill basic info
3. Enable "المتغيرات"
4. Select 3 colors: أحمر، أزرق، أخضر
5. Click "حفظ"
6. Check database:
   - fabric_materials table should have 3 new rows
   - Each with different code and color in custom_fields
7. Check UI:
   - All 3 materials should appear in table
```

### **Test Case 3: تعديل مادة**
```
1. Click "تعديل" on a material
2. Change name_ar to "قماش حرير"
3. Click "حفظ"
4. Check database:
   - name_ar should be updated
5. Check UI:
   - Material name should be updated in table
```

### **Test Case 4: حذف مادة**
```
1. Click "حذف" on a material
2. Confirm deletion
3. Check database:
   - Material should be deleted
4. Check UI:
   - Material should disappear from table
```

---

## 🎉 الخلاصة

تم تطبيق CRUD كامل للمواد مع:

1. ✅ استخدام `fabric_materials` الحقيقي
2. ✅ Mapping صحيح لجميع الحقول
3. ✅ دعم المتغيرات (ألوان متعددة)
4. ✅ Create/Read/Update/Delete
5. ✅ تخزين البيانات الإضافية في `custom_fields`
6. ✅ تحويل `is_active` إلى `status`

**النظام جاهز للاختبار!** 🚀

جرّب الآن:
1. افتح صفحة المواد
2. اضغط "مادة جديدة"
3. املأ البيانات
4. احفظ
5. تحقق من ظهور المادة في الجدول!

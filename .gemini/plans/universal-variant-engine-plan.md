# 🏗️ خطة عمل: محرك المتغيرات العام (Universal Variant Engine)
> **الإصدار:** 1.0 — 22 فبراير 2026
> **الهدف:** بناء نظام متغيرات مركزي قابل للتخصيص يعمل عبر كل الوحدات
> **الأولوية:** عالية — يؤثر على المخزون، المشتريات، المبيعات، والتقارير

---

## 📐 الرؤية المعمارية

```
┌──────────────────────────────────────────────────────────────┐
│                  Universal Variant Engine                      │
│                                                                │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Variant Axes │──▶│ Axis Values  │──▶│ Product Variants │   │
│  │ (محاور)      │   │ (قيم)        │   │ (متغيرات فعلية)  │   │
│  │              │   │              │   │                    │   │
│  │ • اللون      │   │ • أحمر       │   │ COTTON-PLAIN-RED  │   │
│  │ • التصميم    │   │ • سادة       │   │ COTTON-PLAIN-BLUE │   │
│  │ • المقاس     │   │ • XL         │   │ SHIRT-BLUE-XL     │   │
│  │ • [مخصص]     │   │ • [مخصص]     │   │ [أي تركيبة]       │   │
│  └─────────────┘   └──────────────┘   └──────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Integration Layer (طبقة التكامل)            │  │
│  │  📦 المخزون  │  🧾 الفواتير  │  🚢 الكونتينرات  │  📊 التقارير  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 البنية الهرمية للمتغيرات

### السيناريو 1: ألوان فقط
```
📦 قماش قطني (COTTON)
├── 🔴 COTTON-RED     → مخزون: 150م
├── 🔵 COTTON-BLUE    → مخزون: 200م
└── ⚪ COTTON-WHITE   → مخزون: 80م
```

### السيناريو 2: تصاميم فقط
```
📦 قماش قطني (COTTON)
├── 📐 COTTON-PLAIN    → مخزون: 300م
├── 📐 COTTON-STRIPED  → مخزون: 150م
└── 📐 COTTON-FLORAL   → مخزون: 100م
```

### السيناريو 3: تصاميم + ألوان تحتها (هرمي)
```
📦 قماش قطني (COTTON)
├── 📐 سادة (Plain)
│   ├── 🔴 COTTON-PLAIN-RED     → مخزون: 100م
│   ├── 🔵 COTTON-PLAIN-BLUE    → مخزون: 80م
│   └── ⚪ COTTON-PLAIN-WHITE   → مخزون: 120م
│
└── 📐 مقلّم (Striped)
    ├── ⚫ COTTON-STRIPED-BLACK  → مخزون: 90م
    └── 🟤 COTTON-STRIPED-BROWN → مخزون: 60م
```

### السيناريو 4: محاور مخصصة (مثال إلكترونيات)
```
📱 هاتف Galaxy
├── ⚫ أسود (BLACK)
│   ├── 💾 128GB → GALAXY-BLACK-128
│   └── 💾 256GB → GALAXY-BLACK-256
└── 🔵 أزرق (BLUE)
    ├── 💾 128GB → GALAXY-BLUE-128
    └── 💾 256GB → GALAXY-BLUE-256
```

---

## 🗃️ المرحلة 1: قاعدة البيانات (Database Schema)
> **التعقيد:** متوسط | **المدة المقدّرة:** جلسة واحدة

### 1.1 جدول محاور المتغيرات (variant_axes)
```sql
CREATE TABLE variant_axes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    
    -- التعريف
    code            VARCHAR(50) NOT NULL,       -- 'COLOR', 'DESIGN', 'SIZE'
    name_ar         VARCHAR(100) NOT NULL,       -- 'اللون'
    name_en         VARCHAR(100),                -- 'Color'
    description_ar  TEXT,
    description_en  TEXT,
    
    -- النوع والسلوك
    axis_type       VARCHAR(20) NOT NULL DEFAULT 'text',  
                    -- 'color' (مع hex), 'text', 'number', 'image'
    display_type    VARCHAR(20) DEFAULT 'chips',          
                    -- 'chips', 'dropdown', 'color_swatches', 'images'
    
    -- الترتيب والحالة
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    is_system       BOOLEAN DEFAULT false,       -- محاور نظامية لا يمكن حذفها
    
    -- الطوابع
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(company_id, code)
);
```

**المحاور الافتراضية (System Axes):**
| code | name_ar | name_en | axis_type | display_type |
|------|---------|---------|-----------|--------------|
| COLOR | اللون | Color | color | color_swatches |
| DESIGN | التصميم | Design | image | images |
| SIZE | المقاس | Size | text | chips |
| WEIGHT | الوزن | Weight | number | dropdown |
| MATERIAL_TYPE | نوع الخامة | Material Type | text | dropdown |

### 1.2 جدول قيم المحاور (variant_axis_values)
```sql
CREATE TABLE variant_axis_values (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    axis_id         UUID NOT NULL REFERENCES variant_axes(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    
    -- التعريف
    code            VARCHAR(50) NOT NULL,        -- 'RED', 'PLAIN', 'XL'
    name_ar         VARCHAR(100) NOT NULL,        -- 'أحمر', 'سادة'
    name_en         VARCHAR(100),                 -- 'Red', 'Plain'
    
    -- خصائص حسب النوع
    hex_code        VARCHAR(7),                   -- '#FF0000' (لمحور الألوان)
    image_url       TEXT,                          -- صورة (للتصاميم)
    numeric_value   NUMERIC,                       -- قيمة رقمية (للوزن/المقاس)
    
    -- تجميع (اختياري)
    color_family    VARCHAR(30),                   -- 'red', 'blue', 'neutral'
    
    -- الترتيب والحالة
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    
    -- الطوابع
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(axis_id, company_id, code)
);
```

### 1.3 جدول ربط المنتج بالمحاور المفعّلة (product_variant_config)
```sql
CREATE TABLE product_variant_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL,                -- fabric_materials.id (أو أي جدول منتجات)
    product_table   VARCHAR(50) NOT NULL DEFAULT 'fabric_materials',
    axis_id         UUID NOT NULL REFERENCES variant_axes(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    
    -- الإعدادات
    is_required     BOOLEAN DEFAULT false,         -- هل المحور إلزامي؟
    is_hierarchical BOOLEAN DEFAULT false,         -- هل يُعرض كشجرة؟
    parent_axis_id  UUID REFERENCES variant_axes(id), -- المحور الأب (مثلاً: اللون تحت التصميم)
    sort_order      INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(product_id, axis_id)
);
```

### 1.4 جدول المتغيرات الفعلية (product_variants) — تحديث
```sql
-- تحديث الجدول الموجود product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS parent_product_id UUID;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS product_table VARCHAR(50) DEFAULT 'fabric_materials';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS display_name_ar VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_data JSONB DEFAULT '{}';
    -- يخزن بيانات إضافية مثل: السعر المختلف، وزن مختلف، إلخ
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

### 1.5 جدول قيم المتغير (product_variant_values)
```sql
CREATE TABLE product_variant_values (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    axis_id         UUID NOT NULL REFERENCES variant_axes(id),
    value_id        UUID NOT NULL REFERENCES variant_axis_values(id),
    
    created_at      TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(variant_id, axis_id)  -- كل متغير له قيمة واحدة فقط لكل محور
);
```

### 1.6 إضافة أعمدة لجدول fabric_materials
```sql
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS parent_material_id UUID REFERENCES fabric_materials(id);
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE fabric_materials ADD COLUMN IF NOT EXISTS is_variant_parent BOOLEAN DEFAULT false;
```

### 1.7 ترحيل بيانات fabric_colors → variant_axis_values
```sql
-- نقل الألوان الموجودة إلى النظام الجديد
INSERT INTO variant_axis_values (axis_id, tenant_id, company_id, code, name_ar, name_en, hex_code, color_family, sort_order)
SELECT 
    (SELECT id FROM variant_axes WHERE code = 'COLOR' AND company_id = fc.company_id),
    fc.tenant_id, fc.company_id,
    fc.code, fc.name_ar, fc.name_en, fc.hex_code, fc.color_family, fc.sort_order
FROM fabric_colors fc
WHERE NOT EXISTS (
    SELECT 1 FROM variant_axis_values v 
    WHERE v.code = fc.code AND v.company_id = fc.company_id 
    AND v.axis_id = (SELECT id FROM variant_axes WHERE code = 'COLOR' AND company_id = fc.company_id)
);
```

### 1.8 سياسات RLS
```sql
-- variant_axes
ALTER TABLE variant_axes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variant_axes_tenant" ON variant_axes
    FOR ALL USING (tenant_id = get_tenant_id());

-- variant_axis_values
ALTER TABLE variant_axis_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variant_axis_values_tenant" ON variant_axis_values
    FOR ALL USING (tenant_id = get_tenant_id());

-- product_variant_config
ALTER TABLE product_variant_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variant_config_company" ON product_variant_config
    FOR ALL USING (company_id IN (SELECT id FROM companies WHERE tenant_id = get_tenant_id()));

-- product_variant_values
ALTER TABLE product_variant_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variant_values_tenant" ON product_variant_values
    FOR ALL USING (variant_id IN (SELECT id FROM product_variants WHERE tenant_id = get_tenant_id()));
```

---

## 🔧 المرحلة 2: الخدمة الخلفية (Variant Service)
> **التعقيد:** متوسط | **المدة المقدّرة:** جلسة واحدة

### 2.1 ملف الخدمة: `src/services/variantService.ts`

```typescript
// الوظائف المطلوبة:
export const variantService = {
    // ═══ إدارة المحاور ═══
    getAxes(companyId): Promise<VariantAxis[]>,
    createAxis(data): Promise<VariantAxis>,
    updateAxis(id, data): Promise<VariantAxis>,
    deleteAxis(id): Promise<void>,
    
    // ═══ إدارة القيم ═══
    getAxisValues(axisId, companyId): Promise<AxisValue[]>,
    createAxisValue(data): Promise<AxisValue>,
    updateAxisValue(id, data): Promise<AxisValue>,
    deleteAxisValue(id): Promise<void>,
    batchCreateValues(axisId, values[]): Promise<AxisValue[]>,
    
    // ═══ إعداد المنتج ═══
    getProductVariantConfig(productId): Promise<VariantConfig[]>,
    setProductVariantConfig(productId, axes[]): Promise<void>,
    
    // ═══ إدارة المتغيرات الفعلية ═══
    getProductVariants(productId): Promise<ProductVariant[]>,
    createVariant(data): Promise<ProductVariant>,
    generateVariants(productId, options): Promise<ProductVariant[]>,  // توليد تلقائي
    deleteVariant(id): Promise<void>,
    
    // ═══ مساعد: توليد الأكواد ═══
    generateVariantSKU(parentCode, axisValues[]): string,
    
    // ═══ ترحيل البيانات ═══
    migrateFabricColors(companyId): Promise<void>,
};
```

### 2.2 الأنواع (Types): `src/types/variants.ts`

```typescript
export interface VariantAxis {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    axis_type: 'color' | 'text' | 'number' | 'image';
    display_type: 'chips' | 'dropdown' | 'color_swatches' | 'images';
    sort_order: number;
    is_active: boolean;
    is_system: boolean;
    values?: AxisValue[];  // populated on fetch
}

export interface AxisValue {
    id: string;
    axis_id: string;
    code: string;
    name_ar: string;
    name_en: string;
    hex_code?: string;
    image_url?: string;
    numeric_value?: number;
    color_family?: string;
    sort_order: number;
    is_active: boolean;
}

export interface ProductVariantConfig {
    product_id: string;
    axis_id: string;
    axis: VariantAxis;
    is_required: boolean;
    is_hierarchical: boolean;
    parent_axis_id?: string;
    sort_order: number;
}

export interface ProductVariant {
    id: string;
    parent_product_id: string;
    sku: string;
    name_ar: string;
    name_en: string;
    display_name_ar: string;
    display_name_en: string;
    is_active: boolean;
    variant_data: Record<string, any>;
    values: ProductVariantValue[];
    // populated fields
    material?: any;  // linked fabric_material if exists
}

export interface ProductVariantValue {
    variant_id: string;
    axis_id: string;
    value_id: string;
    axis?: VariantAxis;
    value?: AxisValue;
}
```

---

## 🎨 المرحلة 3: واجهة إدارة المحاور والقيم (Settings)
> **التعقيد:** متوسط | **المدة المقدّرة:** جلسة واحدة

### 3.1 صفحة إعدادات المحاور
**الموقع:** إعدادات المخزون → المحاور والمتغيرات

```
┌─────────────────────────────────────────────────┐
│ ⚙️ إعدادات المحاور والمتغيرات                    │
│                                                   │
│ ┌───────────────────────────────────────────────┐ │
│ │ 🎨 اللون (COLOR)            [تعديل] [حذف]   │ │
│ │    نوع: ألوان | عرض: بطاقات ألوان              │ │
│ │    القيم: 🔴 أحمر  🔵 أزرق  ⚪ أبيض  +12     │ │
│ ├───────────────────────────────────────────────┤ │
│ │ 📐 التصميم (DESIGN)         [تعديل] [حذف]   │ │
│ │    نوع: صور | عرض: صور                         │ │
│ │    القيم: سادة  مقلّم  منقّط  +3              │ │
│ ├───────────────────────────────────────────────┤ │
│ │ 📏 المقاس (SIZE)            [تعديل] [حذف]   │ │
│ │    نوع: نص | عرض: شرائح                        │ │
│ │    القيم: S  M  L  XL  XXL                     │ │
│ ├───────────────────────────────────────────────┤ │
│ │      [+ إضافة محور جديد]                      │ │
│ └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.2 ملحّقة إضافة/تعديل محور
```
┌──────────────────────────────────┐
│ ✏️ تعديل محور: اللون              │
│                                    │
│ الكود:    [COLOR        ]         │
│ الاسم عربي: [اللون     ]         │
│ الاسم إنجليزي: [Color   ]         │
│                                    │
│ النوع: [🎨 ألوان ▾]              │
│ العرض: [بطاقات ألوان ▾]          │
│                                    │
│ ═══ القيم ═══                     │
│ ┌──┬──────┬───────┬────────┬───┐  │
│ │# │ الكود│ العربي│ الإنجليزي│ اللون│
│ ├──┼──────┼───────┼────────┼───┤  │
│ │1 │ RED  │ أحمر  │ Red    │🔴 │  │
│ │2 │ BLUE │ أزرق  │ Blue   │🔵 │  │
│ │3 │ WHITE│ أبيض  │ White  │⚪ │  │
│ │+ │ إضافة قيمة...              │  │
│ └──┴──────┴───────┴────────┴───┘  │
│                                    │
│        [إلغاء]    [💾 حفظ]        │
└──────────────────────────────────┘
```

---

## 🌳 المرحلة 4: واجهة المتغيرات في المادة (الشجرة التفاعلية)
> **التعقيد:** عالي | **المدة المقدّرة:** جلستين

### 4.1 تبويب المتغيرات المُطوّر (MaterialVariantsTab v2)

**الحالة A: لم يتم تفعيل متغيرات بعد**
```
┌─────────────────────────────────────────────────┐
│ 🧩 المتغيرات                                     │
│                                                   │
│ ┌───────────────────────────────────────────────┐ │
│ │ ℹ️ لم يتم تفعيل أي محور متغيرات لهذه المادة   │ │
│ │                                                 │ │
│ │ اختر المحاور التي تريد تفعيلها:                │ │
│ │                                                 │ │
│ │ ☐ 🎨 اللون — إنشاء متغيرات بألوان مختلفة      │ │
│ │ ☐ 📐 التصميم — إنشاء متغيرات بتصاميم مختلفة   │ │
│ │ ☐ 📏 المقاس — إنشاء متغيرات بمقاسات مختلفة    │ │
│ │                                                 │ │
│ │ 💡 يمكنك تفعيل أكثر من محور وجعلها هرمية       │ │
│ │    (مثل: تصميم → ألوان تحت كل تصميم)           │ │
│ └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**الحالة B: ألوان فقط مفعّلة**
```
┌─────────────────────────────────────────────────┐
│ 🧩 المتغيرات    المحاور: [🎨 اللون ☑]            │
│                                                   │
│ ┌───┬────────────────┬────────┬────────┬───────┐ │
│ │ # │ اللون           │ الكود  │ المخزون│ الحالة│ │
│ ├───┼────────────────┼────────┼────────┼───────┤ │
│ │ 1 │ 🔴 أحمر         │COT-RED │ 150م  │ ✅    │ │
│ │ 2 │ 🔵 أزرق         │COT-BLU │ 200م  │ ✅    │ │
│ │ 3 │ ⚪ أبيض         │COT-WHT │ 80م   │ ✅    │ │
│ │ + │ [إضافة لون...]                            │ │
│ └───┴────────────────┴────────┴────────┴───────┘ │
│                                                   │
│ إجمالي: 3 متغيرات | مخزون كلي: 430م             │
└─────────────────────────────────────────────────┘
```

**الحالة C: تصاميم + ألوان (شجرة قابلة للطي)**
```
┌─────────────────────────────────────────────────┐
│ 🧩 المتغيرات    [📐 التصميم ☑] → [🎨 اللون ☑]   │
│                                                   │
│ ▼ 📐 سادة (Plain)                    3 ألوان    │
│ ┌───┬────────────────┬────────────┬────────┬───┐ │
│ │   │ 🔴 أحمر         │COT-PLN-RED│ 100م  │ ✅│ │
│ │   │ 🔵 أزرق         │COT-PLN-BLU│ 80م   │ ✅│ │
│ │   │ ⚪ أبيض         │COT-PLN-WHT│ 120م  │ ✅│ │
│ │   │ [+ إضافة لون لـ سادة]                    │ │
│ └───┴────────────────┴────────────┴────────┴───┘ │
│                                                   │
│ ▶ 📐 مقلّم (Striped)                 2 ألوان    │
│                                                   │
│ ▶ 📐 منقّط (Dotted)                  0 ألوان    │
│                                                   │
│ [+ إضافة تصميم جديد]                             │
│                                                   │
│ إجمالي: 5 متغيرات | مخزون كلي: 450م             │
└─────────────────────────────────────────────────┘
```

### 4.2 المكوّنات المطلوبة:
```
src/features/warehouse/components/variants/
├── VariantAxisSelector.tsx      — اختيار المحاور المفعّلة
├── VariantValuePicker.tsx       — اختيار/إضافة قيم لمحور
├── VariantTreeView.tsx          — العرض الشجري (expandable rows)
├── VariantFlatView.tsx          — العرض المسطح (جدول بسيط)
├── VariantGeneratorDialog.tsx   — حوار التوليد التلقائي
├── VariantColorSwatch.tsx       — بطاقة لون (مع hex)
├── VariantDesignCard.tsx        — بطاقة تصميم (مع صورة)
└── index.ts
```

---

## 🔗 المرحلة 5: التكامل مع الأنظمة الحالية
> **التعقيد:** عالي | **المدة المقدّرة:** جلستين

### 5.1 التكامل مع المخزون
- كل متغير = سجل في `fabric_materials` مع `parent_material_id`
- المتغير يرث: المجموعة، الوحدة، الحد الأدنى، إعدادات الرولون
- المتغير له مخزون مستقل: `current_stock`, `fabric_rolls`
- صفحة المواد تعرض المادة الأم مع عدد المتغيرات كـ badge

### 5.2 التكامل مع الفواتير (CartItemsView)
- عند اختيار مادة لها متغيرات → يظهر selector للمتغير
- مثال: اخترت "قماش قطني" → يظهر: [سادة-أحمر] [سادة-أزرق] [مقلّم-أسود]
- المتغير المختار هو الذي يُسجّل في بند الفاتورة

### 5.3 التكامل مع الكونتينرات
- عند استلام كونتينر، كل بند يمكن تعيينه لمتغير معيّن
- مثال: استلمت 300م قطني → 100م للأحمر + 100م للأزرق + 100م للأبيض

### 5.4 التكامل مع التقارير
- تقرير مخزون حسب اللون
- تقرير مخزون حسب التصميم
- تقرير مبيعات حسب المتغير
- حركة المتغير عبر الزمن

---

## 📋 خطة التنفيذ بالمراحل المصغّرة

### 🔹 المرحلة 1A: البنية التحتية (الأولوية القصوى) — ✅ مُنجزة 2026-02-22
| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 1 | إنشاء migration SQL للجداول الخمسة | `migrations/20260222_universal_variant_engine.sql` | ✅ |
| 2 | إضافة RLS policies (16 سياسة) | نفس الملف | ✅ |
| 3 | إضافة المحاور الافتراضية (5 محاور × 8 شركات) | Seed SQL | ✅ |
| 4 | ترحيل بيانات fabric_colors (10 سجلات) | Seed SQL | ✅ |
| 5 | إضافة أعمدة fabric_materials (4 أعمدة) | نفس الملف | ✅ |

### 🔹 المرحلة 1B: الخدمة الخلفية
| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 6 | إنشاء Types | `src/types/variants.ts` | ⬜ |
| 7 | إنشاء variantService.ts | `src/services/variantService.ts` | ⬜ |
| 8 | إنشاء useVariants hook | `src/hooks/useVariants.ts` | ⬜ |

### 🔹 المرحلة 2A: واجهة إدارة المحاور
| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 9 | صفحة إعدادات المحاور | `VariantAxesSettings.tsx` | ⬜ |
| 10 | حوار إضافة/تعديل محور | `AxisDialog.tsx` | ⬜ |
| 11 | إدارة القيم داخل المحور | `AxisValuesManager.tsx` | ⬜ |
| 12 | ربط الصفحة بإعدادات المخزون | `WarehouseModule.tsx` | ⬜ |

### 🔹 المرحلة 2B: تبويب المتغيرات في المادة
| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 13 | VariantAxisSelector | `components/variants/` | ⬜ |
| 14 | VariantValuePicker | `components/variants/` | ⬜ |
| 15 | VariantTreeView (expandable) | `components/variants/` | ⬜ |
| 16 | تحديث MaterialVariantsTab | `tabs/MaterialVariantsTab.tsx` | ⬜ |
| 17 | VariantGeneratorDialog | `components/variants/` | ⬜ |

### 🔹 المرحلة 3: التكامل
| # | المهمة | الملفات | الحالة |
|---|--------|---------|--------|
| 18 | تحديث MaterialsPage لعرض المتغيرات | `MaterialsPage.tsx` | ⬜ |
| 19 | تحديث CartItemsView لاختيار المتغير | `CartItemsView.tsx` | ⬜ |
| 20 | تكامل مع نظام الاستلام | `warehouseService.ts` | ⬜ |
| 21 | ترجمات عربي/إنجليزي | `ar.json`, `en.json` | ⬜ |
| 22 | اختبار شامل + توثيق | - | ⬜ |

---

## 🎯 معايير النجاح

- [ ] المستخدم يستطيع تعريف محاور مخصصة (لون، تصميم، مقاس، أو أي محور)
- [ ] المستخدم يستطيع إضافة قيم لكل محور (أحمر، أزرق... / سادة، مقلّم...)
- [ ] المستخدم يستطيع تفعيل محاور لمادة معيّنة
- [ ] المتغيرات تُنشأ تلقائياً أو يدوياً
- [ ] كل متغير له كود ومخزون مستقل
- [ ] البنية الشجرية تعمل (تصميم → ألوان تحته)
- [ ] التكامل مع الفواتير والكونتينرات يعمل
- [ ] النظام يعمل مع أي نوع منتجات (وليس فقط الأقمشة)

---

## 📝 ملاحظات مهمة

1. **جدول fabric_colors موجود** → يتم ترحيل بياناته تلقائياً
2. **جدول product_variants موجود** → يتم توسيعه بدل إنشاء جديد
3. **الواجهة تدعم RTL** بالكامل
4. **المحاور النظامية** (COLOR, DESIGN, SIZE) لا يمكن حذفها
5. **الأداء**: استخدام React Query مع staleTime مناسب
6. **الأمان**: كل الجداول محمية بـ RLS

---

## 🚀 نقطة البداية المقترحة

**ابدأ بالمرحلة 1A** (إنشاء الجداول + المحاور الافتراضية)، ثم **1B** (الخدمة)، ثم ننتقل مباشرة لـ **2B** (تبويب المتغيرات في المادة) — لأنه الجزء الأكثر قيمة للمستخدم.

صفحة إعدادات المحاور (2A) يمكن تأجيلها قليلاً لأن المحاور الافتراضية ستكفي في البداية.

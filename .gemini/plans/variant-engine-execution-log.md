# 📋 سجل تنفيذ محرك المتغيرات العام
## Universal Variant Engine — Implementation Log

---

## ✅ المرحلة 1A: قاعدة البيانات (مُنجزة)
> **تاريخ التنفيذ:** 2026-02-22
> **ملف الـ Migration:** `supabase/migrations/20260222_universal_variant_engine.sql`

### الجداول المُنشأة:

| # | الجدول | الأعمدة | السجلات | الحالة |
|---|--------|---------|---------|--------|
| 1 | `variant_axes` | 14 عمود | 40 (5 محاور × 8 شركات) | ✅ |
| 2 | `variant_axis_values` | 14 عمود | 40 (16 لون + 8 تصاميم + 6 مقاسات + ترحيل) | ✅ |
| 3 | `product_variant_config` | 9 أعمدة | 0 (يُملأ عند تفعيل المتغيرات) | ✅ |
| 4 | `product_variant_values` | 5 أعمدة | 0 (يُملأ عند إنشاء المتغيرات) | ✅ |

### الجداول المُعدَّلة:

| # | الجدول | الأعمدة المُضافة | الحالة |
|---|--------|-------------------|--------|
| 5 | `product_variants` | +9 أعمدة: `company_id`, `parent_product_id`, `product_table`, `name_en`, `display_name_ar`, `display_name_en`, `is_active`, `sort_order`, `variant_data`, `updated_at` | ✅ |
| 6 | `fabric_materials` | +4 أعمدة: `has_variants`, `is_variant_parent`, `parent_material_id`, `variant_id` | ✅ |

### سياسات RLS:

| الجدول | SELECT | INSERT | UPDATE | DELETE | ملاحظة |
|--------|--------|--------|--------|--------|--------|
| `variant_axes` | ✅ tenant | ✅ tenant | ✅ tenant | ✅ tenant + !is_system | الحذف ممنوع للمحاور النظامية |
| `variant_axis_values` | ✅ tenant | ✅ tenant | ✅ tenant | ✅ tenant | — |
| `product_variant_config` | ✅ company→tenant | ✅ company→tenant | ✅ company→tenant | ✅ company→tenant | — |
| `product_variant_values` | ✅ variant→tenant | ✅ variant→tenant | ✅ variant→tenant | ✅ variant→tenant | — |

### الفهارس (Indexes):

| الفهرس | الجدول | العمود |
|--------|--------|--------|
| `idx_variant_axes_company` | variant_axes | company_id |
| `idx_variant_axes_tenant` | variant_axes | tenant_id |
| `idx_variant_axis_values_axis` | variant_axis_values | axis_id |
| `idx_variant_axis_values_company` | variant_axis_values | company_id |
| `idx_product_variant_config_product` | product_variant_config | product_id |
| `idx_product_variant_config_axis` | product_variant_config | axis_id |
| `idx_product_variants_parent` | product_variants | parent_product_id |
| `idx_product_variants_company` | product_variants | company_id |
| `idx_product_variant_values_variant` | product_variant_values | variant_id |
| `idx_fabric_materials_parent` | fabric_materials | parent_material_id |
| `idx_fabric_materials_variant` | fabric_materials | variant_id |

### الـ Triggers:

| Trigger | الجدول | الوظيفة |
|---------|--------|---------|
| `trg_variant_axes_updated` | variant_axes | تحديث updated_at تلقائياً |
| `trg_variant_axis_values_updated` | variant_axis_values | تحديث updated_at تلقائياً |
| `trg_product_variants_updated` | product_variants | تحديث updated_at تلقائياً |

### البيانات المُدخلة (Seed Data):

#### المحاور الافتراضية (is_system = true):
| code | name_ar | name_en | axis_type | display_type |
|------|---------|---------|-----------|--------------|
| COLOR | اللون | Color | color | color_swatches |
| DESIGN | التصميم | Design | image | images |
| SIZE | المقاس | Size | text | chips |
| WEIGHT | الوزن | Weight | number | dropdown |
| MATERIAL_TYPE | نوع الخامة | Material Type | text | dropdown |

#### قيم محور اللون (16 لون):
| code | name_ar | hex_code | color_family |
|------|---------|----------|--------------|
| WHITE | أبيض | #FFFFFF | neutral |
| BLACK | أسود | #000000 | neutral |
| BEIGE | بيج | #F5F5DC | neutral |
| NAVY | كحلي | #000080 | blue |
| RED | أحمر | #FF0000 | red |
| BLUE | أزرق | #0000FF | blue |
| GREEN | أخضر | #008000 | green |
| YELLOW | أصفر | #FFD700 | warm |
| BROWN | بني | #8B4513 | warm |
| GRAY | رمادي | #808080 | neutral |
| PINK | وردي | #FFC0CB | warm |
| ORANGE | برتقالي | #FF8C00 | warm |
| PURPLE | بنفسجي | #800080 | cool |
| GOLD | ذهبي | #FFD700 | warm |
| SILVER | فضي | #C0C0C0 | neutral |
| TURQ | فيروزي | #40E0D0 | cool |

#### قيم محور التصميم (8 تصاميم):
| code | name_ar | name_en |
|------|---------|---------|
| PLAIN | سادة | Plain |
| STRIPED | مقلّم | Striped |
| DOTTED | منقّط | Dotted |
| FLORAL | زهري | Floral |
| CHECKED | مربعات | Checked |
| TWILL | تويل | Twill |
| SATIN | ساتان | Satin |
| JACQUARD | جاكار | Jacquard |

#### قيم محور المقاس (6 مقاسات):
| code | name_ar | name_en |
|------|---------|---------|
| XS | صغير جداً | Extra Small |
| S | صغير | Small |
| M | متوسط | Medium |
| L | كبير | Large |
| XL | كبير جداً | Extra Large |
| XXL | كبير جداً جداً | XXL |

### ترحيل البيانات:
- ✅ `fabric_colors` (10 سجلات من شركة أخرى) → `variant_axis_values` تحت محور COLOR

---

## ✅ المرحلة 1B: الخدمة الخلفية (مُنجزة)
> **تاريخ التنفيذ:** 2026-02-22

### الملفات المُنشأة:

| # | الملف | الوصف | الحالة |
|---|-------|-------|--------|
| 6 | `src/types/variants.ts` | 12 interface + 3 type aliases | ✅ |
| 7 | `src/services/variantService.ts` | 15 دالة CRUD + توليد تلقائي | ✅ |
| 8 | `src/hooks/useVariants.ts` | 5 hooks مع React Query | ✅ |

### تفاصيل الأنواع (`types/variants.ts`):
| النوع | الوصف |
|-------|-------|
| `VariantAxis` | محور المتغيرات (لون، تصميم، مقاس) |
| `VariantAxisCreate` / `Update` | أنواع الإدخال/التعديل |
| `AxisValue` | قيمة محور (أحمر، سادة، XL) |
| `AxisValueCreate` / `Update` | أنواع الإدخال/التعديل |
| `ProductVariantConfig` | ربط منتج بمحاور مفعّلة |
| `ProductVariant` | المتغير الفعلي المُنشأ |
| `ProductVariantValue` | قيمة متغير من محور معيّن |
| `VariantTreeNode` | عقدة الشجرة للعرض الهرمي |
| `VariantGenerationOptions` | خيارات التوليد التلقائي |
| `VariantGenerationResult` | نتيجة التوليد |

### تفاصيل الخدمة (`services/variantService.ts`):
| الدالة | الوصف |
|--------|-------|
| `getAxes(companyId)` | جلب كل المحاور مع عدد القيم |
| `getAxisWithValues(axisId)` | جلب محور مع كل قيمه |
| `createAxis(...)` | إنشاء محور جديد |
| `updateAxis(...)` | تحديث محور |
| `deleteAxis(...)` | حذف محور (غير نظامي) |
| `getAxisValues(axisId)` | جلب قيم محور |
| `getValuesByAxisCode(companyId, code)` | جلب قيم بالكود (مثل كل الألوان) |
| `createAxisValue(...)` | إنشاء قيمة |
| `batchCreateValues(...)` | إنشاء عدة قيم دفعة واحدة |
| `updateAxisValue(...)` | تحديث قيمة |
| `deleteAxisValue(...)` | حذف قيمة |
| `getProductVariantConfig(productId)` | جلب إعدادات المنتج |
| `setProductVariantConfig(...)` | تعيين المحاور المفعّلة |
| `getProductVariants(productId)` | جلب متغيرات المنتج |
| `createVariant(...)` | إنشاء متغير |
| `deleteVariant(...)` | حذف متغير |
| `generateVariants(...)` | **توليد تلقائي** (Cartesian Product) |
| `generateVariantSKU(...)` | توليد كود SKU |

### تفاصيل الـ Hooks (`hooks/useVariants.ts`):
| Hook | الوصف |
|------|-------|
| `useVariantAxes()` | جلب المحاور + create/update/delete mutations |
| `useAxisValues(axisId)` | جلب القيم + CRUD + batch create |
| `useValuesByAxisCode(code)` | جلب قيم بكود المحور (مثل 'COLOR') |
| `useProductVariantConfig(productId)` | إعدادات المنتج + setConfig |
| `useProductVariants(productId)` | المتغيرات + create/generate/delete/toggle |

### التحقق:
- ✅ TypeScript compilation — لا أخطاء في الملفات الجديدة
- ✅ React Query cache invalidation مُعدّ بشكل صحيح
- ✅ staleTime = 5 دقائق للمحاور والقيم، 2 دقائق لإعدادات المنتج

## 🔲 المرحلة 2A: واجهة إدارة المحاور (قادمة)
| # | المهمة | الحالة |
|---|--------|--------|
| 9 | صفحة إعدادات المحاور | ⬜ |
| 10 | حوار إضافة/تعديل محور | ⬜ |
| 11 | إدارة القيم داخل المحور | ⬜ |
| 12 | ربط بإعدادات المخزون | ⬜ |

## ✅ المرحلة 2B: تبويب المتغيرات في المادة (مُنجزة)
> **تاريخ التنفيذ:** 2026-02-22

### الملفات المُنشأة/المُعدَّلة:

| # | الملف | الوصف | الحالة |
|---|-------|-------|--------|
| 13-16 | `tabs/MaterialVariantsTab.tsx` | إعادة بناء كاملة — 450+ سطر | ✅ |

### المكوّنات الفرعية (داخل الملف):
| المكوّن | الوظيفة |
|---------|---------|
| `InfoBanner` | لوحة معلومات توضيحية عن المتغيرات |
| `VariantRow` | صف متغير واحد (SKU + ألوان + شارات + حذف) |
| `GenerateDialog` | حوار التوليد التلقائي مع اختيار القيم |
| `AxisValueSelector` | اختيار قيم محور (chips بألوان + تحديد الكل/مسح) |
| `PreviewSection` | معاينة عدد المتغيرات المتوقعة قبل التوليد |

### الميزات المُنفَّذة:
- ✅ تفعيل/تعطيل المحاور لكل مادة
- ✅ خيار الهرمية (عرض كشجرة تحت محور آخر)
- ✅ زر توليد المتغيرات مع حوار تفاعلي
- ✅ اختيار القيم بالـ chips (مع بطاقات ألوان)
- ✅ أزرار "تحديد الكل" و "مسح"
- ✅ معاينة عدد المتغيرات المتوقعة (Cartesian Product)
- ✅ عرض شجري (Tree View) مع صفوف قابلة للطي
- ✅ عرض مسطح (Flat List) للمحور الواحد
- ✅ عرض SKU وأسماء وشارات لكل متغير
- ✅ حذف المتغير
- ✅ دعم RTL كامل
- ✅ حالة "احفظ المادة أولاً" لوضع الإنشاء
- ✅ Loading states

### التحقق:
- ✅ TypeScript compilation — لا أخطاء
- ✅ كل المكوّنات UI (Dialog, Checkbox, Badge, Switch) موجودة

---

## ✅ المرحلة 2C: إصلاح التوليد + الهيكلة الشجرية (مُنجزة)
> **تاريخ التنفيذ:** 2026-02-22

### الأخطاء المُصلَحة:

| # | الخطأ | السبب | الحل |
|---|-------|-------|------|
| 1 | `PGRST201` — FK مزدوج | `product_variant_config` له FK مزدوج لـ `variant_axes` (`axis_id` + `parent_axis_id`) | تحديد FK صريح: `!product_variant_config_axis_id_fkey` |
| 2 | `23503` — FK constraint violation | `product_variants.product_id` يشير لجدول `products` القديم بدل `fabric_materials` | حذف FK القديم `product_variants_product_id_fkey` — `product_id` أصبح polymorphic |
| 3 | نص أبيض على أبيض | chips المحددة تستخدم `bg-erp-primary` (فاتح) مع `text-white` | تغيير لـ `bg-indigo-600` مع `ring-2 ring-indigo-300` ثابت |
| 4 | المتغيرات لا تظهر في الشجرة | كانت تُنشأ فقط في `product_variants` بدون `fabric_materials` | إنشاء مواد فرعية مع `parent_material_id` و `variant_id` |
| 5 | أكواد مشفرة بدل أسماء | الشجرة تعرض الكود الطويل كنص رئيسي | إخفاء الكود عندما طوله > 15 حرف |
| 6 | تضارب الهرمية (كلا المحورين هرمي) | كلاهما يمكن تفعيلهما كـ hierarchical | قاعدة حصرية: محور واحد فقط + deadlock fix |

### الميزات المُضافة:

| # | الميزة | التفاصيل |
|---|--------|----------|
| 1 | **إضافة قيم مباشرة** | زر "+ إضافة" في حوار التوليد لإنشاء ألوان/تصاميم جديدة |
| 2 | **Color Picker** | لمحور الألوان — اختيار hex مباشر |
| 3 | **Auto-select** | القيمة الجديدة تُحدد تلقائياً بعد الإضافة |
| 4 | **هيكلية المجموعات** | عند التوليد: مجموعة رئيسية + مجموعات فرعية للتصاميم |
| 5 | **هرمية حصرية** | فقط محور واحد هرمي — مع رسائل توضيحية |
| 6 | **مؤشرات بصرية** | أيقونة `Layers 🟣` للمادة الأم + شارة "أم" + سهم ↳ للفرعيات |

### الهيكلية الناتجة عند التوليد:
```
📁 قطن سوري ملون (المجموعة الأصلية)
  ├── 📦 حموي ملون (المادة الأم) [شارة: أم 🟣]
  └── 📁 حموي ملون (مجموعة المتغيرات - تلقائية)
       ├── 📁 سادة (مجموعة تصميم فرعية)
       │    ├── 📦 حموي ملون - سادة / أحمر
       │    ├── 📦 حموي ملون - سادة / أزرق
       │    └── 📦 حموي ملون - سادة / أبيض
       ├── 📁 مقلّم
       │    └── ...
       └── 📁 منقّط
            └── ...
```

### الملفات المُعدَّلة:
| الملف | التعديل |
|-------|---------|
| `variantService.ts` | إنشاء مجموعات هرمية + مواد فرعية عند التوليد |
| `MaterialVariantsTab.tsx` | ألوان chips + هرمية حصرية + إضافة سريعة |
| `MaterialsPage.tsx` | دعم `parent_material_id` في الشجرة + مؤشرات بصرية |
| `MaterialTree.tsx` | إخفاء أكواد طويلة في الشجرة |
| `20260222_universal_variant_engine.sql` | حذف FK القديم |

---

## 🔲 المرحلة 2A: واجهة إدارة المحاور (قادمة)
> **الأولوية:** متوسطة — يمكن العمل بالمحاور النظامية
| # | المهمة | الحالة |
|---|--------|--------|
| 9 | صفحة إعدادات المحاور في إعدادات المخزون | ⬜ |
| 10 | حوار إضافة/تعديل محور (اسم + نوع + عرض) | ⬜ |
| 11 | إدارة القيم داخل المحور (CRUD + ترتيب) | ⬜ |
| 12 | ربط بقائمة إعدادات المخزون | ⬜ |

## 🔲 المرحلة 3: التكامل مع المبيعات والمشتريات
> **الأولوية:** عالية — لجعل المتغيرات تعمل عملياً
| # | المهمة | الوصف | الحالة |
|---|--------|-------|--------|
| 18 | فاتورة الشراء | إضافة عمود المتغير + اختيار المتغير عند إضافة مادة | ⬜ |
| 19 | فاتورة المبيع | نفس الشيء للمبيعات | ⬜ |
| 20 | استلام البضاعة | اختيار المتغير عند الاستلام | ⬜ |
| 21 | تقارير المخزون | عرض المخزون بالمتغيرات | ⬜ |
| 22 | حذف/أرشفة المتغيرات | حذف آمن مع فحص الارتباطات | ⬜ |

## 🔲 المرحلة 4: التلخيص والتقارير
> **الأولوية:** منخفضة
| # | المهمة | الحالة |
|---|--------|--------|
| 23 | dashboard المتغيرات (إحصائيات) | ⬜ |
| 24 | ربط مع التسعير (سعر مختلف لكل متغير) | ⬜ |
| 25 | تصدير/استيراد المتغيرات | ⬜ |

---

## 📊 مخطط العلاقات (ERD)

```
┌──────────────────┐     ┌────────────────────┐
│  variant_axes     │────▶│ variant_axis_values │
│                   │  1:N│                     │
│  id               │     │  id                 │
│  code (UNIQUE)    │     │  axis_id (FK)       │
│  name_ar/en       │     │  code (UNIQUE)      │
│  axis_type        │     │  name_ar/en         │
│  display_type     │     │  hex_code           │
│  is_system        │     │  image_url          │
└──────────────────┘     └────────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌────────────────────┐   ┌────────────────────┐
│product_variant_    │   │product_variant_    │
│config              │   │values              │
│                    │   │                    │
│  product_id (FK)   │   │  variant_id (FK)   │
│  axis_id (FK)      │   │  axis_id (FK)      │
│  is_hierarchical   │   │  value_id (FK)     │
│  parent_axis_id    │   │                    │
└────────────────────┘   └────────────────────┘
         │                         │
         │                         │
         ▼                         ▼
┌────────────────────┐   ┌────────────────────┐
│ fabric_materials   │◀──│ product_variants   │
│                    │   │                    │
│  has_variants      │   │  parent_product_id │
│  is_variant_parent │   │  sku               │
│  parent_material_id│   │  name_ar/en        │
│  variant_id (FK)   │   │  variant_data      │
└────────────────────┘   └────────────────────┘
```

# 🛒 تقرير موديول التجارة الإلكترونية والمتجر الإلكتروني
# E-Commerce & Online Store Module - Status & Implementation Plan

**التاريخ:** 25 يناير 2026  
**الحالة:** 🟡 البنية الأساسية موجودة - يحتاج تطوير

---

## 📊 الوضع الحالي - Current Status

### ✅ ما هو موجود (البنية الأساسية):

#### 1. جداول المنتجات - Products Tables:

```sql
✅ products
   • id, tenant_id, company_id
   • sku, barcode
   • name_ar, name_en, description
   • category_id, brand_id
   • default_cost, default_price
   • images JSONB DEFAULT '[]' ← يدعم صور متعددة
   • slug, meta_title, meta_description
   • is_visible_online BOOLEAN ← للمتجر الإلكتروني
   • is_featured BOOLEAN ← منتجات مميزة
   • custom_fields JSONB

✅ product_variants
   • id, tenant_id, product_id
   • sku, barcode
   • name_ar, name_en
   • attribute_values JSONB
   • cost_override, price_override
   • images JSONB ← صور الألوان/الأحجام
   • is_active
```

#### 2. نظام الأسعار - Pricing System:

```sql
✅ price_lists
   • id, tenant_id, company_id
   • code, name_ar, name_en
   • description
   • currency
   • is_default, is_active

✅ price_list_items
   • price_list_id, product_id, variant_id
   • price
   • min_quantity ← أسعار حسب الكمية
   • valid_from, valid_to ← أسعار محددة بوقت
```

#### 3. مجموعات العملاء - Customer Groups:

```sql
✅ customer_groups
   • code: 'WHOLESALE', 'RETAIL', 'VIP'
   • name_ar: 'تجار الجملة', 'تجار التجزئة'
   • default_discount_percent
   • credit_limit
   • payment_terms_days

✅ customers
   • group_id ← ربط بالمجموعة
   • price_list_id ← قائمة أسعار خاصة
```

#### 4. موديول الأقمشة المتقدم:

```sql
✅ fabric_materials
   • images JSONB ← صور الأقمشة
   • slug, is_visible_online
   • is_featured
   • purchase_price, selling_price

✅ fabric_material_colors
   • color_id, material_id
   • price_override ← سعر حسب اللون
   • image_url ← صورة اللون
```

---

## 🔴 ما هو مفقود - What's Missing

### 1. API Functions للمتجر الإلكتروني:

```sql
❌ get_products_for_store()
   • عرض المنتجات حسب العميل
   • فلترة حسب الفئة/البحث
   • ترتيب حسب السعر/الجديد

❌ get_product_details()
   • تفاصيل المنتج الكاملة
   • الصور
   • السعر حسب العميل
   • المخزون المتاح

❌ get_product_price_for_customer()
   • حساب السعر حسب:
     - نوع العميل (مسجل/غير مسجل)
     - مجموعة العميل (جملة/تجزئة/VIP)
     - قائمة الأسعار الخاصة
     - العروض النشطة
     - الخصومات

❌ get_customer_special_products()
   • منتجات خاصة بعميل معين
   • عروض حصرية

❌ check_product_availability()
   • التحقق من المخزون
   • الكمية المتاحة
   • تاريخ التوفر المتوقع
```

### 2. Shopping Cart System:

```sql
❌ shopping_carts table
❌ cart_items table
❌ add_to_cart() function
❌ update_cart() function
❌ clear_cart() function
```

### 3. Wishlist & Favorites:

```sql
❌ wishlists table
❌ favorite_products table
```

### 4. Product Reviews & Ratings:

```sql
❌ product_reviews table
❌ product_ratings table
```

### 5. Orders System (مختلف عن الفواتير):

```sql
❌ online_orders table
   • order_number
   • customer_id
   • shipping_address
   • billing_address
   • payment_method
   • shipping_method

❌ order_items table
❌ order_tracking table
```

---

## 🎯 الخطة المُوصى بها

### المرحلة 1: Backend APIs (أولوية عالية 🔴)

#### الوقت المقدر: 3-5 أيام

**يجب أن يكون في Backend (Database Functions):**

```sql
-- 1. دالة عرض المنتجات حسب العميل
CREATE OR REPLACE FUNCTION get_products_for_store(
    p_customer_id UUID DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    description TEXT,
    images JSONB,
    base_price DECIMAL,
    customer_price DECIMAL,
    discount_percent DECIMAL,
    is_on_sale BOOLEAN,
    stock_status VARCHAR,
    rating DECIMAL,
    reviews_count INT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.name_ar,
        p.name_en,
        p.description,
        p.images,
        p.default_price,
        CASE 
            -- عميل مسجل + قائمة أسعار خاصة
            WHEN p_customer_id IS NOT NULL AND c.price_list_id IS NOT NULL THEN
                COALESCE(
                    (SELECT price FROM price_list_items 
                     WHERE price_list_id = c.price_list_id 
                       AND product_id = p.id 
                     LIMIT 1),
                    p.default_price
                )
            -- عميل مسجل + خصم المجموعة
            WHEN p_customer_id IS NOT NULL AND c.group_id IS NOT NULL THEN
                p.default_price * (1 - COALESCE(cg.default_discount_percent, 0) / 100)
            -- غير مسجل أو بدون خصومات
            ELSE p.default_price
        END as customer_price,
        COALESCE(cg.default_discount_percent, 0) as discount_percent,
        false as is_on_sale, -- TODO: ربط بالعروض
        'in_stock' as stock_status, -- TODO: ربط بالمخزون
        0.0 as rating, -- TODO: ربط بالتقييمات
        0 as reviews_count
    FROM products p
    LEFT JOIN customers c ON c.id = p_customer_id
    LEFT JOIN customer_groups cg ON cg.id = c.group_id
    WHERE p.is_visible_online = true
      AND p.status = 'active'
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_search_term IS NULL OR 
           p.name_ar ILIKE '%' || p_search_term || '%' OR
           p.name_en ILIKE '%' || p_search_term || '%')
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 2. دالة حساب السعر للعميل
CREATE OR REPLACE FUNCTION calculate_product_price(
    p_product_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT 1
)
RETURNS TABLE (
    base_price DECIMAL,
    customer_price DECIMAL,
    discount_amount DECIMAL,
    discount_percent DECIMAL,
    final_price DECIMAL,
    price_source VARCHAR
)
AS $$
DECLARE
    v_base_price DECIMAL;
    v_customer_price DECIMAL;
    v_price_source VARCHAR;
    v_discount_percent DECIMAL := 0;
BEGIN
    -- 1. السعر الأساسي
    SELECT default_price INTO v_base_price
    FROM products WHERE id = p_product_id;
    
    -- 2. التحقق من قائمة أسعار خاصة
    IF p_customer_id IS NOT NULL THEN
        SELECT price, 'special_price_list' INTO v_customer_price, v_price_source
        FROM price_list_items pli
        JOIN customers c ON c.price_list_id = pli.price_list_id
        WHERE c.id = p_customer_id
          AND pli.product_id = p_product_id
          AND pli.min_quantity <= p_quantity
          AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
          AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
        ORDER BY pli.min_quantity DESC
        LIMIT 1;
    END IF;
    
    -- 3. خصم المجموعة
    IF v_customer_price IS NULL AND p_customer_id IS NOT NULL THEN
        SELECT 
            v_base_price * (1 - COALESCE(cg.default_discount_percent, 0) / 100),
            'group_discount',
            COALESCE(cg.default_discount_percent, 0)
        INTO v_customer_price, v_price_source, v_discount_percent
        FROM customers c
        JOIN customer_groups cg ON cg.id = c.group_id
        WHERE c.id = p_customer_id;
    END IF;
    
    -- 4. السعر العادي
    IF v_customer_price IS NULL THEN
        v_customer_price := v_base_price;
        v_price_source := 'base_price';
    END IF;
    
    RETURN QUERY
    SELECT 
        v_base_price,
        v_customer_price,
        v_base_price - v_customer_price as discount_amount,
        v_discount_percent,
        v_customer_price as final_price,
        v_price_source;
END;
$$ LANGUAGE plpgsql;

-- 3. دالة المنتجات الخاصة بالعميل
CREATE OR REPLACE FUNCTION get_customer_special_products(
    p_customer_id UUID
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name_ar VARCHAR,
    images JSONB,
    special_price DECIMAL,
    discount_percent DECIMAL,
    valid_until DATE
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.sku,
        p.name_ar,
        p.images,
        pli.price as special_price,
        ((p.default_price - pli.price) / p.default_price * 100) as discount_percent,
        pli.valid_to as valid_until
    FROM price_list_items pli
    JOIN products p ON p.id = pli.product_id
    JOIN customers c ON c.price_list_id = pli.price_list_id
    WHERE c.id = p_customer_id
      AND p.is_visible_online = true
      AND (pli.valid_from IS NULL OR pli.valid_from <= CURRENT_DATE)
      AND (pli.valid_to IS NULL OR pli.valid_to >= CURRENT_DATE)
    ORDER BY discount_percent DESC;
END;
$$ LANGUAGE plpgsql;
```

---

### المرحلة 2: Frontend Implementation (أولوية متوسطة 🟡)

#### الوقت المقدر: 5-7 أيام

**يجب أن يكون في Frontend (React Components):**

```typescript
// مكونات المتجر الإلكتروني

// 1. صفحة المنتجات
<ProductGrid 
  categoryId={categoryId}
  searchTerm={searchTerm}
  customerId={currentUser?.id}
/>

// 2. كارت المنتج
<ProductCard 
  product={product}
  showPrice={true}
  showDiscount={true}
  onAddToCart={handleAddToCart}
/>

// 3. تفاصيل المنتج
<ProductDetails 
  productId={productId}
  customerId={currentUser?.id}
  showCustomerPrice={true}
/>

// 4. معرض الصور
<ProductImageGallery 
  images={product.images}
  variants={product.variants}
/>

// 5. الأسعار الديناميكية
<PriceDisplay 
  basePrice={product.base_price}
  customerPrice={product.customer_price}
  discount={product.discount_percent}
  showOriginal={true}
/>
```

---

### المرحلة 3: Shopping Cart System (أولوية متوسطة 🟡)

#### الوقت المقدر: 3-4 أيام

**Backend Tables:**

```sql
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID REFERENCES customers(id),
    session_id VARCHAR(100), -- للزوار غير المسجلين
    
    currency VARCHAR(3) DEFAULT 'SAR',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    tax_total DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, customer_id),
    UNIQUE(tenant_id, session_id)
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cart_id, product_id, variant_id)
);
```

**Backend Functions:**

```sql
-- إضافة للسلة
add_to_cart(p_customer_id, p_product_id, p_quantity)

-- تحديث السلة
update_cart_item(p_cart_item_id, p_quantity)

-- حذف من السلة
remove_from_cart(p_cart_item_id)

-- الحصول على السلة
get_cart_details(p_customer_id)

-- تحويل السلة لطلب
convert_cart_to_order(p_cart_id)
```

---

## 🎯 الأولويات الموصى بها

### أولوية عالية جداً 🔴 (أسبوع واحد):

```
1. ✅ دالة get_products_for_store()
2. ✅ دالة calculate_product_price()
3. ✅ دالة get_customer_special_products()
4. ✅ ProductGrid Component (Frontend)
5. ✅ ProductCard Component (Frontend)
6. ✅ PriceDisplay Component (Frontend)
```

### أولوية عالية 🟠 (أسبوعان):

```
7. ✅ Shopping Cart Tables
8. ✅ Cart Functions (Backend)
9. ✅ Cart Components (Frontend)
10. ✅ Checkout Flow
```

### أولوية متوسطة 🟡 (شهر):

```
11. ✅ Product Reviews System
12. ✅ Wishlist System
13. ✅ Product Recommendations
14. ✅ Advanced Search & Filters
```

---

## 📋 خطة التنفيذ التفصيلية

### الأسبوع 1: Backend APIs

**اليوم 1-2:**
- ✅ إنشاء `get_products_for_store()` function
- ✅ إنشاء `calculate_product_price()` function
- ✅ اختبار Functions

**اليوم 3-4:**
- ✅ إنشاء `get_customer_special_products()` function
- ✅ إنشاء `get_product_details()` function
- ✅ إنشاء `check_product_availability()` function

**اليوم 5:**
- ✅ اختبارات شاملة
- ✅ توثيق APIs

### الأسبوع 2: Frontend Components

**اليوم 1-2:**
- ✅ ProductGrid Component
- ✅ ProductCard Component
- ✅ ربط مع Backend APIs

**اليوم 3-4:**
- ✅ ProductDetails Page
- ✅ ProductImageGallery Component
- ✅ PriceDisplay Component

**اليوم 5:**
- ✅ اختبارات UI/UX
- ✅ تحسينات الأداء

### الأسبوع 3: Shopping Cart

**اليوم 1-2:**
- ✅ إنشاء جداول السلة
- ✅ Functions الأساسية

**اليوم 3-4:**
- ✅ Cart Components (Frontend)
- ✅ Mini Cart في الـ Header

**اليوم 5:**
- ✅ Checkout Flow الأساسي
- ✅ اختبارات

---

## 🔧 الكود المُوصى به

### ملف SQL للـ E-Commerce Functions:

أنشئ ملف: `supabase/migrations/STEP_48_ecommerce_functions.sql`

```sql
-- ═══════════════════════════════════════════════════════════════
-- E-Commerce Functions للمتجر الإلكتروني
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════

-- [الكود الكامل للـ Functions أعلاه]
```

### React Components Structure:

```
src/features/ecommerce/
├── pages/
│   ├── StorePage.tsx
│   ├── ProductDetailsPage.tsx
│   ├── CartPage.tsx
│   └── CheckoutPage.tsx
├── components/
│   ├── ProductGrid.tsx
│   ├── ProductCard.tsx
│   ├── ProductImageGallery.tsx
│   ├── PriceDisplay.tsx
│   ├── AddToCartButton.tsx
│   ├── Cart/
│   │   ├── MiniCart.tsx
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   └── Filters/
│       ├── CategoryFilter.tsx
│       ├── PriceFilter.tsx
│       └── SearchBar.tsx
└── hooks/
    ├── useProducts.ts
    ├── useProductPrice.ts
    ├── useCart.ts
    └── useCheckout.ts
```

---

## 📊 ملخص التوصيات

### ما يجب أن يكون في Backend:

```
✅ حساب الأسعار حسب العميل
✅ تطبيق الخصومات والعروض
✅ التحقق من المخزون
✅ إدارة السلة (CRUD)
✅ تحويل السلة لطلب/فاتورة
✅ حساب الضرائب والشحن
✅ RLS Policies للأمان
```

### ما يجب أن يكون في Frontend:

```
✅ عرض المنتجات (UI/UX)
✅ معرض الصور والتفاصيل
✅ واجهة السلة والـ Checkout
✅ الفلاتر والبحث (UI فقط)
✅ الـ Animations وال Transitions
✅ Responsive Design
✅ State Management (React Query)
```

---

## 🎯 الخلاصة النهائية

### الوضع الحالي:

```
✅ البنية الأساسية: موجودة 100%
   • جداول المنتجات ✅
   • الصور (JSONB) ✅
   • نظام الأسعار ✅
   • مجموعات العملاء ✅

🟡 الوظائف: ناقصة 70%
   • Functions للأسعار ❌
   • Shopping Cart ❌
   • Product APIs ❌

🟡 Frontend: ناقص 80%
   • Store Page ❌
   • Product Components ❌
   • Cart System ❌
```

### التوصية:

**1. ابدأ بالـ Backend (أسبوع واحد):**
- إنشاء Functions للأسعار
- APIs للمنتجات
- Shopping Cart System

**2. ثم Frontend (أسبوعان):**
- Store Pages
- Product Components
- Cart & Checkout

**3. المدة الإجمالية: 3-4 أسابيع**

**4. التكلفة المقدرة:**
- Backend Developer: 1 أسبوع
- Frontend Developer: 2 أسبوع
- إجمالي: 3 أسابيع عمل

---

**هل تريد أن أنشئ الكود الكامل لـ Backend Functions الآن؟** 🚀

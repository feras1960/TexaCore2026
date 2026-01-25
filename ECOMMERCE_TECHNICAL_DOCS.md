# 🔧 التوثيق التقني المفصّل
# E-Commerce System - Technical Documentation

---

## 📋 **جدول المحتويات**

1. [البنية العامة](#البنية-العامة)
2. [الجداول والعلاقات](#الجداول-والعلاقات)
3. [الدوال والـ API](#الدوال-والapi)
4. [أمثلة الاستخدام](#أمثلة-الاستخدام)
5. [معالجة الأخطاء](#معالجة-الأخطاء)
6. [Best Practices](#best-practices)

---

## 1️⃣ **البنية العامة**

### **معمارية النظام:**

```
┌─────────────────────────────────────────────┐
│          Frontend (React/TypeScript)         │
│              Texa Core UI                    │
└──────────────────┬──────────────────────────┘
                   │
                   │ Supabase Client
                   │
┌──────────────────▼──────────────────────────┐
│            Supabase API Layer                │
│    (Auth, RLS, Edge Functions)               │
└──────────────────┬──────────────────────────┘
                   │
                   │ PostgreSQL
                   │
┌──────────────────▼──────────────────────────┐
│         PostgreSQL Database                  │
│  ┌────────────────────────────────────────┐ │
│  │  Multi-Tenant E-Commerce System        │ │
│  │  - Customer Management                 │ │
│  │  - Product Catalog                     │ │
│  │  - Shopping Cart                       │ │
│  │  - Orders & Checkout                   │ │
│  │  - Reviews & Ratings                   │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 2️⃣ **الجداول والعلاقات**

### **ERD Diagram:**

```
tenants ──┐
          │
          ├── companies
          │      │
          │      ├── customer_groups
          │      │      │
          │      │      └── customers ───┬── shopping_carts
          │      │             │         │      │
          │      │             │         │      └── cart_items
          │      │             │         │
          │      │             │         ├── orders
          │      │             │         │      │
          │      │             │         │      └── order_items
          │      │             │         │
          │      │             │         ├── guest_checkouts
          │      │             │         │
          │      │             │         └── product_reviews
          │      │                              │
          │      │                              └── review_votes
          │      │
          │      └── price_lists
          │             │
          │             └── price_list_items
          │
          └── products ───┬── product_reviews
                          │
                          └── product_review_stats
```

### **الجداول الرئيسية:**

#### **1. customer_groups**
```sql
Purpose: تنظيم العملاء في مجموعات مع خصومات
Columns:
  - id: UUID
  - tenant_id: UUID (FK → tenants)
  - code: VARCHAR(50) UNIQUE
  - name_ar, name_en, ...: VARCHAR(100)
  - discount_percent: DECIMAL(5,2)
  - is_wholesale: BOOLEAN
  
Indexes:
  - idx_customer_groups_tenant
  - idx_customer_groups_code
```

#### **2. customers**
```sql
Purpose: بيانات العملاء
Columns:
  - id: UUID
  - tenant_id: UUID
  - code: VARCHAR(50) UNIQUE
  - name_ar: VARCHAR(200)
  - email: VARCHAR(255) UNIQUE
  - phone: VARCHAR(50)
  - customer_group_id: UUID (FK → customer_groups)
  - auth_user_id: UUID (Supabase Auth)
  
Relations:
  - shopping_carts (1:1)
  - orders (1:N)
  - product_reviews (1:N)
```

#### **3. shopping_carts**
```sql
Purpose: سلات التسوق
Columns:
  - id: UUID
  - tenant_id: UUID
  - customer_id: UUID (nullable for guests)
  - session_id: VARCHAR(255) (for guests)
  - expires_at: TIMESTAMPTZ
  
Relations:
  - cart_items (1:N)
```

#### **4. orders**
```sql
Purpose: الطلبات
Columns:
  - id: UUID
  - tenant_id: UUID
  - customer_id: UUID (nullable for guests)
  - order_number: VARCHAR(50) UNIQUE
  - status: VARCHAR(50)
  - payment_method: VARCHAR(50)
  - payment_status: VARCHAR(50)
  - subtotal, discount, tax, shipping, total: DECIMAL
  
Relations:
  - order_items (1:N)
  - guest_checkouts (1:1 optional)
```

#### **5. product_reviews**
```sql
Purpose: تقييمات المنتجات
Columns:
  - id: UUID
  - tenant_id: UUID
  - product_id: UUID
  - customer_id: UUID
  - rating: INT (1-5)
  - title, comment: TEXT
  - is_verified_purchase: BOOLEAN
  - status: VARCHAR(20) (pending/approved/rejected)
  - seller_response: TEXT
  
Relations:
  - review_votes (1:N)
```

---

## 3️⃣ **الدوال والـ API**

### **تصنيف الدوال:**

#### **A. Product Display Functions**

**1. `get_products_for_store()`**
```sql
Purpose: عرض المنتجات للمتجر مع الأسعار المخصصة
Parameters:
  - p_tenant_id: UUID
  - p_company_id: UUID
  - p_customer_id: UUID (nullable)
  - p_category_id: UUID (nullable)
  - p_min_price: DECIMAL (nullable)
  - p_max_price: DECIMAL (nullable)
  - p_is_featured: BOOLEAN (nullable)
  - p_search_term: VARCHAR (nullable)
  - p_sort_by: VARCHAR (default: 'created_at')
  - p_sort_order: VARCHAR (default: 'DESC')
  - p_limit: INT (default: 20)
  - p_offset: INT (default: 0)

Returns: TABLE
  - id, sku, barcode
  - name_ar, name_en, description
  - category_id, category_name_ar
  - images (JSONB array)
  - base_price, customer_price
  - discount_percent, discount_amount
  - price_source (base_price/group_discount/special_price_list)
  - stock_status, available_quantity
  - rating, reviews_count

Logic:
  1. تحديد مجموعة العميل
  2. جلب خصم المجموعة
  3. جلب قائمة أسعار خاصة
  4. حساب السعر النهائي
  5. فلترة المنتجات المرئية
  6. فلترة حسب الصلاحيات
  7. ترتيب النتائج
```

**2. `can_customer_access_product()`**
```sql
Purpose: التحقق من صلاحية العميل للوصول للمنتج
Parameters:
  - p_tenant_id: UUID
  - p_customer_id: UUID (nullable)
  - p_product_id: UUID

Returns: BOOLEAN

Logic:
  1. إذا المنتج عام → true
  2. إذا زائر والمنتج محدود → false
  3. إذا مجموعة العميل في allowed_customer_groups → true
  4. إذا customer_id في allowed_customers → true
  5. else → false
```

#### **B. Shopping Cart Functions**

**3. `add_to_cart()`**
```sql
Purpose: إضافة منتج للسلة
Parameters:
  - p_tenant_id: UUID
  - p_customer_id: UUID (nullable)
  - p_session_id: VARCHAR (nullable)
  - p_product_id: UUID
  - p_quantity: DECIMAL

Returns: JSONB
  {
    "success": true/false,
    "cart_id": "...",
    "cart_item_id": "...",
    "message": "..."
  }

Logic:
  1. الحصول على/إنشاء سلة
  2. التحقق من توفر المنتج
  3. حساب السعر
  4. إضافة أو تحديث العنصر
  5. إرجاع النتيجة
```

**4. `get_cart_with_items()`**
```sql
Purpose: عرض السلة مع جميع التفاصيل
Parameters:
  - p_tenant_id: UUID
  - p_customer_id: UUID (nullable)
  - p_session_id: VARCHAR (nullable)

Returns: TABLE
  - cart_id, cart_created_at
  - item_id, product_id, product_name
  - quantity, unit_price, total_price
  - product_image, stock_status

+ Summary:
  - subtotal, discount, tax, shipping, total
  - items_count
```

#### **C. Checkout Functions**

**5. `create_order_from_cart()`**
```sql
Purpose: إنشاء طلب من السلة
Parameters:
  - p_tenant_id: UUID
  - p_company_id: UUID
  - p_cart_id: UUID
  - p_customer_id: UUID (nullable)
  - p_guest_checkout_id: UUID (nullable)
  - p_payment_method: VARCHAR
  - p_shipping_address: JSONB (nullable)
  - p_notes: TEXT (nullable)

Returns: JSONB
  {
    "success": true/false,
    "order_id": "...",
    "order_number": "...",
    "total": 250.00,
    "message": "..."
  }

Logic:
  1. التحقق من السلة
  2. حساب الإجماليات
  3. إنشاء الطلب
  4. نسخ العناصر من السلة
  5. تفريغ السلة
  6. إرجاع رقم الطلب
```

#### **D. Review Functions**

**6. `add_product_review()`**
```sql
Purpose: إضافة تقييم للمنتج
Parameters:
  - p_tenant_id: UUID
  - p_product_id: UUID
  - p_customer_id: UUID
  - p_order_id: UUID (nullable)
  - p_rating: INT (1-5)
  - p_title: VARCHAR (nullable)
  - p_comment: TEXT (nullable)
  - p_images: JSONB (nullable)

Returns: JSONB
  {
    "success": true/false,
    "review_id": "...",
    "message": "..."
  }

Logic:
  1. التحقق من وجود طلب سابق (verified)
  2. إنشاء التقييم
  3. تحديث الإحصائيات
  4. إرجاع النتيجة
```

---

## 4️⃣ **أمثلة الاستخدام**

### **سيناريو كامل: زائر → عميل مسجل → طلب**

```typescript
// 1. عرض المنتجات (زائر)
const products = await supabase.rpc('get_products_for_store', {
  p_tenant_id: 'tenant-uuid',
  p_company_id: 'company-uuid',
  p_customer_id: null, // زائر
  p_limit: 20,
  p_offset: 0
});

// 2. إضافة للسلة (زائر)
const cartResult = await supabase.rpc('add_to_cart', {
  p_tenant_id: 'tenant-uuid',
  p_customer_id: null,
  p_session_id: 'session-123',
  p_product_id: 'product-uuid',
  p_quantity: 2
});

// 3. تسجيل عميل جديد
const registerResult = await supabase.rpc('register_online_customer', {
  p_tenant_id: 'tenant-uuid',
  p_company_id: 'company-uuid',
  p_email: 'customer@example.com',
  p_password: 'SecurePass123',
  p_name_ar: 'أحمد محمد',
  p_phone: '+1234567890'
});

// 4. دمج سلة الزائر
const mergeResult = await supabase.rpc('merge_guest_cart_to_customer', {
  p_tenant_id: 'tenant-uuid',
  p_customer_id: registerResult.customer_id,
  p_session_id: 'session-123'
});

// 5. عرض السلة
const cart = await supabase.rpc('get_cart_with_items', {
  p_tenant_id: 'tenant-uuid',
  p_customer_id: registerResult.customer_id,
  p_session_id: null
});

// 6. إنشاء طلب
const orderResult = await supabase.rpc('create_order_from_cart', {
  p_tenant_id: 'tenant-uuid',
  p_company_id: 'company-uuid',
  p_cart_id: cart[0].cart_id,
  p_customer_id: registerResult.customer_id,
  p_payment_method: 'cash_on_delivery',
  p_shipping_address: {
    street: '123 Main St',
    city: 'Cairo',
    country: 'Egypt'
  }
});

// 7. إضافة تقييم (بعد الاستلام)
const reviewResult = await supabase.rpc('add_product_review', {
  p_tenant_id: 'tenant-uuid',
  p_product_id: 'product-uuid',
  p_customer_id: registerResult.customer_id,
  p_order_id: orderResult.order_id,
  p_rating: 5,
  p_title: 'منتج رائع',
  p_comment: 'جودة عالية وتوصيل سريع'
});
```

---

## 5️⃣ **معالجة الأخطاء**

### **أنواع الأخطاء:**

```typescript
// 1. Product Not Found
{
  "success": false,
  "error": "المنتج غير موجود"
}

// 2. Out of Stock
{
  "success": false,
  "error": "المنتج غير متوفر في المخزون"
}

// 3. Cart Empty
{
  "success": false,
  "error": "السلة فارغة"
}

// 4. Duplicate Review
{
  "success": false,
  "error": "لقد قمت بتقييم هذا المنتج من قبل"
}

// 5. Permission Denied
{
  "success": false,
  "error": "ليس لديك صلاحية الوصول لهذا المنتج"
}
```

### **معالجة في Frontend:**

```typescript
try {
  const result = await supabase.rpc('add_to_cart', params);
  
  if (result.data.success) {
    toast.success(result.data.message);
  } else {
    toast.error(result.data.error || result.data.message);
  }
} catch (error) {
  console.error('Error adding to cart:', error);
  toast.error('حدث خطأ غير متوقع');
}
```

---

## 6️⃣ **Best Practices**

### **للمطورين:**

**1. استخدام الدوال بدلاً من الاستعلامات المباشرة:**
```typescript
// ❌ خطأ
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('tenant_id', tenantId);

// ✅ صحيح
const { data } = await supabase.rpc('get_products_for_store', {
  p_tenant_id: tenantId,
  // ... parameters
});
```

**2. معالجة حالات الزوار والعملاء:**
```typescript
const customerId = user ? user.id : null;
const sessionId = user ? null : getSessionId();

await supabase.rpc('add_to_cart', {
  p_tenant_id: tenantId,
  p_customer_id: customerId,
  p_session_id: sessionId,
  // ...
});
```

**3. التحقق من النتائج:**
```typescript
const result = await supabase.rpc('function_name', params);

if (!result.data || !result.data.success) {
  // معالجة الخطأ
  throw new Error(result.data?.error || 'Unknown error');
}

// متابعة العمل
const dataToUse = result.data;
```

**4. Caching للبيانات الثابتة:**
```typescript
// Cache product categories (don't change often)
const cachedCategories = useMemo(() => {
  return fetchCategories();
}, [tenantId]);
```

**5. Pagination للقوائم الطويلة:**
```typescript
const ITEMS_PER_PAGE = 20;

const loadMore = async (offset: number) => {
  const products = await supabase.rpc('get_products_for_store', {
    p_limit: ITEMS_PER_PAGE,
    p_offset: offset,
    // ...
  });
  
  return products.data;
};
```

---

## 📊 **Performance Tips**

### **1. Database Level:**
```sql
-- استخدم Indexes بحكمة
CREATE INDEX IF NOT EXISTS idx_products_tenant_visible 
ON products(tenant_id, is_visible_online) 
WHERE is_visible_online = true;

-- استخدم Materialized Views للإحصائيات
CREATE MATERIALIZED VIEW product_stats_mv AS
SELECT 
  product_id,
  COUNT(*) as reviews_count,
  AVG(rating) as avg_rating
FROM product_reviews
WHERE status = 'approved'
GROUP BY product_id;
```

### **2. Application Level:**
```typescript
// استخدم React Query للـ Caching
const { data: products, isLoading } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => fetchProducts(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Debounce للبحث
const debouncedSearch = useDe bounce((term: string) => {
  searchProducts(term);
}, 500);
```

---

## 🔐 **Security Checklist**

- ✅ RLS enabled على جميع الجداول
- ✅ جميع الدوال تستخدم `SECURITY DEFINER`
- ✅ فحص `tenant_id` في كل استعلام
- ✅ فحص صلاحيات العميل قبل الوصول
- ✅ معالجة SQL injection عبر parameterized queries
- ✅ Hash للـ passwords في `auth.users`
- ✅ Session expiry للسلات
- ✅ Rate limiting على API calls

---

**آخر تحديث:** 25 يناير 2026  
**النسخة:** 1.0.0  
**المطور:** Texa Core Team

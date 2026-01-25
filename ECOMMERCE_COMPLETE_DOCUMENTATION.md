# 📚 توثيق شامل: نظام التجارة الإلكترونية
# E-Commerce System Complete Documentation

**التاريخ:** 25 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** قيد التطوير

---

## 📋 جدول المحتويات

1. [نظرة عامة](#overview)
2. [الهيكل العام](#architecture)
3. [STEP_48: E-Commerce Functions](#step48)
4. [STEP_49: Visibility Control](#step49)
5. [STEP_50: Product Images](#step50)
6. [STEP_51: Customer Registration](#step51)
7. [STEP_52: Shopping Cart](#step52)
8. [الاستخدام والأمثلة](#usage)
9. [الخطوات القادمة](#next-steps)

---

<a name="overview"></a>
## 1️⃣ نظرة عامة

### ✅ ما تم إنجازه حتى الآن:

| STEP | الاسم | الحالة | الوصف |
|------|-------|--------|-------|
| **48** | E-Commerce Functions | ✅ مُنفّذ | Functions أساسية للمتجر |
| **49** | Visibility Control | ✅ مُنفّذ | التحكم بالظهور |
| **50** | Product Images | ✅ مُنفّذ | نظام الصور |
| **51** | Customer Registration | ✅ مُنفّذ | تسجيل العملاء |
| **52** | Shopping Cart | ✅ مُنفّذ | سلة المشتريات |

### 🎯 الميزات المتوفرة:

```
✅ عرض المنتجات مع أسعار ديناميكية
✅ أسعار مختلفة (مفرد/جملة/VIP)
✅ قوائم أسعار خاصة
✅ تحكم كامل بالظهور (customer/group/time-based)
✅ نظام صور متقدم (JSONB + Supabase Storage)
✅ تسجيل عملاء مرتبط بـ tenant/company
✅ سلة مشتريات للزوار والمسجلين
✅ دمج تلقائي للسلة عند التسجيل
✅ حساب تلقائي للمجاميع
```

---

<a name="architecture"></a>
## 2️⃣ الهيكل العام

### 📊 علاقة الجداول:

```
tenants (المستأجرين)
   ├─ companies (الشركات)
   │     ├─ products (المنتجات)
   │     │     ├─ images (JSONB)
   │     │     ├─ prices (ديناميكية)
   │     │     └─ visibility (التحكم بالظهور)
   │     │
   │     ├─ customers (العملاء)
   │     │     ├─ auth_user_id → auth.users
   │     │     ├─ customer_groups (مجموعات)
   │     │     └─ price_lists (قوائم أسعار)
   │     │
   │     └─ shopping_carts (السلات)
   │           ├─ customer_id (للمسجلين)
   │           ├─ session_id (للزوار)
   │           └─ cart_items (العناصر)
   │
   └─ user_profiles (ملفات المستخدمين)
         ├─ role ('customer', 'admin', ...)
         └─ customer_id (إذا customer)
```

### 🔐 الأمان:

- ✅ **RLS Policies** على جميع الجداول
- ✅ **Tenant Isolation** كامل
- ✅ **Role-based Access Control**
- ✅ العملاء يرون بياناتهم فقط
- ✅ الإداريون يرون بيانات tenant/company

---

<a name="step48"></a>
## 3️⃣ STEP_48: E-Commerce Functions

**الملف:** `supabase/migrations/STEP_48_ecommerce_functions.sql`  
**السطور:** 530  
**الحالة:** ✅ مُنفّذ بنجاح

### 📦 Functions المُنشأة (4):

#### 1. `get_products_for_store()`
```sql
-- عرض المنتجات للمتجر مع الأسعار الديناميكية
الدخل:
  • tenant_id
  • customer_id (optional)
  • filters (category, price range, search, etc.)
  • sorting
  • pagination

الخرج:
  • product details
  • base_price
  • customer_price (حسب نوع العميل)
  • discount_percent
  • stock_status
  • images
```

**الميزات:**
- ✅ حساب السعر حسب العميل (مفرد/جملة/VIP)
- ✅ تطبيق خصومات customer_groups
- ✅ تطبيق price_lists الخاصة
- ✅ Tiered pricing (خصم حسب الكمية)
- ✅ التحقق من المخزون real-time

#### 2. `calculate_product_price()`
```sql
-- حساب السعر لمنتج محدد
الميزات:
  • أولوية: Special Price List > Group Discount > Base
  • حساب الخصم المالي والنسبي
  • دعم الكميات (tiered pricing)
```

#### 3. `get_customer_special_products()`
```sql
-- المنتجات الحصرية للعميل
الميزات:
  • منتجات VIP فقط
  • منتجات خاصة بعميل محدد
  • عروض حصرية
```

#### 4. `check_product_availability()`
```sql
-- التحقق من توفر المنتج
الخرج:
  • in_stock / out_of_stock / low_stock
  • available_quantity
  • من عدة مخازن
```

---

<a name="step49"></a>
## 4️⃣ STEP_49: Visibility Control

**الملف:** `supabase/migrations/STEP_49_ecommerce_visibility_control.sql`  
**السطور:** 650  
**الحالة:** ✅ مُنفّذ بنجاح

### 📦 الجداول المُنشأة (2):

#### 1. `category_customer_access`
```sql
التحكم في ظهور الفئات للعملاء/المجموعات

الأعمدة:
  • category_id
  • customer_id OR customer_group_id
  • access_type ('allow', 'deny')
  • valid_from, valid_to (محدد بالوقت)
```

#### 2. `product_customer_access`
```sql
التحكم في ظهور المنتجات للعملاء/المجموعات

نفس الهيكل، لكن للمنتجات
```

### 📦 Functions المُنشأة (4):

#### 1. `can_customer_access_category()`
```sql
التحقق من صلاحية الوصول للفئة

المنطق:
  1. تحقق من is_visible_online
  2. تحقق من صلاحية مباشرة للعميل
  3. تحقق من صلاحية المجموعة
  4. الافتراضي: السماح
```

#### 2. `can_customer_access_product()`
```sql
التحقق من صلاحية الوصول للمنتج

يشمل التحقق من الفئة أولاً
```

#### 3. `get_available_categories_for_customer()`
```sql
عرض الفئات المتاحة مع عدد المنتجات
```

#### 4. `get_products_for_store()` (محدّثة)
```sql
تم تحديثها لتشمل التحقق التلقائي من الصلاحيات
```

### 🎯 حالات الاستخدام:

```sql
-- 1. منتجات VIP فقط
INSERT INTO product_customer_access (
    customer_group_id = 'VIP',
    access_type = 'allow'
);

-- 2. منع التجزئة من الجملة
INSERT INTO product_customer_access (
    customer_group_id = 'RETAIL',
    product_id = wholesale_product,
    access_type = 'deny'
);

-- 3. عروض محددة بوقت
valid_from = '2026-03-01',
valid_to = '2026-03-30'
```

---

<a name="step50"></a>
## 5️⃣ STEP_50: Product Images

**الملف:** `supabase/migrations/STEP_50_product_images_storage.sql`  
**السطور:** 417  
**الحالة:** ✅ مُنفّذ بنجاح

### 📦 المكونات:

#### 1. Supabase Storage Bucket
```
product-images
  • Public (للقراءة)
  • Max 5MB per image
  • Formats: JPEG, PNG, WebP, GIF
  • RLS: tenant isolation
```

#### 2. JSONB في products.images
```json
[
  {
    "url": "tenant_id/product_id/image1.jpg",
    "is_primary": true,
    "alt_text": "Front view",
    "display_order": 1,
    "uploaded_at": "2026-01-25T..."
  }
]
```

### 📦 Functions المُنشأة (5):

```sql
1. add_product_image() - إضافة صورة
2. remove_product_image() - حذف صورة
3. set_primary_product_image() - تعيين رئيسية
4. reorder_product_images() - إعادة ترتيب
5. get_product_primary_image() - جلب الرئيسية
```

### 🎯 الاستخدام:

```sql
-- إضافة صورة
SELECT add_product_image(
    'tenant_id',
    'product_id',
    'tenant_id/product_id/image.jpg',
    true, -- is_primary
    'Product front view'
);

-- جلب الصورة الرئيسية
SELECT get_product_primary_image('product_id');
```

---

<a name="step51"></a>
## 6️⃣ STEP_51: Customer Registration

**الملف:** `supabase/migrations/STEP_51_customer_registration_system.sql`  
**السطور:** 691  
**الحالة:** ✅ مُنفّذ بنجاح

### 📦 التعديلات على الجداول:

#### 1. `customers`
```sql
+ auth_user_id UUID → auth.users(id)
  • Unique constraint
  • Index للأداء
```

#### 2. `user_profiles`
```sql
+ customer_id UUID → customers(id)
  • Index للأداء
  • ربط العملاء بـ profiles
```

### 📦 Functions المُنشأة (7):

#### 1. `register_customer()`
```sql
تسجيل عميل جديد

الخطوات:
  1. التحقق من عدم تكرار Email
  2. إنشاء auth.users (Supabase Auth)
  3. توليد customer_code (CUST-XXXXX)
  4. إنشاء customers record
  5. إنشاء user_profiles (role='customer')
  6. ربط auth_user_id و customer_id

الدخل:
  • email, password, full_name, phone
  • tenant_id, company_id
  • customer_group_code (default: RETAIL)

الخرج:
  • success: true/false
  • customer_id
  • customer_code
  • auth_user_id
```

#### 2. `link_existing_customer_to_auth()`
```sql
ربط عميل موجود بحساب auth

للعملاء المُدخلين يدوياً مسبقاً
```

#### 3. `get_customer_profile()`
```sql
جلب بيانات العميل الكاملة

من auth.uid() مباشرة
```

#### 4. `update_customer_profile()`
```sql
تحديث البيانات الشخصية
```

#### 5-7. Helper Functions
```sql
• is_customer() - التحقق من role
• get_customer_id_from_auth() - جلب customer_id
• generate_customer_code() - توليد كود فريد
```

### 🔐 RLS Policies:

```sql
✅ العملاء يرون بياناتهم فقط
✅ العملاء يعدلون بياناتهم فقط
✅ الإداريون يرون جميع عملاء الشركة
```

### 🎯 Flow التسجيل:

```
1. عميل يدخل بياناته (Frontend)
   ↓
2. Supabase Auth signup (auth.users)
   ↓
3. Backend يستدعي register_customer()
   ↓
4. إنشاء customers (مرتبط بـ tenant/company)
   ↓
5. إنشاء user_profiles (role='customer')
   ↓
6. ربط auth_user_id ↔ customer_id
   ↓
7. العميل يمكنه الدخول والتسوق ✅
```

---

<a name="step52"></a>
## 7️⃣ STEP_52: Shopping Cart

**الملف:** `supabase/migrations/STEP_52_shopping_cart_system.sql`  
**السطور:** ~900  
**الحالة:** ✅ مُنفّذ بنجاح

### 📦 الجداول المُنشأة (2):

#### 1. `shopping_carts`
```sql
السلات الأساسية

الأعمدة الرئيسية:
  • customer_id (للمسجلين) OR session_id (للزوار)
  • status ('active', 'abandoned', 'converted')
  • subtotal, discount, total
  • promo_code, promo_discount
  • expires_at (30 يوم)

Constraints:
  • عميل واحد = سلة واحدة نشطة
  • إما customer_id أو session_id
```

#### 2. `shopping_cart_items`
```sql
عناصر السلة

الأعمدة الرئيسية:
  • product_id, product_variant_id
  • quantity
  • unit_price (محفوظ عند الإضافة)
  • original_price, discount_percent
  • subtotal (generated column)
  • price_changed, availability_changed

Constraints:
  • منتج واحد مرة واحدة في السلة
```

### 📦 Functions المُنشأة (9):

#### 1. `get_or_create_cart()`
```sql
الحصول على سلة نشطة أو إنشاء جديدة

تلقائياً للزوار والمسجلين
```

#### 2. `add_to_cart()`
```sql
إضافة منتج للسلة

الميزات:
  • حساب السعر حسب العميل
  • التحقق من التوفر
  • حفظ السعر عند الإضافة
  • تحديث تلقائي للمجاميع
  • إذا موجود: زيادة الكمية

الدخل:
  • tenant_id, company_id
  • product_id, quantity
  • customer_id OR session_id
  • product_variant_id (optional)

الخرج:
  • success, cart_id, item_id
  • أو error (insufficient_stock, product_not_found)
```

#### 3. `update_cart_item()`
```sql
تحديث كمية منتج
```

#### 4. `remove_from_cart()`
```sql
حذف منتج من السلة
```

#### 5. `get_cart()`
```sql
جلب السلة الكاملة

الخرج:
  • جميع العناصر
  • بيانات المنتج (اسم، صورة)
  • الأسعار
  • التوفر الحالي
  • تنبيهات تغيير السعر
```

#### 6. `update_cart_totals()`
```sql
حساب المجاميع تلقائياً

يُستدعى بعد كل تعديل
```

#### 7. `merge_carts()`
```sql
دمج سلة الزائر مع سلة العميل

عند تسجيل الدخول:
  1. نقل جميع العناصر من سلة الزائر
  2. دمج الكميات إذا كان المنتج موجود
  3. حذف سلة الزائر
  4. تحديث المجاميع
```

#### 8. `clear_cart()`
```sql
إفراغ السلة من جميع العناصر
```

#### 9. `get_cart_summary()`
```sql
ملخص السلة (للـ UI)

الخرج:
  • items_count
  • total_quantity
  • subtotal, discount, total
  • currency
  • updated_at
```

### 🎯 Scenarios:

#### Scenario 1: زائر يتسوق
```
1. زائر يزور الموقع → session_id من Frontend
2. يضيف منتجات → add_to_cart(..., session_id)
3. السلة محفوظة (30 يوم)
```

#### Scenario 2: زائر يسجل دخول
```
1. زائر لديه سلة (session_id)
2. يسجل دخول → customer_id
3. Frontend يستدعي merge_carts(customer_id, session_id)
4. السلة تُدمج تلقائياً ✅
```

#### Scenario 3: عميل مسجل
```
1. عميل يدخل → auth.uid() → customer_id
2. يضيف منتجات → add_to_cart(..., customer_id)
3. السلة محفوظة دائماً
```

---

<a name="usage"></a>
## 8️⃣ الاستخدام والأمثلة

### 📱 Frontend Integration

#### مثال 1: عرض المنتجات
```javascript
// Frontend (JavaScript/TypeScript)
const { data: products } = await supabase.rpc('get_products_for_store', {
  p_tenant_id: 'tenant_id',
  p_customer_id: user?.customer_id || null,
  p_category_id: null,
  p_search_term: 'قماش',
  p_min_price: null,
  p_max_price: null,
  p_is_featured: null,
  p_sort_by: 'price',
  p_sort_order: 'ASC',
  p_limit: 20,
  p_offset: 0
});
```

#### مثال 2: إضافة للسلة
```javascript
const { data } = await supabase.rpc('add_to_cart', {
  p_tenant_id: 'tenant_id',
  p_company_id: 'company_id',
  p_product_id: 'product_id',
  p_quantity: 2,
  p_customer_id: user?.customer_id || null,
  p_session_id: user ? null : sessionId
});

if (data.success) {
  toast.success('تمت الإضافة للسلة');
}
```

#### مثال 3: جلب السلة
```javascript
const { data: cartItems } = await supabase.rpc('get_cart', {
  p_tenant_id: 'tenant_id',
  p_customer_id: user?.customer_id || null,
  p_session_id: user ? null : sessionId
});
```

#### مثال 4: دمج السلة عند تسجيل الدخول
```javascript
// بعد نجاح Login
const sessionId = localStorage.getItem('guest_session_id');

if (sessionId) {
  await supabase.rpc('merge_carts', {
    p_tenant_id: 'tenant_id',
    p_customer_id: user.customer_id,
    p_session_id: sessionId
  });
  
  localStorage.removeItem('guest_session_id');
}
```

---

<a name="next-steps"></a>
## 9️⃣ الخطوات القادمة

### 🎯 الأولوية العالية (Phase 1):

| STEP | الاسم | الوقت | الحالة |
|------|-------|-------|--------|
| **53** | Guest Checkout | 3-4h | 🟡 قادم |
| **54** | Orders System | 6-8h | 🟡 قادم |
| **55** | Multi-Currency | 3-4h | 🟡 قادم |
| **56** | Payment - Stripe | 6-8h | 🟡 قادم |
| **57** | Shipping - Nova Poshta | 4-6h | 🟡 قادم |

### 🎯 الميزات المحسّنة (Phase 2):

| STEP | الاسم | الوقت |
|------|-------|-------|
| **58** | Wishlist | 2-3h |
| **59** | Reviews & Ratings | 4-5h |
| **60** | Product Recommendations | 5-6h |
| **61** | Advanced Search | 5-6h |
| **62** | Stock Alerts | 3-4h |
| **63** | Abandoned Cart Recovery | 4-5h |
| **64** | Promo Codes | 5-6h |
| **65** | Flash Sales | 4-5h |

### 🎯 النظام الكامل (Phase 3):

| STEP | الاسم | الوقت |
|------|-------|-------|
| **66** | Email Notifications | 6-8h |
| **67** | Analytics Dashboard | 8-10h |
| **68** | Loyalty Program | 6-8h |

---

## 📊 الإحصائيات الحالية

### ✅ ما تم إنجازه:

```
الجداول: 4
  • category_customer_access
  • product_customer_access
  • shopping_carts
  • shopping_cart_items

Functions: 23+
  • E-Commerce: 4
  • Visibility: 4
  • Images: 5
  • Registration: 7
  • Cart: 9

التعديلات:
  • customers.auth_user_id
  • user_profiles.customer_id

RLS Policies: 15+

Storage Buckets: 1
  • product-images
```

### 📈 التقدم:

```
Phase 1 (Core): 40% ✅
  ✅ Products & Pricing
  ✅ Visibility Control
  ✅ Images
  ✅ Customer Registration
  ✅ Shopping Cart
  🟡 Checkout
  🟡 Orders
  🟡 Payment
  🟡 Shipping

Phase 2 (Enhanced): 0%
Phase 3 (Advanced): 0%

الإجمالي: ~15% من النظام الكامل
```

---

## 🎯 الخلاصة

### ✅ نظام متكامل جاهز للاستخدام:

- ✅ عرض منتجات مع أسعار ديناميكية متقدمة
- ✅ تحكم كامل في الظهور (VIP/Wholesale/Retail)
- ✅ نظام صور احترافي
- ✅ تسجيل عملاء مرتبط بالنظام
- ✅ سلة مشتريات للزوار والمسجلين
- ✅ دمج تلقائي عند التسجيل

### 🚀 الخطوة التالية:

**STEP_53: Guest Checkout**
- شراء بدون تسجيل
- زيادة التحويلات 20-40%
- تجربة مستخدم محسّنة

---

**تم التوثيق في:** 25 يناير 2026  
**النسخة:** 1.0  
**المطور:** Technical Agent  
**المشروع:** Texa Core - E-Commerce Module

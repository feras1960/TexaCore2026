# 📦 STEP 53: Guest Checkout System
# نظام الدفع للزوار (بدون تسجيل)

**التاريخ:** 25 يناير 2026  
**الحالة:** ✅ جاهز للتنفيذ

---

## 🎯 الهدف

السماح للزوار بإتمام عملية الشراء بدون الحاجة لإنشاء حساب، مع إمكانية تحويل الطلب لعميل مسجل لاحقاً.

---

## 📋 الجداول الجديدة

### 1. `guest_checkouts` - معلومات الزوار
```sql
- id, tenant_id, company_id
- session_id, email, full_name, phone
- shipping_address (JSONB)
- billing_address (JSONB)
- same_as_shipping (boolean)
- status (pending, completed, converted_to_customer)
- converted_to_customer_id, converted_at
- expires_at (7 days default)
```

### 2. `orders` - الطلبات
```sql
- id, tenant_id, company_id
- order_number (ORD-YYYYMMDD-XXXX)
- customer_id | guest_checkout_id
- cart_id
- subtotal, discount_amount, tax_amount, shipping_amount, total_amount
- currency
- status (pending, processing, confirmed, shipped, delivered, cancelled)
- payment_status (pending, paid, failed, refunded)
- payment_method, payment_transaction_id
- shipping_method, tracking_number
- customer_notes, admin_notes
```

### 3. `order_items` - عناصر الطلبات
```sql
- id, tenant_id, company_id
- order_id, product_id
- product_name, product_sku, product_image_url (نسخة وقت الطلب)
- quantity, unit_price, discount_amount, tax_amount, total_price
- notes
```

---

## ⚡ الدوال الجديدة

### 1. `generate_order_number(tenant_id, company_id)`
توليد رقم طلب فريد بصيغة: `ORD-YYYYMMDD-XXXX`

**مثال:**
```sql
SELECT generate_order_number('tenant-uuid', 'company-uuid');
-- النتيجة: 'ORD-20260125-0001'
```

---

### 2. `save_guest_checkout(...)`
حفظ معلومات الزائر قبل إتمام الطلب

**المعاملات:**
```sql
p_tenant_id UUID,
p_company_id UUID,
p_session_id VARCHAR,
p_email VARCHAR,
p_full_name VARCHAR,
p_phone VARCHAR,
p_shipping_address JSONB,
p_billing_address JSONB DEFAULT NULL,
p_same_as_shipping BOOLEAN DEFAULT true,
p_notes TEXT DEFAULT NULL,
p_ip_address VARCHAR DEFAULT NULL,
p_user_agent TEXT DEFAULT NULL
```

**مثال:**
```sql
SELECT save_guest_checkout(
    'tenant-uuid',
    'company-uuid',
    'session-123',
    'customer@example.com',
    'John Doe',
    '+1234567890',
    '{"country": "USA", "city": "New York", "street": "123 Main St", "postal_code": "10001"}'::jsonb
);
```

**النتيجة:**
```json
{
  "success": true,
  "guest_checkout_id": "uuid",
  "message": "تم حفظ معلومات الزائر بنجاح"
}
```

---

### 3. `create_order_from_cart(...)`
إنشاء طلب من السلة

**المعاملات:**
```sql
p_tenant_id UUID,
p_company_id UUID,
p_cart_id UUID,
p_customer_id UUID DEFAULT NULL,
p_guest_checkout_id UUID DEFAULT NULL,
p_payment_method VARCHAR DEFAULT 'cash_on_delivery',
p_shipping_method VARCHAR DEFAULT 'standard',
p_customer_notes TEXT DEFAULT NULL
```

**مثال (زائر):**
```sql
SELECT create_order_from_cart(
    'tenant-uuid',
    'company-uuid',
    'cart-uuid',
    NULL, -- لا يوجد customer_id
    'guest-checkout-uuid',
    'stripe',
    'express',
    'Please deliver before 5 PM'
);
```

**مثال (عميل مسجل):**
```sql
SELECT create_order_from_cart(
    'tenant-uuid',
    'company-uuid',
    'cart-uuid',
    'customer-uuid', -- عميل مسجل
    NULL,
    'paypal',
    'standard',
    NULL
);
```

**النتيجة:**
```json
{
  "success": true,
  "order_id": "uuid",
  "order_number": "ORD-20260125-0001",
  "total_amount": 299.99,
  "currency": "USD",
  "message": "تم إنشاء الطلب بنجاح"
}
```

---

### 4. `convert_guest_order_to_customer(tenant_id, guest_checkout_id, customer_id)`
تحويل طلبات الزائر إلى عميل مسجل

**السيناريو:**
1. زائر أتم طلب بدون تسجيل
2. قرر التسجيل لاحقاً
3. نحول طلباته السابقة لحسابه الجديد

**مثال:**
```sql
SELECT convert_guest_order_to_customer(
    'tenant-uuid',
    'guest-checkout-uuid',
    'new-customer-uuid'
);
```

**النتيجة:**
```json
{
  "success": true,
  "orders_converted": 3,
  "customer_id": "uuid",
  "message": "تم تحويل الطلبات إلى العميل المسجل"
}
```

---

### 5. `get_guest_orders(tenant_id, email, session_id?)`
الحصول على طلبات الزائر بالبريد الإلكتروني

**مثال:**
```sql
SELECT * FROM get_guest_orders(
    'tenant-uuid',
    'customer@example.com',
    'session-123'
);
```

**النتيجة:**
```
order_id | order_number      | total_amount | currency | status  | payment_status | created_at
---------|-------------------|--------------|----------|---------|----------------|------------
uuid-1   | ORD-20260125-0001 | 299.99       | USD      | pending | pending        | 2026-01-25...
uuid-2   | ORD-20260124-0042 | 150.00       | USD      | shipped | paid           | 2026-01-24...
```

---

### 6. `get_order_details(tenant_id, order_id)`
الحصول على تفاصيل الطلب الكاملة

**مثال:**
```sql
SELECT get_order_details('tenant-uuid', 'order-uuid');
```

**النتيجة:**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "order_number": "ORD-20260125-0001",
    "subtotal": 299.99,
    "discount_amount": 30.00,
    "tax_amount": 24.00,
    "shipping_amount": 10.00,
    "total_amount": 303.99,
    "currency": "USD",
    "status": "pending",
    "payment_status": "pending",
    "payment_method": "stripe",
    "shipping_method": "express",
    "tracking_number": null,
    "customer_notes": "Please deliver before 5 PM",
    "created_at": "2026-01-25T...",
    "items": [
      {
        "product_id": "uuid",
        "product_name": "Product 1",
        "product_sku": "SKU-001",
        "product_image_url": "https://...",
        "quantity": 2,
        "unit_price": 149.99,
        "total_price": 299.98
      }
    ],
    "customer": {
      "type": "guest",
      "email": "customer@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "shipping_address": { ... },
      "billing_address": { ... }
    }
  }
}
```

---

### 7. `cleanup_expired_guest_checkouts()`
تنظيف بيانات الزوار المنتهية (تلقائي)

**مثال:**
```sql
SELECT cleanup_expired_guest_checkouts();
-- النتيجة: 15 (عدد السجلات المحذوفة)
```

**ملاحظة:** يمكن جدولة هذه الدالة للتشغيل التلقائي يومياً.

---

## 🔒 RLS Policies

جميع الجداول محمية بـ RLS:
- ✅ `guest_checkouts` - عزل بـ tenant_id
- ✅ `orders` - عزل بـ tenant_id
- ✅ `order_items` - عزل بـ tenant_id

---

## 📊 Indexes للأداء

```sql
-- guest_checkouts
idx_guest_checkouts_tenant (tenant_id, company_id)
idx_guest_checkouts_session (session_id) WHERE status = 'pending'
idx_guest_checkouts_email (email) WHERE status = 'pending'
idx_guest_checkouts_expires (expires_at) WHERE status = 'pending'

-- orders
idx_orders_tenant (tenant_id, company_id)
idx_orders_customer (customer_id)
idx_orders_guest (guest_checkout_id)
idx_orders_status (tenant_id, status, created_at DESC)
idx_orders_number (order_number)

-- order_items
idx_order_items_order (order_id)
idx_order_items_product (product_id)
```

---

## 🎯 حالات الاستخدام

### **1. زائر يتم طلب**
```sql
-- 1. حفظ معلومات الزائر
SELECT save_guest_checkout(...);

-- 2. إنشاء الطلب من السلة
SELECT create_order_from_cart(
    tenant_id,
    company_id,
    cart_id,
    NULL, -- guest
    guest_checkout_id,
    ...
);
```

### **2. عميل مسجل يتم طلب**
```sql
SELECT create_order_from_cart(
    tenant_id,
    company_id,
    cart_id,
    customer_id, -- registered
    NULL,
    ...
);
```

### **3. زائر يسجل بعد الطلب**
```sql
-- 1. تسجيل العميل
SELECT register_customer(...);

-- 2. تحويل طلباته
SELECT convert_guest_order_to_customer(
    tenant_id,
    guest_checkout_id,
    new_customer_id
);
```

### **4. زائر يتتبع طلبه**
```sql
SELECT * FROM get_guest_orders(
    tenant_id,
    'email@example.com',
    'session-id'
);
```

---

## ✅ التنفيذ

```sql
-- نفّذ الملف:
\i supabase/migrations/STEP_53_guest_checkout_system.sql
```

---

## 🧪 الاختبار

سيتم إضافة ملف اختبار منفصل: `STEP_53_TESTING_GUIDE.md`

---

## 🚀 الخطوة التالية

بعد STEP_53، يمكن إضافة:
- STEP_54: Product Reviews
- STEP_55: Stock Alerts
- STEP_56: Abandoned Cart Recovery
- STEP_57: Flash Sales

---

**✅ STEP 53 جاهز للتنفيذ!**

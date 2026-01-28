# 🧪 دليل اختبار STEP_51: Customer Registration

## 📋 التنفيذ

### 1. تطبيق الملف:
```sql
-- في Supabase SQL Editor:
\i supabase/migrations/STEP_51_customer_registration_system.sql
```

---

## ✅ الاختبارات

### اختبار 1: التحقق من التعديلات
```sql
-- التحقق من إضافة auth_user_id إلى customers
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customers' 
  AND column_name = 'auth_user_id';

-- التحقق من إضافة customer_id إلى user_profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
  AND column_name = 'customer_id';
```

**النتيجة المتوقعة:**
- ✅ عمود `auth_user_id` موجود في `customers`
- ✅ عمود `customer_id` موجود في `user_profiles`

---

### اختبار 2: التحقق من Functions
```sql
-- عرض جميع Functions المُنشأة
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'is_customer',
    'get_customer_id_from_auth',
    'generate_customer_code',
    'register_customer',
    'link_existing_customer_to_auth',
    'get_customer_profile',
    'update_customer_profile'
)
ORDER BY routine_name;
```

**النتيجة المتوقعة:**
- ✅ 7 functions موجودة

---

### اختبار 3: تسجيل عميل جديد
```sql
-- استبدل بـ tenant_id و company_id الصحيحين
SELECT register_customer(
    'test.customer@example.com',
    'SecurePassword123',
    'أحمد محمد علي',
    '+380501234567',
    'YOUR_TENANT_ID_HERE'::UUID,
    'YOUR_COMPANY_ID_HERE'::UUID,
    'RETAIL',
    'Ukraine',
    'Kyiv'
);
```

**النتيجة المتوقعة:**
```json
{
    "success": true,
    "customer_id": "...",
    "customer_code": "CUST-00001",
    "auth_user_id": "...",
    "message": "تم التسجيل بنجاح"
}
```

---

### اختبار 4: التحقق من البيانات المُنشأة
```sql
-- التحقق من customer
SELECT 
    code,
    name_ar,
    email,
    phone,
    auth_user_id,
    status
FROM customers
WHERE email = 'test.customer@example.com';

-- التحقق من user_profile
SELECT 
    email,
    full_name,
    role,
    customer_id
FROM user_profiles
WHERE email = 'test.customer@example.com';
```

**النتيجة المتوقعة:**
- ✅ customer موجود مع `auth_user_id`
- ✅ user_profile موجود مع `role='customer'` و `customer_id`

---

### اختبار 5: توليد كود العميل
```sql
-- اختبر توليد أكواد متعددة
SELECT generate_customer_code('YOUR_TENANT_ID_HERE'::UUID) as code_1;
SELECT generate_customer_code('YOUR_TENANT_ID_HERE'::UUID) as code_2;
SELECT generate_customer_code('YOUR_TENANT_ID_HERE'::UUID) as code_3;
```

**النتيجة المتوقعة:**
- ✅ كل كود فريد (CUST-00001, CUST-00002, إلخ)

---

### اختبار 6: Helper Functions
```sql
-- اختبار is_customer
-- (بعد تسجيل دخول كـ customer)
SELECT is_customer();

-- اختبار get_customer_id_from_auth
SELECT get_customer_id_from_auth();
```

**النتيجة المتوقعة:**
- ✅ `is_customer()` يرجع `true` للعميل
- ✅ `get_customer_id_from_auth()` يرجع `customer_id`

---

### اختبار 7: RLS Policies
```sql
-- التحقق من Policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('customers', 'user_profiles')
  AND policyname LIKE '%customer%'
ORDER BY tablename, policyname;
```

**النتيجة المتوقعة:**
- ✅ 5 policies على الأقل
- ✅ `Customers see own data`
- ✅ `Customers update own data`
- ✅ `Admins see company customers`
- ✅ `Customers see own profile`
- ✅ `Customers update own profile`

---

## 🔍 اختبارات متقدمة

### اختبار 8: Tenant Isolation
```sql
-- تسجيل عميل في tenant آخر
SELECT register_customer(
    'another.customer@example.com',
    'Password123',
    'زبون آخر',
    '+380501111111',
    'ANOTHER_TENANT_ID'::UUID,
    'ANOTHER_COMPANY_ID'::UUID
);

-- التحقق من العزل
SELECT COUNT(*) as customer_count
FROM customers
WHERE tenant_id = 'YOUR_TENANT_ID_HERE'::UUID;
```

**النتيجة المتوقعة:**
- ✅ كل tenant يرى عملاءه فقط

---

### اختبار 9: Update Profile
```sql
-- تحديث بيانات العميل
-- (يجب تنفيذه بعد تسجيل الدخول كـ customer)
SELECT update_customer_profile(
    auth.uid(),
    'أحمد محمد علي المحدث',
    '+380509999999',
    'Ukraine',
    'Lviv',
    'شارع الاستقلال 123'
);

-- التحقق
SELECT name_ar, phone, city, address
FROM customers
WHERE email = 'test.customer@example.com';
```

**النتيجة المتوقعة:**
- ✅ البيانات محدّثة

---

### اختبار 10: Get Profile
```sql
-- جلب بيانات العميل الكاملة
SELECT * FROM get_customer_profile('AUTH_USER_ID_HERE'::UUID);
```

**النتيجة المتوقعة:**
- ✅ كل بيانات العميل + المجموعة

---

## 📊 إحصائيات

```sql
-- عدد العملاء المسجلين
SELECT 
    COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL) as registered_customers,
    COUNT(*) FILTER (WHERE auth_user_id IS NULL) as unregistered_customers,
    COUNT(*) as total_customers
FROM customers;

-- توزيع العملاء حسب المجموعات
SELECT 
    cg.name_ar as customer_group,
    COUNT(*) as count
FROM customers c
LEFT JOIN customer_groups cg ON cg.id = c.group_id
WHERE c.auth_user_id IS NOT NULL
GROUP BY cg.name_ar;

-- العملاء الجدد (آخر 7 أيام)
SELECT 
    COUNT(*) as new_customers_last_7_days
FROM customers
WHERE auth_user_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## ⚠️ الأخطاء المحتملة وحلولها

### خطأ 1: `email_exists`
```
الحل: البريد الإلكتروني مسجل مسبقاً، استخدم email آخر
```

### خطأ 2: `Customer not found for this user`
```
الحل: user_profile غير مرتبط بـ customer، استخدم link_existing_customer_to_auth()
```

### خطأ 3: RLS Policy منع الوصول
```
الحل: تأكد من role='customer' في user_profiles
```

---

## 🎯 النتيجة المتوقعة النهائية:

بعد تنفيذ STEP_51 بنجاح:

✅ **الجداول:**
- `customers` لها عمود `auth_user_id`
- `user_profiles` لها عمود `customer_id`

✅ **Functions:**
- 7 functions جاهزة للاستخدام

✅ **RLS:**
- 5 policies للعملاء والإداريين

✅ **التكامل:**
- ربط كامل بين auth.users ↔ user_profiles ↔ customers

---

## 🚀 الخطوة التالية:

بعد نجاح STEP_51:
```
STEP_52: Shopping Cart System
```

---

**انتهى دليل الاختبار!** 🎉

نفّذ الملف وأعطني النتيجة!

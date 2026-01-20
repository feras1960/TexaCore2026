# دليل إنشاء المستخدمين وإعداد Super Users
# Guide to Create Users and Setup Super Users

## 🎯 الخطوات المطلوبة

### ⚠️ **مهم:** لا يمكن إنشاء مستخدمين في Supabase من SQL مباشرة
**يجب إنشاءهم من Supabase Dashboard أو API أولاً**

---

## 📋 الخطوة 1: إنشاء المستخدمين في Supabase Auth

### **الطريقة 1: من Supabase Dashboard (موصى بها)**

1. افتح Supabase Dashboard
2. اذهب إلى **Authentication** → **Users**
3. اضغط **Add User** → **Create New User**
4. أدخل البيانات:

#### **المستخدم 1:**
```
Email: feras1960@gmail.com
Password: bF8ayJJuFmw!@
Auto Confirm: ✅ (مفعل)
```

#### **المستخدم 2:**
```
Email: nextrev360@gmail.com
Password: bF8ayJJuFmw!@
Auto Confirm: ✅ (مفعل)
```

5. اضغط **Create User**

---

### **الطريقة 2: من SQL Editor (بعد إنشاء المستخدم)**

```sql
-- بعد إنشاء المستخدم في Auth، نفذ:
SELECT setup_super_user_by_email('feras1960@gmail.com');
SELECT setup_super_user_by_email('nextrev360@gmail.com');
```

---

### **الطريقة 3: من API (للتطبيقات)**

```typescript
// في الكود (Frontend/Backend)
const { data, error } = await supabase.auth.admin.createUser({
  email: 'feras1960@gmail.com',
  password: 'bF8ayJJuFmw!@',
  email_confirm: true
});
```

---

## 📋 الخطوة 2: تطبيق STEP_15

بعد إنشاء المستخدمين في Auth:

```sql
-- تطبيق STEP_15_setup_super_users_and_support.sql
-- سيحاول ربط المستخدمين بـ Super Admin Role تلقائياً
```

---

## 📋 الخطوة 3: التحقق

```sql
-- التحقق من Super Users
SELECT 
    u.email,
    r.code as role_code,
    r.name_ar as role_name,
    ur.is_active
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.code = 'super_admin';

-- يجب أن ترى:
-- feras1960@gmail.com | super_admin | مدير النظام | true
-- nextrev360@gmail.com | super_admin | مدير النظام | true
```

---

## 🔐 تغيير كلمة المرور

### **من Supabase Dashboard:**

1. Authentication → Users
2. اختر المستخدم
3. اضغط **Reset Password**
4. سيتم إرسال رابط تغيير كلمة المرور

### **من الكود:**

```typescript
// المستخدم يغير كلمة المرور
const { data, error } = await supabase.auth.updateUser({
  password: 'new_password_here'
});
```

---

## 🔒 التحقق بخطوتين (2FA)

### **إعداد 2FA (لاحقاً - في المرحلة التجريبية نبدأ بدونها):**

```typescript
// تفعيل 2FA
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// التحقق
const { data, error } = await supabase.auth.mfa.verify({
  factorId: 'factor-id',
  code: '123456'
});
```

**ملاحظة:** في المرحلة التجريبية نبدأ بدون 2FA، يمكن إضافته لاحقاً.

---

## 👥 مجموعات المستخدمين

### **1. Super Admin:**
```sql
-- يرى كل شيء
-- يمكنه إضافة مستخدمين
-- يمكنه إدارة جميع Tenants
```

### **2. Support Senior (دعم فني أول):**
```sql
-- يرى جميع Tenants
-- يرى: customers, orders, invoices, products
-- لا يرى: accounting
```

### **3. Support (دعم فني):**
```sql
-- يرى Tenants النشطة فقط
-- يرى: customers, orders, invoices
-- لا يرى: products, accounting
```

---

## 🛠️ إضافة مستخدم دعم فني

### **من Super Admin:**

```sql
-- 1. إنشاء المستخدم في Auth أولاً
-- 2. ثم:
SELECT setup_support_user('support@example.com', 'support');
-- أو
SELECT setup_support_user('senior-support@example.com', 'senior');
```

### **من الكود:**

```typescript
// Super Admin يضيف Support User
const { data } = await supabase.rpc('add_user_by_super_admin', {
  p_user_email: 'support@example.com',
  p_user_name: 'Support User',
  p_role_code: 'support',
  p_tenant_id: null  // null = يرى جميع Tenants
});
```

---

## 📊 الصلاحيات

### **Super Admin:**
- ✅ رؤية جميع البيانات
- ✅ إضافة/حذف مستخدمين
- ✅ إدارة Tenants
- ✅ تعديل أي بيانات

### **Support Senior:**
- ✅ رؤية جميع Tenants
- ✅ رؤية: customers, orders, invoices, products
- ❌ لا يرى: accounting
- ✅ تعديل محدود

### **Support:**
- ✅ رؤية Tenants النشطة فقط
- ✅ رؤية: customers, orders, invoices
- ❌ لا يرى: products, accounting
- ✅ تعديل محدود

---

## ✅ قائمة التحقق

- [ ] إنشاء المستخدمين في Supabase Auth
- [ ] تطبيق STEP_15
- [ ] التحقق من Super Users
- [ ] اختبار تسجيل الدخول
- [ ] إضافة Support Users (اختياري)

---

## 🎯 التوصية

1. **الآن:** ابدأ بدون 2FA (في المرحلة التجريبية)
2. **لاحقاً:** أضف 2FA عند الانتقال للإنتاج
3. **Super Users:** أضفهم مباشرة بعد إنشاء المستخدمين
4. **Support:** أضفهم حسب الحاجة

---

**كل شيء جاهز! ✅**

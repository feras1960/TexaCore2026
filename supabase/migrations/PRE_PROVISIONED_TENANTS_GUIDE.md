# دليل Tenants الجاهزة مسبقاً + Super User
# Pre-provisioned Tenants + Super User Guide

## 🎯 الفكرة

### ✅ **Tenants جاهزة مسبقاً:**
- إنشاء 10+ tenants جاهزة عند التثبيت
- المشترك الجديد يسجل → يربط مباشرة بـ tenant جاهز
- لا انتظار لإنشاء قاعدة بيانات جديدة
- سريع ومباشر

### ✅ **Super User:**
- يمكن إضافته في الكود مباشرة
- أو إضافته يدوياً بعد التسجيل

---

## 🚀 كيف يعمل النظام

### **1. عند التثبيت:**
```sql
-- تطبيق STEP_13
-- يتم إنشاء 15 tenant جاهزة
-- status = 'available'
```

### **2. عند تسجيل مشترك جديد:**
```typescript
// في الكود (Frontend)
const { data, error } = await supabase.rpc('register_new_subscriber', {
  p_user_id: userId,
  p_user_email: userEmail,
  p_user_name: userName,
  p_company_name: companyName
});

// النتيجة:
// ✅ tenant_id: tenant-001 (جاهز)
// ✅ company_id: comp-001 (تم إنشاؤه)
// ✅ status: 'active'
```

### **3. النظام يحدث Tenant:**
```sql
-- Tenant الجاهز:
code: 'tenant-001'
name: 'Tenant 1'
status: 'available'

-- بعد التسجيل:
code: 'tenant-001' (لا يتغير)
name: 'أحمد محمد' (تم التحديث)
email: 'ahmed@example.com' (تم التحديث)
status: 'active' (تم التحديث)
```

---

## 📋 Super User

### **الطريقة 1: في الكود مباشرة (موصى بها)**

```sql
-- في STEP_14، غير بيانات Super User:
DO $$
DECLARE
    v_user_email VARCHAR(200) := 'admin@erp.local';  -- ← غير هنا
    -- ... باقي الكود
END $$;
```

### **الطريقة 2: بعد التسجيل (يدوياً)**

```sql
-- بعد تسجيل المستخدم
SELECT setup_super_user('admin@erp.local', 'Super Admin');
```

### **الطريقة 3: من Supabase Dashboard**

```sql
-- 1. إنشاء المستخدم في Auth
-- 2. ثم:
INSERT INTO user_roles (user_id, role_id)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@erp.local'),
    (SELECT id FROM roles WHERE code = 'super_admin');
```

---

## 🔄 سير العمل (Workflow)

### **تسجيل مشترك جديد:**

```
1. المستخدم يسجل في Auth
   ↓
2. استدعاء register_new_subscriber()
   ↓
3. البحث عن tenant متاح (status = 'available')
   ↓
4. تحديث بيانات Tenant (name, email, status)
   ↓
5. إنشاء Company افتراضية
   ↓
6. ربط المستخدم بالـ Company
   ↓
7. ✅ جاهز للاستخدام!
```

---

## 📊 إدارة Tenants الجاهزة

### **التحقق من Tenants المتاحة:**
```sql
SELECT get_available_tenants_count();
-- النتيجة: عدد Tenants المتاحة
```

### **إحصائيات Tenants:**
```sql
SELECT get_tenants_statistics();
-- النتيجة: {total, available, active, inactive}
```

### **إعادة ملء Tenants تلقائياً:**
```sql
-- Trigger يتحقق تلقائياً
-- إذا قل العدد عن 5 → ينشئ المزيد
```

### **إعادة Tenant إلى الحالة المتاحة:**
```sql
SELECT release_tenant('tenant-uuid');
-- إعادة Tenant إلى الحالة المتاحة
```

---

## ⚙️ التخصيص

### **زيادة عدد Tenants الجاهزة:**
```sql
-- في STEP_13، غير العدد:
FOR v_counter IN 1..20 LOOP  -- ← غير هنا (كان 15)
```

### **تغيير الحد الأدنى:**
```sql
-- في Trigger auto_refill_tenants:
IF v_available_count < 10 THEN  -- ← غير هنا (كان 5)
```

---

## ✅ الخلاصة

| العنصر | الوصف |
|--------|-------|
| **Tenants جاهزة** | 15 tenant جاهزة عند التثبيت |
| **التسجيل** | سريع - ربط مباشر بـ tenant جاهز |
| **Super User** | يمكن إضافته في الكود أو يدوياً |
| **الإدارة** | Functions جاهزة للإدارة |

---

## 🎯 التوصية

### **1. Super User:**
- ✅ أضفه في `STEP_14` مباشرة
- ✅ غير البريد الإلكتروني في السطر 47
- ✅ أو أضفه يدوياً بعد التسجيل

### **2. Tenants الجاهزة:**
- ✅ ابدأ بـ 15 tenant
- ✅ راقب العدد المتاح
- ✅ زد العدد حسب الحاجة

---

**كل شيء جاهز! ✅**

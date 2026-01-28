# 🧪 اختبار Backend Supabase الشامل
**التاريخ:** 24 يناير 2026  
**الإصدار:** Backend v2.0  
**الحالة:** جاهز للاختبار ✅

---

## 📋 خطة الاختبار

### المراحل:
1. ✅ اختبار Migrations (STEP_36 → STEP_39)
2. ✅ اختبار الجداول الجديدة
3. ✅ اختبار الدوال
4. ✅ اختبار RLS Policies
5. ✅ اختبار سيناريوهات الاستخدام

---

## 🔧 STEP 1: اختبار Migrations

### الأوامر المطلوبة (نفذها في Supabase SQL Editor):

#### 1️⃣ التحقق من الـ Migrations المنفذة
```sql
-- عرض آخر 10 migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;

-- يجب أن تظهر:
-- STEP_39_permission_policies
-- STEP_38_permission_functions
-- STEP_37_user_permissions_system
-- STEP_36_add_missing_modules
```

**✅ Checklist:**
- [ ] STEP_36 موجود ومنفذ
- [ ] STEP_37 موجود ومنفذ
- [ ] STEP_38 موجود ومنفذ
- [ ] STEP_39 موجود ومنفذ

---

## 📊 STEP 2: اختبار الجداول الجديدة

### 2.1 جدول `modules`

```sql
-- عرض جميع الموديولات (يجب أن يكون 18)
SELECT module_code, name_ar, name_en, is_active, is_core, is_beta
FROM modules
ORDER BY display_order;

-- التحقق من العدد
SELECT COUNT(*) as total_modules FROM modules;
-- Expected: 18

-- التحقق من الموديولات الجديدة
SELECT module_code, name_ar, name_en, category
FROM modules
WHERE module_code IN ('fabric', 'component_lab');
-- Expected: 2 rows
```

**✅ Checklist:**
- [ ] 18 موديول موجود
- [ ] fabric موجود
- [ ] component_lab موجود
- [ ] جميع الحقول الـ 9 لغات مملوءة

---

### 2.2 جدول `tenant_modules`

```sql
-- التحقق من ربط الموديولات مع الـ tenants
SELECT 
    t.code as tenant_code,
    COUNT(tm.module_code) as active_modules
FROM tenants t
LEFT JOIN tenant_modules tm ON t.id = tm.tenant_id AND tm.is_active = true
WHERE t.status = 'active'
GROUP BY t.id, t.code;

-- Expected: كل tenant لديه 18 موديول نشط
```

**✅ Checklist:**
- [ ] كل tenant لديه موديولات مفعلة
- [ ] fabric مفعل لكل tenant
- [ ] component_lab مفعل لكل tenant

---

### 2.3 جدول `user_module_permissions`

```sql
-- التحقق من بنية الجدول
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_module_permissions'
ORDER BY ordinal_position;

-- Expected columns:
-- user_id, tenant_id, company_id, module_code
-- can_view, can_create, can_edit, can_delete
-- can_export, can_import, can_approve, can_manage_settings
```

**✅ Checklist:**
- [ ] الجدول موجود
- [ ] جميع الأعمدة الـ 8 صلاحيات موجودة
- [ ] Foreign keys صحيحة

---

### 2.4 جدول `user_roles`

```sql
-- عرض الأدوار الافتراضية
SELECT 
    t.code as tenant_code,
    r.role_code,
    r.role_name_ar,
    r.role_name_en,
    r.is_system_role
FROM user_roles r
JOIN tenants t ON r.tenant_id = t.id
WHERE r.is_system_role = true
ORDER BY t.code, r.role_code;

-- التحقق من العدد
SELECT 
    t.code as tenant_code,
    COUNT(r.id) as roles_count
FROM tenants t
LEFT JOIN user_roles r ON t.id = r.tenant_id
WHERE t.status = 'active'
GROUP BY t.id, t.code;

-- Expected: 6 أدوار لكل tenant
```

**✅ Checklist:**
- [ ] 6 أدوار افتراضية موجودة
- [ ] full_admin موجود
- [ ] accountant موجود
- [ ] warehouse_keeper موجود
- [ ] sales_rep موجود
- [ ] purchasing_manager موجود
- [ ] viewer موجود

---

## 🛠️ STEP 3: اختبار الدوال

### 3.1 دالة `get_user_allowed_modules()`

```sql
-- اختبار مع مستخدم موجود (استبدل USER_ID بمستخدم حقيقي)
SELECT 
    module_code,
    name_ar,
    name_en,
    is_enabled,
    requires_upgrade,
    can_view,
    can_create,
    can_edit,
    can_delete
FROM get_user_allowed_modules('USER_ID_HERE');

-- Expected: قائمة الموديولات مع الصلاحيات
```

**✅ Checklist:**
- [ ] الدالة تعمل بدون أخطاء
- [ ] تعرض الموديولات المسموحة
- [ ] تعرض الصلاحيات بشكل صحيح

---

### 3.2 دالة `check_user_module_permission()`

```sql
-- اختبار التحقق من صلاحية معينة
SELECT check_user_module_permission(
    'USER_ID_HERE'::UUID,
    'accounting',
    'view'
) as can_view_accounting;

SELECT check_user_module_permission(
    'USER_ID_HERE'::UUID,
    'accounting',
    'create'
) as can_create_accounting;

-- Expected: true/false حسب صلاحيات المستخدم
```

**✅ Checklist:**
- [ ] الدالة تعمل بدون أخطاء
- [ ] تعيد true/false بشكل صحيح

---

### 3.3 دالة `create_default_user_permissions()`

```sql
-- اختبار إنشاء صلاحيات افتراضية (لن ننفذ إلا للاختبار)
-- ملاحظة: تأكد من وجود user_id و tenant_id و company_id صحيحة

/*
SELECT create_default_user_permissions(
    'USER_ID_HERE'::UUID,
    'TENANT_ID_HERE'::UUID,
    'COMPANY_ID_HERE'::UUID,
    'viewer'
);
*/

-- Expected: إنشاء صلاحيات افتراضية للمستخدم
```

**✅ Checklist:**
- [ ] الدالة موجودة
- [ ] يمكن تنفيذها بدون أخطاء

---

## 🔒 STEP 4: اختبار RLS Policies

### 4.1 التحقق من تفعيل RLS

```sql
-- عرض الجداول مع RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN (
    'modules',
    'user_module_permissions',
    'user_feature_permissions',
    'user_roles',
    'user_role_assignments'
)
ORDER BY tablename;

-- Expected: rowsecurity = true لجميع الجداول
```

**✅ Checklist:**
- [ ] RLS مفعل على modules
- [ ] RLS مفعل على user_module_permissions
- [ ] RLS مفعل على user_feature_permissions
- [ ] RLS مفعل على user_roles
- [ ] RLS مفعل على user_role_assignments

---

### 4.2 عرض جميع الـ Policies

```sql
-- عرض جميع الـ policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN (
    'modules',
    'user_module_permissions',
    'user_feature_permissions',
    'user_roles',
    'user_role_assignments'
)
ORDER BY tablename, policyname;

-- Expected: حوالي 12 policy
```

**✅ Checklist:**
- [ ] Policies موجودة على modules
- [ ] Policies موجودة على user_module_permissions
- [ ] Policies موجودة على user_roles
- [ ] Policies موجودة على user_role_assignments

---

## 🎯 STEP 5: سيناريوهات الاستخدام

### سيناريو 1: عرض موديولات المستخدم

```sql
-- 1. اختر مستخدم من النظام
SELECT id, email FROM auth.users LIMIT 5;

-- 2. اعرض موديولاته المسموحة
SELECT 
    module_code,
    name_ar,
    name_en,
    is_enabled,
    can_view,
    can_create
FROM get_user_allowed_modules('USER_ID_HERE')
ORDER BY display_order;
```

**✅ Checklist:**
- [ ] الاستعلام يعمل
- [ ] يعرض الموديولات بشكل صحيح
- [ ] الصلاحيات واضحة

---

### سيناريو 2: التحقق من صلاحيات محددة

```sql
-- التحقق من صلاحيات المحاسبة
SELECT 
    'view' as permission_type,
    check_user_module_permission('USER_ID_HERE'::UUID, 'accounting', 'view') as has_permission
UNION ALL
SELECT 
    'create',
    check_user_module_permission('USER_ID_HERE'::UUID, 'accounting', 'create')
UNION ALL
SELECT 
    'edit',
    check_user_module_permission('USER_ID_HERE'::UUID, 'accounting', 'edit')
UNION ALL
SELECT 
    'delete',
    check_user_module_permission('USER_ID_HERE'::UUID, 'accounting', 'delete');
```

**✅ Checklist:**
- [ ] جميع الصلاحيات تظهر
- [ ] النتائج منطقية

---

### سيناريو 3: عرض أدوار Tenant

```sql
-- عرض أدوار tenant معين
SELECT 
    role_code,
    role_name_ar,
    role_name_en,
    description_ar,
    is_system_role,
    created_at
FROM user_roles
WHERE tenant_id = 'TENANT_ID_HERE'
ORDER BY is_system_role DESC, role_code;
```

**✅ Checklist:**
- [ ] الأدوار الـ 6 موجودة
- [ ] is_system_role = true للأدوار الافتراضية

---

## 📊 STEP 6: الإحصائيات النهائية

```sql
-- إحصائيات شاملة
SELECT 
    'Modules' as item,
    COUNT(*) as count
FROM modules
UNION ALL
SELECT 
    'Active Modules',
    COUNT(*)
FROM modules
WHERE is_active = true
UNION ALL
SELECT 
    'Tenant Modules Activations',
    COUNT(*)
FROM tenant_modules
WHERE is_active = true
UNION ALL
SELECT 
    'System Roles',
    COUNT(*)
FROM user_roles
WHERE is_system_role = true
UNION ALL
SELECT 
    'User Module Permissions',
    COUNT(*)
FROM user_module_permissions
UNION ALL
SELECT 
    'User Roles',
    COUNT(*)
FROM user_roles;
```

**النتائج المتوقعة:**
- Modules: 18
- Active Modules: 18
- Tenant Modules Activations: 18 × عدد tenants
- System Roles: 6 × عدد tenants
- User Module Permissions: حسب المستخدمين
- User Roles: 6 × عدد tenants

---

## ✅ الخلاصة النهائية

### Checklist الشامل:

#### Backend Structure:
- [ ] 18 موديول في جدول modules
- [ ] fabric و component_lab موجودان
- [ ] 4 جداول صلاحيات جديدة
- [ ] 6 أدوار افتراضية لكل tenant

#### Functions:
- [ ] get_user_allowed_modules() تعمل
- [ ] check_user_module_permission() تعمل
- [ ] get_user_module_permissions() تعمل
- [ ] create_default_user_permissions() تعمل

#### Security:
- [ ] RLS مفعل على 5 جداول
- [ ] ~12 Policy موجودة
- [ ] Policies تعمل بشكل صحيح

#### Integration:
- [ ] الموديولات مربوطة بالـ tenants
- [ ] الأدوار الافتراضية موجودة
- [ ] الـ Foreign Keys صحيحة

---

## 🚨 في حالة وجود مشاكل:

### مشكلة: جدول modules غير موجود
**الحل:** نفذ `STEP_36_add_missing_modules.sql` كامل

### مشكلة: الأدوار الافتراضية غير موجودة
**الحل:** نفذ `STEP_37_user_permissions_system.sql` كامل

### مشكلة: الدوال لا تعمل
**الحل:** نفذ `STEP_38_permission_functions.sql` كامل

### مشكلة: RLS لا يعمل
**الحل:** نفذ `STEP_39_permission_policies.sql` كامل

---

## 📝 ملاحظات مهمة:

1. **استبدل USER_ID و TENANT_ID و COMPANY_ID** بقيم حقيقية من قاعدة البيانات
2. **لا تنفذ create_default_user_permissions()** إلا للاختبار
3. **تأكد من وجود بيانات اختبار** (users, tenants, companies)
4. **استخدم SQL Editor في Supabase Dashboard**

---

**Backend v2.0 - جاهز للاختبار! 🧪**

*آخر تحديث: 24 يناير 2026*

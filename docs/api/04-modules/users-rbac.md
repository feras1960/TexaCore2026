# 👥 وحدة المستخدمين والصلاحيات API
# Users & RBAC Module API

---

## 📋 نظرة عامة

وحدة المستخدمين والصلاحيات تشمل:
- الملفات الشخصية (User Profiles)
- الأدوار (Roles)
- الصلاحيات (Permissions)
- تعيين الأدوار (User Roles)
- الوصول للشركات (Company Access)

---

## 1️⃣ الملفات الشخصية (User Profiles)

### الجدول: `user_profiles`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | معرف المستخدم (من auth.users) |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | الشركة الحالية |
| branch_id | uuid | الفرع الحالي |
| full_name | varchar | الاسم الكامل |
| email | varchar | البريد الإلكتروني |
| phone | varchar | الهاتف |
| avatar_url | varchar | صورة الملف الشخصي |
| language | varchar | اللغة المفضلة |
| timezone | varchar | المنطقة الزمنية |
| is_active | boolean | نشط |

### 📖 GET - جلب المستخدمين

```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select(`
    *,
    company:companies(id, name_ar),
    branch:branches(id, name_ar),
    roles:user_roles(
      role:roles(id, code, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);
```

### 📖 GET - مستخدم واحد بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .select(`
    *,
    company:companies(id, name_ar, code),
    branch:branches(id, name_ar),
    roles:user_roles(
      *,
      role:roles(*)
    ),
    permissions:user_module_permissions(*),
    warehouse_access:user_warehouse_permissions(
      warehouse:warehouses(id, name_ar)
    ),
    branch_access:user_branch_permissions(
      branch:branches(id, name_ar)
    )
  `)
  .eq('id', userId)
  .single();
```

### ✏️ PUT - تحديث الملف الشخصي

```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .update({
    full_name: 'اسم جديد',
    phone: '+966501234567',
    language: 'ar',
    timezone: 'Asia/Riyadh'
  })
  .eq('id', userId)
  .select()
  .single();
```

### ✏️ PUT - تغيير الشركة الحالية

```typescript
const switchCompany = async (userId: string, newCompanyId: string) => {
  // التحقق من الصلاحية
  const { data: canAccess } = await supabase.rpc('can_access_company', {
    p_company_id: newCompanyId
  });

  if (!canAccess) {
    throw new Error('لا يمكنك الوصول لهذه الشركة');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ company_id: newCompanyId })
    .eq('id', userId)
    .select()
    .single();

  return data;
};
```

---

## 2️⃣ الأدوار (Roles)

### الجدول: `roles`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة (اختياري) |
| code | varchar | رمز الدور |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| level | varchar | المستوى |
| permissions | jsonb | الصلاحيات |
| visible_modules | jsonb | الوحدات المرئية |
| is_system | boolean | دور نظام |
| is_active | boolean | نشط |

### مستويات الأدوار

| المستوى | الوصف |
|---------|-------|
| `platform` | مستوى المنصة |
| `tenant` | مستوى المستأجر |
| `company` | مستوى الشركة |
| `branch` | مستوى الفرع |
| `user` | مستخدم عادي |

### 📖 GET - جلب الأدوار

```typescript
const { data, error } = await supabase
  .from('roles')
  .select(`
    *,
    users_count:user_roles(count)
  `)
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .order('level');
```

### 📝 POST - إنشاء دور

```typescript
const { data, error } = await supabase
  .from('roles')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,  // اختياري
    code: 'ACCOUNTANT',
    name_ar: 'محاسب',
    name_en: 'Accountant',
    level: 'company',
    permissions: {
      accounting: ['read', 'write'],
      reports: ['read'],
      sales: ['read']
    },
    visible_modules: ['accounting', 'reports', 'sales']
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث صلاحيات الدور

```typescript
const { data, error } = await supabase
  .from('roles')
  .update({
    permissions: {
      accounting: ['read', 'write', 'delete'],
      reports: ['read', 'export'],
      sales: ['read', 'write']
    },
    visible_modules: ['accounting', 'reports', 'sales', 'inventory']
  })
  .eq('id', roleId)
  .select()
  .single();
```

---

## 3️⃣ تعيين الأدوار (User Roles)

### الجدول: `user_roles`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| user_id | uuid | معرف المستخدم |
| role_id | uuid | معرف الدور |
| company_id | uuid | معرف الشركة |
| branch_id | uuid | معرف الفرع |
| is_active | boolean | نشط |
| assigned_by | uuid | عُيّن بواسطة |
| assigned_at | timestamp | تاريخ التعيين |

### 📖 GET - أدوار مستخدم

```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select(`
    *,
    role:roles(*),
    company:companies(id, name_ar),
    branch:branches(id, name_ar),
    assigned_by_user:user_profiles!assigned_by(full_name)
  `)
  .eq('user_id', userId)
  .eq('is_active', true);
```

### 📝 POST - تعيين دور لمستخدم

```typescript
const assignRole = async (
  userId: string, 
  roleId: string, 
  companyId?: string,
  branchId?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      company_id: companyId,
      branch_id: branchId,
      assigned_by: user.id,
      is_active: true
    })
    .select()
    .single();

  return data;
};
```

### 🗑️ DELETE - إلغاء تعيين دور

```typescript
const { error } = await supabase
  .from('user_roles')
  .update({ is_active: false })
  .eq('id', userRoleId);
```

---

## 4️⃣ الوصول للشركات (Company Access)

### الجدول: `user_company_access`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| user_id | uuid | معرف المستخدم |
| company_id | uuid | معرف الشركة |
| access_level | varchar | مستوى الوصول |
| granted_by | uuid | مُنح بواسطة |
| granted_at | timestamp | تاريخ المنح |

### 📖 GET - الشركات المتاحة للمستخدم

```typescript
// باستخدام RPC
const { data } = await supabase.rpc('get_user_accessible_companies');

// أو مباشرة
const { data, error } = await supabase
  .from('user_company_access')
  .select(`
    *,
    company:companies(id, name_ar, name_en, code)
  `)
  .eq('user_id', userId);
```

### 📝 POST - منح وصول لشركة

```typescript
const grantCompanyAccess = async (
  userId: string, 
  companyId: string, 
  accessLevel: string = 'user'
) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_company_access')
    .insert({
      user_id: userId,
      company_id: companyId,
      access_level: accessLevel,
      granted_by: user.id
    })
    .select()
    .single();

  return data;
};
```

---

## 5️⃣ صلاحيات الوحدات (Module Permissions)

### الجدول: `user_module_permissions`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| user_id | uuid | معرف المستخدم |
| module_code | varchar | رمز الوحدة |
| permissions | jsonb | الصلاحيات |

### 📖 GET - صلاحيات مستخدم

```typescript
const { data, error } = await supabase
  .from('user_module_permissions')
  .select('*')
  .eq('user_id', userId);
```

### 📝 POST - تعيين صلاحيات وحدة

```typescript
const { data, error } = await supabase
  .from('user_module_permissions')
  .upsert({
    user_id: userId,
    module_code: 'accounting',
    permissions: ['read', 'write']
  })
  .select()
  .single();
```

---

## 6️⃣ صلاحيات المستودعات

### الجدول: `user_warehouse_permissions`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| user_id | uuid | معرف المستخدم |
| warehouse_id | uuid | معرف المستودع |
| can_view | boolean | مشاهدة |
| can_receive | boolean | استلام |
| can_issue | boolean | صرف |
| can_transfer | boolean | تحويل |
| can_adjust | boolean | تسوية |

### 📖 GET - صلاحيات مستودعات المستخدم

```typescript
const { data, error } = await supabase
  .from('user_warehouse_permissions')
  .select(`
    *,
    warehouse:warehouses(id, name_ar, code)
  `)
  .eq('user_id', userId);
```

### 📝 POST - تعيين صلاحية مستودع

```typescript
const { data, error } = await supabase
  .from('user_warehouse_permissions')
  .insert({
    user_id: userId,
    warehouse_id: warehouseId,
    can_view: true,
    can_receive: true,
    can_issue: true,
    can_transfer: false,
    can_adjust: false
  })
  .select()
  .single();
```

---

## 7️⃣ التحقق من الصلاحيات

### في الكود

```typescript
const checkPermission = async (
  userId: string,
  module: string,
  action: string
): Promise<boolean> => {
  // 1. جلب أدوار المستخدم
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:roles(permissions)')
    .eq('user_id', userId)
    .eq('is_active', true);

  // 2. التحقق من الصلاحية
  for (const ur of userRoles) {
    const permissions = ur.role?.permissions?.[module] || [];
    if (permissions.includes(action)) {
      return true;
    }
  }

  // 3. التحقق من الصلاحيات المباشرة
  const { data: directPerms } = await supabase
    .from('user_module_permissions')
    .select('permissions')
    .eq('user_id', userId)
    .eq('module_code', module)
    .single();

  return directPerms?.permissions?.includes(action) || false;
};
```

### مكون Guard

```tsx
interface PermissionGuardProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  module, 
  action, 
  children, 
  fallback 
}: PermissionGuardProps) {
  const { hasPermission, loading } = useRBAC();

  if (loading) return null;
  if (!hasPermission(module, action)) return fallback || null;
  
  return <>{children}</>;
}
```

---

**التالي:** [companies.md](./companies.md) - الشركات والفروع

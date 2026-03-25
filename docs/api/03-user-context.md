# 👤 سياق المستخدم والصلاحيات
# User Context & Permissions

---

## 📋 نظرة عامة

بعد تسجيل الدخول، يحتاج التطبيق لمعرفة:
- من هو المستخدم؟
- ما هو tenant_id و company_id؟
- ما هي صلاحياته وأدواره؟
- ما هي الوحدات المتاحة له؟

---

## 1️⃣ الحصول على بيانات المستخدم الحالي

### من Auth

```typescript
// بيانات المصادقة الأساسية
const { data: { user } } = await supabase.auth.getUser();

console.log('User ID:', user?.id);
console.log('Email:', user?.email);
console.log('Metadata:', user?.user_metadata);
```

### من user_profiles

```typescript
// بيانات الملف الشخصي الكاملة
const { data: profile, error } = await supabase
  .from('user_profiles')
  .select(`
    *,
    tenant:tenants(id, name, code),
    company:companies(id, name_ar, name_en)
  `)
  .eq('id', user.id)
  .single();
```

### Response

```json
{
  "id": "d0e7f8a9-1234-5678-9abc-def012345678",
  "email": "ahmed@company.com",
  "full_name": "أحمد محمد",
  "phone": "+966501234567",
  "avatar_url": null,
  "tenant_id": "t-uuid-1234",
  "company_id": "c-uuid-5678",
  "branch_id": "b-uuid-9012",
  "is_active": true,
  "language": "ar",
  "timezone": "Asia/Riyadh",
  "created_at": "2026-01-15T10:00:00Z",
  "tenant": {
    "id": "t-uuid-1234",
    "name": "شركة الأمل للأقمشة",
    "code": "ALAMAL"
  },
  "company": {
    "id": "c-uuid-5678",
    "name_ar": "الفرع الرئيسي",
    "name_en": "Main Branch"
  }
}
```

---

## 2️⃣ الحصول على tenant_id و company_id

### من user_profiles

```typescript
// الطريقة المباشرة
const { data } = await supabase
  .from('user_profiles')
  .select('tenant_id, company_id, branch_id')
  .eq('id', user.id)
  .single();

const { tenant_id, company_id, branch_id } = data;
```

### دوال RPC مخصصة

```typescript
// الحصول على tenant_id
const { data: tenantId } = await supabase.rpc('get_user_tenant_id');

// الحصول على company_id
const { data: companyId } = await supabase.rpc('get_user_company_id');

// الحصول على brand_id (للوكلاء)
const { data: brandId } = await supabase.rpc('get_user_brand_id');
```

---

## 3️⃣ الحصول على الأدوار

### أدوار المستخدم

```typescript
const { data: userRoles, error } = await supabase
  .from('user_roles')
  .select(`
    id,
    is_active,
    role:roles(
      id,
      code,
      name_ar,
      name_en,
      level,
      permissions,
      visible_modules
    )
  `)
  .eq('user_id', user.id)
  .eq('is_active', true);
```

### Response

```json
[
  {
    "id": "ur-uuid",
    "is_active": true,
    "role": {
      "id": "r-uuid",
      "code": "company_admin",
      "name_ar": "مدير الشركة",
      "name_en": "Company Admin",
      "level": "company",
      "permissions": {
        "accounting": ["read", "write", "delete"],
        "sales": ["read", "write"],
        "purchases": ["read", "write"],
        "inventory": ["read", "write", "delete"]
      },
      "visible_modules": ["accounting", "sales", "purchases", "inventory"]
    }
  }
]
```

---

## 4️⃣ التحقق من الصلاحيات

### دوال التحقق

```typescript
// هل المستخدم Platform Owner؟
const { data: isPlatformOwner } = await supabase.rpc('is_platform_owner');

// هل المستخدم Platform Admin؟
const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');

// هل المستخدم Tenant Owner؟
const { data: isTenantOwner } = await supabase.rpc('is_tenant_owner');

// هل المستخدم Tenant Admin؟
const { data: isTenantAdmin } = await supabase.rpc('is_tenant_admin');

// هل المستخدم Company Admin؟
const { data: isCompanyAdmin } = await supabase.rpc('is_company_admin', {
  p_company_id: 'company-uuid'
});
```

### التحقق من صلاحية محددة

```typescript
// استخدام الخدمة
import { rbacService } from '@/services/rbacService';

// التحقق من صلاحية
const canCreate = await rbacService.hasPermission('accounting', 'write');
const canDelete = await rbacService.hasPermission('sales', 'delete');

// التحقق من مجموعة صلاحيات
const permissions = await rbacService.getUserPermissions();
// { accounting: ['read', 'write'], sales: ['read'] }
```

---

## 5️⃣ الوحدات المتاحة للمستخدم

### الحصول على الوحدات المرئية

```typescript
const { data: visibleModules } = await supabase
  .rpc('get_user_visible_modules');

// أو من الخدمة
const modules = await rbacService.getUserVisibleModules();
```

### Response

```json
[
  "dashboard",
  "accounting",
  "sales",
  "purchases",
  "inventory",
  "reports"
]
```

### استخدام في الـ Sidebar

```typescript
const sidebarItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'Home' },
  { id: 'accounting', label: 'المحاسبة', icon: 'Calculator' },
  { id: 'sales', label: 'المبيعات', icon: 'ShoppingCart' },
  // ...
].filter(item => visibleModules.includes(item.id));
```

---

## 6️⃣ تبديل الشركة (Switch Company)

### الحصول على الشركات المتاحة

```typescript
const { data: accessibleCompanies } = await supabase
  .rpc('get_user_accessible_company_ids');

// أو بالتفاصيل
const { data: companies } = await supabase
  .from('companies')
  .select('id, name_ar, name_en, code')
  .in('id', accessibleCompanies);
```

### تبديل الشركة الحالية

```typescript
// تحديث الشركة في user_profiles
const { error } = await supabase
  .from('user_profiles')
  .update({ company_id: newCompanyId })
  .eq('id', user.id);

// إعادة تحميل الصفحة لتطبيق السياق الجديد
if (!error) {
  window.location.reload();
}
```

### التحقق من إمكانية الوصول للشركة

```typescript
const { data: canAccess } = await supabase.rpc('can_access_company', {
  p_company_id: targetCompanyId
});

if (!canAccess) {
  throw new Error('لا يمكنك الوصول لهذه الشركة');
}
```

---

## 7️⃣ هيكل الصلاحيات

### مستويات الأدوار

```typescript
type RoleLevel = 
  | 'platform'   // Platform Owner/Admin (يرى كل البراندات)
  | 'partner'    // Partner/Agent (يرى تينانتات براندته)
  | 'tenant'     // Tenant Owner/Admin (يرى شركات تينانته)
  | 'company'    // Company Admin (يرى شركته فقط)
  | 'branch'     // Branch Manager (يرى فرعه فقط)
  | 'user';      // Regular User

// هرم الصلاحيات
// platform > partner > tenant > company > branch > user
```

### أنواع الصلاحيات

```typescript
type Permission = 'read' | 'write' | 'delete' | 'manage';

// permissions object structure
interface Permissions {
  [module: string]: Permission[];
}

// مثال
const permissions: Permissions = {
  accounting: ['read', 'write', 'delete'],
  sales: ['read', 'write'],
  purchases: ['read'],
  reports: ['read', 'manage']
};
```

---

## 8️⃣ Hook مخصص للصلاحيات

```typescript
// hooks/useRBAC.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { rbacService } from '@/services/rbacService';

export function useRBAC() {
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [visibleModules, setVisibleModules] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState<string>('user');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const perms = await rbacService.getUserPermissions();
      const modules = await rbacService.getUserVisibleModules();
      const level = await rbacService.getUserLevel();
      
      setPermissions(perms);
      setVisibleModules(modules);
      setUserLevel(level);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: string) => {
    return permissions[module]?.includes(action) ?? false;
  };

  const canAccessModule = (module: string) => {
    return visibleModules.includes(module);
  };

  return {
    loading,
    permissions,
    visibleModules,
    userLevel,
    hasPermission,
    canAccessModule,
    // اختصارات مفيدة
    isPlatformOwner: userLevel === 'platform',
    isTenantOwner: ['platform', 'tenant'].includes(userLevel),
    isCompanyAdmin: ['platform', 'tenant', 'company'].includes(userLevel),
  };
}
```

### استخدام Hook

```typescript
function AccountingPage() {
  const { hasPermission, canAccessModule, loading } = useRBAC();

  if (loading) return <Loading />;

  if (!canAccessModule('accounting')) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>المحاسبة</h1>
      
      {hasPermission('accounting', 'write') && (
        <Button>إضافة قيد</Button>
      )}
      
      {hasPermission('accounting', 'delete') && (
        <Button variant="destructive">حذف</Button>
      )}
    </div>
  );
}
```

---

## 9️⃣ حماية المسارات

### Component Guard

```typescript
// components/PermissionGuard.tsx
interface PermissionGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ 
  module, 
  action = 'read',
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, loading } = useRBAC();

  if (loading) return null;
  
  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### استخدام Guard

```tsx
<PermissionGuard module="accounting" action="write">
  <CreateInvoiceButton />
</PermissionGuard>

<PermissionGuard 
  module="reports" 
  action="manage"
  fallback={<span>غير مصرح لك</span>}
>
  <AdvancedReports />
</PermissionGuard>
```

---

## 🔄 تخزين السياق

### Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  tenantId: string | null;
  companyId: string | null;
  permissions: Record<string, string[]>;
  visibleModules: string[];
  
  setUser: (user: User) => void;
  setCompany: (companyId: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      companyId: null,
      permissions: {},
      visibleModules: [],
      
      setUser: (user) => set({ 
        user,
        tenantId: user.tenant_id,
        companyId: user.company_id
      }),
      
      setCompany: (companyId) => set({ companyId }),
      
      clearAuth: () => set({ 
        user: null, 
        tenantId: null, 
        companyId: null,
        permissions: {},
        visibleModules: []
      }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

**التالي:** [04-modules/](./04-modules/) - توثيق APIs حسب الوحدات

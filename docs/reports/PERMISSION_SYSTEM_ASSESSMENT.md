# 📊 تقييم نظام الصلاحيات - TexaCore ERP
# Permission System Assessment Report

**تاريخ التقييم:** 2026-02-04  
**الحالة:** ⚠️ جزئي - يحتاج تكامل

---

## 1️⃣ الهيكل الحالي للصلاحيات

### ✅ ما هو مُنفّذ في قاعدة البيانات:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        نظام الصلاحيات الحالي                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📋 roles                    📋 user_roles                                   │
│  ├── id                      ├── id                                          │
│  ├── tenant_id               ├── user_id                                     │
│  ├── code                    ├── role_id                                     │
│  ├── name_ar/name_en         ├── tenant_id                                   │
│  ├── is_super_admin          ├── assigned_by                                 │
│  ├── is_system               ├── expires_at                                  │
│  └── permissions (JSONB)     └── is_active                                   │
│                                                                              │
│  📋 user_profiles            📋 warehouse_assignments                        │
│  ├── id (= auth.users.id)    ├── id                                          │
│  ├── tenant_id               ├── tenant_id                                   │
│  ├── company_id              ├── warehouse_id                                │
│  ├── branch_id               ├── user_id                                     │
│  ├── role (VARCHAR)          ├── role (manager/staff/cashier/supervisor)     │
│  └── preferences (JSONB)     └── is_active                                   │
│                                                                              │
│  📋 tenant_modules                                                           │
│  ├── tenant_id                                                               │
│  ├── module_code                                                             │
│  └── is_active                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📊 جداول الصلاحيات الموجودة:

| الجدول | الوصف | الحالة |
|--------|-------|--------|
| `roles` | الأدوار/مجموعات الصلاحيات | ✅ موجود |
| `user_roles` | ربط المستخدمين بالأدوار | ✅ موجود |
| `user_profiles` | ملف المستخدم (company_id, branch_id) | ✅ موجود |
| `warehouse_assignments` | ربط المستخدمين بالمستودعات | ✅ موجود |
| `tenant_modules` | الوحدات المُفعّلة للمستأجر | ✅ موجود |

---

## 2️⃣ مستويات الصلاحيات

### المستوى 1: Tenant Level ✅
```
tenant_id → companies → branches → users
```
- ✅ كل مستأجر معزول بالكامل (RLS)
- ✅ لا يمكن للمستخدم رؤية بيانات tenant آخر

### المستوى 2: Company Level ✅
```
user_profiles.company_id
```
- ✅ المستخدم مربوط بشركة واحدة
- ⚠️ لا يوجد دعم للمستخدم في عدة شركات

### المستوى 3: Branch Level ⚠️
```
user_profiles.branch_id
```
- ✅ المستخدم مربوط بفرع واحد
- ❌ **لا يوجد**: جدول `user_branches` للمستخدم في عدة فروع

### المستوى 4: Warehouse Level ✅
```
warehouse_assignments
├── user_id
├── warehouse_id
└── role (manager/staff/cashier/supervisor)
```
- ✅ المستخدم يمكن تعيينه لعدة مستودعات
- ✅ لكل تعيين دور محدد

### المستوى 5: Module Level ⚠️
```
tenant_modules + roles.permissions
```
- ✅ الوحدات مُفعّلة على مستوى Tenant
- ⚠️ **ينقص**: صلاحيات دقيقة لكل وحدة لكل مستخدم

### المستوى 6: Action Level ⚠️
```
roles.permissions (JSONB)
```
- ⚠️ موجود كـ JSONB لكن **غير مُفعّل بالكامل**
- ❌ لا يوجد تفعيل في الـ Frontend

---

## 3️⃣ ما ينقص

### 🔴 أولوية عالية:

| العنصر | الوصف | الحالة |
|--------|-------|--------|
| **user_branches** | ربط المستخدم بعدة فروع | ❌ غير موجود |
| **user_module_permissions** | صلاحيات الوحدات لكل مستخدم | ❌ غير موجود |
| **Frontend Permission Check** | التحقق من الصلاحيات في الواجهة | ⚠️ جزئي |
| **Permission UI** | واجهة إدارة الصلاحيات | ⚠️ جزئي |

### 🟡 أولوية متوسطة:

| العنصر | الوصف | الحالة |
|--------|-------|--------|
| **account_access** | صلاحيات الوصول للحسابات المحاسبية | ❌ غير موجود |
| **data_filters** | فلاتر البيانات حسب الصلاحية | ❌ غير موجود |

---

## 4️⃣ الهيكل المُقترح الكامل

```sql
-- ═══════════════════════════════════════════════════════════════
-- 1. ربط المستخدم بعدة فروع
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'full', -- full, read_only, limited
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 2. صلاحيات الوحدات لكل مستخدم
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    module_code VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '{
        "view": true,
        "create": false,
        "edit": false,
        "delete": false,
        "export": false,
        "approve": false
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_code)
);

-- ═══════════════════════════════════════════════════════════════
-- 3. صلاحيات الحسابات المحاسبية
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE account_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    account_type VARCHAR(50), -- NULL = all, or specific type
    branch_id UUID REFERENCES branches(id), -- NULL = all branches
    access_level VARCHAR(20) DEFAULT 'view', -- view, transact, manage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. قواعد الصلاحيات المُركبة
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE permission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    resource_type VARCHAR(50) NOT NULL, -- 'module', 'entity', 'field'
    resource_code VARCHAR(100), -- module code, table name, field name
    resource_id UUID, -- specific record ID
    
    action VARCHAR(50) NOT NULL, -- 'view', 'create', 'edit', 'delete', 'approve'
    is_allowed BOOLEAN DEFAULT true,
    
    conditions JSONB DEFAULT '{}', -- additional conditions
    priority INT DEFAULT 0, -- higher = more important
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5️⃣ مصفوفة الصلاحيات الكاملة

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERMISSION MATRIX                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User                                                                        │
│   │                                                                          │
│   ├── Tenant (1:1) ────────────────────────────────────► tenant_modules     │
│   │                                                                          │
│   ├── Company (1:1 or 1:N via user_companies)                               │
│   │                                                                          │
│   ├── Branch (1:N) ────────────────────────────────────► user_branches      │
│   │   ├── Full Access                                                        │
│   │   ├── Read Only                                                          │
│   │   └── Limited                                                            │
│   │                                                                          │
│   ├── Warehouse (1:N) ─────────────────────────────────► warehouse_assigns  │
│   │   ├── Manager                                                            │
│   │   ├── Supervisor                                                         │
│   │   ├── Staff                                                              │
│   │   └── Cashier                                                            │
│   │                                                                          │
│   ├── Role (1:N) ──────────────────────────────────────► user_roles         │
│   │   └── permissions (JSONB)                                                │
│   │                                                                          │
│   ├── Module (1:N) ────────────────────────────────────► user_module_perms  │
│   │   ├── view                                                               │
│   │   ├── create                                                             │
│   │   ├── edit                                                               │
│   │   ├── delete                                                             │
│   │   ├── export                                                             │
│   │   └── approve                                                            │
│   │                                                                          │
│   └── Account (1:N) ───────────────────────────────────► account_access     │
│       ├── view                                                               │
│       ├── transact                                                           │
│       └── manage                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ أمثلة على السيناريوهات

### السيناريو 1: محاسب فرع
```
User: أحمد (محاسب)
├── Company: TexaCo
├── Branches: [الرياض (primary), جدة (read_only)]
├── Warehouses: []
├── Role: accountant
│   └── permissions: {accounting: {view, create, edit}, reports: {view, export}}
├── Module Permissions:
│   ├── accounting: {view, create, edit, approve: false}
│   └── reports: {view, export}
└── Account Access:
    ├── Branch: الرياض → Full Access to all accounts
    └── Branch: جدة → View only
```

### السيناريو 2: مدير مستودع
```
User: محمد (مدير مستودع)
├── Company: TexaCo
├── Branches: [الرياض]
├── Warehouses: [مستودع المواد (manager), مستودع التجزئة (supervisor)]
├── Role: warehouse_manager
│   └── permissions: {inventory: {view, create, edit, delete}}
├── Module Permissions:
│   ├── inventory: {view, create, edit, delete}
│   ├── stock_count: {view, create, edit}
│   └── reports: {view}
└── Account Access: []  -- لا صلاحية على الحسابات
```

---

## 7️⃣ خطة التنفيذ

### المرحلة 1: تحديث قاعدة البيانات (1-2 أيام)
- [ ] إنشاء `user_branches`
- [ ] إنشاء `user_module_permissions`
- [ ] إنشاء `account_access`
- [ ] تحديث RLS Policies

### المرحلة 2: Backend Services (2-3 أيام)
- [ ] `permissionService.ts`
- [ ] `checkPermission()` function
- [ ] `getUserPermissions()` function
- [ ] `getAccessibleBranches()` function

### المرحلة 3: Frontend Integration (3-4 أيام)
- [ ] `usePermissions()` hook
- [ ] `<PermissionGuard>` component
- [ ] تحديث Sidebar لإخفاء الوحدات
- [ ] تحديث الجداول لفلترة البيانات

### المرحلة 4: UI لإدارة الصلاحيات (2-3 أيام)
- [ ] صفحة إدارة الأدوار
- [ ] صفحة تعيين الصلاحيات للمستخدم
- [ ] صفحة إدارة الوصول للفروع
- [ ] صفحة إدارة الوصول للمستودعات

---

## 📊 ملخص

| العنصر | الحالة | النسبة |
|--------|--------|--------|
| هيكل الأدوار | ✅ | 90% |
| ربط المستخدمين بالأدوار | ✅ | 95% |
| ربط المستخدمين بالمستودعات | ✅ | 100% |
| ربط المستخدمين بالفروع | ⚠️ | 40% |
| صلاحيات الوحدات | ⚠️ | 30% |
| صلاحيات الحسابات | ❌ | 10% |
| واجهة إدارة الصلاحيات | ⚠️ | 25% |
| **الإجمالي** | ⚠️ | **~55%** |

---

**هل تريد أن أبدأ بتنفيذ أي من هذه المراحل؟**

---

*تم إعداد هذا التقييم في 2026-02-04*

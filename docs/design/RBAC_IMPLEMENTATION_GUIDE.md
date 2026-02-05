# نظام الصلاحيات والمستخدمين - RBAC System
## التوثيق الكامل - Complete Documentation

---

## 📋 الخطة الشاملة

### 1️⃣ الأدوار الجاهزة (System Roles)

| الكود | الاسم العربي | المستوى | الصلاحيات |
|-------|-------------|---------|-----------|
| `super_admin` | مدير النظام | Platform | كل الصلاحيات |
| `tenant_owner` | مالك الحساب | Tenant | إدارة الشركات والمستخدمين |
| `company_admin` | مدير الشركة | Company | إدارة الفروع والأدوار والمستخدمين |
| `branch_manager` | مدير الفرع | Branch | إدارة عمليات الفرع |
| `accountant` | محاسب | Operations | المحاسبة والخزينة |
| `cashier` | أمين صندوق | Operations | الخزينة والمبيعات |
| `warehouse_keeper` | أمين مستودع | Operations | المستودعات والمخزون |
| `sales_rep` | مندوب مبيعات | Operations | المبيعات والمخزون (قراءة) |
| `viewer` | مشاهد | Operations | قراءة فقط |

---

### 2️⃣ صلاحيات الموارد (Resource Permissions)

#### الصناديق (Funds)
- `can_deposit` - صلاحية الإيداع
- `can_withdraw` - صلاحية السحب
- `is_primary` - الصندوق الرئيسي

#### المستودعات (Warehouses)
- `can_receive` - صلاحية الاستلام
- `can_issue` - صلاحية الصرف
- `is_keeper` - أمين المستودع

#### الفروع (Branches)
- `can_manage` - صلاحية الإدارة
- `is_primary` - الفرع الرئيسي

---

### 3️⃣ الجداول المطلوبة

```
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC DATABASE SCHEMA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐   │
│  │   roles     │────▶│   user_roles    │◀────│user_profiles│   │
│  └─────────────┘     └─────────────────┘     └─────────────┘   │
│        │                     │                      │           │
│        │                     ▼                      │           │
│        │         ┌──────────────────────┐          │           │
│        │         │ user_resource_access │◀─────────┘           │
│        │         └──────────────────────┘                       │
│        │                     │                                   │
│        ▼                     ▼                                   │
│  ┌─────────────┐     ┌─────────────────┐                        │
│  │visibility_  │     │ branches/       │                        │
│  │   rules     │     │ warehouses/funds│                        │
│  └─────────────┘     └─────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4️⃣ صفحات الواجهة

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| إعدادات النظام | `/system-config` | الصفحة الرئيسية للإعدادات |
| └─ إدارة الأدوار | `tab=roles` | إنشاء وتعديل الأدوار |
| └─ إدارة المستخدمين | `tab=users` | تعيين الأدوار للمستخدمين |
| └─ صلاحيات الموارد | `tab=resources` | الصناديق والمستودعات والفروع |
| └─ قواعد الإخفاء | `tab=visibility` | إخفاء الحقول والصفحات |
| └─ الموديولات | `tab=modules` | تفعيل/إلغاء الموديولات |

---

## 🔧 خطوات التنفيذ

### الخطوة 1: تنفيذ Migration في Supabase

1. افتح **Supabase Dashboard**
2. اذهب إلى **SQL Editor**
3. انسخ محتوى الملف: `supabase/migrations/20260206_complete_rbac_setup.sql`
4. اضغط **Run**
5. انتظر 10-30 ثانية حتى يُحدّث PostgREST

### الخطوة 2: التحقق من التنفيذ

بعد التنفيذ، يجب أن ترى:
- ✅ جدول `user_roles` مع العلاقات الصحيحة
- ✅ جدول `user_resource_access` للصلاحيات
- ✅ جدول `visibility_rules` لقواعد الإخفاء
- ✅ 9 أدوار نظام جاهزة
- ✅ دوال RPC للاستعلامات

### الخطوة 3: تعيين دور للمستخدم الحالي

يتم تلقائياً تعيين دور `super_admin` لأول مستخدم.

---

## 📁 الملفات المعدّلة

### ملفات Frontend

| الملف | الوصف |
|-------|-------|
| `src/features/settings/SystemConfigPage.tsx` | الصفحة الرئيسية للإعدادات |
| `src/features/settings/components/RolesManagementTab.tsx` | إدارة الأدوار |
| `src/features/settings/components/UsersManagementTab.tsx` | إدارة المستخدمين |
| `src/features/settings/components/VisibilityRulesTab.tsx` | قواعد الإخفاء |
| `src/services/rbacService.ts` | خدمة RBAC |
| `src/hooks/useRBAC.ts` | Hook للصلاحيات |

### ملفات Backend (Migrations)

| الملف | الوصف |
|-------|-------|
| `20260206_complete_rbac_setup.sql` | Migration شامل |

---

## 🎯 الميزات المنجزة

### ✅ إدارة الأدوار
- [x] عرض جميع الأدوار
- [x] إنشاء دور جديد
- [x] تعديل دور موجود
- [x] نسخ دور
- [x] حذف دور (غير النظامي)
- [x] تحديد الموديولات المرئية
- [x] مصفوفة الصلاحيات (قراءة، كتابة، حذف)

### ✅ إدارة المستخدمين
- [x] عرض المستخدمين وأدوارهم
- [x] تعيين دور لمستخدم
- [x] إزالة دور من مستخدم
- [x] البحث والفلترة

### ✅ صلاحيات الموارد
- [x] ربط المستخدم بالصناديق
- [x] ربط المستخدم بالمستودعات
- [x] ربط المستخدم بالفروع
- [x] تحديد الصلاحيات التفصيلية

### ✅ قواعد الإخفاء
- [x] إخفاء صفحات
- [x] إخفاء حقول
- [x] قيم الإخفاء (Mask Values)

---

## 📊 الأدوار والصلاحيات التفصيلية

### مدير النظام (super_admin)
```json
{
  "modules": ["*"],
  "permissions": {
    "all": ["read", "write", "delete", "admin"]
  }
}
```

### مالك الحساب (tenant_owner)
```json
{
  "modules": ["dashboard", "accounting", "treasury", "sales", "purchases", 
              "inventory", "warehouse", "fabric", "shipments", "crm", 
              "activity_log", "system_config", "reports"],
  "permissions": {
    "all": ["read", "write", "delete"]
  }
}
```

### مدير الشركة (company_admin)
```json
{
  "modules": ["dashboard", "accounting", "treasury", "sales", "purchases", 
              "inventory", "warehouse", "reports", "system_config"],
  "permissions": {
    "accounting": ["read", "write"],
    "treasury": ["read", "write"],
    "sales": ["read", "write", "delete"],
    "purchases": ["read", "write", "delete"],
    "inventory": ["read", "write"],
    "warehouse": ["read", "write"]
  }
}
```

### محاسب (accountant)
```json
{
  "modules": ["dashboard", "accounting", "treasury", "reports"],
  "permissions": {
    "accounting": ["read", "write"],
    "treasury": ["read", "write"],
    "reports": ["read"]
  }
}
```

### أمين صندوق (cashier)
```json
{
  "modules": ["dashboard", "treasury", "sales"],
  "permissions": {
    "treasury": ["read", "write"],
    "sales": ["read"]
  }
}
```

---

## 🔒 نموذج الأمان

### 1. Row Level Security (RLS)
جميع الجداول محمية بـ RLS مع policies مناسبة.

### 2. Foreign Key Constraints
جميع العلاقات محددة بـ `ON DELETE CASCADE` لضمان سلامة البيانات.

### 3. PostgREST Schema Cache
تم إضافة `NOTIFY pgrst, 'reload schema'` لتحديث الـ cache.

---

## 📝 ملاحظات مهمة

1. **بعد تنفيذ الـ Migration**: انتظر 10-30 ثانية ثم أعد تحميل الصفحة
2. **الأدوار النظامية**: لا يمكن حذفها (`can_be_deleted = false`)
3. **التحديثات**: أي تغيير في الأدوار يتطلب إعادة تسجيل الدخول لتطبيقه

---

## 🚀 الخطوات التالية (اختياري)

1. [ ] إضافة سجل تغييرات الصلاحيات (Audit Log)
2. [ ] إضافة صلاحيات على مستوى الحقل (Field-level permissions)
3. [ ] إضافة نظام الموافقات للتغييرات الحساسة
4. [ ] إضافة تقارير الصلاحيات

---

*آخر تحديث: 2026-02-05*

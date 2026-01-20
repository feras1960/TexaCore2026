# الهيكلية الصحيحة - Multi-Tenant SaaS
# Correct Architecture - Multi-Tenant SaaS

## ✅ الفهم الصحيح

### 🏗️ الهيكلية:

```
┌─────────────────────────────────────────┐
│  Tenant 1 (مشترك SaaS)                  │
│  tenant_id: tenant-1                    │
├─────────────────────────────────────────┤
│  ├── Company A (company_id: comp-1)     │
│  │   ├── Branches                      │
│  │   ├── Users                          │
│  │   ├── Customers                      │
│  │   └── Products                        │
│  │                                       │
│  ├── Company B (company_id: comp-2)     │
│  │   ├── Branches                      │
│  │   ├── Users                          │
│  │   └── ...                            │
│  │                                       │
│  └── Company C (company_id: comp-3)    │
│      └── ...                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Tenant 2 (مشترك SaaS آخر)              │
│  tenant_id: tenant-2                    │
├─────────────────────────────────────────┤
│  ├── Company X (company_id: comp-x)     │
│  └── Company Y (company_id: comp-y)     │
└─────────────────────────────────────────┘
```

---

## 🔒 العزل (Isolation)

### 1️⃣ العزل بين Tenants (مشتركين مختلفين):
```sql
-- Tenant 1 لا يرى بيانات Tenant 2
WHERE tenant_id = 'tenant-1'
```

### 2️⃣ العزل بين Companies (داخل نفس Tenant):
```sql
-- Company A لا يرى بيانات Company B (نفس Tenant)
WHERE tenant_id = 'tenant-1' AND company_id = 'comp-1'
```

---

## 📊 الجداول

### كل جدول يحتوي على:
```sql
-- مثال: customers
id, name, tenant_id, company_id, ...

-- مثال: products
id, name, tenant_id, company_id, ...

-- مثال: sales_invoices
id, number, tenant_id, company_id, branch_id, ...
```

---

## 🎯 القواعد

### ✅ قاعدة 1: كل مشترك = Tenant
- عند تسجيل مشترك جديد → إنشاء tenant جديد
- كل tenant له بيانات منفصلة تماماً

### ✅ قاعدة 2: كل شركة = Company داخل Tenant
- مشترك واحد يمكن أن يكون لديه عدة شركات
- كل شركة لها بيانات منفصلة داخل نفس tenant

### ✅ قاعدة 3: العزل المزدوج
- **tenant_id** → عزل بين المشتركين
- **company_id** → عزل بين الشركات داخل نفس المشترك

---

## 💡 مثال عملي

### مشترك جديد يسجل:
```sql
-- 1. إنشاء Tenant
INSERT INTO tenants (code, name, email)
VALUES ('customer-001', 'أحمد محمد', 'ahmed@example.com');

-- 2. إنشاء Company الأولى
INSERT INTO companies (tenant_id, code, name)
VALUES ('tenant-uuid', 'COMP-001', 'شركة أحمد للتجارة');

-- 3. إنشاء Company ثانية (نفس Tenant)
INSERT INTO companies (tenant_id, code, name)
VALUES ('tenant-uuid', 'COMP-002', 'شركة أحمد للصناعة');
```

### البيانات:
```sql
-- Customers للشركة الأولى
customers: tenant_id='tenant-uuid', company_id='comp-1'

-- Customers للشركة الثانية
customers: tenant_id='tenant-uuid', company_id='comp-2'

-- كلاهما نفس tenant_id لكن company_id مختلف
```

---

## 🔐 Row Level Security (RLS)

### Policy للعزل:
```sql
-- المستخدم يرى فقط:
-- 1. بيانات tenant الخاص به
-- 2. بيانات company الخاصة به (داخل tenant)

CREATE POLICY "Users see their tenant and company data"
ON customers
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM companies 
        WHERE id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
    AND company_id IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);
```

---

## ✅ الخلاصة

| العنصر | الوصف |
|--------|-------|
| **Tenant** | مشترك SaaS (عميل النظام) |
| **Company** | شركة داخل Tenant |
| **tenant_id** | عزل بين المشتركين |
| **company_id** | عزل بين الشركات داخل نفس المشترك |
| **كل جدول** | يحتوي tenant_id + company_id |

---

## 🎯 هذا صحيح تماماً! ✅

**الهيكلية:**
- Multi-Tenant System (SaaS)
- كل مشترك = Tenant
- كل شركة = Company داخل Tenant
- العزل: tenant_id + company_id

**مظبوط! ✅**

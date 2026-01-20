# تأكيد الهيكلية - SaaS Multi-Tenant
# Architecture Confirmation - SaaS Multi-Tenant

## ✅ نعم، مظبوط تماماً!

### 🎯 الهيكلية المطلوبة:

```
┌─────────────────────────────────────────────┐
│  Tenant 1 (مشترك SaaS جديد)                │
│  tenant_id: tenant-1                       │
│  name: "أحمد محمد"                         │
│  email: "ahmed@example.com"                │
├─────────────────────────────────────────────┤
│  ├── Company A                             │
│  │   company_id: comp-1                   │
│  │   tenant_id: tenant-1                  │
│  │   ├── Branches                         │
│  │   ├── Customers                        │
│  │   ├── Products                          │
│  │   └── Sales                             │
│  │                                         │
│  ├── Company B                             │
│  │   company_id: comp-2                   │
│  │   tenant_id: tenant-1                  │
│  │   ├── Branches                         │
│  │   └── ...                               │
│  │                                         │
│  └── Company C                             │
│      company_id: comp-3                    │
│      tenant_id: tenant-1                  │
│      └── ...                               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Tenant 2 (مشترك SaaS آخر)                 │
│  tenant_id: tenant-2                       │
│  name: "سارة علي"                          │
├─────────────────────────────────────────────┤
│  ├── Company X                             │
│  │   company_id: comp-x                   │
│  │   tenant_id: tenant-2                  │
│  └── Company Y                             │
│      company_id: comp-y                    │
│      tenant_id: tenant-2                  │
└─────────────────────────────────────────────┘
```

---

## 🔒 العزل (Isolation)

### 1️⃣ العزل بين Tenants (مشتركين مختلفين):
```sql
-- Tenant 1 لا يرى بيانات Tenant 2
WHERE tenant_id = 'tenant-1'
```

**مثال:**
```sql
-- Tenant 1 يرى فقط:
SELECT * FROM customers WHERE tenant_id = 'tenant-1';

-- Tenant 2 يرى فقط:
SELECT * FROM customers WHERE tenant_id = 'tenant-2';
```

---

### 2️⃣ العزل بين Companies (داخل نفس Tenant):
```sql
-- Company A لا يرى بيانات Company B (نفس Tenant)
WHERE tenant_id = 'tenant-1' AND company_id = 'comp-1'
```

**مثال:**
```sql
-- Company A (داخل Tenant 1) يرى فقط:
SELECT * FROM customers 
WHERE tenant_id = 'tenant-1' 
  AND company_id = 'comp-1';

-- Company B (داخل Tenant 1) يرى فقط:
SELECT * FROM customers 
WHERE tenant_id = 'tenant-1' 
  AND company_id = 'comp-2';
```

---

## 📊 الجداول - الهيكلية

### كل جدول يحتوي على:
```sql
-- customers
id, name, tenant_id, company_id, ...

-- products
id, name, tenant_id, company_id, ...

-- sales_invoices
id, number, tenant_id, company_id, branch_id, ...

-- inventory_stock
id, product_id, tenant_id, company_id, warehouse_id, ...
```

---

## 🎯 سيناريو: مشترك جديد

### الخطوة 1: إنشاء Tenant (المشترك)
```sql
INSERT INTO tenants (code, name, email, status)
VALUES (
    'customer-001',
    'أحمد محمد',
    'ahmed@example.com',
    'active'
)
RETURNING id;
-- النتيجة: tenant_id = 'uuid-tenant-1'
```

### الخطوة 2: إنشاء Company الأولى
```sql
INSERT INTO companies (
    tenant_id,
    code,
    name,
    name_ar
)
VALUES (
    'uuid-tenant-1',  -- tenant_id من الخطوة السابقة
    'COMP-001',
    'شركة أحمد للتجارة',
    'شركة أحمد للتجارة'
)
RETURNING id;
-- النتيجة: company_id = 'uuid-comp-1'
```

### الخطوة 3: إنشاء Company ثانية (نفس Tenant)
```sql
INSERT INTO companies (
    tenant_id,
    code,
    name,
    name_ar
)
VALUES (
    'uuid-tenant-1',  -- نفس tenant_id
    'COMP-002',
    'شركة أحمد للصناعة',
    'شركة أحمد للصناعة'
)
RETURNING id;
-- النتيجة: company_id = 'uuid-comp-2'
```

---

## 📋 البيانات - مثال

### Customers للشركة الأولى:
```sql
INSERT INTO customers (
    tenant_id,
    company_id,
    code,
    name_ar
)
VALUES (
    'uuid-tenant-1',  -- Tenant 1
    'uuid-comp-1',    -- Company A
    'CUST-001',
    'عميل 1'
);
```

### Customers للشركة الثانية (نفس Tenant):
```sql
INSERT INTO customers (
    tenant_id,
    company_id,
    code,
    name_ar
)
VALUES (
    'uuid-tenant-1',  -- نفس Tenant 1
    'uuid-comp-2',    -- Company B (مختلفة)
    'CUST-001',
    'عميل 2'
);
```

**ملاحظة:** كلاهما نفس `tenant_id` لكن `company_id` مختلف!

---

## 🔐 Row Level Security (RLS)

### Policy للعزل المزدوج:
```sql
-- المستخدم يرى فقط:
-- 1. بيانات tenant الخاص به
-- 2. بيانات company الخاصة به (داخل tenant)

CREATE POLICY "Users see their tenant and company data"
ON customers
FOR SELECT
USING (
    -- العزل الأول: tenant_id
    tenant_id IN (
        SELECT tenant_id FROM companies 
        WHERE id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
    -- العزل الثاني: company_id
    AND company_id IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);
```

---

## ✅ القواعد

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

## 📝 الخلاصة

| العنصر | الوصف | مثال |
|--------|-------|------|
| **Tenant** | مشترك SaaS (عميل النظام) | أحمد محمد |
| **Company** | شركة داخل Tenant | شركة أحمد للتجارة |
| **tenant_id** | عزل بين المشتركين | tenant-1 ≠ tenant-2 |
| **company_id** | عزل بين الشركات داخل نفس Tenant | comp-1 ≠ comp-2 |
| **كل جدول** | يحتوي tenant_id + company_id | customers, products, etc. |

---

## ✅ تأكيد

**نعم، مظبوط تماماً! ✅**

الهيكلية الحالية تدعم:
- ✅ Multi-Tenant SaaS
- ✅ كل مشترك = tenant
- ✅ عدة شركات داخل نفس tenant
- ✅ عزل مزدوج: tenant_id + company_id

**الهيكلية جاهزة! 🎉**

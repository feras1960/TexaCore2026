# 👥 العملاء والموردين API
# Customers & Suppliers API

---

## 📋 نظرة عامة

- **العملاء (Customers)**: الأطراف التي نبيع لها
- **الموردين (Suppliers)**: الأطراف التي نشتري منها
- **المجموعات**: لتصنيف العملاء والموردين

---

## 1️⃣ العملاء (Customers)

### الجدول: `customers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | رمز العميل |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| customer_group_id | uuid | مجموعة العميل |
| account_id | uuid | حساب العميل |
| phone | varchar | الهاتف |
| email | varchar | البريد الإلكتروني |
| address | text | العنوان |
| city | varchar | المدينة |
| country | varchar | الدولة |
| tax_number | varchar | الرقم الضريبي |
| credit_limit | decimal | حد الائتمان |
| payment_terms | integer | شروط الدفع (أيام) |
| is_active | boolean | نشط |

### 📖 GET - جلب كل العملاء

```typescript
const { data, error } = await supabase
  .from('customers')
  .select(`
    *,
    group:customer_groups(id, name_ar, name_en),
    account:chart_of_accounts(id, account_code, name_ar)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name_ar');
```

### 📖 GET - بحث في العملاء

```typescript
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('company_id', companyId)
  .or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`);
```

### 📖 GET - عميل واحد بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('customers')
  .select(`
    *,
    group:customer_groups(*),
    account:chart_of_accounts(id, account_code, name_ar),
    invoices:sales_invoices(
      id, 
      invoice_number, 
      invoice_date, 
      total_amount, 
      status
    ),
    balance:chart_of_accounts!account_id(current_balance)
  `)
  .eq('id', customerId)
  .single();
```

#### Response

```json
{
  "id": "cust-uuid",
  "code": "C001",
  "name_ar": "شركة الأمل التجارية",
  "name_en": "Al-Amal Trading Co.",
  "phone": "+966501234567",
  "email": "info@alamal.com",
  "address": "شارع الملك فهد",
  "city": "الرياض",
  "country": "SA",
  "tax_number": "300123456700003",
  "credit_limit": 100000,
  "payment_terms": 30,
  "is_active": true,
  "group": {
    "id": "group-uuid",
    "name_ar": "عملاء VIP",
    "name_en": "VIP Customers"
  },
  "account": {
    "id": "acc-uuid",
    "account_code": "1201-001",
    "name_ar": "ذمم شركة الأمل"
  },
  "invoices": [
    {
      "id": "inv-uuid",
      "invoice_number": "INV-2026-0001",
      "invoice_date": "2026-02-01",
      "total_amount": 15000,
      "status": "posted"
    }
  ]
}
```

### 📝 POST - إنشاء عميل جديد

```typescript
const { data, error } = await supabase
  .from('customers')
  .insert({
    company_id: companyId,
    code: 'C002',
    name_ar: 'مؤسسة النجاح',
    name_en: 'Success Est.',
    customer_group_id: groupId,
    phone: '+966509876543',
    email: 'info@success.com',
    address: 'حي الملز',
    city: 'الرياض',
    country: 'SA',
    credit_limit: 50000,
    payment_terms: 15
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث عميل

```typescript
const { data, error } = await supabase
  .from('customers')
  .update({
    phone: '+966501111111',
    credit_limit: 75000
  })
  .eq('id', customerId)
  .select()
  .single();
```

### 🗑️ DELETE/Soft Delete - إلغاء تفعيل عميل

```typescript
// Soft delete (recommended)
const { error } = await supabase
  .from('customers')
  .update({ is_active: false })
  .eq('id', customerId);

// Hard delete (if no related data)
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', customerId);
```

---

## 2️⃣ مجموعات العملاء (Customer Groups)

### الجدول: `customer_groups`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| discount_percent | decimal | نسبة الخصم |
| account_id | uuid | الحساب الافتراضي |

### 📖 GET - جلب المجموعات

```typescript
const { data, error } = await supabase
  .from('customer_groups')
  .select(`
    *,
    account:chart_of_accounts(id, account_code, name_ar),
    customers_count:customers(count)
  `)
  .eq('company_id', companyId);
```

### 📝 POST - إنشاء مجموعة

```typescript
const { data, error } = await supabase
  .from('customer_groups')
  .insert({
    company_id: companyId,
    code: 'VIP',
    name_ar: 'عملاء VIP',
    name_en: 'VIP Customers',
    discount_percent: 10
  })
  .select()
  .single();
```

---

## 3️⃣ الموردين (Suppliers)

### الجدول: `suppliers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | رمز المورد |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| supplier_group_id | uuid | مجموعة المورد |
| account_id | uuid | حساب المورد |
| phone | varchar | الهاتف |
| email | varchar | البريد الإلكتروني |
| address | text | العنوان |
| city | varchar | المدينة |
| country | varchar | الدولة |
| tax_number | varchar | الرقم الضريبي |
| payment_terms | integer | شروط الدفع (أيام) |
| is_active | boolean | نشط |

### 📖 GET - جلب كل الموردين

```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select(`
    *,
    group:supplier_groups(id, name_ar, name_en),
    account:chart_of_accounts(id, account_code, name_ar)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name_ar');
```

### 📖 GET - مورد واحد بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select(`
    *,
    group:supplier_groups(*),
    account:chart_of_accounts(id, account_code, name_ar),
    invoices:purchase_invoices(
      id, 
      invoice_number, 
      invoice_date, 
      total_amount, 
      status
    )
  `)
  .eq('id', supplierId)
  .single();
```

### 📝 POST - إنشاء مورد جديد

```typescript
const { data, error } = await supabase
  .from('suppliers')
  .insert({
    company_id: companyId,
    code: 'S001',
    name_ar: 'مصنع الأقمشة المتحدة',
    name_en: 'United Fabrics Factory',
    supplier_group_id: groupId,
    phone: '+86123456789',
    email: 'sales@unitedfabrics.cn',
    address: 'Guangzhou Industrial Zone',
    city: 'Guangzhou',
    country: 'CN',
    payment_terms: 60
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث مورد

```typescript
const { data, error } = await supabase
  .from('suppliers')
  .update({
    phone: '+86987654321',
    payment_terms: 45
  })
  .eq('id', supplierId)
  .select()
  .single();
```

---

## 4️⃣ مجموعات الموردين (Supplier Groups)

### الجدول: `supplier_groups`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| account_id | uuid | الحساب الافتراضي |

### 📖 GET - جلب المجموعات

```typescript
const { data, error } = await supabase
  .from('supplier_groups')
  .select(`
    *,
    account:chart_of_accounts(id, account_code, name_ar),
    suppliers_count:suppliers(count)
  `)
  .eq('company_id', companyId);
```

---

## 5️⃣ استعلامات متقدمة

### رصيد العميل

```typescript
// الحصول على رصيد العميل من حسابه
const { data } = await supabase
  .from('customers')
  .select(`
    id,
    name_ar,
    credit_limit,
    account:chart_of_accounts!account_id(
      current_balance
    )
  `)
  .eq('id', customerId)
  .single();

const balance = data.account?.current_balance || 0;
const availableCredit = data.credit_limit - balance;
```

### كشف حساب عميل

```typescript
// جلب حركات حساب العميل
const { data: customer } = await supabase
  .from('customers')
  .select('account_id')
  .eq('id', customerId)
  .single();

const { data: movements } = await supabase
  .from('journal_entry_lines')
  .select(`
    *,
    entry:journal_entries(
      entry_number,
      entry_date,
      description
    )
  `)
  .eq('account_id', customer.account_id)
  .order('entry.entry_date', { ascending: false });
```

### العملاء المتأخرين في السداد

```typescript
const { data: overdueCustomers } = await supabase
  .from('sales_invoices')
  .select(`
    customer:customers(id, name_ar, phone),
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    paid_amount
  `)
  .eq('company_id', companyId)
  .eq('status', 'posted')
  .lt('due_date', new Date().toISOString().split('T')[0])
  .lt('paid_amount', 'total_amount');  // غير مسددة بالكامل
```

### أفضل العملاء

```typescript
const { data: topCustomers } = await supabase
  .rpc('get_top_customers', {
    p_company_id: companyId,
    p_from_date: '2026-01-01',
    p_to_date: '2026-12-31',
    p_limit: 10
  });
```

---

## 6️⃣ التحقق من صحة البيانات

### التحقق من الرقم الضريبي السعودي

```typescript
const validateSaudiVAT = (taxNumber: string): boolean => {
  // 15 رقم يبدأ بـ 3
  const pattern = /^3\d{14}$/;
  return pattern.test(taxNumber);
};
```

### التحقق من حد الائتمان

```typescript
const checkCreditLimit = async (customerId: string, amount: number) => {
  const { data } = await supabase
    .from('customers')
    .select(`
      credit_limit,
      account:chart_of_accounts!account_id(current_balance)
    `)
    .eq('id', customerId)
    .single();

  const currentBalance = data.account?.current_balance || 0;
  const newBalance = currentBalance + amount;

  if (newBalance > data.credit_limit) {
    throw new Error(`تجاوز حد الائتمان. المتاح: ${data.credit_limit - currentBalance}`);
  }

  return true;
};
```

---

## ⚠️ قواعد الأعمال

### 1. لا يمكن حذف عميل له فواتير

```typescript
const canDeleteCustomer = async (customerId: string) => {
  const { count } = await supabase
    .from('sales_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId);

  return count === 0;
};
```

### 2. إنشاء حساب عميل تلقائياً

```typescript
// عند إنشاء عميل جديد، يُنشأ له حساب تلقائياً
// هذا يتم عبر trigger في قاعدة البيانات
// أو يمكن القيام به يدوياً:

const createCustomerWithAccount = async (customer: CreateCustomerInput) => {
  // 1. إنشاء الحساب
  const { data: account } = await supabase
    .from('chart_of_accounts')
    .insert({
      company_id: customer.company_id,
      account_code: `1201-${customer.code}`,
      name_ar: `ذمم ${customer.name_ar}`,
      name_en: `${customer.name_en} Receivable`,
      account_type_id: 'receivable-type-uuid',
      parent_id: 'customers-parent-uuid'
    })
    .select()
    .single();

  // 2. إنشاء العميل
  const { data: newCustomer } = await supabase
    .from('customers')
    .insert({
      ...customer,
      account_id: account.id
    })
    .select()
    .single();

  return newCustomer;
};
```

---

**التالي:** [inventory.md](./inventory.md) - المخزون والمستودعات

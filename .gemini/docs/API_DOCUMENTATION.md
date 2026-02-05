# 🔌 توثيق API - API Documentation
# TexaCore ERP Service Layer Reference

**تاريخ التحديث**: 2 فبراير 2026

---

## 📋 فهرس المحتويات

1. [معلومات عامة](#1-معلومات-عامة)
2. [المصادقة](#2-المصادقة)
3. [خدمات المحاسبة](#3-خدمات-المحاسبة)
4. [خدمات المستودعات](#4-خدمات-المستودعات)
5. [خدمات المبيعات](#5-خدمات-المبيعات)
6. [خدمات المشتريات](#6-خدمات-المشتريات)
7. [أنماط الأخطاء](#7-أنماط-الأخطاء)

---

## 1. معلومات عامة

### Base URL
```
https://[project-ref].supabase.co
```

### Headers المطلوبة
```http
Content-Type: application/json
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
```

### Response Format
```typescript
interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    code: string;
    details?: any;
  } | null;
}
```

---

## 2. المصادقة

### 2.1 تسجيل الدخول

```typescript
// POST /auth/v1/token?grant_type=password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

### 2.2 تسجيل الخروج

```typescript
await supabase.auth.signOut();
```

---

### 2.3 جلب المستخدم الحالي

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

## 3. خدمات المحاسبة

### 3.1 دليل الحسابات

#### جلب كل الحسابات
```typescript
// GET /rest/v1/chart_of_accounts
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('*')
  .eq('company_id', companyId)
  .order('account_code');
```

#### جلب حساب بالكود
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('*')
  .eq('company_id', companyId)
  .eq('account_code', code)
  .single();
```

#### جلب الشجرة مع الأبناء
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select(`
    *,
    children:chart_of_accounts!parent_id(*)
  `)
  .eq('company_id', companyId)
  .is('parent_id', null)
  .order('account_code');
```

#### إنشاء حساب
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    account_code: '1101',
    account_name: 'Cash in Hand',
    name_ar: 'النقدية بالصندوق',
    account_type: 'ASSET',
    parent_id: parentId
  })
  .select()
  .single();
```

#### تحديث حساب
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .update({
    account_name: 'Updated Name',
    is_active: false
  })
  .eq('id', accountId)
  .select()
  .single();
```

---

### 3.2 القيود المحاسبية

#### جلب القيود
```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .select(`
    *,
    lines:journal_entry_lines(
      *,
      account:chart_of_accounts(id, account_code, account_name)
    )
  `)
  .eq('company_id', companyId)
  .order('entry_date', { ascending: false });
```

#### إنشاء قيد جديد
```typescript
// Step 1: Create the entry
const { data: entry, error: entryError } = await supabase
  .from('journal_entries')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    entry_number: 'JE-2026-001',
    entry_date: '2026-02-02',
    description: 'فاتورة مبيعات',
    status: 'draft'
  })
  .select()
  .single();

// Step 2: Create the lines
const { error: linesError } = await supabase
  .from('journal_entry_lines')
  .insert([
    {
      journal_entry_id: entry.id,
      account_id: customerAccountId,
      debit: 1000,
      credit: 0,
      description: 'الذمم المدينة'
    },
    {
      journal_entry_id: entry.id,
      account_id: salesAccountId,
      debit: 0,
      credit: 1000,
      description: 'إيراد المبيعات'
    }
  ]);
```

#### ترحيل قيد
```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .update({
    status: 'posted',
    posted_at: new Date().toISOString(),
    posted_by: userId
  })
  .eq('id', entryId)
  .select()
  .single();
```

---

### 3.3 ميزان المراجعة

```typescript
const { data, error } = await supabase
  .rpc('get_trial_balance', {
    p_company_id: companyId,
    p_start_date: '2026-01-01',
    p_end_date: '2026-12-31'
  });
```

**Response:**
```json
[
  {
    "account_code": "1101",
    "account_name": "Cash",
    "debit_balance": 50000,
    "credit_balance": 0
  }
]
```

---

## 4. خدمات المستودعات

### 4.1 المستودعات

#### جلب المستودعات
```typescript
const { data, error } = await supabase
  .from('warehouses')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

#### جلب مستودع مع المواقع
```typescript
const { data, error } = await supabase
  .from('warehouses')
  .select(`
    *,
    locations:bin_locations(*)
  `)
  .eq('id', warehouseId)
  .single();
```

---

### 4.2 الرولونات

#### جلب الرولونات
```typescript
const { data, error } = await supabase
  .from('fabric_rolls')
  .select(`
    *,
    material:fabric_materials(id, code, name, name_ar),
    warehouse:warehouses(id, name),
    color:fabric_colors(id, name)
  `)
  .eq('company_id', companyId)
  .eq('status', 'available')
  .order('roll_number');
```

#### جلب رولون بالرقم
```typescript
const { data, error } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('company_id', companyId)
  .eq('roll_number', rollNumber)
  .single();
```

#### قص من رولون
```typescript
// Using RPC function
const { data, error } = await supabase
  .rpc('cut_from_roll', {
    p_roll_id: rollId,
    p_cut_amount: 10.5,
    p_reason: 'sale',
    p_reference_id: invoiceId
  });
```

#### حجز كمية
```typescript
const { data, error } = await supabase
  .rpc('reserve_roll_quantity', {
    p_roll_id: rollId,
    p_quantity: 25.0,
    p_customer_id: customerId,
    p_expiry_date: '2026-02-15'
  });
```

---

### 4.3 الكونتينرات

#### جلب الكونتينرات
```typescript
const { data, error } = await supabase
  .from('containers')
  .select(`
    *,
    supplier:suppliers(id, name),
    items:container_items(
      *,
      material:fabric_materials(id, code, name)
    ),
    expenses:container_expenses(*)
  `)
  .eq('company_id', companyId)
  .order('order_date', { ascending: false });
```

#### إنشاء كونتينر
```typescript
const { data: container, error } = await supabase
  .from('containers')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    container_number: 'CNT-2026-001',
    supplier_id: supplierId,
    order_date: '2026-02-01',
    expected_arrival: '2026-03-01',
    status: 'ordered',
    currency_code: 'USD'
  })
  .select()
  .single();

// Add items
const { error: itemsError } = await supabase
  .from('container_items')
  .insert([
    {
      container_id: container.id,
      material_id: materialId,
      quantity: 1000,
      unit_cost: 5.50
    }
  ]);
```

#### تحديث حالة الكونتينر
```typescript
const { data, error } = await supabase
  .from('containers')
  .update({ 
    status: 'arrived',
    actual_arrival: new Date().toISOString()
  })
  .eq('id', containerId)
  .select()
  .single();
```

---

### 4.4 الحجوزات

#### جلب الحجوزات النشطة
```typescript
const { data, error } = await supabase
  .from('reservations')
  .select(`
    *,
    customer:customers(id, name),
    items:reservation_items(
      *,
      roll:fabric_rolls(id, roll_number, current_length)
    )
  `)
  .eq('company_id', companyId)
  .eq('status', 'active')
  .order('expiry_date');
```

#### إنشاء حجز
```typescript
const { data, error } = await supabase
  .rpc('create_reservation', {
    p_customer_id: customerId,
    p_items: [
      { roll_id: rollId1, quantity: 50 },
      { roll_id: rollId2, quantity: 30 }
    ],
    p_expiry_date: '2026-02-15',
    p_deposit_amount: 500
  });
```

---

### 4.5 إذونات التسليم

#### جلب الإذونات
```typescript
const { data, error } = await supabase
  .from('delivery_notes')
  .select(`
    *,
    customer:customers(id, name),
    items:delivery_note_items(*)
  `)
  .eq('company_id', companyId)
  .order('delivery_date', { ascending: false });
```

---

### 4.6 الجرد

#### بدء جرد جديد
```typescript
const { data, error } = await supabase
  .from('stock_counts')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    count_number: 'SC-2026-001',
    warehouse_id: warehouseId,
    count_date: '2026-02-02',
    count_type: 'full',
    status: 'planned'
  })
  .select()
  .single();
```

#### تسجيل نتيجة العد
```typescript
const { data, error } = await supabase
  .from('stock_count_items')
  .update({
    actual_quantity: 95.5,
    is_counted: true,
    counted_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .select()
  .single();
```

#### إكمال الجرد
```typescript
const { data, error } = await supabase
  .rpc('complete_stock_count', {
    p_stock_count_id: stockCountId,
    p_create_adjustment: true
  });
```

---

## 5. خدمات المبيعات

### 5.1 العملاء

#### جلب العملاء
```typescript
const { data, error } = await supabase
  .from('customers')
  .select(`
    *,
    group:customer_groups(id, name),
    price_list:price_lists(id, name)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

#### البحث عن عميل
```typescript
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('company_id', companyId)
  .or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
  .limit(10);
```

#### جلب رصيد العميل
```typescript
const { data, error } = await supabase
  .rpc('get_customer_balance', {
    p_customer_id: customerId
  });
```

---

### 5.2 فواتير المبيعات

#### جلب الفواتير
```typescript
const { data, error } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers(id, name, phone),
    items:sales_invoice_items(
      *,
      roll:fabric_rolls(id, roll_number),
      material:fabric_materials(id, name)
    )
  `)
  .eq('company_id', companyId)
  .order('invoice_date', { ascending: false });
```

#### إنشاء فاتورة
```typescript
const { data, error } = await supabase
  .rpc('create_sales_invoice', {
    p_customer_id: customerId,
    p_invoice_date: '2026-02-02',
    p_items: [
      {
        roll_id: rollId,
        quantity: 25.5,
        unit_price: 10.00,
        discount_percent: 5
      }
    ],
    p_notes: 'ملاحظات'
  });
```

#### تأكيد الفاتورة
```typescript
const { data, error } = await supabase
  .rpc('post_sales_invoice', {
    p_invoice_id: invoiceId
  });
```

---

### 5.3 قوائم الأسعار

#### جلب سعر منتج
```typescript
const { data, error } = await supabase
  .from('price_list_items')
  .select('*')
  .eq('price_list_id', priceListId)
  .eq('material_id', materialId)
  .single();
```

---

## 6. خدمات المشتريات

### 6.1 الموردين

#### جلب الموردين
```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

---

### 6.2 فواتير المشتريات

#### إنشاء فاتورة مشتريات
```typescript
const { data, error } = await supabase
  .from('purchase_invoices')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    invoice_number: 'PI-2026-001',
    supplier_id: supplierId,
    invoice_date: '2026-02-02',
    container_id: containerId,
    subtotal: 5000,
    tax_amount: 250,
    total_amount: 5250,
    status: 'draft'
  })
  .select()
  .single();
```

---

## 7. أنماط الأخطاء

### رموز الأخطاء الشائعة

| الكود | الوصف | المعالجة |
|-------|-------|----------|
| `PGRST116` | سجل غير موجود | عرض رسالة "غير موجود" |
| `23505` | انتهاك UNIQUE | "هذا الكود مستخدم" |
| `23503` | انتهاك Foreign Key | "سجل مرتبط مفقود" |
| `42501` | صلاحية مرفوضة | "لا تملك الصلاحية" |
| `PGRST301` | Row-Level Security | "لا يمكن الوصول" |

### مثال معالجة الأخطاء

```typescript
const { data, error } = await supabase
  .from('table')
  .insert(record)
  .select()
  .single();

if (error) {
  if (error.code === '23505') {
    toast.error('هذا الكود مستخدم مسبقاً');
  } else if (error.code === '42501') {
    toast.error('لا تملك صلاحية لهذه العملية');
  } else {
    toast.error('حدث خطأ: ' + error.message);
  }
  return;
}

// Success
toast.success('تمت العملية بنجاح');
```

---

## 📊 ملخص API

| القسم | عدد الـ Endpoints | الأهم |
|-------|------------------|-------|
| المصادقة | 3 | signIn, signOut |
| المحاسبة | 12 | chart_of_accounts, journal_entries |
| المستودعات | 20 | fabric_rolls, containers, reservations |
| المبيعات | 10 | customers, sales_invoices |
| المشتريات | 6 | suppliers, purchase_invoices |
| **الإجمالي** | **50+** | - |

---

**© 2026 TexaCore ERP**

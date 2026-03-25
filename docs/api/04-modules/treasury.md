# 🏦 الخزينة API
# Treasury Module API

---

## 📋 نظرة عامة

وحدة الخزينة تشمل:
- الصناديق والحسابات البنكية (Funds)
- حركات الصندوق (Fund Transactions)
- سندات القبض (Payment Receipts)
- سندات الصرف (Payment Vouchers)
- التحويلات (Transfers)

---

## 1️⃣ الصناديق والحسابات البنكية (Funds)

### الجدول: `funds`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| branch_id | uuid | معرف الفرع |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| fund_type | varchar | النوع (cash/bank) |
| account_id | uuid | الحساب المرتبط |
| currency | varchar | العملة |
| opening_balance | decimal | الرصيد الافتتاحي |
| current_balance | decimal | الرصيد الحالي |
| is_default | boolean | افتراضي |
| is_active | boolean | نشط |

### أنواع الصناديق

| النوع | الوصف |
|-------|-------|
| `cash` | صندوق نقدي |
| `bank` | حساب بنكي |
| `petty_cash` | عهدة نثرية |

### 📖 GET - جلب الصناديق

```typescript
const { data, error } = await supabase
  .from('funds')
  .select(`
    *,
    branch:branches(id, name_ar),
    account:chart_of_accounts(id, account_code, name_ar)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name_ar');
```

### فلترة الصناديق

```typescript
// صناديق نقدية فقط
const { data } = await supabase
  .from('funds')
  .select('*')
  .eq('fund_type', 'cash');

// حسابات بنكية فقط
const { data } = await supabase
  .from('funds')
  .select('*')
  .eq('fund_type', 'bank');

// صناديق فرع معين
const { data } = await supabase
  .from('funds')
  .select('*')
  .eq('branch_id', branchId);
```

### 📖 GET - صندوق بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('funds')
  .select(`
    *,
    branch:branches(id, name_ar),
    account:chart_of_accounts(id, account_code, name_ar, current_balance),
    transactions:fund_transactions(
      id, transaction_type, amount, transaction_date, description
    )
  `)
  .eq('id', fundId)
  .single();
```

### 📝 POST - إنشاء صندوق

```typescript
const { data, error } = await supabase
  .from('funds')
  .insert({
    company_id: companyId,
    branch_id: branchId,
    code: 'CASH-01',
    name_ar: 'الصندوق الرئيسي',
    name_en: 'Main Cash',
    fund_type: 'cash',
    currency: 'SAR',
    opening_balance: 10000,
    current_balance: 10000,
    is_default: true
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث صندوق

```typescript
const { data, error } = await supabase
  .from('funds')
  .update({
    name_ar: 'صندوق المبيعات',
    is_default: false
  })
  .eq('id', fundId)
  .select()
  .single();
```

---

## 2️⃣ حركات الصندوق (Fund Transactions)

### الجدول: `fund_transactions`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| fund_id | uuid | معرف الصندوق |
| transaction_number | varchar | رقم الحركة |
| transaction_type | varchar | نوع الحركة |
| transaction_date | date | تاريخ الحركة |
| amount | decimal | المبلغ |
| reference_type | varchar | نوع المرجع |
| reference_id | uuid | معرف المرجع |
| description | text | الوصف |
| balance_after | decimal | الرصيد بعد |
| created_by | uuid | أنشئ بواسطة |

### أنواع الحركات

| النوع | الوصف | التأثير |
|-------|-------|---------|
| `receipt` | قبض | + |
| `payment` | صرف | - |
| `transfer_in` | تحويل وارد | + |
| `transfer_out` | تحويل صادر | - |
| `adjustment` | تسوية | +/- |

### 📖 GET - حركات صندوق

```typescript
const { data, error } = await supabase
  .from('fund_transactions')
  .select(`
    *,
    fund:funds(id, name_ar),
    created_by_user:user_profiles!created_by(full_name)
  `)
  .eq('fund_id', fundId)
  .order('transaction_date', { ascending: false })
  .order('created_at', { ascending: false });
```

### فلترة الحركات

```typescript
// حركات بفترة
const { data } = await supabase
  .from('fund_transactions')
  .select('*')
  .eq('fund_id', fundId)
  .gte('transaction_date', '2026-01-01')
  .lte('transaction_date', '2026-01-31');

// حركات قبض فقط
const { data } = await supabase
  .from('fund_transactions')
  .select('*')
  .eq('fund_id', fundId)
  .eq('transaction_type', 'receipt');
```

### 📖 GET - كشف حساب صندوق

```typescript
const getFundStatement = async (
  fundId: string, 
  fromDate: string, 
  toDate: string
) => {
  // 1. الرصيد الافتتاحي
  const { data: openingData } = await supabase
    .from('fund_transactions')
    .select('balance_after')
    .eq('fund_id', fundId)
    .lt('transaction_date', fromDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const openingBalance = openingData?.balance_after || 0;

  // 2. الحركات
  const { data: transactions } = await supabase
    .from('fund_transactions')
    .select('*')
    .eq('fund_id', fundId)
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate)
    .order('transaction_date')
    .order('created_at');

  // 3. حساب الرصيد التراكمي
  let runningBalance = openingBalance;
  const statement = transactions.map(tx => {
    if (['receipt', 'transfer_in', 'adjustment'].includes(tx.transaction_type) && tx.amount > 0) {
      runningBalance += tx.amount;
    } else {
      runningBalance -= Math.abs(tx.amount);
    }
    return { ...tx, running_balance: runningBalance };
  });

  return {
    opening_balance: openingBalance,
    transactions: statement,
    closing_balance: runningBalance
  };
};
```

---

## 3️⃣ سندات القبض (Payment Receipts)

### الجدول: `payment_receipts`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| receipt_number | varchar | رقم السند |
| receipt_date | date | تاريخ السند |
| customer_id | uuid | معرف العميل |
| fund_id | uuid | معرف الصندوق |
| amount | decimal | المبلغ |
| payment_method | varchar | طريقة الدفع |
| check_number | varchar | رقم الشيك |
| check_date | date | تاريخ الشيك |
| bank_name | varchar | اسم البنك |
| invoice_id | uuid | معرف الفاتورة |
| description | text | الوصف |
| status | varchar | الحالة |

### طرق الدفع

| الطريقة | الوصف |
|---------|-------|
| `cash` | نقدي |
| `check` | شيك |
| `bank_transfer` | تحويل بنكي |
| `credit_card` | بطاقة ائتمان |
| `mada` | مدى |

### 📖 GET - سندات القبض

```typescript
const { data, error } = await supabase
  .from('payment_receipts')
  .select(`
    *,
    customer:customers(id, name_ar),
    fund:funds(id, name_ar),
    invoice:sales_invoices(invoice_number)
  `)
  .eq('company_id', companyId)
  .order('receipt_date', { ascending: false });
```

### 📝 POST - إنشاء سند قبض

```typescript
const createPaymentReceipt = async (receiptData: CreateReceiptInput) => {
  // 1. إنشاء السند
  const { data: receipt, error } = await supabase
    .from('payment_receipts')
    .insert({
      company_id: receiptData.company_id,
      customer_id: receiptData.customer_id,
      fund_id: receiptData.fund_id,
      receipt_date: receiptData.receipt_date,
      amount: receiptData.amount,
      payment_method: receiptData.payment_method,
      check_number: receiptData.check_number,
      check_date: receiptData.check_date,
      bank_name: receiptData.bank_name,
      invoice_id: receiptData.invoice_id,
      description: receiptData.description,
      status: 'posted'
    })
    .select()
    .single();

  if (error) throw error;

  // 2. إنشاء حركة الصندوق
  await supabase.from('fund_transactions').insert({
    company_id: receiptData.company_id,
    fund_id: receiptData.fund_id,
    transaction_type: 'receipt',
    transaction_date: receiptData.receipt_date,
    amount: receiptData.amount,
    reference_type: 'payment_receipt',
    reference_id: receipt.id,
    description: `قبض من ${receiptData.customer_name}: ${receiptData.description}`
  });

  // 3. تحديث رصيد الصندوق
  await supabase.rpc('update_fund_balance', {
    p_fund_id: receiptData.fund_id,
    p_amount: receiptData.amount
  });

  // 4. تحديث الفاتورة إذا وجدت
  if (receiptData.invoice_id) {
    await updateInvoicePaidAmount(receiptData.invoice_id, receiptData.amount);
  }

  return receipt;
};
```

---

## 4️⃣ سندات الصرف (Payment Vouchers)

### الجدول: `payment_vouchers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| voucher_number | varchar | رقم السند |
| voucher_date | date | تاريخ السند |
| supplier_id | uuid | معرف المورد |
| employee_id | uuid | معرف الموظف |
| fund_id | uuid | معرف الصندوق |
| amount | decimal | المبلغ |
| payment_method | varchar | طريقة الدفع |
| invoice_id | uuid | معرف الفاتورة |
| expense_type | varchar | نوع المصروف |
| description | text | الوصف |
| status | varchar | الحالة |

### 📖 GET - سندات الصرف

```typescript
const { data, error } = await supabase
  .from('payment_vouchers')
  .select(`
    *,
    supplier:suppliers(id, name_ar),
    employee:user_profiles!employee_id(full_name),
    fund:funds(id, name_ar),
    invoice:purchase_invoices(invoice_number)
  `)
  .eq('company_id', companyId)
  .order('voucher_date', { ascending: false });
```

### 📝 POST - إنشاء سند صرف

```typescript
const createPaymentVoucher = async (voucherData: CreateVoucherInput) => {
  // 1. التحقق من رصيد الصندوق
  const { data: fund } = await supabase
    .from('funds')
    .select('current_balance')
    .eq('id', voucherData.fund_id)
    .single();

  if (fund.current_balance < voucherData.amount) {
    throw new Error('رصيد الصندوق غير كافي');
  }

  // 2. إنشاء السند
  const { data: voucher, error } = await supabase
    .from('payment_vouchers')
    .insert({
      company_id: voucherData.company_id,
      supplier_id: voucherData.supplier_id,
      employee_id: voucherData.employee_id,
      fund_id: voucherData.fund_id,
      voucher_date: voucherData.voucher_date,
      amount: voucherData.amount,
      payment_method: voucherData.payment_method,
      invoice_id: voucherData.invoice_id,
      expense_type: voucherData.expense_type,
      description: voucherData.description,
      status: 'posted'
    })
    .select()
    .single();

  if (error) throw error;

  // 3. إنشاء حركة الصندوق
  await supabase.from('fund_transactions').insert({
    company_id: voucherData.company_id,
    fund_id: voucherData.fund_id,
    transaction_type: 'payment',
    transaction_date: voucherData.voucher_date,
    amount: -voucherData.amount,
    reference_type: 'payment_voucher',
    reference_id: voucher.id,
    description: voucherData.description
  });

  // 4. تحديث رصيد الصندوق
  await supabase.rpc('update_fund_balance', {
    p_fund_id: voucherData.fund_id,
    p_amount: -voucherData.amount
  });

  return voucher;
};
```

---

## 5️⃣ التحويلات بين الصناديق (Transfers)

### الجدول: `fund_transfers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| transfer_number | varchar | رقم التحويل |
| transfer_date | date | تاريخ التحويل |
| from_fund_id | uuid | من صندوق |
| to_fund_id | uuid | إلى صندوق |
| amount | decimal | المبلغ |
| description | text | الوصف |
| status | varchar | الحالة |

### 📖 GET - التحويلات

```typescript
const { data, error } = await supabase
  .from('fund_transfers')
  .select(`
    *,
    from_fund:funds!from_fund_id(id, name_ar),
    to_fund:funds!to_fund_id(id, name_ar)
  `)
  .eq('company_id', companyId)
  .order('transfer_date', { ascending: false });
```

### 📝 POST - إنشاء تحويل

```typescript
const createFundTransfer = async (transferData: CreateTransferInput) => {
  // 1. التحقق من رصيد المصدر
  const { data: fromFund } = await supabase
    .from('funds')
    .select('current_balance')
    .eq('id', transferData.from_fund_id)
    .single();

  if (fromFund.current_balance < transferData.amount) {
    throw new Error('رصيد الصندوق المصدر غير كافي');
  }

  // 2. إنشاء التحويل
  const { data: transfer, error } = await supabase
    .from('fund_transfers')
    .insert({
      company_id: transferData.company_id,
      from_fund_id: transferData.from_fund_id,
      to_fund_id: transferData.to_fund_id,
      transfer_date: transferData.transfer_date,
      amount: transferData.amount,
      description: transferData.description,
      status: 'completed'
    })
    .select()
    .single();

  if (error) throw error;

  // 3. حركة الخصم
  await supabase.from('fund_transactions').insert({
    company_id: transferData.company_id,
    fund_id: transferData.from_fund_id,
    transaction_type: 'transfer_out',
    transaction_date: transferData.transfer_date,
    amount: -transferData.amount,
    reference_type: 'fund_transfer',
    reference_id: transfer.id,
    description: `تحويل إلى ${transferData.to_fund_name}`
  });

  // 4. حركة الإضافة
  await supabase.from('fund_transactions').insert({
    company_id: transferData.company_id,
    fund_id: transferData.to_fund_id,
    transaction_type: 'transfer_in',
    transaction_date: transferData.transfer_date,
    amount: transferData.amount,
    reference_type: 'fund_transfer',
    reference_id: transfer.id,
    description: `تحويل من ${transferData.from_fund_name}`
  });

  // 5. تحديث الأرصدة
  await supabase.rpc('update_fund_balance', {
    p_fund_id: transferData.from_fund_id,
    p_amount: -transferData.amount
  });

  await supabase.rpc('update_fund_balance', {
    p_fund_id: transferData.to_fund_id,
    p_amount: transferData.amount
  });

  return transfer;
};
```

---

## 6️⃣ تقارير الخزينة

### ملخص الصناديق

```typescript
const { data } = await supabase
  .from('funds')
  .select(`
    id, name_ar, fund_type, currency, current_balance
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);

const summary = {
  cash_total: data.filter(f => f.fund_type === 'cash')
    .reduce((sum, f) => sum + f.current_balance, 0),
  bank_total: data.filter(f => f.fund_type === 'bank')
    .reduce((sum, f) => sum + f.current_balance, 0),
  total: data.reduce((sum, f) => sum + f.current_balance, 0)
};
```

### تقرير المقبوضات والمدفوعات

```typescript
const getTreasuryReport = async (
  companyId: string,
  fromDate: string,
  toDate: string
) => {
  // المقبوضات
  const { data: receipts } = await supabase
    .from('payment_receipts')
    .select('amount')
    .eq('company_id', companyId)
    .gte('receipt_date', fromDate)
    .lte('receipt_date', toDate)
    .eq('status', 'posted');

  // المدفوعات
  const { data: vouchers } = await supabase
    .from('payment_vouchers')
    .select('amount')
    .eq('company_id', companyId)
    .gte('voucher_date', fromDate)
    .lte('voucher_date', toDate)
    .eq('status', 'posted');

  return {
    total_receipts: receipts.reduce((sum, r) => sum + r.amount, 0),
    total_payments: vouchers.reduce((sum, v) => sum + v.amount, 0),
    net: receipts.reduce((sum, r) => sum + r.amount, 0) - 
         vouchers.reduce((sum, v) => sum + v.amount, 0)
  };
};
```

---

**التالي:** [saas.md](./saas.md) - وحدة SaaS

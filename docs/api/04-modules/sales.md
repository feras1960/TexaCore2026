# 🛒 المبيعات API
# Sales Module API

---

## 📋 نظرة عامة

وحدة المبيعات تشمل:
- فواتير المبيعات (Sales Invoices)
- أوامر البيع (Sales Orders)
- عروض الأسعار (Quotations)
- قوائم الأسعار (Price Lists)
- إذونات التسليم (Delivery Notes)

---

## 1️⃣ فواتير المبيعات (Sales Invoices)

### الجدول: `sales_invoices`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| branch_id | uuid | معرف الفرع |
| invoice_number | varchar | رقم الفاتورة |
| invoice_date | date | تاريخ الفاتورة |
| due_date | date | تاريخ الاستحقاق |
| customer_id | uuid | معرف العميل |
| salesperson_id | uuid | معرف البائع |
| warehouse_id | uuid | معرف المستودع |
| subtotal | decimal | المجموع قبل الضريبة |
| discount_amount | decimal | مبلغ الخصم |
| tax_amount | decimal | مبلغ الضريبة |
| total_amount | decimal | الإجمالي |
| paid_amount | decimal | المبلغ المدفوع |
| status | varchar | الحالة |
| notes | text | ملاحظات |
| created_by | uuid | أنشئ بواسطة |

### الجدول: `sales_invoice_items`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| invoice_id | uuid | معرف الفاتورة |
| product_id | uuid | معرف المنتج |
| description | text | الوصف |
| quantity | decimal | الكمية |
| unit_price | decimal | سعر الوحدة |
| discount_percent | decimal | نسبة الخصم |
| tax_rate | decimal | نسبة الضريبة |
| line_total | decimal | إجمالي السطر |

### حالات الفاتورة

| الحالة | الوصف |
|--------|-------|
| `draft` | مسودة |
| `posted` | مرحّلة |
| `partial` | مدفوعة جزئياً |
| `paid` | مدفوعة بالكامل |
| `cancelled` | ملغاة |

### 📖 GET - جلب الفواتير

```typescript
const { data, error } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers(id, name_ar, phone),
    salesperson:user_profiles!salesperson_id(full_name),
    items:sales_invoice_items(
      *,
      product:products(id, sku, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .order('invoice_date', { ascending: false });
```

### فلترة الفواتير

```typescript
// بالحالة
const { data } = await supabase
  .from('sales_invoices')
  .select('*')
  .eq('status', 'posted');

// بالعميل
const { data } = await supabase
  .from('sales_invoices')
  .select('*')
  .eq('customer_id', customerId);

// بالفترة
const { data } = await supabase
  .from('sales_invoices')
  .select('*')
  .gte('invoice_date', '2026-01-01')
  .lte('invoice_date', '2026-01-31');

// غير المدفوعة
const { data } = await supabase
  .from('sales_invoices')
  .select('*')
  .in('status', ['posted', 'partial']);
```

### 📖 GET - فاتورة واحدة بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers(
      id, name_ar, name_en, phone, email, address, tax_number
    ),
    salesperson:user_profiles!salesperson_id(full_name, phone),
    warehouse:warehouses(id, name_ar),
    branch:branches(id, name_ar),
    items:sales_invoice_items(
      *,
      product:products(id, sku, name_ar, barcode)
    ),
    payments:payment_receipts(
      id, receipt_number, amount, payment_date
    )
  `)
  .eq('id', invoiceId)
  .single();
```

#### Response

```json
{
  "id": "inv-uuid",
  "invoice_number": "INV-2026-0001",
  "invoice_date": "2026-02-05",
  "due_date": "2026-03-07",
  "subtotal": 10000,
  "discount_amount": 500,
  "tax_amount": 1425,
  "total_amount": 10925,
  "paid_amount": 5000,
  "status": "partial",
  "customer": {
    "id": "cust-uuid",
    "name_ar": "شركة الأمل",
    "phone": "+966501234567",
    "tax_number": "300123456700003"
  },
  "items": [
    {
      "id": "item-uuid",
      "product_id": "prod-uuid",
      "description": "قماش قطني أبيض",
      "quantity": 100,
      "unit_price": 50,
      "discount_percent": 5,
      "tax_rate": 15,
      "line_total": 5462.50,
      "product": {
        "sku": "FAB-001",
        "name_ar": "قماش قطني أبيض"
      }
    }
  ],
  "payments": [
    {
      "id": "pay-uuid",
      "receipt_number": "REC-2026-0001",
      "amount": 5000,
      "payment_date": "2026-02-05"
    }
  ]
}
```

### 📝 POST - إنشاء فاتورة مبيعات

```typescript
const createSalesInvoice = async (invoiceData: CreateInvoiceInput) => {
  // 1. حساب الإجماليات
  const subtotal = invoiceData.items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
    return sum + lineTotal;
  }, 0);
  
  const taxAmount = subtotal * 0.15;  // 15% ضريبة
  const totalAmount = subtotal + taxAmount - invoiceData.discount_amount;

  // 2. إنشاء الفاتورة
  const { data: invoice, error } = await supabase
    .from('sales_invoices')
    .insert({
      company_id: invoiceData.company_id,
      customer_id: invoiceData.customer_id,
      warehouse_id: invoiceData.warehouse_id,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date,
      subtotal,
      discount_amount: invoiceData.discount_amount || 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;

  // 3. إنشاء البنود
  const items = invoiceData.items.map((item, index) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent || 0,
    tax_rate: 15,
    line_total: item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
  }));

  const { error: itemsError } = await supabase
    .from('sales_invoice_items')
    .insert(items);

  if (itemsError) throw itemsError;

  return invoice;
};
```

### ✏️ PUT - ترحيل الفاتورة

```typescript
const postInvoice = async (invoiceId: string, userId: string) => {
  // 1. التحقق من الحالة
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('status, items:sales_invoice_items(*)')
    .eq('id', invoiceId)
    .single();

  if (invoice.status !== 'draft') {
    throw new Error('الفاتورة مُرحّلة بالفعل');
  }

  // 2. التحقق من توفر المخزون
  for (const item of invoice.items) {
    await checkAvailability(item.product_id, invoice.warehouse_id, item.quantity);
  }

  // 3. ترحيل الفاتورة
  const { data, error } = await supabase
    .from('sales_invoices')
    .update({
      status: 'posted',
      posted_at: new Date().toISOString(),
      posted_by: userId
    })
    .eq('id', invoiceId)
    .select()
    .single();

  // 4. إنشاء حركات المخزون (يتم عبر trigger)
  // 5. إنشاء القيد المحاسبي (يتم عبر trigger)

  return data;
};
```

### 📝 POST - تسجيل دفعة

```typescript
const recordPayment = async (invoiceId: string, paymentData: PaymentInput) => {
  // 1. الحصول على بيانات الفاتورة
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('total_amount, paid_amount')
    .eq('id', invoiceId)
    .single();

  const remaining = invoice.total_amount - invoice.paid_amount;
  
  if (paymentData.amount > remaining) {
    throw new Error(`المبلغ المتبقي ${remaining} فقط`);
  }

  // 2. إنشاء سند القبض
  const { data: receipt } = await supabase
    .from('payment_receipts')
    .insert({
      company_id: paymentData.company_id,
      invoice_id: invoiceId,
      amount: paymentData.amount,
      payment_date: paymentData.payment_date,
      payment_method: paymentData.payment_method,
      notes: paymentData.notes
    })
    .select()
    .single();

  // 3. تحديث الفاتورة
  const newPaidAmount = invoice.paid_amount + paymentData.amount;
  const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

  await supabase
    .from('sales_invoices')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus
    })
    .eq('id', invoiceId);

  return receipt;
};
```

---

## 2️⃣ عروض الأسعار (Quotations)

### الجدول: `quotations`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| quotation_number | varchar | رقم العرض |
| quotation_date | date | تاريخ العرض |
| valid_until | date | صالح حتى |
| customer_id | uuid | معرف العميل |
| total_amount | decimal | الإجمالي |
| status | varchar | الحالة |

### 📖 GET - جلب العروض

```typescript
const { data, error } = await supabase
  .from('quotations')
  .select(`
    *,
    customer:customers(id, name_ar),
    items:quotation_items(
      *,
      product:products(id, sku, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .order('quotation_date', { ascending: false });
```

### 📝 POST - تحويل عرض لفاتورة

```typescript
const convertQuotationToInvoice = async (quotationId: string) => {
  // 1. جلب العرض
  const { data: quotation } = await supabase
    .from('quotations')
    .select('*, items:quotation_items(*)')
    .eq('id', quotationId)
    .single();

  // 2. إنشاء الفاتورة
  const invoiceData = {
    company_id: quotation.company_id,
    customer_id: quotation.customer_id,
    items: quotation.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  };

  const invoice = await createSalesInvoice(invoiceData);

  // 3. تحديث العرض
  await supabase
    .from('quotations')
    .update({ 
      status: 'converted',
      converted_to_invoice_id: invoice.id
    })
    .eq('id', quotationId);

  return invoice;
};
```

---

## 3️⃣ قوائم الأسعار (Price Lists)

### الجدول: `price_lists`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| currency | varchar | العملة |
| is_default | boolean | افتراضية |
| is_active | boolean | نشطة |

### الجدول: `price_list_items`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| price_list_id | uuid | معرف القائمة |
| product_id | uuid | معرف المنتج |
| price | decimal | السعر |
| min_quantity | decimal | الحد الأدنى للكمية |

### 📖 GET - جلب أسعار منتج

```typescript
const { data, error } = await supabase
  .from('price_list_items')
  .select(`
    *,
    price_list:price_lists(id, name_ar, currency)
  `)
  .eq('product_id', productId)
  .eq('price_list.is_active', true);
```

### الحصول على سعر البيع

```typescript
const getProductPrice = async (
  productId: string, 
  customerId: string, 
  quantity: number
) => {
  // 1. التحقق من قائمة أسعار خاصة بالعميل
  const { data: customerPriceList } = await supabase
    .from('customer_price_lists')
    .select('price_list_id')
    .eq('customer_id', customerId)
    .single();

  const priceListId = customerPriceList?.price_list_id;

  // 2. جلب السعر
  let query = supabase
    .from('price_list_items')
    .select('price')
    .eq('product_id', productId)
    .lte('min_quantity', quantity)
    .order('min_quantity', { ascending: false })
    .limit(1);

  if (priceListId) {
    query = query.eq('price_list_id', priceListId);
  }

  const { data } = await query.single();

  // 3. إذا لم يوجد، استخدم سعر البيع الافتراضي
  if (!data) {
    const { data: product } = await supabase
      .from('products')
      .select('sale_price')
      .eq('id', productId)
      .single();
    return product.sale_price;
  }

  return data.price;
};
```

---

## 4️⃣ إذونات التسليم (Delivery Notes)

### الجدول: `delivery_notes`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| delivery_number | varchar | رقم الإذن |
| delivery_date | date | تاريخ التسليم |
| invoice_id | uuid | معرف الفاتورة |
| customer_id | uuid | معرف العميل |
| warehouse_id | uuid | معرف المستودع |
| driver_name | varchar | اسم السائق |
| vehicle_number | varchar | رقم المركبة |
| status | varchar | الحالة |

### 📖 GET - جلب إذونات التسليم

```typescript
const { data, error } = await supabase
  .from('delivery_notes')
  .select(`
    *,
    customer:customers(id, name_ar, address),
    invoice:sales_invoices(invoice_number),
    items:delivery_note_items(
      *,
      product:products(id, sku, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .order('delivery_date', { ascending: false });
```

---

## 5️⃣ تقارير المبيعات

### إجمالي المبيعات

```typescript
const { data } = await supabase
  .from('sales_invoices')
  .select('total_amount')
  .eq('company_id', companyId)
  .eq('status', 'posted')
  .gte('invoice_date', startDate)
  .lte('invoice_date', endDate);

const totalSales = data.reduce((sum, inv) => sum + inv.total_amount, 0);
```

### أفضل المنتجات مبيعاً

```typescript
const { data } = await supabase
  .rpc('get_top_selling_products', {
    p_company_id: companyId,
    p_from_date: startDate,
    p_to_date: endDate,
    p_limit: 10
  });
```

### مبيعات حسب العميل

```typescript
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    customer_id,
    customer:customers(name_ar),
    total_amount.sum()
  `)
  .eq('company_id', companyId)
  .eq('status', 'posted')
  .gte('invoice_date', startDate)
  .lte('invoice_date', endDate);
```

---

## ⚠️ قواعد الأعمال

### 1. التحقق من حد ائتمان العميل

```typescript
const checkCustomerCredit = async (customerId: string, amount: number) => {
  const { data } = await supabase
    .from('customers')
    .select(`
      credit_limit,
      account:chart_of_accounts!account_id(current_balance)
    `)
    .eq('id', customerId)
    .single();

  const currentBalance = data.account?.current_balance || 0;
  const availableCredit = data.credit_limit - currentBalance;

  if (amount > availableCredit) {
    throw new Error(`حد الائتمان المتاح: ${availableCredit}`);
  }
};
```

### 2. إنشاء القيد المحاسبي

```sql
-- يتم تلقائياً عبر trigger عند ترحيل الفاتورة:
-- مدين: ذمم العميل (total_amount)
-- دائن: إيرادات المبيعات (subtotal)
-- دائن: ضريبة القيمة المضافة (tax_amount)
```

---

**التالي:** [purchases.md](./purchases.md) - المشتريات

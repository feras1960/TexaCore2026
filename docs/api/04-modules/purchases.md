# 🛍️ المشتريات API
# Purchases Module API

---

## 📋 نظرة عامة

وحدة المشتريات تشمل:
- فواتير المشتريات (Purchase Invoices)
- أوامر الشراء (Purchase Orders)
- الكونتينرات/الشحنات (Containers)
- مصاريف الكونتينر (Container Expenses)

---

## 1️⃣ فواتير المشتريات (Purchase Invoices)

### الجدول: `purchase_invoices`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| invoice_number | varchar | رقم الفاتورة |
| supplier_invoice_number | varchar | رقم فاتورة المورد |
| invoice_date | date | تاريخ الفاتورة |
| due_date | date | تاريخ الاستحقاق |
| supplier_id | uuid | معرف المورد |
| warehouse_id | uuid | معرف المستودع |
| container_id | uuid | معرف الكونتينر |
| subtotal | decimal | المجموع قبل الضريبة |
| discount_amount | decimal | مبلغ الخصم |
| tax_amount | decimal | مبلغ الضريبة |
| total_amount | decimal | الإجمالي |
| currency | varchar | العملة |
| exchange_rate | decimal | سعر الصرف |
| paid_amount | decimal | المبلغ المدفوع |
| status | varchar | الحالة |

### الجدول: `purchase_invoice_items`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| invoice_id | uuid | معرف الفاتورة |
| product_id | uuid | معرف المنتج |
| description | text | الوصف |
| quantity | decimal | الكمية |
| unit_cost | decimal | تكلفة الوحدة |
| discount_percent | decimal | نسبة الخصم |
| tax_rate | decimal | نسبة الضريبة |
| line_total | decimal | إجمالي السطر |

### 📖 GET - جلب فواتير المشتريات

```typescript
const { data, error } = await supabase
  .from('purchase_invoices')
  .select(`
    *,
    supplier:suppliers(id, name_ar, name_en),
    warehouse:warehouses(id, name_ar),
    container:containers(id, container_number),
    items:purchase_invoice_items(
      *,
      product:products(id, sku, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .order('invoice_date', { ascending: false });
```

### فلترة الفواتير

```typescript
// بالمورد
const { data } = await supabase
  .from('purchase_invoices')
  .select('*')
  .eq('supplier_id', supplierId);

// غير المدفوعة
const { data } = await supabase
  .from('purchase_invoices')
  .select('*')
  .in('status', ['posted', 'partial']);

// بالكونتينر
const { data } = await supabase
  .from('purchase_invoices')
  .select('*')
  .eq('container_id', containerId);
```

### 📖 GET - فاتورة مشتريات بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('purchase_invoices')
  .select(`
    *,
    supplier:suppliers(
      id, name_ar, name_en, phone, email, tax_number
    ),
    warehouse:warehouses(id, name_ar),
    container:containers(
      id, container_number, status
    ),
    items:purchase_invoice_items(
      *,
      product:products(id, sku, name_ar)
    ),
    payments:payment_vouchers(
      id, voucher_number, amount, payment_date
    )
  `)
  .eq('id', invoiceId)
  .single();
```

### 📝 POST - إنشاء فاتورة مشتريات

```typescript
const createPurchaseInvoice = async (invoiceData: CreatePurchaseInvoiceInput) => {
  // 1. حساب الإجماليات
  const subtotal = invoiceData.items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_cost;
    return sum + lineTotal;
  }, 0);

  const taxAmount = subtotal * 0.15;
  const totalAmount = subtotal + taxAmount;

  // 2. التحويل للعملة المحلية
  const totalInLocal = totalAmount * invoiceData.exchange_rate;

  // 3. إنشاء الفاتورة
  const { data: invoice, error } = await supabase
    .from('purchase_invoices')
    .insert({
      company_id: invoiceData.company_id,
      supplier_id: invoiceData.supplier_id,
      supplier_invoice_number: invoiceData.supplier_invoice_number,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date,
      warehouse_id: invoiceData.warehouse_id,
      container_id: invoiceData.container_id,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: invoiceData.currency || 'USD',
      exchange_rate: invoiceData.exchange_rate || 1,
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;

  // 4. إنشاء البنود
  const items = invoiceData.items.map(item => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    line_total: item.quantity * item.unit_cost
  }));

  await supabase.from('purchase_invoice_items').insert(items);

  return invoice;
};
```

### ✏️ PUT - ترحيل فاتورة المشتريات

```typescript
const postPurchaseInvoice = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('purchase_invoices')
    .update({
      status: 'posted',
      posted_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('status', 'draft')
    .select()
    .single();

  // عند الترحيل يتم:
  // 1. إنشاء حركات استلام المخزون
  // 2. إنشاء القيد المحاسبي

  return data;
};
```

---

## 2️⃣ أوامر الشراء (Purchase Orders)

### الجدول: `purchase_orders`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| order_number | varchar | رقم الطلب |
| order_date | date | تاريخ الطلب |
| supplier_id | uuid | معرف المورد |
| expected_date | date | تاريخ الاستلام المتوقع |
| total_amount | decimal | الإجمالي |
| currency | varchar | العملة |
| status | varchar | الحالة |

### 📖 GET - جلب أوامر الشراء

```typescript
const { data, error } = await supabase
  .from('purchase_orders')
  .select(`
    *,
    supplier:suppliers(id, name_ar),
    items:purchase_order_items(
      *,
      product:products(id, sku, name_ar)
    )
  `)
  .eq('company_id', companyId)
  .order('order_date', { ascending: false });
```

### 📝 POST - تحويل أمر شراء لفاتورة

```typescript
const convertPOToInvoice = async (orderId: string) => {
  const { data: order } = await supabase
    .from('purchase_orders')
    .select('*, items:purchase_order_items(*)')
    .eq('id', orderId)
    .single();

  const invoice = await createPurchaseInvoice({
    company_id: order.company_id,
    supplier_id: order.supplier_id,
    items: order.items
  });

  await supabase
    .from('purchase_orders')
    .update({ 
      status: 'converted',
      converted_to_invoice_id: invoice.id
    })
    .eq('id', orderId);

  return invoice;
};
```

---

## 3️⃣ الكونتينرات (Containers)

### الجدول: `containers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| container_number | varchar | رقم الكونتينر |
| booking_date | date | تاريخ الحجز |
| etd | date | تاريخ المغادرة المتوقع |
| eta | date | تاريخ الوصول المتوقع |
| actual_arrival | date | تاريخ الوصول الفعلي |
| supplier_id | uuid | معرف المورد |
| port_of_loading | varchar | ميناء التحميل |
| port_of_discharge | varchar | ميناء التفريغ |
| container_size | varchar | حجم الكونتينر |
| fob_value | decimal | قيمة FOB |
| currency | varchar | العملة |
| status | varchar | الحالة |

### حالات الكونتينر

| الحالة | الوصف |
|--------|-------|
| `draft` | مسودة |
| `booked` | محجوز |
| `in_transit` | في الطريق |
| `at_port` | في الميناء |
| `customs` | التخليص الجمركي |
| `received` | مستلم |
| `closed` | مغلق |

### 📖 GET - جلب الكونتينرات

```typescript
const { data, error } = await supabase
  .from('containers')
  .select(`
    *,
    supplier:suppliers(id, name_ar),
    items:container_items(
      *,
      product:products(id, sku, name_ar)
    ),
    expenses:container_expenses(
      id, expense_type, amount, currency
    ),
    invoices:purchase_invoices(
      id, invoice_number, total_amount
    )
  `)
  .eq('company_id', companyId)
  .order('booking_date', { ascending: false });
```

### فلترة الكونتينرات

```typescript
// بالحالة
const { data } = await supabase
  .from('containers')
  .select('*')
  .eq('status', 'in_transit');

// المتوقع وصولها هذا الشهر
const { data } = await supabase
  .from('containers')
  .select('*')
  .gte('eta', '2026-02-01')
  .lte('eta', '2026-02-28');

// بالمورد
const { data } = await supabase
  .from('containers')
  .select('*')
  .eq('supplier_id', supplierId);
```

### 📖 GET - كونتينر بالتفاصيل الكاملة

```typescript
const { data, error } = await supabase
  .from('containers')
  .select(`
    *,
    supplier:suppliers(*),
    items:container_items(
      *,
      product:products(id, sku, name_ar),
      allocated_expenses
    ),
    expenses:container_expenses(*),
    invoices:purchase_invoices(
      id, invoice_number, invoice_date, total_amount, status
    ),
    rolls:fabric_rolls(
      id, roll_number, length, weight,
      material:fabric_materials(name_ar),
      color:fabric_colors(name_ar)
    )
  `)
  .eq('id', containerId)
  .single();
```

#### Response

```json
{
  "id": "cont-uuid",
  "container_number": "MSKU1234567",
  "booking_date": "2026-01-15",
  "etd": "2026-01-20",
  "eta": "2026-02-10",
  "port_of_loading": "Guangzhou",
  "port_of_discharge": "Jeddah",
  "container_size": "40HC",
  "fob_value": 50000,
  "currency": "USD",
  "status": "in_transit",
  "supplier": {
    "id": "sup-uuid",
    "name_ar": "مصنع الأقمشة المتحدة"
  },
  "items": [
    {
      "id": "item-uuid",
      "product_id": "prod-uuid",
      "quantity": 1000,
      "unit_cost": 25,
      "allocated_expenses": 2500,
      "product": {
        "sku": "FAB-001",
        "name_ar": "قماش قطني أبيض"
      }
    }
  ],
  "expenses": [
    {
      "id": "exp-uuid",
      "expense_type": "shipping",
      "amount": 3000,
      "currency": "USD"
    },
    {
      "id": "exp-uuid-2",
      "expense_type": "customs",
      "amount": 5000,
      "currency": "SAR"
    }
  ]
}
```

### 📝 POST - إنشاء كونتينر

```typescript
const { data, error } = await supabase
  .from('containers')
  .insert({
    company_id: companyId,
    container_number: 'MSKU7654321',
    booking_date: '2026-02-05',
    etd: '2026-02-10',
    eta: '2026-03-01',
    supplier_id: supplierId,
    port_of_loading: 'Shanghai',
    port_of_discharge: 'Jeddah',
    container_size: '40HC',
    fob_value: 75000,
    currency: 'USD',
    status: 'booked'
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث حالة الكونتينر

```typescript
const updateContainerStatus = async (containerId: string, newStatus: string) => {
  const updates: any = { status: newStatus };
  
  if (newStatus === 'received') {
    updates.actual_arrival = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('containers')
    .update(updates)
    .eq('id', containerId)
    .select()
    .single();

  return data;
};
```

---

## 4️⃣ مصاريف الكونتينر (Container Expenses)

### الجدول: `container_expenses`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| container_id | uuid | معرف الكونتينر |
| expense_type | varchar | نوع المصروف |
| description | text | الوصف |
| amount | decimal | المبلغ |
| currency | varchar | العملة |
| exchange_rate | decimal | سعر الصرف |
| vendor_name | varchar | اسم المورد |
| invoice_number | varchar | رقم الفاتورة |
| expense_date | date | تاريخ المصروف |
| is_allocated | boolean | تم توزيعه |

### أنواع المصاريف

| النوع | الوصف |
|-------|-------|
| `shipping` | الشحن |
| `customs` | الجمارك |
| `insurance` | التأمين |
| `handling` | المناولة |
| `storage` | التخزين |
| `inspection` | الفحص |
| `documentation` | المستندات |
| `other` | أخرى |

### 📖 GET - مصاريف كونتينر

```typescript
const { data, error } = await supabase
  .from('container_expenses')
  .select('*')
  .eq('container_id', containerId)
  .order('expense_date');
```

### 📝 POST - إضافة مصروف

```typescript
const { data, error } = await supabase
  .from('container_expenses')
  .insert({
    container_id: containerId,
    expense_type: 'customs',
    description: 'رسوم جمركية',
    amount: 5000,
    currency: 'SAR',
    exchange_rate: 1,
    vendor_name: 'الجمارك السعودية',
    expense_date: '2026-02-10'
  })
  .select()
  .single();
```

### توزيع المصاريف على البنود

```typescript
const allocateContainerExpenses = async (containerId: string) => {
  // 1. جلب إجمالي المصاريف
  const { data: expenses } = await supabase
    .from('container_expenses')
    .select('amount, exchange_rate')
    .eq('container_id', containerId);

  const totalExpenses = expenses.reduce((sum, exp) => 
    sum + (exp.amount * exp.exchange_rate), 0
  );

  // 2. جلب البنود وقيمها
  const { data: items } = await supabase
    .from('container_items')
    .select('id, quantity, unit_cost')
    .eq('container_id', containerId);

  const totalValue = items.reduce((sum, item) => 
    sum + (item.quantity * item.unit_cost), 0
  );

  // 3. توزيع المصاريف بالتناسب
  for (const item of items) {
    const itemValue = item.quantity * item.unit_cost;
    const ratio = itemValue / totalValue;
    const allocatedExpenses = totalExpenses * ratio;

    await supabase
      .from('container_items')
      .update({ allocated_expenses: allocatedExpenses })
      .eq('id', item.id);
  }

  // 4. تحديث حالة المصاريف
  await supabase
    .from('container_expenses')
    .update({ is_allocated: true })
    .eq('container_id', containerId);
};
```

---

## 5️⃣ حساب تكلفة الهبوط (Landed Cost)

```typescript
const calculateLandedCost = async (containerId: string) => {
  const { data: container } = await supabase
    .from('containers')
    .select(`
      fob_value,
      items:container_items(
        id, product_id, quantity, unit_cost, allocated_expenses
      ),
      expenses:container_expenses(amount, exchange_rate)
    `)
    .eq('id', containerId)
    .single();

  const results = container.items.map(item => {
    const fobCost = item.quantity * item.unit_cost;
    const landedCost = fobCost + item.allocated_expenses;
    const unitLandedCost = landedCost / item.quantity;

    return {
      product_id: item.product_id,
      quantity: item.quantity,
      fob_unit_cost: item.unit_cost,
      allocated_expenses: item.allocated_expenses,
      landed_unit_cost: unitLandedCost
    };
  });

  return results;
};
```

---

## ⚠️ قواعد الأعمال

### 1. لا يمكن حذف كونتينر له فواتير

```typescript
const canDeleteContainer = async (containerId: string) => {
  const { count } = await supabase
    .from('purchase_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('container_id', containerId);

  return count === 0;
};
```

### 2. تحديث تكلفة المنتجات بعد الاستلام

```typescript
const updateProductCosts = async (containerId: string) => {
  const landedCosts = await calculateLandedCost(containerId);

  for (const item of landedCosts) {
    // تحديث تكلفة المنتج (Moving Average)
    const { data: product } = await supabase
      .from('products')
      .select('cost_price, stock_quantity')
      .eq('id', item.product_id)
      .single();

    const currentValue = product.cost_price * product.stock_quantity;
    const newValue = item.landed_unit_cost * item.quantity;
    const newQuantity = product.stock_quantity + item.quantity;
    const newAvgCost = (currentValue + newValue) / newQuantity;

    await supabase
      .from('products')
      .update({ cost_price: newAvgCost })
      .eq('id', item.product_id);
  }
};
```

---

**التالي:** [treasury.md](./treasury.md) - الخزينة

# 📚 أمثلة عملية
# Practical Examples

---

## 📋 نظرة عامة

هذا الملف يحتوي على أمثلة عملية كاملة لسيناريوهات الاستخدام الشائعة.

---

## 1️⃣ إنشاء فاتورة مبيعات كاملة

### السيناريو
إنشاء فاتورة مبيعات جديدة مع بنودها وترحيلها.

```typescript
import { supabase } from '@/lib/supabase';

interface InvoiceItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
}

interface CreateInvoiceInput {
  customer_id: string;
  warehouse_id: string;
  invoice_date: string;
  due_date: string;
  items: InvoiceItem[];
  notes?: string;
}

export const createAndPostSalesInvoice = async (
  companyId: string,
  input: CreateInvoiceInput
) => {
  // 1. التحقق من حد ائتمان العميل
  const { data: customer } = await supabase
    .from('customers')
    .select(`
      credit_limit,
      account:chart_of_accounts!account_id(current_balance)
    `)
    .eq('id', input.customer_id)
    .single();

  // 2. حساب إجمالي الفاتورة
  let subtotal = 0;
  for (const item of input.items) {
    const lineDiscount = item.discount_percent || 0;
    const lineTotal = item.quantity * item.unit_price * (1 - lineDiscount / 100);
    subtotal += lineTotal;
  }
  
  const taxRate = 0.15;  // 15% VAT
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // 3. التحقق من حد الائتمان
  const currentBalance = customer.account?.current_balance || 0;
  const availableCredit = customer.credit_limit - currentBalance;
  
  if (totalAmount > availableCredit) {
    throw new Error(`حد الائتمان المتاح: ${availableCredit.toFixed(2)} ريال`);
  }

  // 4. التحقق من توفر المخزون
  for (const item of input.items) {
    const { data: available } = await supabase.rpc('get_available_quantity', {
      p_product_id: item.product_id,
      p_warehouse_id: input.warehouse_id
    });

    if (available < item.quantity) {
      const { data: product } = await supabase
        .from('products')
        .select('name_ar')
        .eq('id', item.product_id)
        .single();
      
      throw new Error(`الكمية المتاحة من "${product.name_ar}" هي ${available} فقط`);
    }
  }

  // 5. الحصول على رقم الفاتورة التالي
  const { data: nextNumber } = await supabase.rpc('get_next_entry_number', {
    p_company_id: companyId,
    p_prefix: 'INV'
  });

  // 6. إنشاء الفاتورة
  const { data: invoice, error: invoiceError } = await supabase
    .from('sales_invoices')
    .insert({
      company_id: companyId,
      invoice_number: nextNumber,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      customer_id: input.customer_id,
      warehouse_id: input.warehouse_id,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft',
      notes: input.notes
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // 7. إنشاء بنود الفاتورة
  const invoiceItems = input.items.map((item, index) => {
    const lineDiscount = item.discount_percent || 0;
    const lineSubtotal = item.quantity * item.unit_price * (1 - lineDiscount / 100);
    const lineTax = lineSubtotal * taxRate;
    
    return {
      invoice_id: invoice.id,
      line_number: index + 1,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: lineDiscount,
      tax_rate: taxRate * 100,
      tax_amount: lineTax,
      line_total: lineSubtotal + lineTax
    };
  });

  const { error: itemsError } = await supabase
    .from('sales_invoice_items')
    .insert(invoiceItems);

  if (itemsError) {
    // التراجع: حذف الفاتورة
    await supabase.from('sales_invoices').delete().eq('id', invoice.id);
    throw itemsError;
  }

  // 8. ترحيل الفاتورة
  const { data: postedInvoice, error: postError } = await supabase
    .from('sales_invoices')
    .update({
      status: 'posted',
      posted_at: new Date().toISOString()
    })
    .eq('id', invoice.id)
    .select()
    .single();

  if (postError) throw postError;

  // 9. إنشاء حركات المخزون (يتم تلقائياً عبر trigger)
  // 10. إنشاء القيد المحاسبي (يتم تلقائياً عبر trigger)

  return postedInvoice;
};

// الاستخدام
const invoice = await createAndPostSalesInvoice('company-uuid', {
  customer_id: 'customer-uuid',
  warehouse_id: 'warehouse-uuid',
  invoice_date: '2026-02-05',
  due_date: '2026-03-07',
  items: [
    { product_id: 'prod-1', quantity: 10, unit_price: 100 },
    { product_id: 'prod-2', quantity: 5, unit_price: 200, discount_percent: 5 }
  ],
  notes: 'فاتورة اختبار'
});
```

---

## 2️⃣ تسجيل دفعة من عميل

### السيناريو
تسجيل دفعة من عميل وربطها بفاتورة.

```typescript
interface PaymentInput {
  customer_id: string;
  fund_id: string;
  invoice_id?: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'mada';
  check_number?: string;
  check_date?: string;
  bank_name?: string;
  notes?: string;
}

export const recordCustomerPayment = async (
  companyId: string,
  input: PaymentInput
) => {
  // 1. إذا مرتبطة بفاتورة، التحقق من المبلغ المتبقي
  if (input.invoice_id) {
    const { data: invoice } = await supabase
      .from('sales_invoices')
      .select('total_amount, paid_amount, status')
      .eq('id', input.invoice_id)
      .single();

    if (invoice.status === 'paid') {
      throw new Error('الفاتورة مسددة بالكامل');
    }

    const remaining = invoice.total_amount - invoice.paid_amount;
    if (input.amount > remaining) {
      throw new Error(`المبلغ المتبقي ${remaining.toFixed(2)} ريال فقط`);
    }
  }

  // 2. الحصول على رقم السند التالي
  const { data: receiptNumber } = await supabase.rpc('get_next_entry_number', {
    p_company_id: companyId,
    p_prefix: 'REC'
  });

  // 3. إنشاء سند القبض
  const { data: receipt, error: receiptError } = await supabase
    .from('payment_receipts')
    .insert({
      company_id: companyId,
      receipt_number: receiptNumber,
      receipt_date: input.payment_date,
      customer_id: input.customer_id,
      fund_id: input.fund_id,
      invoice_id: input.invoice_id,
      amount: input.amount,
      payment_method: input.payment_method,
      check_number: input.check_number,
      check_date: input.check_date,
      bank_name: input.bank_name,
      notes: input.notes,
      status: 'posted'
    })
    .select()
    .single();

  if (receiptError) throw receiptError;

  // 4. تحديث رصيد الصندوق
  await supabase.rpc('update_fund_balance', {
    p_fund_id: input.fund_id,
    p_amount: input.amount
  });

  // 5. إنشاء حركة الصندوق
  await supabase.from('fund_transactions').insert({
    company_id: companyId,
    fund_id: input.fund_id,
    transaction_type: 'receipt',
    transaction_date: input.payment_date,
    amount: input.amount,
    reference_type: 'payment_receipt',
    reference_id: receipt.id,
    description: `قبض من العميل - ${receiptNumber}`
  });

  // 6. تحديث الفاتورة إذا وجدت
  if (input.invoice_id) {
    const { data: invoice } = await supabase
      .from('sales_invoices')
      .select('total_amount, paid_amount')
      .eq('id', input.invoice_id)
      .single();

    const newPaidAmount = invoice.paid_amount + input.amount;
    const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

    await supabase
      .from('sales_invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus
      })
      .eq('id', input.invoice_id);
  }

  // 7. إنشاء القيد المحاسبي (يتم تلقائياً عبر trigger أو يدوياً)
  /*
    مدين: النقدية/البنك (حسب الصندوق)
    دائن: ذمم العميل
  */

  return receipt;
};
```

---

## 3️⃣ تحويل مخزون بين مستودعين

```typescript
interface TransferInput {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  transfer_date: string;
  notes?: string;
}

export const transferInventory = async (
  companyId: string,
  input: TransferInput
) => {
  // 1. التحقق من الصلاحيات
  const { data: canTransferFrom } = await supabase.rpc('can_access_warehouse', {
    p_warehouse_id: input.from_warehouse_id,
    p_action: 'transfer'
  });

  if (!canTransferFrom) {
    throw new Error('لا تملك صلاحية التحويل من هذا المستودع');
  }

  const { data: canReceiveTo } = await supabase.rpc('can_access_warehouse', {
    p_warehouse_id: input.to_warehouse_id,
    p_action: 'receive'
  });

  if (!canReceiveTo) {
    throw new Error('لا تملك صلاحية الاستلام في هذا المستودع');
  }

  // 2. التحقق من توفر الكميات
  for (const item of input.items) {
    const { data: available } = await supabase.rpc('get_available_quantity', {
      p_product_id: item.product_id,
      p_warehouse_id: input.from_warehouse_id
    });

    if (available < item.quantity) {
      const { data: product } = await supabase
        .from('products')
        .select('name_ar')
        .eq('id', item.product_id)
        .single();
      
      throw new Error(`الكمية المتاحة من "${product.name_ar}" هي ${available} فقط`);
    }
  }

  // 3. الحصول على رقم التحويل
  const { data: transferNumber } = await supabase.rpc('get_next_entry_number', {
    p_company_id: companyId,
    p_prefix: 'TRF'
  });

  // 4. إنشاء سجل التحويل
  const { data: transfer, error: transferError } = await supabase
    .from('inventory_transfers')
    .insert({
      company_id: companyId,
      transfer_number: transferNumber,
      transfer_date: input.transfer_date,
      from_warehouse_id: input.from_warehouse_id,
      to_warehouse_id: input.to_warehouse_id,
      status: 'pending',
      notes: input.notes
    })
    .select()
    .single();

  if (transferError) throw transferError;

  // 5. إنشاء بنود التحويل
  const transferItems = input.items.map((item, index) => ({
    transfer_id: transfer.id,
    line_number: index + 1,
    product_id: item.product_id,
    quantity: item.quantity
  }));

  await supabase.from('inventory_transfer_items').insert(transferItems);

  // 6. إنشاء حركات المخزون
  for (const item of input.items) {
    // حركة صادرة من المستودع المصدر
    await supabase.from('inventory_movements').insert({
      company_id: companyId,
      movement_type: 'transfer',
      product_id: item.product_id,
      warehouse_id: input.from_warehouse_id,
      from_warehouse_id: input.from_warehouse_id,
      to_warehouse_id: input.to_warehouse_id,
      quantity: -item.quantity,
      movement_date: input.transfer_date,
      reference_type: 'inventory_transfer',
      reference_id: transfer.id
    });

    // حركة واردة للمستودع الهدف
    await supabase.from('inventory_movements').insert({
      company_id: companyId,
      movement_type: 'transfer',
      product_id: item.product_id,
      warehouse_id: input.to_warehouse_id,
      from_warehouse_id: input.from_warehouse_id,
      to_warehouse_id: input.to_warehouse_id,
      quantity: item.quantity,
      movement_date: input.transfer_date,
      reference_type: 'inventory_transfer',
      reference_id: transfer.id
    });
  }

  // 7. تحديث حالة التحويل
  await supabase
    .from('inventory_transfers')
    .update({ status: 'completed' })
    .eq('id', transfer.id);

  return transfer;
};
```

---

## 4️⃣ إنشاء قيد يومي يدوي

```typescript
interface JournalEntryLine {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center_id?: string;
}

interface CreateJournalEntryInput {
  entry_date: string;
  description: string;
  lines: JournalEntryLine[];
}

export const createJournalEntry = async (
  companyId: string,
  input: CreateJournalEntryInput
) => {
  // 1. التحقق من توازن القيد
  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`القيد غير متوازن. المدين: ${totalDebit}, الدائن: ${totalCredit}`);
  }

  // 2. التحقق من الفترة المحاسبية
  const { data: period } = await supabase
    .from('accounting_periods')
    .select('id, is_closed')
    .eq('company_id', companyId)
    .lte('start_date', input.entry_date)
    .gte('end_date', input.entry_date)
    .single();

  if (!period) {
    throw new Error('لا توجد فترة محاسبية لهذا التاريخ');
  }

  if (period.is_closed) {
    throw new Error('الفترة المحاسبية مقفلة');
  }

  // 3. الحصول على رقم القيد
  const { data: entryNumber } = await supabase.rpc('get_next_entry_number', {
    p_company_id: companyId,
    p_prefix: 'JE'
  });

  // 4. إنشاء القيد
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      company_id: companyId,
      entry_number: entryNumber,
      entry_date: input.entry_date,
      description: input.description,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'draft'
    })
    .select()
    .single();

  if (entryError) throw entryError;

  // 5. إنشاء بنود القيد
  const entryLines = input.lines.map((line, index) => ({
    entry_id: entry.id,
    line_number: index + 1,
    account_id: line.account_id,
    debit: line.debit,
    credit: line.credit,
    description: line.description,
    cost_center_id: line.cost_center_id
  }));

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(entryLines);

  if (linesError) {
    await supabase.from('journal_entries').delete().eq('id', entry.id);
    throw linesError;
  }

  return entry;
};

// الاستخدام - قيد صرف رواتب
const journalEntry = await createJournalEntry('company-uuid', {
  entry_date: '2026-02-05',
  description: 'صرف رواتب شهر يناير 2026',
  lines: [
    { account_id: 'salary-expense-uuid', debit: 50000, credit: 0, description: 'مصروف الرواتب' },
    { account_id: 'social-insurance-uuid', debit: 5000, credit: 0, description: 'تأمينات اجتماعية' },
    { account_id: 'bank-account-uuid', debit: 0, credit: 45000, description: 'صافي الرواتب' },
    { account_id: 'gosi-payable-uuid', debit: 0, credit: 10000, description: 'مستحقات التأمينات' }
  ]
});
```

---

## 5️⃣ لوحة تحكم - جلب الإحصائيات

```typescript
export const getDashboardData = async (companyId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 8) + '01';
  const yearStart = today.substring(0, 5) + '01-01';

  // استعلامات متوازية
  const [
    salesResult,
    purchasesResult,
    receivablesResult,
    payablesResult,
    cashResult,
    lowStockResult,
    overdueResult
  ] = await Promise.all([
    // مبيعات الشهر
    supabase
      .from('sales_invoices')
      .select('total_amount')
      .eq('company_id', companyId)
      .eq('status', 'posted')
      .gte('invoice_date', monthStart),

    // مشتريات الشهر
    supabase
      .from('purchase_invoices')
      .select('total_amount')
      .eq('company_id', companyId)
      .eq('status', 'posted')
      .gte('invoice_date', monthStart),

    // الذمم المدينة
    supabase
      .from('sales_invoices')
      .select('total_amount, paid_amount')
      .eq('company_id', companyId)
      .in('status', ['posted', 'partial']),

    // الذمم الدائنة
    supabase
      .from('purchase_invoices')
      .select('total_amount, paid_amount')
      .eq('company_id', companyId)
      .in('status', ['posted', 'partial']),

    // أرصدة الصناديق
    supabase
      .from('funds')
      .select('current_balance, fund_type')
      .eq('company_id', companyId)
      .eq('is_active', true),

    // منتجات تحت الحد الأدنى
    supabase.rpc('get_low_stock_products', { p_company_id: companyId }),

    // فواتير متأخرة
    supabase
      .from('sales_invoices')
      .select('id')
      .eq('company_id', companyId)
      .in('status', ['posted', 'partial'])
      .lt('due_date', today)
  ]);

  // حساب الإجماليات
  const monthlySales = salesResult.data?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const monthlyPurchases = purchasesResult.data?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  
  const receivables = receivablesResult.data?.reduce(
    (sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0
  ) || 0;
  
  const payables = payablesResult.data?.reduce(
    (sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0
  ) || 0;

  const cashBalance = cashResult.data
    ?.filter(f => f.fund_type === 'cash')
    .reduce((sum, f) => sum + f.current_balance, 0) || 0;

  const bankBalance = cashResult.data
    ?.filter(f => f.fund_type === 'bank')
    .reduce((sum, f) => sum + f.current_balance, 0) || 0;

  return {
    monthlySales,
    monthlyPurchases,
    grossProfit: monthlySales - monthlyPurchases,
    receivables,
    payables,
    cashBalance,
    bankBalance,
    totalLiquidity: cashBalance + bankBalance,
    lowStockCount: lowStockResult.data?.length || 0,
    overdueInvoicesCount: overdueResult.data?.length || 0
  };
};
```

---

## 6️⃣ Hook للتحميل مع Cache

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseDataOptions<T> {
  table: string;
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  enabled?: boolean;
  cacheKey?: string;
  cacheTime?: number;  // بالثواني
}

const cache = new Map<string, { data: any; timestamp: number }>();

export function useData<T>({
  table,
  select = '*',
  filter = {},
  order,
  enabled = true,
  cacheKey,
  cacheTime = 60
}: UseDataOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (skipCache = false) => {
    // التحقق من الكاش
    if (cacheKey && !skipCache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime * 1000) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      let query = supabase.from(table).select(select);

      // إضافة الفلاتر
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // إضافة الترتيب
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      setData(result as T[]);
      setError(null);

      // حفظ في الكاش
      if (cacheKey) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [table, select, JSON.stringify(filter), order?.column, order?.ascending, cacheKey, cacheTime]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, error, refetch };
}

// الاستخدام
const { data: customers, loading, refetch } = useData<Customer>({
  table: 'customers',
  select: '*, group:customer_groups(name_ar)',
  filter: { company_id: companyId, is_active: true },
  order: { column: 'name_ar' },
  cacheKey: `customers-${companyId}`,
  cacheTime: 120
});
```

---

**التالي:** [08-error-handling.md](./08-error-handling.md) - معالجة الأخطاء

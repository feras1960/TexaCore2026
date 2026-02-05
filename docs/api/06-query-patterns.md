# 🔍 أنماط الاستعلام الشائعة
# Common Query Patterns

---

## 📋 نظرة عامة

هذا الملف يوثق أنماط الاستعلام الشائعة والمفيدة في التعامل مع Supabase.

---

## 1️⃣ الفلترة (Filtering)

### الفلترة الأساسية

```typescript
// يساوي
.eq('column', value)

// لا يساوي
.neq('column', value)

// أكبر من / أكبر أو يساوي
.gt('column', value)
.gte('column', value)

// أصغر من / أصغر أو يساوي
.lt('column', value)
.lte('column', value)
```

### فلترة النصوص

```typescript
// يحتوي على (case sensitive)
.like('name', '%أحمد%')

// يحتوي على (case insensitive)
.ilike('name', '%ahmed%')

// يبدأ بـ
.ilike('name', 'أحمد%')

// ينتهي بـ
.ilike('name', '%أحمد')
```

### فلترة القوائم

```typescript
// ضمن قائمة
.in('status', ['active', 'pending', 'approved'])

// ليس ضمن قائمة
.not('status', 'in', '("cancelled","rejected")')
```

### فلترة NULL

```typescript
// هو null
.is('deleted_at', null)

// ليس null
.not('deleted_at', 'is', null)
```

### فلترة JSONB

```typescript
// قيمة في JSONB
.contains('metadata', { type: 'premium' })

// مفتاح موجود
.not('metadata->key', 'is', null)
```

### فلترة التاريخ

```typescript
// اليوم
const today = new Date().toISOString().split('T')[0];
.eq('created_at::date', today)

// فترة زمنية
.gte('invoice_date', '2026-01-01')
.lte('invoice_date', '2026-12-31')

// آخر 30 يوم
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString();
.gte('created_at', thirtyDaysAgo)
```

### الفلترة المركبة (OR)

```typescript
// طريقة 1: or function
.or('status.eq.active,status.eq.pending')

// طريقة 2: filter function
.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%,code.ilike.%${search}%`)

// طريقة 3: مع AND
.eq('company_id', companyId)
.or('status.eq.active,status.eq.pending')
```

### البحث المتقدم

```typescript
const searchCustomers = async (
  companyId: string,
  search: string,
  filters: {
    groupId?: string;
    isActive?: boolean;
    hasBalance?: boolean;
  }
) => {
  let query = supabase
    .from('customers')
    .select(`
      *,
      group:customer_groups(name_ar),
      account:chart_of_accounts!account_id(current_balance)
    `)
    .eq('company_id', companyId);

  // بحث نصي
  if (search) {
    query = query.or(
      `name_ar.ilike.%${search}%,` +
      `name_en.ilike.%${search}%,` +
      `code.ilike.%${search}%,` +
      `phone.ilike.%${search}%`
    );
  }

  // فلاتر إضافية
  if (filters.groupId) {
    query = query.eq('customer_group_id', filters.groupId);
  }
  
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data } = await query;
  
  // فلترة حسب الرصيد (بعد الجلب)
  if (filters.hasBalance) {
    return data.filter(c => c.account?.current_balance > 0);
  }

  return data;
};
```

---

## 2️⃣ الترتيب (Sorting)

### ترتيب بسيط

```typescript
// ترتيب تصاعدي
.order('created_at', { ascending: true })

// ترتيب تنازلي
.order('created_at', { ascending: false })
```

### ترتيب متعدد

```typescript
// الأولوية للأول
.order('status', { ascending: true })
.order('created_at', { ascending: false })
```

### ترتيب حسب علاقة

```typescript
// غير مدعوم مباشرة، يتم بعد الجلب
const { data } = await query;
const sorted = data.sort((a, b) => 
  a.customer?.name_ar.localeCompare(b.customer?.name_ar, 'ar')
);
```

### ترتيب Null

```typescript
// Null في النهاية
.order('due_date', { ascending: true, nullsFirst: false })

// Null في البداية
.order('due_date', { ascending: true, nullsFirst: true })
```

---

## 3️⃣ التصفح (Pagination)

### Offset-based Pagination

```typescript
const getPaginatedData = async (
  table: string,
  page: number,
  pageSize: number = 20
) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .range(from, to);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  };
};
```

### Cursor-based Pagination (أفضل للأداء)

```typescript
const getCursorPaginatedData = async (
  lastId: string | null,
  pageSize: number = 20
) => {
  let query = supabase
    .from('customers')
    .select('*')
    .order('id', { ascending: true })
    .limit(pageSize + 1);  // +1 لمعرفة إذا هناك المزيد

  if (lastId) {
    query = query.gt('id', lastId);
  }

  const { data } = await query;

  const hasMore = data.length > pageSize;
  const items = hasMore ? data.slice(0, pageSize) : data;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    data: items,
    nextCursor,
    hasMore
  };
};
```

### Infinite Scroll Hook

```typescript
const useInfiniteData = (table: string, pageSize: number = 20) => {
  const [data, setData] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const result = await getCursorPaginatedData(cursor, pageSize);
    
    setData(prev => [...prev, ...result.data]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setLoading(false);
  };

  return { data, loadMore, hasMore, loading };
};
```

---

## 4️⃣ العلاقات (Relations)

### One-to-Many

```typescript
// الفاتورة مع بنودها
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    items:sales_invoice_items(*)
  `)
  .eq('id', invoiceId)
  .single();
```

### Many-to-One

```typescript
// البنود مع الفاتورة
const { data } = await supabase
  .from('sales_invoice_items')
  .select(`
    *,
    invoice:sales_invoices(invoice_number, invoice_date)
  `);
```

### Many-to-Many (via Junction Table)

```typescript
// المستخدم مع أدواره
const { data } = await supabase
  .from('user_profiles')
  .select(`
    *,
    roles:user_roles(
      role:roles(id, name_ar, permissions)
    )
  `)
  .eq('id', userId)
  .single();
```

### علاقات متداخلة (Nested)

```typescript
// فاتورة كاملة
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers(
      id,
      name_ar,
      phone,
      group:customer_groups(name_ar, discount_percent)
    ),
    items:sales_invoice_items(
      *,
      product:products(
        sku,
        name_ar,
        category:product_categories(name_ar)
      )
    ),
    payments:payment_receipts(
      id,
      receipt_number,
      amount,
      payment_date
    )
  `)
  .eq('id', invoiceId)
  .single();
```

### تحديد أعمدة العلاقة

```typescript
// فقط الأعمدة المطلوبة
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    id,
    invoice_number,
    total_amount,
    customer:customers(name_ar, phone)
  `);
```

### فلترة العلاقات

```typescript
// فواتير عميل معين
const { data } = await supabase
  .from('sales_invoices')
  .select(`
    *,
    customer:customers!inner(name_ar)
  `)
  .eq('customers.id', customerId);
```

---

## 5️⃣ Real-time Subscriptions

### الاشتراك في جدول

```typescript
const channel = supabase
  .channel('sales_invoices_changes')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'sales_invoices',
      filter: `company_id=eq.${companyId}`
    },
    (payload) => {
      console.log('Change received:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          setInvoices(prev => [...prev, payload.new]);
          break;
        case 'UPDATE':
          setInvoices(prev => 
            prev.map(inv => inv.id === payload.new.id ? payload.new : inv)
          );
          break;
        case 'DELETE':
          setInvoices(prev => 
            prev.filter(inv => inv.id !== payload.old.id)
          );
          break;
      }
    }
  )
  .subscribe();

// إلغاء الاشتراك
return () => {
  supabase.removeChannel(channel);
};
```

### الاشتراك في سجل واحد

```typescript
const channel = supabase
  .channel(`invoice_${invoiceId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'sales_invoices',
      filter: `id=eq.${invoiceId}`
    },
    (payload) => {
      setInvoice(payload.new);
    }
  )
  .subscribe();
```

### Hook للـ Real-time

```typescript
const useRealtimeTable = <T>(
  table: string,
  filter?: string,
  onInsert?: (row: T) => void,
  onUpdate?: (row: T) => void,
  onDelete?: (row: T) => void
) => {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new as T);
              break;
            case 'UPDATE':
              onUpdate?.(payload.new as T);
              break;
            case 'DELETE':
              onDelete?.(payload.old as T);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
};
```

---

## 6️⃣ التجميع (Aggregation)

### Count

```typescript
// عدد السجلات
const { count } = await supabase
  .from('customers')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', companyId);
```

### Sum (via RPC)

```typescript
// إجمالي المبيعات
const { data: totalSales } = await supabase
  .from('sales_invoices')
  .select('total_amount')
  .eq('company_id', companyId)
  .eq('status', 'posted');

const sum = totalSales.reduce((acc, inv) => acc + inv.total_amount, 0);

// أو عبر RPC
const { data } = await supabase.rpc('get_total_sales', {
  p_company_id: companyId,
  p_from_date: '2026-01-01',
  p_to_date: '2026-12-31'
});
```

---

## 7️⃣ أنماط شائعة

### التحقق من الوجود

```typescript
const exists = async (table: string, column: string, value: any) => {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value);
  
  return count > 0;
};

// الاستخدام
const emailExists = await exists('customers', 'email', 'test@example.com');
```

### Upsert Pattern

```typescript
const upsertSetting = async (key: string, value: any) => {
  const { data, error } = await supabase
    .from('settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    .select()
    .single();
  
  return data;
};
```

### Soft Delete

```typescript
const softDelete = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .update({ 
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', id);
  
  return !error;
};
```

### Optimistic Updates

```typescript
const updateWithOptimism = async (id: string, updates: any) => {
  // 1. التحديث المتفائل
  setData(prev => prev.map(item => 
    item.id === id ? { ...item, ...updates } : item
  ));

  // 2. التحديث الفعلي
  const { error } = await supabase
    .from('table')
    .update(updates)
    .eq('id', id);

  // 3. التراجع عند الخطأ
  if (error) {
    // إعادة جلب البيانات الأصلية
    await refetch();
    throw error;
  }
};
```

---

**التالي:** [07-examples.md](./07-examples.md) - أمثلة عملية

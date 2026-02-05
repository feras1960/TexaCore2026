# 🔌 Документація API - API Documentation
# TexaCore ERP Service Layer Reference

**Дата оновлення**: 3 лютого 2026

---

## 📋 Зміст

1. [Загальна інформація](#1-загальна-інформація)
2. [Аутентифікація](#2-аутентифікація)
3. [Сервіси бухгалтерії](#3-сервіси-бухгалтерії)
4. [Сервіси складу](#4-сервіси-складу)
5. [Сервіси продажів](#5-сервіси-продажів)
6. [Сервіси закупівель](#6-сервіси-закупівель)
7. [Обробка помилок](#7-обробка-помилок)

---

## 1. Загальна інформація

### Base URL
```
https://[project-ref].supabase.co
```

### Обов'язкові Headers
```http
Content-Type: application/json
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
```

### Формат відповіді
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

## 2. Аутентифікація

### 2.1 Вхід у систему

```typescript
// POST /auth/v1/token?grant_type=password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

**Відповідь:**
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

### 2.2 Вихід із системи

```typescript
await supabase.auth.signOut();
```

---

### 2.3 Отримання поточного користувача

```typescript
const { data: { user } } = await supabase.auth.getUser();
```

---

## 3. Сервіси бухгалтерії

### 3.1 План рахунків

#### Отримати всі рахунки
```typescript
// GET /rest/v1/chart_of_accounts
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('*')
  .eq('company_id', companyId)
  .order('account_code');
```

#### Отримати рахунок за кодом
```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('*')
  .eq('company_id', companyId)
  .eq('account_code', code)
  .single();
```

#### Отримати дерево з дочірніми елементами
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

#### Створити рахунок
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

#### Оновити рахунок
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

### 3.2 Бухгалтерські записи

#### Отримати записи
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

#### Створити новий запис
```typescript
// Крок 1: Створити запис
const { data: entry, error: entryError } = await supabase
  .from('journal_entries')
  .insert({
    tenant_id: tenantId,
    company_id: companyId,
    entry_number: 'JE-2026-001',
    entry_date: '2026-02-02',
    description: 'Рахунок продажу',
    status: 'draft'
  })
  .select()
  .single();

// Крок 2: Створити рядки
const { error: linesError } = await supabase
  .from('journal_entry_lines')
  .insert([
    {
      journal_entry_id: entry.id,
      account_id: customerAccountId,
      debit: 1000,
      credit: 0,
      description: 'Дебіторська заборгованість'
    },
    {
      journal_entry_id: entry.id,
      account_id: salesAccountId,
      debit: 0,
      credit: 1000,
      description: 'Дохід від продажу'
    }
  ]);
```

#### Провести запис
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

## 4. Сервіси складу

### 4.1 Склади

#### Отримати склади
```typescript
const { data, error } = await supabase
  .from('warehouses')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

#### Отримати склад з місцями
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

### 4.2 Рулони

#### Отримати рулони
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

#### Отримати рулон за номером
```typescript
const { data, error } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('company_id', companyId)
  .eq('roll_number', rollNumber)
  .single();
```

#### Відрізати від рулону
```typescript
// Використання RPC функції
const { data, error } = await supabase
  .rpc('cut_from_roll', {
    p_roll_id: rollId,
    p_cut_amount: 10.5,
    p_reason: 'sale',
    p_reference_id: invoiceId
  });
```

#### Зарезервувати кількість
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

### 4.3 Контейнери

#### Отримати контейнери
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

#### Створити контейнер
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

// Додати позиції
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

#### Оновити статус контейнера
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

### 4.4 Резервування

#### Отримати активні резервування
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

#### Створити резервування
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

### 4.5 Інвентаризація

#### Почати нову інвентаризацію
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

#### Записати результат підрахунку
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

#### Завершити інвентаризацію
```typescript
const { data, error } = await supabase
  .rpc('complete_stock_count', {
    p_stock_count_id: stockCountId,
    p_create_adjustment: true
  });
```

---

## 5. Сервіси продажів

### 5.1 Клієнти

#### Отримати клієнтів
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

#### Пошук клієнта
```typescript
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('company_id', companyId)
  .or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)
  .limit(10);
```

#### Отримати баланс клієнта
```typescript
const { data, error } = await supabase
  .rpc('get_customer_balance', {
    p_customer_id: customerId
  });
```

---

### 5.2 Рахунки-фактури продажу

#### Отримати рахунки
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

#### Створити рахунок
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
    p_notes: 'Примітки'
  });
```

#### Підтвердити рахунок
```typescript
const { data, error } = await supabase
  .rpc('post_sales_invoice', {
    p_invoice_id: invoiceId
  });
```

---

## 6. Сервіси закупівель

### 6.1 Постачальники

#### Отримати постачальників
```typescript
const { data, error } = await supabase
  .from('suppliers')
  .select('*')
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name');
```

---

### 6.2 Рахунки-фактури закупівлі

#### Створити рахунок закупівлі
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

## 7. Обробка помилок

### Загальні коди помилок

| Код | Опис | Обробка |
|-----|------|---------|
| `PGRST116` | Запис не знайдено | Показати "Не знайдено" |
| `23505` | Порушення UNIQUE | "Цей код вже використовується" |
| `23503` | Порушення Foreign Key | "Пов'язаний запис відсутній" |
| `42501` | Доступ заборонено | "У вас немає дозволу" |
| `PGRST301` | Row-Level Security | "Доступ обмежено" |

### Приклад обробки помилок

```typescript
const { data, error } = await supabase
  .from('table')
  .insert(record)
  .select()
  .single();

if (error) {
  if (error.code === '23505') {
    toast.error('Цей код вже використовується');
  } else if (error.code === '42501') {
    toast.error('У вас немає дозволу на цю операцію');
  } else {
    toast.error('Виникла помилка: ' + error.message);
  }
  return;
}

// Успіх
toast.success('Операцію виконано успішно');
```

---

## 📊 Підсумок API

| Розділ | Кількість Endpoints | Основні |
|--------|---------------------|---------|
| Аутентифікація | 3 | signIn, signOut |
| Бухгалтерія | 12 | chart_of_accounts, journal_entries |
| Склад | 20 | fabric_rolls, containers, reservations |
| Продажі | 10 | customers, sales_invoices |
| Закупівлі | 6 | suppliers, purchase_invoices |
| **Всього** | **50+** | - |

---

**© 2026 TexaCore ERP**

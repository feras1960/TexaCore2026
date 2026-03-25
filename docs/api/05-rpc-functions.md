# 🔧 الدوال المساعدة (RPC Functions)
# Helper Functions & RPC

---

## 📋 نظرة عامة

الدوال المساعدة (RPC) هي functions في PostgreSQL يمكن استدعاؤها من الـ Frontend. تُستخدم للتحقق من الصلاحيات والحصول على سياق المستخدم.

### الاستدعاء العام

```typescript
const { data, error } = await supabase.rpc('function_name', { 
  param1: value1,
  param2: value2 
});
```

---

## 1️⃣ دوال التحقق من الهوية

### `is_platform_owner()`

التحقق مما إذا كان المستخدم الحالي هو مالك المنصة.

```typescript
const { data: isPlatformOwner } = await supabase.rpc('is_platform_owner');

if (isPlatformOwner) {
  // يرى كل البراندات والمستأجرين
}
```

**Returns:** `boolean`

---

### `is_platform_admin()`

التحقق مما إذا كان المستخدم الحالي مدير منصة.

```typescript
const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin');

if (isPlatformAdmin) {
  // صلاحيات إدارية على مستوى المنصة
}
```

**Returns:** `boolean`

---

### `is_tenant_owner()`

التحقق مما إذا كان المستخدم مالك المستأجر الحالي.

```typescript
const { data: isTenantOwner } = await supabase.rpc('is_tenant_owner');

if (isTenantOwner) {
  // يرى كل شركات المستأجر
}
```

**Returns:** `boolean`

---

### `is_tenant_admin()`

التحقق مما إذا كان المستخدم مدير مستأجر.

```typescript
const { data: isTenantAdmin } = await supabase.rpc('is_tenant_admin');
```

**Returns:** `boolean`

---

### `is_company_admin(p_company_id)`

التحقق مما إذا كان المستخدم مدير شركة معينة.

```typescript
const { data: isCompanyAdmin } = await supabase.rpc('is_company_admin', {
  p_company_id: 'company-uuid-here'
});
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_company_id | uuid | ✅ | معرف الشركة |

**Returns:** `boolean`

---

## 2️⃣ دوال الحصول على السياق

### `get_user_tenant_id()`

الحصول على tenant_id للمستخدم الحالي.

```typescript
const { data: tenantId } = await supabase.rpc('get_user_tenant_id');
console.log('Tenant ID:', tenantId);
```

**Returns:** `uuid | null`

---

### `get_user_company_id()`

الحصول على company_id للمستخدم الحالي.

```typescript
const { data: companyId } = await supabase.rpc('get_user_company_id');
console.log('Company ID:', companyId);
```

**Returns:** `uuid | null`

---

### `get_user_brand_id()`

الحصول على brand_id للمستخدم الحالي (للشركاء).

```typescript
const { data: brandId } = await supabase.rpc('get_user_brand_id');
```

**Returns:** `uuid | null`

---

### `get_user_branch_id()`

الحصول على branch_id للمستخدم الحالي.

```typescript
const { data: branchId } = await supabase.rpc('get_user_branch_id');
```

**Returns:** `uuid | null`

---

## 3️⃣ دوال التحقق من الوصول

### `can_access_company(p_company_id)`

التحقق مما إذا كان للمستخدم حق الوصول لشركة معينة.

```typescript
const { data: canAccess } = await supabase.rpc('can_access_company', {
  p_company_id: 'target-company-uuid'
});

if (!canAccess) {
  throw new Error('لا يمكنك الوصول لهذه الشركة');
}
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_company_id | uuid | ✅ | معرف الشركة المستهدفة |

**Returns:** `boolean`

---

### `can_access_branch(p_branch_id)`

التحقق مما إذا كان للمستخدم حق الوصول لفرع معين.

```typescript
const { data: canAccess } = await supabase.rpc('can_access_branch', {
  p_branch_id: 'target-branch-uuid'
});
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_branch_id | uuid | ✅ | معرف الفرع المستهدف |

**Returns:** `boolean`

---

### `check_row_access(p_tenant_id, p_company_id)`

التحقق من صلاحية الوصول لسجل معين.

```typescript
const { data: hasAccess } = await supabase.rpc('check_row_access', {
  p_tenant_id: 'row-tenant-id',
  p_company_id: 'row-company-id'
});
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_tenant_id | uuid | ✅ | tenant_id للسجل |
| p_company_id | uuid | ❌ | company_id للسجل |

**Returns:** `boolean`

---

### `is_same_brand(p_tenant_id)`

التحقق مما إذا كان المستأجر ينتمي لنفس البراند.

```typescript
const { data: isSameBrand } = await supabase.rpc('is_same_brand', {
  p_tenant_id: 'other-tenant-id'
});
```

**Returns:** `boolean`

---

## 4️⃣ دوال الحصول على القوائم

### `get_user_accessible_company_ids()`

الحصول على قائمة معرفات الشركات المتاحة للمستخدم.

```typescript
const { data: companyIds } = await supabase.rpc('get_user_accessible_company_ids');
// ['uuid-1', 'uuid-2', 'uuid-3']

// استخدام مع استعلام
const { data: companies } = await supabase
  .from('companies')
  .select('*')
  .in('id', companyIds);
```

**Returns:** `uuid[]`

---

### `get_partner_tenant_ids()`

الحصول على قائمة معرفات المستأجرين التابعين للشريك (للشركاء/الوكلاء).

```typescript
const { data: tenantIds } = await supabase.rpc('get_partner_tenant_ids');
// ['tenant-uuid-1', 'tenant-uuid-2']
```

**Returns:** `uuid[]`

---

### `get_user_visible_modules()`

الحصول على قائمة الوحدات المرئية للمستخدم.

```typescript
const { data: modules } = await supabase.rpc('get_user_visible_modules');
// ['dashboard', 'accounting', 'sales', 'inventory']
```

**Returns:** `text[]`

---

### `get_user_permissions()`

الحصول على صلاحيات المستخدم بالكامل.

```typescript
const { data: permissions } = await supabase.rpc('get_user_permissions');
/*
{
  "accounting": ["read", "write", "delete"],
  "sales": ["read", "write"],
  "inventory": ["read"]
}
*/
```

**Returns:** `jsonb`

---

## 5️⃣ دوال المستودعات

### `get_user_warehouse_ids()`

الحصول على المستودعات المتاحة للمستخدم.

```typescript
const { data: warehouseIds } = await supabase.rpc('get_user_warehouse_ids');
```

**Returns:** `uuid[]`

---

### `can_access_warehouse(p_warehouse_id, p_action)`

التحقق من صلاحية عملية معينة على مستودع.

```typescript
const { data: canReceive } = await supabase.rpc('can_access_warehouse', {
  p_warehouse_id: 'warehouse-uuid',
  p_action: 'receive'
});
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_warehouse_id | uuid | ✅ | معرف المستودع |
| p_action | text | ✅ | العملية: view, receive, issue, transfer, adjust |

**Returns:** `boolean`

---

## 6️⃣ دوال المحاسبة

### `get_account_balance(p_account_id, p_as_of_date)`

الحصول على رصيد حساب في تاريخ معين.

```typescript
const { data: balance } = await supabase.rpc('get_account_balance', {
  p_account_id: 'account-uuid',
  p_as_of_date: '2026-02-05'
});
```

**Parameters:**
| الاسم | النوع | مطلوب | الوصف |
|-------|------|-------|-------|
| p_account_id | uuid | ✅ | معرف الحساب |
| p_as_of_date | date | ❌ | التاريخ (الافتراضي: اليوم) |

**Returns:** `decimal`

---

### `get_next_entry_number(p_company_id, p_prefix)`

الحصول على الرقم التالي للقيد.

```typescript
const { data: nextNumber } = await supabase.rpc('get_next_entry_number', {
  p_company_id: 'company-uuid',
  p_prefix: 'JE'
});
// 'JE-2026-0001'
```

**Returns:** `text`

---

### `check_entry_balanced(p_entry_id)`

التحقق من توازن القيد.

```typescript
const { data: isBalanced } = await supabase.rpc('check_entry_balanced', {
  p_entry_id: 'entry-uuid'
});
```

**Returns:** `boolean`

---

## 7️⃣ دوال المخزون

### `get_available_quantity(p_product_id, p_warehouse_id)`

الحصول على الكمية المتاحة.

```typescript
const { data: available } = await supabase.rpc('get_available_quantity', {
  p_product_id: 'product-uuid',
  p_warehouse_id: 'warehouse-uuid'
});
```

**Returns:** `decimal`

---

### `reserve_quantity(p_product_id, p_warehouse_id, p_quantity, p_reference_type, p_reference_id)`

حجز كمية.

```typescript
const { data: reservationId } = await supabase.rpc('reserve_quantity', {
  p_product_id: 'product-uuid',
  p_warehouse_id: 'warehouse-uuid',
  p_quantity: 100,
  p_reference_type: 'sales_order',
  p_reference_id: 'order-uuid'
});
```

**Returns:** `uuid` (معرف الحجز)

---

## 8️⃣ دوال الإحصائيات

### `get_dashboard_stats(p_company_id, p_from_date, p_to_date)`

الحصول على إحصائيات لوحة التحكم.

```typescript
const { data: stats } = await supabase.rpc('get_dashboard_stats', {
  p_company_id: 'company-uuid',
  p_from_date: '2026-01-01',
  p_to_date: '2026-12-31'
});

/*
{
  "total_sales": 1500000,
  "total_purchases": 1000000,
  "total_customers": 150,
  "total_suppliers": 45,
  "receivables": 250000,
  "payables": 180000
}
*/
```

**Returns:** `jsonb`

---

### `get_top_customers(p_company_id, p_from_date, p_to_date, p_limit)`

الحصول على أفضل العملاء.

```typescript
const { data: topCustomers } = await supabase.rpc('get_top_customers', {
  p_company_id: 'company-uuid',
  p_from_date: '2026-01-01',
  p_to_date: '2026-12-31',
  p_limit: 10
});
```

**Returns:** `table (customer_id, customer_name, total_sales, invoice_count)`

---

### `get_low_stock_products(p_company_id)`

الحصول على منتجات تحت الحد الأدنى.

```typescript
const { data: lowStock } = await supabase.rpc('get_low_stock_products', {
  p_company_id: 'company-uuid'
});
```

**Returns:** `table (product_id, sku, name_ar, current_qty, min_stock)`

---

## 9️⃣ استخدام مع TypeScript

### تعريف الأنواع

```typescript
// types/rpc.types.ts
export interface RPCFunctions {
  is_platform_owner: () => boolean;
  is_platform_admin: () => boolean;
  is_tenant_owner: () => boolean;
  is_tenant_admin: () => boolean;
  is_company_admin: (args: { p_company_id: string }) => boolean;
  
  get_user_tenant_id: () => string | null;
  get_user_company_id: () => string | null;
  get_user_brand_id: () => string | null;
  
  can_access_company: (args: { p_company_id: string }) => boolean;
  check_row_access: (args: { p_tenant_id: string; p_company_id?: string }) => boolean;
  
  get_user_accessible_company_ids: () => string[];
  get_partner_tenant_ids: () => string[];
  get_user_visible_modules: () => string[];
  get_user_permissions: () => Record<string, string[]>;
  
  get_account_balance: (args: { p_account_id: string; p_as_of_date?: string }) => number;
  get_available_quantity: (args: { p_product_id: string; p_warehouse_id: string }) => number;
}
```

### Helper Wrapper

```typescript
// lib/rpc.ts
import { supabase } from './supabase';
import type { RPCFunctions } from '@/types/rpc.types';

export async function rpc<K extends keyof RPCFunctions>(
  functionName: K,
  args?: Parameters<RPCFunctions[K]>[0]
): Promise<ReturnType<RPCFunctions[K]>> {
  const { data, error } = await supabase.rpc(functionName, args as any);
  
  if (error) {
    throw new Error(`RPC ${functionName} failed: ${error.message}`);
  }
  
  return data as ReturnType<RPCFunctions[K]>;
}

// الاستخدام
const tenantId = await rpc('get_user_tenant_id');
const canAccess = await rpc('can_access_company', { p_company_id: 'uuid' });
```

---

## ⚠️ ملاحظات مهمة

1. **الكاشينج:** نتائج بعض الدوال (مثل `get_user_tenant_id`) يمكن تخزينها مؤقتاً لتحسين الأداء.

2. **RLS:** الدوال تعمل مع سياق المستخدم الحالي من JWT.

3. **SECURITY DEFINER:** معظم الدوال معرفة بـ `SECURITY DEFINER` للوصول للبيانات المطلوبة.

---

**التالي:** [06-query-patterns.md](./06-query-patterns.md) - أنماط الاستعلام

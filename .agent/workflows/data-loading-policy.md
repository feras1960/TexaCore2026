---
description: سياسة تحميل البيانات وإدارة الكاش - Data Loading & Caching Policy
---

# 📋 سياسة تحميل البيانات في TexaCore ERP

## المبادئ الأساسية

هذه السياسة تحدد كيف يتم تحميل البيانات عبر كل صفحات النظام بشكل موحد.

---

## 1. طبقات الكاش (Cache Layers)

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: React Query Cache (In-Memory)             │
│  ├─ staleTime: مدة اعتبار البيانات "طازجة"         │
│  ├─ gcTime: مدة بقاء البيانات في الذاكرة           │
│  └─ refetchOnWindowFocus: إعادة تحميل عند العودة    │
├─────────────────────────────────────────────────────┤
│  Layer 2: Component State (Keep-All-Mounted)        │
│  ├─ الكومبوننت يبقى mounted عند تبديل التاب        │
│  └─ البيانات تبقى في الـ state بدون إعادة تحميل     │
├─────────────────────────────────────────────────────┤
│  Layer 3: Supabase (Server)                         │
│  └─ المصدر الأصلي للبيانات                          │
└─────────────────────────────────────────────────────┘
```

## 2. تصنيف البيانات حسب معدل التغيير

| التصنيف | أمثلة | staleTime | إعادة التحميل |
|---------|-------|-----------|---------------|
| **ثابتة** | شجرة الحسابات، العملات، إعدادات الشركة | 30 دقيقة | عند التعديل فقط |
| **شبه ثابتة** | المستودعات، المواد، الموردين، العملاء | 5-10 دقائق | عند التعديل + تحديث يدوي |
| **متغيرة** | الفواتير، القيود، الحركات | 1 دقيقة | عند التعديل + windowFocus |
| **حية** | لوحات التحكم، الإحصائيات | 30 ثانية | تلقائي + تحديث يدوي |

## 3. أنماط التحميل (Loading Patterns)

### 3.1 النمط القياسي: React Query + Service
```typescript
// ✅ الطريقة الصحيحة: استخدام React Query
const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['warehouses', companyId],
    queryFn: () => warehouseService.getWarehouses(companyId),
    staleTime: 5 * 60 * 1000,  // 5 دقائق
    enabled: !!companyId,
});
```

### 3.2 النمط الخاطئ: useState + useEffect
```typescript
// ❌ يجب تجنبها: تفقد الكاش وتعيد التحميل كل مرة
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
    loadData();
}, []);
```

### 3.3 نمط التحميل المتوازي
```typescript
// ✅ استعلامات متوازية بدلاً من متتالية
const [stats, lowStock, capacity] = await Promise.all([
    getStats(companyId).catch(() => defaultStats),
    getLowStock(companyId).catch(() => []),
    getCapacity(companyId).catch(() => []),
]);
```

## 4. سلوك التبويبات (Tab Navigation)

### 4.1 نمط "Keep All Mounted" (المعتمد)
```
التاب المفعل ← يعرض المحتوى
التاب المخفي ← display:none + contentVisibility:hidden
النتيجة ← تبديل فوري بدون إعادة تحميل
```

### 4.2 متى يعاد التحميل؟
- ❌ لا يعاد عند التبديل بين التبويبات
- ❌ لا يعاد عند العودة من صفحة فرعية (إذا staleTime لم ينتهِ)
- ✅ يعاد عند إضافة/تعديل/حذف بيانات (invalidateQueries)
- ✅ يعاد عند الضغط على "تحديث"
- ✅ يعاد عند انتهاء staleTime + windowFocus
- ✅ **يعاد عند تغيير من مستخدم آخر (Supabase Realtime)**

### 4.3 Supabase Realtime + React Query

```
Architecture:
─────────────
  مستخدم آخر يضيف/يعدل/يحذف
           ↓
  PostgreSQL WAL Replication
           ↓
  Supabase Realtime (WebSocket)
           ↓
  useRealtimeInvalidation hook
           ↓
  invalidateQueries(['module', 'entity'])
           ↓
  React Query يعيد التحميل بالخلفية (بدون spinner)
           ↓
  واجهة المستخدم تتحدث تلقائياً ✨
```

```typescript
// النمط القياسي: Hook + Realtime
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

// داخل أي hook بيانات:
useRealtimeInvalidation({
    table: 'fabric_materials',      // الجدول المراقب
    companyId,                       // للفلترة حسب الشركة
    queryKeys: [                     // المفاتيح المراد إبطالها
        ['warehouse', 'materials'],
        ['warehouse', 'dashboard-stats', companyId],
    ],
    debounceMs: 300,                 // تأخير لمنع الطلبات المتكررة
});
```

**⚠️ متطلبات:**
- يجب تفعيل Realtime على الجدول في Supabase:
  `ALTER PUBLICATION supabase_realtime ADD TABLE table_name;`
- السكربت: `supabase/scripts/ENABLE_REALTIME_WAREHOUSE.sql`

## 5. queryKey Standards

```typescript
// الهيكل القياسي:
['module', 'entity', filters...]

// أمثلة:
['warehouse', 'list', companyId]
['warehouse', 'dashboard-stats', companyId]
['warehouse', 'materials', companyId, { group: groupId }]
['accounting', 'accounts', companyId]
['sales', 'invoices', companyId, { status: 'draft' }]
```

## 6. Invalidation Rules (قواعد إبطال الكاش)

```typescript
// عند إضافة مستودع جديد:
queryClient.invalidateQueries({ queryKey: ['warehouse', 'list'] });
queryClient.invalidateQueries({ queryKey: ['warehouse', 'dashboard-stats'] });

// عند تعديل فاتورة:
queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
// لا نبطل كاش العملاء لأنها لم تتغير
```

## 7. Error Handling Standard

```typescript
// كل استعلام يجب أن يتعامل مع الأخطاء بثلاث مستويات:
// 1. Service Level: try-catch + graceful fallback
// 2. Query Level: retry + error state
// 3. UI Level: Error boundary + user-friendly message
```

## 8. حالة التنفيذ (Implementation Status)

> آخر تحديث: 10 فبراير 2026

### ✅ الإعدادات العامة (Global Config)
- **الملف:** `src/app/providers/index.tsx`
- `staleTime: 5 min` | `gcTime: 30 min` | `refetchOnWindowFocus: false`
- تاريخ التنفيذ: فبراير 2026

### ✅ قسم المخازن (Warehouse Module) - مكتمل
- **ملف الهوكات المركزي:** `src/features/warehouse/hooks/useWarehouseQueries.ts`
- **الهوكات المتاحة:**

| Hook | الصفحة | staleTime | queryKey |
|------|--------|-----------|----------|
| `useWarehouses()` | قائمة المستودعات | 10 min | `['warehouse', 'list', companyId]` |
| `useMaterials(opts)` | إدارة المواد | 10 min | `['warehouse', 'materials', ...]` |
| `useMaterialGroups()` | مجموعات المواد | 10 min | `['warehouse', 'groups', ...]` |
| `useWarehouseDashboard()` | لوحة التحكم | 1 min (stats), 2 min (others) | `['warehouse', 'dashboard-*']` |
| `useInventory()` | المخزون | 2 min | `['warehouse', 'inventory-*']` |
| `useStockMovements(filters)` | حركات المخزون | 2 min | `['warehouse', 'stock-movements', ...]` |
| `useDefaultBranch()` | إنشاء مستودع | ∞ | `['warehouse', 'default-branch']` |

- **الصفحات المحوّلة:**
  - ✅ `WarehouseListPage.tsx` (كان useEffect → الآن useWarehouses)
  - ✅ `WarehouseDashboard.tsx` (كان useEffect → الآن useWarehouseDashboard)
  - ✅ `MaterialsPage.tsx` (كان useEffect → الآن useMaterials + useMaterialGroups)
  - ✅ `InventoryPage.tsx` (كان useEffect → الآن useInventory)
  - ✅ `StockMovementsPage.tsx` (كان useEffect → الآن useStockMovements)

- **🔄 Realtime مفعّل على:**
  - `warehouses` → يحدّث قائمة المستودعات + لوحة التحكم
  - `fabric_materials` → يحدّث المواد + الإحصائيات
  - `fabric_groups` → يحدّث مجموعات المواد
  - `fabric_rolls` → يحدّث لوحة التحكم + المخزون
  - `inventory_movements` → يحدّث الحركات + لوحة التحكم
  - **Hook المشترك:** `src/hooks/useRealtimeInvalidation.ts`
  - **سكربت التفعيل:** `supabase/scripts/ENABLE_REALTIME_WAREHOUSE.sql` ✅ تم التنفيذ

### ✅ قسم المحاسبة (Accounting Module) - مكتمل
- **ملف الهوكات المركزي:** `src/features/accounting/hooks/useAccountingQueries.ts`
- **الهوكات المتاحة:**

| Hook | الصفحة | staleTime | queryKey |
|------|--------|-----------|----------|
| `useJournalEntries(filters)` | القيود اليومية | 2 min | `['accounting', 'journal-entries', companyId, filters]` |
| `useFunds()` | الصناديق والبنوك | 10 min | `['accounting', 'funds', companyId]` |

- **الصفحات المحوّلة:**
  - ✅ `JournalEntries.tsx` (كان useEffect + supabase مباشر → الآن useJournalEntries)
  - ✅ `FundsManagement.tsx` (كان useEffect + accountsService → الآن useFunds)
  - ⬜ `CashJournal.tsx` - بيانات Mock وهمية حالياً، لا يحتاج تحويل

- **🔄 Realtime مفعّل على:**
  - `journal_entries` → يحدّث قائمة القيود + الصناديق
  - `journal_entry_lines` → يحدّث تفاصيل القيود
  - `chart_of_accounts` → يحدّث الصناديق والبنوك
  - **سكربت التفعيل:** `supabase/scripts/ENABLE_REALTIME_ACCOUNTING.sql` ✅ تم التنفيذ

### ✅ قسم المبيعات (Sales Module) - يستخدم React Query أصلاً
- **لا يحتاج تحويل** - `SalesCycleList.tsx` يستخدم `useQuery` مباشرة
- الصفحات التي تستخدم React Query:
  - ✅ `SalesCycleList.tsx` - `useQuery` لتحميل المستندات + خريطة العملاء
  - ✅ `SalesInvoicesList.tsx` - `useQuery` + Supabase
- **⬜ Realtime:** لم يُفعّل بعد على جداول المبيعات

### ✅ قسم المشتريات (Purchases Module) - يستخدم React Query أصلاً
- **لا يحتاج تحويل** - يستخدم `useQuery` مباشرة في الصفحات
- **⬜ Realtime:** لم يُفعّل بعد على جداول المشتريات

### ✅ قسم CRM - يستخدم React Query أصلاً
- **لا يحتاج تحويل**
- `AddContactSheet.tsx` يستخدم Supabase مباشر للكتابة فقط

---

## 9. الروابط المستقلة (URL-based Tab Routing)

> آخر تحديث: 10 فبراير 2026

### المشكلة السابقة:
عند تحديث الصفحة (F5) كان المستخدم يرجع للوحة التحكم لأن التبويب النشط لم يكن مرتبطاً بالـ URL.

### الحل المُنفّذ:
إضافة `useNavigate` لتحديث الـ URL عند تبديل التبويبات.

### حالة التنفيذ:

| القسم | الملف | حالة الروابط | أمثلة URLs |
|-------|-------|-------------|------------|
| ✅ المحاسبة | `Accounting.tsx` | **مُصلح** | `/accounting/journal-entries`, `/accounting/funds` |
| ✅ المستودعات | `WarehouseModule.tsx` | **مُصلح** | `/warehouse/materials`, `/warehouse/inventory` |
| ✅ المبيعات | `SalesPage.tsx` | كان يعمل أساساً | `/sales/cycle`, `/sales/invoices` |
| ✅ المشتريات | `PurchasesPage.tsx` | كان يعمل أساساً | `/purchases/cycle`, `/purchases/suppliers` |
| ✅ CRM | `CRM.tsx` | كان يعمل أساساً | `/crm/contacts`, `/crm/pipeline` |
| ✅ SaaS | `SaaS.tsx` | كان يعمل أساساً | `/saas/tenants`, `/saas/plans` |

---

## 10. Realtime - الجداول المفعّلة (supabase_realtime publication)

> آخر تحقق: 10 فبراير 2026 - **8 جداول مفعّلة**

| # | الجدول | القسم | سكربت التفعيل |
|---|--------|-------|---------------|
| 1 | `warehouses` | 🏭 المستودعات | `ENABLE_REALTIME_WAREHOUSE.sql` |
| 2 | `fabric_materials` | 🏭 المستودعات | `ENABLE_REALTIME_WAREHOUSE.sql` |
| 3 | `fabric_groups` | 🏭 المستودعات | `ENABLE_REALTIME_WAREHOUSE.sql` |
| 4 | `fabric_rolls` | 🏭 المستودعات | `ENABLE_REALTIME_WAREHOUSE.sql` |
| 5 | `inventory_movements` | 🏭 المستودعات | `ENABLE_REALTIME_WAREHOUSE.sql` |
| 6 | `journal_entries` | 📊 المحاسبة | `ENABLE_REALTIME_ACCOUNTING.sql` |
| 7 | `journal_entry_lines` | 📊 المحاسبة | `ENABLE_REALTIME_ACCOUNTING.sql` |
| 8 | `chart_of_accounts` | 📊 المحاسبة | `ENABLE_REALTIME_ACCOUNTING.sql` |

### ⬜ جداول تحتاج تفعيل Realtime لاحقاً:
- `quotations`, `sales_orders`, `sales_invoices`, `sales_deliveries`, `sales_returns` (المبيعات)
- `purchase_orders`, `purchase_invoices`, `suppliers` (المشتريات)
- `customers`, `contacts` (CRM)

---

## 11. الملفات المنشأة والمعدّلة (Files Changelog)

### الملفات الجديدة:
| الملف | الوصف |
|-------|-------|
| `src/hooks/useRealtimeInvalidation.ts` | Hook مشترك لربط Supabase Realtime مع React Query |
| `src/features/warehouse/hooks/useWarehouseQueries.ts` | هوكات React Query للمستودعات |
| `src/features/accounting/hooks/useAccountingQueries.ts` | هوكات React Query للمحاسبة (قيود + صناديق) |
| `supabase/scripts/ENABLE_REALTIME_WAREHOUSE.sql` | سكربت تفعيل Realtime للمستودعات ✅ مُنفّذ |
| `supabase/scripts/ENABLE_REALTIME_ACCOUNTING.sql` | سكربت تفعيل Realtime للمحاسبة ✅ مُنفّذ |

### الملفات المعدّلة:
| الملف | التعديل |
|-------|---------|
| `src/features/accounting/JournalEntries.tsx` | ❌ useEffect → ✅ useJournalEntries + useMemo للتحويل |
| `src/features/accounting/FundsManagement.tsx` | ❌ useEffect → ✅ useFunds |
| `src/features/accounting/Accounting.tsx` | ❌ بدون navigate → ✅ useNavigate لحفظ التبويب النشط |
| `src/features/warehouse/WarehouseModule.tsx` | ❌ بدون navigate → ✅ useNavigate لحفظ التبويب النشط |
| `src/features/warehouse/hooks/useWarehouseQueries.ts` | + Realtime subscriptions |

---

## 12. نموذج هوكات القسم (Module Hooks Template)

```typescript
// لكل قسم جديد، أنشئ ملف hooks مركزي:
// src/features/[module]/hooks/use[Module]Queries.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { [module]Service } from '@/services/[module]Service';
import { useCompany } from '@/hooks/useCompany';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

const SEMI_STATIC = 10 * 60 * 1000;  // للبيانات شبه الثابتة
const DYNAMIC     =  2 * 60 * 1000;  // للبيانات المتغيرة
const GC_TIME     = 30 * 60 * 1000;  // مدة البقاء في الكاش

export function use[Entity]() {
    const { companyId } = useCompany();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['[module]', '[entity]', companyId],
        queryFn: () => [module]Service.getAll(companyId!),
        enabled: !!companyId,
        staleTime: SEMI_STATIC,
        gcTime: GC_TIME,
    });

    // 🔄 Realtime
    useRealtimeInvalidation({
        table: '[table_name]',
        companyId,
        queryKeys: [['[module]', '[entity]']],
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['[module]', '[entity]'] });
    };

    return {
        data: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch,
        invalidate,
    };
}
```


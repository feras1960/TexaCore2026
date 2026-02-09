# 🔍 تقرير فحص جودة كود قسم المحاسبة
## Accounting Module Frontend Code Audit — 2026-02-09

---

## 📊 ملخص تنفيذي (Executive Summary)

| المقياس | الحالة | الدرجة |
|---------|--------|--------|
| **التكرار (Duplication)** | 🔴 خطير | 2/10 |
| **حجم الملفات** | 🔴 خطير | 2/10 |
| **فصل المسؤوليات (SRP)** | 🟡 متوسط | 5/10 |
| **نمط Unified (الجديد)** | 🟢 جيد | 7/10 |
| **تحميل البيانات** | 🟡 متوسط | 4/10 |
| **Type Safety** | 🟡 متوسط | 5/10 |
| **Error Handling** | 🟡 متوسط | 4/10 |
| **الأداء** | 🟡 متوسط | 5/10 |

**النتيجة الإجمالية: 4.25/10** — يحتاج تحسينات جوهرية

---

## 🔴 المشكلة الأولى: التكرار الضخم (Critical Duplication)

### 1. الملفات المُكررة بالكامل تقريباً

المشروع يحتوي على **طبقتين** من الكود تؤدي نفس الوظيفة:

#### الطبقة القديمة (Legacy) — يجب حذفها تدريجياً:
| الملف | الحجم | الوظيفة | البديل الموحد |
|-------|-------|---------|---------------|
| `Receipts.tsx` | 45KB / 970 سطر | قائمة سندات القبض | `JournalEntries.tsx` + filter |
| `Payments.tsx` | 46KB / 988 سطر | قائمة سندات الصرف | `JournalEntries.tsx` + filter |
| `CashJournal.tsx` | 44KB / 987 سطر | يومية الصندوق | `JournalEntries.tsx` + filter |
| `components/CashJournalForm.tsx` | 60KB / 1356 سطر | فورم يومية الصندوق | `unified/tabs/CashJournalTab.tsx` |
| `components/JournalEntryForm.tsx` | 24KB / 614 سطر | فورم القيد | `unified/tabs/JournalVoucherTab.tsx` |
| `components/JournalEntryGrid.tsx` | 16KB / — | جدول القيد | `NexaDataTable` |
| `components/NewJournalEntrySheet.tsx` | 9KB / 222 سطر | شيت القيد الجديد | `UnifiedAccountingSheet` |
| `components/QuickReceiptDialog.tsx` | 16KB / 364 سطر | حوار سند قبض سريع | `UnifiedAccountingSheet(receipt)` |
| `components/QuickPaymentDialog.tsx` | 19KB / 415 سطر | حوار سند صرف سريع | `UnifiedAccountingSheet(payment)` |
| `components/AccountDetailsSheet.tsx` | **164KB / 3495 سطر** | تفاصيل الحساب | `UnifiedAccountingSheet(account)` |
| `components/AccountDetailsSheetV2.tsx` | 44KB / — | النسخة الثانية | `UnifiedAccountingSheet(account)` |
| `components/FundTransactionSheet.tsx` | 51KB / 990 سطر | حركات الصندوق | `UnifiedAccountingSheet(fund)` |
| `components/FundTransferDialog.tsx` | 16KB / — | حوار التحويل | `UnifiedAccountingSheet(transfer)` |
| `components/FundTransferContent.tsx` | 15KB / — | محتوى التحويل | `unified/tabs/FundTransferTab.tsx` |
| `components/CurrencyExchangeDialog.tsx` | 21KB / — | حوار الصرافة | `UnifiedAccountingSheet(exchange)` |
| `components/CurrencyExchangeContent.tsx` | 19KB / — | محتوى الصرافة | `unified/tabs/CurrencyExchangeTab.tsx` |
| `unified/tabs/JournalFormTab.tsx` | 45KB / 988 سطر | الفورم الموحد القديم | تم تقسيمه إلى Tabs متخصصة |

#### حجم الكود المُكرر المُقدّر:
```
Legacy Files Total:    ~585KB / ~12,000 سطر
Unified Files Total:   ~120KB / ~3,000 سطر
────────────────────────────────────
كود يمكن حذفه:        ~585KB (83% من إجمالي القسم!)
```

### 2. الدوال المُكررة عبر ملفات متعددة

| الدالة/الثابت | عدد التكرارات | الملفات |
|---------------|--------------|---------|
| `currencyInfo` (const) | **5 ملفات** | FundTransactionSheet, QuickReceiptDialog, QuickPaymentDialog, CurrencyExchangeDialog, CurrencyExchangeContent |
| `getDateRangeFromPreset()` | **5 ملفات** | CashJournal, Receipts, Payments, JournalEntries, FundTransactionSheet |
| `FilterState` (interface) | **5 ملفات** | CashJournal, Receipts, Payments, JournalEntries, FundTransactionSheet |
| `SortConfig` (interface) | **7 ملفات** | CashJournal, Receipts, JournalEntries, Payments, AdvancedReports, FundDetails + ... |
| `renderSortableHeader()` | **4 ملفات** | CashJournal, Receipts, Payments, JournalEntries |
| `getEntryTypeBadgeColor()` | **3 ملفات** | CashJournal, Receipts, Payments |
| `toggleReconciliationMark()` | **7 ملفات** | Payments, Receipts, CostCentersList, AccountDetailsSheet, AdvancedReports, ExchangeRates + ... |
| `RECONCILIATION_COLORS` | **7 ملفات** | نفس الملفات أعلاه |
| `handleDateShortcut()` | **مكرر داخل ملف واحد 4 مرات** | AccountDetailsSheet (في كل تبويب!) |

---

## 🔴 المشكلة الثانية: ملفات عملاقة (God Files)

| الملف | الحجم | الحد الاحترافي | التجاوز |
|-------|-------|---------------|---------|
| `AccountDetailsSheet.tsx` | **164KB / 3,495 سطر** | 300 سطر | **11x** |
| `AccountingSettings.tsx` | 64KB / — | 400 سطر | ~4x |
| `AdvancedAccountingReports.tsx` | 63KB / — | 400 سطر | ~4x |
| `CashJournalForm.tsx` | 60KB / 1,356 سطر | 300 سطر | **4.5x** |
| `FundTransactionSheet.tsx` | 51KB / 990 سطر | 300 سطر | **3.3x** |
| `UserPermissionsTab.tsx` | 52KB / — | 300 سطر | ~5x |
| `Receipts.tsx` | 45KB / 970 سطر | 300 سطر | **3.2x** |
| `Payments.tsx` | 46KB / 988 سطر | 300 سطر | **3.3x** |
| `CashJournal.tsx` | 44KB / 987 سطر | 300 سطر | **3.3x** |
| `JournalFormTab.tsx` *(deprecated)* | 45KB / 988 سطر | 300 سطر | **3.3x** |

> **معيار احترافي:** ملف React يجب ألا يتجاوز 200-400 سطر. فوق 500 يعتبر Code Smell.

---

## 🟡 مشاكل المعايير الاحترافية

### 3. Direct Supabase Calls في Components
```
13 ملف يستدعي supabase مباشرة بدلاً من استخدام Service Layer
```
**المعيار:** Components ← Hooks ← Services ← Supabase
**الواقع:** Components ← Supabase مباشرة (في 13+ مكان)

### 4. استخدام `any` المفرط
- `data: any` في معظم Props
- `onChange: (updates: any) => void`
- `options?: any`

**المعيار:** Strict TypeScript مع Generic types

### 5. Mock Data مُضمّنة في الكود
- `FundTransactionSheet.tsx`: ~50 سطر mock data
- `FundDetails.tsx`: mock transactions
- `AccountDetailsSheet.tsx`: mock activities

**المعيار:** البيانات الوهمية في `__mocks__/` أو `__tests__/fixtures/`

### 6. عدم وجود Error Boundaries
لا يوجد `ErrorBoundary` حول أي من المكونات الرئيسية.

---

## 🟢 النقاط الإيجابية

1. ✅ **نمط Unified Sheet** — بنية ممتازة وقابلة للتوسع
2. ✅ **NexaDataTable** — مكون موحد للجداول بمميزات متقدمة
3. ✅ **SmartAccountSelector** — مكون مشترك ذكي
4. ✅ **Config-driven Architecture** — في `documentConfigs.ts`
5. ✅ **دعم RTL/LTR** — مُطبق في جميع المكونات الجديدة
6. ✅ **Color Marker System** — نظام موحد للتلوين
7. ✅ **Lazy Loading** — في `Accounting.tsx` الرئيسي

---

## 📋 خطة تحميل البيانات (Data Loading Strategy)

### الوضع الحالي:
```
❌ كل صفحة تحمّل البيانات بشكل مستقل
❌ لا يوجد caching
❌ supabase calls مباشرة من المكونات
❌ لا يوجد pagination حقيقي (كل البيانات تُحمّل دفعة واحدة)
❌ لا يوجد optimistic updates
```

### الخطة المقترحة — 4 مراحل:

---

### المرحلة 1: Service Layer Consolidation (أسبوع واحد)

**الهدف:** فصل البيانات عن العرض

```
src/services/
├── journalEntriesService.ts   ← (موجود ✅)
├── accountsService.ts         ← (موجود ✅)
├── accountLedgerService.ts    ← (موجود ✅)
├── fundsService.ts            ← يحتاج تحسين
├── partiesService.ts          ← يحتاج إنشاء
├── reportsService.ts          ← يحتاج إنشاء
└── currencyService.ts         ← يحتاج إنشاء
```

**القاعدة:** لا يوجد `supabase` import في أي ملف `.tsx`

---

### المرحلة 2: Custom Hooks Layer (أسبوع واحد)

**الهدف:** إدارة الحالة والتخزين المؤقت

```typescript
// مثال: useJournalEntries hook
function useJournalEntries(filters: FilterState) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });

  // Auto-fetch on filter change with debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchEntries(), 300);
    return () => clearTimeout(timer);
  }, [filters, pagination.page]);

  return { entries, loading, error, pagination, refetch, create, update, remove };
}
```

**Hooks المطلوبة:**
```
src/features/accounting/hooks/
├── useViewCurrency.ts          ← (موجود ✅)
├── useJournalEntries.ts        ← جديد
├── useAccountLedger.ts         ← جديد  
├── useFunds.ts                 ← جديد
├── useParties.ts               ← جديد
├── useFilters.ts               ← جديد (موحد لكل الصفحات)
├── useDatePresets.ts           ← جديد (يحل تكرار getDateRangeFromPreset)
└── useReconciliationMarkers.ts ← جديد (يحل تكرار toggleReconciliationMark)
```

---

### المرحلة 3: Server-Side Pagination + Caching (أسبوع واحد)

**الهدف:** أداء عالي مع بيانات كبيرة

```typescript
// استراتيجية التحميل
const LOADING_STRATEGY = {
  // صفحات القوائم: Server-side pagination
  lists: {
    pageSize: 50,
    prefetchNextPage: true,   // تحميل الصفحة التالية مسبقاً
    cacheTime: 5 * 60 * 1000, // 5 دقائق cache
    staleTime: 30 * 1000,     // 30 ثانية قبل إعادة التحميل
  },
  
  // الشيتات: Load on open
  sheets: {
    cacheByDocId: true,       // cache حسب ID المستند
    prefetchRelated: true,    // تحميل البيانات المرتبطة
    invalidateOnSave: true,   // إعادة تحميل عند الحفظ
  },
  
  // Dashboard: Background refresh
  dashboard: {
    refreshInterval: 60 * 1000, // كل دقيقة
    showStaleWhileRefresh: true,
  },
};
```

**خيارات التنفيذ:**

| الخيار | الإيجابيات | السلبيات |
|--------|-----------|---------|
| **TanStack Query** | الأفضل للـ caching, auto-refresh, pagination | يحتاج تعلم |
| **SWR** | بسيط وخفيف | أقل مميزات |
| **Custom Hooks** | تحكم كامل | يحتاج بناء من الصفر |

**التوصية:** استخدام **TanStack Query (React Query)** — المعيار الاحترافي العالمي.

---

### المرحلة 4: Optimistic Updates + Real-time (اختياري)

```typescript
// مثال: حفظ قيد مع تحديث متفائل
const mutation = useMutation({
  mutationFn: (entry) => journalEntriesService.create(entry),
  onMutate: async (newEntry) => {
    // إلغاء أي تحديثات جارية
    await queryClient.cancelQueries(['journal-entries']);
    
    // حفظ الحالة السابقة
    const previousEntries = queryClient.getQueryData(['journal-entries']);
    
    // تحديث متفائل — يظهر فوراً
    queryClient.setQueryData(['journal-entries'], (old) => [...old, newEntry]);
    
    return { previousEntries };
  },
  onError: (err, newEntry, context) => {
    // استرجاع عند الخطأ
    queryClient.setQueryData(['journal-entries'], context.previousEntries);
  },
  onSettled: () => {
    // إعادة تحميل من السيرفر
    queryClient.invalidateQueries(['journal-entries']);
  },
});
```

---

## 🗑️ خطة حذف الملفات المُكررة (Cleanup Roadmap)

### الأولوية 1 — حذف آمن (لا يؤثر على المستخدم):
```
DELETE: unified/tabs/JournalFormTab.tsx          (45KB — مُستبدل بـ 4 Tabs متخصصة)
```

### الأولوية 2 — بعد التأكد من الربط الكامل:
```
DELETE: components/NewJournalEntrySheet.tsx      (9KB — مُستبدل بـ UnifiedAccountingSheet)
DELETE: components/JournalEntryForm.tsx          (24KB — مُستبدل بـ JournalVoucherTab)
DELETE: components/JournalEntryGrid.tsx          (16KB — مُستبدل بـ NexaDataTable)
DELETE: components/QuickReceiptDialog.tsx        (16KB — مُستبدل)
DELETE: components/QuickPaymentDialog.tsx        (19KB — مُستبدل)
```

### الأولوية 3 — بعد ترحيل الصفحات إلى Unified:
```
MERGE:  Receipts.tsx + Payments.tsx + CashJournal.tsx 
  INTO: JournalEntries.tsx (مع فلتر حسب entry_type)
  
DELETE: components/CashJournalForm.tsx           (60KB)
DELETE: components/FundTransferDialog.tsx         (16KB)
DELETE: components/FundTransferContent.tsx        (15KB)
DELETE: components/CurrencyExchangeDialog.tsx     (21KB)
DELETE: components/CurrencyExchangeContent.tsx    (19KB)
```

### الأولوية 4 — الملفات العملاقة:
```
REFACTOR: AccountDetailsSheet.tsx  (164KB → UnifiedAccountingSheet)
REFACTOR: AccountDetailsSheetV2.tsx (44KB  → حذف)
REFACTOR: FundTransactionSheet.tsx  (51KB  → UnifiedAccountingSheet)
```

---

## 📦 استخراج المكونات المشتركة (Shared Utilities)

### ملف جديد: `src/features/accounting/utils/constants.ts`
```typescript
// استخراج الثوابت المُكررة
export const CURRENCY_INFO = { SAR: {...}, USD: {...}, ... };
export const RECONCILIATION_COLORS = [...];
export const ENTRY_TYPE_BADGE_COLORS = {...};
export const ACCOUNT_TYPES = [...];
export const ACCOUNT_STATUSES = [...];
```

### ملف جديد: `src/features/accounting/hooks/useDatePresets.ts`
```typescript
// استخراج getDateRangeFromPreset المُكرر 5 مرات
export function useDatePresets() {
  const getDateRange = (preset: string): DateRange | undefined => {...};
  const handlePresetChange = (preset: string) => {...};
  return { getDateRange, handlePresetChange, presets: [...] };
}
```

### ملف جديد: `src/features/accounting/hooks/useFilters.ts`
```typescript
// FilterState + SortConfig + reset + handlers
export function useAccountingFilters(defaultFilters?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({...defaults});
  const [sort, setSort] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const resetFilters = () => {...};
  const handleSort = (key: string) => {...};
  return { filters, setFilters, sort, handleSort, resetFilters };
}
```

### ملف جديد: `src/features/accounting/hooks/useReconciliation.ts`
```typescript
// toggleReconciliationMark + getReconciliationBg المُكرر 7 مرات
export function useReconciliation() {
  const [markers, setMarkers] = useState<Map<string, string>>(new Map());
  const toggleMark = (entryId: string) => {...};
  const getBackground = (entryId: string) => {...};
  return { markers, toggleMark, getBackground };
}
```

---

## 🎯 ملخص التوصيات

| # | الإجراء | الأولوية | التأثير | الجهد |
|---|--------|---------|--------|-------|
| 1 | حذف `JournalFormTab.tsx` (deprecated) | 🔴 فوري | عالي | 15 دقيقة |
| 2 | استخراج `currencyInfo` إلى ملف مشترك | 🔴 فوري | متوسط | 30 دقيقة |
| 3 | استخراج `useDatePresets` hook | 🟡 قريب | متوسط | 1 ساعة |
| 4 | استخراج `useFilters` + `useReconciliation` | 🟡 قريب | عالي | 2 ساعة |
| 5 | حذف Quick Dialogs القديمة | 🟡 قريب | عالي | 1 ساعة |
| 6 | دمج Receipts+Payments+CashJournal | 🟡 متوسط | **ضخم** | 1 يوم |
| 7 | تفكيك AccountDetailsSheet (164KB) | 🔵 لاحق | **ضخم** | 2 يوم |
| 8 | إضافة TanStack Query | 🔵 لاحق | **ثوري** | 3 أيام |
| 9 | Type Safety (إزالة `any`) | 🔵 مستمر | عالي | مستمر |
| 10 | Error Boundaries | 🔵 لاحق | متوسط | 2 ساعة |

---

> **الخلاصة:** الكود الجديد (Unified) ممتاز، لكن الكود القديم (Legacy) يُشكّل **83%** من حجم القسم ويجب ترحيله تدريجياً. أفضل استراتيجية هي:
> 1. **لا تحذف شيء يعمل** — الكود القديم يعمل ولا يسبب مشاكل للمستخدم
> 2. **كل ميزة جديدة تُبنى في Unified** فقط
> 3. **ترحيل صفحة واحدة كل أسبوع** من Legacy إلى Unified

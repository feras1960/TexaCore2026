# Development Guide - ERP System (Supabase)

> ⚠️ **CRITICAL RULES FOR AI AGENTS & DEVELOPERS:**
> 1. **ALL tables MUST use `NexaTable`** - No custom `<Table>` components allowed
> 2. **ALL strings MUST use `t('key')`** - No raw strings in JSX (Zero-String Policy)
> 3. **ALL popups MUST use `UnifiedSheet` (side panels) or `UnifiedModal` (dialogs)**
> 4. **NEVER import from `@/components/ui/dialog` or `@/components/ui/sheet` directly**
> 5. **ALL status badges MUST use `StatusBadge`**
> 6. **ALL stat cards MUST use `StatCard + StatsGrid`**
> 7. **ALL numbers use English numerals (1, 2, 3) in ALL languages**
> 8. **ALL database fields use `snake_case` (Supabase convention)**
> 9. **Translation keys reference file: `src/i18n/locales/en.json`** - Add all keys here FIRST, then translate to other languages

---

## Supported Languages (9 Languages)

| Code | Language | Direction | Native Name | Flag | Shortcut |
|------|----------|-----------|-------------|------|----------|
| `en` | English | LTR | English | 🇬🇧 | Alt+1 |
| `ar` | Arabic | RTL | العربية | 🇸🇦 | Alt+2 |
| `ru` | Russian | LTR | Русский | 🇷🇺 | Alt+3 |
| `uk` | Ukrainian | LTR | Українська | 🇺🇦 | Alt+4 |
| `ro` | Romanian | LTR | Română | 🇷🇴 | Alt+5 |
| `pl` | Polish | LTR | Polski | 🇵🇱 | Alt+6 |
| `tr` | Turkish | LTR | Türkçe | 🇹🇷 | Alt+7 |
| `de` | German | LTR | Deutsch | 🇩🇪 | Alt+8 |
| `it` | Italian | LTR | Italiano | 🇮🇹 | Alt+9 |

**Configuration File:** `src/i18n/config.ts`

### Language Isolation Rule
**CRITICAL**: Each language file must be completely isolated - no foreign words should appear in any language file.

**Translation Files Location:** `src/i18n/locales/`
- `en.json` - **REFERENCE FILE** (add all keys here first)
- `ar.json`, `ru.json`, `uk.json`, `ro.json`, `pl.json`, `tr.json`, `de.json`, `it.json`

### Adding New Translation Keys

**MANDATORY PROCESS:**

1. **Add to `en.json` first** (reference file):
```json
{
  "accounting": {
    "componentLab": "Component Lab",
    "componentLabDescription": "Test and preview all popups and components"
  }
}
```

2. **Then add to ALL other 8 language files** with appropriate translations:
```json
// ar.json
{
  "accounting": {
    "componentLab": "مختبر المكونات",
    "componentLabDescription": "اختبار ومعاينة جميع البوب أبات والمكونات"
  }
}
```

3. **Use in components:**
```tsx
const { t } = useLanguage();
{t('accounting.componentLab')}
```

---

## Database Rules (Supabase)

### Naming Convention
- **ALWAYS use `snake_case`** for all database fields
- **Examples:**
  - ✅ `company_id`, `customer_name`, `invoice_date`, `total_amount`
  - ❌ `companyId`, `customerName`, `invoiceDate`, `totalAmount`

### Table Naming
- Use plural nouns: `accounts`, `companies`, `invoices`, `payments`
- Use descriptive names: `user_profiles`, `journal_entries`

### Column Naming Examples
```sql
-- ✅ CORRECT (Supabase style)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  parent_id UUID,
  is_group BOOLEAN,
  current_balance DECIMAL(18, 2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ❌ WRONG (camelCase)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  companyId UUID,  -- Use company_id
  accountCode VARCHAR(50),  -- Use account_code
);
```

---

## Internationalization (i18n)

### Zero-String Policy

**🚨 MANDATORY TRANSLATION RULE:**

#### ❌ ABSOLUTELY FORBIDDEN:
- Writing any hardcoded text in ANY language inside components
- Using Arabic or English strings directly in JSX
- Even placeholder/test data must use translation keys
- Conditional text like `isRTL ? 'نص عربي' : 'English text'` is FORBIDDEN

#### ✅ THE ONLY CORRECT WAY:
```tsx
// ❌ WRONG - hardcoded text
<Label>رقم المقبوضة</Label>
<Button>حفظ</Button>
{isRTL ? 'معلومات العميل' : 'Customer Information'}

// ✅ CORRECT - translation keys
<Label>{t('accounting.receipt.number')}</Label>
<Button>{t('common.save')}</Button>
{t('accounting.receipt.customerInfo')}
```

#### 📁 MANDATORY STEPS FOR EVERY NEW COMPONENT:
1. **Identify ALL text strings** needed in the component
2. **Add translation keys** to ALL 9 locale files (`src/i18n/locales/*.json`)
3. **Import and use** `const { t } = useLanguage()` in the component
4. **Replace every string** with `t('key')`
5. **NO EXCEPTIONS** - even temporary/debug text uses translation keys

### Translation Key Naming Convention

**Format:** `module.section.field`

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "accounting": {
    "chartOfAccounts": "Chart of Accounts",
    "receipt": {
      "number": "Receipt Number",
      "date": "Receipt Date",
      "customer": "Customer"
    },
    "componentLab": "Component Lab"
  },
  "status": {
    "confirmed": "Confirmed",
    "pending": "Pending"
  }
}
```

### Usage Example
```tsx
import { useLanguage } from '@/app/providers/LanguageProvider';

function MyComponent() {
  const { t, direction, language } = useLanguage();
  
  return (
    <div dir={direction}>
      <h1>{t('accounting.chartOfAccounts')}</h1>
      <Button>{t('common.save')}</Button>
      <StatusBadge status="confirmed" language={language} />
    </div>
  );
}
```

---

## Numeric Engine

### English Numerals Only
- **ALL numbers display as English/International numerals (1, 2, 3) across ALL 9 languages**
- This is enforced through `formatNumber()` and `formatCurrency()` utilities in `src/lib/utils.ts`
- Numbers in database are stored as numeric types (`DECIMAL`, `INTEGER`, etc.)

### Usage
```tsx
import { formatNumber, formatCurrency } from '@/lib/utils';

// Always produces English numerals regardless of language
formatNumber(12345.67);     // "12,345.67"
formatCurrency(1500, 'SAR'); // "SAR 1,500.00"

// In components
<span>{formatNumber(account.current_balance)}</span>
<span>{formatCurrency(5000, account.currency_code)}</span>
```

---

## Component Standards

### Required Components (MUST USE)

| Use Case | Component | Path | Size/Options |
|----------|-----------|------|--------------|
| **Data Tables** | `NexaTable` | `src/components/shared/tables/NexaTable.tsx` | `editable`, `selectable`, `stickyHeader`, `stickyFooter` |
| **Side Panels** | `UnifiedSheet` | `src/components/shared/sheets/UnifiedSheet.tsx` | `size: 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` |
| **Centered Dialogs** | `UnifiedModal` | `src/components/shared/modals/UnifiedModal.tsx` | `size: 'sm' \| 'md' \| 'lg' \| 'xl'` |
| **Status Badges** | `StatusBadge` | `src/components/shared/status/StatusBadge.tsx` | Predefined statuses |
| **Stat Cards** | `StatCard + StatsGrid` | `src/components/shared/stats/StatCard.tsx` | `type: 'positive' \| 'negative' \| 'neutral'` |
| **Main Tabs** | `MainTabsBar` | `src/components/shared/tabs/MainTabsBar.tsx` | `variant: 'underline'` |
| **Dynamic Tabs** | `DynamicTabsBar + useDynamicTabs` | `src/components/shared/tabs/DynamicTabs.tsx` | Hook-based |

### Unified Import (Recommended)
```tsx
import {
  NexaTable,
  UnifiedSheet,
  UnifiedModal,
  StatusBadge,
  StatCard,
  StatsGrid,
  MainTabsBar,
  DynamicTabsBar,
  useDynamicTabs,
  ActionButtonsBar,
  QuickActionsBar,
} from '@/components/shared';
```

### 🚨 MANDATORY TABLE RULE (Zero-Custom-Table Policy)

**ALL data tables in this project MUST use `NexaTable` component.**

```tsx
// ✅ CORRECT - Always use NexaTable
import { NexaTable } from "@/components/shared";

<NexaTable
  data={myData}
  columns={myColumns}
  onRowClick={handleRowClick}
  editable={true}
  selectable={true}
/>

// ❌ FORBIDDEN - Never create custom tables
import { Table, TableHeader, TableBody } from "@/components/ui/table";
<Table>...</Table>  // REJECTED - Use NexaTable instead!
```

**Why this matters:**
1. **Consistency**: All tables look and behave the same across the entire ERP system
2. **Maintainability**: Changes to `NexaTable` automatically apply everywhere
3. **Features**: Built-in sorting, filtering, export, RTL support, dark mode
4. **Performance**: Optimized for large datasets

### 🚨 MANDATORY POPUP RULE (Zero-Custom-Popup Policy)

**ALL popups, dialogs, and side panels MUST use unified components.**

```tsx
// ✅ CORRECT - Side Panel
import { UnifiedSheet } from "@/components/shared";

<UnifiedSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="lg"  // sm | md | lg | xl | full
  icon={Building2}
  title={t('accounting.accountDetails')}
  subtitle="ACC-001"
  mainTabs={DEFAULT_MAIN_TABS}
>
  {/* Content */}
</UnifiedSheet>

// ✅ CORRECT - Centered Dialog
import { UnifiedModal } from "@/components/shared";

<UnifiedModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title={t('common.confirm')}
  size="md"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>
  {/* Content */}
</UnifiedModal>

// ❌ FORBIDDEN - Never use raw Dialog/Sheet directly
import { Dialog, DialogContent } from "@/components/ui/dialog";
<Dialog><DialogContent>...</DialogContent></Dialog>  // REJECTED!
```

**When to use which:**
| Scenario | Use Component | Size |
|----------|---------------|------|
| Account/Product/Document details | `UnifiedSheet` | `lg` or `xl` |
| Multi-tab detailed view | `UnifiedSheet` | `xl` or `full` |
| Quick confirmation ("Delete?") | `UnifiedModal` | `sm` or `md` |
| Form entry (Add/Edit) | `UnifiedModal` | `md` or `lg` |

---

## NexaTable Standards

### Basic Usage
```tsx
import { NexaTable, Column } from '@/components/shared';

const columns: Column<Account>[] = [
  {
    key: 'code',
    title: 'accounting.account.code',
    sortable: true,
    filterable: true,
  },
  {
    key: 'name',
    title: 'accounting.account.name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'current_balance',
    title: 'accounting.account.balance',
    align: 'end',
    sortable: true,
    footer: 'sum',
    render: (_value, row) => (
      <span className={cn(
        'font-medium',
        row.current_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
      )}>
        {row.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
];

<NexaTable
  data={accounts}
  columns={columns}
  onRowClick={(account) => handleAccountClick(account)}
  selectable={true}
  stickyHeader={true}
  stickyFooter={true}
  emptyMessage={t('accounting.noAccounts')}
/>
```

### Column Configuration
```tsx
interface Column<T> {
  key: keyof T | string;
  title: string;              // Translation key (e.g., 'accounting.account.code')
  width?: string;             // CSS width (e.g., '120px', '20%')
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;         // Enable sorting
  filterable?: boolean;       // Enable filtering
  editable?: boolean;         // Enable editing (requires editable={true} on NexaTable)
  inputType?: 'text' | 'number' | 'select' | 'date';
  selectOptions?: { value: string; label: string }[];
  render?: (value: any, row: T, index: number) => React.ReactNode;
  footer?: 'sum' | 'average' | 'count' | ((data: T[]) => React.ReactNode);
}
```

### Header Styling
- **Background**: `bg-erp-navy dark:bg-slate-900`
- **Text**: `text-xs font-semibold text-white/90 uppercase tracking-wider`
- **Borders**: `border-e border-white/10` between columns

### Footer (Totals)
```tsx
{
  key: 'amount',
  title: 'accounting.amount',
  footer: 'sum',  // Auto-calculate sum
  // OR
  footer: (data) => {
    const total = data.reduce((sum, row) => sum + row.amount, 0);
    return <span className="font-bold">{formatCurrency(total)}</span>;
  },
}
```

---

## UnifiedSheet Standards (Side Panel)

### Component Location
`src/components/shared/sheets/UnifiedSheet.tsx`

### Size & Position
| Size | Width | Use Case |
|------|-------|----------|
| `sm` | 400px | Simple details |
| `md` | 500px | Forms |
| `lg` | 60% | Standard details (default) |
| `xl` | 75% | Complex multi-tab views |
| `full` | 90% | Full-width dashboards |

**Side:** Automatically adjusts based on `direction` (RTL → `left`, LTR → `right`)

### Main Tabs (7 Standard Tabs)
```tsx
import { DEFAULT_MAIN_TABS } from '@/components/shared';

// Standard tabs:
const tabs = DEFAULT_MAIN_TABS; // or subset
// [
//   { id: 'overview', labelKey: 'tabs.overview', icon: Eye },
//   { id: 'ledger', labelKey: 'tabs.ledger', icon: Book },
//   { id: 'invoices', labelKey: 'tabs.invoices', icon: Receipt },
//   { id: 'payments', labelKey: 'tabs.payments', icon: DollarSign },
//   { id: 'reservations', labelKey: 'tabs.reservations', icon: Calendar },
//   { id: 'ai-analysis', labelKey: 'tabs.aiAnalysis', icon: Brain },
//   { id: 'events', labelKey: 'tabs.events', icon: Activity },
// ]
```

### Complete Usage Example
```tsx
import { UnifiedSheet, DEFAULT_MAIN_TABS, SectionCard, InfoRow } from '@/components/shared';
import { Building2 } from 'lucide-react';

<UnifiedSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="lg"
  icon={Building2}
  title={t('accounting.accountDetails')}
  subtitle="ACC-2024-001"
  badge={{
    text: t('common.active'),
    colorClass: 'bg-green-100 text-green-700 border-green-200'
  }}
  balance={{
    value: 26500,
    labelKey: 'accounting.currentBalance',
    currencyKey: 'mockData.currencies.SAR'
  }}
  mainTabs={DEFAULT_MAIN_TABS.slice(0, 5)}
  activeMainTab={activeTab}
  onMainTabChange={setActiveTab}
  stats={[
    {
      labelKey: 'accounting.labels.debitTotal',
      value: 125000,
      colorClass: 'bg-green-50 dark:bg-green-900/20',
      valueColorClass: 'text-green-600'
    },
    // ... more stats
  ]}
  onEdit={() => handleEdit()}
>
  {activeTab === 'overview' && (
    <SectionCard title={t('accounting.accountInfo')}>
      <InfoRow label={t('accounting.account.code')} value="ACC-001" />
      <InfoRow label={t('accounting.account.type')} value={<Badge>Asset</Badge>} />
    </SectionCard>
  )}
</UnifiedSheet>
```

---

## UnifiedModal Standards (Centered Dialog)

### Component Location
`src/components/shared/modals/UnifiedModal.tsx`

### Sizes
| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 384px | Simple confirmations |
| `md` | 448px | Standard forms (default) |
| `lg` | 512px | Complex forms |
| `xl` | 576px | Large forms |

### Usage Example
```tsx
import { UnifiedModal } from '@/components/shared';
import { Trash2 } from 'lucide-react';

<UnifiedModal
  isOpen={isDeleteOpen}
  onClose={() => setIsDeleteOpen(false)}
  title={t('accounting.deleteAccount')}
  description={t('accounting.deleteAccountWarning')}
  icon={Trash2}
  iconColor="from-red-600 to-rose-600"
  size="md"
  onConfirm={handleDelete}
  onCancel={() => setIsDeleteOpen(false)}
  confirmLabel={t('common.delete')}
  cancelLabel={t('common.cancel')}
  confirmVariant="destructive"
  isValid={true}
>
  <p>{t('accounting.deleteAccountConfirm')}</p>
</UnifiedModal>
```

---

## StatusBadge Standards

### Available Statuses
```tsx
type StatusType =
  | 'draft'       // مسودة - gray
  | 'pending'     // معلق - yellow
  | 'in_progress' // قيد التنفيذ - blue
  | 'confirmed'   // مؤكد - green
  | 'completed'   // مكتمل - green
  | 'partial'     // جزئي - blue
  | 'paid'        // مدفوع - green
  | 'cancelled'   // ملغي - red
  | 'rejected';   // مرفوض - red
```

### Usage
```tsx
import { StatusBadge } from '@/components/shared';

<StatusBadge status="confirmed" language={language} />
<StatusBadge status="pending" showIcon={false} size="sm" />
```

**No custom styling needed** - all status colors are predefined in `StatusBadge` component.

---

## StatCard Standards

### Types
```tsx
type StatType = 'positive' | 'negative' | 'neutral' | 'info' | 'warning';
```

### Usage
```tsx
import { StatCard, StatsGrid } from '@/components/shared';

<StatsGrid cols={4}>
  <StatCard
    label={t('accounting.labels.debitTotal')}
    value={15000}
    type="positive"
    suffix="ر.س"
    change={5.2}
  />
  <StatCard
    label={t('accounting.labels.creditTotal')}
    value={12000}
    type="negative"
    suffix="ر.س"
  />
</StatsGrid>
```

---

## RTL/LTR Guidelines

### CSS Logical Properties
**ALWAYS** use logical properties instead of physical:

| ❌ Physical | ✅ Logical |
|-------------|-----------|
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `left-*` / `right-*` | `start-*` / `end-*` |
| `border-l-*` / `border-r-*` | `border-s-*` / `border-e-*` |

### Direction Attribute
```tsx
import { useLanguage } from '@/app/providers/LanguageProvider';

function MyComponent() {
  const { direction } = useLanguage();
  
  return (
    <div dir={direction}>
      {children}
    </div>
  );
}
```

**NexaTable automatically uses `dir={direction}`** - no need to set it manually.

---

## Color Palette

### ERP Theme Colors
- **erp-navy**: `#0A2540` - Primary structural color (headers, sidebars)
- **erp-teal**: `#00D4AA` - Accent for interactive elements, CTAs
- **erp-cream**: `#FAF9F6` - Warm background color

### Semantic Colors
| Purpose | Light | Dark |
|---------|-------|------|
| Success/Debit | `emerald-400` / `emerald-600` | `emerald-600` / `emerald-400` |
| Danger/Credit | `rose-400` / `rose-600` | `rose-600` / `rose-400` |
| Balance (Debit) | `blue-400` / `blue-600` | `blue-600` / `blue-400` |
| Warning | `amber-400` / `amber-600` | `amber-600` / `amber-400` |
| Info | `sky-400` / `sky-600` | `sky-600` / `sky-400` |

---

## Typography System

### Arabic Context
- **Headings**: `font-cairo` (weights 700–900) - `text-2xl`, `text-xl`
- **Body/Tables**: `font-tajawal` (weights 400–600) - `text-sm`, `text-base`
- **Monospace/Data**: `font-mono` (JetBrains Mono) - for codes, numbers

### Latin Scripts
- **Headings**: `font-cairo` or `font-space-grotesk` (weights 600–700)
- **Body/Tables**: `font-ibm-plex` (weights 400–500)
- **Monospace/Data**: `font-mono` (JetBrains Mono)

### Font Usage
```tsx
// Headings
<h1 className="text-2xl font-bold font-cairo text-erp-navy dark:text-white">
  {t('accounting.chartOfAccounts')}
</h1>

// Body text
<p className="text-sm font-tajawal text-gray-600 dark:text-gray-400">
  {t('accounting.description')}
</p>

// Monospace (codes, numbers)
<span className="font-mono text-xs">{account.code}</span>
```

---

## File Structure

```
src/
├── app/
│   └── providers/
│       ├── LanguageProvider.tsx    # i18n provider (9 languages)
│       ├── ThemeProvider.tsx       # Dark/light mode
│       └── index.tsx
├── components/
│   ├── common/                     # Common components (ErrorBoundary, Logo)
│   ├── layout/                     # Layout components (Header, Sidebar, MainLayout)
│   ├── shared/                     # ⭐ SHARED COMPONENTS (MUST USE)
│   │   ├── actions/
│   │   │   ├── ActionButtonsBar.tsx
│   │   │   └── QuickActionsBar.tsx
│   │   ├── modals/
│   │   │   └── UnifiedModal.tsx    # ⭐ Centered dialogs
│   │   ├── sheets/
│   │   │   └── UnifiedSheet.tsx    # ⭐ Side panels
│   │   ├── stats/
│   │   │   └── StatCard.tsx
│   │   ├── status/
│   │   │   └── StatusBadge.tsx
│   │   ├── tables/
│   │   │   └── NexaTable.tsx       # ⭐ ALL tables MUST use this
│   │   ├── tabs/
│   │   │   ├── MainTabsBar.tsx
│   │   │   └── DynamicTabs.tsx
│   │   └── index.ts                # Unified export
│   └── ui/                         # Base UI components (from shadcn/ui)
├── features/                       # Feature modules
│   ├── accounting/
│   │   ├── Accounting.tsx          # Main accounting page with tabs
│   │   ├── ChartOfAccounts/
│   │   └── components/             # Accounting-specific components (planned)
│   ├── auth/
│   └── dashboard/
├── hooks/                          # Custom React hooks
│   ├── useAccounts.ts
│   ├── useAuth.ts
│   └── useLanguageShortcuts.ts
├── i18n/                           # ⭐ INTERNATIONALIZATION
│   ├── config.ts                   # Language configuration (9 languages)
│   └── locales/                    # Translation files (9 files)
│       ├── en.json                 # ⭐ REFERENCE FILE (add keys here first)
│       ├── ar.json
│       ├── ru.json
│       ├── uk.json
│       ├── ro.json
│       ├── pl.json
│       ├── tr.json
│       ├── de.json
│       └── it.json
├── lib/
│   ├── supabase.ts                 # Supabase client
│   └── utils.ts                    # Utilities (formatNumber, formatCurrency, etc.)
├── services/                       # Service layer (Supabase queries)
│   ├── accountsService.ts          # Accounts CRUD (uses snake_case)
│   ├── companiesService.ts
│   └── index.ts
├── styles/
│   └── globals.css                 # Global styles
└── types/
    ├── index.ts                    # TypeScript types
    └── supabase.ts                 # Auto-generated Supabase types
```

---

## Component Lab (مختبر المكونات)

### Purpose
**Component Lab** is a dedicated section in the accounting module to:
1. **Test and preview** all popups and components
2. **Document** all available popups with their purpose and location
3. **Unify styling** - ensure all popups have consistent size and style

### Location
- **Feature:** `src/features/accounting/ComponentLab/ComponentLab.tsx`
- **Route:** `/accounting/component-lab` or as a tab in accounting module
- **Translation Key:** `accounting.componentLab`

### Registry Table (NexaTable)
The Component Lab displays a **NexaTable** with all available popups:

| Component Name (EN/AR) | Type | Purpose | Location | Status | Action |
|------------------------|------|---------|----------|--------|--------|
| Account Details Sheet | Sheet | Display account details | `src/components/shared/sheets/UnifiedSheet.tsx` | ✅ Ready | [Open] |
| Delete Account Modal | Modal | Confirm account deletion | `src/components/shared/modals/UnifiedModal.tsx` | ✅ Ready | [Open] |
| ... | ... | ... | ... | ... | ... |

### Adding New Popup to Registry

1. **Add translation keys** to all 9 locale files:
```json
// en.json
{
  "accounting": {
    "componentLab": {
      "title": "Component Lab",
      "description": "Test and preview all popups and components",
      "popups": {
        "accountDetailsSheet": {
          "name": "Account Details Sheet",
          "description": "Display detailed account information",
          "type": "Sheet",
          "status": "Ready"
        }
      }
    }
  }
}
```

2. **Add entry to Component Lab**:
```tsx
const POPUPS_REGISTRY = [
  {
    id: 'account-details-sheet',
    nameKey: 'accounting.componentLab.popups.accountDetailsSheet.name',
    descriptionKey: 'accounting.componentLab.popups.accountDetailsSheet.description',
    type: 'sheet',
    status: 'ready',
    component: AccountDetailsSheetExample,
  },
];
```

---

## Self-Correction Protocol

Before starting any new task, explicitly state:
**"Reference Checked: ERP Development Standards Applied"**

### Verification Checklist:
1. ✅ `snake_case` data keys (Supabase convention)
2. ✅ `t('key')` for ALL strings (Zero-String Policy)
3. ✅ Component reuse rules (NexaTable, UnifiedSheet, UnifiedModal)
4. ✅ English numerals in ALL languages (1, 2, 3)
5. ✅ Language isolation (no foreign words in language files)
6. ✅ RTL/LTR logical properties (text-start, ps-*, ms-*, etc.)
7. ✅ Translation keys added to ALL 9 locale files
8. ✅ `en.json` used as reference file (add keys there first)

---

## Quick Reference

### Translation Key Reference File
**`src/i18n/locales/en.json`** - Always add new keys here FIRST, then translate to other 8 languages.

### Language Provider
```tsx
import { useLanguage } from '@/app/providers/LanguageProvider';

const { t, direction, language, isRTL } = useLanguage();
```

### Supabase Service Pattern
```tsx
// Service layer (src/services/)
export const myService = {
  async getAll(companyId: string) {
    const { data, error } = await supabase
      .from('table_name')  // snake_case
      .select('*')
      .eq('company_id', companyId);  // snake_case
    return data;
  },
};
```

### Component Import Pattern
```tsx
// ✅ ALWAYS import from shared
import { NexaTable, UnifiedSheet, UnifiedModal } from '@/components/shared';

// ❌ NEVER import from ui directly
// import { Dialog } from '@/components/ui/dialog';  // FORBIDDEN!
```

---

## Summary

This guide ensures:
- ✅ **Consistency** across all components and features
- ✅ **Maintainability** through shared components
- ✅ **Internationalization** with 9 languages support
- ✅ **Supabase compatibility** with snake_case naming
- ✅ **Zero-String Policy** - all text uses translation keys
- ✅ **Unified UX** - same look and feel everywhere

**For any questions or clarifications, refer to this guide as the single source of truth.**

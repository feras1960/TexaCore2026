# 💼 وحدة المحاسبة API
# Accounting Module API

---

## 📋 نظرة عامة

وحدة المحاسبة تشمل:
- دليل الحسابات (Chart of Accounts)
- القيود اليومية (Journal Entries)
- السنوات المالية (Fiscal Years)
- الفترات المحاسبية (Accounting Periods)
- مراكز التكلفة (Cost Centers)
- الموازنات (Budgets)

---

## 1️⃣ دليل الحسابات (Chart of Accounts)

### الجدول: `chart_of_accounts`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| account_code | varchar | رمز الحساب |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| account_type_id | uuid | نوع الحساب |
| parent_id | uuid | الحساب الأب |
| is_group | boolean | هل هو مجموعة |
| level | integer | المستوى |
| currency | varchar | العملة |
| is_active | boolean | نشط |
| is_system | boolean | حساب نظام |

### 📖 GET - جلب كل الحسابات

```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select(`
    *,
    account_type:account_types(id, code, name_ar),
    parent:chart_of_accounts!parent_id(id, account_code, name_ar)
  `)
  .eq('company_id', companyId)
  .order('account_code');
```

#### Response

```json
[
  {
    "id": "acc-uuid-1",
    "account_code": "1",
    "name_ar": "الأصول",
    "name_en": "Assets",
    "is_group": true,
    "level": 1,
    "account_type": {
      "id": "type-uuid",
      "code": "asset",
      "name_ar": "أصول"
    },
    "parent": null
  },
  {
    "id": "acc-uuid-2",
    "account_code": "1100",
    "name_ar": "النقدية والبنوك",
    "name_en": "Cash & Banks",
    "is_group": true,
    "level": 2,
    "parent": {
      "id": "acc-uuid-1",
      "account_code": "1",
      "name_ar": "الأصول"
    }
  }
]
```

### 📝 POST - إنشاء حساب جديد

```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .insert({
    company_id: companyId,
    account_code: '1101',
    name_ar: 'صندوق نقدي رئيسي',
    name_en: 'Main Cash',
    account_type_id: 'asset-type-uuid',
    parent_id: 'parent-uuid',
    is_group: false,
    level: 3,
    currency: 'SAR'
  })
  .select()
  .single();
```

#### Request Body

```json
{
  "company_id": "c-uuid",
  "account_code": "1101",
  "name_ar": "صندوق نقدي رئيسي",
  "name_en": "Main Cash",
  "account_type_id": "asset-type-uuid",
  "parent_id": "parent-account-uuid",
  "is_group": false,
  "level": 3,
  "currency": "SAR"
}
```

### ✏️ PUT - تحديث حساب

```typescript
const { data, error } = await supabase
  .from('chart_of_accounts')
  .update({
    name_ar: 'صندوق نقدي فرعي',
    name_en: 'Secondary Cash'
  })
  .eq('id', accountId)
  .select()
  .single();
```

### 🗑️ DELETE - حذف حساب

```typescript
// لا يمكن حذف حساب له حركات أو أبناء
const { error } = await supabase
  .from('chart_of_accounts')
  .delete()
  .eq('id', accountId);
```

---

## 2️⃣ القيود اليومية (Journal Entries)

### الجدول: `journal_entries`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| entry_number | varchar | رقم القيد |
| entry_date | date | تاريخ القيد |
| description | text | الوصف |
| total_debit | decimal | إجمالي المدين |
| total_credit | decimal | إجمالي الدائن |
| status | varchar | الحالة (draft/posted/cancelled) |
| is_posted | boolean | مرحّل |
| posted_at | timestamp | تاريخ الترحيل |
| posted_by | uuid | مُرحّل بواسطة |

### الجدول: `journal_entry_lines`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| entry_id | uuid | معرف القيد |
| line_number | integer | رقم السطر |
| account_id | uuid | معرف الحساب |
| debit | decimal | مدين |
| credit | decimal | دائن |
| description | text | ملاحظة |
| cost_center_id | uuid | مركز التكلفة |

### 📖 GET - جلب القيود

```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .select(`
    *,
    lines:journal_entry_lines(
      *,
      account:chart_of_accounts(id, account_code, name_ar)
    ),
    posted_by_user:user_profiles!posted_by(full_name)
  `)
  .eq('company_id', companyId)
  .order('entry_date', { ascending: false });
```

#### مع فلاتر

```typescript
// فلترة بالتاريخ والحالة
const { data } = await supabase
  .from('journal_entries')
  .select('*')
  .eq('company_id', companyId)
  .eq('status', 'posted')
  .gte('entry_date', '2026-01-01')
  .lte('entry_date', '2026-12-31');
```

### 📖 GET - قيد واحد بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .select(`
    *,
    lines:journal_entry_lines(
      *,
      account:chart_of_accounts(
        id, 
        account_code, 
        name_ar,
        account_type:account_types(code, name_ar)
      ),
      cost_center:cost_centers(id, name_ar)
    )
  `)
  .eq('id', entryId)
  .single();
```

#### Response

```json
{
  "id": "entry-uuid",
  "entry_number": "JE-2026-0001",
  "entry_date": "2026-02-05",
  "description": "قيد صرف رواتب",
  "total_debit": 50000,
  "total_credit": 50000,
  "status": "posted",
  "is_posted": true,
  "lines": [
    {
      "id": "line-uuid-1",
      "line_number": 1,
      "debit": 50000,
      "credit": 0,
      "account": {
        "id": "acc-uuid",
        "account_code": "5100",
        "name_ar": "مصروف الرواتب"
      }
    },
    {
      "id": "line-uuid-2",
      "line_number": 2,
      "debit": 0,
      "credit": 50000,
      "account": {
        "id": "acc-uuid-2",
        "account_code": "1101",
        "name_ar": "الصندوق"
      }
    }
  ]
}
```

### 📝 POST - إنشاء قيد جديد

```typescript
// باستخدام transaction لضمان التناسق
const createJournalEntry = async (
  companyId: string,
  entry: CreateJournalEntryInput
) => {
  // 1. إنشاء القيد الرئيسي
  const { data: journalEntry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      company_id: companyId,
      entry_date: entry.entry_date,
      description: entry.description,
      total_debit: entry.lines.reduce((sum, l) => sum + l.debit, 0),
      total_credit: entry.lines.reduce((sum, l) => sum + l.credit, 0),
      status: 'draft'
    })
    .select()
    .single();

  if (entryError) throw entryError;

  // 2. إنشاء البنود
  const lines = entry.lines.map((line, index) => ({
    entry_id: journalEntry.id,
    line_number: index + 1,
    account_id: line.account_id,
    debit: line.debit,
    credit: line.credit,
    description: line.description,
    cost_center_id: line.cost_center_id
  }));

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lines);

  if (linesError) throw linesError;

  return journalEntry;
};
```

#### Request Body

```json
{
  "company_id": "c-uuid",
  "entry_date": "2026-02-05",
  "description": "قيد صرف رواتب شهر يناير",
  "lines": [
    {
      "account_id": "expense-account-uuid",
      "debit": 50000,
      "credit": 0,
      "description": "مصروف الرواتب"
    },
    {
      "account_id": "cash-account-uuid",
      "debit": 0,
      "credit": 50000,
      "description": "صرف من الصندوق"
    }
  ]
}
```

### ✏️ PUT - ترحيل القيد

```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .update({
    status: 'posted',
    is_posted: true,
    posted_at: new Date().toISOString(),
    posted_by: userId
  })
  .eq('id', entryId)
  .eq('status', 'draft')  // فقط المسودات
  .select()
  .single();
```

### ✏️ PUT - إلغاء الترحيل

```typescript
// فقط للمستخدمين المصرح لهم
const { data, error } = await supabase
  .from('journal_entries')
  .update({
    status: 'draft',
    is_posted: false,
    posted_at: null,
    posted_by: null
  })
  .eq('id', entryId)
  .eq('status', 'posted')
  .select()
  .single();
```

---

## 3️⃣ السنوات المالية (Fiscal Years)

### الجدول: `fiscal_years`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| name | varchar | الاسم |
| start_date | date | تاريخ البداية |
| end_date | date | تاريخ النهاية |
| is_closed | boolean | مقفلة |
| is_current | boolean | السنة الحالية |

### 📖 GET - جلب السنوات المالية

```typescript
const { data, error } = await supabase
  .from('fiscal_years')
  .select('*')
  .eq('company_id', companyId)
  .order('start_date', { ascending: false });
```

### 📝 POST - إنشاء سنة مالية

```typescript
const { data, error } = await supabase
  .from('fiscal_years')
  .insert({
    company_id: companyId,
    name: '2026',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_current: true
  })
  .select()
  .single();
```

### ✏️ PUT - إقفال السنة المالية

```typescript
const { data, error } = await supabase
  .from('fiscal_years')
  .update({ is_closed: true })
  .eq('id', fiscalYearId)
  .select()
  .single();
```

---

## 4️⃣ الفترات المحاسبية (Accounting Periods)

### الجدول: `accounting_periods`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| fiscal_year_id | uuid | السنة المالية |
| name | varchar | الاسم |
| period_number | integer | رقم الفترة |
| start_date | date | تاريخ البداية |
| end_date | date | تاريخ النهاية |
| is_closed | boolean | مقفلة |

### 📖 GET - جلب الفترات

```typescript
const { data, error } = await supabase
  .from('accounting_periods')
  .select(`
    *,
    fiscal_year:fiscal_years(id, name)
  `)
  .eq('company_id', companyId)
  .eq('fiscal_year_id', fiscalYearId)
  .order('period_number');
```

---

## 5️⃣ مراكز التكلفة (Cost Centers)

### الجدول: `cost_centers`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| parent_id | uuid | المركز الأب |
| is_active | boolean | نشط |

### 📖 GET - جلب مراكز التكلفة

```typescript
const { data, error } = await supabase
  .from('cost_centers')
  .select(`
    *,
    parent:cost_centers!parent_id(id, code, name_ar)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('code');
```

### 📝 POST - إنشاء مركز تكلفة

```typescript
const { data, error } = await supabase
  .from('cost_centers')
  .insert({
    company_id: companyId,
    code: 'CC001',
    name_ar: 'قسم المبيعات',
    name_en: 'Sales Department'
  })
  .select()
  .single();
```

---

## 6️⃣ الموازنات (Budgets)

### الجدول: `budgets`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| fiscal_year_id | uuid | السنة المالية |
| name | varchar | الاسم |
| total_amount | decimal | إجمالي الموازنة |
| status | varchar | الحالة |

### الجدول: `budget_lines`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| budget_id | uuid | معرف الموازنة |
| account_id | uuid | معرف الحساب |
| amount | decimal | المبلغ |
| actual_amount | decimal | الفعلي |

### 📖 GET - جلب الموازنات

```typescript
const { data, error } = await supabase
  .from('budgets')
  .select(`
    *,
    fiscal_year:fiscal_years(name),
    lines:budget_lines(
      *,
      account:chart_of_accounts(account_code, name_ar)
    )
  `)
  .eq('company_id', companyId);
```

---

## 🔢 أنواع الحسابات

### الجدول: `account_types`

```typescript
const { data: accountTypes } = await supabase
  .from('account_types')
  .select('*')
  .order('display_order');
```

### الأنواع الأساسية

| Code | الاسم | نوع الرصيد |
|------|-------|-----------|
| asset | أصول | مدين |
| liability | خصوم | دائن |
| equity | حقوق الملكية | دائن |
| revenue | إيرادات | دائن |
| expense | مصروفات | مدين |

---

## ⚠️ قواعد الأعمال

### 1. القيود يجب أن تكون متوازنة

```typescript
// التحقق قبل الحفظ
const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

if (totalDebit !== totalCredit) {
  throw new Error('القيد غير متوازن');
}
```

### 2. لا يمكن تعديل قيد مُرحّل

```typescript
// التحقق من الحالة
const { data } = await supabase
  .from('journal_entries')
  .select('status')
  .eq('id', entryId)
  .single();

if (data.status === 'posted') {
  throw new Error('لا يمكن تعديل قيد مُرحّل');
}
```

### 3. لا يمكن الترحيل في فترة مقفلة

```typescript
// التحقق من الفترة
const { data: period } = await supabase
  .from('accounting_periods')
  .select('is_closed')
  .lte('start_date', entryDate)
  .gte('end_date', entryDate)
  .single();

if (period?.is_closed) {
  throw new Error('الفترة المحاسبية مقفلة');
}
```

---

**التالي:** [customers-suppliers.md](./customers-suppliers.md) - العملاء والموردين

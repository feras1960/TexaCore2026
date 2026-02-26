# 📋 توثيق جلسة العمل — 21 فبراير 2026
**الوقت:** 02:04 → 02:51 UTC  
**الملفات:** `ContainerExpensesTab.tsx` · `useSheetActions.ts` · `ActionToolbar.tsx` · DB Migrations

---

## 🎯 الهدف الرئيسي

تطوير منطق إقفال الكونتينر ليعكس الواقع المحاسبي الصحيح:
- قيد إقفال حقيقي عند إغلاق الكونتينر (Dr. مخزون / Cr. كونتينر)
- State Machine واضح (مفتوح → موزّع → مغلق)
- أسماء حسابات حقيقية من DB (لا نصوص ثابتة)
- مصدر مركزي للحسابات الافتراضية

---

## ✅ ما تم إنجازه

### 1️⃣ State Machine للكونتينر في الواجهة

**الملف:** `ContainerExpensesTab.tsx`

أُضيف شريط تقدم مرئي بـ 3 مراحل:

```
[● ١·إضافة المصاريف] → [● ٢·توزيع+تثبيت] → [● ٣·إغلاق الكونتينر]
```

| الحالة | `is_cost_finalized` | `isClosed` | الأزرار الظاهرة |
|--------|---------------------|------------|-----------------|
| مفتوح | false | false | [احسب] + [توزيع وتثبيت 🔒] |
| مثبّت | true | false | Badge "موزّع ومثبّت" + رسالة قفل |
| مغلق | true | true | Badge "مغلق ومرحّل" + رقم القيد |

**القيم المستخدمة:**
```typescript
const isFinalized = data?.is_cost_finalized === true;
const isClosed = (data?.status === 'closed' || data?.status === 'received');
```

---

### 2️⃣ قفل زر إضافة المصاريف

```
حالة مفتوحة  → [+ مصروف فعلي]  (أخضر)
حالة مثبّتة  → 🔒 مقفول         (لا إضافة)
حالة مغلقة   → [+ مصروف لاحق ↔ تسوية]  (برتقالي)
```

---

### 3️⃣ إخفاء زر `actions.confirm` للكونتينر المغلق

**الملف:** `ActionToolbar.tsx` — السطر 314

```tsx
// قبل:
status !== 'received'
// بعد:
status !== 'received' && status !== 'closed'
```

---

### 4️⃣ إنشاء القيد المحاسبي عند إغلاق الكونتينر

**الملف:** `useSheetActions.ts` — case `close_container`

**قبل:** كان يُغيّر status فقط بدون أي قيد.

**بعد:** يُنشئ قيداً كاملاً:

```
Dr. 1141 بضاعة جاهزة          +X,XXX.XX
Cr. 11432 كونتينر MSKU9988776  -X,XXX.XX
─────────────────────────────────────────
رصيد الكونتينر بعد الإقفال: 0.00 ✅
```

**خطوات الكود:**
1. جلب بيانات الكونتينر (`container_account_id`, `company_id`)
2. جلب رصيد حساب الكونتينر من `chart_of_accounts` (`current_balance`)
3. جلب `inventory_account_id` من `companies.accounting_settings.default_accounts`
4. Fallback: بحث في CoA إذا لم يوجد في الإعدادات
5. جلب اسم ورقم كل حساب من CoA
6. إنشاء القيد في `journal_entries`
7. إنشاء سطرين في `journal_entry_lines` (بـ `entry_id` وليس `journal_entry_id`)
8. تصفير `current_balance` لحساب الكونتينر → 0
9. إضافة المبلغ لـ `current_balance` حساب المخزون

---

### 5️⃣ جلب القيد الحقيقي من DB

**الملف:** `ContainerExpensesTab.tsx` — `fetchClosingJE`

المصدر 1: `purchase_receipts.journal_entry_id`  
المصدر 2: `journal_entries` بفلتر `reference_id = container_id` أو `notes.ilike.%container_id%`

---

### 6️⃣ عرض أسماء الحسابات الحقيقية في قيد الإقفال

**قبل (نص ثابت):**
```
مدين — مخزون البضاعة (١١٤١)   ← hardcoded
دائن — كونتينر MSKU9988776    ← container_number فقط
```

**بعد (من DB):**
```
مدين — 1141 بضاعة جاهزة      ← من inventoryAccount state
دائن — 11432 كونتينر MSKU9988776 ← من containerCoaAccount state
```

**States جديدة:**
```typescript
const [inventoryAccount, setInventoryAccount] = useState<{
    id, account_code, name_ar, name_en
} | null>(null);

const [containerCoaAccount, setContainerCoaAccount] = useState<{
    account_code, name_ar
} | null>(null);
```

---

### 7️⃣ المصدر المركزي للحسابات الافتراضية

**الجدول:** `companies.accounting_settings` (JSONB)

```json
{
  "default_accounts": {
    "inventory_account_id": "19d8e7b4-...",
    "inventory_in_transit_account_id": "a0389c9e-..."
  }
}
```

**المصدر في الكود:**
```typescript
company?.accounting_settings?.default_accounts?.inventory_account_id
```

**Fallback:** بحث في `chart_of_accounts` بـ `account_code.like.1141%`

---

### 8️⃣ إصلاح كونتينر MSKU9988776 (يدوي بـ Script)

القيد المفقود أُنشئ بـ Node.js script عبر Supabase client مباشرة:

```
القيد: JE-CLZ-MSKU9988776-202602
التاريخ: 2026-02-21
  Dr. 1141 بضاعة جاهزة             +8,247.50 USD
  Cr. 11432 كونتينر MSKU9988776    -8,247.50 USD

رصيد (11432) بعد: 0.00 ✅
رصيد (1141) بعد: 8,247.50 ✅
```

بيانات الاتصال المستخدمة (من `.env.local`):
```
DATABASE_URL=postgresql://postgres.wzkklenfsaepegymfxfz:***@aws-1-eu-west-2.pooler.supabase.com:6543/postgres
```

---

### 9️⃣ Migration: `containers.closing_journal_entry_id`

**منفّذ على Production عبر psql مباشرة** ✅

```sql
ALTER TABLE public.containers
    ADD COLUMN IF NOT EXISTS closing_journal_entry_id UUID
        REFERENCES public.journal_entries(id) ON DELETE SET NULL;

-- ربط MSKU9988776
UPDATE public.containers
SET closing_journal_entry_id = '6e916e10-1367-482d-afce-4fb9bb10b2d4'
WHERE id = '517da98b-d2cd-432d-8fbc-39e4c907a418';
```

النتيجة:
```
containers.closing_journal_entry_id   ✅ موجود
MSKU9988776 closing_journal_entry_id  ✅ 6e916e10-...
```

---

### 🔟 DB Trigger: تحديث الأرصدة تلقائياً

**منفّذ على Production عبر psql مباشرة** ✅

```sql
CREATE OR REPLACE FUNCTION public.update_account_balance_from_je_line()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- INSERT: current_balance += debit - credit
    -- UPDATE: current_balance += delta
    -- DELETE: current_balance -= debit - credit
    -- فقط للقيود المرحّلة (status = 'posted')
END;
$$;

CREATED TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance_from_je_line();
```

النتيجة:
```
trigger trg_update_account_balance   ✅ موجود ومفعّل
```

**الأثر:** الكود لم يعد بحاجة لتحديث الأرصدة يدوياً — DB تتولى ذلك تلقائياً عند أي تغيير في journal_entry_lines.

---

## 🗄️ Schema Notes مكتشفة

| الجدول | الملاحظة |
|--------|----------|
| `journal_entry_lines` | العمود هو `entry_id` وليس `journal_entry_id` |
| `chart_of_accounts` | العمود هو `name_ar` وليس `account_name_ar` |
| `chart_of_accounts` | يوجد `current_balance` (رصيد حالي) و`opening_balance` (رصيد افتتاحي) |
| `companies` | `accounting_settings` JSONB — المصدر المركزي للإعدادات المحاسبية |
| `company_accounts` | الجدول غير موجود في المشروع الحالي |

---

## 🔄 ترتيب الأولوية للمصادر

```
للحصول على inventory_account_id:
1. companies.accounting_settings.default_accounts.inventory_account_id  ← PRIMARY
2. chart_of_accounts WHERE account_code LIKE '1141%'                    ← FALLBACK
```

---

## 📊 حالة الكونتينر بعد الإغلاق

```
containers.status = 'closed'
journal_entries (entry_type='container_close') ← قيد الإقفال
  ↕ مرتبط بـ:
    reference_id = container.id
    notes = 'container_id:{id}'

chart_of_accounts[11432].current_balance = 0.00    ✅
chart_of_accounts[1141].current_balance  += 8247.5 ✅
```

---

## ⚠️ ما لم يُنجز / نقاط مفتوحة

### 1. مصروف لاحق بعد الإغلاق (Post-Close Settlement)
- الزر موجود في الـ UI (برتقالي)
- لكن منطق التسوية التلقائية (settlement entry) لم يُطبَّق بعد
- **المطلوب:** عند إضافة مصروف بعد الإغلاق → إنشاء قيد تسوية تلقائي

### 2. ربط `closing_journal_entry_id` في containers
- ~~العمود غير موجود في جدول `containers` بعد~~
- ✅ **مُنجز** — Migration نُفِّذ وعمود موجود في Production

### 3. إعدادات الحسابات من الواجهة
- المحاسب يجب أن يتمكن من تغيير `inventory_account_id` من صفحة إعدادات الشركة
- حالياً مرتبط بـ DB مباشرة

---

## 🏗️ التقييم الفني الشامل للمنتج

### ✅ نقاط القوة

| الجانب | التقييم | ملاحظة |
|--------|---------|---------|
| البنية المعمارية | ⭐⭐⭐⭐⭐ | Multi-tenant، RLS، Supabase |
| تجربة المستخدم | ⭐⭐⭐⭐⭐ | RTL/LTR، Dark mode، State machine مرئي |
| المحاسبة | ⭐⭐⭐⭐ | قيود حقيقية، State machine واضح |
| الكونتينرات | ⭐⭐⭐⭐ | Landed Cost، توزيع، إقفال |
| قاعدة البيانات | ⭐⭐⭐⭐⭐ | Schema واضح، CoA متكاملة |

### 🟡 نقاط تحتاج تطوير

1. **الحسابات الافتراضية:** يجب UI لإعداد `default_accounts` من صفحة الإعدادات
2. **Column `closing_journal_entry_id`:** migration مطلوب في جدول containers
3. **Post-Close Expenses:** منطق التسوية لم يُكتب بعد
4. ~~**Balance Updates:** تحديث أرصدة CoA يجب أن يكون عبر trigger في Postgres وليس من الكود~~ ✅ **مُنجز** — Trigger نُفِّذ
5. **Entry Numbering:** تسلسل مضمون (لا تكرار) مطلوب للـ entry_number

### 🔴 مخاطر

1. **Race Condition:** إذا أُغلق الكونتينر مرتين → قيدان! يجب check قبل الإنشاء
2. ~~**Balance Sync:** تحديث `current_balance` يدوياً عرضة للأخطاء~~  ✅ **محلول** — DB trigger

---

## 🗺️ الخطوات التالية المقترحة

| # | المهمة | الأولوية |
|---|---------|----------|
| ~~1~~ | ~~إضافة closing_journal_entry_id~~ | ✅ مُنجز |
| ~~2~~ | ~~DB Trigger لتحديث الأرصدة~~ | ✅ مُنجز |
| 3 | UI لإعداد `default_accounts` من صفحة الشركة | 🔴 عالية |
| 4 | تطبيق منطق **Post-Close Settlement** للمصاريف اللاحقة | 🔴 عالية |
| 5 | منع Race Condition عند إغلاق الكونتينر مرتين | 🟡 متوسطة |
| 6 | اختبار شامل لكونتينر جديد من البداية للنهاية | 🟡 متوسطة |
| 7 | Entry Numbering — تسلسل مضمون بدون تكرار | 🟢 منخفضة |

---

## 🔌 بيانات الاتصال (للرجوع عند الحاجة)

```
Supabase URL:    https://wzkklenfsaepegymfxfz.supabase.co
Project Ref:     wzkklenfsaepegymfxfz
Region:          eu-west-2
DB Host:         aws-1-eu-west-2.pooler.supabase.com:6543
DB User:         postgres.wzkklenfsaepegymfxfz
psql command:    PGPASSWORD='***' psql "postgresql://postgres.wzkklenfsaepegymfxfz@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require"
```

---

*آخر تحديث: 2026-02-21T02:51 UTC*

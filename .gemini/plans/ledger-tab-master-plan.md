# 📊 خطة تنفيذ كشف الحساب — Account Ledger Tab Master Plan

> **الهدف**: إعادة بناء تبويب "كشف الحساب" ليكون كشف حساب محاسبي احترافي ببيانات حقيقية  
> **التاريخ**: 2026-02-21  
> **المكتب**: TexaCore ERP — Unified Accounting Sheet

---

## 🚀 ملخص خطوات البدء السريع

| الخطوة | الملف | ماذا نعمل | يعتمد على |
|--------|-------|-----------|----------|
| **0** | `nexa-list-table.tsx` | إضافة `renderExpandedRow` + `enableMarker` | لا شيء |
| **1** | `useLedgerData.ts` | هوك جلب البيانات الحقيقية + running balance + فلاتر | لا شيء |
| **2** | `LedgerExpandedRow.tsx` | مكون السطر المنفتح (تفاصيل القيد + بنوده) | لا شيء |
| **3** | `LedgerTab.tsx` | إعادة بناء باستخدام NexaListTable: أعمدة + ماركر + تجميع شهري | الخطوة 0 + 1 + 2 |
| **4** | `UnifiedAccountingSheet.tsx` | حذف `mockLedgerEntries` + تمرير `accountId` | الخطوة 3 |
| **5** | `TabContentRenderer.tsx` | تغيير case 'ledger' ليستخدم المكون الجديد | الخطوة 3 + 4 |
| **6** | المتصفح | اختبار: فتح حساب → كشف الحساب → تحقق من كل الميزات | الخطوة 5 |

> **⚡ الخطوات 0 و 1 و 2 مستقلة** — يمكن العمل عليها بالتوازي  
> **⚡ الخطوة 3** هي العمل الأكبر — تستهلك 50% من الوقت  
> **⚡ الخطوة 4 و 5** تعديلات صغيرة (ربط الأسلاك)  


---

## 📌 الملخص التنفيذي

تحويل تبويب "كشف الحساب" (`LedgerTab.tsx`) من عرض بيانات وهمية (mock) إلى كشف حساب محاسبي كامل الميزات:
- بيانات حقيقية من قاعدة البيانات
- أسطر منفتحة (expandable rows) لتفاصيل القيود
- حساب مقابل ذكي
- تجميع شهري تلقائي (قابل للإلغاء)
- ماركر 9 ألوان للمطابقة
- فلاتر متقدمة (عملة + تواريخ + نوع الحركة)

### 🧩 المكون الأساسي: `NexaListTable`
نستخدم مكون **NexaListTable** (`nexa-list-table.tsx`) كأساس لأنه:
- ✅ جدول HTML مباشر (`<table>`) — سهل إضافة أسطر منفتحة
- ✅ `DateRangePicker` مدمج
- ✅ فلاتر متقدمة (`filters: select + number-range`)
- ✅ `getRowAccent` — شريط ملوّن يسار كل صف
- ✅ Footer ملخص + عداد سجلات
- ✅ RTL كامل + Skeletons

### ➕ تعديلات مطلوبة على NexaListTable (خطوة 0):
1. **`renderExpandedRow?: (row: T) => ReactNode`** — سطر منفتح عند الضغط
2. **`enableMarker`** — دعم ماركر 9 ألوان (ننقل المنطق من NexaDataTable)


---

## 🏗️ هيكل الملفات

```
src/features/accounting/components/unified/tabs/
├── LedgerTab.tsx              ← إعادة بناء كامل (الملف الرئيسي)
├── LedgerExpandedRow.tsx      ← مكون السطر المنفتح (جديد)

src/features/accounting/components/unified/hooks/
├── useLedgerData.ts           ← هوك جلب البيانات الحقيقية (جديد)

src/features/accounting/components/unified/
├── UnifiedAccountingSheet.tsx ← تعديل: إزالة mockLedgerEntries + تمرير accountId

src/features/accounting/components/unified/hooks/
├── TabContentRenderer.tsx     ← تعديل: تمرير props جديدة لـ LedgerTab
```

---

## 🔧 الخطوات التنفيذية

---

### الخطوة 1: إنشاء هوك جلب البيانات — `useLedgerData.ts`

**الهدف**: جلب الحركات الحقيقية من `journal_entry_lines` + `journal_entries`

**الاستعلام المطلوب:**
```sql
-- جلب كل حركات حساب معين مع تفاصيل القيد والحساب المقابل
SELECT 
  jel.id,
  jel.journal_entry_id,
  jel.debit,
  jel.credit,
  jel.description AS line_description,
  jel.cost_center_id,
  
  -- بيانات القيد الرئيسي
  je.entry_date,
  je.entry_number,
  je.description AS entry_description,
  je.entry_type,        -- journal | receipt | payment
  je.is_posted,
  je.created_at,
  
  -- عدد البنود الأخرى في نفس القيد (لمعرفة هل هو متعدد الأطراف)
  (SELECT count(*) FROM journal_entry_lines jel2 
   WHERE jel2.journal_entry_id = jel.journal_entry_id 
   AND jel2.id != jel.id) AS other_lines_count,
  
  -- الحساب المقابل (إذا كان القيد ثنائي الأطراف فقط)
  counter_line.account_id AS counter_account_id,
  counter_acc.account_code AS counter_account_code,
  counter_acc.name_ar AS counter_account_name_ar,
  counter_acc.name_en AS counter_account_name_en

FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.journal_entry_id
-- الحساب المقابل: أول بند آخر في نفس القيد
LEFT JOIN LATERAL (
  SELECT account_id FROM journal_entry_lines 
  WHERE journal_entry_id = jel.journal_entry_id AND id != jel.id
  LIMIT 1
) counter_line ON true
LEFT JOIN chart_of_accounts counter_acc ON counter_acc.id = counter_line.account_id

WHERE jel.account_id = $ACCOUNT_ID
  AND je.company_id = $COMPANY_ID
  AND je.is_posted = true  -- فقط القيود المرحّلة (مع خيار عرض المسودات)
ORDER BY je.entry_date ASC, je.created_at ASC
```

**الواجهة (Interface):**
```typescript
interface LedgerLine {
  id: string;
  journal_entry_id: string;
  entry_date: string;
  entry_number: string;
  entry_description: string;
  entry_type: 'journal' | 'receipt' | 'payment';
  line_description: string;
  debit: number;
  credit: number;
  balance: number;       // ← يُحسب محلياً (running balance)
  is_posted: boolean;
  cost_center_id: string | null;
  // الحساب المقابل
  counter_account_id: string | null;
  counter_account_code: string | null;
  counter_account_name: string | null;
  other_lines_count: number;  // عدد الأطراف الأخرى
  // بيانات القيد الكاملة (للسطر المنفتح)
  full_entry_lines?: EntryLine[];
}

interface EntryLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

interface UseLedgerDataReturn {
  entries: LedgerLine[];
  loading: boolean;
  error: string | null;
  totalDebit: number;
  totalCredit: number;
  openingBalance: number;
  closingBalance: number;
  refetch: () => void;
}
```

**الميزات:**
- ✅ جلب بيانات حقيقية من Supabase
- ✅ حساب الرصيد التراكمي (running balance) محلياً
- ✅ فلتر بالعملة
- ✅ فلتر بالتواريخ (dateFrom, dateTo)
- ✅ Lazy loading لتفاصيل القيد (عند فتح السطر فقط)
- ✅ React Query للتخزين المؤقت

---

### الخطوة 2: إنشاء مكون السطر المنفتح — `LedgerExpandedRow.tsx`

**الهدف**: عند الضغط على سطر في كشف الحساب، ينفتح ويعرض تفاصيل القيد الكاملة

**نمط مشابه لـ**: `ContainerExpensesTab.tsx` (Expandable rows pattern)

**المحتوى المعروض في السطر المنفتح:**
```
┌─────────────────────────────────────────────────────┐
│ 📋 قيد يومية رقم JV-20260015                        │
│ التاريخ: 2026-02-20  |  البيان: صرف مصروفات إدارية  │
├─────────────────────────────────────────────────────┤
│  الحساب              │  مدين      │  دائن      │
│  ─────────────────── │ ────────── │ ────────── │
│  5101 مصاريف إدارية  │  3,000.00  │     -      │
│  1111 الصندوق        │     -      │  3,000.00  │  ← الحساب الحالي (مُظلل)
├─────────────────────────────────────────────────────┤
│  المجموع             │  3,000.00  │  3,000.00  │  ✅ متوازن
│                                                     │
│  [🔗 فتح القيد]  [🖨️ طباعة]                        │
└─────────────────────────────────────────────────────┘
```

**الميزات:**
- ✅ تظليل الحساب الحالي (الذي نحن في كشفه) بلون مميز
- ✅ عرض كل بنود القيد (الأطراف الأخرى)
- ✅ مجموع المدين/الدائن مع علامة التوازن
- ✅ زر "فتح القيد" → يفتح القيد في الشيت الموحد (MDI)
- ✅ أيقونة نوع المستند (قيد/سند قبض/سند صرف/فاتورة)
- ✅ Lazy fetch: تفاصيل القيد تُجلب فقط عند فتح السطر

---

### الخطوة 3: إعادة بناء `LedgerTab.tsx`

**الهيكل الجديد (من الأعلى للأسفل):**

#### 3.1 — شريط الملخص العلوي (Summary Bar)
```
┌──────────────────────────────────────────────────────────┐
│  📊 عدد الحركات    │ مجموع المدين  │ مجموع الدائن │ صافي  │
│     147 حركة       │  45,230.00    │  38,780.00   │ مدين  │
│                    │               │              │6,450  │
└──────────────────────────────────────────────────────────┘
```

#### 3.2 — شريط الفلاتر (Filter Bar)
```
┌──────────────────────────────────────────────────────────┐
│ 🎨 [لون الماركر]  │ 💰 [العملة ▾]  │ 🔍 [فلتر النوع ▾]  │
│                                                          │
│ [اليوم] [الأسبوع] [الشهر] [السنة] │ 📅 من ___  إلى ___  │
│                                                          │
│ فلتر النوع: [الكل] [مدين] [دائن] [قيود] [مقبوضات]       │
│              [مدفوعات] [فواتير شراء] [فواتير بيع]         │
│                                                          │
│ 📊 [☑ تجميع شهري]  ← زر تبديل لإظهار/إخفاء الملخصات     │
└──────────────────────────────────────────────────────────┘
```

#### 3.3 — جدول الحركات (Main Table)
**أعمدة الجدول:**

| # | العمود | الوصف | العرض |
|---|--------|-------|-------|
| 1 | **م** | رقم تسلسلي مع ماركر (9 ألوان) | 50px |
| 2 | **التاريخ** | تاريخ القيد مع أيقونة النوع | 100px |
| 3 | **المرجع** | رقم القيد / رقم الفاتورة / رقم السند | 100px |
| 4 | **البيان** | وصف الحركة | flex |
| 5 | **الحساب المقابل** | رقم واسم الحساب المقابل (أو "متعدد") | 180px |
| 6 | **مدين** | المبلغ المدين | 110px |
| 7 | **دائن** | المبلغ الدائن | 110px |
| 8 | **الرصيد** | الرصيد التراكمي (running balance) | 120px |

**ميزات الجدول:**
- ✅ **أسطر منفتحة**: الضغط على أي سطر يفتح `LedgerExpandedRow`
- ✅ **ماركر 9 ألوان**: `enableMarker={true}` — النقر على رقم الصف يُعلّمه
- ✅ **تجميع شهري**: صف ملخص ملوّن بين كل شهر وشهر
- ✅ **أيقونة نوع المستند**: 📋 قيد | 💰 قبض | 💸 صرف | 🧾 فاتورة
- ✅ **الحساب المقابل الذكي**: 
  - قيد ثنائي → يعرض الحساب المقابل مباشرة
  - قيد متعدد → يعرض "حسابات متعددة (3)" 
- ✅ **ألوان الرصيد**: أخضر (مدين) / أحمر (دائن) / أصفر (صفري)
- ✅ **سحب أعمدة + تغيير حجم + حفظ تفضيلات**

#### 3.4 — صفوف الملخص الشهري (Monthly Summary Rows)
```
┌────────────────────────────────────────────────────────────┐
│ ☰  📅 مجموع شهر كانون الثاني 2026                         │
│        مدين: 15,200.00  │  دائن: 12,800.00  │  الرصيد: ... │
└────────────────────────────────────────────────────────────┘
```
- صفوف خاصة بلون `bg-gray-100` كفاصل بين الأشهر
- قابلة للطي/فتح (collapse/expand الشهر بأكمله)
- **زر تبديل `📊 تجميع شهري`**: في شريط الفلاتر
  - `showMonthlyGroups = true` (افتراضي: مُفعّل)
  - عند الإيقاف → تختفي صفوف الملخص الشهري ويُعرض كشف مسطّح بدون فواصل
  - يُحفظ في تفضيلات المستخدم عبر `persistKey`

#### 3.5 — شريط المجاميع السفلي (Sticky Footer)
```
┌────────────────────────────────────────────────────────────┐
│ 🎨 9 أسطر معلّمة | ✨ اسحب الأعمدة │                      │
│          الافتتاحي  │  مجموع المدين │ مجموع الدائن │ الرصيد│
│          5,000.00   │  45,230.00    │  38,780.00   │██████ │
│                     │               │              │6,450  │
└────────────────────────────────────────────────────────────┘
```

---

### الخطوة 4: تعديل `UnifiedAccountingSheet.tsx`

**التعديلات:**
1. ❌ حذف `mockLedgerEntries` بالكامل
2. ✅ تمرير `accountId` و `companyId` إلى `TabContentRenderer`

---

### الخطوة 5: تعديل `TabContentRenderer.tsx`

**التعديلات:**
1. تغيير `case 'ledger'` ليستخدم المكون الجديد
2. تمرير `accountId` بدل `mockLedgerEntries`
3. إزالة `mockLedgerEntries` من الـ interface

---

## 🎨 ميزة الماركر — التفاصيل

### كيف يعمل الماركر في NexaDataTable (تحليل الكود الموجود):

| المكون | الوظيفة |
|--------|---------|
| `ColorMarkerPalette.tsx` | لوحة 9 ألوان مع معانيها الثابتة |
| `enableMarker={true}` | يُفعّل ميزة الماركر في NexaDataTable |
| `activeMarkerColor` | اللون النشط حالياً (يختاره المستخدم) |
| `handleMarkerToggle` | النقر على رقم الصف → تعليم/إلغاء تعليم |
| `localMarkers` | `Record<string, MarkerColorId>` — تخزين محلي |
| `onMarkerChange` | callback لحفظ التعليم في DB (اختياري) |

### ألوان الماركر ومعانيها:
| اللون | المعنى | is_reconciled |
|-------|--------|---------------|
| 🟢 أخضر | مطابق / تم التحقق | ✅ |
| 🔵 أزرق | تم المراجعة | ✅ |
| 🟣 بنفسجي | قيد المراجعة | ❌ |
| 🟠 برتقالي | يحتاج متابعة | ❌ |
| 🟡 أصفر | ملاحظة هامة / انتباه | ❌ |
| 🔴 أحمر | يوجد خطأ / تحتاج مطابقة | ❌ |
| 🩷 وردي | مؤجل / معلّق | ❌ |
| 🩵 سماوي | حالة خاصة | ❌ |
| ⚫ رمادي | مؤرشف / قديم | ✅ |

### التطبيق في كشف الحساب:
- **التفعيل**: `enableMarker={true}` على NexaDataTable
- **الحفظ**: نستخدم `onMarkerChange` لحفظ التعليمات في DB 
  - جدول: `ledger_markers` (جديد) أو `user_table_preferences`
  - الحقول: `user_id`, `account_id`, `entry_line_id`, `color`
- **الفلتر**: إمكانية فلترة الحركات حسب لون الماركر
- **التقارير**: عرض عدد الأسطر المعلّمة/غير المعلّمة في الـ footer
- **المطابقة**: الألوان ذات `is_reconciled: true` تُحسب كمُطابقة في تقارير المطابقة

---

## 📋 ملخص الخطوات

| # | الخطوة | الملف | الحالة |
|---|--------|-------|--------|
| 1 | إنشاء هوك جلب البيانات | `useLedgerData.ts` | ⬜ |
| 2 | إنشاء مكون السطر المنفتح | `LedgerExpandedRow.tsx` | ⬜ |
| 3 | إعادة بناء LedgerTab | `LedgerTab.tsx` | ⬜ |
| 4 | تعديل UnifiedAccountingSheet | إزالة mock + تمرير accountId | ⬜ |
| 5 | تعديل TabContentRenderer | تمرير props جديدة | ⬜ |
| 6 | اختبار شامل في المتصفح | فتح حساب → كشف الحساب | ⬜ |

---

## 🎯 معايير النجاح

- [ ] البيانات حقيقية من DB (ليست mock)
- [ ] الأعمدة: تاريخ + مرجع + بيان + حساب مقابل + مدين + دائن + رصيد
- [ ] الأسطر تنفتح وتعرض كل بنود القيد
- [ ] الحساب الحالي مُظلل في السطر المنفتح
- [ ] زر فتح القيد/الفاتورة من السطر المنفتح
- [ ] فلتر عملة + تواريخ سريعة + تواريخ يدوية
- [ ] فلتر نوع الحركة (مدين/دائن/قيود/مقبوضات/...)
- [ ] تجميع شهري مع ملخص
- [ ] ماركر 9 ألوان للمطابقة المحاسبية
- [ ] شريط ملخص علوي (عدد حركات + مجاميع)
- [ ] شريط مجاميع سفلي ثابت (sticky footer)
- [ ] أيقونة نوع المستند على كل سطر
- [ ] الرصيد التراكمي صحيح 100%
- [ ] عدد الأسطر المعلّمة يظهر في الـ footer

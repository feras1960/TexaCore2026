# 📌 توثيق: فصل القيود المحاسبية وإخفاء قيود النظام
## تاريخ: 2026-02-25/26

---

## 1. فصل قيد فاتورة المبيعات (Split Sales Invoice Posting)

### المشكلة السابقة
- قيد واحد يحتوي 5 سطور (عميل + مبيعات + ضريبة + COGS + مخزون)
- مبلغ القيد (11,342) ≠ مبلغ الفاتورة (8,985)
- يُربك المستخدم العادي بسطور COGS الداخلية

### الحل المنفّذ
فصل القيد إلى **قيدين مستقلين**:

#### القيد 1 — فاتورة المبيعات (ظاهر)
```
reference_type = 'sales_invoice'
entry_type     = 'sales'
──────────────────────────────────────
Dr 1131  العميل (ذمم مدينة)    8,985.46
Cr 41    مبيعات عامة             8,557.58
Cr 214   ضريبة مخرجات              427.88
──────────────────────────────────────
الإجمالي: 8,985.46 = مبلغ الفاتورة ✅
```

#### القيد 2 — تكلفة البضاعة المباعة (مخفي)
```
reference_type = 'sales_cogs'
entry_type     = 'sales'
──────────────────────────────────────
Dr 511   تكلفة أقمشة مباعة      2,357.12
Cr 1141  بضاعة جاهزة             2,357.12
──────────────────────────────────────
```

### الملفات المعدّلة

| الملف | التغيير |
|-------|---------|
| `post_sales_invoice()` (PostgreSQL) | أعيد كتابتها لإنشاء قيدين |
| `sales_transactions` | عمود جديد `cogs_journal_entry_id UUID` |
| `StageJournalPreview.tsx` | حُذفت سطور COGS من المعاينة + كبسة سوبر أدمن |
| `SalesFinanceTab.tsx` | تمرير `cogsJournalEntryId` للمكون |
| `transactions.ts` | إضافة `cogs_journal_entry_id` للنوع |

---

## 2. إخفاء قيود النظام (System Entry Hiding)

### القاعدة
| المستخدم | قيود النظام | كبسة التبديل |
|----------|-------------|-------------|
| **super_admin** | مخفية + زر إظهار 🔘 | ✅ ظاهرة |
| **صاحب الشركة** | مخفية دائماً | ❌ |
| **محاسب / موظف** | مخفية دائماً | ❌ |

### أنواع القيود المخفية (`SYSTEM_REFERENCE_TYPES`)
```typescript
const SYSTEM_REFERENCE_TYPES = new Set([
  'container', 'container_tax', 'container_close', 'container_expense',
  'goods_receipt', 'vat_settlement', 'sales_cogs',
]);
```

### القيود **الظاهرة دائماً**
- `sales_invoice` — فواتير المبيعات
- `purchase_invoice` — فواتير المشتريات

### الملفات المعدّلة
- `JournalEntries.tsx` → `canToggleSystemEntries = isSuperAdmin`

---

## 3. كبسة عرض COGS داخل الفاتورة (Super Admin Only)

### الموقع
داخل `StageJournalPreview.tsx` — أسفل المعاينة

### السلوك
- تظهر فقط إذا: `isSuperAdmin && cogsJournalEntryId`
- عند الضغط: تجلب سطور قيد COGS من DB وتعرضها بلون amber
- التصميم: زر dashed → جدول amber border

### الملفات المعدّلة
- `StageJournalPreview.tsx` — prop جديد `cogsJournalEntryId` + toggle + query
- `SalesFinanceTab.tsx` — تمرير `data?.cogs_journal_entry_id`

---

## 4. تبسيط قيد إقفال الكونتينر

### قبل
- حالتين مرئيتين (معلق بأزرق + مُغلق بأخضر) مع تفاصيل كاملة
- عرض المدين/الدائن لكل المستخدمين

### بعد
| الحالة | ما يظهر |
|--------|---------|
| قبل الإقفال | سطر واحد: "سيتم إنشاء قيد الإقفال تلقائياً" 🔒 |
| بعد الإقفال | ✅ "تم إقفال الكونتينر وتوزيع المصاريف" + التكلفة + التاريخ |
| سوبر أدمن | كبسة 🛡️ "عرض تفاصيل القيد" |

### الملفات المعدّلة
- `ContainerExpensesTab.tsx` — استبدال القسم القديم (166 سطر → 103 سطر)

---

## 5. إصلاح تصنيف entry_type

### المشكلة
- فاتورة المبيعات `entry_type = 'manual'` → لا تظهر في تبويب "مبيعات"

### الحل
1. **تصحيح البيانات** — `UPDATE journal_entries SET entry_type = 'sales' WHERE reference_type IN ('sales_invoice', 'sales_cogs')`
2. **Trigger جديد** — `trg_fix_entry_type` يُصحح `entry_type` تلقائياً:

```sql
CREATE TRIGGER trg_fix_entry_type
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION fix_entry_type_from_reference();
```

### قواعد التصحيح التلقائي
| reference_type | entry_type |
|---------------|------------|
| `sales_invoice`, `sales_cogs`, `sales_return` | `sales` |
| `purchase_invoice`, `purchase_return` | `purchase_invoice` |
| `container*`, `goods_receipt` | `purchase_invoice` |

---

## 6. البنية المحاسبية الحالية في DB

### القيود المرحّلة
```
entry_type       | reference_type  | count
─────────────────┼─────────────────┼──────
container_expense| container       |   1
purchase_invoice | container_tax   |   1
purchase_invoice | goods_receipt   |   1
purchase_invoice |                 |   1
sales            | sales_cogs      |   1
sales            | sales_invoice   |   1
```

---

## 7. ملخص التغييرات في قاعدة البيانات

| العنصر | النوع | التفاصيل |
|--------|-------|----------|
| `sales_transactions.cogs_journal_entry_id` | عمود | UUID يربط بقيد COGS |
| `post_sales_invoice()` | دالة RPC | فصل القيدين (sales + COGS) |
| `fix_entry_type_from_reference()` | دالة | تصحيح entry_type تلقائياً |
| `trg_fix_entry_type` | Trigger | BEFORE INSERT على journal_entries |

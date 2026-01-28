# 🔧 دليل إصلاح Triggers المحاسبية
# Accounting Triggers Fix Guide

> **الوقت:** 5 دقائق  
> **الخطورة:** 🔴 CRITICAL  
> **الحالة:** ✅ الحل جاهز

---

## 🚨 المشكلة

من نتيجة `quick_database_check.sql`، جميع الـ Triggers المحاسبية **مفقودة**:

| Trigger | الجدول | الحالة |
|---------|--------|--------|
| ❌ `trg_sales_invoice_journal_entry` | `sales_invoices` | مفقود |
| ❌ `trg_purchase_invoice_journal_entry` | `purchase_invoices` | مفقود |
| ❌ `trg_payment_receipt_journal_entry` | `payment_receipts` | مفقود |
| ❌ `trg_validate_balance` | `journal_entries` | مفقود |
| ❌ `trg_deduct_inventory_on_sale` | `sales_invoices` | مفقود |

---

## 💥 الأثر

بدون هذه الـ Triggers:
- ❌ **لن تُنشأ القيود المحاسبية تلقائياً** عند إصدار الفواتير
- ❌ **لن يُخصم المخزون تلقائياً** عند البيع
- ❌ **يجب إدخال القيود يدوياً** (وهذا عرضة للخطأ!)
- ❌ **النظام المحاسبي لن يعمل** كما هو مُصمم

**باختصار:** النظام لن يعمل بشكل صحيح! 🔴

---

## ✅ الحل (5 دقائق)

### الخطوة 1: افتح Supabase SQL Editor
```
https://app.supabase.com/project/YOUR_PROJECT/sql
```

### الخطوة 2: افتح الملف
```
fix_accounting_triggers.sql
```

### الخطوة 3: انسخ المحتوى كاملاً

- اضغط `Ctrl+A` (تحديد الكل)
- اضغط `Ctrl+C` (نسخ)

### الخطوة 4: الصق في Supabase SQL Editor

- اضغط `Ctrl+V` في SQL Editor

### الخطوة 5: اضغط Run

- انتظر 30-60 ثانية
- ستظهر رسائل بالعربية تؤكد الإنشاء

### الخطوة 6: تحقق من النتيجة

يجب أن ترى:
```
═══════════════════════════════════════════════════════
🎉 اكتمل إصلاح Triggers المحاسبية بنجاح!
═══════════════════════════════════════════════════════

✅ الـ Triggers المُنشأة:
   1. trg_sales_invoice_journal_entry
   2. trg_purchase_invoice_journal_entry
   3. trg_payment_receipt_journal_entry
   4. trg_payment_voucher_journal_entry
   5. trg_deduct_inventory_on_sale
```

---

## 🧪 التحقق

### اختبار سريع (30 ثانية):

```sql
-- شغّل هذا في Supabase:
quick_database_check.sql
```

**النتيجة المتوقعة:**

| Trigger | الجدول | الحالة |
|---------|--------|--------|
| ✅ `trg_sales_invoice_journal_entry` | `sales_invoices` | **موجود** |
| ✅ `trg_purchase_invoice_journal_entry` | `purchase_invoices` | **موجود** |
| ✅ `trg_payment_receipt_journal_entry` | `payment_receipts` | **موجود** |
| ✅ `trg_validate_balance` | `journal_entries` | موجود |
| ✅ `trg_deduct_inventory_on_sale` | `sales_invoices` | **موجود** |

---

## 📚 ما تفعله كل Trigger؟

### 1. `trg_sales_invoice_journal_entry`
```
عند تأكيد فاتورة مبيعات (status = 'posted'):
→ ينشئ قيد محاسبي تلقائياً:
   • مدين: حساب العميل = المبلغ الإجمالي
   • دائن: المبيعات = المبلغ قبل الضريبة
   • دائن: ضريبة القيمة المضافة = مبلغ الضريبة
```

### 2. `trg_purchase_invoice_journal_entry`
```
عند تأكيد فاتورة مشتريات:
→ ينشئ قيد محاسبي تلقائياً:
   • مدين: المشتريات/المخزون = المبلغ قبل الضريبة
   • مدين: ضريبة مدخلات = مبلغ الضريبة
   • دائن: حساب المورد = المبلغ الإجمالي
```

### 3. `trg_payment_receipt_journal_entry`
```
عند تأكيد سند قبض:
→ ينشئ قيد محاسبي تلقائياً:
   • مدين: الصندوق/البنك = المبلغ
   • دائن: حساب العميل = المبلغ
```

### 4. `trg_payment_voucher_journal_entry`
```
عند تأكيد سند صرف:
→ ينشئ قيد محاسبي تلقائياً:
   • مدين: حساب المورد = المبلغ
   • دائن: الصندوق/البنك = المبلغ
```

### 5. `trg_deduct_inventory_on_sale`
```
عند تأكيد فاتورة مبيعات:
→ يخصم المخزون تلقائياً لكل صنف
→ ينشئ حركة مخزون (نوع: بيع)
```

---

## ⚠️ ملاحظات مهمة

### 1. جداول مطلوبة

الـ Triggers تحتاج هذه الجداول:
- ✅ `sales_invoices`
- ✅ `purchase_invoices`
- ✅ `payment_receipts`
- ✅ `payment_vouchers` (اختياري)
- ✅ `journal_entries`
- ✅ `journal_entry_lines`
- ✅ `customers`
- ✅ `suppliers`
- ✅ `chart_of_accounts`

إذا كان أي جدول مفقود، ستظهر رسالة خطأ (طبيعي).

### 2. الحسابات المطلوبة

يجب أن تكون هذه الحسابات موجودة في `chart_of_accounts`:
- `1110` - الصندوق
- `1120` - البنك
- `1130` - العملاء
- `1140` - المخزون
- `1160` - ضريبة مدخلات
- `2110` - الموردين
- `2130` - ضريبة مخرجات
- `4100` - المبيعات
- `5200` - المشتريات

إذا كانت مفقودة، الـ Triggers ستظهر رسائل خطأ واضحة.

### 3. السنة المالية

يجب أن يكون لديك سنة مالية نشطة (`is_current = true`) في جدول `fiscal_years`.

---

## 🐛 استكشاف الأخطاء

### خطأ: "relation does not exist"
```
السبب: جدول مفقود (مثل payment_vouchers)
الحل: هذا طبيعي إذا لم تكن تستخدم هذا الموديول
     الـ Triggers الأخرى ستعمل بشكل صحيح
```

### خطأ: "حساب المبيعات (4100) غير موجود"
```
السبب: شجرة الحسابات غير مطبقة
الحل: 
1. شغّل Migration: 00004_add_accounting_tables.sql
2. أو شغّل: apply_chart_template_to_company()
```

### خطأ: "fiscal year not found"
```
السبب: لا يوجد سنة مالية نشطة
الحل: أنشئ سنة مالية في جدول fiscal_years
     مع is_current = true
```

---

## 🎯 الخطوة التالية

بعد تطبيق الإصلاح:

1. ✅ **اختبر:** شغّل `quick_database_check.sql`
2. ✅ **تأكد:** جميع Triggers موجودة ✅
3. ✅ **انتقل:** إلى اختبار RLS (`test_tenant_isolation.sql`)

---

## 📞 المساعدة

إذا استمرت المشكلة:
1. راجع رسائل الخطأ في Console
2. تأكد من وجود الجداول المطلوبة
3. تأكد من وجود الحسابات المطلوبة
4. أرسل screenshot لرسالة الخطأ

---

## ✅ النتيجة المتوقعة

بعد تطبيق الإصلاح:
```
🎯 الحالة في quick_database_check.sql:

⚡ Triggers المحاسبية:
  trg_sales_invoice_journal_entry     ✅ موجود
  trg_purchase_invoice_journal_entry  ✅ موجود
  trg_payment_receipt_journal_entry   ✅ موجود
  trg_validate_balance                ✅ موجود (من STEP_47)
  trg_deduct_inventory_on_sale        ✅ موجود
```

---

**الآن النظام المحاسبي سيعمل تلقائياً! 🎉**

---

**آخر تحديث:** 25 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ جاهز للاستخدام

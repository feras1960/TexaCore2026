# 🗄️ دليل أرشفة الجداول القديمة — Legacy Tables Archive Guide

> **التاريخ**: 2026-02-15  
> **الحالة**: مُرَحَّلة (Archived) — لا تُستخدم في النظام الجديد  
> **البديل**: `purchase_transactions` + `sales_transactions`

---

## ⚠️ تحذير: هذه الجداول مُؤرشفة

الجداول التالية كانت تُستخدم في النظام القديم وتم **استبدالها بالكامل** بجدولين جديدين:
- `purchase_transactions` + `purchase_transaction_items` ← بديل كل جداول المشتريات
- `sales_transactions` + `sales_transaction_items` ← بديل كل جداول المبيعات

---

## 📋 خريطة الجداول القديمة → الجديدة

### المشتريات:

| # | الجدول القديم | الوظيفة | البديل في النظام الجديد |
|---|--------------|---------|------------------------|
| 1 | `purchase_requests` | طلبات الشراء | `purchase_transactions` (stage = 'draft') |
| 2 | `purchase_request_items` | بنود الطلبات | `purchase_transaction_items` |
| 3 | `purchase_quotations` | عروض أسعار الشراء | `purchase_transactions` (stage = 'quotation') |
| 4 | `purchase_quotation_items` | بنود عروض الأسعار | `purchase_transaction_items` |
| 5 | `purchase_orders` | أوامر الشراء | `purchase_transactions` (stage = 'order'/'approved') |
| 6 | `purchase_order_items` | بنود الأوامر | `purchase_transaction_items` |
| 7 | `purchase_invoices` | فواتير المشتريات | `purchase_transactions` (stage = 'invoice'/'posted'/'paid') |
| 8 | `purchase_invoice_items` | بنود الفواتير | `purchase_transaction_items` |
| 9 | `purchase_receipts` | إيصالات الاستلام | `purchase_transactions` (stage = 'receipt') |
| 10 | `purchase_receipt_items` | بنود الاستلام | `purchase_transaction_items` |

### المبيعات:

| # | الجدول القديم | الوظيفة | البديل في النظام الجديد |
|---|--------------|---------|------------------------|
| 1 | `sales_quotations` | عروض أسعار المبيعات | `sales_transactions` (stage = 'quotation') |
| 2 | `sales_quotation_items` | بنود عروض الأسعار | `sales_transaction_items` |
| 3 | `sales_orders` | أوامر البيع | `sales_transactions` (stage = 'order') |
| 4 | `sales_order_items` | بنود الأوامر | `sales_transaction_items` |
| 5 | `sales_invoices` | فواتير المبيعات | `sales_transactions` (stage = 'invoice'/'posted'/'paid') |
| 6 | `sales_invoice_items` | بنود الفواتير | `sales_transaction_items` |
| 7 | `sales_delivery_notes` | مذكرات التسليم | `sales_transactions` (stage = 'delivery') |
| 8 | `sales_delivery_note_items` | بنود التسليم | `sales_transaction_items` |

---

## 🔒 حالة الجداول القديمة

```
الجداول القديمة:
├── لم تُحذف ← لا زالت موجودة كأرشيف
├── تم إضافة تعليق DEPRECATED عليها في DB ← لمنع الاستخدام الخاطئ
├── لا يُقرأ منها في Frontend ← كل الصفحات تتصل بالجداول الجديدة
├── البيانات القديمة محفوظة ← يمكن الرجوع إليها إن احتاج
└── RLS لا زالت فعّالة ← الحماية مستمرة حتى على البيانات القديمة
```

---

## 🔄 خريطة تحويل الحقول

### الحقول المشتركة (purchase_invoices → purchase_transactions):

| حقل قديم | حقل جديد | ملاحظة |
|----------|----------|--------|
| `id` | `id` | نفسه |
| `invoice_number` | `invoice_no` | يُملأ فقط في مرحلة invoice |
| `invoice_date` | `doc_date` | تاريخ واحد لكل المراحل |
| `status` | `stage` | حالة → مرحلة |
| `supplier_id` | `supplier_id` | نفسه |
| `customer_id` | `customer_id` | للمبيعات |
| `total_amount` | `total_amount` | نفسه |
| `subtotal` | `subtotal` | نفسه |
| `tax_amount` | `tax_amount` | نفسه |
| `discount_amount` | `discount_amount` | نفسه |
| `currency` | `currency` | نفسه |
| `notes` | `notes` | نفسه |
| `created_at` | `created_at` | نفسه |
| `created_by` | `created_by` | نفسه |

### الحقول الجديدة (غير موجودة في القديم):

| حقل جديد | الوظيفة |
|----------|---------|
| `stage` | المرحلة الحالية (draft/quotation/order/invoice/posted/paid) |
| `draft_no`, `quotation_no`, `order_no`, `receipt_no`, `invoice_no` | رقم مختلف لكل مرحلة |
| `version` | للـ Optimistic Locking |
| `is_locked` | القفل أثناء الترحيل |
| `is_return` | هل هذا مرتجع؟ |
| `is_active` | Soft Delete |
| `approved_by`, `received_by`, `posted_by` | تتبع لكل مرحلة |

---

## 🚫 ملفات الفرونت إند المرتبطة بالجداول القديمة

### ⚠️ الملفات التي تم تحديثها (تستخدم الآن النظام الجديد):
- `src/features/purchases/pages/PurchaseInvoicesList.tsx` → `purchase_transactions`
- `src/features/sales/pages/SalesInvoicesList.tsx` → `sales_transactions`
- `src/features/trade/components/UnifiedTradeSheet.tsx` → الخدمات الجديدة

### ⚠️ ملفات قد تحتاج تحديث لاحق:
- `src/features/trade/services/TradeService.ts` ← لا زالت تقرأ من القديم
- `src/features/trade/components/tabs/PurchaseExpensesTab.tsx` ← تستخدم purchase_invoices
- `src/features/trade/components/tabs/PurchasePaymentTab.tsx` ← تستخدم purchase_invoices
- `src/features/warehouse/hooks/useReceiptSources.ts` ← تستخدم purchase_invoices
- `src/hooks/usePosting.ts` ← تستخدم purchase_invoices
- `src/services/purchaseAccountingService.ts` ← تستخدم purchase_invoices

---

## 📊 الجداول الجديدة المُستخدمة حالياً

| الجدول | الوظيفة | عدد الحقول |
|--------|---------|------------|
| `purchase_transactions` | سجل المشتريات الموحد (كل المراحل) | ~45 حقل |
| `purchase_transaction_items` | بنود المشتريات الموحدة | ~25 حقل |
| `sales_transactions` | سجل المبيعات الموحد (كل المراحل) | ~45 حقل |
| `sales_transaction_items` | بنود المبيعات الموحدة | ~25 حقل |
| `transaction_stage_log` | سجل تتبع تحويلات المراحل | ~12 حقل |
| `document_sequences` | تسلسل ترقيم المستندات | ~8 حقول |

---

## 🗃️ القرار النهائي

```
الجداول القديمة = أرشيف فقط
├── لا تُحذف (حماية البيانات التاريخية)
├── لا تُستخدم في الكود الجديد
├── مُعلّمة بـ DEPRECATED في DB
└── يمكن عمل migration لنقل البيانات القديمة إن احتاج
```

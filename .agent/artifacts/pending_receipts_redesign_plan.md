# تحليل و إعادة تصميم تبويب "استلامات معلقة"

## 🔍 تحليل المشكلة الحالية

### المشاكل المحددة:

1. **فقدان المسودة**: عند حفظ الاستلام كمسودة (saveDraft) والخروج، لا توجد طريقة للعودة إليه
2. **زر واحد فقط**: الجدول يعرض فقط زر "تأكيد الاستلام" — لا يوجد زر عرض الفاتورة
3. **تكرار من الصفر**: عند الضغط على "تأكيد الاستلام" مرة أخرى لنفس الفاتورة، يفتح استلام جديد من الصفر
4. **لا تتبع لحالة الاستلام**: لا يظهر ما إذا كانت هناك مسودة استلام مرتبطة بالفاتورة

### التحليل التقني:

#### الحالة الحالية:
- `getPendingReceipts()` في `warehouseService.ts` يجلب الفواتير بحالة `posted` / `partially_received`
- لا يتحقق من وجود `purchase_receipts` مسودة مرتبطة بالفاتورة
- `MaterialReceiptDialog` يفتح دائماً استلام جديد (session جديدة)
- `receiptLocalStore` يحفظ في `localStorage` فقط — لا يحفظ في قاعدة البيانات كمسودة
- `receiptCompletionService.completeReceipt()` ينشئ السجل فقط عند التأكيد النهائي بحالة `completed`

#### جدول `purchase_receipts`:
```
- id, receipt_number, receipt_date
- receipt_type (direct/shipment)
- order_id → purchase_orders
- invoice_id → purchase_invoices  
- supplier_id, warehouse_id
- status (draft/completed)  ← يدعم draft!
- notes, created_by
```

## ✅ الحل الجذري المقترح

### التغييرات المطلوبة:

#### 1. تحسين `getPendingReceipts()` — جلب بيانات الاستلام المرتبطة
- ربط كل فاتورة/أمر شراء بسجلات `purchase_receipts` الموجودة (draft أو completed)
- عرض حالة الاستلام (لا يوجد / مسودة / مكتمل / جزئي)

#### 2. إعادة تصميم جدول الاستلامات المعلقة
- عرض جدولي (table) بدل البطاقات
- أعمدة: رقم الفاتورة | المورد | المبلغ | التاريخ | حالة الفاتورة | حالة الاستلام | الإجراءات
- زرين إجراء:
  - 👁️ عرض الفاتورة
  - 📥 تأكيد الاستلام / متابعة الاستلام

#### 3. دعم استئناف المسودة في `MaterialReceiptDialog`
- إضافة prop `existingReceiptId` لتحميل مسودة موجودة
- تحميل بيانات المسودة من `purchase_receipts` + `purchase_receipt_items`

# 🔧 خطة إصلاح تزامن الضريبة — مصدر حقيقة واحد

## المشكلة الجذرية
الضريبة تُحسب في أكثر من مكان بأرقام مختلفة:
- `CartItemsView` يحسب `item.total = net + tax` ← **مصدر الحقيقة**
- `SupplierFinanceTab` يعيد حساب `liveTotal` من `item.subtotal` (قد يكون undefined → fallback خاطئ)
- `StageJournalPreview` يحسب `computedTax` إذا لم يستقبل `taxAmount`

## الحل المقترح: مصدر حقيقة واحد

### القاعدة: CartItemsView → data → كل المكونات تقرأ فقط

```
┌─────────────────────────┐
│  CartItemsView          │  ← يحسب لكل صنف:
│  item.subtotal          │     quantity × unit_price
│  item.tax_amount        │     netAfterDiscount × tax_rate%
│  item.total             │     netAfterDiscount + tax_amount
└──────────┬──────────────┘
           │ handleItemsChange (TradeMainTab)
           ▼
┌─────────────────────────┐
│  data (في state)        │  ← يحسب الإجماليات:
│  data.subtotal          │     Σ item.subtotal
│  data.discount_amount   │     Σ item.discount_amount
│  data.tax_amount        │     Σ item.tax_amount
│  data.grand_total       │     net + tax
└──────────┬──────────────┘
           │
     ┌─────┼─────────────┐
     ▼     ▼             ▼
  رأس   القيد       ملخص التكاليف
  الفاتورة  المحاسبي    PurchaseExpensesTab
  (header)  StageJournal
```

### التغييرات المطلوبة:

1. **SupplierFinanceTab**: بدلاً من إعادة حساب من items
   → يقرأ مباشرة `data.subtotal - data.discount_amount` (net)
   → يقرأ `data.tax_amount` (ضريبة)

2. **StageJournalPreview**: يستقبل الأرقام النهائية
   → `totalAmount` = net (بدون ضريبة)
   → `taxAmount` = الضريبة المحسوبة
   → لا يحسب شيئاً بنفسه!

3. **Header bar**: يقرأ من `data.grand_total`

## الأرقام المتوقعة (مثال: 3,000 بضاعة + 4% ضريبة):
- subtotal = 3,000
- discount = 0
- net = 3,000
- tax = 120
- grand_total = 3,120

## القيد المتوقع:
- مشتريات (مدين): 3,000
- ضريبة مدخلات (مدين): 120
- موردين (دائن): 3,120

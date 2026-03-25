# 📋 خطة تنفيذ دورة حياة فاتورة المشتريات
# Purchase Invoice Lifecycle — Implementation Plan

> **الحالة**: مُعتمدة — جاهزة للتنفيذ
> **التاريخ**: 2026-02-16
> **المبدأ**: منطق بسيط، قوي، ومدروس

---

## 🎯 القرارات المعتمدة

| القرار | التفصيل |
|--------|---------|
| **الترحيل** | مسموح بدون استلام أو مع استلام — يأخذ الأرقام من أحدث مصدر |
| **التسامح** | نسب عالمية معيارية (كمية: 5%، سعر: 2%) — قابلة للتعديل بالإعدادات |
| **الفروقات الكبيرة** | لا قيد تسوية تلقائي — عرض تقرير للمحاسب مع عرض إنشاء قيد يدوي |
| **الاستلام الجزئي** | مدعوم — حالة `partially_received` مع تفاصيل |
| **فواتير المبيعات** | لاحقاً بعد إتمام المشتريات |

---

## 📊 الوضع الحالي — ما هو مبني

### ✅ موجود ويعمل:
1. **`purchaseAccountingService.ts`** (361 سطر) — إنشاء قيد محاسبي من بيانات الفاتورة
2. **`receiptCompletionService.ts`** (1059 سطر) — استلام بضاعة كامل (8 خطوات)
3. **`useSheetActions.ts`** — أكشن `save_confirm` (يغيّر الحالة فقط) + `save_post` + `post`
4. **`PurchaseTransaction` types** — أنواع كاملة مع `received_qty` لكل بند
5. **`PurchaseSettings` interface** — إعدادات التسامح معرّفة (`receipt_qty_tolerance_percent`, etc.)
6. **`ReceiptDiscrepancy` interface** — نوع لتتبع الفروقات
7. **`AdjustmentEntry` interface** — نوع لقيود التسوية
8. **`goods_receipt` + `goods_receipt_items`** — جداول الاستلام (`purchase_receipts`)
9. **`MaterialReceiptDialog.tsx`** — واجهة الاستلام الحالية

### ⚠️ المشكلة الحالية:
- في `save_post` (سطر 523): يُنشئ القيد مع الحفظ مباشرة — **يجب فصلهما**
- في `post` (سطر 711): يُنشئ القيد عند الترحيل بدون فحص الاستلام — **يجب إضافة الفحص**
- `purchaseAccountingService` يأخذ الأرقام فقط من `invoice` — **يجب دعم أرقام الاستلام**
- لا يوجد تنبيه للمحاسب عند وجود فروقات — **يجب إضافته**

---

## 🏗️ المراحل والأزرار

```
┌──────────┐     ┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  مسودة   │────▶│  مؤكدة   │────▶│ مستلمة (جزئي/كلي)│────▶│  مرحّلة  │
│  draft   │     │confirmed │     │received/partial  │     │  posted  │
│          │     │          │     │                  │     │          │
│ لا قيد   │     │ لا قيد   │     │ لا قيد           │     │ قيد ✅   │
│ تلقائي💾 │     │ إشعارات  │     │ كميات فعلية      │     │ نهائي    │
└──────────┘     └──────────┘     └──────────────────┘     └──────────┘
                        │                                       ▲
                        │         (ترحيل مباشر بدون استلام)       │
                        └───────────────────────────────────────┘
```

### أزرار كل مرحلة:

| المرحلة | الأزرار | ملاحظات |
|---------|---------|---------|
| `draft` | **[حفظ و تأكيد]** + [إلغاء] | حفظ تلقائي كل 5 ثوانٍ |
| `confirmed` | **[ترحيل]** + [إلغاء التأكيد] | تحذير إذا لم يتم الاستلام |
| `partially_received` | **[ترحيل]** + عرض تفاصيل الاستلام | القيد من المستلم الفعلي |
| `received` | **[ترحيل]** + عرض تفاصيل الاستلام | القيد من المستلم الفعلي |
| `posted` | [إلغاء الترحيل] + [طباعة] + [نسخ] | عرض القيد المرتبط |

---

## 📐 خطوات التنفيذ (مرتبة حسب الأولوية)

### المرحلة 1: فصل التأكيد عن الترحيل (🟢 بسيط)

#### 1.1 تعديل `save_confirm` في `useSheetActions.ts`
**الحالة الحالية**: `save_confirm` يغيّر `stage` إلى `confirmed` فقط ✅ (صحيح بالفعل!)
**التعديل**: لا تعديل مطلوب — السلوك الحالي صحيح!

#### 1.2 إزالة `save_post` من فواتير المشتريات
**الحالة الحالية**: `save_post` يحفظ ويُرحّل ويُنشئ القيد في خطوة واحدة
**التعديل**: فواتير المشتريات لا تعرض زر `save_post` — فقط `save_confirm`

**الملف**: `tradeConfigs.ts` — تحديث أزرار فاتورة المشتريات:
```typescript
// purchase trade_invoice actions:
// draft: ['save_confirm', 'cancel']        // بدلاً من save_post
// confirmed: ['post', 'unconfirm']         // ترحيل أو إلغاء التأكيد
// partially_received: ['post', 'details']  // ترحيل مع عرض التفاصيل
// received: ['post', 'details']            // ترحيل مع عرض التفاصيل
// posted: ['unpost', 'print', 'duplicate'] // إلغاء ترحيل
```

#### 1.3 إضافة أكشن `unconfirm` في `useSheetActions.ts`
```typescript
case 'unconfirm': {
    // إعادة الفاتورة من confirmed إلى draft
    // فقط إذا لم يتم الاستلام بعد
    await supabase.from('purchase_transactions')
        .update({ stage: 'draft', updated_at: now })
        .eq('id', docId);
}
```

---

### المرحلة 2: تطوير الترحيل الذكي (🟡 متوسط)

#### 2.1 تعديل `purchaseAccountingService.createPurchaseInvoiceJournalEntry`

**المنطق الجديد:**
```
1. جلب الفاتورة
2. هل يوجد استلام مكتمل (purchase_receipts مرتبط بالفاتورة)؟
   ├── نعم → حساب المجاميع من الكميات المستلمة الفعلية
   │         → فحص التسامح (5% كمية)
   │         → إذا ضمن التسامح: إنشاء القيد من الأرقام المستلمة
   │         → إذا خارج التسامح: إشارة (flag) على الفاتورة للمحاسب
   └── لا → إنشاء القيد من أرقام الفاتورة (مع تحذير)
3. إنشاء القيد المحاسبي
4. ربط القيد بالفاتورة
5. تحديث الحالة إلى posted
```

**الكود المقترح:**
```typescript
async createPurchaseInvoiceJournalEntry(
    invoiceId: string, 
    userId: string,
    options?: { 
        source?: 'invoice' | 'receipt';  // أي أرقام نستخدم
        forceInvoiceAmounts?: boolean;   // تجاوز واستخدام أرقام الفاتورة
    }
) {
    // 1. جلب الفاتورة
    const invoice = await fetchInvoice(invoiceId);
    
    // 2. البحث عن استلام مكتمل
    const receipt = await getCompletedReceipt(invoiceId);
    
    // 3. تحديد مصدر الأرقام
    let amounts: { subtotal: number; tax: number; total: number };
    let source: 'invoice' | 'receipt' = 'invoice';
    
    if (receipt && !options?.forceInvoiceAmounts) {
        // حساب المجاميع من البنود المستلمة
        amounts = calculateFromReceipt(receipt, invoice);
        source = 'receipt';
        
        // فحص التسامح
        const tolerance = await getToleranceSettings(invoice.company_id);
        const variance = calculateVariance(invoice, amounts);
        
        if (variance.exceedsTolerance) {
            // تسجيل الفروقات في الفاتورة (لعرضها للمحاسب)
            await flagVariance(invoiceId, variance);
        }
    } else {
        amounts = {
            subtotal: invoice.subtotal,
            tax: invoice.tax_amount,
            total: invoice.total_amount
        };
    }
    
    // 4. إنشاء القيد
    // ... (نفس المنطق الحالي لكن بـ amounts بدل invoice مباشرة)
}
```

#### 2.2 إضافة دالة `getCompletedReceipt`
```typescript
async function getCompletedReceipt(invoiceId: string) {
    const { data } = await supabase
        .from('purchase_receipts')
        .select(`
            *,
            items:purchase_receipt_items(*)
        `)
        .eq('invoice_id', invoiceId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
    
    return data;  // قد يكون استلام واحد أو عدة استلامات جزئية
}
```

#### 2.3 إضافة دالة `calculateVariance`
```typescript
function calculateVariance(invoice: any, receiptAmounts: any, tolerancePercent = 5) {
    const qtyVariancePercent = Math.abs(
        (receiptAmounts.totalQty - invoice.totalQty) / invoice.totalQty * 100
    );
    
    return {
        qtyVariancePercent,
        amountDifference: receiptAmounts.total - invoice.total_amount,
        exceedsTolerance: qtyVariancePercent > tolerancePercent,
        isOverReceipt: receiptAmounts.totalQty > invoice.totalQty,
        isUnderReceipt: receiptAmounts.totalQty < invoice.totalQty,
    };
}
```

---

### المرحلة 3: الاستلام الجزئي (🟡 متوسط)

#### 3.1 تعديل `updateSourceDocument` في `receiptCompletionService.ts`
**الحالة الحالية**: يدعم الاستلام الجزئي ✅ (يحسب `partially_received` vs `received`)
**التعديل المطلوب**: ربط حالة `partially_received` مع stage الفاتورة

```typescript
// في updateSourceDocument:
if (isFullyReceived) {
    updateData.stage = 'received';
} else {
    updateData.stage = 'partially_received';
}
// لا نُغيّر stage إلى posted هنا — الترحيل يتم فقط بكبسة يدوية
```

#### 3.2 إضافة `stage: 'partially_received'` في `PurchaseStage`
**الملف**: `src/features/trade/config/stageConfig.ts`
```typescript
export type PurchaseStage = 
    'draft' | 'quotation' | 'order' | 'approved' | 
    'confirmed' |           // ← جديد (بعد save_confirm)
    'partially_received' |  // ← جديد (استلام جزئي)
    'received' |            // ← موجود
    'invoiced' | 'posted' | 'paid' | 'cancelled';
```

---

### المرحلة 4: تنبيه المحاسب بالفروقات (🟢 بسيط)

#### 4.1 إضافة حقل `has_receipt_variance` للفاتورة
```sql
ALTER TABLE purchase_transactions 
ADD COLUMN has_receipt_variance BOOLEAN DEFAULT FALSE,
ADD COLUMN receipt_variance_detail JSONB DEFAULT NULL;
-- مثال variance_detail:
-- {
--   "invoice_total": 5000,
--   "receipt_total": 4850,
--   "variance_amount": -150,
--   "variance_percent": -3,
--   "items": [
--     { "material_id": "...", "invoiced_qty": 100, "received_qty": 97, "diff": -3 }
--   ]
-- }
```

#### 4.2 عرض تنبيه في واجهة الفاتورة
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ يوجد فروقات في الكميات المستلمة                          │
│                                                             │
│  المادة       | الفاتورة | المستلم  | الفرق  | النسبة       │
│  قماش حريري  | 100 متر  | 97 متر  | -3     | -3%          │
│  قماش قطني   | 200 متر  | 198 متر | -2     | -1%          │
│                                                             │
│  إجمالي الفرق: -150 ر.س                                    │
│                                                             │
│  [📝 إنشاء قيد تسوية]    [✕ تجاهل]                         │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 زر "إنشاء قيد تسوية" — يفتح قيد يدوي مملوء مسبقاً
```typescript
// عند كبس الزر:
const adjustmentData = {
    type: 'journal_entry',
    entry_type: 'adjustment',
    description: `تسوية فروقات استلام فاتورة #${invoice.invoice_no}`,
    lines: [
        { 
            account_id: defaults.inventory_account, 
            credit: variance.amount,  // تقليل المخزون
            description: `تسوية نقص كمية - ${invoice.invoice_no}` 
        },
        { 
            account_id: defaults.payable_account, 
            debit: variance.amount,   // تقليل الالتزام
            description: `تسوية فرق استلام - المورد ${supplier.name}` 
        }
    ]
};
// فتح ورقة القيد المحاسبي بالبيانات المملوءة
openSheet('journal_entry', adjustmentData);
```

---

### المرحلة 5: الشحنات الدولية (🔵 مؤجل — مبني جزئياً)

#### التدفق الخاص بالشحنات:
```
فاتورة (draft) → تأكيد → ربط بكونتينر → شحن → وصول → استلام → ترحيل
                                  │
                                  ▼
                          الترحيل لحساب المورد
                          يكون عبر الكونتينر
```

**ملاحظة**: هذا مبني جزئياً عبر `trade_container` و `containers` table.
سيتم ربطه بالمنطق الجديد بعد اعتماد المراحل 1-4.

---

## 🔢 نسب التسامح العالمية المعيارية

| المعيار | القيمة الافتراضية | الاستخدام |
|---------|-------------------|-----------|
| `receipt_qty_tolerance_percent` | **5%** | فرق الكمية المسموح |
| `receipt_price_tolerance_percent` | **2%** | فرق السعر المسموح |
| `over_receipt_tolerance_percent` | **5%** | الاستلام الزائد المسموح |
| `allow_over_receipt` | `true` | السماح بقبول كمية أكبر |
| `allow_partial_receipt` | `true` | السماح بالاستلام الجزئي |
| `require_receipt_before_post` | `false` | إلزام الاستلام قبل الترحيل |

**المرجع**: SAP (5% standard)، Oracle (configurable)، Odoo (5% default)

---

## 📁 الملفات المتأثرة

| الملف | التعديل |
|-------|---------|
| `useSheetActions.ts` | إضافة `unconfirm` + تعديل `post` ليفحص الاستلام |
| `purchaseAccountingService.ts` | إضافة منطق الاستلام + التسامح |
| `tradeConfigs.ts` | تحديث أزرار فوق الفاتورة لكل مرحلة |
| `receiptCompletionService.ts` | تعديل `updateSourceDocument` لدعم `confirmed` stage |
| `stageConfig.ts` | إضافة `confirmed` + `partially_received` |
| `trade/types/index.ts` | لا تعديل — الأنواع موجودة ✅ |
| **ملف جديد**: `VarianceAlert.tsx` | مكوّن تنبيه الفروقات |
| **SQL Migration**: | إضافة `has_receipt_variance` + `receipt_variance_detail` |

---

## 🚀 ترتيب التنفيذ

```
اليوم:
  ✅ المرحلة 1.2 — تحديث أزرار الفاتورة (tradeConfigs)
  ✅ المرحلة 1.3 — إضافة أكشن unconfirm
  ✅ المرحلة 2.1 — تطوير purchaseAccountingService (الترحيل الذكي)

الخطوة التالية:
  ✅ المرحلة 2.2, 2.3 — دوال الاستلام والتسامح
  ✅ المرحلة 3 — ربط stage بالاستلام الجزئي
  ✅ المرحلة 4 — تنبيه المحاسب + زر قيد التسوية

مؤجل:
  🔵 المرحلة 5 — الشحنات الدولية
```

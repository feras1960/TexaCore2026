# 🔍 تدقيق منطق المشتريات المحلية vs الدولية

> **تاريخ التدقيق:** 2026-02-16
> **الحالة:** ✅ تم الإصلاح — 4 إصلاحات مُنجزة

---

## 📋 ملخص تنفيذي

النظام يحتوي على حقل `receipt_mode: 'direct' | 'international'` في جدول `purchase_transactions` يُحدد نوع الشراء. المنطق موجود في عدة طبقات لكن **هناك فجوات في التكامل بين المحلي والدولي**.

---

## ✅ ما هو موجود ويعمل

### 1. حقل `receipt_mode` في الـ Database
```
purchase_transactions.receipt_mode = 'direct' | 'international'
```
- **الافتراضي:** `'direct'` (محلي)
- **موجود في:** `PurchaseTransaction` type (transactions.ts:106)
- **يُحفظ عند الإنشاء:** `purchaseTransactionService.ts:46`

### 2. واجهة اختيار النوع (TradeHeader)
- **ملف:** `TradeHeader.tsx:402-448`
- **الوظيفة:** زر Toggle يتيح الاختيار بين:
  - 🟢 **محلي (Direct)** — أيقونة شاحنة، خلفية خضراء
  - 🔵 **دولي (International)** — أيقونة كرة أرضية، خلفية زرقاء
- **سلوك ذكي:** عند اختيار "دولي" → يُغيّر العملة تلقائياً إلى USD
- **ملاحظة Help:** "محلي: مشتريات داخلية تظهر لأمين المستودع للاستلام المباشر. دولي: مشتريات خارجية تُضاف إلى كونتينر شحن"

### 3. تكامل المستودعات (useReceiptSources)
- **ملف:** `useReceiptSources.ts`
- **المنطق:** 
  - يجلب فواتير بمرحلة `invoice/posted/partial_paid/partially_received`
  - يفرق بين المحلي والدولي:
    ```typescript
    const isLocal = pi.receipt_mode === 'direct';
    type: isLocal ? 'purchase_invoice_local' : 'purchase_transaction'
    ```
  - **المحلي** → يظهر في إشعارات المستودع للاستلام المباشر 
  - **الدولي** → يظهر في قائمة الكونتينرات

### 4. نظام الكونتينرات (الهيكل الأساسي)
- **ملفات:**
  - `ContainersList.tsx` — قائمة الحاويات مع Kanban + List view
  - `AddContainerSheet.tsx` — إنشاء كونتينر جديد وربط الفواتير
- **الحالات:** `ordered → shipped → at_port → cleared → received`
- **الجداول:** `shipments` + `shipment_items` + `shipment_costs`

### 5. ربط الفواتير بالكونتينرات
- **في `AddContainerSheet.tsx:86-101`:**
  - يجلب فواتير `stage = 'posted'` بدون `shipment_id`
  - يربطها بالكونتينر عند الحفظ (`update { shipment_id: shipment.id }`)

---

## ✅ الإصلاحات المنجزة (2026-02-16)

### ✅ إصلاح 1: فلتر الفواتير في AddContainerSheet — `receipt_mode` filter
- **الملف:** `AddContainerSheet.tsx:94`
- **التغيير:** أُضيف `.eq('receipt_mode', 'international')` + وسّعت الـ stages لتشمل `['invoice', 'posted', 'partial_paid']`
- **النتيجة:** الآن **فقط** الفواتير الدولية تظهر عند ربطها بكونتينر ✅

### ✅ إصلاح 2: توحيد الكتابة — `containers` + `shipments` معاً
- **الملف:** `AddContainerSheet.tsx:117-195`
- **التغيير:** `AddContainerSheet` الآن:
  1. يكتب أولاً في جدول `containers` (الذي تقرأه `ContainersList`)
  2. ثم يُنشئ سجل `shipments` مقابل (لحسابات Landed Cost)
  3. يربط الإثنين عبر `containers.shipment_id`
  4. يربط الفواتير بالـ `shipment` للتتبع المالي
- **Migration:** `20260216_containers_unification.sql` — أضاف الأعمدة الناقصة لجدول `containers`

### ✅ إصلاح 3: حماية `receipt_mode` من التبديل بعد الربط
- **الملف:** `TradeHeader.tsx:103-123`
- **التغيير:** أُضيف guard يمنع التبديل من `international` → `direct` إذا الفاتورة مرتبطة بـ `shipment_id`
- **UI:** الزر يظهر بـ opacity منخفضة + title tooltip يوضح السبب

### 🟡 ملاحظة: إشعارات المستودع
- **الوضع الحالي:** `useReceiptSources` يفرق بين المحلي والدولي بشكل صحيح
- **المطلوب مستقبلاً:** إضافة push notification لأمين المستودع عند فاتورة محلية جديدة

---

## 🏗️ الخطوة التالية: تكامل الكونتينرات

### المطلوب لتفعيل دورة المشتريات الدولية بالكامل:

| الخطوة | الحالة | التفاصيل |
|--------|--------|----------|
| 1. إصلاح الفلتر في AddContainerSheet | ✅ مُنجز | أُضيف `receipt_mode = 'international'` |
| 2. توحيد `containers` ↔ `shipments` | ✅ مُنجز | الآن يكتب في containers أولاً ثم shipments |
| 3. حماية receipt_mode | ✅ مُنجز | guard + UI lock عند وجود shipment_id |
| 4. إشعار المستودع للفواتير المحلية | 🟡 مؤجل | Push notification — مرحلة لاحقة |
| 5. Landed Cost Integration | 🔵 مرحلة لاحقة | حساب التكلفة النهائية |
| 6. خط زمني للكونتينر | 🔵 مرحلة لاحقة | Timeline tracking |

---

## 🗂️ خريطة الملفات المتعلقة

| الملف | الدور |
|-------|-------|
| `src/types/transactions.ts` | تعريف `receipt_mode` في `PurchaseTransaction` |
| `src/features/trade/components/forms/TradeHeader.tsx` | واجهة اختيار محلي/دولي |
| `src/features/trade/services/TradeService.ts` | حفظ وتحديث `receipt_mode` |
| `src/services/purchaseTransactionService.ts` | إنشاء فاتورة مع `receipt_mode` |
| `src/features/warehouse/hooks/useReceiptSources.ts` | جلب مصادر الاستلام (يفرق بين محلي/دولي) |
| `src/features/purchases/pages/ContainersList.tsx` | قائمة الكونتينرات |
| `src/features/purchases/components/AddContainerSheet.tsx` | إنشاء كونتينر وربط الفواتير |

# 🔧 خطة إصلاح حركات المخزون — مراحل مجزأة

## 📋 المشاكل المكتشفة:

| # | المشكلة | السبب الجذري | الأولوية |
|---|---------|-------------|----------|
| 1 | بنود المواد في الكونتينر لا تظهر عند المتابعة | `container_items` فارغ أو لم يُربط - الكونتينر لا يحمّل بنوده | 🔴 عالية |
| 2 | كبسة الحذف لا تعمل | لا يوجد handler متصل بزر الحذف في القائمة المنسدلة | 🟡 متوسطة |
| 3 | وظيفة كبسة الحفظ غير واضحة | "حفظ" = إتمام الاستلام نهائياً (ليس حفظ مسودة) — تحتاج توضيح للمستخدم | 🟡 متوسطة |
| 4 | Realtime لا يعمل (أخطاء Console) | الجداول غير مفعّلة في Supabase Realtime | 🟠 تحتاج SQL |

---

## 🔴 المرحلة 1: إصلاح بنود الكونتينر (الأهم)

### المشكلة:
عند فتح MaterialReceiptDialog للكونتينر:
- `selectedDocument.items` = فارغ (0 بنود)
- لأن `container_items` لم يُملأ أو لم يُربط بالكونتينر
- المسودة المحفوظة (`draft_data.items`) تحتوي الرولونات لكن لا sourceItems

### الحل:
1. **فحص جدول `container_items`** — هل يحتوي بيانات لهذا الكونتينر؟
2. إذا كان فارغاً: **بناء items من `purchase_invoice_items`** المرتبطة بالكونتينر
3. التأكد أن `loadDraft` يعمل بشكل صحيح ويحمّل `liveReceiptItems`
4. عرض البنود المحفوظة في المسودة عند الفتح

### الملفات:
- `useReceiptSources.ts` — بند الكونتينر (containerDocs items)
- `MaterialReceiptDialog.tsx` — loadDraft + عرض البنود

---

## 🟡 المرحلة 2: كبسة الحذف

### المشكلة:
زر "حذف" في القائمة المنسدلة (`...`) لا يحتوي على handler

### الحل:
1. إضافة `deleteDraftReceipt` في `warehouseService.ts`
2. ربط زر الحذف بـ handler يحذف المسودة من `purchase_receipts`
3. إعادة تحميل البيانات بعد الحذف
4. رسالة تأكيد قبل الحذف

### الملفات:
- `warehouseService.ts` — دالة الحذف
- `MaterialReceiptDialog.tsx` أو `StockMovementsPage.tsx` — الزر

---

## 🟡 المرحلة 3: توضيح أزرار الحفظ

### الوظائف الحالية:
| الزر | الوظيفة الحالية | الوظيفة المطلوبة |
|------|----------------|-----------------|
| **حفظ** 💾 | `completeReceipt()` = إتمام الاستلام نهائياً + إنشاء حركة مخزون + قيد محاسبي | ✅ صحيح — هو "تأكيد الاستلام" |
| **إلغاء** ✕ | `handleClose()` = حفظ المسودة + إغلاق | ✅ صحيح — يحفظ المسودة تلقائياً |
| **حذف** 🗑️ | لا يعمل | حذف المسودة بالكامل |

### الحل:
1. تغيير نص "حفظ" إلى **"✅ تأكيد الاستلام"** / **"Confirm Receipt"**
2. إضافة tooltip يوضح الوظيفة
3. تغيير tooltip "إلغاء" إلى "حفظ مسودة وإغلاق"

---

## 🟠 المرحلة 4: Realtime (SQL)

تنفيذ SQL على Supabase لتفعيل Realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE containers;
-- etc.
```

---

## ⚡ ترتيب التنفيذ:
1. المرحلة 1 (بنود الكونتينر) ← **الأهم**
2. المرحلة 3 (توضيح الأزرار) ← **سريع**
3. المرحلة 2 (كبسة الحذف) ← **متوسط**
4. المرحلة 4 (Realtime SQL) ← **يحتاج Supabase**

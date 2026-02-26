# 📋 خطة إصلاح نظام الاستلام والمعلقات

## حالة التنفيذ: 🔄 قيد العمل

---

## الجزء 1: إصلاح ظهور المعلقات (getPendingReceipts) ✅ مكتمل
- [x] إضافة lookup للموردين من جدول suppliers
- [x] إصلاح supplier_name في الفواتير والطلبات
- [x] إضافة الكونتينرات للمعلقات (فقط customs, cleared, at_port)
- [x] إصلاح تنسيق التواريخ (أرقام إنجليزية)

## الجزء 2: إضافة Realtime Listener للكونتينرات ✅ مكتمل
- [x] إضافة listener لجدول `containers`
- [x] إضافة listener لجدول `purchase_receipts`

## الجزء 3: إصلاح حفظ البيانات في MaterialReceiptDialog ✅ مكتمل
- [x] إصلاح loadDraft ليشمل البحث عن `container_id` (كان يبحث فقط عن invoice_id و order_id)
- [x] إضافة `created_at` لاستعلام المسودة

## الجزء 4: عداد الوقت + أنماط الكونتينرات ✅ مكتمل
- [x] إضافة أنماط حالات الكونتينرات (بالجمركة، مخلّص، بالميناء)
- [x] عداد الوقت للمسودات (منذ X ساعة / يوم)

## الجزء 5: قفل المستند عند الاستلام ✅ مكتمل
- [x] عند إنشاء مسودة → تحديث receipt_status إلى 'in_progress'
- [x] عرض badge "قيد الاستلام" في المعلقات (animate-pulse)
- [x] كبسة "متابعة" تظهر لحالتي draft و in_progress

## الجزء 6: التصنيف الصحيح بين التبويبات ⬜ للمراجعة
- المستلمة (completed receipt) → تبويب "الاستلامات" (IN)
- المسلّمة → تبويب "التسليمات" (OUT)
- المسودة (draft) + المعلقة → تبويب "المعلقة"

---

## ملخص التغييرات:

### الملفات المعدّلة:
1. **`useWarehouseQueries.ts`** → أضفنا realtime listeners لـ containers و purchase_receipts
2. **`MaterialReceiptDialog.tsx`** → أصلحنا loadDraft ليشمل container_id
3. **`warehouseService.ts`** → 
   - فلتر الكونتينرات: customs, cleared, at_port فقط
   - قفل المستند المصدر (in_progress) عند إنشاء المسودة
4. **`StockMovementsPage.tsx`** → 
   - أنماط حالات الكونتينرات
   - عداد الوقت للمسودات
   - حالة in_progress مع animate-pulse
   - كبسة "متابعة" لـ draft و in_progress

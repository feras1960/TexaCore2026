# تحليل التكرار: containers vs shipments

تاريخ: 2026-02-17

---

## خريطة الاستخدام الفعلي

### النظام القديم (containers) -- مستخدم بكثافة:

| الجدول | الملفات التي تستخدمه | عدد الاستخدامات |
|--------|---------------------|----------------|
| containers | containersService.ts, ContainersList.tsx, AddContainerSheet.tsx, ContainerStatusStepper.tsx, ContainerSelector.tsx, ContainerInfoCard.tsx, ShipmentItemsTab.tsx, useReceiptSources.ts, useSheetActions.ts | 9 ملفات |
| container_items | containersService.ts, ShipmentItemsTab.tsx, useReceiptSources.ts | 3 ملفات |
| container_expenses | containersService.ts, ContainerExpensesTab.tsx | 2 ملفات |

### النظام الجديد (shipments) -- استخدام محدود:

| الجدول | الملفات التي تستخدمه | عدد الاستخدامات |
|--------|---------------------|----------------|
| shipments | AddContainerSheet.tsx (ينشئ shipment عند انشاء container ← ربط) | 1 ملف |
| shipment_items | TransitCartDrawer.tsx (يحدث reserved_quantity) | 1 ملف |
| shipment_costs | لا يوجد اي استخدام! | 0 ملفات |
| transit_reservations | TransitCartDrawer.tsx (يحفظ الحجوزات) | 1 ملف |

### صفحة Shipments.tsx:
- صفحة **فارغة تماما** — مجرد عنوان بدون محتوى (27 سطر)

---

## المشكلة الحالية

عند انشاء كونتينر جديد (AddContainerSheet):
1. ينشئ سجل في `containers` (الجدول الرئيسي)
2. ينشئ سجل **مكرر** في `shipments` (للـ landed cost)
3. يربطهما: `containers.shipment_id = shipments.id`

**النتيجة:** بيانات مكررة + صعوبة في المزامنة

عند الحجز (TransitCartDrawer):
- يكتب الحجوزات في `transit_reservations` (مرتبط بـ shipments)
- يحدث `shipment_items.reserved_quantity` (بدل container_items)

---

## الخيارات المتاحة

### الخيار 1: حذف shipments نهائيا (غير مستحسن)
- خطر: transit_reservations مرتبط بـ shipments.id و shipment_items.id
- خطر: قد يوجد بيانات فعلية في الانتاج

### الخيار 2: دمج shipments في containers (مستحسن)
نقل الاعمدة الغنية من shipment_costs الى container_expenses وترك الجداول القديمة فارغة.

**المشكلة:** TransitCartDrawer يكتب في shipment_items و transit_reservations

### الخيار 3: توحيد تدريجي (الانسب)

**المرحلة 1 (الان):** نعمل على containers فقط، ونضيف الاعمدة الناقصة
**المرحلة 2 (لاحقا):** نعيد توجيه TransitCartDrawer ليكتب في container_items
**المرحلة 3 (لاحقا):** نؤرشف shipments + shipment_items + shipment_costs

---

## التوصية النهائية: الخيار 3 (توحيد تدريجي)

### ما نعمله الان (ضمن خطتنا الحالية):

1. **نعمل 100% على الجداول القديمة:**
   - containers ← الجدول الرئيسي
   - container_items ← بنود البضائع
   - container_expenses ← المصاريف (نضيف الاعمدة الناقصة)

2. **لا نمس shipments/shipment_costs:**
   - تبقى كما هي حاليا
   - TransitCartDrawer يستمر بالكتابة فيها (الحجوزات)

3. **في المستقبل (مرحلة منفصلة):**
   - ننقل وظيفة الحجوزات من transit_reservations الى container_reservations
   - نعدل TransitCartDrawer ليكتب في container_items
   - نحذف او نؤرشف: shipments, shipment_items, shipment_costs, transit_reservations
   - نحذف صفحة Shipments.tsx الفارغة

### لماذا هذا الخيار؟

| السبب | التفصيل |
|-------|---------|
| لا نكسر شيء | الحجوزات والعربة تستمر بالعمل |
| نتجنب التشتت | نركز على المصاريف والقيود حاليا |
| نتجنب خطر فقدان بيانات | لا نحذف جداول فيها بيانات |
| ترتيب تدريجي | كل مرحلة مستقلة وآمنة |

### ما لا نحتاج عمله الان:

- لا نحتاج حذف shipments
- لا نحتاج migration لنقل بيانات
- لا نحتاج تعديل TransitCartDrawer
- لا نحتاج تعديل AddContainerSheet (يمكن لاحقا نوقف انشاء shipment المكرر)

---

## ملخص

```
الوضع الحالي:
  containers ← يعمل، نحسنه
  shipments  ← شبه مهجور، نتركه مؤقتا
  
بعد المرحلة 6B + 7:
  containers ← محسن بالكامل (مصاريف + قيود + حالات)
  shipments  ← لم يتغير
  
مستقبلا (مرحلة منفصلة):
  containers ← الوحيد المستخدم
  shipments  ← محذوف/مؤرشف
```

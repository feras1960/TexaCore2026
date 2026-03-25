# 📋 وثيقة توحيد الكونتينرات — 2026-02-17

## الحالة: ✅ مكتمل

---

## ما تم تنفيذه

### 1. قاعدة البيانات (Migration)

**الملف:** `supabase/migrations/20260217_01_unify_containers_archive_shipments.sql`

| الإجراء | التفاصيل |
|---------|---------|
| ✅ إضافة `container_id` | purchase_invoices, purchase_receipts, payment_vouchers |
| ✅ إضافة `container_item_id` | purchase_receipt_items |
| ✅ إنشاء `container_reservations` | بديل transit_reservations مع RLS كامل |
| ✅ إضافة أعمدة expenses | container_account_id, journal_description |
| ✅ إضافة أعمدة items | estimated_unit_cost, estimated_total_cost |
| ✅ أرشفة 5 جداول | أُعيدت تسميتها بـ _archived_ prefix |
| ✅ حذف `containers.shipment_id` | لم يعد مطلوباً |

### 2. الجداول المؤرشفة (غير مفعلة)

| الجدول الأصلي | الجدول المؤرشف | السبب |
|--------------|---------------|------|
| shipments | _archived_shipments | توحيد مع containers |
| shipment_items | _archived_shipment_items | توحيد مع container_items |
| shipment_documents | _archived_shipment_documents | غير مستخدم |
| shipments_tracking | _archived_shipments_tracking | غير مستخدم |
| transit_reservations | _archived_transit_reservations | بُدّل بـ container_reservations |

**⚠️ ملاحظة للمطورين:** هذه الجداول مؤرشفة ولا يجب استخدامها. عند التطوير لاحقاً، استخدم فقط:
- `containers` + `container_items` + `container_expenses` + `container_reservations`

### 3. الملفات المعدلة

| الملف | التغيير |
|-------|---------|
| `TransitCartDrawer.tsx` | `transit_reservations` → `container_reservations`, `shipment_items` → `container_items` |
| `AddContainerSheet.tsx` | إزالة إنشاء shipment مكرر، ربط الفواتير عبر `container_id` مباشرة |
| `ContainerInvoiceSelector.tsx` | `.is('shipment_id', null)` → `.is('container_id', null)` |
| `App.tsx` | إزالة route `/shipments/*` وشطب import Shipments |

### 4. الملف المحذوف/المعطل

| الملف | الحالة |
|-------|-------|
| `src/features/shipments/Shipments.tsx` | الـ route أُزيل (الملف لا يزال موجوداً لكن لا يُحمّل) |

---

## الجداول النشطة الآن

```
✅ containers ← الكونتينرات (65 عمود)
✅ container_items ← بنود الكونتينر (42 عمود)
✅ container_expenses ← المصاريف (42 عمود)
✅ container_reservations ← حجوزات بضائع الطريق (جديد)
✅ container_cost_allocations ← توزيع التكاليف
✅ container_expense_allocations ← توزيع المصاريف
✅ container_quotations ← عروض أسعار
✅ container_quotation_items ← بنود العروض
```

## خريطة الارتباطات الجديدة

```
purchase_invoices ──→ containers (عبر container_id) ← جديد
purchase_receipts ──→ containers (عبر container_id) ← جديد
purchase_receipt_items ──→ container_items (عبر container_item_id) ← جديد
payment_vouchers ──→ containers (عبر container_id) ← جديد
container_reservations ──→ containers (عبر container_id) ← جديد
container_reservations ──→ container_items (عبر container_item_id) ← جديد
container_items ──→ containers (عبر container_id) ← قائم
container_expenses ──→ containers (عبر container_id) ← قائم
```

**ملاحظة:** الأعمدة القديمة (`shipment_id`) لا تزال موجودة في الجداول لكنها **لم تعد مستخدمة في الكود**. يمكن حذفها مستقبلاً في migration تنظيف.

---

## التحقق

```
✅ TypeScript compilation: لا أخطاء جديدة
✅ DB migration: نجح بالكامل
✅ لا يوجد أي ملف يشير لـ from('shipments') أو from('shipment_items')
✅ الجداول المؤرشفة موسومة بتعليقات ⚠️
```

# 📋 توثيق المرحلة 13B-3: سلة حجوزات الترانزيت
## Phase 13B-3: Transit Reservation Cart — Implementation Log
> **التاريخ:** 2026-02-11 | **المدة:** ~2 ساعات | **الحالة:** ✅ مُكتمل

---

## 📌 الهدف
تمكين فريق المبيعات من حجز بضائع الكونتينرات أثناء الترانزيت (قبل وصولها) من خلال سلة تفاعلية داخل تبويب بنود الكونتينر.

---

## 🗂️ الملفات الجديدة

### 1. `src/features/trade/hooks/useTransitCart.ts`
**النوع:** React Hook  
**المسؤولية:** إدارة حالة سلة حجوزات الترانزيت

| الميزة | التفاصيل |
|--------|---------|
| State Management | إضافة/حذف/تعديل كميات وأسعار |
| Customer Selection | اختيار العميل مع معلومات الرصيد وحد الائتمان |
| Persistence | حفظ السلة في localStorage لكل shipment_id |
| Available Qty | تتبع الكمية المتاحة بعد خصم المحجوزات |

**الأنواع المُصدّرة:**
- `TransitCartItem` — بند في السلة
- `TransitCartCustomer` — بيانات العميل
- `TransitCartState` — حالة السلة الكاملة
- `UseTransitCartReturn` — واجهة الـ Hook

---

### 2. `src/features/trade/components/TransitCartDrawer.tsx`
**النوع:** React Component  
**المسؤولية:** واجهة السلة الجانبية (Sheet Drawer)

| القسم | التفاصيل |
|-------|---------|
| Customer Search | بحث ديناميكي بالاسم أو الكود |
| Item Cards | بطاقات بنود مع تعديل الكمية (+/-) والسعر |
| Quantity Warning | تنبيه عند حجز أكثر من 80% من المتاح |
| Advance Payment | حقل دفعة مقدمة اختياري مع حساب النسبة |
| Summary | ملخص الإجمالي والمتبقي عند التسليم |
| Submit | تأكيد الحجز → إدخال في transit_reservations + تحديث reserved_quantity |
| Floating Button | زر عائم مع عدد البنود والإجمالي |

---

### 3. `supabase/migrations/20260211_transit_reservations.sql`
**النوع:** SQL Migration  
**الحالة:** ✅ مُنفّذ في 2026-02-11

| العنصر | التفاصيل |
|--------|---------|
| الجدول | `transit_reservations` — IF NOT EXISTS |
| Constraint | UNIQUE(tenant_id, reservation_number) |
| Indexes | 4 فهارس أداء (shipment_id, customer_id, shipment_item_id, status) |
| RLS | unified pattern — auth.uid() IS NOT NULL |
| Function | `increment_reserved_quantity(p_item_id, p_quantity)` — SECURITY DEFINER |

---

### 4. `supabase/seed/03_test_data_phase_13b.sql`
**النوع:** بيانات تجريبية  
**الحالة:** جاهز للتنفيذ

| البيانات | التفاصيل |
|----------|---------|
| فواتير مشتريات | 3 فواتير (PI-TUR-2024-001, PI-TUR-2024-002, PI-IND-2024-001) |
| تحديث بنود | 9 بنود محدّثة بالأعمدة الجديدة |
| عملاء | إنشاء عميلَين تجريبيَين إذا لم يوجد |
| حجوزات ترانزيت | 2 حجز (TR-2024-001 حرير أبيض, TR-2024-002 كتان بيج) |
| هامش الربح | 18% صين, 25% تركيا, 20% هند |

---

## 🔧 الملفات المُعدّلة

### `src/features/trade/components/tabs/ShipmentItemsTab.tsx`
**التعديلات:**
- Import: إضافة `useTransitCart` و `TransitCartDrawer`
- State: تهيئة `transitCart` hook مع `shipmentId`
- Table Header: عمود جديد "حجز/Reserve" (RBAC-controlled)
- Table Row: زر "أضف للسلة" أو badge "في السلة ✅"
- Main Render: إضافة `<TransitCartDrawer>` مع gate `canCreateReservation`

---

## 🔒 الأمان (RBAC)
| القاعدة | التوثيق |
|---------|---------|
| عمود الحجز | يظره فقط إذا `permissions.canCreateReservation` |
| بيانات التكلفة | مخفية عن فريق المبيعات |
| RLS | unified pattern — auth.uid() IS NOT NULL |

---

## 🏗️ هيكل قاعدة البيانات

### جدول `transit_reservations`
```
id                     UUID PK
tenant_id             UUID FK → tenants
company_id            UUID FK → companies
branch_id             UUID FK → branches
reservation_number    VARCHAR(50) UNIQUE(tenant_id, ...)
reservation_date      DATE
customer_id           UUID FK → customers
customer_name         VARCHAR(200) denormalized
shipment_id           UUID FK → shipments
shipment_item_id      UUID FK → shipment_items
material_id           UUID FK → fabric_materials
color_id              UUID FK → fabric_colors
product_id            UUID FK → products
reserved_quantity     DECIMAL(15,3)
unit                  VARCHAR(20) default 'meter'
unit_price            DECIMAL(15,4)
total_amount          DECIMAL(15,2)
advance_amount        DECIMAL(15,2) default 0
advance_received      BOOLEAN default false
status                VARCHAR(20) default 'pending'
  → pending | confirmed | ready | delivered | cancelled
expected_delivery_date DATE
actual_delivery_date   DATE
sales_invoice_id      UUID FK → sales_invoices
notes                 TEXT
created_by            UUID
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

### دالة `increment_reserved_quantity`
```sql
increment_reserved_quantity(p_item_id UUID, p_quantity DECIMAL)
-- Updates shipment_items.reserved_quantity atomically
-- SECURITY DEFINER for RLS bypass
```

---

## 📊 تدفق العملية (Workflow)

```
1. المستخدم يفتح تبويب "بنود الكونتينر"
2. يضغط زر [+ 🛒] على البند المراد حجزه
3. البند يُضاف للسلة مع الكمية الأولية
4. يظهر زر عائم أسفل الشاشة (عدد البنود + الإجمالي)
5. يفتح الدرج الجانبي (Sheet)
6. يختار العميل (بحث ديناميكي)
7. يعدّل الكميات والأسعار حسب الحاجة
8. يحدد الدفعة المقدمة (اختياري)
9. يضغط "تأكيد الحجز"
10. ← يُنشئ سجلات في transit_reservations
11. ← يُحدّث reserved_quantity في shipment_items
12. ← تُمسح السلة
```

---

## ✅ اختبارات مطلوبة
- [ ] إضافة بند للسلة من جدول البنود
- [ ] ظهور badge "في السلة" بعد الإضافة
- [ ] الزر العائم يعرض العدد والإجمالي
- [ ] البحث عن عميل واختياره
- [ ] تعديل الكمية (+ / - / مباشر)
- [ ] تعديل السعر
- [ ] إضافة دفعة مقدمة
- [ ] تأكيد الحجز (إنشاء في DB)
- [ ] تحديث reserved_quantity في shipment_items
- [ ] مسح السلة بعد التأكيد
- [ ] حفظ السلة في localStorage (persistence)
- [ ] RBAC: إخفاء عمود الحجز عن الأدوار غير المسموحة

---

## 🔗 المرحلة التالية
**13B-4: RBAC — صلاحيات الأسعار والبيانات** [2-3 ساعات]
- تحسين `useContainerPermissions` لصلاحيات دقيقة
- إخفاء/إظهار أعمدة حسب الدور (admin/manager/sales)
- حماية أسعار التكلفة من فريق المبيعات

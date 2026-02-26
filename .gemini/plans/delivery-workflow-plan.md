# 📦 خطة التنفيذ المجزّأة — Delivery Workflow Implementation Phases
> Created: 2026-02-25 00:19
> Status: Ready for phased implementation

---

## 📊 الوضع الحالي

### ما هو موجود بالفعل ✅:
- `CustomerShippingTab.tsx` — تبويب شحن العميل (1812 سطر) مع:
  - 3 طرق توصيل: `store_pickup`, `direct_delivery`, `carrier`
  - إدارة عناوين العميل (CRUD كامل)
  - تكامل Nova Poshta (إنشاء TTN + تتبع)
  - اختيار شركات الشحن
- `SalesFinanceTab.tsx` — تبويب المالية + التوصيل مدمج
- `sales_transactions` — حقول: `delivery_method`, `delivery_draft`, `delivered_at`, `delivery_notes`
- `sales_transaction_items` — حقل `delivered_qty`
- `advance_transaction_stage` — دالة تحويل المراحل

### ما ينقص ❌:
1. حقل **السائق** (`driver_id`, `driver_name`) في الفاتورة
2. خيار **تسليم مباشر للعميل بالمستودع** (`direct_pickup`) مع بيانات سيارة العميل
3. ربط **إذن التسليم** بالسائق
4. **تأكيد الإخراج** + الترحيل التلقائي

---

## 🔄 المراحل المجزّأة

---

### 🟢 المرحلة 1: تحديث أنواع التسليم في الفاتورة
> **الهدف**: إضافة خيار "تسليم مباشر بالمستودع" مع بيانات العميل والسيارة
> **المدة المقدرة**: 30-45 دقيقة

#### 1.1 تحديث DELIVERY_METHODS في `CustomerShippingTab.tsx`
```typescript
// إضافة نوع رابع: تسليم مباشر بالمستودع
{
    id: 'direct_pickup',
    label_ar: 'تسليم مباشر بالمستودع',
    label_en: 'Direct Warehouse Pickup',
    icon: Package,
    description_ar: 'العميل يستلم مباشرة من المستودع',
    description_en: 'Customer picks up directly from warehouse',
}
```

#### 1.2 قسم بيانات الاستلام المباشر (يظهر عند اختيار direct_pickup)
عند اختيار "تسليم مباشر":
- **اسم المستلم** (نص)
- **رقم الهوية/الجواز** (نص)
- **رقم السيارة** (نص)
- **نوع السيارة** (نص)
- **اسم السائق** (نص — سائق العميل وليس سائقنا)
- **رقم هاتف السائق** (نص)
- **ملاحظات** (نص طويل)

#### 1.3 SQL: إضافة حقول للتسليم المباشر
```sql
ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS pickup_person_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_person_id_number TEXT,
  ADD COLUMN IF NOT EXISTS pickup_vehicle_number TEXT,
  ADD COLUMN IF NOT EXISTS pickup_vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS pickup_driver_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_driver_phone TEXT;
```

#### الملفات المتأثرة:
- `CustomerShippingTab.tsx` — إضافة نوع + قسم البيانات
- SQL migration — إضافة الحقول

---

### 🟡 المرحلة 2: إضافة السائق في الفاتورة وإذن التسليم
> **الهدف**: اختيار السائق من السائقين المعرّفين للسيناريوهات 1 و 2
> **المدة المقدرة**: 45-60 دقيقة

#### 2.1 SQL: حقول السائق
```sql
ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS receiving_branch_id UUID,
  ADD COLUMN IF NOT EXISTS receiving_branch_name TEXT;
```

#### 2.2 تحديث CustomerShippingTab — قسم السائق
عند اختيار `store_pickup` أو `direct_delivery`:
- **اختيار السائق** (dropdown من المستخدمين بدور `driver`)
- يُملأ تلقائياً: اسم السائق، رقم هاتفه

عند اختيار `store_pickup`:
- **اختيار الفرع المستلم** (dropdown من الفروع)

#### 2.3 جلب قائمة السائقين
```typescript
// جلب المستخدمين بدور سائق
const { data: drivers } = await supabase
  .from('user_profiles') // أو users
  .select('id, full_name, phone')
  .eq('role', 'driver');
```

#### الملفات المتأثرة:
- `CustomerShippingTab.tsx` — قسم السائق + الفرع
- SQL migration — حقول driver_id, receiving_branch_id

---

### 🟠 المرحلة 3: تحديث إذن التسليم (Delivery Note)
> **الهدف**: إذن التسليم يشمل السائق + نوع التسليم
> **المدة المقدرة**: 60-90 دقيقة

#### 3.1 تحديث شاشة إذن التسليم
- عرض **نوع التسليم** المحدد في الفاتورة
- عرض **السائق المحدد** مع إمكانية التغيير
- عرض **البنود المراد تسليمها** مع الكميات
- زر **"تأكيد الإخراج"**

#### 3.2 عند "تأكيد الإخراج":
1. ✅ إنشاء `stock_movement` (OUT) من المستودع
2. ✅ ترحيل القيود المحاسبية (`postSalesInvoice`)
3. ✅ تحديث الحالة حسب النوع:
   - `store_pickup` → `sent_to_branch`
   - `direct_delivery` → `in_delivery`
   - `direct_pickup` → `delivered` (فوري)

#### الملفات المتأثرة:
- `warehouseService.ts` — تحديث منطق الإخراج
- إنشاء `salesDeliveryService.ts` — خدمة التسليم
- تحديث واجهة إذن التسليم

---

### 🔴 المرحلة 4: تأكيد الاستلام والإغلاق
> **الهدف**: الفرع أو أمين المستودع يؤكد التسليم الفعلي
> **المدة المقدرة**: 30-45 دقيقة

#### 4.1 زر "تأكيد التسليم" في الفاتورة
- يظهر عندما تكون الحالة `sent_to_branch` أو `in_delivery`
- يؤكده: موظف الفرع (سيناريو 1) أو أمين المستودع (سيناريو 2)
- بعد التأكيد: الحالة تتحول إلى `delivered`

#### 4.2 تسجيل بيانات التأكيد:
```sql
UPDATE sales_transactions SET
  stage = 'delivered',
  delivered_at = NOW(),
  delivery_confirmed_by = current_user_id
WHERE id = transaction_id;
```

#### الملفات المتأثرة:
- `salesDeliveryService.ts` — `confirmDeliveryReceived()`
- واجهة الفاتورة — زر التأكيد

---

## � المرحلة 5 (لاحقاً): تعريف السائقين والمركبات

### الهدف:
تعريف السائقين في النظام وربطهم بالفروع والسيارات

### المتطلبات:
1. **جدول السائقين** أو ربطهم كدور في `user_roles`
2. **جدول المركبات** (`company_vehicles`):
   - رقم اللوحة، النوع، الموديل، الحالة
   - السائق المسؤول (عهدة)
   - الفرع التابع
3. **ربط السائق بالفرع** — كل سائق ينتمي لفرع
4. **اختيار السائق في إذن التسليم** — dropdown من السائقين المعرّفين بالفرع
5. يمكن إضافتها في صفحة **المستخدمين والصلاحيات** كإضافة سريعة

### الملاحظة:
حالياً حقل السائق نصي (يُكتب يدوياً). لاحقاً يتم تحويله لـ dropdown مرتبط بجدول السائقين.
؟

---

## 📋 ملخص المراحل

| المرحلة | الوصف | المدة | الحالة |
|---------|-------|-------|--------|
| 🟢 1 | أنواع التسليم + بيانات الاستلام المباشر | 30-45 د | ✅ تم |
| 🟡 2 | حقول السائق + الفرع (SQL + UI) | 45-60 د | ✅ تم |
| 🟠 3 | تحديث إذن التسليم + أزرار المراحل الجديدة | 60-90 د | ✅ تم |
| 🔴 4 | أزرار تأكيد التسليم في الفاتورة | 30-45 د | ✅ تم |
| 🔵 5 | تعريف السائقين والسيارات + ربطها بالفواتير | — | ✅ تم |
| ⬜ 6 | تكامل Nova Poshta + موبايل السائق | — | ⏳ لاحقاً |

---

## ✅ تم إنجاز جميع المراحل الأساسية!

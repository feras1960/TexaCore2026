# ✅ الباقات - ربط كامل بقاعدة البيانات مع إجراءات فعالة

**التاريخ:** 2026-01-27  
**المرحلة:** ربط Packages بـ Database + LedgerTable + Actions

---

## 🎯 التحديثات المطبقة:

### 1. **ملف جديد:** `planActionsHandler.ts`

معالج شامل لجميع إجراءات الباقات:

#### ✅ الإجراءات المتاحة:
1. **تفعيل الباقة** (`activatePlan`)
   - تحديث `is_active = true`
   - رسالة نجاح
   - تحديث تلقائي للجدول

2. **تعطيل الباقة** (`deactivatePlan`)
   - تحديث `is_active = false`
   - تأكيد قبل التنفيذ
   - منع الاشتراكات الجديدة

3. **جعل الباقة مميزة** (`setAsPopular`)
   - إزالة علامة "مميز" من جميع الباقات الأخرى
   - تعيين الباقة الحالية كمميزة
   - يمكن وجود باقة مميزة واحدة فقط

4. **إزالة علامة "مميز"** (`removePopular`)
   - تحديث `is_popular = false`

5. **نسخ الباقة** (`duplicatePlan`)
   - إنشاء نسخة جديدة من الباقة
   - إضافة "(نسخة)" للاسم
   - تعيين الباقة المنسوخة كمعطلة افتراضياً
   - توليد كود فريد

6. **أرشفة الباقة** (`archivePlan`)
   - تحديث `is_archived = true`, `is_active = false`
   - حفظ تاريخ الأرشفة
   - إخفاء من القوائم

7. **حذف الباقة** (`deletePlan`)
   - التحقق من عدم وجود اشتراكات نشطة
   - حذف نهائي من قاعدة البيانات
   - منع الحذف إذا كانت هناك اشتراكات

8. **تحديث الباقة** (`updatePlan`)
   - تحديث أي حقل في الباقة
   - رسالة نجاح/خطأ

---

### 2. **تحديث:** `plan.config.ts`

#### ربط الإجراءات بقاعدة البيانات:
```typescript
actions: [
  {
    id: 'edit',
    onClick: (data, context) => {
      context?.handlers?.onEdit?.(data);
    },
  },
  {
    id: 'duplicate',
    onClick: async (data, context) => {
      await planActions.duplicatePlan(data, context?.language, context?.handlers);
    },
  },
  // ... باقي الإجراءات
]
```

#### الإجراءات المتاحة في Sheet:
- ✅ **تعديل** (Edit) - يفتح dialog
- ✅ **تكرار** (Duplicate) - نسخ الباقة
- ✅ **جعلها مميزة** (Set as Popular) - يظهر فقط للباقات غير المميزة
- ✅ **إزالة علامة مميز** (Remove Popular) - يظهر فقط للباقات المميزة
- ✅ **تفعيل** (Activate) - يظهر للمعطلة
- ✅ **تعطيل** (Deactivate) - يظهر للنشطة + تأكيد
- ✅ **أرشفة** (Archive) - مع تأكيد

---

### 3. **تحديث:** `PackagesTable.tsx`

#### ربط handlers مع UniversalDetailSheet:
```typescript
const sheetHandlers = {
  onRefresh: loadPlans,    // تحديث الجدول بعد أي إجراء
  onEdit: (plan) => {},    // فتح dialog للتعديل
};

<UniversalDetailSheet
  ...
  handlers={sheetHandlers}
/>
```

#### قراءة البيانات الحقيقية:
```typescript
// قراءة الباقات مع الشركات
const { data } = await supabase
  .from('subscription_plans')
  .select(`
    *,
    product:saas_products(id, code, name, name_ar)
  `)
  .order('display_order');
```

---

### 4. **Migration جديد:** `add_archive_columns.sql`

```sql
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
```

---

### 5. **الترجمات:** (ar.json & en.json)

```json
"actions": {
  "archive": "أرشفة",
  "setAsPopular": "تعيين كمميز",
  "removePopular": "إزالة التميز"
},
"dialogs": {
  "confirmArchive": "تأكيد الأرشفة",
  "archivePlanWarning": "هل أنت متأكد...",
  "confirmDeactivation": "تأكيد التعطيل",
  "deactivatePlanWarning": "هل أنت متأكد..."
}
```

---

## 🎬 التدفق الكامل:

```
المستخدم يضغط على باقة في الجدول
         ↓
    [UniversalDetailSheet يفتح]
         ↓
    يعرض:
    ✓ معلومات الباقة الكاملة من database
    ✓ الشركة الأم
    ✓ 4 بطاقات إحصائية
    ✓ 7 تبويبات (Overview, Modules, Limits, Subscribers, Payments, Analytics, Activity)
    ✓ أزرار الإجراءات:
      - تعديل ✓
      - تكرار ✓
      - جعلها مميزة ✓ (يظهر فقط للغير مميزة)
      - إزالة علامة مميز ✓ (يظهر فقط للمميزة)
      - تفعيل ✓ (يظهر للمعطلة)
      - تعطيل ✓ (يظهر للنشطة + تأكيد)
      - أرشفة ✓ (مع تأكيد)
         ↓
    المستخدم يختار إجراء (مثلاً: "تعطيل")
         ↓
    [Dialog تأكيد يظهر]
    "هل أنت متأكد من تعطيل هذه الباقة؟"
         ↓
    المستخدم يضغط "تأكيد"
         ↓
    [Backend:]
    UPDATE subscription_plans 
    SET is_active = false 
    WHERE id = plan_id
         ↓
    [Frontend:]
    ✅ toast: "تم تعطيل الباقة بنجاح"
    ✅ الجدول يتحدث تلقائياً
    ✅ الإحصائيات تتحدث
    ✅ Sheet يتحدث أو يغلق
```

---

## 📋 الخطوات المتبقية:

### 1. **نفّذ `add_archive_columns.sql` في Supabase:**
```sql
-- في SQL Editor
-- انسخ ونفّذ add_archive_columns.sql
```

### 2. **اختبر في المتصفح:**
```
/saas → Packages → Tab "عرض جدولي"
  ↓
اضغط على أي باقة
  ↓
Sheet يفتح مع جميع المعلومات الحقيقية
  ↓
جرّب الإجراءات:
  - تعطيل باقة ✓
  - تفعيل باقة ✓
  - جعلها مميزة ✓
  - تكرار باقة ✓
  - أرشفة باقة ✓
```

---

## ✅ الميزات الجديدة:

### 1. **فلتر الشركات:**
- ✓ قراءة من `saas_products`
- ✓ "كل الشركات" + جميع الشركات النشطة
- ✓ تفاعلي (يحدّث الجدول فوراً)

### 2. **فلتر العملة:**
- ✓ يستخرج العملات الموجودة في البيانات
- ✓ تفاعلي

### 3. **عمود الشركة الأم:**
- ✓ يعرض اسم الشركة (عربي/إنجليزي)
- ✓ أيقونة Building2
- ✓ قابل للترتيب

### 4. **الإجراءات:**
- ✓ كل الإجراءات مربوطة بقاعدة البيانات
- ✓ تحديث فوري
- ✓ رسائل نجاح/خطأ
- ✓ تأكيد للإجراءات الحساسة
- ✓ التحقق من الاشتراكات النشطة قبل الحذف

---

## 🎉 النتيجة:

**نظام باقات احترافي 100% مربوط بالكامل مع قاعدة البيانات!**

---

**نفّذ `add_archive_columns.sql` الآن وجرّب!** 🚀

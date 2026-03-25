# 📋 خطة دمج نظام الحالة الديناميكي — التحليل الشامل والتنفيذ

## 📅 التاريخ: 14 فبراير 2026

---

## 1️⃣ تحليل الوضع الحالي

### ✅ ما تم إنجازه (يعمل):
| البند | الحالة | ملاحظات |
|-------|--------|---------|
| جدول `custom_statuses` | ✅ | 29 حالة مُدخلة (11 purchase_invoice, 7 purchase_order, 3+ sales_invoice, 8 sales_order) |
| جدول `status_transitions` | ✅ | 45 تحولاً مُعرّفاً |
| مكون `StatusDropdown` | ✅ | يعمل — يسحب الحالات من DB ويعرضها كـ Popover |
| `PurchaseInvoicesList.tsx` (جدول) | ✅ | StatusDropdown في عمود الحالة |
| `SalesInvoicesList.tsx` (جدول) | ✅ | StatusDropdown في عمود الحالة |

### ❌ المشاكل المُكتشفة:

#### المشكلة 1: Kanban دورة المشتريات يحاول نسخ المستند
- **الملف**: `PurchaseCycleList.tsx`
- **السبب الجذري**: أعمدة الـ Kanban تمثل **أنواع المستندات** (طلب، عرض سعر، أمر، فاتورة، استلام) وليست **حالات المستند** (مسودة، مؤكد، مرحّل)
- **ماذا يحدث عند السحب**: الكود يستدعي `handleCreate(toColumn)` مما يفتح نموذج مستند جديد فارغ ❌
- **ما يجب أن يحدث**: تغيير حالة نفس المستند في قاعدة البيانات ✅

#### المشكلة 2: أعمدة Kanban لا تتطابق مع الحالات
- أعمدة الـ Kanban الحالية: `request | quotation | order | invoice | receipt | return`
- هذه أنواع مستندات وليست حالات! لذا السحب بينها لا معنى له كـ "تغيير حالة"
- **الحل**: يجب أن تكون أعمدة الـ Kanban = حالات المستند (draft, confirmed, posted, etc.)

#### المشكلة 3: Kanban المبيعات يعرض Badge ثابت
- كارت الـ Kanban في المبيعات كان يعرض `Badge` عادي بدلاً من `StatusDropdown`
- **تم إصلاحه جزئياً** — أُضيف StatusDropdown لكن `onCardMove` يحدّث DB مباشرة بدون استخدام `statusService`

#### المشكلة 4: StatusDropdown لا يظهر في نموذج الفاتورة (الـ Sheet)
- عند فتح أي مستند (كليك على صف)، النموذج `UnifiedTradeSheet` لا يعرض StatusDropdown
- المستخدم لا يستطيع تغيير الحالة من داخل نموذج التحرير

---

## 2️⃣ الحل المقترح

### المبدأ الأساسي:
> **Kanban = أعمدة الحالات** (draft → confirmed → posted → paid)  
> **ليس أعمدة أنواع المستندات** (طلب → عرض سعر → أمر → فاتورة)

### التغييرات المطلوبة:

---

### 🔧 الخطوة 1: إصلاح Kanban دورة المشتريات (PurchaseCycleList.tsx)

**الوضع الحالي**: الأعمدة = أنواع مستندات ← السحب يحاول نسخ المستند  
**الوضع المطلوب**: الأعمدة = حالات MSTند حسب التبويب النشط

**آلية العمل الجديدة:**
- عند اختيار تبويب **"الكل"** في Kanban → أعمدة بأنواع المستندات (كما هو) ← **يُمنع السحب بين الأعمدة** لأنه لا يمثل تغيير حالة
- عند اختيار تبويب **"أوامر الشراء"** → الأعمدة تتحول إلى: `مسودة | مُرسل | مؤكد | استلام جزئي | مستلم | مغلق | ملغي` ← **السحب = تغيير حالة حقيقي**
- عند اختيار تبويب **"فواتير المشتريات"** → الأعمدة: `مسودة | بانتظار المراجعة | معتمدة | مؤكدة | مرحّلة | مدفوعة جزئياً | مدفوعة | ملغية`

**التنفيذ:**
```tsx
// عند activeTab !== 'all' يتم تحميل الحالات من custom_statuses
const kanbanColumns = useMemo(() => {
    if (activeTab === 'all') return TYPE_BASED_COLUMNS; // الحالي
    // تحميل أعمدة حسب الحالات الفعلية من DB
    return statusBasedColumns; 
}, [activeTab, statusBasedColumns]);
```

**عند السحب (onCardMove):**
```tsx
onCardMove={async (itemId, fromColumn, toColumn) => {
    // 1. جلب المستند من enrichedDocuments
    const doc = enrichedDocuments.find(d => d.id === itemId);
    // 2. تحديد الجدول الصحيح (purchase_orders/purchase_invoices/...)
    const tableName = getTableForDocType(doc.type);
    // 3. تحديث الحالة في DB مباشرة
    await supabase.from(tableName).update({ status: toColumn }).eq('id', itemId);
    // 4. إبطال الكاش
    queryClient.invalidateQueries(['purchase_cycle_full']);
}}
```

---

### 🔧 الخطوة 2: إصلاح Kanban فواتير المبيعات (SalesInvoicesList.tsx)

**الوضع الحالي**: StatusDropdown أُضيف + `onCardMove` يحدّث DB مباشرة ✅  
**المشكلة**: يستخدم `supabase.update()` مباشرة بدلاً من `statusService.changeStatus()` مما يتجاوز تسجيل السجل

**الإصلاح:** استخدام `statusService.changeStatus()` بدلاً من الاستدعاء المباشر لقاعدة البيانات

---

### 🔧 الخطوة 3: تعطيل السحب في وضع "الكل" في الـ Kanban

عندما يكون التبويب "الكل" نشط، الأعمدة = أنواع مستندات. السحب بينها لا يمثل تغيير حالة.

**الحل**: إضافة رسالة واضحة عند محاولة السحب في وضع "الكل":
```
"⚠️ لتغيير الحالة، اختر تبويب نوع المستند (أوامر الشراء / الفواتير) ثم انتقل لوضع Kanban"
```
أو تعطيل السحب في هذا الوضع نهائياً.

---

### 🔧 الخطوة 4: ضمان ظهور StatusDropdown في كروت Kanban

- التحقق من أن `tenantId` يُمرر بشكل صحيح
- التحقق من أن `docTypeMap` يُرجع القيمة الصحيحة لكل نوع مستند
- إضافة `queryKey: ['purchase_cycle_full']` للإبطال بعد تغيير الحالة

---

## 3️⃣ ملخص التغييرات

| # | الملف | التغيير | التعقيد |
|---|-------|---------|---------|
| 1 | `PurchaseCycleList.tsx` | إعادة هيكلة Kanban: أعمدة حالات ديناميكية بدلاً من أنواع مستندات | 🔴 عالي |
| 2 | `PurchaseCycleList.tsx` | `onCardMove` يحدّث الحالة مباشرة (بدلاً من handleCreate) | 🟡 متوسط |
| 3 | `PurchaseCycleList.tsx` | تعطيل السحب في وضع "الكل" | 🟢 بسيط |
| 4 | `SalesInvoicesList.tsx` | تحسين `onCardMove` لاستخدام statusService | 🟡 متوسط |
| 5 | `StatusDropdown.tsx` | إضافة invalidation لـ `purchase_cycle_full` | 🟢 بسيط |

---

## 4️⃣ خريطة حالات Kanban (من قاعدة البيانات)

### أوامر الشراء (`purchase_order`):
```
مسودة ← مُرسل ← مؤكد ← استلام جزئي ← مستلم ← مغلق
              ↘ ملغي
draft → sent → confirmed → partially_received → received → closed
               ↘ cancelled
```

### فواتير المشتريات (`purchase_invoice`):
```
مسودة ← بانتظار ← معتمدة ← مؤكدة ← مرحّلة ← مدفوعة جزئياً ← مدفوعة
                                 ↘ ملغية / مرفوضة / متأخرة
draft → pending → approved → confirmed → posted → partially_paid → paid
                                         ↘ cancelled / rejected / overdue
```

### أوامر البيع (`sales_order`):
```
مسودة ← مؤكد ← قيد التجهيز ← تسليم جزئي ← مسلّم ← تمت الفوترة ← مغلق
                                                   ↘ ملغي
```

### فواتير المبيعات (`sales_invoice`):
```
الحالات المُعرّفة: pending | approved | overdue (ناقص draft, posted, paid, cancelled!)
⚠️ يحتاج إضافة حالات: draft, posted, partially_paid, paid, cancelled
```

---

## 5️⃣ مشكلة مُكتشفة: حالات فواتير المبيعات ناقصة!

الـ Kanban في المبيعات يستخدم أعمدة: `draft | posted | partially_paid | paid | cancelled`  
لكن قاعدة البيانات تحتوي فقط على: `pending | approved | overdue`

**⚠️ يجب إضافة الحالات الناقصة:**
- `draft` (مسودة)
- `posted` (مرحّلة)  
- `partially_paid` (مدفوعة جزئياً)
- `paid` (مدفوعة بالكامل)
- `cancelled` (ملغية)

---

## 6️⃣ الترتيب المقترح للتنفيذ

1. **أولاً**: إصلاح بيانات DB — إضافة الحالات الناقصة لفواتير المبيعات  
2. **ثانياً**: إصلاح `PurchaseCycleList.tsx` Kanban (أعمدة حالات + onCardMove)  
3. **ثالثاً**: إصلاح `SalesInvoicesList.tsx` Kanban (onCardMove via statusService)  
4. **رابعاً**: تحديث `StatusDropdown.tsx` (إضافة purchase_cycle_full invalidation)
5. **خامساً**: اختبار شامل في المتصفح

---

## ⏱️ الوقت المتوقع: 20-30 دقيقة

# 🛒 تحليل شامل: سلة التسوق B2B — Quick Add to Draft Quotation
## Smart Material Cart System — Complete Analysis & Implementation Plan

---

## 🎯 الفكرة باختصار

**سلة تسوق ذكية** تسمح للمستخدم أثناء تصفح المواد والمخزون بإضافة مواد بكميات معينة (بالأمتار أو بالرولونات) إلى **مسودة عرض سعر** في الخلفية. بعد الانتهاء من التصفح، يجد المسودة جاهزة للمراجعة والتعديل والتثبيت.

---

## 📊 تحليل البنية التحتية الحالية

### ✅ ما هو جاهز (لا يحتاج تعديل):

| المكون | الحالة | ملاحظات |
|--------|--------|---------|
| جدول `quotations` | ✅ موجود | يدعم `status: 'draft'` + `customer_id` + `currency` |
| جدول `sales_invoice_items` | ✅ موجود | يدعم `quotation_id` + `material_id` + `roll_id` + `warehouse_id` + `quantity` + `unit_price` |
| جدول `fabric_rolls` | ✅ موجود | فيه `warehouse_id` + `material_id` + `available_length` |
| جدول `fabric_materials` | ✅ موجود | فيه `selling_price` + `unit` |
| جدول `warehouses` | ✅ موجود | قائمة المستودعات |

### 🔑 نقاط القوة في التصميم الحالي:
1. **`sales_invoice_items`** يدعم أصلاً `material_id` و `roll_id` و `warehouse_id` — مصمم للأقمشة!
2. **`quotations`** يدعم `status: 'draft'` — مثالي لمفهوم السلة
3. **`sales_invoice_items`** يدعم `quantity` و `unit_price` — جاهز لأي كمية

### ⚠️ ما يحتاج إضافة:

| المكون | النوع | السبب |
|--------|-------|-------|
| `CartContext` / `useCart` hook | Frontend State | إدارة حالة السلة عبر التطبيق |
| `CartFloatingWidget` | UI Component | عنصر عائم يظهر السلة أثناء التصفح |
| `CartDrawer` | UI Component | درج جانبي لمراجعة محتويات السلة |
| `AddToCartButton` | UI Component | زر إضافة للسلة في كل صف مادة/رولون |
| `quotationService` | Backend Service | خدمة إنشاء/تحديث عروض الأسعار |

---

## 🏗️ التصميم المعماري

### النهج المقترح: **Hybrid Cart (ذكي + مستمر)**

```
┌──────────────────────────────────────────────────────────┐
│                    Cart Architecture                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│   [Browse Materials] ──→ [Add to Cart] ──→ [Cart State]   │
│                                                    │       │
│   [Browse Inventory] ──→ [Add to Cart] ──→ [Cart State]   │
│                                                    │       │
│   [Browse Rolls] ────→ [Add to Cart] ──→ [Cart State]     │
│                                                    ↓       │
│                                            [Save Draft]    │
│                                                    ↓       │
│              quotations (status='draft') + sales_invoice_items
│                                                    ↓       │
│              [Review & Edit Quotation] → [Confirm → Order] │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### لماذا Hybrid؟
- **Local State (React Context):** أثناء التصفح، السلة في الذاكرة — سريعة وبدون API calls
- **Database Persist:** عند حفظ المسودة، تُحفظ كـ Draft Quotation في `quotations` + `sales_invoice_items`
- **Auto-save اختياري:** يمكن الحفظ التلقائي كل 30 ثانية لتجنب فقدان البيانات

---

## 🖥️ تصميم واجهة المستخدم

### 1. زر الإضافة للسلة (في تبويب المخزون)

```
┌──────────────────────────────────────────────────────┐
│ المستودع الرئيسي | 5 رولون | 250 م | [🛒 إضافة]     │
│  ├ RL-001 | 48م متاح | [إضافة 48م] [إضافة رولون كامل]│
│  ├ RL-002 | 50م متاح | [إضافة __ م] [إضافة رولون كامل]│
│  └ RL-003 | 45م متاح | [إضافة __ م] [إضافة رولون كامل]│
└──────────────────────────────────────────────────────┘
```

### 2. Widget العائم (يظهر عند وجود عناصر في السلة)

```
┌──────────────────┐
│ 🛒 السلة (3)     │  ← يظهر في زاوية الشاشة
│ 3 مواد | 180 م   │
│ [عرض] [مسح]      │
└──────────────────┘
```

### 3. درج السلة (Cart Drawer)

```
┌──────────────────────────────────────────────────────┐
│ 🛒 سلة المواد                              [✕ إغلاق] │
├──────────────────────────────────────────────────────┤
│ العميل: [اختيار عميل ▼] (اختياري)                     │
├──────────────────────────────────────────────────────┤
│ 1. حموي ملون (COT-100-PLAIN)                         │
│    المستودع: الرئيسي                                   │
│    الكمية: [48] م  |  السعر: [25.00] $  |  [🗑️]       │
│    رولون: RL-001                                       │
├──────────────────────────────────────────────────────┤
│ 2. قطن سوري                                          │
│    المستودع: فرع حلب                                   │
│    الكمية: [100] م  |  السعر: [18.50] $  |  [🗑️]      │
│    بدون تحديد رولون (كمية حرة)                         │
├──────────────────────────────────────────────────────┤
│ الإجمالي: 2,650.00 $                                  │
│                                                        │
│ [💾 حفظ كمسودة عرض سعر]  [🗑️ إفراغ السلة]            │
└──────────────────────────────────────────────────────┘
```

---

## 📋 خطوات التنفيذ المرحلية

### المرحلة 1: البنية الأساسية (Cart Core)

**الملفات المطلوبة:**

```
src/
├── contexts/
│   └── CartContext.tsx          ← React Context + useCart hook
├── services/
│   └── quotationService.ts     ← خدمة عروض الأسعار (CRUD)
├── components/
│   └── cart/
│       ├── CartFloatingWidget.tsx   ← Widget العائم
│       ├── CartDrawer.tsx           ← درج السلة
│       ├── CartItemRow.tsx          ← صف العنصر في السلة
│       └── AddToCartButton.tsx      ← زر الإضافة
```

**Cart Item Interface:**
```typescript
interface CartItem {
  id: string;                    // UUID مؤقت
  material_id: string;           // ID المادة
  material_name_ar: string;      // اسم المادة
  material_name_en?: string;
  material_code: string;         // كود المادة
  
  // الكمية
  quantity: number;              // الكمية بالوحدة (أمتار مثلاً)
  unit: string;                  // الوحدة (meter, yard, kg...)
  
  // الرولون (اختياري)
  roll_id?: string;              // إذا تم اختيار رولون معين
  roll_number?: string;          // رقم الرولون
  is_full_roll?: boolean;        // هل رولون كامل؟
  
  // المستودع
  warehouse_id: string;          // المستودع المصدر
  warehouse_name_ar: string;
  
  // السعر
  unit_price: number;            // سعر الوحدة
  currency: string;              // العملة
  subtotal: number;              // الإجمالي الفرعي
  
  // معلومات إضافية
  added_at: Date;                // وقت الإضافة
  notes?: string;                // ملاحظات
}

interface CartState {
  items: CartItem[];
  customer_id?: string;          // العميل (اختياري أثناء التصفح)
  customer_name?: string;
  draft_quotation_id?: string;   // ID المسودة إذا تم الحفظ
  total_items: number;
  total_quantity: number;
  total_amount: number;
}
```

### المرحلة 2: خدمة عروض الأسعار (quotationService)

```typescript
// الوظائف المطلوبة:
quotationService = {
  // إنشاء مسودة عرض سعر
  createDraftQuotation(companyId, data) → Promise<Quotation>
  
  // إضافة بنود للعرض
  addQuotationItems(quotationId, items[]) → Promise<Item[]>
  
  // تحديث بند
  updateQuotationItem(itemId, updates) → Promise<Item>
  
  // حذف بند
  deleteQuotationItem(itemId) → Promise<void>
  
  // جلب عروض الأسعار المسودة
  getDraftQuotations(companyId) → Promise<Quotation[]>
  
  // تأكيد العرض (تحويل من draft إلى sent)
  confirmQuotation(quotationId) → Promise<Quotation>
  
  // تحويل العرض لأمر بيع
  convertToSalesOrder(quotationId) → Promise<SalesOrder>
}
```

### المرحلة 3: تكامل مع تبويب المخزون

- إضافة زر "إضافة للسلة" في كل صف مستودع
- إضافة زر "إضافة رولون كامل" و "إضافة كمية" في Expandable rows
- Dialog لإدخال الكمية المطلوبة عند الإضافة

### المرحلة 4: Widget العائم و Drawer

- Widget عائم يظهر فوق كل الصفحات عند وجود عناصر
- يمكن النقر لفتح Drawer كامل
- يدعم السحب والإفلات لترتيب العناصر

---

## 🔄 سير العمل (Workflow)

```
1. المستخدم يفتح صفحة المواد
2. يضغط على مادة → يفتح تبويب المخزون
3. يرى المستودعات والرولونات
4. يضغط [🛒 إضافة] على رولون أو كمية
5. يظهر Dialog: "أدخل الكمية" + السعر الافتراضي
6. يتم الإضافة للسلة (Widget يتحدث)
7. ينتقل لمادة أخرى ويكرر 3-6
8. عند الانتهاء يضغط على Widget → يفتح Drawer
9. يختار العميل (اختياري)
10. [💾 حفظ كمسودة] → يُنشئ quotation بحالة draft
11. يذهب لاحقاً للمبيعات → عروض الأسعار → يجد المسودة
12. يعدل ويراجع → يضغط [تأكيد] → يتحول لعرض سعر رسمي
13. إذا وافق العميل → [تحويل لأمر بيع]
```

---

## 🌍 مقارنة مع الأنظمة العالمية

| النظام | الميزة | ملاحظات |
|--------|-------|---------|
| **Odoo** | Quick Add to Quotation | يتطلب الانتقال لصفحة المبيعات أولاً |
| **SAP B1** | Drag & Drop to Order | معقد ويحتاج تدريب |
| **TexaCore (المقترح)** | 🛒 Smart Cart from Anywhere | **أفضل UX** — يعمل من أي مكان |

### ميزاتنا التنافسية:
1. ✅ إضافة من أي صفحة مواد/مخزون/رولونات
2. ✅ تحديد المستودع المصدر مباشرة
3. ✅ ربط تلقائي بالرولون المحدد
4. ✅ السعر الافتراضي من بيانات المادة
5. ✅ مسودة مستمرة — لا تضيع حتى لو أغلق المتصفح (localStorage + DB)
6. ✅ تحويل سلس: سلة → مسودة → عرض سعر → أمر بيع → فاتورة

---

## ⚠️ نقاط مهمة للتنفيذ

### 1. التحقق من الكمية المتاحة
- عند إضافة كمية من رولون، نتحقق من `available_length`
- إذا كانت الكمية أكبر من المتاح → تحذير ⚠️

### 2. تعدد المستودعات
- نفس المادة يمكن إضافتها من مستودعات مختلفة
- كل بند في السلة مرتبط بمستودع معين

### 3. السعر
- السعر الافتراضي من `selling_price` في `fabric_materials`
- يمكن تعديله يدوياً في السلة
- يمكن ربطه بقائمة أسعار العميل لاحقاً

### 4. حفظ محلي (localStorage)
- السلة تُحفظ تلقائياً في localStorage
- عند إعادة فتح المتصفح، تُستعاد السلة
- عند حفظ كمسودة، تُمسح من localStorage

---

## 📅 الجدول الزمني

| المرحلة | المدة | المتطلب |
|---------|-------|---------|
| 1. CartContext + Interface | ~2 ساعات | — |
| 2. quotationService | ~2 ساعات | — |
| 3. CartFloatingWidget + Drawer | ~3 ساعات | مرحلة 1 |
| 4. تكامل المخزون (أزرار الإضافة) | ~2 ساعات | مرحلة 1+3 |
| 5. حفظ المسودة (DB sync) | ~2 ساعات | مرحلة 2 |
| 6. تكامل صفحة المبيعات | ~2 ساعات | مرحلة 5 |

**المدة الإجمالية: ~13 ساعة عمل**

---

## 🎯 الأولويات

### يُنفذ الآن:
1. ✅ تحسين تبويب المخزون (فلاتر + مستودعات فارغة + تفاصيل الرولونات)
2. ✅ CartContext + useCart hook
3. ✅ AddToCartButton في تبويب المخزون

### يُنفذ بعدها:
4. CartFloatingWidget + CartDrawer
5. quotationService
6. حفظ المسودة

### مرحلة متقدمة:
7. تكامل صفحة المبيعات
8. Auto-save
9. قائمة أسعار العميل

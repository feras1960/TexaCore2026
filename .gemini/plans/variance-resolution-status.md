# 📊 وثيقة حالة نظام معالجة فروقات الكونتينرات
## Variance Resolution System — Status Document

**تاريخ التحديث:** 2026-02-23  
**الحالة العامة:** ✅ جزئي — الأساسيات مكتملة

---

## ✅ الميزات المُنجزة

### 1. اكتشاف الفروقات (Detection)
- **الملف:** `receiptCompletionService.ts`
- عند اكتمال استلام الكونتينر، يُحسب `variance_amount` لكل بند
- إذا تجاوز الفرق حد التسامح (1%) → `variance_status = 'pending_review'`
- يُخزن في `containers.variance_status` و `container_items.variance_amount`

### 2. المؤشرات البصرية (Visual Indicators)
| المكان | الملف | التفاصيل |
|--------|-------|----------|
| قائمة الكونتينرات | `ContainersList.tsx` + `ContainerStatusStepper.tsx` | بادج ⚠️ على حالة `received` عند وجود فروقات |
| تبويب ملخص الاستلام | `UnifiedAccountingSheet.tsx` | بادج ⚠️ على التبويب عند `pending_review` |

### 3. لوحة مراجعة الفروقات (Variance Review Panel)
- **الملف:** `VarianceReviewPanel.tsx`
- تظهر فقط للكونتينرات بحالة `pending_review`
- تعرض كل بند فيه فرق مع:
  - الكمية المتوقعة vs المستلمة
  - نسبة الفرق وقيمته
  - اختيار إجراء: تسامح / قيد فروقات / إرجاع
  - ملاحظات المحاسب
- زر "تأكيد المراجعة" يستدعي خدمة المعالجة

### 4. خدمة معالجة الفروقات (Variance Resolution Service)
- **الملف:** `varianceResolutionService.ts`

#### أ. التسامح (tolerance) ✅
```
المنطق: نفس المصاريف الإجمالية ÷ الكميات الفعلية
Formula: new_cost = unit_price + (allocated_costs / received_quantity)
```
- إعادة توزيع `allocated_costs` على `received_quantity` (بدل `expected_quantity`)
- تحديث `container_items.final_unit_cost`, `total_final_cost`, `cost_per_unit_allocated`
- تحديث `fabric_rolls.cost_per_meter`, `final_landed_cost`, `allocated_expenses`
- تحديث `cost_status = 'finalized'` لكل رولون

#### ب. قيد فروقات (journal_entry) ✅
```
زيادة: Dr. مخزون (1141) / Cr. فروق المخزون (592)
نقص:  Dr. فروق المخزون (592) / Cr. مخزون (1141)
```
- إعادة توزيع المصاريف أولاً (مثل التسامح)
- إنشاء `journal_entry` فعلي بنوع `inventory_variance`
- إنشاء `journal_entry_lines` مع الحسابات الصحيحة
- تحديث أرصدة الحسابات `current_balance`

#### ج. إرجاع (return) ⏳ (placeholder)
- حالياً يسجل فقط — بحاجة ربط بنظام مرتجعات المشتريات

### 5. حماية الإغلاق (Close Guard)
- **الملف:** `useSheetActions.ts`
- لا يمكن إغلاق كونتينر بحالة `variance_status = 'pending_review'`
- رسالة تحذيرية توجه المحاسب لتبويب "ملخص الاستلام"

### 6. إعادة حساب شاملة
- عند تأكيد المراجعة، **كل** البنود تُعاد حساباتها
- حتى البنود بفروقات صغيرة (أقل من حد العرض) تُعاد تكلفتها

### 7. إشعار المحاسب (Notification)
- **الملف:** `receiptCompletionService.ts` → `sendVarianceNotification()`
- عند اكتشاف فروقات، يُرسل إشعار لكل admin/accountant
- يظهر في `NotificationBell` مع بيانات الكونتينر
- يدعم Realtime subscription (إشعار فوري)

---

## 🔜 الميزات المؤجلة (للتنفيذ لاحقاً)

### 1. مرتجع المشتريات (Purchase Return)
**الأولوية:** متوسطة  
**الوصف:** عند النقص الكبير، قد يرغب المستودع بإنشاء مرتجع للمورد  
**المطلوب:**
- ربط `variance_action = 'return'` بنظام مرتجعات المشتريات
- إنشاء `purchase_return` تلقائي مع الكمية الناقصة
- تحديث `container_items` و `fabric_rolls` بالأرصدة الصحيحة
- قيد محاسبي: Dr. ذمم الموردين / Cr. مخزون

### 2. تقرير الفروقات (Variance Report)
**الأولوية:** منخفضة  
**الوصف:** تقرير تجميعي يعرض كل الفروقات عبر جميع الكونتينرات  
**المطلوب:**
- صفحة تقارير جديدة أو تبويب في التقارير
- فلتر حسب الفترة والمورد والحالة
- ملخص: إجمالي الفروقات، أنواع الإجراءات، القيود المحاسبية
- إمكانية التصدير PDF/Excel

### 3. حد التسامح التلقائي (Auto-tolerance)
**الأولوية:** منخفضة  
**الوصف:** إعداد في الشركة لقبول الفروقات تحت نسبة معينة تلقائياً  
**المطلوب:**
- حقل `variance_auto_tolerance_pct` في `companies.accounting_settings`
- عند الاستلام: إذا كان الفرق < الحد → tolerance تلقائي بدون مراجعة
- تسجيل في الـ activity log

---

## 📁 الملفات الرئيسية

| الملف | الغرض |
|-------|-------|
| `src/features/trade/services/varianceResolutionService.ts` | خدمة معالجة الفروقات (tolerance, journal_entry) |
| `src/features/trade/components/tabs/VarianceReviewPanel.tsx` | واجهة مراجعة المحاسب |
| `src/features/warehouse/services/receiptCompletionService.ts` | اكتشاف الفروقات + إشعارات |
| `src/features/accounting/components/unified/hooks/useSheetActions.ts` | حماية الإغلاق |
| `src/features/accounting/components/unified/UnifiedAccountingSheet.tsx` | بادج ⚠️ على التبويبات |
| `src/features/purchases/pages/ContainersList.tsx` | بادج ⚠️ في القائمة |
| `src/features/trade/components/ContainerStatusStepper.tsx` | مؤشر الحالة البصري |

---

## 🗄️ أعمدة قاعدة البيانات ذات الصلة

### جدول `containers`
- `variance_status` — 'ok', 'pending_review', 'reviewed'
- `variance_notes` — ملاحظات المحاسب
- `variance_reviewed_by` — UUID المراجع
- `variance_reviewed_at` — تاريخ المراجعة

### جدول `container_items`
- `variance_amount` — الفرق بالمتر
- `variance_action` — 'tolerance', 'journal_entry', 'return'
- `variance_resolved` — boolean
- `allocated_costs` — المصاريف الموزعة
- `cost_per_unit_allocated` — تكلفة المصاريف/وحدة

### جدول `chart_of_accounts`
- `592` — فروق المخزون (Inventory Variances)
- `1141` — بضاعة جاهزة (Finished Goods / Inventory)

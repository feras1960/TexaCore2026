# خطة تثبيت تكاليف الكونتينر + الضريبة الجمركية
# Container Cost Finalization + Customs Tax Plan

## 📋 الملخص التنفيذي

### الهدف:
1. **الضريبة الجمركية** — قسم منفصل في شاشة المصاريف لتحديد نسبة الضريبة على المواد وتوزيعها
2. **تحديث أسعار المخزون** — بعد تثبيت التكلفة النهائية، تحديث `inventory_stock` و `fabric_materials.tax_rate`

---

## 📊 المرحلة 1: الهيكل (Database Schema Changes)

### 1.1 إضافة حقول الضريبة لـ `container_items`:
```sql
ALTER TABLE container_items ADD COLUMN IF NOT EXISTS customs_duty_rate NUMERIC DEFAULT 0;
ALTER TABLE container_items ADD COLUMN IF NOT EXISTS customs_duty_amount NUMERIC DEFAULT 0;
ALTER TABLE container_items ADD COLUMN IF NOT EXISTS customs_duty_per_unit NUMERIC DEFAULT 0;
```

### 1.2 إضافة حقل نوع المصروف (هل ضريبة أم مصروف عادي) لـ `container_expenses`:
```sql
-- لتمييز مصاريف الضريبة عن المصاريف العادية
ALTER TABLE container_expenses ADD COLUMN IF NOT EXISTS is_customs_tax BOOLEAN DEFAULT false;
```

**الحالة: ⬜ لم يبدأ**

---

## 📊 المرحلة 2: قسم الضريبة في الشاشة (UI)

### المطلوب في ContainerExpensesTab.tsx:
- **قسم منغلق (Collapsible)** بعنوان "الضريبة الجمركية / Customs Tax"
- يحتوي على:
  - حقل **نسبة الضريبة العامة** (نسبة واحدة لكل المواد) أو **نسبة خاصة لكل مادة**
  - Toggle: "نسبة موحدة" / "نسبة مختلفة لكل مادة"
  - جدول يعرض كل مادة مع:
    - اسم المادة | الكمية | سعر الوحدة | القيمة | نسبة الضريبة | مبلغ الضريبة | الضريبة لكل وحدة
  - زر "حفظ التوزيع" — يحفظ في container_items
  - زر "ترحيل قيد الضريبة" — ينشئ قيد: مدين حساب الكونتينر / دائن حساب الضريبة

### القيد المحاسبي للضريبة:
```
مدين: حساب الكونتينر (بضاعة بالطريق) — container_account_id
دائن: حساب الضريبة المستحقة — tax_payable_account
الوصف: ضريبة جمركية — كونتينر XXXX
```

**الحالة: ⬜ لم يبدأ**

---

## 📊 المرحلة 3: تحديث المخزون بعد التثبيت

### عند `finalizeLandedCost()`:
1. توزيع المصاريف النهائي على البنود ✅ (موجود)
2. حفظ customs_duty_rate + customs_duty_amount في container_items 🆕
3. تحديث `fabric_materials.tax_rate` لكل مادة 🆕
4. تحديث `inventory_stock.average_cost` و `last_cost` بالتكلفة النهائية 🆕
5. إنشاء حركة مخزنية `cost_adjustment` لتوثيق فرق التكلفة 🆕

**الحالة: ⬜ لم يبدأ**

---

## 📊 المرحلة 4: ربط باقي الدورة (الرجوع للاستلامات)

### بعد الانتهاء:
- التأكد أن `receiptCompletionService` يستخدم `final_unit_cost` (بعد المصاريف) بدل `unit_cost` (قبل المصاريف)
- القيد المحاسبي عند الاستلام يعكس المبلغ الفعلي

**الحالة: ⬜ لم يبدأ**

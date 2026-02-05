# 📜 قواعد الأعمال - Business Rules
# TexaCore ERP Business Logic Documentation

**تاريخ التحديث**: 2 فبراير 2026

---

## 📋 فهرس المحتويات

1. [المحاسبة](#1-قواعد-المحاسبة)
2. [المستودعات](#2-قواعد-المستودعات)
3. [المبيعات](#3-قواعد-المبيعات)
4. [المشتريات](#4-قواعد-المشتريات)
5. [الوكلاء](#5-قواعد-الوكلاء)
6. [Multi-Tenant](#6-قواعد-multi-tenant)

---

## 1. قواعد المحاسبة

### BR-ACC-001: توازن القيد المحاسبي
**الوصف**: مجموع المدين يجب أن يساوي مجموع الدائن في كل قيد.

```sql
-- التحقق
SELECT 
    SUM(debit) = SUM(credit) as is_balanced
FROM journal_entry_lines
WHERE journal_entry_id = :entry_id;
```

**الإجراء عند الفشل**: رفض حفظ القيد ❌

---

### BR-ACC-002: منع التعديل على الفترات المغلقة
**الوصف**: لا يمكن إضافة أو تعديل قيود في فترة محاسبية مغلقة.

```sql
-- التحقق
SELECT status FROM accounting_periods 
WHERE start_date <= :entry_date 
  AND end_date >= :entry_date;

-- القاعدة: status != 'closed'
```

**الإجراء عند الفشل**: رفض العملية مع رسالة خطأ

---

### BR-ACC-003: كود الحساب فريد
**الوصف**: كل حساب له كود فريد ضمن الشركة.

```sql
-- Constraint
UNIQUE(tenant_id, company_id, account_code)
```

---

### BR-ACC-004: الحساب الأب يجب أن يكون موجوداً
**الوصف**: عند إنشاء حساب فرعي، الحساب الأب يجب أن يكون موجوداً.

```sql
-- التحقق
SELECT EXISTS(
    SELECT 1 FROM chart_of_accounts 
    WHERE id = :parent_id
);
```

---

### BR-ACC-005: لا يمكن حذف حساب له حركات
**الوصف**: الحسابات التي لها قيود لا يمكن حذفها.

```sql
-- التحقق قبل الحذف
SELECT COUNT(*) FROM journal_entry_lines 
WHERE account_id = :account_id;

-- القاعدة: count = 0
```

---

### BR-ACC-006: فترة واحدة مفتوحة فقط
**الوصف**: لا يمكن أن تكون هناك فترتين محاسبيتين مفتوحتين بنفس الوقت.

```sql
-- التحقق
SELECT COUNT(*) FROM accounting_periods 
WHERE company_id = :company_id 
  AND status = 'open';

-- القاعدة: count <= 1
```

---

### BR-ACC-007: تنبيه تجاوز الموازنة
**الوصف**: عند تجاوز المصروفات للموازنة، يُنشأ تنبيه تلقائي.

```sql
-- Trigger يُنشئ alert في budget_alerts
```

---

## 2. قواعد المستودعات

### BR-ROLL-001: الكمية الحالية لا يمكن أن تكون سالبة
**الوصف**: `current_length` يجب أن يكون >= 0 دائماً.

```sql
-- Check Constraint
CHECK (current_length >= 0)
```

**الإجراء عند الفشل**: رفض عملية البيع/القص

---

### BR-ROLL-002: المحجوز لا يتجاوز المتاح
**الوصف**: الكمية المحجوزة لا يمكن أن تتجاوز الكمية المتاحة.

```sql
-- Check Constraint
CHECK (reserved_length <= current_length)

-- التحقق
available = current_length - reserved_length >= 0
```

---

### BR-ROLL-003: رقم الرولون فريد
**الوصف**: كل رولون له رقم فريد ضمن الشركة.

```sql
-- Constraint
UNIQUE(tenant_id, company_id, roll_number)
```

---

### BR-ROLL-004: القص يخفض الكمية
**الوصف**: عند قص كمية من رولون، تُخصم من `current_length`.

```sql
-- Trigger
UPDATE fabric_rolls
SET current_length = current_length - :cut_amount,
    updated_at = NOW()
WHERE id = :roll_id
  AND current_length >= :cut_amount;
```

---

### BR-ROLL-005: الحجز يزيد reserved_length
**الوصف**: عند حجز كمية، تُضاف إلى `reserved_length`.

```sql
UPDATE fabric_rolls
SET reserved_length = reserved_length + :amount
WHERE id = :roll_id
  AND (current_length - reserved_length) >= :amount;
```

---

### BR-ROLL-006: الرولون المباع لا يمكن تعديله
**الوصف**: الرولونات بحالة `sold` لا يمكن تعديل كمياتها.

```sql
-- التحقق
SELECT status FROM fabric_rolls WHERE id = :roll_id;
-- القاعدة: status != 'sold'
```

---

### BR-INV-001: حركة المخزون تُنشئ سجل
**الوصف**: كل تغيير في المخزون يُسجَّل تلقائياً.

```sql
-- Trigger يُنشئ سجل في inventory_movements
```

---

### BR-INV-002: رصيد سجل المخزون
**الوصف**: `stock_ledger` يُحدَّث تلقائياً مع كل حركة.

---

### BR-CNT-001: بنود الكونتينر لا تتجاوز الكمية
**الوصف**: مجموع الكميات الموزعة لا تتجاوز كمية الكونتينر.

---

### BR-CNT-002: توزيع المصاريف على البنود
**الوصف**: عند إضافة مصروف للكونتينر، يُوزَّع على البنود.

---

### BR-CNT-003: حالات الكونتينر متسلسلة
**الوصف**: الكونتينر يمر بحالات متسلسلة.

```
ordered → shipped → in_transit → arrived → receiving → completed
```

---

### BR-RES-001: الحجز له تاريخ انتهاء
**الوصف**: كل حجز له `expiry_date` بعدها يُلغى تلقائياً.

```sql
-- Scheduled Job يُلغي الحجوزات المنتهية
UPDATE reservations
SET status = 'expired'
WHERE expiry_date < CURRENT_DATE 
  AND status = 'active';
```

---

### BR-RES-002: إلغاء الحجز يُرجع الكمية
**الوصف**: عند إلغاء الحجز، تُرجع الكمية للمتاح.

```sql
UPDATE fabric_rolls
SET reserved_length = reserved_length - :reserved_amount
WHERE id = :roll_id;
```

---

### BR-DEL-001: إذن التسليم يحتاج موافقة
**الوصف**: إذونات التسليم بقيمة عالية تحتاج موافقة.

```sql
-- إذا total_amount > threshold → requires_approval = true
```

---

### BR-DEL-002: التسليم يُخفض المخزون
**الوصف**: عند تأكيد التسليم، تُخصم الكميات من المخزون.

---

### BR-STK-001: الجرد يُحسب الفرق
**الوصف**: فرق الجرد = الكمية الفعلية - كمية النظام.

```sql
variance = actual_quantity - system_quantity
```

---

### BR-STK-002: تسوية الجرد تُنشئ قيد
**الوصف**: عند تأكيد الجرد، يُنشأ قيد تسوية للفروقات.

---

## 3. قواعد المبيعات

### BR-SAL-001: رقم الفاتورة فريد
**الوصف**: كل فاتورة لها رقم فريد ومتسلسل.

```sql
UNIQUE(tenant_id, company_id, invoice_number)
```

---

### BR-SAL-002: حساب إجمالي الفاتورة
**الوصف**: الإجمالي = المجموع الفرعي - الخصم + الضريبة.

```sql
total_amount = subtotal - discount_amount + tax_amount
```

---

### BR-SAL-003: حساب بند الفاتورة
**الوصف**: إجمالي البند = الكمية × السعر × (1 - نسبة الخصم).

```sql
line_total = quantity * unit_price * (1 - discount_percent/100)
```

---

### BR-SAL-004: الفاتورة المؤكدة تُنشئ قيد
**الوصف**: عند تأكيد الفاتورة، يُنشأ قيد محاسبي تلقائياً.

```sql
-- القيد:
-- مدين: العميل (الذمم المدينة)
-- دائن: إيراد المبيعات
-- دائن: ضريبة القيمة المضافة (إن وجدت)
```

---

### BR-SAL-005: التحقق من حد الائتمان
**الوصف**: لا يمكن البيع على الحساب إذا تجاوز العميل حد الائتمان.

```sql
SELECT 
    (balance + :invoice_amount) <= credit_limit
FROM customers
WHERE id = :customer_id;
```

---

### BR-SAL-006: قائمة الأسعار حسب العميل
**الوصف**: يُطبَّق سعر قائمة الأسعار المرتبطة بالعميل أو المجموعة.

---

### BR-SAL-007: الخصم الترويجي له فترة
**الوصف**: الخصم يُطبَّق فقط ضمن فترة الصلاحية.

```sql
WHERE start_date <= CURRENT_DATE 
  AND end_date >= CURRENT_DATE
  AND is_active = true
```

---

### BR-SAL-008: الفاتورة المدفوعة لا تُحذف
**الوصف**: لا يمكن حذف فاتورة لها دفعات.

---

## 4. قواعد المشتريات

### BR-PUR-001: فاتورة المشتريات تُنشئ قيد
**الوصف**: تأكيد الفاتورة يُنشئ قيد محاسبي.

```sql
-- القيد:
-- مدين: المخزون
-- مدين: ضريبة المشتريات
-- دائن: الموردين (الذمم الدائنة)
```

---

### BR-PUR-002: حساب تكلفة الوحدة
**الوصف**: تكلفة الوحدة = (سعر الشراء + المصاريف الموزعة) ÷ الكمية.

```sql
final_cost = (unit_cost * quantity + allocated_expenses) / quantity
```

---

### BR-PUR-003: الكونتينر يربط بالمورد
**الوصف**: كل كونتينر مرتبط بمورد واحد.

---

### BR-PUR-004: استلام الكونتينر يُدخل المخزون
**الوصف**: عند استلام الكونتينر، تُنشأ رولونات في المخزون.

---

## 5. قواعد الوكلاء

### BR-AGT-001: حساب العمولة
**الوصف**: العمولة = قيمة المبيعات × نسبة العمولة.

```sql
commission = sales_amount * commission_rate / 100
```

---

### BR-AGT-002: مستوى الوكيل
**الوصف**: مستوى الوكيل يُحدَّد حسب إجمالي المبيعات.

| المستوى | المبيعات | العمولة |
|---------|----------|---------|
| Bronze | < 10,000 | 5% |
| Silver | 10,000 - 50,000 | 7% |
| Gold | 50,000 - 100,000 | 10% |
| Platinum | > 100,000 | 12% |

---

### BR-AGT-003: العمولة عند دفع الفاتورة
**الوصف**: تُحسب العمولة عند سداد العميل للفاتورة.

---

### BR-AGT-004: الهدف الشهري
**الوصف**: لكل وكيل هدف شهري، عند تحقيقه يحصل على مكافأة.

---

### BR-AGT-005: سحوبات الوكيل
**الوصف**: الوكيل يسحب من رصيد العمولات المكتسبة فقط.

```sql
SELECT 
    available_balance >= :withdrawal_amount
FROM agents
WHERE id = :agent_id;
```

---

## 6. قواعد Multi-Tenant

### BR-TEN-001: عزل البيانات بـ tenant_id
**الوصف**: كل سجل له `tenant_id` ولا يمكن الوصول لبيانات مستأجر آخر.

```sql
-- RLS Policy
CREATE POLICY tenant_isolation ON table_name
USING (tenant_id = current_tenant_id());
```

---

### BR-TEN-002: المستخدم ينتمي لمستأجر واحد
**الوصف**: كل مستخدم مرتبط بمستأجر واحد (باستثناء Super Admin).

---

### BR-TEN-003: الوحدات حسب الاشتراك
**الوصف**: الوحدات المتاحة تعتمد على خطة الاشتراك.

```sql
SELECT module_code 
FROM tenant_modules 
WHERE tenant_id = :tenant_id 
  AND is_enabled = true;
```

---

### BR-TEN-004: الصلاحيات حسب الدور
**الوصف**: صلاحيات المستخدم تُحدَّد من الأدوار المُعيَّنة له.

---

### BR-TEN-005: كود المستأجر فريد
**الوصف**: كل مستأجر له كود فريد.

```sql
UNIQUE(code)
```

---

## 📊 ملخص قواعد الأعمال

| القسم | عدد القواعد | مستوى الحرج |
|-------|-------------|-------------|
| المحاسبة | 7 | 🔴 عالي |
| المستودعات | 15 | 🔴 عالي |
| المبيعات | 8 | 🟡 متوسط |
| المشتريات | 4 | 🟡 متوسط |
| الوكلاء | 5 | 🟡 متوسط |
| Multi-Tenant | 5 | 🔴 عالي |
| **الإجمالي** | **44** | - |

---

**© 2026 TexaCore ERP**

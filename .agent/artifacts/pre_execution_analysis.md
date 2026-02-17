# تحليل ما قبل التنفيذ: الوضع الحالي والملاحظات

تاريخ التحليل: 2026-02-17

---

## 1. تحليل الجداول والحقول الموجودة فعليا

### جدول containers (الجدول الرئيسي)

الحقول الموجودة:

| العمود | النوع | المصدر | ملاحظة |
|--------|-------|--------|--------|
| id | UUID PK | STEP_100 | اصلي |
| tenant_id | UUID FK | STEP_100 | اصلي |
| company_id | UUID FK | STEP_100 | اصلي |
| container_number | VARCHAR(100) | STEP_100 | اصلي |
| description | TEXT | STEP_100 | اصلي |
| origin_country | VARCHAR(100) | STEP_100 | اصلي |
| shipping_line | VARCHAR(200) | STEP_100 | اصلي |
| bill_of_lading | VARCHAR(100) | STEP_100 | اصلي |
| departure_date | DATE | STEP_100 | اصلي |
| arrival_date | DATE | STEP_100 | اصلي |
| received_date | DATE | STEP_100 | اصلي - موجود! |
| total_rolls | INT | STEP_100 | اصلي |
| received_rolls | INT | STEP_100 | اصلي |
| total_value | DECIMAL(15,2) | STEP_100 | اصلي |
| status | VARCHAR(30) | STEP_100 | حاليا: ordered, in_transit, arrived... |
| warehouse_id | UUID FK | STEP_100 | اصلي |
| notes | TEXT | STEP_100 | اصلي |
| created_by | UUID | STEP_100 | اصلي |
| container_name | TEXT | 20260212 | اضيف لاحقا |
| container_size | TEXT | 20260212 | اضيف لاحقا |
| container_type | TEXT | 20260212 | اضيف لاحقا |
| shipment_number | VARCHAR(50) | 20260216 | اضيف لاحقا |
| supplier_id | UUID FK | 20260216 | اضيف لاحقا |
| shipping_company | VARCHAR(200) | 20260216 | اضيف لاحقا |
| vessel_name | VARCHAR(200) | 20260216 | اضيف لاحقا |
| eta | DATE | 20260216 | اضيف لاحقا |
| etd | DATE | 20260216 | اضيف لاحقا |
| port_of_loading | VARCHAR(200) | 20260216 | اضيف لاحقا |
| port_of_discharge | VARCHAR(200) | 20260216 | اضيف لاحقا |
| currency | VARCHAR(3) | 20260216 | اضيف لاحقا |
| total_cost | DECIMAL(15,2) | 20260216 | اضيف لاحقا |
| shipment_id | UUID FK | 20260216 | ربط اختياري مع shipments |

**اعمدة تحتاج اضافة (من الخدمة لكن غير مؤكد وجودها بالـ DB):**

| العمود | النوع | مطلوب للخطة | موجود بالسيرفس |
|--------|-------|-------------|----------------|
| cost_allocation_method | VARCHAR | نعم | نعم |
| is_cost_finalized | BOOLEAN | نعم | نعم |
| finalized_at | TIMESTAMP | نعم | نعم |
| finalized_by | UUID | نعم | نعم |
| provisional_goods_cost | DECIMAL | نعم | نعم |
| final_goods_cost | DECIMAL | نعم | نعم |
| total_expected_costs | DECIMAL | نعم | نعم |
| total_actual_costs | DECIMAL | نعم | نعم |
| total_landed_cost | DECIMAL | نعم | نعم |
| provisional_journal_entry_id | UUID FK | نعم | نعم |
| final_journal_entry_id | UUID FK | نعم | نعم |

**ملاحظة:** هذه الاعمدة موجودة في الـ Service interface لكنها ربما لم تُضف للـ DB بعد.
يجب التحقق من وجودها فعليا في الـ DB قبل تنفيذ الـ migration.

---

### جدول container_items (بنود الكونتينر)

**ملاحظة مهمة:** لم نجد CREATE TABLE لهذا الجدول في ملفات الـ migration!
الارجح انه انشئ يدويا على Supabase.

الاعمدة المعروفة (من STEP_81 واستخدام الكود):

| العمود | النوع | المصدر | ملاحظة |
|--------|-------|--------|--------|
| id | UUID PK | - | |
| container_id | UUID FK | - | |
| material_id | UUID FK | - | |
| color_id | UUID FK | - | |
| expected_quantity | DECIMAL | - | |
| received_quantity | DECIMAL | - | |
| unit_cost | DECIMAL | STEP_81 يستخدمه | |
| expected_quantity | DECIMAL | STEP_81 يستخدمه | |
| unit_price | DECIMAL | - | |
| total_price | DECIMAL | - | |
| allocated_costs | DECIMAL | STEP_81 يكتب فيه | |
| cost_per_unit_allocated | DECIMAL | STEP_81 يكتب فيه | |
| provisional_unit_cost | DECIMAL | STEP_81 يكتب فيه | |
| final_unit_cost | DECIMAL | STEP_81 يكتب فيه | |
| total_provisional_cost | DECIMAL | STEP_81 يكتب فيه | |
| total_final_cost | DECIMAL | STEP_81 يكتب فيه | |
| weight_kg | DECIMAL | STEP_81 يقرأه | لتوزيع حسب الوزن |
| notes | TEXT | - | |
| created_at | TIMESTAMP | - | |
| updated_at | TIMESTAMP | - | |

**اعمدة نحتاج اضافتها:**

| العمود | النوع | الغرض |
|--------|-------|-------|
| estimated_unit_cost | DECIMAL(15,4) | تكلفة الوحدة التقديرية |
| estimated_total_cost | DECIMAL(15,2) | اجمالي التكلفة التقديرية |

---

### جدول container_expenses (مصاريف الكونتينر)

**ملاحظة مهمة:** ايضا لم نجد CREATE TABLE!
الاعمدة المعروفة (من الكود + STEP_81):

| العمود | النوع | المصدر | ملاحظة |
|--------|-------|--------|--------|
| id | UUID PK | - | |
| tenant_id | UUID | - | |
| company_id | UUID | - | |
| container_id | UUID FK | - | |
| expense_type | VARCHAR | - | freight, customs, insurance... |
| vendor_name | VARCHAR | - | |
| description | TEXT | - | |
| amount | DECIMAL | - | المبلغ العام |
| expected_amount | DECIMAL | - | المبلغ المتوقع |
| actual_amount | DECIMAL | - | المبلغ الفعلي |
| currency_code | VARCHAR | - | |
| expected_currency | VARCHAR | - | |
| invoice_number | VARCHAR | - | |
| invoice_date | DATE | - | |
| payment_status | VARCHAR | - | pending/partial/paid |
| paid_amount | DECIMAL | - | |
| journal_entry_id | UUID FK | STEP_81 يكتب فيه | |
| notes | TEXT | - | |
| created_at | TIMESTAMP | - | |
| updated_at | TIMESTAMP | - | |

**اعمدة نحتاج اضافتها:**

| العمود | النوع | الغرض |
|--------|-------|-------|
| expense_category | VARCHAR(20) | estimated او actual |
| vendor_id | UUID FK | ربط بجدول suppliers |
| vendor_account_id | UUID FK | حساب شركة الخدمة |
| container_account_id | UUID FK | حساب الكونتينر (بضاعة بالطريق) |
| journal_description | TEXT | بيان القيد المخصص |

---

## 2. اكتشافات مهمة

### اكتشاف 1: دوال DB موجودة بالفعل (STEP_81)

اكتشفنا ان STEP_81 يحتوي على 4 دوال SQL جاهزة:

1. **allocate_container_costs** - توزيع المصاريف على البنود (by_value, by_quantity, by_weight)
2. **finalize_container_costs** - تثبيت التكاليف
3. **create_container_journal_entry** - قيد محاسبي للكونتينر (provisional/final)
4. **create_container_expense_journal_entry** - قيد محاسبي لمصروف فردي

**التاثير على الخطة:** الدالة رقم 4 تفعل تقريبا ما نريد!
لكنها تبحث عن الحسابات تلقائيا (LIKE search) بدل ان يختارها المستخدم.
نحتاج تعديلها لتقبل vendor_account_id و container_account_id من المستخدم.

### اكتشاف 2: جدولان متوازيان (containers vs shipments)

- **containers** = الجدول القديم من STEP_100 (مستخدم حاليا)
- **shipments** + **shipment_costs** = الجدول الجديد من migration 00010 (اغنى بالتفاصيل)
- **الربط:** containers.shipment_id -> shipments.id (اختياري)

**القرار:** نعمل على جدول containers لانه المستخدم فعليا من الواجهة.
جدول shipment_costs يبقى كمرجع تصميمي.

### اكتشاف 3: journal_entry_lines يحتاج tenant_id + company_id

من STEP_81 نلاحظ ان journal_entry_lines يتطلب:
```sql
tenant_id, company_id, journal_entry_id, account_id, debit, credit, description
```

لكن journalEntriesService.ts لا يرسل tenant_id في الـ lines!
بالتالي الارجح ان الـ DB يولدها تلقائيا (trigger) او ان الـ STEP_81 مختلف عن الـ Service.

**يجب التحقق** من هذا عند التنفيذ.

### اكتشاف 4: received_date موجود اصلا

عمود received_date موجود في containers من التعريف الاصلي (STEP_100).
لا نحتاج اضافته في المرحلة 7.

---

## 3. تقييم الخطة

### النقاط القوية:
- تقسيم واضح لـ 10 اقسام
- فصل المصاريف التقديرية عن الحقيقية
- ربط القيود المحاسبية بحسابات يختارها المستخدم
- المزامنة المباشرة مع بنود البضائع

### تعديلات مقترحة:

**6B-1 (DB Migration):**
- يجب اولا التحقق من الاعمدة الموجودة فعليا في DB (اعمدة الـ Service قد لا تكون كلها موجودة)
- اضافة IF NOT EXISTS لكل عمود لتجنب الاخطاء
- اضافة expense_category كحقل اساسي للتمييز بين estimated و actual

**6B-2 (Backend):**
- يمكن الاستفادة من دالة create_container_expense_journal_entry الموجودة في STEP_81
- لكن نحتاج تعديلها لتقبل حساب الكونتينر وحساب الشركة من المستخدم بدل البحث التلقائي
- القرار: نبني الدالة في containersService.ts (frontend service) لان اسهل وتعطي مرونة اكبر

**6B-4 (واجهة المصاريف الحقيقية):**
- SmartAccountSelector موجود وجاهز للاستخدام مع type filter
- يجب تمرير companyId للـ SmartAccountSelector

**7-1 (حالات الكونتينر):**
- الحالات الحالية في DB: ordered, in_transit, arrived, receiving, completed, cancelled
- الحالات في الـ Service: ordered, in_transit, at_port, customs, received, closed
- نحتاج توحيد مع الحالات الجديدة المقترحة في الخطة

---

## 4. خطوات تنفيذية قبل البدء

قبل تنفيذ 6B-1 يجب:

1. **تحقق من الاعمدة الفعلية:** تشغيل SQL للتحقق مما هو موجود فعلا
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'container_expenses'
ORDER BY ordinal_position;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'container_items'  
ORDER BY ordinal_position;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'containers'
ORDER BY ordinal_position;
```

2. **تحقق من journal_entry_lines:** هل يتطلب tenant_id و company_id؟

3. **تحقق من الدوال الموجودة:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%container%';
```

---

## 5. الخلاصة

الخطة **جيدة ومتماسكة**، مع الملاحظات التالية:

- **نقطة قوة:** البنية التحتية غنية اكثر مما كنا نتوقع (دوال SQL جاهزة)
- **خطر محتمل:** عدم تطابق بين ما يفترضه الـ Service وما هو فعليا في الـ DB
- **توصية:** تنفيذ خطوة التحقق (القسم 4 اعلاه) قبل كتابة اي Migration

**الخطة جاهزة للتنفيذ بعد التحقق من البنية الفعلية.**

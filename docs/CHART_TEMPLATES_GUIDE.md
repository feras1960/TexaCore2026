# 📚 دليل نظام قوالب الشجرات المحاسبية

## 🎯 نظرة عامة

نظام قوالب الشجرات المحاسبية يسمح لكل تينانت باختيار نوع الشجرة المحاسبية المناسبة عند التسجيل، مع إمكانية الترقية لاحقاً.

---

## 📊 أنواع القوالب المتاحة

| القالب | الكود | عدد الحسابات | البيانات التجريبية | الاستخدام |
|--------|-------|---------------|-------------------|-----------|
| **الشجرة القياسية** | `simple` | ~40 | ❌ | الشركات الصغيرة |
| **الشجرة الموسعة** | `extended` | ~80 | ❌ | الشركات المتوسطة |
| **الشجرة الموسعة للأقمشة** | `fabric_extended` | 59 | ❌ | تجارة الأقمشة |
| **الشجرة الموسعة للأقمشة + بيانات** | `fabric_extended_demo` | 59 | ✅ | للاختبار والتعلم |

---

## 🚀 الإعداد الأولي

### 1. تشغيل Migration

```sql
-- شغّل في Supabase SQL Editor
-- supabase/migrations/STEP_31_chart_templates_system.sql
```

### 2. تعميم القوالب على التينانتات الموجودة

```sql
-- شغّل في Supabase SQL Editor
-- supabase/seed/PROPAGATE_TEMPLATES_TO_ALL.sql
```

---

## 📋 استخدام النظام

### 1️⃣ عند تسجيل مشترك جديد

عند إنشاء تينانت جديد، سيتم **تلقائياً** إعداد القوالب الأربعة له:

```sql
-- يتم تلقائياً عبر Trigger
-- لا حاجة لتنفيذ أي شيء يدوياً
```

### 2️⃣ تطبيق قالب على شركة

بعد أن يختار المستخدم نوع الشجرة، استخدم:

```sql
SELECT apply_chart_template_to_company(
    'company_uuid',           -- معرف الشركة
    'fabric_extended_demo'    -- رمز القالب
);
```

**القوالب المتاحة:**
- `simple` - القياسية
- `extended` - الموسعة
- `fabric_extended` - الموسعة للأقمشة
- `fabric_extended_demo` - الموسعة للأقمشة + بيانات تجريبية

### 3️⃣ ترقية الشجرة المحاسبية

يمكن ترقية الشجرة من نوع لآخر:

```sql
-- من القياسية للموسعة
SELECT upgrade_company_chart('company_uuid', 'extended');

-- من القياسية للموسعة للأقمشة
SELECT upgrade_company_chart('company_uuid', 'fabric_extended');

-- من الموسعة للموسعة للأقمشة
SELECT upgrade_company_chart('company_uuid', 'fabric_extended');
```

**⚠️ ملاحظة:** لا يمكن التراجع (downgrade) - فقط ترقية للأعلى.

---

## 🔄 مسارات الترقية المسموحة

```
simple ──┐
         ├──→ extended ──→ fabric_extended
         └──→ fabric_extended
```

**مثال:**
- ✅ `simple` → `extended` ✓
- ✅ `simple` → `fabric_extended` ✓
- ✅ `extended` → `fabric_extended` ✓
- ❌ `extended` → `simple` ✗ (غير مسموح)
- ❌ `fabric_extended` → `extended` ✗ (غير مسموح)

---

## 📦 البيانات التجريبية

### القالب `fabric_extended_demo` يتضمن:

| البيان | العدد |
|--------|-------|
| مجموعات العملاء | 3 (جملة، تجزئة، VIP) |
| مجموعات الموردين | 2 (محلي، استيراد) |
| العملاء | 5 |
| الموردين | 5 |
| مجموعات الأقمشة | 5 (قطن، بوليستر، حرير، كتان، صوف) |
| ألوان الأقمشة | 15 |
| وحدات القياس | 5 |
| الصناديق والبنوك | 1 (صندوق رئيسي) |

### إضافة بيانات تجريبية لشركة موجودة

```sql
SELECT copy_demo_data_to_company('company_uuid');
```

**⚠️ تحذير:** هذه الدالة تضيف البيانات فقط - لا تحذف البيانات الموجودة.

---

## 🛠️ الدوال المتاحة

### `setup_chart_templates_for_tenant(tenant_id)`
إعداد القوالب الأربعة لتينانت.

```sql
SELECT setup_chart_templates_for_tenant('tenant_uuid');
```

### `apply_chart_template_to_company(company_id, template_code)`
تطبيق قالب على شركة.

```sql
SELECT apply_chart_template_to_company('company_uuid', 'fabric_extended');
```

### `upgrade_company_chart(company_id, target_chart_type)`
ترقية شجرة شركة.

```sql
SELECT upgrade_company_chart('company_uuid', 'extended');
```

### `copy_demo_data_to_company(company_id)`
نسخ البيانات التجريبية لشركة.

```sql
SELECT copy_demo_data_to_company('company_uuid');
```

### `propagate_templates_to_all_tenants()`
تعميم القوالب على جميع التينانتات.

```sql
SELECT * FROM propagate_templates_to_all_tenants();
```

---

## 📊 عرض القوالب المتاحة لتينانت

```sql
SELECT 
    template_code,
    template_name_ar,
    template_name_en,
    chart_type,
    include_demo_data,
    is_active
FROM chart_templates
WHERE tenant_id = 'tenant_uuid'
ORDER BY template_code;
```

---

## 🔍 التحقق من نوع الشجرة لشركة

```sql
SELECT 
    c.name_ar AS company_name,
    c.chart_type,
    COUNT(coa.id) AS accounts_count
FROM companies c
LEFT JOIN chart_of_accounts coa ON coa.company_id = c.id
WHERE c.id = 'company_uuid'
GROUP BY c.id, c.name_ar, c.chart_type;
```

---

## ⚙️ التكامل مع Frontend

### 1. عند التسجيل

```typescript
// بعد إنشاء الشركة
const companyId = await createCompany(data);

// عرض القوالب المتاحة
const templates = await supabase
  .from('chart_templates')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_active', true);

// المستخدم يختار قالب
const selectedTemplate = 'fabric_extended_demo';

// تطبيق القالب
await supabase.rpc('apply_chart_template_to_company', {
  p_company_id: companyId,
  p_template_code: selectedTemplate
});
```

### 2. عرض خيارات الترقية

```typescript
// التحقق من نوع الشجرة الحالية
const company = await supabase
  .from('companies')
  .select('chart_type')
  .eq('id', companyId)
  .single();

// عرض خيارات الترقية
const upgradeOptions = {
  simple: ['extended', 'fabric_extended'],
  extended: ['fabric_extended'],
  fabric_extended: [] // لا يمكن الترقية أكثر
}[company.chart_type];
```

---

## 🎯 سيناريوهات الاستخدام

### السيناريو 1: شركة جديدة تختار القياسية

```sql
-- 1. إنشاء الشركة
INSERT INTO companies (tenant_id, name_ar, name_en, chart_type)
VALUES ('tenant_uuid', 'شركة جديدة', 'New Company', 'simple');

-- 2. تطبيق القالب
SELECT apply_chart_template_to_company('company_uuid', 'simple');
```

### السيناريو 2: ترقية من القياسية للموسعة

```sql
SELECT upgrade_company_chart('company_uuid', 'extended');
```

### السيناريو 3: شركة تريد تجربة النظام بالبيانات التجريبية

```sql
-- تطبيق القالب مع البيانات
SELECT apply_chart_template_to_company('company_uuid', 'fabric_extended_demo');

-- لاحقاً، يمكن حذف البيانات التجريبية والاحتفاظ بالشجرة فقط
-- (يتم يدوياً عبر Frontend)
```

---

## 🔐 الأمان

- جميع الدوال تستخدم `SECURITY DEFINER` - تعمل بصلاحيات المالك
- التحقق من `tenant_id` في جميع العمليات
- لا يمكن حذف شجرة موجودة إلا يدوياً

---

## 📝 ملاحظات مهمة

1. **البيانات التجريبية منفصلة:** القالب `fabric_extended_demo` يضيف بيانات تجريبية يمكن حذفها لاحقاً دون التأثير على الشجرة.

2. **الترقية أحادية الاتجاه:** لا يمكن التراجع من شجرة موسعة لقياسية.

3. **القوالب تلقائية:** كل تينانت جديد يحصل تلقائياً على القوالب الأربعة.

4. **البيانات التجريبية اختيارية:** يمكن إضافتها لاحقاً باستخدام `copy_demo_data_to_company()`.

---

## 🐛 استكشاف الأخطاء

### المشكلة: القوالب غير موجودة لتينانت

```sql
-- الحل: إعداد القوالب يدوياً
SELECT setup_chart_templates_for_tenant('tenant_uuid');
```

### المشكلة: لا يمكن تطبيق قالب - شجرة موجودة

```sql
-- الحل: حذف الشجرة القديمة أولاً (بحذر!)
DELETE FROM chart_of_accounts WHERE company_id = 'company_uuid';

-- ثم تطبيق القالب
SELECT apply_chart_template_to_company('company_uuid', 'fabric_extended');
```

### المشكلة: الترقية فشلت

```sql
-- التحقق من نوع الشجرة الحالية
SELECT chart_type FROM companies WHERE id = 'company_uuid';

-- التأكد من مسار الترقية الصحيح
-- simple → extended ✓
-- simple → fabric_extended ✓
-- extended → fabric_extended ✓
```

---

## 📞 الدعم

للمساعدة أو الاستفسارات، راجع:
- `supabase/migrations/STEP_31_chart_templates_system.sql`
- `supabase/seed/PROPAGATE_TEMPLATES_TO_ALL.sql`

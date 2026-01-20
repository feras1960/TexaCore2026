# إدارة Migrations في Supabase - Multi-Tenant
# Migration Management in Supabase - Multi-Tenant

## 🎯 المبدأ الأساسي

### ✅ **Migration واحد = يطبق على جميع Tenants**

---

## 📋 كيف تعمل Migrations

### 1️⃣ **إنشاء Migration:**
```bash
# في Supabase CLI
supabase migration new add_new_feature

# أو يدوياً
# supabase/migrations/20240119_add_new_feature.sql
```

### 2️⃣ **كتابة SQL:**
```sql
-- supabase/migrations/20240119_add_new_feature.sql
ALTER TABLE customers 
ADD COLUMN loyalty_points INT DEFAULT 0;

-- هذا التحديث يطبق على:
-- ✅ جميع Tenants الحالية
-- ✅ جميع Tenants المستقبلية
```

### 3️⃣ **تطبيق Migration:**
```bash
# طريقة 1: Supabase CLI
supabase db push

# طريقة 2: Supabase Dashboard
# SQL Editor → نسخ المحتوى → تنفيذ

# طريقة 3: API
# Supabase Management API
```

### 4️⃣ **النتيجة:**
```
✅ Tenant 1: لديه loyalty_points
✅ Tenant 2: لديه loyalty_points
✅ Tenant 3: لديه loyalty_points
✅ Tenant 4 (مستقبلي): سيكون لديه loyalty_points
```

---

## 🔄 سيناريوهات التحديث

### ✅ **سيناريو 1: إضافة حقل جديد**

```sql
-- Migration: 00020_add_loyalty_points.sql
ALTER TABLE customers 
ADD COLUMN loyalty_points INT DEFAULT 0;

-- يطبق على جميع Tenants تلقائياً ✅
```

---

### ✅ **سيناريو 2: إضافة جدول جديد**

```sql
-- Migration: 00021_add_loyalty_transactions.sql
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    points INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- يطبق على جميع Tenants تلقائياً ✅
```

---

### ✅ **سيناريو 3: تحديث بيانات موجودة**

```sql
-- Migration: 00022_update_existing_data.sql
UPDATE customers 
SET loyalty_points = 100 
WHERE loyalty_points IS NULL;

-- يطبق على جميع Tenants تلقائياً ✅
```

---

### ✅ **سيناريو 4: إضافة Function**

```sql
-- Migration: 00023_add_loyalty_function.sql
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    p_customer_id UUID,
    p_amount DECIMAL
) RETURNS INT AS $$
BEGIN
    RETURN FLOOR(p_amount / 100)::INT;
END;
$$ LANGUAGE plpgsql;

-- يطبق على جميع Tenants تلقائياً ✅
```

---

## 🆕 مشترك جديد

### ✅ **لا يحتاج Migration منفصل:**

```sql
-- 1. إنشاء Tenant
INSERT INTO tenants (code, name, email)
VALUES ('customer-005', 'سارة أحمد', 'sara@example.com');

-- 2. إنشاء Company
INSERT INTO companies (tenant_id, code, name)
VALUES ('tenant-uuid', 'COMP-001', 'شركة سارة');

-- 3. البيانات تبدأ فارغة
-- 4. جميع Migrations السابقة مطبقة بالفعل ✅
-- 5. الجداول والحقول موجودة ✅
```

**النتيجة:**
- ✅ Tenant جديد يستفيد من جميع Migrations السابقة
- ✅ لا حاجة لتطبيق Migrations يدوياً
- ✅ الجداول والحقول موجودة تلقائياً

---

## 🔐 Row Level Security (RLS)

### ✅ **RLS يضمن العزل:**

```sql
-- Migration: 00024_add_rls_policy.sql
CREATE POLICY "Users see their tenant loyalty data"
ON loyalty_transactions
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM companies 
        WHERE id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
);

-- يطبق على جميع Tenants تلقائياً ✅
-- كل Tenant يرى فقط بياناته ✅
```

---

## 📊 إدارة Migrations

### ✅ **طريقة 1: Supabase CLI (موصى بها)**

```bash
# 1. إنشاء Migration
supabase migration new add_feature

# 2. كتابة SQL في الملف
# supabase/migrations/20240119_add_feature.sql

# 3. تطبيق Migration
supabase db push

# 4. التحقق
supabase migration list
```

---

### ✅ **طريقة 2: Supabase Dashboard**

```sql
-- 1. افتح SQL Editor
-- 2. انسخ محتوى Migration
-- 3. نفذ SQL
-- 4. Migration يطبق على جميع Tenants
```

---

### ✅ **طريقة 3: API (للتطبيقات)**

```javascript
// استخدام Supabase Management API
const { data, error } = await supabaseAdmin
  .rpc('apply_migration', {
    migration_sql: 'ALTER TABLE customers ADD COLUMN...'
  });
```

---

## ⚠️ ملاحظات مهمة

### ✅ **DO (افعل):**
- ✅ استخدم Migrations لجميع التغييرات
- ✅ اختبر Migration على بيئة تطوير أولاً
- ✅ استخدم `IF NOT EXISTS` لتجنب الأخطاء
- ✅ راجع Migration قبل التطبيق

### ❌ **DON'T (لا تفعل):**
- ❌ لا تعدل قاعدة البيانات يدوياً بدون Migration
- ❌ لا تطبق Migration على tenant واحد فقط
- ❌ لا تحذف Migrations المطبقة
- ❌ لا تعدل Migrations المطبقة مسبقاً

---

## 🔄 Rollback (التراجع)

### ✅ **إذا أردت التراجع:**

```sql
-- Migration: 00025_rollback_loyalty_points.sql
ALTER TABLE customers 
DROP COLUMN IF EXISTS loyalty_points;

-- يطبق على جميع Tenants تلقائياً ✅
```

---

## 📋 قائمة التحقق

### قبل تطبيق Migration:
- [ ] اختبر على بيئة تطوير
- [ ] راجع SQL بعناية
- [ ] تأكد من استخدام `IF NOT EXISTS`
- [ ] نسخ احتياطي (اختياري)

### بعد تطبيق Migration:
- [ ] تحقق من التطبيق الناجح
- [ ] اختبر على tenant واحد
- [ ] تأكد من RLS policies
- [ ] راجع السجلات

---

## ✅ الخلاصة

| السؤال | الجواب |
|--------|--------|
| **Migration واحد أم لكل tenant؟** | ✅ واحد للجميع |
| **مشترك جديد يحتاج Migration؟** | ❌ لا، Migrations مطبقة مسبقاً |
| **كيف التحديثات؟** | ✅ Migration واحد يطبق على الجميع |
| **هل يدوي لكل tenant؟** | ❌ لا، تلقائي |

---

## 🎯 التوصية

**استخدم Supabase Migrations:**
- ✅ Migration واحد للجميع
- ✅ يطبق تلقائياً على جميع Tenants
- ✅ مشترك جديد يستفيد من جميع Migrations السابقة
- ✅ لا حاجة لتطبيق يدوي

**قاعدة بيانات واحدة + Migrations موحدة = الحل الأمثل ✅**

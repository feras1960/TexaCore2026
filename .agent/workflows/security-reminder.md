---
description: تذكير بمعايير الأمان وسياسات RLS للمشروع
---

# معايير الأمان - TexaCore Platform

## ⚠️ تحذير مهم جداً

> **السياسات القديمة مُلغاة تماماً منذ 2026-02-05**  
> لا تقرأ أو تستخدم أي ملفات migrations للسياسات قبل هذا التاريخ!  
> راجع `/docs/DEPRECATED_OLD_POLICIES.md` للتفاصيل

---

## 🔐 نظام RLS المطبّق (الجديد - 2026-02-05)

هذا المشروع يستخدم **Row Level Security (RLS)** مع عزل على 3 مستويات:
1. **Brand Level** - عزل البراندات (TexaCore, FinCore, MedCore, ...)
2. **Tenant Level** - عزل المستأجرين
3. **Company Level** - عزل الشركات

## 📚 الملفات المرجعية الأساسية:

```
/docs/SECURITY_STANDARDS.md          ← التوثيق الشامل (800+ سطر)
/supabase/scripts/
├── CREATE_helper_functions.sql      ← الدوال المساعدة (20+ دالة)
├── CREATE_protection_triggers.sql   ← تريغرات الحماية (214+)
├── APPLY_all_policies.sql           ← تطبيق السياسات (740 سياسة)
└── AUDIT_quick.sql                  ← للتحقق السريع
```

## 🔧 الدوال المساعدة الرئيسية:

| الدالة | الوصف |
|--------|-------|
| `is_platform_admin()` | هل مدير منصة؟ |
| `get_user_tenant_id()` | tenant المستخدم |
| `get_user_company_id()` | شركة المستخدم |
| `can_access_company(id)` | هل يمكنه الوصول للشركة؟ |
| `check_row_access(tenant, company)` | فحص شامل |
| `create_company_rls_policies(table)` | إنشاء سياسات |
| `apply_auto_tenant_trigger(table)` | تريغر tenant_id |
| `apply_auto_company_trigger(table)` | تريغر company_id |
| `apply_brand_isolation_trigger(table)` | تريغر عزل البراند |

## ⚠️ قواعد مهمة:

1. **كل جدول جديد** يجب أن يحتوي على:
   - `tenant_id` (للجداول على مستوى التينانت)
   - `company_id` (للجداول على مستوى الشركة)

2. **كل جدول** يجب أن يكون له:
   - RLS مفعّل (`ENABLE ROW LEVEL SECURITY`)
   - 4 سياسات (SELECT, INSERT, UPDATE, DELETE)

3. **للإضافة الآمنة** استخدم:
   ```sql
   SELECT create_company_rls_policies('table_name', true, true);
   SELECT apply_auto_tenant_trigger('table_name');
   SELECT apply_brand_isolation_trigger('table_name');
   ```

## 📊 الحالة الحالية:
- 185 جدول
- 740 سياسة
- 214+ تريغر

## 🔗 Workflow للإضافة:
استخدم `/add-new-table` لإضافة جدول جديد بشكل صحيح

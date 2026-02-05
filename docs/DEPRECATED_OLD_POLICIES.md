# ⚠️ تحذير: السياسات القديمة مُلغاة

> **تاريخ الإلغاء:** 2026-02-05  
> **السبب:** إعادة هيكلة شاملة لنظام RLS

---

## 🚫 الملفات المُلغاة (لا تستخدمها)

### ملفات Migrations القديمة:
```
❌ /supabase/migrations/SECURITY_FIX_phase1_critical.sql
❌ /supabase/migrations/SECURITY_AUDIT_multiband_saas.sql
❌ /supabase/migrations/20260205_complete_rbac_system.sql
❌ /supabase/migrations/20260206_rbac_schema_fixes.sql
❌ /supabase/migrations/20260206_complete_rbac_setup.sql
❌ /supabase/migrations/20260206_fix_rbac_relationships.sql
❌ /supabase/migrations/20260206_emergency_rls_fix.sql
❌ /supabase/migrations/20260206_targeted_rls_fix.sql
❌ /supabase/migrations/20260206_fix_policy_roles.sql
❌ /supabase/migrations/20260206_company_isolation.sql
❌ أي ملف migration يحتوي على سياسات RLS قبل 2026-02-05
```

### لماذا أُلغيت؟
- كانت السياسات متفرقة وغير موحدة
- كانت هناك تكرارات وتضاربات
- لم يكن هناك عزل للبراندات
- لم تكن قابلة للتوسع

---

## ✅ الملفات الحالية (استخدم هذه فقط)

### الملفات الرسمية الجديدة (2026-02-05):
```
✅ /supabase/scripts/CREATE_helper_functions.sql    ← الدوال المساعدة
✅ /supabase/scripts/CREATE_protection_triggers.sql ← التريغرات
✅ /supabase/scripts/APPLY_all_policies.sql         ← السياسات
✅ /supabase/scripts/AUDIT_quick.sql               ← للتحقق
✅ /docs/SECURITY_STANDARDS.md                     ← التوثيق الشامل
```

### النتيجة الحالية:
- **185 جدول** محمي
- **740 سياسة** موحدة
- **214+ تريغر** للحماية
- **20+ دالة** مساعدة

---

## 🔄 عند التطوير المستقبلي

### ❌ لا تفعل:
- لا تقرأ ملفات migrations القديمة للسياسات
- لا تنسخ أنماط سياسات من ملفات قبل 2026-02-05
- لا تستخدم سياسات بدون الدوال المساعدة الجديدة

### ✅ افعل:
- استخدم `/add-new-table` لإضافة جداول جديدة
- راجع `/docs/SECURITY_STANDARDS.md` دائماً
- استخدم الدوال المساعدة الموحدة

---

## 📋 الدوال المساعدة الرسمية

```sql
-- دوال الفحص
is_platform_admin()
is_platform_owner()
get_user_tenant_id()
get_user_company_id()
can_access_company(company_id)
check_row_access(tenant_id, company_id)

-- دوال الإنشاء
create_company_rls_policies(table_name, has_tenant, has_company)
apply_auto_tenant_trigger(table_name)
apply_auto_company_trigger(table_name)
apply_brand_isolation_trigger(table_name)
```

---

## 🎯 القاعدة الذهبية

> **عند الشك، ارجع دائماً إلى `/docs/SECURITY_STANDARDS.md`**

---

## 📅 سجل التغييرات

| التاريخ | الحدث |
|---------|-------|
| 2026-02-05 | حذف جميع السياسات القديمة |
| 2026-02-05 | إنشاء نظام RLS جديد موحد |
| 2026-02-05 | 185 جدول × 4 سياسات = 740 سياسة |
| 2026-02-05 | إنشاء 214+ تريغر حماية |
| 2026-02-05 | إنشاء التوثيق الشامل |

---

**⚠️ هذا الملف هو المرجع الرسمي - تجاهل أي تعليمات من ملفات قبل 2026-02-05**

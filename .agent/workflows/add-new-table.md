---
description: إضافة جدول جديد مع سياسات RLS والتريغرات
---

# إضافة جدول جديد للنظام

## 📋 المتطلبات قبل البدء:
- راجع `/docs/SECURITY_STANDARDS.md` لفهم أنماط السياسات
- حدد المجموعة التي ينتمي لها الجدول (منصة/وكلاء/تينانت/شركة/lookup)

## 🔄 خطوات إضافة جدول جديد:

### الخطوة 1: تحديد نوع الجدول
```
المجموعة أ (منصة): بدون tenant_id أو company_id
المجموعة ب (وكلاء): يحتوي partner_id
المجموعة ج (تينانت): يحتوي tenant_id فقط
المجموعة د (شركة): يحتوي tenant_id + company_id ← الأكثر شيوعاً
المجموعة هـ (lookup): بيانات مرجعية ثابتة
```

### الخطوة 2: إنشاء الجدول
```sql
-- للمجموعة د (شركة) - الأكثر شيوعاً:
CREATE TABLE public.new_table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    -- أضف باقي الأعمدة هنا
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- الفهارس الأساسية
CREATE INDEX idx_new_table_tenant ON public.new_table_name(tenant_id);
CREATE INDEX idx_new_table_company ON public.new_table_name(company_id);
```

### الخطوة 3: تفعيل RLS وإنشاء السياسات
```sql
-- تفعيل RLS
ALTER TABLE public.new_table_name ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات (استخدم الدالة المساعدة)
SELECT create_company_rls_policies('new_table_name', true, true);
```

### الخطوة 4: إضافة التريغرات
```sql
-- التعيين التلقائي
SELECT apply_auto_tenant_trigger('new_table_name');
SELECT apply_auto_company_trigger('new_table_name');
SELECT apply_brand_isolation_trigger('new_table_name');
```

### الخطوة 5: التحقق
```sql
-- تحقق من السياسات
SELECT * FROM pg_policies WHERE tablename = 'new_table_name';

-- تحقق من التريغرات
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'new_table_name';
```

## 📁 الملفات المرجعية:
- `/docs/SECURITY_STANDARDS.md` - التوثيق الشامل
- `/supabase/scripts/CREATE_helper_functions.sql` - الدوال المساعدة
- `/supabase/scripts/AUDIT_quick.sql` - للتحقق السريع

## ⚠️ تحذيرات:
- لا تنسَ إضافة tenant_id و company_id للجداول الجديدة
- تأكد من تفعيل RLS على كل جدول جديد
- اختبر الوصول بمستخدمين مختلفين

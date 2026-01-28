-- ═══════════════════════════════════════════════════════════════
-- تحديث STEP_41: إضافة دعم العملة والدولة
-- ═══════════════════════════════════════════════════════════════

-- 1. حذف الدوال القديمة
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS create_default_company_for_tenant(UUID, VARCHAR, VARCHAR, VARCHAR);

-- 2. تنفيذ STEP_41 الكامل مرة أخرى
-- يرجى نسخ ولصق محتوى STEP_41_business_type_and_company_switcher.sql بالكامل

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات:
-- ═══════════════════════════════════════════════════════════════
-- ✅ الشركة الحقيقية (Production): العملة حسب الدولة المختارة
-- ✅ الشركة التجريبية (Testing): USD دائماً
-- ✅ Parameters جديدة: p_currency, p_country_code

-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار نظام الباقات والخصومات (Plans & Discounts System Test)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Test 1: عرض جميع الباقات (الأسعار الأصلية)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📦 Test 1: الباقات المتاحة (الأسعار الأصلية بالدولار)'; END $$;

SELECT 
    code as "الكود",
    name_ar as "الاسم",
    price_monthly as "شهري ($)",
    price_yearly as "سنوي ($)",
    max_companies as "الشركات",
    max_users as "المستخدمين",
    max_branches as "الفروع",
    trial_days as "تجريبي",
    CASE WHEN is_popular THEN '⭐' ELSE '' END as "شائع"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- ═══════════════════════════════════════════════════════════════
-- Test 2: عرض الخصومات النشطة
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '🎁 Test 2: الخصومات النشطة'; END $$;

SELECT 
    code as "الكود",
    name_ar as "الاسم",
    discount_percentage as "النسبة %",
    TO_CHAR(valid_from, 'YYYY-MM-DD') as "من",
    TO_CHAR(valid_to, 'YYYY-MM-DD') as "إلى",
    applies_to as "يطبق على",
    CASE WHEN is_active THEN '✅' ELSE '❌' END as "نشط",
    CASE WHEN NOW() BETWEEN valid_from AND valid_to THEN '🟢 حالي' ELSE '⚪ غير حالي' END as "الحالة"
FROM promotional_discounts
ORDER BY priority DESC, created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- Test 3: اختبار حساب السعر - Starter شهري
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '💰 Test 3: Starter - شهري (مع خصم 50%%)'; END $$;

SELECT 
    (result->>'plan_name_ar')::TEXT as "الباقة",
    (result->>'original_price')::DECIMAL as "السعر الأصلي",
    (result->>'promo_discount')::INT as "الخصم %",
    (result->>'final_price')::DECIMAL as "السعر النهائي",
    (result->>'total_savings')::DECIMAL as "التوفير",
    (result->>'currency')::TEXT as "العملة"
FROM (
    SELECT get_plan_pricing('starter', 'monthly', 2) as result
) sub;

-- ═══════════════════════════════════════════════════════════════
-- Test 4: اختبار حساب السعر - Starter سنوي (10 أشهر)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '💰 Test 4: Starter - سنوي (خصم 50%% + شهرين مجاناً)'; END $$;

SELECT 
    (result->>'plan_name_ar')::TEXT as "الباقة",
    (result->>'original_price')::DECIMAL as "السعر الأصلي",
    (result->>'promo_discount')::INT as "الخصم %",
    (result->>'free_months')::INT as "أشهر مجانية",
    (result->>'months_paid')::INT as "أشهر مدفوعة",
    (result->>'monthly_after_promo')::DECIMAL as "الشهري بعد الخصم",
    (result->>'final_price')::DECIMAL as "السعر السنوي",
    (result->>'total_savings')::DECIMAL as "التوفير الكلي",
    (result->>'savings_percentage')::DECIMAL as "نسبة التوفير %"
FROM (
    SELECT get_plan_pricing('starter', 'yearly', 2) as result
) sub;

-- ═══════════════════════════════════════════════════════════════
-- Test 5: اختبار حساب السعر - Professional شهري
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '💰 Test 5: Professional - شهري (مع خصم 50%%)'; END $$;

SELECT 
    (result->>'plan_name_ar')::TEXT as "الباقة",
    (result->>'original_price')::DECIMAL as "السعر الأصلي",
    (result->>'promo_discount')::INT as "الخصم %",
    (result->>'final_price')::DECIMAL as "السعر النهائي",
    (result->>'total_savings')::DECIMAL as "التوفير"
FROM (
    SELECT get_plan_pricing('professional', 'monthly', 2) as result
) sub;

-- ═══════════════════════════════════════════════════════════════
-- Test 6: اختبار حساب السعر - Professional سنوي
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '💰 Test 6: Professional - سنوي (خصم 50%% + شهرين مجاناً)'; END $$;

SELECT 
    (result->>'plan_name_ar')::TEXT as "الباقة",
    (result->>'original_price')::DECIMAL as "السعر الأصلي ($)",
    (result->>'monthly_after_promo')::DECIMAL as "الشهري بعد الخصم ($)",
    (result->>'months_paid')::INT as "أشهر مدفوعة",
    (result->>'final_price')::DECIMAL as "السعر السنوي ($)",
    (result->>'savings_percentage')::DECIMAL as "نسبة التوفير %"
FROM (
    SELECT get_plan_pricing('professional', 'yearly', 2) as result
) sub;

-- ═══════════════════════════════════════════════════════════════
-- Test 7: اختبار حساب السعر - Enterprise
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '💰 Test 7: Enterprise - ملخص الأسعار'; END $$;

SELECT 
    'شهري' as "نوع الاشتراك",
    (monthly_result->>'original_price')::DECIMAL as "السعر الأصلي",
    (monthly_result->>'final_price')::DECIMAL as "السعر النهائي",
    (monthly_result->>'total_savings')::DECIMAL as "التوفير"
FROM (SELECT get_plan_pricing('enterprise', 'monthly', 2) as monthly_result) m

UNION ALL

SELECT 
    'سنوي (10 أشهر)',
    (yearly_result->>'original_price')::DECIMAL,
    (yearly_result->>'final_price')::DECIMAL,
    (yearly_result->>'total_savings')::DECIMAL
FROM (SELECT get_plan_pricing('enterprise', 'yearly', 2) as yearly_result) y;

-- ═══════════════════════════════════════════════════════════════
-- Test 8: اختبار دالة get_promotional_discounts
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '🔍 Test 8: دالة get_promotional_discounts()'; END $$;

SELECT 
    code,
    name_ar,
    discount_percentage || '%' as discount,
    CASE WHEN is_current THEN '🟢 حالي' ELSE '⚪ غير حالي' END as status
FROM get_promotional_discounts(true);

-- ═══════════════════════════════════════════════════════════════
-- Test 9: ملخص الموديولات لكل باقة
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📋 Test 9: الموديولات المتضمنة في كل باقة'; END $$;

SELECT 
    sp.code as "الباقة",
    unnest(sp.included_modules) as "الموديول"
FROM subscription_plans sp
WHERE sp.is_active = true
ORDER BY sp.display_order;

-- ═══════════════════════════════════════════════════════════════
-- Test 10: الإحصائيات النهائية
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📊 Test 10: الإحصائيات النهائية'; END $$;

SELECT 
    'الباقات' as "النوع",
    COUNT(*) as "الإجمالي",
    COUNT(*) FILTER (WHERE is_active = true) as "النشطة"
FROM subscription_plans

UNION ALL

SELECT 
    'الخصومات',
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true AND NOW() BETWEEN valid_from AND valid_to)
FROM promotional_discounts;

-- ═══════════════════════════════════════════════════════════════
-- Test 11: جدول مقارنة سريع
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '📊 Test 11: جدول مقارنة الباقات'; END $$;

DO $$ BEGIN RAISE NOTICE 'الأسعار الأصلية:'; END $$;

SELECT 
    name_ar as "الباقة",
    '$' || price_monthly as "شهري",
    '$' || price_yearly as "سنوي",
    max_companies as "شركات",
    max_users as "مستخدمين"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

DO $$ BEGIN RAISE NOTICE 'الأسعار بعد خصم 50%%:'; END $$;

SELECT 
    name_ar as "الباقة",
    '$' || ROUND(price_monthly * 0.5, 2) as "شهري",
    '$' || ROUND(price_monthly * 0.5 * 10, 2) as "سنوي (10 أشهر)"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

DO $$ BEGIN RAISE NOTICE '✅ انتهى اختبار نظام الباقات والخصومات'; END $$;

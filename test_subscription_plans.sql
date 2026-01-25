-- ═══════════════════════════════════════════════════════════════════════════
-- اختبار نظام الباقات والخصومات (Plans & Discounts System Test)
-- ═══════════════════════════════════════════════════════════════════════════

\echo '════════════════════════════════════════════════════════';
\echo '🧪 اختبار نظام الباقات والخصومات';
\echo '════════════════════════════════════════════════════════';
\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 1: عرض جميع الباقات (الأسعار الأصلية)
-- ═══════════════════════════════════════════════════════════════

\echo '📦 Test 1: الباقات المتاحة (الأسعار الأصلية بالدولار)';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 2: عرض الخصومات النشطة
-- ═══════════════════════════════════════════════════════════════

\echo '🎁 Test 2: الخصومات النشطة';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 3: اختبار حساب السعر - Starter شهري
-- ═══════════════════════════════════════════════════════════════

\echo '💰 Test 3: Starter - شهري (مع خصم 50%)';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 4: اختبار حساب السعر - Starter سنوي (10 أشهر)
-- ═══════════════════════════════════════════════════════════════

\echo '💰 Test 4: Starter - سنوي (خصم 50% + شهرين مجاناً)';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 5: اختبار حساب السعر - Professional شهري
-- ═══════════════════════════════════════════════════════════════

\echo '💰 Test 5: Professional - شهري (مع خصم 50%)';
\echo '────────────────────────────────────────────────────────';

SELECT 
    (result->>'plan_name_ar')::TEXT as "الباقة",
    (result->>'original_price')::DECIMAL as "السعر الأصلي",
    (result->>'promo_discount')::INT as "الخصم %",
    (result->>'final_price')::DECIMAL as "السعر النهائي",
    (result->>'total_savings')::DECIMAL as "التوفير"
FROM (
    SELECT get_plan_pricing('professional', 'monthly', 2) as result
) sub;

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 6: اختبار حساب السعر - Professional سنوي
-- ═══════════════════════════════════════════════════════════════

\echo '💰 Test 6: Professional - سنوي (خصم 50% + شهرين مجاناً)';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 7: اختبار حساب السعر - Enterprise
-- ═══════════════════════════════════════════════════════════════

\echo '💰 Test 7: Enterprise - ملخص الأسعار';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 8: اختبار دالة get_promotional_discounts
-- ═══════════════════════════════════════════════════════════════

\echo '🔍 Test 8: دالة get_promotional_discounts()';
\echo '────────────────────────────────────────────────────────';

SELECT 
    code,
    name_ar,
    discount_percentage || '%' as discount,
    CASE WHEN is_current THEN '🟢 حالي' ELSE '⚪ غير حالي' END as status
FROM get_promotional_discounts(true);

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 9: ملخص الموديولات لكل باقة
-- ═══════════════════════════════════════════════════════════════

\echo '📋 Test 9: الموديولات المتضمنة في كل باقة';
\echo '────────────────────────────────────────────────────────';

SELECT 
    code as "الباقة",
    jsonb_array_length(included_modules) as "العدد",
    jsonb_array_elements_text(included_modules) as "الموديول"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order, jsonb_array_elements_text(included_modules);

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 10: الإحصائيات النهائية
-- ═══════════════════════════════════════════════════════════════

\echo '📊 Test 10: الإحصائيات النهائية';
\echo '────────────────────────────────────────────────────────';

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

\echo '';

-- ═══════════════════════════════════════════════════════════════
-- Test 11: جدول مقارنة سريع
-- ═══════════════════════════════════════════════════════════════

\echo '📊 Test 11: جدول مقارنة الباقات';
\echo '────────────────────────────────────────────────────────';

\echo 'الأسعار الأصلية:';
SELECT 
    name_ar as "الباقة",
    '$' || price_monthly as "شهري",
    '$' || price_yearly as "سنوي",
    max_companies as "شركات",
    max_users as "مستخدمين"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

\echo '';
\echo 'الأسعار بعد خصم 50%:';
SELECT 
    name_ar as "الباقة",
    '$' || ROUND(price_monthly * 0.5, 2) as "شهري",
    '$' || ROUND(price_monthly * 0.5 * 10, 2) as "سنوي (10 أشهر)"
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

\echo '';
\echo '════════════════════════════════════════════════════════';
\echo '✅ انتهى اختبار نظام الباقات والخصومات';
\echo '════════════════════════════════════════════════════════';

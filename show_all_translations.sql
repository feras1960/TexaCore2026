-- ═══════════════════════════════════════════════════════════════════════════
-- عرض جميع الترجمات المتاحة
-- Display All Available Translations
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 عرض جميع الترجمات للتجارة الإلكترونية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- 1. مجموعات العملاء - جميع اللغات
DO $$
BEGIN
    RAISE NOTICE '1️⃣ مجموعات العملاء (Customer Groups):';
    RAISE NOTICE '';
END $$;

SELECT 
    code,
    name_ar as "🇸🇦 عربي",
    name_en as "🇬🇧 English",
    name_de as "🇩🇪 Deutsch",
    name_tr as "🇹🇷 Türkçe",
    name_ru as "🇷🇺 Русский",
    name_uk as "🇺🇦 Українська",
    name_it as "🇮🇹 Italiano",
    name_pl as "🇵🇱 Polski",
    name_ro as "🇷🇴 Română"
FROM customer_groups
WHERE code IN ('RETAIL', 'WHOLESALE', 'VIP')
ORDER BY code;

-- 2. قوائم الأسعار - جميع اللغات
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣ قوائم الأسعار (Price Lists):';
    RAISE NOTICE '';
END $$;

SELECT 
    code,
    name_ar as "🇸🇦 عربي",
    name as "🇬🇧 English",
    name_de as "🇩🇪 Deutsch",
    name_tr as "🇹🇷 Türkçe",
    name_ru as "🇷🇺 Русский",
    name_uk as "🇺🇦 Українська",
    name_it as "🇮🇹 Italiano",
    name_pl as "🇵🇱 Polski",
    name_ro as "🇷🇴 Română"
FROM price_lists
WHERE code IN ('DEFAULT', 'RETAIL', 'WHOLESALE')
ORDER BY code;

-- 3. التحقق من وجود جميع الأعمدة
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣ الأعمدة المتاحة:';
    RAISE NOTICE '';
END $$;

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('customer_groups', 'price_lists')
  AND column_name LIKE 'name_%'
ORDER BY table_name, column_name;

-- 4. ملخص الترجمات
DO $$
DECLARE
    v_cg_columns INT;
    v_pl_columns INT;
BEGIN
    -- عدد أعمدة الترجمة في customer_groups
    SELECT COUNT(*) INTO v_cg_columns
    FROM information_schema.columns
    WHERE table_name = 'customer_groups' AND column_name LIKE 'name_%';
    
    -- عدد أعمدة الترجمة في price_lists
    SELECT COUNT(*) INTO v_pl_columns
    FROM information_schema.columns
    WHERE table_name = 'price_lists' AND column_name LIKE 'name_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ ملخص الترجمات:';
    RAISE NOTICE '';
    RAISE NOTICE '📊 customer_groups: % أعمدة ترجمة', v_cg_columns;
    RAISE NOTICE '📊 price_lists: % أعمدة ترجمة', v_pl_columns;
    RAISE NOTICE '';
    RAISE NOTICE '🌍 اللغات المدعومة:';
    RAISE NOTICE '   ✅ العربية (ar)';
    RAISE NOTICE '   ✅ English (en)';
    RAISE NOTICE '   ✅ Deutsch (de)';
    RAISE NOTICE '   ✅ Türkçe (tr)';
    RAISE NOTICE '   ✅ Русский (ru)';
    RAISE NOTICE '   ✅ Українська (uk)';
    RAISE NOTICE '   ✅ Italiano (it)';
    RAISE NOTICE '   ✅ Polski (pl)';
    RAISE NOTICE '   ✅ Română (ro)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

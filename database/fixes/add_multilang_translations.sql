-- ═══════════════════════════════════════════════════════════════════════════
-- إضافة ترجمات متعددة اللغات لنظام التجارة الإلكترونية
-- Add Multi-language Translations for E-Commerce System
-- ═══════════════════════════════════════════════════════════════════════════
-- اللغات المدعومة: ar, en, de, tr, ru, uk, it, pl, ro
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. إضافة أعمدة الترجمات لجدول customer_groups
DO $$
DECLARE
    v_columns TEXT[] := ARRAY['name_de', 'name_tr', 'name_ru', 'name_uk', 'name_it', 'name_pl', 'name_ro'];
    v_col TEXT;
BEGIN
    FOREACH v_col IN ARRAY v_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customer_groups' AND column_name = v_col
        ) THEN
            EXECUTE format('ALTER TABLE customer_groups ADD COLUMN %I VARCHAR(200)', v_col);
            RAISE NOTICE '✅ تمت إضافة عمود % لجدول customer_groups', v_col;
        END IF;
    END LOOP;
END $$;

-- 2. إضافة أعمدة الترجمات لجدول price_lists
DO $$
DECLARE
    v_columns TEXT[] := ARRAY['name_ar', 'name_de', 'name_tr', 'name_ru', 'name_uk', 'name_it', 'name_pl', 'name_ro'];
    v_col TEXT;
BEGIN
    FOREACH v_col IN ARRAY v_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_lists' AND column_name = v_col
        ) THEN
            EXECUTE format('ALTER TABLE price_lists ADD COLUMN %I VARCHAR(200)', v_col);
            RAISE NOTICE '✅ تمت إضافة عمود % لجدول price_lists', v_col;
        END IF;
    END LOOP;
END $$;

-- 3. تحديث الترجمات لمجموعات العملاء الافتراضية
DO $$
BEGIN
    -- RETAIL
    UPDATE customer_groups 
    SET 
        name_ar = 'زبائن التجزئة',
        name_en = 'Retail Customers',
        name_de = 'Einzelhandelskunden',
        name_tr = 'Perakende Müşteriler',
        name_ru = 'Розничные клиенты',
        name_uk = 'Роздрібні клієнти',
        name_it = 'Clienti al dettaglio',
        name_pl = 'Klienci detaliczni',
        name_ro = 'Clienți cu amănuntul'
    WHERE code = 'RETAIL';
    
    -- WHOLESALE
    UPDATE customer_groups 
    SET 
        name_ar = 'زبائن الجملة',
        name_en = 'Wholesale Customers',
        name_de = 'Großhandelskunden',
        name_tr = 'Toptan Müşteriler',
        name_ru = 'Оптовые клиенты',
        name_uk = 'Оптові клієнти',
        name_it = 'Clienti all''ingrosso',
        name_pl = 'Klienci hurtowi',
        name_ro = 'Clienți en-gros'
    WHERE code = 'WHOLESALE';
    
    -- VIP
    UPDATE customer_groups 
    SET 
        name_ar = 'زبائن VIP',
        name_en = 'VIP Customers',
        name_de = 'VIP-Kunden',
        name_tr = 'VIP Müşteriler',
        name_ru = 'VIP клиенты',
        name_uk = 'VIP клієнти',
        name_it = 'Clienti VIP',
        name_pl = 'Klienci VIP',
        name_ro = 'Clienți VIP'
    WHERE code = 'VIP';
    
    RAISE NOTICE '✅ تم تحديث ترجمات مجموعات العملاء';
END $$;

-- 4. تحديث الترجمات لقوائم الأسعار
DO $$
BEGIN
    -- DEFAULT
    UPDATE price_lists 
    SET 
        name = 'Default Price List',
        name_ar = 'قائمة الأسعار الافتراضية',
        name_de = 'Standard-Preisliste',
        name_tr = 'Varsayılan Fiyat Listesi',
        name_ru = 'Стандартный прайс-лист',
        name_uk = 'Стандартний прайс-лист',
        name_it = 'Listino prezzi predefinito',
        name_pl = 'Domyślny cennik',
        name_ro = 'Lista de prețuri implicită'
    WHERE code = 'DEFAULT';
    
    -- RETAIL
    UPDATE price_lists 
    SET 
        name = 'Retail Price List',
        name_ar = 'قائمة أسعار التجزئة',
        name_de = 'Einzelhandelspreisliste',
        name_tr = 'Perakende Fiyat Listesi',
        name_ru = 'Розничный прайс-лист',
        name_uk = 'Роздрібний прайс-лист',
        name_it = 'Listino prezzi al dettaglio',
        name_pl = 'Cennik detaliczny',
        name_ro = 'Lista de prețuri cu amănuntul'
    WHERE code = 'RETAIL';
    
    -- WHOLESALE
    UPDATE price_lists 
    SET 
        name = 'Wholesale Price List',
        name_ar = 'قائمة أسعار الجملة',
        name_de = 'Großhandelspreisliste',
        name_tr = 'Toptan Fiyat Listesi',
        name_ru = 'Оптовый прайс-лист',
        name_uk = 'Оптовий прайс-лист',
        name_it = 'Listino prezzi all''ingrosso',
        name_pl = 'Cennik hurtowy',
        name_ro = 'Lista de prețuri en-gros'
    WHERE code = 'WHOLESALE';
    
    RAISE NOTICE '✅ تم تحديث ترجمات قوائم الأسعار';
END $$;

-- 5. دالة مساعدة للحصول على الاسم المترجم
CREATE OR REPLACE FUNCTION get_translated_customer_group_name(
    p_customer_group_id UUID,
    p_language VARCHAR DEFAULT 'en'
) RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_name VARCHAR;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(name_%s, name_en, name_ar) FROM customer_groups WHERE id = $1',
        p_language
    ) INTO v_name USING p_customer_group_id;
    
    RETURN v_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_translated_price_list_name(
    p_price_list_id UUID,
    p_language VARCHAR DEFAULT 'en'
) RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_name VARCHAR;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(name_%s, name, name_ar) FROM price_lists WHERE id = $1',
        p_language
    ) INTO v_name USING p_price_list_id;
    
    RETURN v_name;
END;
$$;

-- 6. التحقق النهائي
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ نظام الترجمات متعدد اللغات جاهز!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 اللغات المدعومة:';
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
END $$;

-- عرض الترجمات المتاحة
SELECT 
    'customer_groups' as table_name,
    code,
    name_ar,
    name_en,
    name_de,
    name_tr,
    name_ru
FROM customer_groups
WHERE code IN ('RETAIL', 'WHOLESALE', 'VIP')
ORDER BY code;

SELECT 
    'price_lists' as table_name,
    code,
    name_ar,
    name,
    name_de,
    name_tr,
    name_ru
FROM price_lists
WHERE code IN ('DEFAULT', 'RETAIL', 'WHOLESALE')
ORDER BY code;

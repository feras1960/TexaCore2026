-- ═══════════════════════════════════════════════════════════════
-- STEP_35: نظام إعدادات التقريب (Rounding Settings)
-- ═══════════════════════════════════════════════════════════════

-- هذا الـ Migration يضيف نظام شامل لإعدادات التقريب على مستوى:
-- 1. الدول (افتراضيات إقليمية)
-- 2. الشركات (إعدادات خاصة بكل شركة)
-- 3. العملات (عدد المنازل العشرية لكل عملة - موجود مسبقاً)

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة إعدادات التقريب لجدول الدول
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- إعدادات التقريب على مستوى الدولة
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS rounding_method VARCHAR(10) DEFAULT 'half_up'; -- half_up, half_down, up, down, half_even
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS tax_rounding INT DEFAULT 2; -- عدد المنازل العشرية للضرائب
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS amount_rounding INT DEFAULT 2; -- عدد المنازل العشرية للمبالغ
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS unit_price_rounding INT DEFAULT 2; -- عدد المنازل العشرية لسعر الوحدة
    ALTER TABLE countries ADD COLUMN IF NOT EXISTS total_rounding INT DEFAULT 2; -- عدد المنازل العشرية للمجموع النهائي
    
    RAISE NOTICE '✅ تمت إضافة إعدادات التقريب لجدول countries';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. إضافة إعدادات التقريب لجدول الشركات
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- إعدادات التقريب على مستوى الشركة
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS rounding_method VARCHAR(10) DEFAULT 'half_up';
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_rounding INT DEFAULT 2;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS amount_rounding INT DEFAULT 2;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS unit_price_rounding INT DEFAULT 4; -- أسعار الوحدة قد تحتاج دقة أكثر
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_rounding INT DEFAULT 2;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS inherit_country_rounding BOOLEAN DEFAULT true; -- وراثة إعدادات الدولة
    
    RAISE NOTICE '✅ تمت إضافة إعدادات التقريب لجدول companies';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. تحديث إعدادات التقريب للدول (حسب المعايير الدولية)
-- ═══════════════════════════════════════════════════════════════

-- الدول العربية - معظمها 2 منازل عشرية
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 2,
    amount_rounding = 2,
    unit_price_rounding = 2,
    total_rounding = 2
WHERE code IN ('SAU', 'ARE', 'KWT', 'BHR', 'OMN', 'QAT', 'SYR', 'JOR', 'LBN', 'PSE', 'IRQ', 'YEM', 'EGY', 'LBY', 'TUN', 'MAR', 'DZA', 'SDN');

-- دول الخليج - الدينار الكويتي والبحريني والعماني (3 منازل عشرية)
UPDATE countries SET
    amount_rounding = 3,
    unit_price_rounding = 3,
    total_rounding = 3
WHERE code IN ('KWT', 'BHR', 'OMN');

-- أوروبا - معظمها 2 منازل عشرية
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 2,
    amount_rounding = 2,
    unit_price_rounding = 2,
    total_rounding = 2
WHERE code IN ('GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'CHE', 'UKR', 'RUS', 'ROU', 'MDA', 'POL', 'CZE', 'HUN', 'BGR');

-- اليابان - بدون منازل عشرية (الين)
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 0,
    amount_rounding = 0,
    unit_price_rounding = 0,
    total_rounding = 0
WHERE code = 'JPN';

-- الأمريكتين
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 2,
    amount_rounding = 2,
    unit_price_rounding = 2,
    total_rounding = 2
WHERE code IN ('USA', 'CAN', 'MEX', 'BRA', 'ARG');

-- آسيا الأخرى
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 2,
    amount_rounding = 2,
    unit_price_rounding = 2,
    total_rounding = 2
WHERE code IN ('TUR', 'CHN', 'IND', 'KOR', 'PAK', 'BGD');

-- أستراليا ونيوزيلندا وجنوب أفريقيا
UPDATE countries SET
    rounding_method = 'half_up',
    tax_rounding = 2,
    amount_rounding = 2,
    unit_price_rounding = 2,
    total_rounding = 2
WHERE code IN ('AUS', 'NZL', 'ZAF', 'NGA');

-- ═══════════════════════════════════════════════════════════════
-- 4. إنشاء دالة للتقريب (Universal Rounding Function)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION round_amount(
    p_amount DECIMAL(18,6),
    p_decimal_places INT,
    p_rounding_method VARCHAR(10) DEFAULT 'half_up'
)
RETURNS DECIMAL(18,6)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_multiplier DECIMAL;
    v_result DECIMAL(18,6);
BEGIN
    -- حساب المضاعف
    v_multiplier := POWER(10, p_decimal_places);
    
    -- تطبيق طريقة التقريب
    CASE p_rounding_method
        -- التقريب الطبيعي (النصف للأعلى) - الطريقة الأكثر شيوعاً
        WHEN 'half_up' THEN
            v_result := ROUND(p_amount * v_multiplier) / v_multiplier;
        
        -- التقريب للأسفل دائماً
        WHEN 'down', 'floor' THEN
            v_result := FLOOR(p_amount * v_multiplier) / v_multiplier;
        
        -- التقريب للأعلى دائماً
        WHEN 'up', 'ceil' THEN
            v_result := CEIL(p_amount * v_multiplier) / v_multiplier;
        
        -- التقريب المصرفي (النصف للزوجي) - أكثر دقة إحصائياً
        WHEN 'half_even', 'banker' THEN
            -- PostgreSQL's ROUND uses half-even by default in some cases
            v_result := ROUND(p_amount::NUMERIC, p_decimal_places);
        
        -- التقريب للأسفل (النصف للأسفل)
        WHEN 'half_down' THEN
            v_result := CASE
                WHEN (p_amount * v_multiplier - FLOOR(p_amount * v_multiplier)) < 0.5
                THEN FLOOR(p_amount * v_multiplier) / v_multiplier
                ELSE CEIL(p_amount * v_multiplier) / v_multiplier
            END;
        
        -- افتراضي: half_up
        ELSE
            v_result := ROUND(p_amount * v_multiplier) / v_multiplier;
    END CASE;
    
    RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. إنشاء دالة للحصول على إعدادات التقريب للشركة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_company_rounding_settings(p_company_id UUID)
RETURNS TABLE(
    rounding_method VARCHAR(10),
    tax_rounding INT,
    amount_rounding INT,
    unit_price_rounding INT,
    total_rounding INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(
            CASE WHEN c.inherit_country_rounding THEN co.rounding_method ELSE c.rounding_method END,
            'half_up'
        )::VARCHAR(10),
        COALESCE(
            CASE WHEN c.inherit_country_rounding THEN co.tax_rounding ELSE c.tax_rounding END,
            2
        )::INT,
        COALESCE(
            CASE WHEN c.inherit_country_rounding THEN co.amount_rounding ELSE c.amount_rounding END,
            2
        )::INT,
        COALESCE(
            CASE WHEN c.inherit_country_rounding THEN co.unit_price_rounding ELSE c.unit_price_rounding END,
            2
        )::INT,
        COALESCE(
            CASE WHEN c.inherit_country_rounding THEN co.total_rounding ELSE c.total_rounding END,
            2
        )::INT
    FROM companies c
    LEFT JOIN company_countries cc ON cc.company_id = c.id AND cc.is_primary = true
    LEFT JOIN countries co ON co.code = cc.country_code
    WHERE c.id = p_company_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. إنشاء دالة لتقريب المبلغ حسب إعدادات الشركة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION round_amount_for_company(
    p_company_id UUID,
    p_amount DECIMAL(18,6),
    p_type VARCHAR(20) DEFAULT 'amount' -- amount, tax, unit_price, total
)
RETURNS DECIMAL(18,6)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rounding_method VARCHAR(10);
    v_decimal_places INT;
    v_settings RECORD;
BEGIN
    -- الحصول على إعدادات التقريب
    SELECT * INTO v_settings FROM get_company_rounding_settings(p_company_id);
    
    v_rounding_method := v_settings.rounding_method;
    
    -- تحديد عدد المنازل العشرية حسب النوع
    v_decimal_places := CASE p_type
        WHEN 'tax' THEN v_settings.tax_rounding
        WHEN 'unit_price' THEN v_settings.unit_price_rounding
        WHEN 'total' THEN v_settings.total_rounding
        ELSE v_settings.amount_rounding
    END;
    
    -- تطبيق التقريب
    RETURN round_amount(p_amount, v_decimal_places, v_rounding_method);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. إنشاء View للعرض السريع لإعدادات التقريب
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_company_rounding_settings AS
SELECT
    c.id AS company_id,
    c.name AS company_name,
    co.code AS country_code,
    co.name AS country_name,
    c.inherit_country_rounding,
    CASE 
        WHEN c.inherit_country_rounding THEN co.rounding_method 
        ELSE c.rounding_method 
    END AS effective_rounding_method,
    CASE 
        WHEN c.inherit_country_rounding THEN co.tax_rounding 
        ELSE c.tax_rounding 
    END AS effective_tax_rounding,
    CASE 
        WHEN c.inherit_country_rounding THEN co.amount_rounding 
        ELSE c.amount_rounding 
    END AS effective_amount_rounding,
    CASE 
        WHEN c.inherit_country_rounding THEN co.unit_price_rounding 
        ELSE c.unit_price_rounding 
    END AS effective_unit_price_rounding,
    CASE 
        WHEN c.inherit_country_rounding THEN co.total_rounding 
        ELSE c.total_rounding 
    END AS effective_total_rounding
FROM companies c
LEFT JOIN company_countries cc ON cc.company_id = c.id AND cc.is_primary = true
LEFT JOIN countries co ON co.code = cc.country_code;

-- ═══════════════════════════════════════════════════════════════
-- النتيجة
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم إنشاء نظام التقريب بنجاح!';
    RAISE NOTICE '📊 دالة round_amount() - تقريب عام';
    RAISE NOTICE '🏢 دالة round_amount_for_company() - تقريب حسب الشركة';
    RAISE NOTICE '⚙️ دالة get_company_rounding_settings() - جلب الإعدادات';
    RAISE NOTICE '👁️ View v_company_rounding_settings - عرض الإعدادات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📝 أنواع التقريب المدعومة:';
    RAISE NOTICE '   • half_up: التقريب الطبيعي (النصف للأعلى) - الأكثر شيوعاً';
    RAISE NOTICE '   • half_down: التقريب للأسفل (النصف للأسفل)';
    RAISE NOTICE '   • up/ceil: التقريب للأعلى دائماً';
    RAISE NOTICE '   • down/floor: التقريب للأسفل دائماً';
    RAISE NOTICE '   • half_even/banker: التقريب المصرفي (أدق إحصائياً)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 أمثلة الاستخدام:';
    RAISE NOTICE '   SELECT round_amount(123.456, 2, ''half_up''); -- 123.46';
    RAISE NOTICE '   SELECT round_amount_for_company(''company_id'', 123.456, ''tax'');';
    RAISE NOTICE '   SELECT * FROM get_company_rounding_settings(''company_id'');';
    RAISE NOTICE '   SELECT * FROM v_company_rounding_settings;';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════════
-- 1. كل شركة يمكنها وراثة إعدادات الدولة أو تخصيص إعداداتها
-- 2. يمكن تحديد تقريب مختلف لكل نوع (ضرائب، مبالغ، أسعار، مجموع)
-- 3. الدينار الكويتي والبحريني والعماني: 3 منازل عشرية
-- 4. الين الياباني: 0 منازل عشرية
-- 5. باقي العملات: 2 منازل عشرية (افتراضي)
-- 6. التقريب المصرفي (half_even) أكثر دقة في الحسابات الكبيرة
-- 7. يمكن استخدام الدوال في الاستعلامات والـ Triggers
-- ═══════════════════════════════════════════════════════════════

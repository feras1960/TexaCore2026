-- ═══════════════════════════════════════════════════════════════
-- STEP 33: إضافة العملات الشائعة (30 عملة)
-- ═══════════════════════════════════════════════════════════════

-- هذا الـ Migration يضيف 30 عملة شائعة لجميع التينانتات الموجودة

DO $$
DECLARE
    v_tenant_record RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '🌍 بدء إضافة العملات الشائعة لجميع التينانتات...';
    
    -- حلقة على جميع التينانتات
    FOR v_tenant_record IN 
        SELECT id, name FROM tenants
    LOOP
        RAISE NOTICE '📋 معالجة التينانت: % (ID: %)', v_tenant_record.name, v_tenant_record.id;
        
        -- إدراج العملات للتينانت الحالي
        INSERT INTO currencies (tenant_id, code, name, name_ar, name_en, symbol, exchange_rate, decimal_places)
        VALUES
            -- عملات الخليج العربي
            (v_tenant_record.id, 'SAR', 'Saudi Riyal', 'ريال سعودي', 'Saudi Riyal', 'ر.س', 1.0, 2),
            (v_tenant_record.id, 'AED', 'UAE Dirham', 'درهم إماراتي', 'UAE Dirham', 'د.إ', 1.02, 2),
            (v_tenant_record.id, 'KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'Kuwaiti Dinar', 'د.ك', 0.30, 3),
            (v_tenant_record.id, 'BHD', 'Bahraini Dinar', 'دينار بحريني', 'Bahraini Dinar', 'د.ب', 0.38, 3),
            (v_tenant_record.id, 'OMR', 'Omani Rial', 'ريال عماني', 'Omani Rial', 'ر.ع', 0.38, 3),
            (v_tenant_record.id, 'QAR', 'Qatari Riyal', 'ريال قطري', 'Qatari Riyal', 'ر.ق', 3.64, 2),
            
            -- عملات الشام والعراق
            (v_tenant_record.id, 'SYP', 'Syrian Pound', 'ليرة سورية', 'Syrian Pound', 'ل.س', 13000.00, 2),
            (v_tenant_record.id, 'JOD', 'Jordanian Dinar', 'دينار أردني', 'Jordanian Dinar', 'د.أ', 0.71, 3),
            (v_tenant_record.id, 'IQD', 'Iraqi Dinar', 'دينار عراقي', 'Iraqi Dinar', 'د.ع', 1310.00, 3),
            (v_tenant_record.id, 'LBP', 'Lebanese Pound', 'ليرة لبنانية', 'Lebanese Pound', 'ل.ل', 89500.00, 2),
            
            -- أفريقيا والمغرب العربي
            (v_tenant_record.id, 'EGP', 'Egyptian Pound', 'جنيه مصري', 'Egyptian Pound', 'ج.م', 48.50, 2),
            (v_tenant_record.id, 'LYD', 'Libyan Dinar', 'دينار ليبي', 'Libyan Dinar', 'د.ل', 4.85, 3),
            (v_tenant_record.id, 'TND', 'Tunisian Dinar', 'دينار تونسي', 'Tunisian Dinar', 'د.ت', 3.10, 3),
            (v_tenant_record.id, 'MAD', 'Moroccan Dirham', 'درهم مغربي', 'Moroccan Dirham', 'د.م', 10.05, 2),
            (v_tenant_record.id, 'DZD', 'Algerian Dinar', 'دينار جزائري', 'Algerian Dinar', 'د.ج', 135.00, 2),
            
            -- أوروبا
            (v_tenant_record.id, 'EUR', 'Euro', 'يورو', 'Euro', '€', 0.92, 2),
            (v_tenant_record.id, 'GBP', 'British Pound', 'جنيه إسترليني', 'British Pound', '£', 0.79, 2),
            (v_tenant_record.id, 'CHF', 'Swiss Franc', 'فرنك سويسري', 'Swiss Franc', 'CHF', 0.88, 2),
            
            -- أوروبا الشرقية
            (v_tenant_record.id, 'UAH', 'Ukrainian Hryvnia', 'غريفنا أوكراني', 'Ukrainian Hryvnia', '₴', 41.00, 2),
            (v_tenant_record.id, 'RUB', 'Russian Ruble', 'روبل روسي', 'Russian Ruble', '₽', 92.00, 2),
            (v_tenant_record.id, 'RON', 'Romanian Leu', 'ليو روماني', 'Romanian Leu', 'lei', 4.58, 2),
            (v_tenant_record.id, 'MDL', 'Moldovan Leu', 'ليو مولدوفي', 'Moldovan Leu', 'L', 17.80, 2),
            (v_tenant_record.id, 'PLN', 'Polish Zloty', 'زلوتي بولندي', 'Polish Zloty', 'zł', 4.02, 2),
            (v_tenant_record.id, 'CZK', 'Czech Koruna', 'كورونا تشيكي', 'Czech Koruna', 'Kč', 22.80, 2),
            
            -- تركيا وآسيا
            (v_tenant_record.id, 'TRY', 'Turkish Lira', 'ليرة تركية', 'Turkish Lira', '₺', 34.20, 2),
            (v_tenant_record.id, 'CNY', 'Chinese Yuan', 'يوان صيني', 'Chinese Yuan', '¥', 7.24, 2),
            (v_tenant_record.id, 'INR', 'Indian Rupee', 'روبية هندية', 'Indian Rupee', '₹', 83.20, 2),
            (v_tenant_record.id, 'JPY', 'Japanese Yen', 'ين ياباني', 'Japanese Yen', '¥', 149.50, 0),
            
            -- أمريكا
            (v_tenant_record.id, 'USD', 'US Dollar', 'دولار أمريكي', 'US Dollar', '$', 1.00, 2),
            (v_tenant_record.id, 'CAD', 'Canadian Dollar', 'دولار كندي', 'Canadian Dollar', 'C$', 1.36, 2)
            
        ON CONFLICT (tenant_id, code) DO UPDATE SET
            name = EXCLUDED.name,
            name_ar = EXCLUDED.name_ar,
            name_en = EXCLUDED.name_en,
            symbol = EXCLUDED.symbol,
            exchange_rate = EXCLUDED.exchange_rate,
            decimal_places = EXCLUDED.decimal_places;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ تم إضافة/تحديث % عملة للتينانت: %', v_count, v_tenant_record.name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم الانتهاء من إضافة العملات لجميع التينانتات بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ خطأ أثناء إضافة العملات: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════════
-- 1. أسعار الصرف مبدئية ويمكن تحديثها لاحقاً من Nexa Agent
-- 2. جميع العملات ستكون متاحة افتراضياً
-- 3. العملات اليابانية (JPY) بدون كسور عشرية (0 decimal places)
-- 4. عملات الخليج الثلاثية (KWD, BHD, OMR) لديها 3 decimal places
-- 5. في حالة التعارض، يتم تحديث البيانات الموجودة
-- 6. تمت إضافة 30 عملة شاملة جميع المناطق المطلوبة
-- ═══════════════════════════════════════════════════════════════

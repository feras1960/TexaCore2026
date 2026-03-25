-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 7: تطبيق القالب مباشرة (عدد الحسابات = 0)
-- Step 7: Apply Template Directly (0 accounts)
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_template_code VARCHAR(50) := 'fabric_extended_demo';
    v_count INT;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 تطبيق القالب مباشرة';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على شركة';
        RETURN;
    END IF;
    
    RAISE NOTICE '📌 Tenant ID: %', v_tenant_id;
    RAISE NOTICE '📌 Company ID: %', v_company_id;
    
    -- التحقق من عدد الحسابات
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
    RAISE NOTICE '📊 عدد الحسابات الحالي: %', v_count;
    
    -- التأكد من وجود القوالب
    IF NOT EXISTS (SELECT 1 FROM chart_templates WHERE tenant_id = v_tenant_id) THEN
        RAISE NOTICE '📦 إعداد القوالب...';
        PERFORM setup_chart_templates_for_tenant(v_tenant_id);
    END IF;
    
    -- التحقق من وجود دالة create_fabric_extended_chart
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_fabric_extended_chart') THEN
        RAISE NOTICE '❌ دالة create_fabric_extended_chart غير موجودة';
        RAISE NOTICE '   يجب تشغيل STEP_30_fabric_extended_chart.sql أولاً';
        RETURN;
    END IF;
    
    -- إنشاء الشجرة مباشرة
    BEGIN
        RAISE NOTICE '';
        RAISE NOTICE '🔄 إنشاء شجرة الأقمشة الموسعة...';
        
        PERFORM create_fabric_extended_chart(v_company_id);
        
        SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_company_id;
        RAISE NOTICE '✅ تم إنشاء الشجرة! عدد الحسابات: %', v_count;
        
        -- إضافة البيانات التجريبية
        IF v_template_code LIKE '%demo%' THEN
            RAISE NOTICE '';
            RAISE NOTICE '📦 إضافة البيانات التجريبية...';
            
            -- التحقق من وجود دالة copy_demo_data_to_company
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'copy_demo_data_to_company') THEN
                PERFORM copy_demo_data_to_company(v_company_id);
                RAISE NOTICE '✅ تم إضافة البيانات التجريبية';
            ELSE
                RAISE NOTICE '⚠️ دالة copy_demo_data_to_company غير موجودة - سيتم إضافة البيانات يدوياً';
                
                -- إضافة البيانات يدوياً
                DECLARE
                    v_acc_receivable UUID;
                    v_acc_payable UUID;
                    v_cust_wholesale UUID;
                    v_cust_retail UUID;
                    v_cust_vip UUID;
                    v_supp_local UUID;
                    v_supp_import UUID;
                BEGIN
                    -- الحصول على حسابات الذمم
                    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '115' LIMIT 1;
                    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '211' LIMIT 1;
                    
                    -- مجموعات العملاء
                    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, discount_percent, credit_limit, payment_terms_days, is_active)
                    VALUES 
                        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 10, 150000, 30, true),
                        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 5, 30000, 15, true),
                        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 15, 300000, 45, true)
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    SELECT id INTO v_cust_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
                    SELECT id INTO v_cust_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
                    SELECT id INTO v_cust_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';
                    
                    -- مجموعات الموردين
                    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, payment_terms_days, is_active)
                    VALUES 
                        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 30, true),
                        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 60, true)
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    SELECT id INTO v_supp_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
                    SELECT id INTO v_supp_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';
                    
                    -- العملاء
                    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
                    VALUES 
                        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'company', 'info@goldentextile.com', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
                        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics Factory', 'company', 'sales@unitedfabrics.com', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 250000, v_acc_receivable, 'active'),
                        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'company', 'flowers@shop.com', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 40000, v_acc_receivable, 'active'),
                        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'company', 'info@elegance.com', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 35000, v_acc_receivable, 'active'),
                        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion Group', 'company', 'vip@premiumfashion.com', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 150000, v_acc_receivable, 'active')
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    -- الموردين
                    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
                    VALUES 
                        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable, 'active'),
                        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'company', 'info@advancedfibers.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable, 'active'),
                        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'company', 'export@bursatextile.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable, 'active'),
                        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'company', 'export@guangdongtextile.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable, 'active'),
                        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'company', 'export@mumbaicotton.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable, 'active')
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    -- مجموعات الأقمشة
                    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, icon, display_order, is_active)
                    VALUES 
                        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', '🧵', 1, true),
                        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', '✨', 2, true),
                        (v_tenant_id, 'SILK', 'حرير', 'Silk', '🦋', 3, true),
                        (v_tenant_id, 'LINEN', 'كتان', 'Linen', '🌿', 4, true),
                        (v_tenant_id, 'WOOL', 'صوف', 'Wool', '🐑', 5, true)
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    -- ألوان الأقمشة
                    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, is_active)
                    VALUES 
                        (v_tenant_id, 'WHITE', 'أبيض', 'White', true),
                        (v_tenant_id, 'BLACK', 'أسود', 'Black', true),
                        (v_tenant_id, 'RED', 'أحمر', 'Red', true),
                        (v_tenant_id, 'BLUE', 'أزرق', 'Blue', true),
                        (v_tenant_id, 'NAVY', 'كحلي', 'Navy', true),
                        (v_tenant_id, 'GREEN', 'أخضر', 'Green', true),
                        (v_tenant_id, 'BEIGE', 'بيج', 'Beige', true),
                        (v_tenant_id, 'CREAM', 'كريمي', 'Cream', true),
                        (v_tenant_id, 'GRAY', 'رمادي', 'Gray', true),
                        (v_tenant_id, 'BURGUNDY', 'عنابي', 'Burgundy', true),
                        (v_tenant_id, 'PINK', 'وردي', 'Pink', true),
                        (v_tenant_id, 'YELLOW', 'أصفر', 'Yellow', true),
                        (v_tenant_id, 'ORANGE', 'برتقالي', 'Orange', true),
                        (v_tenant_id, 'PURPLE', 'بنفسجي', 'Purple', true),
                        (v_tenant_id, 'BROWN', 'بني', 'Brown', true)
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    -- وحدات القياس
                    INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
                    VALUES 
                        (v_tenant_id, 'M', 'متر', 'Meter', 'length', true, 1, true),
                        (v_tenant_id, 'YARD', 'ياردة', 'Yard', 'length', false, 0.9144, true),
                        (v_tenant_id, 'ROLL', 'رولون', 'Roll', 'piece', true, 1, true),
                        (v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'weight', true, 1, true),
                        (v_tenant_id, 'PC', 'قطعة', 'Piece', 'piece', true, 1, true)
                    ON CONFLICT (tenant_id, code) DO NOTHING;
                    
                    RAISE NOTICE '✅ تم إضافة البيانات التجريبية يدوياً';
                END;
            END IF;
        END IF;
        
        -- تحديث نوع الشجرة
        UPDATE companies SET chart_type = 'fabric_extended' WHERE id = v_company_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ: %', SQLERRM;
        RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- التحقق من النتيجة
SELECT 
    'النتيجة النهائية' AS info,
    COUNT(coa.id) AS accounts_count,
    (SELECT COUNT(*) FROM customers WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'NexRev Platform') AND company_id = (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'NexRev Platform') ORDER BY created_at DESC LIMIT 1)) AS customers_count,
    (SELECT COUNT(*) FROM suppliers WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'NexRev Platform') AND company_id = (SELECT id FROM companies WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'NexRev Platform') ORDER BY created_at DESC LIMIT 1)) AS suppliers_count,
    (SELECT COUNT(*) FROM fabric_groups WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'NexRev Platform')) AS fabric_groups_count
FROM chart_of_accounts coa
JOIN companies c ON c.id = coa.company_id
JOIN tenants t ON t.id = c.tenant_id
WHERE t.name = 'NexRev Platform';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ الخطوة 10: إضافة البيانات التجريبية
-- Step 10: Add Demo Data
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_acc_receivable UUID;
    v_acc_payable UUID;
    v_cust_wholesale UUID;
    v_cust_retail UUID;
    v_cust_vip UUID;
    v_supp_local UUID;
    v_supp_import UUID;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 إضافة البيانات التجريبية';
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
    
    -- الحصول على حسابات الذمم
    SELECT id INTO v_acc_receivable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '115' LIMIT 1;
    SELECT id INTO v_acc_payable FROM chart_of_accounts WHERE company_id = v_company_id AND account_code = '211' LIMIT 1;
    
    IF v_acc_receivable IS NULL OR v_acc_payable IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على حسابات الذمم';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ حساب الذمم المدينة: %', v_acc_receivable;
    RAISE NOTICE '✅ حساب الذمم الدائنة: %', v_acc_payable;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 1. مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM customer_groups WHERE tenant_id = v_tenant_id;
    
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, discount_percent, credit_limit, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'WHOLESALE', 'تجار الجملة', 'Wholesale', 10, 150000, 30, true),
        (v_tenant_id, 'RETAIL', 'تجار التجزئة', 'Retail', 5, 30000, 15, true),
        (v_tenant_id, 'VIP', 'عملاء VIP', 'VIP Customers', 15, 300000, 45, true);
    
    SELECT id INTO v_cust_wholesale FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'WHOLESALE';
    SELECT id INTO v_cust_retail FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'RETAIL';
    SELECT id INTO v_cust_vip FROM customer_groups WHERE tenant_id = v_tenant_id AND code = 'VIP';
    
    RAISE NOTICE '✅ تم إنشاء 3 مجموعات عملاء';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM customers WHERE tenant_id = v_tenant_id AND company_id = v_company_id;
    
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, customer_type, email, phone, country, city, group_id, currency, credit_limit, receivable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'CUST-001', 'شركة النسيج الذهبي', 'Golden Textile Co.', 'company', 'info@goldentextile.com', '+380441234567', 'Ukraine', 'Kyiv', v_cust_wholesale, 'UAH', 200000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-002', 'مصنع الأقمشة المتحدة', 'United Fabrics Factory', 'company', 'sales@unitedfabrics.com', '+380442345678', 'Ukraine', 'Kharkiv', v_cust_wholesale, 'UAH', 250000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-003', 'محل أقمشة الزهور', 'Flowers Fabric Shop', 'company', 'flowers@shop.com', '+380443456789', 'Ukraine', 'Kyiv', v_cust_retail, 'UAH', 40000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-004', 'بوتيك الأناقة', 'Elegance Boutique', 'company', 'info@elegance.com', '+380444567890', 'Ukraine', 'Lviv', v_cust_retail, 'UAH', 35000, v_acc_receivable, 'active'),
        (v_tenant_id, v_company_id, 'CUST-005', 'مجموعة الأزياء الراقية', 'Premium Fashion Group', 'company', 'vip@premiumfashion.com', '+380445678901', 'Ukraine', 'Kyiv', v_cust_vip, 'EUR', 150000, v_acc_receivable, 'active');
    
    RAISE NOTICE '✅ تم إنشاء 5 عملاء';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM supplier_groups WHERE tenant_id = v_tenant_id;
    
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, payment_terms_days, is_active)
    VALUES 
        (v_tenant_id, 'LOCAL', 'موردين محليين', 'Local Suppliers', 30, true),
        (v_tenant_id, 'IMPORT', 'موردين استيراد', 'Import Suppliers', 60, true);
    
    SELECT id INTO v_supp_local FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'LOCAL';
    SELECT id INTO v_supp_import FROM supplier_groups WHERE tenant_id = v_tenant_id AND code = 'IMPORT';
    
    RAISE NOTICE '✅ تم إنشاء مجموعتين موردين';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM suppliers WHERE tenant_id = v_tenant_id AND company_id = v_company_id;
    
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, payable_account_id, status)
    VALUES 
        (v_tenant_id, v_company_id, 'SUPP-001', 'مصنع النسيج الأوكراني', 'Ukrainian Textile Mill', 'company', 'sales@utm.ua', '+380441111111', 'Ukraine', 'Kharkiv', v_supp_local, 'UAH', 30, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-002', 'شركة الألياف المتقدمة', 'Advanced Fibers Co.', 'company', 'info@advancedfibers.ua', '+380442222222', 'Ukraine', 'Dnipro', v_supp_local, 'UAH', 45, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-003', 'مصانع بورصة للنسيج', 'Bursa Textile Mills', 'company', 'export@bursatextile.com.tr', '+902241234567', 'Turkey', 'Bursa', v_supp_import, 'USD', 60, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-004', 'مصانع قوانغدونغ للنسيج', 'Guangdong Textile Factory', 'company', 'export@guangdongtextile.cn', '+8675512345678', 'China', 'Guangzhou', v_supp_import, 'USD', 90, v_acc_payable, 'active'),
        (v_tenant_id, v_company_id, 'SUPP-005', 'مصانع مومباي للقطن', 'Mumbai Cotton Mills', 'company', 'export@mumbaicotton.in', '+912212345678', 'India', 'Mumbai', v_supp_import, 'USD', 60, v_acc_payable, 'active');
    
    RAISE NOTICE '✅ تم إنشاء 5 موردين';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM fabric_groups WHERE tenant_id = v_tenant_id;
    
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, icon, display_order, is_active)
    VALUES 
        (v_tenant_id, 'COTTON', 'قطن', 'Cotton', '🧵', 1, true),
        (v_tenant_id, 'POLYESTER', 'بوليستر', 'Polyester', '✨', 2, true),
        (v_tenant_id, 'SILK', 'حرير', 'Silk', '🦋', 3, true),
        (v_tenant_id, 'LINEN', 'كتان', 'Linen', '🌿', 4, true),
        (v_tenant_id, 'WOOL', 'صوف', 'Wool', '🐑', 5, true);
    
    RAISE NOTICE '✅ تم إنشاء 5 مجموعات أقمشة';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. ألوان الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    DELETE FROM fabric_colors WHERE tenant_id = v_tenant_id;
    
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
        (v_tenant_id, 'BROWN', 'بني', 'Brown', true);
    
    RAISE NOTICE '✅ تم إنشاء 15 لون';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 7. وحدات القياس
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود جدول units_of_measure
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'units_of_measure'
    ) THEN
        DELETE FROM units_of_measure WHERE tenant_id = v_tenant_id;
        
        INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
        VALUES 
            (v_tenant_id, 'M', 'متر', 'Meter', 'length', true, 1, true),
            (v_tenant_id, 'YARD', 'ياردة', 'Yard', 'length', false, 0.9144, true),
            (v_tenant_id, 'ROLL', 'رولون', 'Roll', 'piece', true, 1, true),
            (v_tenant_id, 'KG', 'كيلوغرام', 'Kilogram', 'weight', true, 1, true),
            (v_tenant_id, 'PC', 'قطعة', 'Piece', 'piece', true, 1, true);
        
        RAISE NOTICE '✅ تم إنشاء 5 وحدات قياس';
    ELSE
        RAISE NOTICE '⚠️ جدول units_of_measure غير موجود - سيتم تخطي إضافة وحدات القياس';
        RAISE NOTICE '   يجب تشغيل migration 00006_add_core_modules.sql أولاً';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إضافة جميع البيانات التجريبية بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ: %', SQLERRM;
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
END;
$$;

-- التحقق من النتيجة النهائية
DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_accounts_count INT;
    v_customers_count INT;
    v_suppliers_count INT;
    v_fabric_groups_count INT;
    v_fabric_colors_count INT;
    v_units_count INT;
    v_units_table_exists BOOLEAN;
BEGIN
    -- الحصول على التينانت والشركة
    SELECT t.id, c.id INTO v_tenant_id, v_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'NexRev Platform'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على تينانت';
        RETURN;
    END IF;
    
    -- التحقق من وجود جدول units_of_measure
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'units_of_measure'
    ) INTO v_units_table_exists;
    
    -- عدد الحسابات
    SELECT COUNT(*) INTO v_accounts_count
    FROM chart_of_accounts coa
    JOIN companies c ON c.id = coa.company_id
    WHERE c.tenant_id = v_tenant_id;
    
    -- عدد العملاء
    SELECT COUNT(*) INTO v_customers_count
    FROM customers c
    WHERE c.tenant_id = v_tenant_id AND c.company_id = v_company_id;
    
    -- عدد الموردين
    SELECT COUNT(*) INTO v_suppliers_count
    FROM suppliers s
    WHERE s.tenant_id = v_tenant_id AND s.company_id = v_company_id;
    
    -- عدد مجموعات الأقمشة
    SELECT COUNT(*) INTO v_fabric_groups_count
    FROM fabric_groups fg
    WHERE fg.tenant_id = v_tenant_id;
    
    -- عدد ألوان الأقمشة
    SELECT COUNT(*) INTO v_fabric_colors_count
    FROM fabric_colors fc
    WHERE fc.tenant_id = v_tenant_id;
    
    -- عدد وحدات القياس (إذا كان الجدول موجوداً)
    IF v_units_table_exists THEN
        SELECT COUNT(*) INTO v_units_count
        FROM units_of_measure uom
        WHERE uom.tenant_id = v_tenant_id;
    ELSE
        v_units_count := -1; -- -1 يعني الجدول غير موجود
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 النتيجة النهائية:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '   الحسابات: %', v_accounts_count;
    RAISE NOTICE '   العملاء: %', v_customers_count;
    RAISE NOTICE '   الموردين: %', v_suppliers_count;
    RAISE NOTICE '   مجموعات الأقمشة: %', v_fabric_groups_count;
    RAISE NOTICE '   ألوان الأقمشة: %', v_fabric_colors_count;
    IF v_units_table_exists THEN
        RAISE NOTICE '   وحدات القياس: %', v_units_count;
    ELSE
        RAISE NOTICE '   وحدات القياس: الجدول غير موجود (يجب تشغيل migration 00006)';
    END IF;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

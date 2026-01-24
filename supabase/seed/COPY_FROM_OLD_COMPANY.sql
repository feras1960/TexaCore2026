-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔄 نقل البيانات من الشركة القديمة (تكساتايل نور) إلى شركتك الحالية
-- Copy Data from Old Company (Default Tenant) to Your Current Company
-- ═══════════════════════════════════════════════════════════════════════════════

-- إضافة حقل chart_type إذا لم يكن موجوداً
ALTER TABLE companies ADD COLUMN IF NOT EXISTS chart_type VARCHAR(30) DEFAULT 'simple';

DO $$
DECLARE
    -- المصدر (الشركة القديمة)
    v_source_tenant_id UUID;
    v_source_company_id UUID;
    
    -- الهدف (شركتك الحالية)
    v_target_tenant_id UUID;
    v_target_company_id UUID;
    
    -- للتتبع
    v_count INT;
    
    -- متغيرات للحسابات
    v_old_acc_id UUID;
    v_new_acc_id UUID;
    v_parent_code VARCHAR(50);
    v_new_parent_id UUID;
    
    -- للتسجيل
    rec RECORD;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🔄 نقل البيانات من الشركة القديمة إلى شركتك الحالية';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';

    -- ═══════════════════════════════════════════════════════════════
    -- 1️⃣ تحديد المصدر والهدف
    -- ═══════════════════════════════════════════════════════════════
    
    -- المصدر: Default Tenant (الشركة القديمة التي تحتوي على 59 حساب)
    SELECT t.id, c.id INTO v_source_tenant_id, v_source_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.name = 'Default Tenant'
    LIMIT 1;
    
    IF v_source_tenant_id IS NULL THEN
        -- جرب البحث بالشركة التي تحتوي على حسابات
        SELECT t.id, c.id INTO v_source_tenant_id, v_source_company_id
        FROM tenants t
        JOIN companies c ON c.tenant_id = t.id
        WHERE EXISTS (
            SELECT 1 FROM chart_of_accounts coa 
            WHERE coa.company_id = c.id
            HAVING COUNT(*) > 50
        )
        ORDER BY (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = c.id) DESC
        LIMIT 1;
    END IF;
    
    IF v_source_company_id IS NULL THEN
        RAISE EXCEPTION '❌ لم يتم العثور على الشركة المصدر (Default Tenant أو شركة بها حسابات)';
    END IF;
    
    -- الهدف: آخر تينانت/شركة (شركتك الحالية)
    SELECT t.id, c.id INTO v_target_tenant_id, v_target_company_id
    FROM tenants t
    JOIN companies c ON c.tenant_id = t.id
    WHERE t.id != v_source_tenant_id
    ORDER BY t.created_at DESC
    LIMIT 1;
    
    IF v_target_company_id IS NULL THEN
        RAISE EXCEPTION '❌ لم يتم العثور على شركتك الحالية';
    END IF;
    
    -- التأكد من أن المصدر والهدف مختلفان
    IF v_source_tenant_id = v_target_tenant_id THEN
        RAISE EXCEPTION '❌ المصدر والهدف هما نفس التينانت!';
    END IF;
    
    RAISE NOTICE '📌 المصدر - Tenant: %, Company: %', v_source_tenant_id, v_source_company_id;
    RAISE NOTICE '📌 الهدف - Tenant: %, Company: %', v_target_tenant_id, v_target_company_id;
    
    -- عرض أسماء الشركات
    RAISE NOTICE '   المصدر: %', (SELECT name_ar FROM companies WHERE id = v_source_company_id);
    RAISE NOTICE '   الهدف: %', (SELECT name_ar FROM companies WHERE id = v_target_company_id);

    -- ═══════════════════════════════════════════════════════════════
    -- 2️⃣ نسخ شجرة الحسابات
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف الشجرة الحالية للهدف (إن وجدت)
    DELETE FROM chart_of_accounts WHERE company_id = v_target_company_id;
    RAISE NOTICE '🗑️ تم حذف شجرة الحسابات القديمة للهدف';
    
    -- نسخ الحسابات الرئيسية أولاً (بدون parent_id)
    INSERT INTO chart_of_accounts (
        tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable, is_payable, currency
    )
    SELECT 
        v_target_tenant_id, v_target_company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        account_type_id, NULL, is_detail, is_active, is_cash_account, is_bank_account, is_receivable, is_payable, currency
    FROM chart_of_accounts 
    WHERE company_id = v_source_company_id AND parent_id IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % حسابات رئيسية', v_count;
    
    -- نسخ الحسابات الفرعية (المستوى الثاني)
    INSERT INTO chart_of_accounts (
        tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable, is_payable, currency
    )
    SELECT 
        v_target_tenant_id, v_target_company_id, src.account_code, src.name_ar, src.name_en, src.name_ru, src.name_uk, src.name_ro, src.name_pl, src.name_tr, src.name_de, src.name_it,
        src.account_type_id,
        (SELECT id FROM chart_of_accounts WHERE company_id = v_target_company_id AND account_code = parent.account_code),
        src.is_detail, src.is_active, src.is_cash_account, src.is_bank_account, src.is_receivable, src.is_payable, src.currency
    FROM chart_of_accounts src
    JOIN chart_of_accounts parent ON src.parent_id = parent.id
    WHERE src.company_id = v_source_company_id 
      AND parent.parent_id IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % حسابات (المستوى الثاني)', v_count;
    
    -- نسخ الحسابات الفرعية (المستوى الثالث)
    INSERT INTO chart_of_accounts (
        tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable, is_payable, currency
    )
    SELECT 
        v_target_tenant_id, v_target_company_id, src.account_code, src.name_ar, src.name_en, src.name_ru, src.name_uk, src.name_ro, src.name_pl, src.name_tr, src.name_de, src.name_it,
        src.account_type_id,
        (SELECT id FROM chart_of_accounts WHERE company_id = v_target_company_id AND account_code = parent.account_code),
        src.is_detail, src.is_active, src.is_cash_account, src.is_bank_account, src.is_receivable, src.is_payable, src.currency
    FROM chart_of_accounts src
    JOIN chart_of_accounts parent ON src.parent_id = parent.id
    JOIN chart_of_accounts grandparent ON parent.parent_id = grandparent.id
    WHERE src.company_id = v_source_company_id 
      AND grandparent.parent_id IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % حسابات (المستوى الثالث)', v_count;
    
    -- نسخ الحسابات الفرعية (المستوى الرابع إن وجد)
    INSERT INTO chart_of_accounts (
        tenant_id, company_id, account_code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        account_type_id, parent_id, is_detail, is_active, is_cash_account, is_bank_account, is_receivable, is_payable, currency
    )
    SELECT 
        v_target_tenant_id, v_target_company_id, src.account_code, src.name_ar, src.name_en, src.name_ru, src.name_uk, src.name_ro, src.name_pl, src.name_tr, src.name_de, src.name_it,
        src.account_type_id,
        (SELECT id FROM chart_of_accounts WHERE company_id = v_target_company_id AND account_code = parent.account_code),
        src.is_detail, src.is_active, src.is_cash_account, src.is_bank_account, src.is_receivable, src.is_payable, src.currency
    FROM chart_of_accounts src
    JOIN chart_of_accounts parent ON src.parent_id = parent.id
    WHERE src.company_id = v_source_company_id 
      AND NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_target_company_id AND account_code = src.account_code);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        RAISE NOTICE '✅ تم نسخ % حسابات إضافية', v_count;
    END IF;
    
    -- عدد الحسابات الإجمالي
    SELECT COUNT(*) INTO v_count FROM chart_of_accounts WHERE company_id = v_target_company_id;
    RAISE NOTICE '📊 إجمالي الحسابات المنسوخة: %', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 3️⃣ نسخ مجموعات العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف المجموعات القديمة للهدف
    DELETE FROM customer_groups WHERE tenant_id = v_target_tenant_id;
    
    INSERT INTO customer_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active)
    SELECT v_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, discount_percent, credit_limit, payment_terms_days, is_active
    FROM customer_groups WHERE tenant_id = v_source_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % مجموعات عملاء', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 4️⃣ نسخ مجموعات الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف المجموعات القديمة للهدف
    DELETE FROM supplier_groups WHERE tenant_id = v_target_tenant_id;
    
    INSERT INTO supplier_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active)
    SELECT v_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, payment_terms_days, is_active
    FROM supplier_groups WHERE tenant_id = v_source_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % مجموعات موردين', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 5️⃣ نسخ مجموعات الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف المجموعات القديمة للهدف
    DELETE FROM fabric_groups WHERE tenant_id = v_target_tenant_id;
    
    INSERT INTO fabric_groups (tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active)
    SELECT v_target_tenant_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it, icon, display_order, is_active
    FROM fabric_groups WHERE tenant_id = v_source_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % مجموعات أقمشة', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 6️⃣ نسخ ألوان الأقمشة
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف الألوان القديمة للهدف
    DELETE FROM fabric_colors WHERE tenant_id = v_target_tenant_id;
    
    -- نسخ الألوان (بدون hex_color إذا لم يكن موجوداً في الجدول)
    INSERT INTO fabric_colors (tenant_id, code, name_ar, name_en, is_active)
    SELECT v_target_tenant_id, code, name_ar, name_en, is_active
    FROM fabric_colors WHERE tenant_id = v_source_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % لون', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 7️⃣ نسخ وحدات القياس
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف الوحدات القديمة للهدف
    DELETE FROM units_of_measure WHERE tenant_id = v_target_tenant_id;
    
    INSERT INTO units_of_measure (tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active)
    SELECT v_target_tenant_id, code, name_ar, name_en, unit_type, base_unit, conversion_factor, is_active
    FROM units_of_measure WHERE tenant_id = v_source_tenant_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % وحدة قياس', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 8️⃣ نسخ الصناديق والبنوك
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف الصناديق القديمة
    DELETE FROM cash_accounts WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
    
    INSERT INTO cash_accounts (tenant_id, company_id, code, name_ar, name_en, account_type, gl_account_id, currency, current_balance, is_active)
    SELECT 
        v_target_tenant_id, v_target_company_id, src.code, src.name_ar, src.name_en, src.account_type,
        (SELECT id FROM chart_of_accounts tgt WHERE tgt.company_id = v_target_company_id AND tgt.account_code = 
            (SELECT account_code FROM chart_of_accounts WHERE id = src.gl_account_id)),
        src.currency, src.current_balance, src.is_active
    FROM cash_accounts src
    WHERE src.tenant_id = v_source_tenant_id AND src.company_id = v_source_company_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % صندوق/بنك', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 9️⃣ نسخ العملاء
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف العملاء القديمين للهدف
    DELETE FROM customers WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
    
    INSERT INTO customers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        customer_type, email, phone, country, city, group_id, currency, credit_limit, status)
    SELECT 
        v_target_tenant_id, v_target_company_id, src.code, src.name_ar, src.name_en, src.name_ru, src.name_uk, src.name_ro, src.name_pl, src.name_tr, src.name_de, src.name_it,
        src.customer_type, src.email, src.phone, src.country, src.city,
        (SELECT id FROM customer_groups WHERE tenant_id = v_target_tenant_id AND code = (SELECT code FROM customer_groups WHERE id = src.group_id)),
        src.currency, src.credit_limit, src.status
    FROM customers src
    WHERE src.tenant_id = v_source_tenant_id AND src.company_id = v_source_company_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % عميل', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- 🔟 نسخ الموردين
    -- ═══════════════════════════════════════════════════════════════
    
    -- حذف الموردين القدماء للهدف
    DELETE FROM suppliers WHERE tenant_id = v_target_tenant_id AND company_id = v_target_company_id;
    
    INSERT INTO suppliers (tenant_id, company_id, code, name_ar, name_en, name_ru, name_uk, name_ro, name_pl, name_tr, name_de, name_it,
        supplier_type, email, phone, country, city, group_id, currency, payment_terms_days, status)
    SELECT 
        v_target_tenant_id, v_target_company_id, src.code, src.name_ar, src.name_en, src.name_ru, src.name_uk, src.name_ro, src.name_pl, src.name_tr, src.name_de, src.name_it,
        src.supplier_type, src.email, src.phone, src.country, src.city,
        (SELECT id FROM supplier_groups WHERE tenant_id = v_target_tenant_id AND code = (SELECT code FROM supplier_groups WHERE id = src.group_id)),
        src.currency, src.payment_terms_days, src.status
    FROM suppliers src
    WHERE src.tenant_id = v_source_tenant_id AND src.company_id = v_source_company_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ تم نسخ % مورد', v_count;

    -- ═══════════════════════════════════════════════════════════════
    -- تحديث نوع الشجرة
    -- ═══════════════════════════════════════════════════════════════
    
    UPDATE companies SET chart_type = 'fabric_extended' WHERE id = v_target_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- النتيجة النهائية
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم نقل جميع البيانات بنجاح من الشركة القديمة!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;

-- عرض النتائج للتأكد
SELECT 'شجرة الحسابات' AS category, COUNT(*) AS count 
FROM chart_of_accounts 
WHERE company_id = (
    SELECT c.id FROM companies c 
    JOIN tenants t ON c.tenant_id = t.id 
    WHERE t.name != 'Default Tenant' 
    ORDER BY c.created_at DESC LIMIT 1
)
UNION ALL
SELECT 'العملاء', COUNT(*) 
FROM customers 
WHERE tenant_id = (SELECT id FROM tenants WHERE name != 'Default Tenant' ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'الموردين', COUNT(*) 
FROM suppliers 
WHERE tenant_id = (SELECT id FROM tenants WHERE name != 'Default Tenant' ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'مجموعات الأقمشة', COUNT(*) 
FROM fabric_groups 
WHERE tenant_id = (SELECT id FROM tenants WHERE name != 'Default Tenant' ORDER BY created_at DESC LIMIT 1)
UNION ALL
SELECT 'ألوان الأقمشة', COUNT(*) 
FROM fabric_colors 
WHERE tenant_id = (SELECT id FROM tenants WHERE name != 'Default Tenant' ORDER BY created_at DESC LIMIT 1);

-- ═══════════════════════════════════════════════════════════════════════════════
-- الإصلاح الجذري: ربط الحسابات الافتراضية بدورة حياة الشركة
-- Root Fix: Link Default Accounts to Company Lifecycle
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. دالة auto_set_default_accounts(company_id) — تحدد الحسابات حسب chart_type
-- 2. تحديث on_company_created trigger لاستدعاء الدالة تلقائياً
-- 3. تحديث register_new_subscriber لاستدعاء الدالة بعد تطبيق القالب
-- 4. تحديث apply_chart_template_to_company لاستدعاء الدالة
-- 5. تنفيذ على جميع الشركات الموجودة
--
-- خريطة الحسابات لكل نوع شجرة:
-- ┌──────────────────────┬──────────┬──────────┬────────────────┐
-- │ الحساب               │ simple   │ extended │ fabric_extended│
-- ├──────────────────────┼──────────┼──────────┼────────────────┤
-- │ الصندوق (Cash)       │ 1110     │ 1111     │ 111            │
-- │ البنك (Bank)         │ 1120     │ 1121     │ 112            │
-- │ الذمم المدينة        │ 1130     │ 1130     │ 115            │
-- │ الذمم الدائنة        │ 2110     │ 2110     │ 211            │
-- │ المبيعات (Revenue)   │ 4100     │ 4110     │ 41             │
-- │ المصروفات (Expense)  │ 5600     │ 5600     │ 591            │
-- │ المشتريات (COGS)     │ 5200     │ 5200     │ 51             │
-- │ ضريبة المخرجات       │ 2130     │ 2130     │ 215            │
-- │ ضريبة المدخلات       │ 1160     │ 1160     │ 215            │
-- │ المخزون (Inventory)  │ 1140     │ 1140     │ 131            │
-- └──────────────────────┴──────────┴──────────┴────────────────┘
-- ═══════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. دالة تحديد الحسابات الافتراضية تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_set_default_accounts(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_chart_type VARCHAR(30);
    v_settings_id UUID;
    v_account_id UUID;
    v_count INT := 0;
BEGIN
    -- الحصول على نوع الشجرة
    SELECT chart_type INTO v_chart_type FROM companies WHERE id = p_company_id;
    IF v_chart_type IS NULL THEN
        RAISE NOTICE '⚠️ الشركة % ليس لها نوع شجرة محدد', p_company_id;
        RETURN;
    END IF;
    
    -- التأكد من وجود سجل الإعدادات — إنشاؤه إذا لم يكن موجوداً
    SELECT id INTO v_settings_id FROM company_accounting_settings WHERE company_id = p_company_id;
    IF v_settings_id IS NULL THEN
        INSERT INTO company_accounting_settings (company_id, base_currency, fiscal_year_start_month, fiscal_year_end_month, enable_vat, decimal_places)
        VALUES (p_company_id, 'USD', 1, 12, true, 2)
        RETURNING id INTO v_settings_id;
        RAISE NOTICE '🆕 تم إنشاء إعدادات محاسبية جديدة للشركة %', p_company_id;
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '🔧 تحديد الحسابات الافتراضية للشركة %', p_company_id;
    RAISE NOTICE '   نوع الشجرة: %', v_chart_type;
    RAISE NOTICE '═══════════════════════════════════════════';

    -- ═══════════════════════════════════════════════════════════
    -- 1️⃣ حساب الصندوق (Cash Account)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND (
        CASE v_chart_type
            WHEN 'simple' THEN account_code = '1110'
            WHEN 'extended' THEN account_code = '1111'
            WHEN 'fabric_extended' THEN account_code = '111'
            ELSE false
        END
        OR is_cash_account = true
      )
    ORDER BY 
        CASE 
            WHEN v_chart_type = 'simple' AND account_code = '1110' THEN 0
            WHEN v_chart_type = 'extended' AND account_code = '1111' THEN 0
            WHEN v_chart_type = 'fabric_extended' AND account_code = '111' THEN 0
            WHEN is_cash_account = true THEN 1
            ELSE 10
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_cash_account_id = v_account_id WHERE id = v_settings_id AND (default_cash_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ الصندوق: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 2️⃣ حساب البنك (Bank Account)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND (
        CASE v_chart_type
            WHEN 'simple' THEN account_code = '1120'
            WHEN 'extended' THEN account_code = '1121'
            WHEN 'fabric_extended' THEN account_code = '112'
            ELSE false
        END
        OR is_bank_account = true
      )
    ORDER BY 
        CASE 
            WHEN v_chart_type = 'simple' AND account_code = '1120' THEN 0
            WHEN v_chart_type = 'extended' AND account_code = '1121' THEN 0
            WHEN v_chart_type = 'fabric_extended' AND account_code = '112' THEN 0
            WHEN is_bank_account = true THEN 1
            ELSE 10
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_bank_account_id = v_account_id WHERE id = v_settings_id AND (default_bank_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ البنك: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 3️⃣ الذمم المدينة (Accounts Receivable)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true
      AND (
        CASE v_chart_type
            WHEN 'simple' THEN account_code = '1130'
            WHEN 'extended' THEN account_code = '1130'
            WHEN 'fabric_extended' THEN account_code = '115'
            ELSE false
        END
        OR is_receivable = true
      )
    ORDER BY 
        CASE 
            WHEN account_code IN ('1130', '115') THEN 0
            WHEN is_receivable = true THEN 1
            ELSE 10
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_receivable_account_id = v_account_id WHERE id = v_settings_id AND (default_receivable_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ الذمم المدينة: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 4️⃣ الذمم الدائنة (Accounts Payable)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true
      AND (
        CASE v_chart_type
            WHEN 'simple' THEN account_code = '2110'
            WHEN 'extended' THEN account_code = '2110'
            WHEN 'fabric_extended' THEN account_code = '211'
            ELSE false
        END
        OR is_payable = true
      )
    ORDER BY 
        CASE 
            WHEN account_code IN ('2110', '211') THEN 0
            WHEN is_payable = true THEN 1
            ELSE 10
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_payable_account_id = v_account_id WHERE id = v_settings_id AND (default_payable_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ الذمم الدائنة: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 5️⃣ حساب المبيعات / الإيرادات (Revenue / Sales)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code = '4100'
            WHEN 'extended' THEN account_code = '4110'
            WHEN 'fabric_extended' THEN account_code = '41'
            ELSE false
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings 
        SET default_revenue_account_id = v_account_id,
            default_sales_account_id = v_account_id
        WHERE id = v_settings_id AND (default_revenue_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ المبيعات/الإيرادات: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 6️⃣ حساب المصروفات (Expenses)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code = '5600'
            WHEN 'extended' THEN account_code = '5600'
            WHEN 'fabric_extended' THEN account_code = '591'
            ELSE false
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_expense_account_id = v_account_id WHERE id = v_settings_id AND (default_expense_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ المصروفات: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 7️⃣ حساب المشتريات / تكلفة البضاعة (COGS / Purchases)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code IN ('5200', '5100')
            WHEN 'extended' THEN account_code IN ('5200', '5100')
            WHEN 'fabric_extended' THEN account_code = '51'
            ELSE false
        END
    ORDER BY
        CASE
            WHEN account_code IN ('5200', '51') THEN 0
            WHEN account_code = '5100' THEN 1
            ELSE 10
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings 
        SET default_purchase_account_id = v_account_id,
            default_cogs_account_id = v_account_id
        WHERE id = v_settings_id AND (default_purchase_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ المشتريات/COGS: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 8️⃣ حساب الضريبة (VAT / Tax)
    -- ═══════════════════════════════════════════════════════════
    -- ضريبة المخرجات (Output - Liabilities)
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code = '2130'
            WHEN 'extended' THEN account_code = '2130'
            WHEN 'fabric_extended' THEN account_code = '215'
            ELSE false
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings 
        SET default_tax_output_account_id = v_account_id
        WHERE id = v_settings_id AND (default_tax_output_account_id IS NULL);
        RAISE NOTICE '  ✅ ضريبة المخرجات: %', v_account_id;
    END IF;

    -- ضريبة المدخلات (Input - Assets)
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code = '1160'
            WHEN 'extended' THEN account_code = '1160'
            WHEN 'fabric_extended' THEN account_code = '215'
            ELSE false
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings 
        SET default_tax_input_account_id = v_account_id
        WHERE id = v_settings_id AND (default_tax_input_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ ضريبة المدخلات: %', v_account_id;
    END IF;

    -- ═══════════════════════════════════════════════════════════
    -- 9️⃣ حساب المخزون (Inventory)
    -- ═══════════════════════════════════════════════════════════
    SELECT id INTO v_account_id
    FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true AND is_detail = true
      AND CASE v_chart_type
            WHEN 'simple' THEN account_code = '1140'
            WHEN 'extended' THEN account_code = '1140'
            WHEN 'fabric_extended' THEN account_code = '131'
            ELSE false
        END
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_inventory_account_id = v_account_id WHERE id = v_settings_id AND (default_inventory_account_id IS NULL);
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ المخزون: %', v_account_id;
    END IF;

    RAISE NOTICE '═══════════════════════════════════════════';
    RAISE NOTICE '✅ تم تحديد % حسابات افتراضية للشركة', v_count;
    RAISE NOTICE '═══════════════════════════════════════════';
END;
$$;

COMMENT ON FUNCTION auto_set_default_accounts(UUID) IS 'تحديد الحسابات الافتراضية تلقائياً حسب نوع الشجرة المحاسبية (simple/extended/fabric_extended). يتم استدعاؤها تلقائياً عند التسجيل أو تطبيق قالب الشجرة.';


-- ═══════════════════════════════════════════════════════════════
-- 2. تحديث on_company_created — لإنشاء الإعدادات + تحديد الحسابات
--    هذا هو الـ Trigger الذي يعمل عند INSERT في companies
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION on_company_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء الشجرة البسيطة تلقائياً
    PERFORM create_simple_chart_of_accounts(NEW.id);
    
    -- 🆕 إنشاء إعدادات محاسبية افتراضية إذا لم تكن موجودة
    INSERT INTO company_accounting_settings (company_id, base_currency, fiscal_year_start_month, fiscal_year_end_month, enable_vat, decimal_places)
    VALUES (NEW.id, COALESCE(NEW.default_currency, 'USD'), 1, 12, true, 2)
    ON CONFLICT (company_id) DO NOTHING;
    
    -- 🆕 تحديد الحسابات الافتراضية تلقائياً
    PERFORM auto_set_default_accounts(NEW.id);
    
    RAISE NOTICE '✅ تم إنشاء شجرة الحسابات + الإعدادات للشركة الجديدة: %', NEW.id;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION on_company_created() IS 'Trigger: إنشاء الشجرة + الإعدادات + الحسابات الافتراضية تلقائياً عند إنشاء شركة';


-- ═══════════════════════════════════════════════════════════════
-- 3. تحديث apply_chart_template_to_company
--    يستدعي auto_set_default_accounts بعد إنشاء الشجرة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION apply_chart_template_to_company(
    p_company_id UUID,
    p_template_code VARCHAR(50)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_chart_type VARCHAR(30);
    v_include_demo BOOLEAN;
    v_template_id UUID;
BEGIN
    -- الحصول على tenant_id
    SELECT tenant_id INTO v_tenant_id FROM companies WHERE id = p_company_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'الشركة غير موجودة';
    END IF;
    
    -- الحصول على معلومات القالب
    SELECT id, chart_type, include_demo_data INTO v_template_id, v_chart_type, v_include_demo
    FROM chart_templates
    WHERE tenant_id = v_tenant_id AND template_code = p_template_code AND is_active = true;
    
    IF v_template_id IS NULL THEN
        -- محاولة البحث بدون tenant_id (قوالب عامة)
        SELECT id, chart_type, include_demo_data INTO v_template_id, v_chart_type, v_include_demo
        FROM chart_templates
        WHERE template_code = p_template_code AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_template_id IS NULL THEN
        -- إذا لم يوجد القالب، نستخدم النوع مباشرة
        v_chart_type := p_template_code; -- 'simple', 'extended', 'fabric_extended'
        RAISE NOTICE 'ℹ️ لم يُعثر على القالب %، استخدام النوع مباشرة', p_template_code;
    END IF;
    
    -- حذف الشجرة السابقة لاستبدالها بالجديدة (ترقية)
    DELETE FROM chart_of_accounts WHERE company_id = p_company_id;
    RAISE NOTICE '🗑️ تم حذف الشجرة السابقة للشركة %', p_company_id;
    
    -- إنشاء الشجرة حسب النوع
    CASE v_chart_type
        WHEN 'simple' THEN
            PERFORM create_simple_chart_of_accounts(p_company_id);
        WHEN 'extended' THEN
            PERFORM create_extended_chart_of_accounts(p_company_id);
        WHEN 'fabric_extended' THEN
            PERFORM create_fabric_extended_chart(p_company_id);
        ELSE
            RAISE EXCEPTION 'نوع الشجرة غير معروف: %', v_chart_type;
    END CASE;
    
    -- تحديث نوع الشجرة في الشركة
    UPDATE companies SET chart_type = v_chart_type WHERE id = p_company_id;
    
    -- 🆕 تحديد الحسابات الافتراضية تلقائياً (إعادة تعيين = نمسح القيم القديمة ثم نعيّن)
    UPDATE company_accounting_settings SET
        default_cash_account_id = NULL,
        default_bank_account_id = NULL,
        default_receivable_account_id = NULL,
        default_payable_account_id = NULL,
        default_revenue_account_id = NULL,
        default_sales_account_id = NULL,
        default_expense_account_id = NULL,
        default_purchase_account_id = NULL,
        default_cogs_account_id = NULL,
        default_inventory_account_id = NULL,
        default_tax_input_account_id = NULL,
        default_tax_output_account_id = NULL,
        updated_at = NOW()
    WHERE company_id = p_company_id;
    
    PERFORM auto_set_default_accounts(p_company_id);
    
    -- إذا كان القالب يتضمن بيانات تجريبية
    IF v_include_demo THEN
        RAISE NOTICE '📦 بدء إضافة البيانات التجريبية...';
        BEGIN
            PERFORM copy_demo_data_to_company(p_company_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ لم يتم تطبيق البيانات التجريبية: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '✅ تم تطبيق القالب % على الشركة % مع الحسابات الافتراضية', p_template_code, p_company_id;
END;
$$;

COMMENT ON FUNCTION apply_chart_template_to_company(UUID, VARCHAR) IS 'تطبيق قالب شجرة محاسبية على شركة — يحذف الشجرة القديمة، يُنشئ الجديدة، ويُعيّن الحسابات الافتراضية تلقائياً';


-- ═══════════════════════════════════════════════════════════════
-- 4. تحديث register_new_subscriber
--    لاستدعاء auto_set_default_accounts بعد كل الإعدادات
-- ═══════════════════════════════════════════════════════════════

-- حذف جميع النسخ القديمة
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS register_new_subscriber(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION register_new_subscriber(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255),
    p_company_name VARCHAR(255) DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_business_type VARCHAR(50) DEFAULT 'general',
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_country_code VARCHAR(3) DEFAULT 'SA',
    p_plan_code VARCHAR(50) DEFAULT 'starter',
    p_chart_template VARCHAR(50) DEFAULT 'fabric_extended',
    p_local_currency VARCHAR(3) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_code VARCHAR(50);
    v_tenant_id UUID;
    v_company_id UUID;
    v_plan_id UUID;
    v_subscription_id UUID;
    v_trial_days INT;
    v_included_modules text[];
    v_result JSONB;
    v_currencies TEXT[];
BEGIN
    -- إنشاء رمز فريد للـ Tenant
    v_tenant_code := 'T-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 10));
    
    -- 💰 تحضير قائمة العملات
    v_currencies := ARRAY[p_currency];
    IF p_local_currency IS NOT NULL AND p_local_currency != p_currency THEN
        v_currencies := array_append(v_currencies, p_local_currency);
    END IF;
    
    -- الحصول على الباقة
    SELECT id, trial_days, included_modules 
    INTO v_plan_id, v_trial_days, v_included_modules
    FROM subscription_plans
    WHERE code = p_plan_code AND is_active = true
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        SELECT id, trial_days, included_modules 
        INTO v_plan_id, v_trial_days, v_included_modules
        FROM subscription_plans
        WHERE code = 'starter' AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'لا توجد باقات نشطة';
    END IF;
    
    -- إنشاء Tenant
    v_tenant_id := create_new_tenant(
        v_tenant_code,
        COALESCE(p_company_name, p_user_name),
        p_user_email,
        p_phone,
        p_country_code,
        'ar',
        p_business_type
    );
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'فشل إنشاء Tenant';
    END IF;
    
    -- إنشاء Subscription
    INSERT INTO subscriptions (
        tenant_id, product_id, plan_id, status,
        trial_ends_at, current_period_start, current_period_end
    )
    SELECT
        v_tenant_id, sp.product_id, v_plan_id, 'trial',
        NOW() + (v_trial_days || ' days')::INTERVAL, NOW(),
        NOW() + (v_trial_days || ' days')::INTERVAL
    FROM subscription_plans sp
    WHERE sp.id = v_plan_id
    RETURNING id INTO v_subscription_id;
    
    -- إنشاء الشركة الافتراضية
    -- ⚠️ الـ trigger on_company_created سيُنشئ:
    --    1. الشجرة البسيطة تلقائياً
    --    2. company_accounting_settings
    --    3. الحسابات الافتراضية (للشجرة البسيطة)
    v_company_id := create_default_company_for_tenant(
        v_tenant_id,
        COALESCE(p_company_name, p_user_name),
        p_business_type,
        'production',
        p_currency,
        p_country_code
    );
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'فشل إنشاء الشركة';
    END IF;
    
    -- 💰 تحديث company_accounting_settings مع العملات المختارة
    UPDATE company_accounting_settings SET
        base_currency = p_currency,
        supported_currencies = v_currencies,
        updated_at = NOW()
    WHERE company_id = v_company_id;
    
    -- ✅ إضافة بيانات المستخدم في user_profiles
    INSERT INTO user_profiles (id, email, full_name, tenant_id, company_id, role)
    VALUES (
        p_user_id,
        p_user_email,
        p_user_name,
        v_tenant_id,
        v_company_id,
        'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        role = EXCLUDED.role;
    
    -- 🔐 تحديث user_metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'full_name', p_user_name,
        'registration_complete', true
    )
    WHERE id = p_user_id;
    
    -- ✅ تفعيل الموديولات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
        INSERT INTO tenant_modules (tenant_id, module_code, is_active)
        SELECT v_tenant_id, sm.code, true
        FROM system_modules sm
        WHERE sm.code = ANY(v_included_modules)
        AND sm.is_active = true
        ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_active = true;
    END IF;
    
    -- ✅ تطبيق قالب الشجرة المحاسبية (يحذف البسيطة ويطبق المطلوبة + الحسابات الافتراضية)
    IF p_chart_template IS NOT NULL AND p_chart_template != 'simple' THEN
        BEGIN
            PERFORM apply_chart_template_to_company(v_company_id, p_chart_template);
            RAISE NOTICE '✅ تم تطبيق قالب الشجرة: % مع الحسابات الافتراضية', p_chart_template;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ تحذير: لم يتم تطبيق قالب الشجرة: %', SQLERRM;
            -- الشجرة البسيطة تبقى مع حساباتها الافتراضية
        END;
    END IF;
    
    -- إرجاع النتيجة
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', v_tenant_code,
        'company_id', v_company_id,
        'subscription_id', v_subscription_id,
        'plan_code', p_plan_code,
        'trial_days', v_trial_days,
        'trial_ends_at', NOW() + (v_trial_days || ' days')::INTERVAL,
        'currencies', v_currencies,
        'chart_template', p_chart_template,
        'message', 'تم التسجيل بنجاح — الحسابات الافتراضية جاهزة'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في التسجيل: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_new_subscriber TO authenticated, anon;


-- ═══════════════════════════════════════════════════════════════
-- 5. تنفيذ على جميع الشركات الموجودة
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_rec RECORD;
    v_total INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '🚀 بدء تحديد الحسابات الافتراضية لجميع الشركات الموجودة...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    FOR v_rec IN 
        SELECT c.id as company_id, c.name_ar, c.chart_type
        FROM companies c
        WHERE c.chart_type IS NOT NULL
    LOOP
        BEGIN
            RAISE NOTICE '';
            RAISE NOTICE '🏢 الشركة: % (نوع الشجرة: %)', v_rec.name_ar, v_rec.chart_type;
            PERFORM auto_set_default_accounts(v_rec.company_id);
            v_total := v_total + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ❌ خطأ في الشركة %: %', v_rec.company_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم معالجة % شركة', v_total;
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 6. استعلام التحقق
-- ═══════════════════════════════════════════════════════════════

SELECT 
    c.name_ar AS "الشركة",
    c.chart_type AS "نوع الشجرة",
    CASE WHEN cas.default_cash_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "الصندوق",
    CASE WHEN cas.default_bank_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "البنك",
    CASE WHEN cas.default_receivable_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "ذمم مدينة",
    CASE WHEN cas.default_payable_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "ذمم دائنة",
    CASE WHEN cas.default_revenue_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "الإيرادات",
    CASE WHEN cas.default_expense_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "المصروفات",
    CASE WHEN cas.default_purchase_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "المشتريات",
    CASE WHEN cas.default_tax_input_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "الضريبة",
    CASE WHEN cas.default_inventory_account_id IS NOT NULL THEN '✅' ELSE '❌' END AS "المخزون"
FROM companies c
LEFT JOIN company_accounting_settings cas ON cas.company_id = c.id
ORDER BY c.name_ar;

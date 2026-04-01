-- ═══════════════════════════════════════════════════════════════════
-- 🧹 تنظيف شامل للمنصة — 2026-04-01
-- ═══════════════════════════════════════════════════════════════════
-- الهدف: حذف كل البيانات التجريبية والإبقاء على:
--   ✅ شركة Next Revolution (1313232a-6ad3-4002-891c-a9a9e8849a93)
--   ✅ مستأجر TexaCore Admin (681aa0e4-7692-4337-a3e8-2c127f80e573)
--   ✅ مستخدم feras1960@gmail.com (85adc738-b893-4c84-8b80-156679b978c1)
--   ✅ تغيير العملة من UAH إلى USD
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════
-- الجزء 1: حذف الشركات الأربعة الفارغة
-- ══════════════════════════════════════════
DO $$
DECLARE
    v_del_companies uuid[] := ARRAY[
        'd0c5f9c3-8b0e-4263-b466-31df35ecccce'::uuid,  -- تكستايل برو
        '66656448-c582-4b85-bd54-0807c970fc98'::uuid,  -- Global Tech Co
        '8f74b118-41c3-4d19-b6ad-440905a42f85'::uuid,  -- تكستايل انترناشيو
        '2f5eee6a-f6a1-432d-9fd6-c06d0fd72d34'::uuid   -- Test Fabrics
    ];
    v_del_tenants uuid[] := ARRAY[
        'cd8ea297-d6dc-4fc2-b89b-28b0424de504'::uuid,  -- تكستايل انترناشيو
        '95afbf67-1986-4d58-9d27-b5e31831efab'::uuid   -- Test Fabrics
    ];
    v_keep_user uuid := '85adc738-b893-4c84-8b80-156679b978c1';
    v_keep_company uuid := '1313232a-6ad3-4002-891c-a9a9e8849a93';
    v_count int;
    v_tbl text;
BEGIN
    -- حذف بيانات الشركات الأخرى من كل الجداول
    FOR v_tbl IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'company_id' AND table_schema = 'public'
        AND table_name NOT LIKE 'v_%'  -- skip views
        AND table_name NOT LIKE '_archived%'
        AND table_name NOT LIKE '_backup%'
    LOOP
        BEGIN
            EXECUTE format(
                'DELETE FROM %I WHERE company_id = ANY($1)',
                v_tbl
            ) USING v_del_companies;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            IF v_count > 0 THEN
                RAISE NOTICE '  🗑️ % → deleted % rows', v_tbl, v_count;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ⚠️ % → skipped (%)', v_tbl, SQLERRM;
        END;
    END LOOP;

    -- حذف الشركات نفسها
    DELETE FROM companies WHERE id = ANY(v_del_companies);
    RAISE NOTICE '✅ Deleted 4 empty companies';

    -- حذف المستأجرين الآخرين
    DELETE FROM tenant_users WHERE tenant_id = ANY(v_del_tenants);
    DELETE FROM tenants WHERE id = ANY(v_del_tenants);
    RAISE NOTICE '✅ Deleted 2 extra tenants';

    -- ══════════════════════════════════════════
    -- الجزء 2: حذف المستخدمين التجريبيين
    -- ══════════════════════════════════════════
    -- حذف من الجداول المرتبطة أولاً
    DELETE FROM tenant_users WHERE user_id != v_keep_user;
    DELETE FROM user_profiles WHERE id != v_keep_user;
    DELETE FROM user_role_assignments WHERE user_id != v_keep_user;
    DELETE FROM user_module_permissions WHERE user_id != v_keep_user;
    DELETE FROM user_feature_permissions WHERE user_id != v_keep_user;
    DELETE FROM user_warehouses WHERE user_id != v_keep_user;
    DELETE FROM user_table_preferences WHERE user_id != v_keep_user;
    DELETE FROM mfa_user_settings WHERE user_id != v_keep_user;
    -- user_branch_permissions, user_fund_permissions, etc.
    BEGIN DELETE FROM user_branch_permissions WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM user_fund_permissions WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM user_warehouse_permissions WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM user_resource_access WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM active_sessions WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM login_history WHERE user_id != v_keep_user; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- حذف من auth.users (لا رجعة!)
    DELETE FROM auth.users WHERE id != v_keep_user;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % test users from auth.users', v_count;

    -- ══════════════════════════════════════════
    -- الجزء 3: مسح بيانات Next Revolution التجريبية
    -- ══════════════════════════════════════════
    RAISE NOTICE '🧹 Cleaning Next Revolution test data...';

    -- قيود محاسبية
    DELETE FROM journal_entry_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE company_id = v_keep_company);
    DELETE FROM journal_entries WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Journal entries cleared';

    -- مشتريات
    DELETE FROM purchase_transactions WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Purchase transactions cleared';

    -- كونتينرات ومصاريفها
    DELETE FROM container_expenses WHERE container_id IN (SELECT id FROM containers WHERE company_id = v_keep_company);
    DELETE FROM container_cost_allocations WHERE container_id IN (SELECT id FROM containers WHERE company_id = v_keep_company);
    BEGIN DELETE FROM container_quotations WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM container_reservations WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM containers WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Containers cleared';

    -- مواد ومنتجات
    BEGIN DELETE FROM fabric_rolls WHERE material_id IN (SELECT id FROM materials WHERE company_id = v_keep_company); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM material_images WHERE material_id IN (SELECT id FROM materials WHERE company_id = v_keep_company); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM inventory_stock WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM inventory_movements WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM stock_ledger WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    DELETE FROM materials WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Materials cleared';

    -- موردين
    DELETE FROM suppliers WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Suppliers cleared';

    -- عملاء
    BEGIN DELETE FROM customers WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- مبيعات
    BEGIN DELETE FROM sales_transactions WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- مستودعات
    BEGIN DELETE FROM warehouses WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- سنوات مالية
    DELETE FROM fiscal_years WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Fiscal years cleared';

    -- محاسبة إضافية
    BEGIN DELETE FROM accounting_periods WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM recurring_entries WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM recurring_entry_templates WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- تبادل عملات
    BEGIN DELETE FROM exchange_transactions WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM exchange_rates WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM exchange_settings WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- AI
    BEGIN DELETE FROM ai_daily_reports WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM ai_audit_log WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM ai_tasks WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    -- تليجرام
    BEGIN DELETE FROM telegram_connections WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM telegram_settings WHERE company_id = v_keep_company; EXCEPTION WHEN OTHERS THEN NULL; END;

    RAISE NOTICE '  ✅ All ancillary data cleared';

    -- ══════════════════════════════════════════
    -- الجزء 4: إعادة بناء شجرة الحسابات بالـ USD
    -- ══════════════════════════════════════════
    -- حذف الشجرة الحالية وإعدادات المحاسبة
    DELETE FROM company_accounting_settings WHERE company_id = v_keep_company;
    DELETE FROM chart_of_accounts WHERE company_id = v_keep_company;
    RAISE NOTICE '  ✅ Old chart of accounts deleted';

    -- تغيير العملة
    UPDATE companies SET default_currency = 'USD' WHERE id = v_keep_company;
    RAISE NOTICE '  ✅ Currency changed to USD';

    -- إعادة إنشاء الشجرة الموسعة بالدولار
    PERFORM create_extended_chart(v_keep_company);
    RAISE NOTICE '  ✅ New extended chart created (USD)';

    -- إنشاء إعدادات المحاسبة الافتراضية
    INSERT INTO company_accounting_settings (company_id) VALUES (v_keep_company) ON CONFLICT DO NOTHING;

    -- ربط الحسابات الافتراضية تلقائياً
    UPDATE company_accounting_settings cas SET
        default_inventory_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1141' AND company_id = v_keep_company LIMIT 1),
        default_transit_purchase_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1145' AND company_id = v_keep_company LIMIT 1),
        default_payable_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '211' AND company_id = v_keep_company LIMIT 1),
        default_purchase_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '511' AND company_id = v_keep_company LIMIT 1),
        default_receivable_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1131' AND company_id = v_keep_company LIMIT 1),
        default_revenue_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '411' AND company_id = v_keep_company LIMIT 1),
        default_cash_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '111' AND company_id = v_keep_company LIMIT 1),
        default_bank_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '112' AND company_id = v_keep_company LIMIT 1),
        default_tax_input_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '117' AND company_id = v_keep_company LIMIT 1),
        default_tax_output_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '217' AND company_id = v_keep_company LIMIT 1),
        default_cogs_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '511' AND company_id = v_keep_company LIMIT 1)
    WHERE cas.company_id = v_keep_company;
    RAISE NOTICE '  ✅ Default accounts linked';

    -- إنشاء سنة مالية جديدة
    INSERT INTO fiscal_years (tenant_id, company_id, name, start_date, end_date, is_current, is_closed)
    VALUES (
        '681aa0e4-7692-4337-a3e8-2c127f80e573',
        v_keep_company,
        'السنة المالية 2026',
        '2026-01-01',
        '2026-12-31',
        true,
        false
    );
    RAISE NOTICE '  ✅ Fiscal year 2026 created';

    RAISE NOTICE '════════════════════════════════════';
    RAISE NOTICE '✅✅✅ التنظيف مكتمل بنجاح! ✅✅✅';
    RAISE NOTICE '════════════════════════════════════';
END $$;

COMMIT;

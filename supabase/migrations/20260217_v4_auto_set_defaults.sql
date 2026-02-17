-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  4. auto_set_default_accounts — V4 متوافقة مع الشجرات الجديدة      ║
-- ║  V4 Final — 2026-02-17                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
-- خريطة الأكواد V4:
-- ┌──────────────────────────┬──────────┬──────────┬────────────────┐
-- │ الحساب                   │ simple   │ extended │ fabric_extended│
-- ├──────────────────────────┼──────────┼──────────┼────────────────┤
-- │ 💰 الصندوق               │ 1111     │ 1111     │ 1111           │
-- │ 🏦 البنك                 │ 1121     │ 1121     │ 1121           │
-- │ 📥 ذمم مدينة             │ 1130     │ 1131     │ 1131           │
-- │ 📤 ذمم دائنة             │ 2110     │ 2111     │ 2111           │
-- │ 💵 المبيعات               │ 4100     │ 41       │ 41             │
-- │ 🛒 المشتريات              │ 5210     │ 521      │ 521            │
-- │ 🧾 COGS                   │ 5100     │ 511      │ 511            │
-- │ 📊 المصروفات              │ 5600     │ 57       │ 592            │
-- │ 🧾 ض.ق.م مدخلات          │ 1160     │ 117      │ 117            │
-- │ 🧾 ض.ق.م مخرجات          │ 2130     │ 214      │ 214            │
-- │ 📦 المخزون                │ 1141     │ 1141     │ 1141           │
-- │ 💱 FX Gains               │ 4500     │ 46       │ 47             │
-- │ 💱 FX Losses              │ 5700     │ 591      │ 595            │
-- │ 🚢 الشحن                  │ 5800     │ 5810     │ 541            │
-- │ 📊 أرباح محتجزة           │ 3300     │ 32       │ 32             │
-- │ 📊 مردودات مشتريات        │ 5220     │ 522      │ 522            │
-- │ 📊 خصومات مشتريات         │ 5230     │ 523      │ 523            │
-- │ 📊 فروق مخزون             │ —        │ 592      │ 596            │
-- │ 💳 دفعات موردين           │ 1150     │ 118      │ 118            │
-- │ 💳 سلف عملاء              │ 2150     │ 215      │ 215            │
-- │ 📊 أرصدة افتتاحية         │ 3600     │ 35       │ 35             │
-- │ 📊 مصاريف فوائد           │ 5850     │ 593      │ 597            │
-- └──────────────────────────┴──────────┴──────────┴────────────────┘

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
    SELECT chart_type INTO v_chart_type FROM companies WHERE id = p_company_id;
    IF v_chart_type IS NULL THEN
        RAISE NOTICE '⚠️ الشركة % ليس لها نوع شجرة محدد', p_company_id;
        RETURN;
    END IF;

    SELECT id INTO v_settings_id FROM company_accounting_settings WHERE company_id = p_company_id;
    IF v_settings_id IS NULL THEN
        INSERT INTO company_accounting_settings (company_id, base_currency, fiscal_year_start_month, fiscal_year_end_month, enable_vat, decimal_places)
        VALUES (p_company_id, 'USD', 1, 12, true, 2)
        RETURNING id INTO v_settings_id;
    END IF;

    RAISE NOTICE '🔧 V4 تحديد الحسابات الافتراضية — الشركة % (نوع: %)', p_company_id, v_chart_type;

    -- 1️⃣ الصندوق — all charts use 1111
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND account_code = '1111' AND is_detail = true AND is_active = true LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_cash_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 2️⃣ البنك — all charts use 1121
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND account_code = '1121' AND is_detail = true AND is_active = true LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_bank_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 3️⃣ الذمم المدينة
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '1130'
          ELSE '1131' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_receivable_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 4️⃣ الذمم الدائنة
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '2110'
          ELSE '2111' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_payable_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 5️⃣ المبيعات / الإيرادات
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '4100'
          ELSE '41' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_revenue_account_id = v_account_id, default_sales_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 6️⃣ المشتريات
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5210'
          ELSE '521' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_purchase_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 7️⃣ تكلفة المبيعات (COGS)
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5100'
          ELSE '511' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_cogs_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 8️⃣ المصروفات الإدارية
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5600'
          WHEN 'extended' THEN '57'
          WHEN 'fabric_extended' THEN '592'
          ELSE '5600' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_expense_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 9️⃣ ض.ق.م مدخلات
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '1160'
          ELSE '117' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_tax_input_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 🔟 ض.ق.م مخرجات
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '2130'
          ELSE '214' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_tax_output_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣1️⃣ المخزون — all charts use 1141
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND account_code = '1141' AND is_detail = true AND is_active = true LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_inventory_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣2️⃣ أرباح فروقات العملة
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '4500'
          WHEN 'extended' THEN '46'
          WHEN 'fabric_extended' THEN '47'
          ELSE '4500' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_fx_gain_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣3️⃣ خسائر فروقات العملة
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5700'
          WHEN 'extended' THEN '591'
          WHEN 'fabric_extended' THEN '595'
          ELSE '5700' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_fx_loss_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣4️⃣ مصاريف الشحن
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5800'
          WHEN 'extended' THEN '5810'
          WHEN 'fabric_extended' THEN '541'
          ELSE '5800' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_freight_in_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣5️⃣ الأرباح المحتجزة
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '3300'
          ELSE '32' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_retained_earnings_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣6️⃣ مردودات المشتريات 🆕
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5220'
          ELSE '522' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_purchase_returns_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣7️⃣ خصومات المشتريات 🆕
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '5230'
          ELSE '523' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_purchase_discount_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 1️⃣8️⃣ فروق المخزون (extended + fabric only)
    IF v_chart_type IN ('extended', 'fabric_extended') THEN
        SELECT id INTO v_account_id FROM chart_of_accounts
        WHERE company_id = p_company_id AND is_detail = true AND is_active = true
          AND account_code = CASE v_chart_type
              WHEN 'extended' THEN '592'
              WHEN 'fabric_extended' THEN '596'
              ELSE NULL END
        LIMIT 1;
        IF v_account_id IS NOT NULL THEN
            UPDATE company_accounting_settings SET default_inventory_variance_account_id = v_account_id WHERE id = v_settings_id;
            v_count := v_count + 1;
        END IF;
    END IF;

    -- 1️⃣9️⃣ دفعات مقدمة للموردين
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '1150'
          ELSE '118' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_supplier_advance_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 2️⃣0️⃣ سلف العملاء
    SELECT id INTO v_account_id FROM chart_of_accounts
    WHERE company_id = p_company_id AND is_detail = true AND is_active = true
      AND account_code = CASE v_chart_type
          WHEN 'simple' THEN '2150'
          ELSE '215' END
    LIMIT 1;
    IF v_account_id IS NOT NULL THEN
        UPDATE company_accounting_settings SET default_customer_advance_account_id = v_account_id WHERE id = v_settings_id;
        v_count := v_count + 1;
    END IF;

    -- 2️⃣1️⃣ النثرية (extended فقط)
    IF v_chart_type = 'extended' THEN
        SELECT id INTO v_account_id FROM chart_of_accounts
        WHERE company_id = p_company_id AND account_code = '1113' AND is_detail = true AND is_active = true LIMIT 1;
        IF v_account_id IS NOT NULL THEN
            UPDATE company_accounting_settings SET default_petty_cash_account_id = v_account_id WHERE id = v_settings_id;
            v_count := v_count + 1;
        END IF;
    END IF;

    -- 2️⃣2️⃣ مصاريف الإهلاك (extended + fabric)
    IF v_chart_type IN ('extended', 'fabric_extended') THEN
        SELECT id INTO v_account_id FROM chart_of_accounts
        WHERE company_id = p_company_id AND is_detail = true AND is_active = true
          AND account_code = CASE v_chart_type
              WHEN 'extended' THEN '58'
              WHEN 'fabric_extended' THEN '593'
              ELSE NULL END
        LIMIT 1;
        IF v_account_id IS NOT NULL THEN
            UPDATE company_accounting_settings SET default_depreciation_account_id = v_account_id WHERE id = v_settings_id;
            v_count := v_count + 1;
        END IF;
    END IF;

    RAISE NOTICE '✅ V4 تم تحديد %/22 حساب افتراضي للشركة %', v_count, p_company_id;
END;
$$;

COMMENT ON FUNCTION auto_set_default_accounts(UUID) IS 'V4 — تحديد الحسابات الافتراضية (22 حساب) متوافقة مع شجرات V4';

-- ═══════════════════════════════════════════════════════════════
-- تنفيذ على كل الشركات الموجودة
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE v_rec RECORD; v_total INT := 0;
BEGIN
    RAISE NOTICE '🚀 V4 بدء تحديد الحسابات الافتراضية...';
    FOR v_rec IN SELECT id, name_ar, chart_type FROM companies WHERE chart_type IS NOT NULL
    LOOP
        BEGIN
            PERFORM auto_set_default_accounts(v_rec.id);
            v_total := v_total + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ خطأ في الشركة %: %', v_rec.name_ar, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE '✅ تم معالجة % شركة', v_total;
END;
$$;

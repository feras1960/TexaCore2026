-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: شركات الخدمات (شحن، جمارك، نقل، تأمين)
-- Seed: Service Vendors (Shipping, Customs, Transport, Insurance)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_tenant_id UUID;
    v_company_id UUID;
    v_supp_group_service_id UUID;
    v_payable_account_id UUID;
    -- شركات الخدمات IDs
    v_shipping_company_id UUID;
    v_customs_agent_id UUID;
    v_transport_company_id UUID;
    v_insurance_company_id UUID;
BEGIN
    -- Get tenant and company
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_company_id FROM companies WHERE tenant_id = v_tenant_id LIMIT 1;
    
    IF v_tenant_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد tenant أو company. قم بتشغيل 00_demo_data_complete.sql أولاً';
    END IF;
    
    -- Get payable account
    SELECT id INTO v_payable_account_id 
    FROM chart_of_accounts 
    WHERE tenant_id = v_tenant_id 
    AND company_id = v_company_id 
    AND account_code = '2101'
    LIMIT 1;
    
    IF v_payable_account_id IS NULL THEN
        -- Try to find any liability account
        SELECT id INTO v_payable_account_id 
        FROM chart_of_accounts 
        WHERE tenant_id = v_tenant_id 
        AND company_id = v_company_id 
        AND (account_code LIKE '21%' OR name_ar LIKE '%ذمم%موردين%')
        LIMIT 1;
    END IF;
    
    RAISE NOTICE 'Using tenant_id: %, company_id: %', v_tenant_id, v_company_id;

    -- ═══════════════════════════════════════════════════════════════
    -- 1. إنشاء مجموعة موردي الخدمات
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO supplier_groups (id, tenant_id, code, name_ar, name_en, payment_terms_days)
    VALUES (gen_random_uuid(), v_tenant_id, 'SERVICE', 'شركات الخدمات', 'Service Companies', 30)
    ON CONFLICT (tenant_id, code) DO NOTHING
    RETURNING id INTO v_supp_group_service_id;
    
    IF v_supp_group_service_id IS NULL THEN
        SELECT id INTO v_supp_group_service_id 
        FROM supplier_groups 
        WHERE tenant_id = v_tenant_id AND code = 'SERVICE';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 2. شركة الشحن البحري - ساشا للشحن
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (
        id, tenant_id, company_id, code, supplier_type, vendor_category,
        name_ar, name_en, company_name, 
        email, phone, mobile, 
        country, city, address,
        group_id, currency, payment_terms_days, 
        payable_account_id, bank_name, bank_account, status
    )
    VALUES (
        gen_random_uuid(), v_tenant_id, v_company_id, 
        'SVC-SHIP-001', 'company', 'shipping_company',
        'ساشا للشحن البحري', 'Sasha Maritime Shipping', 'Sasha Shipping LLC',
        'info@sasha-shipping.ua', '+380441111100', '+380501111100',
        'Ukraine', 'Odesa', 'Port of Odesa, Terminal 5, Odesa, Ukraine',
        v_supp_group_service_id, 'USD', 30,
        v_payable_account_id, 'PrivatBank', 'UA99999999999999999999999999', 'active'
    )
    ON CONFLICT (tenant_id, code) DO UPDATE SET vendor_category = 'shipping_company'
    RETURNING id INTO v_shipping_company_id;
    
    IF v_shipping_company_id IS NULL THEN
        SELECT id INTO v_shipping_company_id 
        FROM suppliers 
        WHERE tenant_id = v_tenant_id AND code = 'SVC-SHIP-001';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 3. شركة التخليص الجمركي
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (
        id, tenant_id, company_id, code, supplier_type, vendor_category,
        name_ar, name_en, company_name, 
        email, phone, mobile, 
        country, city, address,
        group_id, currency, payment_terms_days, 
        payable_account_id, bank_name, bank_account, status
    )
    VALUES (
        gen_random_uuid(), v_tenant_id, v_company_id, 
        'SVC-CUST-001', 'company', 'customs_agent',
        'شركة التخليص الجمركي الموحدة', 'United Customs Clearance', 'UCC Services Ltd',
        'customs@ucc.ua', '+380442222200', '+380502222200',
        'Ukraine', 'Odesa', 'Customs Zone, Building 3, Odesa, Ukraine',
        v_supp_group_service_id, 'UAH', 15,
        v_payable_account_id, 'Monobank', 'UA88888888888888888888888888', 'active'
    )
    ON CONFLICT (tenant_id, code) DO UPDATE SET vendor_category = 'customs_agent'
    RETURNING id INTO v_customs_agent_id;
    
    IF v_customs_agent_id IS NULL THEN
        SELECT id INTO v_customs_agent_id 
        FROM suppliers 
        WHERE tenant_id = v_tenant_id AND code = 'SVC-CUST-001';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 4. شركة النقل الداخلي
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (
        id, tenant_id, company_id, code, supplier_type, vendor_category,
        name_ar, name_en, company_name, 
        email, phone, mobile, 
        country, city, address,
        group_id, currency, payment_terms_days, 
        payable_account_id, bank_name, bank_account, status
    )
    VALUES (
        gen_random_uuid(), v_tenant_id, v_company_id, 
        'SVC-TRANS-001', 'company', 'transport_company',
        'شركة النقل السريع', 'Fast Transport Co.', 'Fast Transport LLC',
        'dispatch@fasttransport.ua', '+380443333300', '+380503333300',
        'Ukraine', 'Kyiv', '45 Industrial Road, Kyiv, Ukraine',
        v_supp_group_service_id, 'UAH', 7,
        v_payable_account_id, 'PrivatBank', 'UA77777777777777777777777777', 'active'
    )
    ON CONFLICT (tenant_id, code) DO UPDATE SET vendor_category = 'transport_company'
    RETURNING id INTO v_transport_company_id;
    
    IF v_transport_company_id IS NULL THEN
        SELECT id INTO v_transport_company_id 
        FROM suppliers 
        WHERE tenant_id = v_tenant_id AND code = 'SVC-TRANS-001';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- 5. شركة التأمين
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO suppliers (
        id, tenant_id, company_id, code, supplier_type, vendor_category,
        name_ar, name_en, company_name, 
        email, phone, mobile, 
        country, city, address,
        group_id, currency, payment_terms_days, 
        payable_account_id, bank_name, bank_account, status
    )
    VALUES (
        gen_random_uuid(), v_tenant_id, v_company_id, 
        'SVC-INS-001', 'company', 'insurance_company',
        'شركة التأمين الدولية للشحن', 'International Cargo Insurance', 'ICI Insurance SA',
        'cargo@ici-insurance.com', '+380444444400', '+380504444400',
        'Switzerland', 'Zurich', '100 Insurance Plaza, Zurich, Switzerland',
        v_supp_group_service_id, 'USD', 30,
        v_payable_account_id, 'UBS', 'CH66666666666666666666', 'active'
    )
    ON CONFLICT (tenant_id, code) DO UPDATE SET vendor_category = 'insurance_company'
    RETURNING id INTO v_insurance_company_id;
    
    IF v_insurance_company_id IS NULL THEN
        SELECT id INTO v_insurance_company_id 
        FROM suppliers 
        WHERE tenant_id = v_tenant_id AND code = 'SVC-INS-001';
    END IF;

    -- ═══════════════════════════════════════════════════════════════
    -- إنهاء
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '✅ Service vendors created successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - Shipping Company: % (ساشا للشحن البحري)', v_shipping_company_id;
    RAISE NOTICE '   - Customs Agent: % (شركة التخليص الجمركي)', v_customs_agent_id;
    RAISE NOTICE '   - Transport Company: % (شركة النقل السريع)', v_transport_company_id;
    RAISE NOTICE '   - Insurance Company: % (شركة التأمين الدولية)', v_insurance_company_id;
    
END $$;

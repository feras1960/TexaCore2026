-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 43: إنشاء Demo Tenant + الشركات التجريبية
-- STEP 43: Create Demo Tenant + Demo Companies
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يحتوي على:
-- 1. إنشاء Demo Tenant (demo-tenant)
-- 2. إنشاء Fabric Demo Company (شركة أقمشة تجريبية)
-- 3. تطبيق الشجرة المحاسبية + البيانات التجريبية
-- 4. تفعيل جميع الموديولات
-- 5. RLS Policies للسماح بالقراءة للجميع
-- 
-- 🎯 الهدف: 
-- جميع المستخدمين يمكنهم الوصول للشركات التجريبية (قراءة فقط)
-- Platform Owner فقط يمكنه التعديل
-- 
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_demo_tenant_id UUID;
    v_fabric_demo_id UUID;
    v_module_count INT;
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '🎓 بدء إنشاء Demo Tenant والشركات التجريبية';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 1: إنشاء Demo Tenant
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود Demo Tenant مسبقاً
    SELECT id INTO v_demo_tenant_id
    FROM tenants
    WHERE code = 'demo-tenant';
    
    IF v_demo_tenant_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Demo Tenant موجود مسبقاً (ID: %)', v_demo_tenant_id;
        RAISE NOTICE '💡 سيتم تحديث البيانات...';
        
        UPDATE tenants
        SET 
            name = 'Demo Tenant - البيانات التجريبية',
            email = 'demo@nexrev.local',
            status = 'active',
            updated_at = NOW()
        WHERE id = v_demo_tenant_id;
    ELSE
        -- إنشاء Demo Tenant جديد
        v_demo_tenant_id := create_new_tenant(
            'demo-tenant',
            'Demo Tenant - البيانات التجريبية',
            'demo@nexrev.local',
            NULL
        );
        
        RAISE NOTICE '✅ تم إنشاء Demo Tenant: % (ID: %)', 'demo-tenant', v_demo_tenant_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 2: إنشاء Fabric Demo Company
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من وجود Fabric Demo Company مسبقاً
    SELECT id INTO v_fabric_demo_id
    FROM companies
    WHERE tenant_id = v_demo_tenant_id
      AND code = 'DEMO-FABRIC-001';
    
    IF v_fabric_demo_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Fabric Demo Company موجودة مسبقاً (ID: %)', v_fabric_demo_id;
    ELSE
        -- إنشاء Fabric Demo Company جديدة
        INSERT INTO companies (
            tenant_id,
            code,
            name,
            name_ar,
            name_en,
            default_currency,
            country_code,
            business_type,
            company_type,
            fiscal_year_start_month,
            tax_system,
            vat_rate,
            inventory_valuation_method,
            address,
            city,
            phone,
            email
        )
        VALUES (
            v_demo_tenant_id,
            'DEMO-FABRIC-001',
            'شركة تجارة الأقمشة التجريبية',
            'شركة تجارة الأقمشة التجريبية',
            'Fabric Trading Demo Company',
            'SAR',
            'SA',
            'fabric',
            'demo',
            1,
            'vat_sa',
            15.00,
            'weighted_average',
            'شارع الملك فهد - جدة',
            'جدة',
            '+966-12-1234567',
            'demo-fabric@nexrev.local'
        )
        RETURNING id INTO v_fabric_demo_id;
        
        RAISE NOTICE '✅ تم إنشاء Fabric Demo Company: DEMO-FABRIC-001 (ID: %)', v_fabric_demo_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 3: تفعيل جميع الموديولات للـ Demo Tenant
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
        BEGIN
            INSERT INTO tenant_modules (tenant_id, module_code, is_active)
            SELECT v_demo_tenant_id, module_code, true
            FROM modules
            WHERE is_active = true
            ON CONFLICT (tenant_id, module_code) DO UPDATE 
            SET is_active = true;
            
            -- عد الموديولات المفعلة
            SELECT COUNT(*) INTO v_module_count
            FROM tenant_modules
            WHERE tenant_id = v_demo_tenant_id AND is_active = true;
            
            RAISE NOTICE '✅ تم تفعيل % موديول للـ Demo Tenant', v_module_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '⚠️ فشل تفعيل الموديولات: %', SQLERRM;
        END;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 4: تطبيق الشجرة المحاسبية + البيانات التجريبية
    -- ═══════════════════════════════════════════════════════════════
    
    -- التحقق من عدم وجود شجرة مسبقاً
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE company_id = v_fabric_demo_id LIMIT 1) THEN
        -- التحقق من وجود دالة apply_chart_template_to_company
        IF EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'apply_chart_template_to_company'
        ) THEN
            BEGIN
                -- محاولة تطبيق القالب مع البيانات التجريبية
                PERFORM apply_chart_template_to_company(
                    v_fabric_demo_id, 
                    'fabric_extended_demo'
                );
                RAISE NOTICE '✅ تم تطبيق الشجرة المحاسبية + البيانات التجريبية';
            EXCEPTION WHEN OTHERS THEN
                -- إذا فشل fabric_extended_demo، جرب fabric_extended العادية
                BEGIN
                    PERFORM apply_chart_template_to_company(
                        v_fabric_demo_id, 
                        'fabric_extended'
                    );
                    RAISE NOTICE '✅ تم تطبيق الشجرة المحاسبية (بدون بيانات تجريبية)';
                    RAISE NOTICE '💡 يمكنك إضافة البيانات التجريبية يدوياً لاحقاً';
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING '⚠️ فشل تطبيق الشجرة المحاسبية: %', SQLERRM;
                    RAISE NOTICE '💡 يمكنك تطبيقها يدوياً من الواجهة';
                END;
            END;
        ELSE
            RAISE WARNING '⚠️ دالة apply_chart_template_to_company غير موجودة';
            RAISE NOTICE '💡 تأكد من تنفيذ STEP_31 (نظام القوالب) أولاً';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ الشجرة المحاسبية موجودة مسبقاً - لن يتم استبدالها';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- الخطوة 5: إحصائيات Demo Tenant
    -- ═══════════════════════════════════════════════════════════════
    
    DECLARE
        v_accounts_count INT;
        v_customers_count INT;
        v_suppliers_count INT;
    BEGIN
        -- عد الحسابات
        SELECT COUNT(*) INTO v_accounts_count
        FROM chart_of_accounts
        WHERE company_id = v_fabric_demo_id;
        
        -- عد العملاء
        SELECT COUNT(*) INTO v_customers_count
        FROM customers
        WHERE tenant_id = v_demo_tenant_id;
        
        -- عد الموردين
        SELECT COUNT(*) INTO v_suppliers_count
        FROM suppliers
        WHERE tenant_id = v_demo_tenant_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '📊 إحصائيات Fabric Demo Company:';
        RAISE NOTICE '   • الحسابات المحاسبية: %', v_accounts_count;
        RAISE NOTICE '   • العملاء: %', v_customers_count;
        RAISE NOTICE '   • الموردين: %', v_suppliers_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ بعض الجداول غير موجودة - هذا طبيعي في المراحل المبكرة';
    END;
    
    -- ═══════════════════════════════════════════════════════════════
    -- النتيجة النهائية
    -- ═══════════════════════════════════════════════════════════════
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل إنشاء Demo Tenant والشركات التجريبية بنجاح!';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 النتائج:';
    RAISE NOTICE '   • Demo Tenant ID: %', v_demo_tenant_id;
    RAISE NOTICE '   • Demo Tenant Code: demo-tenant';
    RAISE NOTICE '   • Fabric Demo Company ID: %', v_fabric_demo_id;
    RAISE NOTICE '   • Company Code: DEMO-FABRIC-001';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الخطوة التالية: STEP_44 (RLS Policies للـ Demo)';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
END $$;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظة هامة: RLS Policies
-- ═══════════════════════════════════════════════════════════════

-- سيتم إنشاء RLS Policies في STEP_44 للسماح بـ:
-- 1. القراءة للجميع (authenticated users)
-- 2. الكتابة/التعديل/الحذف: Platform Owner فقط

-- ═══════════════════════════════════════════════════════════════
-- ✅ اكتمل STEP 43
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: دالة حذف Tenant شاملة محدّثة - مع التعامل مع الجداول غير الموجودة
-- تاريخ: 2026-02-03
-- الإصلاح: تجاهل الجداول غير الموجودة باستخدام EXCEPTION handling
-- ═══════════════════════════════════════════════════════════════════════════

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS delete_tenant_complete(UUID);

-- إنشاء دالة RPC لحذف الـ Tenant بشكل آمن وشامل
CREATE OR REPLACE FUNCTION delete_tenant_complete(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_name TEXT;
    v_company_ids UUID[];
    v_user_tenant_id UUID;
BEGIN
    -- 🛡️ التحقق من صلاحية Super Admin
    IF NOT is_super_admin(auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرح: Super Admin فقط');
    END IF;

    -- 🛡️ منع حذف الـ Tenant الخاص بالمستخدم الحالي
    SELECT tenant_id INTO v_user_tenant_id 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    IF v_user_tenant_id = p_tenant_id THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', '⛔ لا يمكنك حذف حسابك الخاص! هذا الإجراء ممنوع لحمايتك.',
            'protection', 'self_delete_blocked'
        );
    END IF;

    -- الحصول على اسم الـ Tenant
    SELECT name INTO v_tenant_name FROM tenants WHERE id = p_tenant_id;
    
    IF v_tenant_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الـ Tenant غير موجود');
    END IF;

    -- الحصول على قائمة الشركات التابعة
    SELECT ARRAY_AGG(id) INTO v_company_ids FROM companies WHERE tenant_id = p_tenant_id;

    RAISE NOTICE '🗑️ بدء حذف المشترك: % (ID: %)', v_tenant_name, p_tenant_id;

    -- ═══════════════════════════════════════════════════════════════════════
    -- حذف البيانات من الجداول الموجودة فقط (تجاهل غير الموجودة)
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- القيود المحاسبية
    BEGIN DELETE FROM journal_entry_lines WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM journal_entries WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM recurring_entry_history WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM recurring_entries WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM recurring_entry_templates WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM chart_of_accounts WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- المخزون والمستودعات
    BEGIN DELETE FROM stock_movements WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM roll_transactions WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM roll_reservations WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM rolls WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM materials WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM material_categories WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM warehouse_locations WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM warehouses WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- المبيعات والمشتريات
    BEGIN DELETE FROM invoice_items WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM invoices WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM purchase_order_items WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM purchase_orders WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM sale_order_items WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM sale_orders WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM quotation_items WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM quotations WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM customers WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM suppliers WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- الفروع
    BEGIN DELETE FROM branches WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- البيانات الإدارية
    BEGIN DELETE FROM in_app_notifications WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM notifications WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM report_shares WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM report_templates WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM saved_reports WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM reviews WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM saas_events WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM support_tickets WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tenant_referrals WHERE referrer_tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tenant_referrals WHERE referee_tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM usage_analytics WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM webhook_endpoints WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- المستخدمين
    BEGIN UPDATE user_profiles SET tenant_id = NULL, company_id = NULL WHERE tenant_id = p_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- صلاحيات المستخدمين
    IF v_company_ids IS NOT NULL THEN
        BEGIN DELETE FROM user_role_assignments WHERE company_id = ANY(v_company_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════
    -- حذف الـ Tenant (باقي الجداول CASCADE تلقائياً)
    -- ═══════════════════════════════════════════════════════════════════════
    DELETE FROM tenants WHERE id = p_tenant_id;

    RAISE NOTICE '✅ تم حذف المشترك: % بنجاح', v_tenant_name;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('تم حذف المشترك "%s" وجميع بياناته بنجاح', v_tenant_name),
        'tenant_id', p_tenant_id
    );

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ خطأ في حذف المشترك: % - %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- منح الصلاحية للمستخدمين المسجلين
GRANT EXECUTE ON FUNCTION delete_tenant_complete(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- التحقق من إنشاء الدالة
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    proname as function_name,
    '✅ تم الإنشاء بنجاح - مع التعامل مع الجداول غير الموجودة' as status
FROM pg_proc 
WHERE proname = 'delete_tenant_complete';

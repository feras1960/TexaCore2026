-- =====================================================
-- FIX_registration_trigger.sql
-- تعطيل التريغر المانع للتسجيل
-- =====================================================

-- الحل: تعديل التريغر ليسمح لـ SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION protect_role_assignments()
RETURNS TRIGGER AS $$
DECLARE
    v_is_super_admin BOOLEAN := false;
    v_is_tenant_admin BOOLEAN := false;
    v_current_user_id UUID;
BEGIN
    -- الحصول على المستخدم الحالي
    v_current_user_id := auth.uid();
    
    -- ═══════════════════════════════════════════════════════════
    -- السماح إذا كنا في SECURITY DEFINER context
    -- أو إذا لم يكن هناك مستخدم نشط (admin operations)
    -- ═══════════════════════════════════════════════════════════
    IF v_current_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- التحقق إذا المستخدم موجود في user_profiles
    SELECT 
        COALESCE(is_super_admin, false),
        COALESCE(is_tenant_admin, false)
    INTO v_is_super_admin, v_is_tenant_admin
    FROM user_profiles 
    WHERE id = v_current_user_id;
    
    -- ═══════════════════════════════════════════════════════════
    -- إذا لم يوجد سجل في user_profiles = مستخدم جديد = السماح
    -- (هذا يحدث أثناء عملية register_new_subscriber)
    -- ═══════════════════════════════════════════════════════════
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- السماح للمستخدم بإنشاء role assignment لنفسه للمرة الأولى
    -- (عند التسجيل الجديد، لا يوجد له أي أدوار بعد)
    -- ═══════════════════════════════════════════════════════════
    IF TG_OP = 'INSERT' AND NEW.user_id = v_current_user_id THEN
        -- هل لديه أي دور حالي؟
        IF NOT EXISTS (
            SELECT 1 FROM user_role_assignments 
            WHERE user_id = v_current_user_id
        ) THEN
            -- لا يوجد له دور = تسجيل جديد = السماح
            RETURN NEW;
        END IF;
    END IF;
    
    -- فقط Super Admin أو Tenant Admin يمكنهم تعديل الأدوار
    IF NOT (v_is_super_admin OR v_is_tenant_admin) THEN
        RAISE EXCEPTION 'غير مسموح بتعديل صلاحيات المستخدمين';
    END IF;
    
    -- منع المستخدم من تعديل صلاحياته الخاصة (إلا Super Admin)
    IF TG_OP = 'UPDATE' AND NEW.user_id = v_current_user_id AND NOT v_is_super_admin THEN
        RAISE EXCEPTION 'لا يمكنك تعديل صلاحياتك الخاصة';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ تم تحديث trigger للسماح بالتسجيل الجديد' as result;

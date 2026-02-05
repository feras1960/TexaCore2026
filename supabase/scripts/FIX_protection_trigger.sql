-- =====================================================
-- FIX_protection_trigger.sql
-- إصلاح التريغر الذي يسبب خطأ is_tenant_admin
-- =====================================================

SET session_replication_role = 'replica';

-- ═══════════════════════════════════════════════════════════════
-- 1. إضافة عمود is_tenant_admin لـ user_profiles إذا غير موجود
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'is_tenant_admin'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_tenant_admin BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ تم إضافة عمود is_tenant_admin';
    ELSE
        RAISE NOTICE '✅ عمود is_tenant_admin موجود مسبقاً';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. تحديث التريغر ليكون أكثر مرونة (لا يفشل عند عدم وجود المستخدم)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_role_assignments()
RETURNS TRIGGER AS $$
DECLARE
    v_is_super_admin BOOLEAN := false;
    v_is_tenant_admin BOOLEAN := false;
    v_current_user_id UUID;
BEGIN
    -- الحصول على المستخدم الحالي
    v_current_user_id := auth.uid();
    
    -- إذا لم يكن هناك مستخدم (مثال: SECURITY DEFINER function)، السماح
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- التحقق من صلاحيات المستخدم الحالي
    SELECT 
        COALESCE(is_super_admin, false),
        COALESCE(is_tenant_admin, false)
    INTO v_is_super_admin, v_is_tenant_admin
    FROM user_profiles 
    WHERE id = v_current_user_id;
    
    -- إذا لم يوجد سجل في user_profiles، السماح (مستخدم جديد)
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- فقط Super Admin أو Tenant Admin يمكنهم تعديل الأدوار
    IF NOT (v_is_super_admin OR v_is_tenant_admin) THEN
        RAISE EXCEPTION 'غير مسموح بتعديل صلاحيات المستخدمين';
    END IF;
    
    -- منع المستخدم من تعديل صلاحياته الخاصة (إلا Super Admin)
    IF NEW.user_id = v_current_user_id AND NOT v_is_super_admin THEN
        RAISE EXCEPTION 'لا يمكنك تعديل صلاحياتك الخاصة';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ تم تحديث trigger protect_role_assignments' as result;

-- ═══════════════════════════════════════════════════════════════
-- 3. تحديث المستخدمين الحاليين لتعيين is_tenant_admin
-- ═══════════════════════════════════════════════════════════════

-- المستخدمون الذين لديهم دور tenant_owner يصبحون tenant_admin
UPDATE user_profiles up
SET is_tenant_admin = true
WHERE up.id IN (
    SELECT ura.user_id 
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE r.code = 'tenant_owner'
)
AND (up.is_tenant_admin IS NULL OR up.is_tenant_admin = false);

SELECT '✅ تم تحديث is_tenant_admin للمستخدمين' as result;

SET session_replication_role = 'origin';

SELECT '🎉 اكتمل الإصلاح!' as result;

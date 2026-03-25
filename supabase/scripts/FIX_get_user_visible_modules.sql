-- =====================================================
-- FIX_get_user_visible_modules.sql
-- إصلاح دالة الموديولات لتستخدم user_role_assignments
-- =====================================================

-- الدالة كانت تبحث في user_roles، لكن البيانات في user_role_assignments!

CREATE OR REPLACE FUNCTION get_user_visible_modules(p_user_id UUID)
RETURNS TEXT[] 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT[];
    v_is_super BOOLEAN;
BEGIN
    -- التحقق أولاً إذا كان super_admin
    SELECT is_super_admin INTO v_is_super
    FROM user_profiles WHERE id = p_user_id;
    
    IF v_is_super = true THEN
        RETURN ARRAY['all']::TEXT[];
    END IF;

    -- جلب الموديولات من user_role_assignments (الجدول الصحيح!)
    SELECT COALESCE(
        array_agg(DISTINCT module),
        ARRAY['dashboard']::TEXT[]
    ) INTO result
    FROM (
        SELECT unnest(r.visible_modules) as module
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = p_user_id
          AND ura.is_active = true
    ) sub;
    
    RETURN COALESCE(result, ARRAY['dashboard']::TEXT[]);
END;
$$;

-- اختبار مباشر
SELECT get_user_visible_modules('68454a07-f4cb-4c58-ad28-b1ad49e8602a'::uuid) as modules;

SELECT '✅ تم إصلاح الدالة!' as result;

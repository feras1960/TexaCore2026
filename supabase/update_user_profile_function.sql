-- ═══════════════════════════════════════════════════════════════
-- Database Function لتحديث User Profile (باستخدام SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════

-- Function لتحديث user_profile مع company_id
-- SECURITY DEFINER يسمح بذلك حتى لو كانت RLS مفعلة
CREATE OR REPLACE FUNCTION public.update_user_profile_on_registration(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_full_name VARCHAR(255),
    p_role VARCHAR(50),
    p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- تحديث أو إدراج user_profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        company_id
    )
    VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_role,
        p_company_id
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        company_id = EXCLUDED.company_id,
        updated_at = NOW();
    
    -- إرجاع النتيجة
    SELECT row_to_json(t) INTO v_result
    FROM (
        SELECT 
            id,
            email,
            full_name,
            role,
            company_id,
            created_at,
            updated_at
        FROM public.user_profiles
        WHERE id = p_user_id
    ) t;
    
    RETURN v_result;
END;
$$;

-- منح صلاحية الاستخدام للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.update_user_profile_on_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_on_registration TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 14: إعداد Super User (اختياري - يمكن تعديله)
-- STEP 14: Setup Super User (Optional - Can be modified)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ ملاحظة: يمكنك تعديل بيانات Super User حسب الحاجة
-- ⚠️ Note: You can modify Super User data as needed

-- ═══════════════════════════════════════════════════════════════
-- 1. Function لإعداد Super User
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION setup_super_user(
    p_user_email VARCHAR(200),
    p_user_name VARCHAR(200) DEFAULT 'Super Admin'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
    v_result JSONB;
BEGIN
    -- البحث عن المستخدم بالبريد الإلكتروني
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود: %', p_user_email;
    END IF;
    
    -- الحصول على Super Admin Role
    SELECT id INTO v_role_id
    FROM roles
    WHERE code = 'super_admin'
    LIMIT 1;
    
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Super Admin Role غير موجود. يرجى تطبيق STEP_12 أولاً';
    END IF;
    
    -- ربط المستخدم بالـ Role
    INSERT INTO user_roles (user_id, role_id, is_active)
    VALUES (v_user_id, v_role_id, true)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET is_active = true;
    
    -- إرجاع النتيجة
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'role_id', v_role_id,
        'success', true,
        'message', 'تم تعيين Super Admin بنجاح'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 2. إعداد Super User مباشرة (اختياري)
-- ═══════════════════════════════════════════════════════════════

-- ⚠️ ملاحظة: غير بيانات Super User هنا
-- ⚠️ Note: Modify Super User data here

DO $$
DECLARE
    v_user_email VARCHAR(200) := 'admin@erp.local';  -- ← غير هنا
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- البحث عن المستخدم
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_user_email
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- الحصول على Super Admin Role
        SELECT id INTO v_role_id
        FROM roles
        WHERE code = 'super_admin'
        LIMIT 1;
        
        IF v_role_id IS NOT NULL THEN
            -- ربط المستخدم بالـ Role
            INSERT INTO user_roles (user_id, role_id, is_active)
            VALUES (v_user_id, v_role_id, true)
            ON CONFLICT (user_id, role_id) 
            DO UPDATE SET is_active = true;
            
            RAISE NOTICE '✅ تم تعيين Super Admin للمستخدم: %', v_user_email;
        ELSE
            RAISE WARNING '⚠️ Super Admin Role غير موجود. يرجى تطبيق STEP_12 أولاً';
        END IF;
    ELSE
        RAISE WARNING '⚠️ المستخدم غير موجود: %. يرجى إنشاء المستخدم أولاً', v_user_email;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Function للتحقق من Super User
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_super_user(p_user_email VARCHAR(200))
RETURNS BOOLEAN AS $$
DECLARE
    v_is_super BOOLEAN;
BEGIN
    SELECT is_super_admin(u.id) INTO v_is_super
    FROM auth.users u
    WHERE u.email = p_user_email
    LIMIT 1;
    
    RETURN COALESCE(v_is_super, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 4. Function لإزالة Super User
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION remove_super_user(p_user_email VARCHAR(200))
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- البحث عن المستخدم
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود: %', p_user_email;
    END IF;
    
    -- الحصول على Super Admin Role
    SELECT id INTO v_role_id
    FROM roles
    WHERE code = 'super_admin'
    LIMIT 1;
    
    -- إزالة Role
    UPDATE user_roles
    SET is_active = false
    WHERE user_id = v_user_id
      AND role_id = v_role_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ تم! الآن يمكنك إعداد Super User
-- ✅ Done! Super User can now be set up
--
-- 📝 ملاحظة: غير بيانات Super User في السطر 47
-- 📝 Note: Modify Super User data at line 47
--
-- 📝 أو استخدم Function:
-- 📝 Or use the function:
-- SELECT setup_super_user('your-email@example.com', 'Your Name');

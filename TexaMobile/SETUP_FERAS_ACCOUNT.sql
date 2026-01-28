-- ============================================
-- 🔧 إعداد حساب feras1960@gmail.com
-- ============================================

DO $$
DECLARE
  v_user_email TEXT := 'feras1960@gmail.com';
  v_user_id UUID;
  v_tenant_id UUID;
  v_company_id UUID;
  v_admin_role_id UUID;
BEGIN
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '🚀 بدء إعداد حساب: %', v_user_email;
  RAISE NOTICE '════════════════════════════════════════';
  
  -- 1️⃣ الحصول على User ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ المستخدم غير موجود: %', v_user_email;
  END IF;
  
  RAISE NOTICE '✅ User ID: %', v_user_id;
  
  -- 2️⃣ الحصول على Tenant (Texa Fabric)
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE code = 'texa_fabric'
  LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION '❌ Tenant غير موجود';
  END IF;
  
  RAISE NOTICE '✅ Tenant ID: %', v_tenant_id;
  
  -- 3️⃣ الحصول على Company
  SELECT id INTO v_company_id
  FROM companies
  WHERE tenant_id = v_tenant_id
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '❌ Company غير موجود';
  END IF;
  
  RAISE NOTICE '✅ Company ID: %', v_company_id;
  
  -- 4️⃣ إنشاء/تحديث User Profile
  INSERT INTO user_profiles (
    id,
    tenant_id,
    company_id,
    email,
    full_name_ar,
    full_name_en,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_tenant_id,
    v_company_id,
    v_user_email,
    'د. فراس',
    'Dr. Feras',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    company_id = EXCLUDED.company_id,
    full_name_ar = EXCLUDED.full_name_ar,
    full_name_en = EXCLUDED.full_name_en,
    updated_at = now();
  
  RAISE NOTICE '✅ تم إنشاء/تحديث Profile';
  
  -- 5️⃣ إنشاء/تحديث Admin Role
  INSERT INTO user_roles (
    id,
    tenant_id,
    role_code,
    role_name_ar,
    role_name_en,
    description_ar,
    description_en,
    permissions,
    is_system_role,
    is_active
  )
  VALUES (
    gen_random_uuid(),
    v_tenant_id,
    'admin',
    'مدير النظام',
    'System Administrator',
    'مدير النظام - صلاحيات كاملة',
    'System Administrator - Full Access',
    '{}',
    true,
    true
  )
  ON CONFLICT (role_code) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();
  
  -- 6️⃣ الحصول على Role ID
  SELECT id INTO v_admin_role_id
  FROM user_roles
  WHERE role_code = 'admin';
  
  RAISE NOTICE '✅ Admin Role ID: %', v_admin_role_id;
  
  -- 7️⃣ ربط المستخدم بالـ Admin Role
  INSERT INTO user_role_assignments (
    id,
    user_id,
    role_id,
    tenant_id,
    company_id,
    is_active,
    assigned_at
  )
  SELECT
    gen_random_uuid(),
    v_user_id,
    v_admin_role_id,
    v_tenant_id,
    v_company_id,
    true,
    now()
  WHERE NOT EXISTS (
    SELECT 1 
    FROM user_role_assignments
    WHERE user_id = v_user_id
      AND role_id = v_admin_role_id
  );
  
  RAISE NOTICE '✅ تم ربط المستخدم بدور Admin';
  
  -- 8️⃣ النتيجة النهائية
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ اكتمل الإعداد بنجاح!';
  RAISE NOTICE '📧 البريد: %', v_user_email;
  RAISE NOTICE '👤 الاسم: د. فراس';
  RAISE NOTICE '🆔 User ID: %', v_user_id;
  RAISE NOTICE '🏢 Tenant: Texa Fabric';
  RAISE NOTICE '🎭 Role: admin (مدير النظام)';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '👉 سجّل خروج ثم أعد تسجيل الدخول!';
  
END $$;

-- ═══════════════════════════════════════════
-- 🔍 التحقق من النتيجة
-- ═══════════════════════════════════════════

SELECT 
  au.email as "البريد الإلكتروني",
  up.full_name_ar as "الاسم بالعربي",
  up.full_name_en as "الاسم بالإنجليزي",
  t.name_ar as "المستأجر",
  c.name_ar as "الشركة",
  ur.role_code as "الدور",
  ur.role_name_ar as "اسم الدور",
  ura.is_active as "نشط؟"
FROM auth.users au
JOIN user_profiles up ON up.id = au.id
JOIN tenants t ON t.id = up.tenant_id
LEFT JOIN companies c ON c.id = up.company_id
LEFT JOIN user_role_assignments ura ON ura.user_id = au.id
LEFT JOIN user_roles ur ON ur.id = ura.role_id
WHERE au.email = 'feras1960@gmail.com'
ORDER BY ura.assigned_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP_51: E-Commerce Customer Registration System
-- نظام تسجيل عملاء المتجر الإلكتروني
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- هذا الملف يُنشئ:
-- 1. ربط customers مع auth.users
-- 2. ربط user_profiles مع customers
-- 3. Functions للتسجيل والإدارة
-- 4. RLS Policies للعملاء
-- 5. Helper functions
-- 
-- Created: 2026-01-25
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '👥 E-Commerce Customer Registration System';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. تعديل جدول customers - إضافة ربط مع auth.users
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- إضافة عمود auth_user_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE customers 
        ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ أضيف عمود auth_user_id إلى customers';
    ELSE
        RAISE NOTICE 'ℹ️ عمود auth_user_id موجود مسبقاً';
    END IF;
    
    -- Index للأداء
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'customers' AND indexname = 'idx_customers_auth_user'
    ) THEN
        CREATE INDEX idx_customers_auth_user ON customers(auth_user_id);
        RAISE NOTICE '✅ تم إنشاء Index: idx_customers_auth_user';
    END IF;
    
    -- Unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'customers_auth_user_unique'
    ) THEN
        ALTER TABLE customers
        ADD CONSTRAINT customers_auth_user_unique UNIQUE(auth_user_id);
        RAISE NOTICE '✅ تم إنشاء Unique constraint على auth_user_id';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. تعديل جدول user_profiles - إضافة ربط مع customers
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- إضافة عمود customer_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ أضيف عمود customer_id إلى user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️ عمود customer_id موجود مسبقاً';
    END IF;
    
    -- Index للأداء
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user_profiles' AND indexname = 'idx_user_profiles_customer'
    ) THEN
        CREATE INDEX idx_user_profiles_customer ON user_profiles(customer_id);
        RAISE NOTICE '✅ تم إنشاء Index: idx_user_profiles_customer';
    END IF;
END $$;

COMMENT ON COLUMN customers.auth_user_id IS 'ربط مع auth.users للعملاء المسجلين في المتجر الإلكتروني';
COMMENT ON COLUMN user_profiles.customer_id IS 'ربط مع customers إذا كان role=customer';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Helper Functions
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1: التحقق من أن المستخدم عميل
CREATE OR REPLACE FUNCTION is_customer(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = p_user_id AND role = 'customer'
    );
END;
$$;

COMMENT ON FUNCTION is_customer IS 'التحقق من أن المستخدم عميل (role=customer)';

-- 3.2: جلب customer_id من auth.uid()
CREATE OR REPLACE FUNCTION get_customer_id_from_auth(
    p_auth_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT customer_id 
        FROM user_profiles 
        WHERE id = p_auth_user_id
        LIMIT 1
    );
END;
$$;

COMMENT ON FUNCTION get_customer_id_from_auth IS 'جلب customer_id من auth.uid()';

-- 3.3: توليد كود عميل فريد
CREATE OR REPLACE FUNCTION generate_customer_code(p_tenant_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
    v_code VARCHAR;
BEGIN
    -- عد العملاء الموجودين
    SELECT COUNT(*) INTO v_count 
    FROM customers 
    WHERE tenant_id = p_tenant_id;
    
    -- توليد الكود
    v_code := 'CUST-' || LPAD((v_count + 1)::TEXT, 5, '0');
    
    -- التأكد من عدم التكرار
    WHILE EXISTS (SELECT 1 FROM customers WHERE code = v_code AND tenant_id = p_tenant_id) LOOP
        v_code := 'CUST-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    END LOOP;
    
    RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_customer_code IS 'توليد كود عميل فريد (CUST-XXXXX)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. دالة تسجيل عميل جديد
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION register_customer(
    p_email VARCHAR,
    p_password VARCHAR,
    p_full_name VARCHAR,
    p_phone VARCHAR,
    p_tenant_id UUID,
    p_company_id UUID,
    p_customer_group_code VARCHAR DEFAULT 'RETAIL',
    p_country VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auth_user_id UUID;
    v_customer_id UUID;
    v_customer_code VARCHAR;
    v_customer_group_id UUID;
    v_name_parts TEXT[];
    v_first_name VARCHAR;
    v_last_name VARCHAR;
BEGIN
    -- ═══════════════════════════════════════════════════════════════
    -- 1. التحقق من عدم وجود Email مسبقاً
    -- ═══════════════════════════════════════════════════════════════
    
    IF EXISTS (SELECT 1 FROM customers WHERE email = p_email AND tenant_id = p_tenant_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'email_exists',
            'message', 'البريد الإلكتروني مسجل مسبقاً'
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 2. إنشاء المستخدم في Supabase Auth
    -- ═══════════════════════════════════════════════════════════════
    
    -- ملاحظة: هذا يحتاج تنفيذ من خلال Supabase Auth API
    -- في الـ Frontend أو عبر Edge Function
    -- هنا نفترض أن auth_user_id سيُمرر من الخارج
    
    -- للاختبار فقط، يمكن استخدام gen_random_uuid()
    -- في الواقع، يجب استخدام Supabase Auth signup
    v_auth_user_id := gen_random_uuid();
    
    RAISE NOTICE 'ℹ️ تم توليد auth_user_id: %', v_auth_user_id;
    RAISE NOTICE 'ℹ️ في Production، استخدم Supabase Auth API لإنشاء المستخدم';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 3. توليد customer_code
    -- ═══════════════════════════════════════════════════════════════
    
    v_customer_code := generate_customer_code(p_tenant_id);
    
    -- ═══════════════════════════════════════════════════════════════
    -- 4. الحصول على customer_group_id
    -- ═══════════════════════════════════════════════════════════════
    
    SELECT id INTO v_customer_group_id
    FROM customer_groups
    WHERE code = p_customer_group_code 
      AND tenant_id = p_tenant_id
    LIMIT 1;
    
    -- إذا لم توجد المجموعة، استخدم RETAIL الافتراضية
    IF v_customer_group_id IS NULL THEN
        SELECT id INTO v_customer_group_id
        FROM customer_groups
        WHERE code = 'RETAIL' 
          AND tenant_id = p_tenant_id
        LIMIT 1;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 5. فصل الاسم الأول والأخير
    -- ═══════════════════════════════════════════════════════════════
    
    v_name_parts := string_to_array(p_full_name, ' ');
    v_first_name := v_name_parts[1];
    
    IF array_length(v_name_parts, 1) > 1 THEN
        v_last_name := array_to_string(v_name_parts[2:], ' ');
    ELSE
        v_last_name := '';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 6. إنشاء customers record
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO customers (
        tenant_id,
        company_id,
        code,
        customer_type,
        name_ar,
        name_en,
        first_name,
        last_name,
        email,
        phone,
        mobile,
        country,
        city,
        group_id,
        auth_user_id,
        status,
        created_at
    )
    VALUES (
        p_tenant_id,
        p_company_id,
        v_customer_code,
        'individual',
        p_full_name,
        p_full_name,
        v_first_name,
        v_last_name,
        p_email,
        p_phone,
        p_phone,
        p_country,
        p_city,
        v_customer_group_id,
        v_auth_user_id,
        'active',
        NOW()
    )
    RETURNING id INTO v_customer_id;
    
    RAISE NOTICE '✅ تم إنشاء customer: % (%)', v_customer_code, v_customer_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- 7. إنشاء user_profiles record
    -- ═══════════════════════════════════════════════════════════════
    
    INSERT INTO user_profiles (
        id,
        email,
        full_name,
        role,
        tenant_id,
        company_id,
        customer_id,
        phone,
        created_at
    )
    VALUES (
        v_auth_user_id,
        p_email,
        p_full_name,
        'customer',
        p_tenant_id,
        p_company_id,
        v_customer_id,
        p_phone,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        tenant_id = EXCLUDED.tenant_id,
        company_id = EXCLUDED.company_id,
        customer_id = EXCLUDED.customer_id,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE '✅ تم إنشاء user_profile: role=customer';
    
    -- ═══════════════════════════════════════════════════════════════
    -- 8. إرجاع النتيجة
    -- ═══════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer_id,
        'customer_code', v_customer_code,
        'auth_user_id', v_auth_user_id,
        'message', 'تم التسجيل بنجاح'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في register_customer: %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'registration_failed',
            'message', SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION register_customer IS 'تسجيل عميل جديد في المتجر الإلكتروني';

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_customer TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. دالة ربط عميل موجود بـ auth
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION link_existing_customer_to_auth(
    p_customer_id UUID,
    p_auth_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_email VARCHAR;
    v_tenant_id UUID;
    v_company_id UUID;
BEGIN
    -- الحصول على بيانات العميل
    SELECT email, tenant_id, company_id
    INTO v_customer_email, v_tenant_id, v_company_id
    FROM customers
    WHERE id = p_customer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- تحديث customers
    UPDATE customers
    SET auth_user_id = p_auth_user_id
    WHERE id = p_customer_id;
    
    -- إنشاء أو تحديث user_profiles
    INSERT INTO user_profiles (
        id,
        email,
        role,
        tenant_id,
        company_id,
        customer_id
    )
    VALUES (
        p_auth_user_id,
        v_customer_email,
        'customer',
        v_tenant_id,
        v_company_id,
        p_customer_id
    )
    ON CONFLICT (id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        role = 'customer';
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION link_existing_customer_to_auth IS 'ربط عميل موجود بحساب auth.users';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. دالة جلب بيانات العميل
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_customer_profile(
    p_auth_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    customer_id UUID,
    customer_code VARCHAR,
    name_ar VARCHAR,
    name_en VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    mobile VARCHAR,
    country VARCHAR,
    city VARCHAR,
    address TEXT,
    customer_type VARCHAR,
    customer_group_code VARCHAR,
    customer_group_name_ar VARCHAR,
    customer_group_name_en VARCHAR,
    balance DECIMAL,
    credit_limit DECIMAL,
    total_sales DECIMAL,
    total_payments DECIMAL,
    currency VARCHAR,
    status VARCHAR,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.code,
        c.name_ar,
        c.name_en,
        c.email,
        c.phone,
        c.mobile,
        c.country,
        c.city,
        c.address,
        c.customer_type,
        cg.code as group_code,
        cg.name_ar as group_name_ar,
        cg.name_en as group_name_en,
        c.balance,
        c.credit_limit,
        c.total_sales,
        c.total_payments,
        c.currency,
        c.status,
        c.created_at
    FROM customers c
    LEFT JOIN customer_groups cg ON cg.id = c.group_id
    WHERE c.auth_user_id = p_auth_user_id;
END;
$$;

COMMENT ON FUNCTION get_customer_profile IS 'جلب بيانات العميل الكاملة من auth.uid()';

GRANT EXECUTE ON FUNCTION get_customer_profile TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. دالة تحديث بيانات العميل
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_customer_profile(
    p_auth_user_id UUID DEFAULT auth.uid(),
    p_full_name VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_name_parts TEXT[];
    v_first_name VARCHAR;
    v_last_name VARCHAR;
BEGIN
    -- الحصول على customer_id
    SELECT customer_id INTO v_customer_id
    FROM user_profiles
    WHERE id = p_auth_user_id;
    
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found for this user';
    END IF;
    
    -- فصل الاسم إذا تم تحديثه
    IF p_full_name IS NOT NULL THEN
        v_name_parts := string_to_array(p_full_name, ' ');
        v_first_name := v_name_parts[1];
        
        IF array_length(v_name_parts, 1) > 1 THEN
            v_last_name := array_to_string(v_name_parts[2:], ' ');
        ELSE
            v_last_name := '';
        END IF;
    END IF;
    
    -- تحديث customers
    UPDATE customers
    SET 
        name_ar = COALESCE(p_full_name, name_ar),
        name_en = COALESCE(p_full_name, name_en),
        first_name = COALESCE(v_first_name, first_name),
        last_name = COALESCE(v_last_name, last_name),
        phone = COALESCE(p_phone, phone),
        mobile = COALESCE(p_phone, mobile),
        country = COALESCE(p_country, country),
        city = COALESCE(p_city, city),
        address = COALESCE(p_address, address),
        updated_at = NOW()
    WHERE id = v_customer_id;
    
    -- تحديث user_profiles
    UPDATE user_profiles
    SET 
        full_name = COALESCE(p_full_name, full_name),
        phone = COALESCE(p_phone, phone),
        updated_at = NOW()
    WHERE id = p_auth_user_id;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION update_customer_profile IS 'تحديث بيانات العميل الشخصية';

GRANT EXECUTE ON FUNCTION update_customer_profile TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS Policies للعملاء
-- ═══════════════════════════════════════════════════════════════════════════

-- 8.1: customers table policies

-- العملاء يرون بياناتهم فقط
DROP POLICY IF EXISTS "Customers see own data" ON customers;
CREATE POLICY "Customers see own data" 
ON customers 
FOR SELECT
TO authenticated
USING (
    auth_user_id = auth.uid()
    AND
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'customer'
    )
);

-- العملاء يعدلون بياناتهم الشخصية فقط
DROP POLICY IF EXISTS "Customers update own data" ON customers;
CREATE POLICY "Customers update own data" 
ON customers 
FOR UPDATE
TO authenticated
USING (
    auth_user_id = auth.uid()
    AND
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'customer'
    )
)
WITH CHECK (
    auth_user_id = auth.uid()
);

-- الإداريون يرون جميع عملاء tenant/company الخاصة بهم
DROP POLICY IF EXISTS "Admins see company customers" ON customers;
CREATE POLICY "Admins see company customers" 
ON customers 
FOR SELECT
TO authenticated
USING (
    tenant_id = get_current_user_tenant_id()
    AND
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
          AND role IN ('admin', 'user', 'accountant', 'super_admin')
    )
);

-- 8.2: user_profiles table policies

-- العملاء يرون profile الخاص بهم
DROP POLICY IF EXISTS "Customers see own profile" ON user_profiles;
CREATE POLICY "Customers see own profile" 
ON user_profiles 
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    AND
    role = 'customer'
);

-- العملاء يعدلون profile الخاص بهم
DROP POLICY IF EXISTS "Customers update own profile" ON user_profiles;
CREATE POLICY "Customers update own profile" 
ON user_profiles 
FOR UPDATE
TO authenticated
USING (
    id = auth.uid()
    AND
    role = 'customer'
)
WITH CHECK (
    id = auth.uid()
    AND
    role = 'customer'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- نهاية STEP_51
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تثبيت نظام تسجيل العملاء بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'التعديلات:';
    RAISE NOTICE '  1. customers.auth_user_id - ربط مع auth.users';
    RAISE NOTICE '  2. user_profiles.customer_id - ربط مع customers';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions المُنشأة:';
    RAISE NOTICE '  1. is_customer() - التحقق من role';
    RAISE NOTICE '  2. get_customer_id_from_auth() - جلب customer_id';
    RAISE NOTICE '  3. generate_customer_code() - توليد كود';
    RAISE NOTICE '  4. register_customer() - تسجيل عميل جديد';
    RAISE NOTICE '  5. link_existing_customer_to_auth() - ربط موجود';
    RAISE NOTICE '  6. get_customer_profile() - جلب بيانات';
    RAISE NOTICE '  7. update_customer_profile() - تحديث بيانات';
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies:';
    RAISE NOTICE '  • العملاء يرون بياناتهم فقط';
    RAISE NOTICE '  • الإداريون يرون جميع عملاء الشركة';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ملاحظة مهمة:';
    RAISE NOTICE '  في Production، استخدم Supabase Auth API';
    RAISE NOTICE '  لإنشاء المستخدمين بدلاً من gen_random_uuid()';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 الخطوة التالية:';
    RAISE NOTICE '  STEP_52: Shopping Cart System';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- CREATE_helper_functions.sql
-- المرحلة 4: الدوال المساعدة للسياسات + عزل البراندات
-- تاريخ الإنشاء: 2026-02-05
-- آخر تحديث: 2026-02-05
-- =====================================================
-- 
-- قواعد الدوال:
--   ✓ كل دالة SECURITY DEFINER
--   ✓ كل دالة STABLE
--   ✓ Platform Owner يتجاوز كل القيود (كل البراندات)
--   ✓ Partner/Reseller يرى البراندات المسموح له بها
--   ✓ Tenant Owner يرى براند واحد + كل شركات التينانت
--   ✓ المستخدم العادي يرى براند + تينانت + شركات محددة
--
-- ترتيب العزل: Brand → Tenant → Company
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 0. إنشاء الجداول المساعدة (إذا لم تكن موجودة)
-- ═══════════════════════════════════════════════════════════════

-- جدول الوكلاء (Partners)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    email VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(50),
    partner_type VARCHAR(20) NOT NULL DEFAULT 'reseller' CHECK (partner_type IN ('whitelabel', 'reseller', 'affiliate')),
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    country VARCHAR(100),
    website VARCHAR(200),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس جدول الوكلاء
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_partners_active ON public.partners(is_active);

-- RLS للوكلاء
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- إضافة partner_id للـ tenants إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tenants' 
          AND column_name = 'partner_id'
    ) THEN
        ALTER TABLE public.tenants ADD COLUMN partner_id UUID REFERENCES public.partners(id);
        CREATE INDEX IF NOT EXISTS idx_tenants_partner ON public.tenants(partner_id);
    END IF;
END $$;

-- جدول البراندات المسموح للوكيل بيعها
CREATE TABLE IF NOT EXISTS public.partner_allowed_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.saas_products(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    can_sell BOOLEAN DEFAULT true,
    can_support BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(partner_id, product_id)
);

-- فهارس جدول البراندات المسموحة
CREATE INDEX IF NOT EXISTS idx_partner_allowed_products_partner ON public.partner_allowed_products(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_allowed_products_product ON public.partner_allowed_products(product_id);

-- RLS
ALTER TABLE public.partner_allowed_products ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════
-- 1. دوال المنصة (Platform Functions) - يجب تعريفها أولاً
-- ═══════════════════════════════════════════════════════════════

-- 1.1 is_platform_owner: هل المستخدم مالك المنصة (Super Admin)
CREATE OR REPLACE FUNCTION public.is_platform_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- التحقق من وجود المستخدم في جدول super_admins
    RETURN EXISTS (
        SELECT 1 FROM public.super_admins
        WHERE user_id = p_user_id
          AND is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 1.2 is_platform_admin: هل المستخدم مدير المنصة (owner أو admin)
CREATE OR REPLACE FUNCTION public.is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Platform Owner
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- التحقق من دور platform_admin أو support_senior
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.code IN ('platform_admin', 'support_senior')
          AND ur.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. دوال الوكلاء الأساسية (Partner Functions - Basic)
-- ═══════════════════════════════════════════════════════════════

-- 2.1 is_whitelabel_partner: هل المستخدم وكيل وايت ليبل
CREATE OR REPLACE FUNCTION public.is_whitelabel_partner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.partners p
        JOIN public.user_profiles up ON up.email = p.email
        WHERE up.id = p_user_id
          AND p.partner_type = 'whitelabel'
          AND p.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 2.2 is_reseller: هل المستخدم وكيل عادي
CREATE OR REPLACE FUNCTION public.is_reseller(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.partners p
        JOIN public.user_profiles up ON up.email = p.email
        WHERE up.id = p_user_id
          AND p.partner_type = 'reseller'
          AND p.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 2.3 is_partner_or_reseller: هل المستخدم أي نوع وكيل
CREATE OR REPLACE FUNCTION public.is_partner_or_reseller(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.partners p
        JOIN public.user_profiles up ON up.email = p.email
        WHERE up.id = p_user_id
          AND p.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. دوال التينانت الأساسية (Tenant Functions - Basic)
-- ═══════════════════════════════════════════════════════════════

-- 3.1 get_user_tenant_id: الحصول على tenant_id للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    RETURN v_tenant_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 3.2 is_tenant_owner: هل المستخدم صاحب الاشتراك
CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_email TEXT;
    v_tenant_id UUID;
    v_owner_email TEXT;
BEGIN
    -- Platform Admin يعتبر أعلى من Tenant Owner
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- الحصول على بريد المستخدم و tenant_id
    SELECT email, tenant_id INTO v_user_email, v_tenant_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- التحقق من أن المستخدم هو صاحب التينانت
    SELECT owner_email INTO v_owner_email
    FROM public.tenants
    WHERE id = v_tenant_id;
    
    RETURN LOWER(v_user_email) = LOWER(v_owner_email);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 3.3 get_tenant_company_ids: كل شركات التينانت
CREATE OR REPLACE FUNCTION public.get_tenant_company_ids(p_tenant_id UUID DEFAULT NULL)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_tenant_id UUID;
    v_company_ids UUID[];
BEGIN
    -- إذا لم يتم تحديد tenant_id، استخدم tenant_id للمستخدم الحالي
    v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());
    
    IF v_tenant_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;
    
    SELECT ARRAY_AGG(id)
    INTO v_company_ids
    FROM public.companies
    WHERE tenant_id = v_tenant_id
      AND is_active = true;
    
    RETURN COALESCE(v_company_ids, ARRAY[]::UUID[]);
EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. دوال البراند (Brand Functions)
-- ═══════════════════════════════════════════════════════════════

-- 4.1 get_user_brand_id: الحصول على product_id (البراند) للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_brand_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_product_id UUID;
    v_tenant_id UUID;
BEGIN
    -- الحصول على tenant_id للمستخدم
    SELECT tenant_id INTO v_tenant_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- الحصول على product_id من tenant
    SELECT product_id INTO v_product_id
    FROM public.tenants
    WHERE id = v_tenant_id;
    
    RETURN v_product_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 4.2 get_user_product_id: alias للتوافق
CREATE OR REPLACE FUNCTION public.get_user_product_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN get_user_brand_id(p_user_id);
END;
$$;

-- 4.3 get_partner_allowed_brand_ids: البراندات المسموح للوكيل بيعها
CREATE OR REPLACE FUNCTION public.get_partner_allowed_brand_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_partner_id UUID;
    v_brand_ids UUID[];
BEGIN
    -- Platform Owner يرى كل البراندات
    IF is_platform_owner(p_user_id) THEN
        SELECT ARRAY_AGG(id)
        INTO v_brand_ids
        FROM public.saas_products
        WHERE is_active = true;
        RETURN COALESCE(v_brand_ids, ARRAY[]::UUID[]);
    END IF;
    
    -- الحصول على partner_id
    SELECT p.id INTO v_partner_id
    FROM public.partners p
    JOIN public.user_profiles up ON up.email = p.email
    WHERE up.id = p_user_id
      AND p.is_active = true;
    
    IF v_partner_id IS NULL THEN
        -- ليس وكيلاً، إرجاع البراند الخاص به فقط
        RETURN ARRAY[get_user_brand_id(p_user_id)]::UUID[];
    END IF;
    
    -- الحصول على البراندات المسموح للوكيل بيعها
    SELECT ARRAY_AGG(pap.product_id)
    INTO v_brand_ids
    FROM public.partner_allowed_products pap
    WHERE pap.partner_id = v_partner_id
      AND pap.can_sell = true;
    
    -- إذا لم يكن هناك تحديد (backwards compatibility)، إرجاع كل البراندات
    IF v_brand_ids IS NULL OR array_length(v_brand_ids, 1) IS NULL THEN
        SELECT ARRAY_AGG(id)
        INTO v_brand_ids
        FROM public.saas_products
        WHERE is_active = true;
    END IF;
    
    RETURN COALESCE(v_brand_ids, ARRAY[]::UUID[]);
EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$;

-- 4.4 is_same_brand: التحقق أن التينانت ينتمي لنفس براند المستخدم
CREATE OR REPLACE FUNCTION public.is_same_brand(
    p_tenant_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_brand_id UUID;
    v_tenant_brand_id UUID;
BEGIN
    -- Platform Owner يرى كل البراندات
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- الحصول على براند المستخدم
    v_user_brand_id := get_user_brand_id(p_user_id);
    
    -- الحصول على براند التينانت
    SELECT product_id INTO v_tenant_brand_id
    FROM public.tenants
    WHERE id = p_tenant_id;
    
    -- Partner/Reseller: يتحقق من البراندات المسموح له بها
    IF is_partner_or_reseller(p_user_id) THEN
        RETURN v_tenant_brand_id = ANY(get_partner_allowed_brand_ids(p_user_id));
    END IF;
    
    -- المستخدم العادي: يجب أن يكون براند التينانت = براند المستخدم
    RETURN v_user_brand_id IS NOT NULL 
       AND v_tenant_brand_id IS NOT NULL 
       AND v_user_brand_id = v_tenant_brand_id;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 4.5 get_brand_tenant_ids: كل التينانتات التابعة لبراند معين
CREATE OR REPLACE FUNCTION public.get_brand_tenant_ids(p_product_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_tenant_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(id)
    INTO v_tenant_ids
    FROM public.tenants
    WHERE product_id = p_product_id
      AND status = 'active';
    
    RETURN COALESCE(v_tenant_ids, ARRAY[]::UUID[]);
EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. دوال الوكلاء المتقدمة (Partner Functions - Advanced)
-- ═══════════════════════════════════════════════════════════════

-- 5.1 get_partner_tenant_ids: التينانتات التابعة للوكيل (مع فلترة بالبراند)
CREATE OR REPLACE FUNCTION public.get_partner_tenant_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_partner_id UUID;
    v_allowed_brands UUID[];
    v_tenant_ids UUID[];
BEGIN
    -- الحصول على partner_id
    SELECT p.id INTO v_partner_id
    FROM public.partners p
    JOIN public.user_profiles up ON up.email = p.email
    WHERE up.id = p_user_id
      AND p.is_active = true;
    
    IF v_partner_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;
    
    -- الحصول على البراندات المسموح للوكيل بيعها
    v_allowed_brands := get_partner_allowed_brand_ids(p_user_id);
    
    -- الحصول على جميع التينانتات التي أنشأها الوكيل ضمن البراندات المسموح بها
    SELECT ARRAY_AGG(t.id)
    INTO v_tenant_ids
    FROM public.tenants t
    WHERE t.partner_id = v_partner_id
      AND t.status = 'active'
      AND (t.product_id = ANY(v_allowed_brands) OR t.product_id IS NULL);
    
    RETURN COALESCE(v_tenant_ids, ARRAY[]::UUID[]);
EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. دوال الشركة (Company Functions)
-- ═══════════════════════════════════════════════════════════════

-- 6.1 get_user_company_id: الحصول على company_id للمستخدم
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    RETURN v_company_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 6.2 is_company_admin: هل المستخدم مدير الشركة
CREATE OR REPLACE FUNCTION public.is_company_admin(
    p_user_id UUID DEFAULT auth.uid(),
    p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_company_id UUID;
BEGIN
    -- Platform Owner أو Tenant Owner لهم صلاحيات كاملة
    IF is_platform_owner(p_user_id) OR is_tenant_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- التحقق من company_id المحدد أو الشركة الافتراضية
    v_user_company_id := COALESCE(p_company_id, get_user_company_id(p_user_id));
    
    -- التحقق من دور company_owner أو company_admin
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.code IN ('company_owner', 'company_admin')
          AND ur.is_active = true
          AND (ur.company_id = v_user_company_id OR ur.company_id IS NULL)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 6.3 can_access_company: هل المستخدم يمكنه الوصول لهذه الشركة (مُحدّثة مع البراند)
CREATE OR REPLACE FUNCTION public.can_access_company(
    p_company_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_company_id UUID;
    v_user_tenant_id UUID;
    v_company_tenant_id UUID;
    v_company_brand_id UUID;
    v_user_brand_id UUID;
BEGIN
    -- Platform Owner يرى كل شيء (كل البراندات)
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- الحصول على بيانات المستخدم
    SELECT company_id, tenant_id 
    INTO v_user_company_id, v_user_tenant_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- الحصول على بيانات الشركة
    SELECT c.tenant_id, t.product_id INTO v_company_tenant_id, v_company_brand_id
    FROM public.companies c
    LEFT JOIN public.tenants t ON c.tenant_id = t.id
    WHERE c.id = p_company_id;
    
    -- ═══ الخطوة 1: التحقق من البراند ═══
    v_user_brand_id := get_user_brand_id(p_user_id);
    
    -- Partner/Reseller: يتحقق من البراندات المسموح له بها
    IF is_partner_or_reseller(p_user_id) THEN
        IF v_company_brand_id IS NOT NULL 
           AND NOT (v_company_brand_id = ANY(get_partner_allowed_brand_ids(p_user_id))) THEN
            RETURN false;
        END IF;
        -- الوكيل يمكنه الوصول لشركات التينانتات التابعة له
        IF v_company_tenant_id = ANY(get_partner_tenant_ids(p_user_id)) THEN
            RETURN true;
        END IF;
    END IF;
    
    -- المستخدم العادي: يجب أن يكون في نفس البراند
    IF v_user_brand_id IS NOT NULL AND v_company_brand_id IS NOT NULL THEN
        IF v_user_brand_id != v_company_brand_id THEN
            RETURN false;
        END IF;
    END IF;
    
    -- ═══ الخطوة 2: التحقق من التينانت ═══
    IF v_user_tenant_id IS NULL OR v_company_tenant_id IS NULL THEN
        RETURN false;
    END IF;
    
    IF v_user_tenant_id != v_company_tenant_id THEN
        RETURN false;
    END IF;
    
    -- ═══ الخطوة 3: التحقق من الشركة ═══
    -- Tenant Owner يرى كل شركات التينانت
    IF is_tenant_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- التحقق من الشركة المُعينة للمستخدم
    IF v_user_company_id = p_company_id THEN
        RETURN true;
    END IF;
    
    -- التحقق من الصلاحيات المتعددة للشركات عبر user_roles
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.company_id = p_company_id
          AND ur.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 6.4 get_user_accessible_company_ids: كل الشركات المصرح للمستخدم بها
CREATE OR REPLACE FUNCTION public.get_user_accessible_company_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_tenant_id UUID;
    v_user_company_id UUID;
    v_company_ids UUID[];
BEGIN
    -- Platform Owner يرى كل الشركات في كل البراندات
    IF is_platform_owner(p_user_id) THEN
        SELECT ARRAY_AGG(id)
        INTO v_company_ids
        FROM public.companies
        WHERE is_active = true;
        RETURN COALESCE(v_company_ids, ARRAY[]::UUID[]);
    END IF;
    
    -- Partner/Reseller: شركات التينانتات التابعة له ضمن البراندات المسموح بها
    IF is_partner_or_reseller(p_user_id) THEN
        SELECT ARRAY_AGG(c.id)
        INTO v_company_ids
        FROM public.companies c
        WHERE c.tenant_id = ANY(get_partner_tenant_ids(p_user_id))
          AND c.is_active = true;
        RETURN COALESCE(v_company_ids, ARRAY[]::UUID[]);
    END IF;
    
    -- الحصول على بيانات المستخدم
    SELECT tenant_id, company_id 
    INTO v_user_tenant_id, v_user_company_id
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    IF v_user_tenant_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;
    
    -- Tenant Owner يرى كل شركات التينانت
    IF is_tenant_owner(p_user_id) THEN
        RETURN get_tenant_company_ids(v_user_tenant_id);
    END IF;
    
    -- المستخدم العادي: الشركة الافتراضية + الشركات المُعينة عبر user_roles
    SELECT ARRAY_AGG(DISTINCT company_id)
    INTO v_company_ids
    FROM (
        -- الشركة الافتراضية
        SELECT v_user_company_id AS company_id
        WHERE v_user_company_id IS NOT NULL
        UNION
        -- الشركات من user_roles
        SELECT ur.company_id
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND ur.company_id IS NOT NULL
    ) AS accessible;
    
    RETURN COALESCE(v_company_ids, ARRAY[]::UUID[]);
EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. الدالة الشاملة (Comprehensive Check) - مُحدّثة مع البراند
-- ═══════════════════════════════════════════════════════════════

-- 7.1 check_row_access: تحقق شامل للوصول (Brand → Tenant → Company)
CREATE OR REPLACE FUNCTION public.check_row_access(
    p_tenant_id UUID,
    p_company_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_tenant_id UUID;
BEGIN
    -- Platform Owner يرى كل شيء
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- ═══ الخطوة 1: التحقق من البراند ═══
    -- التحقق من أن التينانت ينتمي لنفس البراند
    IF NOT is_same_brand(p_tenant_id, p_user_id) THEN
        RETURN false;
    END IF;
    
    -- ═══ الخطوة 2: التحقق من التينانت ═══
    -- Partner/Reseller: يرى تينانتاته فقط
    IF is_partner_or_reseller(p_user_id) THEN
        IF p_tenant_id = ANY(get_partner_tenant_ids(p_user_id)) THEN
            -- إذا لم يتم تحديد company_id، التحقق من tenant فقط
            IF p_company_id IS NULL THEN
                RETURN true;
            END IF;
            -- التحقق من صلاحية الوصول للشركة
            RETURN can_access_company(p_company_id, p_user_id);
        END IF;
        RETURN false;
    END IF;
    
    -- الحصول على tenant_id للمستخدم
    v_user_tenant_id := get_user_tenant_id(p_user_id);
    
    -- التحقق من الانتماء لنفس التينانت
    IF v_user_tenant_id IS NULL OR v_user_tenant_id != p_tenant_id THEN
        RETURN false;
    END IF;
    
    -- ═══ الخطوة 3: التحقق من الشركة ═══
    -- إذا لم يتم تحديد company_id، التحقق من tenant فقط
    IF p_company_id IS NULL THEN
        RETURN true;
    END IF;
    
    -- التحقق من صلاحية الوصول للشركة
    RETURN can_access_company(p_company_id, p_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8. دوال مساعدة إضافية (للتوافق)
-- ═══════════════════════════════════════════════════════════════

-- 8.1 is_super_admin: للتوافق مع الدوال القديمة
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN is_platform_owner(p_user_id);
END;
$$;

-- 8.2 get_current_tenant_id: للتوافق مع الكود القديم
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN get_user_tenant_id(auth.uid());
END;
$$;

-- 8.3 is_tenant_admin: التحقق من أن المستخدم tenant_admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Platform Owner أعلى من Tenant Admin
    IF is_platform_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- Tenant Owner هو tenant_admin بالضرورة
    IF is_tenant_owner(p_user_id) THEN
        RETURN true;
    END IF;
    
    -- التحقق من دور tenant_admin
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.code = 'tenant_admin'
          AND ur.is_active = true
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 8.4 get_current_brand_id: للحصول على براند المستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_current_brand_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN get_user_brand_id(auth.uid());
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. منح الصلاحيات
-- ═══════════════════════════════════════════════════════════════

-- منح صلاحيات التنفيذ للمستخدمين المُصادق عليهم
GRANT EXECUTE ON FUNCTION public.is_platform_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_whitelabel_partner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reseller(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_or_reseller(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_company_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_company_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_row_access(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;

-- دوال البراند الجديدة
GRANT EXECUTE ON FUNCTION public.get_user_brand_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_product_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_same_brand(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_allowed_brand_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brand_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_brand_id() TO authenticated;

-- صلاحيات الجدول الجديد
GRANT SELECT ON public.partner_allowed_products TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 10. التحقق من إنشاء الدوال
-- ═══════════════════════════════════════════════════════════════

SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.prosecdef THEN '✓ SECURITY DEFINER'
        ELSE '✗ SECURITY INVOKER'
    END as security,
    CASE 
        WHEN p.provolatile = 's' THEN '✓ STABLE'
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        ELSE 'VOLATILE'
    END as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'is_platform_owner',
    'is_platform_admin',
    'is_whitelabel_partner',
    'is_reseller',
    'is_partner_or_reseller',
    'get_partner_tenant_ids',
    'get_user_tenant_id',
    'is_tenant_owner',
    'get_tenant_company_ids',
    'get_user_company_id',
    'is_company_admin',
    'can_access_company',
    'get_user_accessible_company_ids',
    'check_row_access',
    'is_super_admin',
    'get_current_tenant_id',
    'is_tenant_admin',
    'get_user_brand_id',
    'get_user_product_id',
    'is_same_brand',
    'get_partner_allowed_brand_ids',
    'get_brand_tenant_ids',
    'get_current_brand_id'
)
ORDER BY p.proname;

-- =====================================================
-- تم الانتهاء من إنشاء الدوال المساعدة بنجاح!
-- =====================================================
SELECT 'تم إنشاء 23 دالة مساعدة للسياسات + جدول partner_allowed_products بنجاح!' as result;

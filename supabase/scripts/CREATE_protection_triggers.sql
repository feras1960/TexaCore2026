-- =====================================================
-- CREATE_protection_triggers.sql
-- المرحلة 6: تريغرات الحماية مع عزل البراندات
-- تاريخ الإنشاء: 2026-02-05
-- =====================================================
-- 
-- تريغرات لحماية الحقول الحساسة ومنع التعديلات غير المصرح بها
-- مع دعم كامل لعزل البراندات الستة
--
-- =====================================================

-- ═══════════════════════════════════════════════════════════════
-- 0. إنشاء الجداول المطلوبة (إذا لم تكن موجودة)
-- ═══════════════════════════════════════════════════════════════

-- جدول super_admins (مالكي المنصة)
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL,
    full_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

-- فهارس super_admins
CREATE INDEX IF NOT EXISTS idx_super_admins_user ON public.super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON public.super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON public.super_admins(is_active);

-- RLS على super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- إضافة أعمدة في user_profiles إذا لم تكن موجودة
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_super_admin') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_platform_admin') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_platform_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 1. حماية user_profiles
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_user_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_owner BOOLEAN;
    v_is_platform_admin BOOLEAN;
    v_is_tenant_owner BOOLEAN;
BEGIN
    -- تخطي للعمليات النظامية (بدون مستخدم)
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- الحصول على صلاحيات المستخدم الحالي
    v_is_platform_owner := is_platform_owner(v_current_user_id);
    v_is_platform_admin := is_platform_admin(v_current_user_id);
    v_is_tenant_owner := is_tenant_owner(v_current_user_id);

    -- ════════ حماية is_super_admin ════════
    IF OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin THEN
        IF NOT v_is_platform_owner THEN
            RAISE EXCEPTION 'غير مسموح: فقط مالك المنصة يمكنه تغيير is_super_admin / Not allowed: Only platform owner can change is_super_admin';
        END IF;
    END IF;

    -- ════════ حماية is_platform_admin ════════
    IF OLD.is_platform_admin IS DISTINCT FROM NEW.is_platform_admin THEN
        IF NOT v_is_platform_owner THEN
            RAISE EXCEPTION 'غير مسموح: فقط مالك المنصة يمكنه تغيير is_platform_admin / Not allowed: Only platform owner can change is_platform_admin';
        END IF;
    END IF;

    -- ════════ حماية tenant_id ════════
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
        IF NOT v_is_platform_admin THEN
            RAISE EXCEPTION 'غير مسموح: فقط مدير المنصة يمكنه تغيير tenant_id / Not allowed: Only platform admin can change tenant_id';
        END IF;
    END IF;

    -- ════════ حماية company_id ════════
    IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
        IF NOT (v_is_platform_admin OR v_is_tenant_owner) THEN
            RAISE EXCEPTION 'غير مسموح: فقط مدير المنصة أو صاحب الاشتراك يمكنه تغيير company_id / Not allowed: Only platform admin or tenant owner can change company_id';
        END IF;
    END IF;

    -- ════════ المستخدم العادي: تحقق من الحقول المسموحة فقط ════════
    IF NOT (v_is_platform_admin OR v_is_tenant_owner) THEN
        -- المستخدم يعدّل بياناته فقط
        IF OLD.id = v_current_user_id THEN
            -- الحقول المسموح تعديلها: full_name, display_name, phone, avatar_url, settings, preferred_language
            IF OLD.email IS DISTINCT FROM NEW.email THEN
                RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير البريد الإلكتروني / Not allowed: You cannot change email';
            END IF;
            IF OLD.role IS DISTINCT FROM NEW.role THEN
                RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير دورك / Not allowed: You cannot change your role';
            END IF;
        ELSE
            -- محاولة تعديل بيانات مستخدم آخر
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تعديل بيانات مستخدم آخر / Not allowed: You cannot modify another user''s data';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- حذف التريغر القديم إن وجد وإنشاء الجديد
DROP TRIGGER IF EXISTS trg_protect_user_profiles ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profiles
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_profiles();

-- ═══════════════════════════════════════════════════════════════
-- 2. حماية tenants
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_tenants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_owner BOOLEAN;
    v_is_platform_admin BOOLEAN;
    v_user_email TEXT;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_is_platform_owner := is_platform_owner(v_current_user_id);
    v_is_platform_admin := is_platform_admin(v_current_user_id);
    
    -- الحصول على بريد المستخدم الحالي
    SELECT email INTO v_user_email FROM public.user_profiles WHERE id = v_current_user_id;

    -- ════════ حماية product_id (البراند) ════════
    IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
        IF NOT v_is_platform_owner THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكن تغيير البراند إلا من مالك المنصة / Not allowed: Only platform owner can change brand (product_id)';
        END IF;
    END IF;

    -- ════════ حماية owner_email ════════
    IF OLD.owner_email IS DISTINCT FROM NEW.owner_email THEN
        IF NOT (v_is_platform_admin OR LOWER(OLD.owner_email) = LOWER(v_user_email)) THEN
            RAISE EXCEPTION 'غير مسموح: فقط مدير المنصة أو صاحب الاشتراك يمكنه تغيير owner_email / Not allowed: Only platform admin or current owner can change owner_email';
        END IF;
    END IF;

    -- ════════ حماية partner_id ════════
    IF OLD.partner_id IS DISTINCT FROM NEW.partner_id THEN
        IF NOT v_is_platform_admin THEN
            RAISE EXCEPTION 'غير مسموح: فقط مدير المنصة يمكنه تغيير partner_id / Not allowed: Only platform admin can change partner_id';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_tenants ON public.tenants;
CREATE TRIGGER trg_protect_tenants
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_tenants();

-- ═══════════════════════════════════════════════════════════════
-- 3. حماية companies
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_companies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_admin BOOLEAN;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_is_platform_admin := is_platform_admin(v_current_user_id);

    -- ════════ حماية tenant_id ════════
    IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
        IF NOT v_is_platform_admin THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكن نقل شركة من تينانت لآخر إلا من مدير المنصة / Not allowed: Only platform admin can move company between tenants';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_companies ON public.companies;
CREATE TRIGGER trg_protect_companies
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_companies();

-- ═══════════════════════════════════════════════════════════════
-- 4. حماية user_roles
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_admin BOOLEAN;
    v_is_tenant_owner BOOLEAN;
    v_is_company_admin BOOLEAN;
    v_target_user_tenant_id UUID;
    v_target_user_company_id UUID;
    v_current_user_tenant_id UUID;
    v_target_role_level INT;
    v_current_user_max_role_level INT;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_is_platform_admin := is_platform_admin(v_current_user_id);
    v_is_tenant_owner := is_tenant_owner(v_current_user_id);
    v_current_user_tenant_id := get_user_tenant_id(v_current_user_id);

    -- Platform Admin يمكنه كل شيء
    IF v_is_platform_admin THEN
        RETURN NEW;
    END IF;

    -- ════════ منع تعديل صلاحيات النفس ════════
    IF NEW.user_id = v_current_user_id THEN
        RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير صلاحياتك بنفسك / Not allowed: You cannot modify your own permissions';
    END IF;

    -- الحصول على بيانات المستخدم المستهدف
    SELECT tenant_id, company_id INTO v_target_user_tenant_id, v_target_user_company_id
    FROM public.user_profiles
    WHERE id = NEW.user_id;

    -- ════════ Tenant Owner: يمكنه تعديل صلاحيات مستخدمي تينانته ════════
    IF v_is_tenant_owner THEN
        IF v_target_user_tenant_id != v_current_user_tenant_id THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تعديل صلاحيات مستخدم خارج تينانتك / Not allowed: You cannot modify permissions of users outside your tenant';
        END IF;
        RETURN NEW;
    END IF;

    -- ════════ Company Admin: يمكنه تعديل صلاحيات مستخدمي شركته فقط ════════
    v_is_company_admin := is_company_admin(v_current_user_id, v_target_user_company_id);
    
    IF v_is_company_admin THEN
        -- التحقق من أن المستخدم المستهدف في نفس الشركة
        IF NOT can_access_company(v_target_user_company_id, v_current_user_id) THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تعديل صلاحيات مستخدم خارج شركتك / Not allowed: You cannot modify permissions of users outside your company';
        END IF;
        
        -- التحقق من عدم منح صلاحيات أعلى من صلاحيات المانح
        -- الحصول على مستوى الدور المستهدف
        SELECT COALESCE(r.level, 100) INTO v_target_role_level
        FROM public.roles r
        WHERE r.id = NEW.role_id;
        
        -- الحصول على أعلى مستوى دور للمستخدم الحالي
        SELECT COALESCE(MIN(r.level), 100) INTO v_current_user_max_role_level
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = v_current_user_id
          AND ur.is_active = true;
        
        IF v_target_role_level < v_current_user_max_role_level THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك منح صلاحيات أعلى من صلاحياتك / Not allowed: You cannot grant permissions higher than your own';
        END IF;
        
        RETURN NEW;
    END IF;

    -- المستخدم العادي لا يمكنه تعديل الصلاحيات
    RAISE EXCEPTION 'غير مسموح: ليس لديك صلاحية تعديل أدوار المستخدمين / Not allowed: You do not have permission to modify user roles';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_roles();

-- ═══════════════════════════════════════════════════════════════
-- 5. تعيين tenant_id تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إذا كان tenant_id فارغاً، عيّنه من المستخدم الحالي
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := get_user_tenant_id();
    END IF;
    
    -- التحقق من أن tenant_id معيّن
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'خطأ: يجب تحديد tenant_id / Error: tenant_id is required';
    END IF;
    
    RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. تعيين company_id تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_set_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إذا كان company_id فارغاً، عيّنه من المستخدم الحالي
    IF NEW.company_id IS NULL THEN
        NEW.company_id := get_user_company_id();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. تعيين product_id/brand_id تلقائياً
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_set_brand_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إذا كان product_id فارغاً، عيّنه من المستخدم الحالي
    IF NEW.product_id IS NULL THEN
        NEW.product_id := get_user_brand_id();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8. منع الوصول عبر البراندات
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_brand_isolation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_admin BOOLEAN;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_is_platform_admin := is_platform_admin(v_current_user_id);
    
    -- Platform Admin يتخطى التحقق
    IF v_is_platform_admin THEN
        RETURN NEW;
    END IF;

    -- التحقق من أن tenant_id ينتمي لنفس براند المستخدم
    IF NEW.tenant_id IS NOT NULL THEN
        IF NOT is_same_brand(NEW.tenant_id, v_current_user_id) THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك إضافة بيانات لتينانت خارج براندك / Not allowed: You cannot add data to a tenant outside your brand';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. حماية super_admins table
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_super_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_owner BOOLEAN;
    v_super_admin_count INT;
BEGIN
    IF v_current_user_id IS NULL THEN
        -- السماح للعمليات النظامية بدون مستخدم (مثل الـ migrations)
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_is_platform_owner := is_platform_owner(v_current_user_id);
    
    -- فقط Platform Owner يمكنه تعديل جدول super_admins
    IF NOT v_is_platform_owner THEN
        RAISE EXCEPTION 'غير مسموح: فقط مالك المنصة يمكنه إدارة مديري المنصة / Not allowed: Only platform owner can manage super admins';
    END IF;

    -- عند الحذف: منع حذف آخر Platform Owner
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*) INTO v_super_admin_count
        FROM public.super_admins
        WHERE is_active = true;
        
        IF v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكن حذف آخر مالك للمنصة / Not allowed: Cannot delete the last platform owner';
        END IF;
        
        RETURN OLD;
    END IF;

    -- عند إلغاء التفعيل: منع إلغاء تفعيل آخر Platform Owner
    IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        SELECT COUNT(*) INTO v_super_admin_count
        FROM public.super_admins
        WHERE is_active = true AND id != OLD.id;
        
        IF v_super_admin_count < 1 THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكن إلغاء تفعيل آخر مالك للمنصة / Not allowed: Cannot deactivate the last platform owner';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admins ON public.super_admins;
CREATE TRIGGER trg_protect_super_admins
    BEFORE INSERT OR UPDATE OR DELETE ON public.super_admins
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_super_admins();

-- ═══════════════════════════════════════════════════════════════
-- 10. حماية partners table
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.protect_partners()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_platform_admin BOOLEAN;
    v_current_user_email TEXT;
BEGIN
    IF v_current_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_is_platform_admin := is_platform_admin(v_current_user_id);
    
    -- Platform Admin يمكنه كل شيء
    IF v_is_platform_admin THEN
        RETURN NEW;
    END IF;

    -- الحصول على بريد المستخدم الحالي
    SELECT email INTO v_current_user_email FROM public.user_profiles WHERE id = v_current_user_id;

    -- عند الإضافة: فقط Platform Admin
    IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'غير مسموح: فقط مدير المنصة يمكنه إنشاء وكلاء / Not allowed: Only platform admin can create partners';
    END IF;

    -- عند التعديل: الوكيل يعدّل بياناته الشخصية فقط
    IF TG_OP = 'UPDATE' THEN
        -- التحقق من أن المستخدم هو الوكيل نفسه
        IF LOWER(OLD.email) != LOWER(v_current_user_email) THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تعديل بيانات وكيل آخر / Not allowed: You cannot modify another partner''s data';
        END IF;
        
        -- الحقول المسموح للوكيل بتعديلها
        -- الحقول غير المسموحة: email, partner_type, commission_rate, is_active
        IF OLD.email IS DISTINCT FROM NEW.email THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير البريد الإلكتروني / Not allowed: You cannot change email';
        END IF;
        IF OLD.partner_type IS DISTINCT FROM NEW.partner_type THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير نوع الوكالة / Not allowed: You cannot change partner type';
        END IF;
        IF OLD.commission_rate IS DISTINCT FROM NEW.commission_rate THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير نسبة العمولة / Not allowed: You cannot change commission rate';
        END IF;
        IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير حالة التفعيل / Not allowed: You cannot change activation status';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partners ON public.partners;
CREATE TRIGGER trg_protect_partners
    BEFORE INSERT OR UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_partners();

-- ═══════════════════════════════════════════════════════════════
-- 11. دالة عامة لتطبيق التريغرات على الجداول
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.apply_auto_tenant_trigger(p_table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- حذف التريغر القديم إن وجد
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_tenant_%I ON public.%I', p_table_name, p_table_name);
    
    -- إنشاء التريغر الجديد
    EXECUTE format('
        CREATE TRIGGER trg_auto_tenant_%I
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_tenant_id()
    ', p_table_name, p_table_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_auto_company_trigger(p_table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_company_%I ON public.%I', p_table_name, p_table_name);
    
    EXECUTE format('
        CREATE TRIGGER trg_auto_company_%I
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.auto_set_company_id()
    ', p_table_name, p_table_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_brand_isolation_trigger(p_table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_brand_isolation_%I ON public.%I', p_table_name, p_table_name);
    
    EXECUTE format('
        CREATE TRIGGER trg_brand_isolation_%I
            BEFORE INSERT OR UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.enforce_brand_isolation()
    ', p_table_name, p_table_name);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 12. تطبيق التريغرات على الجداول الرئيسية
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    v_table TEXT;
    v_tables_with_tenant TEXT[] := ARRAY[
        'branches',
        'chart_of_accounts',
        'journal_entries',
        'journal_entry_lines',
        'fiscal_years',
        'accounting_periods',
        'customers',
        'customer_groups',
        'suppliers',
        'supplier_groups',
        'products',
        'product_categories',
        'warehouses',
        'inventory_movements',
        'sales_invoices',
        'sales_invoice_items',
        'purchase_invoices',
        'purchase_invoice_items',
        'purchase_orders',
        'sales_orders',
        'payment_receipts',
        'payment_vouchers',
        'containers',
        'container_items',
        'fabric_rolls'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables_with_tenant
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'tenant_id'
            ) THEN
                PERFORM public.apply_auto_tenant_trigger(v_table);
                PERFORM public.apply_brand_isolation_trigger(v_table);
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'company_id'
            ) THEN
                PERFORM public.apply_auto_company_trigger(v_table);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 13. تريغر تحديث updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- تطبيق على الجداول الرئيسية
DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'user_profiles',
        'tenants',
        'companies',
        'branches',
        'customers',
        'suppliers',
        'products',
        'warehouses',
        'chart_of_accounts',
        'journal_entries',
        'partners'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'updated_at'
            ) THEN
                EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON public.%I', v_table, v_table);
                EXECUTE format('
                    CREATE TRIGGER trg_update_timestamp_%I
                        BEFORE UPDATE ON public.%I
                        FOR EACH ROW
                        EXECUTE FUNCTION public.update_updated_at()
                ', v_table, v_table);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 14. تريغر منع حذف البيانات المرتبطة
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_delete_if_referenced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- هذه الدالة ستُستخدم للجداول التي لا يجب حذف سجلاتها
    -- إذا كانت مرتبطة بسجلات أخرى
    RAISE EXCEPTION 'غير مسموح: لا يمكن حذف هذا السجل لارتباطه ببيانات أخرى / Not allowed: Cannot delete this record as it is referenced by other data';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 15. تريغر تسجيل التغييرات في audit_log
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_changes JSONB;
BEGIN
    -- تسجيل التغييرات في الجداول الحساسة
    IF TG_OP = 'UPDATE' THEN
        v_changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_changes := to_jsonb(OLD);
    ELSIF TG_OP = 'INSERT' THEN
        v_changes := to_jsonb(NEW);
    END IF;

    -- إدراج في جدول التدقيق إذا كان موجوداً
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            changes,
            created_at
        ) VALUES (
            v_user_id,
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            v_changes,
            NOW()
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- تطبيق على الجداول الحساسة
DO $$ 
DECLARE
    v_table TEXT;
    v_tables TEXT[] := ARRAY[
        'super_admins',
        'user_roles',
        'partners',
        'partner_allowed_products'
    ];
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', v_table, v_table);
            EXECUTE format('
                CREATE TRIGGER trg_audit_%I
                    AFTER INSERT OR UPDATE OR DELETE ON public.%I
                    FOR EACH ROW
                    EXECUTE FUNCTION public.log_sensitive_changes()
            ', v_table, v_table);
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- التحقق من إنشاء التريغرات
-- ═══════════════════════════════════════════════════════════════

SELECT 'تم إنشاء تريغرات الحماية بنجاح!' as result;

-- عرض قائمة التريغرات المُنشأة
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ═══════════════════════════════════════════════════════════════
-- ملخص التريغرات
-- ═══════════════════════════════════════════════════════════════
/*
تم إنشاء التريغرات التالية:

1. trg_protect_user_profiles - حماية حقول user_profiles الحساسة
2. trg_protect_tenants - حماية product_id و owner_email
3. trg_protect_companies - منع نقل الشركة بين التينانتات
4. trg_protect_user_roles - حماية تعديل الصلاحيات
5. trg_auto_tenant_* - تعيين tenant_id تلقائياً
6. trg_auto_company_* - تعيين company_id تلقائياً
7. trg_brand_isolation_* - منع الوصول عبر البراندات
8. trg_protect_super_admins - حماية جدول super_admins
9. trg_protect_partners - حماية جدول الوكلاء
10. trg_update_timestamp_* - تحديث updated_at
11. trg_audit_* - تسجيل التغييرات في الجداول الحساسة
*/

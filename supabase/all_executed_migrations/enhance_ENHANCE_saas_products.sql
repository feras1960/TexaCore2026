-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 تحسينات نظام البراندات (saas_products)
-- تاريخ: 2026-02-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1️⃣ التحقق من RLS وتفعيله
-- ═══════════════════════════════════════════════════════════════════════════

-- تفعيل RLS على saas_products
ALTER TABLE saas_products ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الكل يستطيع رؤية المنتجات النشطة
DROP POLICY IF EXISTS "saas_products_public_read" ON saas_products;
CREATE POLICY "saas_products_public_read" ON saas_products
    FOR SELECT USING (is_active = true);

-- سياسة الكتابة: Super Admin فقط
DROP POLICY IF EXISTS "saas_products_admin_write" ON saas_products;
CREATE POLICY "saas_products_admin_write" ON saas_products
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2️⃣ إضافة أعمدة مفيدة إذا غير موجودة
-- ═══════════════════════════════════════════════════════════════════════════

-- إضافة slug إذا لم يكن موجوداً (code يقوم بنفس الدور)
-- لا حاجة - العمود code يقوم بنفس الدور

-- إضافة secondary_color إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'saas_products' 
        AND column_name = 'secondary_color'
    ) THEN
        ALTER TABLE saas_products ADD COLUMN secondary_color VARCHAR(20);
    END IF;
END $$;

-- إضافة favicon_url إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'saas_products' 
        AND column_name = 'favicon_url'
    ) THEN
        ALTER TABLE saas_products ADD COLUMN favicon_url TEXT;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3️⃣ إنشاء دالة للحصول على البراند الحالي للمستخدم
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_current_user_product_id()
RETURNS UUID AS $$
DECLARE
    v_product_id UUID;
BEGIN
    SELECT t.product_id INTO v_product_id
    FROM user_profiles up
    JOIN tenants t ON up.tenant_id = t.id
    WHERE up.id = auth.uid();
    
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة للحصول على كود البراند
CREATE OR REPLACE FUNCTION get_current_user_product_code()
RETURNS VARCHAR AS $$
DECLARE
    v_code VARCHAR;
BEGIN
    SELECT sp.code INTO v_code
    FROM user_profiles up
    JOIN tenants t ON up.tenant_id = t.id
    JOIN saas_products sp ON t.product_id = sp.id
    WHERE up.id = auth.uid();
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4️⃣ إنشاء View للتقارير
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW saas_products_stats AS
SELECT 
    sp.id,
    sp.code,
    sp.name,
    sp.name_ar,
    sp.domain,
    sp.primary_color,
    sp.is_active,
    COUNT(DISTINCT t.id) as tenant_count,
    COUNT(DISTINCT c.id) as company_count,
    COUNT(DISTINCT up.id) as user_count
FROM saas_products sp
LEFT JOIN tenants t ON t.product_id = sp.id
LEFT JOIN companies c ON c.tenant_id = t.id
LEFT JOIN user_profiles up ON up.tenant_id = t.id
GROUP BY sp.id, sp.code, sp.name, sp.name_ar, sp.domain, sp.primary_color, sp.is_active;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5️⃣ ربط tenants بدون product_id بالبراند الافتراضي (TexaCore)
-- ═══════════════════════════════════════════════════════════════════════════

-- عرض tenants بدون product_id
-- SELECT id, name, code FROM tenants WHERE product_id IS NULL;

-- ربطها بـ TexaCore (يمكن تعديل الاستعلام حسب الحاجة)
-- UPDATE tenants 
-- SET product_id = (SELECT id FROM saas_products WHERE code = 'texacore')
-- WHERE product_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ رسالة النجاح
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم تطبيق تحسينات نظام البراندات بنجاح!';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ RLS مفعل على saas_products';
    RAISE NOTICE '✅ دوال المساعدة تم إنشاؤها';
    RAISE NOTICE '✅ View الإحصائيات جاهز';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

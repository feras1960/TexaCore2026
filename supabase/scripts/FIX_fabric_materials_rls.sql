-- ═══════════════════════════════════════════════════════════════
-- إصلاح سياسات RLS لجدول fabric_materials
-- يعتمد على الدالة get_current_tenant_id_fallback() التي تم إنشاؤها سابقاً
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.fabric_materials ENABLE ROW LEVEL SECURITY;

-- 1. حذف السياسات القديمة المحتملة
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.fabric_materials;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.fabric_materials;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.fabric_materials;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.fabric_materials;
DROP POLICY IF EXISTS "fabric_materials_select_policy" ON public.fabric_materials;
DROP POLICY IF EXISTS "fabric_materials_insert_policy" ON public.fabric_materials;
DROP POLICY IF EXISTS "fabric_materials_update_policy" ON public.fabric_materials;
DROP POLICY IF EXISTS "fabric_materials_delete_policy" ON public.fabric_materials;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.fabric_materials;

-- 2. إنشاء سياسات جديدة مرنة (Select)
CREATE POLICY fabric_materials_select_policy ON public.fabric_materials
    FOR SELECT USING (
        -- السماح للمدراء
        is_platform_admin()
        -- أو المستخدمين التابعين لنفس الـ tenant (سواء من البروفايل أو الـ JWT)
        OR tenant_id = get_current_tenant_id_fallback()
    );

-- 3. سياسة الإضافة (Insert)
CREATE POLICY fabric_materials_insert_policy ON public.fabric_materials
    FOR INSERT WITH CHECK (
        -- السماح للمدراء
        is_platform_admin()
        -- أو أن الـ tenant_id المرسل يطابق الـ tenant الخاص بالمستخدم
        OR tenant_id = get_current_tenant_id_fallback()
    );

-- 4. سياسة التعديل (Update)
CREATE POLICY fabric_materials_update_policy ON public.fabric_materials
    FOR UPDATE USING (
        is_platform_admin()
        OR tenant_id = get_current_tenant_id_fallback()
    );

-- 5. سياسة الحذف (Delete)
CREATE POLICY fabric_materials_delete_policy ON public.fabric_materials
    FOR DELETE USING (
        is_platform_admin()
        OR tenant_id = get_current_tenant_id_fallback()
    );

-- إعادة تفعيل نفس الشيء للجداول المرتبطة مثل fabric_colors و fabric_rolls لتجنب مشاكل مستقبلية
-- (اختياري، لكن مفضل)

-- fabric_colors
ALTER TABLE public.fabric_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fabric_colors_select_policy" ON public.fabric_colors;
CREATE POLICY fabric_colors_select_policy ON public.fabric_colors
    FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

-- fabric_rolls
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fabric_rolls_select_policy" ON public.fabric_rolls;
CREATE POLICY fabric_rolls_select_policy ON public.fabric_rolls
    FOR SELECT USING (is_platform_admin() OR tenant_id = get_current_tenant_id_fallback());

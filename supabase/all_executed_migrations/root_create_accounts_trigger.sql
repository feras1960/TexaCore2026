-- ═══════════════════════════════════════════════════════════════
-- Trigger لإنشاء الحسابات الافتراضية عند إنشاء شركة جديدة
-- ═══════════════════════════════════════════════════════════════

-- Function للـ trigger
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
    -- إنشاء الحسابات الافتراضية للشركة الجديدة
    PERFORM public.create_default_accounts_for_company(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger عند إنشاء شركة جديدة
DROP TRIGGER IF EXISTS on_company_created ON companies;
CREATE TRIGGER on_company_created
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

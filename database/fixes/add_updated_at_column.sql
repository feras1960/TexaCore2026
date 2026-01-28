-- ============================================================================
-- إضافة عمود updated_at لجدول subscription_plans
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '🚀 إضافة عمود updated_at...';
END $$;

-- إضافة عمود updated_at إذا لم يكن موجوداً
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث القيم الحالية
UPDATE subscription_plans 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- إنشاء trigger للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    RAISE NOTICE '✅ تم إضافة عمود updated_at بنجاح!';
    RAISE NOTICE '   • updated_at (TIMESTAMPTZ)';
    RAISE NOTICE '   • Trigger للتحديث التلقائي';
END $$;

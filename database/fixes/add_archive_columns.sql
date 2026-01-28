-- ============================================================================
-- إضافة ميزة الأرشفة للباقات
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '🚀 إضافة أعمدة الأرشفة...';
END $$;

-- إضافة أعمدة الأرشفة إذا لم تكن موجودة
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- إنشاء index للأرشفة
CREATE INDEX IF NOT EXISTS idx_subscription_plans_archived 
ON subscription_plans(is_archived, is_active);

COMMENT ON COLUMN subscription_plans.is_archived IS 'هل الباقة مؤرشفة؟';
COMMENT ON COLUMN subscription_plans.archived_at IS 'تاريخ الأرشفة';

DO $$ BEGIN
    RAISE NOTICE '✅ تم إضافة أعمدة الأرشفة بنجاح!';
    RAISE NOTICE '   • is_archived (BOOLEAN)';
    RAISE NOTICE '   • archived_at (TIMESTAMPTZ)';
    RAISE NOTICE '   • Index للأداء';
END $$;

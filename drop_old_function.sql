-- ═══════════════════════════════════════════════════════════════════════════
-- حذف الدالة القديمة
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_user_allowed_modules(UUID) CASCADE;

-- تأكيد الحذف
SELECT 'Function dropped successfully' as status;

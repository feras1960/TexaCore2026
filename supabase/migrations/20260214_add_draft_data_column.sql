-- ═══════════════════════════════════════════════════════════════
-- إضافة عمود draft_data لدعم حفظ مسودات الاستلام
-- يحفظ بيانات البنود (الرولونات) أثناء عملية الاستلام
-- حتى لو انقطع الإنترنت أو الكهرباء يمكن المتابعة لاحقاً
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE purchase_receipts 
ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT NULL;

COMMENT ON COLUMN purchase_receipts.draft_data IS 
'Stores in-progress receipt items as JSON. Cleared when receipt is completed.';

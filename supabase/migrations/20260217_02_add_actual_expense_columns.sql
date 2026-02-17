-- ═══════════════════════════════════════════════════════════════
-- Migration: إضافة أعمدة المصاريف الفعلية الناقصة لجدول container_expenses
-- Date: 2026-02-17
-- Purpose: دعم المصاريف الفعلية المستقلة مع القيود المحاسبية
-- ═══════════════════════════════════════════════════════════════
-- الأعمدة الموجودة مسبقاً: vendor_account_id, vendor_name, 
--   journal_entry_id, journal_description, container_account_id
-- الأعمدة الناقصة: expense_account_id, tax_rate, tax_amount, 
--   amount_before_tax, is_posted
-- ═══════════════════════════════════════════════════════════════

-- 1. حساب المصروف (الطرف المدين)
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES accounts(id);

COMMENT ON COLUMN container_expenses.expense_account_id IS 'حساب المصروف (الطرف المدين) — للمصاريف الفعلية فقط';

-- 2. أعمدة الضريبة
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_before_tax DECIMAL(15,2);

COMMENT ON COLUMN container_expenses.tax_rate IS 'نسبة الضريبة (%)';
COMMENT ON COLUMN container_expenses.tax_amount IS 'مبلغ الضريبة المحسوب';
COMMENT ON COLUMN container_expenses.amount_before_tax IS 'المبلغ قبل الضريبة — يُستخدم في حساب التكلفة الواصلة';

-- 3. حالة الترحيل
ALTER TABLE container_expenses
ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT false;

COMMENT ON COLUMN container_expenses.is_posted IS 'هل تم ترحيل القيد المحاسبي؟';

-- 4. فهرس لتسريع استعلام المصاريف الفعلية
CREATE INDEX IF NOT EXISTS idx_container_expenses_actual 
ON container_expenses (container_id) 
WHERE expense_account_id IS NOT NULL;

-- تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تمت إضافة الأعمدة الناقصة بنجاح:';
    RAISE NOTICE '  - expense_account_id (حساب المصروف)';
    RAISE NOTICE '  - tax_rate, tax_amount, amount_before_tax (الضريبة)';
    RAISE NOTICE '  - is_posted (حالة الترحيل)';
END $$;

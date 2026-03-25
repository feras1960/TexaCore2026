-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: إضافة عمود supported_currencies إلى company_accounting_settings
-- تاريخ: 2026-02-03
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. إضافة العمود إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_accounting_settings' 
        AND column_name = 'supported_currencies'
    ) THEN
        ALTER TABLE company_accounting_settings 
        ADD COLUMN supported_currencies TEXT[] DEFAULT ARRAY['USD'];
        RAISE NOTICE '✅ Added supported_currencies column';
    ELSE
        RAISE NOTICE '⚠️ supported_currencies column already exists';
    END IF;
END $$;

-- 2. تحديث السجلات الموجودة لإضافة base_currency إلى supported_currencies
UPDATE company_accounting_settings
SET supported_currencies = ARRAY[base_currency]
WHERE supported_currencies IS NULL OR array_length(supported_currencies, 1) IS NULL;

-- 3. التحقق
SELECT 
    count(*) as total_records,
    '✅ Column ready' as status
FROM company_accounting_settings
WHERE supported_currencies IS NOT NULL;

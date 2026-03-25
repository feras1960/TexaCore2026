-- ═══════════════════════════════════════════════════════════════
-- Migration: إضافة أعمدة الضريبة الموزعة لبنود الكونتينر
-- Date: 2026-02-22
-- Purpose: حفظ الضريبة الجمركية الموزعة على كل بند لاستخدامها
--          لاحقاً كضريبة مضافة عند بيع المواد
-- ═══════════════════════════════════════════════════════════════

-- نسبة الضريبة المطبقة على البند (مثلاً 5%)
ALTER TABLE container_items 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;

-- مبلغ الضريبة الموزعة على البند (إجمالي)
ALTER TABLE container_items 
ADD COLUMN IF NOT EXISTS allocated_tax DECIMAL(15,2) DEFAULT 0;

-- مبلغ الضريبة لكل وحدة (للاستخدام عند البيع)
ALTER TABLE container_items 
ADD COLUMN IF NOT EXISTS tax_per_unit DECIMAL(15,4) DEFAULT 0;

-- توثيق
COMMENT ON COLUMN container_items.tax_rate IS 'نسبة الضريبة الجمركية المطبقة (مثل 5% VAT)';
COMMENT ON COLUMN container_items.allocated_tax IS 'إجمالي الضريبة الموزعة على هذا البند';
COMMENT ON COLUMN container_items.tax_per_unit IS 'الضريبة لكل وحدة — تُستخدم كأساس لضريبة المبيعات';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إضافة أعمدة تتبع الضريبة لبنود الكونتينر';
    RAISE NOTICE '  • tax_rate     — نسبة الضريبة (%)';
    RAISE NOTICE '  • allocated_tax — إجمالي الضريبة الموزعة';
    RAISE NOTICE '  • tax_per_unit  — ضريبة الوحدة (للمبيعات)';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

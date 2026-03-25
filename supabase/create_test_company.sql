-- ═══════════════════════════════════════════════════════════════
-- إنشاء شركة تجريبية للاختبار
-- ═══════════════════════════════════════════════════════════════

-- إنشاء شركة تجريبية
INSERT INTO companies (
    code,
    name,
    name_en,
    default_currency,
    fiscal_year_start_month,
    tax_system,
    vat_rate,
    inventory_valuation_method,
    country_code,
    city
)
VALUES (
    'COMP001',
    'شركة تجريبية',
    'Test Company',
    'SAR',
    1,
    'vat_sa',
    15.00,
    'weighted_average',
    'SA',
    'الرياض'
)
ON CONFLICT (code) DO NOTHING
RETURNING id, code, name;

-- عرض الشركة المنشأة
SELECT id, code, name, name_en, default_currency, created_at
FROM companies
WHERE code = 'COMP001';

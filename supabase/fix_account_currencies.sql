-- ═══════════════════════════════════════════════════════════════
-- إصلاح عملات الحسابات الحالية
-- Fix Account Currencies - Update NULL currencies with company base_currency
-- ═══════════════════════════════════════════════════════════════

-- 1) تحديث جميع الحسابات التي عملتها NULL لتأخذ العملة الأساسية للشركة
UPDATE chart_of_accounts AS coa
SET currency = c.default_currency
FROM companies AS c
WHERE coa.company_id = c.id
  AND (coa.currency IS NULL OR coa.currency = '')
  AND c.default_currency IS NOT NULL;

-- 2) التحقق: عدد الحسابات التي تم تحديثها
SELECT 
    c.name_ar AS company_name,
    c.default_currency,
    COUNT(*) AS total_accounts,
    COUNT(coa.currency) AS accounts_with_currency,
    COUNT(*) FILTER (WHERE coa.currency IS NULL) AS accounts_without_currency
FROM chart_of_accounts coa
JOIN companies c ON coa.company_id = c.id
GROUP BY c.name_ar, c.default_currency;

-- ════════════════════════════════════════════════════════════════
-- Dashboard RPCs fix: Currency Exposure + Top Suppliers
-- ════════════════════════════════════════════════════════════════

-- 1. Fix currency exposure to use correct account hierarchy (18% = الأموال الجاهزة)
--    instead of 111%/112% which in this chart of accounts = الأصول الثابتة/المباني
CREATE OR REPLACE FUNCTION get_dashboard_currency_exposure(p_company_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_base_currency text;
  v_cash_parent_code text;
BEGIN
  SELECT base_currency INTO v_base_currency
  FROM company_accounting_settings
  WHERE company_id = p_company_id;

  -- Find the parent account for cash & banks dynamically
  SELECT account_code INTO v_cash_parent_code
  FROM chart_of_accounts
  WHERE company_id = p_company_id
    AND is_detail = false
    AND (
      name_ar LIKE '%أموال جاهزة%'
      OR name_ar LIKE '%الأموال الجاهزة%'
      OR name_ar LIKE '%النقد%'
      OR name_ar LIKE '%صندوق%'
      OR account_code IN ('18', '11')
    )
    AND LENGTH(account_code) <= 2
  ORDER BY
    CASE
      WHEN name_ar LIKE '%أموال جاهزة%' THEN 1
      WHEN name_ar LIKE '%النقد%' THEN 2
      WHEN account_code = '18' THEN 3
      WHEN account_code = '11' THEN 4
      ELSE 5
    END
  LIMIT 1;

  IF v_cash_parent_code IS NULL THEN
    v_cash_parent_code := '18';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'accountCode', a.account_code,
      'accountName', a.name_ar,
      'currency', COALESCE(a.currency, v_base_currency),
      'balance', COALESCE(bal.balance, 0)
    ) ORDER BY a.account_code
  ), '[]'::jsonb)
  INTO v_result
  FROM chart_of_accounts a
  LEFT JOIN (
    SELECT
      jel.account_id,
      SUM(jel.debit - jel.credit) as balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE je.company_id = p_company_id
      AND je.is_posted = true
    GROUP BY jel.account_id
  ) bal ON bal.account_id = a.id
  WHERE a.company_id = p_company_id
    AND a.account_code LIKE v_cash_parent_code || '%'
    AND a.is_detail = true;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. New: Top Suppliers RPC for dashboard
CREATE OR REPLACE FUNCTION get_dashboard_top_suppliers(
  p_company_id uuid,
  p_base_currency text DEFAULT 'USD'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', sub.id,
      'name', sub.name,
      'outstanding', sub.outstanding,
      'currency', p_base_currency
    ) ORDER BY sub.outstanding DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      s.id,
      COALESCE(s.name_ar, s.name_en, 'مورد') as name,
      COALESCE(
        (SELECT SUM(jel.debit - jel.credit)
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.entry_id
         WHERE jel.account_id = s.payable_account_id
           AND je.company_id = p_company_id
           AND je.is_posted = true),
        0
      ) as outstanding
    FROM suppliers s
    WHERE s.company_id = p_company_id
    ORDER BY outstanding DESC
    LIMIT 10
  ) sub
  WHERE sub.outstanding <> 0;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

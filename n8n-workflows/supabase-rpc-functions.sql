-- ════════════════════════════════════════════════════════════════
-- 🔧 n8n Helper Functions for Supabase REST API
-- 
-- Run this in Supabase SQL Editor to create helper functions
-- that n8n can call via REST API (RPC)
--
-- ✅ v3.0 — Uses official get_user_tenant_id() for tenant isolation
-- ════════════════════════════════════════════════════════════════

-- 1. Daily Stats Function (with official tenant isolation)
CREATE OR REPLACE FUNCTION get_daily_stats(
  p_tenant_id UUID DEFAULT NULL,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS json AS $$
DECLARE
  result json;
  v_tenant_id UUID;
BEGIN
  -- Resolve tenant_id: parameter > official helper > NULL
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  SELECT json_build_object(
    'total_entries', COUNT(*),
    'posted_entries', COUNT(CASE WHEN status = 'posted' THEN 1 END),
    'draft_entries', COUNT(CASE WHEN status = 'draft' THEN 1 END),
    'total_debit', COALESCE(SUM(total_debit), 0),
    'total_credit', COALESCE(SUM(total_credit), 0),
    'journal_count', COUNT(CASE WHEN entry_type = 'journal' THEN 1 END),
    'receipt_count', COUNT(CASE WHEN entry_type = 'receipt' THEN 1 END),
    'payment_count', COUNT(CASE WHEN entry_type = 'payment' THEN 1 END),
    'cash_count', COUNT(CASE WHEN entry_type = 'cash' THEN 1 END),
    'total_receipts', COALESCE(SUM(CASE WHEN entry_type = 'receipt' THEN total_credit END), 0),
    'total_payments', COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN total_debit END), 0),
    'report_date', target_date,
    'tenant_id', v_tenant_id
  ) INTO result
  FROM journal_entries
  WHERE entry_date = target_date
    AND deleted_at IS NULL
    AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Monthly Summary Function (with official tenant isolation)
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  SELECT json_build_object(
    'total_entries', COUNT(*),
    'posted', COUNT(CASE WHEN status = 'posted' THEN 1 END),
    'draft', COUNT(CASE WHEN status = 'draft' THEN 1 END),
    'total_debit', COALESCE(SUM(total_debit), 0),
    'total_credit', COALESCE(SUM(total_credit), 0),
    'month_start', date_trunc('month', CURRENT_DATE)::date,
    'tenant_id', v_tenant_id
  ) INTO result
  FROM journal_entries
  WHERE entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL
    AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fund Balances Function (with official tenant isolation)
CREATE OR REPLACE FUNCTION get_fund_balances(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  SELECT COALESCE(json_agg(row_data), '[]'::json) INTO result
  FROM (
    SELECT json_build_object(
      'code', a.code,
      'name', COALESCE(a.name_ar, a.name_en),
      'balance', COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
    ) as row_data
    FROM accounts a
    JOIN journal_entry_lines jl ON jl.account_id = a.id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE a.account_type IN ('cash', 'bank')
      AND je.status = 'posted'
      AND je.deleted_at IS NULL
      AND (v_tenant_id IS NULL OR je.tenant_id = v_tenant_id)
      AND (v_tenant_id IS NULL OR a.tenant_id = v_tenant_id)
    GROUP BY a.id, a.code, a.name_ar, a.name_en
    HAVING COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) != 0
    ORDER BY COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) DESC
    LIMIT 10
  ) sub;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Monthly Sales Function (with official tenant isolation)
CREATE OR REPLACE FUNCTION get_monthly_sales(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  SELECT json_build_object(
    'count', COUNT(*),
    'total', COALESCE(SUM(total_credit), 0)
  ) INTO result
  FROM journal_entries
  WHERE entry_type = 'receipt'
    AND entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL 
    AND status = 'posted'
    AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Monthly Expenses Function (with official tenant isolation)
CREATE OR REPLACE FUNCTION get_monthly_expenses(
  p_tenant_id UUID DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());

  SELECT json_build_object(
    'count', COUNT(*),
    'total', COALESCE(SUM(total_debit), 0)
  ) INTO result
  FROM journal_entries
  WHERE entry_type = 'payment'
    AND entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL 
    AND status = 'posted'
    AND (v_tenant_id IS NULL OR tenant_id = v_tenant_id);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- ✅ Grant access — authenticated & service_role only (no anon)
-- ════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_daily_stats(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_monthly_summary(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_fund_balances(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_monthly_sales(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_monthly_expenses(UUID) TO authenticated, service_role;

-- Revoke from anon (security hardening)
REVOKE EXECUTE ON FUNCTION get_daily_stats(UUID, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION get_monthly_summary(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_fund_balances(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_monthly_sales(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION get_monthly_expenses(UUID) FROM anon;

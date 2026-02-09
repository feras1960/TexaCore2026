-- ════════════════════════════════════════════════════════════════
-- 🔧 n8n Helper Functions for Supabase REST API
-- 
-- Run this in Supabase SQL Editor to create helper functions
-- that n8n can call via REST API (RPC)
-- ════════════════════════════════════════════════════════════════

-- 1. Daily Stats Function
CREATE OR REPLACE FUNCTION get_daily_stats(target_date date DEFAULT CURRENT_DATE)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
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
    'report_date', target_date
  ) INTO result
  FROM journal_entries
  WHERE entry_date = target_date
    AND deleted_at IS NULL;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Monthly Summary Function
CREATE OR REPLACE FUNCTION get_monthly_summary()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_entries', COUNT(*),
    'posted', COUNT(CASE WHEN status = 'posted' THEN 1 END),
    'draft', COUNT(CASE WHEN status = 'draft' THEN 1 END),
    'total_debit', COALESCE(SUM(total_debit), 0),
    'total_credit', COALESCE(SUM(total_credit), 0),
    'month_start', date_trunc('month', CURRENT_DATE)::date
  ) INTO result
  FROM journal_entries
  WHERE entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fund Balances Function
CREATE OR REPLACE FUNCTION get_fund_balances()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
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
    GROUP BY a.id, a.code, a.name_ar, a.name_en
    HAVING COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) != 0
    ORDER BY COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) DESC
    LIMIT 10
  ) sub;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Monthly Sales Function
CREATE OR REPLACE FUNCTION get_monthly_sales()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'count', COUNT(*),
    'total', COALESCE(SUM(total_credit), 0)
  ) INTO result
  FROM journal_entries
  WHERE entry_type = 'receipt'
    AND entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL 
    AND status = 'posted';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Monthly Expenses Function  
CREATE OR REPLACE FUNCTION get_monthly_expenses()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'count', COUNT(*),
    'total', COALESCE(SUM(total_debit), 0)
  ) INTO result
  FROM journal_entries
  WHERE entry_type = 'payment'
    AND entry_date >= date_trunc('month', CURRENT_DATE)
    AND deleted_at IS NULL 
    AND status = 'posted';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- ✅ Grant access to these functions via REST API
-- ════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION get_daily_stats(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_fund_balances() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_sales() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_expenses() TO anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- 🧪 Test the functions
-- ════════════════════════════════════════════════════════════════
SELECT get_daily_stats();
SELECT get_monthly_summary();
SELECT get_fund_balances();

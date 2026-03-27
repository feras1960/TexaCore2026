-- ══════════════════════════════════════════════════════════════════════
-- FIX: Accounting Discrepancy — Journal Entry debiting GROUP account
-- ══════════════════════════════════════════════════════════════════════
-- Root Cause: company_accounting_settings.default_inventory_account_id 
-- pointed to GROUP account 114 (المخزون) instead of leaf account 1142 (مواد خام).
-- This caused JE-1774518692318-0989 to debit the group account, 
-- which is invisible to get_all_account_balances_fc RPC (only returns is_group=false).
-- Result: 3,600 UAH unaccounted → 82.023 USD discrepancy.
-- ══════════════════════════════════════════════════════════════════════

-- ═══ Step 1: Fix the journal entry line — move from GROUP 114 to LEAF 1142 ═══
UPDATE journal_entry_lines
SET account_id = 'e48fa0e3-d6ef-403d-8ba0-71218d08c79e'  -- 1142 مواد خام (LEAF)
WHERE id = 'a0c1cefc-7524-4614-a02b-f4650a2faf82'        -- the problematic line
  AND account_id = '35d10398-ac81-46d0-8d08-c303e717210d'; -- currently pointing to 114 (GROUP)

-- ═══ Step 2: Fix company_accounting_settings — point to LEAF account ═══
UPDATE company_accounting_settings
SET default_inventory_account_id = 'e48fa0e3-d6ef-403d-8ba0-71218d08c79e'  -- 1142 مواد خام
WHERE company_id = '1313232a-6ad3-4002-891c-a9a9e8849a93'
  AND default_inventory_account_id = '35d10398-ac81-46d0-8d08-c303e717210d'; -- was 114 GROUP

-- ═══ Step 3: Verify the fix ═══
SELECT 'VERIFICATION' AS step;

-- A) Journal entry line should now point to 1142
SELECT jel.id, coa.account_code, coa.name_ar, coa.is_group, jel.debit, jel.credit
FROM journal_entry_lines jel
JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE jel.id = 'a0c1cefc-7524-4614-a02b-f4650a2faf82';

-- B) Company settings should now point to leaf account
SELECT cas.default_inventory_account_id, coa.account_code, coa.name_ar, coa.is_group
FROM company_accounting_settings cas
JOIN chart_of_accounts coa ON coa.id = cas.default_inventory_account_id
WHERE cas.company_id = '1313232a-6ad3-4002-891c-a9a9e8849a93';

-- C) Trial balance should now be balanced (all leaf balance_base sums to 0)
SELECT 
  SUM(CASE WHEN bal.balance_base > 0 THEN bal.balance_base ELSE 0 END) AS total_debit,
  SUM(CASE WHEN bal.balance_base < 0 THEN ABS(bal.balance_base) ELSE 0 END) AS total_credit,
  SUM(bal.balance_base) AS net_diff,
  CASE WHEN ABS(SUM(bal.balance_base)) < 0.02 THEN '✅ BALANCED' ELSE '❌ STILL UNBALANCED' END AS status
FROM get_all_account_balances_fc('1313232a-6ad3-4002-891c-a9a9e8849a93') bal;

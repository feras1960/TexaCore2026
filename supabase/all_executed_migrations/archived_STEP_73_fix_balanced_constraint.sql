
-- Fix chk_balanced_entry to allow drafts to be unbalanced
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_balanced_entry;

ALTER TABLE journal_entries
  ADD CONSTRAINT chk_balanced_entry 
  CHECK (status != 'posted' OR abs(total_debit - total_credit) < 0.01);

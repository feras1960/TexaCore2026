-- Function to check if journal entry is balanced
create or replace function check_journal_entry_balance()
returns trigger as $$
declare
  total_debit decimal;
  total_credit decimal;
begin
  -- Only check if status is changing to POSTED
  if NEW.status = 'POSTED' and (OLD.status IS DISTINCT FROM 'POSTED') then
    
    -- Calculate totals from lines
    select 
      coalesce(sum(debit), 0), 
      coalesce(sum(credit), 0)
    into 
      total_debit, 
      total_credit
    from journal_entry_lines
    where entry_id = NEW.id;

    -- Check if balanced (allow small precision diff if needed, but strict for now)
    if total_debit != total_credit then
      raise exception 'Journal Entry must be balanced to post. Total Debit: %, Total Credit: %', total_debit, total_credit;
    end if;

    -- Also check if there are no lines
    if total_debit = 0 and total_credit = 0 then
       -- Optional: Decide if 0-value postings allowed. Usually no.
       -- Check if lines exist count
       if not exists (select 1 from journal_entry_lines where entry_id = NEW.id) then
          raise exception 'Cannot post Journal Entry with no lines.';
       end if;
    end if;

  end if;

  return NEW;
end;
$$ language plpgsql;

-- Create Trigger
drop trigger if exists ensure_journal_entry_balanced on journal_entries;

create trigger ensure_journal_entry_balanced
before update on journal_entries
for each row
execute function check_journal_entry_balance();

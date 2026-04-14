/**
 * One-time fix: Link existing opening balance inventory_movements
 * to their correct journal_entries via reference_id.
 * 
 * Run: node scripts/fix-movement-journal-link.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function fix() {
  console.log('🔍 Finding opening balance movements without reference_id...');
  
  // 1. Find movements that need fixing
  const { data: movements, error: mErr } = await supabase
    .from('inventory_movements')
    .select('id, company_id, reference_type, reference_number, reference_id')
    .eq('reference_type', 'opening_balance')
    .is('reference_id', null)
    .limit(500);

  if (mErr) {
    console.error('❌ Error fetching movements:', mErr.message);
    return;
  }

  if (!movements || movements.length === 0) {
    console.log('✅ No movements need fixing.');
    return;
  }

  console.log(`📦 Found ${movements.length} movements without journal link`);

  // 2. Get unique company IDs
  const companyIds = [...new Set(movements.map(m => m.company_id))];
  
  for (const compId of companyIds) {
    // 3. Find PROD journal entries for this company
    const { data: journals } = await supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date')
      .eq('company_id', compId)
      .eq('entry_type', 'opening_balance')
      .eq('reference_type', 'import')
      .order('entry_date', { ascending: false });

    if (!journals || journals.length === 0) {
      console.log(`⚠️ No opening balance journals found for company ${compId}`);
      continue;
    }

    // Find the PROD journal (not SUPP/CUST)
    const prodJournal = journals.find(j => 
      j.entry_number?.includes('PROD') || j.entry_number?.includes('MAT')
    ) || journals.find(j => 
      !j.entry_number?.includes('SUPP') && !j.entry_number?.includes('CUST')
    );

    if (!prodJournal) {
      console.log(`⚠️ No PROD journal found for company ${compId}`);
      continue;
    }

    console.log(`🔗 Linking to journal: ${prodJournal.entry_number} (${prodJournal.id})`);

    // 4. Update movements for this company
    const compMovIds = movements
      .filter(m => m.company_id === compId)
      .map(m => m.id);

    const batchSize = 50;
    let updated = 0;
    for (let i = 0; i < compMovIds.length; i += batchSize) {
      const batch = compMovIds.slice(i, i + batchSize);
      const { error: updateErr } = await supabase
        .from('inventory_movements')
        .update({ reference_id: prodJournal.id })
        .in('id', batch);

      if (updateErr) {
        console.error(`❌ Update error:`, updateErr.message);
      } else {
        updated += batch.length;
      }
    }

    console.log(`✅ Updated ${updated} movements for company ${compId}`);
  }

  console.log('🎉 Done!');
}

fix().catch(console.error);

#!/usr/bin/env node
/**
 * 🔧 FIX v3 — Simple & Direct: Void orphaned entries + fix balance
 */

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    'https://wzkklenfsaepegymfxfz.supabase.co',
    'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN',
    { auth: { persistSession: false } }
);

const ACCOUNT_ID = '159a3f36-0f0c-48ac-b510-59fd990743f0';

function sep(t) { console.log('\n' + '═'.repeat(60)); console.log(t); }

async function main() {
    const { data: auth } = await supabase.auth.signInWithPassword({ email: 'feras1960@gmail.com', password: 'bF8ayJJuFw' });
    console.log('✅ Signed in:', auth?.user?.id);

    // ─── Step 1: Void all orphaned entries (posted GRNs for deleted receipts) ─
    sep('🚫 STEP 1: Void orphaned entries');

    // Also void any REV- entries created from previous failed attempts (no lines)
    const orphanNumbers = [
        'JE-GRN-20260219-C3A4',
        'JE-GRN-20260219-D4PG',
        'REV-JE-GRN-20260219-C3A4',  // from previous failed attempt
        'REV-JE-GRN-20260219-D4PG',  // from previous failed attempt
    ];

    const { data: toVoid } = await supabase
        .from('journal_entries')
        .select('id, entry_number, status')
        .in('entry_number', orphanNumbers);

    console.log(`\nFound ${toVoid?.length} entries to void:`);
    toVoid?.forEach(e => console.log(`  ${e.entry_number} [${e.status}]`));

    for (const entry of (toVoid || [])) {
        const { error } = await supabase
            .from('journal_entries')
            .update({
                status: 'voided',
                description: `[VOIDED - يتيم من استلام محذوف] ${entry.entry_number}`,
                notes: `Auto-voided by fix_orphaned script on ${new Date().toISOString()}`,
            })
            .eq('id', entry.id);

        if (error) console.error(`  ❌ ${entry.entry_number}:`, error.message);
        else console.log(`  ✅ Voided: ${entry.entry_number}`);
    }

    // ─── Step 2: Recalculate balance from POSTED entries only ─────────────────
    sep('📊 STEP 2: Recalculate balance (posted entries only)');

    const { data: allLines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit, entry_id')
        .eq('account_id', ACCOUNT_ID);

    const entryIds = [...new Set(allLines?.map(l => l.entry_id).filter(Boolean))];
    const { data: postedEntries } = await supabase
        .from('journal_entries')
        .select('id, entry_number, entry_date, status, description')
        .in('id', entryIds)
        .eq('status', 'posted');

    const postedIds = new Set(postedEntries?.map(e => e.id));

    let totalDr = 0, totalCr = 0;
    allLines?.forEach(l => {
        if (postedIds.has(l.entry_id)) {
            totalDr += Number(l.debit || 0);
            totalCr += Number(l.credit || 0);
        }
    });
    const net = totalDr - totalCr;

    console.log('\n  POSTED entries affecting this account:');
    postedEntries?.forEach(e => console.log(`    ${e.entry_number} | ${e.status} | ${e.entry_date} | ${e.description?.substring(0, 50)}`));
    console.log(`\n  Total Debit:  ${totalDr.toFixed(2)}`);
    console.log(`  Total Credit: ${totalCr.toFixed(2)}`);
    console.log(`  NET Balance:  ${net.toFixed(2)}`);

    // ─── Step 3: Determine correct balance ───────────────────────────────────
    sep('🧮 STEP 3: Business Logic Analysis');

    // The container is 'received' — the receipt (OEQT) credited 32,200
    // But only 22,650 was debited (expenses) — missing the FOB goods posting (18,600)
    // So theoretical correct balance = 22,650 + 18,600(missing) - 32,200 = 9,050 Dr
    // BUT since FOB was NEVER posted, the container is over-credited.
    // 
    // We have two options:
    // A) Add the missing FOB debit: Dr 18,600 Container / Cr AP (correct the past error)
    // B) Accept the status quo and post a correcting entry

    const missingFOB = 18600;
    const validExpenses = 22650;
    const validGRNCredit = 32200;
    const theoreticalBalance = validExpenses + missingFOB - validGRNCredit;

    console.log(`\n  FOB Goods posted to container:  MISSING (should be 18,600)`);
    console.log(`  Expenses debited to container:  ${validExpenses}`);
    console.log(`  Valid GRN credit (OEQT):        ${validGRNCredit}`);
    console.log(`  Current net (post-void):        ${net.toFixed(2)}`);
    console.log(`  Theoretical correct net:        ${theoreticalBalance} (if FOB had been posted)`);

    // ─── Step 4: Update current_balance ──────────────────────────────────────
    sep('💾 STEP 4: Update current_balance in COA');

    const { error: bErr } = await supabase
        .from('chart_of_accounts')
        .update({ current_balance: net, updated_at: new Date().toISOString() })
        .eq('id', ACCOUNT_ID);

    if (bErr) console.error('❌ Update failed:', bErr.message);
    else console.log(`  ✅ current_balance → ${net.toFixed(2)}`);

    // ─── Step 5: Summary ─────────────────────────────────────────────────────
    sep('📋 FINAL SUMMARY');
    console.log(`
  Container Account MSKU9988776 (11432):
  ─────────────────────────────────────
  Status before fix:   15,000.00  (frozen - trigger failed)
  Status after fix:    ${net.toFixed(2)} (recalculated from posted entries)
  
  Voided ${toVoid?.length} orphaned entries ✅
  
  ⚠️  REMAINING ISSUE:
  The container account still shows ${net.toFixed(2)} because the
  initial FOB goods purchase (18,600) was never posted as:
     Dr. Container Account  +18,600
     Cr. AP (Supplier)      -18,600
  
  This is a SEPARATE fix needed in the invoice posting workflow.
  
  👉 Next action: Fix invoice posting to debit container account
                 (src/features/purchases/services/invoiceService.ts)
  `);
}

main().catch(console.error);

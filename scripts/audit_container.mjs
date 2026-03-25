#!/usr/bin/env node
/**
 * 🔍 Container Full Audit v2 — با أعمدة صحيحة
 */
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wzkklenfsaepegymfxfz.supabase.co', 'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN', { auth: { persistSession: false } });

const CONTAINER_ID = '517da98b-d2cd-432d-8fbc-39e4c907a418';
const ACCOUNT_ID = '159a3f36-0f0c-48ac-b510-59fd990743f0';

function sep(t) { console.log('\n' + '═'.repeat(60)); console.log(t); }

async function main() {
    await supabase.auth.signInWithPassword({ email: 'feras1960@gmail.com', password: 'bF8ayJJuFw' });
    console.log('✅ Signed in\n');

    // 1. COA Account (with correct column names)
    sep('📊 [1] COA Account (جميع الأعمدة)');
    const { data: acct, error: aErr } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('id', ACCOUNT_ID)
        .single();
    if (aErr) console.error('❌', aErr.message);
    else {
        console.log('Account data:');
        Object.entries(acct || {}).forEach(([k, v]) => { if (v !== null && v !== undefined) console.log(`  ${k}: ${v}`); });
    }

    // 2. Container items (discover columns)
    sep('🧵 [2] Container Items');
    const { data: items, error: iErr } = await supabase
        .from('container_items')
        .select('*')
        .eq('container_id', CONTAINER_ID);
    if (iErr) console.error('❌', iErr.message);
    else if (!items?.length) {
        console.log('⚠️  No items found — trying alternative column name...');
        const { data: items2 } = await supabase.from('container_items').select('*').limit(3);
        if (items2?.length) {
            console.log('Sample columns:', Object.keys(items2[0]));
        }
    } else {
        items.forEach((it, i) => console.log(`  Item ${i}: qty=${it.quantity || it.expected_quantity}, unit_cost=${it.unit_cost}, final=${it.final_unit_cost}, total=${it.total_amount || it.subtotal}`));
        const fob = items.reduce((s, i) => s + (Number(i.unit_cost || 0) * Number(i.quantity || i.expected_quantity || 0)), 0);
        console.log(`  → FOB Total: ${fob.toFixed(2)}`);
    }

    // 3. Journal entries linked to container
    sep('📒 [3] Journal Entries linked to container');
    const { data: jes, error: jErr } = await supabase
        .from('journal_entries')
        .select('*')
        .or(`reference_id.eq.${CONTAINER_ID},entity_id.eq.${CONTAINER_ID},source_id.eq.${CONTAINER_ID}`);
    if (jErr) {
        console.error('❌ Error by reference_id:', jErr.message);
        // try description search
        const { data: jes2, error: jErr2 } = await supabase
            .from('journal_entries')
            .select('id, entry_number, entry_date, description, status, total_debit, total_credit')
            .ilike('description', '%MSKU9988776%');
        if (jErr2) console.error('❌', jErr2.message);
        else { console.log('Found by description:'); jes2?.forEach(j => console.log(`  ${j.entry_number} | ${j.entry_date} | ${j.status} | Dr:${j.total_debit} | Cr:${j.total_credit} | ${j.description}`)); }
    } else {
        jes?.forEach(j => console.log(`  ${j.entry_number} | ${j.entry_date} | ${j.status} | ${j.description}`));
    }

    // 4. All journal entry lines for this account
    sep('📒 [4] Journal Lines for Account 159a3f36...');
    // Try different column names for journal_entry reference
    const { data: lines1, error: lErr1 } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('account_id', ACCOUNT_ID)
        .limit(20);
    if (lErr1) {
        console.error('❌ by account_id:', lErr1.message);
        // try other column name
        const { data: lines2, error: lErr2 } = await supabase
            .from('journal_entry_lines')
            .select('*')
            .limit(1);
        if (lines2?.length) {
            console.log('Journal line columns:', Object.keys(lines2[0]));
        }
    } else if (!lines1?.length) {
        console.log('⚠️  No lines found for this account');
        const { data: sample } = await supabase.from('journal_entry_lines').select('*').limit(2);
        if (sample?.length) console.log('Sample columns:', Object.keys(sample[0]));
    } else {
        // Get the entry ID column name
        const sampleLine = lines1[0];
        const entryIdCol = Object.keys(sampleLine).find(k => k.includes('entry') && k.includes('id'));
        console.log(`Entry ref column: "${entryIdCol}"`);

        const entryIds = [...new Set(lines1.map(l => l[entryIdCol]).filter(Boolean))];
        const { data: entries } = await supabase.from('journal_entries').select('id,entry_number,entry_date,description,status').in('id', entryIds);
        const eMap = {};
        entries?.forEach(e => eMap[e.id] = e);

        let totalDr = 0, totalCr = 0;
        console.log('\n  Entry#           | Date       | Dr          | Cr          | Description');
        console.log('  ─────────────────┼────────────┼─────────────┼─────────────┼─────────────────');
        lines1.forEach(l => {
            const e = eMap[l[entryIdCol]] || {};
            const dr = Number(l.debit || 0);
            const cr = Number(l.credit || 0);
            totalDr += dr; totalCr += cr;
            console.log(`  ${(e.entry_number || '?').padEnd(16)} | ${(e.entry_date || '').padEnd(10)} | ${dr.toFixed(2).padStart(11)} | ${cr.toFixed(2).padStart(11)} | ${l.description || e.description || ''}`);
        });
        console.log('  ─────────────────┴────────────┴─────────────┴─────────────┴─────────────────');
        const net = totalDr - totalCr;
        console.log(`\n  Total Dr: ${totalDr.toFixed(2)}`);
        console.log(`  Total Cr: ${totalCr.toFixed(2)}`);
        console.log(`  NET:      ${net.toFixed(2)} ${Math.abs(net) < 0.01 ? '✅ BALANCED' : '⚠️ UNBALANCED'}`);
    }

    // 5. Purchase receipts
    sep('🧾 [5] Purchase Receipts for Container');
    const { data: recs, error: rErr } = await supabase
        .from('purchase_receipts')
        .select('receipt_number, status, total_amount, created_at')
        .eq('container_id', CONTAINER_ID);
    if (rErr) {
        console.error('❌', rErr.message);
        const { data: s } = await supabase.from('purchase_receipts').select('*').limit(1);
        if (s?.length) console.log('Columns:', Object.keys(s[0]));
    } else if (!recs?.length) {
        // try with source_id
        const { data: recs2 } = await supabase.from('purchase_receipts').select('receipt_number,status,created_at').eq('source_id', CONTAINER_ID);
        if (recs2?.length) recs2.forEach(r => console.log(`  ${r.receipt_number} [${r.status}] ${r.created_at?.split('T')[0]}`));
        else console.log('  No purchase receipts found at all!');
    } else {
        recs.forEach(r => console.log(`  ${r.receipt_number} [${r.status}] Amt:${r.total_amount} ${r.created_at?.split('T')[0]}`));
    }

    // 6. Fabric rolls linked to this container
    sep('🎫 [6] Fabric Rolls in this container');
    const { data: rolls, error: rErr2 } = await supabase
        .from('fabric_rolls')
        .select('roll_number, status, current_length, initial_length, cost_per_meter, cost_status, warehouse_id')
        .eq('container_id', CONTAINER_ID);
    if (rErr2) console.error('❌', rErr2.message);
    else {
        console.log(`  Found ${rolls?.length || 0} rolls`);
        const totalLen = rolls?.reduce((s, r) => s + Number(r.current_length || 0), 0) || 0;
        const avgCost = rolls?.length ? rolls.reduce((s, r) => s + Number(r.cost_per_meter || 0), 0) / rolls.length : 0;
        rolls?.slice(0, 5).forEach(r => console.log(`  ${r.roll_number} | ${r.current_length}m | cost:${r.cost_per_meter} | ${r.cost_status} | ${r.status}`));
        if ((rolls?.length || 0) > 5) console.log(`  ... and ${(rolls?.length || 0) - 5} more rolls`);
        console.log(`\n  Total Length: ${totalLen}m | Avg Cost/m: ${avgCost.toFixed(4)}`);
    }

    // 7. Inventory movements
    sep('📦 [7] Inventory Movements');
    const { data: movs, error: mErr } = await supabase
        .from('inventory_movements')
        .select('movement_type, quantity, unit_cost, total_cost, created_at, reference_number')
        .eq('container_id', CONTAINER_ID);
    if (mErr) console.error('❌', mErr.message);
    else {
        console.log(`  Found ${movs?.length || 0} movements`);
        movs?.forEach(m => console.log(`  ${m.movement_type} | qty:${m.quantity} | cost:${m.unit_cost} | total:${m.total_cost} | ref:${m.reference_number}`));
    }

    sep('=== FINAL ANALYSIS ===');
    const { data: acctFinal } = await supabase.from('chart_of_accounts').select('current_balance').eq('id', ACCOUNT_ID).single();
    console.log(`  Container Account current_balance: ${acctFinal?.current_balance}`);
    console.log(`  Container status: ${CONTAINER_ID ? 'received' : 'unknown'}`);
}

main().catch(console.error);

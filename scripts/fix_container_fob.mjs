#!/usr/bin/env node
/**
 * 🔧 FIX Part 2: Add missing FOB journal entry for container MSKU9988776
 * المشكلة: لم يتم تسجيل قيمة البضاعة (FOB = 18,600) على حساب الكونتينر
 * الحل: إنشاء قيد تصحيحي Dr Container / Cr AP
 */

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    'https://wzkklenfsaepegymfxfz.supabase.co',
    'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN',
    { auth: { persistSession: false } }
);

const CONTAINER_ID = '517da98b-d2cd-432d-8fbc-39e4c907a418';
const ACCOUNT_ID = '159a3f36-0f0c-48ac-b510-59fd990743f0'; // MSKU9988776
const FOB_AMOUNT = 18600; // من container_items (5000×1.7 + 3000×1.7 + 2000×2.5)

function sep(t) { console.log('\n' + '═'.repeat(60)); console.log(t); }

async function main() {
    const { data: auth } = await supabase.auth.signInWithPassword({ email: 'feras1960@gmail.com', password: 'bF8ayJJuFw' });
    const userId = auth?.user?.id;
    console.log('✅ Signed in:', userId);

    // ─── Get container + company info ─────────────────────────────────
    sep('📦 Container Info');
    const { data: container } = await supabase
        .from('containers')
        .select('id, container_number, container_account_id, tenant_id, company_id, supplier_id')
        .eq('id', CONTAINER_ID).single();

    console.log(`  Container: ${container?.container_number}`);
    console.log(`  Tenant: ${container?.tenant_id}`);
    console.log(`  Company: ${container?.company_id}`);
    console.log(`  Supplier: ${container?.supplier_id}`);

    // ─── Find AP Account (ذمم دائنة) ─────────────────────────────────
    sep('🔍 Find AP Account for supplier');
    // find payable account
    let apAccountId = null;
    // try supplier's payable account
    if (container?.supplier_id) {
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('id, payable_account_id, name_ar')
            .eq('id', container.supplier_id).single();

        apAccountId = supplier?.payable_account_id;
        console.log(`  Supplier: ${supplier?.name_ar} | Payable Account: ${apAccountId || 'NOT SET'}`);
    }

    if (!apAccountId) {
        // fallback to company AP account
        const { data: apAcct } = await supabase
            .from('chart_of_accounts')
            .select('id, account_code, name_ar')
            .eq('company_id', container?.company_id)
            .eq('is_payable', true)
            .eq('is_group', false)
            .limit(1).single();

        apAccountId = apAcct?.id;
        console.log(`  Using company AP fallback: ${apAcct?.account_code} - ${apAcct?.name_ar}`);
    }

    if (!apAccountId) {
        console.error('❌ Cannot find AP account! Manual fix required.');
        console.log('   Please find the payable account and run manually.');
        return;
    }

    // ─── Check if FOB entry already exists ────────────────────────────
    sep('🔍 Check if FOB correcting entry already exists');
    const { data: existing } = await supabase
        .from('journal_entries')
        .select('id, entry_number')
        .ilike('entry_number', '%CORR-FOB-MSKU9988776%');

    if (existing?.length) {
        console.log('⚠️  FOB correcting entry already exists:', existing.map(e => e.entry_number).join(', '));
        console.log('    Skipping creation.');
    } else {
        // ─── Create correcting entry ────────────────────────────────────
        sep('✏️  Create FOB Correcting Journal Entry');

        const entryNumber = `CORR-FOB-MSKU9988776-${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];

        const { data: newEntry, error: jeErr } = await supabase
            .from('journal_entries')
            .insert({
                tenant_id: container.tenant_id,
                company_id: container.company_id,
                entry_number: entryNumber,
                entry_date: '2026-02-17', // تاريخ الشراء الأصلي
                description: `تصحيح: رسملة قيمة بضاعة الكونتينر MSKU9988776 (FOB ${FOB_AMOUNT} USD)`,
                status: 'posted',
                total_debit: FOB_AMOUNT,
                total_credit: FOB_AMOUNT,
                created_by: userId,
                notes: `Correcting entry: FOB goods value missing from container account. Container: ${CONTAINER_ID}`,
                reference_number: container.container_number,
            })
            .select('id').single();

        if (jeErr || !newEntry) {
            console.error('❌ Failed to create journal entry:', jeErr?.message);
            return;
        }
        console.log(`  ✅ Entry created: ${entryNumber} (${newEntry.id})`);

        // ─── Create journal entry lines ──────────────────────────────────
        const lines = [
            {
                tenant_id: container.tenant_id,
                entry_id: newEntry.id,
                account_id: ACCOUNT_ID,            // Dr. Container Account (MSKU9988776)
                debit: FOB_AMOUNT,
                credit: 0,
                currency: 'USD',
                exchange_rate: 1,
                description: `بضاعة كونتينر MSKU9988776 - قيمة FOB`,
                party_type: 'supplier',
                party_id: container.supplier_id,
            },
            {
                tenant_id: container.tenant_id,
                entry_id: newEntry.id,
                account_id: apAccountId,           // Cr. AP (Supplier)
                debit: 0,
                credit: FOB_AMOUNT,
                currency: 'USD',
                exchange_rate: 1,
                description: `ذمم دائنة - كونتينر MSKU9988776`,
                party_type: 'supplier',
                party_id: container.supplier_id,
            },
        ];

        const { error: lErr } = await supabase.from('journal_entry_lines').insert(lines);
        if (lErr) {
            console.error('❌ Failed to insert lines:', lErr.message);
            // Try without optional fields
            const simpleLines = lines.map(l => ({
                tenant_id: l.tenant_id,
                entry_id: l.entry_id,
                account_id: l.account_id,
                debit: l.debit,
                credit: l.credit,
                currency: l.currency || 'USD',
                exchange_rate: l.exchange_rate || 1,
                description: l.description,
            }));
            const { error: lErr2 } = await supabase.from('journal_entry_lines').insert(simpleLines);
            if (lErr2) console.error('❌ Simplified insert also failed:', lErr2.message);
            else console.log('  ✅ Lines inserted (simplified)');
        } else {
            console.log('  ✅ 2 journal lines inserted (Dr Container + Cr AP)');
        }
    }

    // ─── Recalculate final balance ─────────────────────────────────────
    sep('📊 Final Balance Calculation');

    const { data: allLines } = await supabase
        .from('journal_entry_lines').select('debit, credit, entry_id').eq('account_id', ACCOUNT_ID);
    const eIds = [...new Set(allLines?.map(l => l.entry_id).filter(Boolean))];
    const { data: pe } = await supabase.from('journal_entries').select('id, entry_number, entry_date, status').in('id', eIds).eq('status', 'posted');
    const pSet = new Set(pe?.map(e => e.id));

    let dr = 0, cr = 0;
    allLines?.forEach(l => { if (pSet.has(l.entry_id)) { dr += Number(l.debit || 0); cr += Number(l.credit || 0); } });
    const net = dr - cr;

    console.log('\n  Active Posted Entries:');
    pe?.forEach(e => console.log(`    ${e.entry_number} | ${e.entry_date}`));
    console.log(`\n  Total Dr: ${dr.toFixed(2)}`);
    console.log(`  Total Cr: ${cr.toFixed(2)}`);
    console.log(`  NET:      ${net.toFixed(2)}`);

    const msg = net > 100 ? '⚠️  Debit balance (goods not fully received)' :
        Math.abs(net) <= 100 ? '✅ Container account BALANCED (≈ zero)' :
            '⚠️  Credit balance (over-credited)';
    console.log(`  → ${msg}`);

    // Update COA
    await supabase.from('chart_of_accounts')
        .update({ current_balance: net, updated_at: new Date().toISOString() })
        .eq('id', ACCOUNT_ID);
    console.log(`\n  ✅ COA current_balance updated to: ${net.toFixed(2)}`);

    sep('✅ ALL DONE');
    console.log(`
  BEFORE: 15,000 (wrong — trigger frozen)
  AFTER:  ${net.toFixed(2)} (correct — from posted journal lines)
  
  Expected for fully-received container: ~0 or small variance
  Actual: ${net.toFixed(2)}
  ${Math.abs(net) > 100 ? `\n  ⚠️  Variance of ${net.toFixed(2)} — may indicate GRN amount mismatch` : '  ✅ No significant variance'}
  `);
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://wzkklenfsaepegymfxfz.supabase.co',
    'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN'
);

async function checkEquity() {
    await supabase.auth.signInWithPassword({
        email: 'feras1960@gmail.com',
        password: 'bF8ayJJuFw',
    });

    // Get the company ID for TexaCore
    const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .limit(10);

    console.log('Companies:');
    for (const c of (companies || [])) {
        console.log(`  ${c.id} — ${c.name}`);
    }

    // Get all accounts under code 3 (equity)
    const { data: equityAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, name_ar, name_en, is_group, parent_id, current_balance, level, account_type_id, company_id')
        .like('account_code', '3%')
        .order('account_code');

    console.log('\n=== حقوق الملكية (3xx) ===');
    for (const a of (equityAccounts || [])) {
        const indent = '  '.repeat(a.level || 0);
        console.log(`${indent}${a.account_code} ${a.name_ar} [${a.is_group ? 'GROUP' : 'LEAF'}] balance=${a.current_balance} company=${a.company_id}`);
    }

    // Check account_types for equity
    const { data: types } = await supabase
        .from('account_types')
        .select('id, code, name_ar, normal_balance')
        .in('code', ['EQUITY', 'CAPITAL', 'RETAINED_EARNINGS', 'RESERVE']);

    console.log('\n=== Account Types (Equity) ===');
    for (const t of (types || [])) {
        console.log(`  ${t.code} — ${t.name_ar} (${t.normal_balance}) [${t.id}]`);
    }

    // Check if partners table exists
    const { data: tables } = await supabase.rpc('execute_report', {
        report_type: 'custom',
        p_company_id: companies?.[0]?.id,
        p_params: {}
    }).catch(() => ({ data: null }));

    // Check partners or shareholders table
    const { data: partnerTest, error: pErr } = await supabase
        .from('partners')
        .select('id')
        .limit(1);
    console.log('\npartners table exists?', pErr ? `No (${pErr.code})` : 'Yes');

    const { data: shareholderTest, error: sErr } = await supabase
        .from('shareholders')
        .select('id')
        .limit(1);
    console.log('shareholders table exists?', sErr ? `No (${sErr.code})` : 'Yes');

    // Get the main company ID we're working with
    const { data: mainAccounts } = await supabase
        .from('chart_of_accounts')
        .select('company_id')
        .eq('account_code', '1')
        .limit(5);

    console.log('\nCompany IDs with account code "1":');
    for (const a of (mainAccounts || [])) {
        console.log(`  ${a.company_id}`);
    }

    process.exit(0);
}

checkEquity();

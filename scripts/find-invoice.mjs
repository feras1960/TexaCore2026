/**
 * Search for invoice across tables (without stage column)
 */

const SUPABASE_URL = 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN';
const INVOICE_ID = '0af7c63c-73e8-4495-8612-d0cdf5def18b';

const TABLES = [
    { name: 'sales_transactions', select: 'id,stage,is_posted' },
    { name: 'sales_invoices', select: 'id,status' },
    { name: 'sales_orders', select: 'id,status' },
    { name: 'quotations', select: 'id,status' },
    { name: 'purchase_transactions', select: 'id,stage,is_posted' },
    { name: 'purchase_invoices', select: 'id,status' },
];

async function searchTable({ name, select }) {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${name}?id=eq.${INVOICE_ID}&select=${select}`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
            }
        );
        const text = await res.text();
        if (res.ok) {
            const data = JSON.parse(text);
            if (data.length > 0) {
                console.log(`✅ FOUND in ${name}:`, JSON.stringify(data[0]));
                return true;
            } else {
                console.log(`⬜ ${name}: empty (table exists, no match)`);
            }
        } else {
            console.log(`⚠️ ${name}: ${res.status} → ${text.substring(0, 100)}`);
        }
    } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
    }
    return false;
}

// Also try just id select
async function searchTableIdOnly(name) {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${name}?id=eq.${INVOICE_ID}&select=id`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                }
            }
        );
        if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
                console.log(`  🎯 ${name} (id-only): FOUND!`);
                return true;
            }
        }
    } catch { }
    return false;
}

async function main() {
    console.log(`Searching for invoice ${INVOICE_ID}...\n`);

    let found = false;
    for (const t of TABLES) {
        found = await searchTable(t);
        if (found) break;
        // If column error, try id-only
        found = await searchTableIdOnly(t.name);
        if (found) break;
    }

    if (!found) {
        console.log('\n❌ Invoice not found in any table');
    }
}

main().catch(console.error);

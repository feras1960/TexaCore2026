/**
 * Fix Invoice Stage — Reset invoice 0af7c63c to 'draft'
 * 
 * Run: node scripts/fix-invoice-stage.mjs
 * 
 * This script uses the Supabase REST API directly to update the invoice stage.
 */

const SUPABASE_URL = 'https://wzkklenfsaepegymfxfz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN';
const INVOICE_ID = '0af7c63c-73e8-4495-8612-d0cdf5def18b';

async function main() {
    // First, check current state
    console.log('📋 Checking current invoice state...');
    const getRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sales_transactions?id=eq.${INVOICE_ID}&select=id,stage,invoice_no,is_posted,posted_at`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            }
        }
    );

    if (!getRes.ok) {
        console.error('❌ Failed to fetch invoice:', getRes.status, await getRes.text());
        console.log('\n⚠️  The anon key may not have access. You can run this SQL directly in Supabase Dashboard:');
        console.log(`\nUPDATE sales_transactions SET stage = 'draft', is_posted = false, posted_at = NULL WHERE id = '${INVOICE_ID}';\n`);
        return;
    }

    const data = await getRes.json();
    if (data.length === 0) {
        console.log('⚠️ Invoice not found in sales_transactions');
        return;
    }

    console.log('Current state:', JSON.stringify(data[0], null, 2));

    // Reset to draft
    console.log('\n🔄 Resetting invoice to draft...');
    const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sales_transactions?id=eq.${INVOICE_ID}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                stage: 'draft',
                is_posted: false,
                posted_at: null,
            })
        }
    );

    if (!updateRes.ok) {
        console.error('❌ Failed to update:', updateRes.status, await updateRes.text());
        console.log('\n⚠️  Run this SQL in Supabase Dashboard SQL Editor:');
        console.log(`\nUPDATE sales_transactions SET stage = 'draft', is_posted = false, posted_at = NULL WHERE id = '${INVOICE_ID}';\n`);
        return;
    }

    const result = await updateRes.json();
    console.log('✅ Invoice reset to draft:', JSON.stringify(result[0], null, 2));
}

main().catch(console.error);

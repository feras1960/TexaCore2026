/**
 * check-db-state.cjs — التحقق من حالة قاعدة البيانات الحالية
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('🔍 فحص حالة قاعدة البيانات...\n');

    // 1. Fabric Rolls
    const { data: rolls, error: r1 } = await supabase
        .from('fabric_rolls')
        .select('id, roll_number, material_id, cost_per_meter, container_id')
        .limit(5);
    console.log(`📦 fabric_rolls (5 أول): ${r1?.message || JSON.stringify(rolls?.map(r => ({ rn: r.roll_number, cost: r.cost_per_meter, cid: r.container_id?.substring(0, 8) })))}`);

    // 2. Container Items columns
    const { data: ci, error: r2 } = await supabase
        .from('container_items')
        .select('*')
        .limit(1);
    if (ci?.[0]) {
        console.log(`\n📋 container_items columns: ${Object.keys(ci[0]).join(', ')}`);
    } else {
        console.log(`\n📋 container_items: ${r2?.message || 'فارغ'}`);
    }

    // 3. Inventory Movements
    const { count: movCount } = await supabase
        .from('inventory_movements')
        .select('id', { count: 'exact', head: true });
    console.log(`\n📊 inventory_movements: ${movCount} سجل`);

    // 4. Purchase Receipts
    const { data: receipts } = await supabase
        .from('purchase_receipts')
        .select('id, receipt_number, status')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log(`\n🧾 purchase_receipts (5 أحدث): ${JSON.stringify(receipts?.map(r => ({ num: r.receipt_number, status: r.status })))}`);

    // 5. Journal Entries
    const { data: jes } = await supabase
        .from('journal_entries')
        .select('id, entry_number, status, reference_type')
        .order('created_at', { ascending: false })
        .limit(5);
    console.log(`\n📝 journal_entries (5 أحدث): ${JSON.stringify(jes?.map(j => ({ num: j.entry_number, status: j.status, ref: j.reference_type })))}`);

    // 6. Containers
    const { data: containers } = await supabase
        .from('containers')
        .select('id, container_number, status')
        .limit(5);
    console.log(`\n📦 containers: ${JSON.stringify(containers?.map(c => ({ num: c.container_number, status: c.status })))}`);
}

check().catch(console.error);

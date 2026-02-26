const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();

    // B. بيانات container_items الحالية (بالأعمدة الصحيحة)
    const rB = await client.query(`
    SELECT ci.container_id, ci.material_id, fm.name_ar as material_name,
           fm.code as material_code,
           ci.expected_quantity, ci.expected_rolls,
           ci.received_quantity, ci.received_rolls,
           ci.unit_cost, ci.total_cost,
           ci.landed_cost_per_unit, ci.total_landed_cost,
           ci.provisional_unit_cost, ci.final_unit_cost,
           ci.allocated_costs
    FROM container_items ci
    LEFT JOIN fabric_materials fm ON fm.id = ci.material_id
    LIMIT 20
  `);
    console.log('B. بنود الكونتينر (container_items):');
    console.table(rB.rows.length > 0 ? rB.rows : [{ result: 'لا توجد بنود' }]);

    // C. inventory_batches
    const rCexist = await client.query(`
    SELECT COUNT(*) as cnt FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inventory_batches'
  `);
    if (parseInt(rCexist.rows[0].cnt) > 0) {
        const rC = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_batches'
      ORDER BY ordinal_position
    `);
        console.log('C. أعمدة inventory_batches:');
        console.table(rC.rows);

        const rCdata = await client.query(`SELECT * FROM inventory_batches LIMIT 5`);
        console.log('C2. بيانات inventory_batches:');
        console.table(rCdata.rows.length > 0 ? rCdata.rows : [{ result: 'فارغ' }]);
    } else {
        console.log('C. جدول inventory_batches: غير موجود ❌');
    }

    // D. Landed costs tables
    const rD = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%landed%' OR table_name ILIKE '%cost%' OR table_name ILIKE '%batch%')
    ORDER BY table_name
  `);
    console.log('D. جداول ذات صلة (landed/cost/batch):');
    console.table(rD.rows);

    // E. وحدات المواد
    const rE = await client.query(`
    SELECT fm.code, fm.name_ar, fm.unit_id,
           u.name_ar as unit, u.code as unit_code, u.symbol
    FROM fabric_materials fm
    LEFT JOIN units u ON u.id = fm.unit_id
    LIMIT 10
  `);
    console.log('E. وحدات قياس المواد:');
    console.table(rE.rows);

    // F. أعمدة fabric_rolls المرتبطة بالدفعة
    const rF = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fabric_rolls'
    ORDER BY ordinal_position
  `);
    console.log('F. أعمدة fabric_rolls:');
    console.table(rF.rows);

    // G. هل fabric_rolls مرتبطة بالكونتينر؟
    const rG = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'fabric_rolls'
      AND column_name IN ('container_id','batch_id','container_item_id','lot_number')
  `);
    console.log('G. ربط fabric_rolls بالكونتينر/الدفعة:');
    console.table(rG.rows.length > 0 ? rG.rows : [{ result: 'لا يوجد ربط مباشر' }]);

    await client.end();
    console.log('\n=== ✅ انتهى ===');
}
run().catch(e => { console.error('❌', e.message); client.end(); });

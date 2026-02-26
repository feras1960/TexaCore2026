const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();

    // A. container_cost_allocations
    const rA = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'container_cost_allocations'
    ORDER BY ordinal_position
  `);
    console.log('A. أعمدة container_cost_allocations:');
    console.table(rA.rows);

    // B. بيانات container_cost_allocations
    const rB = await client.query(`SELECT * FROM container_cost_allocations LIMIT 10`);
    console.log('B. بيانات container_cost_allocations:');
    console.table(rB.rows.length > 0 ? rB.rows : [{ result: 'فارغ' }]);

    // C. batches table
    const rC = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'batches'
    ORDER BY ordinal_position
  `);
    console.log('C. أعمدة batches:');
    console.table(rC.rows);

    const rCdata = await client.query(`SELECT * FROM batches LIMIT 5`);
    console.log('C2. بيانات batches:');
    console.table(rCdata.rows.length > 0 ? rCdata.rows : [{ result: 'فارغ' }]);

    // D. v_container_cost_summary
    const rD = await client.query(`SELECT * FROM v_container_cost_summary LIMIT 5`);
    console.log('D. v_container_cost_summary:');
    console.table(rD.rows.length > 0 ? rD.rows : [{ result: 'فارغ' }]);

    // E. أعمدة fabric_rolls مجدداً
    const rE = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fabric_rolls'
      AND column_name IN ('container_id','batch_id','container_item_id','lot_number','batch_number','source_id','source_type')
  `);
    console.log('E. ربط fabric_rolls بالكونتينر/الدفعة (أعمدة مرتبطة):');
    console.table(rE.rows.length > 0 ? rE.rows : [{ result: 'لا يوجد ربط مباشر بكونتينر أو دفعة' }]);

    // F. كل أعمدة fabric_rolls
    const rF = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fabric_rolls'
    ORDER BY ordinal_position
  `);
    console.log('F. كل أعمدة fabric_rolls:');
    console.table(rF.rows);

    // G. وحدات المواد (units table name)
    const rGtables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name ILIKE '%unit%'
  `);
    console.log('G. جداول الوحدات:');
    console.table(rGtables.rows);

    await client.end();
    console.log('\n=== ✅ انتهى ===');
}
run().catch(e => { console.error('❌', e.message); client.end(); });

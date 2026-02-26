const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();

    // A. أعمدة container_items
    const rA = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'container_items'
    ORDER BY ordinal_position
  `);
    console.log('A. أعمدة container_items:');
    console.table(rA.rows);

    // B. بيانات container_items الحالية
    const rB = await client.query(`
    SELECT ci.id, ci.container_id, ci.purchase_invoice_id,
           ci.material_id, fm.name_ar as material_name,
           ci.quantity, ci.unit_price,
           ci.color_id, ci.notes
    FROM container_items ci
    LEFT JOIN fabric_materials fm ON fm.id = ci.material_id
    LIMIT 20
  `);
    console.log('B. بيانات container_items:');
    console.table(rB.rows.length > 0 ? rB.rows : [{ result: 'لا توجد بنود كونتينر' }]);

    // C. أعمدة inventory_batches
    const rC = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'inventory_batches'
    ORDER BY ordinal_position
  `);
    console.log('C. أعمدة inventory_batches:');
    console.table(rC.rows.length > 0 ? rC.rows : [{ result: 'جدول inventory_batches غير موجود' }]);

    // D. هل يوجد جدول landed_costs أو container_landed_costs؟
    const rD = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name ILIKE '%landed%'
    ORDER BY table_name
  `);
    console.log('D. جداول Landed Costs:');
    console.table(rD.rows.length > 0 ? rD.rows : [{ result: 'لا توجد جداول landed costs' }]);

    // E. أعمدة containers الكاملة (المرتبطة بالمواد)
    const rE = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'containers'
    ORDER BY ordinal_position
  `);
    console.log('E. أعمدة containers:');
    console.table(rE.rows);

    // F. أعمدة fabric_rolls الكاملة
    const rF = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fabric_rolls'
    ORDER BY ordinal_position
  `);
    console.log('F. أعمدة fabric_rolls:');
    console.table(rF.rows);

    // G. وحدات القياس للمواد
    const rG = await client.query(`
    SELECT fm.code, fm.name_ar,
           u.name_ar as unit_name, u.code as unit_code,
           fm.unit_id
    FROM fabric_materials fm
    LEFT JOIN units u ON u.id = fm.unit_id
    LIMIT 10
  `);
    console.log('G. وحدات قياس المواد:');
    console.table(rG.rows.length > 0 ? rG.rows : [{ result: 'لا توجد وحدات مرتبطة' }]);

    await client.end();
    console.log('\n=== ✅ انتهى ===');
}
run().catch(e => { console.error('❌', e.message); client.end(); });

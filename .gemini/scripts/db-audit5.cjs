const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('=== ✅ تحليل شامل IV ===\n');

    // فحص أعمدة fabric_materials
    const rCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'fabric_materials'
    ORDER BY ordinal_position
    LIMIT 30
  `);
    console.log('COLS. أعمدة fabric_materials:');
    console.table(rCols.rows);

    // أرصدة الأقمشة (بدون current_stock)
    const rI = await client.query(`
    SELECT fm.code, fm.name_ar as material,
           COUNT(fr.id)::int as roll_count,
           ROUND(COALESCE(SUM(fr.current_length),0)::numeric, 2) as rolls_total_meters,
           ROUND(COALESCE(SUM(fr.current_length * COALESCE(fr.cost_per_meter,0)),0)::numeric, 2) as total_value
    FROM fabric_materials fm
    LEFT JOIN fabric_rolls fr ON fr.material_id = fm.id AND fr.status != 'consumed'
    GROUP BY fm.id, fm.code, fm.name_ar
    ORDER BY roll_count DESC
    LIMIT 20
  `);
    console.log('I. أرصدة الأقمشة (رولونات):');
    console.table(rI.rows.length > 0 ? rI.rows : [{ result: 'لا توجد أقمشة' }]);

    // الكونتينرات
    const rK = await client.query(`
    SELECT c.container_number, c.status,
           ROUND(COALESCE(c.total_purchase_value,0)::numeric,2) as total_value,
           COALESCE(c.total_received_items,0) as total_received_items,
           ca.account_code, ca.name_ar as account_name,
           (SELECT COUNT(*)::int FROM journal_entries je 
            WHERE je.reference_type = 'goods_receipt' 
            AND EXISTS (SELECT 1 FROM purchase_receipts pr WHERE pr.id = je.reference_id AND pr.container_id = c.id)
           ) as linked_je_count
    FROM containers c
    LEFT JOIN chart_of_accounts ca ON ca.id = c.container_account_id
  `);
    console.log('K. الكونتينرات والقيود:');
    console.table(rK.rows);

    // قيود الاستلام
    const rL = await client.query(`
    SELECT je.entry_number, je.status, je.entry_date,
           ROUND(je.total_debit::numeric,2) as total_debit,
           pr.receipt_number, pr.status as receipt_status,
           CASE WHEN pr.container_id IS NOT NULL THEN 'container'
                WHEN pr.invoice_id IS NOT NULL THEN 'invoice' 
                ELSE 'order' END as source_type
    FROM journal_entries je
    LEFT JOIN purchase_receipts pr ON pr.id = je.reference_id
    WHERE je.reference_type = 'goods_receipt'
  `);
    console.log('L. قيود الاستلام:');
    console.table(rL.rows.length > 0 ? rL.rows : [{ result: 'لا توجد قيود استلام' }]);

    // تكلفة الرولونات
    const rM = await client.query(`
    SELECT 
      COUNT(*)::int as total_rolls,
      SUM(CASE WHEN COALESCE(cost_per_meter,0) > 0 THEN 1 ELSE 0 END)::int as has_cost,
      SUM(CASE WHEN COALESCE(cost_per_meter,0) = 0 THEN 1 ELSE 0 END)::int as no_cost,
      ROUND(AVG(CASE WHEN cost_per_meter > 0 THEN cost_per_meter END)::numeric, 4) as avg_cost
    FROM fabric_rolls
  `);
    console.log('M. تكلفة الرولونات:');
    console.table(rM.rows);

    // الفواتير المُرحَّلة
    const rN = await client.query(`
    SELECT pi.invoice_number, pi.document_stage, pi.receipt_status,
           ROUND(COALESCE(pi.total_amount,0)::numeric,2) as total,
           pi.supplier_name,
           CASE WHEN pi.journal_entry_id IS NOT NULL THEN 'قيد موجود' ELSE 'بدون قيد' END as has_je
    FROM purchase_invoices pi
    WHERE pi.document_stage IN ('posted','confirmed','invoice')
      AND pi.status NOT IN ('cancelled')
    ORDER BY pi.invoice_date DESC
    LIMIT 15
  `);
    console.log('N. الفواتير المُرحَّلة:');
    console.table(rN.rows.length > 0 ? rN.rows : [{ result: 'لا توجد فواتير' }]);

    // مؤشرات تكامل
    const rO = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM purchase_receipts WHERE status = 'completed')::int as completed_receipts,
      (SELECT COUNT(*) FROM purchase_receipts WHERE status = 'completed' AND container_id IS NOT NULL)::int as completed_container,
      (SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'receipt')::int as receipt_movements,
      (SELECT COUNT(*) FROM fabric_rolls WHERE notes LIKE 'GRN:%')::int as rolls_with_grn
  `);
    console.log('O. مؤشرات تكامل البيانات:');
    console.table(rO.rows);

    await client.end();
    console.log('\n=== ✅ نهاية التحليل ===');
}

run().catch(e => {
    console.error('❌ خطأ:', e.message);
    client.end();
    process.exit(1);
});

const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('=== ✅ تحقق III - بنود الاستلام + مخزون الأقمشة ===\n');

    // ─── H. فحص أعمدة purchase_receipt_items ────────────────────────────
    const rH0 = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'purchase_receipt_items'
    ORDER BY ordinal_position
  `);
    console.log('H0. أعمدة جدول purchase_receipt_items:');
    console.table(rH0.rows);

    // ─── H. بنود إذونات الاستلام ──────────────────────────────────────
    const rH = await client.query(`
    SELECT pri.receipt_id, pr.receipt_number, pr.status as receipt_status,
           pri.material_id, fm.name_ar as material_name,
           pri.quantity, pri.unit_price, pri.total_price
    FROM purchase_receipt_items pri
    JOIN purchase_receipts pr ON pr.id = pri.receipt_id
    LEFT JOIN fabric_materials fm ON fm.id = pri.material_id
    ORDER BY pr.created_at DESC
    LIMIT 15
  `);
    console.log('H. بنود إذونات الاستلام:');
    console.table(rH.rows.length > 0 ? rH.rows : [{ result: 'لا توجد بنود بعد' }]);

    // ─── I. أرصدة الأقمشة في fabric_materials ────────────────────────
    const rI = await client.query(`
    SELECT fm.code, fm.name_ar as material,
           ROUND(fm.current_stock::numeric, 2) as current_stock,
           COUNT(fr.id)::int as roll_count,
           ROUND(SUM(fr.current_length)::numeric, 2) as rolls_total_meters
    FROM fabric_materials fm
    LEFT JOIN fabric_rolls fr ON fr.material_id = fm.id AND fr.status != 'consumed'
    GROUP BY fm.id, fm.code, fm.name_ar, fm.current_stock
    HAVING fm.current_stock > 0 OR COUNT(fr.id) > 0
    ORDER BY fm.code
    LIMIT 20
  `);
    console.log('I. أرصدة الأقمشة (current_stock vs fabric_rolls):');
    console.table(rI.rows.length > 0 ? rI.rows : [{ result: 'لا توجد أقمشة بمخزون' }]);

    // ─── J. مقارنة: الرولونات مقابل حركات المخزون ────────────────────
    const rJ = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM fabric_rolls) as total_rolls,
      (SELECT COUNT(*) FROM inventory_movements WHERE movement_type = 'receipt') as receipt_movements,
      (SELECT ROUND(SUM(current_length)::numeric,2) FROM fabric_rolls WHERE status != 'consumed') as rolls_total_meters,
      (SELECT ROUND(SUM(quantity)::numeric,2) FROM inventory_movements WHERE movement_type = 'receipt') as movements_total_qty
  `);
    console.log('J. مقارنة الرولونات vs حركات المخزون (يجب أن تتطابق):');
    console.table(rJ.rows);

    // ─── K. فحص الكونتينر الحالي بالتفصيل ───────────────────────────
    const rK = await client.query(`
    SELECT c.id, c.container_number, c.status,
           ROUND(c.total_purchase_value::numeric,2) as total_value,
           c.total_received_items,
           ca.account_code, ca.name_ar as account_name,
           -- فحص القيود المرتبطة بالكونتينر
           (SELECT count(*) FROM journal_entries je WHERE je.reference_type = 'goods_receipt' 
            AND EXISTS (SELECT 1 FROM purchase_receipts pr WHERE pr.id = je.reference_id AND pr.container_id = c.id)
           )::int as linked_journal_entries
    FROM containers c
    LEFT JOIN chart_of_accounts ca ON ca.id = c.container_account_id
  `);
    console.log('K. تفاصيل الكونتينرات والقيود المحاسبية المرتبطة:');
    console.table(rK.rows);

    // ─── L. القيد المحاسبي للكونتينر (JE-GRN-20260219-D4PG) ──────────
    const rL = await client.query(`
    SELECT je.entry_number, je.status, je.entry_date,
           ROUND(je.total_debit::numeric,2) as total_debit,
           ROUND(je.total_credit::numeric,2) as total_credit,
           pr.receipt_number, pr.status as receipt_status
    FROM journal_entries je
    LEFT JOIN purchase_receipts pr ON pr.id = je.reference_id
    WHERE je.reference_type = 'goods_receipt'
  `);
    console.log('L. قيود الاستلام الحالية مع حالة الإذن:');
    console.table(rL.rows);

    // ─── M. فحص الفارق: cost_per_meter في fabric_rolls ───────────────
    const rM = await client.query(`
    SELECT 
      SUM(CASE WHEN cost_per_meter > 0 THEN 1 ELSE 0 END)::int as has_cost,
      SUM(CASE WHEN cost_per_meter = 0 OR cost_per_meter IS NULL THEN 1 ELSE 0 END)::int as no_cost,
      ROUND(AVG(CASE WHEN cost_per_meter > 0 THEN cost_per_meter END)::numeric, 4) as avg_cost,
      ROUND(MIN(current_length)::numeric, 2) as min_len,
      ROUND(MAX(current_length)::numeric, 2) as max_len
    FROM fabric_rolls
  `);
    console.log('M. إحصاء تكلفة الرولونات (هل لها تكلفة؟):');
    console.table(rM.rows);

    await client.end();
    console.log('\n=== ✅ انتهى ===');
}

run().catch(e => {
    console.error('❌ خطأ:', e.message);
    client.end();
    process.exit(1);
});

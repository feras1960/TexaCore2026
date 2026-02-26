const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('=== ✅ تحقق عميق II ===\n');

    // ─── A. فحص فاتورة الكونتينر المرتبطة بـ GRN-20260220-A75S ──────────
    const rA = await client.query(`
    SELECT pr.id, pr.receipt_number, pr.status, pr.container_id, pr.invoice_id, pr.order_id,
           c.container_number, c.status as container_status, c.container_account_id,
           ROUND(c.total_purchase_value::numeric,2) as container_value
    FROM purchase_receipts pr
    LEFT JOIN containers c ON c.id = pr.container_id
    WHERE pr.receipt_number = 'GRN-20260220-A75S'
  `);
    console.log('A. تفاصيل إذن الاستلام الحالي (draft):');
    console.table(rA.rows);

    // ─── B. الكونتينر الموجود الآن ─────────────────────────────────────
    const rB = await client.query(`
    SELECT c.id, c.container_number, c.status, c.container_account_id,
           ROUND(c.total_purchase_value::numeric, 2) as total_value,
           c.total_received_items,
           ca.account_code, ca.name_ar as account_name
    FROM containers c
    LEFT JOIN chart_of_accounts ca ON ca.id = c.container_account_id
    LIMIT 10
  `);
    console.log('B. الكونتينرات في النظام:');
    console.table(rB.rows);

    // ─── C. فحص الفواتير المعلقة (pending receipt) ────────────────────
    const rC = await client.query(`
    SELECT pi.invoice_number, pi.document_stage, pi.status, pi.receipt_status,
           ROUND(pi.total_amount::numeric,2) as total,
           pi.supplier_name
    FROM purchase_invoices pi
    WHERE pi.receipt_status NOT IN ('received')
      AND pi.status NOT IN ('cancelled','draft')
      AND pi.document_stage IN ('posted','confirmed','invoice')
      AND pi.container_id IS NULL
    ORDER BY pi.invoice_date DESC
    LIMIT 10
  `);
    console.log('C. الفواتير المعلقة (تحتاج استلام):');
    console.table(rC.rows.length > 0 ? rC.rows : [{ result: 'لا توجد فواتير معلقة' }]);

    // ─── D. القيود المحاسبية الحالية ────────────────────────────────────
    const rD = await client.query(`
    SELECT je.entry_number, je.description, je.status,
           je.reference_type, je.entry_date,
           ROUND(je.total_debit::numeric,2) as debit,
           ROUND(je.total_credit::numeric,2) as credit
    FROM journal_entries je
    WHERE je.reference_type IN ('goods_receipt','purchase_invoice')
    ORDER BY je.created_at DESC
    LIMIT 15
  `);
    console.log('D. القيود المحاسبية المرتبطة بالمشتريات والاستلام:');
    console.table(rD.rows.length > 0 ? rD.rows : [{ result: 'لا توجد قيود بعد' }]);

    // ─── E. تفاصيل سطور القيد ──────────────────────────────────────────
    const rE = await client.query(`
    SELECT jel.line_number, ca.account_code, ca.name_ar as account_name,
           ROUND(jel.debit::numeric,2) as debit, ROUND(jel.credit::numeric,2) as credit,
           jel.description, je.entry_number
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    JOIN chart_of_accounts ca ON ca.id = jel.account_id
    WHERE je.reference_type IN ('goods_receipt','purchase_invoice')
    ORDER BY je.created_at DESC, jel.line_number
    LIMIT 20
  `);
    console.log('E. سطور القيود المحاسبية:');
    console.table(rE.rows.length > 0 ? rE.rows : [{ result: 'لا توجد سطور' }]);

    // ─── F. إحصاء fabric_rolls ──────────────────────────────────────────
    const rF = await client.query(`
    SELECT fr.warehouse_id, w.name_ar as warehouse,
           COUNT(*)::int as rolls,
           ROUND(SUM(fr.current_length)::numeric,2) as total_meters,
           ROUND(AVG(fr.cost_per_meter)::numeric,4) as avg_cost
    FROM fabric_rolls fr
    LEFT JOIN warehouses w ON w.id = fr.warehouse_id
    GROUP BY fr.warehouse_id, w.name_ar
  `);
    console.log('F. الرولونات بالمستودع:');
    console.table(rF.rows.length > 0 ? rF.rows : [{ result: 'لا توجد رولونات' }]);

    // ─── G. فحص inventory_movements بالتفصيل ─────────────────────────
    const rG = await client.query(`
    SELECT im.movement_type, im.reference_type, im.reference_number,
           ROUND(im.quantity::numeric,2) as qty,
           ROUND(im.unit_cost::numeric,4) as unit_cost,
           ROUND(im.total_cost::numeric,2) as total_cost,
           im.movement_date
    FROM inventory_movements im
    ORDER BY im.created_at DESC
    LIMIT 10
  `);
    console.log('G. آخر حركات المخزون:');
    console.table(rG.rows.length > 0 ? rG.rows : [{ result: 'لا توجد حركات مخزون بعد ⚠️' }]);

    // ─── H. فحص purchase_receipt_items ──────────────────────────────────
    const rH = await client.query(`
    SELECT pri.receipt_id, pr.receipt_number, pr.status as receipt_status,
           pri.material_id, fm.name_ar as material_name,
           ROUND(pri.received_quantity::numeric,2) as received_qty,
           ROUND(pri.unit_price::numeric,4) as unit_price,
           ROUND(pri.total_price::numeric,2) as total_price
    FROM purchase_receipt_items pri
    JOIN purchase_receipts pr ON pr.id = pri.receipt_id
    LEFT JOIN fabric_materials fm ON fm.id = pri.material_id
    ORDER BY pr.created_at DESC
    LIMIT 15
  `);
    console.log('H. بنود إذونات الاستلام:');
    console.table(rH.rows.length > 0 ? rH.rows : [{ result: 'لا توجد بنود بعد' }]);

    await client.end();
    console.log('\n=== ✅ انتهى التحقق العميق ===');
}

run().catch(e => {
    console.error('❌ خطأ:', e.message);
    client.end();
    process.exit(1);
});

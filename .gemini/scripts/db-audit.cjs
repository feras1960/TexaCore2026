const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA%23t%2FyEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log('=== ✅ متصل بـ Supabase ===\n');

    // ─── 1. Purchase Receipts Overview ───────────────────────────────────
    const r1 = await client.query(`
    SELECT status, count(*)::int as count,
      SUM(CASE WHEN container_id IS NOT NULL THEN 1 ELSE 0 END)::int as from_container,
      SUM(CASE WHEN invoice_id IS NOT NULL THEN 1 ELSE 0 END)::int as from_invoice,
      SUM(CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END)::int as from_order
    FROM purchase_receipts
    GROUP BY status ORDER BY count DESC
  `);
    console.log('📦 [1] purchase_receipts بالحالة:');
    console.table(r1.rows);

    // ─── 2. Journal Entries from Goods Receipt ────────────────────────────
    const r2 = await client.query(`
    SELECT reference_type, status, count(*)::int as count
    FROM journal_entries
    WHERE reference_type IN ('goods_receipt','purchase_invoice','purchase_receipt')
    GROUP BY reference_type, status ORDER BY count DESC
  `);
    console.log('📒 [2] journal_entries مرتبطة بالاستلام:');
    console.table(r2.rows.length > 0 ? r2.rows : [{ result: 'لا توجد قيود استلام حتى الآن' }]);

    // ─── 3. Duplicate Journal Entries (CRITICAL) ──────────────────────────
    const r3 = await client.query(`
    SELECT reference_id, COUNT(*)::int as entry_count,
           array_agg(entry_number) as entries
    FROM journal_entries
    WHERE reference_type = 'goods_receipt'
    GROUP BY reference_id
    HAVING COUNT(*) > 1
    LIMIT 10
  `);
    console.log('🚨 [3] قيود مزدوجة (يجب أن تكون فارغة):');
    console.table(r3.rows.length > 0 ? r3.rows : [{ result: 'لا توجد قيود مزدوجة ✅' }]);

    // ─── 4. Inventory Movements ───────────────────────────────────────────
    const r4 = await client.query(`
    SELECT movement_type, count(*)::int as count,
           ROUND(SUM(quantity)::numeric, 2) as total_qty,
           ROUND(SUM(total_cost)::numeric, 2) as total_cost
    FROM inventory_movements
    GROUP BY movement_type ORDER BY count DESC
    LIMIT 10
  `);
    console.log('🏭 [4] inventory_movements بالنوع:');
    console.table(r4.rows.length > 0 ? r4.rows : [{ result: 'لا توجد حركات حتى الآن' }]);

    // ─── 5. Fabric Rolls Status ───────────────────────────────────────────
    const r5 = await client.query(`
    SELECT status, count(*)::int as roll_count,
           ROUND(SUM(current_length)::numeric, 2) as total_meters
    FROM fabric_rolls
    GROUP BY status ORDER BY roll_count DESC
  `);
    console.log('🧵 [5] fabric_rolls بالحالة:');
    console.table(r5.rows.length > 0 ? r5.rows : [{ result: 'لا توجد رولونات حتى الآن' }]);

    // ─── 6. Containers Status ─────────────────────────────────────────────
    const r6 = await client.query(`
    SELECT status, count(*)::int as count,
           SUM(CASE WHEN container_account_id IS NOT NULL THEN 1 ELSE 0 END)::int as has_account
    FROM containers
    GROUP BY status ORDER BY count DESC
  `);
    console.log('🚢 [6] containers بالحالة:');
    console.table(r6.rows.length > 0 ? r6.rows : [{ result: 'لا توجد كونتينرات' }]);

    // ─── 7. Containers Without Account (CRITICAL for accounting) ──────────
    const r7 = await client.query(`
    SELECT id, container_number, status, container_account_id
    FROM containers
    WHERE status IN ('customs','cleared','at_port','in_receiving','received')
      AND container_account_id IS NULL
    LIMIT 10
  `);
    console.log('🚨 [7] كونتينرات بدون حساب محاسبي (مشكلة):');
    console.table(r7.rows.length > 0 ? r7.rows : [{ result: 'كل الكونتينرات لها حسابات ✅' }]);

    // ─── 8. Purchase Receipts Link to Journal Entries ─────────────────────
    const r8 = await client.query(`
    SELECT 
      pr.status as receipt_status,
      COUNT(*)::int as receipts,
      SUM(CASE WHEN je.id IS NOT NULL THEN 1 ELSE 0 END)::int as with_journal_entry,
      SUM(CASE WHEN je.id IS NULL THEN 1 ELSE 0 END)::int as missing_journal_entry
    FROM purchase_receipts pr
    LEFT JOIN journal_entries je ON je.reference_id = pr.id AND je.reference_type = 'goods_receipt'
    WHERE pr.status = 'completed'
    GROUP BY pr.status
  `);
    console.log('🔗 [8] إذن الاستلام المكتملة مع/بدون قيود محاسبية:');
    console.table(r8.rows.length > 0 ? r8.rows : [{ result: 'لا توجد إذونات مكتملة بعد' }]);

    // ─── 9. Company Accounting Settings ──────────────────────────────────
    const r9 = await client.query(`
    SELECT company_id,
           CASE WHEN default_inventory_account_id IS NOT NULL THEN '✅' ELSE '❌' END as inventory_acc,
           CASE WHEN default_payable_account_id IS NOT NULL THEN '✅' ELSE '❌' END as payable_acc,
           CASE WHEN default_purchase_account_id IS NOT NULL THEN '✅' ELSE '❌' END as purchase_acc
    FROM company_accounting_settings
    LIMIT 10
  `);
    console.log('⚙️  [9] إعدادات الحسابات الافتراضية:');
    console.table(r9.rows.length > 0 ? r9.rows : [{ result: 'لا توجد إعدادات محاسبة!' }]);

    // ─── 10. Recent Completed Receipts (last 10) ──────────────────────────
    const r10 = await client.query(`
    SELECT pr.receipt_number, pr.status, pr.receipt_type,
           pr.receipt_date,
           CASE WHEN pr.container_id IS NOT NULL THEN 'container'
                WHEN pr.invoice_id IS NOT NULL THEN 'invoice'
                WHEN pr.order_id IS NOT NULL THEN 'order' ELSE 'unknown' END as source_type,
           je.entry_number as journal_entry,
           je.total_debit as je_amount
    FROM purchase_receipts pr
    LEFT JOIN journal_entries je ON je.reference_id = pr.id AND je.reference_type = 'goods_receipt'
    ORDER BY pr.created_at DESC
    LIMIT 10
  `);
    console.log('📋 [10] آخر 10 إذونات استلام:');
    console.table(r10.rows.length > 0 ? r10.rows : [{ result: 'لا توجد إذونات بعد' }]);

    await client.end();
    console.log('\n=== ✅ انتهى التحقق ===');
}

run().catch(e => {
    console.error('❌ خطأ:', e.message);
    client.end();
    process.exit(1);
});

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 استعلام تشخيصي — يعمل في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
    t.table_name AS "الجدول / Table",
    (xpath('/row/cnt/text()', xml_count))[1]::text::bigint AS "العدد / Count"
FROM (
    SELECT table_name,
           query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
          'tenants', 'companies', 'branches', 'user_profiles',
          'suppliers', 'supplier_groups', 'customers', 'customer_groups',
          'products', 'product_categories',
          'fabric_materials', 'fabric_colors', 'fabric_groups', 'fabric_material_colors',
          'warehouses', 'units_of_measure', 'chart_of_accounts',
          'shipments', 'shipment_items', 'shipment_costs',
          'purchase_invoices', 'purchase_invoice_items',
          'sales_invoices', 'sales_invoice_items',
          'transit_reservations',
          'journal_entries', 'cash_accounts',
          'currencies', 'fiscal_years'
      )
    ORDER BY table_name
) t;

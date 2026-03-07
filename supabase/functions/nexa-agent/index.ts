import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ═══════════════════════════════════════════════════
// 🤖 NexaAgent V5 — Gemini 3.1 Pro + SQL Agent
// ═══════════════════════════════════════════════════
// - Gemini 3.1 Pro for deep analytics & SQL Agent
// - Gemini 3.1 Flash-Lite for quick chat
// - Service-role access for company-wide data
// - Multi-tenant security (company_id + tenant_id)
// ═══════════════════════════════════════════════════

function getModelName(complexity: string): string {
  switch (complexity) {
    case 'pro': return 'gemini-3.1-pro-preview';
    case 'flash': return 'gemini-3.1-flash-lite-preview';
    case 'auto':
    default: return 'gemini-3.1-flash-lite-preview';
  }
}

function shouldUpgradeToPro(message: string): boolean {
  const proKeywords = [
    'تحليل شامل', 'مقارنة', 'استراتيج', 'تنبؤ', 'forecast',
    'compare', 'analysis', 'strategy', 'trend', 'predict',
    'تقرير مفصل', 'detailed report', 'deep analysis',
    'توصيات شراء', 'purchase recommendation',
    // Analytical keywords that trigger Pro
    'أفضل', 'best', 'top', 'أكثر', 'most', 'أعلى',
    'تحليل', 'حلّل', 'analyze', 'حلل',
    'توصيات', 'recommendations', 'نصائح', 'tips',
    'تسعير', 'pricing', 'أسعار', 'prices',
    'أداء', 'performance', 'كفاءة', 'efficiency',
    'ربحية', 'profitability', 'هامش', 'margin',
    'قرارات', 'decisions', 'خطة', 'plan',
    'الشركة', 'company', 'شامل', 'comprehensive',
    'رائجة', 'popular', 'مخزون', 'inventory', 'stock',
    'كمية', 'quantity', 'ألوان', 'colors', 'أقمشة', 'fabrics',
  ];
  const lower = message.toLowerCase();
  return proKeywords.some(kw => lower.includes(kw));
}

/**
 * Fetch GENERAL company-wide context (all departments)
 * Uses service-role to access all company data
 */
async function fetchGeneralContext(supabase: any, companyId: string) {
  const context: any = {};

  try {
    console.log('[NexaAgent:fetchGeneral] Starting with companyId:', companyId);

    // DEBUG: Test basic access first
    const { count: testCount, error: testError } = await supabase
      .from('fabric_materials')
      .select('id', { count: 'exact', head: true });
    console.log('[NexaAgent:fetchGeneral] Total materials (no filter):', testCount, 'Error:', testError?.message);

    // 1. Materials overview — try company_id first, fallback to no filter
    let { count: materialsCount, error: matErr } = await supabase
      .from('fabric_materials')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    console.log('[NexaAgent:fetchGeneral] Materials with company_id filter:', materialsCount, 'Error:', matErr?.message);

    // If company_id filter returns 0 but unfiltered has data, the company_id might be wrong
    if ((materialsCount === 0 || materialsCount === null) && testCount && testCount > 0) {
      console.log('[NexaAgent:fetchGeneral] company_id mismatch! Trying without filter...');
      // Get the actual company_id from the data
      const { data: sampleMat } = await supabase
        .from('fabric_materials')
        .select('company_id')
        .limit(1)
        .single();
      if (sampleMat?.company_id && sampleMat.company_id !== companyId) {
        console.log('[NexaAgent:fetchGeneral] Auto-correcting company_id from', companyId, 'to', sampleMat.company_id);
        companyId = sampleMat.company_id;
        // Re-query with correct company_id
        const r = await supabase.from('fabric_materials').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
        materialsCount = r.count;
      }
    }

    // 2. Rolls
    const { count: rollsCount } = await supabase
      .from('fabric_rolls')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['available', 'reserved', 'partial']);

    // 3. Customers
    const { count: customersCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // 4. Suppliers
    const { count: suppliersCount } = await supabase
      .from('suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    context.overview = {
      materials: materialsCount || 0,
      rolls: rollsCount || 0,
      customers: customersCount || 0,
      suppliers: suppliersCount || 0,
    };

    // 5. Sales transactions (ALL stages for full picture)
    const { data: salesData } = await supabase
      .from('sales_transactions')
      .select('id, total_amount, stage, created_at, customer_id, customer_name, invoice_no, delivery_no, subtotal, discount_amount, tax_amount, paid_amount, balance, currency')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(200);

    let customerNameMap: Record<string, string> = {};

    if (salesData && salesData.length > 0) {
      // Resolve customer names from customers table
      const customerIds = [...new Set(salesData.map((s: any) => s.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: custNames } = await supabase
          .from('customers')
          .select('id, name_ar, name_en, code')
          .in('id', customerIds);
        if (custNames) custNames.forEach((c: any) => {
          customerNameMap[c.id] = `${c.name_ar || c.name_en} (${c.code})`;
        });
      }

      // Enrich sales with customer names
      const enrichedSales = salesData.map((s: any) => ({
        ...s,
        resolved_name: s.customer_name || customerNameMap[s.customer_id] || 'غير محدد',
      }));

      const confirmedSales = enrichedSales.filter((s: any) => ['confirmed', 'posted', 'paid', 'partial_paid'].includes(s.stage));
      const totalSales = confirmedSales.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
      const totalPaid = confirmedSales.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0);
      const totalBalance = confirmedSales.reduce((s: number, t: any) => s + (t.balance || 0), 0);

      // Sales by customer
      const salesByCustomer: Record<string, { name: string; total: number; count: number; balance: number }> = {};
      for (const s of enrichedSales) {
        const cid = s.customer_id || 'unknown';
        if (!salesByCustomer[cid]) salesByCustomer[cid] = { name: s.resolved_name, total: 0, count: 0, balance: 0 };
        salesByCustomer[cid].total += s.total_amount || 0;
        salesByCustomer[cid].balance += s.balance || 0;
        salesByCustomer[cid].count++;
      }
      const topCustomers = Object.values(salesByCustomer).sort((a, b) => b.total - a.total).slice(0, 10);

      context.sales = {
        total_transactions: confirmedSales.length,
        all_transactions: salesData.length,
        drafts: enrichedSales.filter((s: any) => s.stage === 'draft').length,
        total_revenue: totalSales,
        total_paid: totalPaid,
        total_outstanding: totalBalance,
        avg_transaction_value: confirmedSales.length > 0 ? Math.round(totalSales / confirmedSales.length) : 0,
        currency: salesData[0]?.currency || 'USD',
        top_customers: topCustomers,
        recent_transactions: enrichedSales.slice(0, 10).map((s: any) => ({
          invoice: s.invoice_no || s.delivery_no || s.draft_no || '-',
          customer: s.resolved_name,
          amount: s.total_amount,
          paid: s.paid_amount || 0,
          balance: s.balance || 0,
          stage: s.stage,
          date: s.created_at,
        })),
      };
    }

    // 6. Sales items — DETAILED per-invoice with materials
    const { data: salesItems, error: siErr } = await supabase
      .from('sales_transaction_items')
      .select('transaction_id, material_id, item_code, description, description_ar, quantity, unit_price, total, cost_price, color_name, rolls_count, roll_id, roll_code, tax_rate, tax_amount, discount_amount')
      .limit(500);

    console.log('[NexaAgent] salesItems:', salesItems?.length, 'Error:', siErr?.message);

    if (salesItems && salesItems.length > 0) {
      // Get all material names
      const allMatIds = [...new Set(salesItems.map((i: any) => i.material_id).filter(Boolean))];
      let matNameMap2: Record<string, string> = {};
      if (allMatIds.length > 0) {
        const { data: matNames } = await supabase
          .from('fabric_materials')
          .select('id, name_ar, name_en, code')
          .in('id', allMatIds);
        if (matNames) matNames.forEach((m: any) => {
          matNameMap2[m.id] = `${m.name_ar || m.name_en} (${m.code})`;
        });
      }

      // Build transaction->customer & tax map from salesData
      const txCustomerMap: Record<string, string> = {};
      const txInvoiceMap: Record<string, string> = {};
      const txTaxMap: Record<string, { subtotal: number; tax: number; discount: number }> = {};
      if (salesData) {
        for (const s of salesData) {
          const custName = s.customer_name || customerNameMap[s.customer_id] || '';
          txCustomerMap[s.id] = custName;
          txInvoiceMap[s.id] = s.invoice_no || s.delivery_no || s.draft_no || '-';
          txTaxMap[s.id] = { subtotal: s.subtotal || 0, tax: s.tax_amount || 0, discount: s.discount_amount || 0 };
        }
      }

      // Group items by transaction for per-invoice breakdown
      const itemsByTx: Record<string, any[]> = {};
      for (const item of salesItems) {
        const txId = item.transaction_id;
        if (!itemsByTx[txId]) itemsByTx[txId] = [];
        itemsByTx[txId].push({
          material: matNameMap2[item.material_id] || item.description_ar || item.description || item.item_code || 'غير محدد',
          qty: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          cost_price: item.cost_price || 0,
          tax_rate: item.tax_rate || 0,
          tax: item.tax_amount || 0,
          rolls: item.rolls_count || 0,
          roll_id: item.roll_id || null,
          color: item.color_name || '',
        });
      }

      context.invoices_detail = Object.entries(itemsByTx).map(([txId, items]) => {
        const taxInfo = txTaxMap[txId] || { subtotal: 0, tax: 0, discount: 0 };
        return {
          invoice: txInvoiceMap[txId] || txId.substring(0, 8),
          customer: txCustomerMap[txId] || '-',
          items: items,
          total_items: items.length,
          subtotal: taxInfo.subtotal,
          tax: taxInfo.tax,
          discount: taxInfo.discount,
          total_amount: items.reduce((s: number, i: any) => s + (i.total || 0), 0) + taxInfo.tax - taxInfo.discount,
        };
      });

      // Also keep aggregate by material for profitability
      const salesByMaterial: Record<string, { qty: number; revenue: number; cost: number; name: string }> = {};
      for (const item of salesItems) {
        const mid = item.material_id || item.item_code || 'unknown';
        if (!salesByMaterial[mid]) salesByMaterial[mid] = { qty: 0, revenue: 0, cost: 0, name: matNameMap2[mid] || item.description_ar || item.description || '' };
        salesByMaterial[mid].qty += item.quantity || 0;
        salesByMaterial[mid].revenue += item.total || 0;
        salesByMaterial[mid].cost += (item.cost_price || 0) * (item.quantity || 0);
      }

      const sorted = Object.entries(salesByMaterial).sort((a, b) => b[1].revenue - a[1].revenue);

      context.sales_by_material = sorted.map(([id, data]) => ({
        material: data.name || id,
        qty_sold: data.qty,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100).toFixed(1) + '%' : '-',
      }));
    }

    // 7. Purchase invoices
    const { data: purchasesData } = await supabase
      .from('purchase_invoices')
      .select('id, total_amount, stage, created_at')
      .eq('company_id', companyId)
      .limit(100);

    if (purchasesData && purchasesData.length > 0) {
      const totalPurchases = purchasesData.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
      context.purchases = {
        total_invoices: purchasesData.length,
        total_cost: totalPurchases,
      };
    }

    // 8. Journal entries / Accounting
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date, entry_type, reference_type, reference_number, description_ar, description, total_debit, total_credit, status, is_posted')
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false })
      .limit(50);

    if (journalEntries && journalEntries.length > 0) {
      const posted = journalEntries.filter((j: any) => j.is_posted);
      const totalDebit = posted.reduce((s: number, j: any) => s + (j.total_debit || 0), 0);
      const totalCredit = posted.reduce((s: number, j: any) => s + (j.total_credit || 0), 0);

      context.accounting = {
        total_entries: journalEntries.length,
        posted_entries: posted.length,
        total_debit: totalDebit,
        total_credit: totalCredit,
        recent_entries: journalEntries.slice(0, 10).map((j: any) => ({
          number: j.entry_number,
          date: j.entry_date,
          type: j.entry_type,
          ref: j.reference_type,
          description: j.description_ar || j.description,
          debit: j.total_debit,
          credit: j.total_credit,
          status: j.is_posted ? 'posted' : j.status,
        })),
      };
    }

    // 9. Low stock materials
    const { data: recentMovements } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity, movement_date')
      .eq('company_id', companyId)
      .order('movement_date', { ascending: false })
      .limit(100);

    if (recentMovements && recentMovements.length > 0) {
      const receipts = recentMovements.filter((m: any) =>
        ['receipt', 'purchase', 'goods_receipt', 'container_receipt'].includes(m.movement_type));
      const issues = recentMovements.filter((m: any) =>
        ['sale', 'issue', 'delivery', 'sale_invoice'].includes(m.movement_type));

      context.stock_movements = {
        total_movements: recentMovements.length,
        receipts: receipts.length,
        receipts_qty: receipts.reduce((s: number, m: any) => s + (m.quantity || 0), 0),
        issues: issues.length,
        issues_qty: issues.reduce((s: number, m: any) => s + Math.abs(m.quantity || 0), 0),
      };
    }

    // 10. ALL materials with full details
    const { data: allMaterials, error: allMatErr } = await supabase
      .from('fabric_materials')
      .select('id, code, name_ar, name_en, category, composition, origin_country, season, unit, current_stock, min_stock, purchase_price, selling_price, avg_cost_per_unit, status, default_width, weight_per_meter')
      .eq('company_id', companyId)
      .limit(200);

    console.log('[NexaAgent] allMaterials:', allMaterials?.length, 'Error:', allMatErr?.message);

    if (allMaterials && allMaterials.length > 0) {
      context.all_materials = allMaterials.map((m: any) => ({
        code: m.code,
        name: m.name_ar || m.name_en,
        category: m.category || '',
        composition: m.composition || '',
        width: m.default_width || '',
        origin: m.origin_country || '',
        season: m.season || '',
        unit: m.unit || 'متر',
        stock: m.current_stock || 0,
        min_stock: m.min_stock || 0,
        buy_price: m.purchase_price || 0,
        sell_price: m.selling_price || 0,
        avg_cost: m.avg_cost_per_unit || 0,
        status: m.status || 'active',
        stock_status: (m.current_stock || 0) <= (m.min_stock || 0) && (m.min_stock || 0) > 0 ? 'LOW' : 'OK',
      }));
    }

    // 11. Rolls with warehouse/location info (detailed)
    const { data: rollsData, error: rollErr } = await supabase
      .from('fabric_rolls')
      .select('id, roll_number, current_length, initial_length, status, material_id, warehouse_id, bin_location_id, color_name, weight')
      .eq('company_id', companyId)
      .in('status', ['available', 'reserved', 'partial'])
      .limit(500);

    console.log('[NexaAgent] rollsData:', rollsData?.length, 'Error:', rollErr?.message);

    if (rollsData && rollsData.length > 0) {
      // Get warehouse names
      const warehouseIds = [...new Set(rollsData.map((r: any) => r.warehouse_id).filter(Boolean))];
      let warehouseMap: Record<string, string> = {};
      if (warehouseIds.length > 0) {
        const { data: warehouses, error: whErr } = await supabase
          .from('warehouses')
          .select('id, name_ar, name, name_en, code')
          .in('id', warehouseIds);
        console.log('[NexaAgent] Warehouses for rolls:', warehouses?.length, 'Error:', whErr?.message);
        if (warehouses) warehouses.forEach((w: any) => {
          warehouseMap[w.id] = `${w.name_ar || w.name || w.name_en || ''} (${w.code || ''})`;
        });
      }

      // Get location names (bins)
      const locationIds = [...new Set(rollsData.map((r: any) => r.bin_location_id).filter(Boolean))];
      let locationMap: Record<string, string> = {};
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('warehouse_locations')
          .select('id, name, row_label, column_label, shelf_level')
          .in('id', locationIds);
        if (locations) locations.forEach((l: any) => {
          locationMap[l.id] = l.name || `${l.row_label || ''}${l.column_label || ''}-${l.shelf_level || ''}`;
        });
      }

      // Group rolls by material
      const rollsByMaterial: Record<string, { count: number; totalLength: number; warehouses: Set<string>; locations: Set<string> }> = {};
      for (const r of rollsData) {
        const mid = r.material_id || 'unknown';
        if (!rollsByMaterial[mid]) rollsByMaterial[mid] = { count: 0, totalLength: 0, warehouses: new Set(), locations: new Set() };
        rollsByMaterial[mid].count++;
        rollsByMaterial[mid].totalLength += r.current_length || 0;
        if (r.warehouse_id && warehouseMap[r.warehouse_id]) {
          rollsByMaterial[mid].warehouses.add(warehouseMap[r.warehouse_id]);
        }
        if (r.bin_location_id && locationMap[r.bin_location_id]) {
          rollsByMaterial[mid].locations.add(locationMap[r.bin_location_id]);
        }
      }

      // Build material name map
      const matIds = Object.keys(rollsByMaterial).filter(id => id !== 'unknown');
      let matNameMap: Record<string, string> = {};
      if (matIds.length > 0) {
        const { data: mats } = await supabase
          .from('fabric_materials')
          .select('id, name_ar, name_en, code')
          .in('id', matIds);
        if (mats) mats.forEach((m: any) => { matNameMap[m.id] = `${m.name_ar || m.name_en} (${m.code})`; });
      }

      context.rolls_by_material = Object.entries(rollsByMaterial).map(([mid, data]) => ({
        material: matNameMap[mid] || mid,
        rolls: (data as any).count,
        total_length: (data as any).totalLength,
        warehouses: [...(data as any).warehouses],
        locations: [...(data as any).locations],
      }));
    }

    // 12. Customers summary (with real balance from transactions)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name_ar, name_en, code, phone, city, balance, credit_limit, email, currency')
      .eq('company_id', companyId)
      .limit(100);

    if (customers && customers.length > 0) {
      // Calculate real outstanding balance per customer from sales transactions
      const customerSalesBalance: Record<string, number> = {};
      if (salesData) {
        for (const s of salesData) {
          if (s.customer_id && s.balance && s.balance > 0) {
            customerSalesBalance[s.customer_id] = (customerSalesBalance[s.customer_id] || 0) + s.balance;
          }
        }
      }

      context.customers_list = customers.map((c: any) => {
        const realBalance = customerSalesBalance[c.id] || c.balance || 0;
        return {
          name: c.name_ar || c.name_en,
          code: c.code || '',
          city: c.city || '',
          phone: c.phone || '',
          balance: realBalance,
          credit_limit: c.credit_limit || 0,
        };
      });
    }

    // 13. Suppliers summary (with balance)
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name_ar, name_en, code, phone, city, balance, credit_limit')
      .eq('company_id', companyId)
      .limit(100);

    if (suppliers && suppliers.length > 0) {
      context.suppliers_list = suppliers.map((s: any) => ({
        name: s.name_ar || s.name_en,
        code: s.code || '',
        city: s.city || '',
        balance: s.balance || 0,
      }));
    }

    // 14. Warehouses
    const { data: warehousesList } = await supabase
      .from('warehouses')
      .select('id, name_ar, name, name_en, warehouse_type, address, is_active, code')
      .eq('company_id', companyId);

    if (warehousesList && warehousesList.length > 0) {
      context.warehouses = warehousesList.map((w: any) => ({
        name: w.name_ar || w.name || w.name_en,
        code: w.code || '',
        type: w.warehouse_type || 'regular',
        address: w.address || '',
        active: w.is_active !== false,
      }));
    }

    // 15. Containers (shipments)
    const { data: containersList } = await supabase
      .from('containers')
      .select('id, container_number, supplier_id, shipping_company, vessel_name, departure_date, arrival_date, origin_country, destination_port, status, total_cost, customs_value, total_landed_cost')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (containersList && containersList.length > 0) {
      // Get container items
      const containerIds = containersList.map((c: any) => c.id);
      const { data: containerItems } = await supabase
        .from('container_items')
        .select('container_id, material_id, expected_quantity, expected_rolls, received_quantity, received_rolls, unit_cost, total_cost, landed_cost_per_unit, total_landed_cost')
        .in('container_id', containerIds);

      // Get supplier names
      const supplierIds = [...new Set(containersList.map((c: any) => c.supplier_id).filter(Boolean))];
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sups } = await supabase.from('suppliers').select('id, name_ar, name_en').in('id', supplierIds);
        if (sups) sups.forEach((s: any) => { supplierMap[s.id] = s.name_ar || s.name_en || ''; });
      }

      context.containers = containersList.map((c: any) => {
        const items = containerItems?.filter((i: any) => i.container_id === c.id) || [];
        return {
          number: c.container_number,
          supplier: supplierMap[c.supplier_id] || '-',
          shipping: c.shipping_company || '-',
          origin: c.origin_country || '-',
          destination: c.destination_port || '-',
          departure: c.departure_date,
          arrival: c.arrival_date,
          status: c.status,
          total_cost: c.total_cost || 0,
          customs: c.customs_value || 0,
          landed_cost: c.total_landed_cost || 0,
          items_count: items.length,
          total_expected_rolls: items.reduce((s: number, i: any) => s + (i.expected_rolls || 0), 0),
          total_received_rolls: items.reduce((s: number, i: any) => s + (i.received_rolls || 0), 0),
        };
      });
    }

    // 16. Purchase Receipts
    const { data: receiptsList } = await supabase
      .from('purchase_receipts')
      .select('id, receipt_number, receipt_date, receipt_type, supplier_id, warehouse_id, status')
      .eq('company_id', companyId)
      .order('receipt_date', { ascending: false })
      .limit(20);

    if (receiptsList && receiptsList.length > 0) {
      context.purchase_receipts = {
        count: receiptsList.length,
        recent: receiptsList.slice(0, 5).map((r: any) => ({
          number: r.receipt_number,
          date: r.receipt_date,
          type: r.receipt_type,
          status: r.status,
        })),
      };
    }

    // 17. Chart of Accounts summary (top-level groups)
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, name_ar, name_en, account_type_id, is_group, level, balance')
      .eq('company_id', companyId)
      .lte('level', 2);

    if (accounts && accounts.length > 0) {
      // Group by type
      const topAccounts = accounts.filter((a: any) => a.level <= 2 && a.is_group);
      context.chart_of_accounts = {
        total_accounts: accounts.length,
        top_level: topAccounts.map((a: any) => ({
          code: a.account_code,
          name: a.name_ar || a.name_en,
          type: a.account_type_id,
          balance: a.balance || 0,
        })),
      };
    }

    // 18. Equity Partners
    const { data: partners } = await supabase
      .from('equity_partners')
      .select('id, name_ar, name_en, share_percentage, capital_amount, join_date, has_salary, monthly_salary, status')
      .eq('company_id', companyId);

    if (partners && partners.length > 0) {
      const totalCapital = partners.reduce((s: number, p: any) => s + (p.capital_amount || 0), 0);
      context.equity = {
        total_capital: totalCapital,
        partners: partners.map((p: any) => ({
          name: p.name_ar || p.name_en,
          share: p.share_percentage || 0,
          capital: p.capital_amount || 0,
          salary: p.has_salary ? p.monthly_salary : 0,
          status: p.status || 'active',
        })),
      };
    }

  } catch (err) {
    console.error('Error fetching general context:', err);
  }

  return context;
}

/**
 * Fetch material context data
 */
async function fetchMaterialContext(supabase: any, materialId: string, companyId: string) {
  const context: any = {};

  const { data: material } = await supabase
    .from('fabric_materials')
    .select('*')
    .eq('id', materialId)
    .single();

  if (material) {
    context.material = {
      id: material.id, code: material.code, name_ar: material.name_ar, name_en: material.name_en,
      category: material.category, unit: material.unit, composition: material.composition,
      current_stock: material.current_stock || 0, min_stock: material.min_stock || 0,
      purchase_price: material.purchase_price || 0, selling_price: material.selling_price || 0,
      avg_cost_per_unit: material.avg_cost_per_unit || 0, status: material.status,
      origin_country: material.origin_country, season: material.season,
    };
  }

  // Rolls
  const { data: rolls } = await supabase
    .from('fabric_rolls')
    .select('id, current_length, status')
    .eq('material_id', materialId)
    .in('status', ['available', 'reserved', 'partial']);

  context.inventory = {
    rolls_count: rolls?.length || 0,
    total_length: rolls?.reduce((sum: number, r: any) => sum + (r.current_length || 0), 0) || 0,
  };

  // Movements
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('id, movement_type, quantity, movement_date, reference_type')
    .or(`product_id.eq.${materialId},material_id.eq.${materialId}`)
    .eq('company_id', companyId)
    .order('movement_date', { ascending: false })
    .limit(20);

  if (movements) {
    const receipts = movements.filter((m: any) => ['receipt', 'purchase', 'goods_receipt', 'container_receipt'].includes(m.movement_type));
    const issues = movements.filter((m: any) => ['sale', 'issue', 'delivery', 'sale_invoice'].includes(m.movement_type));
    context.movement_summary = {
      total_receipts: receipts.length,
      total_receipt_qty: receipts.reduce((s: number, m: any) => s + (m.quantity || 0), 0),
      total_issues: issues.length,
      total_issue_qty: issues.reduce((s: number, m: any) => s + Math.abs(m.quantity || 0), 0),
    };
  }

  // Sales
  const { data: salesItems } = await supabase
    .from('sales_transaction_items')
    .select('quantity, unit_price, total, cost_price')
    .eq('material_id', materialId)
    .limit(50);

  if (salesItems && salesItems.length > 0) {
    const totalSold = salesItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const totalRevenue = salesItems.reduce((s: number, i: any) => s + (i.total || 0), 0);
    context.sales = { count: salesItems.length, total_sold: totalSold, revenue: totalRevenue, avg_price: totalSold > 0 ? totalRevenue / totalSold : 0 };
  }

  // Purchases
  const { data: purchaseItems } = await supabase
    .from('purchase_invoice_items')
    .select('quantity, unit_price, total_price')
    .eq('material_id', materialId)
    .limit(50);

  if (purchaseItems && purchaseItems.length > 0) {
    const totalBought = purchaseItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const totalCost = purchaseItems.reduce((s: number, i: any) => s + (i.total_price || 0), 0);
    context.purchases = { count: purchaseItems.length, total_bought: totalBought, cost: totalCost, avg_price: totalBought > 0 ? totalCost / totalBought : 0 };
  }

  return context;
}

/**
 * Build system prompt
 */
function buildSystemPrompt(contextType: string, contextData: any, language: string, userRole: string): string {
  // Use native language names for stronger AI compliance
  const langText = language === 'ar' ? 'العربية (Arabic)'
    : language === 'ru' ? 'Русский (Russian)'
      : language === 'uk' ? 'Українська (Ukrainian)'
        : language === 'tr' ? 'Türkçe (Turkish)'
          : 'English';

  // Add explicit instruction in English to ensure compliance
  const langEnforcement = language !== 'en'
    ? `\n\n**IMPORTANT: You MUST respond ENTIRELY in ${langText}. The user wrote in ${langText}, so respond in the SAME language. Do NOT respond in Arabic if the user wrote in ${langText}.**`
    : '';

  let contextBlock = '';

  if (contextType === 'general' && contextData?.overview) {
    const ov = contextData.overview;
    const sales = contextData.sales || {};
    const purchases = contextData.purchases || {};
    const movements = contextData.stock_movements || {};

    const allMats = contextData.all_materials || [];
    const rollsByMat = contextData.rolls_by_material || [];
    const customersList = contextData.customers_list || [];
    const suppliersList = contextData.suppliers_list || [];
    const salesByMat = contextData.sales_by_material || [];
    const accounting = contextData.accounting || {};
    const warehousesList = contextData.warehouses || [];
    const containersList = contextData.containers || [];
    const equity = contextData.equity || {};
    const chartOfAccounts = contextData.chart_of_accounts || {};
    const purchaseReceipts = contextData.purchase_receipts || {};

    contextBlock = `
## ═══ بيانات الشركة الحقيقية الكاملة ═══
⚠️ لديك صلاحيات وصول كاملة. كل البيانات أدناه حقيقية من قاعدة البيانات.

### 📊 نظرة عامة:
- المواد: **${ov.materials}** | الرولونات: **${ov.rolls}** | العملاء: **${ov.customers}** | الموردين: **${ov.suppliers}**

### 💰 المبيعات:
- معاملات مؤكدة: **${sales.total_transactions || 0}** (إجمالي: ${sales.all_transactions || 0} | مسودات: ${sales.drafts || 0})
- إجمالي الإيرادات: **${sales.total_revenue || 0}** ${sales.currency || ''}
- المحصّل: **${sales.total_paid || 0}** | المستحق: **${sales.total_outstanding || 0}**
- متوسط الفاتورة: **${sales.avg_transaction_value || 0}**
${sales.top_customers ? `\n**أهم العملاء بالمبيعات:**\n${sales.top_customers.map((c: any, i: number) => `  ${i + 1}. ${c.name} — ${c.count} معاملة — إجمالي: ${c.total} — مستحق: ${c.balance || 0}`).join('\n')}` : ''}
${sales.recent_transactions ? `\n**آخر المعاملات:**\n${sales.recent_transactions.slice(0, 8).map((t: any) => `  - ${t.invoice} | ${t.customer} | مبلغ: ${t.amount} | مدفوع: ${t.paid} | مستحق: ${t.balance} | ${t.stage} | ${t.date?.split('T')[0] || ''}`).join('\n')}` : ''}

### 📈 المبيعات حسب المادة (ربحية):
${salesByMat.length > 0 ? salesByMat.map((s: any) => `- ${s.material}: كمية ${s.qty_sold} | إيراد: ${s.revenue} | تكلفة: ${s.cost} | ربح: ${s.profit} | هامش: ${s.margin}`).join('\n') : 'لا توجد مبيعات تفصيلية'}

### 🧾 تفاصيل بنود كل فاتورة:
${(contextData.invoices_detail || []).length > 0 ? (contextData.invoices_detail || []).map((inv: any) => `**${inv.invoice}** — عميل: ${inv.customer} — قبل الضريبة: ${inv.subtotal} | ضريبة: ${inv.tax} | خصم: ${inv.discount} | الإجمالي: ${inv.total_amount}\n${inv.items.map((it: any) => `    • ${it.material} | كمية: ${it.qty} | سعر: ${it.unit_price} | مجموع: ${it.total} | ضريبة: ${it.tax_rate}% (${it.tax})${it.rolls ? ' | رولونات: ' + it.rolls : ''}${it.roll_id ? ' | رول: ' + it.roll_id : ''}${it.color ? ' | لون: ' + it.color : ''}`).join('\n')}`).join('\n') : 'لا توجد تفاصيل بنود'}

### 🛒 المشتريات:
- فواتير شراء: **${purchases.total_invoices || 0}** | إجمالي: **${purchases.total_cost || 0}**
${purchaseReceipts.count ? `- استلامات: **${purchaseReceipts.count}**` : ''}

### 📦 المستودعات (${warehousesList.length}):
${warehousesList.length > 0 ? warehousesList.map((w: any) => `- ${w.name} (${w.code || w.type}) ${w.active ? '✅' : '❌'}`).join('\n') : 'لا توجد مستودعات'}

### 🚢 الكونتينرات (${containersList.length}):
${containersList.length > 0 ? containersList.map((c: any) => `- ${c.number} | مورد: ${c.supplier} | منشأ: ${c.origin} → ${c.destination} | حالة: ${c.status} | تكلفة: ${c.total_cost} | جمارك: ${c.customs} | تكلفة واصلة: ${c.landed_cost} | ${c.total_received_rolls}/${c.total_expected_rolls} رول`).join('\n') : 'لا توجد كونتينرات'}

### 🏦 المحاسبة:
- قيود: **${accounting.total_entries || 0}** (مرحّلة: ${accounting.posted_entries || 0})
- إجمالي مدين: **${accounting.total_debit || 0}** | إجمالي دائن: **${accounting.total_credit || 0}**
${accounting.recent_entries ? `\n**آخر القيود:**\n${accounting.recent_entries.slice(0, 5).map((j: any) => `  - ${j.number} | ${j.date} | ${j.description || j.type} | مدين: ${j.debit} | دائن: ${j.credit}`).join('\n')}` : ''}

### 📋 شجرة الحسابات: ${chartOfAccounts.total_accounts || 0} حساب
${chartOfAccounts.top_level ? chartOfAccounts.top_level.slice(0, 10).map((a: any) => `- ${a.code} ${a.name} (${a.balance || 0})`).join('\n') : ''}

### 👥 رأس المال والشركاء:
${equity.partners ? `إجمالي رأس المال: **${equity.total_capital || 0}**\n${equity.partners.map((p: any) => `- ${p.name}: حصة ${p.share}% | رأسمال: ${p.capital} | راتب: ${p.salary || '-'}`).join('\n')}` : 'لا توجد بيانات شركاء'}

### ⚠️ تنبيهات المخزون: ${contextData.low_stock?.count || 0} مادة منخفضة

### حركات المخزون:
- إجمالي: **${movements.total_movements || 0}** | استلام: ${movements.receipts || 0} (${movements.receipts_qty || 0}) | صرف: ${movements.issues || 0} (${movements.issues_qty || 0})

### ═══ تفاصيل كل المواد (${allMats.length}) ═══
${allMats.length > 0 ? allMats.map((m: any) => `- ${m.name} (${m.code}) | فئة: ${m.category || '-'} | تركيب: ${m.composition || '-'} | منشأ: ${m.origin || '-'} | مخزون: ${m.stock} ${m.unit} | شراء: ${m.buy_price} | بيع: ${m.sell_price} | ${m.stock_status}`).join('\n') : 'لا توجد مواد'}

### ═══ الرولونات حسب المادة والمستودع ═══
${rollsByMat.length > 0 ? rollsByMat.map((r: any) => `- ${r.material}: ${r.rolls} رول (${r.total_length} م) — [${r.warehouses.join(', ') || '-'}]`).join('\n') : 'لا توجد رولونات'}

### ═══ العملاء (${customersList.length}) ═══
${customersList.length > 0 ? customersList.map((c: any) => `- ${c.name} (${c.code}) — ${c.city || '-'} | رصيد: ${c.balance || 0} | حد ائتمان: ${c.credit_limit || '-'}`).join('\n') : '-'}

### ═══ الموردين (${suppliersList.length}) ═══
${suppliersList.length > 0 ? suppliersList.map((s: any) => `- ${s.name} (${s.code}) — ${s.city || '-'} | رصيد: ${s.balance || 0}`).join('\n') : '-'}
`;
  } else if (contextType === 'material' && contextData?.material) {
    const m = contextData.material;
    const inv = contextData.inventory || {};
    const sales = contextData.sales || {};
    const purchases = contextData.purchases || {};
    const movSum = contextData.movement_summary || {};

    contextBlock = `
## بيانات المادة الحقيقية:
- **الاسم**: ${m.name_ar || m.name_en} (${m.code})
- **الفئة**: ${m.category || 'غير مصنف'} | **الوحدة**: ${m.unit || 'متر'}
- **التركيب**: ${m.composition || '-'} | **البلد**: ${m.origin_country || '-'}

## المخزون: رصيد **${m.current_stock}** ${m.unit} | رولونات **${inv.rolls_count}** | طول إجمالي **${inv.total_length}** ${m.unit}
- حد أدنى: ${m.min_stock} | حالة: ${m.current_stock <= m.min_stock ? '⚠️ منخفض' : '✅ طبيعي'}

## الأسعار: شراء **${m.purchase_price}** | بيع **${m.selling_price}** | تكلفة متوسطة **${m.avg_cost_per_unit}**
- هامش الربح: **${m.selling_price && m.avg_cost_per_unit ? ((m.selling_price - m.avg_cost_per_unit) / m.selling_price * 100).toFixed(1) : 0}%**

## الحركات: استلام ${movSum.total_receipts || 0} (${movSum.total_receipt_qty || 0}) | صرف ${movSum.total_issues || 0} (${movSum.total_issue_qty || 0})
## المبيعات: ${sales.count || 0} فاتورة | كمية ${sales.total_sold || 0} | إيراد ${sales.revenue || 0}
## المشتريات: ${purchases.count || 0} فاتورة | كمية ${purchases.total_bought || 0} | تكلفة ${purchases.cost || 0}
`;
  } else if (contextType === 'party' && contextData) {
    contextBlock = `## بيانات الجهة:\n${JSON.stringify(contextData, null, 2)}`;
  }

  return `أنت "وكيل نيكسا" (NexaAgent) 🤖 — المساعد الذكي في نظام TexaCore ERP لإدارة تجارة الأقمشة والنسيج.

## مهامك:
1. تحليل البيانات الحقيقية المعروضة وتقديم رؤى ذكية
2. الإجابة على الأسئلة بناءً على البيانات الحقيقية المتاحة
3. تقديم توصيات عملية (تسعير، شراء، تخزين، بيع)
4. التنبيه على المخاطر (مخزون منخفض، هامش ربح ضعيف، مواد بطيئة)
5. اقتراح تحسينات وقرارات إدارية
6. ⚠️ عند السؤال عن عملية تجارية (شراء، بيع، استلام): قدم تسلسل الأحداث الكامل — لا تتوقف عند المعلومات الأساسية

## 🔄 تسلسل العمليات التجارية (احكِ القصة الكاملة):
### دورة الشراء:
1. إنشاء فاتورة مشتريات (purchase_invoices) ← تاريخ الشراء
2. ربط الفاتورة بكونتينر (containers) ← رقم الكونتينر
3. الشحن والنقل ← حالة الكونتينر (in_transit → at_port → customs → received → closed)
4. التخليص الجمركي ← ضريبة جمركية (journal_entries)
5. الاستلام في المستودع ← container_items: تفاصيل كل مادة (expected_quantity vs received_quantity)
6. فحص الكميات ← variance_amount: نقص (سالب) أو زيادة (موجب) أو مطابق (0)
7. تحديد عدد الرولونات الفعلية ← received_rolls لكل مادة
8. القيد المحاسبي ← journal_entries + journal_entry_lines
### دورة البيع:
1. إنشاء فاتورة مبيعات ← sales_transactions
2. تحديد الرولونات للصرف ← inventory_movements (movement_type = 'sale')
3. التسليم من المستودع ← تحديث مخزون الرول
4. القيد المحاسبي التلقائي

## قواعد الرد الصارمة:
1. تحدث بلغة: ${langText}
2. استخدم الأرقام الإنجليزية (1, 2, 3) دائماً
3. ⚠️ مهم جداً: لديك صلاحيات كاملة للوصول لكل بيانات الشركة. لا تقل أبداً "لا يوجد لدي صلاحيات" أو "لا أستطيع الوصول". استخدم أداة SQL!
4. البيانات أدناه حقيقية مباشرة من قاعدة البيانات — استخدمها للإجابة بثقة
5. استخدم الإيموجي (📊 💰 ⚠️ ✅ 🏷️ 📈 📉)
6. استخدم **bold** للأرقام والقيم المهمة
7. إذا كان حقل معين فارغ أو صفر، اذكر ذلك كملاحظة وقدم توصية لتعبئته
8. ركز على القيمة العملية والقرارات القابلة للتنفيذ — كن وكيل ذكاء أعمال
9. صلاحيات المستخدم: ${userRole}
10. عند السؤال عن مادة محددة أو لون أو نوع، ابحث في قائمة المواد التفصيلية أدناه وأجب بدقة
11. ⚠️ **أسلوب الإجابة**: قدم القصة الكاملة، ليس فقط الأرقام. اشرح التسلسل الزمني والعلاقات بين الأحداث

${contextBlock}${langEnforcement}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      message,
      language = 'ar',
      context_type = 'general',
      context_id,
      context_data,
      chat_history = [],
      complexity = 'auto',
      company_id,
    } = await req.json()

    const apiKey = Deno.env.get("GOOGLE_AI_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_AI_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ═══ Determine model ═══
    // Default: Pro for SQL Agent (deep analysis). Flash only for simple greetings.
    let selectedModel = 'gemini-3.1-pro-preview';
    let usedModel = 'pro';

    // Use Flash-Lite only for explicitly simple requests
    const simplePatterns = /^(مرحبا|اهلا|شكرا|hi|hello|كيف حالك|ما هو)$/i;
    if (complexity === 'flash' || (complexity === 'auto' && simplePatterns.test(message.trim()))) {
      selectedModel = 'gemini-3.1-flash-lite-preview';
      usedModel = 'flash';
    }

    // ═══ Get user info from their JWT (to check permissions) ═══
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    let enrichedContext = context_data || {};
    let userRole = 'user';
    let resolvedCompanyId = company_id || '';
    let resolvedTenantId = '';

    // Step 1: Get user role from their JWT
    if (authHeader && supabaseUrl && supabaseAnonKey) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await userClient.auth.getUser();
      userRole = user?.user_metadata?.role || user?.user_metadata?.system_role || 'user';
      if (!resolvedCompanyId) {
        resolvedCompanyId = user?.user_metadata?.company_id || '';
      }
      console.log('[NexaAgent] User role:', userRole, 'Company from JWT:', user?.user_metadata?.company_id, 'Resolved:', resolvedCompanyId);
    }

    console.log('[NexaAgent] Service role key available:', !!serviceRoleKey, 'Company ID:', resolvedCompanyId, 'Context type:', context_type);

    // Resolve tenant_id from company
    if (resolvedCompanyId && supabaseUrl && serviceRoleKey) {
      const tempClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: companyData } = await tempClient.from('companies').select('tenant_id').eq('id', resolvedCompanyId).single();
      if (companyData?.tenant_id) {
        resolvedTenantId = companyData.tenant_id;
        console.log('[NexaAgent] Resolved tenant_id:', resolvedTenantId);
      }
    }

    // Step 2: Use SERVICE_ROLE to access ALL company data (bypasses RLS)
    if (supabaseUrl && serviceRoleKey && resolvedCompanyId) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      if (context_type === 'general') {
        enrichedContext = await fetchGeneralContext(adminClient, resolvedCompanyId);
        console.log('[NexaAgent] General context fetched. Materials:', enrichedContext?.overview?.materials, 'Rolls:', enrichedContext?.overview?.rolls, 'AllMats:', enrichedContext?.all_materials?.length);
      } else if (context_type === 'material' && context_id) {
        enrichedContext = await fetchMaterialContext(adminClient, context_id, resolvedCompanyId);
        console.log('[NexaAgent] Material context fetched:', enrichedContext?.material?.code);
      }
    }

    // Step 3: FALLBACK — if service_role returned empty, try with user's JWT
    if ((!enrichedContext?.overview && context_type === 'general') || (!enrichedContext?.material && context_type === 'material')) {
      console.log('[NexaAgent] Service role returned empty, trying user JWT fallback...');
      if (authHeader && supabaseUrl && supabaseAnonKey) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        if (context_type === 'general' && resolvedCompanyId) {
          enrichedContext = await fetchGeneralContext(userClient, resolvedCompanyId);
          console.log('[NexaAgent] JWT fallback context. Materials:', enrichedContext?.overview?.materials, 'AllMats:', enrichedContext?.all_materials?.length);
        } else if (context_type === 'material' && context_id && resolvedCompanyId) {
          enrichedContext = await fetchMaterialContext(userClient, context_id, resolvedCompanyId);
        }
      }
    }

    // ═══ Build prompt ═══
    const systemPrompt = buildSystemPrompt(context_type, enrichedContext, language, userRole);

    // ═══ Chat history ═══
    const contents: any[] = [];
    for (const msg of chat_history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // ═══ SQL Agent: Get schema for function calling ═══
    let schemaContext = '';
    const sqlAdminClient = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
    if (sqlAdminClient) {
      try {
        const { data: schemaData } = await sqlAdminClient.rpc('get_schema_info');
        if (schemaData && Array.isArray(schemaData)) {
          // Build compact schema representation
          const importantTables = schemaData.filter((t: any) =>
            ['fabric_materials', 'fabric_rolls', 'customers', 'suppliers', 'sales_transactions', 'sales_transaction_items',
              'purchase_invoices', 'purchase_invoice_items', 'purchase_receipts', 'purchase_receipt_items',
              'inventory_movements', 'stock_movements', 'roll_reservations',
              'warehouses', 'warehouse_locations', 'containers', 'container_items',
              'container_expenses', 'container_cost_allocations',
              'journal_entries', 'journal_entry_lines', 'chart_of_accounts',
              'equity_partners', 'companies', 'branches', 'currencies',
              'employees', 'expense_entries', 'drivers',
              'delivery_notes', 'delivery_note_items', 'sales_delivery_items',
              'sales_invoice_items', 'sales_order_items', 'sales_return_items',
              'user_profiles', 'notifications',
            ].includes(t.table)
          );
          schemaContext = importantTables.map((t: any) =>
            `${t.table}: ${t.columns?.map((c: any) => c.name).join(', ')}`
          ).join('\n');
          console.log('[NexaAgent] Schema loaded:', importantTables.length, 'tables');
        }
      } catch (err) {
        console.log('[NexaAgent] Schema fetch error:', err);
      }
    }

    // ═══ Function calling tools for SQL Agent ═══
    const tools = schemaContext ? [{
      functionDeclarations: [{
        name: 'run_sql_query',
        description: 'Execute a read-only SQL query against the company database. Use this when you need to look up specific data not available in the pre-loaded context. ALWAYS include WHERE company_id = the company ID in your queries for tables that have company_id. Only SELECT queries are allowed.',
        parameters: {
          type: 'OBJECT',
          properties: {
            sql: {
              type: 'STRING',
              description: 'The SQL SELECT query to execute. Must include company_id filter. Example: SELECT name_ar, current_stock FROM fabric_materials WHERE company_id = \'xxx\' ORDER BY current_stock DESC LIMIT 10',
            },
            purpose: {
              type: 'STRING',
              description: 'Brief description of what this query is looking for',
            },
          },
          required: ['sql', 'purpose'],
        },
      }],
    }] : undefined;

    // Add SQL Agent context to system prompt
    const sqlAgentPrompt = schemaContext ? `

## 🔧 أدوات SQL Agent (وصول مباشر لقاعدة البيانات):
لديك أداة run_sql_query لاستعلام قاعدة البيانات مباشرة.
⚠️ **قاعدة ذهبية**: دائماً استخدم أداة run_sql_query عندما يسأل المستخدم عن تفاصيل دقيقة مثل: رولونات فاتورة، مواقع مخزون، حركات مخزنية، أو أي بيانات غير متوفرة أعلاه.
⚠️ دائماً أضف WHERE company_id = '${resolvedCompanyId}' للجداول الرئيسية.
⚠️ الجداول الفرعية (purchase_invoice_items, purchase_receipt_items, container_items, journal_entry_lines, delivery_note_items) ليس فيها company_id — استخدم tenant_id = '${resolvedTenantId}' أو JOIN مع الجدول الرئيسي.

### 💡 قواعد بيانات مهمة (استخدمها لكتابة SQL):
1. **رولونات فاتورة مبيعات**: الرولونات المصروفة لفاتورة موجودة في جدول **inventory_movements** حيث reference_number = رقم الفاتورة (مثل SI-2026-000001) و movement_type = 'sale'. كل صف = رول واحد مع roll_id و quantity (الطول المصروف).
   مثال: SELECT im.roll_id, im.quantity, fr.roll_number, fm.name_ar FROM inventory_movements im JOIN fabric_rolls fr ON im.roll_id = fr.id JOIN fabric_materials fm ON im.material_id = fm.id WHERE im.reference_number = 'SI-2026-000001'
2. **رمز الرول**: في fabric_rolls.roll_number
3. **اسم المادة**: JOIN fabric_materials ON material_id = fabric_materials.id (استخدم name_ar)
4. **اسم المستودع**: JOIN warehouses ON warehouse_id = warehouses.id (استخدم name أو name_ar)
5. **موقع الرول داخل المستودع**: fabric_rolls.bin_location_id → JOIN warehouse_locations ON id = bin_location_id (استخدم name أو row_label+column_label)
6. **رصيد عميل**: SELECT SUM(balance) FROM sales_transactions WHERE customer_id = 'xxx' AND stage IN ('confirmed','posted','partial_paid')
7. ⚠️ **أسماء الأعمدة المهمة**:
   - المبيعات: sales_transactions.invoice_no (مثل SI-2026-000001)
   - المشتريات: purchase_invoices.invoice_number (مثل PI-2026-000001) — ليس invoice_no!
   - الموردين/العملاء: name_ar (وليس name)
   - الكونتينر: containers.container_number, containers.status ('in_transit','at_port','customs','received','closed')
   - بنود المشتريات: purchase_invoice_items (استخدم tenant_id للفلترة)
   - بنود الكونتينر: container_items (استخدم tenant_id للفلترة)
   - بنود الاستلام: purchase_receipt_items.ordered_quantity, received_quantity, variance_quantity
8. **لا تقل أبداً "البيانات غير متوفرة"** — استخدم أداة SQL للبحث!

### 🎯 استراتيجية الاستخدام:
- السياق أعلاه = نظرة عامة سريعة. استخدمه للإجابات العامة.
- أداة SQL = تفاصيل دقيقة. استخدمها لأي سؤال يحتاج بيانات محددة.
- ⚠️ **كن فعالاً جداً**: في أول query اجمع أكبر قدر من البيانات بـ JOINs شاملة!
- يمكنك تنفيذ حتى 5 استعلامات SQL. اجمع أكبر قدر من البيانات في كل استعلام.
- ⚠️ **chart_of_accounts فيها 135+ حساب — ليست فارغة!** استعلم: SELECT code, name_ar, account_type, balance FROM chart_of_accounts WHERE company_id = 'COMPANY_ID'

### 🏢 منطق الأعمال (Business Logic):
#### 📦 دورة الشراء الكاملة:
1. إنشاء فاتورة مشتريات من المورد → purchase_invoices
2. إدخال الفاتورة في كونتينر → container_items (قد يحتوي فواتير من موردين مختلفين)
3. دفع المصاريف على الكونتينر بشكل مستقل → container_expenses (شحن، تخزين، نقل، تأمين)
4. دفع الضريبة الجمركية بشكل مستقل → journal_entries — الضريبة المرتجعة تُوزع على المواد
5. توزيع المصاريف على المواد → container_cost_allocations (حساب التكلفة الواصلة Landed Cost)
6. استلام في المستودع → تحديث received_quantity, received_rolls, variance_amount
7. القيود المحاسبية → journal_entries + journal_entry_lines
8. حركات المخزون → inventory_movements (reference_type = 'container_receipt')
#### 💰 التكلفة الواصلة = سعر الشراء + حصة الشحن + حصة الجمارك + مصاريف أخرى - حصة الضريبة المرتجعة

### 🔄 دورة المشتريات:
- ⚠️ **مهم**: المشتريات تتم عبر الكونتينر. ابحث دائماً في containers + container_items أولاً!
- فاتورة مشتريات: purchase_invoices (invoice_number, supplier_name, total_amount, invoice_date)
- بنود الفاتورة: purchase_invoice_items (tenant_id للفلترة)
- إيصال الاستلام: purchase_receipts (purchase_invoice_id, status, received_by)
- القيود المحاسبية: journal_entries (ابحث بـ description ILIKE '%PI-2026%' أو '%نانسي%')

### 📦 بنود الكونتينر (المصدر الرئيسي للمشتريات):
- ⚠️ **container_items هو المصدر الرئيسي لبيانات الشراء**
- container_expenses: مصاريف الشحن والتخزين والنقل
- container_cost_allocations: توزيع التكاليف على المواد
- مثال: SELECT c.container_number, c.status, c.total_cost, ci.item_description, ci.supplier_name, ci.invoice_no, ci.expected_quantity, ci.received_quantity, ci.received_rolls, ci.variance_amount, ci.unit_price, ci.total_price FROM containers c JOIN container_items ci ON ci.container_id = c.id WHERE c.company_id = 'COMPANY_ID'
- حركات المخزون: inventory_movements حيث reference_type = 'container_receipt'
- تكاليف: containers.total_cost, container_expenses, journal_entries عن 'جمرك' أو 'customs'

### هيكل قاعدة البيانات (الجداول والأعمدة):
${schemaContext}
` : '';

    // ═══ Call Gemini with Function Calling ═══
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    let geminiBody: any = {
      system_instruction: { parts: [{ text: systemPrompt + sqlAgentPrompt }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    };
    if (tools) geminiBody.tools = tools;

    let geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    // ═══ Handle function calls (SQL Agent loop — max 5 rounds) ═══
    let maxRounds = 5;
    let lastParsedResult: any = null;
    while (geminiResponse.ok && maxRounds > 0) {
      lastParsedResult = await geminiResponse.json();
      const candidate = lastParsedResult?.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check if there's a function call
      const functionCall = parts.find((p: any) => p.functionCall);
      if (!functionCall) break; // No function call, we have the final response

      const fc = functionCall.functionCall;
      console.log('[NexaAgent:SQL] Function call:', fc.name, 'Purpose:', fc.args?.purpose);
      console.log('[NexaAgent:SQL] Query:', fc.args?.sql?.substring(0, 200));

      let queryResult: any = { error: 'Unknown function' };

      if (fc.name === 'run_sql_query' && sqlAdminClient && fc.args?.sql) {
        try {
          const { data, error } = await sqlAdminClient.rpc('execute_readonly_query', {
            query_text: fc.args.sql,
            p_company_id: resolvedCompanyId,
            p_tenant_id: resolvedTenantId || null
          });
          if (error) {
            queryResult = { error: error.message };
            console.log('[NexaAgent:SQL] Query error:', error.message);
          } else {
            queryResult = { rows: data || [], count: Array.isArray(data) ? data.length : 0 };
            console.log('[NexaAgent:SQL] Query returned:', queryResult.count, 'rows');
          }
        } catch (err: any) {
          queryResult = { error: err?.message || 'Query execution failed' };
          console.log('[NexaAgent:SQL] Execution error:', err?.message);
        }
      }

      // Send function result back to Gemini
      contents.push({
        role: 'model',
        parts: parts,
      });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: fc.name, response: queryResult } }],
      });

      geminiBody.contents = contents;
      geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      maxRounds--;
      lastParsedResult = null; // will be re-parsed in next iteration
    }

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini API error ${geminiResponse.status}:`, errText);

      // Fallback: if 3.1 Pro fails, try 3.1 Flash-Lite
      if (selectedModel.includes('pro')) {
        console.log('[NexaAgent] 3.1 Pro failed, trying 3.1 Flash-Lite fallback...');
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          const text = fallbackResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return new Response(JSON.stringify({
            response: text, model_used: 'flash_fallback', context_loaded: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      throw new Error(`Gemini API error ${geminiResponse.status}: ${errText}`);
    }

    // Get final result — either saved from loop or fresh parse
    if (!lastParsedResult && geminiResponse.ok) {
      lastParsedResult = await geminiResponse.json();
    }
    const responseText = lastParsedResult?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '';

    return new Response(JSON.stringify({
      response: responseText,
      model_used: usedModel === 'auto' ? 'flash' : usedModel,
      context_loaded: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('NexaAgent V3 error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

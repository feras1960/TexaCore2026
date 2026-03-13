// ═══════════════════════════════════════════════════
// 🤖 NexaPro Agent — Data Fetcher Module
// ═══════════════════════════════════════════════════
// All data fetching, caching, and context building
// Isolated from prompt construction and handler

// ═══ Cache Layer ═══

export async function fetchCachedContext(supabase: any, companyId: string): Promise<any | null> {
  try {
    const { data: cached, error } = await supabase
      .from('company_insights_cache')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error || !cached) {
      console.log('[DataFetcher:Cache] No cache found:', error?.message);
      return null;
    }

    const mats = cached.overview?.materials || 0;
    const custs = cached.overview?.customers || 0;
    const allMatsLen = Array.isArray(cached.all_materials) ? cached.all_materials.length : 0;
    console.log('[DataFetcher:Cache] ✅ Cache HIT! Materials:', mats, 'Customers:', custs, 'AllMats:', allMatsLen, 'Stale:', cached.is_stale);

    // Check staleness (refresh if older than 1 hour or marked stale)
    const cacheAge = Date.now() - new Date(cached.last_refreshed_at).getTime();
    const isOld = cacheAge > 60 * 60 * 1000;

    if (cached.is_stale || isOld) {
      console.log('[DataFetcher:Cache] ⏳ Cache stale (age:', Math.round(cacheAge / 1000), 's), refreshing in background...');
      supabase.rpc('refresh_company_insights', { p_company_id: companyId })
        .then(() => console.log('[DataFetcher:Cache] Background refresh done'))
        .catch((e: any) => console.log('[DataFetcher:Cache] Background refresh error:', e?.message));
    }

    return buildContextFromCache(cached);
  } catch (err: any) {
    console.error('[DataFetcher:Cache] Exception:', err?.message);
    return null;
  }
}

function buildContextFromCache(cached: any): any {
  return {
    overview: cached.overview || {},
    sales: cached.sales_summary || {},
    sales_by_material: cached.sales_by_material || [],
    purchases: cached.purchases_summary || {},
    accounting: cached.accounting_summary || {},
    stock_movements: cached.inventory_status || {},
    all_materials: cached.all_materials || [],
    rolls_by_material: cached.rolls_by_material || [],
    customers_list: cached.customers_list || [],
    suppliers_list: cached.suppliers_list || [],
    warehouses: cached.warehouses_list || [],
    containers: cached.containers_list || [],
    equity: cached.equity_info || {},
    chart_of_accounts: cached.chart_summary || {},
    base_currency: cached.overview?.base_currency || 'UAH',
  };
}

// ═══ General Context (Fallback when cache unavailable) ═══

export async function fetchGeneralContext(supabase: any, companyId: string) {
  const context: any = {};

  try {
    console.log('[DataFetcher] Starting fetchGeneralContext for:', companyId);

    // 1. Materials count (with company_id correction)
    const { count: testCount } = await supabase.from('fabric_materials').select('id', { count: 'exact', head: true });
    let { count: materialsCount } = await supabase.from('fabric_materials').select('id', { count: 'exact', head: true }).eq('company_id', companyId);

    if ((materialsCount === 0 || materialsCount === null) && testCount && testCount > 0) {
      const { data: sampleMat } = await supabase.from('fabric_materials').select('company_id').limit(1).single();
      if (sampleMat?.company_id && sampleMat.company_id !== companyId) {
        companyId = sampleMat.company_id;
        const r = await supabase.from('fabric_materials').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
        materialsCount = r.count;
      }
    }

    // 2-4. Counts
    const { count: rollsCount } = await supabase.from('fabric_rolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['available', 'reserved', 'partial']);
    const { count: customersCount } = await supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: suppliersCount } = await supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('company_id', companyId);

    context.overview = { materials: materialsCount || 0, rolls: rollsCount || 0, customers: customersCount || 0, suppliers: suppliersCount || 0 };

    // Base currency
    const { data: companySettings } = await supabase.from('companies').select('default_currency').eq('id', companyId).single();
    const baseCurrency = companySettings?.default_currency || 'UAH';
    context.base_currency = baseCurrency;

    // 5. Sales transactions (calculations use only posted)
    const { data: salesData } = await supabase
      .from('sales_transactions')
      .select('id, total_amount, stage, created_at, customer_id, customer_name, invoice_no, delivery_no, subtotal, discount_amount, tax_amount, paid_amount, balance, currency')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);

    let customerNameMap: Record<string, string> = {};

    if (salesData && salesData.length > 0) {
      const customerIds = [...new Set(salesData.map((s: any) => s.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: custNames } = await supabase.from('customers').select('id, name_ar, name_en, code').in('id', customerIds);
        if (custNames) custNames.forEach((c: any) => { customerNameMap[c.id] = `${c.name_ar || c.name_en} (${c.code})`; });
      }

      const enrichedSales = salesData.map((s: any) => ({ ...s, resolved_name: s.customer_name || customerNameMap[s.customer_id] || 'غير محدد' }));
      const confirmedSales = enrichedSales.filter((s: any) => ['confirmed', 'posted', 'paid', 'partial_paid'].includes(s.stage));
      const totalSales = confirmedSales.reduce((s: number, t: any) => s + (t.total_amount || 0), 0);
      const totalPaid = confirmedSales.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0);
      const totalBalance = confirmedSales.reduce((s: number, t: any) => s + (t.balance || 0), 0);

      // Sales by customer (confirmed only!)
      const salesByCustomer: Record<string, { name: string; total: number; count: number; balance: number }> = {};
      for (const s of confirmedSales) {
        const cid = s.customer_id || 'unknown';
        if (!salesByCustomer[cid]) salesByCustomer[cid] = { name: s.resolved_name, total: 0, count: 0, balance: 0 };
        salesByCustomer[cid].total += s.total_amount || 0;
        salesByCustomer[cid].balance += s.balance || 0;
        salesByCustomer[cid].count++;
      }

      context.sales = {
        total_transactions: confirmedSales.length, all_transactions: salesData.length,
        drafts: enrichedSales.filter((s: any) => s.stage === 'draft').length,
        total_revenue: totalSales, total_paid: totalPaid, total_outstanding: totalBalance,
        avg_transaction_value: confirmedSales.length > 0 ? Math.round(totalSales / confirmedSales.length) : 0,
        currency: salesData[0]?.currency || 'USD',
        top_customers: Object.values(salesByCustomer).sort((a, b) => b.total - a.total).slice(0, 10),
        recent_transactions: enrichedSales.slice(0, 10).map((s: any) => ({
          invoice: s.invoice_no || s.delivery_no || '-', customer: s.resolved_name,
          amount: s.total_amount, paid: s.paid_amount || 0, balance: s.balance || 0, stage: s.stage, date: s.created_at,
        })),
      };
    }

    // 6. Sales items (per-invoice detail + material profitability)
    const { data: salesItems } = await supabase.from('sales_transaction_items')
      .select('transaction_id, material_id, item_code, description, description_ar, quantity, unit_price, total, cost_price, color_name, rolls_count, roll_id, roll_code, tax_rate, tax_amount, discount_amount')
      .limit(500);

    if (salesItems && salesItems.length > 0) {
      const allMatIds = [...new Set(salesItems.map((i: any) => i.material_id).filter(Boolean))];
      let matNameMap2: Record<string, string> = {};
      if (allMatIds.length > 0) {
        const { data: matNames } = await supabase.from('fabric_materials').select('id, name_ar, name_en, code').in('id', allMatIds);
        if (matNames) matNames.forEach((m: any) => { matNameMap2[m.id] = `${m.name_ar || m.name_en} (${m.code})`; });
      }

      const txCustomerMap: Record<string, string> = {};
      const txInvoiceMap: Record<string, string> = {};
      const txTaxMap: Record<string, { subtotal: number; tax: number; discount: number }> = {};
      if (salesData) {
        for (const s of salesData) {
          txCustomerMap[s.id] = s.customer_name || customerNameMap[s.customer_id] || '';
          txInvoiceMap[s.id] = s.invoice_no || s.delivery_no || '-';
          txTaxMap[s.id] = { subtotal: s.subtotal || 0, tax: s.tax_amount || 0, discount: s.discount_amount || 0 };
        }
      }

      const itemsByTx: Record<string, any[]> = {};
      for (const item of salesItems) {
        const txId = item.transaction_id;
        if (!itemsByTx[txId]) itemsByTx[txId] = [];
        itemsByTx[txId].push({
          material: matNameMap2[item.material_id] || item.description_ar || item.description || item.item_code || 'غير محدد',
          qty: item.quantity || 0, unit_price: item.unit_price || 0, total: item.total || 0,
          cost_price: item.cost_price || 0, tax_rate: item.tax_rate || 0, tax: item.tax_amount || 0,
          rolls: item.rolls_count || 0, roll_id: item.roll_id || null, color: item.color_name || '',
        });
      }

      context.invoices_detail = Object.entries(itemsByTx).map(([txId, items]) => {
        const taxInfo = txTaxMap[txId] || { subtotal: 0, tax: 0, discount: 0 };
        return {
          invoice: txInvoiceMap[txId] || txId.substring(0, 8), customer: txCustomerMap[txId] || '-',
          items, total_items: items.length, subtotal: taxInfo.subtotal, tax: taxInfo.tax, discount: taxInfo.discount,
          total_amount: items.reduce((s: number, i: any) => s + (i.total || 0), 0) + taxInfo.tax - taxInfo.discount,
        };
      });

      // Aggregate by material
      const salesByMaterial: Record<string, { qty: number; revenue: number; cost: number; name: string }> = {};
      for (const item of salesItems) {
        const mid = item.material_id || item.item_code || 'unknown';
        if (!salesByMaterial[mid]) salesByMaterial[mid] = { qty: 0, revenue: 0, cost: 0, name: matNameMap2[mid] || item.description_ar || item.description || '' };
        salesByMaterial[mid].qty += item.quantity || 0;
        salesByMaterial[mid].revenue += item.total || 0;
        salesByMaterial[mid].cost += (item.cost_price || 0) * (item.quantity || 0);
      }

      context.sales_by_material = Object.entries(salesByMaterial).sort((a, b) => b[1].revenue - a[1].revenue).map(([id, data]) => ({
        material: data.name || id, qty_sold: data.qty, revenue: data.revenue, cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100).toFixed(1) + '%' : '-',
      }));
    }

    // 7. Purchase invoices
    const { data: purchasesData } = await supabase.from('purchase_invoices').select('id, total_amount, stage, created_at').eq('company_id', companyId).limit(100);
    if (purchasesData && purchasesData.length > 0) {
      context.purchases = { total_invoices: purchasesData.length, total_cost: purchasesData.reduce((s: number, t: any) => s + (t.total_amount || 0), 0) };
    }

    // 8. Accounting
    const { data: journalEntries } = await supabase.from('journal_entries')
      .select('id, entry_number, entry_date, entry_type, reference_type, reference_number, description_ar, description, total_debit, total_credit, status, is_posted')
      .eq('company_id', companyId).order('entry_date', { ascending: false }).limit(50);

    if (journalEntries && journalEntries.length > 0) {
      const posted = journalEntries.filter((j: any) => j.is_posted);
      context.accounting = {
        total_entries: journalEntries.length, posted_entries: posted.length,
        total_debit: posted.reduce((s: number, j: any) => s + (j.total_debit || 0), 0),
        total_credit: posted.reduce((s: number, j: any) => s + (j.total_credit || 0), 0),
        recent_entries: journalEntries.slice(0, 10).map((j: any) => ({
          number: j.entry_number, date: j.entry_date, type: j.entry_type, ref: j.reference_type,
          description: j.description_ar || j.description, debit: j.total_debit, credit: j.total_credit,
          status: j.is_posted ? 'posted' : j.status,
        })),
      };
    }

    // 9. Stock movements
    const { data: recentMovements } = await supabase.from('inventory_movements').select('movement_type, quantity, movement_date').eq('company_id', companyId).order('movement_date', { ascending: false }).limit(100);
    if (recentMovements && recentMovements.length > 0) {
      const receipts = recentMovements.filter((m: any) => ['receipt', 'purchase', 'goods_receipt', 'container_receipt'].includes(m.movement_type));
      const issues = recentMovements.filter((m: any) => ['sale', 'issue', 'delivery', 'sale_invoice'].includes(m.movement_type));
      context.stock_movements = {
        total_movements: recentMovements.length, receipts: receipts.length,
        receipts_qty: receipts.reduce((s: number, m: any) => s + (m.quantity || 0), 0),
        issues: issues.length, issues_qty: issues.reduce((s: number, m: any) => s + Math.abs(m.quantity || 0), 0),
      };
    }

    // 10. All materials
    const { data: allMaterials } = await supabase.from('fabric_materials')
      .select('id, code, name_ar, name_en, category, composition, origin_country, season, unit, current_stock, min_stock, purchase_price, selling_price, avg_cost_per_unit, status, default_width, weight_per_meter')
      .eq('company_id', companyId).limit(200);

    if (allMaterials && allMaterials.length > 0) {
      context.all_materials = allMaterials.map((m: any) => ({
        code: m.code, name: m.name_ar || m.name_en, category: m.category || '', composition: m.composition || '',
        width: m.default_width || '', origin: m.origin_country || '', season: m.season || '', unit: m.unit || 'متر',
        stock: m.current_stock || 0, min_stock: m.min_stock || 0, buy_price: m.purchase_price || 0,
        sell_price: m.selling_price || 0, avg_cost: m.avg_cost_per_unit || 0, status: m.status || 'active',
        stock_status: (m.current_stock || 0) <= (m.min_stock || 0) && (m.min_stock || 0) > 0 ? 'LOW' : 'OK',
      }));
    }

    // 11. Rolls with warehouse/location
    const { data: rollsData } = await supabase.from('fabric_rolls')
      .select('id, roll_number, current_length, initial_length, status, material_id, warehouse_id, bin_location_id, color_name, weight')
      .eq('company_id', companyId).in('status', ['available', 'reserved', 'partial']).limit(500);

    if (rollsData && rollsData.length > 0) {
      const warehouseIds = [...new Set(rollsData.map((r: any) => r.warehouse_id).filter(Boolean))];
      let warehouseMap: Record<string, string> = {};
      if (warehouseIds.length > 0) {
        const { data: warehouses } = await supabase.from('warehouses').select('id, name_ar, name, name_en, code').in('id', warehouseIds);
        if (warehouses) warehouses.forEach((w: any) => { warehouseMap[w.id] = `${w.name_ar || w.name || w.name_en || ''} (${w.code || ''})`; });
      }

      const locationIds = [...new Set(rollsData.map((r: any) => r.bin_location_id).filter(Boolean))];
      let locationMap: Record<string, string> = {};
      if (locationIds.length > 0) {
        const { data: locations } = await supabase.from('warehouse_locations').select('id, name, row_label, column_label, shelf_level').in('id', locationIds);
        if (locations) locations.forEach((l: any) => { locationMap[l.id] = l.name || `${l.row_label || ''}${l.column_label || ''}-${l.shelf_level || ''}`; });
      }

      const rollsByMaterial: Record<string, { count: number; totalLength: number; warehouses: Set<string>; locations: Set<string> }> = {};
      for (const r of rollsData) {
        const mid = r.material_id || 'unknown';
        if (!rollsByMaterial[mid]) rollsByMaterial[mid] = { count: 0, totalLength: 0, warehouses: new Set(), locations: new Set() };
        rollsByMaterial[mid].count++;
        rollsByMaterial[mid].totalLength += r.current_length || 0;
        if (r.warehouse_id && warehouseMap[r.warehouse_id]) rollsByMaterial[mid].warehouses.add(warehouseMap[r.warehouse_id]);
        if (r.bin_location_id && locationMap[r.bin_location_id]) rollsByMaterial[mid].locations.add(locationMap[r.bin_location_id]);
      }

      const matIds = Object.keys(rollsByMaterial).filter(id => id !== 'unknown');
      let matNameMap: Record<string, string> = {};
      if (matIds.length > 0) {
        const { data: mats } = await supabase.from('fabric_materials').select('id, name_ar, name_en, code').in('id', matIds);
        if (mats) mats.forEach((m: any) => { matNameMap[m.id] = `${m.name_ar || m.name_en} (${m.code})`; });
      }

      context.rolls_by_material = Object.entries(rollsByMaterial).map(([mid, data]) => ({
        material: matNameMap[mid] || mid, rolls: (data as any).count, total_length: (data as any).totalLength,
        warehouses: [...(data as any).warehouses], locations: [...(data as any).locations],
      }));
    }

    // 12. Customers
    const { data: customers } = await supabase.from('customers').select('id, name_ar, name_en, code, phone, city, balance, credit_limit, email, currency').eq('company_id', companyId).limit(100);
    if (customers && customers.length > 0) {
      const customerSalesBalance: Record<string, number> = {};
      if (salesData) {
        for (const s of salesData) {
          if (s.customer_id && s.balance && s.balance > 0) customerSalesBalance[s.customer_id] = (customerSalesBalance[s.customer_id] || 0) + s.balance;
        }
      }
      context.customers_list = customers.map((c: any) => ({
        name: c.name_ar || c.name_en, code: c.code || '', city: c.city || '', phone: c.phone || '',
        balance: customerSalesBalance[c.id] || c.balance || 0, currency: c.currency || baseCurrency, credit_limit: c.credit_limit || 0,
      }));
    }

    // 13. Suppliers
    const { data: suppliers } = await supabase.from('suppliers').select('id, name_ar, name_en, code, phone, city, balance, credit_limit').eq('company_id', companyId).limit(100);
    if (suppliers && suppliers.length > 0) {
      context.suppliers_list = suppliers.map((s: any) => ({ name: s.name_ar || s.name_en, code: s.code || '', city: s.city || '', balance: s.balance || 0 }));
    }

    // 14. Warehouses
    const { data: warehousesList } = await supabase.from('warehouses').select('id, name_ar, name, name_en, warehouse_type, address, is_active, code').eq('company_id', companyId);
    if (warehousesList && warehousesList.length > 0) {
      context.warehouses = warehousesList.map((w: any) => ({ name: w.name_ar || w.name || w.name_en, code: w.code || '', type: w.warehouse_type || 'regular', address: w.address || '', active: w.is_active !== false }));
    }

    // 15. Containers
    const { data: containersList } = await supabase.from('containers')
      .select('id, container_number, supplier_id, shipping_company, vessel_name, departure_date, arrival_date, origin_country, destination_port, status, total_cost, customs_value, total_landed_cost')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(20);

    if (containersList && containersList.length > 0) {
      const containerIds = containersList.map((c: any) => c.id);
      const { data: containerItems } = await supabase.from('container_items')
        .select('container_id, material_id, expected_quantity, expected_rolls, received_quantity, received_rolls, unit_cost, total_cost, landed_cost_per_unit, total_landed_cost')
        .in('container_id', containerIds);

      const supplierIds = [...new Set(containersList.map((c: any) => c.supplier_id).filter(Boolean))];
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sups } = await supabase.from('suppliers').select('id, name_ar, name_en').in('id', supplierIds);
        if (sups) sups.forEach((s: any) => { supplierMap[s.id] = s.name_ar || s.name_en || ''; });
      }

      context.containers = containersList.map((c: any) => {
        const items = containerItems?.filter((i: any) => i.container_id === c.id) || [];
        return {
          number: c.container_number, supplier: supplierMap[c.supplier_id] || '-', shipping: c.shipping_company || '-',
          origin: c.origin_country || '-', destination: c.destination_port || '-', departure: c.departure_date, arrival: c.arrival_date,
          status: c.status, total_cost: c.total_cost || 0, customs: c.customs_value || 0, landed_cost: c.total_landed_cost || 0,
          items_count: items.length,
          total_expected_rolls: items.reduce((s: number, i: any) => s + (i.expected_rolls || 0), 0),
          total_received_rolls: items.reduce((s: number, i: any) => s + (i.received_rolls || 0), 0),
        };
      });
    }

    // 16. Purchase Receipts
    const { data: receiptsList } = await supabase.from('purchase_receipts').select('id, receipt_number, receipt_date, receipt_type, supplier_id, warehouse_id, status').eq('company_id', companyId).order('receipt_date', { ascending: false }).limit(20);
    if (receiptsList && receiptsList.length > 0) {
      context.purchase_receipts = { count: receiptsList.length, recent: receiptsList.slice(0, 5).map((r: any) => ({ number: r.receipt_number, date: r.receipt_date, type: r.receipt_type, status: r.status })) };
    }

    // 17. Chart of Accounts
    const { data: accounts } = await supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en, account_type_id, is_group, level, balance').eq('company_id', companyId).lte('level', 2);
    if (accounts && accounts.length > 0) {
      const topAccounts = accounts.filter((a: any) => a.level <= 2 && a.is_group);
      context.chart_of_accounts = { total_accounts: accounts.length, top_level: topAccounts.map((a: any) => ({ code: a.account_code, name: a.name_ar || a.name_en, type: a.account_type_id, balance: a.balance || 0 })) };
    }

    // 18. Equity Partners
    const { data: partners } = await supabase.from('equity_partners').select('id, name_ar, name_en, share_percentage, capital_amount, join_date, has_salary, monthly_salary, status').eq('company_id', companyId);
    if (partners && partners.length > 0) {
      context.equity = {
        total_capital: partners.reduce((s: number, p: any) => s + (p.capital_amount || 0), 0),
        partners: partners.map((p: any) => ({ name: p.name_ar || p.name_en, share: p.share_percentage || 0, capital: p.capital_amount || 0, salary: p.has_salary ? p.monthly_salary : 0, status: p.status || 'active' })),
      };
    }

  } catch (err) {
    console.error('[DataFetcher] Error:', err);
  }

  return context;
}

// ═══ Material Context ═══

export async function fetchMaterialContext(supabase: any, materialId: string, companyId: string) {
  const context: any = {};

  const { data: material } = await supabase.from('fabric_materials').select('*').eq('id', materialId).single();
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

  const { data: rolls } = await supabase.from('fabric_rolls').select('id, current_length, status').eq('material_id', materialId).in('status', ['available', 'reserved', 'partial']);
  context.inventory = { rolls_count: rolls?.length || 0, total_length: rolls?.reduce((sum: number, r: any) => sum + (r.current_length || 0), 0) || 0 };

  const { data: movements } = await supabase.from('inventory_movements').select('id, movement_type, quantity, movement_date, reference_type')
    .or(`product_id.eq.${materialId},material_id.eq.${materialId}`).eq('company_id', companyId).order('movement_date', { ascending: false }).limit(20);

  if (movements) {
    const receipts = movements.filter((m: any) => ['receipt', 'purchase', 'goods_receipt', 'container_receipt'].includes(m.movement_type));
    const issues = movements.filter((m: any) => ['sale', 'issue', 'delivery', 'sale_invoice'].includes(m.movement_type));
    context.movement_summary = {
      total_receipts: receipts.length, total_receipt_qty: receipts.reduce((s: number, m: any) => s + (m.quantity || 0), 0),
      total_issues: issues.length, total_issue_qty: issues.reduce((s: number, m: any) => s + Math.abs(m.quantity || 0), 0),
    };
  }

  const { data: salesItems } = await supabase.from('sales_transaction_items').select('quantity, unit_price, total, cost_price').eq('material_id', materialId).limit(50);
  if (salesItems && salesItems.length > 0) {
    const totalSold = salesItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const totalRevenue = salesItems.reduce((s: number, i: any) => s + (i.total || 0), 0);
    context.sales = { count: salesItems.length, total_sold: totalSold, revenue: totalRevenue, avg_price: totalSold > 0 ? totalRevenue / totalSold : 0 };
  }

  const { data: purchaseItems } = await supabase.from('purchase_invoice_items').select('quantity, unit_price, total_price').eq('material_id', materialId).limit(50);
  if (purchaseItems && purchaseItems.length > 0) {
    const totalBought = purchaseItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
    const totalCost = purchaseItems.reduce((s: number, i: any) => s + (i.total_price || 0), 0);
    context.purchases = { count: purchaseItems.length, total_bought: totalBought, cost: totalCost, avg_price: totalBought > 0 ? totalCost / totalBought : 0 };
  }

  return context;
}

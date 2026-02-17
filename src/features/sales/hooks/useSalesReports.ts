
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfMonth, format, parseISO, isSameDay } from 'date-fns';

export const useSalesReports = () => {
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch Logic
    const { data, refetch, isFetching } = useQuery({
        queryKey: ['sales_reports_real', dateRange],
        queryFn: async () => {
            setIsGenerating(true);
            try {
                // 1. Fetch Invoices with Basic Items
                // We avoid deep nested joins to prevent 400 errors and improve performance
                const { data: invoices, error: invError } = await supabase
                    .from('sales_transactions')
                    .select(`
                        id, 
                        doc_date, 
                        invoice_no, 
                        total_amount, 
                        stage, 
                        customer_id,
                        created_by,
                        items:sales_transaction_items(
                            id, quantity, total, total_cost, product_id
                        )
                    `)
                    .gte('doc_date', format(dateRange.from, 'yyyy-MM-dd'))
                    .lte('doc_date', format(dateRange.to, 'yyyy-MM-dd'))
                    .neq('stage', 'cancelled');

                if (invError) throw invError;
                if (!invoices) return { daily: [], products: [], customers: [], salespersons: [], regions: [], categories: [], returns: [], profit: [] };

                // 2. Extract IDs for Batch Fetching
                const customerIds = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))];
                const userIds = [...new Set(invoices.map(i => i.created_by).filter(Boolean))];
                const productIds = [...new Set(invoices.flatMap(i => i.items.map((it: any) => it.product_id)).filter(Boolean))];

                // 3. Fetch Related Data in Parallel
                const [customersRes, usersRes, productsRes] = await Promise.all([
                    customerIds.length ? supabase.from('customers').select('id, name, city, region').in('id', customerIds) : { data: [] },
                    userIds.length ? supabase.from('user_profiles').select('id, full_name').in('id', userIds) : { data: [] },
                    productIds.length ? supabase.from('products').select('id, code, name, category:product_categories(name)').in('id', productIds) : { data: [] }
                ]);

                // Create Lookup Maps
                const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c]));
                const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
                const productMapLookup = new Map((productsRes.data || []).map((p: any) => [p.id, p]));

                // 4. Transform Data

                // A. Daily Sales
                const dailyMap = new Map();
                invoices.forEach(inv => {
                    const date = inv.doc_date;
                    const existing = dailyMap.get(date) || { date, invoices: 0, totalSales: 0, returns: 0, netSales: 0 };
                    const amount = Math.abs(inv.total_amount || 0); // Use absolute for calculations
                    const isReturn = (inv.total_amount || 0) < 0; // Negative amount implies return

                    existing.invoices += 1;
                    if (isReturn) {
                        existing.returns += amount;
                        existing.netSales -= amount;
                    } else {
                        existing.totalSales += amount;
                        existing.netSales += amount;
                    }
                    dailyMap.set(date, existing);
                });
                const dailySales = Array.from(dailyMap.values())
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((d: any, i, arr) => {
                        const prev = arr[i - 1]?.netSales || 0;
                        return { ...d, growth: prev ? Math.round(((d.netSales - prev) / prev) * 100) : 0 };
                    });

                // B. Product & Category
                const prodStats = new Map();
                const catStats = new Map();
                let totalSalesAll = 0;

                invoices.forEach(inv => {
                    if ((inv.total_amount || 0) < 0) return; // Skip returns for product sales
                    inv.items.forEach((item: any) => {
                        const prod = productMapLookup.get(item.product_id);
                        if (!prod) return;

                        // Product Stats
                        const pStat = prodStats.get(prod.id) || {
                            code: prod.code, name: prod.name, category: prod.category?.name || 'Uncategorized',
                            quantity: 0, totalSales: 0, profit: 0
                        };
                        pStat.quantity += (item.quantity || 0);
                        pStat.totalSales += (item.total || 0);
                        pStat.profit += ((item.total || 0) - (item.total_cost || 0));
                        prodStats.set(prod.id, pStat);

                        // Category Stats
                        const catName = prod.category?.name || 'Uncategorized';
                        const cStat = catStats.get(catName) || { category: catName, sales: 0, items: 0 };
                        cStat.sales += (item.total || 0);
                        cStat.items += (item.quantity || 0);
                        catStats.set(catName, cStat);

                        totalSalesAll += (item.total || 0);
                    });
                });

                const productSales = Array.from(prodStats.values()).map(p => ({
                    ...p, margin: p.totalSales ? Math.round((p.profit / p.totalSales) * 100) : 0
                }));
                const categoryData = Array.from(catStats.values()).map(c => ({
                    ...c, percentage: totalSalesAll ? Math.round((c.sales / totalSalesAll) * 100) : 0
                }));

                // C. Customer & Region
                const custStats = new Map();
                const regionStats = new Map();

                invoices.forEach(inv => {
                    const cust = customerMap.get(inv.customer_id);
                    if (!cust) return;
                    const amount = inv.total_amount || 0;

                    // Customer
                    const cStat = custStats.get(cust.id) || {
                        name: cust.name, region: cust.city || cust.region || 'Unknown',
                        invoices: 0, totalSales: 0, lastPurchase: inv.doc_date
                    };
                    cStat.invoices += 1;
                    cStat.totalSales += amount;
                    if (new Date(inv.doc_date) > new Date(cStat.lastPurchase)) cStat.lastPurchase = inv.doc_date;
                    custStats.set(cust.id, cStat);

                    // Region
                    const regionName = cust.city || cust.region || 'Unknown';
                    const rStat = regionStats.get(regionName) || { region: regionName, sales: 0, invoices: 0, customers: new Set() };
                    rStat.sales += amount;
                    rStat.invoices += 1;
                    rStat.customers.add(cust.id);
                    regionStats.set(regionName, rStat);
                });

                const customerSales = Array.from(custStats.values());
                const regionData = Array.from(regionStats.values()).map(r => ({ ...r, customers: r.customers.size, growth: 0 }));

                // D. Salesperson
                const agentStats = new Map();
                invoices.forEach(inv => {
                    const user = userMap.get(inv.created_by);
                    if (!user) return; // Skip if no user found
                    const amount = inv.total_amount || 0;

                    const aStat = agentStats.get(inv.created_by) || { name: user.full_name || 'Unknown', sales: 0, target: 100000 };
                    aStat.sales += amount;
                    agentStats.set(inv.created_by, aStat);
                });
                const salespersonData = Array.from(agentStats.values()).map(a => ({
                    ...a, commission: a.sales * 0.02, achievement: Math.round((a.sales / a.target) * 100)
                }));

                // E. Returns
                const returnsData = invoices
                    .filter(inv => (inv.total_amount || 0) < 0)
                    .map(inv => ({
                        date: inv.doc_date,
                        originalInvoice: 'N/A',
                        customer: customerMap.get(inv.customer_id)?.name || 'Unknown',
                        amount: Math.abs(inv.total_amount),
                        reason: 'Return',
                        status: inv.stage
                    }));

                // F. Profit (Monthly)
                const profitStats = new Map();
                invoices.forEach(inv => {
                    const month = inv.doc_date.substring(0, 7);
                    const pStat = profitStats.get(month) || { period: month, revenue: 0, cogs: 0 };

                    let cost = 0;
                    inv.items.forEach((item: any) => cost += (item.total_cost || 0));

                    pStat.revenue += (inv.total_amount || 0);
                    pStat.cogs += cost;
                    profitStats.set(month, pStat);
                });
                const profitData = Array.from(profitStats.values()).map(p => ({
                    ...p, grossProfit: p.revenue - p.cogs, margin: p.revenue ? Math.round(((p.revenue - p.cogs) / p.revenue) * 100) : 0
                })).sort((a, b) => b.period.localeCompare(a.period));

                return {
                    daily: dailySales,
                    products: productSales,
                    customers: customerSales,
                    salespersons: salespersonData,
                    regions: regionData,
                    categories: categoryData,
                    returns: returnsData,
                    profit: profitData
                };

            } catch (err) {
                console.error(err);
                return { daily: [], products: [], customers: [], salespersons: [], regions: [], categories: [], returns: [], profit: [] };
            } finally {
                setIsGenerating(false);
            }
        },
        enabled: false, // Wait for manual trigger
        staleTime: Infinity, // Keep data until next generate
    });

    return {
        dateRange,
        setDateRange,
        generateReport: refetch,
        isGenerating: isFetching || isGenerating,
        dailySales: data?.daily || [],
        productSales: data?.products || [],
        customerSales: data?.customers || [],
        salespersonData: data?.salespersons || [],
        regionData: data?.regions || [],
        categoryData: data?.categories || [],
        returnsData: data?.returns || [],
        profitData: data?.profit || [],
    };
};

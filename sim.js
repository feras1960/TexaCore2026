const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.wzkklenfsaepegymfxfz:EH7NytvJA#t/yEE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require',
});

async function run() {
  const companyId = '1313232a-6ad3-4002-891c-a9a9e8849a93';
  
  const { rows: rolls } = await pool.query("SELECT material_id, warehouse_id, color_id, current_length, reserved_length, cost_per_meter, status FROM fabric_rolls WHERE company_id = $1 AND status IN ('available', 'reserved', 'partial')", [companyId]);
  const { rows: mats } = await pool.query("SELECT id, name_ar, purchase_price, current_stock FROM fabric_materials WHERE company_id = $1 AND status = 'active'", [companyId]);
  const { rows: stockData } = await pool.query("SELECT material_id, warehouse_id, quantity_on_hand, average_cost FROM inventory_stock WHERE company_id = $1", [companyId]);
  
  const materialMap = new Map();
  for(const m of mats) {
    materialMap.set(m.id, {
        id: m.id,
        name: m.name_ar,
        purchase_price: Number(m.purchase_price) || 0,
        current_stock: Number(m.current_stock) || 0,
        total_meters: 0,
        loose_stock: 0,
        total_stock_value: 0
    });
  }
  
  const costAccumulator = new Map();
  for(const roll of rolls) {
    const existing = materialMap.get(roll.material_id);
    if(!existing) continue;
    const len = Number(roll.current_length) || 0;
    const cost = Number(roll.cost_per_meter) || 0;
    existing.total_meters += len;
    if (cost > 0) {
        const acc = costAccumulator.get(roll.material_id) || { totalCost: 0, count: 0 };
        acc.totalCost += cost * len;
        acc.count += len;
        costAccumulator.set(roll.material_id, acc);
    }
  }
  
  const stockByMaterial = new Map();
  for(const sr of stockData) {
    if(!sr.material_id) continue;
    const qty = Number(sr.quantity_on_hand) || 0;
    if(qty <= 0) continue;
    if(!stockByMaterial.has(sr.material_id)) stockByMaterial.set(sr.material_id, []);
    stockByMaterial.get(sr.material_id).push({
        qty,
        avg_cost: Number(sr.average_cost) || 0
    });
  }
  
  for(const [matId, row] of materialMap.entries()) {
    const acc = costAccumulator.get(matId);
    if(acc && acc.count > 0) {
        row.total_stock_value = acc.totalCost;
    }
    const stockEntries = stockByMaterial.get(matId);
    let totalStockQty = 0;
    if(stockEntries) {
        totalStockQty = stockEntries.reduce((s, e) => s + e.qty, 0);
    }
    
    if(totalStockQty > 0 || stockEntries) {
        row.current_stock = Math.max(totalStockQty, row.total_meters);
    } else {
        row.current_stock = Math.max(row.current_stock, row.total_meters);
    }
    row.loose_stock = Math.max(0, row.current_stock - row.total_meters);
    
    if(stockEntries) {
        if(row.total_stock_value === 0 && row.current_stock > 0) {
            const totalFromStock = stockEntries.reduce((s, e) => s + (e.qty * (e.avg_cost || row.purchase_price)), 0);
            if(totalFromStock > 0) {
                row.total_stock_value = totalFromStock;
            } else if(row.purchase_price > 0) {
                row.total_stock_value = row.current_stock * row.purchase_price;
            }
        }
    } else {
        if(row.total_stock_value === 0 && row.current_stock > 0 && row.purchase_price > 0) {
            row.total_stock_value = row.current_stock * row.purchase_price;
        }
    }
  }
  
  const materials = Array.from(materialMap.values());
  // apply filters.showEmpty = false equivalent
  const filtered = materials.filter(m => m.total_meters > 0 || m.loose_stock > 0);
  
  let totalMeters = 0;
  let totalLoose = 0;
  let totalValue = 0;
  
  filtered.forEach(m => {
    totalMeters += m.total_meters;
    totalLoose += m.loose_stock;
    totalValue += m.total_stock_value;
  });
  
  console.log('Total Materials:', filtered.length);
  console.log('Total Meters (sum of loosely UI format):', totalMeters + totalLoose);
  console.log('Total Value:', totalValue);
  
  process.exit(0);
}

run().catch(console.error);

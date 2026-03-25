# 📦 المخزون والمستودعات API
# Inventory & Warehouses API

---

## 📋 نظرة عامة

وحدة المخزون تشمل:
- المنتجات (Products)
- فئات المنتجات (Product Categories)
- المستودعات (Warehouses)
- مواقع التخزين (Bin Locations)
- حركات المخزون (Inventory Movements)
- رولونات الأقمشة (Fabric Rolls) - خاص بـ TexaCore

---

## 1️⃣ المنتجات (Products)

### الجدول: `products`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| sku | varchar | رمز المنتج |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| category_id | uuid | الفئة |
| uom_id | uuid | وحدة القياس |
| cost_price | decimal | سعر التكلفة |
| sale_price | decimal | سعر البيع |
| min_stock | decimal | الحد الأدنى |
| max_stock | decimal | الحد الأقصى |
| is_active | boolean | نشط |
| track_inventory | boolean | تتبع المخزون |
| barcode | varchar | الباركود |

### 📖 GET - جلب المنتجات

```typescript
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    category:product_categories(id, name_ar, name_en),
    uom:uom(id, code, name_ar)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name_ar');
```

### 📖 GET - منتج واحد مع الكميات

```typescript
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    category:product_categories(*),
    uom:uom(*),
    stock_levels:stock_levels(
      warehouse_id,
      quantity,
      reserved_quantity,
      warehouse:warehouses(id, name_ar)
    )
  `)
  .eq('id', productId)
  .single();
```

#### Response

```json
{
  "id": "prod-uuid",
  "sku": "FAB-001",
  "name_ar": "قماش قطني أبيض",
  "name_en": "White Cotton Fabric",
  "cost_price": 25.00,
  "sale_price": 40.00,
  "min_stock": 100,
  "category": {
    "id": "cat-uuid",
    "name_ar": "أقمشة قطنية"
  },
  "uom": {
    "id": "uom-uuid",
    "code": "MTR",
    "name_ar": "متر"
  },
  "stock_levels": [
    {
      "warehouse_id": "wh-uuid-1",
      "quantity": 500,
      "reserved_quantity": 50,
      "warehouse": {
        "id": "wh-uuid-1",
        "name_ar": "المستودع الرئيسي"
      }
    }
  ]
}
```

### 📝 POST - إنشاء منتج

```typescript
const { data, error } = await supabase
  .from('products')
  .insert({
    company_id: companyId,
    sku: 'FAB-002',
    name_ar: 'قماش بوليستر أزرق',
    name_en: 'Blue Polyester Fabric',
    category_id: categoryId,
    uom_id: uomId,
    cost_price: 30.00,
    sale_price: 50.00,
    min_stock: 50,
    track_inventory: true
  })
  .select()
  .single();
```

### ✏️ PUT - تحديث منتج

```typescript
const { data, error } = await supabase
  .from('products')
  .update({
    sale_price: 55.00,
    min_stock: 75
  })
  .eq('id', productId)
  .select()
  .single();
```

---

## 2️⃣ فئات المنتجات (Product Categories)

### الجدول: `product_categories`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| parent_id | uuid | الفئة الأب |
| is_active | boolean | نشطة |

### 📖 GET - جلب الفئات (شجرية)

```typescript
const { data, error } = await supabase
  .from('product_categories')
  .select(`
    *,
    parent:product_categories!parent_id(id, name_ar),
    products_count:products(count)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true)
  .order('name_ar');
```

### 📝 POST - إنشاء فئة

```typescript
const { data, error } = await supabase
  .from('product_categories')
  .insert({
    company_id: companyId,
    code: 'COTTON',
    name_ar: 'أقمشة قطنية',
    name_en: 'Cotton Fabrics',
    parent_id: null  // فئة رئيسية
  })
  .select()
  .single();
```

---

## 3️⃣ المستودعات (Warehouses)

### الجدول: `warehouses`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| code | varchar | الرمز |
| name_ar | varchar | الاسم بالعربية |
| name_en | varchar | الاسم بالإنجليزية |
| address | text | العنوان |
| manager_id | uuid | معرف المدير |
| is_active | boolean | نشط |
| is_default | boolean | افتراضي |

### 📖 GET - جلب المستودعات

```typescript
const { data, error } = await supabase
  .from('warehouses')
  .select(`
    *,
    manager:user_profiles!manager_id(id, full_name),
    locations_count:bin_locations(count)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);
```

### 📖 GET - مستودع بالتفاصيل

```typescript
const { data, error } = await supabase
  .from('warehouses')
  .select(`
    *,
    manager:user_profiles!manager_id(id, full_name, phone),
    locations:bin_locations(*),
    stock_summary:stock_levels(
      product:products(id, sku, name_ar),
      quantity
    )
  `)
  .eq('id', warehouseId)
  .single();
```

### 📝 POST - إنشاء مستودع

```typescript
const { data, error } = await supabase
  .from('warehouses')
  .insert({
    company_id: companyId,
    code: 'WH01',
    name_ar: 'المستودع الرئيسي',
    name_en: 'Main Warehouse',
    address: 'المنطقة الصناعية - الرياض',
    manager_id: managerId
  })
  .select()
  .single();
```

---

## 4️⃣ مواقع التخزين (Bin Locations)

### الجدول: `bin_locations`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| warehouse_id | uuid | معرف المستودع |
| code | varchar | رمز الموقع |
| aisle | varchar | الممر |
| rack | varchar | الرف |
| shelf | varchar | الرفة |
| bin | varchar | الخانة |
| is_active | boolean | نشط |

### 📖 GET - جلب المواقع

```typescript
const { data, error } = await supabase
  .from('bin_locations')
  .select('*')
  .eq('warehouse_id', warehouseId)
  .eq('is_active', true)
  .order('code');
```

### 📝 POST - إنشاء موقع

```typescript
const { data, error } = await supabase
  .from('bin_locations')
  .insert({
    warehouse_id: warehouseId,
    code: 'A-01-01-01',
    aisle: 'A',
    rack: '01',
    shelf: '01',
    bin: '01'
  })
  .select()
  .single();
```

---

## 5️⃣ حركات المخزون (Inventory Movements)

### الجدول: `inventory_movements`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| movement_type | varchar | نوع الحركة |
| reference_type | varchar | نوع المرجع |
| reference_id | uuid | معرف المرجع |
| product_id | uuid | معرف المنتج |
| warehouse_id | uuid | معرف المستودع |
| from_warehouse_id | uuid | من مستودع (للتحويل) |
| to_warehouse_id | uuid | إلى مستودع (للتحويل) |
| quantity | decimal | الكمية |
| unit_cost | decimal | تكلفة الوحدة |
| movement_date | date | تاريخ الحركة |
| notes | text | ملاحظات |
| created_by | uuid | أنشئ بواسطة |

### أنواع الحركات

| النوع | الوصف |
|-------|-------|
| `receipt` | استلام |
| `sale` | بيع |
| `transfer` | تحويل |
| `adjustment` | تسوية |
| `return_in` | مرتجع مبيعات |
| `return_out` | مرتجع مشتريات |

### 📖 GET - جلب الحركات

```typescript
const { data, error } = await supabase
  .from('inventory_movements')
  .select(`
    *,
    product:products(id, sku, name_ar),
    warehouse:warehouses(id, name_ar),
    created_by_user:user_profiles!created_by(full_name)
  `)
  .eq('company_id', companyId)
  .order('movement_date', { ascending: false })
  .limit(100);
```

### فلترة الحركات

```typescript
// حركات منتج معين
const { data } = await supabase
  .from('inventory_movements')
  .select('*')
  .eq('product_id', productId)
  .order('movement_date', { ascending: false });

// حركات مستودع معين
const { data } = await supabase
  .from('inventory_movements')
  .select('*')
  .eq('warehouse_id', warehouseId);

// حركات بنوع معين
const { data } = await supabase
  .from('inventory_movements')
  .select('*')
  .eq('movement_type', 'receipt');

// حركات بفترة زمنية
const { data } = await supabase
  .from('inventory_movements')
  .select('*')
  .gte('movement_date', '2026-01-01')
  .lte('movement_date', '2026-01-31');
```

### 📝 POST - تسجيل حركة استلام

```typescript
const { data, error } = await supabase
  .from('inventory_movements')
  .insert({
    company_id: companyId,
    movement_type: 'receipt',
    reference_type: 'purchase_invoice',
    reference_id: purchaseInvoiceId,
    product_id: productId,
    warehouse_id: warehouseId,
    quantity: 100,
    unit_cost: 25.00,
    movement_date: '2026-02-05',
    notes: 'استلام شحنة من المورد'
  })
  .select()
  .single();
```

### 📝 POST - تسجيل حركة تحويل

```typescript
const { data, error } = await supabase
  .from('inventory_movements')
  .insert({
    company_id: companyId,
    movement_type: 'transfer',
    product_id: productId,
    from_warehouse_id: fromWarehouseId,
    to_warehouse_id: toWarehouseId,
    quantity: 50,
    movement_date: '2026-02-05',
    notes: 'تحويل للمستودع الفرعي'
  })
  .select()
  .single();
```

### 📝 POST - تسجيل تسوية مخزون

```typescript
const { data, error } = await supabase
  .from('inventory_movements')
  .insert({
    company_id: companyId,
    movement_type: 'adjustment',
    product_id: productId,
    warehouse_id: warehouseId,
    quantity: -5,  // سالب للنقص، موجب للزيادة
    movement_date: '2026-02-05',
    notes: 'تسوية جرد - نقص'
  })
  .select()
  .single();
```

---

## 6️⃣ مستويات المخزون (Stock Levels)

### الجدول: `stock_levels`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| product_id | uuid | معرف المنتج |
| warehouse_id | uuid | معرف المستودع |
| quantity | decimal | الكمية المتاحة |
| reserved_quantity | decimal | الكمية المحجوزة |

### 📖 GET - مستويات المخزون

```typescript
// كل المخزون
const { data } = await supabase
  .from('stock_levels')
  .select(`
    *,
    product:products(id, sku, name_ar, min_stock),
    warehouse:warehouses(id, name_ar)
  `)
  .eq('product.company_id', companyId);

// مخزون منتج معين
const { data } = await supabase
  .from('stock_levels')
  .select(`
    *,
    warehouse:warehouses(id, name_ar)
  `)
  .eq('product_id', productId);

// مخزون مستودع معين
const { data } = await supabase
  .from('stock_levels')
  .select(`
    *,
    product:products(id, sku, name_ar)
  `)
  .eq('warehouse_id', warehouseId);
```

### منتجات تحت الحد الأدنى

```typescript
const { data: lowStock } = await supabase
  .rpc('get_low_stock_products', {
    p_company_id: companyId
  });

// أو يدوياً
const { data } = await supabase
  .from('products')
  .select(`
    id, sku, name_ar, min_stock,
    stock_levels(quantity, warehouse_id)
  `)
  .eq('company_id', companyId)
  .eq('is_active', true);

// ثم فلترة المنتجات التي إجمالي كميتها أقل من min_stock
```

---

## 7️⃣ رولونات الأقمشة (Fabric Rolls) - TexaCore

### الجدول: `fabric_rolls`

| العمود | النوع | الوصف |
|--------|------|-------|
| id | uuid | المعرف الفريد |
| tenant_id | uuid | معرف المستأجر |
| company_id | uuid | معرف الشركة |
| roll_number | varchar | رقم الرولون |
| material_id | uuid | معرف الخامة |
| color_id | uuid | معرف اللون |
| warehouse_id | uuid | معرف المستودع |
| bin_location_id | uuid | موقع التخزين |
| length | decimal | الطول (متر) |
| width | decimal | العرض (سم) |
| weight | decimal | الوزن (كجم) |
| dye_lot | varchar | رقم دفعة الصبغ |
| batch_id | uuid | معرف الدفعة |
| container_id | uuid | معرف الكونتينر |
| unit_cost | decimal | تكلفة الوحدة |
| status | varchar | الحالة |
| notes | text | ملاحظات |

### 📖 GET - جلب الرولونات

```typescript
const { data, error } = await supabase
  .from('fabric_rolls')
  .select(`
    *,
    material:fabric_materials(id, code, name_ar),
    color:fabric_colors(id, code, name_ar, hex_code),
    warehouse:warehouses(id, name_ar),
    location:bin_locations(id, code),
    container:containers(id, container_number)
  `)
  .eq('company_id', companyId)
  .eq('status', 'available')
  .order('roll_number');
```

### فلترة الرولونات

```typescript
// حسب الخامة
const { data } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('material_id', materialId);

// حسب اللون
const { data } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('color_id', colorId);

// حسب دفعة الصبغ
const { data } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('dye_lot', 'DL-2026-001');

// حسب الكونتينر
const { data } = await supabase
  .from('fabric_rolls')
  .select('*')
  .eq('container_id', containerId);
```

### 📝 POST - إضافة رولون

```typescript
const { data, error } = await supabase
  .from('fabric_rolls')
  .insert({
    company_id: companyId,
    roll_number: 'R-2026-0001',
    material_id: materialId,
    color_id: colorId,
    warehouse_id: warehouseId,
    bin_location_id: locationId,
    length: 100,
    width: 150,
    weight: 25,
    dye_lot: 'DL-2026-001',
    container_id: containerId,
    unit_cost: 25.00,
    status: 'available'
  })
  .select()
  .single();
```

### حالات الرولون

| الحالة | الوصف |
|--------|-------|
| `available` | متاح للبيع |
| `reserved` | محجوز |
| `sold` | مباع |
| `defective` | معيب |
| `returned` | مرتجع |

---

## 8️⃣ استعلامات تقارير المخزون

### إجمالي المخزون

```typescript
const { data } = await supabase
  .rpc('get_inventory_summary', {
    p_company_id: companyId,
    p_warehouse_id: warehouseId  // اختياري
  });
```

### تقادم المخزون

```typescript
const { data } = await supabase
  .from('fabric_rolls')
  .select(`
    *,
    material:fabric_materials(name_ar)
  `)
  .eq('company_id', companyId)
  .eq('status', 'available')
  .lt('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()); // أكثر من 180 يوم
```

### حركة بطيئة

```typescript
const { data } = await supabase
  .rpc('get_slow_moving_products', {
    p_company_id: companyId,
    p_days: 90  // لم تتحرك منذ 90 يوم
  });
```

---

## ⚠️ قواعد الأعمال

### 1. لا يمكن بيع أكثر من المتاح

```typescript
const checkAvailability = async (productId: string, warehouseId: string, quantity: number) => {
  const { data } = await supabase
    .from('stock_levels')
    .select('quantity, reserved_quantity')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .single();

  const available = (data?.quantity || 0) - (data?.reserved_quantity || 0);
  
  if (quantity > available) {
    throw new Error(`الكمية المتاحة ${available} فقط`);
  }
  
  return true;
};
```

### 2. تحديث المخزون تلقائياً

```sql
-- يتم عبر trigger عند إضافة حركة
-- الحركات الموجبة تزيد المخزون
-- الحركات السالبة تنقص المخزون
```

---

**التالي:** [sales.md](./sales.md) - المبيعات

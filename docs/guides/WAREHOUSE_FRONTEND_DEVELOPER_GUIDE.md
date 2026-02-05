# 📦 التوثيق الشامل لقسم المستودعات
# Warehouse Module Complete Documentation

**تاريخ التوثيق**: 2 فبراير 2026  
**الإصدار**: 3.0 - النسخة النهائية المُحققة  
**إجمالي جداول المستودعات**: 24 جدول  
**الحالة**: ✅ تم التحقق والتنفيذ بنجاح

---

## 📋 فهرس المحتويات

1. [ملخص التحقق](#1-ملخص-التحقق)
2. [الجداول الكاملة](#2-الجداول-الكاملة)
3. [العلاقات بين الجداول](#3-العلاقات)
4. [سياسات RLS](#4-سياسات-rls)
5. [الدوال والـ Triggers](#5-الدوال)
6. [خريطة الميزات](#6-خريطة-الميزات)
7. [دليل التكامل](#7-دليل-التكامل)

---

## 1. ملخص التحقق {#1-ملخص-التحقق}

### ✅ تم التحقق في 2 فبراير 2026

| البند | العدد | الحالة |
|-------|-------|--------|
| إجمالي الجداول في قاعدة البيانات | 172 | ✅ |
| جداول المستودعات | 24 | ✅ |
| جداول الأقمشة | 4 | ✅ |
| جداول الكونتينرات | 8 | ✅ |
| جداول التسليم | 2 | ✅ |
| جداول الحجوزات | 2 | ✅ |
| جداول الجرد | 2 | ✅ (تم إنشاؤها) |
| جداول العينات | 2 | ✅ |

### 📊 الجداول المُنفذة حديثاً (2 فبراير 2026)

| الجدول | الوصف | الحالة |
|--------|-------|--------|
| `stock_counts` | جرد المخزون | ✅ تم الإنشاء |
| `stock_count_items` | بنود الجرد | ✅ تم الإنشاء |

---

## 2. الجداول الكاملة {#2-الجداول-الكاملة}

### 📦 2.1 جداول المستودعات الأساسية

#### `warehouses` - المستودعات
```sql
CREATE TABLE warehouses (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    branch_id UUID REFERENCES branches(id),
    code VARCHAR(50) NOT NULL,              -- كود فريد
    name_ar VARCHAR(200) NOT NULL,          -- الاسم بالعربية
    name_en VARCHAR(200),                   -- الاسم بالإنجليزية
    warehouse_type VARCHAR(50),             -- main, branch, store, van
    is_main BOOLEAN DEFAULT FALSE,          -- المستودع الرئيسي
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_id UUID,                        -- مدير المستودع
    capacity INT,                           -- السعة القصوى
    is_active BOOLEAN DEFAULT TRUE,
    allows_negative_stock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, company_id, code)
);
```
**البيانات الحالية**: 1 صف (مستودع أوديسا)

---

#### `bin_locations` - مواقع التخزين
> الاسم البديل لـ `warehouse_locations`

```sql
CREATE TABLE bin_locations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    code VARCHAR(50) NOT NULL,              -- كود الموقع
    name VARCHAR(100),                      -- اسم الموقع
    aisle VARCHAR(20),                      -- الممر
    rack VARCHAR(20),                       -- الرف
    shelf VARCHAR(20),                      -- الرفة
    bin VARCHAR(20),                        -- الخانة
    barcode VARCHAR(100),                   -- باركود
    capacity DECIMAL(15,3),                 -- السعة
    capacity_unit_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, code)
);
```

---

#### `warehouse_settings` - إعدادات المستودعات
```sql
CREATE TABLE warehouse_settings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    costing_method VARCHAR(20) DEFAULT 'average',  -- fifo, lifo, average
    require_dispatch_approval BOOLEAN DEFAULT FALSE,
    dispatch_approval_roles JSONB,
    default_reservation_hours INT DEFAULT 48,
    warn_dye_lot_mismatch BOOLEAN DEFAULT TRUE,
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    barcode_format VARCHAR(20) DEFAULT 'CODE128',
    auto_generate_roll_barcode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `warehouse_assignments` - تعيينات الموظفين
```sql
CREATE TABLE warehouse_assignments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    user_id UUID NOT NULL,
    role VARCHAR(50),                       -- manager, employee, viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, user_id)
);
```

---

### 🧵 2.2 جداول الأقمشة والمواد

#### `fabric_materials` - المواد/الأقمشة
```sql
CREATE TABLE fabric_materials (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    code VARCHAR(50),                       -- كود المادة
    name_ar VARCHAR(200) NOT NULL,          -- الاسم بالعربية
    name_en VARCHAR(200),                   -- الاسم بالإنجليزية
    group_id UUID REFERENCES fabric_groups(id),
    category VARCHAR(50),
    composition VARCHAR(500),               -- التركيب
    default_width DECIMAL(10,2),            -- العرض الافتراضي
    weight_per_meter DECIMAL(10,4),         -- الوزن/متر
    unit VARCHAR(20) DEFAULT 'meter',       -- meter, yard, kg
    purchase_price DECIMAL(15,4),
    selling_price DECIMAL(15,4),
    min_stock DECIMAL(15,2),                -- الحد الأدنى
    reorder_point DECIMAL(15,2),
    origin_country VARCHAR(100),
    default_supplier_id UUID,
    images JSONB,
    custom_fields JSONB,
    -- حقول الشجرية (Master Data Tree Pattern)
    parent_id UUID REFERENCES fabric_materials(id),
    is_group BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 0,
    path TEXT,
    unit_id UUID,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 9 صفوف

---

#### `fabric_groups` - تصنيفات الأقمشة
```sql
CREATE TABLE fabric_groups (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    parent_id UUID REFERENCES fabric_groups(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 5 صفوف

---

#### `fabric_colors` - الألوان
```sql
CREATE TABLE fabric_colors (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),
    code VARCHAR(50),
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    hex_code VARCHAR(10),                   -- #FFFFFF
    pantone_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 10 صفوف

---

#### `fabric_rolls` - الرولونات
```sql
CREATE TABLE fabric_rolls (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    roll_number VARCHAR(100) NOT NULL,      -- رقم فريد
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID REFERENCES bin_locations(id),
    initial_length DECIMAL(10,2),           -- الطول الأصلي
    current_length DECIMAL(10,2),           -- الطول الحالي
    reserved_length DECIMAL(10,2) DEFAULT 0,
    width DECIMAL(10,2),
    weight DECIMAL(10,3),
    batch_id UUID REFERENCES batches(id),
    dye_lot VARCHAR(100),                   -- رقم الصبغة
    shade VARCHAR(20),                      -- light, medium, dark
    quality_grade VARCHAR(20),              -- A, B, C
    cost_per_meter DECIMAL(15,4),
    supplier_id UUID,
    container_id UUID REFERENCES containers(id),
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, sold, damaged
    barcode VARCHAR(100),
    qr_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, roll_number)
);
```

---

### 🚢 2.3 جداول الكونتينرات

#### `containers` - الكونتينرات
```sql
CREATE TABLE containers (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    container_number VARCHAR(100) NOT NULL,
    origin_country VARCHAR(100),
    shipping_line VARCHAR(200),
    bill_of_lading VARCHAR(100),
    departure_date DATE,
    expected_arrival DATE,
    arrival_date DATE,
    received_date DATE,
    total_rolls INT DEFAULT 0,
    received_rolls INT DEFAULT 0,
    total_value DECIMAL(18,4),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(30) DEFAULT 'ordered',   -- ordered, shipped, in_transit, arrived, receiving, completed
    warehouse_id UUID REFERENCES warehouses(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, container_number)
);
```
**البيانات الحالية**: 3 صفوف

---

#### `container_items` - بنود الكونتينر
```sql
CREATE TABLE container_items (
    id UUID PRIMARY KEY,
    container_id UUID NOT NULL REFERENCES containers(id),
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    ordered_quantity DECIMAL(15,3),
    ordered_rolls INT,
    received_quantity DECIMAL(15,3),
    received_rolls INT,
    unit_cost DECIMAL(15,4),
    line_total DECIMAL(18,4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 18 صف

---

#### `container_expenses` - مصاريف الكونتينر
```sql
CREATE TABLE container_expenses (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    container_id UUID NOT NULL REFERENCES containers(id),
    expense_type VARCHAR(50),               -- shipping, customs, insurance, handling, other
    description TEXT,
    amount DECIMAL(18,4),
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    amount_local DECIMAL(18,4),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    account_id UUID,
    vendor_id UUID,
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 12 صف

---

#### `container_reservations` - حجوزات الكونتينر
```sql
CREATE TABLE container_reservations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    reservation_number VARCHAR(50),
    container_id UUID NOT NULL REFERENCES containers(id),
    customer_id UUID REFERENCES customers(id),
    material_id UUID REFERENCES fabric_materials(id),
    color_id UUID REFERENCES fabric_colors(id),
    reserved_quantity DECIMAL(15,3),
    reserved_rolls INT,
    deposit_amount DECIMAL(18,4),
    deposit_paid BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',    -- active, fulfilled, cancelled, expired
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 4 صفوف

---

#### `container_quotations` - عروض أسعار الكونتينرات
```sql
CREATE TABLE container_quotations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    quotation_number VARCHAR(50),
    container_id UUID REFERENCES containers(id),
    customer_id UUID REFERENCES customers(id),
    quotation_date DATE,
    valid_until DATE,
    total_amount DECIMAL(18,4),
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الحالية**: 3 صفوف

---

### 🚚 2.4 جداول التسليم

#### `delivery_notes` - إذونات التسليم
```sql
CREATE TABLE delivery_notes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    note_number VARCHAR(50) NOT NULL,
    note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sales_order_id UUID,
    customer_id UUID REFERENCES customers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    delivery_method VARCHAR(30),            -- to_store, to_customer_address, direct
    delivery_address TEXT,
    driver_id UUID,
    driver_name VARCHAR(200),
    vehicle_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'draft',     -- draft, pending_approval, approved, shipped, delivered
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    expected_delivery_date DATE,
    delivered_at TIMESTAMPTZ,
    receiver_name VARCHAR(200),
    receiver_signature TEXT,
    shipping_cost DECIMAL(18,4),
    total_amount DECIMAL(18,4),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, note_number)
);
```

---

#### `delivery_note_items` - بنود إذن التسليم
```sql
CREATE TABLE delivery_note_items (
    id UUID PRIMARY KEY,
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id),
    product_id UUID,
    material_id UUID REFERENCES fabric_materials(id),
    roll_id UUID REFERENCES fabric_rolls(id),
    description TEXT,
    quantity_ordered DECIMAL(15,3),
    quantity_to_deliver DECIMAL(15,3),
    quantity_delivered DECIMAL(15,3),
    unit VARCHAR(20),
    batch_id UUID,
    dye_lot VARCHAR(100),
    unit_price DECIMAL(18,4),
    line_total DECIMAL(18,4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 📋 2.5 جداول الحجوزات

#### `reservations` - الحجوزات
```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    reservation_number VARCHAR(50),
    customer_id UUID REFERENCES customers(id),
    order_id UUID,
    warehouse_id UUID REFERENCES warehouses(id),
    total_amount DECIMAL(18,4),
    deposit_amount DECIMAL(18,4),
    deposit_paid BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending',   -- pending, active, fulfilled, expired, cancelled
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `reservation_items` - بنود الحجز
```sql
CREATE TABLE reservation_items (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    roll_id UUID REFERENCES fabric_rolls(id),
    material_id UUID REFERENCES fabric_materials(id),
    product_id UUID,
    reserved_quantity DECIMAL(15,3),
    reserved_length DECIMAL(10,2),
    unit_price DECIMAL(18,4),
    line_total DECIMAL(18,4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 📊 2.6 جداول الجرد ✅ (تم إنشاؤها حديثاً)

#### `stock_counts` - جرد المخزون
```sql
CREATE TABLE stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    count_number VARCHAR(50) NOT NULL,      -- رقم الجرد
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    location_id UUID REFERENCES bin_locations(id),
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    planned_date DATE,
    completed_date DATE,
    count_type VARCHAR(30) DEFAULT 'full',  -- full, partial, cycle, random, by_material
    status VARCHAR(20) DEFAULT 'planned',   -- planned, in_progress, completed, cancelled
    total_items INT DEFAULT 0,
    counted_items INT DEFAULT 0,
    match_count INT DEFAULT 0,
    variance_count INT DEFAULT 0,
    notes TEXT,
    created_by UUID,
    completed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, count_number)
);
```

**أنواع الجرد المدعومة**:
| النوع | الوصف |
|-------|-------|
| `full` | جرد كامل للمستودع |
| `partial` | جرد جزئي لموقع محدد |
| `cycle` | جرد دوري منتظم |
| `random` | جرد عشوائي |
| `by_material` | جرد حسب المادة |

---

#### `stock_count_items` - بنود الجرد
```sql
CREATE TABLE stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    roll_id UUID REFERENCES fabric_rolls(id),
    product_id UUID REFERENCES products(id),
    material_id UUID REFERENCES fabric_materials(id),
    batch_id UUID REFERENCES batches(id),
    location_id UUID REFERENCES bin_locations(id),
    system_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,  -- الكمية في النظام
    actual_quantity DECIMAL(15,3),                      -- الكمية الفعلية
    variance DECIMAL(15,3) GENERATED ALWAYS AS (COALESCE(actual_quantity, 0) - system_quantity) STORED,
    unit_cost DECIMAL(15,4) DEFAULT 0,
    is_counted BOOLEAN DEFAULT FALSE,
    counted_at TIMESTAMPTZ,
    counted_by UUID,
    notes TEXT,
    variance_reason VARCHAR(100),           -- damaged, theft, error, found, other
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### ✂️ 2.7 جداول العينات

#### `sample_cuttings` - العينات
```sql
CREATE TABLE sample_cuttings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    request_number VARCHAR(50),
    roll_id UUID REFERENCES fabric_rolls(id),
    material_id UUID REFERENCES fabric_materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    request_date DATE DEFAULT CURRENT_DATE,
    requested_length DECIMAL(10,2),
    actual_length DECIMAL(10,2),
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(200),
    purpose TEXT,
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
    status VARCHAR(20) DEFAULT 'pending',   -- pending, approved, cutting, ready, distributed
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    cut_by UUID,
    cut_at TIMESTAMPTZ,
    distributed_by UUID,
    distributed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `sample_cutting_items` - بنود العينة
```sql
CREATE TABLE sample_cutting_items (
    id UUID PRIMARY KEY,
    sample_cutting_id UUID NOT NULL REFERENCES sample_cuttings(id),
    roll_id UUID REFERENCES fabric_rolls(id),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 📈 2.8 جداول الحركات والمخزون

#### `inventory_movements` - حركات المخزون
```sql
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    movement_number VARCHAR(50),
    movement_date DATE DEFAULT CURRENT_DATE,
    movement_type VARCHAR(30),              -- receive, sale, transfer, cut, return, adjustment
    roll_id UUID REFERENCES fabric_rolls(id),
    material_id UUID REFERENCES fabric_materials(id),
    product_id UUID,
    warehouse_id UUID REFERENCES warehouses(id),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    from_location_id UUID,
    to_location_id UUID,
    quantity DECIMAL(15,3),
    quantity_before DECIMAL(15,3),
    quantity_after DECIMAL(15,3),
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(18,4),
    reference_type VARCHAR(50),             -- purchase_invoice, sales_invoice, transfer, adjustment
    reference_id UUID,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `batches` - الدفعات
```sql
CREATE TABLE batches (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    product_id UUID,
    material_id UUID REFERENCES fabric_materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    supplier_id UUID,
    received_date DATE,
    expiry_date DATE,
    manufacturing_date DATE,
    initial_quantity DECIMAL(15,3),
    current_quantity DECIMAL(15,3),
    unit_cost DECIMAL(15,4),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, batch_number)
);
```

---

#### `stock_ledger` - سجل المخزون
```sql
CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    product_id UUID,
    material_id UUID REFERENCES fabric_materials(id),
    warehouse_id UUID REFERENCES warehouses(id),
    location_id UUID,
    quantity_on_hand DECIMAL(15,3) DEFAULT 0,
    quantity_reserved DECIMAL(15,3) DEFAULT 0,
    quantity_available DECIMAL(15,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    avg_cost DECIMAL(15,4),
    last_movement_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, material_id, location_id)
);
```

---

## 3. العلاقات بين الجداول {#3-العلاقات}

### 📊 مخطط العلاقات (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSE MODULE ERD                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────┐      ┌──────────────┐      ┌───────────────┐                  │
│  │ tenants  │─────▶│  companies   │─────▶│  warehouses   │                  │
│  └──────────┘      └──────────────┘      └───────┬───────┘                  │
│                                                   │                          │
│                    ┌──────────────────────────────┼──────────────────┐       │
│                    │                              │                  │       │
│                    ▼                              ▼                  ▼       │
│            ┌───────────────┐            ┌─────────────────┐  ┌────────────┐  │
│            │ bin_locations │            │warehouse_settings│  │ warehouse_ │  │
│            └───────┬───────┘            └─────────────────┘  │ assignments│  │
│                    │                                          └────────────┘  │
│                    │                                                          │
│  ┌─────────────────┴───────────────────────────────────────────────┐         │
│  │                                                                  │         │
│  ▼                              ▼                                   ▼         │
│  ┌────────────┐          ┌──────────────┐                   ┌─────────────┐  │
│  │fabric_rolls│◄─────────│fabric_materials│                  │ containers  │  │
│  └─────┬──────┘          └──────┬───────┘                   └──────┬──────┘  │
│        │                        │                                   │         │
│        │ ↓↓↓                    │                                   │         │
│  ┌─────┴──────────────────┐     │                                   │         │
│  │ • inventory_movements  │     ▼                                   ▼         │
│  │ • reservation_items    │  ┌───────────┐                  ┌───────────────┐│
│  │ • sample_cuttings      │  │fabric_    │                  │container_items││
│  │ • stock_count_items    │  │groups     │                  │container_     ││
│  │ • delivery_note_items  │  └───────────┘                  │expenses       ││
│  └────────────────────────┘                                 │container_     ││
│                                                             │reservations   ││
│                                                             └───────────────┘│
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         STOCK MANAGEMENT                                 │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                          │ │
│  │  stock_counts ────▶ stock_count_items                                   │ │
│  │       │                     │                                            │ │
│  │       ▼                     ▼                                            │ │
│  │  [warehouse_id]        [roll_id, material_id, product_id]               │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 📋 قائمة العلاقات التفصيلية

| من الجدول | العلاقة | إلى الجدول | نوع العلاقة |
|-----------|---------|-----------|-------------|
| `warehouses` | `tenant_id` | `tenants` | N:1 |
| `warehouses` | `company_id` | `companies` | N:1 |
| `warehouses` | `branch_id` | `branches` | N:1 |
| `bin_locations` | `warehouse_id` | `warehouses` | N:1 |
| `warehouse_assignments` | `warehouse_id` | `warehouses` | N:1 |
| `fabric_materials` | `group_id` | `fabric_groups` | N:1 |
| `fabric_materials` | `parent_id` | `fabric_materials` | N:1 (شجرية) |
| `fabric_rolls` | `material_id` | `fabric_materials` | N:1 |
| `fabric_rolls` | `warehouse_id` | `warehouses` | N:1 |
| `fabric_rolls` | `location_id` | `bin_locations` | N:1 |
| `fabric_rolls` | `color_id` | `fabric_colors` | N:1 |
| `fabric_rolls` | `batch_id` | `batches` | N:1 |
| `fabric_rolls` | `container_id` | `containers` | N:1 |
| `containers` | `warehouse_id` | `warehouses` | N:1 |
| `container_items` | `container_id` | `containers` | N:1 |
| `container_items` | `material_id` | `fabric_materials` | N:1 |
| `container_expenses` | `container_id` | `containers` | N:1 |
| `container_reservations` | `container_id` | `containers` | N:1 |
| `container_reservations` | `customer_id` | `customers` | N:1 |
| `delivery_notes` | `warehouse_id` | `warehouses` | N:1 |
| `delivery_notes` | `customer_id` | `customers` | N:1 |
| `delivery_note_items` | `delivery_note_id` | `delivery_notes` | N:1 |
| `delivery_note_items` | `roll_id` | `fabric_rolls` | N:1 |
| `reservations` | `warehouse_id` | `warehouses` | N:1 |
| `reservations` | `customer_id` | `customers` | N:1 |
| `reservation_items` | `reservation_id` | `reservations` | N:1 |
| `reservation_items` | `roll_id` | `fabric_rolls` | N:1 |
| `stock_counts` | `warehouse_id` | `warehouses` | N:1 |
| `stock_counts` | `location_id` | `bin_locations` | N:1 |
| `stock_count_items` | `stock_count_id` | `stock_counts` | N:1 |
| `stock_count_items` | `roll_id` | `fabric_rolls` | N:1 |
| `stock_count_items` | `material_id` | `fabric_materials` | N:1 |
| `sample_cuttings` | `roll_id` | `fabric_rolls` | N:1 |
| `sample_cuttings` | `customer_id` | `customers` | N:1 |
| `inventory_movements` | `warehouse_id` | `warehouses` | N:1 |
| `inventory_movements` | `roll_id` | `fabric_rolls` | N:1 |
| `inventory_movements` | `material_id` | `fabric_materials` | N:1 |
| `batches` | `warehouse_id` | `warehouses` | N:1 |
| `batches` | `material_id` | `fabric_materials` | N:1 |
| `stock_ledger` | `warehouse_id` | `warehouses` | N:1 |
| `stock_ledger` | `material_id` | `fabric_materials` | N:1 |

---

## 4. سياسات RLS {#4-سياسات-rls}

### ✅ الجداول المفعّل عليها RLS

| الجدول | RLS | نوع السياسة |
|--------|-----|-------------|
| `warehouses` | ✅ | tenant_isolation |
| `bin_locations` | ✅ | tenant_isolation |
| `warehouse_settings` | ✅ | tenant_isolation |
| `warehouse_assignments` | ✅ | tenant_isolation |
| `fabric_materials` | ✅ | tenant_isolation |
| `fabric_groups` | ✅ | tenant_isolation |
| `fabric_colors` | ✅ | tenant_isolation |
| `fabric_rolls` | ✅ | tenant_isolation |
| `containers` | ✅ | tenant_isolation |
| `container_items` | ✅ | via container |
| `container_expenses` | ✅ | tenant_isolation |
| `container_reservations` | ✅ | tenant_isolation |
| `delivery_notes` | ✅ | tenant_isolation |
| `delivery_note_items` | ✅ | via delivery_note |
| `reservations` | ✅ | tenant_isolation |
| `reservation_items` | ✅ | via reservation |
| `stock_counts` | ✅ | authenticated |
| `stock_count_items` | ✅ | authenticated |
| `sample_cuttings` | ✅ | tenant_isolation |
| `inventory_movements` | ✅ | tenant_isolation |
| `batches` | ✅ | tenant_isolation |
| `stock_ledger` | ✅ | tenant_isolation |

### 📝 نموذج سياسة RLS

```sql
-- Tenant Isolation Policy
CREATE POLICY tenant_isolation ON table_name
    FOR ALL 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Authenticated Access Policy
CREATE POLICY authenticated_access ON table_name
    FOR ALL 
    USING (auth.role() = 'authenticated');
```

---

## 5. الدوال والـ Triggers {#5-الدوال}

### 📋 الدوال المتاحة

| الدالة | الوصف | الملف |
|--------|-------|-------|
| `generate_stock_count_number()` | توليد رقم جرد | migration |
| `complete_stock_count()` | إتمام الجرد | migration |
| `approve_delivery_note()` | الموافقة على إذن التسليم | migration |
| `confirm_delivery()` | تأكيد التسليم | migration |
| `generate_delivery_note_number()` | توليد رقم إذن التسليم | migration |
| `calculate_container_costs()` | حساب تكاليف الكونتينر | migration |

### 🔄 الـ Triggers

| Trigger | الجدول | الحدث | الوصف |
|---------|--------|-------|-------|
| `tr_stock_counts_updated` | `stock_counts` | UPDATE | تحديث updated_at |
| `tr_update_roll_quantity` | `fabric_rolls` | INSERT/UPDATE | تحديث الكميات |
| `tr_update_stock_ledger` | `inventory_movements` | INSERT | تحديث سجل المخزون |

---

## 6. خريطة الميزات {#6-خريطة-الميزات}

### ✅ الميزات المتاحة

| الميزة | الجداول | الحالة | الأولوية |
|--------|---------|--------|----------|
| **إدارة المستودعات** | warehouses, bin_locations, warehouse_settings | ✅ مكتمل | P0 |
| **إدارة المواد** | fabric_materials, fabric_groups, fabric_colors | ✅ مكتمل | P0 |
| **الشجرة الهرمية للمواد** | fabric_materials (parent_id, is_group) | ✅ مكتمل | P0 |
| **إدارة الرولونات** | fabric_rolls | ✅ مكتمل | P0 |
| **تتبع الدفعات** | batches, dye_lot | ✅ مكتمل | P1 |
| **الكونتينرات** | containers, container_items, container_expenses | ✅ مكتمل | P1 |
| **حجوزات الكونتينر** | container_reservations | ✅ مكتمل | P1 |
| **الحجوزات العامة** | reservations, reservation_items | ✅ مكتمل | P1 |
| **إذونات التسليم** | delivery_notes, delivery_note_items | ✅ مكتمل | P1 |
| **الموافقة على التسليم** | requires_approval, approved_by | ✅ مكتمل | P2 |
| **العينات** | sample_cuttings, sample_cutting_items | ✅ مكتمل | P2 |
| **حركات المخزون** | inventory_movements | ✅ مكتمل | P0 |
| **سجل المخزون** | stock_ledger | ✅ مكتمل | P1 |
| **الجرد الكامل** | stock_counts (type=full) | ✅ مكتمل | P1 |
| **الجرد الجزئي** | stock_counts (type=partial) | ✅ مكتمل | P1 |
| **الجرد حسب المادة** | stock_counts (type=by_material) | ✅ مكتمل | P2 |
| **تسوية الفروقات** | stock_count_items.variance | ✅ مكتمل | P2 |
| **تعيين الموظفين** | warehouse_assignments | ✅ مكتمل | P2 |
| **الباركود** | barcode, qr_code | ✅ مكتمل | P2 |

---

## 7. دليل التكامل {#7-دليل-التكامل}

### 🔗 التكامل مع المحاسبة

| العملية | القيد المحاسبي |
|---------|---------------|
| استلام كونتينر | مدين: مخزون، دائن: موردين |
| بيع رولون | مدين: تكلفة مبيعات، دائن: مخزون |
| تسوية جرد (عجز) | مدين: خسائر مخزون، دائن: مخزون |
| تسوية جرد (زيادة) | مدين: مخزون، دائن: إيرادات أخرى |
| عينة مجانية | مدين: مصاريف تسويق، دائن: مخزون |

### 📱 التكامل مع الجوال (TexaMobile)

| الميزة | API Endpoint | الحالة |
|--------|-------------|--------|
| جرد المخزون | `/api/stock-counts` | ✅ |
| مسح الباركود | `/api/scan-barcode` | ✅ |
| تأكيد التسليم | `/api/confirm-delivery` | ✅ |
| تحديث الكميات | `/api/update-quantity` | ✅ |

---

## 📁 الملفات المرتبطة

### Migrations (مُرتبة تاريخياً):
```
supabase/migrations/
├── 00007_add_inventory_and_products.sql
├── 00009_add_fabric_module.sql
├── 00010_add_shipments_module.sql
├── 20260202_warehouse_enhancements.sql
├── 20260202_add_materials_columns.sql
└── 20260203_stock_counts_and_samples.sql (+ الجرد يدوياً)
```

### Services:
```
src/services/
└── warehouseService.ts
```

### التوثيق:
```
.gemini/
├── WAREHOUSE_FRONTEND_DEVELOPER_GUIDE.md (هذا الملف)
├── WAREHOUSE_ACCOUNTING_INTEGRATION.md
└── WAREHOUSE_TABLES_SCAN_REPORT.md
```

---

**تم التحقق والتوثيق في**: 2 فبراير 2026  
**بواسطة**: Antigravity AI Assistant  
**الحالة**: ✅ مكتمل ومُحقق

/**
 * TexaCore ERP - Database Types
 * Generated for API Documentation
 * Last Updated: 2026-02-05
 */

// =============================================================================
// ENUMS
// =============================================================================

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
export type InvoiceStatus = 'draft' | 'posted' | 'partial' | 'paid' | 'cancelled';
export type JournalEntryStatus = 'draft' | 'posted' | 'cancelled';
export type ContainerStatus = 'draft' | 'booked' | 'in_transit' | 'at_port' | 'customs' | 'received' | 'closed';
export type MovementType = 'receipt' | 'sale' | 'transfer' | 'adjustment' | 'return_in' | 'return_out';
export type FundType = 'cash' | 'bank' | 'petty_cash';
export type PaymentMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'mada';
export type RollStatus = 'available' | 'reserved' | 'sold' | 'defective' | 'returned';
export type UserLevel = 'platform' | 'tenant' | 'company' | 'branch' | 'user';

// =============================================================================
// BASE TYPES
// =============================================================================

export interface BaseEntity {
    id: string;
    created_at: string;
    updated_at?: string;
}

export interface TenantEntity extends BaseEntity {
    tenant_id: string;
}

export interface CompanyEntity extends TenantEntity {
    company_id: string;
}

// =============================================================================
// AUTH & USERS
// =============================================================================

export interface UserProfile extends BaseEntity {
    tenant_id: string | null;
    company_id: string | null;
    branch_id: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    language: string;
    timezone: string;
    is_active: boolean;
}

export interface Role extends TenantEntity {
    company_id: string | null;
    code: string;
    name_ar: string;
    name_en: string;
    level: UserLevel;
    permissions: Record<string, string[]>;
    visible_modules: string[];
    is_system: boolean;
    is_active: boolean;
}

export interface UserRole extends BaseEntity {
    user_id: string;
    role_id: string;
    company_id: string | null;
    branch_id: string | null;
    is_active: boolean;
    assigned_by: string | null;
    assigned_at: string;
}

// =============================================================================
// SAAS & MULTI-TENANCY
// =============================================================================

export interface Brand extends BaseEntity {
    code: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    is_active: boolean;
}

export interface Tenant extends BaseEntity {
    brand_id: string;
    partner_id: string | null;
    code: string;
    name: string;
    email: string;
    phone: string | null;
    country: string;
    industry: string | null;
    subscription_plan_id: string | null;
    subscription_status: SubscriptionStatus;
    trial_ends_at: string | null;
    is_active: boolean;
}

export interface Company extends TenantEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    tax_number: string | null;
    commercial_register: string | null;
    address: string | null;
    city: string | null;
    country: string;
    currency: string;
    logo_url: string | null;
    is_active: boolean;
}

export interface Branch extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    is_main: boolean;
}

export interface SubscriptionPlan extends BaseEntity {
    code: string;
    name_ar: string;
    name_en: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    max_users: number;
    max_companies: number;
    max_storage_gb: number;
    features: Record<string, boolean>;
    is_active: boolean;
}

// =============================================================================
// ACCOUNTING
// =============================================================================

export interface AccountType extends BaseEntity {
    code: string;
    name_ar: string;
    name_en: string;
    balance_type: 'debit' | 'credit';
    display_order: number;
}

export interface ChartOfAccount extends CompanyEntity {
    account_code: string;
    name_ar: string;
    name_en: string | null;
    account_type_id: string;
    parent_id: string | null;
    is_group: boolean;
    level: number;
    currency: string;
    is_active: boolean;
    is_system: boolean;
    current_balance: number;
}

export interface JournalEntry extends CompanyEntity {
    entry_number: string;
    entry_date: string;
    description: string;
    total_debit: number;
    total_credit: number;
    status: JournalEntryStatus;
    is_posted: boolean;
    posted_at: string | null;
    posted_by: string | null;
    reference_type: string | null;
    reference_id: string | null;
}

export interface JournalEntryLine extends TenantEntity {
    entry_id: string;
    line_number: number;
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
    cost_center_id: string | null;
}

export interface FiscalYear extends CompanyEntity {
    name: string;
    start_date: string;
    end_date: string;
    is_closed: boolean;
    is_current: boolean;
}

export interface AccountingPeriod extends CompanyEntity {
    fiscal_year_id: string;
    name: string;
    period_number: number;
    start_date: string;
    end_date: string;
    is_closed: boolean;
}

export interface CostCenter extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    parent_id: string | null;
    is_active: boolean;
}

// =============================================================================
// CUSTOMERS & SUPPLIERS
// =============================================================================

export interface Customer extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    customer_group_id: string | null;
    account_id: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    tax_number: string | null;
    credit_limit: number;
    payment_terms: number;
    is_active: boolean;
}

export interface CustomerGroup extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    discount_percent: number;
    account_id: string | null;
}

export interface Supplier extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    supplier_group_id: string | null;
    account_id: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    tax_number: string | null;
    payment_terms: number;
    is_active: boolean;
}

export interface SupplierGroup extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    account_id: string | null;
}

// =============================================================================
// INVENTORY
// =============================================================================

export interface Product extends CompanyEntity {
    sku: string;
    name_ar: string;
    name_en: string | null;
    category_id: string | null;
    uom_id: string;
    cost_price: number;
    sale_price: number;
    min_stock: number;
    max_stock: number | null;
    is_active: boolean;
    track_inventory: boolean;
    barcode: string | null;
}

export interface ProductCategory extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    parent_id: string | null;
    is_active: boolean;
}

export interface UOM extends BaseEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
}

export interface Warehouse extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    address: string | null;
    manager_id: string | null;
    is_active: boolean;
    is_default: boolean;
}

export interface BinLocation extends BaseEntity {
    warehouse_id: string;
    code: string;
    aisle: string | null;
    rack: string | null;
    shelf: string | null;
    bin: string | null;
    is_active: boolean;
}

export interface StockLevel extends BaseEntity {
    product_id: string;
    warehouse_id: string;
    quantity: number;
    reserved_quantity: number;
}

export interface InventoryMovement extends CompanyEntity {
    movement_type: MovementType;
    reference_type: string | null;
    reference_id: string | null;
    product_id: string;
    warehouse_id: string;
    from_warehouse_id: string | null;
    to_warehouse_id: string | null;
    quantity: number;
    unit_cost: number | null;
    movement_date: string;
    notes: string | null;
    created_by: string | null;
}

// Fabric-specific (TexaCore)
export interface FabricRoll extends CompanyEntity {
    roll_number: string;
    material_id: string;
    color_id: string | null;
    warehouse_id: string;
    bin_location_id: string | null;
    length: number;
    width: number | null;
    weight: number | null;
    dye_lot: string | null;
    batch_id: string | null;
    container_id: string | null;
    unit_cost: number;
    status: RollStatus;
    notes: string | null;
}

// =============================================================================
// SALES
// =============================================================================

export interface SalesInvoice extends CompanyEntity {
    branch_id: string | null;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    customer_id: string;
    salesperson_id: string | null;
    warehouse_id: string | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    paid_amount: number;
    status: InvoiceStatus;
    notes: string | null;
    created_by: string | null;
    posted_at: string | null;
    posted_by: string | null;
}

export interface SalesInvoiceItem extends BaseEntity {
    invoice_id: string;
    line_number: number;
    product_id: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
}

export interface Quotation extends CompanyEntity {
    quotation_number: string;
    quotation_date: string;
    valid_until: string;
    customer_id: string;
    total_amount: number;
    status: string;
    converted_to_invoice_id: string | null;
}

export interface PriceList extends CompanyEntity {
    code: string;
    name_ar: string;
    name_en: string | null;
    currency: string;
    is_default: boolean;
    is_active: boolean;
}

export interface PriceListItem extends BaseEntity {
    price_list_id: string;
    product_id: string;
    price: number;
    min_quantity: number;
}

// =============================================================================
// PURCHASES
// =============================================================================

export interface PurchaseInvoice extends CompanyEntity {
    invoice_number: string;
    supplier_invoice_number: string | null;
    invoice_date: string;
    due_date: string;
    supplier_id: string;
    warehouse_id: string | null;
    container_id: string | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    exchange_rate: number;
    paid_amount: number;
    status: InvoiceStatus;
}

export interface PurchaseInvoiceItem extends BaseEntity {
    invoice_id: string;
    line_number: number;
    product_id: string;
    description: string | null;
    quantity: number;
    unit_cost: number;
    discount_percent: number;
    tax_rate: number;
    line_total: number;
}

export interface Container extends CompanyEntity {
    container_number: string;
    booking_date: string;
    etd: string | null;
    eta: string | null;
    actual_arrival: string | null;
    supplier_id: string | null;
    port_of_loading: string | null;
    port_of_discharge: string | null;
    container_size: string | null;
    fob_value: number;
    currency: string;
    status: ContainerStatus;
}

export interface ContainerExpense extends BaseEntity {
    container_id: string;
    expense_type: string;
    description: string | null;
    amount: number;
    currency: string;
    exchange_rate: number;
    vendor_name: string | null;
    invoice_number: string | null;
    expense_date: string;
    is_allocated: boolean;
}

// =============================================================================
// TREASURY
// =============================================================================

export interface Fund extends CompanyEntity {
    branch_id: string | null;
    code: string;
    name_ar: string;
    name_en: string | null;
    fund_type: FundType;
    account_id: string | null;
    currency: string;
    opening_balance: number;
    current_balance: number;
    is_default: boolean;
    is_active: boolean;
}

export interface FundTransaction extends CompanyEntity {
    fund_id: string;
    transaction_number: string;
    transaction_type: string;
    transaction_date: string;
    amount: number;
    reference_type: string | null;
    reference_id: string | null;
    description: string | null;
    balance_after: number;
    created_by: string | null;
}

export interface PaymentReceipt extends CompanyEntity {
    receipt_number: string;
    receipt_date: string;
    customer_id: string;
    fund_id: string;
    invoice_id: string | null;
    amount: number;
    payment_method: PaymentMethod;
    check_number: string | null;
    check_date: string | null;
    bank_name: string | null;
    notes: string | null;
    status: string;
}

export interface PaymentVoucher extends CompanyEntity {
    voucher_number: string;
    voucher_date: string;
    supplier_id: string | null;
    employee_id: string | null;
    fund_id: string;
    invoice_id: string | null;
    amount: number;
    payment_method: PaymentMethod;
    expense_type: string | null;
    notes: string | null;
    status: string;
}

export interface FundTransfer extends CompanyEntity {
    transfer_number: string;
    transfer_date: string;
    from_fund_id: string;
    to_fund_id: string;
    amount: number;
    description: string | null;
    status: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
    data: T | null;
    error: ApiError | null;
}

export interface ApiError {
    code: string;
    message: string;
    details?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export type CreateCustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>;
export type UpdateCustomerInput = Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'company_id'>>;

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>;
export type UpdateProductInput = Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'company_id'>>;

export interface CreateSalesInvoiceInput {
    customer_id: string;
    warehouse_id: string;
    invoice_date: string;
    due_date: string;
    discount_amount?: number;
    notes?: string;
    items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent?: number;
        description?: string;
    }>;
}

export interface CreateJournalEntryInput {
    entry_date: string;
    description: string;
    lines: Array<{
        account_id: string;
        debit: number;
        credit: number;
        description?: string;
        cost_center_id?: string;
    }>;
}

export interface CreatePaymentReceiptInput {
    customer_id: string;
    fund_id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    invoice_id?: string;
    check_number?: string;
    check_date?: string;
    bank_name?: string;
    notes?: string;
}

// =============================================================================
// RPC FUNCTION TYPES
// =============================================================================

export interface RPCFunctions {
    // Identity checks
    is_platform_owner: () => boolean;
    is_platform_admin: () => boolean;
    is_tenant_owner: () => boolean;
    is_tenant_admin: () => boolean;
    is_company_admin: (args: { p_company_id: string }) => boolean;

    // Context retrieval
    get_user_tenant_id: () => string | null;
    get_user_company_id: () => string | null;
    get_user_brand_id: () => string | null;
    get_user_branch_id: () => string | null;

    // Access checks
    can_access_company: (args: { p_company_id: string }) => boolean;
    can_access_branch: (args: { p_branch_id: string }) => boolean;
    can_access_warehouse: (args: { p_warehouse_id: string; p_action: string }) => boolean;
    check_row_access: (args: { p_tenant_id: string; p_company_id?: string }) => boolean;

    // List retrieval
    get_user_accessible_company_ids: () => string[];
    get_partner_tenant_ids: () => string[];
    get_user_visible_modules: () => string[];
    get_user_permissions: () => Record<string, string[]>;
    get_user_warehouse_ids: () => string[];

    // Accounting
    get_account_balance: (args: { p_account_id: string; p_as_of_date?: string }) => number;
    get_next_entry_number: (args: { p_company_id: string; p_prefix: string }) => string;
    check_entry_balanced: (args: { p_entry_id: string }) => boolean;

    // Inventory
    get_available_quantity: (args: { p_product_id: string; p_warehouse_id: string }) => number;
    reserve_quantity: (args: {
        p_product_id: string;
        p_warehouse_id: string;
        p_quantity: number;
        p_reference_type: string;
        p_reference_id: string;
    }) => string;

    // Statistics
    get_dashboard_stats: (args: {
        p_company_id: string;
        p_from_date: string;
        p_to_date: string;
    }) => DashboardStats;
    get_top_customers: (args: {
        p_company_id: string;
        p_from_date: string;
        p_to_date: string;
        p_limit: number;
    }) => TopCustomer[];
    get_low_stock_products: (args: { p_company_id: string }) => LowStockProduct[];
}

export interface DashboardStats {
    total_sales: number;
    total_purchases: number;
    total_customers: number;
    total_suppliers: number;
    receivables: number;
    payables: number;
}

export interface TopCustomer {
    customer_id: string;
    customer_name: string;
    total_sales: number;
    invoice_count: number;
}

export interface LowStockProduct {
    product_id: string;
    sku: string;
    name_ar: string;
    current_qty: number;
    min_stock: number;
}

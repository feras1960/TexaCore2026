/**
 * Unified Accounting Sheet - Types and Interfaces
 * أنواع وواجهات الشيت الموحد للمحاسبة
 */

// Document types supported by the unified sheet
export type UnifiedDocType =
    | 'account'      // حساب
    | 'fund'         // صندوق/بنك
    | 'party'        // عميل/مورد
    | 'journal'      // قيد محاسبي
    | 'cash'         // يومية صندوق
    | 'receipt'      // سند قبض
    | 'payment'      // سند صرف
    | 'transfer'     // تحويل
    | 'exchange'     // صرافة
    | 'warehouse'    // مستودع
    | 'material'      // مادة (NEW)
    | 'materialGroup' // مجموعة مواد (NEW)
    | 'transaction' // عملية مفردة
    | 'trade_order'    // طلب تجاري (NEW)
    | 'trade_request'  // طلب شراء (NEW)
    | 'trade_invoice'  // فاتورة تجارية (NEW)
    | 'trade_quotation'
    | 'trade_receipt'  // استلام بضاعة/خدمة
    | 'trade_return'   // مرتجع
    | 'trade_delivery' // إذن تسليم (Delivery Note)
    | 'trade_reservation' // حجز (Stock/Transit)
    | 'trade_reservation' // حجز (Stock/Transit)
    | 'trade_container' // كونتينر / شحنة (Container/Shipment)
    | 'contact'        // جهة اتصال CRM
    | 'debit_note'     // إشعار مدين
    | 'credit_note';   // إشعار دائن

// Mode of the sheet
export type SheetMode = 'view' | 'edit' | 'create';

// Tab definition
export interface TabConfig {
    id: string;
    labelKey: string;        // Translation key
    icon: string;            // Icon name from lucide-react
    component: string;       // Component name to render
    showInModes?: SheetMode[];
    badge?: string;          // Optional badge (e.g., count)
    hidden?: boolean;
}

// Action definition
export interface ActionConfig {
    id: string;
    labelKey: string;
    icon: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    showInModes?: SheetMode[];
    requiresConfirm?: boolean;
    confirmMessageKey?: string;
    shortcut?: string;
}

// Stats card definition
export interface StatConfig {
    id: string;
    labelKey: string;
    valueKey: string;        // Path to value in data object
    icon: string;
    format?: 'number' | 'currency' | 'date' | 'percent';
    colorClass?: string;
}

// Document config for each doc type
export interface DocumentConfig {
    type: UnifiedDocType;
    titleKey: string;
    subtitleKey: string;
    icon: string;
    iconColor: string;
    tabs: TabConfig[];
    actions: ActionConfig[];
    stats: StatConfig[];
    defaultTab: string;
    supportsModes: SheetMode[];
    headerFields: string[];  // Fields to show in header
}

// Props for the unified sheet
export interface UnifiedAccountingSheetProps {
    // Basic
    isOpen: boolean;
    onClose: () => void;

    // Document Type
    docType: UnifiedDocType;

    // Mode
    mode?: SheetMode;

    // Data
    data?: any;                // Data for view/edit
    options?: any;             // Additional options (e.g. dropdown lists)
    documentId?: string;       // For loading from API
    companyId?: string;        // For edit permission check
    tradeMode?: 'sales' | 'purchase'; // Sales vs Purchase mode for smart tabs

    // Tabs
    defaultTab?: string;
    allowedTabs?: string[];
    hiddenTabs?: string[];

    // Callbacks
    onSave?: (data: any) => Promise<void>;
    onDelete?: () => Promise<void>;
    onPost?: () => Promise<void>;
    onUnpost?: () => Promise<void>;  // NEW: For unposting entries
    onDuplicate?: () => void;
    onPrint?: () => void;
    onRefresh?: () => void;
    onNavigate?: (docType: UnifiedDocType, id: string) => void;
    onModeChange?: (mode: SheetMode) => void;

    // Edit Flow Integration (NEW)
    enableEditFlow?: boolean;         // Enable edit permission checking
    onEditPermissionDenied?: (reason: string, options?: EditOption[]) => void;
    onAdjustmentRequired?: (originalEntryId: string) => void;

    // Customization
    customHeader?: React.ReactNode;
    customFooter?: React.ReactNode;
    headerExtra?: React.ReactNode;    // Extra content rendered ABOVE the header
    hideActions?: boolean;
    hideTabs?: boolean;
}

// Edit option from permission check
export interface EditOption {
    id: string;
    label: string;
    recommended?: boolean;
    warning?: string;
    requires_permission?: boolean;
}

// Common data interfaces
export interface AccountData {
    id: string;
    code: string;
    name: string;
    nameAr?: string;
    name_en?: string;
    account_type: string;
    type?: string;
    is_group: boolean;
    is_active: boolean;
    is_system?: boolean;
    current_balance?: number;
    balance?: number;
    opening_balance?: number;
    total_debit?: number;
    total_credit?: number;
    transaction_count?: number;
    monthly_average?: number;
    credit_limit?: number;
    currency?: string;
    parent_id?: string | null;
    parent?: { id: string; name: string; code: string } | null;
    company_id?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    last_activity?: string;
}

export interface FundData {
    id: number | string;
    name: string;
    type: 'cash' | 'bank';
    balance: number;
    currency?: string;
    accountNumber?: string;
    totalDeposits?: number;
    totalWithdrawals?: number;
    todayChange?: number;
    lastActivity?: string;
    transactionCount?: number;
    defaultCurrency?: string;
    balances?: Array<{
        currency: string;
        balance: number;
        totalDeposits?: number;
        totalWithdrawals?: number;
        todayChange?: number;
    }>;
}

export interface PartyData {
    id: string;
    name: string;
    nameAr?: string;
    type: 'customer' | 'supplier';
    code?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxNumber?: string;
    creditLimit?: number;
    balance?: number;
    currency?: string;
    accountId?: string;
    isActive?: boolean;
    createdAt?: string;
}

export interface WarehouseData {
    id: string;
    code: string;
    name?: string;
    name_ar: string;
    name_en?: string;
    warehouse_type: 'main' | 'branch' | 'store' | 'regular' | 'offline_market' | 'van';
    city?: string;
    address?: string;
    phone?: string;
    email?: string;
    is_active: boolean;
    is_main?: boolean;
    capacity?: number;
    allows_negative_stock?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface JournalEntryData {
    id: string;
    entry_number: string;
    date: string;
    description: string;
    status: 'draft' | 'posted' | 'cancelled';
    total_debit: number;
    total_credit: number;
    currency?: string;
    reference?: string;
    lines: Array<{
        id: string;
        account_id: string;
        account_name?: string;
        debit: number;
        credit: number;
        description?: string;
        cost_center_id?: string;
    }>;
    created_by?: string;
    created_at?: string;
    posted_at?: string;
    posted_by?: string;
}

export interface TransactionData {
    id: string;
    date: string;
    description: string;
    type: string;
    amount: number;
    status: string;
    reference?: string;
    account?: string;
    counterAccount?: string;
    createdBy?: string;
    notes?: string;
    journalLines?: Array<{
        account: string;
        accountName: string;
        debit: number;
        credit: number;
        description?: string;
    }>;
}

// Ledger entry for tables
export interface LedgerEntry {
    id: string;
    date: string;
    entry_number?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    reference?: string;
    status?: string;
    type?: string;
    counterparty?: string;
    cost_center?: string; // مركز التكلفة
}

// ==========================================
// NEW: Multi-Document Tab System Types
// ==========================================

// مستند مفتوح في التبويبات الرئيسية
export interface OpenDocument {
    id: string;
    type: UnifiedDocType;
    title: string;
    titleAr?: string;
    code?: string;
    data: any;
    isClosable: boolean;  // التبويب الأول غير قابل للإغلاق
    icon?: string;
}

// Props للتنقل بين السجلات
export interface NavigationProps {
    onNavigatePrev?: () => void;
    onNavigateNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

// Extended props for multi-document sheet
export interface MultiDocumentSheetProps extends UnifiedAccountingSheetProps, NavigationProps {
    // المستندات المفتوحة في التبويبات الرئيسية
    openDocuments?: OpenDocument[];
    activeDocumentId?: string;
    onOpenDocument?: (doc: OpenDocument) => void;
    onCloseDocument?: (id: string) => void;
    onActiveDocumentChange?: (id: string) => void;
    maxOpenDocuments?: number;  // الحد الأقصى 6
}

// QR Code display data
export interface QRDisplayData {
    docType: UnifiedDocType;
    docNumber: string;
    docId: string;
    amount?: number;
    currency?: string;
    date?: string;
}

// Action toolbar mode state
export interface ToolbarState {
    mode: SheetMode;
    isLoading?: boolean;
    isSaving?: boolean;
    hasChanges?: boolean;
}

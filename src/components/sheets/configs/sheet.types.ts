/**
 * Universal Detail Sheet System - Type Definitions
 * نظام الشيتات الموحد - تعريفات الأنواع
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

// ===== Document Types =====
export type DocType =
  | 'company'
  | 'tenant'
  | 'subscription'
  | 'invoice'
  | 'payment'
  | 'plan'
  | 'module'
  | 'agent'
  | 'coupon'
  | 'account'
  | 'journal'
  | 'journal_entry'
  | 'receipt'
  | 'transfer'
  | 'cash_journal'
  | 'exchange'
  | 'customer'
  | 'supplier'
  | 'fund'
  | 'cost_center'
  | 'party'
  | 'purchase_order'
  | 'purchase_request'
  | 'quotation'
  | 'return';


// ===== Sheet Size =====
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export const SHEET_SIZE_CLASSES: Record<SheetSize, string> = {
  sm: '!w-[400px] !max-w-[400px] !h-screen',
  md: '!w-[500px] !max-w-[500px] !h-screen',
  lg: '!w-[60%] !max-w-none !h-screen',
  xl: '!w-[75%] !max-w-none !h-screen',
  full: '!w-[90%] !max-w-none !h-screen',
};

// ===== Badge Configuration =====
export interface BadgeConfig {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  icon?: LucideIcon;
}

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';

export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  outline: 'bg-transparent border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
};

// ===== Info Field Types =====
export type InfoFieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'badge'
  | 'link'
  | 'percentage'
  | 'custom';

export interface InfoField {
  key: string;
  label: string;
  labelAr?: string;
  type: InfoFieldType;
  icon?: LucideIcon;
  format?: (value: any, data: any) => string | ReactNode;
  badge?: (value: any, data: any) => BadgeConfig | null;
  link?: (value: any, data: any) => { docType: DocType; id: string } | null;
  currency?: string;
  hidden?: (data: any) => boolean;
  colSpan?: number;
}

// ===== Tab Types =====
export interface SheetTab {
  id: string;
  label: string;
  labelAr?: string;
  icon?: LucideIcon;
  component: React.ComponentType<TabComponentProps>;
  badge?: (data: any) => string | number | null;
  hidden?: (data: any) => boolean;
  disabled?: (data: any) => boolean;
}

export interface TabComponentProps {
  data: any;
  docType: DocType;
  language: string;
  t: (key: string) => string;
  onRowClick?: (row: any, rowDocType: DocType) => void;
  onRefresh?: () => void;
  onMarkerChange?: (rowIds: string[], color: string | null, tableName?: string) => void;
}

// ===== Action Types =====
export type ActionVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success';

export interface SheetAction {
  id: string;
  label: string;
  labelAr?: string;
  icon?: LucideIcon;
  variant?: ActionVariant;
  onClick?: (data: any) => void | Promise<void>;
  show?: (data: any) => boolean;
  disabled?: (data: any) => boolean;
  loading?: boolean;
  confirm?: {
    title: string;
    titleAr?: string;
    description: string;
    descriptionAr?: string;
    confirmLabel?: string;
    confirmLabelAr?: string;
    cancelLabel?: string;
    cancelLabelAr?: string;
  };
  requiresAuth?: boolean;
  closeOnSuccess?: boolean;
}

// ===== Stat Card Types =====
export interface StatCardConfig {
  key: string;
  label: string;
  labelAr?: string;
  icon?: LucideIcon;
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'gray';
  format?: (value: any, data: any) => string | number;
  value: (data: any) => number | string;
}

// ===== Nested Sheet Configuration =====
export interface NestedSheetConfig {
  docType: DocType;
  data: any;
  id?: string;
}

// ===== Main Sheet Configuration =====
export interface SheetConfig {
  docType: DocType;

  // Header Configuration
  title: (data: any) => string;
  subtitle?: (data: any) => string;
  icon: LucideIcon;
  iconBg?: string;
  badge?: (data: any) => BadgeConfig | null;

  // Balance Display (optional)
  balance?: {
    value: (data: any) => number;
    label?: string;
    labelAr?: string;
    currency?: string;
    showSign?: boolean;
  };

  // Stats Cards (optional, shown below header)
  stats?: StatCardConfig[];

  // Info Fields (shown in overview)
  infoFields: InfoField[];

  // Tabs Configuration
  tabs: SheetTab[];
  defaultTab?: string;

  // Actions
  actions: SheetAction[];
  quickActions?: SheetAction[];

  // Sheet Settings
  width?: SheetSize;

  // Row Click Handler for nested tables
  onRowClick?: (row: any, rowDocType: DocType) => NestedSheetConfig | null;

  // Data Fetching
  fetchData?: (id: string) => Promise<any>;

  // Refresh Handler
  onRefresh?: () => void;
}

// ===== Nested Sheet State =====
export interface NestedSheetState {
  id: string;
  docType: DocType;
  data: any;
  level: number;
  config?: SheetConfig;
}

// ===== Hook Return Types =====
export interface UseUniversalSheetReturn {
  isOpen: boolean;
  data: any;
  docType: DocType | null;
  config: SheetConfig | null;
  loading: boolean;
  error: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  open: (docType: DocType, data: any) => void;
  close: () => void;
  refresh: () => void;
}

export interface UseNestedSheetsReturn {
  sheets: NestedSheetState[];
  openNestedSheet: (config: NestedSheetConfig) => void;
  closeNestedSheet: (id: string) => void;
  closeAllNested: () => void;
  activeNestedSheet: NestedSheetState | null;
  hasNestedSheets: boolean;
}

// ===== Table Column for Nested Tables =====
export interface UniversalTableColumn<T = any> {
  key: keyof T | string;
  title: string;
  titleAr?: string;
  width?: string;
  align?: 'start' | 'center' | 'end';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => ReactNode;
  type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'badge' | 'reference';
  clickable?: boolean;
  docType?: DocType;
}

// ===== Status Configurations =====
export interface StatusConfig {
  label: string;
  labelAr: string;
  color: BadgeVariant;
  icon?: LucideIcon;
}

export type StatusMap = Record<string, StatusConfig>;

// ===== Default Status Maps =====
export const DEFAULT_STATUS_MAP: StatusMap = {
  active: { label: 'Active', labelAr: 'نشط', color: 'success' },
  inactive: { label: 'Inactive', labelAr: 'غير نشط', color: 'default' },
  pending: { label: 'Pending', labelAr: 'معلق', color: 'warning' },
  suspended: { label: 'Suspended', labelAr: 'موقوف', color: 'error' },
  expired: { label: 'Expired', labelAr: 'منتهي', color: 'warning' },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'default' },
  draft: { label: 'Draft', labelAr: 'مسودة', color: 'warning' },
  posted: { label: 'Posted', labelAr: 'مؤكد', color: 'success' },
  paid: { label: 'Paid', labelAr: 'مدفوع', color: 'success' },
  partial: { label: 'Partial', labelAr: 'جزئي', color: 'info' },
  unpaid: { label: 'Unpaid', labelAr: 'غير مدفوع', color: 'error' },
  overdue: { label: 'Overdue', labelAr: 'متأخر', color: 'error' },
};

// ===== Utility Types =====
export type TranslationFn = (key: string) => string;

export interface SheetContext {
  data: any;
  docType: DocType;
  language: string;
  t: TranslationFn;
  direction: 'ltr' | 'rtl';
  onNestedOpen?: (config: NestedSheetConfig) => void;
  onRefresh?: () => void;
}

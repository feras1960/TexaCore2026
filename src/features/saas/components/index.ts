/**
 * SaaS Components Index
 * تصدير جميع مكونات SaaS
 */

// Dialogs & Sheets
export { default as CreateTenantDialog } from './CreateTenantDialog';
export { PaymentFormDialog } from './PaymentFormDialog';
export { SaaSDetailSheet } from './SaaSDetailSheet';
export type { SaaSDocType } from './SaaSDetailSheet';
// AgentDetailsSheet removed - use UniversalDetailSheet with docType="agent"

// Management Components
export { default as ModuleManagement } from './ModuleManagement';
export { default as ModuleDetailsContent } from './ModuleDetailsContent';
export { default as CouponManagement } from './CouponManagement';

// Dashboard Components
export { ProductSwitcher } from './ProductSwitcher';
export { CurrencySwitcher, formatCurrency, CURRENCIES } from './CurrencySwitcher';
export {
  SubscribersGrowthChart,
  RevenueTrendChart,
  PlanDistributionChart,
  ProductRevenueChart,
  PaymentMethodsChart,
  RecentPaymentsTable,
} from './DashboardCharts';

// Types
export type { Module } from './ModuleManagement';
export type { Coupon } from './CouponManagement';
export type { Product } from './ProductSwitcher';
export type { Currency } from './CurrencySwitcher';

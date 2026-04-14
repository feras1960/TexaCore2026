/**
 * Component Lab - مختبر المكونات
 * Test and preview all popups and components
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { DevLabNav } from './DevLabNav';
import { NexaTable, Column } from '@/components/shared/tables/NexaTable';
// import { NexaGrid, type NexaGridColumn } from '@/components/shared/tables/NexaGrid';
import { LedgerTable, type LedgerColumn } from '@/components/shared/tables/LedgerTable';
// UnifiedSheet removed - using UniversalDetailSheet instead
import { UnifiedModal } from '@/components/shared/modals/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Sheet, MessageSquare, Eye, FileText as FileTextIcon,
  ChevronDown, Layers, Copy, Check, Database, TestTube,
  Code, List, Settings2, RefreshCw, AlertCircle, ChevronRight,
  ChevronLeft, PanelLeftClose, PanelLeft, Minimize2, Maximize2, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tenantsService, type Tenant } from '@/services/saas/tenantsService';
import { agentsService, type Agent } from '@/services/saas/agentsService';
import GeneralLedgerSheet from '@/features/accounting/components/GeneralLedgerSheet';
import FundTransferDialog from '@/features/accounting/components/FundTransferDialog';
import CurrencyExchangeDialog from '@/features/accounting/components/CurrencyExchangeDialog';
import TransactionDetailsSheet from '@/features/accounting/components/TransactionDetailsSheet';
import QuickReceiptDialog from '@/features/accounting/components/QuickReceiptDialog';
import QuickPaymentDialog from '@/features/accounting/components/QuickPaymentDialog';
import AccountDetailsSheet from '@/features/accounting/components/AccountDetailsSheet';
import AccountDetailsSheetV2 from '@/features/accounting/components/AccountDetailsSheetV2';
import { AddFundDialog } from '@/features/accounting/components/AddFundDialog';
import { AddCostCenterDialog } from '@/features/accounting/components/AddCostCenterDialog';
import FundTransactionSheet from '@/features/accounting/components/FundTransactionSheet';
import NewJournalEntrySheet from '@/features/accounting/components/NewJournalEntrySheet';
import { JournalEntryDetailSheet } from '@/components/shared/details/JournalEntryDetailSheet';
import { InvoiceDetailSheet } from '@/components/shared/details/InvoiceDetailSheet';
import { PaymentDetailSheet } from '@/components/shared/details/PaymentDetailSheet';
import { CreateTenantDialog } from '@/features/saas/components/CreateTenantDialog';
// AgentDetailsSheet removed - using UniversalDetailSheet with docType="agent" instead
import Register from '@/features/auth/Register';
import FabricRegistrationWizard from '@/features/auth/FabricRegistrationWizard';
import {
  UniversalDetailSheet,
  UniversalDetailSheetPreview,
  getRegisteredDocTypes,
  getSheetConfig,
  type DocType,
  type SheetConfig
} from '@/components/sheets';
// SimplePlanSheet removed - using UniversalDetailSheet with docType="plan" instead

interface PopupRegistry {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'sheet' | 'modal' | 'dialog';
  status: 'ready' | 'wip' | 'planned';
  path: string;
  route?: string; // Route to open component in its place
  badge?: string;
}

// Mock data for Universal Detail Sheet
const MOCK_TENANT_DATA = {
  id: 'tenant-001',
  code: 'TEN-001',
  name: 'شركة التقنية المتقدمة',
  email: 'info@techadvanced.com',
  phone: '+966 50 123 4567',
  status: 'active',
  country: 'Saudi Arabia',
  default_language: 'ar',
  plan_name: 'Enterprise',
  plan_code: 'ENT-2024',
  created_at: '2024-01-15T10:30:00Z',
  subscription_start: '2024-01-15T00:00:00Z',
  subscription_end: '2025-01-15T00:00:00Z',
  subscription_amount: 5000,
  users_count: 25,
  storage_used_gb: 45,
  documents_count: 1250,
  enabled_modules: ['accounting', 'inventory', 'sales', 'hr'],
  agent_id: 'agent-001',
  agent_name: 'وكيل الشرق',
  referral_code: 'REF-TECH-2024',
  referral_source: 'Partner Referral',
  subscriptions: [
    {
      id: 'sub-001',
      plan_name: 'Enterprise',
      plan_code: 'ENT-2024',
      status: 'active',
      start_date: '2024-01-15',
      end_date: '2025-01-15',
      amount: 5000,
      currency: 'SAR',
      billing_cycle: 'monthly',
      auto_renew: true,
    }
  ],
  payments: [
    { id: 'pay-001', date: '2024-01-15', reference: 'PAY-001', type: 'receipt', description: 'اشتراك شهري', amount: 5000, status: 'posted' },
    { id: 'pay-002', date: '2024-02-15', reference: 'PAY-002', type: 'receipt', description: 'اشتراك شهري', amount: 5000, status: 'posted' },
  ],
};

const MOCK_AGENT_DATA = {
  id: 'agent-001',
  code: 'AGT-001',
  name: 'وكيل الشرق للحلول التقنية',
  email: 'agent@eastsolutions.com',
  phone: '+966 55 987 6543',
  status: 'active',
  tier: 'gold',
  commission_percent: 20,
  current_balance: 75000,
  pending_balance: 12500,
  total_earned: 250000,
  total_withdrawn: 175000,
  currency: 'SAR',
  has_white_label: true,
  white_label_status: 'active',
  white_label_commission_percent: 15,
  created_at: '2023-06-01T00:00:00Z',
  tenants_count: 45,
  tenants: [
    { id: 'ten-1', code: 'TEN-001', name: 'شركة التقنية', email: 'info@tech.com', status: 'active', created_at: '2024-01-15', monthly_value: 5000, currency: 'SAR' },
    { id: 'ten-2', code: 'TEN-002', name: 'مؤسسة البناء', email: 'info@build.com', status: 'active', created_at: '2024-02-20', monthly_value: 3500, currency: 'SAR' },
  ],
  commissions: [
    { id: 'com-1', date: '2024-03-01', reference: 'COM-001', tenant_name: 'شركة التقنية', amount: 1000, status: 'paid', commission_rate: 20, base_amount: 5000 },
    { id: 'com-2', date: '2024-03-15', reference: 'COM-002', tenant_name: 'مؤسسة البناء', amount: 700, status: 'pending', commission_rate: 20, base_amount: 3500 },
  ],
  withdrawals: [
    { id: 'with-1', date: '2024-02-28', reference: 'WITH-001', amount: 50000, currency: 'SAR', status: 'completed', method: 'bank_transfer', bank_name: 'الراجحي', processed_at: '2024-03-01' },
    { id: 'with-2', date: '2024-03-15', reference: 'WITH-002', amount: 25000, currency: 'SAR', status: 'pending', method: 'bank_transfer', bank_name: 'الأهلي' },
  ],
};

const MOCK_INVOICE_DATA = {
  id: 'inv-001',
  invoice_no: 'INV-2024-00125',
  invoiceNo: 'INV-2024-00125',
  invoice_type: 'sales',
  invoiceType: 'sales',
  date: '2024-03-15',
  due_date: '2024-04-15',
  dueDate: '2024-04-15',
  status: 'partial',
  party_id: 'cust-001',
  party_name: 'شركة النور للتجارة',
  partyName: 'شركة النور للتجارة',
  party_type: 'customer',
  partyType: 'customer',
  party_phone: '+966 50 111 2222',
  party_email: 'info@alnoor.com',
  currency: 'SAR',
  subtotal: 50000,
  discount_amount: 2500,
  discountAmount: 2500,
  tax_amount: 7125,
  taxAmount: 7125,
  grand_total: 54625,
  grandTotal: 54625,
  paid_amount: 30000,
  paidAmount: 30000,
  balance: 24625,
  payment_method: 'تحويل بنكي',
  sales_person: 'أحمد محمد',
  created_at: '2024-03-15T10:00:00Z',
  items: [
    { id: 'item-1', itemCode: 'PRD-001', itemName: 'منتج أ', quantity: 10, uom: 'قطعة', unitPrice: 3000, lineTotal: 30000 },
    { id: 'item-2', itemCode: 'PRD-002', itemName: 'منتج ب', quantity: 5, uom: 'قطعة', unitPrice: 4000, lineTotal: 20000 },
  ],
  payments: [
    { id: 'pay-1', date: '2024-03-20', reference: 'RCT-001', type: 'receipt', description: 'دفعة أولى', amount: 30000, status: 'posted' },
  ],
};

const MOCK_ACCOUNT_DATA = {
  id: 'acc-001',
  code: '1101',
  name: 'الصندوق الرئيسي',
  nameAr: 'الصندوق الرئيسي',
  name_en: 'Main Cash',
  account_type: 'Asset',
  type: 'Asset',
  is_group: false,
  is_active: true,
  is_system: false,
  current_balance: 125000,
  balance: 125000,
  opening_balance: 50000,
  total_debit: 500000,
  total_credit: 375000,
  transaction_count: 156,
  monthly_average: 45000,
  credit_limit: 0,
  currency: 'SAR',
  parent_id: 'acc-parent-001',
  parent: {
    id: 'acc-parent-001',
    name: 'النقد والبنوك',
    code: '11',
  },
  parent_name: 'النقد والبنوك',
  company_id: 'company-001',
  description: 'الصندوق النقدي الرئيسي للشركة',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-03-20T10:00:00Z',
  last_activity: '2024-03-20',
  ledger_entries: [
    { id: 'le-1', date: '2024-03-01', reference: 'JV-001', description: 'رصيد افتتاحي', debit: 50000, credit: 0, balance: 50000, status: 'posted' },
    { id: 'le-2', date: '2024-03-05', reference: 'RCT-001', description: 'استلام من عميل', debit: 25000, credit: 0, balance: 75000, status: 'posted' },
    { id: 'le-3', date: '2024-03-10', reference: 'PV-001', description: 'دفع للمورد', debit: 0, credit: 15000, balance: 60000, status: 'posted' },
    { id: 'le-4', date: '2024-03-15', reference: 'RCT-002', description: 'مبيعات نقدية', debit: 35000, credit: 0, balance: 95000, status: 'posted' },
    { id: 'le-5', date: '2024-03-18', reference: 'PV-002', description: 'مصروفات إدارية', debit: 0, credit: 8000, balance: 87000, status: 'posted' },
    { id: 'le-6', date: '2024-03-20', reference: 'RCT-003', description: 'تحصيل فاتورة', debit: 38000, credit: 0, balance: 125000, status: 'posted' },
  ],
  activities: [
    { id: 'act-1', type: 'receipt', date: '2024-03-20', description: 'تم استلام دفعة', reference: 'RCT-003', amount: 38000 },
    { id: 'act-2', type: 'payment', date: '2024-03-18', description: 'تم الدفع', reference: 'PV-002', amount: -8000 },
  ],
};

const MOCK_CUSTOMER_DATA = {
  id: 'cust-001',
  code: 'CUST-001',
  name: 'شركة النور للتجارة',
  email: 'info@alnoor.com',
  phone: '+966 50 111 2222',
  address: 'شارع الملك فهد، الرياض',
  city: 'الرياض',
  country: 'السعودية',
  status: 'active',
  is_active: true,
  balance: 75000,
  current_balance: 75000,
  credit_limit: 100000,
  payment_terms: '30 يوم',
  total_invoices: 25,
  invoices_count: 25,
  total_sales: 450000,
  orders_count: 32,
  created_at: '2023-06-15T00:00:00Z',
  notes: 'عميل VIP - أولوية عالية',
  payments: [
    { id: 'pay-1', date: '2024-03-15', reference: 'RCT-001', type: 'receipt', description: 'دفعة فاتورة', amount: 25000, status: 'posted' },
    { id: 'pay-2', date: '2024-02-20', reference: 'RCT-002', type: 'receipt', description: 'دفعة مقدمة', amount: 15000, status: 'posted' },
  ],
};

const MOCK_SUPPLIER_DATA = {
  id: 'sup-001',
  code: 'SUP-001',
  name: 'مصنع الأمل للمعدات',
  email: 'sales@alamal.com',
  phone: '+966 55 333 4444',
  address: 'المنطقة الصناعية، جدة',
  city: 'جدة',
  country: 'السعودية',
  status: 'active',
  is_active: true,
  balance: -45000,
  current_balance: -45000,
  tax_number: '310123456700003',
  payment_terms: '45 يوم',
  total_invoices: 18,
  bills_count: 18,
  total_purchases: 320000,
  purchase_orders_count: 22,
  created_at: '2023-03-10T00:00:00Z',
  notes: 'مورد رئيسي للمعدات',
  payments: [
    { id: 'pay-1', date: '2024-03-10', reference: 'PV-001', type: 'payment', description: 'دفعة للفاتورة', amount: 20000, status: 'posted' },
  ],
};

const MOCK_JOURNAL_ENTRY_DATA = {
  id: 'je-001',
  voucherNo: 'JV-2024-0125',
  voucherType: 'journal',
  date: '2024-03-15',
  status: 'posted',
  description: 'قيد تسوية مخزون نهاية الشهر',
  descriptionAr: 'قيد تسوية مخزون نهاية الشهر',
  reference: 'INV-ADJ-003',
  company: 'الشركة الرئيسية',
  companyAr: 'الشركة الرئيسية',
  costCenter: 'المخازن',
  createdBy: 'محمد أحمد',
  createdAt: '2024-03-15T10:30:00Z',
  totalDebit: 15000,
  totalCredit: 15000,
  isBalanced: true,
  lines: [
    { id: 1, lineNo: 1, accountCode: '1301', accountName: 'المخزون', accountNameAr: 'المخزون', debit: 15000, credit: 0, description: 'زيادة قيمة المخزون' },
    { id: 2, lineNo: 2, accountCode: '5101', accountName: 'تكلفة البضاعة المباعة', accountNameAr: 'تكلفة البضاعة المباعة', debit: 0, credit: 15000, description: 'تعديل تكلفة البضاعة' },
  ],
};

const MOCK_FUND_DATA = {
  id: 'fund-001',
  name: 'الصندوق الرئيسي',
  type: 'cash',
  defaultCurrency: 'SAR',
  accountNumber: '-',
  balances: [
    { currency: 'SAR', balance: 15420, totalDeposits: 125000, totalWithdrawals: 109580, todayChange: 3200 },
    { currency: 'USD', balance: 2500, totalDeposits: 8000, totalWithdrawals: 5500, todayChange: 500 },
  ],
  lastActivity: 'منذ ساعتين',
  transactionCount: 156,
  transactions: [
    { id: 'tx-1', date: '2024-03-20', type: 'receipt', reference: 'RCT-001', description: 'استلام من عميل', amount: 5000, balance: 15420 },
    { id: 'tx-2', date: '2024-03-19', type: 'payment', reference: 'PV-001', description: 'دفع للمورد', amount: 3000, balance: 10420 },
    { id: 'tx-3', date: '2024-03-18', type: 'transfer', reference: 'TR-001', description: 'تحويل للبنك', amount: 2000, balance: 13420 },
  ],
};

// === SaaS Mock Data ===
const MOCK_PLAN_DATA = {
  id: 'plan-professional',
  code: 'professional',
  name: 'Professional',
  name_ar: 'الباقة الاحترافية',
  description: 'For growing businesses',
  description_ar: 'للشركات النامية',
  price_monthly: 1500,
  price_yearly: 15000,
  currency: 'SAR',
  max_users: 25,
  max_companies: 3,
  max_storage_gb: 50,
  features: ['محاسبة متقدمة', 'تعدد المستودعات', 'دعم أولوية', 'واجهة API', 'تقارير مخصصة'],
  modules: ['accounting', 'inventory', 'sales', 'purchases', 'hr'],
  is_active: true,
  is_popular: true,
  trial_days: 14,
  sort_order: 2,
  subscribers_count: 156,
  monthly_revenue: 234000,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-03-15T10:00:00Z',
  subscribers: [
    { id: 'ten-1', name: 'شركة التقنية', status: 'active', created_at: '2024-02-01' },
    { id: 'ten-2', name: 'مؤسسة البناء', status: 'active', created_at: '2024-02-15' },
  ],
};

const MOCK_SUBSCRIPTION_DATA = {
  id: 'sub-001',
  subscription_code: 'SUB-2024-001',
  tenant_id: 'tenant-001',
  tenant_name: 'شركة التقنية المتقدمة',
  plan_id: 'plan-professional',
  plan_name: 'الباقة الاحترافية',
  status: 'active',
  billing_cycle: 'monthly',
  amount: 1500,
  currency: 'SAR',
  start_date: '2024-01-15',
  end_date: '2025-01-15',
  auto_renew: true,
  next_billing_date: '2024-04-15',
  discount_percent: 10,
  coupon_code: 'WELCOME10',
  coupon_id: 'coupon-001',
  renewals_count: 3,
  created_at: '2024-01-15T10:00:00Z',
  payments: [
    { id: 'pay-1', date: '2024-03-15', reference: 'PAY-003', amount: 1350, status: 'paid' },
    { id: 'pay-2', date: '2024-02-15', reference: 'PAY-002', amount: 1350, status: 'paid' },
    { id: 'pay-3', date: '2024-01-15', reference: 'PAY-001', amount: 1350, status: 'paid' },
  ],
  renewals: [
    { id: 'ren-1', date: '2024-03-15', from_date: '2024-03-15', to_date: '2024-04-15', amount: 1350 },
    { id: 'ren-2', date: '2024-02-15', from_date: '2024-02-15', to_date: '2024-03-15', amount: 1350 },
  ],
};

const MOCK_COUPON_DATA = {
  id: 'coupon-001',
  code: 'WELCOME10',
  name: 'خصم الترحيب',
  name_ar: 'خصم الترحيب',
  description: 'خصم 10% للمشتركين الجدد',
  description_ar: 'خصم 10% للمشتركين الجدد',
  discount_type: 'percentage',
  discount_value: 10,
  max_discount: 500,
  min_purchase: 0,
  max_uses: 100,
  max_uses_per_user: 1,
  uses_count: 45,
  total_discount_given: 18750,
  starts_at: '2024-01-01',
  expires_at: '2024-12-31',
  status: 'active',
  applicable_plans: [],
  first_subscription_only: true,
  created_by: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  usage_history: [
    { id: 'use-1', tenant_name: 'شركة التقنية', date: '2024-03-10', discount_amount: 150 },
    { id: 'use-2', tenant_name: 'مؤسسة البناء', date: '2024-03-08', discount_amount: 500 },
  ],
};

const MOCK_MODULE_DATA = {
  id: 'module-accounting',
  code: 'accounting',
  name: 'Accounting',
  name_ar: 'المحاسبة',
  description: 'Full accounting and financial management',
  description_ar: 'نظام محاسبة مالية متكامل',
  category: 'core',
  is_core: true,
  is_addon: false,
  addon_price: 0,
  status: 'active',
  version: '2.5.0',
  release_date: '2024-01-01',
  subscribers_count: 450,
  plans_count: 3,
  features: [
    'دفتر الأستاذ العام',
    'القيود اليومية',
    'التقارير المالية',
    'الميزانية العمومية',
    'قائمة الدخل',
    'تعدد العملات',
    'مراكز التكلفة',
  ],
  included_in_plans: ['starter', 'professional', 'enterprise'],
  dependencies: [],
  api_endpoint: '/api/v1/accounting',
  sort_order: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
};

// Code snippets for copying
const CODE_SNIPPETS: Record<string, string> = {
  // SaaS Sheets
  tenant: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="tenant"
  data={selectedTenant}
  onRefresh={loadTenants}
  onEdit={() => setEditDialogOpen(true)}
/>`,
  agent: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="agent"
  data={selectedAgent}
  onRefresh={loadAgents}
  onEdit={() => setEditDialogOpen(true)}
/>`,
  plan: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="plan"
  data={selectedPlan}
  onRefresh={loadPlans}
  onEdit={() => setEditPlanOpen(true)}
/>`,
  subscription: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="subscription"
  data={selectedSubscription}
  onRefresh={loadSubscriptions}
  onEdit={() => setEditSubscriptionOpen(true)}
/>`,
  coupon: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="coupon"
  data={selectedCoupon}
  onRefresh={loadCoupons}
  onEdit={() => setEditCouponOpen(true)}
/>`,
  module: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="module"
  data={selectedModule}
  onRefresh={loadModules}
  onEdit={() => setEditModuleOpen(true)}
/>`,
  // Accounting Sheets
  invoice: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="invoice"
  data={selectedInvoice}
  onRefresh={loadInvoices}
  onEdit={() => setEditDialogOpen(true)}
/>`,
  account: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="account"
  data={selectedAccount}
  onRefresh={loadAccounts}
  onEdit={() => setEditAccountOpen(true)}
/>`,
  customer: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="customer"
  data={selectedCustomer}
  onRefresh={loadCustomers}
  onEdit={() => setEditCustomerOpen(true)}
/>`,
  supplier: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="supplier"
  data={selectedSupplier}
  onRefresh={loadSuppliers}
  onEdit={() => setEditSupplierOpen(true)}
/>`,
  journal_entry: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="journal_entry"
  data={selectedEntry}
  onRefresh={loadEntries}
/>`,
  fund: `<UniversalDetailSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  docType="fund"
  data={selectedFund}
  onRefresh={loadFunds}
/>`,
  // Other types (placeholder)
  payment: '',
  cost_center: '',
  party: '',
  journal: '',
  receipt: '',
};

// Mock sub-tabs for each entity type
const DOC_TABS: Record<string, { id: string; label: string; labelAr: string; icon?: string }[]> = {
  // SaaS Sheets ===
  tenant: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'subscriptions', label: 'Subscriptions', labelAr: 'الاشتراكات' },
    { id: 'usage', label: 'Usage', labelAr: 'الاستخدام' },
    { id: 'modules', label: 'Modules', labelAr: 'الوحدات' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'ledger', label: 'Ledger', labelAr: 'كشف الحساب' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  agent: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'commissions', label: 'Commissions', labelAr: 'العمولات' },
    { id: 'tenants', label: 'Tenants', labelAr: 'المشتركين' },
    { id: 'withdrawals', label: 'Withdrawals', labelAr: 'السحوبات' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  plan: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'modules', label: 'Modules', labelAr: 'الوحدات' },
    { id: 'limits', label: 'Limits & Features', labelAr: 'الحدود والميزات' },
    { id: 'subscribers', label: 'Subscribers', labelAr: 'المشتركين' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'analytics', label: 'Analytics', labelAr: 'التحليلات' },
    { id: 'activity', label: 'Activity', labelAr: 'السجل' },
  ],
  subscription: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'plan_details', label: 'Plan Details', labelAr: 'تفاصيل الباقة' },
    { id: 'billing', label: 'Billing', labelAr: 'الفوترة' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'invoices', label: 'Invoices', labelAr: 'الفواتير' },
    { id: 'renewals', label: 'Renewals', labelAr: 'التجديدات' },
    { id: 'activity', label: 'Activity', labelAr: 'السجل' },
  ],
  coupon: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'usage', label: 'Usage History', labelAr: 'سجل الاستخدام' },
    { id: 'restrictions', label: 'Restrictions', labelAr: 'القيود' },
    { id: 'statistics', label: 'Statistics', labelAr: 'الإحصائيات' },
    { id: 'activity', label: 'Activity', labelAr: 'السجل' },
  ],
  module: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'features', label: 'Features', labelAr: 'الميزات' },
    { id: 'plans', label: 'Plans', labelAr: 'الباقات' },
    { id: 'subscribers', label: 'Users', labelAr: 'المستخدمين' },
    { id: 'integration', label: 'Integration', labelAr: 'التكامل' },
    { id: 'analytics', label: 'Analytics', labelAr: 'الإحصائيات' },
    { id: 'activity', label: 'Activity', labelAr: 'السجل' },
  ],
  // === Accounting Sheets ===
  invoice: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  account: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'ledger', label: 'Ledger', labelAr: 'كشف الحساب' },
    { id: 'invoices', label: 'Invoices', labelAr: 'الفواتير' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  customer: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'ledger', label: 'Account Statement', labelAr: 'كشف الحساب' },
    { id: 'invoices', label: 'Invoices', labelAr: 'الفواتير' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  supplier: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'ledger', label: 'Account Statement', labelAr: 'كشف الحساب' },
    { id: 'bills', label: 'Bills', labelAr: 'الفواتير' },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  journal_entry: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'lines', label: 'Entry Lines', labelAr: 'بنود القيد' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  fund: [
    { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة' },
    { id: 'transactions', label: 'Transactions', labelAr: 'العمليات' },
    { id: 'activity', label: 'Activity', labelAr: 'النشاط' },
  ],
  // === Other Sheets (Placeholder) ===
  payment: [],
  cost_center: [],
  party: [],
  journal: [],
  receipt: [],
};

// Document types for NexaGrid preview
type GridDocType = 'general_ledger' | 'journal_entries' | 'sales_invoices' | 'purchase_invoices' | 'inventory_ledger' | 'customers_ledger' | 'suppliers_ledger' | 'products';

const GRID_DOC_CONFIGS: Record<GridDocType, {
  nameAr: string;
  nameEn: string;
  columns: any[];
  data: any[];
}> = {
  general_ledger: {
    nameAr: 'دفتر الأستاذ العام',
    nameEn: 'General Ledger',
    columns: [
      { key: 'debit', title: 'accounting.debit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'credit', title: 'accounting.credit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'description', title: 'common.description', width: 250 },
      { key: 'balance', title: 'common.balance', width: 130, type: 'currency' },
      { key: 'date', title: 'common.date', width: 110 },
      { key: 'reference', title: 'common.reference', width: 110, filterable: true },
      { key: 'costCenter', title: 'accounting.costCenter', width: 130, filterable: true },
      { key: 'currency', title: 'common.currency', width: 80, filterable: true },
      { key: 'exchangeRate', title: 'accounting.exchangeRate', width: 100 },
    ],
    data: [
      { id: '1', date: '2024-01-01', reference: 'JV-001', description: 'رصيد افتتاحي', debit: 50000, credit: 0, balance: 50000, costCenter: 'المركز الرئيسي', currency: 'SAR', exchangeRate: 1 },
      { id: '2', date: '2024-01-15', reference: 'INV-001', description: 'مبيعات نقدية - شركة الأمل', debit: 15000, credit: 0, balance: 65000, costCenter: 'فرع جدة', currency: 'SAR', exchangeRate: 1 },
      { id: '3', date: '2024-02-01', reference: 'PV-005', description: 'دفع راتب موظف', debit: 0, credit: 8000, balance: 57000, costCenter: 'المركز الرئيسي', currency: 'SAR', exchangeRate: 1 },
      { id: '4', date: '2024-02-15', reference: 'INV-023', description: 'إيراد خدمات استشارية', debit: 25000, credit: 0, balance: 82000, costCenter: 'فرع الرياض', currency: 'SAR', exchangeRate: 1 },
      { id: '5', date: '2024-03-01', reference: 'JV-012', description: 'تحويل للبنك', debit: 0, credit: 30000, balance: 52000, costCenter: 'المركز الرئيسي', currency: 'SAR', exchangeRate: 1 },
    ],
  },
  journal_entries: {
    nameAr: 'القيود المحاسبية',
    nameEn: 'Journal Entries',
    columns: [
      { key: 'debit', title: 'accounting.debit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'credit', title: 'accounting.credit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'accountName', title: 'common.account', width: 200, filterable: true },
      { key: 'description', title: 'common.description', width: 200 },
      { key: 'date', title: 'common.date', width: 110 },
      { key: 'entryNumber', title: 'accounting.entryNumber', width: 110, filterable: true },
      { key: 'costCenter', title: 'accounting.costCenter', width: 130, filterable: true },
    ],
    data: [
      { id: '1', date: '2024-01-15', entryNumber: 'JV-001', accountName: 'الصندوق', description: 'مبيعات نقدية', debit: 15000, credit: 0, costCenter: 'المركز الرئيسي' },
      { id: '2', date: '2024-01-15', entryNumber: 'JV-001', accountName: 'إيرادات المبيعات', description: 'مبيعات نقدية', debit: 0, credit: 15000, costCenter: 'المركز الرئيسي' },
      { id: '3', date: '2024-02-01', entryNumber: 'JV-002', accountName: 'الرواتب والأجور', description: 'راتب شهر يناير', debit: 8000, credit: 0, costCenter: 'الموارد البشرية' },
      { id: '4', date: '2024-02-01', entryNumber: 'JV-002', accountName: 'البنك', description: 'راتب شهر يناير', debit: 0, credit: 8000, costCenter: 'الموارد البشرية' },
    ],
  },
  sales_invoices: {
    nameAr: 'فواتير المبيعات',
    nameEn: 'Sales Invoices',
    columns: [
      { key: 'item', title: 'inventory.item', width: 200, filterable: true },
      { key: 'quantity', title: 'common.quantity', width: 100, type: 'number', footer: 'sum' },
      { key: 'price', title: 'common.price', width: 120, type: 'currency' },
      { key: 'total', title: 'common.total', width: 130, type: 'currency', footer: 'sum' },
      { key: 'description', title: 'common.description', width: 200 },
      { key: 'availableQty', title: 'inventory.availableQty', width: 100, type: 'number' },
      { key: 'unit', title: 'inventory.unit', width: 80, filterable: true },
      { key: 'discount', title: 'common.discount', width: 100, type: 'currency' },
      { key: 'tax', title: 'common.tax', width: 100, type: 'currency' },
    ],
    data: [
      { id: '1', item: 'قماش حرير صيني', quantity: 50, price: 85, total: 4250, description: 'لون أحمر', availableQty: 500, unit: 'متر', discount: 0, tax: 637.5 },
      { id: '2', item: 'قماش قطن مصري', quantity: 100, price: 45, total: 4500, description: 'لون أبيض', availableQty: 1200, unit: 'متر', discount: 100, tax: 660 },
      { id: '3', item: 'قماش صوف إيطالي', quantity: 20, price: 150, total: 3000, description: 'لون رمادي', availableQty: 80, unit: 'متر', discount: 0, tax: 450 },
      { id: '4', item: 'قماش كتان فرنسي', quantity: 30, price: 95, total: 2850, description: 'لون بيج', availableQty: 250, unit: 'متر', discount: 50, tax: 420 },
    ],
  },
  purchase_invoices: {
    nameAr: 'فواتير المشتريات',
    nameEn: 'Purchase Invoices',
    columns: [
      { key: 'item', title: 'inventory.item', width: 200, filterable: true },
      { key: 'quantity', title: 'common.quantity', width: 100, type: 'number', footer: 'sum' },
      { key: 'cost', title: 'common.cost', width: 120, type: 'currency' },
      { key: 'total', title: 'common.total', width: 130, type: 'currency', footer: 'sum' },
      { key: 'supplier', title: 'common.supplier', width: 180, filterable: true },
      { key: 'unit', title: 'inventory.unit', width: 80, filterable: true },
      { key: 'warehouse', title: 'inventory.warehouse', width: 130, filterable: true },
      { key: 'expiryDate', title: 'inventory.expiryDate', width: 110 },
    ],
    data: [
      { id: '1', item: 'قماش حرير خام', quantity: 200, cost: 60, total: 12000, supplier: 'شركة النسيج الصينية', unit: 'متر', warehouse: 'المستودع الرئيسي', expiryDate: '-' },
      { id: '2', item: 'قماش قطن خام', quantity: 500, cost: 30, total: 15000, supplier: 'مصنع القطن المصري', unit: 'متر', warehouse: 'المستودع الرئيسي', expiryDate: '-' },
      { id: '3', item: 'خيوط حرير', quantity: 100, cost: 25, total: 2500, supplier: 'شركة الخيوط العالمية', unit: 'بكرة', warehouse: 'مستودع الخامات', expiryDate: '-' },
    ],
  },
  inventory_ledger: {
    nameAr: 'دفتر المواد (الجرد)',
    nameEn: 'Inventory Ledger',
    columns: [
      { key: 'item', title: 'inventory.item', width: 200, filterable: true },
      { key: 'quantityIn', title: 'inventory.quantityIn', width: 100, type: 'number', footer: 'sum' },
      { key: 'quantityOut', title: 'inventory.quantityOut', width: 100, type: 'number', footer: 'sum' },
      { key: 'balance', title: 'common.balance', width: 100, type: 'number' },
      { key: 'date', title: 'common.date', width: 110 },
      { key: 'reference', title: 'common.reference', width: 110, filterable: true },
      { key: 'warehouse', title: 'inventory.warehouse', width: 130, filterable: true },
      { key: 'unitCost', title: 'inventory.unitCost', width: 100, type: 'currency' },
    ],
    data: [
      { id: '1', date: '2024-01-01', item: 'قماش حرير صيني', reference: 'OB-001', quantityIn: 500, quantityOut: 0, balance: 500, warehouse: 'المستودع الرئيسي', unitCost: 85 },
      { id: '2', date: '2024-01-15', item: 'قماش حرير صيني', reference: 'INV-001', quantityIn: 0, quantityOut: 50, balance: 450, warehouse: 'المستودع الرئيسي', unitCost: 85 },
      { id: '3', date: '2024-02-01', item: 'قماش حرير صيني', reference: 'PUR-005', quantityIn: 200, quantityOut: 0, balance: 650, warehouse: 'المستودع الرئيسي', unitCost: 82 },
      { id: '4', date: '2024-02-15', item: 'قماش حرير صيني', reference: 'INV-023', quantityIn: 0, quantityOut: 100, balance: 550, warehouse: 'المستودع الرئيسي', unitCost: 85 },
    ],
  },
  customers_ledger: {
    nameAr: 'كشف حساب العملاء',
    nameEn: 'Customers Ledger',
    columns: [
      { key: 'debit', title: 'accounting.debit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'credit', title: 'accounting.credit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'description', title: 'common.description', width: 250 },
      { key: 'balance', title: 'common.balance', width: 130, type: 'currency' },
      { key: 'date', title: 'common.date', width: 110 },
      { key: 'reference', title: 'common.reference', width: 110 },
      { key: 'dueDate', title: 'accounting.dueDate', width: 110 },
    ],
    data: [
      { id: '1', date: '2024-01-01', reference: 'OB', description: 'رصيد افتتاحي', debit: 25000, credit: 0, balance: 25000, dueDate: '-' },
      { id: '2', date: '2024-01-15', reference: 'INV-001', description: 'فاتورة مبيعات', debit: 15000, credit: 0, balance: 40000, dueDate: '2024-02-15' },
      { id: '3', date: '2024-02-01', reference: 'RCT-001', description: 'سند قبض', debit: 0, credit: 20000, balance: 20000, dueDate: '-' },
      { id: '4', date: '2024-02-15', reference: 'INV-023', description: 'فاتورة مبيعات', debit: 8500, credit: 0, balance: 28500, dueDate: '2024-03-15' },
    ],
  },
  suppliers_ledger: {
    nameAr: 'كشف حساب الموردين',
    nameEn: 'Suppliers Ledger',
    columns: [
      { key: 'debit', title: 'accounting.debit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'credit', title: 'accounting.credit', width: 130, type: 'currency', footer: 'sum' },
      { key: 'description', title: 'common.description', width: 250 },
      { key: 'balance', title: 'common.balance', width: 130, type: 'currency' },
      { key: 'date', title: 'common.date', width: 110 },
      { key: 'reference', title: 'common.reference', width: 110 },
      { key: 'dueDate', title: 'accounting.dueDate', width: 110 },
    ],
    data: [
      { id: '1', date: '2024-01-01', reference: 'OB', description: 'رصيد افتتاحي', debit: 0, credit: 15000, balance: -15000, dueDate: '-' },
      { id: '2', date: '2024-01-10', reference: 'PUR-001', description: 'فاتورة مشتريات - أقمشة', debit: 0, credit: 12000, balance: -27000, dueDate: '2024-02-10' },
      { id: '3', date: '2024-02-05', reference: 'PAY-001', description: 'سند صرف', debit: 15000, credit: 0, balance: -12000, dueDate: '-' },
      { id: '4', date: '2024-02-20', reference: 'PUR-015', description: 'فاتورة مشتريات - خيوط', debit: 0, credit: 5000, balance: -17000, dueDate: '2024-03-20' },
    ],
  },
  products: {
    nameAr: 'جدول المنتجات',
    nameEn: 'Products Table',
    columns: [
      { key: 'debit', title: 'accounting.debit', width: 120, type: 'currency', footer: 'sum' },
      { key: 'credit', title: 'accounting.credit', width: 120, type: 'currency', footer: 'sum' },
      { key: 'name', title: 'common.name', width: 200 },
      { key: 'category', title: 'common.category', width: 120, filterOptions: ['حرير', 'قطن', 'صوف', 'كتان', 'صناعي', 'طبيعي'] },
      { key: 'quantity', title: 'common.quantity', width: 100, type: 'number', footer: 'sum' },
      { key: 'price', title: 'common.price', width: 120, type: 'currency', footer: 'average' },
      { key: 'code', title: 'common.code', width: 120 },
    ],
    data: [
      { id: '1', code: 'PRD-001', name: 'قماش حرير صيني', category: 'حرير', quantity: 500, price: 85.00, debit: 4250, credit: 0 },
      { id: '2', code: 'PRD-002', name: 'قماش قطن مصري', category: 'قطن', quantity: 1200, price: 45.00, debit: 0, credit: 5400 },
      { id: '3', code: 'PRD-003', name: 'قماش صوف إيطالي', category: 'صوف', quantity: 80, price: 150.00, debit: 1200, credit: 0 },
      { id: '4', code: 'PRD-004', name: 'قماش كتان فرنسي', category: 'كتان', quantity: 250, price: 95.00, debit: 2375, credit: 0 },
      { id: '5', code: 'PRD-005', name: 'قماش بوليستر', category: 'صناعي', quantity: 2000, price: 25.00, debit: 0, credit: 5000 },
      { id: '6', code: 'PRD-006', name: 'قماش شيفون', category: 'حرير', quantity: 150, price: 75.00, debit: 1125, credit: 0 },
      { id: '7', code: 'PRD-007', name: 'قماش دنيم', category: 'قطن', quantity: 800, price: 55.00, debit: 4400, credit: 0 },
      { id: '8', code: 'PRD-008', name: 'قماش ساتان', category: 'حرير', quantity: 120, price: 110.00, debit: 0, credit: 1320 },
      { id: '9', code: 'PRD-009', name: 'قماش مخمل', category: 'صوف', quantity: 45, price: 180.00, debit: 810, credit: 0 },
      { id: '10', code: 'PRD-010', name: 'قماش جوت', category: 'طبيعي', quantity: 600, price: 35.00, debit: 2100, credit: 0 },
    ],
  },
};

export default function ComponentLab() {
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const [selectedPopup, setSelectedPopup] = useState<string | null>(null);
  const [selectedGridDocType, setSelectedGridDocType] = useState<GridDocType>('general_ledger');

  // Sheet Groups Configuration
  type SheetGroup = 'saas' | 'accounting';
  const SHEET_GROUPS: Record<SheetGroup, { label: string; labelAr: string; color: string; docTypes: DocType[] }> = {
    saas: {
      label: 'SaaS',
      labelAr: 'إدارة SaaS',
      color: 'bg-purple-500',
      docTypes: ['tenant', 'agent', 'plan', 'subscription', 'coupon', 'module'],
    },
    accounting: {
      label: 'Accounting',
      labelAr: 'المحاسبة',
      color: 'bg-emerald-500',
      docTypes: ['invoice', 'account', 'customer', 'supplier', 'journal_entry', 'fund'],
    },
  };

  // Universal Detail Sheet state
  const [sheetGroup, setSheetGroup] = useState<SheetGroup>('saas');
  const [universalSheetDocType, setUniversalSheetDocType] = useState<DocType>('tenant');
  const [useRealData, setUseRealData] = useState(false);
  const [realTenants, setRealTenants] = useState<Tenant[]>([]);
  const [realAgents, setRealAgents] = useState<Agent[]>([]);
  const [selectedRealId, setSelectedRealId] = useState<string>('');
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [realDataError, setRealDataError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState<'selector' | 'tabs' | 'code' | 'data'>('selector');
  const [customJsonData, setCustomJsonData] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(false);

  // Load real data when toggled
  const loadRealData = useCallback(async () => {
    if (!useRealData) return;

    setIsLoadingRealData(true);
    setRealDataError(null);

    try {
      if (universalSheetDocType === 'tenant') {
        const tenants = await tenantsService.getAll();
        setRealTenants(tenants);
        if (tenants.length > 0 && !selectedRealId) {
          setSelectedRealId(tenants[0].id);
        }
      } else if (universalSheetDocType === 'agent') {
        const agents = await agentsService.getAll();
        setRealAgents(agents);
        if (agents.length > 0 && !selectedRealId) {
          setSelectedRealId(agents[0].id);
        }
      }
    } catch (error: any) {
      setRealDataError(error.message || 'Failed to load data');
    } finally {
      setIsLoadingRealData(false);
    }
  }, [useRealData, universalSheetDocType, selectedRealId]);

  useEffect(() => {
    if (useRealData && selectedPopup === 'universal-detail-sheet') {
      loadRealData();
    }
  }, [useRealData, universalSheetDocType, selectedPopup, loadRealData]);

  // Reset selection when DocType changes
  useEffect(() => {
    setSelectedRealId('');
    setCustomJsonData('');
    setJsonError(null);
  }, [universalSheetDocType]);

  // Handle group change - update docType to first item in new group
  const handleGroupChange = (newGroup: SheetGroup) => {
    setSheetGroup(newGroup);
    const firstDocType = SHEET_GROUPS[newGroup].docTypes[0];
    setUniversalSheetDocType(firstDocType);
  };

  // Get doc type label
  const getDocTypeLabel = (docType: string, isAr: boolean) => {
    const labels: Record<string, { en: string; ar: string }> = {
      tenant: { en: 'Tenant', ar: 'مشترك' },
      agent: { en: 'Agent', ar: 'وكيل' },
      plan: { en: 'Plan', ar: 'باقة' },
      subscription: { en: 'Subscription', ar: 'اشتراك' },
      coupon: { en: 'Coupon', ar: 'كوبون' },
      module: { en: 'Module', ar: 'وحدة' },
      invoice: { en: 'Invoice', ar: 'فاتورة' },
      account: { en: 'Account', ar: 'حساب' },
      customer: { en: 'Customer', ar: 'عميل' },
      supplier: { en: 'Supplier', ar: 'مورد' },
      journal_entry: { en: 'Journal Entry', ar: 'قيد محاسبي' },
      fund: { en: 'Fund', ar: 'صندوق' },
      payment: { en: 'Payment', ar: 'دفعة' },
      cost_center: { en: 'Cost Center', ar: 'مركز تكلفة' },
      party: { en: 'Party', ar: 'طرف' },
      journal: { en: 'Journal', ar: 'يومية' },
      receipt: { en: 'Receipt', ar: 'إيصال' },
    };
    return isAr ? labels[docType]?.ar || docType : labels[docType]?.en || docType;
  };

  // Get doc type color
  const getDocTypeColor = (docType: string) => {
    const colors: Record<string, string> = {
      tenant: 'bg-blue-500',
      agent: 'bg-purple-500',
      plan: 'bg-indigo-500',
      subscription: 'bg-green-500',
      coupon: 'bg-pink-500',
      module: 'bg-cyan-500',
      invoice: 'bg-emerald-500',
      account: 'bg-slate-500',
      customer: 'bg-blue-600',
      supplier: 'bg-orange-500',
      journal_entry: 'bg-violet-500',
      fund: 'bg-teal-500',
      payment: 'bg-green-600',
      cost_center: 'bg-amber-500',
      party: 'bg-rose-500',
      journal: 'bg-indigo-600',
      receipt: 'bg-lime-500',
    };
    return colors[docType] || 'bg-gray-500';
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPETS[universalSheetDocType] || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Get current data based on mode
  const getCurrentSheetData = () => {
    // Custom JSON data takes priority
    if (customJsonData) {
      try {
        return JSON.parse(customJsonData);
      } catch {
        // Fall through to other options
      }
    }

    // Real data mode
    if (useRealData) {
      if (universalSheetDocType === 'tenant') {
        return realTenants.find(t => t.id === selectedRealId) || null;
      }
      if (universalSheetDocType === 'agent') {
        return realAgents.find(a => a.id === selectedRealId) || null;
      }
    }

    // Mock data - SaaS Sheets
    if (universalSheetDocType === 'tenant') return MOCK_TENANT_DATA;
    if (universalSheetDocType === 'agent') return MOCK_AGENT_DATA;
    if (universalSheetDocType === 'plan') return MOCK_PLAN_DATA;
    if (universalSheetDocType === 'subscription') return MOCK_SUBSCRIPTION_DATA;
    if (universalSheetDocType === 'coupon') return MOCK_COUPON_DATA;
    if (universalSheetDocType === 'module') return MOCK_MODULE_DATA;
    // Mock data - Accounting Sheets
    if (universalSheetDocType === 'account') return MOCK_ACCOUNT_DATA;
    if (universalSheetDocType === 'customer') return MOCK_CUSTOMER_DATA;
    if (universalSheetDocType === 'supplier') return MOCK_SUPPLIER_DATA;
    if (universalSheetDocType === 'journal_entry') return MOCK_JOURNAL_ENTRY_DATA;
    if (universalSheetDocType === 'fund') return MOCK_FUND_DATA;
    return MOCK_INVOICE_DATA;
  };

  // Validate JSON input
  const handleJsonChange = (value: string) => {
    setCustomJsonData(value);
    if (value.trim()) {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (e: any) {
        setJsonError(e.message);
      }
    } else {
      setJsonError(null);
    }
  };

  // Get config for current DocType
  const currentConfig = getSheetConfig(universalSheetDocType);

  // Popup Registry - will be populated with actual components
  const popupsRegistry: PopupRegistry[] = [
    // unified-sheet removed - deleted component, use UniversalDetailSheet instead
    {
      id: 'unified-modal',
      nameKey: 'componentLab.popups.unifiedModal.name',
      descriptionKey: 'componentLab.popups.unifiedModal.description',
      type: 'modal',
      status: 'ready',
      path: 'src/components/shared/modals/UnifiedModal.tsx',
    },
    {
      id: 'general-ledger-sheet',
      nameKey: 'componentLab.popups.generalLedgerSheet.name',
      descriptionKey: 'componentLab.popups.generalLedgerSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/GeneralLedgerSheet.tsx',
    },
    {
      id: 'fund-transfer-dialog',
      nameKey: 'componentLab.popups.fundTransferDialog.name',
      descriptionKey: 'componentLab.popups.fundTransferDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/FundTransferDialog.tsx',
    },
    {
      id: 'currency-exchange-dialog',
      nameKey: 'componentLab.popups.currencyExchangeDialog.name',
      descriptionKey: 'componentLab.popups.currencyExchangeDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/CurrencyExchangeDialog.tsx',
    },
    {
      id: 'transaction-details-sheet',
      nameKey: 'componentLab.popups.transactionDetailsSheet.name',
      descriptionKey: 'componentLab.popups.transactionDetailsSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/TransactionDetailsSheet.tsx',
    },
    {
      id: 'quick-receipt-dialog',
      nameKey: 'componentLab.popups.quickReceiptDialog.name',
      descriptionKey: 'componentLab.popups.quickReceiptDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/QuickReceiptDialog.tsx',
    },
    {
      id: 'quick-payment-dialog',
      nameKey: 'componentLab.popups.quickPaymentDialog.name',
      descriptionKey: 'componentLab.popups.quickPaymentDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/QuickPaymentDialog.tsx',
    },
    {
      id: 'account-details-sheet',
      nameKey: 'componentLab.popups.accountDetailsSheet.name',
      descriptionKey: 'componentLab.popups.accountDetailsSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/AccountDetailsSheet.tsx',
    },
    {
      id: 'account-details-sheet-v2',
      nameKey: 'componentLab.popups.accountDetailsSheetV2.name',
      descriptionKey: 'componentLab.popups.accountDetailsSheetV2.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/AccountDetailsSheetV2.tsx',
    },
    {
      id: 'add-fund-dialog',
      nameKey: 'componentLab.popups.addFundDialog.name',
      descriptionKey: 'componentLab.popups.addFundDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/AddFundDialog.tsx',
    },
    {
      id: 'add-cost-center-dialog',
      nameKey: 'componentLab.popups.addCostCenterDialog.name',
      descriptionKey: 'componentLab.popups.addCostCenterDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/accounting/components/AddCostCenterDialog.tsx',
    },
    {
      id: 'fund-transaction-sheet',
      nameKey: 'componentLab.popups.fundTransactionSheet.name',
      descriptionKey: 'componentLab.popups.fundTransactionSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/FundTransactionSheet.tsx',
    },
    {
      id: 'new-journal-entry-sheet',
      nameKey: 'componentLab.popups.newJournalEntrySheet.name',
      descriptionKey: 'componentLab.popups.newJournalEntrySheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/accounting/components/NewJournalEntrySheet.tsx',
    },
    {
      id: 'journal-entry-detail-sheet',
      nameKey: 'componentLab.popups.journalEntryDetailSheet.name',
      descriptionKey: 'componentLab.popups.journalEntryDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/details/JournalEntryDetailSheet.tsx',
    },
    {
      id: 'invoice-detail-sheet',
      nameKey: 'componentLab.popups.invoiceDetailSheet.name',
      descriptionKey: 'componentLab.popups.invoiceDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/details/InvoiceDetailSheet.tsx',
    },
    {
      id: 'payment-detail-sheet',
      nameKey: 'componentLab.popups.paymentDetailSheet.name',
      descriptionKey: 'componentLab.popups.paymentDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/details/PaymentDetailSheet.tsx',
    },
    {
      id: 'nexa-table',
      nameKey: 'componentLab.popups.nexaTable.name',
      descriptionKey: 'componentLab.popups.nexaTable.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/tables/NexaTable.tsx',
    },
    {
      id: 'ledger-table',
      nameKey: 'componentLab.popups.ledgerTable.name',
      descriptionKey: 'componentLab.popups.ledgerTable.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/tables/LedgerTable.tsx',
    },
    {
      id: 'nexa-grid',
      nameKey: 'componentLab.popups.nexaGrid.name',
      descriptionKey: 'componentLab.popups.nexaGrid.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/tables/NexaGrid.tsx',
    },
    // SaaS Components
    {
      id: 'create-tenant-dialog',
      nameKey: 'componentLab.popups.createTenantDialog.name',
      descriptionKey: 'componentLab.popups.createTenantDialog.description',
      type: 'dialog',
      status: 'ready',
      path: 'src/features/saas/components/CreateTenantDialog.tsx',
      route: '/saas/subscribers',
    },
    // agent-details-sheet removed - deleted component, use SaaSDetailSheet with docType="agent"
    // Universal Detail Sheet System (Swiss Style)
    {
      id: 'universal-detail-sheet',
      nameKey: 'componentLab.popups.universalDetailSheet.name',
      descriptionKey: 'componentLab.popups.universalDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/sheets/universal/UniversalDetailSheet.tsx',
      badge: '⚠️ Component Lab Only',
    },
    // Simple Plan Sheet moved to deprecated/ - use UniversalDetailSheet with docType="plan" instead
    {
      id: 'base-detail-sheet',
      nameKey: 'componentLab.popups.baseDetailSheet.name',
      descriptionKey: 'componentLab.popups.baseDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/shared/sheets/BaseDetailSheet.tsx',
      badge: '🏗️ Foundation',
    },
    {
      id: 'saas-detail-sheet',
      nameKey: 'componentLab.popups.saasDetailSheet.name',
      descriptionKey: 'componentLab.popups.saasDetailSheet.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/saas/components/SaaSDetailSheet.tsx',
      badge: '✅ Production',
    },
    // Registration Components
    {
      id: 'register-page',
      nameKey: 'componentLab.popups.registerPage.name',
      descriptionKey: 'componentLab.popups.registerPage.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/auth/Register.tsx',
      route: '/register',
    },
    {
      id: 'registration-wizard',
      nameKey: 'componentLab.popups.registrationWizard.name',
      descriptionKey: 'componentLab.popups.registrationWizard.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/auth/FabricRegistrationWizard.tsx',
    },
    // === Demo Pages (Quick Access) ===
    {
      id: 'nexa-data-table-demo',
      nameKey: 'componentLab.popups.nexaDataTableDemo.name',
      descriptionKey: 'componentLab.popups.nexaDataTableDemo.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/pages/NexaDataTableDemo.tsx',
      route: '/nexa-table',
    },
    {
      id: 'accounting-sheets-lab',
      nameKey: 'componentLab.popups.accountingSheetsLab.name',
      descriptionKey: 'componentLab.popups.accountingSheetsLab.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/features/componentLab/AccountingSheetsLab.tsx',
      route: '/sheets-lab',
    },
    {
      id: 'nexa-kanban-board',
      nameKey: 'componentLab.popups.nexaKanbanBoard.name',
      descriptionKey: 'componentLab.popups.nexaKanbanBoard.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/ui/nexa-kanban/NexaKanbanBoard.tsx',
      route: '/kanban-lab',
      badge: '✅ Production',
    },
    // NexaListTable — Rich List Table (طبق الأصل من دورة الشراء)
    {
      id: 'nexa-list-table',
      nameKey: 'componentLab.popups.nexaListTable.name',
      descriptionKey: 'componentLab.popups.nexaListTable.description',
      type: 'sheet',
      status: 'ready',
      path: 'src/components/ui/nexa-list-table.tsx',
      badge: '✅ Production',
    },
  ];

  const columns: Column<PopupRegistry>[] = [
    {
      key: 'id',
      title: 'componentLab.table.id',
      width: '200px',
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {row.type === 'sheet' && <Sheet className="w-4 h-4 text-blue-500" />}
          {row.type === 'modal' && <MessageSquare className="w-4 h-4 text-purple-500" />}
          {row.type === 'dialog' && <MessageSquare className="w-4 h-4 text-green-500" />}
          <span className="font-mono text-xs">{row.id}</span>
        </div>
      ),
    },
    {
      key: 'nameKey',
      title: 'componentLab.table.name',
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <span className="font-medium">
          {t(row.nameKey)}
        </span>
      ),
    },
    {
      key: 'descriptionKey',
      title: 'componentLab.table.description',
      filterable: true,
      render: (_value, row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t(row.descriptionKey)}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'componentLab.table.type',
      width: '120px',
      sortable: true,
      render: (_value, row) => (
        <span className={cn(
          'text-xs px-2 py-1 rounded-md font-medium',
          row.type === 'sheet' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          row.type === 'modal' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          row.type === 'dialog' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        )}>
          {row.type.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'componentLab.table.status',
      width: '120px',
      sortable: true,
      render: (_value, row) => (
        <span className={cn(
          'text-xs px-2 py-1 rounded-md font-medium',
          row.status === 'ready' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          row.status === 'wip' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          row.status === 'planned' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
        )}>
          {t(`componentLab.status.${row.status}`)}
        </span>
      ),
    },
    {
      key: 'path',
      title: 'componentLab.table.path',
      width: '300px',
      render: (_value, row) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {row.path}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'componentLab.table.actions',
      width: '120px',
      align: 'center',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPopup(row.id)}
            disabled={row.status !== 'ready'}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            {t('componentLab.actions.open')}
          </Button>
          {row.route && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(row.route!)}
              className="gap-2"
              title={t('componentLab.actions.openInPlace') || 'فتح في مكانه'}
            >
              <FileText className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('navigation.componentLab')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('componentLab.description')}
          </p>
        </div>
      </div>

      {/* ─── Lab Sub-Navigation ─── */}
      <DevLabNav currentLabId="component-lab" />

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              {t('componentLab.info.title')}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('componentLab.info.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Popups Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <NexaTable
          data={popupsRegistry}
          columns={columns}
          onRowClick={(row) => row.status === 'ready' && setSelectedPopup(row.id)}
          rowKey="id"
          emptyMessage={t('componentLab.table.noPopups')}
          stickyHeader={true}
        />
      </div>

      {/* UnifiedModal Preview */}
      {selectedPopup === 'unified-modal' && (
        <UnifiedModal
          isOpen={true}
          onClose={() => setSelectedPopup(null)}
          size="md"
          icon={MessageSquare}
          title={t('componentLab.popups.unifiedModal.name')}
          description={t('componentLab.popups.unifiedModal.description')}
        >
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2 font-cairo">
                {t('componentLab.preview.title')}
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 font-tajawal">
                {t('componentLab.popups.unifiedModal.description')}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-mono">
                {t('componentLab.table.pathLabel')}: {popupsRegistry.find(p => p.id === 'unified-modal')?.path}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {t('componentLab.info.description')}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-2 font-cairo">
                {t('componentLab.info.title')}
              </h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 font-tajawal">
                {t('componentLab.preview.exampleContentModal')}
              </p>
            </div>
          </div>
        </UnifiedModal>
      )}

      {/* GeneralLedgerSheet Preview */}
      {selectedPopup === 'general-ledger-sheet' && (
        <GeneralLedgerSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
        />
      )}

      {/* FundTransferDialog Preview */}
      {selectedPopup === 'fund-transfer-dialog' && (
        <FundTransferDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          funds={[
            { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
            { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
            { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
            { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
          ]}
        />
      )}

      {/* CurrencyExchangeDialog Preview */}
      {selectedPopup === 'currency-exchange-dialog' && (
        <CurrencyExchangeDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          fund={{
            id: 1,
            name: 'الصندوق الرئيسي',
            type: 'cash',
            defaultCurrency: 'SAR',
            accountNumber: 'FUND-001',
            balances: [
              { currency: 'SAR', balance: 45000, totalDeposits: 100000, totalWithdrawals: 55000, todayChange: 2500 },
              { currency: 'USD', balance: 5000, totalDeposits: 8000, totalWithdrawals: 3000, todayChange: 500 },
              { currency: 'EUR', balance: 3000, totalDeposits: 5000, totalWithdrawals: 2000, todayChange: 0 },
            ],
            lastActivity: '2024-03-20',
            transactionCount: 156
          }}
        />
      )}

      {/* TransactionDetailsSheet Preview */}
      {selectedPopup === 'transaction-details-sheet' && (
        <TransactionDetailsSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          transaction={{
            id: 'JV-2024-001',
            date: '2024-03-20',
            description: 'Office Rent Payment',
            type: 'Payment',
            amount: 5000,
            status: 'posted',
            reference: 'JV-2024-001',
            account: 'Cash',
            counterAccount: 'Rent Expense',
          }}
        />
      )}

      {/* QuickReceiptDialog Preview */}
      {selectedPopup === 'quick-receipt-dialog' && (
        <QuickReceiptDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          funds={[
            { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
            { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
            { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
            { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
          ]}
        />
      )}

      {/* QuickPaymentDialog Preview */}
      {selectedPopup === 'quick-payment-dialog' && (
        <QuickPaymentDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          funds={[
            { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
            { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
            { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
            { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
          ]}
        />
      )}

      {/* AccountDetailsSheet Preview (Legacy) */}
      {selectedPopup === 'account-details-sheet' && (
        <AccountDetailsSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          account={{
            id: '1',
            code: '1010',
            name: 'الصندوق',
            nameAr: 'الصندوق',
            name_en: 'Cash',
            account_type: 'Asset',
            is_group: false,
            is_active: true,
            current_balance: 45000,
            parent_id: null,
            company_id: '1',
            description: 'صندوق نقدي رئيسي',
            parent: null,
            type: 'Asset',
          }}
        />
      )}

      {/* AccountDetailsSheetV2 Preview (New Clean Version) */}
      {selectedPopup === 'account-details-sheet-v2' && (
        <AccountDetailsSheetV2
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          account={{
            id: '1',
            code: '1010',
            name: 'الصندوق',
            nameAr: 'الصندوق',
            name_en: 'Cash',
            account_type: 'Asset',
            is_group: false,
            is_active: true,
            current_balance: 45000,
            parent_id: null,
            company_id: '1',
            description: 'صندوق نقدي رئيسي',
            parent: null,
            type: 'Asset',
          }}
        />
      )}

      {/* AddFundDialog Preview */}
      {selectedPopup === 'add-fund-dialog' && (
        <AddFundDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
        />
      )}

      {/* AddCostCenterDialog Preview */}
      {selectedPopup === 'add-cost-center-dialog' && (
        <AddCostCenterDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
        />
      )}

      {/* FundTransactionSheet Preview */}
      {selectedPopup === 'fund-transaction-sheet' && (
        <FundTransactionSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          fund={{
            id: 1,
            name: 'الصندوق الرئيسي',
            type: 'cash',
            balance: 45000,
            currency: 'SAR',
            accountNumber: 'FUND-001',
            totalDeposits: 100000,
            totalWithdrawals: 55000,
            todayChange: 2500,
            lastActivity: '2024-03-20',
          }}
          selectedCurrency="SAR"
        />
      )}

      {/* NewJournalEntrySheet Preview */}
      {selectedPopup === 'new-journal-entry-sheet' && (
        <NewJournalEntrySheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          defaultTab="journal"
        />
      )}

      {/* JournalEntryDetailSheet Preview */}
      {selectedPopup === 'journal-entry-detail-sheet' && (
        <JournalEntryDetailSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          entry={{
            id: '1',
            voucherNo: 'JV-2024-00001',
            voucherType: 'journal',
            date: '2024-03-20',
            status: 'posted',
            description: 'قيد محاسبي تجريبي',
            descriptionAr: 'قيد محاسبي تجريبي',
            lines: [
              {
                id: 1,
                lineNo: 1,
                accountCode: '1010',
                accountName: 'Cash',
                accountNameAr: 'الصندوق',
                debit: 10000,
                credit: 0,
                description: 'إيداع',
                descriptionAr: 'إيداع',
              },
              {
                id: 2,
                lineNo: 2,
                accountCode: '4101',
                accountName: 'Sales Revenue',
                accountNameAr: 'إيرادات المبيعات',
                debit: 0,
                credit: 10000,
                description: 'مبيعات',
                descriptionAr: 'مبيعات',
              },
            ],
            totalDebit: 10000,
            totalCredit: 10000,
            isBalanced: true,
          }}
        />
      )}

      {/* InvoiceDetailSheet Preview */}
      {selectedPopup === 'invoice-detail-sheet' && (
        <InvoiceDetailSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          invoice={{
            id: '1',
            invoiceNo: 'INV-2024-00001',
            invoiceType: 'sales',
            date: '2024-03-20',
            dueDate: '2024-04-20',
            status: 'partial',
            partyId: '1',
            partyName: 'Customer ABC',
            partyNameAr: 'عميل أ ب ج',
            partyType: 'customer',
            partyPhone: '+966 50 123 4567',
            currency: 'SAR',
            subtotal: 10000,
            discountAmount: 500,
            taxAmount: 1425,
            grandTotal: 10925,
            paidAmount: 5000,
            balance: 5925,
            items: [
              {
                id: 1,
                lineNo: 1,
                itemCode: 'ITEM-001',
                itemName: 'Product A',
                itemNameAr: 'منتج أ',
                quantity: 2,
                uom: 'pcs',
                uomAr: 'قطعة',
                unitPrice: 5000,
                lineTotal: 10000,
              },
            ],
          }}
        />
      )}

      {/* PaymentDetailSheet Preview */}
      {selectedPopup === 'payment-detail-sheet' && (
        <PaymentDetailSheet
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
          payment={{
            id: '1',
            voucherNo: 'PV-2024-00001',
            voucherType: 'payment',
            date: '2024-03-20',
            status: 'posted',
            paymentType: 'pay',
            amount: 5000,
            currency: 'SAR',
            partyId: '1',
            partyName: 'Supplier XYZ',
            partyNameAr: 'مورد س ص ع',
            partyType: 'supplier',
            partyPhone: '+966 50 987 6543',
            paymentMethod: 'bank',
            paymentAccount: '2010',
            paymentAccountName: 'Bank Account',
            description: 'دفعة للمورد',
            descriptionAr: 'دفعة للمورد',
            references: [
              {
                id: 1,
                documentType: 'invoice',
                documentNo: 'INV-2024-00001',
                originalAmount: 10000,
                allocatedAmount: 5000,
              },
            ],
          }}
        />
      )}

      {/* NexaTable Preview */}
      {selectedPopup === 'nexa-table' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">{t('componentLab.popups.nexaTable.name')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('componentLab.popups.nexaTable.description')}
            </p>
            <NexaTable
              data={[
                { id: '1', name: 'عميل أ', code: 'CUST-001', balance: 50000, status: 'نشط' },
                { id: '2', name: 'عميل ب', code: 'CUST-002', balance: 30000, status: 'نشط' },
                { id: '3', name: 'عميل ج', code: 'CUST-003', balance: 75000, status: 'غير نشط' },
                { id: '4', name: 'عميل د', code: 'CUST-004', balance: 25000, status: 'نشط' },
                { id: '5', name: 'عميل ه', code: 'CUST-005', balance: 45000, status: 'نشط' },
              ]}
              columns={[
                {
                  key: 'code',
                  title: 'table.code',
                  width: '150px',
                  sortable: true,
                  filterable: true,
                },
                {
                  key: 'name',
                  title: 'table.name',
                  sortable: true,
                  filterable: true,
                },
                {
                  key: 'balance',
                  title: 'table.balance',
                  width: '150px',
                  align: 'end',
                  sortable: true,
                  render: (value) => (
                    <span className="font-mono font-semibold text-green-600">
                      {value.toLocaleString()} {t('common.currency.sar')}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  title: 'table.status',
                  width: '120px',
                  align: 'center',
                  sortable: true,
                  filterable: true,
                  render: (value) => (
                    <span className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium',
                      value === 'نشط' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    )}>
                      {value}
                    </span>
                  ),
                },
              ]}
              selectable={true}
              showRowNumbers={true}
              onRowClick={(row) => console.log('Row clicked:', row)}
            />
          </div>
        </div>
      )}

      {/* LedgerTable Preview - النسخة المحسّنة */}
      {selectedPopup === 'ledger-table' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden" style={{ height: '650px' }}>
            <LedgerTable
              data={[
                { id: '1', date: '2024-01-01', reference: 'JV-001', status: 'posted', description: 'رصيد افتتاحي', debit: 50000, credit: 0, balance: 50000 },
                { id: '2', date: '2024-01-15', reference: 'INV-001', status: 'paid', description: 'مبيعات نقدية - شركة الأمل', debit: 15000, credit: 0, balance: 65000 },
                { id: '3', date: '2024-02-01', reference: 'PV-005', status: 'posted', description: 'دفع راتب موظف', debit: 0, credit: 8000, balance: 57000 },
                { id: '4', date: '2024-02-15', reference: 'INV-023', status: 'partial', description: 'إيراد خدمات استشارية', debit: 25000, credit: 0, balance: 82000 },
                { id: '5', date: '2024-03-01', reference: 'JV-012', status: 'posted', description: 'تحويل للبنك', debit: 0, credit: 30000, balance: 52000 },
                { id: '6', date: '2024-03-10', reference: 'RCT-008', status: 'posted', description: 'استلام دفعة من عميل', debit: 12000, credit: 0, balance: 64000 },
              ]}
              columns={[
                {
                  key: 'debit',
                  title: 'accounting.entry.debit',
                  width: '120px',
                  align: 'end',
                  type: 'currency',
                  showZeroAs: '-',
                  footer: 'sum',
                  render: (value: number) => value > 0 ? (
                    <span className="font-mono text-green-600">{value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                  ) : <span className="text-gray-300">-</span>
                },
                {
                  key: 'credit',
                  title: 'accounting.entry.credit',
                  width: '120px',
                  align: 'end',
                  type: 'currency',
                  showZeroAs: '-',
                  footer: 'sum',
                  render: (value: number) => value > 0 ? (
                    <span className="font-mono text-red-600">{value.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                  ) : <span className="text-gray-300">-</span>
                },
                { key: 'description', title: 'common.description', sortable: true, filterable: true },
                { key: 'date', title: 'common.date', width: '110px', type: 'date', sortable: true },
                { key: 'status', title: 'common.status', width: '100px', type: 'status' },
                { key: 'reference', title: 'common.reference', width: '100px', type: 'reference', clickable: true, sortable: true },
                {
                  key: 'balance',
                  title: 'common.balance',
                  width: '120px',
                  align: 'end',
                  render: (value: number) => (
                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                      {value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  )
                },
              ]}
              showFilters
              showQuickFilters
              showStats
              stats={{
                label1: { title: 'إجمالي المدين', value: 102000, color: 'blue' },
                label2: { title: 'إجمالي الدائن', value: 38000, color: 'red' },
                label3: { title: 'الرصيد', value: 64000, color: 'green' },
                label4: { title: 'المعلق', value: 0, color: 'gray' },
              }}
              selectable
              showRowNumbers
              showFooterTotals
              variant="ledger"
              onRefresh={() => console.log('Refresh clicked')}
              onPrint={() => window.print()}
              onExport={(format) => console.log('Export:', format)}
              footerLabel="الإجمالي"
              emptyMessage="لا توجد بيانات"
            />
          </div>
        </div>
      )}

      {/* NexaGrid Preview - Canvas-based High Performance Grid */}
      {selectedPopup === 'nexa-grid' && (
        <div className="space-y-4">
          {/* Document Type Selector */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                📋 {direction === 'rtl' ? 'اختر نوع المستند:' : 'Select Document Type:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GRID_DOC_CONFIGS) as GridDocType[]).map((docType) => {
                  const config = GRID_DOC_CONFIGS[docType];
                  return (
                    <button
                      key={docType}
                      onClick={() => setSelectedGridDocType(docType)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        selectedGridDocType === docType
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {direction === 'rtl' ? config.nameAr : config.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 {direction === 'rtl'
                ? 'اختر نوع المستند لمعاينة ترتيب الأعمدة المناسب. يمكنك أخذ سكرين شوت لحفظ الترتيب الافتراضي.'
                : 'Select a document type to preview the appropriate column order. You can take a screenshot to save the default order.'}
            </p>
          </div>

          {/* NexaGrid Component */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Debug Info */}
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
              {direction === 'rtl' ? 'عدد الصفوف' : 'Rows'}: {GRID_DOC_CONFIGS[selectedGridDocType].data.length} |
              {direction === 'rtl' ? ' عدد الأعمدة' : ' Columns'}: {GRID_DOC_CONFIGS[selectedGridDocType].columns.length}
            </div>
            {/* NexaGrid removed */}
          </div>

          {/* Feature List */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
              🚀 NexaGrid - AG Grid Professional Data Grid
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                <li>⚡ AG Grid - أقوى مكتبة جداول مثل Excel و Google Sheets</li>
                <li>📊 يدعم ملايين الصفوف بأداء فائق</li>
                <li>🖱️ تغيير حجم الأعمدة وسحبها بسلاسة</li>
                <li>🔀 سحب وإفلات الأعمدة لإعادة الترتيب</li>
                <li>🎨 ماركر الألوان (9 ألوان) - انقر لتعليم الصف</li>
                <li>📈 بطاقات الإحصائيات</li>
              </ul>
              <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                <li>📝 التفقيط - المبلغ بالكلمات العربية</li>
                <li>❓ شرح المدين والدائن بالأيقونات</li>
                <li>🔍 فلاتر ذكية لكل عمود (من بيانات الجدول)</li>
                <li>👁️ إظهار/إخفاء الأعمدة</li>
                <li>📤 تصدير Excel/CSV و Google Sheets</li>
                <li>🖨️ طباعة احترافية مع الألوان والتنسيق</li>
                <li>📱 دعم RTL كامل للغة العربية</li>
              </ul>
            </div>
          </div>

          {/* Instruction for saving default order */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              📸 {direction === 'rtl' ? 'كيفية حفظ الترتيب الافتراضي' : 'How to Save Default Order'}
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>{direction === 'rtl' ? 'اختر نوع المستند من القائمة أعلاه' : 'Select document type from the list above'}</li>
              <li>{direction === 'rtl' ? 'رتب الأعمدة بالسحب والإفلات حسب رغبتك' : 'Arrange columns by drag and drop as you prefer'}</li>
              <li>{direction === 'rtl' ? 'اضغط على الماركر واختر ألوان للصفوف المهمة' : 'Click on marker and choose colors for important rows'}</li>
              <li>{direction === 'rtl' ? 'خذ سكرين شوت للترتيب النهائي' : 'Take a screenshot of the final arrangement'}</li>
              <li>{direction === 'rtl' ? 'أرسل الصورة لتطبيق الترتيب في المكان المناسب' : 'Send the image to apply the order in the appropriate place'}</li>
            </ol>
          </div>
        </div>
      )}

      {/* CreateTenantDialog Preview */}
      {selectedPopup === 'create-tenant-dialog' && (
        <CreateTenantDialog
          open={true}
          onOpenChange={(open) => !open && setSelectedPopup(null)}
        />
      )}

      {/* Register Page Preview */}
      {selectedPopup === 'register-page' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
              📝 {direction === 'rtl' ? 'صفحة التسجيل' : 'Registration Page'}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {direction === 'rtl'
                ? 'هذه هي صفحة التسجيل الأساسية للمستخدمين الجدد. تحتوي على نموذج تسجيل مع دعم تعدد اللغات وRTL.'
                : 'This is the basic registration page for new users. Contains a registration form with multilingual support and RTL.'}
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950" style={{ height: '600px' }}>
            <Register />
          </div>
        </div>
      )}

      {/* Registration Wizard Preview */}
      {selectedPopup === 'registration-wizard' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
              🧙‍♂️ {direction === 'rtl' ? 'معالج التسجيل المتقدم' : 'Advanced Registration Wizard'}
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {direction === 'rtl'
                ? 'معالج تسجيل متعدد الخطوات يظهر بعد التسجيل الأساسي لإكمال إعداد الحساب (نوع العمل، معلومات الشركة، الإعدادات المالية).'
                : 'Multi-step registration wizard shown after basic registration to complete account setup (business type, company info, financial settings).'}
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950" style={{ height: '600px' }}>
            <FabricRegistrationWizard />
          </div>
        </div>
      )}

      {/* Simple Plan Sheet Preview */}
      {selectedPopup === 'simple-plan-sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                ✅ {direction === 'rtl' ? 'شيت الباقات البسيط' : 'Simple Plan Sheet'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPopup(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
                  ✅ No Focus Loop
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
                  🎯 Production Ready
                </span>
              </div>

              <div className="text-center py-8">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {direction === 'rtl'
                    ? 'هذا المكون يعمل في صفحة الباقات الفعلية'
                    : 'This component works in the actual Packages page'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                <div>1️⃣ {direction === 'rtl' ? 'اذهب إلى قسم SaaS' : 'Go to SaaS section'}</div>
                <div>2️⃣ {direction === 'rtl' ? 'اضغط على الباقات' : 'Click on Packages'}</div>
                <div>3️⃣ {direction === 'rtl' ? 'عرض جدولي' : 'Table View'}</div>
                <div>4️⃣ {direction === 'rtl' ? 'اضغط على باقة' : 'Click any package'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Base Detail Sheet Preview */}
      {selectedPopup === 'base-detail-sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                🏗️ {direction === 'rtl' ? 'المكون الأساسي للشيتات' : 'Base Detail Sheet'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPopup(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                  🏗️ Foundation
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
                  ✅ Stable
                </span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  {direction === 'rtl' ? 'المكون الأساسي' : 'Foundation Component'}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {direction === 'rtl'
                    ? 'هذا هو المكون الأساسي الذي تُبنى عليه جميع الشيتات المخصصة. لا يُستخدم مباشرة، بل يُستورد في المكونات المتخصصة مثل SaaSDetailSheet.'
                    : 'This is the foundation component that all custom sheets are built upon. Not used directly, but imported in specialized components like SaaSDetailSheet.'}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold">{direction === 'rtl' ? 'الميزات الرئيسية:' : 'Key Features:'}</div>
                <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                  <li>{direction === 'rtl' ? 'لا توجد مشاكل في التركيز' : 'No focus loop issues'}</li>
                  <li>{direction === 'rtl' ? 'نظام تبويبات قابل للتخصيص' : 'Customizable tab system'}</li>
                  <li>{direction === 'rtl' ? 'إحصائيات وأزرار إجراءات مرنة' : 'Flexible stats and action buttons'}</li>
                  <li>{direction === 'rtl' ? 'دعم RTL كامل' : 'Full RTL support'}</li>
                  <li>{direction === 'rtl' ? 'حوارات تأكيد آمنة' : 'Safe confirmation dialogs'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SaaS Detail Sheet Preview */}
      {selectedPopup === 'saas-detail-sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                ✅ {direction === 'rtl' ? 'شيت SaaS الموحد' : 'SaaS Detail Sheet'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPopup(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
                  ✅ Production Ready
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm">
                  🎯 Active in Packages
                </span>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                  {direction === 'rtl' ? 'الشيت الموحد لـ SaaS' : 'Unified SaaS Sheet'}
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {direction === 'rtl'
                    ? 'يدعم 4 أنواع من المستندات: Plans, Tenants, Agents, Modules. حاليًا مُفعَّل للباقات (Plans) مع 6 تبويبات كاملة.'
                    : 'Supports 4 document types: Plans, Tenants, Agents, Modules. Currently active for Plans with 6 complete tabs.'}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-semibold">{direction === 'rtl' ? 'التبويبات المتاحة للباقات:' : 'Available Tabs for Plans:'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">1️⃣ Overview</div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">2️⃣ Modules</div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">3️⃣ Limits & Features</div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">4️⃣ Subscribers</div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">5️⃣ Ledger</div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">6️⃣ Activity</div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                <div className="font-semibold">{direction === 'rtl' ? 'كيفية العرض:' : 'How to View:'}</div>
                <div>1️⃣ {direction === 'rtl' ? 'اذهب إلى قسم SaaS' : 'Go to SaaS section'}</div>
                <div>2️⃣ {direction === 'rtl' ? 'الباقات → عرض جدولي' : 'Packages → Table View'}</div>
                <div>3️⃣ {direction === 'rtl' ? 'اضغط على أي باقة' : 'Click any package'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Detail Sheet System Preview */}
      {selectedPopup === 'universal-detail-sheet' && (
        <>
          {/* Collapsed Control Panel Toggle */}
          {controlPanelCollapsed && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setControlPanelCollapsed(false)}
              className={cn(
                "fixed top-20 z-[10002] shadow-lg",
                direction === 'rtl' ? 'right-4' : 'left-4'
              )}
            >
              {direction === 'rtl' ? <PanelLeft className="w-4 h-4 me-2" /> : <PanelLeft className="w-4 h-4 me-2" />}
              {direction === 'rtl' ? 'لوحة التحكم' : 'Control Panel'}
            </Button>
          )}

          {/* Enhanced Control Panel */}
          <div className={cn(
            "fixed top-16 z-[10001] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-h-[calc(100vh-100px)] flex flex-col transition-all duration-300",
            direction === 'rtl' ? 'right-4' : 'left-4',
            controlPanelCollapsed && 'opacity-0 pointer-events-none scale-95'
          )}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-erp-teal" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {direction === 'rtl' ? 'لوحة التحكم' : 'Control Panel'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setControlPanelCollapsed(true)}
                  className="h-7 w-7 p-0"
                  title={direction === 'rtl' ? 'تصغير' : 'Minimize'}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPopup(null)}
                  className="h-7 w-7 p-0"
                  title={direction === 'rtl' ? 'إغلاق' : 'Close'}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Data Mode Toggle */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {useRealData ? (
                    <Database className="w-4 h-4 text-green-600" />
                  ) : (
                    <TestTube className="w-4 h-4 text-orange-500" />
                  )}
                  <Label htmlFor="data-mode" className="text-sm font-medium">
                    {direction === 'rtl'
                      ? (useRealData ? 'البيانات الحقيقية' : 'البيانات التجريبية')
                      : (useRealData ? 'Real Data' : 'Mock Data')
                    }
                  </Label>
                </div>
                <Switch
                  id="data-mode"
                  checked={useRealData}
                  onCheckedChange={setUseRealData}
                />
              </div>
              {useRealData && realDataError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {realDataError}
                </div>
              )}
            </div>

            {/* Tabs for different sections */}
            <Tabs value={activeControlTab} onValueChange={(v) => setActiveControlTab(v as any)} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-4 mx-3 mt-3">
                <TabsTrigger value="selector" className="text-xs">
                  <Settings2 className="w-3 h-3 mr-1" />
                  {direction === 'rtl' ? 'اختيار' : 'Select'}
                </TabsTrigger>
                <TabsTrigger value="tabs" className="text-xs">
                  <List className="w-3 h-3 mr-1" />
                  {direction === 'rtl' ? 'التبويبات' : 'Tabs'}
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs">
                  <Code className="w-3 h-3 mr-1" />
                  {direction === 'rtl' ? 'الكود' : 'Code'}
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  {direction === 'rtl' ? 'البيانات' : 'Data'}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0">
                {/* Selector Tab */}
                <TabsContent value="selector" className="p-3 space-y-3 m-0">
                  {/* Sheet Group Selector */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      {direction === 'rtl' ? 'مجموعة الشيتات' : 'Sheet Group'}
                    </label>
                    <div className="flex gap-2">
                      {(Object.keys(SHEET_GROUPS) as SheetGroup[]).map((group) => (
                        <button
                          key={group}
                          onClick={() => handleGroupChange(group)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium",
                            sheetGroup === group
                              ? "border-erp-teal bg-erp-teal/10 text-erp-teal"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          )}
                        >
                          <span className={cn("w-2.5 h-2.5 rounded-full", SHEET_GROUPS[group].color)} />
                          {direction === 'rtl' ? SHEET_GROUPS[group].labelAr : SHEET_GROUPS[group].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DocType Selector - Filtered by Group */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      {direction === 'rtl' ? 'نوع المستند' : 'Document Type'}
                    </label>
                    <Select
                      value={universalSheetDocType}
                      onValueChange={(value) => setUniversalSheetDocType(value as DocType)}
                    >
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", getDocTypeColor(universalSheetDocType))} />
                          {getDocTypeLabel(universalSheetDocType, direction === 'rtl')}
                        </div>
                      </SelectTrigger>
                      <SelectContent className="z-[10002]">
                        {SHEET_GROUPS[sheetGroup].docTypes.map((docType) => (
                          <SelectItem key={docType} value={docType}>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", getDocTypeColor(docType))} />
                              {getDocTypeLabel(docType, direction === 'rtl')}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Real Data Selector */}
                  {useRealData && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          {direction === 'rtl' ? 'اختر السجل' : 'Select Record'}
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadRealData}
                          disabled={isLoadingRealData}
                          className="h-6 px-2"
                        >
                          <RefreshCw className={cn("w-3 h-3", isLoadingRealData && "animate-spin")} />
                        </Button>
                      </div>
                      <Select
                        value={selectedRealId}
                        onValueChange={setSelectedRealId}
                        disabled={isLoadingRealData}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={direction === 'rtl' ? 'اختر...' : 'Select...'} />
                        </SelectTrigger>
                        <SelectContent className="z-[10002]">
                          {universalSheetDocType === 'tenant' && realTenants.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1">
                                  {t.status}
                                </Badge>
                                {t.name}
                              </div>
                            </SelectItem>
                          ))}
                          {universalSheetDocType === 'agent' && realAgents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1">
                                  {a.status}
                                </Badge>
                                {a.name}
                              </div>
                            </SelectItem>
                          ))}
                          {(universalSheetDocType !== 'tenant' && universalSheetDocType !== 'agent') && (
                            <SelectItem value="mock" disabled>
                              {direction === 'rtl' ? 'غير متاح للبيانات الحقيقية' : 'Real data not available'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {isLoadingRealData && (
                        <p className="text-xs text-gray-500 mt-1">
                          {direction === 'rtl' ? 'جاري التحميل...' : 'Loading...'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Config Summary */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{direction === 'rtl' ? 'التبويبات:' : 'Tabs:'}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {TABS_INFO[universalSheetDocType]?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{direction === 'rtl' ? 'الحقول:' : 'Fields:'}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {currentConfig?.infoFields?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{direction === 'rtl' ? 'الإجراءات:' : 'Actions:'}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {currentConfig?.actions?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{direction === 'rtl' ? 'البطاقات:' : 'Stats:'}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {currentConfig?.stats?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Config Path */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    src/components/sheets/configs/{universalSheetDocType}.config.ts
                  </div>
                </TabsContent>

                {/* Tabs List Tab */}
                <TabsContent value="tabs" className="p-3 m-0">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      {direction === 'rtl' ? 'التبويبات المتاحة:' : 'Available Tabs:'}
                    </h4>
                    {TABS_INFO[universalSheetDocType]?.map((tab, index) => (
                      <div
                        key={tab.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                      >
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {direction === 'rtl' ? tab.labelAr : tab.label}
                          </span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="font-mono text-gray-500">{tab.id}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      </div>
                    ))}
                    {!TABS_INFO[universalSheetDocType]?.length && (
                      <p className="text-xs text-gray-500 text-center py-4">
                        {direction === 'rtl' ? 'لا توجد تبويبات' : 'No tabs configured'}
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Code Tab */}
                <TabsContent value="code" className="p-3 m-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {direction === 'rtl' ? 'كود الاستخدام:' : 'Usage Code:'}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-7 text-xs"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-600" />
                            {direction === 'rtl' ? 'تم النسخ' : 'Copied!'}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            {direction === 'rtl' ? 'نسخ' : 'Copy'}
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-[10px] overflow-x-auto">
                      <code>{CODE_SNIPPETS[universalSheetDocType] || '// No code snippet available'}</code>
                    </pre>

                    {/* Import statement */}
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        {direction === 'rtl' ? 'الاستيراد:' : 'Import:'}
                      </h4>
                      <pre className="p-2 bg-gray-900 text-gray-100 rounded text-[10px]">
                        <code>{`import { UniversalDetailSheet } from '@/components/sheets';`}</code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                {/* Data Tab */}
                <TabsContent value="data" className="p-3 m-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {direction === 'rtl' ? 'بيانات مخصصة (JSON):' : 'Custom Data (JSON):'}
                      </h4>
                      {customJsonData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setCustomJsonData(''); setJsonError(null); }}
                          className="h-6 text-xs text-red-500"
                        >
                          {direction === 'rtl' ? 'مسح' : 'Clear'}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={customJsonData}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      placeholder={direction === 'rtl'
                        ? 'أدخل JSON مخصص أو اتركه فارغاً لاستخدام البيانات الافتراضية...'
                        : 'Enter custom JSON or leave empty for default data...'
                      }
                      className="font-mono text-xs h-40 resize-none"
                    />
                    {jsonError && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{jsonError}</span>
                      </div>
                    )}

                    {/* Quick fill buttons */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          const mockData = universalSheetDocType === 'tenant' ? MOCK_TENANT_DATA :
                            universalSheetDocType === 'agent' ? MOCK_AGENT_DATA :
                              MOCK_INVOICE_DATA;
                          setCustomJsonData(JSON.stringify(mockData, null, 2));
                          setJsonError(null);
                        }}
                      >
                        {direction === 'rtl' ? 'تعبئة تجريبية' : 'Fill Mock'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          setCustomJsonData(JSON.stringify({ id: 'test', name: 'Test', status: 'active' }, null, 2));
                          setJsonError(null);
                        }}
                      >
                        {direction === 'rtl' ? 'قالب بسيط' : 'Simple Template'}
                      </Button>
                    </div>

                    {/* Current data preview */}
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        {direction === 'rtl' ? 'البيانات الحالية:' : 'Current Data:'}
                      </h4>
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] font-mono max-h-32 overflow-auto">
                        {getCurrentSheetData() ? (
                          <pre>{JSON.stringify(getCurrentSheetData(), null, 2).slice(0, 500)}...</pre>
                        ) : (
                          <span className="text-gray-500">{direction === 'rtl' ? 'لا توجد بيانات' : 'No data'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* The Universal Detail Sheet - Full Sheet (with animation) */}
          {getCurrentSheetData() && (
            <>
              {/* Control Panel Toggle Button - At edge of sheet */}
              <Button
                variant="default"
                size="sm"
                onClick={() => setControlPanelCollapsed(!controlPanelCollapsed)}
                className={cn(
                  "fixed top-4 z-[10001] shadow-lg transition-all",
                  direction === 'rtl' ? 'right-2' : 'left-2',
                  controlPanelCollapsed
                    ? "bg-erp-teal hover:bg-erp-teal/90"
                    : "bg-gray-700 hover:bg-gray-600"
                )}
                title={direction === 'rtl'
                  ? (controlPanelCollapsed ? 'إظهار لوحة التحكم' : 'إخفاء لوحة التحكم')
                  : (controlPanelCollapsed ? 'Show Control Panel' : 'Hide Control Panel')
                }
              >
                {controlPanelCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </Button>

              <UniversalDetailSheet
                isOpen={true}
                onClose={() => setSelectedPopup(null)}
                docType={universalSheetDocType}
                data={getCurrentSheetData()}
                styleVariant="swiss"
                preventCloseOnOutsideClick={true}
                onRefresh={() => {
                  if (useRealData) loadRealData();
                  console.log('Refresh clicked');
                }}
                onEdit={() => console.log('Edit clicked')}
              />
            </>
          )}

          {/* No data message */}
          {!getCurrentSheetData() && (
            <div
              className={cn(
                "fixed inset-y-0 h-[100dvh] min-h-[100dvh] bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-s border-gray-200 dark:border-gray-700 z-[100] animate-in fade-in duration-300 ease-out",
                direction === 'rtl' ? 'left-0' : 'right-0',
                controlPanelCollapsed ? "w-[75%] lg:w-[80%]" : "w-[55%] lg:w-[60%]",
                direction === 'rtl' ? "slide-in-from-left-8" : "slide-in-from-right-8"
              )}
            >
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center max-w-sm shadow-lg">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {direction === 'rtl' ? 'لا توجد بيانات' : 'No Data'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {direction === 'rtl'
                    ? 'اختر سجلاً من القائمة أو أضف بيانات JSON مخصصة'
                    : 'Select a record from the list or add custom JSON data'
                  }
                </p>
                <Button variant="outline" onClick={() => setUseRealData(false)}>
                  {direction === 'rtl' ? 'استخدام البيانات التجريبية' : 'Use Mock Data'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 useCommandPalette — البحث الشامل الفوري من الكاش
 * ════════════════════════════════════════════════════════════════
 *
 * يقرأ جميع البيانات من React Query Cache (بدون network requests).
 * يبحث في كل حقول اللغات: ar, en, ru, uk, tr + الباركود + الأكواد.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { STATIC_MODULES } from '@/config/modules';
import type { EntityType } from '@/contexts/GlobalSheetContext';
import {
  LayoutDashboard, Calculator, Package, ShoppingCart, ShoppingBag,
  Users, Settings, Building2, Globe, FileText, Landmark,
  Plus, CreditCard, UserPlus, FilePlus, Receipt,
  GitBranch, Printer, Bell, Bot, Shield, FileUp, Link2, Megaphone,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

export type ResultCategory = 'navigation' | 'action' | 'customer' | 'supplier' | 'material' | 'account' | 'warehouse' | 'invoice' | 'journal' | 'fund';

export interface SearchResult {
  id: string;
  category: ResultCategory;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  path?: string;
  action?: () => void;
  /** higher = shown first */
  priority: number;
  /** نوع الكيان — لفتح الشيت مباشرة */
  entityType?: EntityType;
  /** معرف الكيان — لفتح الشيت مباشرة */
  entityId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics
    .replace(/[أإآ]/g, 'ا')               // normalize alef variants
    .replace(/ة/g, 'ه')                    // taa marbuta
    .replace(/ى/g, 'ي')                    // alef maqsura
    .trim();
}

function matches(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query) return true;
  const q = normalize(query);
  return fields.some(f => f && normalize(f).includes(q));
}

function getName(item: any, lang: string): string {
  switch (lang) {
    case 'ar': return item.name_ar || item.name_en || item.name || '';
    case 'ru': return item.name_ru || item.name_en || item.name_ar || '';
    case 'uk': return item.name_uk || item.name_en || item.name_ar || '';
    case 'tr': return item.name_tr || item.name_en || item.name_ar || '';
    default:   return item.name_en || item.name_ar || item.name || '';
  }
}

// ─── Static Navigation Items ────────────────────────────────────

function getNavigationItems(lang: string): SearchResult[] {
  const isAr = lang === 'ar';

  // Module navigation from STATIC_MODULES
  const moduleNav: SearchResult[] = STATIC_MODULES
    .filter(m => m.is_enabled && !m.requires_super_admin)
    .map(m => ({
      id: `nav-${m.code}`,
      category: 'navigation' as const,
      icon: m.icon || Package,
      title: lang === 'ar' ? m.name_ar : lang === 'ru' ? (m.name_ru || m.name_en) : lang === 'uk' ? (m.name_uk || m.name_en) : m.name_en,
      subtitle: isAr ? 'انتقال سريع' : 'Quick navigation',
      path: m.path,
      priority: 90,
    }));

  // Settings sub-pages (deep links to system-config tabs)
  const settingsNav: SearchResult[] = [
    // ─── Main settings tabs ───
    { id: 'nav-settings-company', icon: Building2, titleAr: 'بيانات المنشأة', titleEn: 'Company Profile', path: '/system-config/company' },
    { id: 'nav-settings-accounting', icon: Calculator, titleAr: 'إعدادات المحاسبة', titleEn: 'Accounting Settings', path: '/system-config/accounting' },
    { id: 'nav-settings-warehouse', icon: Package, titleAr: 'إعدادات المستودعات', titleEn: 'Warehouse Settings', path: '/system-config/warehouse' },
    { id: 'nav-settings-sales', icon: ShoppingCart, titleAr: 'إعدادات المبيعات', titleEn: 'Sales Settings', path: '/system-config/sales' },
    { id: 'nav-settings-tax', icon: Globe, titleAr: 'الضرائب والأنظمة', titleEn: 'Tax System', path: '/system-config/tax' },
    { id: 'nav-settings-users', icon: Shield, titleAr: 'المستخدمون والصلاحيات', titleEn: 'Users & Permissions', path: '/system-config/users-permissions' },
    { id: 'nav-settings-integrations', icon: Link2, titleAr: 'التكاملات', titleEn: 'Integrations', path: '/system-config/integrations' },
    { id: 'nav-settings-ai', icon: Bot, titleAr: 'الذكاء الاصطناعي واللغات', titleEn: 'AI & Languages', path: '/system-config/ai-languages' },
    { id: 'nav-settings-import', icon: FileUp, titleAr: 'استيراد البيانات', titleEn: 'Data Import', path: '/system-config/import' },
    { id: 'nav-settings-notifications', icon: Bell, titleAr: 'الإشعارات', titleEn: 'Notifications', path: '/system-config/notifications' },
    { id: 'nav-settings-print', icon: Printer, titleAr: 'الطباعة', titleEn: 'Printing', path: '/system-config/print' },
    { id: 'nav-settings-announcements', icon: Megaphone, titleAr: 'الإعلانات', titleEn: 'Announcements', path: '/system-config/announcements' },
    // ─── Searchable aliases — commonly searched terms ───
    // العملات / Currencies
    { id: 'nav-alias-currencies', icon: Globe, titleAr: 'العملات', titleEn: 'Currencies', path: '/system-config/accounting' },
    { id: 'nav-alias-exchange-rates', icon: Globe, titleAr: 'أسعار الصرف', titleEn: 'Exchange Rates', path: '/system-config/accounting' },
    { id: 'nav-alias-base-currency', icon: Globe, titleAr: 'العملة الأساسية', titleEn: 'Base Currency', path: '/system-config/accounting' },
    // السنوات المالية / Fiscal Years
    { id: 'nav-alias-fiscal-years', icon: Calculator, titleAr: 'السنوات المالية', titleEn: 'Fiscal Years', path: '/system-config/accounting' },
    { id: 'nav-alias-fiscal-period', icon: Calculator, titleAr: 'الفترات المالية', titleEn: 'Fiscal Periods', path: '/system-config/accounting' },
    // مراكز التكلفة / Cost Centers
    { id: 'nav-alias-cost-centers', icon: Calculator, titleAr: 'مراكز التكلفة', titleEn: 'Cost Centers', path: '/system-config/accounting' },
    // الحسابات الافتراضية / Default Accounts
    { id: 'nav-alias-default-accounts', icon: Calculator, titleAr: 'الحسابات الافتراضية', titleEn: 'Default Accounts', path: '/system-config/accounting' },
    // الترقيم / Numbering
    { id: 'nav-alias-numbering', icon: Calculator, titleAr: 'ترقيم القيود', titleEn: 'Entry Numbering', path: '/system-config/accounting' },
    // الفروع / Branches
    { id: 'nav-alias-branches', icon: Building2, titleAr: 'الفروع', titleEn: 'Branches', path: '/system-config/company' },
    { id: 'nav-alias-company-info', icon: Building2, titleAr: 'معلومات الشركة', titleEn: 'Company Information', path: '/system-config/company' },
    // الضرائب / Taxes
    { id: 'nav-alias-vat', icon: Globe, titleAr: 'ضريبة القيمة المضافة', titleEn: 'VAT', path: '/system-config/tax' },
    { id: 'nav-alias-tax-rate', icon: Globe, titleAr: 'نسبة الضريبة', titleEn: 'Tax Rate', path: '/system-config/tax' },
    { id: 'nav-alias-tax-settlement', icon: Globe, titleAr: 'تسوية الضرائب', titleEn: 'Tax Settlement', path: '/system-config/tax' },
    // المستخدمون / Users
    { id: 'nav-alias-users', icon: Shield, titleAr: 'المستخدمون', titleEn: 'Users', path: '/system-config/users-permissions' },
    { id: 'nav-alias-roles', icon: Shield, titleAr: 'الصلاحيات والأدوار', titleEn: 'Roles & Permissions', path: '/system-config/users-permissions' },
    // الطباعة
    { id: 'nav-alias-invoice-print', icon: Printer, titleAr: 'طباعة الفواتير', titleEn: 'Invoice Printing', path: '/system-config/print' },
    { id: 'nav-alias-receipt-print', icon: Printer, titleAr: 'طباعة السندات', titleEn: 'Receipt Printing', path: '/system-config/print' },
  ].map(s => ({
    id: s.id,
    category: 'navigation' as const,
    icon: s.icon,
    title: isAr ? s.titleAr : s.titleEn,
    subtitle: isAr ? 'الإعدادات' : 'Settings',
    path: s.path,
    priority: s.id.startsWith('nav-alias') ? 83 : 85,
  }));

  // Accounting sub-sections (paths match Accounting.tsx getActiveTab)
  const accountingNav: SearchResult[] = [
    { id: 'nav-acc-dashboard', titleAr: 'لوحة المحاسبة', titleEn: 'Accounting Dashboard', path: '/accounting' },
    { id: 'nav-acc-chart', titleAr: 'شجرة الحسابات', titleEn: 'Chart of Accounts', path: '/accounting/chart-of-accounts' },
    { id: 'nav-acc-journal', titleAr: 'القيود المحاسبية', titleEn: 'Journal Entries', path: '/accounting/journal-entries' },
    { id: 'nav-acc-ledger', titleAr: 'دفتر الأستاذ', titleEn: 'General Ledger', path: '/accounting/general-ledger' },
    { id: 'nav-acc-funds', titleAr: 'الصناديق والبنوك', titleEn: 'Funds & Banks', path: '/accounting/funds' },
    { id: 'nav-acc-parties', titleAr: 'الجهات', titleEn: 'Parties', path: '/accounting/parties' },
    { id: 'nav-acc-partners', titleAr: 'الشركاء', titleEn: 'Equity Partners', path: '/accounting/equity-partners' },
    { id: 'nav-acc-budget', titleAr: 'الموازنة', titleEn: 'Budget', path: '/accounting/budget' },
    { id: 'nav-acc-recurring', titleAr: 'القيود المتكررة', titleEn: 'Recurring Entries', path: '/accounting/recurring' },
    { id: 'nav-acc-settings', titleAr: 'إعدادات المحاسبة', titleEn: 'Accounting Settings', path: '/accounting/settings' },
    { id: 'nav-acc-reports', titleAr: 'التقارير', titleEn: 'Reports', path: '/accounting/reports' },
  ].map(s => ({
    id: s.id,
    category: 'navigation' as const,
    icon: Calculator,
    title: isAr ? s.titleAr : s.titleEn,
    subtitle: isAr ? 'المحاسبة' : 'Accounting',
    path: s.path,
    priority: 85,
  }));

  // Sales sub-sections (paths match SalesPage.tsx getActiveTab)
  const salesNav: SearchResult[] = [
    { id: 'nav-sales-dashboard', titleAr: 'لوحة المبيعات', titleEn: 'Sales Dashboard', path: '/sales' },
    { id: 'nav-sales-customers', titleAr: 'الزبائن', titleEn: 'Customers', path: '/sales/customers' },
    { id: 'nav-sales-cycle', titleAr: 'دورة المبيعات', titleEn: 'Sales Cycle', path: '/sales/cycle' },
    { id: 'nav-sales-invoices', titleAr: 'فواتير المبيعات', titleEn: 'Sales Invoices', path: '/sales/cycle' },
    { id: 'nav-sales-payments', titleAr: 'سندات القبض', titleEn: 'Payment Receipts', path: '/sales/payments' },
    { id: 'nav-sales-reports', titleAr: 'تقارير المبيعات', titleEn: 'Sales Reports', path: '/sales/reports' },
    { id: 'nav-sales-settings', titleAr: 'إعدادات المبيعات', titleEn: 'Sales Settings', path: '/sales/settings' },
  ].map(s => ({
    id: s.id,
    category: 'navigation' as const,
    icon: ShoppingCart,
    title: isAr ? s.titleAr : s.titleEn,
    subtitle: isAr ? 'المبيعات' : 'Sales',
    path: s.path,
    priority: 85,
  }));

  // Purchase sub-sections (paths match PurchasesPage.tsx getActiveTab)
  const purchaseNav: SearchResult[] = [
    { id: 'nav-purch-dashboard', titleAr: 'لوحة المشتريات', titleEn: 'Purchases Dashboard', path: '/purchases' },
    { id: 'nav-purch-suppliers', titleAr: 'الموردون', titleEn: 'Suppliers', path: '/purchases/suppliers' },
    { id: 'nav-purch-cycle', titleAr: 'دورة المشتريات', titleEn: 'Purchase Cycle', path: '/purchases/cycle' },
    { id: 'nav-purch-invoices', titleAr: 'فواتير المشتريات', titleEn: 'Purchase Invoices', path: '/purchases/cycle' },
    { id: 'nav-purch-payments', titleAr: 'سندات الصرف', titleEn: 'Payment Vouchers', path: '/purchases/payments' },
    { id: 'nav-purch-containers', titleAr: 'الكونتينرات', titleEn: 'Containers', path: '/purchases/containers' },
    { id: 'nav-purch-settings', titleAr: 'إعدادات المشتريات', titleEn: 'Purchase Settings', path: '/purchases/settings' },
  ].map(s => ({
    id: s.id,
    category: 'navigation' as const,
    icon: ShoppingBag,
    title: isAr ? s.titleAr : s.titleEn,
    subtitle: isAr ? 'المشتريات' : 'Purchases',
    path: s.path,
    priority: 85,
  }));

  // Warehouse sub-sections (paths match WarehouseModule.tsx getActiveTab)
  const warehouseNav: SearchResult[] = [
    { id: 'nav-wh-dashboard', titleAr: 'لوحة المستودعات', titleEn: 'Warehouse Dashboard', path: '/warehouse' },
    { id: 'nav-wh-warehouses', titleAr: 'المستودعات والمواقع', titleEn: 'Warehouses & Locations', path: '/warehouse/warehouses' },
    { id: 'nav-wh-materials', titleAr: 'المواد والمنتجات', titleEn: 'Materials & Products', path: '/warehouse/materials' },
    { id: 'nav-wh-inventory', titleAr: 'المخزون', titleEn: 'Inventory', path: '/warehouse/inventory' },
    { id: 'nav-wh-movements', titleAr: 'حركات المخزون', titleEn: 'Stock Movements', path: '/warehouse/stockMovements' },
    { id: 'nav-wh-transfers', titleAr: 'المناقلات', titleEn: 'Transfers', path: '/warehouse/transfers' },
    { id: 'nav-wh-receipts', titleAr: 'أذون الاستلام والتسليم', titleEn: 'Receipts & Deliveries', path: '/warehouse/receiptsDeliveries' },
    { id: 'nav-wh-stockcount', titleAr: 'الجرد المخزني', titleEn: 'Stock Count', path: '/warehouse/stockCount' },
    { id: 'nav-wh-reservations', titleAr: 'الحجوزات', titleEn: 'Reservations', path: '/warehouse/reservations' },
    { id: 'nav-wh-reports', titleAr: 'تقارير المستودعات', titleEn: 'Warehouse Reports', path: '/warehouse/reports' },
  ].map(s => ({
    id: s.id,
    category: 'navigation' as const,
    icon: Package,
    title: isAr ? s.titleAr : s.titleEn,
    subtitle: isAr ? 'المستودعات' : 'Warehouse',
    path: s.path,
    priority: 85,
  }));

  return [...moduleNav, ...settingsNav, ...accountingNav, ...salesNav, ...purchaseNav, ...warehouseNav];
}

// ─── Quick Actions ──────────────────────────────────────────────

function getQuickActions(lang: string): SearchResult[] {
  const isAr = lang === 'ar';
  return [
    // ── إنشاء مستندات جديدة ──
    { id: 'act-new-sales-invoice', icon: FilePlus, titleAr: 'فاتورة مبيعات جديدة', titleEn: 'New Sales Invoice', path: '/sales/cycle' },
    { id: 'act-new-purchase-invoice', icon: FilePlus, titleAr: 'فاتورة مشتريات جديدة', titleEn: 'New Purchase Invoice', path: '/purchases/cycle' },
    { id: 'act-new-receipt', icon: Receipt, titleAr: 'سند قبض جديد', titleEn: 'New Payment Receipt', path: '/sales/payments' },
    { id: 'act-new-payment', icon: CreditCard, titleAr: 'سند صرف جديد', titleEn: 'New Payment Voucher', path: '/purchases/payments' },
    { id: 'act-new-journal', icon: FileText, titleAr: 'قيد محاسبي جديد', titleEn: 'New Journal Entry', path: '/accounting/journal-entries' },
    { id: 'act-new-customer', icon: UserPlus, titleAr: 'زبون جديد', titleEn: 'New Customer', path: '/sales/customers' },
    { id: 'act-new-supplier', icon: UserPlus, titleAr: 'مورد جديد', titleEn: 'New Supplier', path: '/purchases/suppliers' },
    { id: 'act-new-material', icon: Plus, titleAr: 'مادة جديدة', titleEn: 'New Material', path: '/warehouse/materials' },
    // ── عمليات المستودع ──
    { id: 'act-new-transfer', icon: GitBranch, titleAr: 'مناقلة جديدة', titleEn: 'New Transfer', path: '/warehouse/transfers' },
    { id: 'act-stock-count', icon: Package, titleAr: 'جرد مخزني', titleEn: 'Stock Count', path: '/warehouse/stockCount' },
  ].map(a => ({
    id: a.id,
    category: 'action' as const,
    icon: a.icon,
    title: isAr ? a.titleAr : a.titleEn,
    subtitle: isAr ? 'إجراء سريع' : 'Quick action',
    badge: isAr ? 'جديد' : 'New',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    path: a.path,
    priority: 80,
  }));
}

// ─── Main Hook ──────────────────────────────────────────────────

export function useCommandPalette() {
  const queryClient = useQueryClient();
  const { companyId } = useAuth();
  const { language } = useLanguage();

  // Static items (navigation + actions)
  const staticItems = useMemo(() => {
    return [...getNavigationItems(language), ...getQuickActions(language)];
  }, [language]);

  // ─── Smart Cache Scanner ────────────────────────────────────
  // بدلاً من البحث في key ثابت واحد، يبحث في كل الـ keys المحتملة
  // لضمان إيجاد البيانات بغض النظر عن ترتيب التحميل
  const getFirstCacheHit = useCallback((prefixes: unknown[][]): any[] => {
    for (const prefix of prefixes) {
      // محاولة مباشرة أولاً (أسرع)
      const direct = queryClient.getQueryData<any[]>(prefix);
      if (direct && Array.isArray(direct) && direct.length > 0) return direct;
    }
    // Fallback: scan cache with prefix matching
    for (const prefix of prefixes) {
      const hits = queryClient.getQueriesData<any[]>({ queryKey: prefix });
      for (const [, data] of hits) {
        if (data && Array.isArray(data) && data.length > 0) return data;
      }
    }
    return [];
  }, [queryClient]);

  // Search function — reads from cache, no network
  const search = useCallback((query: string): SearchResult[] => {
    if (!companyId) return [];

    const q = query.trim();
    const results: SearchResult[] = [];

    // 1. Filter static items (navigation + actions)
    if (!q || q.length <= 20) {
      const filteredStatic = staticItems.filter(item =>
        matches(q, item.title, item.subtitle)
      );
      results.push(...filteredStatic);
    }

    // Only search data when there's actual query text
    if (q.length >= 1) {
      // ── Dedupe tracker to avoid showing same entity from multiple cache keys ──
      const seen = new Set<string>();

      // 2. Customers — scan all possible cache keys
      const customers = getFirstCacheHit([
        ['parties_customers', companyId],
        ['customers_list', companyId],
        ['parties_customers'],
        ['customers_list'],
      ]);
      for (const c of customers) {
        if (!c?.id || seen.has(`cust-${c.id}`)) continue;
        if (matches(q, c.name_ar, c.name_en, c.name_ru, c.name_uk, c.name_tr, c.code, c.phone, c.email, c.tax_number)) {
          seen.add(`cust-${c.id}`);
          results.push({
            id: `cust-${c.id}`,
            category: 'customer',
            icon: Users,
            title: getName(c, language),
            subtitle: [c.code, c.phone].filter(Boolean).join(' • '),
            badge: language === 'ar' ? 'عميل' : 'Customer',
            badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            path: `/crm?tab=customers&id=${c.id}`,
            priority: 70,
            entityType: 'customer',
            entityId: c.id,
          });
        }
        if (results.length > 60) break;
      }

      // 3. Suppliers — scan all possible cache keys
      const suppliers = getFirstCacheHit([
        ['parties_suppliers', companyId],
        ['suppliers_list', companyId],
        ['parties_suppliers'],
        ['suppliers_list'],
      ]);
      for (const s of suppliers) {
        if (!s?.id || seen.has(`supp-${s.id}`)) continue;
        if (matches(q, s.name_ar, s.name_en, s.name_ru, s.name_uk, s.name_tr, s.code, s.phone, s.email, s.tax_number)) {
          seen.add(`supp-${s.id}`);
          results.push({
            id: `supp-${s.id}`,
            category: 'supplier',
            icon: ShoppingBag,
            title: getName(s, language),
            subtitle: [s.code, s.phone].filter(Boolean).join(' • '),
            badge: language === 'ar' ? 'مورد' : 'Supplier',
            badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            path: `/crm?tab=suppliers&id=${s.id}`,
            priority: 70,
            entityType: 'supplier',
            entityId: s.id,
          });
        }
        if (results.length > 80) break;
      }

      // 4. Materials — scan all possible cache keys (including full detail)
      const materials = getFirstCacheHit([
        ['warehouse', 'materials', companyId],
        ['inventory-preload-materials', companyId],
        ['materials-full-detail', companyId],
        ['warehouse', 'materials'],
        ['inventory-preload-materials'],
        ['materials-full-detail'],
      ]);
      for (const m of materials) {
        if (!m?.id || seen.has(`mat-${m.id}`)) continue;
        if (matches(q, m.name_ar, m.name_en, m.name_ru, m.name_uk, m.name_tr,
                     m.sku, m.barcode, m.product_code, m.code, m.material_code)) {
          seen.add(`mat-${m.id}`);
          results.push({
            id: `mat-${m.id}`,
            category: 'material',
            icon: Package,
            title: getName(m, language),
            subtitle: [m.sku || m.barcode || m.product_code || m.code].filter(Boolean).join(' • '),
            badge: language === 'ar' ? 'مادة' : 'Material',
            badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            path: `/warehouse?material=${m.id}`,
            priority: 65,
            entityType: 'material',
            entityId: m.id,
          });
        }
        if (results.length > 100) break;
      }

      // 5. Accounts (chart of accounts) — scan all keys
      const accounts = getFirstCacheHit([
        ['accounts', companyId, 'all'],
        ['accounts', companyId],
        ['accounting', 'accounts', companyId],
        ['accounts'],
      ]);
      for (const a of accounts) {
        if (!a?.id || seen.has(`acc-${a.id}`)) continue;
        if (matches(q, a.name_ar, a.name_en, a.name_ru, a.name_uk, a.account_code, a.code)) {
          seen.add(`acc-${a.id}`);
          results.push({
            id: `acc-${a.id}`,
            category: 'account',
            icon: Calculator,
            title: `${a.account_code || ''} — ${getName(a, language)}`,
            subtitle: a.account_type || '',
            badge: language === 'ar' ? 'حساب' : 'Account',
            badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            path: `/accounting?account=${a.id}`,
            priority: 60,
            entityType: 'account',
            entityId: a.id,
          });
        }
        if (results.length > 120) break;
      }

      // 6. Warehouses — scan all keys
      const warehouses = getFirstCacheHit([
        ['warehouse', 'list', companyId],
        ['warehouse', 'list'],
      ]);
      for (const w of warehouses) {
        if (!w?.id || seen.has(`wh-${w.id}`)) continue;
        if (matches(q, w.name_ar, w.name_en, w.name_ru, w.name_uk, w.code)) {
          seen.add(`wh-${w.id}`);
          results.push({
            id: `wh-${w.id}`,
            category: 'warehouse',
            icon: Building2,
            title: getName(w, language),
            subtitle: w.code || '',
            badge: language === 'ar' ? 'مستودع' : 'Warehouse',
            badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            path: `/warehouse?wh=${w.id}`,
            priority: 60,
          });
        }
      }

      // 7. Sales Invoices — scan all keys
      const salesInvoices = getFirstCacheHit([
        ['sales_cycle_full', companyId],
        ['sales_cycle_full'],
        ['sales', 'invoices', companyId],
      ]);
      for (const inv of salesInvoices) {
        if (!inv?.id || seen.has(`sinv-${inv.id}`)) continue;
        if (matches(q, inv.doc_number, inv.customer_name, inv.notes, inv.invoice_number)) {
          seen.add(`sinv-${inv.id}`);
          results.push({
            id: `sinv-${inv.id}`,
            category: 'invoice',
            icon: FileText,
            title: inv.doc_number || inv.invoice_number || inv.id,
            subtitle: inv.customer_name || '',
            badge: language === 'ar' ? 'فاتورة بيع' : 'Sales Invoice',
            badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
            path: `/sales?invoice=${inv.id}`,
            priority: 55,
            entityType: 'sales_invoice',
            entityId: inv.id,
          });
        }
        if (results.length > 140) break;
      }

      // 8. Journal Entries — scan all keys
      const journalData = getFirstCacheHit([
        ['accounting', 'journal-entries', companyId],
        ['accounting', 'journal-entries'],
      ]);
      for (const je of journalData) {
        if (!je?.id || seen.has(`je-${je.id}`)) continue;
        if (matches(q, je.entry_number, je.description, je.description_ar, je.description_en, je.reference_number)) {
          seen.add(`je-${je.id}`);
          results.push({
            id: `je-${je.id}`,
            category: 'journal',
            icon: FileText,
            title: je.entry_number || je.id,
            subtitle: je.description || je.description_ar || je.description_en || '',
            badge: language === 'ar' ? 'قيد' : 'Journal',
            badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            path: `/accounting?journal=${je.id}`,
            priority: 50,
            entityType: 'journal',
            entityId: je.id,
          });
        }
        if (results.length > 150) break;
      }

      // 9. Funds & Banks — scan all keys
      const funds = getFirstCacheHit([
        ['accounting', 'funds', companyId],
        ['accounting', 'funds'],
      ]);
      for (const f of funds) {
        if (!f?.id || seen.has(`fund-${f.id}`)) continue;
        if (matches(q, f.name_ar, f.name_en, f.account_code)) {
          seen.add(`fund-${f.id}`);
          results.push({
            id: `fund-${f.id}`,
            category: 'fund',
            icon: Landmark,
            title: getName(f, language),
            subtitle: f.account_code || '',
            badge: language === 'ar' ? (f.is_bank_account ? 'بنك' : 'صندوق') : (f.is_bank_account ? 'Bank' : 'Cash'),
            badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
            path: `/accounting?fund=${f.id}`,
            priority: 55,
            entityType: 'fund',
            entityId: f.id,
          });
        }
      }
    }

    // Sort: priority desc, then alpha
    results.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

    return results.slice(0, 50);
  }, [companyId, language, staticItems, getFirstCacheHit]);

  return { search };
}

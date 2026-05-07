'use client';

import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useKpiSummary, useNetPosition, useCashFlowSeries, useAttentionItems, useTopCustomers, useTopSuppliers, useRecentActivity, useCurrencyExposure, useExchangeRate } from './_hooks/useDashboardData';

import { DashboardHeader } from './_components/DashboardHeader';
import { NetPositionHero } from './_components/NetPositionHero';
import { KpiGrid } from './_components/KpiGrid';
import { CashFlowChart } from './_components/CashFlowChart';
import { AttentionPanel } from './_components/AttentionPanel';
import { TopCustomersPanel } from './_components/TopCustomersPanel';
import { TopSuppliersPanel } from './_components/TopSuppliersPanel';
import { RecentActivityPanel } from './_components/RecentActivityPanel';
import { CurrencyExposurePanel } from './_components/CurrencyExposurePanel';
import { QuickActionsBar } from './_components/QuickActionsBar';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingWizard';

import type { ActivityItem, CurrencyBreakdown, TopCustomer } from './_lib/dashboard-types';
import type { UnifiedDocType } from '@/features/accounting/components/unified/types';
import { supabase } from '@/lib/supabase';

// Lazy-load the sheet to avoid heavy bundle in initial dashboard render
const UnifiedAccountingSheet = lazy(() =>
  import('@/features/accounting/components/unified/UnifiedAccountingSheet').then(m => ({ default: m.UnifiedAccountingSheet }))
);

// ── icon/color injection for dashboard-kit compatibility ──
import { Wallet, Receipt, CircleDollarSign, Package, Loader2 } from 'lucide-react';
import type { KpiItem } from '@/components/dashboard-kit';

const KPI_ICONS: Record<string, any> = {
  cash: Wallet,
  receivables: Receipt,
  payables: CircleDollarSign,
  inventory: Package,
};

const KPI_COLORS: Record<string, string> = {
  cash: '#0ea5e9',
  receivables: '#8b5cf6',
  payables: '#f59e0b',
  inventory: '#ec4899',
};

// ── Activity type → Sheet docType mapping ──
const ACTIVITY_TO_DOC_TYPE: Record<string, { docType: UnifiedDocType; tradeMode?: 'sales' | 'purchase'; table?: string }> = {
  journal:        { docType: 'journal' },
  sale:           { docType: 'trade_invoice', tradeMode: 'sales', table: 'sales_invoices' },
  purchase:       { docType: 'trade_invoice', tradeMode: 'purchase', table: 'purchase_invoices' },
  payment:        { docType: 'payment', table: 'payment_vouchers' },
  receipt:        { docType: 'receipt', table: 'payment_vouchers' },
  delivery:       { docType: 'trade_delivery', tradeMode: 'sales', table: 'delivery_notes' },
  inventory:      { docType: 'transfer' },
  sales_order:    { docType: 'trade_order', tradeMode: 'sales', table: 'sales_orders' },
  purchase_order: { docType: 'trade_order', tradeMode: 'purchase', table: 'purchase_orders' },
};

// ── Sheet state type ──
interface SheetState {
  isOpen: boolean;
  docType: UnifiedDocType;
  documentId?: string;
  data?: any;
  tradeMode?: 'sales' | 'purchase' | 'transfer';
  defaultTab?: string;
}

const INITIAL_SHEET: SheetState = {
  isOpen: false,
  docType: 'account',
};

export default function DashboardPage() {
  const { settings, baseCurrency, supportedCurrencies } = useAccountingSettings();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مدير النظام';
  
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const saved = localStorage.getItem('texacore_dashboard_currency');
    if (saved) {
      setCurrency(saved);
    } else if (baseCurrency) {
      setCurrency(baseCurrency);
    }
  }, [baseCurrency]);

  const handleCurrencyChange = (c: string) => {
    setCurrency(c);
    localStorage.setItem('texacore_dashboard_currency', c);
  };

  const companyId = settings?.company_id || 'default-company';
  const systemBaseCurrency = baseCurrency || 'UAH';

  // Exchange Rate for currency conversion
  const rateQuery = useExchangeRate(companyId);
  const rateMap = rateQuery.data || {};

  // Convert amount from base currency to display currency
  const convertAmount = useCallback((amount: number, fromCur?: string): number => {
    const from = fromCur || systemBaseCurrency;
    if (from === currency) return amount; // same currency
    const key = `${from}/${currency}`;
    const rate = rateMap[key];
    if (rate) return amount * rate;
    // Try reverse
    const reverseKey = `${currency}/${from}`;
    const reverseRate = rateMap[reverseKey];
    if (reverseRate && reverseRate > 0) return amount / reverseRate;
    // Fallback: no rate found — return as is
    return amount;
  }, [currency, systemBaseCurrency, rateMap]);

  // Get the display rate for showing secondary currency
  const displayRate = useMemo(() => {
    if (currency === systemBaseCurrency) {
      const key = `USD/${systemBaseCurrency}`;
      return rateMap[key] || null;
    }
    const key = `${systemBaseCurrency}/${currency}`;
    return rateMap[key] ? (1 / rateMap[key]) : null;
  }, [currency, systemBaseCurrency, rateMap]);

  // Real Queries — ALWAYS fetch in system base currency (UAH)
  const netQuery = useNetPosition(companyId, systemBaseCurrency);
  const kpiQuery = useKpiSummary(companyId, systemBaseCurrency);
  const flowQuery = useCashFlowSeries(companyId, systemBaseCurrency, 30);
  const attnQuery = useAttentionItems(companyId);
  const custQuery = useTopCustomers(companyId, systemBaseCurrency);
  const suppQuery = useTopSuppliers(companyId, systemBaseCurrency);
  const actQuery = useRecentActivity(companyId);
  const curQuery = useCurrencyExposure(companyId);

  const isFetchingAny =
    netQuery.isFetching ||
    kpiQuery.isFetching ||
    flowQuery.isFetching ||
    attnQuery.isFetching ||
    custQuery.isFetching ||
    suppQuery.isFetching ||
    actQuery.isFetching ||
    curQuery.isFetching;

  // Track real last-sync timestamp from most recent successful fetch
  const lastSyncRef = useRef<Date | null>(null);
  useEffect(() => {
    if (!isFetchingAny) {
      lastSyncRef.current = new Date();
    }
  }, [isFetchingAny]);

  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => {
    if (!isFetchingAny && lastSyncRef.current) {
      setLastSync(new Date());
    }
  }, [isFetchingAny]);

  // Convert Net Position to display currency
  const convertedNet = useMemo(() => {
    if (!netQuery.data) return undefined;
    const d = netQuery.data;
    return {
      ...d,
      valueBase: convertAmount(d.valueBase),
      baseCurrency: currency,
      deltaAbs7d: convertAmount(d.deltaAbs7d),
      todayMovement: convertAmount(d.todayMovement),
      // Keep secondary info for dual display
      _originalValue: d.valueBase,
      _originalCurrency: systemBaseCurrency,
    } as NetPosition & { _originalValue?: number; _originalCurrency?: string };
  }, [netQuery.data, convertAmount, currency, systemBaseCurrency]);

  // Convert & enrich KPI items with real currency conversion
  const enrichedKpis: KpiItem[] | undefined = useMemo(() => {
    if (!kpiQuery.data) return undefined;
    return kpiQuery.data.map((kpi: any) => {
      const rawValue = kpi.value ?? kpi.valueBase ?? 0;
      const isInventoryCount = kpi.id === 'inventory';
      return {
        ...kpi,
        value: isInventoryCount ? rawValue : convertAmount(rawValue),
        _originalValue: rawValue,
        _originalCurrency: systemBaseCurrency,
        currency: isInventoryCount ? '' : currency,
        icon: KPI_ICONS[kpi.id] ?? Wallet,
        color: KPI_COLORS[kpi.id] ?? '#0ea5e9',
        deltaPct: kpi.deltaPct7d ?? kpi.deltaPct ?? 0,
      };
    });
  }, [kpiQuery.data, convertAmount, currency, systemBaseCurrency]);

  // Convert Top Customers to display currency
  const convertedCustomers = useMemo(() => {
    if (!custQuery.data) return undefined;
    return custQuery.data.map((c: any) => ({
      ...c,
      outstanding: convertAmount(c.outstanding, c.currency),
      currency: currency,
    }));
  }, [custQuery.data, convertAmount, currency]);

  // Convert Top Suppliers to display currency
  const convertedSuppliers = useMemo(() => {
    if (!suppQuery.data) return undefined;
    return suppQuery.data.map((s: any) => ({
      ...s,
      outstanding: convertAmount(s.outstanding, s.currency),
      currency: currency,
    }));
  }, [suppQuery.data, convertAmount, currency]);

  // Convert Funds/Banks to display currency
  const convertedFunds = useMemo(() => {
    if (!curQuery.data) return undefined;
    return curQuery.data.map((f: any) => ({
      ...f,
      balance: convertAmount(f.balance, f.currency),
      _originalBalance: f.balance,
      _originalCurrency: f.currency,
      currency: currency,
    }));
  }, [curQuery.data, convertAmount, currency]);

  // Convert Cash Flow to display currency
  const convertedCashFlow = useMemo(() => {
    if (!flowQuery.data) return undefined;
    return flowQuery.data.map((p: any) => ({
      ...p,
      income: convertAmount(p.income),
      expense: convertAmount(p.expense),
    }));
  }, [flowQuery.data, convertAmount]);

  // Convert Recent Activity amounts to display currency
  const convertedActivity = useMemo(() => {
    if (!actQuery.data) return undefined;
    return actQuery.data.map((a: any) => ({
      ...a,
      amount: a.amount != null ? convertAmount(a.amount, a.currency || systemBaseCurrency) : a.amount,
      currency: a.amount != null ? currency : a.currency,
    }));
  }, [actQuery.data, convertAmount, currency, systemBaseCurrency]);

  // ═══ Interactive Sheet State ═══
  const [sheetState, setSheetState] = useState<SheetState>(INITIAL_SHEET);

  const closeSheet = useCallback(() => {
    setSheetState(INITIAL_SHEET);
  }, []);

  // Handler: Click on fund/bank account → fetch full account data then open sheet
  const handleAccountClick = useCallback(async (account: CurrencyBreakdown) => {
    // Fetch full account data — use accountId if available, fallback to account_code
    let fullAcct: any = null;
    if (account.accountId) {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('id', account.accountId)
        .single();
      fullAcct = data;
    }
    if (!fullAcct && account.accountCode) {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('account_code', account.accountCode)
        .eq('company_id', companyId)
        .single();
      fullAcct = data;
    }

    const sheetData = fullAcct
      ? { ...fullAcct, current_balance: account.balance, is_active: true }
      : {
          id: account.accountId,
          account_code: account.accountCode,
          name_ar: account.accountName,
          name: account.accountName,
          currency: account.currency,
          current_balance: account.balance,
          company_id: companyId,
          is_active: true,
        };

    setSheetState({
      isOpen: true,
      docType: 'fund',
      documentId: fullAcct?.id || account.accountId,
      data: sheetData,
      defaultTab: 'ledger',
    });
  }, [companyId]);

  // Handler: Click on activity → fetch full data then open document sheet
  const handleActivityClick = useCallback(async (activity: ActivityItem) => {
    const mapping = ACTIVITY_TO_DOC_TYPE[activity.type];
    if (!mapping) return;

    try {
      if (mapping.docType === 'journal' || mapping.docType === 'payment' || mapping.docType === 'receipt') {
        // Fetch full journal entry with lines BEFORE opening sheet
        // Use direct supabase query (service requires tenantId which may be unavailable)
        const [entryRes, linesRes] = await Promise.all([
          supabase.from('journal_entries').select('*').eq('id', activity.id).single(),
          supabase.from('journal_entry_lines')
            .select('*, account:chart_of_accounts(id, account_code, name_ar, name_en)')
            .eq('entry_id', activity.id)
            .order('line_number', { ascending: true }),
        ]);

        const entry = entryRes.data;
        const lines = (linesRes.data || []).filter((l: any) => l.is_fund_line !== true);

        setSheetState({
          isOpen: true,
          docType: mapping.docType,
          documentId: activity.id,
          tradeMode: mapping.tradeMode,
          data: {
            ...(entry || {}),
            id: activity.id,
            lines,
            entry_number: entry?.entry_number || activity.docNumber,
            description: entry?.description || activity.partyName,
            company_id: entry?.company_id || companyId,
          },
        });
      } else if (mapping.docType === 'trade_invoice' || mapping.docType === 'trade_order') {
        // Fetch full trade document with items BEFORE opening sheet
        const { TradeService } = await import('@/features/trade/services/TradeService');
        const tradeTypeMap: Record<string, Record<string, string>> = {
          sales: { trade_invoice: 'invoice', trade_order: 'order' },
          purchase: { trade_invoice: 'purchase_invoice', trade_order: 'purchase_order' },
        };
        const serviceDocType = tradeTypeMap[mapping.tradeMode || 'sales']?.[mapping.docType] || 'invoice';
        const result = await TradeService.getTradeDocumentWithItems(activity.id, serviceDocType);

        const items = (result.items || []).map((dbItem: any) => ({
          item_id: dbItem.product_id || dbItem.material_id || dbItem.id,
          material_id: dbItem.material_id,
          item_name: dbItem.description || dbItem.material_name_ar || '',
          item_code: dbItem.item_code || dbItem.product_code || '',
          quantity: Number(dbItem.quantity || dbItem.quantity_received) || 0,
          unit_price: Number(dbItem.unit_price) || 0,
          subtotal: Number(dbItem.subtotal) || 0,
          total: Number(dbItem.total) || Number(dbItem.subtotal) || 0,
          unit: dbItem.unit || '',
          discount_pct: Number(dbItem.discount_pct) || 0,
          tax_rate: Number(dbItem.tax_rate) || 0,
          tax_amount: Number(dbItem.tax_amount) || 0,
          currency: dbItem.currency || result.header?.currency || '',
          exchange_rate: Number(dbItem.exchange_rate) || Number(result.header?.exchange_rate) || 1,
        }));

        setSheetState({
          isOpen: true,
          docType: mapping.docType,
          documentId: activity.id,
          tradeMode: mapping.tradeMode,
          data: {
            ...(result.header || {}),
            id: activity.id,
            items,
            type: mapping.tradeMode || 'sales',
            subType: mapping.docType.replace('trade_', ''),
            status: result.header?.status || result.header?.stage || 'draft',
            company_id: result.header?.company_id || companyId,
          },
        });
      } else {
        // Fallback: open with basic data
        setSheetState({
          isOpen: true,
          docType: mapping.docType,
          documentId: activity.id,
          tradeMode: mapping.tradeMode,
          data: {
            id: activity.id,
            entry_number: activity.docNumber,
            description: activity.partyName || activity.title,
            total_amount: activity.amount,
            currency: activity.currency,
            status: activity.status,
            company_id: companyId,
          },
        });
      }
    } catch (err) {
      console.warn('[Dashboard] Failed to fetch activity data:', err);
      // Fallback: open with skeleton
      setSheetState({
        isOpen: true,
        docType: mapping.docType,
        documentId: activity.id,
        tradeMode: mapping.tradeMode,
        data: {
          id: activity.id,
          entry_number: activity.docNumber,
          description: activity.partyName || activity.title,
          total_amount: activity.amount,
          currency: activity.currency,
          status: activity.status,
          company_id: companyId,
        },
      });
    }
  }, [companyId]);

  // Handler: Click on customer → fetch full customer data then open party sheet
  const handleCustomerClick = useCallback(async (customer: TopCustomer) => {
    // Open immediately with skeleton
    setSheetState({
      isOpen: true,
      docType: 'party',
      documentId: customer.id,
      data: { id: customer.id, name: customer.name, name_ar: customer.name, type: 'customer', _partyType: 'customer', company_id: companyId },
    });

    // Fetch full customer data (critically: receivable_account_id for ledger)
    const { data: fullCustomer } = await supabase
      .from('customers')
      .select('*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)')
      .eq('id', customer.id)
      .single();
    if (fullCustomer) {
      setSheetState(prev => ({
        ...prev,
        data: { ...fullCustomer, type: 'customer', _partyType: 'customer', is_active: fullCustomer.status === 'active' },
      }));
    }
  }, [companyId]);

  // Handler: Click on supplier → fetch full supplier data then open party sheet
  const handleSupplierClick = useCallback(async (supplier: TopCustomer) => {
    // Open immediately with skeleton
    setSheetState({
      isOpen: true,
      docType: 'party',
      documentId: supplier.id,
      data: { id: supplier.id, name: supplier.name, name_ar: supplier.name, type: 'supplier', _partyType: 'supplier', company_id: companyId },
    });

    // Fetch full supplier data (critically: payable_account_id for ledger)
    const { data: fullSupplier } = await supabase
      .from('suppliers')
      .select('*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)')
      .eq('id', supplier.id)
      .single();
    if (fullSupplier) {
      setSheetState(prev => ({
        ...prev,
        data: { ...fullSupplier, type: 'supplier', _partyType: 'supplier', is_active: fullSupplier.status === 'active' },
      }));
    }
  }, [companyId]);

  return (
    <div className="space-y-6 font-sans" dir="rtl">
      <DashboardHeader
        userName={userName}
        currency={currency}
        supportedCurrencies={supportedCurrencies}
        onCurrencyChange={handleCurrencyChange}
        isFetching={isFetchingAny}
      />

      <main className="mt-6 flex flex-col gap-6">
        {/* ═══ Section 1: Financial Overview ═══ */}
        <NetPositionHero
          data={convertedNet}
          loading={netQuery.isLoading}
          lastSync={lastSync}
          isFetching={isFetchingAny}
        />

        <KpiGrid kpis={enrichedKpis} loading={kpiQuery.isLoading} />

        {/* ═══ Quick Actions — Always visible ═══ */}
        <QuickActionsBar />

        {/* ═══ Section 2: Daily Operations — Activity + Funds (equal halves) ═══ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentActivityPanel
            items={actQuery.data}
            loading={actQuery.isLoading}
            onActivityClick={handleActivityClick}
          />
          <CurrencyExposurePanel
            items={convertedFunds}
            loading={curQuery.isLoading}
            onAccountClick={handleAccountClick}
          />
        </div>

        {/* ═══ Section 3: Analytics + Attention ═══ */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CashFlowChart data={convertedCashFlow} loading={flowQuery.isLoading} />
          </div>
          <AttentionPanel items={attnQuery.data} loading={attnQuery.isLoading} />
        </div>

        {/* ═══ Section 4: Top Partners + Onboarding ═══ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TopCustomersPanel
            items={convertedCustomers}
            loading={custQuery.isLoading}
            onCustomerClick={handleCustomerClick}
          />
          <TopSuppliersPanel
            items={convertedSuppliers}
            loading={suppQuery.isLoading}
            onSupplierClick={handleSupplierClick}
          />
          <OnboardingChecklist />
        </div>
      </main>

      {/* ═══ Interactive Sheet — Opens on click from any dashboard panel ═══ */}
      {sheetState.isOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        }>
          <UnifiedAccountingSheet
            isOpen={sheetState.isOpen}
            onClose={closeSheet}
            docType={sheetState.docType}
            documentId={sheetState.documentId}
            data={sheetState.data}
            tradeMode={sheetState.tradeMode}
            mode="view"
            companyId={companyId}
            enableEditFlow
            defaultTab={sheetState.defaultTab}
          />
        </Suspense>
      )}
    </div>
  );
}

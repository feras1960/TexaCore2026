'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useKpiSummary, useNetPosition, useCashFlowSeries, useAttentionItems, useTopCustomers, useRecentActivity, useCurrencyExposure } from './_hooks/useDashboardData';

import { DashboardHeader } from './_components/DashboardHeader';
import { NetPositionHero } from './_components/NetPositionHero';
import { KpiGrid } from './_components/KpiGrid';
import { CashFlowChart } from './_components/CashFlowChart';
import { AttentionPanel } from './_components/AttentionPanel';
import { TopCustomersPanel } from './_components/TopCustomersPanel';
import { RecentActivityPanel } from './_components/RecentActivityPanel';
import { CurrencyExposurePanel } from './_components/CurrencyExposurePanel';
import { QuickActionsBar } from './_components/QuickActionsBar';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingWizard';

// ── icon/color injection for dashboard-kit compatibility ──
import { Wallet, Receipt, CircleDollarSign, Package } from 'lucide-react';
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

  // Real Queries (Cached locally & connected to Supabase)
  const netQuery = useNetPosition(companyId, currency);
  const kpiQuery = useKpiSummary(companyId, currency);
  const flowQuery = useCashFlowSeries(companyId, currency, 30);
  const attnQuery = useAttentionItems(companyId);
  const custQuery = useTopCustomers(companyId, currency);
  const actQuery = useRecentActivity(companyId);
  const curQuery = useCurrencyExposure(companyId);

  const isFetchingAny =
    netQuery.isFetching ||
    kpiQuery.isFetching ||
    flowQuery.isFetching ||
    attnQuery.isFetching ||
    custQuery.isFetching ||
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

  // Inject icon & color into KPI items so dashboard-kit KpiCard renders correctly
  const enrichedKpis: KpiItem[] | undefined = useMemo(() => {
    if (!kpiQuery.data) return undefined;
    return kpiQuery.data.map((kpi: any) => ({
      ...kpi,
      icon: KPI_ICONS[kpi.id] ?? Wallet,
      color: KPI_COLORS[kpi.id] ?? '#0ea5e9',
      deltaPct: kpi.deltaPct7d,
    }));
  }, [kpiQuery.data]);

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
        <NetPositionHero
          data={netQuery.data}
          loading={netQuery.isLoading}
          lastSync={lastSync}
          isFetching={isFetchingAny}
        />

        <KpiGrid kpis={enrichedKpis} loading={kpiQuery.isLoading} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Main Content (Chart + Actions) takes up full width on mobile/tablet, 2/3 on desktop */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <CashFlowChart data={flowQuery.data} loading={flowQuery.isLoading} />
            <QuickActionsBar />
          </div>
          
          {/* The smaller panels will flow naturally into the remaining grid slots */}
          <OnboardingChecklist />
          <AttentionPanel items={attnQuery.data} loading={attnQuery.isLoading} />
          <TopCustomersPanel items={custQuery.data} loading={custQuery.isLoading} />
          <RecentActivityPanel items={actQuery.data} loading={actQuery.isLoading} />
          <CurrencyExposurePanel items={curQuery.data} loading={curQuery.isLoading} />
        </div>
      </main>
    </div>
  );
}

import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { dashboardKeys } from '../_lib/dashboard-cache-keys';
import type { KpiItem, CashFlowPoint, TopCustomer, ActivityItem, NetPosition, AttentionItem, CurrencyBreakdown } from '../_lib/dashboard-types';

const GC_TIME = 24 * 60 * 60 * 1000; // 24 hours
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

// 1. KPI Summary
export function useKpiSummary(companyId: string, currency: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.kpi(companyId, currency),
    queryFn: async (): Promise<KpiItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 2. Net Position
export function useNetPosition(companyId: string, currency: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.netPosition(companyId, currency),
    queryFn: async (): Promise<NetPosition> => {
      const { data, error } = await supabase.rpc('get_dashboard_net_position', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return data as any;
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 3. Cash Flow Series
export function useCashFlowSeries(companyId: string, currency: string, days: number = 30) {
  return useCachedQuery({
    queryKey: dashboardKeys.cashFlow(companyId, currency, days),
    queryFn: async (): Promise<CashFlowPoint[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_cash_flow', { p_company_id: companyId, p_base_currency: currency, p_days: days });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 4. Attention Items
export function useAttentionItems(companyId: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.attention(companyId),
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_attention_items', { p_company_id: companyId });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 5. Top Customers
export function useTopCustomers(companyId: string, currency: string = 'USD') {
  return useCachedQuery({
    queryKey: dashboardKeys.topCustomers(companyId),
    queryFn: async (): Promise<TopCustomer[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_top_customers', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 6. Recent Activity
export function useRecentActivity(companyId: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.recentActivity(companyId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_recent_activity', { p_company_id: companyId });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 7. Currency Exposure
export function useCurrencyExposure(companyId: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.currencyExposure(companyId),
    queryFn: async (): Promise<CurrencyBreakdown[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_currency_exposure', { p_company_id: companyId });
      if (error) throw error;
      // RPC returns [{currency, valueBase, pct, ...}] — map to CurrencyBreakdown format
      const raw = (data as any) || [];
      return (Array.isArray(raw) ? raw : [raw]).map((item: any) => ({
        accountCode: item.account_code || item.accountCode || item.currency || '',
        accountName: item.account_name || item.accountName || item.currency || '',
        currency: item.currency || 'UAH',
        balance: item.valueBase ?? item.value_base ?? item.balance ?? 0,
      }));
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { dashboardKeys } from '../_lib/dashboard-cache-keys';
import type { KpiItem, CashFlowPoint, TopCustomer, ActivityItem, NetPosition, AttentionItem, CurrencyBreakdown } from '../_lib/dashboard-types';
import { MOCK_KPIS, MOCK_NET_POSITION, MOCK_CASH_FLOW, MOCK_TOP_CUSTOMERS, MOCK_ACTIVITY, MOCK_ATTENTION, MOCK_CURRENCIES } from '../_lib/mock-data';

// 1. KPI Summary
export function useKpiSummary(companyId: string, currency: string) {
  return useQuery({
    queryKey: dashboardKeys.kpi(companyId, currency),
    queryFn: async (): Promise<KpiItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: 60_000, // 1 min cache
  });
}

// 2. Net Position
export function useNetPosition(companyId: string, currency: string) {
  return useQuery({
    queryKey: dashboardKeys.netPosition(companyId, currency),
    queryFn: async (): Promise<NetPosition> => {
      const { data, error } = await supabase.rpc('get_dashboard_net_position', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return data as any;
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

// 3. Cash Flow Series
export function useCashFlowSeries(companyId: string, currency: string, days: number = 30) {
  return useQuery({
    queryKey: dashboardKeys.cashFlow(companyId, currency, days),
    queryFn: async (): Promise<CashFlowPoint[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_cash_flow', { p_company_id: companyId, p_base_currency: currency, p_days: days });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

// 4. Attention Items
export function useAttentionItems(companyId: string) {
  return useQuery({
    queryKey: dashboardKeys.attention(companyId),
    queryFn: async (): Promise<AttentionItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_attention_items', { p_company_id: companyId });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

// 5. Top Customers
export function useTopCustomers(companyId: string, currency: string = 'USD') {
  return useQuery({
    queryKey: dashboardKeys.topCustomers(companyId),
    queryFn: async (): Promise<TopCustomer[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_top_customers', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

// 6. Recent Activity
export function useRecentActivity(companyId: string) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(companyId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_recent_activity', { p_company_id: companyId });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

// 7. Currency Exposure
export function useCurrencyExposure(companyId: string) {
  return useQuery({
    queryKey: dashboardKeys.currencyExposure(companyId),
    queryFn: async (): Promise<CurrencyBreakdown[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_currency_exposure', { p_company_id: companyId });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
  });
}

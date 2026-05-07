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

// 5b. Top Suppliers
export function useTopSuppliers(companyId: string, currency: string = 'USD') {
  return useCachedQuery({
    queryKey: dashboardKeys.topSuppliers(companyId),
    queryFn: async (): Promise<TopCustomer[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_top_suppliers', { p_company_id: companyId, p_base_currency: currency });
      if (error) throw error;
      return ((data as any) || []).slice(0, 10);
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
      const raw = (data as any) || [];
      return raw.slice(0, 15).map((item: any) => ({
        id: item.id,
        type: item.type || 'journal',
        typeLabel: item.typeLabel || item.type_label || 'نشاط',
        docNumber: item.docNumber || item.doc_number || '',
        partyName: item.partyName || item.party_name || '',
        amount: item.amount ?? undefined,
        currency: item.currency ?? undefined,
        status: item.status ?? undefined,
        actorName: item.actorName || item.actor_name || 'النظام',
        timestamp: item.timestamp || new Date().toISOString(),
        title: item.title,
      }));
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// 7. Currency Exposure (أرصدة الصناديق والبنوك)
export function useCurrencyExposure(companyId: string) {
  return useCachedQuery({
    queryKey: dashboardKeys.currencyExposure(companyId),
    queryFn: async (): Promise<CurrencyBreakdown[]> => {
      const { data, error } = await supabase.rpc('get_dashboard_currency_exposure', { p_company_id: companyId });
      if (error) throw error;
      // RPC returns [{accountCode, accountName, currency, balance}]
      const raw = (data as any) || [];
      return (Array.isArray(raw) ? raw : [raw]).map((item: any) => ({
        accountId: item.accountId || item.account_id || '',
        accountCode: item.accountCode || item.account_code || '',
        accountName: item.accountName || item.account_name || '',
        currency: item.currency || 'UAH',
        balance: item.balance ?? item.valueBase ?? item.value_base ?? 0,
      }));
    },
    enabled: Boolean(companyId && companyId !== 'default-company'),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

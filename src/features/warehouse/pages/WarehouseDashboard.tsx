/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 WarehouseDashboard v2 — Unified Dashboard Kit Design
 * ════════════════════════════════════════════════════════════════
 *
 * Matches: Executive Dashboard + Accounting Dashboard
 * Pattern: Hero → KPIs → SectionCards → ListPanels
 * Data:    useWarehouseDashboard() — fully cached + realtime
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useWarehouseDashboard } from '../hooks/useWarehouseQueries';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import {
  DashboardHero,
  KpiGrid,
  SectionCard,
  ListPanel,
  EmptyState,
  type KpiItem,
  type ListItem,
  type HeroConfig,
} from '@/components/dashboard-kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Warehouse, Package, Boxes, AlertTriangle,
  Calendar, Truck, Activity, ArrowRightLeft, Clock,
} from 'lucide-react';

export default function WarehouseDashboard() {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useAuth();

  // ─── Warehouse filter ──────────────────────────────────
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  const { data: warehouses = [] } = useCachedQuery({
    queryKey: ['warehouse', 'list', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('warehouses')
        .select('id, name_ar, name_en')
        .eq('company_id', companyId!)
        .eq('is_active', true)
        .order('name_ar');
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const warehouseId = selectedWarehouse === 'all' ? undefined : selectedWarehouse;

  const {
    stats, lowStockItems, warehouseCapacity, recentActivity,
    loading, error, refetch: refetchDashboard,
  } = useWarehouseDashboard(warehouseId);

  // ─── Last sync tracking ───────────────────────────────
  const [lastSync, setLastSync] = useState<Date | null>(null);
  useEffect(() => {
    if (!loading && stats) setLastSync(new Date());
  }, [stats, loading]);

  const selectedWarehouseName = selectedWarehouse === 'all'
    ? (isAr ? 'كل المستودعات' : 'All Warehouses')
    : (warehouses.find((w: any) => w.id === selectedWarehouse)?.[isAr ? 'name_ar' : 'name_en'] || '');

  // ─── Hero Config ──────────────────────────────────────
  const heroConfig: HeroConfig | undefined = stats ? {
    label: isAr ? 'إجمالي المواد' : 'Total Materials',
    value: stats.totalMaterials,
    valueSuffix: isAr ? 'مادة' : 'materials',
    badges: [
      { label: `${stats.totalRolls} ${isAr ? 'رولة في المخزون' : 'rolls in stock'}`, tone: 'info' as const },
      { label: `${stats.totalWarehouses} ${isAr ? 'مستودع' : 'warehouses'}`, tone: 'success' as const },
      ...(stats.lowStockItems > 0 ? [{ label: `${stats.lowStockItems} ${isAr ? 'منخفض' : 'low'}`, tone: 'warning' as const }] : []),
    ],
    secondaryLabel: isAr ? 'الحركات الأخيرة' : 'Recent Movements',
    secondaryValue: recentActivity.length,
    secondarySubLabel: isAr ? 'آخر 5 حركات' : 'Last 5 movements',
    lastSync,
    isFetching: loading,
    actions: (
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">{isAr ? 'المستودع' : 'Warehouse'}</label>
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-full bg-white/10 backdrop-blur-sm h-9 text-xs border-stone-700 text-white hover:bg-white/15 transition-colors">
            <Warehouse className="w-3.5 h-3.5 me-1.5 text-teal-400" />
            <SelectValue placeholder={isAr ? 'كل المستودعات' : 'All Warehouses'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🏭 {isAr ? 'كل المستودعات' : 'All Warehouses'}</SelectItem>
            {warehouses.map((w: any) => (
              <SelectItem key={w.id} value={w.id}>
                📦 {isAr ? w.name_ar : w.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
  } : undefined;

  // ─── KPI Items ────────────────────────────────────────
  const kpis: KpiItem[] | undefined = stats ? [
    {
      id: 'materials', label: isAr ? 'إجمالي المواد' : 'Total Materials',
      value: stats.totalMaterials, icon: Package, color: '#6366f1',
    },
    {
      id: 'rolls', label: isAr ? 'إجمالي الرولات' : 'Total Rolls',
      value: stats.totalRolls, icon: Boxes, color: '#8b5cf6',
    },
    {
      id: 'warehouses', label: isAr ? 'المستودعات' : 'Warehouses',
      value: stats.totalWarehouses, icon: Warehouse, color: '#14b8a6',
    },
    {
      id: 'low-stock', label: isAr ? 'مخزون منخفض' : 'Low Stock',
      value: stats.lowStockItems, icon: AlertTriangle, color: '#f43f5e',
      secondaryLabel: stats.lowStockItems > 0
        ? (isAr ? '⚠ يحتاج انتباه' : '⚠ Needs attention')
        : (isAr ? '✓ المخزون جيد' : '✓ Stock OK'),
      secondaryTone: stats.lowStockItems > 0 ? 'danger' : 'success',
    },
    {
      id: 'reservations', label: isAr ? 'حجوزات نشطة' : 'Active Reservations',
      value: stats.activeReservations, icon: Calendar, color: '#f59e0b',
    },
    {
      id: 'deliveries', label: isAr ? 'إسلامات معلقة' : 'Pending Deliveries',
      value: stats.pendingDeliveries, icon: Truck, color: '#0ea5e9',
    },
    {
      id: 'transfers', label: isAr ? 'تحويلات' : 'Transfers',
      value: 0, icon: ArrowRightLeft, color: '#ea580c',
    },
    {
      id: 'activity', label: isAr ? 'حركات أخيرة' : 'Recent Activity',
      value: recentActivity.length, icon: Activity, color: '#64748b',
    },
  ] : undefined;

  // ─── Low Stock → ListItem[] ───────────────────────────
  const lowStockListItems: ListItem[] = lowStockItems.map((item: any, i: number) => ({
    id: item.id,
    rank: i + 1,
    title: item.material?.name_ar || item.roll_number || '-',
    subtitle: item.roll_number,
    value: `${item.current_length}m`,
    valueSub: item.warehouse?.name_ar,
    icon: Package,
    iconClassName: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    tags: item.current_length < 5 ? [{
      label: isAr ? 'حرج' : 'Critical',
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
    }] : [{
      label: isAr ? 'منخفض' : 'Low',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    }],
  }));

  // ─── Recent Activity → ListItem[] ────────────────────
  const activityListItems: ListItem[] = recentActivity.map((act: any) => ({
    id: act.id,
    title: `${act.movement_type} - ${act.roll?.roll_number || '-'}`,
    subtitle: act.warehouse?.name_ar,
    value: new Date(act.movement_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US'),
    icon: ArrowRightLeft,
    iconClassName: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
  }));

  // ─── Error State ──────────────────────────────────────
  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title={isAr ? 'حدث خطأ' : 'Error occurred'}
          description={error}
          action={{ label: isAr ? 'إعادة المحاولة' : 'Retry', onClick: refetchDashboard }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Hero ──────────────────────────────────────── */}
      <DashboardHero config={heroConfig} loading={loading && !stats} />

      {/* ── KPI Grid (4 cols × 2 rows) ───────────────── */}
      <KpiGrid kpis={kpis} loading={loading && !stats} cols={4} />

      {/* ── Content Grid: 3 columns ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Low Stock Alerts */}
        <SectionCard
          title={isAr ? 'تنبيهات المخزون' : 'Low Stock Alerts'}
          icon={AlertTriangle}
          badge={lowStockItems.length > 0 ? String(lowStockItems.length) : undefined}
          badgeTone={lowStockItems.length > 0 ? 'danger' : 'success'}
          noPadding
        >
          <ListPanel
            items={lowStockListItems}
            loading={loading}
            emptyTitle={isAr ? 'لا تنبيهات' : 'No alerts'}
            emptyDescription={isAr ? 'جميع المواد فوق الحد الأدنى' : 'All materials above minimum'}
            showRank
          />
        </SectionCard>

        {/* Warehouse Capacity */}
        <SectionCard
          title={isAr ? 'سعة المستودعات' : 'Warehouse Capacity'}
          icon={Warehouse}
        >
          {warehouseCapacity.length === 0 ? (
            <EmptyState
              icon={Warehouse}
              title={isAr ? 'لا مستودعات' : 'No warehouses'}
              description={isAr ? 'أضف مستودعاً لرؤية السعة' : 'Add a warehouse to see capacity'}
            />
          ) : (
            <div className="space-y-4">
              {warehouseCapacity.map((wh: any) => {
                const pct = Number(wh.percentage || 0);
                const barColor = pct > 80 ? '[&>div]:bg-rose-500' : pct > 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';
                return (
                  <div key={wh.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600 dark:text-stone-400">{wh.name}</span>
                      <span className="font-mono text-xs tabular-nums text-stone-500">{pct}%</span>
                    </div>
                    <Progress value={pct} className={`h-2 ${barColor}`} />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title={isAr ? 'النشاط الأخير' : 'Recent Activity'}
          icon={Activity}
          badge={recentActivity.length > 0 ? String(recentActivity.length) : undefined}
          noPadding
        >
          <ListPanel
            items={activityListItems}
            loading={loading}
            emptyTitle={isAr ? 'لا حركات' : 'No activity'}
            emptyDescription={isAr ? 'ستظهر الحركات هنا بعد أول عملية' : 'Activity will appear after first operation'}
            showRank={false}
          />
        </SectionCard>
      </div>
    </div>
  );
}

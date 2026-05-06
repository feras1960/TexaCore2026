/**
 * 🔑 Licensing Management Tab — SaaS Admin
 * Real-time table with tier filtering, online status, and detail sheet
 */
import { useState, useMemo, useEffect } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Key, Users, Shield, Activity, Plus, Search, Filter,
  CheckCircle2, XCircle, Clock, AlertTriangle, Monitor,
  Globe, Wifi, Database,
} from 'lucide-react';
import { licensingService, License, LicensingStats } from '@/services/saas/licensingService';
import { LicenseDetailSheet } from './components/licensing/LicenseDetailSheet';
import { CreateLicenseDialog } from './components/licensing/CreateLicenseDialog';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  basic: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pro: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: { ar: string; en: string } }> = {
  active: { icon: CheckCircle2, color: 'text-green-600', label: { ar: 'نشط', en: 'Active' } },
  pending: { icon: Clock, color: 'text-yellow-600', label: { ar: 'معلّق', en: 'Pending' } },
  expired: { icon: XCircle, color: 'text-red-600', label: { ar: 'منتهي', en: 'Expired' } },
  suspended: { icon: AlertTriangle, color: 'text-orange-600', label: { ar: 'موقوف', en: 'Suspended' } },
  revoked: { icon: XCircle, color: 'text-red-800', label: { ar: 'ملغي', en: 'Revoked' } },
};

export default function LicensingTab() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isAr = language === 'ar';

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // ─── Realtime Subscription ──────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('licensing-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'licensing',
        table: 'licenses',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['licensing'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'licensing',
        table: 'license_heartbeats',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['licensing', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['licensing', 'licenses'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Data ────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useCachedQuery({
    queryKey: ['licensing', 'stats'],
    queryFn: () => licensingService.getStats(),
    staleTime: 30_000,
  });

  const { data: licensesRaw, isLoading: licensesLoading } = useCachedQuery({
    queryKey: ['licensing', 'licenses'],
    queryFn: () => licensingService.getLicenses(),
    staleTime: 15_000,
  });

  const stats: LicensingStats | null = statsData ?? null;
  const licenses: License[] = licensesRaw ?? [];

  // ─── Filtered Data ───────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...licenses];
    if (tierFilter !== 'all') result = result.filter(l => l.tier === tierFilter);
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.license_key?.toLowerCase().includes(q) ||
        (l as any).customer_name?.toLowerCase().includes(q) ||
        (l as any).customer_email?.toLowerCase().includes(q) ||
        l.hostname?.toLowerCase().includes(q) ||
        l.subdomain?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [licenses, tierFilter, statusFilter, search]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['licensing'] });
    toast.success(isAr ? 'تم التحديث' : 'Refreshed');
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatDateTime = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    const date = dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  const timeSince = (d: string | null) => {
    if (!d) return null;
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return isAr ? 'الآن' : 'now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAr ? '🔑 إدارة التراخيص' : '🔑 License Management'}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? 'إدارة تراخيص النسخة المحلية — مزامنة مباشرة' : 'Manage Self-Hosted licenses — Live sync'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            {isAr ? '🔄 تحديث' : '🔄 Refresh'}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAr ? 'ترخيص جديد' : 'New License'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[
            { label: isAr ? 'إجمالي' : 'Total', value: stats.totalLicenses, icon: Key, color: 'text-blue-500' },
            { label: isAr ? 'نشطة' : 'Active', value: stats.activeLicenses, icon: CheckCircle2, color: 'text-green-500' },
            { label: isAr ? 'منتهية' : 'Expired', value: stats.expiredLicenses, icon: XCircle, color: 'text-red-500' },
            { label: isAr ? 'تجريبية' : 'Trial', value: stats.trialLicenses, icon: Clock, color: 'text-yellow-500' },
            { label: isAr ? '🟢 متصل الآن' : '🟢 Online', value: stats.onlineNow, icon: Wifi, color: 'text-emerald-500' },
            { label: isAr ? 'نبضات 48h' : 'Heartbeats 48h', value: stats.activeHeartbeats, icon: Activity, color: 'text-purple-500' },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAr ? 'بحث بالمفتاح أو الاسم أو الدومين...' : 'Search key, name, domain...'}
                value={search} onChange={e => setSearch(e.target.value)} className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              <Filter className="h-4 w-4 text-muted-foreground self-center" />
              {['all', 'trial', 'basic', 'starter', 'pro', 'enterprise'].map(tier => (
                <Button key={tier} size="sm" variant={tierFilter === tier ? 'default' : 'outline'}
                  onClick={() => setTierFilter(tier)}>
                  {tier === 'all' ? (isAr ? 'الكل' : 'All') : tier.toUpperCase()}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'pending', 'expired', 'suspended'].map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter(s)} className="text-xs">
                  {s === 'all' ? (isAr ? 'الكل' : 'All') : (STATUS_CONFIG[s]?.label[isAr ? 'ar' : 'en'] || s)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {licensesLoading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">{isAr ? 'لا توجد تراخيص' : 'No licenses found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-start p-3 font-medium w-8"></th>
                    <th className="text-start p-3 font-medium">{isAr ? 'المفتاح' : 'Key'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الباقة' : 'Tier'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الدومين' : 'Domain'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الجهاز' : 'Device'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'آخر اتصال' : 'Last Seen'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'بداية الترخيص' : 'Start'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'تاريخ الانتهاء' : 'Expires'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((license, idx) => {
                    const statusConf = STATUS_CONFIG[license.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConf.icon;
                    const expired = isExpired(license.expires_at);
                    const online = licensingService.isOnline(license.last_heartbeat_at);
                    return (
                      <motion.tr key={license.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedLicense(license)}>
                        {/* Online dot */}
                        <td className="p-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : license.last_heartbeat_at ? 'bg-gray-300' : 'bg-gray-200'}`} />
                        </td>
                        <td className="p-3 font-mono text-xs">{license.license_key}</td>
                        <td className="p-3">
                          <div className="font-medium">{(license as any).customer_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{license.hostname || ''}</div>
                        </td>
                        <td className="p-3">
                          <Badge className={TIER_COLORS[license.tier] || ''}>{license.tier.toUpperCase()}</Badge>
                        </td>
                        <td className="p-3">
                          {license.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {isAr ? 'موقوف' : 'Suspended'}
                            </span>
                          ) : license.status === 'revoked' ? (
                            <span className="inline-flex items-center gap-1 text-red-800">
                              <XCircle className="h-3.5 w-3.5" />
                              {isAr ? 'ملغي' : 'Revoked'}
                            </span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              {isAr ? 'منتهي' : 'Expired'}
                            </span>
                          ) : online ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Wifi className="h-3.5 w-3.5" />
                              {isAr ? 'متصل' : 'Online'}
                            </span>
                          ) : license.last_heartbeat_at ? (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <Monitor className="h-3.5 w-3.5" />
                              {isAr ? 'غير متصل' : 'Offline'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-600">
                              <Clock className="h-3.5 w-3.5" />
                              {isAr ? 'لم يتصل بعد' : 'Never connected'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {license.subdomain ? (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {license.subdomain}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3">
                          {license.hardware_id ? (
                            <span className="text-xs text-green-600">✓ {isAr ? 'مربوط' : 'Bound'}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-xs">
                          {license.last_heartbeat_at ? (
                            <span className={online ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              {timeSince(license.last_heartbeat_at)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {formatDateTime(license.activated_at || license.created_at)}
                        </td>
                        <td className={`p-3 text-xs ${expired ? 'text-red-600 font-medium' : ''}`}>
                          {formatDateTime(license.expires_at)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <LicenseDetailSheet
        license={selectedLicense} open={!!selectedLicense}
        onClose={() => setSelectedLicense(null)} onRefresh={handleRefresh}
      />
      <CreateLicenseDialog
        open={createDialogOpen} onOpenChange={setCreateDialogOpen}
        onSuccess={() => { handleRefresh(); setCreateDialogOpen(false); }}
      />
    </div>
  );
}

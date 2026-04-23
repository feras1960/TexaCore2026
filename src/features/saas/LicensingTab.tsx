/**
 * 🔑 Licensing Management Tab — SaaS Admin
 * Table-based view with tier filtering + detail sheet
 */
import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { licensingService, License, LicensingStats } from '@/services/saas/licensingService';
import { LicenseDetailSheet } from './components/licensing/LicenseDetailSheet';
import { CreateLicenseDialog } from './components/licensing/CreateLicenseDialog';
import { motion } from 'framer-motion';

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

  // ─── Data ────────────────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useCachedQuery({
    queryKey: ['licensing', 'stats'],
    queryFn: () => licensingService.getStats(),
    staleTime: 60_000,
  });

  const { data: licensesRaw, isLoading: licensesLoading } = useCachedQuery({
    queryKey: ['licensing', 'licenses'],
    queryFn: () => licensingService.getLicenses(),
    staleTime: 30_000,
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
        (l as any).customer_email?.toLowerCase().includes(q)
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
    return new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAr ? '🔑 إدارة التراخيص' : '🔑 License Management'}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? 'إدارة تراخيص النسخة المحلية Self-Hosted' : 'Manage Self-Hosted licenses'}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { label: isAr ? 'إجمالي التراخيص' : 'Total Licenses', value: stats.totalLicenses, icon: Key, color: 'text-blue-500' },
            { label: isAr ? 'نشطة' : 'Active', value: stats.activeLicenses, icon: CheckCircle2, color: 'text-green-500' },
            { label: isAr ? 'منتهية' : 'Expired', value: stats.expiredLicenses, icon: XCircle, color: 'text-red-500' },
            { label: isAr ? 'تجريبية' : 'Trial', value: stats.trialLicenses, icon: Clock, color: 'text-yellow-500' },
            { label: isAr ? 'أجهزة متصلة' : 'Online Devices', value: stats.activeHeartbeats, icon: Monitor, color: 'text-purple-500' },
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
                placeholder={isAr ? 'بحث بالمفتاح أو الاسم...' : 'Search key or name...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              <Filter className="h-4 w-4 text-muted-foreground self-center" />
              {['all', 'trial', 'basic', 'starter', 'pro', 'enterprise'].map(tier => (
                <Button
                  key={tier}
                  size="sm"
                  variant={tierFilter === tier ? 'default' : 'outline'}
                  onClick={() => setTierFilter(tier)}
                >
                  {tier === 'all' ? (isAr ? 'الكل' : 'All') : tier.toUpperCase()}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'pending', 'expired', 'suspended'].map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'ghost'}
                  onClick={() => setStatusFilter(s)}
                  className="text-xs"
                >
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
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">{isAr ? 'لا توجد تراخيص' : 'No licenses found'}</p>
              <p className="text-sm">{isAr ? 'أنشئ ترخيصاً جديداً للبدء' : 'Create a new license to get started'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-start p-3 font-medium">{isAr ? 'المفتاح' : 'License Key'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الباقة' : 'Tier'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'المستخدمين' : 'Users'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الجهاز' : 'Device'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'ينتهي' : 'Expires'}</th>
                    <th className="text-start p-3 font-medium">{isAr ? 'الإنشاء' : 'Created'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((license, idx) => {
                    const statusConf = STATUS_CONFIG[license.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConf.icon;
                    const expired = isExpired(license.expires_at);
                    return (
                      <motion.tr
                        key={license.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedLicense(license)}
                      >
                        <td className="p-3 font-mono text-xs">{license.license_key}</td>
                        <td className="p-3">
                          <div className="font-medium">{(license as any).customer_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{(license as any).customer_email || ''}</div>
                        </td>
                        <td className="p-3">
                          <Badge className={TIER_COLORS[license.tier] || ''}>{license.tier.toUpperCase()}</Badge>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 ${statusConf.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConf.label[isAr ? 'ar' : 'en']}
                          </span>
                        </td>
                        <td className="p-3">{license.max_users}</td>
                        <td className="p-3">
                          {license.hardware_id ? (
                            <span className="text-xs text-green-600">✓ {isAr ? 'مربوط' : 'Bound'}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className={`p-3 text-xs ${expired ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(license.expires_at)}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(license.created_at)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <LicenseDetailSheet
        license={selectedLicense}
        open={!!selectedLicense}
        onClose={() => setSelectedLicense(null)}
        onRefresh={handleRefresh}
      />

      {/* Create Dialog */}
      <CreateLicenseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          handleRefresh();
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}

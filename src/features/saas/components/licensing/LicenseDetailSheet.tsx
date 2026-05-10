/**
 * 🔑 License Detail Sheet — Full monitoring dashboard per license
 * Shows: info, subscription/domain, device, heartbeats, backups, actions
 */
import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Key, Monitor, Activity, History, Shield, Copy, Ban, Mail,
  RefreshCw, CheckCircle2, XCircle, Clock, MapPin,
  Cpu, HardDrive, Wifi, ArrowUpCircle, CalendarPlus,
  Globe, Server, Download, Database, BarChart3,
} from 'lucide-react';
import { License, licensingService, TIER_DEFAULTS, CloudBackup } from '@/services/saas/licensingService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const TIER_LABELS: Record<string, { ar: string; en: string }> = {
  trial: { ar: 'تجريبي', en: 'Trial' },
  basic: { ar: 'أساسي', en: 'Basic' },
  free: { ar: 'مجاني', en: 'Free' },
  starter: { ar: 'أساسي', en: 'Starter' },
  pro: { ar: 'احترافي', en: 'Pro' },
  enterprise: { ar: 'مؤسسي', en: 'Enterprise' },
};

const MODULE_LABELS: Record<string, { ar: string; en: string }> = {
  sales: { ar: 'المبيعات', en: 'Sales' },
  purchases: { ar: 'المشتريات', en: 'Purchases' },
  warehouse: { ar: 'المخزون', en: 'Warehouse' },
  accounting: { ar: 'المحاسبة', en: 'Accounting' },
  ecommerce: { ar: 'التجارة الإلكترونية', en: 'E-Commerce' },
  reports: { ar: 'التقارير', en: 'Reports' },
  ai: { ar: 'ذكاء اصطناعي', en: 'AI' },
  api: { ar: 'API', en: 'API' },
};

// Helper: Format OS info to human readable
function formatOsInfo(osInfo: string): string {
  if (!osInfo) return '—';
  const parts = osInfo.toLowerCase().split(' ');
  const platform = parts[0];
  const version = parts[1] || '';
  const arch = parts[2] || '';
  
  let osName = platform;
  if (platform === 'win32' || platform === 'windows') {
    if (version.startsWith('10.0.22')) osName = 'Windows 11';
    else if (version.startsWith('10.0')) osName = 'Windows 10';
    else osName = `Windows ${version}`;
  } else if (platform === 'darwin') {
    osName = `macOS ${version}`;
  } else if (platform === 'linux') {
    osName = `Linux ${version}`;
  }
  return `${osName} (${arch || 'x64'})`;
}

// Component: Resolve country from IP using free API
function IpCountryBadge({ ip }: { ip: string }) {
  const [info, setInfo] = useState<{ country: string; city: string; flag: string } | null>(null);
  
  useEffect(() => {
    if (!ip || ip === 'unknown') return;
    fetch(`https://ip-api.com/json/${ip}?fields=country,city,countryCode`)
      .then(r => r.json())
      .then(d => {
        if (d.country) {
          const flag = d.countryCode
            ? String.fromCodePoint(...[...d.countryCode.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
            : '🌍';
          setInfo({ country: d.country, city: d.city || '', flag });
        }
      })
      .catch(() => setInfo({ country: '—', city: '', flag: '🌍' }));
  }, [ip]);

  if (!info) return <span className="text-xs text-muted-foreground animate-pulse">{ip}</span>;
  return (
    <span className="text-xs font-medium flex items-center gap-1.5">
      <span className="text-base">{info.flag}</span>
      {info.city ? `${info.city}, ${info.country}` : info.country}
    </span>
  );
}

interface Props {
  license: License | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function LicenseDetailSheet({ license, open, onClose, onRefresh }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [actionLoading, setActionLoading] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<string>('');
  const [extendDays, setExtendDays] = useState(365);

  // Load activations
  const { data: activationsRaw } = useCachedQuery({
    queryKey: ['licensing', 'activations', license?.id],
    queryFn: () => licensingService.getActivations(20),
    enabled: !!license && open,
    staleTime: 30_000,
  });

  // Load heartbeats for this license
  const { data: heartbeatsRaw } = useCachedQuery({
    queryKey: ['licensing', 'heartbeats-detail', license?.license_key],
    queryFn: () => licensingService.getHeartbeatsForLicense(license!.license_key, 30),
    enabled: !!license && open,
    staleTime: 15_000,
  });

  // Load cloud backups
  const { data: backupsRaw } = useCachedQuery({
    queryKey: ['licensing', 'backups', license?.license_key],
    queryFn: () => licensingService.getCloudBackups(license!.license_key),
    enabled: !!license && open,
    staleTime: 60_000,
  });

  const activations = (activationsRaw || []).filter((a: any) => a.license_key === license?.license_key);
  const heartbeats = heartbeatsRaw || [];
  const backups: CloudBackup[] = backupsRaw || [];

  if (!license) return null;

  const isExpired = new Date(license.expires_at) < new Date();
  const daysLeft = Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / 86400000);
  const isOnline = licensingService.isOnline(license.last_heartbeat_at);
  const latestHb = heartbeats[0];

  const copyKey = () => {
    navigator.clipboard.writeText(license.license_key);
    toast.success(isAr ? 'تم نسخ المفتاح' : 'Key copied');
  };

  const sendEmail = async () => {
    const email = (license as any).customer_email;
    if (!email) { toast.error(isAr ? 'لا يوجد بريد إلكتروني' : 'No email'); return; }
    setActionLoading(true);
    try {
      await licensingService.sendLicenseEmail(license, email, (license as any).customer_name);
      toast.success(isAr ? `تم الإرسال إلى ${email}` : `Sent to ${email}`);
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await licensingService.updateLicenseStatus(license.id, newStatus as any);
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
      onRefresh(); onClose();
    } catch (err: any) { toast.error(err.message); }
    setActionLoading(false);
  };

  const handleDownloadBackup = async (backup: CloudBackup) => {
    try {
      const url = await licensingService.downloadBackup(backup.file_path);
      if (url) window.open(url, '_blank');
    } catch (err: any) { toast.error(err.message); }
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleString(isAr ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—';

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side={isAr ? 'left' : 'right'} className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-3">
            <Key className="h-5 w-5 text-emerald-500" />
            {isAr ? 'تفاصيل الترخيص' : 'License Details'}
          </SheetTitle>
        </SheetHeader>

        {/* Key + Copy + Online Status */}
        <div className="flex items-center gap-2 mb-3 p-3 bg-muted rounded-lg">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <code className="flex-1 text-sm font-mono tracking-wider truncate">{license.license_key}</code>
          <Button size="sm" variant="ghost" onClick={copyKey}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={sendEmail} disabled={actionLoading}><Mail className="h-4 w-4" /></Button>
        </div>

        {/* Quick Badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge className={`text-xs ${license.tier === 'pro' ? 'bg-emerald-100 text-emerald-700' : license.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
            {TIER_LABELS[license.tier]?.[isAr ? 'ar' : 'en'] || license.tier}
          </Badge>
          <Badge variant={license.status === 'active' ? 'default' : 'destructive'}>{license.status}</Badge>
          <Badge variant={isOnline ? 'default' : 'outline'} className={`text-xs ${isOnline ? 'bg-green-100 text-green-700' : ''}`}>
            {isOnline ? (isAr ? '🟢 متصل' : '🟢 Online') : (isAr ? '⚫ غير متصل' : '⚫ Offline')}
          </Badge>
          {isExpired ? (
            <Badge variant="destructive">{isAr ? 'منتهي' : 'Expired'}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">{daysLeft} {isAr ? 'يوم' : 'days'}</Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">{isAr ? 'المعلومات' : 'Info'}</TabsTrigger>
            <TabsTrigger value="device">{isAr ? 'الجهاز' : 'Device'}</TabsTrigger>
            <TabsTrigger value="heartbeats">{isAr ? 'النبضات' : 'Pulse'}</TabsTrigger>
            <TabsTrigger value="backups">{isAr ? 'النسخ' : 'Backups'}</TabsTrigger>
            <TabsTrigger value="actions">{isAr ? 'إجراءات' : 'Actions'}</TabsTrigger>
          </TabsList>

          {/* ══════ Info Tab ══════ */}
          <TabsContent value="info">
            {/* Customer */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'العميل' : 'Customer'}</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'الشركة' : 'Company'} value={(license as any).customer_name || '—'} />
                <InfoRow label={isAr ? 'البريد' : 'Email'} value={(license as any).customer_email || '—'} icon={Mail} />
              </CardContent>
            </Card>

            {/* Subscription & Domain */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" />{isAr ? 'الاشتراك والدومين' : 'Subscription & Domain'}</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'السب دومين' : 'Subdomain'} value={
                  license.subdomain
                    ? <a href={`https://${license.subdomain}.texacore.ai`} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{license.subdomain}.texacore.ai</a>
                    : <span className="text-muted-foreground">{isAr ? 'غير مسجل' : 'Not registered'}</span>
                } icon={Globe} />
                <InfoRow label={isAr ? 'اسم الجهاز' : 'Hostname'} value={license.hostname || '—'} icon={Server} />
                <InfoRow label={isAr ? 'الإصدار' : 'Version'} value={license.app_version || '—'} icon={ArrowUpCircle} />
                <InfoRow label={isAr ? 'بداية الترخيص' : 'Start Date'} value={fmt(license.created_at)} icon={CalendarPlus} />
                <InfoRow label={isAr ? 'تاريخ الانتهاء' : 'Expires'} value={fmt(license.expires_at)} icon={Clock} />
                <InfoRow label={isAr ? 'الأيام المتبقية' : 'Days Left'} value={
                  isExpired
                    ? <span className="text-red-500 font-bold">{isAr ? 'منتهي' : 'Expired'}</span>
                    : <span className="text-emerald-600 font-bold">{daysLeft} {isAr ? 'يوم' : 'days'}</span>
                } icon={Clock} />
              </CardContent>
            </Card>

            {/* Network & Location */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" />{isAr ? 'الشبكة والموقع' : 'Network & Location'}</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'عنوان IP العام' : 'Public IP'} value={
                  license.local_ip
                    ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{license.local_ip}</code>
                    : '—'
                } icon={Globe} />
                {latestHb?.local_ips && latestHb.local_ips.length > 0 && (
                  <InfoRow label={isAr ? 'عناوين IP المحلية' : 'Local IPs'} value={
                    <div className="flex flex-col gap-0.5 items-end">
                      {latestHb.local_ips.map((ip: any, i: number) => (
                        <code key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {ip.ip} <span className="text-muted-foreground">({ip.iface})</span>
                        </code>
                      ))}
                    </div>
                  } icon={Wifi} />
                )}
                <InfoRow label={isAr ? 'الدولة' : 'Country'} value={
                  license.country
                    ? (() => {
                        const cc = license.country_code || '';
                        const flag = cc ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🌍';
                        return <span className="text-xs font-medium flex items-center gap-1.5"><span className="text-base">{flag}</span>{license.country}</span>;
                      })()
                    : license.local_ip && license.local_ip !== 'unknown'
                      ? <IpCountryBadge ip={license.local_ip} />
                      : <span className="text-muted-foreground">—</span>
                } icon={MapPin} />
                <InfoRow label={isAr ? 'المدينة' : 'City'} value={
                  license.city || <span className="text-muted-foreground">—</span>
                } icon={MapPin} />
              </CardContent>
            </Card>

            {/* System & Device */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4 text-violet-500" />{isAr ? 'النظام والجهاز' : 'System & Device'}</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'نظام التشغيل' : 'Operating System'} value={
                  license.os_info
                    ? <span className="text-xs">{formatOsInfo(license.os_info)}</span>
                    : '—'
                } icon={Monitor} />
                {latestHb?.cpu_model && <InfoRow label={isAr ? 'المعالج' : 'CPU'} value={<span className="text-xs truncate max-w-[200px] block text-end">{latestHb.cpu_model}</span>} icon={Cpu} />}
                {latestHb?.cpu_cores && <InfoRow label={isAr ? 'عدد الأنوية' : 'CPU Cores'} value={latestHb.cpu_cores} icon={Cpu} />}
                {latestHb?.ram_total_gb && <InfoRow label={isAr ? 'الذاكرة الكلية' : 'Total RAM'} value={`${latestHb.ram_total_gb} GB`} />}
                {latestHb?.uptime_hours != null && <InfoRow label={isAr ? 'مدة التشغيل' : 'Uptime'} value={
                  latestHb.uptime_hours >= 24
                    ? `${Math.floor(latestHb.uptime_hours / 24)} ${isAr ? 'يوم' : 'd'} ${Math.round(latestHb.uptime_hours % 24)} ${isAr ? 'ساعة' : 'h'}`
                    : `${Math.round(latestHb.uptime_hours)} ${isAr ? 'ساعة' : 'hours'}`
                } icon={Clock} />}
                {license.hardware_id && <InfoRow label="Hardware ID" value={<code className="text-[10px] truncate max-w-[180px] block text-end">{license.hardware_id}</code>} icon={Shield} />}
              </CardContent>
            </Card>

            {/* Plan Limits */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'حدود الباقة' : 'Plan Limits'}</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'المستخدمين' : 'Max Users'} value={license.max_users} icon={Key} />
                <InfoRow label={isAr ? 'الشركات' : 'Companies'} value={license.max_companies} />
                <InfoRow label={isAr ? 'المخازن' : 'Warehouses'} value={license.max_warehouses} />
                <InfoRow label={isAr ? 'التخزين' : 'Storage'} value={`${license.max_storage_gb} GB`} icon={HardDrive} />
              </CardContent>
            </Card>

            {/* Modules */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'الوحدات المفعّلة' : 'Modules'}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {(license.enabled_modules || []).map(m => (
                    <Badge key={m} variant="outline" className="text-xs">{MODULE_LABELS[m]?.[isAr ? 'ar' : 'en'] || m}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ Device Tab ══════ */}
          <TabsContent value="device">
            <Card>
              <CardContent className="pt-4 space-y-0">
                <InfoRow label={isAr ? 'حالة الاتصال' : 'Connection'} value={
                  isOnline
                    ? <span className="text-green-600 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" /> {isAr ? 'متصل الآن' : 'Online'}</span>
                    : <span className="text-muted-foreground">{isAr ? 'غير متصل' : 'Offline'} — {license.last_heartbeat_at ? fmt(license.last_heartbeat_at) : isAr ? 'لم يتصل أبداً' : 'Never'}</span>
                } icon={Wifi} />
                <InfoRow label={isAr ? 'الربط' : 'Binding'} value={
                  license.hardware_id
                    ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {isAr ? 'مربوط' : 'Bound'}</span>
                    : <span className="text-muted-foreground">{isAr ? 'غير مربوط' : 'Not bound'}</span>
                } icon={Cpu} />
                {license.hardware_id && <InfoRow label="Hardware ID" value={<code className="text-xs">{license.hardware_id}</code>} icon={Monitor} />}
                <InfoRow label={isAr ? 'التفعيل' : 'Activated'} value={license.activated_at ? fmt(license.activated_at) : '—'} icon={CheckCircle2} />
                <InfoRow label={isAr ? 'النقل' : 'Transfers'} value={`${license.transfer_count} / ${license.max_transfers}`} icon={RefreshCw} />
              </CardContent>
            </Card>

            {/* Live Resources from latest heartbeat */}
            {latestHb && (
              <Card className="mt-3">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-orange-500" />{isAr ? 'موارد الجهاز' : 'Resources'}</CardTitle></CardHeader>
                <CardContent className="space-y-0">
                  {latestHb.cpu_percent != null && <InfoRow label="CPU" value={`${latestHb.cpu_percent}%`} icon={Cpu} />}
                  {latestHb.ram_used_gb != null && <InfoRow label="RAM" value={`${latestHb.ram_used_gb} / ${latestHb.ram_total_gb} GB`} />}
                  {latestHb.disk_used_percent != null && <InfoRow label={isAr ? 'القرص' : 'Disk'} value={`${latestHb.disk_used_percent}%`} icon={HardDrive} />}
                  <InfoRow label={isAr ? 'حجم القاعدة' : 'DB Size'} value={`${latestHb.db_size_mb} MB`} icon={Database} />
                  <InfoRow label={isAr ? 'المستخدمين' : 'Active Users'} value={latestHb.users_active} />
                  <InfoRow label={isAr ? 'الشركات' : 'Companies'} value={latestHb.companies_count} />
                  <InfoRow label={isAr ? 'الفواتير' : 'Invoices'} value={latestHb.invoices_count} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════ Heartbeats Tab ══════ */}
          <TabsContent value="heartbeats">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  {isAr ? 'سجل النبضات' : 'Heartbeat Log'} ({heartbeats.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {heartbeats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'لا توجد نبضات بعد' : 'No heartbeats yet'}</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {heartbeats.map((h: any, i: number) => (
                      <div key={i} className="p-2.5 rounded bg-muted/30 text-xs border border-border/30">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                            {h.app_version || 'v?'}
                          </span>
                          <span className="text-muted-foreground">{fmt(h.created_at)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-muted-foreground mt-1">
                          <span>👥 {h.users_active}</span>
                          <span>🏢 {h.companies_count}</span>
                          <span>📄 {h.invoices_count}</span>
                          {h.cpu_percent != null && <span>⚡ CPU {h.cpu_percent}%</span>}
                          {h.ram_used_gb != null && <span>💾 {h.ram_used_gb}GB</span>}
                          <span>📊 {h.db_size_mb}MB</span>
                        </div>
                        <div className="text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {h.ip_address || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ Backups Tab ══════ */}
          <TabsContent value="backups">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  {isAr ? 'النسخ الاحتياطية السحابية' : 'Cloud Backups'} ({backups.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'لا توجد نسخ احتياطية بعد' : 'No backups yet'}</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {backups.map((b, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded bg-muted/30 text-xs border border-border/30">
                        <Database className="h-4 w-4 text-blue-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{fmt(b.uploaded_at)}</div>
                          <div className="text-muted-foreground">{b.file_size_mb} MB — {b.companies_count} {isAr ? 'شركة' : 'co.'} — {b.invoices_count} {isAr ? 'فاتورة' : 'inv.'}</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadBackup(b)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ Actions Tab ══════ */}
          <TabsContent value="actions">
            {/* Upgrade */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-blue-500" />{isAr ? 'تغيير الباقة' : 'Change Tier'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={upgradeTarget} onValueChange={setUpgradeTarget}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      {['trial', 'basic', 'starter', 'pro', 'enterprise'].filter(t => t !== license.tier).map(t => (
                        <SelectItem key={t} value={t}>{TIER_LABELS[t]?.[isAr ? 'ar' : 'en'] || t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button disabled={!upgradeTarget || actionLoading} onClick={async () => {
                    setActionLoading(true);
                    try { await licensingService.upgradeTier(license.id, upgradeTarget as any); toast.success(isAr ? 'تم!' : 'Done!'); onRefresh(); onClose(); } catch (e: any) { toast.error(e.message); }
                    setActionLoading(false);
                  }}>{isAr ? 'تطبيق' : 'Apply'}</Button>
                </div>
              </CardContent>
            </Card>

            {/* Extend */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-emerald-500" />{isAr ? 'تمديد' : 'Extend'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input type="number" dir="ltr" min={1} max={3650} value={extendDays} onChange={e => setExtendDays(+e.target.value)} className="w-24" />
                  <span className="text-sm text-muted-foreground">{isAr ? 'يوم' : 'days'}</span>
                  {[30, 90, 365].map(d => (
                    <Button key={d} size="sm" variant={extendDays === d ? 'default' : 'outline'} onClick={() => setExtendDays(d)} className="text-xs">
                      {d === 30 ? '1M' : d === 90 ? '3M' : '1Y'}
                    </Button>
                  ))}
                </div>
                <Button className="w-full gap-2" variant="outline" disabled={actionLoading || extendDays < 1} onClick={async () => {
                  setActionLoading(true);
                  try { await licensingService.extendLicense(license.id, extendDays); toast.success(isAr ? `تم التمديد ${extendDays} يوم` : `Extended ${extendDays} days`); onRefresh(); onClose(); } catch (e: any) { toast.error(e.message); }
                  setActionLoading(false);
                }}><CalendarPlus className="h-4 w-4" />{isAr ? 'تمديد' : 'Extend'}</Button>
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="mt-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'إدارة الحالة' : 'Status'}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {license.status === 'active' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-orange-600" disabled={actionLoading} onClick={() => handleStatusChange('suspended')}>
                    <Ban className="h-4 w-4" /> {isAr ? 'إيقاف' : 'Suspend'}
                  </Button>
                )}
                {license.status === 'suspended' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-green-600" disabled={actionLoading} onClick={() => handleStatusChange('active')}>
                    <CheckCircle2 className="h-4 w-4" /> {isAr ? 'إعادة التفعيل' : 'Reactivate'}
                  </Button>
                )}
                {license.status !== 'revoked' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-red-600" disabled={actionLoading} onClick={() => handleStatusChange('revoked')}>
                    <XCircle className="h-4 w-4" /> {isAr ? 'إلغاء نهائي' : 'Revoke'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

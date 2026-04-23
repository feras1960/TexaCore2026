/**
 * 🔑 License Detail Sheet — Opens when clicking a license row
 * Shows: info, device, activations, heartbeats, and admin actions
 */
import { useState } from 'react';
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
} from 'lucide-react';
import { License, licensingService, TIER_DEFAULTS } from '@/services/saas/licensingService';
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

  // Load activations for this license
  const { data: activationsRaw } = useCachedQuery({
    queryKey: ['licensing', 'activations', license?.id],
    queryFn: () => licensingService.getActivations(20),
    enabled: !!license && open,
    staleTime: 30_000,
  });

  const { data: heartbeatsRaw } = useCachedQuery({
    queryKey: ['licensing', 'heartbeats', license?.id],
    queryFn: () => licensingService.getHeartbeats(20),
    enabled: !!license && open,
    staleTime: 30_000,
  });

  const activations = (activationsRaw || []).filter((a: any) => a.license_key === license?.license_key);
  const heartbeats = (heartbeatsRaw || []).filter((h: any) => h.license_key === license?.license_key);

  if (!license) return null;

  const isExpired = new Date(license.expires_at) < new Date();
  const daysLeft = Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / 86400000);

  const copyKey = () => {
    navigator.clipboard.writeText(license.license_key);
    toast.success(isAr ? 'تم نسخ المفتاح' : 'Key copied');
  };

  const sendEmail = async () => {
    const email = (license as any).customer_email;
    if (!email) {
      toast.error(isAr ? 'لا يوجد بريد إلكتروني للعميل' : 'No customer email found');
      return;
    }
    setActionLoading(true);
    try {
      await licensingService.sendLicenseEmail(license, email, (license as any).customer_name);
      toast.success(isAr ? `تم إرسال المفتاح إلى ${email}` : `Key sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await licensingService.updateLicenseStatus(license.id, newStatus as any);
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(false);
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

        {/* Key + Copy */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
          <code className="flex-1 text-sm font-mono tracking-wider">{license.license_key}</code>
          <Button size="sm" variant="ghost" onClick={copyKey} title={isAr ? 'نسخ' : 'Copy'}><Copy className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={sendEmail} disabled={actionLoading} title={isAr ? 'إرسال بالبريد' : 'Send Email'}><Mail className="h-4 w-4" /></Button>
        </div>

        {/* Quick Info */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge className={`text-xs ${license.tier === 'pro' ? 'bg-emerald-100 text-emerald-700' : license.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
            {TIER_LABELS[license.tier]?.[isAr ? 'ar' : 'en'] || license.tier}
          </Badge>
          <Badge variant={license.status === 'active' ? 'default' : 'destructive'}>
            {license.status}
          </Badge>
          {isExpired ? (
            <Badge variant="destructive">{isAr ? 'منتهي الصلاحية' : 'Expired'}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {daysLeft} {isAr ? 'يوم متبقي' : 'days left'}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">{isAr ? 'المعلومات' : 'Info'}</TabsTrigger>
            <TabsTrigger value="device">{isAr ? 'الجهاز' : 'Device'}</TabsTrigger>
            <TabsTrigger value="history">{isAr ? 'السجل' : 'History'}</TabsTrigger>
            <TabsTrigger value="actions">{isAr ? 'إجراءات' : 'Actions'}</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isAr ? 'معلومات العميل' : 'Customer Info'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'الشركة' : 'Company'} value={(license as any).customer_name || '—'} />
                <InfoRow label={isAr ? 'البريد' : 'Email'} value={(license as any).customer_email || '—'} />
              </CardContent>
            </Card>

            <Card className="mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isAr ? 'حدود الباقة' : 'Plan Limits'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label={isAr ? 'المستخدمين' : 'Max Users'} value={license.max_users} icon={Key} />
                <InfoRow label={isAr ? 'الشركات' : 'Companies'} value={license.max_companies} />
                <InfoRow label={isAr ? 'المخازن' : 'Warehouses'} value={license.max_warehouses} />
                <InfoRow label={isAr ? 'التخزين' : 'Storage'} value={`${license.max_storage_gb} GB`} icon={HardDrive} />
                <InfoRow label={isAr ? 'ينتهي' : 'Expires'} value={fmt(license.expires_at)} icon={Clock} />
                <InfoRow label={isAr ? 'أنشئ' : 'Created'} value={fmt(license.created_at)} />
              </CardContent>
            </Card>

            <Card className="mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isAr ? 'الوحدات المفعّلة' : 'Enabled Modules'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {(license.enabled_modules || []).map(m => (
                    <Badge key={m} variant="outline" className="text-xs">
                      {MODULE_LABELS[m]?.[isAr ? 'ar' : 'en'] || m}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Device Tab */}
          <TabsContent value="device">
            <Card>
              <CardContent className="pt-4 space-y-0">
                <InfoRow
                  label={isAr ? 'حالة الربط' : 'Binding Status'}
                  value={license.hardware_id
                    ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {isAr ? 'مربوط' : 'Bound'}</span>
                    : <span className="text-muted-foreground">{isAr ? 'غير مربوط' : 'Not bound'}</span>
                  }
                  icon={Cpu}
                />
                {license.hardware_id && (
                  <InfoRow label="Hardware ID" value={<code className="text-xs">{license.hardware_id}</code>} icon={Monitor} />
                )}
                <InfoRow label={isAr ? 'التفعيل' : 'Activated'} value={license.activated_at ? fmt(license.activated_at) : '—'} icon={CheckCircle2} />
                <InfoRow label={isAr ? 'عدد النقل' : 'Transfers'} value={`${license.transfer_count} / ${license.max_transfers}`} icon={RefreshCw} />
              </CardContent>
            </Card>

            {/* Last heartbeat */}
            {heartbeats.length > 0 && (
              <Card className="mt-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    {isAr ? 'آخر نبضة' : 'Last Heartbeat'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoRow label={isAr ? 'آخر اتصال' : 'Last Seen'} value={fmt(heartbeats[0].created_at)} icon={Wifi} />
                  <InfoRow label={isAr ? 'إصدار' : 'Version'} value={heartbeats[0].app_version || '—'} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {isAr ? 'سجل التفعيلات' : 'Activation Log'} ({activations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isAr ? 'لا توجد تفعيلات' : 'No activations yet'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {activations.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/30 text-xs">
                        <div className={`mt-0.5 ${a.action === 'activate' ? 'text-green-500' : a.action === 'deactivate' ? 'text-red-500' : 'text-blue-500'}`}>
                          {a.action === 'activate' ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{a.action} — {a.hostname || '—'}</div>
                          <div className="text-muted-foreground">{a.os_info}</div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.ip_address || '—'}
                          </div>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">{fmt(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            {/* Upgrade Tier */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                  {isAr ? 'تغيير الباقة' : 'Change Tier'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={upgradeTarget} onValueChange={setUpgradeTarget}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder={isAr ? 'اختر الباقة...' : 'Select tier...'} /></SelectTrigger>
                    <SelectContent>
                      {['trial', 'basic', 'starter', 'pro', 'enterprise'].filter(t => t !== license.tier).map(t => (
                        <SelectItem key={t} value={t}>
                          {TIER_LABELS[t]?.[isAr ? 'ar' : 'en'] || t} — {(TIER_DEFAULTS as any)[t]?.max_users || '?'} {isAr ? 'مستخدم' : 'users'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!upgradeTarget || actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await licensingService.upgradeTier(license.id, upgradeTarget as any);
                        toast.success(isAr ? 'تم تغيير الباقة!' : 'Tier updated!');
                        onRefresh(); onClose();
                      } catch (err: any) { toast.error(err.message); }
                      setActionLoading(false);
                    }}
                  >
                    {isAr ? 'تطبيق' : 'Apply'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAr ? 'التغيير ينعكس فوراً على جهاز المستخدم' : 'Changes apply immediately to the user\'s device'}
                </p>
              </CardContent>
            </Card>

            {/* Extend License */}
            <Card className="mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-emerald-500" />
                  {isAr ? 'تمديد الترخيص' : 'Extend License'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    type="number" dir="ltr" min={1} max={3650}
                    value={extendDays} onChange={e => setExtendDays(+e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{isAr ? 'يوم' : 'days'}</span>
                  <div className="flex gap-1">
                    {[30, 90, 365].map(d => (
                      <Button key={d} size="sm" variant={extendDays === d ? 'default' : 'outline'}
                        onClick={() => setExtendDays(d)} className="text-xs">
                        {d === 30 ? (isAr ? 'شهر' : '1M') : d === 90 ? (isAr ? '3 أشهر' : '3M') : (isAr ? 'سنة' : '1Y')}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full gap-2" variant="outline"
                  disabled={actionLoading || extendDays < 1}
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      const res = await licensingService.extendLicense(license.id, extendDays);
                      toast.success(isAr ? `تم التمديد ${extendDays} يوم` : `Extended by ${extendDays} days`);
                      onRefresh(); onClose();
                    } catch (err: any) { toast.error(err.message); }
                    setActionLoading(false);
                  }}
                >
                  <CalendarPlus className="h-4 w-4" />
                  {isAr ? 'تمديد' : 'Extend'}
                </Button>
              </CardContent>
            </Card>

            {/* Status Management */}
            <Card className="mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isAr ? 'إدارة الحالة' : 'Status Management'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {license.status === 'active' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-orange-600" disabled={actionLoading}
                    onClick={() => handleStatusChange('suspended')}>
                    <Ban className="h-4 w-4" /> {isAr ? 'إيقاف الترخيص' : 'Suspend License'}
                  </Button>
                )}
                {license.status === 'suspended' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-green-600" disabled={actionLoading}
                    onClick={() => handleStatusChange('active')}>
                    <CheckCircle2 className="h-4 w-4" /> {isAr ? 'إعادة التفعيل' : 'Reactivate'}
                  </Button>
                )}
                {license.status !== 'revoked' && (
                  <Button variant="outline" className="w-full justify-start gap-2 text-red-600" disabled={actionLoading}
                    onClick={() => handleStatusChange('revoked')}>
                    <XCircle className="h-4 w-4" /> {isAr ? 'إلغاء نهائي' : 'Revoke License'}
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

/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Settings Page
 * صفحة إعدادات المستودعات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService, WarehouseSettings } from '@/services/warehouseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Settings,
    Save,
    Loader2,
    Package,
    Clock,
    AlertTriangle,
    QrCode,
    Smartphone,
    PackageCheck,
} from 'lucide-react';

export default function WarehouseSettingsPage() {
    const { t, language } = useLanguage();
    const { companyId, tenantId } = useAuth();

    // State
    const [settings, setSettings] = useState<Partial<WarehouseSettings>>({
        costing_method: 'fifo',
        require_dispatch_approval: true,
        default_reservation_hours: 48,
        extended_reservation_hours: 168,
        deposit_required_for_extended: true,
        min_deposit_percent: 20,
        auto_cancel_expired_reservations: true,
        warn_dye_lot_mismatch: true,
        enforce_same_dye_lot: false,
        allow_negative_stock: false,
        low_stock_threshold_percent: 20,
        auto_reorder_enabled: false,
        barcode_format: 'CODE128',
        auto_generate_roll_barcode: true,
        auto_generate_location_barcode: true,
        require_location_scan_on_receive: false,
        require_photo_on_receive: false,
        // 🔑 Receipt variance tolerance
        receipt_variance_tolerance_pct: 1,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load settings
    const loadSettings = async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const data = await warehouseService.getSettings(companyId);
            if (data) {
                setSettings(data);
            }
        } catch (err) {
            console.error('Error loading settings:', err);
            setError(t('errors.network.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, [companyId]);

    // Save settings
    const handleSave = async () => {
        if (!companyId || !tenantId) return;

        setSaving(true);
        try {
            await warehouseService.saveSettings({
                tenant_id: tenantId,
                company_id: companyId,
                ...settings,
            } as WarehouseSettings);
            // Show success (you can add a toast here)
        } catch (err) {
            console.error('Error saving settings:', err);
            setError(t('errors.network.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    // Update setting helper
    const updateSetting = <K extends keyof WarehouseSettings>(
        key: K,
        value: WarehouseSettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">{t('warehouse.settings.title')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t('warehouse.settings.description')}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('common.save')}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="pt-4 text-destructive">{error}</CardContent>
                </Card>
            )}

            {/* Costing Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t('warehouse.settings.costingMethod')}
                    </CardTitle>
                    <CardDescription>
                        {t('warehouse.settings.costingMethodDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={settings.costing_method}
                        onValueChange={(value) => updateSetting('costing_method', value as any)}
                    >
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fifo">{t('warehouse.settings.fifo')}</SelectItem>
                            <SelectItem value="lifo">{t('warehouse.settings.lifo')}</SelectItem>
                            <SelectItem value="average">{t('warehouse.settings.average')}</SelectItem>
                            <SelectItem value="specific">{t('warehouse.settings.specific')}</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Dispatch & Approval */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('warehouse.settings.dispatch')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.requireApproval')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('warehouse.settings.requireApprovalDesc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.require_dispatch_approval}
                            onCheckedChange={(checked) => updateSetting('require_dispatch_approval', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Reservations */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('warehouse.settings.reservations')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('warehouse.settings.defaultHours')}</Label>
                            <Input
                                type="number"
                                value={settings.default_reservation_hours}
                                onChange={(e) => updateSetting('default_reservation_hours', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('warehouse.settings.extendedHours')}</Label>
                            <Input
                                type="number"
                                value={settings.extended_reservation_hours}
                                onChange={(e) => updateSetting('extended_reservation_hours', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.depositRequired')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('warehouse.settings.depositRequiredDesc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.deposit_required_for_extended}
                            onCheckedChange={(checked) => updateSetting('deposit_required_for_extended', checked)}
                        />
                    </div>
                    {settings.deposit_required_for_extended && (
                        <div className="space-y-2">
                            <Label>{t('warehouse.settings.minDeposit')}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={settings.min_deposit_percent}
                                    onChange={(e) => updateSetting('min_deposit_percent', parseFloat(e.target.value))}
                                    className="w-24"
                                />
                                <span>%</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dye Lot */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {t('warehouse.settings.dyeLot')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.warnDyeLot')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('warehouse.settings.warnDyeLotDesc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.warn_dye_lot_mismatch}
                            onCheckedChange={(checked) => updateSetting('warn_dye_lot_mismatch', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.enforceDyeLot')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('warehouse.settings.enforceDyeLotDesc')}
                            </p>
                        </div>
                        <Switch
                            checked={settings.enforce_same_dye_lot}
                            onCheckedChange={(checked) => updateSetting('enforce_same_dye_lot', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ═══ 🔑 Receipt Settings — Variance Tolerance ═══ */}
            <Card className="border-emerald-200 dark:border-emerald-800">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-emerald-600" />
                        {language === 'ar' ? 'إعدادات الاستلام' : 'Receipt Settings'}
                    </CardTitle>
                    <CardDescription>
                        {language === 'ar'
                            ? 'ضبط قواعد استلام البضائع والتسامح في الكميات'
                            : 'Configure goods receipt rules and quantity tolerance'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Variance tolerance */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {language === 'ar' ? 'نسبة التسامح في الكميات (%)' : 'Quantity Variance Tolerance (%)'}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {language === 'ar'
                                ? 'الفارق المسموح به بين الكمية المطلوبة والمستلمة فعلياً. أي فارق يتجاوز هذه النسبة سيُعلَّم للمراجعة.'
                                : 'Allowed variance between expected and actual received quantity. Variances beyond this will be flagged for review.'}
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={(settings as any).receipt_variance_tolerance_pct ?? 1}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        receipt_variance_tolerance_pct: parseFloat(e.target.value) || 0
                                    }))}
                                    className="w-24 pe-7"
                                />
                                <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                            </div>
                            <div className="flex gap-2">
                                {[0.5, 1, 2, 3, 5].map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setSettings(prev => ({ ...prev, receipt_variance_tolerance_pct: v }))}
                                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${(settings as any).receipt_variance_tolerance_pct === v
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
                                            }`}
                                    >
                                        {v}%
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mt-2 ${(settings as any).receipt_variance_tolerance_pct === 0
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : (settings as any).receipt_variance_tolerance_pct <= 1
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                : (settings as any).receipt_variance_tolerance_pct <= 3
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            }`}>
                            <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                            {(settings as any).receipt_variance_tolerance_pct === 0 && (
                                language === 'ar' ? 'لا تسامح — أي فارق سيُعلَّم للمراجعة' : 'Zero tolerance — any variance will be flagged'
                            )}
                            {(settings as any).receipt_variance_tolerance_pct > 0 && (settings as any).receipt_variance_tolerance_pct <= 1 && (
                                language === 'ar' ? `✓ صارم — فقط فروقات أكبر من ${(settings as any).receipt_variance_tolerance_pct}% تُعلَّم` : `✓ Strict — only variances > ${(settings as any).receipt_variance_tolerance_pct}% flagged`
                            )}
                            {(settings as any).receipt_variance_tolerance_pct > 1 && (settings as any).receipt_variance_tolerance_pct <= 3 && (
                                language === 'ar' ? `✓ متوازن — معيار الصناعة للأقمشة` : `✓ Balanced — fabric industry standard`
                            )}
                            {(settings as any).receipt_variance_tolerance_pct > 3 && (
                                language === 'ar' ? `⚠ متساهل — فروقات كبيرة ستُقبل تلقائياً` : `⚠ Lenient — large variances auto-accepted`
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mobile & Scanner */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        {t('warehouse.settings.mobile')}
                        <Badge variant="outline">⏳ {t('common.comingSoon')}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between opacity-50">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.requireScan')}</Label>
                        </div>
                        <Switch
                            checked={settings.require_location_scan_on_receive}
                            onCheckedChange={(checked) => updateSetting('require_location_scan_on_receive', checked)}
                            disabled
                        />
                    </div>
                    <div className="flex items-center justify-between opacity-50">
                        <div className="space-y-0.5">
                            <Label>{t('warehouse.settings.requirePhoto')}</Label>
                        </div>
                        <Switch
                            checked={settings.require_photo_on_receive}
                            onCheckedChange={(checked) => updateSetting('require_photo_on_receive', checked)}
                            disabled
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * RollBinAssignDialog — تحديد موقع حفظ الرولون في المستودع
 * يفتح بعد استلام الرولون لتحديد: صف / عمود / رف
 * يدعم إنشاء موقع جديد مباشرةً من النافذة
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { warehouseService } from '@/services/warehouseService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    MapPin,
    Plus,
    Search,
    CheckCircle2,
    Layers,
    Warehouse,
    LayoutGrid,
    Loader2,
    AlertCircle,
    X,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Roll {
    id: string;
    roll_number: string;
    status?: string;
    current_length?: number;
}

interface BinLocation {
    id: string;
    warehouse_id: string;
    code: string;
    name?: string;
    name_ar?: string;
    name_en?: string;
    row_code?: string;
    column_code?: string;
    shelf_code?: string;
    capacity_rolls?: number;
    current_rolls_count?: number;
    is_active?: boolean;
}

interface RollBinAssignDialogProps {
    open: boolean;
    onClose: () => void;
    /** Rolls to assign (single or batch from goods receipt) */
    rolls: Roll[];
    warehouseId: string;
    warehouseName?: string;
    /** Called after successful assignment */
    onAssigned?: (binLocationId: string, assignedRolls: Roll[]) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function RollBinAssignDialog({
    open,
    onClose,
    rolls,
    warehouseId,
    warehouseName,
    onAssigned,
}: RollBinAssignDialogProps) {
    const { language } = useLanguage();
    const { company, companyId } = useCompany();
    const tenantId = (company as any)?.tenant_id || '';
    const isRTL = language === 'ar';
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // ─── State ───
    const [binLocations, setBinLocations] = useState<BinLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedBin, setSelectedBin] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [success, setSuccess] = useState(false);

    // Create form state
    const [newBin, setNewBin] = useState({
        code: '',
        name_ar: '',
        row_code: '',
        column_code: '',
        shelf_code: '',
        capacity_rolls: '',
    });

    // ─── Load bin locations ───
    const loadBins = useCallback(async () => {
        if (!companyId || !warehouseId) return;
        setLoading(true);
        try {
            const data = await warehouseService.getBinLocations(companyId, warehouseId);
            setBinLocations(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [companyId, warehouseId]);

    useEffect(() => {
        if (open) {
            loadBins();
            setSelectedBin(null);
            setSearchQuery('');
            setShowCreateForm(false);
            setSuccess(false);
            setError(null);
        }
    }, [open, loadBins]);

    // ─── Filter bins by search ───
    const filteredBins = binLocations.filter(b => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            b.code.toLowerCase().includes(q) ||
            (b.name_ar && b.name_ar.toLowerCase().includes(q)) ||
            (b.row_code && b.row_code.toLowerCase().includes(q)) ||
            (b.shelf_code && b.shelf_code.toLowerCase().includes(q))
        );
    });

    // ─── Create new bin location ───
    const handleCreateBin = async () => {
        if (!companyId || !tenantId || !newBin.code.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const created = await warehouseService.createBinLocation(companyId, tenantId, {
                warehouse_id: warehouseId,
                code: newBin.code.trim().toUpperCase(),
                name_ar: newBin.name_ar || newBin.code,
                row_code: newBin.row_code || undefined,
                column_code: newBin.column_code || undefined,
                shelf_code: newBin.shelf_code || undefined,
                capacity_rolls: newBin.capacity_rolls ? parseInt(newBin.capacity_rolls) : undefined,
            });
            setBinLocations(prev => [...prev, created]);
            setSelectedBin(created.id);
            setShowCreateForm(false);
            setNewBin({ code: '', name_ar: '', row_code: '', column_code: '', shelf_code: '', capacity_rolls: '' });
        } catch (e: any) {
            setError(t('فشل إنشاء الموقع: ', 'Failed to create location: ') + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Assign rolls ───
    const handleAssign = async () => {
        if (!selectedBin) return;
        setSaving(true);
        setError(null);
        try {
            const rollIds = rolls.map(r => r.id);
            await warehouseService.bulkAssignRollsToBin(rollIds, selectedBin);
            setSuccess(true);
            onAssigned?.(selectedBin, rolls);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1200);
        } catch (e: any) {
            setError(t('فشل في حفظ الموقع: ', 'Failed to assign location: ') + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Bin capacity indicator ───
    const getCapacityColor = (bin: BinLocation) => {
        if (!bin.capacity_rolls) return '';
        const pct = (bin.current_rolls_count || 0) / bin.capacity_rolls;
        if (pct >= 1) return 'text-red-500';
        if (pct >= 0.8) return 'text-amber-500';
        return 'text-emerald-500';
    };

    // ─────────────────── Render ───────────────────
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="max-w-xl"
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        {t('تحديد موقع حفظ الرولونات', 'Assign Storage Location')}
                    </DialogTitle>
                    {/* Rolls summary */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="gap-1 text-xs">
                            <Layers className="w-3 h-3" />
                            {rolls.length} {t('رولون', 'roll(s)')}
                        </Badge>
                        {warehouseName && (
                            <Badge variant="outline" className="gap-1 text-xs text-blue-600">
                                <Warehouse className="w-3 h-3" />
                                {warehouseName}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                            {t('تم تحديد الموقع بنجاح!', 'Location assigned successfully!')}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('بحث بالكود أو الاسم...', 'Search by code or name...')}
                            className="ps-9 h-9 text-sm"
                        />
                    </div>

                    {/* Bin Locations Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin me-2" />
                            {t('تحميل المواقع...', 'Loading locations...')}
                        </div>
                    ) : (
                        <ScrollArea className="h-56">
                            {filteredBins.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">
                                        {binLocations.length === 0
                                            ? t('لا توجد مواقع – أنشئ موقعاً جديداً', 'No locations – create one below')
                                            : t('لا توجد نتائج', 'No results found')}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 p-1">
                                    {filteredBins.map(bin => {
                                        const isSelected = selectedBin === bin.id;
                                        const isFull = bin.capacity_rolls
                                            ? (bin.current_rolls_count || 0) >= bin.capacity_rolls
                                            : false;

                                        return (
                                            <button
                                                key={bin.id}
                                                disabled={isFull}
                                                onClick={() => setSelectedBin(isSelected ? null : bin.id)}
                                                className={cn(
                                                    'relative p-3 rounded-xl border-2 text-start transition-all',
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50',
                                                    isFull && 'opacity-50 cursor-not-allowed'
                                                )}
                                            >
                                                {isSelected && (
                                                    <CheckCircle2 className="absolute top-2 end-2 w-4 h-4 text-blue-500" />
                                                )}
                                                <div className="font-mono font-bold text-sm text-gray-800 dark:text-gray-100">
                                                    {bin.code}
                                                </div>
                                                {(bin.name_ar || bin.name) && (
                                                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                        {isRTL ? (bin.name_ar || bin.name) : (bin.name_en || bin.name_ar || bin.name)}
                                                    </div>
                                                )}
                                                {/* Row / Column / Shelf */}
                                                {(bin.row_code || bin.shelf_code) && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {bin.row_code && (
                                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">
                                                                {t('صف', 'Row')} {bin.row_code}
                                                            </span>
                                                        )}
                                                        {bin.column_code && (
                                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">
                                                                {t('عمود', 'Col')} {bin.column_code}
                                                            </span>
                                                        )}
                                                        {bin.shelf_code && (
                                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded font-mono">
                                                                {t('رف', 'Shelf')} {bin.shelf_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Capacity indicator */}
                                                {bin.capacity_rolls && (
                                                    <div className={cn('text-[10px] mt-1 font-mono', getCapacityColor(bin))}>
                                                        {bin.current_rolls_count || 0}/{bin.capacity_rolls} {t('رولون', 'rolls')}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    )}

                    {/* Create new bin form */}
                    {showCreateForm ? (
                        <div className="border border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 space-y-3 bg-blue-50/30 dark:bg-blue-900/10">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    {t('موقع جديد', 'New Location')}
                                </span>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">{t('كود الموقع*', 'Location Code*')}</Label>
                                    <Input
                                        value={newBin.code}
                                        onChange={e => setNewBin(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                        placeholder="A-01-001"
                                        className="h-8 text-sm font-mono mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">{t('الاسم (عربي)', 'Name (AR)')}</Label>
                                    <Input
                                        value={newBin.name_ar}
                                        onChange={e => setNewBin(p => ({ ...p, name_ar: e.target.value }))}
                                        placeholder={t('موقع أ-01', 'Location A-01')}
                                        className="h-8 text-sm mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">{t('الصف', 'Row')}</Label>
                                    <Input
                                        value={newBin.row_code}
                                        onChange={e => setNewBin(p => ({ ...p, row_code: e.target.value.toUpperCase() }))}
                                        placeholder="A"
                                        className="h-8 text-sm font-mono mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">{t('العمود', 'Column')}</Label>
                                    <Input
                                        value={newBin.column_code}
                                        onChange={e => setNewBin(p => ({ ...p, column_code: e.target.value.toUpperCase() }))}
                                        placeholder="01"
                                        className="h-8 text-sm font-mono mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">{t('الرف', 'Shelf')}</Label>
                                    <Input
                                        value={newBin.shelf_code}
                                        onChange={e => setNewBin(p => ({ ...p, shelf_code: e.target.value.toUpperCase() }))}
                                        placeholder="001"
                                        className="h-8 text-sm font-mono mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">{t('سعة (رولونات)', 'Capacity (rolls)')}</Label>
                                    <Input
                                        type="number"
                                        value={newBin.capacity_rolls}
                                        onChange={e => setNewBin(p => ({ ...p, capacity_rolls: e.target.value }))}
                                        placeholder="20"
                                        className="h-8 text-sm font-mono mt-1"
                                        min={1}
                                    />
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleCreateBin}
                                disabled={saving || !newBin.code.trim()}
                                className="w-full h-8 text-xs"
                            >
                                {saving
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin me-1" />{t('جارٍ الحفظ...', 'Saving...')}</>
                                    : <><CheckCircle2 className="w-3.5 h-3.5 me-1" />{t('حفظ الموقع', 'Save Location')}</>
                                }
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 text-xs border-dashed gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => setShowCreateForm(true)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {t('إضافة موقع جديد', 'Add New Location')}
                        </Button>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                        {t('تخطي', 'Skip')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAssign}
                        disabled={!selectedBin || saving || success}
                        className="gap-1.5 min-w-[120px]"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" />{t('حفظ...', 'Saving...')}</>
                            : success
                                ? <><CheckCircle2 className="w-4 h-4" />{t('تم!', 'Done!')}</>
                                : <><MapPin className="w-4 h-4" />{t('تحديد الموقع', 'Assign Location')}</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default RollBinAssignDialog;

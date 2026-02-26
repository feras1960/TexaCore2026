/**
 * ════════════════════════════════════════════════════════════════
 * 🚛 DriversManagementTab — إدارة السائقين
 * ════════════════════════════════════════════════════════════════
 * 
 * يعرض قائمة السائقين مع إمكانية:
 * - إضافة سائق جديد
 * - تعديل بيانات السائق
 * - تعطيل/تفعيل السائق
 * - ربط السائق بفرع
 * - عرض الفواتير المرتبطة بالسائق
 * 
 * @module features/users-permissions/components
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Truck, Search, Plus, Edit2, Save,
    Loader2, Phone, CreditCard, Car, User,
    Building2, MapPin, Calendar, FileText,
    ToggleLeft, ToggleRight, RefreshCw, Hash,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

interface Driver {
    id: string;
    tenant_id: string;
    company_id: string;
    user_id?: string;
    name_ar: string;
    name_en?: string;
    phone?: string;
    id_number?: string;
    license_number?: string;
    license_expiry?: string;
    vehicle_number?: string;
    vehicle_type?: string;
    vehicle_model?: string;
    branch_id?: string;
    status: 'active' | 'inactive' | 'on_leave';
    notes?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    // Joined
    branch_name?: string;
    invoice_count?: number;
}

interface Branch {
    id: string;
    name_ar?: string;
    name_en?: string;
}

const VEHICLE_TYPES = [
    { id: 'truck', ar: 'شاحنة', en: 'Truck' },
    { id: 'van', ar: 'فان', en: 'Van' },
    { id: 'pickup', ar: 'بيك أب', en: 'Pickup' },
    { id: 'car', ar: 'سيارة', en: 'Car' },
    { id: 'motorcycle', ar: 'دراجة نارية', en: 'Motorcycle' },
    { id: 'other', ar: 'أخرى', en: 'Other' },
];

const STATUS_CONFIG: Record<string, { ar: string; en: string; cls: string; icon: React.ReactNode }> = {
    active: { ar: 'نشط', en: 'Active', cls: 'bg-green-100 text-green-700 border-green-200', icon: <ToggleRight className="w-3 h-3" /> },
    inactive: { ar: 'غير نشط', en: 'Inactive', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: <ToggleLeft className="w-3 h-3" /> },
    on_leave: { ar: 'في إجازة', en: 'On Leave', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Calendar className="w-3 h-3" /> },
};

// ─── Component ──────────────────────────────────────────────────────────

export default function DriversManagementTab() {
    const { language, isRTL } = useLanguage();
    const { companyId, tenantId, user } = useAuth();
    const tl = (ar: string, en: string) => language === 'ar' ? ar : en;

    // State
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name_ar: '',
        name_en: '',
        phone: '',
        id_number: '',
        license_number: '',
        license_expiry: '',
        vehicle_number: '',
        vehicle_type: '',
        vehicle_model: '',
        branch_id: '',
        status: 'active' as string,
        notes: '',
    });

    // ═══ Fetch Drivers ═══
    const fetchDrivers = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('drivers')
                .select('*, branches!drivers_branch_id_fkey(name_ar, name_en)')
                .eq('company_id', companyId)
                .order('name_ar');

            if (error) throw error;

            // Also get invoice counts per driver
            const { data: invoiceCounts } = await supabase
                .from('sales_transactions')
                .select('driver_id')
                .eq('company_id', companyId)
                .not('driver_id', 'is', null);

            const countMap: Record<string, number> = {};
            if (invoiceCounts) {
                for (const inv of invoiceCounts) {
                    countMap[inv.driver_id] = (countMap[inv.driver_id] || 0) + 1;
                }
            }

            const enriched = (data || []).map((d: any) => ({
                ...d,
                branch_name: d.branches?.name_ar || d.branches?.name_en || '',
                invoice_count: countMap[d.id] || 0,
            }));

            setDrivers(enriched);
        } catch (err: any) {
            console.error('Fetch drivers error:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    // ═══ Fetch Branches ═══
    const fetchBranches = useCallback(async () => {
        if (!companyId) return;
        const { data } = await supabase
            .from('branches')
            .select('id, name_ar, name_en')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('name_ar');
        setBranches(data || []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    // Initial fetch — runs once when companyId becomes available
    useEffect(() => {
        if (!companyId) return;
        fetchDrivers();
        fetchBranches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    // ═══ Filtered Drivers ═══
    const filteredDrivers = useMemo(() => {
        let result = drivers;

        if (statusFilter !== 'all') {
            result = result.filter(d => d.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d =>
                d.name_ar?.toLowerCase().includes(q) ||
                d.name_en?.toLowerCase().includes(q) ||
                d.phone?.includes(q) ||
                d.vehicle_number?.toLowerCase().includes(q) ||
                d.id_number?.includes(q)
            );
        }

        return result;
    }, [drivers, statusFilter, searchQuery]);

    // ═══ Open Add Sheet ═══
    const handleAdd = () => {
        setEditingDriver(null);
        setForm({
            name_ar: '', name_en: '', phone: '', id_number: '',
            license_number: '', license_expiry: '', vehicle_number: '',
            vehicle_type: '', vehicle_model: '', branch_id: '',
            status: 'active', notes: '',
        });
        setSheetOpen(true);
    };

    // ═══ Open Edit Sheet ═══
    const handleEdit = (driver: Driver) => {
        setEditingDriver(driver);
        setForm({
            name_ar: driver.name_ar || '',
            name_en: driver.name_en || '',
            phone: driver.phone || '',
            id_number: driver.id_number || '',
            license_number: driver.license_number || '',
            license_expiry: driver.license_expiry || '',
            vehicle_number: driver.vehicle_number || '',
            vehicle_type: driver.vehicle_type || '',
            vehicle_model: driver.vehicle_model || '',
            branch_id: driver.branch_id || '',
            status: driver.status || 'active',
            notes: driver.notes || '',
        });
        setSheetOpen(true);
    };

    // ═══ Save Driver ═══
    const handleSave = async () => {
        if (!form.name_ar.trim()) {
            toast.error(tl('يرجى إدخال اسم السائق', 'Please enter driver name'));
            return;
        }

        setSaving(true);
        try {
            const payload = {
                tenant_id: tenantId,
                company_id: companyId,
                name_ar: form.name_ar.trim(),
                name_en: form.name_en?.trim() || null,
                phone: form.phone?.trim() || null,
                id_number: form.id_number?.trim() || null,
                license_number: form.license_number?.trim() || null,
                license_expiry: form.license_expiry || null,
                vehicle_number: form.vehicle_number?.trim() || null,
                vehicle_type: form.vehicle_type || null,
                vehicle_model: form.vehicle_model?.trim() || null,
                branch_id: form.branch_id || null,
                status: form.status,
                notes: form.notes?.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (editingDriver) {
                // Update
                const { error } = await supabase
                    .from('drivers')
                    .update(payload)
                    .eq('id', editingDriver.id);

                if (error) throw error;
                toast.success(tl('✅ تم تحديث بيانات السائق', '✅ Driver updated'));
            } else {
                // Insert
                const { error } = await supabase
                    .from('drivers')
                    .insert({
                        ...payload,
                        created_by: user?.id,
                    });

                if (error) throw error;
                toast.success(tl('✅ تم إضافة السائق', '✅ Driver added'));
            }

            setSheetOpen(false);
            fetchDrivers();
        } catch (err: any) {
            console.error('Save driver error:', err);
            toast.error(tl(`❌ خطأ: ${err.message}`, `❌ Error: ${err.message}`));
        } finally {
            setSaving(false);
        }
    };

    // ═══ Toggle Status ═══
    const handleToggleStatus = async (driver: Driver) => {
        const newStatus = driver.status === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase
                .from('drivers')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', driver.id);

            if (error) throw error;
            toast.success(tl(
                newStatus === 'active' ? '✅ تم تفعيل السائق' : '⏸️ تم تعطيل السائق',
                newStatus === 'active' ? '✅ Driver activated' : '⏸️ Driver deactivated'
            ));
            fetchDrivers();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // ═══ Stats ═══
    const stats = useMemo(() => ({
        total: drivers.length,
        active: drivers.filter(d => d.status === 'active').length,
        inactive: drivers.filter(d => d.status === 'inactive').length,
        onLeave: drivers.filter(d => d.status === 'on_leave').length,
    }), [drivers]);

    // ═══ Render ═══
    return (
        <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {tl('السائقون', 'Drivers')}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {tl(`${stats.total} سائق — ${stats.active} نشط`, `${stats.total} drivers — ${stats.active} active`)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline" size="sm"
                        onClick={fetchDrivers}
                        disabled={loading}
                        className="h-9 gap-1.5 text-xs"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        {tl('تحديث', 'Refresh')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAdd}
                        className="h-9 gap-1.5 text-xs bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {tl('إضافة سائق', 'Add Driver')}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { key: 'all', label: tl('الكل', 'All'), value: stats.total, cls: 'border-gray-200 bg-gray-50', textCls: 'text-gray-700' },
                    { key: 'active', label: tl('نشط', 'Active'), value: stats.active, cls: 'border-green-200 bg-green-50', textCls: 'text-green-700' },
                    { key: 'inactive', label: tl('غير نشط', 'Inactive'), value: stats.inactive, cls: 'border-gray-200 bg-gray-50', textCls: 'text-gray-500' },
                    { key: 'on_leave', label: tl('إجازة', 'On Leave'), value: stats.onLeave, cls: 'border-amber-200 bg-amber-50', textCls: 'text-amber-700' },
                ].map(stat => (
                    <button
                        key={stat.key}
                        onClick={() => setStatusFilter(stat.key)}
                        className={cn(
                            'flex items-center justify-between p-3 rounded-xl border transition-all',
                            stat.cls,
                            statusFilter === stat.key && 'ring-2 ring-orange-300 shadow-sm',
                        )}
                    >
                        <span className={cn('text-xs font-medium', stat.textCls)}>{stat.label}</span>
                        <span className={cn('text-lg font-bold font-mono', stat.textCls)}>{stat.value}</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute top-2.5 start-3 w-4 h-4 text-gray-400" />
                <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={tl('بحث باسم السائق، الهاتف، رقم السيارة...', 'Search by name, phone, vehicle...')}
                    className="ps-9 h-10 text-sm"
                />
            </div>

            {/* Drivers List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{tl('لا يوجد سائقون', 'No drivers found')}</p>
                    <Button size="sm" variant="outline" onClick={handleAdd} className="mt-3 gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        {tl('إضافة سائق', 'Add Driver')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredDrivers.map(driver => {
                            const statusCfg = STATUS_CONFIG[driver.status] || STATUS_CONFIG.active;
                            return (
                                <motion.div
                                    key={driver.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                                    onClick={() => handleEdit(driver)}
                                >
                                    {/* Row 1: Name + Status */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                {driver.name_ar?.charAt(0) || 'S'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                    {driver.name_ar}
                                                </h3>
                                                {driver.name_en && (
                                                    <p className="text-[11px] text-gray-400 truncate">{driver.name_en}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0', statusCfg.cls)}>
                                            {statusCfg.icon}
                                            {tl(statusCfg.ar, statusCfg.en)}
                                        </Badge>
                                    </div>

                                    {/* Row 2: Details */}
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                                        {driver.phone && (
                                            <div className="flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                <span className="font-mono" dir="ltr">{driver.phone}</span>
                                            </div>
                                        )}
                                        {driver.vehicle_number && (
                                            <div className="flex items-center gap-1">
                                                <Car className="w-3 h-3 text-gray-400" />
                                                <span className="font-mono">{driver.vehicle_number}</span>
                                            </div>
                                        )}
                                        {driver.branch_name && (
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-gray-400" />
                                                <span className="truncate">{driver.branch_name}</span>
                                            </div>
                                        )}
                                        {driver.vehicle_type && (
                                            <div className="flex items-center gap-1">
                                                <Truck className="w-3 h-3 text-gray-400" />
                                                <span>{VEHICLE_TYPES.find(v => v.id === driver.vehicle_type)?.[language === 'ar' ? 'ar' : 'en'] || driver.vehicle_type}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Row 3: Invoice count */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                            <FileText className="w-3 h-3" />
                                            <span>{tl(`${driver.invoice_count || 0} فاتورة`, `${driver.invoice_count || 0} invoices`)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(driver); }}
                                                title={driver.status === 'active' ? tl('تعطيل', 'Deactivate') : tl('تفعيل', 'Activate')}
                                            >
                                                {driver.status === 'active'
                                                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                                                    : <ToggleLeft className="w-4 h-4 text-gray-400" />
                                                }
                                            </Button>
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(driver); }}
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ═══ Add/Edit Sheet ═══ */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side={isRTL ? 'left' : 'right'}
                    className="w-full sm:max-w-lg overflow-y-auto"
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-orange-500" />
                            {editingDriver
                                ? tl('تعديل بيانات السائق', 'Edit Driver')
                                : tl('إضافة سائق جديد', 'Add New Driver')
                            }
                        </SheetTitle>
                        <SheetDescription>
                            {editingDriver
                                ? tl('تعديل بيانات السائق المحدد', 'Edit selected driver details')
                                : tl('أضف سائقاً جديداً لربطه بالفواتير', 'Add a new driver to link with invoices')
                            }
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5 mt-6">
                        {/* Basic Info */}
                        <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl p-4 border border-blue-100">
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {tl('البيانات الأساسية', 'Basic Info')}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('الاسم بالعربية *', 'Name (Arabic) *')}</Label>
                                    <Input
                                        value={form.name_ar}
                                        onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                                        placeholder={tl('اسم السائق', 'Driver name')}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('الاسم بالإنجليزية', 'Name (English)')}</Label>
                                    <Input
                                        value={form.name_en}
                                        onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                                        placeholder="Driver name"
                                        className="h-9 text-sm"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">{tl('الهاتف', 'Phone')}</Label>
                                        <Input
                                            value={form.phone}
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="+380..."
                                            className="h-9 text-sm"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">{tl('رقم الهوية', 'ID Number')}</Label>
                                        <Input
                                            value={form.id_number}
                                            onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                                            className="h-9 text-sm font-mono"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* License Info */}
                        <div className="space-y-3 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl p-4 border border-purple-100">
                            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                {tl('الرخصة', 'License')}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('رقم الرخصة', 'License #')}</Label>
                                    <Input
                                        value={form.license_number}
                                        onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                                        className="h-9 text-sm font-mono"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('تاريخ الانتهاء', 'Expiry')}</Label>
                                    <Input
                                        type="date"
                                        value={form.license_expiry}
                                        onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="space-y-3 bg-orange-50/50 dark:bg-orange-950/10 rounded-xl p-4 border border-orange-100">
                            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                                <Car className="w-4 h-4" />
                                {tl('السيارة', 'Vehicle')}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('رقم السيارة', 'Plate #')}</Label>
                                    <Input
                                        value={form.vehicle_number}
                                        onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))}
                                        className="h-9 text-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('نوع السيارة', 'Type')}</Label>
                                    <Select value={form.vehicle_type} onValueChange={v => setForm(f => ({ ...f, vehicle_type: v }))}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder={tl('اختر...', 'Select...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VEHICLE_TYPES.map(vt => (
                                                <SelectItem key={vt.id} value={vt.id}>
                                                    {tl(vt.ar, vt.en)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label className="text-xs">{tl('موديل السيارة', 'Model')}</Label>
                                    <Input
                                        value={form.vehicle_model}
                                        onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))}
                                        placeholder={tl('مثال: Toyota Hiace 2024', 'e.g. Toyota Hiace 2024')}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Branch + Status */}
                        <div className="space-y-3 bg-green-50/50 dark:bg-green-950/10 rounded-xl p-4 border border-green-100">
                            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {tl('الفرع والحالة', 'Branch & Status')}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('الفرع', 'Branch')}</Label>
                                    <Select value={form.branch_id} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder={tl('اختر الفرع...', 'Select branch...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {tl(b.name_ar || '', b.name_en || b.name_ar || '')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">{tl('الحالة', 'Status')}</Label>
                                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{tl('نشط', 'Active')}</SelectItem>
                                            <SelectItem value="inactive">{tl('غير نشط', 'Inactive')}</SelectItem>
                                            <SelectItem value="on_leave">{tl('في إجازة', 'On Leave')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <Label className="text-xs">{tl('ملاحظات', 'Notes')}</Label>
                            <Textarea
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder={tl('ملاحظات إضافية...', 'Additional notes...')}
                                className="text-sm min-h-[60px] resize-none"
                            />
                        </div>
                    </div>

                    <SheetFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
                            {tl('إلغاء', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !form.name_ar.trim()}
                            className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            <Save className="w-4 h-4" />
                            {editingDriver ? tl('حفظ التعديلات', 'Save Changes') : tl('إضافة السائق', 'Add Driver')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

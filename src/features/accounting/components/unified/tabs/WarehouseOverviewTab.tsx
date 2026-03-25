/**
 * Warehouse Overview Tab - تبويب نظرة عامة على المستودع
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    MapPin,
    Phone,
    Mail,
    Info,
    Package,
    AlertTriangle,
    Database,
    Shield,
    GitBranch,
    Users,
    UserPlus,
    Crown,
    X,
    Loader2,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '../utils/formatters';
import { branchesService, Branch } from '@/services/branchesService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Keeper Type ──────────────────────────────────────────────
interface WarehouseKeeper {
    id?: string;
    warehouse_id?: string;
    user_id: string;
    role: 'keeper' | 'manager' | 'assistant';
    is_primary: boolean;
    // Joined fields
    full_name?: string;
    email?: string;
}

interface WarehouseOverviewTabProps {
    data: any;
    mode?: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

export function WarehouseOverviewTab({ data, mode = 'view', onChange }: WarehouseOverviewTabProps) {
    const { t, language } = useLanguage();
    const { companyId } = useCompany();
    const { tenantId } = useAuth();
    const isAr = language === 'ar';
    const isEditing = mode === 'edit' || mode === 'create';

    // Load branches for selector
    const [branches, setBranches] = useState<Branch[]>([]);
    useEffect(() => {
        if (companyId) {
            branchesService.getBranches(companyId)
                .then(setBranches)
                .catch(() => setBranches([]));
        }
    }, [companyId]);

    // ═══ Warehouse Keepers State ═══
    const [keepers, setKeepers] = useState<WarehouseKeeper[]>([]);
    const [keepersLoading, setKeepersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    // ═══ Fetch existing keepers ═══
    useEffect(() => {
        if (!data?.id || mode === 'create') return;
        setKeepersLoading(true);
        supabase
            .from('warehouse_keepers')
            .select('id, warehouse_id, user_id, role, is_primary')
            .eq('warehouse_id', data.id)
            .then(async ({ data: wks }) => {
                if (!wks || wks.length === 0) {
                    setKeepers([]);
                    setKeepersLoading(false);
                    return;
                }
                // Enrich with user names
                const userIds = wks.map(k => k.user_id);
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);
                const profileMap = (profiles || []).reduce((acc: any, p: any) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
                setKeepers(wks.map(k => ({
                    ...k,
                    full_name: profileMap[k.user_id]?.full_name || '',
                    email: profileMap[k.user_id]?.email || '',
                })));
                setKeepersLoading(false);
            });
    }, [data?.id, mode]);

    // ═══ Search users for adding ═══
    const handleUserSearch = useCallback((q: string) => {
        setUserSearch(q);
        if (q.length < 2) { setUserResults([]); return; }
        const timer = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                // Try company_id first, fallback to broader search
                let query = supabase
                    .from('user_profiles')
                    .select('id, full_name, email, role')
                    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
                    .limit(10);
                if (companyId) query = query.eq('company_id', companyId);
                const { data: results } = await query;
                setUserResults(results || []);
            } catch { setUserResults([]); }
            setSearchingUsers(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [companyId]);

    // ═══ Load all company users (for "show all" button) ═══
    const [showUserPicker, setShowUserPicker] = useState(false);
    const loadAllUsers = useCallback(async () => {
        setShowUserPicker(true);
        setSearchingUsers(true);
        try {
            let query = supabase
                .from('user_profiles')
                .select('id, full_name, email, role')
                .limit(50);
            if (companyId) query = query.eq('company_id', companyId);
            const { data: results } = await query;
            setUserResults(results || []);
        } catch { setUserResults([]); }
        setSearchingUsers(false);
    }, [companyId]);

    // ═══ Add keeper ═══
    const addKeeper = async (user: any) => {
        if (keepers.find(k => k.user_id === user.id)) {
            toast.info(t('warehouse.userAlreadyAdded'));
            return;
        }
        const newKeeper: WarehouseKeeper = {
            user_id: user.id,
            role: 'keeper',
            is_primary: keepers.length === 0,
            full_name: user.full_name,
            email: user.email,
        };

        // If warehouse exists, save immediately
        if (data?.id) {
            const { error } = await supabase.from('warehouse_keepers').insert({
                warehouse_id: data.id,
                user_id: user.id,
                role: 'keeper',
                is_primary: keepers.length === 0,
                tenant_id: tenantId,
            });
            if (error) {
                toast.error(error.message);
                return;
            }
        }

        setKeepers(prev => [...prev, newKeeper]);
        setUserSearch('');
        setUserResults([]);
        toast.success(t('warehouse.keeperAdded'));
    };

    // ═══ Remove keeper ═══
    const removeKeeper = async (userId: string) => {
        if (data?.id) {
            await supabase.from('warehouse_keepers')
                .delete()
                .eq('warehouse_id', data.id)
                .eq('user_id', userId);
        }
        setKeepers(prev => prev.filter(k => k.user_id !== userId));
        toast.success(t('warehouse.keeperRemoved'));
    };

    // ═══ Toggle primary ═══
    const togglePrimary = async (userId: string) => {
        const updated = keepers.map(k => ({ ...k, is_primary: k.user_id === userId }));
        setKeepers(updated);
        if (data?.id) {
            // Reset all then set primary
            await supabase.from('warehouse_keepers')
                .update({ is_primary: false })
                .eq('warehouse_id', data.id);
            await supabase.from('warehouse_keepers')
                .update({ is_primary: true })
                .eq('warehouse_id', data.id)
                .eq('user_id', userId);
        }
    };

    // ═══ Change role ═══
    const changeRole = async (userId: string, role: string) => {
        setKeepers(prev => prev.map(k => k.user_id === userId ? { ...k, role: role as any } : k));
        if (data?.id) {
            await supabase.from('warehouse_keepers')
                .update({ role })
                .eq('warehouse_id', data.id)
                .eq('user_id', userId);
        }
    };

    if (!data && !isEditing) return null;

    const handleChange = (field: string, value: any) => {
        onChange?.({ [field]: value });
    };

    const currentBranch = branches.find(b => b.id === data?.branch_id);

    // ═══ Keeper role labels ═══
    const ROLE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
        keeper: { ar: 'أمين مستودع', en: 'Keeper', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        manager: { ar: 'مدير مستودع', en: 'Manager', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        assistant: { ar: 'مساعد', en: 'Assistant', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-gray-400" />
                            {t('warehouse.details') || 'تفاصيل المستودع'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            label={t('warehouse.code') || 'كود المستودع'}
                            value={data?.code}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('code', v)}
                            mono
                        />
                        <Field
                            label={t('warehouse.nameAr') || 'الاسم (عربي)'}
                            value={data?.name_ar}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('name_ar', v)}
                            required
                        />
                        <Field
                            label={t('warehouse.nameEn') || 'الاسم (إنجليزي)'}
                            value={data?.name_en}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('name_en', v)}
                        />

                        {isEditing ? (
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">{t('warehouse.type') || 'نوع المستودع'}</Label>
                                <Select
                                    value={data?.warehouse_type}
                                    onValueChange={(v) => handleChange('warehouse_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.selectType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="main">{t('warehouse.types.main') || 'رئيسي'}</SelectItem>
                                        <SelectItem value="branch">{t('warehouse.types.branch') || 'فرعي'}</SelectItem>
                                        <SelectItem value="store">{t('warehouse.types.store') || 'معرض'}</SelectItem>
                                        <SelectItem value="van">{t('warehouse.types.van') || 'سيارة توزيع'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <InfoRow
                                label={t('warehouse.type') || 'نوع المستودع'}
                                value={
                                    <Badge variant="outline">
                                        {t(`warehouse.types.${data?.warehouse_type}`) || data?.warehouse_type}
                                    </Badge>
                                }
                            />
                        )}

                        {/* Branch Selector */}
                        {isEditing ? (
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500 flex items-center gap-1">
                                    <GitBranch className="w-3 h-3" />
                                    {t('warehouse.branch')}
                                </Label>
                                <Select
                                    value={data?.branch_id || '_none'}
                                    onValueChange={(v) => handleChange('branch_id', v === '_none' ? null : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.selectBranch')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">{t('warehouse.noBranch')}</SelectItem>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {isAr ? b.name : (b.name_en || b.name)}
                                                {b.is_main ? ` ⭐` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <InfoRow
                                label={t('warehouse.branch')}
                                value={
                                    currentBranch ? (
                                        <Badge variant="outline" className="text-xs gap-1">
                                            <GitBranch className="w-3 h-3" />
                                            {isAr ? currentBranch.name : (currentBranch.name_en || currentBranch.name)}
                                            {currentBranch.is_main && ' ⭐'}
                                        </Badge>
                                    ) : (
                                        <span className="text-gray-400">{t('warehouse.notAssigned')}</span>
                                    )
                                }
                            />
                        )}

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2 border-t mt-2">
                                <Label className="text-sm">{t('status.active') || 'نشط'}</Label>
                                <Switch
                                    checked={data?.is_active}
                                    onCheckedChange={(v) => handleChange('is_active', v)}
                                />
                            </div>
                        ) : (
                            <InfoRow
                                label={t('status.active') || 'الحالة'}
                                value={
                                    <Badge variant={data?.is_active ? "default" : "destructive"} className="text-xs">
                                        {data?.is_active ? (t('status.active') || 'نشط') : (t('status.inactive') || 'غير نشط')}
                                    </Badge>
                                }
                            />
                        )}

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2 border-t">
                                <Label className="text-sm">{t('warehouse.isMain') || 'مستودع رئيسي لأسعار التكلفة'}</Label>
                                <Switch
                                    checked={data?.is_main}
                                    onCheckedChange={(v) => handleChange('is_main', v)}
                                />
                            </div>
                        ) : (
                            <InfoRow
                                label={t('warehouse.isMain') || 'مستودع رئيسي'}
                                value={
                                    data?.is_main
                                        ? <Badge variant="secondary">{t('common.yes') || 'نعم'}</Badge>
                                        : <span className="text-gray-500">{t('common.no') || 'لا'}</span>
                                }
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Contact & Location */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {t('warehouse.locationAndContact') || 'الموقع والاتصال'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            label={t('warehouse.city') || 'المدينة'}
                            value={data?.city}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('city', v)}
                        />
                        <Field
                            label={t('warehouse.address') || 'العنوان'}
                            value={data?.address}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('address', v)}
                        />
                        <Field
                            label={t('common.phone') || 'الهاتف'}
                            value={data?.phone}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('phone', v)}
                            icon={!isEditing && <Phone className="w-3 h-3 text-gray-400" />}
                            mono
                        />
                        <Field
                            label={t('common.email') || 'البريد الإلكتروني'}
                            value={data?.email}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('email', v)}
                            icon={!isEditing && <Mail className="w-3 h-3 text-gray-400" />}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Capacity & Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        {t('warehouse.capacityAndSettings') || 'السعة والإعدادات'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Field
                            label={t('warehouse.capacity') || 'السعة التخزينية'}
                            value={data?.capacity}
                            isEditing={isEditing}
                            onChange={(v) => handleChange('capacity', Number(v))}
                            type="number"
                            suffix={!isEditing && '📦'}
                            mono
                        />

                        {isEditing ? (
                            <div className="flex items-center justify-between py-2">
                                <Label className="text-sm">{t('warehouse.allowsNegativeStock') || 'السماح بالسحب بالسالب'}</Label>
                                <Switch
                                    checked={data?.allows_negative_stock}
                                    onCheckedChange={(v) => handleChange('allows_negative_stock', v)}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    {t('warehouse.allowsNegativeStock') || 'السماح بالسحب بالسالب'}
                                </span>
                                <Badge variant={data?.allows_negative_stock ? "destructive" : "outline"}>
                                    {data?.allows_negative_stock ? (t('common.allowed') || 'مسموح') : (t('common.forbidden') || 'ممنوع')}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══ Warehouse Keepers Section ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <CardTitle className="text-sm font-medium">
                            {t('warehouse.keepers')}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px]">{keepers.length}</Badge>
                        <div className="ms-auto">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if (showUserPicker) {
                                        setShowUserPicker(false);
                                        setUserResults([]);
                                        setUserSearch('');
                                    } else {
                                        loadAllUsers();
                                    }
                                }}
                                className="h-7 gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                {showUserPicker
                                    ? t('common.close')
                                    : t('warehouse.addKeeper')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* User Picker Panel */}
                    {showUserPicker && (
                        <div className="border border-indigo-200 rounded-lg bg-indigo-50/30 dark:bg-indigo-900/10 p-3 space-y-2">
                            {/* Search within list */}
                            <div className="relative">
                                <Input
                                    value={userSearch}
                                    onChange={e => handleUserSearch(e.target.value)}
                                    placeholder={t('warehouse.searchNameEmail')}
                                    className="h-8 text-sm pe-9 bg-white dark:bg-slate-800"
                                />
                                {searchingUsers
                                    ? <Loader2 className="w-4 h-4 absolute end-2.5 top-2 animate-spin text-indigo-500" />
                                    : <Search className="w-4 h-4 absolute end-2.5 top-2 text-gray-400" />
                                }
                            </div>
                            {/* Results */}
                            <div className="max-h-52 overflow-y-auto rounded-md border bg-white dark:bg-slate-800">
                                {userResults.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-gray-400">
                                        {searchingUsers
                                            ? t('warehouse.searching')
                                            : t('warehouse.noResults')}
                                    </div>
                                ) : (
                                    userResults.map(user => {
                                        const alreadyAdded = keepers.some(k => k.user_id === user.id);
                                        return (
                                            <button
                                                key={user.id}
                                                type="button"
                                                disabled={alreadyAdded}
                                                onClick={() => addKeeper(user)}
                                                className={cn(
                                                    'w-full text-start px-3 py-2 flex items-center gap-2 transition-colors border-b last:border-b-0',
                                                    alreadyAdded
                                                        ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                                                        : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer'
                                                )}
                                            >
                                                <UserPlus className={cn('w-3.5 h-3.5 shrink-0', alreadyAdded ? 'text-gray-300' : 'text-indigo-500')} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{user.full_name || user.email}</div>
                                                    <div className="text-[10px] text-gray-400 truncate flex items-center gap-2">
                                                        {user.email}
                                                        {user.role && <Badge variant="outline" className="text-[9px] px-1 py-0">{user.role}</Badge>}
                                                    </div>
                                                </div>
                                                {alreadyAdded && (
                                                    <Badge variant="secondary" className="text-[9px] shrink-0">
                                                        {t('warehouse.added')}
                                                    </Badge>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Keepers List */}
                    {keepersLoading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />{t('warehouse.loadingText')}
                        </div>
                    ) : keepers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            {t('warehouse.noKeepers')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keepers.map(keeper => {
                                const roleInfo = ROLE_LABELS[keeper.role] || ROLE_LABELS.keeper;
                                return (
                                    <div key={keeper.user_id}
                                        className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border"
                                    >
                                        {/* Primary indicator */}
                                        <button
                                            type="button"
                                            onClick={() => togglePrimary(keeper.user_id)}
                                            title={t('warehouse.setPrimary')}
                                            className="shrink-0"
                                        >
                                            <Crown className={cn(
                                                'w-4 h-4 transition-colors',
                                                keeper.is_primary ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-400'
                                            )} />
                                        </button>

                                        {/* User info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {keeper.full_name || keeper.email || keeper.user_id.slice(0, 8)}
                                            </div>
                                            {keeper.email && <div className="text-[10px] text-gray-400 truncate">{keeper.email}</div>}
                                        </div>

                                        {/* Primary badge */}
                                        {keeper.is_primary && (
                                            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                                                {t('warehouse.primary')}
                                            </Badge>
                                        )}

                                        {/* Role selector */}
                                        <Select value={keeper.role} onValueChange={v => changeRole(keeper.user_id, v)}>
                                            <SelectTrigger className="h-7 w-[110px] text-[10px] shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="keeper" className="text-xs">{t('warehouse.keeper')}</SelectItem>
                                                <SelectItem value="manager" className="text-xs">{t('warehouse.manager')}</SelectItem>
                                                <SelectItem value="assistant" className="text-xs">{t('warehouse.assistant')}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Remove button */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeKeeper(keeper.user_id)}
                                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* System Info */}
            {!isEditing && (
                <div className="flex items-center gap-4 text-xs text-gray-400 px-2">
                    <span>Created: {formatDate(data?.created_at)}</span>
                    {data?.updated_at && <span>Updated: {formatDate(data.updated_at)}</span>}
                </div>
            )}
        </div>
    );
}

// Helper Components

function InfoRow({ label, value, mono }: { label: string, value: React.ReactNode, mono?: boolean }) {
    return (
        <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0 min-h-[32px]">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={cn(
                "text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2",
                mono && "font-mono"
            )}>
                {value || '-'}
            </span>
        </div>
    );
}

interface FieldProps {
    label: string;
    value: any;
    isEditing: boolean;
    onChange: (val: any) => void;
    type?: string;
    mono?: boolean;
    required?: boolean;
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
}

function Field({ label, value, isEditing, onChange, type = "text", mono, required, icon, suffix }: FieldProps) {
    if (isEditing) {
        return (
            <div className="space-y-1">
                <Label className="text-xs text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    type={type}
                    className="h-8 text-sm"
                />
            </div>
        );
    }

    return (
        <InfoRow
            label={label}
            value={
                <>
                    {icon}
                    {value}
                    {suffix}
                </>
            }
            mono={mono}
        />
    );
}

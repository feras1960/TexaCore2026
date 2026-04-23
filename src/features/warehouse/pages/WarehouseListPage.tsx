/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse List Page with BaseFormSheet
 * صفحة قائمة المستودعات مع نماذج الإضافة والتعديل
 * ════════════════════════════════════════════════════════════════
 * 
 * يستخدم المكون المشترك BaseFormSheet للنماذج
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { warehouseService } from '@/services/warehouseService';
import { useWarehouses, useDefaultBranch, useBranchesWithWarehouses } from '../hooks/useWarehouseQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Search,
    Warehouse,
    MapPin,
    Package,
    MoreVertical,
    Edit,
    Trash2,
    Loader2,
    RefreshCw,
    X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
import type { UnifiedDocType, SheetMode } from '@/features/accounting/components/unified/types'; // Correct import path assumption
import { matchesSearch as normalizedSearch } from '@/lib/utils/normalizeSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NexaTable, type Column } from '@/components/shared/tables/NexaTable';
import { StatCard } from '@/components/shared/stats/StatCard';
import { WarehouseTreeView, type BranchTreeItem } from '../components/WarehouseTreeView';
import WarehouseLocationsPage from './WarehouseLocationsPage';
import { TreePine, LayoutList, ChevronsDownUp, ChevronsUpDown, Building2, CheckCircle2, MapPinned, BarChart3 } from 'lucide-react';
import { getLocalizedName } from '@/lib/utils/getLocalizedName';

// Types
interface WarehouseItem {
    [key: string]: any;  // Allow dynamic name_* access
    id: string;
    code: string;
    name_ar: string;
    name_en?: string | null;
    name_ru?: string | null;
    name_uk?: string | null;
    name_tr?: string | null;
    name_de?: string | null;
    name_it?: string | null;
    name_ro?: string | null;
    name_pl?: string | null;
    warehouse_type: 'main' | 'branch' | 'store' | 'regular' | 'offline_market' | 'van';
    city?: string | null;
    address?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    is_active: boolean;
    is_main?: boolean;
    capacity?: number;
    allows_negative_stock?: boolean;
    locations_count?: number;
    items_count?: number;
}



// Generate auto warehouse code
const generateWarehouseCode = (existingWarehouses: WarehouseItem[]) => {
    const prefix = 'WH';
    const existingCodes = existingWarehouses
        .map(wh => wh.code)
        .filter((code): code is string => typeof code === 'string' && code.startsWith(prefix))
        .map(code => parseInt(code.replace(prefix + '-', ''), 10))
        .filter(num => !isNaN(num));
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
};



export default function WarehouseListPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();
    const queryClient = useQueryClient();

    // ═══ Multi-language local translator ═══
    const WLP_LABELS: Record<string, Record<string, string>> = {
        'Total Warehouses': { ru: 'Всего складов', uk: 'Всього складів', tr: 'Toplam Depo', de: 'Lager gesamt', it: 'Magazzini totali', ro: 'Total depozite', pl: 'Łącznie magazynów' },
        'Active Warehouses': { ru: 'Активные склады', uk: 'Активні склади', tr: 'Aktif Depolar', de: 'Aktive Lager', it: 'Magazzini attivi', ro: 'Depozite active', pl: 'Aktywne magazyny' },
        'Branches': { ru: 'Филиалы', uk: 'Філіали', tr: 'Şubeler', de: 'Filialen', it: 'Filiali', ro: 'Filiale', pl: 'Oddziały' },
        'Storage Bins': { ru: 'Ячейки хранения', uk: 'Комірки зберігання', tr: 'Depo Bölmeleri', de: 'Lagerfächer', it: 'Contenitori', ro: 'Compartimente', pl: 'Pojemniki' },
        'Tree View': { ru: 'Дерево', uk: 'Дерево', tr: 'Ağaç Görünümü', de: 'Baumansicht', it: 'Vista albero', ro: 'Arbore', pl: 'Widok drzewa' },
        'Table View': { ru: 'Таблица', uk: 'Таблиця', tr: 'Tablo Görünümü', de: 'Tabellenansicht', it: 'Vista tabella', ro: 'Tabel', pl: 'Widok tabeli' },
        'Expand All': { ru: 'Развернуть все', uk: 'Розгорнути все', tr: 'Tümünü Genişlet', de: 'Alle aufklappen', it: 'Espandi tutto', ro: 'Expandare', pl: 'Rozwiń wszystko' },
        'Collapse All': { ru: 'Свернуть все', uk: 'Згорнути все', tr: 'Tümünü Daralt', de: 'Alle zuklappen', it: 'Comprimi tutto', ro: 'Restrângere', pl: 'Zwiń wszystko' },
        'Search by name or code...': { ru: 'Поиск по имени или коду...', uk: 'Пошук за назвою або кодом...', tr: 'Ad veya kod ile ara...', de: 'Nach Name oder Code suchen...', it: 'Cerca per nome o codice...', ro: 'Caută după nume sau cod...', pl: 'Szukaj po nazwie lub kodzie...' },
        'Main': { ru: 'Основной', uk: 'Основний', tr: 'Ana', de: 'Haupt', it: 'Principale', ro: 'Principal', pl: 'Główny' },
        'Branch': { ru: 'Филиал', uk: 'Філіал', tr: 'Şube', de: 'Filiale', it: 'Filiale', ro: 'Filială', pl: 'Oddział' },
        'No branch': { ru: 'Без филиала', uk: 'Без філіалу', tr: 'Şube yok', de: 'Keine Filiale', it: 'Nessuna filiale', ro: 'Fără filială', pl: 'Bez oddziału' },
        'Manage warehouses, branches and storage locations': { ru: 'Управление складами, филиалами и зонами хранения', uk: 'Управління складами, філіалами та зонами зберігання', tr: 'Depo, şube ve depolama alanlarını yönetin', de: 'Verwaltung von Lagern, Filialen und Lagerzonen', it: 'Gestione magazzini, filiali e zone di stoccaggio', ro: 'Gestionare depozite, filiale și zone de depozitare', pl: 'Zarządzanie magazynami, oddziałami i strefami' },
        'Delete Branch': { ru: 'Удалить филиал', uk: 'Видалити філіал', tr: 'Şubeyi Sil', de: 'Filiale löschen', it: 'Elimina filiale', ro: 'Șterge filiala', pl: 'Usuń oddział' },
        'Are you sure you want to delete this branch? This action cannot be undone.': { ru: 'Вы уверены, что хотите удалить этот филиал? Это действие необратимо.', uk: 'Ви впевнені, що хочете видалити цей філіал? Цю дію не можна скасувати.', tr: 'Bu şubeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', de: 'Sind Sie sicher, dass Sie diese Filiale löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.', it: 'Sei sicuro di voler eliminare questa filiale? Questa azione non può essere annullata.', ro: 'Sigur doriți să ștergeți această filială? Acțiunea nu poate fi anulată.', pl: 'Czy na pewno chcesz usunąć ten oddział? Tej operacji nie można cofnąć.' },
    };
    const lt = (ar: string, en: string): string => {
        if (language === 'ar') return ar;
        if (language === 'en') return en;
        const trans = WLP_LABELS[en];
        if (trans && trans[language]) return trans[language];
        return en;
    };

    // ⚡ React Query: cached data, instant tab switching
    const { warehouses, loading, error, refetch: refetchWarehouses, invalidate } = useWarehouses();
    const { defaultBranchId } = useDefaultBranch();

    // Local UI state
    const [searchTerm, setSearchTerm] = useState('');

    // Sheet state
    const [formOpen, setFormOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>('view');

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseItem | null>(null);

    // Branch delete state
    const [branchDeleteDialogOpen, setBranchDeleteDialogOpen] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

    // Active sub-tab
    const [activeTab, setActiveTab] = useState('warehouses');

    // Tree / Table toggle — Tree is always the default on page open
    type ListMode = 'table' | 'tree';
    const [listMode, setListMode] = useState<ListMode>('tree');
    const handleListModeChange = (m: ListMode) => {
        setListMode(m);
    };

    // Expand / Collapse counters (Counter-Trigger pattern)
    const [expandAllCount, setExpandAllCount] = useState(0);
    const [collapseAllCount, setCollapseAllCount] = useState(0);

    // Tree data
    const { branches, warehousesWithStats, loading: treeLoading, invalidate: invalidateTree } = useBranchesWithWarehouses();

    // Filter states
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Extract unique cities
    const cities = useMemo(() => {
        const unique = new Set(warehouses.map(w => w.city).filter(Boolean));
        return Array.from(unique);
    }, [warehouses]);

    // Filter warehouses
    // ── Filter: uses warehousesWithStats for unified data source
    const filteredWarehouses = useMemo(() => {
        return (warehousesWithStats as any[]).filter(wh => {
            const searchMatch = !searchTerm || normalizedSearch(
                searchTerm,
                wh.code || '',
                wh.name_ar || '',
                wh.name_en || '',
            );

            const matchesCity = cityFilter === 'all' || wh.city === cityFilter;
            const matchesType = typeFilter === 'all' || wh.warehouse_type === typeFilter;

            return searchMatch && matchesCity && matchesType;
        });
    }, [warehousesWithStats, searchTerm, cityFilter, typeFilter]);



    // Stats — use warehousesWithStats for consistency
    const totalWarehouses = (warehousesWithStats as any[]).length;
    const activeWarehouses = (warehousesWithStats as any[]).filter((w: any) => w.is_active !== false).length;
    const totalBranches = branches.length;
    const totalLocations = useMemo(() =>
        warehousesWithStats.reduce((s: number, w: any) => s + (w.locations_count || 0), 0)
        , [warehousesWithStats]);

    // Helpers
    const getWarehouseName = (wh: any) => getLocalizedName(wh, language);

    const getTypeBadge = (type: string) => {
        const badgeConfigs: Record<string, { label: string; cls: string }> = {
            main: { label: t('warehouse.types.main') || 'رئيسي', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' },
            branch: { label: t('warehouse.types.branch') || 'فرعي', cls: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400' },
            store: { label: t('warehouse.types.store') || 'متجر', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' },
            regular: { label: t('warehouse.types.regular') || 'عادي', cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400' },
            offline_market: { label: t('warehouse.types.offlineMarket') || 'سوق', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' },
            van: { label: t('warehouse.types.van') || 'شاحنة', cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' },
        };
        const cfg = badgeConfigs[type] || { label: type, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
        return (
            <span className={cn('inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border', cfg.cls)}>
                {cfg.label}
            </span>
        );
    };

    // Handlers
    const handleAdd = () => {
        setSelectedWarehouse(null);
        setSheetMode('create');
        setFormOpen(true);
    };

    const handleEdit = (wh: WarehouseItem) => {
        setSelectedWarehouse(wh);
        setSheetMode('edit');
        setFormOpen(true);
    };

    const handleRowClick = (wh: WarehouseItem) => {
        setSelectedWarehouse(wh);
        setSheetMode('view');
        setFormOpen(true);
    };

    const handleDeleteClick = (wh: WarehouseItem) => {
        setWarehouseToDelete(wh);
        setDeleteDialogOpen(true);
    };

    const handleSave = async (data: any) => {
        if (!companyId || !tenantId) throw new Error('Missing company/tenant');

        try {
            const coreData: Partial<import('@/services/warehouseService').Warehouse> & Record<string, any> = {
                code: data.code,
                name: data.name_ar,
                name_ar: data.name_ar,
                name_en: data.name_en,
                // Multi-language name fields
                name_ru: data.name_ru || null,
                name_uk: data.name_uk || null,
                name_tr: data.name_tr || null,
                name_de: data.name_de || null,
                name_it: data.name_it || null,
                name_ro: data.name_ro || null,
                name_pl: data.name_pl || null,
                warehouse_type: data.warehouse_type || 'regular',
                is_active: data.is_active,
                city: data.city,
                address: data.address,
                phone: data.phone,
                email: data.email,
                capacity: data.capacity,
                allows_negative_stock: data.allows_negative_stock,
                is_main: data.is_main,
                branch_id: data.branch_id || null,
            };

            // Remove undefined
            Object.keys(coreData).forEach(key => (coreData as any)[key] === undefined && delete (coreData as any)[key]);

            if (sheetMode === 'create') {
                await warehouseService.create({
                    tenant_id: tenantId,
                    company_id: companyId,
                    ...coreData
                } as any);
            } else if (selectedWarehouse) {
                await warehouseService.update(selectedWarehouse.id, coreData);
            }

            // ⚡ Invalidate both caches → unified data source
            invalidate();
            invalidateTree();
        } catch (error: any) {
            console.error('Save error:', error);
            throw new Error(error.message || t('errors.network.saveFailed'));
        }
    };

    const handleDelete = async () => {
        if (!warehouseToDelete) return;

        try {
            await warehouseService.delete(warehouseToDelete.id);
            setDeleteDialogOpen(false);
            setWarehouseToDelete(null);
            // ⚡ REAL-TIME SYNC — same invalidation as sheet onDelete
            invalidate();
            invalidateTree();
            queryClient.invalidateQueries({ queryKey: ['warehouse'] });
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            queryClient.removeQueries({ queryKey: ['inventory-preload-materials'] });
            queryClient.removeQueries({ queryKey: ['inventory-preload-rolls'] });
            queryClient.removeQueries({ queryKey: ['inventory-preload-filters'] });
            queryClient.invalidateQueries({ queryKey: ['fabric_materials'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        } catch (err: any) {
            console.error('Error deleting warehouse:', err);
            toast.error(err.message || 'فشل حذف المستودع', { duration: 6000 });
        }
    };

    // Branch delete handlers
    const handleBranchDelete = (branchId: string) => {
        setBranchToDelete(branchId);
        setBranchDeleteDialogOpen(true);
    };

    const handleBranchDeleteConfirm = async () => {
        if (!branchToDelete) return;
        try {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase.from('branches').delete().eq('id', branchToDelete);
            if (error) throw error;
            setBranchDeleteDialogOpen(false);
            setBranchToDelete(null);
            invalidateTree();
        } catch (err) {
            console.error('Error deleting branch:', err);
        }
    };

    // ────────────────────────────────────────────────────────
    // Table columns — matches MaterialsPage style
    // ────────────────────────────────────────────────────────
    const columns = useMemo<Column<any>[]>(() => [
        {
            title: 'warehouse.code',
            key: 'code',
            align: 'start',
            width: '110px',
            render: (_, row) => (
                <span className="font-mono font-semibold text-erp-navy dark:text-white">{row.code}</span>
            )
        },
        {
            title: 'warehouse.name',
            key: 'name_ar',
            align: 'start',
            render: (_, row) => {
                const name = getLocalizedName(row, language);
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium font-tajawal text-erp-navy dark:text-white">{name}</span>
                        {row.is_main && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                {lt('رئيسي', 'Main')}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            title: lt('الفرع', 'Branch'),
            key: 'branch_id',
            align: 'start',
            width: '170px',
            render: (_, row) => {
                const branch = (branches as any[]).find(b => b.id === row.branch_id);
                if (!branch) return <span className="text-gray-400 text-xs">{lt('بدون فرع', 'No branch')}</span>;
                const branchName = getLocalizedName(branch, language);
                return (
                    <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm text-gray-800 dark:text-gray-200 font-tajawal truncate">{branchName}</span>
                            {branch.city && (
                                <span className="text-[10px] text-gray-400 truncate">{branch.city}</span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'warehouse.type',
            key: 'warehouse_type',
            align: 'center',
            width: '115px',
            render: (_, row) => getTypeBadge(row.warehouse_type)
        },
        {
            title: lt('مواقع التخزين', 'Storage Bins'),
            key: 'locations_count',
            align: 'center',
            width: '110px',
            render: (_, row) => {
                const count = row.locations_count ?? 0;
                if (count === 0) return <span className="text-gray-400 text-sm">-</span>;
                return (
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
                        {count.toLocaleString()}
                    </span>
                );
            }
        },
        {
            title: 'common.status._',
            key: 'is_active',
            align: 'center',
            width: '95px',
            render: (_, row) => row.is_active ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {t('common.active')}
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    {t('common.inactive')}
                </span>
            )
        },
        {
            title: 'common.actions',
            key: 'id',
            align: 'end',
            width: '70px',
            render: (_, row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                        <DropdownMenuItem onClick={() => handleEdit(row as WarehouseItem)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDeleteClick(row as WarehouseItem)}
                            className="text-red-600 focus:text-red-600 gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ], [t, language, isRTL, branches]);


    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.warehouses') || (isRTL ? 'إدارة المستودعات' : 'Warehouses')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
                        {lt('إدارة المستودعات والفروع والمواقع', 'Manage warehouses, branches and storage locations')}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => { refetchWarehouses(); }} disabled={loading}>
                        <RefreshCw className={cn('w-4 h-4 me-2', loading && 'animate-spin')} />
                        {t('common.refresh')}
                    </Button>
                    <Button onClick={handleAdd} className="gap-2 bg-erp-primary hover:bg-erp-primary/90">
                        <Plus className="h-4 w-4 me-2" />
                        {t('warehouse.add')}
                    </Button>
                </div>
            </div>

            {/* ── Stats — same as MaterialsPage ────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label={lt('إجمالي المستودعات', 'Total Warehouses')}
                    value={totalWarehouses}
                    icon={Warehouse}
                />
                <StatCard
                    label={lt('المستودعات النشطة', 'Active Warehouses')}
                    value={activeWarehouses}
                    icon={CheckCircle2}
                />
                <StatCard
                    label={lt('الفروع', 'Branches')}
                    value={totalBranches}
                    icon={Building2}
                />
                <StatCard
                    label={lt('مواقع التخزين', 'Storage Bins')}
                    value={totalLocations}
                    icon={MapPinned}
                />
            </div>

            {/* ── Tabs: Warehouses / Locations ────────────────── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="mb-4">
                    <TabsList className="h-auto p-1 bg-muted/50">
                        <TabsTrigger value="warehouses" className="gap-2 px-4 py-2">
                            <Warehouse className="h-4 w-4" />
                            {t('warehouse.tabs.warehouses')}
                        </TabsTrigger>
                        <TabsTrigger value="locations" className="gap-2 px-4 py-2">
                            <MapPin className="h-4 w-4" />
                            {t('warehouse.tabs.locations')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Warehouses Tab ───────────────────────────── */}
                <TabsContent value="warehouses" className="mt-0">

                    {/*
                     * Filter bar: dir set explicitly here because TabsContent may not inherit
                     * RTL order: [عرض الشجرة][عرض الجدول][فتح الكل][إغلاق الكل] ··· [مدينة][نوع] ··· [بحث]
                     */}
                    <div className="flex items-center gap-2 flex-wrap mb-4" dir={isRTL ? 'rtl' : 'ltr'}>

                        {/* 1. Tree/Table toggle — FIRST → rightmost in RTL */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <Button
                                variant={listMode === 'tree' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleListModeChange('tree')}
                                className={cn('h-8 px-3', listMode === 'tree' ? 'bg-erp-navy text-white' : 'text-gray-600 dark:text-gray-400')}
                            >
                                <TreePine className="w-4 h-4 me-2" />
                                {lt('عرض الشجرة', 'Tree View')}
                            </Button>
                            <Button
                                variant={listMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleListModeChange('table')}
                                className={cn('h-8 px-3', listMode === 'table' ? 'bg-erp-navy text-white' : 'text-gray-600 dark:text-gray-400')}
                            >
                                <LayoutList className="w-4 h-4 me-2" />
                                {lt('عرض الجدول', 'Table View')}
                            </Button>
                        </div>

                        {/* 2. Expand/Collapse — tree only */}
                        {listMode === 'tree' && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setExpandAllCount(c => c + 1)} className="h-8">
                                    <ChevronsDownUp className="w-4 h-4 me-2" />
                                    {lt('فتح الكل', 'Expand All')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setCollapseAllCount(c => c + 1)} className="h-8">
                                    <ChevronsUpDown className="w-4 h-4 me-2" />
                                    {lt('إغلاق الكل', 'Collapse All')}
                                </Button>
                            </>
                        )}

                        {/* 3. City filter */}
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger className="w-[130px] bg-background">
                                <SelectValue placeholder={t('warehouse.city') || 'المدينة'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all') || 'الكل'}</SelectItem>
                                {cities.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Type filter */}
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[130px] bg-background">
                                <SelectValue placeholder={t('warehouse.type') || 'النوع'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                <SelectItem value="regular">{t('warehouse.types.regular') || 'عادي'}</SelectItem>
                                <SelectItem value="main">{t('warehouse.types.main') || 'رئيسي'}</SelectItem>
                                <SelectItem value="branch">{t('warehouse.types.branch') || 'فرعي'}</SelectItem>
                                <SelectItem value="store">{t('warehouse.types.store') || 'متجر'}</SelectItem>
                                <SelectItem value="offline_market">{t('warehouse.types.offlineMarket') || 'سوق'}</SelectItem>
                                <SelectItem value="van">{t('warehouse.types.van') || 'شاحنة'}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* 5. Search — LAST + flex-1 → leftmost in RTL */}
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <Input
                                placeholder={lt('بحث بالاسم أو الكود...', 'Search by name or code...')}
                                className="ps-9 bg-gray-50 dark:bg-gray-800 border-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ── Tree View ────────────────────────────── */}
                    {listMode === 'tree' ? (
                        <WarehouseTreeView
                            warehouses={warehousesWithStats}
                            branches={branches as BranchTreeItem[]}
                            loading={treeLoading}
                            onWarehouseEdit={handleEdit}
                            onWarehouseClick={handleRowClick}
                            onWarehouseAdd={(branchId) => {
                                setSelectedWarehouse({ branch_id: branchId } as any);
                                setSheetMode('create');
                                setFormOpen(true);
                            }}
                            onBranchDelete={handleBranchDelete}
                            expandAllCount={expandAllCount}
                            collapseAllCount={collapseAllCount}
                            className="h-[calc(100vh-240px)]"
                        />
                    ) : (
                        /* ── Table View ─────────────────────────── */
                        <NexaTable
                            data={filteredWarehouses}
                            columns={columns}
                            loading={loading}
                            onRowClick={handleRowClick}
                            showRowNumbers
                            rowKey="id"
                            emptyMessage={t('warehouse.noWarehouses')}
                        />
                    )}
                </TabsContent>

                {/* ── Locations Tab ────────────────────────────── */}
                <TabsContent value="locations" className="mt-0">
                    <WarehouseLocationsPage />
                </TabsContent>
            </Tabs>

            {/* ── Warehouse Form Sheet ─────────────────────────── */}
            <UnifiedAccountingSheet
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                docType="warehouse"
                mode={sheetMode}
                data={sheetMode === 'create' ? {
                    code: generateWarehouseCode(warehouses),
                    warehouse_type: 'regular',
                    is_active: true,
                    ...(selectedWarehouse || {}),  // includes branch_id when adding from tree
                } : (selectedWarehouse || {
                    code: generateWarehouseCode(warehouses),
                    warehouse_type: 'regular',
                    is_active: true
                })}
                onSave={handleSave}
                onDelete={async () => {
                    if (!selectedWarehouse?.id) return;
                    try {
                        await warehouseService.delete(selectedWarehouse.id);
                        setFormOpen(false);
                        setSelectedWarehouse(null);
                        // ⚡ REAL-TIME SYNC — Invalidate ALL related caches immediately
                        invalidate();
                        invalidateTree();
                        // Warehouse queries (all sub-keys)
                        queryClient.invalidateQueries({ queryKey: ['warehouse'] });
                        queryClient.invalidateQueries({ queryKey: ['warehouses'] });
                        // DataEngine preload caches — used by InventoryPage & MaterialSearch
                        queryClient.removeQueries({ queryKey: ['inventory-preload-materials'] });
                        queryClient.removeQueries({ queryKey: ['inventory-preload-rolls'] });
                        queryClient.removeQueries({ queryKey: ['inventory-preload-filters'] });
                        // Material & inventory queries
                        queryClient.invalidateQueries({ queryKey: ['fabric_materials'] });
                        queryClient.invalidateQueries({ queryKey: ['inventory'] });
                        queryClient.invalidateQueries({ queryKey: ['chart_of_accounts'] });
                    } catch (err: any) {
                        throw err; // Let the sheet display the error toast
                    }
                }}
                onModeChange={setSheetMode}
            />

            {/* ── Delete Confirmation ──────────────────────────── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('warehouse.deleteWarehouse')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('warehouse.deleteWarehouseConfirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Branch Delete Confirmation ───────────────────── */}
            <AlertDialog open={branchDeleteDialogOpen} onOpenChange={setBranchDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {lt('حذف الفرع', 'Delete Branch')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {lt(
                                'هل أنت متأكد من حذف هذا الفرع؟ لا يمكن التراجع عن هذا الإجراء.',
                                'Are you sure you want to delete this branch? This action cannot be undone.'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBranchDeleteConfirm}
                            className="bg-destructive text-destructive-foreground"
                        >
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

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
import { warehouseService } from '@/services/warehouseService';
import { useWarehouses, useDefaultBranch } from '../hooks/useWarehouseQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NexaTable, type Column } from '@/components/shared/tables/NexaTable';

// Types
interface WarehouseItem {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string | null;
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
        .filter(code => code.startsWith(prefix))
        .map(code => parseInt(code.replace(prefix + '-', ''), 10))
        .filter(num => !isNaN(num));
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
};



export default function WarehouseListPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId, tenantId } = useAuth();

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

    // Active sub-tab
    const [activeTab, setActiveTab] = useState('warehouses');

    // Filter states
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Extract unique cities
    const cities = useMemo(() => {
        const unique = new Set(warehouses.map(w => w.city).filter(Boolean));
        return Array.from(unique);
    }, [warehouses]);

    // Filter warehouses
    const filteredWarehouses = useMemo(() => {
        return warehouses.filter(wh => {
            const matchesSearch =
                wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wh.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (wh.name_en && wh.name_en.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCity = cityFilter === 'all' || wh.city === cityFilter;
            const matchesType = typeFilter === 'all' || wh.warehouse_type === typeFilter;

            // Note: Company filter is implicit as we only load current company data

            return matchesSearch && matchesCity && matchesType;
        });
    }, [warehouses, searchTerm, cityFilter, typeFilter]);



    // Helpers
    const getWarehouseName = (wh: WarehouseItem) => {
        return language === 'ar' ? wh.name_ar : (wh.name_en || wh.name_ar);
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'main': return <Badge variant="default">{t('warehouse.types.main')}</Badge>;
            case 'branch': return <Badge variant="secondary">{t('warehouse.types.branch')}</Badge>;
            case 'store': return <Badge variant="outline">{t('warehouse.types.store')}</Badge>;
            case 'regular': return <Badge variant="default">{t('warehouse.types.regular') || 'مستودع عادي'}</Badge>;
            case 'offline_market': return <Badge variant="secondary">{t('warehouse.types.offlineMarket') || 'سوق غير متصل'}</Badge>;
            case 'van': return <Badge variant="outline">{t('warehouse.types.van') || 'شاحنة'}</Badge>;
            default: return <Badge variant="outline">{type}</Badge>;
        }
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
            const coreData: Partial<import('@/services/warehouseService').Warehouse> = {
                code: data.code,
                name: data.name_ar,
                name_ar: data.name_ar,
                name_en: data.name_en,
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

            // ⚡ Invalidate cache → triggers background refetch
            invalidate();
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
            // ⚡ Invalidate cache → triggers background refetch
            invalidate();
        } catch (err) {
            console.error('Error deleting warehouse:', err);
        }
    };

    // Columns definition
    const columns = useMemo<Column<WarehouseItem>[]>(() => [
        {
            title: 'warehouse.code',
            key: 'code',
            align: 'start',
            width: '100px',
            render: (_, row) => <span className="font-mono text-sm">{row.code}</span>
        },
        {
            title: 'warehouse.name',
            key: 'name_ar', // Virtual
            align: 'start',
            render: (_, row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-erp-navy dark:text-erp-blue">{getWarehouseName(row)}</span>
                    {row.is_main && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {t('warehouse.types.main')}
                        </span>
                    )}
                </div>
            )
        },
        {
            title: 'warehouse.type',
            key: 'warehouse_type',
            align: 'center',
            width: '130px',
            render: (_, row) => getTypeBadge(row.warehouse_type)
        },
        {
            title: 'warehouse.city',
            key: 'city',
            align: 'center',
            width: '120px',
            render: (_, row) => row.city || '-'
        },
        {
            title: 'warehouse.capacity',
            key: 'capacity',
            align: 'center',
            width: '100px',
            render: (_, row) => row.capacity ? row.capacity.toLocaleString() : '-'
        },
        {
            title: 'common.status._',
            key: 'is_active',
            align: 'center',
            width: '100px',
            render: (_, row) => (
                <Badge variant={row.is_active ? "outline" : "destructive"} className="text-xs">
                    {row.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
            )
        },
        {
            title: 'common.actions',
            key: 'id',
            align: 'end',
            width: '80px',
            render: (_, row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row)} className="gap-2">
                            <Edit className="h-4 w-4" />
                            {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDeleteClick(row)}
                            className="text-red-600 focus:text-red-600 gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ], [t, language]);


    return (
        <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Sub-tabs: Warehouses / Locations */}
            {/* Sub-tabs: Warehouses / Locations */}
            {/* Header & Tabs */}
            <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <TabsList className="justify-start w-full sm:w-auto h-auto p-1 bg-muted/50">
                                <TabsTrigger value="warehouses" className="gap-2 px-4 py-2">
                                    <Warehouse className="h-4 w-4" />
                                    {t('warehouse.tabs.warehouses')}
                                </TabsTrigger>
                                <TabsTrigger value="locations" className="gap-2 px-4 py-2">
                                    <MapPin className="h-4 w-4" />
                                    {t('warehouse.tabs.locations')}
                                </TabsTrigger>
                            </TabsList>

                            {/* Add Action (Right/Left aligned opposite to tabs) */}
                            {activeTab === 'warehouses' && (
                                <Button onClick={handleAdd} className="gap-2 bg-erp-primary hover:bg-erp-primary/90">
                                    <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                                    {t('warehouse.add')}
                                </Button>
                            )}
                        </div>

                        {/* Warehouses Tab Content */}
                        <TabsContent value="warehouses" className="mt-0">
                            <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                                {/* Filters Bar */}
                                <div className="p-4 border-b space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">

                                    {/* Search */}
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('warehouse.searchPlaceholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="ps-9 text-start bg-background"
                                        />
                                    </div>

                                    {/* Dropdown Filters */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* City Filter */}
                                        <Select value={cityFilter} onValueChange={setCityFilter}>
                                            <SelectTrigger className="w-[140px] bg-background">
                                                <SelectValue placeholder={t('warehouse.city') || "المدينة"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('common.all') || "الكل"}</SelectItem>
                                                {cities.map(city => (
                                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Type Filter */}
                                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                                            <SelectTrigger className="w-[140px] bg-background">
                                                <SelectValue placeholder={t('warehouse.type') || "النوع"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('common.all')}</SelectItem>
                                                <SelectItem value="regular">{t('warehouse.types.regular') || 'مستودع عادي'}</SelectItem>
                                                <SelectItem value="offline_market">{t('warehouse.types.offlineMarket') || 'سوق غير متصل'}</SelectItem>
                                                <SelectItem value="van">{t('warehouse.types.van') || 'شاحنة'}</SelectItem>
                                                <SelectItem value="main">{t('warehouse.types.main')}</SelectItem>
                                                <SelectItem value="branch">{t('warehouse.types.branch')}</SelectItem>
                                                <SelectItem value="store">{t('warehouse.types.store')}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Refresh Button */}
                                        <Button variant="outline" size="icon" onClick={() => refetchWarehouses()} disabled={loading} title={t('common.refresh')}>
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="p-0">
                                    <NexaTable
                                        data={filteredWarehouses}
                                        columns={columns}
                                        loading={loading}
                                        onRowClick={handleRowClick}
                                        bordered
                                        striped
                                        emptyMessage={t('warehouse.noWarehouses')}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Locations Tab Content */}
                        <TabsContent value="locations" className="mt-4">
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white dark:bg-gray-800 rounded-lg border border-dashed">
                                <MapPin className="h-12 w-12 mb-4 opacity-20" />
                                <p>{t('common.comingSoon') || 'قريباً...'}</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Add/Edit Warehouse Form */}
            {/* Unified Warehouse Sheet */}
            <UnifiedAccountingSheet
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                docType="warehouse"
                mode={sheetMode}
                data={selectedWarehouse || {
                    code: generateWarehouseCode(warehouses),
                    warehouse_type: 'regular',
                    is_active: true
                }}

                onSave={handleSave}
                onModeChange={setSheetMode}
            />

            {/* Delete Confirmation Dialog */}
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
        </div>
    );
}

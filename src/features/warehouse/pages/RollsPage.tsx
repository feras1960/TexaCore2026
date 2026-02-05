/**
 * ════════════════════════════════════════════════════════════════
 * 🎭 Rolls Page - Real Data Version
 * صفحة الرولونات - بيانات حقيقية
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ يستخدم بيانات حقيقية من warehouseService:
 * - getRolls() - قائمة الرولونات
 * - Real-time search and filtering
 * - Empty state when no data
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Boxes,
    Plus,
    Search,
    RefreshCw,
    Filter,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Download,
    QrCode,
    Ruler,
    Warehouse
} from 'lucide-react';

// Types for rolls
interface Roll {
    id: string;
    roll_number: string;
    barcode?: string;
    original_length: number;
    current_length: number;
    width?: number;
    weight?: number;
    color?: string;
    dye_lot?: string;
    status: string;
    warehouse_id: string;
    warehouse?: {
        id: string;
        name_ar: string;
        name_en?: string;
    };
    material?: {
        id: string;
        name_ar: string;
        name_en?: string;
    };
    location?: {
        id: string;
        code: string;
        name?: string;
    };
    created_at: string;
}

export default function RollsPage() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // State
    const [rolls, setRolls] = useState<Roll[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null);

    // Load rolls
    const loadRolls = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await warehouseService.getRolls(companyId, {
                warehouseId: warehouseFilter || undefined,
            });
            setRolls(data);
        } catch (err: any) {
            console.error('Error loading rolls:', err);
            setError(t('common.loadFailed') || 'Failed to load rolls');
        } finally {
            setLoading(false);
        }
    }, [companyId, warehouseFilter, t]);

    useEffect(() => {
        loadRolls();
    }, [loadRolls]);

    // Filter rolls by search
    const filteredRolls = rolls.filter(roll => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            roll.roll_number.toLowerCase().includes(search) ||
            roll.barcode?.toLowerCase().includes(search) ||
            roll.color?.toLowerCase().includes(search) ||
            roll.dye_lot?.toLowerCase().includes(search)
        );
    });

    // Status color helper
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-50 text-green-600 border-green-200';
            case 'reserved': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'sold': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'damaged': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        if (language === 'ar') {
            switch (status) {
                case 'available': return 'متاح';
                case 'reserved': return 'محجوز';
                case 'sold': return 'مباع';
                case 'damaged': return 'تالف';
                default: return status;
            }
        }
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.rolls') || (language === 'ar' ? 'إدارة الرولونات' : 'Rolls Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'تتبع وإدارة رولونات القماش في المستودعات' : 'Track and manage fabric rolls in warehouses'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={loadRolls}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <QrCode className="w-4 h-4" />
                        <span className="hidden md:inline">{language === 'ar' ? 'مسح' : 'Scan'}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">{language === 'ar' ? 'تصدير' : 'Export'}</span>
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
                        <Plus className="w-5 h-5" />
                        {language === 'ar' ? 'رولون جديد' : 'New Roll'}
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث برقم الرولون أو الباركود...' : 'Search by roll number or barcode...'}
                        className="ps-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="w-4 h-4" />
                            {language === 'ar' ? 'تصفية' : 'Filter'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setWarehouseFilter(null)}>
                            {language === 'ar' ? 'كل المستودعات' : 'All Warehouses'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={loadRolls}>
                        {t('common.retry') || (language === 'ar' ? 'إعادة المحاولة' : 'Retry')}
                    </Button>
                </div>
            )}

            {/* Rolls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    // Loading skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="border-gray-100 dark:border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="w-8 h-8 rounded" />
                                </div>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : filteredRolls.length === 0 ? (
                    // Empty state
                    <div className="col-span-full">
                        <Card className="border-dashed border-2 border-gray-200 dark:border-slate-700">
                            <CardContent className="py-16 text-center">
                                <Boxes className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-lg font-cairo font-bold text-gray-600 dark:text-gray-300 mb-2">
                                    {language === 'ar' ? 'لا توجد رولونات' : 'No Rolls'}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {language === 'ar'
                                        ? 'لم يتم إضافة أي رولونات بعد. ابدأ بإضافة أول رولون.'
                                        : 'No rolls added yet. Start by adding your first roll.'}
                                </p>
                                <Button className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                                    <Plus className="w-4 h-4" />
                                    {language === 'ar' ? 'إضافة رولون' : 'Add Roll'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    // Rolls list
                    filteredRolls.map((roll) => (
                        <Card
                            key={roll.id}
                            className="border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all cursor-pointer"
                        >
                            <CardContent className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-mono font-bold text-erp-navy dark:text-white">{roll.roll_number}</p>
                                        {roll.barcode && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <QrCode className="w-3 h-3" />
                                                {roll.barcode}
                                            </p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="gap-2">
                                                <Eye className="w-4 h-4" />
                                                {language === 'ar' ? 'عرض' : 'View'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2">
                                                <Edit className="w-4 h-4" />
                                                {language === 'ar' ? 'تعديل' : 'Edit'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                                {language === 'ar' ? 'حذف' : 'Delete'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Material Name */}
                                {roll.material && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                        {language === 'ar' ? roll.material.name_ar : (roll.material.name_en || roll.material.name_ar)}
                                    </p>
                                )}

                                {/* Length Info */}
                                <div className="flex items-center gap-2 text-sm mb-3">
                                    <Ruler className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-mono">
                                        {roll.current_length}m / {roll.original_length}m
                                    </span>
                                    {roll.color && (
                                        <span className="text-muted-foreground">• {roll.color}</span>
                                    )}
                                </div>

                                {/* Status and Location */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={`text-xs ${getStatusColor(roll.status)}`}>
                                        {getStatusLabel(roll.status)}
                                    </Badge>
                                    {roll.warehouse && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                            <Warehouse className="w-3 h-3 me-1" />
                                            {language === 'ar' ? roll.warehouse.name_ar : (roll.warehouse.name_en || roll.warehouse.name_ar)}
                                        </Badge>
                                    )}
                                    {roll.location && (
                                        <Badge variant="outline" className="text-xs">
                                            {roll.location.code}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Summary */}
            {!loading && filteredRolls.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                    {language === 'ar'
                        ? `عرض ${filteredRolls.length} رولون${searchQuery ? ` من ${rolls.length}` : ''}`
                        : `Showing ${filteredRolls.length} rolls${searchQuery ? ` of ${rolls.length}` : ''}`}
                </div>
            )}
        </div>
    );
}

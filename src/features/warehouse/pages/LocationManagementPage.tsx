/**
 * ════════════════════════════════════════════════════════════════
 * 📍 Location Management Page - Real Data
 * صفحة إدارة المواقع - Aisle/Rack/Shelf/Bin
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ إدارة المواقع داخل المستودعات
 * - Hierarchical location structure
 * - Aisle > Rack > Shelf > Bin
 * - Visual tree view
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    MapPin,
    Plus,
    Search,
    RefreshCw,
    MoreHorizontal,
    ChevronRight,
    ChevronDown,
    Warehouse as WarehouseIcon,
    Layers,
    Grid3X3,
    Box,
    Package,
    Edit,
    Trash2,
    FolderTree
} from 'lucide-react';

// Types for locations
interface LocationNode {
    id: string;
    code: string;
    name?: string;
    type: 'aisle' | 'rack' | 'shelf' | 'bin';
    parent_id?: string;
    warehouse_id: string;
    is_active: boolean;
    children?: LocationNode[];
    expanded?: boolean;
}

interface Warehouse {
    id: string;
    name_ar: string;
    name_en?: string;
}

export default function LocationManagementPage() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // State
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
    const [locations, setLocations] = useState<LocationNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Load warehouses
    useEffect(() => {
        const loadWarehouses = async () => {
            if (!companyId) return;
            try {
                const data = await warehouseService.getAll(companyId);
                setWarehouses(data);
                if (data.length > 0 && !selectedWarehouse) {
                    setSelectedWarehouse(data[0].id);
                }
            } catch (err) {
                console.error('Error loading warehouses:', err);
            }
        };
        loadWarehouses();
    }, [companyId, selectedWarehouse]);

    // Load locations for selected warehouse
    const loadLocations = useCallback(async () => {
        if (!companyId || !selectedWarehouse) return;

        setLoading(true);
        setError(null);

        try {
            const data = await warehouseService.getLocations(selectedWarehouse);
            // Build tree structure
            const locationMap = new Map<string, LocationNode>();
            const rootLocations: LocationNode[] = [];

            data.forEach((loc: any) => {
                locationMap.set(loc.id, { ...loc, children: [] });
            });

            data.forEach((loc: any) => {
                const node = locationMap.get(loc.id)!;
                if (loc.parent_id && locationMap.has(loc.parent_id)) {
                    locationMap.get(loc.parent_id)!.children!.push(node);
                } else {
                    rootLocations.push(node);
                }
            });

            setLocations(rootLocations);
        } catch (err: any) {
            console.error('Error loading locations:', err);
            setError(t('common.loadFailed') || 'Failed to load locations');
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedWarehouse, t]);

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    // Toggle node expansion
    const toggleExpand = (nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // Get icon for location type
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'aisle': return <Layers className="w-4 h-4" />;
            case 'rack': return <Grid3X3 className="w-4 h-4" />;
            case 'shelf': return <Box className="w-4 h-4" />;
            case 'bin': return <Package className="w-4 h-4" />;
            default: return <MapPin className="w-4 h-4" />;
        }
    };

    // Get label for location type
    const getTypeLabel = (type: string) => {
        if (language === 'ar') {
            switch (type) {
                case 'aisle': return 'ممر';
                case 'rack': return 'رف';
                case 'shelf': return 'طبقة';
                case 'bin': return 'صندوق';
                default: return type;
            }
        }
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    // Get color for location type
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'aisle': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'rack': return 'bg-green-50 text-green-600 border-green-200';
            case 'shelf': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'bin': return 'bg-purple-50 text-purple-600 border-purple-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    // Render location tree node
    const renderLocationNode = (node: LocationNode, depth: number = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={node.id}>
                <div
                    className={`flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors`}
                    style={{ paddingInlineStart: `${depth * 24 + 12}px` }}
                    onClick={() => hasChildren && toggleExpand(node.id)}
                >
                    {/* Expand button */}
                    <div className="w-5 h-5 flex items-center justify-center">
                        {hasChildren ? (
                            isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : <div className="w-4" />}
                    </div>

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${getTypeColor(node.type)}`}>
                        {getTypeIcon(node.type)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{node.code}</span>
                            {node.name && (
                                <span className="text-sm text-muted-foreground truncate">- {node.name}</span>
                            )}
                        </div>
                    </div>

                    {/* Type badge */}
                    <Badge variant="outline" className={`text-xs ${getTypeColor(node.type)}`}>
                        {getTypeLabel(node.type)}
                    </Badge>

                    {/* Status */}
                    {!node.is_active && (
                        <Badge variant="secondary" className="text-xs">
                            {language === 'ar' ? 'غير نشط' : 'Inactive'}
                        </Badge>
                    )}

                    {/* Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? 'إضافة فرعي' : 'Add Child'}
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

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                        {node.children!.map(child => renderLocationNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {language === 'ar' ? 'إدارة المواقع' : 'Location Management'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'تنظيم المواقع داخل المستودعات (ممر / رف / طبقة / صندوق)' : 'Organize locations within warehouses (Aisle/Rack/Shelf/Bin)'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={loadLocations}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
                        <Plus className="w-5 h-5" />
                        {language === 'ar' ? 'موقع جديد' : 'New Location'}
                    </Button>
                </div>
            </div>

            {/* Warehouse Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Select
                    value={selectedWarehouse || ''}
                    onValueChange={setSelectedWarehouse}
                >
                    <SelectTrigger className="w-full sm:w-64">
                        <WarehouseIcon className="w-4 h-4 me-2" />
                        <SelectValue placeholder={language === 'ar' ? 'اختر المستودع' : 'Select Warehouse'} />
                    </SelectTrigger>
                    <SelectContent>
                        {warehouses.map(wh => (
                            <SelectItem key={wh.id} value={wh.id}>
                                {language === 'ar' ? wh.name_ar : (wh.name_en || wh.name_ar)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                        className="ps-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={loadLocations}>
                        {t('common.retry') || (language === 'ar' ? 'إعادة المحاولة' : 'Retry')}
                    </Button>
                </div>
            )}

            {/* Locations Tree */}
            <Card className="bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-cairo flex items-center gap-2">
                        <FolderTree className="w-4 h-4" />
                        {language === 'ar' ? 'هيكل المواقع' : 'Location Structure'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : !selectedWarehouse ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <WarehouseIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>{language === 'ar' ? 'اختر مستودعاً لعرض المواقع' : 'Select a warehouse to view locations'}</p>
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-12">
                            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-cairo font-bold text-gray-600 dark:text-gray-300 mb-2">
                                {language === 'ar' ? 'لا توجد مواقع' : 'No Locations'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {language === 'ar'
                                    ? 'لم يتم إضافة أي مواقع في هذا المستودع بعد.'
                                    : 'No locations have been added to this warehouse yet.'}
                            </p>
                            <Button className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? 'إضافة ممر' : 'Add Aisle'}
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {locations.map(node => renderLocationNode(node))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Help */}
            <Card className="bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/20 border-blue-100 dark:border-blue-900">
                <CardContent className="py-4">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getTypeColor('aisle')}>{getTypeLabel('aisle')}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getTypeColor('rack')}>{getTypeLabel('rack')}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getTypeColor('shelf')}>{getTypeLabel('shelf')}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className={getTypeColor('bin')}>{getTypeLabel('bin')}</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

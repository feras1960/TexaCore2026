/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Materials Page - Following Chart of Accounts Pattern
 * صفحة المواد - بنفس نمط شجرة الحسابات
 * ════════════════════════════════════════════════════════════════
 */

import { MaterialTree } from '../components/MaterialTree';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NexaTable, type Column, StatusBadge } from '@/components/shared';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified';
import type { SheetMode } from '@/features/accounting/components/unified/types';
import { StatCard } from '@/components/shared/stats/StatCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    Package,
    Plus,
    Search,
    RefreshCw,
    TreePine,
    LayoutList,
    Settings,
    Edit,
    Trash2,
    Eye,
    Layers,
    FolderPlus,
    Folder,
    FileText,
    BarChart3,
    CheckCircle2,
    Database,
    Filter,
    X,
    Download,
    ChevronsDownUp,
    ChevronsUpDown,
    Printer
} from 'lucide-react';

// Types
interface Material {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    description?: string;
    unit_id?: string;
    category_id?: string;
    category?: {
        id: string;
        name_ar: string;
        name_en?: string;
    };
    is_active: boolean;
    is_group?: boolean;
    parent_id?: string;
    created_at: string;
}

interface MaterialTreeNode extends Material {
    children?: MaterialTreeNode[];
}

type ViewMode = 'tree' | 'table';

export default function MaterialsPage() {
    const { t, language, direction, isRTL } = useLanguage();
    const { companyId, user } = useAuth();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
    const [collapseAll, setCollapseAll] = useState<boolean | undefined>(undefined);

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>('view');
    const [selectedParent, setSelectedParent] = useState<Material | null>(null);
    const [isGroupMode, setIsGroupMode] = useState(false);

    // Group Sheet state
    const [groupSheetOpen, setGroupSheetOpen] = useState(false);
    const [groupSheetMode, setGroupSheetMode] = useState<SheetMode>('create');
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    // Load materials
    const loadMaterials = async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const data = await warehouseService.getMaterials(companyId, {
                search: searchQuery || undefined,
                categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
            });
            const enhancedData = data.map((m: any) => ({
                ...m,
                parent_id: m.parent_id || m.group_id // Ensure hierarchy works if using groups as parents
            }));
            setMaterials(enhancedData);
        } catch (err) {
            console.error('Error loading materials:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load groups
    const loadGroups = async () => {
        if (!companyId) return;
        try {
            const tenantId = user?.user_metadata?.tenant_id;
            const data = await warehouseService.getGroups(companyId, tenantId);
            setGroups(data);
        } catch (err) {
            console.error('Error loading groups:', err);
        }
    };

    useEffect(() => {
        loadMaterials();
        loadGroups();
    }, [companyId, searchQuery, categoryFilter]);

    // Handlers
    const handleAddClick = () => {
        setSheetOpen(false); // Close first to reset
        setTimeout(() => {
            setSelectedParent(null);
            setSelectedMaterial(null);
            setIsGroupMode(false);
            setSheetMode('create');
            setSheetOpen(true);
        }, 0);
    };

    const handleAddGroup = () => {
        setGroupSheetOpen(false);
        setTimeout(() => {
            setSelectedGroup(null);
            setGroupSheetMode('create');
            setGroupSheetOpen(true);
        }, 0);
    };

    const handleAddChild = (parent: Material) => {
        setSheetOpen(false);
        setTimeout(() => {
            setSelectedParent(parent);
            setSelectedMaterial(null);
            setIsGroupMode(false);
            setSheetMode('create');
            setSheetOpen(true);
        }, 0);
    };

    const handleEdit = (material: Material) => {
        setSheetOpen(false);
        setTimeout(() => {
            setSelectedMaterial(material);
            setSheetMode('edit');
            setSheetOpen(true);
        }, 0);
    };

    const handleRowClick = (material: any) => {
        if (material.is_group) {
            setSelectedGroup(material);
            setGroupSheetMode('edit');
            setGroupSheetOpen(true);
            return;
        }

        setSelectedMaterial(material);
        setSheetMode('view');
        setSheetOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (!companyId) {
                console.error('No company ID');
                return;
            }

            // === Handle GROUP creation ===
            if (data.is_group || isGroupMode) {
                const groupData = {
                    tenant_id: user?.user_metadata?.tenant_id,
                    code: data.code || `GRP-${Date.now()}`,
                    name_ar: data.name_ar,
                    name_en: data.name_en || '',
                    description: data.description || data.composition || '',
                    parent_id: data.parent_id || null,
                    is_active: data.is_active ?? true,
                };

                if (selectedMaterial?.id) {
                    const result = await warehouseService.updateGroup(selectedMaterial.id, groupData);
                    if (result.success) {
                        console.log('Group updated successfully');
                        await loadGroups();
                        await loadMaterials();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to update group:', result.error);
                    }
                } else {
                    const result = await warehouseService.createGroup(groupData);
                    if (result.success) {
                        console.log('Group created successfully');
                        await loadGroups();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to create group:', result.error);
                    }
                }
                return;
            }

            // === Handle MATERIAL creation/update ===
            const materialData = {
                tenant_id: user?.user_metadata?.tenant_id,
                company_id: companyId,
                code: data.code,
                name_ar: data.name_ar,
                name_en: data.name_en,
                group_id: data.category_id || data.group_id,
                composition: data.description || data.composition,
                category: data.category || 'mixed',
                unit: data.unit_id || data.unit || 'meter',
                custom_fields: {
                    ...(data.custom_fields || {}),
                    color: data.color,
                    color_hex: data.color_hex,
                    sku: data.sku,
                    barcode: data.barcode,
                },
                min_stock: data.min_stock_level || data.min_stock || 0,
                reorder_point: data.max_stock_level || data.reorder_point || 0,
                status: (data.is_active ?? true) ? 'active' : 'inactive',
                notes: data.notes,
            };

            if (selectedMaterial?.id) {
                const result = await warehouseService.updateMaterial(selectedMaterial.id, materialData);
                if (result.success) {
                    console.log('Material updated successfully');
                    await loadMaterials();
                    setSheetOpen(false);
                } else {
                    console.error('Failed to update material:', result.error);
                }
            } else {
                if (data.has_variants && data.variant_colors && data.variant_colors.length > 0) {
                    const materialsToCreate = data.variant_colors.map((color: string) => ({
                        ...materialData,
                        name_ar: `${data.name_ar} - ${color}`,
                        name_en: data.name_en ? `${data.name_en} - ${color}` : undefined,
                        code: `${data.code}-${color.substring(0, 3).toUpperCase()}`,
                        custom_fields: {
                            ...materialData.custom_fields,
                            color: color,
                        },
                    }));

                    const result = await warehouseService.createMaterials(materialsToCreate);
                    if (result.success) {
                        console.log(`Created ${materialsToCreate.length} material variants successfully`);
                        await loadMaterials();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to create material variants:', result.error);
                    }
                } else {
                    const result = await warehouseService.createMaterial(materialData);
                    if (result.success) {
                        console.log('Material created successfully');
                        await loadMaterials();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to create material:', result.error);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving material:', error);
        }
    };

    // Filter materials
    const filteredMaterials = useMemo(() => {
        // Map groups to match Material structure
        const mappedGroups = groups.map((g: any) => ({
            id: g.id,
            code: g.code,
            name_ar: g.name_ar,
            name_en: g.name_en,
            description: g.description,
            is_group: true,
            is_active: g.is_active,
            created_at: g.created_at,
            parent_id: g.parent_id,
            // Fallbacks
            category_id: 'group',
            category: { id: 'group', name_ar: language === 'ar' ? 'مجموعة' : 'Group', name_en: 'Group' },
            unit_id: null,
            unit: null
        }));

        let filtered = [...mappedGroups, ...materials];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (material) =>
                    (material.code && material.code.toLowerCase().includes(query)) ||
                    (material.name_ar && material.name_ar.toLowerCase().includes(query)) ||
                    (material.name_en && material.name_en.toLowerCase().includes(query))
            );
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter((material) => material.category_id === categoryFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(
                (material) => statusFilter === 'active' ? material.is_active : !material.is_active
            );
        }

        return filtered;
    }, [materials, searchQuery, categoryFilter, statusFilter]);

    // Build tree structure
    const buildTree = useCallback((mats: Material[]): MaterialTreeNode[] => {
        const materialMap = new Map<string, MaterialTreeNode>();
        const rootNodes: MaterialTreeNode[] = [];

        // First pass: create all nodes
        mats.forEach((material) => {
            materialMap.set(material.id, { ...material, children: [] });
        });

        // Second pass: build tree
        mats.forEach((material) => {
            const node = materialMap.get(material.id)!;
            if (material.parent_id) {
                const parent = materialMap.get(material.parent_id);
                if (parent) {
                    if (!parent.children) parent.children = [];
                    parent.children.push(node);
                } else {
                    rootNodes.push(node);
                }
            } else {
                rootNodes.push(node);
            }
        });

        // Sort by group first, then by code
        const sortNodes = (nodes: MaterialTreeNode[]): MaterialTreeNode[] => {
            return nodes
                .sort((a, b) => {
                    // 1. Groups first
                    if (a.is_group && !b.is_group) return -1;
                    if (!a.is_group && b.is_group) return 1;

                    // 2. Then by code
                    return (a.code || '').localeCompare(b.code || '');
                })
                .map((node) => ({
                    ...node,
                    children: node.children ? sortNodes(node.children) : undefined,
                }));
        };

        return sortNodes(rootNodes);
    }, []);

    // Flatten tree for table view
    const flattenTree = useCallback((tree: MaterialTreeNode[], level = 0): (Material & { level: number })[] => {
        let result: (Material & { level: number })[] = [];
        tree.forEach((node) => {
            const { children, ...material } = node;
            result.push({ ...material, level } as Material & { level: number });
            if (children && children.length > 0) {
                result = [...result, ...flattenTree(children, level + 1)];
            }
        });
        return result;
    }, []);

    // Build tree from filtered materials
    const treeData = useMemo(() => buildTree(filteredMaterials), [filteredMaterials, buildTree]);

    // Flatten tree for table view
    const tableMaterials = useMemo(() => {
        if (treeData.length === 0) return [];
        return flattenTree(treeData);
    }, [treeData, flattenTree]);

    // Calculate stats
    const totalMaterials = materials.length;
    const activeMaterials = materials.filter((m) => m.is_active).length;
    const groupsCount = materials.filter((m) => m.is_group).length;
    const totalStock = 0; // TODO: Calculate from inventory

    // Table columns
    const tableColumns: Column<Material & { level?: number }>[] = [
        {
            key: 'code',
            title: 'warehouse.material.code',
            align: 'start',
            render: (value, row) => (
                <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(row.level || 0) * 24}px` }}>
                    <span className="font-mono font-semibold text-erp-navy dark:text-white">{value}</span>
                </div>
            ),
        },
        {
            key: 'name',
            title: 'warehouse.material.name',
            align: 'start',
            render: (_value, row) => (
                <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(row.level || 0) * 8}px` }}>
                    {row.is_group ? (
                        <Folder className="w-4 h-4 text-erp-teal flex-shrink-0" />
                    ) : (
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="font-tajawal">
                        {language === 'ar' ? row.name_ar : (row.name_en || row.name_ar)}
                    </span>
                </div>
            ),
        },
        {
            key: 'category',
            title: 'warehouse.material.category',
            align: 'start',
            render: (_, row) => row.category ? (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                    <Layers className="w-3 h-3 me-1" />
                    {language === 'ar' ? row.category.name_ar : (row.category.name_en || row.category.name_ar)}
                </Badge>
            ) : '-'
        },
        {
            key: 'is_active',
            title: 'common.status._',
            align: 'start',
            render: (_value, row) => (
                <StatusBadge status={row.is_active ? 'confirmed' : 'cancelled'} showIcon={false} size="sm" />
            ),
        },
        {
            key: 'actions',
            title: 'common.actions',
            align: 'start',
            render: (_value, row) => (
                <div className="flex items-center gap-1">
                    {row.is_group && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-erp-teal hover:bg-erp-teal/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddChild(row);
                            }}
                            title={t('warehouse.material.addSubMaterial')}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    // Export to CSV
    const generateCSV = () => {
        const headers = [
            language === 'ar' ? 'الكود' : 'Code',
            language === 'ar' ? 'الاسم' : 'Name',
            language === 'ar' ? 'التصنيف' : 'Category',
            language === 'ar' ? 'الحالة' : 'Status',
        ];

        const rows = filteredMaterials.map(material => [
            material.code || '',
            language === 'ar' ? material.name_ar : (material.name_en || material.name_ar),
            material.category ? (language === 'ar' ? material.category.name_ar : material.category.name_en) : '',
            material.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive'),
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.materials') || (language === 'ar' ? 'إدارة المواد' : 'Materials Management')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
                        {language === 'ar' ? 'إدارة المواد والمنتجات في قاعدة البيانات' : 'Manage materials and products in the database'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={loadMaterials} disabled={loading}>
                        <RefreshCw className={cn('w-4 h-4 me-2', loading && 'animate-spin')} />
                        {t('common.refresh')}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 me-2" />
                        {t('accounting.printReport')}
                    </Button>
                    <Button variant="outline" onClick={handleAddGroup}>
                        <FolderPlus className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'إضافة مجموعة' : 'Add Group'}
                    </Button>
                    <Button variant="teal" onClick={handleAddClick}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('warehouse.material.add') || (language === 'ar' ? 'مادة جديدة' : 'New Material')}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label={language === 'ar' ? 'إجمالي المواد' : 'Total Materials'}
                    value={totalMaterials}
                    icon={BarChart3}
                />
                <StatCard
                    label={language === 'ar' ? 'المواد النشطة' : 'Active Materials'}
                    value={activeMaterials}
                    icon={CheckCircle2}
                />
                <StatCard
                    label={language === 'ar' ? 'المجموعات' : 'Groups'}
                    value={groupsCount}
                    icon={Folder}
                />
                <StatCard
                    label={language === 'ar' ? 'إجمالي المخزون' : 'Total Stock'}
                    value={totalStock.toLocaleString('en-US')}
                    icon={Database}
                />
            </div>

            {/* Search, Filters, and View Controls */}
            <div className="space-y-3">
                <div className={cn(
                    "flex items-center gap-3 flex-wrap",
                    direction === 'rtl' ? 'flex-row-reverse' : ''
                )}>
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] sm:w-64">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <Input
                            placeholder={t('warehouse.searchPlaceholder') || (language === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...')}
                            className="ps-9 bg-gray-50 dark:bg-gray-800 border-none text-gray-900 dark:text-gray-100"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-9"
                    >
                        <Filter className="w-4 h-4 me-2" />
                        {t('common.filter')}
                        {(categoryFilter !== 'all' || statusFilter !== 'all') && (
                            <span className="ms-2 px-1.5 py-0.5 bg-erp-teal text-white text-xs rounded-full">
                                {(categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
                            </span>
                        )}
                    </Button>

                    {/* Export Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const csvContent = generateCSV();
                            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `materials_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                        }}
                        className="h-9"
                    >
                        <Download className="w-4 h-4 me-2" />
                        {t('common.export')}
                    </Button>

                    {/* View Controls */}
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <Button
                                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('tree')}
                                className={cn(
                                    'h-8 px-3',
                                    viewMode === 'tree'
                                        ? 'bg-erp-navy text-white dark:bg-erp-navy dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400'
                                )}
                            >
                                <TreePine className="w-4 h-4 me-2" />
                                {t('warehouse.material.treeView') || (language === 'ar' ? 'عرض الشجرة' : 'Tree View')}
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    'h-8 px-3',
                                    viewMode === 'table'
                                        ? 'bg-erp-navy text-white dark:bg-erp-navy dark:text-white'
                                        : 'text-gray-600 dark:text-gray-400'
                                )}
                            >
                                <LayoutList className="w-4 h-4 me-2" />
                                {t('warehouse.material.tableView') || (language === 'ar' ? 'عرض الجدول' : 'Table View')}
                            </Button>
                        </div>

                        {/* Expand/Collapse All (only in tree view) */}
                        {viewMode === 'tree' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setCollapseAll(undefined);
                                        setExpandAll(true);
                                        setTimeout(() => setExpandAll(undefined), 100);
                                    }}
                                    className="h-8"
                                >
                                    <ChevronsDownUp className="w-4 h-4 me-2" />
                                    {t('accounting.expandAll')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setExpandAll(undefined);
                                        setCollapseAll(true);
                                        setTimeout(() => setCollapseAll(undefined), 100);
                                    }}
                                    className="h-8"
                                >
                                    <ChevronsUpDown className="w-4 h-4 me-2" />
                                    {t('accounting.collapseAll')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('common.filter')}
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setCategoryFilter('all');
                                    setStatusFilter('all');
                                }}
                                className="h-7 text-xs"
                            >
                                <X className="w-3 h-3 me-1" />
                                {t('common.clear')}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Category Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-600 dark:text-gray-400">
                                    {t('warehouse.material.category')}
                                </Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        {/* TODO: Add category options */}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-600 dark:text-gray-400">
                                    {t('common.status._')}
                                </Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        <SelectItem value="active">{t('common.status.active')}</SelectItem>
                                        <SelectItem value="inactive">{t('common.status.inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tree View or Table View */}
            {!loading && materials.length === 0 && groups.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {t('warehouse.material.noMaterials') || (language === 'ar' ? 'لا توجد مواد' : 'No Materials')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {language === 'ar'
                                    ? 'لم يتم إضافة أي مواد بعد. ابدأ بإضافة أول مادة.'
                                    : 'No materials added yet. Start by adding your first material.'}
                            </p>
                        </div>
                        <div className="flex gap-2 justify-center pt-2">
                            <Button variant="outline" onClick={loadMaterials}>
                                <RefreshCw className="w-4 h-4 me-2" />
                                {t('common.refresh')}
                            </Button>
                            <Button variant="teal" onClick={handleAddClick}>
                                <Plus className="w-4 h-4 me-2" />
                                {language === 'ar' ? 'إضافة أول مادة' : 'Add First Material'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
                </div>
            ) : viewMode === 'tree' ? (
                <MaterialTree
                    data={treeData}
                    onEdit={(node) => handleRowClick(node)}
                    onAddChild={(node) => {
                        if (node.is_group) {
                            // Pre-fill parent/group when adding child
                            setSelectedParent(node);
                            handleAddClick();
                        }
                    }}
                    className="h-[calc(100vh-240px)]"
                />
            ) : (
                <NexaTable
                    data={tableMaterials}
                    columns={tableColumns}
                    onRowClick={(row) => handleRowClick(row)}
                    showRowNumbers
                    rowKey="id"
                    emptyMessage={t('table.noData')}
                />
            )}

            {/* Unified Material Sheet */}
            <UnifiedAccountingSheet
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                docType="material"
                mode={sheetMode}
                companyId={companyId || undefined}
                options={{
                    groups: groups.map(g => ({
                        id: g.id,
                        name_ar: g.name_ar,
                        name_en: g.name_en,
                        code: g.code
                    }))
                }}
                data={selectedMaterial || {
                    code: '',
                    name_ar: '',
                    is_active: true,
                    parent_id: selectedParent?.id || null,
                    parent_name: selectedParent ? (language === 'ar' ? selectedParent.name_ar : (selectedParent.name_en || selectedParent.name_ar)) : null,
                }}
                onSave={handleSave}
                onDelete={async () => {
                    if (selectedMaterial?.id) {
                        const result = await warehouseService.deleteMaterial(selectedMaterial.id);
                        if (result.success) {
                            console.log('Material deleted successfully');
                            await loadMaterials();
                            setSheetOpen(false);
                        } else {
                            console.error('Failed to delete material:', result.error);
                        }
                    }
                }}
                onModeChange={setSheetMode}
            />

            {/* Material Group Sheet */}
            <UnifiedAccountingSheet
                isOpen={groupSheetOpen}
                onClose={() => setGroupSheetOpen(false)}
                docType="materialGroup"
                mode={groupSheetMode}
                companyId={companyId || undefined}
                data={selectedGroup || {
                    code: '',
                    [`name_${language}`]: '',
                    name_en: '',
                    icon: '📁',
                    parent_id: null,
                    description: '',
                    is_active: true,
                }}
                onSave={async (formData: any) => {
                    const tenantId = user?.user_metadata?.tenant_id;
                    if (!tenantId) {
                        throw new Error('tenant_id is required');
                    }

                    // Build payload with ONLY columns that exist in fabric_groups table
                    const groupPayload: Record<string, any> = {
                        tenant_id: tenantId,
                        code: formData.code?.trim() || `GRP-${Date.now().toString(36).toUpperCase()}`,
                        name_ar: formData.name_ar?.trim() || formData[`name_${language}`]?.trim() || '',
                        name_en: formData.name_en?.trim() || '',
                        description: formData.description?.trim() || '',
                        parent_id: formData.parent_id || null,
                        icon: formData.icon || '📁',
                        is_active: true,
                    };

                    // Add translation names only if they have values
                    const langCodes = ['ru', 'uk', 'ro', 'pl', 'tr', 'de', 'it'];
                    for (const lang of langCodes) {
                        const val = formData[`name_${lang}`] || '';
                        if (val) {
                            groupPayload[`name_${lang}`] = val;
                        }
                    }

                    let result;
                    if (selectedGroup?.id) {
                        result = await warehouseService.updateGroup(selectedGroup.id, groupPayload);
                    } else {
                        result = await warehouseService.createGroup(groupPayload);
                    }

                    if (result.success) {
                        setGroupSheetOpen(false);
                        await loadGroups();
                        await loadMaterials();
                    } else {
                        throw new Error(result.error || 'Failed to save group');
                    }
                }}
                onDelete={async () => {
                    if (selectedGroup?.id) {
                        const result = await warehouseService.deleteGroup(selectedGroup.id);
                        if (result.success) {
                            setGroupSheetOpen(false);
                            await loadGroups();
                            await loadMaterials();
                        }
                    }
                }}
                onModeChange={setGroupSheetMode}
            />
        </div>
    );
}

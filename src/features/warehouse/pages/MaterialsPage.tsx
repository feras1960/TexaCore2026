/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Materials Page - Following Chart of Accounts Pattern
 * صفحة المواد - بنفس نمط شجرة الحسابات
 * ════════════════════════════════════════════════════════════════
 */

import { MaterialTree, getGroupAggregate } from '../components/MaterialTree';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { useMaterials, useMaterialGroups } from '../hooks/useWarehouseQueries';
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
import { Switch } from '@/components/ui/switch';
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
    parent_material_id?: string;
    variant_id?: string;
    has_variants?: boolean;
    is_variant_parent?: boolean;
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
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem('materials_view_mode');
        return (saved as ViewMode) || 'tree';
    });

    useEffect(() => {
        localStorage.setItem('materials_view_mode', viewMode);
    }, [viewMode]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter preferences
    const [hideZeroStock, setHideZeroStock] = useState(() => {
        const saved = localStorage.getItem('materials_hide_zero');
        return saved ? saved === 'true' : true; // Default true
    });
    const [lowStockOnly, setLowStockOnly] = useState(() => {
        const saved = localStorage.getItem('materials_low_stock');
        return saved === 'true'; // Default false
    });

    useEffect(() => {
        localStorage.setItem('materials_hide_zero', String(hideZeroStock));
        localStorage.setItem('materials_low_stock', String(lowStockOnly));
    }, [hideZeroStock, lowStockOnly]);

    const [showFilters, setShowFilters] = useState(false);
    // Use counter-based triggers so each button press always triggers useEffect in MaterialTree
    const [expandAllCount, setExpandAllCount] = useState(0);
    const [collapseAllCount, setCollapseAllCount] = useState(0);

    // ⚡ React Query: cached data, instant tab switching
    const { materials, loading, refetch: refetchMaterials, invalidate: invalidateMaterials } = useMaterials({
        search: searchQuery || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    });
    const { groups, refetch: refetchGroups, invalidate: invalidateGroups } = useMaterialGroups();

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
        // Here `parent` is a group object. We want to auto-select this group in the form.
        setSheetOpen(false);
        setTimeout(() => {
            setSelectedParent(parent); // Set parent material/group here
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
                        invalidateGroups();
                        invalidateMaterials();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to update group:', result.error);
                    }
                } else {
                    const result = await warehouseService.createGroup(groupData);
                    if (result.success) {
                        console.log('Group created successfully');
                        invalidateGroups();
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
                    invalidateMaterials();
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
                        invalidateMaterials();
                        setSheetOpen(false);
                    } else {
                        console.error('Failed to create material variants:', result.error);
                    }
                } else {
                    const result = await warehouseService.createMaterial(materialData);
                    if (result.success) {
                        console.log('Material created successfully');
                        invalidateMaterials();
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

        // Zero stock filter
        if (hideZeroStock) {
            filtered = filtered.filter(m => {
                if (m.is_group) return true; // Keep groups, empty ones will be pruned in buildTree
                const stock = m.current_stock || m.rolls_total_length || 0;
                const rolls = m.rolls_count || 0;
                return stock > 0 || rolls > 0;
            });
        }

        // Low stock filter
        if (lowStockOnly) {
            filtered = filtered.filter(m => {
                if (m.is_group) return true;
                const stock = m.current_stock || m.rolls_total_length || 0;
                const minStock = Number(m.min_stock || m.min_stock_level || 0);
                return minStock > 0 && stock <= minStock;
            });
        }

        return filtered;
    }, [materials, groups, searchQuery, categoryFilter, statusFilter, hideZeroStock, lowStockOnly, language]);

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
            // Use parent_id (for groups) or parent_material_id (for variants)
            const parentId = material.parent_id || material.parent_material_id;
            if (parentId) {
                const parent = materialMap.get(parentId);
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

        // Post-prune empty groups if filtering is active
        const tree = sortNodes(rootNodes);

        if (searchQuery || hideZeroStock || lowStockOnly) {
            const prune = (nodes: MaterialTreeNode[]): MaterialTreeNode[] => {
                return nodes.filter(node => {
                    if (node.is_group) {
                        if (node.children) {
                            node.children = prune(node.children);
                            return node.children.length > 0;
                        }
                        return false;
                    }
                    return true;
                });
            };
            return prune(tree);
        }

        return tree;
    }, [searchQuery, hideZeroStock, lowStockOnly]);

    // Flatten tree for table view
    const flattenTree = useCallback((tree: MaterialTreeNode[], level = 0): any[] => {
        let result: any[] = [];
        tree.forEach((node) => {
            const { children, ...material } = node;
            const aggregate = node.is_group ? getGroupAggregate(children) : null;
            // A leaf group directly contains materials (no sub-group children)
            const isLeafGroup = node.is_group && children
                ? !children.some(c => c.is_group)
                : false;
            result.push({
                ...material,
                level,
                aggregateStock: aggregate?.stock,
                aggregateRolls: aggregate?.rolls,
                isLeafGroup,
            });
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

    // Calculate stats — treat null/undefined is_active as active (default)
    const totalMaterials = materials.length;
    const activeMaterials = materials.filter((m) => m.is_active !== false).length;
    const groupsCount = groups.length;
    // Calculate total stock and rolls safely
    const totalStock = useMemo(() => {
        return materials.reduce((acc, m: any) => acc + (m.current_stock || m.rolls_total_length || 0), 0);
    }, [materials]);
    const totalRolls = useMemo(() => {
        return materials.reduce((acc, m: any) => acc + (m.rolls_count || 0), 0);
    }, [materials]);

    // Table columns
    const tableColumns: Column<any>[] = [
        {
            key: 'code',
            title: 'warehouse.material.code',
            align: 'start',
            render: (value) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-erp-navy dark:text-white">{value}</span>
                </div>
            ),
        },
        {
            key: 'name',
            title: 'warehouse.material.name',
            align: 'start',
            render: (_value, row) => (
                <div className="flex items-center gap-2" style={{ paddingInlineStart: `${(row.level || 0) * 24}px` }}>
                    {row.is_group ? (
                        <Folder className="w-4 h-4 text-erp-teal flex-shrink-0" />
                    ) : row.is_variant_parent ? (
                        <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    ) : row.variant_id ? (
                        <span className="w-4 h-4 flex items-center justify-center text-[10px] flex-shrink-0">↳</span>
                    ) : (
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={cn("font-tajawal", row.variant_id && "text-gray-600 dark:text-gray-400")}>
                        {language === 'ar' ? row.name_ar : (row.name_en || row.name_ar)}
                    </span>
                    {row.is_variant_parent && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-50 text-purple-600 border-purple-200">
                            {language === 'ar' ? 'أم' : 'Parent'}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'current_stock',
            title: language === 'ar' ? 'الرصيد الاجمالي' : 'Total Stock',
            align: 'start',
            render: (_, row) => {
                const stock = row.is_group ? row.aggregateStock : (row.current_stock || row.rolls_total_length || 0);
                const rolls = row.is_group ? row.aggregateRolls : (row.rolls_count || 0);

                if (!stock && !rolls) return <span className="text-gray-400">-</span>;

                // Use pre-computed isLeafGroup from flattenTree
                if (row.is_group) {
                    const isLeaf = row.isLeafGroup as boolean;
                    return (
                        <div className="flex items-center gap-1.5">
                            {stock > 0 && (
                                <span className={cn(
                                    "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                                    isLeaf
                                        ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40"
                                        : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                )}>
                                    {!isLeaf && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                    {Number(stock).toFixed(2)}
                                </span>
                            )}
                            {rolls > 0 && (
                                <span className={cn(
                                    "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                                    isLeaf
                                        ? "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40"
                                        : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                )}>
                                    {!isLeaf && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                    {rolls} {language === 'ar' ? 'رول' : 'R'}
                                </span>
                            )}
                        </div>
                    );
                }

                // Regular material: blue for meters, purple for rolls
                return (
                    <div className="flex items-center gap-1.5">
                        {stock > 0 && (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30">
                                {Number(stock).toFixed(2)} {row.unit || ''}
                            </span>
                        )}
                        {rolls > 0 && (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30">
                                {rolls} {language === 'ar' ? 'رول' : 'Rolls'}
                            </span>
                        )}
                    </div>
                );
            }
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
                    <Button variant="outline" onClick={() => { refetchMaterials(); refetchGroups(); }} disabled={loading}>
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
                    suffix={language === 'ar' ? 'م' : 'm'}
                    subLabel={`${totalRolls} ${language === 'ar' ? 'رول' : 'Rolls'}`}
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
                        {(categoryFilter !== 'all' || statusFilter !== 'all' || hideZeroStock || lowStockOnly) && (
                            <span className="ms-2 px-1.5 py-0.5 bg-erp-teal text-white text-xs rounded-full">
                                {(categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (hideZeroStock ? 1 : 0) + (lowStockOnly ? 1 : 0)}
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
                                    onClick={() => setExpandAllCount(c => c + 1)}
                                    className="h-8"
                                >
                                    <ChevronsDownUp className="w-4 h-4 me-2" />
                                    {t('accounting.expandAll')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCollapseAllCount(c => c + 1)}
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
                                    setHideZeroStock(false);
                                    setLowStockOnly(false);
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

                            {/* Additional Switches */}
                            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700/50">
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <Switch
                                        id="hide-zero"
                                        checked={hideZeroStock}
                                        onCheckedChange={setHideZeroStock}
                                    />
                                    <Label htmlFor="hide-zero" className="text-sm cursor-pointer">
                                        {language === 'ar' ? 'إخفاء الأرصدة الصفرية' : 'Hide zero stock'}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <Switch
                                        id="low-stock"
                                        checked={lowStockOnly}
                                        onCheckedChange={setLowStockOnly}
                                    />
                                    <Label htmlFor="low-stock" className="text-sm cursor-pointer text-amber-600 dark:text-amber-500">
                                        {language === 'ar' ? 'نواقص الحد الأدنى فقط' : 'Low stock only'}
                                    </Label>
                                </div>
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
                            <Button variant="outline" onClick={() => refetchMaterials()}>
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
                    onNodeClick={handleRowClick}
                    onEdit={(node) => {
                        if (node.is_group) {
                            // Edit group — open group sheet
                            setSelectedGroup(node);
                            setGroupSheetMode('edit');
                            setGroupSheetOpen(true);
                        } else {
                            // Edit material — open material sheet in edit mode
                            handleEdit(node);
                        }
                    }}
                    onAddChild={(node) => node.is_group && handleAddChild(node)}
                    expandAllCount={expandAllCount}
                    collapseAllCount={collapseAllCount}
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
                key={selectedMaterial?.id || (selectedParent?.id ? `new-in-${selectedParent.id}` : 'new-material')}
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
                    group_id: selectedParent?.id || null, // For materials we use group_id
                    category_id: selectedParent?.id || null, // category_id holds group_id
                    parent_name: selectedParent ? (language === 'ar' ? selectedParent.name_ar : (selectedParent.name_en || selectedParent.name_ar)) : null,
                }}
                onSave={handleSave}
                onDelete={async () => {
                    if (selectedMaterial?.id) {
                        const result = await warehouseService.deleteMaterial(selectedMaterial.id);
                        if (result.success) {
                            console.log('Material deleted successfully');
                            invalidateMaterials();
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
                key={selectedGroup?.id || 'new-group'}
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
                        invalidateGroups();
                        invalidateMaterials();
                    } else {
                        throw new Error(result.error || 'Failed to save group');
                    }
                }}
                onDelete={async () => {
                    if (selectedGroup?.id) {
                        const result = await warehouseService.deleteGroup(selectedGroup.id);
                        if (result.success) {
                            setGroupSheetOpen(false);
                            invalidateGroups();
                            invalidateMaterials();
                        }
                    }
                }}
                onModeChange={setGroupSheetMode}
            />
        </div>
    );
}

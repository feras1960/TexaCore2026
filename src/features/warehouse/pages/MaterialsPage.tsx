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
import { getLocalizedName } from '@/lib/utils/getLocalizedName';
import { getLocalizedUnit, getLocalizedLabel } from '@/lib/utils/getLocalizedUnit';
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
    Printer,
    Upload,
    Paintbrush,
    Palette,
    List,
    ChevronDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportWizard } from '@/features/import';

// Types
interface Material {
    [key: string]: any;  // Allow dynamic name_* access
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
    variant_data?: Record<string, any>;
    has_variants?: boolean;
    is_variant_parent?: boolean;
    is_virtual_group?: boolean;
    created_at?: string;
}

interface MaterialTreeNode extends Material {
    children?: MaterialTreeNode[];
}

type ViewMode = 'tree' | 'table';
type TreeGroupMode = 'by_design' | 'by_color' | 'by_category' | 'flat';

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

    // Tree grouping mode — saved per user
    const [treeGroupMode, setTreeGroupMode] = useState<TreeGroupMode>(() => {
        const saved = localStorage.getItem('materials_tree_group_mode');
        return (saved as TreeGroupMode) || 'by_design';
    });
    useEffect(() => {
        localStorage.setItem('materials_tree_group_mode', treeGroupMode);
    }, [treeGroupMode]);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter preferences
    const [hideZeroStock, setHideZeroStock] = useState(() => {
        const saved = localStorage.getItem('materials_hide_zero');
        return saved ? saved === 'true' : false; // Default false — الشجرة تعرض كل المواد
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

    // Import Wizard state
    const [showImportWizard, setShowImportWizard] = useState(false);

    // Group Sheet state
    const [groupSheetOpen, setGroupSheetOpen] = useState(false);
    const [groupSheetMode, setGroupSheetMode] = useState<SheetMode>('create');
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    // Handlers — direct state updates (React 18 batches automatically)
    // The `key` prop on UnifiedAccountingSheet handles clean remount when selectedMaterial changes
    const handleAddClick = () => {
        setSelectedParent(null);
        setSelectedMaterial(null);
        setIsGroupMode(false);
        setSheetMode('create');
        setSheetOpen(true);
    };

    const handleAddGroup = () => {
        setSelectedGroup(null);
        setGroupSheetMode('create');
        setGroupSheetOpen(true);
    };

    const handleAddChild = (parent: Material) => {
        setSelectedParent(parent);
        setSelectedMaterial(null);
        setIsGroupMode(false);
        setSheetMode('create');
        setSheetOpen(true);
    };

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material);
        setSheetMode('edit');
        setSheetOpen(true);
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
            const materialData: Record<string, any> = {
                tenant_id: user?.user_metadata?.tenant_id,
                company_id: companyId,
                code: data.code,
                name_ar: data.name_ar,
                name_en: data.name_en,
                // ═══ Multi-language name translations ═══
                name_ru: data.name_ru || null,
                name_uk: data.name_uk || null,
                name_tr: data.name_tr || null,
                name_ro: data.name_ro || null,
                name_pl: data.name_pl || null,
                name_de: data.name_de || null,
                name_it: data.name_it || null,
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
                    // ═══ E-commerce / SEO fields ═══
                    ...(data.ecommerce ? { ecommerce: data.ecommerce } : {}),
                },
                min_stock: data.min_stock_level || data.min_stock || 0,
                reorder_point: data.max_stock_level || data.reorder_point || 0,
                status: (data.is_active ?? true) ? 'active' : 'inactive',
                notes: data.notes,
                // ═══ Variant parent flags ═══
                ...(data.is_variant_parent ? { is_variant_parent: true, has_variants: true } : {}),
            };

            if (selectedMaterial?.id) {
                // ⚠️ تنبيه عند تعديل مادة أم — النشر سيؤثر على الفرعيات
                if (selectedMaterial.is_variant_parent || data.is_variant_parent) {
                    const isAr = language === 'ar';
                    const confirmMsg = isAr
                        ? `⚠️ هذه مادة أم بمتغيرات.\nسيتم نشر التحديثات (الاسم، المواصفات، الأسعار) لجميع المواد الفرعية.\n\nهل تريد المتابعة؟`
                        : `⚠️ This is a variant parent material.\nUpdates (name, specs, prices) will be propagated to all child materials.\n\nContinue?`;
                    if (!confirm(confirmMsg)) return;
                }

                const result = await warehouseService.updateMaterial(selectedMaterial.id, materialData);
                if (result.success) {
                    console.log('Material updated successfully');
                    invalidateMaterials();
                    setSheetOpen(false);
                } else {
                    console.error('Failed to update material:', result.error);
                }
            } else {
                // إنشاء مادة جديدة
                const result = await warehouseService.createMaterial(materialData);
                if (result.success) {
                    console.log('Material created successfully, id:', result.data?.id);
                    
                    // 🆕 إذا المادة بها متغيرات → توليد المتغيرات دفعة واحدة
                    const variantSelections = data._variant_selections;
                    if (data.has_variants && variantSelections?.axesConfig?.length > 0 && result.data?.id) {
                        try {
                            const { generateVariants } = await import('@/services/variantService');
                            const genResult = await generateVariants(
                                companyId,
                                user?.user_metadata?.tenant_id,
                                {
                                    product_id: result.data.id,
                                    parent_code: data.code || 'MAT',
                                    axes: variantSelections.axesConfig,
                                }
                            );
                            if (genResult.success) {
                                console.log(`✅ Generated ${genResult.created_count} variants for material ${result.data.id}`);
                            } else {
                                console.error('⚠️ Variant generation failed:', genResult.error);
                            }
                        } catch (genErr) {
                            console.error('⚠️ Variant generation error:', genErr);
                        }
                    }
                    
                    invalidateMaterials();
                    setSheetOpen(false);
                } else {
                    console.error('Failed to create material:', result.error);
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
            category: { id: 'group', name_ar: getLocalizedLabel('group_label', language), name_en: 'Group' },
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
                // Keep variant children even if they have zero stock/rolls
                if (m.parent_material_id) return true;
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

        // Third pass: create virtual groups for variant parents
        // تجميع ديناميكي حسب اختيار المستخدم
        const createVirtualGroups = (nodes: MaterialTreeNode[], mode: TreeGroupMode) => {
            // في الوضع المسطح — لا تجميع
            if (mode === 'flat') return;

            nodes.forEach(node => {
                // فقط للمواد الأم التي لها أطفال بـ variant_data
                if (node.is_variant_parent && node.children && node.children.length > 0) {
                    const childrenWithData = node.children.filter(c => c.variant_data && Object.keys(c.variant_data).length > 1);
                    
                    if (childrenWithData.length > 0) {
                        const firstChild = childrenWithData[0];
                        const axisKeys = Object.keys(firstChild.variant_data || {});
                        
                        if (axisKeys.length >= 2) {
                            // تحديد المحور حسب وضع العرض
                            let groupAxisKey: string;
                            
                            if (mode === 'by_color') {
                                // حسب اللون: المحور ذو sort_order الأعلى (الثاني)
                                groupAxisKey = axisKeys.reduce((best, key) => {
                                    const current = firstChild.variant_data?.[key]?.sort_order ?? 0;
                                    const bestOrder = firstChild.variant_data?.[best]?.sort_order ?? 0;
                                    return current > bestOrder ? key : best;
                                }, axisKeys[0]);
                            } else {
                                // حسب التصميم (الافتراضي): المحور ذو sort_order الأقل (الأول)
                                groupAxisKey = axisKeys.reduce((best, key) => {
                                    const current = firstChild.variant_data?.[key]?.sort_order ?? 999;
                                    const bestOrder = firstChild.variant_data?.[best]?.sort_order ?? 999;
                                    return current < bestOrder ? key : best;
                                }, axisKeys[0]);
                            }
                            
                            // تجميع حسب المحور المُختار
                            const groups = new Map<string, { names: Record<string, string>; children: MaterialTreeNode[] }>();
                            
                            childrenWithData.forEach(child => {
                                const axisData = child.variant_data?.[groupAxisKey];
                                if (axisData) {
                                    const groupKey = axisData.value_id || axisData.code || axisData.name_ar;
                                    if (!groups.has(groupKey)) {
                                        const names: Record<string, string> = {};
                                        Object.keys(axisData).forEach(k => {
                                            if (k.startsWith('name_')) names[k] = axisData[k];
                                        });
                                        if (!names.name_ar) names.name_ar = groupKey;
                                        if (!names.name_en) names.name_en = axisData.code || groupKey;
                                        groups.set(groupKey, { names, children: [] });
                                    }
                                    groups.get(groupKey)!.children.push(child);
                                }
                            });
                            
                            // إذا وُجدت أكثر من مجموعة واحدة → إنشاء virtual groups
                            if (groups.size > 1) {
                                const virtualGroupNodes: MaterialTreeNode[] = [];
                                groups.forEach((group, key) => {
                                    const virtualId = `vg-${node.id}-${mode}-${key}`;
                                    virtualGroupNodes.push({
                                        id: virtualId,
                                        code: '',
                                        ...group.names,
                                        name_ar: group.names.name_ar,
                                        is_group: false,
                                        is_virtual_group: true,
                                        is_variant_parent: false,
                                        is_active: true,
                                        children: group.children,
                                    } as MaterialTreeNode);
                                });
                                
                                const remainingChildren = node.children.filter(c => !childrenWithData.includes(c));
                                node.children = [...virtualGroupNodes, ...remainingChildren];
                            }
                        }
                    }
                }
                
                // Recurse into children
                if (node.children) createVirtualGroups(node.children, mode);
            });
        };

        // في وضع 'by_category' — عرض كل شيء مسطح تحت الأم بدون virtual groups
        if (treeGroupMode !== 'by_category') {
            createVirtualGroups(rootNodes, treeGroupMode);
        }

        // Sort by group first, then variant parents, then by code
        const sortNodes = (nodes: MaterialTreeNode[]): MaterialTreeNode[] => {
            return nodes
                .sort((a, b) => {
                    // 1. Groups first
                    if (a.is_group && !b.is_group) return -1;
                    if (!a.is_group && b.is_group) return 1;

                    // 2. Virtual groups second
                    if (a.is_virtual_group && !b.is_virtual_group) return -1;
                    if (!a.is_virtual_group && b.is_virtual_group) return 1;

                    // 3. Variant parents third
                    if (a.is_variant_parent && !b.is_variant_parent) return -1;
                    if (!a.is_variant_parent && b.is_variant_parent) return 1;

                    // 4. Then by code or name
                    return (a.name_ar || a.code || '').localeCompare(b.name_ar || b.code || '');
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
                    if (node.is_group || node.is_variant_parent || node.is_virtual_group) {
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
    }, [searchQuery, hideZeroStock, lowStockOnly, treeGroupMode]);

    // Flatten tree for table view
    const flattenTree = useCallback((tree: MaterialTreeNode[], level = 0): any[] => {
        let result: any[] = [];
        tree.forEach((node) => {
            const { children, ...material } = node;
            const isExpandableNode = node.is_group || node.is_variant_parent;
            const aggregate = isExpandableNode ? getGroupAggregate(children) : null;
            // A leaf group directly contains materials (no sub-group children)
            const isLeafGroup = isExpandableNode && children
                ? !children.some(c => c.is_group || c.is_variant_parent)
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
        if (treeData.length > 0) {
            return flattenTree(treeData);
        }
        // Fallback: if treeData is empty but materials exist, show flat list
        const nonGroupMaterials = filteredMaterials.filter((m: any) => !m.is_group);
        if (nonGroupMaterials.length > 0) {
            return nonGroupMaterials.map((m: any) => ({ ...m, level: 0 }));
        }
        return [];
    }, [treeData, flattenTree, filteredMaterials]);

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
    const totalLooseStock = useMemo(() => {
        return materials.reduce((acc, m: any) => acc + (m.loose_stock || 0), 0);
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
                        {getLocalizedName(row, language)}
                    </span>
                    {row.is_variant_parent && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-50 text-purple-600 border-purple-200">
                            {getLocalizedLabel('parent', language)}
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'current_stock',
            title: getLocalizedLabel('total_stock', language),
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
                                    {rolls} {getLocalizedLabel('roll_short', language)}
                                </span>
                            )}
                        </div>
                    );
                }

                // Regular material: blue for meters, amber for loose, purple for rolls
                return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {stock > 0 && (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30">
                                {Number(stock).toFixed(2)} {getLocalizedUnit(row.unit, language)}
                            </span>
                        )}
                        {(row.loose_stock || 0) > 0 && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30">
                                {Number(row.loose_stock).toFixed(1)} {getLocalizedLabel('loose', language)}
                            </span>
                        )}
                        {rolls > 0 && (
                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30">
                                {rolls} {getLocalizedLabel('roll_short', language)}
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
                    {getLocalizedName(row.category, language)}
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
            getLocalizedLabel('code_label', language),
            getLocalizedLabel('name_label', language),
            getLocalizedLabel('category_label', language),
            getLocalizedLabel('status_label', language),
        ];

        const rows = filteredMaterials.map(material => [
            material.code || '',
            getLocalizedName(material, language),
            material.category ? getLocalizedName(material.category, language) : '',
            material.is_active ? getLocalizedLabel('active_label', language) : getLocalizedLabel('inactive', language),
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.materials')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
                        {getLocalizedLabel('manage_desc', language)}
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
                        {getLocalizedLabel('add_group', language)}
                    </Button>
                    <Button variant="outline" onClick={() => setShowImportWizard(true)}>
                        <Upload className="w-4 h-4 me-2" />
                        {getLocalizedLabel('import', language)}
                    </Button>
                    <Button variant="teal" onClick={handleAddClick}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('warehouse.material.add')}
                    </Button>
                </div>
            </div>

            {/* Stats — compact to give more space to tree */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard
                    label={getLocalizedLabel('total_materials', language)}
                    value={totalMaterials}
                    icon={BarChart3}
                    size="compact"
                />
                <StatCard
                    label={getLocalizedLabel('active_materials', language)}
                    value={activeMaterials}
                    icon={CheckCircle2}
                    size="compact"
                />
                <StatCard
                    label={getLocalizedLabel('groups', language)}
                    value={groupsCount}
                    icon={Folder}
                    size="compact"
                />
                <StatCard
                    label={getLocalizedLabel('total_stock', language)}
                    value={totalStock.toLocaleString('en-US')}
                    suffix={getLocalizedUnit('meter', language)}
                    subLabel={`${totalRolls} ${getLocalizedLabel('rolls', language)}`}
                    icon={Database}
                    size="compact"
                />
                <StatCard
                    label={getLocalizedLabel('loose_total', language)}
                    value={totalLooseStock.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    suffix={getLocalizedUnit('meter', language)}
                    icon={Package}
                    size="compact"
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
                            placeholder={t('warehouse.searchPlaceholder')}
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
                        {/* Tree Grouping Mode Selector */}
                        {viewMode === 'tree' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-8 px-3 gap-2 border-dashed',
                                            treeGroupMode === 'by_design' && 'border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-400',
                                            treeGroupMode === 'by_color' && 'border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400',
                                            treeGroupMode === 'by_category' && 'border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400',
                                            treeGroupMode === 'flat' && 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
                                        )}
                                    >
                                        {treeGroupMode === 'by_design' && <Palette className="w-4 h-4" />}
                                        {treeGroupMode === 'by_color' && <Paintbrush className="w-4 h-4" />}
                                        {treeGroupMode === 'by_category' && <Folder className="w-4 h-4" />}
                                        {treeGroupMode === 'flat' && <List className="w-4 h-4" />}
                                        {treeGroupMode === 'by_design' && getLocalizedLabel('by_design', language)}
                                        {treeGroupMode === 'by_color' && getLocalizedLabel('by_color', language)}
                                        {treeGroupMode === 'by_category' && getLocalizedLabel('by_category', language)}
                                        {treeGroupMode === 'flat' && getLocalizedLabel('flat_view', language)}
                                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-56">
                                    <DropdownMenuItem
                                        onClick={() => setTreeGroupMode('by_design')}
                                        className={cn(treeGroupMode === 'by_design' && 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400')}
                                    >
                                        <Palette className="w-4 h-4 me-2 text-purple-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getLocalizedLabel('by_design', language)}</span>
                                            <span className="text-[10px] text-gray-400">{getLocalizedLabel('by_design_desc', language)}</span>
                                        </div>
                                        {treeGroupMode === 'by_design' && <CheckCircle2 className="w-4 h-4 ms-auto text-purple-500" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setTreeGroupMode('by_color')}
                                        className={cn(treeGroupMode === 'by_color' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400')}
                                    >
                                        <Paintbrush className="w-4 h-4 me-2 text-blue-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getLocalizedLabel('by_color', language)}</span>
                                            <span className="text-[10px] text-gray-400">{getLocalizedLabel('by_color_desc', language)}</span>
                                        </div>
                                        {treeGroupMode === 'by_color' && <CheckCircle2 className="w-4 h-4 ms-auto text-blue-500" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setTreeGroupMode('by_category')}
                                        className={cn(treeGroupMode === 'by_category' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400')}
                                    >
                                        <Folder className="w-4 h-4 me-2 text-emerald-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getLocalizedLabel('by_category', language)}</span>
                                            <span className="text-[10px] text-gray-400">{getLocalizedLabel('by_category_desc', language)}</span>
                                        </div>
                                        {treeGroupMode === 'by_category' && <CheckCircle2 className="w-4 h-4 ms-auto text-emerald-500" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setTreeGroupMode('flat')}
                                        className={cn(treeGroupMode === 'flat' && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')}
                                    >
                                        <List className="w-4 h-4 me-2 text-gray-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getLocalizedLabel('flat_view', language)}</span>
                                            <span className="text-[10px] text-gray-400">{getLocalizedLabel('flat_view_desc', language)}</span>
                                        </div>
                                        {treeGroupMode === 'flat' && <CheckCircle2 className="w-4 h-4 ms-auto text-gray-500" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

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
                                {getLocalizedLabel('tree_view', language)}
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
                                {getLocalizedLabel('table_view', language)}
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
                                        {getLocalizedLabel('hide_zero', language)}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <Switch
                                        id="low-stock"
                                        checked={lowStockOnly}
                                        onCheckedChange={setLowStockOnly}
                                    />
                                    <Label htmlFor="low-stock" className="text-sm cursor-pointer text-amber-600 dark:text-amber-500">
                                        {getLocalizedLabel('low_stock', language)}
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tree View or Table View */}
            {!loading && materials.length === 0 ? (
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-10 text-center">
                    <div className="max-w-lg mx-auto space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-erp-teal to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-erp-teal/20">
                                <Package className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-cairo">
                                {getLocalizedLabel('no_materials', language)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-tajawal">
                                {getLocalizedLabel('no_materials_desc', language)}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Button
                                variant="default"
                                size="lg"
                                className="bg-gradient-to-r from-erp-teal to-emerald-600 hover:from-erp-teal/90 hover:to-emerald-600/90 text-white shadow-lg shadow-erp-teal/20 gap-2"
                                onClick={() => setShowImportWizard(true)}
                            >
                                <Upload className="w-5 h-5" />
                                {getLocalizedLabel('import_excel', language)}
                            </Button>
                            <Button variant="outline" size="lg" className="gap-2" onClick={handleAddClick}>
                                <Plus className="w-5 h-5" />
                                {getLocalizedLabel('add_material', language)}
                            </Button>
                            <Button variant="outline" size="lg" className="gap-2" onClick={handleAddGroup}>
                                <FolderPlus className="w-5 h-5" />
                                {getLocalizedLabel('create_group', language)}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-tajawal">
                            {getLocalizedLabel('import_hint', language)}
                        </p>
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
                documentId={selectedMaterial?.id}
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
                    parent_name: selectedParent ? getLocalizedName(selectedParent, language) : null,
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
                documentId={selectedGroup?.id}
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
            {/* Import Wizard */}
            {showImportWizard && (
                <ImportWizard
                    defaultEntityType="products"
                    onClose={() => {
                        setShowImportWizard(false);
                        invalidateMaterials();
                        invalidateGroups();
                    }}
                    onComplete={() => {
                        setShowImportWizard(false);
                        invalidateMaterials();
                        invalidateGroups();
                    }}
                />
            )}
        </div>
    );
}

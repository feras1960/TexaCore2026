/**
 * ════════════════════════════════════════════════════════════════
 * 🌲 Warehouse Tree View — RTL-aware
 * شجرة المستودعات بنفس نمط MaterialTree:
 *  - RTL: شجرة على اليمين، تفاصيل على اليسار
 *  - LTR: شجرة على اليسار، تفاصيل على اليمين
 *  - Resizable panels, TreeNode, full details panel
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    ChevronRight,
    ChevronDown,
    Building2,
    Warehouse as WarehouseIcon,
    MapPin,
    Plus,
    MoreHorizontal,
    Layers,
    Box,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';

// ─── Types ──────────────────────────────────────────────────────
export interface WarehouseTreeItem {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string | null;
    warehouse_type: string;
    branch_id?: string | null;
    is_active: boolean;
    is_main?: boolean;
    locations_count?: number;
    rolls_count?: number;
}

export interface BranchTreeItem {
    id: string;
    code?: string;
    name_ar?: string;
    name_en?: string;
    city?: string;
    branch_type?: string;
    is_main?: boolean;
    is_active?: boolean;
    warehouses?: WarehouseTreeItem[];
}

interface TreeNode {
    id: string;
    type: 'branch' | 'warehouse';
    code?: string;
    name_ar: string;
    name_en?: string | null;
    city?: string;
    is_main?: boolean;
    is_active?: boolean;
    warehouse_type?: string;
    locations_count?: number;
    rolls_count?: number;
    children?: TreeNode[];
}

interface WarehouseTreeProps {
    warehouses: WarehouseTreeItem[];
    branches: BranchTreeItem[];
    onWarehouseEdit?: (wh: WarehouseTreeItem) => void;
    onWarehouseAdd?: (branchId?: string) => void;
    onWarehouseClick?: (wh: WarehouseTreeItem) => void;
    onWarehouseDelete?: (wh: WarehouseTreeItem) => void;
    onBranchDelete?: (branchId: string) => void;
    loading?: boolean;
    className?: string;
    expandAllCount?: number;
    collapseAllCount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────
const getName = (node: { name_ar: string; name_en?: string | null }, lang: string) =>
    lang === 'ar' ? node.name_ar : (node.name_en || node.name_ar);

const getTypeLabel = (type: string, isAr: boolean): string => {
    const labels: Record<string, [string, string]> = {
        main: ['رئيسي', 'Main'],
        branch: ['فرعي', 'Branch'],
        store: ['متجر', 'Store'],
        regular: ['عادي', 'Regular'],
        offline_market: ['سوق', 'Market'],
        van: ['شاحنة', 'Van'],
    };
    const [ar, en] = labels[type] || [type, type];
    return isAr ? ar : en;
};

const getTypeBadgeClass = (type: string): string => {
    switch (type) {
        case 'main': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'branch': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'store': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'offline_market': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'van': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
};

// ─── TreeNodeRow Component ───────────────────────────────────────
function TreeNodeRow({
    node,
    level = 0,
    onToggle,
    onSelect,
    expanded,
    selectedId,
    language,
    isRTL,
    onEdit,
    onAdd,
    onDelete,
}: {
    node: TreeNode;
    level?: number;
    onToggle: (id: string) => void;
    onSelect: (node: TreeNode) => void;
    expanded: Set<string>;
    selectedId?: string | null;
    language: string;
    isRTL: boolean;
    onEdit?: (node: TreeNode) => void;
    onAdd?: (branchId: string) => void;
    onDelete?: (node: TreeNode) => void;
}) {
    const isExpanded = expanded.has(node.id);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isSelected = selectedId === node.id;
    const isBranch = node.type === 'branch';
    const displayName = getName(node, language);

    const branchTotalLocations = useMemo(() => {
        if (!isBranch || !node.children) return 0;
        return node.children.reduce((s, c) => s + (c.locations_count || 0), 0);
    }, [node, isBranch]);

    return (
        <div className="select-none">
            <div
                className={cn(
                    'flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-all duration-200 group',
                    isSelected
                        ? 'bg-erp-navy/10 dark:bg-erp-navy/30 text-erp-navy dark:text-white shadow-sm border border-erp-navy/20 dark:border-erp-navy/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-sm',
                    !node.is_active && 'opacity-60'
                )}
                style={{ paddingInlineStart: `${level * 24 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                    if (hasChildren && !isExpanded) onToggle(node.id);
                }}
            >
                {/* Toggle chevron */}
                <div
                    className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-400 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren || isBranch) onToggle(node.id);
                    }}
                >
                    {(hasChildren || isBranch) ? (
                        isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : isRTL
                                ? <ChevronRight className="w-4 h-4 rotate-180" />
                                : <ChevronRight className="w-4 h-4" />
                    ) : (
                        <div className="w-4 h-4" />
                    )}
                </div>

                {/* Icon */}
                {isBranch
                    ? <Building2 className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-erp-navy dark:text-white' : 'text-indigo-500 dark:text-indigo-400')} />
                    : <WarehouseIcon className={cn('w-4 h-4 flex-shrink-0', isSelected ? 'text-erp-navy dark:text-white' : 'text-blue-400 dark:text-blue-500')} />
                }

                {/* Code */}
                {node.code && (
                    <span className={cn(
                        'text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded',
                        isSelected
                            ? 'bg-erp-navy/20 dark:bg-erp-navy/40 text-erp-navy dark:text-white font-semibold'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}>
                        {node.code}
                    </span>
                )}

                {/* Name */}
                <span className={cn(
                    'font-medium text-sm font-tajawal truncate flex-1',
                    isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-700 dark:text-gray-300'
                )}>
                    {displayName}
                </span>

                {/* Stats */}
                <div className="flex gap-1.5 mx-2 items-center flex-shrink-0">
                    {isBranch && node.city && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
                            <MapPin className="w-2.5 h-2.5" />
                            {node.city}
                        </span>
                    )}
                    {isBranch && (node.children?.length ?? 0) > 0 && (
                        <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full',
                            isSelected ? 'bg-erp-teal/20 text-erp-teal' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        )}>
                            {node.children!.length}
                        </span>
                    )}
                    {isBranch && branchTotalLocations > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30">
                            Σ{branchTotalLocations}
                        </span>
                    )}
                    {!isBranch && (node.locations_count ?? 0) > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30">
                            {node.locations_count} {language === 'ar' ? 'موقع' : 'bins'}
                        </span>
                    )}
                </div>

                {/* Actions (hover) */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isBranch && onAdd && (
                        <Button
                            variant="ghost" size="sm"
                            className="h-6 w-6 p-0 text-erp-teal hover:bg-erp-teal/10"
                            onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44 z-[50]">
                            {onEdit && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
                                    <Edit className="w-4 h-4 me-2" />
                                    {language === 'ar' ? 'تعديل' : 'Edit'}
                                </DropdownMenuItem>
                            )}
                            {isBranch && onAdd && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}>
                                    <Plus className="w-4 h-4 me-2" />
                                    {language === 'ar' ? 'إضافة مستودع' : 'Add Warehouse'}
                                </DropdownMenuItem>
                            )}
                            {!isBranch && onDelete && (node.locations_count ?? 0) === 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                                        className="text-red-600 dark:text-red-400 focus:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4 me-2" />
                                        {language === 'ar' ? 'حذف' : 'Delete'}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Children */}
            {isExpanded && node.children && (
                <div className="border-s-2 border-gray-100 dark:border-gray-800 ms-3 ps-1">
                    {node.children.map((child) => (
                        <TreeNodeRow
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            expanded={expanded}
                            selectedId={selectedId}
                            language={language}
                            isRTL={isRTL}
                            onEdit={onEdit}
                            onAdd={onAdd}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────
export function WarehouseTreeView({
    warehouses,
    branches,
    onWarehouseEdit,
    onWarehouseAdd,
    onWarehouseClick,
    onWarehouseDelete,
    onBranchDelete,
    loading,
    className,
    expandAllCount = 0,
    collapseAllCount = 0,
}: WarehouseTreeProps) {
    const { language, direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isAr = language === 'ar';

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // ── Build tree ──────────────────────────────────────────────
    const treeData = useMemo((): TreeNode[] => {
        const branchMap = new Map<string, WarehouseTreeItem[]>();
        const unassigned: WarehouseTreeItem[] = [];

        warehouses.forEach(wh => {
            if (wh.branch_id) {
                if (!branchMap.has(wh.branch_id)) branchMap.set(wh.branch_id, []);
                branchMap.get(wh.branch_id)!.push(wh);
            } else {
                unassigned.push(wh);
            }
        });

        const result: TreeNode[] = [];

        branches.forEach(b => {
            const branchWarehouses = branchMap.get(b.id) || [];

            // Skip branches with no name AND no warehouses — they're orphan DB records
            const hasName = !!(b.name_ar?.trim() || b.name_en?.trim());
            const hasWarehouses = branchWarehouses.length > 0;
            if (!hasName && !hasWarehouses) return;

            result.push({
                id: b.id,
                type: 'branch',
                code: b.code,
                name_ar: b.name_ar?.trim() || (isAr ? 'فرع بدون اسم' : 'Unnamed Branch'),
                name_en: b.name_en,
                city: b.city,
                is_main: b.is_main,
                is_active: b.is_active !== false,
                children: branchWarehouses.map(wh => ({
                    id: wh.id,
                    type: 'warehouse' as const,
                    code: wh.code,
                    name_ar: wh.name_ar,
                    name_en: wh.name_en,
                    warehouse_type: wh.warehouse_type,
                    is_main: wh.is_main,
                    is_active: wh.is_active,
                    locations_count: wh.locations_count,
                    rolls_count: wh.rolls_count,
                })),
            });
        });

        branchMap.forEach((whs, branchId) => {
            if (!branches.find(b => b.id === branchId)) {
                result.push({
                    id: branchId,
                    type: 'branch',
                    name_ar: isAr ? 'فرع غير معرّف' : 'Unknown Branch',
                    is_active: true,
                    children: whs.map(wh => ({
                        id: wh.id,
                        type: 'warehouse' as const,
                        code: wh.code,
                        name_ar: wh.name_ar,
                        name_en: wh.name_en,
                        warehouse_type: wh.warehouse_type,
                        is_active: wh.is_active,
                        locations_count: wh.locations_count,
                    })),
                });
            }
        });

        if (unassigned.length > 0) {
            result.push({
                id: '__unassigned__',
                type: 'branch',
                name_ar: isAr ? 'بدون فرع' : 'No Branch',
                is_active: true,
                children: unassigned.map(wh => ({
                    id: wh.id,
                    type: 'warehouse' as const,
                    code: wh.code,
                    name_ar: wh.name_ar,
                    name_en: wh.name_en,
                    warehouse_type: wh.warehouse_type,
                    is_active: wh.is_active,
                    locations_count: wh.locations_count,
                })),
            });
        }
        return result;
    }, [warehouses, branches, isAr]);

    useEffect(() => {
        if (initializedRef.current || treeData.length === 0) return;
        initializedRef.current = true;
        setExpandedIds(new Set(treeData.map(n => n.id)));
    }, [treeData]);

    useEffect(() => {
        if (expandAllCount === 0) return;
        const all = new Set<string>();
        const collect = (nodes: TreeNode[]) => nodes.forEach(n => { all.add(n.id); if (n.children) collect(n.children); });
        collect(treeData);
        setExpandedIds(all);
    }, [expandAllCount]);

    useEffect(() => {
        if (collapseAllCount === 0) return;
        setExpandedIds(new Set());
    }, [collapseAllCount]);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedIds(next);
    };

    const handleNodeSelect = (node: TreeNode) => {
        setSelectedId(node.id);
        if (node.type === 'branch') {
            if (!expandedIds.has(node.id) && (node.children?.length ?? 0) > 0) toggleExpand(node.id);
            return;
        }
        const original = warehouses.find(w => w.id === node.id);
        if (original && onWarehouseClick) onWarehouseClick(original);
    };

    const selectedNode = useMemo(() => {
        const find = (nodes: TreeNode[]): TreeNode | null => {
            for (const n of nodes) {
                if (n.id === selectedId) return n;
                if (n.children) { const f = find(n.children); if (f) return f; }
            }
            return null;
        };
        return selectedId ? find(treeData) : null;
    }, [selectedId, treeData]);

    const isBranchSelected = selectedNode?.type === 'branch';
    const panelWarehouses = isBranchSelected ? (selectedNode?.children || []) : (selectedNode ? [selectedNode] : []);

    const handleTreeEdit = (node: TreeNode) => {
        if (node.type === 'warehouse') {
            const original = warehouses.find(w => w.id === node.id);
            if (original && onWarehouseEdit) onWarehouseEdit(original);
        }
    };

    const handleTreeDelete = (node: TreeNode) => {
        if (node.type === 'warehouse') {
            const original = warehouses.find(w => w.id === node.id);
            if (original && onWarehouseDelete) onWarehouseDelete(original);
        }
    };

    // ─── Tree Panel JSX ────────────────────────────────────────
    const treePanelJSX = (
        <div className="h-full overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-800/20" dir={direction}>
            {treeData.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    {isAr ? 'لا توجد بيانات' : 'No data available'}
                </div>
            ) : treeData.map(node => (
                <TreeNodeRow
                    key={node.id}
                    node={node}
                    onToggle={toggleExpand}
                    onSelect={handleNodeSelect}
                    expanded={expandedIds}
                    selectedId={selectedId}
                    language={language}
                    isRTL={isRTL}
                    onEdit={handleTreeEdit}
                    onAdd={onWarehouseAdd}
                    onDelete={handleTreeDelete}
                />
            ))}
        </div>
    );

    // ─── Details Panel JSX ─────────────────────────────────────
    const detailsPanelJSX = (
        <div className="h-full overflow-y-auto bg-white dark:bg-gray-900" dir={direction}>
            {selectedNode ? (
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className={cn(
                            'p-2 rounded-lg',
                            isBranchSelected ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        )}>
                            {isBranchSelected ? <Building2 className="w-8 h-8" /> : <WarehouseIcon className="w-8 h-8" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo truncate">
                                {getName(selectedNode, language)}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                {selectedNode.code && <span className="font-mono">{selectedNode.code}</span>}
                                {selectedNode.city && (
                                    <span className="flex items-center gap-1">
                                        <span>•</span>
                                        <MapPin className="w-3 h-3" />
                                        {selectedNode.city}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isBranchSelected && onWarehouseAdd && (
                                <Button onClick={() => onWarehouseAdd(selectedNode.id)} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    {isAr ? 'إضافة مستودع' : 'Add Warehouse'}
                                </Button>
                            )}
                            {!isBranchSelected && onWarehouseEdit && (
                                <Button variant="outline" onClick={() => handleTreeEdit(selectedNode)} className="gap-2">
                                    <Edit className="w-4 h-4" />
                                    {isAr ? 'تعديل' : 'Edit'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Branch: list warehouses */}
                    {isBranchSelected && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                {isAr ? 'المستودعات' : 'Warehouses'} ({panelWarehouses.length})
                            </h3>
                            {panelWarehouses.length > 0 ? panelWarehouses.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        const original = warehouses.find(w => w.id === item.id);
                                        if (original && onWarehouseClick) onWarehouseClick(original);
                                    }}
                                >
                                    <WarehouseIcon className={cn('w-5 h-5 me-3 flex-shrink-0', item.is_main ? 'text-blue-500' : 'text-gray-400')} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white truncate">{getName(item, language)}</span>
                                            {!item.is_active && (
                                                <span className="text-[10px] px-1.5 bg-red-100 text-red-500 rounded">{isAr ? 'موقوف' : 'Inactive'}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{item.code}</div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 flex-shrink-0">
                                        {item.warehouse_type && (
                                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', getTypeBadgeClass(item.warehouse_type))}>
                                                {getTypeLabel(item.warehouse_type, isAr)}
                                            </span>
                                        )}
                                        {(item.locations_count ?? 0) > 0 && (
                                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30">
                                                {item.locations_count} {isAr ? 'موقع' : 'bins'}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronRight className={cn('w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100', isRTL && 'rotate-180')} />
                                </div>
                            )) : (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                    <Box className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-500 mb-3">{isAr ? 'لا توجد مستودعات في هذا الفرع' : 'No warehouses in this branch'}</p>
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        {onWarehouseAdd && (
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => onWarehouseAdd(selectedNode.id)}>
                                                <Plus className="w-3.5 h-3.5" />
                                                {isAr ? 'إضافة مستودع' : 'Add Warehouse'}
                                            </Button>
                                        )}
                                        {onBranchDelete && selectedNode.id !== '__unassigned__' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                                onClick={() => onBranchDelete(selectedNode.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {isAr ? 'حذف الفرع' : 'Delete Branch'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warehouse: details */}
                    {!isBranchSelected && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{isAr ? 'معلومات المستودع' : 'Warehouse Info'}</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'النوع' : 'Type'}</span>
                                            {selectedNode.warehouse_type && (
                                                <span className={cn('text-xs font-medium px-2 py-1 rounded', getTypeBadgeClass(selectedNode.warehouse_type))}>
                                                    {getTypeLabel(selectedNode.warehouse_type, isAr)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'الحالة' : 'Status'}</span>
                                            <span className={cn('flex items-center gap-1 text-sm font-medium', selectedNode.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                                                {selectedNode.is_active
                                                    ? <><CheckCircle2 className="w-4 h-4" /> {isAr ? 'نشط' : 'Active'}</>
                                                    : <><XCircle className="w-4 h-4" /> {isAr ? 'موقوف' : 'Inactive'}</>
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{isAr ? 'إحصاءات المواقع' : 'Location Stats'}</h4>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'مواقع التخزين' : 'Storage Bins'}</span>
                                        <span className="font-mono font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded">
                                            {selectedNode.locations_count ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                                <Button onClick={() => handleTreeEdit(selectedNode)}>
                                    {isAr ? 'تعديل المستودع' : 'Edit Warehouse'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Layers className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-tajawal">{isAr ? 'اختر فرعاً أو مستودعاً لعرض التفاصيل' : 'Select a branch or warehouse to view details'}</p>
                </div>
            )}
        </div>
    );

    // ─── Loading ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{isAr ? 'جارٍ تحميل الشجرة...' : 'Loading tree...'}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-200px)]',
                className
            )}
        >
            <ResizablePanelGroup
                direction="horizontal"
                autoSaveId={isRTL ? 'warehouse-tree-layout-rtl' : 'warehouse-tree-layout-ltr'}
            >
                {/*
                 * Tree is ALWAYS first in DOM.
                 * The parent div (WarehouseListPage) has dir="rtl" which is inherited here.
                 * With dir="rtl": first panel (Tree) → RIGHT ✓, second (Details) → LEFT ✓
                 * With dir="ltr": first panel (Tree) → LEFT ✓, second (Details) → RIGHT ✓
                 * No conditional swapping needed — dir does the work automatically.
                 */}
                <ResizablePanel
                    defaultSize={38}
                    minSize={25}
                    maxSize={60}
                    className="border-e border-gray-100 dark:border-gray-800"
                >
                    {treePanelJSX}
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={62}>
                    {detailsPanelJSX}
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    );
}

export default WarehouseTreeView;

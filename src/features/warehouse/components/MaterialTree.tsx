import React, { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getLocalizedName } from '@/lib/utils/getLocalizedName';
import { getLocalizedUnit, getLocalizedLabel } from '@/lib/utils/getLocalizedUnit';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, Package, Plus, Trash2, MoreHorizontal, Layers, Archive, CheckCircle2, Box, Eye } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// Types
interface MaterialTreeNode {
    [key: string]: any;
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    is_group?: boolean;
    is_active?: boolean;
    parent_id?: string | null;
    children?: MaterialTreeNode[];
    current_stock?: number;
    unit?: string;
    description?: string;
    category?: { name_ar: string; name_en?: string };
    // Stats from RPC
    rolls_count?: number;
    rolls_total_length?: number;
    loose_stock?: number;
    // Variant properties
    is_variant_parent?: boolean;
    variant_id?: string;
    variant_data?: Record<string, any>;
    parent_material_id?: string;
    is_virtual_group?: boolean;
    custom_fields?: Record<string, any>;
    has_variants?: boolean;
}

interface MaterialTreeProps {
    data: MaterialTreeNode[];
    onNodeClick?: (node: any) => void;
    onAddChild?: (parent: any) => void;
    onEdit?: (node: any) => void;
    onDelete?: (node: any) => void;
    className?: string;
    height?: string;
    expandAllCount?: number;   // increment to expand all
    collapseAllCount?: number; // increment to collapse all
}

// Helper to get name based on language (supports all 9 languages)
const getName = (node: any, lang: string) => {
    return getLocalizedName(node, lang);
};

// Helper for group stock aggregation
export const getGroupAggregate = (children?: MaterialTreeNode[]): { stock: number, rolls: number, loose: number } => {
    if (!children || children.length === 0) return { stock: 0, rolls: 0, loose: 0 };
    return children.reduce((acc, child) => {
        let childData = {
            stock: child.current_stock || child.rolls_total_length || 0,
            rolls: child.rolls_count || 0,
            loose: child.loose_stock || 0,
        };
        // تجميع من المجموعات والمواد الأم (variant parents)
        if ((child.is_group || child.is_variant_parent || child.is_virtual_group) && child.children) {
            const nested = getGroupAggregate(child.children);
            childData.stock += nested.stock;
            childData.rolls += nested.rolls;
            childData.loose += nested.loose;
        }
        return {
            stock: acc.stock + childData.stock,
            rolls: acc.rolls + childData.rolls,
            loose: acc.loose + childData.loose,
        };
    }, { stock: 0, rolls: 0, loose: 0 });
};

// TreeNode component
function TreeNode({
    node,
    level = 0,
    onToggle,
    onSelect,
    expanded,
    selectedId,
    t,
    language,
    onDelete,
    onAddChild,
    onEdit,
}: {
    node: MaterialTreeNode;
    level?: number;
    onToggle: (id: string) => void;
    onSelect: (node: MaterialTreeNode) => void;
    expanded: Set<string>;
    selectedId?: string | null;
    t: (key: string) => string;
    language: string;
    onDelete?: (node: any) => void;
    onAddChild?: (parent: any) => void;
    onEdit?: (node: any) => void;
}) {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;
    const displayName = getName(node, language);
    // هل هذا عنصر قابل للتوسيع (مجموعة أو مادة أم أو تجميع بصري)?
    const isExpandable = node.is_group || node.is_variant_parent || node.is_virtual_group;
    // هل هذا متغير فرعي (مادة ابن)?
    const isVariantChild = !!node.variant_id && !!node.parent_material_id;
    // color_hex من variant_data أو custom_fields
    const colorHex = node.custom_fields?.color_hex 
        || (node.variant_data ? Object.values(node.variant_data).find((v: any) => v?.color_hex)?.color_hex : null);

    // Aggregate values for groups and variant parents
    const aggregateData = useMemo(() => {
        if (!isExpandable || !node.children) return { stock: 0, rolls: 0, loose: 0 };
        return getGroupAggregate(node.children);
    }, [node, isExpandable]);

    // A "leaf group" is one that directly contains materials (no sub-groups among its children)
    const isLeafGroup = useMemo(() => {
        if (!isExpandable || !node.children) return false;
        return !node.children.some(c => c.is_group || c.is_variant_parent || c.is_virtual_group);
    }, [node, isExpandable]);

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
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isExpandable) onToggle(node.id);
                    else if (onEdit) onEdit(node);
                }}
            >
                <div
                    className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren || isExpandable) onToggle(node.id);
                    }}
                >
                    {(hasChildren || isExpandable) ? (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : ['ar', 'he', 'fa', 'ur'].includes(language) ? (
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )
                    ) : (
                        <div className="w-4 h-4" />
                    )}
                </div>

                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {/* أيقونة العقدة */}
                    {node.is_group ? (
                        <Folder
                            className={cn(
                                'w-4 h-4 flex-shrink-0 transition-colors',
                                isSelected ? 'text-erp-navy dark:text-white' : 'text-amber-400 dark:text-amber-500'
                            )}
                        />
                    ) : node.is_variant_parent ? (
                        <Folder className={cn(
                            'w-4 h-4 flex-shrink-0 transition-colors',
                            isSelected ? 'text-white' : 'text-purple-500 dark:text-purple-400'
                        )} />
                    ) : node.is_virtual_group ? (
                        <Folder className={cn(
                            'w-4 h-4 flex-shrink-0 transition-colors',
                            isSelected ? 'text-white' : 'text-purple-300 dark:text-purple-500'
                        )} />
                    ) : isVariantChild ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {colorHex ? (
                                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0" 
                                      style={{ backgroundColor: colorHex }} />
                            ) : (
                                <Package className="w-4 h-4 text-purple-300 dark:text-purple-500" />
                            )}
                        </div>
                    ) : (
                        <Package className="w-4 h-4 flex-shrink-0 text-blue-400 dark:text-blue-500" />
                    )}

                    {/* Show code only when it's short (not auto-generated variant codes) */}
                    {node.code && node.code.length <= 15 && (
                        <span className={cn(
                            'text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded transition-colors',
                            isSelected
                                ? 'bg-erp-navy/20 dark:bg-erp-navy/40 text-erp-navy dark:text-white font-semibold'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        )}>
                            {node.code}
                        </span>
                    )}

                    <span className={cn(
                        'font-medium text-sm font-tajawal truncate transition-colors flex-1',
                        isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    )}>
                        {displayName}
                    </span>

                    {/* Stock Display — للمواد العادية والمتغيرات الفرعية */}
                    {!isExpandable && (
                        <div className="flex gap-1.5 mx-2">
                            {((node.current_stock || 0) > 0 || (node.rolls_total_length || 0) > 0) && (
                                <span className={cn(
                                    "text-xs font-mono font-bold px-1.5 py-0.5 rounded transition-colors",
                                    isSelected ? "text-blue-50 bg-blue-900/40" : "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
                                )}>
                                    {Number(node.current_stock || node.rolls_total_length || 0).toFixed(2)} {getLocalizedUnit(node.unit, language)}
                                </span>
                            )}
                            {(node.loose_stock || 0) > 0 && (
                                <span className={cn(
                                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors",
                                    isSelected ? "text-amber-50 bg-amber-900/40" : "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30"
                                )}>
                                    {Number(node.loose_stock).toFixed(1)} {getLocalizedLabel('loose', language)}
                                </span>
                            )}
                            {(node.rolls_count || 0) > 0 && (
                                <span className={cn(
                                    "text-xs font-mono font-bold px-1.5 py-0.5 rounded transition-colors",
                                    isSelected ? "text-purple-50 bg-purple-900/40" : "text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30"
                                )}>
                                    {node.rolls_count} {getLocalizedLabel('roll_short', language)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Aggregate Count Badge — للمجموعات والمواد الأم */}
                    {isExpandable && (
                        <div className="flex gap-1.5 mx-2 items-center">
                            {aggregateData.stock > 0 && (
                                <span className={cn(
                                    "text-xs font-mono px-1.5 py-0.5 rounded transition-colors",
                                    isLeafGroup
                                        ? isSelected
                                            ? "text-emerald-50 bg-emerald-900/50 font-semibold"
                                            : node.is_variant_parent
                                                ? "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 font-semibold"
                                                : "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 font-semibold"
                                        : isSelected
                                            ? "text-gray-300 bg-gray-700/60"
                                            : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                )}>
                                    {!isLeafGroup && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                    {Number(aggregateData.stock).toFixed(2)} {getLocalizedUnit('meter', language)}
                                </span>
                            )}
                            {aggregateData.loose > 0 && (
                                <span className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
                                    isLeafGroup
                                        ? isSelected
                                            ? "text-amber-50 bg-amber-900/50 font-semibold"
                                            : "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 font-semibold"
                                        : isSelected
                                            ? "text-gray-300 bg-gray-700/60"
                                            : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                )}>
                                    {!isLeafGroup && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                    {Number(aggregateData.loose).toFixed(0)} {getLocalizedLabel('loose', language)}
                                </span>
                            )}
                            {aggregateData.rolls > 0 && (
                                <span className={cn(
                                    "text-xs font-mono px-1.5 py-0.5 rounded transition-colors",
                                    isLeafGroup
                                        ? isSelected
                                            ? "text-purple-50 bg-purple-900/50 font-semibold"
                                            : "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 font-semibold"
                                        : isSelected
                                            ? "text-gray-300 bg-gray-700/60"
                                            : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                )}>
                                    {!isLeafGroup && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                    {aggregateData.rolls} {getLocalizedLabel('roll_short', language)}
                                </span>
                            )}
                            {node.children && node.children.length > 0 && (
                                <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
                                    node.is_variant_parent
                                        ? isSelected
                                            ? 'bg-purple-200/30 text-purple-200'
                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                        : isSelected
                                            ? 'bg-erp-teal/20 text-erp-teal dark:bg-erp-teal/30 dark:text-erp-teal'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                )}>
                                    {node.children.length}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* زر التفاصيل للمادة الأم */}
                    {node.is_variant_parent && onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(node);
                            }}
                            title={getLocalizedLabel('mat_details', language)}
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    {(node.is_group && !node.is_variant_parent) && onAddChild && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-erp-teal hover:bg-erp-teal/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(node);
                            }}
                            title={getLocalizedLabel('add_material', language)}
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
                        <DropdownMenuContent align="end" className="w-48 z-[50]">
                            {onEdit && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
                                    <Layers className="w-4 h-4 me-2" />
                                    {getLocalizedLabel('edit', language)}
                                </DropdownMenuItem>
                            )}
                            {onAddChild && node.is_group && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddChild(node); }}>
                                    <Plus className="w-4 h-4 me-2" />
                                    {getLocalizedLabel('add_child', language)}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {onDelete && (
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                                    className="text-red-600 dark:text-red-400 focus:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 me-2" />
                                    {getLocalizedLabel('delete', language)}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && node.children && (
                <div className={cn(
                    "border-s-2 ms-3 ps-1",
                    node.is_variant_parent
                        ? "border-purple-200 dark:border-purple-800"
                        : "border-gray-100 dark:border-gray-800"
                )}>
                    {node.children
                        .map((child) => (
                            <TreeNode
                                key={child.id}
                                node={child}
                                level={level + 1}
                                onToggle={onToggle}
                                onSelect={onSelect}
                                expanded={expanded}
                                selectedId={selectedId}
                                t={t}
                                language={language}
                                onDelete={onDelete}
                                onAddChild={onAddChild}
                                onEdit={onEdit}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}

export function MaterialTree({
    data,
    onNodeClick,
    onAddChild,
    onEdit,
    onDelete,
    className,
    height,
    expandAllCount = 0,
    collapseAllCount = 0,
}: MaterialTreeProps) {
    const { t, direction, language } = useLanguage();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // Auto-expand first level ONCE on first load
    useEffect(() => {
        if (initializedRef.current) return;
        if (data.length === 0) return;
        initializedRef.current = true;
        const firstLevel = new Set<string>();
        data.forEach(node => { if (node.is_group) firstLevel.add(node.id); });
        setExpandedIds(firstLevel);
    }, [data]);

    // Expand ALL recursively — triggered by counter increment
    useEffect(() => {
        if (expandAllCount === 0) return;
        const allGroupIds = new Set<string>();
        const addGroupIds = (nodes: MaterialTreeNode[]) => {
            nodes.forEach(node => {
                if (node.is_group || node.is_variant_parent || node.is_virtual_group) {
                    allGroupIds.add(node.id);
                    if (node.children) addGroupIds(node.children);
                }
            });
        };
        addGroupIds(data);
        setExpandedIds(allGroupIds);
    }, [expandAllCount]); // do NOT add `data` — counter is the only trigger

    // Collapse ALL — triggered by counter increment
    useEffect(() => {
        if (collapseAllCount === 0) return;
        setExpandedIds(new Set());
    }, [collapseAllCount]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const handleNodeSelect = (node: MaterialTreeNode) => {
        setSelectedId(node.id);
        // للمجموعات العادية: توسيع فقط (لا تفتح شيت)
        if (node.is_group && !node.is_variant_parent) {
            if (!expandedIds.has(node.id) && node.children && node.children.length > 0) {
                toggleExpand(node.id);
            }
            return;
        }
        // للمادة الأم: توسيع فقط (مثل المجموعة) — التفاصيل عبر زر Eye
        if (node.is_variant_parent) {
            if (!expandedIds.has(node.id) && node.children && node.children.length > 0) {
                toggleExpand(node.id);
            }
            return;
        }
        // للتجميع البصري: توسيع فقط
        if (node.is_virtual_group) {
            toggleExpand(node.id);
            return;
        }
        // للمواد العادية والمتغيرات: فتح الشيت
        if (onNodeClick) onNodeClick(node);
    };

    // Derived state for the right panel (selected group content)
    const selectedNode = useMemo(() => {
        if (!selectedId) return null;
        const findNode = (nodes: MaterialTreeNode[]): MaterialTreeNode | null => {
            for (const node of nodes) {
                if (node.id === selectedId) return node;
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNode(data);
    }, [selectedId, data]);

    const rightPanelItems = (selectedNode?.is_group || selectedNode?.is_variant_parent || selectedNode?.is_virtual_group)
        ? (selectedNode.children || []) 
        : (selectedNode ? [selectedNode] : []);
    const isGroupSelected = selectedNode?.is_group || selectedNode?.is_virtual_group;
    const isVariantParentSelected = selectedNode?.is_variant_parent;

    return (
        <div className={cn("rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-200px)]", className)}>
            <ResizablePanelGroup direction="horizontal" autoSaveId="materials-tree-layout">
                {/* Tree Panel */}
                <ResizablePanel defaultSize={40} minSize={25} maxSize={60} className="border-e border-gray-100 dark:border-gray-800">
                    <div className="h-full overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-800/20" dir={direction}>
                        {data.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                {getLocalizedLabel('no_data', language)}
                            </div>
                        ) : (
                            data.map(node => (
                                <TreeNode
                                    key={node.id}
                                    node={node}
                                    onToggle={toggleExpand}
                                    onSelect={handleNodeSelect}
                                    expanded={expandedIds}
                                    selectedId={selectedId}
                                    t={t}
                                    language={language}
                                    onDelete={onDelete}
                                    onAddChild={onAddChild}
                                    onEdit={onEdit}
                                />
                            ))
                        )}
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Details Panel */}
                <ResizablePanel defaultSize={60}>
                    <div className="h-full overflow-y-auto bg-white dark:bg-gray-900 flex flex-col">
                        {selectedNode ? (
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className={cn("p-2 rounded-lg", isGroupSelected ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600")}>
                                        {isGroupSelected ? <Folder className="w-8 h-8" /> : <Package className="w-8 h-8" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-cairo">
                                            {getName(selectedNode, language)}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 font-mono">
                                            <span>{selectedNode.code}</span>
                                            {selectedNode.category && (
                                                <>
                                                    <span>•</span>
                                                    <span>{getName(selectedNode.category as any, language)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ms-auto flex items-center gap-2">
                                        {isGroupSelected && onEdit && (
                                            <Button variant="outline" onClick={() => onEdit(selectedNode)} className="gap-2">
                                                <Layers className="w-4 h-4" />
                                                {getLocalizedLabel('edit_group', language)}
                                            </Button>
                                        )}
                                        {onAddChild && isGroupSelected && (
                                            <Button onClick={() => onAddChild(selectedNode)} className="gap-2">
                                                <Plus className="w-4 h-4" />
                                                {getLocalizedLabel('add_material', language)}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Content for Group: List Children */}
                                {isGroupSelected && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                            {getLocalizedLabel('contents', language)} ({rightPanelItems.length})
                                        </h3>

                                        <div className="grid grid-cols-1 gap-2">
                                            {rightPanelItems.length > 0 ? rightPanelItems.map(item => (
                                                <div key={item.id}
                                                    className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                                    onClick={() => {
                                                        if (item.is_group) {
                                                            handleNodeSelect(item);
                                                            if (!expandedIds.has(item.id)) {
                                                                toggleExpand(item.id);
                                                            }
                                                        } else {
                                                            // Open material in VIEW mode (not edit)
                                                            if (onNodeClick) onNodeClick(item);
                                                        }
                                                    }}
                                                >
                                                    {item.is_group ? (
                                                        <Folder className="w-5 h-5 text-amber-400 me-3" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-blue-400 me-3" />
                                                    )}

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {getName(item, language)}
                                                            </span>
                                                            {!item.is_active && (
                                                                <span className="text-[10px] px-1.5 bg-gray-100 text-gray-500 rounded">{getLocalizedLabel('inactive', language)}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                            {item.code}
                                                        </div>
                                                    </div>

                                                    <div className="text-sm font-mono text-gray-600 dark:text-gray-400 px-4 flex flex-col gap-1.5 justify-center">
                                                        {item.is_group ? (() => {
                                                            const stats = getGroupAggregate(item.children);
                                                            if (stats.stock === 0 && stats.rolls === 0) return null;
                                                            // Check if this group directly contains materials (leaf group)
                                                            const isItemLeaf = item.children && !item.children.some((c: any) => c.is_group);
                                                            return (
                                                                <div className="flex items-center gap-1.5">
                                                                    {stats.stock > 0 && (
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded text-xs font-bold",
                                                                            isItemLeaf
                                                                                ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40"
                                                                                : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                                                        )}>
                                                                            {!isItemLeaf && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                                                            {stats.stock.toFixed(2)}
                                                                        </span>
                                                                    )}
                                                                    {stats.rolls > 0 && (
                                                                        <span className={cn(
                                                                            "px-2 py-0.5 rounded text-xs font-bold",
                                                                            isItemLeaf
                                                                                ? "text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40"
                                                                                : "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                                                                        )}>
                                                                            {!isItemLeaf && <span className="opacity-60 me-0.5 text-[9px]">Σ</span>}
                                                                            {stats.rolls} {getLocalizedLabel('roll_short', language)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })() : (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {((item.current_stock || 0) > 0 || (item.rolls_total_length || 0) > 0) && (
                                                                    <span className="font-bold text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">
                                                                        {item.current_stock || item.rolls_total_length || 0} {getLocalizedUnit(item.unit, language)}
                                                                    </span>
                                                                )}
                                                                {(item.loose_stock || 0) > 0 && (
                                                                    <span className="font-bold text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 px-2 py-0.5 rounded text-xs">
                                                                        {Number(item.loose_stock).toFixed(1)} {getLocalizedLabel('loose', language)}
                                                                    </span>
                                                                )}
                                                                {(item.rolls_count || 0) > 0 && (
                                                                    <span className="font-bold text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 px-2 py-0.5 rounded text-xs">
                                                                        {item.rolls_count} {getLocalizedLabel('roll_short', language)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 p-0 h-8 w-8 text-gray-400 hover:text-gray-600">
                                                        <ChevronRight className={cn("w-4 h-4", ['ar', 'he', 'fa', 'ur'].includes(language) && "rotate-180")} />
                                                    </Button>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                    <Box className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                    <p className="text-gray-500">
                                                        {getLocalizedLabel('empty_folder', language)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Content for Item: Details */}
                                {!isGroupSelected && (() => {
                                    // For variant parents, use aggregate from children
                                    const isParent = selectedNode.is_variant_parent && selectedNode.children && selectedNode.children.length > 0;
                                    const parentAgg = isParent ? getGroupAggregate(selectedNode.children) : null;
                                    const displayStock = isParent ? parentAgg!.stock : (selectedNode.current_stock || selectedNode.rolls_total_length || 0);
                                    const displayRolls = isParent ? parentAgg!.rolls : (selectedNode.rolls_count || 0);
                                    const displayLoose = isParent ? parentAgg!.loose : (selectedNode.loose_stock || 0);
                                    return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                                    {getLocalizedLabel('stock_info', language)}
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center py-1">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{getLocalizedLabel('total_qty', language)}</span>
                                                        <span className="font-mono font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                                                            {Number(displayStock).toFixed(2)} {getLocalizedUnit(selectedNode.unit || 'meter', language)}
                                                        </span>
                                                    </div>
                                                    {displayRolls > 0 && (
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">{getLocalizedLabel('rolls_count', language)}</span>
                                                            <span className="font-mono font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded">
                                                                {displayRolls} {getLocalizedLabel('rolls', language)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {displayLoose > 0 && (
                                                        <div className="flex justify-between items-center py-1">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">{getLocalizedLabel('loose_stock', language)}</span>
                                                            <span className="font-mono font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
                                                                {selectedNode.loose_stock} {getLocalizedUnit(selectedNode.unit, language)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                                    {getLocalizedLabel('description', language)}
                                                </h4>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                    {selectedNode.description || '-'}
                                                </p>
                                            </div>

                                            {/* E-commerce Status Card */}
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 md:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                                            {getLocalizedLabel('ecommerce', language)}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            {(selectedNode as any).custom_fields?.ecommerce_published ? (
                                                                <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                    {getLocalizedLabel('published', language)}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-sm text-gray-500 font-medium">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                                                    {getLocalizedLabel('not_published', language)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {(selectedNode as any).custom_fields?.ecommerce_published && (
                                                        <div className="text-end">
                                                            <div className="text-xs text-gray-500 mb-1">{getLocalizedLabel('sell_price', language)}</div>
                                                            <div className="font-mono font-bold text-erp-navy dark:text-white">
                                                                {(selectedNode as any).custom_fields?.ecommerce_price || 0}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <Button onClick={() => onEdit && onEdit(selectedNode)}>
                                                {getLocalizedLabel('edit_item', language)}
                                            </Button>
                                        </div>
                                    </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Layers className="w-16 h-16 mb-4 opacity-20" />
                                <p>{getLocalizedLabel('select_item', language)}</p>
                            </div>
                        )}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}

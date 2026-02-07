import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { ChevronRight, ChevronDown, Folder, Package, Plus, Trash2, MoreHorizontal, Layers, Archive, CheckCircle2, Box } from 'lucide-react';
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
}

interface MaterialTreeProps {
    data: MaterialTreeNode[];
    onNodeClick?: (node: any) => void;
    onAddChild?: (parent: any) => void;
    onEdit?: (node: any) => void;
    onDelete?: (node: any) => void;
    className?: string;
    height?: string;
}

// Helper to get name based on language
const getName = (node: MaterialTreeNode, lang: string) => {
    return lang === 'ar' ? node.name_ar : (node.name_en || node.name_ar);
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
                    if (node.is_group) onToggle(node.id);
                    else if (onEdit) onEdit(node);
                }}
            >
                <div
                    className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren || node.is_group) onToggle(node.id);
                    }}
                >
                    {(hasChildren || node.is_group) ? (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : language === 'ar' ? (
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )
                    ) : (
                        <div className="w-4 h-4" />
                    )}
                </div>

                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {node.is_group ? (
                        <Folder
                            className={cn(
                                'w-4 h-4 flex-shrink-0 transition-colors',
                                isSelected ? 'text-erp-navy dark:text-white' : 'text-amber-400 dark:text-amber-500'
                            )}
                        />
                    ) : (
                        <Package className="w-4 h-4 flex-shrink-0 text-blue-400 dark:text-blue-500" />
                    )}

                    <span className={cn(
                        'text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded transition-colors',
                        isSelected
                            ? 'bg-erp-navy/20 dark:bg-erp-navy/40 text-erp-navy dark:text-white font-semibold'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}>
                        {node.code}
                    </span>

                    <span className={cn(
                        'font-medium text-sm font-tajawal truncate transition-colors flex-1',
                        isSelected ? 'text-erp-navy dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    )}>
                        {displayName}
                    </span>

                    {/* Group Count Badge */}
                    {node.is_group && node.children && node.children.length > 0 && (
                        <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
                            isSelected
                                ? 'bg-erp-teal/20 text-erp-teal dark:bg-erp-teal/30 dark:text-erp-teal'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        )}>
                            {node.children.length}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {node.is_group && onAddChild && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-erp-teal hover:bg-erp-teal/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(node);
                            }}
                            title={language === 'ar' ? "إضافة مادة" : "Add Material"}
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
                                    {language === 'ar' ? 'تعديل' : 'Edit'}
                                </DropdownMenuItem>
                            )}
                            {onAddChild && node.is_group && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddChild(node); }}>
                                    <Plus className="w-4 h-4 me-2" />
                                    {language === 'ar' ? 'إضافة فرعي' : 'Add Child'}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {onDelete && (
                                <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                                    className="text-red-600 dark:text-red-400 focus:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4 me-2" />
                                    {language === 'ar' ? 'حذف' : 'Delete'}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && node.children && (
                <div className="border-s-2 border-gray-100 dark:border-gray-800 ms-3 ps-1">
                    {node.children
                        .filter(child => child.is_group) // Only show groups in the tree
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
}: MaterialTreeProps) {
    const { t, direction, language } = useLanguage();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Auto-expand first level
    useEffect(() => {
        const newExpanded = new Set<string>();
        data.forEach(node => {
            if (node.is_group) newExpanded.add(node.id);
        });
        setExpandedIds(newExpanded);
    }, [data]);

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

    const rightPanelItems = selectedNode?.is_group ? (selectedNode.children || []) : (selectedNode ? [selectedNode] : []);
    const isGroupSelected = selectedNode?.is_group;

    return (
        <div className={cn("rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-200px)]", className)}>
            <ResizablePanelGroup direction="horizontal">
                {/* Tree Panel */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="border-e border-gray-100 dark:border-gray-800">
                    <div className="h-full overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-800/20" dir={direction}>
                        {data.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
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
                <ResizablePanel defaultSize={70}>
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
                                    <div className="ms-auto">
                                        {onAddChild && isGroupSelected && (
                                            <Button onClick={() => onAddChild(selectedNode)} className="gap-2">
                                                <Plus className="w-4 h-4" />
                                                {language === 'ar' ? 'إضافة مادة' : 'Add Material'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Content for Group: List Children */}
                                {isGroupSelected && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                            {language === 'ar' ? 'المحتويات' : 'Contents'} ({rightPanelItems.length})
                                        </h3>

                                        <div className="grid grid-cols-1 gap-2">
                                            {rightPanelItems.length > 0 ? rightPanelItems.map(item => (
                                                <div key={item.id}
                                                    className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                                    onClick={() => onEdit && onEdit(item)}
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
                                                                <span className="text-[10px] px-1.5 bg-gray-100 text-gray-500 rounded">Inactive</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                            {item.code}
                                                        </div>
                                                    </div>

                                                    <div className="text-sm font-mono text-gray-600 dark:text-gray-400 px-4">
                                                        {item.current_stock || 0} {item.unit || '-'}
                                                    </div>

                                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 p-0 h-8 w-8 text-gray-400 hover:text-gray-600">
                                                        <ChevronRight className={cn("w-4 h-4", language === 'ar' && "rotate-180")} />
                                                    </Button>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                                    <Box className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                                                    <p className="text-gray-500">
                                                        {language === 'ar' ? 'هذا المجلد فارغ' : 'This folder is empty'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Content for Item: Details */}
                                {!isGroupSelected && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                                    {language === 'ar' ? 'معلومات المخزون' : 'Stock Information'}
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الكمية الحالية' : 'Current Stock'}</span>
                                                        <span className="font-mono font-medium">{selectedNode.current_stock || 0} {selectedNode.unit}</span>
                                                    </div>
                                                    {/* Add more details here */}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                                    {language === 'ar' ? 'الوصف' : 'Description'}
                                                </h4>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                    {selectedNode.description || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <Button onClick={() => onEdit && onEdit(selectedNode)}>
                                                {language === 'ar' ? 'تعديل البطاقة' : 'Edit Item'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Layers className="w-16 h-16 mb-4 opacity-20" />
                                <p>{language === 'ar' ? 'اختر عنصراً لعرض التفاصيل' : 'Select an item to view details'}</p>
                            </div>
                        )}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}

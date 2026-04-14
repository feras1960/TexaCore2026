import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { NexaDataTable, EditableColumnConfig } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { TradeItem } from '../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, ScanBarcode, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTradePermissions } from '@/hooks/useTradePermissions';

interface TradeItemsTableProps {
    items: TradeItem[];
    onItemsChange: (items: TradeItem[]) => void;
    onEditItem: (index: number) => void;
    onAddItem: (type: 'simple' | 'rolls') => void;
    mode: 'purchase' | 'sales';
    readOnly?: boolean;
}

export const TradeItemsTable: React.FC<TradeItemsTableProps> = ({
    items,
    onItemsChange,
    onEditItem, // Still used for custom dialog editing if needed
    onAddItem,
    mode,
    readOnly = false
}) => {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [barcode, setBarcode] = useState('');
    const { columns: colPerms, actions: perms } = useTradePermissions({ tradeMode: mode });

    const handleAddRow = (): TradeItem => {
        // Return a clean new item
        return {
            id: crypto.randomUUID(),
            item_code: '',
            item_name: '',
            item_name_ar: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            unit: 'm',
            rolls_count: 0
        } as TradeItem;
    };

    const handleDeleteRow = (item: TradeItem, index: number) => {
        // Logic handled by NexaDataTable via onDataChange below, 
        // but can be intercepted if complex delete logic is needed.
        const newItems = items.filter((_, i) => i !== index);
        onItemsChange(newItems);
    };

    // === Barcode Logic ===
    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcode.trim()) return;

        // Mock Logic: Simulate finding an item
        toast.info(isRTL ? `جاري البحث عن: ${barcode}` : `Searching for: ${barcode}`);

        // Example: Add a dummy item
        const newItem = {
            id: crypto.randomUUID(),
            item_code: barcode, // Use barcode as code
            item_name: `سجاد (باركود ${barcode})`,
            item_name_ar: `Carpet (${barcode})`,
            quantity: 1,
            unit_price: 150,
            total: 150,
            unit: 'm',
            rolls_count: 0
        } as TradeItem;

        onItemsChange([...items, newItem]);
        setBarcode('');
        // Keep focus
        barcodeInputRef.current?.focus();
    };

    // === Columns Definition ===
    const columns: ColumnDef<TradeItem>[] = useMemo(() => [
        {
            accessorKey: 'item_code',
            header: isRTL ? 'كود الصنف' : 'Item Code',
            size: 100, // Reduced size
        },
        {
            accessorKey: 'item_name',
            header: isRTL ? 'اسم الصنف' : 'Item Name',
            size: 250,
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                        {isRTL ? (row.original.item_name_ar || row.original.item_name) : row.original.item_name}
                    </span>
                    {/* Show Rolls Badge if exists */}
                    {row.original.rolls_count ? (
                        <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                onEditItem(row.index); // Open detailed dialog
                            }}>
                                <Package className="w-3 h-3 mr-1" />
                                {row.original.rolls_count} {isRTL ? 'رول' : 'Rolls'}
                            </Badge>
                        </div>
                    ) : null}
                </div>
            ),
        },
        // Hiding Color for now to match Invoice simple look, or keep it if crucial
        // { accessorKey: 'color_name', ... }, 
        {
            accessorKey: 'quantity',
            header: isRTL ? 'الكمية' : 'Qty',
            size: 80,
            cell: ({ row }) => (
                <span className="font-mono text-center block font-bold">
                    {row.original.quantity}
                </span>
            ),
        },
        {
            accessorKey: 'unit_price',
            header: isRTL ? 'سعر الوحدة' : 'Unit Price',
            size: 100,
            cell: ({ row }) => (
                <span className="font-mono text-center block text-emerald-600">
                    {row.original.unit_price?.toFixed(2)}
                </span>
            ),
        },
        {
            id: 'discount', // Mock Discount Column (not in TradeItem type yet, handling visually)
            header: isRTL ? 'الخصم %' : 'Disc %',
            size: 80,
            accessorFn: (row) => 0, // Default 0
            cell: ({ cell }) => <span className="font-mono text-center block text-amber-600">0%</span>
        },
        {
            accessorKey: 'total',
            header: isRTL ? 'الإجمالي' : 'Total',
            size: 120,
            cell: ({ row }) => (
                <span className="font-mono font-bold text-end block text-blue-600">
                    {row.original.total?.toFixed(2)}
                </span>
            ),
        },
    ].filter(col => {
        // RBAC: hide price-sensitive columns
        const key = (col as any).accessorKey || (col as any).id;
        if (key === 'unit_price' && !colPerms.unit_price) return false;
        if (key === 'discount' && !colPerms.discount) return false;
        if (key === 'total' && !colPerms.unit_price) return false; // total depends on price
        return true;
    }), [isRTL, onEditItem, colPerms]);

    // === Editable Config ===
    const editableColumns: EditableColumnConfig[] = [
        { key: 'item_code', type: 'text', placeholder: 'Code' },
        { key: 'item_name', type: 'text', placeholder: isRTL ? 'ابحث عن صنف...' : 'Search item...' },
        { key: 'quantity', type: 'number', min: 1 },
        { key: 'unit_price', type: 'number', min: 0 },
        // Discount is virtual for now
    ];

    return (
        <div className="space-y-4">

            {/* Compact Barcode Scanner */}
            {!readOnly && (
                <div className="flex items-center gap-3 mb-2 px-1">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <form onSubmit={handleBarcodeSubmit}>
                            <Input
                                ref={barcodeInputRef}
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className={cn("pl-8 h-8 text-sm font-mono border-gray-200 focus:border-erp-primary transition-all", isRTL && "pl-2 pr-8")}
                                placeholder={isRTL ? 'إضافة سريعة (كود/باركد)...' : 'Quick add (Code/Barcode)...'}
                                autoFocus
                            />
                        </form>
                    </div>
                    <span className="text-[10px] text-gray-400">
                        {isRTL ? '↵ للإضافة' : '↵ to add'}
                    </span>
                </div>
            )}

            {/* NexaDataTable - Clean Mode with Sticky Footer */}
            <div className="rounded-lg overflow-hidden bg-white shadow-sm border">
                <NexaDataTable
                    data={items}
                    columns={columns}
                    isRTL={isRTL}

                    // Features
                    enableSequenceNumber={true}
                    enableColumnResizing={true}
                    enableSearch={false}
                    enablePagination={false}
                    enableExport={false}
                    enableColumnVisibility={false}
                    enableExcelMode={true}

                    // Sticky Scrolling
                    maxHeight="calc(100vh - 380px)" // Fixed height to ensure footer sticks

                    // Footer stuff
                    showTotalsFooter={true}
                    showAmountInWords={true}
                    debitKey="total"

                    // Editing - Instant Mode
                    enableInstantEdit={!readOnly} // No Save/Cancel buttons
                    editableColumns={editableColumns}

                    onDataChange={(newData) => {
                        // Recalculate totals on change
                        const processedItems = newData.map(item => ({
                            ...item,
                            total: (item.quantity || 0) * (item.unit_price || 0)
                        }));
                        onItemsChange(processedItems);
                    }}

                    onAddRow={handleAddRow}
                    onDeleteRow={handleDeleteRow}
                    canDeleteRows={!readOnly}

                    // Auto-Rows behavior
                    initialEmptyRows={readOnly ? 0 : 10} // 10 empty rows
                    editModeExtraRows={0}
                    autoAddRowsCount={1}
                    cleanEmptyRowsOnSave={true}
                    emptyRowsThreshold={2}

                    // Messages
                    emptyMessage={t('messages.noTransactions') || 'No items'}
                />
            </div>

        </div>
    );
};

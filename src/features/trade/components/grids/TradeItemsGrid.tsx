import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { TradeItem } from '../../types';
import { MaterialFastEntryDialog } from '../forms/MaterialFastEntryDialog';
import { TradeItemsTable } from './TradeItemsTable'; // Step 3: Import the new table
import { Archive, Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TradeItemsGridProps {
    items: TradeItem[];
    onItemsChange: (items: TradeItem[]) => void;
    mode: 'purchase' | 'sales';
    readOnly?: boolean;
}

export const TradeItemsGrid: React.FC<TradeItemsGridProps> = ({
    items,
    onItemsChange,
    mode,
    readOnly = false
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';

    // State for the fast entry dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [dialogMode, setDialogMode] = useState<'simple' | 'rolls'>('rolls'); // State to control dialog mode

    // Save/Add Item from Dialog
    const handleSaveItem = (item: TradeItem) => {
        if (editingIndex !== null) {
            // Edit existing
            const newItems = [...items];
            newItems[editingIndex] = item;
            onItemsChange(newItems);
        } else {
            // Add new
            onItemsChange([...items, item]);
        }
        setIsDialogOpen(false);
        setEditingIndex(null);
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        // Determine mode based on item content
        const item = items[index];
        setDialogMode(item.rolls_count ? 'rolls' : 'simple');
        setIsDialogOpen(true);
    };

    const handleAddItem = (type: 'simple' | 'rolls') => {
        setEditingIndex(null);
        setDialogMode(type);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar - Hidden for clean Invoice Mode, relying on Table's internal auto-add and barcode */}
            {/* {!readOnly && (
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-erp-teal" />
                        {isAr ? 'قائمة الأصناف' : 'Items List'}
                        <Badge variant="outline" className="ml-2">
                            {items.length}
                        </Badge>
                    </h3>
                    <div className="flex gap-2">
                         <Button
                            variant="outline"
                            onClick={() => handleAddItem('simple')}
                            className="gap-2 border-dashed"
                        >
                            <Plus className="w-4 h-4" />
                            {isAr ? 'إضافة صنف (كمية)' : 'Add Item (Qty Only)'}
                        </Button>

                         <Button
                            onClick={() => handleAddItem('rolls')}
                            className="bg-erp-Navy hover:bg-erp-Navy/90 gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {isAr ? 'إضافة تفاصيل (رولات)' : 'Add with Rolls'}
                        </Button>
                    </div>
                </div>
            )} */}

            {/* THE NEW NEXA DATA TABLE */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden min-h-[300px]">
                <TradeItemsTable
                    items={items}
                    onItemsChange={onItemsChange}
                    onEditItem={handleEditItem}
                    // Pass wrapper function that expects arguments
                    onAddItem={(type) => handleAddItem(type)}
                    mode={mode}
                    readOnly={readOnly}
                />
            </div>

            {/* THE FAST ENTRY DIALOG */}
            <MaterialFastEntryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveItem}
                initialData={editingIndex !== null ? items[editingIndex] : undefined}
                mode={mode}
                entryType={dialogMode} // Pass dynamic mode
            />
        </div>
    );
};

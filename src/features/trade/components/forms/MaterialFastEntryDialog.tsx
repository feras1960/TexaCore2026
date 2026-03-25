import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TradeItem, GridRollItem } from '../../types';
import { Package, Ruler, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTaxDefaults, computeTaxAmount } from '@/features/trade/hooks/useTaxDefaults';
import { useCompany } from '@/hooks/useCompany';

interface MaterialFastEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: TradeItem) => void;
    initialData?: TradeItem;
    mode: 'purchase' | 'sales';
    entryType?: 'simple' | 'rolls'; // New Prop for Simple/Rolls Mode
}

// Mock Data (Replace with Service later)
const MOCK_MATERIALS = [
    { id: 'mat-001', name: 'Cotton Fabric / قماش قطن', code: 'MAT-COT' },
    { id: 'mat-002', name: 'Silk Fabric / قماش حرير', code: 'MAT-SLK' },
    { id: 'mat-003', name: 'Polyester / بوليستر', code: 'MAT-PLY' },
];



export const MaterialFastEntryDialog: React.FC<MaterialFastEntryDialogProps> = ({
    open,
    onOpenChange,
    onSave,
    initialData,
    mode,
    entryType = 'rolls' // Default to rolls
}) => {
    const { t, language, direction } = useLanguage();
    const isAr = language === 'ar';

    // ─── Company & Tax ───
    const { companyId } = useCompany();
    const { data: taxDefaults } = useTaxDefaults(companyId);
    const companyTaxRate = (taxDefaults?.isEnabled && taxDefaults.rate > 0) ? taxDefaults.rate : 0;

    // Form State
    const [materialId, setMaterialId] = useState(initialData?.item_id || '');
    const [unitPrice, setUnitPrice] = useState(initialData?.unit_price || 0);

    // Simple Mode State
    const [simpleQuantity, setSimpleQuantity] = useState<number>(initialData?.quantity || 0);

    // Roll Entry State
    const [currentLength, setCurrentLength] = useState('');
    const [rolls, setRolls] = useState<GridRollItem[]>([]);
    const lengthInputRef = useRef<HTMLInputElement>(null);

    // Initialize rolls from data if editing
    useEffect(() => {
        if (open) {
            if (initialData) {
                setMaterialId(initialData.item_id);
                setUnitPrice(initialData.unit_price);
                setSimpleQuantity(initialData.quantity || 0);
                // Rolls loading logic here if needed
            } else {
                setMaterialId('');
                setUnitPrice(0);
                setRolls([]);
                setCurrentLength('');
                setSimpleQuantity(0);
            }
        }
    }, [open, initialData]);

    const handleAddRoll = () => {
        const length = parseFloat(currentLength);
        if (!length || length <= 0) return;

        const newRoll: GridRollItem = {
            id: Math.random().toString(36).substr(2, 9),
            material_id: materialId,
            roll_length: length,
            is_saved: false // Local draft
        };

        setRolls([newRoll, ...rolls]); // Add to top
        setCurrentLength('');

        // Keep focus on input for rapid entry
        setTimeout(() => lengthInputRef.current?.focus(), 50);
    };

    const handleRemoveRoll = (id: string) => {
        setRolls(rolls.filter(r => r.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddRoll();
        }
    };

    // Calculate Totals based on Mode
    const totalQty = useMemo(() => {
        return entryType === 'simple' ? simpleQuantity : rolls.reduce((sum, r) => sum + r.roll_length, 0);
    }, [rolls, simpleQuantity, entryType]);

    const totalPrice = totalQty * unitPrice;

    const handleSave = () => {
        if (!materialId) return;

        const selectedMat = MOCK_MATERIALS.find(m => m.id === materialId);

        const newItem: TradeItem = {
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            item_type: 'material',
            item_id: materialId,
            item_code: selectedMat?.code || '',
            item_name: selectedMat?.name || '',

            quantity: totalQty,
            unit: 'meter',
            rolls_count: entryType === 'rolls' ? rolls.length : undefined,

            unit_price: unitPrice,
            discount_amount: 0,
            discount_percent: 0,
            tax_rate: companyTaxRate,
            tax_amount: computeTaxAmount(totalPrice, companyTaxRate),
            subtotal: totalPrice,
            total: totalPrice + computeTaxAmount(totalPrice, companyTaxRate)
        };

        onSave(newItem);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "flex flex-col p-0 gap-0 transition-all duration-300",
                    entryType === 'simple' ? "sm:max-w-[500px] h-auto rounded-lg" : "sm:max-w-[800px] h-[80vh] rounded-lg"
                )}
                dir={direction}
            >
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-cairo">
                        <Package className="w-6 h-6 text-erp-Navy" />
                        {initialData ? (isAr ? 'تعديل الصنف' : 'Edit Item') : (isAr ? 'إضافة صنف' : 'Add Item')}
                        {entryType === 'rolls' && <Badge variant="secondary" className="ml-2 text-xs font-normal">Rolls Mode</Badge>}
                    </DialogTitle>
                </DialogHeader>

                <div className={cn(
                    "flex-1 overflow-hidden grid transition-all",
                    entryType === 'simple' ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                )}>

                    {/* Left Panel: Form & Stats */}
                    <div className={cn(
                        "p-6 space-y-6 bg-gray-50/50",
                        entryType === 'rolls' && "border-r"
                    )}>

                        {/* Material Select */}
                        <div className="space-y-2">
                            <Label>{isAr ? 'المادة' : 'Material'}</Label>
                            <Select value={materialId} onValueChange={setMaterialId}>
                                <SelectTrigger className="h-10 bg-white shadow-sm">
                                    <SelectValue placeholder={isAr ? 'اختر المادة...' : 'Select Material...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {MOCK_MATERIALS.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>



                        {/* SIMPLE MODE: Quantity Input */}
                        {entryType === 'simple' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                <Label className="text-erp-teal font-semibold">{isAr ? 'الكمية (متر)' : 'Quantity (Meters)'}</Label>
                                <Input
                                    type="number"
                                    value={simpleQuantity || ''}
                                    onChange={e => setSimpleQuantity(parseFloat(e.target.value))}
                                    className="h-12 bg-white font-mono text-xl shadow-sm border-erp-teal/50 focus-visible:ring-erp-teal"
                                    placeholder="0.00"
                                    autoFocus // Focus here in simple mode
                                />
                            </div>
                        )}

                        {/* Price Input */}
                        <div className="space-y-2">
                            <Label>{isAr ? 'السعر (للمتر)' : 'Unit Price (Per Meter)'}</Label>
                            <Input
                                type="number"
                                value={unitPrice || ''}
                                onChange={e => setUnitPrice(parseFloat(e.target.value))}
                                className="h-10 bg-white font-mono shadow-sm"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Summary Card */}
                        <div className="mt-8 bg-white p-4 rounded-lg border shadow-sm space-y-3">
                            <h4 className="font-semibold text-sm text-gray-500 flex items-center gap-1">
                                <Save className="w-4 h-4" />
                                {isAr ? 'ملخص الإدخال' : 'Entry Summary'}
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {entryType === 'rolls' && (
                                    <div>
                                        <p className="text-xs text-gray-400">{isAr ? 'عدد الرولات' : 'Rolls Count'}</p>
                                        <p className="text-xl font-bold font-mono text-erp-Navy">{rolls.length}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-400">{isAr ? 'إجمالي الكمية' : 'Total Quantity'}</p>
                                    <p className="text-xl font-bold font-mono text-erp-teal">{totalQty.toFixed(2)}</p>
                                </div>
                                <div className="col-span-2 pt-2 border-t">
                                    <p className="text-xs text-gray-400">{isAr ? 'الإجمالي (قبل الضريبة)' : 'Total (Excl. Tax)'}</p>
                                    <p className="text-2xl font-bold font-mono text-green-600">
                                        {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Panel: Rapid Entry & List (ONLY FOR ROLLS MODE) */}
                    {entryType === 'rolls' && (
                        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-4 duration-300">
                            <div className="p-4 bg-erp-Navy/5 border-b">
                                <Label className="text-sm font-semibold mb-2 block text-erp-Navy">
                                    {isAr ? '⚡ إدخال سريع للأطوال' : '⚡ Rapid Length Entry'}
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Ruler className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <Input
                                            ref={lengthInputRef}
                                            value={currentLength}
                                            onChange={e => setCurrentLength(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isAr ? 'أدخل الطول واضغط Enter...' : 'Type length & hit Enter...'}
                                            className="pl-9 h-10 font-mono text-lg shadow-sm"
                                            type="number"
                                            autoFocus
                                        />
                                    </div>
                                    <Button onClick={handleAddRoll} size="icon" className="h-10 w-10 bg-erp-teal hover:bg-erp-teal/90 shadow-sm">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-0">
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">#</TableHead>
                                            <TableHead className="text-center">{isAr ? 'الطول (متر)' : 'Length (m)'}</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rolls.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-32 text-center text-gray-400">
                                                    {isAr ? 'لم يتم إدخال رولات بعد' : 'No rolls entered yet'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rolls.map((roll, idx) => (
                                                <TableRow key={roll.id} className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <TableCell className="text-center font-mono text-xs text-gray-400">
                                                        {rolls.length - idx}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold font-mono text-lg text-erp-Navy">
                                                        {roll.roll_length}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleRemoveRoll(roll.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                </div>

                <DialogFooter className="p-4 border-t bg-gray-50 flex items-center justify-between sm:justify-between w-full rounded-b-lg">
                    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {isAr ? 'يتم الحفظ كمسودة تلقائياً' : 'Data auto-saved as draft'}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button onClick={handleSave} className="bg-erp-Navy hover:bg-erp-Navy/90 gap-2 px-6 shadow-sm">
                            <Save className="w-4 h-4" />
                            {isAr ? 'حفظ وإدراج' : 'Save & Insert'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

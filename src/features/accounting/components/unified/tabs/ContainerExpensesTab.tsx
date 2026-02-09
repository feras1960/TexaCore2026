import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, DollarSign } from 'lucide-react';

interface ContainerExpensesTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

export const ContainerExpensesTab: React.FC<ContainerExpensesTabProps> = ({
    data,
    mode,
    onChange
}) => {
    const { t, isRTL } = useLanguage();
    const isEditable = mode === 'create' || mode === 'edit';
    const expenses = data.expenses || [];

    const expenseTypes = [
        { value: 'freight', label: isRTL ? 'الشحن البحري' : 'Ocean Freight' },
        { value: 'customs', label: isRTL ? 'الرسوم الجمركية' : 'Customs Duties' },
        { value: 'insurance', label: isRTL ? 'التأمين' : 'Insurance' },
        { value: 'handling', label: isRTL ? 'مناولة' : 'Handling' },
        { value: 'transport', label: isRTL ? 'النقل الداخلي' : 'Inland Transport' },
        { value: 'clearance', label: isRTL ? 'تخليص جمركي' : 'Customs Clearance' },
        { value: 'storage', label: isRTL ? 'تخزين' : 'Storage' },
        { value: 'other', label: isRTL ? 'أخرى' : 'Other' },
    ];

    const handleAddExpense = () => {
        const newExpense = {
            id: Date.now(),
            type: 'other',
            description: '',
            amount: 0,
            currency: 'USD'
        };
        onChange({ expenses: [...expenses, newExpense] });
    };

    const handleUpdateExpense = (id: number, field: string, value: any) => {
        const updatedExpenses = expenses.map((exp: any) =>
            exp.id === id ? { ...exp, [field]: value } : exp
        );
        onChange({ expenses: updatedExpenses });
    };

    const handleRemoveExpense = (id: number) => {
        onChange({ expenses: expenses.filter((exp: any) => exp.id !== id) });
    };

    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {t('trade.expenses.title') || (isRTL ? 'المصاريف' : 'Expenses')}
                    </h3>
                    {isEditable && (
                        <Button variant="outline" size="sm" onClick={handleAddExpense} className="gap-1">
                            <Plus className="w-4 h-4" />
                            {t('actions.addExpense') || (isRTL ? 'إضافة مصروف' : 'Add Expense')}
                        </Button>
                    )}
                </div>

                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className={isRTL ? "text-right" : "text-left"}>
                                    {t('fields.type') || (isRTL ? 'النوع' : 'Type')}
                                </TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>
                                    {t('fields.description') || (isRTL ? 'الوصف' : 'Description')}
                                </TableHead>
                                <TableHead className={isRTL ? "text-right" : "text-left"}>
                                    {t('fields.amount') || (isRTL ? 'المبلغ' : 'Amount')}
                                </TableHead>
                                {isEditable && <TableHead className="w-[50px]"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isEditable ? 4 : 3} className="text-center py-6 text-gray-500">
                                        {isRTL ? 'لا توجد مصاريف مضافة' : 'No expenses added'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenses.map((exp: any) => (
                                    <TableRow key={exp.id}>
                                        <TableCell>
                                            {isEditable ? (
                                                <Select
                                                    value={exp.type}
                                                    onValueChange={(v) => handleUpdateExpense(exp.id, 'type', v)}
                                                >
                                                    <SelectTrigger className="h-8 w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {expenseTypes.map(t => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-sm font-medium">
                                                    {expenseTypes.find(t => t.value === exp.type)?.label || exp.type}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditable ? (
                                                <Input
                                                    value={exp.description}
                                                    onChange={(e) => handleUpdateExpense(exp.id, 'description', e.target.value)}
                                                    className="h-8"
                                                    placeholder={isRTL ? 'وصف المصروف...' : 'Description...'}
                                                />
                                            ) : (
                                                <span className="text-sm text-gray-600">{exp.description || '-'}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditable ? (
                                                <Input
                                                    type="number"
                                                    value={exp.amount}
                                                    onChange={(e) => handleUpdateExpense(exp.id, 'amount', e.target.value)}
                                                    className="h-8 w-[120px] font-mono"
                                                    min={0}
                                                />
                                            ) : (
                                                <span className="font-mono font-bold">
                                                    {Number(exp.amount).toLocaleString()}
                                                </span>
                                            )}
                                        </TableCell>
                                        {isEditable && (
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                                    onClick={() => handleRemoveExpense(exp.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end p-2 bg-gray-50 rounded border">
                    <div className="flex gap-4 items-center">
                        <span className="font-semibold text-gray-700">
                            {t('trade.expenses.total') || (isRTL ? 'إجمالي المصاريف:' : 'Expenses Total:')}
                        </span>
                        <span className="font-bold text-lg font-mono text-erp-navy">
                            {totalExpenses.toLocaleString()} USD
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

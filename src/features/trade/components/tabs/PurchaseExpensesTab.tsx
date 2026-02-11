/**
 * 💰 PurchaseExpensesTab — تبويب المصاريف الإضافية لفواتير المشتريات
 * 
 * خاص بفواتير المشتريات فقط:
 * - مصاريف شحن
 * - مصاريف جمركية  
 * - تأمين
 * - مصاريف أخرى
 * كلها تُضاف لتكلفة البضاعة الواردة (Landed Cost)
 */

import React, { useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Receipt, Truck, Shield, Package, Plus, Trash2,
    DollarSign, Calculator, AlertTriangle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseLine {
    id: string;
    type: 'shipping' | 'customs' | 'insurance' | 'other';
    description: string;
    amount: number;
}

interface PurchaseExpensesTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

const EXPENSE_TYPES = [
    { value: 'shipping', labelAr: 'شحن', labelEn: 'Shipping', icon: Truck, color: 'text-blue-600 bg-blue-50' },
    { value: 'customs', labelAr: 'جمارك', labelEn: 'Customs', icon: Shield, color: 'text-amber-600 bg-amber-50' },
    { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', icon: Shield, color: 'text-emerald-600 bg-emerald-50' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: Package, color: 'text-gray-600 bg-gray-50' },
];

export const PurchaseExpensesTab: React.FC<PurchaseExpensesTabProps> = ({ data, mode, onChange }) => {
    const { isRTL } = useLanguage();
    const isEditable = mode === 'create' || mode === 'edit';

    const expenses: ExpenseLine[] = data?.expenses || [];

    const totalExpenses = useMemo(() => {
        return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }, [expenses]);

    const itemsTotal = useMemo(() => {
        return Number(data?.grand_total || data?.total_amount || 0);
    }, [data?.grand_total, data?.total_amount]);

    const landedCost = itemsTotal + totalExpenses;

    const addExpense = (type: ExpenseLine['type']) => {
        const newExpense: ExpenseLine = {
            id: `exp_${Date.now()}`,
            type,
            description: '',
            amount: 0,
        };
        onChange({ expenses: [...expenses, newExpense] });
    };

    const updateExpense = (id: string, field: keyof ExpenseLine, value: any) => {
        const updated = expenses.map(exp =>
            exp.id === id ? { ...exp, [field]: value } : exp
        );
        onChange({ expenses: updated });
    };

    const removeExpense = (id: string) => {
        onChange({ expenses: expenses.filter(exp => exp.id !== id) });
    };

    const getExpenseTypeInfo = (type: string) => {
        return EXPENSE_TYPES.find(t => t.value === type) || EXPENSE_TYPES[3];
    };

    return (
        <div className="space-y-4 p-1">
            {/* ── ملخص التكاليف ── */}
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-800">
                        <Calculator className="w-4 h-4" />
                        {isRTL ? 'ملخص التكاليف' : 'Cost Summary'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Items Total */}
                        <div className="text-center p-3 bg-gray-50 rounded-lg border">
                            <p className="text-xs text-gray-500 mb-1">
                                {isRTL ? 'إجمالي الأصناف' : 'Items Total'}
                            </p>
                            <p className="text-lg font-bold font-mono text-gray-800">
                                {itemsTotal.toLocaleString()}
                            </p>
                        </div>

                        {/* Expenses Total */}
                        <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-600 mb-1">
                                {isRTL ? 'إجمالي المصاريف' : 'Expenses Total'}
                            </p>
                            <p className="text-lg font-bold font-mono text-amber-700">
                                +{totalExpenses.toLocaleString()}
                            </p>
                        </div>

                        {/* Landed Cost */}
                        <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-xs text-emerald-600 mb-1">
                                {isRTL ? 'التكلفة الإجمالية' : 'Landed Cost'}
                            </p>
                            <p className="text-lg font-bold font-mono text-emerald-700">
                                {landedCost.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {totalExpenses > 0 && itemsTotal > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <Info className="w-3.5 h-3.5" />
                            {isRTL
                                ? `نسبة المصاريف من قيمة البضاعة: ${((totalExpenses / itemsTotal) * 100).toFixed(1)}%`
                                : `Expenses ratio: ${((totalExpenses / itemsTotal) * 100).toFixed(1)}% of items value`
                            }
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── قائمة المصاريف ── */}
            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                        <Receipt className="w-4 h-4" />
                        {isRTL ? 'المصاريف الإضافية' : 'Additional Expenses'}
                        {expenses.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {expenses.length}
                            </Badge>
                        )}
                    </CardTitle>

                    {isEditable && (
                        <div className="flex gap-1">
                            {EXPENSE_TYPES.map(type => {
                                const Icon = type.icon;
                                return (
                                    <Button
                                        key={type.value}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => addExpense(type.value as ExpenseLine['type'])}
                                    >
                                        <Icon className="w-3 h-3" />
                                        {isRTL ? type.labelAr : type.labelEn}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="pt-2">
                    {expenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">
                                {isRTL ? 'لا توجد مصاريف إضافية' : 'No additional expenses'}
                            </p>
                            {isEditable && (
                                <p className="text-xs mt-1 text-gray-300">
                                    {isRTL ? 'أضف مصاريف الشحن والجمارك والتأمين' : 'Add shipping, customs, and insurance costs'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {expenses.map((expense, index) => {
                                const typeInfo = getExpenseTypeInfo(expense.type);
                                const Icon = typeInfo.icon;

                                return (
                                    <div
                                        key={expense.id}
                                        className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50/50 transition-colors"
                                    >
                                        {/* Type Badge */}
                                        <div className={cn("p-2 rounded-lg", typeInfo.color)}>
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        {/* Type Label */}
                                        <Badge variant="outline" className="text-xs min-w-[60px] justify-center">
                                            {isRTL ? typeInfo.labelAr : typeInfo.labelEn}
                                        </Badge>

                                        {/* Description */}
                                        <div className="flex-1">
                                            {isEditable ? (
                                                <Input
                                                    value={expense.description}
                                                    onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                                                    placeholder={isRTL ? 'وصف المصروف...' : 'Expense description...'}
                                                    className="h-8 text-sm border-dashed"
                                                />
                                            ) : (
                                                <span className="text-sm text-gray-700">
                                                    {expense.description || '-'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div className="w-32">
                                            {isEditable ? (
                                                <Input
                                                    type="number"
                                                    value={expense.amount || ''}
                                                    onChange={(e) => updateExpense(expense.id, 'amount', Number(e.target.value))}
                                                    placeholder="0.00"
                                                    className="h-8 text-sm font-mono text-right"
                                                />
                                            ) : (
                                                <span className="text-sm font-mono font-bold text-right block">
                                                    {Number(expense.amount || 0).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Delete */}
                                        {isEditable && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                                onClick={() => removeExpense(expense.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Total Row */}
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                <span className="text-sm font-semibold text-amber-800">
                                    {isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}
                                </span>
                                <span className="text-base font-bold font-mono text-amber-700">
                                    {totalExpenses.toLocaleString()}
                                    <span className="text-xs text-amber-500 ms-1">
                                        {data?.currency || ''}
                                    </span>
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Warning if no items */}
            {itemsTotal === 0 && expenses.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {isRTL
                        ? 'تنبيه: يوجد مصاريف لكن لا توجد أصناف. أضف أصناف حتى يتم حساب التكلفة بشكل صحيح.'
                        : 'Warning: Expenses exist but no items. Add items for proper landed cost calculation.'}
                </div>
            )}
        </div>
    );
};

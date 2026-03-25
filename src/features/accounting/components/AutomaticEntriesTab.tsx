
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Eye,
    CheckCircle2,
    Clock,
    XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AutomaticEntry {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    total_amount: number;
    status: string;
    entry_type: string;
    reference_type: string | null;
    reference_number: string | null;
    created_at: string;
}

interface AutomaticEntriesTabProps {
    onViewDetails?: (entry: any) => void;
}

export default function AutomaticEntriesTab({ onViewDetails }: AutomaticEntriesTabProps) {
    const { t, language } = useLanguage();
    const { companyId } = useCompany();
    const [entries, setEntries] = useState<AutomaticEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (companyId) {
            fetchAutomaticEntries();
        }
    }, [companyId]);

    const fetchAutomaticEntries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('journal_entries')
                .select(`
                    *,
                    lines:journal_entry_lines(
                        id,
                        account_id,
                        description,
                        debit,
                        credit,
                        account:chart_of_accounts(
                            id,
                            account_code,
                            name_ar,
                            name_en
                        )
                    )
                `)
                .eq('company_id', companyId)
                .not('entry_type', 'eq', 'manual') // Exclude manual entries
                .order('entry_date', { ascending: false });

            if (error) throw error;
            if (error) throw error;
            console.log('AutomaticEntries FETCHED:', data?.[0]);
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching automatic entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'posted':
                return <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="w-3 h-3" /> {
                    language === 'ar' ? 'مرحّل' :
                        language === 'ru' ? 'Проведено' :
                            language === 'uk' ? 'Проведено' :
                                'Posted'
                }</Badge>;
            case 'draft':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1"><Clock className="w-3 h-3" /> {
                    language === 'ar' ? 'مسودة' :
                        language === 'ru' ? 'Черновик' :
                            language === 'uk' ? 'Чернетка' :
                                'Draft'
                }</Badge>;
            default:
                return <Badge variant="secondary" className="bg-gray-100 text-gray-800 gap-1"><XCircle className="w-3 h-3" /> {status}</Badge>;
        }
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, any> = {
            sales: { ar: 'مبيعات', en: 'Sales', ru: 'Продажи', uk: 'Продажі' },
            purchase: { ar: 'مشتريات', en: 'Purchases', ru: 'Закупки', uk: 'Закупівлі' },
            receipt: { ar: 'قبض', en: 'Receipt', ru: 'Поступление', uk: 'Надходження' },
            payment: { ar: 'صرف', en: 'Payment', ru: 'Платеж', uk: 'Платіж' },
            expense: { ar: 'مصروف', en: 'Expense', ru: 'Расходы', uk: 'Витрати' },
            payroll: { ar: 'رواتب', en: 'Payroll', ru: 'Зарплата', uk: 'Зарплата' },
            inventory: { ar: 'مخزون', en: 'Inventory', ru: 'Инвентарь', uk: 'Інвентар' },
        };

        if (types[type]) {
            if (language === 'ar') return types[type].ar;
            if (language === 'ru') return types[type].ru;
            if (language === 'uk') return types[type].uk;
            return types[type].en;
        }
        return type;
    };

    const filteredEntries = entries.filter(entry =>
        entry.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث في القيود التلقائية...' : 'Search automatic entries...'}
                        className="pl-9 bg-gray-50 border-gray-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAutomaticEntries} className="gap-2">
                        <Filter className="w-4 h-4" />
                        {language === 'ar' ? 'تحديث' : 'Refresh'}
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800">
                        <TableRow>
                            <TableHead className="w-[120px]">{language === 'ar' ? 'رقم القيد' : 'Entry #'}</TableHead>
                            <TableHead>{language === 'ar' ? 'المصدر' : 'Source'}</TableHead>
                            <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                            <TableHead className="w-[300px]">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                            <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                            <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead className="text-end">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                                </TableCell>
                            </TableRow>
                        ) : filteredEntries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                    {language === 'ar' ? 'لا توجد قيود تلقائية' : 'No automatic entries found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors" onClick={() => onViewDetails?.(entry)}>
                                    <TableCell className="font-mono font-medium text-blue-600">
                                        {entry.entry_number}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{getTypeLabel(entry.entry_type)}</span>
                                            {entry.reference_number && (
                                                <span className="text-xs text-gray-500 font-mono">{entry.reference_number}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(entry.entry_date), 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
                                    </TableCell>
                                    <TableCell className="text-gray-600 line-clamp-1">
                                        {entry.description}
                                    </TableCell>
                                    <TableCell className="font-bold font-mono">
                                        {Number((entry as any).total_debit || (entry as any).total_credit || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(entry.status)}
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewDetails?.(entry);
                                            }}
                                        >
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

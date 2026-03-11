/**
 * ════════════════════════════════════════════════════════════════
 * 📋 JournalFormTab - مكون القيد المحاسبي بـ NexaDataTable
 * 
 * Unified form for: Journal, Cash Journal, Receipt, Payment
 * Uses NexaDataTable in edit mode for line items.
 * 
 * Features:
 * - NexaDataTable with edit mode, auto-expansion, and balancing
 * - Dynamic header fields based on voucher type
 * - Smart account selection
 * - Auto-balance for receipt/payment (header account line)
 * - Full RTL support
 * - Integration with journalEntriesService
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useExchangeRateLookup, preloadExchangeRates } from '@/hooks/useExchangeRateLookup';
import { AccountingGrid, type GridEditableColumn } from '@/components/ui/accounting-grid';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { SmartAccountSelector } from '../../shared/SmartAccountSelector';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import type { SheetMode, UnifiedDocType } from '../types';
import { useViewCurrency } from '../../../hooks/useViewCurrency';
import {
    FileText,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    RefreshCw,
    Wallet,
    Loader2,
    Save,
    CloudOff,
    RotateCcw,
} from 'lucide-react';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface JournalLineRow {
    id: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    debit: number;
    credit: number;
    description: string;
    cost_center_id?: string;
    cost_center_name?: string;
    currency?: string;
    exchange_rate?: number;
    link_type?: 'none' | 'invoice' | 'container';
    invoice_id?: string;
    invoice_number?: string;
}

export interface JournalFormTabProps {
    data: any;
    mode: SheetMode;
    docType: UnifiedDocType;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
}

// ═══════════════════════════════════════
// Voucher Type Definitions
// ═══════════════════════════════════════

const VOUCHER_TYPE_MAP: Record<string, {
    labelAr: string;
    labelEn: string;
    icon: any;
    color: string;
    entryType: string;
}> = {
    journal: {
        labelAr: 'قيد يومية',
        labelEn: 'Journal Entry',
        icon: FileText,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        entryType: 'journal',
    },
    cash: {
        labelAr: 'يومية صندوق',
        labelEn: 'Cash Journal',
        icon: Wallet,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        entryType: 'cash',
    },
    receipt: {
        labelAr: 'سند قبض',
        labelEn: 'Receipt',
        icon: ArrowDownRight,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        entryType: 'receipt',
    },
    payment: {
        labelAr: 'سند صرف',
        labelEn: 'Payment',
        icon: ArrowUpRight,
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        entryType: 'payment',
    },
};

// ═══════════════════════════════════════
// Helper: create empty row
// ═══════════════════════════════════════
const createEmptyRow = (defaultCurrency: string = ''): JournalLineRow => ({
    id: crypto.randomUUID(),
    account_id: '',
    account_name: '',
    account_code: '',
    debit: 0,
    credit: 0,
    description: '',
    cost_center_id: '',
    currency: defaultCurrency,
    exchange_rate: 1,
    link_type: 'none',
    invoice_id: '',
    invoice_number: '',
});

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function JournalFormTab({
    data,
    mode,
    docType,
    onChange,
    onSaveComplete,
    companyId: propCompanyId,
}: JournalFormTabProps) {
    const { t, language, direction } = useLanguage();
    const { companyId: hookCompanyId } = useCompany();
    const { currencyCode: defaultCompanyCurrency } = useCompanyCurrency();
    const { currencyOptions, getRate } = useViewCurrency();
    const { autoPost, baseCurrency: accBaseCurrency } = useAccountingSettings();
    const companyCurrency = accBaseCurrency || defaultCompanyCurrency;
    const { lookupRate, lookupRateAsync } = useExchangeRateLookup();
    const isRTL = direction === 'rtl' || language === 'ar';
    const isReadOnly = mode === 'view';
    const isCreate = mode === 'create';
    const isEdit = mode === 'edit';
    const effectiveCompanyId = propCompanyId || hookCompanyId;

    // ─── Form State ───
    const [entryDate, setEntryDate] = useState<Date>(new Date());
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [voucherNo, setVoucherNo] = useState('');
    const [status, setStatus] = useState<string>('draft');
    const [headerAccountId, setHeaderAccountId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [voucherType, setVoucherType] = useState<string>(
        docType === 'receipt' ? 'receipt' :
            docType === 'payment' ? 'payment' :
                docType === 'cash' ? 'cash' :
                    'journal'
    );
    const [metaData, setMetaData] = useState<any>({});

    // ─── Lines Data ───
    const [lines, setLines] = useState<JournalLineRow[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // ─── Auto-Draft System ───
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>('idle');
    const draftTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const DRAFT_KEY = `nexa-draft-${docType}-${data?.id || 'new'}-${effectiveCompanyId || 'no-co'}`;
    const DRAFT_INTERVAL = 30_000; // 30 seconds

    // Save draft to localStorage
    const saveDraft = useCallback(() => {
        if (isReadOnly) return;
        const hasData = lines.some(r => r.account_id && (r.debit || r.credit));
        if (!hasData && !description && !reference) return; // Don't save empty drafts

        try {
            const draft = {
                entryDate: entryDate.toISOString(),
                reference,
                description,
                voucherNo,
                voucherType,
                status,
                headerAccountId,
                lines: lines.filter(r => r.account_id || r.description || r.debit || r.credit),
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setDraftStatus('saved');
            // Reset indicator after 3 seconds
            setTimeout(() => setDraftStatus('idle'), 3000);
        } catch (e) {
            console.warn('Failed to save draft:', e);
        }
    }, [isReadOnly, lines, entryDate, reference, description, voucherNo, voucherType, status, headerAccountId, DRAFT_KEY]);

    // Clear draft (after successful save)
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_KEY);
            setDraftStatus('idle');
        } catch (e) {
            console.warn('Failed to clear draft:', e);
        }
    }, [DRAFT_KEY]);

    // Restore draft from localStorage
    const restoreDraft = useCallback((draftData: any) => {
        try {
            setEntryDate(new Date(draftData.entryDate));
            setReference(draftData.reference || '');
            setDescription(draftData.description || '');
            setVoucherNo(draftData.voucherNo || '');
            setVoucherType(draftData.voucherType || docType || 'journal');
            setStatus(draftData.status || 'draft');
            setHeaderAccountId(draftData.headerAccountId || '');
            if (draftData.lines?.length > 0) {
                setLines(draftData.lines.map((line: any) => ({
                    ...line,
                    id: line.id || crypto.randomUUID(),
                })));
            }
            setDraftStatus('restored');
            toast.success(
                language === 'ar' ? 'تم استعادة المسودة' : 'Draft restored',
                { description: language === 'ar' ? 'يمكنك المتابعة من حيث توقفت' : 'You can continue where you left off' }
            );
        } catch (e) {
            console.warn('Failed to restore draft:', e);
        }
    }, [docType, language]);

    // Auto-save timer
    useEffect(() => {
        if (isReadOnly || !isDataLoaded) return;

        draftTimerRef.current = setInterval(() => {
            saveDraft();
        }, DRAFT_INTERVAL);

        // Also save on page unload (closing tab/browser)
        const handleBeforeUnload = () => saveDraft();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (draftTimerRef.current) clearInterval(draftTimerRef.current);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isReadOnly, isDataLoaded, saveDraft]);

    // ─── Load initial data ───
    useEffect(() => {
        if (data && (isEdit || isReadOnly)) {
            // Load existing entry
            setEntryDate(data.entry_date ? new Date(data.entry_date) : new Date());
            setReference(data.reference || data.entry_number || '');
            setDescription(data.description || '');
            setVoucherNo(data.entry_number || data.voucher_no || '');
            setStatus(data.status || 'draft');
            setVoucherType(data.entry_type || data.voucher_type || docType || 'journal');
            setMetaData({
                created_at: data.created_at,
                created_by_user: data.created_by_user,
                updated_at: data.updated_at,
            });

            // Load lines
            const loadedLines: JournalLineRow[] = data.lines?.map((line: any) => ({
                id: line.id || crypto.randomUUID(),
                account_id: line.account_id || '',
                account_name: line.account?.name_ar || line.account?.name_en || line.account_name || '',
                account_code: line.account?.code || line.account_code || '',
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                description: line.description || '',
                cost_center_id: line.cost_center_id || '',
                cost_center_name: line.cost_center?.name || '',
                currency: line.currency || companyCurrency,
                exchange_rate: Number(line.exchange_rate) || 1,
            })) || [];

            setLines(loadedLines.length > 0 ? loadedLines : []);
            setIsDataLoaded(true);

            // ─── Pre-warm exchange rate cache ───
            if (effectiveCompanyId) preloadExchangeRates(effectiveCompanyId);
            const uniqueCurrencies = [...new Set(loadedLines.map((l: JournalLineRow) => l.currency).filter(Boolean))];
            uniqueCurrencies.forEach((curr: string) => {
                if (curr && curr !== companyCurrency) {
                    lookupRateAsync(curr, companyCurrency); // fire-and-forget
                }
            });

        } else if (isCreate) {
            // Check for saved draft before starting fresh
            try {
                const savedDraft = localStorage.getItem(DRAFT_KEY);
                if (savedDraft) {
                    const draftData = JSON.parse(savedDraft);
                    const savedAt = new Date(draftData.savedAt);
                    const minutesAgo = Math.round((Date.now() - savedAt.getTime()) / 60000);
                    const timeLabel = minutesAgo < 60
                        ? (language === 'ar' ? `قبل ${minutesAgo} دقيقة` : `${minutesAgo} min ago`)
                        : (language === 'ar' ? `قبل ${Math.round(minutesAgo / 60)} ساعة` : `${Math.round(minutesAgo / 60)}h ago`);

                    // Show restore prompt
                    toast(
                        language === 'ar' ? '📋 يوجد مسودة محفوظة' : '📋 Saved draft found',
                        {
                            description: language === 'ar'
                                ? `تم حفظها ${timeLabel}. هل تريد استعادتها؟`
                                : `Saved ${timeLabel}. Would you like to restore it?`,
                            duration: 15000,
                            action: {
                                label: language === 'ar' ? 'استعادة' : 'Restore',
                                onClick: () => restoreDraft(draftData),
                            },
                            cancel: {
                                label: language === 'ar' ? 'تجاهل' : 'Dismiss',
                                onClick: () => clearDraft(),
                            },
                        }
                    );
                }
            } catch (e) {
                console.warn('Failed to check draft:', e);
            }

            // Fresh entry - NexaDataTable will handle initialEmptyRows
            setEntryDate(new Date());
            setReference('');
            setDescription('');
            setVoucherNo('');
            setStatus(autoPost ? 'posted' : 'draft');
            setLines(Array.from({ length: 8 }, () => createEmptyRow(companyCurrency)));
            setIsDataLoaded(true);
        }
    }, [data, mode, isEdit, isReadOnly, isCreate, docType, autoPost]);

    // ─── Computed: Totals ───
    const totals = useMemo(() => {
        return lines.reduce((acc, row) => ({
            debit: acc.debit + (Number(row.debit) || 0),
            credit: acc.credit + (Number(row.credit) || 0),
        }), { debit: 0, credit: 0 });
    }, [lines]);

    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
    const lineCount = lines.filter(r => r.account_id && (r.debit || r.credit)).length;

    // ─── Sync changes back to parent ───
    useEffect(() => {
        if (!isReadOnly) {
            onChange({
                entry_date: format(entryDate, 'yyyy-MM-dd'),
                reference,
                description,
                entry_number: voucherNo,
                entry_type: voucherType,
                status,
                header_account_id: headerAccountId,
                lines: lines.filter(r => r.account_id),
                total_debit: totals.debit,
                total_credit: totals.credit,
                _clearDraft: clearDraft, // Allow parent to clear draft after successful save
            });
        }
    }, [lines, entryDate, reference, description, voucherNo, voucherType, status, headerAccountId, totals, isReadOnly, clearDraft]);

    // Clear draft when mode changes to view (after successful save)
    useEffect(() => {
        if (mode === 'view') {
            clearDraft();
        }
    }, [mode, clearDraft]);

    // ─── Shared cell renderers ───
    const renderAmountCell = (val: number, color: string) => {
        return val > 0 ? (
            <span className={`font-mono text-sm ${color} font-medium`}>
                {val.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
        ) : <span className="text-muted-foreground text-xs">—</span>;
    };

    const renderAccountCell = (row: JournalLineRow) => {
        const { account_name: name, account_code: code } = row;
        if (!name && !code) return <span className="text-muted-foreground text-xs">—</span>;
        return (
            <div className="flex items-center gap-1.5">
                {code && <span className="font-mono text-xs text-muted-foreground">{code}</span>}
                <span className="text-sm truncate">{name}</span>
            </div>
        );
    };

    // ─── NexaDataTable Columns ───
    const columns = useMemo((): ColumnDef<JournalLineRow>[] => {
        const cols: ColumnDef<JournalLineRow>[] = [];

        // ══════════════════════════════════════════════
        // Amount columns — depend on voucherType
        // enableHiding: false يمنع إخفاء هذه الأعمدة من التفضيلات
        // ══════════════════════════════════════════════
        if (voucherType === 'journal') {
            // القيد المحاسبي: مدين ← دائن
            cols.push(
                {
                    accessorKey: 'debit',
                    header: language === 'ar' ? 'مدين' : 'Debit',
                    size: 105,
                    enableHiding: false,
                    cell: ({ row }) => renderAmountCell(Number(row.original.debit) || 0, 'text-green-700 dark:text-green-400'),
                },
                {
                    accessorKey: 'credit',
                    header: language === 'ar' ? 'دائن' : 'Credit',
                    size: 105,
                    enableHiding: false,
                    cell: ({ row }) => renderAmountCell(Number(row.original.credit) || 0, 'text-red-600 dark:text-red-400'),
                }
            );
        } else if (voucherType === 'cash') {
            // يومية الصندوق: مقبوضات ← مدفوعات
            cols.push(
                {
                    accessorKey: 'credit',
                    header: language === 'ar' ? 'مقبوضات' : 'Receipts',
                    size: 105,
                    enableHiding: false,
                    cell: ({ row }) => renderAmountCell(Number(row.original.credit) || 0, 'text-green-700 dark:text-green-400'),
                },
                {
                    accessorKey: 'debit',
                    header: language === 'ar' ? 'مدفوعات' : 'Payments',
                    size: 105,
                    enableHiding: false,
                    cell: ({ row }) => renderAmountCell(Number(row.original.debit) || 0, 'text-red-600 dark:text-red-400'),
                }
            );
        } else if (voucherType === 'receipt') {
            // سند القبض: مقبوضات
            cols.push({
                accessorKey: 'credit',
                header: language === 'ar' ? 'مقبوضات' : 'Receipts',
                size: 105,
                enableHiding: false,
                cell: ({ row }) => renderAmountCell(Number(row.original.credit) || 0, 'text-green-700 dark:text-green-400'),
            });
        } else if (voucherType === 'payment') {
            // سند الصرف: مدفوعات
            cols.push({
                accessorKey: 'debit',
                header: language === 'ar' ? 'مدفوعات' : 'Payments',
                size: 105,
                enableHiding: false,
                cell: ({ row }) => renderAmountCell(Number(row.original.debit) || 0, 'text-red-600 dark:text-red-400'),
            });
        }

        // ══════════════════════════════════════════════
        // Account column — always present
        // ══════════════════════════════════════════════
        cols.push({
            accessorKey: 'account_id',
            header: language === 'ar' ? 'الحساب' : 'Account',
            size: 200,
            enableHiding: false,
            cell: ({ row }) => renderAccountCell(row.original),
        });

        // ══════════════════════════════════════════════
        // Link columns — only for cash/receipt/payment
        // الربط: فاتورة أو بدون — مع عمود اختيار الفاتورة
        // ══════════════════════════════════════════════
        if (voucherType !== 'journal') {
            cols.push(
                {
                    accessorKey: 'link_type',
                    header: language === 'ar' ? 'الربط' : 'Link',
                    size: 80,
                    cell: ({ row }) => {
                        const lt = row.original.link_type;
                        if (!lt || lt === 'none') return <span className="text-muted-foreground text-xs">—</span>;
                        return (
                            <Badge variant="outline" className="text-[10px]">
                                {lt === 'invoice'
                                    ? (language === 'ar' ? 'فاتورة' : 'Invoice')
                                    : (language === 'ar' ? 'كونتينر' : 'Container')}
                            </Badge>
                        );
                    },
                },
                {
                    accessorKey: 'invoice_id',
                    header: language === 'ar' ? 'الفاتورة' : 'Invoice',
                    size: 120,
                    cell: ({ row }) => {
                        const invNum = row.original.invoice_number;
                        if (!invNum) return <span className="text-muted-foreground text-xs">—</span>;
                        return (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                                {invNum}
                            </Badge>
                        );
                    },
                }
            );
        }

        // ══════════════════════════════════════════════
        // Common columns — البيان، مركز التكلفة، العملة، سعر الصرف
        // هذه الأعمدة موجودة في كل الأنواع
        // ══════════════════════════════════════════════
        cols.push(
            {
                accessorKey: 'description',
                header: language === 'ar' ? 'البيان' : 'Description',
                size: 220,
            },
            {
                accessorKey: 'cost_center_id',
                header: language === 'ar' ? 'م.التكلفة' : 'Cost Center',
                size: 80,
                cell: ({ row }) => {
                    const name = row.original.cost_center_name;
                    return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground text-xs">—</span>;
                },
            },
            {
                accessorKey: 'currency',
                header: language === 'ar' ? 'العملة' : 'Curr',
                size: 55,
                cell: ({ row }) => {
                    const curr = row.original.currency || companyCurrency;
                    return <span className="font-mono text-xs font-medium">{curr}</span>;
                },
            },
            {
                accessorKey: 'exchange_rate',
                header: language === 'ar' ? 'سعر الصرف' : 'Rate',
                size: 60,
                cell: ({ row }) => {
                    const rate = row.original.exchange_rate ?? 1;
                    return (
                        <span className={cn('font-mono text-xs', rate !== 1 && 'text-amber-600 font-medium')}>
                            {rate.toFixed(4)}
                        </span>
                    );
                },
            },
            {
                id: 'base_equivalent',
                header: language === 'ar' ? `المعادل (${companyCurrency})` : `Equiv (${companyCurrency})`,
                size: 85,
                cell: ({ row }) => {
                    const rate = row.original.exchange_rate ?? 1;
                    const amount = row.original.debit || row.original.credit || 0;
                    if (amount === 0 || rate === 1) return <span className="text-muted-foreground text-xs">—</span>;
                    const equivalent = amount * rate;
                    return (
                        <span className="font-mono text-xs text-blue-600 font-medium">
                            {equivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    );
                },
            }
        );

        return cols;
    }, [voucherType, language]);

    // ─── NexaDataTable Edit Config ───
    const editableColumns = useMemo(() => {
        const cols: any[] = [];

        // Amount columns per type
        if (voucherType === 'journal') {
            cols.push(
                { key: 'debit', type: 'number' as const, min: 0 },
                { key: 'credit', type: 'number' as const, min: 0 }
            );
        } else if (voucherType === 'cash') {
            cols.push(
                { key: 'credit', type: 'number' as const, min: 0, placeholder: language === 'ar' ? 'مقبوضات' : 'Credit' },
                { key: 'debit', type: 'number' as const, min: 0, placeholder: language === 'ar' ? 'مدفوعات' : 'Payments' }
            );
        } else if (voucherType === 'receipt') {
            cols.push({ key: 'credit', type: 'number' as const, min: 0, placeholder: language === 'ar' ? 'مقبوضات' : 'Receipts' });
        } else if (voucherType === 'payment') {
            cols.push({ key: 'debit', type: 'number' as const, min: 0, placeholder: language === 'ar' ? 'مدفوعات' : 'Payments' });
        }

        // Account
        cols.push({ key: 'account_id', type: 'account' as const, required: true });

        // Link columns for non-journal types (بدون / فاتورة / كونتينر)
        if (voucherType !== 'journal') {
            cols.push(
                {
                    key: 'link_type', type: 'select' as const, options: [
                        { value: 'none', label: language === 'ar' ? 'بدون' : 'None' },
                        { value: 'invoice', label: language === 'ar' ? 'فاتورة' : 'Invoice' },
                        { value: 'container', label: language === 'ar' ? 'كونتينر' : 'Container' },
                    ]
                },
                { key: 'invoice_id', type: 'text' as const, placeholder: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #' },
            );
        }

        // Common editable columns — البيان، م.التكلفة، العملة، سعر الصرف
        cols.push(
            { key: 'description', type: 'text' as const, placeholder: language === 'ar' ? 'البيان...' : 'Description...' },
            { key: 'cost_center_id', type: 'text' as const, placeholder: language === 'ar' ? 'مركز التكلفة' : 'Cost Center' },
            {
                key: 'currency', type: 'select' as const, options: currencyOptions.map(c => (
                    { value: c, label: c }
                ))
            },
            { key: 'exchange_rate', type: 'number' as const, min: 0, placeholder: '1.0000' },
        );

        return cols;
    }, [voucherType, language]);

    // ─── Row factory for AccountingGrid ───
    const handleAddRow = useCallback((): JournalLineRow => {
        return createEmptyRow(companyCurrency);
    }, [companyCurrency]);

    const handleInsertRow = useCallback((index: number): JournalLineRow => {
        return createEmptyRow(companyCurrency);
        void index;
    }, [companyCurrency]);

    // ─── AccountingGrid onChange bridge ───
    const handleLinesChange = useCallback((updatedRows: JournalLineRow[]) => {
        setLines(updatedRows);
    }, []);

    // ─── Cell Change Interceptor (Fires before saving to NexaDataTable) ───
    const handleCellChange = useCallback((rowIndex: number, colKey: string, newValue: unknown, currentRow: JournalLineRow): JournalLineRow | void => {
        let newRow = { ...currentRow };
        let modified = false;

        if (colKey === 'currency' && typeof newValue === 'string') {
            const targetCurrency = newValue || companyCurrency;
            newRow.currency = targetCurrency;
            
            console.log(`[JournalFormTab] Currency changed to ${targetCurrency}. Base currency is: ${companyCurrency}`);

            if (targetCurrency === companyCurrency) {
                console.log(`[JournalFormTab] Target equals base currency. Rate is 1.0`);
                newRow.exchange_rate = 1;
                modified = true;
            } else {
                let rate = lookupRate(targetCurrency, companyCurrency);
                console.log(`[JournalFormTab] lookupRate returned:`, rate);
                if (rate === 1) rate = getRate(targetCurrency, companyCurrency);
                console.log(`[JournalFormTab] getRate returned:`, rate);
                
                if (rate !== 1) {
                    newRow.exchange_rate = rate;
                    modified = true;
                    console.log(`[JournalFormTab] Rate found synchronously:`, rate);
                } else {
                    console.log(`[JournalFormTab] Fallback to async fetch...`);
                    // Try to wait for async but inform user if needed
                    // (we don't import toast here, so we'll just log and rely on the async update) // Wait, I can import toast, but let's just do it silently and let the async setLines handle it.
                    // Wait, if it's setLines, in NexaDataTable, the parent updating setLines doesn't update editedData while editing (unless we fixed it in nexa-data-table.tsx, which we did!)
                    
                    lookupRateAsync(targetCurrency, companyCurrency).then(asyncRate => {
                        console.log(`[JournalFormTab] asyncRate fetched target=${targetCurrency} base=${companyCurrency} rate=${asyncRate}`);
                        if (asyncRate && asyncRate !== 1) {
                            setLines(prev => prev.map((l, i) => 
                                i === rowIndex && l.currency === targetCurrency
                                    ? { ...l, exchange_rate: asyncRate }
                                    : l
                            ));
                        }
                    });
                }
            }
        }

        return modified ? newRow : undefined;
    }, [companyCurrency, lookupRate, getRate, lookupRateAsync]);

    // ─── Status helpers ───
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'posted': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200';
            case 'draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200';
            default: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200';
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'posted': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'draft': return <Clock className="w-4 h-4 text-gray-600" />;
            default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
        }
    };

    // Available voucher types for the tab selector
    const availableVoucherTypes = useMemo(() => {
        // In create mode, allow switching between types
        if (isCreate) {
            return Object.entries(VOUCHER_TYPE_MAP).map(([key, val]) => ({
                value: key,
                ...val,
            }));
        }
        // In view/edit mode, show only the current type
        const current = VOUCHER_TYPE_MAP[voucherType] || VOUCHER_TYPE_MAP['journal'];
        return [{ value: voucherType, ...current }];
    }, [isCreate, voucherType]);

    // ═══════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ─── 1. Compact Header Bar ─── */}
            <div className="shrink-0 px-4 py-2.5 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-850 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Status Badge */}
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold", getStatusColor(status))}>
                        {getStatusIcon(status)}
                        <span className="capitalize">{status}</span>
                    </div>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Voucher Number */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('accounting.voucherNumber') || '#'}</span>
                        {isReadOnly ? (
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{voucherNo || '—'}</span>
                        ) : (
                            <Input
                                value={voucherNo}
                                onChange={(e) => setVoucherNo(e.target.value)}
                                className="font-mono text-center w-24 h-7 text-xs bg-gray-50/50 border-dashed focus:border-solid"
                                placeholder="Auto"
                            />
                        )}
                    </div>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('accounting.entry.date') || 'التاريخ'}</span>
                        <Popover>
                            <PopoverTrigger asChild disabled={isReadOnly}>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal h-7 text-xs bg-gray-50/30 px-2.5",
                                        !entryDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3 w-3 opacity-50" />
                                    {entryDate
                                        ? format(entryDate, "dd/MM/yyyy")
                                        : <span>{t('common.selectDate') || 'اختر'}</span>
                                    }
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={entryDate}
                                    onSelect={(d) => d && setEntryDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                    {/* Reference */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[120px] max-w-[250px]">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">{t('accounting.entry.reference') || 'مرجع'}</span>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder={isRTL ? "فاتورة، شيك..." : "Invoice, check..."}
                            readOnly={isReadOnly}
                            className="bg-gray-50/30 h-7 text-xs flex-1"
                        />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Live Balance Summary */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                                {voucherType === 'cash' || voucherType === 'payment'
                                    ? (isRTL ? 'مدفوعات' : 'Out')
                                    : (t('accounting.debit') || 'م')}
                            </span>
                            <span className="font-bold text-red-600">{totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                                {voucherType === 'cash' || voucherType === 'receipt'
                                    ? (isRTL ? 'مقبوضات' : 'In')
                                    : (t('accounting.credit') || 'د')}
                            </span>
                            <span className="font-bold text-green-600">{totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {/* تحذير عدم التوازن — فقط للقيود اليومية */}
                        {voucherType === 'journal' && !isBalanced && !isReadOnly ? (
                            <Badge variant="destructive" className="animate-pulse text-[10px] h-5 px-1.5">
                                {Math.abs(totals.debit - totals.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Badge>
                        ) : lineCount > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] h-5 px-1.5">✓</Badge>
                        ) : null}
                    </div>


                    {/* Draft Status */}
                    {!isReadOnly && draftStatus !== 'idle' && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] gap-1 h-5",
                                draftStatus === 'saved' && "bg-blue-50 text-blue-600 border-blue-200",
                                draftStatus === 'restored' && "bg-amber-50 text-amber-600 border-amber-200",
                            )}
                        >
                            {draftStatus === 'saved' && <><Save className="w-2.5 h-2.5" /> {isRTL ? 'مسودة' : 'Draft'}</>}
                            {draftStatus === 'restored' && <><RotateCcw className="w-2.5 h-2.5" /> {isRTL ? 'استعادة' : 'Restored'}</>}
                        </Badge>
                    )}
                </div>

                {/* Description Row (compact) */}
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">{t('accounting.entry.description') || 'البيان'}</span>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={isRTL ? 'بيان القيد...' : 'Entry description...'}
                        readOnly={isReadOnly}
                        className={cn("bg-transparent h-7 text-xs border-dashed border-gray-200 dark:border-gray-700 focus:border-solid flex-1", description ? "font-medium" : "")}
                    />
                </div>
            </div>

            {/* ─── 2. Voucher Type Selector (Create mode only) ─── */}
            {isCreate && (
                <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center p-0.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-4xl mx-auto">
                        {availableVoucherTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = voucherType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setVoucherType(type.value)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                        isSelected
                                            ? cn("shadow-sm ring-1 ring-black/5", type.color)
                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    )}
                                >
                                    <Icon className={cn("w-3 h-3", isSelected ? "opacity-100" : "opacity-70")} />
                                    <span>{isRTL ? type.labelAr : type.labelEn}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── 3. Fund Account (Receipt/Payment/Cash) ─── */}
            {(voucherType === 'receipt' || voucherType === 'payment' || voucherType === 'cash') && (
                <div className="shrink-0 px-4 py-2 border-b border-yellow-100 dark:border-yellow-900/30 bg-yellow-50/30 dark:bg-yellow-950/10">
                    <div className="flex items-center gap-3">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            {voucherType === 'receipt'
                                ? <><ArrowDownRight className="w-3 h-3 text-green-500" /> {t('accounting.receipt.fund') || 'إيداع في'}</>
                                : voucherType === 'payment'
                                    ? <><ArrowUpRight className="w-3 h-3 text-red-500" /> {t('accounting.payment.fund') || 'الصرف من'}</>
                                    : <><ArrowRightLeft className="w-3 h-3 text-blue-500" /> {t('accounting.cash.fund') || 'الصندوق'}</>
                            }
                        </Label>
                        {!isReadOnly ? (
                            <div className="flex-1 max-w-md">
                                <SmartAccountSelector
                                    value={headerAccountId}
                                    onChange={(id) => setHeaderAccountId(id)}
                                    placeholder={isRTL ? "اختر حساب الصندوق أو البنك..." : "Select fund account..."}
                                    className="bg-yellow-50/50 border-yellow-200 focus:ring-yellow-200 h-8 text-xs"
                                />
                            </div>
                        ) : (
                            <span className="text-sm font-medium">{headerAccountId || '—'}</span>
                        )}
                    </div>
                </div>
            )}

            {/* ─── 4. AccountingGrid (fills remaining space) ─── */}
            <div
                className="flex-1 min-h-0 overflow-auto"
                onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                    }
                }}
            >
                <AccountingGrid<JournalLineRow>
                    rows={lines}
                    onChange={handleLinesChange}
                    columns={columns}
                    editableColumns={editableColumns as GridEditableColumn[]}
                    isRTL={isRTL}

                    // Debit / Credit configuration
                    debitKey="debit"
                    creditKey="credit"

                    // Totals Footer
                    showTotalsFooter={!isReadOnly}
                    showAmountInWords={true}

                    // ── Footer labels حسب نوع الوثيقة ──
                    footerDebitLabel={
                        voucherType === 'cash' || voucherType === 'payment'
                            ? (isRTL ? 'إجمالي المدفوعات' : 'Total Payments')
                            : undefined
                    }
                    footerCreditLabel={
                        voucherType === 'cash' || voucherType === 'receipt'
                            ? (isRTL ? 'إجمالي المقبوضات' : 'Total Receipts')
                            : undefined
                    }
                    // إخفاء الرصيد لليومية الصندوق/المقبوضات/المدفوعات (يتوازن مع الصندوق تلقائياً)
                    hideFooterBalance={voucherType !== 'journal'}

                    // Row management
                    onAddRow={handleAddRow}
                    onInsertRow={handleInsertRow}
                    onDeleteRow={(_, __) => { void __; }}
                    initialEmptyRows={0}
                    emptyRowsThreshold={3}
                    autoAddRowsCount={3}
                    canDeleteRows={!isReadOnly}

                    // Cell change interceptor (currency → exchange rate sync)
                    onCellChange={!isReadOnly ? handleCellChange : undefined}

                    // Accounting Balance Shortcut (Ctrl+B / * Enter / double-click)
                    // فقط للقيود اليومية — الصندوق يتوازن تلقائياً مع الصندوق
                    enableBalanceShortcut={voucherType === 'journal'}
                    hideBalanceWarning={voucherType !== 'journal'}

                    // Keyboard Help
                    showKeyboardHelp={!isReadOnly}
                    isReadOnly={isReadOnly}

                    // Company
                    companyId={effectiveCompanyId || undefined}

                    // Empty message
                    emptyMessage={isRTL ? 'لا توجد بنود' : 'No line items'}
                    maxHeight="100%"
                />

            </div>

            {/* ─── 5. Meta Info (View Mode) ─── */}
            {isReadOnly && metaData.created_at && (
                <div className="shrink-0 flex items-center justify-between text-[10px] text-muted-foreground px-4 py-1.5 border-t bg-gray-50/50 dark:bg-gray-900/50">
                    <span>{t('common.createdAt') || 'تاريخ الإنشاء'}: {format(new Date(metaData.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    {metaData.created_by_user?.name && (
                        <span>{t('common.by') || 'بواسطة'}: {metaData.created_by_user.name}</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default JournalFormTab;

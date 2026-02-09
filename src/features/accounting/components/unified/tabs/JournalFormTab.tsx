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
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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
const createEmptyRow = (): JournalLineRow => ({
    id: crypto.randomUUID(),
    account_id: '',
    account_name: '',
    account_code: '',
    debit: 0,
    credit: 0,
    description: '',
    cost_center_id: '',
    currency: 'SAR',
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
    const { autoPost } = useAccountingSettings();
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
                currency: 'SAR',
                exchange_rate: 1,
            })) || [];

            setLines(loadedLines.length > 0 ? loadedLines : []);
            setIsDataLoaded(true);
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
            setLines([]);
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
            size: 180,
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
                size: 300,
            },
            {
                accessorKey: 'cost_center_id',
                header: language === 'ar' ? 'م.التكلفة' : 'Cost Center',
                size: 100,
                cell: ({ row }) => {
                    const name = row.original.cost_center_name;
                    return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground text-xs">—</span>;
                },
            },
            {
                accessorKey: 'currency',
                header: language === 'ar' ? 'العملة' : 'Curr',
                size: 60,
                cell: ({ row }) => {
                    const curr = row.original.currency || 'SAR';
                    return <span className="font-mono text-xs font-medium">{curr}</span>;
                },
            },
            {
                accessorKey: 'exchange_rate',
                header: language === 'ar' ? 'سعر الصرف' : 'Rate',
                size: 70,
                cell: ({ row }) => {
                    const rate = row.original.exchange_rate ?? 1;
                    return (
                        <span className={cn('font-mono text-xs', rate !== 1 && 'text-amber-600 font-medium')}>
                            {rate.toFixed(4)}
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
                key: 'currency', type: 'select' as const, options: [
                    { value: 'SAR', label: 'SAR' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'AED', label: 'AED' },
                    { value: 'UAH', label: 'UAH' },
                ]
            },
            { key: 'exchange_rate', type: 'number' as const, min: 0, placeholder: '1.0000' },
        );

        return cols;
    }, [voucherType, language]);

    // ─── Row factory for NexaDataTable ───
    const handleAddRow = useCallback(() => {
        const newRow = createEmptyRow();
        setLines(prev => [...prev, newRow]);
        return newRow;
    }, []);

    const handleInsertRow = useCallback((index: number) => {
        const newRow = createEmptyRow();
        setLines(prev => {
            const copy = [...prev];
            copy.splice(index + 1, 0, newRow);
            return copy;
        });
        return newRow;
    }, []);

    // ─── Save handler for NexaDataTable ───
    const handleNexaSave = useCallback(async (updatedData: JournalLineRow[]) => {
        // Update local state with the cleaned data
        setLines(updatedData);
    }, []);

    // ─── Data change handler (real-time cell edits) ───
    const handleDataChange = useCallback((updatedData: JournalLineRow[]) => {
        setLines(updatedData);
    }, []);

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
        <div className="flex flex-col gap-4 p-4">

            {/* ─── 1. Dashboard Cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Status */}
                <Card className={cn("p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm", getStatusColor(status))}>
                    <div className="flex items-center gap-1.5">
                        {getStatusIcon(status)}
                        <span className="font-bold text-sm capitalize">{status}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{t('accounting.entryStatus') || 'الحالة'}</span>
                </Card>

                {/* Line Count */}
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-1.5 text-blue-600">
                        <FileText className="w-4 h-4" />
                        <span className="font-bold text-sm">{lineCount}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.lines') || 'البنود'}</span>
                </Card>

                {/* Total Debit */}
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm bg-white dark:bg-gray-800">
                    <span className="font-bold text-sm text-green-600 font-mono">
                        {totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.debit') || 'مدين'}</span>
                </Card>

                {/* Total Credit */}
                <Card className="p-3 flex flex-col items-center justify-center gap-1.5 border shadow-sm bg-white dark:bg-gray-800">
                    <span className="font-bold text-sm text-red-600 font-mono">
                        {totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{t('accounting.credit') || 'دائن'}</span>
                </Card>
            </div>

            {/* ─── 2. Voucher Type Selector (Create mode only) ─── */}
            {isCreate && (
                <div className="flex justify-center w-full mb-6">
                    <div className="flex items-center p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-4xl">
                        {availableVoucherTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = voucherType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setVoucherType(type.value)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isSelected
                                            ? cn("shadow-sm ring-1 ring-black/5", type.color)
                                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5", isSelected ? "opacity-100" : "opacity-70")} />
                                    <span>{isRTL ? type.labelAr : type.labelEn}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── 3. Header Fields ─── */}
            <div className="grid grid-cols-12 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                {/* Voucher Number */}
                <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.voucherNumber') || 'رقم القيد'}
                    </Label>
                    {isReadOnly ? (
                        <div className="font-mono text-sm font-bold bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-md border text-center">
                            {voucherNo || 'تلقائي'}
                        </div>
                    ) : (
                        <Input
                            value={voucherNo}
                            onChange={(e) => setVoucherNo(e.target.value)}
                            className="font-mono text-center bg-gray-50/50 border-dashed focus:border-solid"
                            placeholder="Auto"
                        />
                    )}
                </div>

                {/* Date */}
                <div className="col-span-12 md:col-span-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.entry.date') || 'التاريخ'}
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild disabled={isReadOnly}>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal h-9 bg-gray-50/30",
                                    !entryDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {entryDate
                                    ? format(entryDate, "PPP", { locale: language === 'ar' ? ar : undefined })
                                    : <span>{t('common.selectDate') || 'اختر التاريخ'}</span>
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

                {/* Dynamic: Fund Account for Receipt/Payment/Cash */}
                {(voucherType === 'receipt' || voucherType === 'payment' || voucherType === 'cash') && (
                    <div className="col-span-12 md:col-span-6 animate-in fade-in zoom-in-95 duration-200">
                        <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                            {voucherType === 'receipt'
                                ? <><ArrowDownRight className="w-3 h-3 text-green-500" /> {t('accounting.receipt.fund') || 'إيداع في (الصندوق/البنك)'}</>
                                : voucherType === 'payment'
                                    ? <><ArrowUpRight className="w-3 h-3 text-red-500" /> {t('accounting.payment.fund') || 'الصرف من (الصندوق/البنك)'}</>
                                    : <><ArrowRightLeft className="w-3 h-3 text-blue-500" /> {t('accounting.cash.fund') || 'الصندوق/البنك المسؤول'}</>
                            }
                        </Label>
                        {!isReadOnly ? (
                            <SmartAccountSelector
                                value={headerAccountId}
                                onChange={(id) => setHeaderAccountId(id)}
                                placeholder="اختر حساب الصندوق أو البنك..."
                                className="bg-yellow-50/50 border-yellow-200 focus:ring-yellow-200"
                            />
                        ) : (
                            <div className="h-9 border rounded-md px-3 flex items-center bg-gray-50 text-sm">
                                {headerAccountId || '—'}
                            </div>
                        )}
                    </div>
                )}

                {/* Reference */}
                <div className={cn(
                    "col-span-12",
                    (voucherType === 'receipt' || voucherType === 'payment' || voucherType === 'cash') ? "md:col-span-3" : "md:col-span-6"
                )}>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.entry.reference') || 'المرجع'}
                    </Label>
                    <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="رقم الفاتورة، شيك..."
                        readOnly={isReadOnly}
                        className="bg-gray-50/30 h-9"
                    />
                </div>

                {/* Description */}
                <div className="col-span-12">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                        {t('accounting.entry.description') || 'البيان'}
                    </Label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('accounting.entry.description') || 'البيان'}
                        readOnly={isReadOnly}
                        className={cn("bg-gray-50/30 h-9", description ? "font-medium" : "")}
                    />
                </div>
            </div>

            {/* ─── 4. NexaDataTable Grid ─── */}
            <div
                className="border rounded-xl shadow-sm bg-white dark:bg-gray-800 overflow-hidden"
                onKeyDown={(e) => {
                    // Ctrl+S / Cmd+S → trigger parent save
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        // The save is handled by UnifiedAccountingSheet's ActionToolbar
                        // We just prevent the browser's default save dialog
                    }
                }}
            >
                <NexaDataTable
                    key={`nexa-${voucherType}`}
                    data={lines}
                    columns={columns}
                    isRTL={isRTL}
                    persistKey={`accounting-${voucherType}-lines-v4`}

                    // Excel Mode - no pagination, scrollable
                    enableExcelMode={true}
                    enablePagination={false}
                    maxHeight="400px"

                    // Totals Footer
                    showTotalsFooter={true}
                    debitKey="debit"
                    creditKey="credit"
                    showAmountInWords={true}

                    // Sequence Number
                    enableSequenceNumber={true}

                    // Edit Mode - Instant edit for create/edit, no internal save buttons
                    enableEditMode={!isReadOnly}
                    enableInstantEdit={!isReadOnly}
                    editableColumns={editableColumns}
                    onSave={handleNexaSave}
                    onDataChange={handleDataChange}
                    onAddRow={handleAddRow}
                    onInsertRow={handleInsertRow}
                    initialEmptyRows={isCreate ? 8 : 0}
                    emptyRowsThreshold={3}
                    autoAddRowsCount={3}
                    editModeExtraRows={isEdit ? 5 : 0}
                    cleanEmptyRowsOnSave={true}
                    canDeleteRows={!isReadOnly}

                    // Accounting Balance Shortcut (* + Enter, double-click)
                    enableBalanceShortcut={true}

                    // Keyboard Help Panel (shows shortcuts: =, *, Ctrl+D, etc.)
                    showKeyboardHelp={!isReadOnly}

                    // Search & Export (view mode only)
                    enableSearch={isReadOnly}
                    enableExport={isReadOnly}

                    // Empty message
                    emptyMessage={isRTL ? 'لا توجد بنود' : 'No line items'}
                />
            </div>

            {/* ─── 5. Balance Status + Draft Indicator ─── */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4 text-sm font-mono">
                    <span className="text-green-600 font-bold">
                        {t('accounting.debit') || 'مدين'}: {totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-red-600 font-bold">
                        {t('accounting.credit') || 'دائن'}: {totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Draft Status Indicator */}
                    {!isReadOnly && draftStatus !== 'idle' && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] gap-1 transition-all duration-300",
                                draftStatus === 'saved' && "bg-blue-50 text-blue-600 border-blue-200",
                                draftStatus === 'restored' && "bg-amber-50 text-amber-600 border-amber-200",
                            )}
                        >
                            {draftStatus === 'saved' && <><Save className="w-3 h-3" /> {isRTL ? 'مسودة محفوظة' : 'Draft saved'}</>}
                            {draftStatus === 'restored' && <><RotateCcw className="w-3 h-3" /> {isRTL ? 'تم الاستعادة' : 'Restored'}</>}
                        </Badge>
                    )}

                    {/* Balance Status */}
                    {!isBalanced && !isReadOnly ? (
                        <Badge variant="destructive" className="animate-pulse text-xs">
                            {t('accounting.notBalanced') || 'غير متوازن'}: {Math.abs(totals.debit - totals.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Badge>
                    ) : lineCount > 0 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            ✓ {t('accounting.balanced') || 'متوازن'}
                        </Badge>
                    ) : null}
                </div>
            </div>

            {/* ─── 6. Meta Info (View Mode) ─── */}
            {isReadOnly && metaData.created_at && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-2 pt-2 border-t">
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

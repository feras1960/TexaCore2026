/**
 * 🏆 NexaSalesTable — Premium Sales Document List
 *
 * A modern, domain-specific table for the Sales Cycle page.
 * Features: color-coded cards, rich status badges, hover effects,
 * customer avatars, and formatted amounts.
 *
 * ✅ RTL/LTR support
 * ✅ Translation keys via t()
 * ✅ Search & pagination
 * ✅ Responsive
 * ✅ Numeric Parity (Western digits per Constitution Law 6)
 */

import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    FileText, ShoppingCart, Truck, Package, RotateCcw, MoreHorizontal,
    Calendar, User, Receipt, Eye, Pencil, Copy, Trash2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ─── Types ───
type CycleType = 'quotation' | 'order' | 'delivery' | 'invoice' | 'return' | 'reservation';

interface SalesDocument {
    id: string;
    document_number: string;
    date: string;
    type: CycleType;
    status: string;
    total_amount: number;
    customer_id?: string;
    customer_name?: string;
    customer_name_display?: string;
    currency: string;
    created_at: string;
}

interface NexaSalesTableProps {
    data: SalesDocument[];
    isLoading?: boolean;
    pageSize?: number;
    onRowClick: (doc: SalesDocument) => void;
    onEdit?: (doc: SalesDocument) => void;
    onDuplicate?: (doc: SalesDocument) => void;
    onDelete?: (doc: SalesDocument) => void;
}

// ─── Type Config ───
const TYPE_CONFIG: Record<CycleType, {
    icon: React.ReactNode;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
    typeKey: string; // translation key
}> = {
    quotation: {
        icon: <FileText className="w-4 h-4" />,
        borderColor: 'border-s-purple-500',
        badgeBg: 'bg-purple-50 dark:bg-purple-950/30',
        badgeText: 'text-purple-700 dark:text-purple-400',
        dotColor: 'bg-purple-500',
        typeKey: 'sales.types.quotation',
    },
    order: {
        icon: <ShoppingCart className="w-4 h-4" />,
        borderColor: 'border-s-blue-500',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/30',
        badgeText: 'text-blue-700 dark:text-blue-400',
        dotColor: 'bg-blue-500',
        typeKey: 'sales.types.order',
    },
    delivery: {
        icon: <Truck className="w-4 h-4" />,
        borderColor: 'border-s-orange-500',
        badgeBg: 'bg-orange-50 dark:bg-orange-950/30',
        badgeText: 'text-orange-700 dark:text-orange-400',
        dotColor: 'bg-orange-500',
        typeKey: 'sales.types.delivery',
    },
    invoice: {
        icon: <Receipt className="w-4 h-4" />,
        borderColor: 'border-s-indigo-500',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/30',
        badgeText: 'text-indigo-700 dark:text-indigo-400',
        dotColor: 'bg-indigo-500',
        typeKey: 'sales.types.invoice',
    },
    return: {
        icon: <RotateCcw className="w-4 h-4" />,
        borderColor: 'border-s-rose-500',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/30',
        badgeText: 'text-rose-700 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        typeKey: 'sales.types.return',
    },
    reservation: {
        icon: <Package className="w-4 h-4" />,
        borderColor: 'border-s-cyan-500',
        badgeBg: 'bg-cyan-50 dark:bg-cyan-950/30',
        badgeText: 'text-cyan-700 dark:text-cyan-400',
        dotColor: 'bg-cyan-500',
        typeKey: 'sales.types.reservation',
    },
};

// ─── Status Config (using translation keys) ───
const STATUS_STYLES: Record<string, {
    bg: string;
    text: string;
    dot: string;
}> = {
    draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
    saved: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    approved: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    confirmed: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    posted: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    delivered: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
    cancelled: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    completed: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

// ─── Component ───
export const NexaSalesTable: React.FC<NexaSalesTableProps> = ({
    data,
    isLoading = false,
    pageSize = 15,
    onRowClick,
    onEdit,
    onDuplicate,
    onDelete,
}) => {
    const { t, language, direction } = useLanguage();
    const isAr = language === 'ar';
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // ─── Filter ───
    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter(d =>
            d.document_number?.toLowerCase().includes(q) ||
            d.customer_name_display?.toLowerCase().includes(q) ||
            d.customer_name?.toLowerCase().includes(q)
        );
    }, [data, search]);

    // ─── Pagination ───
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const paged = filtered.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize);

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM yyyy', { locale: isAr ? ar : undefined });
        } catch {
            return dateStr || '-';
        }
    };

    // Constitution Law 6: Western Arabic numerals (0-9) for financial values
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getCustomerInitials = (name: string) => {
        if (!name || name === '-') return '?';
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    };

    // Resolve status label from translation keys: common.status.{status}
    const getStatusLabel = (status: string) => {
        return t(`common.status.${status}`) || status;
    };

    // ─── Skeleton Loader ───
    if (isLoading) {
        return (
            <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-36 bg-gray-200 rounded" />
                            <div className="h-3 w-28 bg-gray-100 rounded" />
                        </div>
                        <div className="h-5 w-24 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" dir={direction}>
            {/* ─── Search Bar ─── */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="relative max-w-md">
                    <Search className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400",
                        isAr ? "right-3" : "left-3"
                    )} />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder={t('sales.table.searchPlaceholder')}
                        className={cn(
                            "h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm",
                            isAr ? "pr-10 pl-3" : "pl-10 pr-3"
                        )}
                    />
                </div>
            </div>

            {/* ─── Column Headers ─── */}
            <div className="hidden md:grid grid-cols-[1fr_130px_130px_1fr_150px_110px_44px] gap-2 px-5 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <span>{t('sales.table.documentNumber')}</span>
                <span>{t('sales.table.type')}</span>
                <span>{t('sales.table.date')}</span>
                <span>{t('sales.table.customer')}</span>
                <span className="text-end">{t('sales.table.total')}</span>
                <span className="text-center">{t('sales.table.status')}</span>
                <span></span>
            </div>

            {/* ─── Rows ─── */}
            <div className="flex-1 overflow-y-auto">
                {paged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FileText className="w-14 h-14 mb-3 opacity-25" />
                        <p className="text-sm font-semibold">{t('sales.table.noDocuments')}</p>
                        <p className="text-xs mt-1.5 opacity-60">{t('sales.table.adjustFilters')}</p>
                    </div>
                ) : (
                    paged.map((doc, idx) => {
                        const typeConf = TYPE_CONFIG[doc.type] || TYPE_CONFIG.order;
                        const statusStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.draft;
                        const customerName = doc.customer_name_display || doc.customer_name || t('sales.table.unknownCustomer');

                        return (
                            <div
                                key={doc.id}
                                onClick={() => onRowClick(doc)}
                                className={cn(
                                    "group cursor-pointer transition-all duration-200",
                                    "border-s-[3px] border-b border-gray-50 dark:border-gray-800/50",
                                    typeConf.borderColor,
                                    "hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-transparent dark:hover:from-gray-800/30",
                                    "hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                                    idx === 0 && "border-t border-t-gray-50"
                                )}
                            >
                                {/* ═══ Desktop Layout ═══ */}
                                <div className="hidden md:grid grid-cols-[1fr_130px_130px_1fr_150px_110px_44px] gap-2 items-center px-5 py-3.5">

                                    {/* Document # */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight group-hover:text-indigo-600 transition-colors">
                                            {doc.document_number || '-'}
                                        </span>
                                    </div>

                                    {/* Type Badge */}
                                    <div>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                                            typeConf.badgeBg, typeConf.badgeText
                                        )}>
                                            {typeConf.icon}
                                            {t(typeConf.typeKey)}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                                        <span className="text-sm font-mono">{formatDate(doc.date || doc.created_at)}</span>
                                    </div>

                                    {/* Customer */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                                            "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600",
                                            "dark:from-slate-700 dark:to-slate-800 dark:text-slate-300"
                                        )}>
                                            {getCustomerInitials(customerName)}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                            {customerName}
                                        </span>
                                    </div>

                                    {/* Total Amount (Western digits per Constitution Law 6) */}
                                    <div className="text-end">
                                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                            {formatAmount(doc.total_amount)}
                                        </span>
                                        <span className="text-[11px] text-gray-400 ms-1.5 font-semibold">
                                            {doc.currency}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="flex justify-center">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                            statusStyle.bg, statusStyle.text
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                                            {getStatusLabel(doc.status)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isAr ? "start" : "end"} className="w-48">
                                                <DropdownMenuItem onClick={() => onRowClick(doc)} className="gap-2 cursor-pointer">
                                                    <Eye className="w-4 h-4" />
                                                    {t('sales.table.viewDetails')}
                                                </DropdownMenuItem>
                                                {onEdit && (
                                                    <DropdownMenuItem onClick={() => onEdit(doc)} className="gap-2 cursor-pointer">
                                                        <Pencil className="w-4 h-4" />
                                                        {t('sales.table.edit')}
                                                    </DropdownMenuItem>
                                                )}
                                                {onDuplicate && (
                                                    <DropdownMenuItem onClick={() => onDuplicate(doc)} className="gap-2 cursor-pointer">
                                                        <Copy className="w-4 h-4" />
                                                        {t('sales.table.duplicate')}
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
                                                    <DropdownMenuItem onClick={() => onDelete(doc)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                        {t('sales.table.delete')}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* ═══ Mobile Layout — Card Style ═══ */}
                                <div className="md:hidden p-4 space-y-2.5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                                                {doc.document_number || '-'}
                                            </span>
                                            <span className={cn(
                                                "ms-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold",
                                                typeConf.badgeBg, typeConf.badgeText
                                            )}>
                                                {typeConf.icon}
                                                {t(typeConf.typeKey)}
                                            </span>
                                        </div>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                                            statusStyle.bg, statusStyle.text
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                                            {getStatusLabel(doc.status)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-medium truncate">{customerName}</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(doc.date || doc.created_at)}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">
                                            {formatAmount(doc.total_amount)} <span className="text-[11px] text-gray-400">{doc.currency}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ─── Pagination ─── */}
            {filtered.length > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-sm">
                    <span className="text-xs text-gray-500 font-mono tabular-nums">
                        {((currentPageSafe - 1) * pageSize) + 1} - {Math.min(currentPageSafe * pageSize, filtered.length)} {t('sales.table.of')} {filtered.length}
                    </span>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            disabled={currentPageSafe === 1}
                            onClick={() => setCurrentPage(1)}>
                            {isAr ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            disabled={currentPageSafe === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>

                        <span className="text-xs font-mono px-3 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 tabular-nums">
                            {currentPageSafe} / {totalPages}
                        </span>

                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            disabled={currentPageSafe === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            disabled={currentPageSafe === totalPages}
                            onClick={() => setCurrentPage(totalPages)}>
                            {isAr ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

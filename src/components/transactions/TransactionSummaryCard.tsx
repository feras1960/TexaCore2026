/**
 * ═══════════════════════════════════════════════════════════════
 * 💳 TransactionSummaryCard — بطاقة ملخص المعاملة
 * ═══════════════════════════════════════════════════════════════
 * بطاقة جميلة تعرض:
 * - معلومات المعاملة الأساسية
 * - المرحلة الحالية مع شارة ملونة
 * - الملخص المالي (المبلغ، المدفوع، الرصيد)
 * - بيانات المورد/العميل
 * - آخر تحديث
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { TransactionStageBadge } from './TransactionStageBadge';
import type { PurchaseTransaction, SalesTransaction, TransactionType } from '@/types/transactions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Calendar,
    User,
    Building2,
    Warehouse,
    DollarSign,
    CreditCard,
    RotateCcw,
    Printer,
    Bell,
    Hash,
} from 'lucide-react';

type Transaction = PurchaseTransaction | SalesTransaction;

interface TransactionSummaryCardProps {
    type: TransactionType;
    transaction: Transaction;
    onPrint?: () => void;
    className?: string;
}

export const TransactionSummaryCard: React.FC<TransactionSummaryCardProps> = ({
    type,
    transaction: tx,
    className,
}) => {
    const { language, direction } = useLanguage();
    const isAr = language === 'ar';
    const isPurchase = type === 'purchase';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy', { locale: isAr ? ar : undefined });
        } catch {
            return dateStr;
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    // الرقم الرئيسي للمعاملة
    const mainNumber =
        tx.invoice_no || tx.order_no || tx.quotation_no || tx.draft_no || '-';

    // اسم الشريك (مورد أو عميل)
    const partnerName = isPurchase
        ? (tx as PurchaseTransaction).supplier_name
        : (tx as SalesTransaction).customer_name;

    const partnerLabel = isPurchase
        ? (isAr ? 'المورد' : 'Supplier')
        : (isAr ? 'العميل' : 'Customer');

    // نسبة المدفوع
    const paidPercent = tx.total_amount > 0
        ? Math.round((tx.paid_amount / tx.total_amount) * 100)
        : 0;

    return (
        <div
            className={cn(
                'rounded-2xl border border-gray-100 dark:border-gray-800',
                'bg-white dark:bg-gray-900',
                'shadow-sm hover:shadow-md transition-shadow duration-300',
                'overflow-hidden',
                className,
            )}
            dir={direction}
        >
            {/* ═══ Header ═══ */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="font-mono text-lg font-bold text-gray-800 dark:text-gray-200 tracking-tight tabular-nums">
                            {mainNumber}
                        </span>
                        <span className="text-[11px] text-gray-400 mt-0.5">
                            {isPurchase ? (isAr ? 'معاملة شراء' : 'Purchase') : (isAr ? 'معاملة بيع' : 'Sale')}
                            {tx.is_return && (
                                <span className="inline-flex items-center gap-0.5 ms-1.5 text-rose-500">
                                    <RotateCcw className="w-3 h-3" />
                                    {isAr ? 'مرتجع' : 'Return'}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <TransactionStageBadge
                    type={isPurchase ? 'purchase' : 'sale'}
                    stage={tx.stage}
                    size="md"
                />
            </div>

            {/* ═══ Body Grid ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x rtl:divide-x-reverse divide-gray-50 dark:divide-gray-800/50">
                {/* Partner */}
                <InfoCell
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    label={partnerLabel}
                    value={partnerName || (isAr ? 'غير محدد' : 'Not set')}
                    muted={!partnerName}
                />

                {/* Date */}
                <InfoCell
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label={isAr ? 'التاريخ' : 'Date'}
                    value={formatDate(tx.doc_date)}
                    mono
                />

                {/* Warehouse */}
                <InfoCell
                    icon={<Warehouse className="w-3.5 h-3.5" />}
                    label={isAr ? 'المستودع' : 'Warehouse'}
                    value={tx.warehouse_id ? '✓' : (isAr ? 'غير محدد' : 'Not set')}
                    muted={!tx.warehouse_id}
                />

                {/* Version */}
                <InfoCell
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label={isAr ? 'الإصدار' : 'Version'}
                    value={`v${tx.version}`}
                    mono
                />
            </div>

            {/* ═══ Financial Summary ═══ */}
            <div className="px-5 py-4 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/20 border-t border-gray-50 dark:border-gray-800/50">
                <div className="grid grid-cols-3 gap-4">
                    {/* Total */}
                    <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            {isAr ? 'الإجمالي' : 'Total'}
                        </p>
                        <p className="font-mono text-lg font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                            {formatAmount(tx.total_amount)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{tx.currency}</p>
                    </div>

                    {/* Paid */}
                    <div className="text-center border-x border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            {isAr ? 'المدفوع' : 'Paid'}
                        </p>
                        <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatAmount(tx.paid_amount)}
                        </p>
                        <p className="text-[10px] text-emerald-500 font-medium mt-0.5">{paidPercent}%</p>
                    </div>

                    {/* Balance */}
                    <div className="text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            {isAr ? 'الرصيد' : 'Balance'}
                        </p>
                        <p className={cn(
                            'font-mono text-lg font-bold tabular-nums',
                            tx.balance > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-400',
                        )}>
                            {formatAmount(tx.balance)}
                        </p>
                    </div>
                </div>

                {/* ─── Progress Bar ─── */}
                {tx.total_amount > 0 && (
                    <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-700 ease-out',
                                paidPercent >= 100
                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                    : paidPercent >= 50
                                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                        : 'bg-gradient-to-r from-amber-400 to-amber-500',
                            )}
                            style={{ width: `${Math.min(paidPercent, 100)}%` }}
                        />
                    </div>
                )}
            </div>

            {/* ═══ Footer: Meta Info ═══ */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-50 dark:border-gray-800/50 text-[10px] text-gray-400">
                <div className="flex items-center gap-3">
                    {/* Created By */}
                    {tx.created_by_name && (
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {tx.created_by_name}
                        </span>
                    )}

                    {/* Print Count */}
                    {tx.printed_count > 0 && (
                        <span className="flex items-center gap-1">
                            <Printer className="w-3 h-3" />
                            ×{tx.printed_count}
                        </span>
                    )}

                    {/* Reminder Count */}
                    {tx.reminder_count > 0 && (
                        <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            ×{tx.reminder_count}
                        </span>
                    )}
                </div>

                <span className="font-mono tabular-nums">
                    {formatDate(tx.updated_at)}
                </span>
            </div>
        </div>
    );
};


// ═══ Internal Helper Component ═══

interface InfoCellProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
    muted?: boolean;
}

const InfoCell: React.FC<InfoCellProps> = ({ icon, label, value, mono, muted }) => (
    <div className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            {icon}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </div>
        <p className={cn(
            'text-sm font-semibold truncate',
            mono && 'font-mono tabular-nums',
            muted
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-gray-700 dark:text-gray-300',
        )}>
            {value}
        </p>
    </div>
);


export default TransactionSummaryCard;

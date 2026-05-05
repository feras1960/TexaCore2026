/**
 * Receipt Voucher Sheet Configuration
 * إعدادات شيت سند القبض
 */

import {
    DollarSign,
    Calendar,
    User,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    Activity,
    Printer,
    Download,
    Copy,
    Edit,
    Trash2,
    Building2,
    Hash,
    Target,
} from 'lucide-react';
import { type SheetConfig } from './sheet.types';

// Import tab components
import { JournalOverviewTab } from '../tabs/journal/JournalOverviewTab';
import { JournalLinesTab } from '../tabs/journal/JournalLinesTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'posted':
            return { label: 'status.posted', variant: 'success' as const };
        case 'cancelled':
            return { label: 'status.cancelled', variant: 'error' as const };
        default:
            return { label: 'status.draft', variant: 'warning' as const };
    }
};

export const receiptConfig: SheetConfig = {
    docType: 'receipt',

    // Header
    title: (data) => data.voucherNo || `RCV-${data.id}`,
    subtitle: (data) => {
        const customerName = data.customerName || data.party_name || '';
        const date = data.date ? new Date(data.date).toLocaleDateString('ar-u-nu-latn') : '';
        return `${customerName} - ${date}`;
    },
    icon: DollarSign,
    iconBg: 'bg-gradient-to-br from-emerald-600 to-emerald-800',

    // Status Badge
    badge: (data) => {
        const info = getStatusInfo(data?.status);
        return {
            label: info.label,
            variant: info.variant,
        };
    },

    // Balance Display - Total Amount
    balance: {
        value: (data) => {
            const totalDebit = data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
            return totalDebit;
        },
        label: 'vouchers.receiptAmount',
        labelAr: 'مبلغ القبض',
        currency: undefined,
        showSign: false,
    },

    // Stats Cards
    stats: [
        {
            key: 'total_amount',
            label: 'vouchers.totalAmount',
            labelAr: 'المبلغ الإجمالي',
            icon: DollarSign,
            value: (data) => data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0,
            color: 'green',
        },
        {
            key: 'customer',
            label: 'vouchers.customer',
            labelAr: 'العميل',
            icon: User,
            value: (data) => data.customerName || data.party_name || '-',
            color: 'blue',
        },
        {
            key: 'receipt_date',
            label: 'vouchers.receiptDate',
            labelAr: 'تاريخ القبض',
            icon: Calendar,
            value: (data) => {
                if (!data.date) return '-';
                return new Date(data.date).toLocaleDateString('ar-u-nu-latn');
            },
            color: 'purple',
        },
    ],

    // Info Fields for Overview
    infoFields: [
        {
            key: 'voucherNo',
            label: 'fields.voucherNumber',
            labelAr: 'رقم السند',
            type: 'text',
            icon: Hash,
        },
        {
            key: 'date',
            label: 'fields.date',
            labelAr: 'التاريخ',
            type: 'date',
            icon: Calendar,
        },
        {
            key: 'customerName',
            label: 'fields.customer',
            labelAr: 'العميل',
            type: 'link',
            icon: User,
            link: (_value, data) => data.customerId || data.party_id ? { docType: 'customer', id: data.customerId || data.party_id } : null,
        },
        {
            key: 'cashAccount',
            label: 'fields.cashAccount',
            labelAr: 'حساب الصندوق/البنك',
            type: 'link',
            icon: Building2,
            link: (_value, data) => data.cashAccountId ? { docType: 'account', id: data.cashAccountId } : null,
        },
        {
            key: 'reference',
            label: 'fields.reference',
            labelAr: 'المرجع',
            type: 'text',
        },
        {
            key: 'costCenter',
            label: 'fields.costCenter',
            labelAr: 'مركز التكلفة',
            type: 'text',
            icon: Target,
        },
        {
            key: 'project',
            label: 'fields.project',
            labelAr: 'المشروع',
            type: 'text',
        },
        {
            key: 'description',
            label: 'fields.description',
            labelAr: 'البيان',
            type: 'text',
            colSpan: 2,
        },
    ],

    // Tabs Configuration
    tabs: [
        {
            id: 'overview',
            label: 'tabs.overview',
            labelAr: 'نظرة عامة',
            icon: Eye,
            component: JournalOverviewTab,
        },
        {
            id: 'lines',
            label: 'tabs.entryLines',
            labelAr: 'بنود القيد',
            icon: FileText,
            component: JournalLinesTab as any,
            badge: (data) => data.lines?.length || null,
        },
        {
            id: 'activity',
            label: 'tabs.activity',
            labelAr: 'السجل',
            icon: Activity,
            component: ActivityTab,
        },
    ],
    defaultTab: 'lines',

    // Actions
    actions: [
        {
            id: 'edit',
            label: 'actions.edit',
            labelAr: 'تعديل',
            icon: Edit,
            variant: 'outline',
            show: (data) => data?.status === 'draft',
        },
        {
            id: 'post',
            label: 'actions.post',
            labelAr: 'ترحيل',
            icon: CheckCircle2,
            variant: 'default',
            show: (data) => data?.status === 'draft',
        },
        {
            id: 'duplicate',
            label: 'actions.duplicate',
            labelAr: 'نسخ',
            icon: Copy,
            variant: 'outline',
        },
        {
            id: 'print',
            label: 'actions.print',
            labelAr: 'طباعة',
            icon: Printer,
            variant: 'outline',
            onClick: () => window.print(),
        },
        {
            id: 'export',
            label: 'actions.export',
            labelAr: 'تصدير',
            icon: Download,
            variant: 'outline',
        },
        {
            id: 'cancel',
            label: 'actions.cancel',
            labelAr: 'إلغاء',
            icon: XCircle,
            variant: 'destructive',
            show: (data) => data?.status !== 'cancelled',
            confirm: {
                title: 'dialogs.cancelReceipt',
                titleAr: 'إلغاء سند القبض',
                description: 'dialogs.cancelReceiptWarning',
                descriptionAr: 'هل أنت متأكد من إلغاء سند القبض؟ لا يمكن التراجع عن هذا الإجراء.',
                confirmLabel: 'actions.cancel',
                confirmLabelAr: 'إلغاء',
            },
        },
        {
            id: 'delete',
            label: 'actions.delete',
            labelAr: 'حذف',
            icon: Trash2,
            variant: 'destructive',
            show: (data) => data?.status === 'draft',
            confirm: {
                title: 'dialogs.deleteReceipt',
                titleAr: 'حذف سند القبض',
                description: 'dialogs.deleteReceiptWarning',
                descriptionAr: 'هل أنت متأكد من حذف سند القبض؟ لا يمكن التراجع عن هذا الإجراء.',
                confirmLabel: 'actions.delete',
                confirmLabelAr: 'حذف',
            },
        },
    ],

    // Quick Actions (in header)
    quickActions: [
        {
            id: 'print',
            label: 'actions.print',
            labelAr: 'طباعة',
            icon: Printer,
            variant: 'ghost',
            onClick: () => window.print(),
        },
        {
            id: 'duplicate',
            label: 'actions.duplicate',
            labelAr: 'نسخ',
            icon: Copy,
            variant: 'ghost',
        },
    ],

    // Sheet Settings
    width: 'lg',
};

export default receiptConfig;

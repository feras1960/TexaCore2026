/**
 * Purchase Receipt Sheet Configuration
 * إعدادات شيت استلام بضائع
 */

import {
    Truck,
    Calendar,
    User,
    Building2,
    FileText,
    DollarSign,
    Printer,
    Download,
    Edit,
    Trash2,
    Eye,
    Activity,
    CheckCircle,
    Clock,
    AlertTriangle,
    XCircle,
    Package,
    Container,
} from 'lucide-react';
import { type SheetConfig, type DocType } from './sheet.types';

// Import tab components
import { OverviewTab } from '../tabs/shared/OverviewTab';
import { ActivityTab } from '../tabs/shared/ActivityTab';
// Use InvoiceItemsTab or create a generic ItemsTab if available
import { ItemsTab } from '../tabs/shared/ItemsTab'; // Assuming this exists or using InvoiceItemsTab

export const purchaseReceiptConfig: SheetConfig = {
    docType: 'purchase_receipt',

    // Header
    title: (data) => data.receipt_number || data.document_number || `GRN-${data.id?.substring(0, 8)}`,
    subtitle: (data) => data.vendor_name || data.supplier_name || data.party_name,
    icon: Truck,
    iconBg: 'bg-gradient-to-br from-orange-600 to-orange-800',

    // Status Badge
    badge: (data) => {
        const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
            received: { label: 'status.received', variant: 'success' },
            partial: { label: 'status.partial', variant: 'info' },
            draft: { label: 'status.draft', variant: 'warning' },
            cancelled: { label: 'status.cancelled', variant: 'default' },
            returned: { label: 'status.returned', variant: 'error' },
        };
        const status = statusMap[data.status] || statusMap.draft;
        return {
            label: status.label,
            variant: status.variant,
            icon: status.variant === 'success' ? CheckCircle :
                status.variant === 'error' ? AlertTriangle : Clock,
        };
    },

    // Stats Cards
    stats: [
        {
            key: 'type',
            label: 'fields.type',
            icon: Package,
            value: (data) => data.receipt_type === 'shipment' ? 'Shipment' : 'Direct', // TODO: Translate
            color: 'blue',
        },
        {
            key: 'container',
            label: 'fields.containerNumber',
            icon: Container,
            value: (data) => data.receipt_type === 'shipment' ? (data.container_number || data.shipment?.container_number || '-') : '-',
            color: 'orange',
            // Only show if shipment
        },
        {
            key: 'date',
            label: 'fields.date',
            icon: Calendar,
            value: (data) => data.date || data.receipt_date, // Format date
            color: 'purple',
            format: (value) => value ? new Date(value).toLocaleDateString() : '-',
        },
    ],

    // Info Fields
    infoFields: [
        { key: 'receipt_number', label: 'fields.receiptNumber', type: 'text' },
        {
            key: 'receipt_type',
            label: 'fields.type',
            type: 'badge',
            badge: (value) => ({
                label: value === 'shipment' ? 'shipment' : 'direct',
                variant: value === 'shipment' ? 'info' : 'default'
            })
        },
        { key: 'container_number', label: 'fields.containerNumber', type: 'text', icon: Container },
        { key: 'shipment_id', label: 'fields.shipment', type: 'link', link: (_v, d) => d.shipment_id ? { docType: 'shipment', id: d.shipment_id } : null },
        { key: 'date', label: 'fields.date', type: 'date', icon: Calendar },
        {
            key: 'supplier_name',
            label: 'fields.supplier',
            type: 'link',
            icon: Building2,
            link: (_value: any, data: any) => data.supplier_id ? { docType: 'supplier', id: data.supplier_id } : null,
        },
        { key: 'warehouse_id', label: 'fields.warehouse', type: 'text' }, // Should be link later
        { key: 'notes', label: 'fields.notes', type: 'text', colSpan: 2 },
    ],

    // Tabs
    tabs: [
        { id: 'overview', label: 'tabs.overview', icon: Eye, component: OverviewTab },
        {
            id: 'items',
            label: 'tabs.items',
            icon: FileText,
            component: ItemsTab as any, // Verify ItemsTab exists, if not use OverviewTab placeholder
            badge: (data) => data.items?.length || 0,
        },
        { id: 'activity', label: 'tabs.activity', icon: Activity, component: ActivityTab },
    ],
    defaultTab: 'overview',

    // Actions
    actions: [
        {
            id: 'print',
            label: 'actions.print',
            icon: Printer,
            variant: 'outline',
            onClick: () => window.print(),
        },
    ],

    // Sheet Settings
    width: 'lg',
};

export default purchaseReceiptConfig;

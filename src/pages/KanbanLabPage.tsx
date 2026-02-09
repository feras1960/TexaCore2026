import React, { useState, useMemo } from 'react';
import { NexaKanbanBoard, type KanbanColumnDef, type KanbanItem } from '@/components/ui/nexa-kanban';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { toast } from 'sonner';
import {
    FileText,
    ShoppingCart,
    Truck,
    RotateCcw,
    Package,
    ArrowLeft,
    Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DevLabNav } from '@/features/componentLab/DevLabNav';

// ─── Mock Data ─────────────────────────────────────────────────────
const MOCK_CARDS: KanbanItem[] = [
    {
        id: 'q-001',
        columnId: 'quotation',
        content: {
            document_number: 'QT-2026-001',
            customer_name: 'شركة النور للتجارة',
            status: 'draft',
            date: '2026-02-05',
            total_amount: 45000,
            currency: 'SAR',
            priority: 'high',
        },
    },
    {
        id: 'q-002',
        columnId: 'quotation',
        content: {
            document_number: 'QT-2026-002',
            customer_name: 'مؤسسة البناء الحديث',
            status: 'sent',
            date: '2026-02-06',
            total_amount: 12500,
            currency: 'SAR',
            priority: 'medium',
        },
    },
    {
        id: 'r-001',
        columnId: 'reservation',
        content: {
            document_number: 'RS-2026-001',
            customer_name: 'شركة الأمل',
            status: 'confirmed',
            date: '2026-02-04',
            total_amount: 8000,
            currency: 'SAR',
            priority: 'low',
        },
    },
    {
        id: 'o-001',
        columnId: 'order',
        content: {
            document_number: 'SO-2026-001',
            customer_name: 'تحديث أنظمة الشركة',
            status: 'confirmed',
            date: '2026-02-03',
            total_amount: 85000,
            currency: 'SAR',
            priority: 'high',
        },
    },
    {
        id: 'o-002',
        columnId: 'order',
        content: {
            document_number: 'SO-2026-002',
            customer_name: 'مستشفى الأمل',
            status: 'processing',
            date: '2026-02-04',
            total_amount: 32000,
            currency: 'SAR',
            priority: 'medium',
        },
    },
    {
        id: 'd-001',
        columnId: 'delivery',
        content: {
            document_number: 'DN-2026-001',
            customer_name: 'شركة المعادن المتحدة',
            status: 'dispatched',
            date: '2026-02-01',
            total_amount: 15700,
            currency: 'SAR',
            priority: 'low',
        },
    },
    {
        id: 'i-001',
        columnId: 'invoice',
        content: {
            document_number: 'INV-2026-001',
            customer_name: 'مجموعة التقنية المتقدمة',
            status: 'posted',
            date: '2026-01-30',
            total_amount: 120000,
            currency: 'SAR',
            priority: 'high',
        },
    },
    {
        id: 'i-002',
        columnId: 'invoice',
        content: {
            document_number: 'INV-2026-002',
            customer_name: 'توريد أجهزة مكتبية',
            status: 'unpaid',
            date: '2026-02-02',
            total_amount: 45000,
            currency: 'SAR',
            priority: 'medium',
        },
    },
    {
        id: 'ret-001',
        columnId: 'return',
        content: {
            document_number: 'RET-2026-001',
            customer_name: 'عميل مرتجع',
            status: 'approved',
            date: '2026-02-07',
            total_amount: 3500,
            currency: 'SAR',
            priority: 'low',
        },
    },
];

// ─── Component ─────────────────────────────────────────────────────
export default function KanbanLabPage() {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const navigate = useNavigate();

    const [items, setItems] = useState<KanbanItem[]>(MOCK_CARDS);

    const columns: KanbanColumnDef[] = useMemo(() => [
        {
            id: 'quotation',
            title: isRTL ? 'عروض الأسعار' : 'Quotations',
            color: 'border-purple-500',
            bgColor: 'bg-purple-50/40',
            accentHex: '#9333ea',
            icon: <FileText className="w-4 h-4 text-purple-600" />,
        },
        {
            id: 'reservation',
            title: isRTL ? 'الحجوزات' : 'Reservations',
            color: 'border-cyan-500',
            bgColor: 'bg-cyan-50/40',
            accentHex: '#0891b2',
            icon: <Package className="w-4 h-4 text-cyan-600" />,
        },
        {
            id: 'order',
            title: isRTL ? 'أوامر البيع' : 'Orders',
            color: 'border-blue-500',
            bgColor: 'bg-blue-50/40',
            accentHex: '#2563eb',
            icon: <ShoppingCart className="w-4 h-4 text-blue-600" />,
        },
        {
            id: 'delivery',
            title: isRTL ? 'أذونات التسليم' : 'Deliveries',
            color: 'border-orange-500',
            bgColor: 'bg-orange-50/40',
            accentHex: '#ea580c',
            icon: <Truck className="w-4 h-4 text-orange-600" />,
        },
        {
            id: 'invoice',
            title: isRTL ? 'الفواتير' : 'Invoices',
            color: 'border-indigo-500',
            bgColor: 'bg-indigo-50/40',
            accentHex: '#4f46e5',
            icon: <FileText className="w-4 h-4 text-indigo-600" />,
        },
        {
            id: 'return',
            title: isRTL ? 'المرتجعات' : 'Returns',
            color: 'border-rose-500',
            bgColor: 'bg-rose-50/40',
            accentHex: '#e11d48',
            icon: <RotateCcw className="w-4 h-4 text-rose-600" />,
        },
    ], [isRTL]);

    const handleCardMove = (itemId: string, fromColumn: string, toColumn: string) => {
        // Actually move the item in state
        setItems(prev =>
            prev.map(item =>
                item.id === itemId ? { ...item, columnId: toColumn } : item
            )
        );
        const fromTitle = columns.find(c => c.id === fromColumn)?.title;
        const toTitle = columns.find(c => c.id === toColumn)?.title;
        toast.success(
            isRTL
                ? `✅ تم نقل المستند من "${fromTitle}" إلى "${toTitle}"`
                : `✅ Document moved from "${fromTitle}" to "${toTitle}"`
        );
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-50 text-red-700 border-red-200';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'low': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="h-full flex flex-col" dir={direction}>
            {/* Header */}
            <div className="shrink-0 p-4 pb-2 bg-white border-b space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-erp-navy flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            NexaKanbanBoard
                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                Production Ready
                            </Badge>
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {isRTL
                                ? 'مكون Kanban احترافي وقابل لإعادة الاستخدام مع السحب والإفلات'
                                : 'Professional, reusable Kanban board component with drag & drop'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 px-2.5">
                            @dnd-kit/core
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-2.5">
                            {items.length} {isRTL ? 'بطاقة' : 'cards'}
                        </Badge>
                    </div>
                </div>
                {/* ─── Lab Sub-Navigation ─── */}
                <DevLabNav currentLabId="kanban-lab" />
            </div>

            {/* Board */}
            <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 p-4">
                <NexaKanbanBoard
                    columns={columns}
                    items={items}
                    direction={direction}
                    currency="SAR"
                    emptyText={isRTL ? 'لا توجد عناصر' : 'No items yet'}
                    getItemValue={(content) => Number(content.total_amount || 0)}
                    onCardMove={handleCardMove}
                    renderCard={(doc, _columnId) => (
                        <div className="p-3.5 space-y-2.5 cursor-pointer">
                            {/* Header: Doc # + Priority */}
                            <div className="flex justify-between items-start">
                                <span className="font-mono text-xs font-bold text-gray-700 tracking-tight">
                                    {doc.document_number}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] h-5 px-1.5 border capitalize ${getPriorityColor(doc.priority)}`}
                                >
                                    {doc.priority === 'high' ? (isRTL ? 'عالي' : 'High') :
                                        doc.priority === 'medium' ? (isRTL ? 'متوسط' : 'Medium') :
                                            (isRTL ? 'منخفض' : 'Low')}
                                </Badge>
                            </div>

                            {/* Customer */}
                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                {doc.customer_name}
                            </p>

                            {/* Status */}
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${['approved', 'confirmed', 'posted', 'delivered'].includes(doc.status) ? 'bg-green-500' :
                                    ['dispatched', 'processing', 'sent'].includes(doc.status) ? 'bg-blue-500' :
                                        'bg-gray-400'
                                    }`} />
                                <span className="text-[11px] text-gray-500 capitalize">{doc.status}</span>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-1.5 border-t border-gray-100/80">
                                <span className="text-[11px] text-gray-400 font-mono">
                                    {new Date(doc.date).toLocaleDateString()}
                                </span>
                                <span className="font-mono text-sm font-bold text-erp-navy">
                                    {Number(doc.total_amount).toLocaleString()}{' '}
                                    <span className="text-[10px] text-gray-400">{doc.currency}</span>
                                </span>
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
}

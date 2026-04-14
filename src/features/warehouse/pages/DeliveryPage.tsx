/**
 * ════════════════════════════════════════════════════════════════
 * 🚚 Delivery Page - Real Data Version
 * صفحة التسليم - بيانات حقيقية
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ إدارة سندات التسليم
 * - Delivery notes management
 * - Status tracking (draft → approved → shipped → delivered)
 * - Customer delivery information
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService, DeliveryNote } from '@/services/warehouseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Truck,
    Plus,
    Search,
    RefreshCw,
    Filter,
    MoreHorizontal,
    Package,
    MapPin,
    Phone,
    Calendar,
    CheckCircle,
    Clock,
    Send,
    Eye,
    Printer,
    Download
} from 'lucide-react';
import { matchesSearch } from '@/lib/utils/normalizeSearch';

export default function DeliveryPage() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // State
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Load delivery notes
    const loadDeliveryNotes = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await warehouseService.getDeliveryNotes(companyId, {
                status: statusFilter || undefined,
            });
            setDeliveryNotes(data);
        } catch (err: any) {
            console.error('Error loading delivery notes:', err);
            setError(t('common.loadFailed') || 'Failed to load delivery notes');
        } finally {
            setLoading(false);
        }
    }, [companyId, statusFilter, t]);

    useEffect(() => {
        loadDeliveryNotes();
    }, [loadDeliveryNotes]);

    // Status helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-50 text-gray-600 border-gray-200';
            case 'pending_approval': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'approved': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'preparing': return 'bg-purple-50 text-purple-600 border-purple-200';
            case 'shipped': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
            case 'delivered': return 'bg-green-50 text-green-600 border-green-200';
            case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        if (language === 'ar') {
            switch (status) {
                case 'draft': return 'مسودة';
                case 'pending_approval': return 'بانتظار الموافقة';
                case 'approved': return 'تمت الموافقة';
                case 'preparing': return 'قيد التجهيز';
                case 'shipped': return 'تم الشحن';
                case 'delivered': return 'تم التسليم';
                case 'cancelled': return 'ملغى';
                default: return status;
            }
        }
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // Filter delivery notes (smart multi-language)
    const filteredNotes = deliveryNotes.filter(note => {
        if (!searchQuery) return true;
        return matchesSearch(
            searchQuery,
            note.note_number,
            note.customer_name || '',
            note.delivery_address || '',
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.delivery') || (language === 'ar' ? 'إدارة التسليم' : 'Delivery Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'إنشاء ومتابعة سندات التسليم' : 'Create and track delivery notes'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={loadDeliveryNotes}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
                        <Plus className="w-5 h-5" />
                        {language === 'ar' ? 'سند تسليم جديد' : 'New Delivery Note'}
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث برقم السند أو اسم العميل...' : 'Search by note number or customer name...'}
                        className="ps-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="w-4 h-4" />
                            {statusFilter ? getStatusLabel(statusFilter) : (language === 'ar' ? 'الكل' : 'All')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                            {language === 'ar' ? 'الكل' : 'All'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                            {language === 'ar' ? 'مسودة' : 'Draft'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('pending_approval')}>
                            {language === 'ar' ? 'بانتظار الموافقة' : 'Pending Approval'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('shipped')}>
                            {language === 'ar' ? 'تم الشحن' : 'Shipped'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('delivered')}>
                            {language === 'ar' ? 'تم التسليم' : 'Delivered'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={loadDeliveryNotes}>
                        {t('common.retry') || (language === 'ar' ? 'إعادة المحاولة' : 'Retry')}
                    </Button>
                </div>
            )}

            {/* Delivery Notes List */}
            <div className="space-y-3">
                {loading ? (
                    // Loading skeletons
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-gray-100 dark:border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-12 h-12 rounded" />
                                        <div>
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : filteredNotes.length === 0 ? (
                    // Empty state
                    <Card className="border-dashed border-2 border-gray-200 dark:border-slate-700">
                        <CardContent className="py-16 text-center">
                            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-cairo font-bold text-gray-600 dark:text-gray-300 mb-2">
                                {language === 'ar' ? 'لا توجد سندات تسليم' : 'No Delivery Notes'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {language === 'ar'
                                    ? 'لم يتم إنشاء أي سندات تسليم بعد.'
                                    : 'No delivery notes have been created yet.'}
                            </p>
                            <Button className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? 'إنشاء سند' : 'Create Note'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    // Delivery notes list
                    filteredNotes.map((note) => (
                        <Card
                            key={note.id}
                            className="border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    {/* Left Side */}
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="w-12 h-12 rounded-lg bg-erp-teal/10 flex items-center justify-center">
                                            <Truck className="w-6 h-6 text-erp-teal" />
                                        </div>

                                        {/* Main Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-mono font-bold text-erp-navy dark:text-white">
                                                    {note.note_number}
                                                </h3>
                                                <Badge variant="outline" className={getStatusColor(note.status)}>
                                                    {getStatusLabel(note.status)}
                                                </Badge>
                                            </div>

                                            {/* Customer Info */}
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                {note.customer_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {note.customer_name}
                                                    </span>
                                                )}
                                                {note.customer_phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {note.customer_phone}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Delivery Address */}
                                            {note.delivery_address && (
                                                <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                    <MapPin className="w-3 h-3" />
                                                    {note.delivery_address} {note.city && `، ${note.city}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex items-center gap-3">
                                        {/* Date */}
                                        <div className="text-end">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(note.note_date).toLocaleDateString()}
                                            </p>
                                            {note.total_amount > 0 && (
                                                <p className="font-mono font-bold text-erp-teal">
                                                    ${note.total_amount.toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="gap-2">
                                                    <Eye className="w-4 h-4" />
                                                    {language === 'ar' ? 'عرض' : 'View'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <Printer className="w-4 h-4" />
                                                    {language === 'ar' ? 'طباعة' : 'Print'}
                                                </DropdownMenuItem>
                                                {note.status === 'draft' && (
                                                    <DropdownMenuItem className="gap-2">
                                                        <Send className="w-4 h-4" />
                                                        {language === 'ar' ? 'إرسال للموافقة' : 'Send for Approval'}
                                                    </DropdownMenuItem>
                                                )}
                                                {note.status === 'shipped' && (
                                                    <DropdownMenuItem className="gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {language === 'ar' ? 'تأكيد التسليم' : 'Confirm Delivery'}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Summary */}
            {!loading && filteredNotes.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                    {language === 'ar'
                        ? `عرض ${filteredNotes.length} سند تسليم`
                        : `Showing ${filteredNotes.length} delivery notes`}
                </div>
            )}
        </div>
    );
}

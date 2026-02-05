/**
 * ════════════════════════════════════════════════════════════════
 * 📅 Reservations Page - Real Data Version
 * صفحة الحجوزات - بيانات حقيقية
 * ════════════════════════════════════════════════════════════════
 * 
 * ⚡ إدارة حجوزات الرولونات
 * - Active, Expired, Fulfilled reservations
 * - Customer information
 * - Expiry tracking
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
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
    Calendar,
    Plus,
    Search,
    RefreshCw,
    Filter,
    MoreHorizontal,
    User,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

// Types for reservations
interface Reservation {
    id: string;
    reservation_number?: string;
    roll_id: string;
    customer_id: string;
    status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
    reserved_at: string;
    expires_at: string;
    fulfilled_at?: string;
    notes?: string;
    roll?: {
        id: string;
        roll_number: string;
        material?: {
            name_ar: string;
            name_en?: string;
        };
    };
    customer?: {
        id: string;
        name: string;
        phone?: string;
    };
}

export default function ReservationsPage() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useAuth();

    // State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Load reservations
    const loadReservations = useCallback(async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await warehouseService.getReservations(companyId, {
                status: statusFilter as any || undefined,
            });
            setReservations(data);
        } catch (err: any) {
            console.error('Error loading reservations:', err);
            setError(t('common.loadFailed') || 'Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }, [companyId, statusFilter, t]);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    // Status helpers
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Clock className="w-4 h-4" />;
            case 'fulfilled': return <CheckCircle className="w-4 h-4" />;
            case 'expired': return <AlertCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-50 text-green-600 border-green-200';
            case 'fulfilled': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'expired': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        if (language === 'ar') {
            switch (status) {
                case 'active': return 'نشط';
                case 'fulfilled': return 'مكتمل';
                case 'expired': return 'منتهي';
                case 'cancelled': return 'ملغى';
                default: return status;
            }
        }
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // Filter reservations
    const filteredReservations = reservations.filter(res => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            res.reservation_number?.toLowerCase().includes(search) ||
            res.roll?.roll_number.toLowerCase().includes(search) ||
            res.customer?.name.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
                        {t('warehouse.tabs.reservations') || (language === 'ar' ? 'إدارة الحجوزات' : 'Reservations Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ar' ? 'تتبع حجوزات الرولونات للعملاء' : 'Track roll reservations for customers'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={loadReservations}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
                        <Plus className="w-5 h-5" />
                        {language === 'ar' ? 'حجز جديد' : 'New Reservation'}
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث بالاسم أو رقم الحجز...' : 'Search by name or reservation number...'}
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
                        <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                            {language === 'ar' ? 'نشط' : 'Active'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('fulfilled')}>
                            {language === 'ar' ? 'مكتمل' : 'Fulfilled'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('expired')}>
                            {language === 'ar' ? 'منتهي' : 'Expired'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                            {language === 'ar' ? 'ملغى' : 'Cancelled'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={loadReservations}>
                        {t('common.retry') || (language === 'ar' ? 'إعادة المحاولة' : 'Retry')}
                    </Button>
                </div>
            )}

            {/* Reservations List */}
            <div className="space-y-3">
                {loading ? (
                    // Loading skeletons
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="border-gray-100 dark:border-slate-800">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div>
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : filteredReservations.length === 0 ? (
                    // Empty state
                    <Card className="border-dashed border-2 border-gray-200 dark:border-slate-700">
                        <CardContent className="py-16 text-center">
                            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <h3 className="text-lg font-cairo font-bold text-gray-600 dark:text-gray-300 mb-2">
                                {language === 'ar' ? 'لا توجد حجوزات' : 'No Reservations'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {language === 'ar'
                                    ? 'لم يتم إنشاء أي حجوزات بعد.'
                                    : 'No reservations have been created yet.'}
                            </p>
                            <Button className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
                                <Plus className="w-4 h-4" />
                                {language === 'ar' ? 'إنشاء حجز' : 'Create Reservation'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    // Reservations list
                    filteredReservations.map((reservation) => (
                        <Card
                            key={reservation.id}
                            className="border-gray-100 dark:border-slate-800 hover:border-erp-teal/50 transition-all"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* Customer Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-erp-teal/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-erp-teal" />
                                        </div>

                                        {/* Main Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {reservation.customer?.name || (language === 'ar' ? 'عميل غير معروف' : 'Unknown Customer')}
                                                </h3>
                                                {reservation.reservation_number && (
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        #{reservation.reservation_number}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                <span>{reservation.roll?.roll_number}</span>
                                                {reservation.roll?.material && (
                                                    <span>
                                                        • {language === 'ar'
                                                            ? reservation.roll.material.name_ar
                                                            : (reservation.roll.material.name_en || reservation.roll.material.name_ar)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex items-center gap-3">
                                        {/* Expiry Date */}
                                        <div className="text-end">
                                            <p className="text-xs text-muted-foreground">
                                                {language === 'ar' ? 'ينتهي في' : 'Expires'}
                                            </p>
                                            <p className="text-sm font-mono">
                                                {new Date(reservation.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Status Badge */}
                                        <Badge variant="outline" className={`gap-1 ${getStatusColor(reservation.status)}`}>
                                            {getStatusIcon(reservation.status)}
                                            {getStatusLabel(reservation.status)}
                                        </Badge>

                                        {/* Actions */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="gap-2">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {language === 'ar' ? 'تأكيد التسليم' : 'Confirm Delivery'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    {language === 'ar' ? 'تمديد' : 'Extend'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="gap-2 text-red-600">
                                                    <XCircle className="w-4 h-4" />
                                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                                </DropdownMenuItem>
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
            {!loading && filteredReservations.length > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                    {language === 'ar'
                        ? `عرض ${filteredReservations.length} حجز`
                        : `Showing ${filteredReservations.length} reservations`}
                </div>
            )}
        </div>
    );
}

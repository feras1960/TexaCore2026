/**
 * ════════════════════════════════════════════════════════════════
 * 💳 Platform Payments Tab
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    CreditCard, Search, DollarSign, CheckCircle2, Clock, XCircle,
    Loader2, Receipt, Calendar, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface PaymentsTabProps {
    platformId: string;
    platformCode: string;
}

const PAYMENT_STATUS: Record<string, { labelAr: string; labelEn: string; icon: any; color: string }> = {
    completed: { labelAr: 'مكتمل', labelEn: 'Completed', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    pending: { labelAr: 'معلّق', labelEn: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-50' },
    failed: { labelAr: 'فشل', labelEn: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-50' },
    refunded: { labelAr: 'مسترد', labelEn: 'Refunded', icon: ArrowUpRight, color: 'text-blue-600 bg-blue-50' },
};

const METHOD_LABELS: Record<string, { ar: string; en: string }> = {
    bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer' },
    cash: { ar: 'نقداً', en: 'Cash' },
    credit_card: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
    paypal: { ar: 'PayPal', en: 'PayPal' },
    stripe: { ar: 'Stripe', en: 'Stripe' },
};

export default function PlatformPaymentsTab({ platformId, platformCode }: PaymentsTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('saas_payments')
                .select('*, tenants(name, email)')
                .order('created_at', { ascending: false });

            if (error) console.error('Load payments error:', error);
            // Filter by platform if product_id is set
            const filtered = (data || []).filter(p => !platformId || p.product_id === platformId || !p.product_id);
            setPayments(filtered);
        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    }, [platformId]);

    useEffect(() => { load(); }, [load]);

    const filteredPayments = payments.filter(p =>
        !search || p.payment_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.tenants?.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const totalRevenue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const completedCount = payments.filter(p => p.status === 'completed').length;
    const thisMonth = payments.filter(p => {
        const d = new Date(p.collection_date || p.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === 'completed';
    }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { icon: DollarSign, labelAr: 'إجمالي الإيرادات', labelEn: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'text-emerald-600' },
                    { icon: TrendingUp, labelAr: 'هذا الشهر', labelEn: 'This Month', value: `$${thisMonth.toLocaleString()}`, color: 'text-blue-600' },
                    { icon: CheckCircle2, labelAr: 'مدفوعات مكتملة', labelEn: 'Completed', value: completedCount, color: 'text-indigo-600' },
                    { icon: Clock, labelAr: 'معلّقة', labelEn: 'Pending', value: `$${pendingAmount.toLocaleString()}`, color: 'text-amber-600' },
                ].map((s, i) => (
                    <Card key={i} className="border-gray-200">
                        <CardContent className="p-3 flex items-center gap-3">
                            <s.icon className={cn("w-5 h-5", s.color)} />
                            <div>
                                <div className="text-lg font-bold">{s.value}</div>
                                <div className="text-[10px] text-gray-500">{isAr ? s.labelAr : s.labelEn}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isAr ? 'بحث برقم الدفعة...' : 'Search by payment number...'}
                    className="ps-9 h-9 text-sm"
                />
            </div>

            {/* Payments List */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        {isAr ? 'سجل المدفوعات' : 'Payment History'}
                        <Badge variant="secondary" className="text-[10px]">{filteredPayments.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredPayments.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            {isAr ? 'لا توجد مدفوعات بعد' : 'No payments yet'}
                        </div>
                    )}

                    <div className="space-y-2">
                        {filteredPayments.map(payment => {
                            const statusInfo = PAYMENT_STATUS[payment.status] || PAYMENT_STATUS.pending;
                            const StatusIcon = statusInfo.icon;
                            const method = METHOD_LABELS[payment.payment_method] || { ar: payment.payment_method, en: payment.payment_method };

                            return (
                                <div key={payment.id} className="border rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                                    {/* Status Icon */}
                                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", statusInfo.color)}>
                                        <StatusIcon className="w-4 h-4" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold truncate" dir="ltr">{payment.payment_number}</span>
                                            <Badge className={cn("text-[9px] px-1.5 h-4", statusInfo.color)}>
                                                {isAr ? statusInfo.labelAr : statusInfo.labelEn}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                                            {payment.tenants?.name && <span>{payment.tenants.name}</span>}
                                            <span>{isAr ? method.ar : method.en}</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(payment.collection_date || payment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-end shrink-0">
                                        <div className={cn("text-sm font-bold", payment.status === 'completed' ? 'text-emerald-600' : 'text-gray-600')}>
                                            ${Number(payment.amount).toLocaleString()}
                                        </div>
                                        <div className="text-[9px] text-gray-400">{payment.currency}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

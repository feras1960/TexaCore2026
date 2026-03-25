
import React, { useEffect, useState } from 'react';
import { subscriptionService, SubscriptionStatusInfo } from '@/services/subscriptionService';
import { Loader2, CreditCard, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';

interface CompanySubscriptionProps {
    tenantId?: string;
}

export const CompanySubscription: React.FC<CompanySubscriptionProps> = ({ tenantId }) => {
    const [info, setInfo] = useState<SubscriptionStatusInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!tenantId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const data = await subscriptionService.getSubscriptionStatus(tenantId);
                setInfo(data);
            } catch (error) {
                console.error('Failed to load subscription info', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!info || !info.subscription) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-yellow-500" />
                <p className="font-medium">{t('saas.noSubscription', 'No active subscription found')}</p>
                <p className="text-xs mt-2">Tenant ID: {tenantId || 'Unknown'}</p>
            </div>
        );
    }

    const { plan, status, subscription } = info;

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-600" />
                            {plan?.name_en || plan?.name_ar || 'Unknown Plan'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {info.daysRemaining} {t('saas.daysRemaining', 'days remaining')}
                        </p>
                    </div>
                    <Badge className={`
            ${status === 'active' ? 'bg-green-500' : 'bg-yellow-500'} 
            text-white hover:bg-opacity-90`
                    }>
                        {t(`status.${status}`, status)}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-indigo-100 dark:border-indigo-900/30">
                        <span className="text-xs text-muted-foreground block mb-1">{t('common.startDate', 'Start Date')}</span>
                        <div className="flex items-center gap-2 font-mono text-sm">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            {subscription.current_period_start ? format(new Date(subscription.current_period_start), 'yyyy-MM-dd') : '-'}
                        </div>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded border border-indigo-100 dark:border-indigo-900/30">
                        <span className="text-xs text-muted-foreground block mb-1">{t('common.endDate', 'End Date')}</span>
                        <div className="flex items-center gap-2 font-mono text-sm">
                            <Calendar className="w-3 h-3 text-indigo-400" />
                            {subscription.current_period_end ? format(new Date(subscription.current_period_end), 'yyyy-MM-dd') : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Limits Info (if plan details exist) */}
            {plan && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 border rounded-lg text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Max Users</span>
                        <span className="font-bold">{plan.max_users}</span>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Max Companies</span>
                        <span className="font-bold">{plan.max_companies}</span>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Storage</span>
                        <span className="font-bold">{plan.storage_gb} GB</span>
                    </div>
                </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
                Subscription ID: <span className="font-mono">{subscription.id}</span>
            </div>
        </div>
    );
};

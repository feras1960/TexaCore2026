import React from 'react';
import {
    Building2,
    Calendar,
    CreditCard,
    DollarSign,
    Globe,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Users,
    CheckCircle2,
    XCircle,
    FileText,
    Clock,
    Trash2,
    Ban
} from 'lucide-react';
import { SheetConfig } from './sheet.types';
import { companiesService } from '@/services/companiesService';
import { toast } from 'sonner';
import { CompanyUsersList } from '@/features/saas/components/CompanyUsersList';
import { CompanySubscription } from '@/features/saas/components/CompanySubscription';

export const companyConfig: SheetConfig = {
    id: 'company-config',
    docType: 'company',
    title: (data) => data.name || '-',
    subtitle: (data) => data.name_en || data.code || '-',
    icon: Building2,
    iconBg: 'bg-indigo-500/20 text-indigo-500', // Unique color for companies

    badge: (data) => {
        // Use company status, fallback to tenant status if missing
        const status = data?.status || data.tenant?.status || 'active';
        return {
            label: `status.${status}`,
            variant: status === 'active' ? 'success' : status === 'suspended' ? 'warning' : 'destructive',
            icon: status === 'active' ? CheckCircle2 : Ban
        };
    },

    actions: [
        {
            id: 'suspend',
            label: 'common.suspend',
            icon: Ban,
            variant: 'warning',
            requiresAuth: true,
            show: (data) => (data?.status === 'active' || !data?.status),
            confirm: {
                title: 'dialogs.suspendTitle',
                description: 'dialogs.suspendDescription',
                variant: 'destructive'
            },
            onClick: async (data) => {
                await companiesService.suspend(data.id);
                toast.success('Company suspended successfully');
            }
        },
        {
            id: 'activate',
            label: 'common.activate',
            icon: CheckCircle2,
            variant: 'default',
            requiresAuth: true,
            show: (data) => data?.status === 'suspended',
            onClick: async (data) => {
                await companiesService.activate(data.id);
                toast.success('Company activated successfully');
            }
        },
        {
            id: 'delete',
            label: 'common.delete',
            icon: Trash2,
            variant: 'destructive',
            requiresAuth: true,
            closeOnSuccess: true,
            show: (data) => true,
            confirm: {
                title: 'dialogs.deleteTitle',
                description: 'dialogs.deleteDescription',
                variant: 'destructive'
            },
            onClick: async (data) => {
                await companiesService.delete(data.id);
                toast.success('Company deleted successfully');
            }
        }
    ],

    infoFields: [],

    tabs: [
        {
            id: 'overview',
            label: 'common.overview',
            icon: FileText,
            component: ({ data, t }) => (
                <div className="space-y-6" >
                    {/* Basic Info */}
                    < div className="grid grid-cols-2 gap-4" >
                        <div className="p-4 bg-muted/20 rounded-lg">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1"> {t('common.tenant')} </h3>
                            < div className="flex items-center gap-2" >
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {data.tenant?.name?.charAt(0) || '?'}
                                </div>
                                < div >
                                    <p className="font-medium text-sm"> {data.tenant?.name || '-'} </p>
                                    < p className="text-xs text-muted-foreground" > {data.tenant?.code || '-'} </p>
                                </div>
                            </div>
                        </div>
                        < div className="p-4 bg-muted/20 rounded-lg" >
                            <h3 className="text-sm font-medium text-muted-foreground mb-1"> {t('common.email')} </h3>
                            < div className="flex items-center gap-2" >
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                < span className="font-medium truncate" title={data.email} > {data.email || '-'} </span>
                            </div>
                        </div>
                    </div>

                    < div className="grid grid-cols-2 gap-4" >
                        <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Phone className="w-4 h-4" />
                                < span className="text-sm" > {t('common.phone')} </span>
                            </div>
                            < p className="font-medium" > {data.phone || '-'} </p>
                        </div>
                        < div className="p-4 border rounded-lg" >
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <MapPin className="w-4 h-4" />
                                < span className="text-sm" > {t('common.address')} </span>
                            </div>
                            < p className="font-medium truncate" > {data.address || '-'} </p>
                        </div>
                    </div>

                    {/* Legal Info */}
                    < div className="space-y-3" >
                        <h3 className="font-medium flex items-center gap-2" >
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            {t('common.legalInfo')}
                        </h3>
                        < div className="grid grid-cols-2 gap-4" >
                            <div className="p-3 bg-muted/10 rounded border" >
                                <span className="text-xs text-muted-foreground block" > {t('common.taxNumber')} </span>
                                < span className="font-mono" > {data.tax_number || '-'} </span>
                            </div>
                            < div className="p-3 bg-muted/10 rounded border" >
                                <span className="text-xs text-muted-foreground block" > {t('common.crNumber')} </span>
                                < span className="font-mono" > {data.commercial_register || '-'} </span>
                            </div>
                        </div>
                    </div>

                    {/* Settings Info */}
                    < div className="space-y-3" >
                        <h3 className="font-medium flex items-center gap-2" >
                            <Globe className="w-4 h-4 text-primary" />
                            {t('common.settings')}
                        </h3>
                        < div className="grid grid-cols-3 gap-3" >
                            <div className="p-3 bg-muted/10 rounded border text-center" >
                                <span className="text-xs text-muted-foreground block mb-1" > {t('common.currency')} </span>
                                < Badge variant="outline" > {data.default_currency || '-'} </Badge>
                            </div>
                            < div className="p-3 bg-muted/10 rounded border text-center" >
                                <span className="text-xs text-muted-foreground block mb-1" > {t('common.language')} </span>
                                < Badge variant="outline" > {data.tenant?.default_language || 'ar'} </Badge>
                            </div>
                            < div className="p-3 bg-muted/10 rounded border text-center" >
                                <span className="text-xs text-muted-foreground block mb-1" > {t('accounting.chartType')} </span>
                                < Badge variant="secondary" > {data.chart_type || 'simple'} </Badge>
                            </div>
                        </div>
                    </div>

                </div>
            )
        },
        {
            id: 'users',
            label: 'common.users',
            icon: Users,
            component: ({ data, t }) => (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" >
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p>{t('common.usersListNotImplemented')} </p>
                    < div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 rounded text-sm max-w-xs text-center" >
                        Fetching users for specific company requires additional RLS bypass or API endpoint.
                    </div>
                </div>
            )
        },
        {
            id: 'subscription',
            label: 'common.subscription',
            icon: CreditCard,
            component: ({ data, t }) => (
                <div className="space-y-6" >
                    <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20" >
                        <div className="flex items-start justify-between mb-4" >
                            <div>
                                <h3 className="font-bold text-lg" > {data.tenant?.name} Subscription </h3>
                                < p className="text-sm text-muted-foreground" > Managed at Tenant Level </p>
                            </div>
                            < Badge className="bg-indigo-500 text-white hover:bg-indigo-600" >
                                {data.tenant?.status || 'Active'}
                            </Badge>
                        </div>

                        {/* Subscription details would go here if we fetched them */}
                        <div className="text-sm text-muted-foreground" >
                            Subscription details are linked to Tenant ID: <span className="font-mono text-xs" > {data.tenant?.id} </span>
                        </div>
                    </div>
                </div>
            )
        }
    ]
};

// Helper components for config
import { Badge } from '@/components/ui/badge';

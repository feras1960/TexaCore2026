/**
 * ════════════════════════════════════════════════════════════════
 * 🧵 Samples Page (إدارة العينات)
 * ════════════════════════════════════════════════════════════════
 * 
 * Constitution-Compliant Implementation:
 * - Uses t('key') pattern from LanguageProvider
 * - Connects to warehouseService for real data
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Scissors,
    Share2,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    Package,
    User,
    Calendar,
    MapPin,
    Beaker
} from 'lucide-react';

// Status colors
const statusColors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'cutting': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'ready': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'distributed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// Priority colors
const priorityColors: Record<string, string> = {
    'low': 'bg-gray-100 text-gray-800',
    'normal': 'bg-blue-100 text-blue-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800',
};

export default function SamplesPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('all');
    const [samples, setSamples] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load samples from database
    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [companyId]);

    const loadData = async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);
        try {
            const statusFilter = activeSubTab !== 'all' ? activeSubTab : undefined;
            const data = await warehouseService.getSampleRequests(companyId, {
                status: statusFilter
            });
            setSamples(data);
        } catch (err) {
            console.error('Error loading samples:', err);
            setError(t('errors.network.loadFailed') || 'فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // Reload when tab changes
    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [activeSubTab]);

    // Format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
        } catch {
            return dateStr;
        }
    };

    // Get status label
    const getStatusLabel = (status: string) => {
        const key = `warehouse.samples.statuses.${status}`;
        const translated = t(key);
        return translated !== key ? translated : status;
    };

    // Get priority label
    const getPriorityLabel = (priority: string) => {
        const key = `warehouse.samples.priorities.${priority}`;
        const translated = t(key);
        return translated !== key ? translated : priority;
    };

    // Filter samples by tab
    const filteredSamples = samples.filter(s => {
        if (activeSubTab === 'all') return true;
        return s.status === activeSubTab;
    });

    // Stats
    const stats = {
        pending: samples.filter(s => s.status === 'pending').length,
        ready: samples.filter(s => s.status === 'ready').length,
        distributed: samples.filter(s => s.status === 'distributed').length,
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header with action button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{t('warehouse.samples.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('warehouse.samples.description')}</p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 me-2" />
                    {t('warehouse.samples.createRequest')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.samples.pending')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.samples.ready')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.ready}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('warehouse.samples.distributed')}</p>
                                <p className="text-2xl font-bold font-mono">{stats.distributed}</p>
                            </div>
                            <Share2 className="h-8 w-8 text-blue-500 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all">{t('warehouse.samples.allRequests')}</TabsTrigger>
                        <TabsTrigger value="pending">{t('warehouse.samples.pending')}</TabsTrigger>
                        <TabsTrigger value="ready">{t('warehouse.samples.ready')}</TabsTrigger>
                        <TabsTrigger value="distributed">{t('warehouse.samples.distributed')}</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Error Alert */}
                {error && (
                    <Card className="border-destructive mt-4">
                        <CardContent className="flex items-center gap-2 p-4 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </CardContent>
                    </Card>
                )}

                <TabsContent value={activeSubTab} className="mt-4">
                    {loading ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                {t('common.loading')}
                            </CardContent>
                        </Card>
                    ) : filteredSamples.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Beaker className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">
                                    {t('warehouse.samples.noRequests')}
                                </p>
                                <Button variant="outline" className="mt-4">
                                    <Plus className="h-4 w-4 me-2" />
                                    {t('warehouse.samples.createRequest')}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredSamples.map(sample => (
                                <Card key={sample.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-semibold font-mono">{sample.request_number}</h4>
                                                    <Badge className={statusColors[sample.status]}>
                                                        {getStatusLabel(sample.status)}
                                                    </Badge>
                                                    {sample.priority && sample.priority !== 'normal' && (
                                                        <Badge className={priorityColors[sample.priority]}>
                                                            {getPriorityLabel(sample.priority)}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Material info */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {language === 'ar'
                                                            ? (sample.material_name_ar || sample.material_name_en || '—')
                                                            : (sample.material_name_en || sample.material_name_ar || '—')
                                                        }
                                                    </span>
                                                    {sample.roll_number && (
                                                        <span className="text-muted-foreground">
                                                            ({sample.roll_number})
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details row */}
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(sample.request_date)}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-mono">
                                                        {t('warehouse.samples.requestedLength')}: {sample.requested_length || 0} م
                                                    </span>
                                                    {sample.requested_by && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-4 w-4" />
                                                            {sample.requested_by}
                                                        </span>
                                                    )}
                                                    {sample.customer_name && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4" />
                                                            {sample.customer_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Purpose */}
                                                {sample.purpose && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('warehouse.samples.purpose')}: {sample.purpose}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex gap-2 ms-4">
                                                {(sample.status === 'pending' || sample.status === 'approved') && (
                                                    <Button size="sm">
                                                        <Scissors className="h-4 w-4 me-1" />
                                                        {t('warehouse.samples.cut')}
                                                    </Button>
                                                )}
                                                {sample.status === 'ready' && (
                                                    <Button size="sm" variant="outline">
                                                        <Share2 className="h-4 w-4 me-1" />
                                                        {t('warehouse.samples.distribute')}
                                                    </Button>
                                                )}
                                                {sample.status === 'distributed' && (
                                                    <Button size="sm" variant="ghost">
                                                        {t('common.view')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

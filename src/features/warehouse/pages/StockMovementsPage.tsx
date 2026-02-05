/**
 * ════════════════════════════════════════════════════════════════
 * 📊 Stock Movements Page (حركات المخزون)
 * ════════════════════════════════════════════════════════════════
 * 
 * Constitution-Compliant Implementation:
 * - Uses t('key') pattern from LanguageProvider
 * - Connects to warehouseService for real data
 * - Covers: fabrics, rolls, containers, transfers, delivery notes, invoices
 * 
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { warehouseService } from '@/services/warehouseService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ArrowLeftRight,
    Search,
    RefreshCw,
    Package,
    Truck,
    ClipboardList,
    Calendar,
    MapPin,
    Boxes,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';

// Movement type colors
const movementTypeColors: Record<string, string> = {
    'receipt': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'purchase': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'transfer_in': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'sale': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'issue': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'transfer_out': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'transfer': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'adjustment': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'container': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    'delivery': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function StockMovementsPage() {
    const { t, language, isRTL } = useLanguage();
    const { companyId } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState('movements');
    const [movements, setMovements] = useState<any[]>([]);
    const [pendingReceipts, setPendingReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        warehouse: 'all',
        movementType: 'all',
        dateFrom: '',
        dateTo: ''
    });

    // Load data from database
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
            // Load inventory movements from warehouseService
            const movementsData = await warehouseService.getInventoryMovements(companyId, {
                warehouseId: filters.warehouse !== 'all' ? filters.warehouse : undefined,
                movementType: filters.movementType !== 'all' ? filters.movementType : undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                limit: 100
            });
            setMovements(movementsData);

            // Load pending receipts
            const receiptsData = await warehouseService.getPendingReceipts(companyId);
            setPendingReceipts(receiptsData);
        } catch (err) {
            console.error('Error loading movements:', err);
            setError(t('errors.network.loadFailed') || 'فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // Filter movements locally
    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const material = m.material_name_ar || m.material_name_en || '';
                const reference = m.reference_number || '';
                if (!material.toLowerCase().includes(query) && !reference.toLowerCase().includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }, [movements, searchQuery]);

    // Get movement type label from translations
    const getMovementTypeLabel = (type: string) => {
        const key = `warehouse.stockMovements.types.${type}`;
        const translated = t(key);
        return translated !== key ? translated : type;
    };

    // Movement type icon
    const getMovementTypeIcon = (type: string) => {
        if (type.includes('receipt') || type.includes('purchase') || type === 'adjustment_in') {
            return <ArrowDownToLine className="h-4 w-4" />;
        }
        if (type.includes('sale') || type.includes('issue') || type === 'adjustment_out') {
            return <ArrowUpFromLine className="h-4 w-4" />;
        }
        return <ArrowLeftRight className="h-4 w-4" />;
    };

    // Receipt type icon
    const getReceiptTypeIcon = (type: string) => {
        switch (type) {
            case 'container': return <Package className="h-5 w-5 text-blue-500" />;
            case 'transfer': return <ArrowLeftRight className="h-5 w-5 text-green-500" />;
            case 'purchase': return <Truck className="h-5 w-5 text-orange-500" />;
            default: return <ClipboardList className="h-5 w-5" />;
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Sub-tabs */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="movements" className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        {t('warehouse.stockMovements.allMovements')}
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="flex items-center gap-2 relative">
                        <ClipboardList className="h-4 w-4" />
                        {t('warehouse.stockMovements.pendingReceipts')}
                        {pendingReceipts.length > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 text-xs absolute -top-1 -right-1">
                                {pendingReceipts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Movements Tab */}
                <TabsContent value="movements" className="mt-6 space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                {/* Search */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-sm font-medium mb-1.5 block">
                                        {t('common.search')}
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('warehouse.searchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pr-10"
                                        />
                                    </div>
                                </div>

                                {/* Movement Type Filter */}
                                <div className="w-[180px]">
                                    <label className="text-sm font-medium mb-1.5 block">
                                        {t('warehouse.stockMovements.type')}
                                    </label>
                                    <Select
                                        value={filters.movementType}
                                        onValueChange={(v) => setFilters(f => ({ ...f, movementType: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('common.all')}</SelectItem>
                                            <SelectItem value="receipt">{t('warehouse.stockMovements.types.receipt')}</SelectItem>
                                            <SelectItem value="sale">{t('warehouse.stockMovements.types.sale')}</SelectItem>
                                            <SelectItem value="transfer_in">{t('warehouse.stockMovements.types.transfer_in')}</SelectItem>
                                            <SelectItem value="transfer_out">{t('warehouse.stockMovements.types.transfer_out')}</SelectItem>
                                            <SelectItem value="container">{t('warehouse.stockMovements.types.container')}</SelectItem>
                                            <SelectItem value="delivery">{t('warehouse.stockMovements.types.delivery')}</SelectItem>
                                            <SelectItem value="adjustment">{t('warehouse.stockMovements.types.adjustment')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Refresh */}
                                <Button variant="outline" onClick={loadData} disabled={loading}>
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Alert */}
                    {error && (
                        <Card className="border-destructive">
                            <CardContent className="flex items-center gap-2 p-4 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                {error}
                            </CardContent>
                        </Card>
                    )}

                    {/* Movements Table */}
                    <Card>
                        <CardContent className="p-0 overflow-auto">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    {t('common.loading')}
                                </div>
                            ) : filteredMovements.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    {t('warehouse.stockMovements.noMovements')}
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.date')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.type')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.material')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.quantity')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.fromWarehouse')} ← {t('warehouse.stockMovements.toWarehouse')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.reference')}</th>
                                            <th className="p-3 text-start font-medium">{t('warehouse.stockMovements.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMovements.map(m => (
                                            <tr key={m.id} className="border-b hover:bg-muted/50">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2 font-mono">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        {formatDate(m.movement_date)}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge className={`${movementTypeColors[m.movement_type] || 'bg-gray-100'} flex items-center gap-1 w-fit`}>
                                                        {getMovementTypeIcon(m.movement_type)}
                                                        {getMovementTypeLabel(m.movement_type)}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-medium">
                                                    {language === 'ar' ? (m.material_name_ar || m.material_name_en || '—') : (m.material_name_en || m.material_name_ar || '—')}
                                                    {m.roll_number && (
                                                        <div className="text-xs text-muted-foreground">{m.roll_number}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono font-medium">{m.quantity || 0} {m.unit || 'م'}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        <span>{m.from_warehouse_name || '—'}</span>
                                                        <span className="text-muted-foreground mx-1">←</span>
                                                        <span>{m.to_warehouse_name || m.warehouse_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-primary hover:underline cursor-pointer">
                                                        {m.reference_number || m.id?.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                                                        {t(`warehouse.stockMovements.statuses.${m.status}`) || m.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pending Receipts Tab */}
                <TabsContent value="pending" className="mt-6 space-y-4">
                    <div className="grid gap-4">
                        {loading ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                    {t('common.loading')}
                                </CardContent>
                            </Card>
                        ) : pendingReceipts.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                    <p className="text-lg font-medium">
                                        {t('warehouse.stockMovements.pendingReceipts')} - {t('common.noData')}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            pendingReceipts.map(receipt => (
                                <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {getReceiptTypeIcon(receipt.type)}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold">{receipt.reference}</h4>
                                                        <Badge variant={receipt.status === 'ready' ? 'default' : 'secondary'}>
                                                            {t(`warehouse.stockMovements.statuses.${receipt.status}`) || receipt.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{receipt.description}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Boxes className="h-3 w-3" />
                                                            {receipt.items} {receipt.itemsUnit}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDate(receipt.arrivalDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button>
                                                <ArrowDownToLine className="h-4 w-4 me-2" />
                                                {t('warehouse.stockMovements.confirmReceipt')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/**
 * ════════════════════════════════════════════════════════════════
 * 💰 Material Pricing Tab
 * تبويب الأسعار للمادة - شامل للإنشاء والعرض
 * ════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DollarSign,
    TrendingUp,
    Package,
    Tag,
    Percent,
    ShoppingCart,
    Store,
    Globe
} from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialPricingTabProps {
    data: any;
    mode?: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialPricingTab({ data, mode = 'view', onChange }: MaterialPricingTabProps) {
    const { language } = useLanguage();
    const { currencyCode: companyCurrency, currencySymbol } = useCompanyCurrency(language as 'ar' | 'en');
    const isReadOnly = mode === 'view';

    const handleChange = (field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    };

    // Currency options
    const currencyOptions = [
        { value: 'USD', symbol: '$', labelAr: 'دولار أمريكي', labelEn: 'US Dollar' },
        { value: 'EUR', symbol: '€', labelAr: 'يورو', labelEn: 'Euro' },
        { value: 'SAR', symbol: 'ر.س', labelAr: 'ريال سعودي', labelEn: 'Saudi Riyal' },
        { value: 'AED', symbol: 'د.إ', labelAr: 'درهم إماراتي', labelEn: 'UAE Dirham' },
        { value: 'TRY', symbol: '₺', labelAr: 'ليرة تركية', labelEn: 'Turkish Lira' },
        { value: 'UAH', symbol: '₴', labelAr: 'هريفنيا أوكرانية', labelEn: 'Ukrainian Hryvnia' },
        { value: 'EGP', symbol: 'ج.م', labelAr: 'جنيه مصري', labelEn: 'Egyptian Pound' },
    ];

    // Calculate profit margin
    const purchasePrice = data?.purchase_price || 0;
    const sellingPrice = data?.selling_price || 0;
    const profitMargin = purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6 pb-6">
            {/* Currency Selection */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'العملة' : 'Currency'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="currency" className="text-sm font-medium">
                            {language === 'ar' ? 'عملة التسعير' : 'Pricing Currency'}
                        </Label>
                        <Select
                            value={data?.currency || companyCurrency || ''}
                            onValueChange={(value) => handleChange('currency', value)}
                            disabled={isReadOnly}
                        >
                            <SelectTrigger className="w-full md:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencyOptions.map((curr) => (
                                    <SelectItem key={curr.value} value={curr.value}>
                                        <span className="flex items-center gap-2">
                                            <span className="font-mono text-gray-500">{curr.symbol}</span>
                                            {language === 'ar' ? curr.labelAr : curr.labelEn}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Purchase Price */}
            <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-orange-600" />
                        {language === 'ar' ? 'سعر الشراء' : 'Purchase Price'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="purchase_price" className="text-sm font-medium">
                                {language === 'ar' ? 'سعر الشراء للوحدة' : 'Purchase Price per Unit'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="purchase_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.purchase_price || ''}
                                    onChange={(e) => handleChange('purchase_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost_per_meter" className="text-sm font-medium">
                                {language === 'ar' ? 'تكلفة الإنتاج' : 'Production Cost'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="cost_per_meter"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.cost_per_meter || ''}
                                    onChange={(e) => handleChange('cost_per_meter', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Selling Prices */}
            <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="w-5 h-5 text-green-600" />
                        {language === 'ar' ? 'أسعار البيع' : 'Selling Prices'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Retail Price */}
                        <div className="space-y-2">
                            <Label htmlFor="selling_price" className="text-sm font-medium flex items-center gap-2">
                                <Store className="w-4 h-4 text-gray-400" />
                                {language === 'ar' ? 'سعر التجزئة' : 'Retail Price'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="selling_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.selling_price || ''}
                                    onChange={(e) => handleChange('selling_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                        </div>

                        {/* Wholesale Price */}
                        <div className="space-y-2">
                            <Label htmlFor="wholesale_price" className="text-sm font-medium flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                {language === 'ar' ? 'سعر الجملة' : 'Wholesale Price'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="wholesale_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.wholesale_price || ''}
                                    onChange={(e) => handleChange('wholesale_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                        </div>

                        {/* Online Price */}
                        <div className="space-y-2">
                            <Label htmlFor="online_price" className="text-sm font-medium flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-gray-400" />
                                {language === 'ar' ? 'سعر الأونلاين' : 'Online Price'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="online_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.online_price || ''}
                                    onChange={(e) => handleChange('online_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profit Margin Indicator */}
                    {(purchasePrice > 0 || sellingPrice > 0) && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {language === 'ar' ? 'هامش الربح' : 'Profit Margin'}
                                    </span>
                                </div>
                                <Badge
                                    variant={Number(profitMargin) >= 20 ? 'default' : Number(profitMargin) >= 10 ? 'secondary' : 'destructive'}
                                    className="text-lg px-3 py-1"
                                >
                                    {profitMargin}%
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {language === 'ar'
                                    ? `(سعر البيع - سعر الشراء) / سعر الشراء × 100`
                                    : `(Selling Price - Purchase Price) / Purchase Price × 100`}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Discount Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Percent className="w-5 h-5 text-red-600" />
                        {language === 'ar' ? 'إعدادات الخصم' : 'Discount Settings'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="max_discount_percent" className="text-sm font-medium">
                                {language === 'ar' ? 'أقصى نسبة خصم مسموحة' : 'Maximum Allowed Discount'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="max_discount_percent"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="100"
                                    value={data?.max_discount_percent || ''}
                                    onChange={(e) => handleChange('max_discount_percent', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    disabled={isReadOnly}
                                    className="pe-8"
                                />
                                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    %
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="min_price" className="text-sm font-medium">
                                {language === 'ar' ? 'أقل سعر للبيع' : 'Minimum Selling Price'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="min_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data?.min_price || ''}
                                    onChange={(e) => handleChange('min_price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                    className="ps-8"
                                />
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    {currencyOptions.find(c => c.value === (data?.currency || companyCurrency || ''))?.symbol || currencySymbol || ''}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                {language === 'ar'
                                    ? 'لن يُسمح بالبيع بسعر أقل من هذا'
                                    : 'Sale below this price will not be allowed'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function MaterialSalesTab({ data }: { data: any }) {
    const { language } = useLanguage();

    // Sample sales data
    const salesStats = {
        totalOrders: 28,
        totalQuantity: 1250,
        totalRevenue: 31250,
        avgOrderValue: 1116,
    };

    const recentSales = [
        { id: 'INV-2024-045', date: '2024/02/05', customer: language === 'ar' ? 'شركة النسيج المتحدة' : 'United Textile Co.', quantity: 150, unitPrice: 25, total: 3750, status: 'delivered' },
        { id: 'INV-2024-038', date: '2024/02/01', customer: language === 'ar' ? 'مصنع الأزياء الحديثة' : 'Modern Fashion Factory', quantity: 200, unitPrice: 22, total: 4400, status: 'delivered' },
        { id: 'INV-2024-031', date: '2024/01/28', customer: language === 'ar' ? 'دار الخياطة الفاخرة' : 'Luxury Tailoring', quantity: 80, unitPrice: 25, total: 2000, status: 'delivered' },
        { id: 'INV-2024-025', date: '2024/01/20', customer: language === 'ar' ? 'متجر الأقمشة الذهبية' : 'Golden Fabrics Store', quantity: 300, unitPrice: 22, total: 6600, status: 'pending' },
        { id: 'INV-2024-019', date: '2024/01/15', customer: language === 'ar' ? 'شركة التصدير الدولية' : 'International Export Co.', quantity: 500, unitPrice: 20, total: 10000, status: 'delivered' },
    ];

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        delivered: { label: language === 'ar' ? 'تم التسليم' : 'Delivered', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        pending: { label: language === 'ar' ? 'قيد التسليم' : 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
        cancelled: { label: language === 'ar' ? 'ملغي' : 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Sales Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}</p>
                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{salesStats.totalOrders}</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">{language === 'ar' ? 'الكمية المباعة' : 'Qty Sold'}</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{salesStats.totalQuantity.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
                        <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">${salesStats.totalRevenue.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-teal-200 bg-teal-50/50 dark:bg-teal-900/20 dark:border-teal-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">{language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</p>
                        <p className="text-2xl font-bold text-teal-800 dark:text-teal-200">${salesStats.avgOrderValue.toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Sales Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShoppingCart className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'آخر فواتير المبيعات' : 'Recent Sales Invoices'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map((sale, idx) => (
                                    <tr key={sale.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-3 text-gray-500">{idx + 1}</td>
                                        <td className="py-3 px-3 font-mono font-semibold text-erp-navy dark:text-white">{sale.id}</td>
                                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{sale.date}</td>
                                        <td className="py-3 px-3 text-gray-800 dark:text-gray-200">{sale.customer}</td>
                                        <td className="py-3 px-3 font-medium text-blue-600">{sale.quantity}</td>
                                        <td className="py-3 px-3 font-semibold text-green-700 dark:text-green-400">${sale.total.toLocaleString()}</td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[sale.status]?.bg} ${statusConfig[sale.status]?.color}`}>
                                                {statusConfig[sale.status]?.label}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                <ShoppingCart className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    {language === 'ar'
                        ? 'يتم عرض فواتير المبيعات التي تحتوي على هذه المادة. الأسعار المعروضة هي أسعار البيع الفعلية من الفواتير.'
                        : 'Showing sales invoices containing this material. Prices shown are actual selling prices from invoices.'}
                </p>
            </div>
        </div>
    );
}

export function MaterialPurchasesTab({ data }: { data: any }) {
    const { language } = useLanguage();

    // Sample purchase data
    const purchaseStats = {
        totalOrders: 12,
        totalQuantity: 2400,
        totalCost: 37200,
        avgUnitCost: 15.5,
    };

    const recentPurchases = [
        { id: 'PO-2024-018', date: '2024/02/03', supplier: language === 'ar' ? 'مصنع الأقمشة التركية' : 'Turkish Fabric Mill', quantity: 500, unitPrice: 15.5, total: 7750, status: 'received' },
        { id: 'PO-2024-014', date: '2024/01/25', supplier: language === 'ar' ? 'شركة القطن المصرية' : 'Egyptian Cotton Co.', quantity: 300, unitPrice: 14.8, total: 4440, status: 'received' },
        { id: 'PO-2024-010', date: '2024/01/18', supplier: language === 'ar' ? 'مصانع النسيج الهندية' : 'Indian Textile Mills', quantity: 800, unitPrice: 15.2, total: 12160, status: 'received' },
        { id: 'PO-2024-007', date: '2024/01/10', supplier: language === 'ar' ? 'شركة الخيوط الصينية' : 'Chinese Thread Co.', quantity: 400, unitPrice: 16, total: 6400, status: 'in_transit' },
        { id: 'PO-2024-003', date: '2024/01/05', supplier: language === 'ar' ? 'مصنع الأقمشة التركية' : 'Turkish Fabric Mill', quantity: 400, unitPrice: 16.1, total: 6440, status: 'received' },
    ];

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        received: { label: language === 'ar' ? 'تم الاستلام' : 'Received', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        in_transit: { label: language === 'ar' ? 'قيد الشحن' : 'In Transit', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        ordered: { label: language === 'ar' ? 'تم الطلب' : 'Ordered', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Purchase Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}</p>
                        <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">{purchaseStats.totalOrders}</p>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/20 dark:border-orange-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">{language === 'ar' ? 'الكمية المشتراة' : 'Qty Purchased'}</p>
                        <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{purchaseStats.totalQuantity.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-red-600 dark:text-red-400 mb-1">{language === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}</p>
                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">${purchaseStats.totalCost.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className="border-cyan-200 bg-cyan-50/50 dark:bg-cyan-900/20 dark:border-cyan-800">
                    <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-cyan-600 dark:text-cyan-400 mb-1">{language === 'ar' ? 'متوسط سعر الوحدة' : 'Avg Unit Cost'}</p>
                        <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">${purchaseStats.avgUnitCost}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Purchases Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5 text-erp-teal" />
                        {language === 'ar' ? 'آخر أوامر الشراء' : 'Recent Purchase Orders'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'رقم الأمر' : 'PO #'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'المورّد' : 'Supplier'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                    <th className="text-start py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPurchases.map((purchase, idx) => (
                                    <tr key={purchase.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-3 text-gray-500">{idx + 1}</td>
                                        <td className="py-3 px-3 font-mono font-semibold text-erp-navy dark:text-white">{purchase.id}</td>
                                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{purchase.date}</td>
                                        <td className="py-3 px-3 text-gray-800 dark:text-gray-200">{purchase.supplier}</td>
                                        <td className="py-3 px-3 font-medium text-blue-600">{purchase.quantity}</td>
                                        <td className="py-3 px-3 font-semibold text-red-600 dark:text-red-400">${purchase.total.toLocaleString()}</td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[purchase.status]?.bg} ${statusConfig[purchase.status]?.color}`}>
                                                {statusConfig[purchase.status]?.label}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Note */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-start gap-3">
                <Package className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    {language === 'ar'
                        ? 'يتم عرض أوامر الشراء التي تحتوي على هذه المادة. المبالغ المعروضة تشمل تكاليف الشراء الفعلية.'
                        : 'Showing purchase orders containing this material. Amounts shown include actual purchase costs.'}
                </p>
            </div>
        </div>
    );
}


export function MaterialAnalyticsTab({ data }: { data: any }) {
    const { language } = useLanguage();

    return (
        <div className="space-y-6 p-6">
            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold mb-3">
                        <span>AI</span>
                        <span>{language === 'ar' ? 'الذكاء الاصطناعي' : 'Artificial Intelligence'}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {language === 'ar' ? 'تحليلات الذكاء الاصطناعي' : 'AI Analytics'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        {language === 'ar'
                            ? 'سيتم تطبيق تحليلات الذكاء الاصطناعي للتنبؤ بالطلب وتحليل الاتجاهات قريباً'
                            : 'AI-powered demand forecasting and trend analysis will be implemented soon'}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

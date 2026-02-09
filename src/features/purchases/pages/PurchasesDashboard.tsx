import {
    LayoutDashboard,
    ShoppingCart,
    Truck,
    CheckCircle,
    TrendingUp,
    Users
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PurchasesDashboard() {
    const { t, direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const kpiCards = [
        {
            title: isRTL ? 'إجمالي المشتريات (الشهر)' : 'Total Purchases (Month)',
            value: 'SAR 125,000',
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            title: isRTL ? 'أوامر معلقة' : 'Pending Orders',
            value: '5 Orders',
            icon: ShoppingCart,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: isRTL ? 'شحنات قادمة' : 'Incoming Shipments',
            value: '2 Containers',
            icon: Truck,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            title: isRTL ? 'الموردين النشطين' : 'Active Suppliers',
            value: '12',
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        }
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold font-cairo text-erp-navy">
                {isRTL ? 'نظرة عامة على المشتريات' : 'Purchases Overview'}
            </h3>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map((card, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium font-tajawal">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold font-cairo ${card.color}`}>{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-tajawal">
                                {isRTL ? '+20.1% عن الشهر الماضي' : '+20.1% from last month'}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity - Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                <h4 className="font-bold mb-4 font-cairo text-gray-700 dark:text-gray-300">
                    {isRTL ? 'آخر النشاطات' : 'Recent Activity'}
                </h4>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 text-sm border-b pb-3 last:border-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="flex-1 font-tajawal text-gray-600">
                                {isRTL ? `تم إنشاء أمر شراء جديد لشركة المورد ${i}` : `Created new purchase order for Supplier ${i}`}
                            </span>
                            <span className="text-gray-400 text-xs">2h ago</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

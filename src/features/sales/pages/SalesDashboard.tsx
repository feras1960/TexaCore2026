
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export default function SalesDashboard() {
    const { t } = useLanguage();
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                        {t('sales.dashboard')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('sales.dashboardSubtitle')}
                    </p>
                </div>
            </div>

            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    Dashboard Content Coming Soon
                </CardContent>
            </Card>
        </div>
    );
}

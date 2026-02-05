/**
 * Warehouse Stocktakes Tab - تبويب الجرد المخزني
 */
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus } from 'lucide-react';

export function WarehouseStocktakesTab() {
    const { t } = useLanguage();

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                    {t('warehouse.stocktakesHistory') || 'سجل عمليات الجرد'}
                </h3>
                <Button size="sm">
                    <Plus className="w-4 h-4 me-2" />
                    {t('warehouse.newStocktake') || 'جرد جديد'}
                </Button>
            </div>

            <Card className="flex-1 overflow-hidden border flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-900/50 border-dashed">
                <div className="w-16 h-16 rounded-full bg-erp-teal/10 flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-erp-teal" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t('warehouse.noStocktakes') || 'لم يتم إجراء جرد بعد'}
                </h4>
                <p className="text-sm text-gray-500 max-w-xs">
                    {t('warehouse.stocktakesDesc') || 'يمكنك البدء بعملية جرد جديدة لمطابقة الأرصدة الفعلية مع النظام'}
                </p>
            </Card>
        </div>
    );
}

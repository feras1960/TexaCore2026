/**
 * Warehouse Items Tab - تبويب مواد المستودع
 */
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Package } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function WarehouseItemsTab() {
    const { t } = useLanguage();

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={t('common.search') || 'بحث...'}
                        className="ps-9"
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                </Button>
            </div>

            {/* List */}
            <Card className="flex-1 overflow-hidden border">
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <Package className="w-12 h-12 mb-3 opacity-20" />
                    <p>{t('warehouse.noItems') || 'لا توجد مواد مخزنة حالياً'}</p>
                    <p className="text-xs mt-1 opacity-70">
                        {t('warehouse.itemsPlaceholder') || 'سيتم عرض قائمة المواد والأرصدة هنا'}
                    </p>
                </div>

                {/* 
                // Table Structure for future implementation
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        ...
                    </TableBody>
                </Table>
                */}
            </Card>
        </div>
    );
}

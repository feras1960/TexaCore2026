import React, { useState } from 'react';
import { TradeItemsTable } from '@/features/trade/components/grids/TradeItemsTable';
import { TradeItem } from '@/features/trade/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/providers/LanguageProvider';

export default function TradeDemoPage() {
    const { isRTL, t } = useLanguage();
    const [items, setItems] = useState<TradeItem[]>([]);
    const [readOnly, setReadOnly] = useState(false);

    return (
        <div className="p-8 space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Trade Items Table Demo</h1>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setReadOnly(!readOnly)}
                    >
                        {readOnly ? 'Switch to Edit Mode' : 'Switch to Read-Only'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{isRTL ? 'جدول المواد (نمط الفاتورة)' : 'Invoice Items Table'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <TradeItemsTable
                        items={items}
                        onItemsChange={setItems}
                        onEditItem={(idx) => console.log('Edit item', idx)}
                        onAddItem={(type) => console.log('Add item', type)}
                        mode="sales"
                        readOnly={readOnly}
                    />

                    <div className="mt-8 p-4 bg-slate-100 rounded-lg font-mono text-xs">
                        <h3 className="font-bold mb-2">Current State (Parent Component):</h3>
                        <pre>{JSON.stringify(items, null, 2)}</pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

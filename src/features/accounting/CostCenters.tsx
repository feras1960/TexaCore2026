import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CostCentersList from './CostCentersList';
import ExchangeRates from './ExchangeRates';

interface CostCentersProps {
  embedded?: boolean;
}

export default function CostCenters({ embedded = false }: CostCentersProps) {
  const { t, direction } = useLanguage();

  // Embedded version - just the list
  if (embedded) {
    return (
      <div className="space-y-4">
        <CostCentersList />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-erp-navy font-cairo mb-2">{t('costCenters')}</h1>
        <p className="text-gray-500 font-tajawal">{t('costCenterDesc')}</p>
      </div>

      <Tabs defaultValue="exchange-rates" dir={direction} className="w-full">
        <TabsList className="w-full justify-start bg-transparent p-0 border-b rounded-none h-auto">
          <TabsTrigger 
            value="exchange-rates"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-erp-navy data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 font-cairo"
          >
            {t('exchangeRates') || 'Exchange Rates'}
          </TabsTrigger>
          <TabsTrigger 
            value="cost-centers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-erp-navy data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 font-cairo"
          >
            {t('costCenter') || 'Cost Centers'}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="exchange-rates" className="mt-6">
          <ExchangeRates />
        </TabsContent>
        
        <TabsContent value="cost-centers" className="mt-6">
          <CostCentersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/app/providers/LanguageProvider';

export function QuickAddButton() {
  const { t, direction } = useLanguage();

  return (
    <div className={`fixed bottom-8 z-50 ${direction === 'rtl' ? 'left-8' : 'right-8'}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full bg-erp-teal hover:bg-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={direction === 'rtl' ? 'end' : 'start'} 
          className="w-56 mb-2 font-tajawal"
        >
          <DropdownMenuLabel>{t('header.quickAdd')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <span>{t('quickActions.newSalesInvoice')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <span>{t('quickActions.receiptVoucher')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <span>{t('quickActions.newProduct')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <span>{t('quickActions.journalEntry')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

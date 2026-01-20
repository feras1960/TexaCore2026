import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  ArrowRightLeft, 
  RefreshCw, 
  Plus,
  FileText
} from 'lucide-react';
import NewJournalEntrySheet from './NewJournalEntrySheet';

type TabType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

interface QuickActionsBarProps {
  className?: string;
}

export default function QuickActionsBar({ className = '' }: QuickActionsBarProps) {
  const { t } = useLanguage();
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<TabType>('journal');

  const handleOpenEntry = (tab: TabType) => {
    setDefaultTab(tab);
    setIsNewEntryOpen(true);
  };

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2.5 gap-1" 
          onClick={() => handleOpenEntry('receipt')}
        >
          <ArrowDownRight className="w-3 h-3 text-green-600" />
          {t('accounting.receipts')}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2.5 gap-1" 
          onClick={() => handleOpenEntry('payment')}
        >
          <ArrowUpRight className="w-3 h-3 text-orange-600" />
          {t('payments') || 'مدفوعات'}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2.5 gap-1" 
          onClick={() => handleOpenEntry('cash')}
        >
          <Wallet className="w-3 h-3 text-purple-600" />
          {t('accounting.cashJournal')}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2.5 gap-1" 
          onClick={() => handleOpenEntry('transfer')}
        >
          <ArrowRightLeft className="w-3 h-3 text-cyan-600" />
          {t('accounting.transfer')}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-2.5 gap-1" 
          onClick={() => handleOpenEntry('exchange')}
        >
          <RefreshCw className="w-3 h-3 text-amber-600" />
          {t('accounting.exchange')}
        </Button>
        <Button 
          size="sm" 
          className="h-8 px-2.5 gap-1 bg-erp-teal hover:bg-erp-teal/90 text-white" 
          onClick={() => handleOpenEntry('journal')}
        >
          <Plus className="w-3 h-3" />
          {t('accounting.journalEntry')}
        </Button>
      </div>

      <NewJournalEntrySheet 
        open={isNewEntryOpen} 
        onOpenChange={setIsNewEntryOpen} 
        defaultTab={defaultTab}
      />
    </>
  );
}

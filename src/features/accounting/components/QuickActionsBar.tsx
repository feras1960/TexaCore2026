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
  FileText,
  FileMinus,
  FilePlus
} from 'lucide-react';
import { UnifiedAccountingSheet } from './unified/UnifiedAccountingSheet';
import { UnifiedDocType } from './unified/types';

interface QuickActionsBarProps {
  className?: string;
}

export default function QuickActionsBar({ className = '' }: QuickActionsBarProps) {
  const { t } = useLanguage();
  const [activeDocType, setActiveDocType] = useState<UnifiedDocType | null>(null);

  const handleOpen = (type: UnifiedDocType) => {
    setActiveDocType(type);
  };

  const handleClose = () => {
    setActiveDocType(null);
  };

  return (
    <>
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {/* Receipt Voucher */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('receipt')}
        >
          <ArrowDownRight className="w-3 h-3 text-green-600" />
          {t('accounting.receipts')}
        </Button>

        {/* Payment Voucher */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('payment')}
        >
          <ArrowUpRight className="w-3 h-3 text-red-600" />
          {t('accounting.paymentsLabel')}
        </Button>

        {/* Cash Journal */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('cash')}
        >
          <Wallet className="w-3 h-3 text-purple-600" />
          {t('accounting.cashJournal')}
        </Button>

        {/* Debit Note */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('debit_note')}
        >
          <FilePlus className="w-3 h-3 text-blue-600" />
          {t('accounting.debitNote.title') || 'Debit Note'}
        </Button>

        {/* Credit Note */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('credit_note')}
        >
          <FileMinus className="w-3 h-3 text-indigo-600" />
          {t('accounting.creditNote.title') || 'Credit Note'}
        </Button>

        {/* Transfer */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('transfer')}
        >
          <ArrowRightLeft className="w-3 h-3 text-cyan-600" />
          {t('accounting.transfer')}
        </Button>

        {/* Exchange */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1"
          onClick={() => handleOpen('exchange')}
        >
          <RefreshCw className="w-3 h-3 text-amber-600" />
          {t('accounting.exchange')}
        </Button>

        {/* Journal Entry (Primary Action) */}
        <Button
          size="sm"
          className="h-8 px-2.5 gap-1 bg-erp-teal hover:bg-erp-teal/90 text-white"
          onClick={() => handleOpen('journal')}
        >
          <Plus className="w-3 h-3" />
          {t('accounting.journalEntry')}
        </Button>
      </div>

      {/* Unified Sheet */}
      {activeDocType && (
        <UnifiedAccountingSheet
          isOpen={true}
          onClose={handleClose}
          docType={activeDocType}
          mode="create"
        />
      )}
    </>
  );
}

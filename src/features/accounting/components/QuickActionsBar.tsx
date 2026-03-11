import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Plus,
} from 'lucide-react';
import { UnifiedAccountingSheet } from './unified/UnifiedAccountingSheet';
import { UnifiedDocType } from './unified/types';

interface QuickActionsBarProps {
  className?: string;
}

export default function QuickActionsBar({ className = '' }: QuickActionsBarProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const [activeDocType, setActiveDocType] = useState<UnifiedDocType | null>(null);

  const handleClose = () => {
    setActiveDocType(null);
  };

  return (
    <>
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {/* Receipt Voucher — سندات القبض */}
        <Button
          variant="outline"
          className="h-9 px-3 gap-1.5 text-xs font-tajawal"
          onClick={() => setActiveDocType('receipt')}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-green-600" />
          {isRTL ? 'سندات القبض' : 'Receipts'}
        </Button>

        {/* Payment Voucher — المدفوعات */}
        <Button
          variant="outline"
          className="h-9 px-3 gap-1.5 text-xs font-tajawal"
          onClick={() => setActiveDocType('payment')}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
          {isRTL ? 'المدفوعات' : 'Payments'}
        </Button>

        {/* Cash Journal — يومية صندوق */}
        <Button
          variant="outline"
          className="h-9 px-3 gap-1.5 text-xs font-tajawal"
          onClick={() => setActiveDocType('cash')}
        >
          <Wallet className="w-3.5 h-3.5 text-purple-600" />
          {isRTL ? 'يومية صندوق' : 'Cash Journal'}
        </Button>

        {/* Journal Entry — قيد يومية */}
        <Button
          className="h-9 px-3 gap-1.5 text-xs font-tajawal bg-erp-teal hover:bg-erp-teal/90 text-white"
          onClick={() => setActiveDocType('journal')}
        >
          <Plus className="w-3.5 h-3.5" />
          {isRTL ? 'قيد يومية' : 'Journal Entry'}
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

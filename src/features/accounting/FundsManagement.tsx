import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { AddFundDialog } from './components/AddFundDialog';
import QuickReceiptDialog from './components/QuickReceiptDialog';
import QuickPaymentDialog from './components/QuickPaymentDialog';
import FundTransferDialog from './components/FundTransferDialog';
import { UniversalDetailSheet } from '@/components/sheets';
import CurrencyExchangeDialog from './components/CurrencyExchangeDialog';
import QuickActionsBar from './components/QuickActionsBar';

// For backward compatibility with existing dialogs
interface SimpleFundData {
  id: number;
  name: string;
  type: 'cash' | 'bank';
  balance: number;
  currency: string;
  accountNumber: string;
  totalDeposits: number;
  totalWithdrawals: number;
  todayChange: number;
  lastActivity: string;
  transactionCount: number;
}

interface FundData {
  id: number;
  name: string;
  type: 'cash' | 'bank';
  defaultCurrency: string;
  accountNumber: string;
  balances: Array<{
    currency: string;
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    todayChange: number;
  }>;
  lastActivity: string;
  transactionCount: number;
}

export default function FundsManagement() {
  const { t, direction } = useLanguage();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isExchangeDialogOpen, setIsExchangeDialogOpen] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [selectedFundForSheet, setSelectedFundForSheet] = useState<SimpleFundData | null>(null);
  const [selectedFundForExchange, setSelectedFundForExchange] = useState<FundData | null>(null);

  // Empty funds array - will be rebuilt
  const funds: FundData[] = [];
  const simpleFunds: SimpleFundData[] = [];

  const handleQuickAction = (action: 'receipt' | 'payment' | 'transfer' | 'exchange', fundId?: number, fund?: FundData) => {
    if (fundId) setSelectedFundId(fundId);
    if (action === 'receipt') setIsReceiptDialogOpen(true);
    else if (action === 'payment') setIsPaymentDialogOpen(true);
    else if (action === 'transfer') setIsTransferDialogOpen(true);
    else if (action === 'exchange' && fund) {
      setSelectedFundForExchange(fund);
      setIsExchangeDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo mb-2">{t('accounting.funds')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal">{t('accounting.fundsDescription')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <QuickActionsBar />
        </div>
      </div>


      {/* Dialogs */}
      <AddFundDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      
      <QuickReceiptDialog 
        open={isReceiptDialogOpen} 
        onOpenChange={setIsReceiptDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />
      
      <QuickPaymentDialog 
        open={isPaymentDialogOpen} 
        onOpenChange={setIsPaymentDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />
      
      <FundTransferDialog 
        open={isTransferDialogOpen} 
        onOpenChange={setIsTransferDialogOpen}
        selectedFundId={selectedFundId || undefined}
        funds={simpleFunds}
      />

      {/* Old Fund Transaction Sheet - keeping for reference */}
      {/* <FundTransactionSheet
        open={transactionSheetOpen}
        onOpenChange={setTransactionSheetOpen}
        fund={selectedFundForSheet}
        selectedCurrency={selectedCurrency === 'ALL' ? undefined : selectedCurrency}
      /> */}

      {/* Fund Details Sheet - Universal */}
      <UniversalDetailSheet
        isOpen={transactionSheetOpen}
        onClose={() => {
          setTransactionSheetOpen(false);
          setSelectedFundForSheet(null);
        }}
        docType="fund"
        data={selectedFundForSheet}
      />

      <CurrencyExchangeDialog
        open={isExchangeDialogOpen}
        onOpenChange={setIsExchangeDialogOpen}
        fund={selectedFundForExchange}
      />
    </div>
  );
}

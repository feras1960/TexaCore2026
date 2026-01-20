import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import JournalEntryForm from './JournalEntryForm';
import CashJournalForm from './CashJournalForm';
import FundTransferContent from './FundTransferContent';
import CurrencyExchangeContent from './CurrencyExchangeContent';

type TabType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

interface NewJournalEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: TabType;
}

const tabConfig: Record<TabType, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  titleKey: string;
  descriptionKey: string;
}> = {
  journal: {
    icon: FileText,
    color: 'blue',
    gradient: 'from-blue-600 to-indigo-600',
    titleKey: 'accounting.entryTabs.journal.title',
    descriptionKey: 'accounting.entryTabs.journal.description',
  },
  receipt: {
    icon: ArrowDownCircle,
    color: 'green',
    gradient: 'from-green-600 to-emerald-500',
    titleKey: 'accounting.entryTabs.receipt.title',
    descriptionKey: 'accounting.entryTabs.receipt.description',
  },
  payment: {
    icon: ArrowUpCircle,
    color: 'orange',
    gradient: 'from-orange-600 to-amber-500',
    titleKey: 'accounting.entryTabs.payment.title',
    descriptionKey: 'accounting.entryTabs.payment.description',
  },
  cash: {
    icon: Wallet,
    color: 'purple',
    gradient: 'from-purple-600 to-violet-500',
    titleKey: 'accounting.entryTabs.cash.title',
    descriptionKey: 'accounting.entryTabs.cash.description',
  },
  transfer: {
    icon: ArrowLeftRight,
    color: 'cyan',
    gradient: 'from-cyan-600 to-teal-500',
    titleKey: 'accounting.entryTabs.transfer.title',
    descriptionKey: 'accounting.entryTabs.transfer.description',
  },
  exchange: {
    icon: RefreshCw,
    color: 'amber',
    gradient: 'from-amber-600 to-yellow-500',
    titleKey: 'accounting.entryTabs.exchange.title',
    descriptionKey: 'accounting.entryTabs.exchange.description',
  },
};

export default function NewJournalEntrySheet({ open, onOpenChange, defaultTab = 'journal' }: NewJournalEntrySheetProps) {
  const { t, direction, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [showCloseAlert, setShowCloseAlert] = useState(false);
  
  const [journalDirty, setJournalDirty] = useState(false);
  const [cashDirty, setCashDirty] = useState(false);
  const [receiptDirty, setReceiptDirty] = useState(false);
  const [paymentDirty, setPaymentDirty] = useState(false);
  
  const [currentVoucherNo, setCurrentVoucherNo] = useState('');

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const isDirty = journalDirty || cashDirty || receiptDirty || paymentDirty;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      setShowCloseAlert(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const currentConfig = tabConfig[activeTab];
  const ActiveIcon = currentConfig.icon;

  // Mock funds data for transfer (array)
  const mockFundsData = [
    { id: 1, name: 'الصندوق الرئيسي', type: 'cash', balance: 45000 },
    { id: 2, name: 'بنك الراجحي', type: 'bank', balance: 125000 },
    { id: 3, name: 'بنك الأهلي', type: 'bank', balance: 85000 },
    { id: 4, name: 'صندوق المصروفات', type: 'cash', balance: 12000 },
  ];

  // Mock fund data for exchange (single object with balances)
  const mockExchangeFundData = {
    id: 1,
    name: 'الصندوق الرئيسي',
    type: 'cash' as const,
    defaultCurrency: 'SAR',
    accountNumber: 'FUND-001',
    balances: [
      { currency: 'SAR', balance: 45000, totalDeposits: 100000, totalWithdrawals: 55000, todayChange: 2500 },
      { currency: 'USD', balance: 5000, totalDeposits: 8000, totalWithdrawals: 3000, todayChange: 500 },
      { currency: 'EUR', balance: 3000, totalDeposits: 5000, totalWithdrawals: 2000, todayChange: 0 },
    ],
    lastActivity: '2024-03-20',
    transactionCount: 156
  };

  const tabsList: TabType[] = ['journal', 'receipt', 'payment', 'cash', 'transfer', 'exchange'];

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[70vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[70vw] p-0 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-950" dir={direction}>
          {/* Enhanced Header with Gradient */}
          <SheetHeader className={cn("p-6 text-white flex-none bg-gradient-to-r", currentConfig.gradient)}>
            <div className="flex items-center justify-between">
              <div className={cn("flex items-center gap-3", direction === 'rtl' && "flex-row-reverse")}>
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <ActiveIcon className="w-6 h-6 text-white" />
                </div>
                <div className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                  <SheetTitle className="text-xl font-bold text-white font-cairo">
                    {t(currentConfig.titleKey)}
                  </SheetTitle>
                  <p className="text-white/80 text-sm mt-0.5">
                    {t(currentConfig.descriptionKey)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-none hover:bg-white/30 font-mono">
                {currentVoucherNo || `ENT-${Date.now().toString(36).slice(-6).toUpperCase()}`}
              </Badge>
            </div>
          </SheetHeader>

          {/* Enhanced Tab Buttons */}
          <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {tabsList.map((tab) => {
                const config = tabConfig[tab];
                const Icon = config.icon;
                const isActive = activeTab === tab;
                
                return (
                  <Button
                    key={tab}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTabChange(tab)}
                    className={cn(
                      "flex-1 h-10 gap-1.5 rounded-lg transition-all duration-200",
                      isActive && `bg-gradient-to-r ${config.gradient} text-white shadow-md hover:opacity-90`,
                      !isActive && "hover:bg-white/50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs font-medium">
                      {t(config.titleKey)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
            
          <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
            <JournalEntryForm 
              isActive={activeTab === 'journal'} 
              onDirtyChange={setJournalDirty}
              onSave={handleClose}
              onCancel={handleClose}
              onVoucherNoChange={setCurrentVoucherNo}
            />
            <CashJournalForm 
              isActive={activeTab === 'cash'} 
              onDirtyChange={setCashDirty}
              onSave={handleClose}
              onCancel={handleClose}
              mode="all"
              onVoucherNoChange={setCurrentVoucherNo}
            />
            <CashJournalForm 
              isActive={activeTab === 'receipt'} 
              onDirtyChange={setReceiptDirty}
              onSave={handleClose}
              onCancel={handleClose}
              mode="receipt"
              onVoucherNoChange={setCurrentVoucherNo}
            />
            <CashJournalForm 
              isActive={activeTab === 'payment'} 
              onDirtyChange={setPaymentDirty}
              onSave={handleClose}
              onCancel={handleClose}
              mode="payment"
              onVoucherNoChange={setCurrentVoucherNo}
            />
            <FundTransferContent 
              isActive={activeTab === 'transfer'} 
              funds={mockFundsData}
              onSave={handleClose}
              onCancel={handleClose}
            />
            <CurrencyExchangeContent 
              isActive={activeTab === 'exchange'} 
              fund={mockExchangeFundData}
              onSave={handleClose}
              onCancel={handleClose}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showCloseAlert} onOpenChange={setShowCloseAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.unsavedChanges')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.unsavedChangesDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowCloseAlert(false);
              onOpenChange(false);
            }} className="bg-red-600 hover:bg-red-700">
              {t('common.discardAndClose')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

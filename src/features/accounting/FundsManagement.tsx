import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Building2, TrendingUp, RefreshCw } from "lucide-react";
import { Account } from '@/services/accountsService';
import { useCompany } from '@/hooks/useCompany';
import { useFunds } from './hooks/useAccountingQueries';
import { AddFundDialog } from './components/AddFundDialog';
import { FundStatementSheet } from './components/FundStatementSheet';
import QuickActionsBar from './components/QuickActionsBar';

// Shared Components
import { AccountingPageHeader } from './components/shared/AccountingPageHeader';
import { AccountingStatsCard } from './components/shared/AccountingStatsCard';
import { NexaTable, Column } from '@/components/shared/tables/NexaTable';
import { StatusBadge } from './components/shared/StatusBadge';
import { useViewCurrency } from './hooks/useViewCurrency';
import { CurrencySelector } from './components/shared/CurrencySelector';

export default function FundsManagement() {
  const { t, direction, language } = useLanguage();
  const { company: currentCompany } = useCompany();
  const isRTL = direction === 'rtl';

  // State
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const { selectedCurrency, setSelectedCurrency, currencyOptions, formatAmount } = useViewCurrency();

  // ⚡ React Query: cached data + Realtime from other users
  const { funds, loading: isLoading, refetch: refetchFunds, invalidate: invalidateFunds } = useFunds();

  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Account | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Calculations for Stats Cards
  const stats = useMemo(() => {
    const totalCash = funds
      .filter(f => f.is_cash_account || f.account_type_code === 'CASH')
      .reduce((sum, f) => sum + (f.current_balance || 0), 0);

    const totalBank = funds
      .filter(f => f.is_bank_account || f.account_type_code === 'BANK')
      .reduce((sum, f) => sum + (f.current_balance || 0), 0);

    return {
      totalCash,
      totalBank,
      grandTotal: totalCash + totalBank
    };
  }, [funds]);



  const columns: Column<Account>[] = useMemo(() => [
    {
      title: 'accounting.accountCode',
      key: 'code',
      align: 'start',
      width: '150px'
    },
    {
      title: 'accounting.accountName',
      key: 'name',
      align: 'start',
      render: (_, row) => (
        <span className="font-medium text-erp-navy dark:text-erp-blue">
          {language === 'ar' ? row.name_ar : row.name_en || row.name_ar}
        </span>
      )
    },
    {
      title: 'accounting.type',
      key: 'type',
      align: 'center',
      render: (_, row) => {
        const isBank = row.is_bank_account || row.account_type_code === 'BANK';
        const typeLabel = isBank ? t('accounting.bank') : t('accounting.cash');
        return <StatusBadge status={typeLabel} variant={isBank ? 'default' : 'secondary'} customLabel={typeLabel} />;
      }
    },
    {
      title: 'accounting.currency',
      key: 'currency',
      align: 'center',
      render: (_, row) => row.currency || '-'
    },
    {
      title: 'accounting.balance',
      key: 'balance',
      align: 'end',
      render: (_, row) => {
        const balance = row.current_balance || 0;
        return (
          <span className={`font-bold font-mono ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatAmount(balance, row.currency)}
          </span>
        );
      }
    }
  ], [t, language]);

  // Filter Logic
  const filteredFunds = useMemo(() => {
    return funds.filter(fund => {
      const matchesType = typeFilter === 'all'
        ? true
        : typeFilter === 'cash'
          ? (fund.is_cash_account || fund.account_type_code === 'CASH')
          : (fund.is_bank_account || fund.account_type_code === 'BANK');

      // Currency filter - REMOVED: Now acts as a View As selector
      // const matchesCurrency = selectedCurrency === 'all' ? true : (fund.currency || fund.currency_code) === selectedCurrency;

      return matchesType; // && matchesCurrency;
    });
  }, [funds, typeFilter, selectedCurrency]);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500" dir={direction}>

      <AccountingPageHeader
        title={t('accounting.funds_management')}
        description={t('accounting.funds_description')}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button onClick={() => setIsAddDialogOpen(true)} className="h-9 px-3 gap-1.5 text-xs font-tajawal text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
            <Building2 className="w-3.5 h-3.5" />
            {t('accounting.add_fund')}
          </Button>
          <QuickActionsBar />
        </div>
      </AccountingPageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccountingStatsCard
          title={t('accounting.total_cash')}
          value={formatAmount(stats.totalCash)}
          icon={Wallet}
          variant="green"
        />
        <AccountingStatsCard
          title={t('accounting.total_bank')}
          value={formatAmount(stats.totalBank)}
          icon={Building2}
          variant="blue"
        />
        <AccountingStatsCard
          title={t('accounting.grand_total')}
          value={formatAmount(stats.grandTotal)}
          icon={TrendingUp}
          variant="purple"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 p-0 rounded-lg shadow-sm border-none">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex-1 max-w-sm">
            {/* Search is handled inside table if needed, but here we can keep external filters */}
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('accounting.filter_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="cash">{t('accounting.cash')}</SelectItem>
                <SelectItem value="bank">{t('accounting.bank')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetchFunds()} title={t('common.refresh')}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <NexaTable
          data={filteredFunds}
          columns={columns}
          loading={isLoading}
          onRowClick={(row) => {
            setSelectedFund(row);
            setIsStatementOpen(true);
          }}
          bordered
          striped
          emptyMessage={t('common.noData')}
        />
      </div>

      {/* Detail Sheet (Modal) */}
      {selectedFund && (
        <FundStatementSheet
          isOpen={isStatementOpen}
          onOpenChange={setIsStatementOpen}
          fund={selectedFund}
        />
      )}

      {/* Add Dialog */}
      <AddFundDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) invalidateFunds(); // Refresh on close
        }}
      />

    </div>
  );
}

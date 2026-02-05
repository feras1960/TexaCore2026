/**
 * GeneralLedgerPage.tsx
 * 
 * Main page for General Ledger (دفتر الأستاذ العام)
 * Features:
 * - Real Data Integration (Supabase)
 * - Smart Account Selector (Customers, Suppliers, Expenses)
 * - Advanced Filtering (Date, Cost Center, Project, Status)
 * - Export to Excel/PDF (Placeholder logic for now)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencySelector } from './components/shared/CurrencySelector';
import { NexaTable, Column } from '@/components/shared/tables/NexaTable';

import {
  Download,
  Printer,
  Filter,
  Search,
  RefreshCw,
  Calendar as CalendarIcon,
  ArrowRight,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCompany } from '@/hooks/useCompany';
import { accountLedgerService, LedgerEntry, AccountStats } from '@/services/accountLedgerService';
import { SmartAccountSelector } from './components/shared/SmartAccountSelector';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function GeneralLedgerPage() {
  const { t, language } = useLanguage();
  const { companyId, company } = useCompany();

  // -- State Management --
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<AccountStats>({
    openingBalance: 0,
    totalDebit: 0,
    totalCredit: 0,
    currentBalance: 0,
    transactionCount: 0,
    lastActivityDate: null,
    monthlyAverage: 0,
    periodDebit: 0,
    periodCredit: 0
  });

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all'); // New Currency State
  const [voucherSearch, setVoucherSearch] = useState('');

  // Dropdown Data
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // -- Initial Load --
  useEffect(() => {
    if (companyId) {
      fetchDropdowns();
    }
  }, [companyId]);

  const fetchDropdowns = async () => {
    try {
      // Fetch Cost Centers
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('id, name_ar, name_en, code')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (ccData) setCostCenters(ccData);

      setProjects([]); // Set empty array for now

    } catch (error) {
      console.error('Error fetching dropdowns:', error);
    }
  };

  // -- Main Data Fetching --
  const handleSearch = async () => {
    if (!companyId) return;
    if (!selectedAccountId) {
      toast.error(t('accounting.account.select'));
      return;
    }

    setLoading(true);
    try {
      const { entries, stats: newStats } = await accountLedgerService.getLedger({
        companyId,
        accountId: selectedAccountId,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
        costCenterId: selectedCostCenter,
        projectId: selectedProject,
        status: statusFilter as any,
        currency: selectedCurrency === 'all' ? undefined : selectedCurrency, // Pass currency
      });

      // Client side filtering for Voucher No (since it might be partial match)
      let finalEntries = entries;
      if (voucherSearch) {
        finalEntries = entries.filter(e =>
          e.entryNumber.toLowerCase().includes(voucherSearch.toLowerCase()) ||
          e.description.toLowerCase().includes(voucherSearch.toLowerCase())
        );
      }

      setLedgerData(finalEntries);
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  // -- Handlers --
  const handleExport = (type: 'pdf' | 'excel') => {
    toast.info('Export functionality coming soon...');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for localized name
  const getLocalizedName = (item: any) => {
    if (!item) return '';
    return language === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name_ar || item.name);
  };

  // Define columns for NexaTable
  const columns: Column<LedgerEntry>[] = useMemo(() => [
    {
      key: 'date',
      title: t('common.date') || 'Date',
      width: '100px',
      render: (val) => <span className="font-mono text-xs">{format(new Date(val), 'yyyy-MM-dd')}</span>
    },
    {
      key: 'description',
      title: t('common.description') || 'Description',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{row.description}</span>
          {row.costCenterName && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Building2Icon className="w-3 h-3" /> {row.costCenterName}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'entryNumber',
      title: t('ledger.filters.voucher_no') || 'Voucher No',
      width: '100px',
      render: (val) => <span className="font-mono text-xs text-blue-600 hover:underline cursor-pointer">{val}</span>
    },
    {
      key: 'type',
      title: t('common.type') || 'Type',
      width: '100px',
      render: (_, row) => <BadgeVariant type={row.type} />
    },
    {
      key: 'currency', // New Currency Column
      title: t('common.currency') || 'Currency',
      width: '80px',
      align: 'center',
      render: (val) => <span className="text-xs font-mono text-gray-500">{val}</span>
    },
    {
      key: 'debit',
      title: t('common.debit') || 'Debit',
      width: '120px',
      align: 'end',
      render: (val) => val > 0 ? val.toLocaleString() : '-'
    },
    {
      key: 'credit',
      title: t('common.credit') || 'Credit',
      width: '120px',
      align: 'end',
      render: (val) => val > 0 ? val.toLocaleString() : '-'
    },
    {
      key: 'balance',
      title: t('accounting.account.balance') || 'Balance',
      width: '120px',
      align: 'end',
      render: (val) => <span className="font-semibold dir-ltr">{val.toLocaleString()}</span>
    }
  ], [t, language]);

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-cairo flex items-center gap-2">
            <FileText className="w-6 h-6 text-erp-navy" />
            {t('accounting.accountStatement')}
          </h2>
          <p className="text-gray-500 font-tajawal text-sm mt-1">
            {t('accounting.account.treeSelectorDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Added Company Filter (Visual) */}
          <div className="w-[200px]">
            <Input
              value={getLocalizedName(company)}
              disabled
              className="bg-gray-50 text-gray-500 cursor-not-allowed border-dashed"
              title={t('common.company') || 'Company'}
            />
          </div>
          <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {t('common.print')}
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Top Row: Account & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Account Selector (Big) */}
            <div className="md:col-span-5 space-y-1.5">
              <Label>{t('ledger.smart_selector_title')}</Label>
              <SmartAccountSelector
                value={selectedAccountId}
                onChange={(id) => setSelectedAccountId(id)}
              />
            </div>

            {/* Date From */}
            <div className="md:col-span-3 space-y-1.5">
              <Label>{t('ledger.filters.date_from')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP', { locale: language === 'ar' ? ar : enUS }) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="md:col-span-3 space-y-1.5">
              <Label>{t('ledger.filters.date_to')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP', { locale: language === 'ar' ? ar : enUS }) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Button */}
            <div className="md:col-span-1 flex items-end">
              <Button className="w-full bg-erp-navy hover:bg-erp-navy/90" onClick={handleSearch} disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
            <div className="space-y-1.5">
              <Label>{t('ledger.filters.cost_center')}</Label>
              <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ledger.tabs.all')}</SelectItem>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.code} - {getLocalizedName(cc)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Filter */}
            <div className="space-y-1.5">
              <Label>{t('common.currency') || 'Currency'}</Label>
              <CurrencySelector
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
                showAllOption
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('ledger.filters.status')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ledger.tabs.all')}</SelectItem>
                  <SelectItem value="posted">{t('common.posted') || 'Posted'}</SelectItem>
                  <SelectItem value="draft">{t('common.draft') || 'Draft'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('ledger.filters.voucher_no')}</Label>
              <Input
                placeholder="..."
                value={voucherSearch}
                onChange={(e) => setVoucherSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ... (Stats cards remain same) ... */}

      {/* Data Table */}
      <Card className="overflow-hidden border-none shadow-md">
        <NexaTable
          data={ledgerData}
          columns={columns}
          loading={loading}
          bordered
          striped
          emptyMessage={t('ledger.no_data')}
        />
      </Card>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-xs text-gray-400 px-2 print:hidden">
        <span>{ledgerData.length} {t('common.records') || 'records found'}</span>
        <span>{t('appName') || 'ERP System'}</span>
      </div>
    </div>
  );
}



// -- Sub Components --

function BadgeVariant({ type }: { type: string }) {
  const styles = {
    journal: 'bg-purple-100 text-purple-700 border-purple-200',
    invoice: 'bg-blue-100 text-blue-700 border-blue-200',
    payment: 'bg-green-100 text-green-700 border-green-200',
    receipt: 'bg-orange-100 text-orange-700 border-orange-200',
    transfer: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  // Fallback
  const className = (styles as any)[type] || 'bg-gray-100 text-gray-700';

  return <span className={cn("px-2 py-0.5 rounded-full text-[10px] border font-medium", className)}>{type}</span>;
}

function Building2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

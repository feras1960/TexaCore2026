import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Truck, Building2, TrendingUp, TrendingDown, Upload, Plus } from 'lucide-react';
import { NexaTable, Column } from '@/components/shared/tables/NexaTable';
import { UniversalDetailSheet } from '@/components/sheets';
import { ImportWizard } from '@/features/import';
import QuickActionsBar from './components/QuickActionsBar';
import { AddPartySheet } from './components/AddPartySheet';
import { useViewCurrency } from './hooks/useViewCurrency';
import { CurrencySelector } from './components/shared/CurrencySelector';

interface Party {
  id: string;
  code: string;
  name: string; // Display name
  name_ar: string;
  name_en: string;
  type: 'customer' | 'supplier';
  balance: number;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  account?: {
    id: string;
    name_ar: string;
    name_en: string;
    account_code: string;
  };
}

export default function Parties() {
  const { t, direction, language } = useLanguage();
  const { companyId } = useCompany();
  const [activeTab, setActiveTab] = useState('customers');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { selectedCurrency, setSelectedCurrency, currencyOptions, formatAmount } = useViewCurrency();
  const [importEntityType, setImportEntityType] = useState<'customers' | 'suppliers'>('customers');

  // Data State
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParties = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      // Fetch Customers
      const { data: custData } = await supabase
        .from('customers')
        .select(`
                *,
                account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)
            `)
        .eq('company_id', companyId);

      // Fetch Suppliers
      const { data: suppData } = await supabase
        .from('suppliers')
        .select(`
                *,
                account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)
            `)
        .eq('company_id', companyId);

      // Map Data - name is computed at render-time, not fetch-time
      if (custData) {
        setCustomers(custData.map((c: any) => ({
          ...c,
          type: 'customer',
          name: c.name_ar || c.name_en,
        })));
      }
      if (suppData) {
        setSuppliers(suppData.map((s: any) => ({
          ...s,
          type: 'supplier',
          name: s.name_ar || s.name_en,
        })));
      }

    } catch (e) {
      console.error('Error fetching parties:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [companyId]);

  const handlePartyClick = (party: Party) => {
    setSelectedParty(party);
    setIsDetailSheetOpen(true);
  };

  const handleAddClick = () => {
    setShowAddSheet(true);
  };

  const handleImport = (type: 'customers' | 'suppliers') => {
    setImportEntityType(type);
    setShowImportWizard(true);
  };

  const handleImportComplete = () => {
    setShowImportWizard(false);
    fetchParties();
  };

  // Calculate stats
  const stats = {
    customers: {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      totalReceivables: customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0),
      overdue: 0,
    },
    suppliers: {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === 'active').length,
      totalPayables: Math.abs(suppliers.reduce((sum, s) => sum + (Number(s.balance) || 0), 0)),
      overdue: 0,
    },
  };

  const columns: Column<Party>[] = [
    {
      key: 'code',
      title: 'table.code',
      width: '120px',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val}</span>
    },
    {
      key: 'name',
      title: 'table.name',
      sortable: true,
      render: (_val, item) => (
        <div>
          <p className="font-medium">{language === 'ar' ? item.name_ar : (item.name_en || item.name_ar)}</p>
          {item.account && (
            <p className="text-[10px] text-gray-400 font-mono">
              {item.account.account_code} - {language === 'ar' ? item.account.name_ar : item.account.name_en}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'balance',
      title: 'common.balance',
      width: '150px',
      align: 'end',
      sortable: true,
      render: (value) => (
        <span className={`font-mono font-semibold ${value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {formatAmount(Number(value))}
        </span>
      ),
    },
    {
      key: 'phone',
      title: 'common.phone',
      width: '130px',
      render: (val) => <span dir="ltr" className="text-sm">{val}</span>
    },
    {
      key: 'status',
      title: 'table.status',
      width: '100px',
      align: 'center',
      render: (value) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'}>
          {t(`common.status.${value}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Building2 className="w-7 h-7 text-erp-teal" />
            {t('parties.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('parties.partiesDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAddClick} className="gap-2 bg-erp-teal hover:bg-erp-teal/90">
            <Plus className="w-4 h-4" />
            {activeTab === 'customers' ? t('parties.addCustomer') : t('parties.addSupplier')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleImport(activeTab === 'customers' ? 'customers' : 'suppliers')}
          >
            <Upload className="w-4 h-4 me-2" />
            {t('common.import')}
          </Button>
          <CurrencySelector
            value={selectedCurrency}
            onValueChange={setSelectedCurrency}
            options={currencyOptions}
          />
          <QuickActionsBar />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Same Stats Cards - using real stats */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{t('parties.partiesStats.totalCustomers')}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono mt-1">{stats.customers.total}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400">{stats.customers.active} {t('common.status.active')}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">{t('parties.partiesStats.totalReceivables')}</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono mt-1">
                  {formatAmount(stats.customers.totalReceivables)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{(stats.customers.overdue / 1000).toFixed(0)}K {t('accounting.overdue')}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400">{t('parties.partiesStats.totalSuppliers')}</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 font-mono mt-1">{stats.suppliers.total}</p>
                <p className="text-xs text-orange-500 dark:text-orange-400">{stats.suppliers.active} {t('common.status.active')}</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl">
                <Truck className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400">{t('parties.partiesStats.totalPayables')}</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono mt-1">
                  {formatAmount(stats.suppliers.totalPayables)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{(stats.suppliers.overdue / 1000).toFixed(0)}K {t('accounting.overdue')}</p>
              </div>
              <div className="p-3 bg-rose-500 rounded-xl">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <TabsList className="w-full justify-start bg-white dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-800 rounded-lg mb-4">
          <TabsTrigger
            value="customers"
            className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white"
          >
            <Users className="w-4 h-4" />
            {t('accounting.customers')}
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ml-2">{stats.customers.total}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white"
          >
            <Truck className="w-4 h-4" />
            {t('accounting.suppliers')}
            <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ml-2">{stats.suppliers.total}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
            <NexaTable
              data={customers}
              columns={columns}
              rowKey="id"
              onRowClick={handlePartyClick}
              emptyMessage={t('accounting.noCustomers')}
              loading={loading}
            />
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
            <NexaTable
              data={suppliers}
              columns={columns}
              rowKey="id"
              onRowClick={handlePartyClick}
              emptyMessage={t('accounting.noSuppliers')}
              loading={loading}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Party Details Sheet - Universal */}
      <UniversalDetailSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false);
          setSelectedParty(null);
        }}
        docType={selectedParty?.type === 'supplier' ? 'supplier' : 'customer'}
        data={selectedParty ? {
          ...selectedParty,
          current_balance: selectedParty.balance,
          is_active: selectedParty.status === 'active',
        } : null}
      />

      {/* Add Party Sheet */}
      <AddPartySheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        type={activeTab === 'customers' ? 'customer' : 'supplier'}
        onComplete={fetchParties}
      />

      {/* Import Wizard */}
      {showImportWizard && (
        <ImportWizard
          defaultEntityType={importEntityType}
          onClose={() => setShowImportWizard(false)}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
}

/**
 * ════════════════════════════════════════════════════════════════
 * 📤 RemittancesPage — تبويب الحوالات
 * ════════════════════════════════════════════════════════════════
 * V1 — NexaListTable + Status pipeline + Outgoing/Incoming filter
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { supabase } from '@/lib/supabase';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { useExchangeFilters } from '../hooks/useExchangeFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Send, ArrowUpRight, ArrowDownLeft, Plus,
  Clock, CheckCircle2, AlertTriangle, Banknote, Globe,
} from 'lucide-react';

interface Remittance {
  id: string;
  remittance_number: string;
  remittance_type: 'outgoing' | 'incoming';
  remittance_date: string;
  sender_name: string;
  receiver_name: string;
  sender_country?: string;
  receiver_country?: string;
  send_currency: string;
  send_amount: number;
  receive_currency: string;
  receive_amount: number;
  commission_amount: number;
  our_commission?: number;
  agent_commission?: number;
  delivery_method: string;
  delivery_country?: string;
  delivery_city?: string;
  execution_channel?: string;
  agent_id?: string;
  partner_id?: string;
  status: string;
  priority: string;
  created_at: string;
}

const fmtAmount = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CONFIG: Record<string, { key: string; labelAr: string; labelEn: string; cls: string; icon: any }> = {
  draft: { key: 'draft', labelAr: 'مسودة', labelEn: 'Draft', cls: 'bg-gray-50 text-gray-500 border-gray-300', icon: Clock },
  pending: { key: 'pending', labelAr: 'مؤكدة', labelEn: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  processing: { key: 'processing', labelAr: 'قيد التنفيذ', labelEn: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  sent: { key: 'sent', labelAr: 'تم التنفيذ', labelEn: 'Executed', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Send },
  delivered: { key: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  completed: { key: 'completed', labelAr: 'مكتملة', labelEn: 'Completed', cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelled: { key: 'cancelled', labelAr: 'ملغاة', labelEn: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200', icon: AlertTriangle },
  returned: { key: 'returned', labelAr: 'مرتجعة', labelEn: 'Returned', cls: 'bg-gray-50 text-gray-500 border-gray-200', icon: AlertTriangle },
};

import RemittanceDetailSheet from '../components/RemittanceDetailSheet';
import IncomingRemittanceSheet from '../components/IncomingRemittanceSheet';

// ... existing code ...

export default function RemittancesPage() {
  const { t, language } = useLanguage();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'outgoing' | 'incoming'>('all');
  const [sortField, setSortField] = useState('remittance_date');
  const [sortAsc, setSortAsc] = useState(false);
  
  // Sheet state
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isIncomingSheetOpen, setIncomingSheetOpen] = useState(false);
  const [selectedRemittanceId, setSelectedRemittanceId] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0); // Force remount on new remittance

  // ─── Exchange Filters (shared hook) ─────────────────────────
  const { currencyFilterNode } = useExchangeFilters({ storageKey: 'exchange_remittances' });

  useRealtimeInvalidation({
    table: 'remittances',
    companyId,
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    queryKeys: [['exchange_remittances']],
  });

  const { data: remittances = [], isLoading } = useCachedQuery({
    queryKey: ['exchange_remittances', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('remittances')
        .select('*')
        .eq('company_id', companyId)
        .order('remittance_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Remittance[];
    },
    enabled: !!companyId,
    staleTime: 0,
  });

  const filteredData = useMemo(() => {
    let result = remittances;
    if (typeFilter !== 'all') {
      result = result.filter(r => r.remittance_type === typeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.remittance_number || '').toLowerCase().includes(q) ||
        (r.sender_name || '').toLowerCase().includes(q) ||
        (r.receiver_name || '').toLowerCase().includes(q) ||
        (r.receiver_country || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [remittances, typeFilter, searchTerm]);

  const stats = useMemo(() => {
    const pending = remittances.filter(r => ['pending', 'processing', 'sent'].includes(r.status));
    const completed = remittances.filter(r => r.status === 'completed' || r.status === 'delivered');
    const totalCommission = completed.reduce((s, r) => s + (r.commission_amount || 0), 0);
    return {
      total: remittances.length,
      pending: pending.length,
      completed: completed.length,
      totalCommission,
    };
  }, [remittances]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(false); }
  }, [sortField]);

  const getRowAccent = useCallback((row: Remittance) => {
    if (row.status === 'cancelled' || row.status === 'returned') return 'border-s-red-400';
    if (row.priority === 'urgent' || row.priority === 'vip') return 'border-s-amber-400';
    if (row.status === 'completed' || row.status === 'delivered') return 'border-s-emerald-400';
    return 'border-s-blue-400';
  }, []);

  const columns: NexaListColumn<Remittance>[] = useMemo(() => [
    {
      id: 'number',
      header: '#',
      width: '110px',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-500">{row.remittance_number}</span>
          {row.priority !== 'normal' && (
            <Badge variant="outline" className={cn("text-[9px] px-1 py-0 w-fit mt-0.5",
              row.priority === 'vip' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-amber-50 text-amber-600 border-amber-200"
            )}>
              {row.priority === 'vip' ? 'VIP' : t('exchange.remittances.urgent')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'date',
      header: language === 'ar' ? 'التاريخ' : 'Date',
      width: '95px',
      cell: (row) => {
        const d = new Date(row.created_at);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        return (
          <div className="flex flex-col">
            <span className="text-xs text-gray-700 dark:text-gray-300">{dateStr}</span>
            <span className="text-[10px] text-gray-400">{timeStr}</span>
          </div>
        );
      },
    },
    {
      id: 'direction',
      header: t('exchange.remittances.direction'),
      width: '100px',
      cell: (row) => {
        const dest = row.remittance_type === 'outgoing'
          ? [row.receiver_country, row.delivery_city].filter(Boolean).join(', ')
          : [row.sender_country].filter(Boolean).join(', ');
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1",
              row.remittance_type === 'outgoing'
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-teal-50 text-teal-700 border-teal-200"
            )}>
              {row.remittance_type === 'outgoing'
                ? <><ArrowUpRight className="w-3 h-3" />{t('exchange.remittances.outgoing')}</>
                : <><ArrowDownLeft className="w-3 h-3" />{t('exchange.remittances.incoming')}</>}
            </Badge>
            {dest && (
              <span className="text-[9px] text-gray-400 truncate max-w-[95px]">{dest}</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'sender',
      header: t('exchange.remittances.sender'),
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{row.sender_name}</span>
          {row.sender_country && <span className="text-[10px] text-gray-400">{row.sender_country}</span>}
        </div>
      ),
    },
    {
      id: 'receiver',
      header: t('exchange.remittances.receiver'),
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{row.receiver_name}</span>
          {row.receiver_country && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Globe className="w-3 h-3" />
              <span>{row.receiver_country}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'amount',
      header: t('exchange.remittances.amount'),
      width: '140px',
      align: 'end' as const,
      cell: (row) => (
        <div className="text-end space-y-0.5">
          <div className="text-sm font-medium">
            {fmtAmount(row.send_amount)} <span className="text-[10px] text-gray-400">{row.send_currency}</span>
          </div>
          {row.send_currency !== row.receive_currency && (
            <div className="text-xs text-gray-400">
              → {fmtAmount(row.receive_amount)} <span className="text-[10px]">{row.receive_currency}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'commission',
      header: language === 'ar' ? 'الرسوم' : 'Fees',
      width: '90px',
      align: 'end' as const,
      cell: (row) => (
        <div className="text-end">
          {row.commission_amount > 0 ? (
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {fmtAmount(row.commission_amount)} <span className="text-[9px] text-gray-400">{row.send_currency}</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      id: 'executor',
      header: language === 'ar' ? 'المنفذ' : 'Executor',
      width: '100px',
      cell: (row) => {
        if (!row.agent_id && !row.partner_id) return <span className="text-[10px] text-gray-400">—</span>;
        const channelLabels: Record<string, { ar: string; en: string }> = {
          agent_partner: { ar: 'وكيل/شريك', en: 'Agent/Partner' },
          branch: { ar: 'فرع', en: 'Branch' },
          direct_bank: { ar: 'بنك مباشر', en: 'Direct Bank' },
          wallet: { ar: 'محفظة', en: 'Wallet' },
        };
        const ch = channelLabels[row.execution_channel || ''];
        return (
          <div className="flex flex-col">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 w-fit">
              {row.agent_id ? (language === 'ar' ? 'وكيل' : 'Agent') : (language === 'ar' ? 'شريك' : 'Partner')}
            </Badge>
            {ch && <span className="text-[9px] text-gray-400 mt-0.5">{language === 'ar' ? ch.ar : ch.en}</span>}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('fields.status'),
      width: '110px',
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending;
        const Icon = cfg.icon;
        return (
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1", cfg.cls)}>
            <Icon className="w-3 h-3" />
            {language === 'ar' ? cfg.labelAr : cfg.labelEn}
          </Badge>
        );
      },
    },
  ], [language]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 border-violet-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-600/70 font-tajawal">{t('exchange.stats.totalRemittances')}</p>
                <p className="text-2xl font-bold text-violet-700 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-violet-500/10 rounded-xl"><Send className="w-5 h-5 text-violet-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600/70 font-tajawal">{t('exchange.stats.processing')}</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">{t('exchange.stats.completed')}</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completed}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-950/30 border-teal-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600/70 font-tajawal">{t('exchange.stats.totalCommission')}</p>
                <p className="text-2xl font-bold text-teal-700 mt-1">{fmtAmount(stats.totalCommission)}</p>
              </div>
              <div className="p-2.5 bg-teal-500/10 rounded-xl"><Banknote className="w-5 h-5 text-teal-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type filter + action button */}
      <div className="flex items-center justify-between gap-3">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">{t('exchange.remittances.all')}</TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs px-3 h-7 gap-1">
              <ArrowUpRight className="w-3 h-3" />{t('exchange.remittances.outgoing')}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="text-xs px-3 h-7 gap-1">
              <ArrowDownLeft className="w-3 h-3" />{t('exchange.remittances.incoming')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button 
          size="sm" 
          className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
          onClick={() => {
            // Close both sheets, clear ID, bump key
            setSheetOpen(false);
            setIncomingSheetOpen(false);
            setSelectedRemittanceId(null);
            setSheetKey(k => k + 1);
            // Open the correct sheet based on the active type filter
            if (typeFilter === 'incoming') {
              setTimeout(() => setIncomingSheetOpen(true), 50);
            } else {
              setTimeout(() => setSheetOpen(true), 50);
            }
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('exchange.remittances.newRemittance')}</span>
        </Button>
      </div>

      {/* Table */}
      <NexaListTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('exchange.remittances.searchPlaceholder')}
        totalCount={remittances.length}
        countLabel={t('exchange.remittances.countLabel')}
        onRowClick={(row) => {
          setSelectedRemittanceId(row.id);
          // Open the correct sheet based on remittance type
          if (row.remittance_type === 'incoming') {
            setIncomingSheetOpen(true);
          } else {
            setSheetOpen(true);
          }
        }}
        onSort={handleSort}
        sortField={sortField}
        sortAsc={sortAsc}
        getRowAccent={getRowAccent}
        getRowKey={(row) => row.id}
        emptyIcon={<Send className="w-12 h-12 text-gray-300" />}
        emptyMessage={t('exchange.remittances.noRemittances')}
        toolbarEndContent={currencyFilterNode}
        showFooter={true}
      />

      {/* Outgoing Remittance Sheet */}
      <RemittanceDetailSheet 
        key={`sheet-${sheetKey}-${selectedRemittanceId || 'new'}`}
        remittanceId={selectedRemittanceId}
        open={isSheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setTimeout(() => setSelectedRemittanceId(null), 300);
        }}
        onDataChange={() => {
          queryClient.invalidateQueries({ queryKey: ['exchange_remittances'] });
        }}
      />

      {/* Incoming Remittance Sheet */}
      <IncomingRemittanceSheet
        key={`incoming-sheet-${sheetKey}-${selectedRemittanceId || 'new'}`}
        remittanceId={selectedRemittanceId}
        open={isIncomingSheetOpen}
        onClose={() => {
          setIncomingSheetOpen(false);
          setTimeout(() => setSelectedRemittanceId(null), 300);
        }}
        onDataChange={() => {
          queryClient.invalidateQueries({ queryKey: ['exchange_remittances'] });
        }}
      />
    </div>
  );
}

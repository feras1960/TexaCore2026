/**
 * ════════════════════════════════════════════════════════════════
 * 🔀 ExecutionChannelSection — قناة التنفيذ
 * ════════════════════════════════════════════════════════════════
 * 
 * 3 قنوات: وكيل/شريك | فرع | بنكي مباشر
 * يعرض قائمة موحدة للوكلاء والشركاء
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Building2, Landmark, Wallet, Phone, MapPin } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export type ExecutionChannel = 'agent_partner' | 'branch' | 'direct_bank' | 'wallet';
export type ExecutionPaymentMethod = 'cash' | 'bank' | 'wallet';

export interface ExecutorOption {
  id: string;
  type: 'agent' | 'partner';
  code: string;
  name_ar: string;
  name_en?: string;
  country?: string;
  phone?: string;
  commission_rate?: number;
  payable_account_id?: string;
}

export interface ExecutionChannelValue {
  channel: ExecutionChannel | null;
  executor_id: string | null;
  executor_type: 'agent' | 'partner' | null;
  executor_name: string;
  payable_account_id: string | null;
  payment_method: ExecutionPaymentMethod;
}

interface ExecutionChannelSectionProps {
  value: ExecutionChannelValue;
  onChange: (val: ExecutionChannelValue) => void;
  disabled?: boolean;
}

// ─── Executor Combobox (searchable) ───────────────────────────
function ExecutorCombobox({ executors, selectedId, onSelect, getName, isAr, disabled }: {
  executors: ExecutorOption[];
  selectedId: string | null;
  onSelect: (exec: ExecutorOption) => void;
  getName: (e: ExecutorOption) => string;
  isAr: boolean;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return executors.find(e => e.id === selectedId) || null;
  }, [selectedId, executors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return executors;
    const q = search.toLowerCase();
    return executors.filter(e =>
      (e.name_ar || '').toLowerCase().includes(q) ||
      (e.name_en || '').toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q) ||
      (e.country || '').toLowerCase().includes(q)
    );
  }, [search, executors]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center h-9 border rounded-md px-2 gap-2 cursor-pointer transition-colors",
          disabled ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : "bg-white dark:bg-gray-900 hover:border-blue-400",
          isOpen ? "border-blue-500 ring-1 ring-blue-200" : "border-gray-200 dark:border-gray-700"
        )}
        onClick={() => {
          if (disabled) return;
          setIsOpen(true);
          setSearch('');
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-xs outline-none"
            placeholder={isAr ? 'ابحث بالاسم أو الرمز...' : 'Search by name or code...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setIsOpen(false);
              if (e.key === 'Enter' && filtered.length === 1) {
                onSelect(filtered[0]);
                setIsOpen(false);
              }
            }}
          />
        ) : (
          <span className={cn("flex-1 text-xs truncate", selected ? "text-gray-900 dark:text-white font-medium" : "text-gray-400")}>
            {selected ? (
              <span className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn(
                  "text-[7px] px-1 py-0 h-3.5",
                  selected.type === 'agent' ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"
                )}>
                  {selected.type === 'agent' ? (isAr ? 'وكيل' : 'AG') : (isAr ? 'شريك' : 'PR')}
                </Badge>
                {getName(selected)}
              </span>
            ) : (isAr ? 'اختر الوكيل أو الشريك...' : 'Select agent or partner...')}
          </span>
        )}
        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">
              {isAr ? 'لا توجد نتائج' : 'No results'}
            </div>
          ) : (
            filtered.map(e => (
              <button
                key={e.id}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors",
                  e.id === selectedId && "bg-blue-50 dark:bg-blue-950/30"
                )}
                onClick={() => { onSelect(e); setIsOpen(false); }}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[8px] px-1 py-0 h-4 shrink-0",
                    e.type === 'agent' ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"
                  )}
                >
                  {e.type === 'agent' ? (isAr ? 'وكيل' : 'Agent') : (isAr ? 'شريك' : 'Partner')}
                </Badge>
                <span className="text-xs font-medium flex-1 truncate">{getName(e)}</span>
                {e.country && (
                  <span className="text-[9px] text-gray-400 flex items-center gap-0.5 shrink-0">
                    <MapPin className="w-2.5 h-2.5" />{e.country}
                  </span>
                )}
                {e.commission_rate != null && e.commission_rate > 0 && (
                  <span className="text-[9px] text-gray-400 font-mono shrink-0">{e.commission_rate}‰</span>
                )}
                {e.id === selectedId && <span className="text-green-500 text-xs shrink-0">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function ExecutionChannelSection({
  value, onChange, disabled = false,
}: ExecutionChannelSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();

  // ─── Fetch Agents + Partners (unified) ──────────────────────
  const { data: executors = [] } = useQuery<ExecutorOption[]>({
    queryKey: ['exchange_executors', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const [agentsRes, partnersRes] = await Promise.all([
        supabase
          .from('exchange_agents')
          .select('id, code, name_ar, name_en, country, phone, commission_rate, payable_account_id, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name_ar'),
        supabase
          .from('exchange_partners')
          .select('id, code, name_ar, name_en, phone, commission_rate, payable_account_id, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name_ar'),
      ]);

      const agents: ExecutorOption[] = (agentsRes.data || []).map(a => ({
        id: a.id, type: 'agent' as const, code: a.code || '',
        name_ar: a.name_ar, name_en: a.name_en,
        country: a.country, phone: a.phone,
        commission_rate: a.commission_rate,
        payable_account_id: a.payable_account_id,
      }));

      const partners: ExecutorOption[] = (partnersRes.data || []).map(p => ({
        id: p.id, type: 'partner' as const, code: p.code || '',
        name_ar: p.name_ar, name_en: p.name_en,
        phone: p.phone,
        commission_rate: p.commission_rate,
        payable_account_id: p.payable_account_id,
      }));

      return [...agents, ...partners];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  // ─── Channel Tabs ───────────────────────────────────────────
  const channels: { key: ExecutionChannel; icon: React.ElementType; labelAr: string; labelEn: string }[] = [
    { key: 'agent_partner', icon: Users, labelAr: 'وكيل/شريك', labelEn: 'Agent/Partner' },
    { key: 'branch', icon: Building2, labelAr: 'فرع', labelEn: 'Branch' },
    { key: 'direct_bank', icon: Landmark, labelAr: 'بنكي', labelEn: 'Bank' },
    { key: 'wallet', icon: Wallet, labelAr: 'محفظة', labelEn: 'Wallet' },
  ];

  const selectedExecutor = useMemo(() => {
    if (!value.executor_id) return null;
    return executors.find(e => e.id === value.executor_id) || null;
  }, [value.executor_id, executors]);

  const getName = (e: ExecutorOption) => {
    if (isAr) return e.name_ar || e.name_en || '';
    return e.name_en || e.name_ar || '';
  };

  return (
    <div className="space-y-3">
      {/* Channel Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {channels.map(ch => {
          const isActive = value.channel === ch.key;
          return (
            <button
              key={ch.key}
              onClick={() => {
                if (disabled) return;
                onChange({
                  ...value,
                  channel: ch.key,
                  executor_id: null,
                  executor_type: null,
                  executor_name: '',
                  payable_account_id: null,
                });
              }}
              disabled={disabled}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all",
                isActive
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <ch.icon className="w-3.5 h-3.5" />
              {isAr ? ch.labelAr : ch.labelEn}
            </button>
          );
        })}
      </div>

      {/* Agent/Partner Selector */}
      {value.channel === 'agent_partner' && (
        <div className="space-y-3">
          {/* Executor Combobox (searchable) */}
          <div>
            <Label className="text-[11px] text-gray-500 mb-1 block">
              {isAr ? 'الطرف المنفذ' : 'Executor'}
            </Label>
            <ExecutorCombobox
              executors={executors}
              selectedId={value.executor_id}
              onSelect={(exec) => {
                onChange({
                  ...value,
                  executor_id: exec.id,
                  executor_type: exec.type,
                  executor_name: getName(exec),
                  payable_account_id: exec.payable_account_id || null,
                });
              }}
              getName={getName}
              isAr={isAr}
              disabled={disabled}
            />
          </div>

          {/* Selected executor info */}
          {selectedExecutor && (
            <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                {getName(selectedExecutor).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 dark:text-white">{getName(selectedExecutor)}</div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  {selectedExecutor.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{selectedExecutor.phone}</span>}
                  {selectedExecutor.country && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{selectedExecutor.country}</span>}
                  {!selectedExecutor.payable_account_id && (
                    <span className="text-amber-500 font-semibold">⚠️ {isAr ? 'بدون حساب محاسبي' : 'No account linked'}</span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "text-[9px]",
                selectedExecutor.type === 'agent' ? "text-blue-600 border-blue-300" : "text-purple-600 border-purple-300"
              )}>
                {selectedExecutor.type === 'agent' ? (isAr ? 'وكيل' : 'Agent') : (isAr ? 'شريك' : 'Partner')}
              </Badge>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <Label className="text-[11px] text-gray-500 mb-1 block">
              {isAr ? 'طريقة الدفع للطرف المنفذ' : 'Payment to executor'}
            </Label>
            <div className="flex gap-2">
              {([
                { key: 'cash' as const, labelAr: '💵 نقدي', labelEn: '💵 Cash' },
                { key: 'bank' as const, labelAr: '🏦 بنكي', labelEn: '🏦 Bank' },
                { key: 'wallet' as const, labelAr: '👛 محفظة', labelEn: '👛 Wallet' },
              ]).map(method => (
                <button
                  key={method.key}
                  onClick={() => !disabled && onChange({ ...value, payment_method: method.key })}
                  disabled={disabled}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                    value.payment_method === method.key
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {isAr ? method.labelAr : method.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Branch — select branch */}
      {value.channel === 'branch' && (
        <BranchSelector companyId={companyId} isAr={isAr} disabled={disabled} />
      )}

      {/* Direct Bank — select fund/bank */}
      {value.channel === 'direct_bank' && (
        <FundSelector companyId={companyId} fundType="bank" isAr={isAr} disabled={disabled} />
      )}

      {/* Wallet — select wallet fund */}
      {value.channel === 'wallet' && (
        <FundSelector companyId={companyId} fundType="wallet" isAr={isAr} disabled={disabled} />
      )}
    </div>
  );
}

// ─── Branch Selector ──────────────────────────────────────────
function BranchSelector({ companyId, isAr, disabled }: { companyId?: string; isAr: boolean; disabled: boolean }) {
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('branches')
        .select('id, name, name_ar, name_en, code, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  if (branches.length === 0) {
    return (
      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-600 text-center">
          {isAr ? '📌 لا يوجد فروع مسجلة — يمكنك إضافة الفروع من الإعدادات' : '📌 No branches registered — add branches in settings'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-[11px] text-gray-500 mb-1 block">
        {isAr ? 'اختر الفرع' : 'Select Branch'}
      </Label>
      <Select disabled={disabled}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={isAr ? 'اختر الفرع...' : 'Select branch...'} />
        </SelectTrigger>
        <SelectContent>
          {branches.map((b: any) => (
            <SelectItem key={b.id} value={b.id}>
              <div className="flex items-center gap-2">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium">{isAr ? (b.name_ar || b.name) : (b.name_en || b.name)}</span>
                {b.code && <span className="text-[9px] text-gray-400 font-mono">{b.code}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Fund Selector (Bank / Wallet) ────────────────────────────
function FundSelector({ companyId, fundType, isAr, disabled }: { companyId?: string; fundType: 'bank' | 'wallet'; isAr: boolean; disabled: boolean }) {
  const { data: funds = [] } = useQuery({
    queryKey: ['funds', companyId, fundType],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('funds')
        .select('id, name, name_en, fund_type, bank_name, iban, wallet_type, wallet_id, currency_code, is_active')
        .eq('company_id', companyId)
        .eq('fund_type', fundType)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const emptyLabel = fundType === 'bank'
    ? (isAr ? '🏦 لا يوجد حسابات بنكية — أضف صندوق بنكي من الإعدادات' : '🏦 No bank accounts — add a bank fund in settings')
    : (isAr ? '👛 لا يوجد محافظ مسجلة — أضف محفظة رقمية من الإعدادات' : '👛 No wallets registered — add a wallet in settings');

  if (funds.length === 0) {
    return (
      <div className={cn(
        "p-3 rounded-lg border",
        fundType === 'bank'
          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
      )}>
        <p className={cn("text-xs text-center", fundType === 'bank' ? "text-blue-600" : "text-purple-600")}>
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label className="text-[11px] text-gray-500 mb-1 block">
        {fundType === 'bank'
          ? (isAr ? 'اختر الصندوق / البنك' : 'Select Bank / Fund')
          : (isAr ? 'اختر المحفظة' : 'Select Wallet')
        }
      </Label>
      <Select disabled={disabled}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={fundType === 'bank' ? (isAr ? 'اختر البنك...' : 'Select bank...') : (isAr ? 'اختر المحفظة...' : 'Select wallet...')} />
        </SelectTrigger>
        <SelectContent>
          {funds.map((f: any) => (
            <SelectItem key={f.id} value={f.id}>
              <div className="flex items-center gap-2">
                {fundType === 'bank' ? <Landmark className="w-3 h-3 text-blue-400" /> : <Wallet className="w-3 h-3 text-purple-400" />}
                <span className="text-xs font-medium">{isAr ? f.name : (f.name_en || f.name)}</span>
                {f.currency_code && <span className="text-[9px] text-gray-400 font-mono">{f.currency_code}</span>}
                {fundType === 'bank' && f.bank_name && <span className="text-[9px] text-gray-400">{f.bank_name}</span>}
                {fundType === 'wallet' && f.wallet_type && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 text-purple-500 border-purple-200">
                    {f.wallet_type}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

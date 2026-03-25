/**
 * ════════════════════════════════════════════════════════════════
 * 📝 RemittanceJournalTab — معاينة القيد المحاسبي الحي V6
 * ════════════════════════════════════════════════════════════════
 * 
 * القيد دائماً عبر حساب العميل — التحصيل منفصل بسند قبض
 * 
 * المسار ①: خطوتين
 *   الخطوة 1 (تأكيد): العميل ← حوالات مستحقة + إيرادات
 *   الخطوة 2 (تنفيذ): حوالات مستحقة + مصروف ← وكيل/فرع/بنك/محفظة
 * 
 * المسار ②: خطوة واحدة
 *   العميل ← وكيل/فرع/بنك/محفظة + إيرادات (صافي)
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { Remittance } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen, ArrowRight, ArrowLeft, CheckCircle2,
  Clock, AlertCircle, Hash, FileText, Info,
  ShieldCheck, Zap, ChevronDown, Loader2, ExternalLink,
} from 'lucide-react';
import { useExchangeAccountSettings, type ExchangeAccountMap } from '../../hooks/useExchangeAccountSettings';

// ─── Types ────────────────────────────────────────────────────
export interface JournalLine {
  account_id?: string;
  account_code: string;
  account_name_ar: string;
  account_name_en: string;
  debit: number;
  credit: number;
  currency?: string;
  description_ar?: string;
  description_en?: string;
}

type AcctInfo = { id: string; code: string; ar: string; en: string };

interface RemittanceJournalTabProps {
  remittance: Partial<Remittance>;
  mode: 'create' | 'view';
  /** حساب الصندوق/البنك الفعلي المختار في قناة التنفيذ */
  fundAccount?: { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** حساب الوكيل الفرعي */
  agentAccount?: { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** حساب الشريك الفرعي */
  partnerAccount?: { id: string; code: string; nameAr: string; nameEn: string } | null;
  /** Pre-loaded journal entry from parent (cached across tab switches) */
  loadedJournalEntry?: any;
  loadingJournalEntry?: boolean;
  /** callback لتصدير سطور القيد الحية */
  onLinesReady?: (lines: JournalLine[]) => void;
}

// ─── Fallback Accounts ──────────────────────────────────────
const FALLBACK: Record<string, { code: string; ar: string; en: string }> = {
  customer_receivable:    { code: '???', ar: 'اختر العميل', en: 'Select Customer' },
  remittance_payable:     { code: '231', ar: 'حوالات مستحقة للتسليم', en: 'Remittance Payable' },
  commission_income:      { code: '432', ar: 'إيرادات عمولات حوالات', en: 'Remittance Commission Income' },
  agents_payable:         { code: '???', ar: 'اختر الوكيل/الشريك', en: 'Select Agent/Partner' },
  coverage_expense:       { code: '543', ar: 'مصروف عمولة تغطية', en: 'Coverage Commission Expense' },
};

function acct(settingsAcct: ExchangeAccountMap[keyof ExchangeAccountMap], fallbackKey: string) {
  if (settingsAcct) return { id: settingsAcct.id, code: settingsAcct.code, ar: settingsAcct.nameAr, en: settingsAcct.nameEn };
  const fb = FALLBACK[fallbackKey];
  return fb ? { id: '', code: fb.code, ar: fb.ar, en: fb.en } : { id: '', code: '???', ar: '—', en: '—' };
}

/** Fetch account details from chart_of_accounts by account ID */
async function fetchAccountById(accountId: string): Promise<AcctInfo | null> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, name_ar, name_en')
    .eq('id', accountId)
    .single();
  if (error) {
    console.error('[fetchAccountById] Error:', error.message, 'for accountId:', accountId);
    return null;
  }
  if (!data) return null;
  return { id: data.id, code: data.account_code || '', ar: data.name_ar || '', en: data.name_en || data.name_ar || '' };
}

// ─── Accordion Entry Component ──────────────────────────────
function AccordionEntry({ number, color, icon: Icon, title, summary, defaultOpen = false, children }: {
  number: number; color: string; icon: React.ElementType; title: string; summary: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer",
          `hover:bg-${color}-50/50 dark:hover:bg-${color}-950/20`,
          open ? `bg-${color}-50/30 dark:bg-${color}-950/10` : 'bg-white dark:bg-gray-900'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", `bg-${color}-100 dark:bg-${color}-900/40`)}>
            <span className={cn("text-[10px] font-bold", `text-${color}-700`)}>{number}</span>
          </div>
          <Icon className={cn("w-3.5 h-3.5", `text-${color}-600`)} />
          <span className={cn("text-xs font-bold", `text-${color}-700 dark:text-${color}-400`)}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 hidden sm:inline">{summary}</span>
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", open && 'rotate-180')} />
        </div>
      </button>
      {/* Collapsible Content */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        open ? 'max-h-[2000px] opacity-100 border-t border-gray-100 dark:border-gray-800' : 'max-h-0 opacity-0'
      )}>
        {children}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function RemittanceJournalTab({ remittance, mode, fundAccount, agentAccount, partnerAccount, cachedCustomerAcct, cachedExecutorAcct, loadedJournalEntry, loadingJournalEntry, onLinesReady }: RemittanceJournalTabProps & {
  cachedCustomerAcct?: { id: string; code: string; ar: string; en: string } | null;
  cachedExecutorAcct?: { id: string; code: string; ar: string; en: string } | null;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const isCreate = mode === 'create';
  const { companyId } = useCompany();

  const { accounts: settingsAccounts } = useExchangeAccountSettings();

  // Use pre-loaded entry from parent (no local fetching)
  const confirmEntry = loadedJournalEntry || null;
  const loadingEntries = loadingJournalEntry || false;

  // ─── Values ────────────────────────────────────────────────
  const sendAmount = Number(remittance.send_amount) || 0;
  const ourCommission = Number(remittance.our_commission) || 0;
  const agentCommission = Number(remittance.agent_commission) || 0;
  // Use calculated commission (our + agent) — NOT stored commission_amount which may be stale
  const commissionAmount = ourCommission + agentCommission || Number(remittance.commission_amount) || 0;
  const totalCustomerDebit = sendAmount + commissionAmount;
  const netRevenue = commissionAmount - agentCommission; // = ourCommission
  const sendCurrency = remittance.send_currency || 'USD';
  const isOutgoing = remittance.remittance_type === 'outgoing';

  // ─── Use CACHED customer account from parent (no DB fetch here) ──
  const customerAcct: AcctInfo = cachedCustomerAcct
    ? cachedCustomerAcct
    : { id: '', code: '???', ar: `اختر العميل — ${remittance.sender_name || ''}`, en: `Select Customer — ${remittance.sender_name || ''}` };

  // ─── Use CACHED executor account from parent (no DB fetch here) ──
  const realExecutorAcct: AcctInfo | null = cachedExecutorAcct || null;

  // ─── Resolve Accounts ──────────────────────────────────────
  const payableAcct = acct(settingsAccounts.remittance_payable, 'remittance_payable');
  const commissionAcct = acct(settingsAccounts.commission_income, 'commission_income');
  const coverageAcct: AcctInfo = { id: '', code: FALLBACK.coverage_expense.code, ar: FALLBACK.coverage_expense.ar, en: FALLBACK.coverage_expense.en };

  // Execution channel account (dynamic — prioritize real DB accounts)
  const executionAcct = useMemo(() => {
    const channel = remittance.execution_channel;
    if (channel === 'agent_partner') {
      // Use real fetched account first
      if (realExecutorAcct && realExecutorAcct.code !== '⚠️') return realExecutorAcct;
      // Fallback to prop accounts
      if (remittance.partner_id && partnerAccount) return { id: partnerAccount.id, code: partnerAccount.code, ar: partnerAccount.nameAr, en: partnerAccount.nameEn };
      if (agentAccount) return { id: agentAccount.id, code: agentAccount.code, ar: agentAccount.nameAr, en: agentAccount.nameEn };
      return realExecutorAcct || acct(settingsAccounts.agents_payable, 'agents_payable');
    }
    if (channel === 'branch' && fundAccount) return { id: fundAccount.id, code: fundAccount.code, ar: `صندوق الفرع — ${fundAccount.nameAr}`, en: `Branch Fund — ${fundAccount.nameEn}` };
    if (channel === 'direct_bank' && fundAccount) return { id: fundAccount.id, code: fundAccount.code, ar: `حساب البنك — ${fundAccount.nameAr}`, en: `Bank — ${fundAccount.nameEn}` };
    if (channel === 'wallet' && fundAccount) return { id: fundAccount.id, code: fundAccount.code, ar: `المحفظة — ${fundAccount.nameAr}`, en: `Wallet — ${fundAccount.nameEn}` };
    return { id: '', code: '???', ar: 'اختر قناة التنفيذ', en: 'Select execution channel' };
  }, [remittance.execution_channel, remittance.partner_id, realExecutorAcct, agentAccount, partnerAccount, fundAccount, settingsAccounts]);

  // Channel label
  const channelLabel = useMemo(() => {
    const ch = remittance.execution_channel;
    if (ch === 'agent_partner') return isAr ? 'وكيل/شريك' : 'Agent/Partner';
    if (ch === 'branch') return isAr ? 'فرع' : 'Branch';
    if (ch === 'direct_bank') return isAr ? 'بنكي مباشر' : 'Direct Bank';
    if (ch === 'wallet') return isAr ? 'محفظة' : 'Wallet';
    return '';
  }, [remittance.execution_channel, isAr]);

  // Has coverage fee (only for agent/partner)
  const hasCoverage = agentCommission > 0;

  // ─── PATH 1: Confirm Only (خطوتين) ─────────────────────────
  const path1Step1 = useMemo((): JournalLine[] => {
    if (sendAmount <= 0 || !isOutgoing) return [];
    const lines: JournalLine[] = [];

    // مدين: حساب العميل (إجمالي ما يدفعه = مبلغ + كل العمولات)
    lines.push({
      account_code: customerAcct.code,
      account_name_ar: customerAcct.ar,
      account_name_en: customerAcct.en,
      debit: totalCustomerDebit,
      credit: 0,
      currency: sendCurrency,
      description_ar: 'ذمة العميل — مبلغ الحوالة + العمولة',
      description_en: 'Customer receivable — remittance + commission',
    });

    // دائن: حوالات مستحقة (الإجمالي الكامل — بدون إيرادات حتى التنفيذ)
    lines.push({
      account_id: payableAcct.id || undefined,
      account_code: payableAcct.code,
      account_name_ar: payableAcct.ar,
      account_name_en: payableAcct.en,
      debit: 0,
      credit: totalCustomerDebit,
      currency: sendCurrency,
      description_ar: 'حوالات مستحقة للتسليم (مبلغ + عمولة)',
      description_en: 'Remittance payable (amount + commission)',
    });

    return lines;
  }, [sendAmount, totalCustomerDebit, customerAcct, payableAcct, isOutgoing, sendCurrency]);

  const path1Step2 = useMemo((): JournalLine[] => {
    if (sendAmount <= 0 || !isOutgoing) return [];
    const lines: JournalLine[] = [];
    const agentTotal = sendAmount + agentCommission;
    const revenue = hasCoverage ? netRevenue : commissionAmount; // صافي الربح

    // مدين: حوالات مستحقة (إقفال الالتزام الكامل)
    lines.push({
      account_id: payableAcct.id || undefined,
      account_code: payableAcct.code,
      account_name_ar: payableAcct.ar,
      account_name_en: payableAcct.en,
      debit: totalCustomerDebit,
      credit: 0,
      currency: sendCurrency,
      description_ar: 'إقفال حوالات مستحقة (مبلغ + عمولة)',
      description_en: 'Close remittance payable (amount + commission)',
    });

    // دائن: حساب الوكيل/الشريك (المبلغ + عمولة التغطية)
    lines.push({
      account_id: executionAcct.id || undefined,
      account_code: executionAcct.code,
      account_name_ar: executionAcct.ar,
      account_name_en: executionAcct.en,
      debit: 0,
      credit: hasCoverage ? agentTotal : sendAmount,
      currency: sendCurrency,
      description_ar: `تنفيذ عبر ${channelLabel}`,
      description_en: `Execution via ${channelLabel}`,
    });

    // دائن: إيرادات عمولات (صافي الربح — يُعترف به عند التنفيذ فقط)
    if (revenue > 0) {
      lines.push({
        account_id: commissionAcct.id || undefined,
        account_code: commissionAcct.code,
        account_name_ar: commissionAcct.ar,
        account_name_en: commissionAcct.en,
        debit: 0,
        credit: revenue,
        currency: sendCurrency,
        description_ar: hasCoverage ? 'إيرادات عمولات (صافي بعد التغطية)' : 'إيرادات عمولات حوالات',
        description_en: hasCoverage ? 'Commission income (net after coverage)' : 'Remittance commission income',
      });
    }

    return lines;
  }, [sendAmount, totalCustomerDebit, agentCommission, commissionAmount, netRevenue, hasCoverage, payableAcct, executionAcct, commissionAcct, channelLabel, isOutgoing, sendCurrency]);

  // ─── PATH 2: Confirm + Execute (خطوة واحدة) ────────────────
  const path2Lines = useMemo((): JournalLine[] => {
    if (sendAmount <= 0 || !isOutgoing) return [];
    const lines: JournalLine[] = [];
    const channelCredit = sendAmount + agentCommission; // ما يحصل عليه الطرف المنفّذ
    const revenue = hasCoverage ? netRevenue : commissionAmount; // صافي أو إجمالي

    // مدين: حساب العميل
    lines.push({
      account_code: customerAcct.code,
      account_name_ar: customerAcct.ar,
      account_name_en: customerAcct.en,
      debit: totalCustomerDebit,
      credit: 0,
      currency: sendCurrency,
      description_ar: 'ذمة العميل — مبلغ الحوالة + العمولة',
      description_en: 'Customer receivable — remittance + commission',
    });

    // دائن: حساب القناة (المبلغ + رسوم/عمولة)
    lines.push({
      account_id: executionAcct.id || undefined,
      account_code: executionAcct.code,
      account_name_ar: executionAcct.ar,
      account_name_en: executionAcct.en,
      debit: 0,
      credit: hasCoverage ? channelCredit : sendAmount,
      currency: sendCurrency,
      description_ar: `تسليم + ${hasCoverage ? 'عمولة' : ''} عبر ${channelLabel}`,
      description_en: `Delivery ${hasCoverage ? '+ fee' : ''} via ${channelLabel}`,
    });

    // دائن: إيرادات عمولات (صافي أو إجمالي)
    if (revenue > 0) {
      lines.push({
        account_id: commissionAcct.id || undefined,
        account_code: commissionAcct.code,
        account_name_ar: commissionAcct.ar,
        account_name_en: commissionAcct.en,
        debit: 0,
        credit: revenue,
        currency: sendCurrency,
        description_ar: hasCoverage ? 'إيرادات عمولات (صافي بعد التغطية)' : 'إيرادات عمولات حوالات',
        description_en: hasCoverage ? 'Commission income (net after coverage)' : 'Remittance commission income',
      });
    }

    return lines;
  }, [sendAmount, totalCustomerDebit, commissionAmount, agentCommission, netRevenue, hasCoverage, customerAcct, executionAcct, commissionAcct, channelLabel, isOutgoing, sendCurrency]);

  // ─── Notify parent ─────────────────────────────────────────
  useEffect(() => {
    onLinesReady?.(path2Lines.length > 0 ? path2Lines : path1Step1);
  }, [path1Step1, path2Lines, onLinesReady]);

  // ─── Format Number ────────────────────────────────────────
  const fmt = (n: number) => n > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '—';

  // ─── Render a journal table ────────────────────────────────
  function JournalTable({ lines, pathLabel, pathIcon: PathIcon, color, stepLabel }: {
    lines: JournalLine[]; pathLabel: string; pathIcon: React.ElementType; color: string; stepLabel?: string;
  }) {
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (lines.length === 0) return null;

    return (
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Path Header */}
        <div className={cn("flex items-center justify-between px-4 py-2.5 border-b bg-gray-50/80 dark:bg-gray-800/50")}>
          <div className="flex items-center gap-2">
            <PathIcon className={cn("w-4 h-4", `text-${color}-600`)} />
            <span className={cn("text-xs font-bold", `text-${color}-700 dark:text-${color}-400`)}>{pathLabel}</span>
            {stepLabel && <span className="text-[9px] text-gray-400">{stepLabel}</span>}
          </div>
          <Badge className={cn("text-[9px]", isBalanced ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
            {isBalanced ? (isAr ? '✅ متوازن' : '✅ Balanced') : (isAr ? `⚠️ فرق ${fmt(Math.abs(totalDebit - totalCredit))}` : `⚠️ Diff ${fmt(Math.abs(totalDebit - totalCredit))}`)}
          </Badge>
        </div>

        {/* Entry Description */}
        <div className="px-4 py-2 bg-gray-50/30 dark:bg-gray-800/30 border-b flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isAr
              ? `حوالة ${isOutgoing ? 'صادرة' : 'واردة'} — ${remittance.sender_name || 'المرسل'} ← ${remittance.receiver_name || 'المستقبل'}`
              : `${isOutgoing ? 'Outgoing' : 'Incoming'} — ${remittance.sender_name || 'Sender'} → ${remittance.receiver_name || 'Receiver'}`}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs" dir={isAr ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-gray-100/80 dark:bg-gray-800/80">
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400 w-14">{isAr ? 'رقم' : '#'}</th>
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400">{isAr ? 'الحساب' : 'Account'}</th>
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400">{isAr ? 'البيان' : 'Description'}</th>
                <th className="px-3 py-2 text-end font-semibold text-gray-600 dark:text-gray-400 w-24">{isAr ? 'مدين' : 'Debit'}</th>
                <th className="px-3 py-2 text-end font-semibold text-gray-600 dark:text-gray-400 w-24">{isAr ? 'دائن' : 'Credit'}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className={cn(
                  "border-t border-gray-100 dark:border-gray-800 transition-colors",
                  "hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
                  line.debit > 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-900/50"
                )}>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600">{line.account_code}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {line.debit > 0 ? (
                        <ArrowRight className="w-3 h-3 text-red-400 shrink-0" />
                      ) : (
                        <ArrowLeft className="w-3 h-3 text-green-400 shrink-0 ms-3" />
                      )}
                      <span className={cn("font-medium", line.debit > 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300")}>
                        {isAr ? line.account_name_ar : line.account_name_en}
                      </span>
                      {line.currency && (
                        <span className="text-[8px] font-mono px-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-500">{line.currency}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-[10px]">{isAr ? line.description_ar : line.description_en}</td>
                  <td className="px-3 py-2 text-end font-mono font-semibold">
                    <span className={line.debit > 0 ? "text-red-600 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}>{fmt(line.debit)}</span>
                  </td>
                  <td className="px-3 py-2 text-end font-mono font-semibold">
                    <span className={line.credit > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600"}>{fmt(line.credit)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100/80 dark:bg-gray-800/80">
                <td colSpan={3} className="px-3 py-2 text-end font-bold text-gray-700 dark:text-gray-300">{isAr ? 'المجموع' : 'Total'}</td>
                <td className="px-3 py-2 text-end font-mono font-bold text-red-700 dark:text-red-400">{fmt(totalDebit)}</td>
                <td className="px-3 py-2 text-end font-mono font-bold text-green-700 dark:text-green-400">{fmt(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 space-y-4">

      {/* ─── Status Header ────────────────────────────────── */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={cn(
          "flex items-center justify-between px-4 py-3",
          isCreate ? "bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/50"
            : remittance.journal_entry_id ? "bg-green-50/50 dark:bg-green-950/20 border-b border-green-200/50"
            : "bg-gray-50 dark:bg-gray-800 border-b"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
              isCreate ? "bg-amber-100 dark:bg-amber-900/40" : "bg-green-100 dark:bg-green-900/40"
            )}>
              <BookOpen className={cn("w-4.5 h-4.5", isCreate ? "text-amber-600" : "text-green-600")} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {isCreate ? (isAr ? 'معاينة القيد المحاسبي' : 'Journal Entry Preview') : (isAr ? 'القيد المحاسبي' : 'Journal Entry')}
              </h4>
              <p className="text-[10px] text-gray-500">
                {isCreate
                  ? (isAr ? '⚡ القيد يتزامن مباشرة — دائماً عبر حساب العميل' : '⚡ Live sync — always through customer account')
                  : remittance.journal_entry_id ? (isAr ? 'القيد مرحّل' : 'Posted') : (isAr ? 'بانتظار' : 'Pending')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCreate ? (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 me-1" /> {isAr ? 'معاينة حية' : 'Live'}
              </Badge>
            ) : remittance.journal_entry_id ? (
              <>
                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 me-1" /> {isAr ? 'مرحّل' : 'Posted'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  <Hash className="w-3 h-3 me-0.5" /> {confirmEntry?.entry_number || remittance.journal_entry_id?.substring(0, 8)}
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-[11px] text-gray-600 dark:text-gray-300">
                <AlertCircle className="w-3 h-3 me-1" /> {isAr ? 'بانتظار' : 'Pending'}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* ─── REAL POSTED ENTRY (view mode) ─────────────── */}
      {!isCreate && loadingEntries && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {!isCreate && !loadingEntries && confirmEntry && (
        <PostedEntryCard
          entry={confirmEntry}
          title={
            // Dynamic title: if status is pending → confirmation, otherwise → confirmation+execution
            remittance.status === 'pending'
              ? (isAr ? 'قيد التأكيد' : 'Confirmation Entry')
              : (isAr ? 'قيد الحوالة' : 'Remittance Entry')
          }
          icon={remittance.status === 'pending' ? ShieldCheck : Zap}
          color={remittance.status === 'pending' ? 'blue' : 'emerald'}
          isAr={isAr}
          fmt={fmt}
        />
      )}

      {/* Step 2 PREVIEW: shown when confirmed (pending) but not yet executed */}
      {!isCreate && !loadingEntries && remittance.journal_entry_id && remittance.status === 'pending' && (
        <Card className="border-amber-200/50 dark:border-amber-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {isAr ? 'الخطوة 2: استعراض قيد التنفيذ — بانتظار التنفيذ' : 'Step 2: Execution Preview — Awaiting Execution'}
              </span>
            </div>
            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
              <Clock className="w-3 h-3 me-1" /> {isAr ? '⏳ بانتظار' : '⏳ Pending'}
            </Badge>
          </div>
          <div className="p-3">
            <JournalTable
              lines={path1Step2}
              pathLabel={isAr ? `التنفيذ — إقفال الالتزام ← ${channelLabel || 'قناة التنفيذ'}` : `Execute — Close payable → ${channelLabel || 'Channel'}`}
              pathIcon={Zap}
              color="amber"
              stepLabel={isAr ? '(عند التنفيذ سيتم تحديث القيد)' : '(entry will be updated on execute)'}
            />
          </div>
        </Card>
      )}

      {/* No entries yet */}
      {!isCreate && !loadingEntries && !confirmEntry && (
        <Card className="border-dashed border-gray-300 dark:border-gray-700">
          <CardContent className="flex items-center justify-center py-8 gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">
              {isAr ? 'لا يوجد قيود محاسبية بعد' : 'No journal entries yet'}
            </span>
          </CardContent>
        </Card>
      )}

      {/* ─── PREVIEW: PATH 1 — Two Steps — Accordion ─────────── */}
      {isCreate && path1Step1.length > 0 && (
        <AccordionEntry
          number={1}
          color="blue"
          icon={ShieldCheck}
          title={isAr ? 'تأكيد الحوالة — خطوتين' : 'Confirm — Two Steps'}
          summary={isAr
            ? `${customerAcct.code !== '???' ? customerAcct.code : '—'} ← ${payableAcct.code} ← ${executionAcct.code} | ${fmt(totalCustomerDebit)} ${sendCurrency}`
            : `${customerAcct.code !== '???' ? customerAcct.code : '—'} ← ${payableAcct.code} ← ${executionAcct.code} | ${fmt(totalCustomerDebit)} ${sendCurrency}`}
          defaultOpen={false}
        >
          <div className="space-y-3 p-3 pt-0">
            <JournalTable
              lines={path1Step1}
              pathLabel={isAr ? 'الخطوة 1: التأكيد — حساب العميل ← حوالات مستحقة + إيرادات' : 'Step 1: Confirm — Customer ← Payable + Revenue'}
              pathIcon={ShieldCheck}
              color="blue"
              stepLabel={isAr ? '(عند التأكيد)' : '(on confirm)'}
            />
            {path1Step2.length > 0 && (
              <JournalTable
                lines={path1Step2}
                pathLabel={isAr ? `الخطوة 2: التنفيذ — إقفال الالتزام ← ${channelLabel}` : `Step 2: Execute — Close payable ← ${channelLabel}`}
                pathIcon={Zap}
                color="blue"
                stepLabel={isAr ? '(عند التنفيذ لاحقاً)' : '(on execute later)'}
              />
            )}
          </div>
        </AccordionEntry>
      )}

      {/* ─── PREVIEW: PATH 2 — One Step — Accordion ───────────── */}
      {isCreate && path2Lines.length > 0 && (
        <AccordionEntry
          number={2}
          color="emerald"
          icon={Zap}
          title={isAr ? 'تأكيد + تنفيذ مباشر — خطوة واحدة' : 'Confirm + Execute — One Step'}
          summary={isAr
            ? `${customerAcct.code !== '???' ? customerAcct.code : '—'} ← ${executionAcct.code} + ${commissionAcct.code} | ${fmt(totalCustomerDebit)} ${sendCurrency}`
            : `${customerAcct.code !== '???' ? customerAcct.code : '—'} ← ${executionAcct.code} + ${commissionAcct.code} | ${fmt(totalCustomerDebit)} ${sendCurrency}`}
          defaultOpen={true}
        >
          <div className="p-3 pt-0">
            <JournalTable
              lines={path2Lines}
              pathLabel={isAr ? `قيد مباشر — حساب العميل ← ${channelLabel} + إيرادات` : `Direct — Customer ← ${channelLabel} + Revenue`}
              pathIcon={Zap}
              color="emerald"
            />
          </div>
        </AccordionEntry>
      )}
    </div>
  );
}

// ═══ Posted Entry Card — shows real DB entry ═══
function PostedEntryCard({ entry, title, icon: Icon, color, isAr, fmt }: {
  entry: any; title: string; icon: React.ElementType; color: string; isAr: boolean; fmt: (n: number) => string;
}) {
  const [open, setOpen] = useState(true);
  const isPosted = entry.status === 'posted' || entry.is_posted;
  const lines = entry.lines || [];
  const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0);

  return (
    <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 transition-colors cursor-pointer",
          isPosted ? "bg-green-50/50 dark:bg-green-950/20" : "bg-amber-50/50 dark:bg-amber-950/20"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
            isPosted ? "bg-green-100 dark:bg-green-900/40" : "bg-amber-100 dark:bg-amber-900/40"
          )}>
            <Icon className={cn("w-4 h-4", isPosted ? "text-green-600" : "text-amber-600")} />
          </div>
          <div className="text-start">
            <span className={cn("text-xs font-bold", `text-${color}-700 dark:text-${color}-400`)}>{title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-gray-500">{entry.entry_number}</span>
              <Badge className={cn("text-[9px]",
                isPosted ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"
              )}>
                {isPosted ? (isAr ? '✅ مرحّل' : '✅ Posted') : (isAr ? '⏳ مسودة' : '⏳ Draft')}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-gray-700 dark:text-gray-300">{fmt(totalDebit)}</span>
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", open && 'rotate-180')} />
        </div>
      </button>

      {/* Lines Table */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        open ? 'max-h-[2000px] opacity-100 border-t border-gray-100 dark:border-gray-800' : 'max-h-0 opacity-0'
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" dir={isAr ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-gray-100/80 dark:bg-gray-800/80">
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400 w-14">{isAr ? 'رقم' : '#'}</th>
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400">{isAr ? 'الحساب' : 'Account'}</th>
                <th className="px-3 py-2 text-start font-semibold text-gray-600 dark:text-gray-400">{isAr ? 'البيان' : 'Description'}</th>
                <th className="px-3 py-2 text-end font-semibold text-gray-600 dark:text-gray-400 w-24">{isAr ? 'مدين' : 'Debit'}</th>
                <th className="px-3 py-2 text-end font-semibold text-gray-600 dark:text-gray-400 w-24">{isAr ? 'دائن' : 'Credit'}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => {
                const debit = Number(line.debit || 0);
                const credit = Number(line.credit || 0);
                const acctCode = line.account?.account_code || '';
                const acctName = isAr ? (line.account?.name_ar || '') : (line.account?.name_en || line.account?.name_ar || '');
                return (
                  <tr key={line.id || idx} className={cn(
                    "border-t border-gray-100 dark:border-gray-800 transition-colors",
                    "hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
                    debit > 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-900/50"
                  )}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600">{acctCode}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {debit > 0 ? (
                          <ArrowRight className="w-3 h-3 text-red-400 shrink-0" />
                        ) : (
                          <ArrowLeft className="w-3 h-3 text-green-400 shrink-0 ms-3" />
                        )}
                        <span className={cn("font-medium", debit > 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300")}>
                          {acctName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-[10px]">{line.description || ''}</td>
                    <td className="px-3 py-2 text-end font-mono font-semibold">
                      <span className={debit > 0 ? "text-red-600 dark:text-red-400" : "text-gray-300 dark:text-gray-600"}>{fmt(debit)}</span>
                    </td>
                    <td className="px-3 py-2 text-end font-mono font-semibold">
                      <span className={credit > 0 ? "text-green-600 dark:text-green-400" : "text-gray-300 dark:text-gray-600"}>{fmt(credit)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100/80 dark:bg-gray-800/80">
                <td colSpan={3} className="px-3 py-2 text-end font-bold text-gray-700 dark:text-gray-300">{isAr ? 'المجموع' : 'Total'}</td>
                <td className="px-3 py-2 text-end font-mono font-bold text-red-700 dark:text-red-400">{fmt(totalDebit)}</td>
                <td className="px-3 py-2 text-end font-mono font-bold text-green-700 dark:text-green-400">{fmt(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  );
}

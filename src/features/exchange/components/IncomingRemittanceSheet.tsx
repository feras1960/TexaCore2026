/**
 * ════════════════════════════════════════════════════════════════
 * 📥 IncomingRemittanceSheet — شيت الحوالات الواردة
 * ════════════════════════════════════════════════════════════════
 *
 * ملف منفصل تماماً عن RemittanceDetailSheet (الصادرة)
 *
 * المسار: مسودة → تأكيد الاستلام → التسليم → مكتملة
 * القيد ①: وكيل (مدين) → عميل/232 (دائن)
 * القيد ②: عميل/232 (مدين) → صندوق + عمولة (دائن)
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowDownLeft, ChevronLeft, ChevronRight,
  MapPin, Landmark, Wallet, Globe, Clock, Printer, RotateCcw,
  Paperclip, ScanLine, QrCode, CheckCircle2, Save, Loader2, Banknote,
  XCircle, Send, PackageCheck, AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Remittance } from '../types';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useExchangeAccountSettings } from '../hooks/useExchangeAccountSettings';
import { remittanceJournalService } from '../services/remittanceJournalService';
import { remittanceService } from '../services/remittanceService';
import { toast } from 'sonner';
import { telegramNotify } from '@/services/telegramNotificationService';
import IncomingOverviewTab from './remittance-tabs/IncomingOverviewTab';
import RemittanceJournalTab, { type JournalLine } from './remittance-tabs/RemittanceJournalTab';
import RemittanceTimelineTab from './remittance-tabs/RemittanceTimelineTab';
import RemittanceAttachmentsTab from './remittance-tabs/RemittanceAttachmentsTab';

// ─── Status Steps for Incoming ────────────────────────────────
const INCOMING_STATUS_STEPS = [
  { key: 'draft', labelKey: 'exchange.incoming.status.draft' },
  { key: 'pending', labelKey: 'exchange.incoming.status.confirmed' },
  { key: 'delivered', labelKey: 'exchange.incoming.status.delivered' },
  { key: 'completed', labelKey: 'exchange.incoming.status.completed' },
];

// ─── Sub-Tabs ─────────────────────────────────────────────────
const SUB_TABS = [
  { id: 'overview', labelKey: 'exchange.remittances.tabs.overview', icon: ScanLine },
  { id: 'timeline', labelKey: 'exchange.remittances.tabs.timeline', icon: Clock },
  { id: 'attachments', labelKey: 'exchange.remittances.tabs.attachments', icon: Paperclip },
  { id: 'journal', labelKey: 'exchange.remittances.tabs.journal', icon: Landmark },
];

// ─── Tracking Code Generator ──────────────────────────────────
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TRK-${code}`;
}

// ─── Props ────────────────────────────────────────────────────
interface IncomingRemittanceSheetProps {
  remittanceId: string | null;
  open: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

// ═══════════════════════════════════════════════════════════════
export default function IncomingRemittanceSheet({
  remittanceId,
  open,
  onClose,
  onDataChange,
}: IncomingRemittanceSheetProps) {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const { companyId } = useCompany();
  const exchangeSettings = useExchangeAccountSettings();
  const { autoPost } = exchangeSettings;

  const [mode, setMode] = useState<'create' | 'view'>(remittanceId ? 'view' : 'create');
  const [trackingCode] = useState(() => generateTrackingCode());

  // Journal state
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const handleJournalLines = useCallback((lines: JournalLine[]) => setJournalLines(lines), []);
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  const [loadedJournalEntry, setLoadedJournalEntry] = useState<any>(null);
  const [loadingJournalEntry, setLoadingJournalEntry] = useState(false);

  // Form data
  const formDataRef = useRef<Partial<Remittance>>({});
  const handleFormChange = useCallback((data: Partial<Remittance>) => {
    formDataRef.current = data;
    // Resolve accounts
    resolveReceiverAccount(data.receiver_customer_id);
    resolveSourceAccount(data.agent_id, data.partner_id);
  }, []);

  // ─── Account Resolution Caches ──────────────────────────────
  type AcctCache = { id: string; code: string; ar: string; en: string };
  const [cachedReceiverAcct, setCachedReceiverAcct] = useState<AcctCache | null>(null);
  const [cachedSourceAcct, setCachedSourceAcct] = useState<AcctCache | null>(null);
  const lastReceiverIdRef = useRef<string | null>(null);
  const lastSourceIdRef = useRef<string | null>(null);

  // Resolve receiver (customer) account
  const resolveReceiverAccount = useCallback(async (customerId: string | undefined) => {
    if (!customerId) { setCachedReceiverAcct(null); lastReceiverIdRef.current = null; return; }
    if (customerId === lastReceiverIdRef.current) return;
    lastReceiverIdRef.current = customerId;
    const { data: customer } = await supabase.from('customers').select('id, name_ar, name_en, receivable_account_id').eq('id', customerId).single();
    if (!customer?.receivable_account_id) {
      setCachedReceiverAcct({ id: '', code: '⚠️', ar: `${customer?.name_ar || ''} — لا حساب`, en: `${customer?.name_en || ''} — no account` });
      return;
    }
    const { data: acct } = await supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en').eq('id', customer.receivable_account_id).single();
    if (acct) {
      setCachedReceiverAcct({ id: acct.id, code: acct.account_code, ar: `${acct.name_ar} — ${customer.name_ar || ''}`, en: `${acct.name_en || acct.name_ar} — ${customer.name_en || ''}` });
    }
  }, []);

  // Resolve source (agent/partner) account
  const resolveSourceAccount = useCallback(async (agentId: string | undefined, partnerId: string | undefined) => {
    const srcId = agentId || partnerId || null;
    if (!srcId) { setCachedSourceAcct(null); lastSourceIdRef.current = null; return; }
    if (srcId === lastSourceIdRef.current) return;
    lastSourceIdRef.current = srcId;
    let payableAccountId: string | null = null;
    let name = '';
    if (agentId) {
      const { data } = await supabase.from('exchange_agents').select('id, name_ar, name_en, payable_account_id').eq('id', agentId).single();
      payableAccountId = data?.payable_account_id || null;
      name = data?.name_ar || data?.name_en || '';
    } else if (partnerId) {
      const { data } = await supabase.from('exchange_partners').select('id, name_ar, name_en, payable_account_id').eq('id', partnerId).single();
      payableAccountId = data?.payable_account_id || null;
      name = data?.name_ar || data?.name_en || '';
    }
    if (!payableAccountId) {
      setCachedSourceAcct({ id: '', code: '⚠️', ar: `${name} — لا حساب`, en: `${name} — no account` });
      return;
    }
    const { data: acct } = await supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en').eq('id', payableAccountId).single();
    if (acct) {
      setCachedSourceAcct({ id: acct.id, code: acct.account_code, ar: `${acct.name_ar} — ${name}`, en: `${acct.name_en || acct.name_ar} — ${name}` });
    }
  }, []);

  // ─── Auto-Draft ─────────────────────────────────────────────
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const savingDraftRef = useRef(false);

  const buildDraftPayload = useCallback((data: Partial<Remittance>) => {
    const payload: Record<string, any> = {
      company_id: companyId!,
      remittance_number: `DRF-${trackingCode}`,
      remittance_type: 'incoming',
      remittance_date: new Date().toISOString(),
      status: 'draft',
      priority: data.priority || 'normal',
      tracking_code: trackingCode,
      sender_name: data.sender_name || '',
      receiver_name: data.receiver_name || '',
      send_currency: data.send_currency || 'USD',
      send_amount: Number(data.send_amount) || 0,
      receive_currency: data.receive_currency || 'USD',
      receive_amount: Number(data.receive_amount) || 0,
      exchange_rate: Number(data.exchange_rate) || 1,
      our_commission: Number(data.our_commission) || 0,
      commission_amount: Number(data.our_commission) || 0,
      delivery_method: 'agent',
      payment_method: data.payment_method || 'cash',
    };
    if (data.sender_phone) payload.sender_phone = data.sender_phone;
    if (data.sender_country) payload.sender_country = data.sender_country;
    if (data.receiver_customer_id) payload.receiver_customer_id = data.receiver_customer_id;
    if (data.receiver_phone) payload.receiver_phone = data.receiver_phone;
    if (data.receiver_country) payload.receiver_country = data.receiver_country;
    if (data.delivery_country) payload.delivery_country = data.delivery_country;
    if (data.delivery_city) payload.delivery_city = data.delivery_city;
    if (data.fund_id) payload.fund_id = data.fund_id;
    if (data.notes) payload.notes = data.notes;
    if (data.agent_id) payload.agent_id = data.agent_id;
    if (data.partner_id) payload.partner_id = data.partner_id;
    if (data.execution_channel) payload.execution_channel = data.execution_channel;
    return payload;
  }, [companyId, trackingCode]);

  const saveDraft = useCallback(async (data: Partial<Remittance>) => {
    if (!companyId || mode === 'view' || savingDraftRef.current) return;
    const hasData = data.sender_name || data.receiver_name || (data.send_amount && data.send_amount > 0);
    if (!hasData) return;
    savingDraftRef.current = true;
    try {
      const payload = buildDraftPayload(data);
      const currentId = draftIdRef.current;
      if (currentId) {
        await supabase.from('remittances').update(payload).eq('id', currentId);
      } else {
        const { data: saved, error } = await supabase.from('remittances').insert([payload]).select('id').single();
        if (saved) { draftIdRef.current = saved.id; setDraftId(saved.id); }
      }
      onDataChange?.();
    } catch (err: any) {
      console.error('[IncomingDraft] Error:', err?.message);
    } finally { savingDraftRef.current = false; }
  }, [companyId, mode, buildDraftPayload, onDataChange]);

  // ─── Load existing remittance ───────────────────────────────
  const [remittance, setRemittance] = useState<Partial<Remittance>>({
    remittance_type: 'incoming',
    status: 'draft',
    priority: 'normal',
    send_currency: 'USD',
    receive_currency: 'USD',
    delivery_method: 'agent',
    payment_method: 'cash',
  });

  useEffect(() => {
    if (!remittanceId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('remittances')
        .select('*')
        .eq('id', remittanceId)
        .single();
      if (data) {
        setRemittance(data);
        formDataRef.current = data;
        setMode('view');
        draftIdRef.current = data.id;
        setDraftId(data.id);
        // Resolve accounts
        resolveReceiverAccount(data.receiver_customer_id);
        resolveSourceAccount(data.agent_id, data.partner_id);
        // Load journal entry
        if (data.journal_entry_id) {
          setLoadingJournalEntry(true);
          const { data: je } = await supabase
            .from('journal_entries')
            .select('*, journal_entry_lines(*)')
            .eq('id', data.journal_entry_id)
            .single();
          setLoadedJournalEntry(je);
          setLoadingJournalEntry(false);
        }
      }
    };
    load();
  }, [remittanceId]);

  // ─── Current Status Step ────────────────────────────────────
  const currentStepIndex = useMemo(() => {
    const statusMap: Record<string, number> = { draft: 0, pending: 1, delivered: 2, completed: 3 };
    return statusMap[remittance.status || 'draft'] ?? 0;
  }, [remittance.status]);

  // ─── Close protection ───────────────────────────────────────
  const hasUnsavedData = useCallback(() => {
    if (mode !== 'create') return false;
    const d = formDataRef.current;
    return !!(d.sender_name || d.receiver_name || (d.send_amount && Number(d.send_amount) > 0));
  }, [mode]);

  if (!open) return null;

  // ─── Gradient ───────────────────────────────────────────────
  const getGradient = () => {
    if (remittance.status === 'cancelled') return 'from-red-600 to-rose-700';
    return 'from-teal-600 to-emerald-700';
  };

  // ─── Handle Confirm Receipt ─────────────────────────────────
  const handleConfirmReceipt = async () => {
    const data = formDataRef.current;
    if (!data.send_amount || data.send_amount <= 0) {
      toast.error(t('exchange.incoming.toast.missingAmount')); return;
    }
    if (!data.receiver_name && !data.receiver_customer_id) {
      toast.error(t('exchange.incoming.toast.missingReceiver')); return;
    }
    const srcId = data.agent_id || data.partner_id;
    if (!srcId) {
      toast.error(t('exchange.incoming.toast.missingSource')); return;
    }
    if (!cachedSourceAcct?.id) {
      toast.error(isAr ? 'لا يوجد حساب محاسبي مربوط بالوكيل/الشريك' : 'No account linked to agent/partner'); return;
    }

    // Determine receiver account: customer account OR 232 (payable)
    const { accounts } = exchangeSettings;
    let receiverAccountId = cachedReceiverAcct?.id;
    if (!receiverAccountId) {
      // Walk-in → use remittance_receivable (232)
      if (!accounts.remittance_receivable) {
        toast.error(isAr ? 'يجب إعداد حساب الحوالات الواردة (232)' : 'Incoming remittance payable account not configured'); return;
      }
      receiverAccountId = accounts.remittance_receivable.id;
    }

    if (!confirm(isAr
      ? `تأكيد استلام حوالة واردة بمبلغ ${data.send_amount} ${data.send_currency || 'USD'}؟\nسيتم إنشاء القيد المحاسبي الأول.`
      : `Confirm receipt of incoming remittance: ${data.send_amount} ${data.send_currency || 'USD'}?\nA journal entry will be created.`
    )) return;

    setSaving(true);
    try {
      const jeId = await remittanceJournalService.confirmIncomingRemittance({
        remittanceId: draftIdRef.current!,
        remittanceNumber: remittance.remittance_number || `DRF-${trackingCode}`,
        companyId: companyId!,
        sendAmount: Number(data.send_amount) || 0,
        currency: data.send_currency || 'USD',
        senderName: data.sender_name || '',
        receiverName: data.receiver_name || '',
        sourceAccountId: cachedSourceAcct.id,
        receiverAccountId,
        autoPost: autoPost.auto_post_remittance,
      });

      const newNumber = remittanceJournalService.getLastGeneratedNumber() || remittance.remittance_number;
      setRemittance(prev => ({
        ...prev,
        status: 'pending',
        remittance_number: newNumber,
        journal_entry_id: jeId,
      }));
      formDataRef.current = { ...formDataRef.current, status: 'pending', journal_entry_id: jeId };
      setJournalRefreshKey(k => k + 1);
      setMode('view');
      toast.success(t('exchange.incoming.toast.confirmSuccess'));
      onDataChange?.();

      // Telegram notification
      telegramNotify.remittanceStatusChange(companyId!, {
        remittanceNumber: newNumber || '',
        oldStatus: 'draft',
        newStatus: 'pending',
        senderName: data.sender_name,
        receiverName: data.receiver_name,
      }).catch(() => {});
    } catch (err: any) {
      toast.error(isAr ? 'فشل التأكيد' : 'Confirmation failed', { description: err.message });
    } finally { setSaving(false); }
  };

  // ─── Handle Deliver to Receiver ─────────────────────────────
  const handleDeliverToReceiver = async () => {
    const data = formDataRef.current;
    if (!data.fund_id) {
      toast.error(t('exchange.incoming.toast.missingFund')); return;
    }

    const { accounts } = exchangeSettings;
    if (!accounts.commission_income) {
      toast.error(isAr ? 'يجب إعداد حساب إيرادات العمولات' : 'Commission income account not configured'); return;
    }

    // Re-determine receiver account
    let receiverAccountId = cachedReceiverAcct?.id;
    if (!receiverAccountId) {
      if (!accounts.remittance_receivable) {
        toast.error(isAr ? 'يجب إعداد حساب الحوالات الواردة (232)' : 'Incoming remittance payable account not configured'); return;
      }
      receiverAccountId = accounts.remittance_receivable.id;
    }

    // Find fund account ID
    const { data: fund } = await supabase
      .from('funds')
      .select('id, account_id, name_ar, name_en')
      .eq('id', data.fund_id)
      .single();
    if (!fund?.account_id) {
      toast.error(isAr ? 'الصندوق المختار لا يملك حساب محاسبي' : 'Selected fund has no accounting account'); return;
    }

    const commissionAmt = Number(data.our_commission) || 0;
    const netPayment = (Number(data.send_amount) || 0) - commissionAmt;

    if (!confirm(isAr
      ? `تسليم الحوالة للمستقبل (${data.receiver_name})?\n\nالمبلغ الوارد: ${data.send_amount} ${data.send_currency || 'USD'}\nعمولتنا: ${commissionAmt}\nصافي التسليم: ${netPayment}\nالدفع من: ${isAr ? fund.name_ar : fund.name_en}`
      : `Deliver remittance to ${data.receiver_name}?\n\nIncoming: ${data.send_amount} ${data.send_currency || 'USD'}\nOur commission: ${commissionAmt}\nNet delivery: ${netPayment}\nPay from: ${fund.name_en || fund.name_ar}`
    )) return;

    setSaving(true);
    try {
      const jeId = await remittanceJournalService.deliverIncomingRemittance({
        remittanceId: draftIdRef.current || remittanceId!,
        remittanceNumber: remittance.remittance_number || '',
        companyId: companyId!,
        sendAmount: Number(data.send_amount) || 0,
        commissionAmount: commissionAmt,
        currency: data.send_currency || 'USD',
        receiverName: data.receiver_name || '',
        receiverAccountId,
        fundAccountId: fund.account_id,
        commissionIncomeId: accounts.commission_income.id,
        autoPost: autoPost.auto_post_remittance,
      });

      setRemittance(prev => ({ ...prev, status: 'delivered' }));
      formDataRef.current = { ...formDataRef.current, status: 'delivered' };
      setJournalRefreshKey(k => k + 1);
      toast.success(t('exchange.incoming.toast.deliverSuccess'));
      onDataChange?.();

      telegramNotify.remittanceStatusChange(companyId!, {
        remittanceNumber: remittance.remittance_number || '',
        oldStatus: 'pending',
        newStatus: 'delivered',
        senderName: data.sender_name,
        receiverName: data.receiver_name,
      }).catch(() => {});
    } catch (err: any) {
      toast.error(isAr ? 'فشل التسليم' : 'Delivery failed', { description: err.message });
    } finally { setSaving(false); }
  };

  // ─── Handle Complete ────────────────────────────────────────
  const handleComplete = async () => {
    const id = draftIdRef.current || remittanceId;
    if (!id) return;
    setSaving(true);
    try {
      await supabase.from('remittances').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
      setRemittance(prev => ({ ...prev, status: 'completed' }));
      toast.success(t('exchange.incoming.toast.completeSuccess'));
      onDataChange?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  // ─── Handle Cancel ──────────────────────────────────────────
  const handleCancel = async () => {
    const id = draftIdRef.current || remittanceId;
    if (!id) return;
    if (!confirm(isAr ? 'هل تريد إلغاء هذه الحوالة؟' : 'Cancel this remittance?')) return;
    setSaving(true);
    try {
      await supabase.from('remittances').update({ status: 'cancelled' }).eq('id', id);
      setRemittance(prev => ({ ...prev, status: 'cancelled' }));
      toast.success(t('exchange.incoming.toast.cancelSuccess'));
      onDataChange?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  // ─── Save Draft ─────────────────────────────────────────────
  const handleSaveDraftAndClose = async () => {
    setShowCloseDialog(false);
    setSaving(true);
    try {
      const payload = buildDraftPayload(formDataRef.current);
      if (draftIdRef.current) {
        await supabase.from('remittances').update(payload).eq('id', draftIdRef.current);
      } else {
        await supabase.from('remittances').insert([payload]).select('id').single();
      }
      onDataChange?.();
      toast.success(t('exchange.incoming.toast.saveDraftSuccess'));
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
    onClose();
  };

  // ─── Close Handlers ─────────────────────────────────────────
  const handleAttemptClose = () => {
    if (hasUnsavedData()) setShowCloseDialog(true);
    else onClose();
  };
  const handleDiscardClose = () => { setShowCloseDialog(false); onClose(); };
  const handleOpenChange = (o: boolean) => {
    if (!o && document.body.hasAttribute('data-sub-sheet-open')) return;
    if (!o) handleAttemptClose();
  };

  // ─── Render Tab Content ─────────────────────────────────────
  const renderTabContent = () => {
    const mergedRemittance = { ...remittance, ...formDataRef.current };
    switch (activeTab) {
      case 'overview':
        return <IncomingOverviewTab
          remittance={mergedRemittance}
          mode={mode}
          onFormChange={handleFormChange}
        />;
      case 'journal':
        return (
          <RemittanceJournalTab
            remittance={mergedRemittance}
            mode={mode}
            fundAccount={null}
            agentAccount={null}
            partnerAccount={null}
            cachedCustomerAcct={cachedReceiverAcct}
            cachedExecutorAcct={cachedSourceAcct}
            loadedJournalEntry={loadedJournalEntry}
            loadingJournalEntry={loadingJournalEntry}
            onLinesReady={handleJournalLines}
          />
        );
      case 'timeline':
        return <RemittanceTimelineTab remittance={remittance} mode={mode} />;
      case 'attachments':
        return <RemittanceAttachmentsTab remittance={remittance} mode={mode} />;
      default:
        return null;
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isAr ? 'left' : 'right'}
        className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[65vw] max-w-[1200px] p-0 border-0 [&>button]:hidden"
      >
        {/* ═══ HEADER ═══ */}
        <div className={cn("bg-gradient-to-r p-5", getGradient())}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white">
                  {remittance.remittance_number || t('exchange.incoming.newDraft')}
                </SheetTitle>
                <p className="text-sm text-white/70">
                  {t('exchange.incoming.title')}
                  {(remittance.delivery_city || remittance.delivery_country) && (
                    <> • <MapPin className="w-3 h-3 inline" /> {remittance.delivery_city}{remittance.delivery_country ? `, ${remittance.delivery_country}` : ''}</>
                  )}
                </p>
                <p className="text-xs text-white/50 font-mono mt-0.5 flex items-center gap-1">
                  <QrCode className="w-3 h-3" /> {trackingCode}
                </p>
              </div>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={handleAttemptClose}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <span className="text-lg font-bold text-white">{formatCurrency(remittance.send_amount || 0)}</span>
              <span className="text-[10px] text-white/60 ms-1.5">{remittance.send_currency || 'USD'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <span className="text-lg font-bold text-white">{formatCurrency((remittance.send_amount || 0) - (remittance.our_commission || 0))}</span>
              <span className="text-[10px] text-white/60 ms-1.5">{t('exchange.incoming.netDelivery')}</span>
            </div>
            {(remittance.our_commission || 0) > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                <span className="text-lg font-bold text-white">{formatCurrency(remittance.our_commission || 0)}</span>
                <span className="text-[10px] text-white/60 ms-1.5">{t('exchange.incoming.commission.ourCommission')}</span>
              </div>
            )}
          </div>

          {/* Status Progress Bar */}
          <div className="mt-4 flex items-center gap-1">
            {INCOMING_STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all",
                      isCompleted ? "bg-white border-white" : "bg-transparent border-white/30",
                      isCurrent && "ring-2 ring-white/40 ring-offset-1 ring-offset-transparent"
                    )}>
                      {isCompleted && i < currentStepIndex && (
                        <CheckCircle2 className="w-full h-full text-current" style={{ color: 'var(--tw-gradient-from)' }} />
                      )}
                    </div>
                    <span className={cn("text-[9px] whitespace-nowrap", isCompleted ? "text-white/90" : "text-white/40")}>
                      {t(step.labelKey)}
                    </span>
                  </div>
                  {i < INCOMING_STATUS_STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 rounded-full mt-[-12px]", i < currentStepIndex ? "bg-white/80" : "bg-white/20")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ═══ UNIFIED COMMAND BAR ═══ */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
          {/* ── Left: Primary Actions ── */}
          <div className="flex items-center gap-2">
            {/* Draft: Save + Confirm */}
            {remittance.status === 'draft' && draftIdRef.current && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                onClick={handleConfirmReceipt}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {t('exchange.incoming.confirmReceipt')}
              </Button>
            )}

            {/* Draft without ID - save first */}
            {remittance.status === 'draft' && !draftIdRef.current && (
              <Button
                size="sm"
                className="bg-gray-600 hover:bg-gray-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                onClick={async () => {
                  await saveDraft(formDataRef.current);
                  toast.success(t('exchange.incoming.toast.saveDraftSuccess'));
                }}
                disabled={saving}
              >
                <Save className="w-3.5 h-3.5" />
                {t('exchange.incoming.saveDraft')}
              </Button>
            )}

            {/* Confirmed: Deliver */}
            {remittance.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                  onClick={handleDeliverToReceiver}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                  {t('exchange.incoming.deliverToReceiver')}
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 h-8 text-xs font-semibold border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t('exchange.incoming.cancel')}
                </Button>
              </>
            )}

            {/* Delivered: Complete */}
            {remittance.status === 'delivered' && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {t('exchange.incoming.complete')}
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 h-8 text-xs font-semibold border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t('exchange.incoming.cancel')}
                </Button>
              </>
            )}
          </div>

          {/* ── Right: Utility Actions ── */}
          <div className="flex items-center gap-1">
            {/* Print */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white" title={isAr ? 'طباعة إيصال' : 'Print Receipt'}>
              <Printer className="w-4 h-4" />
            </Button>

            {/* QR Code Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  title={isAr ? 'رمز QR' : 'QR Code'}
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isAr ? 'رمز الحوالة' : 'Remittance QR'}
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <QRCodeSVG
                      value={remittance.remittance_number || `DRF-${trackingCode}`}
                      size={160}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {remittance.remittance_number || `DRF-${trackingCode}`}
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Return (view mode, not terminal statuses) */}
            {mode === 'view' && !['completed', 'cancelled', 'returned', 'draft'].includes(remittance.status || '') && (
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-amber-600 hover:bg-amber-50 gap-1"
                onClick={handleCancel}
                disabled={saving}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isAr ? 'إرجاع' : 'Return'}
              </Button>
            )}

            {/* Cancel (view mode, not terminal statuses) */}
            {mode === 'view' && !['completed', 'cancelled', 'returned', 'draft'].includes(remittance.status || '') && (
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-red-600 hover:bg-red-50 gap-1"
                onClick={handleCancel}
                disabled={saving}
              >
                <XCircle className="w-3.5 h-3.5" />
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            )}

            {/* Delete draft */}
            {remittance.status === 'draft' && draftIdRef.current && (
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                title={isAr ? 'حذف المسودة' : 'Delete Draft'}
                onClick={async () => {
                  if (!confirm(isAr ? 'هل تريد حذف المسودة؟' : 'Delete this draft?')) return;
                  try {
                    await supabase.from('remittances').delete().eq('id', draftIdRef.current!);
                    draftIdRef.current = null;
                    setDraftId(null);
                    onDataChange?.();
                    onClose();
                    toast.success(isAr ? 'تم حذف المسودة' : 'Draft deleted');
                  } catch { toast.error(isAr ? 'فشل الحذف' : 'Delete failed'); }
                }}
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <div className="flex px-2 gap-0.5 min-w-max">
              {SUB_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all whitespace-nowrap border-b-2",
                    activeTab === tab.id
                      ? "border-current text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: isAr ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isAr ? 10 : -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Close Confirmation Dialog */}
    <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isAr ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAr ? 'لديك بيانات غير محفوظة. هل تريد حفظها كمسودة أو تجاهلها؟' : 'You have unsaved data. Save as draft or discard?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDiscardClose}>
            {isAr ? 'تجاهل' : 'Discard'}
          </AlertDialogCancel>
          <Button onClick={handleSaveDraftAndClose} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
            {t('exchange.incoming.saveDraft')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

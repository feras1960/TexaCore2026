/**
 * ════════════════════════════════════════════════════════════════
 * 💸 RemittanceDetailSheet V2 — شيت الحوالات المتكامل
 * ════════════════════════════════════════════════════════════════
 * 
 * مبني بنفس هيكل PlatformDetailSheet بالضبط.
 * يدعم: إنشاء + عرض + تعديل الحوالات
 * 4 تبويبات: نظرة عامة | التتبع | المرفقات | القيد
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
  Send, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight,
  MapPin, Landmark, Wallet, Globe, Clock, History, FileText,
  Paperclip, ScanLine, QrCode, Printer, CheckCircle2, Save, Loader2, Banknote,
  ArrowRight, XCircle, RotateCcw, FastForward, AlertTriangle, Pencil,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Remittance } from '../types';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { useExchangeAccountSettings } from '../hooks/useExchangeAccountSettings';
import { remittanceJournalService } from '../services/remittanceJournalService';
import { remittanceService } from '../services/remittanceService';
import { customerPhoneService } from '../services/customerPhoneService';
import { toast } from 'sonner';
import { telegramNotify } from '@/services/telegramNotificationService';
import { remittanceLimitsService } from '../services/remittanceLimitsService';
import { remittanceNotificationService } from '../services/remittanceNotificationService';
import RemittanceOverviewTab from './remittance-tabs/RemittanceOverviewTab';
import RemittanceJournalTab, { type JournalLine } from './remittance-tabs/RemittanceJournalTab';
import RemittanceTimelineTab from './remittance-tabs/RemittanceTimelineTab';
import RemittanceAttachmentsTab from './remittance-tabs/RemittanceAttachmentsTab';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Trash2 } from 'lucide-react';

// ─── Status Steps ─────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'draft', labelAr: 'مسودة', labelEn: 'Draft' },
  { key: 'pending', labelAr: 'مؤكدة', labelEn: 'Confirmed' },
  { key: 'processing', labelAr: 'قيد التنفيذ', labelEn: 'Processing' },
  { key: 'sent', labelAr: 'تم التنفيذ', labelEn: 'Executed' },
  { key: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered' },
  { key: 'completed', labelAr: 'مكتملة', labelEn: 'Completed' },
];

// ─── Sub-Tabs (4 only) ───────────────────────────────────────
interface SubTab {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  ready: boolean;
}

const SUB_TABS: SubTab[] = [
  { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: ScanLine, ready: true },
  { id: 'timeline', labelAr: 'التتبع والحالة', labelEn: 'Timeline', icon: Clock, ready: true },
  { id: 'attachments', labelAr: 'المرفقات', labelEn: 'Attachments', icon: Paperclip, ready: true },
  { id: 'journal', labelAr: 'القيد المحاسبي', labelEn: 'Journal', icon: Landmark, ready: true },
];

// ─── Props ────────────────────────────────────────────────────
interface RemittanceDetailSheetProps {
  remittanceId: string | null;
  open: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

// ─── Tracking Code Generator ──────────────────────────────────
function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TRK-${code}`;
}

// ═══════════════════════════════════════════════════════════════
export default function RemittanceDetailSheet({
  remittanceId,
  open,
  onClose,
  onDataChange,
}: RemittanceDetailSheetProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const { companyId } = useCompany();
  const exchangeSettings = useExchangeAccountSettings();
  const { autoPost } = exchangeSettings;

  // Remittance default currency: USD/USD (exchange global standard)
  const defaultReceiveCurrency = 'USD';

  // Draft remittances should be editable
  const [mode, setMode] = useState<'create' | 'view'>(remittanceId ? 'view' : 'create');

  // Generate tracking code once for new remittances
  const [trackingCode] = useState(() => generateTrackingCode());

  // ─── Journal lines state (populated by RemittanceJournalTab) ─
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const handleJournalLines = useCallback((lines: JournalLine[]) => setJournalLines(lines), []);
  // Counter to force journal tab re-fetch after actions
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  // Pre-loaded journal entry (loaded at parent level, shared across tab switches)
  const [loadedJournalEntry, setLoadedJournalEntry] = useState<any>(null);
  const [loadingJournalEntry, setLoadingJournalEntry] = useState(false);

  // ─── Form data from OverviewTab ─────────────────────────────
  const formDataRef = useRef<Partial<Remittance>>({});
  const handleFormChange = useCallback((data: Partial<Remittance>) => {
    formDataRef.current = data;
  }, []);

  // ─── Cached Account Resolution (persists across tab switches) ──
  type AcctCache = { id: string; code: string; ar: string; en: string };
  const [cachedCustomerAcct, setCachedCustomerAcct] = useState<AcctCache | null>(null);
  const [cachedExecutorAcct, setCachedExecutorAcct] = useState<AcctCache | null>(null);
  const lastCustomerIdRef = useRef<string | null>(null);
  const lastExecutorIdRef = useRef<string | null>(null);

  // Fetch customer account when sender_customer_id changes
  const resolveCustomerAccount = useCallback(async (customerId: string | undefined) => {
    if (!customerId) { setCachedCustomerAcct(null); lastCustomerIdRef.current = null; return; }
    if (customerId === lastCustomerIdRef.current) return; // Already cached
    lastCustomerIdRef.current = customerId;
    const { data: customer } = await supabase.from('customers').select('id, name_ar, name_en, receivable_account_id').eq('id', customerId).single();
    if (!customer?.receivable_account_id) {
      setCachedExecutorAcct(null);
      setCachedCustomerAcct({ id: '', code: '⚠️', ar: `${customer?.name_ar || ''} — لا حساب`, en: `${customer?.name_en || ''} — no account` });
      return;
    }
    const { data: acct } = await supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en').eq('id', customer.receivable_account_id).single();
    if (acct) {
      setCachedCustomerAcct({ id: acct.id, code: acct.account_code, ar: `${acct.name_ar} — ${customer.name_ar || ''}`, en: `${acct.name_en || acct.name_ar} — ${customer.name_en || ''}` });
    }
  }, []);

  // Fetch executor (agent/partner) account when agent_id or partner_id changes
  const resolveExecutorAccount = useCallback(async (agentId: string | undefined, partnerId: string | undefined) => {
    const execId = agentId || partnerId || null;
    if (!execId) { setCachedExecutorAcct(null); lastExecutorIdRef.current = null; return; }
    if (execId === lastExecutorIdRef.current) return;
    lastExecutorIdRef.current = execId;
    let payableAccountId: string | null = null;
    let executorName = '';
    if (agentId) {
      const { data } = await supabase.from('exchange_agents').select('id, name_ar, name_en, payable_account_id').eq('id', agentId).single();
      payableAccountId = data?.payable_account_id || null;
      executorName = data?.name_ar || data?.name_en || '';
    } else if (partnerId) {
      const { data } = await supabase.from('exchange_partners').select('id, name_ar, name_en, payable_account_id').eq('id', partnerId).single();
      payableAccountId = data?.payable_account_id || null;
      executorName = data?.name_ar || data?.name_en || '';
    }
    if (!payableAccountId) {
      setCachedExecutorAcct({ id: '', code: '⚠️', ar: `${executorName} — لا حساب`, en: `${executorName} — no account` });
      return;
    }
    const { data: acct } = await supabase.from('chart_of_accounts').select('id, account_code, name_ar, name_en').eq('id', payableAccountId).single();
    if (acct) {
      setCachedExecutorAcct({ id: acct.id, code: acct.account_code, ar: `${acct.name_ar} — ${executorName}`, en: `${acct.name_en || acct.name_ar} — ${executorName}` });
    }
  }, []);

  // ─── Auto-Draft: real-time save as draft ───────────────────
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null); // Sync ref to prevent duplicate inserts
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingDraftRef = useRef(false);

  const buildDraftPayload = useCallback((data: Partial<Remittance>) => {
    const totalCommission = (Number(data.our_commission) || 0) + (Number(data.agent_commission) || 0);
    // Build payload — exclude null/undefined optional fields to avoid DB errors
    const payload: Record<string, any> = {
      company_id: companyId!,
      remittance_number: `DRF-${trackingCode}`,
      remittance_type: data.remittance_type || 'outgoing',
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
      commission_amount: totalCommission,
      our_commission: Number(data.our_commission) || 0,
      agent_commission: Number(data.agent_commission) || 0,
      commission_bearer: data.commission_bearer || 'sender',
      delivery_method: data.delivery_method || 'agent',
      payment_method: data.payment_method || 'cash',
    };
    // Only include optional fields if they have a value
    if (data.sender_customer_id) payload.sender_customer_id = data.sender_customer_id;
    if (data.sender_phone) payload.sender_phone = data.sender_phone;
    if (data.sender_country) payload.sender_country = data.sender_country;
    if (data.receiver_customer_id) payload.receiver_customer_id = data.receiver_customer_id;
    if (data.receiver_phone) payload.receiver_phone = data.receiver_phone;
    if (data.receiver_country) payload.receiver_country = data.receiver_country;
    if (data.delivery_country) payload.delivery_country = data.delivery_country;
    if (data.delivery_city) payload.delivery_city = data.delivery_city;
    if (data.fund_id) payload.fund_id = data.fund_id;
    if (data.notes) payload.notes = data.notes;
    // Execution channel fields
    if (data.agent_id) payload.agent_id = data.agent_id;
    if (data.partner_id) payload.partner_id = data.partner_id;
    if (data.execution_channel) payload.execution_channel = data.execution_channel;
    if (data.execution_payment_method) payload.execution_payment_method = data.execution_payment_method;
    return payload;
  }, [companyId, trackingCode]);

  // Core save function
  const saveDraft = useCallback(async (data: Partial<Remittance>) => {
    if (!companyId || mode === 'view' || savingDraftRef.current) return;
    const hasData = data.sender_name || data.receiver_name || (data.send_amount && data.send_amount > 0);
    if (!hasData) return;

    savingDraftRef.current = true;
    try {
      const payload = buildDraftPayload(data);
      const currentId = draftIdRef.current;

      if (currentId) {
        // Update existing draft
        const { error } = await supabase
          .from('remittances')
          .update(payload)
          .eq('id', currentId);
        if (error) console.error('[AutoDraft] Update error:', error.message);
      } else {
        // Create new draft
        const { data: saved, error } = await supabase
          .from('remittances')
          .insert([payload])
          .select('id')
          .single();
        if (error) {
          console.error('[AutoDraft] Insert error:', error.message, error.details, error.hint);
        } else if (saved) {
          draftIdRef.current = saved.id; // Sync ref immediately
          setDraftId(saved.id);
        }
      }
      onDataChange?.();
    } catch (err: any) {
      console.error('[AutoDraft] Exception:', err?.message);
    } finally {
      savingDraftRef.current = false;
    }
  }, [companyId, mode, buildDraftPayload, onDataChange]);

  // Form change handler: store to ref + resolve accounts (no auto-save)
  const handleFormChangeWithDraft = useCallback((data: Partial<Remittance>) => {
    formDataRef.current = data;

    // Resolve accounts when IDs change (cached — only fetches if ID actually changed)
    resolveCustomerAccount(data.sender_customer_id);
    resolveExecutorAccount(data.agent_id, data.partner_id);
  }, [resolveCustomerAccount, resolveExecutorAccount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  // ─── Fund account (from collection section) ─────────────────
  // TODO: will be populated when RemittanceOverviewTab passes collection_fund
  const [fundAccount, setFundAccount] = useState<{ id: string; code: string; nameAr: string; nameEn: string } | null>(null);

  // ─── Agent/Partner sub-accounts (from remittance data) ──────
  // TODO: will be populated from exchange_agents/exchange_partners when selected
  const [agentAccount, setAgentAccount] = useState<{ id: string; code: string; nameAr: string; nameEn: string } | null>(null);
  const [partnerAccount, setPartnerAccount] = useState<{ id: string; code: string; nameAr: string; nameEn: string } | null>(null);

  // ─── Save Remittance (create record + journal entry) ─────
  const handleSaveRemittance = useCallback(async (formData: Partial<Remittance>) => {
    if (!companyId) return;
    if (!formData.sender_name || !formData.receiver_name) {
      toast.error(isAr ? 'يجب تعبئة بيانات المرسل والمستقبل' : 'Sender and receiver info required');
      return;
    }

    setSaving(true);
    try {
      // ─── 1. Check limits ───────────────────────────────────
      const limitCheck = await remittanceLimitsService.checkLimits({
        companyId,
        senderCustomerId: formData.sender_customer_id || undefined,
        sendAmount: Number(formData.send_amount) || 0,
        sendCurrency: formData.send_currency || 'USD',
      });
      if (!limitCheck.allowed) {
        for (const v of limitCheck.violations) {
          toast.warning(isAr ? v.messageAr : v.messageEn, { duration: 6000 });
        }
        setSaving(false);
        return;
      }

      // ─── 2. Create remittance record ───────────────────────
      const totalCommission = (Number(formData.our_commission) || 0) + (Number(formData.agent_commission) || 0) + (Number(formData.network_fee) || 0);
      const totalPaid = (Number(formData.send_amount) || 0) + totalCommission;

      const savedRemittance = await remittanceService.createRemittance({
        company_id: companyId,
        remittance_type: formData.remittance_type || 'outgoing',
        remittance_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        priority: formData.priority || 'normal',
        tracking_code: trackingCode,
        // Sender
        sender_customer_id: formData.sender_customer_id || undefined,
        sender_name: formData.sender_name || '',
        sender_phone: formData.sender_phone || undefined,
        sender_country: formData.sender_country || undefined,
        sender_id_type: formData.sender_id_type || undefined,
        sender_id_number: formData.sender_id_number || undefined,
        // Receiver
        receiver_customer_id: formData.receiver_customer_id || undefined,
        receiver_name: formData.receiver_name || '',
        receiver_phone: formData.receiver_phone || undefined,
        receiver_country: formData.receiver_country || undefined,
        receiver_bank_name: formData.receiver_bank_name || undefined,
        receiver_bank_account: formData.receiver_bank_account || undefined,
        receiver_wallet: formData.receiver_wallet || undefined,
        // Amounts
        send_currency: formData.send_currency || 'USD',
        send_amount: Number(formData.send_amount) || 0,
        receive_currency: formData.receive_currency || 'USD',
        receive_amount: Number(formData.receive_amount) || 0,
        exchange_rate: Number(formData.exchange_rate) || 1,
        // Fees
        commission_amount: totalCommission,
        our_commission: Number(formData.our_commission) || 0,
        agent_commission: Number(formData.agent_commission) || 0,
        network_fee: Number(formData.network_fee) || 0,
        commission_bearer: formData.commission_bearer || 'sender',
        total_paid: totalPaid,
        // Delivery
        delivery_method: formData.delivery_method || 'agent',
        payment_method: formData.payment_method || 'cash',
        delivery_country: formData.delivery_country || undefined,
        delivery_city: formData.delivery_city || undefined,
        crypto_network: formData.crypto_network || undefined,
        // Fund
        fund_id: formData.fund_id || undefined,
        // KYC
        purpose: formData.purpose || undefined,
        notes: formData.notes || undefined,
      });

      toast.success(
        isAr
          ? `✅ تم حفظ الحوالة بنجاح — ${savedRemittance.remittance_number}`
          : `✅ Remittance saved — ${savedRemittance.remittance_number}`,
      );

      // ─── 3. Create journal entry if lines available ────────
      const lines = journalLines;
      if (lines.length >= 2) {
        try {
          await remittanceJournalService.createJournalEntry({
            remittanceId: savedRemittance.id,
            remittanceNumber: savedRemittance.remittance_number,
            companyId,
            entryDate: new Date().toISOString().split('T')[0],
            description: isAr
              ? `قيد حوالة ${formData.remittance_type === 'outgoing' ? 'صادرة' : 'واردة'} — ${formData.sender_name} → ${formData.receiver_name}`
              : `Remittance ${formData.remittance_type} — ${formData.sender_name} → ${formData.receiver_name}`,
            lines,
            autoPost: autoPost.auto_post_remittance,
          });
        } catch (journalErr) {
          console.warn('[Remittance] Journal entry failed (remittance saved):', journalErr);
        }
      }

      // ─── 4. Telegram notification ────────────────────────
      if (formData.remittance_type === 'outgoing') {
        telegramNotify.remittanceCreated(companyId, {
          remittanceNumber: savedRemittance.remittance_number,
          senderName: formData.sender_name || '',
          receiverName: formData.receiver_name || '',
          sendAmount: Number(formData.send_amount) || 0,
          sendCurrency: formData.send_currency || 'USD',
          receiveAmount: Number(formData.receive_amount) || undefined,
          receiveCurrency: formData.receive_currency || undefined,
          deliveryMethod: formData.delivery_method || 'branch',
          deliveryCountry: formData.delivery_country || undefined,
          commission: totalCommission || undefined,
          trackingCode,
        }).catch(() => {});
      } else {
        telegramNotify.remittanceIncoming(companyId, {
          remittanceNumber: savedRemittance.remittance_number,
          senderName: formData.sender_name || '',
          receiverName: formData.receiver_name || '',
          sendAmount: Number(formData.send_amount) || 0,
          sendCurrency: formData.send_currency || 'USD',
          receiveAmount: Number(formData.receive_amount) || 0,
          receiveCurrency: formData.receive_currency || 'USD',
        }).catch(() => {});
      }

      onDataChange?.();
      onClose();
    } catch (err: any) {
      console.error('[RemittanceDetailSheet] Save error:', err);
      toast.error(isAr ? 'فشل حفظ الحوالة' : 'Failed to save remittance', {
        description: err.message || '',
      });
    } finally {
      setSaving(false);
    }
  }, [companyId, autoPost, isAr, onDataChange, onClose, trackingCode]);

  // ─── Load remittance from DB when viewing ────────────────────
  const [remittance, setRemittance] = useState<Partial<Remittance>>({
    remittance_number: isAr ? 'مسودة جديدة' : 'New Draft',
    remittance_type: 'outgoing',
    status: 'pending',
    send_amount: 0,
    send_currency: 'USD',
    receive_currency: defaultReceiveCurrency,
    commission_amount: 0,
    priority: 'normal',
  });

  // ─── Helper: fetch journal entry by ID ───────────────────────
  const fetchJournalEntry = useCallback(async (jeId: string) => {
    setLoadingJournalEntry(true);
    try {
      const { data: je } = await supabase
        .from('journal_entries')
        .select('id, entry_number, status, is_posted, entry_date, description, total_debit, total_credit')
        .eq('id', jeId)
        .single();
      if (je) {
        const { data: lines } = await supabase
          .from('journal_entry_lines')
          .select('*, account:chart_of_accounts(id, account_code, name_ar, name_en)')
          .eq('entry_id', je.id)
          .order('line_number', { ascending: true });
        setLoadedJournalEntry({ ...je, lines: lines || [] });
      }
    } catch (err) {
      console.error('[RemittanceDetailSheet] Journal fetch error:', err);
    } finally {
      setLoadingJournalEntry(false);
    }
  }, []);

  useEffect(() => {
    if (open && remittanceId) {
      // Reset stale state
      setIsEditing(false);
      setSaving(false);
      setCachedCustomerAcct(null);
      setCachedExecutorAcct(null);
      setLoadedJournalEntry(null);
      lastCustomerIdRef.current = null;
      lastExecutorIdRef.current = null;

      remittanceService.getRemittance(remittanceId).then(data => {
        setRemittance(data);
        formDataRef.current = data;

        if (data.status === 'draft') {
          setMode('create');
          draftIdRef.current = data.id!;
          setDraftId(data.id!);
        } else {
          setMode('view');
        }

        // ═══ Load ALL related data in PARALLEL ═══
        const parallelTasks: Promise<any>[] = [];
        if (data.sender_customer_id) {
          parallelTasks.push(resolveCustomerAccount(data.sender_customer_id));
        }
        if (data.agent_id || data.partner_id) {
          parallelTasks.push(resolveExecutorAccount(data.agent_id, data.partner_id));
        }
        if (data.journal_entry_id && data.status !== 'draft') {
          parallelTasks.push(fetchJournalEntry(data.journal_entry_id));
        }
        if (parallelTasks.length > 0) {
          Promise.allSettled(parallelTasks).catch(() => {});
        }
      }).catch(err => {
        console.error('[RemittanceDetailSheet] Failed to load:', err);
        toast.error(isAr ? 'فشل تحميل بيانات الحوالة' : 'Failed to load remittance');
      });
    } else if (open && !remittanceId) {
      // Reset all state for new remittance
      setMode('create');
      setIsEditing(false);
      setSaving(false);
      setCachedCustomerAcct(null);
      setCachedExecutorAcct(null);
      setLoadedJournalEntry(null);
      setJournalRefreshKey(0);
      setActiveTab('overview');
      lastCustomerIdRef.current = null;
      lastExecutorIdRef.current = null;
      draftIdRef.current = null;
      setDraftId(null);
      formDataRef.current = {};
      setRemittance({
        remittance_number: isAr ? 'مسودة جديدة' : 'New Draft',
        remittance_type: 'outgoing',
        status: 'draft',
        send_amount: 0,
        send_currency: 'USD',
        receive_currency: defaultReceiveCurrency,
        commission_amount: 0,
        priority: 'normal',
      });
    }
  }, [open, remittanceId, isAr, defaultReceiveCurrency]);

  useEffect(() => {
    if (open) setActiveTab('overview');
  }, [remittanceId, open]);

  // ─── Re-fetch journal entry after actions (confirm/execute) ───
  useEffect(() => {
    if (journalRefreshKey === 0) return; // Skip initial mount
    const jeId = remittance.journal_entry_id;
    if (jeId && mode !== 'create') {
      fetchJournalEntry(jeId);
    }
  }, [journalRefreshKey]);

  // ─── Status Step Index (must be before any conditional return) ─
  const currentStepIndex = useMemo(() => {
    const idx = STATUS_STEPS.findIndex(s => s.key === remittance.status);
    return idx >= 0 ? idx : 0;
  }, [remittance.status]);

  // ─── Status Change Handler ──────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: Remittance['status']) => {
    if (!remittance.id) return;
    setSaving(true);
    try {
      const statusLabels: Record<string, { ar: string; en: string }> = {
        processing: { ar: 'قيد المعالجة', en: 'Processing' },
        sent: { ar: 'تم الإرسال', en: 'Sent' },
        delivered: { ar: 'تم التسليم', en: 'Delivered' },
        completed: { ar: 'مكتمل', en: 'Completed' },
        cancelled: { ar: 'ملغي', en: 'Cancelled' },
        returned: { ar: 'مُرتجع', en: 'Returned' },
      };
      const label = statusLabels[newStatus];
      await remittanceService.changeStatus(
        remittance.id,
        newStatus,
        isAr ? `تغيير الحالة إلى: ${label?.ar}` : `Status changed to: ${label?.en}`,
      );
      setRemittance(prev => ({ ...prev, status: newStatus }));
      toast.success(isAr ? `✅ تم تغيير الحالة إلى: ${label?.ar}` : `✅ Status changed to: ${label?.en}`);

      // ─── Send Telegram notification to employees ───
      const r = remittance;
      if (newStatus === 'delivered') {
        telegramNotify.remittanceDelivered(companyId!, {
          remittanceNumber: r.remittance_number || '',
          receiverName: r.receiver_name || '',
          receiveAmount: Number(r.receive_amount) || Number(r.send_amount) || 0,
          receiveCurrency: r.receive_currency || r.send_currency || 'USD',
        }).catch(() => {});
      } else if (newStatus === 'cancelled') {
        telegramNotify.remittanceCancelled(companyId!, {
          remittanceNumber: r.remittance_number || '',
          senderName: r.sender_name || '',
          sendAmount: Number(r.send_amount) || 0,
          sendCurrency: r.send_currency || 'USD',
        }).catch(() => {});
      } else {
        telegramNotify.remittanceStatusChange(companyId!, {
          remittanceNumber: r.remittance_number || '',
          oldStatus: r.status || '',
          newStatus,
          senderName: r.sender_name,
          receiverName: r.receiver_name,
        }).catch(() => {});
      }

      // ─── Send customer notifications (sender/receiver) ───
      remittanceNotificationService.notify({
        remittanceId: r.id!,
        remittanceNumber: r.remittance_number || '',
        companyId: companyId!,
        triggerKey: remittanceNotificationService.getTriggerKey(newStatus),
        senderName: r.sender_name,
        senderPhone: r.sender_phone,
        receiverName: r.receiver_name,
        receiverPhone: r.receiver_phone,
        amount: Number(r.send_amount) || 0,
        currency: r.send_currency || 'USD',
        receiveCurrency: r.receive_currency,
        deliveryMethod: r.delivery_method,
      }).catch(() => {});

      onDataChange?.();
    } catch (err: any) {
      toast.error(isAr ? 'فشل تغيير الحالة' : 'Failed to change status', { description: err.message });
    } finally {
      setSaving(false);
    }
  }, [remittance.id, remittance, companyId, isAr, onDataChange]);

  // ─── Next Status Logic ─────────────────────────────────────
  const getNextStatus = useCallback((): Remittance['status'] | null => {
    const flow: Remittance['status'][] = ['pending', 'processing', 'sent', 'delivered', 'completed'];
    const idx = flow.indexOf(remittance.status as any);
    if (idx >= 0 && idx < flow.length - 1) return flow[idx + 1];
    return null;
  }, [remittance.status]);

  const nextStatusLabels: Record<string, { ar: string; en: string; color: string }> = {
    processing: { ar: 'بدء التنفيذ', en: 'Start Processing', color: 'bg-blue-500 hover:bg-blue-600' },
    sent: { ar: 'تأكيد التنفيذ', en: 'Confirm Executed', color: 'bg-indigo-500 hover:bg-indigo-600' },
    delivered: { ar: 'تأكيد التسليم', en: 'Confirm Delivered', color: 'bg-emerald-500 hover:bg-emerald-600' },
    completed: { ar: 'إتمام الحوالة', en: 'Complete', color: 'bg-green-600 hover:bg-green-700' },
  };

  // ═══ Close protection hook (must be before conditional return) ══
  const hasUnsavedData = useCallback(() => {
    if (mode !== 'create') return false;
    const d = formDataRef.current;
    return !!(
      d.sender_name || d.receiver_name ||
      (d.send_amount && Number(d.send_amount) > 0) ||
      d.sender_customer_id || d.receiver_customer_id ||
      d.notes
    );
  }, [mode]);

  if (!open) return null;

  // ─── Gradient by direction & status ─────────────────────────
  const getGradient = () => {
    if (remittance.status === 'cancelled' || remittance.status === 'returned')
      return 'from-red-600 to-rose-700';
    if (remittance.remittance_type === 'outgoing')
      return 'from-blue-600 to-indigo-700';
    return 'from-teal-600 to-emerald-700';
  };

  // ─── Delivery Method Icon ──────────────────────────────────
  const getDeliveryIcon = () => {
    switch (remittance.delivery_method) {
      case 'bank': return <Landmark className="w-4 h-4 text-white/70" />;
      case 'wallet': return <Wallet className="w-4 h-4 text-white/70" />;
      case 'cash': return <Banknote className="w-4 h-4 text-white/70" />;
      default: return <Globe className="w-4 h-4 text-white/70" />;
    }
  };

  const getDeliveryLabel = () => {
    const map: Record<string, { ar: string; en: string }> = {
      cash: { ar: 'نقدي', en: 'Cash' },
      bank: { ar: 'بنك', en: 'Bank' },
      wallet: { ar: 'محفظة', en: 'Wallet' },
      agent: { ar: 'وكيل', en: 'Agent' },
      branch: { ar: 'فرع', en: 'Branch' },
      internal: { ar: 'داخلي', en: 'Internal' },
      delegate: { ar: 'مندوب', en: 'Delegate' },
    };
    const m = map[remittance.delivery_method || ''];
    return m ? (isAr ? m.ar : m.en) : '—';
  };

  // ─── Placeholder Tab ──────────────────────────────────────
  const renderPlaceholderTab = (tab: SubTab) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4", getGradient())}>
        <tab.icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {isAr ? tab.labelAr : tab.labelEn}
      </h3>
      <p className="text-sm text-gray-500 max-w-xs">
        {isAr
          ? `سيتم تنفيذ تبويب "${tab.labelAr}" في المرحلة القادمة`
          : `"${tab.labelEn}" tab will be implemented in the next phase`}
      </p>
      <Badge variant="secondary" className="mt-3 text-[10px]">
        🔜 {isAr ? 'قريباً' : 'Coming Soon'}
      </Badge>
    </div>
  );


  // ─── Render Tab Content ───────────────────────────────────
  const renderTabContent = () => {
    // Effective mode: isEditing overrides view → create for field editability
    const effectiveMode = isEditing ? 'create' : mode;
    // Merged remittance (DB state + user edits — filter undefined to preserve DB fields like journal_entry_id)
    const formEdits = Object.fromEntries(
      Object.entries(formDataRef.current).filter(([_, v]) => v !== undefined)
    );
    const mergedRemittance = { ...remittance, ...formEdits };

    switch (activeTab) {
      case 'overview':
        return <RemittanceOverviewTab
          remittance={mergedRemittance}
          mode={effectiveMode}
          isEditing={isEditing}
          onFormChange={handleFormChangeWithDraft}
          onSave={handleSaveRemittance}
          saving={saving}
        />;
      case 'journal':
        return (
          <RemittanceJournalTab
            remittance={mergedRemittance}
            mode={effectiveMode}
            fundAccount={fundAccount}
            agentAccount={agentAccount}
            partnerAccount={partnerAccount}
            cachedCustomerAcct={cachedCustomerAcct}
            cachedExecutorAcct={cachedExecutorAcct}
            loadedJournalEntry={loadedJournalEntry}
            loadingJournalEntry={loadingJournalEntry}
            onLinesReady={handleJournalLines}
          />
        );
      case 'timeline':
        return <RemittanceTimelineTab remittance={remittance} mode={effectiveMode} />;
      case 'attachments':
        return <RemittanceAttachmentsTab remittance={remittance} mode={mode} />;
      default: {
        const tab = SUB_TABS.find(t => t.id === activeTab);
        return tab ? renderPlaceholderTab(tab) : null;
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Close protection handlers (non-hooks — safe after conditional return)

  const handleAttemptClose = () => {
    if (hasUnsavedData()) {
      setShowCloseDialog(true);
    } else {
      onClose();
      setIsEditing(false);
    }
  };

  const handleSaveAsDraft = async () => {
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
      toast.success(isAr ? 'تم حفظ المسودة' : 'Draft saved');
    } catch (err: any) {
      toast.error(isAr ? 'فشل الحفظ' : 'Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
    onClose();
    setIsEditing(false);
  };

  const handleDiscardClose = () => {
    setShowCloseDialog(false);
    onClose();
    setIsEditing(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && document.body.hasAttribute('data-sub-sheet-open')) return;
    if (!o) handleAttemptClose();
  };

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side={isAr ? 'left' : 'right'}
        className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[65vw] max-w-[1200px] p-0 border-0 [&>button]:hidden"
      >
        {/* ═══ HEADER (clean — no action buttons) ═══ */}
        <div className={cn("bg-gradient-to-r p-5", getGradient())}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {remittance.remittance_type === 'outgoing'
                  ? <ArrowUpRight className="w-6 h-6 text-white" />
                  : <ArrowDownLeft className="w-6 h-6 text-white" />}
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white">
                  {remittance.remittance_number}
                </SheetTitle>
                <p className="text-sm text-white/70">
                  {isAr
                    ? (remittance.remittance_type === 'outgoing' ? 'حوالة صادرة' : 'حوالة واردة')
                    : (remittance.remittance_type === 'outgoing' ? 'Outgoing' : 'Incoming')}
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
              <span className="text-[10px] text-white/60 ms-1.5">{remittance.send_currency}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <span className="text-lg font-bold text-white">{formatCurrency(remittance.commission_amount || 0)}</span>
              <span className="text-[10px] text-white/60 ms-1.5">{isAr ? 'عمولة' : 'Fee'}</span>
            </div>
            {remittance.delivery_method && (
              <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm flex items-center gap-1.5">
                {getDeliveryIcon()}
                <span className="text-sm text-white font-medium">{getDeliveryLabel()}</span>
              </div>
            )}
          </div>

          {/* Status Progress Bar */}
          <div className="mt-4 flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => {
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
                      {isAr ? step.labelAr : step.labelEn}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
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
            {/* Draft: Confirm */}
            {remittance.status === 'draft' && draftIdRef.current && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                  onClick={async () => {
                    const data = formDataRef.current;
                    if (!data.sender_name && !data.sender_customer_id) {
                      toast.error(isAr ? 'يجب تحديد المرسل' : 'Sender is required'); return;
                    }
                    if (!data.receiver_name) {
                      toast.error(isAr ? 'يجب تحديد اسم المستقبل' : 'Receiver name is required'); return;
                    }
                    if (!data.send_amount || data.send_amount <= 0) {
                      toast.error(isAr ? 'يجب تحديد مبلغ الإرسال' : 'Send amount is required'); return;
                    }
                    if (data.send_currency !== data.receive_currency && (!data.exchange_rate || data.exchange_rate <= 0)) {
                      toast.error(isAr ? 'يجب تحديد سعر الصرف عند اختلاف العملات' : 'Exchange rate is required when currencies differ'); return;
                    }
                    if (!data.sender_customer_id) {
                      toast.error(isAr ? 'يجب ربط المرسل بحساب عميل مسجل لإنشاء القيد' : 'Sender must be a registered customer'); return;
                    }
                    const { accounts } = exchangeSettings;
                    if (!accounts.remittance_payable || !accounts.commission_income) {
                      toast.error(isAr ? 'يجب إعداد حسابات الصرافة أولاً' : 'Exchange accounts not configured'); return;
                    }
                    // Use the customer's ACTUAL account from cache (same as preview)
                    if (!cachedCustomerAcct?.id) {
                      toast.error(isAr ? 'لا يوجد حساب محاسبي مربوط بالعميل — اذهب لبطاقة العميل وأضف حساب الذمة' : 'Customer has no linked accounting account'); return;
                    }
                    if (!confirm(isAr
                      ? `تأكيد الحوالة بمبلغ ${data.send_amount} ${data.send_currency || 'USD'}؟\nسيتم إنشاء قيد محاسبي.`
                      : `Confirm remittance of ${data.send_amount} ${data.send_currency || 'USD'}?\nA journal entry will be created.`
                    )) return;
                    setSaving(true);
                    try {
                      const totalCommission = (Number(data.our_commission) || 0) + (Number(data.agent_commission) || 0) + (Number(data.network_fee) || 0);
                      const confirmJeId = await remittanceJournalService.confirmRemittance({
                        remittanceId: draftIdRef.current!,
                        remittanceNumber: remittance.remittance_number || `DRF-${trackingCode}`,
                        companyId: companyId!,
                        sendAmount: Number(data.send_amount) || 0,
                        commissionAmount: totalCommission,
                        currency: data.send_currency || 'USD',
                        senderName: data.sender_name || '',
                        accounts: {
                          customerAccountId: cachedCustomerAcct.id,
                          remittancePayableId: accounts.remittance_payable.id,
                          commissionIncomeId: accounts.commission_income.id,
                        },
                        autoPost: autoPost.auto_post_remittance,
                      });
                      setRemittance(prev => ({
                        ...prev,
                        status: 'pending',
                        remittance_number: remittanceJournalService.getLastGeneratedNumber() || prev.remittance_number,
                        journal_entry_id: confirmJeId,
                      }));
                      formDataRef.current = { ...formDataRef.current, status: 'pending', journal_entry_id: confirmJeId };
                      setJournalRefreshKey(k => k + 1);
                      setMode('view');
                      toast.success(isAr
                        ? `✅ تم تأكيد الحوالة — ${remittanceJournalService.getLastGeneratedNumber()}`
                        : `✅ Remittance confirmed — ${remittanceJournalService.getLastGeneratedNumber()}`);
                      // Auto-save phones
                      try {
                        if (data.sender_customer_id && data.sender_phone)
                          await customerPhoneService.upsertPhone(data.sender_customer_id, data.sender_phone, data.sender_country, data.sender_city);
                        if (data.receiver_customer_id && data.receiver_phone)
                          await customerPhoneService.upsertPhone(data.receiver_customer_id, data.receiver_phone, data.receiver_country, data.receiver_city);
                      } catch (e) { console.warn('[Phones] Auto-save failed:', e); }
                      onDataChange?.();

                      // ─── Telegram: confirmation notification ───
                      telegramNotify.remittanceStatusChange(companyId!, {
                        remittanceNumber: remittanceJournalService.getLastGeneratedNumber() || remittance.remittance_number || '',
                        oldStatus: 'draft',
                        newStatus: 'pending',
                        senderName: data.sender_name,
                        receiverName: data.receiver_name,
                      }).catch(() => {});

                      // ─── Customer notifications (sender/receiver) ───
                      remittanceNotificationService.notify({
                        remittanceId: draftIdRef.current!,
                        remittanceNumber: remittanceJournalService.getLastGeneratedNumber() || remittance.remittance_number || '',
                        companyId: companyId!,
                        triggerKey: 'confirmed',
                        senderName: data.sender_name,
                        senderPhone: data.sender_phone,
                        receiverName: data.receiver_name,
                        receiverPhone: data.receiver_phone,
                        amount: Number(data.send_amount) || 0,
                        currency: data.send_currency || 'USD',
                        receiveCurrency: data.receive_currency,
                        deliveryMethod: data.delivery_method,
                      }).catch(() => {});
                    } catch (err: any) {
                      toast.error(isAr ? 'فشل التأكيد' : 'Confirmation failed', { description: err.message });
                    } finally { setSaving(false); }
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isAr ? 'تأكيد' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                  onClick={async () => {
                    const data = formDataRef.current;
                    if (!data.sender_customer_id) {
                      toast.error(isAr ? 'يجب ربط المرسل بحساب عميل مسجل' : 'Sender must be a registered customer'); return;
                    }
                    if (!data.send_amount || data.send_amount <= 0) {
                      toast.error(isAr ? 'يجب تحديد مبلغ الإرسال' : 'Send amount is required'); return;
                    }
                    const executorId = data.agent_id || data.partner_id;
                    if (!executorId || !data.execution_channel || data.execution_channel !== 'agent_partner') {
                      toast.error(isAr ? 'يجب اختيار الوكيل/الشريك لقناة التنفيذ' : 'Select an agent/partner first'); return;
                    }
                    const { accounts } = exchangeSettings;
                    if (!accounts.remittance_payable || !accounts.commission_income) {
                      toast.error(isAr ? 'يجب إعداد حسابات الصرافة' : 'Exchange accounts not configured'); return;
                    }
                    // Use the customer's ACTUAL account (same as preview)
                    if (!cachedCustomerAcct?.id) {
                      toast.error(isAr ? 'لا يوجد حساب محاسبي مربوط بالعميل' : 'Customer has no linked accounting account'); return;
                    }
                    // Use the executor's ACTUAL account (same as preview)
                    const executorAccountId = cachedExecutorAcct?.id;
                    if (!executorAccountId) {
                      toast.error(isAr ? 'لا يوجد حساب محاسبي مربوط بالوكيل/الشريك' : 'No account linked to agent/partner'); return;
                    }
                    const totalCommission = (Number(data.our_commission) || 0) + (Number(data.agent_commission) || 0) + (Number(data.network_fee) || 0);
                    if (!confirm(isAr
                      ? `تأكيد وتنفيذ الحوالة بمبلغ ${data.send_amount} ${data.send_currency || 'USD'}؟\nسيتم إنشاء قيد شامل.`
                      : `Confirm & Execute ${data.send_amount} ${data.send_currency || 'USD'}?\nA comprehensive journal entry will be created.`
                    )) return;
                    setSaving(true);
                    try {
                      const execJeId = await remittanceJournalService.confirmAndExecute({
                        remittanceId: draftIdRef.current!,
                        remittanceNumber: remittance.remittance_number || `DRF-${trackingCode}`,
                        companyId: companyId!,
                        sendAmount: Number(data.send_amount) || 0,
                        commissionAmount: totalCommission,
                        currency: data.send_currency || 'USD',
                        senderName: data.sender_name || '',
                        accounts: {
                          customerAccountId: cachedCustomerAcct.id,
                          remittancePayableId: accounts.remittance_payable.id,
                          commissionIncomeId: accounts.commission_income.id,
                        },
                        executorAccountId,
                        agentCommission: Number(data.agent_commission) || 0,
                        networkFee: Number(data.network_fee) || 0,
                        autoPost: autoPost.auto_post_remittance,
                      });
                      setRemittance(prev => ({
                        ...prev,
                        status: 'sent',
                        remittance_number: remittanceJournalService.getLastGeneratedNumber() || prev.remittance_number,
                        journal_entry_id: execJeId,
                      }));
                      formDataRef.current = { ...formDataRef.current, status: 'sent', journal_entry_id: execJeId };
                      setJournalRefreshKey(k => k + 1);
                      setMode('view');
                      toast.success(isAr
                        ? `✅ تم التأكيد والتنفيذ — ${remittanceJournalService.getLastGeneratedNumber()}`
                        : `✅ Confirmed & Executed — ${remittanceJournalService.getLastGeneratedNumber()}`);
                      // Auto-save phones
                      try {
                        if (data.sender_customer_id && data.sender_phone)
                          await customerPhoneService.upsertPhone(data.sender_customer_id, data.sender_phone, data.sender_country, data.sender_city);
                        if (data.receiver_customer_id && data.receiver_phone)
                          await customerPhoneService.upsertPhone(data.receiver_customer_id, data.receiver_phone, data.receiver_country, data.receiver_city);
                      } catch (e) { console.warn('[Phones] Auto-save failed:', e); }
                      onDataChange?.();

                      // ─── Telegram: sent notification ───
                      telegramNotify.remittanceSent(companyId!, {
                        remittanceNumber: remittanceJournalService.getLastGeneratedNumber() || remittance.remittance_number || '',
                        senderName: data.sender_name || '',
                        receiverName: data.receiver_name || '',
                        sendAmount: Number(data.send_amount) || 0,
                        sendCurrency: data.send_currency || 'USD',
                        trackingCode,
                      }).catch(() => {});

                      // ─── Customer notifications (sender/receiver) ───
                      remittanceNotificationService.notify({
                        remittanceId: draftIdRef.current!,
                        remittanceNumber: remittanceJournalService.getLastGeneratedNumber() || remittance.remittance_number || '',
                        companyId: companyId!,
                        triggerKey: 'executed',
                        senderName: data.sender_name,
                        senderPhone: data.sender_phone,
                        receiverName: data.receiver_name,
                        receiverPhone: data.receiver_phone,
                        amount: Number(data.send_amount) || 0,
                        currency: data.send_currency || 'USD',
                        receiveCurrency: data.receive_currency,
                        deliveryMethod: data.delivery_method,
                      }).catch(() => {});
                    } catch (err: any) {
                      toast.error(isAr ? 'فشل التنفيذ' : 'Execution failed', { description: err.message });
                    } finally { setSaving(false); }
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FastForward className="w-3.5 h-3.5" />}
                  {isAr ? 'تأكيد + تنفيذ' : 'Confirm & Execute'}
                </Button>
              </>
            )}

            {/* Pending: Edit / Save / Execute flow */}
            {remittance.status === 'pending' && (() => {
              // VIEW mode (not editing): show Edit + Execute
              if (mode === 'view' && !isEditing) {
                return (
                  <>
                    {/* Edit button */}
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => {
                        formDataRef.current = { ...remittance };
                        resolveCustomerAccount(remittance.sender_customer_id);
                        resolveExecutorAccount(remittance.agent_id, remittance.partner_id);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isAr ? 'تعديل' : 'Edit'}
                    </Button>
                    {/* Execute button */}
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                      onClick={async () => {
                        const data = formDataRef.current;
                        const executorId = data.agent_id || data.partner_id;
                        if (!executorId) {
                          toast.error(isAr ? 'يجب تحديد الوكيل/الشريك أولاً' : 'Select agent/partner first');
                          return;
                        }
                        const { accounts } = exchangeSettings;
                        if (!accounts.remittance_payable) {
                          toast.error(isAr ? 'حساب حوالات معلقة غير مُعد' : 'Remittance payable not configured');
                          return;
                        }
                        const executorAccountId = cachedExecutorAcct?.id;
                        if (!executorAccountId) {
                          toast.error(isAr ? 'لا يوجد حساب مرتبط بالوكيل/الشريك' : 'No executor account'); return;
                        }
                        if (!confirm(isAr
                          ? `تنفيذ الحوالة ${remittance.remittance_number} بمبلغ ${remittance.send_amount} ${remittance.send_currency}؟`
                          : `Execute ${remittance.remittance_number} for ${remittance.send_amount} ${remittance.send_currency}?`
                        )) return;
                        setSaving(true);
                        try {
                          // Save execution channel to DB first (in case changed in pending view)
                          await supabase.from('remittances').update({
                            agent_id: data.agent_id || null,
                            partner_id: data.partner_id || null,
                            execution_channel: data.execution_channel || null,
                          }).eq('id', remittance.id!);

                          const totalCommission = (Number(data.our_commission) || 0) + (Number(data.agent_commission) || 0);
                          const execJeId2 = await remittanceJournalService.executeRemittance({
                            remittanceId: remittance.id!,
                            remittanceNumber: remittance.remittance_number || '',
                            companyId: companyId!,
                            sendAmount: Number(remittance.send_amount) || 0,
                            commissionAmount: totalCommission,
                            agentCommission: Number(data.agent_commission) || 0,
                            currency: remittance.send_currency || 'USD',
                            senderName: remittance.sender_name || '',
                            remittancePayableId: accounts.remittance_payable.id,
                            commissionIncomeId: accounts.commission_income.id,
                            executorAccountId,
                            autoPost: autoPost.auto_post_remittance,
                          });
                          setRemittance(prev => ({ ...prev, status: 'sent' }));
                          // Sync formDataRef so mergedRemittance reflects new status
                          formDataRef.current = { ...formDataRef.current, status: 'sent' };
                          setJournalRefreshKey(k => k + 1);
                          toast.success(isAr ? '✅ تم تنفيذ الحوالة' : '✅ Remittance executed');
                          onDataChange?.();

                          // ─── Telegram: sent notification ───
                          telegramNotify.remittanceSent(companyId!, {
                            remittanceNumber: remittance.remittance_number || '',
                            senderName: remittance.sender_name || '',
                            receiverName: remittance.receiver_name || '',
                            sendAmount: Number(remittance.send_amount) || 0,
                            sendCurrency: remittance.send_currency || 'USD',
                          }).catch(() => {});

                          // ─── Customer notifications (sender/receiver) ───
                          remittanceNotificationService.notify({
                            remittanceId: remittance.id!,
                            remittanceNumber: remittance.remittance_number || '',
                            companyId: companyId!,
                            triggerKey: 'executed',
                            senderName: remittance.sender_name,
                            senderPhone: remittance.sender_phone,
                            receiverName: remittance.receiver_name,
                            receiverPhone: remittance.receiver_phone,
                            amount: Number(remittance.send_amount) || 0,
                            currency: remittance.send_currency || 'USD',
                            receiveCurrency: remittance.receive_currency,
                            deliveryMethod: remittance.delivery_method,
                          }).catch(() => {});
                        } catch (err: any) {
                          toast.error(isAr ? 'فشل التنفيذ' : 'Execution failed', { description: err.message });
                        } finally { setSaving(false); }
                      }}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FastForward className="w-3.5 h-3.5" />}
                      {isAr ? 'تنفيذ' : 'Execute'}
                    </Button>
                  </>
                );
              }

              // isEditing mode: show Delete + Cancel + Save
              if (isEditing) {
                return (
                  <>
                    {/* Delete button */}
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={async () => {
                        const msg = isAr
                          ? `⚠️ هل أنت متأكد من حذف الحوالة ${remittance.remittance_number}؟\n\nسيتم حذف الحوالة والقيد المحاسبي المرتبط نهائياً.`
                          : `⚠️ Delete ${remittance.remittance_number}?\n\nThis will permanently delete the remittance and its journal entry.`;
                        if (!confirm(msg)) return;
                        setSaving(true);
                        try {
                          // 1. Delete journal entry lines & entry
                          if (remittance.journal_entry_id) {
                            await supabase.from('journal_entry_lines')
                              .delete().eq('entry_id', remittance.journal_entry_id);
                            await supabase.from('journal_entries')
                              .delete().eq('id', remittance.journal_entry_id);
                          }
                          // 2. Delete the remittance
                          await supabase.from('remittances')
                            .delete().eq('id', remittance.id!);
                          // 3. Log in audit_logs (best-effort)
                          try {
                            const { logAuditEvent } = await import('@/features/users-permissions/components/AuditLogTab');
                            await logAuditEvent({
                              action: 'delete',
                              entity_type: 'remittance',
                              entity_id: remittance.id,
                              entity_name: remittance.remittance_number || '',
                              old_values: {
                                sender: remittance.sender_name,
                                receiver: remittance.receiver_name,
                                amount: remittance.send_amount,
                                currency: remittance.send_currency,
                                status: remittance.status,
                                journal_entry_id: remittance.journal_entry_id || null,
                              },
                              severity: 'warning',
                            });
                          } catch { /* audit log non-blocking */ }
                          toast.success(isAr ? '🗑️ تم حذف الحوالة والقيود المرتبطة' : '🗑️ Remittance and journals deleted');
                          onDataChange?.();
                          onClose();
                        } catch (err: any) {
                          toast.error(isAr ? 'فشل الحذف' : 'Delete failed', { description: err.message });
                        } finally { setSaving(false); }
                      }}
                      disabled={saving}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isAr ? 'حذف' : 'Delete'}
                    </Button>
                    {/* Cancel button */}
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 h-8 text-xs text-gray-600"
                      onClick={() => setIsEditing(false)}
                    >
                      {isAr ? 'إلغاء التعديل' : 'Cancel Edit'}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                      onClick={async () => {
                        const data = formDataRef.current;
                        setSaving(true);
                        try {
                          // 1. Save updated remittance data
                          await supabase.from('remittances').update({
                            sender_name: data.sender_name,
                            sender_phone: data.sender_phone,
                            receiver_name: data.receiver_name,
                            receiver_phone: data.receiver_phone,
                            send_amount: data.send_amount,
                            receive_amount: data.receive_amount,
                            send_currency: data.send_currency,
                            receive_currency: data.receive_currency,
                            exchange_rate: data.exchange_rate,
                            commission_amount: data.commission_amount,
                            our_commission: data.our_commission,
                            agent_commission: data.agent_commission,
                            network_fee: data.network_fee,
                            agent_id: data.agent_id || null,
                            partner_id: data.partner_id || null,
                            execution_channel: data.execution_channel || null,
                            notes: data.notes,
                          }).eq('id', remittance.id!);

                          // 2. Update the confirmation journal entry if it exists
                          if (remittance.journal_entry_id) {
                            const { accounts } = exchangeSettings;
                            const totalCharged = (Number(data.send_amount) || 0) + (Number(data.commission_amount) || 0);
                            // Get the customer account + tenant_id from existing journal lines (first debit line)
                            const { data: existingLines } = await supabase
                              .from('journal_entry_lines')
                              .select('account_id, tenant_id')
                              .eq('entry_id', remittance.journal_entry_id)
                              .gt('debit', 0)
                              .limit(1);
                            const custAcctId = existingLines?.[0]?.account_id;
                            const tenantId = existingLines?.[0]?.tenant_id;
                            const newLines = [
                              {
                                account_id: custAcctId,
                                debit: totalCharged, credit: 0,
                                description: `تأكيد حوالة ${remittance.remittance_number} — تحديث`,
                                currency: data.send_currency, exchange_rate: 1,
                              },
                              {
                                account_id: accounts.remittance_payable?.id,
                                debit: 0, credit: Number(data.send_amount) || 0,
                                description: `حوالات معلقة — ${remittance.remittance_number}`,
                                currency: data.send_currency, exchange_rate: 1,
                              },
                            ];
                            if (Number(data.commission_amount) > 0) {
                              newLines.push({
                                account_id: accounts.commission_income?.id,
                                debit: 0, credit: Number(data.commission_amount) || 0,
                                description: `عمولة حوالة ${remittance.remittance_number}`,
                                currency: data.send_currency, exchange_rate: 1,
                              });
                            }
                            // Delete old lines & insert new
                            await supabase.from('journal_entry_lines')
                              .delete().eq('entry_id', remittance.journal_entry_id);
                            await supabase.from('journal_entry_lines')
                              .insert(newLines.map(l => ({ ...l, entry_id: remittance.journal_entry_id, tenant_id: tenantId })));
                            // Update journal description
                            await supabase.from('journal_entries').update({
                              description: `تأكيد حوالة ${remittance.remittance_number} — ${data.sender_name} (معدّل)`,
                            }).eq('id', remittance.journal_entry_id);
                          }

                          // 3. Refresh state
                          const updated = await remittanceService.getRemittance(remittance.id!);
                          setRemittance(updated);
                          setIsEditing(false);
                          toast.success(isAr ? '✅ تم حفظ التعديلات وتحديث القيد' : '✅ Changes saved & journal updated');
                          onDataChange?.();
                        } catch (err: any) {
                          toast.error(isAr ? 'فشل الحفظ' : 'Save failed', { description: err.message });
                        } finally { setSaving(false); }
                      }}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                    </Button>
                  </>
                );
              }
              return null;
            })()}

            {/* View mode: Edit + Advance status (for non-pending, non-terminal) */}
            {mode === 'view' && !isEditing && !['completed', 'cancelled', 'returned', 'draft', 'pending'].includes(remittance.status || '') && (() => {
              const next = getNextStatus();
              const cfg = next ? nextStatusLabels[next] : null;
              return (
                <>
                  {/* Edit button */}
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      formDataRef.current = { ...remittance };
                      resolveCustomerAccount(remittance.sender_customer_id);
                      resolveExecutorAccount(remittance.agent_id, remittance.partner_id);
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {isAr ? 'تعديل' : 'Edit'}
                  </Button>
                  {/* Advance button */}
                  {cfg && (
                    <Button
                      size="sm"
                      className={cn('text-white gap-1.5 h-8 text-xs font-semibold shadow-sm', cfg.color)}
                      onClick={() => handleStatusChange(next!)}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      {isAr ? cfg.ar : cfg.en}
                    </Button>
                  )}
                </>
              );
            })()}

            {/* isEditing Save/Cancel for non-pending statuses (sent, processing, etc.) */}
            {isEditing && !['draft', 'pending'].includes(remittance.status || '') && (
              <>
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 h-8 text-xs text-gray-600"
                  onClick={() => setIsEditing(false)}
                >
                  {isAr ? 'إلغاء التعديل' : 'Cancel Edit'}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold shadow-sm"
                  onClick={async () => {
                    const data = formDataRef.current;
                    setSaving(true);
                    try {
                      await supabase.from('remittances').update({
                        sender_name: data.sender_name,
                        sender_phone: data.sender_phone,
                        receiver_name: data.receiver_name,
                        receiver_phone: data.receiver_phone,
                        agent_id: data.agent_id || null,
                        partner_id: data.partner_id || null,
                        execution_channel: data.execution_channel || null,
                        notes: data.notes,
                      }).eq('id', remittance.id!);

                      const updated = await remittanceService.getRemittance(remittance.id!);
                      setRemittance(updated);
                      setIsEditing(false);
                      toast.success(isAr ? '✅ تم حفظ التعديلات' : '✅ Changes saved');
                      onDataChange?.();
                    } catch (err: any) {
                      toast.error(isAr ? 'فشل الحفظ' : 'Save failed', { description: err.message });
                    } finally { setSaving(false); }
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
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
                  <Button
                    variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(remittance.remittance_number || `DRF-${trackingCode}`);
                      toast.success(isAr ? 'تم نسخ رقم الحوالة' : 'Remittance number copied!');
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {isAr ? 'نسخ الرقم' : 'Copy Number'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Return (view mode) */}
            {mode === 'view' && !['completed', 'cancelled', 'returned', 'draft'].includes(remittance.status || '') && (
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-amber-600 hover:bg-amber-50 gap-1"
                onClick={() => handleStatusChange('returned')}
                disabled={saving}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isAr ? 'إرجاع' : 'Return'}
              </Button>
            )}

            {/* Cancel (view mode) */}
            {mode === 'view' && !['completed', 'cancelled', 'returned', 'draft'].includes(remittance.status || '') && (
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-red-600 hover:bg-red-50 gap-1"
                onClick={async () => {
                  if (!confirm(isAr ? 'هل أنت متأكد من إلغاء هذه الحوالة؟\nسيتم إنشاء قيد عكسي.' : 'Cancel this remittance?\nA reversal journal entry will be created.')) return;
                  setSaving(true);
                  try {
                    if (remittance.journal_entry_id) {
                      await remittanceJournalService.cancelRemittance(
                        remittance.id!, remittance.journal_entry_id, companyId!,
                        remittance.remittance_number || '', autoPost.auto_post_remittance,
                      );
                      toast.success(isAr ? '✅ تم الإلغاء — قيد عكسي تم إنشاؤه' : '✅ Cancelled — reversal entry created');
                    } else {
                      await handleStatusChange('cancelled');
                    }
                    onDataChange?.();
                  } catch (err: any) {
                    toast.error(isAr ? 'فشل الإلغاء' : 'Cancellation failed', { description: err.message });
                  } finally { setSaving(false); }
                }}
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
                  {isAr ? tab.labelAr : tab.labelEn}
                  {!tab.ready && (
                    <span className="text-[8px] opacity-50">🔜</span>
                  )}
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

    {/* ═══ Close Protection Dialog ═══ */}
    <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
      <AlertDialogContent className="max-w-sm" dir={isAr ? 'rtl' : 'ltr'}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">
            {isAr ? '⚠️ بيانات غير محفوظة' : '⚠️ Unsaved Data'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {isAr
              ? 'لديك بيانات حوالة غير محفوظة. ماذا تريد أن تفعل؟'
              : 'You have unsaved remittance data. What would you like to do?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSaveAsDraft}
            disabled={saving}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
            {isAr ? 'حفظ كمسودة' : 'Save as Draft'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDiscardClose}
            className="w-full"
          >
            <XCircle className="w-4 h-4 me-2" />
            {isAr ? 'إلغاء الحوالة' : 'Discard'}
          </Button>
          <AlertDialogCancel className="w-full mt-0">
            {isAr ? 'الرجوع' : 'Go Back'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

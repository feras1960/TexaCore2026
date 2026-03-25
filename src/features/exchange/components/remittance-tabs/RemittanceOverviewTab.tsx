/**
 * ════════════════════════════════════════════════════════════════
 * 📋 RemittanceOverviewTab V2 — النظرة العامة بأكورديونات ذكية
 * ════════════════════════════════════════════════════════════════
 * 
 * 6 أقسام (Collapsible):
 *   1. الأساسيات (مفتوح) — نوع + أولوية + مرسل + مستقبل
 *   2. التفاصيل المالية (مفتوح) — عملات + صرف + وجهة + تسليم
 *   3. التحصيل (مفتوح) — نقد / بنك / رصيد عميل
 *   4. الرسوم والعمولات (مطوي)
 *   5. بيانات الامتثال KYC (مطوي)
 *   6. ملاحظات (مطوي)
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { partyBalanceService } from '@/services/partyBalanceService';
import { Remittance } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  User, Phone, MapPin, DollarSign, Send, ChevronDown,
  Landmark, CreditCard, Wallet, Users, Shield, FileText,
  ArrowRightLeft, Zap, AlertCircle, CheckCircle2, Search,
  UserPlus, UserCheck, HelpCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { useFunds } from '@/features/accounting/hooks/useAccountingQueries';
import CustomerCombobox, { type CustomerComboboxValue } from '../CustomerCombobox';
import ExecutionChannelSection, { type ExecutionChannelValue } from '../ExecutionChannelSection';
import { type CustomerPhone } from '../../services/customerPhoneService';
import { complianceService, type ComplianceDoc } from '../../services/complianceService';
import CountryCombobox from '../CountryCombobox';
import { COUNTRIES } from '../../data/countries';

// ─── Get phone code from country name ────────────────────────
function getPhoneCodeForCountry(countryName: string): string {
  if (!countryName) return '';
  const c = COUNTRIES.find(c => c.name_ar === countryName || c.name_en === countryName);
  return c?.phone_code || '';
}

// ─── Arabic/Persian numeral normalization ───────────────────
function normalizeArabicNumbers(value: string): string {
  return value
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function parseLocalizedNumber(value: string): number {
  const normalized = normalizeArabicNumbers(value).replace(/[^0-9.\-]/g, '');
  return parseFloat(normalized) || 0;
}

// ─── Section Header Component ─────────────────────────────────
interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
  collapsible?: boolean;
  badge?: React.ReactNode;
}

function SectionHeader({ icon: Icon, title, subtitle, summary, isOpen, onToggle, collapsible = true, badge }: SectionHeaderProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 text-start transition-colors rounded-t-lg",
        collapsible ? "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" : "cursor-default"
      )}
      disabled={!collapsible}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          isOpen ? "bg-gray-100 dark:bg-gray-800" : "bg-teal-50 dark:bg-teal-900/30"
        )}>
          <Icon className={cn("w-4 h-4", isOpen ? "text-gray-600 dark:text-gray-400" : "text-teal-600 dark:text-teal-400")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
            {badge}
          </div>
          {isOpen && subtitle && <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{subtitle}</p>}
          {!isOpen && summary && (
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold truncate">{summary}</p>
          )}
        </div>
      </div>
      {collapsible && (
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0",
          isOpen && "rotate-180"
        )} />
      )}
    </CollapsibleTrigger>
  );
}

// ─── Props ────────────────────────────────────────────────────
interface RemittanceOverviewTabProps {
  remittance: Partial<Remittance>;
  mode: 'create' | 'view';
  isEditing?: boolean;
  onFormChange?: (data: Partial<Remittance>) => void;
  onSave?: (data: Partial<Remittance>) => void;
  saving?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// ─── Compliance Docs Sub-Component ────────────────────────────
function ComplianceDocsSection({ customerId, isAr, isCreate }: {
  customerId: string; isAr: boolean; isCreate: boolean;
}) {
  const [docs, setDocs] = React.useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [newDoc, setNewDoc] = React.useState({ doc_type: 'passport', doc_number: '', expiry_date: '', issuing_country: '' });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    complianceService.getDocs(customerId).then(d => {
      if (mounted) { setDocs(d); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [customerId]);

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return <Badge className="text-[9px] bg-gray-100 text-gray-500 py-0 h-4">{isAr ? 'بدون تاريخ' : 'No expiry'}</Badge>;
    const now = new Date();
    const exp = new Date(expiryDate);
    const daysLeft = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return <Badge className="text-[9px] bg-red-100 text-red-700 py-0 h-4">⛔ {isAr ? 'منتهي' : 'Expired'}</Badge>;
    if (daysLeft < 30) return <Badge className="text-[9px] bg-amber-100 text-amber-700 py-0 h-4">⚠️ {daysLeft}{isAr ? ' يوم' : 'd'}</Badge>;
    return <Badge className="text-[9px] bg-green-100 text-green-700 py-0 h-4">✅ {isAr ? 'ساري' : 'Valid'}</Badge>;
  };

  const docTypeLabels: Record<string, { ar: string; en: string }> = {
    passport: { ar: 'جواز سفر', en: 'Passport' },
    id_card: { ar: 'هوية', en: 'ID Card' },
    residence: { ar: 'إقامة', en: 'Residence' },
    license: { ar: 'رخصة', en: 'License' },
    commercial_register: { ar: 'سجل تجاري', en: 'Commercial Reg.' },
  };

  const handleAdd = async () => {
    if (!newDoc.doc_number) return;
    setSaving(true);
    try {
      await complianceService.upsertDoc({ customer_id: customerId, ...newDoc });
      const updated = await complianceService.getDocs(customerId);
      setDocs(updated);
      setShowAdd(false);
      setNewDoc({ doc_type: 'passport', doc_number: '', expiry_date: '', issuing_country: '' });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Shield className="w-3 h-3" /> {isAr ? 'وثائق الامتثال' : 'Compliance Documents'}
        </h5>
        {isCreate && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
          >
            {showAdd ? (isAr ? '✕ إلغاء' : '✕ Cancel') : (isAr ? '➕ إضافة وثيقة' : '➕ Add Document')}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Select value={newDoc.doc_type} onValueChange={v => setNewDoc(p => ({ ...p, doc_type: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(docTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{isAr ? v.ar : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="h-8 text-xs font-mono" placeholder={isAr ? 'رقم الوثيقة' : 'Doc number'}
              value={newDoc.doc_number} onChange={e => setNewDoc(p => ({ ...p, doc_number: e.target.value }))} dir="ltr" />
            <Input type="date" className="h-8 text-xs font-mono" placeholder={isAr ? 'تاريخ الانتهاء' : 'Expiry'}
              value={newDoc.expiry_date} onChange={e => setNewDoc(p => ({ ...p, expiry_date: e.target.value }))} />
            <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={saving || !newDoc.doc_number}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : (isAr ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-3 text-[11px] text-gray-400">
          {isAr ? 'لا توجد وثائق امتثال لهذا العميل' : 'No compliance documents for this customer'}
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-start px-2.5 py-1.5 text-[10px] font-semibold text-gray-500">{isAr ? 'النوع' : 'Type'}</th>
                <th className="text-start px-2.5 py-1.5 text-[10px] font-semibold text-gray-500">{isAr ? 'الرقم' : 'Number'}</th>
                <th className="text-start px-2.5 py-1.5 text-[10px] font-semibold text-gray-500">{isAr ? 'الانتهاء' : 'Expiry'}</th>
                <th className="text-start px-2.5 py-1.5 text-[10px] font-semibold text-gray-500">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                  <td className="px-2.5 py-1.5 font-medium text-gray-700 dark:text-gray-300">
                    {docTypeLabels[doc.doc_type]?.[isAr ? 'ar' : 'en'] || doc.doc_type}
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-gray-600 dark:text-gray-400" dir="ltr">{doc.doc_number || '—'}</td>
                  <td className="px-2.5 py-1.5 font-mono text-gray-600 dark:text-gray-400">{doc.expiry_date || '—'}</td>
                  <td className="px-2.5 py-1.5">{getExpiryBadge(doc.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RemittanceOverviewTab({ remittance, mode, isEditing, onFormChange, onSave, saving }: RemittanceOverviewTabProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const { currencyOptions, getRate } = useViewCurrency();
  const { funds } = useFunds();
  const isCreate = mode === 'create';
  const isEditable = isCreate || !!isEditing;
  // Execution channel area: always open when pending (no full edit needed)
  const isPendingView = mode === 'view' && remittance.status === 'pending';

  // ─── Form State ──────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<Remittance>>(remittance);

  // ─── Commission Rates (permille ‰) as source of truth ──────
  const [commissionRates, setCommissionRates] = useState(() => {
    // Initialize from existing data so rates survive tab switches
    const sendAmt = Number(remittance.send_amount) || 0;
    const our = Number(remittance.our_commission) || 0;
    const agent = Number(remittance.agent_commission) || 0;
    if (sendAmt > 0) {
      return { our: (our / sendAmt) * 1000, agent: (agent / sendAmt) * 1000 };
    }
    return { our: 0, agent: 0 };
  });

  // ─── Saved Phone History ────────────────────────────────────
  const [senderPhones, setSenderPhones] = useState<CustomerPhone[]>([]);
  const [receiverPhones, setReceiverPhones] = useState<CustomerPhone[]>([]);

  // Sync formData when a different remittance is loaded (e.g. opening a draft)
  useEffect(() => {
    if (remittance.id) {
      setFormData(remittance);
      // Initialize rates from loaded data
      const sendAmt = Number(remittance.send_amount) || 0;
      if (sendAmt > 0) {
        setCommissionRates({
          our: ((Number(remittance.our_commission) || 0) / sendAmt) * 1000,
          agent: ((Number(remittance.agent_commission) || 0) / sendAmt) * 1000,
        });
      }
    }
  }, [remittance.id]);

  // Sync formData when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setFormData(remittance);
    }
  }, [isEditing]);

  // Sync with parent when default currency changes (e.g. baseCurrency loads async)
  useEffect(() => {
    if (isCreate && remittance.receive_currency && remittance.receive_currency !== formData.receive_currency) {
      setFormData(prev => ({ ...prev, receive_currency: remittance.receive_currency }));
    }
  }, [remittance.receive_currency, isCreate]);

  // ─── Collapsible States ──────────────────────────────────────
  const [openSections, setOpenSections] = useState({
    basics: true,
    financials: false,
    fees: false,
    execution: false,
    kyc: false,
    notes: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = prev[key];
      // Accordion: close all, open the clicked one (unless closing it)
      const allClosed = Object.fromEntries(Object.keys(prev).map(k => [k, false])) as typeof prev;
      return { ...allClosed, [key]: !isCurrentlyOpen };
    });
  };

  // ─── Smart Summaries for collapsed sections ────────────────────
  const arrow = isAr ? '←' : '→';
  const senderName = formData.sender_name || '';
  const receiverName = formData.receiver_name || '';
  const typeLabel = remittance.remittance_type === 'incoming'
    ? (isAr ? '📥 واردة' : '📥 Incoming')
    : (isAr ? '📤 صادرة' : '📤 Outgoing');
  const amountSnippet = formData.send_amount
    ? `${Number(formData.send_amount).toLocaleString()} ${formData.send_currency || 'USD'}`
    : '';
  const basicsSummary = (senderName || receiverName)
    ? [
        typeLabel,
        `${senderName || '...'} ${arrow} ${receiverName || '...'}`,
        formData.delivery_country || '',
        amountSnippet,
      ].filter(Boolean).join('  •  ')
    : typeLabel;

  const deliveryLabels: Record<string, string> = { cash: isAr ? '💵 نقدي' : '💵 Cash', bank: isAr ? '🏦 بنكي' : '🏦 Bank', wallet: isAr ? '👛 محفظة' : '👛 Wallet' };
  const financialsSummary = formData.send_amount
    ? `${Number(formData.send_amount).toLocaleString()} ${formData.send_currency || 'USD'} ${arrow} ${Number(formData.receive_amount || 0).toLocaleString()} ${formData.receive_currency || ''} | ${deliveryLabels[formData.delivery_method] || ''}`
    : '';

  const channelLabels: Record<string, string> = {
    agent_partner: isAr ? '👥 وكيل/شريك' : '👥 Agent/Partner',
    branch: isAr ? '🏢 فرع' : '🏢 Branch',
    direct_bank: isAr ? '🏦 بنكي' : '🏦 Bank',
    wallet: isAr ? '👛 محفظة' : '👛 Wallet',
  };
  const [executorDisplayName, setExecutorDisplayName] = useState('');
  const executionSummary = (() => {
    if (!formData.execution_channel) return '';
    const channelLabel = channelLabels[formData.execution_channel] || '';
    const payMethodLabels: Record<string, string> = { cash: isAr ? '💵نقدي' : '💵Cash', bank: isAr ? '🏦بنكي' : '🏦Bank', wallet: isAr ? '👛محفظة' : '👛Wallet' };
    const payMethod = payMethodLabels[formData.execution_payment_method || 'cash'] || '';
    const parts = [channelLabel];
    if (executorDisplayName) parts.push(executorDisplayName);
    if (payMethod) parts.push(isAr ? `الدفع: ${payMethod}` : `Pay: ${payMethod}`);
    return parts.join('  •  ');
  })();

  const totalFees = (formData.our_commission || 0) + (formData.agent_commission || 0);
  const feesSummary = (() => {
    if (totalFees <= 0) return '';
    const parts: string[] = [];
    if (formData.our_commission) parts.push(`${isAr ? 'عمولتنا' : 'Ours'}: ${formData.our_commission}`);
    if (formData.agent_commission) parts.push(`${isAr ? 'تغطية' : 'Coverage'}: ${formData.agent_commission}`);
    parts.push(`${isAr ? 'إجمالي' : 'Total'}: ${totalFees.toFixed(2)} ${formData.send_currency || 'USD'}`);
    return parts.join('  •  ');
  })();

  const payLabels: Record<string, string> = { cash: isAr ? '✅ نقدي' : '✅ Cash', bank: isAr ? '🏦 بنك' : '🏦 Bank', internal: isAr ? '💳 رصيد' : '💳 Balance' };

  // ─── Auto-Calculate Exchange Rate ────────────────────────────
  useEffect(() => {
    if (!isEditable) return;
    const sCurr = formData.send_currency || 'USD';
    const rCurr = formData.receive_currency || 'USD';
    const rate = getRate(sCurr, rCurr);
    let updates: Partial<Remittance> = { exchange_rate: rate };

    if (formData.send_amount && rate) {
      updates.receive_amount = parseFloat((Number(formData.send_amount) * rate).toFixed(4));
    }

    if (updates.exchange_rate !== formData.exchange_rate || updates.receive_amount !== formData.receive_amount) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [formData.send_currency, formData.receive_currency, formData.send_amount, getRate, isCreate]);

  // ─── Auto-Recalculate Commissions when send_amount changes ───
  useEffect(() => {
    if (!isEditable) return;
    const sendAmt = Number(formData.send_amount) || 0;
    if (sendAmt <= 0) return;
    const ourAmt = Number(((commissionRates.our / 1000) * sendAmt).toFixed(2));
    const agentAmt = Number(((commissionRates.agent / 1000) * sendAmt).toFixed(2));
    const currentOur = Number(formData.our_commission) || 0;
    const currentAgent = Number(formData.agent_commission) || 0;
    if (Math.abs(ourAmt - currentOur) > 0.01 || Math.abs(agentAmt - currentAgent) > 0.01) {
      setFormData(prev => ({
        ...prev,
        our_commission: ourAmt,
        agent_commission: agentAmt,
        commission_amount: ourAmt + agentAmt,
      }));
    }
  }, [formData.send_amount, commissionRates, isCreate]);

  // ─── Sync formData to parent (deferred — avoids setState-during-render) ───
  useEffect(() => {
    onFormChange?.(formData);
  }, [formData]);

  const handleChange = (field: keyof Remittance, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-sync: when transfer method changes → update execution payment method
      if (field === 'delivery_method') {
        const methodMap: Record<string, string> = { cash: 'cash', bank: 'bank', wallet: 'wallet' };
        if (methodMap[value]) {
          updated.execution_payment_method = methodMap[value] as any;
        }
      }

      // Auto-sync: commission_amount = our_commission + agent_commission
      if (field === 'our_commission' || field === 'agent_commission') {
        const our = field === 'our_commission' ? (Number(value) || 0) : (Number(updated.our_commission) || 0);
        const agent = field === 'agent_commission' ? (Number(value) || 0) : (Number(updated.agent_commission) || 0);
        updated.commission_amount = our + agent;
      }

      return updated;
    });
  };

  // ─── Amount handler with Arabic numeral support ───────────────
  const handleAmountChange = useCallback((field: keyof Remittance, rawValue: string) => {
    const num = parseLocalizedNumber(rawValue);
    handleChange(field, num);
  }, []);

  // ─── Customer balance for internal payment ────────────────────
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  useEffect(() => {
    const customerId = formData.sender_customer_id;
    if (!customerId || !companyId) {
      setCustomerBalance(0);
      return;
    }
    // Use partyBalanceService (properly queries journal_entry_lines + journal_entries)
    partyBalanceService.getPartyBalance(companyId, 'customer', customerId)
      .then(result => {
        setCustomerBalance(result.balance);
      })
      .catch(() => setCustomerBalance(0));
  }, [formData.sender_customer_id, companyId]);

  // ─── Fund Options (Cash + Bank) ──────────────────────────────
  const cashFunds = funds.filter((f: any) => f.is_cash_account);
  const bankFunds = funds.filter((f: any) => f.is_bank_account);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3">

      {/* ═══ SECTION 1: BASICS (Always Open) ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.basics} onOpenChange={() => toggleSection('basics')}>
          <SectionHeader
            icon={Users}
            title={isAr ? 'الأساسيات' : 'Basics'}
            subtitle={isAr ? 'الأطراف والأولوية' : 'Parties & priority'}
            summary={basicsSummary}
            isOpen={openSections.basics}
            onToggle={() => toggleSection('basics')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">

              {/* ── Priority + Execution Timing (merged) ────── */}
              {isCreate && (
                <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {/* Priority */}
                    <div className="shrink-0 w-28">
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">{isAr ? 'الأولوية' : 'Priority'}</Label>
                      <Select
                        value={formData.priority || 'normal'}
                        onValueChange={v => handleChange('priority', v)}
                        disabled={!isEditable}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">{isAr ? 'عادية' : 'Normal'}</SelectItem>
                          <SelectItem value="urgent">
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {isAr ? 'عاجلة' : 'Urgent'}</span>
                          </SelectItem>
                          <SelectItem value="vip">
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-purple-500" /> VIP</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                    {/* Execution Timing */}
                    <div className="flex-1">
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">{isAr ? 'موعد التنفيذ' : 'Execution Timing'}</Label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleChange('remittance_date', null)}
                          className={cn(
                            "flex-1 py-1.5 px-3 rounded-md border text-[11px] font-semibold transition-all",
                            !formData.remittance_date
                              ? "bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300"
                          )}
                        >
                          ⚡ {isAr ? 'فوري' : 'Immediate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('remittance_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                          className={cn(
                            "flex-1 py-1.5 px-3 rounded-md border text-[11px] font-semibold transition-all",
                            formData.remittance_date
                              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300"
                          )}
                        >
                          📅 {isAr ? 'مؤجل' : 'Scheduled'}
                        </button>
                      </div>
                    </div>
                    {formData.remittance_date && (
                      <Input
                        type="date"
                        className="h-8 text-xs w-36 font-mono shrink-0"
                        value={typeof formData.remittance_date === 'string' ? formData.remittance_date.split('T')[0] : ''}
                        onChange={e => handleChange('remittance_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* View mode: show priority badge */}
              {!isCreate && formData.priority && formData.priority !== 'normal' && (
                <Badge className={cn(
                  "h-7 text-xs font-semibold gap-1",
                  formData.priority === 'urgent' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                )}>
                  {formData.priority === 'urgent' ? <><Zap className="w-3 h-3" /> {isAr ? 'عاجلة' : 'Urgent'}</> : <><Shield className="w-3 h-3" /> VIP</>}
                </Badge>
              )}

              {/* Sender + Receiver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SENDER */}
                <Card className="border-blue-200/50 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-950/20">
                  <CardContent className="p-3 space-y-3">
                    <h5 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {isAr ? 'المرسل' : 'Sender'}
                    </h5>

                    <CustomerCombobox
                      variant="sender"
                      label={isAr ? 'المرسل' : 'Sender'}
                      disabled={!isEditable}
                      value={{
                        customer_id: formData.sender_customer_id || null,
                        name: formData.sender_name || '',
                        phone: formData.sender_phone || '',
                        country: formData.sender_country || '',
                      }}
                      onChange={(val: CustomerComboboxValue) => {
                        if (val.phones) setSenderPhones(val.phones);
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            sender_customer_id: val.customer_id || undefined,
                            sender_name: val.name,
                            sender_phone: val.phone || prev.sender_phone,
                            sender_country: val.country || prev.sender_country,
                          };
                          return updated;
                        });
                      }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الهاتف' : 'Phone'}</Label>
                        {isCreate && senderPhones.length > 0 ? (
                          <Select
                            value={formData.sender_phone || ''}
                            onValueChange={v => {
                              handleChange('sender_phone', v);
                              // Auto-fill country from phone record
                              const phoneRec = senderPhones.find(p => p.phone_number === v);
                              if (phoneRec?.country) handleChange('sender_country', phoneRec.country);
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm" dir="ltr">
                              <SelectValue placeholder="+XX ..." />
                            </SelectTrigger>
                            <SelectContent>
                              {senderPhones.map(p => (
                                <SelectItem key={p.id} value={p.phone_number}>
                                  <span className="flex items-center gap-2" dir="ltr">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {p.phone_number}
                                    {p.country && <span className="text-[10px] text-gray-400">({p.country})</span>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9 text-sm"
                            placeholder={getPhoneCodeForCountry(formData.sender_country || '') || '+XX'}
                            value={formData.sender_phone || ''}
                            onChange={e => handleChange('sender_phone', e.target.value)}
                            readOnly={!isEditable}
                            dir="ltr"
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'البلد' : 'Country'}</Label>
                        <CountryCombobox
                          value={formData.sender_country || ''}
                          onChange={v => handleChange('sender_country', v)}
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RECEIVER */}
                <Card className="border-teal-200/50 dark:border-teal-800/50 bg-teal-50/30 dark:bg-teal-950/20">
                  <CardContent className="p-3 space-y-3">
                    <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {isAr ? 'المستقبل' : 'Receiver'}
                    </h5>

                    <CustomerCombobox
                      variant="receiver"
                      label={isAr ? 'المستقبل' : 'Receiver'}
                      disabled={!isEditable}
                      value={{
                        customer_id: formData.receiver_customer_id || null,
                        name: formData.receiver_name || '',
                        phone: formData.receiver_phone || '',
                        country: formData.receiver_country || '',
                      }}
                      onChange={(val: CustomerComboboxValue) => {
                        if (val.phones) setReceiverPhones(val.phones);
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            receiver_customer_id: val.customer_id || undefined,
                            receiver_name: val.name,
                            receiver_phone: val.phone || prev.receiver_phone,
                            receiver_country: val.country || prev.receiver_country,
                            // Auto-fill destination country from receiver
                            delivery_country: val.country || prev.delivery_country,
                          };
                          return updated;
                        });
                      }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الهاتف' : 'Phone'}</Label>
                        {isCreate && receiverPhones.length > 0 ? (
                          <Select
                            value={formData.receiver_phone || ''}
                            onValueChange={v => {
                              handleChange('receiver_phone', v);
                              const phoneRec = receiverPhones.find(p => p.phone_number === v);
                              if (phoneRec?.country) {
                                handleChange('receiver_country', phoneRec.country);
                                handleChange('delivery_country', phoneRec.country);
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm" dir="ltr">
                              <SelectValue placeholder="+XX ..." />
                            </SelectTrigger>
                            <SelectContent>
                              {receiverPhones.map(p => (
                                <SelectItem key={p.id} value={p.phone_number}>
                                  <span className="flex items-center gap-2" dir="ltr">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {p.phone_number}
                                    {p.country && <span className="text-[10px] text-gray-400">({p.country})</span>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9 text-sm"
                            placeholder={getPhoneCodeForCountry(formData.receiver_country || '') || '+XX'}
                            value={formData.receiver_phone || ''}
                            onChange={e => handleChange('receiver_phone', e.target.value)}
                            readOnly={!isEditable}
                            dir="ltr"
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'البلد' : 'Country'}</Label>
                        <CountryCombobox
                          value={formData.receiver_country || ''}
                          onChange={v => {
                            handleChange('receiver_country', v);
                            handleChange('delivery_country', v);
                          }}
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>


            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══ SECTION 2: FINANCIALS (Always Open) ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.financials} onOpenChange={() => toggleSection('financials')}>
          <SectionHeader
            icon={ArrowRightLeft}
            title={isAr ? 'التفاصيل المالية' : 'Financial Details'}
            subtitle={isAr ? 'المبالغ والعملات والوجهة' : 'Amounts, currencies & destination'}
            summary={financialsSummary}
            isOpen={openSections.financials}
            onToggle={() => toggleSection('financials')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">

              {/* Exchange Engine Row */}
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'مبلغ الإرسال' : 'Send Amount'}</Label>
                  <div className="flex gap-1">
                    <Input
                      inputMode="decimal" className="h-9 text-sm flex-1 font-mono"
                      value={formData.send_amount || ''}
                      onChange={e => handleAmountChange('send_amount', e.target.value)}
                      readOnly={!isEditable}
                    />
                    <Select value={formData.send_currency || 'USD'} onValueChange={v => handleChange('send_currency', v)} disabled={!isEditable}>
                      <SelectTrigger className="h-9 w-20 text-sm font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((c: string) => (
                          <SelectItem key={`sc_${c}`} value={c}><span className="font-mono">{c}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'سعر الصرف' : 'Rate'}</Label>
                  <Input
                    inputMode="decimal" className="h-9 text-sm font-mono text-center"
                    value={formData.exchange_rate || ''}
                    onChange={e => handleAmountChange('exchange_rate', e.target.value)}
                    readOnly={!isEditable}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'مبلغ التسليم' : 'Receive Amount'}</Label>
                  <div className="flex gap-1">
                    <Input
                      inputMode="decimal" className="h-9 text-sm flex-1 font-mono bg-gray-50 dark:bg-gray-800/50"
                      value={formData.receive_amount || ''}
                      readOnly
                    />
                    <Select value={formData.receive_currency || 'USD'} onValueChange={v => handleChange('receive_currency', v)} disabled={!isEditable}>
                      <SelectTrigger className="h-9 w-20 text-sm font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((c: string) => (
                          <SelectItem key={`rc_${c}`} value={c}><span className="font-mono">{c}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Destination + Fee bearer */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'دولة الوجهة' : 'Destination Country'}</Label>
                  <CountryCombobox
                    value={formData.delivery_country || ''}
                    onChange={v => handleChange('delivery_country', v)}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'المدينة' : 'City'}</Label>
                  <Input className="h-9 text-sm" value={formData.delivery_city || ''} onChange={e => handleChange('delivery_city', e.target.value)} readOnly={!isEditable} />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'تحمّل العمولة' : 'Fee Bearer'}</Label>
                  <Select value={formData.commission_bearer || 'sender'} onValueChange={v => handleChange('commission_bearer', v)} disabled={!isEditable}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sender">{isAr ? 'المرسل' : 'Sender'}</SelectItem>
                      <SelectItem value="receiver">{isAr ? 'المستقبل' : 'Receiver'}</SelectItem>
                      <SelectItem value="split">{isAr ? 'مناصفة' : 'Split'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Transfer Method ──────────────────────────── */}
              <div>
                <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium mb-1.5 block">
                  {isAr ? 'طريقة التحويل' : 'Transfer Method'}
                </Label>
                <div className="flex gap-1.5">
                  {([
                    { key: 'cash', labelAr: '💵 نقدي', labelEn: '💵 Cash' },
                    { key: 'bank', labelAr: '🏦 بنكي', labelEn: '🏦 Bank' },
                    { key: 'wallet', labelAr: '👛 محفظة', labelEn: '👛 Wallet' },
                  ] as const).map(m => {
                    const active = (formData.delivery_method || 'cash') === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => isCreate && handleChange('delivery_method', m.key)}
                        disabled={!isEditable}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all",
                          active
                            ? m.key === 'cash'
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                              : m.key === 'bank'
                              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                              : "bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        )}
                      >
                        {isAr ? m.labelAr : m.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank details (when bank selected) */}
              {formData.delivery_method === 'bank' && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'اسم البنك' : 'Bank Name'}</Label>
                    <Input className="h-9 text-sm" value={formData.receiver_bank_name || ''} onChange={e => handleChange('receiver_bank_name', e.target.value)} readOnly={!isEditable} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'رقم الحساب / IBAN' : 'Account / IBAN'}</Label>
                    <Input className="h-9 text-sm font-mono" dir="ltr" value={formData.receiver_bank_account || ''} onChange={e => handleChange('receiver_bank_account', e.target.value)} readOnly={!isEditable} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'رمز SWIFT' : 'SWIFT Code'}</Label>
                    <Input className="h-9 text-sm font-mono" dir="ltr" value={formData.receiver_swift_code || ''} onChange={e => handleChange('receiver_swift_code', e.target.value)} readOnly={!isEditable} />
                  </div>
                </div>
              )}

              {/* Wallet details (when wallet selected) */}
              {formData.delivery_method === 'wallet' && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg">
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'عنوان المحفظة' : 'Wallet Address'}</Label>
                    <Input className="h-9 text-sm font-mono" dir="ltr" placeholder="0x... / TRC20..." value={formData.receiver_wallet || ''} onChange={e => handleChange('receiver_wallet', e.target.value)} readOnly={!isEditable} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الشبكة' : 'Network'}</Label>
                    <Select value={formData.crypto_network || ''} onValueChange={v => handleChange('crypto_network', v)} disabled={!isEditable}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={isAr ? 'اختر الشبكة' : 'Select network'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRC20">TRC20 (TRON)</SelectItem>
                        <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                        <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                        <SelectItem value="SOL">Solana</SelectItem>
                        <SelectItem value="other">{isAr ? 'أخرى' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══ SECTION 3: EXECUTION CHANNEL ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.execution} onOpenChange={() => toggleSection('execution')}>
          <SectionHeader
            icon={Send}
            title={isAr ? 'قناة التنفيذ' : 'Execution Channel'}
            subtitle={isAr ? 'وكيل / شريك / فرع / بنكي / محفظة' : 'Agent / Partner / Branch / Bank / Wallet'}
            summary={executionSummary}
            isOpen={openSections.execution}
            onToggle={() => toggleSection('execution')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              <ExecutionChannelSection
                value={{
                  channel: formData.execution_channel || null,
                  executor_id: formData.agent_id || formData.partner_id || null,
                  executor_type: formData.agent_id ? 'agent' : formData.partner_id ? 'partner' : null,
                  executor_name: '',
                  payable_account_id: null,
                  payment_method: formData.execution_payment_method || 'cash',
                }}
                onChange={(val) => {
                  handleChange('execution_channel', val.channel);
                  handleChange('execution_payment_method', val.payment_method);
                  // Track executor name for summary
                  setExecutorDisplayName(val.executor_name || '');
                  if (val.executor_type === 'agent') {
                    handleChange('agent_id', val.executor_id);
                    handleChange('partner_id', null);
                  } else if (val.executor_type === 'partner') {
                    handleChange('partner_id', val.executor_id);
                    handleChange('agent_id', null);
                  } else {
                    handleChange('agent_id', null);
                    handleChange('partner_id', null);
                  }
                }}
                disabled={!(isEditable || isPendingView)}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══ SECTION 4: FEES & COMMISSIONS ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.fees} onOpenChange={() => toggleSection('fees')}>
          <SectionHeader
            icon={DollarSign}
            title={isAr ? 'الرسوم والعمولات' : 'Fees & Commissions'}
            subtitle={isAr ? 'تفصيل العمولات والرسوم' : 'Commission breakdown'}
            summary={feesSummary}
            isOpen={openSections.fees}
            onToggle={() => toggleSection('fees')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {isAr
                  ? '‰ النسبة من الألف — مثال: 10‰ من 50,000$ = 500$'
                  : '‰ Per mille — Example: 10‰ of $50,000 = $500'}
              </p>
              <TooltipProvider delayDuration={200}>
                <div className="space-y-3">
                  {([
                    {
                      field: 'our_commission' as keyof Remittance,
                      labelAr: 'عمولتنا', labelEn: 'Our Commission',
                      tooltipAr: 'ربح الشركة من العملية — المبلغ الذي نحتفظ به كإيراد حوالات',
                      tooltipEn: 'Company profit — the amount we keep as remittance revenue',
                      accountAr: 'إيرادات (حساب 432)', accountEn: 'Revenue (Acc 432)',
                      color: 'emerald',
                    },
                    {
                      field: 'agent_commission' as keyof Remittance,
                      labelAr: 'عمولة التغطية', labelEn: 'Coverage Fee',
                      tooltipAr: 'العمولة المدفوعة للوكيل أو الشريك الذي يغطي تسليم الحوالة في بلد الوجهة',
                      tooltipEn: 'Fee paid to the agent/partner who covers delivery in the destination country',
                      accountAr: 'ضمن حساب الوكيل/الشريك', accountEn: 'Within agent/partner acc.',
                      color: 'red',
                    },
                  ] as const).map(fee => {
                    const sendAmt = Number(formData.send_amount) || 0;
                    const feeAmt = Number(formData[fee.field]) || 0;
                    const rateKey = fee.field === 'our_commission' ? 'our' : 'agent';
                    const currentRate = commissionRates[rateKey];
                    return (
                      <div key={fee.field} className="flex items-center gap-2">
                        <div className="w-28 shrink-0">
                          <div className="flex items-center gap-1">
                            <Label className="text-[11px] text-gray-700 dark:text-gray-200 font-semibold">{isAr ? fee.labelAr : fee.labelEn}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-gray-400 hover:text-blue-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-xs">{isAr ? fee.tooltipAr : fee.tooltipEn}</TooltipContent>
                            </Tooltip>
                          </div>
                          <span className={`text-[9px] text-${fee.color}-500 dark:text-${fee.color}-400 font-semibold`}>
                            → {isAr ? fee.accountAr : fee.accountEn}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <Input inputMode="decimal" className="h-9 text-sm font-mono pe-8 text-center" placeholder="0"
                              value={currentRate ? currentRate.toFixed(1) : ''}
                              onChange={e => {
                                const p = parseLocalizedNumber(e.target.value);
                                setCommissionRates(prev => ({ ...prev, [rateKey]: p }));
                                const amt = sendAmt > 0 ? (p / 1000) * sendAmt : 0;
                                handleChange(fee.field, Number(amt.toFixed(2)));
                              }}
                              readOnly={!isEditable}
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 end-2 text-[10px] font-bold text-gray-400 pointer-events-none">‰</span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-xs font-bold">=</span>
                        <div className="flex-1">
                          <div className="relative">
                            <Input inputMode="decimal" className="h-9 text-sm font-mono font-semibold pe-10" placeholder="0.00"
                              value={feeAmt || ''}
                              onChange={e => {
                                const raw = parseLocalizedNumber(e.target.value);
                                handleChange(fee.field, raw);
                                if (sendAmt > 0) {
                                  setCommissionRates(prev => ({ ...prev, [rateKey]: (raw / sendAmt) * 1000 }));
                                }
                              }}
                              readOnly={!isEditable}
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 end-2 text-[10px] font-mono text-gray-400 pointer-events-none">
                              {formData.send_currency || 'USD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
              <div className="flex items-center justify-between p-3.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{isAr ? 'إجمالي العمولات' : 'Total Fees'}</span>
                <span className="text-base font-bold font-mono text-gray-900 dark:text-white">
                  {((formData.our_commission || 0) + (formData.agent_commission || 0)).toFixed(2)} {formData.send_currency}
                </span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>



      {/* ═══ SECTION 6: KYC (Collapsed) ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.kyc} onOpenChange={() => toggleSection('kyc')}>
          <SectionHeader
            icon={Shield}
            title={isAr ? 'بيانات الامتثال' : 'KYC / Compliance'}
            subtitle={isAr ? 'الهوية والغرض من التحويل' : 'Identity & transfer purpose'}
            isOpen={openSections.kyc}
            onToggle={() => toggleSection('kyc')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'نوع الهوية' : 'ID Type'}</Label>
                  <Select value={formData.sender_id_type || ''} onValueChange={v => handleChange('sender_id_type', v)} disabled={!isEditable}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">{isAr ? 'جواز سفر' : 'Passport'}</SelectItem>
                      <SelectItem value="national_id">{isAr ? 'هوية وطنية' : 'National ID'}</SelectItem>
                      <SelectItem value="residency">{isAr ? 'إقامة' : 'Residency'}</SelectItem>
                      <SelectItem value="driving_license">{isAr ? 'رخصة قيادة' : 'Driving License'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'رقم الهوية' : 'ID Number'}</Label>
                  <Input className="h-9 text-sm font-mono" dir="ltr" value={formData.sender_id_number || ''} onChange={e => handleChange('sender_id_number', e.target.value)} readOnly={!isEditable} />
                </div>
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الغرض' : 'Purpose'}</Label>
                  <Select value={formData.purpose || ''} onValueChange={v => handleChange('purpose', v)} disabled={!isEditable}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={isAr ? 'اختر' : 'Select'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">{isAr ? 'عائلي' : 'Family'}</SelectItem>
                      <SelectItem value="business">{isAr ? 'تجاري' : 'Business'}</SelectItem>
                      <SelectItem value="investment">{isAr ? 'استثمار' : 'Investment'}</SelectItem>
                      <SelectItem value="education">{isAr ? 'تعليم' : 'Education'}</SelectItem>
                      <SelectItem value="medical">{isAr ? 'طبي' : 'Medical'}</SelectItem>
                      <SelectItem value="other">{isAr ? 'أخرى' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ─── Compliance Documents Table ─── */}
              {formData.sender_customer_id && (
                <ComplianceDocsSection
                  customerId={formData.sender_customer_id}
                  isAr={isAr}
                  isCreate={isCreate}
                />
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══ SECTION 6: NOTES (Collapsed) ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
          <SectionHeader
            icon={FileText}
            title={isAr ? 'ملاحظات' : 'Notes'}
            subtitle={isAr ? 'ملاحظات داخلية' : 'Internal notes'}
            isOpen={openSections.notes}
            onToggle={() => toggleSection('notes')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              <Textarea
                className="text-sm min-h-[80px] resize-none"
                placeholder={isAr ? 'ملاحظات داخلية عن الحوالة...' : 'Internal notes about this remittance...'}
                value={formData.notes || ''}
                onChange={e => handleChange('notes', e.target.value)}
                readOnly={!isEditable}
              />
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>


    </div>
  );
}

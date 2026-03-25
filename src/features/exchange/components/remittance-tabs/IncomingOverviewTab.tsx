/**
 * ════════════════════════════════════════════════════════════════
 * 📥 IncomingOverviewTab — النظرة العامة للحوالات الواردة
 * ════════════════════════════════════════════════════════════════
 *
 * 3 أقسام (Accordion):
 *   1. الأساسيات (مفتوح) — مصدر + مبلغ + عمولة + صرف + مرسل + مستقبل
 *   2. التسليم (بعد التأكيد) — صندوق + هوية
 *   3. ملاحظات
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  User, Phone, ChevronDown, DollarSign, Send,
  Landmark, Wallet, Users, Shield, FileText,
  ArrowRightLeft, Zap, AlertCircle, CheckCircle2,
  PackageCheck, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { useFunds } from '@/features/accounting/hooks/useAccountingQueries';
import CustomerCombobox, { type CustomerComboboxValue } from '../CustomerCombobox';
import ExecutionChannelSection, { type ExecutionChannelValue } from '../ExecutionChannelSection';
import CountryCombobox from '../CountryCombobox';

// ─── Arabic numeral normalization ───────────────────────────
function normalizeArabicNumbers(value: string): string {
  return value
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function parseLocalizedNumber(value: string): number {
  const normalized = normalizeArabicNumbers(value).replace(/[^0-9.\-]/g, '');
  return parseFloat(normalized) || 0;
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, summary, isOpen, onToggle, collapsible = true, badge }: {
  icon: React.ElementType; title: string; subtitle?: string; summary?: string;
  isOpen: boolean; onToggle: () => void; collapsible?: boolean; badge?: React.ReactNode;
}) {
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
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
      )}
    </CollapsibleTrigger>
  );
}

// ─── Props ────────────────────────────────────────────────────
interface IncomingOverviewTabProps {
  remittance: Partial<Remittance>;
  mode: 'create' | 'view';
  onFormChange?: (data: Partial<Remittance>) => void;
}

// ═══════════════════════════════════════════════════════════════
export default function IncomingOverviewTab({ remittance, mode, onFormChange }: IncomingOverviewTabProps) {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const { companyId } = useCompany();
  const { currencyOptions, getRate } = useViewCurrency();
  const { funds } = useFunds();
  const isEditable = mode === 'create';
  const isConfirmed = remittance.status === 'pending' || remittance.status === 'delivered' || remittance.status === 'completed';

  // ─── Form State ──────────────────────────────────────────────
  const [formData, setFormData] = useState<Partial<Remittance>>(remittance);
  const [commissionRate, setCommissionRate] = useState(() => {
    const sendAmt = Number(remittance.send_amount) || 0;
    const our = Number(remittance.our_commission) || 0;
    return sendAmt > 0 ? (our / sendAmt) * 1000 : 0;
  });

  useEffect(() => {
    if (remittance.id) {
      setFormData(remittance);
      const sendAmt = Number(remittance.send_amount) || 0;
      if (sendAmt > 0) {
        setCommissionRate(((Number(remittance.our_commission) || 0) / sendAmt) * 1000);
      }
    }
  }, [remittance.id]);

  // ─── Collapsible States ──────────────────────────────────────
  const [openSections, setOpenSections] = useState({
    basics: true,
    delivery: false,
    notes: false,
  });
  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => {
      const allClosed = Object.fromEntries(Object.keys(prev).map(k => [k, false])) as typeof prev;
      return { ...allClosed, [key]: !prev[key] };
    });
  };

  // ─── Summaries ─────────────────────────────────────────────
  const arrow = isAr ? '←' : '→';
  const senderName = formData.sender_name || '';
  const receiverName = formData.receiver_name || '';
  const basicsSummary = (senderName || receiverName)
    ? `📥 ${senderName || '...'} ${arrow} ${receiverName || '...'}`
    : t('exchange.incoming.title');

  // ─── Auto-recalculate commission ────────────────────────────
  useEffect(() => {
    if (!isEditable) return;
    const sendAmt = Number(formData.send_amount) || 0;
    if (sendAmt <= 0) return;
    const ourAmt = Number(((commissionRate / 1000) * sendAmt).toFixed(2));
    if (Math.abs(ourAmt - (Number(formData.our_commission) || 0)) > 0.01) {
      setFormData(prev => ({ ...prev, our_commission: ourAmt, commission_amount: ourAmt }));
    }
  }, [formData.send_amount, commissionRate, isEditable]);

  // ─── Sync formData to parent ────────────────────────────────
  useEffect(() => { onFormChange?.(formData); }, [formData]);

  const handleChange = (field: keyof Remittance, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const handleAmountChange = useCallback((field: keyof Remittance, rawValue: string) => {
    handleChange(field, parseLocalizedNumber(rawValue));
  }, []);

  // ─── Receiver balance ───────────────────────────────────────
  const [receiverBalance, setReceiverBalance] = useState<number>(0);
  useEffect(() => {
    const customerId = formData.receiver_customer_id;
    if (!customerId || !companyId) { setReceiverBalance(0); return; }
    partyBalanceService.getPartyBalance(companyId, 'customer', customerId)
      .then(result => setReceiverBalance(result.balance))
      .catch(() => setReceiverBalance(0));
  }, [formData.receiver_customer_id, companyId]);

  // ─── Fund Options ───────────────────────────────────────────
  const cashFunds = funds.filter((f: any) => f.is_cash_account);
  const bankFunds = funds.filter((f: any) => f.is_bank_account);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-3">

      {/* ═══ SECTION 1: BASICS ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.basics} onOpenChange={() => toggleSection('basics')}>
          <SectionHeader
            icon={Users}
            title={t('exchange.incoming.sections.basics')}
            subtitle={t('exchange.incoming.sections.basicsSubtitle')}
            summary={basicsSummary}
            isOpen={openSections.basics}
            onToggle={() => toggleSection('basics')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">

              {/* ─── SOURCE CHANNEL ─── */}
              <Card className="border-indigo-200/50 dark:border-indigo-800/50 bg-indigo-50/20 dark:bg-indigo-950/10">
                <CardContent className="p-3 space-y-3">
                  <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> {t('exchange.incoming.sections.source')}
                  </h5>
                  <ExecutionChannelSection
                    value={{
                      channel: formData.execution_channel || null,
                      executor_id: formData.agent_id || formData.partner_id || null,
                      executor_type: formData.agent_id ? 'agent' : formData.partner_id ? 'partner' : null,
                      executor_name: '',
                      payable_account_id: null,
                      payment_method: 'cash',
                    }}
                    onChange={(val) => {
                      handleChange('execution_channel', val.channel);
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
                    disabled={!isEditable}
                  />
                  {/* External Ref + Priority in one row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.externalRef')}</Label>
                      <Input className="h-9 text-sm font-mono" dir="ltr" placeholder={t('exchange.incoming.externalRefHint')} value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} readOnly={!isEditable} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الأولوية' : 'Priority'}</Label>
                      <Select value={formData.priority || 'normal'} onValueChange={v => handleChange('priority', v)} disabled={!isEditable}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">{t('exchange.remittances.priority.normal')}</SelectItem>
                          <SelectItem value="urgent">
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {t('exchange.remittances.priority.urgent')}</span>
                          </SelectItem>
                          <SelectItem value="vip">
                            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-purple-500" /> VIP</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ─── AMOUNT + COMMISSION (moved up) ─── */}
              <Card className="border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10">
                <CardContent className="p-3 space-y-3">
                  <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> {t('exchange.incoming.incomingAmount')} + {t('exchange.incoming.sections.fees')}
                  </h5>
                  {/* Amount + Currency */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.incomingAmount')}</Label>
                      <div className="flex gap-1">
                        <Input inputMode="decimal" className="h-9 text-sm flex-1 font-mono" value={formData.send_amount || ''} onChange={e => handleAmountChange('send_amount', e.target.value)} readOnly={!isEditable} />
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
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.commission.ourCommission')}</Label>
                      <div className="relative">
                        <Input inputMode="decimal" className="h-9 text-sm font-mono pe-8" value={formData.our_commission || ''} onChange={e => handleAmountChange('our_commission', e.target.value)} readOnly={!isEditable} />
                        <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{formData.send_currency || 'USD'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Commission rate + net */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">‰ {isAr ? 'نسبة العمولة' : 'Rate'}</Label>
                      <Input inputMode="decimal" className="h-9 text-sm font-mono text-center" value={commissionRate.toFixed(1)} onChange={e => setCommissionRate(parseLocalizedNumber(e.target.value))} readOnly={!isEditable} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.netDelivery')}</Label>
                      <Input className="h-9 text-sm font-mono bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold" readOnly
                        value={((Number(formData.send_amount) || 0) - (Number(formData.our_commission) || 0)).toFixed(2)} />
                    </div>
                  </div>
                  {/* Exchange rate + Source location */}
                  <div className="grid grid-cols-3 gap-2 items-end pt-1 border-t border-emerald-200/30 dark:border-emerald-800/30">
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'سعر الصرف' : 'Exchange Rate'}</Label>
                      <Input inputMode="decimal" className="h-9 text-sm font-mono text-center" value={formData.exchange_rate || ''} onChange={e => handleAmountChange('exchange_rate', e.target.value)} readOnly={!isEditable} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.sourceCountry')}</Label>
                      <CountryCombobox value={formData.delivery_country || ''} onChange={v => handleChange('delivery_country', v)} disabled={!isEditable} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.sourceCity')}</Label>
                      <Input className="h-9 text-sm" value={formData.delivery_city || ''} onChange={e => handleChange('delivery_city', e.target.value)} readOnly={!isEditable} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sender (info only) + Receiver (customer) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SENDER — text only */}
                <Card className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
                  <CardContent className="p-3 space-y-3">
                    <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {t('exchange.incoming.sender.title')}
                    </h5>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {t('exchange.incoming.sender.infoOnly')}
                    </p>
                    <div>
                      <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.sender.name')}</Label>
                      <Input className="h-9 text-sm" value={formData.sender_name || ''} onChange={e => handleChange('sender_name', e.target.value)} readOnly={!isEditable} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.sender.phone')}</Label>
                        <Input className="h-9 text-sm" placeholder="+XX" value={formData.sender_phone || ''} onChange={e => handleChange('sender_phone', e.target.value)} readOnly={!isEditable} dir="ltr" />
                      </div>
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.sender.country')}</Label>
                        <CountryCombobox value={formData.sender_country || ''} onChange={v => handleChange('sender_country', v)} disabled={!isEditable} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* RECEIVER — customer combobox */}
                <Card className="border-teal-200/50 dark:border-teal-800/50 bg-teal-50/30 dark:bg-teal-950/20">
                  <CardContent className="p-3 space-y-3">
                    <h5 className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {t('exchange.incoming.receiver.title')}
                    </h5>

                    <CustomerCombobox
                      variant="receiver"
                      label={t('exchange.incoming.receiver.title')}
                      disabled={!isEditable}
                      value={{
                        customer_id: formData.receiver_customer_id || null,
                        name: formData.receiver_name || '',
                        phone: formData.receiver_phone || '',
                        country: formData.receiver_country || '',
                      }}
                      onChange={(val: CustomerComboboxValue) => {
                        setFormData(prev => ({
                          ...prev,
                          receiver_customer_id: val.customer_id || undefined,
                          receiver_name: val.name,
                          receiver_phone: val.phone || prev.receiver_phone,
                          receiver_country: val.country || prev.receiver_country,
                        }));
                      }}
                    />

                    {/* Balance indicator */}
                    {formData.receiver_customer_id ? (
                      <div className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {t('exchange.incoming.receiver.hasAccount')}
                        </span>
                        {receiverBalance !== 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 ms-auto">
                            {t('exchange.incoming.receiver.currentBalance')}: {receiverBalance.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    ) : formData.receiver_name ? (
                      <div className="flex items-center gap-2 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {t('exchange.incoming.receiver.walkIn')}
                        </span>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'الهاتف' : 'Phone'}</Label>
                        <Input className="h-9 text-sm" placeholder="+XX" value={formData.receiver_phone || ''} onChange={e => handleChange('receiver_phone', e.target.value)} readOnly={!isEditable} dir="ltr" />
                      </div>
                      <div>
                        <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{isAr ? 'البلد' : 'Country'}</Label>
                        <CountryCombobox value={formData.receiver_country || ''} onChange={v => handleChange('receiver_country', v)} disabled={!isEditable} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ═══ SECTION 2: DELIVERY (after confirm) ═══ */}
      {isConfirmed && (
        <Card className="border-blue-200 dark:border-blue-800 overflow-hidden">
          <Collapsible open={openSections.delivery} onOpenChange={() => toggleSection('delivery')}>
            <SectionHeader
              icon={PackageCheck}
              title={t('exchange.incoming.sections.delivery')}
              subtitle={t('exchange.incoming.sections.deliverySubtitle')}
              isOpen={openSections.delivery}
              onToggle={() => toggleSection('delivery')}
              badge={remittance.status === 'pending' && (
                <Badge className="text-[9px] bg-blue-100 text-blue-700 py-0 h-4">{isAr ? 'مطلوب للتسليم' : 'Required'}</Badge>
              )}
            />
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {/* Payment method */}
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium mb-1.5 block">{t('exchange.incoming.deliveryDetails.paymentMethod')}</Label>
                  <div className="flex gap-1.5">
                    {[
                      { key: 'cash', label: t('exchange.incoming.deliveryDetails.cash'), icon: '💵' },
                      { key: 'bank', label: t('exchange.incoming.deliveryDetails.bank'), icon: '🏦' },
                    ].map(m => {
                      const active = (formData.payment_method || 'cash') === m.key;
                      return (
                        <button key={m.key} type="button"
                          onClick={() => handleChange('payment_method', m.key)}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all",
                            active
                              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300"
                          )}
                        >
                          {m.icon} {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fund selection */}
                <div>
                  <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.deliveryDetails.payFrom')}</Label>
                  <Select value={formData.fund_id || ''} onValueChange={v => handleChange('fund_id', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t('exchange.incoming.deliveryDetails.selectFund')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.payment_method === 'bank' ? bankFunds : cashFunds).map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {isAr ? f.name_ar : (f.name_en || f.name_ar)} — {f.currency || 'USD'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ID & notes */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.receiver.idNumber')}</Label>
                    <Input className="h-9 text-sm font-mono" dir="ltr" value={formData.sender_id_number || ''} onChange={e => handleChange('sender_id_number', e.target.value)} placeholder={t('exchange.incoming.receiver.idRequired')} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{t('exchange.incoming.deliveryDetails.deliveryNotes')}</Label>
                    <Input className="h-9 text-sm" value={formData.delivery_city || ''} onChange={e => handleChange('delivery_city', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* ═══ SECTION 3: NOTES ═══ */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
          <SectionHeader
            icon={FileText}
            title={t('exchange.incoming.sections.notes')}
            subtitle={t('exchange.incoming.sections.notesSubtitle')}
            isOpen={openSections.notes}
            onToggle={() => toggleSection('notes')}
          />
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              <Textarea
                className="text-sm min-h-[80px]"
                placeholder={isAr ? 'ملاحظات داخلية...' : 'Internal notes...'}
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

/**
 * AccountingGridLab — صفحة اختبار مكون AccountingGrid
 * بيانات حقيقية: حسابات، عملات، أسعار صرف، مراكز تكلفة من Supabase
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useExchangeRateLookup } from '@/hooks/useExchangeRateLookup';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { preloadAccounts } from '@/components/ui/InlineAccountCell';
import { supabase } from '@/lib/supabase';
import { DevLabNav } from '@/features/componentLab/DevLabNav';
import { AccountingGrid, type GridEditableColumn } from '@/components/ui/accounting-grid';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen, Receipt, CreditCard, Wallet, CheckCircle, AlertCircle, Sparkles
} from 'lucide-react';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

type VoucherType = 'journal' | 'receipt' | 'payment' | 'cash';

interface JournalLine {
  id: string;
  account_id: string;
  account_name: string;
  account_code: string;
  description: string;
  debit: number;
  credit: number;
  cost_center: string;
  currency: string;
  exchange_rate: number;
  link_type: string;
  invoice_id: string;
  current_balance: number;
  receipts: number;
  payments: number;
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export default function AccountingGridLab() {
  const { t, language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  // ─── Real company & currency hooks ───
  const { companyId } = useCompany();
  const { currencyCode: defaultCompanyCurrency } = useCompanyCurrency();
  const { baseCurrency: accBaseCurrency } = useAccountingSettings();
  const { currencyOptions } = useViewCurrency();
  const { lookupRate, lookupRateAsync } = useExchangeRateLookup();

  // ─── Derived company currency (stable) ───
  const companyCurrency = accBaseCurrency || defaultCompanyCurrency || '';
  const companyCurrencyRef = useRef(companyCurrency);
  companyCurrencyRef.current = companyCurrency;

  // ─── Preload accounts IMMEDIATELY ───
  useEffect(() => {
    if (companyId) {
      preloadAccounts(companyId);
    }
  }, [companyId]);

  // ─── Load REAL cost centers from Supabase ───
  const [costCenters, setCostCenters] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('cost_centers')
      .select('id, name_ar, name_en, code')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          setCostCenters(data.map(cc => ({
            value: cc.id,
            label: `${cc.code ? cc.code + ' - ' : ''}${language === 'ar' ? (cc.name_ar || cc.name_en) : (cc.name_en || cc.name_ar)}`
          })));
        }
      });
  }, [companyId, language]);

  // ─── Link type options ───
  const linkTypeOptions = useMemo(() => [
    { value: 'none', label: t('accounting.linkTypes.none') || (isRTL ? 'بدون' : 'None') },
    { value: 'invoice', label: t('accounting.linkTypes.invoice') || (isRTL ? 'فاتورة' : 'Invoice') },
    { value: 'container', label: t('accounting.linkTypes.container') || (isRTL ? 'كونتينر' : 'Container') },
    { value: 'transfer', label: t('accounting.linkTypes.transfer') || (isRTL ? 'حوالة' : 'Transfer') },
  ], [t, isRTL]);

  // ─── Currency select options (REAL from company settings) ───
  const currencySelectOptions = useMemo(() => {
    if (currencyOptions.length > 0) {
      return currencyOptions.map(c => ({ value: c, label: c }));
    }
    if (companyCurrency) {
      return [{ value: companyCurrency, label: companyCurrency }];
    }
    return [];
  }, [currencyOptions, companyCurrency]);

  const [voucherType, setVoucherType] = useState<VoucherType>('journal');
  const [rows, setRows] = useState<JournalLine[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ─── Row factory using REAL company currency (via ref for stability) ───
  const createEmptyLine = useCallback((): JournalLine => ({
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    account_id: '',
    account_name: '',
    account_code: '',
    description: '',
    debit: 0,
    credit: 0,
    cost_center: '',
    currency: companyCurrencyRef.current || '',
    exchange_rate: 1,
    link_type: 'none',
    invoice_id: '',
    current_balance: 0,
    receipts: 0,
    payments: 0,
  }), []); // Stable! Uses ref.

  // ─── Update empty rows when companyCurrency first loads ───
  useEffect(() => {
    if (!companyCurrency) return;
    setRows(prev => {
      if (prev.length === 0) return prev;
      let changed = false;
      const updated = prev.map(row => {
        if (!row.account_id && (!row.currency || row.currency !== companyCurrency)) {
          changed = true;
          return { ...row, currency: companyCurrency };
        }
        return row;
      });
      return changed ? updated : prev;
    });
  }, [companyCurrency]);

  // ═══ Currency → Exchange Rate Sync + Debit/Credit Mutual Exclusion ═══
  const handleCellChange = useCallback((
    rowIndex: number,
    colKey: string,
    newValue: unknown,
    currentRow: JournalLine
  ): JournalLine | void => {

    // ── قاعدة المحاسبة: مدين أو دائن لا الاثنين معاً ──────────────────
    // القيد المحاسبي: إدخال في مدين → يصفّر الدائن، والعكس
    if (colKey === 'debit') {
      const val = Number(newValue) || 0;
      if (val > 0) return { ...currentRow, debit: val, credit: 0 };
    }
    if (colKey === 'credit') {
      const val = Number(newValue) || 0;
      if (val > 0) return { ...currentRow, credit: val, debit: 0 };
    }
    // يومية الصندوق: مقبوضات أو مدفوعات لا الاثنين معاً
    if (colKey === 'receipts') {
      const val = Number(newValue) || 0;
      if (val > 0) return { ...currentRow, receipts: val, payments: 0 };
    }
    if (colKey === 'payments') {
      const val = Number(newValue) || 0;
      if (val > 0) return { ...currentRow, payments: val, receipts: 0 };
    }

    // ── مزامنة العملة مع سعر الصرف ──────────────────────────────────────
    if (colKey === 'currency') {
      const baseCurr = companyCurrencyRef.current;
      const targetCurrency = (newValue as string) || baseCurr;

      if (targetCurrency === baseCurr) {
        return { ...currentRow, currency: targetCurrency, exchange_rate: 1 };
      }

      // Use lookupRate (same as JournalVoucherTab!) → DB rates first
      const rate = lookupRate(targetCurrency, baseCurr);
      const updatedRow = { ...currentRow, currency: targetCurrency, exchange_rate: rate };

      // If rate is 1 (not found in DB), try async online fetch
      if (rate === 1 && targetCurrency !== baseCurr) {
        lookupRateAsync(targetCurrency, baseCurr).then(asyncRate => {
          if (asyncRate && asyncRate !== 1) {
            setRows(prev => prev.map((r, i) =>
              i === rowIndex ? { ...r, exchange_rate: asyncRate } : r
            ));
          }
        });
      }

      return updatedRow;
    }

    // ── تغيير نوع الربط → إفراغ المرجع ───────────────────────────────────
    if (colKey === 'link_type') {
      if (newValue === 'none') {
        return { ...currentRow, link_type: 'none', invoice_id: '' };
      }
    }
  }, [lookupRate, lookupRateAsync]);

  // ═══ Dynamic invoice options based on link_type ═══
  const getInvoiceOptions = useCallback((row: JournalLine) => {
    switch (row.link_type) {
      case 'invoice':
        return [
          { value: 'INV-2024-0045', label: 'INV-0045 | 50,000' },
          { value: 'INV-2024-0046', label: 'INV-0046 | 32,000' },
        ];
      case 'container':
        return [
          { value: 'CNT-2024-001', label: 'CNT-001 | 120,000' },
        ];
      case 'transfer':
        return [
          { value: 'TR-2024-001', label: 'TR-001 | Western Union' },
        ];
      default:
        return [];
    }
  }, []);

  // ═══ Columns based on voucher type ═══
  const columns = useMemo((): ColumnDef<JournalLine>[] => {
    const baseColumns: ColumnDef<JournalLine>[] = [];

    baseColumns.push({
      accessorKey: 'account_id',
      header: t('accounting.columns.account') || (isRTL ? 'الحساب' : 'Account'),
      size: 220,
    });

    if (voucherType === 'journal') {
      baseColumns.push(
        { accessorKey: 'debit', header: t('accounting.columns.debit') || (isRTL ? 'مدين' : 'Debit'), size: 130 },
        { accessorKey: 'credit', header: t('accounting.columns.credit') || (isRTL ? 'دائن' : 'Credit'), size: 130 },
      );
    } else if (voucherType === 'receipt') {
      baseColumns.push(
        { accessorKey: 'receipts', header: t('accounting.columns.receipts') || (isRTL ? 'مقبوضات' : 'Receipts'), size: 150 },
      );
    } else if (voucherType === 'payment') {
      baseColumns.push(
        { accessorKey: 'payments', header: t('accounting.columns.payments') || (isRTL ? 'مدفوعات' : 'Payments'), size: 150 },
      );
    } else if (voucherType === 'cash') {
      baseColumns.push(
        { accessorKey: 'receipts', header: t('accounting.columns.receipts') || (isRTL ? 'مقبوضات' : 'Receipts'), size: 130 },
        { accessorKey: 'payments', header: t('accounting.columns.payments') || (isRTL ? 'مدفوعات' : 'Payments'), size: 130 },
      );
    }

    baseColumns.push(
      { accessorKey: 'description', header: t('accounting.columns.description') || (isRTL ? 'البيان' : 'Description'), size: 200 },
      { accessorKey: 'cost_center', header: t('accounting.columns.costCenter') || (isRTL ? 'م.التكلفة' : 'Cost Center'), size: 130 },
      { accessorKey: 'currency', header: t('accounting.columns.currency') || (isRTL ? 'العملة' : 'Currency'), size: 100 },
      { accessorKey: 'exchange_rate', header: t('accounting.columns.exchangeRate') || (isRTL ? 'سعر الصرف' : 'Rate'), size: 100 },
    );

    if (voucherType !== 'journal') {
      baseColumns.push(
        { accessorKey: 'link_type', header: t('accounting.columns.link') || (isRTL ? 'الربط' : 'Link'), size: 110 },
        { accessorKey: 'invoice_id', header: t('accounting.columns.linkRef') || (isRTL ? 'المرجع' : 'Reference'), size: 200 },
      );
    }

    return baseColumns;
  }, [voucherType, t, isRTL]);

  // ═══ Editable columns configuration ═══
  const editableColumns = useMemo((): GridEditableColumn[] => {
    const cols: GridEditableColumn[] = [
      { key: 'account_id', type: 'account' },
    ];

    if (voucherType === 'journal') {
      cols.push(
        { key: 'debit', type: 'number', min: 0 },
        { key: 'credit', type: 'number', min: 0 },
      );
    } else if (voucherType === 'receipt') {
      cols.push({ key: 'receipts', type: 'number', min: 0 });
    } else if (voucherType === 'payment') {
      cols.push({ key: 'payments', type: 'number', min: 0 });
    } else if (voucherType === 'cash') {
      cols.push(
        { key: 'receipts', type: 'number', min: 0 },
        { key: 'payments', type: 'number', min: 0 },
      );
    }

    cols.push(
      { key: 'description', type: 'text', placeholder: isRTL ? 'البيان...' : 'Description...' },
      { key: 'cost_center', type: 'select', options: [{ value: '', label: '—' }, ...costCenters] },
      { key: 'currency', type: 'select', options: currencySelectOptions },
      { key: 'exchange_rate', type: 'number', min: 0 },
    );

    if (voucherType !== 'journal') {
      cols.push(
        { key: 'link_type', type: 'select', options: linkTypeOptions },
        {
          key: 'invoice_id',
          type: 'select',
          dynamicOptions: (row: JournalLine) => getInvoiceOptions(row),
        },
      );
    }

    return cols;
  }, [voucherType, isRTL, getInvoiceOptions, currencySelectOptions, linkTypeOptions, costCenters]);

  // ═══ Debit/credit keys ═══
  const debitKey = voucherType === 'receipt' ? 'receipts' :
                   voucherType === 'payment' ? 'payments' :
                   voucherType === 'cash' ? 'receipts' : 'debit';
  const creditKey = voucherType === 'receipt' ? 'debit' :
                    voucherType === 'payment' ? 'credit' :
                    voucherType === 'cash' ? 'payments' : 'credit';

  // ═══ Save handler ═══
  const handleSave = useCallback(async (cleanedRows: JournalLine[]) => {
    setSaveStatus('saving');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('💾 Saved:', cleanedRows);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  // ═══ Account balance tracking ═══
  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    for (const row of rows) {
      if (row.account_id && row.current_balance !== undefined && row.current_balance !== null) {
        balances.set(row.account_id, Number(row.current_balance) || 0);
      }
    }
    return balances;
  }, [rows]);

  const fmtAmount = useCallback((amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const renderAccountBalance = useCallback((accountId: string) => {
    const bal = accountBalances.get(accountId);
    if (bal === undefined) return null;
    return (
      <span className={`text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
        bal >= 0
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {fmtAmount(Math.abs(bal))}
      </span>
    );
  }, [accountBalances, fmtAmount]);

  // ═══ Voucher type config ═══
  const voucherTypeConfig = useMemo(() => ({
    journal: { icon: BookOpen, label: t('accounting.journalEntry') || (isRTL ? 'قيد محاسبي' : 'Journal Entry'), color: 'bg-blue-500' },
    receipt: { icon: Receipt, label: t('accounting.receipt') || (isRTL ? 'سند قبض' : 'Receipt'), color: 'bg-emerald-500' },
    payment: { icon: CreditCard, label: t('accounting.paymentVoucher') || (isRTL ? 'سند صرف' : 'Payment'), color: 'bg-red-500' },
    cash: { icon: Wallet, label: t('accounting.cashJournal') || (isRTL ? 'يومية صندوق' : 'Cash Journal'), color: 'bg-amber-500' },
  }), [t, isRTL]);

  const currentConfig = voucherTypeConfig[voucherType];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={direction}>
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-erp-teal" />
              {isRTL ? 'مختبر AccountingGrid' : 'AccountingGrid Lab'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
              {isRTL
                ? `بيانات حقيقية — عملة الشركة: ${companyCurrency || '...'} | ${currencyOptions.length} عملات | ${costCenters.length} مراكز تكلفة`
                : `Real data — Currency: ${companyCurrency || '...'} | ${currencyOptions.length} currencies | ${costCenters.length} cost centers`}
            </p>
          </div>

          {/* Save status */}
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 animate-pulse">
                {isRTL ? '⏳ جاري الحفظ...' : '⏳ Saving...'}
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle className="w-3 h-3 mr-1" /> {isRTL ? 'تم الحفظ' : 'Saved'}
              </Badge>
            )}
            {saveStatus === 'error' && (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <AlertCircle className="w-3 h-3 mr-1" /> {isRTL ? 'خطأ في الحفظ' : 'Save Error'}
              </Badge>
            )}
          </div>
        </div>

        {/* Lab Navigation */}
        <DevLabNav currentLabId="grid-lab" />

        {/* Voucher Type Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'نوع السند:' : 'Voucher Type:'}
            </span>
            <div className="flex gap-2">
              {(Object.entries(voucherTypeConfig) as [VoucherType, typeof currentConfig][]).map(([key, config]) => {
                const Icon = config.icon;
                const isActive = voucherType === key;
                return (
                  <Button
                    key={key}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'gap-2 transition-all',
                      isActive && config.color + ' text-white hover:opacity-90 border-0'
                    )}
                    onClick={() => {
                      setVoucherType(key);
                      setRows([]);
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>

            <Badge variant="outline" className="text-xs gap-1 text-gray-500">
              <CurrentIcon className="w-3 h-3" />
              {isRTL ? `${columns.length} أعمدة` : `${columns.length} columns`}
              {' | '}
              {isRTL ? `${editableColumns.length} قابلة للتعديل` : `${editableColumns.length} editable`}
            </Badge>
          </div>

          <div className="flex gap-3 mt-3 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">✅ Controlled State</Badge>
            <Badge variant="secondary" className="text-[10px]">⌨️ 18 {isRTL ? 'اختصار' : 'shortcuts'}</Badge>
            <Badge variant="secondary" className="text-[10px]">💱 {isRTL ? 'أسعار صرف حقيقية' : 'Real exchange rates'}</Badge>
            <Badge variant="secondary" className="text-[10px]">🏦 {isRTL ? `${companyCurrency || '...'}` : `Base: ${companyCurrency || '...'}`}</Badge>
            <Badge variant="secondary" className="text-[10px]">🌍 10 {isRTL ? 'لغات' : 'languages'}</Badge>
            {voucherType === 'journal' && (
              <Badge variant="secondary" className="text-[10px]">⚖️ {isRTL ? 'موازنة (* + Enter)' : 'Balance (* + Enter)'}</Badge>
            )}
          </div>
        </div>

        {/* ═══ THE GRID ═══ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <AccountingGrid<JournalLine>
            rows={rows}
            onChange={setRows}
            columns={columns}
            editableColumns={editableColumns}
            onCellChange={handleCellChange}
            onAddRow={createEmptyLine}
            onSave={handleSave}
            debitKey={debitKey}
            creditKey={creditKey}
            enableBalanceShortcut={voucherType === 'journal'}
            showTotalsFooter={true}
            showAmountInWords={true}
            showKeyboardHelp={true}
            canDeleteRows={true}
            isRTL={isRTL}
            maxHeight="450px"
            initialEmptyRows={10}
            emptyRowsThreshold={3}
            autoAddRowsCount={5}
            companyId={companyId}
            currencyKey="currency"
            renderAccountBalance={renderAccountBalance}
          />
        </div>

        {/* Debug panel */}
        <details className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <summary className="px-4 py-2 text-sm font-medium cursor-pointer text-gray-600 dark:text-gray-400">
            🔍 {isRTL ? 'بيانات التصحيح (Debug)' : 'Debug Data'}
          </summary>
          <div className="p-4 overflow-auto max-h-64">
            <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono" dir="ltr">
              {JSON.stringify(
                rows.filter(r => r.account_id || r.debit || r.credit || r.receipts || r.payments),
                null,
                2
              )}
            </pre>
          </div>
        </details>

        {/* Test scenarios */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
            🧪 {isRTL ? 'سيناريوهات الاختبار' : 'Test Scenarios'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">🏦 {isRTL ? 'الحسابات' : 'Accounts'}</div>
              <div>1. {isRTL ? 'انقر على خلية الحساب' : 'Click on account cell'}</div>
              <div>2. {isRTL ? 'اكتب اسم أو رقم الحساب' : 'Type account name or code'}</div>
              <div>3. {isRTL ? 'اختر من القائمة — رصيد الحساب يظهر' : 'Select — balance badge appears'}</div>
            </div>
            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">💱 {isRTL ? 'تزامن العملة' : 'Currency Sync'}</div>
              <div>1. {isRTL ? 'غيّر العملة إلى USD أو EUR' : 'Change currency to USD or EUR'}</div>
              <div>2. {isRTL ? 'سعر الصرف يتغير فوراً' : 'Rate changes instantly'}</div>
            </div>
            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">⚖️ {isRTL ? 'الموازنة' : 'Balance'}</div>
              <div>1. {isRTL ? 'اكتب * في خلية مدين أو دائن' : 'Type * in debit or credit cell'}</div>
              <div>2. {isRTL ? 'اضغط Enter لحساب الفرق تلقائياً' : 'Press Enter for auto-balance'}</div>
            </div>
            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">⌨️ {isRTL ? 'اختصارات' : 'Shortcuts'}</div>
              <div>• {isRTL ? '= + Enter → نسخ من فوق + أسفل' : '= + Enter → Copy above + move down'}</div>
              <div>• {isRTL ? 'Ctrl+D → نسخ من فوق' : 'Ctrl+D → Copy from above'}</div>
              <div>• {isRTL ? 'Tab/Enter → الخلية التالية' : 'Tab/Enter → Next cell'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

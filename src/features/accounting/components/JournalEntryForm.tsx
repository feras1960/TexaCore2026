import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Calendar as CalendarIcon,
  FileText,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Hash,
  Keyboard,
  Loader2,
  Clock,
  User,
  Ban,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  Wallet
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { SmartAccountSelector } from './shared/SmartAccountSelector';
import { currencies, costCenters } from '../data/accountingData';
import { supabase } from '@/lib/supabase';
import { getModifierKeyLabel } from '@/hooks/useLanguageShortcuts';
import { toast } from 'sonner';
import QRCodeDisplay from './QRCodeDisplay';
import JournalEntryGrid, { JournalEntryGridRef } from './JournalEntryGrid'; // Import Interface
import { useAccountingSettings } from '@/hooks/useAccountingSettings';

// --- Interfaces ---
interface JournalEntryRow {
  id: number;
  debit: number | '';
  credit: number | '';
  accountId: string;
  description: string;
  currency: string;
  exchangeRate: number;
  costCenter: string;
  accountName?: string;
  accountCode?: string;
  costCenterName?: string;
}

interface JournalEntryFormProps {
  isActive?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onVoucherNoChange?: (voucherNo: string) => void;
  // Edit/View mode props
  editMode?: boolean;
  readOnly?: boolean;
  entryId?: string | null;
  initialData?: any;
  onUpdate?: () => void;
  defaultVoucherType?: string;
}

export default function JournalEntryForm({
  isActive = true,
  onDirtyChange,
  onSave,
  onCancel,
  onVoucherNoChange,
  editMode = false,
  readOnly = false,
  entryId = null,
  initialData = null,
  onUpdate,
  defaultVoucherType = 'journal',
}: JournalEntryFormProps) {
  const { t, language, direction } = useLanguage();
  const modifierKey = getModifierKeyLabel('ctrl');
  const { companyId } = useCompany();
  const { autoPost } = useAccountingSettings();

  // Refs
  const gridRef = useRef<JournalEntryGridRef>(null);

  // Form State
  const [date, setDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<JournalEntryRow[]>([
    { id: Date.now(), debit: '', credit: '', accountId: '', description: '', currency: 'SAR', exchangeRate: 1, costCenter: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [voucherNo, setVoucherNo] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [metaData, setMetaData] = useState<any>({});
  const [voucherType, setVoucherType] = useState<string>(defaultVoucherType);
  const [headerAccountId, setHeaderAccountId] = useState<string>(''); // For Receipt/Payment/Transfer

  // Voucher Types Options
  const voucherTypes = [
    { value: 'journal', labelAr: t('accounting.entryTypes.journal'), labelEn: 'Journal Entry', icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { value: 'receipt', labelAr: t('accounting.entryTypes.receipt'), labelEn: 'Receipt', icon: ArrowDownRight, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'payment', labelAr: t('accounting.entryTypes.payment'), labelEn: 'Payment', icon: ArrowUpRight, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { value: 'cash', labelAr: t('accounting.entryTypes.cash'), labelEn: 'Cash Journal', icon: Wallet, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'transfer', labelAr: 'تحويل', labelEn: 'Transfer', icon: ArrowRightLeft, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { value: 'exchange', labelAr: t('accounting.exchange'), labelEn: 'Exchange', icon: RefreshCw, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  ];

  // --- Calculations ---
  // Note: 'rows' state is now primarily for initial load and dashboard stats. 
  // 'handleSave' will pull authoritative data from the gridRef.
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      debit: acc.debit + (Number(row.debit) || 0),
      credit: acc.credit + (Number(row.credit) || 0)
    }), { debit: 0, credit: 0 });
  }, [rows]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  // --- Effects ---

  // Load Initial Data
  useEffect(() => {
    if (initialData) {
      const entryDate = initialData.entry_date ? new Date(initialData.entry_date) : new Date();
      setDate(entryDate);

      setReference(initialData.reference || initialData.entry_number || initialData.voucher_no || '');
      setDescription(initialData.description || '');
      setVoucherNo(initialData.entry_number || initialData.voucher_no || '');
      setVoucherNo(initialData.entry_number || initialData.voucher_no || '');
      setStatus(initialData.status || 'draft');
      setVoucherType(initialData.voucher_type || initialData.type || defaultVoucherType);
      setMetaData({
        created_at: initialData.created_at,
        created_by_user: initialData.created_by_user,
        updated_at: initialData.updated_at
      });

      const loadedRows: JournalEntryRow[] = initialData.lines?.map((line: any, index: number) => ({
        id: Date.now() + index,
        accountId: line.account_id || '',
        debit: line.debit || '',
        credit: line.credit || '',
        description: line.description || '',
        currency: 'SAR',
        exchangeRate: 1,
        costCenter: line.cost_center_id?.id || line.cost_center_id || '',
        accountName: line.account?.name_ar || line.account?.name_en,
        accountCode: line.account?.code,
        costCenterName: line.cost_center?.name,
      })) || [];

      if (loadedRows.length > 0) {
        setRows(loadedRows);
      }
    } else {
      if (!readOnly && !editMode) {
        setDate(new Date());
        setReference('');
        setDescription('');
        // INITIALIZE WITH 30 EMPTY ROWS for "Excel-like" experience
        const initialRows: JournalEntryRow[] = Array.from({ length: 30 }, (_, i) => ({
          id: Date.now() + i,
          debit: '',
          credit: '',
          accountId: '',
          description: '',
          currency: 'SAR',
          exchangeRate: 1,
          costCenter: ''
        }));
        setRows(initialRows);
        setStatus(autoPost ? 'posted' : 'draft');
        setVoucherNo('');
      }
    }
  }, [initialData, readOnly, editMode, autoPost]);

  // Update dirty state
  useEffect(() => {
    if (!onDirtyChange) return;
    if (readOnly) {
      onDirtyChange(false);
      return;
    }
    const isDirty = rows.some(r => r.accountId || r.debit || r.credit || r.description) ||
      description !== '' ||
      reference !== '';
    onDirtyChange(isDirty);
  }, [rows, description, reference, readOnly, onDirtyChange]);


  // --- Handlers ---
  const handleAddRow = () => {
    if (readOnly) return;
    // Add 10 rows at a time for infinite feel
    const newRows: JournalEntryRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      debit: '',
      credit: '',
      accountId: '',
      description: '',
      currency: 'SAR',
      exchangeRate: 1,
      costCenter: ''
    }));

    setRows(prev => [...prev, ...newRows]);
  };

  const handleSave = async () => {
    if (readOnly) return;
    if (!companyId) {
      toast.error(t('common.error'), { description: t('errors.companyRequired') });
      return;
    }

    // 1. GET DATA DIRECTLY FROM GRID (Bypassing State Lag)
    const gridData = gridRef.current?.getAllRows() || rows;

    // Recalculate totals based on GRID data
    // Recalculate totals based on GRID data
    const currentTotals = gridData.reduce((acc, row) => {
      // Special mapping for single column 'amount'
      let d = 0, c = 0;
      if (voucherType === 'receipt') {
        // Grid has 'amount', which means CREDIT for the payer
        c = Number(row.amount || row.credit) || 0;
        d = Number(row.debit) || 0;
      } else if (voucherType === 'payment') {
        // Grid has 'amount', which means DEBIT for the expense/payee
        d = Number(row.amount || row.debit) || 0;
        c = Number(row.credit) || 0;
      } else {
        d = Number(row.debit) || 0;
        c = Number(row.credit) || 0;
      }
      return { debit: acc.debit + d, credit: acc.credit + c };
    }, { debit: 0, credit: 0 });


    // --- SPECIAL LOGIC: Auto-Balance for Receipt/Payment ---
    let finalRows = [...gridData];

    if (voucherType === 'receipt' || voucherType === 'payment') {
      if (!headerAccountId) {
        toast.error('Missing Account', { description: voucherType === 'receipt' ? 'Please select the Deposit To account' : 'Please select the Pay From account' });
        return;
      }

      // Calculate needed balancing amount
      const gridTotal = voucherType === 'receipt' ? currentTotals.credit : currentTotals.debit;

      // Add the Header Account Line
      const balancingLine: JournalEntryRow = {
        id: Date.now(), // Temporary ID
        accountId: headerAccountId,
        description: description || (voucherType === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher'),
        currency: 'SAR',
        exchangeRate: 1,
        costCenter: '',
        debit: voucherType === 'receipt' ? gridTotal : 0, // Receipt: Box is Debit
        credit: voucherType === 'payment' ? gridTotal : 0, // Payment: Box is Credit
      };

      finalRows.push(balancingLine);

      // Update totals for validation
      if (voucherType === 'receipt') currentTotals.debit += gridTotal;
      else currentTotals.credit += gridTotal;
    }

    const currentIsBalanced = Math.abs(currentTotals.debit - currentTotals.credit) < 0.01;

    // Validation
    if (!currentTotals.debit || !currentTotals.credit || !currentIsBalanced) {
      toast.error(t('accounting.errors.saveFailed'), { description: 'Entry must be balanced and not empty' });
      return;
    }

    const validRows = gridData.filter((r: JournalEntryRow) => r.accountId && (r.debit || r.credit));
    if (validRows.length < 2) {
      toast.error(t('accounting.errors.saveFailed'), { description: 'At least 2 valid lines required' });
      return;
    }

    setIsSaving(true);
    try {
      const journalEntriesService = (await import('@/services/journalEntriesService')).default;

      const entryData = {
        company_id: companyId,
        entry_date: format(date, 'yyyy-MM-dd'),
        reference,
        description,
        status: status || 'draft',
        entry_type: voucherType, // Save selected type
        lines: validRows.map((row: JournalEntryRow) => ({
          account_id: row.accountId,
          description: row.description,
          debit: Number(row.debit) || 0,
          credit: Number(row.credit) || 0,
          cost_center_id: row.costCenter || null,
        }))
      };

      if (editMode && entryId) {
        await journalEntriesService.update(entryId, entryData);
        toast.success(t('common.success'));
        if (onUpdate) onUpdate();
      } else {
        await journalEntriesService.create(entryData);
        toast.success(t('common.success'));
        onSave();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('accounting.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };


  // --- UI Helpers ---
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'posted': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      default: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'posted': return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />;
      case 'draft': return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">

      {/* 1. Dashboard / Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pb-2">
        {/* Status */}
        <Card className={cn("p-4 flex flex-col items-center justify-center gap-2 border shadow-sm", getStatusColor(status))}>
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <span className="font-bold text-lg capitalize">{status}</span>
          </div>
          <span className="text-xs opacity-70">{t('accounting.entryStatus')}</span>
        </Card>

        {/* Count */}
        <Card className="p-4 flex flex-col items-center justify-center gap-2 border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <FileText className="w-5 h-5" />
            <span className="font-bold text-lg">{rows.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">{t('accounting.lines')}</span>
        </Card>

        {/* Total Debit */}
        <Card className="p-4 flex flex-col items-center justify-center gap-2 border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
          <span className="font-bold text-lg text-green-600 dark:text-green-500 font-mono">
            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totals.debit)}
          </span>
          <span className="text-xs text-muted-foreground">{t('accounting.debit')}</span>
        </Card>

        {/* Total Credit */}
        <Card className="p-4 flex flex-col items-center justify-center gap-2 border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
          <span className="font-bold text-lg text-red-600 dark:text-red-500 font-mono">
            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totals.credit)}
          </span>
          <span className="text-xs text-muted-foreground">{t('accounting.credit')}</span>
        </Card>
      </div>

      {/* --- DYNAMIC HEADER SECTION --- */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">

        {/* PREMIUM VOUCHER TABS */}
        {!readOnly && (
          <div className="flex items-center justify-center p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-4xl mx-auto mb-4">
            {voucherTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = voucherType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setVoucherType(type.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isSelected
                      ? cn("shadow-sm ring-1 ring-black/5", type.color)
                      : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isSelected ? "opacity-100" : "opacity-70")} />
                  <span>{type.labelAr}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Header Fields Section */}
        <div className="grid grid-cols-12 gap-6 mb-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex-none">

          {/* ROW 1: Voucher Info */}
          <div className="col-span-12 md:col-span-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">{t('accounting.voucherNumber')}</Label>
            {readOnly ? (
              <div className="font-mono text-sm font-bold bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-md border text-center">{voucherNo || '-'}</div>
            ) : (
              <Input
                value={voucherNo}
                onChange={(e) => {
                  setVoucherNo(e.target.value);
                  onVoucherNoChange?.(e.target.value);
                }}
                className="font-mono text-center bg-gray-50/50 border-dashed focus:border-solid transition-all"
                placeholder="Auto"
              />
            )}
          </div>

          <div className="col-span-12 md:col-span-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">{t('accounting.entry.date')}</Label>
            <Popover>
              <PopoverTrigger asChild disabled={readOnly}>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 bg-gray-50/30",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {date ? format(date, "PPP", { locale: language === 'ar' ? ar : undefined }) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* DYNAMIC FIELD: Box/Bank for Receipt/Payment */}
          {(voucherType === 'receipt' || voucherType === 'payment') && (
            <div className="col-span-12 md:col-span-4 animate-in fade-in zoom-in-95 duration-200">
              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                {voucherType === 'receipt' ? <ArrowDownRight className="w-3 h-3 text-green-500" /> : <ArrowUpRight className="w-3 h-3 text-red-500" />}
                {voucherType === 'receipt' ? t('accounting.receipt.fund') : t('accounting.payment.fund')}
              </Label>
              {!readOnly ? (
                <SmartAccountSelector
                  value={headerAccountId}
                  onChange={(id) => setHeaderAccountId(id)}
                  placeholder="اختر حساب الصندوق أو البنك..."
                  className="bg-yellow-50/50 border-yellow-200 focus:ring-yellow-200"
                />
              ) : (
                <div className="h-10 border rounded-md px-3 flex items-center bg-gray-50 text-sm font-medium">
                  {/* We would need to resolve the name here if readonly, for now just ID or placeholder */}
                  {headerAccountId || '-'}
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC FIELD: Reference (shifts size based on other fields) */}
          <div className={cn("col-span-12", (voucherType === 'receipt' || voucherType === 'payment') ? "md:col-span-2" : "md:col-span-6")}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">{t('accounting.entry.reference')}</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="رقم الفاتورة، شيك..."
              readOnly={readOnly}
              className="bg-gray-50/30"
            />
          </div>

          {/* ROW 2: Description (Full Width) */}
          <div className="col-span-12">
            <Label className="text-xs text-muted-foreground mb-1.5 block">{t('accounting.entry.description')}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('accounting.entry.description')}
              readOnly={readOnly}
              className={cn("bg-gray-50/30", description ? "font-medium" : "")}
            />
          </div>
        </div>

        {/* --- GRID SECTION --- */}
        <div className="flex-1 flex flex-col min-h-[400px] border rounded-lg shadow-sm bg-white dark:bg-gray-800 overflow-hidden">

          {/* Grid Toolbar */}
          <div className="p-3 border-b flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20 flex-none">
            <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <FileText className="w-4 h-4" />
              {t('accounting.entryLines')}
            </h3>
            {!readOnly && (
              <Button onClick={handleAddRow} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                {t('accounting.addRow')}
              </Button>
            )}
          </div>

          {/* AG Grid Container */}
          <div className="flex-1 w-full relative">
            <JournalEntryGrid
              ref={gridRef}
              rowData={rows}
              onDataChange={setRows}
              readOnly={readOnly}
              voucherType={voucherType}
              onAddRows={handleAddRow}
              companyId={companyId}
            />
          </div>

          {/* Footer Totals */}
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between flex-none">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('common.total')}</span>
                <div className="flex items-center gap-4 text-lg font-bold font-mono">
                  <span className="text-green-600">{totals.debit.toFixed(2)}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-red-600">{totals.credit.toFixed(2)}</span>
                </div>
              </div>

              <div>
                {!isBalanced && !readOnly ? (
                  <Badge variant="destructive" className="animate-pulse">
                    {t('accounting.notBalanced')}: {Math.abs(totals.debit - totals.credit).toFixed(2)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t('accounting.balanced')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info (Only View Mode) */}
        {readOnly && metaData.created_at && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-2 flex-none">
            <div className="flex items-center gap-4">
              <span>{t('common.createdAt')}: {format(new Date(metaData.created_at), 'dd/MM/yyyy HH:mm')}</span>
              <span>{t('common.by')}: {metaData.created_by_user?.name || t('common.systemUser')}</span>
            </div>
          </div>
        )}

      </div>

      {/* Save Action Bar (Create/Edit Mode Only) */}
      {!readOnly && (
        <div className="p-4 border-t bg-white dark:bg-gray-800 flex justify-end gap-3 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="outline" onClick={onCancel} className="min-w-[100px]">
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px] gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('actions.save')}
          </Button>
        </div>
      )}
    </div>
  );
}

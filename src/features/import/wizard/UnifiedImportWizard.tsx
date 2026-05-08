/**
 * ════════════════════════════════════════════════════════════════
 * 📥 UnifiedImportWizard — معالج الاستيراد الموحد
 * ════════════════════════════════════════════════════════════════
 * 6-step wizard supporting RSF, TCDB, and Excel imports.
 * Works for both cloud and local versions.
 * @module features/import/wizard
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileUp, FileCheck2, Eye, CheckSquare, Loader2, Trophy,
  ArrowRight, ArrowLeft, X, AlertTriangle, Lock, Upload,
  FileSpreadsheet, Database, ChevronRight, Shield, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/app/providers/LanguageProvider';

import {
  detectFileType, getConverter,
  type ImportSource, type UnifiedImportData, type ImportSelections,
  type ImportProgress, type ImportResult, type AccountReadiness, type ImportMode,
} from '../core';
import { checkAccountReadiness, importData, matchAccounts } from '../core/cloud-importer';
import { getTcdbFileInfo } from '../core/tcdb-to-unified';
import { AccountsPreview, PartyPreview, MaterialsPreview, JournalEntriesPreview, CurrenciesPreview, CostCentersPreview, WarehousesPreview, PurchaseInvoicesPreview, SalesInvoicesPreview } from './DataPreviewPanels';

// ─── Types ───────────────────────────────────────────────────
type WizardStep = 'source' | 'upload' | 'preview' | 'select' | 'execute' | 'summary';

const STEPS: WizardStep[] = ['source', 'upload', 'preview', 'select', 'execute', 'summary'];

const SOURCE_OPTIONS = [
  { id: 'rsf' as ImportSource, icon: '📋', labelAr: 'الرشيد', labelEn: 'Al-Rashid', ext: '.rsf', color: 'from-amber-500 to-orange-600' },
  { id: 'tcdb' as ImportSource, icon: '💾', labelAr: 'TexaCore', labelEn: 'TexaCore Backup', ext: '.tcdb', color: 'from-blue-500 to-indigo-600' },
  { id: 'excel' as ImportSource, icon: '📄', labelAr: 'Excel / CSV', labelEn: 'Excel / CSV', ext: '.xlsx,.csv', color: 'from-green-500 to-emerald-600' },
];

interface Props {
  onClose: () => void;
  onComplete?: () => void;
}

export default function UnifiedImportWizard({ onClose, onComplete }: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { company, tenantId } = useCompany();
  const isAr = language === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── State ─────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('source');
  const [source, setSource] = useState<ImportSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<UnifiedImportData | null>(null);
  const [readiness, setReadiness] = useState<AccountReadiness | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const [selections, setSelections] = useState<Record<string, boolean>>({
    chartOfAccounts: true, costCenters: true, currencies: true,
    warehouses: true, companySettings: true,
    customers: true, suppliers: true, materials: true,
    journalEntries: true, purchaseInvoices: true, salesInvoices: true,
    vouchers: false, inventoryMovements: false,
  });
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});
  const [existingAccounts, setExistingAccounts] = useState<{code: string; name: string; nameAr: string; parentCode: string | null; isGroup: boolean}[]>([]);

  const stepIndex = STEPS.indexOf(step);

  // ─── Handlers ──────────────────────────────────────────

  const handleSourceSelect = (s: ImportSource) => {
    setSource(s);
    setStep('upload');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file || !source) return;
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();

      // Auto-detect if source doesn't match
      const detected = detectFileType(buffer);
      const actualSource = detected !== 'unknown' ? detected : source;

      const converter = getConverter(actualSource);
      if (!converter) throw new Error('محوّل غير متاح لهذا النوع');

      const validation = await converter.validateFile(buffer);
      if (!validation.valid) throw new Error(validation.error || 'ملف غير صالح');

      const data = await converter.parse(buffer, {
        fileName: file.name,
        password: password || undefined,
      }, setProgress);

      setParsedData(data);

      // Check account readiness
      if (company?.id) {
        const ready = await checkAccountReadiness(company.id);
        setReadiness(ready);
        setImportMode(ready.isEmpty ? 'full' : 'partial');

        // Load existing chart of accounts for merged tree preview
        const { supabase } = await import('@/lib/supabase');
        const { data: existingAccts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, name_ar, name_en, parent_id, is_group')
          .eq('company_id', company.id)
          .order('account_code');
        const accts = existingAccts || [];
        // Build id→code map to resolve parent codes
        const idToCode: Record<string, string> = {};
        for (const a of accts) idToCode[a.id] = a.account_code;
        setExistingAccounts(accts.map(a => ({
          code: a.account_code,
          name: a.name_en || a.name_ar || '',
          nameAr: a.name_ar || a.name_en || '',
          parentCode: a.parent_id ? (idToCode[a.parent_id] || null) : null,
          isGroup: a.is_group,
        })));
      }

      setStep('preview');
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !company?.id || !tenantId) return;
    setStep('execute');
    setLoading(true);
    try {
      const sel: ImportSelections = {
        mode: importMode,
        include: {
          chartOfAccounts: selections.chartOfAccounts,
          costCenters: importMode === 'full' && selections.costCenters,
          currencies: importMode === 'full' && selections.currencies,
          warehouses: importMode === 'full' && selections.warehouses,
          companySettings: importMode === 'full' && selections.companySettings,
          customers: selections.customers,
          suppliers: selections.suppliers,
          materials: selections.materials,
          journalEntries: selections.journalEntries,
          purchaseInvoices: selections.purchaseInvoices,
          salesInvoices: selections.salesInvoices,
          vouchers: selections.vouchers,
          inventoryMovements: selections.inventoryMovements,
        },
      };

      const res = await importData(parsedData, sel, tenantId, company.id, company.id, setProgress);
      setResult(res);
      setStep('summary');
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isAr ? 'معالج استيراد البيانات' : 'Data Import Wizard'}
            </h2>
            <p className="text-xs text-gray-500">
              {isAr ? 'استيراد من الرشيد أو TexaCore أو Excel' : 'Import from Rashid, TexaCore, or Excel'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.slice(0, -1).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          </React.Fragment>
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          {/* ① Source Selection */}
          {step === 'source' && (
            <div className="space-y-4">
              <h3 className="font-semibold">{isAr ? 'اختر مصدر البيانات' : 'Select Data Source'}</h3>
              <div className="grid grid-cols-3 gap-4">
                {SOURCE_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => handleSourceSelect(opt.id)}
                    className="group p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:shadow-lg transition-all text-center space-y-3">
                    <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {opt.icon}
                    </div>
                    <div className="font-semibold text-sm">{isAr ? opt.labelAr : opt.labelEn}</div>
                    <Badge variant="outline" className="text-[10px]">{opt.ext}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ② File Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <h3 className="font-semibold">{isAr ? 'رفع الملف' : 'Upload File'}</h3>

              <div onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" className="hidden"
                  accept={SOURCE_OPTIONS.find(o => o.id === source)?.ext || '*'}
                  onChange={handleFileSelect} />
                {file ? (
                  <div className="space-y-2">
                    <FileCheck2 className="w-10 h-10 mx-auto text-green-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500">{isAr ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag file here or click to browse'}</p>
                  </div>
                )}
              </div>

              {source === 'tcdb' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? 'كلمة المرور (للتشفير)' : 'Password (for decryption)'}</label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}

              {loading && progress && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{progress.label}</p>
                  <Progress value={progress.overallPercent} />
                </div>
              )}

              <div className="flex gap-3 justify-between">
                <Button variant="outline" onClick={() => { setStep('source'); setFile(null); }}>
                  <ArrowLeft className="w-4 h-4 me-1" /> {isAr ? 'رجوع' : 'Back'}
                </Button>
                <Button onClick={handleParse} disabled={!file || loading}
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Eye className="w-4 h-4 me-1" />}
                  {isAr ? 'معاينة البيانات' : 'Preview Data'}
                </Button>
              </div>
            </div>
          )}

          {/* ③ Preview */}
          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{isAr ? 'معاينة البيانات' : 'Data Preview'}</h3>
                <Badge className="bg-green-100 text-green-700 text-[10px]">
                  {parsedData.metadata.companyName}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: isAr ? 'حسابات' : 'Accounts', count: parsedData.counts.accounts, icon: '🌳' },
                  { label: isAr ? 'عملاء' : 'Customers', count: parsedData.counts.customers, icon: '👥' },
                  { label: isAr ? 'موردين' : 'Suppliers', count: parsedData.counts.suppliers, icon: '🏭' },
                  { label: isAr ? 'مواد' : 'Materials', count: parsedData.counts.materials, icon: '📦' },
                  { label: isAr ? 'قيود' : 'Entries', count: parsedData.counts.journalEntries, icon: '📋' },
                  { label: isAr ? 'مشتريات' : 'Purchases', count: parsedData.counts.purchaseInvoices, icon: '🧾' },
                  { label: isAr ? 'مبيعات' : 'Sales', count: parsedData.counts.salesInvoices, icon: '💰' },
                  { label: isAr ? 'سندات' : 'Vouchers', count: parsedData.counts.vouchers, icon: '📄' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-center">
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className="text-lg font-bold">{item.count.toLocaleString()}</div>
                    <div className="text-[11px] text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ArrowLeft className="w-4 h-4 me-1" /> {isAr ? 'رجوع' : 'Back'}
                </Button>
                <Button onClick={() => setStep('select')} className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
                  {isAr ? 'اختيار البيانات' : 'Select Data'} <ArrowRight className="w-4 h-4 ms-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ④ Select Mode & Data */}
          {step === 'select' && parsedData && (
            <div className="space-y-4">
              <h3 className="font-semibold">{isAr ? 'اختيار نوع الاستيراد' : 'Select Import Type'}</h3>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setImportMode('full')} disabled={!readiness?.isEmpty}
                  className={`p-4 rounded-xl border-2 text-start transition-all ${importMode === 'full' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'} ${!readiness?.isEmpty ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-sm">{isAr ? 'استيراد كامل' : 'Full Import'}</span>
                    {!readiness?.isEmpty && <Lock className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <p className="text-[11px] text-gray-500">{isAr ? 'حذف الشجرة الحالية واستبدالها بالكامل' : 'Replace entire chart of accounts'}</p>
                </button>

                <button onClick={() => setImportMode('partial')}
                  className={`p-4 rounded-xl border-2 text-start transition-all ${importMode === 'partial' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-sm">{isAr ? 'استيراد جزئي' : 'Partial Import'}</span>
                    <Badge className="bg-green-100 text-green-700 text-[9px]">{isAr ? 'متاح دائماً' : 'Always available'}</Badge>
                  </div>
                  <p className="text-[11px] text-gray-500">{isAr ? 'إضافة الحسابات والبيانات الجديدة فقط' : 'Add new accounts and data only'}</p>
                </button>
              </div>

              {!readiness?.isEmpty && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-700 space-y-0.5">
                    <p className="font-medium">{isAr ? 'الاستيراد الكامل غير متاح' : 'Full import unavailable'}</p>
                    <p>{isAr
                      ? 'لا يمكن استبدال الشجرة المحاسبية لأنها مرتبطة بقيود وفواتير موجودة. استخدم الاستيراد الجزئي لإضافة حسابات وبيانات جديدة بأمان.'
                      : 'Cannot replace chart of accounts because it is linked to existing entries and invoices. Use partial import to safely add new accounts and data.'
                    }</p>
                    <div className="flex gap-3 mt-1 text-[10px]">
                      <span>📊 {isAr ? `${readiness?.details.accountsCount} حساب` : `${readiness?.details.accountsCount} accounts`}</span>
                      <span>📋 {isAr ? `${readiness?.details.journalEntriesCount} قيد` : `${readiness?.details.journalEntriesCount} entries`}</span>
                      <span>👥 {isAr ? `${readiness?.details.customersCount} عميل` : `${readiness?.details.customersCount} customers`}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Checkboxes with Expandable Previews */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-gray-500">{isAr ? 'البيانات المُستوردة — انقر 👁 لمعاينة المحتوى:' : 'Data to import — click 👁 to preview:'}</p>
                  {parsedData.currencies && parsedData.currencies.length > 0 && (() => {
                    const base = parsedData.currencies.find(c => c.isBaseCurrency);
                    // Only show foreign currencies with a real exchange rate (rate > 1)
                    const foreign = parsedData.currencies.filter(c => !c.isBaseCurrency && c.rate && c.rate > 1);
                    return (
                      <div className="flex gap-1.5 items-center">
                        {base && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-semibold" title={isAr ? 'العملة المحلية — جميع الأرقام بهذه العملة' : 'Base currency — all amounts in this currency'}>
                            💰 {isAr ? 'العملة المحلية' : 'Base'}: {base.nameAr || base.name} ({base.code})
                          </span>
                        )}
                        {foreign.map(c => (
                          <span key={`${c.code}-${c.rate}`} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-medium" title={isAr ? `سعر الصرف: 1 ${c.code} = ${c.rate} ${base?.code || ''}` : `Rate: 1 ${c.code} = ${c.rate} ${base?.code || ''}`}>
                            🔄 {c.nameAr || c.name} ({c.code}) — {isAr ? 'سعر الصرف' : 'Rate'}: {c.rate}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* ─── Chart of Accounts ─── */}
                {parsedData.counts.accounts > 0 && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 dark:bg-indigo-900/10 dark:border-indigo-800 overflow-hidden">
                    <div className="flex items-center gap-3 p-2.5">
                      <input type="checkbox" checked={selections.chartOfAccounts ?? false}
                        onChange={e => setSelections(p => ({ ...p, chartOfAccounts: e.target.checked }))}
                        className="rounded border-gray-300" />
                      <span className="text-xl">🌳</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{isAr ? 'شجرة الحسابات' : 'Chart of Accounts'}</span>
                        <p className="text-[10px] text-gray-500">
                          {importMode === 'full'
                            ? (isAr ? 'استبدال الشجرة بالكامل' : 'Replace entire chart')
                            : (isAr ? 'تحليل ذكي: إضافة الجديدة وتخطي الموجودة' : 'Smart: add new, skip existing')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{parsedData.counts.accounts.toLocaleString()}</Badge>
                      {importMode === 'partial' && <Badge className="bg-blue-100 text-blue-700 text-[9px]">{isAr ? 'ذكي' : 'Smart'}</Badge>}
                      <button type="button" onClick={() => setExpandedPreviews(p => ({ ...p, accounts: !p.accounts }))}
                        className={`p-1 rounded-md transition-colors ${expandedPreviews.accounts ? 'bg-indigo-200 text-indigo-700' : 'hover:bg-indigo-100 text-gray-400'}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedPreviews.accounts && (
                      <div className="px-3 pb-3 border-t border-indigo-100">
                        <AccountsPreview data={parsedData} existingAccounts={existingAccounts} isAr={isAr} />
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Master Data (always safe) ─── */}
                {[
                  { key: 'customers', label: isAr ? 'العملاء' : 'Customers', count: parsedData.counts.customers, icon: '👥' },
                  { key: 'suppliers', label: isAr ? 'الموردين' : 'Suppliers', count: parsedData.counts.suppliers, icon: '🏭' },
                  { key: 'materials', label: isAr ? 'المواد والمنتجات' : 'Materials', count: parsedData.counts.materials, icon: '📦' },
                  { key: 'currencies', label: isAr ? 'العملات' : 'Currencies', count: parsedData.counts.currencies || 0, icon: '💱' },
                  { key: 'costCenters', label: isAr ? 'مراكز التكلفة' : 'Cost Centers', count: parsedData.counts.costCenters || 0, icon: '🎯' },
                  { key: 'warehouses', label: isAr ? 'المستودعات' : 'Warehouses', count: parsedData.counts.warehouses || 0, icon: '🏪' },
                ].filter(item => item.count > 0).map(item => (
                  <div key={item.key} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 p-2">
                      <input type="checkbox" checked={selections[item.key] ?? false}
                        onChange={e => setSelections(p => ({ ...p, [item.key]: e.target.checked }))}
                        className="rounded border-gray-300" />
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm flex-1">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">{item.count.toLocaleString()}</Badge>
                      <Badge className="bg-green-100 text-green-700 text-[9px]">{isAr ? 'آمن' : 'Safe'}</Badge>
                      <button type="button" onClick={() => setExpandedPreviews(p => ({ ...p, [item.key]: !p[item.key] }))}
                        className={`p-1 rounded-md transition-colors ${expandedPreviews[item.key] ? 'bg-blue-200 text-blue-700' : 'hover:bg-gray-100 text-gray-400'}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedPreviews[item.key] && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        {item.key === 'customers' && <PartyPreview items={parsedData.customers} type="customers" isAr={isAr} />}
                        {item.key === 'suppliers' && <PartyPreview items={parsedData.suppliers} type="suppliers" isAr={isAr} />}
                        {item.key === 'materials' && <MaterialsPreview items={parsedData.materials} isAr={isAr} />}
                        {item.key === 'currencies' && parsedData.currencies && <CurrenciesPreview items={parsedData.currencies} isAr={isAr} />}
                        {item.key === 'costCenters' && parsedData.costCenters && <CostCentersPreview items={parsedData.costCenters} isAr={isAr} />}
                        {item.key === 'warehouses' && parsedData.warehouses && <WarehousesPreview items={parsedData.warehouses} isAr={isAr} />}
                      </div>
                    )}
                  </div>
                ))}

                {/* ─── Transactional Data (needs matching) ─── */}
                {[
                  { key: 'journalEntries', label: isAr ? 'القيود المحاسبية' : 'Journal Entries', count: parsedData.counts.journalEntries, icon: '📋' },
                  { key: 'purchaseInvoices', label: isAr ? 'فواتير المشتريات' : 'Purchases', count: parsedData.counts.purchaseInvoices, icon: '🧾' },
                  { key: 'salesInvoices', label: isAr ? 'فواتير المبيعات' : 'Sales', count: parsedData.counts.salesInvoices, icon: '💰' },
                  { key: 'vouchers', label: isAr ? 'سندات القبض/الدفع' : 'Vouchers', count: parsedData.counts.vouchers, icon: '📄' },
                ].filter(item => item.count > 0).map(item => (
                  <div key={item.key} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 p-2">
                      <input type="checkbox" checked={selections[item.key] ?? false}
                        onChange={e => setSelections(p => ({ ...p, [item.key]: e.target.checked }))}
                        className="rounded border-gray-300" />
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm flex-1">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">{item.count.toLocaleString()}</Badge>
                      <Badge className="bg-amber-100 text-amber-700 text-[9px]">{isAr ? 'مطابقة حسابات' : 'Matching'}</Badge>
                      <button type="button" onClick={() => setExpandedPreviews(p => ({ ...p, [item.key]: !p[item.key] }))}
                        className={`p-1 rounded-md transition-colors ${expandedPreviews[item.key] ? 'bg-blue-200 text-blue-700' : 'hover:bg-gray-100 text-gray-400'}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedPreviews[item.key] && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        {item.key === 'journalEntries' && <JournalEntriesPreview entries={parsedData.journalEntries} isAr={isAr} />}
                        {item.key === 'purchaseInvoices' && parsedData.purchaseInvoices && <PurchaseInvoicesPreview invoices={parsedData.purchaseInvoices} isAr={isAr} />}
                        {item.key === 'salesInvoices' && parsedData.salesInvoices && <SalesInvoicesPreview invoices={parsedData.salesInvoices} isAr={isAr} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-between">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  <ArrowLeft className="w-4 h-4 me-1" /> {isAr ? 'رجوع' : 'Back'}
                </Button>
                <Button onClick={handleImport} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <FileUp className="w-4 h-4 me-1" /> {isAr ? 'بدء الاستيراد' : 'Start Import'}
                </Button>
              </div>
            </div>
          )}

          {/* ⑤ Executing */}
          {step === 'execute' && (
            <div className="py-10 text-center space-y-6">
              <Loader2 className="w-12 h-12 mx-auto text-indigo-500 animate-spin" />
              <div>
                <p className="font-semibold text-lg">{isAr ? 'جاري الاستيراد...' : 'Importing...'}</p>
                {progress && (
                  <p className="text-sm text-gray-500 mt-1">{progress.label}</p>
                )}
              </div>
              {progress && <Progress value={progress.overallPercent} className="max-w-md mx-auto" />}
              <p className="text-xs text-gray-400">{isAr ? 'الرجاء عدم إغلاق الصفحة' : 'Please do not close this page'}</p>
            </div>
          )}

          {/* ⑥ Summary */}
          {step === 'summary' && result && (
            <div className="space-y-4">
              <div className="text-center py-4">
                {result.success ? (
                  <>
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                      <Trophy className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-700">{isAr ? 'تم الاستيراد بنجاح!' : 'Import Successful!'}</h3>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-700">{isAr ? 'فشل الاستيراد' : 'Import Failed'}</h3>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(result.counts).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-green-50 dark:bg-green-900/10 text-center">
                    <div className="text-lg font-bold text-green-700">{val}</div>
                    <div className="text-[11px] text-gray-500">{key}</div>
                  </div>
                ))}
              </div>

              {result.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">{isAr ? 'تحذيرات:' : 'Warnings:'}</p>
                  {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600">• {w.message}</p>)}
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs font-medium text-red-700 mb-1">{isAr ? 'أخطاء:' : 'Errors:'}</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">• {e.message}</p>)}
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">
                {isAr ? `المدة: ${(result.durationMs / 1000).toFixed(1)} ثانية` : `Duration: ${(result.durationMs / 1000).toFixed(1)}s`}
              </p>

              <div className="flex justify-center">
                <Button onClick={() => { onComplete?.(); onClose(); }}
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8">
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

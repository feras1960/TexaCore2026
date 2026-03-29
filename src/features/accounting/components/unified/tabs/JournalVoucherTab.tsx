import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useExchangeRateLookup, preloadExchangeRates } from '@/hooks/useExchangeRateLookup';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { AccountingGrid, type GridEditableColumn } from '@/components/ui/accounting-grid';
import { preloadAccounts, getCachedAccounts } from '@/components/ui/InlineAccountCell';
import { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { SheetMode } from '../types';
import { useViewCurrency } from '../../../hooks/useViewCurrency';
import { useNumberFormat } from '@/hooks/useNumberFormat';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, ArrowDownRight, ArrowUpRight, ArrowRightLeft, Wallet, TrendingUp, TrendingDown, ArrowRight, Hash, Calendar, FileText, AlignLeft, Equal, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { SmartAccountSelector } from '../../shared/SmartAccountSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface JournalLineRow {
    id: string;
    account_id: string;
    account_name?: string;
    account_code?: string;
    debit: number;
    credit: number;
    description: string;
    cost_center_id?: string;
    cost_center_name?: string;
    currency?: string;
    exchange_rate?: number;
    link_type?: string;
    invoice_id?: string;
    invoice_number?: string;
    current_balance?: number;
}

export interface JournalVoucherTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
    onSaveComplete?: () => void;
    companyId?: string;
    docType?: string;
}

const createEmptyRow = (defaultCurrency: string = ''): JournalLineRow => ({
    id: crypto.randomUUID(),
    account_id: '',
    debit: 0,
    credit: 0,
    description: '',
    currency: defaultCurrency,
    exchange_rate: 1,
});

export function JournalVoucherTab({
    data,
    mode,
    onChange,
    companyId: propCompanyId,
    docType = 'journal',
}: JournalVoucherTabProps) {
    const { currencyOptions } = useViewCurrency();
    const { currencyCode: companyCurrency } = useCompanyCurrency();
    const { lookupRate, lookupRateAsync } = useExchangeRateLookup();
    const { fmtAmount } = useNumberFormat();
    const currencyList = useMemo(() => currencyOptions.map(c => ({ value: c, label: c })), [currencyOptions]);

    const showFundAccount = docType === 'receipt' || docType === 'payment' || docType === 'cash';
    const showLinkColumns = docType === 'receipt' || docType === 'payment' || docType === 'cash';

    const { t, language, direction } = useLanguage();
    const { companyId: hookCompanyId } = useCompany();
    const isRTL = direction === 'rtl' || language === 'ar';
    const isReadOnly = mode === 'view';
    const isCreate = mode === 'create';

    // ═══ Preload accounts eagerly so dropdowns are instant ═══
    const resolvedCid = propCompanyId || hookCompanyId;
    useEffect(() => {
        if (resolvedCid) preloadAccounts(resolvedCid);
    }, [resolvedCid]);

    // Internal State
    const [entryDate, setEntryDate] = useState<Date>(new Date());
    const [reference, setReference] = useState('');
    const [description, setDescription] = useState('');
    const [voucherNo, setVoucherNo] = useState('');
    const [status, setStatus] = useState<string>('draft');
    const [fundAccountId, setFundAccountId] = useState('');
    const [lines, setLines] = useState<JournalLineRow[]>([]);
    const [linesLoading, setLinesLoading] = useState(false);
    const [costCenters, setCostCenters] = useState<{ value: string; label: string }[]>([]);

    // Load tracking
    const loadedIdRef = useRef<string | null>(null);
    // حالة إضافية: هل تم جلب الأسطر من DB لهذا القيد؟
    // تُمنع التعارضات بين data.lines (حالة الأب) وجلب DB المباشر
    const dbFetchedIdRef = useRef<string | null>(null);
    const prevStatusRef = useRef<string | undefined>(data?.status);

    // ─── C2: عند تغير status (draft→posted أو posted→draft) أعِد الجلب ───
    useEffect(() => {
        if (data?.status && data.status !== prevStatusRef.current) {
            prevStatusRef.current = data.status;
            // أعِد ضبط المرجع ← يُسمح بإعادة جلب الأسطر من DB
            dbFetchedIdRef.current = null;
        }
    }, [data?.status]);

    // ─── C1: جلب مباشر من DB — فقط للقيود التي تحتوي سطر صندوق ───────
    // يومية الصندوق / مقبوضات / مدفوعات فقط — القيود العادية تستخدم data.lines
    const needsDbFetch = docType === 'cash' || docType === 'receipt' || docType === 'payment';
    useEffect(() => {
        if (!needsDbFetch) return;
        const entryId = data?.id;
        if (!entryId || mode === 'create' || !entryId.trim()) return;
        if (dbFetchedIdRef.current === entryId) return;

        let cancelled = false;
        // استعلام واحد فقط — بدون joins
        supabase
            .from('journal_entry_lines')
            .select('id, account_id, debit, credit, debit_fc, credit_fc, exchange_rate, currency, description, cost_center_id, reference_type, reference_id, is_fund_line, line_number')
            .eq('entry_id', entryId)
            .order('line_number', { ascending: true })
            .then(async ({ data: rows, error }) => {
                if (cancelled || error || !rows) return;
                const userLines = rows.filter((l: any) => l.is_fund_line !== true);
                if (userLines.length === 0) return;

                // جلب أسماء الحسابات بالتوازي
                const accountIds = [...new Set(userLines.map((l: any) => l.account_id).filter(Boolean))];
                let accountMap: Record<string, any> = {};
                if (accountIds.length > 0) {
                    const { data: accounts } = await supabase
                        .from('chart_of_accounts')
                        .select('id, name_ar, name_en, account_code')
                        .in('id', accountIds);
                    if (accounts) {
                        for (const a of accounts) {
                            accountMap[a.id] = a;
                        }
                    }
                }

                if (cancelled) return;
                dbFetchedIdRef.current = entryId;
                const mapped = userLines.map((line: any) => {
                    const acct = accountMap[line.account_id] || {} as any;
                    const rate = Number(line.exchange_rate) || 1;
                    const hasFC = rate > 1;
                    const fcD = Number(line.debit_fc) || 0;
                    const fcC = Number(line.credit_fc) || 0;
                    const rawD = Number(line.debit) || 0;
                    const rawC = Number(line.credit) || 0;
                    return {
                        id: line.id || crypto.randomUUID(),
                        account_id: line.account_id || '',
                        account_name: acct.name_ar || acct.name_en || '',
                        account_code: acct.account_code || '',
                        debit:  hasFC ? (fcD > 0 ? fcD : (rawD > 0 ? Math.round(rawD / rate * 100) / 100 : 0)) : rawD,
                        credit: hasFC ? (fcC > 0 ? fcC : (rawC > 0 ? Math.round(rawC / rate * 100) / 100 : 0)) : rawC,
                        description: line.description || '',
                        cost_center_id: line.cost_center_id || '',
                        cost_center_name: '',
                        currency: line.currency || companyCurrency,
                        exchange_rate: rate,
                        link_type: line.reference_type || 'none',
                        invoice_id: line.reference_id || '',
                        invoice_number: '',
                    };
                });
                setLines(mapped);
                setLinesLoading(false);
            });

        return () => { cancelled = true; };
    }, [needsDbFetch, data?.id, data?.status, mode, companyCurrency]);

    // Load Data
    useEffect(() => {
        const incomingId = data?.id || 'new';
        if (loadedIdRef.current !== incomingId) {
            if (data && (mode === 'edit' || mode === 'view')) {
                setEntryDate(data.entry_date ? new Date(data.entry_date) : new Date());
                setReference(data.reference || '');
                setDescription(data.description || '');
                setVoucherNo(data.entry_number || '');
                setStatus(data.status || 'draft');
                setFundAccountId(data.fund_account_id || '');
                // ═══ معاينة فورية: حمّل data.lines مفلترة (بدون الصندوق) ═══
                // DB fetch (C1) يؤكد في الخلفية — لكن المعاينة فورية بدون شبكة
                const fundAccId = data.fund_account_id || data.header_account_id || '';
                const previewLines = (data.lines || [])
                    .filter((line: any) => {
                        if (line.is_fund_line === true) return false;
                        if (fundAccId && line.account_id === fundAccId) return false;
                        return true;
                    })
                    .map((line: any) => {
                        // ═══ عرض بالعملة الأصلية: نأخذ debit_fc/credit_fc عندما تكون > 0 ═══
                        const rate = Number(line.exchange_rate) || 1;
                        const hasFC = rate > 1; // عملة أجنبية
                        const fcD = Number(line.debit_fc) || 0;
                        const fcC = Number(line.credit_fc) || 0;
                        const rawD = Number(line.debit) || 0;
                        const rawC = Number(line.credit) || 0;
                        
                        return {
                            id: line.id || crypto.randomUUID(),
                            account_id: line.account_id || '',
                            account_name: line.account?.name_ar || line.account?.name_en || line.account_name || '',
                            account_code: line.account?.account_code || line.account?.code || line.account_code || '',
                            // إذا عملة أجنبية و debit_fc > 0 → نعرضه. وإلا debit / rate (أو debit إذا محلي)
                            debit:  hasFC ? (fcD > 0 ? fcD : (rawD > 0 ? Math.round(rawD / rate * 100) / 100 : 0)) : rawD,
                            credit: hasFC ? (fcC > 0 ? fcC : (rawC > 0 ? Math.round(rawC / rate * 100) / 100 : 0)) : rawC,
                            description: line.description || '',
                            cost_center_id: line.cost_center_id || '',
                            cost_center_name: line.cost_center?.name || '',
                            currency: line.currency || companyCurrency,
                            exchange_rate: rate,
                            link_type: line.reference_type || line.link_type || 'none',
                            invoice_id: line.reference_id || line.invoice_id || '',
                            invoice_number: '',
                        };
                    });
                if (previewLines.length > 0) {
                    setLines(previewLines);
                    setLinesLoading(false); // المعاينة جاهزة فوراً
                }

                // ─── Pre-warm exchange rate cache ───
                const cid = propCompanyId || hookCompanyId;
                if (cid) preloadExchangeRates(cid);
                const uniqueCurrencies = [...new Set(previewLines.map((l: any) => l.currency).filter(Boolean))];
                uniqueCurrencies.forEach((curr: string) => {
                    if (curr && curr !== companyCurrency) {
                        lookupRateAsync(curr, companyCurrency);
                    }
                });

            } else if (isCreate) {
                setEntryDate(new Date());
                setReference('');
                setDescription('');
                setVoucherNo('');
                setStatus('draft');
                setFundAccountId('');
                // نُهيّئ الصفوف الفارغة مباشرةً بدلاً من ترك الجريد يفعلها (initialEmptyRows تتعارض مع setLines)
                setLines(Array.from({ length: 8 }, () => createEmptyRow(companyCurrency)));
            }
            loadedIdRef.current = incomingId;
        }
    }, [data?.id, mode, isCreate]);

    // Load Cost Centers
    useEffect(() => {
        const cid = propCompanyId || hookCompanyId;
        if (!cid) return;
        supabase
            .from('cost_centers')
            .select('id, name_ar, name_en, code')
            .eq('company_id', cid)
            .eq('is_active', true)
            .then(({ data: ccData }) => {
                if (ccData) {
                    setCostCenters(ccData.map(cc => ({
                        value: cc.id,
                        label: `${cc.code ? cc.code + ' - ' : ''}${language === 'ar' ? (cc.name_ar || cc.name_en) : (cc.name_en || cc.name_ar)}`
                    })));
                }
            });
    }, [propCompanyId, hookCompanyId, language]);

    // Load Invoices & Containers for link reference
    const [invoiceOptions, setInvoiceOptions] = useState<{ value: string; label: string; party_id?: string; type: 'sale' | 'purchase' }[]>([]);
    const [containerOptions, setContainerOptions] = useState<{ value: string; label: string }[]>([]);
    const [accountPartyMap, setAccountPartyMap] = useState<Map<string, { party_id: string; party_type: string }>>(new Map());

    // Refs for fast cell display lookup (avoids re-rendering columns)
    const invoiceLabelMapRef = useRef<Map<string, string>>(new Map());
    const containerLabelMapRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        if (!showLinkColumns) return;
        const cid = propCompanyId || hookCompanyId;
        if (!cid) return;

        // Load party account mapping: account_id → { party_id, party_type }
        supabase
            .from('chart_of_accounts')
            .select('id, party_id, party_type')
            .eq('company_id', cid)
            .eq('is_party_account', true)
            .not('party_id', 'is', null)
            .then(({ data }) => {
                if (data) {
                    const map = new Map<string, { party_id: string; party_type: string }>();
                    data.forEach(acc => map.set(acc.id, { party_id: acc.party_id, party_type: acc.party_type || '' }));
                    setAccountPartyMap(map);
                }
            });

        // Load BOTH sales & purchase invoices with outstanding balance
        Promise.all([
            supabase
                .from('sales_transactions')
                .select('id, invoice_no, customer_name, customer_id, total_amount, balance, stage')
                .eq('company_id', cid)
                .in('stage', ['confirmed', 'delivered', 'posted'])
                .gt('balance', 0)
                .order('doc_date', { ascending: false })
                .limit(200),
            supabase
                .from('purchase_transactions')
                .select('id, invoice_no, supplier_name, supplier_id, total_amount, balance, stage')
                .eq('company_id', cid)
                .in('stage', ['confirmed', 'received', 'posted'])
                .gt('balance', 0)
                .order('doc_date', { ascending: false })
                .limit(200),
        ]).then(([salesRes, purchaseRes]) => {
            const allInvoices: typeof invoiceOptions = [];
            const labelMap = new Map<string, string>();
            
            if (salesRes.data) {
                salesRes.data.forEach(inv => {
                    const label = `📤 ${inv.invoice_no || '—'} | ${inv.customer_name || ''} | ${Number(inv.balance || 0).toLocaleString()}`;
                    allInvoices.push({ value: inv.id, label, party_id: inv.customer_id, type: 'sale' });
                    labelMap.set(inv.id, label);
                });
            }
            if (purchaseRes.data) {
                purchaseRes.data.forEach(inv => {
                    const label = `📥 ${inv.invoice_no || '—'} | ${inv.supplier_name || ''} | ${Number(inv.balance || 0).toLocaleString()}`;
                    allInvoices.push({ value: inv.id, label, party_id: inv.supplier_id, type: 'purchase' });
                    labelMap.set(inv.id, label);
                });
            }
            
            invoiceLabelMapRef.current = labelMap;
            setInvoiceOptions(allInvoices);
        });

        // Load containers for link reference
        supabase
            .from('containers')
            .select('*')
            .eq('company_id', cid)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data: ctData, error: ctError }) => {
                if (ctError) {
                    console.warn('Containers fetch skipped:', ctError.message);
                    return;
                }
                if (ctData) {
                    const labelMap = new Map<string, string>();
                    const opts = ctData.map(ct => {
                        const label = `📦 ${ct.container_number || '—'} | ${ct.status}`;
                        labelMap.set(ct.id, label);
                        return { value: ct.id, label };
                    });
                    containerLabelMapRef.current = labelMap;
                    setContainerOptions(opts);
                }
            });
    }, [propCompanyId, hookCompanyId, showLinkColumns]);

    // Dynamic options for link reference column based on link_type + account
    const getLinkRefOptions = useCallback((row: any): { value: string; label: string }[] => {
        const linkType = row?.link_type || 'none';
        switch (linkType) {
            case 'invoice': {
                const accountId = row?.account_id;
                if (!accountId) {
                    return [{ value: '', label: isRTL ? 'اختر حساب أولاً' : 'Select account first' }];
                }
                const partyInfo = accountPartyMap.get(accountId);
                if (!partyInfo) {
                    return [{ value: '', label: isRTL ? 'الحساب غير مرتبط بعميل/مورد' : 'Account not linked to party' }];
                }
                const isCustomer = partyInfo.party_type === 'customer';
                const filtered = invoiceOptions.filter(inv => 
                    inv.party_id === partyInfo.party_id && 
                    (isCustomer ? inv.type === 'sale' : inv.type === 'purchase')
                );
                if (filtered.length === 0) {
                    return [{ value: '', label: isRTL ? 'لا توجد فواتير مفتوحة' : 'No open invoices' }];
                }
                return [{ value: '', label: '—' }, ...filtered];
            }
            case 'container':
                return [{ value: '', label: '—' }, ...containerOptions];
            case 'transfer':
                return [{ value: '', label: isRTL ? 'أدخل رقم الحوالة...' : 'Enter transfer #...' }];
            default:
                return [{ value: '', label: '—' }];
        }
    }, [invoiceOptions, containerOptions, accountPartyMap, isRTL]);

    // Computed Totals
    const totals = useMemo(() => {
        return lines.reduce((acc, row) => ({
            debit: acc.debit + (Number(row.debit) || 0),
            credit: acc.credit + (Number(row.credit) || 0),
        }), { debit: 0, credit: 0 });
    }, [lines]);

    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
    const lineCount = lines.filter(r => r.account_id && (r.debit || r.credit)).length;

    // Sync to Parent (debounced — 80ms is fast enough to avoid freezing but eliminates race on Save)
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const buildPayload = useCallback(() => ({
        entry_date: format(entryDate, 'yyyy-MM-dd'),
        reference,
        description,
        entry_number: voucherNo,
        entry_type: docType,
        status,
        fund_account_id: fundAccountId || undefined,
        lines: lines.filter(r => r.account_id),
        total_debit: totals.debit,
        total_credit: totals.credit,
        total_amount: docType === 'receipt' ? totals.credit : docType === 'payment' ? totals.debit : undefined,
    }), [entryDate, reference, description, voucherNo, docType, status, fundAccountId, lines, totals]);

    useEffect(() => {
        if (isReadOnly) return;
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            onChange(buildPayload());
        }, 80); // ↓ من 300ms إلى 80ms لتفادي race condition عند الحفظ
        return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
    }, [lines, entryDate, reference, description, voucherNo, status, fundAccountId, isReadOnly, docType, buildPayload]);


    // linesRef for stable callbacks
    const linesRef = useRef(lines);
    linesRef.current = lines;

    // === Account Balance + Currency State ===
    const [accountBalances, setAccountBalances]   = useState<Map<string, number>>(new Map());
    // ═══ رصيد بالعملة الأصلية (FC) — المصدر الحقيقي ═══
    const [accountFCBalances, setAccountFCBalances] = useState<Map<string, number>>(new Map());
    const [accountCurrencies, setAccountCurrencies] = useState<Map<string, string>>(new Map());
    const fetchedAccountIdsRef = useRef<Set<string>>(new Set());

    // ═══ جلب رصيد الحساب من الكاش — فوري بدون استعلام! ═══
    useEffect(() => {
        const missingIds: string[] = [];
        for (const line of lines) {
            if (!line.account_id) continue;
            if (!fetchedAccountIdsRef.current.has(line.account_id)) {
                missingIds.push(line.account_id);
            }
        }
        
        const uniqueNewIds = [...new Set(missingIds)];
        if (uniqueNewIds.length === 0) return;
        
        uniqueNewIds.forEach(id => fetchedAccountIdsRef.current.add(id));
        
        // ═══ الأرصدة والعملات من الكاش — فورية (0ms) ═══
        // الكاش يحتوي على أرصدة حقيقية من RPC get_account_balances_bulk
        const cached = getCachedAccounts();
        if (cached && cached.length > 0) {
            const balUpdates = new Map<string, number>();
            const fcBalUpdates = new Map<string, number>();
            const currUpdates = new Map<string, string>();
            
            for (const id of uniqueNewIds) {
                const acct = cached.find(a => a.id === id);
                if (!acct) continue;
                
                const acctCurrency = acct.currency || companyCurrency;
                currUpdates.set(id, acctCurrency);
                
                if (acctCurrency !== companyCurrency) {
                    fcBalUpdates.set(id, Number(acct.current_balance_fc) || 0);
                }
                balUpdates.set(id, Number(acct.current_balance) || 0);
            }
            
            if (currUpdates.size > 0) {
                setAccountCurrencies(prev => {
                    const updated = new Map(prev);
                    currUpdates.forEach((v, k) => updated.set(k, v));
                    return updated;
                });
            }
            if (balUpdates.size > 0) {
                setAccountBalances(prev => {
                    const updated = new Map(prev);
                    balUpdates.forEach((v, k) => updated.set(k, v));
                    return updated;
                });
            }
            if (fcBalUpdates.size > 0) {
                setAccountFCBalances(prev => {
                    const updated = new Map(prev);
                    fcBalUpdates.forEach((v, k) => updated.set(k, v));
                    return updated;
                });
            }
            return;
        }
        
        // ═══ Fallback: إذا الكاش فارغ، جلب العملة والرصيد من DB ═══
        supabase
            .from('chart_of_accounts')
            .select('id, currency, current_balance, current_balance_fc')
            .in('id', uniqueNewIds)
            .then(({ data: rows }) => {
                if (!rows?.length) return;
                
                setAccountCurrencies(prev => {
                    const updated = new Map(prev);
                    rows.forEach(r => { if (r.currency) updated.set(r.id, r.currency); });
                    return updated;
                });
                
                setAccountBalances(prev => {
                    const updated = new Map(prev);
                    rows.forEach(r => updated.set(r.id, Number(r.current_balance) || 0));
                    return updated;
                });

                const fcRows = rows.filter(r => r.currency && r.currency !== companyCurrency);
                if (fcRows.length > 0) {
                    setAccountFCBalances(prev => {
                        const updated = new Map(prev);
                        fcRows.forEach(r => updated.set(r.id, Number(r.current_balance_fc) || 0));
                        return updated;
                    });
                }
            });
    }, [lines, companyCurrency]);

    // === onCellChange interceptor: currency → exchange_rate sync ===
    const handleCellChange = useCallback((
        rowIndex: number,
        colKey: string,
        newValue: unknown,
        currentRow: JournalLineRow
    ): JournalLineRow | void => {

        // ─── عند اختيار الحساب: أخذ العملة والرصيد من الكاش مباشرة ───
        if (colKey === 'account_id' && newValue) {
            const accountId = String(newValue);
            
            // ═══ الحساب موجود في الكاش — فوري بدون استعلام! ═══
            const cached = getCachedAccounts();
            const acct = cached?.find(a => a.id === accountId);
            const acctCurrency = acct?.currency || currentRow.currency as string || companyCurrency;
            const isFC = acctCurrency !== companyCurrency;
            
            // تحديث العملة فوراً
            setAccountCurrencies(prev => new Map(prev).set(accountId, acctCurrency));
            fetchedAccountIdsRef.current.add(accountId);

            // ═══ الرصيد من الكاش — فوري (0ms) ═══
            // الكاش يحتوي على أرصدة حقيقية من RPC get_account_balances_bulk
            const balance = Number(acct?.current_balance) || 0;
            setAccountBalances(prev => new Map(prev).set(accountId, balance));
            if (isFC) {
                const fcBal = Number(acct?.current_balance_fc) || 0;
                setAccountFCBalances(prev => new Map(prev).set(accountId, fcBal));
            }
            
            if (isFC) {
                // تحديث العملة وسعر الصرف في السطر
                const rate = lookupRate(acctCurrency, companyCurrency);
                if (rate && rate !== 1) {
                    return { ...currentRow, account_id: accountId, currency: acctCurrency, exchange_rate: rate };
                }
                lookupRateAsync(acctCurrency, companyCurrency).then(asyncRate => {
                    if (asyncRate && asyncRate !== 1) {
                        setLines(prev => prev.map((l, i) =>
                            i === rowIndex ? { ...l, currency: acctCurrency, exchange_rate: asyncRate } : l
                        ));
                    } else {
                        setLines(prev => prev.map((l, i) =>
                            i === rowIndex ? { ...l, currency: acctCurrency } : l
                        ));
                    }
                });
                return { ...currentRow, account_id: accountId, currency: acctCurrency };
            }
            return;
        }

        if (colKey === 'currency' && typeof newValue === 'string') {
            const targetCurrency = newValue || companyCurrency;

            // العملة الأساسية → سعر 1
            if (targetCurrency === companyCurrency) {
                return { ...currentRow, currency: targetCurrency, exchange_rate: 1 };
            }

            // حاول الحصول على السعر المخزّن مؤقتاً
            const rate = lookupRate(targetCurrency, companyCurrency);
            if (rate && rate !== 1) {
                return { ...currentRow, currency: targetCurrency, exchange_rate: rate };
            }

            // Fallback async: اجلب من الـ API وحدّث السطر عند الوصول
            lookupRateAsync(targetCurrency, companyCurrency).then(asyncRate => {
                if (asyncRate && asyncRate !== 1) {
                    setLines(prev => prev.map((l, i) =>
                        i === rowIndex && l.currency === targetCurrency
                            ? { ...l, exchange_rate: asyncRate }
                            : l
                    ));
                }
            });

            // أرجع مباشرةً بالعملة الجديدة (السعر سيُحدَّث async)
            return { ...currentRow, currency: targetCurrency };
        }
    }, [companyCurrency, lookupRate, lookupRateAsync]);


    const handleAddRow = useCallback((): JournalLineRow => {
        return createEmptyRow(companyCurrency);
    }, [companyCurrency]);

    const handleInsertRow = useCallback((_index: number): JournalLineRow => {
        return createEmptyRow(companyCurrency);
    }, [companyCurrency]);

    // Single onChange bridge (replaces handleNexaSave + handleDataChange)
    const handleLinesChange = useCallback((updatedRows: JournalLineRow[]) => {
        const prevLines = linesRef.current;
        let needsEnrich = false;
        for (let i = 0; i < updatedRows.length; i++) {
            const oldRow = prevLines[i];
            if (oldRow && updatedRows[i].currency && updatedRows[i].currency !== oldRow.currency) {
                needsEnrich = true;
                break;
            }
        }
        if (needsEnrich) {
            const enriched = updatedRows.map((row, idx) => {
                const oldRow = prevLines[idx];
                if (oldRow && row.currency && row.currency !== oldRow.currency) {
                    const rate = lookupRate(row.currency, companyCurrency);
                    return { ...row, exchange_rate: rate };
                }
                return row;
            });
            setLines(enriched);
        } else {
            setLines(updatedRows);
        }
    }, [lookupRate, companyCurrency]);

    // Status helpers
    const getStatusColor = (s: string) => {
        switch (s) {
            case 'posted': return 'bg-green-100 text-green-700 border-green-200';
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };
    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'posted': return <CheckCircle2 className="w-3.5 h-3.5" />;
            case 'draft': return <Clock className="w-3.5 h-3.5" />;
            default: return <AlertCircle className="w-3.5 h-3.5" />;
        }
    };

    // === Arabic Number to Words ===
    const numberToArabicWords = useCallback((num: number): string => {
        if (num === 0) return 'صفر';
        const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
            'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
        const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
        const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

        const convertGroup = (n: number): string => {
            if (n === 0) return '';
            if (n < 20) return ones[n];
            if (n < 100) {
                const o = n % 10;
                const t = Math.floor(n / 10);
                return o ? `${ones[o]} و${tens[t]}` : tens[t];
            }
            const h = Math.floor(n / 100);
            const rest = n % 100;
            return rest ? `${hundreds[h]} و${convertGroup(rest)}` : hundreds[h];
        };

        const intPart = Math.floor(num);
        const decPart = Math.round((num - intPart) * 100);

        const parts: string[] = [];
        if (intPart >= 1000000) {
            const m = Math.floor(intPart / 1000000);
            parts.push(`${convertGroup(m)} مليون`);
        }
        const remaining = intPart % 1000000;
        if (remaining >= 1000) {
            const th = Math.floor(remaining / 1000);
            parts.push(`${th === 1 ? '' : convertGroup(th) + ' '}ألف`);
        }
        const last3 = remaining % 1000;
        if (last3 > 0) parts.push(convertGroup(last3));

        let result = parts.join(' و') || 'صفر';
        if (decPart > 0) {
            result += ` و${convertGroup(decPart)} هللة`;
        }
        return result + ' فقط لا غير';
    }, []);

    // === Duplicate Account Detection ===
    const duplicateAccountIds = useMemo(() => {
        const accountCounts = new Map<string, number>();
        lines.forEach(row => {
            if (row.account_id) {
                accountCounts.set(row.account_id, (accountCounts.get(row.account_id) || 0) + 1);
            }
        });
        const dups = new Set<string>();
        accountCounts.forEach((count, id) => {
            if (count > 1) dups.add(id);
        });
        return dups;
    }, [lines]);

    // Columns - dynamic based on docType
    const columns = useMemo((): ColumnDef<JournalLineRow>[] => {
        const cols: ColumnDef<JournalLineRow>[] = [];

        // Debit column (shown for journal + cash + payment)
        if (docType !== 'receipt') {
            cols.push({
                accessorKey: 'debit',
                header: docType === 'payment' ? (t('accounting.columns.payments') || 'مدفوعات') 
                       : docType === 'cash' ? (t('accounting.columns.payments') || 'مدفوعات')
                       : t('accounting.columns.debit'),
                size: 115,
                enableHiding: false,
                cell: ({ row }) => {
                    const val = Number(row.original.debit) || 0;
                    return val > 0 ? <span className="font-mono text-xs text-green-700 font-medium px-1 py-0.5 bg-green-50 rounded">{fmtAmount(val)}</span> : <span className="text-muted-foreground text-xs">—</span>;
                }
            });
        }

        // Credit column (shown for journal + cash + receipt)
        if (docType !== 'payment') {
            cols.push({
                accessorKey: 'credit',
                header: docType === 'receipt' ? (t('accounting.columns.receipts') || 'مقبوضات')
                       : docType === 'cash' ? (t('accounting.columns.receipts') || 'مقبوضات')
                       : t('accounting.columns.credit'),
                size: 115,
                enableHiding: false,
                cell: ({ row }) => {
                    const val = Number(row.original.credit) || 0;
                    return val > 0 ? <span className="font-mono text-xs text-red-600 font-medium px-1 py-0.5 bg-red-50 rounded">{fmtAmount(val)}</span> : <span className="text-muted-foreground text-xs">—</span>;
                }
            });
        }

        // Account column (always)
        cols.push({
            accessorKey: 'account_id',
            header: t('accounting.columns.account'),
            size: 250,
            enableHiding: false,
            cell: ({ row }) => {
                const { account_name, account_code, account_id } = row.original;
                if (!account_name) return <span className="text-muted-foreground text-xs">—</span>;
                const isDup = account_id && duplicateAccountIds.has(account_id);
                const rawBal  = account_id ? accountBalances.get(account_id)   : undefined;
                const acctCurr = account_id ? (accountCurrencies.get(account_id) || companyCurrency) : companyCurrency;
                // ═══ الرصيد بعملة الحساب الأصلية ═══
                // للحسابات المحلية: current_balance مباشرة
                // للحسابات الأجنبية: الرصيد الحقيقي من SUM(debit_fc - credit_fc)
                let displayBal: number | undefined;
                let displayCurr = acctCurr;
                if (acctCurr !== companyCurrency && account_id) {
                    const fcBal = accountFCBalances.get(account_id);
                    displayBal = fcBal !== undefined ? fcBal : undefined;
                } else {
                    displayBal = rawBal;
                }
                return (
                    <div className="flex items-center gap-1">
                        {account_code && <span className="font-mono text-[10px] text-muted-foreground">{account_code}</span>}
                        <span className="text-xs truncate">{account_name}</span>
                        {displayBal !== undefined && (
                            <span className={cn(
                                "font-mono text-[9px] px-1 rounded shrink-0 leading-tight flex items-center gap-0.5",
                                displayBal >= 0 ? "text-teal-700 bg-teal-50" : "text-rose-700 bg-rose-50"
                            )}>
                                <span className="opacity-70">{displayCurr}</span>
                                {fmtAmount(Math.abs(displayBal))}
                            </span>
                        )}
                        {isDup && (
                            <TooltipProvider><Tooltip><TooltipTrigger>
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            </TooltipTrigger><TooltipContent>
                                <p className="text-xs">{isRTL ? 'حساب مكرر في القيد' : 'Duplicate account'}</p>
                            </TooltipContent></Tooltip></TooltipProvider>
                        )}
                    </div>
                );
            }
        });

        // Link columns for receipt/payment/cash
        if (showLinkColumns) {
            const linkLabels: Record<string, string> = {
                none: '—', 
                invoice: isRTL ? 'فاتورة' : 'Invoice',
                container: isRTL ? 'كونتينر' : 'Container',
                transfer: isRTL ? 'حوالة' : 'Transfer',
            };
            cols.push({
                accessorKey: 'link_type',
                header: t('accounting.columns.link') || 'الربط',
                size: 85,
                cell: ({ row }) => {
                    const lt = row.original.link_type || 'none';
                    return lt !== 'none' 
                        ? <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{linkLabels[lt] || lt}</span>
                        : <span className="text-muted-foreground text-xs">—</span>;
                }
            });
            cols.push({
                accessorKey: 'invoice_id',
                header: t('accounting.columns.linkRef') || 'المرجع',
                size: 160,
                cell: ({ row }) => {
                    const invId = row.original.invoice_id;
                    if (!invId) return <span className="text-muted-foreground text-xs">—</span>;
                    // Fast O(1) lookup from refs
                    const label = invoiceLabelMapRef.current.get(invId) 
                        || containerLabelMapRef.current.get(invId) 
                        || row.original.invoice_number 
                        || invId.slice(0, 8);
                    return <span className="text-[11px] truncate max-w-[150px] block" title={label}>{label}</span>;
                }
            });
        }

        // Description (always)
        cols.push({
            accessorKey: 'description',
            header: t('accounting.columns.description'),
            size: 250,
        });

        // Cost Center (always)
        cols.push({
            accessorKey: 'cost_center_id',
            header: t('accounting.columns.costCenter'),
            size: 100,
            cell: ({ row }) => <span className="text-xs">{row.original.cost_center_name || '—'}</span>
        });

        // Currency
        cols.push({
            accessorKey: 'currency',
            header: t('accounting.columns.currency'),
            size: 60,
            cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.currency || companyCurrency}</span>
        });

        // Exchange Rate
        cols.push({
            accessorKey: 'exchange_rate',
            header: t('accounting.columns.exchangeRate'),
            size: 70,
            cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.exchange_rate?.toFixed(4)}</span>
        });

        return cols;
    }, [language, docType, duplicateAccountIds, showLinkColumns, accountBalances, accountFCBalances, accountCurrencies, fmtAmount, companyCurrency]);

    // Edit Config
    const editableColumns = useMemo(() => {
        const cols: any[] = [];

        if (docType !== 'receipt') cols.push({ key: 'debit', type: 'number' as const, min: 0 });
        if (docType !== 'payment') cols.push({ key: 'credit', type: 'number' as const, min: 0 });
        cols.push({ key: 'account_id', type: 'account' as const, required: true });

        if (showLinkColumns) {
            const linkOptions = [
                { value: 'none', label: t('accounting.linkTypes.none') || 'بدون' },
                { value: 'invoice', label: t('accounting.linkTypes.invoice') || 'فاتورة' },
                { value: 'container', label: t('accounting.linkTypes.container') || 'كونتينر' },
                { value: 'transfer', label: t('accounting.linkTypes.transfer') || 'حوالة' },
            ];
            cols.push({ key: 'link_type', type: 'select' as const, options: linkOptions });
            cols.push({ 
                key: 'invoice_id', 
                type: 'select' as const,
                dynamicOptions: getLinkRefOptions,
            });
        }

        cols.push({ key: 'description', type: 'text' as const, placeholder: t('accounting.placeholders.descriptionDots') });
        cols.push({ key: 'cost_center_id', type: 'select' as const, options: [{ value: '', label: '—' }, ...costCenters] });
        cols.push({ key: 'currency', type: 'select' as const, options: currencyList });
        cols.push({ key: 'exchange_rate', type: 'number' as const, min: 0 });

        return cols;
    }, [language, currencyList, costCenters, docType, showLinkColumns, getLinkRefOptions]);

    // Row coloring: completed rows get green tint
    const getRowClassName = useCallback((row: JournalLineRow) => {
        const hasAccount = !!row.account_id;
        const hasAmount = (Number(row.debit) > 0) || (Number(row.credit) > 0);
        if (hasAccount && hasAmount) return 'bg-emerald-50/40 dark:bg-emerald-950/20';
        if (hasAmount && !hasAccount) return 'bg-amber-50/40 dark:bg-amber-950/20';
        return '';
    }, []);

    // F9 auto-balance handler
    const handleF9Balance = useCallback(() => {
        const diff = totals.debit - totals.credit;
        if (Math.abs(diff) < 0.01) {
            toast.info(isRTL ? 'القيد متوازن بالفعل ✓' : 'Entry is already balanced ✓');
            return;
        }
        // Find last row with an account but no amount, or first empty row
        let targetIdx = lines.findIndex(r => r.account_id && !r.debit && !r.credit);
        if (targetIdx === -1) {
            targetIdx = lines.findIndex(r => !r.account_id && !r.debit && !r.credit);
        }
        if (targetIdx === -1) {
            // Add a new row
            const newRow = createEmptyRow(companyCurrency);
            setLines(prev => [...prev, newRow]);
            targetIdx = lines.length;
        }
        // Set the balancing amount
        setLines(prev => {
            const copy = [...prev];
            if (diff > 0) {
                copy[targetIdx] = { ...copy[targetIdx], credit: diff, debit: 0 };
            } else {
                copy[targetIdx] = { ...copy[targetIdx], debit: Math.abs(diff), credit: 0 };
            }
            return copy;
        });
        toast.success(isRTL ? `تمت الموازنة: ${Math.abs(diff).toLocaleString()}` : `Balanced: ${Math.abs(diff).toLocaleString()}`);
    }, [totals, lines, companyCurrency, isRTL]);

    // Save validation
    const handleValidatedSave = useCallback(() => {
        if (!isBalanced && lineCount > 0) {
            toast.error(
                isRTL
                    ? `⚠️ القيد غير متوازن! الفرق: ${Math.abs(totals.debit - totals.credit).toLocaleString()}`
                    : `⚠️ Entry is not balanced! Difference: ${Math.abs(totals.debit - totals.credit).toLocaleString()}`
            );
            return false;
        }
        return true;
    }, [isBalanced, lineCount, totals, isRTL]);

    // ═══ Fund Balance Query — fetches real balance from journal_entry_lines ═══
    const { data: fundBalanceData } = useQuery({
        queryKey: ['fund_balance', fundAccountId, resolvedCid],
        queryFn: async () => {
            if (!fundAccountId || !resolvedCid) return null;

            // Fetch real balance from POSTED journal entries only (debit-credit for assets)
            const { data, error } = await supabase
                .from('journal_entry_lines')
                .select('debit, credit, entry:journal_entries!inner(is_posted)')
                .eq('account_id', fundAccountId)
                .eq('journal_entries.is_posted', true);

            if (error) {
                console.warn('Fund balance fetch error:', error);
                return null;
            }

            const balance = (data || []).reduce((sum, line) => {
                return sum + (Number(line.debit) || 0) - (Number(line.credit) || 0);
            }, 0);

            // Also get account name and currency
            const { data: account } = await supabase
                .from('chart_of_accounts')
                .select('name_ar, name_en, currency, account_code, is_cash_account, is_bank_account')
                .eq('id', fundAccountId)
                .maybeSingle();

            return {
                balance,
                name: isRTL ? (account?.name_ar || account?.name_en) : (account?.name_en || account?.name_ar),
                code: account?.account_code || '',
                currency: account?.currency || companyCurrency,
                isCash: account?.is_cash_account || false,
                isBank: account?.is_bank_account || false,
            };
        },
        enabled: !!fundAccountId && !!resolvedCid && showFundAccount,
        staleTime: 30000,
    });

    // ═══ Calculate transaction impact on fund (بعملة الصندوق مع مراعاة سعر الصرف) ═══
    const fundImpact = useMemo(() => {
        if (!fundBalanceData) return null;

        const currentBalance = fundBalanceData.balance;

        // ── تجميع المبالغ مع تحويل كل سطر بسعر صرفه ──
        // كل سطر: المبلغ × سعر الصرف = المعادل بالعملة الأساسية للشركة
        // (وهي نفس عملة الصندوق في الغالب)
        let convertedDebit = 0;
        let convertedCredit = 0;
        lines.forEach(row => {
            const rate = Number(row.exchange_rate) || 1;
            convertedDebit  += (Number(row.debit)  || 0) * rate;
            convertedCredit += (Number(row.credit) || 0) * rate;
        });

        let transactionAmount = 0;
        if (docType === 'receipt') {
            // سند قبض = دخول مال للصندوق
            transactionAmount = convertedCredit;
        } else if (docType === 'payment') {
            // سند صرف = خروج مال من الصندوق
            transactionAmount = -convertedDebit;
        } else if (docType === 'cash') {
            // يومية صندوق = صافي الحركة
            transactionAmount = convertedCredit - convertedDebit;
        }

        const afterBalance = currentBalance + transactionAmount;
        const willGoNegative = afterBalance < 0 && currentBalance >= 0;

        return {
            currentBalance,
            transactionAmount,
            afterBalance,
            willGoNegative,
            currency: fundBalanceData.currency,
            fundName: fundBalanceData.name,
            fundCode: fundBalanceData.code,
            isCash: fundBalanceData.isCash,
            isBank: fundBalanceData.isBank,
        };
    }, [fundBalanceData, lines, docType]);


    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ─── Fund Account Selector with Balance Display ─── */}
            {showFundAccount && (
                <div className="shrink-0 border-b border-gray-100 dark:border-gray-700">
                    {/* Top: Fund Selector */}
                    <div className="px-4 py-2.5 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                {docType === 'receipt' && <ArrowDownRight className="w-4 h-4 text-green-500" />}
                                {docType === 'payment' && <ArrowUpRight className="w-4 h-4 text-red-500" />}
                                {docType === 'cash' && <ArrowRightLeft className="w-4 h-4 text-blue-500" />}
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                    {docType === 'cash'
                                        ? (t('accounting.cashFund') || 'حساب الصندوق')
                                        : docType === 'receipt'
                                        ? (t('accounting.receipt.fund') || 'حساب الصندوق')
                                        : (t('accounting.payment.fund') || 'حساب الصندوق')}
                                </Label>
                            </div>
                            <div className="flex-1 max-w-md">
                                <SmartAccountSelector
                                    value={fundAccountId}
                                    onChange={(val) => setFundAccountId(val)}
                                    type="all"
                                    placeholder={isRTL ? 'اختر الصندوق/البنك...' : 'Select fund/bank...'}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Fund Balance Strip — only shows when fund is selected */}
                    {fundAccountId && fundImpact && (
                        <div className={cn(
                            "px-4 py-2 flex items-center gap-3 text-xs transition-all duration-300",
                            "bg-gradient-to-r",
                            fundImpact.willGoNegative
                                ? "from-red-50 via-red-50/50 to-orange-50/30 dark:from-red-950/30 dark:via-red-950/20 dark:to-orange-950/10"
                                : docType === 'receipt'
                                    ? "from-emerald-50 via-green-50/50 to-teal-50/30 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/10"
                                    : docType === 'payment'
                                        ? "from-blue-50 via-indigo-50/50 to-sky-50/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-sky-950/10"
                                        : "from-gray-50 via-slate-50/50 to-gray-50/30 dark:from-gray-800 dark:via-gray-800/50 dark:to-gray-800/30",
                        )}>
                            {/* Fund icon */}
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                fundImpact.isCash
                                    ? "bg-amber-100 dark:bg-amber-900/30"
                                    : "bg-blue-100 dark:bg-blue-900/30"
                            )}>
                                <Wallet className={cn(
                                    "w-3.5 h-3.5",
                                    fundImpact.isCash ? "text-amber-600" : "text-blue-600"
                                )} />
                            </div>

                            {/* Fund name */}
                            <div className="min-w-0 shrink-0">
                                <span className="font-semibold text-gray-700 dark:text-gray-300 font-tajawal truncate">
                                    {fundImpact.fundName}
                                </span>
                                <span className="text-gray-400 ms-1 font-mono text-[10px]">
                                    {fundImpact.fundCode}
                                </span>
                            </div>

                            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 shrink-0" />

                            {/* Current Balance */}
                            <div className="flex flex-col items-center shrink-0">
                                <span className="text-[10px] text-gray-400 leading-none mb-0.5">
                                    {isRTL ? 'الرصيد الحالي' : 'Current'}
                                </span>
                                <span className={cn(
                                    "font-mono font-bold text-[13px] leading-none",
                                    fundImpact.currentBalance > 0 ? "text-emerald-600 dark:text-emerald-400"
                                    : fundImpact.currentBalance < 0 ? "text-red-500 dark:text-red-400"
                                    : "text-gray-500"
                                )} dir="ltr">
                                    {Math.abs(fundImpact.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Arrow + Transaction Amount */}
                            {fundImpact.transactionAmount !== 0 && (
                                <>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {fundImpact.transactionAmount > 0 ? (
                                            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                        )}
                                        <span className={cn(
                                            "font-mono font-bold text-[12px]",
                                            fundImpact.transactionAmount > 0 ? "text-green-600" : "text-red-500"
                                        )} dir="ltr">
                                            {fundImpact.transactionAmount > 0 ? '+' : ''}
                                            {fundImpact.transactionAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-500 shrink-0" />

                                    {/* After Balance */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <span className="text-[10px] text-gray-400 leading-none mb-0.5">
                                            {isRTL ? 'بعد التسجيل' : 'After'}
                                        </span>
                                        <span className={cn(
                                            "font-mono font-bold text-[13px] leading-none px-1.5 py-0.5 rounded",
                                            fundImpact.willGoNegative
                                                ? "text-red-600 bg-red-100/80 dark:bg-red-900/40 dark:text-red-400"
                                                : fundImpact.afterBalance >= 0
                                                    ? "text-emerald-700 bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : "text-red-600 bg-red-100/80 dark:bg-red-900/40 dark:text-red-400"
                                        )} dir="ltr">
                                            {Math.abs(fundImpact.afterBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* Warning if will go negative */}
                                    {fundImpact.willGoNegative && (
                                        <div className="flex items-center gap-1 ms-1">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                                                {isRTL ? 'سيصبح سالب!' : 'Will go negative!'}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Currency badge */}
                            <span className="ms-auto text-[10px] font-mono font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
                                {fundImpact.currency}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Premium Header Bar ─── */}
            <div className="shrink-0 px-4 py-3 bg-gradient-to-b from-white via-white to-gray-50/60 dark:from-gray-800 dark:via-gray-800 dark:to-gray-850/80 border-b border-gray-100/80 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status Badge */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm",
                        getStatusColor(status)
                    )}>
                        {getStatusIcon(status)}
                        <span className="capitalize">{status}</span>
                    </div>

                    <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent dark:via-gray-600" />

                    {/* Voucher Number */}
                    <div className="flex items-center gap-1.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-lg px-2.5 py-1">
                        <Hash className="w-3 h-3 text-indigo-400" />
                        {isReadOnly ? (
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{voucherNo || '—'}</span>
                        ) : (
                            <Input
                                value={voucherNo}
                                onChange={(e) => setVoucherNo(e.target.value)}
                                className="font-mono text-center w-24 h-6 text-xs bg-transparent border-dashed border-gray-300 dark:border-gray-600 focus:border-solid focus:border-indigo-400 rounded-md"
                                placeholder="Auto"
                            />
                        )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-lg px-2.5 py-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <Input
                            type="date"
                            value={entryDate ? format(entryDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setEntryDate(new Date(e.target.value))}
                            readOnly={isReadOnly}
                            className="h-6 text-xs w-[125px] bg-transparent border-dashed border-gray-300 dark:border-gray-600 focus:border-solid focus:border-blue-400 rounded-md"
                        />
                    </div>

                    {/* Reference */}
                    <div className="flex items-center gap-1.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-lg px-2.5 py-1 flex-1 min-w-[120px] max-w-[280px]">
                        <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder={isRTL ? "فاتورة، شيك..." : "Invoice, check..."}
                            readOnly={isReadOnly}
                            className="bg-transparent h-6 text-xs border-dashed border-gray-300 dark:border-gray-600 focus:border-solid focus:border-amber-400 flex-1 rounded-md"
                        />
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Live Balance Strip */}
                    <div className={cn(
                        "flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all duration-300",
                        // للقيود اليومية فقط: تحذير عدم التوازن
                        docType === 'journal' && !isBalanced && lineCount > 0
                            ? "bg-red-50/80 border-red-200/60 dark:bg-red-900/20 dark:border-red-700/40 shadow-sm shadow-red-100 dark:shadow-red-900/30 animate-pulse"
                            : isBalanced && lineCount > 0
                                ? "bg-emerald-50/80 border-emerald-200/60 dark:bg-emerald-900/20 dark:border-emerald-700/40 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/30"
                                : "bg-gray-50/60 border-gray-200/60 dark:bg-gray-700/30 dark:border-gray-600/40"
                    )}>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                                {docType === 'cash' || docType === 'payment'
                                    ? (isRTL ? 'مدفوعات' : 'Out')
                                    : (t('accounting.debit') || 'م')}
                            </span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <Equal className="w-3 h-3 text-gray-400" />
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">
                                {docType === 'cash' || docType === 'receipt'
                                    ? (isRTL ? 'مقبوضات' : 'In')
                                    : (t('accounting.credit') || 'د')}
                            </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">{totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {isBalanced && lineCount > 0 && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {/* تحذير الفرق — فقط للقيود اليومية */}
                        {docType === 'journal' && !isBalanced && lineCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-mono">
                                {fmtAmount(Math.abs(totals.debit - totals.credit))}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Description Row */}
                <div className="flex items-center gap-2 mt-2">
                    <AlignLeft className="w-3 h-3 text-gray-400 shrink-0" />
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={isRTL ? 'بيان القيد...' : 'Entry description...'}
                        readOnly={isReadOnly}
                        className={cn(
                            "bg-transparent h-7 text-xs flex-1 rounded-md",
                            "border-dashed border-gray-200 dark:border-gray-700 focus:border-solid focus:border-gray-400",
                            description ? "font-medium text-gray-800 dark:text-gray-200" : "text-gray-400"
                        )}
                    />
                </div>
            </div>

            {/* ─── AccountingGrid ─── */}
            <div
                className="flex-1 min-h-0 overflow-auto"
                onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        if (!handleValidatedSave()) return;
                    }
                    if (e.key === 'F9') {
                        e.preventDefault();
                        handleF9Balance();
                    }
                }}
            >
                <AccountingGrid<JournalLineRow>
                    rows={lines}
                    onChange={handleLinesChange}
                    columns={columns}
                    editableColumns={editableColumns as GridEditableColumn[]}
                    isRTL={isRTL}

                    debitKey="debit"
                    creditKey="credit"

                    onAddRow={handleAddRow}
                    onInsertRow={handleInsertRow}
                    onDeleteRow={(_, __) => { void __; }}
                    initialEmptyRows={0}
                    emptyRowsThreshold={3}
                    autoAddRowsCount={3}
                    canDeleteRows={!isReadOnly}
                    onCellChange={!isReadOnly ? handleCellChange : undefined}

                    enableBalanceShortcut={docType === 'journal'}
                    hideBalanceWarning={docType !== 'journal'}

                    renderAccountBalance={(accountId) => {
                        const acctCurr = accountCurrencies.get(accountId) || companyCurrency;
                        const isFC = acctCurr !== companyCurrency;
                        
                        // للحسابات الأجنبية: الرصيد الحقيقي من debit_fc - credit_fc
                        // للحسابات المحلية: current_balance مباشرة
                        let bal: number | undefined;
                        if (isFC) {
                            // لحسابات العملات الأجنبية: فقط FC balance أو لا شيء
                            bal = accountFCBalances.get(accountId);
                            if (bal === undefined) return null; // لا نعرض الغريفن أبداً!
                        } else {
                            bal = accountBalances.get(accountId);
                        }
                        if (bal === undefined) return null;
                        
                        const displayCurr = isFC && accountFCBalances.has(accountId) ? acctCurr : companyCurrency;
                        return (
                            <span className={`text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
                                bal >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                                <span className="opacity-60 mr-0.5">{displayCurr}</span>
                                {fmtAmount(Math.abs(bal))}
                            </span>
                        );
                    }}

                    getRowClassName={getRowClassName}
                    showKeyboardHelp={!isReadOnly}
                    isReadOnly={isReadOnly}
                    companyId={resolvedCid || undefined}
                    emptyMessage={linesLoading ? (isRTL ? 'جارٍ تحميل البنود...' : 'Loading...') : (isRTL ? 'لا توجد بنود' : 'No line items')}
                    maxHeight="none"
                />
            </div>

            {/* ─── Premium Totals Footer ─── */}
            <div
                className="shrink-0 z-20 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #0c1929 0%, #152642 40%, #0f1f36 70%, #0c1929 100%)',
                }}
            >
                {/* Subtle top highlight */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

                <div className={cn(
                    "flex items-center gap-5 px-4 py-3",
                    isRTL ? "flex-row justify-start" : "flex-row-reverse justify-start"
                )}>
                    {/* Line Count */}
                    <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-400">{t('accounting.lines') || 'البنود'}</span>
                        <span className="font-bold text-sm text-slate-200 tabular-nums bg-slate-800/50 px-2 py-0.5 rounded-md">{lineCount}</span>
                    </div>

                    <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />

                    {/* Total Debit / المدفوعات */}
                    {docType !== 'receipt' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                                {docType === 'cash' || docType === 'payment'
                                    ? (isRTL ? 'إجمالي المدفوعات' : 'Total Payments')
                                    : (t('accounting.debit') || 'مدين')}
                            </span>
                            <span className="font-bold text-sm text-rose-400 tabular-nums">
                                {fmtAmount(totals.debit)}
                            </span>
                        </div>
                    )}

                    {docType !== 'receipt' && <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />}

                    {/* Total Credit / المقبوضات */}
                    {docType !== 'payment' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                                {docType === 'cash' || docType === 'receipt'
                                    ? (isRTL ? 'إجمالي المقبوضات' : 'Total Receipts')
                                    : (t('accounting.credit') || 'دائن')}
                            </span>
                            <span className="font-bold text-sm text-teal-400 tabular-nums">
                                {fmtAmount(totals.credit)}
                            </span>
                        </div>
                    )}

                    <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />

                    {/* Balance Section */}
                    {(docType === 'journal' || docType === 'recurring') ? (
                        /* القيود اليومية: الفرق بين المدين والدائن */
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-500",
                            isBalanced && lineCount > 0
                                ? "bg-emerald-500/10 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                : !isBalanced && lineCount > 0
                                    ? "bg-red-500/10 ring-1 ring-red-500/30 shadow-lg shadow-red-500/10"
                                    : "bg-slate-800/30"
                        )}>
                            <span className="text-xs text-slate-400">{t('common.balance') || 'الرصيد'}</span>
                            <span className={cn(
                                "font-bold text-sm tabular-nums",
                                isBalanced ? "text-emerald-400" : "text-red-400"
                            )}>
                                {fmtAmount(Math.abs(totals.debit - totals.credit))}
                            </span>
                            {isBalanced && lineCount > 0 && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {!isBalanced && lineCount > 0 && (
                                <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                            )}
                        </div>
                    ) : (
                        /* الصندوق/المقبوضات/المدفوعات: رصيد الصندوق بعد التسجيل */
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-500 ring-1",
                            fundImpact
                                ? fundImpact.willGoNegative
                                    ? "bg-red-500/10 ring-red-500/30 shadow-lg shadow-red-500/10"
                                    : fundImpact.afterBalance >= 0
                                        ? "bg-emerald-500/10 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                        : "bg-red-500/10 ring-red-500/30"
                                : "bg-slate-800/30 ring-slate-700/30"
                        )}>
                            <span className="text-xs text-slate-400">
                                {isRTL ? 'الرصيد بعد التسجيل' : 'Balance After'}
                            </span>
                            {fundImpact ? (
                                <span className={cn(
                                    "font-bold text-sm tabular-nums",
                                    fundImpact.willGoNegative || fundImpact.afterBalance < 0
                                        ? "text-red-400"
                                        : "text-emerald-400"
                                )}>
                                    {fmtAmount(fundImpact.afterBalance)}
                                    <span className="text-[10px] text-slate-500 ms-1 font-normal">{fundImpact.currency}</span>
                                </span>
                            ) : (
                                <span className="text-slate-500 text-xs">
                                    {isRTL ? '— اختر الصندوق' : '— Select fund'}
                                </span>
                            )}
                            {fundImpact && !fundImpact.willGoNegative && fundImpact.afterBalance >= 0 && lineCount > 0 && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            )}
                            {fundImpact?.willGoNegative && (
                                <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                            )}
                        </div>
                    )}

                    {/* Duplicate Account Warning */}
                    {duplicateAccountIds.size > 0 && (
                        <>
                            <div className="h-5 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
                            <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg ring-1 ring-amber-500/20">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs text-amber-400 font-semibold">
                                    {isRTL ? `${duplicateAccountIds.size} حساب مكرر` : `${duplicateAccountIds.size} duplicate`}
                                </span>
                            </div>
                        </>
                    )}
                </div>


                {/* Amount in Words */}
                {lineCount > 0 && totals.debit > 0 && (
                    <div className={cn(
                        "px-4 py-1.5 text-xs text-slate-400/80 border-t border-slate-700/30 truncate font-tajawal",
                        isRTL ? "text-right" : "text-left"
                    )}>
                        <span className="text-slate-500 me-1">💬</span>
                        المبلغ: {numberToArabicWords(totals.debit)}
                    </div>
                )}
            </div>
        </div>
    );
}

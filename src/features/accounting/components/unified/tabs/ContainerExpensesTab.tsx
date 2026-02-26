/**
 * ContainerExpensesTab — تبويب مصاريف الكونتينر (الإصدار المتقدم)
 *
 * ✅ يجلب المصاريف من DB مباشرة (Self-Fetching Pattern)
 * ✅ قسم المصاريف الأولية — للتخطيط فقط (بدون أثر محاسبي)
 * ✅ قسم المصاريف الفعلية — مستقل تماماً مع قيد فوري
 * ✅ يدعم RBAC — إخفاء المبالغ عن الأدوار غير المصرح لها
 * ✅ ملخص تكاليف في الأسفل مع Landed Cost المبدئي
 * ✅ حالة المصروف (متوقع/مؤكد/مدفوع)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyCurrency, CURRENCY_META } from '@/hooks/useCompanyCurrency';
import { ExchangeRatesService } from '@/services/data/ExchangeRatesService';
import { accountsService, getAccountName } from '@/services/accountsService';
import type { Account } from '@/services/accountsService';
import { useTradePermissions } from '@/hooks/useTradePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import {
    Plus, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle,
    Check, Clock, CreditCard, Save, Loader2, RefreshCw, Calculator,
    Lock, Unlock, ChevronDown, ChevronUp, Package, BookOpen, Pencil, ShieldCheck
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calculateLandedCost, saveEstimatedDistribution, saveActualDistribution, finalizeLandedCost, deleteContainerExpense, createExpenseJournalEntry } from '@/services/containersService';
import { SmartAccountSelector } from '@/features/accounting/components/shared/SmartAccountSelector';
import { journalEntriesService } from '@/services/journalEntriesService';

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════

interface ExpenseRow {
    id: string;
    expense_type: string;
    description: string;
    vendor_name: string;
    expected_amount: number;
    actual_amount: number | null;
    currency_code: string;
    exchange_rate: number;
    account_id?: string | null;
    account_name?: string;
    invoice_number: string;
    invoice_date: string;
    payment_status: 'pending' | 'partial' | 'paid';
    paid_amount: number;
    notes: string;
    journal_entry_id?: string | null;
    // UI state
    _isNew?: boolean;
    _isDirty?: boolean;
    _isEditing?: boolean;
}

// ── المصروف الفعلي — نوع مستقل ──
interface ActualExpenseRow {
    id: string;
    container_id: string;
    expense_type: string;
    description: string;
    amount: number;                   // المبلغ الإجمالي (بعد الضريبة)
    currency_code: string;            // ✅ يتطابق مع عمود DB
    exchange_rate: number;
    expense_account_id: string | null;  // حساب المصروف (مدين)
    vendor_account_id: string | null;   // حساب المورد (دائن)
    vendor_name: string;
    tax_rate: number;
    tax_amount: number;
    amount_before_tax: number;
    is_posted: boolean;
    journal_entry_id: string | null;
    journal_description: string;
    notes: string;
    created_at: string;
    // UI helpers
    _isEditing?: boolean;
    _expenseAccountName?: string;
    _vendorAccountName?: string;
}

// ── سطر مصروف معلّق (لم يُحفظ بعد) ──
interface PendingExpenseItem {
    _tempId: string;                   // معرّف مؤقت للحذف من القائمة
    expense_type: string;
    description: string;
    amount_before_tax: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;              // = amount_before_tax + tax_amount
    currency_code: string;
    exchange_rate: number;
    expense_account_id: string;        // حساب نوع المصروف (للتصنيف)
    account_name: string;              // اسم حساب المصروف (للعرض)
    vendor_account_id: string;         // حساب المورد/مقدم الخدمة (الدائن)
    vendor_account_name: string;       // اسم حساب المورد (للعرض)
    notes: string;
}

interface ContainerExpensesTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

// ════════════════════════════════════════════
// Expense Type Definitions
// ════════════════════════════════════════════

const EXPENSE_TYPES = [
    { value: 'freight', labelAr: 'الشحن البحري', labelEn: 'Ocean Freight', icon: '🚢' },
    { value: 'customs', labelAr: 'الرسوم الجمركية', labelEn: 'Customs Duties', icon: '🏛️' },
    { value: 'tax', labelAr: 'ضريبة / VAT', labelEn: 'Tax / VAT', icon: '🧾' },
    { value: 'insurance', labelAr: 'التأمين', labelEn: 'Insurance', icon: '🛡️' },
    { value: 'handling', labelAr: 'مناولة', labelEn: 'Handling', icon: '📦' },
    { value: 'transport', labelAr: 'النقل الداخلي', labelEn: 'Inland Transport', icon: '🚛' },
    { value: 'clearance', labelAr: 'تخليص جمركي', labelEn: 'Customs Clearance', icon: '📋' },
    { value: 'storage', labelAr: 'تخزين', labelEn: 'Storage', icon: '🏭' },
    { value: 'inspection', labelAr: 'فحص', labelEn: 'Inspection', icon: '🔍' },
    { value: 'documentation', labelAr: 'توثيق', labelEn: 'Documentation', icon: '📄' },
    { value: 'demurrage', labelAr: 'غرامات تأخير', labelEn: 'Demurrage', icon: '⏰' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', icon: '📌' },
];

const PAYMENT_STATUSES = [
    { value: 'pending', labelAr: 'معلق', labelEn: 'Pending', color: 'bg-amber-100 text-amber-700' },
    { value: 'partial', labelAr: 'جزئي', labelEn: 'Partial', color: 'bg-blue-100 text-blue-700' },
    { value: 'paid', labelAr: 'مدفوع', labelEn: 'Paid', color: 'bg-green-100 text-green-700' },
];

const ALLOCATION_METHODS = [
    { value: 'by_value', labelAr: 'حسب القيمة', labelEn: 'By Value', icon: '💰' },
    { value: 'by_quantity', labelAr: 'حسب الكمية', labelEn: 'By Quantity', icon: '📦' },
    { value: 'by_weight', labelAr: 'حسب الوزن', labelEn: 'By Weight', icon: '⚖️' },
    { value: 'equal', labelAr: 'بالتساوي', labelEn: 'Equal', icon: '➗' },
    { value: 'manual', labelAr: 'يدوي', labelEn: 'Manual', icon: '✏️' },
];

// ════════════════════════════════════════════
// Component
// ════════════════════════════════════════════

export const ContainerExpensesTab: React.FC<ContainerExpensesTabProps> = ({
    data,
    mode,
    onChange
}) => {
    const { t, isRTL, language } = useLanguage();
    const { companyId } = useCompany();
    const { user, tenantId, isSuperAdmin } = useAuth();
    const { currencyCode: companyCurrency } = useCompanyCurrency();
    const { columns: colPerms } = useTradePermissions({ tradeMode: 'purchase' });
    const queryClient = useQueryClient();

    const isEditable = mode === 'create' || mode === 'edit';
    const containerId = data?.id;
    const isNewContainer = !containerId;
    // عملة الكونتينر: أولوية لعملة البضائع (إن حُددت)، ثم عملة الشركة من الإعدادات
    const containerCurrency = data?.goods_currency || companyCurrency;

    // ─── State ───
    const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasUnsaved, setHasUnsaved] = useState(false);

    // ─── Landed Cost State ───
    const [calculating, setCalculating] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [allocationResult, setAllocationResult] = useState<any>(null);
    const [showAllocation, setShowAllocation] = useState(false);
    const [showClosingDetails, setShowClosingDetails] = useState(false);
    const isFinalized = data?.is_cost_finalized === true;


    // ─── Expense Accounts & Currencies ───
    const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

    // ── العملات المتاحة = العملة المحلية + العملات من جدول exchange_rates ──
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
    useEffect(() => {
        const fetchCurrencies = async () => {
            const currencies = new Set<string>();
            // 1. عملة الشركة (المحلية) — دائماً متاحة
            if (companyCurrency) currencies.add(companyCurrency);
            // 2. عملة الكونتينر — إن اختلفت
            if (containerCurrency && containerCurrency !== companyCurrency) currencies.add(containerCurrency);
            // 3. العملات المعرّفة في إعدادات الشركة (exchange_rates)
            if (companyId) {
                try {
                    const rates = await ExchangeRatesService.getRates(companyId);
                    rates.forEach(r => {
                        currencies.add(r.from_currency);
                        currencies.add(r.to_currency);
                    });
                } catch { /* ignore */ }
            }
            setAvailableCurrencies(Array.from(currencies));
        };
        fetchCurrencies();
    }, [companyId, companyCurrency, containerCurrency]);
    const [estimatedAllocationMethod, setEstimatedAllocationMethod] = useState<string>(data?.cost_allocation_method || 'by_value');

    const [expandedActualRows, setExpandedActualRows] = useState<Set<string>>(new Set());
    const toggleActualRow = (id: string) => {
        setExpandedActualRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // ── الدفعات المفتوحة — M3 ──
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
    const toggleBatch = (batchKey: string) => {
        setExpandedBatches(prev => {
            const next = new Set(prev);
            if (next.has(batchKey)) next.delete(batchKey); else next.add(batchKey);
            return next;
        });
    };

    // ════════════════════════════════════════════
    // ─── المصاريف الفعلية — حالة مستقلة تماماً ───
    // ════════════════════════════════════════════
    const [actualExpenses, setActualExpenses] = useState<ActualExpenseRow[]>([]);
    const [actualLoading, setActualLoading] = useState(false);
    const [showAddActualForm, setShowAddActualForm] = useState(false);
    const [actualSaving, setActualSaving] = useState(false);

    // ─── قيد الإقفال الحقيقي ───
    const [closingJE, setClosingJE] = useState<{
        entry_number: string;
        entry_date: string;
        total_debit: number;
    } | null>(null);

    // ─── حساب المخزون الحقيقي من CoA ───
    const [inventoryAccount, setInventoryAccount] = useState<{
        id: string;
        account_code: string;
        name_ar: string;
        name_en: string;
    } | null>(null);

    useEffect(() => {
        if (!companyId) return;
        const fetchInventoryAccount = async () => {
            // ══ المصدر الرسمي: companies.accounting_settings.default_accounts ══
            const { data: company } = await supabase
                .from('companies')
                .select('accounting_settings')
                .eq('id', companyId)
                .maybeSingle();

            let accountId = company?.accounting_settings?.default_accounts?.inventory_account_id;

            // ── fallback: ابحث مباشرة في CoA ──
            if (!accountId) {
                const { data: fallback } = await supabase
                    .from('chart_of_accounts')
                    .select('id')
                    .eq('company_id', companyId)
                    .or('account_code.like.1141%,name_ar.ilike.%بضاعة جاهزة%,name_ar.ilike.%مخزون%')
                    .order('account_code')
                    .limit(1)
                    .maybeSingle();
                accountId = fallback?.id;
            }

            if (!accountId) return;

            const { data: acc } = await supabase
                .from('chart_of_accounts')
                .select('id, account_code, name_ar, name_en')
                .eq('id', accountId)
                .maybeSingle();

            if (acc) setInventoryAccount(acc);
        };
        fetchInventoryAccount();
    }, [companyId]);

    // ─── حساب الكونتينر من CoA (لعرض الكود الحقيقي في قيد الإقفال) ───
    const [containerCoaAccount, setContainerCoaAccount] = useState<{
        account_code: string;
        name_ar: string;
    } | null>(null);

    useEffect(() => {
        if (!data?.container_account_id) return;
        supabase
            .from('chart_of_accounts')
            .select('account_code, name_ar')
            .eq('id', data.container_account_id)
            .maybeSingle()
            .then(({ data: acc }) => { if (acc) setContainerCoaAccount(acc); });
    }, [data?.container_account_id]);

    useEffect(() => {
        if (!containerId) return;
        const fetchClosingJE = async () => {
            // ── مصدر 1: من purchase_receipts ──
            const { data: receipt } = await supabase
                .from('purchase_receipts')
                .select('journal_entry_id, status')
                .eq('container_id', containerId)
                .not('journal_entry_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (receipt?.journal_entry_id) {
                const { data: je } = await supabase
                    .from('journal_entries')
                    .select('entry_number, entry_date, total_debit')
                    .eq('id', receipt.journal_entry_id)
                    .maybeSingle();
                if (je) { setClosingJE(je); return; }
            }

            // ── مصدر 2: من journal_entries (بناءً على reference_id أو notes) ──
            const { data: je2 } = await supabase
                .from('journal_entries')
                .select('entry_number, entry_date, total_debit')
                .or(`reference_id.eq.${containerId},notes.ilike.%${containerId}%`)
                .in('entry_type', ['goods_receipt', 'inventory_in', 'container_close'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (je2) { setClosingJE(je2); return; }

            setClosingJE(null);
        };
        fetchClosingJE();
    }, [containerId, data?.status]);

    // ─── isClosed: كونتينر مغلق فعلياً ───
    const isClosed = (data?.status === 'closed' || data?.status === 'received');

    const [pendingExpenses, setPendingExpenses] = useState<PendingExpenseItem[]>([]);

    // ── الحقول المؤقتة لنموذج الإضافة ──
    const [newActual, setNewActual] = useState({
        expense_type: 'shipping',
        description: '',
        amount: 0,
        currency_code: containerCurrency,
        exchange_rate: 1,
        expense_account_id: '' as string,
        vendor_account_id: '' as string,    // حساب المورد/مقدم الخدمة (الدائن)
        tax_rate: 0,
        notes: '',
    });

    // ── جلب المصاريف الفعلية من DB ──
    const fetchActualExpenses = useCallback(async () => {
        if (!containerId) return;
        setActualLoading(true);
        try {
            const { data: rows, error } = await supabase
                .from('container_expenses')
                .select('*')
                .eq('container_id', containerId)
                .not('vendor_account_id', 'is', null) // فقط المصاريف الفعلية (لها حساب مورد/مقدم خدمة)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // جلب أسماء الحسابات
            const accountIds = new Set<string>();
            (rows || []).forEach((r: any) => {
                if (r.expense_account_id) accountIds.add(r.expense_account_id);
                if (r.vendor_account_id) accountIds.add(r.vendor_account_id);
            });

            let accountNames: Record<string, string> = {};
            if (accountIds.size > 0 && companyId) {
                try {
                    const allAccounts = await accountsService.getAll(companyId);
                    allAccounts.forEach(a => {
                        accountNames[a.id] = language === 'ar' ? a.name_ar : (a.name_en || a.name_ar);
                    });
                } catch {/* ignore */ }
            }

            setActualExpenses((rows || []).map((r: any) => ({
                id: r.id,
                container_id: r.container_id,
                expense_type: r.expense_type || 'other',
                description: r.description || '',
                amount: r.amount || r.actual_amount || 0,
                currency_code: r.currency_code || containerCurrency,
                exchange_rate: r.exchange_rate || 1,
                expense_account_id: r.expense_account_id || null,
                vendor_account_id: r.vendor_account_id || null,
                vendor_name: r.vendor_name || '',
                tax_rate: r.tax_rate || 0,
                tax_amount: r.tax_amount || 0,
                amount_before_tax: r.amount_before_tax || r.amount || 0,
                is_posted: r.is_posted || false,
                journal_entry_id: r.journal_entry_id || null,
                journal_description: r.journal_description || r.description || '',
                notes: r.notes || '',
                created_at: r.created_at || '',
                _expenseAccountName: r.expense_account_id ? (accountNames[r.expense_account_id] || '') : '',
                _vendorAccountName: r.vendor_account_id ? (accountNames[r.vendor_account_id] || '') : '',
            })));
        } catch (err) {
            console.error('Error fetching actual expenses:', err);
            toast.error(isRTL ? 'خطأ في تحميل المصاريف الفعلية' : 'Error loading actual expenses');
        } finally {
            setActualLoading(false);
        }
    }, [containerId, containerCurrency, companyId, language, isRTL]);

    useEffect(() => {
        if (containerId) fetchActualExpenses();
    }, [fetchActualExpenses, containerId]);

    // ── حساب إجماليات المصاريف الفعلية ──
    const actualTotals = useMemo(() => {
        const totalAmount = actualExpenses.reduce((sum, e) => {
            if (e.currency_code === containerCurrency) return sum + (e.amount_before_tax || 0);
            return sum + ((e.amount_before_tax || 0) * (e.exchange_rate || 1));
        }, 0);
        const totalTax = actualExpenses.reduce((sum, e) => sum + (e.tax_amount || 0), 0);
        const totalWithTax = actualExpenses.reduce((sum, e) => {
            if (e.currency_code === containerCurrency) return sum + (e.amount || 0);
            return sum + ((e.amount || 0) * (e.exchange_rate || 1));
        }, 0);
        const postedCount = actualExpenses.filter(e => e.is_posted).length;
        return { totalAmount, totalTax, totalWithTax, postedCount };
    }, [actualExpenses, containerCurrency]);

    // ── إجماليات الدفعة المعلّقة ──
    const pendingTotals = useMemo(() => {
        const totalBeforeTax = pendingExpenses.reduce((sum, e) => sum + e.amount_before_tax, 0);
        const totalTax = pendingExpenses.reduce((sum, e) => sum + e.tax_amount, 0);
        const totalAmount = pendingExpenses.reduce((sum, e) => sum + e.total_amount, 0);
        return { totalBeforeTax, totalTax, totalAmount, count: pendingExpenses.length };
    }, [pendingExpenses]);

    // ── M3: تجميع المصاريف حسب journal_entry_id (دفعات) ──
    const batchGroups = useMemo(() => {
        const groups = new Map<string, {
            journalEntryId: string;
            expenses: ActualExpenseRow[];
            totalBeforeTax: number;
            totalTax: number;
            totalAmount: number;
            date: string;
            isAllPosted: boolean;
            currencies: Set<string>;
        }>();

        actualExpenses.forEach(exp => {
            const key = exp.journal_entry_id || `no-je-${exp.id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    journalEntryId: exp.journal_entry_id || '',
                    expenses: [],
                    totalBeforeTax: 0,
                    totalTax: 0,
                    totalAmount: 0,
                    date: exp.created_at?.split('T')[0] || '',
                    isAllPosted: true,
                    currencies: new Set(),
                });
            }
            const g = groups.get(key)!;
            g.expenses.push(exp);
            g.totalBeforeTax += (exp.amount_before_tax || 0);
            g.totalTax += (exp.tax_amount || 0);
            g.totalAmount += (exp.amount || exp.amount_before_tax || 0);
            if (!exp.is_posted) g.isAllPosted = false;
            g.currencies.add(exp.currency_code);
        });

        // ترتيب حسب التاريخ (الأحدث أولاً)
        return Array.from(groups.entries())
            .sort((a, b) => (b[1].date || '').localeCompare(a[1].date || ''));
    }, [actualExpenses]);

    // ── إضافة مصروف للقائمة المعلّقة (لا يحفظ في DB) ──
    const handleAddToPending = async () => {
        if (!newActual.vendor_account_id) {
            toast.error(isRTL ? 'اختر حساب المورد / مقدم الخدمة (الدائن)' : 'Select vendor / service provider account (creditor)');
            return;
        }
        if (!newActual.amount || newActual.amount <= 0) {
            toast.error(isRTL ? 'أدخل المبلغ' : 'Enter amount');
            return;
        }

        // حساب الضريبة
        const taxRate = newActual.tax_rate || 0;
        const amountBeforeTax = newActual.amount;
        const taxAmount = Math.round(amountBeforeTax * taxRate) / 100;
        const totalAmount = amountBeforeTax + taxAmount;

        // جلب أسماء الحسابات (المصروف والمورد)
        let accountName = '';
        let vendorAccountName = '';
        try {
            if (companyId) {
                const allAccounts = await accountsService.getAll(companyId);
                const foundExpAccount = allAccounts.find(a => a.id === newActual.expense_account_id);
                accountName = foundExpAccount
                    ? (language === 'ar' ? foundExpAccount.name_ar : (foundExpAccount.name_en || foundExpAccount.name_ar))
                    : '';
                const foundVendorAccount = allAccounts.find(a => a.id === newActual.vendor_account_id);
                vendorAccountName = foundVendorAccount
                    ? (language === 'ar' ? foundVendorAccount.name_ar : (foundVendorAccount.name_en || foundVendorAccount.name_ar))
                    : '';
            }
        } catch { /* ignore */ }

        const autoDescription = newActual.description ||
            `${EXPENSE_TYPES.find(t => t.value === newActual.expense_type)?.labelAr || newActual.expense_type} — ${vendorAccountName || accountName || 'مصروف'}`;

        const pendingItem: PendingExpenseItem = {
            _tempId: crypto.randomUUID(),
            expense_type: newActual.expense_type,
            description: autoDescription,
            amount_before_tax: amountBeforeTax,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            currency_code: newActual.currency_code,
            exchange_rate: newActual.exchange_rate,
            expense_account_id: newActual.expense_account_id,
            account_name: accountName,
            vendor_account_id: newActual.vendor_account_id,
            vendor_account_name: vendorAccountName,
            notes: newActual.notes,
        };

        setPendingExpenses(prev => [...prev, pendingItem]);

        // تصفير النموذج (لكن إبقاء النموذج مفتوحاً لإضافة المزيد)
        setNewActual({
            expense_type: 'shipping',
            description: '',
            amount: 0,
            currency_code: containerCurrency,
            exchange_rate: 1,
            expense_account_id: '',
            vendor_account_id: '',
            tax_rate: 0,
            notes: '',
        });

        toast.success(isRTL
            ? `✅ تمت الإضافة للدفعة (${pendingExpenses.length + 1} مصروف)`
            : `✅ Added to batch (${pendingExpenses.length + 1} expenses)`
        );
    };

    // ── حذف مصروف من القائمة المعلّقة ──
    const handleRemoveFromPending = (tempId: string) => {
        setPendingExpenses(prev => prev.filter(e => e._tempId !== tempId));
    };

    // ── حفظ وترحيل الدفعة كاملة (M2 — قيد واحد) ──
    const handleSaveAndPostBatch = async () => {
        if (actualSaving) return; // حماية من الضغط المزدوج
        if (pendingExpenses.length === 0) {
            toast.error(isRTL ? 'أضف مصروف واحد على الأقل' : 'Add at least one expense');
            return;
        }
        if (!containerId || !companyId || !user?.id) return;

        setActualSaving(true);
        try {
            // 1. حفظ كل المصاريف في DB (bulk insert)
            const expenseRows = pendingExpenses.map(pe => ({
                container_id: containerId,
                tenant_id: tenantId,
                company_id: companyId,
                expense_type: pe.expense_type,
                description: pe.description,
                vendor_name: pe.vendor_account_name || pe.account_name,
                amount: pe.total_amount,
                actual_amount: pe.total_amount,
                amount_before_tax: pe.amount_before_tax,
                tax_rate: pe.tax_rate,
                tax_amount: pe.tax_amount,
                currency_code: pe.currency_code,
                exchange_rate: pe.exchange_rate,
                expense_account_id: pe.expense_account_id || null,
                vendor_account_id: pe.vendor_account_id,  // حساب المورد الصحيح (الدائن)
                journal_description: pe.description,
                notes: pe.notes,
                is_posted: false,
            }));

            const { data: savedRows, error: insertError } = await supabase
                .from('container_expenses')
                .insert(expenseRows)
                .select();

            if (insertError) throw insertError;

            // ════════════════════════════════════════════════════════
            // 2. بناء القيد المحاسبي الصحيح:
            //    مدين = حساب بضاعة بالطريق (الكونتينر) → الأصل يزداد (رسملة)
            //    دائن = حسابات الموردين/مقدمي الخدمة → التزام عليѐنا لهم
            //    "من له المال على من؟" → نحن مدينون للموردين
            // ════════════════════════════════════════════════════════
            const journalLines: any[] = [];
            let totalAmountInLocal = 0;
            let totalTaxInLocal = 0;
            const batchDescParts: string[] = [];

            // ── الدائنون: حساب كل مورد/مقدم خدمة (التزام) ──
            for (const pe of pendingExpenses) {
                const netInLocal = pe.amount_before_tax * (pe.exchange_rate || 1);
                const taxInLocal = pe.tax_amount * (pe.exchange_rate || 1);
                const totalInLocal = netInLocal + taxInLocal;
                totalAmountInLocal += totalInLocal;
                totalTaxInLocal += taxInLocal;

                // دائن: حساب المورد/مقدم الخدمة (الالتزام)
                journalLines.push({
                    account_id: pe.vendor_account_id,
                    debit: 0,
                    credit: totalInLocal,
                    description: `${pe.description} — ${isRTL ? 'التزام لـ' : 'Obligation to'} ${pe.vendor_account_name || pe.account_name}`,
                });

                batchDescParts.push(pe.vendor_account_name || pe.account_name || pe.description);
            }

            // ── المدين: حساب بضاعة بالطريق — الكونتينر (رسملة الأصل) ──
            const containerAccountId = data?.container_account_id;
            if (!containerAccountId) {
                toast.error(isRTL
                    ? 'لم يتم إنشاء حساب بضاعة بالطريق لهذا الكونتينر. تحقق من إعداد الحسابات.'
                    : 'No Goods in Transit account found for this container. Check account setup.');
                setActualSaving(false);
                return;
            }

            // مدين إضافي: ضريبة مدخلات مجمّعة (إن وجدت)
            if (totalTaxInLocal > 0) {
                let taxAccountId: string | null = null;
                try {
                    const allAccounts = await accountsService.getAll(companyId);
                    const taxAccount = allAccounts.find(a =>
                        a.code === '1160' ||
                        a.name_en?.toLowerCase().includes('input tax') ||
                        a.name_ar?.includes('ضريبة مدخلات')
                    );
                    taxAccountId = taxAccount?.id || null;
                } catch { /* ignore */ }

                if (taxAccountId) {
                    // مدين: ضريبة مدخلات
                    journalLines.push({
                        account_id: taxAccountId,
                        debit: totalTaxInLocal,
                        credit: 0,
                        description: isRTL
                            ? `ضريبة مدخلات — مصاريف كونتينر ${data?.container_number || ''}`
                            : `Input Tax — Container ${data?.container_number || ''} expenses`,
                    });

                    // مدين: حساب الكونتينر (بدون الضريبة — الضريبة ذهبت لحسابها)
                    journalLines.push({
                        account_id: containerAccountId,
                        debit: totalAmountInLocal - totalTaxInLocal,
                        credit: 0,
                        description: isRTL
                            ? `رسملة مصاريف كونتينر ${data?.container_number || ''} (بضاعة بالطريق)`
                            : `Capitalize container ${data?.container_number || ''} expenses (Goods in Transit)`,
                    });
                } else {
                    // لا يوجد حساب ضريبة — كامل المبلغ يُرسمَل في الكونتينر
                    journalLines.push({
                        account_id: containerAccountId,
                        debit: totalAmountInLocal,
                        credit: 0,
                        description: isRTL
                            ? `رسملة مصاريف كونتينر ${data?.container_number || ''} (بضاعة بالطريق)`
                            : `Capitalize container ${data?.container_number || ''} expenses (Goods in Transit)`,
                    });
                }
            } else {
                // لا ضريبة — كامل المبلغ يُرسمَل
                journalLines.push({
                    account_id: containerAccountId,
                    debit: totalAmountInLocal,
                    credit: 0,
                    description: isRTL
                        ? `رسملة مصاريف كونتينر ${data?.container_number || ''} (بضاعة بالطريق)`
                        : `Capitalize container ${data?.container_number || ''} expenses (Goods in Transit)`,
                });
            }

            // ── التحقق من توازن القيد ──
            const totalDebit = journalLines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
            const totalCredit = journalLines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                console.error('⚠️ Journal entry imbalanced!', { totalDebit, totalCredit, diff: totalDebit - totalCredit });
                toast.error(isRTL
                    ? `القيد غير متوازن! مدين: ${totalDebit.toFixed(2)} ≠ دائن: ${totalCredit.toFixed(2)}`
                    : `Journal entry imbalanced! Dr: ${totalDebit.toFixed(2)} ≠ Cr: ${totalCredit.toFixed(2)}`);
                setActualSaving(false);
                return;
            }

            const batchDesc = isRTL
                ? `رسملة مصاريف كونتينر ${data?.container_number || ''}: ${batchDescParts.join(' + ')}`
                : `Capitalize container ${data?.container_number || ''} expenses: ${batchDescParts.join(' + ')}`;

            // 3. إنشاء القيد المحاسبي الموحّد (مرتبط بالكونتينر)
            const journalEntry = await journalEntriesService.create({
                company_id: companyId,
                entry_date: new Date().toISOString().split('T')[0],
                entry_type: 'container_expense',
                description: batchDesc,
                reference_type: 'container',
                reference_id: containerId,
                lines: journalLines,
            });

            // 4. ترحيل القيد فوراً
            await journalEntriesService.post(journalEntry.id, user.id);

            // 5. ربط القيد بكل المصاريف
            if (savedRows && savedRows.length > 0) {
                const ids = savedRows.map((r: any) => r.id);
                await supabase
                    .from('container_expenses')
                    .update({
                        journal_entry_id: journalEntry.id,
                        is_posted: true,
                        updated_at: new Date().toISOString(),
                    })
                    .in('id', ids);
            }

            // 6. تصفير القائمة المعلّقة
            setPendingExpenses([]);
            setShowAddActualForm(false);

            // 7. إعادة جلب المصاريف
            await fetchActualExpenses();

            toast.success(isRTL
                ? `✅ تم حفظ ${savedRows?.length || 0} مصروف وترحيل القيد ${journalEntry.entry_number}`
                : `✅ Saved ${savedRows?.length || 0} expenses & posted entry ${journalEntry.entry_number}`
            );

        } catch (err: any) {
            console.error('Error saving batch expenses:', err);
            toast.error(err.message || (isRTL ? 'خطأ في حفظ الدفعة' : 'Error saving batch'));
        } finally {
            setActualSaving(false);
        }
    };

    // ── تعديل مصروف فعلي (إلغاء ترحيل → تعديل → إعادة ترحيل) ──
    // ※ لا ننشئ قيود عكسية — نعدل القيد الأصلي مباشرة
    const handleUpdateActualExpense = async (expenseId: string, updates: Partial<ActualExpenseRow>) => {
        if (!companyId || !user?.id) return;

        const exp = actualExpenses.find(e => e.id === expenseId);
        if (!exp) return;

        const containerAccountId = data?.container_account_id;
        if (!containerAccountId) {
            toast.error(isRTL ? 'لم يتم إنشاء حساب بضاعة بالطريق لهذا الكونتينر' : 'No container transit account found');
            return;
        }

        setActualSaving(true);
        try {
            const newAmountBeforeTax = updates.amount_before_tax ?? (updates.amount ?? exp.amount_before_tax);
            const newTaxRate = updates.tax_rate ?? exp.tax_rate;
            const newTaxAmount = Math.round(newAmountBeforeTax * newTaxRate) / 100;
            const totalAmount = newAmountBeforeTax + newTaxAmount;
            const newDescription = updates.description ?? exp.description;
            const newExpenseAccountId = updates.expense_account_id ?? exp.expense_account_id;
            const newVendorAccountId = updates.vendor_account_id ?? exp.vendor_account_id;
            const newExchangeRate = updates.exchange_rate ?? exp.exchange_rate;
            const totalInLocal = totalAmount * newExchangeRate;

            if (exp.journal_entry_id) {
                // 1. إلغاء ترحيل القيد الحالي
                await journalEntriesService.unpost(exp.journal_entry_id);

                // 2. تعديل القيد مباشرة بالقيم الجديدة
                //    مدين: حساب الكونتينر (بضاعة بالطريق — رسملة)
                //    دائن: حساب المورد (التزام)
                await journalEntriesService.update(exp.journal_entry_id, {
                    company_id: companyId,
                    entry_date: new Date().toISOString().split('T')[0],
                    description: isRTL
                        ? `رسملة مصاريف كونتينر ${data?.container_number || ''}: ${newDescription}`
                        : `Capitalize container ${data?.container_number || ''}: ${newDescription}`,
                    lines: [
                        {
                            account_id: containerAccountId,
                            debit: totalInLocal,
                            credit: 0,
                            description: isRTL
                                ? `بضاعة بالطريق — ${data?.container_number || ''}`
                                : `Goods in Transit — ${data?.container_number || ''}`,
                        },
                        {
                            account_id: newVendorAccountId!,
                            debit: 0,
                            credit: totalInLocal,
                            description: `${newDescription} — ${isRTL ? 'التزام' : 'Obligation'}`,
                        },
                    ],
                });

                // 3. إعادة الترحيل
                await journalEntriesService.post(exp.journal_entry_id, user.id);
            }

            // 4. تحديث المصروف في DB
            await supabase
                .from('container_expenses')
                .update({
                    amount: totalAmount,
                    actual_amount: totalAmount,
                    amount_before_tax: newAmountBeforeTax,
                    tax_rate: newTaxRate,
                    tax_amount: newTaxAmount,
                    description: newDescription,
                    expense_account_id: newExpenseAccountId,
                    vendor_account_id: newVendorAccountId,
                    exchange_rate: newExchangeRate,
                    journal_description: newDescription,
                    is_posted: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', expenseId);

            await fetchActualExpenses();
            toast.success(isRTL ? '✅ تم التعديل وإعادة الترحيل' : '✅ Updated & reposted');
        } catch (err: any) {
            console.error('Error updating actual expense:', err);
            toast.error(err.message || (isRTL ? 'خطأ في التعديل' : 'Error updating'));
        } finally {
            setActualSaving(false);
        }
    };

    // ── حذف مصروف فعلي (إلغاء ترحيل + حذف مباشر) ──
    // ※ لا ننشئ قيود عكسية — نحذف القيد من أصله
    const handleDeleteActualExpense = async (expenseId: string) => {
        if (!companyId || !user?.id) return;

        const exp = actualExpenses.find(e => e.id === expenseId);
        if (!exp) return;

        const confirmMsg = isRTL
            ? `هل أنت متأكد من حذف "${exp.description}"?\nسيتم حذف القيد المحاسبي المرتبط نهائياً.`
            : `Delete "${exp.description}"?\nThe linked journal entry will be permanently deleted.`;
        if (!window.confirm(confirmMsg)) return;

        setActualSaving(true);
        try {
            // 1. إلغاء ترحيل وحذف القيد المحاسبي (إن وجد)
            if (exp.journal_entry_id) {
                try {
                    await journalEntriesService.unpost(exp.journal_entry_id);
                    await journalEntriesService.delete(exp.journal_entry_id);
                } catch (jeErr: any) {
                    console.warn('Could not delete journal entry:', jeErr.message);
                    // المتابعة بحذف المصروف حتى لو فشل حذف القيد
                }
            }

            // 2. حذف المصروف مباشرة
            await supabase
                .from('container_expenses')
                .delete()
                .eq('id', expenseId);

            await fetchActualExpenses();
            toast.success(isRTL ? '✅ تم الحذف' : '✅ Deleted');
        } catch (err: any) {
            console.error('Error deleting actual expense:', err);
            toast.error(err.message || (isRTL ? 'خطأ في الحذف' : 'Error deleting'));
        } finally {
            setActualSaving(false);
        }
    };

    // ─── Fetch from DB ───
    const fetchExpenses = useCallback(async () => {
        if (!containerId) {
            // For new containers, use local data
            setExpenses((data.expenses || []).map((e: any) => ({
                ...e,
                expected_amount: e.expected_amount || e.amount || 0,
                actual_amount: e.actual_amount || null,
                currency_code: e.currency_code || containerCurrency,
                exchange_rate: e.exchange_rate || e.expected_exchange_rate || 1,
                account_id: e.account_id || null,
                account_name: e.account_name || '',
                payment_status: e.payment_status || 'pending',
                paid_amount: e.paid_amount || 0,
                description: e.description || '',
                vendor_name: e.vendor_name || '',
                invoice_number: e.invoice_number || '',
                invoice_date: e.invoice_date || '',
                notes: e.notes || '',
            })));
            return;
        }

        setLoading(true);
        try {
            const { data: rows, error } = await supabase
                .from('container_expenses')
                .select('*')
                .eq('container_id', containerId)
                .is('vendor_account_id', null)  // فقط المصاريف التقريبية (بدون حساب مورد = لم تُرحَّل)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setExpenses((rows || []).map((r: any) => ({
                id: r.id,
                expense_type: r.expense_type || 'other',
                description: r.description || '',
                vendor_name: r.vendor_name || '',
                expected_amount: r.expected_amount || r.amount || 0,
                actual_amount: r.actual_amount,
                currency_code: r.currency_code || r.expected_currency || containerCurrency,
                exchange_rate: r.expected_exchange_rate || r.exchange_rate || 1,
                account_id: r.account_id || null,
                account_name: r.account_name || '',
                invoice_number: r.invoice_number || '',
                invoice_date: r.invoice_date || '',
                payment_status: r.payment_status || 'pending',
                paid_amount: r.paid_amount || 0,
                notes: r.notes || '',
                journal_entry_id: r.journal_entry_id || null,
            })));
        } catch (err) {
            console.error('Error fetching expenses:', err);
            toast.error(isRTL ? 'خطأ في تحميل المصاريف' : 'Error loading expenses');
        } finally {
            setLoading(false);
        }
    }, [containerId, companyCurrency, isRTL, data.expenses]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // ─── Fetch expense accounts from chart of accounts ───
    useEffect(() => {
        if (!companyId) return;
        (async () => {
            try {
                const all = await accountsService.getAll(companyId);
                // Filter to non-group expense-type accounts (EXPENSE, COGS, etc.)
                const expenseTypes = ['EXPENSE', 'COGS', 'OTHER_EXPENSE'];
                const filtered = all.filter(a =>
                    !a.is_group &&
                    a.is_active &&
                    expenseTypes.includes(a.account_type_code || '')
                );
                setExpenseAccounts(filtered);
            } catch (err) {
                console.error('Error fetching accounts:', err);
            }
        })();
    }, [companyId]);

    // ─── Handlers ───
    const handleAddExpense = async () => {
        if (isNewContainer) {
            toast.error(isRTL ? 'احفظ الكونتينر أولاً قبل إضافة مصاريف' : 'Save the container first before adding expenses');
            return;
        }

        // إدراج مباشرة بالـ DB
        try {
            const newData = {
                container_id: containerId,
                tenant_id: tenantId,
                company_id: companyId,
                expense_type: 'other',
                description: '',
                vendor_name: '',
                expected_amount: 0,
                actual_amount: null,
                amount: 0,
                currency_code: containerCurrency,
                expected_currency: containerCurrency,
                expected_exchange_rate: 1,
                exchange_rate: 1,
                invoice_number: '',
                invoice_date: null,
                payment_status: 'pending',
                paid_amount: 0,
                notes: '',
            };

            const { data: inserted, error } = await supabase
                .from('container_expenses')
                .insert(newData)
                .select('*')
                .single();

            if (error) throw error;

            // إضافة السطر الجديد من الـ DB مباشرة
            const newRow: ExpenseRow = {
                id: inserted.id,
                expense_type: inserted.expense_type || 'other',
                description: inserted.description || '',
                vendor_name: inserted.vendor_name || '',
                expected_amount: inserted.expected_amount || 0,
                actual_amount: inserted.actual_amount || null,
                currency_code: inserted.currency_code || containerCurrency,
                exchange_rate: inserted.expected_exchange_rate || 1,
                account_id: inserted.account_id || null,
                account_name: inserted.account_name || '',
                invoice_number: inserted.invoice_number || '',
                invoice_date: inserted.invoice_date || '',
                payment_status: inserted.payment_status || 'pending',
                paid_amount: inserted.paid_amount || 0,
                notes: inserted.notes || '',
                _isNew: false,
                _isDirty: false,
                _isEditing: true, // يفتح بوضع التعديل
            };
            setExpenses(prev => [...prev, newRow]);
        } catch (err) {
            console.error('Error adding expense:', err);
            toast.error(isRTL ? 'خطأ في إضافة المصروف' : 'Error adding expense');
        }
    };

    const handleUpdateExpense = (id: string, field: keyof ExpenseRow, value: any) => {
        setExpenses(prev => prev.map(exp =>
            exp.id === id
                ? { ...exp, [field]: value, _isDirty: true }
                : exp
        ));
        setHasUnsaved(true);
    };

    const handleRemoveExpense = async (id: string) => {
        const exp = expenses.find(e => e.id === id);
        if (!exp) return;

        // If it's a saved record, use safe delete (validates journal entry & payment status)
        if (!exp._isNew && containerId) {
            try {
                await deleteContainerExpense(id);
                toast.success(isRTL ? 'تم حذف المصروف' : 'Expense deleted');
            } catch (err: any) {
                console.error('Error deleting expense:', err);
                toast.error(err.message || (isRTL ? 'خطأ في حذف المصروف' : 'Error deleting expense'));
                return;
            }
        }

        setExpenses(prev => prev.filter(exp => exp.id !== id));
        setHasUnsaved(true);
    };

    // حفظ سطر مفرد بالـ DB
    const handleSaveExpenseRow = async (expId: string) => {
        const exp = expenses.find(e => e.id === expId);
        if (!exp || !containerId) return;

        try {
            const expenseData = {
                expense_type: exp.expense_type,
                description: exp.description,
                vendor_name: exp.vendor_name,
                expected_amount: exp.expected_amount,
                actual_amount: exp.actual_amount,
                amount: exp.actual_amount || exp.expected_amount,
                currency_code: exp.currency_code,
                expected_currency: exp.currency_code,
                expected_exchange_rate: exp.exchange_rate,
                exchange_rate: exp.exchange_rate,
                invoice_number: exp.invoice_number,
                invoice_date: exp.invoice_date || null,
                payment_status: exp.payment_status,
                paid_amount: exp.paid_amount,
                notes: exp.notes,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('container_expenses')
                .update(expenseData)
                .eq('id', exp.id);
            if (error) throw error;

            // مسح علامة التعديل وإغلاق وضع التعديل
            setExpenses(prev => prev.map(e =>
                e.id === expId ? { ...e, _isDirty: false, _isNew: false, _isEditing: false } : e
            ));
            toast.success(isRTL ? '✅ تم حفظ المصروف' : '✅ Expense saved');
        } catch (err) {
            console.error('Error saving expense row:', err);
            toast.error(isRTL ? 'خطأ في حفظ المصروف' : 'Error saving expense');
        }
    };

    // حفظ كل السطور المعدلة دفعة واحدة
    const handleSaveExpenses = async () => {
        if (!containerId) {
            toast.error(isRTL ? 'احفظ الكونتينر أولاً' : 'Save the container first');
            return;
        }

        const dirtyExpenses = expenses.filter(e => e._isDirty);
        if (dirtyExpenses.length === 0) {
            toast.info(isRTL ? 'لا توجد تعديلات للحفظ' : 'No changes to save');
            return;
        }

        setSaving(true);
        try {
            for (const exp of dirtyExpenses) {
                await handleSaveExpenseRow(exp.id);
            }

            toast.success(isRTL ? `تم حفظ ${dirtyExpenses.length} مصاريف` : `Saved ${dirtyExpenses.length} expenses`);
            setHasUnsaved(false);
        } catch (err) {
            console.error('Error saving expenses:', err);
            toast.error(isRTL ? 'خطأ في حفظ المصاريف' : 'Error saving expenses');
        } finally {
            setSaving(false);
        }
    };

    // ─── Landed Cost Actions ───
    const handleCalculateLandedCost = async () => {
        if (!containerId) return;
        setCalculating(true);
        try {
            // توزيع المصاريف الأولية → provisional_unit_cost
            const result = await saveEstimatedDistribution(containerId);

            // توزيع المصاريف الفعلية → final_unit_cost
            await saveActualDistribution(containerId);

            setAllocationResult(result);
            setShowAllocation(true);

            const estTotal = result.totalEstimatedExpenses || 0;
            const actTotal = result.totalActualExpenses || 0;
            toast.success(isRTL
                ? `✅ تم التوزيع — أولي: ${estTotal.toLocaleString()} | فعلي: ${actTotal.toLocaleString()}`
                : `✅ Distributed — Estimated: ${estTotal.toLocaleString()} | Actual: ${actTotal.toLocaleString()}`
            );
            // تحديث بنود البضائع فوراً
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
        } catch (err: any) {
            console.error('Error distributing expenses:', err);
            toast.error(isRTL ? 'خطأ في توزيع التكاليف: ' + err.message : 'Distribution error: ' + err.message);
        } finally {
            setCalculating(false);
        }
    };

    const handleFinalizeLandedCost = async () => {
        if (!containerId || !user?.id) return;
        const confirmMsg = isRTL
            ? 'هل أنت متأكد من تثبيت التكاليف؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to finalize costs? This action cannot be undone.';
        if (!window.confirm(confirmMsg)) return;

        setFinalizing(true);
        try {
            const result = await finalizeLandedCost(containerId, user.id);
            setAllocationResult(result);
            setShowAllocation(true);
            toast.success(isRTL ? 'تم تثبيت التكاليف بنجاح ✅' : 'Costs finalized successfully ✅');
            // تحديث بنود البضائع فوراً
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
            // Notify parent to refresh container data
            onChange({ is_cost_finalized: true, _refresh: true });
        } catch (err: any) {
            console.error('Error finalizing landed cost:', err);
            toast.error(isRTL ? 'خطأ في التثبيت: ' + err.message : 'Finalize error: ' + err.message);
        } finally {
            setFinalizing(false);
        }
    };

    // ─── Create Journal Entry for Expense ───
    const handleCreateJournalEntry = async (expenseId: string) => {
        if (!user?.id) return;

        const exp = expenses.find(e => e.id === expenseId);
        if (!exp) return;

        const amount = exp.actual_amount || exp.expected_amount;
        if (!amount || amount <= 0) {
            toast.error(isRTL ? 'لا يمكن إنشاء قيد لمبلغ صفر' : 'Cannot create entry for zero amount');
            return;
        }

        if (exp.journal_entry_id) {
            toast.info(isRTL ? 'هذا المصروف مرتبط بقيد بالفعل' : 'This expense already has a journal entry');
            return;
        }

        try {
            // TODO: In production, these should come from a proper account selector dialog
            // For now, use placeholder logic — will be refined in UI iteration
            const debitAccountId = '__EXPENSE_ACCOUNT__';
            const creditAccountId = '__VENDOR_ACCOUNT__';

            toast.info(isRTL
                ? 'إنشاء القيد المحاسبي قيد التطوير — سيتم ربطه بنافذة اختيار الحسابات'
                : 'Journal entry creation is being developed — will be connected to account selector'
            );

            // When account selector is ready, uncomment:
            // const je = await createExpenseJournalEntry(expenseId, debitAccountId, creditAccountId, user.id);
            // toast.success(isRTL ? `تم إنشاء القيد ${je.entry_number}` : `Journal entry ${je.entry_number} created`);
            // await fetchExpenses();
        } catch (err: any) {
            console.error('Error creating journal entry:', err);
            toast.error(err.message || (isRTL ? 'خطأ في إنشاء القيد' : 'Error creating journal entry'));
        }
    };

    // ════════════════════════════════════════════
    // ─── Section 3: الضريبة الجمركية (Customs Tax) ───
    // ════════════════════════════════════════════

    interface TaxItemRow {
        id: string;
        material_id: string | null;
        material_code: string;
        item_description: string;
        color_name: string;
        expected_quantity: number;
        unit_cost: number;
        total_cost: number;
        customs_duty_rate: number;
        customs_duty_amount: number;
        customs_duty_per_unit: number;
    }

    const [taxItems, setTaxItems] = useState<TaxItemRow[]>([]);
    const [taxLoading, setTaxLoading] = useState(false);
    const [taxSaving, setTaxSaving] = useState(false);
    const [taxPosting, setTaxPosting] = useState(false);
    const [uniformTaxRate, setUniformTaxRate] = useState<number>(data?.customs_tax_rate || 0);
    const [useUniformRate, setUseUniformRate] = useState(true);
    const [taxAccountId, setTaxAccountId] = useState<string>('');
    const [taxAccountName, setTaxAccountName] = useState<string>('');
    const [taxAccountCode, setTaxAccountCode] = useState<string>('');
    const [taxPaymentAccountId, setTaxPaymentAccountId] = useState<string>('');
    const [taxPaymentAccountName, setTaxPaymentAccountName] = useState<string>('');
    const [taxJournalEntryNumber, setTaxJournalEntryNumber] = useState<string>('');
    const [taxEditMode, setTaxEditMode] = useState(false);
    const isTaxPosted = data?.customs_tax_posted === true;
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

    // ── جلب حسابات الدفع المتاحة (بنوك + ذمم دائنة) ──
    useEffect(() => {
        const fetchPaymentAccounts = async () => {
            if (!companyId) return;
            try {
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en')
                    .eq('company_id', companyId)
                    .eq('is_detail', true)
                    .or('account_code.like.112%,account_code.like.111%,account_code.like.211%')
                    .order('account_code');
                setPaymentAccounts(accounts || []);
            } catch { /* ignore */ }
        };
        fetchPaymentAccounts();
    }, [companyId]);

    // ── جلب حساب الضريبة من الإعدادات العامة تلقائياً + حساب الدفع من الكونتينر ──
    useEffect(() => {
        const fetchTaxAccount = async () => {
            if (!companyId) return;
            try {
                const { data: settings } = await supabase
                    .from('company_accounting_settings')
                    .select('default_tax_input_account_id')
                    .eq('company_id', companyId)
                    .single();
                if (settings?.default_tax_input_account_id) {
                    setTaxAccountId(settings.default_tax_input_account_id);
                    // جلب اسم ورقم الحساب للعرض
                    const { data: acc } = await supabase
                        .from('chart_of_accounts')
                        .select('account_code, name_ar, name_en')
                        .eq('id', settings.default_tax_input_account_id)
                        .single();
                    if (acc) {
                        setTaxAccountCode(acc.account_code || '');
                        setTaxAccountName(language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar));
                    }
                    // جلب رقم القيد إن كان مُرحّلاً سابقاً
                    if (data?.customs_tax_journal_id) {
                        const { data: je } = await supabase
                            .from('journal_entries')
                            .select('entry_number')
                            .eq('id', data.customs_tax_journal_id)
                            .single();
                        if (je) setTaxJournalEntryNumber(je.entry_number);
                    }
                }

                // جلب حساب الدفع من الكونتينر
                if (containerId && data?.customs_tax_payment_account_id) {
                    setTaxPaymentAccountId(data.customs_tax_payment_account_id);
                    const { data: payAcc } = await supabase
                        .from('chart_of_accounts')
                        .select('account_code, name_ar, name_en')
                        .eq('id', data.customs_tax_payment_account_id)
                        .single();
                    if (payAcc) {
                        setTaxPaymentAccountName(
                            `${payAcc.account_code} — ${language === 'ar' ? payAcc.name_ar : (payAcc.name_en || payAcc.name_ar)}`
                        );
                    }
                }
            } catch { /* ignore */ }
        };
        fetchTaxAccount();
    }, [companyId, language, containerId]);


    // ── جلب بنود الكونتينر لقسم الضريبة ──
    const fetchTaxItems = useCallback(async () => {
        if (!containerId) return;
        setTaxLoading(true);
        try {
            const { data: items, error } = await supabase
                .from('container_items')
                .select('id, material_id, material_code, item_description, color_name, expected_quantity, unit_cost, total_cost, customs_duty_rate, customs_duty_amount, customs_duty_per_unit')
                .eq('container_id', containerId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setTaxItems((items || []).map((item: any) => ({
                id: item.id,
                material_id: item.material_id || null,
                material_code: item.material_code || '',
                item_description: item.item_description || '',
                color_name: item.color_name || '',
                expected_quantity: item.expected_quantity || 0,
                unit_cost: item.unit_cost || 0,
                total_cost: item.total_cost || (item.unit_cost || 0) * (item.expected_quantity || 0),
                customs_duty_rate: item.customs_duty_rate || 0,
                customs_duty_amount: item.customs_duty_amount || 0,
                customs_duty_per_unit: item.customs_duty_per_unit || 0,
            })));

            // جلب النسبة العامة مباشرة من الكونتينر (DB — لتجنب closure قديمة)
            const { data: containerData } = await supabase
                .from('containers')
                .select('customs_tax_rate')
                .eq('id', containerId)
                .single();
            if (containerData?.customs_tax_rate) {
                setUniformTaxRate(containerData.customs_tax_rate);
            }
        } catch (err) {
            console.error('Error fetching tax items:', err);
        } finally {
            setTaxLoading(false);
        }
    }, [containerId]);

    useEffect(() => {
        if (containerId) fetchTaxItems();
    }, [fetchTaxItems, containerId]);

    // ── حساب إجماليات الضريبة ──
    const taxTotals = useMemo(() => {
        const totalValue = taxItems.reduce((sum, item) => sum + item.total_cost, 0);
        const totalTax = taxItems.reduce((sum, item) => sum + item.customs_duty_amount, 0);
        return { totalValue, totalTax, itemCount: taxItems.length };
    }, [taxItems]);

    // ── تطبيق نسبة موحدة على جميع البنود ──
    const applyUniformTaxRate = (rate: number) => {
        setUniformTaxRate(rate);
        setTaxItems(prev => prev.map(item => {
            const dutyAmount = item.total_cost * (rate / 100);
            const dutyPerUnit = item.expected_quantity > 0 ? dutyAmount / item.expected_quantity : 0;
            return {
                ...item,
                customs_duty_rate: rate,
                customs_duty_amount: dutyAmount,
                customs_duty_per_unit: dutyPerUnit,
            };
        }));
    };

    // ── تعديل نسبة بند منفرد ──
    const updateItemTaxRate = (itemId: string, rate: number) => {
        setTaxItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const dutyAmount = item.total_cost * (rate / 100);
            const dutyPerUnit = item.expected_quantity > 0 ? dutyAmount / item.expected_quantity : 0;
            return {
                ...item,
                customs_duty_rate: rate,
                customs_duty_amount: dutyAmount,
                customs_duty_per_unit: dutyPerUnit,
            };
        }));
    };

    // ── حفظ توزيع الضريبة في container_items ──
    const handleSaveTaxDistribution = async () => {
        if (!containerId) return;
        setTaxSaving(true);
        try {
            for (const item of taxItems) {
                await supabase
                    .from('container_items')
                    .update({
                        customs_duty_rate: item.customs_duty_rate,
                        customs_duty_amount: item.customs_duty_amount,
                        customs_duty_per_unit: item.customs_duty_per_unit,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);
            }

            // حفظ النسبة العامة في الكونتينر
            await supabase
                .from('containers')
                .update({
                    customs_tax_rate: uniformTaxRate,
                    customs_tax_total: taxTotals.totalTax,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', containerId);

            toast.success(isRTL ? 'تم حفظ توزيع الضريبة بنجاح' : 'Tax distribution saved successfully');
        } catch (err: any) {
            console.error('Error saving tax distribution:', err);
            toast.error(isRTL ? 'خطأ في حفظ توزيع الضريبة' : 'Error saving tax distribution');
        } finally {
            setTaxSaving(false);
        }
    };

    // ── ترحيل قيد الضريبة الجمركية ──
    // مدين: حساب ضريبة المدخلات (117) — taxAccountId
    // دائن: حساب الدفع (بنك / مخلّص) — taxPaymentAccountId
    // ⚠️ الضريبة المستردة لا تُحمّل على الكونتينر — هي أصل (حق استرداد)
    const handlePostCustomsTax = async () => {
        if (!containerId || !user?.id || !tenantId || !companyId) return;

        if (taxTotals.totalTax <= 0) {
            toast.error(isRTL ? 'مبلغ الضريبة صفر — لا يمكن إنشاء قيد' : 'Tax amount is zero — cannot create entry');
            return;
        }

        if (!taxAccountId) {
            toast.error(isRTL ? 'حساب ضريبة المدخلات غير محدد في الإعدادات' : 'Tax input account not configured in settings');
            return;
        }

        if (!taxPaymentAccountId) {
            toast.error(isRTL ? 'اختر حساب الدفع (بنك أو مخلّص جمركي)' : 'Select payment account (bank or customs agent)');
            return;
        }

        // جلب رقم الكونتينر
        const { data: containerDoc } = await supabase
            .from('containers')
            .select('container_number')
            .eq('id', containerId)
            .single();

        setTaxPosting(true);
        try {
            // حفظ التوزيع أولاً
            await handleSaveTaxDistribution();

            // تحديث tax_rate في fabric_materials + inventory_stock لكل مادة
            for (const item of taxItems) {
                if (item.material_id && item.customs_duty_rate > 0) {
                    // 1. تحديث بطاقة المادة
                    await supabase
                        .from('fabric_materials')
                        .update({ tax_rate: item.customs_duty_rate })
                        .eq('id', item.material_id);

                    // 2. تحديث جميع دفعات المادة في المخزون
                    await supabase
                        .from('inventory_stock')
                        .update({ tax_rate: item.customs_duty_rate })
                        .eq('material_id', item.material_id)
                        .eq('company_id', companyId);
                }
            }

            // توليد رقم القيد (timestamp-based — مطابق للنمط الموجود)
            const ts = Date.now();
            const rand = Math.floor(1000 + Math.random() * 9000);
            const entryNumber = `JE-${ts}-${rand}`;

            const containerNum = containerDoc?.container_number || '';
            const today = new Date().toISOString().slice(0, 10);
            const totalTax = taxTotals.totalTax;

            // إنشاء القيد
            const { data: je, error: jeErr } = await supabase
                .from('journal_entries')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    entry_number: entryNumber,
                    entry_date: today,
                    description: isRTL
                        ? `ضريبة جمركية — كونتينر ${containerNum}`
                        : `Customs Tax — Container ${containerNum}`,
                    reference_type: 'container_tax',
                    reference_id: containerId,
                    status: 'posted',
                    total_debit: totalTax,
                    total_credit: totalTax,
                    created_by: user.id,
                })
                .select()
                .single();
            if (jeErr) throw jeErr;

            // إنشاء سطور القيد: Dr ضريبة مدخلات (117) / Cr حساب الدفع
            const { error: lnErr } = await supabase
                .from('journal_entry_lines')
                .insert([
                    {
                        tenant_id: tenantId,
                        entry_id: je.id,
                        account_id: taxAccountId,
                        debit: totalTax,
                        credit: 0,
                        description: isRTL
                            ? `ضريبة جمركية مستردة — كونتينر ${containerNum}`
                            : `Recoverable Customs VAT — Container ${containerNum}`,
                        line_number: 1,
                    },
                    {
                        tenant_id: tenantId,
                        entry_id: je.id,
                        account_id: taxPaymentAccountId,
                        debit: 0,
                        credit: totalTax,
                        description: isRTL
                            ? `دفع ضريبة جمركية — كونتينر ${containerNum}`
                            : `Customs VAT Payment — Container ${containerNum}`,
                        line_number: 2,
                    },
                ]);
            if (lnErr) throw lnErr;

            // تحديث الكونتينر
            await supabase
                .from('containers')
                .update({
                    customs_tax_posted: true,
                    customs_tax_journal_id: je.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', containerId);

            // ── تسجيل النشاط ──
            await supabase.from('document_activity').insert({
                tenant_id: tenantId,
                entity_type: 'container',
                entity_id: containerId,
                activity_type: 'milestone',
                content: isRTL
                    ? `تم ترحيل قيد الضريبة الجمركية — ${entryNumber} — المبلغ: ${totalTax}`
                    : `Customs tax entry posted — ${entryNumber} — Amount: ${totalTax}`,
                event_code: 'tax_posted',
                metadata: { entry_number: entryNumber, journal_id: je.id, total_tax: totalTax, tax_rate: uniformTaxRate },
                created_by: user.id,
            });

            onChange({ customs_tax_posted: true, customs_tax_journal_id: je.id, _refresh: true });
            setTaxJournalEntryNumber(entryNumber);
            toast.success(isRTL
                ? `✅ تم ترحيل قيد الضريبة الجمركية — ${entryNumber}`
                : `✅ Customs tax entry posted — ${entryNumber}`
            );
        } catch (err: any) {
            console.error('Error posting customs tax:', err);
            toast.error(err.message || (isRTL ? 'خطأ في ترحيل قيد الضريبة' : 'Error posting customs tax entry'));
        } finally {
            setTaxPosting(false);
        }
    };

    // ── تعديل قيد الضريبة — فتح وضع التعديل فقط ──
    const handleEditCustomsTax = () => {
        setTaxEditMode(true);
        toast.info(isRTL
            ? '📝 وضع التعديل — عدّل النسبة ثم اضغط حفظ'
            : '📝 Edit mode — modify rates then click Save'
        );
    };

    // ── حفظ التعديلات مباشرة على القيد الموجود (بدون حذف أو قيود عكسية) ──
    const handleSaveEditedTax = async () => {
        if (!containerId || !data?.customs_tax_journal_id || !companyId) return;

        setTaxPosting(true);
        try {
            const journalId = data.customs_tax_journal_id;
            const totalTax = taxTotals.totalTax;

            // 1. حفظ التوزيع الجديد في container_items
            await handleSaveTaxDistribution();

            // 2. تحديث بطاقة المادة + المخزون
            for (const item of taxItems) {
                if (item.material_id && item.customs_duty_rate > 0) {
                    await supabase
                        .from('fabric_materials')
                        .update({ tax_rate: item.customs_duty_rate })
                        .eq('id', item.material_id);

                    await supabase
                        .from('inventory_stock')
                        .update({ tax_rate: item.customs_duty_rate })
                        .eq('material_id', item.material_id)
                        .eq('company_id', companyId);
                }
            }

            // 3. تحديث القيد المحاسبي مباشرة (UPDATE — بدون حذف)
            await supabase
                .from('journal_entries')
                .update({
                    total_debit: totalTax,
                    total_credit: totalTax,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', journalId);

            // 4. جلب حساب الكونتينر
            const { data: containerDoc } = await supabase
                .from('containers')
                .select('container_account_id, container_number')
                .eq('id', containerId)
                .single();

            const containerNum = containerDoc?.container_number || '';

            // 5. تحديث سطور القيد (حذف + إعادة إدراج — لتجنب chk_balanced_entry مع التريقر)
            await supabase
                .from('journal_entry_lines')
                .delete()
                .eq('entry_id', journalId);

            await supabase
                .from('journal_entry_lines')
                .insert([
                    {
                        tenant_id: tenantId,
                        entry_id: journalId,
                        account_id: taxAccountId,
                        debit: totalTax,
                        credit: 0,
                        description: isRTL
                            ? `ضريبة جمركية مستردة — كونتينر ${containerNum}`
                            : `Recoverable Customs VAT — Container ${containerNum}`,
                        line_number: 1,
                    },
                    {
                        tenant_id: tenantId,
                        entry_id: journalId,
                        account_id: taxPaymentAccountId,
                        debit: 0,
                        credit: totalTax,
                        description: isRTL
                            ? `دفع ضريبة جمركية — كونتينر ${containerNum}`
                            : `Customs VAT Payment — Container ${containerNum}`,
                        line_number: 2,
                    },
                ]);

            // 6. تحديث الكونتينر
            await supabase
                .from('containers')
                .update({
                    customs_tax_rate: uniformTaxRate,
                    customs_tax_total: totalTax,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', containerId);

            // ── تسجيل النشاط — سجل التعديل ──
            await supabase.from('document_activity').insert({
                tenant_id: tenantId,
                entity_type: 'container',
                entity_id: containerId,
                activity_type: 'event',
                content: isRTL
                    ? `تم تعديل قيد الضريبة الجمركية — المبلغ الجديد: ${totalTax} — النسبة: ${uniformTaxRate}%`
                    : `Customs tax entry edited — New amount: ${totalTax} — Rate: ${uniformTaxRate}%`,
                event_code: 'tax_edited',
                metadata: { journal_id: journalId, new_total_tax: totalTax, new_tax_rate: uniformTaxRate },
                created_by: user?.id,
            });

            setTaxEditMode(false);
            // تحديث البيانات محلياً فوراً — لتجنب عرض النسبة القديمة
            setUniformTaxRate(uniformTaxRate);
            onChange({ customs_tax_rate: uniformTaxRate, customs_tax_total: totalTax, _refresh: true });
            toast.success(isRTL
                ? '✅ تم تحديث قيد الضريبة الجمركية بنجاح'
                : '✅ Customs tax entry updated successfully'
            );
        } catch (err: any) {
            console.error('Error updating customs tax:', err);
            toast.error(err.message || (isRTL ? 'خطأ في تحديث قيد الضريبة' : 'Error updating customs tax entry'));
        } finally {
            setTaxPosting(false);
        }
    };

    // ─── Calculations ───
    const totals = useMemo(() => {
        // ─── المصاريف الأولية (من expenses) ───
        const totalExpected = expenses.reduce((sum, e) => {
            if (e.currency_code === containerCurrency) return sum + (e.expected_amount || 0);
            return sum + ((e.expected_amount || 0) * (e.exchange_rate || 1));
        }, 0);

        // ─── المصاريف الفعلية (من actualExpenses — المستقلة) ───
        const totalActual = actualExpenses.reduce((sum, e) => {
            const amt = e.amount_before_tax || e.amount || 0;
            if (e.currency_code === containerCurrency) return sum + amt;
            return sum + (amt * (e.exchange_rate || 1));
        }, 0);
        const totalActualWithTax = actualExpenses.reduce((sum, e) => {
            const amt = e.amount || 0;
            if (e.currency_code === containerCurrency) return sum + amt;
            return sum + (amt * (e.exchange_rate || 1));
        }, 0);

        const totalPaid = expenses.reduce((sum, e) => sum + (e.paid_amount || 0), 0);
        const variance = totalActual > 0 ? totalActual - totalExpected : 0;
        const goodsValue = data?.provisional_goods_cost || data?.total_value || 0;
        // التكلفة النهائية = قيمة البضاعة + (الفعلية إن وُجدت، وإلا الأولية)
        const landedCost = goodsValue + (totalActual > 0 ? totalActual : totalExpected);

        return { totalExpected, totalActual, totalActualWithTax, totalPaid, variance, goodsValue, landedCost };
    }, [expenses, actualExpenses, data, containerCurrency]);


    const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ─── Expense type label ───
    const getTypeLabel = (type: string) => {
        const def = EXPENSE_TYPES.find(t => t.value === type);
        if (!def) return type;
        return `${def.icon} ${isRTL ? def.labelAr : def.labelEn}`;
    };

    // ─── Can see amounts? (RBAC) ───
    const canSeeAmounts = colPerms.expenses;

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ms-2 text-sm text-gray-500">
                    {isRTL ? 'تحميل المصاريف...' : 'Loading expenses...'}
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-1">

            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {isRTL ? 'مصاريف الكونتينر' : 'Container Expenses'}
                    <Badge variant="secondary" className="ms-1 text-xs">
                        {expenses.length}
                    </Badge>
                </h3>
                <div className="flex items-center gap-2">
                    {!isNewContainer && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchExpenses}
                            className="gap-1 text-xs"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    {isEditable && hasUnsaved && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveExpenses}
                            disabled={saving}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {isRTL ? 'حفظ المصاريف' : 'Save Expenses'}
                        </Button>
                    )}
                    {isEditable && (
                        <Button variant="outline" size="sm" onClick={handleAddExpense} className="gap-1">
                            <Plus className="w-4 h-4" />
                            {isRTL ? 'إضافة مصروف' : 'Add Expense'}
                        </Button>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════ */}
            {/* ─── Section 1: المصاريف الأولية (Preliminary) ─── */}
            {/* ─── مستقل تماماً — لا أثر محاسبي — حرية إضافة وحذف ─── */}
            {/* ════════════════════════════════════════════════════════ */}
            <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-lg border border-blue-200/60 cursor-pointer hover:bg-blue-100/60 transition-colors">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                                {isRTL ? 'المصاريف الأولية' : 'Preliminary Expenses'}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 bg-blue-100 text-blue-700">
                                {expenses.length}
                            </Badge>
                            {canSeeAmounts && (
                                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 ms-2">
                                    {totals.totalExpected.toLocaleString()} {containerCurrency}
                                </span>
                            )}
                            <Badge variant="outline" className="text-[9px] px-1 text-gray-400 border-gray-300 ms-1">
                                {isRTL ? 'للتخطيط فقط' : 'Planning only'}
                            </Badge>
                        </div>
                        <ChevronDown className="w-4 h-4 text-blue-500 transition-transform duration-200" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="bg-white dark:bg-gray-900 rounded-b-lg border border-t-0">

                        {/* ─── Allocation Method Bar (global for all estimated expenses) ─── */}
                        {expenses.length > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border-b">
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                    {isRTL ? 'طريقة التوزيع:' : 'Allocation:'}
                                </span>
                                <Select value={estimatedAllocationMethod} onValueChange={setEstimatedAllocationMethod}>
                                    <SelectTrigger className="h-7 w-[160px] text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALLOCATION_METHODS.map(a => (
                                            <SelectItem key={a.value} value={a.value} className="text-xs">
                                                {a.icon} {isRTL ? a.labelAr : a.labelEn}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isEditable && !isNewContainer && !expenses.some(e => e._isEditing) && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="h-7 gap-1 text-xs bg-blue-600 hover:bg-blue-700"
                                        onClick={handleCalculateLandedCost}
                                        disabled={calculating || expenses.length === 0}
                                    >
                                        {calculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
                                        {isRTL ? 'توزيع على البضائع' : 'Distribute to Goods'}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* ─── Table ─── */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-50/40 dark:bg-blue-900/20">
                                        <TableHead className={cn("w-[160px]", isRTL && "text-right")}>
                                            {isRTL ? 'النوع' : 'Type'}
                                        </TableHead>
                                        {canSeeAmounts && (
                                            <TableHead className="w-[130px] text-center">
                                                {isRTL ? 'المبلغ' : 'Amount'}
                                            </TableHead>
                                        )}
                                        <TableHead className="w-[110px] text-center">
                                            {isRTL ? 'العملة' : 'Currency'}
                                        </TableHead>
                                        {canSeeAmounts && (
                                            <TableHead className="w-[90px] text-center">
                                                {isRTL ? 'سعر الصرف' : 'Rate'}
                                            </TableHead>
                                        )}
                                        <TableHead className={cn("min-w-[150px]", isRTL && "text-right")}>
                                            {isRTL ? 'البيان' : 'Description'}
                                        </TableHead>
                                        {isEditable && <TableHead className="w-[70px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Clock className="w-6 h-6 text-gray-300" />
                                                    <span className="text-sm">{isRTL ? 'لم تُضَف مصاريف أولية بعد' : 'No preliminary expenses yet'}</span>
                                                    {isEditable && (
                                                        <Button variant="outline" size="sm" onClick={handleAddExpense} className="mt-1 gap-1 text-xs">
                                                            <Plus className="w-3.5 h-3.5" />
                                                            {isRTL ? 'إضافة' : 'Add'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : expenses.map((exp) => {
                                        const isForeignCurrency = exp.currency_code !== containerCurrency;
                                        const rowEditing = exp._isEditing === true;

                                        return (
                                            <TableRow
                                                key={exp.id}
                                                className={cn(
                                                    "transition-colors",
                                                    rowEditing && "bg-amber-50/50 dark:bg-amber-950/15 border-l-2 border-l-amber-400",
                                                    !rowEditing && "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                                                )}
                                            >
                                                {/* 1. النوع (Type) */}
                                                <TableCell>
                                                    {rowEditing ? (
                                                        <Select value={exp.expense_type} onValueChange={(v) => handleUpdateExpense(exp.id, 'expense_type', v)}>
                                                            <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {EXPENSE_TYPES.map(t => (
                                                                    <SelectItem key={t.value} value={t.value} className="text-xs">
                                                                        {t.icon} {isRTL ? t.labelAr : t.labelEn}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-sm font-medium">{getTypeLabel(exp.expense_type)}</span>
                                                    )}
                                                </TableCell>

                                                {/* 2. المبلغ (Amount) */}
                                                {canSeeAmounts && (
                                                    <TableCell className="text-center">
                                                        {rowEditing ? (
                                                            <Input
                                                                type="number"
                                                                value={exp.expected_amount || ''}
                                                                onChange={(e) => handleUpdateExpense(exp.id, 'expected_amount', Number(e.target.value) || 0)}
                                                                className="h-8 w-[110px] font-mono text-xs text-center mx-auto"
                                                                min={0}
                                                            />
                                                        ) : (
                                                            <span className="font-mono text-sm">{exp.expected_amount?.toLocaleString() || '-'}</span>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* 4. العملة (Currency — dropdown) */}
                                                <TableCell className="text-center">
                                                    {rowEditing ? (
                                                        <Select value={exp.currency_code} onValueChange={(v) => handleUpdateExpense(exp.id, 'currency_code', v)}>
                                                            <SelectTrigger className="h-7 w-[90px] text-xs font-mono mx-auto">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableCurrencies.map(code => {
                                                                    const meta = CURRENCY_META[code];
                                                                    return (
                                                                        <SelectItem key={code} value={code} className="text-xs">
                                                                            {meta?.flag} {code} — {isRTL ? meta?.nameAr : meta?.nameEn}
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 font-mono">{exp.currency_code}</span>
                                                    )}
                                                </TableCell>

                                                {/* 5. سعر الصرف (Exchange Rate) */}
                                                {canSeeAmounts && (
                                                    <TableCell className="text-center">
                                                        {isForeignCurrency ? (
                                                            rowEditing ? (
                                                                <Input
                                                                    type="number"
                                                                    value={exp.exchange_rate}
                                                                    onChange={(e) => handleUpdateExpense(exp.id, 'exchange_rate', Number(e.target.value) || 1)}
                                                                    className="h-7 w-[75px] font-mono text-xs text-center mx-auto"
                                                                    min={0}
                                                                    step={0.01}
                                                                />
                                                            ) : (
                                                                <span className="font-mono text-xs text-gray-500">{exp.exchange_rate}</span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-gray-300">—</span>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {/* 6. البيان (Description) */}
                                                <TableCell>
                                                    {rowEditing ? (
                                                        <Input
                                                            value={exp.description}
                                                            onChange={(e) => handleUpdateExpense(exp.id, 'description', e.target.value)}
                                                            className="h-7 text-xs"
                                                            placeholder={isRTL ? 'البيان...' : 'Description...'}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-500">{exp.description || '-'}</span>
                                                    )}
                                                </TableCell>

                                                {/* 7. إجراءات (حفظ / تعديل / حذف) */}
                                                {isEditable && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-0.5">
                                                            {rowEditing ? (
                                                                <>
                                                                    {/* كبسة حفظ السطر */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={() => handleSaveExpenseRow(exp.id)}
                                                                        title={isRTL ? 'حفظ' : 'Save'}
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </Button>
                                                                    {/* حذف */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => handleRemoveExpense(exp.id)}
                                                                        title={isRTL ? 'حذف' : 'Delete'}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {/* كبسة تعديل */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                        onClick={() => setExpenses(prev => prev.map(e =>
                                                                            e.id === exp.id ? { ...e, _isEditing: true } : e
                                                                        ))}
                                                                        title={isRTL ? 'تعديل' : 'Edit'}
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                    {/* حذف */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => handleRemoveExpense(exp.id)}
                                                                        title={isRTL ? 'حذف' : 'Delete'}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                                {/* Footer */}
                                {expenses.length > 0 && canSeeAmounts && (
                                    <TableFooter>
                                        <TableRow className="bg-blue-50/60 dark:bg-blue-900/20 font-semibold">
                                            <TableCell className={cn(isRTL ? "text-right" : "text-left")}>
                                                <span className="text-sm text-blue-700 dark:text-blue-300">{isRTL ? 'إجمالي الأولي' : 'Total Preliminary'}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                                                    {totals.totalExpected.toLocaleString()} {containerCurrency}
                                                </span>
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            {isEditable && <TableCell></TableCell>}
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                        {/* Add button inside section */}
                        {isEditable && expenses.length > 0 && (
                            <div className="p-2 border-t">
                                <Button variant="ghost" size="sm" onClick={handleAddExpense} className="gap-1 text-xs text-blue-600 hover:text-blue-700 w-full justify-center">
                                    <Plus className="w-3.5 h-3.5" />
                                    {isRTL ? '+ إضافة مصروف أولي' : '+ Add Preliminary Expense'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* ════════════════════════════════════════════════════════ */}
            {/* ─── Section 2: المصاريف الفعلية (مستقلة تماماً) ─── */}
            {/* ═══ كل مصروف = حساب مصروف + حساب مورد + قيد فوري ═══ */}
            {/* ════════════════════════════════════════════════════════ */}
            <Collapsible defaultOpen={false}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 cursor-pointer hover:bg-emerald-100/60 transition-colors">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                                {isRTL ? 'المصاريف الفعلية' : 'Actual Expenses'}
                            </span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 bg-emerald-100 text-emerald-700">
                                {actualExpenses.length}
                            </Badge>
                            {canSeeAmounts && actualTotals.totalAmount > 0 && (
                                <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 ms-2">
                                    {actualTotals.totalAmount.toLocaleString()} {containerCurrency}
                                </span>
                            )}
                            {actualTotals.postedCount > 0 && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-[9px] px-1 gap-0.5 ms-1">
                                    <Check className="w-3 h-3" />
                                    {actualTotals.postedCount} {isRTL ? 'مرحّل' : 'posted'}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* ── زر إضافة مصروف ── */}
                            {!isNewContainer && (
                                <>
                                    {/* مفتوح: إضافة عادية */}
                                    {!isFinalized && !isClosed && isEditable && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                            onClick={(e) => { e.stopPropagation(); setShowAddActualForm(v => !v); }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {isRTL ? 'مصروف فعلي' : 'Add Actual'}
                                        </Button>
                                    )}
                                    {/* مثبّت ولم يُغلق: مقفول - لا إضافة */}
                                    {isFinalized && !isClosed && (
                                        <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            {isRTL ? 'مقفول' : 'Locked'}
                                        </span>
                                    )}
                                    {/* مغلق: إضافة مصروف لاحق (تسوية تلقائية) */}
                                    {isClosed && isEditable && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 gap-1 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                                            onClick={(e) => { e.stopPropagation(); setShowAddActualForm(v => !v); }}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {isRTL ? 'مصروف لاحق ↔ تسوية' : 'Post-Close Expense ↔ Settlement'}
                                        </Button>
                                    )}
                                </>
                            )}
                            <ChevronDown className="w-4 h-4 text-emerald-500 transition-transform duration-200" />
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="bg-white dark:bg-gray-900 rounded-b-lg border border-t-0">

                        {/* ══════ نموذج إضافة مصروف فعلي ══════ */}
                        {showAddActualForm && (
                            <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border-b space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Plus className="w-4 h-4 text-emerald-600" />
                                    <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">
                                        {isRTL ? 'إضافة مصروف فعلي جديد' : 'Add New Actual Expense'}
                                    </span>
                                </div>

                                {/* نوع المصروف (وسوم) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-gray-500">
                                        {isRTL ? 'نوع المصروف' : 'Expense Type'}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EXPENSE_TYPES.map(t => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setNewActual(p => ({ ...p, expense_type: t.value }))}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                                                    newActual.expense_type === t.value
                                                        ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                                                )}
                                            >
                                                {t.icon} {isRTL ? t.labelAr : t.labelEn}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* حساب المورد / مقدم الخدمة (دائن) */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-gray-500">
                                        {isRTL ? 'حساب المورد / مقدم الخدمة (دائن)' : 'Vendor / Service Provider (Credit)'}
                                        <span className="text-red-500 ms-0.5">*</span>
                                    </label>
                                    <SmartAccountSelector
                                        value={newActual.vendor_account_id}
                                        onChange={(id) => setNewActual(p => ({ ...p, vendor_account_id: id }))}
                                        companyId={companyId}
                                        filterByCodePrefix="2113"
                                        placeholder={isRTL ? 'اختر مقدم الخدمة...' : 'Select service provider...'}
                                        className="h-9 text-xs"
                                    />
                                    <p className="text-[9px] text-gray-400">
                                        {isRTL
                                            ? 'مقدمو خدمات الشحن والتوريد (2113x) — شحن بحري، جمركة، نقل، تأمين'
                                            : 'Logistics providers (2113x) — freight, customs, transport, insurance'}
                                    </p>
                                </div>

                                {/* الصف 2: المبلغ + العملة + سعر الصرف + الضريبة */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-gray-500">
                                            {isRTL ? 'المبلغ (بدون ضريبة)' : 'Amount (before tax)'}
                                            <span className="text-red-500 ms-0.5">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            value={newActual.amount || ''}
                                            onChange={(e) => setNewActual(p => ({ ...p, amount: Number(e.target.value) || 0 }))}
                                            className="h-9 font-mono text-xs"
                                            min={0}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-gray-500">
                                            {isRTL ? 'العملة' : 'Currency'}
                                        </label>
                                        <Select value={newActual.currency_code} onValueChange={(v) => setNewActual(p => ({ ...p, currency_code: v }))}>
                                            <SelectTrigger className="h-9 text-xs font-mono">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCurrencies.map(code => {
                                                    const meta = CURRENCY_META[code];
                                                    return (
                                                        <SelectItem key={code} value={code} className="text-xs">
                                                            {meta?.flag} {code}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-gray-500">
                                            {isRTL ? 'سعر الصرف' : 'Exchange Rate'}
                                        </label>
                                        <Input
                                            type="number"
                                            value={newActual.exchange_rate}
                                            onChange={(e) => setNewActual(p => ({ ...p, exchange_rate: Number(e.target.value) || 1 }))}
                                            className="h-9 font-mono text-xs"
                                            min={0}
                                            step={0.01}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-gray-500">
                                            {isRTL ? 'نسبة الضريبة %' : 'Tax Rate %'}
                                        </label>
                                        <Input
                                            type="number"
                                            value={newActual.tax_rate || ''}
                                            onChange={(e) => setNewActual(p => ({ ...p, tax_rate: Number(e.target.value) || 0 }))}
                                            className="h-9 font-mono text-xs"
                                            min={0}
                                            max={100}
                                            step={0.5}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* الصف 4: البيان */}
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-gray-500">
                                        {isRTL ? 'البيان (اختياري — يُبنى تلقائياً)' : 'Description (optional — auto-generated)'}
                                    </label>
                                    <Input
                                        value={newActual.description}
                                        onChange={(e) => setNewActual(p => ({ ...p, description: e.target.value }))}
                                        className="h-9 text-xs"
                                        placeholder={isRTL ? 'يُبنى تلقائياً من النوع واسم المورد...' : 'Auto-generated from type and vendor...'}
                                    />
                                </div>

                                {/* ملخص + زر الحفظ */}
                                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60">
                                    {newActual.amount > 0 && (
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-gray-500">
                                                {isRTL ? 'صافي:' : 'Net:'}{' '}
                                                <span className="font-mono font-semibold">{newActual.amount.toLocaleString()}</span>
                                            </span>
                                            {newActual.tax_rate > 0 && (
                                                <>
                                                    <span className="text-gray-500">
                                                        {isRTL ? 'ضريبة:' : 'Tax:'}{' '}
                                                        <span className="font-mono font-semibold text-amber-600">
                                                            +{(Math.round(newActual.amount * newActual.tax_rate) / 100).toLocaleString()}
                                                        </span>
                                                    </span>
                                                    <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                                        {isRTL ? 'الإجمالي:' : 'Total:'}{' '}
                                                        <span className="font-mono">
                                                            {(newActual.amount + Math.round(newActual.amount * newActual.tax_rate) / 100).toLocaleString()}
                                                        </span>
                                                        {' '}{newActual.currency_code}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 ms-auto">
                                        <Button variant="ghost" size="sm" onClick={() => setShowAddActualForm(false)} className="text-xs">
                                            {isRTL ? 'إغلاق' : 'Close'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={handleAddToPending}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {isRTL ? '➕ إضافة للدفعة' : '➕ Add to Batch'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══════ القائمة المعلّقة (مصاريف لم تُحفظ بعد) ══════ */}
                        {pendingExpenses.length > 0 && (
                            <div className="mx-4 my-3 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                                <div className="bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                            {isRTL ? '📋 الدفعة الحالية' : '📋 Current Batch'}
                                        </span>
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
                                            {pendingExpenses.length} {isRTL ? 'مصروف' : 'items'}
                                        </Badge>
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-amber-50/30 dark:bg-amber-900/10">
                                            <TableHead className={cn("text-xs", isRTL && "text-right")}>
                                                {isRTL ? 'الحساب / المورد' : 'Account / Vendor'}
                                            </TableHead>
                                            <TableHead className={cn("text-xs", isRTL && "text-right")}>
                                                {isRTL ? 'البيان' : 'Description'}
                                            </TableHead>
                                            {canSeeAmounts && (
                                                <>
                                                    <TableHead className="text-xs text-center w-[100px]">
                                                        {isRTL ? 'المبلغ' : 'Amount'}
                                                    </TableHead>
                                                    <TableHead className="text-xs text-center w-[70px]">
                                                        {isRTL ? 'ضريبة' : 'Tax'}
                                                    </TableHead>
                                                    <TableHead className="text-xs text-center w-[100px]">
                                                        {isRTL ? 'الإجمالي' : 'Total'}
                                                    </TableHead>
                                                </>
                                            )}
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingExpenses.map((pe) => (
                                            <TableRow key={pe._tempId} className="hover:bg-amber-50/30">
                                                <TableCell>
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{pe.account_name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-500">{pe.description}</span>
                                                </TableCell>
                                                {canSeeAmounts && (
                                                    <>
                                                        <TableCell className="text-center">
                                                            <span className="font-mono text-xs">{pe.amount_before_tax.toLocaleString()}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {pe.tax_amount > 0 ? (
                                                                <span className="font-mono text-[10px] text-amber-600">+{pe.tax_amount.toLocaleString()}</span>
                                                            ) : (
                                                                <span className="text-xs text-gray-300">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-mono text-xs font-semibold text-emerald-600">
                                                                {pe.total_amount.toLocaleString()} {pe.currency_code}
                                                            </span>
                                                        </TableCell>
                                                    </>
                                                )}
                                                <TableCell>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleRemoveFromPending(pe._tempId)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {/* شريط الإجمالي + زر الحفظ */}
                                <div className="bg-amber-50/60 dark:bg-amber-950/20 border-t border-amber-200/60 px-3 py-2 flex items-center justify-between">
                                    {canSeeAmounts && (
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className="text-gray-500">
                                                {isRTL ? 'صافي:' : 'Net:'}{' '}
                                                <span className="font-mono font-semibold">{pendingTotals.totalBeforeTax.toLocaleString()}</span>
                                            </span>
                                            {pendingTotals.totalTax > 0 && (
                                                <span className="text-amber-600">
                                                    {isRTL ? 'ضريبة:' : 'Tax:'}{' '}
                                                    <span className="font-mono font-semibold">+{pendingTotals.totalTax.toLocaleString()}</span>
                                                </span>
                                            )}
                                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                                {isRTL ? 'الإجمالي:' : 'Total:'}{' '}
                                                <span className="font-mono">{pendingTotals.totalAmount.toLocaleString()}</span>
                                                {' '}{containerCurrency}
                                            </span>
                                        </div>
                                    )}
                                    <Button
                                        size="sm"
                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={handleSaveAndPostBatch}
                                        disabled={actualSaving}
                                    >
                                        {actualSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        {isRTL ? '💾 حفظ وترحيل الدفعة' : '💾 Save & Post Batch'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ══════ جدول المصاريف الفعلية ══════ */}
                        <div className="overflow-x-auto">
                            {actualLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                    <span className="ms-2 text-sm text-gray-400">{isRTL ? 'تحميل...' : 'Loading...'}</span>
                                </div>
                            ) : actualExpenses.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                                    <BookOpen className="w-6 h-6 text-gray-300" />
                                    <span className="text-sm">{isRTL ? 'لم تُضَف مصاريف فعلية بعد' : 'No actual expenses yet'}</span>
                                    {isEditable && !isNewContainer && (
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => setShowAddActualForm(true)}
                                            className="mt-1 gap-1 text-xs text-emerald-600"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {isRTL ? 'إضافة مصروف فعلي' : 'Add Actual Expense'}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* ══════ بطاقات الدفعات — M3 ══════ */}
                                    {batchGroups.map(([batchKey, batch]) => {
                                        const isBatchOpen = expandedBatches.has(batchKey);
                                        const batchCurrencies = Array.from(batch.currencies);
                                        const batchCurrency = batchCurrencies.length === 1 ? batchCurrencies[0] : containerCurrency;
                                        return (
                                            <div key={batchKey} className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                {/* ── رأس الدفعة (قابل للنقر) ── */}
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                                                        isBatchOpen
                                                            ? "bg-emerald-100/80 dark:bg-emerald-900/40"
                                                            : "bg-gradient-to-r from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-gray-900 hover:from-emerald-100/80 hover:to-emerald-50/30"
                                                    )}
                                                    onClick={() => toggleBatch(batchKey)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <ChevronDown className={cn("w-4 h-4 text-emerald-600 transition-transform duration-200", isBatchOpen && "rotate-180")} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                                                    {batch.journalEntryId ? (
                                                                        <>{isRTL ? 'دفعة' : 'Batch'} — {batch.journalEntryId.slice(0, 12)}...</>
                                                                    ) : (
                                                                        <>{isRTL ? 'مصروف بدون قيد' : 'Expense (no entry)'}</>
                                                                    )}
                                                                </span>
                                                                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800/60 dark:text-emerald-200">
                                                                    {batch.expenses.length} {isRTL ? (batch.expenses.length === 1 ? 'مصروف' : 'مصاريف') : (batch.expenses.length === 1 ? 'expense' : 'expenses')}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                                                📅 {batch.date || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {canSeeAmounts && (
                                                            <div className="text-end">
                                                                <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                                    {batch.totalBeforeTax.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">{batchCurrency}</span>
                                                                </div>
                                                                {batch.totalTax > 0 && (
                                                                    <div className="text-[10px] font-mono text-amber-600">+ {isRTL ? 'ضريبة' : 'tax'} {batch.totalTax.toLocaleString()}</div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {batch.isAllPosted ? (
                                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 gap-0.5 text-[10px] px-1.5">
                                                                <Check className="w-3 h-3" />{isRTL ? 'مرحّل' : 'Posted'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600 border-amber-300">
                                                                <Clock className="w-3 h-3 me-0.5" />{isRTL ? 'معلّق' : 'Pending'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ── تفاصيل الدفعة (منطوية) ── */}
                                                {isBatchOpen && (
                                                    <div className="border-t border-emerald-200/60 dark:border-emerald-800/40">
                                                        {/* جدول المصاريف داخل الدفعة */}
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-gray-50/60 dark:bg-gray-800/30">
                                                                    <TableHead className="w-[30px]"></TableHead>
                                                                    <TableHead className={cn("w-[120px]", isRTL && "text-right")}>
                                                                        {isRTL ? 'النوع' : 'Type'}
                                                                    </TableHead>
                                                                    <TableHead className={cn("min-w-[150px]", isRTL && "text-right")}>
                                                                        {isRTL ? 'البيان' : 'Description'}
                                                                    </TableHead>
                                                                    {canSeeAmounts && (
                                                                        <>
                                                                            <TableHead className="w-[100px] text-center">
                                                                                {isRTL ? 'المبلغ' : 'Amount'}
                                                                            </TableHead>
                                                                            <TableHead className="w-[70px] text-center">
                                                                                {isRTL ? 'ضريبة' : 'Tax'}
                                                                            </TableHead>
                                                                        </>
                                                                    )}
                                                                    <TableHead className="w-[50px] text-center">
                                                                        {isRTL ? 'عملة' : 'Curr'}
                                                                    </TableHead>
                                                                    {isEditable && (
                                                                        <TableHead className="w-[70px]"></TableHead>
                                                                    )}
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {batch.expenses.map((exp) => {
                                                                    const isExpanded = expandedActualRows.has(exp.id);
                                                                    return (
                                                                        <React.Fragment key={exp.id}>
                                                                            <TableRow
                                                                                className={cn(
                                                                                    "cursor-pointer transition-colors hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10",
                                                                                    isExpanded && "bg-emerald-50/50 dark:bg-emerald-900/20 border-b-0"
                                                                                )}
                                                                                onClick={() => toggleActualRow(exp.id)}
                                                                            >
                                                                                <TableCell className="px-2">
                                                                                    <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", isExpanded && "rotate-180")} />
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <span className="text-xs font-medium">{getTypeLabel(exp.expense_type)}</span>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <div>
                                                                                        <span className="text-xs text-gray-700 dark:text-gray-300">{exp.description || '-'}</span>
                                                                                        {exp.vendor_name && <span className="block text-[10px] text-gray-400">{exp.vendor_name}</span>}
                                                                                    </div>
                                                                                </TableCell>
                                                                                {canSeeAmounts && (
                                                                                    <>
                                                                                        <TableCell className="text-center">
                                                                                            <span className="font-mono text-xs font-semibold text-emerald-600">
                                                                                                {exp.amount_before_tax?.toLocaleString() || '—'}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center">
                                                                                            {exp.tax_amount > 0 ? (
                                                                                                <span className="font-mono text-[10px] text-amber-600">+{exp.tax_amount.toLocaleString()}</span>
                                                                                            ) : (
                                                                                                <span className="text-[10px] text-gray-300">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                    </>
                                                                                )}
                                                                                <TableCell className="text-center">
                                                                                    <span className="text-[10px] text-gray-500 font-mono">{exp.currency_code}</span>
                                                                                </TableCell>
                                                                                {isEditable && (
                                                                                    <TableCell>
                                                                                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                                                            <Button
                                                                                                variant="ghost" size="icon"
                                                                                                className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                                                onClick={() => {
                                                                                                    setActualExpenses(prev => prev.map(e =>
                                                                                                        e.id === exp.id ? { ...e, _isEditing: !e._isEditing } : e
                                                                                                    ));
                                                                                                    if (!isExpanded) toggleActualRow(exp.id);
                                                                                                }}
                                                                                                title={isRTL ? 'تعديل' : 'Edit'}
                                                                                            >
                                                                                                <Pencil className="w-3 h-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost" size="icon"
                                                                                                className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                                                onClick={() => handleDeleteActualExpense(exp.id)}
                                                                                                title={isRTL ? 'حذف' : 'Delete'}
                                                                                                disabled={actualSaving}
                                                                                            >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                )}
                                                                            </TableRow>

                                                                            {/* ── تفاصيل المصروف الفردي ── */}
                                                                            {isExpanded && (
                                                                                <TableRow className="bg-gray-50/80 dark:bg-gray-800/40">
                                                                                    <TableCell colSpan={10} className="p-0">
                                                                                        <div className="p-3 space-y-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                                                            {/* تفاصيل الحسابات */}
                                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                                <div className="space-y-0.5">
                                                                                                    <span className="text-[10px] font-medium text-gray-500">{isRTL ? 'حساب المصروف (مدين)' : 'Expense Acct (Dr)'}</span>
                                                                                                    {exp._isEditing ? (
                                                                                                        <SmartAccountSelector
                                                                                                            value={exp.expense_account_id || undefined}
                                                                                                            onChange={(id) => setActualExpenses(prev => prev.map(e =>
                                                                                                                e.id === exp.id ? { ...e, expense_account_id: id } : e
                                                                                                            ))}
                                                                                                            companyId={companyId}
                                                                                                            className="h-7 text-xs"
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                                                            {exp._expenseAccountName || exp.expense_account_id?.slice(0, 8) || '—'}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="space-y-0.5">
                                                                                                    <span className="text-[10px] font-medium text-gray-500">{isRTL ? 'حساب المورد (دائن)' : 'Vendor Acct (Cr)'}</span>
                                                                                                    {exp._isEditing ? (
                                                                                                        <SmartAccountSelector
                                                                                                            value={exp.vendor_account_id || undefined}
                                                                                                            onChange={(id) => setActualExpenses(prev => prev.map(e =>
                                                                                                                e.id === exp.id ? { ...e, vendor_account_id: id } : e
                                                                                                            ))}
                                                                                                            companyId={companyId}
                                                                                                            className="h-7 text-xs"
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                                                            {exp._vendorAccountName || exp.vendor_account_id?.slice(0, 8) || '—'}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* تعديل المبلغ + الضريبة */}
                                                                                            {exp._isEditing && canSeeAmounts && (
                                                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                                                    <div className="space-y-0.5">
                                                                                                        <label className="text-[10px] font-medium text-gray-500">{isRTL ? 'المبلغ' : 'Amount'}</label>
                                                                                                        <Input type="number" value={exp.amount_before_tax || ''} onChange={(e) => setActualExpenses(prev => prev.map(ex =>
                                                                                                            ex.id === exp.id ? { ...ex, amount_before_tax: Number(e.target.value) || 0 } : ex
                                                                                                        ))} className="h-7 font-mono text-xs" min={0} onClick={(e) => e.stopPropagation()} />
                                                                                                    </div>
                                                                                                    <div className="space-y-0.5">
                                                                                                        <label className="text-[10px] font-medium text-gray-500">{isRTL ? 'ضريبة %' : 'Tax %'}</label>
                                                                                                        <Input type="number" value={exp.tax_rate || ''} onChange={(e) => setActualExpenses(prev => prev.map(ex =>
                                                                                                            ex.id === exp.id ? { ...ex, tax_rate: Number(e.target.value) || 0 } : ex
                                                                                                        ))} className="h-7 font-mono text-xs" onClick={(e) => e.stopPropagation()} />
                                                                                                    </div>
                                                                                                    <div className="space-y-0.5">
                                                                                                        <label className="text-[10px] font-medium text-gray-500">{isRTL ? 'البيان' : 'Desc'}</label>
                                                                                                        <Input value={exp.description} onChange={(e) => setActualExpenses(prev => prev.map(ex =>
                                                                                                            ex.id === exp.id ? { ...ex, description: e.target.value } : ex
                                                                                                        ))} className="h-7 text-xs" onClick={(e) => e.stopPropagation()} />
                                                                                                    </div>
                                                                                                    <div className="space-y-0.5">
                                                                                                        <label className="text-[10px] font-medium text-gray-500">{isRTL ? 'صرف' : 'Rate'}</label>
                                                                                                        <Input type="number" value={exp.exchange_rate} onChange={(e) => setActualExpenses(prev => prev.map(ex =>
                                                                                                            ex.id === exp.id ? { ...ex, exchange_rate: Number(e.target.value) || 1 } : ex
                                                                                                        ))} className="h-7 font-mono text-xs" onClick={(e) => e.stopPropagation()} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* أزرار الإجراءات */}
                                                                                            {exp._isEditing && (
                                                                                                <div className="flex items-center gap-2 pt-1 border-t">
                                                                                                    <Button
                                                                                                        size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleUpdateActualExpense(exp.id, {
                                                                                                                amount_before_tax: exp.amount_before_tax,
                                                                                                                tax_rate: exp.tax_rate,
                                                                                                                description: exp.description,
                                                                                                                expense_account_id: exp.expense_account_id,
                                                                                                                vendor_account_id: exp.vendor_account_id,
                                                                                                                exchange_rate: exp.exchange_rate,
                                                                                                            });
                                                                                                        }}
                                                                                                        disabled={actualSaving}
                                                                                                    >
                                                                                                        {actualSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                                                        {isRTL ? 'حفظ وترحيل' : 'Save & Post'}
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        variant="ghost" size="sm" className="text-[11px] h-7"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setActualExpenses(prev => prev.map(e2 =>
                                                                                                                e2.id === exp.id ? { ...e2, _isEditing: false } : e2
                                                                                                            ));
                                                                                                            fetchActualExpenses();
                                                                                                        }}
                                                                                                    >
                                                                                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                                                                                    </Button>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* إشعار حماية القيد */}
                                                                                            {exp.is_posted && !exp._isEditing && (
                                                                                                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                                                                                                    <Lock className="w-2.5 h-2.5" />
                                                                                                    {isRTL ? 'محمي — التعديل/الحذف ينشئ قيد عكسي' : 'Protected — edit/delete creates reversal'}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>

                                                        {/* ── تفاصيل القيد الموحّد ── */}
                                                        {batch.journalEntryId && canSeeAmounts && (
                                                            <div className="mx-4 mb-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                                        <BookOpen className="w-3.5 h-3.5" />
                                                                        {isRTL ? 'القيد الموحّد' : 'Unified Journal Entry'}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-gray-400">
                                                                        {batch.journalEntryId.slice(0, 16)}...
                                                                    </span>
                                                                </div>
                                                                <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                                                                    {/* سطر المدين — حساب الكونتينر (بضاعة بالطريق) */}
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[200px]">
                                                                            📦 {data?.container_number
                                                                                ? (isRTL ? `كونتينر ${data.container_number}` : `Container ${data.container_number}`)
                                                                                : (isRTL ? 'بضاعة بالطريق' : 'Goods in Transit')}
                                                                        </span>
                                                                        <span className="font-mono font-semibold text-red-600">
                                                                            {isRTL ? 'مدين' : 'Dr'} {batch.totalAmount.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    {/* سطر ضريبة مدخلات إن وجدت */}
                                                                    {batch.totalTax > 0 && (
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="text-amber-600">{isRTL ? 'ضريبة مدخلات' : 'Input VAT'}</span>
                                                                            <span className="font-mono font-semibold text-red-600">
                                                                                {isRTL ? 'مدين' : 'Dr'} {batch.totalTax.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <Separator className="my-1" />
                                                                    {/* سطور الدائن — حساب كل مورد/مقدم خدمة */}
                                                                    {batch.expenses.map(exp => (
                                                                        <div key={`cr-${exp.id}`} className="flex items-center justify-between text-xs">
                                                                            <span className="text-gray-500 truncate max-w-[200px]">
                                                                                🏢 {exp._vendorAccountName || exp.vendor_name || (isRTL ? 'مورد' : 'Vendor')}
                                                                            </span>
                                                                            <span className="font-mono font-semibold text-green-600">
                                                                                {isRTL ? 'دائن' : 'Cr'} {((exp.amount_before_tax || 0) * (exp.exchange_rate || 1) + (exp.tax_amount || 0) * (exp.exchange_rate || 1)).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* ── إجمالي المصاريف الفعلية ── */}
                                    {actualExpenses.length > 0 && canSeeAmounts && (
                                        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                    {isRTL ? 'إجمالي المصاريف الفعلية' : 'Total Actual Expenses'}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] text-gray-500">
                                                    {batchGroups.length} {isRTL ? (batchGroups.length === 1 ? 'دفعة' : 'دفعات') : (batchGroups.length === 1 ? 'batch' : 'batches')}
                                                </Badge>
                                            </div>
                                            <div className="text-end">
                                                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                    {actualTotals.totalAmount.toLocaleString()} <span className="text-xs font-normal">{containerCurrency}</span>
                                                </span>
                                                {actualTotals.totalTax > 0 && (
                                                    <div className="text-[10px] font-mono text-amber-600">+ {isRTL ? 'ضريبة' : 'tax'} {actualTotals.totalTax.toLocaleString()}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* ════════════════════════════════════════════════════════ */}
            {/* ─── Section 3: الضريبة الجمركية (Customs Tax) ─── */}
            {/* ─── قسم منفصل — نسبة أو مبلغ على المواد — قيد مستقل ─── */}
            {/* ════════════════════════════════════════════════════════ */}
            {!isNewContainer && taxItems.length > 0 && (
                <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 bg-rose-50/80 dark:bg-rose-950/30 rounded-lg border border-rose-200/60 cursor-pointer hover:bg-rose-100/60 transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🏛️</span>
                                <span className="font-semibold text-sm text-rose-800 dark:text-rose-200">
                                    {isRTL ? 'الضريبة الجمركية' : 'Customs Tax'}
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 bg-rose-100 text-rose-700">
                                    {taxItems.length} {isRTL ? 'مادة' : 'items'}
                                </Badge>
                                {canSeeAmounts && taxTotals.totalTax > 0 && (
                                    <span className="font-mono text-xs text-rose-600 dark:text-rose-400 ms-2">
                                        {fmtNum(taxTotals.totalTax)} {containerCurrency}
                                    </span>
                                )}
                                {isTaxPosted && (
                                    <Badge className="text-[9px] px-1.5 bg-green-100 text-green-700 border-green-300">
                                        <Check className="w-3 h-3 me-0.5" />
                                        {isRTL ? 'مُرحّل' : 'Posted'}
                                    </Badge>
                                )}
                            </div>
                            <ChevronDown className="w-4 h-4 text-rose-500 transition-transform duration-200" />
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="bg-white dark:bg-gray-900 rounded-b-lg border border-t-0 p-4 space-y-4">

                            {/* ── Controls: نسبة موحدة أو مختلفة ── */}
                            <div className="flex flex-wrap items-center gap-4">
                                {/* Toggle */}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-600">
                                        {isRTL ? 'نسبة موحدة' : 'Uniform Rate'}
                                    </label>
                                    <button
                                        onClick={() => setUseUniformRate(!useUniformRate)}
                                        className={cn(
                                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                            useUniformRate ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'
                                        )}
                                        disabled={isTaxPosted && !taxEditMode}
                                    >
                                        <span className={cn(
                                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                            useUniformRate ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-1 rtl:-translate-x-1'
                                        )} />
                                    </button>
                                </div>

                                {/* Uniform Rate Input */}
                                {useUniformRate && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{isRTL ? 'النسبة %' : 'Rate %'}</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            max={100}
                                            value={uniformTaxRate}
                                            onChange={(e) => applyUniformTaxRate(parseFloat(e.target.value) || 0)}
                                            className="w-24 h-8 text-center text-sm font-mono"
                                            disabled={isTaxPosted && !taxEditMode}
                                        />
                                    </div>
                                )}

                                {/* Tax Account — يُجلب تلقائياً من الإعدادات العامة */}
                                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {isRTL ? 'حساب الضريبة:' : 'Tax Account:'}
                                    </span>
                                    {taxAccountId ? (
                                        <Badge variant="outline" className="text-xs px-2 py-1 bg-rose-50 border-rose-200 text-rose-700 gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            {taxAccountCode && <span className="font-mono font-bold">{taxAccountCode}</span>}
                                            {taxAccountCode && ' — '}
                                            {taxAccountName || taxAccountId}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-amber-600 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {isRTL ? 'لم يتم تعريف حساب الضريبة في الإعدادات' : 'Tax account not configured in settings'}
                                        </span>
                                    )}
                                </div>

                                {/* حساب الدفع (بنك / مخلّص جمركي) — يختاره المستخدم */}
                                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {isRTL ? 'حساب الدفع:' : 'Payment:'}
                                    </span>
                                    {(!isTaxPosted || taxEditMode) ? (
                                        <Select
                                            value={taxPaymentAccountId}
                                            onValueChange={async (val) => {
                                                setTaxPaymentAccountId(val);
                                                const acc = paymentAccounts.find((a: any) => a.id === val);
                                                if (acc) {
                                                    setTaxPaymentAccountName(`${acc.account_code} — ${language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar)}`);
                                                }
                                                if (containerId) {
                                                    await supabase
                                                        .from('containers')
                                                        .update({ customs_tax_payment_account_id: val, updated_at: new Date().toISOString() })
                                                        .eq('id', containerId);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                                <SelectValue placeholder={isRTL ? 'اختر حساب الدفع...' : 'Select payment...'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentAccounts.map((acc: any) => (
                                                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                                        {acc.account_code} — {language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        taxPaymentAccountName ? (
                                            <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 border-blue-200 text-blue-700 gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {taxPaymentAccountName}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {isRTL ? 'لم يتم تحديد حساب الدفع' : 'Payment account not set'}
                                            </span>
                                        )
                                    )}
                                </div>

                                {/* رقم القيد — يظهر بعد الترحيل */}
                                {isTaxPosted && taxJournalEntryNumber && (
                                    <div className="flex items-center gap-2">
                                        <Badge className="text-xs px-2 py-1 bg-green-50 border-green-300 text-green-700 gap-1">
                                            <Check className="w-3 h-3" />
                                            {isRTL ? 'قيد رقم:' : 'JE #:'}
                                            <span className="font-mono font-bold">{taxJournalEntryNumber}</span>
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* ── جدول المواد والضريبة ── */}
                            {taxLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                                    <span className="ms-2 text-sm text-gray-500">
                                        {isRTL ? 'تحميل البنود...' : 'Loading items...'}
                                    </span>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-rose-50/50 dark:bg-rose-950/20">
                                                <TableHead className="text-xs">#</TableHead>
                                                <TableHead className="text-xs">{isRTL ? 'المادة' : 'Material'}</TableHead>
                                                <TableHead className="text-xs">{isRTL ? 'اللون' : 'Color'}</TableHead>
                                                <TableHead className="text-xs text-center">{isRTL ? 'الكمية' : 'Qty'}</TableHead>
                                                <TableHead className="text-xs text-center">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                                                <TableHead className="text-xs text-center">{isRTL ? 'القيمة' : 'Value'}</TableHead>
                                                <TableHead className="text-xs text-center min-w-[80px]">{isRTL ? 'نسبة الضريبة %' : 'Tax Rate %'}</TableHead>
                                                <TableHead className="text-xs text-center">{isRTL ? 'مبلغ الضريبة' : 'Tax Amount'}</TableHead>
                                                <TableHead className="text-xs text-center">{isRTL ? 'الضريبة/وحدة' : 'Tax/Unit'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {taxItems.map((item, idx) => (
                                                <TableRow key={item.id} className="hover:bg-rose-25/30">
                                                    <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        <div>{item.item_description || item.material_code}</div>
                                                        {item.material_code && item.item_description && (
                                                            <div className="text-[10px] text-gray-400">{item.material_code}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs">{item.color_name || '—'}</TableCell>
                                                    <TableCell className="text-xs text-center font-mono">{fmtNum(item.expected_quantity)}</TableCell>
                                                    <TableCell className="text-xs text-center font-mono">{fmtNum(item.unit_cost)}</TableCell>
                                                    <TableCell className="text-xs text-center font-mono font-semibold">{fmtNum(item.total_cost)}</TableCell>
                                                    <TableCell className="text-center">
                                                        {useUniformRate ? (
                                                            <span className="text-xs font-mono text-rose-600">{item.customs_duty_rate}%</span>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min={0}
                                                                max={100}
                                                                value={item.customs_duty_rate}
                                                                onChange={(e) => updateItemTaxRate(item.id, parseFloat(e.target.value) || 0)}
                                                                className="w-20 h-7 text-center text-xs font-mono"
                                                                disabled={isTaxPosted && !taxEditMode}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-center font-mono text-rose-700 font-semibold">
                                                        {fmtNum(item.customs_duty_amount)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-center font-mono text-gray-500">
                                                        {fmtNum(item.customs_duty_per_unit)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow className="bg-rose-100/60 dark:bg-rose-950/40 font-bold">
                                                <TableCell colSpan={5} className="text-xs">
                                                    {isRTL ? 'الإجمالي' : 'Total'}
                                                </TableCell>
                                                <TableCell className="text-xs text-center font-mono">
                                                    {fmtNum(taxTotals.totalValue)}
                                                </TableCell>
                                                <TableCell className="text-xs text-center font-mono text-rose-600">
                                                    {uniformTaxRate > 0 && `${uniformTaxRate}%`}
                                                </TableCell>
                                                <TableCell className="text-xs text-center font-mono text-rose-700 font-bold">
                                                    {fmtNum(taxTotals.totalTax)} {containerCurrency}
                                                </TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            )}

                            {/* ── أزرار الحفظ والترحيل ── */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-gray-500">
                                    {isRTL
                                        ? 'القيد: مدين 117 ضريبة مدخلات (مستردة) / دائن حساب الدفع (بنك / مخلّص)'
                                        : 'Entry: Dr VAT Input (recoverable) / Cr Payment Account'
                                    }
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* حالة 1: لم يُرحّل بعد */}
                                    {!isTaxPosted && !taxEditMode && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSaveTaxDistribution}
                                                disabled={taxSaving || taxTotals.totalTax <= 0}
                                                className="gap-1 text-xs"
                                            >
                                                {taxSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                {isRTL ? 'حفظ التوزيع' : 'Save Distribution'}
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handlePostCustomsTax}
                                                disabled={taxPosting || taxTotals.totalTax <= 0 || !taxAccountId}
                                                className="gap-1 text-xs bg-rose-600 hover:bg-rose-700"
                                            >
                                                {taxPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                                                {isRTL ? 'ترحيل قيد الضريبة' : 'Post Tax Entry'}
                                            </Button>
                                        </>
                                    )}
                                    {/* حالة 2: مُرحّل — عرض الشارة + زر تعديل */}
                                    {isTaxPosted && !taxEditMode && (
                                        <>
                                            <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-xs px-3 py-1">
                                                <Check className="w-3 h-3" />
                                                {isRTL ? 'تم ترحيل الضريبة' : 'Tax Posted'}
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleEditCustomsTax}
                                                className="gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                {isRTL ? 'تعديل' : 'Edit'}
                                            </Button>
                                        </>
                                    )}
                                    {/* حالة 3: وضع التعديل — حفظ التعديلات + إلغاء */}
                                    {taxEditMode && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setTaxEditMode(false)}
                                                className="gap-1 text-xs"
                                            >
                                                {isRTL ? 'إلغاء' : 'Cancel'}
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSaveEditedTax}
                                                disabled={taxPosting || taxTotals.totalTax <= 0}
                                                className="gap-1 text-xs bg-amber-600 hover:bg-amber-700"
                                            >
                                                {taxPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                {isRTL ? 'حفظ التعديلات' : 'Save Changes'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* ─── Cost Summary Cards ─── */}
            {canSeeAmounts && (expenses.length > 0 || actualExpenses.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Goods Value */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200/60">
                        <div className="text-xs text-blue-600 mb-1">{isRTL ? 'قيمة البضاعة' : 'Goods Value'}</div>
                        <div className="font-mono font-bold text-blue-800 dark:text-blue-300">
                            {totals.goodsValue.toLocaleString()} <span className="text-xs font-normal">{containerCurrency}</span>
                        </div>
                    </div>

                    {/* Expenses: Estimated + Actual */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200/60">
                        <div className="text-xs text-amber-600 mb-1">{isRTL ? 'المصاريف' : 'Expenses'}</div>
                        {/* الأولي */}
                        <div className="flex items-baseline justify-between">
                            <span className="text-[10px] text-gray-500">{isRTL ? 'أولي:' : 'Prel:'}</span>
                            <span className={cn(
                                "font-mono text-sm",
                                totals.totalActual > 0 ? "text-gray-400 line-through" : "font-bold text-amber-800 dark:text-amber-300"
                            )}>
                                {totals.totalExpected.toLocaleString()}
                            </span>
                        </div>
                        {/* الفعلي */}
                        {totals.totalActual > 0 ? (
                            <div className="flex items-baseline justify-between mt-0.5">
                                <span className="text-[10px] text-emerald-600 font-semibold">{isRTL ? 'فعلي:' : 'Act:'}</span>
                                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {totals.totalActual.toLocaleString()}
                                </span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                                {isRTL ? 'لا يوجد فعلي بعد' : 'No actual yet'}
                            </div>
                        )}
                        <div className="text-[9px] text-gray-400 mt-0.5">{containerCurrency}</div>
                    </div>

                    {/* Landed Cost */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200/60">
                        <div className="text-xs text-emerald-600 mb-1">
                            {isRTL ? 'التكلفة النهائية' : 'Final Cost'}
                            <span className="text-[9px] ms-1 opacity-60">
                                ({totals.totalActual > 0
                                    ? (isRTL ? 'فعلي' : 'actual')
                                    : (isRTL ? 'أولي' : 'prel.')
                                })
                            </span>
                        </div>
                        <div className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                            {totals.landedCost.toLocaleString()} <span className="text-xs font-normal">{containerCurrency}</span>
                        </div>
                    </div>

                    {/* Paid vs Due */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200/60">
                        <div className="text-xs text-purple-600 mb-1">{isRTL ? 'المدفوع / المطلوب' : 'Paid / Due'}</div>
                        <div className="font-mono font-bold text-purple-800 dark:text-purple-300">
                            <span>{totals.totalPaid.toLocaleString()}</span>
                            <span className="text-xs font-normal mx-1">/</span>
                            <span className="text-gray-500">{(totals.totalActual > 0 ? totals.totalActual : totals.totalExpected).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}


            {/* ─── Variance Warning ─── */}
            {canSeeAmounts && totals.variance > 0 && totals.totalActual > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                        {isRTL
                            ? `تجاوز المصاريف الفعلية عن المتوقعة بمبلغ ${totals.variance.toLocaleString()} ${containerCurrency}`
                            : `Actual expenses exceeded budget by ${totals.variance.toLocaleString()} ${containerCurrency}`
                        }
                    </span>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                🚦 STATE MACHINE — الحالة الحالية للكونتينر
                [مفتوح] → [توزيع مثبّت] → [مغلق]
            ═══════════════════════════════════════════════════════════════ */}
            {canSeeAmounts && containerId && !isNewContainer && (
                <div className="space-y-3">
                    <Separator />

                    {/* ── شريط الحالة ── */}
                    <div className="flex items-center gap-2 text-xs">
                        {/* Step 1 */}
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full font-medium",
                            !isFinalized && !isClosed
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through"
                        )}>
                            {!isFinalized && !isClosed
                                ? <span>●</span>
                                : <Check className="w-3 h-3" />
                            }
                            {isRTL ? '١ · إضافة المصاريف' : '1 · Add Expenses'}
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">→</span>

                        {/* Step 2 */}
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full font-medium",
                            isFinalized && !isClosed
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                : isFinalized && isClosed
                                    ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through"
                                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        )}>
                            {isFinalized
                                ? isClosed ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />
                                : <span>●</span>
                            }
                            {isRTL ? '٢ · توزيع + تثبيت' : '2 · Distribute & Lock'}
                        </div>
                        <span className="text-gray-300 dark:text-gray-600">→</span>

                        {/* Step 3 */}
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full font-medium",
                            isClosed
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                        )}>
                            {isClosed ? <Check className="w-3 h-3" /> : <span>●</span>}
                            {isRTL ? '٣ · إغلاق الكونتينر' : '3 · Close Container'}
                        </div>
                    </div>

                    {/* ── أزرار الإجراءات حسب الحالة ── */}
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            {isRTL ? 'التكلفة النهائية (Final Cost)' : 'Final Cost'}
                            {/* حالة الإغلاق */}
                            {isClosed && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1">
                                    <Check className="w-3 h-3" />
                                    {isRTL ? 'مغلق ومرحّل' : 'Closed & Posted'}
                                </Badge>
                            )}
                            {/* حالة التثبيت فقط */}
                            {isFinalized && !isClosed && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 gap-1">
                                    <Lock className="w-3 h-3" />
                                    {isRTL ? 'موزّع ومثبّت — جاهز للإغلاق' : 'Distributed & Locked — Ready to Close'}
                                </Badge>
                            )}
                        </h4>

                        <div className="flex items-center gap-2">
                            {/* ── حالة OPEN: حساب + تثبيت ── */}
                            {!isFinalized && !isClosed && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCalculateLandedCost}
                                        disabled={calculating || expenses.length === 0}
                                        className="gap-1 text-xs"
                                    >
                                        {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                                        {isRTL ? 'احسب التوزيع' : 'Calculate'}
                                    </Button>
                                    {isEditable && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleFinalizeLandedCost}
                                            disabled={finalizing || expenses.length === 0 || hasUnsaved}
                                            className="gap-1 text-xs bg-amber-600 hover:bg-amber-700"
                                        >
                                            {finalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                            {isRTL ? 'توزيع وتثبيت المصاريف' : 'Distribute & Lock'}
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* ── حالة FINALIZED: جاهز للإغلاق ── */}
                            {isFinalized && !isClosed && (
                                <div className="flex items-center gap-2">
                                    {/* المصاريف مقفولة */}
                                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        {isRTL ? 'القيود مقفولة — الإغلاق سيرحل قيداً واحداً كاملاً' : 'Entries locked — Closing will post one full entry'}
                                    </span>
                                </div>
                            )}

                            {/* ── حالة CLOSED: عرض جاهز ── */}
                            {isClosed && closingJE && (
                                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    {closingJE.entry_number}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Allocation Method Display */}
                    {allocationResult && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{isRTL ? 'طريقة التوزيع:' : 'Allocation Method:'}</span>
                            <Badge variant="secondary" className="text-[10px]">
                                {allocationResult.allocationMethod === 'by_value'
                                    ? (isRTL ? 'حسب القيمة' : 'By Value')
                                    : allocationResult.allocationMethod === 'by_quantity'
                                        ? (isRTL ? 'حسب الكمية' : 'By Quantity')
                                        : (isRTL ? 'يدوي' : 'Manual')
                                }
                            </Badge>
                        </div>
                    )}

                    {/* Allocation Preview Table */}
                    {allocationResult && allocationResult.allocatedItems?.length > 0 && (
                        <Collapsible open={showAllocation} onOpenChange={setShowAllocation}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full justify-between text-xs py-1 h-8">
                                    <span className="flex items-center gap-1">
                                        <Package className="w-3.5 h-3.5" />
                                        {isRTL
                                            ? `توزيع التكاليف على ${allocationResult.allocatedItems.length} بند`
                                            : `Cost allocation for ${allocationResult.allocatedItems.length} items`
                                        }
                                    </span>
                                    {showAllocation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border overflow-x-auto mt-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-100/60 dark:bg-gray-800/60">
                                                <TableHead className={cn("text-[11px]", isRTL && "text-right")}>
                                                    {isRTL ? 'المادة' : 'Material'}
                                                </TableHead>
                                                <TableHead className="text-[11px] text-center">
                                                    {isRTL ? 'الكمية' : 'Qty'}
                                                </TableHead>
                                                <TableHead className="text-[11px] text-center">
                                                    {isRTL ? 'سعر المورد' : 'Unit Cost'}
                                                </TableHead>
                                                <TableHead className="text-[11px] text-center">
                                                    {isRTL ? 'قيمة البضاعة' : 'Goods Value'}
                                                </TableHead>
                                                <TableHead className="text-[11px] text-center">
                                                    {isRTL ? 'مصاريف موزعة' : 'Allocated'}
                                                </TableHead>
                                                <TableHead className="text-[11px] text-center font-bold">
                                                    {isRTL ? 'تكلفة الوحدة الواصلة' : 'Landed/Unit'}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allocationResult.allocatedItems.map((item: any) => {
                                                const goodsVal = (item.unit_cost || 0) * (item.expected_quantity || 0);
                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="text-xs">
                                                            <div>
                                                                <span className="font-medium">
                                                                    {item.item_description || item.material?.name_ar || item.material?.name_en || '-'}
                                                                </span>
                                                                {item.color_name && (
                                                                    <Badge variant="outline" className="ms-1 text-[10px]">
                                                                        {item.color_name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs">
                                                            {fmtNum(item.expected_quantity || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs">
                                                            {fmtNum(item.unit_cost || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs">
                                                            {fmtNum(goodsVal)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs text-amber-600 dark:text-amber-400">
                                                            +{fmtNum(item.allocatedCost || 0)}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                            {fmtNum(item.finalUnitCost || 0)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow className="bg-gray-100/80 dark:bg-gray-800/80 font-semibold">
                                                <TableCell className={cn("text-xs", isRTL ? "text-right" : "text-left")}>
                                                    {isRTL ? 'الإجمالي' : 'Total'}
                                                </TableCell>
                                                <TableCell />
                                                <TableCell />
                                                <TableCell className="text-center font-mono text-xs font-bold">
                                                    {fmtNum(allocationResult.totalGoodsValue || 0)}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs font-bold text-amber-600">
                                                    <div>+{fmtNum(allocationResult.totalEstimatedExpenses || 0)}</div>
                                                    <div className="text-[9px] text-gray-400">{isRTL ? 'أولي' : 'Prel.'}</div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs font-bold text-emerald-700">
                                                    <div>+{fmtNum(allocationResult.totalActualExpenses || 0)}</div>
                                                    <div className="text-[9px] text-gray-400">{isRTL ? 'فعلي' : 'Actual'}</div>
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Finalization Warning */}
                    {hasUnsaved && !isFinalized && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-300">
                                {isRTL
                                    ? 'يجب حفظ المصاريف أولاً قبل تثبيت التكاليف'
                                    : 'Save expenses first before finalizing costs'
                                }
                            </span>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════════
                        🔑 CLOSING ENTRY — قيد الإقفال (مبسّط)
                        - بعد الإقفال: رسالة نجاح + كبسة تفاصيل للسوبر أدمن
                        - قبل الإقفال: رسالة انتظار بسيطة
                    ══════════════════════════════════════════════════════════════ */}
                    {canSeeAmounts && (
                        <div className="rounded-xl border overflow-hidden">
                            {closingJE ? (
                                <>
                                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-200">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                                <Check className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                                    {isRTL
                                                        ? 'تم إقفال الكونتينر وتوزيع المصاريف على المخزون'
                                                        : 'Container closed — expenses distributed to inventory'}
                                                </p>
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {isRTL
                                                        ? `التكلفة النهائية: ${fmtNum(closingJE.total_debit)} ${containerCurrency} — تاريخ: ${closingJE.entry_date}`
                                                        : `Landed cost: ${fmtNum(closingJE.total_debit)} ${containerCurrency} — Date: ${closingJE.entry_date}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                            0.00 ✅
                                        </span>
                                    </div>

                                    {isSuperAdmin && (
                                        <div className="px-3 py-2 bg-white dark:bg-gray-950">
                                            <button
                                                className={cn(
                                                    'w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] border border-dashed transition-colors',
                                                    showClosingDetails
                                                        ? 'border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-50'
                                                        : 'border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200'
                                                )}
                                                onClick={() => setShowClosingDetails(!showClosingDetails)}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                {showClosingDetails
                                                    ? (isRTL ? 'إخفاء تفاصيل القيد' : 'Hide Entry Details')
                                                    : (isRTL ? 'عرض تفاصيل القيد (سوبر أدمن)' : 'Show Entry Details (Admin)')}
                                            </button>

                                            {showClosingDetails && (
                                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
                                                    <div className="px-3 py-1.5 bg-amber-100/50 border-b border-amber-200 flex items-center gap-2">
                                                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                                        <span className="text-[11px] font-semibold text-amber-700">
                                                            {isRTL ? `قيد إقفال: ${closingJE.entry_number}` : `Closing JE: ${closingJE.entry_number}`}
                                                        </span>
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        <div className="flex items-center justify-between py-1.5 px-3 rounded bg-white dark:bg-gray-900 border text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                <span className="font-medium text-amber-800">
                                                                    {isRTL
                                                                        ? `مدين — ${inventoryAccount?.account_code || '1141'} ${inventoryAccount?.name_ar || 'بضاعة جاهزة'}`
                                                                        : `Dr. — ${inventoryAccount?.account_code || '1141'} ${inventoryAccount?.name_en || inventoryAccount?.name_ar || 'Inventory'}`}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono font-bold text-emerald-600">
                                                                {fmtNum(closingJE.total_debit)} {containerCurrency}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5 px-3 rounded bg-white dark:bg-gray-900 border text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                                                <span className="font-medium text-amber-800">
                                                                    {isRTL
                                                                        ? `دائن — ${containerCoaAccount?.account_code || ''} ${containerCoaAccount?.name_ar || data?.container_number || ''}`
                                                                        : `Cr. — ${containerCoaAccount?.account_code || ''} ${containerCoaAccount?.name_ar || data?.container_number || ''}`}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono font-bold text-red-500">
                                                                ({fmtNum(closingJE.total_debit)}) {containerCurrency}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50/50 dark:bg-blue-950/20">
                                    <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        {isRTL
                                            ? 'سيتم إنشاء قيد الإقفال تلقائياً عند إغلاق الحاوية واستلام البضاعة'
                                            : 'Closing entry created automatically when container is closed and goods received'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

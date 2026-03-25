/**
 * ════════════════════════════════════════════════════════════════
 * 📊 SummaryAccountSheet — شيت الحساب الملخص
 * ════════════════════════════════════════════════════════════════
 * يُفتح عند الضغط على حساب ملخص (is_summary_account) من الشجرة المحاسبية
 * يعرض: نظرة عامة / الحسابات / الحركات / النشاط / المرفقات
 * 
 * يعمل لجميع الفئات: employee | customer | supplier
 * يتبع نفس نمط UnifiedAccountingSheet
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import {
    Sheet, SheetContent,
    SheetHeader as UiSheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Users, UserCheck, Truck, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Tabs
import { SummaryOverviewTab } from './tabs/SummaryOverviewTab';
import { SummaryAccountsTab } from './tabs/SummaryAccountsTab';
import { SummaryTransactionsTab } from './tabs/SummaryTransactionsTab';

// Shared tabs (same as UnifiedAccountingSheet)
import { ActivityTab } from '@/features/accounting/components/unified/tabs/ActivityTab';
import { DocumentAttachmentsTab } from '@/features/trade/components/tabs/DocumentAttachmentsTab';
import { attachmentService } from '@/services/attachmentService';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface SummaryAccountData {
    id: string;
    account_code: string;
    name_ar: string;
    name_en?: string;
    summary_party_type: 'employee' | 'customer' | 'supplier' | 'exchange_customer' | 'exchange_agent' | 'exchange_partner';
    parent_id: string;
    current_balance: number;
    company_id: string;
    tenant_id: string;
}

export interface PartySubAccount {
    id: string;
    account_code: string;
    name_ar: string;
    name_en?: string;
    party_id: string;
    party_type: string;
    current_balance: number;
    currency?: string;
    is_active: boolean;
    created_at: string;
    last_activity?: string;
    total_debit?: number;
    total_credit?: number;
    transaction_count?: number;
}

interface SummaryAccountSheetProps {
    isOpen: boolean;
    onClose: () => void;
    data: SummaryAccountData | null;
    companyId?: string;
    onRefresh?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Tab Config
// ═══════════════════════════════════════════════════════════════

type TabId = 'overview' | 'accounts' | 'transactions' | 'activity' | 'attachments';

interface TabConfig {
    id: TabId;
    labelKey: string;
    icon: string;
}

const TABS: TabConfig[] = [
    { id: 'overview', labelKey: 'accounting.summarySheet.tabs.overview', icon: '📊' },
    { id: 'accounts', labelKey: 'accounting.summarySheet.tabs.accounts', icon: '📋' },
    { id: 'transactions', labelKey: 'accounting.summarySheet.tabs.transactions', icon: '💰' },
    { id: 'activity', labelKey: 'accounting.summarySheet.tabs.activity', icon: '📝' },
    { id: 'attachments', labelKey: 'accounting.summarySheet.tabs.attachments', icon: '📎' },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const getPartyIcon = (type: string) => {
    switch (type) {
        case 'employee': return Users;
        case 'customer': return UserCheck;
        case 'exchange_customer': return UserCheck;
        case 'supplier': return Truck;
        case 'exchange_agent': return Users;
        case 'exchange_partner': return Users;
        default: return BarChart3;
    }
};

const getPartyColor = (type: string) => {
    switch (type) {
        case 'employee': return 'from-indigo-500 to-violet-600';
        case 'customer': return 'from-emerald-500 to-teal-600';
        case 'exchange_customer': return 'from-teal-500 to-cyan-600';
        case 'supplier': return 'from-amber-500 to-orange-600';
        case 'exchange_agent': return 'from-blue-500 to-indigo-600';
        case 'exchange_partner': return 'from-purple-500 to-fuchsia-600';
        default: return 'from-gray-500 to-gray-600';
    }
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function SummaryAccountSheet({
    isOpen,
    onClose,
    data,
    companyId: propCompanyId,
    onRefresh,
}: SummaryAccountSheetProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';
    const { companyId: hookCompanyId } = useCompany();
    const resolvedCompanyId = propCompanyId || hookCompanyId;
    const { selectedCurrency, setSelectedCurrency, currencyOptions, convertAmount } = useViewCurrency();

    // State
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [loading, setLoading] = useState(false);
    const [subAccounts, setSubAccounts] = useState<PartySubAccount[]>([]);
    const [attachmentCount, setAttachmentCount] = useState(0);
    const [activityCount, setActivityCount] = useState(0);

    const partyType = data?.summary_party_type || 'employee';
    const PartyIcon = getPartyIcon(partyType);
    const partyColor = getPartyColor(partyType);

    // ═══ Fetch sub-accounts + balances from RPC ═══
    const fetchSubAccounts = useCallback(async () => {
        if (!data?.parent_id) return;
        setLoading(true);
        try {
            // 1. جلب الحسابات الفرعية (party accounts OR agent/partner accounts)
            const isExchangeType = ['exchange_customer', 'exchange_agent', 'exchange_partner'].includes(partyType);
            let query = supabase
                .from('chart_of_accounts')
                .select('*')
                .eq('parent_id', data.parent_id)
                .neq('is_summary_account', true)
                .order('account_code');
            
            // For exchange agents/partners, accounts may not have is_party_account flag
            if (!isExchangeType) {
                query = query.eq('is_party_account', true);
            } else {
                query = query.eq('is_detail', true);
            }
            
            const { data: accounts, error } = await query;

            if (error) throw error;
            const accts = accounts || [];

            // 2. جلب الأرصدة من RPC المُحسّن (فقط الحسابات الفرعية — لا كل الشركة!)
            if (accts.length > 0 && resolvedCompanyId) {
                const { data: rpcData } = await supabase.rpc('get_account_balances_for_parent', {
                    p_company_id: resolvedCompanyId,
                    p_parent_id: data.parent_id,
                });

                // Build RPC balance map
                const rpcMap = new Map<string, any>();
                (rpcData || []).forEach((row: any) => {
                    rpcMap.set(row.account_id, row);
                });

                // Merge: use RPC for balances (FC = native currency amounts)
                const enriched: PartySubAccount[] = accts.map(a => {
                    const rpc = rpcMap.get(a.id);
                    return {
                        ...a,
                        // Use FC balance from RPC (accurate native currency)
                        current_balance: rpc ? Number(rpc.balance) || 0 : a.current_balance || 0,
                        currency: rpc?.currency || a.currency || 'USD',
                        // FC debit/credit (native currency, not base!)
                        total_debit: rpc ? Number(rpc.total_debit) || 0 : 0,
                        total_credit: rpc ? Number(rpc.total_credit) || 0 : 0,
                        transaction_count: rpc ? Number(rpc.transaction_count) || 0 : 0,
                    };
                });
                setSubAccounts(enriched);
            } else {
                setSubAccounts([]);
            }
        } catch (err) {
            console.error('[SummaryAccountSheet] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [data?.parent_id, data?.id, partyType, resolvedCompanyId]);

    useEffect(() => {
        if (isOpen && data) {
            // Reset stale data immediately before fetching
            setSubAccounts([]);
            fetchSubAccounts();
            setActiveTab('overview');
            // Fetch attachment count
            attachmentService.getEntityAttachmentCount('summary_account', data.id)
                .then(count => setAttachmentCount(count))
                .catch(() => setAttachmentCount(0));
        }
    }, [isOpen, data, fetchSubAccounts]);

    // ═══ Helper: convert amount to selected currency ═══
    const convert = useCallback((amount: number, currency: string): number => {
        if (!amount) return 0;
        if (selectedCurrency === 'all') return amount;
        return convertAmount(amount, currency || 'USD');
    }, [selectedCurrency, convertAmount]);

    // ═══ Computed stats (with currency conversion) ═══
    const stats = useMemo(() => {
        const total = subAccounts.length;
        const active = subAccounts.filter(a => a.is_active).length;
        const totalDebit = subAccounts.reduce((s, a) => {
            return s + convert(a.total_debit || 0, a.currency || 'USD');
        }, 0);
        const totalCredit = subAccounts.reduce((s, a) => {
            return s + convert(a.total_credit || 0, a.currency || 'USD');
        }, 0);
        const totalBalance = subAccounts.reduce((s, a) => {
            return s + convert(a.current_balance || 0, a.currency || 'USD');
        }, 0);
        const maxBalance = subAccounts.length > 0
            ? Math.max(...subAccounts.map(a => Math.abs(convert(a.current_balance || 0, a.currency || 'USD'))))
            : 0;

        return { total, active, totalDebit, totalCredit, totalBalance, maxBalance };
    }, [subAccounts, convert]);

    // ═══ Title ═══
    const sheetTitle = useMemo(() => {
        if (!data) return '';
        return language === 'ar' ? data.name_ar : (data.name_en || data.name_ar);
    }, [data, language]);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                className={cn(
                    '!w-[70vw] !max-w-[70vw] p-0 flex flex-col h-full',
                    'bg-gray-50 dark:bg-gray-900',
                )}
                side={isRTL ? 'left' : 'right'}
            >
                <div className="flex flex-col h-full w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Accessibility */}
                    <UiSheetHeader className="sr-only">
                        <SheetTitle>{sheetTitle}</SheetTitle>
                        <SheetDescription>
                            {t('accounting.summarySheet.description')}
                        </SheetDescription>
                    </UiSheetHeader>

                    {/* Loading */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-erp-primary" />
                        </div>
                    )}

                    {/* ═══ Header ═══ */}
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b">
                        <div className="flex items-center justify-between gap-3">
                            {/* Left: Icon + Title */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br text-white',
                                    partyColor,
                                )}>
                                    <PartyIcon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate font-cairo">
                                            {sheetTitle}
                                        </h2>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                            {data?.account_code}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                                        {t(`accounting.summarySheet.partyType.${partyType}`)}
                                        {' • '}
                                        {stats.total} {t('accounting.summarySheet.accountsCount')}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Close */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={onClose}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        {/* Currency Filter */}
                        <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                <SelectTrigger className="h-7 w-[90px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencyOptions.map(opt => (
                                        <SelectItem key={opt} value={opt} className="text-xs">
                                            {opt === 'all' ? (t('common.all') || 'الكل') : opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ═══ Tabs Bar ═══ */}
                    <div className="border-b bg-white dark:bg-gray-900">
                        <ScrollArea
                            className="w-full"
                            dir={isRTL ? 'rtl' : 'ltr'}
                        >
                            <div className={cn(
                                'flex gap-0 px-2',
                                isRTL ? '!justify-start' : '',
                            )}>
                                {TABS.map((tab) => {
                                    const badge = tab.id === 'attachments' && attachmentCount > 0
                                        ? attachmentCount
                                        : tab.id === 'activity' && activityCount > 0
                                            ? activityCount
                                            : 0;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 relative',
                                                activeTab === tab.id
                                                    ? 'border-erp-primary text-erp-primary dark:text-erp-accent font-semibold'
                                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                                            )}
                                        >
                                            <span className="me-1.5">{tab.icon}</span>
                                            {t(tab.labelKey)}
                                            {badge > 0 && (
                                                <span className="ms-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-erp-primary/15 text-erp-primary text-[10px] font-bold">
                                                    {badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* ═══ Tab Content — Keep-Mounted Pattern ═══ */}
                    <ScrollArea className="flex-1">
                        <div className="p-4">
                            {/* Overview */}
                            <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
                                <SummaryOverviewTab
                                    data={data}
                                    subAccounts={subAccounts}
                                    stats={stats}
                                    partyType={partyType}
                                    isRTL={isRTL}
                                    convert={convert}
                                />
                            </div>

                            {/* Accounts */}
                            <div className={activeTab === 'accounts' ? 'block' : 'hidden'}>
                                <SummaryAccountsTab
                                    subAccounts={subAccounts}
                                    partyType={partyType}
                                    isRTL={isRTL}
                                    companyId={resolvedCompanyId}
                                    convert={convert}
                                    selectedCurrency={selectedCurrency}
                                />
                            </div>

                            {/* Transactions */}
                            <div className={activeTab === 'transactions' ? 'block' : 'hidden'}>
                                <SummaryTransactionsTab
                                    subAccounts={subAccounts}
                                    partyType={partyType}
                                    isRTL={isRTL}
                                    parentAccountId={data?.parent_id || ''}
                                />
                            </div>

                            {/* Activity — same ActivityTab as UnifiedAccountingSheet */}
                            <div className={activeTab === 'activity' ? 'block' : 'hidden'}>
                                {data?.id && (
                                    <ActivityTab
                                        documentId={data.id}
                                        entityType="chart_of_accounts"
                                    />
                                )}
                            </div>

                            {/* Attachments — same DocumentAttachmentsTab as UnifiedAccountingSheet */}
                            <div className={activeTab === 'attachments' ? 'block' : 'hidden'}>
                                {data?.id && (
                                    <DocumentAttachmentsTab
                                        data={data}
                                        mode="view"
                                        docType="summary_account"
                                        onChange={(updates: any) => {
                                            if (typeof updates?.attachments_count === 'number') {
                                                setAttachmentCount(updates.attachments_count);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default SummaryAccountSheet;

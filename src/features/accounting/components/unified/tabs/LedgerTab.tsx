/**
 * LedgerTab — كشف الحساب (الإصدار الجديد)
 * 
 * يستخدم NexaListTable + بيانات حقيقية من accountLedgerService
 * ✅ أسطر منفتحة (تفاصيل القيد عند الضغط)
 * ✅ ماركر 9 ألوان للمطابقة المحاسبية
 * ✅ تجميع شهري قابل للإلغاء
 * ✅ فلاتر: تواريخ سريعة + عملة + نوع الحركة
 * ✅ حساب مقابل ذكي (ثنائي أو متعدد)
 * ✅ أيقونة نوع المستند
 * ✅ شريط ملخص علوي + footer ثابت
 */

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAccountingSettings } from '@/hooks/useAccountingSettings';
import { useViewCurrency } from '@/features/accounting/hooks/useViewCurrency';
import { NexaListTable, type NexaListColumn } from '@/components/ui/nexa-list-table';
import { LedgerExpandedRow } from './LedgerExpandedRow';
import { fetchPartyDocDetails } from './PartyLedgerExpandedRow';
import { useLedgerData, type ExtendedLedgerEntry } from '../hooks/useLedgerData';
import { cn, formatNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    CalendarDays,
    CalendarRange,
    Layers,
    TrendingUp,
    TrendingDown,
    Minus,
    ListOrdered,
    LayoutList,
} from 'lucide-react';
import type { MarkerColorId } from '@/components/shared/ColorMarkerPalette';

// Lazy load UnifiedAccountingSheet to avoid circular dependency
const UnifiedAccountingSheet = React.lazy(() => 
    import('../UnifiedAccountingSheet').then(m => ({ default: m.UnifiedAccountingSheet }))
);

// ═══ Entry Type Icons ═══
const ENTRY_TYPE_ICONS: Record<string, string> = {
    journal: '📋',
    cash: '🏦',
    invoice: '🧾',
    payment: '💸',
    receipt: '💰',
    transfer: '🔄',
};

// ═══ Props ═══
interface LedgerTabProps {
    accountId: string;
    companyId: string;
    currency?: string;
    onEntryOpen?: (entry: ExtendedLedgerEntry) => void;
    renderExpandedRowOverride?: (row: ExtendedLedgerEntry) => React.ReactNode;
    /** Party mode: enables invoice+payment grouping toggle */
    partyMode?: boolean;
    /** Callback when user changes display currency filter */
    onDisplayCurrencyChange?: (currency: string) => void;
}

// ═══ View Mode ═══
type ViewMode = 'chronological' | 'grouped';

// ═══ Quick Date Presets ═══
type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

const DATE_PRESETS: { id: DatePreset; label_ar: string; label_en: string; labels?: Record<string, string>; icon: React.ReactNode }[] = [
    { id: 'month', label_ar: 'الشهر', label_en: 'Month', labels: { ru: 'Месяц', uk: 'Місяць', tr: 'Ay', de: 'Monat', it: 'Mese', ro: 'Lună', pl: 'Miesiąc' }, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'quarter', label_ar: 'الربع', label_en: 'Quarter', labels: { ru: 'Квартал', uk: 'Квартал', tr: 'Çeyrek', de: 'Quartal', it: 'Trimestre', ro: 'Trimestru', pl: 'Kwartał' }, icon: <CalendarRange className="w-3.5 h-3.5" /> },
    { id: 'year', label_ar: 'السنة', label_en: 'Year', labels: { ru: 'Год', uk: 'Рік', tr: 'Yıl', de: 'Jahr', it: 'Anno', ro: 'An', pl: 'Rok' }, icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'all', label_ar: 'الكل', label_en: 'All', labels: { ru: 'Все', uk: 'Всі', tr: 'Tümü', de: 'Alle', it: 'Tutti', ro: 'Toate', pl: 'Wszystkie' }, icon: <Layers className="w-3.5 h-3.5" /> },
];

// ═══ Movement Type Filter ═══
type MovementFilter = 'all' | 'debit' | 'credit';

// ═══ Entry Type Filter (Party mode) ═══
type EntryTypeFilter = 'all' | 'invoices' | 'payments';

export function LedgerTab({
    accountId,
    companyId,
    currency = '',
    onEntryOpen,
    renderExpandedRowOverride,
    partyMode = false,
    onDisplayCurrencyChange,
}: LedgerTabProps) {
    const { t, direction, language } = useLanguage();
    const isRTL = direction === 'rtl';

    // ═══ Multi-language local translator ═══
    const LEDGER_LABELS: Record<string, Record<string, string>> = {
        'Transactions': { ru: 'Транзакции', uk: 'Транзакції', tr: 'İşlemler', de: 'Transaktionen', it: 'Transazioni', ro: 'Tranzacții', pl: 'Transakcje' },
        'Total Debit': { ru: 'Итого дебет', uk: 'Всього дебет', tr: 'Toplam Borç', de: 'Gesamtsoll', it: 'Totale dare', ro: 'Total debit', pl: 'Suma debetów' },
        'Total Credit': { ru: 'Итого кредит', uk: 'Всього кредит', tr: 'Toplam Alacak', de: 'Gesamthaben', it: 'Totale avere', ro: 'Total credit', pl: 'Suma kredytów' },
        'Current Balance': { ru: 'Текущий баланс', uk: 'Поточний баланс', tr: 'Mevcut Bakiye', de: 'Aktueller Saldo', it: 'Saldo attuale', ro: 'Sold curent', pl: 'Bieżące saldo' },
        'Period:': { ru: 'Период:', uk: 'Період:', tr: 'Dönem:', de: 'Zeitraum:', it: 'Periodo:', ro: 'Perioadă:', pl: 'Okres:' },
        'Type': { ru: 'Тип', uk: 'Тип', tr: 'Tür', de: 'Typ', it: 'Tipo', ro: 'Tip', pl: 'Typ' },
        'All': { ru: 'Все', uk: 'Всі', tr: 'Tümü', de: 'Alle', it: 'Tutti', ro: 'Toate', pl: 'Wszystkie' },
        'Debit Only': { ru: 'Только дебет', uk: 'Тільки дебет', tr: 'Sadece Borç', de: 'Nur Soll', it: 'Solo dare', ro: 'Doar debit', pl: 'Tylko debet' },
        'Credit Only': { ru: 'Только кредит', uk: 'Тільки кредит', tr: 'Sadece Alacak', de: 'Nur Haben', it: 'Solo avere', ro: 'Doar credit', pl: 'Tylko kredyt' },
        'Document': { ru: 'Документ', uk: 'Документ', tr: 'Belge', de: 'Dokument', it: 'Documento', ro: 'Document', pl: 'Dokument' },
        '🧾 Invoices': { ru: '🧾 Счета', uk: '🧾 Рахунки', tr: '🧾 Faturalar', de: '🧾 Rechnungen', it: '🧾 Fatture', ro: '🧾 Facturi', pl: '🧾 Faktury' },
        '💰 Payments': { ru: '💰 Платежи', uk: '💰 Платежі', tr: '💰 Ödemeler', de: '💰 Zahlungen', it: '💰 Pagamenti', ro: '💰 Plăți', pl: '💰 Płatności' },
        'Currency': { ru: 'Валюта', uk: 'Валюта', tr: 'Para Birimi', de: 'Währung', it: 'Valuta', ro: 'Monedă', pl: 'Waluta' },
        ' (Account)': { ru: ' (Счёт)', uk: ' (Рахунок)', tr: ' (Hesap)', de: ' (Konto)', it: ' (Conto)', ro: ' (Cont)', pl: ' (Konto)' },
        'Monthly': { ru: 'Помесячно', uk: 'Помісячно', tr: 'Aylık', de: 'Monatlich', it: 'Mensile', ro: 'Lunar', pl: 'Miesięcznie' },
        'On': { ru: 'Вкл', uk: 'Увімк', tr: 'Açık', de: 'Ein', it: 'On', ro: 'Activat', pl: 'Wł.' },
        'Off': { ru: 'Выкл', uk: 'Вимк', tr: 'Kapalı', de: 'Aus', it: 'Off', ro: 'Dezactivat', pl: 'Wył.' },
        'Filters': { ru: 'Фильтры', uk: 'Фільтри', tr: 'Filtreler', de: 'Filter', it: 'Filtri', ro: 'Filtre', pl: 'Filtry' },
        'Clear All': { ru: 'Сбросить', uk: 'Скинути', tr: 'Temizle', de: 'Alle löschen', it: 'Cancella', ro: 'Șterge tot', pl: 'Wyczyść' },
        'Date': { ru: 'Дата', uk: 'Дата', tr: 'Tarih', de: 'Datum', it: 'Data', ro: 'Dată', pl: 'Data' },
        'Ref': { ru: 'Ссылка', uk: 'Посилання', tr: 'Ref', de: 'Ref', it: 'Rif', ro: 'Ref', pl: 'Ref' },
        'Description': { ru: 'Описание', uk: 'Опис', tr: 'Açıklama', de: 'Beschreibung', it: 'Descrizione', ro: 'Descriere', pl: 'Opis' },
        'Counter Acct': { ru: 'Корр. счёт', uk: 'Кор. рахунок', tr: 'Karşı Hesap', de: 'Gegenkonto', it: 'Conto contro', ro: 'Cont coresp.', pl: 'K-to koresp.' },
        'Debit': { ru: 'Дебет', uk: 'Дебет', tr: 'Borç', de: 'Soll', it: 'Dare', ro: 'Debit', pl: 'Debet' },
        'Credit': { ru: 'Кредит', uk: 'Кредит', tr: 'Alacak', de: 'Haben', it: 'Avere', ro: 'Credit', pl: 'Kredyt' },
        'Balance': { ru: 'Баланс', uk: 'Баланс', tr: 'Bakiye', de: 'Saldo', it: 'Saldo', ro: 'Sold', pl: 'Saldo' },
        'Cur': { ru: 'Вал.', uk: 'Вал.', tr: 'PB', de: 'Whr.', it: 'Val.', ro: 'Val.', pl: 'Wal.' },
        'CC': { ru: 'ЦЗ', uk: 'ЦВ', tr: 'MM', de: 'KSt', it: 'CdC', ro: 'CC', pl: 'MPK' },
        'Dr': { ru: 'Д', uk: 'Д', tr: 'B', de: 'S', it: 'D', ro: 'D', pl: 'D' },
        'Cr': { ru: 'K', uk: 'K', tr: 'A', de: 'H', it: 'A', ro: 'C', pl: 'K' },
        'D': { ru: 'Д', uk: 'Д', tr: 'B', de: 'S', it: 'D', ro: 'D', pl: 'D' },
        'C': { ru: 'K', uk: 'K', tr: 'A', de: 'H', it: 'A', ro: 'C', pl: 'K' },
        'Opening:': { ru: 'Начальный:', uk: 'Початковий:', tr: 'Açılış:', de: 'Eröffnung:', it: 'Apertura:', ro: 'Deschidere:', pl: 'Otwarcie:' },
        'Balance:': { ru: 'Баланс:', uk: 'Баланс:', tr: 'Bakiye:', de: 'Saldo:', it: 'Saldo:', ro: 'Sold:', pl: 'Saldo:' },
        'Search description, entry number, or counter account...': { ru: 'Поиск по описанию, номеру записи или корр. счёту...', uk: 'Пошук за описом, номером запису або кор. рахунком...', tr: 'Açıklama, kayıt no veya karşı hesap ara...', de: 'Beschreibung, Buchungsnr. oder Gegenkonto suchen...', it: 'Cerca descrizione, numero registrazione o controconto...', ro: 'Caută descriere, nr. înregistrare sau cont coresp...', pl: 'Szukaj opisu, nr. wpisu lub konta koresp...' },
        'entries': { ru: 'записей', uk: 'записів', tr: 'kayıt', de: 'Einträge', it: 'voci', ro: 'înregistrări', pl: 'wpisów' },
        'Timeline': { ru: 'Хронология', uk: 'Хронологія', tr: 'Zaman Çizelgesi', de: 'Zeitachse', it: 'Cronologia', ro: 'Cronologie', pl: 'Oś czasu' },
        'Grouped': { ru: 'Группировка', uk: 'Групування', tr: 'Gruplandı', de: 'Gruppiert', it: 'Raggruppato', ro: 'Grupat', pl: 'Grupowane' },
        'Chronological': { ru: 'Хронологический', uk: 'Хронологічний', tr: 'Kronolojik', de: 'Chronologisch', it: 'Cronologico', ro: 'Cronologic', pl: 'Chronologicznie' },
        'Group invoices with payments': { ru: 'Группировать счета с платежами', uk: 'Групувати рахунки з платежами', tr: 'Faturaları ödemelerle grupla', de: 'Rechnungen mit Zahlungen gruppieren', it: 'Raggruppa fatture con pagamenti', ro: 'Grupează facturi cu plăți', pl: 'Grupuj faktury z płatnościami' },
        'Multiple': { ru: 'Несколько', uk: 'Декілька', tr: 'Çoklu', de: 'Mehrere', it: 'Multiplo', ro: 'Multiple', pl: 'Wiele' },
    };
    const lt = (ar: string, en: string): string => {
        if (language === 'ar') return ar;
        if (language === 'en') return en;
        const trans = LEDGER_LABELS[en];
        if (trans && trans[language]) return trans[language];
        return en;
    };
    const { supportedCurrencies, baseCurrency: settingsBaseCurrency } = useAccountingSettings();
    const { getRate } = useViewCurrency();
    const queryClient = useQueryClient();

    // Local currency state — starts empty, will be set to account's currency on mount
    const [localCurrency, setLocalCurrency] = useState<string>('');
    const [accountCurrency, setAccountCurrency] = useState<string>('');

    // Counter Account Navigation State
    const [counterAccountIdToView, setCounterAccountIdToView] = useState<string | null>(null);
    const [isCounterSheetOpen, setIsCounterSheetOpen] = useState(false);

    // 🆕 Auto-set to account's own currency from chart_of_accounts
    useEffect(() => {
        if (!accountId) return;
        const fetchAccountCurrency = async () => {
            try {
                const { data: acct } = await supabase
                    .from('chart_of_accounts')
                    .select('currency')
                    .eq('id', accountId)
                    .single();
                const cur = acct?.currency || settingsBaseCurrency || currency || 'USD';
                setAccountCurrency(cur);
                // Only set if not already set by user
                setLocalCurrency(prev => prev || cur);
            } catch {
                const fallback = settingsBaseCurrency || currency || 'USD';
                setAccountCurrency(fallback);
                setLocalCurrency(prev => prev || fallback);
            }
        };
        fetchAccountCurrency();
    }, [accountId, settingsBaseCurrency, currency]);

    // Build lookupCurrentRate using getRate (independent of global selectedCurrency)
    const lookupCurrentRate = useCallback((fromCurrency: string, toCurrency: string): number => {
        return getRate(fromCurrency, toCurrency);
    }, [getRate]);

    const effectiveBaseCurrency = settingsBaseCurrency || currency || 'USD';
    // Convert only when target differs from base
    const effectiveTargetCurrency = localCurrency && localCurrency !== effectiveBaseCurrency ? localCurrency : undefined;

    // ═══ Data Hook ═══
    const {
        entries,
        stats,
        loading,
        error,
        filters,
        setDateFrom,
        setDateTo,
        setCurrency,
        setDatePreset,
        setSearch,
        refetch,
        fetchEntryDetails,
    } = useLedgerData({
        accountId,
        companyId,
        enabled: !!accountId,
        targetCurrency: effectiveTargetCurrency,
        baseCurrency: effectiveBaseCurrency,
        lookupCurrentRate: effectiveTargetCurrency ? lookupCurrentRate : undefined,
    });

    // ═══ Prefetch Party Details (Instant Cache) ═══
    // Pre-fetch the details for ledger row expansion to eliminate the loading delay.
    // We only prefetch the most recent N rows or the current visible ones.
    const activeCurrencyStr = localCurrency || accountCurrency || effectiveBaseCurrency || '';
    useEffect(() => {
        if (!partyMode || entries.length === 0) return;

        // Give the UI a moment to breathe before hitting the network for details,
        // so we don't slow down the initial render of the ledger itself.
        const timerId = setTimeout(() => {
            // Take the first 50 entries to avoid overwhelming the network
            const entriesToPrefetch = entries.slice(0, 50);
            
            entriesToPrefetch.forEach(entry => {
                queryClient.prefetchQuery({
                    queryKey: ['party_doc_details', entry.entryId, entry.referenceId || '', entry.type],
                    queryFn: () => fetchPartyDocDetails(entry, activeCurrencyStr),
                    staleTime: 10 * 60 * 1000,
                });
            });
        }, 800);

        return () => clearTimeout(timerId);
    }, [partyMode, entries, activeCurrencyStr, queryClient]);

    // ═══ Local State ═══
    const [activePreset, setActivePreset] = useState<DatePreset>('all');
    const [movementFilter, setMovementFilter] = useState<MovementFilter>('all');
    const [showMonthlyGroups, setShowMonthlyGroups] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('chronological');
    const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>('all');
    const [invoicePaymentMap, setInvoicePaymentMap] = useState<Map<string, string[]>>(new Map());
    const [markerOverrides, setMarkerOverrides] = useState<Record<string, MarkerColorId | null>>({});

    // ═══ Handle Preset Click ═══
    const handlePresetClick = useCallback((preset: DatePreset) => {
        setActivePreset(preset);
        setDatePreset(preset);
    }, [setDatePreset]);

    // ═══ Build Invoice→Payment Links (for grouped mode) ═══
    useEffect(() => {
        if (!partyMode || viewMode !== 'grouped' || entries.length === 0) return;

        const buildLinks = async () => {
            // Find all payment/receipt entries that have a referenceId
            const paymentEntries = entries.filter(e =>
                (e.type === 'payment' || e.type === 'receipt') && e.referenceId
            );
            if (paymentEntries.length === 0) return;

            // Query cash_transactions to find their reference_id (which links to sales_transactions)
            const paymentRefIds = paymentEntries.map(e => e.referenceId!).filter(Boolean);
            const { data: cashTxns } = await supabase
                .from('cash_transactions')
                .select('id, reference_type, reference_id')
                .in('id', paymentRefIds);

            if (!cashTxns) return;

            // Build map: invoice_id → [payment_entry_ids]
            const map = new Map<string, string[]>();
            for (const ct of cashTxns) {
                if (ct.reference_id && (ct.reference_type?.includes('invoice') || ct.reference_type?.includes('sales'))) {
                    // Find which invoice entry has this reference_id
                    const invoiceEntry = entries.find(e => e.type === 'invoice' && e.referenceId === ct.reference_id);
                    if (invoiceEntry) {
                        const payEntry = paymentEntries.find(e => e.referenceId === ct.id);
                        if (payEntry) {
                            const existing = map.get(invoiceEntry.id) || [];
                            existing.push(payEntry.id);
                            map.set(invoiceEntry.id, existing);
                        }
                    }
                }
            }
            setInvoicePaymentMap(map);
        };

        buildLinks();
    }, [partyMode, viewMode, entries]);

    // ═══ Filter Entries by Movement Type + Entry Type ═══
    const filteredEntries = useMemo(() => {
        let filtered = entries;
        if (movementFilter === 'debit') {
            filtered = filtered.filter(e => e.debit > 0);
        } else if (movementFilter === 'credit') {
            filtered = filtered.filter(e => e.credit > 0);
        }
        // Entry type filter (party mode)
        if (partyMode && entryTypeFilter !== 'all') {
            if (entryTypeFilter === 'invoices') {
                filtered = filtered.filter(e => e.type === 'invoice');
            } else if (entryTypeFilter === 'payments') {
                filtered = filtered.filter(e => e.type === 'payment' || e.type === 'receipt');
            }
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.description?.toLowerCase().includes(term) ||
                e.entryNumber?.toLowerCase().includes(term) ||
                e.counterAccount?.accountNameAr?.toLowerCase().includes(term) ||
                e.counterAccount?.accountNameEn?.toLowerCase().includes(term) ||
                e.counterAccount?.accountCode?.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [entries, movementFilter, entryTypeFilter, partyMode, searchTerm]);

    // ═══ Grouped Entries (invoices with their payments) ═══
    const groupedEntries = useMemo(() => {
        if (!partyMode || viewMode !== 'grouped') return filteredEntries;

        // Collect all payment IDs that are linked to invoices
        const linkedPaymentIds = new Set<string>();
        invoicePaymentMap.forEach(payIds => payIds.forEach(id => linkedPaymentIds.add(id)));

        // Build ordered list: invoice → its payments → next invoice → ...
        const result: ExtendedLedgerEntry[] = [];
        const processedIds = new Set<string>();

        // First pass: invoices with their linked payments
        for (const entry of filteredEntries) {
            if (entry.type === 'invoice' && !processedIds.has(entry.id)) {
                result.push(entry);
                processedIds.add(entry.id);

                // Add linked payments right after the invoice
                const linkedPayIds = invoicePaymentMap.get(entry.id) || [];
                for (const payId of linkedPayIds) {
                    const payEntry = filteredEntries.find(e => e.id === payId);
                    if (payEntry && !processedIds.has(payEntry.id)) {
                        result.push(payEntry);
                        processedIds.add(payEntry.id);
                    }
                }
            }
        }

        // Second pass: unlinked entries (payments not tied to invoices, journal entries, etc.)
        for (const entry of filteredEntries) {
            if (!processedIds.has(entry.id)) {
                result.push(entry);
                processedIds.add(entry.id);
            }
        }

        return result;
    }, [filteredEntries, partyMode, viewMode, invoicePaymentMap]);

    // Use grouped or filtered entries based on mode
    const displayEntries = partyMode && viewMode === 'grouped' ? groupedEntries : filteredEntries;

    // ═══ Monthly Groups ═══
    const monthlyData = useMemo(() => {
        if (!showMonthlyGroups || filteredEntries.length === 0) return null;

        const groups = new Map<string, { debit: number; credit: number; count: number }>();
        filteredEntries.forEach(e => {
            const monthKey = e.date.substring(0, 7); // "2026-02"
            const existing = groups.get(monthKey) || { debit: 0, credit: 0, count: 0 };
            existing.debit += e.debit;
            existing.credit += e.credit;
            existing.count++;
            groups.set(monthKey, existing);
        });
        return groups;
    }, [filteredEntries, showMonthlyGroups]);

    // ═══ Column Definitions ═══
    const dateCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'date',
        header: lt('التاريخ', 'Date'),
        sortKey: 'date',
        sortable: true,
        width: 'w-[85px]',
        cell: (row) => (
            <div className="flex items-center gap-1">
                <span className="text-xs">{ENTRY_TYPE_ICONS[row.type] || '📋'}</span>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                    {row.date}
                </span>
            </div>
        ),
    };

    const referenceCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'reference',
        header: lt('المرجع', 'Ref'),
        width: 'w-[55px]',
        cell: (row) => {
            // Abbreviate long reference: "JE-17713680391085-3873" → "...3873"
            const ref = row.entryNumber || '';
            const short = ref.length > 8 ? '...' + ref.slice(-4) : ref;
            return (
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400" title={ref}>
                    {short}
                </span>
            );
        },
    };

    const descriptionCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'description',
        header: lt('البيان', 'Description'),
        width: 'min-w-[120px]',
        cell: (row) => (
            <p className="text-xs text-gray-800 dark:text-gray-200">
                {row.description || '-'}
            </p>
        ),
    };

    const counterAccountCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'counterAccount',
        header: lt('الحساب المقابل', 'Counter Acct'),
        width: 'w-[220px]',
        cell: (row) => {
            const ca = row.counterAccount;
            if (!ca || ca.otherLinesCount === 0) {
                return <span className="text-xs text-gray-300">-</span>;
            }
            if (ca.otherLinesCount === 1) {
                return (
                    <div 
                        className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-1 -m-1 rounded transition-colors"
                        onClick={() => {
                            if (ca.accountId) {
                                setCounterAccountIdToView(ca.accountId);
                                setIsCounterSheetOpen(true);
                            }
                        }}
                        title={language === 'ar' ? ca.accountNameAr || '' : (ca[`accountName_${language}`] || ca.accountNameEn || ca.accountNameAr || '')}
                    >
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded shrink-0">
                            {ca.accountCode}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[170px]">
                            {language === 'ar' ? ca.accountNameAr : (ca[`accountName_${language}`] || ca.accountNameEn || ca.accountNameAr)}
                        </span>
                    </div>
                );
            }
            return (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-full">
                    {lt('متعددة', 'Multiple')} ({ca.otherLinesCount})
                </span>
            );
        },
    };

    const debitCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'debit',
        header: lt('مدين', 'Debit'),
        align: 'end',
        width: 'w-[85px]',
        sortKey: 'debit',
        sortable: true,
        cell: (row) => (
            row.debit > 0 ? (
                <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatNumber(row.debit)}
                </span>
            ) : (
                <span className="text-gray-300 dark:text-gray-600">-</span>
            )
        ),
    };

    const creditCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'credit',
        header: lt('دائن', 'Credit'),
        align: 'end',
        width: 'w-[85px]',
        sortKey: 'credit',
        sortable: true,
        cell: (row) => (
            row.credit > 0 ? (
                <span className="font-mono text-sm font-medium text-red-500 dark:text-red-400">
                    {formatNumber(row.credit)}
                </span>
            ) : (
                <span className="text-gray-300 dark:text-gray-600">-</span>
            )
        ),
    };

    const balanceCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'balance',
        header: lt('الرصيد', 'Balance'),
        align: 'end',
        width: 'w-[90px]',
        cell: (row) => {
            const isPositive = row.balance >= 0;
            return (
                <span className={cn(
                    "font-mono text-sm font-bold",
                    isPositive
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                )}>
                    {formatNumber(Math.abs(row.balance))}
                    <span className="text-[9px] ms-0.5 opacity-60">
                        {isPositive ? (lt('م', 'D')) : (lt('د', 'C'))}
                    </span>
                </span>
            );
        },
    };

    const currencyCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'currency',
        header: lt('العملة', 'Cur'),
        align: 'center',
        width: 'w-[50px]',
        cell: (row) => (
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                {row.currency || '-'}
            </span>
        ),
    };

    const costCenterCol: NexaListColumn<ExtendedLedgerEntry> = {
        id: 'costCenter',
        header: lt('م.التكلفة', 'CC'),
        width: 'w-[70px]',
        cell: (row) => (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {row.costCenterName || '-'}
            </span>
        ),
    };

    // ═══ Columns — SAME order for all languages ═══
    // The table's dir="rtl"/"ltr" handles visual direction automatically
    // Order: Debit | Credit | Balance | Date | Ref | Description | Counter Acct | Currency
    const columns: NexaListColumn<ExtendedLedgerEntry>[] = useMemo(() =>
        [debitCol, creditCol, balanceCol, dateCol, referenceCol, descriptionCol, counterAccountCol, currencyCol],
        [isRTL]);

    // ═══ Row Accent (entry type color) ═══
    const getRowAccent = useCallback((row: ExtendedLedgerEntry) => {
        switch (row.type) {
            case 'receipt': return 'border-s-emerald-400';
            case 'payment': return 'border-s-red-400';
            case 'invoice': return 'border-s-amber-400';
            case 'transfer': return 'border-s-blue-400';
            case 'cash': return 'border-s-teal-400';
            default: return 'border-s-gray-300 dark:border-s-gray-600';
        }
    }, []);

    // ═══ Filters for NexaListTable ═══
    const nexaFilters = useMemo(() => {
        const f: any[] = [];

        // Movement filter
        f.push({
            id: 'movement',
            label: lt('النوع', 'Type'),
            type: 'select' as const,
            value: movementFilter,
            onChange: (v: string) => setMovementFilter(v as MovementFilter),
            options: [
                { value: 'all', label: lt('الكل', 'All') },
                { value: 'debit', label: lt('مدين فقط', 'Debit Only') },
                { value: 'credit', label: lt('دائن فقط', 'Credit Only') },
            ],
        });

        // Entry type filter (Party mode only)
        if (partyMode) {
            f.push({
                id: 'entryType',
                label: lt('المستند', 'Document'),
                type: 'select' as const,
                value: entryTypeFilter,
                onChange: (v: string) => setEntryTypeFilter(v as EntryTypeFilter),
                options: [
                    { value: 'all', label: lt('الكل', 'All') },
                    { value: 'invoices', label: lt('🧾 فواتير فقط', '🧾 Invoices') },
                    { value: 'payments', label: lt('💰 دفعات فقط', '💰 Payments') },
                ],
            });
        }

        // Currency filter — shows company supported currencies + account base currency
        {
            // Build unique currency options: account currency + base + supported
            const currencyOptions = new Set<string>();
            if (accountCurrency) currencyOptions.add(accountCurrency);
            if (effectiveBaseCurrency) currencyOptions.add(effectiveBaseCurrency);
            supportedCurrencies.forEach((c: string) => currencyOptions.add(c));

            if (currencyOptions.size > 0) {
                f.push({
                    id: 'currency',
                    label: lt('العملة', 'Currency'),
                    type: 'select' as const,
                    value: localCurrency || accountCurrency || effectiveBaseCurrency,
                    onChange: (v: string) => {
                        setLocalCurrency(v);
                        onDisplayCurrencyChange?.(v);
                        setCurrency(v);
                    },
                    options: [...currencyOptions].map(c => ({
                        value: c,
                        label: c + (c === accountCurrency ? (lt(' (الحساب)', ' (Account)')) : ''),
                    })),
                });
            }
        }

        // Monthly groups toggle
        f.push({
            id: 'monthlyGroup',
            label: lt('تجميع شهري', 'Monthly'),
            type: 'select' as const,
            value: showMonthlyGroups ? 'on' : 'off',
            onChange: (v: string) => setShowMonthlyGroups(v === 'on'),
            options: [
                { value: 'on', label: lt('مُفعّل', 'On') },
                { value: 'off', label: lt('مُعطّل', 'Off') },
            ],
        });

        return f;
    }, [isRTL, movementFilter, showMonthlyGroups, partyMode, entryTypeFilter, supportedCurrencies, localCurrency, accountCurrency, effectiveBaseCurrency]);

    // Active display currency
    const activeCurrency = localCurrency || accountCurrency || effectiveBaseCurrency;

    // ═══ Footer Content ═══
    const footerRight = useMemo(() => {
        if (!stats) return null;
        return (
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <span className="text-gray-400">{lt('افتتاحي:', 'Opening:')}</span>
                    <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">
                        {formatNumber(stats.openingBalance)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(stats.totalDebit)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    <span className="font-mono font-semibold text-red-500 dark:text-red-400">
                        {formatNumber(stats.totalCredit)}
                    </span>
                </div>
                <span className="text-gray-200 dark:text-gray-700">|</span>
                <div className="flex items-center gap-1">
                    <span className="text-gray-400">{lt('الرصيد:', 'Balance:')}</span>
                    <span className={cn(
                        "font-mono font-bold",
                        stats.currentBalance >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                    )}>
                        {formatNumber(Math.abs(stats.currentBalance))}
                        <span className="text-[10px] ms-0.5 opacity-60">
                            {stats.currentBalance >= 0 ? (lt('م', 'D')) : (lt('د', 'C'))}
                        </span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded">
                        {activeCurrency}
                    </span>
                </div>
            </div>
        );
    }, [stats, isRTL, activeCurrency]);

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto">
            {/* ═══ Summary Cards ═══ */}
            {stats && (
                <div className="grid grid-cols-4 gap-3">
                    <SummaryCard
                        label={lt('عدد الحركات', 'Transactions')}
                        value={stats.transactionCount.toString()}
                        icon={<Layers className="w-4 h-4" />}
                        color="indigo"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={lt('مجموع المدين', 'Total Debit')}
                        value={formatNumber(stats.totalDebit)}
                        icon={<TrendingUp className="w-4 h-4" />}
                        color="emerald"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={lt('مجموع الدائن', 'Total Credit')}
                        value={formatNumber(stats.totalCredit)}
                        icon={<TrendingDown className="w-4 h-4" />}
                        color="red"
                        isRTL={isRTL}
                    />
                    <SummaryCard
                        label={lt('الرصيد الحالي', 'Current Balance')}
                        value={formatNumber(Math.abs(stats.currentBalance))}
                        suffix={`${stats.currentBalance >= 0 ? (lt('مدين', 'Dr')) : (lt('دائن', 'Cr'))} ${activeCurrency}`}
                        icon={<Minus className="w-4 h-4" />}
                        color={stats.currentBalance >= 0 ? 'emerald' : 'red'}
                        isRTL={isRTL}
                    />
                </div>
            )}

            {/* ═══ Quick Date Presets + View Mode Toggle ═══ */}
            <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {lt('الفترة:', 'Period:')}
                </span>
                {DATE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => handlePresetClick(preset.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            activePreset === preset.id
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700'
                        )}
                    >
                        {preset.icon}
                        {language === 'ar' ? preset.label_ar : (preset.labels?.[language] || preset.label_en)}
                    </button>
                ))}

                {/* ═══ View Mode Toggle (Party mode only) ═══ */}
                {partyMode && (
                    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ms-2">
                        <button
                            onClick={() => setViewMode('chronological')}
                            title={lt('عرض زمني', 'Chronological')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'chronological'
                                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            <ListOrdered className="w-3.5 h-3.5" />
                            {lt('زمني', 'Timeline')}
                        </button>
                        <button
                            onClick={() => setViewMode('grouped')}
                            title={lt('تجميع الفواتير مع دفعاتها', 'Group invoices with payments')}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'grouped'
                                    ? 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            {lt('تجميع', 'Grouped')}
                        </button>
                    </div>
                )}

                {/* Manual dates */}
                <div className="flex items-center gap-1.5 ms-auto">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setActivePreset('all'); // custom = no preset active
                        }}
                        className="h-7 px-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-400"
                    />
                    <span className="text-[10px] text-gray-300">→</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            setActivePreset('all');
                        }}
                        className="h-7 px-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
            </div>

            {/* ═══ Error ═══ */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}

            {/* ═══ NexaListTable ═══ */}
            <NexaListTable<ExtendedLedgerEntry>
                data={displayEntries}
                columns={columns}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder={lt('بحث في البيان أو رقم القيد أو الحساب المقابل...', 'Search description, entry number, or counter account...')}
                totalCount={entries.length}
                countLabel={lt('حركة', 'entries')}
                filters={nexaFilters}
                hasActiveFilters={movementFilter !== 'all' || !showMonthlyGroups || (localCurrency !== accountCurrency && localCurrency !== '') || (partyMode && viewMode !== 'chronological') || (partyMode && entryTypeFilter !== 'all')}
                onClearFilters={() => {
                    setMovementFilter('all');
                    setShowMonthlyGroups(true);
                    setViewMode('chronological');
                    setEntryTypeFilter('all');
                    setLocalCurrency(accountCurrency || effectiveBaseCurrency);
                    setCurrency(accountCurrency || effectiveBaseCurrency);
                }}
                filtersLabel={lt('فلاتر', 'Filters')}
                clearFiltersLabel={lt('مسح الفلاتر', 'Clear All')}
                getRowAccent={getRowAccent}
                getRowKey={(row) => row.id}
                showRowNumbers={true}
                isLoading={loading}
                isRTL={isRTL}
                direction={direction}
                showFooter={true}
                footerLeftText={(() => {
                    const footerTexts: Record<string, string> = {
                        ar: `\u0639\u0631\u0636 ${displayEntries.length} \u0645\u0646 ${entries.length} \u062d\u0631\u0643\u0629`,
                        en: `Showing ${displayEntries.length} of ${entries.length} entries`,
                        ru: `\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e ${displayEntries.length} \u0438\u0437 ${entries.length} \u0437\u0430\u043f\u0438\u0441\u0435\u0439`,
                        uk: `\u041f\u043e\u043a\u0430\u0437\u0430\u043d\u043e ${displayEntries.length} \u0437 ${entries.length} \u0437\u0430\u043f\u0438\u0441\u0456\u0432`,
                        tr: `${entries.length} kay\u0131ttan ${displayEntries.length} g\u00f6steriliyor`,
                        de: `${displayEntries.length} von ${entries.length} Eintr\u00e4gen`,
                        it: `${displayEntries.length} di ${entries.length} voci`,
                        ro: `${displayEntries.length} din ${entries.length} \u00eenregistr\u0103ri`,
                        pl: `${displayEntries.length} z ${entries.length} wpis\u00f3w`,
                    };
                    return footerTexts[language] || footerTexts.en;
                })()}
                footerRightContent={footerRight}
                // Expandable rows
                renderExpandedRow={(row) => (
                    renderExpandedRowOverride ? renderExpandedRowOverride(row) : (
                        <LedgerExpandedRow
                            entry={row}
                            currency={currency}
                            fetchEntryDetails={fetchEntryDetails}
                            onOpenEntry={onEntryOpen}
                        />
                    )
                )}
                // Marker — persisted to DB (journal_entry_lines.marker_color)
                enableMarker={true}
                onMarkerChange={handleMarkerSave}
                getRowMarker={getRowMarker}
                className="min-h-[400px]"
            />

            {/* Counter Account Details Sheet */}
            {isCounterSheetOpen && counterAccountIdToView && (
                <Suspense fallback={null}>
                    <UnifiedAccountingSheet
                        isOpen={isCounterSheetOpen}
                        onClose={() => {
                            setIsCounterSheetOpen(false);
                            setCounterAccountIdToView(null);
                        }}
                        docType="account"
                        mode="view"
                        documentId={counterAccountIdToView}
                        companyId={companyId}
                        enableEditFlow={false}
                    />
                </Suspense>
            )}
        </div>
    );


    // Save to DB in background — NO refetch, NO loading flash
    async function handleMarkerSave(rowKey: string, color: MarkerColorId | null) {
        // 1. Instant local update
        setMarkerOverrides(prev => ({ ...prev, [rowKey]: color }));
        // 2. Silent DB save in background
        try {
            await supabase
                .from('journal_entry_lines')
                .update({ marker_color: color })
                .eq('id', rowKey);
        } catch (err) {
            console.error('[LedgerTab] Error saving marker:', err);
            // Revert on error
            setMarkerOverrides(prev => {
                const next = { ...prev };
                delete next[rowKey];
                return next;
            });
        }
    }

    // Read color: local override first, then DB value
    function getRowMarker(row: ExtendedLedgerEntry): MarkerColorId | null {
        // Check local override first (instant)
        if (row.id in markerOverrides) {
            return markerOverrides[row.id];
        }
        // Fall back to DB-loaded value
        return (row.markerColor as MarkerColorId) || null;
    }
}

// ═══════════════════════════════════════════
// Summary Card Component
// ═══════════════════════════════════════════

function SummaryCard({
    label,
    value,
    suffix,
    icon,
    color,
    isRTL,
}: {
    label: string;
    value: string;
    suffix?: string;
    icon: React.ReactNode;
    color: 'indigo' | 'emerald' | 'red' | 'amber';
    isRTL: boolean;
}) {
    const colorMap = {
        indigo: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 text-indigo-600 dark:text-indigo-400',
        emerald: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-400',
        red: 'from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/10 text-red-600 dark:text-red-400',
        amber: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className={cn(
            "bg-gradient-to-br rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-800",
            colorMap[color]
        )}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono">{value}</span>
                {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
            </div>
        </div>
    );
}

export default LedgerTab;

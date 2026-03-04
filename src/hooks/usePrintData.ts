/**
 * ════════════════════════════════════════════════════════════════
 * 🖨️ usePrintData Hook
 * ════════════════════════════════════════════════════════════════
 * 
 * Bridges real app data → template-ready format
 * 
 * Usage:
 *   const { printData, templates, print, loading } = usePrintData({
 *     docType: 'sales_invoice',
 *     docId: invoiceId,
 *   });
 * 
 * @module hooks/usePrintData
 */

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/hooks/useCompany';
import { useLanguage } from '@/app/providers/LanguageProvider';
import printService, {
    type PrintTemplate,
    type PrintOptions,
    type CompanyPrintSettings,
    getPrintLanguage,
} from '@/services/printService';
import { getCountryTaxConfig } from '@/config/countryTaxConfig';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────

interface UsePrintDataProps {
    docType: string;     // 'sales_invoice' | 'purchase_invoice' | 'receipt_voucher' | etc.
    docId?: string;      // Document ID to load
    docData?: any;       // Or pass data directly (skip loading)
}

interface UsePrintDataReturn {
    // State
    loading: boolean;
    error: string | null;

    // Data
    printData: Record<string, any> | null;
    templates: PrintTemplate[];
    defaultTemplate: PrintTemplate | null;
    printSettings: CompanyPrintSettings | null;

    // Actions
    print: (templateId: string, options?: Partial<PrintOptions>) => Promise<void>;
    preview: (templateId: string, options?: Partial<PrintOptions>, lang?: string) => Promise<string>;
    changePrintLanguage: (lang: string) => void;

    // Config
    printLanguage: string;
    countryCode: string;
    availableLanguages: { code: string; name: string }[];
}

// ─── Default Print Options ──────────────────────────────────────
const DEFAULT_OPTIONS: PrintOptions = {
    includeQR: true,
    includeHeader: true,
    includeFooter: true,
    includeStamp: false,
    includeSignature: false,
    copies: 1,
};

// ─── Available Print Languages ──────────────────────────────────
const PRINT_LANGUAGES = [
    { code: 'ar', name: 'العربية' },
    { code: 'en', name: 'English' },
    { code: 'uk', name: 'Українська' },
    { code: 'ru', name: 'Русский' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pl', name: 'Polski' },
    { code: 'ro', name: 'Română' },
];

// ═══════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════

export function usePrintData({ docType, docId, docData }: UsePrintDataProps): UsePrintDataReturn {
    const { company, companyId } = useCompany();
    const tenantId = (company as any)?.tenant_id || null;
    const { language } = useLanguage();

    const countryCode = company?.country_code || 'SA';
    const [printLanguage, setPrintLanguage] = useState(getPrintLanguage(countryCode));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [printData, setPrintData] = useState<Record<string, any> | null>(null);
    const [templates, setTemplates] = useState<PrintTemplate[]>([]);
    const [defaultTemplate, setDefaultTemplate] = useState<PrintTemplate | null>(null);
    const [printSettings, setPrintSettings] = useState<CompanyPrintSettings | null>(null);

    // ─── Load Templates + Settings ────────────────────────────────
    useEffect(() => {
        if (!companyId) return;

        const load = async () => {
            try {
                const [tpls, settings] = await Promise.all([
                    printService.getTemplates(docType, tenantId || undefined),
                    printService.getCompanyPrintSettings(companyId),
                ]);
                setTemplates(tpls);
                setPrintSettings(settings);

                const def = tpls.find(t => t.is_default) || tpls[0] || null;
                setDefaultTemplate(def);
            } catch (err: any) {
                console.error('[usePrintData] Load templates error:', err);
                setError(err.message);
            }
        };

        load();
    }, [docType, companyId, tenantId]);

    // ─── Load Document Data ───────────────────────────────────────
    useEffect(() => {
        if (docData) {
            // Data passed directly — just map it
            setPrintData(mapDocData(docType, docData, company, printSettings));
            return;
        }

        if (!docId || !companyId) return;

        const loadDoc = async () => {
            setLoading(true);
            setError(null);
            try {
                const rawData = await fetchDocumentData(docType, docId);
                if (!rawData) {
                    console.warn('[usePrintData] No data returned for', docType, docId);
                    setPrintData(null);
                    return;
                }
                setPrintData(mapDocData(docType, rawData, company, printSettings));
            } catch (err: any) {
                console.error('[usePrintData] Load document error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadDoc();
    }, [docId, docData, docType, companyId, company, printSettings]);

    // ─── Print Action ─────────────────────────────────────────────
    const print = useCallback(async (templateId: string, options?: Partial<PrintOptions>) => {
        if (!printData) throw new Error('No data to print');

        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        if (printSettings?.show_qr_by_default !== undefined) {
            mergedOptions.includeQR = printSettings.show_qr_by_default;
        }

        await printService.print(templateId, printData, countryCode, mergedOptions, printLanguage);
    }, [printData, countryCode, printLanguage, printSettings]);

    // ─── Preview Action ───────────────────────────────────────────
    const preview = useCallback(async (templateId: string, options?: Partial<PrintOptions>, lang?: string) => {
        if (!printData) throw new Error('No data to preview');

        const template = templates.find(t => t.id === templateId) || defaultTemplate;
        if (!template) throw new Error('Template not found');

        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        return printService.generatePreview(template, printData, countryCode, mergedOptions, lang || printLanguage);
    }, [printData, templates, defaultTemplate, countryCode, printLanguage]);

    // ─── Change Print Language ────────────────────────────────────
    const changePrintLanguage = useCallback((lang: string) => {
        setPrintLanguage(lang);
    }, []);

    return {
        loading,
        error,
        printData,
        templates,
        defaultTemplate,
        printSettings,
        print,
        preview,
        changePrintLanguage,
        printLanguage,
        countryCode,
        availableLanguages: PRINT_LANGUAGES,
    };
}

// ═══════════════════════════════════════════════════════════════
// Data Fetchers — Load raw document data from Supabase
// ═══════════════════════════════════════════════════════════════

async function fetchDocumentData(docType: string, docId: string): Promise<any> {
    switch (docType) {
        case 'sales_invoice':
            return fetchSalesInvoice(docId);
        case 'purchase_invoice':
            return fetchPurchaseInvoice(docId);
        case 'receipt_voucher':
        case 'payment_voucher':
            return fetchVoucher(docType, docId);
        case 'journal_entry':
            return fetchJournalEntry(docId);
        case 'account_statement':
            return { id: docId }; // Statement data loaded separately
        case 'roll_label':
            return fetchRollData(docId);
        case 'container_label':
            return fetchContainerData(docId);
        default:
            return { id: docId };
    }
}

async function fetchSalesInvoice(id: string): Promise<any> {
    // Strategy: progressive fallback for maximum resilience

    // 1. Try full join query (fastest if FK relations resolve)
    try {
        const { data, error } = await supabase
            .from('sales_transactions')
            .select('*, customer:customers!customer_id(id, name_ar, name_en, phone, address, tax_number), items:sales_transaction_items!transaction_id(*)')
            .eq('id', id)
            .maybeSingle();
        if (!error && data) return data;
    } catch { /* fall through */ }

    // 2. Fetch transaction alone, then items + customer separately
    try {
        const { data, error } = await supabase
            .from('sales_transactions')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!error && data) {
            let items: any[] = [];
            try {
                const { data: itemsData } = await supabase
                    .from('sales_transaction_items')
                    .select('*')
                    .eq('transaction_id', id)
                    .order('line_number');
                items = itemsData || [];
            } catch { /* no items */ }

            let customer = null;
            if (data.customer_id) {
                try {
                    const { data: custData } = await supabase
                        .from('customers')
                        .select('id, name_ar, name_en, phone, address, tax_number')
                        .eq('id', data.customer_id)
                        .maybeSingle();
                    customer = custData;
                } catch { /* no customer */ }
            }

            return { ...data, customer, items };
        }
    } catch { /* fall through */ }

    console.warn('[usePrintData] Failed to fetch sales transaction:', id);
    return null;
}


async function fetchPurchaseInvoice(id: string): Promise<any> {
    // جلب من purchase_transactions أولاً (الجدول الموحد)
    try {
        const { data, error } = await supabase
            .from('purchase_transactions')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (!error && data) return data;
    } catch { /* fall through */ }

    // جلب من purchase_invoices (الجدول القديم)
    try {
        const { data, error } = await supabase
            .from('purchase_invoices')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (!error && data) return data;
    } catch { /* fall through */ }

    console.warn('[usePrintData] fetchPurchaseInvoice: not found in either table:', id);
    return null;
}

async function fetchVoucher(type: string, id: string): Promise<any> {
    const table = type === 'receipt_voucher' ? 'receipt_vouchers' : 'payment_vouchers';
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchJournalEntry(id: string): Promise<any> {
    const { data, error } = await supabase
        .from('journal_entries')
        .select('*, lines:journal_entry_lines(*, account:chart_of_accounts(*))')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function fetchRollData(id: string): Promise<any> {
    const { data, error } = await supabase
        .from('fabric_rolls')
        .select(`
            *,
            material:fabric_materials(*),
            container:containers(container_number, container_name, supplier_id),
            color:fabric_colors(name_ar, name_en)
        `)
        .eq('id', id)
        .single();
    if (error) throw error;

    // Fetch supplier if container has one
    let supplierName = '';
    if (data?.container?.supplier_id) {
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('name_ar, name_en, name')
            .eq('id', data.container.supplier_id)
            .single();
        supplierName = supplier?.name_ar || supplier?.name_en || supplier?.name || '';
    }

    return { ...data, _supplierName: supplierName };
}

async function fetchContainerData(id: string): Promise<any> {
    // جلب بيانات الكونتينر بدون join (PostgREST لا يجد العلاقة مع suppliers)
    const { data, error } = await supabase
        .from('containers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    // جلب اسم المورد منفصلاً إذا كان موجوداً
    let supplier = null;
    if (data.supplier_id) {
        try {
            const { data: sup } = await supabase
                .from('suppliers')
                .select('name_ar, name_en, name')
                .eq('id', data.supplier_id)
                .maybeSingle();
            supplier = sup;
        } catch { /* تجاهل أخطاء المورد */ }
    }

    // جلب عدد البنود منفصلاً
    let itemsCount = 0;
    try {
        const { count } = await supabase
            .from('container_items')
            .select('id', { count: 'exact', head: true })
            .eq('container_id', id);
        itemsCount = count || 0;
    } catch { /* تجاهل */ }

    return { ...data, supplier, items: [{ count: itemsCount }] };
}

// ═══════════════════════════════════════════════════════════════
// Data Mapper — Transform DB structure → Template variables
// ═══════════════════════════════════════════════════════════════

function mapDocData(
    docType: string,
    rawData: any,
    company: any,
    printSettings: CompanyPrintSettings | null
): Record<string, any> {
    const countryConfig = getCountryTaxConfig(company?.country_code || 'SA');

    // Base data (available in ALL templates)
    const base: Record<string, any> = {
        id: rawData?.id,
        company: {
            name: printSettings?.header_company_name_ar || company?.name_ar || company?.name || '',
            name_ar: printSettings?.header_company_name_ar || company?.name_ar || '',
            name_en: printSettings?.header_company_name_en || company?.name_en || company?.name || '',
            address: printSettings?.header_address_ar || company?.address || '',
            address_ar: printSettings?.header_address_ar || '',
            address_en: printSettings?.header_address_en || '',
            phone: printSettings?.header_phone || company?.phone || '',
            email: printSettings?.header_email || company?.email || '',
            website: printSettings?.header_website || '',
            tax_id: printSettings?.header_tax_number || company?.tax_number || '',
            commercial_reg: printSettings?.header_commercial_reg || company?.commercial_register || '',
            logo: printSettings?.logo_url || '',
        },
        system: {
            date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            currency: countryConfig?.currency || company?.default_currency || '',
            currency_symbol: countryConfig?.currencySymbol || '',
        },
        _printSettings: printSettings,
        footer_text: printSettings?.footer_text_ar || '',
        footer_terms: printSettings?.footer_terms_ar || '',
    };

    // Document-specific mapping
    switch (docType) {
        case 'sales_invoice':
            return {
                ...base,
                customer: {
                    name: rawData.customer?.name_ar || rawData.customer?.name || '',
                    name_ar: rawData.customer?.name_ar || '',
                    name_en: rawData.customer?.name_en || '',
                    phone: rawData.customer?.phone || '',
                    address: rawData.customer?.address || '',
                    tax_id: rawData.customer?.tax_number || '',
                },
                invoice: {
                    number: rawData.invoice_number || rawData.number || '',
                    date: rawData.invoice_date || rawData.date || '',
                    due_date: rawData.due_date || '',
                    supply_date: rawData.supply_date || rawData.invoice_date || '',
                    subtotal: rawData.subtotal || 0,
                    discount: rawData.discount_amount || rawData.discount || 0,
                    tax_amount: rawData.tax_amount || rawData.vat_amount || 0,
                    total: rawData.total_amount || rawData.total || 0,
                    paid: rawData.paid_amount || 0,
                    balance: rawData.balance || (rawData.total_amount || 0) - (rawData.paid_amount || 0),
                    currency: rawData.currency || base.system.currency,
                    payment_terms: rawData.payment_terms || '',
                    notes: rawData.notes || '',
                    items: (rawData.items || []).map((item: any) => ({
                        name_ar: item.material_name_ar || item.description || '',
                        name_en: item.material_name_en || item.description_en || '',
                        description: item.description || '',
                        quantity: item.quantity || 0,
                        unit: item.unit || item.uom || '',
                        unit_price: item.unit_price || item.price || 0,
                        discount: item.discount || 0,
                        tax_rate: item.tax_rate || item.vat_rate || 0,
                        tax_amount: item.tax_amount || 0,
                        line_total: item.line_total || item.total || 0,
                    })),
                },
            };

        case 'purchase_invoice':
            return {
                ...base,
                supplier: {
                    name: rawData.supplier?.name_ar || rawData.supplier?.name || '',
                    name_ar: rawData.supplier?.name_ar || '',
                    name_en: rawData.supplier?.name_en || '',
                    phone: rawData.supplier?.phone || '',
                    address: rawData.supplier?.address || '',
                    tax_id: rawData.supplier?.tax_number || '',
                },
                invoice: {
                    number: rawData.invoice_number || rawData.number || '',
                    date: rawData.invoice_date || rawData.date || '',
                    due_date: rawData.due_date || '',
                    subtotal: rawData.subtotal || 0,
                    discount: rawData.discount_amount || 0,
                    tax_amount: rawData.tax_amount || 0,
                    total: rawData.total_amount || rawData.total || 0,
                    currency: rawData.currency || base.system.currency,
                    notes: rawData.notes || '',
                    items: (rawData.items || []).map((item: any) => ({
                        name_ar: item.material_name_ar || item.description || '',
                        name_en: item.material_name_en || '',
                        description: item.description || '',
                        quantity: item.quantity || 0,
                        unit: item.unit || '',
                        unit_price: item.unit_price || 0,
                        discount: item.discount || 0,
                        tax_rate: item.tax_rate || 0,
                        tax_amount: item.tax_amount || 0,
                        line_total: item.line_total || 0,
                    })),
                },
            };

        case 'receipt_voucher':
        case 'payment_voucher':
            return {
                ...base,
                party: {
                    name: rawData.party_name || rawData.customer_name || rawData.supplier_name || '',
                    name_ar: rawData.party_name_ar || rawData.party_name || '',
                    name_en: rawData.party_name_en || '',
                },
                voucher: {
                    number: rawData.voucher_number || rawData.number || '',
                    date: rawData.voucher_date || rawData.date || '',
                    amount: rawData.amount || 0,
                    amount_words: rawData.amount_words || '',
                    currency: rawData.currency || base.system.currency,
                    description: rawData.description || rawData.memo || '',
                    payment_method: rawData.payment_method || '',
                },
            };

        case 'journal_entry':
            return {
                ...base,
                entry: {
                    number: rawData.entry_number || rawData.number || '',
                    date: rawData.entry_date || rawData.date || '',
                    description: rawData.description || rawData.memo || '',
                    total_debit: rawData.total_debit || (rawData.lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0),
                    total_credit: rawData.total_credit || (rawData.lines || []).reduce((s: number, l: any) => s + (l.credit || 0), 0),
                    lines: (rawData.lines || []).map((line: any) => ({
                        account_code: line.account?.code || line.account_code || '',
                        account_name: line.account?.name || line.account_name || '',
                        name_ar: line.account?.name_ar || line.account?.name || '',
                        name_en: line.account?.name_en || '',
                        description: line.description || line.memo || '',
                        debit: line.debit || line.debit_amount || 0,
                        credit: line.credit || line.credit_amount || 0,
                    })),
                },
            };

        case 'roll_label':
            return {
                ...base,
                roll: {
                    number: rawData.roll_number || '',
                    material_name: rawData.material?.name_ar || rawData.material?.name_en || '',
                    material_code: rawData.material?.code || '',
                    color: rawData.color_name || rawData.color?.name_ar || rawData.color?.name_en || '',
                    width: rawData.width || rawData.material?.default_width || '',
                    weight: rawData.weight || rawData.material?.weight_per_meter || '',
                    length: rawData.current_length || rawData.initial_length || '',
                    unit: rawData.material?.unit || rawData.material?.primary_uom || 'm',
                    composition: rawData.material?.composition || '',
                    container_no: rawData.container?.container_number || '',
                    invoice_no: '', // Not directly on roll
                    supplier_name: rawData._supplierName || '',
                    receipt_date: rawData.receipt_date || '',
                    warehouse: '', // Resolved later if needed
                    batch_no: rawData.batch_id || '',
                    cost_per_unit: rawData.cost_per_meter || rawData.supplier_unit_cost || '',
                    barcode: rawData.barcode || rawData.roll_number || '',
                },
            };

        case 'container_label':
            return {
                ...base,
                container: {
                    number: rawData.container_number || rawData.shipment_number || '',
                    name: rawData.container_name || '',
                    supplier: rawData.supplier?.name_ar || rawData.supplier?.name_en || rawData.supplier?.name || '',
                    origin: rawData.origin_country || '',
                    vessel: rawData.vessel_name || '',
                    bol: rawData.bill_of_lading || '',
                    departure_date: rawData.departure_date || rawData.shipping_date || '',
                    arrival_date: rawData.arrival_date || rawData.actual_arrival_date || '',
                    items_count: rawData.total_expected_items || rawData.items?.length || 0,
                    total_value: rawData.total_purchase_value || rawData.total_cost || 0,
                    status: rawData.status || '',
                    warehouse: '', // Resolved later
                    size: rawData.container_size || rawData.container_type || '',
                },
            };

        default:
            return { ...base, ...rawData };
    }
}

export default usePrintData;

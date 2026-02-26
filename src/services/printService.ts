/**
 * ════════════════════════════════════════════════════════════════
 * 🖨️ Print Service v3.0
 * ════════════════════════════════════════════════════════════════
 * 
 * Rules:
 * 1. Template language = company country language (NOT user UI)
 * 2. Tax = from company_accounting_settings (NOT hardcoded)
 * 3. QR Code = enabled by default for ALL document types
 * 4. Language Fallback: country_lang → en → ar → code
 * 
 * @module services/printService
 */

import { supabase } from '@/lib/supabase';
import { getCountryTaxConfig } from '@/config/countryTaxConfig';
import QRCode from 'qrcode';

// ─── Types ──────────────────────────────────────────────────────
export interface PrintTemplate {
  id: string;
  tenant_id: string | null;
  company_id: string | null;
  doc_type: string;
  category: string;
  name_ar: string;
  name_en: string | null;
  description_ar?: string;
  description_en?: string;
  template_html: string;
  template_css: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  variables: TemplateVariable[];
  paper_size: string;
  orientation: string;
  margins: { top: number; right: number; bottom: number; left: number };
  custom_width?: number;
  custom_height?: number;
  include_qr: boolean;
  include_header: boolean;
  include_footer: boolean;
  include_logo: boolean;
  include_stamp: boolean;
  include_signature: boolean;
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  label_ar: string;
  label_en: string;
  type: 'text' | 'number' | 'date' | 'image' | 'table' | 'system';
  group: 'company' | 'party' | 'document' | 'items' | 'totals' | 'country' | 'system';
}

export interface PrintOptions {
  includeQR: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
  includeStamp: boolean;
  includeSignature: boolean;
  copies: number;
  printLanguage?: string; // Override: if not set, uses country default
}

export interface RenderResult {
  html: string;
  css: string;
}

// ─── Variable Documentation (for template editor help panel) ────
export interface VariableDoc {
  key: string;
  label_ar: string;
  label_en: string;
  description_ar: string;
  description_en: string;
  example: string;
  group: string;
  availableIn: string[]; // doc_types where this variable is available
}

export const VARIABLE_DOCS: VariableDoc[] = [
  // Company variables
  { key: '{{company.name}}', label_ar: 'اسم الشركة', label_en: 'Company Name', description_ar: 'يظهر بلغة الدولة تلقائياً. إذا لم يكن متوفراً يظهر بالإنجليزية ثم العربية', description_en: 'Auto-selects language based on country. Falls back to EN then AR', example: 'شركة الأقمشة الذهبية', group: 'company', availableIn: ['all'] },
  { key: '{{company.address}}', label_ar: 'عنوان الشركة', label_en: 'Company Address', description_ar: 'العنوان الكامل من إعدادات الشركة', description_en: 'Full address from company settings', example: 'الرياض، حي الملز، شارع الأمير', group: 'company', availableIn: ['all'] },
  { key: '{{company.phone}}', label_ar: 'هاتف الشركة', label_en: 'Company Phone', description_ar: 'رقم الهاتف من إعدادات الشركة', description_en: 'Phone from company settings', example: '+966 50 123 4567', group: 'company', availableIn: ['all'] },
  { key: '{{company.email}}', label_ar: 'بريد الشركة', label_en: 'Company Email', description_ar: 'البريد الإلكتروني', description_en: 'Company email address', example: 'info@company.com', group: 'company', availableIn: ['all'] },
  { key: '{{company.tax_id}}', label_ar: 'الرقم الضريبي', label_en: 'Tax ID', description_ar: 'الرقم الضريبي — التسمية تتغير حسب الدولة (TIN/ЄДРПОУ/NIP/Partita IVA)', description_en: 'Tax identification — label changes per country', example: '300012345600003', group: 'company', availableIn: ['all'] },
  { key: '{{company.logo}}', label_ar: 'شعار الشركة', label_en: 'Company Logo', description_ar: 'يُستخدم داخل وسم img — يُرفع من إعدادات الطباعة', description_en: 'Used inside img tag — uploaded from print settings', example: 'https://...logo.png', group: 'company', availableIn: ['all'] },
  // Party variables
  { key: '{{customer.name}}', label_ar: 'اسم العميل', label_en: 'Customer Name', description_ar: 'اسم العميل بلغة الدولة. يعمل مع Language Fallback', description_en: 'Customer name with language fallback', example: 'أحمد محمد', group: 'party', availableIn: ['sales_invoice', 'price_quote', 'receipt_voucher'] },
  { key: '{{supplier.name}}', label_ar: 'اسم المورد', label_en: 'Supplier Name', description_ar: 'اسم المورد بلغة الدولة', description_en: 'Supplier name with language fallback', example: 'Guangdong Fabrics Co.', group: 'party', availableIn: ['purchase_invoice', 'payment_voucher'] },
  { key: '{{party.name}}', label_ar: 'اسم الطرف', label_en: 'Party Name', description_ar: 'يعمل مع العميل أو المورد — عام', description_en: 'Works for customer or supplier — generic', example: 'أحمد / Guangdong', group: 'party', availableIn: ['all'] },
  // Invoice variables
  { key: '{{invoice.number}}', label_ar: 'رقم الفاتورة', label_en: 'Invoice Number', description_ar: 'الرقم الفريد للفاتورة', description_en: 'Unique invoice number', example: 'SI-2026-000042', group: 'document', availableIn: ['sales_invoice', 'purchase_invoice'] },
  { key: '{{invoice.date}}', label_ar: 'تاريخ الفاتورة', label_en: 'Invoice Date', description_ar: 'تاريخ إصدار الفاتورة بتنسيق الدولة', description_en: 'Invoice issue date in country format', example: '2026/02/23', group: 'document', availableIn: ['sales_invoice', 'purchase_invoice'] },
  { key: '{{invoice.total}}', label_ar: 'الإجمالي', label_en: 'Grand Total', description_ar: 'المبلغ الإجمالي شاملاً الضريبة — الرقم من بيانات الفاتورة الفعلية', description_en: 'Grand total including tax — from actual invoice data', example: '5,750.00', group: 'totals', availableIn: ['sales_invoice', 'purchase_invoice'] },
  { key: '{{invoice.items}}', label_ar: 'بنود الفاتورة', label_en: 'Invoice Items', description_ar: 'جدول البنود — يُولّد تلقائياً كصفوف HTML', description_en: 'Invoice line items — auto-generated as HTML rows', example: '(جدول)', group: 'items', availableIn: ['sales_invoice', 'purchase_invoice'] },
  // System variables
  { key: '{{QR_CODE}}', label_ar: 'رمز QR', label_en: 'QR Code', description_ar: 'صورة QR Code — المحتوى يتغير حسب نوع المستند والدولة (ZATCA للسعودية)', description_en: 'QR Code image — content varies by doc type and country (ZATCA for SA)', example: '[QR Image]', group: 'system', availableIn: ['all'] },
  { key: '{{STAMP}}', label_ar: 'ختم الشركة', label_en: 'Company Stamp', description_ar: 'صورة الختم — تُرفع من إعدادات الطباعة', description_en: 'Stamp image — uploaded from print settings', example: '[Stamp Image]', group: 'system', availableIn: ['all'] },
  { key: '{{SIGNATURE}}', label_ar: 'التوقيع', label_en: 'Signature', description_ar: 'صورة التوقيع — تُرفع من إعدادات الطباعة', description_en: 'Signature image — uploaded from print settings', example: '[Signature Image]', group: 'system', availableIn: ['all'] },
  { key: '{{tax_id_label}}', label_ar: 'تسمية الرقم الضريبي', label_en: 'Tax ID Label', description_ar: 'يتغير تلقائياً حسب الدولة: الرقم الضريبي/ЄДРПОУ/NIP/Partita IVA', description_en: 'Auto-changes per country: Tax ID/ЄДРПОУ/NIP/Partita IVA', example: 'ЄДРПОУ', group: 'country', availableIn: ['all'] },
  { key: '{{tax_name}}', label_ar: 'اسم الضريبة', label_en: 'Tax Name', description_ar: 'من إعدادات الدولة: ПДВ / VAT / KDV / MwSt / IVA', description_en: 'From country config: ПДВ / VAT / KDV / MwSt / IVA', example: 'ПДВ', group: 'country', availableIn: ['all'] },
  { key: '{{doc_title}}', label_ar: 'عنوان المستند', label_en: 'Document Title', description_ar: 'يتغير تلقائياً حسب نوع المستند ولغة الدولة', description_en: 'Auto-changes by doc type and country language', example: 'Рахунок-фактура', group: 'country', availableIn: ['all'] },
  // Roll label variables
  { key: '{{roll.number}}', label_ar: 'رقم الرولون', label_en: 'Roll Number', description_ar: 'الرقم الفريد للرولون', description_en: 'Unique roll number', example: 'ROL-2026-00042', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.material_name}}', label_ar: 'اسم المادة', label_en: 'Material Name', description_ar: 'اسم المادة بلغة الدولة', description_en: 'Material name in country language', example: 'قماش قطني', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.material_code}}', label_ar: 'كود المادة', label_en: 'Material Code', description_ar: 'رمز المادة الفريد', description_en: 'Unique material code', example: 'FAB-001', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.color}}', label_ar: 'اللون', label_en: 'Color', description_ar: 'لون الرولون', description_en: 'Roll color', example: 'أبيض', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.width}}', label_ar: 'العرض', label_en: 'Width', description_ar: 'عرض القماش بالسنتيمتر', description_en: 'Fabric width in cm', example: '150', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.weight}}', label_ar: 'الوزن', label_en: 'Weight (GSM)', description_ar: 'الوزن بالجرام/م²', description_en: 'Weight in grams/m²', example: '180', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.length}}', label_ar: 'الطول', label_en: 'Length', description_ar: 'طول/كمية الرولون', description_en: 'Roll length/quantity', example: '50', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.composition}}', label_ar: 'التركيبة', label_en: 'Composition', description_ar: 'تركيبة القماش', description_en: 'Fabric composition', example: 'Cotton 100%', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.container_no}}', label_ar: 'رقم الكونتينر', label_en: 'Container #', description_ar: 'رقم الحاوية المصدر', description_en: 'Source container number', example: 'CNT-2026-005', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.supplier_name}}', label_ar: 'المورد', label_en: 'Supplier', description_ar: 'اسم المورد', description_en: 'Supplier name', example: 'ABC Textiles', group: 'party', availableIn: ['roll_label'] },
  { key: '{{roll.receipt_date}}', label_ar: 'تاريخ الاستلام', label_en: 'Receipt Date', description_ar: 'تاريخ استلام الرولون', description_en: 'Roll receipt date', example: '2026-02-23', group: 'document', availableIn: ['roll_label'] },
  { key: '{{roll.barcode}}', label_ar: 'الباركود', label_en: 'Barcode', description_ar: 'رمز الباركود للرولون', description_en: 'Roll barcode', example: 'ROL-2026-00042', group: 'system', availableIn: ['roll_label'] },
  // Container label variables
  { key: '{{container.number}}', label_ar: 'رقم الكونتينر', label_en: 'Container #', description_ar: 'رقم الحاوية', description_en: 'Container number', example: 'CNT-2026-005', group: 'document', availableIn: ['container_label'] },
  { key: '{{container.supplier}}', label_ar: 'المورد', label_en: 'Supplier', description_ar: 'اسم مورد الحاوية', description_en: 'Container supplier', example: 'ABC Textiles', group: 'party', availableIn: ['container_label'] },
  { key: '{{container.origin}}', label_ar: 'بلد المصدر', label_en: 'Origin', description_ar: 'بلد المصدر', description_en: 'Origin country', example: 'China', group: 'document', availableIn: ['container_label'] },
  { key: '{{container.vessel}}', label_ar: 'السفينة', label_en: 'Vessel', description_ar: 'اسم السفينة', description_en: 'Vessel name', example: 'MSC Barcelona', group: 'document', availableIn: ['container_label'] },
];

export interface CompanyPrintSettings {
  id: string;
  company_id: string;
  tenant_id: string;
  logo_url: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  header_company_name_ar: string | null;
  header_company_name_en: string | null;
  header_address_ar: string | null;
  header_address_en: string | null;
  header_phone: string | null;
  header_email: string | null;
  header_website: string | null;
  header_tax_number: string | null;
  header_commercial_reg: string | null;
  footer_text_ar: string | null;
  footer_text_en: string | null;
  footer_terms_ar: string | null;
  footer_terms_en: string | null;
  default_paper_size: string;
  default_copies: number;
  auto_print_on_confirm: boolean;
  show_qr_by_default: boolean;
}

// ─── Country → Language Mapping ─────────────────────────────────
const COUNTRY_PRINT_LANGUAGE: Record<string, string> = {
  SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', KW: 'ar', QA: 'ar',
  UA: 'uk', TR: 'tr', DE: 'de', IT: 'it', FR: 'fr',
  PL: 'pl', RO: 'ro', US: 'en', GB: 'en',
};

// ─── RTL Languages ──────────────────────────────────────────────
const RTL_LANGUAGES = ['ar'];

// ─── Font Families ──────────────────────────────────────────────
function getFontFamily(lang: string): string {
  if (RTL_LANGUAGES.includes(lang)) return "'Cairo','Tajawal','Arial',sans-serif";
  return "'Inter','Segoe UI','Arial',sans-serif";
}

function getDirection(lang: string): 'rtl' | 'ltr' {
  return RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
}

// ─── Document Title Translations ────────────────────────────────
const DOC_TITLES: Record<string, Record<string, string>> = {
  sales_invoice: {
    ar: 'فاتورة مبيعات', en: 'Sales Invoice', uk: 'Рахунок-фактура', ru: 'Счёт-фактура',
    tr: 'Satış Faturası', de: 'Verkaufsrechnung', it: 'Fattura di Vendita',
    pl: 'Faktura Sprzedaży', ro: 'Factură de Vânzare', fr: 'Facture de Vente',
  },
  purchase_invoice: {
    ar: 'فاتورة مشتريات', en: 'Purchase Invoice', uk: 'Рахунок на оплату', ru: 'Счёт на оплату',
    tr: 'Satın Alma Faturası', de: 'Einkaufsrechnung', it: 'Fattura di Acquisto',
    pl: 'Faktura Zakupu', ro: 'Factură de Achiziție', fr: "Facture d'Achat",
  },
  receipt_voucher: {
    ar: 'سند قبض', en: 'Receipt Voucher', uk: 'Прибутковий касовий ордер', ru: 'Приходный кассовый ордер',
    tr: 'Tahsilat Makbuzu', de: 'Quittung', it: 'Ricevuta', pl: 'Pokwitowanie', ro: 'Chitanță',
  },
  payment_voucher: {
    ar: 'سند صرف', en: 'Payment Voucher', uk: 'Видатковий касовий ордер', ru: 'Расходный кассовый ордер',
    tr: 'Ödeme Makbuzu', de: 'Zahlungsbeleg', it: 'Ordine di Pagamento', pl: 'Dowód Wypłaty', ro: 'Ordin de Plată',
  },
  journal_entry: {
    ar: 'قيد يومية', en: 'Journal Entry', uk: 'Бухгалтерський запис', ru: 'Бухгалтерская проводка',
    tr: 'Yevmiye Kaydı', de: 'Buchungssatz', it: 'Registrazione Contabile', pl: 'Zapis Księgowy', ro: 'Notă Contabilă',
  },
  account_statement: {
    ar: 'كشف حساب', en: 'Account Statement', uk: 'Виписка з рахунку', ru: 'Выписка по счёту',
    tr: 'Hesap Ekstresi', de: 'Kontoauszug', it: 'Estratto Conto', pl: 'Wyciąg z Konta', ro: 'Extras de Cont',
  },
  price_quote: {
    ar: 'عرض سعر', en: 'Price Quote', uk: 'Цінова пропозиція', ru: 'Ценовое предложение',
    tr: 'Fiyat Teklifi', de: 'Preisangebot', it: 'Preventivo', pl: 'Oferta Cenowa', ro: 'Ofertă de Preț',
  },
  roll_label: {
    ar: 'لصاقة رولون', en: 'Roll Label', uk: 'Етикетка рулону', ru: 'Этикетка рулона',
    tr: 'Rulo Etiketi', de: 'Rollenetikett', it: 'Etichetta Rotolo', pl: 'Etykieta Rolki', ro: 'Etichetă Rolă',
  },
  container_label: {
    ar: 'لصاقة كونتينر', en: 'Container Label', uk: 'Етикетка контейнера', ru: 'Этикетка контейнера',
    tr: 'Konteyner Etiketi', de: 'Containeretikett', it: 'Etichetta Container', pl: 'Etykieta Kontenera', ro: 'Etichetă Container',
  },
};

// ─── UI Labels Translations ─────────────────────────────────────
const LABELS: Record<string, Record<string, string>> = {
  tax_id_label: {
    ar: 'الرقم الضريبي', en: 'Tax ID', uk: 'ЄДРПОУ', ru: 'ИНН', tr: 'Vergi No',
    de: 'Steuernummer', it: 'Partita IVA', pl: 'NIP', ro: 'CUI',
  },
  party_section_title: {
    ar: 'بيانات العميل', en: 'Customer Details', uk: 'Дані клієнта', tr: 'Müşteri Bilgileri',
    de: 'Kundendetails', it: 'Dati del Cliente', pl: 'Dane Klienta', ro: 'Detalii Client',
  },
  supplier_section_title: {
    ar: 'بيانات المورد', en: 'Supplier Details', uk: 'Дані постачальника', tr: 'Tedarikçi Bilgileri',
    de: 'Lieferantendetails', it: 'Dati del Fornitore', pl: 'Dane Dostawcy', ro: 'Detalii Furnizor',
  },
  doc_info_title: {
    ar: 'بيانات المستند', en: 'Document Info', uk: 'Інформація про документ', tr: 'Belge Bilgileri',
    de: 'Dokumentinfo', it: 'Info Documento', pl: 'Info Dokumentu', ro: 'Info Document',
  },
  invoice_number_label: { ar: 'رقم الفاتورة', en: 'Invoice No', uk: 'Номер рахунку', tr: 'Fatura No', de: 'Rechnungsnr', it: 'N. Fattura', pl: 'Nr Faktury', ro: 'Nr Factură' },
  issue_date_label: { ar: 'تاريخ الإصدار', en: 'Issue Date', uk: 'Дата виписки', tr: 'Düzenleme Tarihi', de: 'Ausstellungsdatum', it: 'Data Emissione', pl: 'Data Wystawienia', ro: 'Data Emiterii' },
  due_date_label: { ar: 'تاريخ الاستحقاق', en: 'Due Date', uk: 'Термін оплати', tr: 'Vade Tarihi', de: 'Fälligkeitsdatum', it: 'Data Scadenza', pl: 'Termin Płatności', ro: 'Data Scadenței' },
  supply_date_label: { ar: 'تاريخ التوريد', en: 'Supply Date', uk: 'Дата поставки', tr: 'Teslimat Tarihi', de: 'Lieferdatum', it: 'Data Fornitura', pl: 'Data Dostawy', ro: 'Data Livrării' },
  currency_label: { ar: 'العملة', en: 'Currency', uk: 'Валюта', tr: 'Para Birimi', de: 'Währung', it: 'Valuta', pl: 'Waluta', ro: 'Moneda' },
  item_desc_label: { ar: 'المادة / الخدمة', en: 'Item / Service', uk: 'Товар / Послуга', tr: 'Ürün / Hizmet', de: 'Artikel / Dienst', it: 'Articolo / Servizio', pl: 'Towar / Usługa', ro: 'Articol / Serviciu' },
  qty_label: { ar: 'الكمية', en: 'Qty', uk: 'Кількість', tr: 'Miktar', de: 'Menge', it: 'Qtà', pl: 'Ilość', ro: 'Cant.' },
  unit_label: { ar: 'الوحدة', en: 'Unit', uk: 'Одиниця', tr: 'Birim', de: 'Einheit', it: 'Unità', pl: 'Jedn.', ro: 'Unitate' },
  price_label: { ar: 'السعر', en: 'Price', uk: 'Ціна', tr: 'Fiyat', de: 'Preis', it: 'Prezzo', pl: 'Cena', ro: 'Preț' },
  discount_label: { ar: 'الخصم', en: 'Discount', uk: 'Знижка', tr: 'İndirim', de: 'Rabatt', it: 'Sconto', pl: 'Rabat', ro: 'Reducere' },
  tax_label: { ar: 'الضريبة', en: 'Tax', uk: 'ПДВ', tr: 'KDV', de: 'MwSt', it: 'IVA', pl: 'VAT', ro: 'TVA' },
  total_label: { ar: 'الإجمالي', en: 'Total', uk: 'Сума', tr: 'Toplam', de: 'Gesamt', it: 'Totale', pl: 'Łącznie', ro: 'Total' },
  subtotal_label: { ar: 'المجموع الفرعي', en: 'Subtotal', uk: 'Підсумок', tr: 'Ara Toplam', de: 'Zwischensumme', it: 'Subtotale', pl: 'Podsuma', ro: 'Subtotal' },
  grand_total_label: { ar: 'الإجمالي النهائي', en: 'Grand Total', uk: 'Загальна сума', tr: 'Genel Toplam', de: 'Gesamtbetrag', it: 'Totale Generale', pl: 'Suma Całkowita', ro: 'Total General' },
  paid_label: { ar: 'المدفوع', en: 'Paid', uk: 'Сплачено', tr: 'Ödenen', de: 'Bezahlt', it: 'Pagato', pl: 'Zapłacono', ro: 'Plătit' },
  balance_label: { ar: 'المتبقي', en: 'Balance', uk: 'Залишок', tr: 'Bakiye', de: 'Restbetrag', it: 'Saldo', pl: 'Saldo', ro: 'Sold' },
  payment_terms_label: { ar: 'شروط الدفع', en: 'Payment Terms', uk: 'Умови оплати', tr: 'Ödeme Koşulları', de: 'Zahlungsbedingungen', it: 'Condizioni di Pagamento', pl: 'Warunki Płatności', ro: 'Condiții de Plată' },
  received_from_label: { ar: 'استلمنا من', en: 'Received from', uk: 'Отримано від', tr: 'Alındı', de: 'Erhalten von', it: 'Ricevuto da', pl: 'Otrzymano od', ro: 'Primit de la' },
  paid_to_label: { ar: 'صرفنا إلى', en: 'Paid to', uk: 'Сплачено', tr: 'Ödendi', de: 'Bezahlt an', it: 'Pagato a', pl: 'Wypłacono', ro: 'Plătit către' },
  amount_words_label: { ar: 'مبلغ وقدره', en: 'Amount in words', uk: 'Сума прописом', tr: 'Yazıyla', de: 'Betrag in Worten', it: 'Importo in lettere', pl: 'Kwota słownie', ro: 'Suma în litere' },
  for_label: { ar: 'وذلك عن', en: 'For', uk: 'За', tr: 'İçin', de: 'Für', it: 'Per', pl: 'Za', ro: 'Pentru' },
  payment_method_label: { ar: 'طريقة الدفع', en: 'Payment Method', uk: 'Спосіб оплати', tr: 'Ödeme Yöntemi', de: 'Zahlungsart', it: 'Metodo di Pagamento', pl: 'Sposób Płatności', ro: 'Metodă de Plată' },
  stamp_label: { ar: 'ختم الشركة', en: 'Company Stamp', uk: 'Печатка', tr: 'Şirket Mühürü', de: 'Firmenstempel', it: 'Timbro Aziendale', pl: 'Pieczątka', ro: 'Ștampila' },
  receiver_label: { ar: 'المستلم', en: 'Receiver', uk: 'Отримувач', tr: 'Alıcı', de: 'Empfänger', it: 'Ricevente', pl: 'Odbiorca', ro: 'Destinatar' },
  accountant_label: { ar: 'المحاسب', en: 'Accountant', uk: 'Бухгалтер', tr: 'Muhasebeci', de: 'Buchhalter', it: 'Contabile', pl: 'Księgowy', ro: 'Contabil' },
  manager_label: { ar: 'المدير', en: 'Manager', uk: 'Директор', tr: 'Müdür', de: 'Geschäftsführer', it: 'Direttore', pl: 'Kierownik', ro: 'Director' },
  cfo_label: { ar: 'المدير المالي', en: 'CFO', uk: 'Фінансовий директор', tr: 'Mali Müdür', de: 'CFO', it: 'CFO', pl: 'Dyrektor Finansowy', ro: 'Director Financiar' },
  ceo_label: { ar: 'المدير العام', en: 'CEO', uk: 'Генеральний директор', tr: 'Genel Müdür', de: 'CEO', it: 'CEO', pl: 'Prezes', ro: 'Director General' },
  account_label: { ar: 'الحساب', en: 'Account', uk: 'Рахунок', tr: 'Hesap', de: 'Konto', it: 'Conto', pl: 'Konto', ro: 'Cont' },
  from_label: { ar: 'من', en: 'From', uk: 'Від', tr: 'den', de: 'Von', it: 'Da', pl: 'Od', ro: 'De la' },
  to_label: { ar: 'إلى', en: 'To', uk: 'До', tr: 'e', de: 'Bis', it: 'A', pl: 'Do', ro: 'Până la' },
  opening_balance_label: { ar: 'الرصيد الافتتاحي', en: 'Opening Balance', uk: 'Початковий залишок', tr: 'Açılış Bakiyesi', de: 'Anfangssaldo', it: 'Saldo Iniziale', pl: 'Saldo Początkowe', ro: 'Sold Inițial' },
  closing_balance_label: { ar: 'الرصيد الختامي', en: 'Closing Balance', uk: 'Кінцевий залишок', tr: 'Kapanış Bakiyesi', de: 'Schlusssaldo', it: 'Saldo Finale', pl: 'Saldo Końcowe', ro: 'Sold Final' },
  total_debit_label: { ar: 'مجموع المدين', en: 'Total Debit', uk: 'Загальний дебет', tr: 'Toplam Borç', de: 'Gesamtsoll', it: 'Totale Dare', pl: 'Suma Winien', ro: 'Total Debit' },
  total_credit_label: { ar: 'مجموع الدائن', en: 'Total Credit', uk: 'Загальний кредит', tr: 'Toplam Alacak', de: 'Gesamthaben', it: 'Totale Avere', pl: 'Suma Ma', ro: 'Total Credit' },
  date_label: { ar: 'التاريخ', en: 'Date', uk: 'Дата', tr: 'Tarih', de: 'Datum', it: 'Data', pl: 'Data', ro: 'Data' },
  entry_no_label: { ar: 'رقم القيد', en: 'Entry No', uk: 'Номер запису', tr: 'Kayıt No', de: 'Buchungsnr', it: 'N. Registrazione', pl: 'Nr Zapisu', ro: 'Nr Înreg.' },
  description_label: { ar: 'البيان', en: 'Description', uk: 'Опис', tr: 'Açıklama', de: 'Beschreibung', it: 'Descrizione', pl: 'Opis', ro: 'Descriere' },
  debit_label: { ar: 'مدين', en: 'Debit', uk: 'Дебет', tr: 'Borç', de: 'Soll', it: 'Dare', pl: 'Winien', ro: 'Debit' },
  credit_label: { ar: 'دائن', en: 'Credit', uk: 'Кредит', tr: 'Alacak', de: 'Haben', it: 'Avere', pl: 'Ma', ro: 'Credit' },
  account_code_label: { ar: 'رمز الحساب', en: 'Account Code', uk: 'Код рахунку', tr: 'Hesap Kodu', de: 'Kontonr', it: 'Codice Conto', pl: 'Kod Konta', ro: 'Cod Cont' },
  account_name_label: { ar: 'اسم الحساب', en: 'Account Name', uk: 'Назва рахунку', tr: 'Hesap Adı', de: 'Kontoname', it: 'Nome Conto', pl: 'Nazwa Konta', ro: 'Nume Cont' },
  printed_at_label: { ar: 'طُبع بتاريخ', en: 'Printed on', uk: 'Надруковано', tr: 'Basılma tarihi', de: 'Gedruckt am', it: 'Stampato il', pl: 'Wydrukowano', ro: 'Tipărit la' },
  footer_text: { ar: 'شكراً لتعاملكم معنا', en: 'Thank you for your business', uk: 'Дякуємо за співпрацю', tr: 'İş birliğiniz için teşekkürler', de: 'Vielen Dank für Ihr Vertrauen', it: 'Grazie per la collaborazione', pl: 'Dziękujemy za współpracę', ro: 'Vă mulțumim pentru colaborare' },
  // Roll label labels
  color_label: { ar: 'اللون', en: 'Color', uk: 'Колір', tr: 'Renk', de: 'Farbe', it: 'Colore', pl: 'Kolor', ro: 'Culoare' },
  width_label: { ar: 'العرض', en: 'Width', uk: 'Ширина', tr: 'Genişlik', de: 'Breite', it: 'Larghezza', pl: 'Szerokość', ro: 'Lățime' },
  weight_label: { ar: 'الوزن', en: 'Weight', uk: 'Вага', tr: 'Ağırlık', de: 'Gewicht', it: 'Peso', pl: 'Waga', ro: 'Greutate' },
  length_label: { ar: 'الطول', en: 'Length', uk: 'Довжина', tr: 'Uzunluk', de: 'Länge', it: 'Lunghezza', pl: 'Długość', ro: 'Lungime' },
  cost_label: { ar: 'التكلفة', en: 'Cost', uk: 'Вартість', tr: 'Maliyet', de: 'Kosten', it: 'Costo', pl: 'Koszt', ro: 'Cost' },
  batch_label: { ar: 'الدفعة', en: 'Batch', uk: 'Партія', tr: 'Parti', de: 'Charge', it: 'Lotto', pl: 'Partia', ro: 'Lot' },
  container_label_text: { ar: 'الكونتينر', en: 'Container', uk: 'Контейнер', tr: 'Konteyner', de: 'Container', it: 'Container', pl: 'Kontener', ro: 'Container' },
  invoice_label: { ar: 'الفاتورة', en: 'Invoice', uk: 'Рахунок', tr: 'Fatura', de: 'Rechnung', it: 'Fattura', pl: 'Faktura', ro: 'Factură' },
  supplier_label: { ar: 'المورد', en: 'Supplier', uk: 'Постачальник', tr: 'Tedarikçi', de: 'Lieferant', it: 'Fornitore', pl: 'Dostawca', ro: 'Furnizor' },
  origin_label: { ar: 'المصدر', en: 'Origin', uk: 'Походження', tr: 'Kaynak', de: 'Herkunft', it: 'Origine', pl: 'Pochodzenie', ro: 'Origine' },
  vessel_label: { ar: 'السفينة', en: 'Vessel', uk: 'Судно', tr: 'Gemi', de: 'Schiff', it: 'Nave', pl: 'Statek', ro: 'Navă' },
  bol_label: { ar: 'بوليصة الشحن', en: 'Bill of Lading', uk: 'Коносамент', tr: 'Konşimento', de: 'Frachtbrief', it: 'Polizza di Carico', pl: 'Konosament', ro: 'Conosament' },
  departure_label: { ar: 'المغادرة', en: 'Departure', uk: 'Відправлення', tr: 'Kalkış', de: 'Abfahrt', it: 'Partenza', pl: 'Wyjazd', ro: 'Plecare' },
  arrival_label: { ar: 'الوصول', en: 'Arrival', uk: 'Прибуття', tr: 'Varış', de: 'Ankunft', it: 'Arrivo', pl: 'Przyjazd', ro: 'Sosire' },
  items_label: { ar: 'الأصناف', en: 'Items', uk: 'Позиції', tr: 'Kalemler', de: 'Artikel', it: 'Articoli', pl: 'Pozycje', ro: 'Articole' },
  value_label: { ar: 'القيمة', en: 'Value', uk: 'Вартість', tr: 'Değer', de: 'Wert', it: 'Valore', pl: 'Wartość', ro: 'Valoare' },
  size_label: { ar: 'الحجم', en: 'Size', uk: 'Розмір', tr: 'Boyut', de: 'Größe', it: 'Dimensione', pl: 'Rozmiar', ro: 'Dimensiune' },
  status_label: { ar: 'الحالة', en: 'Status', uk: 'Статус', tr: 'Durum', de: 'Status', it: 'Stato', pl: 'Status', ro: 'Stare' },
};

// ─── Tax Name by Country ────────────────────────────────────────
function getTaxName(countryCode: string, lang: string): string {
  const config = getCountryTaxConfig(countryCode);
  if (config) {
    const defaultTax = config.taxTypes.find(t => t.isDefault);
    if (defaultTax) return lang === 'ar' ? defaultTax.nameAr : defaultTax.nameEn;
    return lang === 'ar' ? config.taxSystemNameAr : config.taxSystemNameEn;
  }
  return getLabel('tax_label', lang);
}

// ─── Get Label by Language ──────────────────────────────────────
function getLabel(key: string, lang: string): string {
  const labels = LABELS[key];
  if (!labels) return key;
  return labels[lang] || labels['en'] || labels['ar'] || key;
}

// ─── Get Document Title ─────────────────────────────────────────
function getDocTitle(docType: string, lang: string): string {
  const titles = DOC_TITLES[docType];
  if (!titles) return docType;
  return titles[lang] || titles['en'] || titles['ar'] || docType;
}

// ─── Get Localized Name (Language Fallback Chain) ───────────────
export function getLocalizedName(entity: any, lang: string): string {
  if (!entity) return '—';
  // 1. Try requested language
  const langKey = `name_${lang}`;
  if (entity[langKey]) return entity[langKey];
  // 2. Try English fallback
  if (entity.name_en) return entity.name_en;
  // 3. Try Arabic fallback
  if (entity.name_ar) return entity.name_ar;
  // 4. Try generic name
  if (entity.name) return entity.name;
  // 5. Try code
  return entity.code || '—';
}

// ─── Get Print Language from Country ────────────────────────────
export function getPrintLanguage(countryCode: string): string {
  return COUNTRY_PRINT_LANGUAGE[countryCode] || 'en';
}

// ═══════════════════════════════════════════════════════════════
// Print Service Class
// ═══════════════════════════════════════════════════════════════
class PrintService {

  // ─── CRUD Operations ──────────────────────────────────────────

  async getTemplates(docType: string, tenantId?: string): Promise<PrintTemplate[]> {
    let query = supabase
      .from('print_templates')
      .select('*')
      .eq('doc_type', docType)
      .eq('is_active', true)
      .order('sort_order');

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getTemplateById(id: string): Promise<PrintTemplate | null> {
    const { data, error } = await supabase
      .from('print_templates').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getDefaultTemplate(docType: string, tenantId?: string): Promise<PrintTemplate | null> {
    let query = supabase
      .from('print_templates').select('*')
      .eq('doc_type', docType).eq('is_default', true).eq('is_active', true);
    if (tenantId) query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createTemplate(template: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const { data, error } = await supabase
      .from('print_templates').insert(template).select().single();
    if (error) throw error;
    return data;
  }

  async updateTemplate(id: string, updates: Partial<PrintTemplate>): Promise<PrintTemplate> {
    const { data, error } = await supabase
      .from('print_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from('print_templates').delete().eq('id', id);
    if (error) throw error;
  }

  async setDefaultTemplate(id: string, docType: string, tenantId?: string): Promise<void> {
    let query = supabase.from('print_templates').update({ is_default: false }).eq('doc_type', docType);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    await query;
    const { error } = await supabase.from('print_templates').update({ is_default: true }).eq('id', id);
    if (error) throw error;
  }

  // ─── Company Print Settings ───────────────────────────────────

  async getCompanyPrintSettings(companyId: string): Promise<CompanyPrintSettings | null> {
    const { data, error } = await supabase
      .from('company_print_settings').select('*').eq('company_id', companyId).maybeSingle();
    if (error) {
      console.warn('[PrintService] getCompanyPrintSettings error:', error);
      return null;
    }
    return data;
  }

  async saveCompanyPrintSettings(settings: Partial<CompanyPrintSettings>): Promise<CompanyPrintSettings> {
    const { data, error } = await supabase
      .from('company_print_settings').upsert(settings, { onConflict: 'company_id' }).select().single();
    if (error) throw error;
    return data;
  }

  // ─── Rendering Engine ─────────────────────────────────────────

  /**
   * Resolve all template variables with actual data
   * 
   * @param template - The template to render
   * @param data - Raw document data (invoice, entry, voucher, etc.)
   * @param countryCode - Company's country code (determines language + tax labels)
   * @param options - Print options (QR, stamp, signature, etc.)
   * @param overrideLang - Optional language override (user can change print language)
   */
  // ─── Generate Table Rows for Invoice Items ────────────────────

  generateItemsRows(items: any[], lang: string): string {
    if (!items || !Array.isArray(items) || items.length === 0) return '';
    return items.map((item, idx) => {
      const name = getLocalizedName(item, lang) || item.description || item.material_name || '—';
      const qty = item.quantity ?? item.qty ?? '';
      const unit = item.unit || item.uom || '';
      const price = this.formatNum(item.unit_price ?? item.price ?? 0);
      const discount = this.formatNum(item.discount ?? 0);
      const taxRate = item.tax_rate ?? item.vat_rate ?? '';
      const taxAmt = this.formatNum(item.tax_amount ?? 0);
      const total = this.formatNum(item.line_total ?? item.total ?? 0);
      return `<tr><td>${idx + 1}</td><td>${name}</td><td>${qty}</td><td>${unit}</td><td>${price}</td><td>${discount}</td><td>${taxRate}%</td><td>${taxAmt}</td><td>${total}</td></tr>`;
    }).join('\n');
  }

  // ─── Generate Table Rows for Account Statement Entries ────────

  generateEntriesRows(entries: any[], lang: string): string {
    if (!entries || !Array.isArray(entries) || entries.length === 0) return '';
    let runningBalance = 0;
    return entries.map((e, idx) => {
      const debit = e.debit ?? e.debit_amount ?? 0;
      const credit = e.credit ?? e.credit_amount ?? 0;
      runningBalance += debit - credit;
      return `<tr><td>${idx + 1}</td><td>${e.date || e.entry_date || ''}</td><td>${e.entry_number || e.number || ''}</td><td>${e.description || e.memo || '—'}</td><td>${this.formatNum(debit)}</td><td>${this.formatNum(credit)}</td><td>${this.formatNum(runningBalance)}</td></tr>`;
    }).join('\n');
  }

  // ─── Generate Table Rows for Journal Entry Lines ──────────────

  generateLinesRows(lines: any[], lang: string): string {
    if (!lines || !Array.isArray(lines) || lines.length === 0) return '';
    return lines.map((line, idx) => {
      const accountName = getLocalizedName(line.account || line, lang) || line.account_name || '—';
      return `<tr><td>${idx + 1}</td><td>${line.account_code || ''}</td><td>${accountName}</td><td>${line.description || line.memo || ''}</td><td>${this.formatNum(line.debit ?? 0)}</td><td>${this.formatNum(line.credit ?? 0)}</td></tr>`;
    }).join('\n');
  }

  // ─── QR Code Generation ───────────────────────────────────────

  async generateQRDataUrl(content: string): Promise<string> {
    try {
      return await QRCode.toDataURL(content, {
        width: 160, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' }
      });
    } catch {
      return '';
    }
  }

  getQRContent(docType: string, data: Record<string, any>, countryCode: string): string {
    // ZATCA TLV format for Saudi Arabia
    if (countryCode === 'SA' && ['sales_invoice', 'purchase_invoice'].includes(docType)) {
      return this.buildZATCAQR(data);
    }
    // Generic QR for other countries
    const info: Record<string, any> = { type: docType };
    if (data.invoice?.number) info.no = data.invoice.number;
    if (data.voucher?.number) info.no = data.voucher.number;
    if (data.entry?.number) info.no = data.entry.number;
    // Roll label QR
    if (data.roll?.number) {
      info.no = data.roll.number;
      if (data.roll.material_name) info.material = data.roll.material_name;
      if (data.roll.color) info.color = data.roll.color;
      if (data.roll.length) info.length = data.roll.length;
      if (data.roll.width) info.width = data.roll.width;
    }
    // Container label QR
    if (data.container?.number) {
      info.no = data.container.number;
      if (data.container.supplier) info.supplier = data.container.supplier;
      if (data.container.origin) info.origin = data.container.origin;
    }
    if (data.invoice?.total) info.total = data.invoice.total;
    if (data.voucher?.amount) info.amount = data.voucher.amount;
    if (data.invoice?.date) info.date = data.invoice.date;
    if (data.voucher?.date) info.date = data.voucher.date;
    return JSON.stringify(info);
  }

  private buildZATCAQR(data: Record<string, any>): string {
    // Simplified ZATCA TLV (Tag-Length-Value) Base64
    const seller = data.company?.name || '';
    const vatNo = data.company?.tax_id || '';
    const timestamp = data.invoice?.date || new Date().toISOString();
    const total = String(data.invoice?.total || '0');
    const vatAmount = String(data.invoice?.tax_amount || '0');
    const tlvParts = [
      this.tlvEncode(1, seller),
      this.tlvEncode(2, vatNo),
      this.tlvEncode(3, timestamp),
      this.tlvEncode(4, total),
      this.tlvEncode(5, vatAmount),
    ];
    const combined = new Uint8Array(tlvParts.reduce((acc, p) => acc + p.length, 0));
    let offset = 0;
    for (const part of tlvParts) { combined.set(part, offset); offset += part.length; }
    return btoa(String.fromCharCode(...combined));
  }

  private tlvEncode(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
  }

  private formatNum(n: number | string): string {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(num) || num === 0) return '—';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ─── Main Render Engine ───────────────────────────────────────

  async resolveAndRender(
    template: PrintTemplate,
    data: Record<string, any>,
    countryCode: string,
    options: PrintOptions,
    overrideLang?: string
  ): Promise<RenderResult> {
    const lang = overrideLang || getPrintLanguage(countryCode);
    const dir = getDirection(lang);
    const fontFamily = getFontFamily(lang);

    // CSS — inject direction and font
    const css = (template.template_css || '')
      .replace(/{{direction}}/g, dir)
      .replace(/{{font_family}}/g, fontFamily);

    let html = template.template_html;

    // Replace system/country labels
    html = html.replace(/{{doc_title}}/g, getDocTitle(template.doc_type, lang));
    html = html.replace(/{{tax_name}}/g, getTaxName(countryCode, lang));
    html = html.replace(/{{direction}}/g, dir);
    html = html.replace(/{{font_family}}/g, fontFamily);

    for (const labelKey of Object.keys(LABELS)) {
      html = html.replace(new RegExp(`{{${labelKey}}}`, 'g'), getLabel(labelKey, lang));
      // Also replace {{_label_xxx}} shorthand (used in label templates)
      html = html.replace(new RegExp(`{{_label_${labelKey.replace('_label', '')}}}`, 'g'), getLabel(labelKey, lang));
    }

    // Resolve _label_ shortcuts for label templates
    const labelShortcuts: Record<string, string> = {
      '_label_color': 'color_label',
      '_label_width': 'width_label',
      '_label_weight': 'weight_label',
      '_label_length': 'length_label',
      '_label_cost': 'cost_label',
      '_label_batch': 'batch_label',
      '_label_container': 'container_label_text',
      '_label_invoice': 'invoice_label',
      '_label_supplier': 'supplier_label',
      '_label_date': 'date_label',
      '_label_origin': 'origin_label',
      '_label_vessel': 'vessel_label',
      '_label_bol': 'bol_label',
      '_label_departure': 'departure_label',
      '_label_arrival': 'arrival_label',
      '_label_items': 'items_label',
      '_label_value': 'value_label',
      '_label_size': 'size_label',
      '_label_status': 'status_label',
    };
    for (const [shortcut, labelKey] of Object.entries(labelShortcuts)) {
      html = html.replace(new RegExp(`{{${shortcut}}}`, 'g'), getLabel(labelKey, lang));
    }

    // Replace data variables (with language fallback for names)
    for (const variable of template.variables || []) {
      const key = variable.key;
      let value = this.getNestedValue(data, key);
      if (key.endsWith('.name') || key.endsWith('.name_ar') || key.endsWith('.name_en')) {
        const parentKey = key.split('.').slice(0, -1).join('.');
        const parent = this.getNestedValue(data, parentKey);
        if (parent) value = getLocalizedName(parent, lang);
      }
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
    }

    // Replace remaining {{key}} from data
    html = html.replace(/{{([^}]+)}}/g, (match, key) => {
      if (['QR_CODE', 'STAMP', 'SIGNATURE', 'ITEMS_ROWS', 'ENTRIES_ROWS', 'LINES_ROWS'].includes(key)) return match;
      const val = this.getNestedValue(data, key);
      return val ?? '';
    });

    // Generate table rows
    if (data.invoice?.items || data.items) {
      html = html.replace(/{{ITEMS_ROWS}}/g, this.generateItemsRows(data.invoice?.items || data.items, lang));
    } else { html = html.replace(/{{ITEMS_ROWS}}/g, ''); }
    if (data.account?.entries || data.entries) {
      html = html.replace(/{{ENTRIES_ROWS}}/g, this.generateEntriesRows(data.account?.entries || data.entries, lang));
    } else { html = html.replace(/{{ENTRIES_ROWS}}/g, ''); }
    if (data.entry?.lines || data.lines) {
      html = html.replace(/{{LINES_ROWS}}/g, this.generateLinesRows(data.entry?.lines || data.lines, lang));
    } else { html = html.replace(/{{LINES_ROWS}}/g, ''); }

    // QR Code
    if (options.includeQR && template.include_qr) {
      const qrContent = this.getQRContent(template.doc_type, data, countryCode);
      const qrDataUrl = await this.generateQRDataUrl(qrContent);
      html = html.replace(/{{QR_CODE}}/g, qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:80px;height:80px" />` : '');
    } else {
      html = html.replace(/{{QR_CODE}}/g, '');
    }

    // Stamp & Signature
    const stampUrl = data._printSettings?.stamp_url;
    const sigUrl = data._printSettings?.signature_url;
    html = html.replace(/{{STAMP}}/g, (options.includeStamp && stampUrl) ? `<img src="${stampUrl}" alt="stamp" style="max-height:50px;opacity:0.8" />` : '');
    html = html.replace(/{{SIGNATURE}}/g, (options.includeSignature && sigUrl) ? `<img src="${sigUrl}" alt="signature" style="max-height:50px;opacity:0.8" />` : '');

    // Header/Footer removal
    if (!options.includeHeader) html = html.replace(/<!-- HEADER_START -->.*?<!-- HEADER_END -->/gs, '');
    if (!options.includeFooter) html = html.replace(/<!-- FOOTER_START -->.*?<!-- FOOTER_END -->/gs, '');

    return { html, css };
  }

  // ─── Generate Full Preview HTML ───────────────────────────────

  async generatePreview(
    template: PrintTemplate,
    data: Record<string, any>,
    countryCode: string,
    options: PrintOptions,
    overrideLang?: string
  ): Promise<string> {
    const { html, css } = await this.resolveAndRender(template, data, countryCode, options, overrideLang);
    const margins = template.margins;
    const lang = overrideLang || getPrintLanguage(countryCode);

    return `<!DOCTYPE html>
<html dir="${getDirection(lang)}">
<head>
  <meta charset="utf-8">
  <title>${getDocTitle(template.doc_type, lang)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: ${template.paper_size} ${template.orientation}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    ${css}
  </style>
</head>
<body>${html}</body>
</html>`;
  }

  // ─── Print Document ───────────────────────────────────────────

  async print(
    templateId: string,
    data: Record<string, any>,
    countryCode: string,
    options: PrintOptions,
    overrideLang?: string
  ): Promise<void> {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    const preview = await this.generatePreview(template, data, countryCode, options, overrideLang);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(preview);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  // ─── Helper ───────────────────────────────────────────────────

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export const printService = new PrintService();
export default printService;

// ─── Export utilities for use across the app ────────────────────
export { getLabel, getDocTitle, getTaxName, getFontFamily, getDirection, LABELS, DOC_TITLES, COUNTRY_PRINT_LANGUAGE };

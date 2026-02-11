/**
 * ════════════════════════════════════════════════════════════════
 * 🌍 Country Tax Configuration
 * ════════════════════════════════════════════════════════════════
 * 
 * Dynamic tax system configuration per country.
 * When a user selects a country in Company Profile,
 * this config drives which tax fields, rates, and labels appear.
 * 
 * @module config/countryTaxConfig
 */

// ─── Tax Type Definitions ───────────────────────────────────────────────

export interface TaxType {
    code: string;
    nameAr: string;
    nameEn: string;
    defaultRate: number;
    isDefault: boolean;
    description?: { ar: string; en: string };
}

export interface TaxIdFormat {
    labelAr: string;
    labelEn: string;
    placeholder: string;
    pattern?: string; // regex for validation
    length?: number;
    mask?: string; // e.g. "###-###-###-###-###"
}

export interface CountryTaxConfig {
    countryCode: string;
    nameAr: string;
    nameEn: string;
    flag: string;
    currency: string;
    currencySymbol: string;
    taxSystemNameAr: string;
    taxSystemNameEn: string;
    defaultVatRate: number;
    taxTypes: TaxType[];
    taxIdFormats: TaxIdFormat[];
    hasElectronicInvoicing: boolean;
    electronicInvoicingNameAr?: string;
    electronicInvoicingNameEn?: string;
    hasZakat?: boolean;
    zakatRate?: number;
    fiscalYearDefaultMonth: number; // 1 = January
    additionalFields?: {
        key: string;
        labelAr: string;
        labelEn: string;
        type: 'text' | 'number' | 'boolean' | 'select';
        options?: { value: string; labelAr: string; labelEn: string }[];
    }[];
}

// ─── Country Tax Configurations ─────────────────────────────────────────

export const COUNTRY_TAX_CONFIGS: Record<string, CountryTaxConfig> = {
    // ─── Saudi Arabia ───────────────────────────────────────────────────
    SA: {
        countryCode: 'SA',
        nameAr: 'المملكة العربية السعودية',
        nameEn: 'Saudi Arabia',
        flag: '🇸🇦',
        currency: 'SAR',
        currencySymbol: '﷼',
        taxSystemNameAr: 'ضريبة القيمة المضافة (VAT)',
        taxSystemNameEn: 'Value Added Tax (VAT)',
        defaultVatRate: 15,
        taxTypes: [
            {
                code: 'vat_standard',
                nameAr: 'ضريبة قيمة مضافة - قياسية',
                nameEn: 'VAT - Standard Rate',
                defaultRate: 15,
                isDefault: true,
            },
            {
                code: 'vat_zero',
                nameAr: 'ضريبة صفرية',
                nameEn: 'Zero-Rated',
                defaultRate: 0,
                isDefault: false,
            },
            {
                code: 'vat_exempt',
                nameAr: 'معفاة من الضريبة',
                nameEn: 'VAT Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'الرقم الضريبي',
                labelEn: 'VAT Registration Number (TIN)',
                placeholder: '3XXXXXXXXXX0003',
                pattern: '^3\\d{13}3$',
                length: 15,
            },
            {
                labelAr: 'السجل التجاري',
                labelEn: 'Commercial Register (CR)',
                placeholder: 'XXXXXXXXXX',
                length: 10,
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'فاتورة (ZATCA)',
        electronicInvoicingNameEn: 'ZATCA E-Invoicing (Fatoorah)',
        hasZakat: true,
        zakatRate: 2.5,
        fiscalYearDefaultMonth: 1,
        additionalFields: [
            {
                key: 'zatca_integration_type',
                labelAr: 'نوع ربط ZATCA',
                labelEn: 'ZATCA Integration Type',
                type: 'select',
                options: [
                    { value: 'simplified', labelAr: 'فاتورة مبسطة (B2C)', labelEn: 'Simplified Invoice (B2C)' },
                    { value: 'standard', labelAr: 'فاتورة ضريبية (B2B)', labelEn: 'Standard Tax Invoice (B2B)' },
                    { value: 'both', labelAr: 'كلاهما', labelEn: 'Both' },
                ],
            },
        ],
    },

    // ─── United Arab Emirates ───────────────────────────────────────────
    AE: {
        countryCode: 'AE',
        nameAr: 'الإمارات العربية المتحدة',
        nameEn: 'United Arab Emirates',
        flag: '🇦🇪',
        currency: 'AED',
        currencySymbol: 'د.إ',
        taxSystemNameAr: 'ضريبة القيمة المضافة (VAT)',
        taxSystemNameEn: 'Value Added Tax (VAT)',
        defaultVatRate: 5,
        taxTypes: [
            {
                code: 'vat_standard',
                nameAr: 'ضريبة قيمة مضافة - قياسية',
                nameEn: 'VAT - Standard Rate',
                defaultRate: 5,
                isDefault: true,
            },
            {
                code: 'vat_zero',
                nameAr: 'ضريبة صفرية',
                nameEn: 'Zero-Rated',
                defaultRate: 0,
                isDefault: false,
            },
            {
                code: 'vat_exempt',
                nameAr: 'معفاة من الضريبة',
                nameEn: 'VAT Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'رقم التسجيل الضريبي (TRN)',
                labelEn: 'Tax Registration Number (TRN)',
                placeholder: '100XXXXXXXXXXXX',
                pattern: '^100\\d{12}$',
                length: 15,
            },
            {
                labelAr: 'رقم الرخصة التجارية',
                labelEn: 'Trade License Number',
                placeholder: 'XXXXXXXX',
            },
        ],
        hasElectronicInvoicing: false,
        fiscalYearDefaultMonth: 1,
    },

    // ─── Ukraine ────────────────────────────────────────────────────────
    UA: {
        countryCode: 'UA',
        nameAr: 'أوكرانيا',
        nameEn: 'Ukraine',
        flag: '🇺🇦',
        currency: 'UAH',
        currencySymbol: '₴',
        taxSystemNameAr: 'ПДВ (ضريبة القيمة المضافة)',
        taxSystemNameEn: 'ПДВ (VAT - Податок на додану вартість)',
        defaultVatRate: 20,
        taxTypes: [
            {
                code: 'pdv_standard',
                nameAr: 'ПДВ - قياسية 20%',
                nameEn: 'ПДВ - Standard 20%',
                defaultRate: 20,
                isDefault: true,
            },
            {
                code: 'pdv_reduced',
                nameAr: 'ПДВ - مخفضة 7%',
                nameEn: 'ПДВ - Reduced 7%',
                defaultRate: 7,
                isDefault: false,
                description: {
                    ar: 'الأدوية والمستلزمات الطبية',
                    en: 'Medicines and medical supplies',
                },
            },
            {
                code: 'pdv_zero',
                nameAr: 'ПДВ - صفرية',
                nameEn: 'ПДВ - Zero Rate (0%)',
                defaultRate: 0,
                isDefault: false,
                description: {
                    ar: 'الصادرات والنقل الدولي',
                    en: 'Exports and international transportation',
                },
            },
            {
                code: 'pdv_exempt',
                nameAr: 'معفاة من ПДВ',
                nameEn: 'ПДВ Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'ЄДРПОУ (رقم المنشأة)',
                labelEn: 'ЄДРПОУ (Enterprise Code)',
                placeholder: 'XXXXXXXX',
                pattern: '^\\d{8}$',
                length: 8,
            },
            {
                labelAr: 'ІПН (الرقم الضريبي الفردي)',
                labelEn: 'ІПН (Individual Tax Number)',
                placeholder: 'XXXXXXXXXX',
                pattern: '^\\d{10}$',
                length: 10,
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'الفاتورة الإلكترونية الأوكرانية',
        electronicInvoicingNameEn: 'Єдиний реєстр податкових накладних',
        fiscalYearDefaultMonth: 1,
        additionalFields: [
            {
                key: 'tax_system_type',
                labelAr: 'نوع النظام الضريبي',
                labelEn: 'Tax System Type',
                type: 'select',
                options: [
                    { value: 'general', labelAr: 'النظام العام', labelEn: 'General System (Загальна система)' },
                    { value: 'simplified_group1', labelAr: 'مبسط - المجموعة 1', labelEn: 'Simplified Group 1 (Єдиний податок)' },
                    { value: 'simplified_group2', labelAr: 'مبسط - المجموعة 2', labelEn: 'Simplified Group 2' },
                    { value: 'simplified_group3', labelAr: 'مبسط - المجموعة 3', labelEn: 'Simplified Group 3' },
                ],
            },
            {
                key: 'is_pdv_payer',
                labelAr: 'هل المنشأة مسجلة في ПДВ؟',
                labelEn: 'Is PDV (VAT) registered?',
                type: 'boolean',
            },
        ],
    },

    // ─── Turkey ─────────────────────────────────────────────────────────
    TR: {
        countryCode: 'TR',
        nameAr: 'تركيا',
        nameEn: 'Turkey',
        flag: '🇹🇷',
        currency: 'TRY',
        currencySymbol: '₺',
        taxSystemNameAr: 'KDV (ضريبة القيمة المضافة)',
        taxSystemNameEn: 'KDV (Katma Değer Vergisi)',
        defaultVatRate: 20,
        taxTypes: [
            {
                code: 'kdv_standard',
                nameAr: 'KDV قياسية 20%',
                nameEn: 'KDV Standard 20%',
                defaultRate: 20,
                isDefault: true,
            },
            {
                code: 'kdv_reduced_10',
                nameAr: 'KDV مخفضة 10%',
                nameEn: 'KDV Reduced 10%',
                defaultRate: 10,
                isDefault: false,
            },
            {
                code: 'kdv_reduced_1',
                nameAr: 'KDV مخفضة 1%',
                nameEn: 'KDV Reduced 1%',
                defaultRate: 1,
                isDefault: false,
            },
            {
                code: 'kdv_exempt',
                nameAr: 'معفاة من KDV',
                nameEn: 'KDV Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'Vergi Numarası (الرقم الضريبي)',
                labelEn: 'Vergi Numarası (Tax Number)',
                placeholder: 'XXXXXXXXXX',
                pattern: '^\\d{10}$',
                length: 10,
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'الفاتورة الإلكترونية التركية (e-Fatura)',
        electronicInvoicingNameEn: 'e-Fatura / e-Arşiv',
        fiscalYearDefaultMonth: 1,
    },

    // ─── Egypt ──────────────────────────────────────────────────────────
    EG: {
        countryCode: 'EG',
        nameAr: 'مصر',
        nameEn: 'Egypt',
        flag: '🇪🇬',
        currency: 'EGP',
        currencySymbol: 'ج.م',
        taxSystemNameAr: 'ضريبة القيمة المضافة',
        taxSystemNameEn: 'Value Added Tax (VAT)',
        defaultVatRate: 14,
        taxTypes: [
            {
                code: 'vat_standard',
                nameAr: 'ضريبة قيمة مضافة 14%',
                nameEn: 'VAT Standard 14%',
                defaultRate: 14,
                isDefault: true,
            },
            {
                code: 'vat_table_tax',
                nameAr: 'ضريبة جدول',
                nameEn: 'Table Tax',
                defaultRate: 0,
                isDefault: false,
                description: {
                    ar: 'ضريبة خاصة على سلع محددة',
                    en: 'Special tax on specific goods',
                },
            },
            {
                code: 'vat_exempt',
                nameAr: 'معفاة',
                nameEn: 'Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'رقم التسجيل الضريبي',
                labelEn: 'Tax Registration Number',
                placeholder: 'XXX-XXX-XXX',
                pattern: '^\\d{9}$',
                length: 9,
            },
            {
                labelAr: 'السجل التجاري',
                labelEn: 'Commercial Register',
                placeholder: 'XXXXXX',
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'منظومة الفاتورة الإلكترونية (ETA)',
        electronicInvoicingNameEn: 'Egyptian Tax Authority E-Invoice',
        fiscalYearDefaultMonth: 7, // July
    },

    // ─── United States ──────────────────────────────────────────────────
    US: {
        countryCode: 'US',
        nameAr: 'الولايات المتحدة',
        nameEn: 'United States',
        flag: '🇺🇸',
        currency: 'USD',
        currencySymbol: '$',
        taxSystemNameAr: 'ضريبة المبيعات (Sales Tax)',
        taxSystemNameEn: 'Sales Tax',
        defaultVatRate: 0,
        taxTypes: [
            {
                code: 'sales_tax',
                nameAr: 'ضريبة مبيعات الولاية',
                nameEn: 'State Sales Tax',
                defaultRate: 0,
                isDefault: true,
                description: {
                    ar: 'تختلف حسب الولاية (0% - 10.25%)',
                    en: 'Varies by state (0% - 10.25%)',
                },
            },
            {
                code: 'use_tax',
                nameAr: 'ضريبة الاستخدام',
                nameEn: 'Use Tax',
                defaultRate: 0,
                isDefault: false,
            },
            {
                code: 'exempt',
                nameAr: 'معفاة',
                nameEn: 'Tax Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'EIN (رقم تعريف صاحب العمل)',
                labelEn: 'Employer Identification Number (EIN)',
                placeholder: 'XX-XXXXXXX',
                pattern: '^\\d{2}-\\d{7}$',
                length: 10,
            },
        ],
        hasElectronicInvoicing: false,
        fiscalYearDefaultMonth: 1,
    },

    // ─── United Kingdom ─────────────────────────────────────────────────
    GB: {
        countryCode: 'GB',
        nameAr: 'المملكة المتحدة',
        nameEn: 'United Kingdom',
        flag: '🇬🇧',
        currency: 'GBP',
        currencySymbol: '£',
        taxSystemNameAr: 'ضريبة القيمة المضافة (VAT)',
        taxSystemNameEn: 'Value Added Tax (VAT)',
        defaultVatRate: 20,
        taxTypes: [
            {
                code: 'vat_standard',
                nameAr: 'VAT قياسية 20%',
                nameEn: 'Standard Rate 20%',
                defaultRate: 20,
                isDefault: true,
            },
            {
                code: 'vat_reduced',
                nameAr: 'VAT مخفضة 5%',
                nameEn: 'Reduced Rate 5%',
                defaultRate: 5,
                isDefault: false,
            },
            {
                code: 'vat_zero',
                nameAr: 'VAT صفرية',
                nameEn: 'Zero Rate',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'رقم VAT',
                labelEn: 'VAT Registration Number',
                placeholder: 'GB XXX XXXX XX',
                pattern: '^GB\\d{9}$',
                length: 11,
            },
            {
                labelAr: 'رقم الشركة',
                labelEn: 'Company Registration Number',
                placeholder: 'XXXXXXXX',
                length: 8,
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'Making Tax Digital (MTD)',
        electronicInvoicingNameEn: 'Making Tax Digital (MTD)',
        fiscalYearDefaultMonth: 4, // April
    },

    // ─── Germany ────────────────────────────────────────────────────────
    DE: {
        countryCode: 'DE',
        nameAr: 'ألمانيا',
        nameEn: 'Germany',
        flag: '🇩🇪',
        currency: 'EUR',
        currencySymbol: '€',
        taxSystemNameAr: 'USt/MwSt (ضريبة القيمة المضافة)',
        taxSystemNameEn: 'Umsatzsteuer (USt/MwSt)',
        defaultVatRate: 19,
        taxTypes: [
            {
                code: 'ust_standard',
                nameAr: 'USt قياسية 19%',
                nameEn: 'Standard Rate 19%',
                defaultRate: 19,
                isDefault: true,
            },
            {
                code: 'ust_reduced',
                nameAr: 'USt مخفضة 7%',
                nameEn: 'Reduced Rate 7%',
                defaultRate: 7,
                isDefault: false,
            },
            {
                code: 'ust_exempt',
                nameAr: 'معفاة من USt',
                nameEn: 'USt Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'USt-IdNr (رقم الهوية الضريبية)',
                labelEn: 'USt-IdNr (VAT ID)',
                placeholder: 'DE XXXXXXXXX',
                pattern: '^DE\\d{9}$',
                length: 11,
            },
            {
                labelAr: 'Steuernummer (الرقم الضريبي)',
                labelEn: 'Steuernummer (Tax Number)',
                placeholder: 'XX/XXX/XXXXX',
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'الفاتورة الإلكترونية الألمانية (ZUGFeRD/XRechnung)',
        electronicInvoicingNameEn: 'ZUGFeRD / XRechnung',
        fiscalYearDefaultMonth: 1,
    },

    // ─── Jordan ─────────────────────────────────────────────────────────
    JO: {
        countryCode: 'JO',
        nameAr: 'الأردن',
        nameEn: 'Jordan',
        flag: '🇯🇴',
        currency: 'JOD',
        currencySymbol: 'د.أ',
        taxSystemNameAr: 'ضريبة المبيعات العامة (GST)',
        taxSystemNameEn: 'General Sales Tax (GST)',
        defaultVatRate: 16,
        taxTypes: [
            {
                code: 'gst_standard',
                nameAr: 'ضريبة مبيعات 16%',
                nameEn: 'GST Standard 16%',
                defaultRate: 16,
                isDefault: true,
            },
            {
                code: 'gst_special',
                nameAr: 'ضريبة خاصة',
                nameEn: 'Special Tax',
                defaultRate: 0,
                isDefault: false,
            },
            {
                code: 'gst_exempt',
                nameAr: 'معفاة',
                nameEn: 'Exempt',
                defaultRate: 0,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'الرقم الضريبي',
                labelEn: 'Tax Identification Number',
                placeholder: 'XXXXXXXXX',
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'نظام الفوترة الوطني (JOFOTARA)',
        electronicInvoicingNameEn: 'JOFOTARA E-Invoicing',
        fiscalYearDefaultMonth: 1,
    },

    // ─── Kuwait ─────────────────────────────────────────────────────────
    KW: {
        countryCode: 'KW',
        nameAr: 'الكويت',
        nameEn: 'Kuwait',
        flag: '🇰🇼',
        currency: 'KWD',
        currencySymbol: 'د.ك',
        taxSystemNameAr: 'لا توجد ضريبة قيمة مضافة',
        taxSystemNameEn: 'No VAT (Planned)',
        defaultVatRate: 0,
        taxTypes: [
            {
                code: 'no_vat',
                nameAr: 'لا توجد ضريبة',
                nameEn: 'No VAT',
                defaultRate: 0,
                isDefault: true,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'السجل التجاري',
                labelEn: 'Commercial Registration',
                placeholder: 'XXXXXX',
            },
        ],
        hasElectronicInvoicing: false,
        fiscalYearDefaultMonth: 4, // April
    },

    // ─── Qatar ──────────────────────────────────────────────────────────
    QA: {
        countryCode: 'QA',
        nameAr: 'قطر',
        nameEn: 'Qatar',
        flag: '🇶🇦',
        currency: 'QAR',
        currencySymbol: 'ر.ق',
        taxSystemNameAr: 'لا توجد ضريبة قيمة مضافة',
        taxSystemNameEn: 'No VAT',
        defaultVatRate: 0,
        taxTypes: [
            {
                code: 'no_vat',
                nameAr: 'لا توجد ضريبة',
                nameEn: 'No VAT',
                defaultRate: 0,
                isDefault: true,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'السجل التجاري',
                labelEn: 'Commercial Registration',
                placeholder: 'XXXXXX',
            },
        ],
        hasElectronicInvoicing: false,
        fiscalYearDefaultMonth: 1,
    },

    // ─── France ─────────────────────────────────────────────────────────
    FR: {
        countryCode: 'FR',
        nameAr: 'فرنسا',
        nameEn: 'France',
        flag: '🇫🇷',
        currency: 'EUR',
        currencySymbol: '€',
        taxSystemNameAr: 'TVA (ضريبة القيمة المضافة)',
        taxSystemNameEn: 'TVA (Taxe sur la valeur ajoutée)',
        defaultVatRate: 20,
        taxTypes: [
            {
                code: 'tva_standard',
                nameAr: 'TVA قياسية 20%',
                nameEn: 'TVA Standard 20%',
                defaultRate: 20,
                isDefault: true,
            },
            {
                code: 'tva_intermediate',
                nameAr: 'TVA متوسطة 10%',
                nameEn: 'TVA Intermediate 10%',
                defaultRate: 10,
                isDefault: false,
            },
            {
                code: 'tva_reduced',
                nameAr: 'TVA مخفضة 5.5%',
                nameEn: 'TVA Reduced 5.5%',
                defaultRate: 5.5,
                isDefault: false,
            },
            {
                code: 'tva_super_reduced',
                nameAr: 'TVA فائقة الانخفاض 2.1%',
                nameEn: 'TVA Super Reduced 2.1%',
                defaultRate: 2.1,
                isDefault: false,
            },
        ],
        taxIdFormats: [
            {
                labelAr: 'رقم TVA الداخلي',
                labelEn: 'Numéro de TVA intracommunautaire',
                placeholder: 'FR XX XXXXXXXXX',
                pattern: '^FR\\w{2}\\d{9}$',
                length: 13,
            },
            {
                labelAr: 'SIRET',
                labelEn: 'SIRET Number',
                placeholder: 'XXXXXXXXXXXXX',
                length: 14,
            },
        ],
        hasElectronicInvoicing: true,
        electronicInvoicingNameAr: 'Factur-X / Chorus Pro',
        electronicInvoicingNameEn: 'Factur-X / Chorus Pro',
        fiscalYearDefaultMonth: 1,
    },
};

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Get all available countries sorted by Arabic name
 */
export function getAvailableCountries() {
    return Object.values(COUNTRY_TAX_CONFIGS).sort((a, b) =>
        a.nameAr.localeCompare(b.nameAr, 'ar')
    );
}

/**
 * Get tax config for a specific country code
 */
export function getCountryTaxConfig(countryCode: string): CountryTaxConfig | null {
    return COUNTRY_TAX_CONFIGS[countryCode] || null;
}

/**
 * Get the default tax type for a country
 */
export function getDefaultTaxType(countryCode: string): TaxType | null {
    const config = COUNTRY_TAX_CONFIGS[countryCode];
    if (!config) return null;
    return config.taxTypes.find(t => t.isDefault) || config.taxTypes[0] || null;
}

/**
 * Get country flag emoji
 */
export function getCountryFlag(countryCode: string): string {
    return COUNTRY_TAX_CONFIGS[countryCode]?.flag || '🏳️';
}

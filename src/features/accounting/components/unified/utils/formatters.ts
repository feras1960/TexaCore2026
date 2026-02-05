/**
 * Number Formatting Utilities - أدوات تنسيق الأرقام
 * يدعم التبديل بين الأرقام العربية والإنجليزية حسب إعدادات المستخدم
 */

// Arabic-Indic numerals mapping
const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * تحويل الأرقام من عربية إلى إنجليزية
 */
export function toEnglishNumerals(str: string | number): string {
    const text = String(str);
    return text.replace(/[٠-٩]/g, (d) => englishNumerals[arabicNumerals.indexOf(d)]);
}

/**
 * تحويل الأرقام من إنجليزية إلى عربية
 */
export function toArabicNumerals(str: string | number): string {
    const text = String(str);
    return text.replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d)]);
}

/**
 * Format number based on user preference
 * @param value - The number to format
 * @param useArabicNumerals - Whether to use Arabic numerals (from settings)
 * @param options - Intl.NumberFormat options
 */
export function formatNumber(
    value: number | string | undefined | null,
    useArabicNumerals: boolean = false,
    options: Intl.NumberFormatOptions = {}
): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    // Always format with English locale first for consistency
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
        ...options,
    }).format(num);

    // Convert to Arabic numerals if preferred
    if (useArabicNumerals) {
        return toArabicNumerals(formatted);
    }

    return formatted;
}

/**
 * Format currency with proper symbol and numerals
 */
/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
        SAR: 'ر.س',
        USD: '$',
        EUR: '€',
        GBP: '£',
        AED: 'د.إ',
        EGP: 'ج.م',
        KWD: 'د.ك',
        QAR: 'ر.ق',
        BHD: 'د.ب',
        OMR: 'ر.ع',
        JOD: 'د.أ',
    };
    return symbols[currency] || currency;
}

/**
 * Format currency with proper symbol and numerals
 */
export function formatCurrency(
    value: number | string | undefined | null,
    currency: string = 'SAR',
    useArabicNumerals: boolean = false,
    showSymbol: boolean = true
): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const symbol = getCurrencySymbol(currency);

    // Format number
    const formatted = formatNumber(num, useArabicNumerals, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (!showSymbol) return formatted;

    // Position symbol based on currency (Arabic currencies typically put symbol after)
    const arabicCurrencies = ['SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD'];
    if (arabicCurrencies.includes(currency)) {
        return `${formatted} ${symbol}`;
    }

    return `${symbol}${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(
    value: number | string | undefined | null,
    useArabicNumerals: boolean = false,
    decimals: number = 1
): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const formatted = formatNumber(num, useArabicNumerals, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    return `${formatted}%`;
}

/**
 * Format date with proper numerals
 */
export function formatDate(
    date: Date | string | undefined | null,
    useArabicNumerals: boolean = false,
    format: 'short' | 'medium' | 'long' = 'short'
): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    let formatted: string;

    switch (format) {
        case 'short':
            formatted = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
            break;
        case 'medium':
            formatted = d.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            break;
        case 'long':
            formatted = d.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            break;
    }

    if (useArabicNumerals) {
        return toArabicNumerals(formatted);
    }

    return formatted;
}

/**
 * Format accounting number (with parentheses for negative)
 */
export function formatAccountingNumber(
    value: number | string | undefined | null,
    useArabicNumerals: boolean = false
): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const absFormatted = formatNumber(Math.abs(num), useArabicNumerals, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (num < 0) {
        return `(${absFormatted})`;
    }

    return absFormatted;
}

/**
 * Get compact number (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(
    value: number | string | undefined | null,
    useArabicNumerals: boolean = false
): string {
    if (value === undefined || value === null || value === '') return '-';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const absNum = Math.abs(num);
    let formatted: string;

    if (absNum >= 1000000000) {
        formatted = (num / 1000000000).toFixed(1) + 'B';
    } else if (absNum >= 1000000) {
        formatted = (num / 1000000).toFixed(1) + 'M';
    } else if (absNum >= 1000) {
        formatted = (num / 1000).toFixed(1) + 'K';
    } else {
        formatted = num.toFixed(0);
    }

    if (useArabicNumerals) {
        return toArabicNumerals(formatted);
    }

    return formatted;
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with ENGLISH numerals (1, 2, 3) regardless of language
 * This ensures consistency across all languages including Arabic
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'SAR', 
  _locale: string = 'en-US'
): string {
  // Always use en-US locale for English numerals
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with ENGLISH numerals (1, 2, 3) regardless of language
 * This ensures consistency across all languages including Arabic
 */
export function formatNumber(num: number, _locale: string = 'en-US'): string {
  // Always use en-US locale for English numerals
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format number with decimal places
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format percentage with ENGLISH numerals
 */
export function formatPercentage(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}

/**
 * Format date - uses locale for month/day names but English numerals
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // For Arabic, we use ar-u-nu-latn to force Latin (English) numerals
  const effectiveLocale = locale === 'ar-SA' || locale === 'ar' ? 'ar-u-nu-latn' : locale;
  
  return new Intl.DateTimeFormat(effectiveLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format short date with ENGLISH numerals
 */
export function formatShortDate(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // For Arabic, we use ar-u-nu-latn to force Latin (English) numerals
  const effectiveLocale = locale === 'ar-SA' || locale === 'ar' ? 'ar-u-nu-latn' : locale;
  
  return new Intl.DateTimeFormat(effectiveLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Format time with ENGLISH numerals
 */
export function formatTime(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Always use English numerals
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format date and time with ENGLISH numerals
 */
export function formatDateTime(date: Date | string, locale: string = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const effectiveLocale = locale === 'ar-SA' || locale === 'ar' ? 'ar-u-nu-latn' : locale;
  
  return new Intl.DateTimeFormat(effectiveLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Convert number to words (Arabic)
 * Used for amounts in words on receipts/invoices
 */
export function numberToArabicWords(num: number): string {
  // Simplified implementation - can be expanded
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  if (num === 0) return 'صفر';
  if (num < 10) return ones[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (one === 0) return tens[ten];
    return `${ones[one]} و${tens[ten]}`;
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    if (remainder === 0) return hundreds[hundred];
    return `${hundreds[hundred]} و${numberToArabicWords(remainder)}`;
  }
  
  // For larger numbers, just return the formatted number
  return formatNumber(num);
}

/**
 * Convert number to words (English)
 */
export function numberToEnglishWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return one === 0 ? tens[ten] : `${tens[ten]}-${ones[one]}`;
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return remainder === 0 
      ? `${ones[hundred]} Hundred` 
      : `${ones[hundred]} Hundred ${numberToEnglishWords(remainder)}`;
  }
  
  // For larger numbers, just return the formatted number
  return formatNumber(num);
}

/**
 * Format amount with currency symbol (always English numerals)
 */
export function formatAmountWithSymbol(
  amount: number, 
  currencySymbol: string = 'ر.س'
): string {
  return `${formatNumber(amount)} ${currencySymbol}`;
}

/**
 * Export Utilities - أدوات التصدير الاحترافية
 * 
 * تصميم احترافي يشمل:
 * - شعار وبيانات شركة المشترك
 * - فواصل عمودية أنيقة
 * - مجاميع المدين والدائن والرصيد
 * - الرصيد بالتفقيط
 * - هوية TexaCore ERP
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// === Types ===
export interface ExportColumn {
    key: string;
    header: string;
    width?: number;
    type?: 'text' | 'number' | 'currency' | 'date' | 'status' | 'debit' | 'credit';
}

export interface CompanyInfo {
    name: string;
    nameEn?: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    taxNumber?: string;
}

export interface ExportOptions {
    filename?: string;
    title?: string;
    subtitle?: string;
    isRTL?: boolean;
    columns: ExportColumn[];
    data: Record<string, any>[];
    companyInfo?: CompanyInfo;
    showTotals?: boolean;
    showAmountInWords?: boolean;
    debitKey?: string;
    creditKey?: string;
    balanceKey?: string;
}

// === Number to Arabic Words (تفقيط) ===
function numberToArabicWords(num: number): string {
    if (num === 0) return 'صفر';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const isNegative = num < 0;
    num = Math.abs(Math.floor(num));

    if (num < 20) return (isNegative ? 'سالب ' : '') + ones[num];
    if (num < 100) {
        const ten = Math.floor(num / 10);
        const one = num % 10;
        return (isNegative ? 'سالب ' : '') + (one ? ones[one] + ' و' : '') + tens[ten];
    }
    if (num < 1000) {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        return (isNegative ? 'سالب ' : '') + hundreds[hundred] + (remainder ? ' و' + numberToArabicWords(remainder) : '');
    }
    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        let thousandWord = thousands === 1 ? 'ألف' : thousands === 2 ? 'ألفان' : thousands < 11 ? ones[thousands] + ' آلاف' : numberToArabicWords(thousands) + ' ألف';
        return (isNegative ? 'سالب ' : '') + thousandWord + (remainder ? ' و' + numberToArabicWords(remainder) : '');
    }
    if (num < 1000000000) {
        const millions = Math.floor(num / 1000000);
        const remainder = num % 1000000;
        let millionWord = millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : millions < 11 ? ones[millions] + ' ملايين' : numberToArabicWords(millions) + ' مليون';
        return (isNegative ? 'سالب ' : '') + millionWord + (remainder ? ' و' + numberToArabicWords(remainder) : '');
    }

    return num.toLocaleString('ar-SA');
}

// === Number to English Words ===
function numberToEnglishWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const isNegative = num < 0;
    num = Math.abs(Math.floor(num));

    if (num < 20) return (isNegative ? 'Negative ' : '') + ones[num];
    if (num < 100) {
        const ten = Math.floor(num / 10);
        const one = num % 10;
        return (isNegative ? 'Negative ' : '') + tens[ten] + (one ? '-' + ones[one] : '');
    }
    if (num < 1000) {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        return (isNegative ? 'Negative ' : '') + ones[hundred] + ' Hundred' + (remainder ? ' and ' + numberToEnglishWords(remainder) : '');
    }
    if (num < 1000000) {
        const thousands = Math.floor(num / 1000);
        const remainder = num % 1000;
        return (isNegative ? 'Negative ' : '') + numberToEnglishWords(thousands) + ' Thousand' + (remainder ? ' ' + numberToEnglishWords(remainder) : '');
    }

    return num.toLocaleString('en-US');
}

// === TexaCore Logo SVG ===
const TEXACORE_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40">
  <defs>
    <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
    <linearGradient id="threadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#hexGrad)"/>
  <path d="M6,16 Q11,10 16,16 T26,16" stroke="url(#threadGrad)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="4" fill="white" opacity="0.95"/>
</svg>`;

// === System Colors ===
const COLORS = {
    primary: '#047857',       // erp-cream equivalent - green
    primaryDark: '#0d9488',   // teal
    accent: '#f59e0b',        // amber/gold
    accentDark: '#d97706',
    navy: '#0a1628',          // Updated: darker navy for footer
    navyMid: '#132238',       // Mid navy for gradients
    cream: '#fffbf5',         // erp-cream
    text: '#1f2937',
    textLight: '#6b7280',
    textMuted: '#9ca3af',
    border: '#e5e7eb',
    success: '#10b981',       // emerald for positive
    danger: '#ef4444',        // red for negative
    debit: '#3b82f6',         // blue for debit
    credit: '#f59e0b',        // amber for credit
};

// === Professional Print Template ===
function generateProfessionalHTML(options: ExportOptions, mode: 'pdf' | 'print'): string {
    const {
        filename = 'report',
        title = 'تقرير',
        subtitle,
        columns,
        data,
        isRTL = true,
        companyInfo = { name: 'شركة العميل' },
        showTotals = true,
        showAmountInWords = true,
        debitKey = 'debit',
        creditKey = 'credit',
        balanceKey = 'balance',
    } = options;

    const timestamp = new Date().toLocaleString(isRTL ? 'ar-EG-u-nu-latn' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const reportId = Date.now().toString(36).toUpperCase();

    // Calculate totals
    const totalDebit = data.reduce((sum, row) => sum + (typeof row[debitKey] === 'number' ? row[debitKey] : 0), 0);
    const totalCredit = data.reduce((sum, row) => sum + (typeof row[creditKey] === 'number' ? row[creditKey] : 0), 0);
    const totalBalance = data.reduce((sum, row) => sum + (typeof row[balanceKey] === 'number' ? row[balanceKey] : 0), 0);
    const finalBalance = totalDebit - totalCredit;

    // Amount in words
    const balanceInWords = isRTL
        ? numberToArabicWords(Math.abs(finalBalance)) + (finalBalance < 0 ? ' (دائن)' : ' (مدين)')
        : numberToEnglishWords(Math.abs(finalBalance)) + (finalBalance < 0 ? ' (Credit)' : ' (Debit)');

    // Sequence number header
    const seqHeader = `
        <th style="
            background: #e2e8f0;
            color: #1e293b;
            font-weight: 700;
            padding: 14px 8px;
            text-align: center;
            font-size: 12px;
            white-space: nowrap;
            border-bottom: 2px solid #cbd5e1;
            border-${isRTL ? 'left' : 'right'}: 1px solid #cbd5e1;
            width: 40px;
        ">#</th>
    `;

    // Build header cells with vertical dividers - matching NexaDataTable style
    const headerCells = seqHeader + columns.map((col, idx) => `
        <th style="
            background: #e2e8f0;
            color: #1e293b;
            font-weight: 700;
            padding: 14px 12px;
            text-align: ${isRTL ? 'right' : 'left'};
            font-size: 12px;
            white-space: nowrap;
            border-bottom: 2px solid #cbd5e1;
            ${idx < columns.length - 1 ? `border-${isRTL ? 'left' : 'right'}: 1px solid #cbd5e1;` : ''}
        ">${col.header}</th>
    `).join('');

    // Build body rows with dividers
    const bodyRows = data.map((row, rowIdx) => {
        const bgColor = rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Sequence number cell
        const seqCell = `<td style="
            padding: 10px 8px;
            border-bottom: 1px solid ${COLORS.border};
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            border-${isRTL ? 'left' : 'right'}: 1px solid rgba(229,231,235,0.5);
            width: 40px;
        ">${rowIdx + 1}</td>`;

        const cells = columns.map((col, colIdx) => {
            const value = row[col.key];
            let displayValue = '';
            let extraStyle = '';

            if (value === null || value === undefined) {
                displayValue = '-';
                extraStyle = `color: ${COLORS.textMuted};`;
            } else if (typeof value === 'number') {
                displayValue = new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                }).format(value);
                extraStyle = `font-weight: 600; font-family: 'Cairo', monospace; text-align: center;`;
                if (value < 0) extraStyle += `color: ${COLORS.danger};`;
                else if (value > 0 && (col.type === 'credit' || col.type === 'debit')) extraStyle += `color: ${COLORS.success};`;
            } else {
                displayValue = String(value);
            }

            return `<td style="
                padding: 10px 12px;
                border-bottom: 1px solid ${COLORS.border};
                text-align: ${isRTL ? 'right' : 'left'};
                font-size: 12px;
                color: ${COLORS.text};
                ${colIdx < columns.length - 1 ? `border-${isRTL ? 'left' : 'right'}: 1px solid rgba(229,231,235,0.5);` : ''}
                ${extraStyle}
            ">${displayValue}</td>`;
        }).join('');

        return `<tr style="background: ${bgColor};">${seqCell}${cells}</tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        
        @page {
            size: A4 portrait;
            margin: 12mm 8mm 18mm 8mm;
        }
        
        html, body {
            height: 100%;
        }
        
        @media print {
            .no-print { display: none !important; }
            *, html, body, table, th, td, tr, div, span, p, h1, h2, h3 { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            /* Running footer - fixed at bottom of every page */
            .running-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 14mm;
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                padding: 0 15px;
                background: linear-gradient(90deg, #0a1628 0%, #132238 50%, #0a1628 100%);
                color: white;
                font-size: 9px;
                font-family: 'Cairo', sans-serif;
            }
            
            /* Page counter */
            .page-counter::after {
                content: counter(page) " / " counter(pages);
            }
            
            /* Content area needs bottom padding for footer */
            .print-content {
                padding-bottom: 15mm;
            }
            
            /* Prevent breaks */
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            
            /* Hide screen footer */
            .screen-footer { display: none !important; }
        }
        
        /* Screen: hide running footer, show screen footer */
        .running-footer { display: none; }
        .screen-footer { display: flex; margin-top: 15px; }
    </style>
</head>
<body style="
    font-family: 'Cairo', 'Tajawal', sans-serif;
    background: #ffffff;
    color: ${COLORS.text};
    direction: ${isRTL ? 'rtl' : 'ltr'};
    padding: 25px;
    line-height: 1.6;
">
    <!-- Action Buttons -->
    <div class="no-print" style="position: fixed; top: 15px; ${isRTL ? 'left' : 'right'}: 15px; display: flex; gap: 10px; z-index: 1000;">
        <button onclick="window.print()" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Cairo';
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(4, 120, 87, 0.3);
        ">📄 ${mode === 'pdf' ? (isRTL ? 'حفظ PDF' : 'Save PDF') : (isRTL ? 'طباعة' : 'Print')}</button>
        <button onclick="window.close()" style="
            padding: 12px 20px;
            background: #f1f5f9;
            color: ${COLORS.navy};
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            font-family: 'Cairo';
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        ">✕ ${isRTL ? 'إغلاق' : 'Close'}</button>
    </div>

    <!-- Company Header -->
    <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 20px;
        margin-bottom: 20px;
        border-bottom: 3px solid ${COLORS.primary};
    ">
        <!-- Customer Company Info -->
        <div style="display: flex; align-items: center; gap: 15px;">
            ${companyInfo.logo
            ? `<img src="${companyInfo.logo}" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;">`
            : `<div style="width: 70px; height: 70px; background: linear-gradient(135deg, ${COLORS.navy} 0%, #374151 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 28px; color: white; font-weight: 800;">${companyInfo.name.charAt(0)}</span>
                   </div>`
        }
            <div>
                <h1 style="font-size: 22px; font-weight: 800; color: ${COLORS.navy}; margin-bottom: 3px;">${companyInfo.name}</h1>
                ${companyInfo.nameEn ? `<p style="font-size: 11px; color: ${COLORS.textLight}; margin-bottom: 3px;">${companyInfo.nameEn}</p>` : ''}
                ${companyInfo.address ? `<p style="font-size: 10px; color: ${COLORS.textMuted};">📍 ${companyInfo.address}</p>` : ''}
                <div style="display: flex; gap: 15px; margin-top: 5px; font-size: 10px; color: ${COLORS.textLight};">
                    ${companyInfo.phone ? `<span>📞 ${companyInfo.phone}</span>` : ''}
                    ${companyInfo.email ? `<span>✉️ ${companyInfo.email}</span>` : ''}
                </div>
            </div>
        </div>
        
        <!-- Report Meta -->
        <div style="text-align: ${isRTL ? 'left' : 'right'};">
            <p style="font-size: 11px; color: ${COLORS.textLight}; margin-bottom: 5px;">📅 ${timestamp}</p>
            <p style="font-size: 10px; color: ${COLORS.textMuted}; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-family: monospace;">
                REF: ${reportId}
            </p>
            ${companyInfo.taxNumber ? `<p style="font-size: 10px; color: ${COLORS.textMuted}; margin-top: 5px;">${isRTL ? 'الرقم الضريبي:' : 'Tax No:'} ${companyInfo.taxNumber}</p>` : ''}
        </div>
    </div>

    <!-- Report Title -->
    <div style="margin-bottom: 20px; text-align: ${isRTL ? 'right' : 'left'};">
        <h2 style="
            font-size: 22px;
            font-weight: 700;
            color: ${COLORS.navy};
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
        ">
            <span style="width: 5px; height: 22px; background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentDark} 100%); border-radius: 3px;"></span>
            ${title}
        </h2>
        ${subtitle ? `<p style="font-size: 13px; color: ${COLORS.textLight}; padding-${isRTL ? 'right' : 'left'}: 15px;">${subtitle}</p>` : ''}
    </div>

    <!-- Table -->
    <div style="
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
        border: 1px solid ${COLORS.border};
        margin-bottom: 20px;
    ">
        <table style="width: 100%; border-collapse: collapse;">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>
                ${bodyRows}
                ${showTotals ? `
                <!-- Single Navy Totals Footer - matching NexaDataTable UI -->
                <tr style="background: linear-gradient(90deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 50%, ${COLORS.navy} 100%);">
                    <td colspan="${columns.length + 1}" style="padding: 12px 20px; color: white;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 11px; opacity: 0.7;">${isRTL ? 'مؤشر' : 'Marked'}</span>
                                    <span style="font-size: 14px; font-weight: 600; color: #fbbf24;">0</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 11px; opacity: 0.7;">${isRTL ? 'إجمالي الدائن' : 'Total Credit'}</span>
                                    <span style="font-size: 14px; font-weight: 600;">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalCredit)}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 11px; opacity: 0.7;">${isRTL ? 'إجمالي المدين' : 'Total Debit'}</span>
                                    <span style="font-size: 14px; font-weight: 600;">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalDebit)}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 11px; opacity: 0.7;">${isRTL ? 'الرصيد الختامي' : 'Balance'}</span>
                                    <span style="font-size: 16px; font-weight: 800; color: ${finalBalance >= 0 ? '#10b981' : '#ef4444'};">
                                        ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(finalBalance)}
                                    </span>
                                </div>
                            </div>
                            ${showAmountInWords ? `
                            <div style="font-size: 11px; color: rgba(255,255,255,0.6); max-width: 400px;">
                                ${balanceInWords}
                            </div>
                            ` : ''}
                        </div>
                    </td>
                </tr>
                ` : ''}
            </tbody>
        </table>
    </div>

    <!-- Screen Footer (visible on screen only) -->
    <div class="screen-footer" style="
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: linear-gradient(90deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 50%, ${COLORS.navy} 100%);
        border-radius: 10px;
        color: white;
        margin-top: 20px;
    ">
        <div style="display: flex; align-items: center; gap: 12px;">
            ${TEXACORE_LOGO_SVG}
            <div>
                <p style="font-size: 14px; font-weight: 700; margin-bottom: 2px;">TexaCore ERP</p>
                <p style="font-size: 10px; opacity: 0.8;">${isRTL ? 'نظام إدارة الأعمال المتكامل' : 'Integrated Business Management'}</p>
            </div>
        </div>
        <div style="text-align: ${isRTL ? 'left' : 'right'};">
            <p style="font-size: 11px; opacity: 0.9; margin-bottom: 3px;">🌐 www.texacore.com</p>
            <p style="font-size: 9px; opacity: 0.7;">
                ${isRTL ? 'تم الإنشاء بواسطة نظام تيكسا كور' : 'Generated by TexaCore ERP System'}
            </p>
        </div>
    </div>

    <!-- Running Footer (appears at bottom of every printed page) -->
    <div class="running-footer">
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18">
                <defs>
                    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#047857"/>
                        <stop offset="100%" stop-color="#0d9488"/>
                    </linearGradient>
                </defs>
                <rect width="32" height="32" rx="4" fill="url(#lg)"/>
                <path d="M6,16 Q11,10 16,16 T26,16" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round"/>
                <circle cx="16" cy="16" r="2" fill="white"/>
            </svg>
            <span style="font-weight: 700; font-size: 9px;">TexaCore ERP</span>
        </div>
        <div style="opacity: 0.7; font-size: 7px;">
            www.texacore.com | ${isRTL ? 'نظام إدارة الأعمال المتكامل' : 'Integrated Business Management'}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #047857; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 8px;">
                <span class="page-counter"></span>
            </span>
        </div>
    </div>

    ${mode === 'print' ? `<script>setTimeout(() => window.print(), 800);</script>` : ''}
</body>
</html>
    `;
}

// === Excel Export ===
export function exportToExcel(options: ExportOptions): void {
    const { filename = 'export', title, columns, data, isRTL = true } = options;

    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            if (value === null || value === undefined) return '';
            if (typeof value === 'number') return value;
            if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
            return String(value);
        })
    );

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];
    if (title) { wsData.push([title]); wsData.push([]); }
    wsData.push(headers);
    wsData.push(...rows);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
    if (isRTL) ws['!dir'] = 'rtl';
    if (title) ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
}

// === PDF Export ===
export function exportToPDF(options: ExportOptions): void {
    const win = window.open('', '_blank');
    if (!win) { alert(options.isRTL ? 'يرجى السماح بالنوافذ المنبثقة' : 'Please allow popups'); return; }
    win.document.write(generateProfessionalHTML(options, 'pdf'));
    win.document.close();
}

// === Print ===
export function printTable(options: ExportOptions): void {
    const win = window.open('', '_blank');
    if (!win) { alert(options.isRTL ? 'يرجى السماح بالنوافذ المنبثقة' : 'Please allow popups'); return; }
    win.document.write(generateProfessionalHTML(options, 'print'));
    win.document.close();
}

// === Google Sheets (Direct API) ===
export async function openInGoogleSheets(options: ExportOptions & { companyId?: string; supabaseClient?: any; language?: string }): Promise<{ url?: string; error?: string }> {
    const { columns, data, companyId, supabaseClient, filename = 'export', title, isRTL = true, language } = options;

    // If no supabase client or company, fallback to Excel download
    if (!supabaseClient || !companyId) {
        exportToExcel({ ...options, filename: `${filename}_google_sheets` });
        const msg = isRTL
            ? '📥 تم تحميل ملف Excel\n\nللفتح مباشرة في Google Sheets:\nاربط حسابك في الإعدادات → التكاملات'
            : '📥 Excel downloaded\n\nTo open directly in Google Sheets:\nConnect your account in Settings → Integrations';
        alert(msg);
        return { error: 'not_connected' };
    }

    try {
        const headers = columns.map(col => col.header);
        const rows = data.map(row =>
            columns.map(col => {
                const value = row[col.key];
                if (value === null || value === undefined) return '';
                return value;
            })
        );

        const { data: result, error } = await supabaseClient.functions.invoke('google-integration', {
            body: {
                action: 'export_sheet',
                company_id: companyId,
                title: title || filename,
                subtitle: options.subtitle || '',
                company_name: options.companyInfo?.name || '',
                headers,
                rows,
                isRTL,
                language: language || (isRTL ? 'ar' : 'en'),
            }
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        if (result?.spreadsheetUrl) {
            window.open(result.spreadsheetUrl, '_blank');
            return { url: result.spreadsheetUrl };
        }

        throw new Error('No URL returned');
    } catch (err: any) {
        // If not connected, fallback to Excel
        if (err.message?.includes('NOT_CONNECTED') || err.message?.includes('not connected')) {
            exportToExcel({ ...options, filename: `${filename}_google_sheets` });
            const msg = isRTL
                ? '📥 تم تحميل ملف Excel\n\nللفتح مباشرة في Google Sheets:\nاربط حسابك في الإعدادات → التكاملات'
                : '📥 Excel downloaded\n\nTo open directly in Google Sheets:\nConnect your account in Settings → Integrations';
            alert(msg);
        }
        return { error: err.message };
    }
}

export const exportUtils = { toExcel: exportToExcel, toPDF: exportToPDF, print: printTable, toGoogleSheets: openInGoogleSheets };
export default exportUtils;

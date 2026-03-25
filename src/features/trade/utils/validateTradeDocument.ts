/**
 * 🛡️ Trade Document Validation
 *
 * Validates trade documents before save/submit/post.
 * Returns structured validation result with field-level errors.
 *
 * Used by: UnifiedTradeSheet, TradeMainTab, Save handlers
 */

export interface ValidationError {
    field: string;
    messageAr: string;
    messageEn: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    /** Formatted summary for toast display */
    summary: (lang: 'ar' | 'en') => string;
}

interface TradeValidationInput {
    data: any;
    mode: 'purchase' | 'sales';
    action: 'save' | 'submit' | 'post';
    creditLimit?: number;
    balance?: number;
    isCreditExceeded?: boolean;
}

export function validateTradeDocument({
    data,
    mode,
    action,
    creditLimit = 0,
    balance = 0,
    isCreditExceeded = false,
}: TradeValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // ─── Required Fields ───

    // 1. Party (Customer/Supplier) is required
    const partyId = data.party_id || data.customer_id || data.supplier_id;
    if (!partyId) {
        errors.push({
            field: 'party_id',
            messageAr: mode === 'sales' ? 'يرجى اختيار العميل' : 'يرجى اختيار المورد',
            messageEn: mode === 'sales' ? 'Please select a customer' : 'Please select a supplier',
            severity: 'error',
        });
    }

    // 2. Date is required
    if (!data.date) {
        errors.push({
            field: 'date',
            messageAr: 'يرجى تحديد التاريخ',
            messageEn: 'Please set the date',
            severity: 'error',
        });
    }

    // 3. At least one item for submit/post
    const items = data.items || [];
    if (action !== 'save' && items.length === 0) {
        errors.push({
            field: 'items',
            messageAr: 'يجب إضافة صنف واحد على الأقل',
            messageEn: 'At least one item is required',
            severity: 'error',
        });
    }

    // 4. Items validation — each item must have quantity > 0 and unit_price >= 0
    items.forEach((item: any, index: number) => {
        if (!item.quantity || Number(item.quantity) <= 0) {
            errors.push({
                field: `items[${index}].quantity`,
                messageAr: `الصنف #${index + 1}: الكمية يجب أن تكون أكبر من صفر`,
                messageEn: `Item #${index + 1}: Quantity must be greater than zero`,
                severity: 'error',
            });
        }
        if (item.unit_price !== undefined && Number(item.unit_price) < 0) {
            errors.push({
                field: `items[${index}].unit_price`,
                messageAr: `الصنف #${index + 1}: السعر لا يمكن أن يكون سالباً`,
                messageEn: `Item #${index + 1}: Price cannot be negative`,
                severity: 'error',
            });
        }
    });

    // 5. Exchange rate validation
    if (data.currency && data.exchange_rate !== undefined) {
        if (Number(data.exchange_rate) <= 0) {
            errors.push({
                field: 'exchange_rate',
                messageAr: 'سعر الصرف يجب أن يكون أكبر من صفر',
                messageEn: 'Exchange rate must be greater than zero',
                severity: 'error',
            });
        }
    }

    // ─── Warnings (non-blocking) ───

    // 6. Credit limit warning (sales only)
    if (mode === 'sales' && isCreditExceeded) {
        const grandTotal = Number(data.grand_total || data.total_amount || 0);
        warnings.push({
            field: 'credit_limit',
            messageAr: `⚠️ تجاوز حد الائتمان! الرصيد: ${balance.toLocaleString()} / الحد: ${creditLimit.toLocaleString()}`,
            messageEn: `⚠️ Credit limit exceeded! Balance: ${balance.toLocaleString()} / Limit: ${creditLimit.toLocaleString()}`,
            severity: 'warning',
        });
    }

    // 7. No warehouse selected
    if (!data.warehouse_id && items.length > 0) {
        const anyItemHasWarehouse = items.some((i: any) => i.warehouse_id);
        if (!anyItemHasWarehouse) {
            warnings.push({
                field: 'warehouse_id',
                messageAr: 'لم يتم تحديد مستودع — قد يؤثر على حركة المخزون',
                messageEn: 'No warehouse selected — may affect inventory movement',
                severity: 'warning',
            });
        }
    }

    // 8. Zero-price items warning
    const zeroPriceItems = items.filter((i: any) => Number(i.unit_price || 0) === 0);
    if (zeroPriceItems.length > 0 && action !== 'save') {
        warnings.push({
            field: 'items',
            messageAr: `${zeroPriceItems.length} صنف بسعر صفر`,
            messageEn: `${zeroPriceItems.length} item(s) with zero price`,
            severity: 'warning',
        });
    }

    // 9. Due date in the past
    if (data.due_date) {
        const dueDate = new Date(data.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) {
            warnings.push({
                field: 'due_date',
                messageAr: 'تاريخ الاستحقاق في الماضي',
                messageEn: 'Due date is in the past',
                severity: 'warning',
            });
        }
    }

    // ─── Build result ───
    const isValid = errors.length === 0;

    const summary = (lang: 'ar' | 'en'): string => {
        if (isValid && warnings.length === 0) {
            return lang === 'ar' ? '✅ المستند جاهز' : '✅ Document is ready';
        }
        const parts: string[] = [];
        if (errors.length > 0) {
            parts.push(
                lang === 'ar'
                    ? `❌ ${errors.length} خطأ`
                    : `❌ ${errors.length} error(s)`
            );
        }
        if (warnings.length > 0) {
            parts.push(
                lang === 'ar'
                    ? `⚠️ ${warnings.length} تنبيه`
                    : `⚠️ ${warnings.length} warning(s)`
            );
        }
        return parts.join(' | ');
    };

    return { isValid, errors, warnings, summary };
}

export default validateTradeDocument;

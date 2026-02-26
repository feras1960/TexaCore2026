/**
 * ═══════════════════════════════════════════════════════════════
 * 🔢 useNumberFormat — Hook مركزي لتنسيق الأرقام وفق إعدادات المحاسبة
 * ═══════════════════════════════════════════════════════════════
 * يجلب decimal_places من company_accounting_settings ويوفر:
 *   - fmtAmount(n): تنسيق مبالغ مالية
 *   - fmtQty(n): تنسيق كميات (دقة أقل)
 *   - decimalPlaces: عدد الخانات العشرية
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useAccountingSettings } from './useAccountingSettings';

export function useNumberFormat() {
    const { decimalPlaces } = useAccountingSettings();

    /** Format monetary amounts (uses full decimal precision) */
    const fmtAmount = useCallback((n: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(n);
    }, [decimalPlaces]);

    /** Format quantities (flexible: up to decimalPlaces but no trailing zeros) */
    const fmtQty = useCallback((n: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimalPlaces,
        }).format(n);
    }, [decimalPlaces]);

    /** Format with explicit precision override */
    const fmtFixed = useCallback((n: number, places: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: places,
            maximumFractionDigits: places,
        }).format(n);
    }, []);

    return {
        fmtAmount,
        fmtQty,
        fmtFixed,
        decimalPlaces,
    };
}

export default useNumberFormat;

// ═══════════════════════════════════════════════════════════════
// Transition Rules — قواعد التحويل بين المراحل
// ═══════════════════════════════════════════════════════════════
// يطابق is_valid_stage_transition() في PostgreSQL
// يُستخدم في Frontend للتحقق قبل إرسال الطلب
// ═══════════════════════════════════════════════════════════════

import type { PurchaseStage, SalesStage } from './stageConfig';

// ═══ قواعد تحويل المشتريات (7 مراحل) ═══
export const PURCHASE_TRANSITIONS: Record<PurchaseStage, PurchaseStage[]> = {
    request: ['quotation', 'draft', 'cancelled'],
    quotation: ['request', 'draft', 'cancelled'],
    draft: ['request', 'quotation', 'confirmed', 'cancelled'],
    confirmed: ['draft', 'received'],
    received: ['posted'],
    posted: [],
    cancelled: ['draft'],
};

// ═══ قواعد تحويل المبيعات (7 مراحل) ═══
export const SALES_TRANSITIONS: Record<SalesStage, SalesStage[]> = {
    quotation: ['reservation', 'draft', 'cancelled'],
    reservation: ['quotation', 'draft', 'cancelled'],
    draft: ['quotation', 'reservation', 'confirmed', 'cancelled'],
    confirmed: ['draft', 'delivery'],
    delivery: ['posted'],
    posted: [],
    cancelled: ['draft'],
};


/**
 * Check if a stage transition is valid (frontend mirror of DB function)
 */
export function isValidPurchaseTransition(from: PurchaseStage, to: PurchaseStage): boolean {
    const allowed = PURCHASE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}

export function isValidSalesTransition(from: SalesStage, to: SalesStage): boolean {
    const allowed = SALES_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}

/**
 * Get available next stages from current stage
 */
export function getNextPurchaseStages(currentStage: PurchaseStage): PurchaseStage[] {
    return PURCHASE_TRANSITIONS[currentStage] || [];
}

export function getNextSalesStages(currentStage: SalesStage): SalesStage[] {
    return SALES_TRANSITIONS[currentStage] || [];
}

/**
 * Unified: Check if a stage transition is valid for any transaction type
 */
export function canTransition(type: 'purchase' | 'sale', from: string, to: string): boolean {
    if (type === 'purchase') {
        return isValidPurchaseTransition(from as PurchaseStage, to as PurchaseStage);
    }
    return isValidSalesTransition(from as SalesStage, to as SalesStage);
}

/**
 * Unified: Get available next stages for any transaction type
 */
export function getNextStages(type: 'purchase' | 'sale', currentStage: string): string[] {
    if (type === 'purchase') {
        return getNextPurchaseStages(currentStage as PurchaseStage);
    }
    return getNextSalesStages(currentStage as SalesStage);
}


// ═══ بادئات الترقيم (يطابق نظام الترقيم الموحد) ═══
export const PURCHASE_NUMBER_PREFIXES: Partial<Record<PurchaseStage, string>> = {
    request: 'REQ',
    quotation: 'PQ',
    confirmed: 'PI',    // الرقم النهائي يُعطى عند التأكيد
};

export const SALES_NUMBER_PREFIXES: Partial<Record<SalesStage, string>> = {
    quotation: 'SQ',
    reservation: 'SR',
    confirmed: 'SI',    // الرقم النهائي يُعطى عند التأكيد
    delivery: 'SD',
};

// ═══ أنواع قيود المحاسبة ═══
export const JOURNAL_ENTRY_TYPES = {
    standard: 'standard',    // قيد عادي (شراء، بيع، مصروف...)
    adjustment: 'adjustment',  // قيد تسوية (فرق استلام، فرق سعر...)
    reversal: 'reversal',    // قيد عكسي (إلغاء ترحيل)
    payment: 'payment',     // قيد دفع
    closing: 'closing',     // قيد إقفال
} as const;

export type JournalEntryType = typeof JOURNAL_ENTRY_TYPES[keyof typeof JOURNAL_ENTRY_TYPES];

// ═══ سياسات فروقات الاستلام ═══
export const RECEIPT_VARIANCE_POLICIES = {
    bill_on_receipt: 'bill_on_receipt',
    cost_redistribution: 'cost_redistribution',
    debit_note: 'debit_note',
    variance_account: 'variance_account',
    manual: 'manual',
} as const;

export type ReceiptVariancePolicy = typeof RECEIPT_VARIANCE_POLICIES[keyof typeof RECEIPT_VARIANCE_POLICIES];

// ═══ Translation keys for variance policies ═══
export const VARIANCE_POLICY_LABEL_KEYS: Record<ReceiptVariancePolicy, string> = {
    bill_on_receipt: 'trade.settings.policies.billOnReceipt',
    cost_redistribution: 'trade.settings.policies.costRedistribution',
    debit_note: 'trade.settings.policies.debitNote',
    variance_account: 'trade.settings.policies.varianceAccount',
    manual: 'trade.settings.policies.manual',
};

// ═══ طرق تقييم المخزون ═══
export const INVENTORY_VALUATION_METHODS = {
    moving_average: 'moving_average',
    fifo: 'fifo',
    standard_cost: 'standard_cost',
    latest_price: 'latest_price',
} as const;

export type InventoryValuationMethod = typeof INVENTORY_VALUATION_METHODS[keyof typeof INVENTORY_VALUATION_METHODS];

export const VALUATION_METHOD_LABEL_KEYS: Record<InventoryValuationMethod, string> = {
    moving_average: 'trade.settings.valuation.movingAverage',
    fifo: 'trade.settings.valuation.fifo',
    standard_cost: 'trade.settings.valuation.standardCost',
    latest_price: 'trade.settings.valuation.latestPrice',
};

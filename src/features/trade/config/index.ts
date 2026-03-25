// ═══════════════════════════════════════════════════════════════
// Trade Config — Central Export
// ═══════════════════════════════════════════════════════════════

export {
    // Stage definitions
    PURCHASE_STAGES,
    SALES_STAGES,
    PURCHASE_PROGRESS_STAGES,
    SALES_PROGRESS_STAGES,
    PURCHASE_STAGE_ACTIONS,
    SALES_STAGE_ACTIONS,
    PURCHASE_TABS,
    getStageDefinition,
    isTabVisibleAtStage,
    getVisibleTabs,
    // Transition rules (Kanban)
    getTransitionRule,
    isTransitionAllowed,
    // Payment status
    computePaymentStatus,
    PAYMENT_STATUS_CONFIG,
    // Types
    type PurchaseStage,
    type SalesStage,
    type StageDefinition,
    type StageAction,
    type TransitionRule,
    type PaymentStatus,
} from './stageConfig';

export {
    // Transition rules (for stage buttons)
    PURCHASE_TRANSITIONS,
    SALES_TRANSITIONS,
    isValidPurchaseTransition,
    isValidSalesTransition,
    getNextPurchaseStages,
    getNextSalesStages,
    canTransition,
    getNextStages,
    // Number prefixes
    PURCHASE_NUMBER_PREFIXES,
    SALES_NUMBER_PREFIXES,
    // Journal entry types
    JOURNAL_ENTRY_TYPES,
    type JournalEntryType,
    // Variance policies
    RECEIPT_VARIANCE_POLICIES,
    VARIANCE_POLICY_LABEL_KEYS,
    type ReceiptVariancePolicy,
    // Valuation methods
    INVENTORY_VALUATION_METHODS,
    VALUATION_METHOD_LABEL_KEYS,
    type InventoryValuationMethod,
} from './transitionRules';

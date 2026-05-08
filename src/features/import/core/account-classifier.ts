/**
 * ════════════════════════════════════════════════════════════════
 * 🧠 Account Classifier — مصنف الحسابات الذكي
 * ════════════════════════════════════════════════════════════════
 * يحلل أكواد الرشيد (RSF) ويحدد المجموعة الهدف في شجرة TexaCore.
 * يحافظ على الكود الأصلي كمرجع في external_code.
 * 
 * هيكلية TexaCore:
 *   1   الأصول
 *    11  الأصول المتداولة
 *     111 الصندوق        (is_cash)
 *     112 البنوك          (is_bank)
 *     113 العملاء         (is_receivable)
 *     114 المخزون
 *     115 بضاعة في الطريق
 *    12  الأصول الثابتة
 *   2   الخصوم
 *    21  خصوم متداولة
 *     211 الموردين        (is_payable)
 *    22  خصوم طويلة الأجل
 *   3   حقوق الملكية
 *   4   الإيرادات
 *    41  إيرادات تشغيل
 *    42  إيرادات أخرى
 *   5   المصروفات
 *    51  تكلفة المبيعات
 *    52  المشتريات
 *    53  مصروفات تشغيلية
 *    59  مصروفات متنوعة
 * 
 * @module features/import/core
 */

import type { UnifiedAccount } from './unified-data-model';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ClassifiedAccount {
  /** Original RSF account */
  original: UnifiedAccount;
  /** Target TexaCore group code (e.g., '111', '211', '53') */
  targetGroupCode: string;
  /** Target group name (Arabic) */
  targetGroupName: string;
  /** Generated new TexaCore code */
  newCode: string;
  /** Classification confidence (0-100) */
  confidence: number;
  /** How was this classified? */
  classifiedBy: 'rules' | 'ai' | 'manual';
  /** Account flags */
  flags: {
    isCash: boolean;
    isBank: boolean;
    isReceivable: boolean;
    isPayable: boolean;
    isPartyAccount: boolean;
  };
  /** Status relative to existing chart */
  status: 'new' | 'exists' | 'update';
}

export interface TexaCoreGroup {
  code: string;
  name: string;
  id: string;
  parentCode: string | null;
  isCash: boolean;
  isBank: boolean;
  isReceivable: boolean;
  isPayable: boolean;
  /** Next available sequence number for children */
  nextSeq: number;
}

export interface ClassificationResult {
  classified: ClassifiedAccount[];
  stats: {
    total: number;
    byRules: number;
    byAI: number;
    unclassified: number;
    newAccounts: number;
    existingAccounts: number;
  };
  /** Mapping: old RSF code → new TexaCore code */
  codeMapping: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// RSF → TexaCore Mapping Rules
// ═══════════════════════════════════════════════════════════════

interface MappingRule {
  /** Test function: does this RSF code match? */
  test: (code: string, account: UnifiedAccount) => boolean;
  /** Target TexaCore group code */
  targetGroup: string;
  /** Target group name */
  targetName: string;
  /** Confidence level */
  confidence: number;
  /** Flags to set */
  flags?: Partial<ClassifiedAccount['flags']>;
}

const MAPPING_RULES: MappingRule[] = [
  // ─── Cash (الصندوق) ────────────────────────────────
  {
    test: (code, acc) => code === '181' || code.startsWith('181') || acc.flags.isCashAccount,
    targetGroup: '111', targetName: 'الصندوق', confidence: 98,
    flags: { isCash: true },
  },
  // ─── Banks (البنوك) ─────────────────────────────────
  {
    test: (code, acc) => code === '182' || code.startsWith('182') || acc.flags.isBankAccount,
    targetGroup: '112', targetName: 'البنوك', confidence: 98,
    flags: { isBank: true },
  },
  // ─── Customers (العملاء/الزبائن) ────────────────────
  {
    test: (code, acc) => code === '161' || code.startsWith('161') || acc.flags.isReceivable,
    targetGroup: '1131', targetName: 'ذمم العملاء', confidence: 95,
    flags: { isReceivable: true, isPartyAccount: true },
  },
  // ─── Suppliers (الموردين) ───────────────────────────
  {
    test: (code, acc) => code === '261' || code.startsWith('261') || acc.flags.isPayable,
    targetGroup: '2111', targetName: 'دين الموردين', confidence: 95,
    flags: { isPayable: true, isPartyAccount: true },
  },
  // ─── Inventory (المخزون) ────────────────────────────
  {
    test: (code) => code.startsWith('14'),
    targetGroup: '114', targetName: 'المخزون', confidence: 90,
  },
  // ─── Notes Receivable (أوراق القبض) ─────────────────
  {
    test: (code) => code.startsWith('162') || code.startsWith('163'),
    targetGroup: '113', targetName: 'ذمم العملاء - أوراق قبض', confidence: 85,
    flags: { isReceivable: true },
  },
  // ─── Other Current Assets (أصول متداولة أخرى) ───────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 11 && p <= 19 && !['14', '16', '18'].includes(code.substring(0, 2));
    },
    targetGroup: '11', targetName: 'أصول متداولة أخرى', confidence: 75,
  },
  // ─── Current assets (catch-all for 1x) ──────────────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 11 && p <= 19;
    },
    targetGroup: '11', targetName: 'أصول متداولة', confidence: 70,
  },
  // ─── Fixed Assets (أصول ثابتة) ──────────────────────
  {
    test: (code) => code.startsWith('23'),
    targetGroup: '12', targetName: 'الأصول الثابتة', confidence: 90,
  },
  // ─── Equity (حقوق الملكية) ──────────────────────────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 21 && p <= 22;
    },
    targetGroup: '3', targetName: 'حقوق الملكية', confidence: 85,
  },
  // ─── Liabilities — Suppliers (خصوم - موردين) ────────
  {
    test: (code) => code.startsWith('26'),
    targetGroup: '211', targetName: 'دين الموردين', confidence: 85,
    flags: { isPayable: true },
  },
  // ─── Other Liabilities (خصوم أخرى) ──────────────────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 25 && p <= 29;
    },
    targetGroup: '21', targetName: 'خصوم متداولة', confidence: 75,
  },
  // ─── Expenses — Cost of Sales (تكلفة المبيعات) ──────
  {
    test: (code) => code.startsWith('31'),
    targetGroup: '51', targetName: 'تكلفة المبيعات', confidence: 85,
  },
  // ─── Expenses — Purchases (المشتريات) ───────────────
  {
    test: (code) => code.startsWith('32'),
    targetGroup: '52', targetName: 'المشتريات', confidence: 85,
  },
  // ─── Expenses — Operating (مصروفات تشغيلية) ─────────
  {
    test: (code) => code.startsWith('33') || code.startsWith('34'),
    targetGroup: '53', targetName: 'مصروفات تشغيلية', confidence: 80,
  },
  // ─── Expenses — General (مصروفات عامة) ──────────────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 35 && p <= 39;
    },
    targetGroup: '59', targetName: 'مصروفات متنوعة', confidence: 75,
  },
  // ─── Revenue — Operating (إيرادات تشغيل) ────────────
  {
    test: (code) => code.startsWith('41') || code.startsWith('42'),
    targetGroup: '41', targetName: 'إيرادات التشغيل والتجارة', confidence: 85,
  },
  // ─── Revenue — Other (إيرادات أخرى) ─────────────────
  {
    test: (code) => {
      const p = parseInt(code.substring(0, 2));
      return p >= 43 && p <= 49;
    },
    targetGroup: '42', targetName: 'إيرادات أخرى', confidence: 80,
  },
];

// ═══════════════════════════════════════════════════════════════
// Main Classifier
// ═══════════════════════════════════════════════════════════════

/**
 * Classify accounts using rule-based matching.
 * Returns classified accounts with target groups and generated codes.
 */
export function classifyAccounts(
  accounts: UnifiedAccount[],
  existingGroups: TexaCoreGroup[],
  existingCodes: Set<string>,
): ClassificationResult {
  // Build group lookup
  const groupMap = new Map<string, TexaCoreGroup>();
  for (const g of existingGroups) groupMap.set(g.code, g);

  // Track sequence counters per group
  const seqCounters: Record<string, number> = {};
  for (const g of existingGroups) seqCounters[g.code] = g.nextSeq;

  // Only classify non-group (detail) accounts
  const detailAccounts = accounts.filter(a => !a.isGroup);
  const classified: ClassifiedAccount[] = [];
  const codeMapping: Record<string, string> = {};

  let byRules = 0;
  let unclassified = 0;
  let newAccounts = 0;
  let existingAccounts = 0;

  for (const acc of detailAccounts) {
    const code = acc.code;

    // Check if already exists
    if (existingCodes.has(code)) {
      existingAccounts++;
      continue;
    }

    // Try each rule in order
    let matched = false;
    for (const rule of MAPPING_RULES) {
      if (rule.test(code, acc)) {
        // Find best matching group (prefer deeper match)
        const targetCode = findBestGroup(rule.targetGroup, groupMap);

        // Generate new code
        const newCode = generateNewCode(targetCode, seqCounters, groupMap);

        classified.push({
          original: acc,
          targetGroupCode: targetCode,
          targetGroupName: groupMap.get(targetCode)?.name || rule.targetName,
          newCode,
          confidence: rule.confidence,
          classifiedBy: 'rules',
          flags: {
            isCash: rule.flags?.isCash || false,
            isBank: rule.flags?.isBank || false,
            isReceivable: rule.flags?.isReceivable || false,
            isPayable: rule.flags?.isPayable || false,
            isPartyAccount: rule.flags?.isPartyAccount || false,
          },
          status: 'new',
        });

        codeMapping[code] = newCode;
        byRules++;
        newAccounts++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Unclassified → put in "imported accounts" group
      const fallbackGroup = '119';
      const targetCode = groupMap.has(fallbackGroup) ? fallbackGroup : '11';
      const newCode = generateNewCode(targetCode, seqCounters, groupMap);

      classified.push({
        original: acc,
        targetGroupCode: targetCode,
        targetGroupName: 'حسابات مستوردة أخرى',
        newCode,
        confidence: 0,
        classifiedBy: 'rules',
        flags: { isCash: false, isBank: false, isReceivable: false, isPayable: false, isPartyAccount: false },
        status: 'new',
      });

      codeMapping[code] = newCode;
      unclassified++;
      newAccounts++;
    }
  }

  return {
    classified,
    stats: {
      total: detailAccounts.length,
      byRules,
      byAI: 0, // Will be updated by AI analyzer
      unclassified,
      newAccounts,
      existingAccounts,
    },
    codeMapping,
  };
}

/**
 * Apply AI classification results to existing classified accounts.
 * Updates the accounts that were classified with low confidence.
 */
export function applyAIClassifications(
  result: ClassificationResult,
  aiSuggestions: Array<{ originalCode: string; targetGroup: string; targetName: string; confidence: number }>,
  existingGroups: TexaCoreGroup[],
): ClassificationResult {
  const groupMap = new Map<string, TexaCoreGroup>();
  for (const g of existingGroups) groupMap.set(g.code, g);

  const seqCounters: Record<string, number> = {};
  for (const g of existingGroups) seqCounters[g.code] = g.nextSeq;

  let aiCount = 0;

  for (const suggestion of aiSuggestions) {
    const idx = result.classified.findIndex(
      c => c.original.code === suggestion.originalCode && c.confidence < 50,
    );
    if (idx >= 0 && suggestion.confidence > result.classified[idx].confidence) {
      const targetCode = findBestGroup(suggestion.targetGroup, groupMap);
      const newCode = generateNewCode(targetCode, seqCounters, groupMap);

      result.classified[idx] = {
        ...result.classified[idx],
        targetGroupCode: targetCode,
        targetGroupName: suggestion.targetName,
        newCode,
        confidence: suggestion.confidence,
        classifiedBy: 'ai',
      };
      result.codeMapping[suggestion.originalCode] = newCode;
      aiCount++;
    }
  }

  result.stats.byAI = aiCount;
  result.stats.unclassified = Math.max(0, result.stats.unclassified - aiCount);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Find the best existing group matching the target code.
 * Falls back to parent groups if exact match doesn't exist.
 */
function findBestGroup(targetCode: string, groups: Map<string, TexaCoreGroup>): string {
  if (groups.has(targetCode)) return targetCode;
  // Try parent codes progressively
  for (let len = targetCode.length - 1; len >= 1; len--) {
    const parentCode = targetCode.substring(0, len);
    if (groups.has(parentCode)) return parentCode;
  }
  return '11'; // Ultimate fallback: current assets
}

/**
 * Generate a new sequential code under the target group.
 * Uses TexaCore numbering pattern: parentCode + sequential suffix.
 */
function generateNewCode(
  parentCode: string,
  seqCounters: Record<string, number>,
  groups: Map<string, TexaCoreGroup>,
): string {
  if (!seqCounters[parentCode]) seqCounters[parentCode] = 1;

  const seq = seqCounters[parentCode];
  seqCounters[parentCode]++;

  // Determine suffix length based on parent depth
  // Level 1-2 (1-2 digits): use 2-digit suffix → 4 digits total
  // Level 3 (3 digits): use 2-digit suffix → 5 digits
  // Level 4+ (4+ digits): use 3-digit suffix → 7+ digits
  const parentLen = parentCode.length;
  let suffixLen: number;
  if (parentLen <= 2) suffixLen = 2;
  else if (parentLen === 3) suffixLen = 2;
  else suffixLen = 3;

  const suffix = String(seq).padStart(suffixLen, '0');
  const newCode = parentCode + suffix;

  // Ensure unique — if already exists, increment
  if (groups.has(newCode)) {
    return generateNewCode(parentCode, seqCounters, groups);
  }

  return newCode;
}

/**
 * Get the accounts that need AI analysis (low confidence or unclassified).
 */
export function getAccountsNeedingAI(result: ClassificationResult): ClassifiedAccount[] {
  return result.classified.filter(c => c.confidence < 50);
}

/**
 * Prepare accounts data for the AI analyzer prompt.
 */
export function prepareAIBatch(
  accounts: ClassifiedAccount[],
  groups: TexaCoreGroup[],
): { accounts: Array<{ code: string; name: string; nameAr: string; balance: number; currentGroup: string }>; groups: Array<{ code: string; name: string }> } {
  return {
    accounts: accounts.map(a => ({
      code: a.original.code,
      name: a.original.name,
      nameAr: a.original.nameAr,
      balance: (a.original.openingDebit || 0) - (a.original.openingCredit || 0),
      currentGroup: a.targetGroupCode,
    })),
    groups: groups.map(g => ({ code: g.code, name: g.name })),
  };
}

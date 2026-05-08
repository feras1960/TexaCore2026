/**
 * ════════════════════════════════════════════════════════════════
 * 🤖 AI Account Analyzer — تحليل الحسابات بالذكاء الاصطناعي
 * ════════════════════════════════════════════════════════════════
 * يستخدم Gemini Pro عبر Edge Function لتحليل الحسابات الغامضة
 * التي لم يستطع المصنف القاعدي تحديدها بدقة عالية.
 * 
 * يعمل تلقائياً بدون تدخل المستخدم لتحسين دقة التصنيف.
 * 
 * @module features/import/core
 */

import { supabase } from '@/lib/supabase';
import type { ClassifiedAccount, TexaCoreGroup } from './account-classifier';

export interface AISuggestion {
  originalCode: string;
  targetGroup: string;
  targetName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Analyze ambiguous accounts using Gemini Pro AI.
 * Sends a batch of accounts to the Edge Function for classification.
 * Returns AI-suggested classifications.
 */
export async function analyzeAccountsWithAI(
  ambiguousAccounts: ClassifiedAccount[],
  availableGroups: TexaCoreGroup[],
): Promise<AISuggestion[]> {
  if (ambiguousAccounts.length === 0) return [];

  try {
    // Prepare the prompt data
    const accountsList = ambiguousAccounts.map(a => ({
      code: a.original.code,
      name: a.original.nameAr || a.original.name,
      balance: formatBalance(a.original.openingDebit, a.original.openingCredit),
      parentCode: a.original.parentCode,
    }));

    const groupsList = availableGroups
      .filter(g => g.code.length <= 3) // Only main groups
      .map(g => ({
        code: g.code,
        name: g.name,
        isCash: g.isCash,
        isBank: g.isBank,
        isReceivable: g.isReceivable,
        isPayable: g.isPayable,
      }));

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('classify-accounts', {
      body: {
        accounts: accountsList,
        groups: groupsList,
      },
    });

    if (error) {
      console.warn('[AI Analyzer] Edge function error, falling back to rules:', error);
      return [];
    }

    // Parse AI response
    if (data?.classifications && Array.isArray(data.classifications)) {
      return data.classifications.map((c: any) => ({
        originalCode: c.code || c.originalCode,
        targetGroup: c.targetGroup || c.group,
        targetName: c.targetName || c.groupName || '',
        confidence: Math.min(c.confidence || 70, 95), // Cap at 95 — AI is advisory
        reasoning: c.reasoning || '',
      }));
    }

    return [];
  } catch (err) {
    console.warn('[AI Analyzer] Failed, continuing without AI:', err);
    return [];
  }
}

/**
 * Full classification pipeline: rules + AI (automatic).
 * This is the main entry point — runs both classifiers seamlessly.
 */
export async function classifyWithAI(
  classifyFn: () => { result: import('./account-classifier').ClassificationResult; groups: TexaCoreGroup[] },
  applyAIFn: (result: import('./account-classifier').ClassificationResult, suggestions: AISuggestion[], groups: TexaCoreGroup[]) => import('./account-classifier').ClassificationResult,
): Promise<import('./account-classifier').ClassificationResult> {
  // Step 1: Rule-based classification
  const { result, groups } = classifyFn();

  // Step 2: Find accounts needing AI help (confidence < 50)
  const needsAI = result.classified.filter(c => c.confidence < 50);

  if (needsAI.length === 0) {
    return result; // All classified with high confidence
  }

  // Step 3: Call AI (automatic — no user interaction needed)
  const aiSuggestions = await analyzeAccountsWithAI(needsAI, groups);

  if (aiSuggestions.length === 0) {
    return result; // AI unavailable, use rules only
  }

  // Step 4: Merge AI results
  return applyAIFn(result, aiSuggestions, groups);
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatBalance(debit: number, credit: number): string {
  const net = (debit || 0) - (credit || 0);
  if (net > 0) return `مدين ${net.toLocaleString()}`;
  if (net < 0) return `دائن ${Math.abs(net).toLocaleString()}`;
  return 'صفر';
}

// ═══════════════════════════════════════════════════════════════
// 💱 Smart Currency Recognition — التعرف الذكي على العملات
// ═══════════════════════════════════════════════════════════════

/** Common currency patterns for rule-based fallback */
const CURRENCY_PATTERNS: Record<string, string> = {
  'dollar': 'USD', 'دولار': 'USD', '$': 'USD',
  'euro': 'EUR', 'يورو': 'EUR', '€': 'EUR',
  'pound': 'GBP', 'جنيه': 'GBP', '£': 'GBP',
  'lira': 'TRY', 'ليرة': 'TRY', 'ليرة تركية': 'TRY',
  'ليرة سورية': 'SYP', 'ليرة لبنانية': 'LBP',
  'ريال': 'SAR', 'ريال سعودي': 'SAR',
  'درهم': 'AED', 'درهم اماراتي': 'AED',
  'دينار': 'KWD', 'دينار كويتي': 'KWD', 'دينار عراقي': 'IQD',
  'гривня': 'UAH', 'hryvnia': 'UAH', 'гривна': 'UAH', '₴': 'UAH',
  'рубль': 'RUB', 'rubl': 'RUB', '₽': 'RUB',
  'злотий': 'PLN', 'zloty': 'PLN',
  'lei': 'RON', 'лей': 'RON',
};

export interface CurrencyRecognition {
  sourceNum: number;
  sourceName: string;
  isoCode: string;
  confidence: number;
  recognizedBy: 'rules' | 'ai';
}

/**
 * Smart currency recognition — identifies ISO codes from local names.
 * Uses rules first, then AI for unknowns.
 */
export async function recognizeCurrencies(
  currencies: Array<{ num: number; name: string; nameAr?: string; rate: number }>,
): Promise<CurrencyRecognition[]> {
  const results: CurrencyRecognition[] = [];
  const needsAI: Array<{ num: number; name: string }> = [];

  for (const c of currencies) {
    const searchText = `${c.name} ${c.nameAr || ''}`.toLowerCase();
    let matched = false;

    for (const [pattern, isoCode] of Object.entries(CURRENCY_PATTERNS)) {
      if (searchText.includes(pattern.toLowerCase())) {
        results.push({
          sourceNum: c.num, sourceName: c.name,
          isoCode, confidence: 90, recognizedBy: 'rules',
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Base currency is typically the first
      if (c.num === 1) {
        results.push({
          sourceNum: c.num, sourceName: c.name,
          isoCode: 'UAH', confidence: 60, recognizedBy: 'rules',
        });
      } else {
        needsAI.push({ num: c.num, name: c.name });
      }
    }
  }

  // Ask AI for unrecognized currencies
  if (needsAI.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('classify-accounts', {
        body: {
          task: 'currency_recognition',
          currencies: needsAI,
        },
      });

      if (!error && data?.currencies) {
        for (const aiResult of data.currencies) {
          results.push({
            sourceNum: aiResult.num, sourceName: aiResult.name,
            isoCode: aiResult.isoCode || 'XXX',
            confidence: Math.min(aiResult.confidence || 70, 95),
            recognizedBy: 'ai',
          });
        }
      }
    } catch {
      // Fallback: assign generic codes
      for (const c of needsAI) {
        results.push({
          sourceNum: c.num, sourceName: c.name,
          isoCode: c.name.substring(0, 3).toUpperCase(),
          confidence: 30, recognizedBy: 'rules',
        });
      }
    }
  }

  return results;
}

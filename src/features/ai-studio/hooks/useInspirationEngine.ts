// =============================================
// استوديو الإلهام - Hook محرك التوليد
// يربط النواة (Core) بالواجهة (UI)
// =============================================

import { useState, useCallback } from 'react';
import type { DesignSettings, GenerationResult } from '../core/types';
import { InspirationEngine } from '../core/InspirationEngine';

interface UseInspirationEngineReturn {
  isGenerating: boolean;
  result: GenerationResult | null;
  error: string | null;
  generate: (settings: DesignSettings, referenceImageUrl: string) => Promise<GenerationResult>;
  reset: () => void;
}

/**
 * Hook لمحرك التوليد
 * يدير حالة التوليد ويربط الواجهة بالنواة
 */
export function useInspirationEngine(): UseInspirationEngineReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    settings: DesignSettings,
    referenceImageUrl: string,
  ): Promise<GenerationResult> => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const generationResult = await InspirationEngine.generate(settings, referenceImageUrl);
      
      setResult(generationResult);
      if (!generationResult.success) {
        setError(generationResult.error || 'Generation failed');
      }
      
      return generationResult;
    } catch (err: any) {
      const message = err.message || 'Unknown error';
      setError(message);
      const failedResult: GenerationResult = { success: false, error: message };
      setResult(failedResult);
      return failedResult;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setResult(null);
    setError(null);
  }, []);

  return { isGenerating, result, error, generate, reset };
}

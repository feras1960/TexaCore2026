// =============================================
// استوديو الإلهام - محرك التوليد الأساسي V4
// التحليل: عبر Edge Function
// التوليد: مباشرة مع Google Gemini API (يتجاوز قيود المنطقة)
// =============================================

import { supabase } from '@/lib/supabase';
import type { DesignSettings, GenerationResult, FabricType, PatternStyle } from './types';
import { buildShortPrompt } from '../prompts/promptBuilder';

/**
 * نتيجة تحليل الصورة
 */
export interface FabricAnalysisResult {
  fabric_type: string;
  pattern_type: string;
  pattern_description: string;
  base_color: string;
  overall_mood: string;
  colors: Array<{ name: string; hex: string; location: string }>;
  texture_detail: string;
  suggested_uses: string[];
  luxury_level: string;
  weight: string;
  season: string;
}

/**
 * بطاقة الإلهام المقترحة
 */
export interface InspirationCard {
  id: string;
  name: string;
  patternStyle: string;
  fabricType: string;
  baseColor: string;
  motifColor: string;
  season: string;
  sceneType: string;
}

/**
 * نتيجة التحليل الكامل
 */
export interface AnalysisResult {
  success: boolean;
  error?: string;
  analysis?: FabricAnalysisResult;
  inspirationCards?: InspirationCard[];
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://wzkklenfsaepegymfxfz.supabase.co'}/functions/v1/generate-material-images`;

// Cache for API key (fetched once from Edge Function)
let _cachedApiKey: string | null = null;
let _cachedModels: { image_gen: string; image_gen_2: string; image_gen_pro: string } | null = null;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * محرك الإلهام الأساسي V4
 * التحليل: عبر Edge Function
 * التوليد: مباشرة مع Google Gemini API
 */
export class InspirationEngine {

  /**
   * 🔑 Get API key from Edge Function (cached)
   */
  private static async getApiKey(): Promise<{ apiKey: string; models: typeof _cachedModels } | null> {
    if (_cachedApiKey && _cachedModels) {
      return { apiKey: _cachedApiKey, models: _cachedModels };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ action: 'get_api_key' }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (data.api_key) {
        _cachedApiKey = data.api_key;
        _cachedModels = data.models;
        console.log('[InspirationEngine] 🔑 API key cached for direct Gemini calls');
        return { apiKey: data.api_key, models: data.models };
      }
    } catch (err) {
      console.error('[InspirationEngine] ❌ Failed to get API key:', err);
    }
    return null;
  }

  /**
   * 🔍 تحليل صورة — يُستدعى تلقائياً عند رفع صورة
   * يعيد: نوع القماش، الرسمة، الألوان، بطاقات الإلهام
   */
  static async analyzeImage(imageUrl: string): Promise<AnalysisResult> {
    console.log('[InspirationEngine] 🔍 Analyzing image...');
    try {
      const imageData = await this.fetchImageAsBase64(imageUrl);
      if (!imageData) {
        return { success: false, error: 'Failed to load image' };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' };
      }

      const response = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          action: 'analyze',
          reference_image_base64: imageData.base64,
          reference_image_mime: imageData.mimeType,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Analysis failed (${response.status})` };
      }

      const result = await response.json();
      if (result.success) {
        console.log('[InspirationEngine] ✅ Analysis:', {
          fabric: result.fabric_analysis?.fabric_type,
          pattern: result.fabric_analysis?.pattern_type,
          colors: result.fabric_analysis?.colors?.length,
          cards: result.inspiration_cards?.length,
        });
        return {
          success: true,
          analysis: result.fabric_analysis,
          inspirationCards: result.inspiration_cards,
        };
      }

      return { success: false, error: result.error || 'Analysis failed' };
    } catch (err: any) {
      console.error('[InspirationEngine] ❌ Analysis error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 🎨 توليد تصميم جديد — مباشرة مع Google Gemini API
   */
  static async generate(
    settings: DesignSettings,
    referenceImageUrl: string,
  ): Promise<GenerationResult> {
    console.log('[InspirationEngine] 🚀 Generating design (DIRECT to Gemini)...');
    try {
      const imageData = await this.fetchImageAsBase64(referenceImageUrl);
      if (!imageData) {
        return { success: false, error: 'Failed to load reference image' };
      }

      const shortPrompt = buildShortPrompt(settings);
      console.log('[InspirationEngine] 📝 Mode:', settings.generationMode, '| Scene:', settings.sceneType);
      console.log('[InspirationEngine] 🎨 Colors:', {
        base: settings.baseColor, originalBase: settings.originalBaseColor,
        motif: settings.motifColor, originalMotif: settings.originalMotifColor,
        target: settings.colorTarget,
        hasColorChange: settings.baseColor !== settings.originalBaseColor,
      });
      console.log('[InspirationEngine] 📝 Prompt (first 500):', shortPrompt.substring(0, 500));

      // Get API key for direct Gemini calls
      const keyData = await this.getApiKey();
      if (!keyData) {
        console.error('[InspirationEngine] ❌ Could not get API key, falling back to Edge Function');
        return this.generateViaEdgeFunction(settings, referenceImageUrl, imageData, shortPrompt);
      }

      const { apiKey, models } = keyData;

      // Try each model directly from the browser
      const modelList = [
        models?.image_gen || 'gemini-2.5-flash-image',
        models?.image_gen_2 || 'gemini-3.1-flash-image-preview',
        models?.image_gen_pro || 'gemini-3-pro-image-preview',
      ];

      for (const model of modelList) {
        console.log(`[InspirationEngine] 🎨 Trying ${model} directly...`);

        try {
          const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } },
                  { text: shortPrompt },
                ],
              }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                temperature: 1.0,
              },
            }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.warn(`[InspirationEngine] ⚠️ ${model}: HTTP ${response.status} — ${errText.substring(0, 150)}`);
            continue;
          }

          const result = await response.json();
          const candidate = result?.candidates?.[0];
          const finishReason = candidate?.finishReason || '';
          const parts = candidate?.content?.parts || [];

          console.log(`[InspirationEngine] 📊 ${model}: finishReason=${finishReason}, parts=${parts.length}`);

          // Handle IMAGE_RECITATION — retry with simpler prompt
          if (finishReason === 'IMAGE_RECITATION') {
            console.warn(`[InspirationEngine] ⚠️ ${model}: IMAGE_RECITATION — retrying simpler...`);
            const simplePrompt = shortPrompt
              .replace(/LOOK at the reference image\.\s*/i, 'Using the attached fabric, ')
              .replace(/EXACT SAME|IDENTICAL|EXACT/gi, 'same')
              .replace(/\d+mm\s*(lens)?|f\/\d+(\.\d+)?/gi, '')
              .trim();

            try {
              const retryResp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    role: 'user',
                    parts: [
                      { inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } },
                      { text: simplePrompt },
                    ],
                  }],
                  generationConfig: {
                    responseModalities: ['IMAGE', 'TEXT'],
                    temperature: 1.0,
                  },
                }),
              });

              if (retryResp.ok) {
                const retryResult = await retryResp.json();
                const retryParts = retryResult?.candidates?.[0]?.content?.parts || [];
                for (const rp of retryParts) {
                  if (rp.inlineData?.data || rp.inline_data?.data) {
                    const imgData = rp.inlineData || rp.inline_data;
                    console.log(`[InspirationEngine] ✅ ${model}: image on retry!`);
                    return await this.uploadAndReturn(imgData.data, imgData.mimeType || 'image/png', model, settings);
                  }
                }
              }
            } catch { /* continue to next model */ }
            continue;
          }

          // Check for image in response
          for (const part of parts) {
            const imgData = part.inlineData || part.inline_data;
            if (imgData?.data) {
              const sizeKB = Math.round(imgData.data.length * 0.75 / 1024);
              console.log(`[InspirationEngine] ✅ ${model}: image received (${sizeKB}KB)!`);
              return await this.uploadAndReturn(imgData.data, imgData.mimeType || 'image/png', model, settings);
            }
          }

          // Log text response
          const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join(' ');
          console.warn(`[InspirationEngine] ⚠️ ${model}: no image. Text: "${textParts.substring(0, 200)}"`);
        } catch (err: any) {
          console.error(`[InspirationEngine] ❌ ${model}: ${err.message}`);
          continue;
        }
      }

      return { success: false, error: 'All models failed — try a different image or scene' };
    } catch (err: any) {
      console.error('[InspirationEngine] ❌ Error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 📤 Return image as data URL (no storage upload — save dialog handles persistence)
   */
  private static async uploadAndReturn(
    base64Data: string,
    mimeType: string,
    modelUsed: string,
    _settings: DesignSettings,
  ): Promise<GenerationResult> {
    // Return as data URL immediately — no storage upload needed
    // The Save dialog will handle uploading to storage when user explicitly saves
    const sizeKB = Math.round(base64Data.length * 0.75 / 1024);
    console.log(`[InspirationEngine] ✅ Image ready (${sizeKB}KB) — ${modelUsed}`);
    return {
      success: true,
      imageUrl: `data:${mimeType};base64,${base64Data}`,
      modelUsed,
    };
  }

  /**
   * 🔄 Fallback: generate via Edge Function (old path)
   */
  private static async generateViaEdgeFunction(
    settings: DesignSettings,
    referenceImageUrl: string,
    imageData: { base64: string; mimeType: string },
    shortPrompt: string,
  ): Promise<GenerationResult> {
    console.log('[InspirationEngine] 🔄 Falling back to Edge Function...');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: profile } = await (supabase as any)
      .from('user_profiles')
      .select('company_id, tenant_id')
      .eq('id', session.user.id)
      .single();

    const companyId = profile?.company_id || session.user.user_metadata?.company_id || '';

    const response = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        material_id: `inspiration_${Date.now()}`,
        company_id: companyId,
        reference_image_base64: imageData.base64,
        reference_image_mime: imageData.mimeType,
        generation_type: settings.sceneType === 'macro' ? 'texture' : 'usage',
        usage_context: settings.sceneType,
        material_info: {
          name: `Inspiration ${settings.fabricType}`,
          code: `insp_${settings.fabricType}`,
          fabric_type: settings.fabricType,
          design: settings.patternStyle,
          color: settings.baseColorName || settings.baseColor,
        },
        custom_short_prompt: shortPrompt,
        inspiration_mode: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[InspirationEngine] ❌ Edge Function error:', response.status, errText);
      return { success: false, error: `Generation failed (${response.status})` };
    }

    const result = await response.json();
    if (result.success && result.image) {
      console.log('[InspirationEngine] ✅ Success via Edge Function!', result.model_used);
      return {
        success: true,
        imageUrl: result.image.url,
        storagePath: result.image.storage_path,
        modelUsed: result.model_used,
        fabricAnalysis: result.fabric_analysis,
      };
    }

    return { success: false, error: result.error || 'No image returned', fabricAnalysis: result.fabric_analysis };
  }

  /**
   * صورة → base64
   */
  private static async fetchImageAsBase64(
    url: string
  ): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      const mimeType = blob.type || 'image/jpeg';
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

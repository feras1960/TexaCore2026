// ═══════════════════════════════════════════════════
// 🎨 Image Generator — Gemini API Integration
// المنهج: تحليل أولاً → ثم إنشاء صور بناءً على التحليل
// ═══════════════════════════════════════════════════

import { buildImagePrompt, buildColorVariantPrompt, getScopeForType } from "./prompt-builder.ts"
import { analyzeReferenceImage } from "./image-analyzer.ts"
import type { MaterialContext, GenerationType, UsageContext, TagOptions } from "./prompt-builder.ts"
import type { FabricAnalysis } from "./image-analyzer.ts"

// ═══ Types ═══
export interface GeneratedImageResult {
  imageData: string;      // Base64 encoded
  mimeType: string;
  type: GenerationType;
  scope: string;
  colorKey?: string;
  colorName?: string;
}

export interface ColorTarget {
  key: string;
  hex: string;
  name_ar: string;
  name_en: string;
}

export interface GenerationResult {
  images: GeneratedImageResult[];
  analysis: FabricAnalysis;
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
    }>;
  };
  finishReason?: string;
}

// ═══ Config ═══
const MODELS = {
  imageGen: 'gemini-3.1-flash-image-preview',  // لتوليد الصور
  imageGenPro: 'gemini-3-pro-image-preview',    // جودة أعلى (يُستخدم كـ fallback)
} as const;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

// ═══ Main Pipeline: Analyze → Generate ═══
export async function generateAllImages(
  apiKey: string,
  referenceImageBase64: string,
  referenceImageMime: string,
  generationTypes: GenerationType[],
  material: MaterialContext,
  usageContext?: UsageContext,
  targetColors?: ColorTarget[],
  tagOptions?: TagOptions,
): Promise<GenerationResult> {

  // ═══ الخطوة 1: تحليل الصورة المرجعية ═══
  console.log('[AI-Images] 🔬 Step 1: Analyzing reference image...');
  const analysis = await analyzeReferenceImage(
    apiKey,
    referenceImageBase64,
    referenceImageMime,
    material,
  );
  console.log(`[AI-Images] 📋 Analysis: "${analysis.oneLiner}"`);
  console.log(`[AI-Images] 🎨 Colors: ${analysis.colors.map(c => `${c.name} ${c.hex}`).join(' | ')}`);

  // ═══ الخطوة 2: إنشاء الصور بناءً على التحليل ═══
  console.log(`[AI-Images] 🎨 Step 2: Generating ${generationTypes.length} image type(s)...`);
  const results: GeneratedImageResult[] = [];

  for (const genType of generationTypes) {
    const prompt = buildImagePrompt(genType, analysis, material, usageContext, tagOptions);

    console.log(`[AI-Images]   → Generating: ${genType}...`);

    const imageResult = await callGeminiImageAPI(
      apiKey,
      referenceImageBase64,
      referenceImageMime,
      prompt,
      getTemperatureForType(genType),
    );

    if (imageResult) {
      results.push({
        imageData: imageResult.data,
        mimeType: imageResult.mimeType,
        type: genType,
        scope: getScopeForType(genType),
      });
      console.log(`[AI-Images]   ✅ ${genType} — success`);
    } else {
      console.warn(`[AI-Images]   ⚠️ ${genType} — failed after retries`);
    }
  }

  // ═══ الخطوة 3: تعميم الألوان ═══
  if (targetColors && targetColors.length > 0) {
    console.log(`[AI-Images] 🎨 Step 3: Generating ${targetColors.length} color variant(s)...`);

    for (const color of targetColors) {
      const prompt = buildColorVariantPrompt(
        analysis,
        color.name_en || color.name_ar,
        color.hex,
      );

      console.log(`[AI-Images]   → Color: ${color.name_en || color.hex}...`);

      const imageResult = await callGeminiImageAPI(
        apiKey,
        referenceImageBase64,
        referenceImageMime,
        prompt,
        0.6,
      );

      if (imageResult) {
        results.push({
          imageData: imageResult.data,
          mimeType: imageResult.mimeType,
          type: 'color_variant',
          scope: 'color',
          colorKey: color.key,
          colorName: color.name_ar || color.name_en,
        });
        console.log(`[AI-Images]   ✅ Color ${color.name_en || color.hex} — success`);
      } else {
        console.warn(`[AI-Images]   ⚠️ Color ${color.name_en || color.hex} — failed`);
      }
    }
  }

  return { images: results, analysis };
}

// ═══ Temperature per generation type ═══
function getTemperatureForType(type: GenerationType): number {
  switch (type) {
    case 'texture': return 0.4;       // دقة عالية جداً
    case 'palette': return 0.5;       // دقة عالية
    case 'color_variant': return 0.6; // مرونة محدودة
    case 'studio': return 0.7;        // توازن
    case 'usage': return 0.8;         // إبداع أكثر
    default: return 0.7;
  }
}

// ═══ Gemini API Call with Retry ═══
async function callGeminiImageAPI(
  apiKey: string,
  referenceImageBase64: string,
  referenceImageMime: string,
  prompt: string,
  temperature: number = 0.7,
): Promise<{ data: string; mimeType: string } | null> {

  const model = MODELS.imageGen;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      role: 'user',
      parts: [
        {
          inline_data: {
            mime_type: referenceImageMime || 'image/jpeg',
            data: referenceImageBase64,
          },
        },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature,
      maxOutputTokens: 8192,
      response_modalities: ["Image"],
    },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[AI-Images]     🔄 Retry ${attempt}/${MAX_RETRIES}...`);
        await sleep(RETRY_DELAY_MS * attempt);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Rate limit
      if (response.status === 429) {
        console.warn('[AI-Images]     ⏳ Rate limited — waiting 5s...');
        await sleep(5000);
        continue;
      }

      // Client errors (except 429) — don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errText = await response.text().catch(() => '');
        console.error(`[AI-Images]     ❌ Client error ${response.status}: ${errText.substring(0, 200)}`);
        
        // Try Pro model as fallback for 400 errors
        if (attempt === 0) {
          console.log('[AI-Images]     🔄 Trying Pro model fallback...');
          const proResult = await tryProModelFallback(apiKey, referenceImageBase64, referenceImageMime, prompt, temperature);
          if (proResult) return proResult;
        }
        return null;
      }

      // Server errors — retry
      if (!response.ok) {
        console.error(`[AI-Images]     ❌ Server error ${response.status}`);
        continue;
      }

      const result = await response.json();
      const candidates: GeminiCandidate[] = result?.candidates || [];

      if (candidates.length === 0) {
        console.warn('[AI-Images]     ⚠️ Empty candidates');
        continue;
      }

      // Extract first image from response
      const parts = candidates[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inline_data?.data) {
          return {
            data: part.inline_data.data,
            mimeType: part.inline_data.mime_type || 'image/png',
          };
        }
      }

      // No image in response
      const finishReason = candidates[0]?.finishReason;
      console.warn(`[AI-Images]     ⚠️ No image in response. Reason: ${finishReason}`);

      // Safety block — don't retry
      if (finishReason === 'SAFETY') {
        console.error('[AI-Images]     🛑 Blocked by safety filter — skipping');
        return null;
      }

    } catch (err) {
      console.error(`[AI-Images]     ❌ Network error (attempt ${attempt}):`, err);
      if (attempt === MAX_RETRIES) return null;
    }
  }

  return null;
}

// ═══ Pro Model Fallback ═══
async function tryProModelFallback(
  apiKey: string,
  imageBase64: string,
  imageMime: string,
  prompt: string,
  temperature: number,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const proUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.imageGenPro}:generateContent?key=${apiKey}`;
    const response = await fetch(proUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: imageMime, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: 8192,
          response_modalities: ["Image"],
        },
      }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    const parts = result?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inline_data?.data) {
        console.log('[AI-Images]     ✅ Pro model fallback succeeded');
        return { data: part.inline_data.data, mimeType: part.inline_data.mime_type || 'image/png' };
      }
    }
  } catch { /* fallback failed silently */ }
  return null;
}

// ═══ Credits Calculator ═══
export function calculateCredits(
  generationTypes: GenerationType[],
  colorCount: number,
): number {
  let total = 0;
  for (const type of generationTypes) {
    switch (type) {
      case 'studio': total += 1; break;
      case 'texture': total += 1; break;
      case 'usage': total += 1.5; break;
      case 'palette': total += 0.5; break;
    }
  }
  total += colorCount * 0.5;
  return total;
}

// ═══ Utility ═══
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

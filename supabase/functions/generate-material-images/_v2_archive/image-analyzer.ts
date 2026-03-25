// ═══════════════════════════════════════════════════
// 🔬 Image Analyzer — تحليل صورة القماش المرجعية 
// يرسل الصورة لـ Gemini النصي ليفهم: النقش، الألوان، النسيج، المادة
// ═══════════════════════════════════════════════════

// ═══ Types ═══
export interface FabricAnalysis {
  // وصف النسيج
  fabricType: string;          // e.g. "cotton linen blend", "silk charmeuse"
  weaveType: string;           // e.g. "plain weave", "twill", "satin"
  weight: string;              // e.g. "lightweight", "medium-weight", "heavy"
  hand: string;                // e.g. "soft and fluid", "crisp and structured"
  sheen: string;               // e.g. "matte", "subtle luster", "high sheen"
  
  // وصف النقش/التصميم
  patternDescription: string;  // وصف مفصل للنقش
  patternType: string;         // e.g. "floral watercolor", "geometric", "solid"
  
  // الألوان المستخرجة
  colors: Array<{
    name: string;              // e.g. "Sage Frost"
    hex: string;               // e.g. "#8FA88D"
    role: string;              // e.g. "primary", "accent", "background"
    description: string;       // e.g. "a muted pastel green-grey from the leaves"
  }>;
  
  // سياق الاستخدام المقترح
  suggestedUses: string[];     // e.g. ["bedding", "curtain", "dress"]
  
  // وصف شامل بسطر واحد
  oneLiner: string;            // e.g. "Luxurious pastel cotton linen with watercolor bird and berry print"
  
  // وصف تفصيلي للتصوير
  photographyDescription: string;
}

// ═══ Analyze Reference Image ═══
export async function analyzeReferenceImage(
  apiKey: string,
  imageBase64: string,
  imageMime: string,
  userMaterialInfo?: { name?: string; design?: string; color?: string; composition?: string; category?: string },
): Promise<FabricAnalysis> {

  const analysisModel = 'gemini-3-flash-preview'; // نموذج نصي سريع للتحليل
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${analysisModel}:generateContent?key=${apiKey}`;

  const userContext = userMaterialInfo ? `
USER-PROVIDED INFO (use as guidance, verify against the image):
- Material name: ${userMaterialInfo.name || 'Not specified'}
- Design/Pattern: ${userMaterialInfo.design || 'Not specified'}  
- Color: ${userMaterialInfo.color || 'Not specified'}
- Composition: ${userMaterialInfo.composition || 'Not specified'}
- Category: ${userMaterialInfo.category || 'Not specified'}
` : '';

  const analysisPrompt = `You are a senior textile expert and professional product photography director at a luxury fabric house.

Analyze this fabric image in extreme detail. I need your expert analysis to create world-class product photography.
${userContext}
Respond ONLY in valid JSON format with this exact structure:
{
  "fabricType": "specific fabric material (e.g., 'brushed cotton sateen', 'silk organza')",
  "weaveType": "weave construction (e.g., 'plain weave', 'satin weave', '2/1 twill')",
  "weight": "fabric weight category",
  "hand": "how it feels (drape, stiffness, softness)",
  "sheen": "surface light behavior",
  "patternDescription": "VERY detailed description of the print/pattern/design — describe every element you see: motifs, their arrangement, artistic style, scale, density",
  "patternType": "category of pattern",
  "colors": [
    {
      "name": "creative evocative name (e.g., 'Cranberry Blush', not just 'red')",
      "hex": "#hexcode",
      "role": "primary|secondary|accent|background",
      "description": "where this color appears in the fabric and its character"
    }
  ],
  "suggestedUses": ["top 3 ideal product applications for this fabric"],
  "oneLiner": "one compelling sentence describing this fabric for a catalog",
  "photographyDescription": "detailed description of the fabric as it appears — shape, folds, surface quality, how light hits it — for use in photography prompts"
}

IMPORTANT:
- Extract 3-5 distinct colors with creative, evocative names
- The photographyDescription should be detailed enough that another photographer could recreate the exact look
- Be specific about pattern elements — don't say "floral" when you can say "delicate watercolor roses with trailing ivy leaves"
- JSON only, no markdown, no explanation`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: imageMime || 'image/jpeg', data: imageBase64 } },
            { text: analysisPrompt },
          ],
        }],
        generationConfig: {
          temperature: 0.3, // دقة عالية للتحليل
          maxOutputTokens: 4096,
          response_mime_type: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      console.error(`[Analyzer] API error: ${response.status}`);
      return getDefaultAnalysis(userMaterialInfo);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.warn('[Analyzer] Empty response from Gemini');
      return getDefaultAnalysis(userMaterialInfo);
    }

    // Parse JSON — handle potential markdown wrapping
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    const analysis: FabricAnalysis = JSON.parse(cleanJson);

    // Validate minimum fields
    if (!analysis.fabricType || !analysis.colors || analysis.colors.length === 0) {
      console.warn('[Analyzer] Incomplete analysis, using defaults for missing fields');
      return mergeWithDefaults(analysis, userMaterialInfo);
    }

    console.log(`[Analyzer] ✅ Analysis complete: ${analysis.oneLiner}`);
    console.log(`[Analyzer] 🎨 Colors found: ${analysis.colors.map(c => c.name).join(', ')}`);

    return analysis;

  } catch (err) {
    console.error('[Analyzer] ❌ Analysis failed:', err);
    return getDefaultAnalysis(userMaterialInfo);
  }
}

// ═══ Fallback: Default Analysis ═══
function getDefaultAnalysis(info?: { name?: string; design?: string; color?: string; composition?: string }): FabricAnalysis {
  return {
    fabricType: info?.composition || 'woven fabric',
    weaveType: 'plain weave',
    weight: 'medium-weight',
    hand: 'soft with natural drape',
    sheen: 'subtle matte finish',
    patternDescription: info?.design ? `${info.design} pattern` : 'solid or simple pattern',
    patternType: info?.design || 'solid',
    colors: [
      { name: info?.color || 'Natural', hex: '#E8E0D0', role: 'primary', description: 'the main fabric color' },
    ],
    suggestedUses: ['dress', 'curtain', 'furniture'],
    oneLiner: `${info?.name || 'Premium fabric'} — quality textile material`,
    photographyDescription: `A ${info?.color || 'neutral'} ${info?.name || 'fabric'} with ${info?.design || 'clean'} appearance, showing natural texture and drape.`,
  };
}

// ═══ Merge partial analysis with defaults ═══
function mergeWithDefaults(partial: Partial<FabricAnalysis>, info?: { name?: string; design?: string; color?: string; composition?: string }): FabricAnalysis {
  const defaults = getDefaultAnalysis(info);
  return {
    fabricType: partial.fabricType || defaults.fabricType,
    weaveType: partial.weaveType || defaults.weaveType,
    weight: partial.weight || defaults.weight,
    hand: partial.hand || defaults.hand,
    sheen: partial.sheen || defaults.sheen,
    patternDescription: partial.patternDescription || defaults.patternDescription,
    patternType: partial.patternType || defaults.patternType,
    colors: (partial.colors && partial.colors.length > 0) ? partial.colors : defaults.colors,
    suggestedUses: partial.suggestedUses || defaults.suggestedUses,
    oneLiner: partial.oneLiner || defaults.oneLiner,
    photographyDescription: partial.photographyDescription || defaults.photographyDescription,
  };
}

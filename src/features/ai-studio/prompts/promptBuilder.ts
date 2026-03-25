// ═══════════════════════════════════════════════════════════════════
// 🎨 Prompt Builder — Gemini-Optimized Assembly V2
// ═══════════════════════════════════════════════════════════════════
// KEY INSIGHT from Gemini expert:
//   "Always lead with: Maintain the [Material] texture from the
//    reference image, but completely replace the pattern with [Pattern]."
//   This forces Gemini to prioritize the visual token of the reference
//   image for texture only.
// 
// Strategy:
//   - Short prompt → sent to AI model (2-3 sentences, BEST results)
//   - Full prompt → documentation and fallback
//
// V2 Changes:
//   - Professional mode now includes fabricType in every prompt
//   - Auto-generates descriptive color names from HEX
//   - Scene prompts refined for accuracy
//   - Custom hint limited to 200 chars
// ═══════════════════════════════════════════════════════════════════

import type { DesignSettings, PatternStyle, FabricType, SceneType } from '../core/types';
import { getApplicationMethodPrompt, getFabricTypePrompt, CAMERA_DNA } from './fabricPrompts';
import { getScenePrompt } from './scenePrompts';
import { getSeasonPrompt } from './seasonPrompts';

// ─────────────────────────────────────────
// 🎨 HEX → Descriptive Color Name Mapper
// Gemini responds much better to "Midnight Navy (#1B1B3A)"
// than just "#1B1B3A" alone.
// ─────────────────────────────────────────
const COLOR_NAME_MAP: Record<string, string> = {
  // Reds
  '#FF0000': 'Pure Red', '#B22222': 'Firebrick Red', '#DC143C': 'Crimson Red',
  '#C0392B': 'Persian Red', '#8B0000': 'Dark Red', '#CD5C5C': 'Indian Red',
  '#FF6347': 'Tomato Red', '#E74C3C': 'Alizarin Red',
  // Blues
  '#1B1B3A': 'Midnight Navy', '#000080': 'Navy Blue', '#1A5276': 'Prussian Blue',
  '#2C3E50': 'Dark Slate Blue', '#2E86C1': 'Steel Blue', '#3498DB': 'Dodger Blue',
  '#1F618D': 'Sapphire Blue', '#154360': 'Oxford Blue',
  // Greens
  '#006B3C': 'Forest Green', '#17A589': 'Persian Green', '#1ABC9C': 'Turquoise',
  '#27AE60': 'Emerald Green', '#2ECC71': 'Sea Green', '#0E6655': 'Pine Green',
  '#196F3D': 'Hunter Green', '#145A32': 'British Racing Green',
  // Purples
  '#6C3483': 'Royal Purple', '#8E44AD': 'Amethyst Purple', '#9B59B6': 'Wisteria',
  '#7D3C98': 'Plum Purple', '#4A235A': 'Deep Purple',
  // Golds & Yellows
  '#D4A017': 'Old Gold', '#F1C40F': 'Sunflower Yellow', '#F39C12': 'Saffron',
  '#D4AC0D': 'Dark Gold', '#B7950B': 'Antique Gold', '#C9A96E': 'Royal Gold',
  // Oranges
  '#E67E22': 'Tangerine', '#D35400': 'Burnt Orange', '#CA6F1E': 'Copper',
  '#F0B27A': 'Sandy Orange',
  // Browns
  '#8B4513': 'Saddle Brown', '#A0522D': 'Sienna', '#6E2C00': 'Chocolate Brown',
  '#784212': 'Espresso', '#795548': 'Coffee Brown',
  // Neutrals
  '#FFFFFF': 'Pure White', '#F5F5DC': 'Beige', '#FFFFF0': 'Ivory',
  '#FAF0E6': 'Linen White', '#000000': 'Jet Black', '#2C2C2C': 'Charcoal',
  '#808080': 'Medium Gray', '#C0C0C0': 'Silver', '#D5D8DC': 'Light Gray',
  // Pinks
  '#FF69B4': 'Hot Pink', '#FFB6C1': 'Light Pink', '#C71585': 'Magenta',
  '#E91E63': 'Rose Pink',
};

/**
 * تحويل HEX إلى اسم لون وصفي
 * يستخدم أقرب لون معروف إذا لم يوجد تطابق مباشر
 */
function getColorDisplayName(hex: string, fallbackName?: string): string {
  if (fallbackName && fallbackName.trim() && fallbackName !== hex) return fallbackName;
  const upper = hex.toUpperCase();
  if (COLOR_NAME_MAP[upper]) return COLOR_NAME_MAP[upper];
  
  // Try to find closest match by parsing RGB
  const r = parseInt(upper.slice(1, 3), 16);
  const g = parseInt(upper.slice(3, 5), 16);
  const b = parseInt(upper.slice(5, 7), 16);
  if (isNaN(r)) return hex;
  
  // Simple heuristic-based naming
  const brightness = (r + g + b) / 3;
  const isWarm = r > b;
  const isDark = brightness < 85;
  const isMid = brightness >= 85 && brightness < 170;
  const isLight = brightness >= 170;
  
  if (r > 180 && g < 100 && b < 100) return isDark ? 'Deep Red' : 'Warm Red';
  if (g > 180 && r < 100 && b < 100) return isDark ? 'Deep Green' : 'Bright Green';
  if (b > 180 && r < 100 && g < 100) return isDark ? 'Deep Blue' : 'Bright Blue';
  if (r > 180 && g > 150 && b < 80) return 'Golden Yellow';
  if (r > 150 && g < 80 && b > 150) return 'Purple';
  if (r > 150 && g > 100 && b < 50) return 'Warm Orange';
  if (isDark && !isWarm) return 'Dark Cool Tone';
  if (isDark && isWarm) return 'Dark Warm Tone';
  if (isLight) return 'Light Neutral';
  if (isMid && isWarm) return 'Medium Warm Tone';
  return 'Medium Cool Tone';
}

// ─────────────────────────────────────────
// Pattern style short labels (for short prompt)
// ─────────────────────────────────────────
const PATTERN_LABELS: Record<PatternStyle, string> = {
  damask: 'gold embroidered damask with elaborate scrollwork',
  geometric: 'sharp geometric lattice pattern',
  floral: 'vibrant painterly floral design with roses and peonies',
  abstract: 'bold abstract art-inspired splashes and forms',
  minimalist: 'subtle minimalist tone-on-tone texture',
  oriental: 'intricate oriental arabesque with gold accents',
  botanical: 'detailed botanical illustration with wild plants and ferns',
  stripes: 'elegant multi-width stripe pattern',
};

// ─────────────────────────────────────────
// Scene photography specs (for short prompt)
// ─────────────────────────────────────────
const SCENE_PHOTO: Record<SceneType, string> = {
  // ═══ عرض القماش — Fabric Display ═══
  flat_lay: 'YOU MUST SHOW: A top-down flat lay photo of the fabric draped elegantly on a dark oak surface, showing the full pattern repeat. NO person, NO model, NO product. 50mm lens.',
  table_display: 'YOU MUST SHOW: The fabric draped professionally on a display table in a luxury fabric store, with the fabric cascading off the edge showing both drape and pattern. Warm store lighting, wooden shelves in background. NO person, NO model. 35mm lens.',
  hanging: 'YOU MUST SHOW: The fabric hanging on elegant display hangers or fabric hooks in a premium textile showroom, showing the full drape and pattern from top to bottom. Professional store lighting. NO person, NO model. 50mm lens.',
  rolls: 'YOU MUST SHOW: The fabric displayed as rolled bolts in a luxury fabric store, showing the cross-section of the roll with the pattern visible, alongside other fabric rolls. Professional commercial photography. NO person, NO model. 35mm lens.',
  swirl: 'YOU MUST SHOW: The fabric artistically twisted and swirled into a beautiful spiral/rosette shape on a neutral surface, showing the pattern and texture in a creative display. Similar to how fabric stores present material samples. NO person, NO model. 85mm lens.',
  macro: 'YOU MUST SHOW: Extreme macro close-up shot showing thread-level weave detail and texture of this fabric only. NO person, NO model, NO product. 100mm macro lens.',
  
  // ═══ منتجات — Product Scenes ═══
  dress: 'YOU MUST SHOW: A professional photo of a casual day dress made from this fabric, worn by a model in a sunlit atrium. 85mm lens.',
  evening_gown: 'YOU MUST SHOW: A professional photo of a flowing evening gown made from this fabric, worn by a model on a marble staircase. 35mm lens.',
  abaya: 'YOU MUST SHOW: A professional photo of a modern abaya made from this fabric, worn by a model in an elegant desert pavilion. 50mm lens.',
  suit: 'YOU MUST SHOW: A professional photo of a tailored men\'s suit made from this fabric in a dark studio with dramatic lighting. 85mm lens.',
  curtain: 'YOU MUST SHOW: Floor-to-ceiling curtains made from this fabric hanging in a luxury penthouse window with natural daylight streaming through. NO person, NO model. 24mm lens.',
  bedding: 'YOU MUST SHOW: A complete luxury hotel BEDDING SET on a king-size bed — duvet cover, fitted sheet, flat sheet, and pillowcases ALL made from this EXACT fabric, with morning sunlight. The entire bed must be covered with this fabric. NO person, NO model, NO clothing. 35mm lens.',
  sofa: 'YOU MUST SHOW: A designer sofa upholstered with this fabric in a luxury showroom with complementary decor. NO person, NO model. 50mm lens.',
  cushion: 'YOU MUST SHOW: Decorative throw cushions made from this fabric arranged on a modern linen sofa in a styled living room. NO person, NO model. 85mm lens.',
};

// ─────────────────────────────────────────
// Fabric short labels (for inspired mode prompt)
// ─────────────────────────────────────────
const FABRIC_LABELS: Record<FabricType, string> = {
  silk: 'liquid silk sheen',
  velvet: 'dense velvet pile',
  linen: 'textured linen weave',
  cotton: 'matte cotton weave',
  lace: 'delicate lace openwork',
  chiffon: 'sheer chiffon layers',
  satin: 'glossy satin surface',
  tweed: 'rough tweed fibers',
  denim: 'rugged denim twill',
  jacquard: 'structured jacquard weave',
  organza: 'crisp organza transparency',
};

// ─────────────────────────────────────────
// Fabric type simple names (for professional mode prompt)
// Used to tell AI what MATERIAL the fabric is
// ─────────────────────────────────────────
const FABRIC_SIMPLE: Record<FabricType, string> = {
  silk: 'silk',
  velvet: 'velvet',
  linen: 'linen',
  cotton: 'cotton',
  lace: 'lace',
  chiffon: 'chiffon',
  satin: 'satin',
  tweed: 'tweed',
  denim: 'denim',
  jacquard: 'jacquard',
  organza: 'organza',
};

// ─────────────────────────────────────────
// Season mood additions
// ─────────────────────────────────────────
const SEASON_MOOD: Record<string, string> = {
  spring_summer: 'Fresh, airy spring/summer palette.',
  autumn_winter: 'Rich, warm autumn/winter tones.',
  timeless: 'Timeless classic luxury.',
};

// ─────────────────────────────────────────
// Application method short labels (for inspired mode)
// ─────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  printed: 'digitally printed',
  embroidered: 'embroidered with raised 3D thread relief',
  woven_jacquard: 'woven jacquard with tonal depth',
};

// ─────────────────────────────────────────
// Application method for professional mode
// Tells AI about surface texture characteristics
// (printed = flat surface, embroidered = raised 3D, jacquard = woven depth)
// ─────────────────────────────────────────
const METHOD_PRO: Record<string, string> = {
  printed: 'digitally printed',
  embroidered: 'embroidered',
  woven_jacquard: 'woven jacquard',
};

/**
 * 🏆 بناء الـ Short Prompt — الأقوى والأهم
 * 
 * وضعان:
 * - inspired:      رسمة جديدة مستوحاة، يحافظ على نسيج القماش
 * - professional:  صورة احترافية لنفس القماشة + إمكانية تغيير الألوان
 *                  (كل مشهد له برومبت مخصص من خبير Gemini)
 */
export function buildShortPrompt(settings: DesignSettings): string {
  const fabric = FABRIC_LABELS[settings.fabricType];
  const pattern = PATTERN_LABELS[settings.patternStyle];
  const method = METHOD_LABELS[settings.applicationMethod];
  const scene = SCENE_PHOTO[settings.sceneType];
  const season = SEASON_MOOD[settings.season] || '';
  const mode = settings.generationMode || 'inspired';

  // Detect if user CHANGED colors from the analyzed original
  // Also detect if baseColor looks like a raw hex (user picked from palette) vs original
  const hasCustomColors = !!(
    settings.originalBaseColor && 
    (settings.baseColor !== settings.originalBaseColor || settings.motifColor !== settings.originalMotifColor)
  );

  let prompt = '';
  const target = settings.colorTarget || 'base';

  // Build color instruction based on target — STRONG version for Gemini
  const baseName = getColorDisplayName(settings.baseColor, settings.baseColorName);
  const motifName = getColorDisplayName(settings.motifColor, settings.motifColorName);

  const buildColorInstruction = (): string => {
    if (!hasCustomColors) return '';
    if (target === 'base') {
      return `⚠️ CRITICAL COLOR CHANGE: The fabric BACKGROUND color MUST be ${baseName} (${settings.baseColor}). DO NOT use the original color from the reference image. RECOLOR the entire background to ${baseName}. Keep the motif/pattern design as original but on the new ${baseName} background. `;
    } else if (target === 'motif') {
      return `⚠️ CRITICAL COLOR CHANGE: Keep the background color as original. The MOTIF/PATTERN color MUST be ${motifName} (${settings.motifColor}). DO NOT use the original motif color. RECOLOR all pattern elements to ${motifName}. `;
    } else {
      return `⚠️ CRITICAL COLOR CHANGE: RECOLOR the entire fabric — background MUST be ${baseName} (${settings.baseColor}), motif/pattern MUST be ${motifName} (${settings.motifColor}). DO NOT use any original colors from the reference image. `;
    }
  };

  // Color instruction goes FIRST in the prompt for maximum priority
  const colorPrefix = hasCustomColors ? buildColorInstruction() : '';

  switch (mode) {
    // ═══ MODE 1: مستوحى — رسمة جديدة ═══
    case 'inspired':
      if (colorPrefix) {
        prompt = `${colorPrefix}`;
      }
      prompt += `${scene} `;
      prompt += `The product must be made from ${fabric} with a ${method} ${pattern}. `;
      if (!hasCustomColors) {
        prompt += `Use the SAME color palette as the reference image. `;
      }
      if (season) prompt += `${season} `;
      prompt += `8K resolution, grazing side-light at 15-30 degrees.`;
      break;

    // ═══ MODE 2: صورة احترافية — نفس التصميم بالضبط ═══
    // كل مشهد له برومبت مخصص من خبير Gemini
    case 'professional': {
      const colorInst = hasCustomColors ? buildColorInstruction() : '';
      const sceneType = settings.sceneType;
      // e.g. "digitally printed silk" or "embroidered velvet"
      const methodPro = METHOD_PRO[settings.applicationMethod] || '';
      const mat = `${methodPro} ${FABRIC_SIMPLE[settings.fabricType]}`.trim();

      // Scene-specific prompts (Gemini Expert Optimized V4 — by Gemini itself)
      const PRO_PROMPTS: Record<SceneType, { original: string; custom: string }> = {
        // ═══ عرض القماش مسطح ═══
        flat_lay: {
          original: `LOOK at the reference image. Display the EXACT SAME ${mat} perfectly ironed, ultra-smooth — absolutely NO wrinkles, NO creases, NO folds. The fabric fills 80% of the frame, centered on a rich dark walnut wood surface. On the visible dark wood border only (NOT on the fabric): place a small elegant golden tailor's scissors and a wooden thread spool neatly on one side, and 2-3 pearl-head pins on another side — arranged with editorial precision. Optional: a tiny dried eucalyptus sprig on the wood. Top-down flat-lay bird's-eye view, 50mm lens, f/5.6, beautiful soft diffused window light. Luxury fabric catalog quality. NO furniture, NO beds, NO clothing, NO people.`,
          custom: `LOOK at the reference image. Display the ${mat} perfectly ironed, ultra-smooth — absolutely NO wrinkles, NO creases, NO folds. ${colorInst}The fabric fills 80% of the frame on a rich dark walnut wood surface. On the dark wood border only (NOT on fabric): golden scissors and thread spool on one side, 2-3 pearl pins on another — neatly arranged. Tiny eucalyptus sprig optional. Top-down flat-lay view, 50mm, f/5.6, soft window light. Luxury catalog quality. NO furniture, NO beds, NO clothing, NO people.`,
        },
        table_display: {
          original: `LOOK at the reference image. The IDENTICAL ${mat} is draped over a luxury wooden display table in a high-end fabric boutique. The fabric flows elegantly to the floor. Blurred fabric rolls in background. Warm gallery spotlights, f/4.0 for soft bokeh. NO beds, NO clothing, NO people.`,
          custom: `LOOK at the reference image. The ${mat} is draped over a luxury wooden display table. ${colorInst}The fabric flows elegantly to the floor. Blurred boutique background. Warm gallery spotlights, f/4.0. NO beds, NO clothing, NO people.`,
        },
        hanging: {
          original: `LOOK at the reference image. The EXACT SAME ${mat} hangs vertically from a polished brass rod. Full-length drop showing the continuous IDENTICAL pattern from top to bottom. Neutral light grey studio background. 85mm lens, sharp focus, even studio lighting. NO beds, NO furniture, NO people.`,
          custom: `LOOK at the reference image. The ${mat} hangs vertically from a brass rod. ${colorInst}Full-length drop showing the continuous pattern. Neutral light grey studio background. 85mm lens, sharp focus, even studio lighting. NO beds, NO furniture, NO people.`,
        },
        rolls: {
          original: `LOOK at the reference image. 3-4 professional bolts of the IDENTICAL ${mat} stacked neatly in a luxury textile showroom. The EXACT pattern is visible on the outer wrap. Cross-section shows fabric layers. Macro-style depth of field, f/2.8. NO beds, NO furniture, NO finished garments.`,
          custom: `LOOK at the reference image. 3-4 bolts of the ${mat} stacked in a showroom. ${colorInst}The pattern is visible on the outer wrap. Macro-style depth of field, f/2.8. NO beds, NO furniture, NO finished garments.`,
        },
        swirl: {
          original: `LOOK at the reference image. The IDENTICAL ${mat} is artistically arranged in a tight rosette spiral on a white marble surface. Captures the EXACT pattern and sheen from multiple angles. High-key lighting, 35mm lens. NO furniture, NO beds, NO people, NO accessories.`,
          custom: `LOOK at the reference image. The ${mat} is artistically arranged in a rosette spiral on white marble. ${colorInst}Captures the pattern and sheen from multiple angles. High-key lighting, 35mm lens. NO furniture, NO beds, NO people.`,
        },
        macro: {
          original: `LOOK at the reference image. Extreme macro close-up of the EXACT SAME ${mat}. Focus on individual threads, weave structure, and IDENTICAL print detail. Sharp low-angle side lighting to emphasize texture. 100mm macro lens, f/11. NO background, NO furniture, NO objects.`,
          custom: `LOOK at the reference image. Extreme macro close-up of the ${mat}. ${colorInst}Focus on individual threads and weave structure. Sharp low-angle side lighting to emphasize texture. 100mm macro lens, f/11. NO background, NO furniture, NO objects.`,
        },

        // ═══ منتجات ═══
        dress: {
          original: `LOOK at the reference image. A professional model wearing a flowing day dress made of the EXACT SAME ${mat}. Outdoor sunlit atrium background. Fashion editorial style, full body shot, natural golden lighting, 50mm lens, f/2.0.`,
          custom: `LOOK at the reference image. A model wearing a flowing day dress made of this ${mat}. ${colorInst}Outdoor sunlit atrium. Fashion editorial style, full body shot, 50mm lens, f/2.0.`,
        },
        evening_gown: {
          original: `LOOK at the reference image. A high-fashion model in a floor-length haute couture gown made of the IDENTICAL ${mat}. Standing on a grand marble staircase. Cinematic rim lighting, gold fill light. Long train flowing behind. 35mm wide angle, f/4.0.`,
          custom: `LOOK at the reference image. A model in a floor-length haute couture gown made of this ${mat}. ${colorInst}Grand marble staircase background. Cinematic rim lighting. 35mm wide angle, f/4.0.`,
        },
        abaya: {
          original: `LOOK at the reference image. A luxury modern open-front abaya crafted from the EXACT SAME ${mat}. Setting is a modern architectural hotel corridor. Golden hour lighting, soft shadows. High-end Middle Eastern fashion photography, 85mm lens.`,
          custom: `LOOK at the reference image. A luxury modern open-front abaya crafted from this ${mat}. ${colorInst}Modern architectural background. Golden hour lighting. High-end fashion photography, 85mm lens.`,
        },
        suit: {
          original: `LOOK at the reference image. A man wearing a sharp, tailored two-piece suit made from the IDENTICAL ${mat}. Dark studio setting. Dramatic Rembrandt lighting, high contrast. Focus on fabric quality and tailoring. 50mm lens, f/5.6.`,
          custom: `LOOK at the reference image. A man wearing a tailored two-piece suit made from this ${mat}. ${colorInst}Dark studio setting. Dramatic Rembrandt lighting. Focus on fabric quality. 50mm lens, f/5.6.`,
        },
        curtain: {
          original: `LOOK at the reference image. Floor-to-ceiling luxury curtains made of the EXACT SAME ${mat}. Luxury penthouse interior, city night view through the window. One curtain tied back with a tassel. Warm ambient evening lighting, interior design photography.`,
          custom: `LOOK at the reference image. Floor-to-ceiling curtains made of this ${mat}. ${colorInst}Luxury penthouse interior. One curtain tied back. Warm ambient evening lighting, interior design photography.`,
        },
        bedding: {
          original: `LOOK at the reference image. A full luxury bedding set: duvet cover and pillows made of the IDENTICAL ${mat}. King-size bed in a 5-star hotel suite. Soft morning sunlight from a large window. High-end lifestyle photography, f/2.8.`,
          custom: `LOOK at the reference image. A full luxury bedding set made of this ${mat}. ${colorInst}King-size bed in a 5-star hotel suite. Soft morning sunlight. High-end lifestyle photography, f/2.8.`,
        },
        sofa: {
          original: `LOOK at the reference image. A mid-century modern sofa fully upholstered in the EXACT SAME ${mat}. High-end furniture showroom setting. Professional gallery lighting. Clean lines, architectural focus, 35mm lens.`,
          custom: `LOOK at the reference image. A mid-century modern sofa upholstered in this ${mat}. ${colorInst}High-end furniture showroom. Professional gallery lighting. Clean lines, 35mm lens.`,
        },
        cushion: {
          original: `LOOK at the reference image. 3-4 decorative throw cushions made of the IDENTICAL ${mat}. Arranged on a neutral beige linen sofa. Soft natural side lighting. Cozy lifestyle interior photography, shallow depth of field, f/1.8.`,
          custom: `LOOK at the reference image. 3-4 decorative throw cushions made of this ${mat}. ${colorInst}Arranged on a neutral beige sofa. Soft natural side lighting. Cozy lifestyle photography, f/1.8.`,
        },
      };

      const scenePrompts = PRO_PROMPTS[sceneType];
      const basePrompt = hasCustomColors ? scenePrompts.custom : scenePrompts.original;
      // Color instruction goes FIRST for maximum priority
      prompt = hasCustomColors ? `${colorPrefix}${basePrompt}` : basePrompt;
      break;
    }
  }

  // Add aspect ratio instruction
  const aspectRatio = settings.aspectRatio || 'landscape';
  const ASPECT_INSTRUCTIONS: Record<string, string> = {
    landscape: 'Generate a WIDE LANDSCAPE image (16:9 aspect ratio, horizontal).',
    portrait: 'Generate a TALL PORTRAIT image (9:16 aspect ratio, vertical).',
    square: 'Generate a SQUARE image (1:1 aspect ratio).',
  };
  prompt += ` ${ASPECT_INSTRUCTIONS[aspectRatio]}`;

  // Custom hint (limited to 200 chars to avoid prompt pollution)
  if (settings.customPromptHint && !(settings as any)._compositePrompt) {
    const hint = settings.customPromptHint.trim().slice(0, 200);
    if (hint) prompt += ` ${hint}`;
  }

  // 🖼️ Composite mode: override entire prompt with composite grid prompt
  if ((settings as any)._compositePrompt) {
    return (settings as any)._compositePrompt as string;
  }

  return prompt;
}

/**
 * 🖼️ Composite Grid — صورة مشتركة لكل المشاهد
 * تولّد صورة واحدة بـ 14 panel لتجريب كل المشاهد دفعة واحدة
 */
export function buildCompositeGridPrompt(mat: string): string {
  return `LOOK at the reference image. Create a single high-resolution composite photograph divided into a grid of 14 distinct panels, arranged in 4 rows and 4 columns (last row has 2 panels). Use the EXACT SAME fabric from the reference image for ALL panels.

Row 1 (Fabric Displays):
Panel 1 (flat_lay): The ${mat} laid perfectly flat on a light oak wood surface, one corner elegantly folded. Bird's-eye view, natural daylight.
Panel 2 (table_display): The ${mat} draped over a luxury wooden display table in a textile boutique, flowing to the floor. Blurred shelves in background. Warm spotlights.
Panel 3 (hanging): The full length of the ${mat} hanging vertically from a polished brass rod against a neutral light grey background. Even studio lighting.
Panel 4 (rolls): 3-4 professional bolts of the ${mat} stacked neatly in a luxury textile showroom, pattern visible on the outer wrap. Shallow depth of field.

Row 2 (More Fabric & Products):
Panel 5 (swirl): The ${mat} artistically arranged in a tight rosette spiral on a white marble surface. High-key lighting.
Panel 6 (macro): Extreme macro close-up of the ${mat}, focusing on individual threads and weave structure. Low-angle side lighting.
Panel 7 (dress): A professional model wearing a flowing day dress made from the ${mat}, in a sunlit indoor garden atrium. Fashion editorial style.
Panel 8 (evening_gown): A model in a floor-length haute couture gown with a long train made from the ${mat}, on a grand marble staircase. Dramatic rim lighting.

Row 3 (Product Scenarios):
Panel 9 (abaya): A luxury modern open-front abaya crafted from the ${mat}, in a modern architectural hotel corridor during golden hour.
Panel 10 (suit): A man wearing a sharp tailored two-piece suit made from the ${mat}, in a dark studio with high-contrast Rembrandt lighting.
Panel 11 (curtain): Floor-to-ceiling luxury curtains made from the ${mat}, in a luxury penthouse with city night view. One curtain tied back with a tassel.
Panel 12 (bedding): A full luxury bedding set (duvet cover, pillows) made of the ${mat} on a king-size bed in a 5-star hotel suite. Soft morning sunlight.

Row 4 (Final Products):
Panel 13 (sofa): A mid-century modern sofa fully upholstered in the ${mat}, in a high-end furniture showroom. Professional gallery lighting.
Panel 14 (cushion): 3 decorative throw cushions made from the ${mat}, arranged on a neutral beige linen sofa. Soft natural side lighting.

Thin clean white borders separating the panels. Frontal balanced perspective, realistic lighting and detail for each panel.`;
}
/**
 * وصف نمط الرسم — تفصيلي (للـ Full prompt)
 */
function getPatternStylePrompt(style: PatternStyle): string {
  const patterns: Record<PatternStyle, string> = {
    damask: `Symmetrical, reversible damask pattern featuring elaborate scrolls, acanthus leaves, and floral medallions. Large scale referencing European nobility. Formal balance with historical wallpaper aesthetic.`,
    geometric: `Precise repeating geometric shapes including hexagons, chevrons, and interlocking lattices. Sharp lines and mathematical precision. Scale varies from micro-prints to bold architectural motifs.`,
    floral: `Naturalistic floral representations with flower heads, bouquets, and petals. Ranges from small ditsy prints to oversized painterly blooms. Focus on the beauty of the flower with natural color gradients.`,
    abstract: `Non-representational abstract forms, splashes of color, and distorted shapes without a clear repeat. Focuses on mood and movement. Inspired by Abstract Expressionism.`,
    minimalist: `Extremely simple minimalist motifs — small dots or thin lines with vast negative space. Japanese Zen-inspired restraint. Less is more philosophy.`,
    oriental: `Intricate oriental designs featuring arabesques, cranes, cherry blossoms, and architectural motifs. Rich red, gold, and indigo palette. Specific cultural iconography with mathematical star-and-rosette grids.`,
    botanical: `Scientific botanical illustrations of plants including stems, intricate leaves, and wild vines. Differentiated from florals by inclusion of greenery and biological accuracy. Vintage engraving aesthetic.`,
    stripes: `Linear stripe patterns ranging from thin pinstripes to bold cabana stripes. Strictly rhythmic mathematical repetition with clear directionality and clean knife-sharp edges.`,
  };
  return patterns[style];
}

/**
 * بناء الـ Full Prompt — تفصيلي كامل
 * يُستخدم للتوثيق والتحليل وكـ fallback
 */
export function buildInspirationPrompt(settings: DesignSettings): string {
  const fabricDesc = getFabricTypePrompt(settings.fabricType);
  const methodDesc = getApplicationMethodPrompt(settings.applicationMethod);
  const patternDesc = getPatternStylePrompt(settings.patternStyle);
  const seasonDesc = getSeasonPrompt(settings.season);
  const sceneDesc = getScenePrompt(settings.sceneType);

  const prompt = `
CREATIVE FABRIC DESIGN — INSPIRATION STUDIO

Maintain the ${FABRIC_LABELS[settings.fabricType]} texture from the reference image, but completely replace the pattern with a new original design.

═══ FABRIC MATERIAL ═══
${fabricDesc}

═══ CONSTRUCTION METHOD ═══
${methodDesc}

═══ NEW PATTERN ═══
${patternDesc}

═══ COLORS ═══
Base: ${settings.baseColorName} (${settings.baseColor}) | Motif: ${settings.motifColorName} (${settings.motifColor})

═══ SEASON ═══
${seasonDesc}

═══ SCENE ═══
${sceneDesc}

═══ TECHNICAL ═══
Lens: ${CAMERA_DNA.lens}, Aperture: ${CAMERA_DNA.aperture}
Lighting: ${CAMERA_DNA.lighting}
Color: ${CAMERA_DNA.colorTemp}
${CAMERA_DNA.negativePrompt}
${settings.customPromptHint ? `\n═══ DIRECTION ═══\n${settings.customPromptHint}` : ''}
`.trim();

  return prompt;
}

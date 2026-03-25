// ═══════════════════════════════════════════════════════════════════
// 📝 Prompt Builder V2 — AI Image Generation Prompts
// يبني prompts احترافية باستخدام تحليل الصورة المرجعية
// ═══════════════════════════════════════════════════════════════════
//
// 📌 هذا الملف مستقل — يمكن تعديله وتحسينه دون لمس أي كود آخر
// 📌 كل prompt مبني على: تحليل الصورة + تفاصيل تقنية للتصوير
// 📌 المنهج: Analysis-Driven Prompting (ليس template-based)
//
// ═══════════════════════════════════════════════════════════════════

import type { FabricAnalysis } from "./image-analyzer.ts"

// ═══ Types ═══
export interface MaterialContext {
  name: string;
  design?: string;
  color?: string;
  composition?: string;
  category?: string;
  code?: string;
}

export type GenerationType = 'studio' | 'texture' | 'usage' | 'palette' | 'color_variant';
export type UsageContext = 'dress' | 'mensuit' | 'abaya' | 'kidswear' | 'sportswear' | 'furniture' | 'curtain' | 'shirt' | 'bedding';

// ═══ Auto-detect Usage Context from Material Data ═══
// يحدد تلقائياً سياق الاستخدام من بيانات المادة
export function detectUsageContext(material: MaterialContext): UsageContext {
  const haystack = [
    material.name,
    material.design,
    material.category,
    material.composition,
  ].filter(Boolean).join(' ').toLowerCase();

  // Furniture / Upholstery
  if (/\b(furniture|upholster|sofa|couch|موبيليا|كنب|أثاث|تنجيد|koltuk|döşemelik)\b/i.test(haystack)) return 'furniture';
  // Curtain / Drapery
  if (/\b(curtain|draper|sheer|voile|ستار|برد|perde|tül)\b/i.test(haystack)) return 'curtain';
  // Bedding
  if (/\b(bed|sheet|duvet|pillow|مفرش|سرير|لحاف|yatak|nevresim)\b/i.test(haystack)) return 'bedding';
  // Abaya / modest wear
  if (/\b(abaya|عباء|عبايا|جلباب|حجاب|ferace)\b/i.test(haystack)) return 'abaya';
  // Men's suit
  if (/\b(suit|blazer|formal|tuxedo|بذل|طقم رسمي|كوستيم|takım elbise|smokin)\b/i.test(haystack)) return 'mensuit';
  // Kids
  if (/\b(kids?|child|baby|infant|أطفال|ولادي|بناتي|أولاد|çocuk|bebek)\b/i.test(haystack)) return 'kidswear';
  // Sportswear
  if (/\b(sport|athletic|gym|jersey|track|رياض|سبور|spor|eşofman)\b/i.test(haystack)) return 'sportswear';
  // Shirt / men's casual
  if (/\b(shirt|polo|oxford|قميص|gömlek)\b/i.test(haystack)) return 'shirt';
  // Dress / women's general
  if (/\b(dress|gown|evening|party|silk|chiffon|فستان|سهر|حرير|شيفون|elbise|ipek)\b/i.test(haystack)) return 'dress';

  // Default: let AI analyzer decide
  return 'dress';
}

// ═══ Tag/Watermark Options ═══
export interface TagOptions {
  enabled: boolean;
  companyWatermark?: string;       // اسم الشركة كعلامة مائية
  showMaterialCode?: boolean;      // إظهار كود المادة
  showMaterialName?: boolean;      // إظهار اسم المادة
  showComposition?: boolean;       // إظهار المكونات/التركيبة
  showDesign?: boolean;            // إظهار التصميم
  showColor?: boolean;             // إظهار اللون
  showQRCode?: boolean;            // إضافة QR Code
  showBarcode?: boolean;           // إضافة باركود
  tagLanguage?: 'ar' | 'en' | 'tr' | 'bilingual'; // لغة الوسم
  tagPosition?: 'bottom-left' | 'bottom-right' | 'top-right'; // موقع الوسم
}

// ═══ Material Info Tag Builder ═══
function buildMaterialInfoTag(material: MaterialContext, tagOptions?: TagOptions): string {
  if (!tagOptions || !tagOptions.enabled) return '';

  const lang = tagOptions.tagLanguage || 'en';
  const position = tagOptions.tagPosition || 'bottom-left';
  const parts: string[] = [];

  // بيانات المادة حسب اختيار المستخدم
  if (tagOptions.showMaterialCode && material.code) {
    parts.push(lang === 'ar' ? `رمز: ${material.code}` : `Code: ${material.code}`);
  }
  if (tagOptions.showMaterialName && material.name) {
    parts.push(material.name);
  }
  if (tagOptions.showDesign && material.design) {
    parts.push(lang === 'ar' ? `تصميم: ${material.design}` : `Design: ${material.design}`);
  }
  if (tagOptions.showColor && material.color) {
    parts.push(lang === 'ar' ? `لون: ${material.color}` : `Color: ${material.color}`);
  }
  if (tagOptions.showComposition && material.composition) {
    parts.push(material.composition);
  }

  // إن لم يختر أي بيانات ولكن مفعّل — ضع على الأقل الشركة
  const brandName = tagOptions.companyWatermark || 'TexaCore';

  let tagInstruction = `
MATERIAL INFO TAG — IMPORTANT:
In the ${position} corner of the image, add an elegant, semi-transparent info tag/label.
Design it as a refined, minimal card overlay (like a luxury brand product label):
- Frosted glass / semi-transparent dark card (25-30% opacity background)
- ${lang === 'ar' ? 'Arabic text, right-aligned, clean Noto Kufi Arabic or similar font' : 'White text, clean sans-serif font (Helvetica Neue Light or similar)'}
- Rounded corners (8px radius), subtle drop shadow for depth`;

  if (parts.length > 0) {
    tagInstruction += `
- Layout the following information in compact lines:
  ${parts.join('\n  ')}`;
  }

  tagInstruction += `
- "${brandName}" brand name ${parts.length > 0 ? 'at the bottom of the tag' : 'centered'} in ${parts.length > 0 ? 'slightly smaller' : 'elegant'} text`;

  if (tagOptions.showQRCode) {
    tagInstruction += `
- Include a small QR code (about 1cm visual size) next to the tag — clean black-on-white square with rounded modules`;
  }

  if (tagOptions.showBarcode) {
    tagInstruction += `
- Include a small barcode (Code-128 style) below the text — thin, clean, professional`;
  }

  tagInstruction += `
- The tag should be small enough to not distract (about 15% of image width max)
- Premium design feel — it should look like a real printed product label`;

  return tagInstruction;
}

// ═══ Main Prompt Router ═══
export function buildImagePrompt(
  type: GenerationType,
  analysis: FabricAnalysis,
  material: MaterialContext,
  usageContext?: UsageContext,
  tagOptions?: TagOptions,
): string {
  const infoTag = buildMaterialInfoTag(material, tagOptions);
  switch (type) {
    case 'studio':
      return buildStudioPrompt(analysis, infoTag);
    case 'texture':
      return buildTexturePrompt(analysis); // no tag on macro
    case 'usage':
      return buildUsagePrompt(analysis, usageContext || (analysis.suggestedUses?.[0] as UsageContext) || 'dress', infoTag);
    case 'palette':
      return buildPalettePrompt(analysis, material);
    default:
      return buildStudioPrompt(analysis, infoTag);
  }
}

// ═══ Color Variant Prompt ═══
export function buildColorVariantPrompt(
  analysis: FabricAnalysis,
  targetColorName: string,
  targetColorHex: string,
): string {
  return `You are an expert textile colorist and photo retouching specialist with 20 years of experience.

ORIGINAL FABRIC: ${analysis.oneLiner}
ORIGINAL PATTERN: ${analysis.patternDescription}
ORIGINAL TEXTURE: ${analysis.fabricType}, ${analysis.weaveType}, ${analysis.sheen}

TASK: Precisely recolor this fabric to "${targetColorName}" (${targetColorHex}).

CRITICAL CONSTRAINTS — ABSOLUTELY DO NOT VIOLATE:
✅ PRESERVE: Every thread, every weave intersection, every fiber detail
✅ PRESERVE: All fold positions, drape behavior, and wrinkle patterns exactly
✅ PRESERVE: The exact lighting — angle, intensity, shadow positions, highlights
✅ PRESERVE: Image composition, camera angle, framing, depth of field
✅ PRESERVE: Pattern design and motif positions — only change their color
✅ PRESERVE: Background exactly as-is

❌ ONLY CHANGE: The base color/hue of the fabric to ${targetColorHex}
❌ DO NOT: Alter the pattern, add elements, change lighting, add any text

COLOR APPLICATION — How Real Textile Dyeing Works:
- Apply ${targetColorHex} as the dominant hue
- Dark pattern elements: use darker shade of ${targetColorHex} (not black)
- Light pattern elements: use lighter tint of ${targetColorHex} (not white)
- Shadows: naturally darker ${targetColorHex} with ambient color influence
- Highlights: bright ${targetColorHex} reflecting the original light source
- The ${analysis.sheen} surface finish should interact with the new color naturally
- Color saturation should be consistent across all visible surfaces
- Maintain the perceived fabric weight (${analysis.weight}) through proper color density

OUTPUT: A single photorealistic image. The result must be absolutely indistinguishable from a real photograph of this fabric dyed in ${targetColorName}.`;
}

// ═══════════════════════════════════════════════════════════════
// 📷 STUDIO — Professional E-Commerce Hero Shot
// ═══════════════════════════════════════════════════════════════
function buildStudioPrompt(analysis: FabricAnalysis, infoTag: string): string {
  const colorList = analysis.colors.map(c => `${c.name} (${c.hex})`).join(', ');

  return `A professional, ultra-high-definition studio product photograph of a luxurious ${analysis.fabricType} fabric.

THE FABRIC:
${analysis.oneLiner}
Pattern: ${analysis.patternDescription}
Colors: ${colorList}
Surface: ${analysis.sheen}, ${analysis.hand}

FABRIC PRESENTATION:
- The fabric is artfully and elegantly draped into a graceful, fluid swirl (drapery)
- Show flowing, organic folds that reveal both the pattern/print AND the texture
- One section smoothly laid flat to show the full pattern clearly
- Another section cascading in gentle folds to demonstrate drape quality and ${analysis.hand}
- The ${analysis.weight} ${analysis.fabricType} should look naturally luxurious

LIGHTING:
- Main: Large octagonal softbox at 45° from above-left, diffused through silk
- Fill: Silver reflector at half-stop from right (3:1 ratio)
- Rim: Gentle separation light from behind (subtle hair-light effect on fabric fibers)
- Color temperature: 5400K daylight-balanced
- Specular highlights reveal the ${analysis.sheen} surface naturally
- All shadow transitions smooth and gradual — no hard edges

BACKGROUND:
- Pure white (#FFFFFF) seamless infinity curve
- No horizon line visible
- Natural, grounded shadow beneath fabric (not floating)
- Zero distractions — fabric is the absolute hero

CAMERA:
- Phase One IQ4 150MP, Schneider 80mm f/2.8 LS
- Shooting angle: 35° overhead, slightly right of center
- f/8 for maximum sharpness across entire frame
- Focus: perfect from front fold to back edge
- Neutral white balance, IT8 color calibration

POST-PROCESSING:
- True-to-life color reproduction — zero creative filters
- Clean edges, dust-free, flawless presentation
- Subtle natural vignette drawing eye to center
${infoTag}

QUALITY STANDARD:
Must match premium fabric house photography (Loro Piana, Scabal, Holland & Sherry).
Photorealistic. 8K detail. Indistinguishable from a real photograph.

Output a single image.`;
}

// ═══════════════════════════════════════════════════════════════
// 🔍 TEXTURE — Extreme Macro Close-Up
// ═══════════════════════════════════════════════════════════════
function buildTexturePrompt(analysis: FabricAnalysis): string {
  return `A professional, ultra-high-definition macro photograph documenting the construction quality of this premium ${analysis.fabricType}.

THE FABRIC:
${analysis.oneLiner}
Weave: ${analysis.weaveType}
Surface: ${analysis.sheen}
Hand: ${analysis.hand}
Weight: ${analysis.weight}

MACRO REQUIREMENTS:
- EXTREME close-up: individual threads and fibers must be clearly distinguishable
- Show the ${analysis.weaveType} structure — how warp and weft threads interlace
- Capture fiber diameter variations, twist direction, and surface micro-texture
${analysis.patternType !== 'solid' ? `- Show how the ${analysis.patternDescription} translates at thread level — where colors change in the weave` : '- Show the uniform color consistency and subtle tonal variations in the weave'}
- Reveal the three-dimensionality of the weave construction
- The ${analysis.sheen} surface quality must be evident at macro level

LIGHTING:
- Primary: Raking light from 15° left side angle — reveals every thread contour
- Secondary: Gentle fill from upper right at 40% intensity
- Color temperature: 5200K (neutral warm)
- Micro-shadows between threads must be naturally visible
- NO direct overhead light (flattens texture)

CAMERA:
- Canon EOS R5, Canon MP-E 65mm f/2.8 1-5x Macro
- Focus stacking: minimum 20 focus planes for front-to-back sharpness
- f/5.6 sweet spot — maximum macro sharpness without diffraction
- ISO 100 on tripod — zero noise in fine detail
- Magnification: 1:1 to 2:1 ratio
- Square crop composition

COMPOSITION:
- Frame 100% filled with fabric — no background visible
- Slight diagonal orientation (7-10°) for dynamic feel
- Most interesting weave intersection at center-right (golden ratio point)
- No watermark (must show pure fabric quality for buyers)

QUALITY STANDARD:
The viewer should feel they can reach out and touch every individual thread.
Scientific documentation meets fine art macro photography.
Suitable for fabric buyers making critical purchasing decisions.

Output a single image.`;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTE — Professional Color Card
// ═══════════════════════════════════════════════════════════════
function buildPalettePrompt(analysis: FabricAnalysis, material: MaterialContext): string {
  const colorSwatches = analysis.colors.map(c =>
    `'${c.name}' (${c.hex}) — ${c.description}`
  ).join('\n');

  const materialLine = [material.code, material.name, material.composition].filter(Boolean).join(' — ');

  return `A luxurious, clean, and professionally designed color palette card for a premium textile collection.

FABRIC: ${analysis.oneLiner}

COLOR SWATCHES TO DISPLAY:
${colorSwatches}

CARD DESIGN:
- Presented on premium textured cream cardstock paper
- Clean, segmented Pantone-style color swatches — each as a distinct rectangle
- Each swatch labeled with its creative name in a refined dark serif font
- Color hex code printed below each name in smaller monospace font
- Swatches arranged horizontally in a single elegant row
- Equal spacing between swatches with thin hairline separators

MATERIAL INFO ON CARD:
- At the top of the card, print: "${materialLine}"
- Below the swatches, print the fabric composition details in small text${material.composition ? `: "${material.composition}"` : ''}
- Collection reference: "${analysis.fabricType}" in small italic text

BRANDING:
- "TexaCore" logo embossed in the bottom-right corner
- Professional textile catalog style

PRESENTATION:
- The card is shot from a slight overhead angle (20°)
- Placed on a clean marble or light wood surface
- Soft, even lighting — no harsh shadows on the card
- Professional product photography style (like a design studio photo)
- Extremely clean, minimalist composition

QUALITY:
Photorealistic product photography of a physical printed palette card.
Must look like it was actually printed and photographed in a studio.

Output a single image.`;
}

// ═══════════════════════════════════════════════════════════════
// 👗 USAGE — Lifestyle Context Staging
// ═══════════════════════════════════════════════════════════════
function buildUsagePrompt(analysis: FabricAnalysis, context: UsageContext, infoTag: string): string {
  const scene = USAGE_SCENES[context] || USAGE_SCENES.dress;
  const colorAccents = analysis.colors
    .filter(c => c.role !== 'background')
    .map(c => `${c.name} ${c.hex}`)
    .join(', ');

  return `A majestic, ${scene.shotType} interior/fashion photograph — award-winning quality.

THE FABRIC:
${analysis.oneLiner}
Pattern: ${analysis.patternDescription}
Texture: ${analysis.fabricType}, ${analysis.weaveType}
Key colors: ${colorAccents}

THE PRODUCT:
${scene.subject} made entirely from this exact fabric, featuring its ${analysis.patternDescription}.
The fabric's specific texture (${analysis.hand}), pattern, and ${analysis.sheen} surface must be FAITHFULLY reproduced on the product.
The way light interacts with the ${analysis.fabricType} must be physically accurate.

PRODUCT STYLING:
${scene.styling}

ENVIRONMENT:
${scene.environment}
${scene.colorIntegration(analysis)}

LIGHTING:
${scene.lighting}

CAMERA:
- ${scene.camera}
- Shallow depth of field: product pin-sharp, background softly bokeh'd
- Color-calibrated for TRUE fabric color reproduction (IT8 standard)
- High dynamic range — detail visible in both highlights and deep shadows

COMPOSITION:
- Product is the undeniable hero — fills 60-70% of frame
- Rule of thirds composition with product at power point
- Generous breathing room around the product
- ${scene.compositionNote}

MOOD:
- ${scene.mood}
- Aspirational: the viewer should immediately want to own this product
- Premium e-commerce meets editorial photography
${infoTag}

QUALITY STANDARD:
Must match editorial quality from Architectural Digest / Vogue / Elle Decor Home.
Photorealistic, indistinguishable from a $50,000 professional photo shoot.

Output a single image.`;
}

// ═══════════════════════════════════════════════════════════════
// 🎬 Usage Scene Definitions
// ═══════════════════════════════════════════════════════════════
interface UsageScene {
  shotType: string;
  subject: string;
  styling: string;
  environment: string;
  colorIntegration: (analysis: FabricAnalysis) => string;
  lighting: string;
  camera: string;
  compositionNote: string;
  mood: string;
}

const USAGE_SCENES: Record<UsageContext, UsageScene> = {
  dress: {
    shotType: 'full-length fashion editorial',
    subject: 'An elegant floor-length evening gown with flowing A-line silhouette, displayed on a sophisticated female mannequin',
    styling: `- The gown features clean seams, proper hemline, and elegant neckline
- Show how the fabric drapes and moves on the feminine form — its natural fall
- The pattern/print must be clearly visible across the bodice and skirt
- Styled on a high-end matte FEMALE mannequin or dress form (no visible stand)
- The mannequin should have a feminine silhouette — waist, bust, shoulders`,
    environment: `- Upscale fashion boutique or art gallery setting
- Clean architectural background with soft neutral tones
- Polished light-colored floor reflecting subtle ambient light
- Minimalist — the dress commands all attention`,
    colorIntegration: (a) => {
      const accent = a.colors.find(c => c.role === 'accent' || c.role === 'secondary');
      return accent
        ? `- Subtle complementary element in ${accent.name} (${accent.hex}) visible in the environment (a vase, a chair edge)`
        : '- Environment colors remain neutral to let the fabric colors sing';
    },
    lighting: `- Fashion editorial: key light with beauty dish from 45° overhead right
- Large white V-flat on left side as fill (2:1 ratio)
- Rim light from behind for elegant edge separation
- Warm undertone (5000K) — flattering for fabrics
- Catch lights on any satin/silk surfaces should appear naturally luxurious`,
    camera: 'Full-frame, 85mm f/2.8 portrait lens, shot from 10° above eye level',
    compositionNote: 'Full-length view from slight 3/4 angle, head-to-hem framing',
    mood: 'Haute couture editorial — sophisticated, feminine, aspirational luxury',
  },

  mensuit: {
    shotType: 'editorial menswear photography',
    subject: 'A perfectly tailored two-piece men\'s suit (jacket + trousers) displayed on a masculine mannequin',
    styling: `- Suit displayed on a MALE torso mannequin — broad shoulders, narrow waist
- Clean tailoring: crisp lapels, structured shoulders, proper button stance
- Trousers with sharp center crease and proper break at the shoe
- Show the suit's construction quality — canvas chest, pick stitching
- One button done (two-button jacket), pocket square visible
- White dress shirt and silk tie complement the suit`,
    environment: `- Upscale tailor shop or luxury men's boutique
- Dark wooden paneling or clean concrete wall behind
- Polished marble or dark hardwood floor
- Subtle props: leather shoe, leather briefcase edge visible`,
    colorIntegration: (a) => {
      const primary = a.colors.find(c => c.role === 'primary');
      return primary
        ? `- Tie in a shade that complements ${primary.name}
- Leather accessories in rich brown or black`
        : '- Classic accessories in neutral tones';
    },
    lighting: `- Classic portrait lighting: key light at 45° with large softbox
- Strong fill at 2:1 ratio for dimensional but detailed look
- Subtle rim light to separate suit from background
- 5200K neutral temperature for true fabric color`,
    camera: 'Full-frame, 70mm f/4 from slightly below eye level — commands authority',
    compositionNote: '3/4 length view showing jacket to mid-thigh, full width of shoulders',
    mood: 'Executive power dressing — confident, authoritative, Savile Row quality',
  },

  abaya: {
    shotType: 'modest fashion editorial',
    subject: 'An exquisitely crafted flowing abaya/jalabiya with elegant drape, on a female mannequin',
    styling: `- Full-length abaya displayed on a FEMALE mannequin with modest, graceful silhouette
- Show the generous flowing fabric — how it moves and cascades
- Detail visible: cuff embroidery, collar construction, closure quality
- The pattern/print should be visible across the full length
- Elegant but modest — covering, flowing, dignified`,
    environment: `- Modern luxury boutique with Islamic architectural elements
- Clean arched doorway or marble wall behind
- Warm ambient lighting suggesting premium shopping experience
- Gold or rose gold accent elements in the scene`,
    colorIntegration: (a) => {
      const accent = a.colors.find(c => c.role === 'accent');
      return accent
        ? `- Decorative element in ${accent.name} (${accent.hex}) — perhaps gold embroidery or a subtle brooch`
        : '- Gold accents in the environment for warmth and luxury';
    },
    lighting: `- Soft, warm, diffused — almost celestial quality
- Large octagonal softbox with silk diffusion
- Warm fill (4500K) from below for gentle uplighting
- Rim light catching the fabric edges for ethereal effect`,
    camera: 'Full-frame, 85mm f/3.5 portrait lens, full-length with room to breathe',
    compositionNote: 'Full-length centered, fabric flowing naturally, slight movement blur at hem',
    mood: 'Elegant modest fashion — dignified, graceful, luxurious and contemporary',
  },

  kidswear: {
    shotType: 'playful children\'s wear editorial',
    subject: 'An adorable, well-crafted children\'s outfit displayed on a small child-sized mannequin',
    styling: `- Cute, well-made children's clothing on a CHILD-SIZED mannequin
- Age-appropriate design — playful yet tasteful
- Show the fabric's softness — crucial for children's comfort and safety
- Details visible: soft seams, gentle closures, comfortable construction
- Outfit should look comfortable and durable`,
    environment: `- Bright, cheerful, clean nursery or children's boutique
- Soft pastel walls or white background with colorful accents
- Warm wood flooring or soft rug
- One charming prop: a stuffed animal or wooden toy`,
    colorIntegration: (a) => {
      const accent = a.colors.find(c => c.role === 'accent');
      return accent
        ? `- A cute accessory in ${accent.name} adds playful charm`
        : '- Warm, child-friendly accessories in the scene';
    },
    lighting: `- Bright, even, cheerful — high-key lighting
- Large softbox directly above for shadowless illumination
- Warm fill from all sides (5000K)
- Everything should feel bright, safe, and welcoming`,
    camera: '50mm f/4 at child height, slightly elevated — warm and inviting angle',
    compositionNote: 'Full outfit centered, toy prop providing scale and charm',
    mood: 'Adorable, bright, and premium — parents aspire to dress their kids like this',
  },

  sportswear: {
    shotType: 'dynamic athletic wear photography',
    subject: 'A performance sportswear set (top + shorts/leggings) displayed on an athletic mannequin',
    styling: `- Athletic wear on a SPORTS mannequin — muscular, dynamic pose
- Show the fabric's stretch, moisture-wicking texture, and performance features
- Clean seams (flatlock where visible), performance zippers
- The fabric pattern/color should pop against the athletic form
- Energy and movement — the mannequin should feel mid-action`,
    environment: `- Modern gym, training facility, or outdoor track
- Clean concrete or rubberized floor
- Dramatic architectural background — glass, steel, open sky
- One performance prop: kettlebell, water bottle, or resistance band`,
    colorIntegration: (a) => {
      const accent = a.colors.find(c => c.role === 'accent');
      return accent
        ? `- Equipment in ${accent.name} creates visual cohesion`
        : '- Black/grey equipment for clean contrast';
    },
    lighting: `- Dynamic, high-contrast lighting
- Hard key light from side for dramatic shadows and muscle definition
- Cool color temperature (6000K) — energetic and modern
- Rim light for sharp edge separation`,
    camera: 'Wide-angle 35mm f/4 from low angle — powerful and dynamic perspective',
    compositionNote: 'Dynamic angle, slightly from below — empowering, energetic',
    mood: 'High-performance athletic — powerful, dynamic, elite sportswear',
  },

  furniture: {
    shotType: 'wide-angle architectural interior',
    subject: 'A contemporary designer sectional sofa / modern armchair',
    styling: `- Fabric texture and pattern clearly visible across cushions and armrests
- Show how the fabric wraps around furniture curves and seated surfaces
- Natural cushion indentation suggesting comfort
- Professional upholstery construction visible in details`,
    environment: `- Modern luxury penthouse living room
- Floor-to-ceiling windows with city or garden view
- Polished concrete or warm oak hardwood floors
- Clean architectural lines — white/cream walls`,
    colorIntegration: (a) => {
      const bg = a.colors.find(c => c.role === 'background');
      const accent = a.colors.find(c => c.role === 'accent');
      const parts: string[] = [];
      if (accent) parts.push(`- A throw pillow in ${accent.name} (${accent.hex}) on the sofa`);
      if (bg) parts.push(`- Wall color echoes ${bg.name} (${bg.hex}) subtly`);
      parts.push('- One curated coffee table book and a small bronze sculpture');
      return parts.join('\n');
    },
    lighting: `- Natural daylight streaming through large windows
- Golden hour warmth (4200K color temperature)
- Soft, directional shadows from window frames adding depth
- Ambient fill from white ceiling bounce light`,
    camera: 'Wide-angle 28mm f/5.6 from slightly elevated position, left of center',
    compositionNote: 'Sofa anchors the lower 2/3, room architecture provides depth context',
    mood: 'Contemporary luxury living — warm, inviting, architecturally stunning',
  },

  curtain: {
    shotType: 'wide-angle interior design',
    subject: 'Floor-to-ceiling curtains with elegant vertical pleats (pinch pleat or ripplefold)',
    styling: `- Full-length curtains from ceiling track to floor, pooling slightly (2-3cm break)
- One panel partially drawn to show both gathered and flat/stretched states
- Fabric pattern clearly visible in the flat sections
- Show the translucency/opacity: sunlight filtering through the fabric`,
    environment: `- Bright, airy modern bedroom or living room
- Tall windows spanning most of the wall
- Clean white walls, light natural flooring
- Minimal furniture visible (edge of elegant bed or reading chair)`,
    colorIntegration: (a) => {
      const primary = a.colors.find(c => c.role === 'primary');
      return primary
        ? `- A velvet cushion in ${primary.name} (${primary.hex}) on the visible furniture\n- The room palette harmonizes with the curtain's color story`
        : '- Room palette remains neutral to showcase the curtain colors';
    },
    lighting: `- BACKLIT: bright daylight streaming from behind the curtains
- The light filtering through the fabric creates a warm, ethereal glow
- Interior ambient light provides gentle fill from the room side
- Beautiful sun-dappled patterns on the floor from the fabric's weave
- Visible bokeh of outdoor greenery through sheer areas`,
    camera: '35mm f/4 from the room interior, 3/4 angle toward the window',
    compositionNote: 'Curtains fill frame vertically from ceiling to floor, room provides depth',
    mood: 'Serene, peaceful, bathed in warm natural light — sanctuary feeling',
  },

  shirt: {
    shotType: 'overhead product / editorial flat-lay',
    subject: 'A perfectly tailored men\'s dress shirt / premium button-down',
    styling: `- Shirt neatly presented: either crisp fold or laid flat with strategic collar pop
- Show collar construction detail, button quality, and barrel cuff
- Chest area positioned to display the fabric pattern at its best
- One sleeve casually but precisely folded to show cuff detail`,
    environment: `- Clean, premium surface: Italian marble, dark walnut wood, or grey linen backdrop
- Minimalist accessories: quality leather belt or classic watch (1 prop max)
- Shot as editorial flat-lay or on invisible mannequin`,
    colorIntegration: (a) => {
      const primary = a.colors.find(c => c.role === 'primary');
      return primary
        ? `- The leather accessory echoes a warm complement to ${primary.name}`
        : '- Accessories in neutral brown or black to complement the fabric';
    },
    lighting: `- Large overhead softbox (120cm square) for even, shadow-free illumination
- White fill cards on all sides to eliminate dark edges
- Color temperature: 5500K daylight-neutral for true color
- Specular control: no blown-out reflections on buttons`,
    camera: 'Directly overhead (90°) or 15° angle, 50mm f/8 for total sharpness',
    compositionNote: 'Shirt centered in frame, perfectly aligned to grid, 1:1 or 4:5 ratio',
    mood: 'Crisp, clean, executive precision — premium menswear catalog quality',
  },

  bedding: {
    shotType: 'lifestyle interior',
    subject: 'A complete luxury bedding set — duvet cover, pillow shams, fitted sheet',
    styling: `- Bedding artfully styled: inviting but carefully considered, not too perfect
- Duvet with a single elegant fold-back revealing contrasting sheet beneath
- Multiple pillows at varied heights (Euro shams + standard + decorative)
- The fabric's pattern is the star — clearly visible across the largest surfaces
- The fabric should look incredibly soft and inviting in bed context`,
    environment: `- Modern luxury master bedroom with morning light
- Upholstered headboard in complementary neutral tone
- Light walls (warm white or greige), natural material side tables (oak or walnut)
- One lifestyle touch: a coffee cup with rising steam, or a fresh flower in a vase`,
    colorIntegration: (a) => {
      const primary = a.colors.find(c => c.role === 'primary');
      const accent = a.colors.find(c => c.role === 'accent');
      const parts: string[] = [];
      if (primary) parts.push(`- Headboard upholstered in plush velvet matching ${primary.name}`);
      if (accent) parts.push(`- A throw blanket at the foot in ${accent.name} tone`);
      parts.push('- Fresh white flowers on the nightstand for life and freshness');
      return parts.join('\n');
    },
    lighting: `- Soft morning light from a large side window (coming from the left)
- Warm color temperature: 4500K — cozy and inviting
- Gentle long shadows creating depth and dimensionality
- No harsh lighting — everything should feel gentle and luxurious
- The fabric's surface should glow subtly in the natural light`,
    camera: '35mm f/3.5 from slightly elevated 3/4 angle, shot from foot end of bed',
    compositionNote: 'Bed fills 70% of frame — headboard to duvet fold, nightstand providing scale',
    mood: 'Warm, inviting, luxurious comfort — morning in a five-star hotel suite',
  },
};

// ═══ Scope Mapping ═══
export function getScopeForType(type: GenerationType): string {
  switch (type) {
    case 'studio': return 'design';
    case 'texture': return 'design';
    case 'usage': return 'general';
    case 'palette': return 'general';
    case 'color_variant': return 'color';
    default: return 'general';
  }
}

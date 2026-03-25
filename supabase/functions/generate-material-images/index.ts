// ═══════════════════════════════════════════════════════════════════
// 🤖 AI Material Image Generator — V8 (OpenAI GPT-4o + Gemini Fallback)
// Phase 1: Gemini 2.5 Flash Lite analyzes the fabric image
// Phase 2: OpenAI GPT-4o (primary) → Gemini Image Models (fallback)
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
}

// ═══════════════════════════════════════════════════
// 🔑 Service Account Authentication Helper
// Generates OAuth2 access tokens from SA JSON key
// ═══════════════════════════════════════════════════
async function getAccessTokenFromServiceAccount(): Promise<string | null> {
  try {
    // Try base64-encoded secret first (prevents corruption of private key)
    const saB64 = Deno.env.get('GOOGLE_SA_KEY_B64');
    const saJsonRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    
    let saJson: string | null = null;
    if (saB64) {
      saJson = new TextDecoder().decode(Uint8Array.from(atob(saB64), c => c.charCodeAt(0)));
      console.log('[AI] 🔑 Loaded SA from base64 secret');
    } else if (saJsonRaw) {
      saJson = saJsonRaw;
      console.log('[AI] 🔑 Loaded SA from raw JSON secret');
    }
    if (!saJson) return null;
    
    const sa = JSON.parse(saJson);
    
    // Create JWT header and claims
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: sa.client_email,
      sub: sa.client_email,
      scope: 'https://www.googleapis.com/auth/generative-language https://www.googleapis.com/auth/cloud-platform',
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    };
    
    // Base64url encode
    const b64url = (data: string) => btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const headerB64 = b64url(JSON.stringify(header));
    const claimsB64 = b64url(JSON.stringify(claims));
    const signingInput = `${headerB64}.${claimsB64}`;
    
    // Import RSA private key and sign
    const pemContents = sa.private_key
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');
    const keyBytes = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8', keyBytes.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const jwt = `${signingInput}.${signatureB64}`;
    
    // Exchange JWT for access token
    const tokenResp = await fetch(sa.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    
    if (!tokenResp.ok) {
      console.error(`[AI] ❌ SA token exchange failed: ${tokenResp.status}`);
      return null;
    }
    
    const tokenData = await tokenResp.json();
    console.log(`[AI] ✅ Service Account access token obtained`);
    return tokenData.access_token;
  } catch (err) {
    console.error(`[AI] ❌ SA auth error:`, err);
    return null;
  }
}

// ═══════════════════════════════════════
// 🤖 Model Registry (TexaCore AI Agents)
// ALL image models are IMAGE-TO-IMAGE (they see the reference!)
// ═══════════════════════════════════════
const MODELS = {
  // 🧠 Gemini 2.5 Flash Lite — text analysis ONLY (fast, cheap)
  ANALYZER: 'gemini-2.5-flash-lite',
  // 🎨 Gemini 2.5 Flash Image (Nano Banana) — fast image-to-image, 1024px
  GEMINI_IMAGE_GEN: 'gemini-2.5-flash-image',
  // 🎨 Gemini 3.1 Flash Image Preview (Nano Banana 2) — recommended, higher quality
  GEMINI_IMAGE_GEN_2: 'gemini-3.1-flash-image-preview',
  // 🎨 Gemini 3 Pro Image Preview (Nano Banana Pro) — best quality, 4K
  GEMINI_IMAGE_GEN_3: 'gemini-3-pro-image-preview',
};

const REQUEST_TIMEOUT_MS = 90000;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const VERTEX_REGION = 'us-central1';
const VERTEX_API_BASE = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1`;
const OPENAI_IMAGES_EDIT_URL = 'https://api.openai.com/v1/images/edits';

// ═════════════════════════════════════════════════
// 🎨 OpenAI Image Edit (FALLBACK — image-to-image ONLY)
// Uses gpt-image-1 with reference image input — NO text-to-image
// ═════════════════════════════════════════════════
async function generateWithOpenAI(
  openaiKey: string, imgB64: string, imgMime: string, prompt: string,
): Promise<{ data: string; mimeType: string } | null> {
  console.log(`[AI] 🎨 OpenAI gpt-image-1 image generation...`);
  console.log(`[AI] 📝 Prompt: "${prompt.substring(0, 150)}..."`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Convert base64 image to Blob for multipart upload
    const imageBytes = Uint8Array.from(atob(imgB64), c => c.charCodeAt(0));
    const ext = imgMime.includes('png') ? 'png' : imgMime.includes('webp') ? 'webp' : 'jpg';

    // Use the Images Edit endpoint with gpt-image-1
    const formData = new FormData();
    formData.append('model', 'dall-e-2');
    formData.append('image', new Blob([imageBytes], { type: imgMime }), `reference.${ext}`);
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'b64_json');

    const resp = await fetch(OPENAI_IMAGES_EDIT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      signal: controller.signal,
      body: formData,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[AI] ❌ OpenAI gpt-image-1 → ${resp.status}: ${errText.substring(0, 300)}`);
      // Do NOT fall back to DALL-E 3 — it can't see the reference image
      return null;
    }

    const result = await resp.json();
    const b64 = result?.data?.[0]?.b64_json;
    if (b64) {
      const sizeKB = Math.round(b64.length * 0.75 / 1024);
      console.log(`[AI] ✅ OpenAI gpt-image-1 → image (${sizeKB}KB)`);
      return { data: b64, mimeType: 'image/png' };
    }

    console.warn(`[AI] ⚠️ OpenAI gpt-image-1 → no image in response`);
    return null;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error(`[AI] ⏰ OpenAI timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    } else {
      console.error(`[AI] ❌ OpenAI error:`, err);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
// 🧠 PHASE 1: Fabric Analysis with Gemini 1.5 Pro
// Analyzes the uploaded image → returns structured JSON
// ═══════════════════════════════════════════════════
interface FabricAnalysis {
  fabric_type: string;
  weave: string;
  pattern_type: string;
  pattern_description: string;
  base_color: string;
  overall_mood: string;
  colors: Array<{ name: string; hex: string; location: string }>;
  texture_detail: string;
  print_technique: string;
  suggested_uses: string[];
  luxury_level: string;
  weight: string;   // light | medium | heavy
  opacity: string;  // transparent | semi-transparent | opaque
  stretch: string;  // none | 2-way | 4-way
  season: string;   // spring-summer | fall-winter | all-season
}

async function analyzeFabricImage(
  apiKey: string, imgB64: string, imgMime: string, accessToken?: string,
): Promise<FabricAnalysis | null> {
  console.log(`[AI] 🧠 Phase 1: Analyzing fabric with ${MODELS.ANALYZER}...`);

  const url = accessToken
    ? `${GEMINI_API_BASE}/${MODELS.ANALYZER}:generateContent`
    : `${GEMINI_API_BASE}/${MODELS.ANALYZER}:generateContent?key=${apiKey}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s for analysis

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            // Image first for better analysis
            { inline_data: { mime_type: imgMime, data: imgB64 } },
            { text: `You are a world-class textile analyst for a luxury fabric catalog.

Analyze this fabric photograph with extreme precision and expertise. Return a JSON object:

{
  "fabric_type": "specific fabric type (e.g., cotton satin, silk charmeuse, polyester chiffon, linen blend, wool twill, velvet, organza, tulle, jersey knit, crepe de chine)",
  "weave": "weave structure (e.g., sateen 5/1, plain weave, 2/2 twill, jacquard, knit interlock, satin float)",
  "pattern_type": "pattern category (e.g., watercolor floral, geometric tessellation, paisley, solid/plain, candy stripe, glen check, damask, abstract, tropical, toile de jouy, ikat, animal print)",
  "pattern_description": "VERY detailed description: what motifs appear, their size scale (micro/macro), repetition rhythm, density, and spatial arrangement across the fabric",
  "background_color_hex": "#hex code of the DOMINANT BACKGROUND color (the largest area of color that forms the base/ground of the fabric)",
  "background_color_name": "descriptive name of the background color (e.g., dusty rose, seafoam green, ivory cream)",
  "motif_color_hex": "#hex code of the main MOTIF/PATTERN color (the color of the design elements ON the background)",
  "motif_color_name": "descriptive name of the motif color",
  "base_color": "dominant background color with shade",
  "overall_mood": "aesthetic mood (e.g., delicate pastoral, bold contemporary, classic regal, bohemian, minimalist Scandinavian, romantic vintage)",
  "colors": [
    {"name": "poetic textile color name", "hex": "precise hex code", "location": "where this color appears", "coverage_percent": 40}
  ],
  "texture_detail": "tactile quality: thread count impression, sheen level (matte/satin/glossy), hand-feel (crisp/fluid/buttery), surface smoothness",
  "print_technique": "production method (digital inkjet, rotary screen, woven jacquard, yarn-dyed, piece-dyed, burnout, flocked, embroidered, sublimation)",
  "suggested_uses": ["list 3-4 ideal product applications from: bedding, curtains, dress, evening gown, suit, shirt, upholstery, cushions, tablecloth, hijab, abaya"],
  "luxury_level": "economy | standard | premium | luxury | haute-couture",
  "weight": "light (under 150 gsm) | medium (150-300 gsm) | heavy (over 300 gsm)",
  "opacity": "transparent | semi-transparent | opaque",
  "stretch": "none | low | 2-way | 4-way",
  "season": "spring-summer | fall-winter | all-season"
}

CRITICAL RULES:
- background_color_hex MUST be the color occupying the LARGEST AREA of the fabric (the ground/base).
- motif_color_hex MUST be the color of the main pattern/design elements ON TOP of the background.
- In the "colors" array, order colors from MOST dominant (largest coverage) to least dominant.
- Extract 4-6 distinct colors from the ACTUAL fabric. Be precise about hex codes.
Respond ONLY with the JSON object, no markdown formatting.` },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[AI] ❌ Analysis failed: ${resp.status}: ${errText.substring(0, 300)}`);
      return null;
    }

    const result = await resp.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn('[AI] ⚠️ No analysis text returned');
      return null;
    }

    try {
      const analysis = JSON.parse(text) as FabricAnalysis;
      console.log(`[AI] ✅ Analysis complete:`, {
        fabric: analysis.fabric_type,
        pattern: analysis.pattern_type,
        colors: analysis.colors?.length || 0,
        mood: analysis.overall_mood,
      });
      return analysis;
    } catch (parseErr) {
      console.error('[AI] ❌ Failed to parse analysis JSON:', text.substring(0, 200));
      return null;
    }
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error(`[AI] ⏰ Analysis timed out`);
    } else {
      console.error('[AI] ❌ Analysis error:', err);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎨 PHASE 2: Prompt Templates — powered by fabric analysis
// ═══════════════════════════════════════════════════════════════
function buildPrompt(
  type: string, analysis: FabricAnalysis,
  usage?: string, colorTarget?: any, ageRange?: string,
): string {
  const { fabric_type, pattern_type, pattern_description, base_color,
    overall_mood, colors, texture_detail, print_technique, luxury_level } = analysis;

  const colorDesc = colors.map(c => `${c.name} (${c.hex}) in the ${c.location}`).join(', ');
  const colorNames = colors.map(c => c.name).join(', ');

  // Age description for women's fashion mannequins
  const ageDescMap: Record<string, string> = {
    young: '(representing a vibrant young woman in her 20s, slim athletic build)',
    active: '(representing an active, confident woman in her 30s)',
    elegant: '(representing an elegant, sophisticated woman in her 40s)',
    classic: '(representing a classic, refined woman in her 50s)',
  };
  const ageDesc = ageDescMap[ageRange || 'elegant'] || ageDescMap.elegant;

  switch (type) {
    case 'studio':
      return `A professional, ultra-high-definition macro photograph focusing intensely on the soft, luxurious ${fabric_type} texture of a high-end ${luxury_level || 'premium'} fabric. The intricate, finely woven threads catch the light with a gentle, smooth sheen. The pattern is a precise, elegant ${pattern_type}: ${pattern_description}. The exact colors present are: ${colorDesc}. The dominant base color is ${base_color}. The fabric is artfully draped into a graceful, fluid swirling formation that highlights its incredibly soft and malleable quality, like a delicate fabric sculpture. The draping creates natural highlights and shadows that reveal the fabric's weight and hand-feel. Shot on a Phase One IQ4 150MP camera with a Schneider 120mm LS macro lens. Soft, diffused natural studio lighting from a 45-degree angle above, with a subtle fill reflector below creating gentle, tactile shadows within the folds. Cinematic quality, focused solely on the exquisite texture and print details. The overall mood is ${overall_mood}. Ultra-HD, 8K resolution. No text, no logos, no watermarks.`;

    case 'texture':
      return `An extreme macro close-up photograph of ${fabric_type} fabric, completely filling the entire frame with zero background visible. The image reveals the microscopic structure of the ${print_technique} technique — showing individual thread intersections, fiber twist direction, and ink/dye absorption patterns where the pattern meets the base weave. The visible pattern at this magnification shows: ${pattern_description}. Colors visible: ${colorDesc}. The texture detail reveals: ${texture_detail}. The weave structure and fiber quality are the hero of this image. Shot at precisely 45-degree angle with soft directional lighting from the upper-left, creating micro-shadows that emphasize every thread crossing. A secondary rim light from behind reveals the fabric's translucency/opacity. Phase One IQ4 camera, Schneider 120mm macro at f/8 for maximum sharpness across the field. Ultra-sharp, 8K resolution textile photography. No text, no background elements.`;

    case 'usage': {
      const scenes: Record<string, string> = {
        dress: `A dramatic, high-fashion studio photograph of a highly realistic female mannequin ${ageDesc} (natural proportions, contemporary pose) displayed in a sleek, minimalist all-white studio with subtle shadow play. The mannequin is perfectly draped and fitted in a contemporary flowing dress made from ${fabric_type}. The ${pattern_type} pattern — ${pattern_description} — is beautifully visible across the entire garment. The exact colors ${colorNames} are faithfully reproduced in the fabric with colors: ${colorDesc}. The fabric creates elegant, fluid folds that showcase its natural drape and ${texture_detail}. Shot on a Phase One IQ4 camera with an 85mm portrait lens. Complex multi-source studio lighting: key light from 45 degrees creating dimensional shadows on the fabric folds, fill light for the ${base_color} base, and a rim light from behind to separate the mannequin from the background. Shallow depth of field focused on the upper body garment details. Full-body shot. Magazine-quality editorial fashion photography. No text.`,

        abaya: `An elegant, ethereal studio photograph of a highly realistic female mannequin ${ageDesc} wearing a flowing, floor-length abaya made from ${fabric_type}. The garment drapes with natural gravity, creating long, graceful vertical folds. The ${pattern_type} pattern (${pattern_description}) is luxuriously displayed across the flowing silhouette. Colors: ${colorDesc}. The ${base_color} base creates an air of refined sophistication. The mannequin stands in a soft, textured warm-ivory studio with subtle geometric shadows projected on the background. Shot on a Hasselblad X2D with a 90mm lens. Soft, diffused golden-hour style lighting creating an ethereal, luminous atmosphere that enhances the fabric's ${texture_detail}. Full-body shot. No text.`,

        hijab: `An elegant, close-up studio photograph of a realistic female mannequin ${ageDesc} head and shoulders, wearing a beautifully hand-styled hijab made from ${fabric_type}. The fabric is wrapped in a modern, fashionable draping style that reveals the ${pattern_type} pattern: ${pattern_description}. Colors visible in the folds: ${colorDesc}. The ${texture_detail} is visible where the fabric layers overlap, creating depth. Soft, flattering beauty lighting — a large octabox key light with a subtle golden reflector fill. Shallow depth of field. Shot on Fujifilm GFX100 with a 110mm portrait lens. The background is a clean, soft cream gradient. Focus on the artistry of the draping and the quality of the fabric print. No text.`,

        cocktail: `A sophisticated, ethereal studio photograph of a realistic female mannequin ${ageDesc} posed gracefully in a soft, textured cream-white studio. The mannequin is beautifully fitted in an elegant knee-length cocktail dress made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is revealed through the garment's construction and draping. Colors: ${colorDesc}. The delicate nature of the fabric with its ${texture_detail} creates subtle light-play and movement. Shot on a Fujifilm GFX100 with shallow depth of field. Soft, diffused natural light enhancing the delicate nature of the fabric. The ${overall_mood} aesthetic is paramount. Full-body shot. No text.`,

        pajamas: `A professional, warm studio photograph of a highly realistic female mannequin ${ageDesc} (natural, relaxed posture) standing in a calm, textured off-white cozy studio setting. The mannequin is perfectly fitted in a premium women's pajama set (long-sleeve top and matching pants) made from the soft ${fabric_type}. The ${pattern_type} pattern (${pattern_description}) is clearly and beautifully visible on both the top and pants. Colors: ${colorDesc}. The fabric drapes softly and comfortably, emphasizing the ${texture_detail}. Shot on a Canon EOS R5, 85mm lens. Diffused, warm honeyed natural light creates a cozy, intimate ambiance. Shallow depth of field, focused on the upper body garment details. Full-body shot. No text.`,

        mensuit: `A sophisticated, editorial studio photograph of a highly realistic male mannequin in a tailored two-piece business suit (jacket and trousers) made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is precisely visible in the suit's masterful tailoring — at the lapels, shoulder seams, and pocket welts. Colors: ${colorDesc}. Styled in a classic power studio: clean charcoal backdrop, subtle floor reflection. Shot on Canon EOS R5, 85mm lens. Warm, directional studio light emphasizing sharp tailoring lines and the interplay of light with the fabric's ${texture_detail}. Full-body shot. No text.`,

        shirt: `A professional studio product photograph of a realistic male mannequin torso wearing a perfectly pressed, tailored dress shirt made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is crisply visible — especially across the chest, collar, and cuffs. Colors: ${colorDesc}. Clean white infinity background. Shot on Canon EOS R5, 70mm lens. Bright, even studio lighting. Focus on the shirt's construction and the quality of the ${print_technique}. Half-body shot (waist up). No text.`,

        kidswear: `A cheerful, bright studio photograph of a child-sized realistic mannequin wearing comfortable, playful clothing (a loose top and relaxed shorts) made from ${fabric_type}. The ${pattern_type} pattern (${pattern_description}) gives the outfit a charming, youthful character. Colors: ${colorDesc}. The studio is bright and airy with a pastel gradient background. Shot on Sony A7R IV with a 50mm lens. Bright, warm directional studio lighting — creating a happy, optimistic atmosphere. The fabric's ${texture_detail} conveys comfort and softness perfect for children. Full-body shot. No text.`,

        sportswear: `A technical, high-energy studio photograph of a specialized matte-grey athletic mannequin in a dynamic running pose, displayed in a cool-toned, high-tech athletic studio with subtle geometric LED accents. The mannequin wears a functional sport set (fitted top and leggings) made from ${fabric_type}. The ${pattern_type} (${pattern_description}) shows the technical construction. The ${texture_detail} is clearly visible under simulated movement tension. Colors: ${colorDesc}. Shot on a Nikon Z9 with a 70-200mm zoom. Diffused, cool 5500K LED lighting from multiple angles. Full-body shot. No text.`,

        bedding: `A majestic, wide-angle interior design photograph of an opulent master bedroom suite in a luxury boutique hotel. The large, king-size bed is the centerpiece, dressed with opulent linens, a fluffy duvet, decorative pillows, and shams — ALL featuring the exact ${pattern_type} from the fabric: ${pattern_description}. Every piece of bedding shows the exact colors: ${colorDesc}. The base color ${base_color} is the unifying element across all pieces. The ${texture_detail} is visible in the close elements. The bed has a magnificent tall headboard upholstered in deep, textured velvet. Dark mahogany nightstands with classic brass and crystal lamps on either side. Heavy complementary drapes frame a large window showing soft morning light. The aesthetic is warm, opulent, and exclusive — ${overall_mood}. Shot on a Hasselblad X2D, 35mm wide-angle lens. A sophisticated mix of soft window sunlight and warm golden lamp light. Professional architectural photography quality. No text.`,

        curtain: `A rich, majestic photograph of heavy, floor-to-ceiling curtains made from ${fabric_type}, fully installed and draped on a grand window in an opulent, classic living room. The ${pattern_type} pattern (${pattern_description}) is beautifully revealed across the flowing curtain panels. Colors: ${colorDesc}. The curtains are artfully draped with deep, majestic folds, held back with elegant tasseled tie-backs. The living room features dark wood paneling and warm antique furnishings. Shot on a Canon EOS R5, 24-70mm wide-angle lens. Warm, directional golden light from the window creating complex shadows emphasizing the ${texture_detail}. Professional interior photography. No text.`,

        furniture: `A majestic, editorial interior design photograph of a modern luxury sofa suite in a high-end showroom. The three-seater sofa and a matching armchair are upholstered in ${fabric_type}. The ${pattern_type} pattern (${pattern_description}) covers the furniture beautifully — visible on seat cushions, back panels, and armrests. Colors: ${colorDesc}. The showroom features a sleek coffee table, a designer floor lamp, and a soft area rug. Shot on Canon EOS R5, 35mm lens. Warm ambient gallery lighting mixed with soft natural light. The ${texture_detail} of the upholstery fabric is clearly visible. Professional furniture catalog photography. No text.`,

        cushion: `A professional product photograph of premium decorative cushions/throw pillows arranged artfully on a neutral linen sofa. Each cushion is covered in ${fabric_type} showing the ${pattern_type}: ${pattern_description}. Colors: ${colorDesc}. The cushions vary in size to create visual interest. The ${texture_detail} is highlighted by gentle natural sidelight. Clean, bright living room setting. Shot on Sony A7R IV, 50mm lens. Bright editorial lifestyle photography style. No text.`,

        tablecloth: `A sophisticated overhead flatlay photograph of an elegant dining table set with a tablecloth made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is beautifully displayed on the table surface. Colors: ${colorDesc}. The tablecloth drapes naturally over the table edges. Place settings with fine white china, crystal glasses, and silver cutlery complement the fabric. Shot on Canon EOS R5, 50mm from directly above. Soft, even daylight. The ${texture_detail} is visible where the tablecloth creases at the table edge. No text.`,

        wedding: `A breathtaking, cinematic bridal studio photograph of a highly realistic female mannequin ${ageDesc} in a magnificent floor-length wedding gown made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is exquisitely showcased across the bodice, flowing skirt, and dramatic train. Colors: ${colorDesc}. The gown features structured boning on the bodice and a voluminous, layered skirt where the ${texture_detail} catches the light with ethereal beauty. The mannequin stands in a grand, all-white chapel-style studio with tall arched windows casting soft, divine natural light. Delicate spotlight from above creates a halo-like glow on the fabric. Crystal chandeliers add warm sparkle. A subtle cathedral veil in matching ${fabric_type} flows behind. Shot on a Hasselblad X2D, 85mm portrait lens. Dreamy, soft-focus background with razor-sharp garment details. The mood is romantic, timeless, and absolutely breathtaking. Full-body shot. No text.`,

        uniform: `A clean, professional studio photograph of a realistic mannequin (gender-neutral pose) wearing a well-tailored professional uniform made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is visible in the uniform's structured construction — collar, pocket flaps, and button placket. Colors: ${colorDesc}. The uniform is pressed and pristine, conveying professional authority and practicality. The ${texture_detail} shows the fabric's durability and wrinkle-resistance. Shot in a clean, bright studio with a light grey backdrop. Canon EOS R5, 85mm lens. Even, flat commercial lighting from soft boxes on both sides — no dramatic shadows: clean, corporate product photography. The fabric communicates reliability and professionalism. Full-body shot. No text.`,

        roll: `A professional B2B textile showroom photograph of a premium fabric roll displayed on an elegant dark walnut display shelf. The bolt of ${fabric_type} is partially unrolled, cascading gracefully over the shelf edge to reveal the full ${pattern_type}: ${pattern_description}. Colors: ${colorDesc}. The unrolled section shows approximately 60cm of fabric creating natural folds that demonstrate the ${texture_detail} and draping quality. A small fabric swatch card with the material code is placed beside it. The showroom has warm, professional gallery lighting — track lights from above, with ambient warmth. Other fabric rolls in complementary colors are slightly blurred in the background, creating depth. Shot on Canon EOS R5, 50mm lens. Sharp product focus. Professional wholesale textile catalog photography. No text.`,

        jacket: `A sophisticated studio photograph of a highly realistic mannequin torso wearing a tailored jacket/blazer made from ${fabric_type}. The ${pattern_type} (${pattern_description}) is precisely visible in the jacket's construction — lapels, shoulder line, pocket welts, and button stance. Colors: ${colorDesc}. The ${texture_detail} shows the fabric's body and structure. Styled with subtle layering — a crisp white shirt visible at the collar and cuffs. Shot on Canon EOS R5, 70mm lens. Directional studio light from the right creating dimensional shadows that emphasize the tailoring. Clean charcoal backdrop. Half-body shot (waist up). No text.`,

        tie: `An elegant, close-up product photograph of a premium necktie/bow-tie made from ${fabric_type}, artfully arranged on a dark marble surface. The ${pattern_type} (${pattern_description}) is visible in the tie's narrow width with exquisite detail. Colors: ${colorDesc}. The tie is loosely knotted in a classic Windsor style, with the tail end fanned out to show the full pattern repeat. The ${texture_detail} creates a subtle sheen under the directional light. Shot on Fujifilm GFX100, 110mm macro. Dramatic side lighting on dark background. Luxury accessory catalog photography. No text.`,
      };

      const scene = scenes[usage || 'bedding'] || scenes.dress;
      return scene;
    }

    case 'palette':
      return `A high-end, professional product presentation for a luxury textile catalog, displayed on a clean, minimalist studio background with a light linen canvas texture. The image features a sophisticated Fabric Analysis Card divided into two distinct sections. LEFT SECTION: A beautifully draped sample of the original ${fabric_type} fabric showing the ${pattern_type} pattern (${pattern_description}). RIGHT SECTION: A structured grid of ${Math.min(colors.length, 6)} premium Tactile Swatch Squares. Each square is NOT a flat solid color — it is a hyper-realistic, macro close-up CUT from a different area of the actual fabric, showing the real weave and ${print_technique} detail: ${colors.slice(0, 6).map((c, i) => `${i + 1}. "${c.name}" (${c.hex}): A micro-focus on the ${c.location} area showing individual threads and the specific color as it appears in the real fabric.`).join(' ')} Below each swatch square, a clean dark serif font displays the color name and hex code. The lighting is soft, directional studio light from the upper-left, casting subtle shadows emphasizing these are physical fabric cut-outs with real depth. Ultra-HD, 8K resolution, cinematic textile photography. No text other than the labels.`;

    case 'composite': {
      // 🎭 Mixed Luxury Card — fabric + colors + lifestyle in ONE image
      const bestUse = analysis.suggested_uses?.[0] || 'bedding';
      const colorsPreview = colors.slice(0, 4).map(c => `${c.name} (${c.hex})`).join(', ');
      return `A professional, ultra-high-resolution composite product presentation image for a luxury textile catalog, displayed on a clean studio background.

The image is divided into three elegant panels with thin gold separator lines:

TOP-LEFT PANEL (40% width): A hyper-realistic macro photograph of ${fabric_type} fabric, artfully draped with graceful folds that reveal the ${pattern_type}: ${pattern_description}. Colors visible: ${colorDesc}. Soft, diffused studio lighting from 45 degrees. Phase One camera quality. The ${texture_detail} creates beautiful depth.

TOP-RIGHT PANEL (40% width): A professional color analysis card on cream linen paper. Four square tactile fabric swatches arranged in a 2x2 grid, each showing a real macro close-up of the fabric's ${print_technique}. The swatches represent: ${colorsPreview}. Below each, a clean serif label shows the color name and hex code. Studio lighting casts subtle shadows proving these are physical cut-outs.

LARGE BOTTOM PANEL (full width): A cinematic lifestyle scene showing this exact fabric used as ${bestUse}. ${bestUse === 'bedding' ? `An opulent master bedroom with the bed dressed in linens featuring the exact ${pattern_type} pattern, with colors ${colorDesc}. Velvet headboard, mahogany nightstands, crystal lamps, and warm golden window light.` : bestUse === 'curtain' ? `Heavy floor-to-ceiling curtains with the exact ${pattern_type} pattern in a grand living room. Deep majestic folds with gold holdbacks, dark wood paneling, warm window light.` : `A beautifully styled scene showcasing this ${fabric_type} with ${pattern_type} pattern in a professional ${bestUse} context.`} Shot on Hasselblad X2D. Warm, inviting atmosphere.

The overall composition is clean, balanced, and magazine-quality. ${luxury_level || 'Premium'} aesthetic. No text other than the color labels. Ultra-HD 8K resolution.`;
    }

    case 'color_variant':
      if (colorTarget) {
        return `Transform the color of this ${fabric_type} fabric to ${colorTarget.name_en || colorTarget.name_ar} (${colorTarget.hex}). PRECISE RULES: Preserve the EXACT same ${pattern_type} pattern: ${pattern_description}. Preserve the EXACT same ${texture_detail}. Preserve the same weave structure and ${print_technique}. ONLY change the base color from ${base_color} to ${colorTarget.name_en || colorTarget.name_ar} (${colorTarget.hex}). If the fabric has multi-color prints (like ${colorNames}), shift all colors proportionally to complement the new base. The recolored fabric must look natural and realistic. Maintain the same professional studio lighting and draping angle.`;
      }
      return `Create a new color variant of this ${fabric_type} fabric. Keep the exact ${pattern_type} pattern (${pattern_description}) but shift to a new complementary color. Professional product photography.`;

    default:
      return `Professional product photography of ${fabric_type} fabric showing the ${pattern_type}: ${pattern_description}. Colors: ${colorDesc}. The mood is ${overall_mood}. Studio lighting. 8K resolution. No text.`;
  }
}

// ═══════════════════════════════════════════════════
// 🎨 Imagen Text-to-Image (Imagen 4.0 via Generative Language API)
// ═══════════════════════════════════════════════════
async function generateWithImagen(
  apiKey: string, prompt: string, model: string,
): Promise<{ data: string; mimeType: string } | null> {
  // Imagen 4.0 uses Generative Language API (same as Gemini), not Vertex AI
  const url = `${GEMINI_API_BASE}/${model}:predict?key=${apiKey}`;
  console.log(`[AI] 🎨 Generating with ${model} (Generative Language API)...`);
  console.log(`[AI] 📝 Prompt (first 150 chars): "${prompt.substring(0, 150)}..."`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
        },
      }),
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[AI] ❌ ${model} → ${resp.status}: ${errText.substring(0, 300)}`);
      return null;
    }

    const result = await resp.json();
    const predictions = result?.predictions || [];

    for (const pred of predictions) {
      if (pred.bytesBase64Encoded) {
        const sizeKB = Math.round(pred.bytesBase64Encoded.length * 0.75 / 1024);
        console.log(`[AI] ✅ ${model} → image (${pred.mimeType || 'image/png'}, ${sizeKB}KB)`);
        return { data: pred.bytesBase64Encoded, mimeType: pred.mimeType || 'image/png' };
      }
    }

    console.warn(`[AI] ⚠️ ${model} → no image in predictions`);
    return null;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error(`[AI] ⏰ ${model} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    } else {
      console.error(`[AI] ❌ ${model} fetch error:`, err);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
// ✏️ Imagen Edit (Nuxa Smart Editor — for recoloring)
// ═══════════════════════════════════════════════════
async function generateWithImagenStyleRef(
  apiKey: string, prompt: string, refImgB64: string, model?: string,
): Promise<{ data: string; mimeType: string } | null> {
  const targetModel = model || 'imagen-3.0-generate-001';
  const url = `${VERTEX_API_BASE}/publishers/google/models/${targetModel}:predict?key=${apiKey}`;
  const imgSizeKB = Math.round(refImgB64.length * 0.75 / 1024);
  console.log(`[AI] 🎨 Generating with ${targetModel} + Style Reference (${imgSizeKB}KB)...`);
  console.log(`[AI] 📝 Prompt: "${prompt.substring(0, 120)}..."`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        instances: [{
          prompt,
          referenceImages: [{
            referenceImage: {
              bytesBase64Encoded: refImgB64,
            },
            referenceType: 'STYLE_REFERENCE',
            referenceId: 0,
          }],
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          addWatermark: false,
        },
      }),
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[AI] ❌ ${targetModel} Style Ref → ${resp.status}: ${errText.substring(0, 400)}`);
      return null;
    }

    const result = await resp.json();
    const predictions = result?.predictions || [];

    for (const pred of predictions) {
      if (pred.bytesBase64Encoded) {
        const sizeKB = Math.round(pred.bytesBase64Encoded.length * 0.75 / 1024);
        console.log(`[AI] ✅ ${targetModel} Style Ref → image (${sizeKB}KB)`);
        return { data: pred.bytesBase64Encoded, mimeType: pred.mimeType || 'image/png' };
      }
    }

    console.warn(`[AI] ⚠️ ${targetModel} Style Ref → no image in predictions`);
    return null;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error(`[AI] ⏰ ${targetModel} Style Ref timed out`);
    } else {
      console.error(`[AI] ❌ ${targetModel} Style Ref error:`, err);
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════
// 🔄 Fallback: Gemini Flash for image-to-image
// Used when Imagen models fail
// ═══════════════════════════════════════════════════
async function generateWithGeminiImageGen(
  apiKey: string, imgB64: string, imgMime: string, prompt: string, accessToken?: string,
): Promise<{ data: string; mimeType: string } | null> {
  // ALL models verified available via diagnose API
  const models = [
    MODELS.GEMINI_IMAGE_GEN,    // gemini-2.5-flash-image (Nano Banana — fast)
    MODELS.GEMINI_IMAGE_GEN_2,  // gemini-3.1-flash-image-preview (Nano Banana 2 — recommended)
    MODELS.GEMINI_IMAGE_GEN_3,  // gemini-3-pro-image-preview (Nano Banana Pro — best quality)
  ];

  for (const model of models) {
    console.log(`[AI] 🎨 Image generation: ${model} (with reference image)...`);
    
    // Use Bearer token (service account) if available, else API key
    const url = accessToken
      ? `${GEMINI_API_BASE}/${model}:generateContent`
      : `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s for image gen

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              // Reference image FIRST — this is the most important input
              { inline_data: { mime_type: imgMime, data: imgB64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 1.0,
          },
        }),
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error(`[AI] ❌ ${model} → ${resp.status}: ${errText.substring(0, 200)}`);
        continue;
      }

      const result = await resp.json();
      const candidate = result?.candidates?.[0];
      const finishReason = candidate?.finishReason || '';
      const parts = candidate?.content?.parts || [];

      // Check for IMAGE_RECITATION — model refused but may work with simpler prompt
      if (finishReason === 'IMAGE_RECITATION') {
        console.warn(`[AI] ⚠️ ${model} → IMAGE_RECITATION (model refused). Retrying with scene-aware simpler prompt...`);
        
        // Build a simpler but SCENE-AWARE fallback prompt
        // Extract scene intent from the original prompt to avoid defaulting to bedding
        let sceneHint = 'Display it elegantly in a professional studio';
        const promptLower = prompt.toLowerCase();
        if (promptLower.includes('flat lay') || promptLower.includes('top-down')) {
          sceneHint = 'Lay the fabric FLAT on a rustic wooden table, photographed from directly above (bird\'s-eye view). NO bed, NO furniture';
        } else if (promptLower.includes('display table') || promptLower.includes('showroom table')) {
          sceneHint = 'Drape the fabric over a showroom display table, cascading from the edge. NO bed, NO bedding';
        } else if (promptLower.includes('hanging') || promptLower.includes('showroom rail')) {
          sceneHint = 'Hang the fabric full-length on a brass display rail in a fabric store. NO bed, NO furniture';
        } else if (promptLower.includes('roll') || promptLower.includes('bolt')) {
          sceneHint = 'Show the fabric as professional rolled bolts in a textile store. NO bed, NO furniture';
        } else if (promptLower.includes('swirl') || promptLower.includes('spiral')) {
          sceneHint = 'Arrange the fabric in an artistic spiral/rosette fold on a marble surface. NO bed, NO furniture';
        } else if (promptLower.includes('macro') || promptLower.includes('close-up')) {
          sceneHint = 'Extreme macro close-up showing thread-level weave detail. NO bed, NO furniture';
        } else if (promptLower.includes('dress')) {
          sceneHint = 'Show a model wearing a flowing dress made from this fabric';
        } else if (promptLower.includes('evening gown') || promptLower.includes('gown')) {
          sceneHint = 'Show a floor-length evening gown made from this fabric on marble stairs';
        } else if (promptLower.includes('abaya')) {
          sceneHint = 'Show a modern luxury abaya made from this fabric';
        } else if (promptLower.includes('suit')) {
          sceneHint = 'Show a tailored men\'s suit made from this fabric';
        } else if (promptLower.includes('curtain')) {
          sceneHint = 'Show floor-to-ceiling curtains made from this fabric with a city view behind';
        } else if (promptLower.includes('bedding') || promptLower.includes('duvet')) {
          sceneHint = 'Show a luxury hotel bedding set made from this fabric';
        } else if (promptLower.includes('sofa') || promptLower.includes('upholster')) {
          sceneHint = 'Show a designer sofa upholstered in this fabric';
        } else if (promptLower.includes('cushion') || promptLower.includes('pillow')) {
          sceneHint = 'Show decorative throw cushions made from this fabric on a neutral sofa';
        }

        const simplePrompt = `LOOK at the attached reference fabric image. Create a professional photograph showing this EXACT SAME fabric material with IDENTICAL colors, patterns, and texture. ${sceneHint}. 8K quality, professional lighting.`;
        console.log(`[AI] 🔄 Retry prompt: "${simplePrompt.substring(0, 200)}..."`);
        try {
          const retryResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inline_data: { mime_type: imgMime, data: imgB64 } },
                  { text: simplePrompt },
                ],
              }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
                temperature: 1.0,
              },
            }),
          });
          if (retryResp.ok) {
            const retryResult = await retryResp.json();
            const retryParts = retryResult?.candidates?.[0]?.content?.parts || [];
            for (const rp of retryParts) {
              if (rp.inline_data?.data) {
                const sizeKB = Math.round(rp.inline_data.data.length * 0.75 / 1024);
                console.log(`[AI] ✅ ${model} → image on retry (${sizeKB}KB)`);
                return { data: rp.inline_data.data, mimeType: rp.inline_data.mime_type || 'image/png' };
              }
            }
          }
          console.warn(`[AI] ⚠️ ${model} retry also failed`);
        } catch { console.warn(`[AI] ⚠️ ${model} retry error`); }
        continue;
      }

      for (const part of parts) {
        if (part.inline_data?.data) {
          const sizeKB = Math.round(part.inline_data.data.length * 0.75 / 1024);
          console.log(`[AI] ✅ ${model} → image (${sizeKB}KB)`);
          return { data: part.inline_data.data, mimeType: part.inline_data.mime_type || 'image/png' };
        }
      }

      // Log text/error response if no image
      console.warn(`[AI] ⚠️ ${model} → finishReason: ${finishReason}`);
      for (const part of parts) {
        if (part.text) {
          console.warn(`[AI] ⚠️ ${model} text: ${part.text.substring(0, 200)}`);
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === 'AbortError') {
        console.error(`[AI] ⏰ ${model} timed out`);
      } else {
        console.error(`[AI] ❌ ${model} error:`, err);
      }
      continue;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════
function getScope(t: string): string {
  return ({ texture: 'detail', palette: 'detail', color_variant: 'color', usage: 'lifestyle', studio: 'product', composite: 'catalog' } as any)[t] || 'product';
}

function json(d: any, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ═══════════════════════════════════════════════════════════════
// 📝 Short prompts for Gemini image generation (image-guided)
// These are SHORT and DIRECTIVE — Gemini sees the reference image
// ═══════════════════════════════════════════════════════════════
function buildShortPrompt(type: string, analysis: FabricAnalysis, usage?: string, ageRange?: string, fabricTypeOverride?: string, colorTarget?: any): string {
  const fabricType = fabricTypeOverride || analysis.fabric_type || 'fabric';

  let colorInstruction = "Same pattern, same colors, same density.";
  if (colorTarget) {
      const colorName = colorTarget.name_en || colorTarget.name_ar || 'new color';
      const applyMode = colorTarget.applyMode || 'all';

      if (applyMode === 'background') {
          colorInstruction = `Preserve the EXACT same pattern and print colors, but CHANGE the BASE/BACKGROUND color to ${colorName} (${colorTarget.hex}). Maintain texture and shadows.`;
      } else if (applyMode === 'pattern') {
          colorInstruction = `Preserve the EXACT same background base color, but CHANGE the PATTERN/DESIGN color to ${colorName} (${colorTarget.hex}). Maintain texture and shadows.`;
      } else {
          colorInstruction = `Same pattern and density, but CHANGE the overall base color to ${colorName} (${colorTarget.hex}). Preserve texture and shadows.`;
      }
  }

  // CRITICAL: Start with "Generate an image" to force image output mode
  // Using explicit instructions to prevent Gemini from just returning the original image.
  const REF = `Transform the reference photo into a NEW professional image. ${colorInstruction}`;

  switch (type) {
    case 'studio':
      return `${REF} The new image MUST be a professional studio product photo showing this ${fabricType} draped elegantly on a textured surface with beautiful lighting.`;

    case 'texture':
      return `${REF} The new image MUST be an extreme macro close-up of this ${fabricType} showing thread-level texture detail filling the entire frame.`;

    case 'palette':
      return `${REF} The new image MUST be a professional color analysis card showing 4 small fabric swatches cut from this ${fabricType} with elegant color labels underneath, arranged on a clean white background.`;

    case 'composite':
      return `${REF} The new image MUST be a luxury catalog layout containing three sections combined beautifully: 1) The draped fabric, 2) small color swatches, and 3) a ${usage || 'bedding'} interior/lifestyle scene using this ${fabricType}.`;

    case 'usage': {
      const scene = usage || 'dress';
      const scenes: Record<string, string> = {
        dress: `${REF} The new image MUST show an evening gown on a mannequin made entirely from this ${fabricType}. Fashion studio setting.`,
        cocktail: `${REF} The new image MUST show a cocktail dress on a mannequin made entirely from this ${fabricType}. Studio photo.`,
        wedding: `${REF} The new image MUST show a wedding gown on a mannequin made entirely from this ${fabricType}. Bright luxury venue.`,
        abaya: `${REF} The new image MUST show a modern abaya on a mannequin made entirely from this ${fabricType}. Studio photo.`,
        hijab: `${REF} The new image MUST show a hijab styled elegantly on a mannequin made entirely from this ${fabricType}. Portrait photography.`,
        pajamas: `${REF} The new image MUST show pajamas on a mannequin made entirely from this ${fabricType}. Cozy bedroom setting.`,
        mensuit: `${REF} The new image MUST show a tailored men's suit on a mannequin made entirely from this ${fabricType}. Studio photo.`,
        shirt: `${REF} The new image MUST show a dress shirt on a mannequin made entirely from this ${fabricType}. Studio photo.`,
        jacket: `${REF} The new image MUST show a structured blazer/jacket on a mannequin made entirely from this ${fabricType}. Studio photo.`,
        tie: `${REF} The new image MUST show a necktie made entirely from this ${fabricType} resting on a dark surface. Product photo.`,
        kidswear: `${REF} The new image MUST show a children's outfit made entirely from this ${fabricType}. Bright studio photo.`,
        sportswear: `${REF} The new image MUST show athletic sportswear made entirely from this ${fabricType}. Dynamic sports photo.`,
        uniform: `${REF} The new image MUST show a professional uniform made entirely from this ${fabricType}. Studio photo.`,
        bedding: `${REF} The new image MUST show a modern bedroom with bed linens made entirely from this ${fabricType}. Interior design photo.`,
        curtain: `${REF} The new image MUST show floor-to-ceiling curtains made entirely from this ${fabricType} in a living room. Interior design photo.`,
        furniture: `${REF} The new image MUST show a modern sofa upholstered entirely in this ${fabricType}. Interior design photo.`,
        cushion: `${REF} The new image MUST show decorative cushions/pillows made entirely from this ${fabricType} on a modern sofa. Interior design photo.`,
        tablecloth: `${REF} The new image MUST show a dining table set with a tablecloth made entirely from this ${fabricType}. Interior design photo.`,
        roll: `${REF} The new image MUST show a premium fabric bolt/roll of this ${fabricType} resting on a display shelf. Showroom product photo.`,
      };
      return scenes[scene] || scenes.dress;
    }

    default:
      return `${REF} The new image MUST be a professional product photo showcasing this ${fabricType}.`;
  }
}

// ═══════════════════════════════════════════════════
// 🎨 Inspiration Cards Generator
// Creates color palette variations based on fabric analysis
// ═══════════════════════════════════════════════════
function generateInspirationCards(analysis: FabricAnalysis): any[] {
  const analyzedColors = analysis.colors || [];
  // Use explicit background/motif fields (most accurate)
  const mainColor = (analysis as any).background_color_hex || analyzedColors[0]?.hex || '#808080';
  const secondColor = (analysis as any).motif_color_hex || analyzedColors[1]?.hex || shiftHue(mainColor, 30);
  const thirdColor = analyzedColors[2]?.hex || shiftHue(mainColor, -30);
  const patternType = analysis.pattern_type || 'geometric';
  const fabricType = analysis.fabric_type || 'silk';

  // Map detected pattern
  const patternMapping: Record<string, string> = {
    'floral': 'floral', 'flower': 'floral', 'botanical': 'botanical', 'rose': 'floral',
    'geometric': 'geometric', 'lattice': 'geometric', 'chevron': 'geometric',
    'damask': 'damask', 'scroll': 'damask', 'ornamental': 'damask',
    'stripe': 'stripes', 'striped': 'stripes',
    'abstract': 'abstract', 'paisley': 'oriental', 'arabesque': 'oriental',
    'minimalist': 'minimalist', 'simple': 'minimalist',
  };
  let detectedPattern = 'floral';
  const ptLower = patternType.toLowerCase();
  for (const [key, val] of Object.entries(patternMapping)) {
    if (ptLower.includes(key)) { detectedPattern = val; break; }
  }

  // Suggest compatible pattern alternatives
  const patternAlternatives: Record<string, string[]> = {
    'floral': ['botanical', 'damask', 'abstract'],
    'geometric': ['minimalist', 'stripes', 'abstract'],
    'damask': ['oriental', 'floral', 'botanical'],
    'stripes': ['geometric', 'minimalist', 'abstract'],
    'abstract': ['geometric', 'floral', 'minimalist'],
    'oriental': ['damask', 'botanical', 'floral'],
    'minimalist': ['geometric', 'stripes', 'abstract'],
    'botanical': ['floral', 'abstract', 'oriental'],
  };
  const altPatterns = patternAlternatives[detectedPattern] || ['floral', 'geometric', 'damask'];

  const cards: any[] = [];
  const scenes = ['evening_gown', 'flat_lay', 'dress', 'curtain', 'bedding', 'abaya'];
  let sceneIdx = 0;

  // ═══ 1️⃣ Original tones (from image) ═══
  cards.push({
    id: 'insp_original',
    name: `${analyzedColors[0]?.name || 'Original'}`,
    patternStyle: detectedPattern,
    fabricType, season: 'timeless',
    baseColor: mainColor, motifColor: secondColor,
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  // ═══ 2️⃣ Harmonious: analogous from image colors ═══
  cards.push({
    id: 'insp_analogous',
    name: 'Analogous Harmony',
    patternStyle: detectedPattern,
    fabricType, season: 'spring_summer',
    baseColor: shiftHue(mainColor, 25), motifColor: shiftHue(mainColor, -25),
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  // ═══ 3️⃣ Complementary from main image color ═══
  cards.push({
    id: 'insp_complement',
    name: 'Complementary',
    patternStyle: detectedPattern,
    fabricType, season: 'timeless',
    baseColor: mainColor, motifColor: shiftHue(mainColor, 180),
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  // ═══ 4️⃣ Triadic from image ═══
  cards.push({
    id: 'insp_triadic',
    name: 'Triadic Palette',
    patternStyle: detectedPattern,
    fabricType, season: 'autumn_winter',
    baseColor: shiftHue(mainColor, 120), motifColor: shiftHue(mainColor, 240),
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  // ═══ 5️⃣ Warm tone from image ═══
  cards.push({
    id: 'insp_warm',
    name: 'Warm Tones',
    patternStyle: altPatterns[0] || detectedPattern,
    fabricType, season: 'autumn_winter',
    baseColor: warmShift(mainColor), motifColor: warmShift(secondColor),
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  // ═══ 6️⃣ Cool tone from image ═══
  cards.push({
    id: 'insp_cool',
    name: 'Cool Tones',
    patternStyle: altPatterns[1] || detectedPattern,
    fabricType, season: 'spring_summer',
    baseColor: coolShift(mainColor), motifColor: coolShift(secondColor),
    sceneType: scenes[sceneIdx++ % scenes.length],
  });

  return cards;
}

// Shift toward warm (add orange/red)
function warmShift(hex: string): string {
  try {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 30);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 20);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  } catch { return hex; }
}

// Shift toward cool (add blue)
function coolShift(hex: string): string {
  try {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 20);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 30);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  } catch { return hex; }
}

// Simple color hue shift
function shiftHue(hex: string, degrees: number): string {
  try {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    h = ((h * 360 + degrees) % 360) / 360;
    if (h < 0) h += 1;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p2 = 2 * l - q2;
    r = hue2rgb(p2, q2, h + 1/3); g = hue2rgb(p2, q2, h); b = hue2rgb(p2, q2, h - 1/3);
    return `#${Math.round(r*255).toString(16).padStart(2,'0')}${Math.round(g*255).toString(16).padStart(2,'0')}${Math.round(b*255).toString(16).padStart(2,'0')}`;
  } catch { return '#808080'; }
}

// ═══════════════════════════════════════════════════
// 🚀 Main Handler
// ═══════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  console.log(`[AI] ═══ generate-material-images V7 (Two-Phase + Imagen Fallback) ═══`);

  try {
    const apiKey = Deno.env.get("GOOGLE_AI_KEY") || Deno.env.get("GOOGLE_VERTEX_AI_KEY");
    if (!apiKey) {
      console.error('[AI] ❌ No AI key configured');
      return json({ error: 'AI not configured', success: false }, 500);
    }

    // ═══ GET TOKEN MODE ═══
    // Frontend requests an access token to call Google API directly
    try {
      const peekBody = await req.clone().text();
      const peekJson = JSON.parse(peekBody);
      
      if (peekJson?.action === 'get_token') {
        console.log('[AI] 🔑 Token request from frontend...');
        const token = await getAccessTokenFromServiceAccount();
        if (token) {
          console.log('[AI] ✅ Token issued to frontend');
          return json({ access_token: token, expires_in: 3600 });
        } else {
          console.error('[AI] ❌ Failed to generate token');
          return json({ error: 'Failed to generate access token' }, 500);
        }
      }

      // ═══ GET API KEY MODE ═══
      // Frontend requests API key to call Gemini directly (bypasses Edge Function region block)
      if (peekJson?.action === 'get_api_key') {
        console.log('[AI] 🔑 API key request from frontend for direct Gemini calls');
        return json({ 
          api_key: apiKey, 
          models: {
            image_gen: 'gemini-2.5-flash-image',
            image_gen_2: 'gemini-3.1-flash-image-preview',
            image_gen_pro: 'gemini-3-pro-image-preview',
          },
          api_base: 'https://generativelanguage.googleapis.com/v1beta/models',
        });
      }
      
      if (peekJson?.action === 'diagnose') {
        console.log('[AI] 🔍 Running diagnostic...');
        const results: any = {
          api_key_prefix: apiKey.substring(0, 12) + '...',
          api_key_length: apiKey.length,
          vertex_region: VERTEX_REGION,
          tests: {},
        };

        // Test 1: Gemini text
        try {
          const r1 = await fetch(`${GEMINI_API_BASE}/${MODELS.ANALYZER}:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say OK' }] }], generationConfig: { maxOutputTokens: 5 } }),
          });
          const d1 = await r1.text();
          results.tests.gemini_text = { status: r1.status, ok: r1.ok, response: d1.substring(0, 300) };
        } catch (e) { results.tests.gemini_text = { error: (e as Error).message }; }

        // Test 2: Gemini image gen
        try {
          const r2 = await fetch(`${GEMINI_API_BASE}/${MODELS.GEMINI_IMAGE_GEN}:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Generate a tiny red square image' }] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1.0 },
            }),
          });
          const d2 = await r2.text();
          results.tests.gemini_image = { status: r2.status, ok: r2.ok, response: d2.substring(0, 300) };
        } catch (e) { results.tests.gemini_image = { error: (e as Error).message }; }

        // Test 3: Imagen 3 (europe-west1)
        try {
          const r3 = await fetch(`${VERTEX_API_BASE}/publishers/google/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: 'red square' }], parameters: { sampleCount: 1 } }),
          });
          const d3 = await r3.text();
          results.tests.imagen_europe = { status: r3.status, ok: r3.ok, response: d3.substring(0, 300) };
        } catch (e) { results.tests.imagen_europe = { error: (e as Error).message }; }

        // Test 4: Imagen 3 (us-central1) for comparison
        try {
          const r4 = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/publishers/google/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instances: [{ prompt: 'red square' }], parameters: { sampleCount: 1 } }),
          });
          const d4 = await r4.text();
          results.tests.imagen_us = { status: r4.status, ok: r4.ok, response: d4.substring(0, 300) };
        } catch (e) { results.tests.imagen_us = { error: (e as Error).message }; }

        // Test available Gemini models — filter for image-capable ones
        try {
          const r5 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const d5 = await r5.json();
          const allModels = (d5.models || []).map((m: any) => m.name);
          const imageKeywords = ['image', 'nano', 'preview'];
          const imageModels = allModels.filter((n: string) => imageKeywords.some(k => n.includes(k)));
          results.tests.available_models = {
            total: allModels.length,
            all_names: allModels,
            image_specific: imageModels,
          };
        } catch (e) { results.tests.available_models = { error: (e as Error).message }; }

        // Test 5: Try multiple image gen candidate models
        const candidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];
        results.tests.image_gen_candidates = {};
        for (const candidate of candidates) {
          try {
            const rc = await fetch(`${GEMINI_API_BASE}/${candidate}:generateContent?key=${apiKey}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Generate a tiny 50x50 red square image.' }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1.0 },
              }),
            });
            const dc = await rc.text();
            const hasImage = dc.includes('inline_data');
            results.tests.image_gen_candidates[candidate] = {
              status: rc.status, ok: rc.ok, has_image: hasImage,
              response: dc.substring(0, 200),
            };
          } catch (e) { results.tests.image_gen_candidates[candidate] = { error: (e as Error).message }; }
        }

        return json({ diagnostic: true, ...results });
      }

      // ═══ ANALYZE MODE ═══
      // Frontend sends an image for analysis only (no generation)
      if (peekJson?.action === 'analyze' && peekJson?.reference_image_base64) {
        console.log('[AI] 🔍 Analyze-only request from Inspiration Studio...');
        const apiKey = Deno.env.get("GOOGLE_AI_KEY") || Deno.env.get("GOOGLE_VERTEX_AI_KEY");
        if (!apiKey) return json({ error: 'AI not configured' }, 500);
        
        const accessToken = await getAccessTokenFromServiceAccount();
        const imgB64 = peekJson.reference_image_base64;
        const imgMime = peekJson.reference_image_mime || 'image/jpeg';
        
        const analysis = await analyzeFabricImage(apiKey, imgB64, imgMime, accessToken || undefined);
        
        if (!analysis) {
          return json({ success: false, error: 'Analysis failed' });
        }

        // Generate inspiration card suggestions based on analysis
        const inspirationCards = generateInspirationCards(analysis);
        
        console.log(`[AI] ✅ Analysis complete: ${analysis.fabric_type}, pattern: ${analysis.pattern_type}`);
        return json({
          success: true,
          fabric_analysis: analysis,
          inspiration_cards: inspirationCards,
        });
      }
    } catch { /* not special request, continue normally */ }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Auth
    const authH = req.headers.get('Authorization');
    let userId = '', tenantId = '';
    if (authH) {
      try {
        const token = authH.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || '';
        tenantId = payload.user_metadata?.tenant_id || payload.app_metadata?.tenant_id || '';
      } catch { /* ignore */ }
    }

    // Parse body
    let body: any;
    try {
      const rawBody = await req.text();
      console.log(`[AI] 📦 Body size: ${(rawBody.length / 1024).toFixed(0)} KB`);
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON body', success: false }, 400);
    }

    // ═══════════════════════════════════════════════
    // 🎨 INSPIRATION MODE: Standalone studio (no material_id required)
    // ═══════════════════════════════════════════════
    const isInspirationMode = body?.inspiration_mode === true;

    if (!isInspirationMode && (!body?.material_id || !body?.company_id || !body?.reference_image_base64)) {
      return json({ error: 'Missing: material_id, company_id, reference_image_base64', success: false }, 400);
    }
    if (isInspirationMode && !body?.reference_image_base64) {
      return json({ error: 'Missing: reference_image_base64', success: false }, 400);
    }

    const genType = body.generation_type || 'studio';
    const mat = body.material_info || { name: 'Fabric' };
    const code = mat.code || (isInspirationMode ? 'inspiration' : 'mat');
    const imgB64 = body.reference_image_base64;
    const imgMime = body.reference_image_mime || 'image/jpeg';
    const imgSizeKB = Math.round(imgB64.length * 0.75 / 1024);

    if (isInspirationMode) {
      console.log(`[AI] 🎨 INSPIRATION MODE — custom prompt from Studio`);
    }
    console.log(`[AI] 🎯 Type: ${genType}, Material: ${code}, Image: ${imgSizeKB}KB`);

    // ═══════════════════════════════════════════════
    // 🔑 Get Service Account token (used for ALL API calls)
    // ═══════════════════════════════════════════════
    const accessToken = await getAccessTokenFromServiceAccount();
    if (accessToken) {
      console.log(`[AI] 🔑 Service Account token obtained — using for all calls`);
    } else {
      console.warn(`[AI] ⚠️ No Service Account — using API key fallback`);
    }

    // ═══════════════════════════════════════════════════════
    // 🚀 INSPIRATION MODE: DIRECT FAST PATH
    // Skip ALL analysis + Art Director. Just send image + prompt to Gemini
    // using the SAME proven generateWithGeminiImageGen function.
    // ═══════════════════════════════════════════════════════
    if (isInspirationMode && body.custom_short_prompt) {
      console.log(`[AI] 🚀 INSPIRATION DIRECT MODE — bypassing all analysis`);
      console.log(`[AI] 📋 Prompt: "${body.custom_short_prompt.substring(0, 300)}..."`);

      // Use the PROVEN function that was working before
      const img = await generateWithGeminiImageGen(apiKey, imgB64, imgMime, body.custom_short_prompt, accessToken || undefined);
      
      if (!img) {
        return json({ success: false, error: 'Image generation failed — try a different scene or image' }, 500);
      }

      // Upload to storage
      const storagePath = `inspirations/${code}_${Date.now()}.png`;
      const imgBuffer = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
      await admin.storage.from('material-images').upload(storagePath, imgBuffer, {
        contentType: img.mimeType, upsert: true,
      });
      const { data: publicUrl } = admin.storage.from('material-images').getPublicUrl(storagePath);

      console.log(`[AI] ✅ INSPIRATION DONE in ${Date.now() - t0}ms`);
      return json({
        success: true,
        image: { url: publicUrl.publicUrl, storage_path: storagePath },
        model_used: 'gemini-image-gen',
        elapsed_ms: Date.now() - t0,
      });
    }

    // ═══════════════════════════════════════════════
    // 🧠 PHASE 1: Fabric Analysis (NON-inspiration mode only)
    // Use cached analysis if provided, otherwise analyze
    // ═══════════════════════════════════════════════
    let analysis: FabricAnalysis;

    if (body.fabric_analysis) {
      console.log('[AI] 📋 Using cached fabric analysis');
      analysis = body.fabric_analysis;
    } else {
      console.log('[AI] 🧠 No cached analysis → running Phase 1...');
      const result = await analyzeFabricImage(apiKey, imgB64, imgMime, accessToken || undefined);
      if (!result) {
        // Fallback: create a basic analysis from material info
        console.warn('[AI] ⚠️ Analysis failed — using fallback from material metadata');
        analysis = {
          fabric_type: mat.fabric_type || mat.name || 'fabric',
          weave: 'standard weave',
          pattern_type: mat.design || 'textile pattern',
          pattern_description: `${mat.name || 'fabric'} with characteristic pattern and texture`,
          base_color: mat.color || 'neutral',
          overall_mood: 'professional, elegant',
          colors: [{ name: 'Primary', hex: '#808080', location: 'throughout' }],
          texture_detail: 'smooth textile surface',
          print_technique: 'standard textile printing',
          suggested_uses: ['general purpose'],
          luxury_level: 'standard',
          weight: 'medium',
          opacity: 'opaque',
          stretch: 'none',
          season: 'all-season',
        };
      } else {
        analysis = result;
      }
    }

    // ═══════════════════════════════════════════════
    // 🎨 PHASE 2: Image Generation
    // ═══════════════════════════════════════════════

    // 🎬 Art Director Logic: auto-detect best scene from analysis
    let usageContext = body.usage_context;
    if (genType === 'usage' && analysis.suggested_uses?.length > 0) {
      // Map Gemini's suggested_uses to our scene templates
      const usageMap: Record<string, string> = {
        'bedding': 'bedding', 'bed linen': 'bedding', 'bed sheets': 'bedding',
        'sheets': 'bedding', 'duvet': 'bedding', 'pillowcases': 'bedding',
        'curtains': 'curtain', 'drapes': 'curtain', 'window treatment': 'curtain',
        'curtain': 'curtain', 'sheer curtains': 'curtain',
        'upholstery': 'furniture', 'sofa': 'furniture', 'furniture': 'furniture',
        'cushions': 'cushion', 'throw pillows': 'cushion', 'decorative pillows': 'cushion',
        'tablecloth': 'tablecloth', 'table linen': 'tablecloth',
        'dress': 'dress', 'evening wear': 'dress', 'gown': 'dress', 'evening gown': 'dress',
        'women\'s wear': 'dress', 'fashion': 'dress',
        'wedding': 'wedding', 'wedding dress': 'wedding', 'bridal': 'wedding', 'bridal gown': 'wedding',
        'abaya': 'abaya', 'modest wear': 'abaya',
        'hijab': 'hijab', 'headscarf': 'hijab', 'scarf': 'hijab',
        'suit': 'mensuit', 'men\'s wear': 'mensuit', 'tailoring': 'mensuit',
        'shirt': 'shirt', 'blouse': 'shirt',
        'jacket': 'jacket', 'blazer': 'jacket', 'coat': 'jacket', 'outerwear': 'jacket',
        'tie': 'tie', 'necktie': 'tie', 'bow tie': 'tie', 'accessories': 'tie',
        'children': 'kidswear', 'kids': 'kidswear', 'children\'s wear': 'kidswear',
        'sportswear': 'sportswear', 'activewear': 'sportswear', 'athletic': 'sportswear',
        'pajamas': 'pajamas', 'sleepwear': 'pajamas', 'loungewear': 'pajamas',
        'cocktail': 'cocktail', 'party wear': 'cocktail',
        'uniform': 'uniform', 'workwear': 'uniform', 'professional wear': 'uniform',
        'bags': 'roll', 'general purpose': 'roll',
      };

      // If user didn't specify a scene, auto-detect from analysis
      if (!usageContext || usageContext === 'dress') {
        for (const suggestion of analysis.suggested_uses) {
          const normalized = suggestion.toLowerCase().trim();
          if (usageMap[normalized]) {
            usageContext = usageMap[normalized];
            console.log(`[AI] 🎬 Art Director: auto-selected "${usageContext}" from analysis suggestion "${suggestion}"`);
            break;
          }
          // Partial match
          for (const [key, val] of Object.entries(usageMap)) {
            if (normalized.includes(key) || key.includes(normalized)) {
              usageContext = val;
              console.log(`[AI] 🎬 Art Director: partial-matched "${usageContext}" from "${suggestion}"`);
              break;
            }
          }
          if (usageContext !== 'dress') break;
        }
      }
      console.log(`[AI] 🎬 Final usage context: "${usageContext}" (suggested: ${analysis.suggested_uses.join(', ')})`);
    }

    const prompt = buildPrompt(genType, analysis, usageContext, body.color_target, body.age_range);

    console.log(`[AI] 🎨 Phase 2: Generating image...`);
    console.log(`[AI] 📝 Prompt preview: "${prompt.substring(0, 120)}..."`);

    let img: { data: string; mimeType: string } | null = null;
    let actualModelUsed = 'unknown';
    const engineErrors: string[] = [];

    // Use custom prompt from Inspiration Studio if provided, otherwise build internally
    const shortPrompt = (isInspirationMode && body.custom_short_prompt)
      ? body.custom_short_prompt
      : buildShortPrompt(genType, analysis, body.usage_context || usageContext, body.age_range, body.fabric_type, body.color_target);

    if (isInspirationMode && body.custom_short_prompt) {
      console.log(`[AI] ✨ Using Inspiration Studio custom prompt`);
      console.log(`[AI] 📋 FULL custom prompt: "${body.custom_short_prompt.substring(0, 300)}..."`);
    } else {
      console.log(`[AI] 📋 Using internal prompt: "${shortPrompt.substring(0, 300)}..."`);
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 PRIMARY: Gemini Image Models (BEST results — proven!)
    // Uses Service Account Bearer token for reliable auth
    // ═══════════════════════════════════════════════════════════
    console.log(`[AI] 🎯 Primary: Gemini Image Models with reference image...`);
    img = await generateWithGeminiImageGen(apiKey, imgB64, imgMime, shortPrompt, accessToken || undefined);
    if (img) {
      actualModelUsed = 'gemini-image-gen';
      console.log(`[AI] ✅ Generated with Gemini Image Model`);
    } else {
      engineErrors.push('Gemini image models failed');
    }

    // ═══════════════════════════════════════════════════════════
    // 🔄 FALLBACK: OpenAI GPT-image-1 (image-to-image edit)
    // ═══════════════════════════════════════════════════════════
    if (!img) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiKey) {
        console.log(`[AI] 🔄 Fallback: OpenAI gpt-image-1 with reference image`);
        img = await generateWithOpenAI(openaiKey, imgB64, imgMime, shortPrompt);
        if (img) {
          actualModelUsed = 'openai-gpt-image-1';
          console.log(`[AI] ✅ Generated with OpenAI gpt-image-1 (image-guided)`);
        } else {
          engineErrors.push('OpenAI gpt-image-1 failed');
        }
      } else {
        console.warn(`[AI] ⚠️ No OPENAI_API_KEY — skipping OpenAI`);
        engineErrors.push('OpenAI not configured');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 🎨 FALLBACK: Retry with reference image + simplified prompt
    // Always includes the reference image (never text-only!)
    // ═══════════════════════════════════════════════════════════
    if (!img && isInspirationMode) {
      console.log(`[AI] 🎨 Fallback: retry with reference image + simplified prompt`);
      // Use a simplified version of the prompt to avoid IMAGE_RECITATION
      const simplifiedPrompt = `LOOK at the attached reference fabric image carefully. Create a professional studio photograph showing this EXACT SAME fabric material with the SAME colors, patterns, and texture. Show it as a luxury product. 8K quality, professional photography.`;
      
      const fallbackModels = [
        MODELS.GEMINI_IMAGE_GEN,     // gemini-2.5-flash-image
        MODELS.GEMINI_IMAGE_GEN_2,   // gemini-3.1-flash-image-preview
        MODELS.GEMINI_IMAGE_GEN_3,   // gemini-3-pro-image-preview
      ];

      for (const model of fallbackModels) {
        console.log(`[AI] 🎨 Fallback: ${model} (with reference image + simple prompt)...`);
        const url = accessToken
          ? `${GEMINI_API_BASE}/${model}:generateContent`
          : `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [
                { inline_data: { mime_type: imgMime, data: imgB64 } },
                { text: simplifiedPrompt },
              ] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 0.8 },
            }),
          });

          if (!resp.ok) {
            console.error(`[AI] ❌ ${model} fallback → ${resp.status}`);
            continue;
          }

          const result = await resp.json();
          const parts = result?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              img = { data: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
              actualModelUsed = `${model}-fallback`;
              console.log(`[AI] ✅ Generated with ${model} (fallback with reference)`);
              break;
            }
          }
          if (img) break;
        } catch (e) {
          console.error(`[AI] ❌ ${model} fallback error:`, (e as Error).message);
        }
      }
      
      if (!img) {
        engineErrors.push('Fallback with reference image also failed');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ❌ All engines exhausted
    // ═══════════════════════════════════════════════════════════
    if (!img) {
      const ms = Date.now() - t0;
      console.error(`[AI] ❌ All engines failed after ${(ms / 1000).toFixed(1)}s`);
      console.error(`[AI] ❌ Engine errors: ${engineErrors.join(' → ')}`);
      return json({
        success: false,
        error: `Image generation failed for ${genType}. All image-to-image models tried.`,
        engine_errors: engineErrors,
        engines_tried: [
          `${MODELS.GEMINI_IMAGE_GEN} (Nano Banana)`,
          `${MODELS.GEMINI_IMAGE_GEN_2} (Nano Banana 2)`,
          `${MODELS.GEMINI_IMAGE_GEN_3} (Nano Banana Pro)`,
        ],
        debug: {
          prompt_used: shortPrompt.substring(0, 200),
          image_size_kb: Math.round(imgB64.length * 0.75 / 1024),
          api_key_prefix: apiKey.substring(0, 8) + '...',
        },
        fabric_analysis: analysis,
      });
    }

    // ═══════════════════════════════════════════════
    // 📤 Upload to Storage + Save to DB
    // ═══════════════════════════════════════════════
    const fname = `${code}_${genType}_${Date.now()}.png`;
    const bytes = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));

    if (isInspirationMode) {
      // ═══ INSPIRATION MODE: Save to concept-images bucket ═══
      const inspPath = `${tenantId || 'global'}/${userId || 'anonymous'}/${fname}`;
      console.log(`[AI] 📤 Inspiration upload ${(bytes.length / 1024).toFixed(0)}KB → concept-images/${inspPath}`);

      const { error: ue } = await admin.storage.from('concept-images').upload(inspPath, bytes, {
        contentType: img.mimeType, upsert: true,
      });
      if (ue) {
        console.error('[AI] ❌ Upload failed:', ue.message);
        // Fallback: return base64 image directly
        return json({
          success: true,
          image: {
            url: `data:${img.mimeType};base64,${img.data}`,
            storage_path: null,
            type: 'inspiration',
            scope: 'inspiration',
            file_name: fname,
            mime_type: img.mimeType,
          },
          fabric_analysis: analysis,
          model_used: actualModelUsed,
          elapsed_ms: Date.now() - t0,
        });
      }

      const { data: pu } = admin.storage.from('concept-images').getPublicUrl(inspPath);

      const ms = Date.now() - t0;
      console.log(`[AI] ✅ Inspiration done in ${(ms / 1000).toFixed(1)}s — ${actualModelUsed} → ${(bytes.length / 1024).toFixed(0)}KB`);

      return json({
        success: true,
        image: {
          url: pu.publicUrl,
          storage_path: inspPath,
          type: 'inspiration',
          scope: 'inspiration',
          file_name: fname,
          mime_type: img.mimeType,
        },
        fabric_analysis: analysis,
        model_used: actualModelUsed,
        auto_detected_usage: usageContext,
        elapsed_ms: ms,
        prompt_used: shortPrompt.substring(0, 300),
      });
    }

    // ═══ STANDARD MODE: Save to material-images bucket + DB ═══
    const spath = `${body.company_id}/${body.material_id}/${fname}`;
    console.log(`[AI] 📤 Uploading ${(bytes.length / 1024).toFixed(0)}KB → ${spath}`);

    const { error: ue } = await admin.storage.from('material-images').upload(spath, bytes, {
      contentType: img.mimeType, upsert: true,
    });
    if (ue) {
      console.error('[AI] ❌ Upload failed:', ue.message);
      return json({ success: false, error: `Upload failed: ${ue.message}`, fabric_analysis: analysis });
    }

    const { data: pu } = admin.storage.from('material-images').getPublicUrl(spath);

    const { error: dbErr } = await admin.from('material_images').insert({
      material_id: body.material_id,
      company_id: body.company_id,
      tenant_id: tenantId || body.company_id,
      url: pu.publicUrl,
      storage_path: spath,
      image_type: genType,
      image_scope: getScope(genType),
      file_name: fname,
      mime_type: img.mimeType,
      file_size: bytes.length,
      is_ai_generated: true,
      source: 'upload',
      sort_order: ({ studio: 0, texture: 1, usage: 2, palette: 3, composite: 4, color_variant: 5 } as any)[genType] || 9,
    });

    if (dbErr) {
      console.error('[AI] ❌ DB insert failed:', dbErr.message);
    }

    const ms = Date.now() - t0;
    console.log(`[AI] ✅ Done in ${(ms / 1000).toFixed(1)}s — ${actualModelUsed} → ${(bytes.length / 1024).toFixed(0)}KB`);

    return json({
      success: true,
      image: {
        url: pu.publicUrl,
        storage_path: spath,
        type: genType,
        scope: getScope(genType),
        file_name: fname,
        mime_type: img.mimeType,
        color_key: body.color_target?.key,
        color_name: body.color_target?.name_ar,
      },
      fabric_analysis: analysis, // Return for frontend caching
      model_used: actualModelUsed,
      auto_detected_usage: usageContext, // What the Art Director chose
      elapsed_ms: ms,
    });

  } catch (e) {
    const ms = Date.now() - t0;
    console.error(`[AI] ❌ Unhandled error after ${(ms / 1000).toFixed(1)}s:`, e);
    return json({ error: e instanceof Error ? e.message : 'Server error', success: false }, 500);
  }
});

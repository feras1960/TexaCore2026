// ═══════════════════════════════════════════════════════════════════
// 🎨 Fabric Prompt Templates — Gemini-Optimized Textile Photography
// ═══════════════════════════════════════════════════════════════════
// Source: Gemini AI Studio expert analysis + professional textile photography
// Principle: "Photographic Intent" — models respond to camera specs over prose
// ═══════════════════════════════════════════════════════════════════

import type { ApplicationMethod, FabricType } from '../core/types';

/**
 * 📸 Camera & Lighting DNA — optimized for textile photography
 * Source: Gemini expert recommendations
 */
export const CAMERA_DNA = {
  lens: '85mm to 100mm macro',
  aperture: 'f/8 to f/11 (sweet spot for edge-to-edge textile sharpness)',
  sensor: 'full-frame sensor, ISO 100',
  colorTemp: '5500K daylight-balanced (essential for color accuracy)',
  lighting: 'grazing side-light at 15-30° angle to fabric surface (makes weave/embroidery pop in 3D)',
  postProcess: 'professional color grading, true-to-life colors, 8K resolution',
  negativePrompt: 'NO text, NO logos, NO watermarks, NO digital render, NO cartoon, NO blurry, NO distorted, NO low resolution, NO plastic, NO overexposed',
};

/**
 * آلية الصنع — وصف تقني مبني على "Photographic Intent"  
 * Source: Gemini expert analysis
 */
export function getApplicationMethodPrompt(method: ApplicationMethod): string {
  switch (method) {
    case 'printed':
      return `The design appears as a flat, sharp ink layer perfectly integrated into the fibers with zero physical elevation. Close inspection reveals vibrant colors that follow the contours of the fabric's natural weave without obscuring the base texture. Colors are deeply absorbed with seamless transitions and laser-sharp edges.`;

    case 'embroidered':
      return `The design is physically elevated above the base fabric using dense threadwork. It creates a tactile 3D relief that catches the light independently of the base fabric, showing individual satin stitches and thread sheen under close inspection. Thread surfaces create dynamic shadows and depth, with needle entry/exit points creating micro-texture.`;

    case 'woven_jacquard':
      return `The pattern is an architectural part of the fabric's structure, created by interlacing different colored yarns. It produces a rich, reversible-style texture where the design is felt as much as it is seen, appearing deeply embedded in the weave. The motif catches light differently from the background, producing a damask-like shimmer.`;
  }
}

/**
 * نوع القماش — وصف مبني على "Photographic Intent"
 * يركز على: المظهر البصري + السلوك الفيزيائي + التفاعل مع الضوء
 * Source: Gemini expert analysis (optimized for image generation models)
 */
export function getFabricTypePrompt(fabricType: FabricType): string {
  const descriptions: Record<FabricType, string> = {
    silk: `SILK: A high-luster, natural fiber with a smooth, almost liquid surface. It features an elegant, fluid drape that creates soft, rounded folds and reflects light with a subtle pearlescent shimmer. Its unique light interaction creates a soft glow rather than a harsh reflection, separating it from synthetics.`,

    velvet: `VELVET: A dense, short-pile fabric with a rich, matte-to-shimmering surface depending on the light angle. It possesses a heavy, luxurious weight and a soft, structured drape that creates deep shadows in the folds. It absorbs light in the "valleys" and reflects it on the "peaks" of the pile.`,

    linen: `LINEN: A textured, matte fabric with visible slubs and an irregular organic weave. It has a stiff, architectural drape that holds its shape and creates sharp, crisp folds. It reflects light unevenly due to the grainy surface, giving it a rustic yet high-end look.`,

    cotton: `COTTON: A versatile, matte textile with a clean, tight weave and zero sheen. It offers a soft but sturdy drape with medium weight, characterized by gentle, predictable folds. It interacts with light by absorbing it evenly, making it the benchmark for color accuracy.`,

    lace: `LACE: A delicate, open-work fabric consisting of intricate web-like patterns and negative space. It is extremely lightweight with a fragile, soft drape that requires an underlay to show its full detail. It creates complex micro-shadows and allows light to pass through the gaps.`,

    chiffon: `CHIFFON: A sheer, diaphanous fabric with a grainy, crepe-like feel and a transparent appearance. It is incredibly lightweight and airy, drifting with movement and creating ethereal, voluminous layers. It diffuses light softly, creating a hazy, romantic atmosphere.`,

    satin: `SATIN: A high-gloss fabric with a slick, mirror-like surface and a dull back. It has a heavy, slippery drape that creates dramatic, sharp highlights and deep, high-contrast shadows. Its light interaction is intense, creating brilliant specular highlights on every fold.`,

    tweed: `TWEED: A heavy, multi-tonal woolen fabric with a rough, fibrous surface and a visible twill or herringbone weave. It is stiff and thick, holding rigid shapes with very little drape. It interacts with light by creating micro-shadows within the coarse yarn, appearing rugged.`,

    denim: `DENIM: A rugged, twill-weave cotton characterized by a visible diagonal ribbing and a matte, durable finish. It is heavy and stiff, creating large, chunky folds. It absorbs light significantly, emphasizing the indigo dye variations and white horizontal threads.`,

    jacquard: `JACQUARD: A complex, multi-textured fabric where the pattern is built into the weave rather than printed. It features varying weights and a structured drape, often mixing matte and shiny yarns. It catches light at different angles, making the pattern appear three-dimensional.`,

    organza: `ORGANZA: A crisp, transparent, and lightweight plain-weave fabric with a stiff, wiry drape. It holds voluminous shapes perfectly. It has a subtle shimmer and interacts with light by reflecting off its sheer surface while remaining see-through.`,
  };
  return descriptions[fabricType];
}

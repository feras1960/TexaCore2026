// ═══════════════════════════════════════════════════════════════════
// 🎬 Scene Prompt Templates — Gemini-Optimized Photography Briefs
// ═══════════════════════════════════════════════════════════════════
// Source: Gemini AI Studio expert analysis
// Format: SET → CAMERA → LIGHTING → COMPOSITION → MOOD
// ═══════════════════════════════════════════════════════════════════

import type { SceneType } from '../core/types';

/**
 * مشاهد العرض — بيئات تصوير احترافية
 * كل مشهد يحتوي على مواصفات كاميرا وإضاءة محددة
 */
export function getScenePrompt(scene: SceneType): string {
  const scenes: Record<SceneType, string> = {
    flat_lay: `SCENE: Professional textile flat lay
SET: Casual drapes on a reclaimed oak floor with tailor shears and silk thread
CAMERA: 50mm lens, f/8, top-down 90-degree angle
LIGHTING: Large 45-degree softbox from the side creating soft shadows in folds
COMPOSITION: Fabric fills 85% of frame with natural elegant folds, one corner turned back
MOOD: Clean editorial, high-end textile catalogue`,

    table_display: `SCENE: Luxury fabric store table display
SET: Premium wooden display table in upscale textile showroom, fabric draped elegantly cascading off table edge
CAMERA: 35mm lens, f/4, three-quarter angle showing both table surface and draping edge
LIGHTING: Warm tungsten spotlights from above, ambient store lighting in background
COMPOSITION: Fabric flowing from table showing both pattern and drape quality, stacked fabric rolls visible in background shelves
MOOD: High-end fabric boutique, inviting commercial presentation, warm luxury retail`,

    hanging: `SCENE: Premium textile showroom display
SET: Fabric hanging from elegant brass or wooden display hooks in a high-ceiling fabric store
CAMERA: 50mm lens, f/5.6, eye-level straight-on angle
LIGHTING: Directional warm spotlights from above, professional showroom lighting
COMPOSITION: Full length of hanging fabric visible from top hook to floor, showing drape and pattern repeat
MOOD: Professional textile presentation, showroom elegance, fabric at its best drape`,

    rolls: `SCENE: Fabric store bolt display
SET: Rolled fabric bolts displayed vertically and horizontally in a luxury fabric emporium
CAMERA: 35mm lens, f/5.6, three-quarter angle showing roll cross-section
LIGHTING: Warm ambient store lighting with focused spots on the featured roll
COMPOSITION: Main roll in foreground with pattern visible, complementary rolls in soft focus behind
MOOD: Professional commercial, fabric sourcing, designer's treasure trove`,

    swirl: `SCENE: Artistic fabric swirl presentation
SET: Fabric artistically twisted into a beautiful spiral/rosette shape on neutral surface
CAMERA: 85mm lens, f/4, 45-degree overhead angle
LIGHTING: Soft directional lighting from upper-left emphasizing folds and texture in spiral
COMPOSITION: Fabric twisted into elegant vortex shape showing pattern from all angles simultaneously
MOOD: Artistic fabric presentation, creative material showcase, Instagram-worthy textile art`,

    macro: `SCENE: Extreme textile macro photography
SET: Extreme close-up on a curved fold of the fabric, edge showing fiber cross-section
CAMERA: 100mm macro lens, f/16 for deep focus, 10cm distance
LIGHTING: Directional hard light creating shadows in every thread crossover point
COMPOSITION: Frame filled entirely with fabric surface, thread-level detail visible
MOOD: Technical precision, textile engineering documentation, quality control`,

    dress: `SCENE: Fashion editorial day dress
SET: Sunlit atrium with clean architectural background, model or premium mannequin
CAMERA: 85mm lens, f/5.6, eye-level three-quarter angle
LIGHTING: Natural daylight from large windows with white reflector fill
COMPOSITION: Medium shot waist to hem, emphasizing fabric drape and movement
MOOD: Vogue editorial, aspirational, modern elegance`,

    evening_gown: `SCENE: Haute couture evening gown
SET: Grand marble staircase with dark architectural shadows
CAMERA: 35mm wide lens, f/2.8, low angle looking up to emphasize height and drama
LIGHTING: Dramatic rim lighting highlighting fabric edges, gold-toned warm fill light
COMPOSITION: Full-length shot with generous negative space, train fanning on floor
MOOD: Cinematic luxury, museum-worthy craftsmanship, red carpet ready`,

    abaya: `SCENE: Contemporary modest fashion editorial
SET: Contemporary desert pavilion with clean architectural lines and sand-colored walls
CAMERA: 50mm lens, f/5.6, eye-level medium shot
LIGHTING: High-contrast natural sunlight with white reflector to soften shadows
COMPOSITION: Full flowing silhouette visible with structural details at shoulders and cuffs
MOOD: Refined, contemporary Middle Eastern luxury fashion`,

    suit: `SCENE: Savile Row tailoring presentation
SET: Dark clubhouse-inspired studio with leather and wood elements
CAMERA: 85mm lens, f/4, three-quarter angle, medium-full shot
LIGHTING: Warm directional light from upper-right emphasizing lapel roll and pocket shadows
COMPOSITION: Jacket buttoned, pocket square visible, one leg slightly forward showing crease
MOOD: Classic British tailoring, masculine sophistication`,

    curtain: `SCENE: Luxury interior window treatment
SET: Floor-to-ceiling window in a luxury penthouse overlooking a soft-focus city
CAMERA: 24mm wide lens, f/11, straight-on angle
LIGHTING: Backlit by window to show fabric opacity and translucency; warm interior lamps
COMPOSITION: Both panels visible, one pulled back with tassel. Window light creates luminous glow
MOOD: Palatial luxury, Interior Design magazine cover`,

    bedding: `SCENE: Five-star hotel bedroom editorial
SET: King bed with ALL linens made from this fabric — duvet cover, fitted sheet, flat sheet, pillowcases
CAMERA: 35mm lens, f/5.6, 45-degree elevated angle
LIGHTING: Warm morning light from large window, soft ambient fill
COMPOSITION: Entire bed covered in the same fabric, natural sleeping-folds, warm morning light
MOOD: Aspirational luxury hospitality, Sunday morning indulgence`,

    sofa: `SCENE: Designer furniture showroom
SET: Mid-century modern 3-seater sofa, tapered walnut legs, complementary throw and cushions
CAMERA: 50mm lens, f/5.6, three-quarter front angle
LIGHTING: Large softboxes with warm temperature, side rake light for upholstery texture
COMPOSITION: Full sofa on light hardwood floor with floor lamp and monstera plant
MOOD: Architectural Digest, contemporary luxury showroom`,

    cushion: `SCENE: Lifestyle cushion arrangement
SET: 3-4 decorative cushions varying sizes on a neutral linen sofa with cashmere throw
CAMERA: 85mm lens, f/2.8, eye-level with shallow depth of field
LIGHTING: Bright natural sidelight from window, subtle warm lamp fill
COMPOSITION: Asymmetric grouping, hero cushion sharp in front, rear softly blurred
MOOD: Instagram-worthy curated lifestyle, high-end home décor`,
  };

  return scenes[scene];
}

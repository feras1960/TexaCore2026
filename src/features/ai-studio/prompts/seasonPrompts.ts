// =============================================
// استوديو الإلهام - قوالب المواسم
// =============================================

import type { Season } from '../core/types';

/**
 * تعليمات الموسم للذكاء الاصطناعي
 */
export function getSeasonPrompt(season: Season): string {
  switch (season) {
    case 'spring_summer':
      return `The design aesthetic is SPRING/SUMMER: bright, airy, fresh colors. Light pastels, vivid florals, sunlit warmth. The fabric should feel breezy, light, and alive with energy. Think Mediterranean gardens, coastal living, tropical freshness.`;

    case 'autumn_winter':
      return `The design aesthetic is AUTUMN/WINTER: warm, rich, cozy tones. Deep burgundies, forest greens, burnt oranges, chocolate browns. The fabric should feel substantial, warm, and luxurious. Think fireside elegance, alpine luxury, velvet evenings.`;

    case 'timeless':
      return `The design aesthetic is TIMELESS LUXURY: sophisticated, classic, eternally elegant. Muted gold, ivory, charcoal, navy, champagne. The fabric should feel refined, expensive, and ageless. Think classic Chanel, old-world European sophistication, heritage luxury.`;
  }
}

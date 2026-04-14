/**
 * ════════════════════════════════════════════════════════════════
 * 🏙️ Top Cities List — قائمة المدن الرئيسية
 * ════════════════════════════════════════════════════════════════
 * 
 * Standardized city list translation dictionary for UI presentation.
 * Used to translate database city inputs dynamically in the UI.
 */

interface CityTranslation {
  ar: string;
  en: string;
  ru: string;
  uk: string;
  tr: string;
}

const CITIES: CityTranslation[] = [
  // Turkey
  { ar: 'بورصة', en: 'Bursa', ru: 'Бурса', uk: 'Бурса', tr: 'Bursa' },
  { ar: 'إسطنبول', en: 'Istanbul', ru: 'Стамбул', uk: 'Стамбул', tr: 'İstanbul' },
  { ar: 'إزمير', en: 'Izmir', ru: 'Измир', uk: 'Ізмір', tr: 'İzmir' },
  { ar: 'أنقرة', en: 'Ankara', ru: 'Анкара', uk: 'Анкара', tr: 'Ankara' },
  { ar: 'غازي عنتاب', en: 'Gaziantep', ru: 'Газиантеп', uk: 'Газіантеп', tr: 'Gaziantep' },
  
  // China
  { ar: 'قوانغتشو', en: 'Guangzhou', ru: 'Гуанчжоу', uk: 'Гуанчжоу', tr: 'Guangzhou' },
  { ar: 'شنغهاي', en: 'Shanghai', ru: 'Шанхай', uk: 'Шанхай', tr: 'Şanghay' },
  { ar: 'بكين', en: 'Beijing', ru: 'Пекин', uk: 'Пекін', tr: 'Pekin' },
  { ar: 'شنجن', en: 'Shenzhen', ru: 'Шэньчжэнь', uk: 'Шеньчжень', tr: 'Shenzhen' },
  { ar: 'ييوو', en: 'Yiwu', ru: 'Иу', uk: 'Іу', tr: 'Yiwu' },
  
  // Ukraine
  { ar: 'خاركيف', en: 'Kharkiv', ru: 'Харьков', uk: 'Харків', tr: 'Harkov' },
  { ar: 'دنيبرو', en: 'Dnipro', ru: 'Днепр', uk: 'Дніпро', tr: 'Dnipro' },
  { ar: 'كييف', en: 'Kyiv', ru: 'Киев', uk: 'Київ', tr: 'Kiev' },
  { ar: 'لفيف', en: 'Lviv', ru: 'Львов', uk: 'Львів', tr: 'Lviv' },
  { ar: 'أوديسا', en: 'Odessa', ru: 'Одесса', uk: 'Одеса', tr: 'Odessa' },
  { ar: 'أوديسا', en: 'Odesa', ru: 'Одесса', uk: 'Одеса', tr: 'Odesa' }
];

function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().trim()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[يى]/g, 'ی')
    .replace(/\s+/g, ' ');
}

/**
 * Get localized city name dynamically
 * If translation is not found, returns the original name
 */
export function getLocalizedCity(name: string | null | undefined, language: string): string {
  if (!name) return '';
  
  const normInput = normalizeText(name);
  
  // Find city where ANY language matches the input (after normalization)
  const match = CITIES.find(city => {
    return Object.values(city).some(val => normalizeText(val) === normInput);
  });
  
  if (match) {
    // Return the translated version, or english fallback
    return (match as any)[language] || match.en || name;
  }
  
  return name;
}


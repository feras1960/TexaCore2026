/**
 * ════════════════════════════════════════════════════════════════
 * 🌐 getLocalizedName — Resolve entity name by current language
 * ════════════════════════════════════════════════════════════════
 *
 * Central utility for multi-language name resolution.
 * Supports: ar, en, ru, uk, tr (fallback chain → en → ar)
 *
 * Usage:
 *   getLocalizedName(material, 'ru')         // "Шёлковая ткань"
 *   getLocalizedName(material, 'ar')         // "قماش حريري"
 *   getLocalizedName(material, 'de', 'name') // fallback to en → ar
 *
 * Works with any entity that has name_ar, name_en, name_ru, etc.
 * Also supports prefixed fields like material_name_ar, material_name_en, etc.
 *
 * 🆕 For variant children (with variant_data), reconstructs the name
 *    from axis value translations when name_{lang} is missing.
 * ════════════════════════════════════════════════════════════════
 */

type NameRecord = Record<string, any>;

/**
 * Known textile/color translations for common axis values.
 * Used when variant_data only has name_ar/name_en but the UI needs ru/uk/tr.
 * Covers the most common textile terms used in fabric ERP systems.
 */
const TEXTILE_TRANSLATIONS: Record<string, Record<string, string>> = {
  // ═══ Colors ═══
  WHITE:   { ar: 'أبيض', en: 'White', ru: 'Белый', uk: 'Білий', tr: 'Beyaz' },
  BLACK:   { ar: 'أسود', en: 'Black', ru: 'Чёрный', uk: 'Чорний', tr: 'Siyah' },
  RED:     { ar: 'أحمر', en: 'Red', ru: 'Красный', uk: 'Червоний', tr: 'Kırmızı' },
  GREEN:   { ar: 'أخضر', en: 'Green', ru: 'Зелёный', uk: 'Зелений', tr: 'Yeşil' },
  BLUE:    { ar: 'أزرق', en: 'Blue', ru: 'Синий', uk: 'Синій', tr: 'Mavi' },
  YELLOW:  { ar: 'أصفر', en: 'Yellow', ru: 'Жёлтый', uk: 'Жовтий', tr: 'Sarı' },
  ORANGE:  { ar: 'برتقالي', en: 'Orange', ru: 'Оранжевый', uk: 'Помаранчевий', tr: 'Turuncu' },
  PINK:    { ar: 'وردي', en: 'Pink', ru: 'Розовый', uk: 'Рожевий', tr: 'Pembe' },
  PURPLE:  { ar: 'بنفسجي', en: 'Purple', ru: 'Фиолетовый', uk: 'Фіолетовий', tr: 'Mor' },
  BROWN:   { ar: 'بني', en: 'Brown', ru: 'Коричневый', uk: 'Коричневий', tr: 'Kahverengi' },
  GREY:    { ar: 'رمادي', en: 'Grey', ru: 'Серый', uk: 'Сірий', tr: 'Gri' },
  GRAY:    { ar: 'رمادي', en: 'Gray', ru: 'Серый', uk: 'Сірий', tr: 'Gri' },
  NAVY:    { ar: 'كحلي', en: 'Navy', ru: 'Тёмно-синий', uk: 'Темно-синій', tr: 'Lacivert' },
  BEIGE:   { ar: 'بيج', en: 'Beige', ru: 'Бежевый', uk: 'Бежевий', tr: 'Bej' },
  IVORY:   { ar: 'عاجي', en: 'Ivory', ru: 'Слоновая кость', uk: 'Слонова кістка', tr: 'Fildişi' },
  CREAM:   { ar: 'كريمي', en: 'Cream', ru: 'Кремовый', uk: 'Кремовий', tr: 'Krem' },
  BURGUNDY:{ ar: 'عنابي', en: 'Burgundy', ru: 'Бордовый', uk: 'Бордовий', tr: 'Bordo' },
  MAROON:  { ar: 'ماروني', en: 'Maroon', ru: 'Бордовый', uk: 'Бордовий', tr: 'Bordo' },
  TURQUOISE:{ ar: 'فيروزي', en: 'Turquoise', ru: 'Бирюзовый', uk: 'Бірюзовий', tr: 'Turkuaz' },
  TEAL:    { ar: 'أخضر مزرق', en: 'Teal', ru: 'Бирюзовый', uk: 'Бірюзовий', tr: 'Çamurcun' },
  CORAL:   { ar: 'مرجاني', en: 'Coral', ru: 'Коралловый', uk: 'Кораловий', tr: 'Mercan' },
  KHAKI:   { ar: 'كاكي', en: 'Khaki', ru: 'Хаки', uk: 'Хакі', tr: 'Haki' },
  GOLD:    { ar: 'ذهبي', en: 'Gold', ru: 'Золотой', uk: 'Золотий', tr: 'Altın' },
  SILVER:  { ar: 'فضي', en: 'Silver', ru: 'Серебряный', uk: 'Срібний', tr: 'Gümüş' },
  OLIVE:   { ar: 'زيتوني', en: 'Olive', ru: 'Оливковый', uk: 'Оливковий', tr: 'Zeytin' },
  WINE:    { ar: 'خمري', en: 'Wine', ru: 'Винный', uk: 'Винний', tr: 'Şarap' },
  PEACH:   { ar: 'خوخي', en: 'Peach', ru: 'Персиковый', uk: 'Персиковий', tr: 'Şeftali' },
  MINT:    { ar: 'نعناعي', en: 'Mint', ru: 'Мятный', uk: "М'ятний", tr: 'Nane' },
  LILAC:   { ar: 'ليلكي', en: 'Lilac', ru: 'Сиреневый', uk: 'Бузковий', tr: 'Leylak' },
  FUCHSIA: { ar: 'فوشيا', en: 'Fuchsia', ru: 'Фуксия', uk: 'Фуксія', tr: 'Fuşya' },
  // ═══ Fabric designs / patterns ═══
  PLAIN:      { ar: 'سادة', en: 'Plain', ru: 'Гладкий', uk: 'Гладкий', tr: 'Düz' },
  STRIPED:    { ar: 'مقلم', en: 'Striped', ru: 'Полосатый', uk: 'Смугастий', tr: 'Çizgili' },
  CHECKERED:  { ar: 'مربعات', en: 'Checkered', ru: 'Клетчатый', uk: 'Картатий', tr: 'Kareli' },
  PRINTED:    { ar: 'مطبوع', en: 'Printed', ru: 'Набивной', uk: 'Набивний', tr: 'Baskılı' },
  EMBROIDERED:{ ar: 'مطرز', en: 'Embroidered', ru: 'Вышитый', uk: 'Вишитий', tr: 'İşlemeli' },
  FLORAL:     { ar: 'وردي/زهور', en: 'Floral', ru: 'Цветочный', uk: 'Квітковий', tr: 'Çiçekli' },
  DOTTED:     { ar: 'منقط', en: 'Dotted', ru: 'В горошек', uk: 'В горошок', tr: 'Puantiyeli' },
  JACQUARD:   { ar: 'جاكار', en: 'Jacquard', ru: 'Жаккард', uk: 'Жакард', tr: 'Jakar' },
  HERRINGBONE:{ ar: 'متعرج', en: 'Herringbone', ru: 'Ёлочка', uk: 'Ялинка', tr: 'Balıksırtı' },
  TWILL:      { ar: 'تويل', en: 'Twill', ru: 'Твил', uk: 'Твіл', tr: 'Dimi' },
  SATIN:      { ar: 'ساتان', en: 'Satin', ru: 'Атлас', uk: 'Атлас', tr: 'Saten' },
  // ═══ Fabric types ═══
  OXFORD:     { ar: 'أكسفورد', en: 'Oxford', ru: 'Оксфорд', uk: 'Оксфорд', tr: 'Oxford' },
  POPLIN:     { ar: 'بوبلين', en: 'Poplin', ru: 'Поплин', uk: 'Поплін', tr: 'Poplin' },
  COTTON:     { ar: 'قطن', en: 'Cotton', ru: 'Хлопок', uk: 'Бавовна', tr: 'Pamuk' },
  POLYESTER:  { ar: 'بوليستر', en: 'Polyester', ru: 'Полиэстер', uk: 'Поліестер', tr: 'Polyester' },
  SILK:       { ar: 'حرير', en: 'Silk', ru: 'Шёлк', uk: 'Шовк', tr: 'İpek' },
  LINEN:      { ar: 'كتان', en: 'Linen', ru: 'Лён', uk: 'Льон', tr: 'Keten' },
  WOOL:       { ar: 'صوف', en: 'Wool', ru: 'Шерсть', uk: 'Вовна', tr: 'Yün' },
  DENIM:      { ar: 'دنيم', en: 'Denim', ru: 'Деним', uk: 'Денім', tr: 'Denim' },
  CHIFFON:    { ar: 'شيفون', en: 'Chiffon', ru: 'Шифон', uk: 'Шифон', tr: 'Şifon' },
  VELVET:     { ar: 'مخمل', en: 'Velvet', ru: 'Бархат', uk: 'Оксамит', tr: 'Kadife' },
  GABARDINE:  { ar: 'غبردين', en: 'Gabardine', ru: 'Габардин', uk: 'Габардин', tr: 'Gabardin' },
  KNITWEAR:   { ar: 'تريكو', en: 'Knitwear', ru: 'Трикотаж', uk: 'Трикотаж', tr: 'Triko' },
  JERSEY:     { ar: 'جيرسي', en: 'Jersey', ru: 'Джерси', uk: 'Джерсі', tr: 'Jarse' },
  ORGANZA:    { ar: 'أورغانزا', en: 'Organza', ru: 'Органза', uk: 'Органза', tr: 'Organze' },
  TAFFETA:    { ar: 'تفتا', en: 'Taffeta', ru: 'Тафта', uk: 'Тафта', tr: 'Tafta' },
  CREPE:      { ar: 'كريب', en: 'Crepe', ru: 'Крепь', uk: 'Креп', tr: 'Krep' },
  TULLE:      { ar: 'تول', en: 'Tulle', ru: 'Тюль', uk: 'Тюль', tr: 'Tül' },
  LAWN:       { ar: 'لون', en: 'Lawn', ru: 'Батист', uk: 'Батист', tr: 'Batist' },
  MUSLIN:     { ar: 'موسلين', en: 'Muslin', ru: 'Муслин', uk: 'Муслін', tr: 'Müslin' },
  FLEECE:     { ar: 'فليس', en: 'Fleece', ru: 'Флис', uk: 'Фліс', tr: 'Polar' },
  LYCRA:      { ar: 'ليكرا', en: 'Lycra', ru: 'Лайкра', uk: 'Лайкра', tr: 'Likra' },
  VISCOSE:    { ar: 'فسكوز', en: 'Viscose', ru: 'Вискоза', uk: 'Віскоза', tr: 'Viskon' },
  // Additional fabric types
  'COARSE_CALICO': { ar: 'كاليكو خشن', en: 'Coarse Calico', ru: 'Грубый ситец', uk: 'Грубий ситець', tr: 'Kaba Patiska' },
  CALICO:     { ar: 'كاليكو', en: 'Calico', ru: 'Ситец', uk: 'Ситець', tr: 'Patiska' },
  TWEED:      { ar: 'تويد', en: 'Tweed', ru: 'Твид', uk: 'Твід', tr: 'Tüvit' },
  CORDUROY:   { ar: 'كوردوروي', en: 'Corduroy', ru: 'Вельвет', uk: 'Вельвет', tr: 'Kadife fitilli' },
  CANVAS:     { ar: 'كانفاس', en: 'Canvas', ru: 'Канвас', uk: 'Канвас', tr: 'Kanvas' },
  NYLON:      { ar: 'نايلون', en: 'Nylon', ru: 'Нейлон', uk: 'Нейлон', tr: 'Naylon' },
  SPANDEX:    { ar: 'سباندكس', en: 'Spandex', ru: 'Спандекс', uk: 'Спандекс', tr: 'Spandeks' },
  SUEDE:      { ar: 'شمواه', en: 'Suede', ru: 'Замша', uk: 'Замша', tr: 'Süet' },
  BAMBOO:     { ar: 'بامبو', en: 'Bamboo', ru: 'Бамбук', uk: 'Бамбук', tr: 'Bambu' },
  CASHMERE:   { ar: 'كشمير', en: 'Cashmere', ru: 'Кашемир', uk: 'Кашемір', tr: 'Kaşmir' },
};

/**
 * Translate a single name part (e.g. "White", "Plain", "Oxford") to the target language.
 * Uses the TEXTILE_TRANSLATIONS dictionary for known terms.
 */
function translatePart(part: string, language: string): string {
  const trimmed = part.trim();
  if (!trimmed) return trimmed;

  // Try exact code match (uppercase)
  const upper = trimmed.toUpperCase().replace(/\s+/g, '_');
  const entry = TEXTILE_TRANSLATIONS[upper];
  if (entry?.[language]) return entry[language];

  // Try matching by English name (case-insensitive)
  for (const [, translations] of Object.entries(TEXTILE_TRANSLATIONS)) {
    if (translations.en?.toLowerCase() === trimmed.toLowerCase()) {
      return translations[language] || trimmed;
    }
    // Also try matching by Arabic name
    if (translations.ar === trimmed) {
      return translations[language] || trimmed;
    }
  }

  return trimmed; // No translation found, return as-is
}

/**
 * Try to reconstruct a localized name from variant_data axis values.
 * variant_data structure: { [axisId]: { name_ar, name_en, code, ... } }
 */
function reconstructVariantName(entity: NameRecord, language: string): string | null {
  const variantData = entity.variant_data;
  if (!variantData || typeof variantData !== 'object') return null;

  const axes = Object.values(variantData) as any[];
  if (axes.length === 0) return null;

  // Sort by sort_order to maintain consistent ordering
  axes.sort((a: any, b: any) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));

  // Build parts from variant_data
  const parts: string[] = [];
  for (const axis of axes) {
    if (!axis || typeof axis !== 'object') continue;

    // Try language-specific name from variant_data
    const langName = axis[`name_${language}`];
    if (langName && String(langName).trim()) {
      parts.push(String(langName).trim());
      continue;
    }

    // Try to translate the code or English name
    const code = axis.code || '';
    const nameEn = axis.name_en || '';
    const nameAr = axis.name_ar || '';

    // Try code-based translation first
    const translated = translatePart(code, language) 
      || translatePart(nameEn, language)
      || translatePart(nameAr, language);
    
    if (translated && translated !== code && translated !== nameEn) {
      parts.push(translated);
    } else {
      // Fall back to whatever name is available
      parts.push(nameEn || nameAr || code);
    }
  }

  if (parts.length === 0) return null;

  // Try to get the parent material name in the target language
  // The parent name is embedded in name_en as "ParentName - Part1 - Part2"
  // We need just the parent name part
  const nameEn = entity.name_en || '';
  const nameAr = entity.name_ar || '';

  // Extract parent name: everything before the variant parts
  // e.g. "Oxford - Plain - White" → "Oxford" (the part before the first variant axis value)
  let parentName = '';
  if (nameEn) {
    const enParts = nameEn.split(' - ');
    if (enParts.length > parts.length) {
      // The first N parts minus variant parts count = parent name parts
      const parentParts = enParts.slice(0, enParts.length - parts.length);
      const rawParentName = parentParts.join(' - ');
      parentName = translatePart(rawParentName, language);
    }
  }
  if (!parentName && nameAr) {
    const arParts = nameAr.split(' - ');
    if (arParts.length > parts.length) {
      const parentParts = arParts.slice(0, arParts.length - parts.length);
      const rawParentName = parentParts.join(' - ');
      parentName = translatePart(rawParentName, language);
    }
  }

  if (parentName) {
    return `${parentName} - ${parts.join(' - ')}`;
  }
  return parts.join(' - ');
}

/**
 * Resolve the best name for the given language from an entity record.
 *
 * @param entity - Object with name_ar, name_en, name_ru, name_uk, name_tr fields
 * @param language - Current UI language code (e.g. 'ru', 'ar', 'en')
 * @param prefix - Optional field prefix (e.g. 'material_name' → material_name_ar, etc.)
 * @returns The best matching name string, or '—'
 */
export function getLocalizedName(
  entity: NameRecord | null | undefined,
  language: string,
  prefix = 'name'
): string {
  if (!entity) return '—';

  // Direct match for current language
  const direct = entity[`${prefix}_${language}`];
  if (direct && String(direct).trim()) return String(direct);

  // 🆕 For variant children: try to reconstruct name from variant_data translations
  if (entity.variant_data && (entity.parent_material_id || entity.material_id)) {
    const reconstructed = reconstructVariantName(entity, language);
    if (reconstructed) return reconstructed;
  }

  // 🆕 Try translating composite name (e.g. "Oxford - Plain - White" → "Оксфорд - Гладкий - Белый")
  if (language !== 'en' && language !== 'ar') {
    const nameEn = entity[`${prefix}_en`] || entity.name_en;
    if (nameEn && String(nameEn).trim()) {
      const translated = translateCompositeName(String(nameEn).trim(), language);
      if (translated !== String(nameEn).trim()) return translated;
    }
    // Also try Arabic name
    const nameAr = entity[`${prefix}_ar`] || entity.name_ar;
    if (nameAr && String(nameAr).trim()) {
      const translated = translateCompositeName(String(nameAr).trim(), language);
      if (translated !== String(nameAr).trim()) return translated;
    }
  }

  // Fallback chain: en → ar → any available
  const fallbacks = ['en', 'ar', 'ru', 'uk', 'tr'];
  for (const fb of fallbacks) {
    if (fb === language) continue; // already tried
    const val = entity[`${prefix}_${fb}`];
    if (val && String(val).trim()) return String(val);
  }

  // Last resort: try plain `name` field (no suffix)
  if (prefix === 'name' && entity.name && String(entity.name).trim()) {
    return String(entity.name);
  }

  return '—';
}

/**
 * Translate a composite name by splitting on " - " and translating each part.
 * e.g. "Oxford - Plain - White" → "Оксфорд - Гладкий - Белый"
 * Returns the original string if no parts could be translated.
 */
function translateCompositeName(name: string, language: string): string {
  if (!name.includes(' - ')) {
    // Single part name
    return translatePart(name, language);
  }
  
  const parts = name.split(' - ');
  let anyTranslated = false;
  const translated = parts.map(part => {
    const result = translatePart(part.trim(), language);
    if (result !== part.trim()) anyTranslated = true;
    return result;
  });
  
  return anyTranslated ? translated.join(' - ') : name;
}

/**
 * Convenience: resolve material name from InventoryMaterialRow
 * Fields: material_name_ar, material_name_en, material_name_ru, etc.
 */
export function getMaterialName(
  material: NameRecord | null | undefined,
  language: string
): string {
  return getLocalizedName(material, language, 'material_name');
}


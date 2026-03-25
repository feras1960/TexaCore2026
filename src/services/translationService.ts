/**
 * Translation Service - خدمة الترجمة التلقائية
 * 
 * يوفر هذا الملف خدمات الترجمة التلقائية للنصوص
 * مع دعم 9 لغات: ar, en, ru, uk, ro, pl, tr, de, it
 */

// اللغات المدعومة
export const SUPPORTED_LANGUAGES = ['ar', 'en', 'ru', 'uk', 'ro', 'pl', 'tr', 'de', 'it'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// أسماء اللغات
export const LANGUAGE_NAMES: Record<SupportedLanguage, { native: string; english: string; flag: string }> = {
  ar: { native: 'العربية', english: 'Arabic', flag: '🇸🇦' },
  en: { native: 'English', english: 'English', flag: '🇬🇧' },
  ru: { native: 'Русский', english: 'Russian', flag: '🇷🇺' },
  uk: { native: 'Українська', english: 'Ukrainian', flag: '🇺🇦' },
  ro: { native: 'Română', english: 'Romanian', flag: '🇷🇴' },
  pl: { native: 'Polski', english: 'Polish', flag: '🇵🇱' },
  tr: { native: 'Türkçe', english: 'Turkish', flag: '🇹🇷' },
  de: { native: 'Deutsch', english: 'German', flag: '🇩🇪' },
  it: { native: 'Italiano', english: 'Italian', flag: '🇮🇹' },
};

// نوع الترجمات
export type Translations = Partial<Record<`name_${SupportedLanguage}`, string>>;
export type DescriptionTranslations = Partial<Record<`description_${SupportedLanguage}`, string>>;

/**
 * واجهة لنتيجة الترجمة
 */
export interface TranslationResult {
  translations: Record<string, string>;
  sourceLanguage: SupportedLanguage;
  isAutoTranslated: Record<string, boolean>;
  errors?: Record<string, string>;
}

/**
 * إعدادات الترجمة
 */
export interface TranslationOptions {
  useGoogleTranslate?: boolean;
  fallbackToOriginal?: boolean;
  skipLanguages?: SupportedLanguage[];
}

/**
 * ترجمة نص لجميع اللغات المدعومة
 * 
 * @param text النص المراد ترجمته
 * @param sourceLanguage لغة النص الأصلي
 * @param options خيارات الترجمة
 * @returns كائن يحتوي على الترجمات لجميع اللغات
 */
export async function translateToAllLanguages(
  text: string,
  sourceLanguage: SupportedLanguage = 'ar',
  options: TranslationOptions = {}
): Promise<TranslationResult> {
  const { useGoogleTranslate = true, fallbackToOriginal = true, skipLanguages = [] } = options;
  
  const translations: Record<string, string> = {};
  const isAutoTranslated: Record<string, boolean> = {};
  const errors: Record<string, string> = {};
  
  // إضافة النص الأصلي
  translations[`name_${sourceLanguage}`] = text;
  isAutoTranslated[sourceLanguage] = false;
  
  // الترجمة للغات الأخرى
  const targetLanguages = SUPPORTED_LANGUAGES.filter(
    lang => lang !== sourceLanguage && !skipLanguages.includes(lang)
  );
  
  if (useGoogleTranslate) {
    // استخدام Google Translate API (يتطلب مفتاح API)
    try {
      const translationPromises = targetLanguages.map(async (targetLang) => {
        try {
          const translated = await translateWithGoogle(text, sourceLanguage, targetLang);
          translations[`name_${targetLang}`] = translated;
          isAutoTranslated[targetLang] = true;
        } catch (error) {
          if (fallbackToOriginal) {
            translations[`name_${targetLang}`] = text;
          }
          errors[targetLang] = error instanceof Error ? error.message : 'Translation failed';
          isAutoTranslated[targetLang] = false;
        }
      });
      
      await Promise.all(translationPromises);
    } catch (error) {
      // في حالة فشل الاتصال، استخدم النص الأصلي
      if (fallbackToOriginal) {
        targetLanguages.forEach(lang => {
          translations[`name_${lang}`] = text;
          isAutoTranslated[lang] = false;
        });
      }
    }
  } else {
    // استخدام الترجمة المحلية (قاموس محدود)
    targetLanguages.forEach(lang => {
      const localTranslation = getLocalTranslation(text, sourceLanguage, lang);
      translations[`name_${lang}`] = localTranslation || (fallbackToOriginal ? text : '');
      isAutoTranslated[lang] = !!localTranslation;
    });
  }
  
  return {
    translations,
    sourceLanguage,
    isAutoTranslated,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * ترجمة باستخدام Google Translate API
 * 
 * @param text النص المراد ترجمته
 * @param source لغة المصدر
 * @param target لغة الهدف
 * @returns النص المترجم
 */
async function translateWithGoogle(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage
): Promise<string> {
  // ملاحظة: يتطلب إعداد Google Cloud Translation API
  // يمكن استخدام الطريقة المجانية (محدودة) أو API الرسمي
  
  const apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    // استخدام الترجمة المحلية كبديل
    return getLocalTranslation(text, source, target) || text;
  }
  
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: source,
      target: target,
      format: 'text',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * قاموس الترجمات المحلية للكلمات الشائعة
 */
const LOCAL_TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  // الألوان
  'أبيض': { ar: 'أبيض', en: 'White', ru: 'Белый', uk: 'Білий', ro: 'Alb', pl: 'Biały', tr: 'Beyaz', de: 'Weiß', it: 'Bianco' },
  'أسود': { ar: 'أسود', en: 'Black', ru: 'Чёрный', uk: 'Чорний', ro: 'Negru', pl: 'Czarny', tr: 'Siyah', de: 'Schwarz', it: 'Nero' },
  'أحمر': { ar: 'أحمر', en: 'Red', ru: 'Красный', uk: 'Червоний', ro: 'Roșu', pl: 'Czerwony', tr: 'Kırmızı', de: 'Rot', it: 'Rosso' },
  'أزرق': { ar: 'أزرق', en: 'Blue', ru: 'Синий', uk: 'Синій', ro: 'Albastru', pl: 'Niebieski', tr: 'Mavi', de: 'Blau', it: 'Blu' },
  'أخضر': { ar: 'أخضر', en: 'Green', ru: 'Зелёный', uk: 'Зелений', ro: 'Verde', pl: 'Zielony', tr: 'Yeşil', de: 'Grün', it: 'Verde' },
  'بيج': { ar: 'بيج', en: 'Beige', ru: 'Бежевый', uk: 'Бежевий', ro: 'Bej', pl: 'Beżowy', tr: 'Bej', de: 'Beige', it: 'Beige' },
  'كحلي': { ar: 'كحلي', en: 'Navy', ru: 'Тёмно-синий', uk: 'Темно-синій', ro: 'Bleumarin', pl: 'Granatowy', tr: 'Lacivert', de: 'Marineblau', it: 'Blu navy' },
  'رمادي': { ar: 'رمادي', en: 'Gray', ru: 'Серый', uk: 'Сірий', ro: 'Gri', pl: 'Szary', tr: 'Gri', de: 'Grau', it: 'Grigio' },
  'كريمي': { ar: 'كريمي', en: 'Cream', ru: 'Кремовый', uk: 'Кремовий', ro: 'Crem', pl: 'Kremowy', tr: 'Krem', de: 'Creme', it: 'Crema' },
  
  // المواد
  'حرير': { ar: 'حرير', en: 'Silk', ru: 'Шёлк', uk: 'Шовк', ro: 'Mătase', pl: 'Jedwab', tr: 'İpek', de: 'Seide', it: 'Seta' },
  'قطن': { ar: 'قطن', en: 'Cotton', ru: 'Хлопок', uk: 'Бавовна', ro: 'Bumbac', pl: 'Bawełna', tr: 'Pamuk', de: 'Baumwolle', it: 'Cotone' },
  'كتان': { ar: 'كتان', en: 'Linen', ru: 'Лён', uk: 'Льон', ro: 'In', pl: 'Len', tr: 'Keten', de: 'Leinen', it: 'Lino' },
  'بوليستر': { ar: 'بوليستر', en: 'Polyester', ru: 'Полиэстер', uk: 'Поліестер', ro: 'Poliester', pl: 'Poliester', tr: 'Polyester', de: 'Polyester', it: 'Poliestere' },
  'صوف': { ar: 'صوف', en: 'Wool', ru: 'Шерсть', uk: 'Вовна', ro: 'Lână', pl: 'Wełna', tr: 'Yün', de: 'Wolle', it: 'Lana' },
  
  // المصطلحات المحاسبية
  'الأصول': { ar: 'الأصول', en: 'Assets', ru: 'Активы', uk: 'Активи', ro: 'Active', pl: 'Aktywa', tr: 'Varlıklar', de: 'Vermögenswerte', it: 'Attività' },
  'الخصوم': { ar: 'الخصوم', en: 'Liabilities', ru: 'Обязательства', uk: 'Зобов\'язання', ro: 'Datorii', pl: 'Zobowiązania', tr: 'Borçlar', de: 'Verbindlichkeiten', it: 'Passività' },
  'حقوق الملكية': { ar: 'حقوق الملكية', en: 'Equity', ru: 'Капитал', uk: 'Капітал', ro: 'Capital propriu', pl: 'Kapitał własny', tr: 'Öz sermaye', de: 'Eigenkapital', it: 'Patrimonio netto' },
  'الإيرادات': { ar: 'الإيرادات', en: 'Revenue', ru: 'Доходы', uk: 'Доходи', ro: 'Venituri', pl: 'Przychody', tr: 'Gelir', de: 'Einnahmen', it: 'Ricavi' },
  'المصروفات': { ar: 'المصروفات', en: 'Expenses', ru: 'Расходы', uk: 'Витрати', ro: 'Cheltuieli', pl: 'Wydatki', tr: 'Giderler', de: 'Ausgaben', it: 'Spese' },
  'المخزون': { ar: 'المخزون', en: 'Inventory', ru: 'Запасы', uk: 'Запаси', ro: 'Inventar', pl: 'Zapasy', tr: 'Stok', de: 'Bestand', it: 'Inventario' },
  'النقد': { ar: 'النقد', en: 'Cash', ru: 'Наличные', uk: 'Готівка', ro: 'Numerar', pl: 'Gotówka', tr: 'Nakit', de: 'Bargeld', it: 'Contanti' },
  'البنك': { ar: 'البنك', en: 'Bank', ru: 'Банк', uk: 'Банк', ro: 'Bancă', pl: 'Bank', tr: 'Banka', de: 'Bank', it: 'Banca' },
  
  // المصطلحات التجارية
  'مورد': { ar: 'مورد', en: 'Supplier', ru: 'Поставщик', uk: 'Постачальник', ro: 'Furnizor', pl: 'Dostawca', tr: 'Tedarikçi', de: 'Lieferant', it: 'Fornitore' },
  'عميل': { ar: 'عميل', en: 'Customer', ru: 'Клиент', uk: 'Клієнт', ro: 'Client', pl: 'Klient', tr: 'Müşteri', de: 'Kunde', it: 'Cliente' },
  'فاتورة': { ar: 'فاتورة', en: 'Invoice', ru: 'Счёт-фактура', uk: 'Рахунок-фактура', ro: 'Factură', pl: 'Faktura', tr: 'Fatura', de: 'Rechnung', it: 'Fattura' },
  'كونتينر': { ar: 'كونتينر', en: 'Container', ru: 'Контейнер', uk: 'Контейнер', ro: 'Container', pl: 'Kontener', tr: 'Konteyner', de: 'Container', it: 'Container' },
  'شحن': { ar: 'شحن', en: 'Shipping', ru: 'Доставка', uk: 'Доставка', ro: 'Expediere', pl: 'Wysyłka', tr: 'Nakliye', de: 'Versand', it: 'Spedizione' },
  'جمارك': { ar: 'جمارك', en: 'Customs', ru: 'Таможня', uk: 'Митниця', ro: 'Vamă', pl: 'Cło', tr: 'Gümrük', de: 'Zoll', it: 'Dogana' },
};

/**
 * الحصول على ترجمة محلية من القاموس
 */
function getLocalTranslation(
  text: string,
  source: SupportedLanguage,
  target: SupportedLanguage
): string | null {
  // البحث المباشر
  const directMatch = LOCAL_TRANSLATIONS[text];
  if (directMatch && directMatch[target]) {
    return directMatch[target];
  }
  
  // البحث في القيم (للترجمة العكسية)
  for (const [key, translations] of Object.entries(LOCAL_TRANSLATIONS)) {
    if (translations[source] === text && translations[target]) {
      return translations[target];
    }
  }
  
  return null;
}

/**
 * تحويل الترجمات إلى صيغة قاعدة البيانات
 * 
 * @param translations كائن الترجمات
 * @param prefix بادئة الحقول (name_, description_)
 * @returns كائن جاهز للحفظ في قاعدة البيانات
 */
export function formatTranslationsForDB(
  translations: Record<string, string>,
  prefix: 'name' | 'description' = 'name'
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(translations)) {
    // التأكد من صحة المفتاح
    if (key.startsWith(`${prefix}_`)) {
      result[key] = value;
    } else if (SUPPORTED_LANGUAGES.includes(key as SupportedLanguage)) {
      result[`${prefix}_${key}`] = value;
    }
  }
  
  return result;
}

/**
 * استخراج الترجمات من كائن قاعدة البيانات
 * 
 * @param data كائن البيانات من قاعدة البيانات
 * @param prefix بادئة الحقول
 * @returns كائن الترجمات
 */
export function extractTranslationsFromDB(
  data: Record<string, unknown>,
  prefix: 'name' | 'description' = 'name'
): Record<SupportedLanguage, string> {
  const result: Record<string, string> = {};
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const key = `${prefix}_${lang}`;
    if (data[key] && typeof data[key] === 'string') {
      result[lang] = data[key] as string;
    }
  }
  
  return result as Record<SupportedLanguage, string>;
}

/**
 * التحقق مما إذا كانت جميع الترجمات موجودة
 */
export function hasAllTranslations(
  data: Record<string, unknown>,
  prefix: 'name' | 'description' = 'name'
): boolean {
  return SUPPORTED_LANGUAGES.every(lang => {
    const key = `${prefix}_${lang}`;
    return data[key] && typeof data[key] === 'string' && (data[key] as string).trim() !== '';
  });
}

/**
 * الحصول على الترجمة حسب اللغة الحالية مع fallback
 */
export function getTranslatedName(
  data: Record<string, unknown>,
  currentLanguage: SupportedLanguage,
  prefix: 'name' | 'description' = 'name',
  fallbackLanguage: SupportedLanguage = 'en'
): string {
  const primaryKey = `${prefix}_${currentLanguage}`;
  const fallbackKey = `${prefix}_${fallbackLanguage}`;
  const defaultKey = `${prefix}_ar`;
  
  if (data[primaryKey] && typeof data[primaryKey] === 'string') {
    return data[primaryKey] as string;
  }
  
  if (data[fallbackKey] && typeof data[fallbackKey] === 'string') {
    return data[fallbackKey] as string;
  }
  
  if (data[defaultKey] && typeof data[defaultKey] === 'string') {
    return data[defaultKey] as string;
  }
  
  // البحث عن أي ترجمة متاحة
  for (const lang of SUPPORTED_LANGUAGES) {
    const key = `${prefix}_${lang}`;
    if (data[key] && typeof data[key] === 'string') {
      return data[key] as string;
    }
  }
  
  return '';
}

export default {
  translateToAllLanguages,
  formatTranslationsForDB,
  extractTranslationsFromDB,
  hasAllTranslations,
  getTranslatedName,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
};

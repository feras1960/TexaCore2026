/**
 * Multi-language Number to Words Converter
 * تحويل الأرقام إلى كلمات بلغات متعددة
 */

type SupportedLanguage = 'ar' | 'en' | 'de' | 'tr' | 'ru' | 'uk' | 'it' | 'pl' | 'ro';

// Language data for number conversion
const languageData: Record<SupportedLanguage, {
  ones: string[];
  tens: string[];
  hundreds: string[];
  thousand: string;
  thousands: string;
  million: string;
  millions: string;
  billion: string;
  billions: string;
  and: string;
  zero: string;
  only: string;
  negative: string;
  cents: string;
}> = {
  ar: {
    ones: ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'],
    tens: ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'],
    hundreds: ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'],
    thousand: 'ألف',
    thousands: 'آلاف',
    million: 'مليون',
    millions: 'ملايين',
    billion: 'مليار',
    billions: 'مليارات',
    and: 'و',
    zero: 'صفر',
    only: 'فقط لا غير',
    negative: 'سالب',
    cents: 'هللة',
  },
  en: {
    ones: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    hundreds: ['', 'one hundred', 'two hundred', 'three hundred', 'four hundred', 'five hundred', 'six hundred', 'seven hundred', 'eight hundred', 'nine hundred'],
    thousand: 'thousand',
    thousands: 'thousand',
    million: 'million',
    millions: 'million',
    billion: 'billion',
    billions: 'billion',
    and: 'and',
    zero: 'zero',
    only: 'only',
    negative: 'negative',
    cents: 'cents',
  },
  de: {
    ones: ['', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'],
    tens: ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'],
    hundreds: ['', 'einhundert', 'zweihundert', 'dreihundert', 'vierhundert', 'fünfhundert', 'sechshundert', 'siebenhundert', 'achthundert', 'neunhundert'],
    thousand: 'tausend',
    thousands: 'tausend',
    million: 'Million',
    millions: 'Millionen',
    billion: 'Milliarde',
    billions: 'Milliarden',
    and: 'und',
    zero: 'null',
    only: 'genau',
    negative: 'minus',
    cents: 'Cent',
  },
  tr: {
    ones: ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş', 'on altı', 'on yedi', 'on sekiz', 'on dokuz'],
    tens: ['', '', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'],
    hundreds: ['', 'yüz', 'iki yüz', 'üç yüz', 'dört yüz', 'beş yüz', 'altı yüz', 'yedi yüz', 'sekiz yüz', 'dokuz yüz'],
    thousand: 'bin',
    thousands: 'bin',
    million: 'milyon',
    millions: 'milyon',
    billion: 'milyar',
    billions: 'milyar',
    and: '',
    zero: 'sıfır',
    only: 'tam',
    negative: 'eksi',
    cents: 'kuruş',
  },
  ru: {
    ones: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'],
    tens: ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'],
    hundreds: ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'],
    thousand: 'тысяча',
    thousands: 'тысяч',
    million: 'миллион',
    millions: 'миллионов',
    billion: 'миллиард',
    billions: 'миллиардов',
    and: '',
    zero: 'ноль',
    only: 'ровно',
    negative: 'минус',
    cents: 'копеек',
  },
  uk: {
    ones: ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять', 'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'],
    tens: ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'],
    hundreds: ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'],
    thousand: 'тисяча',
    thousands: 'тисяч',
    million: 'мільйон',
    millions: 'мільйонів',
    billion: 'мільярд',
    billions: 'мільярдів',
    and: '',
    zero: 'нуль',
    only: 'рівно',
    negative: 'мінус',
    cents: 'копійок',
  },
  it: {
    ones: ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'],
    tens: ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'],
    hundreds: ['', 'cento', 'duecento', 'trecento', 'quattrocento', 'cinquecento', 'seicento', 'settecento', 'ottocento', 'novecento'],
    thousand: 'mille',
    thousands: 'mila',
    million: 'milione',
    millions: 'milioni',
    billion: 'miliardo',
    billions: 'miliardi',
    and: 'e',
    zero: 'zero',
    only: 'esatti',
    negative: 'meno',
    cents: 'centesimi',
  },
  pl: {
    ones: ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'],
    tens: ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'],
    hundreds: ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'],
    thousand: 'tysiąc',
    thousands: 'tysięcy',
    million: 'milion',
    millions: 'milionów',
    billion: 'miliard',
    billions: 'miliardów',
    and: '',
    zero: 'zero',
    only: 'dokładnie',
    negative: 'minus',
    cents: 'groszy',
  },
  ro: {
    ones: ['', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'],
    tens: ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'],
    hundreds: ['', 'o sută', 'două sute', 'trei sute', 'patru sute', 'cinci sute', 'șase sute', 'șapte sute', 'opt sute', 'nouă sute'],
    thousand: 'mie',
    thousands: 'mii',
    million: 'milion',
    millions: 'milioane',
    billion: 'miliard',
    billions: 'miliarde',
    and: 'și',
    zero: 'zero',
    only: 'exact',
    negative: 'minus',
    cents: 'bani',
  },
};

// Default currency names per language
const defaultCurrencies: Record<SupportedLanguage, string> = {
  ar: 'ريال سعودي',
  en: 'Saudi Riyal',
  de: 'Saudi-Rial',
  tr: 'Suudi Riyali',
  ru: 'саудовских риялов',
  uk: 'саудівських ріялів',
  it: 'riyal sauditi',
  pl: 'riali saudyjskich',
  ro: 'riali saudiți',
};

function convertHundreds(num: number, lang: SupportedLanguage): string {
  const data = languageData[lang];
  if (num === 0) return '';
  
  if (num < 20) {
    return data.ones[num];
  }
  
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (one === 0) {
      return data.tens[ten];
    }
    // Different languages have different word orders
    if (lang === 'ar') {
      return data.ones[one] + ' ' + data.and + data.tens[ten];
    } else if (lang === 'de') {
      return data.ones[one] + data.and + data.tens[ten];
    } else {
      return data.tens[ten] + (data.and ? ' ' + data.and + ' ' : ' ') + data.ones[one];
    }
  }
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  
  if (remainder === 0) {
    return data.hundreds[hundred];
  }
  
  if (lang === 'ar') {
    return data.hundreds[hundred] + ' ' + data.and + convertHundreds(remainder, lang);
  } else {
    return data.hundreds[hundred] + (data.and ? ' ' + data.and + ' ' : ' ') + convertHundreds(remainder, lang);
  }
}

function getScaleWord(count: number, singular: string, plural: string, lang: SupportedLanguage): string {
  const word = count === 1 ? singular : plural;
  return convertHundreds(count, lang) + ' ' + word;
}

/**
 * Convert number to words in specified language
 * @param num - The number to convert
 * @param language - The target language (ar, en, de, tr, ru, uk, it, pl, ro)
 * @param currency - Optional currency name
 * @returns The number spelled out in words
 */
export function numberToWords(
  num: number, 
  language: string = 'ar',
  currency?: string
): string {
  // Normalize language code
  const lang = (language?.substring(0, 2).toLowerCase() || 'ar') as SupportedLanguage;
  const data = languageData[lang] || languageData.ar;
  const currencyName = currency || defaultCurrencies[lang] || defaultCurrencies.ar;
  
  if (num === 0) {
    return `${data.zero} ${currencyName} ${data.only}`;
  }
  
  const isNegative = num < 0;
  num = Math.abs(num);
  
  // Separate integer and decimal parts
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = '';
  
  // Billions
  const billionCount = Math.floor(integerPart / 1000000000);
  if (billionCount > 0) {
    result += getScaleWord(billionCount, data.billion, data.billions, lang) + ' ';
  }
  
  // Millions
  const millionCount = Math.floor((integerPart % 1000000000) / 1000000);
  if (millionCount > 0) {
    if (result && data.and) result += data.and + ' ';
    result += getScaleWord(millionCount, data.million, data.millions, lang) + ' ';
  }
  
  // Thousands
  const thousandCount = Math.floor((integerPart % 1000000) / 1000);
  if (thousandCount > 0) {
    if (result && data.and) result += data.and + ' ';
    result += getScaleWord(thousandCount, data.thousand, data.thousands, lang) + ' ';
  }
  
  // Hundreds
  const hundredCount = integerPart % 1000;
  if (hundredCount > 0) {
    if (result && data.and) result += data.and + ' ';
    result += convertHundreds(hundredCount, lang) + ' ';
  }
  
  result = result.trim() + ' ' + currencyName;
  
  // Decimal part (cents)
  if (decimalPart > 0) {
    result += ' ' + (data.and || '') + ' ' + convertHundreds(decimalPart, lang) + ' ' + data.cents;
  }
  
  result += ' ' + data.only;
  
  if (isNegative) {
    result = data.negative + ' ' + result;
  }
  
  // Clean up extra spaces
  return result.replace(/\s+/g, ' ').trim();
}

// Legacy function for backwards compatibility
export function numberToArabicWords(num: number, currency: string = 'ريال سعودي'): string {
  return numberToWords(num, 'ar', currency);
}

export default numberToWords;

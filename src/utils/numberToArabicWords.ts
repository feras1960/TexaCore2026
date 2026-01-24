/**
 * تحويل الأرقام إلى كلمات عربية (التفقيط)
 * Number to Arabic Words Converter
 */

const ones = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة',
  'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
  'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const tens = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون',
  'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const hundreds = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

const thousands = ['', 'ألف', 'ألفان', 'آلاف'];
const millions = ['', 'مليون', 'مليونان', 'ملايين'];
const billions = ['', 'مليار', 'ملياران', 'مليارات'];

function convertHundreds(num: number): string {
  if (num === 0) return '';
  
  if (num < 20) {
    return ones[num];
  }
  
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    if (one === 0) {
      return tens[ten];
    }
    return ones[one] + ' و' + tens[ten];
  }
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  
  if (remainder === 0) {
    return hundreds[hundred];
  }
  
  return hundreds[hundred] + ' و' + convertHundreds(remainder);
}

function getThousandWord(count: number): string {
  if (count === 1) return thousands[1];
  if (count === 2) return thousands[2];
  if (count >= 3 && count <= 10) return convertHundreds(count) + ' ' + thousands[3];
  return convertHundreds(count) + ' ' + thousands[1];
}

function getMillionWord(count: number): string {
  if (count === 1) return millions[1];
  if (count === 2) return millions[2];
  if (count >= 3 && count <= 10) return convertHundreds(count) + ' ' + millions[3];
  return convertHundreds(count) + ' ' + millions[1];
}

function getBillionWord(count: number): string {
  if (count === 1) return billions[1];
  if (count === 2) return billions[2];
  if (count >= 3 && count <= 10) return convertHundreds(count) + ' ' + billions[3];
  return convertHundreds(count) + ' ' + billions[1];
}

export function numberToArabicWords(num: number, currency: string = 'ريال سعودي'): string {
  if (num === 0) return 'صفر ' + currency + ' فقط لا غير';
  
  const isNegative = num < 0;
  num = Math.abs(num);
  
  // فصل الجزء الصحيح عن الكسري
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = '';
  
  // المليارات
  const billionCount = Math.floor(integerPart / 1000000000);
  if (billionCount > 0) {
    result += getBillionWord(billionCount) + ' ';
  }
  
  // الملايين
  const millionCount = Math.floor((integerPart % 1000000000) / 1000000);
  if (millionCount > 0) {
    if (result) result += 'و';
    result += getMillionWord(millionCount) + ' ';
  }
  
  // الآلاف
  const thousandCount = Math.floor((integerPart % 1000000) / 1000);
  if (thousandCount > 0) {
    if (result) result += 'و';
    result += getThousandWord(thousandCount) + ' ';
  }
  
  // المئات
  const hundredCount = integerPart % 1000;
  if (hundredCount > 0) {
    if (result) result += 'و';
    result += convertHundreds(hundredCount) + ' ';
  }
  
  result = result.trim() + ' ' + currency;
  
  // الهللات/القروش
  if (decimalPart > 0) {
    result += ' و' + convertHundreds(decimalPart) + ' هللة';
  }
  
  result += ' فقط لا غير';
  
  if (isNegative) {
    result = 'سالب ' + result;
  }
  
  return result;
}

// نسخة مختصرة للأرقام الكبيرة
export function formatLargeNumber(num: number): string {
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(1) + ' مليار';
  }
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1) + ' مليون';
  }
  if (absNum >= 1000) {
    return (num / 1000).toFixed(1) + ' ألف';
  }
  
  return num.toLocaleString('ar-SA');
}

export default numberToArabicWords;

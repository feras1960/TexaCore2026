/**
 * i18n Helper Functions
 * دوال مساعدة للترجمة
 * 
 * تستخدم لجلب النصوص المترجمة بشكل آمن من البيانات
 */

/**
 * Get localized field value with fallback support
 * الحصول على قيمة الحقل المترجم مع دعم القيم الاحتياطية
 * 
 * @param data - The data object
 * @param fieldName - The base field name (e.g., 'name', 'description')
 * @param language - Current language code (e.g., 'ar', 'en')
 * @param fallback - Fallback value if field not found
 * @returns The localized field value
 * 
 * @example
 * // Database has: { name: "Basic Plan", name_ar: "الخطة الأساسية" }
 * getLocalizedField(data, 'name', 'ar') // Returns: "الخطة الأساسية"
 * getLocalizedField(data, 'name', 'en') // Returns: "Basic Plan"
 * 
 * // Database has: { name: "Basic Plan" } (no name_ar)
 * getLocalizedField(data, 'name', 'ar') // Returns: "Basic Plan"
 */
export const getLocalizedField = (
  data: any,
  fieldName: string,
  language: string,
  fallback: string = ''
): string => {
  if (!data) return fallback;

  // Try language-specific field first (e.g., name_ar, description_ar)
  const langField = `${fieldName}_${language}`;
  if (data[langField] !== undefined && data[langField] !== null && data[langField] !== '') {
    return String(data[langField]);
  }

  // Try base field (e.g., name, description)
  if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
    return String(data[fieldName]);
  }

  // Return fallback
  return fallback;
};

/**
 * Get localized name with fallback
 * الحصول على الاسم المترجم
 */
export const getLocalizedName = (
  data: any,
  language: string,
  fallback: string = 'N/A'
): string => {
  return getLocalizedField(data, 'name', language, fallback);
};

/**
 * Get localized description with fallback
 * الحصول على الوصف المترجم
 */
export const getLocalizedDescription = (
  data: any,
  language: string,
  fallback: string = ''
): string => {
  return getLocalizedField(data, 'description', language, fallback);
};

/**
 * Safe value getter with fallback
 * الحصول على قيمة بشكل آمن مع قيمة احتياطية
 */
export const getSafeValue = <T = any>(
  data: any,
  key: string,
  fallback: T
): T => {
  if (!data) return fallback;
  
  const value = data[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  
  return value as T;
};

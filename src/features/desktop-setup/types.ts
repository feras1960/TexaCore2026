// ════════════════════════════════════════════════════════════
// Desktop Setup Wizard — Types & Constants
// ════════════════════════════════════════════════════════════

export interface DesktopSetupData {
  // Step 1: Language
  language: string;

  // Step 2: Company
  companyName: string;
  businessType: string;
  country: string;
  city: string;
  phone: string;
  fiscalYearStart: number;

  // Step 3: Currencies
  localCurrency: string;
  mainCurrency: string;
  additionalCurrencies: string[];

  // Step 4: Admin User
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  adminPasswordConfirm: string;

  // Step 5: Chart of Accounts
  chartTemplate: string;

  // Step 6: Taxes
  vatEnabled: boolean;
  vatRate: number;
  taxNumber: string;
  withholdingEnabled: boolean;

  // Step 7: Storage & Backup
  storagePath: string;
  autoBackup: boolean;
  backupIntervalMinutes: number;

  // Step 8: Google Drive
  googleDriveEnabled: boolean;
  googleDriveEmail: string;
}

export const WIZARD_STEPS = [
  'language',
  'company',
  'currencies',
  'admin',
  'accounts',
  'taxes',
  'storage',
  'google-drive',
  'complete',
] as const;

export type WizardStep = typeof WIZARD_STEPS[number];

export const DEFAULT_SETUP_DATA: DesktopSetupData = {
  language: '',
  companyName: '',
  businessType: 'general',
  country: '',
  city: '',
  phone: '',
  fiscalYearStart: 1,
  localCurrency: '',
  mainCurrency: 'USD',
  additionalCurrencies: [],
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
  adminPasswordConfirm: '',
  chartTemplate: 'extended',
  vatEnabled: false,
  vatRate: 5,
  taxNumber: '',
  withholdingEnabled: false,
  storagePath: '~/Documents/TexaCore',
  autoBackup: true,
  backupIntervalMinutes: 5,
  googleDriveEnabled: false,
  googleDriveEmail: '',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'zh', name: '中文', flag: '🇨🇳', dir: 'ltr' },
];

export const BUSINESS_TYPES = [
  { id: 'general', icon: '🏪', ar: 'تجاري عام', en: 'General Trading' },
  { id: 'manufacturing', icon: '🏭', ar: 'صناعي / تصنيع', en: 'Manufacturing' },
  { id: 'construction', icon: '🏗️', ar: 'مقاولات', en: 'Construction' },
  { id: 'services', icon: '💼', ar: 'خدمات مهنية', en: 'Professional Services' },
  { id: 'restaurant', icon: '🍽️', ar: 'مطعم / ضيافة', en: 'Restaurant / Hospitality' },
  { id: 'fabric', icon: '🧵', ar: 'أقمشة ومنسوجات', en: 'Fabric & Textiles' },
  { id: 'pharmacy', icon: '💊', ar: 'صيدلية', en: 'Pharmacy' },
  { id: 'jewelry', icon: '💎', ar: 'ذهب ومجوهرات', en: 'Gold & Jewelry' },
  { id: 'other', icon: '📋', ar: 'آخر', en: 'Other' },
];

export const CHART_TEMPLATES = [
  { id: 'simple', accounts: 45, ar: 'مبسّط', en: 'Simple', descAr: 'مناسب للشركات الصغيرة', descEn: 'Suitable for small businesses' },
  { id: 'extended', accounts: 85, ar: 'موسّع (موصى به)', en: 'Extended (Recommended)', descAr: 'يناسب 90% من الشركات التجارية', descEn: 'Fits 90% of trading companies' },
  { id: 'manufacturing', accounts: 120, ar: 'صناعي', en: 'Manufacturing', descAr: 'محاسبة تكاليف متقدمة', descEn: 'Advanced cost accounting' },
  { id: 'empty', accounts: 0, ar: 'فارغ', en: 'Empty', descAr: 'بدون حسابات — أنشئ يدوياً', descEn: 'No accounts — create manually' },
];

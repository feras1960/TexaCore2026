import {
  LayoutDashboard,
  Calculator,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Settings,
  Brain,
  Crown,
  ScanBarcode,
  ArrowRightLeft,
  Factory,
  UserCog,
  Building2,
  Globe,
  Beaker,
  History,
  ScrollText,
  Pill,
  Stethoscope,
  GitBranch,

  PanelTop,
  Sparkles,
} from 'lucide-react';

export interface StaticModule {
  code: string;
  name_ar: string;
  name_en: string;
  name_ru?: string;
  name_uk?: string;
  icon: any;
  path: string;
  is_enabled: boolean;
  requires_upgrade: boolean;
  requires_super_admin?: boolean; // 🛡️ SECURITY: فقط Super Admin يمكنه رؤية هذا الموديول
  is_core: boolean;
}

export const STATIC_MODULES: StaticModule[] = [
  // ═══ الأقسام الأساسية (مرتبة حسب الأولوية) ═══
  {
    code: 'dashboard',
    name_ar: 'لوحة التحكم',
    name_en: 'Dashboard',
    name_ru: 'Панель управления',
    name_uk: 'Панель керування',
    icon: LayoutDashboard,
    path: '/',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'accounting',
    name_ar: 'المحاسبة',
    name_en: 'Accounting',
    name_ru: 'Бухгалтерия',
    name_uk: 'Бухгалтерія',
    icon: Calculator,
    path: '/accounting',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'inventory',
    name_ar: 'المستودعات',
    name_en: 'Warehouses',
    name_ru: 'Склады',
    name_uk: 'Склади',
    icon: Package,
    path: '/warehouse',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'sales',
    name_ar: 'المبيعات',
    name_en: 'Sales',
    name_ru: 'Продажи',
    name_uk: 'Продажі',
    icon: ShoppingCart,
    path: '/sales',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'purchases',
    name_ar: 'المشتريات',
    name_en: 'Purchases',
    name_ru: 'Закупки',
    name_uk: 'Закупівлі',
    icon: ShoppingBag,
    path: '/purchases',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'crm',
    name_ar: 'إدارة العملاء',
    name_en: 'CRM',
    name_ru: 'CRM',
    name_uk: 'CRM',
    icon: Users,
    path: '/crm',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'hr',
    name_ar: 'الموارد البشرية',
    name_en: 'HR',
    name_ru: 'Кадры',
    name_uk: 'Кадри',
    icon: UserCog,
    path: '/hr',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'e-commerce',
    name_ar: 'المتجر الإلكتروني',
    name_en: 'E-Commerce',
    name_ru: 'Интернет-магазин',
    name_uk: 'Інтернет-магазин',
    icon: Globe,
    path: '/ecommerce',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'ai_analytics',
    name_ar: 'تحليلات الذكاء الاصطناعي',
    name_en: 'AI Analytics',
    name_ru: 'ИИ Аналитика',
    name_uk: 'ШІ Аналітика',
    icon: Brain,
    path: '/ai-analytics',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'inspiration_studio',
    name_ar: 'استوديو الإلهام',
    name_en: 'Inspiration Studio',
    name_ru: 'Студия Вдохновения',
    name_uk: 'Студія Натхнення',
    icon: Sparkles,
    path: '/inspiration-studio',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },

  // ═══ الإدارة والنظام ═══
  {
    code: 'workflow_center',
    name_ar: 'سير العمل',
    name_en: 'Workflow Center',
    name_ru: 'Рабочие процессы',
    name_uk: 'Робочі процеси',
    icon: GitBranch,
    path: '/workflows',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'system_config',
    name_ar: 'الإعدادات',
    name_en: 'Settings',
    name_ru: 'Настройки',
    name_uk: 'Налаштування',
    icon: Settings,
    path: '/system-config',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'saas',
    name_ar: 'إدارة الاشتراكات',
    name_en: 'SaaS',
    name_ru: 'SaaS',
    name_uk: 'SaaS',
    icon: Crown,
    path: '/saas',
    is_enabled: true,
    requires_upgrade: false,
    requires_super_admin: true,
    is_core: true
  },

  // ═══ أقسام تخصصية ═══
  {
    code: 'fabric',
    name_ar: 'إدارة الأقمشة',
    name_en: 'Fabric Management',
    name_ru: 'Управление тканями',
    name_uk: 'Управління тканинами',
    icon: ScrollText,
    path: '/fabric',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'pos',
    name_ar: 'نقاط البيع',
    name_en: 'POS',
    name_ru: 'Касса',
    name_uk: 'Каса',
    icon: ScanBarcode,
    path: '/pos',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'pharmacy',
    name_ar: 'إدارة الصيدليات',
    name_en: 'Pharmacy Management',
    name_ru: 'Управление аптекой',
    name_uk: 'Управління аптекою',
    icon: Pill,
    path: '/pharmacy',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'healthcare',
    name_ar: 'إدارة المشافي',
    name_en: 'Healthcare',
    name_ru: 'Здравоохранение',
    name_uk: 'Охорона здоров\'я',
    icon: Stethoscope,
    path: '/healthcare',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'doctors',
    name_ar: 'إدارة الأطباء',
    name_en: 'Doctors',
    name_ru: 'Врачи',
    name_uk: 'Лікарі',
    icon: UserCog,
    path: '/doctors',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'restaurant',
    name_ar: 'المطاعم',
    name_en: 'Restaurant',
    name_ru: 'Ресторан',
    name_uk: 'Ресторан',
    icon: Users,
    path: '/restaurant',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'gold',
    name_ar: 'الذهب والمجوهرات',
    name_en: 'Gold & Jewelry',
    name_ru: 'Золото и ювелирные',
    name_uk: 'Золото та ювелірні',
    icon: Crown,
    path: '/gold',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'real_estate',
    name_ar: 'العقارات',
    name_en: 'Real Estate',
    name_ru: 'Недвижимость',
    name_uk: 'Нерухомість',
    icon: Building2,
    path: '/real-estate',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'exchange',
    name_ar: 'الصرافة',
    name_en: 'Exchange',
    name_ru: 'Обмен валют',
    name_uk: 'Обмін валют',
    icon: ArrowRightLeft,
    path: '/exchange',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'manufacturing',
    name_ar: 'التصنيع',
    name_en: 'Manufacturing',
    name_ru: 'Производство',
    name_uk: 'Виробництво',
    icon: Factory,
    path: '/manufacturing',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'website',
    name_ar: 'إدارة المواقع',
    name_en: 'Website Manager',
    name_ru: 'Управление сайтом',
    name_uk: 'Управління сайтом',
    icon: PanelTop,
    path: '/website',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'activity_log',
    name_ar: 'سجل النشاط',
    name_en: 'Activity Log',
    name_ru: 'Журнал действий',
    name_uk: 'Журнал дій',
    icon: History,
    path: '/activity-log',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'component_lab',
    name_ar: 'مختبر المكونات',
    name_en: 'Component Lab',
    name_ru: 'Лаборатория',
    name_uk: 'Лабораторія',
    icon: Beaker,
    path: '/component-lab',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
];

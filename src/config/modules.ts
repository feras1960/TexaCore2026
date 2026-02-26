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
  ShieldCheck,
} from 'lucide-react';

export interface StaticModule {
  code: string;
  name_ar: string;
  name_en: string;
  icon: any;
  path: string;
  is_enabled: boolean;
  requires_upgrade: boolean;
  requires_super_admin?: boolean; // 🛡️ SECURITY: فقط Super Admin يمكنه رؤية هذا الموديول
  is_core: boolean;
}

export const STATIC_MODULES: StaticModule[] = [
  {
    code: 'dashboard',
    name_ar: 'لوحة التحكم',
    name_en: 'Dashboard',
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
    icon: Calculator,
    path: '/accounting',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'inventory',
    name_ar: 'المخزون',
    name_en: 'Inventory',
    icon: Package,
    path: '/inventory',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'fabric', // CORRECTED: Matches DB 'fabric'
    name_ar: 'إدارة الأقمشة',
    name_en: 'Fabric Management',
    icon: ScrollText,
    path: '/fabric',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'pharmacy',
    name_ar: 'إدارة الصيدليات',
    name_en: 'Pharmacy Management',
    icon: Pill,
    path: '/pharmacy',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'healthcare', // NEW: From DB
    name_ar: 'إدارة المشافي',
    name_en: 'Healthcare',
    icon: Stethoscope,
    path: '/healthcare',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'doctors', // NEW: From DB
    name_ar: 'إدارة الأطباء',
    name_en: 'Doctors',
    icon: UserCog,
    path: '/doctors',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'restaurant', // NEW: From DB
    name_ar: 'المطاعم',
    name_en: 'Restaurant',
    icon: Users, // Temporary icon
    path: '/restaurant',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'gold', // NEW: From DB
    name_ar: 'الذهب والمجوهرات',
    name_en: 'Gold & Jewelry',
    icon: Crown, // Temporary icon
    path: '/gold',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  // NOTE: shipments module removed — containers are managed under purchases
  {
    code: 'sales',
    name_ar: 'المبيعات',
    name_en: 'Sales',
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
    icon: ShoppingBag,
    path: '/purchases',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'crm',
    name_ar: 'العملاء (CRM)',
    name_en: 'CRM',
    icon: Users,
    path: '/crm',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'pos',
    name_ar: 'نقاط البيع',
    name_en: 'POS',
    icon: ScanBarcode,
    path: '/pos',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'real_estate',
    name_ar: 'العقارات',
    name_en: 'Real Estate',
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
    icon: Factory,
    path: '/manufacturing',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'hr',
    name_ar: 'الموارد البشرية',
    name_en: 'HR',
    icon: UserCog,
    path: '/hr',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'e-commerce', // CORRECTED: Matches DB 'e-commerce'
    name_ar: 'المتجر الإلكتروني',
    name_en: 'E-Commerce',
    icon: Globe,
    path: '/ecommerce',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'saas',
    name_ar: 'إدارة الاشتراكات',
    name_en: 'SaaS',
    icon: Crown,
    path: '/saas',
    is_enabled: true,
    requires_upgrade: false,
    requires_super_admin: true, // 🛡️ SECURITY: يظهر فقط لـ Super Admin
    is_core: true
  },
  {
    code: 'ai_analytics',
    name_ar: 'تحليلات الذكاء الاصطناعي',
    name_en: 'AI Analytics',
    icon: Brain,
    path: '/ai-analytics',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'activity_log',
    name_ar: 'سجل النشاط',
    name_en: 'Activity Log',
    icon: History,
    path: '/activity-log',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'workflow_center',
    name_ar: 'سير العمل',
    name_en: 'Workflow Center',
    icon: GitBranch,
    path: '/workflows',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'component_lab',
    name_ar: 'مختبر المكونات',
    name_en: 'Component Lab',
    icon: Beaker,
    path: '/component-lab',
    is_enabled: true,
    requires_upgrade: false,
    is_core: false
  },
  {
    code: 'users_permissions',
    name_ar: 'المستخدمون والصلاحيات',
    name_en: 'Users & Permissions',
    icon: ShieldCheck,
    path: '/users-permissions',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  },
  {
    code: 'system_config',
    name_ar: 'الإعدادات',
    name_en: 'Settings',
    icon: Settings,
    path: '/system-config',
    is_enabled: true,
    requires_upgrade: false,
    is_core: true
  }
];

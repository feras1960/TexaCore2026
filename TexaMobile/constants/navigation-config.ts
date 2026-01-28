/**
 * Navigation Configuration - إعدادات التنقل
 * نظام ديناميكي لإدارة التابات حسب دور المستخدم
 * Icons: Lucide React Native
 */

import { UserRole } from '@/lib/supabase';
import { LucideIcon } from 'lucide-react-native';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Truck,
  Package,
  Zap,
  Bell,
  User,
  Settings,
  Calculator,
  ShoppingCart,
  Users,
} from 'lucide-react-native';

// ═══════════════════════════════════════════════════════════════════════════
// Types - الأنواع
// ═══════════════════════════════════════════════════════════════════════════

export interface NavigationTab {
  id: string;
  name: string;
  nameAr: string;
  icon: LucideIcon;
  route: string;
  badge?: number;
  color?: string;
  requiresRole?: UserRole[];
  order: number;
}

export interface NavigationConfig {
  tabs: NavigationTab[];
  maxVisible: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Available Tabs - التابات المتاحة (كل الأدوار)
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_TABS: Record<string, NavigationTab> = {
  // لوحات التحكم حسب الدور
  adminDashboard: {
    id: 'admin',
    name: 'Dashboard',
    nameAr: 'لوحة التحكم',
    icon: LayoutDashboard,
    route: '/(tabs)/admin-dashboard',
    requiresRole: [UserRole.ADMIN, UserRole.FULL_ADMIN],
    order: 1,
  },
  
  cashierDashboard: {
    id: 'cashier',
    name: 'Transactions',
    nameAr: 'المعاملات',
    icon: Wallet,
    route: '/(tabs)/cashier-dashboard',
    requiresRole: [UserRole.CASHIER],
    color: '#10b981',
    order: 1,
  },
  
  driverDashboard: {
    id: 'driver',
    name: 'Deliveries',
    nameAr: 'التوصيل',
    icon: Truck,
    route: '/(tabs)/driver-dashboard',
    requiresRole: [UserRole.DRIVER],
    color: '#f59e0b',
    order: 1,
  },
  
  warehouseDashboard: {
    id: 'warehouse',
    name: 'Inventory',
    nameAr: 'المخزون',
    icon: Package,
    route: '/(tabs)/warehouse-dashboard',
    requiresRole: [UserRole.WAREHOUSE_KEEPER, UserRole.WAREHOUSE_MANAGER],
    color: '#8b5cf6',
    order: 1,
  },
  
  accountantDashboard: {
    id: 'accountant',
    name: 'Accounting',
    nameAr: 'المحاسبة',
    icon: Calculator,
    route: '/(tabs)/admin-dashboard', // سيتم إنشاء accountant-dashboard لاحقاً
    requiresRole: [UserRole.ACCOUNTANT],
    order: 1,
  },
  
  salesDashboard: {
    id: 'sales',
    name: 'Sales',
    nameAr: 'المبيعات',
    icon: TrendingUp,
    route: '/(tabs)/admin-dashboard', // سيتم إنشاء sales-dashboard لاحقاً
    requiresRole: [UserRole.SALES_REP, UserRole.SALES],
    order: 1,
  },
  
  purchasingDashboard: {
    id: 'purchasing',
    name: 'Purchasing',
    nameAr: 'المشتريات',
    icon: ShoppingCart,
    route: '/(tabs)/admin-dashboard', // سيتم إنشاء purchasing-dashboard لاحقاً
    requiresRole: [UserRole.PURCHASING_MANAGER],
    order: 1,
  },
  
  hrDashboard: {
    id: 'hr',
    name: 'HR',
    nameAr: 'الموارد البشرية',
    icon: Users,
    route: '/(tabs)/admin-dashboard', // سيتم إنشاء hr-dashboard لاحقاً
    requiresRole: [UserRole.HR_MANAGER],
    order: 1,
  },
  
  // الإجراءات السريعة
  quickActions: {
    id: 'actions',
    name: 'Actions',
    nameAr: 'إجراءات',
    icon: Zap,
    route: '/(tabs)/quick-actions',
    order: 2,
  },
  
  // الإشعارات
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    nameAr: 'الإشعارات',
    icon: Bell,
    route: '/(tabs)/notifications',
    badge: 0, // سيتم تحديثه ديناميكياً
    order: 3,
  },
  
  // الملف الشخصي
  profile: {
    id: 'profile',
    name: 'Profile',
    nameAr: 'حسابي',
    icon: User,
    route: '/(tabs)/profile',
    order: 4,
  },
  
  // الإعدادات (دائماً ظاهر)
  settings: {
    id: 'settings',
    name: 'Settings',
    nameAr: 'الإعدادات',
    icon: Settings,
    route: '/(tabs)/settings',
    order: 5,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Navigation Configs by Role - إعدادات التنقل حسب الدور
// ═══════════════════════════════════════════════════════════════════════════

export const NAVIGATION_CONFIGS: Record<UserRole, NavigationConfig> = {
  // Admin & Full Admin
  [UserRole.FULL_ADMIN]: {
    tabs: [
      ALL_TABS.adminDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  [UserRole.ADMIN]: {
    tabs: [
      ALL_TABS.adminDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Cashier
  [UserRole.CASHIER]: {
    tabs: [
      ALL_TABS.cashierDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Driver
  [UserRole.DRIVER]: {
    tabs: [
      ALL_TABS.driverDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Warehouse
  [UserRole.WAREHOUSE_KEEPER]: {
    tabs: [
      ALL_TABS.warehouseDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  [UserRole.WAREHOUSE_MANAGER]: {
    tabs: [
      ALL_TABS.warehouseDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Accountant
  [UserRole.ACCOUNTANT]: {
    tabs: [
      ALL_TABS.accountantDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Sales
  [UserRole.SALES_REP]: {
    tabs: [
      ALL_TABS.salesDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  [UserRole.SALES]: {
    tabs: [
      ALL_TABS.salesDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // Purchasing
  [UserRole.PURCHASING_MANAGER]: {
    tabs: [
      ALL_TABS.purchasingDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
  
  // HR
  [UserRole.HR_MANAGER]: {
    tabs: [
      ALL_TABS.hrDashboard,
      ALL_TABS.quickActions,
      ALL_TABS.notifications,
      ALL_TABS.profile,
      ALL_TABS.settings,
    ],
    maxVisible: 5,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions - دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════

/**
 * احصل على إعدادات التنقل حسب الدور
 */
export const getNavigationConfig = (role: UserRole): NavigationConfig => {
  return NAVIGATION_CONFIGS[role] || NAVIGATION_CONFIGS[UserRole.FULL_ADMIN];
};

/**
 * تصفية التابات حسب الصلاحيات
 */
export const filterTabsByPermissions = (
  tabs: NavigationTab[],
  userRole: UserRole
): NavigationTab[] => {
  return tabs.filter(tab => {
    // إذا لم يكن هناك قيد على الدور، أظهر التاب
    if (!tab.requiresRole || tab.requiresRole.length === 0) {
      return true;
    }
    
    // تحقق من أن دور المستخدم موجود في القائمة
    return tab.requiresRole.includes(userRole);
  });
};

/**
 * رتب التابات حسب الترتيب المحدد
 */
export const sortTabsByOrder = (tabs: NavigationTab[]): NavigationTab[] => {
  return [...tabs].sort((a, b) => a.order - b.order);
};

/**
 * احصل على التابات المرئية (محدودة بالعدد الأقصى)
 */
export const getVisibleTabs = (
  tabs: NavigationTab[],
  maxVisible: number
): NavigationTab[] => {
  const sorted = sortTabsByOrder(tabs);
  return sorted.slice(0, maxVisible);
};

/**
 * احصل على جميع التابات للدور المحدد
 */
export const getTabsForRole = (role: UserRole): NavigationTab[] => {
  const config = getNavigationConfig(role);
  const filtered = filterTabsByPermissions(config.tabs, role);
  return getVisibleTabs(filtered, config.maxVisible);
};

// ═══════════════════════════════════════════════════════════════════════════
// Export - تصدير
// ═══════════════════════════════════════════════════════════════════════════

export default {
  ALL_TABS,
  NAVIGATION_CONFIGS,
  getNavigationConfig,
  filterTabsByPermissions,
  sortTabsByOrder,
  getVisibleTabs,
  getTabsForRole,
};

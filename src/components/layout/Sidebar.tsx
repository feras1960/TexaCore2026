import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { STATIC_MODULES } from '@/config/modules';
import Logo from '@/components/common/Logo';
import {
  Package,
  Lock,
  TrendingUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { t, direction, language } = useLanguage();
  const { isSuperAdmin } = useAuth();

  // 🛡️ RBAC: استخدام نظام الصلاحيات للتحكم بالموديولات
  const {
    visibleModules: roleVisibleModules,
    canSeeModule,
    isPlatformAdmin,
    loading: rbacLoading
  } = useRBAC();

  // 🛡️ SECURITY: فلترة الموديولات حسب الصلاحيات والأدوار
  // 🖥️ LOCAL/SELF-HOSTED: عرض الموديولات الأساسية فقط (حسب الترخيص)
  // 🖥️ LOCAL/SELF-HOSTED detection: localhost OR cloud-tunneled self-hosted subdomain
  const isSelfHosted = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.texacore.ai')  // Cloud tunnel = self-hosted
  );
  
  // الموديولات المسموحة في الوضع المحلي/التجريبي — كل الموديولات متاحة للمالك المحلي
  const SELF_HOSTED_ALLOWED = [
    'dashboard', 'accounting', 'inventory', 'sales', 'purchases', 'crm',
    'pos', 'system_config', 'workflow_center', 'activity_log',
    'fabric', 'exchange', 'hr', 'e-commerce', 'ai_analytics',
    'inspiration_studio', 'pharmacy', 'healthcare', 'manufacturing',
    'website', 'restaurant', 'gold', 'real_estate', 'doctors', 'component_lab'
  ];

  const filteredModules = STATIC_MODULES.filter(module => {
    // 🖥️ LOCAL/SELF-HOSTED: لا ننتظر RBAC — نعرض كل الموديولات المسموحة مباشرة
    if (isSelfHosted) {
      if (module.requires_super_admin && !isSuperAdmin) {
        return false;
      }
      // 🌐 Hybrid (subdomain): hide SaaS module — it's for cloud platform only
      const isSubdomain = typeof window !== 'undefined' && window.location.hostname.endsWith('.texacore.ai');
      if (isSubdomain && module.code === 'saas') {
        return false;
      }
      return SELF_HOSTED_ALLOWED.includes(module.code) || module.code === 'dashboard' || module.code === 'saas';
    }

    // ═══ CLOUD MODE: RBAC filtering ═══
    // أثناء التحميل: dashboard فقط (حماية)
    if (rbacLoading) {
      return module.code === 'dashboard';
    }

    // 1. إذا كان الموديول يتطلب Super Admin (مدير المنصة)، نتحقق من الصلاحية
    if (module.requires_super_admin && !isSuperAdmin && !isPlatformAdmin()) {
      return false;
    }

    // 2. إذا كان المستخدم super_admin أو isSuperAdmin، يرى كل شيء
    if (isSuperAdmin || isPlatformAdmin()) {
      return true;
    }

    // 3. التحقق من visible_modules للدور (من قاعدة البيانات)
    // إذا كانت القائمة تحتوي على 'all'، يرى كل شيء
    if (roleVisibleModules.includes('all')) {
      return true;
    }

    // 4. التحقق من أن الموديول موجود في قائمة الموديولات المسموح بها للدور
    if (roleVisibleModules.length > 0 && !canSeeModule(module.code)) {
      return false;
    }

    return true;
  });

  return (
    <TooltipProvider delayDuration={100}>
      <motion.aside
        className={cn(
          "w-20 lg:w-64 shrink-0 bg-white dark:bg-gray-900 h-full overflow-y-auto py-6 px-3 lg:px-4 hidden md:flex flex-col",
          direction === 'rtl' ? "border-l border-gray-200 dark:border-gray-800" : "border-r border-gray-200 dark:border-gray-800",
          className
        )}
        initial={{ opacity: 0, x: direction === 'rtl' ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <div className="mb-6 flex justify-center px-2">
          <Logo size="lg" showText={true} />
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {filteredModules.map((module) => {
            const isActive = module.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(module.path);

            const Icon = module.icon || Package;

            // اسم الموديول حسب اللغة
            const moduleName = (() => {
              switch (language) {
                case 'ar': return module.name_ar;
                case 'ru': return module.name_ru || module.name_en;
                case 'uk': return module.name_uk || module.name_en;
                default: return module.name_en;
              }
            })();

            // إذا كان الموديول غير مفعل، عرض زر Upgrade
            if (!module.is_enabled) {
              return (
                <Tooltip key={module.code}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-tajawal font-medium text-sm cursor-not-allowed opacity-50 relative group",
                        "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 text-gray-300 dark:text-gray-700" />
                      <span className="hidden lg:block truncate">{moduleName}</span>
                      <Lock className="w-3.5 h-3.5 ms-auto flex-shrink-0 text-gray-300 dark:text-gray-700" />

                      {/* Upgrade Badge */}
                      <div className="absolute inset-0 bg-gradient-to-r from-erp-teal/5 to-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={direction === 'rtl' ? 'left' : 'right'}>
                    <div className="text-center max-w-xs">
                      <p className="font-semibold mb-1">{moduleName}</p>
                      <p className="text-xs text-gray-400 mb-2">
                        {module.requires_upgrade
                          ? t('sidebar.upgradeRequired')
                          : t('sidebar.moduleDisabled')}
                      </p>
                      {module.requires_upgrade && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {t('sidebar.upgrade')}
                        </Badge>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            // الموديول مفعل - عرض عادي
            return (
              <Tooltip key={module.code}>
                <TooltipTrigger asChild>
                  <Link
                    to={module.path}
                    data-tour={`nav-${
                      module.code === 'inventory' ? 'warehouse' :
                      module.code === 'system_config' ? 'settings' :
                      module.code === 'ai_analytics' ? 'ai' :
                      module.code === 'crm' ? 'customers' :
                      module.code
                    }`}
                    onClick={(e) => {
                      // Ensure navigation happens immediately
                      e.stopPropagation();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-tajawal font-medium text-sm group",
                      isActive
                        ? "bg-erp-navy dark:bg-gray-800 text-white shadow-md"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-erp-navy dark:hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors",
                      isActive ? "text-erp-teal" : "text-gray-400 dark:text-gray-500 group-hover:text-erp-teal"
                    )} />
                    <span className="hidden lg:block truncate">{moduleName}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side={direction === 'rtl' ? 'left' : 'right'} className="lg:hidden">
                  {moduleName}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Help Section */}
        <div className="mt-auto pt-4 px-1 hidden lg:block">
          <div className="bg-gradient-to-br from-erp-navy/5 to-erp-teal/5 dark:from-white/5 dark:to-erp-teal/10 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-tajawal mb-3">
              {t('sidebar.needHelp')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-erp-navy dark:border-gray-600 text-erp-navy dark:text-gray-200 hover:bg-erp-navy dark:hover:bg-gray-700 hover:text-white font-tajawal text-xs"
            >
              {t('sidebar.contactSupport')}
            </Button>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}


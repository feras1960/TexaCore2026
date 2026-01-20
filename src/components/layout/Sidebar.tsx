import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/providers/LanguageProvider';
import Logo from '@/components/common/Logo';
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
  History
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
  const { t, direction } = useLanguage();

  const modules = [
    { nameKey: 'navigation.dashboard', path: '/', icon: LayoutDashboard },
    { nameKey: 'navigation.accounting', path: '/accounting', icon: Calculator },
    { nameKey: 'navigation.inventory', path: '/inventory', icon: Package },
    { nameKey: 'navigation.sales', path: '/sales', icon: ShoppingCart },
    { nameKey: 'navigation.purchases', path: '/purchases', icon: ShoppingBag },
    { nameKey: 'navigation.crm', path: '/crm', icon: Users },
    { nameKey: 'navigation.realEstate', path: '/real-estate', icon: Building2 },
    { nameKey: 'navigation.pos', path: '/pos', icon: ScanBarcode },
    { nameKey: 'navigation.exchange', path: '/exchange', icon: ArrowRightLeft },
    { nameKey: 'navigation.manufacturing', path: '/manufacturing', icon: Factory },
    { nameKey: 'navigation.hr', path: '/hr', icon: UserCog },
    { nameKey: 'navigation.ecommerce', path: '/ecommerce', icon: Globe },
    { nameKey: 'navigation.saasControl', path: '/saas', icon: Crown },
    { nameKey: 'navigation.aiAnalytics', path: '/ai-analytics', icon: Brain },
    { nameKey: 'navigation.activityLog', path: '/activity-log', icon: History },
    { nameKey: 'navigation.systemConfig', path: '/system-config', icon: Settings },
    { nameKey: 'navigation.componentLab', path: '/component-lab', icon: Beaker },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <aside className={cn(
        "w-20 lg:w-64 shrink-0 bg-white dark:bg-gray-900 h-full overflow-y-auto py-6 px-3 lg:px-4 hidden md:flex flex-col", 
        direction === 'rtl' ? "border-l border-gray-200 dark:border-gray-800" : "border-r border-gray-200 dark:border-gray-800",
        className
      )}>
        {/* Logo */}
        <div className="mb-6 flex justify-center px-2">
          <Logo size="lg" showText={true} />
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {modules.map((module) => {
            const isActive = module.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(module.path);
            
            const moduleName = t(module.nameKey);
            
            return (
              <Tooltip key={module.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={module.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-tajawal font-medium text-sm group",
                      isActive 
                        ? "bg-erp-navy dark:bg-gray-800 text-white shadow-md" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-erp-navy dark:hover:text-white"
                    )}
                  >
                    <module.icon className={cn(
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
      </aside>
    </TooltipProvider>
  );
}

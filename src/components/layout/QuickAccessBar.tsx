/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ Quick Access Bar — Top Module Shortcuts
 * ════════════════════════════════════════════════════════════════
 *
 * Horizontal icon bar at the top of the main content area,
 * providing instant one-click navigation to core ERP modules.
 * Inspired by the legacy ERP system's top shortcut strip.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Calculator,
  Package,
  ShoppingCart,
  ShoppingBag,
  Layers,
  FileText,
  Receipt,
  Settings,
  LayoutDashboard,
  Repeat,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickLink {
  id: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  labelAr: string;
  labelEn: string;
  /** Color for the active/hover indicator */
  color: string;
  /** Background tint for active state */
  bgColor: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    labelAr: 'لوحة التحكم',
    labelEn: 'Dashboard',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  {
    id: 'accounting',
    path: '/accounting',
    icon: Calculator,
    labelAr: 'المحاسبة',
    labelEn: 'Accounting',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    id: 'journal',
    path: '/accounting/journal-entries',
    icon: FileText,
    labelAr: 'القيود',
    labelEn: 'Journal',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    id: 'funds',
    path: '/accounting/funds',
    icon: Wallet,
    labelAr: 'الصناديق',
    labelEn: 'Funds',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
  },
  {
    id: 'warehouse',
    path: '/warehouse',
    icon: Package,
    labelAr: 'المستودعات',
    labelEn: 'Warehouse',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    id: 'materials',
    path: '/warehouse/materials',
    icon: Layers,
    labelAr: 'المواد',
    labelEn: 'Materials',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
  },
  {
    id: 'sales',
    path: '/sales',
    icon: ShoppingCart,
    labelAr: 'المبيعات',
    labelEn: 'Sales',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    id: 'purchases',
    path: '/purchases',
    icon: ShoppingBag,
    labelAr: 'المشتريات',
    labelEn: 'Purchases',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
  },
  {
    id: 'invoices',
    path: '/sales/cycle',
    icon: Receipt,
    labelAr: 'الفواتير',
    labelEn: 'Invoices',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/40',
  },
  {
    id: 'transfers',
    path: '/warehouse/transfers',
    icon: Repeat,
    labelAr: 'المناقلات',
    labelEn: 'Transfers',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
  },
  {
    id: 'settings',
    path: '/system-config',
    icon: Settings,
    labelAr: 'الإعدادات',
    labelEn: 'Settings',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
];

export function QuickAccessBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';

  const isActive = useCallback(
    (link: QuickLink) => {
      if (link.path === '/') return pathname === '/';
      return pathname.startsWith(link.path);
    },
    [pathname]
  );

  const handleClick = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-none',
          'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
          'border-b border-gray-100 dark:border-gray-800/60',
        )}
        dir={direction}
      >
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link);
          const label = isAr ? link.labelAr : link.labelEn;

          return (
            <Tooltip key={link.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(link.path)}
                  className={cn(
                    'group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap',
                    'text-xs font-medium font-tajawal',
                    active
                      ? cn(link.bgColor, link.color, 'shadow-sm')
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-200',
                      active ? link.color : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    )}
                  />
                  <span className="hidden md:inline">{label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Search, Moon, Sun, Globe, Keyboard, ShoppingCart, Calculator, Bot, Users, FileText, Wallet, Layers, ShoppingBag } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatShortcut, formatShortcutRange, useLanguageShortcuts } from '@/hooks/useLanguageShortcuts';
import { cn } from '@/lib/utils';
import { SupportedLanguage, getLanguageConfig } from '@/i18n/config';
import { useCart } from '@/contexts/CartContext';
import { useNexaContext } from '@/providers/NexaContextProvider';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage, direction, supportedLanguages } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Listen for global open-command-palette event
  useEffect(() => {
    const handler = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  // Enable keyboard shortcuts for language switching
  useLanguageShortcuts({ menuTriggerId: 'language-menu-trigger' });

  // Get current language config for display
  const currentLangConfig = getLanguageConfig(language);
  const { computed, actions: cartActions } = useCart();
  const nexaCtx = useNexaContext();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.header
        className={cn(
          "h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 flex items-center justify-between gap-4",
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search — Compact Icon + Cmd+K */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className={cn(
                  "flex items-center gap-2.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 transition-all duration-200 cursor-pointer",
                  "hover:border-erp-teal hover:bg-white dark:hover:bg-gray-750 hover:shadow-sm group"
                )}
              >
                <Search className="h-4 w-4 text-gray-400 group-hover:text-erp-teal transition-colors" />
                <span className="hidden sm:block text-sm text-gray-400 dark:text-gray-500 font-tajawal">
                  {direction === 'rtl' ? 'بحث...' : 'Search...'}
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 ms-2">
                  {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+K
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>{direction === 'rtl' ? 'بحث شامل' : 'Global Search'}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 rounded">
                  {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+K
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Command Palette Modal */}
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        {/* ⚡ Quick Module Shortcuts — Center Icons */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'materials', path: '/warehouse/materials', icon: Layers, labelKey: 'header.shortcuts.materials', color: 'text-orange-500' },
            { id: 'sales', path: '/sales/cycle', icon: ShoppingCart, labelKey: 'header.shortcuts.sales', color: 'text-emerald-500' },
            { id: 'purchases', path: '/purchases/cycle', icon: ShoppingBag, labelKey: 'header.shortcuts.purchases', color: 'text-purple-500' },
            { id: 'funds', path: '/accounting/funds', icon: Wallet, labelKey: 'header.shortcuts.funds', color: 'text-cyan-500' },
            { id: 'journal', path: '/accounting/journal-entries', icon: FileText, labelKey: 'header.shortcuts.journal', color: 'text-blue-500' },
            { id: 'customers', path: '/sales/customers', icon: Users, labelKey: 'header.shortcuts.customers', color: 'text-teal-500' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg transition-all duration-200 group min-w-[52px]',
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 transition-colors', isActive ? item.color : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300')} />
                    <span className={cn(
                      'text-[10px] font-tajawal leading-tight transition-colors',
                      isActive ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                    )}>
                      {t(item.labelKey)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t(item.labelKey)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* 💱 Currency Calculator Quick Access */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'e', ctrlKey: true, bubbles: true 
                  }));
                }}
              >
                <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex items-center gap-2">
                <span>{direction === 'rtl' ? 'حاسبة العملات' : 'Currency Calculator'}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 rounded">
                  {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+E
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* 🤖 NexaPro AI Assistant */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 relative", nexaCtx.isOpen && 'bg-indigo-50 dark:bg-indigo-950')}
                onClick={nexaCtx.toggleCopilot}
              >
                <Bot className="h-5 w-5 text-indigo-500" />
                {nexaCtx.hasNewInsight && (
                  <span className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {direction === 'rtl' ? 'وكيل نيكسا AI' : 'NexaPro AI'}
            </TooltipContent>
          </Tooltip>

          {/* Language Switcher with Short Code Badge */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="language-menu-trigger"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 relative"
                  >
                    <Globe className="h-5 w-5 text-gray-500" />
                    {/* Language Short Code Badge */}
                    <span className="absolute -bottom-0.5 -end-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold bg-erp-teal text-white px-1 rounded-full shadow-sm">
                      {currentLangConfig?.shortCode || language.toUpperCase()}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex items-center gap-2">
                  <span>{t('header.language')}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 rounded">
                    {formatShortcut('Alt+L')}
                  </kbd>
                </div>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{t('header.language')}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3" />
                  {formatShortcutRange('alt', '1-9')}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {supportedLanguages.map((lang, index) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as SupportedLanguage)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    language === lang.code && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {lang.shortCode}
                    </span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 rounded">
                      {formatShortcut(`Alt+${index + 1}`)}
                    </kbd>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-5 w-5 text-gray-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {resolvedTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            </TooltipContent>
          </Tooltip>

          {/* Cart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 relative"
                onClick={cartActions.openDrawer}
              >
                <ShoppingCart className="h-5 w-5 text-gray-500" />
                {computed.total_items > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 h-5 w-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {computed.total_items > 9 ? '9+' : computed.total_items}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('header.cart')}
            </TooltipContent>
          </Tooltip>

          {/* Notifications — Live Notification Center */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-10 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-erp-navy text-white text-sm">
                    {(user?.user_metadata?.full_name || user?.user_metadata?.name || t('auth.userInitial'))?.charAt?.(0)?.toUpperCase() || t('auth.userInitial')}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || t('auth.systemAdmin')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-48">
              <DropdownMenuLabel>
                {t('auth.welcome')}
                {user?.user_metadata?.full_name && (
                  <div className="text-xs text-muted-foreground font-normal mt-1">
                    {user.user_metadata.full_name}
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                {t('auth.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/preferences')} className="cursor-pointer">
                {t('navigation.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-erp-error cursor-pointer"
                onClick={handleLogout}
              >
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>
    </TooltipProvider>
  );
}

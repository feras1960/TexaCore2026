import React from 'react';
import { Bell, Search, Moon, Sun, Globe, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useLanguageShortcuts } from '@/hooks/useLanguageShortcuts';
import { cn } from '@/lib/utils';
import { SupportedLanguage, getLanguageConfig } from '@/i18n/config';

export function Header() {
  const navigate = useNavigate();
  const { t, language, setLanguage, direction, supportedLanguages } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // Enable keyboard shortcuts for language switching
  useLanguageShortcuts({ menuTriggerId: 'language-menu-trigger' });
  
  // Get current language config for display
  const currentLangConfig = getLanguageConfig(language);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <TooltipProvider delayDuration={300}>
      <header className={cn(
        "h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 flex items-center justify-between gap-4",
      )}>
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400",
              direction === 'rtl' ? "right-3" : "left-3"
            )} />
            <Input
              type="search"
              placeholder={t('header.search')}
              className={cn(
                "h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                direction === 'rtl' ? "pr-10" : "pl-10"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 rounded">Alt+L</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{t('header.language')}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3" />
                  Alt+1-9
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
                      Alt+{index + 1}
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

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                <Bell className="h-5 w-5 text-gray-500" />
                <span className="absolute top-2 end-2 h-2 w-2 bg-erp-error rounded-full" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('header.notifications')}
            </TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-10 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.png" />
                  <AvatarFallback className="bg-erp-navy text-white text-sm">
                    {t('auth.userInitial')}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('auth.systemAdmin')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-48">
              <DropdownMenuLabel>
                {t('auth.welcome')}
                {user?.email && (
                  <div className="text-xs text-muted-foreground font-normal mt-1">
                    {user.email}
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t('auth.profile')}</DropdownMenuItem>
              <DropdownMenuItem>{t('navigation.settings')}</DropdownMenuItem>
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
      </header>
    </TooltipProvider>
  );
}

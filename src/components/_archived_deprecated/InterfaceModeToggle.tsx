/**
 * Interface Mode Toggle Component
 * مكون تبديل وضع الواجهة
 */

import { useLanguage } from '@/app/providers/LanguageProvider';
import { useInterfaceMode, type InterfaceMode } from '@/app/providers/InterfaceModeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { 
  Layers, 
  Sparkles, 
  Zap,
  ChevronDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterfaceModeToggleProps {
  variant?: 'button' | 'switch' | 'dropdown';
  showLabel?: boolean;
  className?: string;
}

export function InterfaceModeToggle({
  variant = 'dropdown',
  showLabel = true,
  className,
}: InterfaceModeToggleProps) {
  const { t, direction } = useLanguage();
  const { mode, setMode, toggleMode, isProfessional } = useInterfaceMode();

  // Switch variant
  if (variant === 'switch') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2">
          <Zap className={cn("w-4 h-4", !isProfessional && "text-primary")} />
          <span className={cn("text-sm", !isProfessional && "font-medium")}>
            {t('interfaceMode.lite')}
          </span>
        </div>
        
        <Switch
          checked={isProfessional}
          onCheckedChange={(checked) => setMode(checked ? 'professional' : 'lite')}
        />
        
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", isProfessional && "font-medium")}>
            {t('interfaceMode.professional')}
          </span>
          <Sparkles className={cn("w-4 h-4", isProfessional && "text-primary")} />
        </div>
      </div>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMode}
        className={cn("gap-2", className)}
      >
        {isProfessional ? (
          <>
            <Sparkles className="w-4 h-4" />
            {showLabel && t('interfaceMode.professional')}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            {showLabel && t('interfaceMode.lite')}
          </>
        )}
      </Button>
    );
  }

  // Dropdown variant (default)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Layers className="w-4 h-4" />
          {showLabel && (
            <span>
              {isProfessional ? t('interfaceMode.professional') : t('interfaceMode.lite')}
            </span>
          )}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-64" 
        align={direction === 'rtl' ? 'start' : 'end'}
      >
        <DropdownMenuLabel>
          {t('interfaceMode.title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as InterfaceMode)}>
          {/* Lite Mode */}
          <DropdownMenuRadioItem value="lite" className="flex-col items-start py-3">
            <div className="flex items-center gap-2 w-full">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="font-medium">
                {t('interfaceMode.lite')}
              </span>
              {mode === 'lite' && <Check className="w-4 h-4 ms-auto" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1 ps-6">
              {t('interfaceMode.liteDescription')}
            </p>
          </DropdownMenuRadioItem>

          {/* Professional Mode */}
          <DropdownMenuRadioItem value="professional" className="flex-col items-start py-3">
            <div className="flex items-center gap-2 w-full">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-medium">
                {t('interfaceMode.professional')}
              </span>
              {mode === 'professional' && <Check className="w-4 h-4 ms-auto" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1 ps-6">
              {t('interfaceMode.professionalDescription')}
            </p>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default InterfaceModeToggle;

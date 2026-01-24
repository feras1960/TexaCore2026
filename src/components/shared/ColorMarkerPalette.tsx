/**
 * ColorMarkerPalette - قائمة ألوان الماركر للتعليم
 * يستخدم لمطابقة الدفاتر المحاسبية بصرياً
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { X } from 'lucide-react';

// تعريف الألوان المتاحة
export const MARKER_COLORS = [
  { id: 'blue', color: '#3B82F6', bgLight: 'rgba(59, 130, 246, 0.15)', name_ar: 'أزرق', name_en: 'Blue' },
  { id: 'purple', color: '#8B5CF6', bgLight: 'rgba(139, 92, 246, 0.15)', name_ar: 'بنفسجي', name_en: 'Purple' },
  { id: 'pink', color: '#EC4899', bgLight: 'rgba(236, 72, 153, 0.15)', name_ar: 'وردي', name_en: 'Pink' },
  { id: 'gray', color: '#6B7280', bgLight: 'rgba(107, 114, 128, 0.15)', name_ar: 'رمادي', name_en: 'Gray' },
  { id: 'teal', color: '#14B8A6', bgLight: 'rgba(20, 184, 166, 0.15)', name_ar: 'تركواز', name_en: 'Teal' },
  { id: 'cyan', color: '#06B6D4', bgLight: 'rgba(6, 182, 212, 0.15)', name_ar: 'سماوي', name_en: 'Cyan' },
  { id: 'yellow', color: '#EAB308', bgLight: 'rgba(234, 179, 8, 0.15)', name_ar: 'أصفر', name_en: 'Yellow' },
  { id: 'orange', color: '#F97316', bgLight: 'rgba(249, 115, 22, 0.15)', name_ar: 'برتقالي', name_en: 'Orange' },
  { id: 'green', color: '#22C55E', bgLight: 'rgba(34, 197, 94, 0.15)', name_ar: 'أخضر', name_en: 'Green' },
] as const;

export type MarkerColorId = typeof MARKER_COLORS[number]['id'] | null;

export interface ColorMarkerPaletteProps {
  selectedColor: MarkerColorId;
  onColorSelect: (color: MarkerColorId) => void;
  size?: 'sm' | 'md' | 'lg';
  showClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ColorMarkerPalette({
  selectedColor,
  onColorSelect,
  size = 'md',
  showClear = true,
  disabled = false,
  className,
}: ColorMarkerPaletteProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {MARKER_COLORS.map((marker) => (
        <TooltipProvider key={marker.id} delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onColorSelect(marker.id)}
                className={cn(
                  'rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-1',
                  sizeClasses[size],
                  disabled && 'opacity-50 cursor-not-allowed',
                  !disabled && 'hover:scale-110 hover:shadow-md cursor-pointer',
                  selectedColor === marker.id && 'ring-2 ring-offset-2 ring-gray-500 dark:ring-gray-400 scale-110'
                )}
                style={{ backgroundColor: marker.color }}
                aria-label={isArabic ? marker.name_ar : marker.name_en}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isArabic ? marker.name_ar : marker.name_en}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      {/* زر إزالة التعليم */}
      {showClear && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onColorSelect(null)}
                className={cn(
                  'rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all focus:outline-none',
                  sizeClasses[size],
                  disabled && 'opacity-50 cursor-not-allowed',
                  !disabled && 'hover:scale-110 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer',
                  selectedColor === null && 'ring-2 ring-offset-2 ring-gray-400 scale-110 bg-gray-100 dark:bg-gray-800'
                )}
                aria-label={isArabic ? 'بدون تعليم' : 'No marker'}
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isArabic ? 'بدون تعليم' : 'Clear marker'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// دالة مساعدة للحصول على لون الخلفية
export function getMarkerBackgroundColor(colorId: MarkerColorId): string | undefined {
  if (!colorId) return undefined;
  const marker = MARKER_COLORS.find(m => m.id === colorId);
  return marker?.bgLight;
}

// دالة مساعدة للحصول على اللون الأساسي
export function getMarkerColor(colorId: MarkerColorId): string | undefined {
  if (!colorId) return undefined;
  const marker = MARKER_COLORS.find(m => m.id === colorId);
  return marker?.color;
}

export default ColorMarkerPalette;

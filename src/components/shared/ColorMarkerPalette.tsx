/**
 * ColorMarkerPalette - قائمة ألوان الماركر للتعليم
 * يستخدم لمطابقة الدفاتر المحاسبية بصرياً
 * 
 * معاني الألوان ثابتة على مستوى النظام:
 * 🟢 أخضر = مطابق/تم التحقق
 * 🔵 أزرق = قيد المراجعة
 * 🟣 بنفسجي = مكتمل/منتهي
 * 🟠 برتقالي = يحتاج إعادة مطابقة
 * 🟡 أصفر = ملاحظة هامة/انتباه
 * 💗 وردي = غير مطابق/خطأ
 * ⚪ رمادي = ملغي/غير فعال
 * 🩵 تركواز = مؤجل/معلق
 * 🔷 سماوي = حالة خاصة
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X, HelpCircle } from 'lucide-react';

// تعريف الألوان المتاحة مع معانيها الثابتة
export const MARKER_COLORS = [
  {
    id: 'green',
    color: '#22C55E',
    bgLight: 'rgba(34, 197, 94, 0.15)',
    name_ar: 'أخضر',
    name_en: 'Green',
    meaning_ar: 'مطابق / تم التحقق',
    meaning_en: 'Matched / Verified',
    is_reconciled: true
  },
  {
    id: 'blue',
    color: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.15)',
    name_ar: 'أزرق',
    name_en: 'Blue',
    meaning_ar: 'قيد المراجعة',
    meaning_en: 'Under Review',
    is_reconciled: false
  },
  {
    id: 'purple',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.15)',
    name_ar: 'بنفسجي',
    name_en: 'Purple',
    meaning_ar: 'مكتمل / منتهي',
    meaning_en: 'Completed / Finished',
    is_reconciled: true
  },
  {
    id: 'orange',
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.15)',
    name_ar: 'برتقالي',
    name_en: 'Orange',
    meaning_ar: 'يحتاج إعادة مطابقة',
    meaning_en: 'Needs Re-matching',
    is_reconciled: false
  },
  {
    id: 'yellow',
    color: '#EAB308',
    bgLight: 'rgba(234, 179, 8, 0.15)',
    name_ar: 'أصفر',
    name_en: 'Yellow',
    meaning_ar: 'ملاحظة هامة / انتباه',
    meaning_en: 'Important Note / Attention',
    is_reconciled: false
  },
  {
    id: 'red',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.15)',
    name_ar: 'أحمر',
    name_en: 'Red',
    meaning_ar: 'يوجد خطأ / تحتاج مطابقة',
    meaning_en: 'Error / Needs Matching',
    is_reconciled: false
  },
  {
    id: 'gray',
    color: '#6B7280',
    bgLight: 'rgba(107, 114, 128, 0.15)',
    name_ar: 'رمادي',
    name_en: 'Gray',
    meaning_ar: 'ملغي / غير فعال',
    meaning_en: 'Cancelled / Inactive',
    is_reconciled: false
  },
  {
    id: 'teal',
    color: '#14B8A6',
    bgLight: 'rgba(20, 184, 166, 0.15)',
    name_ar: 'تركواز',
    name_en: 'Teal',
    meaning_ar: 'مؤجل / معلق',
    meaning_en: 'Postponed / Pending',
    is_reconciled: false
  },
  {
    id: 'cyan',
    color: '#06B6D4',
    bgLight: 'rgba(6, 182, 212, 0.15)',
    name_ar: 'سماوي',
    name_en: 'Cyan',
    meaning_ar: 'حالة خاصة',
    meaning_en: 'Special Case',
    is_reconciled: false
  },
] as const;

export type MarkerColorId = typeof MARKER_COLORS[number]['id'] | null;

export interface ColorMarkerPaletteProps {
  selectedColor: MarkerColorId;
  onColorSelect: (color: MarkerColorId) => void;
  size?: 'sm' | 'md' | 'lg';
  showClear?: boolean;
  showHelp?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ColorMarkerPalette({
  selectedColor,
  onColorSelect,
  size = 'md',
  showClear = true,
  showHelp = true,
  disabled = false,
  className,
}: ColorMarkerPaletteProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [helpOpen, setHelpOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* أيقونة المساعدة - شرح معاني الألوان */}
      {showHelp && (
        <Popover open={helpOpen} onOpenChange={setHelpOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none',
                sizeClasses[size]
              )}
              aria-label={isArabic ? 'شرح ألوان التعليم' : 'Marker colors guide'}
            >
              <HelpCircle className="w-full h-full" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-3"
            side={isArabic ? 'left' : 'right'}
            align="start"
          >
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-3">
                {isArabic ? '🎨 دليل ألوان التعليم' : '🎨 Marker Colors Guide'}
              </h4>
              <div className="space-y-1.5">
                {MARKER_COLORS.map((marker) => (
                  <div
                    key={marker.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: marker.color }}
                    />
                    <span className="font-medium min-w-[50px]">
                      {isArabic ? marker.name_ar : marker.name_en}:
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {isArabic ? marker.meaning_ar : marker.meaning_en}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 mt-2 border-t text-xs text-gray-500">
                {isArabic
                  ? '💡 اختر الأسطر ثم اختر اللون لتعليمها'
                  : '💡 Select rows then pick a color to mark them'
                }
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* الألوان */}
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
                aria-label={isArabic ? marker.meaning_ar : marker.meaning_en}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="text-center">
                <div className="font-medium">{isArabic ? marker.name_ar : marker.name_en}</div>
                <div className="text-gray-400 text-[10px]">
                  {isArabic ? marker.meaning_ar : marker.meaning_en}
                </div>
              </div>
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
                aria-label={isArabic ? 'إزالة التعليم' : 'Clear marker'}
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isArabic ? 'إزالة التعليم' : 'Clear marker'}
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

// دالة مساعدة للحصول على معنى اللون
export function getMarkerMeaning(colorId: MarkerColorId, language: 'ar' | 'en' = 'ar'): string | undefined {
  if (!colorId) return undefined;
  const marker = MARKER_COLORS.find(m => m.id === colorId);
  return language === 'ar' ? marker?.meaning_ar : marker?.meaning_en;
}

// دالة للتحقق إذا اللون يعني "مطابق"
export function isMarkerReconciled(colorId: MarkerColorId): boolean {
  if (!colorId) return false;
  const marker = MARKER_COLORS.find(m => m.id === colorId);
  return marker?.is_reconciled ?? false;
}

// الألوان التي تعني "مطابق" للتقارير
export const RECONCILED_COLORS = MARKER_COLORS.filter(m => m.is_reconciled).map(m => m.id);

// الألوان التي تعني "غير مطابق" للتقارير
export const UNRECONCILED_COLORS = MARKER_COLORS.filter(m => !m.is_reconciled).map(m => m.id);

export default ColorMarkerPalette;

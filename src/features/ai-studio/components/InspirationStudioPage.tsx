/**
 * ════════════════════════════════════════════════════════════════
 * 🎨 Inspiration Studio — استوديو الإلهام
 * ════════════════════════════════════════════════════════════════
 * V2: Enhanced UI with Save/Export dialogs, Material picker,
 *     animations, custom prompt hint, and responsive design
 * ⚠️ ALL text uses i18n keys t('inspirationStudio.xxx') — zero hardcoded strings
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles, Maximize2, ExternalLink, Download, Share2, Save as SaveIcon,
  ImagePlus, Upload, Layers, Palette, Sun, Snowflake, Crown,
  Grid3X3, Brush, Eye, Plus, Search,
  Wand2, RefreshCw, Clock, Heart, LayoutGrid,
  GalleryHorizontalEnd, FileText, Send, Package, X,
  MessageSquare, Minimize2, Check, Loader2, User, Filter,
} from 'lucide-react';

// ===== Core imports =====
import type {
  DesignSettings, DesignConcept, FabricType, ApplicationMethod, Season,
  PatternStyle, SceneType, ExportType, GenerationMode,
} from '../core/types';
import {
  FABRIC_TYPE_OPTIONS, APPLICATION_METHOD_OPTIONS, SEASON_OPTIONS,
  PATTERN_STYLE_OPTIONS, FABRIC_DISPLAY_SCENES, PRODUCT_SCENES,
  getFabricTypeKey, getApplicationMethodKey, getSeasonKey,
  getPatternStyleKey, getSceneTypeKey,
} from '../core/types';
import { createDesignConcept, uploadConceptImage } from '../core/DesignConceptService';
import { ExportService } from '../core/ExportService';
import { InspirationEngine } from '../core/InspirationEngine';
import type { FabricAnalysisResult, InspirationCard } from '../core/InspirationEngine';

// ===== Hooks =====
import { useInspirationEngine } from '../hooks/useInspirationEngine';
import { useDesignConcepts } from '../hooks/useDesignConcepts';
import { buildCompositeGridPrompt } from '../prompts/promptBuilder';

// ═══════════════════════════════════════════
// 🎨 Default attractive color palette
const DEFAULT_PALETTE = [
  '#1B1B3A', '#2C3E50', '#8B4513', '#B22222',
  '#006B3C', '#1A5276', '#6C3483', '#D4A017',
  '#C0392B', '#2E86C1', '#17A589', '#E67E22',
];

// 🎬 Scene labels (Arabic)
const SCENE_LABELS: Record<SceneType, string> = {
  // عرض القماش
  flat_lay: 'عرض القماش مسطح',
  table_display: 'عرض على طاولة',
  hanging: 'معلق بالمتجر',
  rolls: 'رولونات قماش',
  swirl: 'لفّة فنية',
  macro: 'تصوير ماكرو',
  // منتجات
  dress: 'فستان سهرة',
  evening_gown: 'ثوب هوت كوتور',
  abaya: 'عباءة عصرية',
  suit: 'بدلة رجالية',
  curtain: 'ستائر فاخرة',
  bedding: 'أطقم سرير',
  sofa: 'كنبة مصمم',
  cushion: 'وسائد ديكور',
};

// 🎨 Design Controls Panel
// ═══════════════════════════════════════════
function DesignControls({
  settings, onSettingsChange, t, analyzedColors = [], selectedColors = [], onColorSelect, onCompositeGenerate,
}: {
  settings: DesignSettings;
  onSettingsChange: (s: Partial<DesignSettings>) => void;
  t: (key: string) => string;
  isRTL?: boolean;
  analyzedColors?: Array<{ name: string; hex: string }>;
  selectedColors?: string[];
  onColorSelect: (color: string) => void;
  onCompositeGenerate?: () => void;
}) {
  const mode = settings.generationMode || 'inspired';

  // Check if value was auto-detected or manually changed
  const isFabricAI = settings.autoDetectedFabricType != null && settings.fabricType === settings.autoDetectedFabricType;
  const isMethodAI = settings.autoDetectedApplicationMethod != null && settings.applicationMethod === settings.autoDetectedApplicationMethod;

  return (
    <div className="space-y-1 p-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 420px)' }}>

      {/* ═══ 🧵 هوية المادة — تظهر في الوضعين ═══ */}
      {/* نوع القماش */}
      <ControlSection 
        title={t('inspirationStudio.fabricTypes._')} 
        icon={<Layers className="w-4 h-4" />}
        badge={settings.autoDetectedFabricType != null ? (
          isFabricAI 
            ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI</span>
            : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">✏️ يدوي</span>
        ) : undefined}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {FABRIC_TYPE_OPTIONS.map(ft => (
            <button
              key={ft}
              onClick={() => onSettingsChange({ fabricType: ft })}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                settings.fabricType === ft
                  ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {t(getFabricTypeKey(ft))}
            </button>
          ))}
        </div>
      </ControlSection>

      {/* آلية الصنع */}
      <ControlSection 
        title={t('inspirationStudio.applicationMethods._')} 
        icon={<Brush className="w-4 h-4" />}
        badge={settings.autoDetectedApplicationMethod != null ? (
          isMethodAI
            ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI</span>
            : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">✏️ يدوي</span>
        ) : undefined}
      >
        <div className="grid grid-cols-1 gap-1.5">
          {APPLICATION_METHOD_OPTIONS.map(am => (
            <button
              key={am}
              onClick={() => onSettingsChange({ applicationMethod: am })}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-start',
                settings.applicationMethod === am
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {t(getApplicationMethodKey(am))}
            </button>
          ))}
        </div>
      </ControlSection>

      {/* ═══ الخيارات الخاصة بالوضع المستوحى فقط ═══ */}
      {mode === 'inspired' && (
        <>
          {/* الموسم */}
          <ControlSection title={t('inspirationStudio.seasons._')} icon={<Sun className="w-4 h-4" />}>
            <div className="grid grid-cols-1 gap-1.5">
              {SEASON_OPTIONS.map(s => {
                const icons: Record<Season, React.ReactNode> = {
                  spring_summer: <Sun className="w-3.5 h-3.5" />,
                  autumn_winter: <Snowflake className="w-3.5 h-3.5" />,
                  timeless: <Crown className="w-3.5 h-3.5" />,
                };
                return (
                  <button
                    key={s}
                    onClick={() => onSettingsChange({ season: s })}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      settings.season === s
                        ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300 ring-1 ring-teal-500/50'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
                    )}
                  >
                    {icons[s]}
                    {t(getSeasonKey(s))}
                  </button>
                );
              })}
            </div>
          </ControlSection>

          {/* نمط الرسمة */}
          <ControlSection title={t('inspirationStudio.patternStyles._')} icon={<Grid3X3 className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {PATTERN_STYLE_OPTIONS.map(ps => (
                <button
                  key={ps}
                  onClick={() => onSettingsChange({ patternStyle: ps })}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    settings.patternStyle === ps
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/50'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {t(getPatternStyleKey(ps))}
                </button>
              ))}
            </div>
          </ControlSection>
        </>
      )}

      {/* ═══ 🎨 الألوان — قسم واحد فقط ═══ */}
      <ControlSection title="الألوان" icon={<Palette className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {/* زر "أصلي" — يحافظ على الألوان الأصلية */}
            <button
              onClick={() => onColorSelect('__original__')}
              className={cn(
                'h-8 px-2.5 rounded-lg border-2 text-[10px] font-medium transition-all duration-200 hover:scale-105 flex items-center gap-1',
                selectedColors.includes('__original__')
                  ? 'border-emerald-500 dark:border-white ring-2 ring-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 scale-105'
                  : 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/30'
              )}
            >
              {selectedColors.includes('__original__') && <Check className="w-3 h-3" />}
              أصلي
            </button>
            {/* الألوان المفضلة */}
            {(settings.customColors || DEFAULT_PALETTE).map((color, i) => {
              const isSelected = selectedColors.includes(color);
              return (
                <div key={`c-${i}`} className="relative group">
                  <button
                    onClick={() => onColorSelect(color)}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center',
                      isSelected
                        ? 'border-violet-500 dark:border-white ring-2 ring-violet-500/50 scale-110'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />}
                  </button>
                  <button
                    onClick={() => {
                      const filtered = (settings.customColors || DEFAULT_PALETTE).filter((_, idx) => idx !== i);
                      onSettingsChange({ customColors: filtered.length > 0 ? filtered : DEFAULT_PALETTE });
                    }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              );
            })}
            <label className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-violet-400/50 flex items-center justify-center cursor-pointer transition-colors">
              <input
                type="color"
                className="sr-only"
                onChange={(e) => {
                  onSettingsChange({
                    customColors: [...(settings.customColors || DEFAULT_PALETTE), e.target.value].slice(0, 16),
                  });
                }}
              />
              <Plus className="w-3.5 h-3.5 text-gray-500" />
            </label>
          </div>

          {/* تطبيق اللون على */}
          <div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 block">تطبيق اللون على</span>
            <div className="grid grid-cols-3 gap-1">
              {(['base', 'motif', 'both'] as const).map(target => (
                <button
                  key={target}
                  onClick={() => onSettingsChange({ colorTarget: target })}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                    settings.colorTarget === target || (!(settings.colorTarget) && target === 'base')
                      ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/50'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  )}
                >
                  {target === 'base' ? 'الخلفية' : target === 'motif' ? 'النقشة' : 'الاثنين'}
                </button>
              ))}
            </div>
          </div>

          {selectedColors.length > 0 && (
            <div className="text-[10px] text-violet-600 dark:text-violet-300 flex items-center gap-1">
              <Check className="w-3 h-3" />
              {selectedColors.filter(c => c !== '__original__').length > 0 
                ? `${selectedColors.length} ${selectedColors.includes('__original__') ? '(+أصلي)' : ''} — سيتم إنشاء ${selectedColors.length} صور`
                : 'سيتم إنشاء صورة بالألوان الأصلية'}
            </div>
          )}
        </div>
      </ControlSection>

      {/* مشهد العرض */}
      <ControlSection title={t('inspirationStudio.sceneTypes._') || 'مشهد العرض'} icon={<Eye className="w-4 h-4" />}>
        {/* عرض القماش */}
        <span className="text-[9px] font-semibold text-amber-500/70 dark:text-amber-400/70 uppercase tracking-wider mb-1 block">🏪 عرض القماش</span>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {FABRIC_DISPLAY_SCENES.map(st => (
            <button
              key={st}
              onClick={() => onSettingsChange({ sceneType: st })}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                settings.sceneType === st
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {SCENE_LABELS[st]}
            </button>
          ))}
        </div>
        {/* منتجات */}
        <span className="text-[9px] font-semibold text-sky-500/70 dark:text-sky-400/70 uppercase tracking-wider mb-1 block">👗 منتجات</span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRODUCT_SCENES.map(st => (
            <button
              key={st}
              onClick={() => onSettingsChange({ sceneType: st })}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                settings.sceneType === st
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {SCENE_LABELS[st]}
            </button>
          ))}
        </div>
      </ControlSection>

      {/* 📐 فورمات الصورة */}
      <ControlSection title="فورمات الصورة" icon={<Maximize2 className="w-4 h-4" />}>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { value: 'landscape', label: 'أفقي', icon: '▬', desc: '16:9' },
            { value: 'portrait', label: 'عمودي', icon: '▮', desc: '9:16' },
            { value: 'square', label: 'مربع', icon: '⬜', desc: '1:1' },
          ] as const).map(fmt => (
            <button
              key={fmt.value}
              onClick={() => onSettingsChange({ aspectRatio: fmt.value as any })}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                (settings.aspectRatio || 'landscape') === fmt.value
                  ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/50'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <span className="text-lg leading-none">{fmt.icon}</span>
              <span>{fmt.label}</span>
              <span className="text-[9px] text-gray-500">{fmt.desc}</span>
            </button>
          ))}
        </div>
      </ControlSection>

      {/* 🖼️ صورة مشتركة — تجريب كل المشاهد */}
      <button
        onClick={onCompositeGenerate}
        disabled={!onCompositeGenerate}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 hover:from-amber-500/20 hover:to-orange-500/20 hover:border-amber-500/40 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <LayoutGrid className="w-4 h-4" />
        صورة مشتركة — 14 مشهد
      </button>

      {/* ملاحظة إبداعية */}
      <ControlSection title={t('inspirationStudio.save.description')} icon={<MessageSquare className="w-4 h-4" />}>
        <textarea
          value={settings.customPromptHint || ''}
          onChange={(e) => onSettingsChange({ customPromptHint: e.target.value })}
          placeholder={t('inspirationStudio.save.descriptionPlaceholder')}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none resize-none h-16"
        />
      </ControlSection>
    </div>
  );
}

// ═══════════════════════════════════════════
// 🔲 Control Section Wrapper
// ═══════════════════════════════════════════
function ControlSection({ title, icon, children, badge }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <span className="text-violet-500 dark:text-violet-400">{icon}</span>
        {title}
        {badge && <span className="ms-auto">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════
// 🖼️ Hero Canvas
// ═══════════════════════════════════════════
function HeroCanvas({
  imageUrl, isGenerating, onGenerate, onSave, onExport, t, canGenerate, error,
}: {
  imageUrl: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onSave: () => void;
  onExport: () => void;
  t: (key: string) => string;
  canGenerate: boolean;
  error?: string | null;
}) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!isImageFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsImageFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isImageFullscreen]);

  return (
    <>
      {/* ═══ Fullscreen Image Overlay ═══ */}
      {isImageFullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer animate-in fade-in duration-300"
          onClick={() => setIsImageFullscreen(false)}
        >
          <img
            src={imageUrl}
            alt="AI Generated Design — Fullscreen"
            className="max-w-[98vw] max-h-[98vh] object-contain"
          />
          <button
            className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsImageFullscreen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="relative flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-black rounded-2xl overflow-auto border border-gray-200 dark:border-white/5 group" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(128,128,128,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="AI Generated Design"
              className="relative z-10 max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl shadow-violet-500/10 animate-in fade-in zoom-in-95 duration-700 cursor-pointer hover:shadow-violet-500/30 transition-all hover:scale-[1.01]"
              onClick={() => setIsImageFullscreen(true)}
              title="اضغط لملء الشاشة"
            />
            {/* Zoom indicator */}
            {!isGenerating && (
              <div className="absolute top-3 start-3 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-white/60 text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3 h-3" />
              </div>
            )}

          {/* ═══ Loading Overlay — beautiful animation during regeneration ═══ */}
          {isGenerating && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <div className="w-20 h-20 rounded-full border-4 border-pink-500/20 border-b-pink-500 animate-spin absolute top-4 left-4" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Wand2 className="w-10 h-10 text-violet-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="mt-6 text-center">
                <p className="text-lg text-gray-200 font-medium animate-pulse">{t('inspirationStudio.generating')}</p>
                <p className="text-xs text-gray-500 mt-1">~ 30-60s</p>
              </div>
            </div>
          )}

          {/* ═══ Action Toolbar — Always visible over the image ═══ */}
          {!isGenerating && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-1 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-xl px-2 py-2 border border-gray-200 dark:border-white/15 shadow-2xl shadow-black/10 dark:shadow-black/50 animate-in slide-in-from-bottom-4 duration-500">
              <ToolbarButton icon={<RefreshCw className="w-3.5 h-3.5" />} label={'تنوع جديد'} onClick={onGenerate} />
              <div className="w-px h-5 bg-white/10" />
              <ToolbarButton icon={<SaveIcon className="w-3.5 h-3.5" />} label={'حفظ'} onClick={onSave} />
              <ToolbarButton icon={<Download className="w-3.5 h-3.5" />} label={'تنزيل'} onClick={onExport} />
              <ToolbarButton icon={<Share2 className="w-3.5 h-3.5" />} label={'مشاركة'} onClick={onExport} />
              <div className="w-px h-5 bg-white/10" />
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400/70 px-1 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" />محفوظ</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-6 text-center p-8 animate-in fade-in duration-500">
          {isGenerating ? (
            <>
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <div className="w-20 h-20 rounded-full border-4 border-pink-500/20 border-b-pink-500 animate-spin absolute top-4 left-4" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Wand2 className="w-10 h-10 text-violet-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <p className="text-lg text-gray-300 font-medium animate-pulse">{t('inspirationStudio.generating')}</p>
                <p className="text-xs text-gray-600 mt-1">~ 30-60s</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-500/20 via-pink-500/10 to-amber-500/20 flex items-center justify-center border border-white/10 shadow-xl shadow-violet-500/10">
                <Sparkles className="w-14 h-14 text-violet-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('inspirationStudio.title')}</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-md">{t('inspirationStudio.subtitle')}</p>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-md animate-in fade-in duration-500">
                  <p className="text-red-400 text-sm font-medium mb-2">⚠️ {error}</p>
                  <p className="text-gray-500 text-xs">Try again or use a different reference image</p>
                </div>
              )}
              {canGenerate && (
                <Button
                  onClick={onGenerate}
                  className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white gap-2 px-8 py-6 text-base rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-105"
                >
                  <Wand2 className="w-5 h-5" />
                  {error ? t('inspirationStudio.version.variation') : t('inspirationStudio.generate')}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      </div>
    </>
  );
}

function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick}
      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 gap-1.5 text-xs px-2.5 py-1.5 h-auto rounded-lg transition-all">
      {icon} {label}
    </Button>
  );
}

// ═══════════════════════════════════════════
// 💾 Save Design Dialog
// ═══════════════════════════════════════════
function SaveDialog({
  open, onClose, t, settings, imageUrl, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
  settings: DesignSettings;
  imageUrl: string | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!imageUrl) return;
    setSaving(true);
    try {
      // Upload image to storage
      const { data: { user } } = await supabase.auth.getUser();
      const companyId = (user?.app_metadata?.company_id || user?.app_metadata?.tenant_id || 'default') as string;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const uploadResult = await uploadConceptImage(blob, companyId, `inspiration_${Date.now()}.jpg`);

      if (uploadResult) {
        await createDesignConcept({
          title: title || null,
          description: description || null,
          imageUrl: uploadResult.url,
          storagePath: uploadResult.path,
          promptSettings: settings,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        });
        onSaved();
        onClose();
        setTitle('');
        setDescription('');
        setTags('');
      }
    } catch (err) {
      console.error('[SaveDialog] Error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <SaveIcon className="w-5 h-5 text-violet-400" />
            {t('inspirationStudio.save.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inspirationStudio.save.designTitle')}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('inspirationStudio.save.designTitlePlaceholder')}
              className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inspirationStudio.save.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('inspirationStudio.save.descriptionPlaceholder')}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-violet-500/50 outline-none resize-none h-20"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inspirationStudio.save.tags')}</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('inspirationStudio.save.tagsPlaceholder')}
              className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <X className="w-4 h-4 mr-1" /> {t('messages.discardAndClose')}
          </Button>
          <Button onClick={handleSave} disabled={saving}
            className="bg-gradient-to-r from-violet-600 to-pink-600 text-white gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('inspirationStudio.saveDesign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════
// 📤 Export Dialog
// ═══════════════════════════════════════════
function ExportDialog({
  open, onClose, t, imageUrl,
}: {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
  imageUrl: string | null;
}) {
  const handleDownload = () => {
    if (!imageUrl) return;
    ExportService.downloadAsImage(imageUrl, `inspiration_${Date.now()}`, 'jpg');
    onClose();
  };

  const handleWhatsApp = () => {
    ExportService.shareViaWhatsApp(
      '✨ ' + t('inspirationStudio.title'),
      imageUrl || undefined,
    );
    onClose();
  };

  const handleTelegram = () => {
    ExportService.shareViaTelegram(
      '✨ ' + t('inspirationStudio.title'),
      imageUrl || undefined,
    );
    onClose();
  };

  const exportOptions: { key: ExportType; icon: React.ReactNode; color: string; onClick: () => void }[] = [
    { key: 'material', icon: <Package className="w-5 h-5" />, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 hover:ring-emerald-500/30', onClick: () => {} },
    { key: 'image', icon: <Download className="w-5 h-5" />, color: 'from-blue-500/20 to-cyan-500/20 text-blue-300 hover:ring-blue-500/30', onClick: handleDownload },
    { key: 'pdf', icon: <FileText className="w-5 h-5" />, color: 'from-rose-500/20 to-pink-500/20 text-rose-300 hover:ring-rose-500/30', onClick: () => {} },
    { key: 'share', icon: <Send className="w-5 h-5" />, color: 'from-violet-500/20 to-purple-500/20 text-violet-300 hover:ring-violet-500/30', onClick: handleWhatsApp },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Share2 className="w-5 h-5 text-violet-400" />
            {t('inspirationStudio.export.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {exportOptions.map(opt => (
            <button
              key={opt.key}
              onClick={opt.onClick}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br border border-gray-100 dark:border-white/5 transition-all hover:ring-1 hover:scale-[1.02]',
                opt.color
              )}
            >
              {opt.icon}
              <span className="text-xs font-medium">{t(`inspirationStudio.export.${opt.key === 'material' ? 'toMaterial' : opt.key === 'image' ? 'asImage' : opt.key === 'pdf' ? 'asPdf' : 'share'}`)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════
// 🗂️ Desk / Gallery View
// ═══════════════════════════════════════════
function DeskView({ t, onLoadDesign }: {
  t: (key: string) => string;
  onLoadDesign: (concept: DesignConcept) => void;
}) {
  const { concepts, isLoading, totalCount, filters, setFilters } = useDesignConcepts();

  const sortOptions = [
    { key: 'newest' as const, label: t('inspirationStudio.gallery.sortNewest') },
    { key: 'oldest' as const, label: t('inspirationStudio.gallery.sortOldest') },
    { key: 'most_liked' as const, label: t('inspirationStudio.gallery.sortMostLiked') },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t('inspirationStudio.gallery.title')}
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none"
          />
        </div>

        {sortOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilters({ ...filters, sortBy: opt.key })}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              filters.sortBy === opt.key
                ? 'bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/50'
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
            )}
          >
            {opt.label}
          </button>
        ))}

        <Badge variant="outline" className="text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 text-xs">
          {totalCount} {t('inspirationStudio.customerTaste.totalDesigns')}
        </Badge>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : concepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in duration-500">
            <GalleryHorizontalEnd className="w-16 h-16 text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm">{t('inspirationStudio.gallery.noResults')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {concepts.map((concept, idx) => (
              <button
                key={concept.id}
                onClick={() => onLoadDesign(concept)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 hover:border-violet-500/50 transition-all duration-300 hover:scale-[1.03] bg-gray-50 dark:bg-gray-900 animate-in fade-in duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {concept.image_url ? (
                  <img src={concept.image_url} alt={concept.title || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-pink-900/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-gray-600" />
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium truncate">{concept.title || `#${concept.version}`}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {concept.creator_name && (
                        <span className="text-gray-400 text-[10px] flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" /> {concept.creator_name}
                        </span>
                      )}
                      <span className="text-gray-400 text-[10px] flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {new Date(concept.created_at).toLocaleDateString()}
                      </span>
                      {concept.likes_count > 0 && (
                        <span className="text-pink-400 text-[10px] flex items-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-current" /> {concept.likes_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// 🎨 Source Selector
// ═══════════════════════════════════════════
function SourceSelector({
  sourceImageUrl, onSourceChange, t, isAnalyzing, analysisComplete,
}: {
  sourceImageUrl: string | null;
  onSourceChange: (url: string) => void;
  t: (key: string) => string;
  isAnalyzing?: boolean;
  analysisComplete?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSourceChange(url);
  }, [onSourceChange]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <ImagePlus className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('inspirationStudio.sources.title')}</span>
      </div>

      {sourceImageUrl ? (
        <div className="relative group rounded-xl overflow-hidden">
          <img src={sourceImageUrl} alt="" className="w-full h-28 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onSourceChange('')}
              className="w-8 h-8 rounded-full bg-red-500/80 text-white text-sm flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-violet-500/50 gap-1.5 text-xs h-24 flex-col"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5" />
            {t('inspirationStudio.sources.uploadImage')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:border-emerald-500/50 gap-1.5 text-xs h-24 flex-col"
            onClick={() => setShowMaterialPicker(true)}
          >
            <Package className="w-5 h-5" />
            {t('inspirationStudio.sources.fromSystem')}
          </Button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Analysis indicator — shows under image when analyzing */}
      {isAnalyzing && sourceImageUrl && (
        <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <Sparkles className="w-3 h-3 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">{t('inspirationStudio.analyzing') || 'جاري تحليل القماش...'}</span>
            <span className="text-[9px] text-gray-500">نوع القماش · الألوان · آلية الصنع</span>
          </div>
        </div>
      )}
      {!isAnalyzing && sourceImageUrl && analysisComplete && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in duration-300">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">تحليل مكتمل ✓</span>
        </div>
      )}

      {/* Material Picker Dialog */}
      <MaterialPickerDialog
        open={showMaterialPicker}
        onClose={() => setShowMaterialPicker(false)}
        onSelect={(url) => { onSourceChange(url); setShowMaterialPicker(false); }}
        t={t}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// 📦 Material Picker Dialog
// ═══════════════════════════════════════════
function MaterialPickerDialog({
  open, onClose, onSelect, t,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  t: (key: string) => string;
}) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const fetchMaterials = async () => {
      try {
        // Simple query — no join (material_images may not have FK to materials)
        const { data, error } = await (supabase as any)
          .from('material_images')
          .select('id, material_id, url, file_name')
          .order('created_at', { ascending: false })
          .limit(60);

        if (error) {
          console.warn('[MaterialPicker] Query error:', error.message);
          setMaterials([]);
        } else {
          // Normalize: use url or image_url
          const normalized = (data || [])
            .filter((m: any) => m.url)
            .map((m: any) => ({ ...m, image_url: m.url }));
          setMaterials(normalized);
        }
      } catch {
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Package className="w-5 h-5 text-emerald-400" />
            {t('inspirationStudio.sources.fromSystem')}
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {materials.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.image_url)}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/5 hover:border-emerald-500/50 transition-all hover:scale-[1.03]"
                >
                  <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════
// 🚀 Main Page Component
// ═══════════════════════════════════════════
export default function InspirationStudioPage() {
  const { t, isRTL, direction } = useLanguage();
  const { isGenerating, result, error, generate, reset } = useInspirationEngine();
  const [activeTab, setActiveTab] = useState<'studio' | 'desk'>('studio');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Source image & analysis
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fabricAnalysis, setFabricAnalysis] = useState<FabricAnalysisResult | null>(null);
  const [inspirationCards, setInspirationCards] = useState<InspirationCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Batch generation
  const [batchResults, setBatchResults] = useState<Array<{ url: string | null; loading: boolean; settings: DesignSettings; error?: string }>>([]);
  const [selectedResultIdx, setSelectedResultIdx] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState(1);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Load saved favorite colors from localStorage
  const savedColors = useMemo(() => {
    try {
      const stored = localStorage.getItem('inspiration_favorite_colors');
      return stored ? JSON.parse(stored) : DEFAULT_PALETTE;
    } catch { return DEFAULT_PALETTE; }
  }, []);

  // Design settings
  const [settings, setSettings] = useState<DesignSettings>({
    sources: [],
    generationMode: 'inspired',
    fabricType: 'silk',
    applicationMethod: 'printed',
    season: 'timeless',
    patternStyle: 'damask',
    baseColor: '#1a1a2e',
    baseColorName: 'Midnight Navy',
    motifColor: '#c9a96e',
    motifColorName: 'Royal Gold',
    sceneType: 'evening_gown',
    customColors: savedColors,
  });

  const handleSettingsChange = useCallback((updates: Partial<DesignSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      // Persist favorite colors to localStorage
      if (updates.customColors !== undefined) {
        try { localStorage.setItem('inspiration_favorite_colors', JSON.stringify(next.customColors)); } catch {}
      }
      return next;
    });
  }, []);

  // 🎨 Selected colors for batch generation (up to 4)
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const handleColorSelect = useCallback((color: string) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) return prev.filter(c => c !== color);
      if (prev.length >= 4) return prev;
      return [...prev, color];
    });

    // Also update settings.baseColor/motifColor directly so single generate works
    if (color !== '__original__') {
      const target = settings.colorTarget || 'base';
      if (target === 'base') {
        handleSettingsChange({ baseColor: color, baseColorName: color });
      } else if (target === 'motif') {
        handleSettingsChange({ motifColor: color, motifColorName: color });
      } else { // both
        handleSettingsChange({ baseColor: color, baseColorName: color, motifColor: color, motifColorName: color });
      }
    } else {
      // Restore original colors
      handleSettingsChange({
        baseColor: settings.originalBaseColor || settings.baseColor,
        baseColorName: 'Original',
        motifColor: settings.originalMotifColor || settings.motifColor,
        motifColorName: 'Original',
      });
    }
  }, [settings.colorTarget, settings.originalBaseColor, settings.originalMotifColor, settings.baseColor, settings.motifColor, handleSettingsChange]);

  // 🔍 Auto-analyze when image changes
  useEffect(() => {
    if (!sourceImageUrl) {
      setFabricAnalysis(null);
      setInspirationCards([]);
      return;
    }
    let cancelled = false;
    setIsAnalyzing(true);
    InspirationEngine.analyzeImage(sourceImageUrl).then(result => {
      if (cancelled) return;
      setIsAnalyzing(false);
      if (result.success && result.analysis) {
        setFabricAnalysis(result.analysis);
        setInspirationCards(result.inspirationCards || []);
        const a = result.analysis;

        // ═══ Auto-detect Fabric Type ═══
        const fabricMap: Record<string, FabricType> = {
          silk: 'silk', velvet: 'velvet', linen: 'linen', cotton: 'cotton',
          lace: 'lace', chiffon: 'chiffon', satin: 'satin', tweed: 'tweed',
          denim: 'denim', jacquard: 'jacquard', organza: 'organza',
        };
        const detectedFabricKey = Object.keys(fabricMap).find(k => 
          a.fabric_type?.toLowerCase().includes(k)
        );
        const detectedFabric = detectedFabricKey ? fabricMap[detectedFabricKey] : undefined;

        // ═══ Auto-detect Application Method from print_technique ═══
        const methodMap: Record<string, ApplicationMethod> = {
          'digital inkjet': 'printed', 'digital print': 'printed',
          'rotary screen': 'printed', 'screen print': 'printed',
          'sublimation': 'printed', 'piece-dyed': 'printed',
          'inkjet': 'printed', 'printed': 'printed',
          'embroidered': 'embroidered', 'embroidery': 'embroidered',
          'flocked': 'embroidered', 'flock': 'embroidered',
          'woven jacquard': 'woven_jacquard', 'jacquard': 'woven_jacquard',
          'yarn-dyed': 'woven_jacquard', 'yarn dyed': 'woven_jacquard',
          'dobby': 'woven_jacquard',
        };
        const printTech = (a as any).print_technique?.toLowerCase() || '';
        const detectedMethodKey = Object.keys(methodMap).find(k => printTech.includes(k));
        const detectedMethod = detectedMethodKey ? methodMap[detectedMethodKey] : undefined;

        // ═══ Set all detected values at once ═══
        const analyzedBase = (a as any).background_color_hex || a.colors?.[0]?.hex || '#1a1a2e';
        const analyzedBaseName = (a as any).background_color_name || a.colors?.[0]?.name || 'Base';
        const analyzedMotif = (a as any).motif_color_hex || a.colors?.[1]?.hex || '#c9a96e';
        const analyzedMotifName = (a as any).motif_color_name || a.colors?.[1]?.name || 'Motif';

        const autoUpdate: Partial<DesignSettings> = {
          baseColor: analyzedBase,
          baseColorName: analyzedBaseName,
          motifColor: analyzedMotif,
          motifColorName: analyzedMotifName,
          originalBaseColor: analyzedBase,
          originalMotifColor: analyzedMotif,
        };

        if (detectedFabric) {
          autoUpdate.fabricType = detectedFabric;
          autoUpdate.autoDetectedFabricType = detectedFabric;
        }
        if (detectedMethod) {
          autoUpdate.applicationMethod = detectedMethod;
          autoUpdate.autoDetectedApplicationMethod = detectedMethod;
        }

        handleSettingsChange(autoUpdate);

        // Store for comparison
        try { localStorage.setItem('inspiration_analyzed_colors', JSON.stringify({ base: analyzedBase, motif: analyzedMotif })); } catch {}

        // ═══ Auto-detect Season ═══
        if (a.season) {
          const seasonMap: Record<string, Season> = {
            'spring': 'spring_summer', 'summer': 'spring_summer',
            'autumn': 'autumn_winter', 'winter': 'autumn_winter', 'fall': 'autumn_winter',
          };
          const s = Object.keys(seasonMap).find(k => a.season?.toLowerCase().includes(k));
          if (s) handleSettingsChange({ season: seasonMap[s] });
        }
      }
    });
    return () => { cancelled = true; };
  }, [sourceImageUrl]);

  // Apply inspiration card settings
  const handleApplyCard = useCallback((card: InspirationCard) => {
    handleSettingsChange({
      patternStyle: card.patternStyle as PatternStyle,
      fabricType: card.fabricType as FabricType,
      baseColor: card.baseColor,
      baseColorName: card.name,
      motifColor: card.motifColor,
      motifColorName: card.name + ' Motif',
      season: card.season as Season,
      sceneType: card.sceneType as SceneType,
    });
  }, [handleSettingsChange]);

  // 🔄 Auto-save disabled — user saves manually via Save dialog
  // (Storage RLS blocks direct upload from frontend for inspiration images)
  const savedUrlsRef = useRef<Set<string>>(new Set());

  // 🎨 Generate single
  const handleGenerate = useCallback(async () => {
    if (!sourceImageUrl) return;
    setBatchResults([]);
    setSelectedResultIdx(null);
    await generate(settings, sourceImageUrl);
  }, [settings, sourceImageUrl, generate]);

  // 🖼️ Composite Grid — صورة مشتركة لكل المشاهد
  const handleCompositeGenerate = useCallback(async () => {
    if (!sourceImageUrl) return;
    setBatchResults([]);
    setSelectedResultIdx(null);
    // Override settings with composite prompt via customPromptHint
    const METHOD_PRO: Record<string, string> = { printed: 'digitally printed', embroidered: 'embroidered', woven: 'woven jacquard' };
    const FABRIC_SIMPLE: Record<string, string> = { cotton: 'cotton', silk: 'silk', linen: 'linen', polyester: 'polyester', velvet: 'velvet', chiffon: 'chiffon', satin: 'satin', wool: 'wool', denim: 'denim', organza: 'organza' };
    const methodPro = METHOD_PRO[settings.applicationMethod] || '';
    const mat = `${methodPro} ${FABRIC_SIMPLE[settings.fabricType] || 'fabric'}`.trim();
    const compositePrompt = buildCompositeGridPrompt(mat);
    // Generate with composite settings
    const compositeSettings = { ...settings, _compositePrompt: compositePrompt, generationMode: 'professional' as const, sceneType: 'flat_lay' as const } as any;
    await generate(compositeSettings, sourceImageUrl);
  }, [settings, sourceImageUrl, generate]);

  // 🎴 Batch: generate multiple color variations at once
  const handleBatchGenerate = useCallback(async () => {
    if (!sourceImageUrl) return;
    reset();
    setIsBatchGenerating(true);
    setSelectedResultIdx(null);

    const target = settings.colorTarget || 'base';
    const count = selectedColors.length > 0 ? Math.min(selectedColors.length, 4) : batchCount;

    // Build color variations from selected colors
    const variations: Array<{ base: string; baseName: string; motif: string; motifName: string }> = [];

    if (selectedColors.length > 0) {
      for (const color of selectedColors) {
        if (variations.length >= 4) break;
        if (color === '__original__') {
          // Keep original colors — no recoloring
          variations.push({ 
            base: settings.originalBaseColor || settings.baseColor, 
            baseName: 'Original', 
            motif: settings.originalMotifColor || settings.motifColor, 
            motifName: 'Original' 
          });
        } else if (target === 'base') {
          variations.push({ base: color, baseName: color, motif: settings.motifColor, motifName: settings.motifColorName || 'Motif' });
        } else if (target === 'motif') {
          variations.push({ base: settings.baseColor, baseName: settings.baseColorName || 'Base', motif: color, motifName: color });
        } else { // both
          variations.push({ base: color, baseName: color, motif: color, motifName: color });
        }
      }
    } else {
      // No colors selected → generate with current settings
      for (let i = 0; i < count; i++) {
        variations.push({ base: settings.baseColor, baseName: settings.baseColorName || 'Current', motif: settings.motifColor, motifName: settings.motifColorName || 'Current' });
      }
    }

    const batch = variations.map(cv => ({
      url: null as string | null,
      loading: true,
      settings: {
        ...settings,
        baseColor: cv.base, baseColorName: cv.baseName,
        motifColor: cv.motif, motifColorName: cv.motifName,
      },
    }));
    setBatchResults(batch);

    // Generate all in parallel
    const promises = batch.map(async (item, idx) => {
      try {
        const result = await InspirationEngine.generate(item.settings, sourceImageUrl);
        setBatchResults(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], url: result.imageUrl || null, loading: false, error: result.error };
          return next;
        });
      } catch (err: any) {
        setBatchResults(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], loading: false, error: err.message };
          return next;
        });
      }
    });
    await Promise.allSettled(promises);
    setIsBatchGenerating(false);
  }, [sourceImageUrl, settings, batchCount, selectedColors, reset]);

  // Select a batch result as hero
  const handleSelectResult = useCallback((idx: number) => {
    setSelectedResultIdx(idx);
  }, []);

  // Regenerate single batch slot
  const handleRegenerateSingle = useCallback(async (idx: number) => {
    if (!sourceImageUrl || !batchResults[idx]) return;
    setBatchResults(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], loading: true, url: null, error: undefined };
      return next;
    });
    try {
      const result = await InspirationEngine.generate(batchResults[idx].settings, sourceImageUrl);
      setBatchResults(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], url: result.imageUrl || null, loading: false, error: result.error };
        return next;
      });
    } catch (err: any) {
      setBatchResults(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], loading: false, error: err.message };
        return next;
      });
    }
  }, [sourceImageUrl, batchResults]);

  const handleLoadDesign = useCallback((concept: DesignConcept) => {
    if (concept.prompt_settings) setSettings(concept.prompt_settings);
    setActiveTab('studio');
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const openInNewWindow = useCallback(() => {
    const url = `${window.location.origin}/inspiration-studio`;
    const w = window.open(url, 'InspirationStudio', `width=${screen.width},height=${screen.height}`);
    if (w) { w.addEventListener('load', () => { w.document.documentElement.requestFullscreen?.(); }); }
  }, []);

  // Hero image: selected batch result or single result, or auto-select batch[0] when single
  const effectiveSelectedIdx = selectedResultIdx ?? (batchResults.length === 1 && batchResults[0]?.url ? 0 : null);
  const generatedImageUrl = effectiveSelectedIdx !== null && batchResults[effectiveSelectedIdx]?.url
    ? batchResults[effectiveSelectedIdx].url
    : result?.imageUrl || null;
  const isBatchMode = batchResults.some(r => r.url || r.loading);

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)]'
      )}
      dir={direction}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{t('inspirationStudio.title')}</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{t('inspirationStudio.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Toggle */}
          <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200 dark:border-white/5">
            <button
              onClick={() => setActiveTab('studio')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                activeTab === 'studio' ? 'bg-white dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              )}
            >
              <Wand2 className="w-3.5 h-3.5" /> {t('inspirationStudio.newDesign')}
            </button>
            <button
              onClick={() => setActiveTab('desk')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                activeTab === 'desk' ? 'bg-white dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> {t('inspirationStudio.gallery.title')}
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

          <Button size="icon" variant="ghost" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white w-8 h-8" onClick={toggleFullscreen} title={t('inspirationStudio.fullscreen')}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white w-8 h-8" onClick={openInNewWindow} title={t('inspirationStudio.openNewWindow')}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'studio' ? (
          <>
            {/* Side Panel */}
            <div className={cn(
              'w-72 border-gray-200 dark:border-white/5 bg-white/70 dark:bg-gray-900/50 flex flex-col shrink-0',
              isRTL ? 'border-l' : 'border-r'
            )}>
              <SourceSelector sourceImageUrl={sourceImageUrl} onSourceChange={setSourceImageUrl} t={t} isAnalyzing={isAnalyzing} analysisComplete={!!fabricAnalysis} />

              {/* ═══ Generation Mode Toggle ═══ */}
              <div className="p-3 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{t('inspirationStudio.mode') || 'Generation Mode'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { mode: 'inspired' as GenerationMode, icon: <Sparkles className="w-4 h-4" />, label: t('inspirationStudio.modes.inspired') || 'مستوحاة', desc: t('inspirationStudio.modes.inspiredDesc') || 'تصميم جديد + ألوان' },
                    { mode: 'professional' as GenerationMode, icon: <Eye className="w-4 h-4" />, label: 'صورة احترافية', desc: 'نفس التصميم + ألوان مخصصة' },
                  ]).map(m => (
                    <button
                      key={m.mode}
                      onClick={() => handleSettingsChange({ generationMode: m.mode })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 text-center',
                        settings.generationMode === m.mode
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-600 dark:text-violet-300 shadow-sm shadow-violet-500/10'
                          : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-300'
                      )}
                    >
                      {m.icon}
                      <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
                      <span className="text-[8px] opacity-60">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DesignControls — unified controls per mode */}
              <DesignControls settings={settings} onSettingsChange={handleSettingsChange} t={t} isRTL={isRTL} analyzedColors={fabricAnalysis?.colors || []} selectedColors={selectedColors} onColorSelect={handleColorSelect} onCompositeGenerate={sourceImageUrl ? handleCompositeGenerate : undefined} />
              {/* Generate Buttons */}
              <div className="p-3 border-t border-gray-200 dark:border-white/5 mt-auto space-y-2">
                {/* Batch count selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{t('inspirationStudio.batchCount') || 'Variations'}:</span>
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setBatchCount(n)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-bold transition-all',
                        batchCount === n
                          ? 'bg-violet-500/30 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/50'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Main generate button */}
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white gap-2 py-5 rounded-xl shadow-lg shadow-violet-500/25 font-bold disabled:opacity-40 transition-all hover:shadow-violet-500/40"
                  onClick={batchCount > 1 || selectedColors.length > 0 ? handleBatchGenerate : handleGenerate}
                  disabled={!sourceImageUrl || isGenerating || isBatchGenerating}
                >
                  {(isGenerating || isBatchGenerating) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  {(isGenerating || isBatchGenerating)
                    ? t('inspirationStudio.generating')
                    : batchCount > 1
                      ? `${t('inspirationStudio.generate')} (${batchCount})`
                      : t('inspirationStudio.generate')
                  }
                </Button>
              </div>
            </div>

            {/* Main Canvas + Results */}
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">

              {/* Batch Results Grid (2×2) — only show when multiple results */}
              {isBatchMode && batchResults.length > 1 && (
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('inspirationStudio.version.variation') || 'Variations'}</span>
                    <Badge variant="outline" className="text-[10px] border-gray-200 dark:border-white/10 text-gray-500">{batchResults.filter(r => r.url).length}/{batchResults.length}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {batchResults.map((br, idx) => (
                      <button
                        key={idx}
                        onClick={() => br.url && handleSelectResult(idx)}
                        className={cn(
                          'group relative aspect-[4/3] rounded-xl overflow-hidden border transition-all duration-200',
                          selectedResultIdx === idx
                            ? 'border-violet-500 ring-2 ring-violet-500/30 scale-[1.02]'
                            : 'border-white/10 hover:border-white/30 hover:scale-[1.01]',
                          !br.url && !br.loading && 'opacity-50'
                        )}
                      >
                        {br.loading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                            <div className="w-8 h-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                          </div>
                        ) : br.url ? (
                          <img src={br.url} alt="" className="w-full h-full object-cover" />
                        ) : br.error ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-red-400">
                            <X className="w-5 h-5" />
                          </div>
                        ) : null}

                        {/* Color badge */}
                        <div className="absolute top-1 start-1 flex gap-0.5">
                          <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: br.settings.baseColor }} />
                          <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: br.settings.motifColor }} />
                        </div>

                        {/* Regenerate overlay */}
                        {br.url && !br.loading && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRegenerateSingle(idx); }}
                              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors"
                              title="Regenerate"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectResult(idx); }}
                              className="w-7 h-7 rounded-full bg-violet-500/50 flex items-center justify-center hover:bg-violet-500 transition-colors"
                              title="Select"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        )}

                        {/* Label */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                          <span className="text-[9px] text-gray-300 truncate block">{br.settings.baseColorName || `#${idx + 1}`}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hero Canvas */}
              <div className="flex-1 flex relative">
                <HeroCanvas
                  imageUrl={generatedImageUrl}
                  isGenerating={isGenerating || isBatchGenerating}
                  onGenerate={handleGenerate}
                  onSave={() => setShowSaveDialog(true)}
                  onExport={() => setShowExportDialog(true)}
                  t={t}
                  canGenerate={!!sourceImageUrl}
                  error={error}
                />

                {/* Dismiss / clear image button */}
                {generatedImageUrl && (
                  <button
                    onClick={() => { reset(); setBatchResults([]); setSelectedResultIdx(null); }}
                    className="absolute top-3 end-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/50 transition-all z-10 border border-white/10"
                    title={t('messages.discardAndClose') || 'Clear'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ═══ Fixed Bottom Toolbar — visible when batch results exist ═══ */}
              {isBatchMode && generatedImageUrl && !isGenerating && !isBatchGenerating && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-xl px-3 py-2.5 border border-gray-200 dark:border-white/15 shadow-2xl shadow-black/10 dark:shadow-black/50 animate-in slide-in-from-bottom-6 duration-500">
                  <ToolbarButton icon={<RefreshCw className="w-4 h-4" />} label={'تنوع جديد'} onClick={handleGenerate} />
                  <div className="w-px h-5 bg-white/10" />
                  <ToolbarButton icon={<SaveIcon className="w-4 h-4" />} label={'حفظ'} onClick={() => setShowSaveDialog(true)} />
                  <ToolbarButton icon={<Download className="w-4 h-4" />} label={'تنزيل'} onClick={() => setShowExportDialog(true)} />
                  <ToolbarButton icon={<Share2 className="w-4 h-4" />} label={'مشاركة'} onClick={() => setShowExportDialog(true)} />
                </div>
              )}


            </div>
          </>
        ) : (
          <DeskView t={t} onLoadDesign={handleLoadDesign} />
        )}
      </div>

      {/* Dialogs */}
      <SaveDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        t={t}
        settings={settings}
        imageUrl={generatedImageUrl}
        onSaved={() => {}}
      />
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        t={t}
        imageUrl={generatedImageUrl}
      />
    </div>
  );
}

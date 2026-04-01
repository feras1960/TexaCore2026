/**
 * ════════════════════════════════════════════════════════════════
 * 📊 DataEngineIndicator — مؤشر تحميل البيانات في الهيدر
 * ════════════════════════════════════════════════════════════════
 *
 * يعرض حالة تحميل DataEngine:
 *   - 🔄 أثناء التحميل: دائرة متحركة + نسبة + اسم القسم
 *   - ✅ بعد الاكتمال: أيقونة خضراء لثانيتين ثم تختفي
 *   - ⚠️ عند خطأ: أيقونة تحذير
 *
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useDataEngine } from './DataEngineProvider';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DataEngineIndicator() {
  const { progress } = useDataEngine();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [visible, setVisible] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (progress.status === 'loading') {
      setVisible(true);
      setShowDone(false);
    } else if (progress.status === 'done' && progress.total > 0) {
      // Show ✅ for 2.5 seconds then fade out
      setShowDone(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setShowDone(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else if (progress.status === 'error') {
      setVisible(true);
    }
  }, [progress.status, progress.total]);

  if (!visible && progress.status !== 'loading') return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-500',
        progress.status === 'loading' && 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
        showDone && 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
        progress.status === 'error' && 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
        !visible && 'opacity-0 pointer-events-none',
      )}
      title={
        progress.status === 'loading'
          ? (isRTL ? `تحميل البيانات: ${progress.currentModule}` : `Loading: ${progress.currentModule}`)
          : progress.status === 'done'
            ? (isRTL ? 'البيانات جاهزة' : 'Data ready')
            : (isRTL ? 'خطأ في التحميل' : 'Loading error')
      }
    >
      {/* Icon */}
      {progress.status === 'loading' && (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      )}
      {showDone && (
        <CheckCircle2 className="w-3.5 h-3.5" />
      )}
      {progress.status === 'error' && (
        <AlertCircle className="w-3.5 h-3.5" />
      )}

      {/* Text */}
      {progress.status === 'loading' && (
        <span className="hidden sm:inline tabular-nums">
          {progress.percent}%
          <span className="ms-1 text-[10px] opacity-70 max-w-[80px] truncate inline-block align-bottom">
            {progress.currentModule}
          </span>
        </span>
      )}
      {showDone && (
        <span className="hidden sm:inline">
          {isRTL ? 'جاهز' : 'Ready'}
        </span>
      )}
    </div>
  );
}

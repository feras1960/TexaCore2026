// ════════════════════════════════════════════════════════════════
// 🎯 Onboarding Wizard — Interactive Setup Guide for New Users
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useTour } from '@/components/tour/InteractiveTour';
import {
  Building2, Package, Users, Receipt, Warehouse,
  CheckCircle2, ArrowRight, ArrowLeft, X, Sparkles, ChevronLeft, ChevronRight,
  CircleDollarSign, Settings, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────
interface OnboardingStep {
  id: string;
  icon: any;
  color: string;
  route: string;
}

// ─── Translations ────────────────────────────────────────────
const OB_TEXT: Record<string, Record<string, string>> = {
  step: { ar: 'خطوة', en: 'Step' },
  of: { ar: 'من', en: 'of' },
  skip: { ar: 'تخطي', en: 'Skip' },
  next: { ar: 'التالي', en: 'Next' },
  prev: { ar: 'السابق', en: 'Previous' },
  finish: { ar: '🎉 ابدأ العمل', en: '🎉 Start Working' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  dont_show: { ar: 'لا تظهر مرة أخرى', en: "Don't show again" },

  // Steps — reordered: warehouses first, settings last
  step1_title: { ar: '🏪 إنشاء المستودعات', en: '🏪 Create Warehouses' },
  step1_desc: {
    ar: 'أنشئ مستودعاتك لتتبع المخزون. يمكنك إضافة مستودع رئيسي ومستودعات فرعية.',
    en: 'Create your warehouses to track inventory. Add a main warehouse and sub-warehouses.',
  },
  step1_action: { ar: 'المستودعات', en: 'Warehouses' },

  step2_title: { ar: '📦 إضافة المواد', en: '📦 Add Materials' },
  step2_desc: {
    ar: 'أضف منتجاتك وموادك مع الأسعار والألوان والمقاسات. يمكنك الاستيراد من Excel أيضاً.',
    en: 'Add your products with prices, colors, and sizes. You can also import from Excel.',
  },
  step2_action: { ar: 'المواد', en: 'Materials' },

  step3_title: { ar: '👥 إضافة الزبائن والموردين', en: '👥 Add Customers & Suppliers' },
  step3_desc: {
    ar: 'أضف عملاءك ومورديك لتتمكن من إنشاء الفواتير وتتبع الحسابات.',
    en: 'Add your customers and suppliers to create invoices and track accounts.',
  },
  step3_action: { ar: 'الزبائن', en: 'Customers' },

  step4_title: { ar: '💰 إعداد الصناديق', en: '💰 Setup Cash Funds' },
  step4_desc: {
    ar: 'أنشئ صناديقك النقدية وحساباتك البنكية لتسجيل المقبوضات والمصروفات.',
    en: 'Create cash funds and bank accounts to record receipts and payments.',
  },
  step4_action: { ar: 'الصناديق', en: 'Funds' },

  step5_title: { ar: '📄 أول فاتورة مبيعات', en: '📄 First Sales Invoice' },
  step5_desc: {
    ar: 'أنشئ أول فاتورة مبيعات لعميل. يتم ترحيل القيد المحاسبي تلقائياً.',
    en: 'Create your first sales invoice. The accounting entry is auto-posted.',
  },
  step5_action: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },

  step6_title: { ar: '⚙️ إعدادات النظام', en: '⚙️ System Settings' },
  step6_desc: {
    ar: 'راجع إعدادات النظام: العملات، الضرائب، والتفضيلات. يمكنك تخصيصها لاحقاً.',
    en: 'Review system settings: currencies, taxes, and preferences. Customize anytime.',
  },
  step6_action: { ar: 'الإعدادات', en: 'Settings' },

  step7_title: { ar: '🚀 جاهز للعمل!', en: '🚀 Ready to Go!' },
  step7_desc: {
    ar: 'تهانينا! نظامك جاهز. يمكنك دائماً الوصول للمساعدة من أيقونة الذكاء الاصطناعي.',
    en: "Congratulations! Your system is ready. Access help anytime from the AI assistant icon.",
  },
  step7_action: { ar: 'لوحة التحكم', en: 'Dashboard' },
};

const t = (key: string, lang: string) => OB_TEXT[key]?.[lang] || OB_TEXT[key]?.en || key;

// ─── Steps Config (reordered: settings before ready) ─────────
const STEPS: OnboardingStep[] = [
  { id: 'warehouses', icon: Warehouse, color: '#8b5cf6', route: '/warehouse/warehouses' },
  { id: 'materials', icon: Package, color: '#f59e0b', route: '/warehouse/materials' },
  { id: 'customers', icon: Users, color: '#10b981', route: '/accounting/customers' },
  { id: 'funds', icon: CircleDollarSign, color: '#ec4899', route: '/accounting/funds' },
  { id: 'invoice', icon: Receipt, color: '#6366f1', route: '/sales' },
  { id: 'settings', icon: Settings, color: '#0ea5e9', route: '/system-config' },
  { id: 'ready', icon: Rocket, color: '#22c55e', route: '/' },
];

// ─── Onboarding Storage ──────────────────────────────────────
const STORAGE_KEY = 'texacore_onboarding';

function getOnboardingState(): { dismissed: boolean; completedSteps: string[] } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { dismissed: false, completedSteps: [] };
}

function saveOnboardingState(state: { dismissed: boolean; completedSteps: string[] }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Hook ────────────────────────────────────────────────────
export function useOnboarding() {
  const [state, setState] = useState(getOnboardingState);
  const { user } = useAuth();

  const shouldShowWizard = useMemo(() => {
    if (!user) return false;
    if (localStorage.getItem('texacore_force_onboarding') === 'true') return true;
    if (state.completedSteps.length === 0) return true;
    const created = new Date(user.created_at);
    const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation < 30;
  }, [user, state.completedSteps.length]);

  const shouldShow = !state.dismissed && shouldShowWizard;

  const completeStep = useCallback((stepId: string) => {
    setState(prev => {
      const newSteps = prev.completedSteps.includes(stepId)
        ? prev.completedSteps
        : [...prev.completedSteps, stepId];
      const newState = { ...prev, completedSteps: newSteps };
      saveOnboardingState(newState);
      return newState;
    });
  }, []);

  const dismiss = useCallback(() => {
    localStorage.removeItem('texacore_force_onboarding');
    setState(prev => {
      const newState = { ...prev, dismissed: true };
      saveOnboardingState(newState);
      return newState;
    });
  }, []);

  const reset = useCallback(() => {
    const newState = { dismissed: false, completedSteps: [] };
    saveOnboardingState(newState);
    setState(newState);
  }, []);

  return { shouldShow, state, completeStep, dismiss, reset };
}

// ─── Onboarding Wizard Component ─────────────────────────────
export function OnboardingWizard() {
  const { language, dir } = useLanguage();
  const lang = language || 'en';
  const isRTL = dir === 'rtl';
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldShow, state, completeStep, dismiss } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const tour = useTour();

  // Only show on dashboard
  const isOnDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    if (shouldShow && isOnDashboard) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [shouldShow, isOnDashboard]);

  if (!shouldShow || !isVisible || !isOnDashboard) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;
  const isCompleted = state.completedSteps.includes(step.id);
  const totalCompleted = state.completedSteps.length;
  const progress = (totalCompleted / (STEPS.length - 1)) * 100;

  // RTL: forward = left, backward = right
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const BackwardArrow = isRTL ? ArrowRight : ArrowLeft;
  const ActionChevron = isRTL ? ChevronLeft : ChevronRight;

  const handleGoTo = () => {
    completeStep(step.id);
    dismiss();
    navigate(step.route);
  };

  const handleFinish = () => {
    completeStep(step.id);
    dismiss();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={cn(
          'relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden',
          'animate-in slide-in-from-bottom-4 zoom-in-95 duration-500'
        )}
        dir={dir}
      >
        {/* ── Header Gradient ─── */}
        <div
          className="relative px-8 pt-8 pb-6"
          style={{ background: `linear-gradient(135deg, ${step.color}15, ${step.color}08)` }}
        >
          {/* Close Button */}
          <button
            onClick={dismiss}
            className="absolute top-4 start-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Step Counter */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: step.color }} />
            <span className="text-sm font-semibold" style={{ color: step.color }}>
              {t('step', lang)} {currentStep + 1} {t('of', lang)} {STEPS.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: step.color,
                marginInlineStart: isRTL ? 'auto' : undefined,
                marginInlineEnd: isRTL ? '0' : undefined,
                float: isRTL ? 'right' : 'left',
              }}
            />
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = state.completedSteps.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isActive ? 'scale-110 shadow-lg' : 'hover:scale-105'
                  )}
                  style={{
                    backgroundColor: isActive ? step.color : isDone ? `${s.color}25` : '#e5e7eb',
                    border: isActive ? 'none' : isDone ? `2px solid ${s.color}` : 'none',
                  }}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: s.color }} />
                  ) : (
                    <s.icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-gray-400')} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ─── */}
        <div className="px-8 py-6">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${step.color}15` }}
            >
              <StepIcon className="w-7 h-7" style={{ color: step.color }} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {t(`step${currentStep + 1}_title`, lang)}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t(`step${currentStep + 1}_desc`, lang)}
              </p>
            </div>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {t('completed', lang)} ✓
              </span>
            </div>
          )}
        </div>

        {/* ── Actions — RTL-aware ─── */}
        <div className="px-8 pb-6">
          {/* Primary row: action buttons aligned to end (right in RTL) */}
          <div className="flex items-center justify-end gap-2 mb-3">
            {isLast ? (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={() => {
                    completeStep(step.id);
                    dismiss();
                    tour.startTour();
                  }}
                  className="gap-2 px-6 text-white font-bold rounded-xl shadow-lg w-full"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  {lang === 'ar' ? '🎓 بدء الجولة التفاعلية' : '🎓 Start Interactive Tour'}
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleFinish}
                  variant="ghost"
                  className="gap-2 text-gray-500"
                >
                  {t('finish', lang)}
                  <Rocket className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleGoTo}
                  variant="outline"
                  className="gap-2 rounded-xl border-2"
                  style={{ borderColor: step.color, color: step.color }}
                >
                  {t(`step${currentStep + 1}_action`, lang)}
                  <ActionChevron className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="gap-2 text-white font-semibold rounded-xl"
                  style={{ backgroundColor: step.color }}
                >
                  {t('next', lang)}
                  <ForwardArrow className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Secondary row: navigation + skip */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="gap-1 text-gray-500"
                >
                  <BackwardArrow className="w-3.5 h-3.5" />
                  {t('prev', lang)}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              {t('skip', lang)}
            </Button>
          </div>
        </div>

        {/* ── Don't show again ─── */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-8 py-3 flex justify-center">
          <button
            onClick={dismiss}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('dont_show', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Checklist (for sidebar/dashboard) ──────────────────
export function OnboardingChecklist() {
  const { language } = useLanguage();
  const lang = language || 'en';
  const navigate = useNavigate();
  const { state, completeStep } = useOnboarding();

  if (state.completedSteps.length >= STEPS.length - 1) return null;

  const remaining = STEPS.slice(0, -1).filter(s => !state.completedSteps.includes(s.id));
  if (remaining.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
          {lang === 'ar' ? 'خطوات الإعداد' : 'Setup Steps'}
        </h3>
        <span className="ms-auto text-xs text-blue-500 font-mono">
          {state.completedSteps.length}/{STEPS.length - 1}
        </span>
      </div>

      <div className="space-y-2">
        {STEPS.slice(0, -1).map((step, i) => {
          const isDone = state.completedSteps.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={() => {
                completeStep(step.id);
                navigate(step.route);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-start transition-all',
                isDone
                  ? 'bg-green-100/50 dark:bg-green-900/20'
                  : 'hover:bg-white/80 dark:hover:bg-white/5'
              )}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isDone ? '#dcfce7' : `${step.color}15` }}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <step.icon className="w-4 h-4" style={{ color: step.color }} />
                )}
              </div>
              <span className={cn(
                'text-sm',
                isDone ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200 font-medium'
              )}>
                {t(`step${i + 1}_title`, lang)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Start Tour button */}
      <button
        onClick={() => {
          try {
            const event = new CustomEvent('texacore:start-tour');
            window.dispatchEvent(event);
          } catch {}
        }}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {lang === 'ar' ? 'بدء الجولة التعريفية' : 'Start Guided Tour'}
      </button>
    </div>
  );
}

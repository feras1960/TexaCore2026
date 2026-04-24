// ════════════════════════════════════════════════════════════════
// 🎯 Onboarding Wizard — Interactive Setup Guide for New Users
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2, Package, Users, ShoppingCart, Receipt, Warehouse,
  CheckCircle2, ArrowRight, ArrowLeft, X, Sparkles, ChevronRight,
  FileText, CircleDollarSign, Settings, BarChart3, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────
interface OnboardingStep {
  id: string;
  icon: any;
  color: string;
  route: string;
  isCompleted?: () => boolean;
}

// ─── Translations ────────────────────────────────────────────
const OB_TEXT: Record<string, Record<string, string>> = {
  welcome_title: {
    ar: '👋 مرحباً بك في TexaCore ERP',
    en: '👋 Welcome to TexaCore ERP',
  },
  welcome_subtitle: {
    ar: 'دعنا نساعدك في إعداد نظامك خطوة بخطوة',
    en: "Let's help you set up your system step by step",
  },
  step: { ar: 'خطوة', en: 'Step' },
  of: { ar: 'من', en: 'of' },
  skip: { ar: 'تخطي', en: 'Skip' },
  next: { ar: 'التالي', en: 'Next' },
  prev: { ar: 'السابق', en: 'Previous' },
  go_to: { ar: 'ابدأ الآن', en: 'Go to' },
  finish: { ar: '🎉 ابدأ العمل', en: '🎉 Start Working' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  dont_show: { ar: 'لا تظهر مرة أخرى', en: "Don't show again" },

  // Steps
  step1_title: { ar: '🏢 إعداد الشركة', en: '🏢 Company Setup' },
  step1_desc: {
    ar: 'أضف معلومات شركتك الأساسية: الاسم، الشعار، العملة الافتراضية، وبيانات الضريبة.',
    en: 'Add your basic company info: name, logo, default currency, and tax details.',
  },
  step1_action: { ar: 'إعدادات الشركة', en: 'Company Settings' },

  step2_title: { ar: '🏪 إنشاء المستودعات', en: '🏪 Create Warehouses' },
  step2_desc: {
    ar: 'أنشئ مستودعاتك لتتبع المخزون. يمكنك إضافة مستودع رئيسي ومستودعات فرعية.',
    en: 'Create your warehouses to track inventory. Add a main warehouse and sub-warehouses.',
  },
  step2_action: { ar: 'المستودعات', en: 'Warehouses' },

  step3_title: { ar: '📦 إضافة المواد', en: '📦 Add Materials' },
  step3_desc: {
    ar: 'أضف منتجاتك وموادك مع الأسعار والألوان والمقاسات. يمكنك الاستيراد من Excel أيضاً.',
    en: 'Add your products with prices, colors, and sizes. You can also import from Excel.',
  },
  step3_action: { ar: 'المواد', en: 'Materials' },

  step4_title: { ar: '👥 إضافة العملاء والموردين', en: '👥 Add Customers & Suppliers' },
  step4_desc: {
    ar: 'أضف عملاءك ومورديك لتتمكن من إنشاء الفواتير وتتبع الحسابات.',
    en: 'Add your customers and suppliers to create invoices and track accounts.',
  },
  step4_action: { ar: 'العملاء', en: 'Customers' },

  step5_title: { ar: '💰 إعداد الصناديق', en: '💰 Setup Cash Funds' },
  step5_desc: {
    ar: 'أنشئ صناديقك النقدية وحساباتك البنكية لتسجيل المقبوضات والمصروفات.',
    en: 'Create cash funds and bank accounts to record receipts and payments.',
  },
  step5_action: { ar: 'الصناديق', en: 'Funds' },

  step6_title: { ar: '📄 أول فاتورة مبيعات', en: '📄 First Sales Invoice' },
  step6_desc: {
    ar: 'أنشئ أول فاتورة مبيعات لعميل. يتم ترحيل القيد المحاسبي تلقائياً.',
    en: 'Create your first sales invoice. The accounting entry is auto-posted.',
  },
  step6_action: { ar: 'فاتورة مبيعات', en: 'Sales Invoice' },

  step7_title: { ar: '🚀 جاهز للعمل!', en: '🚀 Ready to Go!' },
  step7_desc: {
    ar: 'تهانينا! نظامك جاهز. يمكنك دائماً الوصول للمساعدة من أيقونة الذكاء الاصطناعي.',
    en: "Congratulations! Your system is ready. You can always access help from the AI assistant icon.",
  },
  step7_action: { ar: 'لوحة التحكم', en: 'Dashboard' },
};

const t = (key: string, lang: string) => OB_TEXT[key]?.[lang] || OB_TEXT[key]?.en || key;

// ─── Steps Config ────────────────────────────────────────────
const STEPS: OnboardingStep[] = [
  { id: 'company', icon: Building2, color: '#0ea5e9', route: '/settings' },
  { id: 'warehouses', icon: Warehouse, color: '#8b5cf6', route: '/warehouse/warehouses' },
  { id: 'materials', icon: Package, color: '#f59e0b', route: '/warehouse/materials' },
  { id: 'customers', icon: Users, color: '#10b981', route: '/accounting/customers' },
  { id: 'funds', icon: CircleDollarSign, color: '#ec4899', route: '/accounting/funds' },
  { id: 'invoice', icon: Receipt, color: '#6366f1', route: '/sales' },
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

  const isNewUser = useMemo(() => {
    if (!user) return false;
    const created = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation < 30; // Show for users created within 30 days
  }, [user]);

  const shouldShow = !state.dismissed && isNewUser;

  const completeStep = useCallback((stepId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        completedSteps: [...new Set([...prev.completedSteps, stepId])],
      };
      saveOnboardingState(newState);
      return newState;
    });
  }, []);

  const dismiss = useCallback(() => {
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
  const { shouldShow, state, completeStep, dismiss } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!shouldShow || !isVisible) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;
  const isCompleted = state.completedSteps.includes(step.id);
  const totalCompleted = state.completedSteps.length;
  const progress = (totalCompleted / (STEPS.length - 1)) * 100;

  const handleGoTo = () => {
    completeStep(step.id);
    dismiss(); // Close wizard
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
            className="absolute top-4 end-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Step Counter */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: step.color }} />
            <span className="text-sm font-semibold" style={{ color: step.color }}>
              {t('step', lang)} {currentStep + 1} {t('of', lang)} {STEPS.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, backgroundColor: step.color }}
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
                    isActive
                      ? 'scale-110 shadow-lg'
                      : 'hover:scale-105'
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
          {/* Icon + Title */}
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

          {/* Completed Badge */}
          {isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {t('completed', lang)} ✓
              </span>
            </div>
          )}
        </div>

        {/* ── Actions ─── */}
        <div className="px-8 pb-6 flex items-center justify-between gap-3">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="gap-2"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                {t('prev', lang)}
              </Button>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={dismiss}
              className="text-gray-500 hover:text-gray-700"
            >
              {t('skip', lang)}
            </Button>

            {isLast ? (
              <Button
                onClick={handleFinish}
                className="gap-2 px-6 text-white font-bold rounded-xl shadow-lg"
                style={{ backgroundColor: step.color }}
              >
                {t('finish', lang)}
                <Rocket className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleGoTo}
                  variant="outline"
                  className="gap-2 rounded-xl border-2"
                  style={{ borderColor: step.color, color: step.color }}
                >
                  {t(`step${currentStep + 1}_action`, lang)}
                  <ChevronRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
                </Button>
                <Button
                  onClick={() => {
                    setCurrentStep(currentStep + 1);
                  }}
                  className="gap-2 text-white font-semibold rounded-xl"
                  style={{ backgroundColor: step.color }}
                >
                  {t('next', lang)}
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </>
            )}
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
  const { state, completeStep, dismiss } = useOnboarding();

  // Don't show if dismissed or all steps completed
  if (state.dismissed && state.completedSteps.length >= STEPS.length - 1) return null;
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
    </div>
  );
}

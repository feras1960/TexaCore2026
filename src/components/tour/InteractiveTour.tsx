// ════════════════════════════════════════════════════════════════
// 🎓 Interactive Tour — Step-by-step guided tour for new users
// Highlights UI elements with spotlight + tooltip
// ════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  ArrowLeft, ArrowRight, X, SkipForward, ChevronLeft, ChevronRight,
  Sparkles, Package, Warehouse, Users, CircleDollarSign, Receipt,
  Settings, UserPlus, MessageCircle, ShoppingCart, TreePine
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tour Step Definition ────────────────────────────────────
export interface TourStep {
  id: string;
  /** CSS selector for the target element to highlight */
  target: string;
  /** Route to navigate to before showing this step */
  route?: string;
  /** Title translations */
  title: { ar: string; en: string };
  /** Description translations */
  desc: { ar: string; en: string };
  /** Position of the tooltip relative to the target */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Icon for the step */
  icon?: any;
  /** Color theme */
  color?: string;
  /** Phase/group name */
  phase?: string;
}

// ─── All Tour Steps ──────────────────────────────────────────
export const TOUR_STEPS: TourStep[] = [
  // ── Phase 1: المستودعات ──
  {
    id: 'nav-warehouse',
    target: '[data-tour="nav-warehouse"]',
    route: '/',
    title: { ar: '🏪 المستودعات', en: '🏪 Warehouses' },
    desc: {
      ar: 'من هنا تدخل لقسم المستودعات — لإدارة مخازنك والمواد والجرد.',
      en: 'Access the Warehouses section — manage storage locations, materials, and inventory.'
    },
    position: 'left',
    icon: Warehouse,
    color: '#8b5cf6',
    phase: 'warehouses',
  },
  // ── Phase 2: المواد ──
  {
    id: 'nav-materials',
    target: '[data-tour="nav-materials"]',
    route: '/warehouse',
    title: { ar: '📦 المواد والمنتجات', en: '📦 Materials & Products' },
    desc: {
      ar: 'هنا تضيف المواد والمنتجات مع الأسعار والألوان والمقاسات. يمكنك أيضاً الاستيراد من Excel.',
      en: 'Add your products with prices, colors, and sizes. You can also import from Excel.'
    },
    position: 'left',
    icon: Package,
    color: '#f59e0b',
    phase: 'materials',
  },
  // ── Phase 3: الشجرة المحاسبية ──
  {
    id: 'nav-accounting',
    target: '[data-tour="nav-accounting"]',
    route: '/',
    title: { ar: '📊 المحاسبة', en: '📊 Accounting' },
    desc: {
      ar: 'قسم المحاسبة يحتوي على شجرة الحسابات، القيود، الصناديق، وكشوف الحساب. شجرة الحسابات تم إعدادها تلقائياً.',
      en: 'The Accounting module includes Chart of Accounts, Journal Entries, Funds, and Statements. Your chart is auto-configured.'
    },
    position: 'left',
    icon: TreePine,
    color: '#10b981',
    phase: 'accounting',
  },
  // ── Phase 4: الزبائن والموردين ──
  {
    id: 'nav-customers',
    target: '[data-tour="nav-customers"]',
    route: '/',
    title: { ar: '👥 إدارة الزبائن', en: '👥 Customer Management' },
    desc: {
      ar: 'أضف عملاءك ومورديك لإنشاء الفواتير وتتبع الأرصدة والحسابات.',
      en: 'Add customers and suppliers to create invoices and track accounts.'
    },
    position: 'left',
    icon: Users,
    color: '#3b82f6',
    phase: 'customers',
  },
  // ── Phase 5: المبيعات ──
  {
    id: 'nav-sales',
    target: '[data-tour="nav-sales"]',
    route: '/',
    title: { ar: '🛒 المبيعات', en: '🛒 Sales' },
    desc: {
      ar: 'من هنا تدير دورة المبيعات الكاملة: عروض أسعار ← أوامر بيع ← فواتير ← مرتجعات. القيود المحاسبية تُنشأ تلقائياً.',
      en: 'Manage the full sales cycle: Quotations → Orders → Invoices → Returns. Accounting entries are auto-generated.'
    },
    position: 'left',
    icon: ShoppingCart,
    color: '#6366f1',
    phase: 'sales',
  },
  // ── Phase 6: المشتريات ──
  {
    id: 'nav-purchases',
    target: '[data-tour="nav-purchases"]',
    route: '/',
    title: { ar: '📥 المشتريات', en: '📥 Purchases' },
    desc: {
      ar: 'أوامر الشراء والاستلام والفواتير. عند الاستلام، البضاعة تدخل المستودع والقيد المحاسبي يُرحّل تلقائياً.',
      en: 'Purchase orders, receiving, and invoices. On receiving, inventory updates and accounting entries are auto-posted.'
    },
    position: 'left',
    icon: Receipt,
    color: '#ec4899',
    phase: 'purchases',
  },
  // ── Phase 7: الصناديق والبنوك ──
  {
    id: 'nav-funds',
    target: '[data-tour="nav-accounting"]',
    route: '/',
    title: { ar: '💰 الصناديق والبنوك', en: '💰 Cash Funds & Banks' },
    desc: {
      ar: 'في قسم المحاسبة ستجد الصناديق والبنوك — لتسجيل المقبوضات والمصروفات والتحويلات بين الصناديق.',
      en: 'Inside Accounting you\'ll find Funds & Banks — record receipts, payments, and transfers between funds.'
    },
    position: 'left',
    icon: CircleDollarSign,
    color: '#f59e0b',
    phase: 'funds',
  },
  // ── Phase 8: الإعدادات ──
  {
    id: 'nav-settings',
    target: '[data-tour="nav-settings"]',
    route: '/',
    title: { ar: '⚙️ الإعدادات', en: '⚙️ Settings' },
    desc: {
      ar: 'من هنا تُعدّل العملات، الضرائب، المستخدمين والصلاحيات، وتكاملات التلغرام.',
      en: 'Configure currencies, taxes, users & permissions, and Telegram integrations.'
    },
    position: 'left',
    icon: Settings,
    color: '#0ea5e9',
    phase: 'settings',
  },
  // ── Phase 9: الذكاء الاصطناعي ──
  {
    id: 'nav-ai',
    target: '[data-tour="nav-ai"]',
    route: '/',
    title: { ar: '🤖 مساعد الذكاء الاصطناعي', en: '🤖 AI Assistant' },
    desc: {
      ar: 'وكيل NexaPro — مساعدك الذكي. اسأله أي سؤال عن البرنامج وسيساعدك فوراً.',
      en: 'NexaPro Agent — your AI assistant. Ask any question about the system and get instant help.'
    },
    position: 'left',
    icon: MessageCircle,
    color: '#8b5cf6',
    phase: 'ai',
  },
  // ── Phase 10: لوحة التحكم ──
  {
    id: 'nav-dashboard',
    target: '[data-tour="nav-dashboard"]',
    route: '/',
    title: { ar: '🎉 لوحة التحكم — أنت جاهز!', en: '🎉 Dashboard — You\'re Ready!' },
    desc: {
      ar: 'لوحة التحكم تعرض ملخص أعمالك: الأرصدة، المبيعات، التدفقات النقدية، وتنبيهات مهمة. ابدأ العمل الآن!',
      en: 'Your Dashboard shows a business summary: balances, sales, cash flow, and key alerts. Start working now!'
    },
    position: 'left',
    icon: Sparkles,
    color: '#22c55e',
    phase: 'dashboard',
  },
];

// ─── Tour Storage ────────────────────────────────────────────
const TOUR_STORAGE_KEY = 'texacore_interactive_tour';

interface TourState {
  active: boolean;
  currentStep: number;
  completed: boolean;
  dismissed: boolean;
}

function getTourState(): TourState {
  try {
    const s = localStorage.getItem(TOUR_STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { active: false, currentStep: 0, completed: false, dismissed: false };
}

function saveTourState(state: TourState) {
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
}

// ─── Tour Context ────────────────────────────────────────────
interface TourContextType {
  state: TourState;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  goToStep: (index: number) => void;
  resetTour: () => void;
  currentStepData: TourStep | null;
  totalSteps: number;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}

// ─── Tour Provider ───────────────────────────────────────────
export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TourState>(getTourState);
  const navigate = useNavigate();

  const update = useCallback((partial: Partial<TourState>) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      saveTourState(next);
      return next;
    });
  }, []);

  const startTour = useCallback(() => {
    update({ active: true, currentStep: 0, completed: false, dismissed: false });
    navigate('/');
  }, [update, navigate]);

  // Listen for custom event from OnboardingChecklist
  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener('texacore:start-tour', handler);
    return () => window.removeEventListener('texacore:start-tour', handler);
  }, [startTour]);

  const nextStep = useCallback(() => {
    const next = state.currentStep + 1;
    if (next >= TOUR_STEPS.length) {
      update({ active: false, completed: true, currentStep: 0 });
    } else {
      const step = TOUR_STEPS[next];
      if (step.route) navigate(step.route);
      update({ currentStep: next });
    }
  }, [state.currentStep, update, navigate]);

  const prevStep = useCallback(() => {
    const prev = Math.max(0, state.currentStep - 1);
    const step = TOUR_STEPS[prev];
    if (step.route) navigate(step.route);
    update({ currentStep: prev });
  }, [state.currentStep, update, navigate]);

  const skipTour = useCallback(() => {
    update({ active: false, dismissed: true });
  }, [update]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      const step = TOUR_STEPS[index];
      if (step.route) navigate(step.route);
      update({ currentStep: index, active: true });
    }
  }, [update, navigate]);

  const resetTour = useCallback(() => {
    const fresh: TourState = { active: false, currentStep: 0, completed: false, dismissed: false };
    saveTourState(fresh);
    setState(fresh);
  }, []);

  const currentStepData = state.active ? TOUR_STEPS[state.currentStep] : null;

  return (
    <TourContext.Provider value={{
      state, startTour, nextStep, prevStep, skipTour, goToStep, resetTour,
      currentStepData, totalSteps: TOUR_STEPS.length
    }}>
      {children}
      {state.active && <TourSpotlight />}
    </TourContext.Provider>
  );
}

// ─── Tour Spotlight Overlay ──────────────────────────────────
function TourSpotlight() {
  const { state, nextStep, prevStep, skipTour, totalSteps, currentStepData } = useTour();
  const { language, dir } = useLanguage();
  const lang = language || 'en';
  const isRTL = dir === 'rtl';
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = currentStepData;
  if (!step) return null;

  const StepIcon = step.icon || Sparkles;
  const isFirst = state.currentStep === 0;
  const isLast = state.currentStep === totalSteps - 1;
  const progress = ((state.currentStep + 1) / totalSteps) * 100;

  // RTL arrows
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const BackwardArrow = isRTL ? ArrowRight : ArrowLeft;

  // Find and highlight target element
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const findTarget = () => {
      const el = document.querySelector(step.target) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate tooltip position
        const pad = 16;
        let top = rect.top;
        let left = rect.left;

        const pos = step.position || 'left';
        if (pos === 'left') {
          left = isRTL ? rect.right + pad : rect.left - 380 - pad;
          top = rect.top + rect.height / 2 - 100;
        } else if (pos === 'right') {
          left = isRTL ? rect.left - 380 - pad : rect.right + pad;
          top = rect.top + rect.height / 2 - 100;
        } else if (pos === 'bottom') {
          top = rect.bottom + pad;
          left = rect.left + rect.width / 2 - 190;
        } else if (pos === 'top') {
          top = rect.top - 220 - pad;
          left = rect.left + rect.width / 2 - 190;
        }

        // Clamp to viewport
        top = Math.max(16, Math.min(top, window.innerHeight - 300));
        left = Math.max(16, Math.min(left, window.innerWidth - 400));

        setTooltipPos({ top, left });

        // Scroll element into view
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        setTargetRect(null);
      }
    };

    // Delay to let page render after navigation
    const timer = setTimeout(findTarget, 400);
    window.addEventListener('resize', findTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findTarget);
    };
  }, [step, isRTL]);

  // Spotlight mask with hole
  const maskStyle = targetRect ? {
    clipPath: `polygon(
      0% 0%, 0% 100%, 
      ${targetRect.left - 8}px 100%, 
      ${targetRect.left - 8}px ${targetRect.top - 8}px, 
      ${targetRect.right + 8}px ${targetRect.top - 8}px, 
      ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
      ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
      ${targetRect.left - 8}px 100%, 
      100% 100%, 100% 0%
    )`
  } : {};

  return (
    <div className="fixed inset-0 z-[9998]" ref={overlayRef}>
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-500"
        style={maskStyle}
        onClick={skipTour}
      />

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-white/80 shadow-[0_0_0_4px_rgba(59,130,246,0.5)] animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            transition: 'all 0.5s ease-out',
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="absolute w-[360px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-2 duration-400"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        dir={dir}
      >
        {/* Header */}
        <div
          className="px-5 pt-4 pb-3 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${step.color}12, transparent)` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${step.color}20` }}
          >
            <StepIcon className="w-5 h-5" style={{ color: step.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {step.title[lang as 'ar' | 'en'] || step.title.en}
            </h3>
            <span className="text-xs" style={{ color: step.color }}>
              {state.currentStep + 1} / {totalSteps}
            </span>
          </div>
          <button
            onClick={skipTour}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5">
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: step.color }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {step.desc[lang as 'ar' | 'en'] || step.desc.en}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex items-center gap-2">
          {/* Previous */}
          {!isFirst && (
            <button
              onClick={prevStep}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <BackwardArrow className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'السابق' : 'Previous'}
            </button>
          )}

          <div className="flex-1" />

          {/* Skip */}
          <button
            onClick={skipTour}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'تخطي' : 'Skip'}
          </button>

          {/* Next / Finish */}
          <button
            onClick={nextStep}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:shadow-lg active:scale-95"
            style={{ backgroundColor: step.color }}
          >
            {isLast
              ? (lang === 'ar' ? '🎉 إنهاء' : '🎉 Finish')
              : (lang === 'ar' ? 'التالي' : 'Next')
            }
            {!isLast && <ForwardArrow className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Start Tour Button (for use in Settings or Sidebar) ──────
export function StartTourButton({ className }: { className?: string }) {
  const { startTour, state } = useTour();
  const { language } = useLanguage();

  if (state.active) return null;

  return (
    <button
      onClick={startTour}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl',
        'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md',
        'hover:shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all',
        className
      )}
    >
      <Sparkles className="w-4 h-4" />
      {language === 'ar' ? 'بدء الجولة التعريفية' : 'Start Guided Tour'}
    </button>
  );
}

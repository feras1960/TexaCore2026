// ════════════════════════════════════════════════════════════════
// 🧙 Desktop Setup Wizard — First-Run Setup for Local Edition
// ════════════════════════════════════════════════════════════════
// Based on the cloud FabricRegistrationWizard, adapted for:
// - Local Auth (no Supabase Auth)
// - Auto language detection from OS
// - .texacore company file creation
// - Google Drive backup integration
// - Local PostgreSQL setup

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Globe, Store, Coins, Shield, BookOpen, Receipt,
  HardDrive, Cloud, Rocket, ChevronRight, ChevronLeft,
  Check, Loader2, Sparkles,
} from 'lucide-react';

import { WIZARD_STEPS, DEFAULT_SETUP_DATA, SUPPORTED_LANGUAGES, type DesktopSetupData } from './types';
import { StepLanguage } from './steps/StepLanguage';
import { StepCompany } from './steps/StepCompany';
import { StepCurrencies } from './steps/StepCurrencies';
import { StepAdmin } from './steps/StepAdmin';
import { StepAccounts } from './steps/StepAccounts';
import { StepTaxes } from './steps/StepTaxes';
import { StepStorage } from './steps/StepStorage';
import { StepGoogleDrive } from './steps/StepGoogleDrive';
import { toast } from 'sonner';

// ─── Step metadata ─────────────────────────────────────
const STEP_META = [
  { id: 'language', icon: Globe, color: '#0ea5e9', ar: 'اللغة', en: 'Language' },
  { id: 'company', icon: Store, color: '#0d9488', ar: 'الشركة', en: 'Company' },
  { id: 'currencies', icon: Coins, color: '#f59e0b', ar: 'العملات', en: 'Currencies' },
  { id: 'admin', icon: Shield, color: '#ef4444', ar: 'المدير', en: 'Admin' },
  { id: 'accounts', icon: BookOpen, color: '#8b5cf6', ar: 'الحسابات', en: 'Accounts' },
  { id: 'taxes', icon: Receipt, color: '#ec4899', ar: 'الضرائب', en: 'Taxes' },
  { id: 'storage', icon: HardDrive, color: '#10b981', ar: 'الحفظ', en: 'Storage' },
  { id: 'google-drive', icon: Cloud, color: '#3b82f6', ar: 'السحابة', en: 'Cloud' },
  { id: 'complete', icon: Rocket, color: '#22c55e', ar: 'انتهاء', en: 'Done' },
];

// ─── Auto-detect OS language ────────────────────────────
function detectOSLanguage(): string {
  const navLang = navigator.language?.split('-')[0] || 'en';
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  return supported.includes(navLang) ? navLang : 'en';
}

export default function DesktopSetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<DesktopSetupData>(() => ({
    ...DEFAULT_SETUP_DATA,
    language: detectOSLanguage(),
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState('');

  const lang = data.language || 'en';
  const isAr = lang === 'ar';
  const isRTL = ['ar'].includes(lang);
  const totalSteps = WIZARD_STEPS.length;
  const stepMeta = STEP_META[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  const onChange = useCallback((field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  // ─── Validation ─────────────────────────────────
  const validateStep = (step: number): boolean => {
    const s = WIZARD_STEPS[step];
    if (s === 'language' && !data.language) { toast.error('Please select a language'); return false; }
    if (s === 'company') {
      if (!data.companyName.trim()) { toast.error(isAr ? 'اسم الشركة مطلوب' : 'Company name is required'); return false; }
      if (!data.country) { toast.error(isAr ? 'البلد مطلوب' : 'Country is required'); return false; }
    }
    if (s === 'currencies') {
      if (!data.localCurrency) { toast.error(isAr ? 'العملة المحلية مطلوبة' : 'Local currency required'); return false; }
    }
    if (s === 'admin') {
      if (!data.adminName.trim()) { toast.error(isAr ? 'الاسم مطلوب' : 'Name required'); return false; }
      if (!data.adminPassword || data.adminPassword.length < 6) { toast.error(isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Password min 6 chars'); return false; }
      if (data.adminPassword !== data.adminPasswordConfirm) { toast.error(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps - 1) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  // ─── Final Submit ───────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { executeDesktopSetup } = await import('./services/companySetup');
      
      const result = await executeDesktopSetup(data, (phase, message) => {
        setSubmitPhase(message);
      });

      if (!result.success) {
        throw new Error(result.error || 'Setup failed');
      }

      // Initialize backup system
      const { initBackupSystem } = await import('./services/backupEngine');
      initBackupSystem();

      toast.success(isAr ? 'تم إنشاء شركتك بنجاح!' : 'Company created successfully!');
      localStorage.setItem('texacore_desktop_setup', JSON.stringify({ completed: true, data }));

      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err: any) {
      console.error('Setup error:', err);
      toast.error(err.message || 'Setup failed');
      setIsSubmitting(false);
      setSubmitPhase('');
    }
  };

  // ─── Render step content ────────────────────────
  const renderStep = () => {
    const step = WIZARD_STEPS[currentStep];
    switch (step) {
      case 'language': return <StepLanguage data={data} onChange={onChange} />;
      case 'company': return <StepCompany data={data} onChange={onChange} lang={lang} />;
      case 'currencies': return <StepCurrencies data={data} onChange={onChange} lang={lang} />;
      case 'admin': return <StepAdmin data={data} onChange={onChange} lang={lang} />;
      case 'accounts': return <StepAccounts data={data} onChange={onChange} lang={lang} />;
      case 'taxes': return <StepTaxes data={data} onChange={onChange} lang={lang} />;
      case 'storage': return <StepStorage data={data} onChange={onChange} lang={lang} />;
      case 'google-drive': return <StepGoogleDrive data={data} onChange={onChange} lang={lang} />;
      case 'complete': return renderComplete();
      default: return null;
    }
  };

  // ─── Completion screen ──────────────────────────
  const renderComplete = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
        <Rocket className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isAr ? '✅ شركتك جاهزة!' : '✅ Your company is ready!'}
      </h2>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-start space-y-2 text-sm max-w-sm mx-auto">
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '📁 الشركة' : '📁 Company'}</span><span className="font-bold">{data.companyName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '👤 المدير' : '👤 Admin'}</span><span className="font-bold">{data.adminName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '💰 العملة' : '💰 Currency'}</span><span className="font-bold">{data.mainCurrency}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '📊 الحسابات' : '📊 Accounts'}</span><span className="font-bold">{data.chartTemplate}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '🔄 النسخ الاحتياطي' : '🔄 Backup'}</span><span className="font-bold">{data.autoBackup ? '✅' : '❌'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">{isAr ? '☁️ Google Drive' : '☁️ Google Drive'}</span><span className="font-bold">{data.googleDriveEnabled ? '✅' : '❌'}</span></div>
      </div>

      <Button onClick={handleSubmit} disabled={isSubmitting}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold px-8 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all text-base">
        {isSubmitting ? (
          <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />{submitPhase}</span>
        ) : (
          <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" />{isAr ? '🚀 إنشاء الشركة والبدء' : '🚀 Create & Start'}</span>
        )}
      </Button>
    </motion.div>
  );

  const ArrowNext = isRTL ? ChevronLeft : ChevronRight;
  const ArrowPrev = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950/20 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800">

        {/* ── Step Header Bar ── */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3">
          <div className="flex items-center justify-between gap-1">
            {STEP_META.map((s, i) => {
              const Icon = s.icon;
              const active = i === currentStep;
              const done = i < currentStep;
              return (
                <React.Fragment key={s.id}>
                  <button onClick={() => i <= currentStep && setCurrentStep(i)}
                    className="flex flex-col items-center gap-0.5"
                    disabled={i > currentStep}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center transition-all border',
                      done && 'bg-white text-teal-700 border-white',
                      active && 'bg-white/20 text-white border-white',
                      !active && !done && 'bg-teal-800/30 text-teal-400 border-teal-600/30')}>
                      {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={cn('text-[8px] font-medium', active ? 'text-white' : done ? 'text-teal-200' : 'text-teal-400')}>
                      {isAr ? s.ar : s.en}
                    </span>
                  </button>
                  {i < STEP_META.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-0.5 mt-[-14px] rounded-full', done ? 'bg-white/60' : 'bg-teal-600/30')} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div className="h-full bg-teal-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>

        {/* ── Content ── */}
        <div className="p-6 md:p-8 min-h-[380px]">
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        {!isLast && (
          <div className="flex justify-between px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}
              className={cn(currentStep === 0 && 'invisible')}>
              <ArrowPrev className="w-4 h-4 me-1" /> {isAr ? 'السابق' : 'Back'}
            </Button>
            <Button onClick={handleNext} className="bg-teal-700 hover:bg-teal-800 text-white rounded-xl h-11 min-w-[130px]">
              {isAr ? 'التالي' : 'Next'} <ArrowNext className="w-4 h-4 ms-1" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

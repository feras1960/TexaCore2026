import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { countries } from '@/data/countries';
import { allCurrencies } from '@/data/currencies';
import {
  Building2,
  Lock,
  Globe,
  Loader2,
  HardDrive,
  CheckCircle2,
  Server,
  Cloud,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Store,
  Coins,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function LocalRegistrationWizard() {
  const { t, direction, language } = useLanguage();
  const navigate = useNavigate();
  const { login } = useAuth();
  const isRTL = direction === 'rtl';

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDefaultPath = () => {
    if (typeof window === 'undefined') return 'C:\\TexaCore\\Data';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) {
      return '~/Documents/TexaCore';
    } else if (ua.includes('win')) {
      return 'C:\\TexaCore';
    } else {
      return '~/TexaCore';
    }
  };

  const [formData, setFormData] = useState({
    storageType: 'local',
    storagePath: getDefaultPath(),
    dbFileName: '',
    companyName: '',
    address: '',
    city: '',
    country: 'SA',
    phone: '',
    localCurrency: 'SAR',
    mainCurrency: 'USD',
    fiscalYearStart: 1,
    chartTemplate: 'extended',
    adminUsername: 'admin',
    adminEmail: '',
    adminPassword: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sortedCountries = [...countries].sort((a, b) => {
    const nameA = language === 'ar' ? a.nameAr : a.name;
    const nameB = language === 'ar' ? b.nameAr : b.name;
    return nameA.localeCompare(nameB, language);
  });

  const currencies = allCurrencies.map(c => ({
    code: c.code,
    name: language === 'ar' ? c.nameAr : c.nameEn,
    symbol: c.symbol,
  }));

  const monthNames = language === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const chartTemplates = [
    { id: 'simple', name: language === 'ar' ? 'شجرة مبسطة' : 'Simple Chart', description: language === 'ar' ? 'مناسبة للشركات الصغيرة والنشاطات البسيطة' : 'Suitable for small businesses and simple activities' },
    { id: 'extended', name: language === 'ar' ? 'شجرة مفصلة (موصى به)' : 'Extended Chart (Recommended)', description: language === 'ar' ? 'شجرة متكاملة تناسب الأنشطة التجارية والصناعية' : 'Comprehensive chart suitable for commercial and industrial activities' }
  ];

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.storagePath.trim()) {
        toast.error(isRTL ? 'يرجى تحديد مسار الحفظ' : 'Please specify a storage path');
        return false;
      }
      if (!formData.dbFileName.trim()) {
        toast.error(isRTL ? 'يرجى إدخال اسم ملف صالح' : 'Please enter a valid filename');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.companyName.trim()) {
        toast.error(isRTL ? 'يرجى إدخال اسم الشركة' : 'Please enter company name');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.localCurrency) {
        toast.error(isRTL ? 'يرجى اختيار العملة المحلية' : 'Please select a local currency');
        return false;
      }
      if (!formData.mainCurrency) {
        toast.error(isRTL ? 'يرجى اختيار العملة الرئيسية' : 'Please select a main currency');
        return false;
      }
    }
    if (step === 4) {
      if (!formData.adminPassword || formData.adminPassword.length < 6) {
        toast.error(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
    else navigate('/login');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // ── 1. Call local installer API ───────────────────────────
      const LOCAL_API = 'http://127.0.0.1:1960';

      let apiResponse: Response;
      try {
        apiResponse = await fetch(`${LOCAL_API}/api/create-local-company`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } catch {
        throw new Error(
          isRTL
            ? 'تعذّر الاتصال ببرنامج التثبيت. تأكد أن التطبيق يعمل.'
            : 'Cannot reach local installer. Make sure the app is running.'
        );
      }

      const result = await apiResponse.json();
      if (!apiResponse.ok || !result.success) {
        throw new Error(result.error || 'Failed to create local company');
      }

      // ── 2. Persist company info in localStorage ───────────────
      //       supabase.ts reads this on the NEXT page load to point
      //       the Supabase client at localhost:54321 instead of Cloud.
      const LOCAL_SUPABASE_URL = result.supabaseUrl || 'http://localhost:54321';
      const LOCAL_ANON_KEY     = result.anonKey ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ1MzUsImV4cCI6MjA5MjU5NDUzNX0.aEuY0oBAUi1C9XHpr_xFEtvPDVXYrIdnjJsZUgWJxSk';

      localStorage.setItem('texacore_active_company', JSON.stringify({
        id:      result.companyId,
        name:    formData.companyName,
        url:     LOCAL_SUPABASE_URL,
        anonKey: LOCAL_ANON_KEY
      }));

      // ── 3. Store auth session in localStorage (via local client) ─
      //       storageKey 'sb-local-auth-token' must match supabase.ts
      if (result.accessToken && result.refreshToken) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const localClient = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
            auth: {
              persistSession:   true,
              autoRefreshToken: false,
              storage:          window.localStorage,
              storageKey:       'sb-local-auth-token',
            }
          });
          await localClient.auth.setSession({
            access_token:  result.accessToken,
            refresh_token: result.refreshToken,
          });
          console.log('[LocalSetup] Session stored in sb-local-auth-token ✅');
        } catch (sessionErr) {
          console.warn('[LocalSetup] setSession failed:', sessionErr);
        }
      }

      toast.success(isRTL ? '✅ تم إنشاء الشركة! جاري الدخول...' : '✅ Company created! Entering dashboard...');

      // ── 4. Hard reload to / ───────────────────────────────────
      //       supabase.ts re-runs getConfig() → reads texacore_active_company
      //       → uses localhost:54321 → finds the session we just wrote.
      setTimeout(() => { window.location.href = '/'; }, 900);

    } catch (err: any) {
      toast.error(isRTL ? `خطأ: ${err.message}` : `Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };



  const steps = [
    { icon: Server, label: isRTL ? 'مكان الحفظ' : 'Storage Location' },
    { icon: Store, label: isRTL ? 'معلومات الشركة' : 'Company Info' },
    { icon: Coins, label: isRTL ? 'الإعدادات المالية' : 'Financial Settings' },
    { icon: ShieldCheck, label: isRTL ? 'حساب المدير' : 'Admin Account' },
    { icon: HardDrive, label: isRTL ? 'إنشاء القاعدة' : 'Create Database' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8" dir={direction}>
      <div className="max-w-2xl w-full mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center shadow-xl mb-4">
            <Server className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isRTL ? 'إعداد خادم محلي جديد' : 'Setup New Local Server'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRTL ? 'سيتم إنشاء قاعدة بيانات معزولة ومستقلة بالكامل' : 'An isolated and completely independent database will be created'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
            {steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isActive = stepNum <= currentStep;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center gap-2 bg-gray-50 px-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 border-2",
                    isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-400"
                  )}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-xs font-semibold",
                    isActive ? "text-blue-600" : "text-gray-400"
                  )}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Card */}
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: STORAGE LOCATION */}
            {currentStep === 1 && (
              <motion.div
                key="step-storage"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-3">
                    {isRTL ? 'أين تريد حفظ ملفات قاعدة البيانات الخاصة بالشركة؟' : 'Where do you want to store the company database files?'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-4">
                    <div
                      className={cn(
                        "border-2 border-blue-600 bg-blue-50 shadow-md rounded-xl p-6 flex flex-col items-center text-center gap-3 relative"
                      )}
                    >
                      <HardDrive className="w-10 h-10 text-blue-600" />
                      <div>
                        <span className="font-bold text-lg text-gray-900 block mb-1">
                          {isRTL ? 'تخزين محلي (الكمبيوتر أو خادم محلي)' : 'Local Storage (Computer or Local Server)'}
                        </span>
                        <span className="text-sm text-gray-600 max-w-md mx-auto block">
                          {isRTL 
                            ? 'سيتم حفظ كافة البيانات والفواتير محلياً على هذا الجهاز لضمان أقصى درجات السرعة والأمان بدون الحاجة للإنترنت.' 
                            : 'All data and invoices will be stored locally on this device to ensure maximum speed and security without requiring internet.'}
                        </span>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-blue-600 absolute top-4 end-4" />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'مسار المجلد' : 'Folder Path'}
                    </Label>
                    <div className="flex mt-2">
                      <Input
                        value={formData.storagePath}
                        onChange={(e) => handleChange('storagePath', e.target.value)}
                        className="rounded-e-none h-12 bg-white text-gray-900 dark:text-gray-900"
                        dir="ltr"
                      />
                      <Button 
                        variant="secondary" 
                        onClick={async () => {
                          try {
                            if ('showDirectoryPicker' in window) {
                              const dirHandle = await (window as any).showDirectoryPicker();
                              
                              const isMac = navigator.userAgent.toLowerCase().includes('mac');
                              const isWin = navigator.userAgent.toLowerCase().includes('win');
                              // Build a clean display path — browser API only returns folder name
                              let prefix = '~/Documents';
                              if (isWin) prefix = 'C:\\TexaCore';
                              else if (!isMac) prefix = '~/TexaCore';
                              const sep = isWin ? '\\' : '/';
                              handleChange('storagePath', `${prefix}${sep}${dirHandle.name}`);
                              toast.success(isRTL ? `تم اختيار المجلد: ${dirHandle.name}` : `Selected folder: ${dirHandle.name}`);
                            } else {
                              toast.info(isRTL ? 'يتم فتح نافذة اختيار المجلد في النسخة النهائية من البرنامج' : 'Folder picker window will open in the final desktop app');
                            }
                          } catch (err) {
                            // User cancelled
                          }
                        }}
                        className="rounded-s-none h-12 border border-l-0 px-6 font-semibold"
                      >
                        {isRTL ? 'تصفح...' : 'Browse...'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'اسم ملف قاعدة البيانات' : 'Database File Name'} <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-gray-400 mt-0.5 mb-2">
                      {isRTL
                        ? 'اختر اسماً فريداً للملف (يدعم العربية وكافة اللغات)'
                        : 'Choose a unique name — supports all languages (Arabic, English, etc.)'}
                    </p>
                    <div className="flex mt-1 items-stretch" dir="ltr">
                      <Input
                        value={formData.dbFileName}
                        onChange={(e) => {
                          // Block only truly dangerous filesystem chars: / \ : * ? " < > | and null
                          const val = e.target.value.replace(/[/\\:*?"<>|\x00]/g, '').trimStart();
                          handleChange('dbFileName', val);
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder={isRTL ? 'مثال: شركتي' : 'e.g. my_company'}
                        className="rounded-r-none border-r-0 focus:z-10 h-12 bg-white text-gray-900 dark:text-gray-900"
                        dir="auto"
                      />
                      <div className="bg-gray-100 border border-gray-200 text-gray-600 px-4 flex items-center text-sm font-mono rounded-r-md whitespace-nowrap">
                        .tcdb
                      </div>
                    </div>
                    {formData.dbFileName && (
                      <p className="text-xs text-gray-400 mt-1.5 font-mono" dir="ltr">
                        📄 {formData.storagePath}/{formData.dbFileName}.tcdb
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    {isRTL 
                      ? 'ملاحظة: يمكنك اختيار مجلد (Google Drive) من جهازك إذا أردت مزامنة النسخة الاحتياطية سحابياً.' 
                      : 'Note: You can select a Google Drive folder on your PC if you want to sync backups to the cloud.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: COMPANY INFO */}
            {currentStep === 2 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {isRTL ? 'اسم الشركة' : 'Company Name'} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="mt-1 h-12 text-gray-900 dark:text-gray-900 bg-white"
                    placeholder={isRTL ? 'مثال: شركة النسيج المتطورة' : 'e.g. Advanced Fabric Co'}
                    autoFocus
                  />
                  {formData.dbFileName && (
                    <p className="text-xs text-emerald-600 mt-1.5 font-mono flex items-center gap-1" dir="ltr">
                      📄 {formData.storagePath}/{formData.dbFileName}.tcdb
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'الدولة' : 'Country'} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(val) => {
                        handleChange('country', val);
                        const c = countries.find(x => x.code === val);
                        if (c) {
                          handleChange('localCurrency', c.currency);
                          if (!formData.mainCurrency) handleChange('mainCurrency', c.currency);
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1 h-12 text-gray-900 dark:text-gray-900 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-white text-gray-900">
                        {sortedCountries.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {language === 'ar' ? c.nameAr : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'المدينة' : 'City'}
                    </Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="mt-1 h-12 text-gray-900 dark:text-gray-900 bg-white"
                      placeholder={isRTL ? 'مثال: الرياض' : 'e.g. Riyadh'}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                  </Label>
                  <div className="relative flex items-center mt-1" dir="ltr">
                    <div className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 px-3 flex items-center justify-center rounded-l text-gray-600 font-mono text-sm min-w-[60px]">
                      {countries.find(c => c.code === formData.country)?.phoneCode || '+...'}
                    </div>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                      className="h-12 pl-[70px] text-gray-900 dark:text-gray-900 bg-white"
                      placeholder="555123456"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: FINANCIAL SETTINGS */}
            {currentStep === 3 && (
              <motion.div
                key="step-finance"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-sm font-medium text-gray-700 block mb-2">
                    {isRTL ? 'الدليل المحاسبي' : 'Chart of Accounts'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chartTemplates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => handleChange('chartTemplate', template.id)}
                        className={cn(
                          "cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-blue-50",
                          formData.chartTemplate === template.id
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-gray-800">{template.name}</span>
                          {formData.chartTemplate === template.id && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                        </div>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'العملة المحلية' : 'Local Currency'} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.localCurrency}
                      onValueChange={(val) => handleChange('localCurrency', val)}
                    >
                      <SelectTrigger className="mt-1 h-12 text-gray-900 dark:text-gray-900 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-white text-gray-900">
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {isRTL ? 'العملة الرئيسية' : 'Main Currency'} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.mainCurrency}
                      onValueChange={(val) => handleChange('mainCurrency', val)}
                    >
                      <SelectTrigger className="mt-1 h-12 font-semibold text-gray-900 dark:text-gray-900 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] bg-white text-gray-900">
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    {isRTL ? 'بداية السنة المالية' : 'Fiscal Year Start'}
                  </Label>
                  <Select
                    value={formData.fiscalYearStart.toString()}
                    onValueChange={(val) => handleChange('fiscalYearStart', parseInt(val))}
                  >
                    <SelectTrigger className="mt-1 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-gray-900">
                      {monthNames.map((name, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                          {idx + 1} - {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* STEP 4: ADMIN ACCOUNT */}
            {currentStep === 4 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-6"
              >
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    {isRTL ? 'حساب مدير النظام المحلي' : 'Local Admin Account'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">{isRTL ? 'اسم المستخدم' : 'Username'}</Label>
                      <Input
                        value={formData.adminUsername}
                        onChange={(e) => handleChange('adminUsername', e.target.value)}
                        className="mt-1 bg-white text-gray-900 dark:text-gray-900"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">{isRTL ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span></Label>
                      <Input
                        type="password"
                        value={formData.adminPassword}
                        onChange={(e) => handleChange('adminPassword', e.target.value)}
                        className="mt-1 bg-white text-gray-900 dark:text-gray-900"
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-2 mt-2">
                      <Label className="text-sm text-gray-600">
                        {isRTL ? 'البريد الإلكتروني (اختياري - يوصى به)' : 'Email Address (Optional - Recommended)'}
                      </Label>
                      <Input
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => handleChange('adminEmail', e.target.value)}
                        placeholder="admin@mycompany.com"
                        className="mt-1 bg-white text-gray-900 dark:text-gray-900"
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {isRTL 
                          ? 'سنقوم بإرسال رسالة ترحيبية تحتوي على بيانات الدخول للرجوع إليها مستقبلاً.'
                          : 'We will send a welcome email containing your access links for future reference.'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & CREATE */}
            {currentStep === 5 && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-4"
              >
                {/* Header */}
                <div className="text-center pb-2">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {isRTL ? 'مراجعة الإعدادات قبل الإنشاء' : 'Review Settings Before Creating'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {isRTL ? 'تأكد من صحة البيانات ثم اضغط "إنشاء القاعدة"' : 'Confirm the details then click "Create Database"'}
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="space-y-3">

                  {/* File Location */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                      {isRTL ? '📁 موقع الملف' : '📁 File Location'}
                    </p>
                    <p className="text-sm text-gray-800 font-mono break-all" dir="ltr">
                      {formData.storagePath}/{formData.dbFileName || 'my_company'}.tcdb
                    </p>
                  </div>

                  {/* Company Info */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-400 font-medium uppercase tracking-wide mb-3">
                      {isRTL ? '🏢 معلومات الشركة' : '🏢 Company Info'}
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">{isRTL ? 'اسم الشركة' : 'Company Name'}</span>
                      <span className="font-semibold text-gray-900 text-end">{formData.companyName || '—'}</span>
                      <span className="text-gray-500">{isRTL ? 'الدولة' : 'Country'}</span>
                      <span className="font-semibold text-gray-900 text-end">
                        {countries.find(c => c.code === formData.country)?.[isRTL ? 'nameAr' : 'name'] || formData.country}
                      </span>
                      {formData.address && (
                        <>
                          <span className="text-gray-500">{isRTL ? 'العنوان' : 'Address'}</span>
                          <span className="font-semibold text-gray-900 text-end">{formData.address}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Financial Settings */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs text-green-500 font-medium uppercase tracking-wide mb-3">
                      {isRTL ? '💰 الإعدادات المالية' : '💰 Financial Settings'}
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">{isRTL ? 'العملة المحلية' : 'Local Currency'}</span>
                      <span className="font-semibold text-gray-900 text-end">
                        {currencies.find(c => c.code === formData.localCurrency)?.symbol} {formData.localCurrency}
                      </span>
                      <span className="text-gray-500">{isRTL ? 'العملة الرئيسية' : 'Main Currency'}</span>
                      <span className="font-semibold text-gray-900 text-end">
                        {currencies.find(c => c.code === formData.mainCurrency)?.symbol} {formData.mainCurrency}
                      </span>
                      <span className="text-gray-500">{isRTL ? 'بداية السنة المالية' : 'Fiscal Year Start'}</span>
                      <span className="font-semibold text-gray-900 text-end">
                        {monthNames[formData.fiscalYearStart - 1]}
                      </span>
                      <span className="text-gray-500">{isRTL ? 'الدليل المحاسبي' : 'Chart Template'}</span>
                      <span className="font-semibold text-gray-900 text-end text-xs leading-tight">
                        {formData.chartTemplate === 'extended'
                          ? (isRTL ? 'شجرة مفصلة (موصى به)' : 'Extended (Recommended)')
                          : (isRTL ? 'شجرة مبسطة' : 'Simple Chart')}
                      </span>
                    </div>
                  </div>

                  {/* Admin Account */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-3">
                      {isRTL ? '🔐 حساب المدير' : '🔐 Admin Account'}
                    </p>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">{isRTL ? 'اسم المستخدم' : 'Username'}</span>
                      <span className="font-semibold text-gray-900 text-end font-mono">{formData.adminUsername || 'admin'}</span>
                      {formData.adminEmail && (
                        <>
                          <span className="text-gray-500">{isRTL ? 'البريد' : 'Email'}</span>
                          <span className="font-semibold text-gray-900 text-end text-xs break-all">{formData.adminEmail}</span>
                        </>
                      )}
                      <span className="text-gray-500">{isRTL ? 'كلمة المرور' : 'Password'}</span>
                      <span className="font-semibold text-gray-900 text-end font-mono">{'•'.repeat(formData.adminPassword?.length || 0)}</span>
                    </div>
                  </div>

                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {isRTL
                      ? 'بعد الضغط على "إنشاء القاعدة" سيتم إنشاء الملف وتسجيل الدخول تلقائياً للشركة الجديدة.'
                      : 'After clicking "Create Database", the file will be created and you will be logged in automatically.'}
                  </p>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {currentStep === 1 ? (isRTL ? 'إلغاء' : 'Cancel') : (isRTL ? 'السابق' : 'Back')}
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="gap-2 bg-[#111827] hover:bg-blue-700 text-white">
                {isRTL ? 'التالي' : 'Next'}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRTL ? 'جاري الإنشاء...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4" />
                    {isRTL ? 'إنشاء القاعدة' : 'Create Database'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

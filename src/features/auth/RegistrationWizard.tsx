/**
 * Registration Wizard - معالج التسجيل المتقدم
 * يظهر بعد التسجيل الأساسي لإكمال إعداد الحساب
 * 
 * Features:
 * - Step 1: اختيار نوع العمل + اسم الشركة
 * - Step 2: معلومات الشركة (دولة، مدينة، عنوان، موقع)
 * - Step 3: الإعدادات المالية (عملات، سنة مالية)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Building2,
  Shirt,
  DollarSign,
  Heart,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  Loader2,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface BusinessTypeOption {
  id: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface CompanyFormData {
  companyName: string;
  businessType: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  localCurrency: string; // العملة المحلية
  mainCurrency: string; // العملة الرئيسية
  fiscalYearStart: number;
  selectedPlan: string; // 🆕 الباقة المختارة
  billingCycle: 'monthly' | 'yearly'; // 🆕 دورة الفوترة
}

interface Country {
  code: string;
  name: string;
  nameAr: string;
  currency: string;
  region: string; // 'arab', 'russian', 'european', 'asian', etc.
}

// ============================================
// COUNTRIES DATA
// ============================================

const countries: Country[] = [
  // الدول العربية
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', currency: 'SAR', region: 'arab' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', currency: 'AED', region: 'arab' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', currency: 'KWD', region: 'arab' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', currency: 'QAR', region: 'arab' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', currency: 'BHD', region: 'arab' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', currency: 'OMR', region: 'arab' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', region: 'arab' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', region: 'arab' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', currency: 'LBP', region: 'arab' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', currency: 'SYP', region: 'arab' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', currency: 'IQD', region: 'arab' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', currency: 'YER', region: 'arab' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', currency: 'MAD', region: 'arab' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', currency: 'DZD', region: 'arab' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', currency: 'TND', region: 'arab' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', currency: 'LYD', region: 'arab' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', currency: 'SDG', region: 'arab' },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال', currency: 'SOS', region: 'arab' },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', currency: 'DJF', region: 'arab' },
  { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر', currency: 'KMF', region: 'arab' },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', currency: 'MRU', region: 'arab' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', currency: 'ILS', region: 'arab' },
  
  // دول ناطقة بالروسية
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', currency: 'RUB', region: 'russian' },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', currency: 'UAH', region: 'russian' },
  { code: 'BY', name: 'Belarus', nameAr: 'بيلاروسيا', currency: 'BYN', region: 'russian' },
  { code: 'KZ', name: 'Kazakhstan', nameAr: 'كازاخستان', currency: 'KZT', region: 'russian' },
  { code: 'UZ', name: 'Uzbekistan', nameAr: 'أوزبكستان', currency: 'UZS', region: 'russian' },
  { code: 'AZ', name: 'Azerbaijan', nameAr: 'أذربيجان', currency: 'AZN', region: 'russian' },
  { code: 'GE', name: 'Georgia', nameAr: 'جورجيا', currency: 'GEL', region: 'russian' },
  { code: 'AM', name: 'Armenia', nameAr: 'أرمينيا', currency: 'AMD', region: 'russian' },
  
  // دول ناطقة بالتركية
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', currency: 'TRY', region: 'turkish' },
  
  // دول أوروبية
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', currency: 'EUR', region: 'european' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', currency: 'EUR', region: 'european' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', currency: 'EUR', region: 'european' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', currency: 'EUR', region: 'european' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', currency: 'GBP', region: 'european' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', currency: 'EUR', region: 'european' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', currency: 'EUR', region: 'european' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', currency: 'CHF', region: 'european' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', currency: 'EUR', region: 'european' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', currency: 'SEK', region: 'european' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', currency: 'NOK', region: 'european' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', currency: 'DKK', region: 'european' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', currency: 'EUR', region: 'european' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', currency: 'PLN', region: 'european' },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا', currency: 'RON', region: 'european' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', currency: 'EUR', region: 'european' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', currency: 'EUR', region: 'european' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', currency: 'CZK', region: 'european' },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر', currency: 'HUF', region: 'european' },
  
  // أخرى
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', currency: 'USD', region: 'other' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', currency: 'CAD', region: 'other' },
  { code: 'CN', name: 'China', nameAr: 'الصين', currency: 'CNY', region: 'other' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', currency: 'JPY', region: 'other' },
  { code: 'IN', name: 'India', nameAr: 'الهند', currency: 'INR', region: 'other' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', currency: 'BRL', region: 'other' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', currency: 'AUD', region: 'other' },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', currency: 'NZD', region: 'other' },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', currency: 'ZAR', region: 'other' },
];

// Map language to region priority
const languageRegionMap: Record<string, string[]> = {
  'ar': ['arab', 'turkish', 'european', 'russian', 'other'],
  'en': ['other', 'european', 'arab', 'turkish', 'russian'],
  'de': ['european', 'other', 'arab', 'turkish', 'russian'],
  'tr': ['turkish', 'arab', 'european', 'russian', 'other'],
  'ru': ['russian', 'european', 'arab', 'turkish', 'other'],
  'uk': ['russian', 'european', 'arab', 'turkish', 'other'],
  'it': ['european', 'other', 'arab', 'turkish', 'russian'],
  'pl': ['european', 'other', 'arab', 'turkish', 'russian'],
  'ro': ['european', 'other', 'arab', 'turkish', 'russian'],
};

const defaultCountryByLanguage: Record<string, string> = {
  'ar': 'SA',
  'en': 'US',
  'de': 'DE',
  'tr': 'TR',
  'ru': 'RU',
  'uk': 'UA',
  'it': 'IT',
  'pl': 'PL',
  'ro': 'RO',
};

// ============================================
// CURRENCIES
// ============================================

const currencies = [
  { code: 'SAR', name: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  { code: 'AED', name: 'درهم إماراتي', nameEn: 'UAE Dirham' },
  { code: 'USD', name: 'دولار أمريكي', nameEn: 'US Dollar' },
  { code: 'EUR', name: 'يورو', nameEn: 'Euro' },
  { code: 'GBP', name: 'جنيه إسترليني', nameEn: 'British Pound' },
  { code: 'EGP', name: 'جنيه مصري', nameEn: 'Egyptian Pound' },
  { code: 'SYP', name: 'ليرة سورية', nameEn: 'Syrian Pound' },
  { code: 'LBP', name: 'ليرة لبنانية', nameEn: 'Lebanese Pound' },
  { code: 'IQD', name: 'دينار عراقي', nameEn: 'Iraqi Dinar' },
  { code: 'KWD', name: 'دينار كويتي', nameEn: 'Kuwaiti Dinar' },
  { code: 'QAR', name: 'ريال قطري', nameEn: 'Qatari Riyal' },
  { code: 'BHD', name: 'دينار بحريني', nameEn: 'Bahraini Dinar' },
  { code: 'OMR', name: 'ريال عماني', nameEn: 'Omani Rial' },
  { code: 'JOD', name: 'دينار أردني', nameEn: 'Jordanian Dinar' },
  { code: 'TRY', name: 'ليرة تركية', nameEn: 'Turkish Lira' },
  { code: 'RUB', name: 'روبل روسي', nameEn: 'Russian Ruble' },
  { code: 'UAH', name: 'هريفنا أوكرانية', nameEn: 'Ukrainian Hryvnia' },
  { code: 'PLN', name: 'زلوتي بولندي', nameEn: 'Polish Zloty' },
  { code: 'RON', name: 'ليو روماني', nameEn: 'Romanian Leu' },
  { code: 'CHF', name: 'فرنك سويسري', nameEn: 'Swiss Franc' },
  { code: 'JPY', name: 'ين ياباني', nameEn: 'Japanese Yen' },
  { code: 'CNY', name: 'يوان صيني', nameEn: 'Chinese Yuan' },
  { code: 'INR', name: 'روبية هندية', nameEn: 'Indian Rupee' },
];

// ============================================
// COMPONENT
// ============================================

export default function RegistrationWizard() {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // قراءة بيانات التسجيل من localStorage
  const registrationData = React.useMemo(() => {
    const data = localStorage.getItem('registration_data');
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  }, []);
  
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: registrationData?.companyName || '',
    businessType: '',
    address: '',
    city: '',
    country: defaultCountryByLanguage[language] || 'SA',
    phone: registrationData?.phone || '',
    email: registrationData?.email || user?.email || '',
    website: '',
    localCurrency: '',
    mainCurrency: 'USD',
    fiscalYearStart: 1,
    selectedPlan: 'starter', // 🆕 الباقة الافتراضية
    billingCycle: 'monthly' // 🆕 شهري افتراضياً
  });

  // 🆕 قراءة الباقة من URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planFromUrl = params.get('plan');
    if (planFromUrl && ['starter', 'professional', 'enterprise'].includes(planFromUrl)) {
      setFormData(prev => ({
        ...prev,
        selectedPlan: planFromUrl
      }));
    }
  }, []);

  const isRTL = direction === 'rtl';
  const totalSteps = 4; // 🆕 زيادة عدد الخطوات إلى 4
  const progress = (currentStep / totalSteps) * 100;

  // ترتيب الدول حسب اللغة
  const sortedCountries = React.useMemo(() => {
    const regionPriority = languageRegionMap[language] || languageRegionMap['en'];
    
    const sorted = [...countries].sort((a, b) => {
      const aIndex = regionPriority.indexOf(a.region);
      const bIndex = regionPriority.indexOf(b.region);
      
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // نفس المنطقة - ترتيب أبجدي
      if (isRTL) {
        return a.nameAr.localeCompare(b.nameAr, 'ar');
      }
      return a.name.localeCompare(b.name);
    });
    
    return sorted;
  }, [language, isRTL]);

  // تحديث العملة المحلية عند تغيير الدولة
  useEffect(() => {
    const selectedCountry = countries.find(c => c.code === formData.country);
    if (selectedCountry && !formData.localCurrency) {
      setFormData(prev => ({
        ...prev,
        localCurrency: selectedCountry.currency
      }));
    }
  }, [formData.country]);

  // Business Types
  const businessTypes: Record<string, BusinessTypeOption> = {
    general: {
      id: 'general',
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-600'
    },
    fabric: {
      id: 'fabric',
      icon: Shirt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-600'
    },
    exchange: {
      id: 'exchange',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-600'
    },
    healthcare: {
      id: 'healthcare',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-600'
    },
    ecommerce: {
      id: 'ecommerce',
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-600'
    }
  };

  const months = [
    { value: 1, label: t('wizard.months.january') },
    { value: 2, label: t('wizard.months.february') },
    { value: 3, label: t('wizard.months.march') },
    { value: 4, label: t('wizard.months.april') },
    { value: 5, label: t('wizard.months.may') },
    { value: 6, label: t('wizard.months.june') },
    { value: 7, label: t('wizard.months.july') },
    { value: 8, label: t('wizard.months.august') },
    { value: 9, label: t('wizard.months.september') },
    { value: 10, label: t('wizard.months.october') },
    { value: 11, label: t('wizard.months.november') },
    { value: 12, label: t('wizard.months.december') }
  ];

  const handleChange = (field: keyof CompanyFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // إذا تغيرت الدولة، نحدث العملة المحلية
    if (field === 'country') {
      const selectedCountry = countries.find(c => c.code === value);
      if (selectedCountry) {
        setFormData(prev => ({
          ...prev,
          localCurrency: selectedCountry.currency
        }));
      }
    }
  };

  const handleNext = () => {
    // Step 1: التحقق من نوع العمل واسم الشركة
    if (currentStep === 1) {
      if (!formData.businessType) {
        toast.error(t('wizard.selectBusinessType') || 'الرجاء اختيار نوع العمل');
        return;
      }
      if (!formData.companyName || formData.companyName.trim() === '') {
        toast.error(t('wizard.companyNameRequired') || 'الرجاء إدخال اسم الشركة');
        return;
      }
    }
    
    // Step 2: التحقق من الدولة والمدينة
    if (currentStep === 2) {
      if (!formData.country) {
        toast.error(t('wizard.countryRequired') || 'الرجاء اختيار الدولة');
        return;
      }
      if (!formData.city || formData.city.trim() === '') {
        toast.error(t('wizard.cityRequired') || 'الرجاء إدخال المدينة');
        return;
      }
      // التحقق من البريد الإلكتروني
      if (!formData.email || formData.email.trim() === '') {
        toast.error(t('wizard.emailRequired') || 'الرجاء إدخال البريد الإلكتروني');
        return;
      }
      // التحقق من صحة البريد الإلكتروني
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error(t('wizard.emailInvalid') || 'البريد الإلكتروني غير صحيح');
        return;
      }
    }
    
    // Step 3: التحقق من العملات
    if (currentStep === 3) {
      if (!formData.localCurrency) {
        toast.error(t('wizard.localCurrencyRequired') || 'الرجاء اختيار العملة المحلية');
        return;
      }
      if (!formData.mainCurrency) {
        toast.error(t('wizard.mainCurrencyRequired') || 'الرجاء اختيار العملة الرئيسية');
        return;
      }
    }
    
    // 🆕 Step 4: التحقق من الباقة
    if (currentStep === 4) {
      if (!formData.selectedPlan) {
        toast.error(t('wizard.selectPlan') || 'الرجاء اختيار الباقة');
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // التحقق من وجود المستخدم
    if (!user?.id) {
      console.error('❌ No user found!');
      toast.error(t('wizard.userNotFound') || 'User not found. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // التحقق من البيانات المطلوبة
    if (!formData.companyName || !formData.businessType) {
      console.error('❌ Missing required fields!', {
        companyName: formData.companyName,
        businessType: formData.businessType
      });
      toast.error(t('wizard.fillAllFields') || 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔄 Starting registration...', {
        userId: user.id,
        email: formData.email,
        companyName: formData.companyName,
        businessType: formData.businessType,
        currency: formData.localCurrency,
        country: formData.country
      });

      // Call register_new_subscriber with business_type, currency, country, and plan
      const { data, error } = await supabase.rpc('register_new_subscriber', {
        p_user_id: user.id,
        p_user_email: formData.email,
        p_user_name: user?.user_metadata?.full_name || formData.companyName || 'User',
        p_company_name: formData.companyName,
        p_phone: formData.phone || null,
        p_business_type: formData.businessType,
        p_currency: formData.localCurrency,
        p_country_code: formData.country,
        p_plan_code: formData.selectedPlan // 🆕 إرسال الباقة المختارة
      });

      console.log('📊 RPC Response:', { data, error });

      if (error) {
        console.error('❌ Registration error:', error);
        toast.error(t('wizard.registrationFailed') + ': ' + (error.message || 'Unknown error'));
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        console.error('❌ No data returned from RPC');
        toast.error(t('wizard.registrationFailed') + ': No data returned');
        setIsSubmitting(false);
        return;
      }

      if (data && !data.success) {
        console.error('❌ Registration failed:', data.error);
        toast.error(data.error || t('wizard.registrationFailed'));
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Registration successful!', data);

      // Update company details
      if (data?.company_id) {
        console.log('📝 Updating company details for company_id:', data.company_id);
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            address: formData.address || '',
            city: formData.city || '',
            country: formData.country,
            phone: formData.phone || '',
            email: formData.email,
            website: formData.website || '',
            default_currency: formData.localCurrency,
            fiscal_year_start_month: formData.fiscalYearStart
          })
          .eq('id', data.company_id);

        if (updateError) {
          console.error('⚠️ Update error:', updateError);
          // لا نوقف العملية، فقط نسجل الخطأ
        } else {
          console.log('✅ Company details updated');
        }
      }

      // Success!
      console.log('🎉 Registration complete! Cleaning up...');
      
      // تنظيف البيانات المؤقتة
      localStorage.removeItem('registration_data');
      
      // عرض رسالة النجاح
      const successMessage = formData.businessType === 'fabric' 
        ? t('wizard.successFabric') 
        : t('wizard.success');
      
      console.log('✅ Success message:', successMessage);
      toast.success(successMessage);
      
      console.log('🚀 Preparing redirect to dashboard in 1 second...');
      
      // Redirect to dashboard بعد ثانية واحدة
      const redirectTimer = setTimeout(() => {
        console.log('➡️ Executing redirect now...');
        try {
          window.location.href = '/';
          console.log('✅ Redirect executed');
        } catch (redirectError) {
          console.error('❌ Redirect error:', redirectError);
          // محاولة بديلة
          window.location.replace('/');
        }
      }, 1000);

      // تنظيف Timer إذا تم unmount المكون
      return () => clearTimeout(redirectTimer);

    } catch (err: any) {
      console.error('💥 Submission error:', err);
      console.error('Error stack:', err.stack);
      toast.error(err.message || t('wizard.registrationFailed'));
      setIsSubmitting(false);
    }
  };

  // ============================================
  // STEP 1: Business Type + Company Name
  // ============================================

  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <Store className="w-12 h-12 mx-auto mb-4 text-teal-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('wizard.step1Title')}
        </h2>
        <p className="text-gray-600">{t('wizard.step1Description')}</p>
      </div>

      {/* اسم الشركة */}
      <div className="mb-6">
        <Label htmlFor="companyName" className="text-base font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          {t('wizard.companyName')} *
        </Label>
        <Input
          id="companyName"
          value={formData.companyName}
          onChange={(e) => handleChange('companyName', e.target.value)}
          placeholder={t('wizard.companyNamePlaceholder')}
          className="text-lg h-12 border-2"
          dir={isRTL ? 'rtl' : 'ltr'}
          autoFocus={!formData.companyName} // تركيز فقط إذا كان فارغاً
          required
        />
        {formData.companyName && (
          <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {t('wizard.companyNameFromRegistration')}
          </p>
        )}
        {!formData.companyName && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {t('wizard.companyNameHint')}
          </p>
        )}
      </div>

      {/* Business Types */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          {t('wizard.selectBusinessType')} *
        </Label>
        {!formData.businessType && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {t('wizard.businessTypeHint')}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(businessTypes).map(([key, type]) => {
            const Icon = type.icon;
            const isSelected = formData.businessType === key;
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChange('businessType', key)}
                className={cn(
                  "relative p-6 rounded-xl border-2 transition-all duration-200 text-start",
                  "hover:shadow-md hover:scale-[1.02]",
                  isSelected
                    ? `${type.borderColor} ${type.bgColor} shadow-md scale-[1.02]`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    isSelected ? type.bgColor : 'bg-gray-100'
                  )}>
                    <Icon className={cn(
                      "w-6 h-6",
                      isSelected ? type.color : 'text-gray-600'
                    )} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {t(`wizard.businessTypes.${key}.name`)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t(`wizard.businessTypes.${key}.description`)}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-4 end-4">
                      <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fabric Alert */}
      {formData.businessType === 'fabric' && (
        <Alert className="bg-purple-50 border-purple-200">
          <Info className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            {t('wizard.fabricNote')}
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );

  // ============================================
  // STEP 2: Company Info
  // ============================================

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-teal-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('wizard.step2Title')}
        </h2>
        <p className="text-gray-600">{t('wizard.step2Description')}</p>
      </div>

      <div className="grid gap-6">
        {/* اسم الشركة (عرض فقط) */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" />
            {t('wizard.companyName')}
          </Label>
          <Input
            value={formData.companyName}
            disabled
            className="bg-gray-50"
          />
        </div>

        {/* الدولة */}
        <div>
          <Label htmlFor="country" className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            {t('wizard.country')} *
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => handleChange('country', value)}
          >
            <SelectTrigger id="country" className="h-12">
              <SelectValue placeholder={t('wizard.selectCountry')} />
            </SelectTrigger>
            <SelectContent>
              {sortedCountries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {isRTL ? country.nameAr : country.name} ({country.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* المدينة */}
        <div>
          <Label htmlFor="city" className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            {t('wizard.city')} *
          </Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder={t('wizard.cityPlaceholder')}
          />
        </div>

        {/* العنوان */}
        <div>
          <Label htmlFor="address" className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            {t('wizard.address')}
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder={t('wizard.addressPlaceholder')}
          />
        </div>

        {/* الموقع الإلكتروني */}
        <div>
          <Label htmlFor="website" className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4" />
            {t('wizard.website')}
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder={t('wizard.websitePlaceholder')}
          />
        </div>

        {/* الهاتف */}
        <div>
          <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4" />
            {t('wizard.phone')}
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('wizard.phonePlaceholder')}
          />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <Label htmlFor="email" className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4" />
            {t('wizard.email')}
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('wizard.emailPlaceholder')}
          />
        </div>
      </div>
    </motion.div>
  );

  // ============================================
  // STEP 3: Financial Settings
  // ============================================

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <Coins className="w-12 h-12 mx-auto mb-4 text-teal-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('wizard.step3Title')}
        </h2>
        <p className="text-gray-600">{t('wizard.step3Description')}</p>
      </div>

      <div className="grid gap-6">
        {/* العملة المحلية */}
        <div>
          <Label htmlFor="localCurrency" className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4" />
            {t('wizard.localCurrency')} *
          </Label>
          <Select
            value={formData.localCurrency}
            onValueChange={(value) => handleChange('localCurrency', value)}
          >
            <SelectTrigger id="localCurrency" className="h-12">
              <SelectValue placeholder={t('wizard.selectCurrency')} />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {isRTL ? currency.name : currency.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {t('wizard.localCurrencyNote')}
          </p>
        </div>

        {/* العملة الرئيسية */}
        <div>
          <Label htmlFor="mainCurrency" className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            {t('wizard.mainCurrency')} *
          </Label>
          <Select
            value={formData.mainCurrency}
            onValueChange={(value) => handleChange('mainCurrency', value)}
          >
            <SelectTrigger id="mainCurrency" className="h-12">
              <SelectValue placeholder={t('wizard.selectMainCurrency')} />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {isRTL ? currency.name : currency.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {t('wizard.mainCurrencyNote')}
          </p>
        </div>

        {/* بداية السنة المالية */}
        <div>
          <Label htmlFor="fiscalYear" className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            {t('wizard.fiscalYearStart')}
          </Label>
          <Select
            value={formData.fiscalYearStart.toString()}
            onValueChange={(value) => handleChange('fiscalYearStart', parseInt(value))}
          >
            <SelectTrigger id="fiscalYear" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-teal-600" />
            {t('wizard.summary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('wizard.businessType')}:</span>
            <span className="font-medium">{t(`wizard.businessTypes.${formData.businessType}.name`)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('wizard.companyName')}:</span>
            <span className="font-medium">{formData.companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('wizard.country')}:</span>
            <span className="font-medium">
              {isRTL 
                ? countries.find(c => c.code === formData.country)?.nameAr 
                : countries.find(c => c.code === formData.country)?.name
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('wizard.localCurrency')}:</span>
            <span className="font-medium">{formData.localCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('wizard.mainCurrency')}:</span>
            <span className="font-medium">{formData.mainCurrency}</span>
          </div>

          {formData.businessType === 'fabric' && (
            <Alert className="mt-4 bg-purple-50 border-purple-200">
              <Info className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-xs text-purple-900">
                {t('wizard.fabricSummary')}
                <br />
                <strong>{t('wizard.fabricCurrencyNote')}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // ============================================
  // STEP 4: اختيار الباقة 🆕
  // ============================================

  const renderStep4 = () => {
    // خطط الباقات
    const plans = [
      {
        code: 'starter',
        nameKey: 'wizard.plans.starter.name',
        descKey: 'wizard.plans.starter.description',
        priceMonthly: 99,
        priceYearly: 1188,
        discountedMonthly: 49.50,
        discountedYearly: 495,
        color: 'blue',
        features: [
          t('wizard.plans.starter.feature1') || '1 شركة',
          t('wizard.plans.starter.feature2') || '5 مستخدمين',
          t('wizard.plans.starter.feature3') || '50 فرع',
          t('wizard.plans.starter.feature4') || '10 GB تخزين',
          t('wizard.plans.starter.feature5') || '14 يوم تجريبي'
        ],
        isPopular: false
      },
      {
        code: 'professional',
        nameKey: 'wizard.plans.professional.name',
        descKey: 'wizard.plans.professional.description',
        priceMonthly: 799,
        priceYearly: 9588,
        discountedMonthly: 399.50,
        discountedYearly: 3995,
        color: 'teal',
        features: [
          t('wizard.plans.professional.feature1') || '3 شركات',
          t('wizard.plans.professional.feature2') || '20 مستخدم',
          t('wizard.plans.professional.feature3') || '200 فرع',
          t('wizard.plans.professional.feature4') || '100 GB تخزين',
          t('wizard.plans.professional.feature5') || '30 يوم تجريبي',
          t('wizard.plans.professional.feature6') || 'دعم ذو أولوية'
        ],
        isPopular: true
      },
      {
        code: 'enterprise',
        nameKey: 'wizard.plans.enterprise.name',
        descKey: 'wizard.plans.enterprise.description',
        priceMonthly: 1199,
        priceYearly: 14388,
        discountedMonthly: 599.50,
        discountedYearly: 5995,
        color: 'purple',
        features: [
          t('wizard.plans.enterprise.feature1') || 'غير محدود',
          t('wizard.plans.enterprise.feature2') || '500 GB تخزين',
          t('wizard.plans.enterprise.feature3') || '30 يوم تجريبي',
          t('wizard.plans.enterprise.feature4') || 'White Label',
          t('wizard.plans.enterprise.feature5') || 'API Access',
          t('wizard.plans.enterprise.feature6') || 'دعم مخصص'
        ],
        isPopular: false
      }
    ];

    const getColorClasses = (color: string, isSelected: boolean) => {
      const colors: Record<string, any> = {
        blue: {
          border: 'border-blue-600',
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        },
        teal: {
          border: 'border-teal-600',
          bg: 'bg-teal-50',
          text: 'text-teal-600',
          badge: 'bg-teal-100 text-teal-700'
        },
        purple: {
          border: 'border-purple-600',
          bg: 'bg-purple-50',
          text: 'text-purple-600',
          badge: 'bg-purple-100 text-purple-700'
        }
      };
      return colors[color] || colors.blue;
    };

    return (
      <motion.div
        key="step4"
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
        className="space-y-6"
      >
        <div className="text-center mb-8">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-teal-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('wizard.step4Title') || 'اختر باقتك'}
          </h2>
          <p className="text-gray-600">
            {t('wizard.step4Description') || 'ابدأ بفترة تجريبية مجانية'}
          </p>
        </div>

        {/* تبديل شهري/سنوي */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border-2 border-gray-200 p-1 bg-white">
            <button
              type="button"
              onClick={() => handleChange('billingCycle', 'monthly')}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                formData.billingCycle === 'monthly'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t('wizard.monthly') || 'شهري'}
            </button>
            <button
              type="button"
              onClick={() => handleChange('billingCycle', 'yearly')}
              className={cn(
                "px-6 py-2 rounded-md text-sm font-medium transition-all",
                formData.billingCycle === 'yearly'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {t('wizard.yearly') || 'سنوي'}
              <span className="ms-2 text-xs">
                ({t('wizard.save') || 'وفر'} 58%)
              </span>
            </button>
          </div>
        </div>

        {/* الباقات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = formData.selectedPlan === plan.code;
            const colors = getColorClasses(plan.color, isSelected);
            const price = formData.billingCycle === 'monthly' 
              ? plan.discountedMonthly 
              : plan.discountedYearly;
            const originalPrice = formData.billingCycle === 'monthly'
              ? plan.priceMonthly
              : plan.priceYearly;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => handleChange('selectedPlan', plan.code)}
                className={cn(
                  "relative p-6 rounded-xl border-2 transition-all duration-200 text-start",
                  "hover:shadow-lg hover:scale-[1.02]",
                  isSelected
                    ? `${colors.border} ${colors.bg} shadow-lg scale-[1.02]`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold", colors.badge)}>
                      ⭐ {t('wizard.mostPopular') || 'الأكثر شعبية'}
                    </div>
                  </div>
                )}

                {/* Check Icon */}
                {isSelected && (
                  <div className="absolute top-4 end-4">
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t(plan.nameKey)}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t(plan.descKey)}
                </p>

                {/* Price */}
                <div className="mb-6">
                  {/* سعر مشطوب */}
                  <div className="text-sm text-gray-400 line-through mb-1">
                    ${originalPrice}
                  </div>
                  {/* السعر الحالي */}
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-4xl font-bold", colors.text)}>
                      ${price}
                    </span>
                    <span className="text-gray-600">
                      / {formData.billingCycle === 'monthly' 
                        ? (t('wizard.month') || 'شهر')
                        : (t('wizard.year') || 'سنة')
                      }
                    </span>
                  </div>
                  {/* خصم */}
                  <div className="mt-2 text-xs text-teal-600 font-medium">
                    🎉 {t('wizard.discount50') || 'خصم 50%'}
                    {formData.billingCycle === 'yearly' && 
                      ` + ${t('wizard.freeMonths') || '2 أشهر مجاناً'}`
                    }
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* ملاحظة */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            {t('wizard.planNote') || 'يمكنك تغيير الباقة أو الترقية في أي وقت من لوحة التحكم'}
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4" dir={direction}>
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center border-b bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold">{t('wizard.title')}</CardTitle>
          <CardDescription className="text-white/90 text-lg">
            {t('wizard.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('wizard.step')} {currentStep} {t('wizard.of')} {totalSteps}
              </span>
              <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className={cn(
            "flex gap-4 mt-8 pt-6 border-t",
            currentStep === 1 ? "justify-end" : "justify-between"
          )}>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t('wizard.back')}
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="gap-2 bg-teal-600 hover:bg-teal-700"
              >
                {t('wizard.next')}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('wizard.submitting')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t('wizard.complete')}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

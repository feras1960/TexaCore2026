import React, { useState } from 'react';
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
import { countries } from '@/data/countries';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import {
    Building2,
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

// Hardcoded countries/currencies removed in favor of proper data sources and i18n


const chartTemplates = [
    { id: 'simple', name: 'شجرة الحسابات البسيطة', description: 'حسابات مبسطة تناسب المحلات الصغيرة (~40 حساب)' },
    { id: 'fabric_extended', name: 'شجرة الأقمشة الموسعة', description: 'هيكل حسابات كامل للمصانع والشركات الكبيرة (80 حساب)' }
];

export default function FabricRegistrationWizard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t, language, isRTL } = useLanguage();

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 2;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to get country details
    const getCountryDetails = (code: string) => countries.find(c => c.code === code);

    const [formData, setFormData] = useState({
        companyName: '',
        address: '',
        city: '',
        country: '',
        phone: '',
        email: '',
        website: '',
        localCurrency: '',
        mainCurrency: 'USD',
        fiscalYearStart: 1,
        chartTemplate: 'fabric_extended'
    });

    // Check for local storage data from Register page
    React.useEffect(() => {
        const storedData = localStorage.getItem('registration_data');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.email) setFormData(prev => ({ ...prev, email: parsed.email }));
                // Name and Company are no longer passed from Register, so user enters them here.
            } catch (e) {
                console.error("Error parsing registration data", e);
            }
        }
    }, []);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            if (!validateStep(currentStep)) return;
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.companyName) {
                toast.error(t('wizard.errors.companyNameRequired'));
                return false;
            }
            if (!formData.country) {
                toast.error(t('wizard.errors.countryRequired'));
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        setIsSubmitting(true);
        try {
            if (!user?.id) throw new Error('No user ID found');

            const selectedCountry = getCountryDetails(formData.country);
            // Combine Phone Code + Number
            const fullPhone = selectedCountry ? `${selectedCountry.phoneCode}${formData.phone}` : formData.phone;

            // IPv4-safe Payload
            const payload = {
                p_user_id: user.id,
                p_user_email: user.email || formData.email || 'unknown@example.com',
                p_user_name: user.user_metadata?.full_name || formData.companyName || 'User',
                p_company_name: formData.companyName,
                p_phone: fullPhone,
                p_business_type: 'fabric',
                p_currency: formData.mainCurrency || 'USD',
                p_country_code: formData.country,
                p_plan_code: 'starter',
                p_chart_template: formData.chartTemplate,
                p_local_currency: formData.localCurrency || null  // 💰 العملة المحلية
            };

            const { data, error } = await supabase.rpc('register_new_subscriber', payload);

            if (error) throw error;

            if (data && !data.success) {
                throw new Error(data.message || 'Registration failed');
            }

            toast.success(t('wizard.fabric.success'));

            // Clear temp data
            localStorage.removeItem('registration_data');

            // 🔄 Refresh the session to get updated user metadata (including tenant_id)
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.warn('Session refresh warning:', refreshError);
            }

            // Small delay to ensure session is updated, then force full page reload
            setTimeout(() => {
                window.location.href = '/';
            }, 500);

        } catch (err: any) {
            console.error('Submission error:', err);
            toast.error(err.message || 'فشل التسجيل');
            setIsSubmitting(false);
        }
    };

    const progress = (currentStep / totalSteps) * 100;
    const selectedCountryDetails = getCountryDetails(formData.country);

    // Filter/Sort Countries based on Language
    const sortedCountries = [...countries].sort((a, b) => {
        const nameA = language === 'ar' ? a.nameAr : a.name;
        const nameB = language === 'ar' ? b.nameAr : b.name;
        return nameA.localeCompare(nameB, language);
    });

    const chartTemplates = [
        { id: 'simple', name: t('wizard.labels.chartTemplateSimple'), description: t('wizard.labels.chartTemplateSimpleDesc') },
        { id: 'fabric_extended', name: t('wizard.labels.chartTemplateExtended'), description: t('wizard.labels.chartTemplateExtendedDesc') }
    ];

    const currencies = [
        // العملات الرئيسية
        { code: 'USD', name: language === 'ar' ? 'دولار أمريكي' : 'US Dollar' },
        { code: 'EUR', name: language === 'ar' ? 'يورو' : 'Euro' },
        { code: 'GBP', name: language === 'ar' ? 'جنيه إسترليني' : 'British Pound' },
        { code: 'CHF', name: language === 'ar' ? 'فرنك سويسري' : 'Swiss Franc' },
        { code: 'JPY', name: language === 'ar' ? 'ين ياباني' : 'Japanese Yen' },
        { code: 'CAD', name: language === 'ar' ? 'دولار كندي' : 'Canadian Dollar' },
        { code: 'AUD', name: language === 'ar' ? 'دولار أسترالي' : 'Australian Dollar' },
        { code: 'CNY', name: language === 'ar' ? 'يوان صيني' : 'Chinese Yuan' },
        // العملات العربية
        { code: 'SAR', name: language === 'ar' ? 'ريال سعودي' : 'Saudi Riyal' },
        { code: 'AED', name: language === 'ar' ? 'درهم إماراتي' : 'UAE Dirham' },
        { code: 'KWD', name: language === 'ar' ? 'دينار كويتي' : 'Kuwaiti Dinar' },
        { code: 'QAR', name: language === 'ar' ? 'ريال قطري' : 'Qatari Rial' },
        { code: 'BHD', name: language === 'ar' ? 'دينار بحريني' : 'Bahraini Dinar' },
        { code: 'OMR', name: language === 'ar' ? 'ريال عماني' : 'Omani Rial' },
        { code: 'JOD', name: language === 'ar' ? 'دينار أردني' : 'Jordanian Dinar' },
        { code: 'EGP', name: language === 'ar' ? 'جنيه مصري' : 'Egyptian Pound' },
        { code: 'LBP', name: language === 'ar' ? 'ليرة لبنانية' : 'Lebanese Pound' },
        { code: 'SYP', name: language === 'ar' ? 'ليرة سورية' : 'Syrian Pound' },
        { code: 'IQD', name: language === 'ar' ? 'دينار عراقي' : 'Iraqi Dinar' },
        { code: 'YER', name: language === 'ar' ? 'ريال يمني' : 'Yemeni Rial' },
        { code: 'MAD', name: language === 'ar' ? 'درهم مغربي' : 'Moroccan Dirham' },
        { code: 'DZD', name: language === 'ar' ? 'دينار جزائري' : 'Algerian Dinar' },
        { code: 'TND', name: language === 'ar' ? 'دينار تونسي' : 'Tunisian Dinar' },
        { code: 'LYD', name: language === 'ar' ? 'دينار ليبي' : 'Libyan Dinar' },
        { code: 'SDG', name: language === 'ar' ? 'جنيه سوداني' : 'Sudanese Pound' },
        // العملات السلافية
        { code: 'RUB', name: language === 'ar' ? 'روبل روسي' : 'Russian Ruble' },
        { code: 'UAH', name: language === 'ar' ? 'غريفنا أوكرانية' : 'Ukrainian Hryvnia' },
        { code: 'BYN', name: language === 'ar' ? 'روبل بيلاروسي' : 'Belarusian Ruble' },
        { code: 'KZT', name: language === 'ar' ? 'تنغي كازاخستاني' : 'Kazakhstani Tenge' },
        { code: 'UZS', name: language === 'ar' ? 'سوم أوزبكي' : 'Uzbekistani Som' },
        { code: 'AZN', name: language === 'ar' ? 'مانات أذربيجاني' : 'Azerbaijani Manat' },
        { code: 'GEL', name: language === 'ar' ? 'لاري جورجي' : 'Georgian Lari' },
        { code: 'AMD', name: language === 'ar' ? 'درام أرميني' : 'Armenian Dram' },
        // العملات التركية والأوروبية
        { code: 'TRY', name: language === 'ar' ? 'ليرة تركية' : 'Turkish Lira' },
        { code: 'PLN', name: language === 'ar' ? 'زلوتي بولندي' : 'Polish Zloty' },
        { code: 'CZK', name: language === 'ar' ? 'كرونا تشيكية' : 'Czech Koruna' },
        { code: 'HUF', name: language === 'ar' ? 'فورنت مجري' : 'Hungarian Forint' },
        { code: 'RON', name: language === 'ar' ? 'ليو روماني' : 'Romanian Leu' },
        { code: 'BGN', name: language === 'ar' ? 'ليف بلغاري' : 'Bulgarian Lev' },
        { code: 'SEK', name: language === 'ar' ? 'كرونا سويدية' : 'Swedish Krona' },
        { code: 'NOK', name: language === 'ar' ? 'كرونا نرويجية' : 'Norwegian Krone' },
        { code: 'DKK', name: language === 'ar' ? 'كرونا دنماركية' : 'Danish Krone' },
        // العملات الآسيوية
        { code: 'INR', name: language === 'ar' ? 'روبية هندية' : 'Indian Rupee' },
        { code: 'PKR', name: language === 'ar' ? 'روبية باكستانية' : 'Pakistani Rupee' },
        { code: 'BDT', name: language === 'ar' ? 'تاكا بنغلاديشية' : 'Bangladeshi Taka' },
        { code: 'IDR', name: language === 'ar' ? 'روبية إندونيسية' : 'Indonesian Rupiah' },
        { code: 'MYR', name: language === 'ar' ? 'رينغيت ماليزي' : 'Malaysian Ringgit' },
        { code: 'SGD', name: language === 'ar' ? 'دولار سنغافوري' : 'Singapore Dollar' },
        { code: 'THB', name: language === 'ar' ? 'بات تايلندي' : 'Thai Baht' },
        { code: 'PHP', name: language === 'ar' ? 'بيزو فلبيني' : 'Philippine Peso' },
        { code: 'KRW', name: language === 'ar' ? 'وون كوري' : 'South Korean Won' },
        // العملات الأفريقية
        { code: 'ZAR', name: language === 'ar' ? 'راند جنوب أفريقي' : 'South African Rand' },
        { code: 'NGN', name: language === 'ar' ? 'نيرة نيجيرية' : 'Nigerian Naira' },
        { code: 'KES', name: language === 'ar' ? 'شلن كيني' : 'Kenyan Shilling' },
        // العملات الأمريكية
        { code: 'MXN', name: language === 'ar' ? 'بيزو مكسيكي' : 'Mexican Peso' },
        { code: 'BRL', name: language === 'ar' ? 'ريال برازيلي' : 'Brazilian Real' },
        { code: 'ARS', name: language === 'ar' ? 'بيزو أرجنتيني' : 'Argentine Peso' },
        { code: 'COP', name: language === 'ar' ? 'بيزو كولومبي' : 'Colombian Peso' },
    ];

    // Render Functions
    const renderStep1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="text-center mb-6">
                <Store className="w-12 h-12 mx-auto mb-4 text-teal-600" />
                <h2 className="text-2xl font-bold text-gray-900">{t('wizard.fabric.title')}</h2>
                <p className="text-gray-600">{t('wizard.fabric.subtitle')}</p>
            </div>

            <div className="grid gap-4">
                <div>
                    <Label>{t('wizard.labels.companyName')} *</Label>
                    <Input
                        value={formData.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        placeholder={t('wizard.labels.companyNamePlaceholder')}
                        className="h-11 text-lg"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>{t('wizard.labels.country')} *</Label>
                        <Select
                            value={formData.country}
                            onValueChange={(val) => {
                                handleChange('country', val);
                                // Auto-set local currency based on country
                                const country = countries.find(c => c.code === val);
                                if (country) {
                                    handleChange('localCurrency', country.currency);
                                    if (!formData.mainCurrency) {
                                        handleChange('mainCurrency', country.currency);
                                    }
                                }
                            }}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder={t('wizard.labels.countryPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {sortedCountries.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        <span className="flex items-center gap-2">
                                            <span>{language === 'ar' ? c.nameAr : c.name}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>{t('wizard.labels.city')}</Label>
                        <Input
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder={t('wizard.labels.cityPlaceholder')}
                            className="h-11"
                        />
                    </div>
                </div>

                <div>
                    <Label>{t('wizard.labels.phone')}</Label>
                    <div className="relative flex items-center" dir="ltr">
                        {/* Phone Code Prefix */}
                        <div className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 px-3 flex items-center justify-center rounded-l text-gray-600 font-mono text-sm min-w-[60px]">
                            {selectedCountryDetails?.phoneCode || '+...'}
                        </div>
                        <Input
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder={t('wizard.labels.phonePlaceholder')}
                            className="h-11 pl-[70px]"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="text-center mb-6">
                <Coins className="w-12 h-12 mx-auto mb-4 text-teal-600" />
                <h2 className="text-2xl font-bold text-gray-900">{t('wizard.steps.financial')}</h2>
                <p className="text-gray-600">{t('wizard.subtitle')}</p>
            </div>

            <div className="grid gap-6">
                {/* Chart Template Selection */}
                <div>
                    <Label className="text-lg text-teal-700 font-semibold mb-2 block">{t('wizard.labels.chartTemplate')} *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {chartTemplates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => handleChange('chartTemplate', template.id)}
                                className={cn(
                                    "cursor-pointer border-2 rounded-lg p-4 transition-all hover:bg-teal-50",
                                    formData.chartTemplate === template.id
                                        ? "border-teal-600 bg-teal-50"
                                        : "border-gray-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-gray-800">{template.name}</span>
                                    {formData.chartTemplate === template.id && <Check className="w-5 h-5 text-teal-600" />}
                                </div>
                                <p className="text-xs text-gray-500">{template.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>{t('wizard.labels.localCurrency')}</Label>
                        <Select
                            value={formData.localCurrency}
                            onValueChange={(val) => handleChange('localCurrency', val)}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>{t('wizard.labels.mainCurrency')}</Label>
                        <Select
                            value={formData.mainCurrency}
                            onValueChange={(val) => handleChange('mainCurrency', val)}
                        >
                            <SelectTrigger className="h-11 font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {currencies.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <Label>{t('wizard.labels.fiscalYearStart')}</Label>
                    <Select
                        value={formData.fiscalYearStart.toString()}
                        onValueChange={(val) => handleChange('fiscalYearStart', parseInt(val))}
                    >
                        <SelectTrigger className="h-11">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">{t('wizard.labels.month')} 1 (Jan)</SelectItem>
                            <SelectItem value="4">{t('wizard.labels.month')} 4 (Apr)</SelectItem>
                            <SelectItem value="7">{t('wizard.labels.month')} 7 (Jul)</SelectItem>
                            <SelectItem value="10">{t('wizard.labels.month')} 10 (Oct)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                        {t('authPage.register.benefits.freeTrial')}
                    </AlertDescription>
                </Alert>
            </div>
        </motion.div>
    );

    const ArrowRightIcon = isRTL ? ChevronLeft : ChevronRight;
    const ArrowLeftIcon = isRTL ? ChevronRight : ChevronLeft;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">

            {/* Header Language Selector */}
            <div className="absolute top-4 start-4">
                <LanguageSelector />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
                {/* Progress Bar */}
                <div className="h-2 bg-gray-100">
                    <motion.div
                        className="h-full bg-teal-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 ? renderStep1() : renderStep2()}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={currentStep === 1 || isSubmitting}
                            className={cn(currentStep === 1 && "invisible")}
                        >
                            <ArrowLeftIcon className="w-4 h-4 me-2" />
                            {t('wizard.actions.back')}
                        </Button>

                        {currentStep < totalSteps ? (
                            <Button
                                onClick={handleNext}
                                className="bg-teal-700 hover:bg-teal-800 text-white min-w-[120px]"
                            >
                                {t('wizard.actions.next')}
                                <ArrowRightIcon className="w-4 h-4 ms-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-teal-700 hover:bg-teal-800 text-white min-w-[120px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                                        {t('wizard.actions.processing')}
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 me-2" />
                                        {t('wizard.actions.complete')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

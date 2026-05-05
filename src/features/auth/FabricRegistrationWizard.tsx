import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase, cloudSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { countries } from '@/data/countries';
import { allCurrencies } from '@/data/currencies';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import {
    Building2,
    ChevronRight,
    ChevronLeft,
    Check,
    Info,
    Loader2,
    Store,
    Phone,
    Coins,
    Crown,
    FileCheck,
    Globe,
    Calendar,
    CreditCard,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Plan display info ──────────────────────────────────
const PLAN_INFO: Record<string, { icon: string; color: string }> = {
    'texa-starter': { icon: '🚀', color: 'blue' },
    'texa-professional': { icon: '👑', color: 'emerald' },
    'texa-enterprise': { icon: '🏢', color: 'purple' },
};

export default function FabricRegistrationWizard() {
    const { user, authUser, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { t, language, isRTL } = useLanguage();

    // 🔄 كشف OAuth callback (tokens في الـ hash)
    const [waitingForOAuth, setWaitingForOAuth] = useState(() => {
        const hash = window.location.hash;
        return hash.includes('access_token') || hash.includes('refresh_token');
    });

    // ⏳ إذا كانت هناك tokens في الـ URL، معالجتها بشكل صريح
    useEffect(() => {
        if (!waitingForOAuth) return;
        if (user) {
            // تم معالجة الـ tokens بنجاح
            console.log('[Wizard] ✅ OAuth user detected:', user.email);
            setWaitingForOAuth(false);
            // تنظيف الـ hash من الـ URL
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }

        // ⚡ معالجة صريحة: Supabase يحتاج getSession لتبادل الـ hash tokens
        let cancelled = false;
        const processOAuthTokens = async () => {
            console.log('[Wizard] 🔄 Processing OAuth hash tokens...');
            try {
                // getSession يجبر Supabase على معالجة الـ hash tokens
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('[Wizard] ❌ getSession error:', error.message);
                }
                if (data?.session?.user) {
                    console.log('[Wizard] ✅ Session established:', data.session.user.email);
                    // تنظيف الـ hash
                    window.history.replaceState(null, '', window.location.pathname);
                    // onAuthStateChange سيتولى تحديث الحالة
                    // لكن ننتظر قليلاً للتأكد
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (!cancelled) setWaitingForOAuth(false);
                    return;
                }
            } catch (err) {
                console.error('[Wizard] ❌ OAuth processing error:', err);
            }

            // إعادة المحاولة بعد ثانية (قد يحتاج Supabase وقتاً)
            if (!cancelled) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (!cancelled) {
                    try {
                        const { data: retryData } = await supabase.auth.getSession();
                        if (retryData?.session?.user) {
                            console.log('[Wizard] ✅ Session established on retry:', retryData.session.user.email);
                            window.history.replaceState(null, '', window.location.pathname);
                            if (!cancelled) setWaitingForOAuth(false);
                            return;
                        }
                    } catch {}
                }
            }

            // timeout نهائي: 8 ثوانٍ
            if (!cancelled) {
                await new Promise(resolve => setTimeout(resolve, 6000));
                if (!cancelled) {
                    console.warn('[Wizard] ⏰ OAuth timeout — giving up');
                    setWaitingForOAuth(false);
                }
            }
        };

        processOAuthTokens();
        return () => { cancelled = true; };
    }, [waitingForOAuth, user]);

    // 🔒 Track if auth was ever established (prevents redirect on transient null states)
    const authEstablishedRef = React.useRef(false);
    if (user) authEstablishedRef.current = true;

    // 🛡️ حماية المعالج: لا يفتح بالرابط المباشر بدون تسجيل دخول
    useEffect(() => {
        if (authLoading || waitingForOAuth) return; // انتظر تحميل Auth أو معالجة OAuth

        // إذا تم إنشاء الجلسة مسبقاً، لا تعيد التوجيه حتى لو user = null مؤقتاً
        if (authEstablishedRef.current) return;

        // غير مسجّل دخول → أعده لصفحة التسجيل (فقط إذا لم يتم إنشاء جلسة أبداً)
        if (!user) {
            console.log('[Wizard] 🚫 No auth session ever established, redirecting to /register');
            navigate('/register', { replace: true });
            return;
        }
    }, [user, authLoading, waitingForOAuth, navigate]);

    // لديه tenant بالفعل → لا يحتاج المعالج (تأثير منفصل)
    useEffect(() => {
        if (authUser?.tenant_id) {
            console.log('[Wizard] ✅ User already has tenant, redirecting to /');
            navigate('/', { replace: true });
        }
    }, [authUser?.tenant_id, navigate]);

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3; // 3 خطوات: معلومات الشركة → الإعدادات المالية → المراجعة والتأكيد
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionPhase, setSubmissionPhase] = useState('');

    const getCountryDetails = (code: string) => countries.find(c => c.code === code);

    // ✅ قالب رسالة الترحيب الاحترافي
    const generateWelcomeEmailHtml = (userName: string, companyName: string, email: string) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#047857 0%,#0d9488 50%,#065f46 100%);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
            <span style="color:#ffffff;">Texa</span><span style="color:#f59e0b;">Core</span>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:2px;">ENTERPRISE RESOURCE PLANNING</div>
        </td></tr>

        <!-- Welcome Icon -->
        <tr><td style="text-align:center;padding:36px 40px 12px;"><div style="font-size:64px;">🚀</div></td></tr>

        <!-- Title -->
        <tr><td style="text-align:center;padding:0 40px 8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#1f2937;">مرحباً بك، ${userName}!</h1>
          <p style="margin:8px 0 0;font-size:15px;color:#6b7280;">تم تفعيل حسابك بنجاح في TexaCore ERP</p>
        </td></tr>

        <!-- Company Card -->
        <tr><td style="padding:20px 40px;">
          <div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1px solid #bbf7d0;border-radius:14px;padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#6b7280;text-align:right;width:35%;">🏢 الشركة:</td>
                <td style="padding:10px 0;font-size:16px;color:#1f2937;font-weight:700;text-align:right;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#6b7280;text-align:right;">📧 البريد:</td>
                <td style="padding:10px 0;font-size:14px;color:#1f2937;font-weight:600;text-align:right;">${email}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#6b7280;text-align:right;">👤 الصلاحية:</td>
                <td style="padding:10px 0;font-size:14px;color:#047857;font-weight:700;text-align:right;">مدير النظام (Admin)</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#6b7280;text-align:right;">📅 تاريخ التفعيل:</td>
                <td style="padding:10px 0;font-size:14px;color:#1f2937;font-weight:600;text-align:right;">${new Date().toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Features -->
        <tr><td style="padding:0 40px 24px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1e40af;text-align:center;">🎁 حسابك يتضمن</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 4px;text-align:center;width:33%;">
                  <div style="font-size:28px;margin-bottom:4px;">⏱️</div>
                  <div style="font-size:13px;color:#1e40af;font-weight:700;">14 يوم مجاناً</div>
                  <div style="font-size:11px;color:#6b7280;">فترة تجريبية كاملة</div>
                </td>
                <td style="padding:8px 4px;text-align:center;width:33%;">
                  <div style="font-size:28px;margin-bottom:4px;">📦</div>
                  <div style="font-size:13px;color:#1e40af;font-weight:700;">جميع الموديولات</div>
                  <div style="font-size:11px;color:#6b7280;">محاسبة · مخازن · مبيعات</div>
                </td>
                <td style="padding:8px 4px;text-align:center;width:33%;">
                  <div style="font-size:28px;margin-bottom:4px;">🤖</div>
                  <div style="font-size:13px;color:#1e40af;font-weight:700;">ذكاء اصطناعي</div>
                  <div style="font-size:11px;color:#6b7280;">مساعد NexaPro AI</div>
                </td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- CTA Button -->
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <a href="https://app.texacore.ai" style="display:inline-block;background:linear-gradient(135deg,#047857,#0d9488);color:#ffffff;text-decoration:none;padding:16px 56px;border-radius:14px;font-size:18px;font-weight:800;box-shadow:0 6px 20px rgba(4,120,87,0.35);letter-spacing:0.5px;">
            🚀 ابدأ استخدام النظام الآن
          </a>
        </td></tr>

        <!-- Quick Start Tips -->
        <tr><td style="padding:0 40px 24px;">
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;text-align:center;">💡 خطوات البدء السريع</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#4b5563;line-height:1.8;">
              <tr><td style="padding:4px 8px;text-align:right;">1️⃣</td><td style="padding:4px 0;text-align:right;">أكمل إعدادات الشركة من قسم الإعدادات</td></tr>
              <tr><td style="padding:4px 8px;text-align:right;">2️⃣</td><td style="padding:4px 0;text-align:right;">أضف المستخدمين وحدد صلاحياتهم</td></tr>
              <tr><td style="padding:4px 8px;text-align:right;">3️⃣</td><td style="padding:4px 0;text-align:right;">ابدأ بإدخال المواد والعملاء</td></tr>
              <tr><td style="padding:4px 8px;text-align:right;">4️⃣</td><td style="padding:4px 0;text-align:right;">استخدم مساعد NexaPro AI للحصول على تحليلات ذكية</td></tr>
            </table>
          </div>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>

        <!-- Support -->
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
            💬 تحتاج مساعدة؟ فريق الدعم الفني متاح على مدار الساعة<br>
            <a href="mailto:support@texacore.ai" style="color:#047857;text-decoration:none;font-weight:600;">support@texacore.ai</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:linear-gradient(135deg,#f9fafb,#f3f4f6);padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            <span style="font-weight:800;color:#047857;">Texa</span><span style="font-weight:800;color:#f59e0b;">Core</span> ERP<br>
            <span style="font-size:11px;">جودة تستحق الثقة 🇪🇺</span><br>
            <a href="https://texacore.ai" style="color:#047857;text-decoration:none;font-size:11px;">texacore.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;


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
        chartTemplate: 'extended',
        selectedPlan: 'texa-professional',
        billingCycle: 'monthly',
    });

    // ─── قراءة البيانات من صفحة التسجيل ──────────────
    useEffect(() => {
        const storedData = localStorage.getItem('registration_data');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.email) setFormData(prev => ({ ...prev, email: parsed.email }));
                if (parsed.plan) setFormData(prev => ({ ...prev, selectedPlan: parsed.plan }));
                if (parsed.billing) setFormData(prev => ({ ...prev, billingCycle: parsed.billing }));
                if (parsed.companyName) setFormData(prev => ({ ...prev, companyName: parsed.companyName }));
                if (parsed.phone) setFormData(prev => ({ ...prev, phone: parsed.phone }));
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

    // ─── التحقق من صحة البيانات ─────────────────────
    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.companyName.trim()) {
                toast.error(t('wizard.errors.companyNameRequired'));
                return false;
            }
            if (!formData.country) {
                toast.error(t('wizard.errors.countryRequired'));
                return false;
            }
            // التحقق من رقم الهاتف (أرقام فقط إذا أدخل شيء)
            if (formData.phone && !/^\d{4,15}$/.test(formData.phone)) {
                toast.error(language === 'ar' ? 'رقم الهاتف يجب أن يحتوي على أرقام فقط (4-15 رقم)' : 'Phone must contain only digits (4-15 digits)');
                return false;
            }
        }
        if (step === 2) {
            if (!formData.localCurrency) {
                toast.error(language === 'ar' ? 'يرجى اختيار العملة المحلية' : 'Please select local currency');
                return false;
            }
            if (!formData.mainCurrency) {
                toast.error(language === 'ar' ? 'يرجى اختيار العملة الرئيسية' : 'Please select main currency');
                return false;
            }
        }
        return true;
    };

    // ─── إرسال البيانات ─────────────────────────────
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!user?.id) throw new Error(language === 'ar' ? 'لم يتم العثور على المستخدم' : 'No user ID found');

            const selectedCountry = getCountryDetails(formData.country);
            const fullPhone = selectedCountry ? `${selectedCountry.phoneCode}${formData.phone}` : formData.phone;

            // المرحلة 1: إنشاء المستأجر والشركة
            setSubmissionPhase(language === 'ar' ? 'جاري إنشاء الشركة...' : 'Creating company...');

            const payload = {
                p_user_id: user.id,
                p_user_email: user.email || formData.email || 'unknown@example.com',
                p_user_name: user.user_metadata?.full_name || formData.companyName || 'User',
                p_company_name: formData.companyName,
                p_phone: fullPhone,
                p_business_type: 'fabric',
                p_currency: formData.mainCurrency || 'USD',
                p_country_code: formData.country || 'SA',
                p_plan_code: formData.selectedPlan || 'texa-professional',
                p_chart_template: formData.chartTemplate || 'extended',
                p_local_currency: formData.localCurrency || null,
            };

            console.log('📤 RPC payload:', payload);

            const { data, error } = await supabase.rpc('register_new_subscriber', payload);
            if (error) throw error;
            
            // ⭐ فحص التسجيل المكرر
            if (data && !data.success) {
                if (data.error_code === 'ALREADY_REGISTERED' || data.error_code === 'EMAIL_EXISTS') {
                    toast.error(
                        language === 'ar' 
                            ? 'هذا الحساب مسجل مسبقاً. جاري التحويل لصفحة الدخول...'
                            : 'This account is already registered. Redirecting to login...'
                    );
                    localStorage.removeItem('registration_data');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                    return;
                }
                throw new Error(data.message || data.error || (language === 'ar' ? 'فشل التسجيل' : 'Registration failed'));
            }

            // المرحلة 2: التسجيل مكتمل — الباقة والإعدادات تم إعدادها في RPC
            setSubmissionPhase(language === 'ar' ? 'جاري إعداد الباقة...' : 'Setting up plan...');
            // ✅ Plan, modules, chart of accounts — all handled atomically in RPC

            setSubmissionPhase(language === 'ar' ? 'جاري إعداد الحسابات...' : 'Setting up accounting...');
            console.log('✅ Registration result:', {
                tenant_id: data?.tenant_id,
                company_id: data?.company_id,
                modules_count: data?.modules_count,
                chart_accounts: data?.chart_accounts,
                chart_template: data?.chart_template,
            });

            // المرحلة 4: تحديث بيانات الجلسة
            setSubmissionPhase(language === 'ar' ? 'جاري تحديث الجلسة...' : 'Updating session...');

            // ⭐ تحديث user_metadata في JWT بالبيانات الجديدة
            if (data?.tenant_id && data?.company_id) {
                try {
                    await supabase.auth.updateUser({
                        data: {
                            tenant_id: data.tenant_id,
                            company_id: data.company_id,
                            is_super_admin: false,
                        }
                    });
                } catch (metaErr) {
                    console.warn('⚠️ Metadata update warning:', metaErr);
                }
            }

            // المرحلة 5: إرسال رسالة الترحيب
            setSubmissionPhase(language === 'ar' ? 'جاري إرسال رسالة الترحيب...' : 'Sending welcome email...');
            
            // ✅ إرسال بريد ترحيبي (ننتظر الإرسال قبل التحويل)
            const userEmail = user.email || formData.email || '';
            const userName = user.user_metadata?.full_name || formData.companyName || 'User';
            if (userEmail) {
                try {
                    const emailRes = await cloudSupabase.functions.invoke('send-email', {
                        body: {
                            to: userEmail,
                            subject: '🎉 مرحباً بك في TexaCore ERP — تم تفعيل حسابك بنجاح!',
                            html: generateWelcomeEmailHtml(userName, formData.companyName, userEmail),
                        }
                    });
                    if (emailRes.error) console.warn('⚠️ Welcome email warning:', emailRes.error);
                    else console.log('✅ Welcome email sent to:', userEmail);
                } catch (emailErr) {
                    console.warn('⚠️ Welcome email error (non-blocking):', emailErr);
                }
            }

            // المرحلة 6: إنهاء
            setSubmissionPhase(language === 'ar' ? 'تم بنجاح! جاري التحويل...' : 'Success! Redirecting...');
            toast.success(t('wizard.fabric.success'));
            localStorage.removeItem('registration_data');

            // تحديث الجلسة للحصول على JWT محدّث
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) console.warn('Session refresh warning:', refreshError);

            setTimeout(() => {
                window.location.href = '/';
            }, 800);

        } catch (err: any) {
            console.error('Submission error:', err);
            toast.error(err.message || (language === 'ar' ? 'فشل التسجيل، يرجى المحاولة مرة أخرى' : 'Registration failed, please try again'));
            setIsSubmitting(false);
            setSubmissionPhase('');
        }
    };

    const progress = (currentStep / totalSteps) * 100;
    const selectedCountryDetails = getCountryDetails(formData.country);

    const sortedCountries = [...countries].sort((a, b) => {
        const nameA = language === 'ar' ? a.nameAr : a.name;
        const nameB = language === 'ar' ? b.nameAr : b.name;
        return nameA.localeCompare(nameB, language);
    });

    const chartTemplates = [
        { id: 'simple', name: t('wizard.labels.chartTemplateSimple'), description: t('wizard.labels.chartTemplateSimpleDesc') },
        { id: 'extended', name: t('wizard.labels.chartTemplateExtended'), description: t('wizard.labels.chartTemplateExtendedDesc') }
    ];

    const currencies = allCurrencies.map(c => ({
        code: c.code,
        name: language === 'ar' ? c.nameAr : c.nameEn,
        symbol: c.symbol,
    }));

    // أسماء الأشهر بالعربي والإنجليزي
    const monthNames = language === 'ar'
        ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // اسم الباقة للعرض
    const getPlanDisplayName = (code: string) => {
        const names: Record<string, { ar: string; en: string }> = {
            'texa-starter': { ar: 'الباقة المبتدئة', en: 'Starter Plan' },
            'texa-professional': { ar: 'الباقة الاحترافية', en: 'Professional Plan' },
            'texa-enterprise': { ar: 'الباقة المؤسسية', en: 'Enterprise Plan' },
        };
        return language === 'ar' ? (names[code]?.ar || code) : (names[code]?.en || code);
    };

    const getCurrencyDisplayName = (code: string) => {
        const c = allCurrencies.find(c => c.code === code);
        return c ? (language === 'ar' ? c.nameAr : c.nameEn) : code;
    };

    const getCountryName = (code: string) => {
        const c = countries.find(c => c.code === code);
        return c ? (language === 'ar' ? c.nameAr : c.name) : code;
    };

    // ─── أيقونات الخطوات ─────────────────────────────
    const steps = [
        { icon: Store, label: language === 'ar' ? 'معلومات الشركة' : 'Company Info' },
        { icon: Coins, label: language === 'ar' ? 'الإعدادات المالية' : 'Financial Settings' },
        { icon: FileCheck, label: language === 'ar' ? 'مراجعة وتأكيد' : 'Review & Confirm' },
    ];

    // ════════════════════════════════════════════════
    // الخطوة 1: معلومات الشركة
    // ════════════════════════════════════════════════
    const renderStep1 = () => (
        <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            className="space-y-5"
        >
            <div className="text-center mb-4">
                <Store className="w-10 h-10 mx-auto mb-3 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('wizard.fabric.title')}</h2>
                <p className="text-sm text-gray-500">{t('wizard.fabric.subtitle')}</p>
            </div>

            <div className="grid gap-4">
                <div>
                    <Label className="text-sm font-medium">{t('wizard.labels.companyName')} <span className="text-red-500">*</span></Label>
                    <Input
                        value={formData.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        placeholder={t('wizard.labels.companyNamePlaceholder')}
                        className="h-11 text-base mt-1"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm font-medium">{t('wizard.labels.country')} <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.country}
                            onValueChange={(val) => {
                                handleChange('country', val);
                                const country = countries.find(c => c.code === val);
                                if (country) {
                                    handleChange('localCurrency', country.currency);
                                    if (!formData.mainCurrency) {
                                        handleChange('mainCurrency', country.currency);
                                    }
                                }
                            }}
                        >
                            <SelectTrigger className="h-11 mt-1">
                                <SelectValue placeholder={t('wizard.labels.countryPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {sortedCountries.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {language === 'ar' ? c.nameAr : c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">{t('wizard.labels.city')}</Label>
                        <Input
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder={t('wizard.labels.cityPlaceholder')}
                            className="h-11 mt-1"
                        />
                    </div>
                </div>

                <div>
                    <Label className="text-sm font-medium">{t('wizard.labels.phone')}</Label>
                    <div className="relative flex items-center mt-1" dir="ltr">
                        <div className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 px-3 flex items-center justify-center rounded-l text-gray-600 font-mono text-sm min-w-[60px]">
                            {selectedCountryDetails?.phoneCode || '+...'}
                        </div>
                        <Input
                            value={formData.phone}
                            onChange={(e) => {
                                // أرقام فقط
                                const digits = e.target.value.replace(/\D/g, '');
                                handleChange('phone', digits);
                            }}
                            placeholder={t('wizard.labels.phonePlaceholder')}
                            className="h-11 pl-[70px]"
                            inputMode="numeric"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    // ════════════════════════════════════════════════
    // الخطوة 2: الإعدادات المالية
    // ════════════════════════════════════════════════
    const renderStep2 = () => (
        <motion.div
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            className="space-y-5"
        >
            <div className="text-center mb-4">
                <Coins className="w-10 h-10 mx-auto mb-3 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('wizard.steps.financial')}</h2>
                <p className="text-sm text-gray-500">{t('wizard.subtitle')}</p>
            </div>

            <div className="grid gap-5">
                {/* اختيار الشجرة المحاسبية */}
                <div>
                    <Label className="text-sm font-semibold text-teal-700 mb-2 block">{t('wizard.labels.chartTemplate')} <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {chartTemplates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => handleChange('chartTemplate', template.id)}
                                className={cn(
                                    "cursor-pointer border-2 rounded-xl p-4 transition-all hover:bg-teal-50",
                                    formData.chartTemplate === template.id
                                        ? "border-teal-600 bg-teal-50 shadow-sm"
                                        : "border-gray-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm text-gray-800">{template.name}</span>
                                    {formData.chartTemplate === template.id && <Check className="w-5 h-5 text-teal-600" />}
                                </div>
                                <p className="text-xs text-gray-500">{template.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* العملات */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm font-medium">{t('wizard.labels.localCurrency')} <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.localCurrency}
                            onValueChange={(val) => handleChange('localCurrency', val)}
                        >
                            <SelectTrigger className="h-11 mt-1">
                                <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {currencies.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.symbol} {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">{t('wizard.labels.mainCurrency')} <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.mainCurrency}
                            onValueChange={(val) => handleChange('mainCurrency', val)}
                        >
                            <SelectTrigger className="h-11 mt-1 font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {currencies.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.symbol} {c.name} ({c.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* بداية السنة المالية - كل الأشهر */}
                <div>
                    <Label className="text-sm font-medium">{t('wizard.labels.fiscalYearStart')}</Label>
                    <Select
                        value={formData.fiscalYearStart.toString()}
                        onValueChange={(val) => handleChange('fiscalYearStart', parseInt(val))}
                    >
                        <SelectTrigger className="h-11 mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {monthNames.map((name, idx) => (
                                <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                                    {idx + 1} - {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </motion.div>
    );

    // ════════════════════════════════════════════════
    // الخطوة 3: المراجعة والتأكيد
    // ════════════════════════════════════════════════
    const renderStep3 = () => {
        const planInfo = PLAN_INFO[formData.selectedPlan] || PLAN_INFO['texa-professional'];
        const planColor = planInfo.color;

        return (
            <motion.div
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                className="space-y-4"
            >
                <div className="text-center mb-4">
                    <FileCheck className="w-10 h-10 mx-auto mb-3 text-teal-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                        {language === 'ar' ? 'مراجعة وتأكيد' : 'Review & Confirm'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {language === 'ar' ? 'تحقق من البيانات قبل إكمال التسجيل' : 'Verify your information before completing'}
                    </p>
                </div>

                {/* بطاقة الباقة */}
                <div className={cn(
                    "rounded-xl p-4 border-2",
                    planColor === 'emerald' && "bg-emerald-50 border-emerald-300",
                    planColor === 'blue' && "bg-blue-50 border-blue-300",
                    planColor === 'purple' && "bg-purple-50 border-purple-300",
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className={cn(
                                "w-5 h-5",
                                planColor === 'emerald' && "text-emerald-600",
                                planColor === 'blue' && "text-blue-600",
                                planColor === 'purple' && "text-purple-600",
                            )} />
                            <span className="font-bold text-gray-800">{getPlanDisplayName(formData.selectedPlan)}</span>
                        </div>
                        <span className={cn(
                            "text-xs font-semibold px-3 py-1 rounded-full",
                            planColor === 'emerald' && "bg-emerald-200 text-emerald-800",
                            planColor === 'blue' && "bg-blue-200 text-blue-800",
                            planColor === 'purple' && "bg-purple-200 text-purple-800",
                        )}>
                            {formData.billingCycle === 'yearly'
                                ? (language === 'ar' ? 'سنوي' : 'Yearly')
                                : (language === 'ar' ? 'شهري' : 'Monthly')}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {language === 'ar'
                            ? 'يمكنك تغيير أو ترقية الباقة في أي وقت من لوحة التحكم'
                            : 'You can change or upgrade your plan anytime from the dashboard'}
                    </p>
                </div>

                {/* ملخص البيانات */}
                <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                    {/* معلومات الشركة */}
                    <div className="p-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'معلومات الشركة' : 'Company Information'}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.companyName')}</span>
                                <p className="font-semibold text-gray-800">{formData.companyName}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.country')}</span>
                                <p className="font-semibold text-gray-800 flex items-center gap-1">
                                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                                    {getCountryName(formData.country)}
                                </p>
                            </div>
                            {formData.city && (
                                <div>
                                    <span className="text-gray-500">{t('wizard.labels.city')}</span>
                                    <p className="font-semibold text-gray-800">{formData.city}</p>
                                </div>
                            )}
                            {formData.phone && (
                                <div>
                                    <span className="text-gray-500">{t('wizard.labels.phone')}</span>
                                    <p className="font-semibold text-gray-800 flex items-center gap-1" dir="ltr">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {selectedCountryDetails?.phoneCode}{formData.phone}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* الإعدادات المالية */}
                    <div className="p-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'الإعدادات المالية' : 'Financial Settings'}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.chartTemplate')}</span>
                                <p className="font-semibold text-gray-800">
                                    {formData.chartTemplate === 'extended'
                                        ? t('wizard.labels.chartTemplateExtended')
                                        : t('wizard.labels.chartTemplateSimple')}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.localCurrency')}</span>
                                <p className="font-semibold text-gray-800">
                                    {getCurrencyDisplayName(formData.localCurrency)} ({formData.localCurrency})
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.mainCurrency')}</span>
                                <p className="font-semibold text-gray-800">
                                    {getCurrencyDisplayName(formData.mainCurrency)} ({formData.mainCurrency})
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">{t('wizard.labels.fiscalYearStart')}</span>
                                <p className="font-semibold text-gray-800 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    {monthNames[formData.fiscalYearStart - 1]}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-xs">
                        {language === 'ar'
                            ? 'سيتم إنشاء شركتك الرئيسية. يمكنك تعديل جميع الإعدادات لاحقاً، وستحصل على وصول للشركة التجريبية لتجربة النظام.'
                            : 'Your main company will be created. All settings can be changed later, and you will have access to the demo company to try the system.'}
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    };

    const ArrowRightIcon = isRTL ? ChevronLeft : ChevronRight;
    const ArrowLeftIcon = isRTL ? ChevronRight : ChevronLeft;

    // ⏳ شاشة التحميل أثناء معالجة OAuth
    if (waitingForOAuth || authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" />
                    <p className="text-gray-500 font-tajawal text-sm">
                        {language === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 flex items-center justify-center p-4">

            {/* زر تبديل اللغة */}
            <div className="absolute top-4 start-4">
                <LanguageSelector />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100"
            >
                {/* ─── شريط الخطوات المرئي ──────────────── */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        {steps.map((step, idx) => {
                            const StepIcon = step.icon;
                            const stepNum = idx + 1;
                            const isActive = currentStep === stepNum;
                            const isCompleted = currentStep > stepNum;

                            return (
                                <React.Fragment key={idx}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={cn(
                                            "w-9 h-9 rounded-full flex items-center justify-center transition-all border-2",
                                            isCompleted && "bg-white text-teal-700 border-white",
                                            isActive && "bg-white/20 text-white border-white",
                                            !isActive && !isCompleted && "bg-teal-800/30 text-teal-300 border-teal-500/30",
                                        )}>
                                            {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-medium max-w-[80px] text-center leading-tight",
                                            isActive ? "text-white" : isCompleted ? "text-teal-200" : "text-teal-400",
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-0.5 mx-2 mt-[-18px] rounded-full",
                                            isCompleted ? "bg-white/60" : "bg-teal-500/30",
                                        )} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* شريط التقدم */}
                <div className="h-1 bg-gray-100">
                    <motion.div
                        className="h-full bg-teal-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                    />
                </div>

                {/* المحتوى */}
                <div className="p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                    </AnimatePresence>

                    {/* أزرار التنقل */}
                    <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
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
                                className="bg-teal-700 hover:bg-teal-800 text-white min-w-[140px] rounded-xl h-11"
                            >
                                {t('wizard.actions.next')}
                                <ArrowRightIcon className="w-4 h-4 ms-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-teal-700 hover:bg-teal-800 text-white min-w-[160px] rounded-xl h-11"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">{submissionPhase}</span>
                                    </span>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 me-2" />
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

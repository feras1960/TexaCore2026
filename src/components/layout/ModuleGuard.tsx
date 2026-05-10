/**
 * ModuleGuard - حماية الوصول للموديولات عبر الروابط المباشرة
 * يتحقق من صلاحيات المستخدم قبل عرض المحتوى
 */

import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { STATIC_MODULES } from '@/config/modules';
import { Shield, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

// خريطة المسارات إلى أكواد الموديولات
const PATH_TO_MODULE: Record<string, string> = {};
STATIC_MODULES.forEach(m => {
    if (m.path && m.path !== '/') {
        // /inventory → inventory, /sales → sales, etc.
        const code = m.path.replace('/', '');
        PATH_TO_MODULE[m.path] = m.code || code;
    }
});

export default function ModuleGuard() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuth();
    const { visibleModules, canSeeModule, isPlatformAdmin, loading: rbacLoading } = useRBAC();
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    // تحديد الموديول الحالي من المسار
    const currentModule = useMemo(() => {
        const path = location.pathname;

        // Dashboard always allowed
        if (path === '/') return null;

        // Find matching module
        for (const [modulePath, moduleCode] of Object.entries(PATH_TO_MODULE)) {
            if (path === modulePath || path.startsWith(modulePath + '/')) {
                return moduleCode;
            }
        }
        return null;
    }, [location.pathname]);

    // التحقق من الصلاحية
    const isAllowed = useMemo(() => {
        // 🖥️ LOCAL/SELF-HOSTED: السماح بكل الموديولات (المالك المحلي)
        const isSelfHosted = typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.endsWith('.texacore.ai')
        );
        if (isSelfHosted) return true;

        // لا حاجة للتحقق أثناء التحميل
        if (rbacLoading) return true; // سنتحقق بعد التحميل

        // Dashboard always allowed
        if (!currentModule) return true;

        // Super admin & platform admin see everything
        if (isSuperAdmin || isPlatformAdmin()) return true;

        // Check if user can see this module
        if (visibleModules.includes('all')) return true;

        return canSeeModule(currentModule);
    }, [currentModule, rbacLoading, isSuperAdmin, visibleModules, canSeeModule, isPlatformAdmin]);

    // بعد اكتمال التحميل، إذا غير مسموح → عرض رسالة
    if (!rbacLoading && !isAllowed && currentModule) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {isRTL ? 'الوصول غير مسموح' : 'Access Denied'}
                </h2>
                <p className="text-gray-500 mb-6 max-w-md">
                    {isRTL
                        ? 'هذا القسم غير متاح في باقتك الحالية. يمكنك ترقية الباقة للوصول لمزيد من الأقسام.'
                        : 'This module is not available in your current plan. Upgrade to access more features.'}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#0d5c4d] to-teal-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                    >
                        {isRTL ? 'العودة للوحة التحكم' : 'Go to Dashboard'}
                    </button>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs text-gray-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'محمي بنظام الصلاحيات' : 'Protected by RBAC'}</span>
                </div>
            </motion.div>
        );
    }

    return <Outlet />;
}

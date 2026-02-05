import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface MfaSystemSettings {
    id: string;
    is_enabled: boolean;
    allow_totp: boolean;
    allow_email_otp: boolean;
    allow_sms_otp: boolean;
    enforce_for_admins: boolean;
    enforce_for_all: boolean;
    otp_expiry_seconds: number;
    otp_length: number;
    max_attempts: number;
    lockout_duration_minutes: number;
}

export interface MfaUserSettings {
    id: string;
    user_id: string;
    is_enabled: boolean;
    preferred_method: 'totp' | 'email' | 'sms';
    totp_verified: boolean;
    email_otp_enabled: boolean;
    sms_otp_enabled: boolean;
    backup_codes?: string[];
}

export interface MfaEnrollResponse {
    id: string;
    type: 'totp';
    totp: {
        qr_code: string;
        secret: string;
        uri: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Hook: useMfaSettings
// ═══════════════════════════════════════════════════════════════════════════

export function useMfaSettings() {
    const [systemSettings, setSystemSettings] = useState<MfaSystemSettings | null>(null);
    const [userSettings, setUserSettings] = useState<MfaUserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // تحميل إعدادات النظام
    const loadSystemSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('mfa_system_settings')
                .select('*')
                .single();

            if (error) throw error;
            setSystemSettings(data);
        } catch (err) {
            console.error('Error loading MFA system settings:', err);
            setError('فشل في تحميل إعدادات النظام');
        }
    }, []);

    // تحميل إعدادات المستخدم
    const loadUserSettings = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('mfa_user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setUserSettings(data);
        } catch (err) {
            console.error('Error loading MFA user settings:', err);
        }
    }, []);

    // تحديث إعدادات النظام
    const updateSystemSettings = async (updates: Partial<MfaSystemSettings>) => {
        try {
            const { error } = await supabase
                .from('mfa_system_settings')
                .update(updates)
                .eq('id', systemSettings?.id);

            if (error) throw error;

            setSystemSettings(prev => prev ? { ...prev, ...updates } : null);
            toast.success('تم حفظ الإعدادات');
            return true;
        } catch (err) {
            console.error('Error updating MFA settings:', err);
            toast.error('فشل في حفظ الإعدادات');
            return false;
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([loadSystemSettings(), loadUserSettings()]);
            setLoading(false);
        };
        load();
    }, [loadSystemSettings, loadUserSettings]);

    return {
        systemSettings,
        userSettings,
        loading,
        error,
        updateSystemSettings,
        refetch: () => Promise.all([loadSystemSettings(), loadUserSettings()])
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Hook: useMfaEnrollment
// ═══════════════════════════════════════════════════════════════════════════

export function useMfaEnrollment() {
    const [enrollData, setEnrollData] = useState<MfaEnrollResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // بدء التسجيل في TOTP
    const startTotpEnrollment = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Authenticator App'
            });

            if (error) throw error;
            setEnrollData(data);
            return data;
        } catch (err: any) {
            console.error('Error enrolling TOTP:', err);
            toast.error(err.message || 'فشل في بدء التسجيل');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // التحقق من الكود
    const verifyTotpCode = async (factorId: string, code: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code
            });

            if (error) throw error;

            // تحديث user_settings
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('mfa_user_settings').upsert({
                    user_id: user.id,
                    is_enabled: true,
                    preferred_method: 'totp',
                    totp_verified: true,
                    totp_enabled_at: new Date().toISOString()
                });
            }

            toast.success('تم تفعيل التحقق بخطوتين بنجاح!');
            setEnrollData(null);
            return true;
        } catch (err: any) {
            console.error('Error verifying TOTP:', err);
            toast.error(err.message || 'الكود غير صحيح');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // إلغاء التسجيل
    const cancelEnrollment = () => {
        setEnrollData(null);
    };

    // تعطيل 2FA
    const disableMfa = async () => {
        setLoading(true);
        try {
            // الحصول على العوامل المسجلة
            const { data: factors } = await supabase.auth.mfa.listFactors();

            // حذف كل العوامل
            if (factors?.totp) {
                for (const factor of factors.totp) {
                    await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
            }

            // تحديث الإعدادات
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('mfa_user_settings').upsert({
                    user_id: user.id,
                    is_enabled: false,
                    totp_verified: false
                });
            }

            toast.success('تم تعطيل التحقق بخطوتين');
            return true;
        } catch (err: any) {
            console.error('Error disabling MFA:', err);
            toast.error(err.message || 'فشل في تعطيل التحقق بخطوتين');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        enrollData,
        loading,
        startTotpEnrollment,
        verifyTotpCode,
        cancelEnrollment,
        disableMfa
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Hook: useMfaChallenge (للتحقق عند الدخول)
// ═══════════════════════════════════════════════════════════════════════════

export function useMfaChallenge() {
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // الحصول على عوامل المستخدم
    const getFactors = async () => {
        const { data } = await supabase.auth.mfa.listFactors();
        return data;
    };

    // بدء التحدي
    const startChallenge = async (fId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.challenge({ factorId: fId });
            if (error) throw error;

            setChallengeId(data.id);
            setFactorId(fId);
            return data;
        } catch (err: any) {
            console.error('Error starting challenge:', err);
            toast.error('فشل في بدء التحقق');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // التحقق من الكود
    const verify = async (code: string) => {
        if (!challengeId || !factorId) return false;

        setLoading(true);
        try {
            const { error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId,
                code
            });

            if (error) throw error;

            // تسجيل المحاولة الناجحة
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('mfa_verification_log').insert({
                    user_id: user.id,
                    method: 'totp',
                    is_successful: true
                });
            }

            return true;
        } catch (err: any) {
            // تسجيل المحاولة الفاشلة
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('mfa_verification_log').insert({
                    user_id: user.id,
                    method: 'totp',
                    is_successful: false,
                    failure_reason: err.message
                });
            }

            console.error('Error verifying:', err);
            toast.error('الكود غير صحيح');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        challengeId,
        factorId,
        loading,
        getFactors,
        startChallenge,
        verify
    };
}

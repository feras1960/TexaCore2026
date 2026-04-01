/**
 * ════════════════════════════════════════════════════════════════
 * 🔒 SecurityTab — تاب الأمان
 * ════════════════════════════════════════════════════════════════
 * - تغيير كلمة المرور مع مؤشر القوة
 * - المصادقة بخطوتين (2FA/TOTP)
 * - الجلسات النشطة (مع الجهاز والموقع)
 * - سجل تسجيل الدخول
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { profileService, geolocateIP, type LoginHistoryEntry, type ActiveSession } from '../services/profileService';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Lock, Eye, EyeOff, Shield, ShieldCheck, Smartphone, Monitor,
    Tablet, Globe, MapPin, Clock, Trash2, CheckCircle2, XCircle,
    Loader2, AlertTriangle, LogOut, KeyRound, QrCode, Copy, RefreshCw,
    ChevronDown, ChevronUp, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Password Strength ──────────────────────────────────────

function getPasswordStrength(password: string): { score: number; checks: { label: string; passed: boolean }[] } {
    const checks = [
        { label: 'min8', passed: password.length >= 8 },
        { label: 'uppercase', passed: /[A-Z]/.test(password) },
        { label: 'lowercase', passed: /[a-z]/.test(password) },
        { label: 'number', passed: /[0-9]/.test(password) },
        { label: 'special', passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
    const score = checks.filter(c => c.passed).length;
    return { score, checks };
}

function PasswordStrengthBar({ score }: { score: number }) {
    const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];
    const labels: Record<string, string[]> = {
        ar: ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'],
        en: ['Very Weak', 'Weak', 'Fair', 'Good', 'Excellent'],
    };
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div className="space-y-1">
            <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            i < score ? colors[score - 1] : 'bg-gray-200 dark:bg-gray-700'
                        )}
                    />
                ))}
            </div>
            {score > 0 && (
                <p className={cn("text-xs font-medium", colors[score - 1].replace('bg-', 'text-'))}>
                    {(isAr ? labels.ar : labels.en)[score - 1]}
                </p>
            )}
        </div>
    );
}

// ─── Device Icon ────────────────────────────────────────────

function DeviceIcon({ type, className }: { type?: string; className?: string }) {
    switch (type?.toLowerCase()) {
        case 'mobile': return <Smartphone className={className} />;
        case 'tablet': return <Tablet className={className} />;
        default: return <Monitor className={className} />;
    }
}

// ─── Main Component ─────────────────────────────────────────

export default function SecurityTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    return (
        <div className="space-y-6 py-4 max-w-3xl mx-auto">
            <ChangePasswordSection isAr={isAr} />
            <TwoFactorSection isAr={isAr} />
            <ActiveSessionsSection isAr={isAr} />
            <TrustedDevicesSection isAr={isAr} />
            <LoginHistorySection isAr={isAr} />
        </div>
    );
}

// ─── Change Password ────────────────────────────────────────

function ChangePasswordSection({ isAr }: { isAr: boolean }) {
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const { score, checks } = getPasswordStrength(newPw);
    const passwordsMatch = newPw && confirmPw && newPw === confirmPw;
    const canSubmit = currentPw && newPw && confirmPw && passwordsMatch && score >= 3;

    const checkLabels: Record<string, Record<string, string>> = {
        min8: { ar: '8 أحرف على الأقل', en: 'At least 8 characters' },
        uppercase: { ar: 'حرف كبير واحد', en: 'One uppercase letter' },
        lowercase: { ar: 'حرف صغير واحد', en: 'One lowercase letter' },
        number: { ar: 'رقم واحد', en: 'One number' },
        special: { ar: 'رمز خاص واحد (!@#$)', en: 'One special character' },
    };

    const handleChange = async () => {
        try {
            setSaving(true);
            setError('');

            // Verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: (await supabase.auth.getUser()).data.user?.email || '',
                password: currentPw,
            });
            if (signInError) {
                setError(isAr ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
                return;
            }

            await profileService.changePassword(newPw);

            // 🔐 مسح الكاش المحلي بعد تغيير الباسوورد — حماية أمنية
            try {
                const { dataEngine } = await import('@/engine/DataEngine');
                await dataEngine.clearAll();
                // إعادة تحميل الصفحة لضمان تنظيف كامل + إعادة تحميل البيانات
                window.location.reload();
                return; // لن يُنفّذ ما بعده لأن الصفحة ستُعاد تحميلها
            } catch {
                // تجاهل — DataEngine قد لا يكون محملاً
            }

            setStatus('success');
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err: any) {
            setError(err.message);
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                    <Label className="text-sm">{isAr ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                    <div className="relative">
                        <Input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            className="pe-10"
                            dir="ltr"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600"
                        >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                    <Label className="text-sm">{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                    <div className="relative">
                        <Input
                            type={showNew ? 'text' : 'password'}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            className="pe-10"
                            dir="ltr"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600"
                        >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {newPw && <PasswordStrengthBar score={score} />}
                </div>

                {/* Password Requirements */}
                {newPw && (
                    <div className="grid grid-cols-2 gap-1.5">
                        {checks.map(check => (
                            <div key={check.label} className="flex items-center gap-1.5 text-xs">
                                {check.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                    <XCircle className="w-3.5 h-3.5 text-gray-300" />
                                )}
                                <span className={check.passed ? 'text-emerald-600' : 'text-gray-400'}>
                                    {checkLabels[check.label]?.[isAr ? 'ar' : 'en']}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label className="text-sm">{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                    <Input
                        type="password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        dir="ltr"
                    />
                    {confirmPw && !passwordsMatch && (
                        <p className="text-xs text-red-500">{isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}</p>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </p>
                )}
                {status === 'success' && (
                    <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> {isAr ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!'}
                    </p>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleChange} disabled={!canSubmit || saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Two Factor Authentication ──────────────────────────────

function TwoFactorSection({ isAr }: { isAr: boolean }) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [qrUri, setQrUri] = useState('');
    const [secret, setSecret] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [factorId, setFactorId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        checkMfaStatus();
    }, []);

    const checkMfaStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (!error && data?.totp && data.totp.length > 0) {
                const verified = data.totp.find(f => f.status === 'verified');
                setEnabled(!!verified);
                if (verified) setFactorId(verified.id);
            }
        } catch { }
        setLoading(false);
    };

    const handleEnroll = async () => {
        try {
            setEnrolling(true);
            setError('');
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'TexaCore Authenticator',
            });
            if (error) throw error;
            if (data) {
                setQrUri(data.totp.uri);
                setSecret(data.totp.secret);
                setFactorId(data.id);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerify = async () => {
        try {
            setError('');
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.id,
                code: verifyCode,
            });
            if (verifyError) throw verifyError;

            setEnabled(true);
            setQrUri('');
            setSecret('');
            setVerifyCode('');
            // 🔐 Sync ALL 2FA data stores
            profileService.updateProfile({ two_factor_enabled: true }).catch(e => console.warn('[2FA] Failed to sync user_profiles:', e));
            supabase.from('mfa_user_settings').upsert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                is_enabled: true,
                preferred_method: 'totp',
                totp_verified: true,
            }).then(({ error: e }) => e && console.warn('[2FA] Failed to sync mfa_user_settings:', e));
        } catch (err: any) {
            setError(isAr ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
        }
    };

    const handleDisable = async () => {
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            setEnabled(false);
            setFactorId('');
            // 🔐 Sync ALL 2FA data stores
            profileService.updateProfile({ two_factor_enabled: false }).catch(e => console.warn('[2FA] Failed to sync user_profiles:', e));
            const userId = (await supabase.auth.getUser()).data.user?.id;
            if (userId) {
                supabase.from('mfa_user_settings').upsert({
                    user_id: userId,
                    is_enabled: false,
                    totp_verified: false,
                }).then(({ error: e }) => e && console.warn('[2FA] Failed to sync mfa_user_settings:', e));
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) return null;

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {isAr ? 'المصادقة بخطوتين (2FA)' : 'Two-Factor Authentication (2FA)'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {enabled ? (
                    /* 2FA Enabled */
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-8 h-8 text-emerald-600" />
                            <div>
                                <p className="font-semibold text-emerald-800 dark:text-emerald-400">
                                    {isAr ? 'المصادقة بخطوتين مفعّلة' : '2FA is enabled'}
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                                    {isAr ? 'حسابك محمي بطبقة أمان إضافية' : 'Your account is protected with an extra layer of security'}
                                </p>
                            </div>
                        </div>
                        <Button variant="destructive" size="sm" onClick={handleDisable} className="gap-2">
                            <Shield className="w-4 h-4" />
                            {isAr ? 'إيقاف المصادقة بخطوتين' : 'Disable 2FA'}
                        </Button>
                    </div>
                ) : qrUri ? (
                    /* QR Code Step */
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isAr
                                ? 'امسح رمز QR باستخدام تطبيق Authenticator (مثل Google Authenticator أو Authy)'
                                : 'Scan the QR code with your Authenticator app (e.g. Google Authenticator or Authy)'}
                        </p>
                        <div className="flex justify-center p-4 bg-white rounded-xl border">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="QR Code" className="w-48 h-48" />
                        </div>
                        {/* Manual code */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">{isAr ? 'أو أدخل الرمز يدوياً:' : 'Or enter manually:'}</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm font-mono flex-1 break-all">{secret}</code>
                                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(secret)}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        {/* Verify */}
                        <div className="space-y-2">
                            <Label>{isAr ? 'أدخل رمز التحقق (6 أرقام)' : 'Enter verification code (6 digits)'}</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="text-center text-lg tracking-widest font-mono max-w-[200px]"
                                    dir="ltr"
                                    maxLength={6}
                                />
                                <Button onClick={handleVerify} disabled={verifyCode.length !== 6} className="bg-emerald-600 hover:bg-emerald-700">
                                    {isAr ? 'تحقق' : 'Verify'}
                                </Button>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                    </div>
                ) : (
                    /* Not Enabled */
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isAr
                                ? 'أضف طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة'
                                : 'Add an extra layer of security using an authenticator app'}
                        </p>
                        <Button onClick={handleEnroll} disabled={enrolling} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                            {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            {isAr ? 'تفعيل المصادقة بخطوتين' : 'Enable 2FA'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Active Sessions ────────────────────────────────────────

function ActiveSessionsSection({ isAr }: { isAr: boolean }) {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [terminatingId, setTerminatingId] = useState<string | null>(null);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const data = await profileService.getActiveSessions();

            // Get current session ID from JWT token
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            let currentSessionId: string | null = null;
            if (currentSession?.access_token) {
                try {
                    const payload = JSON.parse(atob(currentSession.access_token.split('.')[1]));
                    currentSessionId = payload.session_id || null;
                } catch { }
            }

            // Mark the actual current session
            data.forEach(s => {
                s.is_current = s.id === currentSessionId;
            });

            // If no match found, fallback to most recent
            if (!data.some(s => s.is_current) && data.length > 0) {
                data[0].is_current = true;
            }

            setSessions(data);
        } catch { }
        setLoading(false);
    };

    const handleTerminate = async (id: string) => {
        try {
            setTerminatingId(id);
            await profileService.terminateSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch { }
        setTerminatingId(null);
    };

    const handleTerminateAll = async () => {
        try {
            await profileService.terminateAllOtherSessions();
            setSessions(prev => prev.filter(s => s.is_current));
        } catch { }
    };

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return isAr ? 'نشط الآن' : 'Active now';
        if (diffMin < 60) return isAr ? `منذ ${String(diffMin)} دقيقة` : `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return isAr ? `منذ ${String(diffHours)} ساعة` : `${diffHours}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-purple-600" />
                        {isAr ? 'الجلسات النشطة' : 'Active Sessions'}
                        {sessions.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
                        )}
                    </CardTitle>
                    {sessions.filter(s => !s.is_current).length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleTerminateAll} className="gap-1.5 text-xs text-red-600 hover:bg-red-50">
                            <LogOut className="w-3.5 h-3.5" />
                            {isAr ? 'إنهاء الكل' : 'End All'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        {isAr ? 'لا توجد جلسات نشطة مسجلة حالياً' : 'No active sessions currently recorded'}
                    </p>
                ) : (
                    sessions.map(session => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                session.is_current
                                    ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                    : "bg-gray-50/50 dark:bg-gray-800/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    session.is_current ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"
                                )}>
                                    <DeviceIcon type={session.device_type} className={cn("w-5 h-5", session.is_current ? "text-blue-600" : "text-gray-500")} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {session.browser || 'Unknown'} — {session.os || 'Unknown'}
                                        </p>
                                        {session.is_current && (
                                            <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                                                {isAr ? 'الجلسة الحالية' : 'Current'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                                        <span className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                                            session.is_current
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : "bg-gray-100 text-gray-500"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", session.is_current ? "bg-emerald-500 animate-pulse" : "bg-gray-400")} />
                                            {session.is_current ? (isAr ? 'نشطة' : 'Active') : (isAr ? 'غير نشطة' : 'Inactive')}
                                        </span>
                                        {session.location_city && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {session.location_city}{session.location_country ? `, ${session.location_country}` : ''}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(session.last_active_at)}
                                        </span>
                                        {session.ip_address && (
                                            <span className="flex items-center gap-1 font-mono text-[10px]" dir="ltr">
                                                <Globe className="w-3 h-3" />
                                                {session.ip_address}
                                            </span>
                                        )}
                                        {(session as any).is_mfa && (
                                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0">
                                                🔐 2FA
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {!session.is_current && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTerminate(session.id)}
                                    disabled={terminatingId === session.id}
                                    className="gap-1.5 text-red-600 hover:bg-red-50 text-xs"
                                >
                                    {terminatingId === session.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <LogOut className="w-3.5 h-3.5" />
                                    )}
                                    {isAr ? 'إنهاء' : 'End'}
                                </Button>
                            )}
                        </motion.div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

// ─── Trusted Devices ────────────────────────────────────────

interface TrustedDevice {
    device_id: string;
    device_name: string;
    ip_address: string;
    location_city: string | null;
    location_country: string | null;
    trusted_until: string;
    created_at: string;
    last_used_at: string | null;
}

function TrustedDevicesSection({ isAr }: { isAr: boolean }) {
    const [devices, setDevices] = useState<TrustedDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            const { data } = await supabase.rpc('get_my_trusted_devices');
            const rawDevices = (data || []).map((d: any) => ({
                device_id: d.device_id,
                device_name: d.device_name || 'Unknown',
                ip_address: d.ip_address || '',
                location_city: null as string | null,
                location_country: null as string | null,
                trusted_until: d.trusted_until,
                created_at: d.created_at,
                last_used_at: d.last_used_at || null,
            }));

            // Enrich with geolocation
            for (const dev of rawDevices) {
                if (dev.ip_address) {
                    const geo = await geolocateIP(dev.ip_address);
                    if (geo) {
                        dev.location_city = geo.city;
                        dev.location_country = geo.country;
                    }
                }
            }

            setDevices(rawDevices);
        } catch { }
        setLoading(false);
    };

    const handleRevoke = async (deviceId: string) => {
        try {
            setRevokingId(deviceId);
            await supabase.rpc('revoke_trusted_device', { p_device_id: deviceId });
            setDevices(prev => prev.filter(d => d.device_id !== deviceId));
            // Also clear local token if this is the current device
            localStorage.removeItem('texacore_trusted_device');
        } catch { }
        setRevokingId(null);
    };

    const handleRevokeAll = async () => {
        try {
            await supabase.rpc('revoke_all_trusted_devices');
            setDevices([]);
            localStorage.removeItem('texacore_trusted_device');
        } catch { }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        {isAr ? 'الأجهزة الموثوقة' : 'Trusted Devices'}
                        {devices.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{devices.length}</Badge>
                        )}
                    </CardTitle>
                    {devices.length > 1 && (
                        <Button variant="outline" size="sm" onClick={handleRevokeAll} className="gap-1.5 text-xs text-red-600 hover:bg-red-50">
                            <LogOut className="w-3.5 h-3.5" />
                            {isAr ? 'إلغاء الكل' : 'Revoke All'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {devices.length === 0 ? (
                    <div className="text-center py-4">
                        <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                            {isAr ? 'لا توجد أجهزة موثوقة حالياً' : 'No trusted devices yet'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {isAr
                                ? 'عند تسجيل الدخول بخطوتين، اختر "الوثوق بهذا الجهاز" لتخطي التحقق لمدة 30 يوم'
                                : 'During 2FA login, check "Trust this device" to skip verification for 30 days'}
                        </p>
                    </div>
                ) : (
                    devices.map(device => (
                        <motion.div
                            key={device.device_id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    {device.device_name.includes('macOS') || device.device_name.includes('Windows') || device.device_name.includes('Linux')
                                        ? <Monitor className="w-5 h-5 text-blue-600" />
                                        : <Smartphone className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {device.device_name}
                                    </p>
                                    <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>
                                            {isAr ? 'موثوق حتى' : 'Trusted until'}{' '}
                                            {new Date(device.trusted_until).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </span>
                                        {device.location_city && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {device.location_city}{device.location_country ? `, ${device.location_country}` : ''}
                                            </span>
                                        )}
                                        {device.ip_address && (
                                            <span className="flex items-center gap-1 font-mono text-[10px]" dir="ltr">
                                                <Globe className="w-3 h-3" />
                                                {device.ip_address}
                                            </span>
                                        )}
                                        {device.last_used_at && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {isAr ? 'آخر استخدام' : 'Last used'}{' '}
                                                {new Date(device.last_used_at).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(device.device_id)}
                                disabled={revokingId === device.device_id}
                                className="gap-1.5 text-red-600 hover:bg-red-50 text-xs"
                            >
                                {revokingId === device.device_id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <X className="w-3.5 h-3.5" />
                                )}
                                {isAr ? 'إلغاء' : 'Revoke'}
                            </Button>
                        </motion.div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

// ─── Login History ──────────────────────────────────────────

function LoginHistorySection({ isAr }: { isAr: boolean }) {
    const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await profileService.getLoginHistory(30);
            setHistory(data);
        } catch { }
        setLoading(false);
    };

    const displayHistory = expanded ? history : history.slice(0, 5);

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    {isAr ? 'سجل تسجيل الدخول' : 'Login History'}
                    <span className="text-xs text-gray-400 font-normal">({isAr ? 'آخر 30 يوم' : 'Last 30 days'})</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        {isAr ? 'لا يوجد سجل دخول حتى الآن' : 'No login history yet'}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {displayHistory.map(entry => (
                            <div
                                key={entry.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm"
                            >
                                {entry.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center flex-wrap gap-3">
                                        <span className="text-xs text-gray-500 font-mono" dir="ltr">
                                            {new Date(entry.login_at).toLocaleString('en-US', {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                                hour12: false
                                            })}
                                        </span>
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                            {entry.browser}/{entry.os}
                                        </span>
                                        {entry.location_city && (
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {entry.location_city}{entry.location_country ? `, ${entry.location_country}` : ''}
                                            </span>
                                        )}
                                        {entry.ip_address && (
                                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1" dir="ltr">
                                                <Globe className="w-3 h-3" />
                                                {entry.ip_address}
                                            </span>
                                        )}
                                        {(entry as any).is_mfa && (
                                            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0">
                                                🔐 2FA
                                            </Badge>
                                        )}
                                    </div>
                                    {!entry.success && (
                                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 mt-1">
                                            {entry.failure_reason || (isAr ? 'فشل' : 'Failed')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                        {history.length > 5 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded(!expanded)}
                                className="w-full text-xs text-gray-500 gap-1"
                            >
                                {expanded ? (
                                    <><ChevronUp className="w-3.5 h-3.5" />{isAr ? 'عرض أقل' : 'Show Less'}</>
                                ) : (
                                    <><ChevronDown className="w-3.5 h-3.5" />{isAr ? `عرض الكل (${history.length})` : `Show All (${history.length})`}</>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

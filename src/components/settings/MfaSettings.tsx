import { useState } from 'react';
import { useLanguage } from '@/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Shield,
    Smartphone,
    Mail,
    MessageSquare,
    QrCode,
    Key,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Copy,
    RefreshCw
} from 'lucide-react';
import { useMfaSettings, useMfaEnrollment } from '@/hooks/useMfa';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 MFA Settings Component - إعدادات النظام
// ═══════════════════════════════════════════════════════════════════════════

export function MfaSystemSettingsCard() {
    const { language } = useLanguage();
    const { systemSettings, loading, updateSystemSettings } = useMfaSettings();
    const [saving, setSaving] = useState(false);

    // Simple translation helper
    const t = (key: string, fallback: string) => fallback;

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (!systemSettings) return null;

    const handleToggle = async (field: string, value: boolean) => {
        setSaving(true);
        await updateSystemSettings({ [field]: value });
        setSaving(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>{t('settings.mfa.title', 'التحقق بخطوتين (2FA)')}</CardTitle>
                </div>
                <CardDescription>
                    {t('settings.mfa.description', 'إدارة إعدادات التحقق بخطوتين على مستوى النظام')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* تفعيل/تعطيل النظام */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>{t('settings.mfa.enable', 'تفعيل نظام 2FA')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('settings.mfa.enableDesc', 'السماح للمستخدمين بتفعيل التحقق بخطوتين')}
                        </p>
                    </div>
                    <Switch
                        checked={systemSettings.is_enabled}
                        onCheckedChange={(v) => handleToggle('is_enabled', v)}
                        disabled={saving}
                    />
                </div>

                <Separator />

                {/* الطرق المتاحة */}
                <div className="space-y-4">
                    <h4 className="font-medium">{t('settings.mfa.methods', 'طرق التحقق المتاحة')}</h4>

                    {/* TOTP */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Smartphone className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <Label>{t('settings.mfa.totp', 'تطبيق Authenticator')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    Google Authenticator, Authy
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={systemSettings.allow_totp}
                            onCheckedChange={(v) => handleToggle('allow_totp', v)}
                            disabled={saving || !systemSettings.is_enabled}
                        />
                    </div>

                    {/* Email OTP */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-500/10">
                                <Mail className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                                <Label>{t('settings.mfa.email', 'البريد الإلكتروني')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.mfa.emailDesc', 'إرسال كود OTP عبر البريد')}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={systemSettings.allow_email_otp}
                            onCheckedChange={(v) => handleToggle('allow_email_otp', v)}
                            disabled={saving || !systemSettings.is_enabled}
                        />
                    </div>

                    {/* SMS OTP */}
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-500/10">
                                <MessageSquare className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                                <Label>{t('settings.mfa.sms', 'رسالة SMS')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.mfa.smsDesc', 'يتطلب إعداد Twilio')}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={systemSettings.allow_sms_otp}
                            onCheckedChange={(v) => handleToggle('allow_sms_otp', v)}
                            disabled={saving || !systemSettings.is_enabled}
                        />
                    </div>
                </div>

                <Separator />

                {/* الإلزام */}
                <div className="space-y-4">
                    <h4 className="font-medium">{t('settings.mfa.enforcement', 'إلزام التحقق')}</h4>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('settings.mfa.enforceAdmins', 'إلزامي للمدراء')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('settings.mfa.enforceAdminsDesc', 'المدراء يجب أن يفعلوا 2FA')}
                            </p>
                        </div>
                        <Switch
                            checked={systemSettings.enforce_for_admins}
                            onCheckedChange={(v) => handleToggle('enforce_for_admins', v)}
                            disabled={saving || !systemSettings.is_enabled}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>{t('settings.mfa.enforceAll', 'إلزامي للجميع')}</Label>
                            <p className="text-sm text-muted-foreground">
                                {t('settings.mfa.enforceAllDesc', 'كل المستخدمين يجب أن يفعلوا 2FA')}
                            </p>
                        </div>
                        <Switch
                            checked={systemSettings.enforce_for_all}
                            onCheckedChange={(v) => handleToggle('enforce_for_all', v)}
                            disabled={saving || !systemSettings.is_enabled}
                        />
                    </div>
                </div>

                {!systemSettings.is_enabled && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {t('settings.mfa.disabled', 'نظام 2FA معطل حالياً. فعّله للسماح للمستخدمين بتأمين حساباتهم.')}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 User MFA Setup - إعداد 2FA للمستخدم
// ═══════════════════════════════════════════════════════════════════════════

export function MfaUserSetupCard() {
    const { language } = useLanguage();
    const { userSettings, loading: settingsLoading, refetch } = useMfaSettings();
    const { enrollData, loading, startTotpEnrollment, verifyTotpCode, cancelEnrollment, disableMfa } = useMfaEnrollment();
    const [verificationCode, setVerificationCode] = useState('');
    const [showDisableDialog, setShowDisableDialog] = useState(false);

    // Simple translation helper
    const t = (key: string, fallback: string) => fallback;

    const handleStartSetup = async () => {
        await startTotpEnrollment();
    };

    const handleVerify = async () => {
        if (enrollData && verificationCode.length === 6) {
            const success = await verifyTotpCode(enrollData.id, verificationCode);
            if (success) {
                setVerificationCode('');
                refetch();
            }
        }
    };

    const handleDisable = async () => {
        const success = await disableMfa();
        if (success) {
            setShowDisableDialog(false);
            refetch();
        }
    };

    const isEnabled = userSettings?.is_enabled && userSettings?.totp_verified;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            <CardTitle>{t('settings.mfa.userTitle', 'حماية حسابك')}</CardTitle>
                        </div>
                        {isEnabled ? (
                            <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('settings.mfa.active', 'مفعّل')}
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                {t('settings.mfa.inactive', 'غير مفعّل')}
                            </Badge>
                        )}
                    </div>
                    <CardDescription>
                        {t('settings.mfa.userDesc', 'أضف طبقة أمان إضافية لحسابك باستخدام التحقق بخطوتين')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEnabled ? (
                        // المستخدم لديه 2FA مفعل
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="font-medium text-green-700 dark:text-green-300">
                                        {t('settings.mfa.protected', 'حسابك محمي')}
                                    </p>
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        {t('settings.mfa.protectedDesc', 'التحقق بخطوتين مفعّل باستخدام تطبيق Authenticator')}
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="destructive"
                                onClick={() => setShowDisableDialog(true)}
                                disabled={loading}
                            >
                                {t('settings.mfa.disable', 'تعطيل التحقق بخطوتين')}
                            </Button>
                        </div>
                    ) : enrollData ? (
                        // عرض QR Code للمسح
                        <div className="space-y-6">
                            <div className="text-center space-y-4">
                                <div className="inline-block p-4 bg-white rounded-lg">
                                    <QRCode value={enrollData.totp.uri} size={180} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.mfa.scanQr', 'امسح الكود باستخدام تطبيق Google Authenticator أو Authy')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('settings.mfa.manualKey', 'أو أدخل المفتاح يدوياً:')}</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 rounded bg-muted font-mono text-sm break-all">
                                        {enrollData.totp.secret}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(enrollData.totp.secret);
                                            toast.success('تم النسخ');
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>{t('settings.mfa.enterCode', 'أدخل الكود من التطبيق للتأكيد:')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="text-center text-2xl tracking-widest font-mono"
                                    />
                                    <Button
                                        onClick={handleVerify}
                                        disabled={verificationCode.length !== 6 || loading}
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.verify', 'تحقق')}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={cancelEnrollment}
                                className="w-full"
                            >
                                {t('common.cancel', 'إلغاء')}
                            </Button>
                        </div>
                    ) : (
                        // زر البدء
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Button
                                    onClick={handleStartSetup}
                                    disabled={loading || settingsLoading}
                                    className="h-auto py-4"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <QrCode className="h-8 w-8" />
                                        <span>{t('settings.mfa.setupTotp', 'إعداد Authenticator')}</span>
                                    </div>
                                </Button>

                                {/* يمكن إضافة خيارات أخرى هنا */}
                            </div>

                            <p className="text-sm text-muted-foreground text-center">
                                {t('settings.mfa.recommendation', 'نوصي باستخدام Google Authenticator أو Authy لأفضل حماية')}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog تأكيد التعطيل */}
            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('settings.mfa.disableTitle', 'تعطيل التحقق بخطوتين')}</DialogTitle>
                        <DialogDescription>
                            {t('settings.mfa.disableWarning', 'سيؤدي هذا إلى إزالة طبقة الأمان الإضافية من حسابك. هل أنت متأكد؟')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                            {t('common.cancel', 'إلغاء')}
                        </Button>
                        <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t('settings.mfa.confirmDisable', 'تعطيل')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Export All
// ═══════════════════════════════════════════════════════════════════════════

export { MfaSystemSettingsCard as MfaAdminSettings };
export { MfaUserSetupCard as MfaUserSettings };

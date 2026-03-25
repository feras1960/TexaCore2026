/**
 * ════════════════════════════════════════════════════════════════
 * 📋 AccountTab — إعدادات الحساب
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { profileService, type FullUserProfile } from '../services/profileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Mail, Download, AlertTriangle, Trash2, Loader2, CheckCircle2,
    Send, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AccountTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [profile, setProfile] = useState<FullUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const p = await profileService.getCurrentProfile();
            setProfile(p);
        } catch { }
        setLoading(false);
    };

    const handleEmailChange = async () => {
        try {
            setEmailError('');
            await profileService.changeEmail(newEmail);
            setEmailSent(true);
            setTimeout(() => setEmailSent(false), 10000);
        } catch (err: any) {
            setEmailError(err.message);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const p = await profileService.getCurrentProfile();
            const events = await profileService.getSecurityEvents(100);
            const history = await profileService.getLoginHistory(100);

            const exportData = {
                profile: p,
                security_events: events,
                login_history: history,
                exported_at: new Date().toISOString(),
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `texacore-profile-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { }
        setExporting(false);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 py-4 max-w-3xl mx-auto">
            {/* Change Email */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        {isAr ? 'تغيير البريد الإلكتروني' : 'Change Email'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{isAr ? 'البريد الحالي:' : 'Current email:'}</span>
                        <span className="text-sm font-medium">{profile?.email}</span>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">{isAr ? 'البريد الجديد' : 'New Email'}</Label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder={isAr ? 'أدخل البريد الجديد' : 'Enter new email'}
                                dir="ltr"
                            />
                            <Button
                                onClick={handleEmailChange}
                                disabled={!newEmail || emailSent}
                                className="gap-2 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                            >
                                <Send className="w-4 h-4" />
                                {isAr ? 'إرسال رابط التأكيد' : 'Send Confirmation'}
                            </Button>
                        </div>
                    </div>

                    {emailSent && (
                        <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            {isAr ? 'تم إرسال رابط التأكيد إلى بريدك الجديد' : 'Confirmation link sent to your new email'}
                        </p>
                    )}
                    {emailError && (
                        <p className="text-sm text-red-600 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> {emailError}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Export Data */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-600" />
                        {isAr ? 'تصدير بياناتك' : 'Export Your Data'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {isAr
                            ? 'حمّل نسخة من جميع بياناتك الشخصية (الملف الشخصي، الإعدادات، سجل النشاط)'
                            : 'Download a copy of all your personal data (profile, settings, activity log)'}
                    </p>
                    <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isAr ? 'تصدير البيانات (JSON)' : 'Export Data (JSON)'}
                    </Button>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        {isAr ? 'منطقة الخطر' : 'Danger Zone'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Deactivate */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10">
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-400">
                                {isAr ? 'تعطيل الحساب مؤقتاً' : 'Deactivate Account'}
                            </p>
                            <p className="text-xs text-red-600/70 mt-0.5">
                                {isAr ? 'يمكنك إعادة تفعيله لاحقاً بالتواصل مع المدير' : 'Can be reactivated later by admin'}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                            {isAr ? 'تعطيل' : 'Deactivate'}
                        </Button>
                    </div>

                    {/* Delete */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                        <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-400">
                                {isAr ? 'حذف الحساب نهائياً' : 'Delete Account Permanently'}
                            </p>
                            <p className="text-xs text-red-600/70 mt-0.5">
                                {isAr ? '⚠️ هذا الإجراء لا يمكن التراجع عنه' : '⚠️ This action cannot be undone'}
                            </p>
                        </div>
                        <Button variant="destructive" size="sm" disabled className="gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" />
                            {isAr ? 'حذف' : 'Delete'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

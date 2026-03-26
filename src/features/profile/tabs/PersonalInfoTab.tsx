/**
 * ════════════════════════════════════════════════════════════════
 * 👤 PersonalInfoTab — المعلومات الشخصية
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { profileService, type FullUserProfile } from '../services/profileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    User, Camera, Trash2, Save, Phone, Mail, Briefcase, Building2,
    Calendar, Clock, CheckCircle2, Loader2, GitBranch, Shield, Link2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PersonalInfoTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profile, setProfile] = useState<FullUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

    // Form state
    const [form, setForm] = useState({
        full_name: '',
        display_name: '',
        phone: '',
        job_title: '',
        bio: '',
    });

    // Load profile
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const [p, accounts] = await Promise.all([
                profileService.getCurrentProfile(),
                profileService.getConnectedAccounts(),
            ]);
            if (p) {
                setProfile(p);
                setForm({
                    full_name: p.full_name || '',
                    display_name: p.display_name || '',
                    phone: p.phone || '',
                    job_title: p.job_title || '',
                    bio: p.bio || '',
                });
            }
            setConnectedAccounts(accounts);
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError('');
            const updated = await profileService.updateProfile(form);
            setProfile(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Error saving profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError(isAr ? 'حجم الصورة يجب أن يكون أقل من 2MB' : 'Image must be less than 2MB');
            return;
        }

        try {
            setSaving(true);
            const url = await profileService.uploadAvatar(file);
            setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
        } catch (err: any) {
            setError(err.message || 'Error uploading avatar');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            await profileService.removeAvatar();
            setProfile(prev => prev ? { ...prev, avatar_url: '' } : null);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const getInitials = () => {
        const name = profile?.full_name || profile?.email || '';
        return name.slice(0, 2).toUpperCase();
    };

    const formatDate = (date?: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 py-4 max-w-3xl mx-auto">
            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* ── Avatar Section ───────────────────────────────── */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-800 shadow-lg">
                                <AvatarImage src={profile?.avatar_url || ''} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                                    {getInitials()}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Camera className="w-6 h-6 text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {profile?.full_name || profile?.email}
                            </h3>
                            <p className="text-sm text-gray-500">{profile?.email}</p>
                            {profile?.job_title && (
                                <p className="text-sm text-gray-400 mt-1">{profile.job_title}</p>
                            )}
                            <div className="flex gap-2 mt-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="gap-1.5 text-xs"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                    {isAr ? 'تغيير الصورة' : 'Change Photo'}
                                </Button>
                                {profile?.avatar_url && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleRemoveAvatar}
                                        className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {isAr ? 'حذف' : 'Remove'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Personal Info Form ───────────────────────────── */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        {isAr ? 'البيانات الأساسية' : 'Basic Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {isAr ? 'الاسم الكامل' : 'Full Name'}
                            </Label>
                            <Input
                                value={form.full_name}
                                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                placeholder={isAr ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {isAr ? 'الاسم المعروض' : 'Display Name'}
                            </Label>
                            <Input
                                value={form.display_name}
                                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                placeholder={isAr ? 'الاسم الذي يظهر للآخرين' : 'Name shown to others'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                {isAr ? 'المسمى الوظيفي' : 'Job Title'}
                            </Label>
                            <Input
                                value={form.job_title}
                                onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                                placeholder={isAr ? 'مثال: مدير المبيعات' : 'e.g. Sales Manager'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {isAr ? 'رقم الهاتف' : 'Phone Number'}
                            </Label>
                            <Input
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+966 5X XXX XXXX"
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{isAr ? 'نبذة شخصية' : 'Bio'}</Label>
                        <textarea
                            value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder={isAr ? 'اكتب نبذة مختصرة عن نفسك...' : 'Write a short bio...'}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 text-end">{form.bio.length}/500</p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className={cn(
                                "gap-2 min-w-[140px]",
                                saved
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90"
                            )}
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />{isAr ? 'جاري الحفظ...' : 'Saving...'}</>
                            ) : saved ? (
                                <><CheckCircle2 className="w-4 h-4" />{isAr ? 'تم الحفظ ✓' : 'Saved ✓'}</>
                            ) : (
                                <><Save className="w-4 h-4" />{isAr ? 'حفظ التغييرات' : 'Save Changes'}</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Connected Accounts ───────────────────────────── */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-purple-600" />
                        {isAr ? 'الحسابات المربوطة' : 'Connected Accounts'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Google */}
                    {(() => {
                        const google = connectedAccounts.find(a => a.provider === 'google');
                        return (
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border flex items-center justify-center">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22l.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Google</p>
                                        <p className="text-xs text-gray-500">{google?.email || (isAr ? 'غير مربوط' : 'Not connected')}</p>
                                    </div>
                                </div>
                                {google ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <CheckCircle2 className="w-3 h-3 me-1" />
                                        {isAr ? 'مربوط' : 'Connected'}
                                    </Badge>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-xs">
                                        {isAr ? 'ربط' : 'Connect'}
                                    </Button>
                                )}
                            </div>
                        );
                    })()}

                    {/* Apple */}
                    {(() => {
                        const apple = connectedAccounts.find(a => a.provider === 'apple');
                        return (
                            <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border flex items-center justify-center">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Apple</p>
                                        <p className="text-xs text-gray-500">{apple?.email || (isAr ? 'غير مربوط' : 'Not connected')}</p>
                                    </div>
                                </div>
                                {apple ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <CheckCircle2 className="w-3 h-3 me-1" />
                                        {isAr ? 'مربوط' : 'Connected'}
                                    </Badge>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-xs">
                                        {isAr ? 'ربط' : 'Connect'}
                                    </Button>
                                )}
                            </div>
                        );
                    })()}
                </CardContent>
            </Card>

            {/* ── Account Info (Read Only) ─────────────────────── */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        {isAr ? 'معلومات الحساب' : 'Account Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { icon: Shield, label: isAr ? 'الدور' : 'Role', value: profile?.role || '-', color: 'text-blue-600' },
                            { icon: Mail, label: isAr ? 'البريد الإلكتروني' : 'Email', value: profile?.email || '-', color: 'text-gray-600' },
                            { icon: Calendar, label: isAr ? 'تاريخ التسجيل' : 'Joined', value: formatDate(profile?.created_at), color: 'text-emerald-600' },
                            { icon: Clock, label: isAr ? 'آخر تسجيل دخول' : 'Last Login', value: profile?.last_login_at ? formatDate(profile.last_login_at) : (isAr ? 'غير متاح' : 'N/A'), color: 'text-orange-600' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <item.icon className={cn("w-4 h-4", item.color)} />
                                <div>
                                    <p className="text-[11px] text-gray-400 font-medium">{item.label}</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

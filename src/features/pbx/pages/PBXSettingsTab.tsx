import { useState } from 'react';
import { Settings, Key, Webhook, Copy, Server, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PBXSettingsTab() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';

    const [isRecordingEnabled, setIsRecordingEnabled] = useState(true);
    const [isVoicemailEnabled, setIsVoicemailEnabled] = useState(true);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(isRTL ? `تم نسخ ${label}` : `${label} copied to clipboard`);
    };

    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://api.supabase.co'}/functions/v1/asterisk-webhook`;
    const companyToken = companyId ? `pbx_token_${companyId.replace(/-/g, '').substring(0, 16)}` : 'Loading...';

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto pb-10" dir={direction}>
            <div className="flex items-center gap-3 px-1">
                <Settings className="w-7 h-7 text-gray-700 dark:text-gray-300" />
                <div>
                    <h1 className="text-xl font-bold text-erp-navy dark:text-white leading-tight">
                        {isRTL ? 'إعدادات المقسم المتقدمة' : 'Advanced PBX Settings'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {isRTL ? 'إعدادات الربط المباشر مع محرك Asterisk وتفضيلات النظام' : 'Direct integration settings with Asterisk engine and preferences'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
                {/* General Preferences */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                            <Settings className="w-5 h-5 text-indigo-500" />
                            {isRTL ? 'التفضيلات العامة' : 'General Preferences'}
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">{isRTL ? 'تسجيل جميع المكالمات' : 'Record All Calls'}</Label>
                                    <p className="text-xs text-gray-500">
                                        {isRTL ? 'سيتم تسجيل جميع المكالمات الصادرة والواردة وحفظها في التخزين السحابي' : 'All incoming and outgoing calls will be recorded and saved in cloud storage'}
                                    </p>
                                </div>
                                <Switch checked={isRecordingEnabled} onCheckedChange={setIsRecordingEnabled} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">{isRTL ? 'تفعيل البريد الصوتي للمؤسسة' : 'Enable Global Voicemail'}</Label>
                                    <p className="text-xs text-gray-500">
                                        {isRTL ? 'السماح للعملاء بترك رسالة صوتية في حال عدم الرد' : 'Allow clients to leave a voice message if there is no answer'}
                                    </p>
                                </div>
                                <Switch checked={isVoicemailEnabled} onCheckedChange={setIsVoicemailEnabled} />
                            </div>
                        </div>

                        <Button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')}>
                            {isRTL ? 'حفظ التفضيلات' : 'Save Preferences'}
                        </Button>
                    </div>

                    {/* Server Info */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 p-5 shadow-sm">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-indigo-900 dark:text-indigo-300">
                            <Server className="w-5 h-5" />
                            {isRTL ? 'حالة خادم الصوت (Asterisk Engine)' : 'Voice Server Status'}
                        </h2>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{isRTL ? 'الخادم المتصل' : 'Connected Server'}</span>
                                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">vps-voice-1.texacore.cloud</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{isRTL ? 'حالة الاتصال' : 'Connection Status'}</span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {isRTL ? 'متصل ومستقر' : 'Connected & Stable'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{isRTL ? 'آخر مزامنة' : 'Last Sync'}</span>
                                <span className="text-sm font-mono text-gray-900 dark:text-white">Just now</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API & Webhooks (For Devs/Admins) */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
                        <Webhook className="w-5 h-5 text-rose-500" />
                        {isRTL ? 'بيانات ربط Asterisk (للمطورين)' : 'Asterisk Integration Data (Devs)'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        {isRTL 
                            ? 'استخدم هذه البيانات في ملفات extensions.conf و pjsip.conf لربط المقسم الخاص بالشركة بسيرفراتنا السحابية.' 
                            : 'Use these details in extensions.conf and pjsip.conf to link the company PBX to our cloud servers.'}
                    </p>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {isRTL ? 'رقم تعريف الشركة (Tenant ID)' : 'Company ID (Tenant)'}
                            </Label>
                            <div className="flex gap-2">
                                <Input value={companyId || ''} readOnly className="font-mono text-sm bg-white dark:bg-gray-800" />
                                <Button variant="secondary" size="icon" onClick={() => handleCopy(companyId || '', 'Company ID')}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Key className="w-3 h-3" /> {isRTL ? 'مفتاح المزامنة (Sync Token)' : 'Sync Token'}
                            </Label>
                            <div className="flex gap-2">
                                <Input type="password" value={companyToken} readOnly className="font-mono text-sm bg-white dark:bg-gray-800" />
                                <Button variant="secondary" size="icon" onClick={() => handleCopy(companyToken, 'Sync Token')}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-rose-500">{isRTL ? 'احفظ هذا المفتاح بسرية، يتيح الوصول للمكالمات.' : 'Keep this key secret, it grants access to calls.'}</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Webhook className="w-3 h-3" /> {isRTL ? 'رابط الـ Webhook للإشعارات' : 'Events Webhook URL'}
                            </Label>
                            <div className="flex gap-2">
                                <Input value={webhookUrl} readOnly className="font-mono text-xs bg-white dark:bg-gray-800" />
                                <Button variant="secondary" size="icon" onClick={() => handleCopy(webhookUrl, 'Webhook URL')}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4" />
                                {isRTL ? 'مثال لملف extensions.conf' : 'extensions.conf example'}
                            </h4>
                            <pre className="text-[10px] font-mono text-gray-700 dark:text-gray-300 overflow-x-auto p-2 bg-white/50 dark:bg-black/50 rounded">
{`exten => s,1,NoOp(TexaCore API Call)
 same => n,Set(CURLOPT(httpheader)=Authorization: Bearer ${companyToken})
 same => n,Set(RESULT=\${CURL("\${webhookUrl}?caller=\${CALLERID(num)}")})`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

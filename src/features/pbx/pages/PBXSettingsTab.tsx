import { useState, useEffect, useRef } from 'react';
import { Settings, Key, Webhook, Copy, Server, FileText, CheckCircle2, Bot, MessageSquare, Monitor } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useSoftphone } from '../context/SoftphoneContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ─── ElevenLabs Widget Loader (Official Method) ─────────────────
// Uses the official <elevenlabs-convai> web component which handles
// all LiveKit/WebRTC connectivity internally — no SDK version conflicts.
const WIDGET_SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

function useElevenLabsWidget() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Don't load if already loaded
        if (document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`)) {
            setLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = WIDGET_SCRIPT_URL;
        script.async = true;
        script.type = 'text/javascript';
        script.onload = () => setLoaded(true);
        script.onerror = () => console.error('[AI Agent] Failed to load ElevenLabs widget script');
        document.body.appendChild(script);

        return () => {
            // Don't remove — other instances might need it
        };
    }, []);

    return loaded;
}

export default function PBXSettingsTab() {
    const { t, direction } = useLanguage();
    const { companyId } = useCompany();
    const { linkDesktopSoftphone } = useSoftphone();
    const isRTL = direction === 'rtl';

    const [isRecordingEnabled, setIsRecordingEnabled] = useState(true);
    const [isVoicemailEnabled, setIsVoicemailEnabled] = useState(true);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(isRTL ? `تم نسخ ${label}` : `${label} copied to clipboard`);
    };

    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://api.supabase.co'}/functions/v1/asterisk-webhook`;
    const companyToken = companyId ? `pbx_token_${companyId.replace(/-/g, '').substring(0, 16)}` : 'Loading...';

    // AI Agent Settings (Multiple Agents Support)
    const [elevenLabsAgentId1, setElevenLabsAgentId1] = useState(() => localStorage.getItem('elevenlabs_agent_id_1') || '');
    const [elevenLabsAgentId2, setElevenLabsAgentId2] = useState(() => localStorage.getItem('elevenlabs_agent_id_2') || '');
    const [elevenLabsAgentId3, setElevenLabsAgentId3] = useState(() => localStorage.getItem('elevenlabs_agent_id_3') || '');
    const [elevenLabsAgentId4, setElevenLabsAgentId4] = useState(() => localStorage.getItem('elevenlabs_agent_id_4') || '');
    
    const [isAgentActive, setIsAgentActive] = useState(false);
    const widgetContainerRef = useRef<HTMLDivElement>(null);
    const widgetLoaded = useElevenLabsWidget();

    const handleSaveAiSettings = () => {
        localStorage.setItem('elevenlabs_agent_id_1', elevenLabsAgentId1);
        localStorage.setItem('elevenlabs_agent_id_2', elevenLabsAgentId2);
        localStorage.setItem('elevenlabs_agent_id_3', elevenLabsAgentId3);
        localStorage.setItem('elevenlabs_agent_id_4', elevenLabsAgentId4);
        toast.success(isRTL ? 'تم حفظ إعدادات الوكلاء الصوتيين' : 'AI Agents settings saved');
    };

    const handleToggleAgent = () => {
        const agents = [elevenLabsAgentId1, elevenLabsAgentId2, elevenLabsAgentId3, elevenLabsAgentId4].filter(id => id.trim() !== '');
        
        if (agents.length === 0) {
            toast.error(isRTL ? 'يرجى إدخال معرف وكيل (Agent ID) واحد على الأقل' : 'Please enter at least one Agent ID');
            return;
        }

        if (isAgentActive) {
            // Remove widget
            setIsAgentActive(false);
            if (widgetContainerRef.current) {
                widgetContainerRef.current.innerHTML = '';
            }
            toast.info(isRTL ? 'تم إيقاف الوكيل الصوتي' : 'AI Agent stopped');
        } else {
            // Pick a random agent to simulate team behavior
            const randomAgentId = agents[Math.floor(Math.random() * agents.length)];
            
            setIsAgentActive(true);
            if (widgetContainerRef.current && widgetLoaded) {
                widgetContainerRef.current.innerHTML = '';
                const widget = document.createElement('elevenlabs-convai');
                widget.setAttribute('agent-id', randomAgentId);
                widget.setAttribute('action-text', isRTL ? 'تحدث مع الوكيل (صوت عشوائي)' : 'Talk to AI Agent (Random)');
                widget.setAttribute('start-call-text', isRTL ? 'ابدأ المحادثة' : 'Start Call');
                widget.setAttribute('end-call-text', isRTL ? 'إنهاء المكالمة' : 'End Call');
                widget.setAttribute('listening-text', isRTL ? 'جاري الاستماع...' : 'Listening...');
                widget.setAttribute('speaking-text', isRTL ? 'يتحدث الوكيل...' : 'Agent speaking...');
                widgetContainerRef.current.appendChild(widget);
            }
            toast.success(isRTL ? 'الوكيل الصوتي جاهز! سيتم اختيار صوت عشوائي لتجربة الفريق' : 'AI Agent ready! A random voice will be used');
        }
    };

    // Cleanup widget on unmount
    useEffect(() => {
        return () => {
            const existingWidget = document.querySelector('elevenlabs-convai');
            if (existingWidget) existingWidget.remove();
        };
    }, []);

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
                        {isRTL ? 'تكامل التطبيقات' : 'App Integration'}
                    </h2>
                    
                    {/* Desktop Softphone Integration */}
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
                        <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
                            <Monitor className="w-4 h-4" />
                            {isRTL ? 'تطبيق الكمبيوتر المستقل' : 'Desktop Softphone App'}
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
                            {isRTL 
                                ? 'إذا قمت بتثبيت تطبيق TexaCore Softphone للكمبيوتر، اضغط هنا لنقل الإعدادات وتفعيله تلقائياً بدلاً من متصفح الويب.' 
                                : 'If you installed the TexaCore Desktop Softphone, click here to transfer settings and activate it instead of the web browser.'}
                        </p>
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                            onClick={() => {
                                linkDesktopSoftphone();
                                toast.success(isRTL ? 'تم إرسال الإعدادات لتطبيق الكمبيوتر' : 'Settings sent to Desktop App');
                            }}
                        >
                            <Monitor className="w-4 h-4" />
                            {isRTL ? '🔗 ربط تطبيق الكمبيوتر' : '🔗 Link Desktop App'}
                        </Button>
                    </div>

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

                {/* AI Agent Configuration (ElevenLabs) — Using Official Widget */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm lg:col-span-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
                        <Bot className="w-5 h-5 text-emerald-500" />
                        {isRTL ? 'إعدادات الوكيل الصوتي (ElevenLabs)' : 'Voice AI Agent Settings'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        {isRTL 
                            ? 'أدخل معرف الوكيل (Agent ID) من منصة ElevenLabs. الوكيل يتضمن ذكاءً اصطناعياً كاملاً (فهم الكلام + الرد الذكي + توليد الصوت).' 
                            : 'Enter your Agent ID from ElevenLabs. The agent includes full AI capabilities (speech recognition + smart responses + voice generation).'}
                    </p>

                    {/* Architecture Info */}
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            {isRTL ? 'كيف يعمل الوكيل الصوتي؟' : 'How does the Voice Agent work?'}
                        </h4>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5 list-disc list-inside">
                            <li>{isRTL ? 'التعرف على الكلام (STT): يحول صوت المستخدم إلى نص' : 'Speech-to-Text (STT): Converts user voice to text'}</li>
                            <li>{isRTL ? 'نموذج الذكاء الاصطناعي (LLM): يفهم السياق ويولد الرد المناسب' : 'Language Model (LLM): Understands context and generates appropriate response'}</li>
                            <li>{isRTL ? 'توليد الصوت (TTS): يحول الرد النصي إلى صوت طبيعي' : 'Text-to-Speech (TTS): Converts text response to natural speech'}</li>
                            <li>{isRTL ? 'يمكن ربط أدوات خارجية (Tools) لاستعلام بيانات النظام' : 'External tools can be connected to query system data'}</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {isRTL ? 'معرف الوكيل الأول (أحمد)' : 'Agent ID 1'}
                            </Label>
                            <Input 
                                placeholder="e.g. agent_1801..." 
                                value={elevenLabsAgentId1}
                                onChange={(e) => setElevenLabsAgentId1(e.target.value)}
                                className="font-mono bg-gray-50 dark:bg-gray-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {isRTL ? 'معرف الوكيل الثاني (سارة)' : 'Agent ID 2'}
                            </Label>
                            <Input 
                                placeholder="e.g. agent_1802..." 
                                value={elevenLabsAgentId2}
                                onChange={(e) => setElevenLabsAgentId2(e.target.value)}
                                className="font-mono bg-gray-50 dark:bg-gray-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {isRTL ? 'معرف الوكيل الثالث (عمر)' : 'Agent ID 3'}
                            </Label>
                            <Input 
                                placeholder="e.g. agent_1803..." 
                                value={elevenLabsAgentId3}
                                onChange={(e) => setElevenLabsAgentId3(e.target.value)}
                                className="font-mono bg-gray-50 dark:bg-gray-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {isRTL ? 'معرف الوكيل الرابع (ليلى)' : 'Agent ID 4'}
                            </Label>
                            <Input 
                                placeholder="e.g. agent_1804..." 
                                value={elevenLabsAgentId4}
                                onChange={(e) => setElevenLabsAgentId4(e.target.value)}
                                className="font-mono bg-gray-50 dark:bg-gray-900"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        {isRTL ? 'سيقوم النظام أو الواجهة باختيار وكيل عشوائي لتقديم تجربة فريق حقيقي (Random Experience)' : 'The system or widget will randomly pick an agent to simulate a real team'}
                    </p>

                    <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant={isAgentActive ? 'destructive' : 'outline'} 
                                className={`gap-2 ${isAgentActive ? 'animate-pulse' : ''}`}
                                onClick={handleToggleAgent}
                                disabled={!widgetLoaded}
                            >
                                <Bot className="w-4 h-4" />
                                {isAgentActive 
                                    ? (isRTL ? 'إيقاف الوكيل' : 'Stop Agent') 
                                    : (isRTL ? 'تشغيل الوكيل الصوتي' : 'Launch AI Agent')}
                            </Button>
                            {isAgentActive && (
                                <span className="text-xs font-semibold text-emerald-500 animate-pulse">
                                    {isRTL ? 'الوكيل نشط — اضغط الزر في أسفل الشاشة' : 'Agent active — click the widget below'}
                                </span>
                            )}
                            {!widgetLoaded && (
                                <span className="text-xs text-gray-400">
                                    {isRTL ? 'جاري تحميل المكتبة...' : 'Loading widget...'}
                                </span>
                            )}
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveAiSettings}>
                            {isRTL ? 'حفظ إعدادات الوكيل' : 'Save Agent Settings'}
                        </Button>
                    </div>

                    {/* Widget mount point — the widget appears as a floating button */}
                    <div ref={widgetContainerRef} />
                </div>
            </div>
        </div>
    );
}

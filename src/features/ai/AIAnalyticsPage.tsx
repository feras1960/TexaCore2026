/**
 * ════════════════════════════════════════════════════════════════
 * 🧠 NexaAI Analytics Center — مركز تحليلات الذكاء الاصطناعي
 * ════════════════════════════════════════════════════════════════
 * V2: Smart expandable cards + TexaCore banner (single row)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Bot, Send, Loader2, Sparkles, Package, Users, Calculator,
    BarChart3, Search, Zap, Brain, Globe, Shield, TrendingUp,
    AlertTriangle, RefreshCw, Target, Award, Lightbulb, Activity,
    ChevronDown, ShoppingCart, Wallet,
} from 'lucide-react';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model_used?: string;
    context_loaded?: boolean;
    timestamp: Date;
}
type ContextType = 'general' | 'material' | 'party' | 'accounting';

const CONTEXT_OPTIONS: { type: ContextType; labelAr: string; labelEn: string; icon: any }[] = [
    { type: 'general', labelAr: 'عام', labelEn: 'General', icon: Sparkles },
    { type: 'material', labelAr: 'مادة', labelEn: 'Material', icon: Package },
    { type: 'party', labelAr: 'عميل/مورد', labelEn: 'Party', icon: Users },
    { type: 'accounting', labelAr: 'محاسبة', labelEn: 'Accounting', icon: Calculator },
];

const QUICK_PROMPTS = {
    ar: ['📊 حلّل أداء الشركة', '💰 أكثر المواد ربحية', '⚠️ تنبيهات المخزون', '📈 اتجاه المبيعات', '🏷️ نصائح تسعير', '🎨 أفضل الألوان مبيعاً'],
    en: ['📊 Company performance', '💰 Most profitable', '⚠️ Stock alerts', '📈 Sales trends', '🏷️ Pricing tips', '🎨 Best sellers'],
};

// ═══════════════════════════════════════════
// Smart Expandable Card (Accordion Row)
// ═══════════════════════════════════════════
function SmartCard({ title, icon, iconColor, summaryLeft, summaryRight, children, defaultOpen, isOpen, onToggle }: {
    title: string; icon: React.ReactNode; iconColor: string;
    summaryLeft: string; summaryRight?: React.ReactNode;
    children: React.ReactNode; defaultOpen?: boolean;
    isOpen?: boolean; onToggle?: () => void;
}) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen || false);
    const open = isOpen !== undefined ? isOpen : internalOpen;
    const handleToggle = onToggle || (() => setInternalOpen(!internalOpen));
    return (
        <div className={cn(
            "rounded-xl border transition-all duration-300 overflow-hidden",
            open ? "bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700"
                : "bg-white/80 dark:bg-gray-800/80 shadow-sm border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700"
        )}>
            <button onClick={handleToggle} className="w-full flex items-center gap-3 px-4 py-3 text-start transition-colors">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconColor)}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">{title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{summaryLeft}</div>
                </div>
                {summaryRight && <div className="shrink-0 me-2">{summaryRight}</div>}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-300 shrink-0", open && "rotate-180")} />
            </button>
            <div className={cn("transition-all duration-300 ease-in-out overflow-hidden", open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0")}>
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">{children}</div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════
// Smart Analytics Column — AI-Powered Cards
// ═══════════════════════════════════════════
function AnalyticsColumn({ companyId, language, isAr, userName }: { companyId: string; language: string; isAr: boolean; userName: string }) {
    const [insights, setInsights] = useState<Record<string, string>>({});
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsLoaded, setInsightsLoaded] = useState(false);
    const [activeCard, setActiveCard] = useState<string | null>(null);

    // Fetch AI Insights — one call, structured sections
    const fetchInsights = useCallback(async () => {
        if (!companyId || insightsLoaded) return;
        setInsightsLoading(true);
        try {
            const prompt = isAr
                ? `أنت وكيل نيكسا الذكي، مستشار أعمال شخصي للمستخدم "${userName}". حلل وضع الشركة بشكل شامل وخاطب المستخدم باسمه بأسلوب ودي واحترافي. قدم التحليل مقسماً بالتنسيق التالي بالضبط (استخدم العلامات كما هي):

[SUMMARY]
ملخص تنفيذي شامل عن وضع الشركة مع ترحيب شخصي بـ"${userName}": نقاط القوة، التحديات الرئيسية، القرار الإداري المقترح. كن ودياً وداعماً كصديق ناجح في الأعمال. (5-7 أسطر)

[INVENTORY]
تحليل وضع المخزون: المواد المتاحة، الرولونات، المواد التي تحتاج إعادة طلب، المواد الراكدة. توصيات عملية.

[SALES]
تحليل المبيعات: إجمالي الإيرادات، عدد الفواتير، أفضل المواد مبيعاً، اتجاه المبيعات. توصيات لزيادة المبيعات.

[CUSTOMERS]
تحليل العملاء والموردين: المديونيات، التحصيل، أفضل العملاء، الموردين الموثوقين. توصيات لإدارة العلاقات.

[CONTAINERS]
تحليل الكونتينرات والتكاليف الواصلة: المصاريف، توزيع التكاليف، الضرائب المرتجعة. توصيات لتقليل التكاليف.

[PROFIT]
تحليل الربحية: الإيرادات مقابل المصاريف، هامش الربح، نقاط القوة والضعف. توصيات للقيادة وتحسين الأداء.

كن مختصراً وعملياً في كل قسم (3-5 أسطر لكل قسم).`
                : `You are NexaAgent, a personal business advisor for "${userName}". Analyze the company comprehensively and address the user by name in a warm, professional tone. Structure your response exactly with these markers:

[SUMMARY]
Executive summary with a personal greeting to "${userName}": company strengths, key challenges, recommended management action. Be warm and supportive like a successful business partner. (5-7 lines)

[INVENTORY]
Inventory analysis: materials, rolls, reorder needs, slow-moving items. Actionable recommendations.

[SALES]
Sales analysis: revenue, invoice count, best sellers, trends. Recommendations to increase sales.

[CUSTOMERS]
Customer & supplier analysis: balances, collections, best customers, reliable suppliers. Relationship management tips.

[CONTAINERS]
Container & landed cost analysis: expenses, cost allocation, tax refunds. Cost reduction tips.

[PROFIT]
Profitability analysis: revenue vs expenses, profit margin, strengths & weaknesses. Leadership and performance recommendations.

Be concise and actionable (3-5 lines per section).`;

            const { data, error } = await supabase.functions.invoke('nexa-agent', {
                body: { message: prompt, language, context_type: 'general', complexity: 'pro', company_id: companyId },
            });
            if (!error && data?.response) {
                const text = data.response;
                const sections: Record<string, string> = {};
                const markers = ['SUMMARY', 'INVENTORY', 'SALES', 'CUSTOMERS', 'CONTAINERS', 'PROFIT'];
                markers.forEach((marker, idx) => {
                    const startTag = `[${marker}]`;
                    const startIdx = text.indexOf(startTag);
                    if (startIdx === -1) return;
                    const contentStart = startIdx + startTag.length;
                    const nextMarker = markers[idx + 1] ? `[${markers[idx + 1]}]` : null;
                    const endIdx = nextMarker ? text.indexOf(nextMarker) : text.length;
                    sections[marker.toLowerCase()] = text.substring(contentStart, endIdx !== -1 ? endIdx : text.length).trim();
                });
                // Fallback: if no markers found, put everything in summary
                if (Object.keys(sections).length === 0) {
                    sections['summary'] = text;
                }
                setInsights(sections);
            } else {
                // Show welcome message when no data or error
                const welcomeMsg = isAr
                    ? `مرحباً ${userName}! 👋\n\nيبدو أن شركتك جديدة ولم تتم إضافة بيانات بعد.\n\n🚀 **ابدأ الآن:**\n• أضف المواد والمنتجات من قسم المخزون\n• سجّل العملاء والموردين\n• أنشئ أول فاتورة مبيعات\n\nبمجرد إضافة بياناتك، سأقدم لك تحليلات ذكية وتوصيات مخصصة لنجاح أعمالك! 💪`
                    : `Welcome ${userName}! 👋\n\nYour company is new and has no data yet.\n\n🚀 **Get Started:**\n• Add materials from Inventory\n• Register customers & suppliers\n• Create your first sales invoice\n\nOnce you add data, I'll provide smart analytics and personalized recommendations! 💪`;
                setInsights({
                    summary: welcomeMsg,
                    inventory: isAr ? '📦 لم يتم إضافة مواد بعد. ابدأ من قسم **إدارة الأقمشة** لإضافة المواد والرولونات.' : '📦 No materials added yet. Start from **Fabric Management** to add materials.',
                    sales: isAr ? '💰 لا توجد مبيعات بعد. أنشئ أول **فاتورة مبيعات** من قسم المبيعات.' : '💰 No sales yet. Create your first **sales invoice**.',
                    customers: isAr ? '👥 لا يوجد عملاء أو موردين. أضفهم من القائمة الجانبية.' : '👥 No customers or suppliers yet. Add them from the sidebar.',
                    containers: isAr ? '🚢 لا توجد كونتينرات. عند استيراد بضائع، سجّلها هنا.' : '🚢 No containers yet. Register them when importing goods.',
                    profit: isAr ? '📊 سيتم حساب الربحية تلقائياً بعد إضافة المبيعات والمشتريات.' : '📊 Profitability will be calculated automatically after adding sales and purchases.',
                });
            }
        } catch {
            // Show welcome on error too
            setInsights({
                summary: isAr
                    ? `مرحباً ${userName}! 👋\n\nوكيل نيكسا جاهز لمساعدتك. أضف بيانات شركتك لأقدم لك تحليلات ذكية ومخصصة! 🚀`
                    : `Welcome ${userName}! 👋\n\nNexaAgent is ready! Add your company data for smart personalized analytics! 🚀`,
            });
        } finally { setInsightsLoading(false); setInsightsLoaded(true); }
    }, [companyId, language, isAr, insightsLoaded]);

    useEffect(() => { fetchInsights(); }, [fetchInsights]);

    const renderInsight = (key: string) => {
        if (insightsLoading) return (
            <div className="flex items-center gap-2 py-3">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-gray-500">{isAr ? 'يحلل...' : 'Analyzing...'}</span>
            </div>
        );
        const text = insights[key];
        if (!text) return <p className="text-xs text-gray-400 py-2">{isAr ? 'لا يوجد تحليل بعد' : 'No analysis yet'}</p>;
        return (
            <div className="text-[13px] leading-6 text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-white">$1</strong>').replace(/\n/g, '<br/>') }} />
        );
    };

    return (
        <div className="flex flex-col gap-2 h-full overflow-y-auto pe-1">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{isAr ? 'تحليلات الأداء الذكية' : 'Smart Performance Insights'}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-purple-300 text-purple-600">🧠 {isAr ? 'وكيل نيكسا' : 'NexaAgent'}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setInsightsLoaded(false); setInsights({}); }} disabled={insightsLoading} className="h-7 w-7 p-0">
                    <RefreshCw className={cn("w-3.5 h-3.5", insightsLoading && "animate-spin")} />
                </Button>
            </div>

            {/* 👋 Warm Greeting */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 px-4 py-3 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">👋</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {isAr
                            ? `${new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور'}، ${userName}!`
                            : `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, ${userName}!`}
                    </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-5">
                    {isAr
                        ? 'وكيل نيكسا جاهز لمساعدتك. إليك تحليل شامل لأعمالك وتوصيات مخصصة لك 🚀'
                        : 'NexaAgent is ready to help. Here\'s your personalized business analysis and recommendations 🚀'}
                </p>
            </div>

            {/* 🏢 Executive Summary — Independent */}
            <SmartCard title={isAr ? '🏢 الموجز التنفيذي' : '🏢 Executive Summary'} icon={<Brain className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-600 dark:to-gray-700"
                summaryLeft={isAr ? 'نظرة شاملة على وضع الشركة والقرارات المقترحة' : 'Company overview & recommended decisions'}>
                {renderInsight('summary')}
            </SmartCard>

            {/* 📦 Inventory — Accordion Group */}
            <SmartCard title={isAr ? '📦 المخزون والمواد' : '📦 Inventory & Materials'} icon={<Package className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
                summaryLeft={isAr ? 'تحليل حالة المخزون والتنبيهات' : 'Inventory health & alerts'}
                isOpen={activeCard === 'inventory'} onToggle={() => setActiveCard(activeCard === 'inventory' ? null : 'inventory')}>
                {renderInsight('inventory')}
            </SmartCard>

            {/* 💰 Sales */}
            <SmartCard title={isAr ? '💰 المبيعات والإيرادات' : '💰 Sales & Revenue'} icon={<ShoppingCart className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-emerald-500 to-green-600"
                summaryLeft={isAr ? 'تحليل أداء المبيعات والاتجاهات' : 'Sales performance & trends'}
                isOpen={activeCard === 'sales'} onToggle={() => setActiveCard(activeCard === 'sales' ? null : 'sales')}>
                {renderInsight('sales')}
            </SmartCard>

            {/* 👥 Customers & Suppliers */}
            <SmartCard title={isAr ? '👥 العملاء والموردين' : '👥 Customers & Suppliers'} icon={<Users className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
                summaryLeft={isAr ? 'المديونيات والتحصيل وإدارة العلاقات' : 'Balances, collections & relationships'}
                isOpen={activeCard === 'customers'} onToggle={() => setActiveCard(activeCard === 'customers' ? null : 'customers')}>
                {renderInsight('customers')}
            </SmartCard>

            {/* 🚢 Containers */}
            <SmartCard title={isAr ? '🚢 الكونتينرات والتكاليف' : '🚢 Containers & Costs'} icon={<Wallet className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
                summaryLeft={isAr ? 'تكاليف الشحن والجمارك والتوزيع' : 'Shipping, customs & cost allocation'}
                isOpen={activeCard === 'containers'} onToggle={() => setActiveCard(activeCard === 'containers' ? null : 'containers')}>
                {renderInsight('containers')}
            </SmartCard>

            {/* 📊 Revenue vs Expenses */}
            <SmartCard title={isAr ? '📊 الربحية والميزانية' : '📊 Profitability & Budget'} icon={<BarChart3 className="w-4 h-4 text-white" />}
                iconColor="bg-gradient-to-br from-indigo-500 to-blue-600"
                summaryLeft={isAr ? 'الإيرادات مقابل المصاريف وتوصيات القيادة' : 'Revenue vs expenses & leadership tips'}
                isOpen={activeCard === 'profit'} onToggle={() => setActiveCard(activeCard === 'profit' ? null : 'profit')}>
                {renderInsight('profit')}
            </SmartCard>
        </div>
    );
}

// ═══════════════════════════════════════════
// Chat Panel (Left in RTL)
// ═══════════════════════════════════════════
function ChatPanel({ companyId, language, isAr }: { companyId: string; language: string; isAr: boolean }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'auto' | 'flash' | 'pro'>('auto');
    const [contextType, setContextType] = useState<ContextType>('general');
    const [contextId, setContextId] = useState<string | null>(null);
    const [contextLabel, setContextLabel] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    }, [messages.length]);

    const handleSearch = useCallback(async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            if (contextType === 'material') {
                const { data } = await supabase.from('fabric_materials').select('id, code, name_ar, name_en').eq('company_id', companyId).or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%,code.ilike.%${q}%`).limit(8);
                setSearchResults(data || []);
            } else if (contextType === 'party') {
                const { data } = await supabase.from('customers').select('id, name_ar, name_en, code').eq('company_id', companyId).or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`).limit(8);
                setSearchResults(data || []);
            }
        } catch { /* ignore */ }
    }, [contextType, companyId]);

    const sendMessage = useCallback(async (text?: string) => {
        const msg = text || inputValue.trim();
        if (!msg || isLoading) return;
        setInputValue('');
        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: msg, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        try {
            const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
            const { data, error } = await supabase.functions.invoke('nexa-agent', {
                body: { message: msg, language, context_type: contextType, context_id: contextId, chat_history: chatHistory, complexity: selectedModel, company_id: companyId },
            });
            const responseText = data?.response
                || (isAr
                    ? `مرحباً! 👋 يبدو أن شركتك جديدة ولم تتم إضافة بيانات بعد.\n\n🚀 ابدأ بإضافة المواد والعملاء والموردين، وسأساعدك بتحليلات ذكية ومخصصة!`
                    : `Welcome! 👋 Your company is new and has no data yet.\n\n🚀 Start by adding materials, customers, and suppliers for smart analytics!`);
            setMessages(prev => [...prev, {
                id: `a_${Date.now()}`, role: 'assistant',
                content: responseText,
                model_used: data?.model_used, context_loaded: data?.context_loaded, timestamp: new Date(),
            }]);
        } catch (err: any) {
            const fallbackMsg = isAr
                ? `👋 مرحباً! وكيل نيكسا في خدمتك. أضف بيانات شركتك (مواد، عملاء، فواتير) وسأقدم لك تحليلات ذكية فورية! 🚀`
                : `👋 Hello! NexaAgent at your service. Add your company data for instant smart analytics! 🚀`;
            setMessages(prev => [...prev, { id: `e_${Date.now()}`, role: 'assistant', content: fallbackMsg, timestamp: new Date() }]);
        } finally { setIsLoading(false); inputRef.current?.focus(); }
    }, [inputValue, isLoading, messages, contextType, contextId, language, selectedModel, companyId, isAr]);

    const prompts = QUICK_PROMPTS[isAr ? 'ar' : 'en'];

    return (
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-sm h-full">


            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">{isAr ? 'اسأل وكيل نيكسا 🤖' : 'Ask NexaAgent 🤖'}</h3>
                        <p className="text-sm text-gray-500 text-center mb-5 max-w-sm">{isAr ? 'تحليلات ذكية بناءً على بياناتك الحقيقية' : 'Smart analytics from your real data'}</p>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                            {prompts.map((p, i) => (
                                <button key={i} onClick={() => sendMessage(p)}
                                    className="text-sm px-3 py-2.5 rounded-xl text-start bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 text-gray-700 dark:text-gray-300 transition-all hover:shadow-md">
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7",
                            msg.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700')}>
                            <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
                            }} />
                            {msg.role === 'assistant' && msg.model_used && (
                                <div className="mt-2 flex gap-1.5">
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4",
                                        msg.model_used?.includes('pro') ? 'border-purple-300 text-purple-600' : 'border-blue-300 text-blue-600')}>
                                        {msg.model_used?.includes('pro') ? '🧠 Pro' : '⚡ Flash'}
                                    </Badge>
                                    {msg.context_loaded && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-600">📊 {isAr ? 'بيانات حقيقية' : 'Real data'}</Badge>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                <span className="text-sm text-gray-500 ms-1">{isAr ? 'يحلل البيانات...' : 'Analyzing...'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-white dark:bg-gray-900 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea value={inputValue} onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder={isAr ? 'اسأل وكيل نيكسا...' : 'Ask NexaAgent...'} disabled={isLoading}
                        rows={1}
                        onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                        className="flex-1 min-h-[44px] max-h-[120px] py-2.5 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    <Button size="sm" onClick={() => sendMessage()} disabled={!inputValue.trim() || isLoading}
                        className="h-11 px-5 rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity shrink-0">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={cn("w-4 h-4", isAr && 'rotate-180')} />}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// ═══════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════
export default function AIAnalyticsPage() {
    const { t, language } = useLanguage();
    const { companyId, user } = useAuth();
    const isAr = language === 'ar';

    // Extract user display name
    const userName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())
        || (isAr ? 'المستخدم' : 'User');

    return (
        <div className="space-y-3">
            {/* ═══ Page Header ═══ */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {t('navigation.aiAnalytics') || (isAr ? 'تحليلات الذكاء الاصطناعي' : 'AI Analytics')}
                        </h1>
                        <p className="text-xs text-gray-500">{isAr ? 'تحليلات ذكية وتوصيات مدعومة بالذكاء الاصطناعي' : 'AI-powered analytics and smart recommendations'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Globe className="w-3.5 h-3.5" /> {isAr ? 'متعدد اللغات' : 'Multi-language'}
                    <span className="mx-1">•</span>
                    <Shield className="w-3.5 h-3.5" /> {isAr ? 'محمي بالصلاحيات' : 'Protected'}
                    <span className="mx-1">•</span>
                    <Activity className="w-3.5 h-3.5" /> {isAr ? 'بيانات حقيقية' : 'Real-time'}
                </div>
            </div>

            {/* ═══ TexaCore Value — Single Row Banner ═══ */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-900 via-indigo-950 to-purple-950 px-5 py-3">
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{isAr ? 'قيمة TexaCore لأعمالك' : 'TexaCore Business Impact'}</h3>
                            <p className="text-xs text-gray-400">{isAr ? 'مؤشرات تحسين الأداء' : 'Performance improvement metrics'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {[
                            { v: '40%', lAr: 'تسريع القرارات', lEn: 'Faster Decisions', icon: <Zap className="w-4 h-4" />, c: 'from-blue-500 to-indigo-600' },
                            { v: '25%', lAr: 'زيادة المبيعات', lEn: 'Sales Increase', icon: <TrendingUp className="w-4 h-4" />, c: 'from-emerald-500 to-green-600' },
                            { v: '60%', lAr: 'تقليل الأخطاء', lEn: 'Error Reduction', icon: <Shield className="w-4 h-4" />, c: 'from-amber-500 to-orange-600' },
                            { v: '3x', lAr: 'سرعة التقارير', lEn: 'Faster Reports', icon: <BarChart3 className="w-4 h-4" />, c: 'from-purple-500 to-pink-600' },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center bg-gradient-to-br text-white", m.c)}>{m.icon}</div>
                                <div>
                                    <div className="text-base font-black text-white leading-tight">↑{m.v}</div>
                                    <div className="text-[10px] text-gray-400">{isAr ? m.lAr : m.lEn}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ 50/50 Split: Chat | Smart Cards ═══ */}
            <div className="flex gap-4" style={{ height: 'calc(100vh - 215px)' }}>
                <div className="w-1/2 flex flex-col min-h-0">
                    <ChatPanel companyId={companyId || ''} language={language} isAr={isAr} />
                </div>
                <div className="w-1/2 flex flex-col min-h-0">
                    <AnalyticsColumn companyId={companyId || ''} language={language} isAr={isAr} userName={userName} />
                </div>
            </div>
        </div>
    );
}

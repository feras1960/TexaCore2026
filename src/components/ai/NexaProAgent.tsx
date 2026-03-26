/**
 * ════════════════════════════════════════════════════════════
 * 🤖 NexaPro Agent — وكيل نيكسا برو
 * ════════════════════════════════════════════════════════════
 * Floating AI assistant widget available on every page.
 * WhatsApp-style chat with proactive insights.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNexaContext } from '@/providers/NexaContextProvider';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Bot, Send, Loader2, X, Minus, Sparkles, MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model_used?: string;
    context_loaded?: boolean;
    timestamp: Date;
}

// Context-specific quick prompts
const CONTEXT_PROMPTS: Record<string, { ar: string[]; en: string[] }> = {
    dashboard: {
        ar: ['📊 ملخص أداء اليوم', '⚠️ تنبيهات عاجلة', '💰 الإيرادات هذا الشهر'],
        en: ['📊 Today\'s summary', '⚠️ Urgent alerts', '💰 This month revenue'],
    },
    sales: {
        ar: ['📈 اتجاه المبيعات', '🏆 أفضل العملاء', '💰 الفواتير المستحقة'],
        en: ['📈 Sales trends', '🏆 Top customers', '💰 Due invoices'],
    },
    purchases: {
        ar: ['📦 أوامر الشراء المعلقة', '💰 أرصدة الموردين', '📉 مقارنة الأسعار'],
        en: ['📦 Pending orders', '💰 Supplier balances', '📉 Price compare'],
    },
    accounting: {
        ar: ['📊 ميزان المراجعة', '💰 التدفق النقدي', '📝 آخر القيود'],
        en: ['📊 Trial balance', '💰 Cash flow', '📝 Recent entries'],
    },
    inventory: {
        ar: ['⚠️ مواد تحت الحد الأدنى', '📦 حركة المخزون', '💰 قيمة المخزون'],
        en: ['⚠️ Low stock items', '📦 Stock movement', '💰 Inventory value'],
    },
    materials: {
        ar: ['📊 أكثر المواد مبيعاً', '💰 أكثر المواد ربحية', '📦 المخزون الحالي'],
        en: ['📊 Best sellers', '💰 Most profitable', '📦 Current stock'],
    },
    customers: {
        ar: ['👤 أكبر العملاء', '💰 الأرصدة المستحقة', '📈 نمو العملاء'],
        en: ['👤 Top customers', '💰 Outstanding balances', '📈 Customer growth'],
    },
    customer: {
        ar: ['📊 ملخص تعاملاته', '💰 سجل الدفعات', '📦 آخر المشتريات'],
        en: ['📊 Transaction summary', '💰 Payment history', '📦 Recent purchases'],
    },
    material: {
        ar: ['👤 من يشتري هذه المادة؟', '📊 حركة المبيعات', '💰 هامش الربح'],
        en: ['👤 Who buys this?', '📊 Sales activity', '💰 Profit margin'],
    },
    customer_in_invoice: {
        ar: ['💰 رصيد العميل واستحقاقاته', '📦 ماذا يفضّل هذا العميل؟', '📊 آخر أسعار بيع لهذا العميل', '⚠️ هل يدفع بانتظام؟'],
        en: ['💰 Customer balance & dues', '📦 What does this customer prefer?', '📊 Last prices for this customer', '⚠️ Is this customer paying on time?'],
    },
    supplier_in_purchase: {
        ar: ['💰 رصيد المورد المستحق', '📦 آخر مشتريات من هذا المورد', '📊 مقارنة أسعاره مع موردين آخرين', '⚠️ هل يلتزم بمواعيد التسليم؟'],
        en: ['💰 Supplier outstanding balance', '📦 Recent purchases from this supplier', '📊 Compare prices with other suppliers', '⚠️ Does this supplier deliver on time?'],
    },
    general: {
        ar: ['📊 حلّل أداء الشركة', '⚠️ تنبيهات المخزون', '💰 أكثر المواد ربحية'],
        en: ['📊 Company performance', '⚠️ Stock alerts', '💰 Most profitable'],
    },
};

const PAGE_SIZE = 20;

export function NexaProAgent() {
    const { currentPage, currentPageLabel, currentEntity, isOpen, hasNewInsight, toggleCopilot, closeCopilot, setHasNewInsight } = useNexaContext();
    const { companyId } = useAuth();
    const { language } = useLanguage();
    const location = useLocation();
    const isAr = language === 'ar';
    const portalRef = useRef<HTMLDivElement>(null);

    // Don't show on AI Analytics page (it has its own full chat)
    if (location.pathname === '/ai-analytics') return null;
    if (!companyId) return null;

    // Render via Portal to bypass Radix Dialog overlay blocking
    return createPortal(
        <NexaProPortalWrapper isAr={isAr} isOpen={isOpen} hasNewInsight={hasNewInsight}
            toggleCopilot={toggleCopilot} closeCopilot={closeCopilot}
            companyId={companyId} language={language}
            currentPage={currentPage} currentPageLabel={currentPageLabel} currentEntity={currentEntity} />,
        document.body
    );
}

// Simple wrapper — no hacks needed since Sheet uses modal=false
function NexaProPortalWrapper({ isAr, isOpen, hasNewInsight, toggleCopilot, closeCopilot, companyId, language, currentPage, currentPageLabel, currentEntity }: {
    isAr: boolean; isOpen: boolean; hasNewInsight: boolean;
    toggleCopilot: () => void; closeCopilot: () => void;
    companyId: string; language: string;
    currentPage: string; currentPageLabel: string;
    currentEntity: { type: string; id: string; label: string; data?: Record<string, any> } | null;
}) {
    const [isDocked, setIsDocked] = useState(false);

    return (
        <div id="nexa-copilot-root">
            {/* Floating Bubble or Docked Tab */}
            {!isOpen && (
                isDocked ? (
                    /* 🔹 Docked mode: thin edge tab */
                    <button
                        onClick={() => setIsDocked(false)}
                        className={`fixed bottom-24 z-[9999] h-10 w-6 rounded-e-lg bg-gradient-to-b from-indigo-500 to-purple-600 text-white shadow-md hover:w-8 transition-all flex items-center justify-center group ${isAr ? 'right-0 rounded-e-none rounded-s-lg' : 'left-0'}`}
                        title={isAr ? 'إظهار وكيل نيكسا' : 'Show NexaPro'}
                    >
                        <Bot className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
                        {hasNewInsight && (
                            <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                        )}
                    </button>
                ) : (
                    /* 🔵 Normal floating bubble */
                    <div className={`fixed bottom-24 z-[9999] flex items-center gap-1.5 ${isAr ? 'left-6 flex-row-reverse' : 'right-6'}`}>
                        {/* Dock/minimize button */}
                        <button
                            onClick={() => setIsDocked(true)}
                            className="w-6 h-6 rounded-full bg-gray-300/90 dark:bg-gray-600/90 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all shadow-sm hover:bg-gray-400/80"
                            title={isAr ? 'إخفاء الأيقونة' : 'Hide Agent'}
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <button
                            onClick={toggleCopilot}
                            onContextMenu={(e) => { e.preventDefault(); setIsDocked(true); }}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
                            title={isAr ? 'وكيل نيكسا برو (كلك يمين للإخفاء)' : 'NexaPro Agent (right-click to hide)'}
                        >
                            <Bot className="w-6 h-6" />
                            <span className="absolute -top-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                            {hasNewInsight && (
                                <span className="absolute -top-1 -start-1 w-5 h-5 rounded-full bg-amber-400 text-[10px] font-bold flex items-center justify-center text-white">!</span>
                            )}
                        </button>
                    </div>
                )
            )}

            {/* Chat Panel */}
            {isOpen && (
                <CopilotPanel
                    companyId={companyId}
                    isAr={isAr}
                    language={language}
                    currentPage={currentPage}
                    currentPageLabel={currentPageLabel}
                    currentEntity={currentEntity}
                    onClose={closeCopilot}
                />
            )}
        </div>
    );
}
// ═══════════════════════════════════════════
// Copilot Chat Panel
// ═══════════════════════════════════════════
function CopilotPanel({ companyId, isAr, language, currentPage, currentPageLabel, currentEntity, onClose }: {
    companyId: string; isAr: boolean; language: string;
    currentPage: string; currentPageLabel: string;
    currentEntity: { type: string; id: string; label: string; data?: Record<string, any> } | null;
    onClose: () => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamPhase, setStreamPhase] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Date/time helpers
    const formatTime = useCallback((date: Date) => {
        return new Date(date).toLocaleTimeString(isAr ? 'ar-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }, [isAr]);

    const formatDate = useCallback((date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const d = new Date(date);
        if (d.toDateString() === today.toDateString()) return isAr ? 'اليوم' : 'Today';
        if (d.toDateString() === yesterday.toDateString()) return isAr ? 'أمس' : 'Yesterday';
        return d.toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' });
    }, [isAr]);

    // Memory from messages
    const getMemory = useCallback((msgs: ChatMessage[]) => {
        return msgs.filter(m => m.content).slice(-6).map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.substring(0, 150)}`).join('\n');
    }, []);

    // Load messages from DB (same table as AI Analytics)
    const loadMessages = useCallback(async (before?: Date) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            let query = supabase.from('chat_messages')
                .select('*')
                .eq('user_id', user.id)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);
            if (before) query = query.lt('created_at', before.toISOString());
            const { data } = await query;
            return (data || []).reverse().map((m: any) => ({
                id: m.id, role: m.role as 'user' | 'assistant',
                content: m.content, model_used: m.model_used,
                context_loaded: m.context_loaded, timestamp: new Date(m.created_at),
            }));
        } catch { return []; }
    }, [companyId]);

    // Save message to DB
    const saveMessage = useCallback(async (msg: ChatMessage) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !msg.content) return;
            await supabase.from('chat_messages').insert({
                user_id: user.id, company_id: companyId,
                role: msg.role, content: msg.content,
                model_used: msg.model_used || null,
                context_loaded: msg.context_loaded || false,
                source: 'copilot',
            });
        } catch { /* ignore */ }
    }, [companyId]);

    // Initial load
    useEffect(() => {
        if (initialLoaded) return;
        (async () => {
            const msgs = await loadMessages();
            if (msgs.length > 0) {
                setMessages(msgs);
                setHasMore(msgs.length >= PAGE_SIZE);
            }
            setInitialLoaded(true);
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 150);
        })();
    }, [loadMessages, initialLoaded]);

    // Auto-scroll
    const lastMsgContent = messages[messages.length - 1]?.content || '';
    useEffect(() => {
        if (scrollRef.current && initialLoaded) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    }, [messages.length, lastMsgContent, initialLoaded]);

    // Focus input on open
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const sendMessage = useCallback(async (text?: string) => {
        const msg = text || inputValue.trim();
        if (!msg || isLoading) return;
        setInputValue('');
        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: msg, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setStreamPhase('searching');
        saveMessage(userMsg);

        const assistantId = `a_${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

        const phaseTimer = setTimeout(() => setStreamPhase('analyzing'), 1500);
        const phaseTimer2 = setTimeout(() => setStreamPhase('writing'), 4000);

        try {
            const recentHistory = messages.slice(-3).map(m => ({ role: m.role, content: m.content.substring(0, 300) }));

            // Build context-enriched message
            let enrichedMessage = msg;
            if (currentEntity) {
                const ctxInfo = Object.entries(currentEntity.data || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
                enrichedMessage = `[السياق: ${currentEntity.type} — ${currentEntity.label}${ctxInfo ? ' | ' + ctxInfo : ''}]\n${msg}`;
            }

            // Retry once on cold start failure
            let data: any = null;
            let lastError: any = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await supabase.functions.invoke('nexa-agent', {
                        body: {
                            message: enrichedMessage, language,
                            context_type: currentEntity?.type || currentPage || 'general',
                            context_id: currentEntity?.id || null,
                            chat_history: recentHistory,
                            complexity: 'auto',
                            company_id: companyId,
                            conversation_summary: getMemory(messages) || undefined,
                        },
                    });
                    data = result.data;
                    if (data?.response) break;
                } catch (e) {
                    lastError = e;
                    console.warn('[NexaPro] Attempt', attempt + 1, 'failed:', e);
                }
                if (attempt < 2 && !data?.response) {
                    console.log('[NexaPro] Attempt', attempt + 1, 'failed or empty, retrying...');
                    setStreamPhase(isAr ? '⏳ جاري إعادة المحاولة...' : '⏳ Retrying...');
                    await new Promise(r => setTimeout(r, attempt === 0 ? 1500 : 2500));
                }
            }

            if (!data?.response && lastError) {
                throw lastError; // re-throw to catch block below
            }

            console.log('[NexaPro] Edge fn response:', JSON.stringify(data)?.slice(0, 500));
            const responseText = data?.response
                || (isAr ? 'لم أتمكن من توليد رد الآن. حاول مرة أخرى أو أعد صياغة سؤالك. 🔄' : 'Could not generate a response. Try again. 🔄');

            const assistantMsg: ChatMessage = {
                id: assistantId, role: 'assistant', content: responseText,
                model_used: data?.model_used, context_loaded: data?.context_loaded, timestamp: new Date(),
            };
            setMessages(prev => prev.map(m => m.id === assistantId ? assistantMsg : m));
            saveMessage(assistantMsg);
        } catch {
            setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: isAr ? '🔄 خطأ في الاتصال. حاول مرة أخرى.' : '🔄 Connection error. Try again.' } : m
            ));
        } finally {
            setIsLoading(false); setStreamPhase('');
            clearTimeout(phaseTimer); clearTimeout(phaseTimer2);
            inputRef.current?.focus();
        }
    }, [inputValue, isLoading, messages, currentEntity, currentPage, language, companyId, isAr, getMemory, saveMessage]);

    // Get prompts for current context
    const contextKey = currentEntity?.type || currentPage || 'general';
    const prompts = CONTEXT_PROMPTS[contextKey] || CONTEXT_PROMPTS.general;
    const quickPrompts = isAr ? prompts.ar : prompts.en;

    // Date grouping
    const getDateKey = (d: Date) => new Date(d).toDateString();
    let lastDateKey = '';

    return (
        <div style={{ pointerEvents: 'auto' }} className={`fixed bottom-4 z-[9999] w-[340px] h-[70vh] max-h-[600px] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 ${isAr ? 'left-4' : 'right-4'}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{isAr ? 'وكيل نيكسا برو' : 'NexaPro Agent'}</div>
                    <div className="text-[11px] text-white/70 truncate">
                        {currentEntity ? `${currentEntity.label}` : currentPageLabel}
                    </div>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Context Card — shows when an entity is pushed */}
            {currentEntity && (
                <div className="px-3 pt-2 pb-1 shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                        currentEntity.data?.party_type === 'customer'
                            ? 'bg-indigo-50/80 border-indigo-200/60 dark:bg-indigo-950/30 dark:border-indigo-800/40'
                            : currentEntity.data?.party_type === 'supplier'
                            ? 'bg-amber-50/80 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/40'
                            : 'bg-violet-50/80 border-violet-200/60 dark:bg-violet-950/30 dark:border-violet-800/40'
                    }`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                            currentEntity.data?.party_type === 'customer' ? 'bg-indigo-500' :
                            currentEntity.data?.party_type === 'supplier' ? 'bg-amber-500' : 'bg-violet-500'
                        }`}>
                            {currentEntity.label?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                {currentEntity.label}
                            </p>
                            <p className="text-[10px] text-gray-400">
                                {isAr
                                    ? (currentEntity.data?.party_type === 'customer' ? '👤 عميل — في الفاتورة' : currentEntity.data?.party_type === 'supplier' ? '🏭 مورد — في أمر الشراء' : currentEntity.type)
                                    : (currentEntity.data?.party_type === 'customer' ? '👤 Customer — In Invoice' : currentEntity.data?.party_type === 'supplier' ? '🏭 Supplier — In Purchase' : currentEntity.type)
                                }
                            </p>
                        </div>
                        <button
                            onClick={() => sendMessage(isAr ? `أعطني ملخص سريع عن ${currentEntity.label}` : `Give me a quick summary about ${currentEntity.label}`)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-600/30 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors whitespace-nowrap"
                        >
                            {isAr ? '📊 ملخص' : '📊 Summary'}
                        </button>
                    </div>
                </div>
            )}


            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Welcome / Quick Prompts */}
                {messages.length === 0 && initialLoaded && (
                    <div className="flex flex-col items-center py-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-xs text-gray-500 mb-4 text-center">
                            {isAr ? 'مرحباً! كيف أساعدك؟' : 'Hi! How can I help?'}
                        </p>
                        <div className="space-y-1.5 w-full">
                            {quickPrompts.map((p, i) => (
                                <button key={i} onClick={() => sendMessage(p)}
                                    className="w-full text-xs px-3 py-2 rounded-lg text-start bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-gray-600 dark:text-gray-400 transition-colors border border-gray-100 dark:border-gray-700">
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => {
                    const dateKey = getDateKey(msg.timestamp);
                    const showDateSep = dateKey !== lastDateKey;
                    lastDateKey = dateKey;
                    return (
                        <React.Fragment key={msg.id}>
                            {showDateSep && (
                                <div className="flex justify-center py-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200/70 dark:bg-gray-700/70 text-gray-500">
                                        {formatDate(msg.timestamp)}
                                    </span>
                                </div>
                            )}
                            <div className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-6",
                                    msg.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700')}>
                                    {msg.role === 'assistant' && !msg.content && isLoading ? (
                                        <div className="flex items-center gap-1.5 py-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            <span className="text-[10px] text-gray-400 ms-1">
                                                {streamPhase === 'searching' ? '🔍' : streamPhase === 'analyzing' ? '📊' : '✍️'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                            __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
                                        }} />
                                    )}
                                    <div className="mt-1 flex items-center gap-1 justify-end">
                                        <span className={cn("text-[9px]", msg.role === 'user' ? 'text-white/50' : 'text-gray-400')}>
                                            {formatTime(msg.timestamp)}
                                        </span>
                                        {msg.role === 'assistant' && msg.model_used && (
                                            <span className={cn("text-[9px]", msg.model_used?.includes('pro') ? 'text-purple-400' : 'text-blue-400')}>
                                                {msg.model_used?.includes('pro') ? '🧠' : '⚡'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Quick prompts when has messages but context changed */}
            {messages.length > 0 && !isLoading && (
                <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-hide">
                    {quickPrompts.slice(0, 3).map((p, i) => (
                        <button key={i} onClick={() => sendMessage(p)}
                            className="whitespace-nowrap text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 transition-colors shrink-0">
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-2.5 border-t bg-white dark:bg-gray-900 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        onPointerDown={(e) => { const target = e.currentTarget; setTimeout(() => target.focus(), 0); }}
                        placeholder={isAr ? 'اسأل أي شيء...' : 'Ask anything...'}
                        disabled={isLoading} rows={1}
                        onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 80) + 'px'; }}
                        className="flex-1 min-h-[36px] max-h-[80px] py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={() => sendMessage()} disabled={!inputValue.trim() || isLoading}
                        className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity">
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className={cn("w-3.5 h-3.5", isAr && 'rotate-180')} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

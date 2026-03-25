/**
 * ════════════════════════════════════════════════════════════════
 * 🧠 Material Analytics Tab — NexaAgent V2 AI Chat + Insights
 * تبويب تحليلات الذكاء الاصطناعي للمواد
 * ════════════════════════════════════════════════════════════════
 * - Smart AI-generated insights cards (auto on tab open)
 * - Interactive chat with NexaAgent
 * - Hybrid model support (Flash / Pro)
 * - Real data context from Supabase
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    Bot, Send, Loader2, Sparkles, TrendingUp, TrendingDown,
    Package, DollarSign, BarChart3, AlertTriangle, Zap,
    MessageSquare, RefreshCw, ChevronDown
} from 'lucide-react';
import type { SheetMode } from '../types';

interface MaterialAnalyticsTabProps {
    data: any;
    mode?: SheetMode;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    model_used?: string;
    timestamp: Date;
}

interface InsightCard {
    icon: React.ReactNode;
    title: string;
    value: string;
    detail: string;
    color: string;
}

// ═══ Quick prompt suggestions ═══
const QUICK_PROMPTS_AR = [
    '📊 حلل أداء هذه المادة',
    '💰 ما هو هامش الربح الأمثل؟',
    '📈 ما هو معدل دوران المخزون؟',
    '⚠️ هل يوجد مخاطر على هذه المادة؟',
    '🏷️ اقترح سعر بيع مناسب',
    '📦 متى يجب إعادة الطلب؟',
];

const QUICK_PROMPTS_EN = [
    '📊 Analyze this material performance',
    '💰 What is the optimal profit margin?',
    '📈 What is the inventory turnover rate?',
    '⚠️ Are there any risks for this material?',
    '🏷️ Suggest a suitable selling price',
    '📦 When should I reorder?',
];

export function MaterialAnalyticsTab({ data }: MaterialAnalyticsTabProps) {
    const { language } = useLanguage();
    const { user, companyId } = useAuth();
    const isAr = language === 'ar';

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'auto' | 'flash' | 'pro'>('auto');
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Insights state
    const [insights, setInsights] = useState<InsightCard[]>([]);
    const [insightsLoaded, setInsightsLoaded] = useState(false);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Generate insight cards from local data
    useEffect(() => {
        if (!data || insightsLoaded) return;

        const cards: InsightCard[] = [];
        const stock = data.current_stock || data.rolls_total_length || 0;
        const rolls = data.rolls_count || 0;
        const minStock = data.min_stock || data.min_stock_level || 0;
        const sellPrice = data.selling_price || 0;
        const buyPrice = data.purchase_price || data.avg_cost_per_unit || 0;

        // Stock card
        cards.push({
            icon: <Package className="w-5 h-5" />,
            title: isAr ? 'المخزون الحالي' : 'Current Stock',
            value: `${Number(stock).toLocaleString()} ${data.unit || 'm'}`,
            detail: rolls > 0 ? `${rolls} ${isAr ? 'رول' : 'rolls'}` : '',
            color: stock <= minStock ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        });

        // Price card
        if (sellPrice > 0 || buyPrice > 0) {
            const margin = sellPrice > 0 && buyPrice > 0
                ? ((sellPrice - buyPrice) / sellPrice * 100).toFixed(1)
                : '—';
            cards.push({
                icon: <DollarSign className="w-5 h-5" />,
                title: isAr ? 'هامش الربح' : 'Profit Margin',
                value: `${margin}%`,
                detail: isAr ? `بيع: ${sellPrice} | شراء: ${buyPrice}` : `Sell: ${sellPrice} | Buy: ${buyPrice}`,
                color: Number(margin) > 20 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                    Number(margin) > 10 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' :
                        'text-red-600 bg-red-50 dark:bg-red-900/20',
            });
        }

        // Stock alert
        if (minStock > 0 && stock <= minStock) {
            cards.push({
                icon: <AlertTriangle className="w-5 h-5" />,
                title: isAr ? 'تنبيه مخزون' : 'Stock Alert',
                value: isAr ? 'مخزون منخفض!' : 'Low Stock!',
                detail: isAr ? `أقل من الحد الأدنى (${minStock})` : `Below minimum (${minStock})`,
                color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
            });
        }

        // Status card
        cards.push({
            icon: <BarChart3 className="w-5 h-5" />,
            title: isAr ? 'حالة المادة' : 'Material Status',
            value: data.status === 'active' || data.is_active !== false
                ? (isAr ? 'نشطة' : 'Active')
                : (isAr ? 'غير نشطة' : 'Inactive'),
            detail: data.category ? `${isAr ? 'الفئة' : 'Category'}: ${data.category}` : '',
            color: data.status === 'active' || data.is_active !== false
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                : 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
        });

        setInsights(cards);
        setInsightsLoaded(true);
    }, [data, isAr, insightsLoaded]);

    // ═══ Send message to NexaAgent ═══
    const sendMessage = useCallback(async (text?: string) => {
        const messageText = text || inputValue.trim();
        if (!messageText || isLoading) return;

        setInputValue('');
        setShowQuickPrompts(false);

        // Add user message
        const userMsg: ChatMessage = {
            id: `u_${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // Build chat history for context
            const chatHistory = messages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const { data: responseData, error } = await supabase.functions.invoke('nexa-agent', {
                body: {
                    message: messageText,
                    language,
                    context_type: 'material',
                    context_id: data?.id,
                    context_data: null, // Let Edge Function fetch real data
                    chat_history: chatHistory,
                    complexity: selectedModel,
                    company_id: companyId,
                },
            });

            if (error) throw error;

            const assistantMsg: ChatMessage = {
                id: `a_${Date.now()}`,
                role: 'assistant',
                content: responseData?.response || (isAr ? 'عذراً، لم أتمكن من معالجة طلبك.' : 'Sorry, I could not process your request.'),
                model_used: responseData?.model_used,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);

        } catch (err: any) {
            console.error('NexaAgent error:', err);
            const errorMsg: ChatMessage = {
                id: `e_${Date.now()}`,
                role: 'assistant',
                content: isAr
                    ? `⚠️ خطأ في الاتصال: ${err.message || 'يرجى المحاولة مرة أخرى'}`
                    : `⚠️ Connection error: ${err.message || 'Please try again'}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [inputValue, isLoading, messages, data, language, selectedModel, companyId, isAr]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickPrompts = isAr ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

    return (
        <div className="flex flex-col h-full min-h-[500px] gap-4 pb-4">
            {/* ═══ Smart Insights Cards ═══ */}
            {insights.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {insights.map((card, idx) => (
                        <Card key={idx} className={cn("border-none shadow-sm", card.color)}>
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    {card.icon}
                                    <span className="text-xs font-medium opacity-80">{card.title}</span>
                                </div>
                                <div className="text-lg font-bold">{card.value}</div>
                                {card.detail && (
                                    <div className="text-[11px] opacity-70 mt-0.5">{card.detail}</div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ═══ Chat Area ═══ */}
            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-sm">
                {/* Header */}
                <CardHeader className="pb-2 pt-3 px-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold">
                                    {isAr ? 'وكيل نيكسا الذكي' : 'NexaAgent AI'}
                                </CardTitle>
                                <p className="text-[11px] text-gray-500">
                                    {isAr
                                        ? `تحليل: ${data?.name_ar || data?.name_en || data?.code || ''}`
                                        : `Analyzing: ${data?.name_en || data?.name_ar || data?.code || ''}`}
                                </p>
                            </div>
                        </div>

                        {/* Model selector */}
                        <div className="flex items-center gap-1">
                            {(['auto', 'flash', 'pro'] as const).map((model) => (
                                <button
                                    key={model}
                                    onClick={() => setSelectedModel(model)}
                                    className={cn(
                                        "px-2 py-1 rounded text-[10px] font-bold transition-all",
                                        selectedModel === model
                                            ? model === 'pro'
                                                ? 'bg-purple-600 text-white'
                                                : model === 'flash'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    )}
                                >
                                    {model === 'auto' ? (isAr ? 'تلقائي' : 'Auto') :
                                        model === 'flash' ? '⚡ Flash' : '🧠 Pro'}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[400px]"
                >
                    {/* Welcome message */}
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">
                                {isAr ? 'مرحباً! أنا وكيل نيكسا الذكي 🤖' : 'Hello! I am NexaAgent AI 🤖'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                {isAr
                                    ? 'أقرأ البيانات الحقيقية لهذه المادة وأقدم لك تحليلات ذكية. اسألني أي شيء!'
                                    : 'I read real data for this material and provide smart analytics. Ask me anything!'}
                            </p>
                        </div>
                    )}

                    {/* Chat messages */}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-2",
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                                )}
                            >
                                {/* Render markdown-like formatting */}
                                <div
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                        __html: msg.content
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\n/g, '<br/>')
                                    }}
                                />
                                {msg.model_used && msg.role === 'assistant' && (
                                    <div className="mt-1.5 flex items-center gap-1">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[9px] px-1.5 py-0 h-4",
                                                msg.model_used === 'pro' || msg.model_used === 'pro_fallback'
                                                    ? 'border-purple-300 text-purple-600'
                                                    : 'border-blue-300 text-blue-600'
                                            )}
                                        >
                                            {msg.model_used === 'pro' ? '🧠 Pro' :
                                                msg.model_used === 'flash_fallback' ? '⚡ Flash (fallback)' : '⚡ Flash'}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    <span className="text-sm text-gray-500">
                                        {isAr ? 'يفكّر...' : 'Thinking...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick prompts */}
                {showQuickPrompts && messages.length === 0 && (
                    <div className="px-4 pb-2">
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(prompt)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="p-3 border-t bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isAr ? 'اسأل وكيل نيكسا عن هذه المادة...' : 'Ask NexaAgent about this material...'}
                            disabled={isLoading}
                            className="flex-1 bg-gray-50 dark:bg-gray-800 border-none"
                        />
                        <Button
                            size="sm"
                            onClick={() => sendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-9 px-4"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className={cn("w-4 h-4", isAr ? 'rotate-180' : '')} />
                            )}
                        </Button>
                    </div>

                    {/* Footer info */}
                    <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                        <span>
                            {isAr
                                ? `الموديل: ${selectedModel === 'auto' ? 'تلقائي' : selectedModel === 'flash' ? 'Flash ⚡' : 'Pro 🧠'}`
                                : `Model: ${selectedModel === 'auto' ? 'Auto' : selectedModel === 'flash' ? 'Flash ⚡' : 'Pro 🧠'}`}
                        </span>
                        <span>
                            {isAr ? '🔒 البيانات محمية بالصلاحيات' : '🔒 Data protected by permissions'}
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    );
}

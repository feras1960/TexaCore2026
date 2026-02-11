/**
 * ═══════════════════════════════════════════════════════════════
 *  NexaAgentTab — وكيل نيكسا الذكي
 * ═══════════════════════════════════════════════════════════════
 *  Phase 9: ذكاء العميل + محادثة + تحليل الأداء
 *  يعرض ملخص ذكي عن العميل، توصيات، تنبيهات، ومحادثة AI
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bot,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Star,
    ShoppingCart,
    CreditCard,
    Clock,
    Package,
    MessageSquare,
    Send,
    Sparkles,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    XCircle,
    Lightbulb,
    Crown,
    Repeat,
    Calendar,
    DollarSign,
    Loader2,
    ChevronDown,
    ChevronUp,
    User,
    History,
    ThumbsUp,
    ThumbsDown,
    RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface NexaAgentTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange?: (updates: any) => void;
}

interface CustomerInsight {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    daysSinceLastOrder: number;
    paymentRate: number; // 0-100%
    topProducts: { name: string; qty: number; revenue: number }[];
    orderTrend: 'increasing' | 'decreasing' | 'stable';
    customerTier: 'new' | 'regular' | 'vip' | 'dormant';
    outstandingBalance: number;
    creditLimit: number;
    avgPaymentDays: number;
    returnRate: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    feedback?: 'positive' | 'negative';
}

interface SmartAlert {
    type: 'warning' | 'opportunity' | 'info' | 'success';
    icon: any;
    title_ar: string;
    title_en: string;
    description_ar: string;
    description_en: string;
}

// ═══════════════════════════════════════════════════════════
// Helper: Calculate insights from real data
// ═══════════════════════════════════════════════════════════

function calculateCustomerTier(insight: Partial<CustomerInsight>): CustomerInsight['customerTier'] {
    if (!insight.totalOrders || insight.totalOrders === 0) return 'new';
    if (insight.daysSinceLastOrder && insight.daysSinceLastOrder > 90) return 'dormant';
    if ((insight.totalOrders || 0) >= 20 || (insight.totalRevenue || 0) >= 50000) return 'vip';
    return 'regular';
}

function generateAlerts(insight: CustomerInsight, language: string): SmartAlert[] {
    const alerts: SmartAlert[] = [];

    // Payment warning
    if (insight.outstandingBalance > 0 && insight.paymentRate < 70) {
        alerts.push({
            type: 'warning',
            icon: AlertTriangle,
            title_ar: 'تأخر في السداد',
            title_en: 'Late Payment Alert',
            description_ar: `العميل لديه رصيد مستحق ${insight.outstandingBalance.toLocaleString()} ونسبة سداد ${insight.paymentRate}%`,
            description_en: `Outstanding balance: ${insight.outstandingBalance.toLocaleString()} with ${insight.paymentRate}% payment rate`,
        });
    }

    // VIP opportunity
    if (insight.customerTier === 'vip') {
        alerts.push({
            type: 'success',
            icon: Crown,
            title_ar: 'عميل VIP',
            title_en: 'VIP Customer',
            description_ar: `عميل مميز بإجمالي ${insight.totalOrders} طلب و${insight.totalRevenue.toLocaleString()} إيرادات`,
            description_en: `Premium customer with ${insight.totalOrders} orders worth ${insight.totalRevenue.toLocaleString()}`,
        });
    }

    // Dormant customer
    if (insight.customerTier === 'dormant') {
        alerts.push({
            type: 'warning',
            icon: Clock,
            title_ar: 'عميل خامل',
            title_en: 'Dormant Customer',
            description_ar: `آخر طلب منذ ${insight.daysSinceLastOrder} يوم — يحتاج متابعة`,
            description_en: `Last order ${insight.daysSinceLastOrder} days ago — needs follow-up`,
        });
    }

    // Cross-sell opportunity
    if (insight.orderTrend === 'increasing') {
        alerts.push({
            type: 'opportunity',
            icon: TrendingUp,
            title_ar: 'فرصة بيع متقاطع',
            title_en: 'Cross-sell Opportunity',
            description_ar: 'إتجاه الطلبات تصاعدي — فرصة لعرض منتجات جديدة',
            description_en: 'Orders trending up — good time for cross-selling',
        });
    }

    // Credit limit warning
    if (insight.creditLimit > 0 && insight.outstandingBalance >= insight.creditLimit * 0.8) {
        alerts.push({
            type: 'warning',
            icon: CreditCard,
            title_ar: 'اقتراب من حد الائتمان',
            title_en: 'Near Credit Limit',
            description_ar: `الرصيد المستحق ${insight.outstandingBalance.toLocaleString()} من حد ${insight.creditLimit.toLocaleString()}`,
            description_en: `Outstanding ${insight.outstandingBalance.toLocaleString()} of ${insight.creditLimit.toLocaleString()} limit`,
        });
    }

    // New customer welcome
    if (insight.customerTier === 'new') {
        alerts.push({
            type: 'info',
            icon: Sparkles,
            title_ar: 'عميل جديد',
            title_en: 'New Customer',
            description_ar: 'عميل جديد — فرصة لبناء العلاقة',
            description_en: 'New customer — opportunity to build relationship',
        });
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════
// Pre-built chat suggestions
// ═══════════════════════════════════════════════════════════

const CHAT_SUGGESTIONS = {
    ar: [
        'ما هو تاريخ آخر طلب لهذا العميل؟',
        'ما هي المنتجات الأكثر طلباً من هذا العميل؟',
        'هل يوجد رصيد مستحق على هذا العميل؟',
        'اقترح خصم مناسب لهذا العميل',
        'ما هو معدل سداد هذا العميل؟',
        'ملخص أداء العميل في آخر 6 أشهر',
    ],
    en: [
        'What was this customer\'s last order?',
        'What are the top products for this customer?',
        'Is there an outstanding balance?',
        'Suggest an appropriate discount',
        'What is this customer\'s payment rate?',
        'Summary of customer performance last 6 months',
    ],
};

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function NexaAgentTab({ data, mode }: NexaAgentTabProps) {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    // ═══ State ═══
    const [insight, setInsight] = useState<CustomerInsight | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'chat'>('overview');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [expandedAlerts, setExpandedAlerts] = useState(true);
    const [geminiConnected, setGeminiConnected] = useState<boolean | null>(null); // null = unknown, true = AI connected, false = offline/fallback
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const customerId = data?.customer_id || data?.party_id;
    const customerName = data?.customer_name || data?.party_name || '';

    // ═══ Fetch Customer Insights ═══
    const fetchInsights = useCallback(async () => {
        if (!customerId) return;
        setLoading(true);

        try {
            // Fetch customer orders
            const { data: orders, error: ordersError } = await supabase
                .from('sales_orders')
                .select('id, total_amount, created_at, status, currency')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            // Fetch invoices for payment rate
            const { data: invoices } = await supabase
                .from('sales_invoices')
                .select('id, total_amount, paid_amount, created_at, status, due_date')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            // Fetch customer info for credit limit
            const { data: customer } = await supabase
                .from('customers')
                .select('credit_limit, balance, category')
                .eq('id', customerId)
                .single();

            if (ordersError) throw ordersError;

            const orderList = orders || [];
            const invoiceList = invoices || [];

            // Calculate metrics
            const totalOrders = orderList.length;
            const totalRevenue = orderList.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            const lastOrderDate = orderList.length > 0 ? orderList[0].created_at : null;
            const daysSinceLastOrder = lastOrderDate
                ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
                : 999;

            // Payment rate
            const totalInvoiced = invoiceList.reduce((sum: number, i: any) => sum + (parseFloat(i.total_amount) || 0), 0);
            const totalPaid = invoiceList.reduce((sum: number, i: any) => sum + (parseFloat(i.paid_amount) || 0), 0);
            const paymentRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;

            // Outstanding balance
            const outstandingBalance = parseFloat(customer?.balance || '0');
            const creditLimit = parseFloat(customer?.credit_limit || '0');

            // Order trend (last 3 months vs previous 3)
            const now = new Date();
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            const recentOrders = orderList.filter((o: any) => new Date(o.created_at) >= threeMonthsAgo).length;
            const previousOrders = orderList.filter((o: any) => {
                const d = new Date(o.created_at);
                return d >= sixMonthsAgo && d < threeMonthsAgo;
            }).length;
            const orderTrend: CustomerInsight['orderTrend'] =
                recentOrders > previousOrders ? 'increasing' :
                    recentOrders < previousOrders ? 'decreasing' : 'stable';

            // Average payment days
            const paidInvoices = invoiceList.filter((i: any) => i.status === 'paid');
            const avgPaymentDays = paidInvoices.length > 0
                ? Math.round(paidInvoices.reduce((sum: number, i: any) => {
                    const created = new Date(i.created_at);
                    const due = new Date(i.due_date || i.created_at);
                    return sum + Math.max(0, Math.floor((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
                }, 0) / paidInvoices.length)
                : 0;

            const insightData: CustomerInsight = {
                totalOrders,
                totalRevenue,
                avgOrderValue,
                lastOrderDate,
                daysSinceLastOrder,
                paymentRate,
                topProducts: [], // Would need order_items join
                orderTrend,
                customerTier: 'new',
                outstandingBalance,
                creditLimit,
                avgPaymentDays,
                returnRate: 0,
            };
            insightData.customerTier = calculateCustomerTier(insightData);

            setInsight(insightData);
        } catch (err) {
            console.error('Failed to fetch customer insights:', err);
            toast.error(language === 'ar' ? 'فشل تحميل بيانات العميل' : 'Failed to load customer data');
        } finally {
            setLoading(false);
        }
    }, [customerId, language]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);


    // ═══ Auto-scroll chat ═══
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ═══ Welcome message ═══
    useEffect(() => {
        if (customerId && chatMessages.length === 0) {
            const welcomeMsg: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                content: language === 'ar'
                    ? `مرحباً! أنا وكيل نيكسا 🤖\nأنا هنا لمساعدتك في فهم أداء العميل "${customerName}" وتقديم توصيات ذكية.\n\nاسألني عن:\n• تاريخ الطلبات والمشتريات\n• الرصيد المستحق والسداد\n• المنتجات المفضلة\n• اقتراحات الخصومات\n• أي استفسار آخر عن العميل`
                    : `Hello! I'm NexaAgent 🤖\nI'm here to help you understand customer "${customerName}" performance and provide smart recommendations.\n\nAsk me about:\n• Order history & purchases\n• Outstanding balance & payments\n• Favorite products\n• Discount suggestions\n• Any other customer inquiry`,
                timestamp: new Date(),
            };
            setChatMessages([welcomeMsg]);
        }
    }, [customerId, customerName, language]);

    // ═══ Handle Chat Send — Gemini via Supabase Edge Function with local fallback ═══
    const handleSendMessage = async () => {
        const text = chatInput.trim();
        if (!text || isSending) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsSending(true);

        try {
            let responseText: string;

            // ─── Try Gemini via Supabase Edge Function ───
            try {
                const payload = {
                    message: text,
                    language,
                    customer_name: customerName,
                    customer_insights: insight ? {
                        total_orders: insight.totalOrders,
                        total_revenue: insight.totalRevenue,
                        avg_order_value: insight.avgOrderValue,
                        last_order_date: insight.lastOrderDate,
                        days_since_last_order: insight.daysSinceLastOrder,
                        payment_rate: insight.paymentRate,
                        order_trend: insight.orderTrend,
                        customer_tier: insight.customerTier,
                        outstanding_balance: insight.outstandingBalance,
                        credit_limit: insight.creditLimit,
                        avg_payment_days: insight.avgPaymentDays,
                        return_rate: insight.returnRate,
                    } : null,
                    chat_history: chatMessages
                        .filter(m => m.id !== 'welcome')
                        .slice(-10)
                        .map(m => ({ role: m.role, content: m.content })),
                    document_type: data?.doc_type || 'trade_order',
                };

                const { data: result, error } = await supabase.functions.invoke('nexa-agent', {
                    body: payload,
                });

                if (error) throw error;

                responseText = result?.response || result?.reply || result?.output || JSON.stringify(result);
                setGeminiConnected(true);
            } catch (geminiError) {
                console.warn('Gemini Edge Function failed, falling back to local:', geminiError);
                setGeminiConnected(false);
                // Fallback to local response
                responseText = generateContextualResponse(text, insight, language);
                responseText += language === 'ar'
                    ? '\n\n⚠️ _رد محلي — تعذر الاتصال بـ Gemini AI_'
                    : '\n\n⚠️ _Local response — Gemini AI connection failed_';
            }

            const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: responseText,
                timestamp: new Date(),
            };

            setChatMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            toast.error(language === 'ar' ? 'فشل في الرد' : 'Failed to respond');
        } finally {
            setIsSending(false);
        }
    };

    // ═══ Contextual Response Generator ═══
    function generateContextualResponse(query: string, insight: CustomerInsight | null, lang: string): string {
        if (!insight) {
            return lang === 'ar'
                ? 'لم يتم تحميل بيانات العميل بعد. الرجاء الانتظار...'
                : 'Customer data not loaded yet. Please wait...';
        }

        const q = query.toLowerCase();

        // Order history
        if (q.includes('طلب') || q.includes('order') || q.includes('تاريخ') || q.includes('history')) {
            return lang === 'ar'
                ? `📊 **ملخص الطلبات:**\n\n• إجمالي الطلبات: **${insight.totalOrders}** طلب\n• إجمالي الإيرادات: **${insight.totalRevenue.toLocaleString()}**\n• متوسط قيمة الطلب: **${insight.avgOrderValue.toLocaleString()}**\n• آخر طلب: **${insight.lastOrderDate ? new Date(insight.lastOrderDate).toLocaleDateString('ar') : 'لا يوجد'}**\n• الاتجاه: **${insight.orderTrend === 'increasing' ? '📈 تصاعدي' : insight.orderTrend === 'decreasing' ? '📉 تنازلي' : '➡️ مستقر'}**`
                : `📊 **Order Summary:**\n\n• Total Orders: **${insight.totalOrders}**\n• Total Revenue: **${insight.totalRevenue.toLocaleString()}**\n• Avg Order Value: **${insight.avgOrderValue.toLocaleString()}**\n• Last Order: **${insight.lastOrderDate ? new Date(insight.lastOrderDate).toLocaleDateString('en') : 'None'}**\n• Trend: **${insight.orderTrend === 'increasing' ? '📈 Increasing' : insight.orderTrend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}**`;
        }

        // Balance / payment
        if (q.includes('رصيد') || q.includes('سداد') || q.includes('دفع') || q.includes('balance') || q.includes('payment') || q.includes('outstanding')) {
            return lang === 'ar'
                ? `💰 **حالة السداد:**\n\n• نسبة السداد: **${insight.paymentRate}%**\n• الرصيد المستحق: **${insight.outstandingBalance.toLocaleString()}**\n• حد الائتمان: **${insight.creditLimit > 0 ? insight.creditLimit.toLocaleString() : 'غير محدد'}**\n• متوسط أيام السداد: **${insight.avgPaymentDays}** يوم\n\n${insight.paymentRate >= 90 ? '✅ عميل ممتاز في السداد' : insight.paymentRate >= 70 ? '⚠️ سداد مقبول — يحتاج متابعة' : '🔴 سداد ضعيف — تنبيه!'}`
                : `💰 **Payment Status:**\n\n• Payment Rate: **${insight.paymentRate}%**\n• Outstanding: **${insight.outstandingBalance.toLocaleString()}**\n• Credit Limit: **${insight.creditLimit > 0 ? insight.creditLimit.toLocaleString() : 'Not set'}**\n• Avg Payment Days: **${insight.avgPaymentDays}** days\n\n${insight.paymentRate >= 90 ? '✅ Excellent payment record' : insight.paymentRate >= 70 ? '⚠️ Acceptable — needs follow-up' : '🔴 Poor payment — Alert!'}`;
        }

        // Discount suggestion
        if (q.includes('خصم') || q.includes('discount') || q.includes('تخفيض')) {
            const suggestedDiscount =
                insight.customerTier === 'vip' ? 10 :
                    insight.customerTier === 'regular' ? 5 :
                        insight.customerTier === 'dormant' ? 15 : 3;

            return lang === 'ar'
                ? `🏷️ **اقتراح الخصم:**\n\n• تصنيف العميل: **${insight.customerTier === 'vip' ? '👑 VIP' : insight.customerTier === 'regular' ? '⭐ منتظم' : insight.customerTier === 'dormant' ? '😴 خامل' : '🆕 جديد'}**\n• الخصم المقترح: **${suggestedDiscount}%**\n\n💡 **التبرير:**\n${insight.customerTier === 'vip' ? '• عميل مميز — خصم ولاء لتعزيز العلاقة' : insight.customerTier === 'dormant' ? '• عميل خامل — خصم تحفيزي لإعادة التفعيل' : '• خصم تشجيعي لزيادة حجم الطلبات'}`
                : `🏷️ **Discount Suggestion:**\n\n• Customer Tier: **${insight.customerTier === 'vip' ? '👑 VIP' : insight.customerTier === 'regular' ? '⭐ Regular' : insight.customerTier === 'dormant' ? '😴 Dormant' : '🆕 New'}**\n• Suggested Discount: **${suggestedDiscount}%**\n\n💡 **Justification:**\n${insight.customerTier === 'vip' ? '• VIP loyalty discount to strengthen relationship' : insight.customerTier === 'dormant' ? '• Incentive discount to reactivate customer' : '• Encouraging discount to grow order volume'}`;
        }

        // Performance summary
        if (q.includes('ملخص') || q.includes('أداء') || q.includes('summary') || q.includes('performance')) {
            return lang === 'ar'
                ? `📋 **ملخص أداء العميل "${customerName}":**\n\n🏷️ التصنيف: **${insight.customerTier === 'vip' ? '👑 VIP' : insight.customerTier === 'regular' ? '⭐ منتظم' : insight.customerTier === 'dormant' ? '😴 خامل' : '🆕 جديد'}**\n📦 الطلبات: **${insight.totalOrders}** (اتجاه ${insight.orderTrend === 'increasing' ? '📈 تصاعدي' : insight.orderTrend === 'decreasing' ? '📉 تنازلي' : '➡️ مستقر'})\n💰 الإيرادات: **${insight.totalRevenue.toLocaleString()}**\n💳 نسبة السداد: **${insight.paymentRate}%**\n⏱️ آخر طلب: **${insight.daysSinceLastOrder}** يوم\n📊 متوسط الطلب: **${insight.avgOrderValue.toLocaleString()}**`
                : `📋 **Customer Performance Summary "${customerName}":**\n\n🏷️ Tier: **${insight.customerTier === 'vip' ? '👑 VIP' : insight.customerTier === 'regular' ? '⭐ Regular' : insight.customerTier === 'dormant' ? '😴 Dormant' : '🆕 New'}**\n📦 Orders: **${insight.totalOrders}** (trend: ${insight.orderTrend === 'increasing' ? '📈 Up' : insight.orderTrend === 'decreasing' ? '📉 Down' : '➡️ Stable'})\n💰 Revenue: **${insight.totalRevenue.toLocaleString()}**\n💳 Payment Rate: **${insight.paymentRate}%**\n⏱️ Last Order: **${insight.daysSinceLastOrder}** days ago\n📊 Avg Order: **${insight.avgOrderValue.toLocaleString()}**`;
        }

        // Fallback
        return lang === 'ar'
            ? `أفهم سؤالك عن "${query}".\n\nبناءً على بيانات العميل:\n• التصنيف: **${insight.customerTier}** | الطلبات: **${insight.totalOrders}** | الإيرادات: **${insight.totalRevenue.toLocaleString()}**\n\nيمكنك سؤالي عن:\n• تاريخ الطلبات\n• حالة السداد والرصيد\n• اقتراح خصم\n• ملخص الأداء`
            : `I understand your question about "${query}".\n\nBased on customer data:\n• Tier: **${insight.customerTier}** | Orders: **${insight.totalOrders}** | Revenue: **${insight.totalRevenue.toLocaleString()}**\n\nYou can ask me about:\n• Order history\n• Payment status & balance\n• Discount suggestions\n• Performance summary`;
    }

    // ═══ Handle chat feedback ═══
    const handleFeedback = (msgId: string, feedback: 'positive' | 'negative') => {
        setChatMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, feedback } : m
        ));
    };

    // ═══ No customer selected ═══
    if (!customerId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
                <Bot className="w-16 h-16 mb-3 opacity-40" />
                <p className="text-sm font-medium">
                    {language === 'ar' ? 'اختر عميلاً لتفعيل وكيل نيكسا' : 'Select a customer to activate NexaAgent'}
                </p>
            </div>
        );
    }

    // ═══ Loading ═══
    if (loading && !insight) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-violet-500" />
                <p className="text-sm">{language === 'ar' ? 'جاري تحليل بيانات العميل...' : 'Analyzing customer data...'}</p>
            </div>
        );
    }

    const alerts = insight ? generateAlerts(insight, language) : [];
    const tierColors = {
        new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        regular: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        vip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        dormant: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    const tierLabels = {
        new: { ar: '🆕 جديد', en: '🆕 New' },
        regular: { ar: '⭐ منتظم', en: '⭐ Regular' },
        vip: { ar: '👑 VIP', en: '👑 VIP' },
        dormant: { ar: '😴 خامل', en: '😴 Dormant' },
    };

    return (
        <div className="flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ Section Toggle ═══ */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-2">
                <button
                    onClick={() => setActiveSection('overview')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === 'overview'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                </button>
                <button
                    onClick={() => setActiveSection('chat')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === 'chat'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'محادثة' : 'Chat'}
                    {chatMessages.length > 1 && (
                        <span className="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 text-[10px] px-1.5 rounded-full">
                            {chatMessages.filter(m => m.role === 'user').length}
                        </span>
                    )}
                </button>
                {/* Gemini AI connection indicator */}
                <div className="flex items-center gap-1 px-2" title={geminiConnected ? 'Gemini AI Connected' : 'Local Mode'}>
                    <div className={`w-1.5 h-1.5 rounded-full ${geminiConnected ? 'bg-green-500 animate-pulse' : geminiConnected === false ? 'bg-amber-400' : 'bg-gray-300'}`} />
                    <span className="text-[9px] text-gray-400">
                        {geminiConnected ? 'Gemini' : (language === 'ar' ? 'محلي' : 'Local')}
                    </span>
                </div>
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* SECTION: Overview                       */}
            {/* ═══════════════════════════════════════ */}
            {activeSection === 'overview' && insight && (
                <div className="space-y-3 overflow-auto flex-1 pr-1">

                    {/* ─── Header: Customer Tier ─── */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-xl p-3 border border-violet-200/50 dark:border-violet-800/30">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-violet-600/10 dark:bg-violet-400/10 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {language === 'ar' ? 'وكيل نيكسا — تحليل العميل' : 'NexaAgent — Customer Analysis'}
                                </p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{customerName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${tierColors[insight.customerTier]}`}>
                                {tierLabels[insight.customerTier][language === 'ar' ? 'ar' : 'en']}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchInsights}
                                className="h-7 w-7 p-0"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    {/* ─── KPI Cards ─── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Total Orders */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                    {language === 'ar' ? 'الطلبات' : 'Orders'}
                                </span>
                            </div>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">{insight.totalOrders}</p>
                            <div className="flex items-center gap-0.5 mt-0.5">
                                {insight.orderTrend === 'increasing' ? (
                                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                                ) : insight.orderTrend === 'decreasing' ? (
                                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                                ) : null}
                                <span className={`text-[10px] ${insight.orderTrend === 'increasing' ? 'text-green-500' : insight.orderTrend === 'decreasing' ? 'text-red-500' : 'text-gray-400'}`}>
                                    {insight.orderTrend === 'increasing' ? '↑' : insight.orderTrend === 'decreasing' ? '↓' : '→'}
                                </span>
                            </div>
                        </div>

                        {/* Revenue */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                    {language === 'ar' ? 'الإيرادات' : 'Revenue'}
                                </span>
                            </div>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">{insight.totalRevenue.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">
                                {language === 'ar' ? `متوسط: ${insight.avgOrderValue.toLocaleString()}` : `Avg: ${insight.avgOrderValue.toLocaleString()}`}
                            </p>
                        </div>

                        {/* Payment Rate */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CreditCard className="w-3.5 h-3.5 text-violet-500" />
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                    {language === 'ar' ? 'السداد' : 'Payment'}
                                </span>
                            </div>
                            <p className={`text-lg font-bold ${insight.paymentRate >= 90 ? 'text-green-600' : insight.paymentRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                {insight.paymentRate}%
                            </p>
                            <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1">
                                <div
                                    className={`h-full rounded-full transition-all ${insight.paymentRate >= 90 ? 'bg-green-500' : insight.paymentRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${insight.paymentRate}%` }}
                                />
                            </div>
                        </div>

                        {/* Last Order */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                    {language === 'ar' ? 'آخر طلب' : 'Last Order'}
                                </span>
                            </div>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                                {insight.daysSinceLastOrder < 999 ? `${insight.daysSinceLastOrder}` : '—'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                                {language === 'ar' ? 'يوم' : 'days ago'}
                            </p>
                        </div>
                    </div>

                    {/* ─── Smart Alerts ─── */}
                    {alerts.length > 0 && (
                        <div className="space-y-1.5">
                            <button
                                onClick={() => setExpandedAlerts(!expandedAlerts)}
                                className="flex items-center justify-between w-full text-xs font-medium text-gray-500 hover:text-gray-700 px-1"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                    {language === 'ar' ? `تنبيهات ذكية (${alerts.length})` : `Smart Alerts (${alerts.length})`}
                                </span>
                                {expandedAlerts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            {expandedAlerts && alerts.map((alert, idx) => {
                                const AlertIcon = alert.icon;
                                const bgColors = {
                                    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30',
                                    opportunity: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30',
                                    info: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/30',
                                    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30',
                                };
                                const iconColors = {
                                    warning: 'text-amber-500',
                                    opportunity: 'text-blue-500',
                                    info: 'text-gray-500',
                                    success: 'text-emerald-500',
                                };
                                return (
                                    <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg border ${bgColors[alert.type]}`}>
                                        <AlertIcon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColors[alert.type]}`} />
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                                {language === 'ar' ? alert.title_ar : alert.title_en}
                                            </p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                {language === 'ar' ? alert.description_ar : alert.description_en}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ─── Quick Stats Grid ─── */}
                    <div className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
                        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {language === 'ar' ? 'إحصائيات إضافية' : 'Additional Stats'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <span className="text-[11px] text-gray-500">{language === 'ar' ? 'حد الائتمان' : 'Credit Limit'}</span>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {insight.creditLimit > 0 ? insight.creditLimit.toLocaleString() : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <span className="text-[11px] text-gray-500">{language === 'ar' ? 'المستحق' : 'Outstanding'}</span>
                                <span className={`text-xs font-semibold ${insight.outstandingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {insight.outstandingBalance.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <span className="text-[11px] text-gray-500">{language === 'ar' ? 'أيام السداد' : 'Payment Days'}</span>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{insight.avgPaymentDays}</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                                <span className="text-[11px] text-gray-500">{language === 'ar' ? 'نسبة المرتجعات' : 'Return Rate'}</span>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{insight.returnRate}%</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Quick Action: Go to Chat ─── */}
                    <button
                        onClick={() => setActiveSection('chat')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl text-xs font-medium transition-all shadow-sm"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'محادثة وكيل نيكسا عن هذا العميل' : 'Chat with NexaAgent about this customer'}
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* SECTION: Chat                           */}
            {/* ═══════════════════════════════════════ */}
            {activeSection === 'chat' && (
                <div className="flex flex-col flex-1 min-h-0">

                    {/* ─── Chat Messages ─── */}
                    <div className="flex-1 overflow-auto space-y-3 pb-2 pr-1">
                        {chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}>
                                <div className={`max-w-[85%] ${msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-2xl rounded-br-sm px-3 py-2'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm px-3 py-2'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Bot className="w-3 h-3 text-violet-500" />
                                            <span className="text-[10px] font-semibold text-violet-500">NexaAgent</span>
                                        </div>
                                    )}
                                    <div className="text-xs leading-relaxed whitespace-pre-line">
                                        {msg.content.split('**').map((part, i) =>
                                            i % 2 === 1
                                                ? <strong key={i}>{part}</strong>
                                                : <span key={i}>{part}</span>
                                        )}
                                    </div>
                                    {msg.role === 'assistant' && msg.id !== 'welcome' && (
                                        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-gray-200/30 dark:border-gray-700/30">
                                            <button
                                                onClick={() => handleFeedback(msg.id, 'positive')}
                                                className={`p-0.5 rounded transition-colors ${msg.feedback === 'positive' ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}`}
                                            >
                                                <ThumbsUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleFeedback(msg.id, 'negative')}
                                                className={`p-0.5 rounded transition-colors ${msg.feedback === 'negative' ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                                            >
                                                <ThumbsDown className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* ─── Quick Suggestions ─── */}
                    {chatMessages.length <= 2 && (
                        <div className="flex flex-wrap gap-1.5 py-2">
                            {(language === 'ar' ? CHAT_SUGGESTIONS.ar : CHAT_SUGGESTIONS.en).slice(0, 4).map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setChatInput(suggestion);
                                        inputRef.current?.focus();
                                    }}
                                    className="px-2.5 py-1 text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 rounded-full border border-violet-200 dark:border-violet-800/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ─── Chat Input ─── */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={language === 'ar' ? 'اسأل وكيل نيكسا عن هذا العميل...' : 'Ask NexaAgent about this customer...'}
                                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                dir={isRTL ? 'rtl' : 'ltr'}
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || isSending}
                            className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-700 rounded-xl"
                        >
                            {isSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Send className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NexaAgentTab;

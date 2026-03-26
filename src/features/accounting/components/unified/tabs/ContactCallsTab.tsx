/**
 * ContactCallsTab — تبويب المكالمات
 * 
 * ✅ عرض سجل المكالمات الخاصة بجهة الاتصال
 * ✅ مرتبط بـ call_logs و contact_interactions (call type)
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Clock, CheckCircle, XCircle, Voicemail, ArrowRightLeft,
} from 'lucide-react';
import { contactsService, type ContactInteraction } from '@/services/contactsService';

interface ContactCallsTabProps {
    data: any;
    mode: string;
}

const OUTCOME_CONFIG: Record<string, { icon: React.ElementType; color: string; labelAr: string; labelEn: string }> = {
    answered: { icon: CheckCircle, color: 'text-green-600', labelAr: 'تم الرد', labelEn: 'Answered' },
    successful: { icon: CheckCircle, color: 'text-green-600', labelAr: 'ناجحة', labelEn: 'Successful' },
    missed: { icon: PhoneMissed, color: 'text-red-500', labelAr: 'فائتة', labelEn: 'Missed' },
    no_answer: { icon: XCircle, color: 'text-red-400', labelAr: 'لا رد', labelEn: 'No Answer' },
    voicemail: { icon: Voicemail, color: 'text-amber-500', labelAr: 'بريد صوتي', labelEn: 'Voicemail' },
    busy: { icon: Phone, color: 'text-orange-500', labelAr: 'مشغول', labelEn: 'Busy' },
    callback_requested: { icon: Clock, color: 'text-blue-500', labelAr: 'طلب معاودة', labelEn: 'Callback' },
    follow_up_needed: { icon: Clock, color: 'text-purple-500', labelAr: 'متابعة مطلوبة', labelEn: 'Follow-up' },
    completed: { icon: CheckCircle, color: 'text-emerald-600', labelAr: 'مكتمل', labelEn: 'Completed' },
};

export function ContactCallsTab({ data }: ContactCallsTabProps) {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const contactId = data?.id;

    const [calls, setCalls] = useState<ContactInteraction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (contactId) {
            setLoading(true);
            contactsService.getInteractions(contactId, 'call')
                .then(setCalls)
                .catch(err => console.error('Failed to load calls:', err))
                .finally(() => setLoading(false));
        }
    }, [contactId]);

    // Stats
    const totalCalls = calls.length;
    const inboundCalls = calls.filter(c => c.direction === 'inbound').length;
    const outboundCalls = calls.filter(c => c.direction === 'outbound').length;
    const missedCalls = calls.filter(c => c.outcome === 'missed' || c.outcome === 'no_answer').length;
    const avgDuration = totalCalls > 0
        ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls)
        : 0;

    const statCards = [
        { label: isRTL ? 'إجمالي المكالمات' : 'Total Calls', value: totalCalls, icon: Phone, color: 'text-indigo-600 bg-indigo-50' },
        { label: isRTL ? 'واردة' : 'Inbound', value: inboundCalls, icon: PhoneIncoming, color: 'text-green-600 bg-green-50' },
        { label: isRTL ? 'صادرة' : 'Outbound', value: outboundCalls, icon: PhoneOutgoing, color: 'text-blue-600 bg-blue-50' },
        { label: isRTL ? 'فائتة' : 'Missed', value: missedCalls, icon: PhoneMissed, color: 'text-red-500 bg-red-50' },
    ];

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i} className="border-0 shadow-sm">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white">{stat.value}</p>
                                    <p className="text-[11px] text-gray-400">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Average Duration */}
            {avgDuration > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {isRTL ? 'متوسط مدة المكالمة:' : 'Average call duration:'}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {Math.floor(avgDuration / 60)}:{String(avgDuration % 60).padStart(2, '0')}
                    </span>
                </div>
            )}

            {/* Calls List */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                    <Clock className="w-5 h-5 animate-spin me-2" />
                    {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
                </div>
            ) : calls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Phone className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">{isRTL ? 'لا توجد مكالمات مسجلة' : 'No calls recorded'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {calls.map(call => {
                        const date = new Date(call.created_at);
                        const outcomeCfg = call.outcome ? OUTCOME_CONFIG[call.outcome] : null;
                        const OutcomeIcon = outcomeCfg?.icon || CheckCircle;
                        const isInbound = call.direction === 'inbound';
                        const DirIcon = isInbound ? PhoneIncoming : PhoneOutgoing;

                        return (
                            <Card key={call.id} className="border shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-3">
                                        {/* Direction icon */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isInbound ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            <DirIcon className="w-5 h-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {isInbound
                                                        ? (isRTL ? 'مكالمة واردة' : 'Inbound Call')
                                                        : (isRTL ? 'مكالمة صادرة' : 'Outbound Call')
                                                    }
                                                </span>
                                                {outcomeCfg && (
                                                    <Badge variant="outline" className={`text-[10px] gap-0.5 ${outcomeCfg.color}`}>
                                                        <OutcomeIcon className="w-2.5 h-2.5" />
                                                        {isRTL ? outcomeCfg.labelAr : outcomeCfg.labelEn}
                                                    </Badge>
                                                )}
                                            </div>
                                            {call.subject && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{call.subject}</p>
                                            )}
                                            {call.content && (
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{call.content}</p>
                                            )}
                                        </div>

                                        {/* Meta */}
                                        <div className="text-end shrink-0">
                                            <p className="text-[11px] text-gray-400">
                                                {date.toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                {date.toLocaleTimeString(isRTL ? 'ar-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {call.duration_seconds && call.duration_seconds > 0 && (
                                                <p className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1 justify-end">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ContactCallsTab;

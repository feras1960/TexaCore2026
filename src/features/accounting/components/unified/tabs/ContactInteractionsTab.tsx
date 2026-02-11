/**
 * ContactInteractionsTab — تبويب التفاعلات
 * 
 * ✅ عرض سجل التفاعلات (مكالمات، إيميلات، ملاحظات، اجتماعات)
 * ✅ إضافة تفاعل جديد
 * ✅ Timeline احترافي
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Phone, Mail, MessageSquare, Calendar, StickyNote,
    Plus, Send, Clock, CheckCircle, XCircle, AlertCircle,
    PhoneIncoming, PhoneOutgoing, Users as UsersIcon,
} from 'lucide-react';
import { contactsService, type ContactInteraction } from '@/services/contactsService';
import { toast } from 'sonner';

interface ContactInteractionsTabProps {
    data: any;
    mode: string;
    onChange?: (updates: any) => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: StickyNote,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    telegram: MessageSquare,
    visit: UsersIcon,
    task: CheckCircle,
    status_change: AlertCircle,
    assignment_change: UsersIcon,
};

const TYPE_COLORS: Record<string, string> = {
    call: 'bg-green-100 text-green-700 dark:bg-green-900/30',
    email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
    meeting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
    note: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
    sms: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30',
    whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
    telegram: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30',
    visit: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30',
    task: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30',
    status_change: 'bg-gray-100 text-gray-700 dark:bg-gray-800',
    assignment_change: 'bg-gray-100 text-gray-700 dark:bg-gray-800',
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
    call: { ar: 'مكالمة', en: 'Call' },
    email: { ar: 'بريد', en: 'Email' },
    meeting: { ar: 'اجتماع', en: 'Meeting' },
    note: { ar: 'ملاحظة', en: 'Note' },
    sms: { ar: 'رسالة', en: 'SMS' },
    whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    telegram: { ar: 'تلغرام', en: 'Telegram' },
    visit: { ar: 'زيارة', en: 'Visit' },
    task: { ar: 'مهمة', en: 'Task' },
    status_change: { ar: 'تغيير حالة', en: 'Status Change' },
    assignment_change: { ar: 'تغيير مسؤول', en: 'Assignment Change' },
};

const OUTCOME_ICONS: Record<string, React.ElementType> = {
    answered: CheckCircle,
    successful: CheckCircle,
    completed: CheckCircle,
    missed: XCircle,
    no_answer: XCircle,
    follow_up_needed: Clock,
    callback_requested: Clock,
};

export function ContactInteractionsTab({ data }: ContactInteractionsTabProps) {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const contactId = data?.id;

    const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // New interaction form
    const [newType, setNewType] = useState('note');
    const [newSubject, setNewSubject] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newDirection, setNewDirection] = useState<'inbound' | 'outbound'>('outbound');
    const [newOutcome, setNewOutcome] = useState('');
    const [adding, setAdding] = useState(false);

    // Fetch interactions
    useEffect(() => {
        if (contactId) {
            setLoading(true);
            contactsService.getInteractions(contactId)
                .then(setInteractions)
                .catch(err => console.error('Failed to load interactions:', err))
                .finally(() => setLoading(false));
        }
    }, [contactId]);

    const handleAddInteraction = async () => {
        if (!newContent && !newSubject) {
            toast.error(isRTL ? 'أدخل محتوى التفاعل' : 'Enter interaction content');
            return;
        }
        setAdding(true);
        try {
            const result = await contactsService.addInteraction({
                tenant_id: data.tenant_id,
                contact_id: contactId,
                interaction_type: newType,
                direction: ['call', 'email', 'sms'].includes(newType) ? newDirection : undefined,
                subject: newSubject || undefined,
                content: newContent,
                outcome: newOutcome || undefined,
            });
            setInteractions(prev => [result, ...prev]);
            setNewSubject('');
            setNewContent('');
            setNewOutcome('');
            setShowAddForm(false);
            toast.success(isRTL ? 'تم إضافة التفاعل' : 'Interaction added');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {isRTL ? 'سجل التفاعلات' : 'Interaction Log'}
                    <Badge variant="secondary" className="ms-2 text-xs">{interactions.length}</Badge>
                </h3>
                {contactId && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)} className="gap-1 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        {isRTL ? 'إضافة تفاعل' : 'Add Interaction'}
                    </Button>
                )}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="border-indigo-200 dark:border-indigo-800">
                    <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Select value={newType} onValueChange={setNewType}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['note', 'call', 'email', 'meeting', 'whatsapp', 'telegram', 'sms', 'visit', 'task'].map(t => (
                                        <SelectItem key={t} value={t} className="text-xs">
                                            {isRTL ? TYPE_LABELS[t]?.ar : TYPE_LABELS[t]?.en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {['call', 'email', 'sms'].includes(newType) && (
                                <Select value={newDirection} onValueChange={v => setNewDirection(v as any)}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound" className="text-xs">{isRTL ? 'وارد' : 'Inbound'}</SelectItem>
                                        <SelectItem value="outbound" className="text-xs">{isRTL ? 'صادر' : 'Outbound'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder={isRTL ? 'الموضوع (اختياري)' : 'Subject (optional)'} className="h-9 text-sm" />
                        <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder={isRTL ? 'تفاصيل التفاعل...' : 'Interaction details...'} className="text-sm min-h-[80px]" rows={3} />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs">{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                            <Button size="sm" onClick={handleAddInteraction} disabled={adding} className="bg-indigo-600 text-white gap-1 text-xs">
                                <Send className="w-3.5 h-3.5" />
                                {adding ? (isRTL ? 'جارٍ...' : 'Adding...') : (isRTL ? 'إضافة' : 'Add')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Timeline */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                    <Clock className="w-5 h-5 animate-spin me-2" /> {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
                </div>
            ) : interactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">{isRTL ? 'لا توجد تفاعلات بعد' : 'No interactions yet'}</p>
                </div>
            ) : (
                <div className="relative space-y-0">
                    {/* Timeline line */}
                    <div className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-6 bottom-6 w-px bg-gray-200 dark:bg-gray-700`} />

                    {interactions.map((interaction, idx) => {
                        const Icon = TYPE_ICONS[interaction.interaction_type] || MessageSquare;
                        const colorClass = TYPE_COLORS[interaction.interaction_type] || 'bg-gray-100 text-gray-600';
                        const typeLabel = TYPE_LABELS[interaction.interaction_type];
                        const OutcomeIcon = interaction.outcome ? OUTCOME_ICONS[interaction.outcome] : null;
                        const date = new Date(interaction.created_at);

                        return (
                            <div key={interaction.id} className="flex gap-3 py-3 relative">
                                {/* Icon dot */}
                                <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0 z-10`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                            {typeLabel ? (isRTL ? typeLabel.ar : typeLabel.en) : interaction.interaction_type}
                                        </span>
                                        {interaction.direction && (
                                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                                                {interaction.direction === 'inbound'
                                                    ? <><PhoneIncoming className="w-2.5 h-2.5" /> {isRTL ? 'وارد' : 'In'}</>
                                                    : <><PhoneOutgoing className="w-2.5 h-2.5" /> {isRTL ? 'صادر' : 'Out'}</>
                                                }
                                            </Badge>
                                        )}
                                        {OutcomeIcon && (
                                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                                                <OutcomeIcon className="w-2.5 h-2.5" />
                                                {interaction.outcome}
                                            </Badge>
                                        )}
                                        <span className="text-[11px] text-gray-400 ms-auto">
                                            {date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                            {' '}
                                            {date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {interaction.subject && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">
                                            {interaction.subject}
                                        </p>
                                    )}
                                    {interaction.content && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-3 whitespace-pre-wrap">
                                            {interaction.content}
                                        </p>
                                    )}
                                    {interaction.duration_seconds && interaction.duration_seconds > 0 && (
                                        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {Math.floor(interaction.duration_seconds / 60)}:{String(interaction.duration_seconds % 60).padStart(2, '0')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ContactInteractionsTab;

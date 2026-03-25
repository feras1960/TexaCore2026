/**
 * ════════════════════════════════════════════════════════════════
 * ⏱ RemittanceTimelineTab — التتبع والحالة
 * ════════════════════════════════════════════════════════════════
 * 
 * يعرض:
 *   - شريط تقدم مرئي (5 نقاط)
 *   - سجل أحداث (Timeline) من remittance_tracking (حقيقي)
 *   - سجل إشعارات مع القنوات المُستخدمة
 *   - إجراءات: تغيير الحالة + إضافة ملاحظة
 * 
 * ════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Remittance } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Clock, CheckCircle2, ArrowRight, Send, Package,
  CircleDot, XCircle, RotateCcw,
  MessageSquare, User, Calendar, Plus, Loader2,
  Bell, Smartphone, Bot,
} from 'lucide-react';

// ─── Status Config ────────────────────────────────────────────
interface StatusStep {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'pending',    labelAr: 'استلام',   labelEn: 'Received',   icon: CircleDot,    color: 'text-amber-500' },
  { key: 'processing', labelAr: 'معالجة',   labelEn: 'Processing', icon: Clock,         color: 'text-blue-500' },
  { key: 'sent',       labelAr: 'إرسال',    labelEn: 'Sent',       icon: Send,          color: 'text-indigo-500' },
  { key: 'delivered',  labelAr: 'تسليم',    labelEn: 'Delivered',  icon: Package,       color: 'text-teal-500' },
  { key: 'completed',  labelAr: 'إتمام',    labelEn: 'Completed',  icon: CheckCircle2,  color: 'text-green-500' },
];

const TERMINAL_STATUSES: StatusStep[] = [
  { key: 'cancelled', labelAr: 'ملغاة',  labelEn: 'Cancelled', icon: XCircle,      color: 'text-red-500' },
  { key: 'returned',  labelAr: 'مرتجعة', labelEn: 'Returned',  icon: RotateCcw,    color: 'text-orange-500' },
];

// ─── Timeline Event Type ──────────────────────────────────────
interface TimelineEvent {
  id: string;
  timestamp: string;
  action_ar: string;
  action_en: string;
  user_name?: string;
  type: 'status' | 'note' | 'notification' | 'system';
  status?: string;
  details?: string;
}

// ─── Status label mapping ─────────────────────────────────────
const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  pending: { ar: 'بانتظار', en: 'Pending' },
  processing: { ar: 'معالجة', en: 'Processing' },
  sent: { ar: 'تم الإرسال', en: 'Sent' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغى', en: 'Cancelled' },
  returned: { ar: 'مُرتجع', en: 'Returned' },
  notification: { ar: 'إشعار', en: 'Notification' },
};

// ─── Props ────────────────────────────────────────────────────
interface RemittanceTimelineTabProps {
  remittance: Partial<Remittance>;
  mode: 'create' | 'view';
  onStatusChange?: (newStatus: string) => void;
}

// ═══════════════════════════════════════════════════════════════
export default function RemittanceTimelineTab({ remittance, mode, onStatusChange }: RemittanceTimelineTabProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const isCreate = mode === 'create';
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // ─── Current Status Index ──────────────────────────────────
  const currentStepIndex = useMemo(() => {
    const idx = STATUS_STEPS.findIndex(s => s.key === remittance.status);
    return idx >= 0 ? idx : 0;
  }, [remittance.status]);

  const isTerminal = ['cancelled', 'returned'].includes(remittance.status || '');
  const terminalStatus = TERMINAL_STATUSES.find(s => s.key === remittance.status);

  // ─── Load Real Events from remittance_tracking ────────────
  useEffect(() => {
    if (!remittance.id || isCreate) return;
    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .from('remittance_tracking')
          .select('*, user_profiles:updated_by(full_name)')
          .eq('remittance_id', remittance.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setTrackingEvents(data);
        }
      } catch (e) {
        console.warn('[Timeline] Failed to load tracking:', e);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [remittance.id, remittance.status, isCreate]);

  // ─── Convert tracking records → timeline events ───────────
  const events: TimelineEvent[] = useMemo(() => {
    if (isCreate) return [];

    // Start with creation event
    const baseEvents: TimelineEvent[] = [{
      id: 'created',
      timestamp: remittance.created_at || new Date().toISOString(),
      action_ar: 'تم إنشاء الحوالة',
      action_en: 'Remittance created',
      type: 'status',
      status: 'pending',
    }];

    // Add real tracking events
    trackingEvents.forEach((te, idx) => {
      const userName = (te.user_profiles as any)?.full_name || undefined;
      const isNotification = te.status === 'notification';

      if (isNotification) {
        baseEvents.push({
          id: `track-${idx}`,
          timestamp: te.created_at,
          action_ar: '🔔 إشعار أُرسل',
          action_en: '🔔 Notification sent',
          user_name: userName,
          type: 'notification',
          details: te.notes || '',
        });
      } else if (te.status === 'note') {
        baseEvents.push({
          id: `track-${idx}`,
          timestamp: te.created_at,
          action_ar: '📝 ملاحظة',
          action_en: '📝 Note',
          user_name: userName,
          type: 'note',
          details: te.notes || '',
        });
      } else {
        const sl = STATUS_LABELS[te.status] || { ar: te.status, en: te.status };
        baseEvents.push({
          id: `track-${idx}`,
          timestamp: te.created_at,
          action_ar: `تغيير الحالة إلى: ${sl.ar}`,
          action_en: `Status changed to: ${sl.en}`,
          user_name: userName,
          type: 'status',
          status: te.status,
          details: te.notes || undefined,
        });
      }
    });

    return baseEvents;
  }, [remittance, trackingEvents, isCreate]);

  // ─── Add Note ─────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!noteText.trim() || !remittance.id) return;
    setSavingNote(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('remittance_tracking').insert([{
        remittance_id: remittance.id,
        status: 'note',
        notes: noteText.trim(),
        updated_by: userData?.user?.id,
      }]);
      setNoteText('');
      setShowAddNote(false);
      // Reload events
      const { data } = await supabase
        .from('remittance_tracking')
        .select('*, user_profiles:updated_by(full_name)')
        .eq('remittance_id', remittance.id)
        .order('created_at', { ascending: true });
      if (data) setTrackingEvents(data);
    } catch (e: any) {
      console.error('[Timeline] Add note failed:', e);
    } finally {
      setSavingNote(false);
    }
  };

  // ─── Format Time ───────────────────────────────────────────
  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        hour: '2-digit', minute: '2-digit',
        day: '2-digit', month: 'short',
      });
    } catch { return '—'; }
  };

  // ─── Get Status Color ──────────────────────────────────────
  const getStatusColor = (status: string) => {
    const s = [...STATUS_STEPS, ...TERMINAL_STATUSES].find(st => st.key === status);
    return s?.color || 'text-gray-500';
  };

  const getStatusBg = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 dark:bg-amber-900/40',
      processing: 'bg-blue-100 dark:bg-blue-900/40',
      sent: 'bg-indigo-100 dark:bg-indigo-900/40',
      delivered: 'bg-teal-100 dark:bg-teal-900/40',
      completed: 'bg-green-100 dark:bg-green-900/40',
      cancelled: 'bg-red-100 dark:bg-red-900/40',
      returned: 'bg-orange-100 dark:bg-orange-900/40',
    };
    return map[status] || 'bg-gray-100 dark:bg-gray-800';
  };

  // ─── Get event icon ────────────────────────────────────────
  const getEventIcon = (event: TimelineEvent) => {
    if (event.type === 'notification') return <Bell className="w-3 h-3 text-violet-500" />;
    if (event.type === 'note') return <MessageSquare className="w-3 h-3 text-gray-400" />;
    const statusStep = [...STATUS_STEPS, ...TERMINAL_STATUSES].find(s => s.key === event.status);
    if (statusStep) return <statusStep.icon className={cn("w-3 h-3", statusStep.color)} />;
    return <CircleDot className="w-3 h-3 text-gray-400" />;
  };

  const getEventBgColor = (event: TimelineEvent) => {
    if (event.type === 'notification') return 'bg-violet-100 dark:bg-violet-900/40';
    if (event.type === 'note') return 'bg-gray-100 dark:bg-gray-800';
    return getStatusBg(event.status || '');
  };

  // ─── Parse notification details ────────────────────────────
  const renderNotificationDetails = (details: string) => {
    const lines = details.split('\n').filter(Boolean);
    return (
      <div className="mt-1 space-y-0.5">
        {lines.map((line, i) => {
          // Check for channel icons
          const hasWhatsApp = line.includes('whatsapp');
          const hasTelegram = line.includes('telegram');
          const isSuccess = line.startsWith('📤');
          const isFail = line.startsWith('❌');

          return (
            <div key={i} className="flex items-center gap-1.5">
              {isSuccess && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
              {isFail && <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
              {hasWhatsApp && <Smartphone className="w-3 h-3 text-green-600 shrink-0" />}
              {hasTelegram && <Bot className="w-3 h-3 text-blue-500 shrink-0" />}
              <span className={cn(
                "text-[10px]",
                isSuccess ? "text-green-700 dark:text-green-400" : isFail ? "text-red-600" : "text-gray-600"
              )}>
                {line.replace(/^(📤|❌)\s*/, '')}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 space-y-4">

      {/* ─── Progress Bar ─────────────────────────────────── */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            {isAr ? 'مراحل الحوالة' : 'Remittance Stages'}
          </h4>
        </div>
        <CardContent className="py-6 px-5">
          {!isTerminal ? (
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <React.Fragment key={step.key}>
                    {idx > 0 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-1 rounded-full transition-colors duration-500",
                        idx <= currentStepIndex ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                      )} />
                    )}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                        isCurrent && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900",
                        isCompleted
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      )}>
                        {isCompleted ? (
                          idx < currentStepIndex
                            ? <CheckCircle2 className="w-5 h-5" />
                            : <StepIcon className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium",
                        isCompleted ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
                      )}>
                        {isAr ? step.labelAr : step.labelEn}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            // Terminal status (cancelled/returned)
            <div className="flex items-center justify-center gap-3 py-4">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", getStatusBg(remittance.status || ''))}>
                {terminalStatus && <terminalStatus.icon className={cn("w-6 h-6", terminalStatus.color)} />}
              </div>
              <div>
                <p className={cn("text-lg font-bold", terminalStatus?.color)}>
                  {isAr ? terminalStatus?.labelAr : terminalStatus?.labelEn}
                </p>
                <p className="text-xs text-gray-500">
                  {isAr ? 'لا يمكن متابعة هذه الحوالة' : 'This remittance cannot continue'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Timeline Events ──────────────────────────────── */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            {isAr ? 'سجل الأحداث والإشعارات' : 'Events & Notifications Log'}
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {events.length} {isAr ? 'حدث' : 'events'}
          </Badge>
        </div>
        <CardContent className="py-4 px-5">
          {loadingEvents ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            </div>
          ) : events.length > 0 ? (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute start-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative flex gap-4 items-start ps-10">
                    {/* Dot */}
                    <div className={cn(
                      "absolute start-2 top-1 w-5 h-5 rounded-full flex items-center justify-center z-10",
                      getEventBgColor(event)
                    )}>
                      {getEventIcon(event)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {isAr ? event.action_ar : event.action_en}
                        </span>
                        {event.status && event.type === 'status' && (
                          <Badge className={cn("text-[9px] py-0", getStatusBg(event.status), getStatusColor(event.status))}>
                            {isAr
                              ? (STATUS_LABELS[event.status]?.ar || event.status)
                              : (STATUS_LABELS[event.status]?.en || event.status)}
                          </Badge>
                        )}
                        {event.type === 'notification' && (
                          <Badge className="text-[9px] py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                            {isAr ? '📤 إشعار' : '📤 Notification'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtTime(event.timestamp)}
                        </span>
                        {event.user_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {event.user_name}
                          </span>
                        )}
                      </div>
                      {/* Notification details with channel icons */}
                      {event.type === 'notification' && event.details && renderNotificationDetails(event.details)}
                      {/* Regular details */}
                      {event.type !== 'notification' && event.details && (
                        <p className="text-[10px] text-gray-500 mt-1 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">{event.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{isAr ? 'لا توجد أحداث بعد' : 'No events yet'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Actions ──────────────────────────────────────── */}
      {!isCreate && !isTerminal && (
        <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              {isAr ? 'إجراءات' : 'Actions'}
            </h4>
          </div>
          <CardContent className="py-4 px-5 space-y-3">
            {/* Status change buttons */}
            <div className="flex flex-wrap gap-2">
              {currentStepIndex < STATUS_STEPS.length - 1 && (
                <Button
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => onStatusChange?.(STATUS_STEPS[currentStepIndex + 1].key)}
                >
                  <ArrowRight className="w-3.5 h-3.5 me-1" />
                  {isAr ? `التقدم إلى: ${STATUS_STEPS[currentStepIndex + 1].labelAr}` : `Advance to: ${STATUS_STEPS[currentStepIndex + 1].labelEn}`}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onStatusChange?.('cancelled')}
              >
                <XCircle className="w-3.5 h-3.5 me-1" />
                {isAr ? 'إلغاء الحوالة' : 'Cancel Remittance'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => onStatusChange?.('returned')}
              >
                <RotateCcw className="w-3.5 h-3.5 me-1" />
                {isAr ? 'إرجاع الحوالة' : 'Return Remittance'}
              </Button>
            </div>

            {/* Add note */}
            <div className="border-t pt-3 mt-3">
              {showAddNote ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={isAr ? 'أكتب ملاحظة...' : 'Write a note...'}
                    className="text-xs min-h-[60px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowAddNote(false); setNoteText(''); }}>
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      disabled={!noteText.trim() || savingNote}
                      onClick={handleAddNote}
                    >
                      {savingNote ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : null}
                      {isAr ? 'إضافة ملاحظة' : 'Add Note'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-500"
                  onClick={() => setShowAddNote(true)}
                >
                  <Plus className="w-3.5 h-3.5 me-1" />
                  {isAr ? 'إضافة ملاحظة' : 'Add Note'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Create Mode Info ─────────────────────────────── */}
      {isCreate && (
        <Card className="border-blue-200/50 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {isAr
                ? 'سيبدأ تتبع الحوالة تلقائياً بعد الحفظ'
                : 'Tracking will start automatically after saving'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

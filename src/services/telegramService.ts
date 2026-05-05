/**
 * ════════════════════════════════════════════════════════════════
 * 📱 Telegram Notification Service — خدمة إشعارات Telegram
 * ════════════════════════════════════════════════════════════════
 * Sends notifications to linked Telegram users via Edge Function.
 * Used by workflow triggers, daily reports, and manual notifications.
 */

import { supabase, cloudSupabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────
export interface TelegramNotification {
    chatId: number;
    message: string;
    parseMode?: 'HTML' | 'Markdown';
    replyMarkup?: any; // inline keyboard
}

export interface NotificationTarget {
    type: 'user' | 'role' | 'group' | 'all';
    value?: string; // user_id, role name, or group chat_id
}

export interface WorkflowNotification {
    companyId: string;
    target: NotificationTarget;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    category: 'workflow' | 'payment' | 'stock' | 'report' | 'custom';
    data?: Record<string, any>;
}

// ─── Send notification via Edge Function ────────────────────
export async function sendTelegramNotification(
    companyId: string,
    chatId: number,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await cloudSupabase.functions.invoke('telegram-webhook', {
            body: {
                action: 'send_notification',
                company_id: companyId,
                chat_id: chatId,
                message,
            },
        });

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Send workflow notification to all matching targets ─────
export async function sendWorkflowNotification(
    notification: WorkflowNotification
): Promise<{ sent: number; failed: number }> {
    const { companyId, target, titleAr, bodyAr } = notification;
    let sent = 0;
    let failed = 0;

    try {
        // Get linked users based on target type
        let query = supabase
            .from('telegram_connections')
            .select('telegram_chat_id, user_id, notification_preferences, connection_type')
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (target.type === 'user' && target.value) {
            query = query.eq('user_id', target.value);
        } else if (target.type === 'group') {
            query = query.neq('connection_type', 'private');
        } else if (target.type === 'all') {
            // No additional filter
        }

        const { data: connections } = await query;

        if (!connections || connections.length === 0) {
            return { sent: 0, failed: 0 };
        }

        // Build message
        const message = `📢 <b>${titleAr}</b>\n\n${bodyAr}`;

        // Send to each connection
        for (const conn of connections) {
            // Check notification preferences
            const prefs = conn.notification_preferences || {};
            const categoryKey = notification.category === 'workflow' ? 'workflow_alerts' :
                notification.category === 'payment' ? 'customer_reminders' :
                    notification.category === 'stock' ? 'workflow_alerts' :
                        notification.category === 'report' ? 'daily_report' : 'workflow_alerts';

            if (prefs[categoryKey] === false) {
                continue; // User opted out of this notification type
            }

            const result = await sendTelegramNotification(
                companyId,
                conn.telegram_chat_id,
                message
            );

            if (result.success) sent++;
            else failed++;
        }
    } catch (err) {
        console.error('sendWorkflowNotification error:', err);
    }

    return { sent, failed };
}

// ─── Get pending actions for current company ────────────────
export async function getPendingActions(companyId: string) {
    const { data, error } = await supabase
        .from('pending_actions')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    return { data: data || [], error };
}

// ─── Confirm pending action ─────────────────────────────────
export async function confirmPendingAction(actionId: string) {
    const { error } = await supabase
        .from('pending_actions')
        .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_via: 'web',
        })
        .eq('id', actionId);

    return { success: !error, error: error?.message };
}

// ─── Reject pending action ──────────────────────────────────
export async function rejectPendingAction(actionId: string, reason?: string) {
    const { error } = await supabase
        .from('pending_actions')
        .update({
            status: 'rejected',
            rejection_reason: reason || 'Rejected from web',
        })
        .eq('id', actionId);

    return { success: !error, error: error?.message };
}

// ─── Get today's action summary ─────────────────────────────
export async function getTodayActionsSummary(companyId: string) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
        .from('pending_actions')
        .select('id, action_type, action_data, status, created_at')
        .eq('company_id', companyId)
        .eq('daily_batch_date', today);

    if (!data) return { total: 0, pending: 0, confirmed: 0, rejected: 0, totalAmount: 0 };

    return {
        total: data.length,
        pending: data.filter(a => a.status === 'pending').length,
        confirmed: data.filter(a => a.status === 'confirmed').length,
        rejected: data.filter(a => a.status === 'rejected').length,
        totalAmount: data
            .filter(a => a.status === 'confirmed')
            .reduce((sum, a) => sum + (a.action_data?.amount || 0), 0),
    };
}

/**
 * 🔔 notificationService — In-app notification CRUD
 * 
 * Handles fetching, marking as read, and real-time subscription
 * for user notifications from the `notifications` table.
 */

import { supabase } from '@/lib/supabase';

export interface Notification {
    id: string;
    tenant_id: string;
    user_id: string;
    title: string;
    body: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    source_type: string | null;
    source_id: string | null;
    is_read: boolean;
    read_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

export const notificationService = {
    /**
     * Fetch notifications for the current user
     */
    async getAll(options?: {
        limit?: number;
        unreadOnly?: boolean;
    }): Promise<Notification[]> {
        try {
            const limit = options?.limit ?? 50;

            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (options?.unreadOnly) {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query;
            if (error) {
                console.warn('[notificationService] getAll error:', error);
                return [];
            }
            return (data || []) as Notification[];
        } catch (e) {
            console.warn('[notificationService] getAll fetch exception:', e);
            return [];
        }
    },

    /**
     * Get unread count for the current user
     */
    async getUnreadCount(): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false);

            if (error) {
                console.warn('[notificationService] getUnreadCount error:', error);
                return 0;
            }
            return count ?? 0;
        } catch (e) {
            console.warn('[notificationService] getUnreadCount fetch exception:', e);
            return 0;
        }
    },

    /**
     * Mark specific notifications as read
     */
    async markAsRead(ids: string[]): Promise<number> {
        if (ids.length === 0) return 0;

        const { data, error } = await supabase
            .rpc('fn_mark_notifications_read', {
                notification_ids: ids,
            });

        if (error) {
            console.error('[notificationService] markAsRead error:', error);
            // Fallback: direct update
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in('id', ids);
            if (updateError) {
                console.error('[notificationService] markAsRead fallback error:', updateError);
                return 0;
            }
            return ids.length;
        }
        return data ?? 0;
    },

    /**
     * Mark all unread notifications as read
     */
    async markAllAsRead(): Promise<number> {
        const { data, error } = await supabase
            .rpc('fn_mark_all_notifications_read');

        if (error) {
            console.error('[notificationService] markAllAsRead error:', error);
            // Fallback: direct update
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('is_read', false);
            if (updateError) {
                console.error('[notificationService] markAllAsRead fallback error:', updateError);
                return 0;
            }
            return 0;
        }
        return data ?? 0;
    },

    /**
     * Subscribe to real-time notification inserts for the current user.
     * Returns an unsubscribe function.
     */
    subscribeToNew(
        userId: string,
        onNewNotification: (notification: Notification) => void
    ): () => void {
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onNewNotification(payload.new as Notification);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    },

    /**
     * Delete a notification
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[notificationService] delete error:', error);
        }
    },
};

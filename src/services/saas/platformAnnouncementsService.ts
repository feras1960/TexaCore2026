/**
 * ════════════════════════════════════════════════════════════════
 * 📢 Platform Announcements Service
 * ════════════════════════════════════════════════════════════════
 *
 * CRUD + fetch active announcements for the ticker bar
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────
export interface PlatformAnnouncement {
  id: string;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  announcement_type: 'urgent' | 'maintenance' | 'update' | 'feature' | 'promotion' | 'legal' | 'info';
  priority: number;
  bg_color: string;
  text_color: string;
  icon: string;
  cta_text_ar?: string;
  cta_text_en?: string;
  cta_link?: string;
  target_audience: 'all' | 'trial' | 'paid' | 'expired' | 'specific';
  target_tenant_ids: string[];
  starts_at: string;
  ends_at?: string;
  is_active: boolean;
  is_dismissable: boolean;
  animation_type: 'scroll' | 'static' | 'blink';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreatePlatformAnnouncement = Omit<PlatformAnnouncement, 'id' | 'created_at' | 'updated_at'>;

// ─── Color presets by type ──────────────────────────────────────
export const ANNOUNCEMENT_COLORS: Record<string, { bg: string; text: string }> = {
  urgent:      { bg: '#dc2626', text: '#ffffff' },  // red
  maintenance: { bg: '#d97706', text: '#ffffff' },  // amber
  update:      { bg: '#2563eb', text: '#ffffff' },  // blue
  feature:     { bg: '#059669', text: '#ffffff' },  // emerald
  promotion:   { bg: '#7c3aed', text: '#ffffff' },  // violet
  legal:       { bg: '#475569', text: '#ffffff' },  // slate
  info:        { bg: '#047857', text: '#ffffff' },  // green (default)
};

// ─── Service ───────────────────────────────────────────────────
export const PlatformAnnouncementsService = {

  /**
   * Get all announcements (admin view — includes inactive)
   */
  async getAll(): Promise<PlatformAnnouncement[]> {
    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get active announcements visible to the current user
   * Filters by: is_active, schedule, and not dismissed
   */
  async getActiveForUser(userId: string): Promise<PlatformAnnouncement[]> {
    const now = new Date().toISOString();

    // 1. Get active announcements
    const { data: announcements, error: annError } = await supabase
      .from('platform_announcements')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('priority', { ascending: false });

    if (annError) {
      // Graceful: table might not exist yet or PostgREST cache stale
      console.warn('[PlatformAnnouncements] Fetch error:', annError.message);
      return [];
    }
    if (!announcements?.length) return [];

    // Filter: ends_at check (NULL = no end)
    const validAnnouncements = announcements.filter(a => 
      !a.ends_at || new Date(a.ends_at) > new Date()
    );

    // 2. Get dismissed IDs for this user
    const { data: dismissed } = await supabase
      .from('dismissed_announcements')
      .select('announcement_id')
      .eq('user_id', userId);

    const dismissedIds = new Set((dismissed || []).map(d => d.announcement_id));

    // 3. Filter out dismissed (except non-dismissable)
    return validAnnouncements.filter(a => 
      !a.is_dismissable || !dismissedIds.has(a.id)
    );
  },

  /**
   * Create a new announcement
   */
  async create(announcement: CreatePlatformAnnouncement): Promise<PlatformAnnouncement> {
    const { data, error } = await supabase
      .from('platform_announcements')
      .insert(announcement)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an announcement
   */
  async update(id: string, updates: Partial<PlatformAnnouncement>): Promise<PlatformAnnouncement> {
    const { data, error } = await supabase
      .from('platform_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an announcement
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Toggle active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('platform_announcements')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Dismiss an announcement for a user
   */
  async dismiss(announcementId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('dismissed_announcements')
      .upsert(
        { announcement_id: announcementId, user_id: userId },
        { onConflict: 'user_id,announcement_id' }
      );

    if (error) throw error;
  },
};

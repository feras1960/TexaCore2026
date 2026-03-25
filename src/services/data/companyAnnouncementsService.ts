/**
 * ════════════════════════════════════════════════════════════════
 * 📢 Company Announcements Service (Tenant-Level)
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

export interface CompanyAnnouncement {
  id: string;
  tenant_id: string;
  message_ar: string;
  message_en: string;
  announcement_type: 'urgent' | 'notice' | 'celebration' | 'reminder' | 'info';
  priority: number;
  bg_color: string;
  text_color: string;
  starts_at: string;
  ends_at?: string;
  is_active: boolean;
  is_dismissable: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreateCompanyAnnouncement = Omit<CompanyAnnouncement, 'id' | 'created_at' | 'updated_at'>;

export const COMPANY_ANNOUNCEMENT_TYPES: Record<string, { labelAr: string; labelEn: string; bg: string }> = {
  urgent:      { labelAr: 'عاجل',      labelEn: 'Urgent',      bg: '#dc2626' },
  notice:      { labelAr: 'إشعار',     labelEn: 'Notice',      bg: '#2563eb' },
  celebration: { labelAr: 'احتفال',    labelEn: 'Celebration', bg: '#7c3aed' },
  reminder:    { labelAr: 'تذكير',     labelEn: 'Reminder',    bg: '#d97706' },
  info:        { labelAr: 'معلومات',   labelEn: 'Info',        bg: '#047857' },
};

export const CompanyAnnouncementsService = {

  async getAll(tenantId: string): Promise<CompanyAnnouncement[]> {
    const { data, error } = await supabase
      .from('company_announcements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActive(tenantId: string): Promise<CompanyAnnouncement[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('company_announcements')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .lte('starts_at', now)
      .order('priority', { ascending: false });

    if (error) {
      console.warn('[CompanyAnnouncements] Fetch error:', error.message);
      return [];
    }
    
    return (data || []).filter(a => !a.ends_at || new Date(a.ends_at) > new Date());
  },

  async create(announcement: CreateCompanyAnnouncement): Promise<CompanyAnnouncement> {
    const { data, error } = await supabase
      .from('company_announcements')
      .insert(announcement)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<CompanyAnnouncement>): Promise<CompanyAnnouncement> {
    const { data, error } = await supabase
      .from('company_announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('company_announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('company_announcements')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },
};

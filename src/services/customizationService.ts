/**
 * Customization Service
 * خدمة تخصيصات الشيتات وتفضيلات المستخدم
 */

import { supabase } from '@/lib/supabase';

// Types for sheet customizations
export interface SheetCustomization {
  id: string;
  tenant_id: string | null;
  user_id: string;
  doc_type: string;
  customization_name: string | null;
  layout: Record<string, any>;
  fields: FieldCustomization[];
  visible_tabs: string[];
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldCustomization {
  id: string;
  key: string;
  label_ar: string;
  label_en: string;
  type: string;
  section_id: string;
  visible: boolean;
  required: boolean;
  showOnCard: boolean;
  width: 'full' | 'half' | 'third';
  order: number;
  isSystem: boolean;
}

export interface SectionCustomization {
  id: string;
  title_ar: string;
  title_en: string;
  expanded: boolean;
  visible: boolean;
  order: number;
}

// Types for user preferences
export interface UserPreferences {
  id: string;
  user_id: string;
  tenant_id: string | null;
  interface_mode: 'lite' | 'professional';
  theme: 'light' | 'dark' | 'system';
  language: string;
  sidebar_collapsed: boolean;
  default_view: string | null;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  quick_actions: string[];
  recent_docs: RecentDoc[];
  created_at: string;
  updated_at: string;
}

export interface RecentDoc {
  id: string;
  doc_type: string;
  title: string;
  accessed_at: string;
}

// Service class
class CustomizationService {
  // ==================== SHEET CUSTOMIZATIONS ====================

  async getCustomizations(docType: string, userId: string): Promise<SheetCustomization[]> {
    const { data, error } = await supabase
      .from('sheet_customizations')
      .select('*')
      .eq('doc_type', docType)
      .or(`user_id.eq.${userId},is_shared.eq.true`)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getDefaultCustomization(docType: string, userId: string): Promise<SheetCustomization | null> {
    const { data, error } = await supabase
      .from('sheet_customizations')
      .select('*')
      .eq('doc_type', docType)
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createCustomization(customization: Partial<SheetCustomization>): Promise<SheetCustomization> {
    const { data, error } = await supabase
      .from('sheet_customizations')
      .insert(customization)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCustomization(id: string, updates: Partial<SheetCustomization>): Promise<SheetCustomization> {
    const { data, error } = await supabase
      .from('sheet_customizations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCustomization(id: string): Promise<void> {
    const { error } = await supabase
      .from('sheet_customizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async setDefaultCustomization(id: string, docType: string, userId: string): Promise<void> {
    // Unset current default
    await supabase
      .from('sheet_customizations')
      .update({ is_default: false })
      .eq('doc_type', docType)
      .eq('user_id', userId);

    // Set new default
    const { error } = await supabase
      .from('sheet_customizations')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== USER PREFERENCES ====================

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert(preferences)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async upsertPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferences, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update interface mode
  async setInterfaceMode(userId: string, mode: 'lite' | 'professional'): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, interface_mode: mode }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  // Get interface mode
  async getInterfaceMode(userId: string): Promise<'lite' | 'professional'> {
    const prefs = await this.getPreferences(userId);
    return prefs?.interface_mode || 'professional';
  }

  // Add recent document
  async addRecentDoc(userId: string, doc: Omit<RecentDoc, 'accessed_at'>): Promise<void> {
    const prefs = await this.getPreferences(userId);
    let recentDocs = prefs?.recent_docs || [];

    // Remove if already exists
    recentDocs = recentDocs.filter(d => d.id !== doc.id);

    // Add to beginning
    recentDocs.unshift({
      ...doc,
      accessed_at: new Date().toISOString()
    });

    // Keep only last 20
    recentDocs = recentDocs.slice(0, 20);

    await this.upsertPreferences({
      user_id: userId,
      recent_docs: recentDocs
    });
  }

  // Get recent documents
  async getRecentDocs(userId: string, limit = 10): Promise<RecentDoc[]> {
    const prefs = await this.getPreferences(userId);
    return (prefs?.recent_docs || []).slice(0, limit);
  }

  // Update quick actions
  async setQuickActions(userId: string, actions: string[]): Promise<void> {
    await this.upsertPreferences({
      user_id: userId,
      quick_actions: actions
    });
  }
}

export const customizationService = new CustomizationService();
export default customizationService;

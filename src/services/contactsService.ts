/**
 * contactsService.ts — خدمة جهات الاتصال CRM
 * 
 * CRUD operations + search + filtering + conversion
 * ✅ متوافق مع RLS والعزل متعدد المستأجرين
 */

import { supabase } from '@/lib/supabase';

// === Types ===

export interface Contact {
    id: string;
    tenant_id: string;
    company_id?: string;

    // Names (9 languages)
    first_name?: string;
    last_name?: string;
    name_ar?: string;
    name_en?: string;
    name_ru?: string;
    name_uk?: string;
    name_ro?: string;
    name_pl?: string;
    name_tr?: string;
    name_de?: string;
    name_it?: string;
    display_name?: string;

    // Organization
    organization?: string;
    job_title?: string;

    // Contact Info
    email?: string;
    phone?: string;
    mobile?: string;
    whatsapp?: string;
    telegram_username?: string;
    telegram_chat_id?: number;

    // Address
    country?: string;
    city?: string;
    address?: string;

    // Classification
    source: ContactSource;
    source_details?: Record<string, any>;
    contact_type: ContactType;
    lifecycle_stage: LifecycleStage;
    lost_reason?: string;

    // Priority & Scoring
    priority: 'low' | 'medium' | 'high' | 'urgent';
    lead_score: number;

    // Assignment
    assigned_to?: string;
    assigned_user?: { id: string; full_name: string; avatar_url?: string };

    // Conversion
    converted_customer_id?: string;
    converted_at?: string;
    converted_by?: string;

    // Tracking
    last_interaction_at?: string;
    last_interaction_type?: string;
    interaction_count: number;
    last_call_at?: string;
    total_calls: number;

    // Additional
    tags?: string[];
    notes?: string;
    custom_fields?: Record<string, any>;
    avatar_url?: string;

    // System
    status: 'active' | 'inactive' | 'converted' | 'archived' | 'blacklisted';
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export type ContactSource =
    | 'phone_inbound' | 'phone_outbound'
    | 'google_ads' | 'facebook_ads' | 'instagram_ads'
    | 'website' | 'telegram' | 'online_store'
    | 'referral' | 'walk_in' | 'exhibition'
    | 'whatsapp' | 'email_campaign' | 'manual';

export type ContactType =
    | 'lead' | 'prospect' | 'wholesale_lead' | 'retail_lead'
    | 'partner_lead' | 'existing_contact';

export type LifecycleStage =
    | 'new' | 'contacted' | 'interested' | 'qualified'
    | 'negotiation' | 'converted' | 'lost' | 'archived';

export interface ContactInteraction {
    id: string;
    tenant_id: string;
    contact_id: string;
    interaction_type: string;
    direction?: 'inbound' | 'outbound';
    subject?: string;
    content?: string;
    call_log_id?: string;
    duration_seconds?: number;
    outcome?: string;
    scheduled_at?: string;
    completed_at?: string;
    reminder_at?: string;
    metadata?: Record<string, any>;
    performed_by?: string;
    created_at: string;
}

export interface ContactFilters {
    source?: ContactSource;
    lifecycle_stage?: LifecycleStage;
    contact_type?: ContactType;
    priority?: string;
    status?: string;
    assigned_to?: string;
    search?: string;
}

// === Helper: Get localized name ===
export function getContactName(contact: Contact, language: string): string {
    const langMap: Record<string, keyof Contact> = {
        ar: 'name_ar',
        en: 'name_en',
        ru: 'name_ru',
        uk: 'name_uk',
        ro: 'name_ro',
        pl: 'name_pl',
        tr: 'name_tr',
        de: 'name_de',
        it: 'name_it',
    };

    const nameKey = langMap[language] || 'name_en';
    const localizedName = contact[nameKey] as string | undefined;

    return localizedName
        || contact.display_name
        || contact.name_ar
        || contact.name_en
        || `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        || '—';
}

// === Service ===

export const contactsService = {

    /**
     * Fetch all contacts with optional filters
     */
    async getContacts(companyId: string, filters?: ContactFilters): Promise<Contact[]> {
        let query = supabase
            .from('contacts')
            .select(`
                *,
                assigned_user:user_profiles!assigned_to(id, full_name, avatar_url)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.source) query = query.eq('source', filters.source);
        if (filters?.lifecycle_stage) query = query.eq('lifecycle_stage', filters.lifecycle_stage);
        if (filters?.contact_type) query = query.eq('contact_type', filters.contact_type);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

        if (filters?.search) {
            const s = `%${filters.search}%`;
            query = query.or(
                `name_ar.ilike.${s},name_en.ilike.${s},email.ilike.${s},phone.ilike.${s},mobile.ilike.${s},organization.ilike.${s},display_name.ilike.${s}`
            );
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as Contact[];
    },

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<Contact | null> {
        const { data, error } = await supabase
            .from('contacts')
            .select(`
                *,
                assigned_user:user_profiles!assigned_to(id, full_name, avatar_url)
            `)
            .eq('id', contactId)
            .single();

        if (error) throw error;
        return data as Contact;
    },

    /**
     * Create a new contact
     */
    async createContact(contact: Partial<Contact>): Promise<Contact> {
        // Auto-generate display_name
        const displayName = contact.display_name
            || contact.name_ar
            || contact.name_en
            || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

        const { data, error } = await supabase
            .from('contacts')
            .insert({ ...contact, display_name: displayName })
            .select()
            .single();

        if (error) throw error;
        return data as Contact;
    },

    /**
     * Update a contact
     */
    async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
        const { data, error } = await supabase
            .from('contacts')
            .update(updates)
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;
        return data as Contact;
    },

    /**
     * Delete a contact (soft — change status)
     */
    async archiveContact(contactId: string): Promise<void> {
        const { error } = await supabase
            .from('contacts')
            .update({ status: 'archived', lifecycle_stage: 'archived' })
            .eq('id', contactId);

        if (error) throw error;
    },

    /**
     * Convert contact to customer via RPC
     */
    async convertToCustomer(
        contactId: string,
        options?: { customerCode?: string; customerType?: string; receivableAccountId?: string }
    ): Promise<{ success: boolean; customer_id?: string; customer_code?: string; message: string }> {
        const { data, error } = await supabase
            .rpc('convert_contact_to_customer', {
                p_contact_id: contactId,
                p_customer_code: options?.customerCode || null,
                p_customer_type: options?.customerType || 'individual',
                p_receivable_account_id: options?.receivableAccountId || null,
            });

        if (error) throw error;
        return data;
    },

    // === Interactions ===

    /**
     * Get interactions for a contact
     */
    async getInteractions(contactId: string, interactionType?: string): Promise<ContactInteraction[]> {
        let query = supabase
            .from('contact_interactions')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });

        if (interactionType) {
            query = query.eq('interaction_type', interactionType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as ContactInteraction[];
    },

    /**
     * Add a new interaction
     */
    async addInteraction(interaction: Partial<ContactInteraction>): Promise<ContactInteraction> {
        const { data, error } = await supabase
            .from('contact_interactions')
            .insert(interaction)
            .select()
            .single();

        if (error) throw error;
        return data as ContactInteraction;
    },

    // === Stats ===

    /**
     * Get contact pipeline stats
     */
    async getPipelineStats(companyId: string): Promise<Record<LifecycleStage, number>> {
        const { data, error } = await supabase
            .from('contacts')
            .select('lifecycle_stage')
            .eq('company_id', companyId)
            .neq('status', 'archived');

        if (error) throw error;

        const stats: Record<string, number> = {
            new: 0, contacted: 0, interested: 0, qualified: 0,
            negotiation: 0, converted: 0, lost: 0, archived: 0,
        };

        (data || []).forEach((c: any) => {
            if (stats[c.lifecycle_stage] !== undefined) {
                stats[c.lifecycle_stage]++;
            }
        });

        return stats as Record<LifecycleStage, number>;
    },
};

export default contactsService;

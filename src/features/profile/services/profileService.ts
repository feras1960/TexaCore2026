/**
 * ════════════════════════════════════════════════════════════════
 * 👤 Profile Service — خدمة الملف الشخصي
 * ════════════════════════════════════════════════════════════════
 * CRUD operations for user profile, sessions, security events
 */

import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────

export interface FullUserProfile {
    id: string;
    email: string;
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    role: string;
    company_id?: string;
    branch_id?: string;
    tenant_id?: string;
    phone?: string;
    job_title?: string;
    bio?: string;
    // Preferences
    timezone?: string;
    language_preference?: string;
    theme_preference?: string;
    date_format?: string;
    number_format?: string;
    default_currency?: string;
    // Telegram
    telegram_chat_id?: string;
    telegram_username?: string;
    telegram_verified?: boolean;
    // Security
    two_factor_enabled?: boolean;
    notification_preferences?: Record<string, any>;
    // Activity tracking
    last_login_at?: string;
    last_login_ip?: string;
    last_login_device?: string;
    is_online?: boolean;
    last_active_at?: string;
    current_page?: string;
    // Suspension
    is_active?: boolean;
    is_suspended?: boolean;
    suspended_at?: string;
    suspended_until?: string;
    suspended_reason?: string;
    suspended_by?: string;
    // Meta
    preferences?: any;
    created_at: string;
    updated_at: string;
}

export interface LoginHistoryEntry {
    id: string;
    user_id: string;
    login_at: string;
    logout_at?: string;
    duration_minutes?: number;
    ip_address?: string;
    device_type?: string;
    browser?: string;
    os?: string;
    location_city?: string;
    location_country?: string;
    location_country_code?: string;
    success: boolean;
    failure_reason?: string;
}

export interface ActiveSession {
    id: string;
    user_id: string;
    started_at: string;
    last_active_at: string;
    ip_address?: string;
    device_type?: string;
    browser?: string;
    os?: string;
    location_city?: string;
    location_country?: string;
    current_page?: string;
    is_current: boolean;
}

export interface SecurityEvent {
    id: string;
    user_id: string;
    event_type: string;
    description?: string;
    metadata?: Record<string, any>;
    performed_by?: string;
    ip_address?: string;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser detection
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    // OS detection
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
    else if (ua.includes('iPhone')) { os = 'iOS'; device = 'Mobile'; }
    else if (ua.includes('iPad')) { os = 'iPadOS'; device = 'Tablet'; }

    return { browser, os, device };
}

// IP Geolocation cache
const geoCache: Record<string, { city: string; country: string; countryCode: string }> = {};

export async function geolocateIP(ip: string): Promise<{ city: string; country: string; countryCode: string } | null> {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
    const cleanIp = ip.replace('/32', '').trim();

    // Check cache first
    if (geoCache[cleanIp]) return geoCache[cleanIp];

    try {
        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=city,country,countryCode`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.city) {
            const result = { city: data.city, country: data.country, countryCode: data.countryCode };
            geoCache[cleanIp] = result;
            return result;
        }
    } catch {
        // Silently fail — geo is optional
    }
    return null;
}

// ─── Service ──────────────────────────────────────────────────

export const profileService = {
    // ─── Profile CRUD ─────────────────────────────────────────

    async getCurrentProfile(): Promise<FullUserProfile | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching profile:', error);
            throw error;
        }

        return data;
    },

    async updateProfile(updates: Partial<FullUserProfile>): Promise<FullUserProfile> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        // Filter only allowed fields
        const allowedFields = [
            'full_name', 'display_name', 'phone', 'job_title', 'bio',
            'timezone', 'language_preference', 'theme_preference',
            'date_format', 'number_format', 'default_currency',
            'notification_preferences', 'avatar_url', 'two_factor_enabled',
        ];
        const safeUpdates: Record<string, any> = {};
        for (const key of allowedFields) {
            if (key in updates) {
                safeUpdates[key] = (updates as any)[key];
            }
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .update(safeUpdates)
            .eq('id', session.user.id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        return data;
    },

    // ─── Avatar ───────────────────────────────────────────────

    async uploadAvatar(file: File): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const ext = file.name.split('.').pop();
        const path = `avatars/${session.user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path);

        // Update profile with new avatar URL
        await this.updateProfile({ avatar_url: urlData.publicUrl });

        return urlData.publicUrl;
    },

    async removeAvatar(): Promise<void> {
        await this.updateProfile({ avatar_url: '' } as any);
    },

    // ─── Password ─────────────────────────────────────────────

    async changePassword(newPassword: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;

        // Log security event
        await this.logSecurityEvent('password_changed', 'Password changed by user');
    },

    // ─── Sessions (from auth.sessions via RPC) ─────────────────

    async getActiveSessions(): Promise<ActiveSession[]> {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const currentSessionId = currentSession?.access_token
            ? (currentSession as any)?.id || null
            : null;

        const { data, error } = await supabase.rpc('get_my_active_sessions');
        if (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }
        // Collect unique IPs for geolocation
        const uniqueIps: string[] = [...new Set((data || []).map((s: any) => String(s.ip || '').replace('/32', '')).filter(Boolean))] as string[];
        const geoResults: Record<string, { city: string; country: string; countryCode: string } | null> = {};
        await Promise.all(uniqueIps.map(async (ip: string) => {
            geoResults[ip] = await geolocateIP(ip);
        }));

        return (data || []).map((s: any) => {
            const ua = parseUserAgent(s.user_agent || '');
            const cleanIp = (s.ip || '').replace('/32', '');
            const geo = geoResults[cleanIp];
            return {
                id: s.session_id,
                user_id: currentSession?.user?.id || '',
                started_at: s.created_at,
                last_active_at: s.updated_at,
                ip_address: cleanIp,
                device_type: ua.device,
                browser: ua.browser,
                os: ua.os,
                location_city: geo?.city || null,
                location_country: geo?.country || null,
                location_country_code: geo?.countryCode || null,
                current_page: null,
                is_current: false,
                is_mfa: s.aal === 'aal2',
            };
        });
    },

    async terminateSession(sessionId: string): Promise<void> {
        const { error } = await supabase.rpc('revoke_my_session', { p_session_id: sessionId });
        if (error) throw error;
        await this.logSecurityEvent('session_terminated', `Session ${sessionId} terminated`);
    },

    async terminateAllOtherSessions(): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get current session ID from auth.sessions
        const { data: sessions } = await supabase.rpc('get_my_active_sessions');
        const currentSessionId = sessions?.[0]?.session_id; // Most recent = current

        if (currentSessionId) {
            const { error } = await supabase.rpc('revoke_all_other_sessions', {
                p_current_session_id: currentSessionId
            });
            if (error) throw error;
        }

        await this.logSecurityEvent('all_sessions_terminated', 'All other sessions terminated');
    },

    // ─── Login History (from auth.sessions via RPC) ──────────

    async getLoginHistory(limit = 20): Promise<LoginHistoryEntry[]> {
        const { data, error } = await supabase.rpc('get_my_login_history', { p_limit: limit });
        if (error) {
            console.error('Error fetching login history:', error);
            return [];
        }

        const { data: { session } } = await supabase.auth.getSession();

        // Collect unique IPs for geolocation
        const uniqueIps: string[] = [...new Set((data || []).map((s: any) => String(s.ip || '').replace('/32', '')).filter(Boolean))] as string[];
        const geoResults: Record<string, { city: string; country: string; countryCode: string } | null> = {};
        await Promise.all(uniqueIps.map(async (ip: string) => {
            geoResults[ip] = await geolocateIP(ip);
        }));

        return (data || []).map((s: any) => {
            const ua = parseUserAgent(s.user_agent || '');
            const cleanIp = (s.ip || '').replace('/32', '');
            const geo = geoResults[cleanIp];
            return {
                id: s.session_id,
                user_id: session?.user?.id || '',
                login_at: s.login_at,
                logout_at: null,
                duration_minutes: null,
                ip_address: cleanIp,
                device_type: ua.device,
                browser: ua.browser,
                os: ua.os,
                location_city: geo?.city || null,
                location_country: geo?.country || null,
                location_country_code: geo?.countryCode || null,
                success: true,
                failure_reason: null,
                is_mfa: s.is_mfa,
            };
        });
    },

    // ─── Security Events ─────────────────────────────────────

    async getSecurityEvents(limit = 20): Promise<SecurityEvent[]> {
        const { data, error } = await supabase
            .from('security_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    async logSecurityEvent(eventType: string, description: string, metadata?: Record<string, any>): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const profile = await this.getCurrentProfile();

        await supabase.from('security_events').insert({
            user_id: session.user.id,
            tenant_id: profile?.tenant_id,
            company_id: profile?.company_id,
            event_type: eventType,
            description,
            metadata: metadata || {},
            performed_by: session.user.id,
        });
    },

    // ─── Connected Accounts ───────────────────────────────────

    async getConnectedAccounts() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const identities = user.identities || [];
        return identities.map(id => ({
            provider: id.provider,
            email: id.identity_data?.email,
            created_at: id.created_at,
        }));
    },

    // ─── Email Change ─────────────────────────────────────────

    async changeEmail(newEmail: string): Promise<void> {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;

        await this.logSecurityEvent('email_change_requested', `Email change to ${newEmail} requested`);
    },

    // ─── Admin: Company Users ─────────────────────────────────

    async getCompanyActiveUsers(companyId: string): Promise<FullUserProfile[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('company_id', companyId)
            .order('is_online', { ascending: false })
            .order('last_active_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getCompanyActiveSessions(companyId: string): Promise<ActiveSession[]> {
        const { data, error } = await supabase
            .from('active_sessions')
            .select('*')
            .eq('company_id', companyId)
            .order('last_active_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getCompanyLoginHistory(companyId: string, limit = 50): Promise<LoginHistoryEntry[]> {
        const { data, error } = await supabase
            .from('login_history')
            .select('*')
            .eq('company_id', companyId)
            .order('login_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // Admin: Suspend/Reactivate user
    async suspendUser(userId: string, reason: string, until?: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        const updates: Record<string, any> = {
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspended_reason: reason,
            suspended_by: session.user.id,
        };
        if (until) updates.suspended_until = until;

        const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;

        // Terminate all their sessions
        await supabase.from('active_sessions').delete().eq('user_id', userId);

        await this.logSecurityEvent('user_suspended', `User ${userId} suspended: ${reason}`, { target_user: userId });
    },

    async reactivateUser(userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .update({
                is_suspended: false,
                suspended_at: null,
                suspended_until: null,
                suspended_reason: null,
                suspended_by: null,
            })
            .eq('id', userId);

        if (error) throw error;

        await this.logSecurityEvent('user_reactivated', `User ${userId} reactivated`, { target_user: userId });
    },
};

export default profileService;

/**
 * ════════════════════════════════════════════════════════════════
 * 🔑 Licensing Service — Manages Self-Hosted licenses from SaaS admin
 * ════════════════════════════════════════════════════════════════
 */

import { supabase, cloudSupabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────
export interface LicenseCustomer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  created_at: string;
  licenses?: License[];
}

export interface License {
  id: string;
  license_key: string;
  customer_id: string;
  tier: 'trial' | 'basic' | 'starter' | 'pro' | 'enterprise';
  status: 'pending' | 'active' | 'expired' | 'suspended' | 'revoked';
  max_users: number;
  max_companies: number;
  max_warehouses: number;
  max_storage_gb: number;
  enabled_modules: string[];
  custom_branding: boolean;
  cloud_backup: boolean;
  api_access: boolean;
  hardware_id: string | null;
  stable_fingerprint: string | null;
  subdomain: string | null;
  cloud_tunnel_id: string | null;
  hostname: string | null;
  last_heartbeat_at: string | null;
  app_version: string | null;
  activated_at: string | null;
  expires_at: string;
  transfer_count: number;
  max_transfers: number;
  created_at: string;
  customer?: LicenseCustomer;
  // Joined fields
  customer_name?: string;
  customer_email?: string;
}

export interface LicenseActivation {
  id: string;
  license_id: string;
  hardware_id: string;
  hostname: string;
  os_info: string;
  ip_address: string;
  action: 'activate' | 'transfer' | 'deactivate';
  created_at: string;
}

export interface LicenseHeartbeat {
  id: string;
  license_id: string;
  license_key: string;
  hardware_id: string;
  app_version: string;
  ip_address: string;
  users_active: number;
  companies_count: number;
  invoices_count: number;
  db_size_mb: number;
  storage_used_mb: number;
  cpu_percent: number | null;
  ram_used_gb: number | null;
  ram_total_gb: number | null;
  disk_used_percent: number | null;
  services_status: Record<string, any>;
  errors: any[];
  created_at: string;
}

export interface CloudBackup {
  id: string;
  license_id: string;
  license_key: string;
  file_path: string;
  file_size_mb: number;
  db_size_mb: number;
  companies_count: number;
  invoices_count: number;
  checksum: string | null;
  backup_type: 'auto' | 'manual';
  uploaded_at: string;
}

export interface LicensingStats {
  totalCustomers: number;
  totalLicenses: number;
  activeLicenses: number;
  expiredLicenses: number;
  suspendedLicenses: number;
  trialLicenses: number;
  tierBreakdown: { tier: string; count: number }[];
  recentActivations: LicenseActivation[];
  activeHeartbeats: number;
  onlineNow: number;
  totalBackups: number;
}

// ─── Tier Defaults ───────────────────────────────────────────
export const TIER_DEFAULTS = {
  trial: {
    max_users: 2,
    max_companies: 1,
    max_warehouses: 1,
    max_storage_gb: 1,
    enabled_modules: ['sales', 'purchases'],
    custom_branding: false,
    cloud_backup: false,
    api_access: false,
    duration_days: 30,
  },
  basic: {
    max_users: 3,
    max_companies: 1,
    max_warehouses: 2,
    max_storage_gb: 5,
    enabled_modules: ['sales', 'purchases', 'warehouse'],
    custom_branding: false,
    cloud_backup: false,
    api_access: false,
    duration_days: 365,
  },
  starter: {
    max_users: 5,
    max_companies: 2,
    max_warehouses: 3,
    max_storage_gb: 10,
    enabled_modules: ['sales', 'purchases', 'warehouse', 'accounting'],
    custom_branding: false,
    cloud_backup: false,
    api_access: false,
    duration_days: 365,
  },
  pro: {
    max_users: 15,
    max_companies: 5,
    max_warehouses: 10,
    max_storage_gb: 50,
    enabled_modules: ['sales', 'purchases', 'warehouse', 'accounting', 'ecommerce', 'reports'],
    custom_branding: true,
    cloud_backup: true,
    api_access: true,
    duration_days: 365,
  },
  enterprise: {
    max_users: 999,
    max_companies: 50,
    max_warehouses: 100,
    max_storage_gb: 500,
    enabled_modules: ['sales', 'purchases', 'warehouse', 'accounting', 'ecommerce', 'reports', 'ai', 'api'],
    custom_branding: true,
    cloud_backup: true,
    api_access: true,
    duration_days: 365,
  },
} as const;

// ─── Service ─────────────────────────────────────────────────
export const licensingService = {

  // ─── Dashboard Stats ─────────────────────────────────────
  async getStats(): Promise<LicensingStats> {
    const [customersRes, licensesRes, activationsRes, heartbeatsRes] = await Promise.all([
      supabase.rpc('licensing_get_customers'),
      supabase.rpc('licensing_get_licenses'),
      supabase.rpc('licensing_get_activations', { p_limit: 10 }),
      supabase.rpc('licensing_get_heartbeats', { p_limit: 100 }),
    ]);

    const customers = customersRes.data || [];
    const licenses = licensesRes.data || [];
    const activations = activationsRes.data || [];
    const heartbeats = heartbeatsRes.data || [];

    const now = new Date();
    const active = licenses.filter((l: any) => l.status === 'active');
    const expired = licenses.filter((l: any) => l.status === 'expired' || new Date(l.expires_at) < now);
    const suspended = licenses.filter((l: any) => l.status === 'suspended' || l.status === 'revoked');
    const trial = licenses.filter((l: any) => l.tier === 'trial');

    // Tier breakdown
    const tierMap: Record<string, number> = {};
    licenses.forEach((l: any) => {
      tierMap[l.tier] = (tierMap[l.tier] || 0) + 1;
    });
    const tierBreakdown = Object.entries(tierMap).map(([tier, count]) => ({ tier, count }));

    // Active heartbeats (last 48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const activeHeartbeats = heartbeats.filter(
      (h: any) => new Date(h.created_at) > twoDaysAgo
    ).length;

    // Online now (last 10 minutes heartbeat)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const onlineNow = licenses.filter(
      (l: any) => l.last_heartbeat_at && new Date(l.last_heartbeat_at) > tenMinAgo
    ).length;

    return {
      totalCustomers: customers.length,
      totalLicenses: licenses.length,
      activeLicenses: active.length,
      expiredLicenses: expired.length,
      suspendedLicenses: suspended.length,
      trialLicenses: trial.length,
      tierBreakdown,
      recentActivations: activations,
      activeHeartbeats,
      onlineNow,
      totalBackups: 0, // will be populated when cloud_backups table has data
    };
  },

  // ─── Customers ───────────────────────────────────────────
  async getCustomers(): Promise<LicenseCustomer[]> {
    const { data, error } = await supabase.rpc('licensing_get_customers');
    if (error) throw error;
    return data || [];
  },

  async createCustomer(customer: Omit<LicenseCustomer, 'id' | 'created_at'>): Promise<LicenseCustomer> {
    const { data, error } = await supabase.rpc('licensing_create_customer', {
      p_company_name: customer.company_name,
      p_contact_name: customer.contact_name,
      p_email: customer.email,
      p_phone: customer.phone,
      p_country: customer.country,
    });
    if (error) throw error;
    return data;
  },

  // ─── Licenses ────────────────────────────────────────────
  async getLicenses(): Promise<License[]> {
    const { data, error } = await supabase.rpc('licensing_get_licenses');
    if (error) throw error;
    return data || [];
  },

  async createLicense(params: {
    customer_id: string;
    tier: License['tier'];
    duration_days?: number;
  }): Promise<License> {
    const defaults = TIER_DEFAULTS[params.tier];
    const duration = params.duration_days || defaults.duration_days;

    const { data, error } = await supabase.rpc('licensing_create_license', {
      p_customer_id: params.customer_id,
      p_tier: params.tier,
      p_max_users: defaults.max_users,
      p_max_companies: defaults.max_companies,
      p_max_warehouses: defaults.max_warehouses,
      p_max_storage_gb: defaults.max_storage_gb,
      p_enabled_modules: defaults.enabled_modules,
      p_custom_branding: defaults.custom_branding,
      p_cloud_backup: defaults.cloud_backup,
      p_api_access: defaults.api_access,
      p_duration_days: duration,
      p_max_transfers: 10,
    });
    if (error) throw error;
    return data;
  },

  async updateLicenseStatus(licenseId: string, status: License['status']): Promise<void> {
    const { error } = await supabase.rpc('licensing_update_license_status', {
      p_license_id: licenseId,
      p_status: status,
    });
    if (error) throw error;
  },

  // ─── Activations ─────────────────────────────────────────
  async getActivations(limit = 50): Promise<LicenseActivation[]> {
    const { data, error } = await supabase.rpc('licensing_get_activations', { p_limit: limit });
    if (error) throw error;
    return data || [];
  },

  // ─── Heartbeats ──────────────────────────────────────────
  async getHeartbeats(limit = 100): Promise<LicenseHeartbeat[]> {
    const { data, error } = await supabase.rpc('licensing_get_heartbeats', { p_limit: limit });
    if (error) throw error;
    return data || [];
  },

  // ─── Heartbeats for a specific license ──────────────────
  async getHeartbeatsForLicense(licenseKey: string, limit = 50): Promise<LicenseHeartbeat[]> {
    const { data, error } = await supabase.rpc('licensing_get_heartbeats', { p_limit: limit });
    if (error) throw error;
    return (data || []).filter((h: any) => h.license_key === licenseKey);
  },

  // ─── Cloud Backups ──────────────────────────────────────
  async getCloudBackups(licenseKey: string): Promise<CloudBackup[]> {
    const { data, error } = await supabase.rpc('licensing_get_cloud_backups', {
      p_license_key: licenseKey,
    });
    if (error) {
      // RPC may not exist yet, return empty
      console.warn('Cloud backups RPC not available:', error.message);
      return [];
    }
    return data || [];
  },

  // ─── Download Backup ────────────────────────────────────
  async downloadBackup(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from('license-backups')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    if (error) throw error;
    return data?.signedUrl || null;
  },

  // ─── Connection Status Helper ───────────────────────────
  isOnline(lastHeartbeat: string | null): boolean {
    if (!lastHeartbeat) return false;
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return new Date(lastHeartbeat).getTime() > tenMinAgo;
  },

  // ─── Key Generator ───────────────────────────────────────
  generateLicenseKey(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const part = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `LIC-${new Date().getFullYear()}-${part()}-${part()}`;
  },

  // ─── Upgrade Tier ───────────────────────────────────────
  async upgradeTier(licenseId: string, newTier: License['tier']): Promise<{ success: boolean; old_tier?: string; new_tier?: string; error?: string }> {
    const defaults = TIER_DEFAULTS[newTier];
    if (!defaults) throw new Error('Invalid tier');

    const { data, error } = await supabase.rpc('licensing_upgrade_tier', {
      p_license_id: licenseId,
      p_new_tier: newTier,
      p_max_users: defaults.max_users,
      p_max_companies: defaults.max_companies,
      p_max_warehouses: defaults.max_warehouses,
      p_max_storage_gb: defaults.max_storage_gb,
      p_enabled_modules: defaults.enabled_modules,
      p_custom_branding: defaults.custom_branding,
      p_cloud_backup: defaults.cloud_backup,
      p_api_access: defaults.api_access,
    });
    if (error) throw error;
    return data;
  },

  // ─── Extend License ─────────────────────────────────────
  async extendLicense(licenseId: string, days: number): Promise<{ success: boolean; new_expiry?: string; error?: string }> {
    const { data, error } = await supabase.rpc('licensing_extend', {
      p_license_id: licenseId,
      p_days: days,
    });
    if (error) throw error;
    return data;
  },

  // ─── Send License Key by Email ─────────────────────────
  async sendLicenseEmail(license: License, customerEmail: string, customerName?: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await cloudSupabase.functions.invoke('license-send-email', {
      body: {
        to_email: customerEmail,
        license_key: license.license_key,
        customer_name: customerName || '',
        tier: license.tier,
        expires_at: license.expires_at,
      },
    });
    if (error) throw error;
    return data;
  },
};

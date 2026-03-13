/**
 * Accounts Service
 * Service layer for Chart of Accounts (دليل الحسابات)
 * Updated for Multi-Tenant support with correct table structure
 * Supports 9 languages: Arabic, English, Russian, Ukrainian, Romanian, Polish, Turkish, German, Italian
 */

import { supabase, getCurrentTenantIdAsync } from '@/lib/supabase';

// Supported language codes
export type SupportedLanguage = 'ar' | 'en' | 'ru' | 'uk' | 'ro' | 'pl' | 'tr' | 'de' | 'it';

export interface Account {
  id: string;
  tenant_id: string;
  company_id: string;
  account_code: string;
  // Multi-language name fields (9 languages)
  name_ar: string;        // Arabic العربية
  name_en?: string;       // English
  name_ru?: string;       // Russian Русский
  name_uk?: string;       // Ukrainian Українська
  name_ro?: string;       // Romanian Română
  name_pl?: string;       // Polish Polski
  name_tr?: string;       // Turkish Türkçe
  name_de?: string;       // German Deutsch
  name_it?: string;       // Italian Italiano
  account_type_id: string;
  parent_id?: string;
  is_group: boolean;
  is_detail: boolean;
  level: number;
  full_code?: string;
  currency?: string;
  is_multi_currency: boolean;
  is_bank_account: boolean;
  bank_name?: string;
  bank_account_number?: string;
  is_cash_account: boolean;
  is_receivable: boolean;
  is_payable: boolean;
  opening_balance: number;
  current_balance: number;
  description?: string;
  notes?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Mapped aliases for compatibility with legacy components
  code?: string;
  name?: string;
  currency_code?: string;
  account_type?: string;
  account_type_code?: string; // Code from account_types table (e.g., 'ASSET', 'LIABILITY')
  account_category?: string;
}

export interface CreateAccountInput {
  company_id: string;
  account_code: string;
  name_ar: string;
  name_en?: string;
  name_ru?: string;
  name_uk?: string;
  name_ro?: string;
  name_pl?: string;
  name_tr?: string;
  name_de?: string;
  name_it?: string;
  account_type_id: string;
  parent_id?: string;
  is_group?: boolean;
  level?: number;
  currency?: string;
  description?: string;
  is_cash_account?: boolean;
  is_bank_account?: boolean;
}

/**
 * Get account name based on current language
 * Falls back to English then Arabic if translation not available
 */
export const getAccountName = (account: Account, language: SupportedLanguage): string => {
  const nameMap: Record<SupportedLanguage, string | undefined> = {
    ar: account.name_ar,
    en: account.name_en,
    ru: account.name_ru,
    uk: account.name_uk,
    ro: account.name_ro,
    pl: account.name_pl,
    tr: account.name_tr,
    de: account.name_de,
    it: account.name_it,
  };

  // Return the name for the requested language, or fallback to English, then Arabic
  return nameMap[language] || account.name_en || account.name_ar;
};

// Helper to map database record to Account interface with aliases
const mapAccount = (record: any): Account => ({
  ...record,
  // Ensure numeric fields have default values
  opening_balance: record.opening_balance ?? 0,
  current_balance: record.current_balance ?? 0,
  level: record.level ?? 1,
  // Ensure boolean fields have default values
  is_group: record.is_group ?? false,
  is_detail: record.is_detail ?? true,
  is_multi_currency: record.is_multi_currency ?? false,
  is_bank_account: record.is_bank_account ?? false,
  is_cash_account: record.is_cash_account ?? false,
  is_receivable: record.is_receivable ?? false,
  is_payable: record.is_payable ?? false,
  is_system: record.is_system ?? false,
  is_active: record.is_active ?? true,
  // Multi-language name fields
  name_ar: record.name_ar,
  name_en: record.name_en,
  name_ru: record.name_ru,
  name_uk: record.name_uk,
  name_ro: record.name_ro,
  name_pl: record.name_pl,
  name_tr: record.name_tr,
  name_de: record.name_de,
  name_it: record.name_it,
  // Create aliases for compatibility with existing components
  code: record.account_code,
  name: record.name_ar, // Default to Arabic for backward compatibility
  currency_code: record.currency,
  account_type: record.account_type_id, // For legacy compatibility
  account_type_code: record.account_type_code, // Code from account_types (e.g., 'ASSET', 'LIABILITY')
  account_category: record.description || '',
});

export const accountsService = {
  /**
   * Get all accounts for a company
   * @param companyId - Company ID
   * @param options.includePartyAccounts - Include customer/supplier/container sub-accounts (default: false)
   */
  async getAll(companyId: string, options?: { includePartyAccounts?: boolean }): Promise<Account[]> {
    // Note: No need for tenant_id — company_id + RLS handle isolation.
    // Removed getCurrentTenantIdAsync() which was making an extra network call but never used.

    // Build query with join to account_types to get code
    let query = supabase
      .from('chart_of_accounts')
      .select(`
        *,
        account_types:account_types!account_type_id (
          code,
          name_ar,
          name_en
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    // Hide party sub-accounts from tree view by default
    // But include them when selecting accounts for journal entries
    if (!options?.includePartyAccounts) {
      query = query.or('is_party_account.is.null,is_party_account.eq.false');
    }

    const { data, error } = await query.order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    return (data || []).map((record: any) => {
      // Handle both array and object formats from Supabase join
      const accountType = Array.isArray(record.account_types)
        ? record.account_types[0]
        : record.account_types;

      return mapAccount({
        ...record,
        account_type_code: accountType?.code,
      });
    });
  },

  /**
   * Get lightweight accounts for Grid/Dropdown optimization
   */
  async getGridAccounts(companyId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, company_id, account_code, name_ar, name_en, is_group, currency, current_balance')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching grid accounts:', error);
      throw error;
    }

    return (data || []).map(record => mapAccount(record));
  },

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<Account | null> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching account:', error);
      throw error;
    }

    return data ? mapAccount(data) : null;
  },

  /**
   * Get accounts by type
   */
  async getByType(companyId: string, accountTypeId: string): Promise<Account[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .eq('account_type_id', accountTypeId)
      .eq('is_active', true);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching accounts by type:', error);
      throw error;
    }

    return (data || []).map(mapAccount);
  },

  /**
   * Get child accounts of a parent
   */
  async getChildren(parentId: string): Promise<Account[]> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching child accounts:', error);
      throw error;
    }

    return (data || []).map(mapAccount);
  },

  /**
   * Get root accounts (no parent)
   */
  async getRootAccounts(companyId: string): Promise<Account[]> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .is('parent_id', null)
      .eq('is_active', true);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.order('account_code', { ascending: true });

    if (error) {
      console.error('Error fetching root accounts:', error);
      throw error;
    }

    return (data || []).map(mapAccount);
  },

  /**
   * Create a new account
   */
  async create(input: CreateAccountInput): Promise<Account> {
    let tenantId = await getCurrentTenantIdAsync();

    // If no tenant_id from user metadata, get it from the company
    if (!tenantId) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('tenant_id')
        .eq('id', input.company_id)
        .single();

      tenantId = companyData?.tenant_id || null;
    }

    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const insertData = {
      tenant_id: tenantId,
      company_id: input.company_id,
      account_code: input.account_code,
      name_ar: input.name_ar,
      name_en: input.name_en || null,
      account_type_id: input.account_type_id,
      parent_id: input.parent_id || null,
      is_group: input.is_group || false,
      is_detail: !input.is_group,
      level: input.level || 1,
      currency: input.currency || null,
      description: input.description || null,
      is_active: true,
      opening_balance: 0,
      current_balance: 0,
    };

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw error;
    }

    return mapAccount(data);
  },

  /**
   * Update an account
   */
  async update(id: string, updates: Partial<CreateAccountInput>): Promise<Account> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.account_code) updateData.account_code = updates.account_code;
    if (updates.name_ar) updateData.name_ar = updates.name_ar;
    if (updates.name_en !== undefined) updateData.name_en = updates.name_en;
    if (updates.account_type_id) updateData.account_type_id = updates.account_type_id;
    if (updates.parent_id !== undefined) updateData.parent_id = updates.parent_id || null;
    if (updates.is_group !== undefined) {
      updateData.is_group = updates.is_group;
      updateData.is_detail = !updates.is_group;
    }
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.currency) updateData.currency = updates.currency;
    if (updates.description !== undefined) updateData.description = updates.description;

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      throw error;
    }

    return mapAccount(data);
  },

  /**
   * Check if account has any transactions
   */
  async hasTransactions(accountId: string): Promise<boolean> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if account has non-zero balance
    const { data: account, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('opening_balance, current_balance')
      .eq('id', accountId)
      .eq('tenant_id', tenantId)
      .single();

    if (accountError || !account) {
      return false;
    }

    if (account.opening_balance !== 0 || account.current_balance !== 0) {
      return true;
    }

    // Check journal entry lines
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entry_lines')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    if (!entriesError && entries && entries.length > 0) {
      return true;
    }

    return false;
  },

  /**
   * Check if account has children
   */
  async hasChildren(accountId: string): Promise<boolean> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('parent_id', accountId)
      .eq('tenant_id', tenantId)
      .limit(1);

    if (error) {
      console.error('Error checking account children:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Delete an account (soft delete by setting is_active = false)
   */
  async delete(id: string): Promise<void> {
    const tenantId = await getCurrentTenantIdAsync();
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    // Check if account has transactions
    const hasTrans = await this.hasTransactions(id);
    if (hasTrans) {
      throw new Error('Cannot delete account with transactions');
    }

    // Check if account has children
    const hasChildAccounts = await this.hasChildren(id);
    if (hasChildAccounts) {
      throw new Error('Cannot delete account with child accounts');
    }

    // Soft delete
    const { error } = await supabase
      .from('chart_of_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  /**
   * Check if account code exists
   */
  async codeExists(companyId: string, code: string, excludeId?: string): Promise<boolean> {
    const tenantId = await getCurrentTenantIdAsync();

    let query = supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_code', code)
      .eq('is_active', true)
      .limit(1);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking account code:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Get account types
   */
  async getAccountTypes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('account_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching account types:', error);
      throw error;
    }

    return data || [];
  },
};

export default accountsService;

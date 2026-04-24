// ════════════════════════════════════════════════════════════
// Desktop Company Setup Service
// ════════════════════════════════════════════════════════════
// Executes the actual company creation during first-run wizard:
// 1. Creates admin user in GoTrue
// 2. Calls register_new_subscriber RPC (same as cloud!)
// 3. Configures backup settings
// 4. Saves company file metadata

import type { DesktopSetupData } from '../types';
import { createAdminUser, getDesktopSupabase, signInLocal, cacheAuthForOffline } from './localAuth';

export interface SetupResult {
  success: boolean;
  error?: string;
  tenantId?: string;
  companyId?: string;
}

export type SetupPhase = 
  | 'creating-user'
  | 'signing-in'
  | 'creating-company'
  | 'setting-up-accounts'
  | 'configuring-backup'
  | 'done';

export type PhaseCallback = (phase: SetupPhase, message: string) => void;

export async function executeDesktopSetup(
  data: DesktopSetupData,
  onPhase: PhaseCallback
): Promise<SetupResult> {
  const isAr = data.language === 'ar';

  try {
    // ── Phase 1: Create admin user in GoTrue ──
    onPhase('creating-user', isAr ? 'جاري إنشاء المستخدم المدير...' : 'Creating admin user...');
    
    const adminEmail = data.adminEmail || `admin@${data.companyName.replace(/\s+/g, '-').toLowerCase()}.local`;
    const { userId, error: authError } = await createAdminUser({
      email: adminEmail,
      password: data.adminPassword,
      fullName: data.adminName,
      phone: data.adminPhone,
    });
    
    if (authError) return { success: false, error: `Auth: ${authError}` };

    // ── Phase 2: Sign in as admin ──
    onPhase('signing-in', isAr ? 'جاري تسجيل الدخول...' : 'Signing in...');
    
    const { data: signInData, error: signInError } = await signInLocal(adminEmail, data.adminPassword);
    if (signInError) return { success: false, error: `Sign in: ${signInError.message}` };

    // Cache for offline use
    if (signInData.session) {
      cacheAuthForOffline(adminEmail, signInData.session.access_token);
    }

    // ── Phase 3: Create company via RPC (same as cloud!) ──
    onPhase('creating-company', isAr ? 'جاري إنشاء الشركة...' : 'Creating company...');
    
    const client = getDesktopSupabase();
    const { data: rpcResult, error: rpcError } = await client.rpc('register_new_subscriber', {
      p_user_id: userId,
      p_user_email: adminEmail,
      p_user_name: data.adminName,
      p_company_name: data.companyName,
      p_phone: data.phone || '',
      p_business_type: data.businessType || 'general',
      p_currency: data.mainCurrency || 'USD',
      p_country_code: data.country || 'SA',
      p_plan_code: 'texa-enterprise', // Desktop = full access
      p_chart_template: data.chartTemplate || 'extended',
      p_local_currency: data.localCurrency || null,
    });

    if (rpcError) return { success: false, error: `RPC: ${rpcError.message}` };

    // ── Phase 4: Additional settings ──
    onPhase('setting-up-accounts', isAr ? 'جاري إعداد الحسابات...' : 'Setting up accounts...');

    // Apply tax settings if enabled
    if (data.vatEnabled && rpcResult?.company_id) {
      await client.from('companies').update({
        vat_enabled: true,
        vat_rate: data.vatRate,
        tax_number: data.taxNumber || null,
      }).eq('id', rpcResult.company_id);
    }

    // Apply fiscal year
    if (data.fiscalYearStart !== 1 && rpcResult?.company_id) {
      await client.from('companies').update({
        fiscal_year_start_month: data.fiscalYearStart,
      }).eq('id', rpcResult.company_id);
    }

    // ── Phase 5: Configure backup ──
    onPhase('configuring-backup', isAr ? 'جاري إعداد النسخ الاحتياطي...' : 'Configuring backup...');

    // Save desktop config to localStorage (will be read by Electron)
    const desktopConfig = {
      storagePath: data.storagePath,
      autoBackup: data.autoBackup,
      backupIntervalMinutes: data.backupIntervalMinutes,
      googleDriveEnabled: data.googleDriveEnabled,
      googleDriveEmail: data.googleDriveEmail,
      companyName: data.companyName,
      tenantId: rpcResult?.tenant_id,
      companyId: rpcResult?.company_id,
      adminEmail,
      language: data.language,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('texacore_desktop_config', JSON.stringify(desktopConfig));

    // Notify Electron to save config file
    if ((window as any).electronAPI?.saveCompanyConfig) {
      await (window as any).electronAPI.saveCompanyConfig(desktopConfig);
    }

    // ── Done! ──
    onPhase('done', isAr ? '✅ تم بنجاح!' : '✅ Complete!');

    return {
      success: true,
      tenantId: rpcResult?.tenant_id,
      companyId: rpcResult?.company_id,
    };

  } catch (err: any) {
    console.error('[DesktopSetup] Fatal error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

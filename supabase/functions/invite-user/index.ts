/**
 * Edge Function: Invite User (V2)
 * ================================
 * إضافة مستخدم جديد بطريقة آمنة ومتوافقة مع GoTrue
 * 
 * يقوم بـ:
 * 1. إنشاء حساب Auth عبر createUser() (ليس inviteUserByEmail!)
 * 2. إنشاء user_profile مع الشركة والفرع
 * 3. تعيين الأدوار (user_roles)
 * 4. ربط الموارد (user_resource_access)
 * 5. توليد رابط سحري (Magic Link) للدخول المباشر
 * 6. إرسال بريد ترحيب مخصص عبر Resend
 * 7. تسجيل في audit_logs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteUserRequest {
    email: string;
    full_name?: string;
    phone?: string;
    company_id: string;
    tenant_id: string;
    role_ids: string[];
    branch_ids: string[];
    primary_branch_id?: string;
    warehouse_ids?: string[];
    fund_ids?: string[];
    is_active?: boolean;
    redirect_url?: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ─── Authorization ───────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return jsonResponse({ success: false, error: 'Missing authorization header' }, 401)
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // ─── Verify caller (same pattern as nexa-agent) ──
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user: caller }, error: callerError } = await userClient.auth.getUser()

        if (callerError || !caller) {
            console.error('Auth verification failed:', callerError?.message, 'authHeader present:', !!authHeader)
            return jsonResponse({
                success: false,
                error: `فشل التحقق من الهوية: ${callerError?.message || 'token غير صالح'}`,
                debug: { hasAuth: !!authHeader, error: callerError?.message }
            }, 401)
        }

        console.log('[InviteUser] Caller verified:', caller.email, caller.id)

        // ─── Verify admin role ───────────────────────────
        const { data: callerRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role:roles(code)')
            .eq('user_id', caller.id)
            .eq('is_active', true)

        const callerRoleCodes = (callerRoles || []).map((r: any) => r.role?.code).filter(Boolean)
        const isCallerAdmin = callerRoleCodes.some((code: string) =>
            ['super_admin', 'tenant_owner', 'company_owner', 'company_admin', 'branch_manager'].includes(code)
        )

        if (!isCallerAdmin) {
            return jsonResponse({ success: false, error: 'صلاحيات غير كافية — يتطلب دور إداري' }, 403)
        }

        // ─── Parse request ───────────────────────────────
        const body: InviteUserRequest = await req.json()
        const {
            email,
            full_name,
            phone,
            company_id,
            tenant_id,
            role_ids = [],
            branch_ids = [],
            primary_branch_id,
            warehouse_ids = [],
            fund_ids = [],
            is_active = true,
            redirect_url,
        } = body

        const redirectTo = redirect_url || 'https://erp.texacore.ai/'
        console.log('[InviteUser] Redirect URL:', redirectTo)

        if (!email || !company_id || !tenant_id) {
            return jsonResponse({ success: false, error: 'البريد الإلكتروني ومعرف الشركة والمستأجر مطلوبون' }, 400)
        }

        // ─── Get company & role names for welcome email ──
        const { data: companyData } = await supabaseAdmin
            .from('companies')
            .select('name_ar, name_en')
            .eq('id', company_id)
            .single()

        let roleNames: { name_ar: string; name_en: string }[] = []
        if (role_ids.length > 0) {
            const { data: rolesData } = await supabaseAdmin
                .from('roles')
                .select('name_ar, name_en')
                .in('id', role_ids)
            roleNames = rolesData || []
        }

        const companyName = companyData?.name_ar || companyData?.name_en || 'الشركة'

        // ═══════════════════════════════════════════════════
        // Step 1: Check if user already exists
        // ═══════════════════════════════════════════════════
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === email)

        let userId: string
        let isNew = true

        if (existingUser) {
            // User exists in auth — check if already in this company
            userId = existingUser.id

            const { data: existingProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('id, company_id')
                .eq('id', userId)
                .maybeSingle()

            if (existingProfile?.company_id === company_id) {
                return jsonResponse({
                    success: false,
                    error: 'هذا المستخدم مسجل بالفعل في هذه الشركة'
                }, 409)
            }

            // Update profile with new company
            await supabaseAdmin.from('user_profiles').upsert({
                id: userId,
                email,
                full_name: full_name || existingUser.user_metadata?.full_name || null,
                phone: phone || null,
                company_id,
                tenant_id,
                branch_id: primary_branch_id || null,
                is_active,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

            isNew = false
        } else {
            // ═══════════════════════════════════════════════
            // Step 2: Create NEW user via createUser()
            // ✅ This creates a clean GoTrue-compatible user
            // ═══════════════════════════════════════════════
            const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                email_confirm: true,
                user_metadata: {
                    full_name: full_name || '',
                    phone: phone || '',
                    tenant_id,
                    company_id,
                    invited_by: caller.id,
                },
            })

            if (createError) {
                console.error('Create user error:', createError)
                return jsonResponse({ success: false, error: createError.message }, 400)
            }

            userId = newUserData.user.id

            // ═══════════════════════════════════════════════
            // Step 3: user_profile is auto-created by handle_new_user trigger
            // (reads company_id, tenant_id, full_name from user_metadata)
            // Only update branch_id if provided (trigger doesn't set it)
            // ═══════════════════════════════════════════════
            if (primary_branch_id) {
                // Wait a moment for trigger to create the profile
                await new Promise(resolve => setTimeout(resolve, 500))
                await supabaseAdmin.from('user_profiles')
                    .update({ branch_id: primary_branch_id })
                    .eq('id', userId)
            }
        }

        // ═══════════════════════════════════════════════════
        // Step 4: Assign roles and resources
        // ═══════════════════════════════════════════════════
        await assignRolesAndResources(
            supabaseAdmin, userId, tenant_id, company_id,
            role_ids, branch_ids, primary_branch_id, warehouse_ids, fund_ids
        )

        // ═══════════════════════════════════════════════════
        // Step 5: Generate Magic Link for first login
        // ═══════════════════════════════════════════════════
        let magicLink = ''
        try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
                options: {
                    redirectTo,
                }
            })

            if (linkError) {
                console.error('Generate link error:', linkError)
            } else if (linkData?.properties?.action_link) {
                // Extract token_hash from the action_link URL
                // action_link looks like: https://xxx.supabase.co/auth/v1/verify?token=TOKEN&type=magiclink&redirect_to=URL
                const actionUrl = new URL(linkData.properties.action_link)
                const token = actionUrl.searchParams.get('token')
                const type = actionUrl.searchParams.get('type') || 'magiclink'

                if (token) {
                    // Build a direct link to our app with token params
                    // App will detect these params and call verifyOtp()
                    magicLink = `${redirectTo}?token_hash=${encodeURIComponent(token)}&type=${type}`
                    console.log('[InviteUser] Custom magic link built for:', redirectTo)
                } else {
                    // Fallback: use the original action_link
                    magicLink = linkData.properties.action_link
                    console.log('[InviteUser] Using original action_link (no token found)')
                }
            }
        } catch (e) {
            console.error('Magic link generation failed:', e)
        }

        // ═══════════════════════════════════════════════════
        // Step 6: Send welcome email via Resend
        // ═══════════════════════════════════════════════════
        let emailSent = false
        if (resendApiKey && magicLink) {
            try {
                const roleNamesAr = roleNames.map(r => r.name_ar).filter(Boolean).join('، ') || 'مستخدم'
                const roleNamesEn = roleNames.map(r => r.name_en).filter(Boolean).join(', ') || 'User'

                const welcomeHtml = buildWelcomeEmail({
                    userName: full_name || email.split('@')[0],
                    companyName,
                    rolesAr: roleNamesAr,
                    rolesEn: roleNamesEn,
                    magicLink,
                    email,
                })

                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: 'TexaCore ERP <notifications@texacore.ai>',
                        to: [email],
                        subject: `🎉 مرحباً ${full_name || ''}! تمت إضافتك إلى ${companyName} — TexaCore ERP`,
                        html: welcomeHtml,
                    }),
                })

                emailSent = emailRes.ok
                if (!emailRes.ok) {
                    const errResult = await emailRes.json()
                    console.error('Resend error:', errResult)
                }
            } catch (emailErr) {
                console.error('Email send error:', emailErr)
            }
        }

        // ═══════════════════════════════════════════════════
        // Step 7: Audit log
        // ═══════════════════════════════════════════════════
        await logAudit(supabaseAdmin, tenant_id, caller.id, userId, isNew ? 'invite_user' : 'reassign_user', {
            email,
            company_id,
            company_name: companyName,
            role_ids,
            branch_ids,
            is_new: isNew,
            email_sent: emailSent,
        })

        return jsonResponse({
            success: true,
            message: isNew
                ? `تم إنشاء المستخدم ${email} وإرسال دعوة بالبريد`
                : `تم تحديث المستخدم ${email} وربطه بالشركة`,
            data: {
                user_id: userId,
                email,
                is_new: isNew,
                email_sent: emailSent,
                roles_assigned: role_ids.length,
                branches_linked: branch_ids.length,
            }
        })

    } catch (error) {
        console.error('Error inviting user:', error)
        return jsonResponse({
            success: false,
            error: error instanceof Error ? error.message : 'خطأ غير متوقع'
        }, 500)
    }
})

// ═══════════════════════════════════════════════════════════
// Helper: JSON Response with CORS
// ═══════════════════════════════════════════════════════════
function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

// ═══════════════════════════════════════════════════════════
// Helper: Assign roles and resources
// ═══════════════════════════════════════════════════════════
async function assignRolesAndResources(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    tenantId: string,
    companyId: string,
    roleIds: string[],
    branchIds: string[],
    primaryBranchId?: string,
    warehouseIds: string[] = [],
    fundIds: string[] = [],
) {
    // Assign roles
    if (roleIds.length > 0) {
        await supabase.from('user_roles').delete().eq('user_id', userId)
        await supabase.from('user_roles').insert(
            roleIds.map(roleId => ({
                user_id: userId,
                role_id: roleId,
                tenant_id: tenantId,
                company_id: companyId,
                is_active: true,
                assigned_at: new Date().toISOString(),
            }))
        )
    }

    // Assign resources
    await supabase.from('user_resource_access').delete().eq('user_id', userId)

    const resourceRows: any[] = []

    for (const branchId of branchIds) {
        resourceRows.push({
            user_id: userId,
            resource_type: 'branch',
            resource_id: branchId,
            is_primary: branchId === primaryBranchId,
            tenant_id: tenantId,
            company_id: companyId,
            permissions: { read: true, write: true },
        })
    }

    for (const warehouseId of warehouseIds) {
        resourceRows.push({
            user_id: userId,
            resource_type: 'warehouse',
            resource_id: warehouseId,
            is_primary: false,
            tenant_id: tenantId,
            company_id: companyId,
            permissions: { read: true, write: true },
        })
    }

    for (const fundId of fundIds) {
        resourceRows.push({
            user_id: userId,
            resource_type: 'cash_account',
            resource_id: fundId,
            is_primary: false,
            tenant_id: tenantId,
            company_id: companyId,
            permissions: { read: true, write: true },
        })
    }

    if (resourceRows.length > 0) {
        await supabase.from('user_resource_access').insert(resourceRows)
    }

    // ═══════════════════════════════════════════════════
    // Auto-create user_module_permissions from roles
    // ═══════════════════════════════════════════════════
    if (roleIds.length > 0) {
        try {
            // 1. Get visible_modules from assigned roles
            const { data: rolesData } = await supabase
                .from('roles')
                .select('visible_modules')
                .in('id', roleIds)

            const roleModules = new Set<string>()
            let hasAll = false
            for (const role of (rolesData || [])) {
                const modules = (role as any).visible_modules as string[] | null
                if (modules) {
                    for (const m of modules) {
                        if (m === 'all') { hasAll = true; break }
                        roleModules.add(m)
                    }
                }
                if (hasAll) break
            }

            // 2. Get tenant's enabled modules
            const { data: tenantModules } = await supabase
                .from('tenant_modules')
                .select('module_code')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .eq('is_enabled', true)

            const enabledModules = new Set(
                (tenantModules || []).map((tm: any) => tm.module_code)
            )

            // 3. Intersect: only modules that are both in role AND enabled for tenant
            const finalModules: string[] = []
            if (hasAll) {
                // Super admin role — give access to all tenant modules
                enabledModules.forEach(m => finalModules.push(m))
            } else {
                roleModules.forEach(m => {
                    if (enabledModules.has(m)) {
                        finalModules.push(m)
                    }
                })
            }

            // Always include dashboard and core
            if (!finalModules.includes('dashboard')) finalModules.push('dashboard')
            if (!finalModules.includes('core')) finalModules.push('core')

            // 4. Delete old permissions and insert new ones
            await supabase.from('user_module_permissions')
                .delete()
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)

            if (finalModules.length > 0) {
                const permRows = finalModules.map(moduleCode => ({
                    user_id: userId,
                    tenant_id: tenantId,
                    company_id: companyId,
                    module_code: moduleCode,
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: false,
                    can_export: true,
                    can_import: false,
                    can_approve: false,
                    can_manage_settings: false,
                    granted_by: userId,  // will be overridden below
                    is_active: true,
                }))

                await supabase.from('user_module_permissions').insert(permRows)
                console.log(`[InviteUser] Created ${finalModules.length} module permissions:`, finalModules.join(', '))
            }
        } catch (e) {
            console.error('[InviteUser] Module permissions creation failed (non-blocking):', e)
            // Non-blocking — user can still log in; admin can fix permissions later
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Helper: Audit log
// ═══════════════════════════════════════════════════════════
async function logAudit(
    supabase: ReturnType<typeof createClient>,
    tenantId: string,
    callerId: string,
    targetUserId: string,
    action: string,
    metadata: Record<string, unknown>,
) {
    try {
        await supabase.from('audit_logs').insert({
            tenant_id: tenantId,
            user_id: callerId,
            action,
            entity_type: 'user_profiles',
            entity_id: targetUserId,
            new_values: metadata,
            metadata: { source: 'invite_user_edge_function_v2' },
        })
    } catch (err) {
        console.error('Audit log error:', err)
    }
}

// ═══════════════════════════════════════════════════════════
// Helper: Build Welcome Email HTML
// ═══════════════════════════════════════════════════════════
function buildWelcomeEmail(params: {
    userName: string;
    companyName: string;
    rolesAr: string;
    rolesEn: string;
    magicLink: string;
    email: string;
}): string {
    const { userName, companyName, rolesAr, rolesEn, magicLink, email } = params

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#047857 0%,#0d9488 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
            <span style="color:#ffffff;">Texa</span><span style="color:#f59e0b;">Core</span>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px;">ENTERPRISE RESOURCE PLANNING</div>
        </td></tr>

        <!-- Icon -->
        <tr><td style="text-align:center;padding:32px 40px 16px;"><div style="font-size:56px;">🎉</div></td></tr>

        <!-- Title -->
        <tr><td style="text-align:center;padding:0 40px 8px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1f2937;">مرحباً بك في الفريق!</h1>
          <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">Welcome to the team!</p>
        </td></tr>

        <!-- Message -->
        <tr><td style="padding:16px 40px 24px;text-align:center;">
          <p style="margin:0;font-size:16px;color:#4b5563;line-height:1.8;">
            مرحباً <strong style="color:#047857;">${userName}</strong>! 👋<br>
            تمت إضافتك للعمل في <strong style="color:#1f2937;">${companyName}</strong><br>
            على نظام <strong>TexaCore ERP</strong>.
          </p>
        </td></tr>

        <!-- Info Card -->
        <tr><td style="padding:0 40px 24px;">
          <div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;text-align:right;width:40%;">🏢 الشركة:</td>
                <td style="padding:8px 0;font-size:14px;color:#1f2937;font-weight:600;text-align:right;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;text-align:right;">👤 الأدوار:</td>
                <td style="padding:8px 0;font-size:14px;color:#1f2937;font-weight:600;text-align:right;">${rolesAr}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;text-align:right;">📧 البريد:</td>
                <td style="padding:8px 0;font-size:14px;color:#1f2937;font-weight:600;text-align:right;">${email}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- CTA Button -->
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#047857,#0d9488);color:#ffffff;text-decoration:none;padding:16px 56px;border-radius:12px;font-size:18px;font-weight:700;box-shadow:0 4px 14px rgba(4,120,87,0.3);">
            🚀 دخول النظام الآن
          </a>
        </td></tr>

        <!-- Note -->
        <tr><td style="padding:0 40px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">هذا الرابط صالح لمدة 24 ساعة فقط.</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>

        <!-- Security Note -->
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            🔒 إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها بأمان.<br>
            لا تشارك هذا الرابط مع أي شخص آخر.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            <span style="font-weight:700;color:#047857;">Texa</span><span style="font-weight:700;color:#f59e0b;">Core</span> ERP<br>
            <span style="font-size:11px;">جودة تستحق الثقة 🇪🇺</span><br>
            <a href="https://texacore.ai" style="color:#047857;text-decoration:none;font-size:11px;">texacore.ai</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

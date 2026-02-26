/**
 * Edge Function: Invite User
 * ===========================
 * دعوة مستخدم جديد عبر البريد الإلكتروني
 * 
 * يقوم بـ:
 * 1. إنشاء حساب Auth عبر inviteUserByEmail
 * 2. إنشاء user_profile مع الشركة والفرع
 * 3. تعيين الأدوار (user_roles)
 * 4. ربط الموارد (user_resource_access)
 * 5. تسجيل في audit_logs
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
    company_id: string;
    tenant_id: string;
    role_ids: string[];        // Array of role UUIDs
    branch_ids: string[];      // Array of branch UUIDs
    primary_branch_id?: string;
    warehouse_ids?: string[];
    fund_ids?: string[];
    is_active?: boolean;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify authorization
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // User client (for auth verification)
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Admin client (for privileged operations)
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // Verify the requesting user
        const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser()
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify caller has admin role
        const { data: callerRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role:roles(code)')
            .eq('user_id', caller.id)
            .eq('is_active', true)

        const callerRoleCodes = (callerRoles || []).map((r: any) => r.role?.code).filter(Boolean)
        const isCallerAdmin = callerRoleCodes.some((code: string) =>
            ['super_admin', 'tenant_owner', 'company_owner', 'company_admin'].includes(code)
        )

        if (!isCallerAdmin) {
            return new Response(
                JSON.stringify({ success: false, error: 'Insufficient permissions — admin role required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const body: InviteUserRequest = await req.json()
        const {
            email,
            full_name,
            company_id,
            tenant_id,
            role_ids = [],
            branch_ids = [],
            primary_branch_id,
            warehouse_ids = [],
            fund_ids = [],
            is_active = true,
        } = body

        // Validate required fields
        if (!email || !company_id || !tenant_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'email, company_id, and tenant_id are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ═══════════════════════════════════════════════
        // Step 1: Invite via Supabase Auth
        // ═══════════════════════════════════════════════
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                data: {
                    full_name: full_name || '',
                    tenant_id,
                    company_id,
                    invited_by: caller.id,
                },
                redirectTo: `${supabaseUrl.replace('.supabase.co', '.vercel.app')}/login`,
            }
        )

        if (authError) {
            // If user already exists in auth, just get their ID
            if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
                // Try to find existing user
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
                const existingUser = existingUsers?.users?.find(u => u.email === email)

                if (!existingUser) {
                    return new Response(
                        JSON.stringify({ success: false, error: `User with email ${email} already exists but cannot be found` }),
                        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // Check if they already have a profile in this company
                const { data: existingProfile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id')
                    .eq('id', existingUser.id)
                    .eq('company_id', company_id)
                    .maybeSingle()

                if (existingProfile) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: 'هذا المستخدم مسجل بالفعل في هذه الشركة / User already exists in this company'
                        }),
                        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // Update their profile with the new company
                await supabaseAdmin
                    .from('user_profiles')
                    .update({
                        company_id,
                        tenant_id,
                        is_active,
                        branch_id: primary_branch_id || null,
                    })
                    .eq('id', existingUser.id)

                // Assign roles and resources for existing user
                await assignRolesAndResources(
                    supabaseAdmin, existingUser.id, tenant_id, company_id,
                    role_ids, branch_ids, primary_branch_id, warehouse_ids, fund_ids
                )

                // Log audit
                await logAudit(supabaseAdmin, tenant_id, caller.id, existingUser.id, 'reassign_user', { company_id, role_ids })

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'تم تحديث المستخدم الموجود وربطه بالشركة / Existing user updated and linked to company',
                        data: { user_id: existingUser.id, email, is_new: false }
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: false, error: authError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const newUserId = authData.user.id

        // ═══════════════════════════════════════════════
        // Step 2: Create/Update user_profile
        // ═══════════════════════════════════════════════
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: newUserId,
                email,
                full_name: full_name || null,
                company_id,
                tenant_id,
                branch_id: primary_branch_id || null,
                is_active,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('Profile creation error:', profileError)
            // Don't fail — auth user is created, profile might be auto-created by trigger
        }

        // ═══════════════════════════════════════════════
        // Step 3 & 4: Assign roles and resources
        // ═══════════════════════════════════════════════
        await assignRolesAndResources(
            supabaseAdmin, newUserId, tenant_id, company_id,
            role_ids, branch_ids, primary_branch_id, warehouse_ids, fund_ids
        )

        // ═══════════════════════════════════════════════
        // Step 5: Audit log
        // ═══════════════════════════════════════════════
        await logAudit(supabaseAdmin, tenant_id, caller.id, newUserId, 'invite_user', {
            email,
            company_id,
            role_ids,
            branch_ids,
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: 'تم إرسال دعوة بالبريد الإلكتروني بنجاح / Invitation email sent successfully',
                data: {
                    user_id: newUserId,
                    email,
                    is_new: true,
                    roles_assigned: role_ids.length,
                    branches_linked: branch_ids.length,
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error inviting user:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

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
        // Remove existing roles first
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

    // Assign resources (branches, warehouses, funds)
    // Remove old resources first
    await supabase.from('user_resource_access').delete().eq('user_id', userId)

    const resourceRows: any[] = []

    // Branches
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

    // Warehouses
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

    // Funds (cash/bank accounts)
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
            metadata: { source: 'invite_user_edge_function' },
        })
    } catch (err) {
        console.error('Audit log error:', err)
    }
}

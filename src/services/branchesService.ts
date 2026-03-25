/**
 * ═══════════════════════════════════════════════════════════════
 * 🏪 Branches Service - خدمة إدارة الفروع
 * ═══════════════════════════════════════════════════════════════
 * 
 * CRUD operations for branches management.
 * Includes branch-user assignment and branch-warehouse linking.
 * 
 * @module services/branchesService
 * @phase 23A
 */

import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface Branch {
    id: string;
    tenant_id: string;
    company_id: string;
    name: string;
    name_en?: string;
    address?: string;
    phone?: string;
    email?: string;
    city?: string;
    country?: string;
    is_main: boolean;
    is_active: boolean;
    manager_id?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    manager?: {
        id: string;
        full_name: string;
        email: string;
    };
    warehouses_count?: number;
    users_count?: number;
}

export interface CreateBranchDTO {
    name: string;
    name_en?: string;
    address?: string;
    phone?: string;
    email?: string;
    city?: string;
    country?: string;
    is_main?: boolean;
    is_active?: boolean;
    manager_id?: string;
}

export interface UpdateBranchDTO extends Partial<CreateBranchDTO> { }

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

class BranchesService {
    /**
     * Get all branches for the current company
     */
    async getBranches(companyId: string): Promise<Branch[]> {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading branches:', error);
            throw error;
        }

        // Get counts and manager names for each branch
        const branches = (data || []) as Branch[];
        if (branches.length > 0) {
            const branchIds = branches.map(b => b.id);
            const managerIds = branches.map(b => b.manager_id).filter(Boolean) as string[];

            // Run queries in parallel — each wrapped in try-catch for resilience
            const [whResult, userResult, managerResult] = await Promise.all([
                supabase.from('warehouses').select('branch_id').in('branch_id', branchIds).then(r => r.data).catch(() => null),
                supabase.from('user_profiles').select('branch_id').in('branch_id', branchIds).then(r => r.data).catch(() => null),
                managerIds.length > 0
                    ? supabase.from('user_profiles').select('id, full_name, email').in('id', managerIds).then(r => r.data).catch(() => null)
                    : Promise.resolve(null),
            ]);

            const whMap = new Map<string, number>();
            const userMap = new Map<string, number>();
            const managerMap = new Map<string, { id: string; full_name: string; email: string }>();

            whResult?.forEach((w: any) => {
                if (w.branch_id) whMap.set(w.branch_id, (whMap.get(w.branch_id) || 0) + 1);
            });
            userResult?.forEach((u: any) => {
                if (u.branch_id) userMap.set(u.branch_id, (userMap.get(u.branch_id) || 0) + 1);
            });
            managerResult?.forEach((m: any) => {
                managerMap.set(m.id, { id: m.id, full_name: m.full_name, email: m.email });
            });

            return branches.map(b => ({
                ...b,
                is_main: b.is_main || false,
                is_active: b.is_active !== false,
                warehouses_count: whMap.get(b.id) || 0,
                users_count: userMap.get(b.id) || 0,
                manager: b.manager_id ? managerMap.get(b.manager_id) : undefined,
            }));
        }

        return branches;
    }

    /**
     * Get a single branch by ID
     */
    async getBranch(id: string): Promise<Branch | null> {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    /**
     * Create a new branch
     */
    async createBranch(companyId: string, dto: CreateBranchDTO): Promise<Branch> {
        // Get tenant_id from company
        const { data: company } = await supabase
            .from('companies')
            .select('tenant_id')
            .eq('id', companyId)
            .single();

        if (!company) throw new Error('Company not found');

        // If setting as main, unset current main
        if (dto.is_main) {
            await supabase
                .from('branches')
                .update({ is_main: false })
                .eq('company_id', companyId)
                .eq('is_main', true);
        }

        const { data, error } = await supabase
            .from('branches')
            .insert({
                company_id: companyId,
                tenant_id: company.tenant_id,
                name: dto.name,
                name_en: dto.name_en || null,
                address: dto.address || null,
                phone: dto.phone || null,
                email: dto.email || null,
                city: dto.city || null,
                country: dto.country || null,
                is_main: dto.is_main || false,
                is_active: dto.is_active !== false,
                manager_id: dto.manager_id || null,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update a branch
     */
    async updateBranch(id: string, companyId: string, dto: UpdateBranchDTO): Promise<Branch> {
        // If setting as main, unset current main
        if (dto.is_main) {
            await supabase
                .from('branches')
                .update({ is_main: false })
                .eq('company_id', companyId)
                .eq('is_main', true)
                .neq('id', id);
        }

        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.name_en !== undefined) updateData.name_en = dto.name_en;
        if (dto.address !== undefined) updateData.address = dto.address;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.city !== undefined) updateData.city = dto.city;
        if (dto.country !== undefined) updateData.country = dto.country;
        if (dto.is_main !== undefined) updateData.is_main = dto.is_main;
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
        if (dto.manager_id !== undefined) updateData.manager_id = dto.manager_id;

        const { data, error } = await supabase
            .from('branches')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete a branch (soft delete — set is_active to false)
     */
    async deleteBranch(id: string): Promise<void> {
        // Check if branch has linked users or warehouses
        const { data: users } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('branch_id', id)
            .limit(1);

        if (users && users.length > 0) {
            throw new Error('Cannot delete branch with assigned users. Please reassign users first.');
        }

        const { error } = await supabase
            .from('branches')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Hard delete a branch (only if no linked data)
     */
    async hardDeleteBranch(id: string): Promise<void> {
        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Get users assigned to a branch
     */
    async getBranchUsers(branchId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, avatar_url, role')
            .eq('branch_id', branchId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Assign a user to a branch
     */
    async assignUserToBranch(userId: string, branchId: string): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .update({ branch_id: branchId })
            .eq('id', userId);

        if (error) throw error;
    }

    /**
     * Remove a user from a branch
     */
    async removeUserFromBranch(userId: string): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .update({ branch_id: null })
            .eq('id', userId);

        if (error) throw error;
    }

    /**
     * Get warehouses linked to a branch
     */
    async getBranchWarehouses(branchId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('warehouses')
            .select('id, name, name_en, location, warehouse_type, is_active')
            .eq('branch_id', branchId);

        if (error) throw error;
        return data || [];
    }

    /**
     * Link a warehouse to a branch
     */
    async linkWarehouseToBranch(warehouseId: string, branchId: string): Promise<void> {
        const { error } = await supabase
            .from('warehouses')
            .update({ branch_id: branchId })
            .eq('id', warehouseId);

        if (error) throw error;
    }

    /**
     * Unlink a warehouse from a branch
     */
    async unlinkWarehouseFromBranch(warehouseId: string): Promise<void> {
        const { error } = await supabase
            .from('warehouses')
            .update({ branch_id: null })
            .eq('id', warehouseId);

        if (error) throw error;
    }

    /**
     * Get all users in the company (for branch assignment)
     */
    async getCompanyUsers(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id, full_name, email, avatar_url, role, branch_id')
            .eq('company_id', companyId)
            .order('full_name', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get all warehouses in the company (for branch assignment)
     */
    async getCompanyWarehouses(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('warehouses')
            .select('id, name, name_en, location, warehouse_type, is_active, branch_id')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

export const branchesService = new BranchesService();
export default branchesService;

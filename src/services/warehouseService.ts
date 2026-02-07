/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Service
 * خدمة المستودعات - التكامل مع Supabase
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// Types
export interface Warehouse {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id?: string;
    code: string;
    name?: string;  // Some DB schemas use 'name' directly instead of name_ar
    name_ar: string;
    name_en?: string;
    warehouse_type: 'main' | 'branch' | 'store' | 'regular' | 'offline_market' | 'van';
    country?: string;
    city?: string;
    address?: string;
    phone?: string;
    email?: string;
    manager_id?: string;
    is_active: boolean;
    allows_negative_stock?: boolean;
    is_main?: boolean;
    capacity?: number;
    created_at: string;
    updated_at: string;
}

export interface WarehouseLocation {
    id: string;
    tenant_id: string;
    warehouse_id: string;
    code: string;
    name?: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    barcode?: string;
    capacity?: number;
    capacity_unit_id?: string;
    is_active: boolean;
    created_at: string;
}

export interface WarehouseSettings {
    id: string;
    tenant_id: string;
    company_id: string;
    costing_method: 'fifo' | 'lifo' | 'average' | 'specific';
    require_dispatch_approval: boolean;
    dispatch_approval_roles: string[];
    default_reservation_hours: number;
    extended_reservation_hours: number;
    deposit_required_for_extended: boolean;
    min_deposit_percent: number;
    auto_cancel_expired_reservations: boolean;
    warn_dye_lot_mismatch: boolean;
    enforce_same_dye_lot: boolean;
    allow_negative_stock: boolean;
    low_stock_threshold_percent: number;
    auto_reorder_enabled: boolean;
    barcode_format: string;
    auto_generate_roll_barcode: boolean;
    auto_generate_location_barcode: boolean;
    require_location_scan_on_receive: boolean;
    require_photo_on_receive: boolean;
}

export interface DeliveryNote {
    id: string;
    tenant_id: string;
    company_id: string;
    branch_id?: string;
    note_number: string;
    note_date: string;
    sales_order_id?: string;
    customer_id: string;
    customer_name?: string;
    customer_phone?: string;
    warehouse_id: string;
    delivery_method: 'to_store' | 'to_customer_address' | 'direct_from_warehouse';
    delivery_address?: string;
    city?: string;
    region?: string;
    driver_id?: string;
    driver_name?: string;
    vehicle_number?: string;
    status: 'draft' | 'pending_approval' | 'approved' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
    requires_approval: boolean;
    approved_by?: string;
    approved_at?: string;
    expected_delivery_date?: string;
    shipped_at?: string;
    delivered_at?: string;
    receiver_name?: string;
    receiver_signature?: string;
    subtotal: number;
    shipping_cost: number;
    total_amount: number;
    tracking_number?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Warehouse Service
 */
export const warehouseService = {
    // ═══════════════════════════════════════════════════════════════
    // WAREHOUSES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all warehouses for a company
     */
    async getAll(companyId: string): Promise<Warehouse[]> {
        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .eq('company_id', companyId)
            .order('name_ar');

        if (error) throw error;
        return data || [];
    },

    /**
     * Get warehouse by ID
     */
    async getById(id: string): Promise<Warehouse | null> {
        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create warehouse
     */
    async create(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
        const { data, error } = await supabase
            .from('warehouses')
            .insert(warehouse)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update warehouse
     */
    async update(id: string, updates: Partial<Warehouse>): Promise<Warehouse> {
        const { data, error } = await supabase
            .from('warehouses')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete warehouse
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all locations for a warehouse
     */
    async getLocations(warehouseId: string): Promise<WarehouseLocation[]> {
        const { data, error } = await supabase
            .from('bin_locations')
            .select('*')
            .eq('warehouse_id', warehouseId)
            .order('code');

        if (error) throw error;
        return data || [];
    },

    /**
     * Create location
     */
    async createLocation(location: Omit<WarehouseLocation, 'id' | 'created_at'>): Promise<WarehouseLocation> {
        const { data, error } = await supabase
            .from('bin_locations')
            .insert(location)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update location
     */
    async updateLocation(id: string, updates: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
        const { data, error } = await supabase
            .from('bin_locations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete location
     */
    async deleteLocation(id: string): Promise<void> {
        const { error } = await supabase
            .from('bin_locations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get warehouse settings for a company
     */
    async getSettings(companyId: string): Promise<WarehouseSettings | null> {
        const { data, error } = await supabase
            .from('warehouse_settings')
            .select('*')
            .eq('company_id', companyId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    /**
     * Save warehouse settings
     */
    async saveSettings(settings: Omit<WarehouseSettings, 'id'>): Promise<WarehouseSettings> {
        const { data, error } = await supabase
            .from('warehouse_settings')
            .upsert(settings, { onConflict: 'tenant_id,company_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY NOTES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all delivery notes for a company
     */
    async getDeliveryNotes(companyId: string, filters?: {
        status?: string;
        warehouseId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<DeliveryNote[]> {
        let query = supabase
            .from('delivery_notes')
            .select('*')
            .eq('company_id', companyId)
            .order('note_date', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.warehouseId) {
            query = query.eq('warehouse_id', filters.warehouseId);
        }
        if (filters?.dateFrom) {
            query = query.gte('note_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('note_date', filters.dateTo);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },

    /**
     * Create delivery note
     */
    async createDeliveryNote(note: Omit<DeliveryNote, 'id' | 'created_at' | 'updated_at'>): Promise<DeliveryNote> {
        const { data, error } = await supabase
            .from('delivery_notes')
            .insert(note)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Approve delivery note (calls RPC function)
     */
    async approveDeliveryNote(noteId: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase
            .rpc('approve_delivery_note', {
                p_note_id: noteId,
                p_approved_by: approvedBy
            });

        if (error) throw error;
        return data;
    },

    /**
     * Confirm delivery (calls RPC function)
     */
    async confirmDelivery(noteId: string, receiverName?: string, signature?: string): Promise<{ success: boolean }> {
        const { data, error } = await supabase
            .rpc('confirm_delivery', {
                p_note_id: noteId,
                p_receiver_name: receiverName,
                p_signature: signature
            });

        if (error) throw error;
        return data;
    },

    /**
     * Generate delivery note number (calls RPC function)
     */
    async generateDeliveryNoteNumber(tenantId: string, companyId: string): Promise<string> {
        const { data, error } = await supabase
            .rpc('generate_delivery_note_number', {
                p_tenant_id: tenantId,
                p_company_id: companyId
            });

        if (error) throw error;
        return data;
    },

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD STATS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(companyId: string): Promise<{
        totalWarehouses: number;
        totalMaterials: number;
        totalRolls: number;
        activeReservations: number;
        pendingDeliveries: number;
        lowStockItems: number;
    }> {
        // Helper function for safe count queries
        const safeCount = async (table: string, filters: Record<string, any> = {}): Promise<number> => {
            try {
                let query = supabase.from(table).select('*', { count: 'exact', head: true });
                Object.entries(filters).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else {
                        query = query.eq(key, value);
                    }
                });
                const { count, error } = await query;
                if (error) {
                    console.warn(`safeCount ${table}: ${error.message}`);
                    return 0;
                }
                return count || 0;
            } catch (e) {
                console.warn(`safeCount ${table} exception:`, e);
                return 0;
            }
        };

        // Execute all counts in parallel with error handling
        // NOTE: Temporarily disabling counts for missing tables to prevent console errors
        const [
            warehousesCount,
            materialsCount,
            rollsCount,
            reservationsCount,
            deliveriesCount,
            lowStockCount
        ] = await Promise.all([
            safeCount('warehouses', { company_id: companyId, is_active: true }),
            Promise.resolve(0), // safeCount('materials', { company_id: companyId }),
            safeCount('fabric_rolls', { company_id: companyId }), // fabric_rolls exists in DB but might be empty
            Promise.resolve(0), // safeCount('roll_reservations', { company_id: companyId, status: 'active' }),
            safeCount('delivery_notes', { company_id: companyId }),
            Promise.resolve(0), // safeCount('fabric_rolls', { company_id: companyId })
        ]);

        return {
            totalWarehouses: warehousesCount,
            totalMaterials: materialsCount,
            totalRolls: rollsCount,
            activeReservations: reservationsCount,
            pendingDeliveries: deliveriesCount,
            lowStockItems: 0, // Will be calculated properly when schema is complete
        };
    },

    // ═══════════════════════════════════════════════════════════════
    // ROLLS (FABRIC ROLLS)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all fabric rolls for a company
     */
    async getRolls(companyId: string, filters?: {
        warehouseId?: string;
        materialId?: string;
        status?: string;
        limit?: number;
    }): Promise<any[]> {
        let query = supabase
            .from('fabric_rolls')
            .select(`
                *,
                warehouse:warehouses(id, name_ar, name_en),
                material:materials(id, name_ar, name_en),
                location:warehouse_locations(id, code, name)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (filters?.warehouseId) {
            query = query.eq('warehouse_id', filters.warehouseId);
        }
        if (filters?.materialId) {
            query = query.eq('material_id', filters.materialId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) {
            // Setup silent handling for missing tables during development
            if (error.code === '42P01' || error.message.includes('not find the table')) {
                console.warn('Handling missing table: fabric_rolls (Rolls)');
                return [];
            }
            console.warn('getRolls error:', error.message);
            return [];
        }
        return data || [];
    },

    // ═══════════════════════════════════════════════════════════════
    // MATERIAL GROUPS (مجموعات المواد)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all material groups for a company (uses tenant_id since fabric_groups has no company_id)
     */
    async getGroups(companyId: string, tenantId?: string): Promise<any[]> {
        try {
            // If tenantId provided, use it directly; otherwise query by company to get tenant
            let query = supabase
                .from('fabric_groups')
                .select('*')
                .order('name_ar');

            // RLS now handles isolation strictly. No need to filter manually if consistent.
            // However, to be safe, we can keep it OR remove it. 
            // Let's REMOVE it to test if the manual filter was the issue (e.g. slight string mismatch)
            // if (tenantId) {
            //    query = query.eq('tenant_id', tenantId);
            // }

            const { data, error } = await query;

            if (error) {
                if (error.code === '42P01' || error.message.includes('not find the table')) {
                    return [];
                }
                console.warn('getGroups error:', error.message);
                return [];
            }
            return data || [];
        } catch (error: any) {
            console.error('getGroups exception:', error);
            return [];
        }
    },

    /**
     * Create a new material group
     */
    async createGroup(groupData: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('fabric_groups')
                .insert([groupData])
                .select()
                .single();

            if (error) {
                console.error('createGroup error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('createGroup exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update a material group
     */
    async updateGroup(id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('fabric_groups')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('updateGroup error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('updateGroup exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a material group
     */
    async deleteGroup(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('fabric_groups')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('deleteGroup error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('deleteGroup exception:', error);
            return { success: false, error: error.message };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // MATERIALS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all materials for a company
     */
    async getMaterials(companyId: string, filters?: {
        categoryId?: string;
        search?: string;
        limit?: number;
    }): Promise<any[]> {
        try {
            let query = supabase
                .from('fabric_materials')
                .select(`
                    *,
                    group:fabric_groups(id, name_ar, name_en)
                `)
                .eq('company_id', companyId)
                .order('code');

            if (filters?.categoryId) {
                query = query.eq('group_id', filters.categoryId);
            }
            if (filters?.search) {
                query = query.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
            }
            if (filters?.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) {
                if (error.code === '42P01' || error.message.includes('not find the table')) {
                    // return empty silently if table missing
                    return [];
                }
                console.warn('getMaterials error:', error.message);
                return [];
            }
            return data || [];
        } catch (error: any) {
            console.error('getMaterials exception:', error);
            return [];
        }
    },

    /**
     * Create a new material
     */
    async createMaterial(materialData: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('fabric_materials')
                .insert([materialData])
                .select()
                .single();

            if (error) {
                console.error('createMaterial error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('createMaterial exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Create multiple materials (for variants)
     */
    async createMaterials(materialsData: any[]): Promise<{ success: boolean; data?: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('fabric_materials')
                .insert(materialsData)
                .select();

            if (error) {
                console.error('createMaterials error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('createMaterials exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update a material
     */
    async updateMaterial(id: string, updates: any): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('fabric_materials')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('updateMaterial error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            console.error('updateMaterial exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a material
     */
    async deleteMaterial(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('fabric_materials')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('deleteMaterial error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            console.error('deleteMaterial exception:', error);
            return { success: false, error: error.message };
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // RESERVATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all reservations for a company
     */
    async getReservations(companyId: string, filters?: {
        status?: 'active' | 'expired' | 'fulfilled' | 'cancelled';
        customerId?: string;
        limit?: number;
    }): Promise<any[]> {
        let query = supabase
            .from('reservations')
            .select(`
                *,
                roll:fabric_rolls(id, roll_number, material:materials(name_ar, name_en)),
                customer:customers(id, name, phone)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.customerId) {
            query = query.eq('customer_id', filters.customerId);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || error.message.includes('not find the table')) {
                return [];
            }
            console.warn('getReservations error:', error.message);
            return [];
        }
        return data || [];
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MOVEMENTS (حركات المخزون الشاملة)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get inventory movements with comprehensive filters
     * يشمل: أقمشة، رولونات، كونتينرات، مناقلات، إذون تسليم، فواتير
     */
    async getInventoryMovements(companyId: string, filters?: {
        warehouseId?: string;
        materialId?: string;
        movementType?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
    }): Promise<any[]> {
        let query = supabase
            .from('inventory_movements')
            .select('*')
            .eq('company_id', companyId)
            .order('movement_date', { ascending: false });

        if (filters?.warehouseId) {
            query = query.or(`warehouse_id.eq.${filters.warehouseId},from_warehouse_id.eq.${filters.warehouseId},to_warehouse_id.eq.${filters.warehouseId}`);
        }
        if (filters?.materialId) {
            query = query.eq('material_id', filters.materialId);
        }
        if (filters?.movementType) {
            query = query.eq('movement_type', filters.movementType);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.dateFrom) {
            query = query.gte('movement_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('movement_date', filters.dateTo);
        }
        query = query.limit(filters?.limit || 100);

        const { data, error } = await query;

        if (error) {
            if (error.code === '42P01' || error.code === '42703' || error.message.includes('does not exist')) {
                // Ignore missing columns/tables specifically for initial setup
                return [];
            }
            console.warn('getInventoryMovements error:', error.message);
            return [];
        }
        return data || [];
    },

    /**
     * Get pending receipts (استلامات معلقة)
     */
    async getPendingReceipts(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('inventory_movements')
            .select('*')
            .eq('company_id', companyId)
            .eq('movement_type', 'transfer')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01' || error.code === '42703' || error.message.includes('does not exist')) return [];
            console.warn('getPendingReceipts error:', error.message);
            return [];
        }
        return data || [];
    },

    // ═══════════════════════════════════════════════════════════════
    // STOCK COUNTS (الجرد المخزني)
    // ═══════════════════════════════════════════════════════════════

    async getStockCounts(companyId: string, filters?: {
        status?: string;
        warehouseId?: string;
    }): Promise<any[]> {
        let query = supabase
            .from('stock_counts')
            .select('*')
            .eq('company_id', companyId)
            .order('count_date', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.warehouseId) {
            query = query.eq('warehouse_id', filters.warehouseId);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || error.message.includes('not find the table')) return [];
            console.warn('getStockCounts error:', error.message);
            return [];
        }
        return data || [];
    },

    async createStockCount(stockCount: any): Promise<any> {
        const { data, error } = await supabase
            .from('stock_counts')
            .insert({
                ...stockCount,
                count_number: `SC-${Date.now()}`,
                count_date: new Date().toISOString().split('T')[0],
                status: 'planned'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getStockCountItems(stockCountId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('stock_count_items')
            .select('*')
            .eq('stock_count_id', stockCountId);

        if (error) {
            console.warn('getStockCountItems error:', error.message);
            return [];
        }
        return data || [];
    },

    async updateStockCountItem(itemId: string, actualQuantity: number): Promise<any> {
        const { data, error } = await supabase
            .from('stock_count_items')
            .update({
                actual_quantity: actualQuantity,
                is_counted: true,
                counted_at: new Date().toISOString()
            })
            .eq('id', itemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ═══════════════════════════════════════════════════════════════
    // SAMPLE REQUESTS (طلبات العينات)
    // ═══════════════════════════════════════════════════════════════

    async getSampleRequests(companyId: string, filters?: {
        status?: string;
        rollId?: string;
    }): Promise<any[]> {
        let query = supabase
            .from('sample_cuttings')
            .select('*')
            .eq('company_id', companyId)
            .order('request_date', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.rollId) {
            query = query.eq('roll_id', filters.rollId);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || error.message.includes('not find the table')) return [];
            console.warn('getSampleRequests error:', error.message);
            return [];
        }
        return data || [];
    },

    async createSampleRequest(request: any): Promise<any> {
        const { data, error } = await supabase
            .from('sample_cuttings')
            .insert({
                ...request,
                request_number: `SMP-${Date.now()}`,
                request_date: new Date().toISOString().split('T')[0],
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSampleStatus(requestId: string, status: string): Promise<any> {
        const { data, error } = await supabase
            .from('sample_cuttings')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // ═══════════════════════════════════════════════════════════════
    // LOW STOCK & CAPACITY
    // ═══════════════════════════════════════════════════════════════

    async getLowStockItems(companyId: string, limit: number = 10): Promise<any[]> {
        const { data, error } = await supabase
            .from('fabric_rolls')
            .select('id, roll_number, current_length')
            .eq('company_id', companyId)
            .lt('current_length', 10)
            .order('current_length')
            .limit(limit);

        if (error) {
            console.warn('getLowStockItems error:', error.message);
            return [];
        }
        return data || [];
    },

    async getWarehouseCapacity(companyId: string): Promise<any[]> {
        const { data: warehouses, error } = await supabase
            .from('warehouses')
            .select('id, name_ar')
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (error || !warehouses) return [];

        const capacityData = await Promise.all(
            warehouses.map(async (wh) => {
                const { count } = await supabase
                    .from('fabric_rolls')
                    .select('*', { count: 'exact', head: true })
                    .eq('warehouse_id', wh.id);

                return {
                    id: wh.id,
                    name: wh.name_ar,
                    usedCapacity: count || 0,
                    totalCapacity: 100,
                    percentage: Math.round(((count || 0) / 100) * 100)
                };
            })
        );

        return capacityData;
    }
};

export default warehouseService;


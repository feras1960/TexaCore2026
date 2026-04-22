/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 Warehouse Service
 * خدمة المستودعات - التكامل مع Supabase
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { documentStatusService as DSS } from './documentStatusService';


// Module-level cache: tracks which tables/RPCs exist to avoid repeated 404/400 errors
const _tableExistsCache: Record<string, boolean | null> = {};

const checkTableExists = async (tableName: string): Promise<boolean> => {
    if (_tableExistsCache[tableName] === false) return false;
    if (_tableExistsCache[tableName] === true) return true;
    // First check - do a lightweight query
    const { error } = await supabase.from(tableName).select('id').limit(0);
    _tableExistsCache[tableName] = !error;
    return !error;
};

const checkRpcExists = async (rpcName: string, params: Record<string, any>): Promise<{ exists: boolean; data?: any }> => {
    if (_tableExistsCache[`rpc:${rpcName}`] === false) return { exists: false };
    const { data, error } = await supabase.rpc(rpcName, params);
    if (error && (error.message.includes('Could not find the function') || error.code === '42883')) {
        _tableExistsCache[`rpc:${rpcName}`] = false;
        return { exists: false };
    }
    _tableExistsCache[`rpc:${rpcName}`] = true;
    return { exists: true, data: error ? undefined : data };
};

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
    name_ru?: string;
    name_uk?: string;
    name_tr?: string;
    name_de?: string;
    name_it?: string;
    name_ro?: string;
    name_pl?: string;
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
    // 🔑 Receipt variance tolerance (default: 1%)
    receipt_variance_tolerance_pct?: number;
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
     * Delete warehouse — with safety checks
     * لا يمكن حذف مستودع مرتبط بمواد أو حركات مخزون
     */
    async delete(id: string): Promise<void> {
        // 1. Check for inventory movements
        const { count: movementsCount } = await supabase
            .from('inventory_movements')
            .select('id', { count: 'exact', head: true })
            .or(`to_warehouse_id.eq.${id},from_warehouse_id.eq.${id}`);

        if (movementsCount && movementsCount > 0) {
            throw new Error(`لا يمكن حذف هذا المستودع — يوجد ${movementsCount} حركة مخزون مرتبطة به.\nCannot delete: ${movementsCount} inventory movement(s) linked.`);
        }

        // 2. Check for materials assigned to this warehouse
        const { count: materialsCount } = await supabase
            .from('fabric_materials')
            .select('id', { count: 'exact', head: true })
            .eq('default_warehouse_id', id);

        if (materialsCount && materialsCount > 0) {
            throw new Error(`لا يمكن حذف هذا المستودع — يوجد ${materialsCount} مادة مرتبطة به.\nCannot delete: ${materialsCount} material(s) assigned.`);
        }

        // 3. Check for stock transfers
        const { count: transfersCount } = await supabase
            .from('stock_transfers')
            .select('id', { count: 'exact', head: true })
            .or(`to_warehouse_id.eq.${id},from_warehouse_id.eq.${id}`);

        if (transfersCount && transfersCount > 0) {
            throw new Error(`لا يمكن حذف هذا المستودع — يوجد ${transfersCount} تحويل مخزون مرتبط به.\nCannot delete: ${transfersCount} stock transfer(s) linked.`);
        }

        // 4. Check for fabric rolls
        const { count: rollsCount } = await supabase
            .from('fabric_rolls')
            .select('id', { count: 'exact', head: true })
            .eq('warehouse_id', id);

        if (rollsCount && rollsCount > 0) {
            throw new Error(`لا يمكن حذف هذا المستودع — يوجد ${rollsCount} رول قماش مرتبط به.\nCannot delete: ${rollsCount} fabric roll(s) stored.`);
        }

        // 5. All clear — delete
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
        try {
            const { data, error } = await supabase
                .from('warehouse_settings')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();

            if (error) {
                // 406 = Not Acceptable (table may not exist), PGRST116 = no rows
                if (error.code === 'PGRST116' || error.code === '42P01' || String(error.message).includes('406')) {
                    return null;
                }
                console.warn('getSettings error:', error.message);
                return null;
            }
            return data;
        } catch (err) {
            console.warn('getSettings exception:', err);
            return null;
        }
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
    async getDashboardStats(companyId: string, warehouseId?: string): Promise<{
        totalWarehouses: number;
        totalMaterials: number;
        totalRolls: number;
        activeReservations: number;
        pendingDeliveries: number;
        lowStockItems: number;
    }> {
        // Helper function for safe count queries
        const safeCount = async (table: string, filters: Record<string, any> = {}, inFilters: Record<string, any[]> = {}): Promise<number> => {
            try {
                let query = supabase.from(table).select('*', { count: 'exact', head: true });
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                Object.entries(inFilters).forEach(([key, values]) => {
                    query = query.in(key, values);
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

        // Base roll filters: only count rolls that are physically in stock
        const rollBaseFilters: Record<string, any> = {
            company_id: companyId,
            status: 'in_stock',
        };
        if (warehouseId) rollBaseFilters.warehouse_id = warehouseId;

        const materialFilters: Record<string, any> = { company_id: companyId };

        // Execute all counts in parallel
        const [
            warehousesCount,
            materialsCount,
            rollsCount,
            reservationsCount,
            deliveriesCount,
            lowStockCount
        ] = await Promise.all([
            safeCount('warehouses', { company_id: companyId, is_active: true }),
            safeCount('fabric_materials', materialFilters),
            safeCount('fabric_rolls', rollBaseFilters),
            safeCount('roll_reservations', { company_id: companyId, status: 'active' }),
            safeCount('delivery_notes', { company_id: companyId }),
            // Low stock: rolls in stock with current_length < minimum_length threshold (e.g. < 10m)
            (async () => {
                try {
                    let q = supabase.from('fabric_rolls')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companyId)
                        .eq('status', 'in_stock')
                        .lt('current_length', 10);
                    if (warehouseId) q = q.eq('warehouse_id', warehouseId);
                    const { count } = await q;
                    return count || 0;
                } catch { return 0; }
            })(),
        ]);

        return {
            totalWarehouses: warehousesCount,
            totalMaterials: materialsCount,
            totalRolls: rollsCount,
            activeReservations: reservationsCount,
            pendingDeliveries: deliveriesCount,
            lowStockItems: lowStockCount,
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
            let query = supabase
                .from('fabric_groups')
                .select('*')
                .eq('company_id', companyId)
                .order('name_ar');

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
                    return [];
                }
                console.warn('getMaterials error:', error.message);
                return [];
            }

            if (!data || data.length === 0) return [];

            // Fetch statistics for these materials using our custom RPC
            const materialIds = data.map((m: any) => m.id);
            let stats: any[] | null = null;

            // Try RPC first
            const rpcResult = await checkRpcExists('get_material_inventory_stats_batch', { material_ids: materialIds });
            if (rpcResult.exists && rpcResult.data) {
                stats = rpcResult.data;
            } else {
                // FALLBACK: Query fabric_rolls directly if RPC is missing
                console.warn('RPC get_material_inventory_stats_batch missing, using fallback query');
                const { data: rollsData, error: rollsError } = await supabase
                    .from('fabric_rolls')
                    .select('material_id, current_length, status')
                    .in('material_id', materialIds)
                    // ✅ إصلاح: نحسب فقط الرولونات المتاحة فعلياً (نستثني المباع، المستهلك، والملغي)
                    .in('status', ['available', 'reserved', 'partial']);

                if (!rollsError && rollsData) {
                    // Aggregate manually
                    const statsMap = new Map<string, any>();
                    rollsData.forEach((roll: any) => {
                        const mId = roll.material_id;
                        if (!statsMap.has(mId)) {
                            statsMap.set(mId, { material_id: mId, rolls_count: 0, rolls_total_length: 0 });
                        }
                        const s = statsMap.get(mId);
                        s.rolls_count++;
                        s.rolls_total_length += (roll.current_length || 0);
                    });
                    stats = Array.from(statsMap.values());
                }
            }

            // Fetch true total stock from inventory_stock (active warehouses only!)
            let overallStockMap = new Map<string, number>();
            const { data: stockData, error: stockError } = await supabase
                .from('inventory_stock')
                .select(`
                    material_id, 
                    quantity_on_hand,
                    warehouses!inner (
                        is_active
                    )
                `)
                .eq('warehouses.is_active', true)
                .in('material_id', materialIds);

            if (!stockError && stockData) {
                stockData.forEach((row: any) => {
                    const mId = row.material_id;
                    if (!mId) return;
                    const qty = Number(row.quantity_on_hand) || 0;
                    overallStockMap.set(mId, (overallStockMap.get(mId) || 0) + qty);
                });
            }

            // Merge stats with materials
            // Default stats if none found
            const materialsWithStats = data.map((material: any) => {
                const stat = stats?.find((s: any) => s.material_id === material.id);
                const rolls_count = stat?.rolls_count || 0;
                const rolls_total_length = stat?.rolls_total_length || 0;

                // Use inventory_stock as truth if we have entries or it's > 0, else fallback to fabric_materials.current_stock
                const totalStockQty = overallStockMap.has(material.id) ? overallStockMap.get(material.id)! : 0;
                const finalCurrentStock = (totalStockQty > 0 || overallStockMap.has(material.id))
                    ? Math.max(totalStockQty, rolls_total_length)
                    : Math.max(material.current_stock || 0, rolls_total_length);

                return {
                    ...material,
                    // Output the reconciled actual stock
                    current_stock: finalCurrentStock,
                    // Map status → is_active for UI compatibility
                    is_active: material.status !== 'inactive',
                    rolls_count,
                    rolls_total_length,
                    // Calculate loose stock (Total - Rolled)
                    loose_stock: Math.max(0, finalCurrentStock - rolls_total_length)
                };
            });

            return materialsWithStats;
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
            // 1. جلب البيانات القديمة للمقارنة
            const { data: oldMaterial } = await supabase
                .from('fabric_materials')
                .select('name_ar, name_en, is_variant_parent, group_id, category, unit, composition, currency, purchase_price, selling_price, fabric_type, usage_type')
                .eq('id', id)
                .single();

            // 2. تحديث المادة الأم
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

            // 3. نشر التحديثات للمواد الفرعية إذا كانت مادة أم
            if (oldMaterial?.is_variant_parent || updates.is_variant_parent) {
                const { data: children } = await supabase
                    .from('fabric_materials')
                    .select('id, name_ar, name_en')
                    .eq('parent_material_id', id);

                if (children && children.length > 0) {
                    // تحديث مشترك للخصائص الموحدة
                    const sharedUpdates: Record<string, any> = {};
                    
                    // نشر المجموعة
                    if (updates.group_id !== undefined) sharedUpdates.group_id = updates.group_id;
                    // نشر الفئة
                    if (updates.category !== undefined) sharedUpdates.category = updates.category;
                    // نشر الوحدة
                    if (updates.unit !== undefined) sharedUpdates.unit = updates.unit;
                    // نشر التركيب
                    if (updates.composition !== undefined) sharedUpdates.composition = updates.composition;
                    // نشر العملة
                    if (updates.currency !== undefined) sharedUpdates.currency = updates.currency;
                    // نشر الأسعار
                    if (updates.purchase_price !== undefined) sharedUpdates.purchase_price = updates.purchase_price;
                    if (updates.selling_price !== undefined) sharedUpdates.selling_price = updates.selling_price;
                    // نشر نوع النسيج والاستخدام
                    if (updates.fabric_type !== undefined) sharedUpdates.fabric_type = updates.fabric_type;
                    if (updates.usage_type !== undefined) sharedUpdates.usage_type = updates.usage_type;

                    // تحديث الأسماء — استبدال prefix الأم القديم بالجديد
                    const nameChanged = (updates.name_ar && updates.name_ar !== oldMaterial?.name_ar) ||
                                       (updates.name_en && updates.name_en !== oldMaterial?.name_en);

                    if (nameChanged) {
                        // تحديث كل فرعية على حدة لأن الـ suffix مختلف
                        for (const child of children) {
                            const childUpdates: Record<string, any> = { ...sharedUpdates };
                            
                            // استبدال prefix الأم في name_ar
                            if (updates.name_ar && oldMaterial?.name_ar && child.name_ar) {
                                childUpdates.name_ar = child.name_ar.replace(oldMaterial.name_ar, updates.name_ar);
                            }
                            // استبدال prefix الأم في name_en
                            if (updates.name_en && oldMaterial?.name_en && child.name_en) {
                                childUpdates.name_en = child.name_en.replace(oldMaterial.name_en, updates.name_en);
                            } else if (updates.name_ar && child.name_en) {
                                // إذا لم يكن للأم name_en قديم → استبدال name_ar القديم
                                childUpdates.name_en = child.name_en.replace(oldMaterial?.name_ar || '', updates.name_en || updates.name_ar);
                            }

                            if (Object.keys(childUpdates).length > 0) {
                                await supabase
                                    .from('fabric_materials')
                                    .update(childUpdates)
                                    .eq('id', child.id);
                            }
                        }
                    } else if (Object.keys(sharedUpdates).length > 0) {
                        // تحديث جماعي للخصائص المشتركة فقط (بدون أسماء)
                        const childIds = children.map(c => c.id);
                        await supabase
                            .from('fabric_materials')
                            .update(sharedUpdates)
                            .in('id', childIds);
                    }
                }
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
            // 1. تحقق إن كانت مادة أم لها فرعيات
            const { data: children } = await supabase
                .from('fabric_materials')
                .select('id, variant_id')
                .eq('parent_material_id', id);

            if (children && children.length > 0) {
                // 2. حذف المتغيرات من product_variants أولاً
                const variantIds = children.map(c => c.variant_id).filter(Boolean);
                if (variantIds.length > 0) {
                    await supabase
                        .from('product_variants')
                        .delete()
                        .in('id', variantIds);
                }
                // أيضاً حذف أي متغيرات مرتبطة بالأم مباشرة
                await supabase
                    .from('product_variants')
                    .delete()
                    .eq('product_id', id);

                // 3. حذف المواد الفرعية من fabric_materials
                const childIds = children.map(c => c.id);
                await supabase
                    .from('fabric_materials')
                    .delete()
                    .in('id', childIds);
            }

            // 4. حذف المادة الأم نفسها
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
        // Skip if table doesn't exist (prevents repeated 404s)
        if (!(await checkTableExists('roll_reservations'))) return [];

        let query = supabase
            .from('roll_reservations')
            .select(`*`)
            .eq('company_id', companyId)
            .order('reserved_at', { ascending: false });

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
     * يشمل: أقمشة، رولونات، كونتينرات، مناقلات، إذون تسليم، فواتير مبيعات
     * ⚡ يجمع من جدولين: inventory_movements + stock_movements (تسليم المبيعات)
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
        // Enhanced SELECT with warehouse joins for display names
        let query = supabase
            .from('inventory_movements')
            .select(`
                *,
                from_warehouse:warehouses!inventory_movements_from_warehouse_id_fkey(id, name_ar, name_en),
                to_warehouse:warehouses!inventory_movements_to_warehouse_id_fkey(id, name_ar, name_en)
            `)
            .eq('company_id', companyId)
            .order('movement_date', { ascending: false });

        if (filters?.warehouseId) {
            query = query.or(`from_warehouse_id.eq.${filters.warehouseId},to_warehouse_id.eq.${filters.warehouseId}`);
        }
        if (filters?.materialId) {
            // inventory_movements uses product_id, not material_id
            query = query.eq('product_id', filters.materialId);
        }
        if (filters?.movementType) {
            query = query.eq('movement_type', filters.movementType);
        }
        // Note: inventory_movements table does NOT have a 'status' column
        // Removed status filter to prevent 400 errors
        if (filters?.dateFrom) {
            query = query.gte('movement_date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('movement_date', filters.dateTo);
        }
        query = query.limit(filters?.limit || 100);

        const { data, error } = await query;

        if (error) {
            if (error.code !== '42P01' && error.code !== '42703' && !error.message.includes('does not exist')) {
                console.warn('getInventoryMovements error:', error.message);
            }
        }

        const allData = data || [];
        if (allData.length === 0) return [];

        // ─── إثراء بأسماء المواد (batch lookup) ─────────────────────────
        const materialIds = [...new Set(allData.map((m: any) => m.material_id || m.product_id).filter(Boolean))];
        let materialsMap: Record<string, any> = {};
        if (materialIds.length > 0) {
            const { data: materials } = await supabase
                .from('fabric_materials')
                .select('id, name_ar, name_en, code')
                .in('id', materialIds);
            if (materials) {
                materials.forEach((mat: any) => { materialsMap[mat.id] = mat; });
            }
        }

        // ─── إثراء بأسماء الجهات ────────────────────────────────────────────
        // مبيعات: reference_id → sales_transactions.id → customer_name
        // شراء:   reference_id → purchase_receipts.invoice_id → purchase_invoices.supplier_name
        // كونتينر: reference_id → purchase_receipts.container_id → containers.supplier_id → parties

        const saleTypes = ['sale', 'sale_invoice', 'issue', 'delivery'];
        const purTypes = ['receipt', 'purchase', 'container_receipt', 'goods_receipt', 'container'];

        // ── أ) مبيعات: UUID مباشر (includes transfer_out from sales) ──
        const saleRefIds = [...new Set(
            allData
                .filter((m: any) => saleTypes.includes(m.movement_type) || m.reference_type === 'sale_invoice')
                .map((m: any) => m.reference_id)
                .filter(Boolean)
        )] as string[];

        // salesPartyMap: reference_id → customer name
        // salesMetaMap: reference_id → { delivery_method, receiving_branch_name, warehouse_name }
        const salesPartyMap: Record<string, string> = {};
        const salesMetaMap: Record<string, { delivery_method?: string; receiving_branch_name?: string }> = {};
        if (saleRefIds.length > 0) {
            const { data: stx } = await supabase
                .from('sales_transactions')
                .select('id, customer_name, customer_id, delivery_method, receiving_branch_name')
                .in('id', saleRefIds);
            
            if (stx && stx.length > 0) {
                // Collect customer_ids that need name resolution (where customer_name is empty)
                const needNameIds = [...new Set(
                    stx.filter((s: any) => !s.customer_name && s.customer_id)
                       .map((s: any) => s.customer_id)
                )] as string[];
                
                // Batch lookup: customer_id → customers.name_ar/name_en
                const customerNameMap: Record<string, string> = {};
                if (needNameIds.length > 0) {
                    const { data: custs } = await supabase
                        .from('customers')
                        .select('id, name_ar, name_en, company_name')
                        .in('id', needNameIds);
                    custs?.forEach((c: any) => {
                        customerNameMap[c.id] = c.name_ar || c.name_en || c.company_name || '';
                    });
                }
                
                stx.forEach((s: any) => {
                    // Resolve customer name: direct field → customers table fallback
                    salesPartyMap[s.id] = s.customer_name || customerNameMap[s.customer_id] || '';
                    // Store delivery metadata
                    salesMetaMap[s.id] = {
                        delivery_method: s.delivery_method || undefined,
                        receiving_branch_name: s.receiving_branch_name || undefined,
                    };
                });
            }
        }

        // ── ب) شراء/كونتينر: UUID → purchase_receipts ──
        const purRefIds = [...new Set(
            allData
                .filter((m: any) => purTypes.includes(m.movement_type) || purTypes.includes(m.reference_type))
                .map((m: any) => m.reference_id)
                .filter(Boolean)
        )] as string[];

        const purPartyMap: Record<string, string> = {};
        if (purRefIds.length > 0) {
            // purchase_receipts: تحتوي invoice_id و container_id (ليس supplier_id مباشرة)
            const { data: rcpts } = await supabase
                .from('purchase_receipts')
                .select('id, invoice_id, container_id')
                .in('id', purRefIds);

            if (rcpts && rcpts.length > 0) {
                // 1) invoice_id → purchase_invoices / purchase_transactions → supplier_name
                const iidList = [...new Set(rcpts.map((r: any) => r.invoice_id).filter(Boolean))] as string[];
                const supplierByInvId: Record<string, string> = {};
                if (iidList.length > 0) {
                    const { data: pi } = await supabase.from('purchase_invoices').select('id, supplier_name').in('id', iidList);
                    pi?.forEach((r: any) => { supplierByInvId[r.id] = r.supplier_name || ''; });
                    const { data: pt } = await supabase.from('purchase_transactions').select('id, supplier_name').in('id', iidList);
                    pt?.forEach((r: any) => { if (!supplierByInvId[r.id]) supplierByInvId[r.id] = r.supplier_name || ''; });
                }

                // 2) container_id → containers.supplier_id → parties.name_ar
                const cidList = [...new Set(rcpts.map((r: any) => r.container_id).filter(Boolean))] as string[];
                const supplierByContId: Record<string, string> = {};
                if (cidList.length > 0) {
                    const { data: conts } = await supabase.from('containers').select('id, supplier_id').in('id', cidList);
                    if (conts && conts.length > 0) {
                        const supIds = [...new Set(conts.map((c: any) => c.supplier_id).filter(Boolean))] as string[];
                        if (supIds.length > 0) {
                            const { data: parties } = await supabase.from('parties').select('id, name_ar, name_en').in('id', supIds);
                            const pm: Record<string, string> = {};
                            parties?.forEach((p: any) => { pm[p.id] = p.name_ar || p.name_en || ''; });
                            conts.forEach((c: any) => { supplierByContId[c.id] = pm[c.supplier_id] || ''; });
                        }
                    }
                }

                rcpts.forEach((r: any) => {
                    purPartyMap[r.id] = supplierByInvId[r.invoice_id] || supplierByContId[r.container_id] || '';
                });
            }
        }

        // ─── إثراء بعدد رولونات إذن الاستلام (من fabric_rolls) ───────
        // ⚡ FIX: Batched parallel queries instead of sequential N+1 loop
        //    Before: 1 query per reference_id (50 movements = 50 sequential queries)
        //    After:  parallel batches of 10 (50 movements = 5 parallel batches)
        const receiptRefIds = [...new Set(allData.map((m: any) => m.reference_id).filter(Boolean))] as string[];
        const receiptRollsMap: Record<string, number> = {};
        if (receiptRefIds.length > 0) {
            const BATCH_SIZE = 10;
            for (let i = 0; i < receiptRefIds.length; i += BATCH_SIZE) {
                const batch = receiptRefIds.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(
                    batch.map(refId =>
                        supabase
                            .from('fabric_rolls')
                            .select('id', { count: 'exact', head: true })
                            .ilike('notes', `%${refId}%`)
                    )
                );
                results.forEach((result, idx) => {
                    if (result.count && result.count > 0) {
                        receiptRollsMap[batch[idx]] = result.count;
                    }
                });
            }
        }

        return allData.map((m: any) => ({
            ...m,
            from_warehouse_name: m.from_warehouse?.name_ar ?? m.from_warehouse?.name_en ?? null,
            to_warehouse_name: m.to_warehouse?.name_ar ?? m.to_warehouse?.name_en ?? null,
            warehouse_name: m.to_warehouse?.name_ar ?? m.to_warehouse?.name_en ??
                m.from_warehouse?.name_ar ?? m.from_warehouse?.name_en ?? null,
            material_name_ar: materialsMap[m.material_id || m.product_id]?.name_ar || null,
            material_name_en: materialsMap[m.material_id || m.product_id]?.name_en || null,
            material_code: materialsMap[m.material_id || m.product_id]?.code || null,
            // 🔑 اسم الجهة: عميل للمبيعات، مورّد للمشتريات
            party_name: salesPartyMap[m.reference_id] || purPartyMap[m.reference_id] || '',
            // 🔑 بيانات إضافية للمبيعات (طريقة التسليم، اسم فرع الاستلام)
            delivery_method: salesMetaMap[m.reference_id]?.delivery_method || null,
            receiving_branch_name: salesMetaMap[m.reference_id]?.receiving_branch_name || null,
            // 🔑 عدد رولونات إذن الاستلام
            receipt_rolls_count: receiptRollsMap[m.reference_id] || 0,
        }));
    },


    /**
     * Get pending receipts (posted invoices / confirmed orders awaiting receipt)
     * Enhanced: includes linked purchase_receipt data for draft resumption
     */
    async getPendingReceipts(companyId: string): Promise<any[]> {
        const pending: any[] = [];
        const seenIds = new Set<string>();

        // Pre-fetch supplier names for resolution
        let supplierNames: Record<string, string> = {};
        const { data: suppliersData } = await supabase
            .from('suppliers')
            .select('id, name_ar, name_en, company_name')
            .eq('company_id', companyId);
        if (suppliersData) {
            suppliersData.forEach((s: any) => {
                supplierNames[s.id] = s.name_ar || s.name_en || s.company_name || '';
            });
        }

        // ← container_items uses tenant_id not company_id; we'll filter after building allInvoiceIds
        let invoiceIdsInContainers = new Set<string>();

        // ═══════════════════════════════════════════════════════════
        // 1a. Fetch from purchase_invoices (NEW unified table)
        // ═══════════════════════════════════════════════════════════
        const { data: newInvoices, error: newInvError } = await supabase
            .from('purchase_invoices')
            .select('id, invoice_number, invoice_date, due_date, supplier_name, supplier_id, total_amount, currency, document_stage, status, receipt_status, receipt_mode, container_id, created_at, updated_at')
            .eq('company_id', companyId)
            .neq('status', 'cancelled')
            .neq('status', 'draft')
            .in('document_stage', ['invoice', 'posted', 'confirmed'])
            .not('receipt_status', 'eq', 'received')
            .is('container_id', null)           // ← exclude invoices with container_id set directly
            .order('invoice_date', { ascending: false });

        if (newInvError) {
            console.error('getPendingReceipts [purchase_invoices] error:', newInvError);
        }

        // 1b. Fallback: Fetch from purchase_transactions (ARCHIVED legacy table)
        const { data: legacyInvoices, error: legacyInvError } = await supabase
            .from('purchase_transactions')
            .select('id, invoice_no, doc_date, invoice_date, supplier_name, supplier_id, total_amount, currency, stage, container_id, created_at, updated_at')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .in('stage', ['confirmed', 'posted', 'partial_paid', 'partially_received'])
            .is('container_id', null)           // ← skip transactions assigned to containers
            .order('doc_date', { ascending: false });

        if (legacyInvError) {
            console.error('getPendingReceipts [purchase_transactions] error:', legacyInvError);
        }

        // ═══════════════════════════════════════════════════════════
        // 2. Fetch Confirmed Purchase Orders (from purchase_invoices with document_stage='order')
        //    + standalone purchase_orders table
        // ═══════════════════════════════════════════════════════════
        const { data: orders, error: ordError } = await supabase
            .from('purchase_orders')
            .select('id, order_number, order_date, supplier_name, total_amount, currency, status, created_at, updated_at')
            .eq('company_id', companyId)
            .in('status', ['confirmed', 'partially_received'])
            .order('order_date', { ascending: false });

        if (ordError) {
            console.error('getPendingReceipts PO error:', ordError);
        }

        // ═══════════════════════════════════════════════════════════
        // 3. Build combined invoice ID list & fetch related receipts
        // ═══════════════════════════════════════════════════════════
        const allInvoiceIds = [
            ...(newInvoices || []).map((i: any) => i.id),
            ...(legacyInvoices || []).map((i: any) => i.id),
        ];
        const orderIds = (orders || []).map((o: any) => o.id);

        // Now fetch which invoice IDs from our list appear in container_items
        // (container_items has tenant_id not company_id, so filter by known IDs)
        if (allInvoiceIds.length > 0) {
            const { data: cInvIds } = await supabase
                .from('container_items')
                .select('purchase_invoice_id')
                .in('purchase_invoice_id', allInvoiceIds)
                .not('purchase_invoice_id', 'is', null);
            if (cInvIds) {
                cInvIds.forEach((r: any) => {
                    if (r.purchase_invoice_id) invoiceIdsInContainers.add(r.purchase_invoice_id);
                });
            }
        }

        let receiptsMap: Record<string, any> = {};

        // Fetch receipts linked to invoices
        if (allInvoiceIds.length > 0) {
            const { data: invReceipts } = await supabase
                .from('purchase_receipts')
                .select('id, receipt_number, receipt_date, status, invoice_id, order_id, warehouse_id, created_at')
                .eq('company_id', companyId)
                .in('invoice_id', allInvoiceIds)
                .order('created_at', { ascending: false });

            if (invReceipts) {
                invReceipts.forEach((r: any) => {
                    if (!receiptsMap[r.invoice_id] || r.status === 'draft') {
                        receiptsMap[r.invoice_id] = r;
                    }
                });
            }
        }

        // Fetch receipts linked to orders
        if (orderIds.length > 0) {
            const { data: ordReceipts } = await supabase
                .from('purchase_receipts')
                .select('id, receipt_number, receipt_date, status, invoice_id, order_id, warehouse_id, created_at')
                .eq('company_id', companyId)
                .in('order_id', orderIds)
                .order('created_at', { ascending: false });

            if (ordReceipts) {
                ordReceipts.forEach((r: any) => {
                    if (!receiptsMap[r.order_id] || r.status === 'draft') {
                        receiptsMap[r.order_id] = r;
                    }
                });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 4a. Build pending list — NEW purchase_invoices (priority)
        // ═══════════════════════════════════════════════════════════
        if (newInvoices) {
            newInvoices.forEach((inv: any) => {
                // Skip invoices that are linked to a container via container_items
                if (invoiceIdsInContainers.has(inv.id)) return;

                seenIds.add(inv.id);
                const linkedReceipt = receiptsMap[inv.id];
                const docNumber = inv.invoice_number || inv.id?.substring(0, 8);
                const stage = inv.document_stage || inv.status || 'draft';
                pending.push({
                    id: inv.id,
                    type: 'purchase',
                    reference: docNumber,
                    reference_label: `Invoice #${docNumber}`,
                    description: inv.supplier_name || supplierNames[inv.supplier_id] || '',
                    supplier_name: inv.supplier_name || supplierNames[inv.supplier_id] || '',
                    status: inv.receipt_status === 'partial' ? 'partial' : 'ready',
                    invoice_status: stage,
                    items: 0,
                    itemsUnit: 'items',
                    arrivalDate: inv.invoice_date,
                    source_type: 'invoice',
                    source_id: inv.id,
                    source_table: 'purchase_invoices', // ← track source
                    total_amount: inv.total_amount,
                    currency: inv.currency,
                    receipt_id: linkedReceipt?.id || null,
                    receipt_number: linkedReceipt?.receipt_number || null,
                    receipt_status: linkedReceipt?.status || 'none',
                    receipt_date: linkedReceipt?.receipt_date || linkedReceipt?.created_at || null,
                    pending_since: inv.updated_at || inv.created_at || inv.invoice_date,
                    receipt_created_at: linkedReceipt?.created_at || null,
                    created_at: inv.created_at,
                });
            });
        }

        // ═══════════════════════════════════════════════════════════
        // 4b. Build pending list — LEGACY purchase_transactions (fallback)
        // ═══════════════════════════════════════════════════════════
        if (legacyInvoices) {
            legacyInvoices.forEach((inv: any) => {
                // Skip if already added from new table
                if (seenIds.has(inv.id)) return;
                // Skip legacy invoices linked to containers via container_items
                if (invoiceIdsInContainers.has(inv.id)) return;
                seenIds.add(inv.id);
                const linkedReceipt = receiptsMap[inv.id];
                const docNumber = inv.invoice_no || inv.id?.substring(0, 8);
                pending.push({
                    id: inv.id,
                    type: 'purchase',
                    reference: docNumber,
                    reference_label: `Invoice #${docNumber}`,
                    description: inv.supplier_name || supplierNames[inv.supplier_id] || '',
                    supplier_name: inv.supplier_name || supplierNames[inv.supplier_id] || '',
                    status: inv.stage === 'partially_received' ? 'partial' : 'ready',
                    invoice_status: inv.stage,
                    items: 0,
                    itemsUnit: 'items',
                    arrivalDate: inv.doc_date || inv.invoice_date,
                    source_type: 'invoice',
                    source_id: inv.id,
                    source_table: 'purchase_transactions', // ← legacy
                    total_amount: inv.total_amount,
                    currency: inv.currency,
                    receipt_id: linkedReceipt?.id || null,
                    receipt_number: linkedReceipt?.receipt_number || null,
                    receipt_status: linkedReceipt?.status || 'none',
                    receipt_date: linkedReceipt?.receipt_date || linkedReceipt?.created_at || null,
                    pending_since: inv.updated_at || inv.created_at || inv.doc_date,
                    receipt_created_at: linkedReceipt?.created_at || null,
                    created_at: inv.created_at,
                });
            });
        }

        // ═══════════════════════════════════════════════════════════
        // 5. Build pending list — Purchase Orders
        // ═══════════════════════════════════════════════════════════
        if (orders) {
            orders.forEach((ord: any) => {
                const linkedReceipt = receiptsMap[ord.id];
                pending.push({
                    id: ord.id,
                    type: 'purchase',
                    reference: ord.order_number,
                    reference_label: `PO #${ord.order_number}`,
                    description: ord.supplier_name || supplierNames[ord.supplier_id] || '',
                    supplier_name: ord.supplier_name || supplierNames[ord.supplier_id] || '',
                    status: ord.status === 'partially_received' ? 'partial' : 'shipped',
                    invoice_status: ord.status,
                    items: 0,
                    itemsUnit: 'items',
                    arrivalDate: ord.order_date,
                    source_type: 'order',
                    source_id: ord.id,
                    source_table: 'purchase_orders',
                    total_amount: ord.total_amount,
                    currency: ord.currency,
                    receipt_id: linkedReceipt?.id || null,
                    receipt_number: linkedReceipt?.receipt_number || null,
                    receipt_status: linkedReceipt?.status || 'none',
                    receipt_date: linkedReceipt?.receipt_date || linkedReceipt?.created_at || null,
                    pending_since: ord.updated_at || ord.created_at || ord.order_date,
                    receipt_created_at: linkedReceipt?.created_at || null,
                    created_at: ord.created_at,
                });
            });
        }

        // ═══════════════════════════════════════════════════════════
        // 6. Build pending list — Containers (الكونتينرات)
        //    Stages ready for receipt: at_port, customs, cleared
        // ═══════════════════════════════════════════════════════════
        const { data: containers, error: containerError } = await supabase
            .from('containers')
            .select('id, container_number, container_name, supplier_id, status, arrival_date, expected_arrival_date, total_purchase_value, currency, receiving_warehouse_id')
            .eq('company_id', companyId)
            .in('status', ['customs', 'cleared', 'at_port', 'in_receiving', 'receiving'])
            .order('created_at', { ascending: false });

        if (containerError) {
            console.error('getPendingReceipts [containers] error:', containerError);
        }

        // Fetch receipts linked to containers (stored in container_id column)
        const containerIds = (containers || []).map((c: any) => c.id);
        if (containerIds.length > 0) {
            const { data: containerReceipts } = await supabase
                .from('purchase_receipts')
                .select('id, receipt_number, receipt_date, status, container_id, created_at')
                .eq('company_id', companyId)
                .in('container_id', containerIds)
                .order('created_at', { ascending: false });

            if (containerReceipts) {
                containerReceipts.forEach((r: any) => {
                    if (!receiptsMap[r.container_id] || r.status === 'draft') {
                        receiptsMap[r.container_id] = r;
                    }
                });
            }
        }

        if (containers) {
            containers.forEach((c: any) => {
                const linkedReceipt = receiptsMap[c.id];
                const containerLabel = c.container_number || c.container_name || c.id?.substring(0, 8);
                const resolvedSupplier = supplierNames[c.supplier_id] || '';
                pending.push({
                    id: c.id,
                    type: 'container',
                    reference: containerLabel,
                    reference_label: `Container ${containerLabel}`,
                    description: resolvedSupplier || containerLabel,
                    supplier_name: resolvedSupplier,
                    status: ['at_port', 'customs', 'cleared'].includes(c.status) ? 'ready' : 'in_transit',
                    invoice_status: c.status,
                    items: 0,
                    itemsUnit: 'items',
                    arrivalDate: c.arrival_date || c.expected_arrival_date,
                    source_type: 'container',
                    source_id: c.id,
                    source_table: 'containers',
                    total_amount: c.total_purchase_value || 0,
                    currency: c.currency,
                    receipt_id: linkedReceipt?.id || null,
                    receipt_number: linkedReceipt?.receipt_number || null,
                    receipt_status: linkedReceipt?.status || 'none',
                    receipt_date: linkedReceipt?.receipt_date || linkedReceipt?.created_at || null,
                    pending_since: c.updated_at || c.arrival_date || c.created_at,
                    receipt_created_at: linkedReceipt?.created_at || null,
                    receiving_warehouse_id: c.receiving_warehouse_id,
                });
            });
        }

        // ═══════════════════════════════════════════════════════════
        // 7. SALES DELIVERIES — Confirmed sales invoices pending delivery
        //    فواتير المبيعات المؤكدة بانتظار التسليم
        // ═══════════════════════════════════════════════════════════
        try {
            const { data: salesInvoices, error: salesError } = await supabase
                .from('sales_transactions')
                .select('id, invoice_no, draft_no, doc_date, customer_id, customer_name, total_amount, currency, stage, warehouse_id, delivery_draft, delivery_method, receiving_branch_name, created_at, updated_at')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .in('stage', ['confirmed', 'in_delivery', 'in_transit', 'sent_to_branch', 'at_branch'])  // Confirmed + being loaded + in transit to branch
                .order('updated_at', { ascending: false });

            if (salesError) {
                console.warn('getPendingReceipts [sales_transactions] error:', salesError.message);
            }

            if (salesInvoices && salesInvoices.length > 0) {
                // Pre-fetch customer names
                const customerIds = [...new Set(salesInvoices.map((s: any) => s.customer_id).filter(Boolean))];
                let customerNames: Record<string, string> = {};
                if (customerIds.length > 0) {
                    const { data: customers } = await supabase
                        .from('customers')
                        .select('id, name_ar, name_en')
                        .in('id', customerIds);
                    if (customers) {
                        customers.forEach((c: any) => {
                            customerNames[c.id] = c.name_ar || c.name_en || '';
                        });
                    }
                }

                salesInvoices.forEach((inv: any) => {
                    const docNumber = inv.invoice_no || inv.draft_no || inv.id?.substring(0, 8);
                    const customerDisplay = inv.customer_name || customerNames[inv.customer_id] || '';
                    pending.push({
                        id: inv.id,
                        type: 'sale_invoice',
                        source_type: 'sale_invoice',
                        reference: docNumber,
                        reference_label: `Sales #${docNumber}`,
                        description: customerDisplay,
                        supplier_name: customerDisplay, // re-use field for display
                        status: 'ready',
                        invoice_status: inv.stage || 'confirmed',
                        stage: inv.stage || 'confirmed',
                        delivery_draft: inv.delivery_draft || null,
                        delivery_method: inv.delivery_method || null,
                        items: 0,
                        itemsUnit: 'items',
                        arrivalDate: inv.doc_date,
                        source_id: inv.id,
                        source_table: 'sales_transactions',
                        total_amount: inv.total_amount,
                        currency: inv.currency,
                        receipt_id: null,
                        receipt_number: null,
                        receipt_status: inv.stage === 'in_delivery' ? 'in_progress'
                            : ['in_transit', 'sent_to_branch'].includes(inv.stage) ? 'in_progress'
                            : inv.stage === 'at_branch' ? 'completed'
                            : 'none',
                        receiving_branch_name: inv.receiving_branch_name || '',
                        receipt_date: null,
                        pending_since: inv.updated_at || inv.created_at,
                        receipt_created_at: null,
                        warehouse_id: inv.warehouse_id,
                        created_at: inv.created_at,
                    });
                });
            }
        } catch (err: any) {
            console.warn('getPendingReceipts [sales] exception:', err?.message);
        }

        // ═══════════════════════════════════════════════════════════
        // 8. STOCK TRANSFERS — Confirmed/Loading/Shipped transfers
        //    مناقلات مؤكدة بانتظار التسليم أو الاستلام
        // ═══════════════════════════════════════════════════════════
        try {
            const { data: transfers, error: transferError } = await supabase
                .from('stock_transfers')
                .select('*')
                .eq('company_id', companyId)
                .in('status', ['confirmed', 'loading', 'shipped'])
                .order('updated_at', { ascending: false });

            if (transferError) {
                console.warn('getPendingReceipts [stock_transfers] error:', transferError.message);
            }

            if (transfers && transfers.length > 0) {
                // Pre-fetch warehouse names
                const whIds = [...new Set([
                    ...transfers.map((t: any) => t.from_warehouse_id),
                    ...transfers.map((t: any) => t.to_warehouse_id),
                ].filter(Boolean))];

                let warehouseNames: Record<string, string> = {};
                if (whIds.length > 0) {
                    const { data: whs } = await supabase
                        .from('warehouses')
                        .select('id, name_ar, name_en')
                        .in('id', whIds);
                    if (whs) {
                        whs.forEach((w: any) => {
                            warehouseNames[w.id] = w.name_ar || w.name_en || '';
                        });
                    }
                }

                // Pre-fetch item counts per transfer
                const transferIds = transfers.map((t: any) => t.id);
                let itemCountMap: Record<string, number> = {};
                if (transferIds.length > 0) {
                    const { data: items } = await supabase
                        .from('stock_transfer_items')
                        .select('transfer_id')
                        .in('transfer_id', transferIds);
                    if (items) {
                        items.forEach((item: any) => {
                            itemCountMap[item.transfer_id] = (itemCountMap[item.transfer_id] || 0) + 1;
                        });
                    }
                }

                transfers.forEach((t: any) => {
                    const fromName = warehouseNames[t.from_warehouse_id] || '';
                    const toName = warehouseNames[t.to_warehouse_id] || '';
                    const docNumber = t.transfer_number || t.id?.substring(0, 8);

                    pending.push({
                        id: t.id,
                        type: 'transfer',
                        source_type: 'transfer',
                        reference: docNumber,
                        reference_label: `Transfer #${docNumber}`,
                        description: `${fromName} \u200E\u2192\u200E ${toName}`,
                        supplier_name: `${fromName} \u200E\u2192\u200E ${toName}`, // re-use for display
                        status: t.status === 'shipped' ? 'in_transit' : 'ready',
                        invoice_status: t.status,
                        stage: t.status,
                        items: itemCountMap[t.id] || t.total_rolls || 0,
                        itemsUnit: 'items',
                        arrivalDate: t.transfer_date,
                        source_id: t.id,
                        source_table: 'stock_transfers',
                        total_amount: 0, // Transfers don't have monetary value
                        currency: '',
                        receipt_id: null,
                        receipt_number: null,
                        receipt_status: t.status === 'shipped' ? 'in_progress' : 'none',
                        receipt_date: null,
                        pending_since: t.confirmed_at || t.updated_at || t.created_at,
                        receipt_created_at: null,
                        from_warehouse_id: t.from_warehouse_id,
                        to_warehouse_id: t.to_warehouse_id,
                        from_warehouse_name: fromName,
                        to_warehouse_name: toName,
                        total_meters: t.total_meters,
                        created_at: t.created_at,
                    });
                });
            }
        } catch (err: any) {
            console.warn('getPendingReceipts [transfers] exception:', err?.message);
        }

        return pending;
    },

    // ═══════════════════════════════════════════════════════════════
    // DRAFT RECEIPT MANAGEMENT (إدارة مسودات الاستلام)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create a draft receipt in the database (persists across sessions/power outages)
     */
    async createDraftReceipt(params: {
        tenantId: string;
        companyId: string;
        branchId?: string;
        warehouseId: string;
        sourceDocumentId: string;
        sourceDocumentType: 'purchase_order' | 'purchase_invoice' | 'purchase_invoice_local' | 'purchase_transaction' | 'container';
        supplierId?: string;
        items: any[];
        createdBy?: string;
    }): Promise<{ id: string; receiptNumber: string } | null> {
        const isOrder = params.sourceDocumentType === 'purchase_order';
        const isContainer = params.sourceDocumentType === 'container';
        const isInvoice = !isOrder && !isContainer;

        // ══════════════════════════════════════════════════════════
        // 🛡️ DUPLICATE GUARD — prevent creating multiple receipts
        //    for the same source document
        // ══════════════════════════════════════════════════════════
        const matchField = isContainer ? 'container_id'
            : isOrder ? 'order_id'
                : 'invoice_id';

        const { data: existingReceipts } = await supabase
            .from('purchase_receipts')
            .select('id, receipt_number, status')
            .eq('company_id', params.companyId)
            .eq(matchField, params.sourceDocumentId)
            .not('status', 'in', '("cancelled","rejected")');

        if (existingReceipts && existingReceipts.length > 0) {
            const existing = existingReceipts[0];

            // If there's an active draft → resume it (return it instead of creating)
            if (existing.status === 'draft' || existing.status === 'in_progress') {
                console.log('🔄 Resuming existing draft receipt:', existing.receipt_number);
                return { id: existing.id, receiptNumber: existing.receipt_number };
            }

            // If already completed → block creation
            if (existing.status === 'completed') {
                console.warn('⛔ Receipt already completed for this document:', existing.receipt_number);
                throw new Error(
                    `تم استلام هذه الوثيقة مسبقاً (${existing.receipt_number}). لا يمكن تكرار الاستلام.`
                );
            }
        }
        // ══════════════════════════════════════════════════════════

        const receiptNumber = `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const { data, error } = await supabase
            .from('purchase_receipts')
            .insert({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                branch_id: params.branchId || null,
                receipt_number: receiptNumber,
                receipt_date: new Date().toISOString().split('T')[0],
                receipt_type: isContainer ? 'container' : 'direct',
                order_id: isOrder ? params.sourceDocumentId : null,
                invoice_id: isInvoice ? params.sourceDocumentId : null,
                container_id: isContainer ? params.sourceDocumentId : null,
                supplier_id: params.supplierId || null,
                warehouse_id: params.warehouseId,
                status: 'draft',
                draft_data: {
                    items: params.items,
                    savedAt: new Date().toISOString(),
                    started_at: new Date().toISOString(),
                    started_by: params.createdBy || null,
                },
                notes: 'Draft receipt - in progress',
                created_by: params.createdBy || null,
            })
            .select('id, receipt_number')
            .single();

        if (error) {
            console.error('❌ Failed to create draft receipt:', error.message);
            return null;
        }

        // 🎛️ Tell DSS: receipt started — updates all linked documents atomically
        if (data?.id) {
            const docType = isContainer ? 'container'
                : isOrder ? 'purchase_order'
                    : params.sourceDocumentType === 'purchase_transaction' ? 'purchase_transaction'
                        : 'purchase_invoice';

            const dssResult = await DSS.onReceiptStarted({
                documentType: docType,
                documentId: params.sourceDocumentId,
                companyId: params.companyId,
                receiptId: data.id,
            });
            if (dssResult.success) {
                console.log('🎛️ [DSS] Receipt started — updated:', dssResult.updatedTables.join(', '));
            } else {
                console.warn('⚠️ [DSS] onReceiptStarted partial failure:', dssResult.error);
            }
        }

        console.log('📝 Draft receipt created:', data?.id);
        return data ? { id: data.id, receiptNumber: data.receipt_number } : null;
    },

    /**
     * Update draft receipt items (auto-save during editing)
     */
    async updateDraftReceipt(receiptId: string, items: any[]): Promise<boolean> {
        // First fetch existing draft_data to preserve started_at
        const { data: existing } = await supabase
            .from('purchase_receipts')
            .select('draft_data')
            .eq('id', receiptId)
            .maybeSingle();

        const prevData = (existing?.draft_data as any) || {};

        const { error } = await supabase
            .from('purchase_receipts')
            .update({
                draft_data: {
                    items,
                    savedAt: new Date().toISOString(),
                    started_at: prevData.started_at || new Date().toISOString(),
                    started_by: prevData.started_by || null,
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', receiptId)
            .eq('status', 'draft');

        if (error) {
            console.error('❌ Failed to update draft receipt:', error.message);
            return false;
        }

        return true;
    },

    /**
     * Load draft receipt items from database
     */
    async getDraftReceiptItems(receiptId: string): Promise<{ items: any[]; savedAt: string } | null> {
        const { data, error } = await supabase
            .from('purchase_receipts')
            .select('id, draft_data, warehouse_id')
            .eq('id', receiptId)
            .eq('status', 'draft')
            .maybeSingle();

        if (error || !data?.draft_data) {
            return null;
        }

        return {
            items: (data.draft_data as any)?.items || [],
            savedAt: (data.draft_data as any)?.savedAt || '',
        };
    },

    /**
     * 🔄 Reverse a receipt's journal entry (called before deleting any receipt)
     * يعكس القيد المحاسبي لإذن الاستلام لحماية سلامة البيانات المالية
     */
    async reverseReceiptJournalEntry(receiptId: string): Promise<boolean> {
        try {
            // Fetch the receipt and its journal entry
            const { data: receipt } = await supabase
                .from('purchase_receipts')
                .select('id, receipt_number, journal_entry_id, tenant_id, company_id')
                .eq('id', receiptId)
                .maybeSingle();

            if (!receipt?.journal_entry_id) {
                console.log('ℹ️ Receipt has no journal_entry_id — no reversal needed');
                return true;
            }

            const jeId = receipt.journal_entry_id;

            // Check if reversal already exists
            const { data: existingRev } = await supabase
                .from('journal_entries')
                .select('id, entry_number')
                .ilike('entry_number', `REV-GRN-%`)
                .ilike('description', `%${receipt.receipt_number}%`)
                .limit(1);

            if (existingRev?.length) {
                console.log('ℹ️ Reversal already exists:', existingRev[0].entry_number);
                return true;
            }

            // Get original journal entry
            const { data: origEntry } = await supabase
                .from('journal_entries')
                .select('id, entry_number, entry_date, description, total_debit, total_credit, tenant_id, company_id')
                .eq('id', jeId)
                .single();

            if (!origEntry) {
                console.warn('⚠️ Original journal entry not found:', jeId);
                return true; // non-fatal
            }

            // Get user
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            // Create reversal entry
            const reversalNumber = `REV-${origEntry.entry_number}`;
            const { data: revEntry, error: revErr } = await supabase
                .from('journal_entries')
                .insert({
                    tenant_id: origEntry.tenant_id || receipt.tenant_id,
                    company_id: origEntry.company_id || receipt.company_id,
                    entry_number: reversalNumber,
                    entry_date: new Date().toISOString().split('T')[0],
                    description: `إبطال قيد استلام محذوف — ${origEntry.entry_number} (${receipt.receipt_number})`,
                    status: 'posted',
                    total_debit: Number(origEntry.total_credit || 0),
                    total_credit: Number(origEntry.total_debit || 0),
                    created_by: user?.id,
                    notes: `Auto-reversal on receipt deletion. Original: ${origEntry.entry_number}`,
                })
                .select('id')
                .single();

            if (revErr || !revEntry) {
                console.error('❌ Failed to create reversal entry:', revErr?.message);
                return false;
            }

            // Get original lines and reverse them
            const { data: origLines } = await supabase
                .from('journal_entry_lines')
                .select('account_id, debit, credit, currency, exchange_rate, description, tenant_id')
                .eq('entry_id', jeId);

            if (origLines?.length) {
                const reversalLines = origLines.map(l => ({
                    tenant_id: l.tenant_id,
                    entry_id: revEntry.id,
                    account_id: l.account_id,
                    debit: Number(l.credit || 0),   // Swap debit ↔ credit
                    credit: Number(l.debit || 0),
                    currency: l.currency || 'USD',
                    exchange_rate: l.exchange_rate || 1,
                    description: `عكس: ${l.description || origEntry.description}`,
                }));

                const { error: rlErr } = await supabase
                    .from('journal_entry_lines')
                    .insert(reversalLines);

                if (rlErr) {
                    console.error('❌ Failed to insert reversal lines:', rlErr.message);
                } else {
                    console.log(`✅ Reversal entry created: ${reversalNumber} (${reversalLines.length} lines)`);
                }
            }

            // Mark original entry as reversed
            await supabase
                .from('journal_entries')
                .update({
                    status: 'voided',
                    description: `${origEntry.description} [مُبطَل - استلام محذوف]`,
                    notes: `Reversed by ${reversalNumber}`,
                })
                .eq('id', jeId);

            return true;
        } catch (err: any) {
            console.error('❌ reverseReceiptJournalEntry error:', err?.message);
            return false; // non-fatal — deletion can still proceed
        }
    },

    /**
      * Delete a draft receipt (when user cancels) and unlock the source document
     */
    async deleteDraftReceipt(receiptId: string): Promise<boolean> {
        // First, fetch the draft to know which source document to unlock
        const { data: draft, error: fetchErr } = await supabase
            .from('purchase_receipts')
            .select('id, invoice_id, order_id, container_id, company_id, journal_entry_id, status')
            .eq('id', receiptId)
            .maybeSingle();

        if (fetchErr || !draft) {
            console.error('❌ Failed to find draft receipt for deletion:', fetchErr?.message);
            return false;
        }

        // 🔄 CRITICAL: Reverse journal entry BEFORE deletion (prevents orphaned accounting entries)
        // This applies even to drafts that may have had a journal entry created
        if (draft.journal_entry_id) {
            console.log('🔄 Reversing journal entry before receipt deletion...');
            await this.reverseReceiptJournalEntry(receiptId);
        }

        // Delete ALL drafts for this source document (cleans up any older duplicate/ghost drafts)
        let query = supabase.from('purchase_receipts').delete().eq('status', 'draft');

        if (draft.container_id) query = query.eq('container_id', draft.container_id);
        else if (draft.invoice_id) query = query.eq('invoice_id', draft.invoice_id);
        else if (draft.order_id) query = query.eq('order_id', draft.order_id);
        else query = query.eq('id', receiptId);

        const { error } = await query;

        if (error) {
            console.error('❌ Failed to delete draft receipt:', error.message);
            return false;
        }

        // 🔓 Unlock source document via DSS (centralized reversal)
        try {
            const companyId = draft.company_id;
            if (companyId) {
                if (draft.container_id) {
                    await DSS.onReceiptCancelled({
                        documentType: 'container',
                        documentId: draft.container_id,
                        companyId,
                        receiptId,
                        hadPreviousReceipts: false,
                    });
                } else if (draft.invoice_id) {
                    await DSS.onReceiptCancelled({
                        documentType: 'purchase_invoice',
                        documentId: draft.invoice_id,
                        companyId,
                        receiptId,
                        hadPreviousReceipts: false,
                    });
                } else if (draft.order_id) {
                    await DSS.onReceiptCancelled({
                        documentType: 'purchase_order',
                        documentId: draft.order_id,
                        companyId,
                        receiptId,
                        hadPreviousReceipts: false,
                    });
                }
            }
            console.log('🔓 Source document unlocked via DSS after draft deletion');
        } catch (unlockErr) {
            console.warn('⚠️ DSS unlock failed (non-fatal):', unlockErr);
        }

        console.log('🗑️ Draft receipt deleted:', receiptId);
        return true;
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
            .order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.rollId) {
            query = query.eq('roll_id', filters.rollId);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || error.code === '42703' || error.message.includes('not find the table') || error.message.includes('does not exist')) return [];
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
    // MATERIAL STOCK BY WAREHOUSE (مخزون المادة حسب المستودعات)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get material stock summary grouped by warehouse
     * يرجع بيانات المخزون لمادة معينة مجمعة حسب المستودعات
     * Aggregates from fabric_rolls table: roll count, total/available/reserved lengths
     * Also includes loose stock from fabric_materials.current_stock for the default_warehouse_id
     */
    async getMaterialStockByWarehouse(companyId: string, materialId: string): Promise<{
        warehouse_id: string;
        warehouse_code: string;
        warehouse_name_ar: string;
        warehouse_name_en: string;
        roll_count: number;
        total_length: number;
        available_length: number;
        reserved_length: number;
        loose_stock: number;
        last_updated: string | null;
    }[]> {
        try {
            // Fetch all rolls for this material grouped with warehouse info
            const { data: rolls, error } = await supabase
                .from('fabric_rolls')
                .select(`
                    warehouse_id,
                    current_length,
                    reserved_length,
                    available_length,
                    status,
                    updated_at,
                    roll_number,
                    warehouse: warehouses!inner(id, code, name_ar, name_en)
                    `)
                .eq('company_id', companyId)
                .eq('material_id', materialId)
                .in('status', ['available', 'reserved', 'partial']);

            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    return [];
                }
                console.warn('getMaterialStockByWarehouse error:', error.message);
                return [];
            }

            // Aggregate by warehouse
            const warehouseMap = new Map<string, {
                warehouse_id: string;
                warehouse_code: string;
                warehouse_name_ar: string;
                warehouse_name_en: string;
                roll_count: number;
                total_length: number;
                available_length: number;
                reserved_length: number;
                loose_stock: number;
                last_updated: string | null;
            }>();

            if (rolls) {
                for (const roll of rolls) {
                    const wh = roll.warehouse as any;
                    if (!wh) continue;

                    const whId = roll.warehouse_id;
                    const existing = warehouseMap.get(whId);

                    if (existing) {
                        existing.roll_count += 1;
                        existing.total_length += Number(roll.current_length) || 0;
                        existing.available_length += Number(roll.available_length) || 0;
                        existing.reserved_length += Number(roll.reserved_length) || 0;
                        if (roll.updated_at && (!existing.last_updated || roll.updated_at > existing.last_updated)) {
                            existing.last_updated = roll.updated_at;
                        }
                    } else {
                        warehouseMap.set(whId, {
                            warehouse_id: whId,
                            warehouse_code: wh.code || '',
                            warehouse_name_ar: wh.name_ar || '',
                            warehouse_name_en: wh.name_en || '',
                            roll_count: 1,
                            total_length: Number(roll.current_length) || 0,
                            available_length: Number(roll.available_length) || 0,
                            reserved_length: Number(roll.reserved_length) || 0,
                            loose_stock: 0,
                            last_updated: roll.updated_at || null,
                        });
                    }
                }
            }

            // ─── If no rolls found, check inventory_stock for per-warehouse breakdown ───
            // This handles imported materials that have loose stock distributed across warehouses
            if (warehouseMap.size === 0) {
                // Step 1: Fetch inventory_stock rows (simple query, no joins)
                const { data: stockRows, error: stockErr } = await supabase
                    .from('inventory_stock')
                    .select('warehouse_id, quantity_on_hand, updated_at')
                    .eq('company_id', companyId)
                    .eq('material_id', materialId)
                    .gt('quantity_on_hand', 0);

                if (!stockErr && stockRows && stockRows.length > 0) {
                    // Step 2: Fetch warehouse details for all referenced warehouses
                    const whIds = [...new Set(stockRows.map(r => r.warehouse_id))];
                    const { data: whDetails } = await supabase
                        .from('warehouses')
                        .select('id, code, name_ar, name_en')
                        .in('id', whIds);

                    const whMap = new Map((whDetails || []).map((w: any) => [w.id, w]));

                    for (const row of stockRows) {
                        const wh = whMap.get(row.warehouse_id) as any;
                        warehouseMap.set(row.warehouse_id, {
                            warehouse_id: row.warehouse_id,
                            warehouse_code: wh?.code || '',
                            warehouse_name_ar: wh?.name_ar || '',
                            warehouse_name_en: wh?.name_en || '',
                            roll_count: 0,
                            total_length: 0,
                            available_length: 0,
                            reserved_length: 0,
                            loose_stock: Number(row.quantity_on_hand) || 0,
                            last_updated: row.updated_at || null,
                        });
                    }
                    // Return early — inventory_stock has the authoritative per-warehouse distribution
                    return Array.from(warehouseMap.values());
                }
            }

            // ─── Add loose stock to the default warehouse ───
            // bulk_stock = authoritative loose stock field (updated by stock count & receipts)
            const { data: material } = await supabase
                .from('fabric_materials')
                .select('current_stock, bulk_stock, default_warehouse_id')
                .eq('id', materialId)
                .single();

            if (material) {
                // Use bulk_stock as the definitive loose stock value
                // IMPORTANT: Use || not ?? — bulk_stock=0 must fall through to current_stock
                const rolledTotal = Array.from(warehouseMap.values()).reduce((s, w) => s + w.total_length, 0);
                const looseStock = Math.max(0,
                    Number(material.bulk_stock || 0) || 
                    Number(material.current_stock || 0) - rolledTotal
                );

                if (looseStock > 0) {
                    // Determine target warehouse: default_warehouse_id, or first warehouse with rolls, or first company warehouse
                    let targetWhId = material.default_warehouse_id;
                    if (!targetWhId && warehouseMap.size > 0) {
                        // Fallback: assign loose stock to the first warehouse that has rolls
                        targetWhId = warehouseMap.keys().next().value;
                    }
                    if (!targetWhId) {
                        // Last resort: fetch the company's first warehouse
                        const { data: firstWh } = await supabase
                            .from('warehouses')
                            .select('id')
                            .eq('company_id', companyId)
                            .eq('is_active', true)
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .single();
                        if (firstWh) targetWhId = firstWh.id;
                    }

                    if (targetWhId) {
                        const existing = warehouseMap.get(targetWhId);

                        if (existing) {
                            // Warehouse already has rolls — add loose stock as separate field only
                            existing.loose_stock = looseStock;
                        } else {
                            // Warehouse has no rolls — create a new entry for loose stock only
                            const { data: wh } = await supabase
                                .from('warehouses')
                                .select('id, code, name_ar, name_en')
                                .eq('id', targetWhId)
                                .single();

                            if (wh) {
                                warehouseMap.set(targetWhId, {
                                    warehouse_id: targetWhId,
                                    warehouse_code: wh.code || '',
                                    warehouse_name_ar: wh.name_ar || '',
                                    warehouse_name_en: wh.name_en || '',
                                    roll_count: 0,
                                    total_length: 0,
                                    available_length: 0,
                                    reserved_length: 0,
                                    loose_stock: looseStock,
                                    last_updated: null,
                                });
                            }
                        }
                    }
                }
            }

            return Array.from(warehouseMap.values());
        } catch (error: any) {
            console.error('getMaterialStockByWarehouse exception:', error);
            return [];
        }
    },

    /**
     * Get individual roll details for a material (optionally filtered by warehouse)
     * يرجع تفاصيل كل رولون لمادة معينة (مع فلتر اختياري حسب المستودع)
     */
    async getMaterialRollsDetail(companyId: string, materialId: string, warehouseId?: string): Promise<{
        id: string;
        roll_number: string;
        warehouse_id: string;
        warehouse_name_ar: string;
        warehouse_name_en: string;
        initial_length: number;
        current_length: number;
        reserved_length: number;
        available_length: number;
        status: string;
        // ─── Color info ───
        color_id?: string;
        color_name_ar?: string;
        color_name_en?: string;
        color_hex?: string;
        supplier_name?: string;
        received_date?: string;
        created_at: string;
        // ─── Location info ───
        bin_location_id?: string;
        bin_location_code?: string;
        bin_location_name?: string;
    }[]> {
        try {
            let query = supabase
                .from('fabric_rolls')
                .select(`
                    id,
                    roll_number,
                    warehouse_id,
                    bin_location_id,
                    color_id,
                    initial_length,
                    current_length,
                    reserved_length,
                    available_length,
                    status,
                    cost_per_meter,
                    created_at,
                    warehouse: warehouses!left(name_ar, name_en),
                    color: fabric_colors!left(id, name_ar, name_en, hex_code),
                    bin_location: bin_locations!left(id, code, name_ar)
                    `)
                .eq('company_id', companyId)
                .eq('material_id', materialId)
                .in('status', ['available', 'reserved', 'partial'])
                .order('roll_number', { ascending: true });

            if (warehouseId) {
                query = query.eq('warehouse_id', warehouseId);
            }

            const { data, error } = await query;

            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    return [];
                }
                console.warn('getMaterialRollsDetail error:', error.message);
                return [];
            }

            return (data || []).map((roll: any) => ({
                id: roll.id,
                roll_number: roll.roll_number,
                warehouse_id: roll.warehouse_id,
                warehouse_name_ar: roll.warehouse?.name_ar || '',
                warehouse_name_en: roll.warehouse?.name_en || '',
                initial_length: Number(roll.initial_length) || 0,
                current_length: Number(roll.current_length) || 0,
                reserved_length: Number(roll.reserved_length) || 0,
                available_length: Number(roll.available_length) || 0,
                status: roll.status,
                // Color info — attached to each roll
                color_id: roll.color_id || undefined,
                color_name_ar: roll.color?.name_ar || undefined,
                color_name_en: roll.color?.name_en || undefined,
                color_hex: roll.color?.hex_code || undefined,
                supplier_name: undefined,
                received_date: undefined,
                created_at: roll.created_at,
                // Location / Bin info
                bin_location_id: roll.bin_location_id || undefined,
                bin_location_code: roll.bin_location?.code || undefined,
                bin_location_name: roll.bin_location?.name_ar || undefined,
            }));
        } catch (error: any) {
            console.error('getMaterialRollsDetail exception:', error);
            return [];
        }
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
    },

    // ════════════════════════════════════════════════════
    // Bin Location Management — إدارة مواقع التخزين
    // ════════════════════════════════════════════════════

    /** Get all bin locations for a warehouse */
    async getBinLocations(companyId: string, warehouseId?: string): Promise<any[]> {
        // Step 1: fetch bins
        let q = supabase
            .from('bin_locations')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('code', { ascending: true });
        if (warehouseId) q = q.eq('warehouse_id', warehouseId);
        const { data: bins, error } = await q;
        if (error) {
            console.warn('getBinLocations error:', error.message);
            return [];
        }
        if (!bins || bins.length === 0) return [];

        // Step 2: count rolls per bin (only active rolls)
        const binIds = bins.map((b: any) => b.id);
        const { data: rollCounts } = await supabase
            .from('fabric_rolls')
            .select('bin_location_id')
            .in('bin_location_id', binIds)
            .not('status', 'in', '(consumed,sold)');

        // Build count map
        const countMap: Record<string, number> = {};
        (rollCounts || []).forEach((r: any) => {
            if (r.bin_location_id) {
                countMap[r.bin_location_id] = (countMap[r.bin_location_id] || 0) + 1;
            }
        });

        // Step 3: merge count into each bin
        return bins.map((bin: any) => ({
            ...bin,
            current_rolls_count: countMap[bin.id] ?? 0,
        }));
    },


    /** Create a new bin location */
    async createBinLocation(companyId: string, tenantId: string, input: {
        warehouse_id: string;
        code: string;
        name?: string;
        name_ar?: string;
        name_en?: string;
        row_code?: string;
        column_code?: string;
        shelf_code?: string;
        capacity_rolls?: number;
        description?: string;
    }): Promise<any> {
        const { data, error } = await supabase
            .from('bin_locations')
            .insert({
                company_id: companyId,
                tenant_id: tenantId,
                ...input,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /** Assign a roll to a bin location */
    async assignRollToBinLocation(rollId: string, binLocationId: string | null): Promise<boolean> {
        const { error } = await supabase
            .from('fabric_rolls')
            .update({
                bin_location_id: binLocationId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', rollId);

        if (error) {
            console.error('assignRollToBinLocation error:', error.message);
            return false;
        }
        return true;
    },

    /** Bulk assign multiple rolls to a bin location */
    async bulkAssignRollsToBin(rollIds: string[], binLocationId: string | null): Promise<{ success: number; failed: number }> {
        const { error, count } = await supabase
            .from('fabric_rolls')
            .update({
                bin_location_id: binLocationId,
                updated_at: new Date().toISOString(),
            })
            .in('id', rollIds);

        if (error) {
            console.error('bulkAssignRollsToBin error:', error.message);
            return { success: 0, failed: rollIds.length };
        }

        return { success: count || rollIds.length, failed: 0 };
    },

    /** Get rolls in a specific bin location */
    async getRollsInBin(companyId: string, binLocationId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('fabric_rolls')
            .select(`
                id, roll_number, status, current_length, available_length, reserved_length,
                material_id, color_id,
                color:fabric_colors!left(id, name_ar, name_en, hex_code)
            `)
            .eq('company_id', companyId)
            .eq('bin_location_id', binLocationId)
            .not('status', 'in', '(consumed,sold)')
            .order('roll_number', { ascending: true });

        if (error) {
            console.warn('getRollsInBin error:', error.message);
            return [];
        }
        return data || [];
    },

};

export default warehouseService;


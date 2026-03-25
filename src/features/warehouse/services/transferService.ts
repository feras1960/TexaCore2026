/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 Transfer Service — خدمة المناقلات بين المستودعات
 * ════════════════════════════════════════════════════════════════
 *
 * المناقلة = نقل رولونات من مستودع إلى آخر
 * 
 * سير العمل:
 *  1. createTransfer() → مسودة مناقلة جديدة
 *  2. إضافة رولونات (موجودة أو JIT من السائب)
 *  3. confirmTransfer() → تنفيذ النقل:
 *     - تحديث warehouse_id في fabric_rolls
 *     - تسجيل حركات transfer_out + transfer_in
 *     - تحديث حالة المناقلة → completed
 *  4. cancelTransfer() → إلغاء + حذف رولونات JIT
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { telegramNotify } from '@/services/telegramNotificationService';

// ─── Types ──────────────────────────────────────────────────

export interface TransferInput {
    tenantId: string;
    companyId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes?: string;
    createdBy: string;
}

export interface TransferItemInput {
    materialId: string;
    rollId: string;
    quantity: number;
    isJitRoll?: boolean;
    notes?: string;
}

export interface TransferRecord {
    id: string;
    transfer_number: string;
    transfer_date: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
    status: string;
    notes: string | null;
    total_rolls: number;
    total_meters: number;
    created_by: string;
    confirmed_by: string | null;
    confirmed_at: string | null;
    created_at: string;
    // Joined
    from_warehouse?: { id: string; name_ar: string; name_en: string };
    to_warehouse?: { id: string; name_ar: string; name_en: string };
    items?: TransferItemRecord[];
}

export interface TransferItemRecord {
    id: string;
    transfer_id: string;
    material_id: string;
    roll_id: string | null;
    quantity: number;
    is_jit_roll: boolean;
    notes: string | null;
    // Joined
    material?: { id: string; name_ar: string; name_en: string; code: string };
    roll?: { id: string; roll_number: string; current_length: number };
}

// ─── Transfer Number Generation ─────────────────────────────

function generateTransferNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const ts = now.getTime().toString().slice(-6);
    return `ST-${year}-${ts}`;
}

// ════════════════════════════════════════════════════════════════
// 🏗️ Transfer Service
// ════════════════════════════════════════════════════════════════

export const transferService = {

    /**
     * 📋 جلب قائمة المناقلات
     */
    async getTransfers(companyId: string, options?: {
        status?: string;
        limit?: number;
    }): Promise<TransferRecord[]> {
        let query = supabase
            .from('stock_transfers')
            .select(`
                *,
                from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, name_ar, name_en),
                to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, name_ar, name_en)
            `)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (options?.status) {
            query = query.eq('status', options.status);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[Transfer] ❌ getTransfers failed:', error.message);
            return [];
        }
        return data || [];
    },

    /**
     * 📄 جلب مناقلة واحدة مع بنودها
     */
    async getTransferById(transferId: string): Promise<TransferRecord | null> {
        const { data, error } = await supabase
            .from('stock_transfers')
            .select(`
                *,
                from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(id, name_ar, name_en),
                to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(id, name_ar, name_en),
                items:stock_transfer_items(
                    *,
                    material:fabric_materials(id, name_ar, name_en, code),
                    roll:fabric_rolls(id, roll_number, current_length)
                )
            `)
            .eq('id', transferId)
            .single();

        if (error) {
            console.error('[Transfer] ❌ getTransferById failed:', error.message);
            return null;
        }
        return data;
    },

    /**
     * ➕ إنشاء مناقلة جديدة (مسودة)
     */
    async createTransfer(input: TransferInput): Promise<{
        transfer: TransferRecord | null;
        error?: string;
    }> {
        try {
            if (input.fromWarehouseId === input.toWarehouseId) {
                return { transfer: null, error: 'same_warehouse' };
            }

            const transferNumber = generateTransferNumber();

            const { data, error } = await supabase
                .from('stock_transfers')
                .insert({
                    tenant_id: input.tenantId,
                    company_id: input.companyId,
                    transfer_number: transferNumber,
                    from_warehouse_id: input.fromWarehouseId,
                    to_warehouse_id: input.toWarehouseId,
                    status: 'draft',
                    notes: input.notes || null,
                    total_rolls: 0,
                    total_meters: 0,
                    created_by: input.createdBy,
                })
                .select('*')
                .single();

            if (error) {
                console.error('[Transfer] ❌ createTransfer failed:', error.message);
                return { transfer: null, error: error.message };
            }

            console.log(`[Transfer] ✅ Created ${transferNumber}`);
            return { transfer: data };
        } catch (err: any) {
            return { transfer: null, error: err.message };
        }
    },

    /**
     * 📦 إضافة بنود (رولونات) للمناقلة
     */
    async addItems(transferId: string, items: TransferItemInput[]): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (items.length === 0) return { success: true };

        const rows = items.map(item => ({
            transfer_id: transferId,
            material_id: item.materialId,
            roll_id: item.rollId,
            quantity: item.quantity,
            is_jit_roll: item.isJitRoll || false,
            notes: item.notes || null,
        }));

        const { error } = await supabase
            .from('stock_transfer_items')
            .insert(rows);

        if (error) {
            console.error('[Transfer] ❌ addItems failed:', error.message);
            return { success: false, error: error.message };
        }

        // Update totals on the transfer
        const { error: updateErr } = await supabase
            .from('stock_transfers')
            .update({
                total_rolls: items.length,
                total_meters: items.reduce((sum, i) => sum + i.quantity, 0),
            })
            .eq('id', transferId);

        if (updateErr) {
            console.error('[Transfer] ⚠️ Failed to update totals:', updateErr.message);
        }

        return { success: true };
    },

    /**
     * ✅ تأكيد وتنفيذ المناقلة
     * 
     * 1. ينقل الرولونات (تحديث warehouse_id)
     * 2. يسجل حركات المخزون (transfer_out + transfer_in)
     * 3. يحدث حالة المناقلة → completed
     */
    async confirmTransfer(transferId: string, confirmedBy: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // ── 1. جلب المناقلة مع بنودها ───
            const transfer = await this.getTransferById(transferId);
            if (!transfer) {
                return { success: false, error: 'transfer_not_found' };
            }
            if (transfer.status !== 'draft') {
                return { success: false, error: `invalid_status:${transfer.status}` };
            }
            if (!transfer.items || transfer.items.length === 0) {
                return { success: false, error: 'no_items' };
            }

            // ── 2. نقل الرولونات (تحديث warehouse_id) ───
            const rollIds = transfer.items
                .filter(item => item.roll_id)
                .map(item => item.roll_id!);

            if (rollIds.length > 0) {
                const { error: moveErr } = await supabase
                    .from('fabric_rolls')
                    .update({ warehouse_id: transfer.to_warehouse_id })
                    .in('id', rollIds);

                if (moveErr) {
                    console.error('[Transfer] ❌ Move rolls failed:', moveErr.message);
                    return { success: false, error: `move_failed: ${moveErr.message}` };
                }
            }

            // ── 3. تسجيل حركات المخزون ───
            const movements: any[] = [];
            const now = new Date();
            const moveDate = now.toISOString().slice(0, 10);
            const moveTime = now.toTimeString().slice(0, 8);

            for (const item of transfer.items) {
                // حركة خروج من المستودع المصدر
                movements.push({
                    tenant_id: transfer.tenant_id,
                    company_id: transfer.company_id,
                    movement_number: `${transfer.transfer_number}-OUT`,
                    movement_date: moveDate,
                    movement_time: moveTime,
                    movement_type: 'transfer_out',
                    product_id: item.material_id,
                    from_warehouse_id: transfer.from_warehouse_id,
                    to_warehouse_id: transfer.to_warehouse_id,
                    quantity: item.quantity,
                    reference_type: 'stock_transfer',
                    reference_id: transfer.id,
                    reference_number: transfer.transfer_number,
                    notes: `مناقلة خروج | ${transfer.transfer_number}`,
                    created_by: confirmedBy,
                });

                // حركة دخول للمستودع الوجهة
                movements.push({
                    tenant_id: transfer.tenant_id,
                    company_id: transfer.company_id,
                    movement_number: `${transfer.transfer_number}-IN`,
                    movement_date: moveDate,
                    movement_time: moveTime,
                    movement_type: 'transfer_in',
                    product_id: item.material_id,
                    from_warehouse_id: transfer.from_warehouse_id,
                    to_warehouse_id: transfer.to_warehouse_id,
                    quantity: item.quantity,
                    reference_type: 'stock_transfer',
                    reference_id: transfer.id,
                    reference_number: transfer.transfer_number,
                    notes: `مناقلة دخول | ${transfer.transfer_number}`,
                    created_by: confirmedBy,
                });
            }

            if (movements.length > 0) {
                const { error: movErr } = await supabase
                    .from('inventory_movements')
                    .insert(movements);

                if (movErr) {
                    console.error('[Transfer] ⚠️ Movement recording failed:', movErr.message);
                    // لا نوقف العملية — الرولونات انتقلت فعلاً
                }
            }

            // ── 4. تحديث حالة المناقلة ───
            const { error: statusErr } = await supabase
                .from('stock_transfers')
                .update({
                    status: 'completed',
                    confirmed_by: confirmedBy,
                    confirmed_at: now.toISOString(),
                })
                .eq('id', transferId);

            if (statusErr) {
                console.error('[Transfer] ⚠️ Status update failed:', statusErr.message);
            }

            console.log(`[Transfer] ✅ Confirmed ${transfer.transfer_number} — ${rollIds.length} rolls moved`);

            // ── 5. 📱 Telegram: إشعار أمين المستودع المصدر بالتجميع ───
            try {
                const transferItems = (transfer.items || []).map(item => ({
                    materialId: item.material_id || undefined,
                    name: item.material?.name_ar || item.material?.name_en || '-',
                    qty: item.quantity || 0,
                    unit: 'م',
                    rolls: 1,
                    color: undefined as string | undefined,
                }));

                telegramNotify.warehouseTransferPicking(transfer.company_id, {
                    transferNumber: transfer.transfer_number,
                    fromWarehouseId: transfer.from_warehouse_id,
                    fromWarehouseName: transfer.from_warehouse?.name_ar || '-',
                    toWarehouseName: transfer.to_warehouse?.name_ar || '-',
                    items: transferItems,
                    notes: transfer.notes || undefined,
                    createdBy: confirmedBy,
                });
            } catch (tgErr) {
                console.warn('[Transfer] Telegram notification failed (non-blocking):', tgErr);
            }

            return { success: true };
        } catch (err: any) {
            console.error('[Transfer] ❌ confirmTransfer exception:', err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * ❌ إلغاء مناقلة مسودة
     * 
     * - يحذف رولونات JIT التي أُنشئت
     * - يحذف بنود المناقلة
     * - يحذف المناقلة أو يغير حالتها لـ cancelled
     */
    async cancelTransfer(transferId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // جلب المناقلة
            const transfer = await this.getTransferById(transferId);
            if (!transfer) {
                return { success: false, error: 'transfer_not_found' };
            }
            if (transfer.status !== 'draft') {
                return { success: false, error: `cannot_cancel_${transfer.status}` };
            }

            // حذف رولونات JIT
            const jitRolls = (transfer.items || [])
                .filter(item => item.is_jit_roll && item.roll_id);

            for (const item of jitRolls) {
                const { error } = await supabase
                    .from('fabric_rolls')
                    .delete()
                    .eq('id', item.roll_id!);

                if (error) {
                    console.warn(`[Transfer] ⚠️ Failed to delete JIT roll ${item.roll_id}:`, error.message);
                }
            }

            // حذف البنود
            await supabase
                .from('stock_transfer_items')
                .delete()
                .eq('transfer_id', transferId);

            // حذف المناقلة
            const { error } = await supabase
                .from('stock_transfers')
                .delete()
                .eq('id', transferId);

            if (error) {
                console.error('[Transfer] ❌ cancelTransfer failed:', error.message);
                return { success: false, error: error.message };
            }

            console.log(`[Transfer] 🗑️ Cancelled ${transfer.transfer_number}`);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    /**
     * 📊 جلب رولونات المستودع المتاحة للنقل
     * يُستخدم لتعبئة قائمة الرولونات في حوار المناقلة
     */
    async getWarehouseRolls(warehouseId: string, options?: {
        materialId?: string;
        search?: string;
    }): Promise<Array<{
        id: string;
        roll_number: string;
        material_id: string;
        material_name: string;
        material_code: string;
        color_name: string | null;
        current_length: number;
        status: string;
    }>> {
        let query = supabase
            .from('fabric_rolls')
            .select(`
                id, roll_number, material_id, color_name, current_length, status,
                material:fabric_materials!inner(name_ar, code)
            `)
            .eq('warehouse_id', warehouseId)
            .in('status', ['available', 'in_stock'])
            .gt('current_length', 0)
            .order('material_id')
            .order('current_length', { ascending: false });

        if (options?.materialId) {
            query = query.eq('material_id', options.materialId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[Transfer] ❌ getWarehouseRolls failed:', error.message);
            return [];
        }

        return (data || []).map((r: any) => ({
            id: r.id,
            roll_number: r.roll_number,
            material_id: r.material_id,
            material_name: r.material?.name_ar || '',
            material_code: r.material?.code || '',
            color_name: r.color_name,
            current_length: r.current_length,
            status: r.status,
        }));
    },
};

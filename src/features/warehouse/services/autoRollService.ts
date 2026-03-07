/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 Auto Roll Service — إنشاء رولونات من المخزون السائب (JIT)
 * ════════════════════════════════════════════════════════════════
 *
 * يُستخدم عند تسليم مواد غير مجرودة بالرولونات:
 *  - يتحقق من وجود مخزون سائب كافٍ قبل الإنشاء
 *  - ينشئ رول جديد في fabric_rolls
 *  - يُرجع بيانات الرول لإضافته لإذن التسليم/المناقلة
 *
 * ⚠️ القواعد:
 *  - لا يُنشئ رول إذا لم يكن هناك مخزون سائب كافٍ
 *  - loose_stock = current_stock - SUM(fabric_rolls.current_length)
 *  - إنشاء الرول يقلل loose_stock تلقائياً (لأن المجموع يزيد)
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────
export interface AutoRollInput {
    tenantId: string;
    companyId: string;
    warehouseId: string;
    materialId: string;
    colorId?: string;
    colorName?: string;
    rollLength: number;
    /** سبب الإنشاء: تسليم مبيعات أو مناقلة */
    purpose: 'sales_delivery' | 'transfer';
    /** مرجع الوثيقة (رقم الفاتورة أو المناقلة) */
    referenceNumber?: string;
}

export interface AutoRollResult {
    id: string;
    roll_number: string;
    material_id: string;
    color_id?: string;
    color_name?: string;
    current_length: number;
    net_length: number;
    status: string;
    warehouse_id: string;
}

export interface LooseStockInfo {
    material_id: string;
    current_stock: number;
    rolls_total_length: number;
    loose_stock: number;
}

// ─── Roll Number Generation ─────────────────────────────────
function generateJITRollNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `JIT-${dateStr}-${timeStr}-${random}`;
}

// ════════════════════════════════════════════════════════════════
// 🏗️ Auto Roll Service
// ════════════════════════════════════════════════════════════════

export const autoRollService = {

    /**
     * 📊 حساب المخزون السائب الفعلي لمادة محددة في مستودع معين
     * loose_stock = current_stock - SUM(fabric_rolls.current_length WHERE status IN ('available','reserved','in_stock'))
     */
    async getLooseStock(materialId: string, warehouseId?: string): Promise<LooseStockInfo | null> {
        try {
            // 1. جلب المادة من fabric_materials (SELECT * لأن current_stock قد يكون computed)
            const { data: material, error: matErr } = await supabase
                .from('fabric_materials')
                .select('*')
                .eq('id', materialId)
                .maybeSingle();

            if (matErr || !material) {
                console.error('[AutoRoll] Material not found:', materialId);
                return null;
            }

            // 2. حساب مجموع أطوال الرولونات الموجودة
            let query = supabase
                .from('fabric_rolls')
                .select('current_length')
                .eq('material_id', materialId)
                .in('status', ['available', 'reserved', 'in_stock']);

            if (warehouseId) {
                query = query.eq('warehouse_id', warehouseId);
            }

            const { data: rolls, error: rollsErr } = await query;

            if (rollsErr) {
                console.error('[AutoRoll] Error fetching rolls:', rollsErr.message);
                return null;
            }

            const rolls_total_length = (rolls || []).reduce(
                (sum, r: any) => sum + (Number(r.current_length) || 0), 0
            );

            const current_stock = Number(material.current_stock) || 0;
            const loose_stock = Math.max(0, current_stock - rolls_total_length);

            return {
                material_id: materialId,
                current_stock,
                rolls_total_length,
                loose_stock,
            };
        } catch (err: any) {
            console.error('[AutoRoll] getLooseStock exception:', err.message);
            return null;
        }
    },

    /**
     * 📋 جلب المواد التي لها مخزون سائب في مستودع معين
     * يُستخدم لتعبئة قائمة المواد في سطر الإدخال
     */
    async getMaterialsWithLooseStock(
        companyId: string,
        warehouseId?: string
    ): Promise<Array<{ id: string; name_ar: string; name_en: string; loose_stock: number; current_stock: number }>> {
        try {
            // 1. جلب المواد (SELECT * لأن current_stock قد لا يكون عمود مباشر)
            const { data: materials, error: matErr } = await supabase
                .from('fabric_materials')
                .select('*')
                .eq('company_id', companyId);

            if (matErr || !materials) {
                console.error('[AutoRoll] getMaterialsWithLooseStock error:', matErr?.message);
                return [];
            }

            // 2. جلب مجموع أطوال الرولونات لكل مادة
            const matIds = materials.map(m => m.id);
            let rollsQuery = supabase
                .from('fabric_rolls')
                .select('material_id, current_length')
                .in('material_id', matIds)
                .in('status', ['available', 'reserved', 'in_stock']);

            if (warehouseId) {
                rollsQuery = rollsQuery.eq('warehouse_id', warehouseId);
            }

            const { data: rolls } = await rollsQuery;

            // 3. حساب المجموع لكل مادة
            const rollsTotals: Record<string, number> = {};
            for (const r of (rolls || [])) {
                const mid = (r as any).material_id;
                rollsTotals[mid] = (rollsTotals[mid] || 0) + (Number((r as any).current_length) || 0);
            }

            // 4. فلترة المواد التي لها loose_stock > 0
            return materials
                .map(m => {
                    const currentStock = Number(m.current_stock) || 0;
                    const rolledTotal = rollsTotals[m.id] || 0;
                    const looseStock = Math.max(0, currentStock - rolledTotal);
                    return {
                        id: m.id,
                        name_ar: m.name_ar || '',
                        name_en: m.name_en || '',
                        loose_stock: looseStock,
                        current_stock: currentStock,
                    };
                })
                .filter(m => m.loose_stock > 0);
        } catch (err: any) {
            console.error('[AutoRoll] getMaterialsWithLooseStock exception:', err.message);
            return [];
        }
    },

    /**
     * ⚡ إنشاء رول واحد من المخزون السائب
     * 
     * ⚠️ يتحقق من وجود مخزون سائب كافٍ قبل الإنشاء
     * إنشاء الرول في fabric_rolls يقلل loose_stock تلقائياً
     * (لأن loose_stock = current_stock - SUM(rolls))
     */
    async createRollFromLooseStock(input: AutoRollInput): Promise<{
        roll: AutoRollResult | null;
        error?: string;
        remainingLooseStock?: number;
    }> {
        try {
            // ── 1. تحقق من المخزون السائب ───
            const looseInfo = await this.getLooseStock(input.materialId, input.warehouseId);
            if (!looseInfo) {
                return { roll: null, error: 'material_not_found' };
            }

            if (looseInfo.loose_stock <= 0) {
                return { roll: null, error: 'no_loose_stock' };
            }

            if (input.rollLength > looseInfo.loose_stock) {
                return {
                    roll: null,
                    error: 'insufficient_loose_stock',
                    remainingLooseStock: looseInfo.loose_stock,
                };
            }

            // ── 2. إنشاء الرول ───
            const rollNumber = generateJITRollNumber();
            const purposeLabel = input.purpose === 'sales_delivery'
                ? 'JIT Sales Delivery'
                : 'JIT Transfer';

            const { data, error } = await supabase
                .from('fabric_rolls')
                .insert({
                    tenant_id: input.tenantId,
                    company_id: input.companyId,
                    warehouse_id: input.warehouseId,
                    material_id: input.materialId,
                    roll_number: rollNumber,
                    initial_length: input.rollLength,
                    current_length: input.rollLength,
                    reserved_length: 0,
                    color_id: input.colorId || null,
                    color_name: input.colorName || null,
                    status: 'available',
                    cost_per_meter: 0,
                    cost_status: 'pending',
                    notes: `${purposeLabel} | Ref: ${input.referenceNumber || 'N/A'}`,
                })
                .select('id, roll_number, material_id, color_id, color_name, current_length, status, warehouse_id')
                .single();

            if (error) {
                console.error('[AutoRoll] ❌ Insert failed:', error.message);
                return { roll: null, error: error.message };
            }

            const newLooseStock = looseInfo.loose_stock - input.rollLength;
            console.log(`[AutoRoll] ✅ Created ${rollNumber} (${input.rollLength}m) — remaining loose: ${newLooseStock.toFixed(1)}m`);

            return {
                roll: {
                    id: data.id,
                    roll_number: data.roll_number,
                    material_id: data.material_id,
                    color_id: data.color_id,
                    color_name: data.color_name,
                    current_length: data.current_length,
                    net_length: data.current_length,
                    status: data.status,
                    warehouse_id: data.warehouse_id,
                },
                remainingLooseStock: newLooseStock,
            };
        } catch (err: any) {
            console.error('[AutoRoll] ❌ Exception:', err.message);
            return { roll: null, error: err.message };
        }
    },

    /**
     * 🗑️ حذف رول JIT خاطئ
     */
    async deleteJITRoll(rollId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('fabric_rolls')
                .delete()
                .eq('id', rollId)
                .like('roll_number', 'JIT-%');

            if (error) {
                console.error('[AutoRoll] Delete failed:', error.message);
                return false;
            }
            console.log(`[AutoRoll] 🗑️ Deleted JIT roll: ${rollId}`);
            return true;
        } catch (err: any) {
            console.error('[AutoRoll] Delete exception:', err.message);
            return false;
        }
    },
};

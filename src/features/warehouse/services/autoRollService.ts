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
import { rollNumberService, buildRollCode } from './rollNumberService';

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

// ─── Roll Number Generation (Legacy Fallback) ──────────────
function generateJITRollNumber(): string {
    // Fallback only — prefer rollNumberService.generate()
    const now = new Date();
    const timeStr = now.getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `JIT-${timeStr}-${random}`;
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
            // Try smart roll code first, fallback to JIT
            let rollNumber: string;
            let rollCode: string | undefined;
            try {
                const smart = await rollNumberService.generate({
                    companyId: input.companyId,
                    colorName: input.colorName,
                });
                rollNumber = smart.roll_number;
                rollCode = smart.roll_code;
            } catch {
                // Offline or error → use JIT number + pure rollCode
                rollNumber = generateJITRollNumber();
                rollCode = buildRollCode({ colorName: input.colorName });
            }
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
                    roll_code: rollCode || null,
                    // 🔑 roll_seq → ALWAYS let DB trigger assign (single source of truth)
                    initial_length: input.rollLength,
                    current_length: input.rollLength,
                    reserved_length: 0,
                    color_id: input.colorId || null,
                    color_name: input.colorName || null,
                    status: 'reserved',  // 🔑 reserved until delivery is confirmed — doesn't show in general inventory
                    cost_per_meter: 0,
                    cost_status: 'pending',
                    notes: `${purposeLabel} | Ref: ${input.referenceNumber || 'N/A'}`,
                    // 🔑 مصدر الرولون
                    source_type: input.purpose === 'sales_delivery' ? 'auto_sales_delivery' : 'auto_transfer',
                    source_document_number: input.referenceNumber || null,
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
     * 🗑️ حذف رول مُنشأ تلقائياً (JIT / Auto)
     * يعتمد على source_type بدلاً من اسم الرولون
     * يحذف أي رول بـ source_type = 'auto_sales_delivery' أو 'auto_transfer'
     */
    async deleteAutoRoll(rollId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('fabric_rolls')
                .delete()
                .eq('id', rollId)
                .in('source_type', ['auto_sales_delivery', 'auto_transfer']);

            if (error) {
                console.error('[AutoRoll] Delete failed:', error.message);
                return false;
            }
            console.log(`[AutoRoll] 🗑️ Deleted auto roll: ${rollId}`);
            return true;
        } catch (err: any) {
            console.error('[AutoRoll] Delete exception:', err.message);
            return false;
        }
    },

    /**
     * ✅ تفعيل رولونات محجوزة بعد تأكيد التسليم
     * يغيّر الحالة من 'reserved' إلى 'available' (أو 'sold' حسب السياق)
     */
    async activateRolls(rollIds: string[], newStatus: 'available' | 'sold' = 'available'): Promise<boolean> {
        if (rollIds.length === 0) return true;
        try {
            const { error } = await supabase
                .from('fabric_rolls')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in('id', rollIds)
                .eq('status', 'reserved');

            if (error) {
                console.error('[AutoRoll] Activate failed:', error.message);
                return false;
            }
            console.log(`[AutoRoll] ✅ Activated ${rollIds.length} rolls → ${newStatus}`);
            return true;
        } catch (err: any) {
            console.error('[AutoRoll] Activate exception:', err.message);
            return false;
        }
    },

    /**
     * 🗑️ (Legacy) حذف رول JIT — يوجّه للدالة الجديدة
     * @deprecated استخدم deleteAutoRoll بدلاً منها
     */
    async deleteJITRoll(rollId: string): Promise<boolean> {
        return this.deleteAutoRoll(rollId);
    },
};

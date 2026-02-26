/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 Direct Stock Update Service
 * ═══════════════════════════════════════════════════════════════
 * خدمة تحديث المخزون المباشر
 * تُستخدم عند ترحيل فواتير المشتريات والمبيعات مع تفعيل
 * "تحديث المخزون مباشرة"
 * 
 * المشتريات: تزيد المخزون (purchase_receipt)
 * المبيعات: تنقص المخزون (sales_delivery)
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ═══ Types ═══

interface StockUpdateItem {
    material_id: string;
    quantity: number;
    unit_price: number;
    description?: string;
}

interface DirectStockUpdateInput {
    type: 'purchase' | 'sales';
    transaction_id: string;
    transaction_number: string;
    tenant_id: string;
    company_id: string;
    warehouse_id: string;
    doc_date: string;
    items: StockUpdateItem[];
    user_id: string;
}

interface DirectStockUpdateResult {
    success: boolean;
    movement_ids: string[];
    warnings: string[];
    error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Main Service
// ═══════════════════════════════════════════════════════════════

export const directStockUpdateService = {

    /**
     * تحديث المخزون المباشر عند ترحيل فاتورة
     * 
     * للمشتريات: يزيد المخزون ويحسب المتوسط المرجح
     * للمبيعات: ينقص المخزون مع فحص الكمية المتاحة
     */
    async executeDirectStockUpdate(input: DirectStockUpdateInput): Promise<DirectStockUpdateResult> {
        const {
            type, transaction_id, transaction_number,
            tenant_id, company_id, warehouse_id,
            doc_date, items, user_id
        } = input;

        const warnings: string[] = [];
        const movementIds: string[] = [];
        const isPurchase = type === 'purchase';
        const movementType = isPurchase ? 'purchase_receipt' : 'sales_delivery';
        const refType = isPurchase ? 'purchase_invoice' : 'sales_invoice';
        const prefix = isPurchase ? 'AUTO-PR' : 'AUTO-SD';

        console.log(`📦 [DirectStockUpdate] ${type.toUpperCase()} — ${items.length} items → warehouse: ${warehouse_id}`);

        try {
            for (const item of items) {
                if (!item.material_id || item.quantity <= 0) continue;

                // ─── For sales: check available stock ───
                if (!isPurchase) {
                    const { data: materialCheck } = await supabase
                        .from('fabric_materials')
                        .select('total_stock, allow_negative_stock')
                        .eq('id', item.material_id)
                        .single();

                    if (materialCheck) {
                        const available = Number(materialCheck.total_stock || 0);
                        const allowNeg = materialCheck.allow_negative_stock || false;

                        if (available < item.quantity && !allowNeg) {
                            warnings.push(
                                `⚠️ المادة "${item.description || item.material_id}": الكمية المطلوبة (${item.quantity}) تتجاوز المتوفر (${available})`
                            );
                            // Still proceed but warn — business might want to continue
                        }
                    }
                }

                // ─── Create inventory movement ───
                const movementNumber = `${prefix}-${transaction_number || transaction_id.slice(0, 8)}`;
                const movementData: Record<string, any> = {
                    tenant_id,
                    company_id,
                    movement_number: movementNumber,
                    movement_date: doc_date || new Date().toISOString().split('T')[0],
                    movement_type: movementType,
                    material_id: item.material_id,
                    quantity: item.quantity,
                    unit_cost: item.unit_price,
                    total_cost: item.quantity * item.unit_price,
                    reference_type: refType,
                    reference_id: transaction_id,
                    reference_number: transaction_number,
                    notes: isPurchase
                        ? `تحديث مخزون مباشر — فاتورة شراء ${transaction_number}`
                        : `تحديث مخزون مباشر — فاتورة بيع ${transaction_number}`,
                    created_by: user_id,
                };

                // Direction: purchase → to_warehouse, sales → from_warehouse
                if (isPurchase) {
                    movementData.to_warehouse_id = warehouse_id;
                } else {
                    movementData.from_warehouse_id = warehouse_id;
                }

                const { data: movement, error: mvError } = await supabase
                    .from('inventory_movements')
                    .insert(movementData)
                    .select('id')
                    .single();

                if (mvError) {
                    console.error(`❌ inventory_movement failed for ${item.material_id}:`, mvError.message);
                    warnings.push(`فشل إنشاء حركة مخزون: ${item.description || item.material_id}`);
                    continue;
                }

                if (movement) movementIds.push(movement.id);

                // ─── Update fabric_materials stock ───
                const { data: currentMaterial } = await supabase
                    .from('fabric_materials')
                    .select('total_stock, avg_cost_per_unit')
                    .eq('id', item.material_id)
                    .single();

                if (currentMaterial) {
                    const oldStock = Number(currentMaterial.total_stock || 0);
                    const oldAvgCost = Number(currentMaterial.avg_cost_per_unit || 0);

                    let newStock: number;
                    let newAvgCost: number;

                    if (isPurchase) {
                        // Purchase: increase stock + weighted average cost
                        newStock = oldStock + item.quantity;
                        newAvgCost = newStock > 0
                            ? ((oldStock * oldAvgCost) + (item.quantity * item.unit_price)) / newStock
                            : item.unit_price;
                    } else {
                        // Sales: decrease stock (avg cost stays the same)
                        newStock = oldStock - item.quantity;
                        newAvgCost = oldAvgCost; // No change on sales
                    }

                    const updatePayload: Record<string, any> = {
                        total_stock: newStock,
                    };

                    if (isPurchase) {
                        updatePayload.avg_cost_per_unit = Math.round(newAvgCost * 100) / 100;
                        updatePayload.last_cost_per_unit = item.unit_price;
                    }

                    await supabase
                        .from('fabric_materials')
                        .update(updatePayload)
                        .eq('id', item.material_id);

                    const arrow = isPurchase ? '↑' : '↓';
                    console.log(`  📦 ${item.description || item.material_id}: ${oldStock} ${arrow} ${newStock}`);
                }
            }

            // ─── Link movement to transaction ───
            if (movementIds.length > 0) {
                const table = isPurchase ? 'purchase_transactions' : 'sales_transactions';
                await supabase
                    .from(table)
                    .update({ stock_movement_id: movementIds[0] })
                    .eq('id', transaction_id);

                console.log(`✅ Direct Stock Update completed: ${movementIds.length} movements`);
            }

            return {
                success: true,
                movement_ids: movementIds,
                warnings,
            };

        } catch (error: any) {
            console.error('❌ DirectStockUpdate error:', error);
            return {
                success: false,
                movement_ids: movementIds,
                warnings,
                error: error.message || 'Unknown error',
            };
        }
    },


    /**
     * عكس تحديث المخزون المباشر — يُستخدم عند إلغاء الترحيل
     * يحذف حركات المخزون ويُعيد الكميات
     */
    async reverseDirectStockUpdate(
        transactionId: string,
        type: 'purchase' | 'sales'
    ): Promise<{ success: boolean; error?: string }> {
        const isPurchase = type === 'purchase';
        const refType = isPurchase ? 'purchase_invoice' : 'sales_invoice';

        console.log(`🔄 [ReverseStockUpdate] Reversing for ${type} transaction: ${transactionId}`);

        try {
            // 1. Find linked movements
            const { data: movements, error: fetchErr } = await supabase
                .from('inventory_movements')
                .select('id, material_id, quantity, unit_cost')
                .eq('reference_id', transactionId)
                .eq('reference_type', refType);

            if (fetchErr || !movements || movements.length === 0) {
                console.log('ℹ️ No stock movements to reverse');
                return { success: true };
            }

            // 2. Reverse stock for each movement
            for (const mv of movements) {
                const { data: mat } = await supabase
                    .from('fabric_materials')
                    .select('total_stock, avg_cost_per_unit')
                    .eq('id', mv.material_id)
                    .single();

                if (mat) {
                    const qty = Number(mv.quantity || 0);
                    const oldStock = Number(mat.total_stock || 0);
                    // Reverse: purchase was + so now -, sales was - so now +
                    const newStock = isPurchase ? oldStock - qty : oldStock + qty;

                    await supabase
                        .from('fabric_materials')
                        .update({ total_stock: newStock })
                        .eq('id', mv.material_id);
                }
            }

            // 3. Delete movements
            await supabase
                .from('inventory_movements')
                .delete()
                .eq('reference_id', transactionId)
                .eq('reference_type', refType);

            // 4. Clear link on transaction
            const table = isPurchase ? 'purchase_transactions' : 'sales_transactions';
            await supabase
                .from(table)
                .update({ stock_movement_id: null })
                .eq('id', transactionId);

            console.log(`✅ Reversed ${movements.length} stock movements`);
            return { success: true };

        } catch (error: any) {
            console.error('❌ ReverseStockUpdate error:', error);
            return { success: false, error: error.message };
        }
    },
};

export default directStockUpdateService;

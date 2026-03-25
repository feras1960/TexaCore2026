/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 varianceResolutionService — خدمة معالجة الفروقات
 * ═══════════════════════════════════════════════════════════════
 * تُنفذ عند تأكيد مراجعة الفروقات من المحاسب:
 *
 * 1. التسامح (tolerance):
 *    - إعادة توزيع المصاريف على الكميات الفعلية المستلمة
 *    - تحديث تكلفة الوحدة للمواد
 *    - تحديث cost_per_meter للرولونات
 *    - تحديث قيمة المخزون
 *
 * 2. قيد فروقات (journal_entry):
 *    - إنشاء قيد محاسبي للفرق
 *    - Dr. حساب المورد / Cr. فروقات المخزون (أو العكس)
 *
 * 3. إرجاع (return):
 *    - placeholder — سيتم ربطه بمرتجعات المشتريات
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ═══ Types ═══

interface VarianceItem {
    id: string;                  // container_item id
    material_id: string;
    expected_quantity: number;
    received_quantity: number;
    variance_amount: number;
    variance_action: string;     // 'tolerance' | 'journal_entry' | 'return'
    unit_price: number;          // original invoice price per unit
    allocated_costs: number;     // total allocated expenses for this item
    final_unit_cost: number;     // current final cost per unit (may be wrong)
}

interface ResolutionResult {
    success: boolean;
    itemsProcessed: number;
    costsRecalculated: number;
    rollsUpdated: number;
    journalEntryId?: string;
    error?: string;
}

// ═══ Main entry point ═══

export async function resolveContainerVariances(
    containerId: string,
    items: VarianceItem[],
    notes: string,
    userId: string,
): Promise<ResolutionResult> {
    const result: ResolutionResult = {
        success: false,
        itemsProcessed: 0,
        costsRecalculated: 0,
        rollsUpdated: 0,
    };

    try {
        // ── Process each item based on action ──
        for (const item of items) {
            switch (item.variance_action) {
                case 'tolerance':
                    await handleTolerance(item, result);
                    break;
                case 'journal_entry':
                    // Will be implemented in next phase
                    await handleJournalEntry(containerId, item, result);
                    break;
                case 'return':
                    // Will be linked to purchase returns in next phase
                    console.log(`[VarianceResolution] Return for item ${item.id} — placeholder`);
                    break;
            }
            result.itemsProcessed++;
        }

        // ── Mark items as resolved ──
        const itemIds = items.map(i => i.id);
        await supabase
            .from('container_items')
            .update({
                variance_resolved: true,
                updated_at: new Date().toISOString(),
            })
            .in('id', itemIds);

        // ── Also recalculate items NOT in the review (small variances under threshold) ──
        const { data: otherItems } = await supabase
            .from('container_items')
            .select('id, material_id, expected_quantity, received_quantity, variance_amount, unit_price, allocated_costs, final_unit_cost')
            .eq('container_id', containerId)
            .not('id', 'in', `(${itemIds.join(',')})`);

        if (otherItems && otherItems.length > 0) {
            for (const other of otherItems) {
                const recv = Number(other.received_quantity) || 0;
                const alloc = Number(other.allocated_costs) || 0;
                if (recv > 0 && alloc > 0) {
                    const costPerUnit = alloc / recv;
                    const newFinal = parseFloat((Number(other.unit_price) + costPerUnit).toFixed(4));
                    const oldFinal = Number(other.final_unit_cost) || 0;
                    // Only update if there's a meaningful difference
                    if (Math.abs(newFinal - oldFinal) > 0.001) {
                        await handleTolerance({
                            id: other.id,
                            material_id: other.material_id,
                            expected_quantity: Number(other.expected_quantity),
                            received_quantity: recv,
                            variance_amount: Number(other.variance_amount) || 0,
                            variance_action: 'tolerance',
                            unit_price: Number(other.unit_price),
                            allocated_costs: alloc,
                            final_unit_cost: oldFinal,
                        }, result);
                    }
                }
            }
        }

        // ── Update container status ──
        await supabase
            .from('containers')
            .update({
                variance_status: 'reviewed',
                variance_reviewed_by: userId,
                variance_reviewed_at: new Date().toISOString(),
                variance_notes: notes || null,
                status: 'received',
            })
            .eq('id', containerId);

        result.success = true;
        console.log('✅ [VarianceResolution] Complete:', result);
    } catch (err: any) {
        console.error('❌ [VarianceResolution] Failed:', err);
        result.error = err.message;
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// التسامح — إعادة حساب التكاليف على الكميات الفعلية
// ═══════════════════════════════════════════════════════════════

async function handleTolerance(item: VarianceItem, result: ResolutionResult): Promise<void> {
    const { id, received_quantity, unit_price, allocated_costs } = item;

    if (received_quantity <= 0) return;

    // ── Step 1: Recalculate cost per unit based on ACTUAL received quantity ──
    // Formula: new_final_unit_cost = unit_price + (allocated_costs / received_quantity)
    const costPerUnitAllocated = allocated_costs / received_quantity;
    const newFinalUnitCost = parseFloat((unit_price + costPerUnitAllocated).toFixed(4));
    const newTotalFinalCost = parseFloat((newFinalUnitCost * received_quantity).toFixed(2));

    console.log(`[Tolerance] Item ${id}: old final=${item.final_unit_cost}, new final=${newFinalUnitCost} (received=${received_quantity})`);

    // ── Step 2: Update container_item with corrected costs ──
    const { error: updateError } = await supabase
        .from('container_items')
        .update({
            final_unit_cost: newFinalUnitCost,
            total_final_cost: newTotalFinalCost,
            cost_per_unit_allocated: parseFloat(costPerUnitAllocated.toFixed(4)),
            variance_action: 'tolerance',
            variance_resolved: true,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (updateError) {
        console.error(`[Tolerance] Failed to update container_item ${id}:`, updateError.message);
        return;
    }
    result.costsRecalculated++;

    // ── Step 3: Update all fabric_rolls for this item with corrected cost ──
    const { data: updatedRolls, error: rollError } = await supabase
        .from('fabric_rolls')
        .update({
            cost_per_meter: newFinalUnitCost,
            final_landed_cost: newFinalUnitCost,
            allocated_expenses: parseFloat(costPerUnitAllocated.toFixed(4)),
            cost_status: 'finalized',
            updated_at: new Date().toISOString(),
        })
        .eq('container_item_id', id)
        .select('id');

    if (rollError) {
        console.error(`[Tolerance] Failed to update roll costs for item ${id}:`, rollError.message);
    } else {
        result.rollsUpdated += updatedRolls?.length || 0;
        console.log(`[Tolerance] Updated ${updatedRolls?.length || 0} rolls to new cost ${newFinalUnitCost}/m`);
    }
}

// ═══════════════════════════════════════════════════════════════
// قيد فروقات — إنشاء قيد محاسبي فعلي
// ═══════════════════════════════════════════════════════════════

async function handleJournalEntry(
    containerId: string,
    item: VarianceItem,
    result: ResolutionResult,
): Promise<void> {
    // First: recalculate costs like tolerance
    await handleTolerance(item, result);

    const varianceValue = Math.abs(item.variance_amount * item.unit_price);
    const isExcess = item.variance_amount > 0;

    if (varianceValue < 0.01) return; // Skip tiny amounts

    try {
        // ── Get container + company info ──
        const { data: container } = await supabase
            .from('containers')
            .select('company_id, tenant_id, container_number')
            .eq('id', containerId)
            .single();

        if (!container?.company_id) {
            console.warn('[JournalEntry] No company_id found for container');
            return;
        }

        // ── Get accounts ──
        const { data: companySettings } = await supabase
            .from('companies')
            .select('accounting_settings')
            .eq('id', container.company_id)
            .maybeSingle();

        let inventoryAccountId = companySettings?.accounting_settings?.default_accounts?.inventory_account_id;

        // Fallback: search CoA
        if (!inventoryAccountId) {
            const { data: invFallback } = await supabase
                .from('chart_of_accounts')
                .select('id')
                .eq('company_id', container.company_id)
                .or('account_code.like.1141%,name_ar.ilike.%بضاعة جاهزة%')
                .limit(1)
                .maybeSingle();
            inventoryAccountId = invFallback?.id;
        }

        // Find variance account (592)
        const { data: varianceAccount } = await supabase
            .from('chart_of_accounts')
            .select('id, account_code, name_ar')
            .eq('company_id', container.company_id)
            .or('account_code.eq.592,name_ar.ilike.%فروق المخزون%')
            .limit(1)
            .maybeSingle();

        if (!inventoryAccountId || !varianceAccount?.id) {
            console.warn('[JournalEntry] Missing accounts — inventory:', inventoryAccountId, 'variance:', varianceAccount?.id);
            return;
        }

        // ── Get material name for description ──
        const { data: material } = await supabase
            .from('materials')
            .select('name_ar, name_en')
            .eq('id', item.material_id)
            .maybeSingle();

        const materialName = material?.name_ar || material?.name_en || item.material_id.slice(0, 8);

        // ── Generate entry number ──
        const now = new Date();
        const entryNumber = `JE-VAR-${container.container_number}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${item.id.slice(0, 4)}`;

        // ── Create journal entry ──
        const description = isExcess
            ? `فروق مخزون — زيادة ${item.variance_amount.toFixed(1)} متر ${materialName} — ${container.container_number}`
            : `فروق مخزون — نقص ${Math.abs(item.variance_amount).toFixed(1)} متر ${materialName} — ${container.container_number}`;

        const { data: newJE, error: jeError } = await supabase
            .from('journal_entries')
            .insert({
                entry_number: entryNumber,
                entry_date: now.toISOString().split('T')[0],
                entry_type: 'inventory_variance',
                status: 'posted',
                description,
                notes: `container_id:${containerId},container_item_id:${item.id}`,
                reference_id: containerId,
                reference_type: 'container',
                total_debit: varianceValue,
                total_credit: varianceValue,
                company_id: container.company_id,
                tenant_id: container.tenant_id || null,
                posted_at: now.toISOString(),
            })
            .select('id')
            .single();

        if (jeError || !newJE) {
            console.error('[JournalEntry] Failed to create entry:', jeError?.message);
            return;
        }

        // ── Create journal entry lines ──
        // Excess: Dr. Inventory / Cr. Variance
        // Shortage: Dr. Variance / Cr. Inventory
        await supabase.from('journal_entry_lines').insert([
            {
                entry_id: newJE.id,
                account_id: isExcess ? inventoryAccountId : varianceAccount.id,
                debit: varianceValue,
                credit: 0,
                line_number: 1,
                description: isExcess
                    ? `مخزون — زيادة ${item.variance_amount.toFixed(1)} م ${materialName}`
                    : `فروق مخزون — نقص ${Math.abs(item.variance_amount).toFixed(1)} م ${materialName}`,
            },
            {
                entry_id: newJE.id,
                account_id: isExcess ? varianceAccount.id : inventoryAccountId,
                debit: 0,
                credit: varianceValue,
                line_number: 2,
                description: isExcess
                    ? `فروق مخزون — زيادة ${item.variance_amount.toFixed(1)} م ${materialName}`
                    : `مخزون — نقص ${Math.abs(item.variance_amount).toFixed(1)} م ${materialName}`,
            },
        ]);

        // ── Update account balances ──
        // Inventory account adjustment
        const { data: invBal } = await supabase
            .from('chart_of_accounts')
            .select('current_balance')
            .eq('id', inventoryAccountId)
            .maybeSingle();

        const invBalanceChange = isExcess ? varianceValue : -varianceValue;
        await supabase
            .from('chart_of_accounts')
            .update({ current_balance: (invBal?.current_balance || 0) + invBalanceChange })
            .eq('id', inventoryAccountId);

        // Variance account adjustment
        const { data: varBal } = await supabase
            .from('chart_of_accounts')
            .select('current_balance')
            .eq('id', varianceAccount.id)
            .maybeSingle();

        const varBalanceChange = isExcess ? -varianceValue : varianceValue;
        await supabase
            .from('chart_of_accounts')
            .update({ current_balance: (varBal?.current_balance || 0) + varBalanceChange })
            .eq('id', varianceAccount.id);

        result.journalEntryId = newJE.id;
        console.log(`✅ [JournalEntry] Created entry ${entryNumber} — ${isExcess ? 'EXCESS' : 'SHORTAGE'} ${varianceValue.toFixed(2)}`);
    } catch (err: any) {
        console.error('[JournalEntry] Error:', err.message);
        // Non-fatal — don't block the resolution
    }
}

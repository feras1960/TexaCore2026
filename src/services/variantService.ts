/**
 * ════════════════════════════════════════════════════════════════
 * 🧩 Variant Engine Service
 * خدمة محرك المتغيرات العام — عمليات CRUD + التوليد التلقائي
 * ════════════════════════════════════════════════════════════════
 * Phase 1B — Universal Variant Engine
 * Date: 2026-02-22
 */

import { supabase } from '@/lib/supabase';
import type {
    VariantAxis,
    VariantAxisCreate,
    VariantAxisUpdate,
    AxisValue,
    AxisValueCreate,
    AxisValueUpdate,
    ProductVariantConfig,
    ProductVariantConfigCreate,
    ProductVariant,
    ProductVariantCreate,
    ProductVariantValue,
    VariantGenerationOptions,
    VariantGenerationResult,
} from '@/types/variants';

// ═══════════════════════════════════════════════
// 🎯 Variant Axes — إدارة المحاور
// ═══════════════════════════════════════════════

/**
 * جلب كل محاور المتغيرات للشركة
 * مع عدد القيم لكل محور
 */
export async function getAxes(companyId: string): Promise<VariantAxis[]> {
    const { data, error } = await supabase
        .from('variant_axes')
        .select('*, variant_axis_values(count)')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((axis: any) => ({
        ...axis,
        values_count: axis.variant_axis_values?.[0]?.count || 0,
        variant_axis_values: undefined,
    }));
}

/**
 * جلب محور واحد مع كل قيمه
 */
export async function getAxisWithValues(axisId: string): Promise<VariantAxis & { values: AxisValue[] }> {
    const { data, error } = await supabase
        .from('variant_axes')
        .select('*, variant_axis_values(*)')
        .eq('id', axisId)
        .single();

    if (error) throw error;

    return {
        ...data,
        values: (data.variant_axis_values || []).sort(
            (a: AxisValue, b: AxisValue) => a.sort_order - b.sort_order
        ),
        variant_axis_values: undefined,
    };
}

/**
 * إنشاء محور جديد
 */
export async function createAxis(
    companyId: string,
    tenantId: string,
    input: VariantAxisCreate
): Promise<VariantAxis> {
    const { data, error } = await supabase
        .from('variant_axes')
        .insert({
            company_id: companyId,
            tenant_id: tenantId,
            code: input.code.toUpperCase().replace(/\s+/g, '_'),
            name_ar: input.name_ar,
            name_en: input.name_en || null,
            description_ar: input.description_ar || null,
            description_en: input.description_en || null,
            axis_type: input.axis_type,
            display_type: input.display_type || 'chips',
            sort_order: input.sort_order || 0,
            is_system: false,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * تحديث محور
 */
export async function updateAxis(axisId: string, input: VariantAxisUpdate): Promise<VariantAxis> {
    const { data, error } = await supabase
        .from('variant_axes')
        .update(input)
        .eq('id', axisId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * حذف محور (لا يمكن حذف المحاور النظامية)
 */
export async function deleteAxis(axisId: string): Promise<void> {
    const { error } = await supabase
        .from('variant_axes')
        .delete()
        .eq('id', axisId)
        .eq('is_system', false);

    if (error) throw error;
}


// ═══════════════════════════════════════════════
// 🎨 Axis Values — إدارة قيم المحاور
// ═══════════════════════════════════════════════

/**
 * جلب كل قيم محور معيّن
 */
export async function getAxisValues(axisId: string, companyId?: string): Promise<AxisValue[]> {
    let query = supabase
        .from('variant_axis_values')
        .select('*')
        .eq('axis_id', axisId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (companyId) {
        query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * جلب كل قيم محور بالكود (مثلاً كل الألوان)
 */
export async function getValuesByAxisCode(
    companyId: string,
    axisCode: string
): Promise<AxisValue[]> {
    const { data, error } = await supabase
        .from('variant_axis_values')
        .select('*, variant_axes!inner(code)')
        .eq('variant_axes.code', axisCode)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map((v: any) => ({
        ...v,
        variant_axes: undefined,
    }));
}

/**
 * إنشاء قيمة جديدة لمحور
 */
export async function createAxisValue(
    companyId: string,
    tenantId: string,
    input: AxisValueCreate
): Promise<AxisValue> {
    const { data, error } = await supabase
        .from('variant_axis_values')
        .insert({
            axis_id: input.axis_id,
            company_id: companyId,
            tenant_id: tenantId,
            code: input.code.toUpperCase().replace(/\s+/g, '_'),
            name_ar: input.name_ar,
            name_en: input.name_en || null,
            hex_code: input.hex_code || null,
            image_url: input.image_url || null,
            numeric_value: input.numeric_value ?? null,
            color_family: input.color_family || null,
            sort_order: input.sort_order || 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * إنشاء عدة قيم دفعة واحدة
 */
export async function batchCreateValues(
    companyId: string,
    tenantId: string,
    axisId: string,
    values: Omit<AxisValueCreate, 'axis_id'>[]
): Promise<AxisValue[]> {
    const rows = values.map((v, idx) => ({
        axis_id: axisId,
        company_id: companyId,
        tenant_id: tenantId,
        code: v.code.toUpperCase().replace(/\s+/g, '_'),
        name_ar: v.name_ar,
        name_en: v.name_en || null,
        hex_code: v.hex_code || null,
        image_url: v.image_url || null,
        numeric_value: v.numeric_value ?? null,
        color_family: v.color_family || null,
        sort_order: v.sort_order ?? idx,
    }));

    const { data, error } = await supabase
        .from('variant_axis_values')
        .upsert(rows, { onConflict: 'axis_id,company_id,code' })
        .select();

    if (error) throw error;
    return data || [];
}

/**
 * تحديث قيمة محور
 */
export async function updateAxisValue(valueId: string, input: AxisValueUpdate): Promise<AxisValue> {
    const updateData: Record<string, any> = { ...input };
    if (input.code) {
        updateData.code = input.code.toUpperCase().replace(/\s+/g, '_');
    }

    const { data, error } = await supabase
        .from('variant_axis_values')
        .update(updateData)
        .eq('id', valueId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * حذف قيمة محور
 */
export async function deleteAxisValue(valueId: string): Promise<void> {
    const { error } = await supabase
        .from('variant_axis_values')
        .delete()
        .eq('id', valueId);

    if (error) throw error;
}


// ═══════════════════════════════════════════════
// ⚙️ Product Variant Config — إعداد المنتج
// ═══════════════════════════════════════════════

/**
 * جلب إعدادات المتغيرات لمنتج معيّن
 */
export async function getProductVariantConfig(productId: string): Promise<ProductVariantConfig[]> {
    const { data, error } = await supabase
        .from('product_variant_config')
        .select('*, variant_axes!product_variant_config_axis_id_fkey(*)')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((cfg: any) => ({
        ...cfg,
        axis: cfg.variant_axes,
        variant_axes: undefined,
    }));
}

/**
 * تعيين المحاور المفعّلة لمنتج معيّن
 * يحذف القديمة ويضيف الجديدة
 */
export async function setProductVariantConfig(
    productId: string,
    companyId: string,
    configs: ProductVariantConfigCreate[]
): Promise<ProductVariantConfig[]> {
    // 1. حذف الإعدادات القديمة
    const { error: deleteError } = await supabase
        .from('product_variant_config')
        .delete()
        .eq('product_id', productId);

    if (deleteError) throw deleteError;

    // 2. إدخال الجديدة
    if (configs.length === 0) return [];

    const rows = configs.map((cfg, idx) => ({
        product_id: productId,
        product_table: cfg.product_table || 'fabric_materials',
        axis_id: cfg.axis_id,
        company_id: companyId,
        is_required: cfg.is_required || false,
        is_hierarchical: cfg.is_hierarchical || false,
        parent_axis_id: cfg.parent_axis_id || null,
        sort_order: cfg.sort_order ?? idx,
    }));

    const { data, error } = await supabase
        .from('product_variant_config')
        .insert(rows)
        .select('*, variant_axes!product_variant_config_axis_id_fkey(*)');

    if (error) throw error;

    return (data || []).map((cfg: any) => ({
        ...cfg,
        axis: cfg.variant_axes,
        variant_axes: undefined,
    }));
}


// ═══════════════════════════════════════════════
// 🏭 Product Variants — المتغيرات الفعلية
// ═══════════════════════════════════════════════

/**
 * جلب كل متغيرات منتج معيّن مع قيمها
 */
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
        .from('product_variants')
        .select(`
            *,
            product_variant_values (
                *,
                variant_axes!product_variant_values_axis_id_fkey (*),
                variant_axis_values!product_variant_values_value_id_fkey (*)
            )
        `)
        .eq('parent_product_id', productId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((variant: any) => ({
        ...variant,
        values: (variant.product_variant_values || []).map((pv: any) => ({
            ...pv,
            axis: pv.variant_axes,
            value: pv.variant_axis_values,
            variant_axes: undefined,
            variant_axis_values: undefined,
        })),
        product_variant_values: undefined,
    }));
}

/**
 * إنشاء متغير واحد
 */
export async function createVariant(
    companyId: string,
    tenantId: string,
    input: ProductVariantCreate
): Promise<ProductVariant> {
    // 1. إنشاء المتغير
    const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
            tenant_id: tenantId,
            company_id: companyId,
            product_id: input.product_id,
            parent_product_id: input.parent_product_id,
            product_table: input.product_table || 'fabric_materials',
            sku: input.sku,
            name_ar: input.name_ar || null,
            name_en: input.name_en || null,
            display_name_ar: input.display_name_ar || null,
            display_name_en: input.display_name_en || null,
            variant_data: input.variant_data || {},
        })
        .select()
        .single();

    if (variantError) throw variantError;

    // 2. إنشاء القيم
    if (input.values && input.values.length > 0) {
        const valueRows = input.values.map(v => ({
            variant_id: variant.id,
            axis_id: v.axis_id,
            value_id: v.value_id,
        }));

        const { error: valuesError } = await supabase
            .from('product_variant_values')
            .insert(valueRows);

        if (valuesError) throw valuesError;
    }

    return variant;
}

/**
 * حذف متغير
 */
export async function deleteVariant(variantId: string): Promise<void> {
    const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

    if (error) throw error;
}

/**
 * تحديث حالة المتغير
 */
export async function updateVariantStatus(variantId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from('product_variants')
        .update({ is_active: isActive })
        .eq('id', variantId);

    if (error) throw error;
}


// ═══════════════════════════════════════════════
// 🔄 Variant Generation — التوليد التلقائي
// ═══════════════════════════════════════════════

/**
 * توليد أكواد SKU تلقائياً
 * مثال: parentCode = "COTTON", values = [{ code: "PLAIN" }, { code: "RED" }]
 * النتيجة: "COTTON-PLAIN-RED"
 */
export function generateVariantSKU(parentCode: string, valueCodes: string[]): string {
    return [parentCode, ...valueCodes].join('-');
}

/**
 * توليد متغيرات تلقائياً (Cartesian Product أو هرمي)
 */
export async function generateVariants(
    companyId: string,
    tenantId: string,
    options: VariantGenerationOptions
): Promise<VariantGenerationResult> {
    try {
        const { product_id, parent_code, axes, product_table } = options;

        // 1. جلب القيم لكل محور
        const axesWithValues: { axis_id: string; values: AxisValue[]; is_hierarchical?: boolean; parent_axis_id?: string }[] = [];

        for (const axisConfig of axes) {
            const allValues = await getAxisValues(axisConfig.axis_id, companyId);
            const selectedValues = allValues.filter(v => axisConfig.value_ids.includes(v.id));
            axesWithValues.push({
                axis_id: axisConfig.axis_id,
                values: selectedValues,
                is_hierarchical: axisConfig.is_hierarchical,
                parent_axis_id: axisConfig.parent_axis_id,
            });
        }

        // 2. تحديد المحاور الأساسية (غير الهرمية) والفرعية
        const primaryAxes = axesWithValues.filter(a => !a.is_hierarchical);
        const childAxes = axesWithValues.filter(a => a.is_hierarchical);

        // 3. توليد التركيبات
        let combinations: { axis_id: string; value: AxisValue }[][] = [];

        if (primaryAxes.length === 0 && childAxes.length > 0) {
            // فقط محاور فرعية (لا يوجد أب) — تعامل كأساسية
            combinations = generateCartesianProduct(childAxes);
        } else if (primaryAxes.length > 0 && childAxes.length === 0) {
            // فقط محاور أساسية
            combinations = generateCartesianProduct(primaryAxes);
        } else {
            // هرمي: أساسي × فرعي
            const primaryCombinations = generateCartesianProduct(primaryAxes);
            const childCombinations = generateCartesianProduct(childAxes);

            for (const primary of primaryCombinations) {
                if (childCombinations.length === 0) {
                    combinations.push(primary);
                } else {
                    for (const child of childCombinations) {
                        combinations.push([...primary, ...child]);
                    }
                }
            }
        }

        // 4. جلب المتغيرات الموجودة لمنع التكرار
        const existing = await getProductVariants(product_id);
        const existingSKUs = new Set(existing.map(v => v.sku));

        // 5. إنشاء المتغيرات
        const created: ProductVariant[] = [];
        let skipped = 0;
        let parentMaterial: any = null; // Cache parent data

        for (const combo of combinations) {
            const valueCodes = combo.map(c => c.value.code);
            const sku = generateVariantSKU(parent_code, valueCodes);

            if (existingSKUs.has(sku)) {
                skipped++;
                continue;
            }

            // بناء الأسماء
            const namePartsAr = combo.map(c => c.value.name_ar);
            const namePartsEn = combo.map(c => c.value.name_en || c.value.code);

            const variant = await createVariant(companyId, tenantId, {
                product_id: product_id,
                parent_product_id: product_id,
                product_table: product_table || 'fabric_materials',
                sku,
                name_ar: namePartsAr.join(' - '),
                name_en: namePartsEn.join(' - '),
                display_name_ar: `${parent_code} — ${namePartsAr.join(' / ')}`,
                display_name_en: `${parent_code} — ${namePartsEn.join(' / ')}`,
                values: combo.map(c => ({
                    axis_id: c.axis_id,
                    value_id: c.value.id,
                })),
            });

            created.push(variant);
        }

        // 5b. إنشاء هيكلية المجموعات والمواد الفرعية في fabric_materials
        if ((product_table || 'fabric_materials') === 'fabric_materials' && created.length > 0) {
            // جلب بيانات المادة الأم
            const { data: parentMat } = await supabase
                .from('fabric_materials')
                .select('name_ar, name_en, group_id, category, unit, composition')
                .eq('id', product_id)
                .single();

            if (parentMat) {
                // ── a. إنشاء مجموعة رئيسية باسم المادة ──
                const { data: materialGroup } = await supabase
                    .from('fabric_groups')
                    .insert({
                        tenant_id: tenantId,
                        code: `${parent_code}-VARIANTS`,
                        name_ar: parentMat.name_ar,
                        name_en: parentMat.name_en || parent_code,
                        description: `متغيرات مادة ${parentMat.name_ar}`,
                        parent_id: parentMat.group_id || null,
                        is_active: true,
                    })
                    .select()
                    .single();

                const materialGroupId = materialGroup?.id;

                // ── b. تجميع المتغيرات حسب المحور الأساسي (التصميم) ──
                const hasHierarchy = primaryAxes.length > 0 && childAxes.length > 0;
                const subGroupMap = new Map<string, string>(); // valueCode → groupId

                if (hasHierarchy && materialGroupId) {
                    // إنشاء مجموعة فرعية لكل قيمة من المحور الأساسي (مثلاً: سادة، مقلّم)
                    for (const primaryAxis of primaryAxes) {
                        for (const value of primaryAxis.values) {
                            const { data: subGroup } = await supabase
                                .from('fabric_groups')
                                .insert({
                                    tenant_id: tenantId,
                                    code: `${parent_code}-${value.code}`,
                                    name_ar: value.name_ar,
                                    name_en: value.name_en || value.code,
                                    description: `${parentMat.name_ar} — ${value.name_ar}`,
                                    parent_id: materialGroupId,
                                    is_active: true,
                                })
                                .select()
                                .single();

                            if (subGroup) {
                                subGroupMap.set(value.code, subGroup.id);
                            }
                        }
                    }
                }

                // ── c. إنشاء المواد الفرعية تحت المجموعات المناسبة ──
                for (const variant of created) {
                    // تحديد المجموعة الفرعية المناسبة
                    let targetGroupId = materialGroupId;

                    if (hasHierarchy) {
                        // استخراج كود المحور الأساسي من SKU
                        // SKU format: PARENT-PRIMARY-CHILD (e.g. GRP-PLAIN-RED)
                        const skuParts = variant.sku.replace(`${parent_code}-`, '').split('-');
                        // البحث عن أول كود يطابق مجموعة فرعية
                        for (const part of skuParts) {
                            if (subGroupMap.has(part)) {
                                targetGroupId = subGroupMap.get(part)!;
                                break;
                            }
                        }
                    }

                    await supabase
                        .from('fabric_materials')
                        .insert({
                            tenant_id: tenantId,
                            company_id: companyId,
                            code: variant.sku,
                            name_ar: `${parentMat.name_ar} - ${variant.name_ar}`,
                            name_en: variant.name_en || null,
                            group_id: targetGroupId || parentMat.group_id,
                            category: parentMat.category || 'woven',
                            unit: parentMat.unit || 'meter',
                            composition: parentMat.composition || null,
                            status: 'active',
                            has_variants: false,
                            is_variant_parent: false,
                            parent_material_id: product_id,
                            variant_id: variant.id,
                        });
                }
            }
        }

        // 6. تحديث المادة كأم للمتغيرات
        if (created.length > 0) {
            await supabase
                .from('fabric_materials')
                .update({
                    has_variants: true,
                    is_variant_parent: true,
                })
                .eq('id', product_id);
        }

        return {
            success: true,
            created_count: created.length,
            skipped_count: skipped,
            variants: created,
        };
    } catch (err: any) {
        console.error('generateVariants error:', err);
        return {
            success: false,
            created_count: 0,
            skipped_count: 0,
            variants: [],
            error: err.message || 'Unknown error',
        };
    }
}


// ═══════════════════════════════════════════════
// 🧮 Helper: Cartesian Product
// ═══════════════════════════════════════════════

function generateCartesianProduct(
    axes: { axis_id: string; values: AxisValue[] }[]
): { axis_id: string; value: AxisValue }[][] {
    if (axes.length === 0) return [];
    if (axes.length === 1) {
        return axes[0].values.map(v => [{ axis_id: axes[0].axis_id, value: v }]);
    }

    const [first, ...rest] = axes;
    const restCombinations = generateCartesianProduct(rest);

    const result: { axis_id: string; value: AxisValue }[][] = [];
    for (const value of first.values) {
        for (const combo of restCombinations) {
            result.push([{ axis_id: first.axis_id, value }, ...combo]);
        }
    }

    return result;
}


// ═══════════════════════════════════════════════
// 📦 Export as service object
// ═══════════════════════════════════════════════

export const variantService = {
    // Axes
    getAxes,
    getAxisWithValues,
    createAxis,
    updateAxis,
    deleteAxis,
    // Values
    getAxisValues,
    getValuesByAxisCode,
    createAxisValue,
    batchCreateValues,
    updateAxisValue,
    deleteAxisValue,
    // Product Config
    getProductVariantConfig,
    setProductVariantConfig,
    // Variants
    getProductVariants,
    createVariant,
    deleteVariant,
    updateVariantStatus,
    // Generation
    generateVariantSKU,
    generateVariants,
};

export default variantService;

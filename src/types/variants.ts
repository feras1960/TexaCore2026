/**
 * ════════════════════════════════════════════════════════════════
 * 🧩 Variant Engine Types
 * أنواع محرك المتغيرات العام
 * ════════════════════════════════════════════════════════════════
 * Phase 1B — Universal Variant Engine
 * Date: 2026-02-22
 */

// ──────────────────────────────────────────────
// Variant Axis — محور المتغيرات
// ──────────────────────────────────────────────
export type AxisType = 'color' | 'text' | 'number' | 'image';
export type DisplayType = 'chips' | 'dropdown' | 'color_swatches' | 'images';

export interface VariantAxis {
    id: string;
    tenant_id: string;
    company_id: string;
    code: string;
    name_ar: string;
    name_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    axis_type: AxisType;
    display_type: DisplayType;
    sort_order: number;
    is_active: boolean;
    is_system: boolean;
    created_at: string;
    updated_at: string;
    // Populated on fetch
    values?: AxisValue[];
    values_count?: number;
}

export interface VariantAxisCreate {
    code: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    axis_type: AxisType;
    display_type?: DisplayType;
    sort_order?: number;
}

export interface VariantAxisUpdate {
    name_ar?: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    axis_type?: AxisType;
    display_type?: DisplayType;
    sort_order?: number;
    is_active?: boolean;
}

// ──────────────────────────────────────────────
// Axis Value — قيمة المحور
// ──────────────────────────────────────────────
export interface AxisValue {
    id: string;
    axis_id: string;
    tenant_id: string;
    company_id: string;
    code: string;
    name_ar: string;
    name_en: string | null;
    hex_code: string | null;
    image_url: string | null;
    numeric_value: number | null;
    color_family: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AxisValueCreate {
    axis_id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    hex_code?: string;
    image_url?: string;
    numeric_value?: number;
    color_family?: string;
    sort_order?: number;
}

export interface AxisValueUpdate {
    code?: string;
    name_ar?: string;
    name_en?: string;
    hex_code?: string;
    image_url?: string;
    numeric_value?: number;
    color_family?: string;
    sort_order?: number;
    is_active?: boolean;
}

// ──────────────────────────────────────────────
// Product Variant Config — إعداد المنتج
// ──────────────────────────────────────────────
export interface ProductVariantConfig {
    id: string;
    product_id: string;
    product_table: string;
    axis_id: string;
    company_id: string;
    is_required: boolean;
    is_hierarchical: boolean;
    parent_axis_id: string | null;
    sort_order: number;
    created_at: string;
    // Populated
    axis?: VariantAxis;
}

export interface ProductVariantConfigCreate {
    product_id: string;
    product_table?: string;
    axis_id: string;
    is_required?: boolean;
    is_hierarchical?: boolean;
    parent_axis_id?: string;
    sort_order?: number;
}

// ──────────────────────────────────────────────
// Product Variant — المتغير الفعلي
// ──────────────────────────────────────────────
export interface ProductVariant {
    id: string;
    tenant_id: string;
    company_id: string | null;
    product_id: string;
    parent_product_id: string | null;
    product_table: string;
    sku: string;
    name_ar: string | null;
    name_en: string | null;
    display_name_ar: string | null;
    display_name_en: string | null;
    is_active: boolean;
    sort_order: number;
    variant_data: Record<string, any>;
    created_at: string;
    updated_at: string;
    // Populated
    values?: ProductVariantValue[];
    material?: any; // linked fabric_material
}

export interface ProductVariantCreate {
    product_id: string;
    parent_product_id: string;
    product_table?: string;
    sku: string;
    name_ar?: string;
    name_en?: string;
    display_name_ar?: string;
    display_name_en?: string;
    variant_data?: Record<string, any>;
    values: { axis_id: string; value_id: string }[];
}

// ──────────────────────────────────────────────
// Product Variant Value — قيمة المتغير
// ──────────────────────────────────────────────
export interface ProductVariantValue {
    id: string;
    variant_id: string;
    axis_id: string;
    value_id: string;
    created_at: string;
    // Populated
    axis?: VariantAxis;
    value?: AxisValue;
}

// ──────────────────────────────────────────────
// Hierarchical Tree Node — عقدة الشجرة
// ──────────────────────────────────────────────
export interface VariantTreeNode {
    axis: VariantAxis;
    value: AxisValue;
    children: VariantTreeNode[];
    variant?: ProductVariant;
    material?: any;
}

// ──────────────────────────────────────────────
// Generation Options — خيارات التوليد التلقائي
// ──────────────────────────────────────────────
export interface VariantGenerationOptions {
    product_id: string;
    product_table?: string;
    parent_code: string;
    axes: {
        axis_id: string;
        value_ids: string[];
        is_hierarchical?: boolean;
        parent_axis_id?: string;
    }[];
    auto_create_materials?: boolean;
}

export interface VariantGenerationResult {
    success: boolean;
    created_count: number;
    skipped_count: number;
    variants: ProductVariant[];
    error?: string;
}

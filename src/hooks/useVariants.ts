/**
 * ════════════════════════════════════════════════════════════════
 * 🧩 useVariants Hook
 * React hooks لمحرك المتغيرات العام
 * ════════════════════════════════════════════════════════════════
 * Phase 1B — Universal Variant Engine
 * Date: 2026-02-22
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCompany } from '@/hooks/useCompany';
import { variantService } from '@/services/variantService';
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
    VariantGenerationOptions,
    VariantGenerationResult,
} from '@/types/variants';

// ═══════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════
const KEYS = {
    axes: (companyId: string) => ['variant-axes', companyId] as const,
    axisValues: (axisId: string) => ['variant-axis-values', axisId] as const,
    axisWithValues: (axisId: string) => ['variant-axis-with-values', axisId] as const,
    valuesByCode: (companyId: string, code: string) => ['variant-values-by-code', companyId, code] as const,
    productConfig: (productId: string) => ['variant-product-config', productId] as const,
    productVariants: (productId: string) => ['product-variants', productId] as const,
};


// ═══════════════════════════════════════════════
// 🎯 useVariantAxes — جلب كل المحاور
// ═══════════════════════════════════════════════

export function useVariantAxes() {
    const { companyId, company } = useCompany();
    const tenantId = company?.tenant_id;

    const query = useCachedQuery({
        queryKey: KEYS.axes(companyId || ''),
        queryFn: () => variantService.getAxes(companyId!),
        enabled: !!companyId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const queryClient = useQueryClient();

    // ─── Create Axis ───
    const createMutation = useMutation({
        mutationFn: (input: VariantAxisCreate) =>
            variantService.createAxis(companyId!, tenantId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    // ─── Update Axis ───
    const updateMutation = useMutation({
        mutationFn: ({ axisId, input }: { axisId: string; input: VariantAxisUpdate }) =>
            variantService.updateAxis(axisId, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    // ─── Delete Axis ───
    const deleteMutation = useMutation({
        mutationFn: (axisId: string) => variantService.deleteAxis(axisId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    return {
        axes: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,

        createAxis: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateAxis: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteAxis: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
}


// ═══════════════════════════════════════════════
// 🎨 useAxisValues — قيم محور معيّن
// ═══════════════════════════════════════════════

export function useAxisValues(axisId: string | null) {
    const { companyId, company } = useCompany();
    const tenantId = company?.tenant_id;

    const query = useCachedQuery({
        queryKey: KEYS.axisValues(axisId || ''),
        queryFn: () => variantService.getAxisValues(axisId!, companyId!),
        enabled: !!axisId && !!companyId,
        staleTime: 5 * 60 * 1000,
    });

    const queryClient = useQueryClient();

    // ─── Create Value ───
    const createMutation = useMutation({
        mutationFn: (input: AxisValueCreate) =>
            variantService.createAxisValue(companyId!, tenantId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axisValues(axisId || '') });
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    // ─── Batch Create ───
    const batchCreateMutation = useMutation({
        mutationFn: (values: Omit<AxisValueCreate, 'axis_id'>[]) =>
            variantService.batchCreateValues(companyId!, tenantId!, axisId!, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axisValues(axisId || '') });
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    // ─── Update Value ───
    const updateMutation = useMutation({
        mutationFn: ({ valueId, input }: { valueId: string; input: AxisValueUpdate }) =>
            variantService.updateAxisValue(valueId, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axisValues(axisId || '') });
        },
    });

    // ─── Delete Value ───
    const deleteMutation = useMutation({
        mutationFn: (valueId: string) => variantService.deleteAxisValue(valueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.axisValues(axisId || '') });
            queryClient.invalidateQueries({ queryKey: KEYS.axes(companyId || '') });
        },
    });

    return {
        values: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,

        createValue: createMutation.mutateAsync,
        batchCreate: batchCreateMutation.mutateAsync,
        updateValue: updateMutation.mutateAsync,
        deleteValue: deleteMutation.mutateAsync,

        isCreating: createMutation.isPending,
        isBatchCreating: batchCreateMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}


// ═══════════════════════════════════════════════
// 🎯 useValuesByAxisCode — قيم بالكود (مثل كل الألوان)
// ═══════════════════════════════════════════════

export function useValuesByAxisCode(axisCode: string | null) {
    const { companyId } = useCompany();

    return useCachedQuery({
        queryKey: KEYS.valuesByCode(companyId || '', axisCode || ''),
        queryFn: () => variantService.getValuesByAxisCode(companyId!, axisCode!),
        enabled: !!companyId && !!axisCode,
        staleTime: 5 * 60 * 1000,
    });
}


// ═══════════════════════════════════════════════
// ⚙️ useProductVariantConfig — إعداد المنتج
// ═══════════════════════════════════════════════

export function useProductVariantConfig(productId: string | null) {
    const { companyId } = useCompany();
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: KEYS.productConfig(productId || ''),
        queryFn: () => variantService.getProductVariantConfig(productId!),
        enabled: !!productId,
        staleTime: 2 * 60 * 1000,
    });

    // ─── Set Config ───
    const setConfigMutation = useMutation({
        mutationFn: (configs: ProductVariantConfigCreate[]) =>
            variantService.setProductVariantConfig(productId!, companyId!, configs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.productConfig(productId || '') });
        },
    });

    return {
        config: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        setConfig: setConfigMutation.mutateAsync,
        isSaving: setConfigMutation.isPending,
    };
}


// ═══════════════════════════════════════════════
// 🏭 useProductVariants — متغيرات منتج معيّن
// ═══════════════════════════════════════════════

export function useProductVariants(productId: string | null) {
    const { companyId, company } = useCompany();
    const tenantId = company?.tenant_id;
    const queryClient = useQueryClient();

    const query = useCachedQuery({
        queryKey: KEYS.productVariants(productId || ''),
        queryFn: () => variantService.getProductVariants(productId!),
        enabled: !!productId,
        staleTime: 2 * 60 * 1000,
    });

    // ─── Create Single Variant ───
    const createMutation = useMutation({
        mutationFn: (input: ProductVariantCreate) =>
            variantService.createVariant(companyId!, tenantId!, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.productVariants(productId || '') });
        },
    });

    // ─── Generate Variants (Auto) ───
    const generateMutation = useMutation({
        mutationFn: (options: VariantGenerationOptions) =>
            variantService.generateVariants(companyId!, tenantId!, options),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.productVariants(productId || '') });
        },
    });

    // ─── Delete Variant ───
    const deleteMutation = useMutation({
        mutationFn: (variantId: string) => variantService.deleteVariant(variantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.productVariants(productId || '') });
        },
    });

    // ─── Toggle Active ───
    const toggleMutation = useMutation({
        mutationFn: ({ variantId, isActive }: { variantId: string; isActive: boolean }) =>
            variantService.updateVariantStatus(variantId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.productVariants(productId || '') });
        },
    });

    return {
        variants: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,

        createVariant: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        generateVariants: generateMutation.mutateAsync,
        isGenerating: generateMutation.isPending,
        lastGenerationResult: generateMutation.data as VariantGenerationResult | undefined,

        deleteVariant: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,

        toggleVariantStatus: toggleMutation.mutateAsync,
    };
}

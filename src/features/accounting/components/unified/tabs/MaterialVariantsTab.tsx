/**
 * ════════════════════════════════════════════════════════════════
 * 🎨 Material Variants Tab v2 — Universal Variant Engine
 * تبويب المتغيرات التفاعلي مع دعم الشجرة والتوليد التلقائي
 * ════════════════════════════════════════════════════════════════
 * Phase 2B — 2026-02-22
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Palette, Image as ImageIcon, Info, Layers, ChevronDown, ChevronRight,
    Plus, Trash2, Wand2, Check, X, Package, Loader2, AlertCircle,
} from 'lucide-react';
import { useVariantAxes, useAxisValues, useProductVariantConfig, useProductVariants } from '@/hooks/useVariants';
import type { VariantAxis, AxisValue, ProductVariant } from '@/types/variants';
import type { SheetMode } from '../types';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════
interface MaterialVariantsTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

// ═══════════════════════════════════════════════
// Axis Icon Map
// ═══════════════════════════════════════════════
function getAxisIcon(code: string) {
    switch (code) {
        case 'COLOR': return <Palette className="w-4 h-4" />;
        case 'DESIGN': return <ImageIcon className="w-4 h-4" />;
        case 'SIZE': return <Layers className="w-4 h-4" />;
        default: return <Package className="w-4 h-4" />;
    }
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export function MaterialVariantsTab({ data, mode, onChange }: MaterialVariantsTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const isReadOnly = mode === 'view';
    const materialId = data?.id;

    // ─── Data Hooks ───
    const { axes, isLoading: axesLoading } = useVariantAxes();
    const { config, setConfig, isSaving: configSaving } = useProductVariantConfig(materialId);
    const { variants, generateVariants, isGenerating, deleteVariant, refetch: refetchVariants } = useProductVariants(materialId);

    // ─── Local State ───
    const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [selectedGenAxes, setSelectedGenAxes] = useState<Record<string, string[]>>({});
    const [showAddValueDialog, setShowAddValueDialog] = useState<{ axisId: string; axisCode: string } | null>(null);

    // ─── Derived ───
    const enabledAxes = useMemo(() => {
        return config.map(c => ({
            ...c,
            axis: axes.find(a => a.id === c.axis_id),
        })).filter(c => c.axis);
    }, [config, axes]);

    const hasVariants = variants.length > 0;

    // ─── Active axes (ones that are enabled for this product) ───
    const activeAxisIds = useMemo(() => new Set(config.map(c => c.axis_id)), [config]);

    // Group variants by primary (non-hierarchical) axis for tree view
    const variantTree = useMemo(() => {
        if (!variants.length) return null;

        // Find hierarchical config
        const hierarchicalConfig = config.find(c => c.is_hierarchical);
        const primaryConfig = config.find(c => !c.is_hierarchical);

        if (!primaryConfig || !hierarchicalConfig) {
            // Flat list — no hierarchy
            return { type: 'flat' as const, variants };
        }

        // Group by primary axis value
        const groups = new Map<string, { value: AxisValue; variants: ProductVariant[] }>();

        for (const variant of variants) {
            const primaryValue = variant.values?.find(v => v.axis_id === primaryConfig.axis_id);
            if (!primaryValue?.value) continue;

            const key = primaryValue.value_id;
            if (!groups.has(key)) {
                groups.set(key, { value: primaryValue.value, variants: [] });
            }
            groups.get(key)!.variants.push(variant);
        }

        return { type: 'tree' as const, groups: Array.from(groups.values()), primaryAxisId: primaryConfig.axis_id, childAxisId: hierarchicalConfig.axis_id };
    }, [variants, config]);

    // ─── Handlers ───
    const handleToggleAxis = useCallback(async (axis: VariantAxis, enabled: boolean) => {
        if (isReadOnly || !materialId) return;

        const currentConfigs = config.filter(c => c.axis_id !== axis.id);
        if (enabled) {
            currentConfigs.push({
                id: '',
                product_id: materialId,
                product_table: 'fabric_materials',
                axis_id: axis.id,
                company_id: '',
                is_required: false,
                is_hierarchical: false,
                parent_axis_id: null,
                sort_order: currentConfigs.length,
                created_at: '',
            });
        }

        // Update onChange for has_variants
        if (onChange) {
            onChange({ has_variants: currentConfigs.length > 0 });
        }

        await setConfig(currentConfigs.map(c => ({
            product_id: materialId,
            axis_id: c.axis_id,
            is_required: c.is_required,
            is_hierarchical: c.is_hierarchical,
            parent_axis_id: c.parent_axis_id,
            sort_order: c.sort_order,
        })));
    }, [config, materialId, isReadOnly, onChange, setConfig]);

    const handleSetHierarchical = useCallback(async (axisId: string, isHierarchical: boolean, parentAxisId?: string) => {
        if (isReadOnly || !materialId) return;

        // ⚠️ قاعدة: فقط محور واحد يمكن أن يكون هرمياً (فرعياً تحت الآخر)
        // عند تفعيل هرمية لمحور → إلغاء هرمية كل المحاور الأخرى
        const updatedConfigs = config.map(c => {
            if (c.axis_id === axisId) {
                return { ...c, is_hierarchical: isHierarchical, parent_axis_id: parentAxisId || null };
            }
            // إلغاء هرمية المحاور الأخرى عند تفعيل واحد جديد
            if (isHierarchical) {
                return { ...c, is_hierarchical: false, parent_axis_id: null };
            }
            return c;
        });

        await setConfig(updatedConfigs.map(c => ({
            product_id: materialId,
            axis_id: c.axis_id,
            is_required: c.is_required,
            is_hierarchical: c.is_hierarchical,
            parent_axis_id: c.parent_axis_id,
            sort_order: c.sort_order,
        })));
    }, [config, materialId, isReadOnly, setConfig]);

    const toggleDesignExpand = (valueId: string) => {
        setExpandedDesigns(prev => {
            const next = new Set(prev);
            if (next.has(valueId)) next.delete(valueId);
            else next.add(valueId);
            return next;
        });
    };

    const handleGenerate = useCallback(async () => {
        if (!materialId) return;

        const axesConfig = Object.entries(selectedGenAxes)
            .filter(([, valueIds]) => valueIds.length > 0)
            .map(([axisId, valueIds]) => {
                const cfg = config.find(c => c.axis_id === axisId);
                return {
                    axis_id: axisId,
                    value_ids: valueIds,
                    is_hierarchical: cfg?.is_hierarchical || false,
                    parent_axis_id: cfg?.parent_axis_id || undefined,
                };
            });

        if (axesConfig.length === 0) return;

        await generateVariants({
            product_id: materialId,
            parent_code: data?.code || 'MAT',
            axes: axesConfig,
        });

        setShowGenerateDialog(false);
        setSelectedGenAxes({});
    }, [materialId, selectedGenAxes, config, data?.code, generateVariants]);

    const handleDeleteVariant = useCallback(async (variantId: string) => {
        if (!confirm(isAr ? 'هل تريد حذف هذا المتغير؟' : 'Delete this variant?')) return;
        await deleteVariant(variantId);
    }, [deleteVariant, isAr]);

    // ─── Loading ───
    if (axesLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-erp-primary" />
                <span className="mr-2 text-sm text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    // ─── No Material ID (create mode before save) ───
    if (!materialId) {
        return (
            <div className="space-y-6 pb-6">
                <InfoBanner isAr={isAr} />
                <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                        <p className="text-base font-medium text-amber-700 dark:text-amber-400">
                            {isAr ? 'يجب حفظ المادة أولاً' : 'Save the material first'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAr
                                ? 'احفظ المادة الأساسية أولاً، ثم يمكنك تفعيل وإدارة المتغيرات.'
                                : 'Save the base material first, then you can enable and manage variants.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-6">
            {/* Info Banner */}
            <InfoBanner isAr={isAr} />

            {/* ═══ Axis Toggles ═══ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Layers className="w-5 h-5 text-erp-primary" />
                        {isAr ? 'المحاور المتاحة' : 'Available Axes'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {axes.filter(a => a.is_active).map(axis => {
                        const isEnabled = activeAxisIds.has(axis.id);
                        const cfg = config.find(c => c.axis_id === axis.id);
                        const otherEnabled = config.filter(c => c.axis_id !== axis.id);

                        return (
                            <div key={axis.id} className={cn(
                                "rounded-lg border p-3 transition-all",
                                isEnabled
                                    ? "border-erp-primary/40 bg-erp-primary/5"
                                    : "border-gray-200 dark:border-gray-700"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            isEnabled ? "bg-erp-primary/10 text-erp-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                        )}>
                                            {getAxisIcon(axis.code)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {isAr ? axis.name_ar : (axis.name_en || axis.name_ar)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {isAr ? axis.description_ar : (axis.description_en || axis.description_ar)}
                                                {axis.values_count ? ` (${axis.values_count} ${isAr ? 'قيمة' : 'values'})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => handleToggleAxis(axis, checked)}
                                        disabled={isReadOnly || configSaving}
                                    />
                                </div>

                                {/* Hierarchical option — only when 2+ axes enabled */}
                                {isEnabled && otherEnabled.length > 0 && (() => {
                                    // التحقق إذا محور آخر مفعّل كهرمي بالفعل
                                    const anotherIsHierarchical = config.some(c => c.axis_id !== axis.id && c.is_hierarchical);
                                    const thisIsHierarchical = cfg?.is_hierarchical || false;
                                    const parentAxisName = isAr
                                        ? otherEnabled[0]?.axis?.name_ar || 'المحور الآخر'
                                        : otherEnabled[0]?.axis?.name_en || 'other axis';

                                    return (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`hier-${axis.id}`}
                                                    checked={thisIsHierarchical}
                                                    onCheckedChange={(checked) => {
                                                        const parentAxis = otherEnabled[0];
                                                        handleSetHierarchical(axis.id, !!checked, parentAxis?.axis_id);
                                                    }}
                                                    disabled={isReadOnly || (anotherIsHierarchical && !thisIsHierarchical)}
                                                />
                                                <Label
                                                    htmlFor={`hier-${axis.id}`}
                                                    className={cn(
                                                        "text-xs",
                                                        anotherIsHierarchical && !thisIsHierarchical
                                                            ? "text-gray-400 line-through"
                                                            : "text-gray-600 dark:text-gray-400"
                                                    )}
                                                >
                                                    {isAr
                                                        ? `تجميع حسب ${parentAxisName} ← ${isAr ? axis.name_ar : axis.name_en} كفرعي`
                                                        : `Group by ${parentAxisName} ← ${axis.name_en || axis.name_ar} as child`}
                                                </Label>
                                            </div>
                                            {thisIsHierarchical && (
                                                <p className="text-[10px] text-green-600 mt-1 ms-6 flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    {isAr
                                                        ? `${parentAxisName} هو التجميع الرئيسي → ${axis.name_ar} تحته`
                                                        : `${parentAxisName} is the main grouping → ${axis.name_en} under it`}
                                                </p>
                                            )}
                                            {anotherIsHierarchical && !thisIsHierarchical && (
                                                <p className="text-[10px] text-gray-400 mt-1 ms-6">
                                                    {isAr
                                                        ? '⚠️ محور آخر مُعيّن كهرمي بالفعل — أزل الأول لتغيير الاتجاه'
                                                        : '⚠️ Another axis is already hierarchical — remove it first to change direction'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ═══ Generate Button ═══ */}
            {enabledAxes.length > 0 && !isReadOnly && (
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowGenerateDialog(true)}
                        className="bg-gradient-to-r from-erp-primary to-erp-teal text-white gap-2"
                        disabled={isGenerating}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isAr ? 'توليد المتغيرات' : 'Generate Variants'}
                    </Button>
                    {hasVariants && (
                        <Badge variant="secondary" className="text-xs">
                            {variants.length} {isAr ? 'متغير' : 'variants'}
                        </Badge>
                    )}
                </div>
            )}

            {/* ═══ Variants Display ═══ */}
            {hasVariants && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-purple-600" />
                                {isAr ? 'المتغيرات المُنشأة' : 'Created Variants'}
                                <Badge variant="outline" className="text-xs">{variants.length}</Badge>
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {variantTree?.type === 'tree' ? (
                            // ─── Tree View ───
                            <div className="space-y-2">
                                {variantTree.groups.map(group => {
                                    const isExpanded = expandedDesigns.has(group.value.id);
                                    return (
                                        <div key={group.value.id} className="border rounded-lg overflow-hidden">
                                            {/* Group Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleDesignExpand(group.value.id)}
                                                className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-start"
                                            >
                                                {isExpanded
                                                    ? <ChevronDown className="w-4 h-4 text-gray-500" />
                                                    : <ChevronRight className="w-4 h-4 text-gray-500" />
                                                }
                                                {group.value.hex_code && (
                                                    <div
                                                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                                        style={{ backgroundColor: group.value.hex_code }}
                                                    />
                                                )}
                                                <span className="font-medium text-sm">
                                                    {isAr ? group.value.name_ar : (group.value.name_en || group.value.name_ar)}
                                                </span>
                                                <Badge variant="secondary" className="text-xs ms-auto">
                                                    {group.variants.length} {isAr ? 'متغير' : 'variants'}
                                                </Badge>
                                            </button>

                                            {/* Group Children */}
                                            {isExpanded && (
                                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {group.variants.map(variant => (
                                                        <VariantRow
                                                            key={variant.id}
                                                            variant={variant}
                                                            isAr={isAr}
                                                            isReadOnly={isReadOnly}
                                                            onDelete={handleDeleteVariant}
                                                            indented
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // ─── Flat List ───
                            <div className="divide-y divide-gray-100 dark:divide-gray-700 border rounded-lg overflow-hidden">
                                {variants.map(variant => (
                                    <VariantRow
                                        key={variant.id}
                                        variant={variant}
                                        isAr={isAr}
                                        isReadOnly={isReadOnly}
                                        onDelete={handleDeleteVariant}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ Generate Dialog ═══ */}
            <GenerateDialog
                open={showGenerateDialog}
                onClose={() => setShowGenerateDialog(false)}
                enabledAxes={enabledAxes}
                selectedValues={selectedGenAxes}
                onSelectedChange={setSelectedGenAxes}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                isAr={isAr}
                parentCode={data?.code || 'MAT'}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════

function InfoBanner({ isAr }: { isAr: boolean }) {
    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {isAr ? 'ما هي المتغيرات؟' : 'What are Variants?'}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        {isAr
                            ? 'المتغيرات تسمح لك بإنشاء نسخ مرتبطة بنفس المادة الأساسية ولكن بخصائص مختلفة. فعّل المحاور المطلوبة، اختر القيم، ثم ولّد المتغيرات تلقائياً.'
                            : 'Variants let you create linked copies of the same base material with different properties. Enable axes, select values, then auto-generate variants.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Single Variant Row ───
function VariantRow({ variant, isAr, isReadOnly, onDelete, indented }: {
    variant: ProductVariant;
    isAr: boolean;
    isReadOnly: boolean;
    onDelete: (id: string) => void;
    indented?: boolean;
}) {
    const values = variant.values || [];

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors",
            indented && "ps-8"
        )}>
            {/* Color Swatch */}
            {values.map(v => v.value?.hex_code && (
                <div
                    key={v.id}
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: v.value.hex_code }}
                    title={isAr ? v.value.name_ar : (v.value.name_en || v.value.name_ar)}
                />
            ))}

            {/* SKU */}
            <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {variant.sku}
            </span>

            {/* Name */}
            <span className="text-sm flex-1 truncate">
                {isAr ? variant.display_name_ar || variant.name_ar : variant.display_name_en || variant.name_en || variant.name_ar}
            </span>

            {/* Value Badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {values.map(v => (
                    <Badge key={v.id} variant="outline" className="text-xs py-0">
                        {isAr ? v.value?.name_ar : (v.value?.name_en || v.value?.name_ar)}
                    </Badge>
                ))}
            </div>

            {/* Status */}
            <Badge variant={variant.is_active ? "default" : "secondary"} className="text-xs flex-shrink-0">
                {variant.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطّل' : 'Inactive')}
            </Badge>

            {/* Delete */}
            {!isReadOnly && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    onClick={() => onDelete(variant.id)}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            )}
        </div>
    );
}

// ─── Generate Dialog ───
function GenerateDialog({
    open, onClose, enabledAxes, selectedValues, onSelectedChange, onGenerate, isGenerating, isAr, parentCode,
}: {
    open: boolean;
    onClose: () => void;
    enabledAxes: any[];
    selectedValues: Record<string, string[]>;
    onSelectedChange: (v: Record<string, string[]>) => void;
    onGenerate: () => void;
    isGenerating: boolean;
    isAr: boolean;
    parentCode: string;
}) {
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg" dir={isAr ? 'rtl' : 'ltr'}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-erp-primary" />
                        {isAr ? 'توليد المتغيرات' : 'Generate Variants'}
                    </DialogTitle>
                    <DialogDescription>
                        {isAr
                            ? 'اختر القيم لكل محور. سيتم توليد كل التركيبات الممكنة تلقائياً.'
                            : 'Select values for each axis. All possible combinations will be auto-generated.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {enabledAxes.map(cfg => (
                        <AxisValueSelector
                            key={cfg.axis_id}
                            axisId={cfg.axis_id}
                            axis={cfg.axis}
                            selected={selectedValues[cfg.axis_id] || []}
                            onChange={(vals) => onSelectedChange({ ...selectedValues, [cfg.axis_id]: vals })}
                            isAr={isAr}
                        />
                    ))}

                    {/* Preview */}
                    <PreviewSection
                        enabledAxes={enabledAxes}
                        selectedValues={selectedValues}
                        parentCode={parentCode}
                        isAr={isAr}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={onGenerate}
                        disabled={isGenerating || Object.values(selectedValues).every(v => !v.length)}
                        className="bg-gradient-to-r from-erp-primary to-erp-teal text-white gap-2"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isAr ? 'توليد' : 'Generate'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Axis Value Selector (used inside Generate Dialog) ───
function AxisValueSelector({ axisId, axis, selected, onChange, isAr }: {
    axisId: string;
    axis: VariantAxis;
    selected: string[];
    onChange: (ids: string[]) => void;
    isAr: boolean;
}) {
    const { values, isLoading, createValue, isCreating } = useAxisValues(axisId);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNameAr, setNewNameAr] = useState('');
    const [newNameEn, setNewNameEn] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newHexCode, setNewHexCode] = useState('#3B82F6');

    const isColorAxis = axis.axis_type === 'color';

    const toggleValue = (valueId: string) => {
        if (selected.includes(valueId)) {
            onChange(selected.filter(id => id !== valueId));
        } else {
            onChange([...selected, valueId]);
        }
    };

    const selectAll = () => onChange(values.map(v => v.id));
    const clearAll = () => onChange([]);

    const handleAddValue = async () => {
        if (!newNameAr.trim()) return;

        try {
            const code = newCode.trim() || newNameEn.trim().toUpperCase().replace(/\s+/g, '_') || newNameAr.trim();
            const newValue = await createValue({
                axis_id: axisId,
                code,
                name_ar: newNameAr.trim(),
                name_en: newNameEn.trim() || undefined,
                hex_code: isColorAxis ? newHexCode : undefined,
                sort_order: values.length,
            });

            // Auto-select the new value
            if (newValue?.id) {
                onChange([...selected, newValue.id]);
            }

            // Reset form
            setNewNameAr('');
            setNewNameEn('');
            setNewCode('');
            setNewHexCode('#3B82F6');
            setShowAddForm(false);
        } catch (err: any) {
            console.error('Error adding value:', err);
            alert(isAr ? `خطأ: ${err.message}` : `Error: ${err.message}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-erp-primary/10 text-erp-primary">
                        {getAxisIcon(axis.code)}
                    </div>
                    <span className="font-medium text-sm">
                        {isAr ? axis.name_ar : (axis.name_en || axis.name_ar)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                        {selected.length}/{values.length}
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                        {isAr ? 'الكل' : 'All'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                        {isAr ? 'مسح' : 'Clear'}
                    </Button>
                </div>
            </div>

            {/* Value Chips */}
            <div className="flex flex-wrap gap-1.5">
                {values.map(value => {
                    const isSelected = selected.includes(value.id);
                    return (
                        <button
                            key={value.id}
                            type="button"
                            onClick={() => toggleValue(value.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                                isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300"
                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            )}
                        >
                            {value.hex_code && (
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 flex-shrink-0",
                                        isSelected ? "border-white/70" : "border-gray-300 dark:border-gray-500"
                                    )}
                                    style={{ backgroundColor: value.hex_code }}
                                />
                            )}
                            <span className={isSelected ? "text-white" : "text-gray-800 dark:text-gray-200"}>
                                {isAr ? value.name_ar : (value.name_en || value.name_ar)}
                            </span>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                    );
                })}

                {/* Add Button (chip style) */}
                {!showAddForm && (
                    <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-erp-primary hover:text-erp-primary transition-all"
                    >
                        <Plus className="w-3 h-3" />
                        {isAr ? 'إضافة' : 'Add'}
                    </button>
                )}
            </div>

            {/* ─── Quick Add Form ─── */}
            {showAddForm && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {isAr
                            ? `إضافة ${isColorAxis ? 'لون' : 'قيمة'} جديد`
                            : `Add new ${isColorAxis ? 'color' : 'value'}`}
                    </p>

                    <div className="flex items-center gap-2">
                        {/* Color picker for color axis */}
                        {isColorAxis && (
                            <div className="relative flex-shrink-0">
                                <input
                                    type="color"
                                    value={newHexCode}
                                    onChange={(e) => setNewHexCode(e.target.value)}
                                    className="w-8 h-8 rounded-lg border-2 border-gray-200 cursor-pointer p-0"
                                    style={{ backgroundColor: newHexCode }}
                                />
                            </div>
                        )}

                        {/* Arabic Name */}
                        <Input
                            value={newNameAr}
                            onChange={(e) => setNewNameAr(e.target.value)}
                            placeholder={isAr ? 'الاسم بالعربي *' : 'Arabic name *'}
                            className="h-8 text-xs flex-1"
                            dir="rtl"
                            autoFocus
                        />

                        {/* English Name */}
                        <Input
                            value={newNameEn}
                            onChange={(e) => setNewNameEn(e.target.value)}
                            placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'}
                            className="h-8 text-xs flex-1"
                            dir="ltr"
                        />
                    </div>

                    {/* Code (optional) */}
                    <div className="flex items-center gap-2">
                        <Input
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                            placeholder={isAr ? 'الكود (اختياري)' : 'Code (optional)'}
                            className="h-8 text-xs flex-1 font-mono"
                            dir="ltr"
                        />

                        <Button
                            size="sm"
                            className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleAddValue}
                            disabled={!newNameAr.trim() || isCreating}
                        >
                            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {isAr ? 'أضف' : 'Add'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                                setShowAddForm(false);
                                setNewNameAr('');
                                setNewNameEn('');
                                setNewCode('');
                            }}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}

            {values.length === 0 && !showAddForm && (
                <p className="text-xs text-gray-400 text-center py-2">
                    {isAr ? 'لا توجد قيم — اضغط "إضافة" لإنشاء قيم جديدة' : 'No values — click "Add" to create new values'}
                </p>
            )}
        </div>
    );
}

// ─── Preview Section ───
function PreviewSection({ enabledAxes, selectedValues, parentCode, isAr }: {
    enabledAxes: any[];
    selectedValues: Record<string, string[]>;
    parentCode: string;
    isAr: boolean;
}) {
    const totalSelected = Object.values(selectedValues).reduce((acc, v) => acc + v.length, 0);

    if (totalSelected === 0) return null;

    // Calculate total combinations
    const nonEmptyAxes = Object.values(selectedValues).filter(v => v.length > 0);
    const totalCombinations = nonEmptyAxes.reduce((acc, v) => acc * v.length, 1);

    return (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    {isAr ? 'المتغيرات المتوقعة:' : 'Expected variants:'}
                </span>
                <Badge className="bg-purple-600 text-white">
                    {totalCombinations} {isAr ? 'متغير' : 'variants'}
                </Badge>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {isAr
                    ? `سيتم توليد ${totalCombinations} مادة فرعية بأكواد تبدأ بـ ${parentCode}-...`
                    : `${totalCombinations} child materials will be created with codes starting with ${parentCode}-...`}
            </p>
        </div>
    );
}

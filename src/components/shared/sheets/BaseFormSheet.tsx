/**
 * BaseFormSheet - المكون الأساسي لنماذج الإضافة والتعديل
 * 
 * مكون موحد لجميع نماذج الإضافة والتعديل في النظام
 * يتبع نفس نمط BaseDetailSheet ولكن مخصص للنماذج
 * 
 * الميزات:
 * - Header مع Icon و Title
 * - Form Fields مع Validation
 * - Actions (Save/Cancel)
 * - RTL Support
 * - Loading States
 * - Error Handling
 */

import React, { useState, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ===== Types =====
export type FormFieldType =
    | 'text'
    | 'number'
    | 'email'
    | 'tel'
    | 'url'
    | 'password'
    | 'textarea'
    | 'select'
    | 'switch'
    | 'checkbox';

export interface FormFieldConfig {
    key: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    rows?: number; // For textarea
    dir?: 'ltr' | 'rtl' | 'auto';
    validate?: (value: any, formData: Record<string, any>) => string | null;
    disabled?: boolean;
    className?: string;
    gridCols?: 1 | 2; // How many columns this field spans
}

export interface FormSectionConfig {
    id: string;
    title?: string;
    fields: FormFieldConfig[];
    columns?: 1 | 2; // Grid columns for this section
}

export interface BaseFormSheetConfig {
    title: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg?: string;
    sections: FormSectionConfig[];
    width?: 'sm' | 'md' | 'lg' | 'xl';
    saveButtonText?: string;
    showCancel?: boolean;
}

export interface BaseFormSheetProps<T extends Record<string, any>> {
    isOpen: boolean;
    onClose: () => void;
    config: BaseFormSheetConfig;
    initialData: T;
    onSave: (data: T) => Promise<void>;
    isEdit?: boolean;
    loading?: boolean;
}

// ===== Width Classes =====
const FORM_WIDTH_CLASSES = {
    sm: 'w-[400px]',
    md: 'w-[500px]',
    lg: 'w-[600px]',
    xl: 'w-[800px]',
} as const;

// ===== Component =====
export function BaseFormSheet<T extends Record<string, any>>({
    isOpen,
    onClose,
    config,
    initialData,
    onSave,
    isEdit = false,
    loading = false,
}: BaseFormSheetProps<T>) {
    const { t, direction } = useLanguage();
    const [formData, setFormData] = useState<T>(initialData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    // Reset form when opening
    React.useEffect(() => {
        if (isOpen) {
            setFormData(initialData);
            setErrors({});
        }
    }, [isOpen, initialData]);

    // Update field
    const updateField = useCallback((key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        // Clear error for this field
        if (errors[key]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    }, [errors]);

    // Validate form
    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        config.sections.forEach(section => {
            section.fields.forEach(field => {
                const value = formData[field.key];

                // Required validation
                if (field.required && (value === undefined || value === '' || value === null)) {
                    newErrors[field.key] = t('errors.validation.required');
                }

                // Custom validation
                if (field.validate && !newErrors[field.key]) {
                    const error = field.validate(value, formData);
                    if (error) {
                        newErrors[field.key] = error;
                    }
                }
            });
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [config.sections, formData, t]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!validateForm()) {
            toast.error(t('errors.validation.checkFields'));
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
            toast.success(isEdit ? t('common.saved') : t('common.added'));
            onClose();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error(t('errors.network.saveFailed'));
        } finally {
            setSaving(false);
        }
    }, [formData, isEdit, onClose, onSave, t, validateForm]);

    // Render field
    const renderField = (field: FormFieldConfig) => {
        const value = formData[field.key];
        const error = errors[field.key];
        const isDisabled = field.disabled || saving || loading;

        switch (field.type) {
            case 'switch':
            case 'checkbox':
                return (
                    <div className="flex items-center justify-between">
                        <Label htmlFor={field.key} className="cursor-pointer">
                            {field.label}
                            {field.helpText && (
                                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                                    {field.helpText}
                                </span>
                            )}
                        </Label>
                        <Switch
                            id={field.key}
                            checked={!!value}
                            onCheckedChange={(checked) => updateField(field.key, checked)}
                            disabled={isDisabled}
                        />
                    </div>
                );

            case 'select':
                return (
                    <div className="grid gap-2">
                        <Label htmlFor={field.key}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Select
                            value={value || ''}
                            onValueChange={(val) => updateField(field.key, val)}
                            disabled={isDisabled}
                        >
                            <SelectTrigger className={cn(error && 'border-destructive')}>
                                <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>
                );

            case 'textarea':
                return (
                    <div className="grid gap-2">
                        <Label htmlFor={field.key}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Textarea
                            id={field.key}
                            value={value || ''}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={isDisabled}
                            rows={field.rows || 3}
                            className={cn(error && 'border-destructive')}
                            dir={field.dir}
                        />
                        {field.helpText && !error && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        )}
                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="grid gap-2">
                        <Label htmlFor={field.key}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Input
                            id={field.key}
                            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                            value={value ?? ''}
                            onChange={(e) => {
                                const val = field.type === 'number'
                                    ? (e.target.value === '' ? '' : Number(e.target.value))
                                    : e.target.value;
                                updateField(field.key, val);
                            }}
                            placeholder={field.placeholder}
                            disabled={isDisabled}
                            min={field.min}
                            max={field.max}
                            className={cn(
                                error && 'border-destructive',
                                field.type === 'number' && 'font-mono',
                                field.className
                            )}
                            dir={field.dir}
                        />
                        {field.helpText && !error && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                        )}
                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>
                );
        }
    };

    const widthClass = FORM_WIDTH_CLASSES[config.width || 'md'];
    const IconComponent = config.icon;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side={direction === 'rtl' ? 'left' : 'right'}
                className={cn(
                    'overflow-hidden p-0 flex flex-col !max-w-none',
                    widthClass
                )}
            >
                {/* Header */}
                <SheetHeader className={cn(
                    "border-b border-border/50 p-6 pb-4 space-y-2 shrink-0",
                    direction === 'rtl' ? 'text-right' : 'text-left'
                )}>
                    <div className={cn(
                        "flex items-center justify-between",
                        direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                    )}>
                        <div className={cn(
                            'flex items-center gap-3',
                            config.iconBg || 'bg-primary',
                            'p-2 rounded-lg'
                        )}>
                            <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div>
                        <SheetTitle className="text-xl font-bold">
                            {config.title}
                        </SheetTitle>
                        {config.subtitle && (
                            <SheetDescription className="mt-1">
                                {config.subtitle}
                            </SheetDescription>
                        )}
                    </div>
                </SheetHeader>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {config.sections.map(section => (
                                <div key={section.id} className="space-y-4">
                                    {section.title && (
                                        <h3 className="text-sm font-medium text-foreground border-b pb-2">
                                            {section.title}
                                        </h3>
                                    )}
                                    <div className={cn(
                                        'grid gap-4',
                                        section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
                                    )}>
                                        {section.fields.map(field => (
                                            <div
                                                key={field.key}
                                                className={cn(
                                                    field.gridCols === 2 && 'col-span-2',
                                                    (field.type === 'switch' || field.type === 'checkbox') && 'col-span-2'
                                                )}
                                            >
                                                {renderField(field)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <SheetFooter className="border-t p-6 shrink-0">
                    <div className={cn(
                        "flex gap-2 w-full",
                        direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                    )}>
                        {config.showCancel !== false && (
                            <Button variant="outline" onClick={onClose} disabled={saving}>
                                {t('common.cancel')}
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin me-2" />
                            ) : (
                                <Save className="h-4 w-4 me-2" />
                            )}
                            {config.saveButtonText || (isEdit ? t('common.save') : t('common.add'))}
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

export default BaseFormSheet;

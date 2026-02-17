/**
 * 🚢 ContainerSelector — Combobox لاختيار كونتينر وربطه بالفاتورة
 * ═══════════════════════════════════════════════════════════════════
 * - يعرض الكونتينرات المفتوحة (status != 'closed')
 * - فلترة حسب المورد (اختياري)
 * - يعرض: رقم الكونتينر + الحالة + عدد الفواتير
 * - يدعم البحث والمسح
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Ship, Check, X, Plus, Loader2, Package, ChevronsUpDown } from 'lucide-react';
import { CONTAINER_STATUSES } from '../ContainerStatusStepper';

interface ContainerOption {
    id: string;
    container_number: string;
    status: string;
    vessel_name?: string;
    eta?: string;
    supplier_name?: string;
    invoice_count?: number;
}

interface ContainerSelectorProps {
    /** Currently selected container_id */
    value?: string | null;
    /** Callback when selection changes */
    onChange: (containerId: string | null, containerNumber?: string) => void;
    /** Filter by supplier_id (optional) */
    supplierId?: string | null;
    /** Whether the field is read-only */
    disabled?: boolean;
    /** Callback to open "create container" dialog */
    onCreateNew?: () => void;
    /** Additional className */
    className?: string;
}

export const ContainerSelector: React.FC<ContainerSelectorProps> = ({
    value,
    onChange,
    supplierId,
    disabled = false,
    onCreateNew,
    className,
}) => {
    const { isRTL, language } = useLanguage();
    const isAr = language === 'ar';
    const { companyId } = useCompany();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Fetch open containers ───
    const { data: containers = [], isLoading } = useQuery({
        queryKey: ['containers_for_selector', companyId, supplierId],
        queryFn: async () => {
            if (!companyId) return [];

            let query = supabase
                .from('containers')
                .select(`
                    id,
                    container_number,
                    status,
                    vessel_name,
                    eta,
                    supplier_id
                `)
                .eq('company_id', companyId)
                .neq('status', 'closed')
                .order('created_at', { ascending: false });

            // Optional: filter by supplier
            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }

            const { data, error } = await query;
            if (error) {
                console.warn('Failed to fetch containers:', error.message);
                return [];
            }
            return (data || []) as ContainerOption[];
        },
        enabled: !!companyId,
        staleTime: 30000,
    });

    // ─── Find status info ───
    const getStatusInfo = (status: string) => {
        return CONTAINER_STATUSES.find(s => s.key === status) || CONTAINER_STATUSES[0];
    };

    // ─── Selected container ───
    const selectedContainer = useMemo(() => {
        if (!value) return null;
        return containers.find(c => c.id === value) || null;
    }, [value, containers]);

    // ─── Filtered containers ───
    const filteredContainers = useMemo(() => {
        if (!searchQuery) return containers;
        const q = searchQuery.toLowerCase();
        return containers.filter(c =>
            c.container_number?.toLowerCase().includes(q) ||
            c.vessel_name?.toLowerCase().includes(q)
        );
    }, [containers, searchQuery]);

    // ─── Handle selection ───
    const handleSelect = (containerId: string) => {
        const container = containers.find(c => c.id === containerId);
        if (container) {
            onChange(container.id, container.container_number);
        }
        setOpen(false);
    };

    // ─── Handle clear ───
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full h-10 justify-between bg-white dark:bg-gray-800 text-start",
                            !value && "text-muted-foreground",
                            disabled && "opacity-70 cursor-default"
                        )}
                    >
                        <div className={cn("flex items-center gap-2 truncate", isRTL && "flex-row-reverse")}>
                            <Ship className="w-4 h-4 text-blue-500 shrink-0" />
                            {selectedContainer ? (
                                <div className={cn("flex items-center gap-1.5 truncate", isRTL && "flex-row-reverse")}>
                                    <span className="font-mono text-sm truncate">
                                        {selectedContainer.container_number}
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-[9px] px-1.5",
                                            getStatusInfo(selectedContainer.status).textColor
                                        )}
                                    >
                                        {isAr
                                            ? getStatusInfo(selectedContainer.status).label_ar
                                            : getStatusInfo(selectedContainer.status).label_en
                                        }
                                    </Badge>
                                </div>
                            ) : (
                                <span className="text-sm">
                                    {isAr ? 'اختر كونتينر...' : 'Select container...'}
                                </span>
                            )}
                        </div>

                        <div className={cn("flex items-center gap-1 shrink-0", isRTL && "flex-row-reverse")}>
                            {value && !disabled && (
                                <button
                                    onClick={handleClear}
                                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    title={isAr ? 'إزالة الكونتينر' : 'Remove container'}
                                >
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                </button>
                            )}
                            <ChevronsUpDown className="w-4 h-4 opacity-50" />
                        </div>
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[350px] p-0" align={isRTL ? "end" : "start"}>
                    <Command>
                        <CommandInput
                            placeholder={isAr ? 'ابحث برقم الكونتينر...' : 'Search by container number...'}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <CommandList>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <>
                                    <CommandEmpty>
                                        <div className="text-center py-4">
                                            <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-500">
                                                {isAr ? 'لا توجد كونتينرات مفتوحة' : 'No open containers found'}
                                            </p>
                                        </div>
                                    </CommandEmpty>

                                    <CommandGroup heading={isAr ? 'الكونتينرات المتاحة' : 'Available Containers'}>
                                        {filteredContainers.map((container) => {
                                            const statusInfo = getStatusInfo(container.status);
                                            const StatusIcon = statusInfo.icon;
                                            const isSelected = value === container.id;

                                            return (
                                                <CommandItem
                                                    key={container.id}
                                                    value={container.container_number}
                                                    onSelect={() => handleSelect(container.id)}
                                                    className="py-2.5"
                                                >
                                                    <div className={cn(
                                                        "flex items-center gap-3 w-full",
                                                        isRTL && "flex-row-reverse"
                                                    )}>
                                                        {/* Selection check */}
                                                        <div className="w-4 shrink-0">
                                                            {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                                                        </div>

                                                        {/* Container icon */}
                                                        <div className={cn(
                                                            "p-1.5 rounded-lg shrink-0",
                                                            statusInfo.color
                                                        )}>
                                                            <StatusIcon className={cn("w-3.5 h-3.5", statusInfo.textColor)} />
                                                        </div>

                                                        {/* Container info */}
                                                        <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                                                            <div className="font-mono text-sm font-medium truncate">
                                                                {container.container_number}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                <span>{isAr ? statusInfo.label_ar : statusInfo.label_en}</span>
                                                                {container.vessel_name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{container.vessel_name}</span>
                                                                    </>
                                                                )}
                                                                {container.eta && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>ETA: {new Date(container.eta).toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </>
                            )}

                            {/* Create new button */}
                            {onCreateNew && (
                                <div className="border-t p-1.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setOpen(false);
                                            onCreateNew();
                                        }}
                                        className="w-full justify-start gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700"
                                    >
                                        <Plus className="w-4 h-4" />
                                        {isAr ? 'إنشاء كونتينر جديد' : 'Create new container'}
                                    </Button>
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default ContainerSelector;

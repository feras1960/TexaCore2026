/**
 * WarehouseStockSection — Level 2+3 Nested Accordion (Pure Display)
 * Receives pre-fetched warehouse data from parent cache.
 * Parent handles fetching, caching, and real-time updates.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Warehouse, Scroll, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { warehouseService } from '@/services/warehouseService';

const FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const FMT2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const FMT0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n: number) => FMT.format(n);
const fmt2 = (n: number) => FMT2.format(n);
const fmt0 = (n: number) => FMT0.format(n);

export interface WarehouseStockRow {
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name_ar: string;
    warehouse_name_en: string;
    roll_count: number;
    total_length: number;
    available_length: number;
    reserved_length: number;
    loose_stock: number;
    last_updated: string | null;
}

interface RollRow {
    id: string; roll_number: string; warehouse_id: string;
    initial_length: number; current_length: number; reserved_length: number;
    available_length: number; status: string; color_id?: string;
    color_name_ar?: string; color_name_en?: string; color_hex?: string;
    created_at: string; bin_location_code?: string; cost_per_meter?: number;
}

function StockBadge({ meters, isRTL }: { meters: number; isRTL: boolean }) {
    if (meters <= 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {isRTL ? 'نفذ' : 'Out'}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isRTL ? 'متوفر' : 'In Stock'}
        </span>
    );
}

interface Props {
    materialId: string;
    companyId: string;
    /** Pre-fetched warehouse rows from parent cache */
    warehouseRows: WarehouseStockRow[];
    /** Is parent still fetching? */
    isLoading: boolean;
    /** Roll cache from parent */
    rollCache: Record<string, RollRow[]>;
    rollLoading: Set<string>;
    onToggleRolls: (materialId: string, warehouseId: string) => void;
    expandedWhId: string | null;
    costDisplay: number;
    isRTL: boolean;
    canSeeCost: boolean;
    canSeeValue: boolean;
    activeCurrency: string;
    baseCurrency: string;
    convertPrice: (price: number, from: string) => number;
    onRollClick?: (roll: { id: string }) => void;
}

export function WarehouseStockSection({
    materialId, warehouseRows, isLoading,
    rollCache, rollLoading, onToggleRolls, expandedWhId,
    costDisplay, isRTL, canSeeCost, canSeeValue,
    activeCurrency, baseCurrency, convertPrice, onRollClick,
}: Props) {

    if (isLoading) return (
        <div className="space-y-2 px-4 py-3">
            {[1, 2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
    );

    if (warehouseRows.length === 0) return (
        <div className="text-center py-4 text-gray-400 text-sm">
            {isRTL ? 'لا يوجد مخزون' : 'No stock'}
        </div>
    );

    return (
        <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
                <Warehouse className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    {isRTL ? 'المخزون حسب المستودعات' : 'Stock by Warehouse'}
                </span>
            </div>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-indigo-100/80 dark:bg-indigo-900/30 border-b-2 border-indigo-200 dark:border-indigo-700">
                        <th className="w-6 px-2 py-2" />
                        <th className={cn('px-3 py-2 text-[10px] font-bold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>
                            {isRTL ? 'المستودع' : 'Warehouse'}
                        </th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-center">{isRTL ? 'رولونات' : 'Rolls'}</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'مجرود' : 'Rolled'}</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'سائب' : 'Loose'}</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'المتاح' : 'Available'}</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'المحجوز' : 'Reserved'}</th>
                        {canSeeCost && <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'التكلفة' : 'Cost'} ({activeCurrency})</th>}
                        {canSeeValue && <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">{isRTL ? 'القيمة' : 'Value'} ({activeCurrency})</th>}
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                    </tr>
                </thead>
                <tbody>
                    {warehouseRows.map(wh => {
                        const whKey = `${materialId}::${wh.warehouse_id}`;
                        const isOpen = expandedWhId === wh.warehouse_id;
                        const whTotal = wh.total_length + (wh.loose_stock || 0);
                        const whAvailable = wh.available_length + (wh.loose_stock || 0);
                        const whCost = costDisplay > 0 ? convertPrice(costDisplay, baseCurrency || 'UAH') : 0;
                        const whValue = whCost > 0 ? whCost * whTotal : 0;

                        return (
                            <React.Fragment key={wh.warehouse_id}>
                                <tr
                                    className={cn(
                                        'border-b border-indigo-100 dark:border-indigo-800/30 cursor-pointer transition-colors hover:bg-indigo-100/60 dark:hover:bg-indigo-900/20',
                                        isOpen && 'bg-blue-100/80 dark:bg-blue-900/30',
                                    )}
                                    onClick={() => wh.roll_count > 0 && onToggleRolls(materialId, wh.warehouse_id)}
                                >
                                    <td className="px-2 py-2 text-center">
                                        {wh.roll_count > 0 && (
                                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                            </motion.div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <Warehouse className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-800">{isRTL ? wh.warehouse_name_ar : (wh.warehouse_name_en || wh.warehouse_name_ar)}</span>
                                            {wh.warehouse_code && <span className="text-[10px] font-mono text-gray-400">({wh.warehouse_code})</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={cn('text-sm font-bold font-mono', wh.roll_count > 0 ? 'text-indigo-600' : 'text-gray-300')}>{wh.roll_count}</span>
                                    </td>
                                    <td className="px-3 py-2 text-end"><span className="text-sm font-mono text-purple-600" dir="ltr">{fmt(wh.total_length)}</span></td>
                                    <td className="px-3 py-2 text-end">
                                        <span className={cn('text-sm font-mono', (wh.loose_stock || 0) > 0 ? 'text-amber-600 font-bold' : 'text-gray-300')} dir="ltr">{fmt(wh.loose_stock || 0)}</span>
                                    </td>
                                    <td className="px-3 py-2 text-end"><span className="text-sm font-bold font-mono text-blue-600" dir="ltr">{fmt(whTotal)}</span></td>
                                    <td className="px-3 py-2 text-end"><span className="text-sm font-mono text-emerald-600" dir="ltr">{fmt(whAvailable)}</span></td>
                                    <td className="px-3 py-2 text-end">
                                        <span className={cn('text-sm font-mono', wh.reserved_length > 0 ? 'text-orange-500' : 'text-gray-300')} dir="ltr">{fmt(wh.reserved_length)}</span>
                                    </td>
                                    {canSeeCost && (
                                        <td className="px-3 py-2 text-end">
                                            {whCost > 0 ? <span className="text-sm font-mono text-gray-700" dir="ltr">{fmt2(whCost)}</span> : <span className="text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {canSeeValue && (
                                        <td className="px-3 py-2 text-end">
                                            {whValue > 0 ? <span className="text-sm font-bold font-mono text-purple-600" dir="ltr">{fmt0(whValue)}</span> : <span className="text-gray-300">—</span>}
                                        </td>
                                    )}
                                    <td className="px-3 py-2"><StockBadge meters={whTotal} isRTL={isRTL} /></td>
                                </tr>

                                {/* Level 3: Rolls */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <tr>
                                            <td colSpan={12} className="p-0">
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                                                    <div className="bg-white dark:bg-gray-900 border-t border-blue-200/60 px-6 py-2">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Scroll className="w-3.5 h-3.5 text-purple-500" />
                                                            <span className="text-[11px] font-bold text-purple-600">{isRTL ? 'الرولونات' : 'Rolls'}</span>
                                                            {rollLoading.has(whKey) && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                                                        </div>
                                                        {rollLoading.has(whKey) ? (
                                                            <div className="space-y-1.5">{[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                                                        ) : (rollCache[whKey] || []).length === 0 ? (
                                                            <p className="text-sm text-gray-400 py-2">{isRTL ? 'لا توجد رولونات' : 'No rolls'}</p>
                                                        ) : (
                                                            <table className="w-full text-xs border-collapse mb-2">
                                                                <thead>
                                                                    <tr className="bg-purple-50/60 dark:bg-purple-900/10 border-b border-purple-100">
                                                                        <th className={cn('px-2 py-1.5 font-bold text-purple-600 uppercase', isRTL ? 'text-right' : 'text-left')}>{isRTL ? 'رقم الرولون' : 'Roll #'}</th>
                                                                        <th className="px-2 py-1.5 font-bold text-purple-600 uppercase text-end">{isRTL ? 'الطول' : 'Length'}</th>
                                                                        <th className="px-2 py-1.5 font-bold text-purple-600 uppercase text-end">{isRTL ? 'المتاح' : 'Avail.'}</th>
                                                                        <th className="px-2 py-1.5 font-bold text-purple-600 uppercase text-center">{isRTL ? 'اللون' : 'Color'}</th>
                                                                        <th className="px-2 py-1.5 font-bold text-purple-600 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                                                                        <th className="px-2 py-1.5 font-bold text-purple-600 uppercase">{isRTL ? 'الموقع' : 'Loc.'}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(rollCache[whKey] || []).map(roll => {
                                                                        const stMap: Record<string, { l: string; c: string }> = {
                                                                            available: { l: isRTL ? 'متاح' : 'Available', c: 'bg-emerald-100 text-emerald-700' },
                                                                            reserved: { l: isRTL ? 'محجوز' : 'Reserved', c: 'bg-orange-100 text-orange-700' },
                                                                            partial: { l: isRTL ? 'جزئي' : 'Partial', c: 'bg-blue-100 text-blue-700' },
                                                                        };
                                                                        const st = stMap[roll.status] || stMap.available;
                                                                        return (
                                                                            <tr key={roll.id} className="border-b border-gray-50 hover:bg-purple-50/40 cursor-pointer transition-colors" onClick={() => onRollClick?.(roll)}>
                                                                                <td className="px-2 py-1.5 font-mono font-semibold text-indigo-600" dir="ltr">{roll.roll_number}</td>
                                                                                <td className="px-2 py-1.5 text-end font-mono" dir="ltr">{fmt(roll.current_length)} m</td>
                                                                                <td className="px-2 py-1.5 text-end font-mono text-emerald-600" dir="ltr">{fmt(roll.available_length)} m</td>
                                                                                <td className="px-2 py-1.5 text-center">
                                                                                    {roll.color_hex ? (
                                                                                        <div className="flex items-center justify-center gap-1">
                                                                                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: roll.color_hex }} />
                                                                                            <span className="text-[10px]">{isRTL ? roll.color_name_ar : (roll.color_name_en || roll.color_name_ar)}</span>
                                                                                        </div>
                                                                                    ) : <span className="text-gray-300">—</span>}
                                                                                </td>
                                                                                <td className="px-2 py-1.5">
                                                                                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', st.c)}>{st.l}</span>
                                                                                </td>
                                                                                <td className="px-2 py-1.5 text-gray-500 font-mono text-[10px]">{roll.bin_location_code || '—'}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

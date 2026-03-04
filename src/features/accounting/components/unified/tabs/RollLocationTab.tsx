/**
 * RollLocationTab — موقع الرولون الحالي
 * يعرض المستودع والرف الحالي مع إمكانية معرفة الرولونات المجاورة
 */

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { warehouseService } from '@/services/warehouseService';
import { cn } from '@/lib/utils';
import {
    MapPin,
    Warehouse,
    Layers,
    Package,
    Loader2,
    ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RollLocationTabProps {
    data: any;
    language?: string;
}

function getName(obj: any, isAr: boolean) {
    if (!obj) return '—';
    return isAr ? (obj.name_ar || obj.name_en || obj.code || '—') : (obj.name_en || obj.name_ar || obj.code || '—');
}

export function RollLocationTab({ data, language: langProp }: RollLocationTabProps) {
    const { language: ctxLang } = useLanguage();
    const { companyId } = useCompany();
    const lang = langProp || ctxLang;
    const isAr = lang === 'ar';

    const roll = data || {};
    const [nearbyRolls, setNearbyRolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId || !roll.material_id) { setLoading(false); return; }
        setLoading(true);
        warehouseService.getMaterialRollsDetail(companyId, roll.material_id, roll.warehouse_id)
            .then(rolls => setNearbyRolls(rolls.filter(r => r.id !== roll.id).slice(0, 10)))
            .finally(() => setLoading(false));
    }, [companyId, roll.material_id, roll.warehouse_id]);

    const warehouseName = roll.warehouse_name_ar || roll.warehouse?.name_ar || roll.warehouse?.name_en || '—';
    const warehouseNameEn = roll.warehouse?.name_en || roll.warehouse?.name_ar || '—';

    return (
        <div className="p-6 space-y-5">
            {/* ── Current Location Card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5">
                <div className="absolute end-4 top-4 opacity-10">
                    <MapPin className="w-20 h-20 text-blue-600" />
                </div>

                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {isAr ? 'الموقع الحالي' : 'Current Location'}
                </h3>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 flex-wrap text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 border border-blue-200 dark:border-blue-600">
                        <Warehouse className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-blue-800 dark:text-blue-200">
                            {isAr ? warehouseName : warehouseNameEn}
                        </span>
                    </div>

                    {roll.bin_location_id || roll.bin_location?.code ? (
                        <>
                            <ArrowRight className="w-3 h-3 text-blue-400" />
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 dark:bg-white/10 border border-blue-200 dark:border-blue-600">
                                <MapPin className="w-4 h-4 text-indigo-500" />
                                <span className="font-semibold text-indigo-800 dark:text-indigo-200 font-mono">
                                    {roll.bin_location?.code || roll.bin_location_code || roll.bin_location_id}
                                </span>
                            </div>
                        </>
                    ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            {isAr ? 'موقع غير محدد' : 'Location not specified'}
                        </Badge>
                    )}
                </div>

                {/* Roll identifier */}
                <div className="mt-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-mono font-semibold">
                        {roll.roll_number}
                    </span>
                    <Badge
                        className={cn(
                            'ms-2 text-xs',
                            roll.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                roll.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                        {roll.status}
                    </Badge>
                </div>
            </div>

            {/* ── Length at Location ── */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: isAr ? 'الطول الحالي' : 'Current Length', val: roll.current_length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700' },
                    { label: isAr ? 'المتاح للبيع' : 'Available to Sell', val: roll.available_length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700' },
                ].map(item => (
                    <div key={item.label} className={cn(
                        'p-4 rounded-xl border text-center',
                        item.bg, item.border
                    )}>
                        <div className={cn('text-2xl font-bold font-mono', item.color)}>
                            {Number(item.val || 0).toFixed(1)}
                            <span className="text-sm ms-1 opacity-70">م</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Other rolls in same warehouse ── */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-500" />
                    {isAr
                        ? `رولونات المادة في نفس المستودع (${loading ? '...' : nearbyRolls.length})`
                        : `Material rolls in same warehouse (${loading ? '...' : nearbyRolls.length})`}
                </h3>

                {loading ? (
                    <div className="flex items-center gap-2 py-4 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{isAr ? 'تحميل...' : 'Loading...'}</span>
                    </div>
                ) : nearbyRolls.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                        {isAr ? 'لا توجد رولونات أخرى في هذا المستودع' : 'No other rolls in this warehouse'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {nearbyRolls.map(r => (
                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                    <Layers className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {r.roll_number}
                                    </div>
                                    {r.color_name_ar && (
                                        <div className="text-xs text-gray-500">{r.color_name_ar}</div>
                                    )}
                                </div>
                                <div className="text-end flex-shrink-0">
                                    <div className="text-sm font-bold text-blue-600 font-mono">
                                        {r.current_length?.toFixed(1)} م
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        'text-[10px]',
                                        r.status === 'available' ? 'text-emerald-600' :
                                            r.status === 'reserved' ? 'text-amber-600' : 'text-gray-500'
                                    )}>
                                        {r.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RollLocationTab;

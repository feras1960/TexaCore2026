/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Warehouse Local Cache — كاش محلي لبيانات المستودع
 * ════════════════════════════════════════════════════════════════
 *
 * 🚀 LOCAL-FIRST DESIGN:
 * ─────────────────────────────────────────────────────
 * البيانات تُعرض فوراً من localStorage.
 * المزامنة تتم بالخلفية (background) بدون تأخير UI.
 *
 * 📡 SYNC FLOW:
 * ─────────────────────────────────────────────────────
 * 1. فتح الصفحة → تُقرأ من localStorage فوراً (0ms)
 * 2. مزامنة خلفية تبدأ مع Supabase
 * 3. عند الانتهاء → يُحدّث الكاش + يُبلّغ المكونات
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────
export interface CachedLooseMaterial {
    id: string;
    name_ar: string;
    name_en: string;
    loose_stock: number;
    current_stock: number;
}

export interface CachedRoll {
    id: string;
    roll_number: string;
    material_id: string;
    color_id?: string;
    color_name?: string;
    current_length: number;
    available_length: number;
    initial_length: number;
    net_length: number;
    status: string;
    warehouse_id: string;
    qr_code?: string;
    rfid_tag?: string;
    barcode?: string;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

// ─── Constants ──────────────────────────────────────────────
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes before background refresh
const LOOSE_MATS_KEY = 'wh_cache_loose_mats';
const ROLLS_KEY_PREFIX = 'wh_cache_rolls_';

// ════════════════════════════════════════════════════════════════
// 📦 Warehouse Local Cache API
// ════════════════════════════════════════════════════════════════

export const warehouseLocalCache = {

    // ─── Loose Materials ─────────────────────────────────────

    /**
     * 📂 Get loose materials from cache INSTANTLY
     * Returns cached data + triggers background refresh if stale
     */
    getLooseMaterials(
        companyId: string,
        warehouseId?: string,
    ): { data: CachedLooseMaterial[]; isStale: boolean } {
        const key = `${LOOSE_MATS_KEY}_${companyId}_${warehouseId || 'all'}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const entry: CacheEntry<CachedLooseMaterial[]> = JSON.parse(raw);
                if (entry.version === CACHE_VERSION && entry.data) {
                    const isStale = Date.now() - entry.timestamp > CACHE_TTL_MS;
                    return { data: entry.data, isStale };
                }
            }
        } catch { /* ignore */ }
        return { data: [], isStale: true };
    },

    /**
     * ☁️ Refresh loose materials from Supabase (background)
     * Returns fresh data + caches it
     */
    async refreshLooseMaterials(
        companyId: string,
        warehouseId?: string,
    ): Promise<CachedLooseMaterial[]> {
        try {
            // 1. Fetch materials
            const { data: materials, error: matErr } = await supabase
                .from('fabric_materials')
                .select('*')
                .eq('company_id', companyId);

            if (matErr || !materials) return this.getLooseMaterials(companyId, warehouseId).data;

            // 2. Fetch rolls totals
            const matIds = materials.map(m => m.id);
            let rollsQuery = supabase
                .from('fabric_rolls')
                .select('material_id, current_length')
                .in('material_id', matIds)
                .in('status', ['available', 'reserved', 'in_stock']);

            if (warehouseId) {
                rollsQuery = rollsQuery.eq('warehouse_id', warehouseId);
            }

            const { data: rolls } = await rollsQuery;

            // 3. Calculate loose stock
            const rollsTotals: Record<string, number> = {};
            for (const r of (rolls || [])) {
                const mid = (r as any).material_id;
                rollsTotals[mid] = (rollsTotals[mid] || 0) + (Number((r as any).current_length) || 0);
            }

            const result: CachedLooseMaterial[] = materials
                .map(m => ({
                    id: m.id,
                    name_ar: m.name_ar || '',
                    name_en: m.name_en || '',
                    loose_stock: Math.max(0, (Number(m.current_stock) || 0) - (rollsTotals[m.id] || 0)),
                    current_stock: Number(m.current_stock) || 0,
                }))
                .filter(m => m.loose_stock > 0);

            // 4. Cache it
            this.saveLooseMaterials(companyId, warehouseId, result);
            return result;
        } catch (err: any) {
            console.error('[WHCache] refreshLooseMaterials error:', err.message);
            return this.getLooseMaterials(companyId, warehouseId).data;
        }
    },

    /** Save loose materials to localStorage */
    saveLooseMaterials(companyId: string, warehouseId: string | undefined, data: CachedLooseMaterial[]): void {
        const key = `${LOOSE_MATS_KEY}_${companyId}_${warehouseId || 'all'}`;
        const entry: CacheEntry<CachedLooseMaterial[]> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
        };
        try {
            localStorage.setItem(key, JSON.stringify(entry));
        } catch { /* ignore */ }
    },

    /**
     * 🔄 Update local cache after a JIT roll is created/deleted
     * Adjusts loose_stock without a full Supabase refresh
     */
    adjustLooseStock(
        companyId: string,
        warehouseId: string | undefined,
        materialId: string,
        delta: number, // negative = consumed, positive = returned
    ): void {
        const { data } = this.getLooseMaterials(companyId, warehouseId);
        const mat = data.find(m => m.id === materialId);
        if (mat) {
            mat.loose_stock = Math.max(0, mat.loose_stock + delta);
            // Remove if zero
            const filtered = data.filter(m => m.loose_stock > 0);
            this.saveLooseMaterials(companyId, warehouseId, filtered);
        }
    },

    // ─── Available Rolls ─────────────────────────────────────

    /**
     * 📂 Get available rolls for a material from cache INSTANTLY
     */
    getAvailableRolls(
        materialId: string,
        warehouseId: string,
    ): { data: CachedRoll[]; isStale: boolean } {
        const key = `${ROLLS_KEY_PREFIX}${materialId}_${warehouseId}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const entry: CacheEntry<CachedRoll[]> = JSON.parse(raw);
                if (entry.version === CACHE_VERSION && entry.data) {
                    const isStale = Date.now() - entry.timestamp > CACHE_TTL_MS;
                    return { data: entry.data, isStale };
                }
            }
        } catch { /* ignore */ }
        return { data: [], isStale: true };
    },

    /**
     * ☁️ Refresh available rolls from Supabase (background)
     */
    async refreshAvailableRolls(
        materialId: string,
        warehouseId: string,
    ): Promise<CachedRoll[]> {
        try {
            const { data: rolls, error } = await supabase
                .from('fabric_rolls')
                .select('id, roll_number, material_id, color_id, current_length, available_length, initial_length, status, warehouse_id, qr_code, rfid_tag, barcode, fabric_colors!color_id(name_ar, name_en)')
                .eq('material_id', materialId)
                .eq('warehouse_id', warehouseId)
                .eq('status', 'available')
                .order('roll_number');

            if (error || !rolls) return this.getAvailableRolls(materialId, warehouseId).data;

            const mapped: CachedRoll[] = (rolls || []).map((r: any) => ({
                ...r,
                color_name: r.fabric_colors?.name_ar || r.fabric_colors?.name_en || '',
                net_length: Number(r.current_length) || 0,
                fabric_colors: undefined,
            }));

            // Cache it
            const key = `${ROLLS_KEY_PREFIX}${materialId}_${warehouseId}`;
            const entry: CacheEntry<CachedRoll[]> = { data: mapped, timestamp: Date.now(), version: CACHE_VERSION };
            try { localStorage.setItem(key, JSON.stringify(entry)); } catch { /* ignore */ }

            return mapped;
        } catch (err: any) {
            console.error('[WHCache] refreshAvailableRolls error:', err.message);
            return this.getAvailableRolls(materialId, warehouseId).data;
        }
    },

    // ─── Utilities ───────────────────────────────────────────

    /** Clear all warehouse cache */
    clearAll(): void {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(LOOSE_MATS_KEY) || key.startsWith(ROLLS_KEY_PREFIX))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    },

    /** Invalidate rolls cache for a specific material */
    invalidateRolls(materialId: string, warehouseId: string): void {
        const key = `${ROLLS_KEY_PREFIX}${materialId}_${warehouseId}`;
        localStorage.removeItem(key);
    },
};

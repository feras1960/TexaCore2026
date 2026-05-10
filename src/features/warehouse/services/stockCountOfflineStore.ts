/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 Stock Count Offline Store — متجر الجرد المحلي مع المزامنة
 * ════════════════════════════════════════════════════════════════
 *
 * مبني على نمط receiptLocalStore المُختبر (548 سطر):
 *  1. كل إدخال يُحفظ فوراً في IndexedDB
 *  2. محاولة مزامنة فورية مع Supabase
 *  3. عند الفشل → إضافة لطابور المزامنة
 *  4. عند عودة الاتصال → flushSyncQueue تلقائياً
 *
 * 🔐 الحماية:
 *  - كل عملية كتابة تتحقق من tenant_id + company_id
 *  - سجل تدقيق لكل عملية
 *  - refreshSession قبل المزامنة
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import {
    offlineDB,
    generateLocalId,
    type LocalStockCountItem,
    type CachedRoll,
    type SyncQueueEntry,
} from './warehouseOfflineDB';

// ─── Constants ────────────────────────────────────────────────

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 15_000;     // 15 ثانية
const PRELOAD_PAGE_SIZE = 500;        // تحميل تدريجي

// ─── Network Status ───────────────────────────────────────────

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let retryIntervalId: ReturnType<typeof setInterval> | null = null;
let reconnectListenerSetup = false;

// ════════════════════════════════════════════════════════════════
// 🏗️ Stock Count Offline Store API
// ════════════════════════════════════════════════════════════════

export const stockCountOfflineStore = {

    // ════════════════════════════════════════════════════════════
    // 📦 تحميل الرولونات مسبقاً (Pre-cache)
    // ════════════════════════════════════════════════════════════

    /**
     * تحميل رولونات المستودع محلياً — تحميل تدريجي مع شريط تقدم
     * يُستدعى مرة واحدة عند بدء الجرد
     */
    async preloadWarehouseRolls(
        warehouseId: string,
        tenantId: string,
        companyId: string,
        onProgress?: (loaded: number, total: number) => void
    ): Promise<{ loaded: number; duration: number }> {
        const start = Date.now();
        let offset = 0;
        let totalLoaded = 0;

        // مسح الكاش القديم
        await offlineDB.clearWarehouseCache(warehouseId);

        while (true) {
            const { data: rolls, count, error } = await supabase
                .from('fabric_rolls')
                .select(`
                    id, roll_number, material_id, color_id, color_name,
                    current_length, status, warehouse_id,
                    barcode, qr_code, rfid_tag
                `, { count: 'exact' })
                .eq('warehouse_id', warehouseId)
                .in('status', ['available', 'reserved', 'in_stock', 'received'])
                .range(offset, offset + PRELOAD_PAGE_SIZE - 1);

            if (error) {
                console.error('[OfflineStore] ❌ فشل تحميل الرولونات:', error.message);
                break;
            }

            if (!rolls || rolls.length === 0) break;

            // تحويل وحفظ في IndexedDB
            const cachedRolls: CachedRoll[] = rolls.map((r: any) => ({
                id: r.id,
                rollNumber: r.roll_number,
                materialId: r.material_id,
                colorId: r.color_id,
                colorName: r.color_name,
                currentLength: Number(r.current_length) || 0,
                status: r.status,
                warehouseId: r.warehouse_id,
                barcode: r.barcode || undefined,
                qrCode: r.qr_code || undefined,
                rfidTag: r.rfid_tag || undefined,
                tenantId,
                companyId,
                cachedAt: new Date().toISOString(),
            }));

            await offlineDB.cachedRolls.bulkPut(cachedRolls);
            totalLoaded += rolls.length;

            // تحديث شريط التقدم
            onProgress?.(totalLoaded, count || totalLoaded);

            // إذا حملنا أقل من الحد → انتهينا
            if (rolls.length < PRELOAD_PAGE_SIZE) break;
            offset += PRELOAD_PAGE_SIZE;
        }

        // سجل تدقيق
        await _logAudit('preload', 'cachedRolls', warehouseId,
            `تحميل ${totalLoaded} رولون من المستودع`, tenantId, companyId);

        console.log(`[OfflineStore] ✅ تم تحميل ${totalLoaded} رولون في ${Date.now() - start}ms`);
        return { loaded: totalLoaded, duration: Date.now() - start };
    },

    // ════════════════════════════════════════════════════════════
    // 🔍 البحث عن رولون (محلي أولاً → Supabase ثانياً)
    // ════════════════════════════════════════════════════════════

    /**
     * مسح باركود/QR/RFID — يبحث محلياً أولاً (يعمل بدون إنترنت!)
     */
    async scanRoll(
        query: string,
        warehouseId: string,
        tenantId: string,
        companyId: string
    ): Promise<{
        roll: CachedRoll | null;
        source: 'cache' | 'live' | 'not_found';
    }> {
        // 1. بحث في IndexedDB — فوري — بدون إنترنت!
        const cachedRoll = await offlineDB.findRollByCode(query, warehouseId, tenantId, companyId);
        if (cachedRoll) {
            return { roll: cachedRoll, source: 'cache' };
        }

        // 2. إذا متصل — بحث في Supabase (نفس نمط SalesDeliveryItemsTab)
        if (navigator.onLine) {
            for (const field of ['roll_number', 'qr_code', 'rfid_tag', 'barcode']) {
                const { data } = await supabase
                    .from('fabric_rolls')
                    .select(`
                        id, roll_number, material_id, color_id, color_name,
                        current_length, status, warehouse_id,
                        barcode, qr_code, rfid_tag
                    `)
                    .eq(field, query)
                    .eq('warehouse_id', warehouseId)
                    .maybeSingle();

                if (data) {
                    // حفظ في الكاش للمرة القادمة
                    const cached: CachedRoll = {
                        id: data.id,
                        rollNumber: data.roll_number,
                        materialId: data.material_id,
                        colorId: data.color_id,
                        colorName: data.color_name,
                        currentLength: Number(data.current_length) || 0,
                        status: data.status,
                        warehouseId: data.warehouse_id,
                        barcode: data.barcode || undefined,
                        qrCode: data.qr_code || undefined,
                        rfidTag: data.rfid_tag || undefined,
                        tenantId,
                        companyId,
                        cachedAt: new Date().toISOString(),
                    };
                    await offlineDB.cachedRolls.put(cached);
                    return { roll: cached, source: 'live' };
                }
            }
        }

        return { roll: null, source: 'not_found' };
    },

    // ════════════════════════════════════════════════════════════
    // 📝 إضافة/تحديث بند جرد
    // ════════════════════════════════════════════════════════════

    /**
     * إضافة بند جرد — يُحفظ فوراً في IndexedDB ثم يحاول المزامنة
     */
    async addCountItem(
        item: Omit<LocalStockCountItem, 'id' | 'syncStatus' | 'createdAt' | 'updatedAt'>
    ): Promise<LocalStockCountItem> {
        const now = new Date().toISOString();
        const fullItem: LocalStockCountItem = {
            ...item,
            id: generateLocalId(),
            variance: item.actualQuantity - item.systemQuantity,
            isCounted: true,
            countedAt: now,
            syncStatus: 'pending',
            createdAt: now,
            updatedAt: now,
        };

        // 1. حفظ فوري في IndexedDB
        await offlineDB.stockCountItems.put(fullItem);

        // 2. سجل تدقيق
        await _logAudit(
            fullItem.scanMethod === 'manual' ? 'count' : 'scan',
            'stock_count_items',
            fullItem.id,
            `${fullItem.materialName} | النظام: ${fullItem.systemQuantity} | الفعلي: ${fullItem.actualQuantity} | الفرق: ${fullItem.variance}`,
            fullItem.tenantId,
            fullItem.companyId
        );

        // 3. محاولة مزامنة فورية
        await this._trySyncItem(fullItem);

        return fullItem;
    },

    /**
     * تحديث الكمية الفعلية لبند موجود
     */
    async updateActualQuantity(
        itemId: string,
        actualQuantity: number,
        varianceReason?: string
    ): Promise<void> {
        const item = await offlineDB.stockCountItems.get(itemId);
        if (!item) return;

        const now = new Date().toISOString();
        const variance = actualQuantity - item.systemQuantity;

        await offlineDB.stockCountItems.update(itemId, {
            actualQuantity,
            variance,
            varianceReason,
            isCounted: true,
            countedAt: now,
            syncStatus: 'pending',
            updatedAt: now,
        });

        // إضافة لطابور المزامنة
        await _addToSyncQueue('stock_count_items', 'update', {
            id: item.supabaseId || itemId,
            actual_quantity: actualQuantity,
            variance,
            variance_reason: varianceReason,
        }, itemId);
    },

    // ════════════════════════════════════════════════════════════
    // 🔄 المزامنة
    // ════════════════════════════════════════════════════════════

    /**
     * تفريغ طابور المزامنة — يُستدعى عند عودة الاتصال
     * 🔧 محسّن: exponential backoff + تصنيف الأخطاء + JWT refresh ذكي
     */
    async flushSyncQueue(): Promise<{ synced: number; failed: number }> {
        // 1. تحقق من الاتصال أولاً
        if (!navigator.onLine) {
            console.log('[OfflineStore] 📡 لا يوجد اتصال — تخطي المزامنة');
            return { synced: 0, failed: 0 };
        }

        // 2. تحقق من صلاحية JWT وجدّده إذا لزم الأمر
        const sessionValid = await _ensureValidSession();
        if (!sessionValid) {
            console.warn('[OfflineStore] ⚠️ الجلسة غير صالحة — تخطي المزامنة');
            return { synced: 0, failed: 0 };
        }

        const pending = await offlineDB.syncQueue
            .where('status').equals('pending')
            .toArray();

        let synced = 0, failed = 0;

        for (const entry of pending) {
            if (entry.attempts >= entry.maxAttempts) {
                await offlineDB.syncQueue.update(entry.id!, {
                    status: 'error',
                    errorMessage: `تجاوز الحد الأقصى للمحاولات (${entry.maxAttempts})`,
                    updatedAt: new Date().toISOString(),
                });
                failed++;
                continue;
            }

            // Exponential backoff: check if enough time has passed
            const backoffDelay = _getRetryDelay(entry.attempts);
            const lastAttemptTime = new Date(entry.updatedAt).getTime();
            if (entry.attempts > 0 && Date.now() - lastAttemptTime < backoffDelay) {
                // Not enough time has passed for this retry
                continue;
            }

            try {
                await offlineDB.syncQueue.update(entry.id!, {
                    status: 'syncing',
                    attempts: entry.attempts + 1,
                    updatedAt: new Date().toISOString(),
                });

                let result;
                if (entry.operation === 'insert') {
                    result = await supabase.from(entry.table).insert(entry.payload);
                } else if (entry.operation === 'update') {
                    const { id, ...rest } = entry.payload as any;
                    result = await supabase.from(entry.table).update(rest).eq('id', id);
                } else {
                    result = await supabase.from(entry.table).upsert(entry.payload);
                }

                if (result.error) throw result.error;

                // نجاح — حذف من الطابور وتحديث البند المحلي
                await offlineDB.syncQueue.update(entry.id!, { status: 'done' });

                if (entry.relatedLocalId) {
                    await offlineDB.stockCountItems.update(entry.relatedLocalId, {
                        syncStatus: 'synced',
                        updatedAt: new Date().toISOString(),
                    });
                }

                synced++;
            } catch (err: any) {
                const errorType = _classifyError(err);
                const isPermanent = errorType === 'validation'; // 400 errors won't fix themselves

                await offlineDB.syncQueue.update(entry.id!, {
                    status: isPermanent ? 'error' : 'pending',
                    errorMessage: `[${errorType}] ${err.message || 'Unknown error'}`,
                    updatedAt: new Date().toISOString(),
                });

                // If auth error, try refreshing session for the next items
                if (errorType === 'auth') {
                    await _ensureValidSession();
                }

                failed++;
            }
        }

        // تنظيف المكتملات
        await offlineDB.clearDoneSyncEntries();

        if (synced > 0) {
            console.log(`[OfflineStore] ✅ تم مزامنة ${synced} بند`);
        }
        if (failed > 0) {
            console.warn(`[OfflineStore] ⚠️ فشل مزامنة ${failed} بند`);
        }

        return { synced, failed };
    },

    // ════════════════════════════════════════════════════════════
    // 📡 مراقبة الاتصال (نمط receiptLocalStore)
    // ════════════════════════════════════════════════════════════

    /**
     * بدء مراقبة الاتصال — يُستدعى مرة واحدة عند mount
     */
    setupReconnectListener() {
        if (reconnectListenerSetup) return;
        reconnectListenerSetup = true;

        const handleOnline = async () => {
            isOnline = true;
            console.log('[OfflineStore] 📡 الاتصال عاد — جاري المزامنة...');
            await this.flushSyncQueue();
        };

        const handleOffline = () => {
            isOnline = false;
            console.log('[OfflineStore] 📡 انقطع الاتصال — الحفظ المحلي مستمر');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // محاولة دورية كل 15 ثانية
        retryIntervalId = setInterval(async () => {
            try {
                if (navigator.onLine) {
                    const stats = await offlineDB.getSyncQueueStats();
                    if (stats.pending > 0) {
                        await this.flushSyncQueue();
                    }
                }
            } catch (err: any) {
                // Suppress DatabaseClosedError — DB may have been closed by another tab
                if (err?.name !== 'DatabaseClosedError') {
                    console.warn('[OfflineStore] Retry interval error:', err.message);
                }
            }
        }, RETRY_INTERVAL_MS);
    },

    /**
     * إيقاف المراقبة — عند unmount
     */
    teardownReconnectListener() {
        if (retryIntervalId) {
            clearInterval(retryIntervalId);
            retryIntervalId = null;
        }
        reconnectListenerSetup = false;
    },

    /** هل المتصفح متصل بالإنترنت؟ */
    isOnline(): boolean {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    },

    // ════════════════════════════════════════════════════════════
    // 📊 الإحصائيات
    // ════════════════════════════════════════════════════════════

    getStats: offlineDB.getStockCountStats.bind(offlineDB),
    getSyncStats: offlineDB.getSyncQueueStats.bind(offlineDB),
    getCachedRollsCount: offlineDB.getCachedRollsCount.bind(offlineDB),

    // ════════════════════════════════════════════════════════════
    // 🧹 التنظيف
    // ════════════════════════════════════════════════════════════

    /** مسح كل البيانات المحلية (يُستدعى عند logout) */
    async clearAll(): Promise<void> {
        await offlineDB.delete();
        console.log('[OfflineStore] 🧹 تم مسح كل البيانات المحلية');
    },

    // ════════════════════════════════════════════════════════════
    // 🔧 Private Methods
    // ════════════════════════════════════════════════════════════

    /** محاولة مزامنة بند واحد فوراً */
    async _trySyncItem(item: LocalStockCountItem): Promise<void> {
        if (!navigator.onLine) {
            // غير متصل — أضف لطابور المزامنة
            await _addToSyncQueue('stock_count_items', 'upsert', {
                stock_count_id: item.stockCountId,
                roll_id: item.rollId || null,
                material_id: item.materialId,
                material_name: item.materialName,
                roll_number: item.rollNumber || null,
                unit: item.unit,
                system_quantity: item.systemQuantity,
                actual_quantity: item.actualQuantity,
                variance: item.variance,
                variance_reason: item.varianceReason || null,
                scan_method: item.scanMethod,
                barcode_scanned: item.barcodeScanned || null,
                is_loose_stock: item.isLooseStock,
                notes: item.notes || null,
            }, item.id);
            return;
        }

        try {
            await offlineDB.stockCountItems.update(item.id, { syncStatus: 'syncing' });

            const { data, error } = await supabase
                .from('stock_count_items')
                .upsert({
                    stock_count_id: item.stockCountId,
                    roll_id: item.rollId || null,
                    material_id: item.materialId,
                    material_name: item.materialName,
                    roll_number: item.rollNumber || null,
                    unit: item.unit,
                    system_quantity: item.systemQuantity,
                    actual_quantity: item.actualQuantity,
                    variance: item.variance,
                    variance_reason: item.varianceReason || null,
                    scan_method: item.scanMethod,
                    barcode_scanned: item.barcodeScanned || null,
                    is_loose_stock: item.isLooseStock,
                    notes: item.notes || null,
                })
                .select('id')
                .single();

            if (error) throw error;

            await offlineDB.stockCountItems.update(item.id, {
                syncStatus: 'synced',
                supabaseId: data?.id,
                updatedAt: new Date().toISOString(),
            });
        } catch (err: any) {
            console.warn('[OfflineStore] ⚠️ فشل المزامنة الفورية:', err.message);
            await offlineDB.stockCountItems.update(item.id, {
                syncStatus: 'pending',
                errorMessage: err.message,
            });

            // أضف لطابور المزامنة
            await _addToSyncQueue('stock_count_items', 'upsert', {
                stock_count_id: item.stockCountId,
                roll_id: item.rollId || null,
                material_id: item.materialId,
                material_name: item.materialName,
                roll_number: item.rollNumber || null,
                unit: item.unit,
                system_quantity: item.systemQuantity,
                actual_quantity: item.actualQuantity,
                variance: item.variance,
                variance_reason: item.varianceReason || null,
                scan_method: item.scanMethod,
                barcode_scanned: item.barcodeScanned || null,
                is_loose_stock: item.isLooseStock,
                notes: item.notes || null,
            }, item.id);
        }
    },
};

// ════════════════════════════════════════════════════════════════
// 🔧 Internal Helpers
// ════════════════════════════════════════════════════════════════

// ─── Error Classification ────────────────────────────────────

type ErrorType = 'network' | 'auth' | 'validation' | 'server' | 'unknown';

function _classifyError(error: unknown): ErrorType {
    if (!error) return 'unknown';

    const err = error as any;
    const message = (err.message || '').toLowerCase();
    const status = err.status || err.code;

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('failed to fetch')) {
        return 'network';
    }

    // Auth errors (401, JWT expired)
    if (status === 401 || status === 403 || message.includes('jwt') || message.includes('token') || message.includes('unauthorized') || message.includes('session')) {
        return 'auth';
    }

    // Validation errors (400, RLS violation, constraint)
    if (status === 400 || status === 409 || status === 422 || message.includes('violates') || message.includes('constraint') || message.includes('rls') || message.includes('policy')) {
        return 'validation';
    }

    // Server errors (500, 502, 503)
    if (status >= 500 || message.includes('internal server') || message.includes('bad gateway') || message.includes('service unavailable')) {
        return 'server';
    }

    return 'unknown';
}

// ─── Exponential Backoff ─────────────────────────────────────

function _getRetryDelay(attempt: number): number {
    // attempt 0: 1s, 1: 2s, 2: 4s, 3: 8s, 4: 16s
    const base = Math.pow(2, attempt) * 1000;
    // Add jitter (±25%)
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    return Math.min(base + jitter, 30_000); // cap at 30s
}

// ─── JWT Session Validation ──────────────────────────────────

async function _ensureValidSession(): Promise<boolean> {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            console.warn('[OfflineStore] ⚠️ لا توجد جلسة صالحة');
            return false;
        }

        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        const bufferSeconds = 60; // دقيقة احتياط

        if (expiresAt - now < bufferSeconds) {
            // JWT سينتهي قريباً أو انتهى — نجدد
            console.log('[OfflineStore] 🔑 JWT قارب على الانتهاء — جاري التجديد...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.warn('[OfflineStore] ⚠️ فشل تجديد الجلسة:', refreshError.message);
                return false;
            }
            console.log('[OfflineStore] 🔑 ✅ تم تجديد الجلسة');
        }

        return true;
    } catch (err) {
        console.warn('[OfflineStore] ⚠️ خطأ في فحص الجلسة:', err);
        return false;
    }
}


async function _addToSyncQueue(
    table: string,
    operation: SyncQueueEntry['operation'],
    payload: Record<string, unknown>,
    relatedLocalId?: string
): Promise<void> {
    const now = new Date().toISOString();
    await offlineDB.syncQueue.add({
        table,
        operation,
        payload,
        relatedLocalId,
        status: 'pending',
        attempts: 0,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        createdAt: now,
        updatedAt: now,
    });
}

async function _logAudit(
    action: 'scan' | 'count' | 'adjust' | 'create_roll' | 'sync' | 'preload' | 'delete',
    table: string,
    recordId: string,
    details: string,
    tenantId: string,
    companyId: string
): Promise<void> {
    try {
        // جلب userId من الجلسة المحلية
        const sessionStr = Object.keys(localStorage)
            .find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        let userId = 'unknown';
        if (sessionStr) {
            try {
                const session = JSON.parse(localStorage.getItem(sessionStr) || '{}');
                userId = session?.user?.id || 'unknown';
            } catch { /* ignore */ }
        }

        await offlineDB.auditLog.add({
            userId,
            action,
            table,
            recordId,
            details,
            tenantId,
            companyId,
            timestamp: new Date().toISOString(),
            deviceInfo: (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown').substring(0, 100),
        });
    } catch {
        // سجل التدقيق لا يجب أن يوقف العمليات الأساسية
    }
}

/**
 * ════════════════════════════════════════════════════════════════
 * 💾 Warehouse Offline Database — قاعدة بيانات المستودع المحلية
 * ════════════════════════════════════════════════════════════════
 *
 * مبنية على Dexie.js + IndexedDB — بديل عن localStorage:
 *  - سعة غير محدودة (50+ GB بدل 5 MB)
 *  - بحث بالفهرس (أقل من 1ms)
 *  - ACID transactions
 *  - بحث باركود/QR/RFID بدون إنترنت
 *
 * 🔐 الحماية:
 *  - كل سجل مختوم بـ tenantId + companyId (عزل المستأجرين)
 *  - offlineDB.delete() عند تسجيل الخروج (مسح كامل)
 *  - RLS في Supabase عند المزامنة
 *  - سجل تدقيق محلي (auditLog)
 *
 * ════════════════════════════════════════════════════════════════
 */

import Dexie, { type Table } from 'dexie';

// ─── Types ────────────────────────────────────────────────────

/** بند جرد محلي — يُحفظ فوراً في IndexedDB */
export interface LocalStockCountItem {
    id: string;                   // UUID محلي (crypto.randomUUID)
    stockCountId: string;         // ربط بالجرد في Supabase
    rollId?: string;              // UUID الرولون (إن وجد)
    materialId: string;
    materialName: string;
    rollNumber?: string;
    colorName?: string;
    unit: 'meter' | 'piece' | 'kg' | 'box';
    systemQuantity: number;       // الكمية النظامية
    actualQuantity: number;       // الكمية الفعلية المُدخلة
    variance: number;             // الفرق = actualQuantity - systemQuantity
    varianceReason?: string;      // السبب: damaged | lost | miscounted | theft | natural_shrinkage | other
    scanMethod: 'barcode' | 'qr' | 'rfid' | 'manual';
    barcodeScanned?: string;      // القيمة الفعلية التي مُسحت
    isLooseStock: boolean;
    isCounted: boolean;
    countedAt?: string;           // ISO timestamp
    notes?: string;
    // ─── Tenant Scoping (حماية) ───
    tenantId: string;
    companyId: string;
    warehouseId: string;
    // ─── Sync ───
    syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
    errorMessage?: string;
    supabaseId?: string;          // ID من Supabase بعد المزامنة
    createdAt: string;
    updatedAt: string;
}

/** رولون مُخزّن محلياً — للمسح بدون إنترنت */
export interface CachedRoll {
    id: string;
    rollNumber: string;
    materialId: string;
    materialName?: string;
    colorId?: string;
    colorName?: string;
    currentLength: number;
    status: string;
    warehouseId: string;
    barcode?: string;
    qrCode?: string;
    rfidTag?: string;
    // ─── Tenant Scoping ───
    tenantId: string;
    companyId: string;
    // ─── Cache Meta ───
    cachedAt: string;
}

/** مادة مُخزّنة محلياً — لعرض قائمة المواد بدون إنترنت */
export interface CachedMaterial {
    id: string;
    nameAr: string;
    nameEn?: string;
    currentStock: number;
    unit: string;
    groupId?: string;
    groupName?: string;
    // ─── Tenant Scoping ───
    tenantId: string;
    companyId: string;
    warehouseId?: string;
    cachedAt: string;
}

/** عنصر في طابور المزامنة */
export interface SyncQueueEntry {
    id?: number;                  // auto-increment
    table: string;                // الجدول المستهدف في Supabase
    operation: 'insert' | 'update' | 'upsert';
    payload: Record<string, unknown>;
    relatedLocalId?: string;      // ربط بـ LocalStockCountItem.id
    status: 'pending' | 'syncing' | 'done' | 'error';
    attempts: number;
    maxAttempts: number;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}

/** سجل تدقيق — من فعل ماذا ومتى */
export interface AuditEntry {
    id?: number;                  // auto-increment
    userId: string;
    userName?: string;
    action: 'scan' | 'count' | 'adjust' | 'create_roll' | 'sync' | 'preload' | 'delete';
    table: string;
    recordId: string;
    details: string;
    tenantId: string;
    companyId: string;
    timestamp: string;
    deviceInfo: string;
}

// ─── Database Definition ──────────────────────────────────────

class WarehouseOfflineDB extends Dexie {
    // الجداول
    stockCountItems!: Table<LocalStockCountItem>;
    cachedRolls!: Table<CachedRoll>;
    cachedMaterials!: Table<CachedMaterial>;
    syncQueue!: Table<SyncQueueEntry>;
    auditLog!: Table<AuditEntry>;

    constructor() {
        super('TexaCoreWarehouse');

        this.version(1).stores({
            // ─── بنود الجرد المحلية ───
            // id = Primary Key
            // الفهارس المركبة تُسرّع البحث
            stockCountItems: [
                'id',
                'stockCountId',
                'materialId',
                'rollId',
                'syncStatus',
                'isCounted',
                '[stockCountId+materialId]',
                '[stockCountId+syncStatus]',
                '[tenantId+companyId]',
            ].join(', '),

            // ─── كاش الرولونات (للمسح بدون إنترنت) ───
            cachedRolls: [
                'id',
                'rollNumber',
                'materialId',
                'warehouseId',
                'barcode',
                'qrCode',
                'rfidTag',
                'status',
                '[warehouseId+materialId]',
                '[tenantId+companyId]',
            ].join(', '),

            // ─── كاش المواد ───
            cachedMaterials: [
                'id',
                'companyId',
                'warehouseId',
                '[tenantId+companyId]',
            ].join(', '),

            // ─── طابور المزامنة ───
            syncQueue: [
                '++id',        // auto-increment
                'table',
                'status',
                'createdAt',
            ].join(', '),

            // ─── سجل التدقيق ───
            auditLog: [
                '++id',        // auto-increment
                'userId',
                'action',
                'timestamp',
                '[tenantId+companyId]',
            ].join(', '),
        });
    }

    // ════════════════════════════════════════════════════════════
    // 🔐 Tenant-Scoped Queries (عزل المستأجرين)
    // ════════════════════════════════════════════════════════════

    /** جلب بنود الجرد لشركة محددة */
    async getStockCountItems(
        stockCountId: string,
        tenantId: string,
        companyId: string
    ): Promise<LocalStockCountItem[]> {
        return this.stockCountItems
            .where('[stockCountId+materialId]')
            .between([stockCountId, Dexie.minKey], [stockCountId, Dexie.maxKey])
            .filter(item => item.tenantId === tenantId && item.companyId === companyId)
            .toArray();
    }

    /** جلب رولونات مستودع محدد لشركة محددة */
    async getCachedRolls(
        warehouseId: string,
        tenantId: string,
        companyId: string
    ): Promise<CachedRoll[]> {
        return this.cachedRolls
            .where('[warehouseId+materialId]')
            .between([warehouseId, Dexie.minKey], [warehouseId, Dexie.maxKey])
            .filter(r => r.tenantId === tenantId && r.companyId === companyId)
            .toArray();
    }

    /** البحث عن رولون بالباركود/QR/RFID/رقم الرولون */
    async findRollByCode(
        query: string,
        warehouseId: string,
        tenantId: string,
        companyId: string
    ): Promise<CachedRoll | undefined> {
        // بحث في 4 حقول — نفس نمط SalesDeliveryItemsTab
        const fields: (keyof CachedRoll)[] = ['rollNumber', 'barcode', 'qrCode', 'rfidTag'];

        for (const field of fields) {
            const result = await this.cachedRolls
                .where(field)
                .equals(query)
                .filter(r =>
                    r.warehouseId === warehouseId &&
                    r.tenantId === tenantId &&
                    r.companyId === companyId
                )
                .first();

            if (result) return result;
        }

        return undefined;
    }

    // ════════════════════════════════════════════════════════════
    // 📊 Stats (إحصائيات)
    // ════════════════════════════════════════════════════════════

    /** إحصائيات الجرد: كم بند / مُمسوح / معلق */
    async getStockCountStats(stockCountId: string, tenantId: string, companyId: string) {
        const items = await this.getStockCountItems(stockCountId, tenantId, companyId);

        const total = items.length;
        const counted = items.filter(i => i.isCounted).length;
        const synced = items.filter(i => i.syncStatus === 'synced').length;
        const pending = items.filter(i => i.syncStatus === 'pending').length;
        const errors = items.filter(i => i.syncStatus === 'error').length;
        const withVariance = items.filter(i => i.isCounted && i.variance !== 0).length;

        return { total, counted, synced, pending, errors, withVariance };
    }

    /** إحصائيات طابور المزامنة */
    async getSyncQueueStats() {
        const pending = await this.syncQueue.where('status').equals('pending').count();
        const syncing = await this.syncQueue.where('status').equals('syncing').count();
        const errors = await this.syncQueue.where('status').equals('error').count();

        return { pending, syncing, errors, total: pending + syncing + errors };
    }

    /** عدد الرولونات المحملة في الكاش */
    async getCachedRollsCount(warehouseId: string) {
        return this.cachedRolls.where('warehouseId').equals(warehouseId).count();
    }

    // ════════════════════════════════════════════════════════════
    // 🧹 Cleanup (تنظيف)
    // ════════════════════════════════════════════════════════════

    /** مسح كاش مستودع محدد */
    async clearWarehouseCache(warehouseId: string) {
        await this.cachedRolls.where('warehouseId').equals(warehouseId).delete();
    }

    /** مسح بنود جرد مكتمل */
    async clearCompletedStockCount(stockCountId: string) {
        await this.stockCountItems.where('stockCountId').equals(stockCountId).delete();
    }

    /** مسح طابور المزامنة المكتمل */
    async clearDoneSyncEntries() {
        await this.syncQueue.where('status').equals('done').delete();
    }

    /** مسح سجل التدقيق القديم (أكثر من 7 أيام) */
    async cleanOldAuditLogs(daysToKeep = 7) {
        const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
        await this.auditLog.where('timestamp').below(cutoff).delete();
    }
}

// ─── Singleton Instance ───────────────────────────────────────

export const offlineDB = new WarehouseOfflineDB();

// ─── Helper: Generate Local ID ────────────────────────────────

export function generateLocalId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

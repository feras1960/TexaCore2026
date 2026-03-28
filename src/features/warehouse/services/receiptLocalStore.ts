/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ Receipt Local Store — محرك الحفظ المحلي للاستلام
 * ════════════════════════════════════════════════════════════════
 *
 * 🔒 CRASH-SAFE DESIGN:
 * ─────────────────────────────────────────────────────
 * Every added item is immediately persisted to localStorage.
 * If power goes out or browser crashes, all items survive.
 * When Supabase is reachable, items sync automatically.
 *
 * 📡 OFFLINE QUEUE:
 * ─────────────────────────────────────────────────────
 * Items that fail to sync are queued and retried on reconnect.
 * The queue is persisted in localStorage for crash safety.
 *
 * 🔄 SYNC FLOW:
 * ─────────────────────────────────────────────────────
 * 1. User adds item → save to localStorage INSTANTLY
 * 2. Try to sync to Supabase in background
 * 3. If online → mark as 'synced'
 * 4. If offline → mark as 'pending', add to retry queue
 * 5. On reconnect → flush queue automatically
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { buildRollCode, rollNumberService } from './rollNumberService';

// ─── Types ───────────────────────────────────────────────────
export interface ReceiptItem {
    id: string;
    localId: string;              // Unique local identifier
    rollNumber: string;
    batchId: string;
    materialId: string;
    materialName: string;
    colorId?: string;
    colorName: string;
    rollLength: number;
    weight?: number;
    quality?: 'A' | 'B' | 'C' | 'damaged';  // Quality grade
    sourceItemId?: string;        // Links to purchase_invoice_items.id
    discrepancyType?: 'none' | 'shortage' | 'excess' | 'damage';
    discrepancyNotes?: string;
    source: 'manual' | 'barcode' | 'camera' | 'rfid';
    syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
    errorMessage?: string;
    createdAt: string;
    supabaseId?: string;          // ID from Supabase after sync
    // ─── Cost & Container Linking ───────────────────────────
    unitPrice?: number;           // 🔑 Cost per meter from source document
    containerItemId?: string;     // 🔑 Links to container_items.id for cost tracking
    containerId?: string;         // 🔑 Container reference for fabric_rolls.container_id
    supplierId?: string;          // Supplier reference
}

export interface ReceiptSession {
    sessionId: string;
    companyId: string;
    tenantId: string;
    warehouseId: string;
    warehouseName: string;
    employeeId?: string;
    employeeName?: string;
    billType: string;
    referenceId?: string;
    referenceName?: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    items: ReceiptItem[];
    createdAt: string;
    updatedAt: string;
    lastSyncAt?: string;
}

// ─── Constants ───────────────────────────────────────────────
const STORAGE_KEY = 'texacore_receipt_sessions';
const PENDING_QUEUE_KEY = 'texacore_receipt_pending_queue';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 10_000; // 10 seconds

// ─── Helper: Generate IDs ────────────────────────────────────
function generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateRollNumber(
    receiptRef?: string,
    itemIndex?: number,
    materialName?: string,
    colorName?: string,
    designCode?: string
): string {
    // If receipt context is available → use local smart numbering
    if (receiptRef && itemIndex) {
        const { roll_number } = rollNumberService.generateLocal({
            materialName,
            colorName,
            designCode,
            itemIndex,
        });
        return roll_number;
    }

    // Last-resort fallback (no context) — TEMP number
    // DB trigger will upgrade this to smart number if roll_code is set
    const now = new Date();
    const timeStr = now.getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `TEMP-${timeStr}-${random}`;
}

export function generateBatchId(referenceId?: string): string {
    if (referenceId) return referenceId;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `BATCH-${dateStr}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ════════════════════════════════════════════════════════════════
// 📦 Local Storage Operations
// ════════════════════════════════════════════════════════════════

function getAllSessions(): ReceiptSession[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions: ReceiptSession[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.error('❌ Failed to save to localStorage:', e);
    }
}

function getPendingQueue(): { sessionId: string; item: ReceiptItem; attempts: number }[] {
    try {
        const raw = localStorage.getItem(PENDING_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function savePendingQueue(queue: { sessionId: string; item: ReceiptItem; attempts: number }[]): void {
    try {
        localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('❌ Failed to save pending queue:', e);
    }
}

// ════════════════════════════════════════════════════════════════
// 🏗️ Receipt Local Store API
// ════════════════════════════════════════════════════════════════

export const receiptLocalStore = {

    // ─── Session Management ──────────────────────────────────

    /**
     * Create a new receipt session
     */
    createSession(params: {
        companyId: string;
        tenantId: string;
        warehouseId: string;
        warehouseName: string;
        employeeId?: string;
        employeeName?: string;
        billType: string;
        referenceId?: string;
        referenceName?: string;
    }): ReceiptSession {
        const session: ReceiptSession = {
            sessionId: generateSessionId(),
            ...params,
            status: 'draft',
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const sessions = getAllSessions();
        sessions.push(session);
        saveSessions(sessions);

        return session;
    },

    /**
     * Get active session (most recent draft/in_progress)
     */
    getActiveSession(companyId: string): ReceiptSession | null {
        const sessions = getAllSessions();
        return sessions
            .filter(s => s.companyId === companyId && ['draft', 'in_progress'].includes(s.status))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
    },

    /**
     * Get session by ID
     */
    getSession(sessionId: string): ReceiptSession | null {
        const sessions = getAllSessions();
        return sessions.find(s => s.sessionId === sessionId) || null;
    },

    /**
     * Update session metadata
     */
    updateSession(sessionId: string, updates: Partial<ReceiptSession>): ReceiptSession | null {
        const sessions = getAllSessions();
        const index = sessions.findIndex(s => s.sessionId === sessionId);
        if (index === -1) return null;

        sessions[index] = {
            ...sessions[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        saveSessions(sessions);
        return sessions[index];
    },

    // ─── Item Operations ─────────────────────────────────────

    /**
     * ⚡ Add item to session — INSTANTLY saves to localStorage
     * Then tries to sync to Supabase in background
     */
    async addItem(
        sessionId: string,
        item: Omit<ReceiptItem, 'id' | 'localId' | 'syncStatus' | 'createdAt'>
    ): Promise<ReceiptItem> {
        const newItem: ReceiptItem = {
            ...item,
            id: generateLocalId(),
            localId: generateLocalId(),
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
        };

        // 1. INSTANT localStorage save
        const sessions = getAllSessions();
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session) {
            session.items.unshift(newItem); // Add to top
            session.status = 'in_progress';
            session.updatedAt = new Date().toISOString();
            saveSessions(sessions);
        }

        // 2. Background sync to Supabase
        this.syncItemToSupabase(sessionId, newItem);

        return newItem;
    },

    /**
     * Remove item from session
     * 🔑 Also deletes the draft roll from Supabase if it was synced
     */
    async removeItem(sessionId: string, itemId: string): Promise<void> {
        const sessions = getAllSessions();
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session) {
            // 🔑 Find item BEFORE removing — to get supabaseId for deletion
            const itemToRemove = session.items.find(i => i.id === itemId);

            // Delete draft roll from Supabase if it was synced
            if (itemToRemove?.supabaseId) {
                try {
                    await supabase
                        .from('fabric_rolls')
                        .delete()
                        .eq('id', itemToRemove.supabaseId)
                        .eq('status', 'draft'); // 🛡️ Safety: only delete drafts!
                    console.log(`🗑️ Deleted draft roll ${itemToRemove.supabaseId} from Supabase`);
                } catch (err: any) {
                    console.warn('⚠️ Failed to delete draft roll:', err.message);
                }
            }

            session.items = session.items.filter(i => i.id !== itemId);
            session.updatedAt = new Date().toISOString();
            saveSessions(sessions);
        }

        // Also remove from pending queue
        const queue = getPendingQueue();
        savePendingQueue(queue.filter(q => q.item.id !== itemId));
    },

    /**
     * Get all items for a session
     */
    getItems(sessionId: string): ReceiptItem[] {
        const session = this.getSession(sessionId);
        return session?.items || [];
    },

    /**
     * Get count of pending (unsynced) items
     */
    getPendingCount(sessionId: string): number {
        const session = this.getSession(sessionId);
        return session?.items.filter(i => i.syncStatus !== 'synced').length || 0;
    },

    // ─── Supabase Sync ───────────────────────────────────────

    /**
     * Try to sync a single item to Supabase
     */
    async syncItemToSupabase(sessionId: string, item: ReceiptItem): Promise<boolean> {
        try {
            // Update status to syncing
            this.updateItemStatus(sessionId, item.id, 'syncing');

            const session = this.getSession(sessionId);
            if (!session) return false;

            // Validate batch_id (must be UUID)
            const isBatchUuid = item.batchId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.batchId);
            const batchIdToSave = isBatchUuid ? item.batchId : null;

            // Append non-UUID batch code to notes
            let notesToSave = `Receipt session: ${sessionId}`;
            if (item.batchId && !isBatchUuid) {
                notesToSave += ` | Batch: ${item.batchId}`;
            }

            // 🔢 Use exact roll_code generated locally (before the first hyphen) instead of rebuilding it
            const rollCode = item.rollNumber.split('-')[0] || 'XX';

            // Insert into fabric_rolls (the actual rolls table)
            const { data, error } = await supabase
                .from('fabric_rolls')
                .insert({
                    tenant_id: session.tenantId,
                    company_id: session.companyId,
                    warehouse_id: session.warehouseId,
                    material_id: item.materialId,
                    roll_number: item.rollNumber,
                    roll_code: rollCode || null,
                    // roll_seq → auto-assigned by DB trigger trg_set_roll_seq
                    batch_id: batchIdToSave,
                    // ─── Length ───
                    initial_length: item.rollLength,
                    current_length: item.rollLength,
                    // ─── Cost (🔑 FIX: use unit price from source document) ───
                    cost_per_meter: item.unitPrice || 0,
                    supplier_unit_cost: item.unitPrice || 0,
                    estimated_landed_cost: item.unitPrice || 0,
                    cost_status: item.unitPrice ? 'provisional' : 'pending',
                    // ─── Container Linking (🔑 FIX: link roll to container item) ───
                    container_id: item.containerId || null,
                    container_item_id: item.containerItemId || null,
                    // ─── Color ───
                    color_id: item.colorId || null,
                    color_name: item.colorName || null,

                    reserved_length: 0,
                    status: 'draft',  // 🔑 Draft حتى يُكمل الاستلام — لا يظهر في المخزون الفعلي
                    notes: notesToSave,
                    // 🔑 مصدر الرولون — لتتبع المصدر الكامل في بطاقة الرولون
                    source_type: item.containerId ? 'container_receipt' : 'goods_receipt',
                    source_document_id: session.referenceId || null,
                    source_document_number: session.referenceName || null,
                })
                .select('id')
                .single();

            if (error) {
                console.warn('⚠️ Sync failed, queuing for retry:', error.message);
                this.updateItemStatus(sessionId, item.id, 'error', error.message);
                this.addToPendingQueue(sessionId, item);
                return false;
            }

            // Success! Update local status
            this.updateItemStatus(sessionId, item.id, 'synced');
            if (data?.id) {
                this.updateItemSupabaseId(sessionId, item.id, data.id);
            }

            return true;
        } catch (err: any) {
            console.warn('⚠️ Sync exception, queuing:', err.message);
            this.updateItemStatus(sessionId, item.id, 'error', err.message);
            this.addToPendingQueue(sessionId, item);
            return false;
        }
    },

    /**
     * Update item sync status in localStorage
     */
    updateItemStatus(sessionId: string, itemId: string, status: ReceiptItem['syncStatus'], errorMessage?: string): void {
        const sessions = getAllSessions();
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session) {
            const item = session.items.find(i => i.id === itemId);
            if (item) {
                item.syncStatus = status;
                item.errorMessage = errorMessage;
            }
            saveSessions(sessions);
        }
    },

    /**
     * Update item with Supabase ID after successful sync
     */
    updateItemSupabaseId(sessionId: string, itemId: string, supabaseId: string): void {
        const sessions = getAllSessions();
        const session = sessions.find(s => s.sessionId === sessionId);
        if (session) {
            const item = session.items.find(i => i.id === itemId);
            if (item) {
                item.supabaseId = supabaseId;
            }
            saveSessions(sessions);
        }
    },

    // ─── Pending Queue ───────────────────────────────────────

    /**
     * Add failed item to retry queue
     */
    addToPendingQueue(sessionId: string, item: ReceiptItem): void {
        const queue = getPendingQueue();
        // Don't add duplicates
        if (!queue.find(q => q.item.id === item.id)) {
            queue.push({ sessionId, item, attempts: 0 });
            savePendingQueue(queue);
        }
    },

    /**
     * Flush pending queue — retry all failed syncs
     */
    async flushPendingQueue(): Promise<{ synced: number; failed: number }> {
        const queue = getPendingQueue();
        if (queue.length === 0) return { synced: 0, failed: 0 };

        let synced = 0;
        let failed = 0;
        const remaining: typeof queue = [];

        for (const entry of queue) {
            if (entry.attempts >= MAX_RETRY_ATTEMPTS) {
                // Too many attempts, keep in queue but don't retry
                remaining.push(entry);
                failed++;
                continue;
            }

            const success = await this.syncItemToSupabase(entry.sessionId, entry.item);
            if (success) {
                synced++;
            } else {
                entry.attempts++;
                remaining.push(entry);
                failed++;
            }
        }

        savePendingQueue(remaining);
        return { synced, failed };
    },

    // ─── Session Completion ──────────────────────────────────

    /**
     * Complete a receipt session
     * Syncs all remaining items, then marks session as completed
     */
    async completeSession(sessionId: string): Promise<{
        success: boolean;
        totalItems: number;
        syncedItems: number;
        pendingItems: number;
        error?: string;
    }> {
        const session = this.getSession(sessionId);
        if (!session) return { success: false, totalItems: 0, syncedItems: 0, pendingItems: 0, error: 'Session not found' };

        // Try to sync all pending items one more time
        const pendingItems = session.items.filter(i => i.syncStatus !== 'synced');
        for (const item of pendingItems) {
            await this.syncItemToSupabase(sessionId, item);
        }

        // Get updated session
        const updatedSession = this.getSession(sessionId);
        const totalItems = updatedSession?.items.length || 0;
        const syncedItems = updatedSession?.items.filter(i => i.syncStatus === 'synced').length || 0;
        const remainingPending = totalItems - syncedItems;

        // ═══════════════════════════════════════════════════════════
        // 🔑 PROMOTE: draft → available — فقط عند إكمال الاستلام
        // ═══════════════════════════════════════════════════════════
        if (remainingPending === 0 && updatedSession) {
            const supabaseIds = updatedSession.items
                .map(i => i.supabaseId)
                .filter(Boolean) as string[];

            if (supabaseIds.length > 0) {
                const { error: promoteError } = await supabase
                    .from('fabric_rolls')
                    .update({
                        status: 'available',
                        updated_at: new Date().toISOString(),
                    })
                    .in('id', supabaseIds)
                    .eq('status', 'draft'); // 🛡️ Safety: only promote drafts

                if (promoteError) {
                    console.error('❌ Failed to promote rolls to available:', promoteError.message);
                    return {
                        success: false,
                        totalItems,
                        syncedItems,
                        pendingItems: remainingPending,
                        error: `Roll promotion failed: ${promoteError.message}`,
                    };
                }
                console.log(`✅ Promoted ${supabaseIds.length} rolls: draft → available`);
            }
        }

        // Mark session status
        this.updateSession(sessionId, {
            status: remainingPending === 0 ? 'completed' : 'in_progress',
            lastSyncAt: new Date().toISOString(),
        });

        return {
            success: remainingPending === 0,
            totalItems,
            syncedItems,
            pendingItems: remainingPending,
        };
    },

    /**
     * Discard a session and all its items
     * 🔑 Deletes all draft rolls from Supabase to prevent orphans
     */
    async discardSession(sessionId: string): Promise<void> {
        const session = this.getSession(sessionId);

        // 🔑 Delete all draft rolls from Supabase FIRST
        if (session) {
            const supabaseIds = session.items
                .map(i => i.supabaseId)
                .filter(Boolean) as string[];

            if (supabaseIds.length > 0) {
                try {
                    const { error } = await supabase
                        .from('fabric_rolls')
                        .delete()
                        .in('id', supabaseIds)
                        .eq('status', 'draft'); // 🛡️ Safety: only delete drafts!

                    if (error) {
                        console.warn('⚠️ Failed to delete draft rolls:', error.message);
                    } else {
                        console.log(`🗑️ Deleted ${supabaseIds.length} draft rolls from Supabase`);
                    }
                } catch (err: any) {
                    console.warn('⚠️ Draft roll cleanup exception:', err.message);
                }
            }
        }

        // Remove session from localStorage
        const sessions = getAllSessions();
        const filtered = sessions.filter(s => s.sessionId !== sessionId);
        saveSessions(filtered);

        // Also clear pending queue for this session
        const queue = getPendingQueue();
        savePendingQueue(queue.filter(q => q.sessionId !== sessionId));
    },

    /**
     * Clean up completed sessions older than 24 hours
     */
    cleanup(): void {
        const sessions = getAllSessions();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = sessions.filter(s => {
            if (s.status === 'completed' && new Date(s.updatedAt).getTime() < cutoff) {
                return false;
            }
            return true;
        });
        saveSessions(filtered);
    },

    // ─── Network Status ──────────────────────────────────────

    /**
     * Check if online and setup reconnect listener
     */
    setupReconnectListener(): () => void {
        const handleOnline = () => {
            console.log('📡 Online — flushing pending sync queue...');
            this.flushPendingQueue();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    },

    /**
     * Get overall sync stats
     */
    getSyncStats(sessionId: string): {
        total: number;
        synced: number;
        pending: number;
        errors: number;
        isFullySynced: boolean;
    } {
        const session = this.getSession(sessionId);
        const items = session?.items || [];
        const synced = items.filter(i => i.syncStatus === 'synced').length;
        const pending = items.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'syncing').length;
        const errors = items.filter(i => i.syncStatus === 'error').length;

        return {
            total: items.length,
            synced,
            pending,
            errors,
            isFullySynced: items.length > 0 && synced === items.length,
        };
    },
};

/**
 * ════════════════════════════════════════════════════════════════
 * 📡 TabSyncChannel — مزامنة بين التبويبات عبر BroadcastChannel
 * ════════════════════════════════════════════════════════════════
 *
 * يمنع:
 *   - تعارض الكتابة على IndexedDB بين التبويبات
 *   - بقاء تبويب مفتوح بعد logout
 *   - تشغيل Realtime subscriptions مكررة
 *
 * 🔄 Leader Election:
 *   Tab واحد فقط (Leader) يشغل Supabase Realtime
 *   باقي التبويبات تستقبل التحديثات عبر BroadcastChannel
 *
 * ⚠️ Fallback: إذا BroadcastChannel غير مدعوم (Safari < 15.4)
 *    يستخدم localStorage events بدلاً.
 *
 * ════════════════════════════════════════════════════════════════
 */

// ─── Types ────────────────────────────────────────────────────

export type SyncMessage =
  | { type: 'CACHE_UPDATED'; queryKeys: string[]; tabId: string }
  | { type: 'LOGOUT'; tabId: string }
  | { type: 'DATA_CHANGED'; table: string; operation: 'insert' | 'update' | 'delete'; tabId: string }
  | { type: 'SYNC_COMPLETED'; queueId: number; tabId: string }
  | { type: 'HEARTBEAT'; tabId: string; timestamp: number }
  | { type: 'LEADER_CLAIM'; tabId: string; timestamp: number }
  | { type: 'LEADER_ACK'; tabId: string; leaderId: string }
  | { type: 'TAB_CLOSING'; tabId: string };

type MessageHandler = (message: SyncMessage) => void;

// ─── Constants ────────────────────────────────────────────────

const CHANNEL_NAME = 'texacore-sync';
const HEARTBEAT_INTERVAL = 10_000;      // 10 seconds
const LEADER_TIMEOUT = 15_000;          // 15 seconds — if no heartbeat, leader is dead
const STORAGE_FALLBACK_KEY = '__texacore_tab_sync__';

// ─── TabSyncChannel Class ─────────────────────────────────────

class TabSyncChannel {
  public readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private useFallback = false;
  private listeners = new Map<string, Set<MessageHandler>>();
  private isLeaderFlag = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private leaderTabId: string | null = null;
  private leaderLastSeen = 0;
  private destroyed = false;

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Try BroadcastChannel first
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this._handleMessage(event.data);
      };
    } catch {
      // Safari < 15.4 or other browsers without BroadcastChannel
      this.useFallback = true;
      this._setupStorageFallback();
    }

    // Leader election on startup
    this._startHeartbeat();
    this._tryClaimLeader();

    // Cleanup on tab close
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this._handleUnload);
      document.addEventListener('visibilitychange', this._handleVisibility);
    }

    console.log(`📡 [TabSync] Tab ${this.tabId.substring(0, 12)} initialized (${this.useFallback ? 'localStorage fallback' : 'BroadcastChannel'})`);
  }

  // ─── Public API ──────────────────────────────────────────

  /** Is this tab the leader? */
  get isLeader(): boolean {
    return this.isLeaderFlag;
  }

  /** Broadcast a message to all other tabs */
  broadcast(message: Record<string, unknown>): void {
    if (this.destroyed) return;

    const fullMessage = { ...message, tabId: this.tabId } as SyncMessage;

    if (this.channel) {
      try {
        this.channel.postMessage(fullMessage);
      } catch (err) {
        console.warn('📡 [TabSync] Failed to broadcast:', err);
      }
    } else if (this.useFallback) {
      try {
        localStorage.setItem(
          STORAGE_FALLBACK_KEY,
          JSON.stringify({ ...fullMessage, _ts: Date.now() })
        );
      } catch { /* ignore */ }
    }
  }

  /** Subscribe to a specific message type */
  subscribe(type: SyncMessage['type'], handler: MessageHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  /** Subscribe to ALL messages */
  subscribeAll(handler: MessageHandler): () => void {
    if (!this.listeners.has('*')) {
      this.listeners.set('*', new Set());
    }
    this.listeners.get('*')!.add(handler);
    return () => {
      this.listeners.get('*')?.delete(handler);
    };
  }

  /** Force leader election (useful after leader tab closes) */
  forceElection(): void {
    this.leaderTabId = null;
    this._tryClaimLeader();
  }

  /** Destroy this channel (cleanup) */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Notify other tabs
    this.broadcast({ type: 'TAB_CLOSING' });

    // Cleanup intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Cleanup BroadcastChannel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    // Cleanup event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this._handleUnload);
      document.removeEventListener('visibilitychange', this._handleVisibility);
      if (this.useFallback) {
        window.removeEventListener('storage', this._handleStorageEvent);
      }
    }

    this.listeners.clear();
    console.log(`📡 [TabSync] Tab ${this.tabId.substring(0, 12)} destroyed`);
  }

  // ─── Private Methods ─────────────────────────────────────

  private _handleMessage = (message: SyncMessage): void => {
    // Ignore own messages
    if (message.tabId === this.tabId) return;

    // Handle leader-related messages
    switch (message.type) {
      case 'HEARTBEAT':
        if (message.tabId === this.leaderTabId) {
          this.leaderLastSeen = Date.now();
        }
        break;

      case 'LEADER_CLAIM': {
        // If we're already leader and our timestamp is earlier, we keep leadership
        if (this.isLeaderFlag && message.timestamp > (this.leaderLastSeen || 0)) {
          // We're the earlier leader — send ACK with ourselves
          this.broadcast({ type: 'LEADER_ACK', leaderId: this.tabId });
        } else {
          // Accept new leader
          this.leaderTabId = message.tabId;
          this.leaderLastSeen = Date.now();
          this.isLeaderFlag = false;
          this.broadcast({ type: 'LEADER_ACK', leaderId: message.tabId });
        }
        break;
      }

      case 'LEADER_ACK':
        if ((message as any).leaderId !== this.tabId) {
          this.isLeaderFlag = false;
          this.leaderTabId = (message as any).leaderId;
          this.leaderLastSeen = Date.now();
        }
        break;

      case 'TAB_CLOSING':
        // If the leader tab is closing, claim leadership
        if (message.tabId === this.leaderTabId) {
          console.log('📡 [TabSync] Leader tab closed — claiming leadership');
          this.leaderTabId = null;
          setTimeout(() => this._tryClaimLeader(), 200 + Math.random() * 300);
        }
        break;
    }

    // Dispatch to type-specific listeners
    const typeHandlers = this.listeners.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          console.warn('📡 [TabSync] Handler error:', err);
        }
      });
    }

    // Dispatch to wildcard listeners
    const allHandlers = this.listeners.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          console.warn('📡 [TabSync] Handler error:', err);
        }
      });
    }
  };

  private _tryClaimLeader(): void {
    // If no leader or leader timed out, claim leadership
    if (!this.leaderTabId || Date.now() - this.leaderLastSeen > LEADER_TIMEOUT) {
      this.isLeaderFlag = true;
      this.leaderTabId = this.tabId;
      this.leaderLastSeen = Date.now();
      this.broadcast({ type: 'LEADER_CLAIM', timestamp: Date.now() });
      console.log(`📡 [TabSync] 👑 Tab ${this.tabId.substring(0, 12)} claimed leadership`);
    }
  }

  private _startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.destroyed) return;

      if (this.isLeaderFlag) {
        // Leader sends heartbeat
        this.broadcast({ type: 'HEARTBEAT', timestamp: Date.now() });
      } else {
        // Non-leader checks if leader is alive
        if (this.leaderTabId && Date.now() - this.leaderLastSeen > LEADER_TIMEOUT) {
          console.log('📡 [TabSync] Leader timed out — claiming leadership');
          this._tryClaimLeader();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  private _handleUnload = (): void => {
    // Synchronous — cannot use async broadcast
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'TAB_CLOSING', tabId: this.tabId } as SyncMessage);
      } catch { /* ignore */ }
    }
  };

  private _handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && !this.leaderTabId) {
      // Tab became visible and no leader — claim
      this._tryClaimLeader();
    }
  };

  // ─── localStorage Fallback (Safari < 15.4) ──────────────

  private _setupStorageFallback(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', this._handleStorageEvent);
  }

  private _handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== STORAGE_FALLBACK_KEY || !event.newValue) return;
    try {
      const message = JSON.parse(event.newValue) as SyncMessage;
      this._handleMessage(message);
    } catch { /* ignore malformed messages */ }
  };
}

// ─── Singleton Instance ───────────────────────────────────────

let _instance: TabSyncChannel | null = null;

export function getTabSync(): TabSyncChannel {
  if (!_instance) {
    _instance = new TabSyncChannel();
  }
  return _instance;
}

/** Destroy and recreate (for testing or full reset) */
export function resetTabSync(): void {
  _instance?.destroy();
  _instance = null;
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  getTabSync();
}

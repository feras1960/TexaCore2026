// ════════════════════════════════════════════════════════════
// Desktop Backup Engine
// ════════════════════════════════════════════════════════════
// - Auto-backup via Electron IPC (PostgreSQL pg_dump)
// - Manual backup/restore
// - Backup history tracking

export interface BackupEntry {
  id: string;
  timestamp: string;
  type: 'auto' | 'manual' | 'shutdown';
  sizeMB: number;
  path: string;
  companyName: string;
}

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBackups: number;
  storagePath: string;
}

const BACKUP_HISTORY_KEY = 'texacore_backup_history';

// ─── Backup History ───────────────────────────────────────
export function getBackupHistory(): BackupEntry[] {
  try {
    const stored = localStorage.getItem(BACKUP_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addBackupEntry(entry: BackupEntry) {
  const history = getBackupHistory();
  history.unshift(entry); // newest first
  // Keep max 100 entries
  if (history.length > 100) history.length = 100;
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
}

// ─── Create Backup (via Electron IPC) ─────────────────────
export async function createBackup(type: 'auto' | 'manual' | 'shutdown' = 'manual'): Promise<BackupEntry | null> {
  if (!(window as any).electronAPI?.createBackup) {
    console.warn('[Backup] No Electron API available');
    return null;
  }

  try {
    const result = await (window as any).electronAPI.createBackup({ type });
    if (result?.success) {
      const entry: BackupEntry = {
        id: `backup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        sizeMB: result.sizeMB || 0,
        path: result.path || '',
        companyName: result.companyName || '',
      };
      addBackupEntry(entry);
      console.log(`[Backup] ✅ ${type} backup created:`, entry.path);
      return entry;
    }
  } catch (err) {
    console.error('[Backup] ❌ Failed:', err);
  }
  return null;
}

// ─── Restore Backup (via Electron IPC) ────────────────────
export async function restoreBackup(backupPath: string): Promise<boolean> {
  if (!(window as any).electronAPI?.restoreBackup) {
    console.warn('[Backup] No Electron API available');
    return false;
  }

  try {
    const result = await (window as any).electronAPI.restoreBackup({ path: backupPath });
    return result?.success || false;
  } catch (err) {
    console.error('[Backup] ❌ Restore failed:', err);
    return false;
  }
}

// ─── Auto-Backup Timer ────────────────────────────────────
let autoBackupInterval: NodeJS.Timeout | null = null;

export function startAutoBackup(intervalMinutes: number = 5) {
  stopAutoBackup();
  console.log(`[Backup] 🔄 Auto-backup every ${intervalMinutes} minutes`);
  autoBackupInterval = setInterval(() => {
    createBackup('auto');
  }, intervalMinutes * 60 * 1000);
}

export function stopAutoBackup() {
  if (autoBackupInterval) {
    clearInterval(autoBackupInterval);
    autoBackupInterval = null;
  }
}

// ─── Shutdown Backup ──────────────────────────────────────
export function registerShutdownBackup() {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      createBackup('shutdown');
    });
  }
}

// ─── Initialize Backup System ─────────────────────────────
export function initBackupSystem() {
  try {
    const config = localStorage.getItem('texacore_desktop_config');
    if (!config) return;
    const parsed = JSON.parse(config);
    if (parsed.autoBackup) {
      startAutoBackup(parsed.backupIntervalMinutes || 5);
      registerShutdownBackup();
    }
  } catch {}
}

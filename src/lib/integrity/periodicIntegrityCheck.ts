/**
 * ════════════════════════════════════════════════════════════════
 * 🔍 Periodic Integrity Check — فحص دوري لسلامة الكاش
 * ════════════════════════════════════════════════════════════════
 *
 * يفحص كل مفاتيح الكاش في IndexedDB ويحذف التالف.
 * يعمل مرة كل 24 ساعة أو عند الطلب يدوياً.
 *
 * ════════════════════════════════════════════════════════════════
 */

import Dexie from 'dexie';
import { dataIntegrity } from './dataIntegrity';

// ─── Types ────────────────────────────────────────────────────

export interface IntegrityReport {
  checkedAt: Date;
  databaseName: string;
  totalKeys: number;
  validKeys: number;
  corruptedKeys: string[];
  repairedKeys: string[];
  durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const LAST_CHECK_KEY = 'texacore_last_integrity_check';

// ─── Run Integrity Check ─────────────────────────────────────

/**
 * فحص سلامة الكاش لقاعدة بيانات معينة
 */
export async function runIntegrityCheck(dbName?: string): Promise<IntegrityReport> {
  const start = performance.now();
  const targetDB = dbName || _getCurrentCacheDBName();

  const report: IntegrityReport = {
    checkedAt: new Date(),
    databaseName: targetDB,
    totalKeys: 0,
    validKeys: 0,
    corruptedKeys: [],
    repairedKeys: [],
    durationMs: 0,
  };

  try {
    const db = new Dexie(targetDB);
    // Open dynamically — we may not know the schema
    await db.open();

    const tables = db.tables;
    for (const table of tables) {
      try {
        const records = await table.toArray();
        report.totalKeys += records.length;

        for (const record of records) {
          if (!record || typeof record !== 'object') continue;

          // Only check records that have our integrity wrapper
          if ('hash' in record && 'data' in record && 'version' in record) {
            try {
              const serialized = JSON.stringify(record.data);
              const isValid = await dataIntegrity.verify(serialized, record.hash);

              if (isValid) {
                report.validKeys++;
              } else {
                const key = record.key || record.id || 'unknown';
                report.corruptedKeys.push(`${table.name}:${key}`);
              }
            } catch {
              const key = record.key || record.id || 'unknown';
              report.corruptedKeys.push(`${table.name}:${key}`);
            }
          } else if ('value' in record && 'key' in record) {
            // ═══ QueryPersistence entries (compressed/encrypted) ═══
            // These have: key, value, hash, compressed, encrypted, updatedAt
            // The value is NOT raw JSON — it may be LZ-compressed and/or AES-encrypted.
            // We MUST NOT try JSON.parse on them. If they have a hash, trust the
            // queryPersistence pipeline to verify on restore.
            if ('compressed' in record || 'encrypted' in record) {
              // QueryPersistence managed entry — skip JSON.parse validation
              // The hash is verified at restore time by queryPersistence.restoreClient()
              report.validKeys++;
            } else {
              // Legacy records without integrity wrapper — check if parseable
              try {
                if (typeof record.value === 'string') {
                  JSON.parse(record.value);
                }
                report.validKeys++;
              } catch {
                report.corruptedKeys.push(`${table.name}:${record.key}`);
              }
            }
          } else {
            // Other records — assume valid
            report.validKeys++;
          }
        }
      } catch {
        // Table read failed
      }
    }

    // Repair: delete corrupted records
    for (const keyPath of report.corruptedKeys) {
      try {
        const [tableName, key] = keyPath.split(':');
        const table = db.table(tableName);
        if (table && key) {
          await table.delete(key);
          report.repairedKeys.push(keyPath);
        }
      } catch {
        // Ignore repair failures
      }
    }

    db.close();
  } catch (err) {
    console.warn('🔍 [Integrity] Check failed:', err);
  }

  report.durationMs = Math.round(performance.now() - start);

  // Log results
  if (report.corruptedKeys.length > 0) {
    console.warn(`🔍 [Integrity] Found ${report.corruptedKeys.length} corrupted keys in ${targetDB}:`, report.corruptedKeys);
    console.log(`🔍 [Integrity] Repaired ${report.repairedKeys.length} keys`);
  } else {
    console.log(`🔍 [Integrity] ✅ All ${report.validKeys}/${report.totalKeys} keys valid in ${targetDB} (${report.durationMs}ms)`);
  }

  // Store last check time
  try {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
  } catch { /* ignore */ }

  return report;
}

// ─── Schedule Periodic Checks ─────────────────────────────────

let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * بدء فحص دوري — مرة كل 24 ساعة
 */
export function scheduleIntegrityChecks(): void {
  if (checkInterval) return; // Already scheduled

  // Check if due
  const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
  const sinceLastCheck = Date.now() - lastCheck;

  if (sinceLastCheck >= CHECK_INTERVAL) {
    // Due — run after 30 seconds (don't block startup)
    setTimeout(() => runIntegrityCheck(), 30_000);
  }

  // Schedule next
  checkInterval = setInterval(() => {
    runIntegrityCheck();
  }, CHECK_INTERVAL);
}

/**
 * إيقاف الفحص الدوري
 */
export function stopIntegrityChecks(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// ─── Helper ───────────────────────────────────────────────────

function _getCurrentCacheDBName(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const user = parsed?.user || parsed?.currentSession?.user;
          if (user?.id) {
            const userId = user.id.substring(0, 8);
            const companyId = (
              user.user_metadata?.company_id ||
              user.app_metadata?.company_id ||
              'default'
            ).substring(0, 8);
            return `TexaCoreCache_${userId}_${companyId}`;
          }
        }
      }
    }
  } catch { /* ignore */ }
  return 'TexaCoreCache_anon_default';
}

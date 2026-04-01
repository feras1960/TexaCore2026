/**
 * ════════════════════════════════════════════════════════════════
 * 💾 Storage Persistence — حماية IndexedDB من الحذف التلقائي
 * ════════════════════════════════════════════════════════════════
 *
 * Safari/iOS يحذف IndexedDB بعد 7 أيام بدون تفاعل.
 * هذا الملف يطلب Persistent Storage لمنع ذلك.
 *
 * 🔐 يتضمن:
 *   - طلب Persistent Storage من المتصفح
 *   - مراقبة حالة التخزين (quota/usage)
 *   - تنظيف الكاش القديم عند الامتلاء
 *
 * ════════════════════════════════════════════════════════════════
 */

import Dexie from 'dexie';

// ─── Types ────────────────────────────────────────────────────

export interface StorageStatus {
  isPersisted: boolean;
  quota: number;        // bytes
  usage: number;        // bytes
  usagePercentage: number;
  quotaMB: number;
  usageMB: number;
}

const DEFAULT_STATUS: StorageStatus = {
  isPersisted: false,
  quota: 0,
  usage: 0,
  usagePercentage: 0,
  quotaMB: 0,
  usageMB: 0,
};

// ─── 1. Request Persistent Storage ───────────────────────────

/**
 * طلب تخزين دائم من المتصفح — يمنع Safari من حذف IndexedDB
 * 
 * ⚠️ Safari قد يحتاج user gesture (click) لقبول الطلب.
 *     Chrome يقبل تلقائياً إذا:
 *     - الموقع bookmarked أو
 *     - الموقع لديه push notification permission أو
 *     - الموقع installed كـ PWA
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) {
      console.log('💾 [Storage] navigator.storage.persist() غير مدعوم');
      return false;
    }

    // تحقق أولاً — هل التخزين مستمر بالفعل؟
    const alreadyPersisted = await navigator.storage.persisted();
    if (alreadyPersisted) {
      console.log('💾 [Storage] ✅ التخزين الدائم مُفعّل مسبقاً');
      return true;
    }

    // طلب التخزين الدائم
    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('💾 [Storage] ✅ تم قبول طلب التخزين الدائم');
    } else {
      // ℹ️ Normal on localhost / non-PWA — not an error, just informational
      console.log('💾 [Storage] ℹ️ التخزين الدائم غير متاح (طبيعي على localhost)');
    }
    return granted;
  } catch (err) {
    console.warn('💾 [Storage] Error requesting persistence:', err);
    return false;
  }
}

// ─── 2. Get Storage Status ───────────────────────────────────

/**
 * فحص حالة التخزين — الحصة المتاحة والمستخدمة
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.estimate) {
      return DEFAULT_STATUS;
    }

    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const usagePercentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    const isPersisted = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false;

    return {
      isPersisted,
      quota,
      usage,
      usagePercentage,
      quotaMB: Math.round(quota / (1024 * 1024)),
      usageMB: Math.round(usage / (1024 * 1024)),
    };
  } catch (err) {
    console.warn('💾 [Storage] Error estimating storage:', err);
    return DEFAULT_STATUS;
  }
}

// ─── 3. Cleanup Old Cache ────────────────────────────────────

/**
 * تنظيف الكاش القديم إذا تجاوز الاستهلاك الحد المطلوب
 * @param thresholdPercent — النسبة المئوية مثلاً 80 = 80%
 */
export async function cleanupOldCache(thresholdPercent = 80): Promise<{ cleaned: boolean; freedMB: number }> {
  const status = await getStorageStatus();

  if (status.usagePercentage < thresholdPercent) {
    return { cleaned: false, freedMB: 0 };
  }

  console.log(`💾 [Storage] 🧹 التخزين عند ${status.usagePercentage}% — جاري التنظيف...`);

  const beforeUsage = status.usage;

  try {
    // 1. حذف قواعد بيانات الكاش القديمة (أكثر من 30 يوم بدون تحديث)
    const databases = await Dexie.getDatabaseNames();
    const oldCaches = databases.filter(n => n.startsWith('TexaCoreCache_'));

    // حذف كل ما عدا الكاش الحالي
    const currentCachePrefix = _getCurrentCachePrefix();
    const toDelete = oldCaches.filter(n => !n.startsWith(currentCachePrefix));

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(n => Dexie.delete(n)));
      console.log(`💾 [Storage] 🧹 حذف ${toDelete.length} قاعدة بيانات كاش قديمة`);
    }

    // 2. فحص حجم التخزين بعد التنظيف
    const afterStatus = await getStorageStatus();
    const freedBytes = Math.max(0, beforeUsage - afterStatus.usage);
    const freedMB = Math.round(freedBytes / (1024 * 1024));

    console.log(`💾 [Storage] ✅ تم تحرير ${freedMB} MB`);
    return { cleaned: true, freedMB };
  } catch (err) {
    console.warn('💾 [Storage] Error cleaning cache:', err);
    return { cleaned: false, freedMB: 0 };
  }
}

// ─── 4. Initialize (call once on app startup) ────────────────

let hasInitialized = false;

/**
 * تهيئة نظام التخزين — يُستدعى مرة واحدة عند بدء التطبيق
 */
export async function initStoragePersistence(): Promise<StorageStatus> {
  if (hasInitialized) {
    return getStorageStatus();
  }
  hasInitialized = true;

  // 1. طلب تخزين دائم
  const persisted = await requestPersistentStorage();

  // 2. فحص الحالة
  const status = await getStorageStatus();

  // 3. تنظيف إذا لزم الأمر
  if (status.usagePercentage > 80) {
    await cleanupOldCache(80);
  }

  // 4. Log للـ debugging
  console.log(
    `💾 [Storage] Status: ${status.usageMB}MB / ${status.quotaMB}MB (${status.usagePercentage}%) | Persisted: ${persisted ? '✅' : '❌'}`
  );

  return status;
}

// ─── Helpers ─────────────────────────────────────────────────

function _getCurrentCachePrefix(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const user = parsed?.user || parsed?.currentSession?.user;
          if (user?.id) {
            return `TexaCoreCache_${user.id.substring(0, 8)}`;
          }
        }
      }
    }
  } catch { /* ignore */ }
  return 'TexaCoreCache_anon';
}

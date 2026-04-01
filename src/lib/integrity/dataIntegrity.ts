/**
 * ════════════════════════════════════════════════════════════════
 * ✅ Data Integrity — التحقق من سلامة البيانات المحلية
 * ════════════════════════════════════════════════════════════════
 *
 * يحسب SHA-256 hash عند الحفظ ويتحقق منه عند القراءة.
 * إذا البيانات تالفة → يُكتشف التلف ويُمسح الكاش.
 *
 * ════════════════════════════════════════════════════════════════
 */

// ─── Types ────────────────────────────────────────────────────

export interface IntegrityWrapped<T = unknown> {
  data: T;
  hash: string;
  version: number;
  timestamp: number;
}

// ─── DataIntegrityChecker Class ───────────────────────────────

class DataIntegrityChecker {
  /**
   * حساب SHA-256 hash لنص
   */
  async computeHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this._bufferToHex(hashBuffer);
  }

  /**
   * التحقق من صحة البيانات مقابل hash معروف
   */
  async verify(data: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.computeHash(data);
    return actualHash === expectedHash;
  }

  /**
   * تغليف البيانات مع hash (للحفظ)
   */
  async wrap<T>(data: T): Promise<IntegrityWrapped<T>> {
    const serialized = JSON.stringify(data);
    const hash = await this.computeHash(serialized);
    return {
      data,
      hash,
      version: 1,
      timestamp: Date.now(),
    };
  }

  /**
   * فك التغليف مع التحقق (للقراءة)
   * يرجع null إذا البيانات تالفة
   */
  async unwrap<T>(wrapped: IntegrityWrapped<T>): Promise<T | null> {
    try {
      const serialized = JSON.stringify(wrapped.data);
      const isValid = await this.verify(serialized, wrapped.hash);

      if (!isValid) {
        console.error('✅ [Integrity] ❌ Hash mismatch — data corrupted');
        return null;
      }

      return wrapped.data;
    } catch (err) {
      console.error('✅ [Integrity] ❌ Unwrap failed:', err);
      return null;
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private _bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// ─── Singleton ────────────────────────────────────────────────

export const dataIntegrity = new DataIntegrityChecker();

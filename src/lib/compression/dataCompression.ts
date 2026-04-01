/**
 * ════════════════════════════════════════════════════════════════
 * 📦 Data Compression — ضغط البيانات الكبيرة قبل التخزين
 * ════════════════════════════════════════════════════════════════
 *
 * يستخدم LZ-String لضغط البيانات قبل حفظها في IndexedDB.
 * يقلل حجم التخزين بنسبة 40-70% مع overhead أقل من 5ms.
 *
 * ════════════════════════════════════════════════════════════════
 */

import LZString from 'lz-string';

// ─── Types ────────────────────────────────────────────────────

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  timeMs: number;
}

// Threshold — don't compress small data (overhead > savings)
const COMPRESSION_THRESHOLD = 1024; // 1 KB

// ─── DataCompressor Class ─────────────────────────────────────

class DataCompressor {
  private stats: CompressionStats[] = [];

  /**
   * ضغط نص باستخدام LZ-String (UTF-16 safe for IndexedDB)
   */
  compress(data: string): string {
    const start = performance.now();
    const compressed = LZString.compressToUTF16(data);
    const timeMs = performance.now() - start;

    this._recordStats({
      originalSize: data.length * 2,     // UTF-16 chars → bytes
      compressedSize: compressed.length * 2,
      ratio: compressed.length / data.length,
      timeMs,
    });

    return compressed;
  }

  /**
   * فك ضغط نص
   */
  decompress(compressed: string): string {
    const result = LZString.decompressFromUTF16(compressed);
    if (result === null) {
      throw new Error('[Compression] Failed to decompress — data may be corrupted');
    }
    return result;
  }

  /**
   * ضغط ذكي — فقط إذا الحجم > threshold والضغط يوفر مساحة
   */
  smartCompress(data: string): { data: string; compressed: boolean } {
    if (data.length < COMPRESSION_THRESHOLD) {
      return { data, compressed: false };
    }

    const compressed = this.compress(data);

    // If compression didn't help (very rare), use original
    if (compressed.length >= data.length) {
      return { data, compressed: false };
    }

    return { data: compressed, compressed: true };
  }

  /**
   * فك ضغط ذكي
   */
  smartDecompress(data: string, isCompressed: boolean): string {
    return isCompressed ? this.decompress(data) : data;
  }

  /**
   * إحصائيات الضغط المجمعة
   */
  getStats(): {
    totalOriginalBytes: number;
    totalCompressedBytes: number;
    averageRatio: number;
    averageTimeMs: number;
    savedBytes: number;
    savedMB: number;
    operationCount: number;
  } {
    if (this.stats.length === 0) {
      return {
        totalOriginalBytes: 0, totalCompressedBytes: 0,
        averageRatio: 0, averageTimeMs: 0, savedBytes: 0,
        savedMB: 0, operationCount: 0,
      };
    }

    const totalOriginalBytes = this.stats.reduce((s, x) => s + x.originalSize, 0);
    const totalCompressedBytes = this.stats.reduce((s, x) => s + x.compressedSize, 0);
    const savedBytes = totalOriginalBytes - totalCompressedBytes;

    return {
      totalOriginalBytes,
      totalCompressedBytes,
      averageRatio: totalCompressedBytes / totalOriginalBytes,
      averageTimeMs: this.stats.reduce((s, x) => s + x.timeMs, 0) / this.stats.length,
      savedBytes,
      savedMB: Math.round(savedBytes / (1024 * 1024) * 100) / 100,
      operationCount: this.stats.length,
    };
  }

  // ─── Private ─────────────────────────────────────────────

  private _recordStats(stats: CompressionStats): void {
    this.stats.push(stats);
    if (this.stats.length > 100) {
      this.stats.shift();
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────

export const dataCompressor = new DataCompressor();

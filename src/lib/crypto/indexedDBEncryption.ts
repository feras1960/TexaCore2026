/**
 * ════════════════════════════════════════════════════════════════
 * 🔐 IndexedDB Encryption — تشفير AES-256-GCM للبيانات المحلية
 * ════════════════════════════════════════════════════════════════
 *
 * يشفر البيانات قبل حفظها في IndexedDB لمنع قراءتها من DevTools.
 * المفتاح يُشتق من userId + tenantId + salt باستخدام PBKDF2.
 *
 * 🔐 الخوارزمية: AES-256-GCM
 * 🔑 اشتقاق المفتاح: PBKDF2 (100,000 iterations)
 * 🧂 Salt: 16 bytes random, stored separately in IndexedDB
 * 🔒 IV: 12 bytes random per encryption (prepended to ciphertext)
 *
 * ════════════════════════════════════════════════════════════════
 */

// ─── Constants ────────────────────────────────────────────────

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;      // bytes — GCM standard
const SALT_LENGTH = 16;    // bytes
const PBKDF2_ITERATIONS = 100_000;
const TAG_LENGTH = 128;    // bits

// ─── IndexedDBEncryption Class ────────────────────────────────

class IndexedDBEncryption {
  private key: CryptoKey | null = null;

  /**
   * اشتقاق مفتاح التشفير من userId + tenantId + salt
   * يُستدعى مرة واحدة عند login
   */
  async deriveKey(
    userId: string,
    tenantId: string,
    existingSalt?: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    // 1. إنشاء أو استخدام salt موجود
    const salt = existingSalt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;

    // 2. تحويل userId + tenantId إلى key material
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(`${userId}::${tenantId}`);

    // 3. استيراد كـ raw key للـ PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // 4. اشتقاق مفتاح AES-256 باستخدام PBKDF2
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );

    this.key = derivedKey;
    console.log('🔐 [Encryption] Key derived successfully');

    return { key: derivedKey, salt };
  }

  /**
   * تشفير نص → base64 string
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!this.key) throw new Error('[Encryption] No key — call deriveKey() first');

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
      this.key,
      data
    );

    // Combine: IV (12 bytes) + ciphertext (includes GCM tag)
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), IV_LENGTH);

    // Convert to base64
    return _arrayBufferToBase64(combined.buffer);
  }

  /**
   * فك تشفير من base64 string → نص
   */
  async decrypt(encryptedBase64: string): Promise<string> {
    if (!this.key) throw new Error('[Encryption] No key — call deriveKey() first');

    // Decode base64
    const combined = _base64ToArrayBuffer(encryptedBase64);
    const combinedArray = new Uint8Array(combined);

    // Extract IV and ciphertext
    const iv = combinedArray.slice(0, IV_LENGTH);
    const ciphertext = combinedArray.slice(IV_LENGTH);

    // Decrypt
    const plainBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
      this.key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plainBuffer);
  }

  /**
   * تشفير object (JSON → encrypt)
   */
  async encryptObject<T>(obj: T): Promise<string> {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * فك تشفير object (decrypt → JSON.parse)
   */
  async decryptObject<T>(encrypted: string): Promise<T> {
    const json = await this.decrypt(encrypted);
    return JSON.parse(json);
  }

  /**
   * هل يوجد مفتاح تشفير؟
   */
  hasKey(): boolean {
    return this.key !== null;
  }

  /**
   * مسح المفتاح من الذاكرة (عند logout)
   */
  clearKey(): void {
    this.key = null;
    console.log('🔐 [Encryption] Key cleared from memory');
  }
}

// ─── Utility Functions ────────────────────────────────────────

export function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Singleton ────────────────────────────────────────────────

export const dbEncryption = new IndexedDBEncryption();

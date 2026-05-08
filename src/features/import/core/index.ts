/**
 * ════════════════════════════════════════════════════════════════
 * 🔌 Import Core — Registry & Entry Point
 * ════════════════════════════════════════════════════════════════
 * Central registry for all import converters.
 * To add a new source: implement ImportConverter, register here.
 * @module features/import/core
 */

export * from './unified-data-model';
export { RsfBrowserReader } from './rsf-reader.browser';
export { rsfConverter } from './rsf-to-unified';
export { tcdbConverter, getTcdbFileInfo } from './tcdb-to-unified';

import type { ImportConverter, ImportSource } from './unified-data-model';
import { rsfConverter } from './rsf-to-unified';
import { tcdbConverter } from './tcdb-to-unified';

/** Registry of all available converters */
const converterRegistry: Map<ImportSource, ImportConverter> = new Map([
  ['rsf', rsfConverter],
  ['tcdb', tcdbConverter],
]);

/** Get converter by source type */
export function getConverter(source: ImportSource): ImportConverter | undefined {
  return converterRegistry.get(source);
}

/** Register a new converter (for future extensibility) */
export function registerConverter(converter: ImportConverter) {
  converterRegistry.set(converter.source, converter);
}

/** Get all registered converters */
export function getAllConverters(): ImportConverter[] {
  return Array.from(converterRegistry.values());
}

/** Detect file type from buffer */
export function detectFileType(buffer: ArrayBuffer): ImportSource | 'unknown' {
  const bytes = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
  const header = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  
  if (header.includes('Standard Jet')) return 'rsf';
  if (header.startsWith('TCDB')) return 'tcdb';
  // Excel: PK header (ZIP)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return 'excel';
  return 'unknown';
}

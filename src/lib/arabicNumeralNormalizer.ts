/**
 * ════════════════════════════════════════════════════════════════
 * 🔢 Arabic/Persian Numeral Normalizer
 * ════════════════════════════════════════════════════════════════
 * Automatically converts Arabic (٠-٩) and Persian (۰-۹) numerals
 * to English (0-9) in all input fields across the application.
 * 
 * Covers:
 *   ✅ Arabic-Indic  : ٠١٢٣٤٥٦٧٨٩
 *   ✅ Persian/Urdu  : ۰۱۲۳۴۵۶۷۸۹
 *   ✅ Arabic decimal: ٫  → .
 *   ✅ Arabic thousand: ٬ → ,
 *   ✅ Works on: type=text, number, tel, search, textarea
 *   ✅ Works on: keyboard typing AND paste
 *   ✅ Safe for React (uses native input setter to trigger synthetic events)
 *   ✅ Preserves cursor position (for text inputs; skips for type=number)
 * 
 * Usage: Call `initArabicNumeralNormalizer()` once in App.tsx
 */

// Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩  (U+0660–U+0669)
// Extended Arabic-Indic (Persian/Urdu): ۰۱۲۳۴۵۶۷۸۹ (U+06F0–U+06F9)

const ARABIC_NUMERALS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_NUMERALS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Convert Arabic/Persian numerals to English (pure utility — no DOM)
 */
export function normalizeNumerals(str: string): string {
    if (!str) return str;
    let result = str;
    for (let i = 0; i < 10; i++) {
        result = result
            .replace(new RegExp(ARABIC_NUMERALS[i], 'g'), String(i))
            .replace(new RegExp(PERSIAN_NUMERALS[i], 'g'), String(i));
    }
    // Arabic decimal separator (٫) → dot
    result = result.replace(/٫/g, '.');
    // Arabic thousands separator (٬) → comma
    result = result.replace(/٬/g, ',');
    return result;
}

/**
 * Check if string contains any Arabic/Persian numerals or separators
 */
function containsArabicNumerals(str: string): boolean {
    return /[\u0660-\u0669\u06F0-\u06F9\u066B\u066C]/.test(str);
}

/**
 * Supported input types (subset that allows text value read/write)
 */
const SUPPORTED_TYPES = new Set(['text', 'number', 'tel', 'search', 'url', 'email', 'password', '']);

/**
 * Apply normalization to a single input/textarea element.
 * Returns true if the value was changed.
 */
function applyToElement(target: HTMLInputElement | HTMLTextAreaElement): boolean {
    const value = target.value;
    if (!value || !containsArabicNumerals(value)) return false;

    const normalized = normalizeNumerals(value);
    if (normalized === value) return false;

    // Preserve cursor position (only supported on non-number inputs)
    const isNumber = (target as HTMLInputElement).type === 'number';
    const cursorPos = isNumber ? null : target.selectionStart;

    // Use native prototype setter to bypass React's synthetic event tracking
    // This is the proper React-compatible way to programmatically change input values
    const proto = target.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    if (nativeSetter) {
        nativeSetter.call(target, normalized);
    } else {
        target.value = normalized;
    }

    // Dispatch both 'input' and 'change' so React and all listeners pick it up
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));

    // Restore cursor (safe — only for text-like inputs)
    if (!isNumber && cursorPos !== null) {
        try {
            target.setSelectionRange(cursorPos, cursorPos);
        } catch {
            // setSelectionRange not supported on this input type — ignore
        }
    }

    return true;
}

/**
 * Initialize global Arabic numeral normalizer.
 * Listens to `input` (keyboard) and `paste` events on document.
 * Returns a cleanup function to remove listeners.
 */
export function initArabicNumeralNormalizer(): () => void {
    // ─── Input handler (keyboard typing) ────────────────────────────────────
    const onInput = (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (!target) return;

        const tag = target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;

        const inputType = (target as HTMLInputElement).type;
        if (!SUPPORTED_TYPES.has(inputType)) return;

        applyToElement(target);
    };

    // ─── Paste handler (preserves intent when user pastes Arabic numerals) ──
    const onPaste = (e: ClipboardEvent) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (!target) return;

        const tag = target.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;

        const inputType = (target as HTMLInputElement).type;
        if (!SUPPORTED_TYPES.has(inputType)) return;

        const pasted = e.clipboardData?.getData('text') || '';
        if (!containsArabicNumerals(pasted)) return;

        // Let the paste happen first, then normalize
        setTimeout(() => applyToElement(target), 0);
    };

    // Capture phase (true) ensures we run before React for both events
    document.addEventListener('input', onInput, true);
    document.addEventListener('paste', onPaste, true);

    return () => {
        document.removeEventListener('input', onInput, true);
        document.removeEventListener('paste', onPaste, true);
    };
}

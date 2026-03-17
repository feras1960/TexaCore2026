"""
i18n Sync & Translate Script
=============================
Syncs all translation files to match the English (en.json) structure.
- Preserves existing translations where the key path matches.
- Auto-translates missing keys using Google Translate (via deep-translator).
- Removes orphan/extra keys not present in en.json.
- Processes in batches to avoid rate-limiting.

Usage:
    python scripts/translation-health/sync-translations.py                # Sync all languages
    python scripts/translation-health/sync-translations.py --lang de ro   # Sync specific languages
    python scripts/translation-health/sync-translations.py --dry-run      # Preview without writing

Requirements:
    pip install deep-translator
"""

import json
import os
import sys
import time
import argparse
from deep_translator import GoogleTranslator

# ============================================
# Configuration
# ============================================
LOCALES_DIR = 'src/i18n/locales'
BASE_LANG = 'en'
BATCH_SIZE = 40          # Keys to translate per batch
BATCH_DELAY = 1.5        # Seconds to wait between batches (rate-limit safety)
SKIP_FILES = ['wizard-ar', 'wizard-en']  # Files to skip

# Language code mapping (file name -> Google Translate code)
LANG_MAP = {
    'ar': 'ar',
    'de': 'de',
    'fr': 'fr',
    'it': 'it',
    'no': 'no',
    'pl': 'pl',
    'ro': 'ro',
    'ru': 'ru',
    'tr': 'tr',
    'uk': 'uk',
}

# ============================================
# Helpers
# ============================================

def flatten_dict(d, parent_key='', sep='.'):
    """Flatten a nested dict into dot-notation keys."""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def unflatten_dict(flat_dict, sep='.'):
    """Unflatten a dot-notation dict back into nested structure."""
    result = {}
    for key, value in flat_dict.items():
        parts = key.split(sep)
        d = result
        for part in parts[:-1]:
            if part not in d:
                d[part] = {}
            d = d[part]
        d[parts[-1]] = value
    return result


def translate_batch(texts, source='en', target='ar'):
    """Translate a list of texts using Google Translate."""
    if not texts:
        return []
    try:
        translator = GoogleTranslator(source=source, target=target)
        results = translator.translate_batch(texts)
        return results
    except Exception as e:
        print(f"    ⚠️  Translation error: {e}")
        return texts  # Return originals on failure


def is_translatable(value):
    """Check if a value should be translated (skip placeholders, URLs, etc.)."""
    if not isinstance(value, str):
        return False
    # Skip very short strings (likely codes or symbols)
    if len(value) <= 2:
        return False
    # Skip strings that are purely numbers/symbols
    if value.replace(' ', '').replace('.', '').replace(',', '').isdigit():
        return False
    # Skip URLs
    if value.startswith('http://') or value.startswith('https://'):
        return False
    # Skip template-only strings like "{{count}}"
    stripped = value.replace('{{', '').replace('}}', '').strip()
    if not stripped or stripped.replace('_', '').replace(' ', '').isalnum() and len(stripped) < 3:
        return False
    return True


# ============================================
# Main Sync Logic
# ============================================

def sync_language(base_flat, target_file, lang_code, google_code, dry_run=False):
    """Sync a single language file against the English baseline."""
    print(f"\n{'='*60}")
    print(f"  Processing: {lang_code.upper()} ({target_file})")
    print(f"{'='*60}")

    # Load existing translations
    existing_flat = {}
    if os.path.exists(target_file):
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            existing_flat = flatten_dict(existing)
        except Exception as e:
            print(f"  ⚠️  Error loading existing file: {e}")
            existing_flat = {}

    # Build the synced file
    synced_flat = {}
    keys_to_translate = []
    keys_for_translation = []

    for key, en_value in base_flat.items():
        if key in existing_flat:
            existing_val = existing_flat[key]
            # Keep existing translation IF it differs from English (i.e., it's actually translated)
            # OR if the value is not translatable (short codes, etc.)
            if existing_val != en_value or not is_translatable(en_value):
                synced_flat[key] = existing_val
            else:
                # Value matches English — needs translation
                keys_to_translate.append(key)
                keys_for_translation.append(en_value)
        else:
            # Missing key — needs translation
            if is_translatable(en_value):
                keys_to_translate.append(key)
                keys_for_translation.append(en_value)
            else:
                # Non-translatable (short code, number, etc.) — keep English
                synced_flat[key] = en_value

    # Stats
    kept = len(synced_flat)
    to_translate = len(keys_to_translate)
    removed = len(set(existing_flat.keys()) - set(base_flat.keys()))

    print(f"  ✅ Kept existing translations: {kept}")
    print(f"  🔄 Keys to translate: {to_translate}")
    print(f"  🗑️  Orphan keys removed: {removed}")

    if dry_run:
        print(f"  📋 DRY RUN — no files written.")
        return

    # Translate in batches
    if to_translate > 0:
        print(f"  🌐 Translating {to_translate} keys to {google_code}...")
        translated_values = []

        for i in range(0, len(keys_for_translation), BATCH_SIZE):
            batch = keys_for_translation[i:i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(keys_for_translation) + BATCH_SIZE - 1) // BATCH_SIZE
            print(f"    📦 Batch {batch_num}/{total_batches} ({len(batch)} keys)...", end=' ', flush=True)

            results = translate_batch(batch, source='en', target=google_code)
            translated_values.extend(results)
            print("done")

            if i + BATCH_SIZE < len(keys_for_translation):
                time.sleep(BATCH_DELAY)

        # Merge translated values
        for key, translated in zip(keys_to_translate, translated_values):
            if translated and isinstance(translated, str):
                synced_flat[key] = translated
            else:
                synced_flat[key] = base_flat[key]  # Fallback to English

    # Unflatten back to nested structure
    synced_nested = unflatten_dict(synced_flat)

    # Write the synced file
    with open(target_file, 'w', encoding='utf-8') as f:
        json.dump(synced_nested, f, ensure_ascii=False, indent=2)

    print(f"  💾 Written to {target_file}")
    print(f"  📊 Final key count: {len(synced_flat)}")


def main():
    parser = argparse.ArgumentParser(description='Sync and translate i18n files')
    parser.add_argument('--lang', nargs='*', help='Specific languages to sync (e.g., de ro)')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing files')
    args = parser.parse_args()

    # Load base language
    base_file = os.path.join(LOCALES_DIR, f'{BASE_LANG}.json')
    if not os.path.exists(base_file):
        print(f"❌ Base language file not found: {base_file}")
        sys.exit(1)

    with open(base_file, 'r', encoding='utf-8') as f:
        base_data = json.load(f)
    base_flat = flatten_dict(base_data)

    print(f"🌍 i18n Sync & Translate")
    print(f"   Base: {BASE_LANG.upper()} ({len(base_flat)} keys)")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'LIVE (will write files)'}")

    # Determine which languages to process
    if args.lang:
        target_langs = {k: v for k, v in LANG_MAP.items() if k in args.lang}
    else:
        target_langs = LANG_MAP

    if not target_langs:
        print("❌ No valid target languages found.")
        sys.exit(1)

    print(f"   Targets: {', '.join(k.upper() for k in target_langs.keys())}")

    for lang_code, google_code in target_langs.items():
        if lang_code in SKIP_FILES:
            continue
        target_file = os.path.join(LOCALES_DIR, f'{lang_code}.json')
        sync_language(base_flat, target_file, lang_code, google_code, dry_run=args.dry_run)

    print(f"\n{'='*60}")
    print(f"  ✅ All done!")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()

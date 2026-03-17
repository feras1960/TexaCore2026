# 🩺 Translation Health Toolkit

One tool to manage all i18n translation files.

## Commands

```bash
# Interactive — check health, see diagnosis, fix with confirmation
npm run i18n:doctor

# Check only — no prompts, CI-friendly (exits 1 if critical issues)
npm run i18n:check

# Auto-fix — no prompts, fixes everything
npm run i18n:fix

# Fix specific languages only
npm run i18n:fix -- --lang de fr
```

## What It Does

1. **Checks structure** — all locale files have the same keys as `en.json`
2. **Checks quality** — finds empty values and untranslated text
3. **Diagnoses problems** — explains each issue with severity and examples
4. **Fixes issues** — calls `sync-translations.py` to sync keys and auto-translate via Google Translate

## Files

| File | Purpose |
|------|---------|
| `i18n-doctor.cjs` | Interactive CLI — the orchestrator |
| `sync-translations.py` | Backend fixer — syncs keys & translates |

## Requirements

- **Node.js** (for the doctor)
- **Python 3 + deep-translator** (for auto-fix/translation)

```bash
pip install deep-translator
```

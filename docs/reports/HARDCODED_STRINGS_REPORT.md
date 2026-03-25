# 🔤 Hardcoded Arabic Strings Report

**Generated:** 2026-02-04

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| High Priority (>10 strings) | 2 files | 🔴 High |
| Medium Priority (3-10 strings) | 1 file | 🟡 Medium |
| Low Priority (1-2 strings) | 12 files | 🟢 Low |

---

## High Priority Files

### 1. `src/features/accounting/COAAuditPage.tsx` (38 strings)
This is an audit/debug page - may be intentional for development.

### 2. `src/features/accounting/components/EntryActionToolbar.tsx` (10 strings)
Should be converted to translation keys.

---

## Medium Priority Files

### 3. `src/features/accounting/components/JournalEntryForm.tsx` (7 strings)
Form labels should use `t()` function.

---

## Recommended Actions

1. **Create translation keys** for frequently used strings:
   - `accounting.audit.*` namespace for COAAuditPage
   - `accounting.entry.*` namespace for EntryActionToolbar
   - `accounting.form.*` namespace for JournalEntryForm

2. **Pattern to follow:**
   ```tsx
   // Before (hardcoded)
   <th>الكود</th>
   
   // After (translated)
   <th>{t('accounting.code')}</th>
   ```

3. **Add these keys to locales:**
   - `src/locales/ar.ts`
   - `src/locales/en.ts`

---

## Files to Fix (Low Priority)

| File | Strings | Type |
|------|---------|------|
| App.test.tsx | 2 | Test file (skip) |
| Shipments.tsx | 1 | Placeholder page |
| Settings.tsx | 1 | Single label |
| Restaurant.tsx | 1 | Placeholder |
| Pharmacy.tsx | 1 | Placeholder |
| Healthcare.tsx | 1 | Placeholder |
| Gold.tsx | 1 | Placeholder |
| Fabrics.tsx | 1 | Placeholder |
| Doctors.tsx | 1 | Placeholder |
| AccountDetailsSheet.tsx | 1 | Single label |
| CostCentersList.tsx | 1 | Single label |

---

## Estimated Effort

- **High Priority:** ~2 hours
- **Medium Priority:** ~1 hour
- **Low Priority:** ~30 minutes

**Total:** ~3.5 hours

# 📁 Migrations Archive

This folder contains SQL files that have been executed and are kept for reference.

## 📂 Folder Structure

```
_archive/
├── diagnostics/      # DIAG_*.sql - Diagnostic queries
├── fixes/            # FIX_*.sql - Bug fixes and patches
├── steps/            # STEP_*.sql - Step-by-step migrations
├── testing/          # TEST_*.sql, VERIFY_*.sql - Testing scripts
├── security/         # AUDIT_*.sql, SECURITY_*.sql - Security audits
├── setup/            # SETUP_*.sql - Initial setup scripts
└── enhancements/     # ENHANCE_*.sql - Feature enhancements
```

## ⚠️ Important Notes

1. These files have already been executed on the database
2. Do NOT run these files again without reviewing first
3. Core migrations (00001-00023) remain in the root folder
4. Date-prefixed files (20260131_*) are also in root

## 📊 Archive Summary

| Category     | Count | Description |
|--------------|-------|-------------|
| Diagnostics  | 16+   | DB health checks, structure queries |
| Fixes        | 7+    | Bug fixes, constraint repairs |
| Steps        | 78+   | Feature implementations |
| Testing      | 4+    | Verification scripts |
| Security     | 14+   | RLS policies, audit scripts |
| Setup        | 3+    | Initial configuration |
| Enhancements | 3+    | Feature improvements |

---

**Archived on:** 2026-02-04

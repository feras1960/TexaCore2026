#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# TexaCore — Apply app migrations on first DB init
# ═══════════════════════════════════════════════════════════════
# This script runs ONCE when PostgreSQL initializes for the first time.
# It applies all migrations from /app-migrations/ in alphabetical order.
# On subsequent starts, PostgreSQL uses the existing data volume.

set -e

MIGRATION_DIR="/app-migrations"
MIGRATION_LOG="/var/lib/postgresql/data/.migrations_applied"

# Skip if already applied (container restart)
if [ -f "$MIGRATION_LOG" ]; then
    echo "✅ [TexaCore] Migrations already applied — skipping."
    exit 0
fi

echo "🚀 [TexaCore] Applying app migrations..."
echo "📁 Found $(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | wc -l) migration files"

APPLIED=0
FAILED=0

for f in $MIGRATION_DIR/*.sql; do
    if [ -f "$f" ]; then
        BASENAME=$(basename "$f")
        echo -n "  📄 $BASENAME ... "
        
        if psql -v ON_ERROR_STOP=0 \
               -U postgres \
               -d postgres \
               -f "$f" > /dev/null 2>&1; then
            echo "✅"
            APPLIED=$((APPLIED + 1))
        else
            echo "⚠️ (non-fatal error, continuing)"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "════════════════════════════════════════"
echo "✅ [TexaCore] Migration complete!"
echo "   Applied: $APPLIED"
echo "   Warnings: $FAILED"
echo "════════════════════════════════════════"

# Mark as done so we don't re-run on container restart
date > "$MIGRATION_LOG"

#!/bin/sh
# ════════════════════════════════════════════════════════════════
# 🗄️ TexaCore — Automated Backup Script
# ════════════════════════════════════════════════════════════════

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="${BACKUP_DIR}/texacore_${DATE}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

echo "[$(date)] 🗄️ Starting backup..."

# Create backup
pg_dump -Fc --no-owner --no-privileges | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✅ Backup completed: $BACKUP_FILE ($SIZE)"
    
    # Cleanup old backups
    DELETED=$(find "$BACKUP_DIR" -name "texacore_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
    if [ "$DELETED" -gt 0 ]; then
        echo "[$(date)] 🧹 Cleaned up $DELETED old backup(s)"
    fi
else
    echo "[$(date)] ❌ Backup FAILED!"
fi

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 💾 سكريبت النسخ الاحتياطي
# Database Backup Script
# ═══════════════════════════════════════════════════════════════════════════

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# أنشئ مجلد النسخ الاحتياطية
mkdir -p "$BACKUP_DIR"

# اقرأ متغيرات البيئة
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ ملف .env.local غير موجود!"
    exit 1
fi

# تحقق من وجود DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL غير معرّف في .env.local"
    exit 1
fi

echo "💾 جاري إنشاء نسخة احتياطية..."
echo "📁 الملف: $BACKUP_FILE"
echo ""

# أنشئ النسخة الاحتياطية
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ تم إنشاء النسخة الاحتياطية بنجاح!"
    echo "📊 الحجم: $FILE_SIZE"
    echo "📍 المسار: $BACKUP_FILE"
    
    # احتفظ بآخر 10 نسخ فقط
    echo ""
    echo "🧹 تنظيف النسخ القديمة..."
    ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs -r rm
    
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l)
    echo "📦 عدد النسخ المحفوظة: $BACKUP_COUNT"
else
    echo "❌ فشل إنشاء النسخة الاحتياطية"
    exit 1
fi

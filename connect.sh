#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🔌 سكريبت الاتصال بقاعدة البيانات
# Database Connection Script
# ═══════════════════════════════════════════════════════════════════════════

# اقرأ متغيرات البيئة
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ ملف .env.local غير موجود!"
    echo "💡 أنشئ الملف أولاً:"
    echo '   echo "DATABASE_URL=your-connection-string" > .env.local'
    exit 1
fi

# تحقق من وجود DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL غير معرّف في .env.local"
    exit 1
fi

echo "🔌 جاري الاتصال بقاعدة البيانات..."
echo ""

# اتصل بقاعدة البيانات
psql "$DATABASE_URL"

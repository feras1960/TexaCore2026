#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 📄 سكريبت تنفيذ ملفات SQL
# Run SQL Files Script
# ═══════════════════════════════════════════════════════════════════════════

# تحقق من وجود ملف SQL
if [ -z "$1" ]; then
    echo "❌ الرجاء تحديد ملف SQL"
    echo "💡 الاستخدام: ./run.sh <sql_file>"
    echo ""
    echo "📝 أمثلة:"
    echo "   ./run.sh test_step_48.sql"
    echo "   ./run.sh supabase/migrations/STEP_48_ecommerce_functions.sql"
    exit 1
fi

SQL_FILE="$1"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ الملف غير موجود: $SQL_FILE"
    exit 1
fi

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

echo "▶️  تنفيذ: $SQL_FILE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# نفّذ الملف
psql "$DATABASE_URL" -f "$SQL_FILE"

EXIT_CODE=$?

echo ""
echo "════════════════════════════════════════════════════════════════"

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ تم التنفيذ بنجاح!"
else
    echo "❌ حدث خطأ أثناء التنفيذ (Exit Code: $EXIT_CODE)"
fi

exit $EXIT_CODE

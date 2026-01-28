#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🔧 سكريبت إعداد الاتصال التفاعلي
# Interactive Setup Script
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔧 إعداد الاتصال بقاعدة البيانات"
echo "Database Connection Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# تحقق من وجود .env.local
if [ -f .env.local ]; then
    echo "⚠️  ملف .env.local موجود بالفعل!"
    echo ""
    read -p "هل تريد استبداله؟ (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ تم الإلغاء"
        exit 0
    fi
fi

echo ""
echo "📋 اتبع الخطوات التالية:"
echo ""
echo "1️⃣  افتح Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2️⃣  اختر مشروعك → Settings → Database"
echo ""
echo "3️⃣  انسخ Connection string من قسم 'Connection pooling'"
echo "   (يجب أن يبدأ بـ: postgresql://postgres...)"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

read -p "📎 الصق Connection String هنا: " connection_string

# تحقق من أن المدخل ليس فارغاً
if [ -z "$connection_string" ]; then
    echo ""
    echo "❌ خطأ: Connection string فارغ!"
    exit 1
fi

# تحقق من أنه يبدأ بـ postgresql://
if [[ ! "$connection_string" =~ ^postgresql:// ]]; then
    echo ""
    echo "❌ خطأ: Connection string غير صحيح!"
    echo "💡 يجب أن يبدأ بـ: postgresql://"
    exit 1
fi

# احفظ في .env.local
echo "DATABASE_URL=\"$connection_string\"" > .env.local

echo ""
echo "✅ تم حفظ الإعدادات في .env.local"
echo ""

# اختبر الاتصال
echo "🧪 اختبار الاتصال..."
echo ""

if command -v psql &> /dev/null; then
    export $(cat .env.local | xargs)
    
    if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
        echo "✅ الاتصال ناجح!"
        echo ""
        echo "🎉 يمكنك الآن استخدام:"
        echo "   ./connect.sh   - للاتصال بالقاعدة"
        echo "   ./run.sh       - لتنفيذ ملف SQL"
        echo "   ./test.sh      - لتشغيل الاختبارات"
        echo "   ./backup.sh    - للنسخ الاحتياطي"
    else
        echo "❌ فشل الاتصال!"
        echo ""
        echo "💡 تحقق من:"
        echo "   1. كلمة المرور صحيحة"
        echo "   2. Connection string كامل"
        echo "   3. الاتصال بالإنترنت"
        echo ""
        echo "🔍 للمزيد من المساعدة:"
        echo "   cat SETUP_CONNECTION_STEP_BY_STEP.md"
    fi
else
    echo "⚠️  psql غير مثبت!"
    echo ""
    echo "💡 ثبّت PostgreSQL CLI أولاً:"
    echo "   brew install postgresql@16"
    echo ""
    echo "ثم جرّب الاتصال:"
    echo "   ./connect.sh"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"

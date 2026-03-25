#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🔌 إعداد الاتصال التلقائي - باستخدام معلومات المشروع
# Automatic Connection Setup - Using Project Info
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔌 إعداد الاتصال بقاعدة البيانات"
echo "   Database Connection Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# معلومات المشروع من Supabase
PROJECT_REF="wzkklenfsaepegymfxfz"
PROJECT_NAME="TexaCore ERP"
REGION="eu-west-2"  # West Europe (London)

echo "📋 معلومات المشروع:"
echo "   الاسم: $PROJECT_NAME"
echo "   المنطقة: London (West Europe)"
echo "   Project Ref: $PROJECT_REF"
echo ""

# التحقق من وجود .env.local
if [ -f .env.local ]; then
    echo "⚠️  ملف .env.local موجود بالفعل"
    echo ""
    read -p "هل تريد استبداله؟ (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ تم الإلغاء - الملف الحالي محفوظ"
        exit 0
    fi
    
    # نسخة احتياطية
    cp .env.local .env.local.backup
    echo "📦 تم حفظ نسخة احتياطية: .env.local.backup"
    echo ""
fi

echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "🔑 الآن نحتاج فقط كلمة مرور قاعدة البيانات"
echo ""
echo "💡 للحصول على كلمة المرور:"
echo "   1. في Supabase Dashboard (المفتوح عندك)"
echo "   2. ابحث عن 'Database password' في أعلى الصفحة"
echo "   3. أو اضغط 'Reset database password' إذا نسيتها"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# طلب كلمة المرور فقط
read -s -p "أدخل كلمة مرور قاعدة البيانات: " db_password
echo ""

# التحقق
if [ -z "$db_password" ]; then
    echo ""
    echo "❌ خطأ: كلمة المرور فارغة"
    exit 1
fi

# بناء Connection String
CONNECTION_STRING="postgresql://postgres.${PROJECT_REF}:${db_password}@aws-0-${REGION}.pooler.supabase.com:6543/postgres?sslmode=require"

# حفظ في .env.local
echo "DATABASE_URL=\"$CONNECTION_STRING\"" > .env.local

echo ""
echo "✅ تم حفظ Connection String في .env.local"
echo ""

# اختبار الاتصال
echo "🧪 اختبار الاتصال..."
echo ""

# تحميل DATABASE_URL
source .env.local

# محاولة الاتصال
if psql "$DATABASE_URL" -c "SELECT 'Connection successful!' as status, current_database() as database, current_user as user;" 2>/dev/null; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "✅ نجح الاتصال! كل شيء جاهز!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "🎯 يمكنك الآن استخدام:"
    echo ""
    echo "   ./connect.sh              - الاتصال بالقاعدة"
    echo "   ./run.sh file.sql         - تنفيذ ملف SQL"
    echo "   ./test.sh                 - تشغيل الاختبارات"
    echo "   ./backup.sh               - نسخة احتياطية"
    echo ""
else
    echo ""
    echo "❌ فشل الاتصال"
    echo ""
    echo "🔍 تحقق من:"
    echo "   - كلمة المرور صحيحة"
    echo "   - الإنترنت متصل"
    echo ""
    echo "💡 جرّب مرة أخرى:"
    echo "   ./setup_connection_auto.sh"
    echo ""
    exit 1
fi

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🔌 إعداد الاتصال - نسخة مبسطة
# Simple Connection Setup
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔌 إعداد الاتصال بقاعدة البيانات"
echo "   Database Connection Setup"
echo "═══════════════════════════════════════════════════════════════"
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
fi

echo ""
echo "📝 احصل على Connection String من Supabase:"
echo ""
echo "   1. افتح: https://supabase.com/dashboard"
echo "   2. اختر مشروعك"
echo "   3. Settings → Database"
echo "   4. Connection Pooling → Connection string"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "💡 يجب أن يبدأ بـ: postgresql://postgres."
echo ""

# طلب Connection String
read -p "الصق Connection String هنا: " connection_string

# التحقق
if [[ ! "$connection_string" =~ ^postgresql:// ]]; then
    echo ""
    echo "❌ خطأ: يجب أن يبدأ بـ postgresql://"
    exit 1
fi

# حفظ في .env.local
echo "DATABASE_URL=\"$connection_string\"" > .env.local

echo ""
echo "✅ تم حفظ Connection String في .env.local"
echo ""

# اختبار الاتصال
echo "🧪 اختبار الاتصال..."
echo ""

# تحميل DATABASE_URL
source .env.local

# محاولة الاتصال
if psql "$DATABASE_URL" -c "SELECT 'Connection successful!' as status;" 2>/dev/null; then
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
    echo "   - Connection String كامل"
    echo "   - الإنترنت متصل"
    echo ""
    echo "💡 جرّب مرة أخرى:"
    echo "   ./setup_connection_simple.sh"
    echo ""
    exit 1
fi

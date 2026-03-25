#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🔍 سكريبت للحصول على Connection String الصحيح
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 الحصول على Connection String من Supabase"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "📋 معلومات المشروع:"
echo "   المشروع: TexaCore ERP"
echo "   Project ID: wzkklenfsaepegymfxfz"
echo "   المنطقة: eu-west-2 (London)"
echo ""

echo "🌐 افتح هذا الرابط في المتصفح:"
echo ""
echo "   https://supabase.com/dashboard/project/wzkklenfsaepegymfxfz/settings/database"
echo ""

echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "📝 الخطوات:"
echo ""
echo "   1. افتح الرابط أعلاه"
echo "   2. ابحث عن قسم 'Connection string'"
echo "   3. اختر 'Transaction pooling' mode"
echo "   4. انسخ Connection String الكامل"
echo "   5. استبدل [YOUR-PASSWORD] بـ: EH7NytvJA#t/yEE"
echo "   6. الصق النتيجة النهائية هنا"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

read -p "الصق Connection String الكامل هنا: " connection_string

if [[ ! "$connection_string" =~ ^postgresql:// ]]; then
    echo ""
    echo "❌ خطأ: يجب أن يبدأ بـ postgresql://"
    exit 1
fi

# حفظ في .env.local
echo "DATABASE_URL=\"$connection_string\"" > .env.local

echo ""
echo "✅ تم حفظ Connection String"
echo ""

# اختبار
echo "🧪 اختبار الاتصال..."
source .env.local

if psql "$DATABASE_URL" -c "SELECT 'Success!' as status;" 2>/dev/null; then
    echo ""
    echo "✅ نجح الاتصال!"
else
    echo ""
    echo "❌ فشل الاتصال - تحقق من Connection String"
fi

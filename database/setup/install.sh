#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 📦 سكريبت التثبيت والإعداد الكامل
# Complete Installation & Setup Script
# ═══════════════════════════════════════════════════════════════════════════

set -e  # توقف عند أول خطأ

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📦 Texa Core - سكريبت التثبيت والإعداد الكامل"
echo "   Complete Installation & Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# الخطوة 1: التحقق من النظام
# ═══════════════════════════════════════════════════════════════════════════

echo "🔍 الخطوة 1/5: التحقق من النظام..."
echo "─────────────────────────────────────────────────────────────────"

# تحقق من macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  تحذير: هذا السكريبت مُحسّن لـ macOS"
fi

# تحقق من Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew غير مثبت"
    echo ""
    echo "💡 ثبّت Homebrew أولاً:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew مثبت"

# ═══════════════════════════════════════════════════════════════════════════
# الخطوة 2: تثبيت PostgreSQL CLI
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "🐘 الخطوة 2/5: تثبيت PostgreSQL CLI..."
echo "─────────────────────────────────────────────────────────────────"

if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo "✅ PostgreSQL CLI مثبت بالفعل (الإصدار: $PSQL_VERSION)"
else
    echo "📥 جاري تثبيت PostgreSQL..."
    
    if brew install postgresql@16; then
        echo "✅ تم تثبيت PostgreSQL بنجاح"
        
        # أضف إلى PATH
        if [[ ":$PATH:" != *":/opt/homebrew/opt/postgresql@16/bin:"* ]]; then
            echo ""
            echo "📝 إضافة PostgreSQL إلى PATH..."
            echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
            export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
            echo "✅ تمت الإضافة إلى ~/.zshrc"
        fi
    else
        echo "❌ فشل تثبيت PostgreSQL"
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# الخطوة 3: تثبيت Supabase CLI (اختياري)
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "🚀 الخطوة 3/5: تثبيت Supabase CLI (اختياري)..."
echo "─────────────────────────────────────────────────────────────────"

if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version)
    echo "✅ Supabase CLI مثبت بالفعل ($SUPABASE_VERSION)"
else
    read -p "هل تريد تثبيت Supabase CLI؟ (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📥 جاري تثبيت Supabase CLI..."
        
        if brew install supabase/tap/supabase; then
            echo "✅ تم تثبيت Supabase CLI بنجاح"
        else
            echo "⚠️  فشل التثبيت (لكن ليس ضرورياً)"
        fi
    else
        echo "⏭️  تم تخطي Supabase CLI"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# الخطوة 4: التحقق من السكريبتات
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "🔧 الخطوة 4/5: التحقق من السكريبتات..."
echo "─────────────────────────────────────────────────────────────────"

# قائمة السكريبتات المطلوبة
SCRIPTS=("connect.sh" "run.sh" "test.sh" "backup.sh" "setup_connection.sh")

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "✅ $script جاهز"
    else
        echo "❌ $script غير موجود"
    fi
done

# ═══════════════════════════════════════════════════════════════════════════
# الخطوة 5: إعداد الاتصال بقاعدة البيانات
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "🔌 الخطوة 5/5: إعداد الاتصال بقاعدة البيانات..."
echo "─────────────────────────────────────────────────────────────────"

if [ -f .env.local ]; then
    echo "✅ ملف .env.local موجود بالفعل"
    
    read -p "هل تريد إعادة إعداد الاتصال؟ (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./setup_connection.sh
    else
        echo "⏭️  تم تخطي إعداد الاتصال"
    fi
else
    echo "📝 إعداد الاتصال بقاعدة البيانات..."
    echo ""
    
    read -p "هل تريد إعداد الاتصال الآن؟ (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./setup_connection.sh
    else
        echo ""
        echo "⏭️  يمكنك إعداد الاتصال لاحقاً بتشغيل:"
        echo "   ./setup_connection.sh"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# الخلاصة
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ اكتمل التثبيت بنجاح!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 ملخص ما تم تثبيته:"
echo ""

if command -v psql &> /dev/null; then
    echo "   ✅ PostgreSQL CLI - $(psql --version | awk '{print $3}')"
else
    echo "   ❌ PostgreSQL CLI - غير مثبت"
fi

if command -v supabase &> /dev/null; then
    echo "   ✅ Supabase CLI - $(supabase --version)"
else
    echo "   ⏭️  Supabase CLI - غير مثبت (اختياري)"
fi

if [ -f .env.local ]; then
    echo "   ✅ إعدادات الاتصال - جاهزة"
else
    echo "   ⏭️  إعدادات الاتصال - يجب إعدادها"
fi

echo ""
echo "🎯 الأوامر المتاحة:"
echo ""
echo "   ./connect.sh                 - الاتصال بالقاعدة"
echo "   ./run.sh <file.sql>          - تنفيذ ملف SQL"
echo "   ./test.sh                    - تشغيل الاختبارات"
echo "   ./backup.sh                  - نسخة احتياطية"
echo ""
echo "📚 للمساعدة:"
echo ""
echo "   cat START_HERE_CLI.md                     - البدء السريع"
echo "   cat SETUP_CONNECTION_STEP_BY_STEP.md      - دليل الإعداد"
echo "   cat CLI_DATABASE_CONNECTION_GUIDE.md      - الدليل الكامل"
echo ""

if [ ! -f .env.local ]; then
    echo "⚠️  تذكير: يجب إعداد الاتصال أولاً:"
    echo "   ./setup_connection.sh"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 جاهز للاستخدام!"
echo "═══════════════════════════════════════════════════════════════"
echo ""

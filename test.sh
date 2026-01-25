#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# 🧪 سكريبت تشغيل جميع الاختبارات
# Run All Tests Script
# ═══════════════════════════════════════════════════════════════════════════

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

echo "🧪 تشغيل جميع الاختبارات..."
echo "════════════════════════════════════════════════════════════════"
echo ""

PASSED=0
FAILED=0

# اختبارات الهيكل
echo "📦 1. اختبارات الهيكل (Schema Tests)"
echo "─────────────────────────────────────────────────────────────────"

for file in test_step_*.sql; do
    if [[ "$file" != *"functional"* ]] && [ -f "$file" ]; then
        echo "▶️  $file"
        
        if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
            echo "   ✅ نجح"
            ((PASSED++))
        else
            echo "   ❌ فشل"
            ((FAILED++))
        fi
        echo ""
    fi
done

# اختبارات وظيفية
echo ""
echo "⚙️  2. اختبارات وظيفية (Functional Tests)"
echo "─────────────────────────────────────────────────────────────────"

for file in test_step_*_functional.sql; do
    if [ -f "$file" ]; then
        echo "▶️  $file"
        
        if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
            echo "   ✅ نجح"
            ((PASSED++))
        else
            echo "   ❌ فشل"
            ((FAILED++))
        fi
        echo ""
    fi
done

# اختبار شامل
echo ""
echo "🔍 3. الفحص الشامل (Comprehensive Check)"
echo "─────────────────────────────────────────────────────────────────"

if [ -f "comprehensive_database_check.sql" ]; then
    echo "▶️  comprehensive_database_check.sql"
    
    if psql "$DATABASE_URL" -f "comprehensive_database_check.sql" > /dev/null 2>&1; then
        echo "   ✅ نجح"
        ((PASSED++))
    else
        echo "   ❌ فشل"
        ((FAILED++))
    fi
fi

# النتيجة النهائية
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "📊 النتيجة النهائية:"
echo "   ✅ نجح: $PASSED"
echo "   ❌ فشل: $FAILED"
echo "   📈 المجموع: $((PASSED + FAILED))"
echo "════════════════════════════════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
    echo "🎉 جميع الاختبارات نجحت!"
    exit 0
else
    echo "⚠️  بعض الاختبارات فشلت"
    exit 1
fi

#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# MCP Setup Script - تثبيت وإعداد MCP تلقائياً
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  🚀 MCP Setup - إعداد الاتصال المباشر بـ Supabase"
echo "════════════════════════════════════════════════════════════"
echo ""

# ────────────────────────────────────────────────────────────────
# 1. التحقق من المتطلبات
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}📋 التحقق من المتطلبات...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js غير مثبت!${NC}"
    echo "قم بتثبيت Node.js من: https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm غير مثبت!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
echo ""

# ────────────────────────────────────────────────────────────────
# 2. تثبيت MCP Server
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}📦 تثبيت @modelcontextprotocol/server-postgres...${NC}"

if npm list -g @modelcontextprotocol/server-postgres &> /dev/null; then
    echo -e "${GREEN}✅ MCP Server مثبت مسبقاً${NC}"
else
    npm install -g @modelcontextprotocol/server-postgres
    echo -e "${GREEN}✅ تم تثبيت MCP Server بنجاح${NC}"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# 3. إنشاء ملف .env.mcp
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}📝 إعداد ملف .env.mcp...${NC}"

if [ -f ".env.mcp" ]; then
    echo -e "${YELLOW}⚠️  ملف .env.mcp موجود مسبقاً${NC}"
    read -p "هل تريد استبداله؟ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "تم التخطي..."
    else
        cp .env.mcp.template .env.mcp
        echo -e "${GREEN}✅ تم إنشاء .env.mcp من Template${NC}"
    fi
else
    cp .env.mcp.template .env.mcp
    echo -e "${GREEN}✅ تم إنشاء .env.mcp${NC}"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# 4. طلب Connection String
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}🔐 إعداد Connection String...${NC}"
echo ""
echo "احصل على Connection String من:"
echo "  1. Supabase Dashboard"
echo "  2. Settings → Database"
echo "  3. Connection string → URI"
echo ""
echo -e "${YELLOW}مثال:${NC}"
echo "  postgresql://postgres:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres"
echo ""

read -p "الصق Connection String هنا (أو اضغط Enter للتخطي): " connection_string

if [ -n "$connection_string" ]; then
    # Update .env.mcp with the connection string
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|postgresql://ai_readonly:YOUR_PASSWORD_HERE@.*|$connection_string|" .env.mcp
    else
        # Linux
        sed -i "s|postgresql://ai_readonly:YOUR_PASSWORD_HERE@.*|$connection_string|" .env.mcp
    fi
    echo -e "${GREEN}✅ تم حفظ Connection String في .env.mcp${NC}"
else
    echo -e "${YELLOW}⚠️  يجب تعديل .env.mcp يدوياً${NC}"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# 5. إنشاء ملف Cursor MCP Settings
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}⚙️  إعداد Cursor MCP Settings...${NC}"

MCP_SETTINGS_DIR="$HOME/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings"
MCP_SETTINGS_FILE="$MCP_SETTINGS_DIR/cline_mcp_settings.json"

# إنشاء المجلد إذا لم يكن موجوداً
mkdir -p "$MCP_SETTINGS_DIR"

if [ -f "$MCP_SETTINGS_FILE" ]; then
    echo -e "${YELLOW}⚠️  ملف cline_mcp_settings.json موجود مسبقاً${NC}"
    read -p "هل تريد استبداله؟ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "تم التخطي..."
    else
        create_mcp_settings=true
    fi
else
    create_mcp_settings=true
fi

if [ "$create_mcp_settings" = true ]; then
    # قراءة Connection String من .env.mcp
    db_url=$(grep "^SUPABASE_DB_URL=" .env.mcp | cut -d '=' -f2)
    
    if [ -z "$db_url" ] || [[ "$db_url" == *"YOUR_PASSWORD_HERE"* ]]; then
        echo -e "${YELLOW}⚠️  لم يتم العثور على Connection String صالح${NC}"
        echo "يجب تعديل الملف يدوياً:"
        echo "  $MCP_SETTINGS_FILE"
        db_url="postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres"
    fi
    
    # إنشاء الملف
    cat > "$MCP_SETTINGS_FILE" << EOF
{
  "mcpServers": {
    "supabase-erp": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "$db_url"
      ],
      "disabled": false
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ تم إنشاء Cursor MCP Settings${NC}"
    echo "الموقع: $MCP_SETTINGS_FILE"
fi

echo ""

# ────────────────────────────────────────────────────────────────
# 6. اختبار الاتصال
# ────────────────────────────────────────────────────────────────

echo -e "${BLUE}🧪 اختبار الاتصال...${NC}"
echo ""

db_url=$(grep "^SUPABASE_DB_URL=" .env.mcp | cut -d '=' -f2)

if [[ "$db_url" == *"YOUR_PASSWORD_HERE"* ]]; then
    echo -e "${YELLOW}⚠️  يجب تحديث Connection String أولاً${NC}"
    echo "عدّل .env.mcp وأعد تشغيل السكريبت"
else
    echo "جاري اختبار الاتصال..."
    if npx @modelcontextprotocol/server-postgres "$db_url" query "SELECT version();" &> /dev/null; then
        echo -e "${GREEN}✅ الاتصال نجح!${NC}"
        echo ""
        echo "اختبار استعلام حقيقي..."
        npx @modelcontextprotocol/server-postgres "$db_url" \
          query "SELECT code, name_ar FROM subscription_plans WHERE is_active = true LIMIT 3;" 2>/dev/null || true
    else
        echo -e "${RED}❌ فشل الاتصال${NC}"
        echo "تحقق من:"
        echo "  1. Connection String صحيح"
        echo "  2. Password صحيح"
        echo "  3. المستخدم موجود في Supabase"
    fi
fi

echo ""

# ────────────────────────────────────────────────────────────────
# 7. الخطوات النهائية
# ────────────────────────────────────────────────────────────────

echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ انتهى الإعداد!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}الخطوات النهائية:${NC}"
echo ""
echo "1. إذا لم تقم بذلك، نفّذ في Supabase SQL Editor:"
echo "   ${BLUE}create_ai_readonly_user.sql${NC}"
echo ""
echo "2. تأكد من تحديث .env.mcp بـ Connection String الصحيح"
echo ""
echo "3. أعد تشغيل Cursor:"
echo "   - احفظ كل شيء"
echo "   - أغلق Cursor بالكامل"
echo "   - أعد فتح Cursor"
echo ""
echo "4. اختبر في المحادثة:"
echo '   "تحقق من جدول subscription_plans"'
echo ""
echo -e "${GREEN}🎉 سيتمكن AI الآن من الاتصال مباشرة بقاعدة البيانات!${NC}"
echo ""

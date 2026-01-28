# 🚀 خطوات التفعيل السريع لـ MCP

## الخطوة 1: احصل على Connection String ✅

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك: `erpsystem supabase`
3. Settings → Database → Connection string
4. انسخ: **URI**

**مثال:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres
```

---

## الخطوة 2: أنشئ مستخدم للقراءة فقط (اختياري) 🔒

**في Supabase SQL Editor:**

```sql
-- نفذ الملف:
create_ai_readonly_user.sql

-- أو انسخ الأوامر الرئيسية:
CREATE USER ai_readonly WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;
```

**احفظ الـ Password!**

---

## الخطوة 3: ثبّت MCP Server 📦

```bash
npm install -g @modelcontextprotocol/server-postgres
```

**للتحقق:**
```bash
npx @modelcontextprotocol/server-postgres --version
```

---

## الخطوة 4: أعد إعدادات Cursor ⚙️

**A. أنشئ ملف الإعدادات:**

```bash
# على macOS
mkdir -p ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/

# أنشئ الملف
cat > ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json << 'EOF'
{
  "mcpServers": {
    "supabase-erp": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres"
      ],
      "disabled": false
    }
  }
}
EOF
```

**⚠️ استبدل `YOUR_PASSWORD` بالكلمة الفعلية!**

---

## الخطوة 5: أعد تشغيل Cursor 🔄

1. احفظ كل شيء
2. أغلق Cursor **بالكامل**
3. أعد فتح Cursor

---

## الخطوة 6: اختبر الاتصال ✅

**في Terminal:**

```bash
# اختبار بسيط
npx @modelcontextprotocol/server-postgres \
  "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres" \
  query "SELECT version();"

# اختبار حقيقي
npx @modelcontextprotocol/server-postgres \
  "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres" \
  query "SELECT code, name_ar FROM subscription_plans WHERE is_active = true;"
```

**النتيجة المتوقعة:**
```json
[
  {"code": "starter", "name_ar": "الباقة الأساسية"},
  {"code": "professional", "name_ar": "الباقة الاحترافية"},
  {"code": "enterprise", "name_ar": "باقة المؤسسات"}
]
```

---

## ✅ إذا نجح الاختبار:

**أخبرني في المحادثة:**
```
"تم! MCP يعمل بنجاح"
```

**وسأبدأ فوراً في:**
- ✅ التحقق من قاعدة البيانات مباشرة
- ✅ اختبار جميع الجداول
- ✅ التحقق من البنية
- ✅ توليد تقارير شاملة

**بدون أن تكون وسيطاً!** 🎉

---

## 🔧 إذا واجهت مشكلة:

### Connection refused:
- تحقق من الإنترنت
- تحقق من Connection String
- تحقق من أن المشروع نشط

### Authentication failed:
- تحقق من الـ password
- تحقق من username (ai_readonly أو postgres)

### Permission denied:
- أعد تنفيذ `create_ai_readonly_user.sql`
- تحقق من الصلاحيات:
  ```sql
  SELECT * FROM information_schema.role_table_grants 
  WHERE grantee = 'ai_readonly';
  ```

---

## 📞 تحتاج مساعدة؟

1. راجع `MCP_SETUP_GUIDE.md` للتفاصيل الكاملة
2. تحقق من Cursor Logs
3. أخبرني بالخطأ المحدد

---

**الوقت المتوقع:** 10-15 دقيقة ⏱️  
**الصعوبة:** سهل 🟢

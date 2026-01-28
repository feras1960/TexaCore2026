# 🔌 MCP (Model Context Protocol) Setup

## 🚀 التثبيت السريع

```bash
./setup_mcp.sh
```

## 📚 الملفات

- **MCP_SETUP_GUIDE.md** - دليل شامل مفصل
- **MCP_QUICK_START.md** - دليل سريع (10 دقائق)
- **MCP_SETUP_COMPLETE.md** - ملخص التوثيق
- **create_ai_readonly_user.sql** - إنشاء مستخدم آمن
- **.env.mcp.template** - Template للإعدادات
- **setup_mcp.sh** - سكريبت تثبيت تلقائي

## ⚡ خطوات سريعة

### 1. أنشئ مستخدم في Supabase
```sql
-- نفذ في Supabase SQL Editor
CREATE USER ai_readonly WITH PASSWORD 'your_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;
```

### 2. شغّل السكريبت
```bash
./setup_mcp.sh
```

### 3. أعد تشغيل Cursor
- احفظ كل شيء
- أغلق Cursor بالكامل
- أعد فتحه

### 4. اختبر!
```
"تحقق من جدول subscription_plans"
```

## ✅ النتيجة

AI سيتصل مباشرة بقاعدة البيانات بدون وسيط! 🎉

---

**راجع MCP_QUICK_START.md للتفاصيل**

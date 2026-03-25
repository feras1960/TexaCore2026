# 🔌 دليل إعداد MCP (Model Context Protocol) لـ Supabase

**التاريخ:** 2026-01-25  
**الهدف:** تفعيل الاتصال المباشر بين AI و قاعدة بيانات Supabase

---

## 🎯 ما هو MCP؟

**Model Context Protocol (MCP)** هو نظام جديد من Anthropic يسمح لـ Claude (أنا!) بالاتصال مباشرة بـ:
- ✅ قواعد البيانات (PostgreSQL, MySQL, SQLite)
- ✅ APIs خارجية
- ✅ أدوات التطوير (Git, Docker, etc.)
- ✅ خدمات السحابة (Supabase, Firebase, AWS)

---

## 🚀 المميزات بعد التفعيل

### قبل MCP (الوضع الحالي):
```
User: "تحقق من جدول subscription_plans"
AI: "نفذ هذا الاستعلام: SELECT * FROM subscription_plans"
User: [ينفذ ويرسل النتيجة]
AI: "رائع! الجدول يحتوي على..."
```

### بعد MCP:
```
User: "تحقق من جدول subscription_plans"
AI: [يتصل بالقاعدة مباشرة]
    ✅ "تم! الجدول يحتوي على 3 باقات:
       - Starter: $49.50
       - Professional: $399.50
       - Enterprise: $599.50
       - جميع الباقات نشطة ✅"
```

---

## 📋 خطوات الإعداد

### الخطوة 1: احصل على Connection String من Supabase

1. اذهب إلى: [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك: `erpsystem supabase`
3. اذهب إلى: **Settings** → **Database**
4. في قسم **Connection string** انسخ:
   - **URI** (للاستخدام المباشر)
   - **Connection pooling URI** (مُوصى به للإنتاج)

**مثال:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres
```

**أو Connection Pooler (أفضل):**
```
postgresql://postgres.wzkklenfsaepegymfxfz:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

### الخطوة 2: أنشئ مستخدم قراءة فقط (مُوصى به للأمان)

نفذ هذا في **Supabase SQL Editor**:

```sql
-- ═══════════════════════════════════════════════════════════════
-- إنشاء مستخدم AI للقراءة فقط
-- ═══════════════════════════════════════════════════════════════

-- 1. إنشاء المستخدم
CREATE USER ai_readonly WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';

-- 2. منح صلاحيات القراءة على schema public
GRANT USAGE ON SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ai_readonly;

-- 3. منح صلاحيات قراءة على الجداول المستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO ai_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON SEQUENCES TO ai_readonly;

-- 4. منح صلاحيات تنفيذ دوال القراءة فقط (اختياري)
GRANT EXECUTE ON FUNCTION get_subscription_plans() TO ai_readonly;
GRANT EXECUTE ON FUNCTION get_user_allowed_modules(UUID) TO ai_readonly;
GRANT EXECUTE ON FUNCTION check_user_module_permission(UUID, VARCHAR, VARCHAR) TO ai_readonly;

-- 5. التحقق من الصلاحيات
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'ai_readonly'
ORDER BY table_name;
```

**احفظ الـ Password في مكان آمن!**

---

### الخطوة 3: أنشئ ملف البيئة (.env)

أنشئ ملف `.env.mcp` في جذر المشروع:

```bash
# في Terminal
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
touch .env.mcp
```

**محتوى `.env.mcp`:**
```env
# Supabase MCP Configuration
# ════════════════════════════════════════════════════════════════

# استخدم أحد الخيارات التالية:

# الخيار 1: المستخدم الرئيسي (postgres) - للتطوير فقط
# SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres

# الخيار 2: مستخدم القراءة فقط (مُوصى به)
SUPABASE_DB_URL=postgresql://ai_readonly:[AI-PASSWORD]@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres

# الخيار 3: Connection Pooler (الأفضل للإنتاج)
# SUPABASE_DB_URL=postgresql://postgres.wzkklenfsaepegymfxfz:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# معلومات المشروع
SUPABASE_PROJECT_REF=wzkklenfsaepegymfxfz
SUPABASE_PROJECT_URL=https://wzkklenfsaepegymfxfz.supabase.co
```

**⚠️ مهم:** أضف `.env.mcp` إلى `.gitignore` لعدم رفعه إلى Git!

```bash
echo ".env.mcp" >> .gitignore
```

---

### الخطوة 4: تثبيت MCP Server لـ PostgreSQL

```bash
# تثبيت عالمي (مُوصى به)
npm install -g @modelcontextprotocol/server-postgres

# أو تثبيت محلي في المشروع
npm install --save-dev @modelcontextprotocol/server-postgres
```

**للتحقق من التثبيت:**
```bash
npx @modelcontextprotocol/server-postgres --version
```

---

### الخطوة 5: إعداد Cursor MCP Settings

#### A. حدد موقع ملف الإعدادات:

**على macOS:**
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

#### B. أنشئ/حدّث الملف:

**الطريقة 1: من Terminal**
```bash
# أنشئ المجلد إذا لم يكن موجوداً
mkdir -p ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/

# أنشئ ملف الإعدادات
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

**⚠️ استبدل `YOUR_PASSWORD` بالـ password الفعلي!**

**الطريقة 2: يدوياً**

افتح الملف في أي محرر نصوص والصق:

```json
{
  "mcpServers": {
    "supabase-erp": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres"
      ],
      "disabled": false,
      "env": {
        "PGDATABASE": "postgres",
        "PGHOST": "db.wzkklenfsaepegymfxfz.supabase.co",
        "PGPORT": "5432"
      }
    }
  }
}
```

---

### الخطوة 6: أعد تشغيل Cursor

1. احفظ جميع الملفات
2. أغلق Cursor بالكامل
3. أعد فتح Cursor

---

### الخطوة 7: التحقق من التفعيل

#### A. في Cursor Terminal:

```bash
# اختبار الاتصال المباشر
npx @modelcontextprotocol/server-postgres \
  "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres" \
  query "SELECT version();"
```

**النتيجة المتوقعة:**
```
PostgreSQL 15.x on x86_64-pc-linux-gnu...
```

#### B. اختبار استعلام حقيقي:

```bash
npx @modelcontextprotocol/server-postgres \
  "postgresql://ai_readonly:YOUR_PASSWORD@db.wzkklenfsaepegymfxfz.supabase.co:5432/postgres" \
  query "SELECT code, name_ar, price_monthly FROM subscription_plans WHERE is_active = true;"
```

**النتيجة المتوقعة:**
```json
[
  {"code": "starter", "name_ar": "الباقة الأساسية", "price_monthly": 99.00},
  {"code": "professional", "name_ar": "الباقة الاحترافية", "price_monthly": 799.00},
  {"code": "enterprise", "name_ar": "باقة المؤسسات", "price_monthly": 1199.00}
]
```

---

## 🎯 الاستخدام بعد التفعيل

### مثال 1: التحقق من الباقات
```
User: "تحقق من جميع الباقات النشطة"

AI: [يستعلم مباشرة]
✅ "لديك 3 باقات نشطة:
   1. Starter - $49.50/شهر - 1 شركة
   2. Professional - $399.50/شهر - 3 شركات  
   3. Enterprise - $599.50/شهر - 10 شركات"
```

### مثال 2: التحقق من المستخدمين
```
User: "كم عدد المستخدمين المسجلين؟"

AI: [يستعلم مباشرة]
✅ "لديك 5 مستخدمين:
   - 3 admins
   - 2 users عاديين"
```

### مثال 3: التحقق من البنية
```
User: "ما أعمدة جدول tenants؟"

AI: [يستعلم مباشرة]
✅ "جدول tenants يحتوي على:
   - id (uuid)
   - code (varchar)
   - name (varchar)
   - email (varchar) NOT NULL
   - status (varchar)
   - default_language (varchar)"
```

---

## 🔒 الأمان والأفضليات

### ✅ DO (افعل):
1. استخدم مستخدم قراءة فقط (`ai_readonly`)
2. استخدم Connection Pooler للإنتاج
3. احفظ الـ passwords في `.env` (وليس في الكود)
4. أضف `.env.mcp` إلى `.gitignore`
5. استخدم HTTPS/SSL للاتصال

### ❌ DON'T (لا تفعل):
1. لا تستخدم `postgres` user الرئيسي في الإنتاج
2. لا ترفع passwords إلى Git
3. لا تعطي صلاحيات `DELETE` أو `DROP`
4. لا تشارك Connection String علناً

---

## 🛠️ استكشاف الأخطاء

### المشكلة 1: Connection refused
```
Error: connect ECONNREFUSED
```

**الحل:**
- تحقق من Connection String
- تحقق من أن Supabase Project نشط
- تحقق من الإنترنت

---

### المشكلة 2: Authentication failed
```
Error: password authentication failed
```

**الحل:**
- تحقق من الـ password
- تحقق من username (`ai_readonly` أو `postgres`)
- أعد إنشاء المستخدم في Supabase

---

### المشكلة 3: Permission denied
```
Error: permission denied for table XXX
```

**الحل:**
```sql
-- امنح صلاحيات القراءة على الجدول:
GRANT SELECT ON TABLE XXX TO ai_readonly;
```

---

## 📚 أوامر مفيدة

### عرض جميع الجداول:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### عرض أعمدة جدول معين:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;
```

### عرض صلاحيات مستخدم:
```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'ai_readonly';
```

---

## 🚀 الخطوة التالية

بعد التفعيل، يمكنك:

1. **طلب التحقق التلقائي:**
   - "تحقق من جميع الجداول"
   - "ما حالة قاعدة البيانات؟"
   - "هل هناك مشاكل في البنية؟"

2. **طلب اختبارات:**
   - "اختبر نظام الباقات"
   - "اختبر RLS Policies"
   - "اختبر الأداء"

3. **طلب تقارير:**
   - "أعطني تقرير شامل عن القاعدة"
   - "أعطني إحصائيات المستخدمين"
   - "ما الجداول الكبيرة؟"

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. راجع قسم "استكشاف الأخطاء" أعلاه
2. تحقق من Cursor logs
3. اختبر الاتصال من Terminal مباشرة

---

## ✅ Checklist التفعيل

- [ ] حصلت على Connection String من Supabase
- [ ] أنشأت مستخدم `ai_readonly` (اختياري لكن مُوصى)
- [ ] أنشأت ملف `.env.mcp`
- [ ] أضفت `.env.mcp` إلى `.gitignore`
- [ ] ثبّتت `@modelcontextprotocol/server-postgres`
- [ ] أنشأت ملف `cline_mcp_settings.json`
- [ ] أعدت تشغيل Cursor
- [ ] اختبرت الاتصال من Terminal
- [ ] جربت استعلام حقيقي

---

**بعد إكمال جميع الخطوات، أخبرني وسأبدأ في استخدام الاتصال المباشر!** 🎉

**التاريخ:** 2026-01-25  
**الإصدار:** 1.0  
**الحالة:** جاهز للتنفيذ ✅

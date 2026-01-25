# 🔧 دليل الربط مع CLI لقاعدة البيانات
# Database CLI Connection Guide

---

## 📋 **المحتويات**

1. [Supabase CLI](#1-supabase-cli)
2. [PostgreSQL CLI (psql)](#2-postgresql-cli-psql)
3. [الاختصارات والأدوات](#3-الاختصارات-والأدوات)
4. [أمثلة الاستخدام](#4-أمثلة-الاستخدام)

---

## 1️⃣ **Supabase CLI**

### **التثبيت:**

```bash
# macOS (باستخدام Homebrew)
brew install supabase/tap/supabase

# أو باستخدام npm
npm install -g supabase

# التحقق من التثبيت
supabase --version
```

### **تسجيل الدخول:**

```bash
# تسجيل الدخول لـ Supabase
supabase login

# سيفتح متصفح لتسجيل الدخول
```

### **ربط المشروع:**

```bash
# في مجلد المشروع
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# ربط مع مشروع Supabase
supabase link --project-ref YOUR_PROJECT_REF

# أو استخدام Project ID من Dashboard
supabase link
```

### **الحصول على معلومات الاتصال:**

```bash
# عرض Database URL
supabase status

# عرض جميع المعلومات
supabase projects list
```

---

## 2️⃣ **PostgreSQL CLI (psql)**

### **التثبيت:**

```bash
# macOS
brew install postgresql

# التحقق من التثبيت
psql --version
```

### **الاتصال بقاعدة البيانات:**

#### **طريقة 1: باستخدام Connection String**

```bash
# احصل على Connection String من Supabase Dashboard:
# Settings → Database → Connection string (Pooler)

psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

#### **طريقة 2: باستخدام المتغيرات البيئية**

```bash
# أنشئ ملف .env في مجلد المشروع
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
EOF

# استخدم في الاتصال
source .env.local
psql $DATABASE_URL
```

#### **طريقة 3: باستخدام ملف الاتصال**

```bash
# أنشئ ملف .pgpass في المجلد الرئيسي
touch ~/.pgpass
chmod 600 ~/.pgpass

# أضف السطر التالي (استبدل بمعلوماتك):
echo "aws-0-[REGION].pooler.supabase.com:6543:postgres:postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]" >> ~/.pgpass

# الآن يمكنك الاتصال بدون كتابة كلمة المرور:
psql -h aws-0-[REGION].pooler.supabase.com -p 6543 -U postgres.[YOUR-PROJECT-REF] -d postgres
```

---

## 3️⃣ **الاختصارات والأدوات**

### **A. إنشاء Alias للاتصال السريع:**

```bash
# أضف في ملف ~/.zshrc أو ~/.bashrc
echo 'alias supadb="psql \"$DATABASE_URL\""' >> ~/.zshrc

# أعد تحميل الملف
source ~/.zshrc

# الآن يمكنك الاتصال بسرعة:
supadb
```

### **B. إنشاء سكريبت للاتصال:**

```bash
# أنشئ ملف connect_db.sh
cat > connect_db.sh << 'EOF'
#!/bin/bash

# اقرأ DATABASE_URL من .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

# اتصل بقاعدة البيانات
psql "$DATABASE_URL"
EOF

# اجعله قابل للتنفيذ
chmod +x connect_db.sh

# استخدمه:
./connect_db.sh
```

### **C. تنفيذ ملفات SQL مباشرة:**

```bash
# إنشاء سكريبت run_sql.sh
cat > run_sql.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./run_sql.sh <sql_file>"
    exit 1
fi

if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

psql "$DATABASE_URL" -f "$1"
EOF

chmod +x run_sql.sh

# استخدمه:
./run_sql.sh test_step_48.sql
```

---

## 4️⃣ **أمثلة الاستخدام**

### **A. تنفيذ Migration:**

```bash
# الطريقة 1: باستخدام psql
psql "$DATABASE_URL" -f supabase/migrations/STEP_48_ecommerce_functions.sql

# الطريقة 2: باستخدام Supabase CLI
supabase db push

# الطريقة 3: باستخدام السكريبت
./run_sql.sh supabase/migrations/STEP_48_ecommerce_functions.sql
```

### **B. تشغيل استعلام سريع:**

```bash
# عرض الجداول
psql "$DATABASE_URL" -c "\dt"

# عدد السجلات في جدول
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM customers;"

# تشغيل استعلام معقد
psql "$DATABASE_URL" -c "SELECT * FROM get_products_for_store('tenant-id', 'company-id', NULL, NULL, NULL, NULL, NULL, NULL, 'created_at', 'DESC', 10, 0);"
```

### **C. عمل Backup:**

```bash
# أنشئ سكريبت backup.sh
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

if [ -f .env.local ]; then
    export $(cat .env.local | xargs)
fi

pg_dump "$DATABASE_URL" > "$BACKUP_DIR/backup_$DATE.sql"

echo "✅ Backup created: $BACKUP_DIR/backup_$DATE.sql"
EOF

chmod +x backup.sh

# استخدمه:
./backup.sh
```

### **D. استعادة من Backup:**

```bash
# استعادة من ملف backup
psql "$DATABASE_URL" < backups/backup_20260125_120000.sql
```

---

## 🛠️ **أوامر psql المفيدة**

عند الاتصال بـ `psql`:

```sql
-- عرض جميع الجداول
\dt

-- عرض هيكل جدول
\d customers

-- عرض جميع الدوال
\df

-- عرض معلومات دالة محددة
\df+ get_products_for_store

-- عرض جميع الـ Views
\dv

-- عرض حجم قاعدة البيانات
\l+

-- الخروج
\q

-- تنفيذ ملف SQL
\i test_step_48.sql

-- تفعيل/تعطيل التوقيت
\timing

-- عرض آخر استعلام
\g

-- تغيير قاعدة البيانات
\c database_name
```

---

## 📝 **ملف .env.local النهائي**

أنشئ هذا الملف في مجلد المشروع:

```bash
# /Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase/.env.local

# Supabase Database Connection
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# أو استخدم Direct connection (أبطأ لكن بدون pooler)
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Supabase Project
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```

**⚠️ مهم:** أضف `.env.local` إلى `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

---

## 🚀 **Setup سريع (خطوة بخطوة)**

### **1. تثبيت الأدوات:**

```bash
# تثبيت PostgreSQL CLI
brew install postgresql

# تثبيت Supabase CLI (اختياري)
npm install -g supabase
```

### **2. إعداد الاتصال:**

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# أنشئ ملف البيئة
cat > .env.local << 'EOF'
DATABASE_URL="YOUR_DATABASE_URL_HERE"
EOF

# اختبر الاتصال
source .env.local
psql "$DATABASE_URL" -c "SELECT version();"
```

### **3. إنشاء سكريبتات مساعدة:**

```bash
# سكريبت الاتصال
cat > connect.sh << 'EOF'
#!/bin/bash
source .env.local
psql "$DATABASE_URL"
EOF

# سكريبت تنفيذ SQL
cat > run.sh << 'EOF'
#!/bin/bash
source .env.local
psql "$DATABASE_URL" -f "$1"
EOF

# سكريبت الاختبار
cat > test.sh << 'EOF'
#!/bin/bash
source .env.local
echo "🧪 Running tests..."
for file in test_step_*.sql; do
    echo "▶️ Testing $file"
    psql "$DATABASE_URL" -f "$file"
done
EOF

# اجعلها قابلة للتنفيذ
chmod +x connect.sh run.sh test.sh
```

### **4. الاستخدام:**

```bash
# الاتصال بقاعدة البيانات
./connect.sh

# تنفيذ migration
./run.sh supabase/migrations/STEP_48_ecommerce_functions.sql

# تشغيل الاختبارات
./test.sh
```

---

## 🔐 **الأمان**

### **Best Practices:**

1. **لا تحفظ كلمات المرور في Git:**
   ```bash
   # تأكد من إضافة في .gitignore
   .env.local
   .env
   .pgpass
   ```

2. **استخدم متغيرات البيئة:**
   ```bash
   # بدلاً من كتابة كلمة المرور مباشرة
   export PGPASSWORD="your-password"
   psql -h host -U user -d database
   ```

3. **استخدم Pooler في Production:**
   ```
   # استخدم Connection Pooler URL
   pooler.supabase.com:6543
   
   # بدلاً من Direct Connection
   db.supabase.co:5432
   ```

---

## 📚 **مصادر إضافية**

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [PostgreSQL psql Docs](https://www.postgresql.org/docs/current/app-psql.html)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)

---

## 🎯 **الخطوات التالية**

بعد إعداد CLI، يمكنك:

1. ✅ تنفيذ Migrations بسهولة
2. ✅ تشغيل الاختبارات بسرعة
3. ✅ عمل Backup دوري
4. ✅ مراقبة الأداء
5. ✅ استكشاف الأخطاء بسرعة

---

**هل تريد مساعدة في إعداد أي من هذه الأدوات؟** 🚀

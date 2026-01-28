# 🚀 دليل البدء السريع - خطوة بخطوة
# Step-by-Step Quick Start Guide

---

## ⚠️ **قبل البدء: إعداد ملف الاتصال**

### **الخطوة 1: احصل على Connection String من Supabase**

1. افتح متصفحك واذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك
3. من القائمة الجانبية: **Settings** (الإعدادات)
4. اختر **Database**
5. انزل إلى قسم **"Connection string"**
6. اختر **"Connection pooling"** (وليس Transaction أو Session)
7. انسخ النص الكامل (سيكون مثل):
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

### **الخطوة 2: أنشئ ملف `.env.local`**

افتح Terminal واكتب:

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# أنشئ الملف
nano .env.local
```

**أو استخدم هذا الأمر (استبدل YOUR_CONNECTION_STRING):**

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

cat > .env.local << 'EOF'
DATABASE_URL="YOUR_CONNECTION_STRING_HERE"
EOF
```

**⚠️ مهم جداً:**
- استبدل `[YOUR-PASSWORD]` بكلمة المرور الفعلية
- تأكد أن السطر يبدأ بـ `DATABASE_URL="`
- تأكد أن النص بين علامتي تنصيص `"..."`

### **الخطوة 3: تأكد من الملف**

```bash
# تحقق من وجود الملف
ls -la .env.local

# اعرض محتواه (لكن كن حذراً - يحتوي كلمة مرور!)
cat .env.local
```

يجب أن ترى:
```
DATABASE_URL="postgresql://postgres.xyz:password@aws-0-region.pooler.supabase.com:6543/postgres"
```

---

## ✅ **الآن يمكنك استخدام السكريبتات**

### **1. اختبار الاتصال:**

```bash
./connect.sh
```

**إذا نجح** سترى:
```
🔌 جاري الاتصال بقاعدة البيانات...

psql (16.1, server 15.5)
Type "help" for help.

postgres=>
```

**داخل psql جرّب:**
```sql
-- عرض الجداول
\dt

-- عرض عدد العملاء
SELECT COUNT(*) FROM customers;

-- الخروج
\q
```

---

### **2. تنفيذ استعلام:**

```bash
./run.sh comprehensive_database_check.sql
```

---

### **3. تشغيل الاختبارات:**

```bash
./test.sh
```

---

## ❌ **حل المشاكل الشائعة**

### **المشكلة 1: "DATABASE_URL غير معرّف"**

**الحل:**
```bash
# تحقق من وجود الملف
ls -la .env.local

# إذا لم يكن موجوداً، أنشئه:
cat > .env.local << 'EOF'
DATABASE_URL="your-connection-string-here"
EOF
```

---

### **المشكلة 2: "psql: command not found"**

**الحل:**
```bash
# تثبيت PostgreSQL CLI
brew install postgresql@16

# أو
brew install libpq
brew link --force libpq
```

---

### **المشكلة 3: "connection refused" أو "timeout"**

**الأسباب المحتملة:**
1. كلمة المرور خاطئة
2. Connection string غير صحيح
3. لا يوجد اتصال بالإنترنت
4. Firewall يمنع الاتصال

**الحل:**
```bash
# 1. تحقق من Connection String
cat .env.local

# 2. اختبر الاتصال بالإنترنت
ping google.com

# 3. جرّب Direct Connection بدلاً من Pooler
# في Supabase Dashboard → Settings → Database
# انسخ "Connection string" من "Direct connection"
# (المنفذ 5432 بدلاً من 6543)
```

---

### **المشكلة 4: "Permission denied: ./connect.sh"**

**الحل:**
```bash
# اجعل السكريبت قابل للتنفيذ
chmod +x connect.sh run.sh test.sh backup.sh

# ثم جرّب مرة أخرى
./connect.sh
```

---

## 📝 **مثال عملي كامل**

```bash
# 1. اذهب للمجلد
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# 2. أنشئ .env.local (استبدل بمعلوماتك)
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres.abcdefgh:MyPassword123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
EOF

# 3. تحقق من الملف
cat .env.local

# 4. اتصل بالقاعدة
./connect.sh

# 5. داخل psql
\dt                              # عرض الجداول
SELECT COUNT(*) FROM customers;  # عدد العملاء
\q                               # الخروج
```

---

## 🎯 **إذا ما زالت المشكلة موجودة**

أرسل لي:
1. النتيجة من: `ls -la .env.local`
2. السطر الأول من: `cat .env.local` (بدون كلمة المرور!)
3. نتيجة الخطأ عند تشغيل `./connect.sh`

---

## 💡 **بديل سريع بدون ملف**

إذا أردت اختبار سريع بدون إنشاء ملف:

```bash
# اضبط المتغير مباشرة
export DATABASE_URL="your-connection-string"

# اتصل
psql "$DATABASE_URL"
```

---

**✅ الآن جرّب إنشاء الملف والاتصال!**

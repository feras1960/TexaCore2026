# 🚀 الدليل السريع لاستخدام CLI
# Quick CLI Usage Guide

---

## ✅ **السكريبتات الجاهزة**

تم إنشاء 4 سكريبتات جاهزة للاستخدام:

| السكريبت | الوصف | الاستخدام |
|----------|-------|-----------|
| `connect.sh` | الاتصال بقاعدة البيانات | `./connect.sh` |
| `run.sh` | تنفيذ ملف SQL | `./run.sh <file.sql>` |
| `test.sh` | تشغيل جميع الاختبارات | `./test.sh` |
| `backup.sh` | نسخة احتياطية | `./backup.sh` |

---

## 🔧 **الإعداد السريع (خطوة واحدة)**

### **1. أنشئ ملف `.env.local`:**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
EOF
```

**💡 للحصول على Connection String:**
1. افتح Supabase Dashboard
2. اذهب إلى **Settings** → **Database**
3. انسخ **Connection string** (Pooler)
4. استبدل `[YOUR-PASSWORD]` بكلمة المرور الفعلية

---

## 📖 **أمثلة الاستخدام**

### **1. الاتصال بقاعدة البيانات:**

```bash
./connect.sh
```

**داخل psql يمكنك:**
```sql
-- عرض الجداول
\dt

-- عرض الدوال
\df

-- تنفيذ استعلام
SELECT * FROM customers LIMIT 5;

-- الخروج
\q
```

---

### **2. تنفيذ Migration:**

```bash
# تنفيذ STEP 48
./run.sh supabase/migrations/STEP_48_ecommerce_functions.sql

# تنفيذ اختبار
./run.sh test_step_48.sql

# تنفيذ فحص شامل
./run.sh comprehensive_database_check.sql
```

---

### **3. تشغيل جميع الاختبارات:**

```bash
./test.sh
```

**النتيجة:**
```
🧪 تشغيل جميع الاختبارات...
════════════════════════════════════════════════════════════════

📦 1. اختبارات الهيكل (Schema Tests)
─────────────────────────────────────────────────────────────────
▶️  test_step_48.sql
   ✅ نجح

▶️  test_step_53.sql
   ✅ نجح

⚙️  2. اختبارات وظيفية (Functional Tests)
─────────────────────────────────────────────────────────────────
▶️  test_step_48_functional.sql
   ✅ نجح

════════════════════════════════════════════════════════════════
📊 النتيجة النهائية:
   ✅ نجح: 6
   ❌ فشل: 0
   📈 المجموع: 6
════════════════════════════════════════════════════════════════
🎉 جميع الاختبارات نجحت!
```

---

### **4. عمل نسخة احتياطية:**

```bash
./backup.sh
```

**النتيجة:**
```
💾 جاري إنشاء نسخة احتياطية...
📁 الملف: ./backups/backup_20260125_185430.sql

✅ تم إنشاء النسخة الاحتياطية بنجاح!
📊 الحجم: 2.3M
📍 المسار: ./backups/backup_20260125_185430.sql

🧹 تنظيف النسخ القديمة...
📦 عدد النسخ المحفوظة: 5
```

---

## 🎯 **سير عمل نموذجي**

### **يوم عادي في التطوير:**

```bash
# 1. عمل نسخة احتياطية قبل أي شيء
./backup.sh

# 2. تنفيذ migration جديد
./run.sh supabase/migrations/STEP_55_new_feature.sql

# 3. تشغيل الاختبارات للتأكد
./test.sh

# 4. إذا كل شيء تمام، commit إلى Git
git add .
git commit -m "feat: Add new feature"
git push
```

---

## 🔍 **استكشاف الأخطاء**

### **خطأ: "DATABASE_URL غير معرّف"**

```bash
# تحقق من وجود الملف
ls -la .env.local

# إذا غير موجود، أنشئه:
cat > .env.local << 'EOF'
DATABASE_URL="your-connection-string-here"
EOF
```

### **خطأ: "psql: command not found"**

```bash
# تثبيت PostgreSQL
brew install postgresql
```

### **خطأ: "connection refused"**

```bash
# تحقق من Connection String
cat .env.local

# تحقق من الاتصال بالإنترنت
ping google.com
```

---

## 📚 **أوامر مفيدة إضافية**

### **تنفيذ استعلام مباشر:**

```bash
source .env.local
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM customers;"
```

### **تصدير جدول إلى CSV:**

```bash
source .env.local
psql "$DATABASE_URL" -c "COPY customers TO STDOUT WITH CSV HEADER" > customers.csv
```

### **استعادة من backup:**

```bash
source .env.local
psql "$DATABASE_URL" < backups/backup_20260125_120000.sql
```

---

## 🔐 **ملاحظات الأمان**

1. ✅ **لا ترفع `.env.local` إلى Git**
   ```bash
   echo ".env.local" >> .gitignore
   ```

2. ✅ **استخدم Pooler في Production**
   ```
   pooler.supabase.com:6543  ← استخدم هذا
   db.supabase.co:5432       ← تجنب هذا
   ```

3. ✅ **غيّر كلمة المرور بشكل دوري**

---

## 💡 **نصائح للإنتاجية**

### **أضف Aliases في ~/.zshrc:**

```bash
# أضف هذه الأسطر
alias supadb="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./connect.sh"
alias suparun="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./run.sh"
alias supatest="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./test.sh"

# أعد تحميل
source ~/.zshrc

# الآن يمكنك من أي مكان:
supadb          # اتصل بالقاعدة
suparun file.sql  # نفّذ ملف
supatest        # شغّل الاختبارات
```

---

## 🎉 **جاهز للاستخدام!**

الآن يمكنك:
- ✅ الاتصال بالقاعدة بسهولة
- ✅ تنفيذ Migrations بسرعة
- ✅ تشغيل الاختبارات تلقائياً
- ✅ عمل Backups بانتظام

**🚀 ابدأ الآن:**
```bash
./connect.sh
```

---

**للتوثيق الكامل:** راجع `CLI_DATABASE_CONNECTION_GUIDE.md`

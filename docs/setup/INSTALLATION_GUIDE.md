# 📦 دليل التثبيت الكامل
# Complete Installation Guide

---

## ⚡ **التثبيت التلقائي (موصى به)**

### **خطوة واحدة فقط:**

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

./install.sh
```

**سيقوم بـ:**
1. ✅ فحص النظام
2. ✅ تثبيت PostgreSQL CLI
3. ✅ تثبيت Supabase CLI (اختياري)
4. ✅ التحقق من السكريبتات
5. ✅ إعداد الاتصال بالقاعدة

**الوقت المتوقع:** 3-5 دقائق

---

## 🛠️ **التثبيت اليدوي (خطوة بخطوة)**

إذا أردت التحكم الكامل:

### **1. تثبيت Homebrew (إذا لم يكن مثبت):**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### **2. تثبيت PostgreSQL CLI:**

```bash
# تثبيت
brew install postgresql@16

# إضافة إلى PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# التحقق
psql --version
```

**النتيجة المتوقعة:**
```
psql (PostgreSQL) 16.x
```

### **3. تثبيت Supabase CLI (اختياري):**

```bash
# طريقة 1: عبر Homebrew
brew install supabase/tap/supabase

# أو طريقة 2: عبر npm
npm install -g supabase

# التحقق
supabase --version
```

### **4. جعل السكريبتات قابلة للتنفيذ:**

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

chmod +x connect.sh run.sh test.sh backup.sh setup_connection.sh install.sh
```

### **5. إعداد الاتصال:**

```bash
./setup_connection.sh
```

---

## 🧪 **اختبار التثبيت**

### **1. تحقق من الأدوات:**

```bash
# PostgreSQL
psql --version

# Supabase (اختياري)
supabase --version

# Git
git --version
```

### **2. تحقق من السكريبتات:**

```bash
ls -lh *.sh
```

**يجب أن ترى:**
```
-rwxr-xr-x  backup.sh
-rwxr-xr-x  connect.sh
-rwxr-xr-x  install.sh
-rwxr-xr-x  run.sh
-rwxr-xr-x  setup_connection.sh
-rwxr-xr-x  test.sh
```

### **3. اختبر الاتصال:**

```bash
./connect.sh
```

**إذا نجح:**
```
🔌 جاري الاتصال بقاعدة البيانات...

psql (16.1, server 15.5)
Type "help" for help.

postgres=>
```

---

## ❌ **حل المشاكل**

### **المشكلة 1: "command not found: brew"**

**الحل:**
```bash
# ثبّت Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# أعد تشغيل Terminal
```

---

### **المشكلة 2: "psql: command not found"**

**الحل:**
```bash
# ثبّت PostgreSQL
brew install postgresql@16

# أضف إلى PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc

# أعد تحميل
source ~/.zshrc

# تحقق
psql --version
```

---

### **المشكلة 3: "Permission denied: ./install.sh"**

**الحل:**
```bash
chmod +x install.sh
./install.sh
```

---

### **المشكلة 4: PostgreSQL مثبت لكن psql لا يعمل**

**الحل:**
```bash
# ابحث عن مسار psql
which psql
# أو
find /opt/homebrew -name psql 2>/dev/null

# إذا وجدته في مسار معين، أضفه للـ PATH
echo 'export PATH="/المسار/الذي/وجدته:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

### **المشكلة 5: "connection refused" عند الاتصال**

**الحل:**

1. **تحقق من .env.local:**
   ```bash
   cat .env.local
   ```

2. **تأكد من Connection String صحيح:**
   - يبدأ بـ `postgresql://`
   - يحتوي على كلمة المرور
   - المنفذ 6543 (Pooler) أو 5432 (Direct)

3. **جرّب الاتصال المباشر:**
   ```bash
   psql "your-connection-string-here"
   ```

4. **تحقق من الإنترنت:**
   ```bash
   ping google.com
   ```

---

## 🔧 **إعادة التثبيت**

إذا واجهت مشاكل، يمكنك إعادة التثبيت:

```bash
# 1. احذف PostgreSQL القديم
brew uninstall postgresql@16

# 2. نظّف
brew cleanup

# 3. أعد التثبيت
brew install postgresql@16

# 4. شغّل install.sh
./install.sh
```

---

## 📊 **التحقق الشامل**

بعد التثبيت، شغّل هذا:

```bash
echo "=== نظام التشغيل ==="
uname -a

echo ""
echo "=== Homebrew ==="
brew --version

echo ""
echo "=== PostgreSQL ==="
psql --version

echo ""
echo "=== Supabase CLI (اختياري) ==="
supabase --version 2>&1 || echo "غير مثبت"

echo ""
echo "=== السكريبتات ==="
ls -lh *.sh

echo ""
echo "=== ملف الإعدادات ==="
if [ -f .env.local ]; then
    echo "✅ .env.local موجود"
else
    echo "❌ .env.local غير موجود - شغّل: ./setup_connection.sh"
fi
```

---

## 🎯 **بعد التثبيت**

### **الخطوات التالية:**

1. ✅ **إعداد الاتصال:**
   ```bash
   ./setup_connection.sh
   ```

2. ✅ **اختبار الاتصال:**
   ```bash
   ./connect.sh
   ```

3. ✅ **تشغيل فحص شامل:**
   ```bash
   ./run.sh comprehensive_database_check.sql
   ```

4. ✅ **تشغيل الاختبارات:**
   ```bash
   ./test.sh
   ```

---

## 📚 **الموارد**

- 📖 **البدء السريع:** `START_HERE_CLI.md`
- 🔧 **إعداد الاتصال:** `SETUP_CONNECTION_STEP_BY_STEP.md`
- 📚 **الدليل الكامل:** `CLI_DATABASE_CONNECTION_GUIDE.md`
- ⚡ **دليل سريع:** `CLI_QUICK_START.md`

---

## 💡 **نصائح**

### **للإنتاجية:**

```bash
# أضف aliases في ~/.zshrc
cat >> ~/.zshrc << 'EOF'

# Texa Core Aliases
alias texadb="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./connect.sh"
alias texarun="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./run.sh"
alias texatest="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./test.sh"
alias texabackup="cd '/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase' && ./backup.sh"
EOF

# أعد تحميل
source ~/.zshrc

# الآن يمكنك من أي مكان:
texadb        # اتصل بالقاعدة
texarun file.sql   # نفّذ ملف
texatest      # شغّل الاختبارات
texabackup    # نسخة احتياطية
```

---

## 🎉 **جاهز!**

الآن كل شيء مثبت ومُعد. ابدأ بـ:

```bash
./install.sh
```

---

**📞 للمساعدة:** راجع `SETUP_CONNECTION_STEP_BY_STEP.md`

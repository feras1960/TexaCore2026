# كيفية تشغيل المشروع
# How to Run the Project

## ✅ الخطوات الصحيحة

### 1. افتح Terminal

- **macOS/Linux:** اضغط `Cmd + Space` ثم اكتب `Terminal`
- **Windows:** اضغط `Win + R` ثم اكتب `cmd`

### 2. انتقل إلى مجلد المشروع

```bash
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
```

**أو** إذا كنت في مجلد آخر:
```bash
cd ~/Downloads/erpsystem2026/erpsystem\ supabase
```

### 3. تحقق من وجود node_modules

```bash
ls node_modules
```

إذا لم تجد `node_modules`، قم بتثبيت الحزم أولاً:
```bash
npm install
```

### 4. شغّل Development Server

```bash
npm run dev
```

**انتظر حتى ترى:**
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 5. افتح المتصفح

- افتح المتصفح
- اذهب إلى: `http://localhost:5173`

---

## ⚠️ مشاكل شائعة وحلولها

### المشكلة: "command not found: npm"

**الحل:**
```bash
# تأكد من تثبيت Node.js
node --version

# إذا لم يكن مثبتاً، قم بتثبيته من:
# https://nodejs.org/
```

### المشكلة: "npm: command not found"

**الحل:**
```bash
# استخدم npx بدلاً من npm
npx vite

# أو قم بتثبيت npm
```

### المشكلة: "Cannot find module"

**الحل:**
```bash
# قم بتثبيت الحزم
npm install
```

### المشكلة: Terminal يتنقل إلى سطر جديد بدون تنفيذ

**الحل:**
1. تأكد من كتابة الأمر بشكل صحيح
2. اضغط `Enter` بعد كتابة الأمر
3. تأكد من وجود `package.json` في المجلد

---

## 📝 الأوامر الكاملة (نسخ ولصق)

```bash
# 1. انتقل إلى المجلد
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# 2. تأكد من وجود node_modules (إذا لم يكن موجوداً)
npm install

# 3. شغّل المشروع
npm run dev
```

---

## 🔍 التحقق من الإعداد

بعد تشغيل `npm run dev`، يجب أن ترى:

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

إذا رأيت هذا، فالمشروع يعمل بنجاح! ✅

---

## 💡 نصيحة

إذا كان Terminal يتنقل إلى سطر جديد بدون تنفيذ:
1. تأكد من كتابة الأمر كاملاً
2. اضغط `Enter` مرة واحدة فقط
3. انتظر قليلاً - قد يستغرق الأمر بعض الوقت

---

## 🆘 إذا استمرت المشكلة

أرسل لي:
1. رسالة الخطأ الكاملة (إن وجدت)
2. ما الذي يظهر في Terminal
3. إصدار Node.js: `node --version`

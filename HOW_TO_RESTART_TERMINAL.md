# كيفية إعادة تشغيل Terminal
# How to Restart Terminal

## 🔄 الطريقة 1: إغلاق وفتح Terminal جديد

### على macOS:

1. **إغلاق Terminal الحالي:**
   - اضغط `Cmd + Q` لإغلاق Terminal تماماً
   - أو اضغط `Cmd + W` لإغلاق النافذة الحالية

2. **فتح Terminal جديد:**
   - اضغط `Cmd + Space` (Spotlight)
   - اكتب `Terminal`
   - اضغط `Enter`

### على Windows:

1. **إغلاق Terminal الحالي:**
   - اضغط `Alt + F4` لإغلاق النافذة
   - أو اكتب `exit` ثم اضغط Enter

2. **فتح Terminal جديد:**
   - اضغط `Win + R`
   - اكتب `cmd` أو `powershell`
   - اضغط Enter

---

## 🔄 الطريقة 2: إعادة تشغيل بدون إغلاق

### في Terminal نفسه:

1. **أوقف العملية الحالية:**
   - اضغط `Ctrl + C` لإيقاف العملية الجارية

2. **نظف الشاشة:**
   ```bash
   clear
   ```

3. **شغّل الأمر مرة أخرى:**
   ```bash
   cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"
   npm run dev
   ```

---

## 🔄 الطريقة 3: إعادة تشغيل Development Server

### إذا كان Server يعمل بالفعل:

1. **أوقف Server:**
   - في Terminal، اضغط `Ctrl + C`

2. **شغّله مرة أخرى:**
   ```bash
   npm run dev
   ```

---

## 📝 الأوامر الكاملة (بعد إعادة التشغيل)

بعد إعادة فتح Terminal، نفّذ هذه الأوامر بالترتيب:

```bash
# 1. انتقل إلى مجلد المشروع
cd "/Users/dr.firas/Downloads/erpsystem2026/erpsystem supabase"

# 2. تحقق من الموقع
pwd

# 3. شغّل Development Server
npm run dev
```

---

## ⚡ اختصار سريع

إذا كنت تريد فقط إعادة تشغيل Server:

1. اضغط `Ctrl + C` (لإيقاف Server)
2. اضغط السهم لأعلى ↑ (لإعادة الأمر الأخير)
3. اضغط `Enter`

---

## 💡 نصيحة

**لإعادة تشغيل Terminal بسرعة:**
- `Cmd + Q` (إغلاق) → `Cmd + Space` → `Terminal` → `Enter`

**لإعادة تشغيل Server فقط:**
- `Ctrl + C` → `↑` → `Enter`

# 📸 دليل اختبار Screenshots - TexaMobile

## كيفية اختبار التطبيق والتقاط Screenshots

---

## 🚀 الخطوة 1: تشغيل التطبيق

```bash
cd TexaMobile
npm start
```

ثم اختر:
- `i` للـ iOS Simulator
- `a` للـ Android Emulator
- `w` للـ Web Browser

---

## 📱 الخطوة 2: اختبار شاشة تسجيل الدخول

### الوصول للشاشة:
1. شغّل التطبيق
2. اذهب إلى `/login`

### ما يجب اختباره:
- [ ] الخلفية المتدرجة المتحركة (لاحظ الحركة البطيئة)
- [ ] حقول الإدخال الزجاجية
- [ ] Floating labels (اكتب في الحقول)
- [ ] أيقونات البريد والقفل
- [ ] زر "تسجيل الدخول" مع تأثير الضغط
- [ ] أزرار Social Login (Google, Apple, Facebook)
- [ ] Validation (جرب بريد غير صحيح)
- [ ] Loading state (اضغط تسجيل الدخول)

### Screenshots مطلوبة:
1. 📸 الشاشة الكاملة (Light Mode)
2. 📸 الشاشة الكاملة (Dark Mode)
3. 📸 حقل الإدخال مع Focus
4. 📸 حالة Error
5. 📸 حالة Loading

---

## 🎨 الخطوة 3: اختبار شاشة العرض

### الوصول للشاشة:
1. اذهب إلى `/glass-demo`

### ما يجب اختباره:
- [ ] Gradient Presets (جرب كل واحد)
- [ ] GlassView Variants (subtle, medium, strong)
- [ ] حقول الإدخال
- [ ] جميع أنماط الأزرار (4 أنواع)
- [ ] جميع أحجام الأزرار (3 أحجام)
- [ ] البطاقات التفاعلية (اضغطها)
- [ ] Status Colors

### Screenshots مطلوبة:
1. 📸 Gradient: Primary
2. 📸 Gradient: Sunset
3. 📸 Gradient: Ocean
4. 📸 جميع Button Variants
5. 📸 البطاقات التفاعلية
6. 📸 Dark Mode الكامل

---

## 🌓 الخطوة 4: اختبار Dark/Light Mode

### كيفية التبديل:

#### iOS:
1. افتح Settings
2. Display & Brightness
3. غيّر بين Light/Dark

#### Android:
1. افتح Settings
2. Display
3. غيّر Dark theme

### ما يجب ملاحظته:
- [ ] تغيير الألوان تلقائياً
- [ ] تغيير شدة الـ Blur
- [ ] تغيير الظلال
- [ ] تغيير التدرجات
- [ ] بقاء الشفافية سليمة

### Screenshots مقارنة:
1. 📸 Login - Light vs Dark (side by side)
2. 📸 Demo - Light vs Dark (side by side)
3. 📸 تفاصيل الحقول - Light vs Dark

---

## ⚡ الخطوة 5: اختبار الحركات

### ما يجب اختباره:

#### الخلفية المتحركة:
- [ ] لاحظ حركة Gradient البطيئة
- [ ] تأكد من الحركة ناعمة (60fps)

#### تأثيرات الضغط:
- [ ] اضغط على زر → يصغر قليلاً
- [ ] اضغط على بطاقة → تأثير scale
- [ ] الحركة ناعمة ومائية

#### Floating Labels:
- [ ] اكتب في حقل → Label يطير للأعلى
- [ ] امسح النص → Label يرجع لمكانه

#### Entrance Animations:
- [ ] افتح شاشة Login → المكونات تظهر بالتدريج
- [ ] FadeIn smooth

### فيديو مطلوب:
- 🎥 10 ثواني: حركة الخلفية
- 🎥 5 ثواني: تأثير ضغط الأزرار
- 🎥 5 ثواني: Floating labels

---

## 📊 الخطوة 6: اختبار الأداء

### استخدم React DevTools:
```bash
# في Terminal آخر
npx react-devtools
```

### راقب:
- [ ] FPS (يجب أن يكون 55-60)
- [ ] Re-renders (يجب أن تكون قليلة)
- [ ] Memory usage

### لقطة شاشة:
- 📸 React DevTools Performance

---

## 🎨 Gradient Presets للاختبار

### جرب كل واحد في Demo Screen:

| Preset | لون Light | لون Dark |
|--------|----------|---------|
| Primary | أزرق فاتح | أزرق داكن |
| Secondary | بنفسجي فاتح | بنفسجي داكن |
| Sunset | برتقالي دافئ | برتقالي داكن |
| Ocean | فيروزي | تيل داكن |
| Forest | أخضر فاتح | أخضر داكن |
| Warm | وردي | وردي داكن |

---

## 🐛 اختبار حالات الخطأ

### في شاشة Login:

#### بريد غير صحيح:
```
test@      → ❌ "البريد الإلكتروني غير صالح"
@test.com  → ❌ "البريد الإلكتروني غير صالح"
test       → ❌ "البريد الإلكتروني غير صالح"
```

#### باسورد قصير:
```
123        → ❌ "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
12345      → ❌ "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
```

#### حقول فارغة:
```
Submit بدون كتابة → ❌ رسائل خطأ
```

### Screenshots:
- 📸 حالة Error للبريد
- 📸 حالة Error للباسورد
- 📸 Error للحقلين معاً

---

## 📱 اختبار مقاسات الشاشة

### جرب على:
- [ ] iPhone 15 Pro Max (6.7")
- [ ] iPhone 15 (6.1")
- [ ] iPhone SE (4.7")
- [ ] iPad Pro (12.9")

### Android:
- [ ] Pixel 8 Pro
- [ ] Samsung Galaxy S24
- [ ] Tablet

### تأكد من:
- [ ] Layout responsive
- [ ] Buttons readable
- [ ] Spacing consistent

---

## 🎯 Checklist نهائي

### Screenshots المطلوبة (15 صورة):
- [ ] Login Light Mode
- [ ] Login Dark Mode
- [ ] Login with Focus
- [ ] Login with Error
- [ ] Login Loading State
- [ ] Demo Primary Gradient
- [ ] Demo Sunset Gradient
- [ ] Demo Ocean Gradient
- [ ] Demo All Buttons
- [ ] Demo Interactive Cards
- [ ] Demo Dark Mode
- [ ] Light vs Dark Comparison (Login)
- [ ] Light vs Dark Comparison (Demo)
- [ ] Input Details
- [ ] Performance DevTools

### فيديوهات المطلوبة (3 فيديوهات):
- [ ] Gradient Animation (10s)
- [ ] Button Press Effects (5s)
- [ ] Floating Labels (5s)

---

## 💡 نصائح للتصوير

### للـ Screenshots:
1. استخدم دقة عالية
2. التقط الشاشة كاملة
3. لا تقص الصورة
4. سمي الملفات بوضوح

### للفيديوهات:
1. استخدم Screen Recorder
2. 60fps if possible
3. لا تسرع الفيديو
4. صوت واضح (اختياري)

### أسماء الملفات المقترحة:
```
login-light.png
login-dark.png
login-focus.png
login-error.png
login-loading.png
demo-primary.png
demo-sunset.png
demo-ocean.png
demo-buttons.png
demo-cards.png
demo-dark.png
comparison-login.png
comparison-demo.png
input-details.png
performance.png

gradient-animation.mp4
button-press.mp4
floating-labels.mp4
```

---

## 🆘 إذا واجهت مشكلة

### التطبيق لا يشتغل:
```bash
npm install
npm start -- --clear
```

### الـ Blur لا يعمل:
```bash
npx expo install expo-blur
```

### الحركات بطيئة:
- قلل `intensity={10}`
- استخدم `animated={false}`

---

## ✅ بعد الانتهاء

1. ✅ راجع جميع Screenshots
2. ✅ تأكد من الجودة
3. ✅ رتب الملفات في مجلد
4. ✅ اكتب ملاحظاتك
5. ✅ شارك مع الفريق!

---

**جاهز للتصوير؟ 📸 ابدأ الآن!**

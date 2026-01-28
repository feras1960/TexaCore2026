# 🚀 البدء السريع - TexaMobile Glassmorphism

## الخطوات الأولى

### 1️⃣ تشغيل التطبيق

```bash
# في مجلد المشروع
cd TexaMobile

# تشغيل Development Server
npm start

# أو تشغيل مباشر على iOS
npm run ios

# أو تشغيل على Android
npm run android
```

---

## 📱 الشاشات المتاحة للاختبار

### شاشة تسجيل الدخول
```
URL: /login
```

**المميزات:**
- ✨ خلفية متدرجة متحركة
- 🔒 حقول إدخال زجاجية مع Floating Labels
- 🎯 Validation للبريد وكلمة المرور
- 👆 تأثيرات ضغط ناعمة
- 🌓 دعم Dark/Light Mode

**للاختبار:**
1. افتح التطبيق
2. اذهب إلى `/login`
3. جرب الكتابة في الحقول
4. اضغط الأزرار
5. غيّر وضع النظام (Dark/Light)

---

### شاشة العرض التوضيحي
```
URL: /glass-demo
```

**المميزات:**
- 🎨 عرض جميع المكونات
- 🔄 تبديل بين Gradient Presets
- 🧪 اختبار جميع Variants
- 📊 عرض Status Colors

**للاختبار:**
1. اذهب إلى `/glass-demo`
2. جرب تغيير Gradient Preset
3. اضغط على البطاقات التفاعلية
4. جرب جميع أنماط الأزرار
5. اكتب في حقول الإدخال

---

## 🎨 استخدام المكونات - أمثلة سريعة

### مثال 1: شاشة بسيطة

```typescript
import { GlassBackground, GlassCard, GlassButton } from '@/components/glass';

export default function MyScreen() {
  return (
    <GlassBackground preset="primary" animated>
      <GlassCard variant="medium" shadow="soft3">
        <Text>مرحباً بك!</Text>
        <GlassButton variant="primary" onPress={() => {}}>
          ابدأ الآن
        </GlassButton>
      </GlassCard>
    </GlassBackground>
  );
}
```

---

### مثال 2: نموذج إدخال

```typescript
import { GlassCard, GlassInput, GlassButton } from '@/components/glass';
import { Ionicons } from '@expo/vector-icons';

export default function FormScreen() {
  const [name, setName] = useState('');
  
  return (
    <GlassCard variant="strong" shadow="soft4">
      <GlassInput
        label="الاسم"
        value={name}
        onChangeText={setName}
        leftIcon={<Ionicons name="person-outline" size={20} />}
      />
      <GlassButton variant="primary" fullWidth>
        إرسال
      </GlassButton>
    </GlassCard>
  );
}
```

---

### مثال 3: بطاقة قابلة للضغط

```typescript
import { GlassCard } from '@/components/glass';

export default function CardScreen() {
  return (
    <GlassCard
      variant="medium"
      shadow="soft3"
      onPress={() => console.log('Pressed!')}
      pressable
      hoverEffect
    >
      <Text>اضغط هنا</Text>
    </GlassCard>
  );
}
```

---

## 🌈 Gradient Presets المتاحة

```typescript
'primary'   // أزرق
'secondary' // بنفسجي
'sunset'    // برتقالي دافئ
'ocean'     // فيروزي
'forest'    // أخضر
'warm'      // وردي
```

**الاستخدام:**
```typescript
<GlassBackground preset="sunset" animated />
```

---

## 🎭 Button Variants

```typescript
'primary'   // صلب ملون
'secondary' // زجاجي شفاف
'outline'   // حدود ملونة
'ghost'     // بدون خلفية
```

**الاستخدام:**
```typescript
<GlassButton variant="outline" size="lg">
  اضغط هنا
</GlassButton>
```

---

## 📏 Component Sizes

### Buttons
```typescript
size="sm"  // 36px
size="md"  // 48px (default)
size="lg"  // 56px
```

### Border Radius
```typescript
borderRadius="xs"   // 4px
borderRadius="sm"   // 8px
borderRadius="md"   // 12px
borderRadius="lg"   // 16px (default)
borderRadius="xl"   // 20px
borderRadius="xxl"  // 24px
borderRadius="round" // 999px
```

### Shadows
```typescript
shadow="soft1"  // خفيف جداً
shadow="soft2"  // خفيف
shadow="soft3"  // متوسط (recommended)
shadow="soft4"  // قوي
shadow="soft5"  // قوي جداً
shadow="glass"  // خاص بالزجاج
```

---

## 🌓 Dark/Light Mode

### التحقق من الوضع الحالي

```typescript
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTheme } from '@/constants/glassmorphism-theme';

const colorScheme = useColorScheme();
const isDark = colorScheme === 'dark';
const theme = getTheme(isDark);

// استخدام الألوان
<Text style={{ color: theme.text.primary }}>نص</Text>
```

### اختبار Dark Mode
1. iOS: Settings > Display > Dark Mode
2. Android: Settings > Display > Dark theme
3. سيتغير التطبيق تلقائياً

---

## ⚡ نصائح الأداء

### 1. تعطيل الحركة للأجهزة الضعيفة
```typescript
<GlassView animated={false} />
<GlassBackground animated={false} />
```

### 2. تقليل شدة Blur
```typescript
<GlassView intensity={10} /> // بدلاً من 20
```

### 3. استخدام memo للمكونات الثابتة
```typescript
const MyCard = React.memo(() => (
  <GlassCard>...</GlassCard>
));
```

---

## 🐛 حل المشاكل

### المشكلة: المكونات لا تظهر
**الحل:** تأكد من تثبيت جميع الحزم
```bash
npm install
```

### المشكلة: Blur لا يعمل
**الحل:** تأكد من تثبيت expo-blur
```bash
npx expo install expo-blur
```

### المشكلة: الحركات بطيئة
**الحل:** استخدم `animated={false}` أو قلل `intensity`

### المشكلة: TypeScript errors
**الحل:** تأكد من استيراد الـ types
```typescript
import type { GlassVariant } from '@/types/glassmorphism';
```

---

## 📚 المراجع السريعة

### الملفات المهمة
- **Theme System:** `constants/glassmorphism-theme.ts`
- **Components:** `components/glass/`
- **Types:** `types/glassmorphism.ts`
- **Documentation:** `docs/GLASSMORPHISM_GUIDE.md`

### روابط مفيدة
- [Expo Blur Docs](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Linear Gradient Docs](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)

---

## ✅ Checklist للبدء

- [ ] تثبيت Dependencies: `npm install`
- [ ] تشغيل التطبيق: `npm start`
- [ ] فتح شاشة `/login` للتعرف على التصميم
- [ ] فتح شاشة `/glass-demo` لرؤية جميع المكونات
- [ ] تجربة Dark/Light Mode
- [ ] قراءة `GLASSMORPHISM_GUIDE.md` للتفاصيل
- [ ] بناء أول شاشة خاصة بك!

---

## 🎯 الخطوات القادمة

1. **تعلم المكونات:** اقرأ `GLASSMORPHISM_GUIDE.md`
2. **جرب الأمثلة:** افتح `/glass-demo`
3. **ابنِ شاشتك:** استخدم المكونات الجاهزة
4. **خصص التصميم:** عدّل `glassmorphism-theme.ts`
5. **شارك النتائج:** أرسل screenshots للفريق!

---

**جاهز للبدء؟ 🚀**

```bash
npm start
```

**أي أسئلة؟** راجع `docs/GLASSMORPHISM_GUIDE.md`

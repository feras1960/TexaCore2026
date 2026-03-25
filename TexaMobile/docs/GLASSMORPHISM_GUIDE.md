# 🎨 TexaMobile Glassmorphism Design System

## نظام التصميم الحديث - Modern Glassmorphism

تم تطبيق أحدث معايير التصميم من iOS و Android باستخدام تأثيرات Glassmorphism الحديثة.

---

## 📦 المكونات المتاحة

### 1. GlassView - الحاوية الزجاجية
حاوية أساسية مع تأثير Blur وشفافية.

```typescript
import { GlassView } from '@/components/glass';

<GlassView
  variant="medium" // 'subtle' | 'medium' | 'strong'
  shadow="glass"   // 'none' | 'soft1' | 'soft2' | 'soft3' | 'soft4' | 'soft5' | 'glass'
  borderRadius="lg" // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'round'
  animated={true}   // Enable entrance animation
>
  {/* Your content */}
</GlassView>
```

**Variants:**
- `subtle`: شفافية عالية (50%)
- `medium`: شفافية متوسطة (70%) - Default
- `strong`: شفافية منخفضة (85%)

---

### 2. GlassCard - بطاقة قابلة للضغط
بطاقة زجاجية مع تأثيرات الضغط الناعمة.

```typescript
import { GlassCard } from '@/components/glass';

<GlassCard
  variant="medium"
  shadow="soft3"
  borderRadius="lg"
  onPress={() => console.log('Pressed')}
  pressable={true}
  hoverEffect={true} // Enable press scale effect
>
  {/* Card content */}
</GlassCard>
```

**Use Cases:**
- بطاقات المنتجات
- عناصر القوائم
- الإحصائيات
- أي محتوى قابل للنقر

---

### 3. GlassInput - حقل الإدخال الزجاجي
حقل إدخال مع تأثير Glass وتحريك Label تلقائي.

```typescript
import { GlassInput } from '@/components/glass';
import { Ionicons } from '@expo/vector-icons';

<GlassInput
  label="البريد الإلكتروني"
  value={email}
  onChangeText={setEmail}
  error="البريد غير صالح"
  leftIcon={<Ionicons name="mail-outline" size={20} />}
  rightIcon={<Ionicons name="eye-outline" size={20} />}
  keyboardType="email-address"
/>
```

**Features:**
- Floating label animation
- Focus border highlight
- Error state
- Left/Right icons support
- RTL ready

---

### 4. GlassButton - الزر الزجاجي
زر مع تأثيرات ضغط ناعمة وأنماط متعددة.

```typescript
import { GlassButton } from '@/components/glass';
import { Ionicons } from '@expo/vector-icons';

<GlassButton
  variant="primary" // 'primary' | 'secondary' | 'outline' | 'ghost'
  size="md"         // 'sm' | 'md' | 'lg'
  onPress={handlePress}
  loading={isLoading}
  disabled={false}
  fullWidth={false}
  leftIcon={<Ionicons name="log-in-outline" size={20} />}
  rightIcon={<Ionicons name="arrow-forward" size={20} />}
>
  تسجيل الدخول
</GlassButton>
```

**Variants:**
- `primary`: لون أساسي صلب (Accent color)
- `secondary`: زجاجي شفاف
- `outline`: حدود ملونة بدون تعبئة
- `ghost`: بدون خلفية أو حدود

**Sizes:**
- `sm`: 36px height
- `md`: 48px height (Default)
- `lg`: 56px height

---

### 5. GlassBackground - الخلفية المتدرجة
خلفية متحركة مع تدرجات لونية ناعمة.

```typescript
import { GlassBackground } from '@/components/glass';

<GlassBackground
  preset="primary" // 'primary' | 'secondary' | 'sunset' | 'ocean' | 'forest' | 'warm'
  animated={true}  // Enable subtle gradient movement
  customColors={['#FF0000', '#00FF00', '#0000FF']} // Optional custom colors
>
  {/* Your screen content */}
</GlassBackground>
```

**Gradient Presets:**
- `primary`: أزرق فاتح (Light) / أزرق داكن (Dark)
- `secondary`: بنفسجي فاتح / بنفسجي داكن
- `sunset`: برتقالي دافئ
- `ocean`: فيروزي منعش
- `forest`: أخضر طبيعي
- `warm`: وردي ناعم

**Animation:**
يتحرك التدرج بشكل بطيء وناعم لإضافة حيوية للخلفية.

---

## 🎨 نظام الألوان

### Brand Colors
```typescript
import { BrandColors } from '@/constants/glassmorphism-theme';

BrandColors.primary[500]   // Main brand color
BrandColors.secondary[500] // Secondary color
BrandColors.accent[500]    // Accent color
```

### Theme Colors
```typescript
import { getTheme } from '@/constants/glassmorphism-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const colorScheme = useColorScheme();
const theme = getTheme(colorScheme === 'dark');

// Glass Effects
theme.glass.background      // 'rgba(255, 255, 255, 0.7)' or 'rgba(30, 30, 35, 0.7)'
theme.glass.border          // Border color with transparency
theme.glass.shadow          // Shadow color

// Text Colors
theme.text.primary          // Main text
theme.text.secondary        // Secondary text
theme.text.tertiary         // Subtle text
theme.text.inverse          // Inverse (white on dark, dark on light)

// Background Colors
theme.background.primary    // Main background
theme.background.secondary  // Card backgrounds
theme.background.tertiary   // Hover states

// Status Colors
theme.accent                // Brand accent
theme.success               // Green
theme.warning               // Yellow
theme.error                 // Red
theme.info                  // Blue
```

---

## 🌈 التدرجات اللونية

```typescript
import { getGradients } from '@/constants/glassmorphism-theme';
import { LinearGradient } from 'expo-linear-gradient';

const gradients = getGradients(isDark);

<LinearGradient
  colors={gradients.primary}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>
  {/* Content */}
</LinearGradient>
```

**Available Gradients:**
- `primary`, `secondary`, `sunset`, `ocean`, `forest`, `warm`
- يتغير تلقائياً بين Light/Dark mode

---

## 🎭 الظلال الناعمة

```typescript
import { Shadows } from '@/constants/glassmorphism-theme';

// Apply shadow to any component
<View style={[styles.card, Shadows.soft3]}>
  {/* Content */}
</View>
```

**Shadow Levels:**
- `soft1`: أخف ظل (1dp)
- `soft2`: بطاقات صغيرة (2dp)
- `soft3`: بطاقات متوسطة (3dp) - Recommended
- `soft4`: بطاقات كبيرة (4dp)
- `soft5`: نوافذ منبثقة (5dp)
- `glass`: ظل خاص بالـ Glassmorphism

---

## 📏 نظام التباعد

```typescript
import { Spacing } from '@/constants/glassmorphism-theme';

Spacing.xs    // 4px
Spacing.sm    // 8px
Spacing.md    // 12px
Spacing.lg    // 16px
Spacing.xl    // 20px
Spacing.xxl   // 24px
Spacing.xxxl  // 32px
```

---

## 🔤 الخطوط

```typescript
import { Typography } from '@/constants/glassmorphism-theme';

// Font Sizes
Typography.fontSize.xs       // 10
Typography.fontSize.sm       // 12
Typography.fontSize.base     // 14
Typography.fontSize.md       // 16
Typography.fontSize.lg       // 18
Typography.fontSize.xl       // 20
Typography.fontSize.xxl      // 24
Typography.fontSize.xxxl     // 32
Typography.fontSize.display  // 40

// Font Weights
Typography.fontWeight.light      // '300'
Typography.fontWeight.regular    // '400'
Typography.fontWeight.medium     // '500'
Typography.fontWeight.semibold   // '600'
Typography.fontWeight.bold       // '700'
Typography.fontWeight.heavy      // '800'
```

---

## ⚡ الحركات (Animations)

### Duration
```typescript
import { AnimationDuration } from '@/constants/glassmorphism-theme';

AnimationDuration.instant    // 100ms
AnimationDuration.fast       // 200ms
AnimationDuration.normal     // 300ms (Default)
AnimationDuration.slow       // 500ms
AnimationDuration.verySlow   // 800ms
```

### Reanimated Animations
```typescript
import Animated, {
  FadeInDown,
  FadeInUp,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Entrance animations
<Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
  {/* Content */}
</Animated.View>

// Spring animation (للحركات الناعمة)
scale.value = withSpring(1, {
  damping: 15,
  stiffness: 150,
});

// Timing animation (للانتقالات السلسة)
opacity.value = withTiming(1, {
  duration: AnimationDuration.normal,
});
```

---

## 💡 أمثلة عملية

### مثال 1: شاشة تسجيل الدخول
انظر الملف: `app/login.tsx`

**Features:**
- خلفية متدرجة متحركة
- حقول إدخال زجاجية مع Floating Labels
- أزرار مع تأثيرات الضغط
- دعم كامل للـ Dark Mode

---

### مثال 2: بطاقة منتج

```typescript
import { GlassCard } from '@/components/glass';
import { Ionicons } from '@expo/vector-icons';

<GlassCard
  variant="medium"
  shadow="soft3"
  borderRadius="xl"
  onPress={() => console.log('Product clicked')}
  pressable
  hoverEffect
>
  <View style={{ padding: 16 }}>
    <Image source={productImage} style={styles.image} />
    <Text style={styles.title}>اسم المنتج</Text>
    <Text style={styles.price}>$99.99</Text>
    <GlassButton variant="primary" size="sm" fullWidth>
      أضف للسلة
    </GlassButton>
  </View>
</GlassCard>
```

---

### مثال 3: نموذج تسجيل

```typescript
import { GlassCard, GlassInput, GlassButton } from '@/components/glass';

<GlassCard variant="strong" shadow="soft4" borderRadius="xl">
  <View style={{ padding: 24 }}>
    <GlassInput
      label="الاسم الكامل"
      value={name}
      onChangeText={setName}
      leftIcon={<Ionicons name="person-outline" size={20} />}
    />
    
    <GlassInput
      label="البريد الإلكتروني"
      value={email}
      onChangeText={setEmail}
      keyboardType="email-address"
      leftIcon={<Ionicons name="mail-outline" size={20} />}
    />
    
    <GlassButton
      variant="primary"
      size="lg"
      fullWidth
      onPress={handleSubmit}
      loading={isLoading}
    >
      إرسال
    </GlassButton>
  </View>
</GlassCard>
```

---

## 🌓 Dark Mode Support

جميع المكونات تدعم Dark Mode تلقائياً:

```typescript
import { useColorScheme } from '@/hooks/use-color-scheme';

const colorScheme = useColorScheme(); // 'light' | 'dark'
const isDark = colorScheme === 'dark';
```

**التبديل التلقائي:**
- الألوان تتغير تلقائياً
- الشفافية تتكيف مع الخلفية
- الظلال تُضبط حسب السطوع
- التدرجات لها إصدارات خاصة بالـ Dark Mode

---

## 📱 الاستخدام في المشروع

### خطوات التطبيق:

1. **استيراد المكونات:**
```typescript
import {
  GlassView,
  GlassCard,
  GlassInput,
  GlassButton,
  GlassBackground,
} from '@/components/glass';
```

2. **استخدام نظام التصميم:**
```typescript
import {
  getTheme,
  getGradients,
  Shadows,
  Spacing,
  Typography,
  BorderRadius,
} from '@/constants/glassmorphism-theme';
```

3. **بناء الشاشات:**
- ابدأ بـ `GlassBackground` للخلفية
- استخدم `GlassCard` للمحتوى
- أضف `GlassInput` للنماذج
- استخدم `GlassButton` للأزرار

---

## ⚙️ التخصيص

### تخصيص الألوان:

عدّل الملف: `constants/glassmorphism-theme.ts`

```typescript
export const BrandColors = {
  primary: {
    500: '#YOUR_COLOR', // لونك الخاص
  },
};
```

### تخصيص التدرجات:

```typescript
export const Gradients = {
  light: {
    custom: ['#COLOR1', '#COLOR2', '#COLOR3'],
  },
};
```

---

## 🚀 Performance Tips

1. **استخدم `animated={false}` إذا لم تحتاج الحركة:**
```typescript
<GlassView animated={false}>
```

2. **قلل شدة الـ Blur للأجهزة الضعيفة:**
```typescript
<GlassView intensity={10}> {/* Default: 20 */}
```

3. **استخدم `memo()` للمكونات الثابتة:**
```typescript
const MyCard = React.memo(() => (
  <GlassCard>...</GlassCard>
));
```

---

## 📚 المراجع

- **expo-blur:** https://docs.expo.dev/versions/latest/sdk/blur-view/
- **react-native-reanimated:** https://docs.swmansion.com/react-native-reanimated/
- **expo-linear-gradient:** https://docs.expo.dev/versions/latest/sdk/linear-gradient/

---

## 🎯 Next Steps

- [ ] إضافة Dark/Light Mode Toggle
- [ ] إنشاء مكتبة Icons موحدة
- [ ] بناء المزيد من الشاشات بنفس الأسلوب
- [ ] إضافة Haptic Feedback للأزرار
- [ ] تطبيق نظام i18n للترجمة

---

**تم إنشاء هذا النظام بواسطة Next Revolution Company**  
© 2026 TexaMobile - Modern Glassmorphism Design System

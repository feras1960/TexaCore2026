# 📐 Nexa Connect — إرشادات التنفيذ والتصميم

> ⚠️ **هذا الملف مرجع ثابت — لا يُحذف ولا يُعدّل.**
> اقرأ هذا الملف بالكامل قبل كتابة أي سطر كود.

---

## 1. قواعد عامة صارمة

1. **لا تحذف ملف الخطة** `nexa-connect-plan.md` — هو مرجعك الأساسي.
2. **لا تكتب كود بدون تصميم** — كل شاشة تبدأ بتعريف الألوان والمسافات أولاً.
3. **كل نص يمر عبر i18n** — لا يوجد نص عربي أو إنجليزي مباشر في الكود أبداً.
4. **كل شاشة تدعم Light + Dark** — لا استثناءات.
5. **كل مكون يدعم RTL + LTR** — اختبر بالعربية دائماً.
6. **لا تستخدم أرقام سحرية** — كل قيمة (لون، حجم، مسافة) تأتي من Theme.

---

## 2. نظام الألوان — Material Design 3

### Light Mode
```dart
// الألوان الأساسية
primary:         Color(0xFF2D5A4C)  // أخضر زيتي
onPrimary:       Color(0xFFFFFFFF)
primaryContainer: Color(0xFFB8F0DE)
onPrimaryContainer: Color(0xFF002117)

// السطوح
surface:         Color(0xFFFBFDF9)
onSurface:       Color(0xFF191C1A)
surfaceVariant:  Color(0xFFDBE5DE)
outline:         Color(0xFF707973)

// خلفية
background:      Color(0xFFFBFDF9)
scaffoldBackground: Color(0xFFF5F7F5)
```

### Dark Mode
```dart
primary:         Color(0xFF9CD4BE)
onPrimary:       Color(0xFF003829)
primaryContainer: Color(0xFF005139)
onPrimaryContainer: Color(0xFFB8F0DE)

surface:         Color(0xFF191C1A)
onSurface:       Color(0xFFE1E3DF)
surfaceVariant:  Color(0xFF404943)
outline:         Color(0xFF8A938C)

background:      Color(0xFF0F1419)
scaffoldBackground: Color(0xFF101418)
```

### ألوان الحالة
```dart
success:  Color(0xFF10B981)  // أخضر — متصل، تم الإرسال
error:    Color(0xFFEF4444)  // أحمر — مكالمة فائتة، خطأ
warning:  Color(0xFFF59E0B)  // برتقالي — تحذير
info:     Color(0xFF3B82F6)  // أزرق — معلومات
online:   Color(0xFF22C55E)  // أخضر فاتح — نقطة الحالة
```

### قاعدة ذهبية
> لا تستخدم `Colors.red` أو `Colors.green` أبداً.
> استخدم دائماً: `Theme.of(context).colorScheme.primary` أو الألوان المعرّفة أعلاه.

---

## 3. الطباعة (Typography)

```dart
// العناوين
displayLarge:  Inter, 32px, FontWeight.w700
headlineLarge: Inter, 24px, FontWeight.w600
headlineMedium: Inter, 20px, FontWeight.w600
titleLarge:    Inter, 18px, FontWeight.w600
titleMedium:   Inter, 16px, FontWeight.w500

// النصوص
bodyLarge:  Inter, 16px, FontWeight.w400
bodyMedium: Inter, 14px, FontWeight.w400
bodySmall:  Inter, 12px, FontWeight.w400

// الأزرار والتسميات
labelLarge: Inter, 14px, FontWeight.w600
labelSmall: Inter, 11px, FontWeight.w500

// العربية: استخدم Noto Sans Arabic تلقائياً عند locale == 'ar'
```

### قاعدة
> لا تستخدم `fontSize: 14` مباشرة.
> استخدم: `Theme.of(context).textTheme.bodyMedium`

---

## 4. الأشكال والمسافات

```dart
// الزوايا (Border Radius)
radiusXS:  4.0   // عناصر صغيرة جداً
radiusSM:  8.0   // أزرار صغيرة، chips
radiusMD:  12.0  // حقول إدخال
radiusLG:  16.0  // أزرار كبيرة
radiusXL:  24.0  // بطاقات
radiusFull: 28.0 // FAB، بطاقات كبيرة

// المسافات (8pt Grid System)
space4:  4.0
space8:  8.0
space12: 12.0
space16: 16.0
space20: 20.0
space24: 24.0
space32: 32.0
space48: 48.0

// الظلال (Elevation)
elevation0: 0   // عناصر مسطحة
elevation1: 1   // بطاقات عادية
elevation2: 3   // بطاقات مرفوعة
elevation3: 6   // شريط تنقل، FAB
```

### قاعدة
> كل المسافات بمضاعفات 4. لا تستخدم `padding: 15` أبداً.
> استخدم `padding: 16` أو `padding: 12`.

---

## 5. الحركات والأنيميشن

### المبادئ
- كل حركة يجب أن تكون **هادفة** (تشرح تغيير حالة)
- لا تتجاوز **300ms** للحركات العادية
- استخدم **Spring** للعناصر التفاعلية (أزرار، بطاقات)
- استخدم **Ease-out** للعناصر الداخلة و **Ease-in** للخارجة

### القيم المعتمدة
```dart
// مدة الحركات
durationFast:   150ms  // Ripple, hover
durationNormal: 250ms  // انتقالات، ظهور
durationSlow:   400ms  // تغيير شاشة

// Spring
springDamping:   20
springStiffness: 300
springMass:      1.0

// منحنيات
curveStandard:    Curves.easeOutCubic
curveDecelerate:  Curves.decelerate
curveEmphasized:  Curves.easeInOutCubic
```

### أمثلة مطلوبة
- **أزرار Dialpad**: Scale down 0.95 عند الضغط + Ripple
- **فقاعات الرسائل**: Slide up + Fade in عند الظهور
- **الانتقال بين الشاشات**: Shared Element Transition لصورة جهة الاتصال
- **حذف رسالة**: Slide out + Fade مع تقلص المسافة
- **Badge إشعارات**: Scale bounce عند تحديث العدد

---

## 6. المكونات الأساسية — كيف تبنيها

### Dialpad Button
```
شكل: دائرة 72x72
خلفية Light: surfaceVariant (شفاف 10%)
خلفية Dark: surfaceVariant (شفاف 15%)
نص: headlineMedium, onSurface
عند الضغط: Scale 0.95 + Ripple + Haptic (light)
زر الاتصال: دائرة 72x72, خلفية primary, أيقونة بيضاء
```

### Message Bubble
```
رسالتي:     خلفية primaryContainer, زاوية 16px (بدون زاوية يمين-أسفل)
رسالة غيري: خلفية surfaceVariant, زاوية 16px (بدون زاوية يسار-أسفل)
padding: 12px أفقي, 8px عمودي
الوقت: bodySmall, لون outline, أسفل يسار
حالة ✓✓: أيقونة 14px, بجانب الوقت
```

### Contact Card
```
ارتفاع: 72px
Avatar: دائرة 48px, حرف أول بخلفية primaryContainer
الاسم: titleMedium
الرقم/النوع: bodySmall, لون outline
Divider: 0.5px, لون outlineVariant, indent 72px
عند الضغط: Ripple + انتقال لبطاقة التفصيل
```

### Bottom Navigation
```
ارتفاع: 80px
عدد العناصر: 4 (مكالمات | محادثات | جهات اتصال | إعدادات)
أيقونة نشطة: Material Symbols Filled, لون primary, 28px
أيقونة غير نشطة: Material Symbols Outlined, لون outline, 24px
نص: labelSmall
Badge: دائرة 18px, خلفية error, نص أبيض
Indicator: حبة (pill shape) بخلفية primaryContainer خلف الأيقونة النشطة
```

### Chat List Item
```
ارتفاع: 76px
Avatar: دائرة 52px مع نقطة حالة online (12px, أخضر, حد أبيض 2px)
الاسم: titleMedium
آخر رسالة: bodySmall, لون outline, سطر واحد مع ...
الوقت: labelSmall, لون outline, أعلى يسار
Badge غير مقروءة: دائرة 22px, خلفية primary, نص أبيض
```

---

## 7. هيكل الكود — أنماط مطلوبة

### State Management: Riverpod
```dart
// كل feature لها providers خاصة
// مثال: chat
final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier(ref.read(supabaseProvider));
});
```

### Routing: GoRouter
```dart
// كل شاشة لها route واضح
GoRoute(path: '/chat/:id', builder: (context, state) => ChatScreen(id: state.pathParameters['id']!))
```

### Repository Pattern
```
Feature/
├── models/          # Data classes (freezed)
├── repositories/    # Supabase queries
├── providers/       # Riverpod providers
├── screens/         # Full screens
└── widgets/         # Feature-specific widgets
```

### قواعد الكود
```
1. كل ملف < 300 سطر — إذا زاد، قسّمه
2. كل Widget يكون Stateless ما أمكن — استخدم Riverpod للحالة
3. لا تضع business logic في الـ Widget — ضعها في Provider/Repository
4. سمّ الملفات بـ snake_case: message_bubble.dart
5. سمّ الـ classes بـ PascalCase: MessageBubble
6. كل شاشة تبدأ بـ Scaffold + AppBar (أو SliverAppBar)
7. استخدم const constructors دائماً
8. لا تستخدم print() — استخدم debugPrint() أو logger
```

---

## 8. Supabase — قواعد التعامل

```
1. كل query يمر عبر Repository class — لا تستدعي Supabase مباشرة من Widget
2. Realtime subscriptions تُنشأ في Provider وتُلغى في dispose
3. Storage uploads: اضغط الصور قبل الرفع (quality: 70, maxWidth: 1200)
4. RLS مفعّل على كل الجداول — لا استثناءات
5. استخدم RPC functions للعمليات المعقدة
```

---

## 9. اختبار قبل كل Sprint

```
قبل الانتقال للـ Sprint التالي، تأكد من:
□ التطبيق يعمل على iOS Simulator
□ التطبيق يعمل على Android Emulator
□ Light mode يبدو صحيحاً
□ Dark mode يبدو صحيحاً
□ العربية (RTL) تعمل بشكل صحيح
□ الإنجليزية (LTR) تعمل بشكل صحيح
□ لا يوجد overflow أو أخطاء في Console
□ الحركات سلسة (60fps)
□ الألوان مطابقة للقيم المحددة أعلاه
```

---

## 10. ما لا يجب فعله (Anti-patterns)

```
❌ لا تستخدم ألوان مباشرة: Color(0xFF...)  في الـ widgets
❌ لا تستخدم SizedBox(height: 15) — استخدم مضاعفات 4
❌ لا تكتب نصاً عربياً مباشراً: Text('مرحباً')
❌ لا تضع setState في StatelessWidget
❌ لا تستدعي Supabase من داخل build()
❌ لا تتجاهل Dark mode — كل لون يجب أن يتغير
❌ لا تستخدم Container حيث يكفي Padding أو DecoratedBox
❌ لا تنسخ كوداً — أنشئ Widget مشترك
❌ لا تحذف ملفات الخطة أو الإرشادات
```

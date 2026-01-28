# 🏗️ TexaMobile - Architecture Document

**بنية التطبيق المعمارية**

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [معمارية النظام](#معمارية-النظام)
3. [طبقات التطبيق](#طبقات-التطبيق)
4. [تدفق البيانات](#تدفق-البيانات)
5. [نظام المصادقة](#نظام-المصادقة)
6. [إدارة الحالة](#إدارة-الحالة)
7. [التوجيه](#التوجيه)
8. [التصميم](#التصميم)
9. [الأداء](#الأداء)
10. [الأمان](#الأمان)

---

## 🎯 نظرة عامة

### النمط المعماري
```
Clean Architecture + Feature-First Organization
```

### المبادئ الأساسية
- **Separation of Concerns** - فصل المسؤوليات
- **Single Responsibility** - مسؤولية واحدة لكل مكون
- **Dependency Inversion** - الاعتماد على Abstractions
- **DRY (Don't Repeat Yourself)** - عدم تكرار الكود
- **KISS (Keep It Simple, Stupid)** - البساطة

---

## 🏛️ معمارية النظام

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│          React Native Application           │
│              (Expo Framework)               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            Presentation Layer               │
│  (UI Components, Screens, Animations)       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            Business Logic Layer             │
│    (Contexts, Hooks, State Management)      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            Data Access Layer                │
│        (Supabase Client, API Calls)         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│              Backend (Supabase)             │
│   (PostgreSQL, Auth, Storage, Realtime)     │
└─────────────────────────────────────────────┘
```

### Technology Stack

```typescript
{
  // Frontend
  "ui": "React Native",
  "framework": "Expo SDK 52",
  "language": "TypeScript",
  "routing": "Expo Router (File-based)",
  "animations": "React Native Reanimated v4.1",
  "styling": "StyleSheet + Glassmorphism",
  
  // Backend
  "database": "PostgreSQL (Supabase)",
  "auth": "Supabase Auth",
  "storage": "Supabase Storage",
  "realtime": "Supabase Realtime",
  
  // State Management
  "global": "React Context API",
  "local": "React Hooks (useState, useReducer)",
  "async": "React Query (future)",
  
  // Persistence
  "web": "localStorage",
  "mobile": "AsyncStorage",
  
  // Security
  "biometrics": "expo-local-authentication",
  "encryption": "expo-crypto (future)"
}
```

---

## 📦 طبقات التطبيق

### 1. Presentation Layer (طبقة العرض)

**المسؤولية:** عرض البيانات وتلقي المدخلات

```
app/
├── login.tsx              # شاشة تسجيل الدخول
├── (tabs)/                # شاشات محمية
│   ├── admin-dashboard.tsx
│   └── ...
components/
├── glass/                 # مكونات Glass UI
│   ├── GlassView.tsx
│   ├── GlassCard.tsx
│   └── ...
└── layout/                # مكونات Layout
    ├── Header.tsx
    └── Sidebar.tsx
```

**القواعد:**
- ✅ عرض البيانات فقط (No Business Logic)
- ✅ استخدام Hooks للحصول على البيانات
- ✅ التركيز على UI/UX
- ❌ لا تحتوي على API calls مباشرة
- ❌ لا تحتوي على Business Logic

### 2. Business Logic Layer (طبقة المنطق)

**المسؤولية:** معالجة البيانات وتطبيق القواعد

```
contexts/
├── AuthContext.tsx        # إدارة المصادقة
├── ThemeContext.tsx       # إدارة الثيم (future)
└── TenantContext.tsx      # إدارة المستأجر (future)

hooks/
├── useAuth.ts             # Hook للمصادقة
├── useBiometrics.ts       # Hook للبصمة
└── usePermissions.ts      # Hook للصلاحيات (future)
```

**القواعد:**
- ✅ معالجة وتحويل البيانات
- ✅ تطبيق Business Rules
- ✅ التحقق من الصلاحيات
- ❌ لا تحتوي على UI Components
- ❌ لا تعتمد على تفاصيل الـ API

### 3. Data Access Layer (طبقة الوصول للبيانات)

**المسؤولية:** التواصل مع Backend والتخزين المحلي

```
lib/
├── supabase.ts            # Supabase Client + Auth
├── biometrics.ts          # Biometric APIs
└── storage.ts             # Local Storage (future)

services/ (future)
├── user.service.ts        # User CRUD
├── fabric.service.ts      # Fabric Operations
└── exchange.service.ts    # Exchange Operations
```

**القواعد:**
- ✅ API Calls فقط
- ✅ معالجة Errors من Backend
- ✅ تحويل Response لـ App Format
- ❌ لا تحتوي على Business Logic
- ❌ لا تعتمد على UI

### 4. Domain Layer (طبقة النطاق)

**المسؤولية:** تعريف الأنواع والواجهات

```
types/
├── auth.types.ts          # أنواع المصادقة
├── user.types.ts          # أنواع المستخدمين
├── fabric.types.ts        # أنواع الأقمشة
└── common.types.ts        # أنواع مشتركة
```

**القواعد:**
- ✅ TypeScript Interfaces & Types فقط
- ✅ مشتركة بين جميع الطبقات
- ❌ لا تحتوي على Implementation

---

## 🔄 تدفق البيانات

### Authentication Flow

```
┌──────────────┐
│ User enters  │
│ credentials  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ LoginScreen  │ ← Presentation Layer
│ validates    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ AuthContext  │ ← Business Logic Layer
│ signIn()     │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Supabase     │ ← Data Access Layer
│ API call     │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Backend      │
│ validates    │
│ & returns    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Get user     │
│ profile &    │
│ roles        │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Store in     │
│ Context      │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Auto-redirect│
│ to Dashboard │
└──────────────┘
```

### Data Fetching Pattern (Future)

```typescript
// 1. UI Component
const AdminDashboard = () => {
  const { data, loading, error } = useStats(); // Custom Hook
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorView />;
  return <StatsView data={data} />;
};

// 2. Custom Hook (Business Logic)
const useStats = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    statsService.getStats()
      .then(setData)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);
  
  return { data, loading, error };
};

// 3. Service (Data Access)
const statsService = {
  getStats: async () => {
    const { data, error } = await supabase
      .from('stats')
      .select('*');
    
    if (error) throw error;
    return data;
  }
};
```

---

## 🔐 نظام المصادقة

### Architecture

```
┌─────────────────────────────────────────────┐
│              AuthProvider                   │
│  (Global Auth State + Navigation Logic)    │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐       ┌───────────────┐
│   Supabase    │       │  Biometrics   │
│     Auth      │       │     Auth      │
└───────────────┘       └───────────────┘
        ↓                       ↓
┌───────────────────────────────────────┐
│         Storage Persistence           │
│  Web: localStorage | Mobile: AsyncStorage│
└───────────────────────────────────────┘
```

### Session Management

```typescript
// Session Type
interface AuthSession {
  user: {
    id: string;
    email: string;
    phone?: string;
  };
  profile: UserProfile;
  roles: UserRoleAssignment[];
  primaryRole: UserRole;
  tenantId: string;
  companyId?: string;
}

// Session Lifecycle
1. User Login
   ↓
2. Supabase Auth (JWT Token)
   ↓
3. Fetch User Profile
   ↓
4. Fetch User Roles
   ↓
5. Store Session (Context + Storage)
   ↓
6. Auto Refresh Token (Supabase)
   ↓
7. Session Valid Until Logout
```

### Role-Based Access Control (RBAC)

```typescript
// Permission Check
const canAccess = (user: AuthSession, permission: string): boolean => {
  return user.roles.some(role => 
    role.permissions.includes(permission)
  );
};

// Route Protection
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { session } = useAuth();
  
  if (!session) return <Navigate to="/login" />;
  
  const hasAccess = session.roles.some(r => 
    allowedRoles.includes(r.role_name)
  );
  
  if (!hasAccess) return <Unauthorized />;
  
  return children;
};

// Usage
<ProtectedRoute allowedRoles={['admin', 'warehouse_manager']}>
  <InventoryScreen />
</ProtectedRoute>
```

---

## 📊 إدارة الحالة

### State Management Strategy

```
┌──────────────────────────────────────────┐
│          Global State (Context)          │
│  - Auth Session                          │
│  - Theme (Dark/Light)                    │
│  - Tenant Selection                      │
│  - User Preferences                      │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│        Component State (useState)         │
│  - Form Inputs                           │
│  - UI Toggles (modals, dropdowns)       │
│  - Local Loading/Error States           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│      Server State (React Query)          │
│  - API Data (future)                     │
│  - Cache Management                      │
│  - Optimistic Updates                    │
└──────────────────────────────────────────┘
```

### Context Pattern

```typescript
// 1. Create Context
interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Provider Component
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auto-load session on mount
  useEffect(() => {
    loadSession();
  }, []);
  
  // Auto-redirect on session change
  useEffect(() => {
    if (session) redirect(getDashboardRoute(session.primaryRole));
    else redirect('/login');
  }, [session]);
  
  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// 4. Usage
const SomeComponent = () => {
  const { session, signOut } = useAuth();
  return <Button onPress={signOut}>Logout</Button>;
};
```

---

## 🗺️ التوجيه

### File-Based Routing (Expo Router)

```
app/
├── _layout.tsx              # Root Layout (AuthProvider)
├── index.tsx                # Redirect Logic
├── login.tsx                # Public Route
└── (tabs)/                  # Protected Routes Group
    ├── _layout.tsx          # Tabs Layout
    ├── admin-dashboard.tsx
    ├── driver-dashboard.tsx
    └── ...
```

### Navigation Flow

```typescript
// 1. Root Layout wraps everything with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}

// 2. Index redirects based on auth state
export default function Index() {
  const { session } = useAuth();
  
  useEffect(() => {
    if (session) {
      router.replace(getDashboardRoute(session.primaryRole));
    } else {
      router.replace('/login');
    }
  }, [session]);
  
  return <LoadingScreen />;
}

// 3. Protected routes check auth in layout
export default function TabsLayout() {
  const { session } = useAuth();
  
  if (!session) return null; // AuthProvider will redirect
  
  return <Tabs>...</Tabs>;
}
```

### Dynamic Dashboard Routing

```typescript
// Based on user's primary role
const getDashboardRoute = (role: UserRole): string => {
  const routes: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/(tabs)/admin-dashboard',
    [UserRole.DRIVER]: '/(tabs)/driver-dashboard',
    [UserRole.WAREHOUSE_MANAGER]: '/(tabs)/warehouse-dashboard',
    [UserRole.CASHIER]: '/(tabs)/cashier-dashboard',
    // ... more roles
  };
  
  return routes[role] || '/(tabs)/admin-dashboard';
};
```

---

## 🎨 التصميم

### Design System Architecture

```
constants/
└── glassmorphism-theme.ts   # Design Tokens

components/
└── glass/
    ├── GlassView.tsx        # Base Component
    ├── GlassCard.tsx        # Composed from GlassView
    ├── GlassInput.tsx       # Composed from GlassView
    └── ...
```

### Theme Structure

```typescript
export const glassTheme = {
  // Colors
  colors: {
    light: {
      background: ['#667eea', '#764ba2', ...],
      glassTint: 'light',
      text: '#1a1a1a',
    },
    dark: {
      background: ['#0f172a', '#1e293b', ...],
      glassTint: 'dark',
      text: '#ffffff',
    },
  },
  
  // Blur Intensity
  blur: {
    low: { light: 60, dark: 40 },
    medium: { light: 80, dark: 60 },
    high: { light: 100, dark: 80 },
  },
  
  // Shadows
  shadows: {
    sm: { /* ... */ },
    md: { /* ... */ },
    lg: { /* ... */ },
  },
  
  // Border Radius
  borderRadius: {
    small: 12,
    medium: 16,
    large: 24,
    xlarge: 32,
  },
};
```

### Component Composition

```typescript
// Base Component
<GlassView intensity="medium" borderRadius="large">
  {children}
</GlassView>

// Composed Component
<GlassCard pressable onPress={handlePress}>
  <GlassInput placeholder="Email" />
  <GlassButton>Submit</GlassButton>
</GlassCard>
```

---

## ⚡ الأداء

### Performance Optimization Strategies

#### 1. Component Memoization
```typescript
// Memoize expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexView data={data} />;
});

// Memoize computed values
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.id - b.id);
}, [data]);

// Memoize callbacks
const handlePress = useCallback(() => {
  doSomething(id);
}, [id]);
```

#### 2. Lazy Loading
```typescript
// Lazy load screens
const AdminDashboard = lazy(() => import('./admin-dashboard'));

// Lazy load heavy components
const Charts = lazy(() => import('./Charts'));
```

#### 3. Image Optimization
```typescript
// Use Expo Image for caching
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  cachePolicy="memory-disk"
/>
```

#### 4. List Virtualization
```typescript
// Use FlatList for long lists
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### Animation Performance

```typescript
// Use Reanimated for 60 FPS animations
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// Runs on UI thread (60 FPS)
scale.value = withSpring(1.2);
```

---

## 🔒 الأمان

### Security Measures

#### 1. Authentication
```typescript
// JWT Token (Supabase)
- Stored securely (localStorage/AsyncStorage)
- Auto-refresh before expiry
- httpOnly cookies (future)
```

#### 2. Authorization
```typescript
// Role-Based Access Control
- Check permissions on every route
- Verify on backend (not just frontend)
- Principle of least privilege
```

#### 3. Data Encryption
```typescript
// Biometric Credentials (future)
import * as Crypto from 'expo-crypto';

const encrypted = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  password
);
```

#### 4. Secure Communication
```typescript
// HTTPS Only
- Supabase uses TLS/SSL
- No plain HTTP requests
```

#### 5. Input Validation
```typescript
// Client-side + Server-side
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Backend: Supabase RLS (Row Level Security)
```

#### 6. Environment Variables
```bash
# Never commit .env to git
.env
.env.local

# Use .env.example for template
EXPO_PUBLIC_SUPABASE_URL=your-url-here
```

---

## 📚 القواعد المعمارية

### ✅ DO's (افعل)

1. **Single Responsibility**
   - مكون واحد = مسؤولية واحدة
   ```typescript
   // ✅ Good
   <LoginForm onSubmit={handleLogin} />
   <LoginButton onPress={handleSubmit} />
   
   // ❌ Bad
   <LoginScreen /> // يحتوي كل شيء!
   ```

2. **Dependency Injection**
   - مرر الـ dependencies كـ props
   ```typescript
   // ✅ Good
   <UserList users={users} onUserClick={handleClick} />
   
   // ❌ Bad
   <UserList /> // يجلب البيانات بنفسه
   ```

3. **Type Safety**
   - استخدم TypeScript دائماً
   ```typescript
   // ✅ Good
   interface Props {
     name: string;
     age: number;
   }
   
   // ❌ Bad
   // props: any
   ```

### ❌ DON'Ts (لا تفعل)

1. **Business Logic in UI**
   ```typescript
   // ❌ Bad
   const LoginScreen = () => {
     const handleLogin = async () => {
       const { data } = await supabase.auth.signIn(...);
       // معالجة معقدة هنا
     };
   };
   
   // ✅ Good
   const LoginScreen = () => {
     const { signIn } = useAuth(); // Logic في Context
     return <LoginForm onSubmit={signIn} />;
   };
   ```

2. **Deep Prop Drilling**
   ```typescript
   // ❌ Bad
   <A data={data}>
     <B data={data}>
       <C data={data}>
         <D data={data} /> {/* 4 levels deep! */}
       </C>
     </B>
   </A>
   
   // ✅ Good
   <AuthProvider>
     <D /> {/* يستخدم useAuth() */}
   </AuthProvider>
   ```

3. **God Components**
   ```typescript
   // ❌ Bad: 1000+ lines component
   
   // ✅ Good: Split into smaller components
   <Dashboard>
     <DashboardHeader />
     <DashboardStats />
     <DashboardCharts />
     <DashboardActions />
   </Dashboard>
   ```

---

## 🔮 معمارية المستقبل

### Planned Improvements

1. **React Query**
   - إدارة Server State
   - Caching ذكي
   - Optimistic Updates

2. **Redux Toolkit** (إذا احتجنا)
   - إدارة Global State معقدة
   - DevTools للـ debugging

3. **Microservices Architecture**
   - فصل Backend حسب Module
   - Fabric API
   - Exchange API
   - Healthcare API

4. **Offline-First**
   - SQLite/Realm للتخزين المحلي
   - Sync Queue
   - Conflict Resolution

5. **GraphQL**
   - بدلاً من REST
   - أفضل للـ Mobile (أقل بيانات)

---

**📝 هذه الوثيقة حية - تُحدَّث مع تطور المشروع**

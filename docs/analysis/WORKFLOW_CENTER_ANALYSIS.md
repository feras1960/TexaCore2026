# 🔧 تحليل مركز إدارة سير العمل الموحد — TexaCore ERP

> **تاريخ التحليل:** 2026-02-10  
> **الحالة:** جاهز للمراجعة والتنفيذ  
> **الأولوية:** عالية — ميزة استراتيجية

---

## 📋 جدول المحتويات

1. [الرؤية والهدف](#1-الرؤية-والهدف)
2. [تحليل المحررات المرئية الحديثة](#2-تحليل-المحررات-المرئية-الحديثة)
3. [مقارنة المكتبات](#3-مقارنة-المكتبات)
4. [التوصية النهائية](#4-التوصية-النهائية)
5. [بنية المكون الجديد](#5-بنية-المكون-الجديد)
6. [تصميم الواجهة](#6-تصميم-الواجهة)
7. [البنية التقنية](#7-البنية-التقنية)
8. [خطة التنفيذ](#8-خطة-التنفيذ)

---

## 1. الرؤية والهدف

### المشكلة الحالية
- إعدادات سير العمل **متفرقة** في كل موديول (مبيعات، CRM، مشتريات)
- المحرر المرئي الحالي **بدائي** (SVG يدوي) — لا يدعم تعديل مباشر، لا Auto Layout
- لا يوجد مكان موحد لإدارة **السيناريوهات والأتمتة**
- صعوبة في فهم **الصورة الكاملة** لسير العمل عبر كل الموديولات

### الحل المطلوب
**مركز موحد لإدارة سير العمل** يشبه n8n في البساطة والقوة:
- ✅ صفحة مركزية واحدة (`/workflow-center`) فيها كل شيء
- ✅ محرر مرئي **احترافي** مع سحب وإفلات فعلي
- ✅ إمكانية **فتح أي سيناريو وتعديله** مباشرة
- ✅ نظرة شاملة على كل الموديولات والسيناريوهات
- ✅ سرعة عالية وأداء ممتاز

---

## 2. تحليل المحررات المرئية الحديثة

### كيف يعمل n8n؟
n8n يستخدم بنية ذكية من 4 طبقات:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: React Flow (الرسم والتفاعل)                   │
│  - Canvas مع Zoom/Pan                                    │
│  - عقد (Nodes) قابلة للسحب                               │
│  - أسهم ذكية (Edges) مع animations                       │
├─────────────────────────────────────────────────────────┤
│  Layer 2: State Management (Recoil/Zustand)             │
│  - حالة العقد والاتصالات                                  │
│  - Undo/Redo                                             │
│  - Sync مع Backend                                       │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Node Configuration Panel                      │
│  - لوحة إعدادات جانبية لكل عقدة                          │
│  - إعدادات ديناميكية حسب نوع العقدة                       │
│  - معاينة فورية                                          │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Data Transformer                              │
│  - تحويل الرسم البصري → JSON                             │
│  - تحويل JSON → أوامر Backend                            │
│  - حفظ/تحميل من قاعدة البيانات                           │
└─────────────────────────────────────────────────────────┘
```

### الممارسات الحديثة (2025-2026)

| الممارسة | الوصف | الأهمية |
|----------|-------|---------|
| **Node-Based UI** | كل خطوة = عقدة مرئية بألوان وأيقونات | 🔴 أساسية |
| **Auto Layout (ELK)** | ترتيب تلقائي ذكي للعقد | 🔴 أساسية |
| **Sidebar Config Panel** | لوحة جانبية لتعديل إعدادات كل عقدة | 🔴 أساسية |
| **Drag & Drop** | سحب أنواع العقد من شريط جانبي | 🟡 مهمة |
| **Minimap** | خريطة مصغرة للتنقل السريع | 🟡 مهمة |
| **Undo/Redo** | تراجع/إعادة التغييرات | 🟡 مهمة |
| **Keyboard Shortcuts** | اختصارات لوحة المفاتيح | 🟢 محسّنة |
| **Multi-select** | تحديد متعدد للعقد | 🟢 محسّنة |
| **Copy/Paste** | نسخ ولصق العقد | 🟢 محسّنة |
| **Snap to Grid** | محاذاة تلقائية للشبكة | 🟢 محسّنة |

---

## 3. مقارنة المكتبات

### المرشحون الرئيسيون

#### 🏆 @xyflow/react (React Flow 12) — **التوصية الأولى**
```
npm install @xyflow/react
```

| المعيار | التقييم |
|---------|---------|
| ⭐ GitHub Stars | 26,000+ |
| 📦 حجم Bundle | ~45KB gzipped |
| 🔧 التخصيص | ممتاز — العقد هي React Components عادية |
| 🚀 الأداء | ممتاز مع Memoization (100+ عقدة بسلاسة) |
| 📚 التوثيق | ممتاز ومحدث |
| 🌍 RTL | يدعم عبر CSS |
| 🔌 Plugins | ELK Layout, Dagre, Minimap, Controls, Background |
| 💰 الترخيص | MIT (مجاني) — Pro examples مدفوعة لكن غير ضرورية |
| 🏢 مستخدمون | n8n, Stripe, Typeform, Retool |

**المميزات:**
- ✅ نفس المكتبة التي يستخدمها **n8n** فعلاً
- ✅ عقد مخصصة = أي React component (نستخدم shadcn/ui!)
- ✅ Auto Layout مع ELK أو Dagre
- ✅ Minimap + Controls + Background مدمجة
- ✅ TypeScript بالكامل
- ✅ أداء ممتاز مع React.memo
- ✅ دعم Touch (للتابلت والموبايل)

**العيوب:**
- ⚠️ يحتاج memoization دقيق للأداء الأمثل
- ⚠️ بعض الأمثلة المتقدمة مدفوعة (Pro)

#### 2. Rete.js
```
npm install rete rete-area-plugin rete-connection-plugin rete-react-plugin
```

| المعيار | التقييم |
|---------|---------|
| ⭐ GitHub Stars | 10,000+ |
| 📦 حجم Bundle | ~60KB (مع plugins) |
| 🔧 التخصيص | جيد — يحتاج plugins كثيرة |
| 🚀 الأداء | ⚠️ مشاكل مع 40+ عقدة |
| 📚 التوثيق | متوسط |
| 💰 الترخيص | MIT |

**العيوب:**
- ❌ مشاكل أداء موثقة مع 40+ عقدة
- ❌ يحتاج plugins كثيرة للوظائف الأساسية
- ❌ مجتمع أصغر

#### 3. SVG يدوي (الحل الحالي)

| المعيار | التقييم |
|---------|---------|
| 🔧 التخصيص | كامل — لكن بتكلفة عالية |
| 🚀 الأداء | جيد لعدد قليل من العقد |
| 📚 التوثيق | لا يوجد |

**العيوب:**
- ❌ لا يوجد Auto Layout
- ❌ لا يدعم Drag & Drop حقيقي
- ❌ لا يوجد Minimap/Controls جاهزة
- ❌ صيانة مكلفة جداً
- ❌ إعادة اختراع العجلة

---

## 4. التوصية النهائية

### ✅ **@xyflow/react (React Flow 12)** مع ELK Layout

الأسباب:
1. **نفس ما يستخدمه n8n** — مثبت في الإنتاج
2. **أداء ممتاز** — مع memoization يتعامل مع مئات العقد
3. **مرونة كاملة** — العقد = React Components = نستخدم shadcn/ui مباشرة
4. **Auto Layout** — مع ELK أو Dagre ترتيب تلقائي ذكي
5. **مجتمع ضخم** — 26K+ stars, توثيق ممتاز
6. **TypeScript أصلاً** — يتوافق مع مشروعنا

### الحزم المطلوبة:
```bash
npm install @xyflow/react elkjs
```

| الحزمة | الغرض | الحجم |
|--------|-------|-------|
| `@xyflow/react` | المحرر المرئي | ~45KB |
| `elkjs` | Auto Layout ذكي | ~115KB (WASM) |
| **المجموع** | | **~160KB gzipped** |

---

## 5. بنية المكون الجديد

### هيكل الملفات المقترح

```
src/features/workflow-center/
├── WorkflowCenter.tsx              ← الصفحة الرئيسية
├── components/
│   ├── WorkflowCanvas.tsx          ← المحرر المرئي (React Flow)
│   ├── WorkflowSidebar.tsx         ← شريط جانبي (الموديولات + أنواع العقد)
│   ├── WorkflowToolbar.tsx         ← شريط أدوات (حفظ، تراجع، zoom...)
│   ├── NodeConfigPanel.tsx         ← لوحة إعدادات العقدة المحددة
│   ├── ModuleOverview.tsx          ← نظرة شاملة على كل الموديولات
│   ├── ScenarioManager.tsx         ← إدارة السيناريوهات الموحدة
│   └── nodes/                      ← أنواع العقد المخصصة
│       ├── StatusNode.tsx          ← عقدة حالة (مسودة، مؤكد...)
│       ├── ActionNode.tsx          ← عقدة إجراء (إشعار، بريد...)
│       ├── ConditionNode.tsx       ← عقدة شرط (إذا المبلغ > X)
│       ├── TriggerNode.tsx         ← عقدة مُحفِّز (عند إنشاء مستند)
│       └── IntegrationNode.tsx     ← عقدة تكامل (Telegram, AI...)
├── edges/
│   ├── WorkflowEdge.tsx            ← سهم مخصص مع metadata
│   └── ConditionalEdge.tsx         ← سهم شرطي (نعم/لا)
├── hooks/
│   ├── useWorkflowState.ts         ← إدارة حالة المحرر (Zustand)
│   ├── useAutoLayout.ts            ← ترتيب تلقائي مع ELK
│   ├── useWorkflowSync.ts          ← مزامنة مع Supabase
│   └── useUndoRedo.ts              ← تراجع/إعادة
├── utils/
│   ├── layoutEngine.ts             ← محرك الترتيب (ELK config)
│   ├── workflowTransformer.ts      ← تحويل بين DB ↔ React Flow
│   └── workflowValidator.ts        ← التحقق من صحة سير العمل
├── types/
│   └── workflow.types.ts           ← أنواع TypeScript
└── config/
    └── moduleConfigs.ts            ← تكوينات الموديولات (المُحدَّث)
```

---

## 6. تصميم الواجهة

### 6.1 الصفحة الرئيسية — مركز سير العمل

```
┌───────────────────────────────────────────────────────────────────┐
│  🔧 مركز إدارة سير العمل                    [+ سيناريو جديد]     │
│  إدارة موحدة لجميع مسارات العمل والأتمتة                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─── الموديولات ────────────────────────────────────────────┐   │
│  │                                                            │   │
│  │  🛒 المبيعات      👥 CRM           📦 المشتريات            │   │
│  │  ┌──────────┐    ┌──────────┐     ┌──────────┐            │   │
│  │  │ 5 أنواع  │    │ 5 أنواع  │     │ 4 أنواع  │            │   │
│  │  │ 20 حالة  │    │ 18 حالة  │     │ 16 حالة  │            │   │
│  │  │ 4 أتمتة  │    │ 4 أتمتة  │     │ 3 أتمتة  │            │   │
│  │  │ [فتح ←]  │    │ [فتح ←]  │     │ [فتح ←]  │            │   │
│  │  └──────────┘    └──────────┘     └──────────┘            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─── السيناريوهات النشطة ────────────────────────────────────┐  │
│  │                                                             │  │
│  │  ✅ إشعار Telegram عند تأكيد الطلب        [مبيعات] [تعديل]│  │
│  │  ✅ مساعد AI للعروض                       [CRM]    [تعديل]│  │
│  │  ✅ إنشاء فاتورة تلقائي                   [مبيعات] [تعديل]│  │
│  │  ⏸ تذكير متابعة الصفقات                  [CRM]    [تعديل]│  │
│  │  ⏸ إشعار تأخر التسليم                    [مشتريات][تعديل]│  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── آخر التغييرات ──────────────────────────────────────────┐  │
│  │  🕐 منذ 5 دقائق — تعديل مسار عرض السعر (المبيعات)         │  │
│  │  🕐 منذ 1 ساعة — تفعيل إشعار Telegram (CRM)               │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 6.2 محرر سير العمل المرئي (عند فتح موديول)

```
┌───────────────────────────────────────────────────────────────────┐
│  ← رجوع    المبيعات > عرض السعر    [حفظ] [تراجع] [إعادة] [⤢]   │
├───────┬───────────────────────────────────────────────┬───────────┤
│       │                                               │           │
│ أنواع │                                               │  إعدادات │
│ العقد │     ┌────────┐                                │  العقدة  │
│       │     │▶ مسودة │←──── [العقدة المحددة]          │           │
│ ──────│     └───┬────┘                                │ الاسم:   │
│ 📄 حالة│        │                                     │ [مسودة]  │
│ ⚡ إجراء│        ▼                                     │           │
│ 🔀 شرط │     ┌────────┐     ┌──────────┐              │ اللون:   │
│ 🔔 إشعار│     │● مُرسل │────→│✓ مقبول   │              │ [أزرق ▼] │
│ 🤖 AI  │     └───┬────┘     └──────────┘              │           │
│ 📧 بريد │        │                                     │ ابتدائية:│
│       │         ▼                                     │ [✓]      │
│       │     ┌────────┐                                │           │
│       │     │✗ مرفوض │                                │ نهائية:  │
│       │     └────────┘                                │ [  ]     │
│       │                                               │           │
│       │  ┌──────────────────────┐                     │ الأدوار: │
│       │  │ 🗺 Minimap           │                     │ ☑ مدير   │
│       │  │ ┌──┐                 │                     │ ☑ مبيعات │
│       │  │ │  │                 │                     │ ☐ مستودع │
│       │  │ └──┘                 │                     │           │
│       │  └──────────────────────┘                     │ إجراءات: │
│       │                                               │ [+إضافة] │
├───────┴───────────────────────────────────────────────┴───────────┤
│  ← عرض السعر │ أمر البيع │ إذن التسليم │ الفاتورة │ + نوع جديد  │
└───────────────────────────────────────────────────────────────────┘
```

### 6.3 أنواع العقد المخصصة

```
 ┌─── Status Node ───┐   ┌─── Action Node ───┐   ┌── Condition Node ──┐
 │  ●                │   │  ⚡                │   │  🔀                │
 │   مُرسل           │   │   إشعار Telegram  │   │   المبلغ > 5000?   │
 │   sent            │   │   عند التأكيد      │   │                    │
 │                   │   │                    │   │   ┌──┐    ┌──┐     │
 │  ○───────────○    │   │   📧 Email ✓       │   │   │نعم│    │لا│     │
 │  In         Out   │   │   📱 Telegram ✓    │   │   └──┘    └──┘     │
 └───────────────────┘   │   🔔 In-App ✓      │   └────────────────────┘
                         └────────────────────┘
                         
 ┌── Trigger Node ───┐   ┌── Integration ─────┐
 │  🎯               │   │  🔌                │
 │  عند إنشاء        │   │  Supabase Function │
 │  عرض سعر          │   │  update_inventory  │
 │                   │   │                    │
 │  ○────────────    │   │  ○─────────○       │
 │        Out        │   │  In       Out      │
 └───────────────────┘   └────────────────────┘
```

---

## 7. البنية التقنية

### 7.1 تدفق البيانات

```
Supabase DB                    React Flow               UI
┌──────────────┐    load     ┌──────────────┐         ┌──────────┐
│status_groups │──────────→  │  nodes[]     │────────→│ Canvas   │
│custom_statuses│             │  edges[]     │         │ Minimap  │
│transitions   │  ←────────  │  viewport    │←────────│ Controls │
│              │    save     │              │         │ Sidebar  │
└──────────────┘             └──────────────┘         └──────────┘
                                    ↕
                             ┌──────────────┐
                             │ ELK Layout   │
                             │ Engine       │
                             └──────────────┘
```

### 7.2 تحويل البيانات (DB ↔ React Flow)

```typescript
// من قاعدة البيانات → React Flow
function dbToReactFlow(statuses: CustomStatus[], transitions: StatusTransition[]): {
    nodes: Node[];
    edges: Edge[];
} {
    const nodes = statuses.map((status, i) => ({
        id: status.id,
        type: 'statusNode',
        data: {
            label: status.name_ar,
            labelEn: status.name_en,
            code: status.code,
            color: status.color,
            isInitial: status.is_initial,
            isFinal: status.is_final,
        },
        position: { x: 0, y: 0 }, // ELK سيحدد الموقع
    }));

    const edges = transitions.map(t => ({
        id: t.id,
        source: t.from_status_id,
        target: t.to_status_id,
        type: 'workflowEdge',
        data: {
            requiresApproval: t.requires_approval,
            requiresComment: t.requires_comment,
            allowedRoles: t.allowed_roles,
        },
    }));

    return { nodes, edges };
}
```

### 7.3 محرك الترتيب التلقائي (ELK)

```typescript
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

async function getLayoutedElements(nodes: Node[], edges: Edge[]) {
    const graph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',        // من أعلى لأسفل
            'elk.spacing.nodeNode': '80',    // مسافة بين العقد
            'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        },
        children: nodes.map(node => ({
            id: node.id,
            width: 200,
            height: 80,
        })),
        edges: edges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
        })),
    };

    const layouted = await elk.layout(graph);
    
    return {
        nodes: nodes.map(node => {
            const elkNode = layouted.children?.find(n => n.id === node.id);
            return {
                ...node,
                position: {
                    x: elkNode?.x ?? 0,
                    y: elkNode?.y ?? 0,
                },
            };
        }),
        edges,
    };
}
```

### 7.4 عقدة مخصصة (StatusNode)

```tsx
import { Handle, Position, NodeProps } from '@xyflow/react';

function StatusNode({ data, selected }: NodeProps) {
    const colorMap = {
        blue: 'border-blue-400 bg-blue-50',
        green: 'border-green-400 bg-green-50',
        red: 'border-red-400 bg-red-50',
        // ...
    };

    return (
        <div className={cn(
            'px-4 py-3 rounded-xl border-2 shadow-sm min-w-[180px]',
            'transition-all duration-200',
            colorMap[data.color],
            selected && 'ring-2 ring-indigo-500 shadow-lg'
        )}>
            {/* Handles (نقاط الاتصال) */}
            <Handle type="target" position={Position.Top} />
            
            <div className="flex items-center gap-2">
                {data.isInitial && <span className="w-2 h-2 rounded-full bg-green-500" />}
                {data.isFinal && <span className="w-2 h-2 rounded-full bg-red-500" />}
                <div>
                    <p className="font-semibold text-sm">{data.label}</p>
                    <p className="text-[10px] text-gray-400">{data.code}</p>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}
```

---

## 8. خطة التنفيذ

### المرحلة 1: البنية الأساسية (يوم 1)
```
□ تثبيت @xyflow/react و elkjs
□ إنشاء هيكل الملفات
□ إنشاء WorkflowCanvas مع React Flow
□ إنشاء StatusNode المخصص
□ تطبيق Auto Layout مع ELK
□ ربط مع statusService الحالي
```

### المرحلة 2: التفاعل والتعديل (يوم 1-2)
```
□ إنشاء NodeConfigPanel (لوحة إعدادات العقدة)
□ إنشاء WorkflowSidebar (أنواع العقد + Drag & Drop)
□ إنشاء WorkflowToolbar (حفظ، تراجع، zoom)
□ تطبيق إضافة/حذف عقد وأسهم
□ تطبيق Undo/Redo
```

### المرحلة 3: مركز سير العمل الموحد (يوم 2)
```
□ إنشاء صفحة WorkflowCenter الرئيسية
□ إنشاء ModuleOverview (بطاقات الموديولات)
□ إنشاء ScenarioManager (إدارة السيناريوهات الموحدة)
□ ربط مع Router
□ إضافة في Sidebar الرئيسي
```

### المرحلة 4: السيناريوهات المتقدمة (يوم 2-3)
```
□ إنشاء ActionNode, ConditionNode, TriggerNode
□ إنشاء محرر السيناريوهات (مثل n8n)
□ ربط مع n8n workflows الموجودة
□ إنشاء WorkflowEdge المخصص
```

### المرحلة 5: التنظيف والتحسين (يوم 3)
```
□ حذف WorkflowVisualEditor.tsx القديم
□ تحديث SalesWorkflowSettings لاستخدام المحرر الجديد
□ تحديث CRM و Purchases
□ تحسين الأداء (memoization)
□ اختبار RTL
□ اختبار شامل
```

---

## مقارنة: قبل وبعد

| الميزة | الحالي (SVG يدوي) | الجديد (React Flow + ELK) |
|--------|-------------------|---------------------------|
| Auto Layout | ❌ | ✅ ترتيب ذكي تلقائي |
| Drag & Drop | ⚠️ محدود | ✅ كامل مع Snap |
| تعديل مباشر | ❌ | ✅ إضافة/حذف/تعديل عقد |
| Minimap | ⚠️ بسيط | ✅ تفاعلي |
| لوحة إعدادات | ❌ | ✅ لوحة جانبية كاملة |
| Undo/Redo | ❌ | ✅ |
| Zoom/Pan | ⚠️ بسيط | ✅ سلس |
| أنواع عقد | ❌ حالات فقط | ✅ حالات + إجراءات + شروط |
| أداء 100+ عقدة | ⚠️ بطيء | ✅ سلس |
| صيانة | ❌ صعبة جداً | ✅ مكتبة مدعومة |
| مركز موحد | ❌ | ✅ صفحة مركزية |
| سيناريوهات | ⚠️ متفرقة | ✅ موحدة قابلة للتعديل |

---

## الخلاصة

> **التوصية:** حذف المحرر الحالي بالكامل وإعادة بنائه مع `@xyflow/react` + `elkjs` في مركز سير عمل موحد. النتيجة ستكون محرر **بمستوى n8n** مدمج داخل TexaCore ERP، مما يعطي ميزة تنافسية قوية جداً.

---

*تم إعداد هذا التحليل بواسطة Antigravity AI — فبراير 2026*

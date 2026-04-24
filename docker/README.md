# 🐳 TexaCore Desktop — Docker Setup

## ما هذا؟
هذا المجلد يحتوي على **Supabase Self-Hosted** كاملة تعمل محلياً عبر Docker.
الهدف: تشغيل نفس كود النسخة السحابية على كمبيوتر المستخدم **بدون أي تعديل**.

## البنية
```
docker/
├── docker-compose.yml       ← تعريف كل الخدمات
├── .env.example             ← متغيرات البيئة (انسخه إلى .env)
├── migrations-init.sh       ← يطبّق الـ migrations تلقائياً عند أول تشغيل
├── volumes/
│   ├── api/
│   │   └── kong.yml         ← Kong API Gateway routes
│   └── db/
│       ├── roles.sql        ← Supabase roles (anon, authenticated, etc.)
│       ├── jwt.sql          ← JWT helper functions (auth.uid(), auth.jwt())
│       ├── realtime.sql     ← Realtime schema
│       └── webhooks.sql     ← Functions schema
└── README.md                ← هذا الملف
```

## الخدمات
| الخدمة | المنفذ | الوظيفة |
|--------|--------|---------|
| Kong | 54321 | API Gateway — نقطة الدخول الموحدة |
| PostgreSQL | 54322 | قاعدة البيانات |
| PostgREST | (داخلي) | REST API — يخدم `supabase.from()` |
| GoTrue | (داخلي) | Auth — يخدم `supabase.auth` |
| Realtime | (داخلي) | WebSocket — يخدم `supabase.channel()` |
| Storage | (داخلي) | File uploads |

## التشغيل
```bash
# 1. انسخ متغيرات البيئة
cp .env.example .env

# 2. شغّل كل الخدمات
docker compose up -d

# 3. تحقق من الحالة
docker compose ps

# 4. شاهد السجلات
docker compose logs -f db
```

## الإيقاف
```bash
docker compose down          # إيقاف بدون حذف البيانات
docker compose down -v       # ⚠️ إيقاف + حذف البيانات
```

## الاتصال من Frontend
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://localhost:54321',  // Kong API Gateway
  'ANON_KEY_FROM_ENV'
)
```

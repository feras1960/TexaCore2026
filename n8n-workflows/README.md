# 🔗 TexaCore ERP — n8n Integration Hub

## 🏗️ البنية المعمارية (REST API Mode)

```
TexaCore Frontend (React)
        │
        ▼
   Supabase (DB + Auth + REST API)
        │
        ├── REST API (PostgREST) ◄──► n8n HTTP Request Nodes
        ├── RPC Functions ◄─────────► n8n (get_daily_stats, get_fund_balances, etc.)
        └── Webhook (from n8n) ◄────► Frontend Events
                                       │
                                       ├──► Telegram Bot (@Texacorebot)
                                       ├──► Google Gemini AI
                                       ├──► Email (SMTP)
                                       └──► Future: Shipping, Banks
```

> ⚠️ **ملاحظة**: نستخدم REST API بدلاً من PostgreSQL المباشر لأن Supabase Free Tier لا يدعم IPv4.

---

## ✅ البيانات المتوفرة

| البند | القيمة | الحالة |
|-------|--------|--------|
| Supabase URL | `https://wzkklenfsaepegymfxfz.supabase.co` | ✅ |
| API Key | `sb_publishable_rxiau7D...` | ✅ |
| Telegram Bot | `@Texacorebot` | ✅ |
| Telegram Chat ID | `866145826` | ✅ |
| Bot Token | `8473654046:AAE1Sn...` | ✅ |
| Gemini API Key | `YOUR_GEMINI_API_KEY` | ⏳ |

---

## 📂 ملفات Workflows

| الملف | الوظيفة |
|-------|---------|
| `01-telegram-notifications.json` | 🔔 تنبيهات فورية عند أحداث ERP |
| `02-daily-report.json` | 📊 تقرير يومي آلي (REST API) |
| `03-ai-telegram-assistant.json` | 🤖 مساعد AI عبر Telegram (Gemini + REST) |
| `supabase-rpc-functions.sql` | 🗄️ دوال RPC للتقارير (شغلها أولاً!) |
| `supabase-webhook-trigger.sql` | 🔔 Trigger للأحداث |

---

## 🚀 خطوات التشغيل

### 1. شغّل دوال RPC في Supabase
1. افتح Supabase Dashboard → **SQL Editor**
2. الصق محتوى `supabase-rpc-functions.sql`
3. اضغط **Run**

### 2. استورد Workflow في n8n
1. افتح http://localhost:5678
2. **+ Add Workflow** → `⋯` → **Import from File**
3. اختر ملف JSON
4. عدّل `TELEGRAM_CREDENTIAL_ID` بالـ credential الموجود
5. **Save** ثم **Activate**

### 3. (اختياري) أضف Gemini API Key
1. احصل على مفتاح من https://aistudio.google.com/apikey
2. عدّل `YOUR_GEMINI_API_KEY` في workflow المساعد الذكي

---

## 🧪 اختبار سريع

```bash
# اختبار REST API
curl -s "https://wzkklenfsaepegymfxfz.supabase.co/rest/v1/rpc/get_daily_stats" \
  -H "apikey: sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN" \
  -H "Content-Type: application/json" \
  -d '{}'

# إرسال رسالة تجريبية
curl -s -X POST "https://api.telegram.org/bot8473654046:AAE1SnYSAxxVqFPvtPqNAzDtIbir7ot1UJY/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 866145826, "text": "✅ Test message"}'
```

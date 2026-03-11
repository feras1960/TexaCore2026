---
description: الاتصال المباشر بـ Supabase عبر psql لتنفيذ SQL
---
// turbo-all

## بيانات الاتصال

- **Project Ref:** `wzkklenfsaepegymfxfz`
- **Host:** `aws-1-eu-west-2.pooler.supabase.com`
- **Port:** `6543` (pooler) / `5432` (direct)
- **User:** `postgres.wzkklenfsaepegymfxfz`
- **Database:** `postgres`
- **Password:** `EH7NytvJA#t/yEE`

## مفاتيح API

- **Supabase URL:** `https://wzkklenfsaepegymfxfz.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI`
- **Service Role Key (new format):** `sb_secret_4vNNngjrYMr_S4hp6oUYyg_tN1_8dRE`
- **Publishable Key:** `sb_publishable_rxiau7DKoVelPDOs6vh7Xg_S7yxJQoN`

## الاتصال السريع عبر psql

```bash
PGPASSWORD='EH7NytvJA#t/yEE' psql "postgresql://postgres.wzkklenfsaepegymfxfz@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require" -c "YOUR_SQL_HERE"
```

## أمثلة

### استعلام سريع
```bash
PGPASSWORD='EH7NytvJA#t/yEE' psql "postgresql://postgres.wzkklenfsaepegymfxfz@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT code, name_ar FROM roles ORDER BY code;"
```

### تنفيذ ملف migration
```bash
PGPASSWORD='EH7NytvJA#t/yEE' psql "postgresql://postgres.wzkklenfsaepegymfxfz@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require" -f path/to/migration.sql
```

### ملاحظات
- psql path: `/usr/local/opt/postgresql@16/bin/psql`
- Supabase CLI: `/usr/local/bin/supabase` (v2.72.7)
- الـ Supabase CLI لا يدعم `db execute` — استخدم psql مباشرة
- الـ anon key لا يتجاوز RLS — psql يتجاوزها لأنه postgres user مباشر
- الـ `DATABASE_URL` موجود في `.env.local`
- لا يوجد عمود `display_order` في جدول `roles`
- Service Role Key مخزن أيضاً في vault.secrets (اسم: service_role_key)


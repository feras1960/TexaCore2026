# ⚡ البدء السريع - 3 خطوات فقط!
# Quick Start - Just 3 Steps!

---

## 🎯 **الخطوة 1: شغّل سكريبت الإعداد**

```bash
./setup_connection.sh
```

سيطلب منك:
1. الموافقة على الإعداد
2. لصق Connection String من Supabase
3. سيختبر الاتصال تلقائياً

---

## 🎯 **الخطوة 2: اتصل بالقاعدة**

```bash
./connect.sh
```

---

## 🎯 **الخطوة 3: استخدم القاعدة!**

```bash
# داخل psql:
\dt                              # عرض الجداول
SELECT COUNT(*) FROM customers;  # استعلام
\q                               # خروج
```

---

## 📚 **الأوامر المتاحة:**

| الأمر | الوصف |
|------|-------|
| `./setup_connection.sh` | إعداد الاتصال (مرة واحدة) |
| `./connect.sh` | الاتصال بالقاعدة |
| `./run.sh file.sql` | تنفيذ ملف SQL |
| `./test.sh` | تشغيل الاختبارات |
| `./backup.sh` | نسخة احتياطية |

---

## ❓ **المساعدة:**

- 📖 **دليل خطوة بخطوة:** `SETUP_CONNECTION_STEP_BY_STEP.md`
- 📚 **دليل CLI كامل:** `CLI_DATABASE_CONNECTION_GUIDE.md`
- ⚡ **دليل سريع:** `CLI_QUICK_START.md`

---

## 🔑 **أين أحصل على Connection String؟**

1. https://supabase.com/dashboard
2. اختر مشروعك
3. Settings → Database
4. انسخ من "Connection pooling"

---

**🚀 ابدأ الآن:**
```bash
./setup_connection.sh
```

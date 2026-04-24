# 🖥️ TexaCore ERP — Desktop Edition Installation Guide
# دليل تثبيت نسخة سطح المكتب

---

## 📋 متطلبات النظام / System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10+, macOS 12+, Ubuntu 22+ | Windows 11, macOS 14+ |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 2 GB free | 5 GB free |
| **Docker** | Docker Desktop 4.0+ | Latest version |

---

## 🚀 طريقة التثبيت السريعة (Quick Start)

### الخطوة 1: تثبيت Docker Desktop

<details>
<summary>🪟 Windows</summary>

1. حمّل من: https://www.docker.com/products/docker-desktop
2. شغّل المثبّت واتبع التعليمات
3. أعد تشغيل الكمبيوتر إذا طُلب
4. افتح Docker Desktop وانتظر حتى يصبح "Running"
</details>

<details>
<summary>🍎 macOS</summary>

1. حمّل من: https://www.docker.com/products/docker-desktop
2. اسحب التطبيق إلى مجلد Applications
3. افتح Docker Desktop من Applications
4. انتظر حتى تظهر أيقونة الحوت الأخضر في الشريط العلوي
</details>

<details>
<summary>🐧 Linux (Ubuntu/Debian)</summary>

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin

# Logout and login again, then verify:
docker compose version
```
</details>

### الخطوة 2: تحميل TexaCore

```bash
# Clone the repository
git clone https://github.com/feras1960/TexaCore2026.git
cd TexaCore2026
```

### الخطوة 3: إعداد البيئة

```bash
# Copy environment file
cd docker
cp .env.example .env

# (Optional) Edit .env to change passwords:
# nano .env
```

### الخطوة 4: تشغيل الخدمات

```bash
# Start all services (first time may take 2-5 minutes to download images)
docker compose up -d

# Check status
docker compose ps
```

**يجب أن ترى 6 خدمات Running:**
```
texacore-desktop-kong-1      Running   0.0.0.0:54321->8000/tcp
texacore-desktop-db-1        Running   0.0.0.0:54322->5432/tcp
texacore-desktop-rest-1      Running
texacore-desktop-auth-1      Running
texacore-desktop-realtime-1  Running
texacore-desktop-storage-1   Running
```

### الخطوة 5: تشغيل التطبيق

```bash
# Go back to project root
cd ..

# Install dependencies (first time only)
npm install

# Start the app
npm run dev
```

### الخطوة 6: فتح المتصفح

افتح: **http://localhost:5173**

سيظهر **معالج الإعداد الأولي** (9 خطوات):
1. 🌐 اختيار اللغة
2. 🏢 بيانات الشركة
3. 💰 العملات
4. 👤 المستخدم المدير
5. 📊 شجرة الحسابات
6. 🧾 الضرائب
7. 💾 مكان الحفظ
8. ☁️ Google Drive
9. ✅ ملخص وإنشاء

---

## 🔧 الأوامر المفيدة / Useful Commands

```bash
# ─── Start/Stop ───────────────────────────────
docker compose up -d          # Start all services
docker compose down           # Stop all services
docker compose restart        # Restart all services

# ─── Logs ─────────────────────────────────────
docker compose logs -f        # All logs (live)
docker compose logs -f db     # Database logs only
docker compose logs -f auth   # Auth logs only

# ─── Backup ──────────────────────────────────
# Create manual backup
docker exec texacore-desktop-db-1 pg_dump -U postgres -d postgres > backup.sql

# Restore from backup
cat backup.sql | docker exec -i texacore-desktop-db-1 psql -U postgres -d postgres

# ─── Reset ───────────────────────────────────
# ⚠️ WARNING: This deletes ALL data!
docker compose down -v        # Stop + delete all data
docker compose up -d          # Start fresh
```

---

## 🌐 المنافذ / Ports

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | `54321` | Main API endpoint (PostgREST + Auth + Storage) |
| **PostgreSQL** | `54322` | Direct database access |
| **App** | `5173` | Web interface |

---

## ❓ حل المشاكل / Troubleshooting

### Docker لا يعمل
```bash
# Check if Docker is running
docker info

# If not, start Docker Desktop manually
```

### الخدمات لا تبدأ
```bash
# Check logs for errors
docker compose logs --tail 50

# Try recreating
docker compose down
docker compose up -d
```

### نسيت كلمة المرور
```bash
# Connect to database directly
docker exec -it texacore-desktop-db-1 psql -U postgres

# Reset user password (replace email)
UPDATE auth.users SET encrypted_password = crypt('newpassword', gen_salt('bf'))
WHERE email = 'admin@company.local';
```

### المساحة ممتلئة
```bash
# Check Docker disk usage
docker system df

# Clean unused images/containers
docker system prune -a
```

---

## 📱 الوصول من أجهزة أخرى على نفس الشبكة

1. اعرف IP الكمبيوتر:
   - Windows: `ipconfig`
   - macOS/Linux: `ifconfig` أو `ip addr`

2. افتح من جهاز آخر:
   ```
   http://192.168.1.XXX:5173
   ```

3. تأكد أن الفايروول يسمح بالمنافذ: `5173`, `54321`

---

## 📞 الدعم / Support

- 📧 Email: support@texacore.com
- 📖 Docs: https://docs.texacore.com
- 🐛 Issues: https://github.com/feras1960/TexaCore2026/issues

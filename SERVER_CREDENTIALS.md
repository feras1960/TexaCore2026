# 🔐 بيانات اتصال السيرفر — TexaCore PBX Server

> ⚠️ **هذا الملف سري — لا تشاركه مع أحد ولا ترفعه إلى GitHub**
> آخر تحديث: 17 مايو 2026

## 📡 بيانات السيرفر الأساسية

| البيان | القيمة |
|---|---|
| **المزود** | Hostinger VPS (KVM 4) |
| **اسم السيرفر** | srv1264998.hstgr.cloud |
| **IP** | `153.92.222.17` |
| **نظام التشغيل** | Ubuntu 24.04 LTS |
| **الموقع** | Germany |
| **RAM** | 16 GB |
| **Disk** | 200 GB |

## 🔑 بيانات الدخول

| الخدمة | المستخدم | كلمة المرور |
|---|---|---|
| **SSH (Root)** | `root` | `bF8ayJJuFw@1` |

## 🌐 الدومينات والمنافذ

| الخدمة | العنوان | المنفذ |
|---|---|---|
| **PBX WebSocket (WSS)** | `wss://pbx.texacore.ai:8089/ws` | 8089 |
| **NexaConnect Web** | `https://pbx.texacore.ai:8444` | 8444 |
| **MeshCentral** | `https://pbx.texacore.ai` | 443 |
| **LiveKit Server** | `ws://153.92.222.17:7880` | 7880 |
| **LiveKit RTC (TCP)** | `153.92.222.17:7881` | 7881 |
| **SSH** | `ssh root@153.92.222.17` | 22 |

## 🎙️ بيانات LiveKit

| البيان | القيمة |
|---|---|
| **API Key** | `APITexaCore456c6933` |
| **API Secret** | `nDHIRsHgpmAz4q/ZffiXbryVETnB6U70h0Ip3xAIYJQ=` |
| **الإصدار** | 1.12.0 |
| **Config Path** | `/etc/livekit/livekit.yaml` |

## 🛡️ الحماية المُفعّلة

| الحماية | الحالة |
|---|---|
| **UFW Firewall** | ✅ مُفعّل (المنافذ: 22, 80, 443, 7880, 7881, 8089, 8444) |
| **Fail2Ban** | ✅ مُثبت ومُفعّل |

## 📋 الخدمات المثبتة

| الخدمة | الإصدار | الحالة |
|---|---|:---:|
| Ubuntu | 24.04 LTS | ✅ |
| UFW + Fail2Ban | Latest | ✅ |
| Asterisk | 20.6.0 | ✅ |
| Nginx | 1.24.0 | ✅ |
| Certbot | 2.9.0 | ✅ |
| Node.js | 22.22.2 | ✅ |
| LiveKit Server | 1.12.0 | ✅ |
| MeshCentral | Latest | ✅ |

## 📁 النسخة الاحتياطية

| البيان | القيمة |
|---|---|
| **المسار المحلي** | `server_backup_rescue.tar.gz` |
| **الحجم** | 24 MB (238 ملف) |
| **التاريخ** | 17 مايو 2026 |
| **المحتوى** | Asterisk + Nginx + SSL + MeshCentral (تمت الاستعادة بنجاح) |

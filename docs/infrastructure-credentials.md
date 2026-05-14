# 🏗️ TexaCore Infrastructure — بيانات الاتصال والسيرفرات

> [!CAUTION]
> هذا الملف يحتوي على بيانات حساسة. لا تشاركه أو ترفعه على Git.

---

## 1. سيرفر VPS (Hostinger)

| المعلومة | القيمة |
|----------|--------|
| **المزود** | Hostinger VPS |
| **Hostname** | `srv1264998.hstgr.cloud` |
| **IP Address** | `153.92.222.17` |
| **DNS** | `pbx.texacore.ai` |
| **SSH User** | `root` |
| **SSH Password** | `XBe-W+ehuTRm/gz5` |
| **لوحة التحكم** | https://hpanel.hostinger.com/vps/1264998/settings |

---

## 2. Asterisk PBX

| المعلومة | القيمة |
|----------|--------|
| **الإصدار** | Asterisk PBX 20.19.0 |
| **مسار الإعدادات** | `/etc/asterisk/` |
| **PJSIP Config** | `/etc/asterisk/pjsip.conf` |
| **Extensions Config** | `/etc/asterisk/extensions.conf` |
| **WebSocket Port** | `8089` (WSS) |
| **SIP Port** | `5060` (UDP/TCP) |
| **RTP Ports** | `10000-10100` |
| **SSL Cert** | `/etc/letsencrypt/live/pbx.texacore.ai/` |

### WebRTC Guest Endpoint (Click-to-Call)
| المعلومة | القيمة |
|----------|--------|
| **Username** | `webrtc_guest` |
| **Password** | `TxC_W3bRTC_Gu3st_2026!` |
| **Config File** | `/etc/asterisk/pjsip_webrtc_guest.conf` |
| **Dialplan File** | `/etc/asterisk/extensions_click_to_call.conf` |
| **Context** | `click-to-call-context` |
| **Allowed Extension** | `700` (IVR only) |

### SIP Extension (ERP Softphone)
| المعلومة | القيمة |
|----------|--------|
| **Username** | `100` |
| **Password** | `TexaCore2026Pbx100` |
| **Env Variable** | `VITE_SIP_PASSWORD` |

---

## 3. الخدمات المُستضافة على نفس السيرفر

| الخدمة | المنفذ | الحالة |
|--------|--------|--------|
| **Asterisk PBX** | 5060, 8089 | ✅ Active |
| **MeshCentral (MDM)** | 443 | ✅ Active |
| **Nginx Reverse Proxy** | 80, 443 | ✅ Active |

---

## 4. DNS Records

| Record | Type | Value |
|--------|------|-------|
| `pbx.texacore.ai` | A | `153.92.222.17` |
| `mdm.texacore.ai` | A | `153.92.222.17` |

---

## 5. أوامر مفيدة

```bash
# الاتصال بالسيرفر
sshpass -p 'XBe-W+ehuTRm/gz5' ssh root@153.92.222.17

# إعادة تحميل Asterisk
asterisk -rx "module reload res_pjsip.so"
asterisk -rx "dialplan reload"

# فحص الـ endpoints
asterisk -rx "pjsip show endpoints"

# مشاهدة المكالمات النشطة
asterisk -rx "core show channels"

# مشاهدة سجلات Asterisk
tail -f /var/log/asterisk/messages
```

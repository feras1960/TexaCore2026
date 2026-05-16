# NexaConnect PBX — مهام التشفير وتجاوز الحجب

## معلومات السيرفر
- **IP:** 153.92.222.17
- **SSH:** root / XBe-W+ehuTRm/gz5
- **Domain:** pbx.texacore.ai
- **TLS Certs:** /etc/letsencrypt/live/pbx.texacore.ai/
- **Asterisk Config:** /etc/asterisk/pjsip.conf
- **TURN Config:** /etc/turnserver.conf
- **Web App:** /var/www/nexa-connect/

---

## المهمة 1: تفعيل TURN Server

coturn مثبّت لكن معطّل. الإعدادات جاهزة في `/etc/turnserver.conf`.

```bash
# تفعيل وتشغيل
systemctl enable coturn
systemctl start coturn
systemctl status coturn

# تأكد أنه يستمع
ss -tlnup | grep -E '3478|5349'
```

**مشكلة Port 443:** Docker يستخدمه حالياً. الحل:
- أضف في `/etc/turnserver.conf`:
```
alt-tls-listening-port=443
```
- أوقف Docker مؤقتاً أو غيّر port الـ Docker container، ثم أعد تشغيل coturn.
- أو استخدم nginx stream module لتوزيع 443 بين HTTPS و TURN.

---

## المهمة 2: إضافة SRTP صريح في pjsip.conf

أضف هذين السطرين لكل endpoint (100, 101, 102, 103) في `/etc/asterisk/pjsip.conf`:

```ini
media_encryption=dtls
media_encryption_optimistic=yes
```

ثم:
```bash
asterisk -rx "pjsip reload"
```

---

## المهمة 3: إضافة SIP TLS Transport

أضف في `/etc/asterisk/pjsip.conf`:

```ini
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:5061
cert_file=/etc/letsencrypt/live/pbx.texacore.ai/fullchain.pem
priv_key_file=/etc/letsencrypt/live/pbx.texacore.ai/privkey.pem
method=tlsv1_2
```

وغيّر transport-tcp ليستمع على localhost فقط:
```ini
[transport-tcp]
type=transport
protocol=tcp
bind=127.0.0.1:5060
```

ثم:
```bash
systemctl restart asterisk
```

---

## المهمة 4: تفعيل الجدار الناري

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp          # SSH
ufw allow 80/tcp          # HTTP
ufw allow 443/tcp         # HTTPS + TURN TLS
ufw allow 8089/tcp        # Asterisk WSS
ufw allow 8444/tcp        # NexaConnect Web
ufw allow 3478/udp        # STUN/TURN
ufw allow 3478/tcp        # TURN TCP
ufw allow 5349/tcp        # TURN TLS
ufw allow 5061/tcp        # SIP TLS
ufw allow 49152:49252/udp # RTP media
ufw --force enable
ufw status verbose
```

---

## المهمة 5: تحديث ICE Servers في التطبيق

الملف: `nexa_connect/lib/core/services/sip_service.dart`

ابحث عن `iceServers` أو `RTCPeerConnection` وأضف/حدّث:

```dart
iceServers: [
  {'urls': 'stun:pbx.texacore.ai:3478'},
  {
    'urls': 'turn:pbx.texacore.ai:3478?transport=udp',
    'username': 'nexaturn',
    'credential': 'NexaTurn2026!'
  },
  {
    'urls': 'turns:pbx.texacore.ai:5349?transport=tcp',
    'username': 'nexaturn',
    'credential': 'NexaTurn2026!'
  },
]
```

بعدها:
```bash
cd nexa_connect
flutter clean && flutter pub get
flutter build web --release --no-tree-shake-icons
scp -r build/web/* root@153.92.222.17:/var/www/nexa-connect/
```

---

## التحقق النهائي

```bash
# 1. TURN يعمل
turnutils_uclient -T -u nexaturn -w 'NexaTurn2026!' pbx.texacore.ai

# 2. TLS يعمل
openssl s_client -connect pbx.texacore.ai:5061 -brief

# 3. WSS يعمل
curl -k https://pbx.texacore.ai:8089/ws

# 4. Firewall فعّال
ufw status

# 5. اختبار من المتصفح
# افتح https://pbx.texacore.ai:8444 وجرّب مكالمة
```

---

## ترتيب التنفيذ المقترح
1. ✅ المهمة 2 (SRTP) — أسهل، سطرين فقط
2. ✅ المهمة 1 (TURN) — أهم شيء
3. ✅ المهمة 5 (ICE Servers) — يربط TURN مع التطبيق
4. ✅ المهمة 3 (SIP TLS) — تشفير إضافي
5. ✅ المهمة 4 (Firewall) — آخر شيء لتجنب قفل نفسك

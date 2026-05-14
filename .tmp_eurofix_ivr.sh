#!/bin/bash
set -e

echo "=== EuroFix IVR Setup ==="

# Download all 4 voice files
echo "[1/6] Downloading voice files..."
curl -s -o /tmp/ef-greeting.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/ivr/texacore-greeting-1778694791609.mp3"
curl -s -o /tmp/ef-hold.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/ivr/texacore-greeting-1778694806463.mp3"
curl -s -o /tmp/ef-ooo.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/ivr/texacore-greeting-1778694826275.mp3"
curl -s -o /tmp/ef-busy.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/ivr/texacore-greeting-1778694840132.mp3"

# Download BGM
echo "[2/6] Downloading background music..."
curl -s -o /tmp/bgm.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/voice-reports/bgm/clavier-music-mariage-dx27amour-beautiful-ambient-piano-219962.mp3"

# Create EuroFix sounds directory
mkdir -p /var/lib/asterisk/sounds/eurofix

# Mix each file with BGM (voice at full volume, BGM at 12%)
echo "[3/6] Mixing audio files with background music..."

for name in greeting hold ooo busy; do
  echo "  Mixing: $name"
  ffmpeg -y -i /tmp/ef-${name}.mp3 -i /tmp/bgm.mp3 \
    -filter_complex "[1:a]volume=0.12[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]" \
    -map "[aout]" -ar 8000 -ac 1 -acodec pcm_s16le -f wav \
    /var/lib/asterisk/sounds/eurofix/ef-${name}.wav 2>/dev/null
done

echo "[4/6] Converting to GSM format..."
for name in greeting hold ooo busy; do
  ffmpeg -y -i /var/lib/asterisk/sounds/eurofix/ef-${name}.wav \
    -ar 8000 -ac 1 -acodec libgsm \
    /var/lib/asterisk/sounds/eurofix/ef-${name}.gsm 2>/dev/null
done

# Create Music on Hold directory for EuroFix
echo "[4.5/6] Setting up Music on Hold..."
mkdir -p /var/lib/asterisk/moh/eurofix
ffmpeg -y -i /tmp/bgm.mp3 -ar 8000 -ac 1 -acodec pcm_s16le -f wav \
  /var/lib/asterisk/moh/eurofix/bgm.wav 2>/dev/null
chown -R asterisk:asterisk /var/lib/asterisk/moh/eurofix/

# Configure musiconhold.conf
cat > /etc/asterisk/musiconhold.conf << 'MOHCONF'
[general]

[default]
mode=files
directory=/var/lib/asterisk/moh

[eurofix]
mode=files
directory=/var/lib/asterisk/moh/eurofix
MOHCONF

echo "[5/6] Setting permissions..."
chown -R asterisk:asterisk /var/lib/asterisk/sounds/eurofix/

# Update extensions.conf with EuroFix IVR + TexaCore
echo "[6/6] Updating Asterisk dialplan..."
cat > /etc/asterisk/extensions.conf << 'DIALPLAN'
[general]
static=yes
writeprotect=no

; ═══════════════════════════════════════════════════════════
; TexaCore Cloud PBX — Multi-Tenant Dialplan
; ═══════════════════════════════════════════════════════════

[default]
; --- TexaCore Internal Calls (1XX) ---
exten => _1XX,1,NoOp(TexaCore internal call to ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN},30,tTrR)
 same => n,Hangup()

; --- TexaCore IVR Test (700) ---
exten => 700,1,Answer()
 same => n,Playback(texacore-greeting)
 same => n,Wait(1)
 same => n,Playback(texacore-greeting)
 same => n,Hangup()

; --- TexaCore Echo Test (600) ---
exten => 600,1,Answer()
 same => n,Playback(texacore-greeting)
 same => n,Echo()
 same => n,Hangup()

; ═══════════════════════════════════════════════════════════
; EuroFix — Extension 001 — Full IVR System
; ═══════════════════════════════════════════════════════════

; --- Main IVR Entry Point (dial 001) ---
exten => 001,1,Answer()
 same => n,Set(TIMEOUT(response)=10)
 same => n,Set(TIMEOUT(digit)=3)
 same => n(ivr),Background(eurofix/ef-greeting)
 same => n,WaitExten(8)
 same => n,Goto(eurofix-ivr,0,1)

; --- IVR Menu Handlers ---
[eurofix-ivr]
; 1 = Sales
exten => 1,1,NoOp(EuroFix: Sales Department)
 same => n,Set(CHANNEL(musicclass)=eurofix)
 same => n,Dial(PJSIP/101,20,tTrRm)
 same => n,Goto(eurofix-busy,s,1)

; 2 = Technical Support
exten => 2,1,NoOp(EuroFix: Technical Support)
 same => n,Set(CHANNEL(musicclass)=eurofix)
 same => n,Dial(PJSIP/102,20,tTrRm)
 same => n,Goto(eurofix-busy,s,1)

; 3 = Accounting
exten => 3,1,NoOp(EuroFix: Accounting)
 same => n,Set(CHANNEL(musicclass)=eurofix)
 same => n,Dial(PJSIP/103,20,tTrRm)
 same => n,Goto(eurofix-busy,s,1)

; 4 = Purchasing
exten => 4,1,NoOp(EuroFix: Purchasing)
 same => n,Set(CHANNEL(musicclass)=eurofix)
 same => n,Dial(PJSIP/104,20,tTrRm)
 same => n,Goto(eurofix-busy,s,1)

; 5 = Customer Service
exten => 5,1,NoOp(EuroFix: Customer Service)
 same => n,Set(CHANNEL(musicclass)=eurofix)
 same => n,Dial(PJSIP/105,20,tTrRm)
 same => n,Goto(eurofix-busy,s,1)

; 0 = Reception / Operator
exten => 0,1,NoOp(EuroFix: Reception)
 same => n,Dial(PJSIP/100,30,tTrR)
 same => n,Goto(eurofix-busy,s,1)

; Invalid key or timeout -> replay IVR
exten => i,1,Playback(invalid)
 same => n,Goto(default,001,ivr)

exten => t,1,Goto(default,001,ivr)

; --- Busy / No Answer Handler ---
[eurofix-busy]
exten => s,1,Playback(eurofix/ef-busy)
 same => n,VoiceMail(001@default,u)
 same => n,Hangup()

; --- Out of Office (can be activated via time condition later) ---
[eurofix-ooo]
exten => s,1,Answer()
 same => n,Playback(eurofix/ef-ooo)
 same => n,VoiceMail(001@default,u)
 same => n,Hangup()
DIALPLAN

# Reload all configs
asterisk -rx "module reload res_musiconhold.so"
asterisk -rx "dialplan reload"

echo ""
echo "=== EuroFix IVR Setup Complete! ==="
echo "Files:"
ls -la /var/lib/asterisk/sounds/eurofix/
echo ""
echo "Dial 001 to test the full EuroFix IVR system."

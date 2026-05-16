#!/bin/bash

# 1. ضع رابط الصوت الجديد (الذي ستولده من النظام) هنا
VOICE_URL="ضع_رابط_الصوت_الجديد_هنا"
BGM_URL="https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/voice-reports/bgm/clavier-music-mariage-dx27amour-beautiful-ambient-piano-219962.mp3"

echo "Downloading files..."
curl -s -o /tmp/voice_moh.mp3 "$VOICE_URL"
curl -s -o /tmp/bgm_moh.mp3 "$BGM_URL"

echo "Mixing voice and background music for Hold Music..."
# دمج الصوت مع الموسيقى وتحويله لصيغة 8000Hz mono متوافقة مع Asterisk
ffmpeg -y -i /tmp/voice_moh.mp3 -i /tmp/bgm_moh.mp3 \
  -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]" \
  -map "[aout]" -ar 8000 -ac 1 -acodec pcm_s16le -f wav /var/lib/asterisk/moh/texacore-hold.wav

echo "Applying permissions and reloading Music On Hold module..."
chown asterisk:asterisk /var/lib/asterisk/moh/texacore-hold.wav
chmod 644 /var/lib/asterisk/moh/texacore-hold.wav

asterisk -rx "moh reload"

echo "✅ Hold Music Updated Successfully!"

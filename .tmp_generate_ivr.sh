#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🎤 TexaCore IVR Voice Generator — ElevenLabs TTS
# Generates professional Arabic IVR greeting and uploads to Asterisk
# ═══════════════════════════════════════════════════════════════

# ElevenLabs API Key (from Supabase secrets)
ELEVENLABS_KEY="${ELEVENLABS_API_KEY}"
VOICE_ID="rPNcQ53R703tTmtue1AT"  # Mazen Lawand (Arabic)

# IVR greeting text — professional Arabic
IVR_TEXT="مرحباً بكم في تيكسا كور.
نحن سعداء بتواصلكم معنا.
للتحدث مع قسم المبيعات، اضغط واحد.
لقسم الدعم الفني، اضغط اثنين.
للمحاسبة، اضغط ثلاثة.
للتحدث مع أحد ممثلينا، يرجى الانتظار وسيتم تحويلكم تلقائياً.
شكراً لاتصالكم بتيكسا كور."

echo "🎤 Generating IVR greeting with ElevenLabs..."
echo "📝 Text: ${IVR_TEXT}"
echo ""

# Generate TTS
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${ELEVENLABS_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"${IVR_TEXT}\",
    \"model_id\": \"eleven_multilingual_v2\",
    \"voice_settings\": {
      \"stability\": 0.7,
      \"similarity_boost\": 0.85,
      \"style\": 0.2,
      \"use_speaker_boost\": true
    }
  }" \
  --output /tmp/texacore_ivr_greeting.mp3

if [ -f /tmp/texacore_ivr_greeting.mp3 ]; then
  SIZE=$(du -h /tmp/texacore_ivr_greeting.mp3 | awk '{print $1}')
  echo "✅ IVR greeting generated: /tmp/texacore_ivr_greeting.mp3 (${SIZE})"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Download and add background music using audio editor"
  echo "  2. Convert to WAV 8000Hz mono: ffmpeg -i ivr_final.mp3 -ar 8000 -ac 1 -acodec pcm_mulaw ivr_greeting.wav"
  echo "  3. Upload to Asterisk: scp ivr_greeting.wav root@153.92.222.17:/var/lib/asterisk/sounds/en/texacore-greeting.wav"
else
  echo "❌ Failed to generate IVR greeting"
fi

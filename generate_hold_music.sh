#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🎵 TexaCore Premium Hold Music Generator (Self-Contained)
# ═══════════════════════════════════════════════════════════════

export ELEVENLABS_KEY="4cc686a4c5ce6b25233af15fca82d6a9b772afd61ac7fd5c504b73cf23ef4dc1"
VOICE_ID="rPNcQ53R703tTmtue1AT"

TEXT1="مَرْحَباً بِكُمْ فِي تِيكْسَاكُور.. يُرْجَى الْبَقَاءُ مَعَنَا عَلَى الْخَط، سَنَكُونُ مَعَكُمْ بَعْدَ قَلِيل."
TEXT2="تِيكْسَاكُور، يُقَدِّمُ لَكُمْ حُلُولاً سَحَابِيَّةً مُتَطَوِّرَةً لِإِدَارَةِ الْمَبِيعَات وَالْمُحَاسَبَة.. بِكُلِّ سُهُولَةٍ وَأَمَان."
TEXT3="يَتَمَيَّزُ النِّظَامُ بِإِدَارَةٍ شَامِلَةٍ لِشُؤُونِ الْمُوَظَّفِين.. نَشْكُرُكُمْ عَلَى انْتِظَارِكُمْ، مُمَثِّلُ خِدْمَةِ الْعُمَلَاءِ سَيَكُونُ مَعَكُمْ غُضُونَ لَحَظَات."

BGM_URL="https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/voice-reports/bgm/clavier-music-mariage-dx27amour-beautiful-ambient-piano-219962.mp3"

echo "⏳ Downloading Background Music..."
curl -s -o /tmp/moh_bgm.mp3 "$BGM_URL"

generate_voice() {
  local text="$1"
  local output="$2"
  echo "🎙️ Generating voice part: $output"
  curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: ${ELEVENLABS_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"text\": \"${text}\",
      \"model_id\": \"eleven_multilingual_v2\",
      \"voice_settings\": {\"stability\": 0.7, \"similarity_boost\": 0.85, \"style\": 0.2, \"use_speaker_boost\": true}
    }" --output "/tmp/$output"
}

generate_voice "$TEXT1" "part1.mp3"
generate_voice "$TEXT2" "part2.mp3"
generate_voice "$TEXT3" "part3.mp3"

echo "🎛️ Mixing Voices with Delays using ffmpeg..."
ffmpeg -y -i /tmp/moh_bgm.mp3 -i /tmp/part1.mp3 -i /tmp/part2.mp3 -i /tmp/part3.mp3 \
       -filter_complex "
         [1:a]adelay=2000|2000[v1];
         [2:a]adelay=15000|15000[v2];
         [3:a]adelay=30000|30000[v3];
         [v1][v2][v3]amix=inputs=3:dropout_transition=0:normalize=0[voice_mix];
         [0:a]volume=0.15[bgm_quiet];
         [bgm_quiet][voice_mix]amix=inputs=2:duration=longest:dropout_transition=2:normalize=0[final];
         [final]atrim=duration=50[out]
       " -map "[out]" -ar 8000 -ac 1 -acodec pcm_s16le -f wav /var/lib/asterisk/moh/texacore-hold.wav 2>/dev/null

echo "✅ Applying to Asterisk..."
chown asterisk:asterisk /var/lib/asterisk/moh/texacore-hold.wav
chmod 644 /var/lib/asterisk/moh/texacore-hold.wav
asterisk -rx 'moh reload'
echo "🎉 Premium Hold Music is LIVE!"

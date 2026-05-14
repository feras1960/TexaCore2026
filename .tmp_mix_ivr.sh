#!/bin/bash
# Download Voice and Background Music
curl -s -o /tmp/voice.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/ivr/texacore-greeting-1778685446903.mp3"
curl -s -o /tmp/bgm.mp3 "https://wzkklenfsaepegymfxfz.supabase.co/storage/v1/object/public/ai-reports/voice-reports/bgm/clavier-music-mariage-dx27amour-beautiful-ambient-piano-219962.mp3"

# Mix them using ffmpeg
ffmpeg -y -i /tmp/voice.mp3 -i /tmp/bgm.mp3 -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]" -map "[aout]" -ar 8000 -ac 1 -acodec pcm_mulaw -f wav /var/lib/asterisk/sounds/en/texacore-greeting.wav 2>&1 | tail -5

# Convert mixed to GSM
ffmpeg -y -i /var/lib/asterisk/sounds/en/texacore-greeting.wav -ar 8000 -ac 1 -acodec libgsm /var/lib/asterisk/sounds/en/texacore-greeting.gsm 2>&1 | tail -5

# Reload asterisk dialplan
asterisk -rx "dialplan reload"

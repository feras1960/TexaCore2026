#!/bin/bash
MUSIC_DIR="$(dirname "$0")"
SUPABASE_URL="https://wzkklenfsaepegymfxfz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2tsZW5mc2FlcGVneW1meGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTIxNzcsImV4cCI6MjA4NDMyODE3N30.ATYSK_WvOfbqEaInbg5nKau-wgixF0lIGaue3m8AJtI"

for f in morning_intro morning_outro evening_intro evening_outro; do
  echo "Uploading ${f}.mp3..."
  curl -s --max-time 30 \
    -X POST "${SUPABASE_URL}/storage/v1/object/ai-reports/music-candidates/${f}.mp3" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: audio/mpeg" \
    -H "x-upsert: true" \
    --data-binary "@${MUSIC_DIR}/${f}.mp3" \
    -o /dev/null -w "  HTTP %{http_code}\n"
done

echo ""
echo "=== Public URLs ==="
echo "☀️ Morning Intro: ${SUPABASE_URL}/storage/v1/object/public/ai-reports/music-candidates/morning_intro.mp3"
echo "☀️ Morning Outro: ${SUPABASE_URL}/storage/v1/object/public/ai-reports/music-candidates/morning_outro.mp3"
echo "🌙 Evening Intro: ${SUPABASE_URL}/storage/v1/object/public/ai-reports/music-candidates/evening_intro.mp3"
echo "🌙 Evening Outro: ${SUPABASE_URL}/storage/v1/object/public/ai-reports/music-candidates/evening_outro.mp3"

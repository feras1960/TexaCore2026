// ═══ Quick AI Model Availability Check ═══
// Tests if the AI models respond correctly
// Usage: node scripts/test_ai_models.js <API_KEY>

const GOOGLE_AI_KEY = process.argv[2];
if (!GOOGLE_AI_KEY) { console.error('Usage: node scripts/test_ai_models.js <API_KEY>'); process.exit(1); }

async function testGeminiFlashLite() {
  console.log('\n🧪 Test 1: Gemini 2.5 Flash Lite (Analysis Engine)...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_KEY}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 10 }
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`   ✅ Gemini 2.5 Flash Lite → WORKS! Response: "${text.trim()}"`);
      return true;
    } else {
      const err = await resp.text();
      console.log(`   ❌ Gemini 2.5 Flash Lite → ${resp.status}: ${err.substring(0, 200)}`);
      return false;
    }
  } catch (e) { console.log(`   ❌ Error: ${e.message}`); return false; }
}

async function testGeminiImageGen() {
  console.log('\n🧪 Test 2: Gemini 2.5 Flash Lite (Image Generation capability)...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_KEY}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Generate a simple 50x50 pixel red square image.' }] }],
        generationConfig: { 
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1.0 
        }
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const hasImage = parts.some(p => p.inline_data?.data);
      const textParts = parts.filter(p => p.text).map(p => p.text.substring(0, 100));
      if (hasImage) {
        const imgPart = parts.find(p => p.inline_data?.data);
        const sizeKB = Math.round(imgPart.inline_data.data.length * 0.75 / 1024);
        console.log(`   ✅ Image Generation → WORKS! Image received (${sizeKB}KB)`);
      } else {
        console.log(`   ⚠️ Image Generation → Text response only: "${textParts.join('; ')}"`);
        console.log(`   ℹ️  This model may not support image generation — will fallback to Imagen 3.`);
      }
      return { ok: true, hasImage };
    } else {
      const err = await resp.text();
      console.log(`   ❌ Image Gen → ${resp.status}: ${err.substring(0, 200)}`);
      return { ok: false, hasImage: false };
    }
  } catch (e) { console.log(`   ❌ Error: ${e.message}`); return { ok: false, hasImage: false }; }
}

async function testImagen3(region) {
  console.log(`\n🧪 Test 3: Imagen 3.0 (Vertex AI — ${region})...`);
  const url = `https://${region}-aiplatform.googleapis.com/v1/publishers/google/models/imagen-3.0-generate-001:predict?key=${GOOGLE_AI_KEY}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: 'A simple red fabric swatch on white background, product photography.' }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' }
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const hasImage = data?.predictions?.some(p => p.bytesBase64Encoded);
      if (hasImage) {
        const sizeKB = Math.round(data.predictions[0].bytesBase64Encoded.length * 0.75 / 1024);
        console.log(`   ✅ Imagen 3.0 (${region}) → WORKS! Image: ${sizeKB}KB`);
      } else {
        console.log(`   ⚠️ Imagen 3.0 (${region}) → Response OK but no image data`);
        console.log(`   Raw: ${JSON.stringify(data).substring(0, 300)}`);
      }
      return true;
    } else {
      const err = await resp.text();
      console.log(`   ❌ Imagen 3.0 (${region}) → ${resp.status}: ${err.substring(0, 400)}`);
      return false;
    }
  } catch (e) { console.log(`   ❌ Error: ${e.message}`); return false; }
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log('🔍 TexaCore AI Model Verification');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════');
  console.log(`   API Key: ${GOOGLE_AI_KEY.substring(0, 8)}...${GOOGLE_AI_KEY.slice(-4)}`);
  
  const r1 = await testGeminiFlashLite();
  const r2 = await testGeminiImageGen();
  const r3 = await testImagen3('europe-west1');
  
  // If europe-west1 fails, also try us-central1 for comparison
  let r4 = false;
  if (!r3) {
    console.log('\n🔄 europe-west1 failed → trying us-central1 as comparison...');
    r4 = await testImagen3('us-central1');
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`   Gemini 2.5 Flash Lite (Text/Analysis):  ${r1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Gemini 2.5 Flash Lite (Image Gen):      ${r2.ok ? (r2.hasImage ? '✅ PASS (generates images!)' : '⚠️ Text only (fallback to Imagen)') : '❌ FAIL'}`);
  console.log(`   Imagen 3.0 (europe-west1):              ${r3 ? '✅ PASS' : '❌ FAIL'}`);
  if (!r3 && r4) {
    console.log(`   Imagen 3.0 (us-central1):               ${r4 ? '✅ PASS ← should switch region!' : '❌ FAIL'}`);
  }
  console.log('═══════════════════════════════════════════');
  
  if (r1 && (r2.hasImage || r3)) {
    console.log('\n🎉 VERDICT: System is READY for image generation!');
  } else if (r1 && !r2.hasImage && !r3) {
    console.log('\n⚠️ VERDICT: Text analysis works, but NO image generation engine available.');
    console.log('   → Check if Imagen 3 is enabled in your GCP project.');
    console.log('   → Or try a different Gemini model that supports image output.');
  } else {
    console.log('\n❌ VERDICT: Critical issues detected. Check API keys and model availability.');
  }
}

run();

/**
 * ════════════════════════════════════════════════════
 * 🤖 TexaCore AI — Nano Banana 2 (Imagen 3) Test Script
 * اختبار الربط المباشر مع Vertex AI لإنشاء صور الأقمشة
 * ════════════════════════════════════════════════════
 */

const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

// ═══ إعدادات البيئة ═══
// ⚠️ استبدل YOUR_PROJECT_ID بمعرف مشروعك في Google Cloud
const project = process.env.GOOGLE_CLOUD_PROJECT || 'YOUR_PROJECT_ID';
const location = 'us-central1'; // أفضل منطقة لـ Imagen 3

console.log('═══════════════════════════════════════');
console.log('🤖 TexaCore AI — Nano Banana 2 Test');
console.log(`📦 Project: ${project}`);
console.log(`📍 Location: ${location}`);
console.log('═══════════════════════════════════════\n');

if (project === 'YOUR_PROJECT_ID') {
    console.error('❌ يرجى تعيين GOOGLE_CLOUD_PROJECT أو استبدال YOUR_PROJECT_ID');
    console.error('   مثال: GOOGLE_CLOUD_PROJECT=my-project-id node test-nana.js');
    process.exit(1);
}

const vertexAI = new VertexAI({ project, location });

// ═══ استدعاء Imagen 3 (نانا بنانا 2) ═══
const generativeModel = vertexAI.getGenerativeModel({
    model: 'imagen-3.0-generate-001',
});

async function generateFabricImage() {
    console.log('🎨 جاري إنشاء صورة قماش احترافية...\n');

    const prompt = `A professional close-up photo of a luxurious silk fabric,
    pastel emerald green color with subtle silver floral embroidery pattern,
    soft studio lighting creating gentle highlights on the silk sheen,
    8k resolution, textile texture focused, clean white background,
    commercial product photography quality, 45-degree angle showing drape.`;

    const t0 = Date.now();

    try {
        const response = await generativeModel.generateContent(prompt);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

        console.log(`✅ نجح! تم التوليد في ${elapsed} ثانية`);
        console.log('───────────────────────────────');

        // Parse response
        const result = response.response;
        if (result?.candidates?.[0]?.content?.parts) {
            const parts = result.candidates[0].content.parts;
            console.log(`📋 عدد الأجزاء: ${parts.length}`);

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (part.text) {
                    console.log(`  Part ${i}: 📝 TEXT = "${part.text.substring(0, 100)}"`);
                } else if (part.inlineData) {
                    const sizeKB = Math.round(part.inlineData.data.length * 0.75 / 1024);
                    console.log(`  Part ${i}: 🖼️ IMAGE (${part.inlineData.mimeType}, ~${sizeKB}KB)`);

                    // Save image to file
                    const imgBuffer = Buffer.from(part.inlineData.data, 'base64');
                    const outputPath = path.join(__dirname, `test-fabric-image-${Date.now()}.png`);
                    fs.writeFileSync(outputPath, imgBuffer);
                    console.log(`  📁 حُفظت في: ${outputPath}`);
                }
            }
        } else {
            console.log('📋 الاستجابة الكاملة:');
            console.log(JSON.stringify(result, null, 2).substring(0, 1000));
        }

        console.log('\n🎉 تم كسر حاجز الربط التقني! TexaCore جاهز لتوليد الصور.');

    } catch (error) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.error(`\n❌ فشل التوليد بعد ${elapsed} ثانية:`);
        console.error('───────────────────────────────');

        if (error.message?.includes('not found')) {
            console.error('🔍 الموديل غير متاح. تأكد من:');
            console.error('   1. تفعيل Vertex AI API في Google Cloud Console');
            console.error('   2. المنطقة us-central1 تدعم imagen-3.0-generate-001');
        } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
            console.error('🔐 مشكلة صلاحيات. تأكد من:');
            console.error('   1. تشغيل: gcloud auth application-default login');
            console.error('   2. أو تعيين GOOGLE_APPLICATION_CREDENTIALS');
        } else {
            console.error('   Error:', error.message || error);
        }

        if (error.response?.data) {
            console.error('   API Response:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
        }
    }
}

generateFabricImage();

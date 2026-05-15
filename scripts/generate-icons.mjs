import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);

const icons = [
  { name: 'home',     prompt: 'A cute 3D cartoon house icon, warm orange color #FF8C00, rounded corners, soft shadows, white background, minimal flat-ish 3D style, suitable for mobile app navigation, 512x512, PNG format' },
  { name: 'menu',     prompt: 'A cute 3D cartoon fork and spoon crossed icon, warm orange color #FF8C00, rounded shape, soft 3D shadow, white background, minimal, mobile app icon style, 512x512, PNG format' },
  { name: 'survey',   prompt: 'A cute 3D cartoon clipboard with a checkmark icon, orange color #FF8C00, rounded corners, soft shadow, white background, minimal 3D style, mobile app icon, 512x512, PNG format' },
  { name: 'insights', prompt: 'A cute 3D cartoon glowing brain or lightbulb icon, golden color #C5A55A, soft glow effect, white background, minimal 3D style, mobile app icon, 512x512, PNG format' },
  { name: 'settings', prompt: 'A cute 3D cartoon gear cog icon, warm orange color #FF8C00, rounded edges, soft 3D shadow, white background, minimal style, mobile app navigation icon, 512x512, PNG format' },
  { name: 'alert',    prompt: 'A cute 3D cartoon red bell with a small exclamation mark, red color #DC2626, rounded, soft shadow, white background, minimal 3D style, warning icon for mobile app, 512x512, PNG format' },
  { name: 'star',     prompt: 'A cute 3D cartoon shiny gold star icon, golden yellow color, rounded points, sparkle effect, white background, minimal 3D style, rating icon for mobile app, 512x512, PNG format' },
  { name: 'feedback', prompt: 'A cute 3D cartoon speech bubble with a small heart inside, orange color #FF8C00, rounded, soft shadow, white background, minimal 3D style, feedback icon for mobile app, 512x512, PNG format' },
];

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function generateWithGemini(modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  });
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  return parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
}

async function generateWithImagen(modelName, prompt) {
  // Imagen uses /v1beta/models/{model}:predict endpoint
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return null;
  return { inlineData: { data: b64, mimeType: 'image/png' } };
}

async function generateWithModel(modelName, prompt) {
  if (modelName.startsWith('imagen-')) return generateWithImagen(modelName, prompt);
  return generateWithGemini(modelName, prompt);
}

const models = ['imagen-4.0-fast-generate-001', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];

for (const icon of icons) {
  const outPath = path.join(outDir, `${icon.name}.png`);
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭️  ${icon.name}.png already exists, skipping`);
    continue;
  }
  let saved = false;
  for (const modelName of models) {
    try {
      console.log(`Generating ${icon.name} with ${modelName}...`);
      const imagePart = await generateWithModel(modelName, icon.prompt);
      if (imagePart?.inlineData?.data) {
        const buf = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(outPath, buf);
        console.log(`  ✅ Saved ${icon.name}.png (${buf.length} bytes)`);
        saved = true;
        break;
      }
    } catch (e) {
      console.log(`  ⚠️  ${modelName} failed: ${e.message}`);
    }
  }
  if (!saved) {
    console.log(`  ❌ Could not generate ${icon.name} with any model`);
  }
}
console.log('Done!');

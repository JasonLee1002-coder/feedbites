import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);

const icons = [
  { name: 'home',     prompt: 'A vibrant glossy 3D app icon of a cute house, bright vivid orange gradient (#FF6B00 to #FF9500), shiny plastic-like surface with specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'menu',     prompt: 'A vibrant glossy 3D app icon of a cute fork and knife crossed, bright vivid coral-orange gradient (#FF5500 to #FF8C00), shiny inflated 3D style, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'survey',   prompt: 'A vibrant glossy 3D app icon of a cute clipboard with colorful checkmark, bright vivid blue-to-teal gradient (#3B82F6 to #06B6D4), shiny inflated bubbly 3D style, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'insights', prompt: 'A vibrant glossy 3D app icon of a cute glowing lightbulb with sparkles, bright vivid purple-to-pink gradient (#8B5CF6 to #EC4899), shiny inflated bubbly 3D style, glowing effect, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'settings', prompt: 'A vibrant glossy 3D app icon of a cute gear/cog wheel, bright vivid teal-to-green gradient (#14B8A6 to #22C55E), shiny inflated bubbly 3D style, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'alert',    prompt: 'A vibrant glossy 3D app icon of a cute bell with notification dot, bright vivid red-to-pink gradient (#EF4444 to #F97316), shiny inflated bubbly 3D style, glowing red dot, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'star',     prompt: 'A vibrant glossy 3D app icon of a cute shiny star with sparkles, bright vivid yellow-to-amber gradient (#FBBF24 to #F59E0B), shiny inflated bubbly 3D style, glitter sparkle effect, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
  { name: 'feedback', prompt: 'A vibrant glossy 3D app icon of a cute speech bubble with a heart, bright vivid pink-to-rose gradient (#EC4899 to #F43F5E), shiny inflated bubbly 3D style, specular highlight, soft drop shadow, pure white background, bold saturated colors, modern iOS-style icon design, 512x512 PNG' },
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

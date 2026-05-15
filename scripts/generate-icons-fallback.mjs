/**
 * Fallback icon generator using SVG -> PNG (via sharp)
 * Used when Gemini API key is unavailable
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const icons = [
  {
    name: 'home',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#FF8C00"/>
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#FF6B00" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Roof -->
      <polygon points="50,15 82,45 18,45" fill="url(#g)" filter="url(#shadow)" rx="5"/>
      <!-- Body -->
      <rect x="28" y="43" width="44" height="35" rx="6" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Door -->
      <rect x="42" y="58" width="16" height="20" rx="4" fill="white" opacity="0.6"/>
      <!-- Chimney -->
      <rect x="63" y="25" width="9" height="16" rx="3" fill="url(#g)"/>
    </svg>`,
  },
  {
    name: 'menu',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#FF8C00"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF6B00" flood-opacity="0.35"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Fork -->
      <rect x="34" y="18" width="7" height="64" rx="3.5" fill="url(#g)" filter="url(#shadow)" transform="rotate(-15,37,50)"/>
      <!-- Prongs of fork -->
      <rect x="31" y="18" width="3" height="18" rx="1.5" fill="url(#g)" transform="rotate(-15,37,50)"/>
      <rect x="37" y="18" width="3" height="18" rx="1.5" fill="url(#g)" transform="rotate(-15,37,50)"/>
      <!-- Spoon -->
      <rect x="59" y="38" width="7" height="44" rx="3.5" fill="url(#g)" filter="url(#shadow)" transform="rotate(15,63,50)"/>
      <ellipse cx="62.5" cy="24" rx="9" ry="11" fill="url(#g)" transform="rotate(15,63,50)"/>
    </svg>`,
  },
  {
    name: 'survey',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#FF8C00"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF6B00" flood-opacity="0.35"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Clipboard body -->
      <rect x="22" y="28" width="56" height="58" rx="8" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Clip at top -->
      <rect x="38" y="20" width="24" height="14" rx="7" fill="#CC6A00"/>
      <!-- Lines on clipboard -->
      <rect x="32" y="44" width="36" height="5" rx="2.5" fill="white" opacity="0.7"/>
      <rect x="32" y="55" width="28" height="5" rx="2.5" fill="white" opacity="0.7"/>
      <rect x="32" y="66" width="20" height="5" rx="2.5" fill="white" opacity="0.7"/>
      <!-- Checkmark -->
      <polyline points="60,62 66,70 78,52" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>`,
  },
  {
    name: 'insights',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#F0D080"/>
          <stop offset="100%" stop-color="#C5A55A"/>
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFF5C0" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#F0D080" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#A07820" flood-opacity="0.4"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Glow aura -->
      <circle cx="50" cy="44" r="32" fill="url(#glow)"/>
      <!-- Bulb body -->
      <path d="M35,44 Q35,28 50,24 Q65,28 65,44 Q65,56 56,62 L56,68 L44,68 L44,62 Q35,56 35,44Z" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Base of bulb -->
      <rect x="42" y="68" width="16" height="5" rx="2.5" fill="#B8903A"/>
      <rect x="43" y="73" width="14" height="5" rx="2.5" fill="#B8903A"/>
      <!-- Shine -->
      <ellipse cx="43" cy="36" rx="5" ry="7" fill="white" opacity="0.4" transform="rotate(-20,43,36)"/>
      <!-- Sparkles -->
      <circle cx="72" cy="28" r="3" fill="#F0D080" opacity="0.8"/>
      <circle cx="26" cy="34" r="2" fill="#F0D080" opacity="0.7"/>
      <circle cx="74" cy="56" r="2" fill="#F0D080" opacity="0.6"/>
    </svg>`,
  },
  {
    name: 'settings',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#FF8C00"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF6B00" flood-opacity="0.35"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Gear outer -->
      <path d="M50,20 L54,26 L61,24 L66,30 L62,36 L66,42 L63,49 L57,49 L54,56 L46,56 L43,49 L37,49 L34,42 L38,36 L34,30 L39,24 L46,26 Z" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Gear inner hole -->
      <circle cx="50" cy="38" r="9" fill="white"/>
      <!-- Second smaller gear hint -->
      <circle cx="68" cy="64" r="14" fill="url(#g)" filter="url(#shadow)"/>
      <circle cx="68" cy="64" r="6" fill="white"/>
    </svg>`,
  },
  {
    name: 'alert',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#F87171"/>
          <stop offset="100%" stop-color="#DC2626"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#991B1B" flood-opacity="0.4"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Bell body -->
      <path d="M50,18 C38,18 30,28 30,40 L30,62 L24,68 L76,68 L70,62 L70,40 C70,28 62,18 50,18Z" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Bell handle -->
      <rect x="44" y="13" width="12" height="8" rx="4" fill="#B91C1C"/>
      <!-- Clapper -->
      <ellipse cx="50" cy="73" rx="8" ry="5" fill="url(#g)"/>
      <!-- Exclamation mark -->
      <rect x="47" y="30" width="6" height="22" rx="3" fill="white" opacity="0.9"/>
      <circle cx="50" cy="59" r="3.5" fill="white" opacity="0.9"/>
      <!-- Sound waves -->
      <path d="M76,35 Q82,42 76,50" fill="none" stroke="#F87171" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
      <path d="M24,35 Q18,42 24,50" fill="none" stroke="#F87171" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
    </svg>`,
  },
  {
    name: 'star',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FDE68A"/>
          <stop offset="100%" stop-color="#F59E0B"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#D97706" flood-opacity="0.5"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Star -->
      <polygon points="50,15 57,36 80,36 62,50 69,71 50,58 31,71 38,50 20,36 43,36" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Shine -->
      <ellipse cx="43" cy="30" rx="5" ry="6" fill="white" opacity="0.45" transform="rotate(-25,43,30)"/>
      <!-- Sparkles -->
      <circle cx="78" cy="22" r="3" fill="#FDE68A" opacity="0.9"/>
      <circle cx="22" cy="26" r="2.5" fill="#FDE68A" opacity="0.8"/>
      <circle cx="80" cy="68" r="2" fill="#FDE68A" opacity="0.7"/>
      <circle cx="20" cy="72" r="2.5" fill="#FDE68A" opacity="0.7"/>
      <!-- Small sparkle lines -->
      <line x1="78" y1="15" x2="78" y2="29" stroke="#FDE68A" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      <line x1="71" y1="22" x2="85" y2="22" stroke="#FDE68A" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
    </svg>`,
  },
  {
    name: 'feedback',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
      <defs>
        <radialGradient id="g" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#FF8C00"/>
        </radialGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#FF6B00" flood-opacity="0.35"/></filter>
      </defs>
      <rect width="100" height="100" fill="white" rx="20"/>
      <!-- Speech bubble -->
      <path d="M20,22 Q20,18 24,18 L76,18 Q80,18 80,22 L80,60 Q80,64 76,64 L38,64 L26,78 L26,64 L24,64 Q20,64 20,60 Z" fill="url(#g)" filter="url(#shadow)"/>
      <!-- Heart inside bubble -->
      <path d="M50,52 C50,52 36,44 36,36 C36,31 40,27 45,28 C47.5,28.5 50,31 50,31 C50,31 52.5,28.5 55,28 C60,27 64,31 64,36 C64,44 50,52 50,52Z" fill="white" opacity="0.85"/>
    </svg>`,
  },
];

console.log('Generating 8 SVG-based PNG icons...\n');

let successCount = 0;
for (const icon of icons) {
  const outPath = path.join(outDir, `${icon.name}.png`);
  try {
    const svgBuffer = Buffer.from(icon.svg, 'utf8');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outPath);
    const size = fs.statSync(outPath).size;
    console.log(`  Saved ${icon.name}.png (${size} bytes)`);
    successCount++;
  } catch (e) {
    console.log(`  FAILED ${icon.name}: ${e.message}`);
  }
}

console.log(`\nDone! ${successCount}/8 icons generated in public/icons/`);

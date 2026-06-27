import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const SIZES = [192, 512];
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

const SVG_MASTER = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#g)"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#1C1917" stroke-width="20"/>
  <circle cx="256" cy="256" r="50" fill="#1C1917"/>
  <text x="256" y="420" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="#1C1917">GT</text>
</svg>`;

async function generate() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const size of SIZES) {
    await sharp(Buffer.from(SVG_MASTER))
      .resize(size, size)
      .png()
      .toFile(join(OUT_DIR, `icon-${size}.png`));
    console.log(`Generated ${size}x${size} icon`);
  }

  await sharp(Buffer.from(SVG_MASTER))
    .resize(512, 512)
    .png()
    .toFile(join(OUT_DIR, 'icon-maskable-512.png'));

  console.log('All icons generated!');
}

generate().catch(console.error);

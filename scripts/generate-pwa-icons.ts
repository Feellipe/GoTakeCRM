import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [192, 512];
const outDir = path.resolve(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#B8860B"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">G</text>
  <text x="256" y="400" font-family="Arial, sans-serif" font-size="60" fill="rgba(255,255,255,0.8)" text-anchor="middle">CRM</text>
</svg>`;

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));

    console.log(`Generated ${size}x${size} icon`);
  }

  // Generate a favicon-sized icon too
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(outDir, 'favicon.png'));

  console.log('Generated 64x64 favicon');
  console.log('All icons generated successfully!');
}

generate().catch(console.error);

/**
 * Generates development icon variants with a DEV badge.
 * Run: node scripts/generate-dev-icons.mjs
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../assets/images');

const TARGETS = [
  { input: 'icon.png', output: 'icon-dev.png' },
  { input: 'android-icon-foreground.png', output: 'android-icon-foreground-dev.png' },
  { input: 'android-icon-monochrome.png', output: 'android-icon-monochrome-dev.png' },
];

async function addDevBadge(inputPath, outputPath) {
  const image = sharp(inputPath);
  const meta = await image.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  const badgeWidth = Math.round(width * 0.42);
  const badgeHeight = Math.round(height * 0.17);
  const fontSize = Math.round(badgeHeight * 0.48);
  const radius = Math.round(badgeHeight * 0.22);

  const badgeSvg = Buffer.from(
    `<svg width="${badgeWidth}" height="${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" fill="#EA580C"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF">DEV</text>
    </svg>`,
  );

  await image
    .composite([{ input: badgeSvg, gravity: 'southeast' }])
    .png()
    .toFile(outputPath);

  console.log(`Created ${path.basename(outputPath)}`);
}

for (const target of TARGETS) {
  await addDevBadge(path.join(imagesDir, target.input), path.join(imagesDir, target.output));
}

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Simple SVG icon template - book icon matching the logo
const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d946ef;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  </g>
</svg>`;

async function generateIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = path.join(__dirname, '../public/icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = createSvgIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}.svg`);
    const pngPath = path.join(iconsDir, `icon-${size}.png`);

    fs.writeFileSync(svgPath, svg);
    console.log(`Created icon-${size}.svg`);

    // Convert to PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(pngPath);
    console.log(`Created icon-${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleSvg = createSvgIcon(180);
  const applePath = path.join(iconsDir, 'apple-touch-icon.png');
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(applePath);
  console.log('Created apple-touch-icon.png');

  // Favicon
  const faviconSvg = createSvgIcon(32);
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log('Created favicon.png');

  console.log('\n✅ All icons generated!');
}

generateIcons().catch(console.error);

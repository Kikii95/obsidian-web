const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG icon template - brain-network mark matching the <Logo> component
const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff79ff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#d946ef;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a613bc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.14}, ${size * 0.14})">
    <svg width="${size * 0.72}" height="${size * 0.72}" viewBox="50 75 410 410">
      <g fill="none" stroke="white" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 149C235 107 171 128 171 171C128 171 107 213 107 235C85 256 85 299 107 320C85 363 128 405 171 405C192 448 235 427 235 405"/>
        <path d="M256 149C277 107 341 128 341 171C384 171 405 213 405 235C427 256 427 299 405 320C427 363 384 405 341 405C320 448 277 427 277 405"/>
      </g>
      <g fill="none" stroke="white" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
        <path d="M256 171V235M256 235L192 277M256 235L320 277M192 277C192 299 192 320 213 341M320 277C320 299 320 320 299 341"/>
      </g>
      <g fill="white">
        <circle cx="256" cy="171" r="31"/>
        <circle cx="256" cy="235" r="28"/>
        <circle cx="192" cy="277" r="30"/>
        <circle cx="320" cy="277" r="30"/>
        <circle cx="213" cy="341" r="22"/>
        <circle cx="299" cy="341" r="22"/>
      </g>
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
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleSvg);
  console.log('Created apple-touch-icon.svg');
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

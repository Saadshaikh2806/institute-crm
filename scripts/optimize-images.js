const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 192, 512];
const inputImage = path.join(__dirname, '../public/icons/icon-source.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'cover'
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
  }
}

generateIcons().catch(console.error);

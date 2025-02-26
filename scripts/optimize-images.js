const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512]; // Focus on the main PWA icon sizes
const inputImage = path.join(__dirname, '../public/icons/icon-source.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
        kernel: 'lanczos3' // Better quality scaling
      })
      .png({ 
        quality: 100,
        compressionLevel: 9,
        palette: true // Optimize for web
      })
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
  }
}

generateIcons().catch(console.error);

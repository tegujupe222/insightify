import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicons() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const inputPath = path.join(__dirname, '../public/logo.png');
  const outputDir = path.join(__dirname, '../public');

  console.log('Generating favicons from logo.png...');

  try {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `favicon-${size}x${size}.png`);
      
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated favicon-${size}x${size}.png`);
    }

    console.log('✓ Favicon generation completed!');
    
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons(); 
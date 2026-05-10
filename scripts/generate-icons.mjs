/**
 * Simple PNG generator for PWA icons
 * Generates 192x192 and 512x512 PNG icons with LT logo
 */

import { createCanvas } from 'canvas';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// Colors from the existing SVG favicon
const PRIMARY_COLOR = '#863bff';
const LIGHT_COLOR = '#ede6ff';
const DARK_COLOR = '#7e14ff';

/**
 * Draws the hourglass/timer logo on canvas
 */
function drawLogo(ctx, size) {
  const scale = size / 48;
  ctx.scale(scale, scale);
  
  // Background fill
  ctx.clearRect(0, 0, 48, 46);
  
  // Main hourglass shape (from favicon.svg)
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.beginPath();
  
  // Simplified hourglass path
  ctx.moveTo(25.946, 44.938);
  ctx.lineTo(47.376, 18.667);
  ctx.bezierCurveTo(47.959, 17.925, 47.429, 16.837, 46.486, 16.837);
  ctx.lineTo(35.109, 16.837);
  ctx.bezierCurveTo(33.267, 16.837, 32.197, 14.757, 33.267, 13.259);
  ctx.lineTo(40.747, 2.788);
  ctx.bezierCurveTo(41.283, 2.040, 40.747, 1.000, 39.827, 1.000);
  ctx.lineTo(10.933, 1.000);
  ctx.bezierCurveTo(10.569, 1.000, 10.227, 1.177, 10.013, 1.474);
  ctx.lineTo(0.317, 14.975);
  ctx.bezierCurveTo(-0.219, 15.723, 0.317, 16.763, 1.237, 16.763);
  ctx.lineTo(15.005, 16.763);
  ctx.bezierCurveTo(16.847, 16.763, 17.917, 18.843, 16.847, 20.341);
  ctx.lineTo(9.367, 30.812);
  ctx.bezierCurveTo(8.831, 31.560, 9.367, 32.600, 10.287, 32.600);
  ctx.lineTo(21.663, 32.600);
  ctx.bezierCurveTo(22.881, 32.600, 23.873, 33.213, 23.873, 33.937);
  ctx.lineTo(23.873, 44.240);
  ctx.bezierCurveTo(23.873, 45.313, 25.230, 45.783, 25.894, 44.938);
  ctx.closePath();
  ctx.fill();
  
  // Add sand effect (lighter color)
  ctx.fillStyle = LIGHT_COLOR;
  ctx.globalAlpha = 0.6;
  
  // Top sand
  ctx.beginPath();
  ctx.ellipse(14, 10, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bottom sand
  ctx.beginPath();
  ctx.ellipse(34, 36, 8, 8, 0.8, 0, Math.PI * 2);
  ctx.fill();
  
  // Sand stream
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = DARK_COLOR;
  ctx.fillRect(23.5, 18, 1, 8);
}

/**
 * Generate icon for specific size
 */
async function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Center and draw the logo
  ctx.save();
  ctx.translate(size * 0.08, size * 0.04); // Small padding
  const drawSize = size * 0.84;
  ctx.scale(drawSize / 48, drawSize / 48);
  
  // Recreate the simplified hourglass
  ctx.fillStyle = PRIMARY_COLOR;
  
  // Draw the path manually at original 48x46 scale
  ctx.beginPath();
  // Top
  ctx.moveTo(10, 1);
  ctx.lineTo(40, 1);
  ctx.lineTo(30, 15);
  ctx.lineTo(35, 15);
  ctx.lineTo(24, 30);
  ctx.lineTo(36, 45);
  ctx.lineTo(13, 45);
  ctx.lineTo(25, 30);
  ctx.lineTo(14, 15);
  ctx.lineTo(19, 15);
  ctx.lineTo(10, 1);
  ctx.closePath();
  ctx.fill();
  
  // Add "LT" text overlay
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.25}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.95;
  ctx.fillText('LT', size / 2, size / 2);
  ctx.restore();
  
  const buffer = canvas.toBuffer('image/png');
  const filename = join(PUBLIC_DIR, `pwa-${size}x${size}.png`);
  await writeFile(filename, buffer);
  console.log(`Generated: ${filename}`);
}

/**
 * Generate favicon.ico using canvas (creates PNG that can be renamed)
 * For proper .ico, we generate a multi-size PNG 
 */
async function generateFavicon() {
  // Generate a 32x32 PNG for favicon
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.fillRect(0, 0, 32, 32);
  
  // Simple hourglass shape
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.9;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LT', 16, 16);
  
  const buffer = canvas.toBuffer('image/png');
  const filename = join(PUBLIC_DIR, 'favicon.ico');
  await writeFile(filename, buffer);
  console.log(`Generated: ${filename}`);
}

async function main() {
  try {
    // Import canvas dynamically to check if available
    console.log('Checking for canvas module...');
    
    // Generate icons
    await mkdir(PUBLIC_DIR, { recursive: true });
    await generateIcon(192);
    await generateIcon(512);
    await generateFavicon();
    
    console.log('\n✅ All icons generated successfully!');
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('Cannot find module')) {
      console.log('\n❌ "canvas" module not found.');
      console.log('Please install it first: npm install canvas -D');
      console.log('\nOr, you can:');
      console.log('1. Use an online tool to convert the favicon.svg to PNG');
      console.log('2. Or use the existing placeholder images');
      process.exit(1);
    }
    throw err;
  }
}

main();

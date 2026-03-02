// Quick script to generate PWA icon PNGs from SVG using sharp (or fallback to manual PNG)
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// Try using sharp first, fallback to manual minimal PNG
async function generateWithSharp() {
    try {
        const sharp = require('sharp');
        const svg192 = fs.readFileSync(path.join(iconsDir, 'icon-192.svg'));
        const svg512 = fs.readFileSync(path.join(iconsDir, 'icon-512.svg'));
        
        await sharp(svg192).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
        console.log('Generated icon-192.png');
        await sharp(svg512).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
        console.log('Generated icon-512.png');
        return true;
    } catch (e) {
        return false;
    }
}

// Fallback: create a canvas-rendered PNG via a tiny embedded SVG→PNG pipeline
// Uses native Node if canvas module unavailable
async function generateWithCanvas() {
    try {
        const { createCanvas } = require('canvas');
        [192, 512].forEach(size => {
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext('2d');
            const r = size * 0.15;

            // Rounded rectangle background
            ctx.beginPath();
            ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
            ctx.quadraticCurveTo(size, 0, size, r);
            ctx.lineTo(size, size - r);
            ctx.quadraticCurveTo(size, size, size - r, size);
            ctx.lineTo(r, size);
            ctx.quadraticCurveTo(0, size, 0, size - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
            ctx.closePath();
            ctx.fillStyle = '#22d3ee';
            ctx.fill();

            ctx.fillStyle = '#020617';
            ctx.font = `bold ${size * 0.6}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', size / 2, size / 2 + size * 0.03);

            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buffer);
            console.log(`Generated icon-${size}.png (${size}x${size})`);
        });
        return true;
    } catch (e) {
        return false;
    }
}

// Fallback: Inline SVG data URL approach — generates a minimal valid PNG placeholder
function generateMinimalPNG() {
    console.log('Neither sharp nor canvas available.');
    console.log('Please install one of them:');
    console.log('  npm install sharp');
    console.log('  npm install canvas');
    console.log('');
    console.log('Or convert the SVGs manually using an online tool:');
    console.log('  icons/icon-192.svg → icons/icon-192.png');
    console.log('  icons/icon-512.svg → icons/icon-512.png');
    process.exit(1);
}

(async () => {
    if (await generateWithSharp()) return;
    if (await generateWithCanvas()) return;
    generateMinimalPNG();
})();

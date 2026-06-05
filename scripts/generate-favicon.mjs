import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src', 'assets', 'logo-o-que-faz.png');
const publicDir = path.join(root, 'public');

const sizes = [
	{ name: 'favicon-16.png', size: 16 },
	{ name: 'favicon-32.png', size: 32 },
	{ name: 'favicon-48.png', size: 48 },
	{ name: 'apple-touch-icon.png', size: 180 },
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
];

for (const { name, size } of sizes) {
	await sharp(src)
		.resize(size, size, {
			fit: 'contain',
			background: { r: 255, g: 255, b: 255, alpha: 0 },
		})
		.png()
		.toFile(path.join(publicDir, name));
}

await sharp(src)
	.resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
	.png()
	.toFile(path.join(publicDir, 'favicon.png'));

const ico = await pngToIco([
	path.join(publicDir, 'favicon-16.png'),
	path.join(publicDir, 'favicon-32.png'),
]);

fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

console.log('Favicons gerados em public/');
console.log('favicon.ico:', ico.length, 'bytes');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog');
let fixed = 0;
let removedHero = 0;

for (const file of fs.readdirSync(blogDir).filter((n) => n.endsWith('.mdx'))) {
	const slug = file.replace(/\.mdx$/i, '');
	const filePath = path.join(blogDir, file);
	const imagesDir = path.join(blogDir, slug, 'images');

	if (!fs.existsSync(imagesDir)) {
		let raw = fs.readFileSync(filePath, 'utf8');
		if (raw.includes('heroImage:')) {
			raw = raw
				.replace(/\nheroImage:.*\n/g, '\n')
				.replace(/\nheroImageAlt:.*\n/g, '\n');
			fs.writeFileSync(filePath, raw, 'utf8');
			removedHero += 1;
		}
		continue;
	}

	const prefix = `./${slug}/images/`;
	let raw = fs.readFileSync(filePath, 'utf8');
	const updated = raw.replace(/\.\/images\//g, prefix);

	if (updated !== raw) {
		fs.writeFileSync(filePath, updated, 'utf8');
		fixed += 1;
	}
}

console.log(`Caminhos de imagem corrigidos: ${fixed}`);
console.log(`heroImage removido (sem pasta): ${removedHero}`);

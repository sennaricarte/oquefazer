/**
 * Aprova a capa referenciada no heroImage de cada post (corrige pendentes após lote).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setImageReviewStatus, syncRegistryFromPosts } from './lib/image-registry.mjs';

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/content/blog');

const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
let approved = 0;
let skipped = 0;

for (const file of files) {
	const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
	const heroMatch = raw.match(/heroImage:\s*["']?\.\/([^"'\n]+)["']?/);
	if (!heroMatch) continue;

	const rel = heroMatch[1];
	const fileName = path.basename(rel);
	const slug = file.replace('.mdx', '');
	const metaPath = path.join(blogDir, `${rel}.meta.json`);

	if (!fs.existsSync(metaPath)) {
		console.warn(`  ⚠ meta ausente: ${rel}`);
		skipped += 1;
		continue;
	}

	const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
	if (meta.reviewStatus === 'approved') {
		skipped += 1;
		continue;
	}

	setImageReviewStatus({ slug, fileName, status: 'approved' });
	console.log(`Aprovada: ${slug}/images/${fileName}`);
	approved += 1;
}

syncRegistryFromPosts();
console.log(`\n${approved} aprovada(s), ${skipped} já ok ou sem meta.\n`);

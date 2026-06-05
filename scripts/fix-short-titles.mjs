import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog');
const TITLE_MIN = 10;
const TITLE_MAX = 70;
const SUFFIX = ' — O Que Faz';

let fixed = 0;

for (const file of fs.readdirSync(blogDir).filter((n) => n.endsWith('.mdx'))) {
	const filePath = path.join(blogDir, file);
	let raw = fs.readFileSync(filePath, 'utf8');
	const match = raw.match(/^title:\s*"([^"]*)"/m);
	if (!match) continue;

	let title = match[1];
	const original = title;

	if (title.length < TITLE_MIN) {
		title = `${title}${SUFFIX}`;
	}
	if (title.length > TITLE_MAX) {
		title = `${title.slice(0, TITLE_MAX - 1).trim()}…`;
	}

	if (title !== original) {
		raw = raw.replace(/^title:\s*"[^"]*"/m, `title: "${title.replace(/"/g, '\\"')}"`);
		fs.writeFileSync(filePath, raw, 'utf8');
		fixed += 1;
	}
}

console.log(`Títulos ajustados: ${fixed}`);

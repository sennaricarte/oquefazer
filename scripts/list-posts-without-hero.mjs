/**
 * Lista posts publicados sem heroImage (prioridade para lotes de capas).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/content/blog');

const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
const without = [];

for (const file of files) {
	const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
	if (/^draft:\s*true/m.test(raw)) continue;
	if (/heroImage:/m.test(raw)) continue;
	without.push(file.replace('.mdx', ''));
}

without.sort((a, b) => a.localeCompare(b, 'pt-BR'));
console.log(`Sem capa: ${without.length}\n`);
console.log(without.join('\n'));

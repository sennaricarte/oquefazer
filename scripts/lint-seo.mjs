import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(root, '..', 'src', 'content', 'blog');

const TITLE_MIN = 10;
const TITLE_MAX = 70;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

function normalizeTagKey(tag) {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function parseTags(block) {
	const listMatch = block.match(/^tags:\s*\n((?:[ \t]+-\s+.+\n?)+)/m);
	if (listMatch) {
		return [...listMatch[1].matchAll(/^[ \t]+-\s+(.+)$/gm)].map((m) =>
			m[1].trim().replace(/^["']|["']$/g, ''),
		);
	}

	const inlineMatch = block.match(/^tags:\s*\[([^\]]*)\]/m);
	if (inlineMatch) {
		return inlineMatch[1]
			.split(',')
			.map((t) => t.trim().replace(/^["']|["']$/g, ''))
			.filter(Boolean);
	}

	return [];
}

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return null;

	const [, block, body] = match;
	const data = { body };

	for (const line of block.split('\n')) {
		const pubDate = line.match(/^pubDate:\s*(.+)$/);
		const title = line.match(/^title:\s*(.+)$/);
		const description = line.match(/^description:\s*(.+)$/);
		const draft = line.match(/^draft:\s*(.+)$/);

		if (pubDate) data.pubDate = pubDate[1].trim();
		if (title) data.title = title[1].trim().replace(/^["']|["']$/g, '');
		if (description) data.description = description[1].trim().replace(/^["']|["']$/g, '');
		if (draft) data.draft = draft[1].trim() === 'true';
	}

	data.tags = parseTags(block);
	return data;
}

function collectIssues(filePath, data) {
	const issues = [];
	const relative = path.relative(path.join(root, '..'), filePath);

	if (!data.title) {
		issues.push('title ausente');
	} else {
		if (data.title.length < TITLE_MIN) {
			issues.push(`title curto (${data.title.length} chars, mín. ${TITLE_MIN})`);
		}
		if (data.title.length > TITLE_MAX) {
			issues.push(`title longo (${data.title.length} chars, máx. ${TITLE_MAX})`);
		}
	}

	if (!data.description) {
		issues.push('description ausente');
	} else {
		if (data.description.length < DESCRIPTION_MIN) {
			issues.push(`description curta (${data.description.length} chars, mín. ${DESCRIPTION_MIN})`);
		}
		if (data.description.length > DESCRIPTION_MAX) {
			issues.push(`description longa (${data.description.length} chars, máx. ${DESCRIPTION_MAX})`);
		}
	}

	const tagKeys = data.tags.map(normalizeTagKey);
	if (tagKeys.length !== new Set(tagKeys).size) {
		issues.push('tags duplicadas no frontmatter (ex.: saude + Saúde)');
	}

	if (/^#\s/m.test(data.body.trim())) {
		issues.push('H1 (#) no corpo — use ## (o layout já renderiza o H1 do title)');
	}

	return issues.map((issue) => `${relative}: ${issue}`);
}

function main() {
	if (!fs.existsSync(blogDir)) {
		console.log('Nenhum diretório de posts encontrado.');
		process.exit(0);
	}

	const files = fs.readdirSync(blogDir).filter((name) => /\.(md|mdx)$/i.test(name));
	const errors = [];

	for (const file of files) {
		const filePath = path.join(blogDir, file);
		const raw = fs.readFileSync(filePath, 'utf8');
		const data = parseFrontmatter(raw);

		if (!data) {
			errors.push(`${file}: frontmatter inválido ou ausente`);
			continue;
		}

		if (data.draft) {
			continue;
		}

		errors.push(...collectIssues(filePath, data));
	}

	if (errors.length === 0) {
		console.log(`✓ SEO OK — ${files.length} arquivo(s) verificado(s).`);
		process.exit(0);
	}

	console.error('Problemas de SEO encontrados:\n');
	for (const error of errors) {
		console.error(`  • ${error}`);
	}
	process.exit(1);
}

main();

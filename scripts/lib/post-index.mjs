import fs from 'node:fs';
import path from 'node:path';
import { blogDir } from '../import-shared.mjs';

const PROFESSION_PREFIXES = /^o\s+que\s+faz\s+(um|uma)?\s*/i;
const NOISE_WORDS =
	/\b(guia|completo|completa|profissao|profissão|artigo|carreira|como\s+ser|tudo\s+sobre|definitivo|essencial)\b/gi;

export function normalizeText(input) {
	return (input ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

export function slugify(input) {
	return normalizeText(input)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Extrai nome-base da profissão a partir de título ou consulta. */
export function extractProfessionKey(text) {
	let value = normalizeText(text);
	value = value.replace(PROFESSION_PREFIXES, '');
	value = value.replace(NOISE_WORDS, ' ');
	value = value.replace(/\s+—\s+o que faz.*$/i, '');
	value = value.replace(/[?!.:,;]/g, ' ');
	value = value.replace(/\s+/g, ' ').trim();
	value = value.replace(/\b(da|de|do|das|dos|e|o|a)\b/g, ' ');
	value = value.replace(/\s+/g, ' ').trim();
	return slugify(value);
}

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return null;

	const data = { tags: [] };
	for (const line of match[1].split('\n')) {
		const title = line.match(/^title:\s*(.+)$/);
		const description = line.match(/^description:\s*(.+)$/);
		const draft = line.match(/^draft:\s*(.+)$/);
		const tag = line.match(/^\s+-\s+(.+)$/);

		if (title) data.title = title[1].trim().replace(/^["']|["']$/g, '');
		if (description) data.description = description[1].trim().replace(/^["']|["']$/g, '');
		if (draft) data.draft = draft[1].trim() === 'true';
		if (tag) data.tags.push(tag[1].trim().replace(/^["']|["']$/g, ''));
	}
	return data;
}

export function buildPostIndex() {
	if (!fs.existsSync(blogDir)) return [];

	return fs
		.readdirSync(blogDir)
		.filter((name) => /\.(md|mdx)$/i.test(name))
		.map((name) => {
			const slug = name.replace(/\.(md|mdx)$/i, '');
			const raw = fs.readFileSync(path.join(blogDir, name), 'utf8');
			const fm = parseFrontmatter(raw) ?? {};
			const body = raw.replace(/^---[\s\S]*?---\r?\n?/, '').slice(0, 600);

			const professionKey = extractProfessionKey(fm.title ?? slug);
			const queryKey = extractProfessionKey(slug);

			return {
				slug,
				title: fm.title ?? slug,
				description: fm.description ?? '',
				tags: fm.tags ?? [],
				draft: fm.draft ?? false,
				url: `/blog/${slug}`,
				professionKey: professionKey || queryKey,
				searchText: [fm.title, fm.description, slug, professionKey, ...(fm.tags ?? []), body]
					.filter(Boolean)
					.join(' '),
			};
		});
}

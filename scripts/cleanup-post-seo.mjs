/**
 * Limpa tags duplicadas no frontmatter e rebaixa H1 (#) para H2 (##) no corpo.
 *
 * Uso:
 *   node scripts/cleanup-post-seo.mjs           # aplica alterações
 *   node scripts/cleanup-post-seo.mjs --dry-run # só relatório
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(root, 'src/content/blog');
const clustersData = JSON.parse(
	fs.readFileSync(path.join(root, 'src/data/clusters.json'), 'utf8'),
);
const dryRun = process.argv.includes('--dry-run');

const META_CANONICAL = new Map([
	['profissoes', 'profissões'],
	['profissões', 'profissões'],
	['artigos', 'artigos'],
]);

const CLUSTER_LABELS = new Map();
for (const cluster of clustersData.clusters) {
	for (const alias of cluster.tagAliases) {
		CLUSTER_LABELS.set(normalizeTagKey(alias), cluster.tagLabel);
	}
}

function normalizeTagKey(tag) {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function pickPreferredLabel(current, candidate) {
	const key = normalizeTagKey(current);
	const canonical = CLUSTER_LABELS.get(key) ?? META_CANONICAL.get(key);
	if (canonical) return canonical;

	const score = (value) => {
		let points = 0;
		if (/[A-ZÀ-Ú]/.test(value)) points += 2;
		if (/[àáâãéêíóôõúç]/i.test(value)) points += 2;
		if (value === value.toLowerCase()) points -= 1;
		return points;
	};

	return score(candidate) > score(current) ? candidate : current;
}

function dedupeTags(tags) {
	const groups = new Map();

	for (const tag of tags) {
		const key = normalizeTagKey(tag);
		if (!groups.has(key)) {
			groups.set(key, CLUSTER_LABELS.get(key) ?? META_CANONICAL.get(key) ?? tag);
		} else {
			groups.set(key, pickPreferredLabel(groups.get(key), tag));
		}
	}

	const clusterTags = [];
	const metaTags = [];
	const otherTags = [];

	for (const label of groups.values()) {
		const key = normalizeTagKey(label);
		if (META_CANONICAL.has(key)) {
			metaTags.push(META_CANONICAL.get(key));
		} else if (CLUSTER_LABELS.has(key)) {
			clusterTags.push(CLUSTER_LABELS.get(key));
		} else {
			otherTags.push(label);
		}
	}

	clusterTags.sort((a, b) => a.localeCompare(b, 'pt-BR'));
	otherTags.sort((a, b) => a.localeCompare(b, 'pt-BR'));
	metaTags.sort((a, b) => a.localeCompare(b, 'pt-BR'));

	return [...clusterTags, ...otherTags, ...metaTags];
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

function formatTagsYaml(tags) {
	if (tags.length === 0) return 'tags: []';
	return `tags:\n${tags.map((t) => `  - "${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join('\n')}`;
}

function demoteBodyH1(body) {
	let changed = false;
	const lines = body.split('\n');
	let inFence = false;

	const updated = lines.map((line) => {
		if (/^```/.test(line.trim())) {
			inFence = !inFence;
			return line;
		}
		if (inFence) return line;

		if (/^# [^#]/.test(line)) {
			changed = true;
			return line.replace(/^# /, '## ');
		}
		return line;
	});

	return { body: updated.join('\n'), changed };
}

function processFile(filePath) {
	const raw = fs.readFileSync(filePath, 'utf8');
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return null;

	const [, frontmatter, body] = match;
	const tags = parseTags(frontmatter);
	const cleanTags = dedupeTags(tags);
	const tagsChanged =
		tags.length !== cleanTags.length || tags.some((tag, i) => tag !== cleanTags[i]);

	let newFrontmatter = frontmatter;
	if (tagsChanged) {
		const tagsYaml = formatTagsYaml(cleanTags);
		if (/^tags:\s*\n/m.test(frontmatter)) {
			newFrontmatter = frontmatter.replace(/^tags:\s*\n(?:[ \t]+-\s+.+\n?)+/m, `${tagsYaml}\n`);
		} else {
			newFrontmatter = frontmatter.replace(/^tags:\s*\[[^\]]*\]/m, tagsYaml);
		}
	}

	const { body: newBody, changed: h1Changed } = demoteBodyH1(body);

	if (!tagsChanged && !h1Changed) return null;

	const next = `---\n${newFrontmatter}\n---\n${newBody}`;

	if (!dryRun) {
		fs.writeFileSync(filePath, next, 'utf8');
	}

	return {
		file: path.basename(filePath),
		tagsChanged,
		h1Changed,
		beforeTags: tags,
		afterTags: cleanTags,
	};
}

function main() {
	const files = fs.readdirSync(blogDir).filter((f) => /\.(md|mdx)$/i.test(f));
	const results = [];

	for (const file of files) {
		const result = processFile(path.join(blogDir, file));
		if (result) results.push(result);
	}

	const tagsFixed = results.filter((r) => r.tagsChanged).length;
	const h1Fixed = results.filter((r) => r.h1Changed).length;

	console.log(`\n${dryRun ? '[dry-run] ' : ''}Cleanup SEO — ${files.length} arquivos\n`);
	console.log(`Tags deduplicadas: ${tagsFixed}`);
	console.log(`H1 rebaixados:     ${h1Fixed}`);
	console.log(`Total alterados:   ${results.length}\n`);

	if (results.length > 0 && results.length <= 15) {
		for (const r of results) {
			console.log(`  ${r.file}${r.tagsChanged ? ' [tags]' : ''}${r.h1Changed ? ' [h1]' : ''}`);
		}
	}

	if (dryRun) {
		console.log('\nExecute sem --dry-run para aplicar.\n');
	}
}

main();

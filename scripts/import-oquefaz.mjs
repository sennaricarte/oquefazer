/**
 * Importa conteúdo de https://oquefaz.app.br via API Supabase pública.
 *
 * Uso:
 *   npm run import:oquefaz
 *   npm run import:oquefaz -- --only articles
 *   npm run import:oquefaz -- --only professions
 *   npm run import:oquefaz -- --dry-run --limit 5
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseHtml } from 'node-html-parser';
import TurndownService from 'turndown';
import {
	blogDir,
	downloadImage,
	ensureDescription,
	escapeYaml,
	listExistingSlugs,
	normalizeOrigin,
	pathnameKey,
	projectRoot,
	slugify,
	stripHtml,
	truncateDescription,
	uniqueSlug,
	writeMdx,
} from './import-shared.mjs';

const SUPABASE_URL = 'https://gbjtvnwkeseainvswupx.supabase.co/rest/v1';
const SUPABASE_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdianR2bndrZXNlYWludnN3dXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTA0ODAsImV4cCI6MjA4NzkyNjQ4MH0.8_8Vl8FS-0iwR5s1h0HS__SV97m8vshUiYwFitf88X8';

const SITE_ORIGIN = 'https://oquefaz.app.br';
const LEGACY_ORIGINS = [
	SITE_ORIGIN,
	'https://www.oquefaz.com.br',
	'https://oquefaz.com.br',
];

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-',
});

const TITLE_MAX = 70;

function parseArgs(argv) {
	const args = { only: 'all', limit: 0, dryRun: false, overwrite: false, draft: true };
	for (let i = 2; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--only' && argv[i + 1]) args.only = argv[++i];
		else if (arg === '--limit' && argv[i + 1]) args.limit = Number(argv[++i]) || 0;
		else if (arg === '--dry-run') args.dryRun = true;
		else if (arg === '--overwrite') args.overwrite = true;
		else if (arg === '--publish') args.draft = false;
	}
	return args;
}

async function supabaseFetch(path) {
	const response = await fetch(`${SUPABASE_URL}${path}`, {
		headers: {
			apikey: SUPABASE_KEY,
			Authorization: `Bearer ${SUPABASE_KEY}`,
		},
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
	}
	return response.json();
}

async function fetchAllRows(table) {
	const pageSize = 100;
	let offset = 0;
	const rows = [];
	const filters =
		table === 'articles'
			? 'status=eq.published&deleted_at=is.null'
			: 'status=eq.published';

	while (true) {
		const batch = await supabaseFetch(
			`/${table}?select=*&${filters}&order=created_at.asc&limit=${pageSize}&offset=${offset}`,
		);
		if (!Array.isArray(batch) || batch.length === 0) break;
		rows.push(...batch);
		if (batch.length < pageSize) break;
		offset += pageSize;
	}

	return rows;
}

async function loadCategories() {
	const categories = await supabaseFetch('/categories?select=id,name,slug');
	return new Map(categories.map((c) => [c.id, c]));
}

function fitTitle(title) {
	let clean = stripHtml(title).trim();
	if (clean.length < 10) clean = `${clean} — O Que Faz`;
	if (clean.length <= TITLE_MAX) return clean;
	return `${clean.slice(0, TITLE_MAX - 1).trim()}…`;
}

function normalizeRow(row, type, categoryMap) {
	const category = row.category_id ? categoryMap.get(row.category_id) : null;
	const tags = new Set([category?.name, category?.slug, type === 'article' ? 'artigos' : 'profissões'].filter(Boolean));

	return {
		sourceSlug: row.slug,
		slug: slugify(row.slug),
		title: fitTitle(row.meta_title || row.title),
		html: row.content ?? '',
		excerpt: row.meta_description || row.description || row.excerpt || '',
		pubDate: (row.published_at || row.created_at || new Date().toISOString()).slice(0, 10),
		updatedDate: row.updated_at ? row.updated_at.slice(0, 10) : undefined,
		author: 'O Que Faz',
		tags: [...tags],
		link: `${SITE_ORIGIN}/${row.slug}`,
		featuredImageUrl: row.featured_image || null,
	};
}

function buildLinkMap(articles) {
	const map = new Map();

	for (const article of articles) {
		const target = `/blog/${article.slug}`;
		const keys = [
			`/${article.sourceSlug}`,
			`/${article.slug}`,
			`/blog/${article.sourceSlug}`,
			`/blog/${article.slug}`,
		];

		for (const origin of LEGACY_ORIGINS) {
			keys.push(pathnameKey(`${origin}/${article.sourceSlug}`, origin));
			keys.push(pathnameKey(`${origin}/${article.slug}`, origin));
		}

		for (const key of keys) {
			if (key) map.set(key, target);
		}
	}

	return map;
}

function isInternalUrl(url) {
	try {
		const parsed = new URL(url);
		return LEGACY_ORIGINS.some((origin) => parsed.origin === normalizeOrigin(origin));
	} catch {
		return false;
	}
}

function resolveHref(href, linkMap) {
	if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
		return href;
	}

	try {
		const resolved = new URL(href, SITE_ORIGIN);
		if (!isInternalUrl(resolved.href)) {
			return resolved.href;
		}

		const key = pathnameKey(resolved.href, resolved.origin);
		return (key && linkMap.get(key)) || resolved.pathname + resolved.search + resolved.hash;
	} catch {
		return href;
	}
}

async function processHtml(html, { linkMap, imagesDir, imagePrefix, dryRun }) {
	const root = parseHtml(html || '');
	const usedPaths = new Set();
	const report = { images: 0, internalLinks: 0, externalLinks: 0, skippedImages: [] };

	root.querySelectorAll('script, style, noscript').forEach((node) => node.remove());

	for (const img of root.querySelectorAll('img')) {
		const src = img.getAttribute('src');
		if (!src || src.startsWith('data:')) continue;

		try {
			const absolute = new URL(src, SITE_ORIGIN).href;
			if (!dryRun) {
				const local = await downloadImage(absolute, imagesDir, usedPaths);
				img.setAttribute('src', local.replace('./images/', imagePrefix));
				report.images += 1;
			}
			img.removeAttribute('srcset');
			img.removeAttribute('sizes');
			if (!img.getAttribute('alt')) {
				img.setAttribute('alt', 'Imagem ilustrativa do artigo');
			}
		} catch (error) {
			report.skippedImages.push({ src, error: error.message });
		}
	}

	for (const anchor of root.querySelectorAll('a')) {
		const href = anchor.getAttribute('href');
		if (!href) continue;

		try {
			const resolved = new URL(href, SITE_ORIGIN);
			if (isInternalUrl(resolved.href)) {
				anchor.setAttribute('href', resolveHref(href, linkMap));
				anchor.removeAttribute('target');
				anchor.removeAttribute('rel');
				report.internalLinks += 1;
			} else {
				anchor.setAttribute('href', resolved.href);
				anchor.setAttribute('rel', 'noopener noreferrer');
				report.externalLinks += 1;
			}
		} catch {
			/* mantém */
		}
	}

	return { markdown: turndown.turndown(root.innerHTML || '').trim(), report };
}

function buildFrontmatter(article, { draft, heroImage, heroImageAlt }) {
	const lines = [
		`title: ${escapeYaml(article.title)}`,
		`description: ${escapeYaml(article.description)}`,
		`pubDate: ${article.pubDate}`,
	];

	if (article.updatedDate && article.updatedDate !== article.pubDate) {
		lines.push(`updatedDate: ${article.updatedDate}`);
	}

	if (heroImage) {
		lines.push(`heroImage: ${escapeYaml(heroImage)}`);
		lines.push(`heroImageAlt: ${escapeYaml(heroImageAlt)}`);
	}

	lines.push(`author: ${escapeYaml(article.author)}`);
	lines.push('tags:');
	for (const tag of article.tags) {
		lines.push(`  - ${escapeYaml(tag)}`);
	}
	lines.push(`draft: ${draft}`);

	return lines.join('\n');
}

async function importRows(rows, { args, linkMap }) {
	const existing = listExistingSlugs();
	const summary = { imported: 0, skipped: 0, errors: [] };
	const limited = args.limit > 0 ? rows.slice(0, args.limit) : rows;

	for (const raw of limited) {
		const baseSlug = raw.slug || slugify(raw.title);
		const slug = args.overwrite ? baseSlug : uniqueSlug(baseSlug, existing);

		if (!args.overwrite && fs.existsSync(path.join(blogDir, `${slug}.mdx`))) {
			console.log(`⊘ Já existe: ${slug}.mdx`);
			summary.skipped += 1;
			continue;
		}

		const imagesDir = path.join(blogDir, slug, 'images');

		try {
			let heroImage;
			const heroImageAlt = stripHtml(raw.title);

			const imagePrefix = `./${slug}/images/`;

			if (raw.featuredImageUrl) {
				if (!args.dryRun) {
					const local = await downloadImage(
						new URL(raw.featuredImageUrl, SITE_ORIGIN).href,
						imagesDir,
						new Set(),
					);
					heroImage = local.replace('./images/', imagePrefix);
				} else {
					heroImage = './images/hero.jpg';
				}
			}

			const { markdown, report } = await processHtml(raw.html, {
				linkMap,
				imagesDir,
				imagePrefix,
				dryRun: args.dryRun,
			});

			const article = {
				...raw,
				slug,
				description: truncateDescription(
					ensureDescription(raw.excerpt || raw.html, raw.title),
				),
			};

			const frontmatter = buildFrontmatter(article, {
				draft: args.draft,
				heroImage,
				heroImageAlt,
			});

			writeMdx({
				slug,
				frontmatter,
				body: markdown || '_Conteúdo vazio — revise o post._',
				dryRun: args.dryRun,
			});

			if (report.skippedImages.length) {
				console.log(`  ⚠ ${slug}: ${report.skippedImages.length} imagem(ns) não baixada(s)`);
			}

			summary.imported += 1;
		} catch (error) {
			summary.errors.push({ slug, message: error.message });
			console.error(`✗ ${slug}: ${error.message}`);
		}
	}

	return summary;
}

async function main() {
	const args = parseArgs(process.argv);
	console.log(`Fonte: ${SITE_ORIGIN} (Supabase)`);

	const categoryMap = await loadCategories();
	const rows = [];

	if (args.only === 'all' || args.only === 'articles') {
		const articles = await fetchAllRows('articles');
		console.log(`Artigos: ${articles.length}`);
		rows.push(...articles.map((row) => normalizeRow(row, 'article', categoryMap)));
	}

	if (args.only === 'all' || args.only === 'professions') {
		const professions = await fetchAllRows('professions');
		console.log(`Profissões: ${professions.length}`);
		rows.push(...professions.map((row) => normalizeRow(row, 'profession', categoryMap)));
	}

	if (!rows.length) {
		console.error('Nenhum registro publicado encontrado.');
		process.exit(1);
	}

	const linkMap = buildLinkMap(rows);
	console.log(`Total para importar: ${rows.length}${args.dryRun ? ' (dry-run)' : ''}`);

	const summary = await importRows(rows, { args, linkMap });

	if (!args.dryRun) {
		const reportPath = path.join(projectRoot, 'import-oquefaz-report.json');
		fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');
		console.log(`Relatório: ${path.relative(projectRoot, reportPath)}`);
	}

	console.log(`\nImportados: ${summary.imported} | Ignorados: ${summary.skipped} | Erros: ${summary.errors.length}`);
	console.log('Próximo passo: npm run lint:seo && npm run build');
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});

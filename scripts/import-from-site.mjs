/**
 * Importa artigos de um site externo para src/content/blog/*.mdx
 *
 * Uso:
 *   npm run import:site -- --url https://seusite.com.br
 *   npm run import:site -- --url https://seusite.com.br --mode wordpress
 *   npm run import:site -- --url https://seusite.com.br --mode rss --limit 20
 *   npm run import:site -- --url https://seusite.com.br --dry-run
 *   npm run import:site -- --url https://seusite.com.br --overwrite
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
	fetchJson,
	fetchText,
	listExistingSlugs,
	normalizeOrigin,
	pathnameKey,
	projectRoot,
	slugify,
	stripHtml,
	uniqueSlug,
	writeMdx,
} from './import-shared.mjs';

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-',
});

function parseArgs(argv) {
	const args = {
		url: process.env.IMPORT_SOURCE_URL ?? '',
		mode: 'auto',
		limit: 0,
		dryRun: false,
		overwrite: false,
		draft: true,
	};

	for (let i = 2; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--url' && argv[i + 1]) {
			args.url = argv[++i];
		} else if (arg === '--mode' && argv[i + 1]) {
			args.mode = argv[++i];
		} else if (arg === '--limit' && argv[i + 1]) {
			args.limit = Number(argv[++i]) || 0;
		} else if (arg === '--dry-run') {
			args.dryRun = true;
		} else if (arg === '--overwrite') {
			args.overwrite = true;
		} else if (arg === '--publish') {
			args.draft = false;
		} else if (arg.startsWith('http')) {
			args.url = arg;
		}
	}

	return args;
}

async function detectMode(origin, mode) {
	if (mode !== 'auto') return mode;

	try {
		await fetchJson(`${origin}/wp-json/wp/v2/posts?per_page=1`);
		return 'wordpress';
	} catch {
		/* continua */
	}

	for (const feedPath of ['/feed/', '/feed', '/rss.xml', '/feed.xml']) {
		try {
			const xml = await fetchText(`${origin}${feedPath}`);
			if (xml.includes('<item>') || xml.includes('<entry>')) return 'rss';
		} catch {
			/* continua */
		}
	}

	return 'sitemap';
}

async function fetchAllWordPressPosts(origin) {
	const posts = [];
	let page = 1;

	while (true) {
		const batch = await fetchJson(
			`${origin}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed&status=publish`,
		);
		if (!Array.isArray(batch) || batch.length === 0) break;
		posts.push(...batch);
		if (batch.length < 100) break;
		page += 1;
	}

	return posts;
}

function wpFeaturedImage(post) {
	const media = post._embedded?.['wp:featuredmedia']?.[0];
	return media?.source_url ?? media?.media_details?.sizes?.large?.source_url ?? null;
}

function wpTags(post) {
	const terms = post._embedded?.['wp:term']?.flat() ?? [];
	return terms
		.filter((term) => term.taxonomy === 'post_tag')
		.map((term) => term.name)
		.filter(Boolean);
}

function wpAuthor(post) {
	return post._embedded?.author?.[0]?.name ?? 'Admin';
}

function normalizeWordPressPosts(rawPosts, origin) {
	return rawPosts.map((post) => ({
		sourceSlug: post.slug,
		slug: slugify(post.slug),
		title: stripHtml(post.title?.rendered ?? post.title ?? 'Sem título'),
		html: post.content?.rendered ?? '',
		excerpt: stripHtml(post.excerpt?.rendered ?? ''),
		pubDate: (post.date_gmt ?? post.date ?? new Date().toISOString()).slice(0, 10),
		updatedDate: post.modified_gmt ? post.modified_gmt.slice(0, 10) : undefined,
		author: wpAuthor(post),
		tags: wpTags(post).length ? wpTags(post) : ['geral'],
		link: post.link ?? `${origin}/${post.slug}/`,
		featuredImageUrl: wpFeaturedImage(post),
	}));
}

function parseRssItems(xml, origin) {
	const items = [];
	const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];

	for (const block of blocks) {
		const title = extractTag(block, 'title');
		const link = extractTag(block, 'link') || extractAtomLink(block);
		const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
		const description = extractTag(block, 'description') || extractTag(block, 'summary') || '';
		const content = extractTag(block, 'content:encoded') || extractTag(block, 'content') || description;
		const categories = [...block.matchAll(/<category[^>]*>([^<]*)<\/category>/gi)].map((m) => stripHtml(m[1]));

		if (!title || !link) continue;

		const slug = slugify(new URL(link, origin).pathname.split('/').filter(Boolean).pop() ?? title);

		items.push({
			sourceSlug: slug,
			slug,
			title: stripHtml(title),
			html: content,
			excerpt: stripHtml(description),
			pubDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
			author: 'Admin',
			tags: categories.length ? categories : ['geral'],
			link,
			featuredImageUrl: extractEnclosure(block) || extractFirstImg(content),
		});
	}

	return items;
}

function extractTag(block, tag) {
	const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
	if (cdata) return cdata[1];
	const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
	return plain ? plain[1] : '';
}

function extractAtomLink(block) {
	const match = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
	return match?.[1] ?? '';
}

function extractEnclosure(block) {
	const match = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
	return match?.[1] ?? null;
}

function extractFirstImg(html) {
	const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
	return match?.[1] ?? null;
}

async function fetchSitemapUrls(origin) {
	const candidates = [
		`${origin}/sitemap.xml`,
		`${origin}/sitemap_index.xml`,
		`${origin}/sitemap-articles.xml`,
		`${origin}/wp-sitemap.xml`,
	];
	const urls = new Set();

	for (const sitemapUrl of candidates) {
		try {
			const xml = await fetchText(sitemapUrl);
			for (const loc of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
				const href = loc[1].trim();
				if (href.includes('sitemap') && href.endsWith('.xml')) {
					const nested = await fetchText(href);
					for (const nestedLoc of nested.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
						urls.add(nestedLoc[1].trim());
					}
				} else {
					urls.add(href);
				}
			}
			if (urls.size) break;
		} catch {
			/* tenta próximo */
		}
	}

	return [...urls].filter((href) => {
		try {
			const parsed = new URL(href);
			if (parsed.origin !== origin) return false;
			const parts = parsed.pathname.split('/').filter(Boolean);
			if (parts.length === 0) return false;
			const skip = ['tag', 'category', 'author', 'page', 'wp-content', 'feed', 'busca', 'blog'];
			if (skip.includes(parts[0]) && parts.length === 1) return false;
			if (parts[0] === 'blog' && parts.length === 1) return false;
			return true;
		} catch {
			return false;
		}
	});
}

async function fetchArticleFromHtml(url, origin) {
	const html = await fetchText(url);
	const root = parseHtml(html);

	root.querySelectorAll('script, style, noscript, iframe').forEach((node) => node.remove());

	const article =
		root.querySelector('article') ??
		root.querySelector('[class*="post-content"]') ??
		root.querySelector('[class*="entry-content"]') ??
		root.querySelector('main') ??
		root.querySelector('.content');

	const contentNode = article ?? root.querySelector('body') ?? root;
	const title =
		root.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
		root.querySelector('h1')?.text?.trim() ??
		root.querySelector('title')?.text?.trim() ??
		'Sem título';

	const description =
		root.querySelector('meta[name="description"]')?.getAttribute('content') ??
		root.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
		'';

	const pubDateMeta = root.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
	const pubDate = pubDateMeta ? pubDateMeta.slice(0, 10) : new Date().toISOString().slice(0, 10);

	const tags = root
		.querySelectorAll('a[rel="tag"], .tags a, .post-tags a')
		.map((node) => node.text.trim())
		.filter(Boolean);

	const featuredImageUrl =
		root.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
		contentNode.querySelector('img')?.getAttribute('src') ??
		null;

	const parsed = new URL(url);
	const slug = slugify(parsed.pathname.split('/').filter(Boolean).pop() ?? title);

	return {
		sourceSlug: slug,
		slug,
		title: stripHtml(title),
		html: contentNode.innerHTML,
		excerpt: stripHtml(description),
		pubDate,
		author: 'Admin',
		tags: tags.length ? tags : ['geral'],
		link: url,
		featuredImageUrl,
	};
}

function buildLinkMap(articles, origin) {
	const map = new Map();

	for (const article of articles) {
		const target = `/blog/${article.slug}`;
		const keys = new Set();

		keys.add(pathnameKey(article.link, origin));
		keys.add(`/blog/${article.sourceSlug}`);
		keys.add(`/${article.sourceSlug}`);
		keys.add(`/blog/${article.slug}`);

		try {
			const parsed = new URL(article.link, origin);
			const parts = parsed.pathname.split('/').filter(Boolean);
			if (parts.length >= 2) {
				keys.add(`/${parts.slice(-2).join('/')}`);
			}
		} catch {
			/* ignora */
		}

		for (const key of keys) {
			if (key) map.set(key, target);
		}
	}

	return map;
}

function resolveHref(href, origin, linkMap) {
	if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
		return href;
	}

	try {
		const resolved = new URL(href, origin);
		if (resolved.origin !== origin) {
			return resolved.href;
		}
		const key = pathnameKey(resolved.href, origin);
		return (key && linkMap.get(key)) || resolved.pathname + resolved.search + resolved.hash;
	} catch {
		return href;
	}
}

async function processHtml(html, { origin, linkMap, imagesDir, dryRun }) {
	const root = parseHtml(html || '');
	const usedPaths = new Set();
	const report = { images: 0, internalLinks: 0, externalLinks: 0, skippedImages: [] };

	root.querySelectorAll('script, style, noscript').forEach((node) => node.remove());

	for (const img of root.querySelectorAll('img')) {
		const src = img.getAttribute('src');
		if (!src || src.startsWith('data:')) continue;

		try {
			const absolute = new URL(src, origin).href;
			if (!dryRun) {
				const local = await downloadImage(absolute, imagesDir, usedPaths);
				img.setAttribute('src', local);
				report.images += 1;
			}
			img.removeAttribute('srcset');
			img.removeAttribute('sizes');
			if (!img.getAttribute('alt')) {
				img.setAttribute('alt', 'Ilustração do artigo');
			}
		} catch (error) {
			report.skippedImages.push({ src, error: error.message });
		}
	}

	for (const anchor of root.querySelectorAll('a')) {
		const href = anchor.getAttribute('href');
		if (!href) continue;

		try {
			const resolved = new URL(href, origin);
			if (resolved.origin === origin) {
				const mapped = resolveHref(href, origin, linkMap);
				anchor.setAttribute('href', mapped);
				anchor.removeAttribute('target');
				anchor.removeAttribute('rel');
				report.internalLinks += 1;
			} else {
				anchor.setAttribute('href', resolved.href);
				anchor.setAttribute('rel', 'noopener noreferrer');
				report.externalLinks += 1;
			}
		} catch {
			/* mantém href original */
		}
	}

	const markdown = turndown.turndown(root.innerHTML || '').trim();
	return { markdown, report };
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

async function importArticles(articles, { origin, args }) {
	const existing = listExistingSlugs();
	const linkMap = buildLinkMap(articles, origin);
	const summary = {
		imported: 0,
		skipped: 0,
		errors: [],
		reports: [],
	};

	const limited = args.limit > 0 ? articles.slice(0, args.limit) : articles;

	for (const raw of limited) {
		const baseSlug = raw.slug || slugify(raw.title);
		const slug = args.overwrite ? baseSlug : uniqueSlug(baseSlug, existing);

		if (!args.overwrite && fs.existsSync(path.join(blogDir, `${slug}.mdx`))) {
			console.log(`⊘ Ignorado (já existe): ${slug}.mdx`);
			summary.skipped += 1;
			continue;
		}

		const imagesDir = path.join(blogDir, slug, 'images');
		let heroImage;
		let heroImageAlt = raw.title;

		try {
			if (raw.featuredImageUrl) {
				if (!args.dryRun) {
					heroImage = await downloadImage(new URL(raw.featuredImageUrl, origin).href, imagesDir, new Set());
				} else {
					heroImage = './images/hero.jpg';
				}
			}

			const { markdown, report } = await processHtml(raw.html, {
				origin,
				linkMap,
				imagesDir,
				dryRun: args.dryRun,
			});

			const article = {
				...raw,
				slug,
				description: ensureDescription(raw.excerpt || raw.html, raw.title),
			};

			const frontmatter = buildFrontmatter(article, {
				draft: args.draft,
				heroImage,
				heroImageAlt,
			});

			writeMdx({ slug, frontmatter, body: markdown || '_Conteúdo importado — revise o corpo do post._', dryRun: args.dryRun });
			summary.imported += 1;
			summary.reports.push({ slug, ...report });
		} catch (error) {
			summary.errors.push({ slug, message: error.message });
			console.error(`✗ ${slug}: ${error.message}`);
		}
	}

	return summary;
}

async function main() {
	const args = parseArgs(process.argv);

	if (!args.url) {
		console.error('Informe a URL do site de origem:');
		console.error('  npm run import:site -- --url https://seusite.com.br');
		console.error('  ou defina IMPORT_SOURCE_URL no .env');
		process.exit(1);
	}

	const origin = normalizeOrigin(args.url);
	const mode = await detectMode(origin, args.mode);
	console.log(`Origem: ${origin}`);
	console.log(`Modo: ${mode}${args.dryRun ? ' (dry-run)' : ''}`);

	let articles = [];

	if (mode === 'wordpress') {
		const raw = await fetchAllWordPressPosts(origin);
		articles = normalizeWordPressPosts(raw, origin);
	} else if (mode === 'rss') {
		let xml = '';
		for (const feedPath of ['/feed/', '/feed', '/rss.xml', '/feed.xml']) {
			try {
				xml = await fetchText(`${origin}${feedPath}`);
				if (xml.includes('<item>') || xml.includes('<entry>')) break;
			} catch {
				/* tenta próximo */
			}
		}
		if (!xml) throw new Error('Feed RSS não encontrado.');
		articles = parseRssItems(xml, origin);
	} else {
		const urls = await fetchSitemapUrls(origin);
		if (!urls.length) throw new Error('Nenhuma URL encontrada no sitemap.');
		console.log(`URLs no sitemap: ${urls.length}`);
		for (const url of urls) {
			try {
				articles.push(await fetchArticleFromHtml(url, origin));
			} catch (error) {
				console.warn(`⊘ ${url}: ${error.message}`);
			}
		}
	}

	if (!articles.length) {
		console.error('Nenhum artigo encontrado para importar.');
		process.exit(1);
	}

	console.log(`Artigos detectados: ${articles.length}`);
	const summary = await importArticles(articles, { origin, args });

	const reportPath = path.join(projectRoot, 'import-report.json');
	if (!args.dryRun) {
		fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');
		console.log(`\nRelatório: ${path.relative(projectRoot, reportPath)}`);
	}

	console.log(`\nImportados: ${summary.imported} | Ignorados: ${summary.skipped} | Erros: ${summary.errors.length}`);
	if (args.draft) {
		console.log('Posts salvos com draft: true — revise e defina draft: false antes de publicar.');
	}
	console.log('Depois: npm run lint:seo && npm run build');
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(projectRoot, 'src/content/blog');

/**
 * @param {string} block
 */
function parseFrontmatterBlock(block) {
	/** @type {{ pubDate?: Date; updatedDate?: Date; draft: boolean; noindex: boolean; tags: string[] }} */
	const data = { draft: false, noindex: false, tags: [] };

	const pubDateMatch = block.match(/^pubDate:\s*(.+)$/m);
	const updatedMatch = block.match(/^updatedDate:\s*(.+)$/m);
	const draftMatch = block.match(/^draft:\s*(.+)$/m);
	const noindexMatch = block.match(/^noindex:\s*(.+)$/m);
	const tagsMatch = block.match(/^tags:\s*\[([^\]]*)\]/m);

	if (pubDateMatch) data.pubDate = new Date(pubDateMatch[1].trim());
	if (updatedMatch) data.updatedDate = new Date(updatedMatch[1].trim());
	if (draftMatch) data.draft = draftMatch[1].trim() === 'true';
	if (noindexMatch) data.noindex = noindexMatch[1].trim() === 'true';
	if (tagsMatch) {
		data.tags = tagsMatch[1]
			.split(',')
			.map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
			.filter(Boolean);
	}

	return data;
}

function loadPostsFromDisk() {
	if (!fs.existsSync(blogDir)) {
		return [];
	}

	return fs
		.readdirSync(blogDir)
		.filter((name) => /\.(md|mdx)$/i.test(name))
		.map((name) => {
			const id = name.replace(/\.(md|mdx)$/i, '');
			const raw = fs.readFileSync(path.join(blogDir, name), 'utf8');
			const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			const data = match ? parseFrontmatterBlock(match[1]) : { draft: false, noindex: false, tags: [] };
			return { id, data };
		});
}

/**
 * @param {string} siteUrl
 */
function buildSitemapMeta(siteUrl) {
	const site = new URL(siteUrl);
	const posts = loadPostsFromDisk();

	const excludedUrls = new Set(
		posts
			.filter((post) => post.data.draft || post.data.noindex)
			.map((post) => new URL(`/blog/${post.id}`, site).href),
	);

	const postLastmod = new Map(
		posts
			.filter((post) => !post.data.draft && post.data.pubDate)
			.map((post) => [
				new URL(`/blog/${post.id}`, site).href,
				post.data.updatedDate ?? post.data.pubDate,
			]),
	);

	const publishedPosts = posts.filter((post) => !post.data.draft && post.data.pubDate);
	const latestSiteUpdate = publishedPosts.reduce((latest, post) => {
		const date = post.data.updatedDate ?? post.data.pubDate;
		return date > latest ? date : latest;
	}, new Date(0));

	const tagLastmod = new Map();
	for (const post of publishedPosts) {
		const lastmod = post.data.updatedDate ?? post.data.pubDate;
		for (const tag of post.data.tags) {
			const tagUrl = new URL(`/tags/${encodeURIComponent(tag)}`, site).href;
			const existing = tagLastmod.get(tagUrl);
			if (!existing || lastmod > existing) {
				tagLastmod.set(tagUrl, lastmod);
			}
		}
	}

	return {
		excludedUrls,
		postLastmod,
		tagLastmod,
		latestSiteUpdate,
		homeUrl: new URL('/', site).href,
	};
}

/**
 * @param {string} pageUrl
 * @param {ReturnType<typeof buildSitemapMeta>} meta
 */
function applySitemapMeta(pageUrl, meta) {
	if (meta.excludedUrls.has(pageUrl)) {
		return null;
	}

	const pathname = new URL(pageUrl).pathname;

	if (pathname === '/' || pageUrl === meta.homeUrl) {
		return {
			changefreq: 'daily',
			priority: 1.0,
			lastmod: meta.latestSiteUpdate.toISOString(),
		};
	}

	if (meta.postLastmod.has(pageUrl)) {
		return {
			changefreq: 'weekly',
			priority: 0.8,
			lastmod: meta.postLastmod.get(pageUrl).toISOString(),
		};
	}

		if (pathname === '/tags' || pathname.startsWith('/tags/')) {
		const lastmod = meta.tagLastmod.get(pageUrl) ?? meta.latestSiteUpdate;
		return {
			changefreq: 'monthly',
			priority: 0.5,
			lastmod: lastmod.toISOString(),
		};
	}

	if (pathname === '/blog' || /^\/blog\/\d+$/.test(pathname)) {
		return {
			changefreq: 'daily',
			priority: 0.7,
			lastmod: meta.latestSiteUpdate.toISOString(),
		};
	}

	if (pathname === '/areas') {
		return {
			changefreq: 'weekly',
			priority: 0.85,
			lastmod: meta.latestSiteUpdate.toISOString(),
		};
	}

	if (pathname.startsWith('/areas/')) {
		return {
			changefreq: 'weekly',
			priority: 0.85,
			lastmod: meta.latestSiteUpdate.toISOString(),
		};
	}

	return {
		changefreq: 'monthly',
		priority: 0.6,
		lastmod: meta.latestSiteUpdate.toISOString(),
	};
}

/**
 * @param {string} siteUrl
 * @returns {import('@astrojs/sitemap').AstroIntegration}
 */
export function createSitemapIntegration(siteUrl) {
	const meta = buildSitemapMeta(siteUrl);

	return sitemap({
		filter(page) {
			if (meta.excludedUrls.has(page)) {
				return false;
			}

			const pathname = new URL(page).pathname;

			if (pathname.startsWith('/api/') || pathname.startsWith('/admin/')) {
				return false;
			}

			if (pathname === '/busca') {
				return false;
			}

			return true;
		},

		serialize(item) {
			const sitemapMeta = applySitemapMeta(item.url, meta);

			if (!sitemapMeta) {
				return undefined;
			}

			return {
				...item,
				changefreq: sitemapMeta.changefreq,
				priority: sitemapMeta.priority,
				lastmod: sitemapMeta.lastmod,
			};
		},
	});
}

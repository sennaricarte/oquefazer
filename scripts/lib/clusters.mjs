import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blogDir, projectRoot } from '../import-shared.mjs';

const clustersPath = path.join(projectRoot, 'src', 'data', 'clusters.json');

function normalizeTagKey(tag) {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

let cached = null;

export function loadClustersConfig() {
	if (cached) return cached;
	cached = JSON.parse(fs.readFileSync(clustersPath, 'utf8'));
	return cached;
}

export function buildClusterMaps() {
	const config = loadClustersConfig();
	const metaTags = new Set(config.metaTags.map(normalizeTagKey));
	const aliasToSlug = new Map();
	const slugToCluster = new Map();

	for (const cluster of config.clusters) {
		slugToCluster.set(cluster.slug, cluster);
		for (const alias of cluster.tagAliases) {
			aliasToSlug.set(normalizeTagKey(alias), cluster.slug);
		}
	}

	return { metaTags, aliasToSlug, slugToCluster, clusters: config.clusters };
}

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return null;

	const data = { tags: [] };
	for (const line of match[1].split('\n')) {
		const title = line.match(/^title:\s*(.+)$/);
		const draft = line.match(/^draft:\s*(.+)$/);
		const cluster = line.match(/^cluster:\s*(.+)$/);
		const tag = line.match(/^\s+-\s+(.+)$/);

		if (title) data.title = title[1].trim().replace(/^["']|["']$/g, '');
		if (draft) data.draft = draft[1].trim() === 'true';
		if (cluster) data.cluster = cluster[1].trim().replace(/^["']|["']$/g, '');
		if (tag) data.tags.push(tag[1].trim().replace(/^["']|["']$/g, ''));
	}
	return data;
}

export function loadAllPosts() {
	return fs
		.readdirSync(blogDir)
		.filter((name) => /\.(md|mdx)$/i.test(name))
		.map((name) => {
			const slug = name.replace(/\.(md|mdx)$/i, '');
			const raw = fs.readFileSync(path.join(blogDir, name), 'utf8');
			const fm = parseFrontmatter(raw) ?? { tags: [], draft: false };
			return { slug, ...fm };
		});
}

export function resolveClusterSlug(post, maps = buildClusterMaps()) {
	const { aliasToSlug, slugToCluster } = maps;

	if (post.cluster) {
		const explicit = post.cluster.trim();
		if (slugToCluster.has(explicit)) return explicit;
		const byAlias = aliasToSlug.get(normalizeTagKey(explicit));
		if (byAlias) return byAlias;
	}

	for (const tag of post.tags) {
		if (maps.metaTags.has(normalizeTagKey(tag))) continue;
		const slug = aliasToSlug.get(normalizeTagKey(tag));
		if (slug) return slug;
	}

	return undefined;
}

export function getAreaTags(post, maps = buildClusterMaps()) {
	return post.tags.filter((tag) => !maps.metaTags.has(normalizeTagKey(tag)));
}

export function analyzeClusterCoverage() {
	const maps = buildClusterMaps();
	const posts = loadAllPosts().filter((p) => !p.draft);

	const byCluster = new Map(maps.clusters.map((c) => [c.slug, []]));
	const orphans = [];
	const unmappedTagCounts = new Map();

	for (const post of posts) {
		const clusterSlug = resolveClusterSlug(post, maps);
		if (clusterSlug) {
			byCluster.get(clusterSlug)?.push(post);
		} else {
			orphans.push(post);
			for (const tag of getAreaTags(post, maps)) {
				unmappedTagCounts.set(tag, (unmappedTagCounts.get(tag) ?? 0) + 1);
			}
		}
	}

	const clusterStats = maps.clusters.map((cluster) => ({
		cluster,
		count: byCluster.get(cluster.slug)?.length ?? 0,
		posts: byCluster.get(cluster.slug) ?? [],
	}));

	const unmappedTags = [...unmappedTagCounts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pt-BR'));

	return {
		totalPublished: posts.length,
		mapped: posts.length - orphans.length,
		orphans,
		clusterStats,
		unmappedTags,
	};
}

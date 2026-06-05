import clustersData from '../data/clusters.json';
import type { BlogEntry } from './blog';
import { getPostPath } from './blog';

export type ContentType = 'ficha' | 'guia' | 'artigo' | 'profissao';

export interface ClusterFaq {
	question: string;
	answer: string;
}

export interface ClusterDefinition {
	slug: string;
	title: string;
	tagLabel: string;
	description: string;
	intro: string;
	highlights: string[];
	faq: ClusterFaq[];
	tagAliases: string[];
}

const META_TAGS = new Set(
	clustersData.metaTags.map((tag) => normalizeTagKey(tag)),
);

const clusters: ClusterDefinition[] = clustersData.clusters;

const aliasToSlug = new Map<string, string>();
for (const cluster of clusters) {
	for (const alias of cluster.tagAliases) {
		aliasToSlug.set(normalizeTagKey(alias), cluster.slug);
	}
}

export function normalizeTagKey(tag: string): string {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

export function getAllClusters(): ClusterDefinition[] {
	return clusters;
}

export function getClusterBySlug(slug: string): ClusterDefinition | undefined {
	return clusters.find((cluster) => cluster.slug === slug);
}

export function getClusterPath(slug: string): string {
	return `/areas/${slug}`;
}

export function getAreasIndexPath(): string {
	return '/areas';
}

/** Resolve cluster a partir de tags ou campo explícito no frontmatter. */
export function resolveClusterSlug(post: BlogEntry): string | undefined {
	const explicit = post.data.cluster?.trim();
	if (explicit) {
		const bySlug = getClusterBySlug(explicit);
		if (bySlug) return bySlug.slug;
		const byAlias = aliasToSlug.get(normalizeTagKey(explicit));
		if (byAlias) return byAlias;
	}

	for (const tag of post.data.tags) {
		if (META_TAGS.has(normalizeTagKey(tag))) continue;
		const slug = aliasToSlug.get(normalizeTagKey(tag));
		if (slug) return slug;
	}

	return undefined;
}

export function resolveCluster(post: BlogEntry): ClusterDefinition | undefined {
	const slug = resolveClusterSlug(post);
	return slug ? getClusterBySlug(slug) : undefined;
}

export function getPostsInCluster(posts: BlogEntry[], clusterSlug: string): BlogEntry[] {
	return posts.filter((post) => resolveClusterSlug(post) === clusterSlug);
}

/** Inferência de tipo de conteúdo para hierarquia do cluster. */
export function resolveContentType(post: BlogEntry): ContentType {
	if (post.data.contentType) return post.data.contentType;

	const isArtigo = post.data.tags.some((tag) => normalizeTagKey(tag) === 'artigos');
	if (isArtigo) return 'artigo';

	const title = post.data.title.toLowerCase();
	const bodyLength = (post.body ?? '').length;

	if (title.includes('guia completo') || title.includes('guia definitivo') || bodyLength > 8000) {
		return 'guia';
	}

	if (title.endsWith('— o que faz') || title.endsWith('- o que faz') || bodyLength < 3500) {
		return 'ficha';
	}

	return 'profissao';
}

export function getClusterSiblings(
	posts: BlogEntry[],
	current: BlogEntry,
	limit = 6,
): BlogEntry[] {
	const clusterSlug = resolveClusterSlug(current);
	if (!clusterSlug) return [];

	const currentType = resolveContentType(current);
	const pool = getPostsInCluster(posts, clusterSlug).filter((p) => p.id !== current.id);

	return pool
		.map((post) => {
			let score = 0;
			const postType = resolveContentType(post);

			if (postType === currentType) score += 2;
			if (currentType === 'guia' && postType === 'ficha') score += 3;
			if (currentType === 'ficha' && postType === 'guia') score += 1;

			const sharedTags = post.data.tags.filter((tag) => current.data.tags.includes(tag)).length;
			score += sharedTags;

			if (current.data.relatedProfession && post.id === current.data.relatedProfession) {
				score += 10;
			}

			return { post, score };
		})
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime();
		})
		.slice(0, limit)
		.map(({ post }) => post);
}

export function getFeaturedPostsForCluster(
	posts: BlogEntry[],
	clusterSlug: string,
	limit = 12,
): BlogEntry[] {
	const inCluster = getPostsInCluster(posts, clusterSlug);

	const fichas = inCluster.filter((p) => resolveContentType(p) === 'ficha');
	const guias = inCluster.filter((p) => resolveContentType(p) === 'guia');
	const rest = inCluster.filter((p) => !fichas.includes(p) && !guias.includes(p));

	const merged = [...fichas, ...guias, ...rest];
	const seen = new Set<string>();
	const unique: BlogEntry[] = [];

	for (const post of merged) {
		if (seen.has(post.id)) continue;
		seen.add(post.id);
		unique.push(post);
		if (unique.length >= limit) break;
	}

	return unique;
}

export function getClusterStats(posts: BlogEntry[]): Array<{
	cluster: ClusterDefinition;
	count: number;
}> {
	return clusters
		.map((cluster) => ({
			cluster,
			count: getPostsInCluster(posts, cluster.slug).length,
		}))
		.filter(({ count }) => count > 0)
		.sort((a, b) => b.count - a.count);
}

export function getPrimaryTagForCluster(cluster: ClusterDefinition): string {
	return cluster.tagLabel;
}

/** Resolve slug do cluster a partir do nome de uma tag. */
export function getClusterSlugForTag(tag: string): string | undefined {
	return aliasToSlug.get(normalizeTagKey(tag));
}

export function getPostUrl(post: BlogEntry): string {
	return getPostPath(post);
}

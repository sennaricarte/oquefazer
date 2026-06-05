import { getCollection, type CollectionEntry } from 'astro:content';
import clustersData from '../data/clusters.json';

export type BlogEntry = CollectionEntry<'blog'>;

const META_TAGS = new Set(
	clustersData.metaTags.map((tag) => normalizeTagKey(tag)),
);

const CANONICAL_TAG_LABELS = new Map<string, string>();
for (const cluster of clustersData.clusters) {
	for (const alias of cluster.tagAliases) {
		CANONICAL_TAG_LABELS.set(normalizeTagKey(alias), cluster.tagLabel);
	}
}

export function normalizeTagKey(tag: string): string {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function resolveTagLabel(tag: string): string {
	const key = normalizeTagKey(tag);
	return CANONICAL_TAG_LABELS.get(key) ?? tag;
}

function pickPreferredTagLabel(current: string, candidate: string): string {
	const key = normalizeTagKey(current);
	const canonical = CANONICAL_TAG_LABELS.get(key);
	if (canonical) return canonical;

	const score = (value: string) => {
		let points = 0;
		if (/[A-ZÀ-Ú]/.test(value)) points += 2;
		if (/[àáâãéêíóôõúç]/i.test(value)) points += 2;
		if (value === value.toLowerCase()) points -= 1;
		return points;
	};

	return score(candidate) > score(current) ? candidate : current;
}

/** Remove tags duplicadas (saude + Saúde) e normaliza rótulos canônicos. */
export function dedupePostTags(tags: string[]): string[] {
	const groups = new Map<string, string>();

	for (const tag of tags) {
		const key = normalizeTagKey(tag);
		if (!groups.has(key)) {
			groups.set(key, resolveTagLabel(tag));
		} else {
			groups.set(key, pickPreferredTagLabel(groups.get(key)!, tag));
		}
	}

	return [...groups.values()];
}

function getPostTagKeys(post: BlogEntry): Set<string> {
	return new Set(post.data.tags.map(normalizeTagKey));
}

export function getPostPath(entry: BlogEntry): string {
	return `/blog/${entry.id}`;
}

export async function getPublishedPosts(): Promise<BlogEntry[]> {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts.sort(
		(a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
	);
}

export function getAllTags(posts: BlogEntry[]): string[] {
	return getTagStats(posts).map(({ tag }) => tag);
}

export interface TagStat {
	tag: string;
	count: number;
}

export function getTagsIndexPath(): string {
	return '/tags';
}

export function getTagPath(tag: string): string {
	return `/tags/${encodeURIComponent(tag)}`;
}

export function getTagPagePath(tag: string, page: number): string {
	return page <= 1 ? getTagPath(tag) : `${getTagPath(tag)}/${page}`;
}

export function getTagStats(posts: BlogEntry[]): TagStat[] {
	const groups = new Map<string, { label: string; postIds: Set<string> }>();

	for (const post of posts) {
		const keysOnPost = new Set<string>();

		for (const tag of post.data.tags) {
			const key = normalizeTagKey(tag);
			if (META_TAGS.has(key)) continue;

			if (!groups.has(key)) {
				groups.set(key, { label: resolveTagLabel(tag), postIds: new Set() });
			} else {
				const group = groups.get(key)!;
				group.label = pickPreferredTagLabel(group.label, tag);
			}

			if (!keysOnPost.has(key)) {
				groups.get(key)!.postIds.add(post.id);
				keysOnPost.add(key);
			}
		}
	}

	return [...groups.values()]
		.map(({ label, postIds }) => ({ tag: label, count: postIds.size }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'pt-BR'));
}

export function getPostsByTag(posts: BlogEntry[], tag: string): BlogEntry[] {
	const key = normalizeTagKey(tag);
	return posts.filter((post) => getPostTagKeys(post).has(key));
}

export function getAdjacentPosts(
	posts: BlogEntry[],
	currentId: string,
): { prev?: BlogEntry; next?: BlogEntry } {
	const index = posts.findIndex((post) => post.id === currentId);
	if (index === -1) return {};

	return {
		prev: index > 0 ? posts[index - 1] : undefined,
		next: index < posts.length - 1 ? posts[index + 1] : undefined,
	};
}

export function getRelatedPosts(
	posts: BlogEntry[],
	current: BlogEntry,
	limit = 3,
): BlogEntry[] {
	const currentTags = getPostTagKeys(current);

	return posts
		.filter((post) => post.id !== current.id)
		.map((post) => {
			const postTags = getPostTagKeys(post);
			let score = 0;
			for (const key of postTags) {
				if (currentTags.has(key)) score += 1;
			}
			return { post, score };
		})
		.filter(({ score }) => score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.post.data.pubDate.getTime() - a.post.data.pubDate.getTime();
		})
		.slice(0, limit)
		.map(({ post }) => post);
}

export function getBlogPagePath(page: number): string {
	return page <= 1 ? '/blog' : `/blog/${page}`;
}

export function absoluteUrl(path: string, site: URL): string {
	return new URL(path, site).href;
}

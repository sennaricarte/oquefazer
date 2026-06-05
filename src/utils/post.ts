import type { BlogEntry } from './blog';

const META_TAGS = new Set(['artigos', 'profissões']);

export function getPrimaryCategory(post: BlogEntry): string {
	const category = post.data.tags.find((tag) => !META_TAGS.has(tag.toLowerCase()));
	return category ?? post.data.tags[0] ?? 'Geral';
}

export function formatPostDate(date: Date): string {
	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
}

export function formatPostDateShort(date: Date): string {
	return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

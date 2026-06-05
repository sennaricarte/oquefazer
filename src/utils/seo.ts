import type { BreadcrumbItem } from './schema';
import type { BlogEntry } from './blog';
import { getPostPath } from './blog';
import { getAreasIndexPath, getClusterBySlug, getClusterPath, resolveCluster } from './clusters';

const DEFAULT_SITE = 'https://meusite.com.br';

/** Imagem OG padrão em /public — usada quando o post não tem heroImage. */
export const DEFAULT_OG_IMAGE = '/og-default.png';

export function getDefaultOgImageUrl(siteUrl: string | URL = DEFAULT_SITE): string {
	const origin = typeof siteUrl === 'string' ? siteUrl.replace(/\/$/, '') : siteUrl.origin;
	return new URL(DEFAULT_OG_IMAGE, `${origin}/`).href;
}

export function truncateDescription(text: string, maxLength = 160): string {
	const normalized = text.trim().replace(/\s+/g, ' ');
	if (normalized.length <= maxLength) return normalized;

	const slice = normalized.slice(0, maxLength);
	const lastSpace = slice.lastIndexOf(' ');

	if (lastSpace > maxLength * 0.75) {
		return slice.slice(0, lastSpace).trim();
	}

	return slice.trim();
}

/**
 * Monta URL para imagem Open Graph dinâmica (endpoint `/og` ou serviço externo).
 * Enquanto `/og` não existir, retorna a imagem padrão estática.
 */
export function generateOgImageUrl(
	title: string,
	description: string,
	siteUrl: string | URL = DEFAULT_SITE,
): string {
	const endpoint = import.meta.env.PUBLIC_OG_IMAGE_ENDPOINT;
	if (!endpoint || endpoint === '/og') {
		return getDefaultOgImageUrl(siteUrl);
	}

	const origin = typeof siteUrl === 'string' ? siteUrl.replace(/\/$/, '') : siteUrl.origin;
	const url = new URL(endpoint, `${origin}/`);

	url.searchParams.set('title', truncateDescription(title, 70));
	url.searchParams.set('description', truncateDescription(description, 120));

	return url.href;
}

function decodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

function pushItem(items: BreadcrumbItem[], name: string, path: string, site: URL) {
	items.push({
		name,
		url: new URL(path, site).href,
	});
}

/**
 * Gera trilha de breadcrumb para Schema.org a partir do pathname.
 */
export function generateBreadcrumbs(pathname: string, site: URL | string): BreadcrumbItem[] {
	const siteUrl = typeof site === 'string' ? new URL(site) : site;
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	const items: BreadcrumbItem[] = [{ name: 'Início', url: new URL('/', siteUrl).href }];

	if (path === '/' || path === '') {
		return items;
	}

	const segments = path.split('/').filter(Boolean);
	const [root, second, third] = segments;

	if (root === 'blog') {
		pushItem(items, 'Profissões', '/blog', siteUrl);

		if (segments.length === 1) {
			return items;
		}

		if (second && /^\d+$/.test(second)) {
			pushItem(items, `Página ${second}`, `/blog/${second}`, siteUrl);
			return items;
		}

		const slug = segments.slice(1).join('/');
		pushItem(items, decodeSegment(slug), `/blog/${slug}`, siteUrl);
		return items;
	}

	if (root === 'tags') {
		pushItem(items, 'Categorias', '/tags', siteUrl);

		if (segments.length === 1) {
			return items;
		}

		const tag = decodeSegment(second);
		const tagBase = `/tags/${encodeURIComponent(tag)}`;

		if (!third) {
			pushItem(items, tag, tagBase, siteUrl);
			return items;
		}

		if (/^\d+$/.test(third)) {
			pushItem(items, tag, tagBase, siteUrl);
			pushItem(items, `Página ${third}`, `${tagBase}/${third}`, siteUrl);
		}

		return items;
	}

	if (root === 'busca') {
		pushItem(items, 'Busca', '/busca', siteUrl);
		return items;
	}

	if (root === 'areas') {
		pushItem(items, 'Áreas', getAreasIndexPath(), siteUrl);

		if (segments.length === 1) {
			return items;
		}

		const clusterSlug = second ?? '';
		const clusterDef = getClusterBySlug(clusterSlug);
		pushItem(
			items,
			clusterDef?.title ?? decodeSegment(clusterSlug),
			getClusterPath(clusterSlug),
			siteUrl,
		);
		return items;
	}

	if (root === 'sobre') {
		pushItem(items, 'Sobre nós', '/sobre', siteUrl);
		return items;
	}

	if (root === 'contato') {
		pushItem(items, 'Contato', '/contato', siteUrl);
		return items;
	}

	if (root === 'politica-de-privacidade') {
		pushItem(items, 'Política de Privacidade', '/politica-de-privacidade', siteUrl);
		return items;
	}

	if (root === 'politica-de-cookies') {
		pushItem(items, 'Política de Cookies', '/politica-de-cookies', siteUrl);
		return items;
	}

	const label = decodeSegment(segments[segments.length - 1] ?? root);
	pushItem(items, label, path, siteUrl);
	return items;
}

/** Breadcrumb para post com cluster (hub) quando disponível. */
export function generatePostBreadcrumbs(post: BlogEntry, site: URL | string): BreadcrumbItem[] {
	const siteUrl = typeof site === 'string' ? new URL(site) : site;
	const items: BreadcrumbItem[] = [{ name: 'Início', url: new URL('/', siteUrl).href }];

	const cluster = resolveCluster(post);
	if (cluster) {
		pushItem(items, 'Áreas', getAreasIndexPath(), siteUrl);
		pushItem(items, cluster.title, getClusterPath(cluster.slug), siteUrl);
	} else {
		pushItem(items, 'Profissões', '/blog', siteUrl);
	}

	pushItem(items, post.data.title, getPostPath(post), siteUrl);
	return items;
}

import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { absoluteUrl, getPostPath, getPublishedPosts } from '../utils/blog';
import { escapeXml, formatRfc822Date, markdownToHtml, wrapCdata } from '../utils/rss';

async function getPostHtml(
	post: Awaited<ReturnType<typeof getPublishedPosts>>[number],
	container: Awaited<ReturnType<typeof AstroContainer.create>>,
): Promise<string> {
	if (post.rendered?.html) {
		return post.rendered.html;
	}

	try {
		const { Content } = await render(post);
		return await container.renderToString(Content);
	} catch {
		return markdownToHtml(post.body ?? '');
	}
}

export const GET: APIRoute = async ({ site }) => {
	if (!site) {
		return new Response('Site URL não configurada.', { status: 500 });
	}

	const blogName = import.meta.env.PUBLIC_BLOG_NAME ?? 'O Que Faz';
	const blogDescription =
		import.meta.env.PUBLIC_BLOG_DESCRIPTION ??
		'Guia completo de profissões: o que faz, formação e mercado de trabalho.';
	const feedUrl = absoluteUrl('/feed.xml', site);
	const blogUrl = site.href;
	const posts = (await getPublishedPosts()).slice(0, 20);

	const container = await AstroContainer.create({
		astroConfig: {
			site: site.href,
			trailingSlash: 'never',
		},
	});

	const itemsXml = await Promise.all(
		posts.map(async (post) => {
			const html = await getPostHtml(post, container);
			const link = absoluteUrl(getPostPath(post), site);
			const pubDate = formatRfc822Date(post.data.pubDate);

			return `<item>
	<title>${escapeXml(post.data.title)}</title>
	<link>${escapeXml(link)}</link>
	<guid isPermaLink="true">${escapeXml(link)}</guid>
	<description>${escapeXml(post.data.description)}</description>
	<pubDate>${pubDate}</pubDate>
	<author>${escapeXml(post.data.author)}</author>
	<content:encoded>${wrapCdata(html)}</content:encoded>
</item>`;
		}),
	);

	const lastBuildDate = posts[0]
		? formatRfc822Date(posts[0].data.updatedDate ?? posts[0].data.pubDate)
		: formatRfc822Date(new Date());

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<title>${escapeXml(blogName)}</title>
	<link>${escapeXml(blogUrl)}</link>
	<description>${escapeXml(blogDescription)}</description>
	<language>pt-BR</language>
	<lastBuildDate>${lastBuildDate}</lastBuildDate>
	<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
	${itemsXml.join('\n\t')}
</channel>
</rss>`;

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};

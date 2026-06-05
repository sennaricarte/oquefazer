import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: URL) => `User-agent: *
Allow: /

Disallow: /api/
Disallow: /admin/

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
	if (!site) {
		return new Response('User-agent: *\nAllow: /\n', {
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	const sitemapURL = new URL('sitemap-index.xml', site);

	return new Response(getRobotsTxt(sitemapURL), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	});
};

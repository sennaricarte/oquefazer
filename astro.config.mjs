// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import { createSitemapIntegration } from './sitemap-integration.mjs';
import { buildTagRedirects } from './tag-redirects.mjs';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const { SITE_URL } = env;
const siteUrl = SITE_URL || 'https://meusite.com.br';

// https://astro.build/config
export default defineConfig({
	site: siteUrl,

	redirects: buildTagRedirects(),

	output: 'static',

	compressHTML: true,

	build: {
		inlineStylesheets: 'always',
	},

	trailingSlash: 'never',

	image: {
		service: {
			entrypoint: 'astro/assets/services/sharp',
			config: {
				limitInputPixels: false,
			},
		},
	},

	integrations: [
		createSitemapIntegration(siteUrl),
		mdx(),
		partytown({
			config: {
				forward: ['dataLayer.push', 'gtag'],
				debug: process.env.NODE_ENV !== 'production',
			},
		}),
	],
});

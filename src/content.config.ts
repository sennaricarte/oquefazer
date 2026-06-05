import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z
		.object({
			title: z.string().min(10).max(70),
			description: z.string().min(50).max(160),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			heroImageAlt: z.string().optional(),
			author: z.string().default('Admin'),
			tags: z.array(z.string()),
			/** Slug do cluster (área) — ex.: saude, tecnologia. Se omitido, inferido das tags. */
			cluster: z.string().optional(),
			/** ficha | guia | artigo | profissao — inferido automaticamente se omitido. */
			contentType: z.enum(['ficha', 'guia', 'artigo', 'profissao']).optional(),
			/** Slug de outro post relacionado (ex.: guia longo ↔ ficha curta). */
			relatedProfession: z.string().optional(),
			draft: z.boolean().default(false),
			/** Exclui do sitemap e adiciona meta robots noindex. */
			noindex: z.boolean().default(false),
			canonicalURL: z.string().url().optional(),
			readingTime: z.number().int().positive().optional(),
		})
		.superRefine((data, ctx) => {
			if (data.heroImage && !data.heroImageAlt?.trim()) {
				ctx.addIssue({
					code: 'custom',
					message: 'heroImageAlt é obrigatório quando heroImage está definido.',
					path: ['heroImageAlt'],
				});
			}
		}),
});

export const collections = { blog };

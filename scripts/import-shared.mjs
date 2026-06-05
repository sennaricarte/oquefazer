import fs from 'node:fs';
import path from 'node:path';
import { optimizeImageFile } from './lib/image-optimize.mjs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const blogDir = path.join(projectRoot, 'src', 'content', 'blog');

const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 50;

export function slugify(input) {
	return input
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function escapeYaml(value) {
	const text = String(value ?? '').replace(/"/g, '\\"');
	return `"${text}"`;
}

export function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function truncateDescription(text, maxLength = DESCRIPTION_MAX) {
	const clean = stripHtml(text).trim();
	if (clean.length <= maxLength) return clean;
	const slice = clean.slice(0, maxLength - 1);
	const lastSpace = slice.lastIndexOf(' ');
	return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function ensureDescription(text, title) {
	let description = truncateDescription(text);
	if (description.length < DESCRIPTION_MIN) {
		description = truncateDescription(
			`${title}. Guia completo com dicas práticas, roteiro e informações úteis para planejar sua viagem.`,
		);
	}
	return description;
}

export function normalizeOrigin(url) {
	const parsed = new URL(url);
	return parsed.origin;
}

export function pathnameKey(urlString, origin) {
	try {
		const parsed = new URL(urlString, origin);
		if (parsed.origin !== origin) return null;
		let pathname = parsed.pathname.replace(/\/+$/, '') || '/';
		return pathname;
	} catch {
		return null;
	}
}

export function uniqueSlug(baseSlug, existing) {
	let slug = baseSlug || 'post';
	let candidate = slug;
	let index = 2;
	while (existing.has(candidate)) {
		candidate = `${slug}-${index}`;
		index += 1;
	}
	existing.add(candidate);
	return candidate;
}

export function extensionFromUrl(url, contentType) {
	const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
	if (/^\.(jpe?g|png|gif|webp|avif)$/.test(fromUrl)) return fromUrl;
	if (contentType?.includes('png')) return '.png';
	if (contentType?.includes('webp')) return '.webp';
	if (contentType?.includes('gif')) return '.gif';
	return '.jpg';
}

export function safeFileName(url, contentType) {
	const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
	return `img-${hash}${extensionFromUrl(url, contentType)}`;
}

export async function fetchText(url, options = {}) {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'oquefazer-importer/1.0 (+https://github.com/astro)',
			Accept: 'text/html,application/xml,text/xml,application/json,*/*',
			...options.headers,
		},
		redirect: 'follow',
		...options,
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ao buscar ${url}`);
	}

	return response.text();
}

export async function fetchJson(url) {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'oquefazer-importer/1.0',
			Accept: 'application/json',
		},
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ao buscar ${url}`);
	}

	return response.json();
}

export async function downloadImage(url, destDir, usedNames) {
	fs.mkdirSync(destDir, { recursive: true });

	const response = await fetch(url, {
		headers: { 'User-Agent': 'oquefazer-importer/1.0' },
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Falha ao baixar imagem ${url} (${response.status})`);
	}

	const contentType = response.headers.get('content-type') ?? '';
	const fileName = safeFileName(url, contentType);
	const destPath = path.join(destDir, fileName);

	if (!usedNames.has(destPath)) {
		const buffer = Buffer.from(await response.arrayBuffer());
		fs.writeFileSync(destPath, buffer);
		const role = fileName.startsWith('hero') ? 'hero' : 'inline';
		await optimizeImageFile(destPath, { role });
		usedNames.add(destPath);
	}

	return `./images/${fileName}`;
}

export function listExistingSlugs() {
	if (!fs.existsSync(blogDir)) return new Set();
	return new Set(
		fs
			.readdirSync(blogDir)
			.filter((name) => /\.(md|mdx)$/i.test(name))
			.map((name) => name.replace(/\.(md|mdx)$/i, '')),
	);
}

export function writeMdx({ slug, frontmatter, body, dryRun }) {
	const filePath = path.join(blogDir, `${slug}.mdx`);
	const content = `---\n${frontmatter}\n---\n\n${body.trim()}\n`;

	if (dryRun) {
		console.log(`[dry-run] ${path.relative(projectRoot, filePath)}`);
		return filePath;
	}

	fs.mkdirSync(blogDir, { recursive: true });
	fs.writeFileSync(filePath, content, 'utf8');
	console.log(`✓ ${path.relative(projectRoot, filePath)}`);
	return filePath;
}

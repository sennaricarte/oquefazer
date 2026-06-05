import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { blogDir, projectRoot } from '../import-shared.mjs';
import { getSourceMaxWidth } from './image-presets.mjs';

export const REGISTRY_PATH = path.join(projectRoot, 'src', 'data', 'image-registry.json');
export const GENERIC_ALT = /^imagem ilustrativa do artigo$/i;

const STOP_WORDS = new Set([
	'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
	'para', 'por', 'com', 'que', 'se', 'ao', 'à', 'como', 'sua', 'seu', 'suas', 'seus', 'é', 'são', 'mais',
	'sobre', 'guia', 'completo', 'completa', 'profissão', 'profissao', 'artigo', 'faz', 'fazer',
]);

export function loadRegistry() {
	if (!fs.existsSync(REGISTRY_PATH)) {
		return { version: 1, entries: [] };
	}
	return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

export function saveRegistry(registry) {
	fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
	fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

export function hashFileContent(filePath) {
	if (!fs.existsSync(filePath)) return null;
	const buffer = fs.readFileSync(filePath);
	return createHash('sha256').update(buffer).digest('hex');
}

export function sourceKeyFromFileName(fileName) {
	const match = fileName.match(/^img-([a-f0-9]{10})/i);
	if (match) return `url:${match[1]}`;
	return null;
}

export function readImageMeta(imagesDir, fileName) {
	const sidecar = path.join(imagesDir, `${fileName}.meta.json`);
	if (!fs.existsSync(sidecar)) return null;
	try {
		return JSON.parse(fs.readFileSync(sidecar, 'utf8'));
	} catch {
		return null;
	}
}

export function writeImageMeta(imagesDir, fileName, meta) {
	const sidecar = path.join(imagesDir, `${fileName}.meta.json`);
	fs.mkdirSync(imagesDir, { recursive: true });
	fs.writeFileSync(sidecar, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
	return sidecar;
}

function parseFrontmatterBlock(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const data = {};
	for (const line of match[1].split('\n')) {
		const hero = line.match(/^heroImage:\s*(.+)$/);
		const heroAlt = line.match(/^heroImageAlt:\s*(.+)$/);
		const title = line.match(/^title:\s*(.+)$/);
		const draft = line.match(/^draft:\s*(.+)$/);
		if (hero) data.heroImage = hero[1].trim().replace(/^["']|["']$/g, '');
		if (heroAlt) data.heroImageAlt = heroAlt[1].trim().replace(/^["']|["']$/g, '');
		if (title) data.title = title[1].trim().replace(/^["']|["']$/g, '');
		if (draft) data.draft = draft[1].trim() === 'true';
	}
	return data;
}

function resolveImagePath(slug, relPath) {
	const normalized = relPath.replace(/^\.\//, '');
	return path.join(blogDir, slug, normalized.replace(new RegExp(`^${slug}/`), ''));
}

export function resolvePostImagePath(slug, relPath) {
	if (relPath.startsWith('./')) {
		return path.join(blogDir, relPath.slice(2));
	}
	return path.join(blogDir, slug, relPath);
}

function extractKeywords(text) {
	return (text ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

export function relevanceScore({ title, alt, query, contextHeading }) {
	const pool = [
		...extractKeywords(title),
		...extractKeywords(contextHeading),
		...extractKeywords(query),
	];
	const altWords = new Set(extractKeywords(alt));
	if (!pool.length || !altWords.size) return 0;

	let hits = 0;
	for (const word of pool) {
		if (altWords.has(word)) hits += 1;
	}
	return Math.min(100, Math.round((hits / pool.length) * 100));
}

export function findContextHeading(body, imageLineIndex) {
	const lines = body.split('\n');
	for (let i = imageLineIndex - 1; i >= 0; i -= 1) {
		const line = lines[i].trim();
		if (line.startsWith('## ')) return line.replace(/^#+\s*/, '');
	}
	return '';
}

export function scanPostImages(slug) {
	const mdxPath = path.join(blogDir, `${slug}.mdx`);
	if (!fs.existsSync(mdxPath)) return [];

	const raw = fs.readFileSync(mdxPath, 'utf8');
	const fm = parseFrontmatterBlock(raw);
	const body = raw.replace(/^---[\s\S]*?---\r?\n?/, '');
	const items = [];

	if (fm.heroImage) {
		const abs = resolvePostImagePath(slug, fm.heroImage);
		const fileName = path.basename(abs);
		const imagesDir = path.dirname(abs);
		const meta = readImageMeta(imagesDir, fileName);
		items.push({
			slug,
			role: 'hero',
			relPath: fm.heroImage,
			absPath: abs,
			fileName,
			alt: fm.heroImageAlt ?? meta?.alt ?? '',
			title: fm.title ?? slug,
			draft: fm.draft ?? false,
			line: 0,
			contextHeading: fm.title ?? '',
			meta,
		});
	}

	const inlineRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
	let match;
	let lineIndex = 0;
	const lines = body.split('\n');
	for (const line of lines) {
		inlineRe.lastIndex = 0;
		while ((match = inlineRe.exec(line)) !== null) {
			const relPath = match[2].trim();
			const abs = resolvePostImagePath(slug, relPath);
			const fileName = path.basename(abs);
			const meta = readImageMeta(path.dirname(abs), fileName);
			items.push({
				slug,
				role: 'inline',
				relPath,
				absPath: abs,
				fileName,
				alt: match[1].trim() || meta?.alt || '',
				title: fm.title ?? slug,
				draft: fm.draft ?? false,
				line: lineIndex,
				contextHeading: findContextHeading(body, lineIndex),
				meta,
			});
		}
		lineIndex += 1;
	}

	return items;
}

export function enrichImageUsage(usage) {
	const { absPath, fileName, meta, slug } = usage;
	const contentHash = hashFileContent(absPath);
	const sourceKey =
		meta?.sourceKey ??
		(meta?.provider && meta?.sourceId ? `${meta.provider}:${meta.sourceId}` : null) ??
		sourceKeyFromFileName(fileName);

	return {
		...usage,
		contentHash,
		sourceKey,
		query: meta?.query ?? '',
		reviewStatus: meta?.reviewStatus ?? 'legacy',
		fileExists: fs.existsSync(absPath),
	};
}

export function syncRegistryFromPosts() {
	const registry = loadRegistry();
	const byKey = new Map(registry.entries.map((entry) => [entry.id, entry]));
	let nextId = registry.entries.reduce((max, entry) => Math.max(max, entry.id ?? 0), 0);

	const slugs = fs
		.readdirSync(blogDir)
		.filter((name) => /\.(md|mdx)$/i.test(name))
		.map((name) => name.replace(/\.(md|mdx)$/i, ''));

	const scanned = [];

	for (const slug of slugs) {
		for (const usage of scanPostImages(slug)) {
			scanned.push(enrichImageUsage(usage));
		}
	}

	for (const usage of scanned) {
		const id = `${usage.slug}:${usage.relPath}`;
		const existing = byKey.get(id);
		const entry = {
			id,
			slug: usage.slug,
			relPath: usage.relPath,
			role: usage.role,
			fileName: usage.fileName,
			alt: usage.alt,
			title: usage.title,
			contextHeading: usage.contextHeading,
			contentHash: usage.contentHash,
			sourceKey: usage.sourceKey,
			query: usage.query,
			reviewStatus: existing?.reviewStatus ?? usage.reviewStatus,
			relevanceScore: relevanceScore(usage),
			draft: usage.draft,
			fileExists: usage.fileExists,
			updatedAt: new Date().toISOString(),
		};

		if (existing?.reviewStatus === 'approved' || existing?.reviewStatus === 'rejected') {
			entry.reviewStatus = existing.reviewStatus;
			entry.reviewNote = existing.reviewNote;
		}

		byKey.set(id, entry);
	}

	const activeIds = new Set(scanned.map((u) => `${u.slug}:${u.relPath}`));
	const entries = [...byKey.values()]
		.filter((entry) => activeIds.has(entry.id))
		.sort((a, b) => a.slug.localeCompare(b.slug));

	saveRegistry({ version: 1, entries });
	return entries;
}

/** Capas já usadas em qualquer artigo — não reutilizar. */
export function getReservedHeroKeys(registry) {
	const sourceKeys = new Set();
	const contentHashes = new Set();
	for (const entry of registry.entries) {
		if (entry.role !== 'hero') continue;
		if (entry.sourceKey) sourceKeys.add(entry.sourceKey);
		if (entry.contentHash) contentHashes.add(entry.contentHash);
	}
	return { sourceKeys, contentHashes };
}

/** Imagens já usadas dentro de um artigo (capa + inline). */
export function getReservedInPost(registry, slug) {
	const sourceKeys = new Set();
	const contentHashes = new Set();
	for (const entry of registry.entries) {
		if (entry.slug !== slug) continue;
		if (entry.sourceKey) sourceKeys.add(entry.sourceKey);
		if (entry.contentHash) contentHashes.add(entry.contentHash);
	}
	return { sourceKeys, contentHashes };
}

export function isCandidateAllowed(candidate, reserved) {
	if (candidate.sourceKey && reserved.sourceKeys.has(candidate.sourceKey)) return false;
	return true;
}

export async function analyzeImages(entries) {
	const issues = [];
	const warnings = [];

	const bySlugFile = new Map();
	const heroHashes = new Map();
	const heroSourceKeys = new Map();

	for (const entry of entries) {
		const usageKey = `${entry.slug}:${entry.relPath}`;

		if (!entry.fileExists) {
			issues.push({
				severity: 'error',
				code: 'missing-file',
				slug: entry.slug,
				relPath: entry.relPath,
				message: `Arquivo de imagem não encontrado: ${entry.relPath}`,
			});
		}

		if (GENERIC_ALT.test(entry.alt ?? '')) {
			warnings.push({
				severity: 'warn',
				code: 'generic-alt',
				slug: entry.slug,
				relPath: entry.relPath,
				message: `Alt genérico — descreva a cena: ${entry.relPath}`,
			});
		}

		if ((entry.relevanceScore ?? 0) < 25 && entry.role === 'hero') {
			warnings.push({
				severity: 'warn',
				code: 'low-relevance',
				slug: entry.slug,
				relPath: entry.relPath,
				message: `Capa com baixa aderência ao título (${entry.relevanceScore}%): revise manualmente`,
			});
		}

		if (entry.reviewStatus === 'pending') {
			warnings.push({
				severity: 'warn',
				code: 'pending-review',
				slug: entry.slug,
				relPath: entry.relPath,
				message: `Imagem aguardando aprovação: ${entry.relPath}`,
			});
		}

		if (entry.reviewStatus === 'rejected') {
			issues.push({
				severity: 'error',
				code: 'rejected-image',
				slug: entry.slug,
				relPath: entry.relPath,
				message: `Imagem reprovada ainda referenciada: ${entry.relPath}`,
			});
		}

		if (entry.fileExists && entry.relPath) {
			const absPath = resolvePostImagePath(entry.slug, entry.relPath);
			try {
				const meta = await sharp(absPath).metadata();
				const maxWidth = getSourceMaxWidth(entry.role === 'hero' ? 'hero' : 'inline');
				if ((meta.width ?? 0) > maxWidth) {
					warnings.push({
						severity: 'warn',
						code: 'oversized-source',
						slug: entry.slug,
						relPath: entry.relPath,
						message: `Arquivo fonte ${meta.width}px (máx. ${maxWidth}px) — rode npm run images:normalize`,
					});
				}
			} catch {
				// ignora formatos não suportados pelo sharp
			}
		}

		const slugUses = bySlugFile.get(entry.slug) ?? [];
		slugUses.push(entry);
		bySlugFile.set(entry.slug, slugUses);

		if (entry.role === 'hero' && entry.contentHash) {
			if (heroHashes.has(entry.contentHash)) {
				issues.push({
					severity: 'error',
					code: 'duplicate-hero-hash',
					slug: entry.slug,
					relPath: entry.relPath,
					message: `Capa duplicada entre artigos (${entry.slug} ↔ ${heroHashes.get(entry.contentHash)}): mesmo arquivo`,
				});
			} else {
				heroHashes.set(entry.contentHash, entry.slug);
			}
		}

		if (entry.role === 'hero' && entry.sourceKey) {
			if (heroSourceKeys.has(entry.sourceKey)) {
				issues.push({
					severity: 'error',
					code: 'duplicate-hero-source',
					slug: entry.slug,
					relPath: entry.relPath,
					message: `Capa duplicada entre artigos (${entry.slug} ↔ ${heroSourceKeys.get(entry.sourceKey)}): mesma origem (${entry.sourceKey})`,
				});
			} else {
				heroSourceKeys.set(entry.sourceKey, entry.slug);
			}
		}
	}

	for (const [slug, list] of bySlugFile) {
		const hashCount = new Map();
		const pathCount = new Map();
		const sourceCount = new Map();

		for (const entry of list) {
			if (entry.relPath) {
				pathCount.set(entry.relPath, (pathCount.get(entry.relPath) ?? 0) + 1);
			}
			if (entry.contentHash) {
				hashCount.set(entry.contentHash, (hashCount.get(entry.contentHash) ?? 0) + 1);
			}
			if (entry.sourceKey) {
				sourceCount.set(entry.sourceKey, (sourceCount.get(entry.sourceKey) ?? 0) + 1);
			}
		}

		for (const [relPath, count] of pathCount) {
			if (count > 1) {
				issues.push({
					severity: 'error',
					code: 'duplicate-path',
					slug,
					relPath,
					message: `Mesma imagem repetida ${count}x no artigo: ${relPath}`,
				});
			}
		}

		for (const [hash, count] of hashCount) {
			if (count > 1) {
				issues.push({
					severity: 'error',
					code: 'duplicate-hash',
					slug,
					relPath: '',
					message: `Conteúdo de imagem repetido ${count}x no artigo ${slug} (hash ${hash.slice(0, 8)}…)`,
				});
			}
		}

		for (const [sourceKey, count] of sourceCount) {
			if (count > 1) {
				issues.push({
					severity: 'error',
					code: 'duplicate-source',
					slug,
					relPath: '',
					message: `Mesma origem (${sourceKey}) usada ${count}x no artigo ${slug}`,
				});
			}
		}

		const hero = list.find((e) => e.role === 'hero');
		const inlines = list.filter((e) => e.role === 'inline');
		if (hero?.contentHash) {
			for (const inline of inlines) {
				if (inline.contentHash === hero.contentHash) {
					issues.push({
						severity: 'error',
						code: 'hero-equals-inline',
						slug,
						relPath: inline.relPath,
						message: `Imagem inline igual à capa no mesmo artigo: ${inline.relPath}`,
					});
				}
			}
		}
	}

	return { issues, warnings };
}

export function setImageReviewStatus({ slug, fileName, status, note = '' }) {
	const imagesDir = path.join(blogDir, slug, 'images');
	const meta = readImageMeta(imagesDir, fileName) ?? { fileName, slug };
	meta.reviewStatus = status;
	meta.reviewNote = note;
	meta.reviewedAt = new Date().toISOString();
	writeImageMeta(imagesDir, fileName, meta);

	const registry = loadRegistry();
	for (const entry of registry.entries) {
		if (entry.slug === slug && entry.fileName === fileName) {
			entry.reviewStatus = status;
			entry.reviewNote = note;
			entry.reviewedAt = meta.reviewedAt;
		}
	}
	saveRegistry(registry);
	return meta;
}

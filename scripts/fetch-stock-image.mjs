/**
 * Busca e baixa imagem via Pexels ou Pixabay, evitando duplicatas.
 *
 * Uso:
 *   npm run fetch:image -- --query "enfermeiro hospital" --slug enfermeiro
 *   npm run fetch:image -- --query "formação médica" --slug enfermeiro --role inline
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { blogDir } from './import-shared.mjs';
import {
	getReservedHeroKeys,
	getReservedInPost,
	isCandidateAllowed,
	loadRegistry,
	syncRegistryFromPosts,
	writeImageMeta,
} from './lib/image-registry.mjs';
import { optimizeImageFile } from './lib/image-optimize.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = loadEnv(process.env.NODE_ENV ?? 'development', root, '');
const PEXELS_KEY = env.PEXELS_API_KEY;
const PIXABAY_KEY = env.PIXABAY_API_KEY;

function parseArgs(argv) {
	const args = { query: '', slug: '', source: 'auto', role: 'hero' };
	for (let i = 2; i < argv.length; i += 1) {
		if (argv[i] === '--query' && argv[i + 1]) args.query = argv[++i];
		else if (argv[i] === '--slug' && argv[i + 1]) args.slug = argv[++i];
		else if (argv[i] === '--source' && argv[i + 1]) args.source = argv[++i];
		else if (argv[i] === '--role' && argv[i + 1]) args.role = argv[++i];
	}
	return args;
}

function slugify(input) {
	return input
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function mapPexelsPhoto(photo, query) {
	return {
		provider: 'pexels',
		sourceId: photo.id,
		sourceKey: `pexels:${photo.id}`,
		url: photo.src.large2x || photo.src.large || photo.src.original,
		pageUrl: photo.url,
		author: photo.photographer,
		authorUrl: photo.photographer_url,
		width: photo.width,
		height: photo.height,
		alt: photo.alt || query,
	};
}

function mapPixabayHit(hit, query) {
	return {
		provider: 'pixabay',
		sourceId: hit.id,
		sourceKey: `pixabay:${hit.id}`,
		url: hit.largeImageURL || hit.webformatURL,
		pageUrl: hit.pageURL,
		author: hit.user,
		authorUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
		width: hit.imageWidth,
		height: hit.imageHeight,
		alt: hit.tags?.split(',')[0]?.trim() || query,
	};
}

function pickCandidate(candidates, reserved) {
	for (const candidate of candidates) {
		if (isCandidateAllowed(candidate, reserved)) return candidate;
	}
	return null;
}

async function searchPexels(query, apiKey, reserved) {
	const url = new URL('https://api.pexels.com/v1/search');
	url.searchParams.set('query', query);
	url.searchParams.set('per_page', '20');
	url.searchParams.set('orientation', 'landscape');
	url.searchParams.set('locale', 'pt-BR');

	const response = await fetch(url, {
		headers: { Authorization: apiKey },
	});

	if (!response.ok) {
		throw new Error(`Pexels HTTP ${response.status}: ${await response.text()}`);
	}

	const data = await response.json();
	const candidates = (data.photos ?? []).map((photo) => mapPexelsPhoto(photo, query));
	return pickCandidate(candidates, reserved);
}

async function searchPixabay(query, apiKey, reserved) {
	const url = new URL('https://pixabay.com/api/');
	url.searchParams.set('key', apiKey);
	url.searchParams.set('q', query);
	url.searchParams.set('image_type', 'photo');
	url.searchParams.set('orientation', 'horizontal');
	url.searchParams.set('per_page', '20');
	url.searchParams.set('lang', 'pt');
	url.searchParams.set('safesearch', 'true');

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Pixabay HTTP ${response.status}: ${await response.text()}`);
	}

	const data = await response.json();
	const candidates = (data.hits ?? []).map((hit) => mapPixabayHit(hit, query));
	return pickCandidate(candidates, reserved);
}

async function downloadImage(url, destPath) {
	const response = await fetch(url, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Download falhou ${response.status}: ${url}`);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	fs.mkdirSync(path.dirname(destPath), { recursive: true });
	fs.writeFileSync(destPath, buffer);
	return destPath;
}

function buildAltText(meta, query) {
	const base = (meta.alt || query).trim();
	if (base.length >= 20) return base.slice(0, 125);
	return `Ilustração sobre ${query}: ${base}`.slice(0, 125);
}

function buildCreditLine(meta) {
	if (meta.provider === 'pexels') {
		return `Foto: [${meta.author}](${meta.authorUrl}) / [Pexels](${meta.pageUrl})`;
	}
	return `Imagem: [${meta.author}](${meta.authorUrl}) / [Pixabay](${meta.pageUrl})`;
}

function patchMdxFrontmatter(mdxPath, relPath, alt) {
	if (!fs.existsSync(mdxPath)) return false;

	let raw = fs.readFileSync(mdxPath, 'utf8');

	if (raw.includes('heroImage:')) {
		raw = raw.replace(/heroImage:.*\n/, `heroImage: "${relPath}"\n`);
		raw = raw.replace(/heroImageAlt:.*\n/, `heroImageAlt: "${alt.replace(/"/g, '\\"')}"\n`);
	} else {
		raw = raw.replace(
			/^---\n([\s\S]*?)\n---/,
			(match, block) => `---\n${block}\nheroImage: "${relPath}"\nheroImageAlt: "${alt.replace(/"/g, '\\"')}"\n---`,
		);
	}

	fs.writeFileSync(mdxPath, raw, 'utf8');
	return true;
}

function buildReserved(registry, slug, role) {
	const heroReserved = getReservedHeroKeys(registry);
	const postReserved = getReservedInPost(registry, slug);

	const sourceKeys = new Set([...postReserved.sourceKeys]);
	const contentHashes = new Set([...postReserved.contentHashes]);

	if (role === 'hero') {
		for (const key of heroReserved.sourceKeys) sourceKeys.add(key);
		for (const hash of heroReserved.contentHashes) contentHashes.add(hash);
	}

	return { sourceKeys, contentHashes };
}

async function main() {
	const args = parseArgs(process.argv);

	if (!args.query) {
		console.error('Uso: npm run fetch:image -- --query "termo" --slug nome-do-post [--role hero|inline] [--source pexels|pixabay|auto]');
		process.exit(1);
	}

	const slug = slugify(args.slug || args.query);
	const role = args.role === 'inline' ? 'inline' : 'hero';
	const mdxPath = path.join(blogDir, `${slug}.mdx`);
	const imagesDir = path.join(blogDir, slug, 'images');
	const fileName = `${role}-${createHash('sha1').update(`${args.query}:${slug}:${Date.now()}`).digest('hex').slice(0, 8)}.jpg`;
	const destPath = path.join(imagesDir, fileName);
	const relPath = `./${slug}/images/${fileName}`;

	syncRegistryFromPosts();
	const registry = loadRegistry();
	const reserved = buildReserved(registry, slug, role);

	let meta = null;

	if (args.source === 'pexels' || args.source === 'auto') {
		if (!PEXELS_KEY) {
			console.warn('PEXELS_API_KEY não definida no .env');
		} else {
			try {
				meta = await searchPexels(args.query, PEXELS_KEY, reserved);
				if (meta) console.log('Imagem disponível no Pexels (não usada em outro post).');
			} catch (error) {
				console.warn('Pexels:', error.message);
			}
		}
	}

	if (!meta && (args.source === 'pixabay' || args.source === 'auto')) {
		if (!PIXABAY_KEY) {
			console.warn('PIXABAY_API_KEY não definida no .env');
		} else {
			try {
				meta = await searchPixabay(args.query, PIXABAY_KEY, reserved);
				if (meta) console.log('Imagem disponível no Pixabay (não usada em outro post).');
			} catch (error) {
				console.warn('Pixabay:', error.message);
			}
		}
	}

	if (!meta) {
		console.error('Nenhuma imagem nova encontrada (todas já usadas ou busca vazia). Tente outro termo.');
		process.exit(1);
	}

	await downloadImage(meta.url, destPath);
	const optimized = await optimizeImageFile(destPath, { role });
	const finalPath = optimized.writtenPath ?? destPath;
	const finalFileName = path.basename(finalPath);
	const finalRelPath = `./${slug}/images/${finalFileName}`;
	console.log(
		`Otimizada (${role}): ${optimized.width}×${optimized.height}px` +
			(optimized.resized ? ` — redimensionada de ${optimized.inputWidth}px` : ''),
	);
	const alt = buildAltText(meta, args.query);
	const credit = buildCreditLine(meta);

	writeImageMeta(imagesDir, finalFileName, {
		fileName: finalFileName,
		slug,
		role,
		query: args.query,
		provider: meta.provider,
		sourceId: meta.sourceId,
		sourceKey: meta.sourceKey,
		alt,
		creditMarkdown: credit,
		pageUrl: meta.pageUrl,
		reviewStatus: 'pending',
		downloadedAt: new Date().toISOString(),
	});

	syncRegistryFromPosts();

	if (role === 'hero' && fs.existsSync(mdxPath)) {
		patchMdxFrontmatter(mdxPath, finalRelPath, alt);
		console.log(`Frontmatter atualizado: src/content/blog/${slug}.mdx`);
	} else if (role === 'hero') {
		console.log(`Post ainda não existe. Adicione:\nheroImage: "${finalRelPath}"\nheroImageAlt: "${alt}"`);
	} else {
		console.log(`Inline: insira no MDX após a seção desejada:\n\n![${alt}](${finalRelPath})`);
	}

	console.log(`\nSalvo: src/content/blog/${slug}/images/${finalFileName}`);
	console.log(`Status: pendente de revisão — npm run review:images -- --slug ${slug}`);
	console.log(`Aprovar: npm run images:approve -- --slug ${slug} --file ${finalFileName}`);
	console.log(`heroImageAlt sugerido: ${alt}`);
	console.log(`Crédito (rodapé): ${credit}`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});

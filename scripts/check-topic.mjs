/**
 * Verifica se já existe conteúdo sobre o tema (evitar canibalização SEO).
 *
 * Uso:
 *   npm run check:topic -- "enfermeiro"
 *   npm run check:topic -- "o que faz um médico"
 *   npm run check:topic -- "analista de dados" --json
 *   npm run check:topic -- "médico" --strict   # exit 1 se houver conflito
 */
import Fuse from 'fuse.js';
import { fileURLToPath } from 'node:url';
import { buildPostIndex, extractProfessionKey, normalizeText, slugify } from './lib/post-index.mjs';

function parseArgs(argv) {
	const args = { query: '', json: false, strict: false };
	const positional = [];

	for (let i = 2; i < argv.length; i += 1) {
		if (argv[i] === '--json') args.json = true;
		else if (argv[i] === '--strict') args.strict = true;
		else positional.push(argv[i]);
	}

	args.query = positional.join(' ').trim();
	return args;
}

function slugSegments(slug) {
	return slug.split('-').filter(Boolean);
}

function slugSharesCoreTerm(postSlug, querySlug) {
	const queryParts = slugSegments(querySlug);
	if (!queryParts.length) return false;
	const postParts = new Set(slugSegments(postSlug));
	return queryParts.every((part) => part.length >= 4 && postParts.has(part));
}

function professionKeysOverlap(a, b) {
	if (!a || !b || a.length < 3 || b.length < 3) return false;
	return a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`);
}

function matchReason(post, queryKey, querySlug) {
	const reasons = [];

	if (post.slug === querySlug) reasons.push('slug idêntico');
	if (professionKeysOverlap(post.professionKey, queryKey)) {
		reasons.push(`mesma profissão (“${post.professionKey}”)`);
	}
	if (slugSharesCoreTerm(post.slug, querySlug)) {
		reasons.push('slug com os mesmos termos principais');
	}

	const titleNorm = normalizeText(post.title);
	const queryNorm = normalizeText(queryKey.replace(/-/g, ' '));
	if (queryNorm.length >= 4 && new RegExp(`\\b${queryNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(titleNorm)) {
		reasons.push('título já cobre o tema');
	}

	return reasons.length ? reasons.join('; ') : 'similaridade textual alta';
}

function isRelevantSimilarity(post, queryKey, querySlug) {
	if (professionKeysOverlap(post.professionKey, queryKey)) return true;
	if (slugSharesCoreTerm(post.slug, querySlug)) return true;
	if (post.slug === querySlug) return true;
	return false;
}

export function analyzeTopic(query, posts) {
	const queryKey = extractProfessionKey(query);
	const querySlug = slugify(query);

	const exact = [];
	const similar = [];

	for (const post of posts) {
		const reasons = [];
		if (post.slug === querySlug) reasons.push('slug idêntico');
		if (professionKeysOverlap(post.professionKey, queryKey)) {
			reasons.push(`mesma profissão (${post.professionKey})`);
		}

		if (reasons.length) {
			exact.push({
				...post,
				score: 1,
				level: 'exact',
				reason: reasons.join('; '),
			});
		}
	}

	const fuse = new Fuse(posts, {
		keys: ['title', 'slug', 'professionKey', 'description', 'searchText', 'tags'],
		threshold: 0.35,
		ignoreLocation: true,
		includeScore: true,
	});

	for (const result of fuse.search(query)) {
		const post = result.item;
		if (exact.some((e) => e.slug === post.slug)) continue;

		const score = 1 - (result.score ?? 1);
		if (!isRelevantSimilarity(post, queryKey, querySlug)) continue;

		const level = score >= 0.72 ? 'high' : score >= 0.55 ? 'medium' : 'low';
		if (level === 'low') continue;

		similar.push({
			...post,
			score: Math.round(score * 100) / 100,
			level,
			reason: matchReason(post, queryKey, querySlug),
		});
	}

	similar.sort((a, b) => b.score - a.score);
	const similarLimited = similar.slice(0, 8);

	const blocked = exact.length > 0 || similar.some((s) => s.level === 'high');
	const caution = !blocked && similar.some((s) => s.level === 'medium');

	return {
		query,
		queryKey,
		querySlug,
		exact,
		similar: similarLimited,
		blocked,
		caution,
		totalPosts: posts.length,
	};
}

function recommendation(result) {
	if (result.blocked) {
		return 'NÃO criar novo artigo sobre o mesmo tema. Atualize o post existente, mescle conteúdo ou peça ao usuário um ângulo claramente diferente (ex.: salário, vestibular, mitos).';
	}
	if (result.caution) {
		return 'Há posts parecidos. Confirme com o usuário um ângulo único antes de redigir, e use links internos entre eles em vez de repetir estrutura.';
	}
	return 'Nenhum conflito forte. Pode criar o artigo se o ângulo for único.';
}

function printReport(result) {
	const { exact, similar, blocked, caution } = result;

	console.log(`\nTema consultado: “${result.query}”`);
	console.log(`Chave da profissão: ${result.queryKey || '(vazia)'} | slug sugerido: ${result.querySlug}`);
	console.log(`Posts no blog: ${result.totalPosts}\n`);

	if (exact.length) {
		console.log('⛔ CONFLITO DIRETO (canibalização provável)\n');
		for (const post of exact) {
			console.log(`  • ${post.title}`);
			console.log(`    ${post.url}  (slug: ${post.slug}${post.draft ? ', rascunho' : ''})`);
			console.log(`    Motivo: ${post.reason}\n`);
		}
	}

	if (similar.length) {
		console.log('⚠ POSTS SIMILARES\n');
		for (const post of similar) {
			const label = post.level === 'high' ? 'ALTA' : 'MÉDIA';
			console.log(`  • [${label} ${Math.round(post.score * 100)}%] ${post.title}`);
			console.log(`    ${post.url}  (slug: ${post.slug})`);
			console.log(`    Motivo: ${post.reason}\n`);
		}
	}

	if (!exact.length && !similar.length) {
		console.log('✓ Nenhum post existente com sobreposição relevante.\n');
	}

	console.log(`Recomendação: ${recommendation(result)}\n`);

	if (blocked) console.log('Status: BLOQUEADO para novo artigo duplicado.');
	else if (caution) console.log('Status: CUIDADO — validar ângulo antes de escrever.');
	else console.log('Status: OK para novo conteúdo.');
}

function main() {
	const args = parseArgs(process.argv);

	if (!args.query) {
		console.error('Uso: npm run check:topic -- "nome da profissão ou palavra-chave" [--json] [--strict]');
		process.exit(1);
	}

	const posts = buildPostIndex();
	const result = analyzeTopic(args.query, posts);
	result.recommendation = recommendation(result);

	if (args.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		printReport(result);
	}

	if (args.strict && result.blocked) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}

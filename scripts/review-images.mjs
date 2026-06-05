/**
 * Gera relatório de revisão manual das imagens dos artigos.
 *
 * Uso:
 *   npm run review:images
 *   npm run review:images -- --slug medico
 *   npm run review:images -- --pending
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	GENERIC_ALT,
	analyzeImages,
	relevanceScore,
	syncRegistryFromPosts,
} from './lib/image-registry.mjs';
import { projectRoot } from './import-shared.mjs';

const reviewsDir = path.join(projectRoot, 'docs', 'reviews');
const outputPath = path.join(reviewsDir, 'imagens-revisao.md');

function parseArgs(argv) {
	const args = { slug: '', pending: false };
	for (let i = 2; i < argv.length; i += 1) {
		if (argv[i] === '--slug' && argv[i + 1]) args.slug = argv[++i];
		else if (argv[i] === '--pending') args.pending = true;
	}
	return args;
}

function statusLabel(status) {
	if (status === 'approved') return '✅ aprovada';
	if (status === 'rejected') return '❌ reprovada';
	if (status === 'pending') return '⏳ pendente';
	return '📋 legado (revisar)';
}

function main() {
	const args = parseArgs(process.argv);
	const entries = syncRegistryFromPosts();
	const { issues, warnings } = analyzeImages(entries);

	let list = entries;
	if (args.slug) list = list.filter((e) => e.slug === args.slug);
	if (args.pending) {
		list = list.filter((e) => e.reviewStatus === 'pending' || e.reviewStatus === 'legacy');
	}

	const bySlug = new Map();
	for (const entry of list) {
		const group = bySlug.get(entry.slug) ?? [];
		group.push(entry);
		bySlug.set(entry.slug, group);
	}

	const lines = [
		'# Revisão de imagens — O Que Faz',
		'',
		`Gerado em: ${new Date().toLocaleString('pt-BR')}`,
		'',
		'## Checklist de revisão',
		'',
		'Para cada imagem abaixo, confirme:',
		'',
		'1. A cena combina com o **título do artigo** e a **seção** onde foi inserida.',
		'2. O **alt** descreve o que aparece (não use texto genérico).',
		'3. Não repete outra imagem **no mesmo artigo**.',
		'4. A **capa** não é igual à de outro artigo.',
		'',
		'Comandos:',
		'',
		'```bash',
		'npm run images:approve -- --slug SLUG --file NOME.jpg',
		'npm run images:reject -- --slug SLUG --file NOME.jpg --reason "motivo"',
		'npm run lint:images',
		'```',
		'',
		`## Resumo: ${issues.length} erro(s), ${warnings.length} aviso(s)`,
		'',
	];

	if (issues.length) {
		lines.push('### Erros (corrigir antes de publicar)', '');
		for (const item of issues) {
			lines.push(`- **${item.slug}**: ${item.message}`);
		}
		lines.push('');
	}

	for (const [slug, images] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		const title = images[0]?.title ?? slug;
		lines.push(`## ${title}`, '', `Slug: \`${slug}\` | [Abrir artigo](../src/content/blog/${slug}.mdx)`, '');

		for (const entry of images) {
			const score = entry.relevanceScore ?? relevanceScore(entry);
			const flags = [];
			if (GENERIC_ALT.test(entry.alt ?? '')) flags.push('alt genérico');
			if (score < 25) flags.push(`relevância ${score}%`);
			if (entry.reviewStatus === 'pending') flags.push('pendente');

			lines.push(
				`### ${entry.role === 'hero' ? 'Capa' : 'Inline'} — \`${entry.fileName}\``,
				'',
				`| Campo | Valor |`,
				`|-------|-------|`,
				`| Status | ${statusLabel(entry.reviewStatus)} |`,
				`| Arquivo | \`${entry.relPath}\` |`,
				`| Alt | ${entry.alt || '_(vazio)_'} |`,
				`| Seção / contexto | ${entry.contextHeading || '_(sem heading acima)_'} |`,
				`| Aderência ao tema | ${score}% ${flags.length ? `— **${flags.join(', ')}**` : ''} |`,
				`| Origem | ${entry.sourceKey ?? 'importada (sem ID de stock)'} |`,
				'',
				'**Perguntas:**',
				`- A imagem ilustra "${entry.contextHeading || title}"?`,
				`- Um leitor associaria esta foto ao tema do artigo?`,
				'',
			);

			if (entry.fileExists) {
				const absImage = path.join(projectRoot, 'src', 'content', 'blog', entry.slug, 'images', entry.fileName);
				const relFromDocs = path.relative(reviewsDir, absImage).replace(/\\/g, '/');
				lines.push(`![prévia](${relFromDocs})`, '');
			}
		}
	}

	if (!bySlug.size) {
		lines.push('_Nenhuma imagem encontrada para os filtros informados._', '');
	}

	fs.mkdirSync(reviewsDir, { recursive: true });
	fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

	console.log(`Relatório: ${path.relative(projectRoot, outputPath)}`);
	console.log(`${list.length} imagem(ns) em ${bySlug.size} artigo(s)`);
}

main();

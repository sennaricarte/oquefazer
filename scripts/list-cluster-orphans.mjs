/**
 * Lista posts sem cluster e tags não mapeadas para áreas.
 *
 * Uso:
 *   npm run clusters:orphans
 *   npm run clusters:orphans -- --json
 *   npm run clusters:orphans -- --report
 */
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from './import-shared.mjs';
import { analyzeClusterCoverage, buildClusterMaps } from './lib/clusters.mjs';

const reviewsDir = path.join(projectRoot, 'docs', 'reviews');
const reportPath = path.join(reviewsDir, 'posts-sem-cluster.md');

function parseArgs(argv) {
	return {
		json: argv.includes('--json'),
		report: argv.includes('--report') || !argv.includes('--json'),
	};
}

function suggestClusterForTag(tag, maps) {
	const key = tag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

	for (const cluster of maps.clusters) {
		if (cluster.slug.includes(key) || key.includes(cluster.slug.replace(/-/g, ''))) {
			return cluster.slug;
		}
		for (const alias of cluster.tagAliases) {
			if (alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === key) {
				return cluster.slug;
			}
		}
	}
	return null;
}

function printConsole(result) {
	const { totalPublished, mapped, orphans, clusterStats, unmappedTags } = result;

	console.log(`\nCobertura de clusters — ${totalPublished} posts publicados\n`);
	console.log(`✓ Com cluster: ${mapped}`);
	console.log(`⚠ Sem cluster: ${orphans.length}\n`);

	console.log('Por área:');
	for (const { cluster, count } of clusterStats) {
		console.log(`  ${cluster.title.padEnd(28)} ${String(count).padStart(3)} posts  /areas/${cluster.slug}`);
	}

	if (unmappedTags.length) {
		console.log('\nTags de área sem mapeamento em clusters.json:');
		for (const { tag, count } of unmappedTags.slice(0, 20)) {
			console.log(`  • ${tag} (${count}x)`);
		}
		if (unmappedTags.length > 20) {
			console.log(`  … e mais ${unmappedTags.length - 20} tag(s)`);
		}
	}

	if (orphans.length) {
		console.log('\nPosts órfãos (primeiros 15):');
		for (const post of orphans.slice(0, 15)) {
			const tags = post.tags.filter(Boolean).join(', ') || '(sem tags)';
			console.log(`  • ${post.slug}`);
			console.log(`    ${post.title}`);
			console.log(`    tags: ${tags}`);
		}
		if (orphans.length > 15) {
			console.log(`  … e mais ${orphans.length - 15} post(s)`);
		}
	}

	console.log('\nCorrigir: adicionar tag de área ou cluster: no frontmatter; ou incluir tag em src/data/clusters.json');
	console.log('Relatório completo: npm run clusters:orphans -- --report\n');
}

function writeReport(result) {
	const maps = buildClusterMaps();
	const lines = [
		'# Posts sem cluster — O Que Faz',
		'',
		`Gerado em: ${new Date().toLocaleString('pt-BR')}`,
		'',
		`Total publicados: **${result.totalPublished}** | Com cluster: **${result.mapped}** | Sem cluster: **${result.orphans.length}**`,
		'',
		'## Resumo por área',
		'',
		'| Área | Posts | Hub |',
		'|------|------:|-----|',
	];

	for (const { cluster, count } of result.clusterStats) {
		lines.push(`| ${cluster.title} | ${count} | \`/areas/${cluster.slug}\` |`);
	}

	lines.push('', '## Tags sem mapeamento', '');
	if (!result.unmappedTags.length) {
		lines.push('_Nenhuma tag órfã._', '');
	} else {
		lines.push('| Tag | Posts | Sugestão |');
		lines.push('|-----|------:|----------|');
		for (const { tag, count } of result.unmappedTags) {
			const suggestion = suggestClusterForTag(tag, maps);
			lines.push(`| ${tag} | ${count} | ${suggestion ? `\`${suggestion}\` ou novo cluster` : 'criar cluster em `clusters.json`'} |`);
		}
		lines.push('');
		lines.push(
			'Para mapear: edite `src/data/clusters.json` e adicione a tag em `tagAliases` do cluster correspondente.',
		);
		lines.push('');
	}

	lines.push('## Posts sem cluster', '');
	if (!result.orphans.length) {
		lines.push('_Todos os posts publicados estão em um cluster._', '');
	} else {
		for (const post of result.orphans) {
			const areaTags = post.tags.filter((t) => !['profissões', 'profissoes', 'artigos'].includes(t.toLowerCase()));
			lines.push(`### \`${post.slug}\``, '');
			lines.push(`- **Título:** ${post.title}`);
			lines.push(`- **URL:** \`/blog/${post.slug}\``);
			lines.push(`- **Tags:** ${areaTags.length ? areaTags.join(', ') : post.tags.join(', ') || '—'}`);
			lines.push(`- **Correção sugerida:** adicionar \`cluster: slug\` no frontmatter ou tag mapeada em \`clusters.json\``);
			lines.push('');
		}
	}

	lines.push('## Comandos', '', '```bash', 'npm run clusters:orphans', 'npm run clusters:orphans -- --json', '```', '');

	fs.mkdirSync(reviewsDir, { recursive: true });
	fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
	return reportPath;
}

function main() {
	const args = parseArgs(process.argv);
	const result = analyzeClusterCoverage();

	if (args.json) {
		console.log(
			JSON.stringify(
				{
					...result,
					orphans: result.orphans.map((p) => ({
						slug: p.slug,
						title: p.title,
						tags: p.tags,
					})),
					clusterStats: result.clusterStats.map(({ cluster, count }) => ({
						slug: cluster.slug,
						title: cluster.title,
						count,
					})),
				},
				null,
				2,
			),
		);
	} else {
		printConsole(result);
	}

	if (args.report) {
		const file = writeReport(result);
		console.log(`Relatório: ${path.relative(projectRoot, file)}`);
	}

	if (result.orphans.length > 0) process.exit(1);
}

main();

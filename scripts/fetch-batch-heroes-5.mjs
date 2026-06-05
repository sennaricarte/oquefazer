/**
 * Lote 5 — capas para 15 profissões P1 (alta demanda + LinkedIn 2026).
 * Uso: npm run fetch:batch-heroes-5
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Array<{ slug: string; query: string }>} */
const BATCH = [
	{ slug: 'auxiliar-de-enfermagem', query: 'auxiliar enfermagem hospital cuidado paciente' },
	{ slug: 'fonoaudiologo', query: 'fonoaudiologo terapia fala crianca clinica' },
	{ slug: 'economista', query: 'economista analise economica graficos escritorio' },
	{ slug: 'analista-de-suporte', query: 'analista suporte ti computador help desk' },
	{ slug: 'scrum-master', query: 'scrum master equipe agil quadro kanban' },
	{ slug: 'programador', query: 'programador codigo computador desenvolvimento' },
	{ slug: 'assistente-de-dados', query: 'assistente dados planilha analytics laptop' },
	{ slug: 'recrutador', query: 'recrutador entrevista emprego recursos humanos' },
	{ slug: 'agronomo', query: 'agronomo campo plantacao agricultura lavoura' },
	{ slug: 'assistente-social', query: 'assistente social comunidade orientacao familiar' },
	{ slug: 'analista-de-logistica', query: 'analista logistica armazem estoque distribuicao' },
	{ slug: 'engenheiro-ambiental', query: 'engenheiro ambiental sustentabilidade natureza' },
	{ slug: 'tecnico-em-microbiologia', query: 'tecnico microbiologia laboratorio amostras' },
	{ slug: 'geofisico', query: 'geofisico geologia campo exploracao recursos' },
	{ slug: 'gerente-de-sucesso-do-cliente', query: 'customer success gerente cliente reuniao' },
];

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd: root, shell: true, stdio: 'inherit' });
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} exit ${code}`));
		});
	});
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	console.log(`\nCapas lote 5: ${BATCH.length} profissões P1\n`);

	const fs = await import('node:fs');
	const failed = [];

	for (let i = 0; i < BATCH.length; i += 1) {
		const { slug, query } = BATCH[i];
		console.log(`\n[${i + 1}/${BATCH.length}] ${slug}`);

		const mdxPath = path.join(root, 'src', 'content', 'blog', `${slug}.mdx`);
		if (!fs.existsSync(mdxPath)) {
			failed.push({ slug, step: 'mdx' });
			continue;
		}

		try {
			await run('npm', ['run', 'fetch:image', '--', '--query', query, '--slug', slug]);
		} catch {
			failed.push({ slug, step: 'fetch' });
			continue;
		}

		await sleep(2500);

		const mdxRaw = fs.readFileSync(mdxPath, 'utf8');
		const heroMatch = mdxRaw.match(/heroImage:\s*["']?\.\/[^/]+\/images\/([^"'\n]+)["']?/);
		const hero = heroMatch?.[1];

		if (!hero) {
			failed.push({ slug, step: 'hero-file' });
			continue;
		}

		try {
			await run('npm', ['run', 'images:approve', '--', '--slug', slug, '--file', hero]);
		} catch {
			failed.push({ slug, step: 'approve' });
			continue;
		}

		await sleep(1500);
	}

	console.log('\n✓ Lote 5 concluído. Rode: npm run lint:images\n');
	if (failed.length) {
		console.warn('Falhas:', failed.map((f) => `${f.slug} (${f.step})`).join(', '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});

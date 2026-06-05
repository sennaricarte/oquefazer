/**
 * Lote 2 — capas para profissões prioritárias sem heroImage.
 * Uso: npm run fetch:batch-heroes
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Array<{ slug: string; query: string }>} */
const BATCH = [
	{ slug: 'nutricionista-clinico', query: 'nutricionista consultorio alimentacao saudavel' },
	{ slug: 'terapeuta-ocupacional', query: 'terapeuta ocupacional reabilitacao paciente' },
	{ slug: 'analista-de-sistemas', query: 'analista sistemas computador tecnologia escritorio' },
	{ slug: 'engenheiro-de-dados', query: 'engenheiro dados analytics dashboard servidor' },
	{ slug: 'designer-ux-ui', query: 'designer ux ui interface digital prototipo' },
	{ slug: 'analista-de-ciberseguranca', query: 'ciberseguranca seguranca digital computador' },
	{ slug: 'bioengenheiro', query: 'bioengenharia laboratorio biotecnologia pesquisa' },
	{ slug: 'engenheiro-de-producao', query: 'engenharia producao industria fabrica gestao' },
	{ slug: 'engenheiro-de-robotica', query: 'robotica braco robotico automacao industrial' },
	{ slug: 'pedreiro', query: 'pedreiro construcao obra alvenaria tijolos' },
	{ slug: 'engenheiro-de-machine-learning', query: 'machine learning inteligencia artificial codigo' },
	{ slug: 'engenheiro-de-dados-jr', query: 'engenheiro dados junior analytics laptop' },
	{ slug: 'cientista-de-dados', query: 'data analytics charts dashboard computer office' },
];

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: root,
			shell: true,
			stdio: 'inherit',
		});
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args.join(' ')} exit ${code}`));
		});
	});
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	console.log(`\nCapas lote 2: ${BATCH.length} profissões\n`);

	const failed = [];

	for (let i = 0; i < BATCH.length; i += 1) {
		const { slug, query } = BATCH[i];
		console.log(`\n[${i + 1}/${BATCH.length}] ${slug}`);

		try {
			await run('npm', ['run', 'fetch:image', '--', '--query', query, '--slug', slug]);
		} catch {
			failed.push({ slug, step: 'fetch' });
			continue;
		}

		await sleep(2500);

		const fs = await import('node:fs');
		const imagesDir = path.join(root, 'src', 'content', 'blog', slug, 'images');
		if (!fs.existsSync(imagesDir)) {
			console.warn(`  ⚠ pasta images não criada para ${slug}`);
			failed.push({ slug, step: 'images-dir' });
			continue;
		}

		const hero = fs
			.readdirSync(imagesDir)
			.filter((f) => f.startsWith('hero-') && f.endsWith('.jpg'))
			.sort()
			.at(-1);

		if (!hero) {
			console.warn(`  ⚠ nenhum hero baixado para ${slug}`);
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

	console.log('\n✓ Lote 2 concluído. Rode: npm run lint:images\n');

	if (failed.length) {
		console.warn('Falhas:', failed.map((f) => `${f.slug} (${f.step})`).join(', '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});

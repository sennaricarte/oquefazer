/**
 * Lote 4 — capas para 15 profissões P0 (alta demanda Google + LinkedIn 2026).
 * Uso: npm run fetch:batch-heroes-4
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Array<{ slug: string; query: string }>} */
const BATCH = [
	{ slug: 'fisioterapeuta', query: 'fisioterapeuta reabilitacao paciente clinica' },
	{ slug: 'dentista', query: 'dentista consultorio odontologia atendimento' },
	{ slug: 'tecnico-de-enfermagem', query: 'tecnico enfermagem hospital cuidado paciente' },
	{ slug: 'contador', query: 'contador escritorio financas planilha' },
	{ slug: 'devops', query: 'devops engenheiro servidores nuvem tecnologia' },
	{ slug: 'product-manager', query: 'product manager reuniao produto digital' },
	{ slug: 'engenheiro-eletrico', query: 'engenheiro eletrico painel eletrico industria' },
	{ slug: 'engenheiro-mecanico', query: 'engenheiro mecanico fabrica maquinas projeto' },
	{ slug: 'pedagogo', query: 'pedagogo educacao sala aula escola' },
	{ slug: 'planejador-financeiro', query: 'planejador financeiro investimentos consultoria' },
	{ slug: 'corretor-de-imoveis', query: 'corretor imoveis visita apartamento venda' },
	{ slug: 'veterinario', query: 'veterinario clinica animal pet atendimento' },
	{ slug: 'farmaceutico', query: 'farmaceutico farmacia medicamentos atendimento' },
	{ slug: 'bombeiro', query: 'bombeiro resgate emergencia capacete uniforme' },
	{ slug: 'analista-de-rh', query: 'analista rh recursos humanos entrevista' },
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
	console.log(`\nCapas lote 4: ${BATCH.length} profissões P0\n`);

	const fs = await import('node:fs');
	const failed = [];

	for (let i = 0; i < BATCH.length; i += 1) {
		const { slug, query } = BATCH[i];
		console.log(`\n[${i + 1}/${BATCH.length}] ${slug}`);

		const mdxPath = path.join(root, 'src', 'content', 'blog', `${slug}.mdx`);
		if (!fs.existsSync(mdxPath)) {
			console.warn(`  ⚠ MDX não encontrado: ${slug}.mdx`);
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

	console.log('\n✓ Lote 4 concluído. Rode: npm run lint:images\n');
	if (failed.length) {
		console.warn('Falhas:', failed.map((f) => `${f.slug} (${f.step})`).join(', '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});

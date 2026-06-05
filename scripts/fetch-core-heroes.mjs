/**
 * Baixa e aprova capas para profissões core (lote controlado).
 * Uso: node scripts/fetch-core-heroes.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const CORE = [
	{ slug: 'medico', query: 'medico hospital stethoscope professional' },
	{ slug: 'enfermeiro', query: 'enfermeiro hospital cuidado paciente' },
	{ slug: 'advogado', query: 'advogado tribunal justica profissional' },
	{ slug: 'professor', query: 'professor sala de aula ensino' },
	{ slug: 'arquiteto', query: 'arquiteto planta construcao escritorio' },
	{ slug: 'engenheiro-de-software', query: 'engenheiro software programacao escritorio' },
	{ slug: 'engenheiro-civil', query: 'engenheiro civil obra construcao capacete' },
	{ slug: 'cientista-de-dados', query: 'cientista dados analytics computador' },
	{ slug: 'desenvolvedor-de-software', query: 'desenvolvedor programador codigo laptop' },
	{ slug: 'eletricista', query: 'eletricista instalacao eletrica profissional' },
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
	console.log(`\nCapas core: ${CORE.length} profissões\n`);

	for (let i = 0; i < CORE.length; i += 1) {
		const { slug, query } = CORE[i];
		console.log(`\n[${i + 1}/${CORE.length}] ${slug}`);

		await run('npm', ['run', 'fetch:image', '--', '--query', query, '--slug', slug]);
		await sleep(2500);

		const fs = await import('node:fs');
		const imagesDir = path.join(root, 'src', 'content', 'blog', slug, 'images');
		if (!fs.existsSync(imagesDir)) {
			console.warn(`  ⚠ pasta images não criada para ${slug}`);
			continue;
		}

		const hero = fs
			.readdirSync(imagesDir)
			.filter((f) => f.startsWith('hero-') && f.endsWith('.jpg'))
			.sort()
			.at(-1);

		if (!hero) {
			console.warn(`  ⚠ nenhum hero baixado para ${slug}`);
			continue;
		}

		await run('npm', ['run', 'images:approve', '--', '--slug', slug, '--file', hero]);
		await sleep(1500);
	}

	console.log('\n✓ Lote core concluído. Rode: npm run lint:images\n');
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});

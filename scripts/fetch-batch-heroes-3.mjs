/**
 * Lote 3 — capas para ~30% de cobertura (~47 profissões prioritárias).
 * Uso: npm run fetch:batch-heroes-3
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Array<{ slug: string; query: string }>} */
const BATCH = [
	// Saúde
	{ slug: 'gerontologo', query: 'gerontologia idoso cuidado envelhecimento' },
	{ slug: 'psicologo-organizacional', query: 'psicologo organizacional empresa equipe' },
	{ slug: 'biologo-molecular', query: 'biologo molecular laboratorio dna pesquisa' },
	{ slug: 'especialista-em-saude-mental', query: 'saude mental bem estar psicologia consultorio' },
	{ slug: 'especialista-em-telessaude', query: 'telemedicina consulta online medico video' },
	{ slug: 'especialista-em-telemedicina', query: 'telemedicina paciente tablet consulta remota' },

	// Construção
	{ slug: 'encanador', query: 'encanador encanamento canos reparo hidraulica' },
	{ slug: 'pintor', query: 'pintor construcao pintura parede rolo' },
	{ slug: 'carpinteiro', query: 'carpinteiro madeira ferramentas marcenaria obra' },
	{ slug: 'gesseiro', query: 'gesseiro drywall construcao parede gesso' },
	{ slug: 'mestre-de-obras', query: 'mestre de obras construcao civil capacete' },
	{ slug: 'eletricista-predial', query: 'eletricista predial instalacao eletrica edificio' },
	{ slug: 'tecnico-em-edificacoes', query: 'tecnico edificacoes obra construcao civil' },

	// Comunicação
	{ slug: 'designer-grafico', query: 'designer grafico computador criacao visual' },
	{ slug: 'copywriter', query: 'copywriter redacao marketing laptop' },
	{ slug: 'editor-de-video', query: 'editor video producao audiovisual monitor' },
	{ slug: 'jornalista', query: 'jornalista reporter entrevista microfone' },
	{ slug: 'publicitario', query: 'publicitario agencia marketing criativo' },
	{ slug: 'social-media-manager', query: 'social media manager smartphone redes sociais' },
	{ slug: 'produtor-de-conteudo', query: 'produtor conteudo camera video criador' },
	{ slug: 'especialista-em-marketing-digital', query: 'marketing digital analytics laptop estrategia' },

	// Direito
	{ slug: 'mediador-de-conflitos', query: 'mediacao conflitos negociacao reuniao' },
	{ slug: 'advogado-digital', query: 'advogado digital tecnologia direito laptop' },

	// Finanças
	{ slug: 'atuario', query: 'atuaria financas calculo estatistica escritorio' },
	{ slug: 'analista-financeiro-junior', query: 'analista financeiro planilha graficos escritorio' },
	{ slug: 'analista-de-esg', query: 'esg sustentabilidade corporativa relatorio' },
	{ slug: 'gestor-de-fintech', query: 'fintech pagamento digital smartphone financeiro' },

	// Tecnologia
	{ slug: 'engenheiro-de-inteligencia-artificial', query: 'inteligencia artificial engenheiro codigo servidor' },
	{ slug: 'especialista-em-inteligencia-artificial', query: 'inteligencia artificial machine learning data center' },
	{ slug: 'engenheiro-de-cloud', query: 'cloud computing engenheiro nuvem datacenter' },
	{ slug: 'analista-de-cybersecurity', query: 'cybersecurity seguranca digital hacker protecao' },
	{ slug: 'cientista-de-dados-jr', query: 'cientista dados junior analytics laptop graficos' },
	{ slug: 'engenheiro-de-software-embarcado', query: 'software embarcado engenheiro eletronica placa' },
	{ slug: 'analista-de-ciberseguranca-jr', query: 'ciberseguranca junior monitor seguranca digital' },
	{ slug: 'gestor-de-projetos-de-ti', query: 'gestor projetos ti equipe tecnologia escritorio' },

	// Engenharia
	{ slug: 'engenheiro-de-automacao-industrial', query: 'automacao industrial fabrica robo plc' },
	{ slug: 'engenheiro-de-energia-renovavel', query: 'energia renovavel painel solar eolica' },
	{ slug: 'engenheiro-de-petroleo', query: 'engenheiro petroleo plataforma offshore industria' },
	{ slug: 'engenheiro-de-ciberseguranca', query: 'engenheiro ciberseguranca rede servidor' },
	{ slug: 'engenheiro-de-veiculos-eletricos', query: 'veiculo eletrico engenheiro carregamento bateria' },
	{ slug: 'engenheiro-de-agronegocios', query: 'agronegocio campo plantacao drone agricultura' },
	{ slug: 'engenheiro-de-seguranca-do-trabalho', query: 'seguranca trabalho capacete obra inspecao' },

	// Ciências
	{ slug: 'bioinformata', query: 'bioinformatica genoma computador laboratorio' },
	{ slug: 'bioestatistico', query: 'bioestatistica pesquisa dados laboratorio' },
	{ slug: 'cientista-comportamental', query: 'ciencia comportamental pesquisa experimento' },

	// Consultoria / gestão
	{ slug: 'consultor-de-transformacao-digital', query: 'transformacao digital consultoria tecnologia empresa' },
	{ slug: 'gestor-de-marketing', query: 'gestor marketing estrategia equipe reuniao' },
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
	console.log(`\nCapas lote 3: ${BATCH.length} profissões\n`);

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
		const mdxPath = path.join(root, 'src', 'content', 'blog', `${slug}.mdx`);
		const mdxRaw = fs.readFileSync(mdxPath, 'utf8');
		const heroMatch = mdxRaw.match(/heroImage:\s*["']?\.\/[^/]+\/images\/([^"'\n]+)["']?/);
		const hero = heroMatch?.[1];

		if (!hero) {
			console.warn(`  ⚠ heroImage não definido no frontmatter de ${slug}`);
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

	console.log('\n✓ Lote 3 concluído. Rode: npm run lint:images\n');

	if (failed.length) {
		console.warn('Falhas:', failed.map((f) => `${f.slug} (${f.step})`).join(', '));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});

/**
 * Monitoramento SEO pré-deploy: lint, clusters, sitemap e URLs críticas.
 *
 * Uso:
 *   npm run seo:monitor
 *   npm run seo:monitor -- --skip-build-check   # sem exigir dist/
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const reviewsDir = path.join(root, 'docs', 'reviews');
const reportPath = path.join(reviewsDir, 'seo-monitor.md');

const skipBuildCheck = process.argv.includes('--skip-build-check');

const CRITICAL_PATHS = [
	'/',
	'/areas',
	'/areas/saude',
	'/areas/tecnologia',
	'/areas/engenharia',
	'/blog',
	'/blog/medico',
	'/blog/enfermeiro',
	'/blog/desenvolvedor-de-software',
	'/sobre',
	'/politica-de-privacidade',
];

/** @type {Array<{ level: 'ok' | 'warn' | 'error'; label: string; detail?: string }>} */
const results = [];

function log(level, label, detail) {
	results.push({ level, label, detail });
	const icon = level === 'ok' ? '✓' : level === 'warn' ? '⚠' : '✗';
	console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`);
}

function loadEnv() {
	const envPath = path.join(root, '.env');
	if (!fs.existsSync(envPath)) return {};

	const env = {};
	for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
		const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (match) env[match[1]] = match[2].trim();
	}
	return env;
}

function runScript(label, scriptName) {
	const result = spawnSync('npm', ['run', scriptName], {
		cwd: root,
		shell: true,
		encoding: 'utf8',
	});

	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
	if (result.status === 0) {
		log('ok', label);
		return true;
	}

	log('error', label, output.split('\n').slice(-3).join(' | ') || `exit ${result.status}`);
	return false;
}

function collectSitemapUrls() {
	/** @type {Set<string>} */
	const urls = new Set();

	function readSitemap(filePath) {
		if (!fs.existsSync(filePath)) return;
		const xml = fs.readFileSync(filePath, 'utf8');
		const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

		for (const loc of locs) {
			if (loc.endsWith('.xml')) {
				readSitemap(path.join(distDir, path.basename(new URL(loc).pathname)));
			} else {
				urls.add(loc);
			}
		}
	}

	readSitemap(path.join(distDir, 'sitemap-index.xml'));
	if (!urls.size) {
		readSitemap(path.join(distDir, 'sitemap-0.xml'));
	}

	return urls;
}

function checkDist() {
	if (!fs.existsSync(distDir)) {
		if (skipBuildCheck) {
			log('warn', 'Build (dist/)', 'pasta ausente — rode npm run build para validar sitemap');
			return;
		}
		log('error', 'Build (dist/)', 'pasta ausente — rode npm run build antes do monitor');
		return;
	}

	log('ok', 'Build (dist/)');

	const robotsPath = path.join(distDir, 'robots.txt');
	if (!fs.existsSync(robotsPath)) {
		log('error', 'robots.txt', 'arquivo não encontrado em dist/');
	} else {
		const robots = fs.readFileSync(robotsPath, 'utf8');
		if (robots.includes('Sitemap:')) {
			log('ok', 'robots.txt referencia sitemap');
		} else {
			log('error', 'robots.txt', 'linha Sitemap: ausente');
		}
	}

	const sitemapUrls = collectSitemapUrls();
	if (!sitemapUrls.size) {
		log('error', 'Sitemap', 'nenhuma URL encontrada em dist/');
		return;
	}

	log('ok', 'Sitemap', `${sitemapUrls.size} URLs indexadas`);

	const siteUrl = loadEnv().SITE_URL || 'https://meusite.com.br';
	const missing = CRITICAL_PATHS.filter((pathname) => {
		const expected = new URL(pathname, siteUrl).href.replace(/\/$/, '');
		return ![...sitemapUrls].some((url) => url.replace(/\/$/, '') === expected);
	});

	if (missing.length) {
		log('error', 'URLs críticas no sitemap', missing.join(', '));
	} else {
		log('ok', 'URLs críticas no sitemap', `${CRITICAL_PATHS.length} verificadas`);
	}
}

function checkEnv() {
	const env = loadEnv();
	const siteUrl = env.SITE_URL || process.env.SITE_URL;

	if (!siteUrl || siteUrl.includes('meusite.com.br')) {
		log('warn', 'SITE_URL', 'defina o domínio final em .env antes do deploy');
	} else {
		log('ok', 'SITE_URL', siteUrl);
	}

	if (!env.PUBLIC_GA_ID && !process.env.PUBLIC_GA_ID) {
		log('warn', 'PUBLIC_GA_ID', 'não configurado — analytics inativo em produção');
	} else {
		log('ok', 'PUBLIC_GA_ID');
	}

	if (!env.PUBLIC_GOOGLE_SITE_VERIFICATION && !process.env.PUBLIC_GOOGLE_SITE_VERIFICATION) {
		log('warn', 'PUBLIC_GOOGLE_SITE_VERIFICATION', 'meta tag ausente — verifique manualmente no GSC');
	} else {
		log('ok', 'PUBLIC_GOOGLE_SITE_VERIFICATION');
	}
}

function writeReport() {
	fs.mkdirSync(reviewsDir, { recursive: true });
	const errors = results.filter((r) => r.level === 'error').length;
	const warns = results.filter((r) => r.level === 'warn').length;
	const oks = results.filter((r) => r.level === 'ok').length;

	const lines = [
		'# Relatório SEO — monitor',
		'',
		`Gerado em: ${new Date().toISOString()}`,
		'',
		`| Status | Quantidade |`,
		`|--------|------------|`,
		`| ✓ OK | ${oks} |`,
		`| ⚠ Aviso | ${warns} |`,
		`| ✗ Erro | ${errors} |`,
		'',
		'## Detalhes',
		'',
		...results.map((r) => {
			const icon = r.level === 'ok' ? '✓' : r.level === 'warn' ? '⚠' : '✗';
			return `- ${icon} **${r.label}**${r.detail ? `: ${r.detail}` : ''}`;
		}),
		'',
		'## Próximos passos (Search Console)',
		'',
		'1. Deploy com `SITE_URL` correto',
		'2. Verificar propriedade em [Google Search Console](https://search.google.com/search-console)',
		'3. Enviar sitemap: `{SITE_URL}/sitemap-index.xml`',
		'4. Acompanhar cobertura, páginas e consultas após 7–14 dias',
		'',
		'Ver guia completo: [docs/SEARCH_CONSOLE.md](../SEARCH_CONSOLE.md)',
		'',
	];

	fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
	console.log(`\nRelatório: ${path.relative(root, reportPath)}`);
}

function main() {
	console.log('\nMonitor SEO — O Que Faz\n');

	checkEnv();
	runScript('lint:seo', 'lint:seo');
	runScript('clusters:orphans', 'clusters:orphans');
	runScript('lint:images', 'lint:images');
	checkDist();
	writeReport();

	const hasErrors = results.some((r) => r.level === 'error');
	if (hasErrors) {
		console.log('\nMonitor concluído com erros.\n');
		process.exit(1);
	}

	console.log('\nMonitor concluído.\n');
}

main();

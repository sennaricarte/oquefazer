/**
 * Valida imagens dos artigos: duplicatas, capas repetidas, reprovadas.
 *
 * Uso:
 *   npm run lint:images
 *   npm run lint:images -- --strict   # warnings também falham
 */
import { analyzeImages, syncRegistryFromPosts } from './lib/image-registry.mjs';

function parseArgs(argv) {
	return { strict: argv.includes('--strict') };
}

function main() {
	const { strict } = parseArgs(process.argv);
	const entries = syncRegistryFromPosts();
	const { issues, warnings } = analyzeImages(entries);

	for (const item of warnings) {
		console.warn(`⚠ ${item.slug}: ${item.message}`);
	}

	for (const item of issues) {
		console.error(`✗ ${item.slug}: ${item.message}`);
	}

	const errorCount = issues.length;
	const warnCount = warnings.length;

	console.log(`\nImagens: ${entries.length} referências | ${errorCount} erro(s) | ${warnCount} aviso(s)`);

	if (errorCount > 0 || (strict && warnCount > 0)) {
		process.exit(1);
	}
}

main();

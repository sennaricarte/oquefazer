/**
 * Redimensiona capas e inlines existentes ao tamanho máximo do site.
 *
 * Uso:
 *   npm run images:normalize
 *   npm run images:normalize -- --slug agronomo
 */
import { optimizeImageFile } from './lib/image-optimize.mjs';
import { resolvePostImagePath, syncRegistryFromPosts } from './lib/image-registry.mjs';

function parseArgs(argv) {
	const slug = argv.includes('--slug') ? argv[argv.indexOf('--slug') + 1] : '';
	return { slug };
}

async function main() {
	const { slug } = parseArgs(process.argv);
	const entries = syncRegistryFromPosts().filter((entry) => {
		if (!entry.fileExists) return false;
		if (slug && entry.slug !== slug) return false;
		return true;
	});

	if (entries.length === 0) {
		console.log('Nenhuma imagem para normalizar.');
		return;
	}

	const seen = new Set();
	let count = 0;

	for (const entry of entries) {
		const absPath = resolvePostImagePath(entry.slug, entry.relPath);
		if (seen.has(absPath)) continue;
		seen.add(absPath);

		const role = entry.role === 'hero' ? 'hero' : 'inline';
		const result = await optimizeImageFile(absPath, { role });
		count += 1;
		console.log(
			`${entry.slug} (${entry.relPath}): ${result.width}×${result.height}px` +
				(result.resized ? ` ← era ${result.inputWidth}px` : ' (já ok)'),
		);
	}

	console.log(`\n${count} arquivo(s) processado(s). Rode npm run lint:images para validar.`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});

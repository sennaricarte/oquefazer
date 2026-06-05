import { setImageReviewStatus, syncRegistryFromPosts } from './lib/image-registry.mjs';

function parseArgs(argv) {
	const args = { slug: '', file: '', reason: '' };
	for (let i = 2; i < argv.length; i += 1) {
		if (argv[i] === '--slug' && argv[i + 1]) args.slug = argv[++i];
		else if (argv[i] === '--file' && argv[i + 1]) args.file = argv[++i];
		else if (argv[i] === '--reason' && argv[i + 1]) args.reason = argv[++i];
	}
	return args;
}

function main() {
	const args = parseArgs(process.argv);
	if (!args.slug || !args.file) {
		console.error('Uso: npm run images:reject -- --slug SLUG --file NOME.jpg [--reason texto]');
		process.exit(1);
	}

	setImageReviewStatus({
		slug: args.slug,
		fileName: args.file,
		status: 'rejected',
		note: args.reason,
	});
	syncRegistryFromPosts();

	console.log(`Reprovada: ${args.slug}/images/${args.file}`);
	if (args.reason) console.log(`Motivo: ${args.reason}`);
}

main();

import clustersData from './src/data/clusters.json';

function normalizeTagKey(tag) {
	return tag
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

/** Redireciona variantes slug das tags para o rótulo canônico (ex.: /tags/saude → /tags/Saúde). */
export function buildTagRedirects() {
	/** @type {Record<string, string>} */
	const redirects = {};

	for (const cluster of clustersData.clusters) {
		const canonicalPath = `/tags/${encodeURIComponent(cluster.tagLabel)}`;

		for (const alias of cluster.tagAliases) {
			if (alias === cluster.tagLabel) continue;
			if (normalizeTagKey(alias) !== normalizeTagKey(cluster.tagLabel)) continue;

			redirects[`/tags/${encodeURIComponent(alias)}`] = canonicalPath;
		}
	}

	return redirects;
}

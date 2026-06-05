export interface BreadcrumbItem {
	name: string;
	url: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

export function faqPageJsonLd(
	faq: Array<{ question: string; answer: string }>,
	pagePath: string,
	site: URL | string,
) {
	const siteUrl = typeof site === 'string' ? new URL(site) : site;
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer,
			},
		})),
		url: new URL(pagePath, siteUrl).href,
	};
}

export function websiteJsonLd(site: URL, blogName: string, searchPath = '/busca') {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: blogName,
		url: site.href,
		inLanguage: 'pt-BR',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: new URL(`${searchPath}?q={search_term_string}`, site).href,
			},
			'query-input': 'required name=search_term_string',
		},
	};
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function wrapCdata(html: string): string {
	const safe = html.replace(/]]>/g, ']]]]><![CDATA[>');
	return `<![CDATA[${safe}]]>`;
}

export function formatRfc822Date(date: Date): string {
	return date.toUTCString();
}

/** Converte Markdown simples em HTML quando o render pré-processado não está disponível (MDX). */
export function markdownToHtml(markdown: string): string {
	const trimmed = markdown.trim();
	if (!trimmed) return '';

	if (/<[a-z][\s\S]*>/i.test(trimmed)) {
		return trimmed;
	}

	return trimmed
		.split(/\n\n+/)
		.map((block) => `<p>${block.trim().replace(/\n/g, '<br />')}</p>`)
		.join('\n');
}

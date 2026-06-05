const WORDS_PER_MINUTE = 200;

/**
 * Remove marcações comuns de Markdown/MDX para contar apenas palavras legíveis.
 */
function stripMarkup(content: string): string {
	return content
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/^#{1,6}\s+/gm, ' ')
		.replace(/^\s*[-*+]\s+/gm, ' ')
		.replace(/^\s*\d+\.\s+/gm, ' ')
		.replace(/[*_~>|]/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function countWords(content: string): number {
	const text = stripMarkup(content);
	if (!text) return 0;
	return text.split(' ').filter(Boolean).length;
}

/**
 * Calcula o tempo de leitura em minutos a partir do corpo MDX/Markdown.
 * Retorna no mínimo 1 minuto quando há conteúdo.
 */
export function calculateReadingTime(content: string, wordsPerMinute = WORDS_PER_MINUTE): number {
	const words = countWords(content);
	if (words === 0) return 1;
	return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Rótulo legível em português (ex.: "5 min de leitura").
 */
export function formatReadingTime(minutes: number): string {
	return `${minutes} min de leitura`;
}

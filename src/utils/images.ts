import type { ImageMetadata } from 'astro';

export function resolveImageSrc(
	src: ImageMetadata | string | undefined,
	fallback = '/favicon.svg',
): string {
	if (!src) return fallback;
	return typeof src === 'string' ? src : src.src;
}

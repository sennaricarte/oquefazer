import presets from '../data/image-presets.json';

export type ImageVariant = keyof typeof presets.variants;

export type ImagePreset = (typeof presets.variants)[ImageVariant];

export function getImagePreset(variant: ImageVariant): ImagePreset {
	return presets.variants[variant];
}

export function getSourceMaxWidth(role: 'hero' | 'inline'): number {
	return presets.sourceMaxWidth[role];
}

export function resolveImageQuality(
	preset: ImagePreset,
	loading: 'lazy' | 'eager',
): number {
	if ('quality' in preset && typeof preset.quality === 'number') {
		return preset.quality;
	}
	if (loading === 'eager' && 'qualityEager' in preset) {
		return preset.qualityEager;
	}
	if ('qualityLazy' in preset) {
		return preset.qualityLazy;
	}
	return loading === 'eager' ? 44 : 38;
}

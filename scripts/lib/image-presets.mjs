import presets from '../../src/data/image-presets.json' with { type: 'json' };

export { presets };

export function getSourceMaxWidth(role = 'hero') {
	return presets.sourceMaxWidth[role] ?? presets.sourceMaxWidth.hero;
}

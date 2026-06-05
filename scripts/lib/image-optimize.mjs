import fs from 'node:fs';
import sharp from 'sharp';
import presets from '../../src/data/image-presets.json' with { type: 'json' };

/**
 * Redimensiona e comprime imagens baixadas para o tamanho máximo usado no site.
 * Evita originais 3000px+ que inflam o build e o Lighthouse.
 */
export async function optimizeImageFile(filePath, { role = 'hero' } = {}) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Arquivo não encontrado: ${filePath}`);
	}

	const maxWidth = presets.sourceMaxWidth[role] ?? presets.sourceMaxWidth.hero;
	const meta = await sharp(filePath).metadata();
	const inputWidth = meta.width ?? 0;

	const pipeline = sharp(filePath).rotate().resize({
		width: maxWidth,
		withoutEnlargement: true,
	});

	const ext = pathExt(filePath);
	const output =
		ext === 'png'
			? pipeline.png({ compressionLevel: 9, palette: true })
			: pipeline.jpeg({ quality: 82, mozjpeg: true });

	const buffer = await output.toBuffer();
	fs.writeFileSync(filePath, buffer);

	const outMeta = await sharp(filePath).metadata();
	return {
		inputWidth,
		width: outMeta.width ?? inputWidth,
		height: outMeta.height ?? meta.height ?? 0,
		maxWidth,
		resized: inputWidth > maxWidth,
	};
}

function pathExt(filePath) {
	return filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
}

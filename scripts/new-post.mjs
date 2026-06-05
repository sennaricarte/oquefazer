import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.join(root, '..', 'src', 'content', 'blog');

function slugify(input) {
	return input
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function todayIsoDate() {
	return new Date().toISOString().slice(0, 10);
}

function buildFrontmatter(title) {
	const pubDate = todayIsoDate();
	const description =
		'Descrição do post com no mínimo cinquenta caracteres para atender SEO, Open Graph e prévia nas redes sociais.';

	return `---
title: "${title}"
description: "${description}"
pubDate: ${pubDate}
author: "O Que Faz"
tags:
  - profissões
  - geral
draft: true
---

<!-- Antes de publicar: npm run check:topic -- "sua palavra-chave" -->
<!-- Use ## para subtítulos — o H1 vem do title. Não duplique tags (ex.: saude + Saúde). -->
<!-- Fluxo: docs/PROMPT_GERAR_ARTIGO.md · docs/ANTI_CANIBALIZACAO.md -->

Escreva o conteúdo do post aqui.
`;
}

function main() {
	const arg = process.argv[2];

	if (!arg) {
		console.error('Uso: npm run new:post -- "Título do novo post"');
		process.exit(1);
	}

	const title = arg.trim();
	const slug = slugify(title) || `post-${Date.now()}`;

	if (title.length < 10) {
		console.error('O título precisa ter pelo menos 10 caracteres (regra do schema).');
		process.exit(1);
	}

	fs.mkdirSync(blogDir, { recursive: true });

	const filePath = path.join(blogDir, `${slug}.mdx`);

	if (fs.existsSync(filePath)) {
		console.error(`Arquivo já existe: ${filePath}`);
		process.exit(1);
	}

	fs.writeFileSync(filePath, buildFrontmatter(title), 'utf8');
	console.log(`Post criado: src/content/blog/${slug}.mdx`);
	console.log('Fluxo SEO: docs/PROMPT_GERAR_ARTIGO.md');
	console.log('Peça à IA: "Gere o artigo completo para [palavra-chave]" usando essa regra.');
	console.log('Depois: npm run lint:seo → revisar → draft: false → npm run build');
}

main();

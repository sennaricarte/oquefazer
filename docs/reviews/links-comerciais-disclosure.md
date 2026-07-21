# Relatório — links comerciais sinalizados

Data: 2026-07-21  
Escopo: domínios `desentupidoracoppi.app.br`, `desentupidoracoppi.com.br`, `desentupidoraemcampinas.eco.br`, `desentupidoraemsorocaba.eco.br`, `grupoexpansao.com`  
Commit: **não realizado** (aguardando revisão)

## Método aplicado

- Não existe no projeto componente/plugin dedicado (ex.: `ExternalLink.astro`, `rehype-safe-external-links`).
- Links `[texto](url)` convertidos para HTML:
  `<a href="..." rel="sponsored nofollow noopener" target="_blank">...</a>`
- Disclosure inserido após o parágrafo de abertura e antes do primeiro H2; nos posts antigos em que o H2 já era o primeiro bloco do corpo, o disclosure foi colocado imediatamente após o frontmatter (antes do primeiro H2).

## Arquivos alterados

| Arquivo | Links corrigidos | Disclosure |
|---------|------------------|------------|
| `src/content/blog/desentupidora-em-sao-paulo.mdx` | **5** (`desentupidoracoppi.app.br`) | **Inserido** (não existia) |
| `src/content/blog/desentupidora-e-dedetizadora.mdx` | **5** (`desentupidoracoppi.com.br`) | **Inserido** (não existia) |
| `src/content/blog/desentupimento-caixa-gordura.mdx` | **1** (`desentupidoraemcampinas.eco.br`) | **Inserido** (não existia) |
| `src/content/blog/dedetizadora-de-cupins.mdx` | **1** (`desentupidoraemsorocaba.eco.br`) | **Inserido** (não existia) |

**Total:** 4 arquivos · **12 links** corrigidos · **4 disclosures** novos

## Disclosure pré-existente

Nenhum dos arquivos acimaidos já continha o bloco de aviso sobre empresas parceiras. **Nenhuma duplicata.**

## Domínios sem ocorrências

| Domínio | Resultado |
|---------|-----------|
| `grupoexpansao.com` | Nenhuma ocorrência em `src/content/` nem em outros `.md`/`.mdx` do repo (busca no escopo solicitado) |

## Observação (fora do escopo desta correção)

Existem outros links comerciais no blog (ex.: `desentopsp.com.br`, `liderboxdevidro.com.br`) que **não** estavam na lista fornecida e **não** foram alterados.

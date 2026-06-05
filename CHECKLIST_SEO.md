# Checklist SEO — O Que Fazer

Documentação das configurações implementadas no projeto e verificação antes de publicar cada post.

## Stack SEO configurada

| Área | Implementação |
|------|----------------|
| Framework | Astro 6 (SSG, `output: 'static'`) |
| URLs | `trailingSlash: 'never'`, canonical por página |
| Imagens | `OptimizedImage` (AVIF/WebP, srcset 400/800/1200, Sharp) |
| Metadados | `SEO.astro` + `BaseLayout` (title, description, OG, Twitter) |
| Schema.org | WebSite, BlogPosting, BreadcrumbList, Organization |
| Sitemap | `@astrojs/sitemap` com lastmod, priority, exclusão de drafts |
| Robots | `/robots.txt` dinâmico |
| RSS | `/feed.xml` (20 posts, `content:encoded`) |
| Analytics | GA4 via Partytown (só em produção) |
| Search Console | Meta `google-site-verification` via `PUBLIC_GOOGLE_SITE_VERIFICATION` |
| Monitor SEO | `npm run seo:monitor` — lint + sitemap + relatório |
| Busca | Fuse.js client-side em `/busca` e `/tags` |
| Tags | `/tags`, `/tags/[tag]` com paginação |
| Prefetch | Links internos (`prefetchAll`) |
| View Transitions | `ClientRouter` (navegação SPA-like) |

## Variáveis de ambiente (`.env`)

```env
SITE_URL=https://seudominio.com.br
SITE_NAME=Nome do Blog
PUBLIC_GA_ID=G-XXXXXXXXXX
PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_OG_IMAGE_ENDPOINT=/og
PUBLIC_BLOG_DESCRIPTION=...
PUBLIC_AUTHOR_NAME=Redação
```

## Scripts npm

| Comando | Função |
|---------|--------|
| `npm run build` | Build estático de produção |
| `npm run preview` | Preview do build |
| `npm run lint:seo` | Valida title/description dos posts publicados |
| `npm run seo:monitor` | Checklist SEO + validação de sitemap (após build) |
| `npm run new:post -- "Título do post"` | Cria `.mdx` com frontmatter padrão (`draft: true`) |
| `docs/PROMPT_GERAR_ARTIGO.md` | Prompt e fluxo SEO para a IA redigir artigos |
| `npm run import:site -- --url https://site-antigo.com` | Importa posts com imagens e links |
| `npm run import:oquefaz` | Importa de [oquefaz.app.br](https://oquefaz.app.br/) via Supabase |

## Helpers (`src/utils/seo.ts`)

- `truncateDescription(text, maxLength)` — meta description ≤ 160 chars
- `generateOgImageUrl(title, description)` — URL OG dinâmica (`/og?title=…&description=…`)
- `generateBreadcrumbs(pathname)` — array para Schema.org / `BreadcrumbNav`

## Checklist antes de publicar um post

### 1. Conteúdo e frontmatter

- [ ] `title` entre **10 e 70** caracteres
- [ ] `description` entre **50 e 160** caracteres (única, persuasiva)
- [ ] `pubDate` correta (ISO `YYYY-MM-DD`)
- [ ] `updatedDate` se o post foi revisado
- [ ] `tags` relevantes (2–5 tags)
- [ ] `draft: false` apenas quando pronto para publicar
- [ ] `heroImage` + `heroImageAlt` se usar imagem de capa
- [ ] `canonicalURL` só se o post for syndicated de outro domínio

### 2. Validação automática

```bash
npm run lint:seo
```

### 3. SEO on-page

- [ ] Um único **H1** (título do post na página)
- [ ] Hierarquia H2 → H3 sem pular níveis
- [ ] Links internos para posts/tags relacionados
- [ ] Imagens no MDX com `alt` descritivo (se usar `<Image>`)
- [ ] URL do post legível (slug do arquivo em `src/content/blog/`)

### 4. Após o build

- [ ] `npm run build` sem erros
- [ ] Post aparece em `/blog/[slug]`
- [ ] Listado em `/blog` e tags corretas em `/tags/[tag]`
- [ ] Presente no `sitemap-index.xml` (se não for draft)
- [ ] OG/Twitter corretos (ferramenta de debug: Facebook, Twitter/X)
- [ ] RSS atualizado (`/feed.xml`)

### 5. Produção

- [ ] `SITE_URL` aponta para domínio final
- [ ] `PUBLIC_GA_ID` configurado (se usar analytics)
- [ ] `PUBLIC_GOOGLE_SITE_VERIFICATION` configurado e propriedade verificada no GSC
- [ ] Sitemap enviado no Search Console: `{SITE_URL}/sitemap-index.xml`
- [ ] `npm run seo:monitor` sem erros
- [ ] `robots.txt` referencia sitemap correto
- [ ] Lighthouse: LCP, CLS, acessibilidade ≥ 90 quando possível

Guia detalhado: [docs/SEARCH_CONSOLE.md](docs/SEARCH_CONSOLE.md)

## Regras de acessibilidade (auditoria do projeto)

- Imagens via `OptimizedImage` com `alt` obrigatório
- Formulário de busca com `<label for="search-query">`
- Links internos **sem** `target="_blank"` desnecessário
- Um H1 por página nas rotas principais
- Breadcrumb com `aria-label` e `aria-current="page"`

## Rotas principais

| URL | H1 |
|-----|-----|
| `/` | O que fazer — guias e roteiros… |
| `/blog` | Blog — Guias e roteiros |
| `/blog/[slug]` | Título do post |
| `/tags` | Todas as tags |
| `/tags/[tag]` | Posts sobre [tag] |
| `/busca` | Buscar no blog |

## Criar novo post

```bash
npm run new:post -- "O que fazer em Curitiba no inverno"
```

Edite o arquivo gerado, complete o corpo, ajuste tags, adicione `heroImage` se necessário e defina `draft: false` antes do deploy.

## OG dinâmico (opcional)

Posts **sem** `heroImage` usam `generateOgImageUrl()` apontando para:

`{SITE_URL}/og?title=…&description=…`

Implemente a rota/endpoint `/og` no deploy ou altere `PUBLIC_OG_IMAGE_ENDPOINT` no `.env`.

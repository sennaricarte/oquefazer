# Deploy no Cloudflare Pages — O Que Faz

Guia para publicar o blog Astro (SSG) em produção com domínio `oquefaz.app.br`.

## Melhor opção para este projeto

**Cloudflare Pages + GitHub (deploy automático na branch `main`).**

- Cada `git push` gera um novo build
- Rollback em um clique
- Preview por branch/PR
- Não precisa de `@astrojs/cloudflare` (o site é `output: 'static'`)

---

## Pré-requisitos

1. Repositório no GitHub com o código (branch `main`)
2. Conta [Cloudflare](https://dash.cloudflare.com)
3. Domínio `oquefaz.app.br` na Cloudflare (recomendado) ou CNAME no registrador atual

---

## 1. Conectar o GitHub

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Autorize o GitHub e selecione o repositório `oquefazer`
3. Preencha o build:

| Campo | Valor |
|-------|--------|
| **Production branch** | `main` |
| **Framework preset** | Astro *(ou None)* |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | *(vazio — raiz do repo)* |

4. **Save and Deploy** *(o primeiro build pode levar 5–10 min — 280+ posts + Sharp)*

---

## 2. Variáveis de ambiente (copiar no painel)

**Pages → seu projeto → Settings → Environment variables**

Adicione em **Production** e **Preview** (mesmos valores, exceto se quiser URL de preview diferente).

### Obrigatórias

| Nome | Valor para colar | Tipo |
|------|------------------|------|
| `NODE_VERSION` | `22` | Text |
| `SITE_URL` | `https://oquefaz.app.br` | Text |

> `SITE_URL` **sem** barra no final. Usado em sitemap, canonical, RSS e Open Graph.

### Recomendadas (SEO e marca)

| Nome | Valor para colar | Tipo |
|------|------------------|------|
| `SITE_NAME` | `O Que Faz` | Text |
| `PUBLIC_BLOG_NAME` | `O Que Faz` | Text |
| `PUBLIC_BLOG_DESCRIPTION` | `Guia completo de profissões: o que faz, formação, habilidades e mercado de trabalho.` | Text |
| `PUBLIC_AUTHOR_NAME` | `O Que Faz` | Text |
| `PUBLIC_CONTACT_EMAIL` | `contato@oquefaz.app.br` | Text |

### Após configurar Search Console / Analytics

| Nome | Valor para colar | Tipo |
|------|------------------|------|
| `PUBLIC_GA_ID` | `G-XXXXXXXXXX` | Text |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | *(código da meta tag GSC, só o valor do `content`)* | Text |

### Não colocar na Cloudflare

Estas variáveis são **apenas para scripts locais** (gerar capas). Não entram no build do site:

- `PEXELS_API_KEY`
- `PIXABAY_API_KEY`
- `IMPORT_SOURCE_URL`

---

## 3. Bloco rápido (checklist de colagem)

Use como referência ao preencher o painel:

```
NODE_VERSION=22
SITE_URL=https://oquefaz.app.br
SITE_NAME=O Que Faz
PUBLIC_BLOG_NAME=O Que Faz
PUBLIC_BLOG_DESCRIPTION=Guia completo de profissões: o que faz, formação, habilidades e mercado de trabalho.
PUBLIC_AUTHOR_NAME=O Que Faz
PUBLIC_CONTACT_EMAIL=contato@oquefaz.app.br
PUBLIC_GA_ID=G-XXXXXXXXXX
PUBLIC_GOOGLE_SITE_VERIFICATION=
```

Substitua `G-XXXXXXXXXX` e o código GSC quando tiver os valores reais. Redeploy após alterar variáveis.

---

## 4. Domínio customizado

1. **Pages → Custom domains → Set up a custom domain**
2. Adicione `oquefaz.app.br`
3. Opcional: `www.oquefaz.app.br` com redirect para o apex (ou vice-versa — escolha um canônico e mantenha `SITE_URL` igual)

### DNS (se o domínio já está na Cloudflare)

A Cloudflare cria o registro automaticamente. Aguarde SSL **Active** (alguns minutos).

### DNS (domínio em outro registrador)

CNAME:

```
oquefaz.app.br  →  seu-projeto.pages.dev
```

---

## 5. Fluxo de publicação (dia a dia)

```bash
# Local: validar antes de subir
npm run lint:seo
npm run build

# Git
git add .
git commit -m "feat: novo artigo sobre enfermeiro"
git push origin main
```

A Cloudflare detecta o push, roda `npm run build` e publica `dist/`.

---

## 6. Checklist pós-deploy

- [ ] `https://oquefaz.app.br` abre sem erro
- [ ] `https://oquefaz.app.br/sitemap-index.xml` retorna XML
- [ ] `https://oquefaz.app.br/robots.txt` aponta para o sitemap
- [ ] `https://oquefaz.app.br/feed.xml` retorna RSS
- [ ] Página de post: `/blog/medico` (canonical com `oquefaz.app.br`)
- [ ] Redirect de tag: `/tags/saude` → `/tags/Saúde`
- [ ] [Google Search Console](https://search.google.com/search-console) — adicionar propriedade e enviar sitemap  
      *(detalhes em `docs/SEARCH_CONSOLE.md`)*

---

## 7. Problemas comuns

### Build falha em ~1 minuto com `wrangler` nos logs

Se aparecer **"Running custom build 'npm run build' failed"** e referência a `wrangler-*.log`:

1. **Node.js** — o projeto exige Node 22. No painel, adicione `NODE_VERSION=22` **ou** use o arquivo `.node-version` já no repositório.
2. **Tipo de projeto** — para site estático Astro, use **Pages** (não Workers com SSR):
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Deploy command:** deixe **vazio** (não use `wrangler deploy`)
3. **Install command** (avançado, opcional): `npm ci` em vez de `npm install`
4. O repositório inclui `wrangler.toml` com `[assets] directory = "./dist"` (Workers) e `pages_build_output_dir` (Pages).

### Workers com Git (seu caso atual)

| Campo | Valor exato (copiar) |
|-------|----------------------|
| Comando da build | `npm run build` |
| Comando de implantação | `npm run deploy:cf` |
| Diretório raiz | `/` |

> Use `npm run deploy:cf` em vez de `npx wrangler deploy` — evita typo (`px` sem o `n`).

> Build local leva **~10 min** (280 posts + Sharp). Na Cloudflare, espere 8–15 min. Se falhar antes de 2 min, quase sempre é Node ou comando de deploy errado.

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Deploy falha pedindo `--assets=./dist` ou `[assets]` | Workers sem diretório de assets | `wrangler.toml` com `[assets] directory = "./dist"` |
| Build falha em < 2 min + wrangler no log | Node 18/20 ou deploy command errado | `NODE_VERSION=22`, deploy command vazio |
| Build falha no Sharp | Node antigo | `NODE_VERSION=22` |
| Sitemap com URL errada | `SITE_URL` ausente | Definir `https://oquefaz.app.br` e redeploy |
| Canonical `meusite.com.br` | Fallback do código | Mesmo: configurar `SITE_URL` |
| Build timeout | Muitas imagens/posts | Retry; em planos pagos, aumentar limite de build |
| GA não carrega | `PUBLIC_GA_ID` vazio | Preencher variável; só funciona em produção |
| Preview com URL errada | Preview sem `SITE_URL` | Repetir variáveis na aba **Preview** |

---

## 8. Deploy manual (emergência / teste)

Sem Git, via CLI:

```bash
npm install -g wrangler
wrangler login
npm run build
npx wrangler pages deploy dist --project-name=oquefazer
```

Use só para teste. Produção deve usar **Git + Pages**.

---

## 9. CI no GitHub (opcional)

O workflow `.github/workflows/ci.yml` roda `lint:seo` e `build` em cada push/PR — falha antes de merge se algo quebrar.

---

## Referências

- [Cloudflare Pages — Astro](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- `docs/SEARCH_CONSOLE.md` — GSC e sitemap
- `.env.example` — todas as variáveis do projeto

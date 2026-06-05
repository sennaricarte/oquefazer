# Google Search Console e monitoramento — O Que Faz

Guia para colocar o site no Search Console, enviar o sitemap e acompanhar resultados após o deploy.

## Pré-requisitos no projeto

| Item | Onde | Status |
|------|------|--------|
| Sitemap | `/sitemap-index.xml` (gerado no build) | Automático |
| Robots | `/robots.txt` com `Sitemap:` | Automático |
| Canonical | `SITE_URL` em `.env` | Configurar |
| Verificação GSC | `PUBLIC_GOOGLE_SITE_VERIFICATION` | Configurar |
| Analytics | `PUBLIC_GA_ID` (opcional) | Configurar |

## 1. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
SITE_URL=https://oquefaz.app.br
PUBLIC_GA_ID=G-XXXXXXXXXX
PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

A meta tag `google-site-verification` é injetada automaticamente em todas as páginas quando a variável está definida.

## 2. Deploy e validação local

```bash
npm run build
npm run seo:monitor
```

O monitor roda `lint:seo`, `clusters:orphans`, `lint:images` e valida URLs críticas no sitemap. Relatório em `docs/reviews/seo-monitor.md`.

## 3. Verificar propriedade no Search Console

1. Acesse [Google Search Console](https://search.google.com/search-console)
2. **Adicionar propriedade** → **Prefixo do URL** → `https://oquefaz.app.br`
3. Método **Tag HTML**:
   - Copie o valor do atributo `content="..."` da meta tag
   - Cole em `PUBLIC_GOOGLE_SITE_VERIFICATION` no `.env`
4. Faça **novo deploy** (a tag precisa estar no ar)
5. Clique **Verificar** no Search Console

Alternativa: verificação via DNS (TXT) no registrador do domínio — útil se preferir não usar meta tag.

## 4. Enviar o sitemap

No Search Console → **Sitemaps** → adicionar:

```
https://oquefaz.app.br/sitemap-index.xml
```

Confirme que o status fica **Sucesso** (pode levar algumas horas).

URLs prioritárias incluídas automaticamente:

- Hubs `/areas` e `/areas/{cluster}` (priority 0.85)
- Posts `/blog/{slug}` (priority 0.8)
- Home e listagem `/blog` (priority 1.0 / 0.7)

## 5. O que monitorar (primeiras 2–4 semanas)

### Search Console

| Relatório | O que observar |
|-----------|----------------|
| **Desempenho** | Impressões e cliques em `/blog/*` e `/areas/*` |
| **Páginas** | Indexação sem erros 404 ou “rastreada, não indexada” |
| **Sitemaps** | URLs descobertas ≈ total publicado (~380 páginas) |
| **Experiência** | Core Web Vitals em URLs principais |

### Consultas para acompanhar

- `o que faz um médico`, `o que faz enfermeiro`
- `profissão desenvolvedor de software`
- `carreira em tecnologia`, `profissões saúde`

Compare tráfego dos **hubs** (`/areas/saude`) vs **spokes** (`/blog/medico`) para validar a estratégia de clusters.

### Google Analytics 4 (se `PUBLIC_GA_ID` ativo)

- Páginas mais visitadas
- Taxa de rejeição nos hubs vs fichas
- Origem orgânica vs direta

## 6. Rotina recomendada

| Quando | Ação |
|--------|------|
| Antes de cada deploy | `npm run seo:monitor` |
| Novo post | `npm run check:topic`, `npm run lint:seo`, link para `/areas/{cluster}` |
| Semanal | Search Console → Desempenho → filtrar `/areas/` |
| Mensal | Revisar posts com queda de impressões; atualizar `updatedDate` |

## 7. Comandos úteis

```bash
npm run seo:monitor              # checklist completo
npm run seo:monitor -- --skip-build-check   # sem exigir dist/
npm run lint:seo                 # title/description dos posts
npm run clusters:orphans         # posts sem área mapeada
npm run build                    # gera sitemap-index.xml
```

## Troubleshooting

**Sitemap não encontrado** — confirme `SITE_URL` no `.env` e que `robots.txt` aponta para `sitemap-index.xml`.

**Verificação falha** — a meta tag só aparece após deploy com `PUBLIC_GOOGLE_SITE_VERIFICATION` definido. Inspecione o HTML da home.

**Páginas não indexadas** — verifique `draft: false`, canonical correto e ausência de `noindex`.

**Canibalização** — use `npm run check:topic` antes de novos artigos; consulte `docs/ANTI_CANIBALIZACAO.md`.

# Anti-canibalização de conteúdo

Evitar dois ou mais artigos competindo no Google pela mesma intenção de busca (ex.: “o que faz um médico”).

## Comando

```bash
npm run check:topic -- "médico"
npm run check:topic -- "o que faz um enfermeiro obstetra"
npm run check:topic -- "analista de dados" --strict
```

- **`--strict`**: encerra com erro (exit 1) se houver conflito direto — útil em CI ou antes de `new:post`.
- **`--json`**: saída estruturada para automação.

## O que o script verifica

1. **Slug** equivalente ao tema.
2. **Chave da profissão** normalizada (remove “o que faz um”, “guia completo”, etc.).
3. **Busca fuzzy** em título, descrição, tags e início do corpo (~250 posts).

## Resultados

| Status | Significado |
|--------|-------------|
| **BLOQUEADO** | Já existe conteúdo para o mesmo tema — não criar post novo. |
| **CUIDADO** | Posts parecidos — confirmar ângulo único com o autor. |
| **OK** | Pode criar, desde que o ângulo seja diferente do que já existe. |

## O que fazer em cada caso

### Já existe artigo igual

- **Atualizar** o MDX existente (dados, mercado 2026, FAQ).
- Adicionar **links internos** em vez de um segundo guia genérico.
- Só criar outro post se o ângulo for claramente outro (ex.: “Salário de enfermeiro no Brasil” vs “O que faz um enfermeiro”).

### Dois posts sobre a mesma profissão

Ex.: `medico.mdx` e `o-que-faz-um-medico.mdx` — **não fundir** se cumprirem papéis distintos:

| URL | Papel | Intenção de busca |
|-----|-------|-------------------|
| `/blog/medico` | **Ficha** (`contentType: ficha`) | visão rápida, escaneável |
| `/blog/o-que-faz-um-medico` | **Guia** (`contentType: guia`) | “o que faz um médico” em profundidade |

Use `relatedProfession` nos dois sentidos + links no corpo. O layout exibe `ProfessionPairCallout` automaticamente.

Antes de criar um terceiro post sobre médico: `npm run check:topic -- "médico"`.

## Fluxo para novo artigo

1. `npm run check:topic -- "tema"`
2. Se OK → `npm run new:post -- "Título"` → redação (ver `docs/PROMPT_GERAR_ARTIGO.md`)
3. Antes de publicar → `npm run lint:seo`

A regra do Cursor `.cursor/rules/evitar-canibalizacao.mdc` aplica este passo automaticamente em pedidos de novos artigos.

# Estratégia de clusters — O Que Faz

## Arquitetura

| Nível | URL | Função |
|-------|-----|--------|
| Índice de áreas | `/areas` | Lista todos os hubs |
| Hub (pilar) | `/areas/{slug}` | Página editorial da área (intro, FAQ, lista de profissões) |
| Spoke | `/blog/{slug}` | Ficha, guia ou artigo de profissão |
| Tags (legado) | `/tags/{tag}` | Listagem antiga; link para o hub quando existir |

Dados dos hubs: `src/data/clusters.json`  
Lógica: `src/utils/clusters.ts`

## Clusters disponíveis

- `saude`, `tecnologia`, `engenharia`, `construcao-civil`, `direito`, `educacao`, `financas`, `administracao`, `comunicacao`, `design`, `ciencias`

O cluster de cada post é **inferido das tags** (`Saúde` → `saude`) ou definido no frontmatter:

```yaml
cluster: saude
contentType: ficha   # ficha | guia | artigo | profissao
relatedProfession: o-que-faz-um-medico   # slug do par complementar
```

## Auditar cobertura

```bash
npm run clusters:orphans
npm run clusters:orphans -- --json
```

Gera relatório em `docs/reviews/posts-sem-cluster.md` com posts órfãos e tags não mapeadas em `clusters.json`.

## Anti-canibalização

- Um cluster ≠ duas URLs com a mesma intenção (“o que faz médico”).
- Use `relatedProfession` para ligar **ficha curta** ↔ **guia longo** (ex.: `medico` ↔ `o-que-faz-um-medico`).
- Antes de novo post: `npm run check:topic -- "tema"`.

## Novo post no cluster

1. `npm run check:topic -- "profissão"`
2. Escolher área em `clusters.json` (ou tag compatível)
3. `npm run new:post -- "Título"`
4. Preencher `cluster` e `contentType` se a inferência não bastar
5. No corpo, linkar para `/areas/{cluster}` na introdução
6. Publicar e validar links no hub `/areas/{slug}`

## Editar um hub

Altere `src/data/clusters.json` (intro, highlights, FAQ) e rode `npm run build`.

## Componentes

- `ClusterHubBanner.astro` — faixa no topo do post com link ao hub
- Posts listam **irmãos do cluster** (`getClusterSiblings`) em vez de só tags genéricas

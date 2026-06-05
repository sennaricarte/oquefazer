# Revisão de imagens nos artigos

Processo para garantir que cada imagem faz sentido no contexto do artigo, não se repete no mesmo post e que **capas nunca são reutilizadas** entre artigos diferentes.

## Ferramentas

| Comando | Função |
|---------|--------|
| `npm run fetch:image -- --query "…" --slug …` | Baixa imagem (Pexels/Pixabay), evita IDs já usados |
| `npm run review:images` | Gera relatório em `docs/reviews/imagens-revisao.md` |
| `npm run review:images -- --slug medico` | Relatório de um artigo |
| `npm run review:images -- --pending` | Só pendentes e legado |
| `npm run images:approve -- --slug … --file …` | Marca imagem como aprovada |
| `npm run images:reject -- --slug … --file … --reason "…"` | Marca como reprovada |
| `npm run lint:images` | Valida duplicatas e bloqueios |
| `npm run lint:images -- --strict` | Falha também em avisos (alt genérico, pendente) |

Registro central: `src/data/image-registry.json` (sincronizado automaticamente pelos scripts).

Metadados por arquivo: `src/content/blog/{slug}/images/{arquivo}.meta.json`.

## Fluxo para novo artigo

1. Criar o MDX (`npm run new:post -- "Título"`).
2. Buscar **capa** com termo visual alinhado ao tema:
   ```bash
   npm run fetch:image -- --query "médico hospital atendimento" --slug o-que-faz-um-medico
   ```
3. Buscar **inline** (seções específicas), com query diferente:
   ```bash
   npm run fetch:image -- --query "estudante medicina livros" --slug o-que-faz-um-medico --role inline
   ```
   Copiar o `![alt](caminho)` sugerido para a seção correta do MDX.
4. Abrir o relatório e revisar cada imagem:
   ```bash
   npm run review:images -- --slug o-que-faz-um-medico
   ```
5. Checklist manual:
   - A foto combina com o **título** e a **seção** (heading acima)?
   - O **alt** descreve a cena (não “Imagem ilustrativa do artigo”)?
   - Não é igual à capa nem a outra inline no mesmo post?
6. Aprovar ou reprovar:
   ```bash
   npm run images:approve -- --slug o-que-faz-um-medico --file hero-abc12345.jpg
   npm run images:reject -- --slug o-que-faz-um-medico --file inline-def67890.jpg --reason "não relacionado à formação"
   ```
7. Antes de publicar (`draft: false`):
   ```bash
   npm run lint:images -- --strict
   ```

## Regras automáticas

- **Mesmo artigo:** não permite o mesmo arquivo, mesmo hash de bytes ou mesma origem (`pexels:ID`, `pixabay:ID`, `url:hash`) duas vezes; capa não pode ser igual a uma inline.
- **Entre artigos:** duas capas não podem ter o mesmo arquivo nem a mesma origem de stock.
- **fetch:image:** pula resultados já reservados; novas imagens ficam `reviewStatus: pending` até aprovação.
- **Imagens importadas (legado):** entram como `legacy` no relatório; `lint:images` alerta alt genérico e baixa aderência, mas só bloqueia com `--strict` se ainda estiverem pendentes/reprovadas.

## Artigos já publicados

Rodar uma vez para mapear tudo e ver duplicatas:

```bash
npm run lint:images
npm run review:images
```

Corrigir alt genéricos e trocar imagens reprovadas; depois aprovar as que estiverem corretas com `images:approve`.

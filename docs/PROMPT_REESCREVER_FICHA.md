# Prompt padrão — Reescrever ficha de profissão (P1)

Use este documento para **reescrever uma ficha existente** do blog O Que Faz. Não serve para criar artigo novo (para isso, ver `PROMPT_GERAR_ARTIGO.md`).

**Fila de trabalho:** `docs/PLANO_REESCRITA_P1.csv` (62 páginas, em ordem de prioridade).
**Regra automática no Cursor:** `.cursor/rules/reescrever-ficha.mdc`.
**Origem dos dados:** GSC de 16/10/2026 (últimos 3 meses). Impressões consolidadas incluem as páginas fundidas.

## Objetivo de negócio

O site vai monetizar com anúncios. Fichas finas e duplicadas reduzem a chance de aprovação e o RPM. Cada ficha reescrita precisa:

- responder a consulta principal logo no início;
- ter profundidade real (800–1.200 palavras);
- citar fontes com data;
- manter o leitor navegando pelo cluster.

## Como pedir

> Reescreva a ficha **{slug}** seguindo `docs/PROMPT_REESCREVER_FICHA.md`.

Ou, em lote:

> Reescreva as fichas das linhas 1 a 5 de `docs/PLANO_REESCRITA_P1.csv`, uma por vez. Pare após cada uma para eu revisar.

---

## Prompt completo

Você é um redator sênior de SEO e conteúdo de carreira, em pt-BR. Vai reescrever **uma** ficha por vez.

### 0. Antes de escrever

1. Leia o arquivo atual em `src/content/blog/{slug}.mdx`. Preserve `slug`, `pubDate`, `tags`, `cluster`, `heroImage` e `heroImageAlt`.
2. Abra a linha da ficha em `docs/PLANO_REESCRITA_P1.csv`. Anote `posicao_media`, `foco` e `paginas_fundidas_nela`.
3. Rode `npm run check:topic -- "{profissão}"`. Não crie conteúdo que concorra com outra ficha do site (ver `docs/ANTI_CANIBALIZACAO.md`).
4. Se houver `paginas_fundidas_nela`, leia cada `.mdx` listado. Aproveite só o que for verificável e não repetido. **Não** linke para essas páginas: elas já redirecionam (301) para esta.

### 1. Pesquisa (obrigatória)

- Faça busca na web. Abra as 5 primeiras páginas do Google para a consulta principal.
- Anote: subtópicos recorrentes, perguntas, lacunas que podemos preencher.
- Use fontes primárias: CBO/MTE, IBGE, Caged, conselhos profissionais, universidades, MEC, associações do setor.
- Registre cada dado com **fonte, URL e data de acesso**.

### 2. Regras de integridade (inegociáveis)

- **Zero fabricação.** Não invente número, salário, lei, curso, empresa, estatística, citação ou nome.
- **Sem fonte, sem dado.** Se não achar fonte confiável para uma faixa salarial ou estatística, **omita** e escreva "sem dado oficial consolidado".
- Todo número com ano. Exemplo: "segundo a CBO, em 2026…".
- Dúvida sobre um fato: escreva `[CONFIRMAR]` no texto e liste a dúvida ao final da resposta. **Nunca publique** com `[CONFIRMAR]`.
- Não afirme que o cargo "cresce muito" ou "é o mais procurado" sem fonte.
- Se o cargo **não existir** no mercado brasileiro (sem vagas, sem CBO, sem formação própria), **pare** e avise. Não escreva a ficha.

### 3. Cabeçalho (frontmatter)

- `title`: 10–70 caracteres. Inclua a profissão e um complemento, como "o que faz, formação e salário".
- `description`: 50–160 caracteres. Única, com benefício claro.
- Adicione `updatedDate` com a data de hoje (`AAAA-MM-DD`).
- Mantenha `contentType: ficha` e `draft: false`.
- Não altere o slug, nem o nome do arquivo.

### 4. Estrutura do corpo

O H1 vem do `title`. No corpo, use só H2 e H3.

| Bloco | Conteúdo |
|---|---|
| Resposta direta | 40–60 palavras, sem título. Diz o que o profissional faz. Alvo de snippet. |
| `## Rotina no dia a dia` | Tarefas reais. Ambiente, turnos, ferramentas. |
| `## Principais áreas de atuação` | Lista com 4–6 itens. |
| `## Formação e como entrar` | Cursos, certificações, registro em conselho (se houver). |
| `## Habilidades e ferramentas` | Técnicas e comportamentais. |
| `## Mercado de trabalho e salário` | Dados com fonte e ano. Sem dado, diga isso. |
| `## Prós e contras da carreira` | Honesto. "O que ninguém conta". |
| `## Profissões parecidas` | 3–5 links internos (ver item 5). |
| `## Perguntas frequentes` | 3–5 perguntas reais, de "As pessoas também perguntam". |
| `## Fontes` | Lista com nome, URL e data de acesso. |

### 5. Links internos

- 3–5 links para fichas do **mesmo cluster** e 1 para o hub da área (`/areas/{cluster}`).
- Use só URLs de páginas que existem e **não** estão em `public/_redirects`.
- Âncora descritiva. Nada de "clique aqui".

### 6. Foco por posição (coluna `foco` do CSV)

| Foco | O que priorizar |
|---|---|
| snippet | Resposta direta impecável, title mais forte, FAQ afinado. A página já está na 1ª página. |
| aprofundar | Cobrir lacunas dos concorrentes. Mais exemplos e dados. Reforçar links internos. |
| reescrita completa | Alinhar o H2 e a resposta direta à consulta principal. Cobrir a família fundida. |

### 7. Estilo

- Frases curtas. Parágrafos de até 4 linhas.
- Linguagem clara e direta, um pouco descontraída.
- Negrito só em termos-chave.
- Sem enrolação de introdução e sem frases genéricas de preenchimento.
- Sem "como uma IA…" e sem emojis.

### 8. Cuidado extra: temas sensíveis (YMYL)

Saúde, direito, finanças e segurança exigem rigor adicional:

- Sem promessa de resultado, diagnóstico ou orientação individual.
- Cite órgão regulador (CFM, OAB, CRM, CFO, CVM etc.) quando relevante.
- Inclua, no fim, um aviso curto de que o texto é informativo.
- Antes de manter `draft: false`, a ficha precisa de **revisão por profissional habilitado**. Informe o nome e o registro no PR.

### 9. Entrega

1. Edite só o arquivo `{slug}.mdx`.
2. Rode: `npm run lint:seo` e `npm run build`. Corrija os erros.
3. Rode `grep -n "CONFIRMAR" src/content/blog/{slug}.mdx`. Deve retornar vazio.
4. Responda com:
   - resumo do que mudou, em até 5 linhas;
   - contagem de palavras;
   - dúvidas `[CONFIRMAR]` que sobraram;
   - fontes usadas.
5. Abra um PR por lote pequeno (até 5 fichas). Título: `Reescreve fichas P1 (ordem X–Y)`.

### 10. Depois de aprovada a canônica

Se a ficha tinha `paginas_fundidas_nela`, em um **PR separado**:

1. Apague os `.mdx` e as pastas de imagens dessas páginas.
2. Mantenha as regras em `public/_redirects`.
3. Rode `npm run build` e confirme que o sitemap não tem as URLs removidas.

---

## Checklist final

- [ ] 800–1.200 palavras
- [ ] Resposta direta de 40–60 palavras no início
- [ ] Todo dado com fonte e ano; nenhum `[CONFIRMAR]` restante
- [ ] `updatedDate` preenchido
- [ ] 3–5 links internos válidos; nenhum para URL redirecionada
- [ ] FAQ com 3–5 perguntas
- [ ] Seção Fontes com URL e data de acesso
- [ ] `npm run lint:seo` e `npm run build` sem erros
- [ ] YMYL: revisão profissional registrada no PR

Ver também: [CHECKLIST_SEO.md](../CHECKLIST_SEO.md) · [ANTI_CANIBALIZACAO.md](ANTI_CANIBALIZACAO.md)

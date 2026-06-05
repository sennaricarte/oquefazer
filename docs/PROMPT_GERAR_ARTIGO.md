# Prompt padrão — Gerar novo artigo

Use este documento quando pedir à IA (Cursor ou outro) para **criar um novo artigo** no blog O Que Faz.

**Regras automáticas no Cursor:** `.cursor/rules/gerar-artigo-blog.mdc` · `.cursor/rules/evitar-canibalizacao.mdc`

**Antes de qualquer artigo novo — verificar tema existente:**

```bash
npm run check:topic -- "enfermeiro obstetra"
```

Se já houver post sobre a mesma profissão/intenção, **não duplicar**; atualize o existente ou combine com o usuário um ângulo diferente. Ver `docs/ANTI_CANIBALIZACAO.md`.

**Comando rápido para criar o arquivo vazio:**

```bash
npm run new:post -- "Título do artigo com palavra-chave"
```

**Imagem de capa (Pexels / Pixabay):** configure `PEXELS_API_KEY` e `PIXABAY_API_KEY` no `.env` (veja `.env.example`). Depois do MDX criado:

```bash
npm run fetch:image -- --query "enfermeiro hospital" --slug enfermeiro
```

O script baixa a imagem, preenche `heroImage` / `heroImageAlt` e grava metadados em `{slug}/images/{arquivo}.meta.json`.

**Revisão obrigatória:** ver `docs/IMAGENS_REVISAO.md` — `npm run review:images`, `npm run images:approve`, `npm run lint:images -- --strict` antes de publicar.

---

## Como pedir

Exemplo:

> Gere um novo artigo sobre a palavra-chave **enfermeiro obstetra** (ou: sobre o assunto **o que faz um analista de dados**).

A IA deve seguir o fluxo abaixo.

---

## Prompt completo

Preciso que você faça o seguinte:

Toda vez que eu lhe informar uma palavra-chave ou especificar um assunto, faça uma ampla pesquisa sobre o tema em fontes confiáveis.

Com essas informações em mão, aja com um redator de blog especialista em SEO, identifique quais os sites mais bem colocados na pesquisa do Google para o assunto, e analise o que o nosso artigo precisa ter para obter uma boa colocação nas buscas. Use todas as boas práticas recomendadas pelo Google para construção de artigos e gere a estrutura completa do artigo.

### Principais práticas

#### 1. Foco no Conteúdo e no Leitor (E-E-A-T)

- **Conteúdo útil e de qualidade:** original, aprofundado, informativo, com valor significativo. Responda às perguntas e problemas do usuário.
- **Priorize o humano:** escreva para o leitor, não para o robô.
- **E-E-A-T:** Experiência, Especialidade, Autoridade e Confiabilidade — precisão e informação verdadeira.
- **Originalidade:** novas perspectivas e insights; evite reempacotar outras fontes.

#### 2. Otimização para Mecanismos de Busca (SEO)

- Pesquisa de palavras-chave e termos relacionados.
- Integração natural em: título, subtítulos (H2, H3), introdução, corpo, meta description.
- URL descritiva e amigável (slug do arquivo).
- Dados estruturados: o layout do site já injeta JSON-LD via `SEO.astro` / páginas de post.

#### 3. Formatação e escaneabilidade

- Títulos e subtítulos claros (um H1 por página — vem do frontmatter).
- Parágrafos curtos, frases concisas.
- Listas e bullet points.
- Negrito/itálico para destacar frases-chave.

Depois disso, escreva um artigo completo e otimizado, com teor informativo, linguagem amigável, em alguns momentos descontraída, de fácil leitura, humanizado e com conteúdo de valor.

### Estratégias adicionais (sempre)

- Intenção de busca para cada termo.
- Análise de como as pessoas pesquisam: subtópicos e informações obrigatórias na página.
- Criação estratégica de conteúdo com base em entidades observadas na SERP.

---

## Sobre o site (contexto da marca)

A dúvida de "o que eu vou ser quando crescer" não precisa ser um peso.

Escolher uma carreira ou decidir mudar de área é uma das decisões mais complexas da vida. O mercado de trabalho muda rápido, novas tecnologias surgem a cada dia e as descrições de cargos nem sempre dizem a verdade sobre o dia a dia.

Foi para acabar com esse "vazio" de informação que nasceu o **O Que Faz**.

### Nossa missão

Ser a ponte entre a dúvida e a decisão consciente. Queremos que você entenda não apenas o nome de um cargo, mas a rotina real, os desafios práticos e as reais oportunidades que cada profissão oferece no mercado atual.

### O que você encontra aqui

- **Dia a dia real:** o que o profissional faz da chegada à saída.
- **Capacitação e formação:** cursos, certificações e habilidades exigidos hoje.
- **Mercado de trabalho:** vagas, setores em alta, média salarial (com fontes quando possível).
- **Particularidades:** o que ninguém conta na faculdade, mas faz diferença na prática.

### Por que confiar no O Que Faz?

Focamos na **atualidade**. O mercado exige competências que mudam rápido. Compromisso com informação atualizada, dados reais e tendências globais. Conhecimento como ferramenta para carreira com propósito e estabilidade financeira.

### Público

Estudantes na primeira graduação, profissionais em transição de carreira e curiosos sobre profissões do futuro.

---

## Checklist pós-geração

- [ ] `npm run lint:seo`
- [ ] `title` 10–70 chars, `description` 50–160 chars
- [ ] Tags e slug coerentes
- [ ] Links internos para posts/tags relacionados
- [ ] `draft: false` só após revisão humana
- [ ] `npm run build` sem erros

Ver também: [CHECKLIST_SEO.md](../CHECKLIST_SEO.md)

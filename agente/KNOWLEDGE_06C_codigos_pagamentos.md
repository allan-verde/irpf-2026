# KNOWLEDGE_06C — Códigos Oficiais: Pagamentos Efetuados

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Tabelas — Códigos de Pagamentos" (p. 363) e ficha "Pagamentos Efetuados" (p. 137-155, ainda não extraída em detalhe — apenas a tabela de códigos foi consolidada). Este arquivo SUBSTITUI a seção "Códigos de pagamentos efetuados (reg 26)" de `KNOWLEDGE_02_codigos_pgd.md`.

## Como o agente deve usar este arquivo

Use esta tabela como fonte ÚNICA pra escolher `codigo` ao gerar JSON em `pagamentos_atualizados` / `pagamentos_novos_aviso` / `pagamentos_a_remover`. **Não invente códigos.** Se um pagamento não cabe em nenhum código listado, use `99` (Outros) e detalhe o tipo no `resumo`/`origem` e em `observacoes`.

Convenção: `codigo` sempre 2 dígitos string (`"01"`, `"30"`, `"99"`).

---

## ⚠️ CORREÇÕES IMPORTANTES (códigos que estavam errados no projeto anterior)

A versão anterior do projeto (`KNOWLEDGE_02`, `INSTRUCOES_PROJETO`, prompt do `App.jsx`, exemplos em `KNOWLEDGE_03`) trocava ou inventava códigos. Resumo do que mudou:

| Pagamento | Código que era usado (errado) | Código oficial (correto) | Observação |
|---|---|---|---|
| Aluguel pago | 60 ❌ | **70** | "60" no manual é Advogado (ação judicial não-trabalhista) |
| Honorários advocatícios | 70 ❌ | **60** / **61** / **62** | 70 é Aluguéis. 60 = judicial não-trabalhista, 61 = judicial trabalhista, 62 = demais |
| Pensão alimentícia judicial residente | 33 ❌ | **30** | 33 é apenas separação/divórcio por escritura pública |
| Pensão judicial não-alimentícia | 72 ❌ | **NÃO EXISTE** | 72 é Corretor de imóveis. Não há código pra "pensão não-alimentícia" |
| Cooperativa odontológica/médica | 40 ❌ | **NÃO EXISTE** | Cooperativa LTDA cai em 21 (PJ saúde Brasil) |
| Seguros saúde Brasil | 24 ❌ | **NÃO EXISTE** | Inventado. Plano de saúde é 26 |
| Planos saúde no exterior | 27 ❌ | **NÃO EXISTE** | Inventado |
| Hospitais/clínicas no exterior | 23 ❌ | **22** | Off-by-one |
| Contribuição INSS empregado doméstico/autônomo | 37 ❌ | **NÃO EXISTE essa categoria com esse código** | "37" oficial é previdência complementar fechada/aberta (§15 art. 40 CF — servidores públicos). Pra INSS doméstico/autônomo, usar 99 com discriminação clara, até confirmar código correto numa próxima extração do manual (p. 137-155) |

**Ação:** essas trocas foram corrigidas em `INSTRUCOES_PROJETO.md` (regra 13), no prompt do `App.jsx` (`montarPromptPatch`) e no exemplo 4 do `KNOWLEDGE_03_exemplos.md`.

---

## TABELA OFICIAL DE CÓDIGOS (Manual IRPF 2026 p. 363)

| Cód | Descrição |
|---|---|
| **01** | Despesas com instrução no Brasil |
| **02** | Despesas com instrução no exterior |
| **09** | Fonoaudiólogos no Brasil |
| **10** | Médicos no Brasil |
| **11** | Dentistas no Brasil |
| **12** | Psicólogos no Brasil |
| **13** | Fisioterapeutas no Brasil |
| **14** | Terapeutas ocupacionais no Brasil |
| **15** | Médicos no exterior |
| **16** | Dentistas no exterior |
| **17** | Psicólogos no exterior |
| **18** | Fisioterapeutas no exterior |
| **19** | Terapeutas ocupacionais no exterior |
| **20** | Fonoaudiólogos no exterior |
| **21** | Hospitais, clínicas e laboratórios com saúde humana no Brasil |
| **22** | Hospitais, clínicas e laboratórios com saúde humana no exterior |
| **26** | Planos de saúde no Brasil |
| **30** | Pensão alimentícia judicial paga a residente no Brasil |
| **31** | Pensão alimentícia judicial paga a não residente no Brasil |
| **33** | Pensão alimentícia – separação/divórcio por escritura pública paga a residente no Brasil |
| **34** | Pensão alimentícia – separação/divórcio por escritura pública paga a não residente no Brasil |
| **36** | Previdência Complementar (inclusive Fapi) |
| **37** | Contribuições para entidades de previdência complementar fechadas/abertas de que trata o § 15 do art. 40 da Constituição Federal de 1988 |
| **60** | Advogados — honorários relativos a ações judiciais, exceto trabalhistas |
| **61** | Advogados — honorários relativos a ações judiciais trabalhistas |
| **62** | Advogados — demais honorários |
| **66** | Engenheiros, Arquitetos e demais profissionais liberais (exceto advogados, administrador de imóveis ou corretor de imóveis) |
| **70** | Aluguéis de imóveis |
| **71** | Administrador de imóvel |
| **72** | Corretor de imóveis |
| **76** | Arrendamento rural |
| **99** | Outros |

---

## Decisões comuns

### Saúde
- **Dentista pessoa física (CPF)** → **11**
- **Dentista LTDA / clínica odontológica (CNPJ)** → **21** (PJ saúde Brasil)
- **Hospital / laboratório / clínica médica (CNPJ)** → **21**
- **Cooperativa médica/odontológica (CNPJ)** → **21** (cai como PJ saúde Brasil — não há código próprio)
- **Plano de saúde (Unimed, Bradesco Saúde, Amil, Hapvida etc.)** → **26**
- **Médico PF** → **10**, **Psicólogo PF** → **12**, **Fisio PF** → **13**, **Terapeuta ocupacional PF** → **14**, **Fonoaudiólogo PF** → **09**
- **Exterior**: profissionais PF em 15-20 (15 médico, 16 dentista, 17 psicólogo, 18 fisio, 19 terapeuta ocupacional, 20 fono), PJ em **22**

### Educação
- **Escola / faculdade / curso técnico no Brasil** → **01** (mesmo se a escola é LTDA — não usar 21 nem 99 pra mensalidade escolar)
- **Curso no exterior** → **02**

### Advogados
- **Ação judicial não-trabalhista** (família, cível, tributária, previdenciária, sucessões, etc.) → **60**
- **Ação judicial trabalhista** → **61** (inclui honorários relativos a verba salarial atrasada, RRA trabalhista)
- **Honorários administrativos / consultivos / fora de ação judicial** → **62**

### Aluguel e imóveis
- **Aluguel pago a PF** → **70** (e o locador PF entra também no Carnê-Leão da declaração do recebedor, se for cliente do escritório)
- **Aluguel pago a PJ** → **70**
- **Administrador de imóvel** (taxa de administração paga ao gestor) → **71**
- **Corretor de imóveis** (comissão paga) → **72**
- **Arrendamento rural pago** → **76**

### Pensão alimentícia
- **Padrão (90%+ dos casos)**: pensão fixada em decisão judicial paga a alguém residente no Brasil → **30**
- Se a separação foi consensual por escritura pública (não judicial) → **33** (residente) ou **34** (não-residente)
- Se o alimentando mora fora do Brasil → **31** (judicial) ou **34** (escritura pública)
- **Heurística do agente**: quando o informe/recibo não diferenciar, assumir **30** e mencionar em `observacoes` a hipótese (ex: "assumi código 30 — pensão judicial residente; confirmar se foi por escritura pública ou alimentando no exterior"). Pedir confirmação se houver pistas de escritura pública (cartório, separação consensual) ou de alimentando fora do Brasil.

### Previdência
- **PGBL, FAPI, previdência privada aberta** (planos comerciais Bradesco Vida, BrasilPrev, Itaú Vida, etc.) → **36** (dedutível até 12% da renda tributável)
- **Previdência complementar fechada de servidor público / fundo de pensão estatutário** (Funpresp, Postalis, Previ, etc., enquadrados no §15 art. 40 CF) → **37**
- **INSS empregado doméstico ou contribuição autônoma**: códigos 36/37 **NÃO** se aplicam. Esses pagamentos têm tratamento próprio no PGD que ainda não está mapeado nesta extração — usar **99** com discriminação clara, ou consultar o manual p. 137-155 (não extraído).

### Outros profissionais liberais
- **Engenheiros, arquitetos, contadores, consultores, designers, programadores PF** (qualquer profissional liberal autônomo que não seja advogado, admin imóvel, corretor) → **66**

### Caixa-d'agua: código 99
Qualquer pagamento que não caiba em nenhum dos códigos acima → **99** (Outros), com `discriminacao` clara descrevendo a natureza. Não inventar códigos novos.

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **`codigo` deve estar na lista oficial.** Whitelist: `["01","02","09","10","11","12","13","14","15","16","17","18","19","20","21","22","26","30","31","33","34","36","37","60","61","62","66","70","71","72","76","99"]`. Se a IA mandar `"40"`, `"24"`, `"25"`, `"27"`, `"23"`, etc., a UI deve alertar e impedir geração do `.DBK` até o contador confirmar a correção.
2. **CPF/CNPJ vs código profissional**: códigos **09-14** (profissionais PF Brasil) exigem CPF (11 dígitos) em `cnpj_cpf`. Códigos **21**, **26** exigem CNPJ (14 dígitos). Se vier 14 dígitos pra código 11, sugerir reclassificar como código 21 (e vice-versa).
3. **Pensão**: se código for **30/31/33/34**, a discriminação deve mencionar dados do alimentando ou processo. Verificar se há ficha **Alimentandos** correspondente no template — pensão sem alimentando cadastrado é provavelmente erro.
4. **Aluguel**: código **70** exige CPF (PF) ou CNPJ (PJ) válido no `cnpj_cpf`. Se for PF, considerar criar entrada paralela em `rendimentos_pf_carne_leao` se o **locador for cliente do escritório** (recebimentos de aluguel são tributáveis pelo recebedor).

---

## Pendências relacionadas

- **Páginas 137-155 do manual ainda não extraídas** — contêm a explicação detalhada da ficha (limites de dedução, regras de comprovação, distinção entre dedutível e meramente informativo, tratamento de INSS doméstico/autônomo). Vão expandir este KNOWLEDGE quando forem incluídas.
- **Ficha "Alimentandos" (p. 50)** — usada em conjunto com códigos 30/31/33/34. Mapeamento da estrutura no `.DBK` ainda não feito.
- **Próximo KNOWLEDGE_06D**: Tabela de Dependentes (p. 359 do manual — já temos a tabela, falta consolidar).

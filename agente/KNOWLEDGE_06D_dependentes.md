# KNOWLEDGE_06D — Códigos Oficiais: Dependentes

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Tabelas — Tabela de Relação de Dependência" (p. 359) e ficha "Dependentes" (p. 47-49, ainda não extraída em detalhe). Corroborado pelo mapeamento dos formulários do PGD (doc Gemini, seção 2). Este arquivo SUBSTITUI a seção "Códigos de tipo de dependente" de `KNOWLEDGE_02_codigos_pgd.md`.

## Como o agente deve usar este arquivo

Use esta tabela como fonte ÚNICA pra escolher código de relação de dependência. **Não invente códigos.** Convenção: código sempre 2 dígitos (`"11"`, `"21"`, etc.).

O schema atual de `dependentes_atualizados` em `KNOWLEDGE_01_schema_completo.md` **não inclui campo de código** — significa que a IA não atualiza tipo de parentesco no `.DBK` (só nome/CPF/data nascimento). Isso é intencional: trocar tipo de parentesco é decisão sensível (vincula a regras de dedução diferentes), e o contador deve fazer manualmente no PGD se necessário. Use o campo `resumo` pra sinalizar quando achar que o tipo no template está errado, sem propor mudança automática.

Em `dependentes_novos_aviso`, **inclua o `codigo`** correto conforme esta tabela — esse é o tipo proposto pra cadastro novo (o contador valida e cadastra manualmente no PGD).

---

## ⚠️ CORREÇÕES IMPORTANTES (tabela inteira estava errada no projeto anterior)

A versão antiga no `KNOWLEDGE_02_codigos_pgd.md` usava um esquema de códigos **completamente diferente** do oficial — provavelmente inferido de uma versão antiga do PGD ou inventado. Coincidências enganosas:

| Código | Que o projeto dizia (errado) | Que o manual diz (correto) |
|---|---|---|
| **01** | "Companheiro(a) com filho ou união estável >5 anos" | **NÃO EXISTE** (companheiro é 11) |
| **03** | "Filho(a)/enteado(a) até 21 anos" | **NÃO EXISTE** (filho até 21 é 21) |
| **04** | "Filho(a)/enteado(a) universitário até 24" | **NÃO EXISTE** (filho universitário é 22) |
| **05** | "Filho(a)/enteado(a) inválido(a)" | **NÃO EXISTE** (filho com deficiência é 23) |
| **11** | "Pai / mãe" | **Companheiro(a) ou cônjuge** ← diferente! |
| **14** | "Avó / avô / bisavô / bisavó" | **NÃO EXISTE** (pais/avós são 31) |
| **21** | "Irmão / irmã" | **Filho(a) ou enteado(a) até 21 anos** ← diferente! |
| **22** | "Irmão / irmã universitário(a) até 24" | **Filho(a) ou enteado(a) universitário até 24** ← diferente! |
| **26** | "Outros (com guarda judicial)" | **Irmão/neto/bisneto com deficiência (sem arrimo, guarda judicial)** ← diferente! |

**Impacto operacional**: o `.DBK` real do cliente armazena códigos OFICIAIS (vêm do PGD). Quando o app lia código `21` e a IA recebia "parentesco=21" no prompt, ela interpretava como "irmão" via tabela errada do `KNOWLEDGE_02`, mas o cliente real é um **filho até 21 anos**. Conclusões da IA sobre o dependente ficavam erradas (idade aceitável, dedução, vínculo com pagamentos de instrução, etc.).

**Ação:** seção do `KNOWLEDGE_02` removida, referência em `KNOWLEDGE_01_schema_completo.md` redirecionada pra este arquivo.

---

## TABELA OFICIAL (Manual IRPF 2026 p. 359)

| Cód | Relação de dependência | Idade limite | Renda limite |
|---|---|---|---|
| **11** | Companheiro(a) com o qual o contribuinte tenha filho ou viva há mais de 5 anos, **OU** cônjuge | — | — |
| **21** | Filho(a) ou enteado(a) | **até 21 anos** | — |
| **22** | Filho(a) ou enteado(a) cursando estabelecimento de ensino superior ou escola técnica de 2º grau | **até 24 anos** | — |
| **23** | Filho(a) ou enteado(a) com deficiência | qualquer idade (STF ADI 5583/DF) | remuneração ≤ deduções autorizadas por lei (ver nota STF abaixo) |
| **24** | Irmão(ã), neto(a) ou bisneto(a) sem arrimo dos pais, do qual o contribuinte detém a guarda judicial | **até 21 anos** | — |
| **25** | Irmão(ã), neto(a) ou bisneto(a) sem arrimo dos pais, cursando ensino superior ou técnico | **até 24 anos** | (contribuinte teve guarda judicial até os 21 anos do dependente) |
| **26** | Irmão(ã), neto(a) ou bisneto(a) com deficiência, sem arrimo dos pais, com guarda judicial | qualquer idade (STF ADI 5583/DF) | remuneração ≤ deduções autorizadas por lei |
| **31** | Pais, avós e bisavós | — | **renda total 2025 ≤ R$ 28.467,20** (tributáveis e não tributáveis somados) |
| **41** | Menor pobre que o contribuinte crie e eduque, com guarda judicial | **até 21 anos** | — |
| **51** | Pessoa absolutamente incapaz, da qual o contribuinte seja tutor ou curador | — | — |

### Nota STF ADI 5583/DF (códigos 23 e 26)

> "Na apuração do imposto sobre a renda de pessoa física, a pessoa com deficiência que supere o limite etário e seja capacitada para o trabalho pode ser considerada como dependente quando a sua remuneração não exceder as deduções autorizadas por lei."

Isso significa que filho/enteado com deficiência (código **23**) ou irmão/neto/bisneto com deficiência (código **26**) podem ser dependentes em **qualquer idade**, e podem ter renda própria, desde que a remuneração não ultrapasse as deduções autorizadas. Esse ajuste vem da decisão do STF.

---

## Decisões e regras práticas

### Filhos
- **Filho 0-21 anos** → **21** (sem condição)
- **Filho 22-24 anos cursando superior/técnico** → **22** (precisa estar matriculado)
- **Filho >24 sem deficiência** → não pode ser dependente (saiu da declaração)
- **Filho com deficiência (qualquer idade)** → **23** (com restrição de renda STF)

### Cônjuge / Companheiro(a)
- **Cônjuge legal (casamento civil)** → **11**
- **Companheiro(a) com filho em comum (qualquer tempo)** → **11**
- **Companheiro(a) em união estável >5 anos** → **11**
- **Namorado(a) que mora junto há menos de 5 anos sem filho em comum** → não pode ser dependente

### Pais / Avós
- **Pais, avós, bisavós com renda ≤ R$ 28.467,20 em 2025** → **31**
- Acima desse limite → não pode ser dependente (mesmo se mora com o contribuinte)
- O **limite de renda inclui tributáveis E não tributáveis** somados (aposentadoria do INSS + pensão alimentícia recebida + isentos, etc.). Verificar TODOS os rendimentos.

### Irmãos, netos, bisnetos
- **Pré-requisitos sempre**: sem arrimo dos pais + contribuinte com guarda judicial
- **Irmão/neto/bisneto 0-21 anos** → **24**
- **Cursando superior/técnico até 24 anos** (e contribuinte teve guarda até os 21) → **25**
- **Com deficiência (qualquer idade, restrição renda)** → **26**

### Outros casos
- **Menor pobre que o contribuinte cria, com guarda judicial, até 21 anos** → **41**
- **Tutelado/curatelado absolutamente incapaz (qualquer idade)** → **51**

### Limite de idade — cálculo
A regra do PGD é **idade completa em 31/dez do ano-calendário**. O `App.jsx` já tem `calcularIdade(data, anoCal)` que faz essa conta. Use-o sempre.

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **`parentesco_cod` deve estar na whitelist oficial.** Valores válidos: `["11","21","22","23","24","25","26","31","41","51"]`. Qualquer outro código no reg 25 do `.DBK` do cliente é provavelmente erro de declaração anterior (preenchimento manual em outro programa, .DBK corrompido, etc.) — alertar no Inspetor de .DBK.

2. **Idade × código** (refina o alerta atual de `App.jsx` linha 4639-4642):
   - **21**: idade > 21 → ERRO ("filho deveria estar em 22 (universitário) ou 23 (com deficiência), ou removido da declaração")
   - **22**: idade > 24 → ERRO ("excedeu limite de 24 anos pra filho universitário")
   - **22**: idade ≤ 21 → AVISO ("é mais comum manter no código 21 até completar 22 anos")
   - **24**: idade > 21 → ERRO ("irmão deveria estar em 25 (universitário) ou 26 (com deficiência)")
   - **25**: idade > 24 → ERRO ("excedeu limite de 24 anos pra irmão universitário")
   - **31**: idade < 40 → AVISO ("código 31 é pra pais/avós/bisavós — improvável ter <40 anos")
   - **41**: idade > 21 → ERRO ("menor pobre com mais de 21 anos não se enquadra")
   - **23**, **26**, **11**, **51**: sem validação por idade

3. **Renda dos pais/avós (código 31)**: se o template tem dependente código 31, o app deveria pedir ao contador confirmação da renda anual do dependente (não está nos informes do declarante, é dado externo).

4. **Doença/deficiência (códigos 23 e 26)**: a ficha Identificação tem checkbox "declarante ou dependente com doença grave ou deficiência". Se houver dependente código 23 ou 26, o checkbox deve estar marcado. Cruzar validação.

---

## Pendências relacionadas (a tratar em rodadas futuras)

**Reg 25 do `.DBK` — campos não lidos pelo `App.jsx`**

O `lerTemplateInfo` (linhas 338-346) hoje só lê: número, parentesco_cod, nome, data_nascimento, cpf. O formulário Dependentes do PGD (revelado pelo doc Gemini) também tem:

- **Raça/Cor** (Dropdown — obrigatório no PGD desde alguma versão)
- **E-mail** (texto)
- **DDD + Celular** (numérico)
- **"Dependente mora com o titular?"** (Checkbox — afeta regras de cálculo em alguns casos)

Esses campos provavelmente estão presentes no reg 25 em posições além do byte 99 (que é onde o leitor atual para). **Engenharia reversa do `.DBK` necessária** pra mapear posições e larguras. Sem isso:
- App não exibe esses dados pro contador revisar
- Patches de IA não conseguem propor atualização nesses campos
- Diff entre `.DBK` original e modificado pode parecer "perdido" pro contador

**Ação proposta** pra rodada futura: usar Inspetor de .DBK no `App.jsx` (já existe) pra dumpar reg 25 de cliente real com email/celular/raça preenchidos no PGD e identificar offsets.

**Ficha "Identificação do Contribuinte" — também tem campos não lidos**

O doc Gemini revela que a ficha Identificação tem:
- Raça/Cor (Dropdown)
- Tipo de declaração: Original vs Retificadora (Radio)
- Nº recibo retificadora (texto, quando aplicável)
- Doença grave/deficiência (Checkbox)
- Ocupação principal (Dropdown 2 níveis: natureza + ocupação)
- Telefone fixo + Celular separados (com DDD/DDI)

O reg 16 atual lê apenas: cpf, nome, email, titulo_eleitor, data_nascimento, telefone (único). Faltam vários campos. Mesma pendência — engenharia reversa do reg 16 necessária pra cobrir os campos extras.

---

## Próximos KNOWLEDGE_06 planejados

- **06E** — Códigos de Doações Efetuadas (Manual p. 364 + ficha p. 156-174)
- **06F** — Tabelas auxiliares (progressiva anual/mensal, cotação dólar 2025, atualização custo bens 1938-1995)
- **06G** — Códigos de Rendimentos Isentos (reg 86 e 84 — Manual p. 75-113 a extrair)
- **06H** — Códigos de Rendimentos Sujeitos à Tributação Exclusiva (reg 88 — Manual p. 114-120 a extrair)

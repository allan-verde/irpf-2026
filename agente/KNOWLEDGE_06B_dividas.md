# KNOWLEDGE_06B — Códigos Oficiais: Dívidas e Ônus Reais

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Dívidas e Ônus Reais" (p. 236-237).

## ⚠️ Pendência conhecida

**A TABELA COMPLETA de códigos de dívidas NÃO consta nesta seção do manual.** Apenas o código **16 - Outras Dívidas e ônus reais** está mencionado textualmente.

A tabela com todos os códigos (provavelmente 11 a 19) deve estar:
- Na seção "Tabelas" do manual (p. 354-364), AINDA NÃO EXTRAÍDA
- Ou em algum apêndice específico

**O que sabemos de fontes externas / .DBKs em produção:**
- **Código 12** — confirmado em produção (Empréstimo bancário/PF/PJ). Visto em informes de Nubank, contratos CDC, etc.
- **Código 16** — confirmado pelo manual (Outras Dívidas e ônus reais)
- Outros códigos: provavelmente 11, 13, 14, 15, 17, 18, 19 — **A CONFIRMAR** quando a tabela for extraída

**Ação:** próxima rodada deve incluir a seção "Tabelas" (p. 354-364) do manual, ou alguma página específica com a lista de códigos de dívida.

---

## Campos obrigatórios

Cada dívida no JSON `dividas_atualizadas`/`dividas_novas_aviso` deve ter:

| Campo | Descrição |
|---|---|
| `codigo` | 2 dígitos (ex: "12", "16") — **escolher da tabela quando disponível** |
| `discriminacao` | **Natureza da dívida + nome do credor + CPF/CNPJ do credor** (obrigatório) |
| `valor_anterior` | Saldo em 31/12/2024 (R$) |
| `valor_atual` | Saldo em 31/12/2025 (R$) |
| `valor_pago` | **Valor total pago em 2025 (R$)** (campo do PGD, pode ser zero) |

**Atenção:** o PGD tem um campo `Valor Pago em 2025 (R$)` SEPARADO do saldo. Não é redundante — é o total amortizado no ano, independente do que sobra de saldo.

---

## Quando NÃO declarar (dispensa de inclusão)

A ficha Dívidas e Ônus Reais **não** deve conter:

| Tipo | Razão |
|---|---|
| Dívidas **≤ R$ 5.000,00** em 31/12/2025 | Dispensa por valor |
| Financiamentos do **SFH** (Sistema Financeiro da Habitação) | Bem dado em garantia |
| Outros financiamentos com **bem em garantia** (alienação fiduciária, hipoteca, penhor) | Idem |
| **Bens adquiridos por consórcio** | Tratado na ficha Bens |
| Dívidas de **atividade rural** | Vão no Demonstrativo da Atividade Rural |

**Implicação pro agente IA:** ao analisar informes de financiamento de veículo, casa própria com alienação fiduciária, ou consórcio, **NÃO criar entrada em `dividas_novas_aviso`**. Esses casos têm o bem informado em Bens (com a indicação de financiamento) e a dívida fica implícita.

**Implicação pro Estúdio:** auto-detectar e suprimir dívidas se a discriminação mencionar "SFH", "alienação fiduciária", "hipoteca", "penhor" — não como erro, mas como warning ao contador.

---

## Casos especiais

### Trust e Entidade Controlada com Regime de Transparência Fiscal

Quando o contribuinte/dependente OPTOU pelo **Regime de Transparência Fiscal de Entidade Controlada** (art. 8º Lei 14.754/2023), as obrigações da entidade ou trust devem ser declaradas como dívidas do contribuinte:

- **Código:** `16` (Outras Dívidas e ônus reais)
- **Valor:** **zero** em ambos os campos (Sit. 31/12/2024 e 31/12/2025)
- **Discriminação:** informar o exercício da opção pelo Regime de Transparência Fiscal + dados da entidade controlada/trust

### Cônjuge / Dependente

- **Declaração conjunta:** incluir dívidas do cônjuge + companheiro + dependentes
- **Bens comuns lançados em sua declaração:** também incluir dívidas do cônjuge (segue o mesmo critério dos bens)
- **Dependente com rendimentos incluídos:** declarar dívidas dele também
- **Ao excluir um dependente:** excluir TAMBÉM as dívidas correspondentes a ele

### Aquisição/Readquisição de residência no Brasil em 2025

Pessoa física que não era residente em 2024 e virou residente em 2025:
- Declarar dívidas existentes **na data da caracterização da condição de residente**
- Esse valor vai no campo **Situação em 31/12/2024** (mesmo que tecnicamente seja outra data)
- Sit. 31/12/2025 = saldo atualizado em 31/12/2025

### Declaração Final de Espólio

- Período compreendido: 1º/jan até a data da partilha/sobrepartilha/adjudicação ou escritura pública
- Se ainda há bens a inventariar e geram rendimentos: declarar rendimentos de todo o ano-calendário

### Declaração de Saída Definitiva do País

- Período: 1º/jan até o dia anterior ao da caracterização da condição de não residente

---

## Resumo pro Estúdio

### Validações automáticas a aplicar
1. **Limite R$ 5.000:** se valor atual ≤ 5.000, alertar (provavelmente não deve ser declarado)
2. **Padrões de discriminação a flag:** "SFH", "alienação fiduciária", "hipoteca", "penhor", "consórcio" → warning de provável duplicidade com ficha Bens
3. **`valor_pago` sempre presente:** mesmo que zero — campo separado e obrigatório no PGD

### Campos do reg 28 no .DBK (já mapeados)
Conforme `KNOWLEDGE_02_registros_ja_mapeados.md` (do Mapeador):

| Pos início | Pos fim | Largura | Campo |
|---|---|---|---|
| 0 | 2 | 2 | tipo `28` |
| 2 | 13 | 11 | CPF declarante |
| 13 | 15 | 2 | **código da dívida** |
| 15 | 527 | 512 | discriminação |
| 527 | 540 | 13 | valor anterior × 100 |
| 540 | 553 | 13 | valor atual × 100 |
| 553 | 566 | 13 | valor pago no ano × 100 |
| 566 | 576 | 10 | CRC |

(Confirmação experimental em produção pelo Estúdio.)

---

## Pendências pra próximas rodadas

- **TABELA COMPLETA DE CÓDIGOS** (11-19 ou similar) — solicitar página específica do manual
- **KNOWLEDGE_06C:** Tabelas Gerais (UF, países, raça/cor, tipo logradouro)
- Refinar: confirmar se "Valor Pago em 2025" precisa estar sempre preenchido (mesmo se zero) no `.DBK`, ou se o PGD aceita vazio

# KNOWLEDGE_06H — Códigos Oficiais: Rendimentos Sujeitos à Tributação Exclusiva/Definitiva

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Rendimentos Sujeitos à Tributação Exclusiva/Definitiva" (p. 114-120). Registro `.DBK`: **reg 88**. Corroborado pelo doc Gemini seção 7. Este arquivo SUBSTITUI a seção "Códigos de rendimentos sujeitos à tributação exclusiva/definitiva (reg 88)" de `KNOWLEDGE_02_codigos_pgd.md`.

## Como o agente deve usar este arquivo

Use esta tabela como fonte ÚNICA pra classificar rendimentos tributados exclusivamente na fonte (IR já foi retido, não compõe o ajuste anual). **Não invente códigos.**

Convenção: `codigo` sempre 2 dígitos string (`"01"`, `"06"`, `"99"`).

---

## ⚠️ CORREÇÕES IMPORTANTES (códigos que estavam errados no projeto anterior)

A versão antiga em `KNOWLEDGE_02_codigos_pgd.md` e no prompt do `App.jsx` (regra 15) tinha vários códigos trocados ou inventados. Resumo:

| Código | Que o projeto dizia (errado) | Que o manual diz (correto) |
|---|---|---|
| **06** | Rendimentos de aplicações financeiras ✓ | **Rendimentos de aplicações financeiras** (único acerto) |
| **10** | "13º salário" ❌ | **Juros sobre capital próprio (JCP)** ← inverteu com 18! |
| **12** | "Ganhos de capital" ❌ | **Aplicações Financeiras e Lucros/Dividendos no Exterior (Lei 14.754/2023)** ← totalmente outro tema |
| **18** | "JCP" ❌ | **NÃO EXISTE como código de exclusivo** (JCP é 10, não 18) |
| **24** | "Outros" ❌ | **NÃO EXISTE** (Outros é **99**) |

E códigos FALTANDO no projeto anterior:
- **01** 13º salário (real)
- **02** Ganhos de capital em alienação (real, não 12)
- **03** Ganhos de capital — moeda estrangeira
- **04** Ganhos de capital — moeda em espécie
- **05** Ganhos líquidos em renda variável
- **07** RRA (Rendimentos Recebidos Acumuladamente)
- **08** 13º salário recebido pelos dependentes
- **09** RRA pelos dependentes
- **11** Participação nos lucros ou resultados (PLR)
- **13** Prêmios em loterias de quota fixa (Lei 14.790/2023)
- **99** Outros

**Impacto operacional**: quando o `.DBK` do cliente continha código 10 (JCP real), o agente lia como "13º salário" e fazia análises erradas. Quando lia 12 (Exterior real), tratava como "Ganho de capital". Códigos 02/05/11/13 nunca apareciam como opção pra IA propor — eram silenciosamente classificados como 24 ou ignorados.

---

## TABELA OFICIAL DE CÓDIGOS (Manual IRPF 2026 p. 114-120)

| Cód | Descrição | Origem do valor | Entrada |
|---|---|---|---|
| **01** | 13º salário | transportado do PJ Titular | auto |
| **02** | Ganhos de capital na alienação de bens/direitos | transportado do GCAP 2025 | auto |
| **03** | Ganhos de capital na alienação de bens/direitos/aplicações em moeda estrangeira | transportado do GCAP 2025 | auto |
| **04** | Ganhos de capital na alienação de moeda estrangeira em espécie | transportado do GCAP 2025 | auto |
| **05** | Ganhos líquidos em renda variável (bolsa, fundos imob., Fiagro) | transportado dos Demonstrativos de Renda Variável + FII/Fiagro | auto |
| **06** | **Rendimentos de aplicações financeiras** (CDB, RDB, fundos comuns, FIF, swap) | informe da instituição | **manual** |
| **07** | RRA tributação exclusiva | transportado da ficha RRA Titular | auto |
| **08** | 13º salário recebido pelos dependentes | transportado do PJ Dependentes | auto |
| **09** | RRA pelos dependentes | transportado da ficha RRA Dependentes | auto |
| **10** | **Juros sobre capital próprio (JCP)** | informe da empresa | **manual** |
| **11** | **Participação nos lucros ou resultados (PLR)** | informe da empresa | **manual** |
| **12** | Aplicações Financeiras e Lucros/Dividendos no Exterior (Lei 14.754/2023) | transportado da ficha Bens e Direitos (campos específicos) | auto |
| **13** | **Prêmios líquidos em loterias de apostas de quota fixa** (Lei 14.790/2023) | comprovante do agente operador | **manual** |
| **99** | **Outros** (catch-all) | informe diverso | **manual** |

---

## Códigos de entrada manual vs transportados

### Entrada manual (agente classifica aqui)
- **06** — aplicações financeiras (CDB/RDB/fundos comuns/swap) → mais frequente
- **10** — JCP recebido como acionista
- **11** — PLR recebida da empresa
- **13** — prêmios em apostas de quota fixa (cassinos digitais regulamentados pela Lei 14.790/2023)
- **99** — outros não enquadrados (prêmios em geral, capitalização, VGBL em regime exclusivo, etc.)

### Transportados pelo programa (não classificar diretamente — agente menciona em `observacoes`)
- **01, 08** — 13º salário do titular/dependente → vem da ficha PJ Titular/Dependentes
- **02, 03, 04** — ganhos de capital → vem do GCAP 2025 (programa separado)
- **05** — renda variável → vem do Demonstrativo de Renda Variável + FII/Fiagro
- **07, 09** — RRA exclusiva → vem da ficha "Rendimentos Recebidos Acumuladamente"
- **12** — Exterior 14.754 → vem da ficha Bens e Direitos (campo específico)

Pra esses, o agente **não deve emitir** `rendimentos_exclusivos_novos_aviso` nem `rendimentos_exclusivos_atualizados`. Quando identificar evidência (ex: cliente operou em bolsa, recebeu RRA, etc.), mencionar em `observacoes` pra contador lançar nas fichas adequadas.

---

## Decisões por tipo de informe

### Informe de banco / corretora (Aplicação financeira)
- **CDB pré-fixado, RDB, Tesouro Direto, fundos de renda fixa, fundos multimercado, fundos cambiais** → **06**
- **LCI / LCA / CRI / CRA / LIG / Debêntures de Infraestrutura** → NÃO é exclusivo, é **isento código 12** (ver KNOWLEDGE_06G)
- **Poupança** → isento código 12 (ver KNOWLEDGE_06G), não exclusivo
- **Saldo da aplicação** vai pra Bens (Grupo 04 Cód 02). **Rendimento** vai aqui em **06**.

### Informe de empresa (sócio/acionista)
- **JCP** (Juros sobre Capital Próprio) → **10** (informativo separado no comprovante de rendimentos)
- **PLR** (Participação nos Lucros) → **11** (geralmente em rendimento separado da folha)
- **Dividendos / Lucros distribuídos** → NÃO é exclusivo. Vai pra **isento código 09** (ver KNOWLEDGE_06G)
- **Bonificação em ações** → NÃO é exclusivo. Vai pra **isento código 18** (ver KNOWLEDGE_06G)

### Apostas / loterias
- **Prêmios em apostas de quota fixa** (cassinos digitais regulamentados pela Lei 14.790/2023, ex: Sportingbet, Betano, etc., quando autorizados) → **13**
- **Prêmios em loterias tradicionais** (Mega-Sena, Lotofácil, etc.), bingos, concursos, corridas → **99**

### Outros casos comuns → código 99
- **Benefícios líquidos resultantes de amortização antecipada de títulos de capitalização** (PIC, Tele-Sena, etc.)
- **Sorteios de capitalização** com prêmio em dinheiro
- **VGBL em regime exclusivo** (resgate, benefícios) quando o contribuinte optou pelo regime exclusivo da Lei 11.053/2004
- **Pendências de previdência complementar** em regime exclusivo
- **Outros rendimentos tributados exclusivamente na fonte** não tipados

---

## Casos especiais

### Código 06 vs Isento Código 12

Confusão comum: poupança e LCI/LCA APARECEM no mesmo informe de banco junto com CDB/RDB. Distinção:

| Aplicação | Onde vai |
|---|---|
| CDB pré, RDB, Tesouro Direto, fundos renda fixa | **Exclusivo 06** |
| LCI, LCA, CRI, CRA, LIG, Debêntures de Infraestrutura, poupança | **Isento 12** (não vai em exclusivo) |
| Letras hipotecárias | **Isento 12** |
| FII, Fiagro | rendimento mensal → **Isento 99** (vínculo bem); ganho de capital → **Exclusivo 05** |

### Código 10 (JCP) vs Isento 09 (Lucros/Dividendos)

**MESMA empresa pode pagar os dois no mesmo ano** — vêm separados no informe.

- **JCP** = remuneração pelo capital investido, tributada 15% na fonte → exclusivo **10**
- **Lucros/Dividendos** = parte do lucro líquido distribuída, isenta → isento **09** (ver 06G)

Olhar o informe da empresa: cada linha tem natureza distinta. NÃO juntar.

### Código 13 (Lei 14.790/2023 — apostas de quota fixa)

**Recente — Lei 14.790/2023** regulamentou as apostas online (sportsbooks autorizados pela ANJ/Mefin). Tributação 15% na fonte sobre **prêmio LÍQUIDO** (prêmio menos valor apostado).

**Sinal de identificação**:
- Operador autorizado (lista oficial Mefin)
- "Conta gráfica" do apostador (saldos descritos)
- Informe específico do operador com CNPJ válido

**NÃO confundir**: 
- Apostas em sites NÃO-autorizados → **99** (catch-all) com observação sobre risco legal
- Loterias tradicionais (Caixa) → **99**
- Cassinos físicos no exterior → **99** + observações sobre RRA/ganhos no exterior

### Código 12 (Lei 14.754/2023 — Exterior)

**Importante**: o agente NÃO classifica diretamente em `rendimentos_exclusivos_novos_aviso` com codigo=12. Os rendimentos de aplicações no exterior, lucros e dividendos de entidades controladas no exterior (Lei 14.754/2023) são lançados na **ficha Bens e Direitos** em campos específicos, e o PGD transporta automaticamente pra cá.

Quando o agente vê informe de aplicação no exterior:
- Lançar o bem em `bens_novos_aviso` ou `bens_atualizados` (Grupo 04 Cód 99 ou Grupo 03 Cód 01/02 conforme tipo — ver KNOWLEDGE_06A)
- Mencionar em `observacoes` que o **rendimento da aplicação** (informado no extrato) precisa ser lançado nos campos específicos da ficha Bens (Lei 14.754) — o contador faz manualmente no PGD pq não há slot no schema atual

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **`codigo` deve estar na whitelist**: `["01","02","03","04","05","06","07","08","09","10","11","12","13","99"]`. Recusar qualquer outro número.

2. **Códigos transportados (01/02/03/04/05/07/08/09/12) em `rendimentos_exclusivos_novos_aviso`**: alertar — esses códigos não são entrada manual no `.DBK`. Provável erro do agente. Reclassificar pra 99 ou rejeitar.

3. **Código 10 (JCP) sem CNPJ válido**: alertar — JCP exige fonte pagadora pessoa jurídica identificada.

4. **Código 11 (PLR) sem vínculo com fonte pagadora reg 21**: alertar — PLR é paga pela empregadora; deveria haver fonte pagadora correspondente.

5. **Código 13 (apostas Lei 14.790)** com CNPJ de operador não-autorizado: alertar pro contador validar.

---

## Pendências relacionadas

| Pendência | Status |
|---|---|
| Schema atual de `rendimentos_exclusivos_atualizados` e `_novos_aviso` JÁ tem campo `codigo` | ✅ não precisa mudar |
| Reg 88 (exclusivos) é editável normalmente (sem o problema de CRC do reg 84) | ✅ funciona |
| Validações de combinação `codigo × CNPJ` no `App.jsx` | a implementar como alertas |
| Lei 14.754/2023 (código 12) — workflow específico via ficha Bens não automatizado | só via `observacoes` por enquanto |
| RRA (códigos 07, 09) — ficha própria do PGD (p. 125-134) ainda não extraída | rodada futura |

---

## Próximos KNOWLEDGE_06 planejados

- **06I** — Fontes pagadoras PJ (reg 21 — Manual p. 51-54). Pendente.
- **06J** — Carnê-Leão (reg 22 e 49 — Manual p. 55-74). Pendente.
- **06K** — Rendimentos Recebidos Acumuladamente (RRA — Manual p. 125-134). Pendente — vincula com códigos 07 e 09 deste arquivo.

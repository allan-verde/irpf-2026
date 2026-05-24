# KNOWLEDGE_06I — Fontes Pagadoras PJ (Rendimentos Tributáveis Recebidos de Pessoa Jurídica)

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Rendimentos Tributáveis Recebidos de Pessoa Jurídica" — abas Titular (p. 51-52) e Dependentes (p. 53-54). Registro `.DBK`: **reg 21**. Corroborado pelo doc Gemini seção 4.

## Estado da plataforma

**A plataforma trata essa ficha completamente.** Não há gaps conhecidos:
- Parser de reg 21 lê: CPF/CNPJ, nome, rendimentos, contribuição previdenciária oficial, IRRF, 13º salário, IRRF sobre 13º
- `modificarReg21` e `criarReg21` implementados — recálculo de CRC OK
- Schema do patch tem `fontes_pagadoras` (update) e `fontes_novas` (insert)
- Regra 2 do `INSTRUCOES_PROJETO.md` documenta o tratamento (com correção feita nesta rodada — ver abaixo)

Esta documentação serve principalmente pra:
1. Ajudar o agente a **classificar corretamente** o que vai pra reg 21 vs Carnê-Leão (reg 22/49) vs outras fichas
2. Explicar o caso especial de **PF com vínculo empregatício** (que VAI pra reg 21 apesar do CPF)
3. Listar o que **NÃO entra** nessa ficha (pra evitar duplicação)

---

## Como o agente deve usar este arquivo

Use ao classificar **informes de rendimento de pessoa jurídica** (DIRF — comprovante de rendimentos pagos e IR retido). Cada CNPJ pagador vira uma linha em `fontes_pagadoras` (se já existir no template) ou `fontes_novas` (se não existir).

---

## Estrutura da ficha (manual p. 51-54)

A ficha tem **2 abas** com estrutura idêntica:

### Aba Titular
Cada linha é uma fonte pagadora. Campos:

| Campo | Descrição |
|---|---|
| **CPF/CNPJ da fonte pagadora** | 14 dígitos (CNPJ) na grande maioria dos casos; 11 dígitos (CPF) **somente** se for empregado de PF |
| **Nome da fonte pagadora** | |
| **Rendimentos recebidos de PJ** | Total anual do salário/pró-labore/pensão/aposentadoria/etc. tributável |
| **Contribuição previdenciária oficial** | INSS retido |
| **Imposto retido na fonte (IRRF)** | IR retido durante o ano |
| **13º salário** | Líquido recebido (após dedução) |
| **IRRF sobre o 13º salário** | IR retido especificamente sobre o 13º |

### Aba Dependentes
Mesma estrutura, mas pra cada lançamento o agente seleciona qual dependente recebeu o rendimento (o dependente precisa estar previamente cadastrado na ficha Dependentes — ver 06D).

---

## O QUE entra (decisões)

### Casos comuns (CNPJ — 14 dígitos)
- **Salário** de empregador PJ (CLT, estatutário federal/estadual/municipal)
- **Pró-labore** de sócio administrador
- **Pensão por morte** paga pelo INSS ou previdência complementar (não-PGBL/VGBL — quando não é benefício de risco)
- **Aposentadoria** paga pelo INSS / previdência complementar
- **Pensão alimentícia paga por PJ** (raro — quando a empresa retém da folha do alimentante e repassa)
- **Pecúlio (seguro) de previdência privada por morte/invalidez** — quando prestação ÚNICA — vai aqui (manual p. 51)
- **Honorários de autônomo prestando serviço EXCLUSIVAMENTE pra PJ** — vai aqui se o autônomo escriturou livro caixa (ver atenção abaixo)

### Caso especial: PF com vínculo empregatício (CPF — 11 dígitos)
**⚠️ Importante**: rendimentos tributáveis recebidos de **pessoa física COM VÍNCULO EMPREGATÍCIO** (CLT registrado de PF) vão **NESSA FICHA**, com o CPF do empregador no campo "CPF/CNPJ da fonte pagadora". Caso típico:

- **Empregada doméstica** com carteira assinada, recebendo salário do patrão PF
- **Caseiro** com vínculo empregatício
- **Babá** registrada por PF
- **Motorista particular** com vínculo

**Não confundir com Carnê-Leão**: a distinção é o **vínculo empregatício**. Empregado de PF (relação CLT entre 2 pessoas físicas) → ficha PJ Titular. Autônomo prestando serviço a PF (sem vínculo) → Carnê-Leão.

### Atenção — autônomo que prestou serviços EXCLUSIVAMENTE a PJ
O manual explicita (p. 52): se um autônomo prestou serviço **exclusivamente** a PJ E **escriturou livro caixa**, a despesa do livro caixa vai pra coluna Livro Caixa da ficha "Rendimentos Tributáveis Recebidos de Pessoa Física e do Exterior" (Carnê-Leão Aba 2), MESMO sem ter recebido rendimentos de PF. Isso é exceção pra permitir dedução de despesas profissionais legítimas via livro caixa.

Operacional: agente classifica rendimentos da PJ normalmente em `fontes_pagadoras`/`fontes_novas`. Despesas de livro caixa (se mencionadas nos informes) — flag em `observacoes` pro contador colocar manualmente na coluna Livro Caixa do Carnê-Leão (não há slot no patch atual).

---

## O QUE NÃO entra

Os seguintes itens NÃO vão na ficha PJ Titular/Dependentes:

| Item | Onde vai |
|---|---|
| Rendimentos da atividade rural | Demonstrativo da Atividade Rural (não tratado pelo projeto — flag em `observacoes`) |
| Ganho de capital em alienação de bens/direitos | GCAP 2025 (programa separado) → totalizador em **Exclusivo 02** |
| Ganhos líquidos em bolsa, FII, Fiagro | Demonstrativo Renda Variável → totalizador em **Exclusivo 05** |
| Aplicações financeiras no exterior (Lei 14.754/2023) | Ficha **Bens e Direitos** (campos específicos) → totalizador em **Exclusivo 12** |
| Lucros/dividendos de entidades controladas no exterior | Ficha **Bens e Direitos** → totalizador em **Exclusivo 12** |
| Lucros e dividendos de PJ brasileira | **Isento 09** (ver 06G) — NÃO é tributável |
| JCP | **Exclusivo 10** (ver 06H) |
| PLR | **Exclusivo 11** (ver 06H) |
| 13º salário (parcela tributável anual) | **Transportado automaticamente** desta ficha pra **Exclusivo 01** — agente NÃO duplica em Exclusivos |
| Honorários de autônomo recebidos de PF (sem vínculo) | **Carnê-Leão** (ver 06J) |
| RRA — rendimentos recebidos acumuladamente | **Ficha RRA** (não automatizada — flag em `observacoes`, ver 06K) |
| Aluguel recebido de PJ | **Aluguéis** geralmente vai em Carnê-Leão Aba 2 col Aluguéis. Mas se foi recebido com IRRF (contrato de locação onde PJ retém IR), o líquido também pode aparecer aqui — verificar comprovante. Caso ambíguo: flagar em `observacoes`. |

---

## Auto-transports da ficha

O PGD automaticamente transporta valores desta ficha pra outros lugares — agente **NÃO precisa duplicar**:

- **Rendimentos tributáveis** → Resumo da Declaração (base de cálculo do ajuste anual)
- **IRRF** → Resumo + Ficha Imposto Pago/Retido (item 04 Titular ou 05 Dependentes)
- **Contribuição previdenciária oficial** → somada com contribuição previdenciária da ficha Carnê-Leão → vai pro Resumo
- **13º salário** → Ficha **Rendimentos Sujeitos à Tributação Exclusiva** código **01** (titular) ou **08** (dependentes)
- **IRRF sobre 13º** → Ficha **Imposto Pago/Retido**

---

## Importação de comprovante (.DEC/XML)

O PGD permite importar o **Comprovante de Rendimentos Pagos e IRRF** em formato eletrônico (.DEC ou XML) que algumas fontes pagadoras enviam. Quando o cliente fornece esse arquivo:

- O contador pode importar direto via menu "Importações" → "Informe de Rendimentos" do PGD
- O Estúdio IRPF **não automatiza** essa importação (faz parse de PDF/imagem como sempre)
- Se o agente vê referência a esse arquivo (`.DEC` ou `.XML`) entre os anexos, **mencione em `observacoes`** sugerindo importação direta pra reduzir erro

---

## Decisões comuns por tipo de informe

### Informe DIRF de empresa empregadora (CLT)
- CNPJ pagador → `fontes_pagadoras` (se existe) ou `fontes_novas`
- Salário tributável anual → `rendimentos`
- 13º líquido → `decimo_terceiro` (separado do salário)
- IRRF anual → `imposto_retido`
- IRRF sobre 13º → `imposto_retido_decimo_terceiro`
- INSS retido → `contribuicao_previdenciaria`

### Aposentadoria INSS / previdência oficial
- CNPJ INSS (29.979.036/0001-40) → `fontes_pagadoras`/`fontes_novas`
- Aposentadoria tributável → `rendimentos`
- 13º → `decimo_terceiro`
- IRRF → `imposto_retido`
- Contribuição previdenciária do aposentado (se houver retenção) → `contribuicao_previdenciaria`

### Pensão por morte (INSS ou complementar)
- Mesmo tratamento da aposentadoria
- ⚠️ Se beneficiário tem **moléstia grave** (com laudo pericial oficial): vai pra **Isento 11** (06G), não aqui
- Se beneficiário tem **65+ anos**: a parcela isenta (R$ 1.903,98/mês + 13º) sai daqui e vai pra **Isento 10** (06G). Excedente fica aqui como tributável.

### Pró-labore (sócio administrador)
- Empresa do sócio → fonte pagadora
- Valor → `rendimentos`
- INSS retido → `contribuicao_previdenciaria`
- IRRF → `imposto_retido` (frequentemente zero, pois pequenas empresas retêm 0 quando pró-labore é baixo)

### Empregada doméstica com carteira assinada (empregador PF)
- **CPF do empregador** no campo CPF/CNPJ da fonte
- Salário tributável → `rendimentos`
- 13º → `decimo_terceiro`
- INSS retido pelo empregador doméstico → `contribuicao_previdenciaria`
- IRRF (raríssimo nessa faixa) → `imposto_retido`

> ⚠️ Esse é o ÚNICO caso comum em que **fonte pagadora tem 11 dígitos (CPF)** legitimamente. Não confundir com Carnê-Leão (que é pra autônomo prestando serviço a PF sem vínculo empregatício).

### Cliente que mudou de emprego no ano
- Cada empregador gera UMA linha (UM CNPJ, UM nome)
- Valores são totais anuais por empregador
- O PGD agrega os totais no Resumo

---

## ⚠️ Correção retroativa da regra 2 do `INSTRUCOES_PROJETO`

**Antes**: a regra 2 dizia "Fontes pagadoras (reg 21) são **SEMPRE** pessoa jurídica com CNPJ válido". Isso está semi-incorreto pelo manual — empregador doméstico/caseiro/babá PF (com vínculo empregatício) também vai aqui com **CPF**.

**Corrigida nesta rodada**: a regra 2 agora reflete que CPF é aceito **apenas** no caso de PF com vínculo empregatício; PF sem vínculo (autônomo) continua indo pra Carnê-Leão.

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **CPF de 11 dígitos em `fontes_novas` ou `fontes_pagadoras`**: alertar amarelo "verifique se é empregador PF com vínculo empregatício (CLT) — caso contrário deve ir pra Carnê-Leão".
2. **CNPJ não válido sintaticamente** (não passa no algoritmo de validação): alertar.
3. **Duplicação por CNPJ raiz**: se o agente propõe `fontes_novas` com CNPJ cujo raiz já está em `fontes_pagadoras`, deveria atualizar a existente. (Regra 16 do INSTRUCOES já trata, mas validar no Estúdio reforça.)
4. **13º salário > rendimentos × 1/12 × 1,5**: alerta — 13º muito alto desproporcional ao salário pode ser erro de digitação ou inclusão de PLR/abono.

---

## Pendências relacionadas

| Pendência | Status |
|---|---|
| **Importação direta de `.DEC`/XML do comprovante** | Não implementada no Estúdio. O PGD aceita; agente flag em `observacoes` quando vê arquivo `.DEC` entre anexos. |
| **Validação de CNPJ sintática** | A implementar no Estúdio (algoritmo padrão) |
| **Cards de "Imposto Pago/Retido" no PDF report** | Já existem, mas validar consistência entre IRRF da ficha e IRRF transportado pro Resumo |

---

## Cobertura completa do Manual

Com este 06I, **todas as 12 fichas principais** da declaração estão documentadas:

| Cód 06X | Família | Manual |
|---|---|---|
| 06A | Bens e Direitos | p. 178-235 |
| 06B | Dívidas | p. 236-237 |
| 06C | Pagamentos Efetuados | p. 363 |
| 06D | Dependentes | p. 359 |
| 06E | Doações | p. 364 |
| 06F | Tabelas auxiliares | p. 354-358 |
| 06G | Rendimentos Isentos | p. 75-113 |
| 06H | Rendimentos Exclusivos | p. 114-120 |
| **06I** | **Fontes Pagadoras PJ** | **p. 51-54** |
| 06J | Carnê-Leão | p. 55-74 |
| 06K | RRA | p. 125-134 |

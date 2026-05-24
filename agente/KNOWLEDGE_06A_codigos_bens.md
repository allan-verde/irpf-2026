# KNOWLEDGE_06A — Códigos Oficiais: Bens e Direitos

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Bens e Direitos" (p. 178-235). Este arquivo SUBSTITUI inferências anteriores sobre grupos e códigos.

## Como o agente deve usar este arquivo

Use esta tabela como fonte ÚNICA pra escolher `grupo` e `codigo` ao gerar JSON em `bens_atualizados` / `bens_novos_aviso` / `bens_a_remover`. **Não invente códigos.** Se um bem não cabe em nenhum código listado, use o código `99` do grupo apropriado e detalhe na `discriminacao`.

Convenções:
- `grupo` sempre 2 dígitos (`"01"`, `"04"`, `"99"`)
- `codigo` sempre 2 dígitos (`"01"`, `"11"`, `"99"`)
- Limites em reais usam o valor de 31/12/2025 (ou data específica do bem)

---

## ⚠️ CORREÇÃO IMPORTANTE da Regra 20 (banco/agência/conta)

A versão anterior da regra 20 do `INSTRUCOES_PROJETO.md` tinha mapeamento errado pra **conta poupança**:

| Tipo | Mapeamento ANTERIOR (errado) | Mapeamento OFICIAL (correto) |
|---|---|---|
| **Conta corrente** | 06 / 01 ✓ | **06 / 01** |
| **Conta poupança** | 06 / 02 ❌ | **04 / 01** |
| Saldo em corretora | 06 / 99 ✓ | 06 / 99 |
| RDB/CDB tributado | 04 / 02 ✓ | 04 / 02 |
| LCI/LCA isento | 04 / 03 ✓ | 04 / 03 |

O Grupo 06 Cód 02 oficial é **"Conta gráfica mantida em agente operador de loterias de apostas de quota fixa - Lei 14.790/2023"** — coisa completamente diferente.

**Ação:** atualizar Regra 20 do `INSTRUCOES_PROJETO.md` na próxima rodada do agente.

---

## Limites de obrigatoriedade (quando declarar)

| Tipo do bem | Limite |
|---|---|
| Imóveis (qualquer valor) | **SEMPRE** |
| Veículos, embarcações, aeronaves (qualquer valor) | **SEMPRE** |
| Bens móveis demais (joias, antiguidades, arte, etc.) | Valor de aquisição unitário ≥ R$ 5.000,00 |
| Conta-corrente, poupança, aplicações financeiras (Brasil) | Saldo unitário **> R$ 140,00** em 31/12/2025 |
| Ações, quotas, ouro ativo financeiro (Brasil) | Valor de aquisição ≥ R$ 1.000,00 |
| Criptoativos (Brasil) | Conjunto da mesma espécie ≥ R$ 5.000,00 |
| **TODOS no exterior** (aplicações, ações, cripto, etc.) | **Independente de valor** |

**Dispensa explícita de declarar:**
- Saldos em conta < R$ 140 em 31/12/2025
- Móveis (exceto veículos/embarcações/aeronaves) < R$ 5.000
- Conjunto de ações/ouro < R$ 1.000

---

## TABELA OFICIAL DE CÓDIGOS POR GRUPO

### Grupo 01 — Bens Imóveis
**Obrigatório:** SEMPRE (qualquer valor).
**Campos extras obrigatórios:** endereço completo (logradouro, número, complemento, bairro, UF, município, CEP) + área total + unidade (m² ou ha) + matrícula + cartório (se registrado).

| Cód | Nome | Discriminação inclui | Campo de inscrição | Tipo de área |
|---|---|---|---|---|
| 01 | Prédio residencial | Data e forma de aquisição, condôminos, usufruto | IPTU | Construída |
| 02 | Prédio comercial | idem | IPTU | Construída |
| 03 | Galpão | idem | IPTU | Construída |
| 11 | Apartamento | idem | IPTU | Privativa |
| 12 | Casa | idem | IPTU | Construída |
| 13 | Terreno | idem | IPTU | Terreno |
| 14 | Imóvel rural | Dados do imóvel + alienante + VTN do DITR | **CIB** (não IPTU) | Terra nua |
| 15 | Sala ou conjunto | idem | IPTU | Privativa |
| 16 | Construção | Apenas acréscimo construído (sem data/matrícula) | **CEI/CNO** | Construída |
| 17 | Benfeitorias até 1988 | Dados das benfeitorias (sem data/matrícula) | — | Apenas acréscimo |
| 18 | Loja | idem | IPTU | Privativa |
| 19 | Garagem Avulsa | idem | IPTU | Privativa |
| 99 | Outros bens imóveis | idem | IPTU | — |

**Regra: data de aquisição + matrícula** são obrigatórias para TODOS os códigos do Grupo 01 **exceto 16 e 17**.

### Grupo 02 — Bens Móveis
**Obrigatório:** códigos 01/02/03 SEMPRE. Códigos 04 a 99 só se valor ≥ R$ 5.000.

| Cód | Nome | Discriminação inclui | Campo de inscrição |
|---|---|---|---|
| 01 | **Veículo automotor terrestre** (carro, moto, caminhão) | Marca, modelo, ano, placa, data e forma aquisição | **Renavam** (Brasil) ou Registro de Veículo (exterior) |
| 02 | **Aeronave** | Marca, modelo, ano, data e forma aquisição | **Registro de Aeronave** |
| 03 | **Embarcação** | idem | **Registro de Embarcação** |
| 04 | Bem relacionado com atividade autônoma | Descrição, data, forma. Se linha telefônica: número e local | — |
| 05 | Quadro, objeto de arte, antiguidade | Descrição, data, forma | — |
| 06 | Joia | idem | — |
| 99 | Outros bens móveis | idem | — |

### Grupo 03 — Participações Societárias
**Obrigatório:** valor de aquisição ≥ R$ 1.000,00.
**Campos extras (Brasil):** titular ou dependente + **CNPJ obrigatório**.

| Cód | Nome | Discriminação inclui |
|---|---|---|
| 01 | **Ações** (inclusive listadas em bolsa) | Quantidade, tipo, nome da PJ. Tipos diferentes = itens separados. Se em bolsa: Código de Negociação |
| 02 | Quotas ou quinhões de capital | idem |
| 03 | **Holding Patrimonial** — ações/quotas adquiridas por integralização de bens já declarados | idem |
| 99 | Outras participações societárias | idem |

### Grupo 04 — Aplicações e Investimentos
**Obrigatório:**
- Cód 01/02/03/99: saldo > R$ 140 em 31/12/2025
- Cód 04/05: valor de aquisição ≥ R$ 1.000

**Campos extras (Brasil):** titular ou dependente + **CNPJ obrigatório** (cód 01/02/03/99).

| Cód | Nome | Discriminação | Campos especiais |
|---|---|---|---|
| 01 | **Depósito em conta poupança** | Instituição financeira, co-titular se conta conjunta | **Banco + Agência + Conta obrigatórios** |
| 02 | **Títulos públicos e privados sujeitos a tributação** (Tesouro Direto, CDB, RDB, outros) | Instituição financeira, número da conta, co-titular | CNPJ da emissora |
| 03 | **Títulos isentos de tributação** (LCI, LCA, LCD, CRI, CRA, LIG, Debêntures de Infraestrutura, outros) | idem | CNPJ da emissora |
| 04 | Ativos negociados em bolsa no Brasil (BDRs, opções e outros — exceto ações e fundos) | Quantidade, série e vencimento das opções | "Negociados em Bolsa?" → Código de Negociação se Sim |
| 05 | Ouro, ativo financeiro | Instituição/custodiante + quantidade em gramas | — |
| 99 | Outras aplicações e investimentos | Discrimine + CNPJ da emissora se PJ | Limite aplica conforme tipo |

**Botão "Rendimentos Associados":** códigos 01/02/03 disparam vínculo com Rendimentos Isentos (cód 01/03) ou Exclusivos (cód 02) na ficha apropriada.

### Grupo 05 — Créditos
**Obrigatório:** valor do direito ≥ R$ 5.000,00.
**Campos extras (Brasil):** **CPF ou CNPJ do devedor**.

| Cód | Nome | Discriminação |
|---|---|---|
| 01 | **Empréstimos concedidos** | Valor, prazo, condições, nome do devedor + CPF/CNPJ |
| 02 | Crédito decorrente de alienação | idem |
| 99 | Outros créditos | idem (inclui crédito de lucros/dividendos a receber de controlada no exterior) |

### Grupo 06 — Depósitos à Vista e Numerário
**Obrigatório:**
- Cód 01/10/11/99: saldo > R$ 140 em 31/12/2025
- Cód 02: sempre se valor ≥ R$ 5.000

**Campos extras (Brasil):** titular ou dependente + CNPJ obrigatório (cód 01 e 99).

| Cód | Nome | Discriminação | Campos especiais |
|---|---|---|---|
| 01 | **Depósito em conta-corrente ou conta pagamento** | Tipo e quantidade de moeda, instituição, agência, conta | **Banco + Agência + Conta obrigatórios** |
| 02 | Conta gráfica em agente operador de loterias de apostas de quota fixa (Lei 14.790/2023) | CNPJ do agente operador, número da conta | Localização sempre 105 - Brasil |
| 10 | **Dinheiro em espécie — moeda nacional** | Tipo e quantidade de moeda | — |
| 11 | **Dinheiro em espécie — moeda estrangeira** | idem | — |
| 99 | Outros depósitos à vista | Tipo e quantidade, instituição, agência, conta se houver | CNPJ da instituição |

### Grupo 07 — Fundos
**Obrigatório:** saldo > R$ 140 em 31/12/2025.
**Campos extras (Brasil):** titular ou dependente + **CNPJ do fundo obrigatório** + administradora + quantidade de cotas + co-titular se conjunta.

| Cód | Nome | Lei | Bolsa? |
|---|---|---|---|
| 01 | Fundos de Investimentos sujeitos à tributação periódica (come-cotas) | Lei 14.754/2023 | — |
| 02 | **Fiagro** — Fundos Cadeias Produtivas Agroindustriais | Lei 8.668/1993 | Sim |
| 03 | **FII** — Fundos de Investimento Imobiliário | Lei 8.668/1993 | Sim |
| 04 | Fundos de Investimento em Ações + Fundos Mútuos de Privatização-FGTS | Lei 14.754/2023 + Lei 8.036/1990 | Sim |
| 06 | FIP-Entidade de investimento, FIDC-Entidade sem come-cotas, ETF-Entidade de investimento | Lei 14.754/2023 | Sim |
| 07 | FIP-IE e FIP-PD&I | Lei 11.478/2007 | Sim |
| 08 | ETFs de Renda Fixa | Lei 13.043/2014, art. 2º | Sim |
| 10 | Fundos de Infraestrutura, FIDC e outros (alíquota 0%) | Lei 12.431/2011, arts. 2º e 3º | Sim |
| 12 | FIEE — Fundos em Empresas Emergentes | Lei 11.312/2006, art. 2º | Sim |
| 13 | Fundo multimercado | Lei 14.754/2023, art. 25 + art. 40 | Sim |
| 99 | Fundos de Investimento no Exterior | Lei 14.754/2023, arts. 2º a 14 | — |

**Coluna "Bolsa?"** indica códigos para os quais o PGD pergunta "Negociados em Bolsa?" — se Sim, exige Código de Negociação.

### Grupo 08 — Criptoativos
**Obrigatório:** valor de aquisição ≥ R$ 5.000,00 (Brasil) / **qualquer valor** (exterior).
**Sempre declarar pelo valor ORIGINAL de aquisição, NÃO pelo valor de mercado atual.**
**Campos extras (Brasil):** titular ou dependente + CNPJ (custódia em empresa) OU modelo de carteira digital (autocustódia).

| Cód | Nome | Discriminação | Campos especiais |
|---|---|---|---|
| 01 | **Bitcoin (BTC)** | Quantidade + empresa custodiante (CNPJ) ou modelo da carteira | — |
| 02 | **Outras criptomoedas (altcoins)**: ETH, XRP, BCH, LTC, etc. | Quantidade, tipo, custódia. Tipos diferentes = itens separados | **Código Altcoin** específico |
| 03 | **Stablecoins**: USDT, USDC, BRZ, BUSD, DAI, TUSD, GUSD, PAX, PAXG, etc. | idem | **Código Stablecoin** específico. CNPJ obrigatório se não-autocustodiante |
| 10 | **NFTs** (Non-Fungible Tokens) | idem | — |
| 99 | Outros criptoativos | idem | — |

### Grupo 99 — Outros Bens e Direitos
**Obrigatório:**
- Cód 01/02/03/04: valor de aquisição ≥ R$ 5.000
- Cód 05/06/07/08: SEMPRE
- Cód 99: conforme limite que se aplica (use só se não couber em nenhum outro)

| Cód | Nome | Discriminação | Campos especiais |
|---|---|---|---|
| 01 | Licença e concessão especiais | Descrição do direito, número do registro | — |
| 02 | Título de clube e assemelhado | idem | — |
| 03 | Direito de autor, de inventor e patente | idem | — |
| 04 | Direito de lavra e assemelhado | idem | — |
| 05 | **Consórcio não contemplado** | Administradora, tipo do bem, parcelas pagas/a pagar | **CNPJ da administradora** |
| 06 | **VGBL — Vida Gerador de Benefício Livre** | Instituição financeira, número da conta, dados da apólice | **CNPJ da seguradora** |
| 07 | **Juros Sobre Capital Próprio Creditado mas Não Pago** | Nome da PJ. Tipos diferentes = itens separados | **CNPJ da PJ devedora** |
| 08 | Leasing com opção de compra a ser exercida no final do contrato | Dados do leasing e fim do contrato | — |
| 99 | Outros bens e direitos | Use só se não cabe nos demais; ou pra indicar que bens comuns estão na declaração do cônjuge | — |

---

## Resumo dos campos OBRIGATÓRIOS por código

### Banco + Agência + Conta obrigatórios
- **Grupo 04 Cód 01** (Depósito em conta poupança)
- **Grupo 06 Cód 01** (Depósito em conta-corrente)

### CNPJ obrigatório
- Grupo 03 Cód 01, 02, 03, 99 (Participações)
- Grupo 04 Cód 01, 02, 03, 99 (Aplicações)
- Grupo 06 Cód 01 e 99 (Depósitos)
- Grupo 07 Cód 01-13 e 99 (Fundos, todos)
- Grupo 08 Cód 01, 02, 03 (se não-autocustodiante), 10 (Criptoativos)
- Grupo 99 Cód 05, 06, 07 (Consórcio, VGBL, JCP)

### CPF ou CNPJ do devedor obrigatório
- Grupo 05 Cód 01, 02, 99 (Créditos)

### Renavam / Registro obrigatório
- Grupo 02 Cód 01 → Renavam
- Grupo 02 Cód 02 → Registro de Aeronave
- Grupo 02 Cód 03 → Registro de Embarcação

### Código de Negociação obrigatório se "Negociado em Bolsa? = Sim"
- Grupo 03 Cód 01 (Ações)
- Grupo 04 Cód 04 (BDRs, opções)
- Grupo 07 Cód 02, 03, 04, 06, 07, 08, 10, 12, 13 (Fundos negociados em bolsa)

### CIB obrigatório
- Grupo 01 Cód 14 (Imóvel rural)

### CEI/CNO obrigatório
- Grupo 01 Cód 16 (Construção)

---

## CASOS ESPECIAIS

### Benfeitorias em imóvel

**Imóvel adquirido APÓS 1988:** custo das benfeitorias é ACRESCIDO ao valor do imóvel original (mesmo item). A discriminação cita o custo das benfeitorias, mantém endereço/área/etc.

**Imóvel adquirido ATÉ 1988:** usar **Grupo 01 Cód 17 — Benfeitorias até 1988** como item NOVO/separado.
- Não preencher Situação em 31/12/2024 (se primeira declaração da benfeitoria)
- Situação em 31/12/2025 = total dos pagamentos efetuados em 2025

### Consórcios — sempre Grupo 99 Cód 05

**Não contemplado em 2025:**
- Discriminação: administradora + tipo do bem + parcelas pagas e a pagar
- Sit. 31/12/2024 = valor da declaração anterior (ou em branco se contratado em 2025)
- Sit. 31/12/2025 = valor anterior + parcelas pagas em 2025

**Contemplado em 2025:**
- Mantém o item original 99/05 com Sit. 31/12/2024 = valor anterior, e Sit. 31/12/2025 = NÃO preencher
- Cria item NOVO com o código do BEM RECEBIDO (carro, imóvel, etc.) + dados do bem + Sit. 31/12/2025 = valor declarado + parcelas pagas em 2025

### Leasing — 4 cenários

| Cenário | Código | Sit. 31/12/2024 | Sit. 31/12/2025 | Dívida? |
|---|---|---|---|---|
| 1. Opção exercida no FINAL do contrato, ocorrido em 2025 | Código do bem | Valores pagos até 2024 (ou em branco se contratado em 2025) | Anterior + pagos em 2025 + valor residual | Não |
| 2. Em 2025, opção a ser exercida no FINAL (futuro) | **Grupo 99 Cód 08** + CNPJ | NÃO preencher | NÃO preencher | Não |
| 3. Antes de 2025, opção JÁ exercida no ato | Código do bem | Valor do bem | Valor do bem | Sim (saldos remanescentes) |
| 4. Em 2025, opção exercida no ato | Código do bem | NÃO preencher | Valor do bem | Sim (saldo em 31/12/2025) |

**Alienação fiduciária:** Sit. 31/12/2025 = total pago. NÃO incluir dívida.

### VGBL — Grupo 99 Cód 06
- CNPJ da sociedade seguradora obrigatório
- Sit. 31/12/2024 = valores pagos até 31/12/2024
- Sit. 31/12/2025 = anterior + pagos em 2025

### Permuta de imóveis

**Sem torna:**
- Imóvel dado em permuta: Sit. 31/12/2024 = valor anterior. Sit. 31/12/2025 = NÃO preencher.
- Imóvel recebido: Sit. 31/12/2024 = NÃO preencher. Sit. 31/12/2025 = valor do bem dado em permuta.

**Com torna paga (contribuinte paga):**
- Imóvel recebido: Sit. 31/12/2025 = valor do bem dado + torna paga.

**Com torna recebida (contribuinte recebe):**
- Imóvel recebido: Sit. 31/12/2025 = valor do bem dado − valor da torna usado como custo no ganho de capital.

### Imóvel rural — Grupo 01 Cód 14
- Discriminação: **Valor da Terra Nua (VTN)** do DIAT/DITR exercício 2025 + dados do imóvel + alienante
- CIB obrigatório
- Apenas terra nua na ficha Bens (benfeitorias deduzidas como despesa de custeio vão no Demonstrativo da Atividade Rural)
- Sit. 31/12/2024 = valor da declaração anterior (ou em branco se adquirido em 2025)
- Sit. 31/12/2025 = valor declarado + parcelas pagas em 2025 (só terra nua)

### Doação recebida
Item NOVO no código do bem ou direito recebido:
- Discriminação: relacione doações + espécie + nome + CPF do doador
- Sit. 31/12/2024 = NÃO preencher
- Sit. 31/12/2025 = saldo em 31/12/2025 (espécie) OU valor do bem recebido
- **Também declarar na ficha "Rendimentos Isentos e Não Tributáveis"** o valor da doação

### Bens recebidos por Herança, Meação, Legado, Doação (inclusive adiantamento da legítima)
- Sit. 31/12/2024 = NÃO preencher
- Sit. 31/12/2025 = valor da última declaração do falecido/doador, OU opcionalmente valor superior
- Diferença entre valor superior e valor anterior = ganho de capital (15%)

### Dissolução de Sociedade Conjugal ou União Estável
- Sit. 31/12/2024 = NÃO preencher
- Sit. 31/12/2025 = valor da última declaração do cônjuge anterior, OU valor transferido se superior
- Diferença = ganho de capital

### Bens no exterior
- Discriminação: bem + valor de aquisição em moeda estrangeira + origem dos rendimentos (reais, moeda estrangeira, ou ambas)
- Sit. 31/12/2024 = valor da declaração anterior (ou em branco se adquirido em 2025)
- Sit. 31/12/2025 = valor anterior + parcelas pagas em 2025
- Cotação: fechamento Bacen (venda) na data da aquisição

**Mapeamento por tipo:**
| Tipo no exterior | Grupo/Cód |
|---|---|
| Aplicações financeiras (depósitos remunerados, CDs, ativos virtuais com rendimento, cotas de fundos, instrumentos financeiros, apólices de seguro, capitalização, aposentadoria, RV, RF, ouro, derivativos, participações sem controle, etc.) | **Grupo 04 Cód 99** |
| Conta-corrente em moeda estrangeira (não-remunerada) | Grupo 06 Cód 01 |
| Cartão de débito/crédito no exterior | Grupo 06 Cód 99 |
| Moeda estrangeira em espécie | Grupo 06 Cód 11 |
| Entidade controlada direta | Grupo 03 Cód 01/02 (com regime Lei 14.754/2023) |

**Variação cambial — alienação de moeda estrangeira em espécie até US$ 5.000/ano:** isenta. Informar em **Rendimentos Isentos Cód 08**.
**Variação cambial acima de US$ 5.000:** ganho de capital (15%).

### Bens e direitos comuns (cônjuges / união estável)

**Regime de comunhão TOTAL OU comunhão PARCIAL (adquiridos na constância) ou união estável (sem contrato escrito contrário) → bens comuns.**

- **Declaração em conjunto:** todos os bens (titular + cônjuge + dependentes) na declaração principal
- **Declaração em separado:**
  - Bens privativos → na declaração do proprietário
  - Bens comuns → **totalidade em UMA** das declarações (do casal). A outra declaração deve incluir UM item **Grupo 99 Cód 99** na discriminação informando que os bens comuns estão na declaração do cônjuge + **nome + CPF do cônjuge**

### Bens em condomínio
Declarados na **proporção da participação** de cada condômino.

### Espólio (Declaração Final)
Para cada bem do inventário transferido a herdeiro/meeiro/legatário:
- Discriminação: parcela por beneficiário (nome + CPF)
- "Bem com usufruto?" se aplicável
- **Situação na Data da Partilha (R$)** = valor da última declaração do de cujus
- **Percentual %** por beneficiário (CPF + percentual)
- **Valor de Transferência (R$)** = valor com que o bem entra na declaração do beneficiário (igual ao da partilha OU valor de mercado se superior — diferença é ganho de capital 15%)

### Saída Definitiva do País
- Sit. 31/12/2024 = valor da declaração anterior
- **Sit. na data da caracterização da condição de não residente (R$)** = custo do bem em reais até essa data

### Contribuinte que ADQUIRIU ou READQUIRIU condição de residente no Brasil em 2025
- Sit. 31/12/2024:
  - Bem adquirido ANTES da saída: valor da Declaração de Saída Definitiva ou última declaração
  - Bem situado no exterior, adquirido como não-residente: valor em reais pela cotação Bacen (venda) na data da aquisição
  - Bem no Brasil, adquirido como não-residente: custo de aquisição em reais
- Sit. 31/12/2025 = valor anterior + parcelas pagas em 2025 a partir da data da caracterização

---

## Regras de PREENCHIMENTO de valores (Situação 31/12)

### Bens adquiridos até 31/12/1995
**Quem nunca esteve obrigado a declarar:** avaliar a valor de mercado em 31/12/1991 (Cr$). Dividir o valor em cruzeiros por **720,4779**. Resultado = valor em reais. Esse valor vai nos dois campos (31/12/2024 e 31/12/2025).

**Quem declarou entre 1992 e 2024:** usar Tabela de Atualização do Custo de Bens e Direitos. Mesmo valor nos dois campos.

### Bens adquiridos de 1996 a 2024
**À vista:** custo de aquisição em ambos os campos.

**Prestações/financiados (SFH, consórcio, etc.):**
- Sit. 31/12/2024 = soma das parcelas pagas de 1996 a 2024
- Sit. 31/12/2025 = anterior + parcelas pagas em 2025

### Bens adquiridos em 2025
**À vista:** Sit. 31/12/2024 em branco. Sit. 31/12/2025 = custo de aquisição.

**Prestações/financiados:** Sit. 31/12/2024 em branco. Sit. 31/12/2025 = valor das parcelas pagas em 2025.

---

## Bens ALIENADOS / DESINCORPORADOS em 2025

### Alienados em 2025
- Discriminação: dados do bem + nome + CPF/CNPJ do adquirente + data e valor da alienação + condições
- Sit. 31/12/2024 = valor da declaração anterior
- Sit. 31/12/2025 = **NÃO preencher**
- Alienação pode resultar em ganho de capital → ver GCAP 2025

### Adquiridos e alienados em 2025
- Discriminação: dados completos da aquisição e alienação (CPF/CNPJ, valores, datas)
- Sit. 31/12/2024 e Sit. 31/12/2025 = **NÃO preencher**

---

## Como o Estúdio deve refletir essas regras

1. **Validação automática** ao receber JSON da IA: se `grupo` e `codigo` formam combinação inexistente nesta tabela, alertar como erro
2. **Campos obrigatórios** podem ser checados: ex. se `grupo=04` e `codigo=01`, exigir `banco`/`agencia`/`conta` no JSON
3. **Auto-repetição de 2024 → 2025** (já implementada no Estúdio): a tabela confirma que se aplica corretamente a Grupos 01 (imóveis), 02 (móveis), 03 (participações) — bens estáticos que não variam de valor por natureza
4. **Bens novos sem categoria clara:** sempre cair em `Grupo 99 Cód 99` com explicação na discriminação (não inventar grupo/código)

---

## Pendências relacionadas (outros knowledge files)

- **KNOWLEDGE_06B (próximo):** Dívidas e Ônus Reais (códigos 11-19) + Tabelas Gerais (UF, países, etc.)
- **KNOWLEDGE_06C:** Códigos de Pagamentos Efetuados + Tipos de Dependente
- **KNOWLEDGE_06D:** Códigos de Rendimentos Isentos + Rendimentos Exclusivos
- **Atualizar Regra 20 do INSTRUCOES_PROJETO.md** com a correção de poupança (04/01 e não 06/02)

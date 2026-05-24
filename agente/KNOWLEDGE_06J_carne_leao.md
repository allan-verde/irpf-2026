# KNOWLEDGE_06J — Carnê-Leão (Rendimentos Tributáveis Recebidos de Pessoa Física e do Exterior)

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Rendimentos Tributáveis Recebidos de Pessoa Física e do Exterior" (p. 55-74). Registros do `.DBK`: **reg 22** (totalizador mensal, 167 chars) + **reg 49** (lançamento individual de honorários PF, 71 chars). Corroborado pelo doc Gemini seção 5.

## O que é Carnê-Leão

Ficha onde se declara TUDO que o titular (e dependentes) recebeu de **pessoa física** ou **do exterior** durante o ano, com recolhimento mensal obrigatório do IR via DARF código **0190**. Diferente da ficha "Rendimentos Tributáveis Recebidos de PJ" (que é pra empregadores PJ), a Carnê-Leão cobre:

- Autônomos prestando serviço pra PF
- Aluguel recebido de PF
- Juros de empréstimo concedido a PF
- Direitos autorais
- Rendimentos do exterior
- 10% (transporte de carga) ou 60% (transporte de passageiros) — restante é isento (06G códigos 23/24)

**Importante**: o PGD oferece importação do programa Carnê-Leão online (e-CAC). Quando o cliente já usou o Carnê-Leão durante o ano, basta importar; só preenche manualmente quem não usou.

## Como o agente deve usar este arquivo

Use ao classificar recebimentos de **pessoa física** identificados em informes/recibos. O schema do patch JSON tem `rendimentos_pf_carne_leao` com campo `natureza` aceitando `"honorarios_servico_prestado" | "aluguel" | "outros"`. **⚠️ Hoje o writer ignora esse campo** — todos os 3 caem em "Trabalho Não Assalariado" no `.DBK`. Ver "Limitações conhecidas" abaixo.

---

## Estrutura da ficha (manual p. 56-65)

A ficha tem **2 abas**:

### Aba 1 — "Rendimentos do Trabalho Não Assalariado"
Lançamento individual **mês a mês**, por **CPF pagador**. Cada linha tem:
- Titular do pagamento: CPF + nome
- Beneficiário do serviço: CPF + nome (titular do pagamento e beneficiário do serviço PODEM ser pessoas diferentes — ex: pai paga consulta da filha)
- "Titular do pagamento é o próprio beneficiário" (Checkbox)
- "CPF não informado" (Checkbox — só quando beneficiário ≠ titular E CPF do beneficiário desconhecido)
- Valor

**No `.DBK`**: cada lançamento individual vira **uma linha reg 49** (71 chars).

**Profissões que EXIGEM registro profissional** (e marcação de CPF do beneficiário do serviço se diferente do pagador):
| Cód Ocupação | Profissão |
|---|---|
| 225 | Médico |
| 226 | Odontólogo |
| 230 | Fonoaudiólogo |
| 231 | Fisioterapeuta |
| 232 | Terapeuta ocupacional |
| 241 | Advogado |
| 255 | Psicólogo |
| 355 | Corretor / administrador de imóveis |

Pra essas profissões: se o pagador (responsável) ≠ beneficiário do serviço, **CPF do beneficiário do serviço é obrigatório**.

### Aba 2 — "Outras Informações"
Tabela 12 meses × **9 colunas**. Cada célula é um valor mensal. As colunas:

| Coluna | O que entra |
|---|---|
| **Trabalho Não Assalariado** | Total mensal dos lançamentos da Aba 1 (transportado pelo programa — agente não preenche aqui se já preencheu Aba 1) |
| **Aluguéis, inclusive por temporada** | Aluguel recebido de PF (imóvel, móvel), sublocação, royalties (quando NÃO explorados pelo autor) |
| **Outros** | Juros de empréstimo a PF, lucro de comércio/indústria não-habitual, reajustamento + juros em venda a prazo |
| **Exterior** | Rendimentos do exterior em geral (salário, aluguel, serviços), convertidos pra BRL (ver "Conversão de moeda" abaixo) |
| **Previdência Oficial** | INSS pago pelo autônomo / contribuinte individual mês a mês (DEDUÇÃO) |
| **Quantidade de Dependentes** | Quantidade × R$ 189,59 (INFORMATIVO — dedução real vem da ficha Dependentes) |
| **Pensão Alimentícia** | Pensão paga mês a mês (INFORMATIVO — dedução real vem da ficha "Pagamentos Efetuados") |
| **Livro Caixa** | Despesas escrituradas mês a mês (DEDUÇÃO — só pra trabalho não-assalariado, NÃO vale pra aluguel ou transporte) |
| **Carnê-Leão DARF cód. 0190** | Valor do principal do DARF já pago, mês a mês (IR antecipado) |

**No `.DBK`**: cada mês × cada coluna provavelmente é um campo no **reg 22** (167 chars). **Hoje só 2 campos do reg 22 estão mapeados** — ver "Limitações conhecidas".

---

## Decisões de classificação (qual coluna vai)

### Trabalho Não Assalariado (Aba 1 + col 1)
- Honorários de **médico, dentista, advogado, contador, engenheiro, arquiteto, psicólogo, fisioterapeuta, fonoaudiólogo, terapeuta ocupacional, veterinário, professor, pintor, escultor, escritor, jornalista, leiloeiro** recebidos de PF
- Representante comercial autônomo prestando serviço a PF
- Direitos autorais quando **explorados diretamente pelo autor** (didáticos, científicos, artísticos)
- Empreitada de trabalho (arquitetônico, topográfico, terraplenagem, construção)
- Emolumentos de serventuários da Justiça (exceto se pagos só pelos cofres públicos)
- **Transporte de carga / trator / colheitadeira** quando o veículo é do contribuinte e ele dirige: **10% do bruto** é tributável aqui (90% é isento — código 23, ver 06G)
- **Transporte de passageiros**: **60% do bruto** é tributável aqui (40% isento — código 24, ver 06G)

### Aluguéis
- **Aluguel** de imóvel residencial ou comercial pago por PF
- **Sublocação** recebida
- **Aluguel por temporada** (Airbnb, etc., quando pago por PF)
- **Royalties** quando o autor NÃO é quem explora (ex: herdeiro de obra recebendo royalties)
- **Aluguel de móvel** (ex: equipamentos)

**Atenção — deduções permitidas do aluguel recebido**:
- Impostos, taxas, emolumentos do imóvel (IPTU, taxa de lixo)
- Aluguel pago pelo locador quando sublocando
- Despesas de cobrança/recebimento
- Despesas de condomínio

Essas deduções saem do valor BRUTO do aluguel **antes** de informar na ficha — agente só vê o valor líquido nos informes.

### Outros
- **Juros recebidos** de empréstimo concedido a PF
- **Lucro em comércio/indústria não-habitual** (cliente vendeu mercadorias informalmente, sem ser comerciante registrado)
- **Reajustamento + juros** em alienação a prazo de bens

### Exterior
- Salário de empregador no exterior
- Aluguel de imóvel no exterior
- Serviços prestados a cliente no exterior
- Pensão/aposentadoria pagas por governo estrangeiro
- Rendimentos de representações diplomáticas / organismos internacionais

**NÃO entra na coluna Exterior** (vai pra outras fichas):
- Aplicações financeiras no exterior → Ficha **Bens e Direitos** (Lei 14.754/2023) + Exclusivo cód 12
- Lucros/dividendos de entidades controladas no exterior → Ficha **Bens e Direitos**
- Alienação de moeda em espécie → **Ganho de capital** (até US$ 5k/ano é isento — cód 08 do 06G)
- Variação cambial de depósitos não-remunerados → Ganho de capital
- Transferência de saldo de cartão / conta no exterior → Ganho de capital

---

## Conversão de moeda estrangeira (Exterior)

**Para rendimentos recebidos**:
1. Converter valor da moeda local pra **USD** pelo valor fixado pela **autoridade monetária do país de origem** na data do recebimento
2. Converter USD pra BRL pela cotação de **COMPRA do dólar BACEN do último dia útil da 1ª quinzena do mês ANTERIOR ao do recebimento**

(Sim, "primeira quinzena do mês anterior" — não é a cotação do dia do recebimento. Regra específica da RFB.)

Tabela de cotação dólar 2025 está em `KNOWLEDGE_06F_tabelas_auxiliares.md`. **Mas atenção**: o 06F lista a cotação mensal "padrão" (média ou fechamento). A regra do Carnê-Leão exige cotação de uma data específica — em rendimentos do exterior, **mencionar em `observacoes` que o cálculo exato exige consulta ao PTAX Bacen na data específica**.

**Para pagamentos feitos no exterior** (pensão alimentícia paga, despesas escrituradas em Livro Caixa pagas em USD): cotação de **VENDA** do mesmo critério (último dia útil da 1ª quinzena do mês anterior).

---

## Deduções (Aba 2 colunas 5-8)

### Previdência Oficial paga pelo autônomo
- INSS pago pelo contribuinte individual / autônomo (carnê do INSS, GPS, etc.)
- **Valor TOTAL dedutível** — a Receita soma essa coluna com Previdência Oficial da ficha PJ Titular pro Resumo da Declaração
- **Obrigatório informar NIT/PIS/PASEP** na seção da ficha pra que o PGD aceite esses valores

### Quantidade de Dependentes (informativo)
- Valor mensal por dependente: **R$ 189,59** (Jan a Dez 2025)
- **NÃO é transportado pro Resumo da Declaração** — é apenas exibição. A dedução real vem da ficha Dependentes (que reconhece R$ 2.275,08 anual por dependente).
- Agente NÃO precisa preencher essa coluna no JSON.

### Pensão Alimentícia (informativo)
- Valor mensal de pensão alimentícia paga pelo titular
- **NÃO é transportado pro Resumo da Declaração** — apenas exibição. Dedução vem da ficha "Pagamentos Efetuados" (códigos 30/31/33/34 — ver 06C).
- Agente NÃO precisa preencher.

### Livro Caixa
- Despesas escrituradas no livro caixa mês a mês
- **Dedutível** — entra no cálculo do imposto mensal e no Resumo da Declaração
- **Quem PODE usar**:
  - Autônomo que recebe rendimento do **trabalho não-assalariado** (incl. titulares de serviços notariais, registros, leiloeiros — exceto se remunerados só pelos cofres públicos)
- **Quem NÃO PODE usar**:
  - Transportador (carga ou passageiros) — não há livro caixa
  - Quem só recebe aluguéis
- **Tipos de despesa**:
  - Remuneração de empregados + encargos trabalhistas/previdenciários
  - Emolumentos
  - Despesas de custeio necessárias à atividade
- **Limite**: despesa mensal limitada à receita mensal (PF + PJ). Excesso pode ser somado aos meses subsequentes até dezembro/2025 (não pode passar pro ano seguinte).

### Carnê-Leão DARF pago (cód 0190)
- Valor do **principal do DARF** já pago, na linha do mês do recebimento (não na data de pagamento)
- IR antecipado mensal
- Pode incluir IR pago no exterior compensado, observado limite legal (se há tratado ou reciprocidade)

---

## Casos especiais

### Cliente que usou Carnê-Leão online em 2025
- Manual recomenda importar via gov.br no PGD diretamente
- Agente NÃO deve sugerir refazer manualmente — apenas se o cliente diz que não usou
- Atenção: na importação, alguns dados NÃO são trazidos (CNPJ já preenchido em PJ Titular, imposto pago no exterior já em Imposto Pago/Retido)

### Dependente recebendo Carnê-Leão
- Tem aba própria ("Dependentes") com mesma estrutura
- Cada dependente listado pode ter sua tabela mensal preenchida
- No `.DBK`: provavelmente reg 22 e reg 49 separados por dependente (a confirmar)

### Pagador PF é mesmo o beneficiário do serviço
- Comum: paciente paga consulta médica, pagador = beneficiário
- Marcar checkbox "Titular do pagamento é o próprio beneficiário"
- Schema atual do `rendimentos_pf_carne_leao` não tem campo pra esse checkbox — agente assume sempre TRUE

### Pagador PF ≠ Beneficiário do serviço (profissões 225/226/230/231/232/241/255/355)
- Ex: marido paga consulta da esposa com médico (cliente do escritório)
- Informar CPF do pagador E CPF do beneficiário do serviço
- Se beneficiário sem CPF: marcar "CPF não informado"
- Schema atual não suporta — IA flag em `observacoes`

### Aluguel de PF a outro PF (recebimento)
- Vai pra coluna **Aluguéis** da Aba 2, mês a mês
- **NÃO** vai pra coluna Trabalho Não Assalariado (Aba 1 não recebe lançamento)
- ⚠️ **Bug atual**: schema aceita `natureza: "aluguel"` mas writer ignora e cria reg 49 (Aba 1). Ver "Limitações conhecidas".

### Locatário PF do contribuinte é cliente do escritório
- Locador (que recebe aluguel) lança em Carnê-Leão (Aba 2 col Aluguéis)
- Locatário (que paga aluguel) lança em "Pagamentos Efetuados" código **70** (ver 06C)
- Se ambos são clientes do mesmo escritório, são duas declarações separadas — não há vínculo

---

## ⚠️ Limitações conhecidas do `App.jsx`

### 1. Campo `natureza` do schema é ignorado pelo writer
**Localização**: `aplicarPatch` (loop em `patch.rendimentos_pf_carne_leao`, linhas ~1796 do `App.jsx`).

**Comportamento**: o writer sempre chama `criarReg49(cpfContrib, mes, cpfPag, valor)`, criando lançamento individual da Aba 1 (Trabalho Não Assalariado). O campo `natureza` (aceitando `"honorarios_servico_prestado"` | `"aluguel"` | `"outros"`) é descartado.

**Impacto**: cliente que recebe **aluguel de PF** acaba com o valor classificado como "Trabalho Não Assalariado" no PGD. Isso pode:
- Permitir indevida dedução de Livro Caixa (aluguel não pode usar livro caixa)
- Mostrar contagem errada de lançamentos por categoria (informativo)
- Em casos de transporte (10%/60% regra), a base de cálculo pode ficar errada

**Mitigação atual**: agente deve usar `natureza="aluguel"` ou `natureza="outros"` quando aplicável, MAS também mencionar em `observacoes` que o contador precisa **corrigir manualmente** no PGD (transferir o valor pra Aba 2 col Aluguéis/Outros).

### 2. Reg 22 só tem 2 campos preenchidos
**Localização**: `atualizarReg22` (linhas 1043-1053).

**Mapeamento atual do reg 22 (167 chars)**:
| Pos | Largura | Campo |
|---|---|---|
| 0-2 | 2 | tipo `"22"` |
| 2-13 | 11 | CPF declarante |
| 13 | 1 | flag (`"N"` em pré-preenchidos vazios — semântica não confirmada) |
| 14-25 | 11 | padding em branco |
| 25-27 | 2 | mês `"01"`-`"12"` |
| **27-40** | **13** | **valor recebido × 100** (provavelmente "Trabalho Não Assalariado") |
| **40-131** | **91** | **CAMPOS NÃO MAPEADOS** (provavelmente 7 colunas × 13 chars cada = 91) |
| **131-144** | **13** | **base de cálculo × 100** (=valor recebido hoje, deveria ser diferente quando há deduções) |
| **144-157** | **13** | **CAMPO NÃO MAPEADO** (provavelmente Darf 0190 pago) |
| 157-167 | 10 | CRC32 |

**Pendência**: precisa de DBK de cliente real com **aluguel**, **outros**, **exterior**, **previdência paga**, **livro caixa** e/ou **DARF pago** preenchidos no PGD pra confirmar layout. Sem isso, o writer só atualiza Trabalho Não Assalariado.

### 3. Schema atual do `rendimentos_pf_carne_leao` está incompleto
Falta campos:
- `tipo_beneficiario`: T/D/A — pra suportar Carnê-Leão de dependente (hoje só do titular)
- `cpf_beneficiario_servico`: pra profissões 225/226/230/231/232/241/255/355 quando pagador ≠ beneficiário
- `previdencia_oficial_paga`: INSS autônomo dedutível mês a mês
- `livro_caixa`: despesas dedutíveis mês a mês
- `darf_0190_pago`: IR antecipado mensal
- `exterior_origem_pais`: país de origem (pra cálculo de cotação correto)

**A implementar**: quando engenharia reversa do reg 22 for feita, expandir schema e writer pra suportar essas colunas.

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **`cpf` em `rendimentos_pf_carne_leao` deve ter 11 dígitos** — se vier 14 dígitos, é CNPJ (pertence à ficha PJ, não aqui).

2. **`valor_total_ano` deve bater com `soma(valores_mensais)`** — alerta se discrepância > 1 centavo.

3. **`natureza="aluguel"` + valor > 0**: alertar com warning amarelo "Aluguel hoje vai pra Trabalho Não Assalariado por limitação técnica — corrigir manualmente no PGD após geração".

4. **Recebimentos de PF com profissões 225/226/230/231/232/241/255/355**: se a "Ocupação Principal" do contribuinte (no Reg 16) for uma dessas, exigir CPF do beneficiário do serviço quando ≠ pagador. (Hoje o app nem lê ocupação do reg 16 — separar pra outra rodada.)

5. **NIT/PIS/PASEP do titular** ausente quando há Previdência Oficial paga em Carnê-Leão: alerta — o PGD rejeita.

---

## Pendências (não tratadas)

- **Engenharia reversa do reg 22** — 104 chars não mapeados. Precisa de DBK preenchido com colunas Aluguéis/Outros/Exterior/Previdência/Livro Caixa/DARF pra mapear offsets. Sem isso, suporte automático limitado a "Trabalho Não Assalariado".
- **Suporte a Carnê-Leão de dependente** — ficha tem aba "Dependentes" separada com mesma estrutura. Reg 22/49 de dependente: a confirmar se tem variação de layout.
- **Campos NIT/PIS/PASEP** — não mapeados em nenhum reg conhecido. Provavelmente reg 16 ou reg específico.
- **Ocupação Principal** (códigos 225/226/etc.) — reg 16 do contribuinte tem esse campo mas o parser atual não lê (`lerTemplateInfo` linhas 309-337 — campo não mapeado).
- **Cotação dólar PTAX por data exata** — agente hoje usa cotação mensal padrão de 06F. Cálculo correto exigiria PTAX do último dia útil da 1ª quinzena do mês anterior — agente deve flagar em `observacoes`.

---

## Próximos KNOWLEDGE_06 planejados

- **06K** — Rendimentos Recebidos Acumuladamente (RRA — Manual p. 125-134). **Próxima rodada (8)**.
- **06I** — Fontes pagadoras PJ (reg 21 — Manual p. 51-54). Pendente — projeto já trata corretamente, será mais documentação.

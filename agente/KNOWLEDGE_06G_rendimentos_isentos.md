# KNOWLEDGE_06G — Códigos Oficiais: Rendimentos Isentos e Não Tributáveis

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Rendimentos Isentos e Não Tributáveis" (p. 75-113). Reg 86 (genérico, com descrição livre) e reg 84 (tipado, com código). Corroborado pelo doc Gemini seção 6.

## Como o agente deve usar este arquivo

Use este arquivo como fonte ÚNICA pra classificar rendimentos isentos identificados em informes/recibos. **Não invente códigos.** O contribuinte pode ter rendimentos isentos sem código tipado (vão pro reg 86 como código 99) ou tipados (reg 84 com código 01-28).

### ⚠️ Limitação atual do `App.jsx` (importante)

- **Reg 84 (tipado) NÃO PODE SER EDITADO** atualmente — engenharia reversa do CRC ainda não foi feita. Tentativas de atualizar valor de I${idx} reg 84 são silenciosamente ignoradas (linha 1614 do `App.jsx` tem aviso defensivo).
- **Reg 84 PODE SER REMOVIDO** (set-to-null não escreve CRC).
- **Reg 86 (genérico) é editável** normalmente.

**Consequência prática pro agente**: ao propor `rendimentos_isentos_atualizados`, hoje o schema só aceita `{ idx, valor, origem }` (sem `codigo`). Pra um item reg 84 que precisa atualização de valor, o caminho é:
1. Marcar pra remoção em `rendimentos_isentos_a_remover`
2. NÃO recriar (não há campo `rendimentos_isentos_novos_aviso` no schema atual)
3. Mencionar em `observacoes` que o contador precisa lançar manualmente no PGD o novo valor da fonte X, código Y

Quando o CRC do reg 84 for engenheirado, será possível adicionar `codigo` no schema e suportar update direto.

---

## TABELA OFICIAL DE CÓDIGOS (Manual IRPF 2026 p. 75-113)

| Cód | Descrição | Reg típico | Limite/condição |
|---|---|---|---|
| **01** | Bolsas de estudo/pesquisa (doação, exceto médico-residente/Pronatec) | reg 84 | sem contraprestação de serviço |
| **02** | Bolsas médico-residente OU servidor Pronatec | reg 84 | só desde jun/2013 (Lei 12.816) |
| **03** | Capital apólice de seguro / pecúlio por morte/invalidez permanente | reg 86 | só se pago em PARCELA ÚNICA |
| **04** | Indenizações rescisão trabalho (incl. PDV), acidente de trabalho, saque FGTS | reg 84 | até o limite da lei trabalhista/dissídio |
| **05** | Ganho de capital em bens "pequeno valor" | calc. GCAP | ≤ R$ 20k/mês (ações balcão) ou ≤ R$ 35k/mês (demais) |
| **06** | Ganho de capital ÚNICO imóvel ≤ R$ 440k | calc. GCAP | + nenhuma alienação imóvel em 5 anos |
| **07** | Ganho de capital venda imóvel residencial → outro imóvel residencial | calc. GCAP | 180 dias pra reaplicar |
| **08** | Ganho de capital moeda estrangeira em espécie | livre | ≤ US$ 5.000/ano |
| **09** | **Lucros e dividendos recebidos** | reg 84 | apurados ≥ 1º/01/1996 |
| **10** | Parcela isenta aposentadoria/pensão 65+ | reg 84 | R$ 1.903,98/mês + R$ 1.903,98 13º |
| **11** | Aposentadoria/pensão por moléstia grave ou acidente em serviço | reg 84 | requer laudo pericial oficial |
| **12** | Rendimentos poupança, LCI, LCA, CRI, CRA, letras hipotecárias | reg 84 | sempre isento |
| **13** | Rendimento sócio/titular ME/EPP Simples Nacional | reg 84 | exceto pró-labore, aluguéis, serviços prestados |
| **14** | **Transferências patrimoniais — doações e heranças** | reg 84 | inclui adiantamento de legítima |
| **15** | Parcela não tributável atividade rural | auto | transportado do Demonstrativo Atividade Rural |
| **16** | IR de anos anteriores compensado judicialmente neste ano | reg 84 | |
| **17** | 75% rendimentos servidores autarquias brasileiras no exterior | reg 84 | convertidos em reais |
| **18** | Incorporação de reservas ao capital / Bonificações em ações | reg 84 | |
| **19** | **Transferências patrimoniais — meação e dissolução conjugal** | reg 84 | |
| **20** | Ganhos líquidos ações balcão ≤ R$ 20k/mês | livre | conjunto de ações |
| **21** | Ganhos líquidos ouro ativo financeiro ≤ R$ 20k/mês | livre | |
| **22** | Recuperação de prejuízos em renda variável | auto | transportado do Demonst. Renda Variável |
| **23** | 90% rendimento bruto transporte de CARGA | livre | trator, terraplenagem, colheitadeira, similares |
| **24** | 40% rendimento bruto transporte de PASSAGEIROS | livre | |
| **25** | Restituição de IR de anos-calendário anteriores | livre | |
| **27** | Juros referentes a Rendimentos Recebidos Acumuladamente (RRA) | auto | transportado da ficha RRA |
| **28** | **Pensão alimentícia recebida** | reg 84 | isenta desde STF ADI 5422/DF |
| **99** | Outros (catch-all) | reg 86 | requer descrição livre |

> Códigos **26** (ausente — pulado intencionalmente pela Receita) e qualquer outro número não listado: **não existem**. Não inventar.

---

## Decisões por tipo de informe / situação

### Bancos (CDB, fundos, conta corrente, poupança, LCI/LCA)
- **Saldo de poupança** com rendimento informado → **12**
- **LCI / LCA / CRI / CRA** rendimento → **12**
- **Letras hipotecárias** rendimento → **12**
- **Lucros distribuídos por banco como sócio** (ações) → **09**
- **CDB / RDB / Tesouro / Fundos comuns**: NÃO é isento — vai pra **exclusivos código 06** (rodada 6)

### Empresas (sócio / acionista)
- **Lucros e dividendos** pagos pela empresa ao sócio/acionista → **09**
- **Bonificação em ações** (incorporação de reserva ao capital) → **18**
- **Pró-labore** → NÃO é isento. Vai como rendimento tributável (reg 21).
- **Sócio Simples Nacional** distribuição de lucros (exceto pró-labore/aluguéis/serviços) → **13**
- **JCP recebido** → NÃO é isento. Vai pra **exclusivos código 10** (rodada 6)

### Aposentadoria/pensão (65+ ou moléstia grave)
- **Aposentadoria normal 65+** → **10** (limite R$ 1.903,98/mês + R$ 1.903,98 13º)
- **Aposentadoria por moléstia grave** com laudo pericial oficial → **11** (INTEGRAL — sem limite)
- **Pensão alimentícia recebida** → **28** (todo o valor, ADI 5422/DF)
- **Pensão por morte** → NÃO é isento (a menos que moléstia grave + laudo) → tributável

### Trabalho
- **Rescisão de contrato**, aviso prévio, FGTS, PDV, indenização por acidente → **04**
- **Bolsa de pesquisa** (doação, sem contraprestação) → **01**
- **Bolsa médico-residente / Pronatec** → **02**
- **Servidor brasileiro lotado no exterior** → **17** (75% isento)
- **Diárias / ajuda de custo de remoção** → **99** (citar em descrição)

### Ganhos de capital isentos
- **Bem pequeno valor** (≤ R$ 20k balcão / R$ 35k outros) → **05**
- **Único imóvel ≤ R$ 440k + sem alienação em 5 anos** → **06**
- **Venda imóvel residencial reaplicado em 180 dias** → **07**
- **Moeda estrangeira espécie ≤ US$ 5k/ano** → **08**
- **Ações em bolsa balcão ≤ R$ 20k/mês** → **20**
- **Ouro ativo financeiro ≤ R$ 20k/mês** → **21**

### Transferências patrimoniais
- **Recebimento de doação ou herança** (em vida ou por sucessão) → **14**
- **Adiantamento de legítima** → **14**
- **Meação / divisão de bens em divórcio ou união estável** → **19**
- **Doação/herança de não-residente** → **99** (descrição livre)

> Atenção: se o valor transferido for SUPERIOR ao constante na declaração anterior, a DIFERENÇA é ganho de capital — vai pra **exclusivos código 02** (rodada 6), não isento.

### Transporte / autônomos
- **Caminhoneiro autônomo / motorista de transporte de carga / operador de trator/colheitadeira** → **23** (90% do bruto isento)
- **Motorista de passageiros (taxi, lotação, van, etc.)** autônomo → **24** (40% do bruto isento)

### Outros
- **Restituição de IR** de anos anteriores → **25**
- **IR compensado judicialmente** → **16**
- **Juros sobre RRA** (transportado da ficha RRA) → **27**
- **PIS/Pasep recebido** → **99**
- **Seguro-desemprego, auxílio-doença, auxílio-acidente** → **99**
- **Variação cambial** de depósitos não-remunerados no exterior → **99**
- **Sinistro / furto / roubo** indenização (líquido do custo) → **99**

---

## Vínculos com outras fichas

O PGD permite registrar alguns rendimentos isentos diretamente vinculados a um item da ficha "Bens e Direitos":

- **Código 09** (lucros e dividendos) — pode vincular a `Grupo 03 Cód 01` (Ações)
- **Código 12** (rendimentos isentos de aplicações) — pode vincular a `Grupo 04 Cód 01` (Poupança) e `Grupo 04 Cód 03` (LCI/LCA/CRI/CRA/etc.)
- **Código 99** (outros) — pode vincular a `Grupo 07 Cód 02` (Fiagro) e `Grupo 07 Cód 03` (FII)

**Operacional**: o agente NÃO precisa diferenciar essas formas de lançamento no patch JSON. Pode propor o rendimento isento diretamente em `rendimentos_isentos_atualizados`. O PGD aceita as duas formas; o que importa é que o valor anual conste numa das fichas.

---

## Casos especiais

### Código 10 — Aposentadoria 65+ — cálculo da parcela isenta

**Limite mensal**: R$ 1.903,98/mês de janeiro a dezembro, **a partir do mês em que o contribuinte completou 65 anos** (ou desde janeiro se já tinha 65+ em 1º/jan).

**Limite do 13º**: R$ 1.903,98 (uma vez no ano).

**Comprovante da fonte pagadora** informa um valor TOTAL no campo "Parcela isenta dos proventos de aposentadoria..." — esse valor inclui mensais + 13º somados. O agente precisa **separar**:

- Se o cliente completou 65 antes de 2025 e tem 1 fonte pagadora: `13º = total ÷ 13`, `valor anual = total - 13º`
- Se o cliente completou 65 em maio/2025 (exemplo): `13º = total ÷ (14 - mês_inicio) = total ÷ 9`, `valor anual = total - 13º`

**Estouro de limite**: se o cliente tem 2+ fontes pagadoras e a soma anual ultrapassa R$ 22.847,76, o valor excedente vira **tributável recebido de PJ** (reg 21). O PGD oferece transferência automática quando o usuário confirma.

**Comportamento esperado do agente**:
- Se 1 fonte e total ≤ R$ 24.751,74 (12 × 1.903,98 + 1.903,98): usar a divisão simples (1/13).
- Se múltiplas fontes ou total maior: somar todos os comprovantes, identificar o excedente, e em `observacoes` propor: "Soma isenta excede R$ 22.847,76 anual em R$ X — sugerir transferência do excedente pra ficha Rendimentos Tributáveis de PJ".

### Código 11 — Moléstia grave

Lista oficial fechada de doenças (manual p. 93): fibrose cística (mucoviscidose), tuberculose ativa, alienação mental, esclerose múltipla, neoplasia maligna, cegueira (inclusive monocular), hanseníase, paralisia irreversível e incapacitante, hepatopatia grave, cardiopatia grave, doença de Parkinson, espondiloartrose anquilosante, nefropatia grave, estados avançados da doença de Paget (osteíte deformante), contaminação por radiação, AIDS.

**Comprovação obrigatória**: laudo pericial emitido por serviço médico oficial da União, estados, DF ou municípios.

**Atenção pro agente**: se cliente tem aposentadoria sem 65 anos e quer enquadrar em código 11, perguntar pelo laudo. Em `observacoes`, sempre que classificar como código 11 sem ter visto o laudo: `"Código 11 (moléstia grave) — verificar se laudo pericial oficial está em mãos"`.

### Códigos 05, 06, 07 — Ganhos de capital com programa GCAP

Esses 3 códigos podem ter o valor:
- **Calculado pelo programa** (preencher GCAP → transporta automaticamente pra cá)
- **Informado pelo contribuinte** (se está dispensado de preencher GCAP)

O agente não preenche GCAP. Quando identificar essa situação em informes, classificar conforme tipo de alienação, valor de alienação, e mencionar em `observacoes` se vai ou não exigir preenchimento do GCAP separado.

### Código 14 vs Código 19 — Doação/Herança vs Meação

- **14**: você RECEBE doação ou herança (em vida ou por morte)
- **19**: você RECEBE bens via divisão de bens em divórcio / dissolução de união estável

Comum confundir: quando o cônjuge falece e os bens passam ao sobrevivente, parte é **meação** (cód 19, era dele) e parte é **herança** (cód 14, vinha do falecido).

### Código 28 — Pensão alimentícia recebida

**Recente**: o STF declarou inconstitucional a tributação da pensão alimentícia (ADI 5422/DF, decisão 2022). Antes era tributável. Agora é **integralmente isenta**.

**O que NÃO é cód 28**:
- Pensão por morte → tributável (a menos que receptor tenha moléstia grave → cód 11)
- Pensão de previdência social comum → tributável
- "Pensão" administrativa não-decorrente de relação familiar → tributável

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **`codigo` deve estar na whitelist**: `["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","27","28","99"]`. Não permitir 26 nem outros.
2. **Código 10 com valor mensal > R$ 1.903,98**: alerta — valor excedente deveria virar tributável (reg 21).
3. **Código 13 (sócio Simples)**: verificar limite (% de presunção do IRPJ × receita bruta) — alerta se exceder.
4. **Códigos 05/20/21** (limites mensais R$ 20k/35k): se valor de alienação > limite, transferir cálculo pra exclusivos código 02 (ganho de capital tributável).
5. **Códigos 08/14/19** com origem em "não-residente": forçar reclassificação pra 99 com descrição.

---

## Pendências relacionadas (a tratar em rodadas futuras)

| Pendência | Status |
|---|---|
| **Engenharia reversa do CRC do reg 84** | bloqueio defensivo no `App.jsx` linha 1614 — atualização ignorada silenciosamente. Sem isso, agente só pode propor remoção, não update direto |
| Campo `codigo` no schema de `rendimentos_isentos_atualizados` | só faz sentido depois de resolver o CRC reg 84 |
| Campo `rendimentos_isentos_novos_aviso` no schema | não existe hoje — necessário pra IA propor isento novo (reg 84 ou 86 conforme tipagem). Hoje a IA pode propor em `observacoes`, contador adiciona manualmente |
| Validação automática de limites (cód 10, 13, 05/20/21) | a implementar como alertas amarelos no card de aprovação |
| Vinculação isento↔bem na UI | UI atual não mostra que um isento código 12 está vinculado ao bem `Grupo 04 Cód 01` — contador pode duplicar |
| Páginas 75-113 do manual ainda não cobrem TODOS os detalhes operacionais de cada código — escopo deste arquivo é só a tabela de classificação | ok |

---

## Próximos KNOWLEDGE_06 planejados

- **06H** — Códigos de Rendimentos Sujeitos à Tributação Exclusiva/Definitiva (reg 88 — Manual p. 114-120). **Próxima rodada (6)**.
- **06I** — Fontes pagadoras PJ (reg 21 — Manual p. 51-54). Pendente.
- **06J** — Carnê-Leão (reg 22 e 49 — Manual p. 55-74). Pendente.
- **06K** — Rendimentos Recebidos Acumuladamente (RRA — Manual p. 125-134). Pendente.

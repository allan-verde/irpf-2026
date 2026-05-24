# KNOWLEDGE_06K — Rendimentos Recebidos Acumuladamente (RRA)

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Rendimentos Recebidos Acumuladamente" (p. 125-134). Ficha "Rendimentos Tributáveis de Pessoa Jurídica Recebidos Acumuladamente" — abas Titular e Dependentes.

## O que é RRA

São rendimentos tributáveis recebidos **em 2025** mas correspondentes a **anos-calendário anteriores**, normalmente decorrentes de:
- Decisões da Justiça do Trabalho (verbas salariais atrasadas, FGTS judicial)
- Decisões da Justiça Federal / Estadual / DF (precatórios, RPVs)
- Acordos judiciais sobre rendimentos retroativos

**NÃO é RRA**:
- Rendimentos do PRÓPRIO ano-calendário do recebimento (mesmo se atrasados dentro do ano) — vão pra ficha normal
- Pensão por morte recebida em parcelas (vai pra PJ Titular)
- 13º salário comum do ano (vai pra PJ Titular, IRPF transporta pra exclusivo cód 01)

## Estado da plataforma e diretiva pro agente

**A plataforma atualmente NÃO trata RRA no patch JSON.** Não há:
- Parsing do registro de RRA no `.DBK` (reg desconhecido — provavelmente próximo dos reg 21/22)
- Campos `rra_*` no schema do patch (nem do agente, nem do `App.jsx`)
- Cards de aprovação na UI

> Observação: o `App.jsx` LÊ totalizadores de RRA do PDF da declaração anterior (`imposto_retido_rra` no schema de extração) e EXIBE seções vazias no PDF report (`semInfo()`). Isso é só pra resumo da declaração antiga — não dá pra propor RRA novo via patch.

**Diretiva**: quando o agente identificar evidência de RRA em informes/recibos do cliente (sentença trabalhista, recibo de precatório, decisão judicial com pagamento de verba retroativa):

1. **NÃO inclua em nenhum array do patch** — não há slot
2. **NÃO inclua o principal em `rendimentos_isentos_atualizados`** — RRA tributável (principal) **NÃO** é isento; apenas os JUROS DE MORA são isentos (cód 27, transportado automaticamente pelo PGD quando a ficha RRA é preenchida)
3. **Inclua em `observacoes`** no formato:
   ```
   RRA IDENTIFICADO — Fonte <CNPJ>/<nome> · Principal R$ <X> · Juros mora R$ <Y> · IRRF R$ <Z> · Mês recebimento <MM>/2025 · Nº meses estimado <N> · Anos-calendário <de YYYY a YYYY>. Lançar manualmente na ficha "Rendimentos Recebidos Acumuladamente" do PGD. Decisão de tributação (Exclusiva na Fonte vs Ajuste Anual) — ver KNOWLEDGE_06K.
   ```
4. **Componentes que sim entram em outros slots do patch**:
   - **Honorários do advogado** pagos pelo cliente pra receber o RRA → `pagamentos_novos_aviso` ou `pagamentos_atualizados`, código **60** (ação não-trabalhista) ou **61** (ação trabalhista) — ver KNOWLEDGE_06C
   - **Pensão alimentícia paga** sobre o RRA (raro) → `pagamentos_*`, código 30/31/33/34 conforme natureza (KNOWLEDGE_06C)

---

## Estrutura da ficha (manual p. 125-134)

A ficha RRA tem duas abas: **Titular** e **Dependentes**.

### Campos por lançamento

Cada RRA da mesma fonte pagadora num mesmo mês de recebimento é um lançamento:

| Campo | Descrição |
|---|---|
| **Opção pela forma de tributação** | "Exclusiva na Fonte" ou "Ajuste Anual" — irretratável após 29/05/2026 (exceção: retenção indevida) |
| **CPF/CNPJ da fonte pagadora** | Quem pagou (empregador, INSS, ente federativo) |
| **Nome da fonte pagadora** | |
| **Rendimentos tributáveis** | Principal — quaisquer acréscimos + 13º recebido acumuladamente, EXCETO juros de mora (vão em campo separado) |
| **Total Rendimentos Tributáveis** | Calculado pelo programa (= Rendimentos tributáveis + Parcela isenta 65 anos *se opção é Exclusiva*) |
| **Parcela isenta 65 anos** | Quando RRA inclui aposentadoria/pensão e o beneficiário tinha ≥ 65 |
| **Valor recebido referente a juros** | Juros de mora pelo atraso — vai pra **Isento código 27** (transportado auto) |
| **Contribuição previdenciária oficial** | INSS retido sobre o RRA |
| **Pensão alimentícia** | Pensão paga sobre o RRA (judicial ou escritura) |
| **Imposto retido na fonte** | IRRF retido pelo pagador |
| **Mês do recebimento** | Mês em 2025 quando recebeu (1-12) |
| **Número de meses** | A quantos meses se refere o rendimento (ex: RRA de 44 meses) |

### Despesas dedutíveis (apuração da base)

Tributação "Exclusiva na Fonte":
- Pensão alimentícia paga (mesmo lançamento)
- Contribuição previdenciária oficial (mesmo lançamento)

Os honorários advocatícios e pensão alimentícia podem ser **excluídos** da base de cálculo proporcionalmente entre tributáveis e isentos — esse cálculo o PGD faz quando preenchido em "Pagamentos Efetuados" código 60/61 (honorários) e código 30-34 (pensão).

---

## Opções de tributação

### "Ajuste Anual"

- RRA integra a base de cálculo normal da DAA junto com os demais rendimentos do ano
- IR retido pela fonte vira **antecipação** do imposto devido
- Usado quando: contribuinte está em faixa baixa de IR e o ajuste é mais favorável que a tributação exclusiva
- Cálculo do imposto: aplica tabela progressiva anual sobre a base + RRA

### "Exclusiva na Fonte" (padrão / default)

- IR sobre RRA é calculado em apartado, usando tabela progressiva mensal × número de meses
- Valor entra na ficha **Rendimentos Sujeitos à Tributação Exclusiva/Definitiva** código **07** (titular) ou **09** (dependentes) — ver KNOWLEDGE_06H
- Usado quando: o RRA é grande e o cálculo "diluído" pelos meses é mais favorável que somar tudo no Ajuste Anual

### Regras críticas

- **Irretratável após 29/05/2026** (exceção: se a fonte pagadora não fez retenção conforme a IN RFB 1.500/2014, ou fez retenção indevida ou a maior)
- **Mesma opção pra todos os RRAs do mesmo beneficiário** (titular ou cada dependente individualmente)
- Pode ser **diferente entre titular e dependente** (cada um escolhe)
- "Exclusiva na Fonte" **NÃO permite** beneficiar-se de parcela isenta 65+ — esse valor é **somado** ao tributável pra cálculo

---

## Componentes do RRA que desmembram em OUTRAS fichas

Ao receber um RRA, o contribuinte tipicamente precisa preencher **múltiplas fichas** do PGD:

| Componente | Onde lançar |
|---|---|
| Principal tributável (rendimentos atrasados) | **Ficha RRA** (preenche aqui) |
| Juros de mora | **Ficha RRA** (campo "Valor recebido referente a juros") → PGD transporta auto pra **Isento código 27** (ver 06G) |
| Parcela isenta 65 anos (se opção "Ajuste Anual") | **Ficha RRA** (campo "Parcela isenta 65 anos") → PGD transporta auto pra **Isento código 10** (ver 06G) |
| **Honorários do advogado** | **Ficha Pagamentos Efetuados**, código **60** (não-trabalhista) ou **61** (trabalhista) — ver 06C |
| **Pensão alimentícia paga** sobre o RRA | **Ficha Pagamentos Efetuados**, código **30/31/33/34** conforme natureza — ver 06C |
| **Contribuição previdenciária oficial** retida sobre o RRA | **Ficha RRA** (campo "Contribuição previdenciária oficial") + soma na Previdência Oficial do Resumo |
| **IRRF retido** sobre o RRA | **Ficha RRA** (campo "Imposto retido na fonte") → vai pra Imposto Pago/Retido |

---

## Casos especiais

### RRA em parcelas — número de meses proporcional

Se uma mesma fonte pagadora pagou um RRA em parcelas em **meses distintos**, o número de meses é proporcionalizado por parcela.

**Fórmula**:
```
nº meses parcela = (nº total de meses) × (valor parcela / soma das parcelas)
```
Arredondamento da 1ª casa decimal com regras específicas (ver manual p. 130-131):
- Algarismo da 2ª casa < 5: mantém
- Algarismo da 2ª casa > 5: arredonda pra cima
- Algarismo da 2ª casa = 5: depende da 3ª casa (0-4 mantém, 5-9 arredonda pra cima)

**Exemplo (manual p. 130-131)**: RRA de 44 meses, R$ 300.000 total, parcelado em 5 meses de 2025:
- Janeiro R$ 133.000 → 44 × 133.000/300.000 = 19,50 → **19,5 meses**
- Fevereiro R$ 4.000 → 44 × 4.000/300.000 = 0,58 → **0,6 meses**
- Março R$ 3.800 → 44 × 3.800/300.000 = 0,557 → **0,6 meses**
- Abril R$ 3.750 → 44 × 3.750/300.000 = 0,550 → **0,5 meses**
- Maio R$ 155.450 → 44 × 155.450/300.000 = 22,79 → **22,8 meses**

### RRA em parcelas — mesmo mês

Se uma mesma fonte pagadora pagou múltiplas parcelas **no mesmo mês**, soma-se tudo e usa-se o número de meses total. O IR é apurado sobre o total (não por parcela).

### RRA complementar

Pagamentos posteriores que complementam o RRA original (diferenças apuradas depois). O imposto retido é a **diferença** entre o IR sobre a totalidade (incluindo o complemento) e a soma dos retidos anteriores.

- Se o complemento se refere a RRA original recebido em **ano-calendário anterior** → opção de tributação pode ser **independente** da opção do RRA original
- Se o complemento se refere a RRA original recebido no **mesmo ano** → opção tem que ser a **mesma** do RRA original

### Sucessão causa mortis

Quando o RRA é transmitido a sucessor pelo encerramento de espólio, o **número de meses** aplicado é o mesmo do de cujus.

---

## ⚠️ Correção retroativa do Exemplo 4 do `KNOWLEDGE_03_exemplos.md`

O Exemplo 4 antes colocava o principal do RRA em `rendimentos_isentos_atualizados`:

```json
"rendimentos_isentos_atualizados": [
  { "resumo": "RRA · processo judicial", "valor": 50000.00, "origem": "..." }
]
```

**Isso está SEMANTICAMENTE ERRADO** — o principal do RRA (R$ 50.000) é **tributável**, não isento. Vai pra ficha RRA própria (que o projeto não suporta automaticamente). Apenas os **juros de mora** vão pra Isento 27 (transportado pelo PGD).

Esse exemplo foi corrigido nesta rodada — o principal foi movido pra `observacoes`, mantendo só o pagamento ao advogado (código 61, ação trabalhista — já correto após a rodada 1 de pagamentos).

---

## Validações que o Estúdio deve aplicar (a implementar)

1. **Não permitir** `rendimentos_isentos_atualizados` com descrição/origem mencionando "RRA", "processo judicial", "verba salarial", "precatório" e valor > 0 — flag erro de classificação do agente, sugerir mover pra `observacoes`.

2. **Quando `observacoes` contiver "RRA IDENTIFICADO"**, exibir warning amarelo no contador no card de aprovação informando que essa parte exige lançamento manual no PGD.

3. **Honorários advogado código 60/61 sem RRA correspondente em `observacoes`**: nada urgente, mas pode-se alertar verificação. Honorários advocatícios sem ação judicial são código 62 (advogado consultivo).

---

## Pendências (a tratar em rodadas futuras)

| Pendência | Status |
|---|---|
| **Registro do `.DBK` que armazena RRA** | Desconhecido. Suspeita: reg próximo ao 22 (Carnê-Leão) ou reg dedicado tipo 23/24. Precisa de DBK preenchido pra Inspetor mapear |
| Campos `rra_titular_*` e `rra_dependentes_*` no schema do patch | A criar quando o reg for engenheirado |
| Parser / writer / UI cards no `App.jsx` | A criar com schema |
| `rendimentos_isentos_novos_aviso` no schema | Não existe — atualmente impossível propor isento 27 (juros mora) novo. Quando reg 84 CRC for engenheirado, ambas pendências podem virar juntas |
| Cálculo automático de nº de meses por parcela | A implementar como helper se for automatizar RRA |

**Critério pra implementar**: quando aparecer ≥3 clientes/ano com RRA, ou caso de alto valor (>R$ 100k), abrir rodada técnica.

---

## Cobertura do Manual

Com este 06K, **todas as 12 fichas principais** da declaração estão documentadas (06A–06K). Próximas rodadas técnicas dependem de engenharia reversa do `.DBK`:
- Reg 84 CRC (destrava update de isentos tipados — cód 09, 14, 28)
- Reg 22 completo (104 chars não-mapeados — colunas Aluguéis / Outros / Exterior / Previdência / Livro Caixa / DARF do Carnê-Leão)
- Reg de doações (suspeita: reg 24)
- Reg de RRA (desconhecido)

Esses só destravam quando você tiver `.DBK` de cliente real com esses campos preenchidos pelo PGD.

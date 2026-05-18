# Tabelas de códigos do PGD (IRPF 2026, ano-cal 2025)

Use estas tabelas pra preencher os campos `codigo` e `grupo` nas listas do patch.

## Grupos e códigos de bens e direitos (reg 27 do .DBK)

O grupo é numérico de 2 dígitos, o código também. Aparecem como `grupo/codigo`.

### Grupo 01 — Aplicações e investimentos
| Código | Tipo |
|---|---|
| 01 | Depósito em conta corrente / poupança |
| 02 | Aplicação de renda fixa (CDB, RDB, etc.) |
| 03 | Letra de Crédito Imobiliário (LCI) / Letra de Crédito do Agronegócio (LCA) |
| 04 | Tesouro Direto |
| 05 | Fundos de investimento |
| 06 | Ações |
| 07 | Outras aplicações |

### Grupo 02 — Bens móveis
| Código | Tipo |
|---|---|
| 01 | Veículo automotor terrestre (carro, moto) |
| 02 | Embarcação |
| 03 | Aeronave |
| 04 | Joias, obras de arte, antiguidades |
| 05 | Outros bens móveis |

### Grupo 03 — Participações societárias
| Código | Tipo |
|---|---|
| 01 | Quotas de capital em sociedade limitada |
| 02 | Ações de S.A. fechada |
| 03 | Empresa individual |
| 04 | Outras participações |

### Grupo 04 — Aplicações e investimentos (continuação detalhada)
Subdivisões mais granulares de aplicações financeiras. Quando o informe especifica (ex.: "CDB pré"), usar grupo 04 com código correspondente.

| Código | Tipo |
|---|---|
| 01 | Depósito em CC remunerada |
| 02 | RDB |
| 03 | LCI / LCA |
| 04 | Tesouro Direto |
| 05 | Fundos de investimento |
| 06 | Criptoativos |
| 07 | Outras aplicações |

### Grupo 12 — Bens imóveis
| Código | Tipo |
|---|---|
| 01 | Prédio residencial |
| 02 | Prédio comercial |
| 03 | Galpão |
| 04 | Terreno |
| 05 | Sala / conjunto |
| 11 | Apartamento |
| 12 | Casa |
| 13 | Terreno |
| 14 | Imóvel rural |
| 19 | Outros bens imóveis |

### Grupo 13 — Bens imóveis no exterior

### Grupo 99 — Outros bens e direitos
| Código | Tipo |
|---|---|
| 01 | Depósito não-remunerado |
| 02 | Caderneta de poupança no exterior |
| 99 | Outros |

## Códigos de pagamentos efetuados (reg 26 — ficha "Pagamentos Efetuados")

| Código | Descrição |
|---|---|
| **01** | Despesas com instrução no Brasil (escola, faculdade, curso técnico) |
| **02** | Despesas com instrução no exterior |
| **09** | Fonoaudiólogos no Brasil (PF) |
| **10** | Médicos no Brasil (PF) |
| **11** | Dentistas no Brasil (PF) |
| **12** | Psicólogos no Brasil (PF) |
| **13** | Fisioterapeutas no Brasil (PF) |
| **14** | Terapeutas ocupacionais no Brasil (PF) |
| 15 | Médicos no exterior |
| 16 | Dentistas no exterior |
| 17 | Psicólogos no exterior |
| 18 | Fisioterapeutas no exterior |
| 19 | Fonoaudiólogos no exterior |
| 20 | Terapeutas ocupacionais no exterior |
| **21** | Hospitais, clínicas, laboratórios e demais PJ que prestam serviços médicos/odontológicos no Brasil |
| 22 | Aparelhos ortopédicos e próteses |
| 23 | Hospitais / clínicas no exterior |
| 24 | Seguros de saúde no Brasil |
| 25 | Seguros de saúde no exterior |
| **26** | Planos de saúde / operadoras no Brasil |
| 27 | Planos de saúde no exterior |
| 33 | Pensão alimentícia paga (decisão judicial ou acordo extrajudicial) |
| **36** | Previdência complementar (PGBL/FAPI) |
| 37 | Contribuição previdenciária INSS (empregado doméstico, autônomo) |
| 40 | Cooperativa odontológica / médica |
| **60** | Aluguel pago (informativo, não dedutível) |
| **70** | Honorários advocatícios pagos relacionados a pensão judicial |
| 72 | Pensão judicial não-alimentícia |

### Decisões comuns

- **LTDA odontológica** (ex.: "F C PEREIRA ODONTOLOGIA LTDA") → código **21** (PJ médica/odonto)
- **Dentista pessoa física** (CPF) → código **11**
- **Mensalidade escolar** (mensal ou anual) → código **01**
- **Plano de saúde Unimed/Bradesco Saúde/etc.** → código **26**
- **PGBL/FAPI** → código **36**
- **Honorários advocatícios em ação de pensão** → código **70**
- **Aluguel pago a PF** → código **60** (e o locador entra também em `rendimentos_pf_carne_leao`)

## Códigos de dívidas e ônus reais (reg 28 — ficha "Dívidas")

| Código | Descrição |
|---|---|
| **11** | Estabelecimento bancário comercial (banco, financeira) |
| 12 | Instituição financeira no exterior |
| 13 | Pessoa física |
| 14 | Pessoa jurídica |
| 15 | Outras dívidas |
| 16 | Decorrentes de aquisição de bens |
| 17 | Operações de mercado financeiro / capital |
| 19 | Outros |
| 21 | Dívidas no exterior |

### Decisões comuns

- **Financiamento de veículo / CDC** → código **11** (banco)
- **Cheque especial / saldo negativo CC** → código **11**
- **Empréstimo de terceiros PF** → código **13**
- **Cartão de crédito (parcelado)** → código **11** (se for o banco emissor)

## Códigos de rendimentos sujeitos à tributação exclusiva/definitiva (reg 88)

| Código | Descrição |
|---|---|
| **06** | Rendimentos de aplicações financeiras (CDB pré, RDB, LCI/LCA não-isenta, Tesouro, fundos) |
| 10 | 13º salário (parcela tributada exclusivamente) |
| 12 | Ganhos de capital na alienação de bens / direitos |
| 18 | Juros sobre Capital Próprio (JCP) |
| 24 | Outros rendimentos sujeitos a tributação exclusiva |

### Distinção importante

- **Rendimentos ISENTOS** (não pagam IR) → reg 86 → `rendimentos_isentos_atualizados`
  - Lucros e dividendos
  - Caderneta de poupança
  - LCI/LCA isentas
  - Indenizações por rescisão trabalhista
- **Rendimentos EXCLUSIVOS** (IR já retido na fonte, não compõem ajuste) → reg 88 → `rendimentos_exclusivos_*`
  - Aplicações financeiras (CDB, RDB, fundos)
  - 13º salário
  - JCP
  - Ganhos de capital

## Códigos de tipo de dependente

| Código | Tipo |
|---|---|
| 01 | Companheiro(a) com filho ou união estável >5 anos |
| 03 | Filho(a) / enteado(a) até 21 anos |
| 04 | Filho(a) / enteado(a) com universitário até 24 anos |
| 05 | Filho(a) / enteado(a) inválido(a) (qualquer idade) |
| 11 | Pai / mãe |
| 14 | Avó / avô / bisavô / bisavó |
| 21 | Irmão / irmã |
| 22 | Irmão / irmã universitário(a) até 24 anos |
| 26 | Outros (com guarda judicial) |

## Códigos de tipo de beneficiário (reg 88)

Usado em `rendimentos_exclusivos_novos_aviso.tipo_beneficiario`:

| Código | Significado |
|---|---|
| **T** | Titular (o próprio declarante) |
| **D** | Dependente |
| **A** | Alimentando (recebedor de pensão alimentícia paga pelo declarante) |

Use sempre `"T"` por padrão, salvo se o rendimento foi auferido por um dependente listado na declaração.

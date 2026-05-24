# Exemplos comentados — casos comuns que aparecem nos informes

Estes exemplos mostram como traduzir documentos reais em entries do patch JSON. Use como referência quando estiver em dúvida.

---

## Exemplo 1 — Informe de banco com saldo de CC + aplicação + rendimento

**Template do cliente já tem:**
- `B5` (reg 27): Saldo poupança BB, val_atual 0,14 (em 31/12/2024)
- `B6` (reg 27): CDB BB Rende Fácil, val_atual 0,00 (em 31/12/2024)
- (sem reg 88)

**Informe recebido:**
> Banco do Brasil — Informe de Rendimentos 2025
> CC 12345-6: saldo 31/12/2025 = R$ 850,30
> CDB Rende Fácil: saldo 31/12/2025 = R$ 28.000,00
> Rendimento de aplicações financeiras (CDB): R$ 1.234,56 — IRRF R$ 184,56

**Patch correto:**

```json
{
  "bens_atualizados": [
    { "resumo": "Poupança BB · saldo 850.30", "idx": 5, "valor_atual": 850.30, "origem": "informe Banco do Brasil" },
    { "resumo": "CDB Rende Fácil · saldo 28000", "idx": 6, "valor_atual": 28000.00, "origem": "informe Banco do Brasil" }
  ],
  "rendimentos_exclusivos_novos_aviso": [
    {
      "resumo": "Aplicações financeiras CDB · BB",
      "codigo": "06",
      "tipo_beneficiario": "T",
      "cpf_beneficiario": "30356369315",
      "cnpj_fonte": "00000000000191",
      "nome_fonte": "BANCO DO BRASIL S.A.",
      "valor": 1234.56,
      "origem": "informe Banco do Brasil"
    }
  ]
}
```

**Pontos importantes:**
- Saldo do CDB vai pra `bens_atualizados` (atualiza B6), NÃO pra `bens_novos_aviso`
- Rendimento do CDB vai pra `rendimentos_exclusivos_novos_aviso` (reg 88 com código 06)
- Os dois são coisas diferentes: saldo é o quanto está aplicado; rendimento é o quanto rendeu
- **Não confunda**: IRRF retido não vai no patch, é informação contábil já consolidada
- `cpf_beneficiario` é o CPF do titular declarante

---

## Exemplo 2 — Dentista com pacientes PF e clínicas LTDA

**Cliente é dentista autônoma. Template tem:**
- Reg 21 (fonte pagadora): F C Pereira Odontologia LTDA (PJ própria)
- (sem reg 49 — Carnê-Leão)

**Informe / recibos recebidos:**
> Recibo 1: Melissa Santos (CPF 826.930.303-82) pagou R$ 4.500 ao longo de 2025 por consultas
> Recibo 2: Clínica Magna Fonseca LTDA (CNPJ 44.134.485/0001-81) — repasse de R$ 6.800 referente a procedimentos em 2025
> Recibo 3: Hospital São Carlos LTDA — repasse de R$ 12.000 referente a 2025

**Patch correto:**

```json
{
  "rendimentos_pf_carne_leao": [
    {
      "resumo": "MELISSA SANTOS · paciente",
      "cpf": "82693030382",
      "nome": "MELISSA SANTOS",
      "valor_total_ano": 4500.00,
      "valores_mensais": { "1":400, "2":400, "3":400, "4":400, "5":400, "6":400, "7":300, "8":300, "9":300, "10":300, "11":300, "12":600 },
      "natureza": "honorarios_servico_prestado",
      "origem": "recibos paciente Melissa Santos"
    }
  ],
  "fontes_novas": [
    {
      "resumo": "Magna Fonseca · 44.134.485",
      "cnpj": "44134485000181",
      "nome": "CLINICA MAGNA FONSECA LTDA",
      "rendimentos_tributaveis": 6800.00,
      "decimo_terceiro": 0,
      "inss": 0,
      "ir_retido": 0,
      "origem": "recibo Clínica Magna Fonseca"
    },
    {
      "resumo": "Hospital São Carlos · CNPJ",
      "cnpj": "CNPJ_14_DIGITOS",
      "nome": "HOSPITAL SAO CARLOS LTDA",
      "rendimentos_tributaveis": 12000.00,
      "ir_retido": 0,
      "origem": "recibo Hospital São Carlos"
    }
  ]
}
```

**Pontos importantes:**
- Melissa é PF (CPF) → `rendimentos_pf_carne_leao` (Carnê-Leão)
- Clínica Magna é PJ (CNPJ) → `fontes_novas` (não está no template ainda)
- Se o recibo NÃO informa os meses, distribua proporcionalmente ou marque tudo em dezembro
- `valor_total_ano` deve ser igual à soma dos `valores_mensais`

---

## Exemplo 3 — Pagamentos efetuados: mensalidade escolar + plano saúde + dentista

**Informes recebidos:**
> 1. Colégio São José (CNPJ 11.222.333/0001-44) — mensalidade total 2025: R$ 18.000 (filho dependente)
> 2. Unimed (CNPJ 22.333.444/0001-55) — plano de saúde titular: R$ 8.400
> 3. Dr. João Silva (CPF 123.456.789-01) — consultas odontológicas particulares: R$ 1.200

**Patch correto:**

```json
{
  "pagamentos_novos_aviso": [
    {
      "resumo": "Mensalidade escolar · Colégio São José",
      "codigo": "01",
      "cnpj_cpf": "11222333000144",
      "nome": "COLEGIO SAO JOSE LTDA",
      "valor_pago": 18000.00,
      "origem": "boletos Colégio São José"
    },
    {
      "resumo": "Plano saúde · Unimed",
      "codigo": "26",
      "cnpj_cpf": "22333444000155",
      "nome": "UNIMED",
      "valor_pago": 8400.00,
      "origem": "informe Unimed"
    },
    {
      "resumo": "Dentista PF · Dr. João Silva",
      "codigo": "11",
      "cnpj_cpf": "12345678901",
      "nome": "JOAO SILVA",
      "valor_pago": 1200.00,
      "origem": "recibos dentista Dr. João Silva"
    }
  ]
}
```

**Pontos importantes:**
- Colégio (PJ educacional) → código **01** (NÃO 21 — esse é só pra saúde!)
- Unimed (operadora de plano) → código **26**
- Dr. João Silva é PF (CPF, 11 dígitos) → código **11** (dentista PF). Se fosse LTDA, seria 21.
- `cnpj_cpf` pode ter 14 (CNPJ) ou 11 (CPF) dígitos — o estúdio detecta automaticamente

---

## Exemplo 4 — Recebimento de processo judicial + honorários advocatícios

**Cliente recebeu R$ 50.000 de um processo judicial (RRA - Rendimentos Recebidos Acumuladamente) e pagou R$ 5.000 ao advogado.**

**Patch correto:**

```json
{
  "rendimentos_isentos_atualizados": [
    {
      "resumo": "RRA · processo judicial",
      "idx": "(novo, sem idx)",
      "valor": 50000.00,
      "origem": "documentos do processo judicial"
    }
  ],
  "pagamentos_novos_aviso": [
    {
      "resumo": "Honorários advocatícios · Dr. Antonio Santos",
      "codigo": "61",
      "cnpj_cpf": "98765432101",
      "nome": "ANTONIO SANTOS ADVOGADO",
      "valor_pago": 5000.00,
      "origem": "recibo honorários advogado"
    }
  ]
}
```

**Atenção:**
- Receita de processo: depende da natureza. Se for indenização trabalhista/cível → isentos. Se for verba salarial atrasada (RRA) → pode ir em fonte tributável com tratamento especial. Quando estiver em dúvida, mencione em `observacoes` que o tratamento depende da natureza do crédito recebido.
- Honorários do advogado: o código depende do tipo da ação (Manual IRPF 2026 p. 363):
  - **60** — ação judicial NÃO-trabalhista (cível, família, tributária, previdenciária, sucessões)
  - **61** — ação judicial trabalhista (caso típico de RRA por verba salarial atrasada — usado neste exemplo)
  - **62** — demais honorários (consultivos, administrativos, fora de ação judicial)
  - **NÃO usar** código 70 — esse é Aluguéis de imóveis. CPF se PF, CNPJ se escritório LTDA.

---

## Exemplo 5 — Dívida CDC com amortização + juros

**Template tem:**
- `V1` (reg 28): "CDC RENOVAÇÃO" cod 11, val_anterior 22.983,08, val_atual 0,00

**Informe Funci recebido:**
> CDC Renovação — Saldo devedor em 31/12/2025: R$ 19.642,27
> Prestações pagas em 2025: R$ 6.516,96
> Juros pagos em 2025: R$ 483,85
> Amortização em 2025: R$ 6.033,11

**Patch correto:**

```json
{
  "dividas_atualizadas": [
    {
      "resumo": "CDC Funci",
      "idx": 1,
      "valor_atual": 19642.27,
      "valor_pago": 6516.96,
      "origem": "informe Banco Funci"
    }
  ]
}
```

**Pontos:**
- `valor_pago` = 6516,96 (já é a soma "Prestações pagas"). Se o informe só desse separado, somar Juros + Amortização = 483,85 + 6.033,11 = 6.516,96
- `valor_atual` = saldo em 31/12/2025
- `valor_anterior` não precisa atualizar — o template já tem 22.983,08 que é o saldo em 31/12/2024 (correto)

---

## Exemplo 6 — Saldo negativo de conta corrente

**Template tem:**
- `B7` (reg 27): "CONTA CORRENTE BB" val_atual -R$ 1.391,39 ⚠️ ERRO de declaração anterior

**Diagnóstico:** saldo negativo NÃO é bem — é dívida. Precisa REMOVER esse bem e CRIAR uma dívida.

**Patch correto:**

```json
{
  "bens_a_remover": [
    { "idx": 7, "motivo": "saldo negativo de CC é dívida (cod 11), não bem" }
  ],
  "dividas_novas_aviso": [
    {
      "resumo": "Saldo negativo CC BB",
      "codigo": "11",
      "discriminacao": "SALDO NEGATIVO EM CONTA CORRENTE BB / AG xxxx / CC xxxxxxx-x",
      "valor_anterior": 0,
      "valor_atual": 1391.39,
      "valor_pago": 0,
      "credor": "BANCO DO BRASIL",
      "origem": "extrato Banco do Brasil"
    }
  ]
}
```

**REGRA DURA**: nunca emita valor negativo. Saldo a descoberto sempre vira dívida com valor positivo (módulo).

---

## Exemplo 7 — Itens com valor zero a REMOVER (pagamentos, rendimentos exclusivos, rendimentos isentos)

A regra é a mesma pras três categorias: itens com valor R$ 0,00 no template do PGD vêm da pré-preenchida do ano anterior — se não recorreram este ano, devem ser sugeridos pra remoção.

**Template tem:**

*Pagamentos (reg 26):*
- `P5`: RADIOLOGIA DIGITAL CENTRO LTDA, cod 21, valor_pago 0,00
- `P6`: GS SERVICOS ODONTOLOGICOS LTDA, cod 21, valor_pago 0,00

*Rendimentos exclusivos/definitivos (reg 88):*
- `E5`: ITAU UNIBANCO S.A., cod 06, valor 0,00
- `E6`: BANCO SANTANDER, cod 06, valor 0,00

*Rendimentos isentos (reg 86 e 84):*
- `I3`: ALGUMA EMPRESA LTDA, valor 0,00

**Informes recebidos:** nada mais dessas fontes.

**Patch correto:**

```json
{
  "pagamentos_a_remover": [
    { "idx": 5, "motivo": "valor R$ 0,00 sem recorrência em 2025" },
    { "idx": 6, "motivo": "valor R$ 0,00 sem recorrência em 2025" }
  ],
  "rendimentos_exclusivos_a_remover": [
    { "idx": 5, "motivo": "valor R$ 0,00 sem recorrência em 2025" },
    { "idx": 6, "motivo": "valor R$ 0,00 sem recorrência em 2025" }
  ],
  "rendimentos_isentos_a_remover": [
    { "idx": 3, "motivo": "valor R$ 0,00 sem recorrência em 2025" }
  ]
}
```

**Por quê:** o PGD pré-preenche os itens do ano anterior pra facilitar. Se não recorreram este ano, devem sair da declaração pra não poluir. O Estúdio mostra essas remoções com checkbox: o contador pode desmarcar individualmente se algum item ainda for válido (ex: continua recebendo dividendos da empresa mesmo zerado no informe do ano).

**Cuidado importante:** se houver informe atualizando o valor pra > 0, **NÃO** remova — coloque em `pagamentos_atualizados` / `rendimentos_exclusivos_atualizados` / `rendimentos_isentos_atualizados`.

**Bens e dívidas com valor zero** seguem regra diferente: **NÃO** vão pra `*_a_remover` automaticamente. Bens zerados podem ser cripto que perdeu valor mas o cliente ainda detém, conta-corrente zerada por questão de timing, etc. O Estúdio marca como REVISAR e o contador decide manualmente.

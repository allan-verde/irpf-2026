# Schema JSON completo do patch

Este é o formato EXATO que você deve retornar como resposta. Todos os campos numéricos são números (sem aspas), todos os textos com aspas, datas no formato DDMMAAAA, CNPJ/CPF apenas dígitos.

## Estrutura geral

```json
{
  "contribuinte": null,
  "endereco": null,
  "fontes_pagadoras": [],
  "fontes_novas": [],
  "rendimentos_pf_carne_leao": [],
  "bens_atualizados": [],
  "bens_novos_aviso": [],
  "bens_a_remover": [],
  "dividas_atualizadas": [],
  "dividas_novas_aviso": [],
  "dividas_a_remover": [],
  "dependentes_atualizados": [],
  "dependentes_novos_aviso": [],
  "dependentes_a_remover": [],
  "rendimentos_isentos_atualizados": [],
  "rendimentos_isentos_a_remover": [],
  "rendimentos_exclusivos_atualizados": [],
  "rendimentos_exclusivos_novos_aviso": [],
  "rendimentos_exclusivos_a_remover": [],
  "pagamentos_atualizados": [],
  "pagamentos_novos_aviso": [],
  "pagamentos_a_remover": [],
  "ano_referencia": "2025",
  "observacoes": ""
}
```

## Detalhe de cada campo

### `contribuinte` (objeto ou null)

```json
{
  "nome": "MARILENE RIBEIRO COSTA PEREIRA",
  "email": "marilene@exemplo.com",
  "telefone": "98991234567",
  "data_nascimento": "10121963",
  "titulo_eleitor": "1234567890"
}
```
Só incluir campos que MUDARAM. Se nada mudou, use `null`.

### `endereco` (objeto ou null)

```json
{
  "tipo_logradouro": "AVENIDA",
  "logradouro": "RUA PROJETADA I",
  "numero": "14",
  "complemento": "CASA 2",
  "bairro": "JARDIM AMERICA",
  "cep": "65060000",
  "municipio": "SAO LUIS",
  "uf": "MA"
}
```

### `fontes_pagadoras` (array — atualizações)

```json
[
  {
    "resumo": "F C PEREIRA ODONTOLOGIA · 52.318.822",
    "cnpj": "52318822000119",
    "nome": "F C PEREIRA ODONTOLOGIA LTDA",
    "rendimentos_tributaveis": 154889.70,
    "decimo_terceiro": 12907.47,
    "inss": 14000.00,
    "ir_retido": 5000.00,
    "origem": "informe F C Pereira Odontologia"
  }
]
```
Indexado pelo CNPJ. Se a fonte já está no template (lista F1, F2...), atualiza por CNPJ.

### `fontes_novas` (array — fontes que NÃO estão no template)

Mesmo formato de `fontes_pagadoras`. **CNPJ obrigatório, 14 dígitos**. NUNCA coloque CPF aqui.

### `rendimentos_pf_carne_leao` (array — pagadores PESSOA FÍSICA)

```json
[
  {
    "resumo": "MELISSA SANTOS · CPF 826.930",
    "cpf": "82693030382",
    "nome": "MELISSA SANTOS",
    "valor_total_ano": 4500.00,
    "valores_mensais": {
      "1": 0, "2": 0, "3": 500,
      "4": 500, "5": 500, "6": 500,
      "7": 500, "8": 500, "9": 500,
      "10": 500, "11": 500, "12": 0
    },
    "natureza": "honorarios_servico_prestado",
    "origem": "recibos paciente Melissa Santos"
  }
]
```
`natureza` aceita: `honorarios_servico_prestado`, `aluguel`, `outros`. `cpf` obrigatório (11 dígitos).

### `bens_atualizados` (array)

```json
[
  {
    "resumo": "CDB Pré · BB",
    "idx": 4,
    "valor_atual": 28000.00,
    "valor_anterior": 1216.91,
    "origem": "informe Banco do Brasil"
  }
]
```
`idx` é o índice do bem no template (B1, B2, B3...). `valor_atual` = saldo em 31/12/2025. `valor_anterior` (opcional) = saldo em 31/12/2024, só inclua se mudou.

### `bens_novos_aviso` (array — bens que NÃO estão no template)

```json
[
  {
    "resumo": "LCI BB",
    "grupo": "04",
    "codigo": "03",
    "discriminacao": "BB LCI INFORMADO CNPJ 00.000.000/0001-91 — AG 0001 / CONTA 12345-6 / VALOR 31/12/2025 R$ 5.000,00",
    "valor_anterior": 0,
    "valor_atual": 5000.00,
    "cnpj": "00000000000191",
    "banco": "BANCO DO BRASIL",
    "agencia": "0001",
    "conta": "12345-6",
    "origem": "informe Banco do Brasil"
  }
]
```
Códigos de grupo/código de bens estão em `KNOWLEDGE_02_codigos_pgd.md`.

### `bens_a_remover` (array)

```json
[
  { "idx": 2, "motivo": "Toyota Corola alienado em 2025 (vide nota fiscal de venda)" }
]
```

### `dividas_atualizadas` (array)

```json
[
  {
    "resumo": "CDC Funci",
    "idx": 1,
    "valor_atual": 19642.27,
    "valor_anterior": 22983.08,
    "valor_pago": 6516.96,
    "origem": "informe Banco Funci"
  }
]
```
`valor_pago` = soma de amortização + juros pagos no ano.

### `dividas_novas_aviso` (array)

```json
[
  {
    "resumo": "Saldo negativo CC BB",
    "codigo": "11",
    "discriminacao": "SALDO NEGATIVO EM CONTA CORRENTE BB AG 0001 / CC 12345-6",
    "valor_anterior": 722.95,
    "valor_atual": 1391.39,
    "valor_pago": 0,
    "credor": "BANCO DO BRASIL",
    "origem": "extrato Banco do Brasil"
  }
]
```

### `dividas_a_remover` (array)

```json
[
  { "idx": 1, "motivo": "dívida quitada em 2025 conforme informe Funci" }
]
```

### `dependentes_atualizados` / `dependentes_novos_aviso` / `dependentes_a_remover`

```json
{ "resumo": "JOAO PEREIRA · filho", "idx": 1, "nome": "JOAO PEREIRA", "data_nascimento": "15032010", "cpf": "12345678900" }
```
Códigos de tipo de dependente em `KNOWLEDGE_06D_dependentes.md` (Manual IRPF 2026 p. 359).

### `rendimentos_isentos_atualizados` (reg 86 do .DBK)

```json
[
  { "resumo": "Lucros e dividendos · F C Pereira", "idx": 1, "valor": 25000.00, "origem": "informe F C Pereira Odontologia" }
]
```

### `rendimentos_isentos_a_remover` (reg 86 e 84)

```json
[
  { "idx": 1, "motivo": "valor R$ 0,00 sem recorrência em 2025" }
]
```

### `rendimentos_exclusivos_atualizados` (reg 88)

```json
[
  {
    "resumo": "Aplicações financeiras · Nu Financeira",
    "idx": 1,
    "codigo": "06",
    "valor": 12.45,
    "origem": "informe Nubank"
  }
]
```

### `rendimentos_exclusivos_novos_aviso` (reg 88 NOVO)

```json
[
  {
    "resumo": "Aplicações financeiras · Itaú",
    "codigo": "06",
    "tipo_beneficiario": "T",
    "cpf_beneficiario": "12345678900",
    "cnpj_fonte": "60701190000104",
    "nome_fonte": "ITAU UNIBANCO S.A.",
    "valor": 156.78,
    "origem": "informe Itaú"
  }
]
```
`tipo_beneficiario`: `"T"` = Titular, `"D"` = Dependente, `"A"` = Alimentando.

### `pagamentos_atualizados` (reg 26)

```json
[
  { "resumo": "Plano saúde Caixa", "idx": 8, "valor_pago": 13063.26, "origem": "informe Caixa Assistência" }
]
```

### `pagamentos_novos_aviso` (reg 26 NOVO)

```json
[
  {
    "resumo": "Honorários advocatícios · Dr. João Silva",
    "codigo": "70",
    "cnpj_cpf": "12345678901",
    "nome": "JOAO SILVA ADVOGADO",
    "valor_pago": 5000.00,
    "origem": "recibo honorários advogado"
  }
]
```
`cnpj_cpf`: CNPJ se PJ (14 dígitos), CPF se PF (11 dígitos).

### `pagamentos_a_remover` (reg 26)

```json
[
  { "idx": 5, "motivo": "pagamento R$ 0,00 sem recorrência em 2025" }
]
```

### `ano_referencia`

Sempre `"2025"` (ano-calendário) por enquanto.

### `observacoes`

Texto livre. Use pra alertar sobre:
- Dados faltantes ou ilegíveis nos informes
- Divergências entre informes diferentes
- Itens que pareceram suspeitos mas você não conseguiu confirmar
- Limitações da informação disponível

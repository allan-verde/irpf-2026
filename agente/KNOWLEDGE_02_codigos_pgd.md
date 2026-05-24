# KNOWLEDGE_02 — Índice de Migração

Este arquivo era a fonte original de códigos do projeto, inferida por engenharia reversa de versões antigas do PGD. Ao longo das rodadas de refatoração, todas as tabelas foram migradas pros arquivos `06X` (autoritativos, baseados no Manual de Preenchimento IRPF 2026).

**Use os 06X.** Este arquivo agora é só um índice — não contém mais tabelas de códigos.

## Hierarquia em caso de divergência

Os arquivos `06X` são a fonte autoritativa. Se você (agente) encontrar conflito entre o que está num 06X e qualquer outro lugar do projeto, **siga o 06X**.

## Mapa de migração

| O que você procura | Onde está agora | Fonte (Manual IRPF 2026) |
|---|---|---|
| Bens e Direitos (grupos/códigos) | `KNOWLEDGE_06A_codigos_bens.md` | p. 178-235 |
| Dívidas e Ônus Reais | `KNOWLEDGE_06B_dividas.md` | p. 236-237 |
| Pagamentos Efetuados | `KNOWLEDGE_06C_codigos_pagamentos.md` | p. 363 |
| Dependentes (relação de dependência) | `KNOWLEDGE_06D_dependentes.md` | p. 359 |
| Doações Efetuadas | `KNOWLEDGE_06E_doacoes.md` | p. 364 |
| Tabelas auxiliares (progressiva, dólar, atualização bens) | `KNOWLEDGE_06F_tabelas_auxiliares.md` | p. 354-358 |
| Rendimentos Isentos e Não Tributáveis | `KNOWLEDGE_06G_rendimentos_isentos.md` | p. 75-113 |
| Rendimentos Sujeitos à Tributação Exclusiva | `KNOWLEDGE_06H_rendimentos_exclusivos.md` | p. 114-120 |
| Fontes Pagadoras PJ | `KNOWLEDGE_06I_fontes_pagadoras_pj.md` | p. 51-54 |
| Carnê-Leão (rendimentos PF e exterior) | `KNOWLEDGE_06J_carne_leao.md` | p. 55-74 |
| RRA (Rendimentos Recebidos Acumuladamente) | `KNOWLEDGE_06K_rra.md` | p. 125-134 |

## Códigos de tipo de beneficiário (reg 88)

Único conteúdo que permanece aqui (estrutural, não tabular). Usado em `rendimentos_exclusivos_novos_aviso.tipo_beneficiario` e em campos análogos:

| Código | Significado |
|---|---|
| **T** | Titular (o próprio declarante) |
| **D** | Dependente |
| **A** | Alimentando (recebedor de pensão alimentícia paga pelo declarante) |

Use sempre `"T"` por padrão, salvo se o rendimento foi auferido por um dependente listado na declaração (consultar `KNOWLEDGE_06D` pra tipos de dependente válidos).

## Histórico das migrações

Pra contexto, segue resumo dos erros que existiam no antigo `KNOWLEDGE_02` (todos já corrigidos nos 06X):

- **Pagamentos**: códigos 60 (era "aluguel", real é "advogado não-trabalhista"), 70 (era "advogado", real é "aluguel"), 72 (não existe — pensão é 30-34), 33 (pensão judicial residente — real é 30), 24-27 (planos de saúde — não existem). Migrado pra **06C**.
- **Dependentes**: tabela inteira inventada — códigos 01/03/04/05/14/26 não existem oficialmente; 11/21/22 existiam mas com significado diferente. Migrado pra **06D**.
- **Rendimentos Exclusivos**: 10 era "13º salário" (real é JCP), 12 era "Ganhos de capital" (real é Exterior Lei 14.754/2023), 18 e 24 não existem (JCP é 10, Outros é 99). Migrado pra **06H**.
- **Rendimentos Isentos**: nunca houve tabela completa — apenas exemplos em prosa. Tabela oficial completa de 28 códigos criada em **06G**.

A versão pré-refatoração deste arquivo está preservada no histórico do git (commit anterior à rodada 1).

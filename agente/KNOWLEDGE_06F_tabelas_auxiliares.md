# KNOWLEDGE_06F — Tabelas Auxiliares: Progressiva, Dólar 2025, Atualização Custo de Bens

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Tabelas" (p. 354-358). Este arquivo consolida 3 tabelas de uso recorrente nos cálculos da declaração.

## Como o agente deve usar este arquivo

Use estas tabelas pra:
1. **Estimar IR devido / a restituir** (tabela progressiva) — útil pra sanity-check no fim do trabalho
2. **Converter valores em USD pra BRL** (cotação dólar) — usado em cripto, aplicações no exterior, rendimentos no exterior, despesas no exterior
3. **Atualizar custo histórico de bens adquiridos até 1995** (tabela de atualização) — raro, mas obrigatório quando aparecer

O agente NÃO precisa calcular limites de dedução automaticamente — o PGD faz isso. Mas pode usar pra:
- Sinalizar em `observacoes` se um pagamento se aproxima do limite (ex: instrução > R$ 3.561,50/dependente)
- Avaliar se o cliente passou da faixa de isenção (R$ 28.467,20 anuais) — útil pra decidir se vale dependente código 31

---

## 1. Tabela Progressiva Anual (IRPF 2026, ano-calendário 2025)

| Base de cálculo (R$) | Alíquota | Parcela a deduzir (R$) |
|---|---|---|
| Até 28.467,20 | **zero** | 0,00 |
| De 28.467,21 a 33.919,80 | 7,5% | 2.135,04 |
| De 33.919,81 a 45.012,60 | 15% | 4.679,03 |
| De 45.012,61 a 55.976,16 | 22,5% | 8.054,97 |
| Acima de 55.976,16 | 27,5% | 10.853,78 |

**Cálculo**: `IR_devido = base × alíquota - parcela_a_deduzir`

### Limites e deduções anuais (2025)
| Item | Valor |
|---|---|
| Dedução por dependente | **R$ 2.275,08** |
| Limite anual de despesa com instrução (por dependente ou titular) | **R$ 3.561,50** |
| Limite anual de desconto simplificado (substitui deduções legais) | **R$ 16.754,34** |
| Faixa de isenção (renda anual até) | **R$ 28.467,20** |

**Regra prática do "desconto simplificado"**: se a soma das deduções legais (dependentes + instrução + saúde + previdência + pensão etc.) for **menor que R$ 16.754,34**, vale a pena optar pelo simplificado. O PGD calcula automaticamente — agente não precisa decidir, só pode mencionar em `observacoes` se a soma está claramente abaixo desse limite.

---

## 2. Tabela Progressiva Mensal

### Janeiro a Abril 2025

| Base mensal (R$) | Alíquota | Parcela (R$) |
|---|---|---|
| Até 2.259,20 | zero | 0,00 |
| De 2.259,21 a 2.826,65 | 7,5% | 169,44 |
| De 2.826,66 a 3.751,05 | 15% | 381,44 |
| De 3.751,06 a 4.664,68 | 22,5% | 662,77 |
| Acima de 4.664,68 | 27,5% | 896,00 |

**Específicos mensais Jan-Abr**:
- Rendimentos previdenciários isentos para maiores de 65 anos: **R$ 1.903,98/mês**
- Dedução mensal por dependente: **R$ 189,59**
- Limite mensal de desconto simplificado: **R$ 564,80**

### Maio a Dezembro 2025

| Base mensal (R$) | Alíquota | Parcela (R$) |
|---|---|---|
| Até 2.428,80 | zero | 0,00 |
| De 2.428,81 a 2.826,65 | 7,5% | 182,16 |
| De 2.826,66 a 3.751,05 | 15% | 394,16 |
| De 3.751,06 a 4.664,68 | 22,5% | 675,49 |
| Acima de 4.664,68 | 27,5% | 908,73 |

**Específicos mensais Mai-Dez**:
- Rendimentos previdenciários isentos para maiores de 65 anos: **R$ 1.903,98/mês**
- Dedução mensal por dependente: **R$ 189,59**
- Limite mensal de desconto simplificado: **R$ 607,20**

> **Por que duas tabelas mensais?** Em maio de 2025 a faixa de isenção mensal subiu de R$ 2.259,20 pra R$ 2.428,80 (correspondente ao novo limite anual de isenção de 28.467,20). Isso afeta Carnê-Leão, INSS retido, IRRF mensal, etc.

---

## 3. Cotação do Dólar dos EUA em 2025 (R$/US$)

Cotações oficiais Bacen (fechamento de venda) usadas pra conversão de valores em USD pra BRL. Use **COMPRA** pra rendimentos recebidos em dólar (a Receita "compra" os dólares do contribuinte) e **VENDA** pra pagamentos feitos em dólar (o contribuinte "compra" dólar pra pagar).

| Mês | Compra (R$) | Venda (R$) |
|---|---|---|
| Janeiro | 6,0394 | 6,0400 |
| Fevereiro | 6,0371 | 6,0377 |
| Março | 5,7277 | 5,7283 |
| Abril | 5,7413 | 5,7419 |
| Maio | 5,8701 | 5,8707 |
| Junho | 5,6322 | 5,6328 |
| Julho | 5,5646 | 5,5652 |
| Agosto | 5,5569 | 5,5576 |
| Setembro | 5,3922 | 5,3928 |
| Outubro | 5,3202 | 5,3208 |
| Novembro | 5,4458 | 5,4464 |
| Dezembro | 5,2946 | 5,2952 |

### Casos de uso

- **Cripto stablecoin USDT/USDC/etc** valorada em USD no informe da corretora: multiplicar pela cotação de compra do mês da operação (compra) ou venda (venda). Para **saldo em 31/12**, usar cotação de **venda de dezembro: R$ 5,2952**.
- **Rendimentos no exterior recebidos em USD** (salário, aluguel, dividendos): cotação de **compra do mês do recebimento**.
- **Despesas no exterior pagas em USD** (consultas médicas, escola, hospedagem): cotação de **venda do mês do pagamento**.
- **Bens adquiridos no exterior em 2025**: cotação de **venda na data de aquisição**.

> Cotações de moedas diferentes do USD (EUR, GBP, etc.): não estão neste manual — consultar Bacen diretamente (`PTAX` ou `cotações do dia`).

---

## 4. Tabela de Atualização do Custo de Bens e Direitos

**Quando usar**: pra bens adquiridos **até 31/12/1995** quando o contribuinte nunca esteve obrigado a declarar antes (ou está sendo regularizado agora). O valor atualizado vai nos campos **Situação em 31/12/2024** E **Situação em 31/12/2025** (mesmo valor nos dois — bem antigo não varia naturalmente).

**Fórmula**: `valor_atualizado_em_reais = valor_original_na_moeda_da_época ÷ índice_do_mês/ano_de_aquisição`

O resultado é o valor em **reais até 31/12/1995**. Como o bem não foi declarado entre 1992-1995, esse mesmo valor de R$ se mantém até hoje (cf. KNOWLEDGE_06A regra de bens estáticos).

### Reais (R$) — Bens adquiridos em 1995 e segundo semestre de 1994

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1995 | 0,8166 | 0,8166 | 0,8166 | 0,8521 | 0,8521 | 0,8521 | 0,9128 | 0,9128 | 0,9128 | 0,9596 | 0,9596 | 0,9596 |
| 1994 | — | — | — | — | — | — | 0,6779 | 0,7133 | 0,7490 | 0,7612 | 0,7757 | 0,7986 |

### Cruzeiros Reais (CR$) — Bens adquiridos entre ago/1993 e jun/1994

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1994 | 226,5838 | 315,3373 | 440,5213 | 632,7260 | 893,7251 | 1.288,8379 | — | — | — | — | — | — |
| 1993 | — | — | — | — | — | — | — | 51,6351 | 68,1549 | 91,5892 | 123,7963 | 165,7657 |

### Cruzeiros (Cr$) — Bens adquiridos entre mar/1990 e jul/1993

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1993 | 8.944,793 | 11.580,825 | 14.675,226 | 18.484,916 | 23.538,699 | 30.320,200 | 39.519,343 | — | — | — | — | — |
| 1992 | 720,4779 | 904,9234 | 1.141,1126 | 1.392,4943 | 1.668,6256 | 2.059,9131 | 2.539,2543 | 3.072,7525 | 3.783,7818 | 4.666,5380 | 5.855,5690 | 7.243,3329 |
| 1991 | 151,5152 | 182,1368 | 203,6121 | 213,8125 | 228,0957 | 252,7992 | 283,4891 | 327,7542 | 378,9461 | 458,8306 | 580,3260 | 720,4779 |
| 1990 | — | — | 33,2962 | 48,2139 | 52,0084 | 56,9759 | 64,3374 | 72,0781 | 81,2750 | 92,8152 | 107,2754 | 126,9078 |

### Cruzados Novos (NCz$) — Bens adquiridos entre jan/1989 e fev/1990

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1990 | 10,4555 | 18,0650 | 33,2962 | — | — | — | — | — | — | — | — | — |
| 1989 | 0,5515 | 0,7235 | 0,9447 | 1,0319 | 1,1073 | 1,2175 | 1,5198 | 1,9569 | 2,5313 | 3,4411 | 4,7359 | 6,6974 |

### Cruzados (Cz$) — Bens adquiridos entre fev/1986 e dez/1988

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1989 | 551,4563 | — | — | — | — | — | — | — | — | — | — | — |
| 1988 | 53,3508 | 62,1608 | 73,3269 | 85,0644 | 101,4610 | 119,5108 | 142,8467 | 177,1870 | 213,7898 | 265,1106 | 337,3606 | 428,1914 |
| 1987 | 11,6159 | 13,5700 | 16,2312 | 18,5873 | 22,4835 | 27,7523 | 32,7552 | 33,7538 | 35,9000 | 37,9401 | 41,4237 | 46,7426 |
| 1986 | — | 9,5095 | 9,4946 | 9,5735 | 9,7067 | 9,8306 | 9,9471 | 10,1142 | 10,2889 | 10,4843 | 10,8289 | — |

### Cruzeiros (1ª moeda — Cr$) — Bens adquiridos entre fev/1967 e jan/1986

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1986 | — | — | — | — | — | — | — | — | — | — | 7.154,2187 | 8.315,5785 |
| 1985 | 2.183,6293 | 2.458,7760 | 2.709,5023 | 3.053,5621 | 3.414,8122 | 3.756,5968 | 4.102,4262 | 4.414,8861 | 4.775,8834 | 5.210,4453 | 5.679,6407 | 6.311,1332 |
| 1984 | 674,4178 | 740,5248 | 831,6084 | 914,7541 | 996,2060 | 1.084,8627 | 1.184,6931 | 1.306,7699 | 1.445,1775 | 1.596,9328 | 1.798,1611 | 1.976,1064 |
| 1983 | 260,1557 | 275,7534 | 294,2330 | 320,7264 | 349,5961 | 377,5557 | 407,0068 | 443,6374 | 481,3550 | 527,0864 | 578,2024 | 626,7905 |
| 1982 | 129,9540 | 136,4509 | 143,2689 | 150,4332 | 158,7074 | 167,4391 | 176,6409 | 187,2433 | 200,3535 | 214,3738 | 229,3774 | 244,2900 |
| 1981 | 66,0034 | 69,3049 | 73,8098 | 78,4588 | 83,1659 | 88,1562 | 93,4447 | 99,0493 | 104,7954 | 110,7690 | 117,0890 | 123,5304 |
| 1980 | 43,6003 | 45,4306 | 47,1142 | 48,8560 | 50,6635 | 52,3851 | 54,0611 | 55,7928 | 57,5801 | 59,3067 | 61,2027 | 63,1619 |
| 1979 | 29,2084 | 29,8682 | 30,5634 | 31,3269 | 32,4999 | 33,7411 | 34,8635 | 35,8141 | 36,8430 | 38,3244 | 40,0813 | 41,8914 |
| 1978 | 21,3001 | 21,7498 | 22,2542 | 22,8280 | 23,4947 | 24,2103 | 24,9399 | 25,7021 | 26,4150 | 27,1051 | 27,7498 | 28,4601 |
| 1977 | 16,4143 | 16,6979 | 17,0275 | 17,4136 | 17,9159 | 18,4925 | 19,1083 | 19,6192 | 20,0212 | 20,3021 | 20,5837 | 20,8908 |
| 1976 | 11,9172 | 12,1465 | 12,4178 | 12,7125 | 13,0338 | 13,4216 | 13,8178 | 14,1709 | 14,5653 | 15,0451 | 15,5871 | 16,0593 |
| 1975 | 9,5414 | 9,6870 | 9,8475 | 10,0326 | 10,2326 | 10,4684 | 10,6598 | 10,8421 | 11,0112 | 11,2347 | 11,4786 | 11,7210 |
| 1974 | 7,2055 | 7,2814 | 7,3903 | 7,4834 | 7,6057 | 7,7675 | 8,0259 | 8,3790 | 8,7785 | 9,1073 | 9,3040 | 9,4213 |
| 1973 | 6,3339 | 6,3966 | 6,4636 | 6,5414 | 6,6165 | 6,7004 | 6,7748 | 6,8354 | 6,8926 | 6,9596 | 7,0071 | 7,0670 |
| 1972 | 5,4984 | 5,5644 | 5,6387 | 5,7032 | 5,7790 | 5,8763 | 5,9817 | 6,0677 | 6,1185 | 6,1625 | 6,2214 | 6,2626 |
| 1971 | 4,5142 | 4,5974 | 4,6581 | 4,7046 | 4,7592 | 4,8272 | 4,9228 | 5,0211 | 5,1265 | 5,2383 | 5,3437 | 5,4314 |
| 1970 | 4,0291 | 4,0665 | 4,1292 | 4,1656 | 4,2051 | 4,2551 | 4,3345 | 4,4275 | — | — | — | — |
| 1967 | — | 2.076,2149 | 2.125,4097 | — | — | — | — | — | — | — | — | — |
| 1966 | 1.483,6788 | 1.523,8739 | 1.546,2213 | 1.572,9675 | 1.633,8163 | 1.706,2180 | 1.775,9147 | 1.825,9437 | 1.877,7928 | 1.931,4115 | 1.982,4011 | 2.027,9303 |
| 1965 | 1.009,9330 | 1.009,9330 | 1.009,9330 | 1.197,6364 | 1.197,6364 | 1.197,6364 | 1.358,4926 | 1.358,4926 | 1.403,1875 | 1.421,0351 | 1.434,4588 | 1.456,8062 |
| 1964 | 558,5094 | 594,2552 | 633,6666 | 662,4604 | 686,7544 | 724,3962 | 775,6892 | 806,2526 | 847,1808 | 893,7465 | 893,7465 | 893,7465 |
| 1963 | 256,9452 | 279,4696 | 301,2861 | 307,2775 | 325,9594 | 352,1241 | 366,1544 | 387,7940 | 417,4727 | 449,3759 | 473,0632 | 514,5476 |
| 1962 | 155,9645 | 159,1750 | 161,2328 | 163,2881 | 170,3513 | 176,2466 | 184,7356 | 190,7269 | 196,8042 | 202,9725 | 220,7569 | 233,4550 |
| 1961 | 111,5376 | 110,2887 | 111,8940 | 117,0789 | 117,8019 | 119,4906 | 119,6701 | 125,5780 | 130,8438 | 143,5394 | 148,6308 | 151,0425 |
| 1960 | 84,6372 | 87,9463 | 89,1067 | 90,0016 | 90,0016 | 90,3580 | 92,0568 | 96,2609 | 99,8279 | 104,6538 | 107,2476 | 109,2194 |
| 1959 | 62,4743 | 66,7643 | 67,1207 | 68,8195 | 69,9799 | 70,8748 | 71,5902 | 75,0763 | 77,2201 | 78,9189 | 81,5101 | 82,8524 |
| 1958 | 51,6570 | 51,3916 | 51,3916 | 51,9275 | 52,6404 | 52,6404 | 52,9109 | 54,2507 | 55,5906 | 57,8253 | 60,6870 | 60,4165 |
| 1957 | 48,8888 | 49,1568 | 49,0658 | 48,4414 | 48,5299 | 48,4414 | 49,0658 | 49,9607 | 49,8722 | 49,7812 | 50,4966 | 51,3006 |
| 1956 | 39,3255 | 39,8614 | 40,4858 | 41,2012 | 42,0961 | 43,2565 | 43,8834 | 44,7758 | 45,5797 | 46,5631 | 46,7426 | 46,6541 |
| 1955 | 35,2149 | 34,8560 | 35,1239 | 35,9278 | 35,5714 | 35,9278 | 36,5548 | 37,3587 | 38,2536 | 38,6985 | 39,0575 | 39,5024 |
| 1954 | 26,9914 | 27,4186 | 27,7953 | 28,5107 | 29,0466 | 30,0300 | 30,9224 | 31,3699 | 32,0853 | 32,4417 | 33,3366 | 34,2315 |
| 1953 | 23,5060 | 23,6845 | 23,6845 | 23,3276 | 23,2383 | 23,5953 | 26,0080 | 25,8285 | 25,9170 | 26,0965 | 26,7234 | 26,9914 |
| 1952 | 22,3444 | 21,8975 | 21,7190 | 22,1649 | 21,9867 | 21,9867 | 22,5229 | 22,7011 | 22,3444 | 22,7011 | 23,3276 | 23,3276 |
| 1951 | 18,1431 | 18,4116 | 18,7693 | 19,3055 | 19,6625 | 19,5732 | 19,3055 | 19,6625 | 19,8417 | 20,5564 | 20,9143 | 21,3613 |
| 1950 | 15,3730 | 15,1042 | 14,8368 | 14,6573 | 14,7475 | 14,9260 | 15,4622 | 15,9984 | 16,2669 | 16,9815 | 17,3392 | 17,6962 |
| 1949 | 14,6573 | 14,7475 | 14,7475 | 14,8368 | 14,5681 | 14,5681 | 14,7475 | 14,9260 | 15,1935 | 15,2837 | 15,5515 | 15,5515 |
| 1948 | 13,7644 | 14,3006 | 14,2104 | 14,0319 | 13,9429 | 14,1211 | 14,0319 | 14,3006 | 14,3006 | 14,3006 | 14,3006 | 14,2104 |
| 1947 | 12,7813 | 12,8703 | 12,9595 | 12,8703 | 12,9595 | 12,9595 | 12,8703 | 12,7813 | 12,8703 | 13,0487 | 13,4064 | 13,4957 |
| 1946 | 11,1717 | 11,1717 | 11,3509 | 11,5294 | 11,6187 | 11,9764 | 12,1548 | 12,3341 | 12,3341 | 12,5126 | 12,4233 | 12,5126 |
| 1945 | 9,7424 | 9,9209 | 9,9209 | 9,9209 | 10,1886 | 10,3678 | 10,7255 | 10,5463 | 10,6355 | 10,8148 | 10,8148 | 10,9040 |
| 1944 | 8,4013 | 8,4013 | 8,4013 | 8,6695 | 8,6695 | 8,7587 | 8,9375 | 9,1162 | 9,2952 | 9,2952 | 9,2952 | 9,2952 |
| 1943 | 7,0607 | 7,1499 | 7,2394 | 7,3289 | 7,4181 | 7,5076 | 7,5969 | 7,6864 | 7,7756 | 7,8651 | 7,9543 | 8,1333 |
| 1942 | — | — | — | — | — | — | — | — | — | — | 6,7925 | 7,0607 |

### Cruzeiros Novos (NCr$) — Bens adquiridos entre 1967 e 1970

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1970 | 3,7849 | 3,8699 | 3,9477 | 3,9922 | 4,0291 | — | — | — | — | — | — | — |
| 1969 | 3,1835 | 3,2416 | 3,2988 | 3,3453 | 3,3971 | 3,4391 | 3,4856 | 3,5096 | 3,5357 | 3,5678 | 3,6259 | 3,7017 |
| 1968 | 2,5454 | 2,5899 | 2,6276 | 2,6660 | 2,7161 | 2,7884 | 2,8680 | 2,9322 | 2,9858 | 3,0280 | 3,0735 | 3,1236 |
| 1967 | — | — | — | 2,1254 | 2,1700 | 2,2021 | 2,2353 | 2,2754 | 2,3397 | 2,3988 | 2,4355 | 2,4471 |

### Mil-Réis (Rs$) — Bens adquiridos entre 1938 e jan/1942

| Ano | Jan | Fev | Mar | Abr | Mai | Jun | Jul | Ago | Set | Out | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1942 | 5,7201 | — | — | 5,8093 | 5,8988 | 5,9881 | 6,0775 | 6,2563 | 6,3455 | 6,4350 | 6,5245 | 6,7032 |
| 1941 | 5,1836 | 5,1836 | 5,2731 | 5,2731 | 5,3624 | 5,3624 | 5,4519 | 5,4519 | 5,5414 | 5,5414 | 5,6306 | 5,7201 |
| 1940 | 4,9157 | 4,9157 | 4,9157 | 4,9157 | 5,0049 | 5,0049 | 5,0049 | 5,0944 | 5,0944 | 5,0944 | 5,0944 | 5,1836 |
| 1939 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,7370 | 4,7370 | 4,7370 | 4,7370 | 4,8262 | 4,8262 | 4,8262 | 4,9157 |
| 1938 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 | 4,6475 |

### Mapa de transições de moeda

| Moeda anterior → Nova moeda | Em vigor a partir de | Conversão |
|---|---|---|
| Mil-Réis → Cruzeiro (Cr$) 1ª moeda | Nov/1942 | 1 Cr$ = 1.000 Rs$ |
| Cruzeiro → Cruzeiro Novo (NCr$) | Fev/1967 | 1 NCr$ = 1.000 Cr$ |
| Cruzeiro Novo → Cruzeiro | Mai/1970 | 1 Cr$ = 1 NCr$ (só renomeação) |
| Cruzeiro → Cruzado (Cz$) | Fev/1986 | 1 Cz$ = 1.000 Cr$ |
| Cruzado → Cruzado Novo (NCz$) | Jan/1989 | 1 NCz$ = 1.000 Cz$ |
| Cruzado Novo → Cruzeiro (2ª) | Mar/1990 | 1 Cr$ = 1 NCz$ |
| Cruzeiro → Cruzeiro Real (CR$) | Ago/1993 | 1 CR$ = 1.000 Cr$ |
| Cruzeiro Real → URV → Real (R$) | Jul/1994 | 1 R$ = 2.750 CR$ (via URV) |

### Caso especial — bens adquiridos ANTES de 1938 ou data de aquisição desconhecida

O contribuinte que nunca foi obrigado a declarar pode avaliar o bem a **valor de mercado em 31/12/1991 (em cruzeiros)** e dividir esse valor por **720,4779** (índice de dezembro/1991) pra obter o valor em reais até 31/12/1995.

Esse mesmo valor R$ vai nas duas situações (31/12/2024 e 31/12/2025) por se tratar de bem estático.

---

## Pendências (não tratadas)

- **Implementar conversor automático USD→BRL no `App.jsx`** se o volume de clientes com cripto em USD/stablecoin justificar — hoje a IA faz o cálculo no prompt. Conversão automática reduziria risco de erro humano.
- **Validação de limites** no `App.jsx`: alerta amarelo se pagamento código 01 (instrução) exceder R$ 3.561,50 por dependente — hoje silencioso, contador descobre só no PGD.
- **Não há cotação de outras moedas** (EUR, GBP, ARS, etc.) neste manual. Pra clientes com bens/rendimentos fora do USD, agente deve mencionar em `observacoes` que o contador precisa buscar PTAX direto no Bacen.

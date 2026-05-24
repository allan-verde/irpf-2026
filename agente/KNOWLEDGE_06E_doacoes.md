# KNOWLEDGE_06E — Códigos Oficiais: Doações Efetuadas

> **Fonte autoritativa.** Manual de Preenchimento IRPF 2026 (Receita Federal), seção "Tabelas — Códigos de Doações" (p. 364), ficha "Doações Efetuadas" (p. 156-174, não extraída em detalhe), ficha "Doações Diretamente na Declaração" (p. 175, não extraída em detalhe), ficha "Doações a Partidos Políticos e Candidatos" (p. 239, não extraída). Corroborado pelo doc Gemini seções 12 e 13.

## Estado da plataforma e diretiva pro agente

**A plataforma atualmente NÃO trata doações.** Não há:
- Parsing do registro correspondente no `lerTemplateInfo` (provavelmente reg 24 — não confirmado)
- Campos `doacoes_*` no schema do patch JSON (nem do agente, nem do prompt do `App.jsx`)
- Cards de aprovação na UI

**Diretiva**: quando o agente identificar evidência de doação em informes/recibos do cliente (recibo de Conselho Tutelar, comprovante Pronon/Pronas, doação a Fundo da Pessoa Idosa, carta de patrocínio cultural, etc.):

1. **NÃO inclua em nenhum array do patch JSON** — não há slot
2. **Inclua em `observacoes`** no formato:
   ```
   DOAÇÃO IDENTIFICADA — Cód <XX> (<categoria>) · <CNPJ instituição> "<nome instituição>" · R$ <valor> · origem: <fonte do dado>. Lançar manualmente na ficha "Doações Efetuadas" do PGD.
   ```
3. **Múltiplas doações**: uma linha por doação em `observacoes`
4. **Não force classificação**: se o recibo não dá pra distinguir entre 41 (cultura) e 99 (outras), use **99** e adicione "(classificação a confirmar)" na nota

**Por que não automatizar**: o escritório raramente trata doações. Implementar parsing + UI + escrita no `.DBK` pra um caso raro adiciona superfície de bug. Quando o volume aumentar, abrir nova rodada (ver seção "Pendências" no fim).

---

## TABELA OFICIAL DE CÓDIGOS (Manual p. 364)

### Doações COM incentivo fiscal — códigos 40-47
Geram dedução do IR devido, dentro de limites legais. Vão na ficha "Doações Efetuadas".

| Cód | Descrição | Grupo de limite legal |
|---|---|---|
| **40** | Doações – Estatuto da Criança e do Adolescente (ECA) | parte do 8% conjunto |
| **41** | Incentivo à cultura (Lei Rouanet) | parte do 8% conjunto |
| **42** | Incentivo à atividade audiovisual | parte do 8% conjunto |
| **43** | Incentivo ao desporto | 6% separado |
| **44** | Fundos Controlados pelos Conselhos da Pessoa Idosa | parte do 8% conjunto |
| **45** | Incentivo ao Pronas/PCD (saúde da pessoa com deficiência) | 1% separado |
| **46** | Incentivo ao Pronon (oncologia) | 1% separado |
| **47** | Apoio direto a projetos de cadeia da reciclagem | parte do 8% conjunto |

> Os limites exatos e regras de combinação estão nas páginas 156-174 do manual (não extraídas). Use os números acima como referência geral — o agente NÃO precisa calcular limite, só identificar e flagar.

### Doações SEM incentivo fiscal — códigos 80, 81, 99
Registros informativos (sem dedução).

| Cód | Descrição | Uso típico |
|---|---|---|
| **80** | Doações em espécie | Dinheiro doado pelo contribuinte a outras pessoas (familiares, ONGs não-habilitadas, instituições religiosas) |
| **81** | Doações em bens e direitos | Doação de imóvel, veículo, ações etc. — vincula com baixa na ficha "Bens e Direitos" |
| **99** | Outras | Quando não se encaixa em nenhum dos demais |

---

## Decisões de classificação

| Comprovante encontrado | Código |
|---|---|
| Recibo do Conselho Municipal/Estadual dos Direitos da Criança | **40** |
| Patrocínio cultural Lei Rouanet (CNPJ do projeto, número PRONAC) | **41** |
| Patrocínio audiovisual / Ancine | **42** |
| Apoio a projeto esportivo aprovado pelo Ministério do Esporte | **43** |
| Doação a abrigo / casa do idoso (Fundo da Pessoa Idosa) | **44** |
| Apoio a centro de atenção a pessoa com deficiência (Pronas/PCD) | **45** |
| Apoio a hospital do câncer / Pronon | **46** |
| Apoio a cooperativa de reciclagem aprovada | **47** |
| Doação em dinheiro a familiar ou ONG sem habilitação fiscal | **80** |
| Doação de imóvel/veículo a familiar (adiantamento de legítima) | **81** |
| Doação a igreja, templo, instituição religiosa | **99** |
| Doação a ONG genérica sem habilitação específica | **99** |

**Sinais que distinguem dedutível (40-47) de não-dedutível (80/81/99)**:
- Recibo cita **lei específica** (Lei 8.069/90 ECA, Lei Rouanet 8.313/91, Pronas Lei 12.715/12, Pronon Lei 12.715/12, etc.)
- Instituição tem **CNPJ habilitado fiscalmente** pra captação
- Recibo é **modelo oficial** com número de registro de projeto

Sem esses sinais → cair em 80/81/99 conforme a natureza.

---

## Fichas relacionadas (não automatizar)

### Doações Diretamente na Declaração (p. 175 do manual)
Doação feita VIA DARF DURANTE o preenchimento do IRPF. Conforme doc Gemini seção 13, hoje só disponível pro ECA. Limite: 3% do IR devido, separado do limite de 8%. **Decisão de fluxo do contribuinte/contador no PGD — agente não sugere.**

### Doações a Partidos Políticos e Candidatos (p. 239)
Sem dedução fiscal desde extinção do incentivo. Informativa. **Mesmo tratamento — flag em `observacoes`.**

---

## Pendências (não tratadas nesta rodada)

| Pendência | Status |
|---|---|
| Páginas 156-174 do manual (ficha Doações Efetuadas detalhada — limites, comprovação, habilitação) | Não extraídas |
| Página 175 (Doações Diretamente na Declaração) | Não extraída |
| Página 239 (Doações a Partidos Políticos) | Não extraída |
| Registro do `.DBK` que armazena doação | Desconhecido. Suspeita: reg 24 (próximo numericamente do 25 dependentes e 26 pagamentos). Usar Inspetor de `.DBK` em cliente com doação preenchida pra confirmar |
| Campos `doacoes_atualizadas` / `doacoes_novas_aviso` no schema | A criar quando o volume justificar |
| Parser / UI / writers do `App.jsx` | A criar quando o schema existir |

**Critério de gatilho pra implementar**: se aparecer doação dedutível em >5% dos clientes ou se houver caso de alto valor (>R$ 10mil), abrir nova rodada técnica.

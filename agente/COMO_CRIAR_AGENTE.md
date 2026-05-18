# Como criar o agente IRPF — passo a passo

Você vai criar 1 vez. Depois, qualquer membro da equipe que receber a senha/link consegue usar (ou cada um cria uma cópia na própria conta).

Os 4 arquivos que você vai precisar:
- `INSTRUCOES_PROJETO.md` (cole nas **instruções** do agente)
- `KNOWLEDGE_01_schema_completo.md` (anexe como **arquivo de conhecimento**)
- `KNOWLEDGE_02_codigos_pgd.md` (anexe como **arquivo de conhecimento**)
- `KNOWLEDGE_03_exemplos.md` (anexe como **arquivo de conhecimento**)

---

## A — Claude.ai Projects (RECOMENDADO)

**Plano necessário:** Free funciona (com limite reduzido de uso) ou Pro ($20/mês — recomendado pra uso intenso).

### Passos

1. Acesse https://claude.ai e faça login.
2. No menu lateral esquerdo, clique em **Projects** → **Create Project**.
3. Dê um nome: `Estúdio IRPF 2026`. Descrição (opcional): `Geração de patches JSON pra .DBK do PGD`.
4. Clique em **Create Project**.
5. Dentro do projeto, clique em **Set custom instructions** (ou ícone de engrenagem → "Custom instructions").
6. Cole TODO o conteúdo de `INSTRUCOES_PROJETO.md` ali. Salve.
7. Clique em **Add content** → **Upload files**.
8. Anexe os 3 arquivos `KNOWLEDGE_01_*.md`, `KNOWLEDGE_02_*.md`, `KNOWLEDGE_03_*.md`.
9. Pronto. Pra usar: clique em **Start new chat** dentro do projeto.

### Como compartilhar com a equipe

Claude.ai Projects podem ser **compartilhados** se você tiver plano **Team** ou **Enterprise**. No plano Pro individual, cada contador precisa criar a própria cópia do projeto. Pra facilitar:
- Compartilhe a pasta com os 4 arquivos (`INSTRUCOES_*.md` + 3 `KNOWLEDGE_*.md`) via Google Drive / Dropbox / pasta de rede
- Cada contador segue os passos 1-9 acima na conta dele
- Demora ~5 minutos por contador

---

## B — Google Gemini Gems

**Plano necessário:** Free funciona (Gemini 2.5 Flash). Pra acesso a Gemini 2.5 Pro com Gems, precisa do plano **Google AI Premium** (~R$ 97/mês).

### Passos

1. Acesse https://gemini.google.com e faça login.
2. No menu lateral, clique em **Gem manager** (ou **Gerenciador de Gems**).
3. Clique em **New Gem** (ou **Novo Gem**).
4. Dê um nome: `Estúdio IRPF 2026`.
5. No campo **Instructions** (Instruções), cole TODO o conteúdo de `INSTRUCOES_PROJETO.md`.
   - ⚠️ Gemini Gems tem limite ~8000 chars. Nosso `INSTRUCOES_PROJETO.md` tem ~7.8k, cabe.
6. Em **Knowledge** (Conhecimento), anexe os 3 arquivos `KNOWLEDGE_01_*`, `KNOWLEDGE_02_*`, `KNOWLEDGE_03_*`.
7. Salve.
8. Pra usar: selecione o Gem no menu antes de começar a conversa.

### Limitações do Gemini

- Free tier não suporta arquivos de conhecimento — só instruções. Se você estiver em Free, copie TUDO (instruções + os 3 KNOWLEDGE) num único arquivo grande, e cole nas instruções. Vai ultrapassar 8k mas o Gemini é tolerante.
- Alternativa Free melhor: **Google AI Studio** em https://aistudio.google.com — modelo Gemini 2.5 Pro gratuito, com System Instructions ilimitadas (sem limite de 8k). Vide seção D abaixo.

---

## C — OpenAI Custom GPT

**Plano necessário:** ChatGPT **Plus** ($20/mês) ou **Team** ou **Enterprise**. Free **não cria** Custom GPTs.

### Passos

1. Acesse https://chatgpt.com e faça login.
2. No menu, clique em **Explore GPTs** → **Create**.
3. Em **Configure** (a aba de configuração):
   - **Name**: `Estúdio IRPF 2026`
   - **Description**: `Geração de patches JSON pra .DBK do PGD`
   - **Instructions**: cole TODO `INSTRUCOES_PROJETO.md`.
   - **Conversation starters**: pode deixar vazio ou pôr `Cole o resumo do template e os PDFs do cliente.`
   - **Knowledge**: faça upload dos 3 arquivos `KNOWLEDGE_*.md`.
   - **Capabilities**: deixe só **Code Interpreter** marcado (opcional, ajuda com PDFs). Desmarque Web Browsing e DALL-E.
4. Em **Configure** → **Additional Settings** (no rodapé): desmarque "Use conversation data in your GPT to improve our models" se quiser privacidade.
5. Clique em **Create** (ou **Save**) e escolha **Only me** (privado) inicialmente.
6. Pra usar: vá em **Explore GPTs** → **My GPTs** → selecione o seu.

### Como compartilhar com a equipe

- Após salvar, escolha **Anyone with the link** e copie a URL gerada.
- Mande a URL pra equipe.
- Cada contador precisa ter ChatGPT Plus pra usar GPTs personalizados.

---

## D — Google AI Studio (alternativa GRATUITA poderosa)

Se o orçamento é importante, esta é a melhor opção gratuita.

**Plano:** Free, sem limite prático pra uso individual razoável.

### Passos

1. Acesse https://aistudio.google.com e faça login com conta Google.
2. Clique em **Create new prompt** → **New chat prompt**.
3. No painel direito, configure:
   - **Model**: `gemini-2.5-pro` (selecione no dropdown)
   - **Temperature**: `0.2` (baixa = saídas mais consistentes, ideal pra JSON)
4. No topo do prompt, clique em **System instructions** (✏️ ícone de instruções).
5. Cole TODO o conteúdo dos 4 arquivos JUNTOS, separados por `---`:
   ```
   [conteúdo de INSTRUCOES_PROJETO.md]
   
   ---
   
   [conteúdo de KNOWLEDGE_01_schema_completo.md]
   
   ---
   
   [conteúdo de KNOWLEDGE_02_codigos_pgd.md]
   
   ---
   
   [conteúdo de KNOWLEDGE_03_exemplos.md]
   ```
   Salve.
6. Clique em **Save** no topo, dê um nome ao prompt: `Estúdio IRPF 2026`.
7. Pra usar: abra o prompt salvo, cole o resumo do template + anexe os PDFs no chat, envie.

### Vantagens
- Gratuito
- Gemini 2.5 Pro (melhor modelo da Google)
- Limites de tokens muito generosos
- Aceita PDFs e imagens nativamente
- System instructions sem limite de 8k

### Desvantagens
- Interface menos polida (é mais "técnica")
- Sem feature de compartilhamento — cada contador precisa importar o prompt na conta dele

---

## E — Comparação rápida

| Critério | Claude.ai Projects | Gemini Gems | OpenAI GPTs | Google AI Studio |
|---|---|---|---|---|
| Plano grátis? | ✅ (com limite) | ✅ (Flash apenas) | ❌ | ✅ |
| Suporta PDFs? | ✅ | ✅ | ✅ | ✅ |
| Limite de instruções | ~20k chars | ~8k chars | ~8k chars | sem limite prático |
| Compartilhamento | Pro/Team | só na conta | URL pública | só na conta |
| Qualidade pra IRPF brasileiro | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Custo equipe (10 contadores) | $200/mês (Pro) | $970/mês (Premium) | $200/mês (Plus) | **$0** |

**Recomendação final:**

- **Se a equipe tem orçamento:** Claude.ai Pro pra cada um ($20/mês) — melhor qualidade.
- **Se prioriza grátis:** Google AI Studio com Gemini 2.5 Pro — interface menos amigável mas zero custo.
- **Solução híbrida:** o líder/sócio usa Claude Pro (pra casos complexos), os contadores juniores usam AI Studio. Ambos seguem o mesmo padrão de patch JSON.

---

## Como usar o agente no dia-a-dia

Independentemente da plataforma, o fluxo é o mesmo:

1. Contador roda o **Estúdio IRPF standalone** (`estudio-irpf.html`) e anexa nos slots o que tiver: `.DBK` do ano anterior, declaração anterior (PDF), recibo (.REC ou PDF), formulário complementar preenchido.
2. Estúdio gera o **prompt completo** com o resumo do template + texto extraído dos PDFs locais (declaração anterior, recibo) já embutido. Abre o modal de processamento.
3. Contador clica **Copiar prompt** → cola no chat com o agente.
4. Anexa no chat **só os documentos do cliente que o Estúdio não processa**: informes de rendimento (bancos, empregadores, corretoras), recibos de PF, NFS-e, formulário complementar (se houver). PDFs e imagens funcionam.
5. Manda: `gere o patch JSON` (ou simplesmente envia — o prompt já termina com essa instrução).
6. Agente retorna o JSON.
7. Contador copia → cola no estúdio → clica **Aplicar resposta**.
8. Estúdio mostra mudanças, contador revisa com checkboxes, gera o `.DBK` final.

**Nota importante:** o contador **não precisa reanexar** a declaração anterior nem o recibo no chat — o texto deles já vem dentro do prompt. Anexar de novo é redundante e consome tokens sem necessidade.

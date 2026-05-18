# Estúdio IRPF — versão standalone

Aplicação client-side (roda 100% no browser) pra automatizar declarações de IRPF a partir do `.DBK` do PGD da Receita Federal. **Sem servidor, sem API paga.**

## Como usar (contadores da equipe)

1. Abra a URL pública do estúdio (ex.: `https://seu-usuario.github.io/estudio-irpf/`) ou abra `dist/index.html` localmente.
2. Anexe os arquivos do cliente nos 5 slots da seção 1 (template `.DBK`, declaração anterior, recibo, informes, formulário complementar).
3. Clique em **Processar**. Modal abre com 3 passos:
   - **1** — prompt completo pronto pra copiar
   - **2** — lista dos arquivos pra anexar no chat da IA
   - **3** — textarea pra colar a resposta JSON
4. **Copiar prompt** → abre Claude.ai/ChatGPT/Gemini em outra aba → cola prompt → anexa os arquivos listados → envia.
5. Copia a resposta JSON e cola no textarea do passo 3.
6. Clica **Aplicar resposta**.
7. Revisa as mudanças (checkbox por checkbox) e gera o `.DBK` modificado.

## Subir pro GitHub (primeira vez)

O projeto **já vem com `.git` inicializado** e primeiro commit feito. Só falta apontar pro seu repo remoto.

### Via terminal

```bash
# 1. Crie repositório vazio em github.com/new
#    - Nome: estudio-irpf
#    - Marque "Private" (recomendado)
#    - NÃO marque "Initialize with README" (já tem um aqui)

# 2. Aponte o local pra esse repositório
cd estudio-irpf-standalone
git remote add origin https://github.com/SEU-USUARIO/estudio-irpf.git
git push -u origin main
```

### Via GitHub Desktop (sem terminal)

1. Instale https://desktop.github.com
2. **File → Add Local Repository** → aponte pra pasta
3. **Publish repository** → escolha nome → privado → publica

## Deploy automático (GitHub Pages + Actions)

Já vem configurado em `.github/workflows/deploy.yml`. Pra ativar:

1. No GitHub, vai em **Settings → Pages**.
2. Em **Source**, escolha **GitHub Actions** (não "Deploy from a branch").

Pronto. **Qualquer `git push` pra `main` aciona build + deploy automaticamente.** Em ~2 minutos a URL pública atualiza.

URL pública: `https://SEU-USUARIO.github.io/estudio-irpf/`.

**⚠️ Repos privados + GitHub Pages:**
- Conta **Free**: Pages só em repos públicos.
- Conta **Pro** (US$ 4/mês): Pages em repos privados.
- Alternativa: **Netlify** ou **Cloudflare Pages** — privado grátis. Ambos suportam deploy automático do GitHub.

## Workflow de updates

**Caminho A — direto na web do GitHub (mais simples):**
1. Vai no repositório → `src/App.jsx`.
2. Clica no lápis (✏️) pra editar.
3. Cola a versão nova.
4. **Commit changes** — descreve.
5. Em ~2min, GitHub Actions atualiza o site automaticamente.

**Caminho B — local:**
```bash
# edita src/App.jsx no seu editor
git add src/App.jsx
git commit -m "descrição da mudança"
git push
```

## Rodar localmente (desenvolvimento)

Pré-requisito: Node.js 18+ (https://nodejs.org).

```bash
npm install
npm run dev      # http://localhost:5173 com hot reload
npm run build    # gera dist/index.html (autocontido, ~328 KB)
```

## Estrutura

```
estudio-irpf-standalone/
├── .github/workflows/deploy.yml  ← build + deploy automático
├── .gitignore
├── .git/                          ← histórico Git (já inicializado)
├── index.html                     ← entry HTML
├── package.json
├── package-lock.json
├── vite.config.js
├── src/
│   ├── main.jsx                   ← entry React
│   └── App.jsx                    ← TODO o estúdio (~5800 linhas)
└── README.md
```

## Privacidade

- Processamento do `.DBK` é **100% no navegador do usuário**. Arquivos nunca saem pra servidor algum.
- A parte de IA (passo 4-5) envia os arquivos pro chat web da IA escolhida — sujeitos às políticas da Anthropic/OpenAI/Google.
- Alta sensibilidade: rodar IA local com Ollama (https://ollama.com).

## Limitações

- Header IR do `.DBK` usa CRC diferente do padrão — o estúdio **não modifica esse header** (preserva original do PGD).
- Otimizado pra IRPF 2026 / ano-calendário 2025.
- Carnê-Leão: ao inserir novos lançamentos, apaga TODOS os reg 49 existentes (não acumula).

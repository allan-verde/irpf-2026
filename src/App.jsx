import { useState, useEffect, useRef, Fragment, Component } from "react";

// ============================================================
// CONSTANTES
// ============================================================

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;450;500;600&display=swap";

// Largura MÍNIMA das linhas por tipo de registro — suficiente pra ler todos os campos
// que manipulamos. Cada mínimo = último offset usado + 1 (com folga). Versões diferentes
// do PGD adicionam campos no fim, então usamos mínimos em vez de exatos.
//   16: tel em [485:496] → mín 500
//   21: IR em [129:139], + CRC = 170
//   25: CPF dep em [88:99] → mín 100
//   27: valor atual em [544:557] → mín 560
//   28: valor atual em [540:553] → mín 560
//   86: valor em [103:116] → mín 130
//   88: largura padrão = 131 → mín 131
const LARG_MIN = { "16": 500, "21": 170, "22": 167, "25": 100, "27": 560, "28": 560, "49": 71, "84": 144, "86": 130, "88": 131 };

// Grupos da Tabela de Bens e Direitos da Receita Federal
// (esquema "amplo" — agrupa esquema antigo e novo numa única referência humana)
const GRUPOS_RECEITA = {
  1: "Bens imóveis",
  2: "Bens móveis",
  3: "Participações societárias",
  4: "Aplicações e investimentos",
  5: "Créditos",
  6: "Depósitos à vista e numerário",
  7: "Fundos",
  8: "Criptoativos",
  9: "Outros bens e direitos",
};

// Grupos de bens que são fixos por código (imóveis, etc.)
const BENS_GRUPOS_FIXOS = new Set(["11", "12", "13", "14", "15"]);

// Detecta se um bem NÃO deve ter saldo atualizado automaticamente:
// imóveis, veículos, participações societárias, terrenos.
// Olha grupo + heurística textual (veículos podem vir em grupo 01 dependendo da versão do PGD).
function bemAtualizavel(bem) {
  if (BENS_GRUPOS_FIXOS.has(bem.grupo)) return false;
  const d = (bem.discriminacao || "").toUpperCase();
  // Veículos automotores (pode estar em qualquer grupo dependendo da versão)
  if (/\b(CHASSI|PLACA|MARCA\/MODELO|VE[IÍ]CUL|AUTOM[ÓO]VEL|MOTOCICLET|CAMINH[ÃA]O)\b/.test(d)) return false;
  // Participações societárias
  if (/(\%\s*DAS\s*COTAS|COTAS\s*DA\s*EMPRESA|PARTICIPA[ÇC][ÃA]O\s*SOCIET|\bQUOTAS\b)/.test(d)) return false;
  // Imóveis (defesa em profundidade, mesmo se grupo não detectar)
  if (/\b(APARTAMENTO|APTO\b|\bCASA\b|TERRENO|IM[ÓO]VEL|CHAL[ÉE]|S[ÍI]TIO|FAZENDA)\b/.test(d)) return false;
  return true;
}

// ============================================================
// CRC32, encoding latin-1, formatadores
// ============================================================

let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  CRC_TABLE = t;
  return t;
}
function crc32(str) {
  const t = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) crc = (crc >>> 8) ^ t[(crc ^ str.charCodeAt(i)) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0).toString().padStart(10, "0");
}

function encodeLatin1(str) {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i) & 0xff;
  return arr;
}

async function bytesToLatin1(file) {
  const buf = await file.arrayBuffer();
  const arr = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return s;
}

function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtCNPJ(c) {
  const d = String(c || "").replace(/\D/g, "").padStart(14, "0");
  if (d.length !== 14) return c;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
function fmtCPF(c) {
  const d = String(c || "").replace(/\D/g, "").padStart(11, "0");
  if (d.length !== 11) return c;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function fmtData8(s) {
  const d = String(s || "").replace(/\D/g, "");
  if (d.length !== 8) return s;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
const fmtData = fmtData8;
function fmtCEP(s) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : s;
}
function semAcento(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Paleta de cores — top-level pra ser acessível por todos os componentes
const COR_PAPEL = "#faf8f3";
const COR_TINTA = "#1a1612";
const COR_VERDE = "#2d5a3d";
const COR_VERMELHO = "#8b2c1a";
const COR_BORDA = "#d4cfc1";
const COR_SUTIL = "#6b6256";
const COR_AMBAR = "#c89b2a";
const COR_LARANJA = "#cc6b2a";
const COR_AZUL = "#3a5876";
const COR_CINZA = "#9b9285";


async function fileToBase64(file) {
  return new Promise((res, rej) => {
    if (!file) return rej(new Error("Arquivo inválido (objeto vazio). Tente anexar de novo."));
    if (file.size === 0) return rej(new Error(`Arquivo "${file.name}" está vazio (0 bytes). Pode ter sido perdido durante o upload — anexe de novo.`));
    const r = new FileReader();
    r.onload = () => {
      if (!r.result || typeof r.result !== "string" || !r.result.includes(",")) {
        return rej(new Error(`"${file.name}": conteúdo lido vazio ou inválido. Tente recarregar a página e anexar de novo.`));
      }
      res(r.result.split(",")[1]);
    };
    r.onerror = () => {
      const err = r.error;
      const detail = err ? `${err.name}: ${err.message}` : "erro desconhecido";
      rej(new Error(`"${file.name}" — falha no FileReader (${detail}). Tente: (1) recarregar a página, (2) anexar pelo botão clique em vez de arrastar, (3) renomear o arquivo pra algo curto.`));
    };
    r.onabort = () => rej(new Error(`"${file.name}": leitura abortada (provavelmente o navegador cancelou). Tente de novo.`));
    try {
      r.readAsDataURL(file);
    } catch (e) {
      rej(new Error(`"${file.name}" — exceção ao iniciar leitura: ${e.message}`));
    }
  });
}

// Detecta PDFs com /Encrypt (protegidos por senha) — a API Anthropic rejeita esses
async function detectarPdfProtegido(file) {
  if (!file || !file.name.toLowerCase().endsWith(".pdf")) return false;
  try {
    const buf = await file.arrayBuffer();
    const arr = new Uint8Array(buf);
    const chunkSize = Math.min(256 * 1024, arr.length);
    let inicio = "";
    for (let i = 0; i < chunkSize; i++) inicio += String.fromCharCode(arr[i]);
    let fim = "";
    if (arr.length > chunkSize) {
      const start = arr.length - chunkSize;
      for (let i = start; i < arr.length; i++) fim += String.fromCharCode(arr[i]);
    }
    const regex = /\/Encrypt[\s<\d]/;
    return regex.test(inicio) || regex.test(fim);
  } catch {
    return false;
  }
}

// ============================================================
// EXTRAÇÃO DE TEXTO DE PDF (pdfjs-dist, lazy load)
// ============================================================
// Carregamos a lib dinamicamente pra que ela só entre em ação quando o usuário
// efetivamente anexar um PDF — não pesa o primeiro carregamento da página.
// O worker é carregado via import dinâmico com `?url` (Vite inline em modo single-file).

let _pdfjsPromise = null;
async function getPdfJs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = (async () => {
      const lib = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
      try {
        const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
        lib.GlobalWorkerOptions.workerSrc = workerModule.default;
      } catch (e) {
        // Fallback: sem worker dedicado, pdf.js usa fake worker (main thread). Mais lento, mas funciona.
        console.warn("pdf.js worker não carregado, usando fake worker:", e);
      }
      return lib;
    })();
  }
  return _pdfjsPromise;
}

async function extrairTextoPDF(file) {
  if (!file || !file.name.toLowerCase().endsWith(".pdf")) return "";
  try {
    const { getDocument } = await getPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocument({ data, verbosity: 0, isEvalSupported: false }).promise;
    const partes = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const texto = content.items
        .map((it) => it.str)
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();
      if (texto) partes.push(`--- Página ${i} ---\n${texto}`);
    }
    return partes.join("\n\n");
  } catch (e) {
    console.error("Falha ao extrair texto do PDF:", e);
    return "";
  }
}

// ============================================================
// PARSER .REC
// ============================================================

async function parseRec(file) {
  const text = await file.text();
  const linhas = text.split(/\r?\n/);
  for (const linha of linhas) {
    if (linha.startsWith("RC")) {
      const matches = linha.match(/\d{13}/g);
      const recibo = matches ? matches[matches.length - 1] : null;
      const data = linha.substring(16, 24);
      const hora = linha.substring(24, 30);
      const cpfMatch = linha.match(/\d{11}/);
      return {
        recibo,
        data: data.length === 8 ? `${data.slice(0, 2)}/${data.slice(2, 4)}/${data.slice(4)}` : data,
        hora: hora.length === 6 ? `${hora.slice(0, 2)}:${hora.slice(2, 4)}:${hora.slice(4)}` : hora,
        cpf: cpfMatch ? cpfMatch[0] : "",
      };
    }
  }
  return null;
}

// ============================================================
// LEITOR DE TEMPLATE .DBK
// ============================================================

function lerInt(s, ini, fim) {
  const v = s.substring(ini, fim).trim();
  if (!v || !/^\d+$/.test(v)) return 0;
  return parseInt(v, 10);
}

function lerTemplateInfo(conteudo) {
  const linhas = conteudo.split("\r\n");
  const ir = linhas[0] || "";
  const matchAnos = ir.match(/^IRPF\s+(\d{4})(\d{4})/);
  const info = {
    linhas,
    anoDeclaracao: matchAnos?.[1] || "",
    anoCalendario: matchAnos?.[2] || "",
    contribuinte: null,
    endereco: null,
    dependentes: [],
    bens: [],
    dividas: [],
    fontes: [],
    rendIsentos: [],
    rendExclusivos: [],
    pagamentos: [],
    carneLeao: [],
    aplicacoes: [],
    contagens: {},
  };

  linhas.forEach((linha, idx) => {
    const tipo = linha.substring(0, 2);
    info.contagens[tipo] = (info.contagens[tipo] || 0) + 1;

    if (tipo === "16" && linha.length >= LARG_MIN["16"]) {
      info.contribuinte = {
        cpf: linha.substring(2, 13),
        nome: linha.substring(13, 73).trimEnd(),
        email: linha.substring(235, 325).trimEnd(),
        titulo_eleitor: linha.substring(325, 337).trim(),
        data_nascimento: linha.substring(360, 368),
        telefone: linha.substring(485, 496).trim(),
        _idx: idx,
      };
      info.endereco = {
        tipo_logradouro: linha.substring(73, 88).trimEnd(),
        logradouro: linha.substring(88, 128).trimEnd(),
        numero: linha.substring(128, 134).trim(),
        complemento: linha.substring(134, 155).trimEnd(),
        bairro: linha.substring(155, 174).trimEnd(),
        cep: linha.substring(174, 182),
        municipio: linha.substring(187, 227).trimEnd(),
        uf: linha.substring(227, 229),
      };
    } else if (tipo === "25" && linha.length >= LARG_MIN["25"]) {
      info.dependentes.push({
        nr: linha.substring(13, 18),
        parentesco_cod: linha.substring(18, 20),
        nome: linha.substring(20, 80).trimEnd(),
        data_nascimento: linha.substring(80, 88),
        cpf: linha.substring(88, 99),
        _idx: idx,
      });
    } else if (tipo === "27" && linha.length >= LARG_MIN["27"]) {
      // [13:15] = código tributário (cód do bem dentro do grupo)
      // [1100:1103] = grupo da Receita no formato "0G0" (G = dígito 1-9)
      const grupoRawBytes = linha.substring(1100, 1103);
      const grupoDigit = grupoRawBytes[1]; // o "G" do meio do "0G0"
      const grupoReceita = /^\d$/.test(grupoDigit) ? parseInt(grupoDigit, 10) : null;
      info.bens.push({
        grupo: linha.substring(13, 15),       // mantido por compat — código tributário literal
        codigo: linha.substring(15, 17),      // mantido por compat — sub-código (geralmente "01")
        cod_tributario: linha.substring(13, 15), // semanticamente: cód do bem (ex: "11" = apto)
        grupo_receita: grupoReceita,          // 1-9: Grupo da Receita Federal
        nome_grupo_receita: grupoReceita ? GRUPOS_RECEITA[grupoReceita] : null,
        discriminacao: linha.substring(19, 531).trimEnd(),
        valor_anterior: lerInt(linha, 531, 544) / 100,
        valor_atual: lerInt(linha, 544, 557) / 100,
        _idx: idx,
      });
    } else if (tipo === "28" && linha.length >= LARG_MIN["28"]) {
      info.dividas.push({
        codigo: linha.substring(13, 15),
        discriminacao: linha.substring(15, 527).trimEnd(),
        valor_anterior: lerInt(linha, 527, 540) / 100,
        valor_atual: lerInt(linha, 540, 553) / 100,
        valor_pago: lerInt(linha, 553, 566) / 100,
        _idx: idx,
      });
    } else if (tipo === "21" && linha.length >= LARG_MIN["21"]) {
      info.fontes.push({
        cnpj: linha.substring(13, 27),
        nome: linha.substring(27, 77).trimEnd(),
        rendimentos_tributaveis: lerInt(linha, 90, 103) / 100000,
        inss: lerInt(linha, 103, 116) / 100000,
        decimo_terceiro: lerInt(linha, 116, 129) / 100000,
        ir_retido: lerInt(linha, 129, 139) / 100,
        _idx: idx,
      });
    } else if (tipo === "49" && linha.length >= LARG_MIN["49"]) {
      // Carnê-Leão — entrada individual por fonte pagadora PF por mês.
      // É a fonte de verdade dos rendimentos tributáveis recebidos de PF e do exterior;
      // o reg 22 é o totalizador agregado por mês (estrutural, derivado disso).
      // Pos 13-24: 11 espaços (padding).
      // Pos 37-48 (cpf_beneficiario): observado idêntico a cpf_fonte em todos os casos
      // disponíveis — semântica não totalmente confirmada. Manter ambos pra investigar.
      info.carneLeao.push({
        tipo_reg: "49",
        mes: parseInt(linha.substring(24, 26), 10),
        cpf_fonte: linha.substring(26, 37),
        cpf_beneficiario: linha.substring(37, 48),
        valor: lerInt(linha, 48, 61) / 100,
        _idx: idx,
      });
    } else if (tipo === "84" && linha.length >= LARG_MIN["84"]) {
      // Rendimentos isentos POR CÓDIGO (Lucros e dividendos, transferências patrimoniais,
      // indenizações, etc.). Estrutura idêntica ao reg 88 (rend. exclusivos) — mesma posição
      // de tipo beneficiário, código, CNPJ, nome e valor. Diferença: 144 chars no total (vs
      // 131 do reg 88), com 13 chars extras no fim (provavelmente CRC mais longo). Valor × 1000.
      info.rendIsentos.push({
        tipo_reg: "84",
        tipo_beneficiario: linha.substring(13, 14), // T/D/A
        cpf_beneficiario: linha.substring(14, 25),
        codigo: linha.substring(27, 29), // 2 últimos chars do bloco "00XX" (ex: "09" = lucros e dividendos)
        cnpj_fonte: linha.substring(29, 43),
        nome_fonte: linha.substring(43, 103).trimEnd(),
        valor: lerInt(linha, 103, 117) / 1000,
        _idx: idx,
      });
    } else if (tipo === "86" && linha.length >= LARG_MIN["86"]) {
      // Rendimentos isentos GENÉRICOS (sem código tipado — campo "99 - Outros" típico).
      // ATENÇÃO: o reg 86 tem unidade do valor DIFERENTE do reg 88 — aqui é 13 chars / 100
      // (não 14 chars / 1000 como no 88/84). Não unificar sem verificação cuidadosa.
      info.rendIsentos.push({
        tipo_reg: "86",
        cnpj_fonte: linha.substring(29, 43),
        nome_fonte: linha.substring(43, 103).trimEnd(),
        valor: lerInt(linha, 103, 116) / 100,
        descricao: linha.substring(116, 176).trimEnd(),
        _idx: idx,
      });
    } else if (tipo === "26" && linha.length >= 671) {
      // Pagamentos efetuados — código 21 (médico), 26 (plano saúde), 36 (previdência),
      // 60 (escola), 70 (advocatícios), 72 (pensão judicial), etc.
      // Estrutura:
      //   pos 15-20 (5 zeros padding) + pos 20-34 (CNPJ 14 dígitos) = pos 15-34 (19 chars)
      //   pos 34-105 (71 chars): nome do beneficiário (até 71 chars, espaços ao final)
      //   pos 105-119 (14 chars × 1000): valor pago
      info.pagamentos.push({
        codigo: linha.substring(13, 15),
        cnpj_cpf: linha.substring(20, 34), // CNPJ ou CPF (14 dígitos), ignorando padding inicial
        nome: linha.substring(34, 105).trimEnd(),
        valor_pago: lerInt(linha, 105, 119) / 1000,
        _idx: idx,
      });
    } else if (tipo === "88" && linha.length >= 131) {
      // Rendimentos sujeitos à Tributação Exclusiva/Definitiva
      //   pos 0-2: "88"
      //   pos 2-13: CPF declarante
      //   pos 13: tipo beneficiário (T=Titular / D=Dependente / A=Alimentando)
      //   pos 14-25: CPF beneficiário (11 chars)
      //   pos 25-29: código tipo rendimento (4 chars, "00XX" — XX = código real)
      //   pos 29-43: CNPJ fonte pagadora (14 chars)
      //   pos 43-103: nome fonte pagadora (60 chars)
      //   pos 103-117: valor (14 chars × 1000)
      //   pos 117-121: padding zeros
      //   pos 121-131: CRC
      info.rendExclusivos.push({
        tipo_beneficiario: linha.substring(13, 14), // T/D/A
        cpf_beneficiario: linha.substring(14, 25),
        codigo: linha.substring(27, 29), // 2 últimos chars do bloco "00XX"
        cnpj_fonte: linha.substring(29, 43),
        nome_fonte: linha.substring(43, 103).trimEnd(),
        valor: lerInt(linha, 103, 117) / 1000,
        _idx: idx,
      });
    }
  });

  return info;
}

// ============================================================
// INSPETOR DE .DBK — mapeamento de registros (conhecidos + desconhecidos)
// ============================================================
// Quando o parser encontra um caso novo (ex: rendimento isento tipo "09 - Lucros"
// que usa estrutura diferente), o contador roda o inspetor: lista todos os
// códigos de registro do .DBK, indica quais já estão mapeados, e gera dumps
// dos não-reconhecidos prontos pra colar no Claude pra investigar a estrutura.

const TIPOS_REGISTRO_CONHECIDOS = {
  // Tipos com extração de dados — o parser lê e popula info.*
  "16": { categoria: "Contribuinte + endereço", contar: (info) => (info.contribuinte ? 1 : 0) },
  "21": { categoria: "Fontes pagadoras PJ",     contar: (info) => info.fontes.length },
  "25": { categoria: "Dependentes",             contar: (info) => info.dependentes.length },
  "26": { categoria: "Pagamentos efetuados",    contar: (info) => info.pagamentos.length },
  "27": { categoria: "Bens e direitos",         contar: (info) => info.bens.length },
  "28": { categoria: "Dívidas e ônus",          contar: (info) => info.dividas.length },
  "49": { categoria: "Carnê-Leão (rend. PF por mês)", contar: (info) => info.carneLeao.length },
  "84": { categoria: "Rend. isentos tipados (lucros/dividendos, etc.)", contar: (info) => info.rendIsentos.filter((r) => r.tipo_reg === "84").length },
  "86": { categoria: "Rend. isentos genéricos", contar: (info) => info.rendIsentos.filter((r) => r.tipo_reg === "86").length },
  "88": { categoria: "Rend. exclusivos/definitivos", contar: (info) => info.rendExclusivos.length },

  // Tipos estruturais — o parser conhece e usa, mas não tem itens individuais pra "extrair".
  // Aparecem no .DBK como header/footer/totalizadores. Marcamos pra não poluir o relatório.
  "IR": { categoria: "Header do arquivo (ano-calendário)", estrutural: true },
  "19": { categoria: "Totalizador resumido",               estrutural: true },
  "20": { categoria: "Totalizadores das fichas",           estrutural: true },
  "22": { categoria: "Carnê-Leão — totalizador mensal (derivado do reg 49)", estrutural: true },
  "23": { categoria: "Totalizador rend. isentos por cód.", estrutural: true },
  "24": { categoria: "Totalizador rend. exclusivos por cód.", estrutural: true },
  "T9": { categoria: "Footer (contagens + CRC)",           estrutural: true },
};

// Régua de coluna pra dump posicional. Ex:
//   "0         10        20        30  "
//   "0123456789012345678901234567890123"
function reguaColunas(len, offsetInicial = 0) {
  let dezenas = "", unidades = "";
  let i = 0;
  while (i < len) {
    const pos = offsetInicial + i;
    if (pos % 10 === 0) {
      const marker = String(pos);
      const trecho = marker.slice(0, len - i);
      dezenas += trecho;
      for (let k = 0; k < trecho.length; k++) unidades += String((pos + k) % 10);
      i += trecho.length;
    } else {
      dezenas += " ";
      unidades += String(pos % 10);
      i += 1;
    }
  }
  return dezenas + "\n" + unidades;
}

// Quebra uma linha longa em blocos de N chars com régua independente em cada bloco
function dumpLinhaComRegua(linha, larguraBloco = 100) {
  if (linha.length <= larguraBloco) {
    return reguaColunas(linha.length) + "\n" + linha;
  }
  const blocos = [];
  for (let off = 0; off < linha.length; off += larguraBloco) {
    const trecho = linha.substring(off, Math.min(off + larguraBloco, linha.length));
    blocos.push(reguaColunas(trecho.length, off) + "\n" + trecho);
  }
  return blocos.join("\n\n");
}

function gerarRelatorioInspecao(info) {
  // Filtra linhas vazias do final (artefato de split por \r\n)
  const linhasReais = info.linhas.filter((l) => l && l.length > 0);
  // Recalcula contagens ignorando linhas vazias e usando substring (não startsWith,
  // pra match exato dos 2 primeiros chars — evita bug do tipo "" pegando tudo)
  const contagens = {};
  for (const l of linhasReais) {
    const t = l.substring(0, 2);
    contagens[t] = (contagens[t] || 0) + 1;
  }
  const todosTipos = Object.keys(contagens).sort();
  const out = [];

  out.push("# Inspeção do .DBK");
  out.push("");
  if (info.contribuinte) {
    out.push(`**Contribuinte:** ${info.contribuinte.nome} (CPF ${info.contribuinte.cpf})`);
  }
  out.push(`**Ano-calendário:** ${info.anoCalendario} · **declaração:** ${info.anoDeclaracao}`);
  out.push(`**Total de linhas (registros):** ${linhasReais.length}`);
  out.push("");

  out.push("## Mapa de registros");
  out.push("");
  out.push("| Tipo | Qtd | Categoria | Extraídos | Status |");
  out.push("|------|----:|-----------|----------:|--------|");

  const tiposProblema = [];
  for (const tipo of todosTipos) {
    const qtd = contagens[tipo];
    const conhecido = TIPOS_REGISTRO_CONHECIDOS[tipo];
    if (!conhecido) {
      out.push(`| \`${tipo}\` | ${qtd} | _não mapeado_ | — | ❌ Não reconhecido |`);
      tiposProblema.push({ tipo, motivo: "nao_mapeado" });
      continue;
    }
    if (conhecido.estrutural) {
      out.push(`| \`${tipo}\` | ${qtd} | ${conhecido.categoria} | — | 📋 Estrutural |`);
      continue;
    }
    const extraidos = conhecido.contar(info);
    let status;
    if (extraidos === qtd) status = "✅ Reconhecido";
    else if (extraidos < qtd) {
      status = `⚠️ Parcial (${extraidos}/${qtd})`;
      tiposProblema.push({ tipo, motivo: "parcial" });
    } else status = `⚠️ Inconsistente (${extraidos}/${qtd})`;
    out.push(`| \`${tipo}\` | ${qtd} | ${conhecido.categoria} | ${extraidos} | ${status} |`);
  }
  out.push("");

  // Dumps de registros problemáticos (não mapeados OU parcialmente lidos).
  // Estruturais não entram aqui — são conhecidos e não precisam de investigação.
  out.push("## Dumps de registros problemáticos");
  out.push("");
  if (tiposProblema.length === 0) {
    out.push("_Nenhum registro problemático — todos os tipos foram reconhecidos._");
  } else {
    for (const { tipo, motivo } of tiposProblema) {
      const linhasDesseTipo = linhasReais.filter((l) => l.substring(0, 2) === tipo);
      out.push(`### Tipo \`${tipo}\` — ${motivo === "nao_mapeado" ? "não mapeado" : "parcialmente lido"}`);
      out.push("");
      out.push(`Encontradas ${linhasDesseTipo.length} linha(s) desse tipo. ${linhasDesseTipo.length > 0 ? `Largura: ${[...new Set(linhasDesseTipo.map((l) => l.length))].join(", ")} chars.` : ""}`);
      out.push("");

      const exemplos = linhasDesseTipo.slice(0, 3);
      for (let i = 0; i < exemplos.length; i++) {
        const l = exemplos[i];
        out.push(`**Linha ${i + 1} de ${linhasDesseTipo.length}** — ${l.length} chars`);
        out.push("```");
        out.push(dumpLinhaComRegua(l));
        out.push("```");
        out.push("");
      }
      if (linhasDesseTipo.length > 3) {
        out.push(`_… mais ${linhasDesseTipo.length - 3} linha(s) do mesmo tipo (não exibidas pra economizar espaço)._`);
        out.push("");
      }
    }
  }

  // Rodapé com instrução pra usar com Claude
  out.push("---");
  out.push("");
  out.push("## Próximo passo");
  out.push("");
  out.push("Cole este relatório no Claude Project **Mapeador de registros .DBK** (ou em qualquer agente IRPF) junto com um print da ficha correspondente no PGD, e peça:");
  out.push("");
  out.push("> *\"Mapeie os campos por posição (byte inicial / byte final / o que significa) do registro `XX` acima.\"*");
  out.push("");

  return out.join("\n");
}

// ============================================================
// HELPERS DE ESCRITA NO REGISTRO (largura fixa + CRC)
// ============================================================

function escreverTexto(linha, ini, len, valor, opcoes = {}) {
  let v = String(valor ?? "");
  if (opcoes.upper) v = v.toUpperCase();
  if (opcoes.semAcento) v = semAcento(v);
  v = v.padEnd(len, " ").slice(0, len);
  return linha.substring(0, ini) + v + linha.substring(ini + len);
}

function escreverNumero(linha, ini, len, valorReais, escala) {
  let v = Number(valorReais);
  if (!Number.isFinite(v)) v = 0;
  if (v < 0) {
    // Valores em IRPF nunca são negativos (saldo negativo de conta vira dívida, não bem com valor < 0).
    // Clampar em 0 evita corrompimento do campo (sinal "-" no meio do campo de largura fixa quebra o parser do PGD).
    console.warn(`escreverNumero: valor negativo descartado (${valorReais}) em offset ${ini}. Convertido pra 0.`);
    v = 0;
  }
  const inteiro = Math.round(v * escala);
  const s = String(inteiro).padStart(len, "0").slice(-len);
  return linha.substring(0, ini) + s + linha.substring(ini + len);
}

function recalcLinhaCrc(linha) {
  if (linha.length < 11) return linha;
  const corpo = linha.substring(0, linha.length - 10);
  return corpo + crc32(corpo);
}

// ============================================================
// MODIFICADORES POR TIPO DE REGISTRO
// ============================================================

function modificarReg16(linha, contribuinte, endereco) {
  let s = linha;
  if (contribuinte?.nome) s = escreverTexto(s, 13, 60, contribuinte.nome, { upper: true, semAcento: true });
  if (contribuinte?.email) s = escreverTexto(s, 235, 90, contribuinte.email, { upper: true });
  if (contribuinte?.titulo_eleitor) {
    const t = String(contribuinte.titulo_eleitor).replace(/\D/g, "").padStart(12, "0").slice(0, 12);
    s = escreverTexto(s, 325, 12, t);
  }
  if (contribuinte?.data_nascimento) {
    const dn = String(contribuinte.data_nascimento).replace(/\D/g, "").slice(0, 8).padStart(8, "0");
    s = escreverTexto(s, 360, 8, dn);
  }
  if (contribuinte?.telefone) {
    const tel = String(contribuinte.telefone).replace(/\D/g, "").padStart(11, "0").slice(-11);
    s = escreverTexto(s, 485, 11, tel);
  }
  if (endereco?.tipo_logradouro) s = escreverTexto(s, 73, 15, endereco.tipo_logradouro, { upper: true, semAcento: true });
  if (endereco?.logradouro) s = escreverTexto(s, 88, 40, endereco.logradouro, { upper: true, semAcento: true });
  if (endereco?.numero) s = escreverTexto(s, 128, 6, endereco.numero);
  if (endereco?.complemento) s = escreverTexto(s, 134, 21, endereco.complemento, { upper: true, semAcento: true });
  if (endereco?.bairro) s = escreverTexto(s, 155, 19, endereco.bairro, { upper: true, semAcento: true });
  if (endereco?.cep) {
    const cep = String(endereco.cep).replace(/\D/g, "").padStart(8, "0").slice(0, 8);
    s = escreverTexto(s, 174, 8, cep);
  }
  if (endereco?.municipio) s = escreverTexto(s, 187, 40, endereco.municipio, { upper: true, semAcento: true });
  if (endereco?.uf) s = escreverTexto(s, 227, 2, endereco.uf, { upper: true });
  return recalcLinhaCrc(s);
}

function modificarReg21(linha, fonte) {
  let s = linha;
  if (fonte.nome != null) s = escreverTexto(s, 27, 50, fonte.nome, { upper: true, semAcento: true });
  if (fonte.rendimentos_tributaveis != null) s = escreverNumero(s, 90, 13, fonte.rendimentos_tributaveis, 100000);
  if (fonte.inss != null) s = escreverNumero(s, 103, 13, fonte.inss, 100000);
  if (fonte.decimo_terceiro != null) s = escreverNumero(s, 116, 13, fonte.decimo_terceiro, 100000);
  if (fonte.ir_retido != null) s = escreverNumero(s, 129, 10, fonte.ir_retido, 100);
  return recalcLinhaCrc(s);
}

function modificarReg25(linha, dep) {
  let s = linha;
  if (dep.nome) s = escreverTexto(s, 20, 60, dep.nome, { upper: true, semAcento: true });
  if (dep.data_nascimento) {
    const dn = String(dep.data_nascimento).replace(/\D/g, "").slice(0, 8).padStart(8, "0");
    s = escreverTexto(s, 80, 8, dn);
  }
  if (dep.cpf) {
    const cpf = String(dep.cpf).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
    s = escreverTexto(s, 88, 11, cpf);
  }
  if (dep.parentesco_cod) s = escreverTexto(s, 18, 2, String(dep.parentesco_cod).padStart(2, "0"));
  return recalcLinhaCrc(s);
}

function modificarReg27(linha, bem) {
  let s = linha;
  if (bem.valor_atual != null) s = escreverNumero(s, 544, 13, bem.valor_atual, 100);
  if (bem.valor_anterior != null) s = escreverNumero(s, 531, 13, bem.valor_anterior, 100);
  return recalcLinhaCrc(s);
}

function modificarReg28(linha, divida) {
  let s = linha;
  if (divida.valor_atual != null) s = escreverNumero(s, 540, 13, divida.valor_atual, 100);
  if (divida.valor_anterior != null) s = escreverNumero(s, 527, 13, divida.valor_anterior, 100);
  if (divida.valor_pago != null) s = escreverNumero(s, 553, 13, divida.valor_pago, 100);
  return recalcLinhaCrc(s);
}

function modificarReg86(linha, isento) {
  let s = linha;
  if (isento.valor != null) s = escreverNumero(s, 103, 13, isento.valor, 100);
  return recalcLinhaCrc(s);
}

function modificarReg26(linha, pagamento) {
  let s = linha;
  if (pagamento.valor_pago != null) s = escreverNumero(s, 105, 14, pagamento.valor_pago, 1000);
  if (pagamento.codigo != null) s = escreverTexto(s, 13, 2, String(pagamento.codigo).padStart(2, "0").slice(0, 2));
  if (pagamento.nome != null) s = escreverTexto(s, 34, 71, pagamento.nome, { upper: true, semAcento: true });
  return recalcLinhaCrc(s);
}

// Constrói reg 26 (pagamento efetuado) vazio — 671 chars
function linhaReg26Vazia(cpfContrib, linhaBase) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  if (linhaBase && linhaBase.length === 671) {
    let s = linhaBase;
    s = escreverTexto(s, 2, 11, cpf);
    s = escreverTexto(s, 13, 2, "21");      // código placeholder (21=médico)
    s = escreverTexto(s, 15, 19, "00000" + "00000000000000"); // CNPJ zerado
    s = escreverTexto(s, 34, 71, "");        // nome em branco
    s = escreverNumero(s, 105, 14, 0, 1000); // valor pago
    return s;
  }
  let s = "26" + cpf + "21"; // tipo + cpf + código
  s += "00000" + "00000000000000"; // 5 zeros padding + 14 zeros CNPJ
  s += " ".repeat(71); // nome em branco
  s += "0".repeat(14); // valor pago zerado
  s += " ".repeat(671 - s.length - 10);
  s += "0".repeat(10);
  return s;
}

function criarReg26(cpfContrib, pagamento, linhaBase) {
  let s = linhaReg26Vazia(cpfContrib, linhaBase);
  const codigo = String(pagamento.codigo || "21").padStart(2, "0").slice(0, 2);
  s = escreverTexto(s, 13, 2, codigo);
  const cnpj = String(pagamento.cnpj_cpf || pagamento.cnpj || pagamento.cpf || "").replace(/\D/g, "").padStart(14, "0").slice(-14);
  s = escreverTexto(s, 15, 19, "00000" + cnpj);
  if (pagamento.nome != null) s = escreverTexto(s, 34, 71, pagamento.nome, { upper: true, semAcento: true });
  return modificarReg26(s, pagamento);
}

function modificarReg88(linha, exclusivo) {
  let s = linha;
  if (exclusivo.valor != null) s = escreverNumero(s, 103, 14, exclusivo.valor, 1000);
  if (exclusivo.codigo != null) s = escreverTexto(s, 27, 2, String(exclusivo.codigo).padStart(2, "0").slice(-2));
  if (exclusivo.nome_fonte != null) s = escreverTexto(s, 43, 60, exclusivo.nome_fonte, { upper: true, semAcento: true });
  return recalcLinhaCrc(s);
}

// Constrói reg 88 (rendimento exclusivo) vazio — 131 chars
function linhaReg88Vazia(cpfContrib, linhaBase) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  if (linhaBase && linhaBase.length === 131) {
    let s = linhaBase;
    s = escreverTexto(s, 2, 11, cpf);
    s = escreverTexto(s, 13, 1, "T");                    // tipo beneficiário titular
    s = escreverTexto(s, 14, 11, cpf);                   // CPF benef = titular
    s = escreverTexto(s, 25, 4, "0006");                 // código 06 default (aplicações financeiras)
    s = escreverTexto(s, 29, 14, "00000000000000");      // CNPJ zerado
    s = escreverTexto(s, 43, 60, "");                    // nome em branco
    s = escreverNumero(s, 103, 14, 0, 1000);             // valor
    s = escreverTexto(s, 117, 4, "0000");                // padding zeros
    return s;
  }
  let s = "88" + cpf + "T" + cpf + "0006" + "00000000000000"; // tipo + cpf + T + cpf + cod + cnpj
  s += " ".repeat(60); // nome
  s += "0".repeat(14); // valor
  s += "0".repeat(4);  // padding
  s += "0".repeat(10); // CRC
  return s;
}

function criarReg88(cpfContrib, exclusivo, linhaBase) {
  let s = linhaReg88Vazia(cpfContrib, linhaBase);
  // Tipo beneficiário (default T)
  const tipoBenef = (exclusivo.tipo_beneficiario || "T").toUpperCase().slice(0, 1);
  s = escreverTexto(s, 13, 1, tipoBenef);
  const cpfBenef = String(exclusivo.cpf_beneficiario || cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  s = escreverTexto(s, 14, 11, cpfBenef);
  // Código tipo rendimento (padded "00XX")
  const codigo = String(exclusivo.codigo || "06").padStart(2, "0").slice(-2);
  s = escreverTexto(s, 25, 4, "00" + codigo);
  // CNPJ fonte
  const cnpj = String(exclusivo.cnpj_fonte || exclusivo.cnpj || "").replace(/\D/g, "").padStart(14, "0").slice(-14);
  s = escreverTexto(s, 29, 14, cnpj);
  // Nome
  if (exclusivo.nome_fonte != null) s = escreverTexto(s, 43, 60, exclusivo.nome_fonte, { upper: true, semAcento: true });
  return modificarReg88(s, exclusivo);
}

// ============================================================
// CRIAÇÃO DE LINHAS NOVAS (INSERT no .DBK)
// ============================================================
// Quando a IA propõe itens novos (fontes PJ, bens, dívidas), construímos
// linhas do zero respeitando a largura fixa do PGD 2026, ou aproveitamos
// uma linha existente do mesmo tipo como base (mais seguro — herda campos
// internos não documentados). O T9 (footer) precisa ser atualizado em
// paralelo: contagem do tipo + contagem total.
//
// Estrutura do T9 (validada por engenharia reversa em 5 .DBK reais):
//   [0:2]   = "T9"
//   [2:13]  = CPF do contribuinte
//   [13:15] = "00"
//   [15:19] = TOTAL de registros (4 dígitos, zero-padded)
//   [19]    = "0" separador
//   [20 + (tipo-16)*5 : 24 + (tipo-16)*5] = contagem do tipo (4 dígitos)
//   [final-10:final] = CRC32 do corpo

// Pega uma linha do tipo `tipo` no array de linhas como base pra criar novas.
// Se não houver nenhuma, retorna null e o chamador faz fallback.
function buscarLinhaBase(linhas, tipo) {
  return linhas.find((l) => l && l.startsWith(tipo)) || null;
}

// Constrói uma linha 21 (fonte pagadora PJ) vazia, estrutura exata observada
// nos arquivos PGD 2026 reais. 170 chars.
function linhaReg21Vazia(cpfContrib) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  // pos 0-1: tipo, 2-12: CPF, 13-26: CNPJ (14 zeros), 27-76: nome (50 espaços)
  // 77-86: 10 espaços, 87-89: "000", 90-128: 39 zeros (rend+inss+13º),
  // 129-138: 10 zeros (IR), 139-146: 8 espaços, 147-159: 13 zeros, 160-169: CRC
  let s = "21" + cpf;
  s += "00000000000000"; // CNPJ (14)
  s += " ".repeat(50);   // nome
  s += " ".repeat(10) + "000"; // spacer
  s += "0".repeat(39);   // rend + inss + 13º (13+13+13)
  s += "0".repeat(10);   // IR
  s += " ".repeat(8) + "0".repeat(13); // meio
  s += "0".repeat(10);   // CRC placeholder
  return s;
}

// Constrói reg 27 (bem) vazia — 1251 chars. Como o reg 27 tem muitos campos
// internos não documentados (pos 557-1240), aproveitar uma linha 27 existente
// é muito mais seguro. Fallback constrói do zero.
function linhaReg27Vazia(cpfContrib, linhaBase) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  if (linhaBase && linhaBase.length === 1251) {
    // Herda estrutura do PGD, zera só os campos que vou preencher
    let s = linhaBase;
    s = escreverTexto(s, 2, 11, cpf);
    s = escreverTexto(s, 13, 6, "010199"); // grupo/codigo/país placeholder
    s = escreverTexto(s, 19, 512, ""); // discriminacao em branco
    s = escreverNumero(s, 531, 13, 0, 100); // valor anterior
    s = escreverNumero(s, 544, 13, 0, 100); // valor atual
    return s; // CRC será recalculado em criarReg27
  }
  // Fallback: construção do zero (cliente sem bens prévios)
  let s = "27" + cpf + "010199"; // tipo + cpf + grupo/codigo/país
  s += " ".repeat(512);          // discriminação
  s += "0".repeat(13) + "0".repeat(13); // valor_anterior + valor_atual
  s += " ".repeat(1251 - s.length - 10); // resto em branco
  s += "0".repeat(10);           // CRC placeholder
  return s;
}

// Constrói reg 28 (dívida) vazia — 576 chars. Mesma estratégia.
function linhaReg28Vazia(cpfContrib, linhaBase) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  if (linhaBase && linhaBase.length === 576) {
    let s = linhaBase;
    s = escreverTexto(s, 2, 11, cpf);
    s = escreverTexto(s, 13, 2, "11"); // código placeholder
    s = escreverTexto(s, 15, 512, ""); // discriminação em branco
    s = escreverNumero(s, 527, 13, 0, 100); // valor anterior
    s = escreverNumero(s, 540, 13, 0, 100); // valor atual
    s = escreverNumero(s, 553, 13, 0, 100); // valor pago
    return s;
  }
  let s = "28" + cpf + "11"; // tipo + cpf + código
  s += " ".repeat(512);
  s += "0".repeat(13) + "0".repeat(13) + "0".repeat(13); // val_ant + val_atu + val_pago
  s += " ".repeat(576 - s.length - 10);
  s += "0".repeat(10);
  return s;
}

// Cria uma nova linha de reg 21 (fonte pagadora PJ) já com CRC válido
function criarReg21(cpfContrib, fonte, linhaBase) {
  const baseLimpa = linhaBase ? (() => {
    let s = linhaBase;
    // Zera valores numéricos pra começar fresco
    s = escreverNumero(s, 90, 13, 0, 100000);
    s = escreverNumero(s, 103, 13, 0, 100000);
    s = escreverNumero(s, 116, 13, 0, 100000);
    s = escreverNumero(s, 129, 10, 0, 100);
    s = escreverTexto(s, 27, 50, ""); // limpa nome
    s = escreverTexto(s, 2, 11, String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11));
    return s;
  })() : linhaReg21Vazia(cpfContrib);
  let s = baseLimpa;
  // CNPJ da nova fonte (campo obrigatório, posicional)
  const cnpj = String(fonte.cnpj || "").replace(/\D/g, "").padStart(14, "0").slice(-14);
  s = escreverTexto(s, 13, 14, cnpj);
  // Demais campos via modificarReg21 (que já recalcula CRC no fim)
  return modificarReg21(s, fonte);
}

function criarReg27(cpfContrib, bem, linhaBase) {
  let s = linhaReg27Vazia(cpfContrib, linhaBase);
  // grupo + código + país (cod_pais default = "105" = Brasil; o campo no .DBK tem 2 chars
  // e armazena os 2 ÚLTIMOS dígitos do código, então "105" → "05")
  const grupo = String(bem.grupo || "99").padStart(2, "0").slice(0, 2);
  const codigo = String(bem.codigo || "99").padStart(2, "0").slice(0, 2);
  const pais = String(bem.cod_pais || "105").padStart(2, "0").slice(-2);
  s = escreverTexto(s, 13, 2, grupo);
  s = escreverTexto(s, 15, 2, codigo);
  s = escreverTexto(s, 17, 2, pais);
  if (bem.discriminacao != null) s = escreverTexto(s, 19, 512, bem.discriminacao, { upper: true, semAcento: true });
  return modificarReg27(s, bem); // valores + CRC
}

function criarReg28(cpfContrib, divida, linhaBase) {
  let s = linhaReg28Vazia(cpfContrib, linhaBase);
  const codigo = String(divida.codigo || "11").padStart(2, "0").slice(0, 2);
  s = escreverTexto(s, 13, 2, codigo);
  if (divida.discriminacao != null) s = escreverTexto(s, 15, 512, divida.discriminacao, { upper: true, semAcento: true });
  if (divida.valor_anterior != null) s = escreverNumero(s, 527, 13, divida.valor_anterior, 100);
  return modificarReg28(s, divida);
}

// Atualiza o footer T9: incrementa contagens dos tipos modificados + total + recalcula CRC
function atualizarT9(linhaT9, deltas) {
  // deltas = { "21": 2, "27": 1, "28": 0 } — incrementos por tipo
  if (!linhaT9 || !linhaT9.startsWith("T9")) return linhaT9;
  let s = linhaT9;
  const totalDelta = Object.values(deltas).reduce((a, b) => a + Number(b || 0), 0);
  if (totalDelta === 0) return s;
  // Atualizar TOTAL [15:19]
  const totalAtual = parseInt(s.substring(15, 19), 10) || 0;
  s = escreverTexto(s, 15, 4, String(totalAtual + totalDelta).padStart(4, "0"));
  // Atualizar slot de cada tipo
  for (const tipoStr in deltas) {
    const delta = Number(deltas[tipoStr] || 0);
    if (delta === 0) continue;
    const tipo = parseInt(tipoStr, 10);
    const pos = 20 + (tipo - 16) * 5;
    if (pos < 0 || pos + 4 > s.length - 10) continue; // fora do range válido
    const atual = parseInt(s.substring(pos, pos + 4), 10) || 0;
    s = escreverTexto(s, pos, 4, String(atual + delta).padStart(4, "0"));
  }
  return recalcLinhaCrc(s);
}

// ===== Carnê-Leão (reg 22 consolidado mensal + reg 49 lançamentos individuais) =====
// Estrutura validada por engenharia reversa contra um .DBK preenchido manualmente.

// Cria uma linha reg 22 vazia (167 chars) pra o cliente que ainda não tem
// Carnê-Leão alocado no .DBK. O PGD costuma pré-alocar 12 linhas (1 por mês),
// mas em clientes sem Carnê-Leão nunca tocado isso pode não estar.
function linhaReg22Vazia(cpfContrib, mes) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  const mm = String(mes).padStart(2, "0").slice(0, 2);
  let s = "22" + cpf + "N" + " ".repeat(11) + mm;
  s += "0".repeat(13);        // valor recebido (pos 27-39)
  s += "0".repeat(91);        // zeros (pos 40-130)
  s += "0".repeat(13);        // base cálculo (pos 131-143)
  s += "0".repeat(13);        // zeros (pos 144-156)
  s += "0".repeat(10);        // CRC placeholder
  return s; // 167 chars
}

// Atualiza valor de uma linha reg 22 existente, preenchendo os dois campos
// de valor (recebido + base de cálculo) com o mesmo total mensal × 100.
// Se houver deduções (dependentes, pensão), o segundo campo seria diferente —
// como esse caminho ainda não está modelado, gravamos iguais.
function atualizarReg22(linhaT22, valorMensalReais) {
  if (!linhaT22 || !linhaT22.startsWith("22")) return linhaT22;
  let s = linhaT22;
  s = escreverNumero(s, 27, 13, valorMensalReais, 100);   // valor recebido
  s = escreverNumero(s, 131, 13, valorMensalReais, 100);  // base de cálculo
  return recalcLinhaCrc(s);
}

// Cria uma linha reg 49 (71 chars) — um lançamento individual no Carnê-Leão.
// Cada pagamento avulso de um CPF pagador em um mês específico vira uma linha.
// Layout: "49" + cpfContrib(11) + 11 spaces + mes(2) + cpfPag(11) + cpfPag(11) + valor×100(13) + crc(10)
function criarReg49(cpfContrib, mes, cpfPagador, valorReais) {
  const cpf = String(cpfContrib).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  const cpfPag = String(cpfPagador).replace(/\D/g, "").padStart(11, "0").slice(0, 11);
  const mm = String(mes).padStart(2, "0").slice(0, 2);
  let s = "49" + cpf + " ".repeat(11) + mm + cpfPag + cpfPag;
  s += String(Math.round((Number(valorReais) || 0) * 100)).padStart(13, "0").slice(-13);
  s += "0".repeat(10); // CRC placeholder, recalculado abaixo
  return recalcLinhaCrc(s);
}

// ============================================================
// PROMPT PARA CLAUDE — modo SEM template: extração consolidada
// ============================================================

function montarPromptExtracao(reciboInfo, temFormulario, declAnteriorTexto, reciboPdfTexto) {
  const blocoDeclAnterior = declAnteriorTexto
    ? `\n=== DECLARAÇÃO IRPF DO ANO ANTERIOR (texto extraído do PDF) ===\n${declAnteriorTexto}\n`
    : "";
  const blocoReciboPdf = reciboPdfTexto
    ? `\n=== RECIBO DE TRANSMISSÃO (texto extraído do PDF) ===\n${reciboPdfTexto}\n`
    : "";
  const reciboNumero = reciboInfo?.recibo ? `\nNº do recibo (extraído do .REC): ${reciboInfo.recibo}` : "";
  const linhaFormulario = temFormulario
    ? "- FORMULÁRIO COMPLEMENTAR preenchido manualmente (anexado ao chat) — FONTE AUTORITATIVA: quando houver divergência, prevalece."
    : "";

  return `Você é um assistente especializado em IRPF brasileiro.
${blocoDeclAnterior}${blocoReciboPdf}${reciboNumero}

ARQUIVOS NO CHAT:
- Informes de rendimento, recibos e demais documentos do cliente estão anexados diretamente neste chat (PDFs/imagens).
${linhaFormulario}

TAREFA:
Extraia TODOS os dados relevantes pra uma declaração IRPF a partir dos documentos disponíveis (texto acima + anexos do chat). Sem template do ano anterior — você está consolidando os dados brutos para gerar uma declaração pré-preenchida no padrão Receita Federal.

REGRAS:
1. Agrupe fontes pagadoras por CNPJ (some valores quando o mesmo CNPJ aparecer em vários documentos).
2. Valores em reais como número decimal (50000.00 = R$ 50.000,00). Datas DDMMAAAA.
3. CNPJ e CPF apenas dígitos.
4. Para cada item, indique "origem" com descrição curta da fonte (ex: "informe Banco do Brasil", "recibo paciente Melissa", "formulário complementar") quando útil pra rastrear.
5. **CAMPO "discriminacao" (LONGO, padrão Receita Federal)** — preencha seguindo o padrão exato da Receita Federal por tipo de bem/dívida. Use TEXTO EM CAIXA ALTA. Concentre as informações estruturadas relevantes (CNPJ informador, agência/conta, quantidade, percentual, identificação física). Veja TEMPLATES por grupo no item 12 abaixo. Limite: 500 caracteres.
6. Para bens, classifique em GRUPO/CÓDIGO conforme a tabela da Receita (01=Imóveis: 11=apto, 12=casa, 13=terreno; 03=Participações Societárias: 01=ações, 02=quotas; 04=Aplicações: 01=poupança, 02=RDB/CDB/Tesouro/Fundos renda fixa; 06=Depósitos: 01=conta corrente; 07=Fundos: 03=FII, 06=ETF; 08=Cripto: 01=Bitcoin, 02=Altcoin, 03=Stablecoin). Se incerto, use 99/99.
7. Para dívidas: 11=empréstimo banco, 12=financiamento imóvel/veículo, 14=outras dívidas.
8. Para pagamentos efetuados: 21=despesa médica, 26=plano de saúde, 01=despesa com instrução, 30=pensão alimentícia.
9. Para rendimentos isentos: 25=Restituição IR anos anteriores, 11=Indenização rescisão, 12=Caderneta poupança/letras hipotecárias, 99=Outros.
10. Calcule totais e o resumo (impostos, deduções, base de cálculo).
11. **CAMPO "resumo" (CURTO, pra UI)** — descrição BREVE padronizada (max ~60 chars) que identifica o item rapidamente na interface. Padrões:
    - **Bens**: "{tipo} · {identificação} · {instituição}" — ex: "Aplicação · Tesouro Selic 2027 · Nu", "Imóvel · Apartamento · Cordoba 1102", "Conta corrente · BB · Ag 2954/16998-6", "Cripto · Bitcoin · 0.00022 BTC", "FII · MXRF11 · 9 cotas"
    - **Dívidas**: "{tipo} · {credor} · {detalhe}" — ex: "Financiamento · CEF · Imóvel Cordoba"
    - **Fontes pagadoras**: "{empresa} · {CNPJ resumido}" — ex: "Borba Bayma e Oliveira · 33.656.247"
    - **Rendimentos isentos**: "{categoria curta} · {fonte}" — ex: "Restituição IR · Receita"
    - **Tributação exclusiva**: "{tipo} · {fonte}" — ex: "Rend. aplicação · Itaú"
    - **Pagamentos efetuados**: "{tipo} · {beneficiário curto}" — ex: "Plano de saúde · Unimed Teresina"
    - **Dependentes**: "{nome curto} · {parentesco}" — ex: "Lara Mendes · Filha"
12. **TEMPLATES DE "discriminacao" por grupo de bem** (use exatamente este formato, em CAIXA ALTA):
    - **01/11 (Apartamento)**: \`APTO {nº} BLOCO {bl}, COND. {NOME}, RUA/AV {logr} Nº {n}, BAIRRO {b}, {CIDADE}-{UF}. ÁREA {x}m². MATRÍCULA {mat} CARTÓRIO {nome}. ADQUIRIDO EM {DD/MM/AAAA} DE {VENDEDOR} POR R$ {valor}.\`
    - **01/12 (Casa)**: \`IMOVEL CASA E TERRENO, COND. {NOME OPCIONAL} SITUADO NA RUA {logr} Nº {n}, BAIRRO {b}, {CIDADE}-{UF}. ÁREA {x}m². RESPONSAVEL POR {percentual}% DO IMOVEL. OS OUTROS {percentual}% LANCADO NO CPF {CPF} {NOME CO-PROPRIETARIO}.\`
    - **01/13 (Terreno)**: \`TERRENO LOTE {n} QUADRA {q}, LOTEAMENTO {NOME}, {CIDADE}-{UF}. ÁREA {x}m². ADQUIRIDO EM {data}.\`
    - **02/01 (Veículo)**: \`{MARCA}/{MODELO}, PLACA {PLACA}, ANO {ANO}/{ANO_FAB}, COR {COR}, CHASSI {CHASSI}. ADQUIRIDO EM {data} DE {VENDEDOR} POR R$ {valor}.\`
    - **03/01 (Ações)**: \`{quantidade} AÇÕES DA EMPRESA {NOME EMPRESA} (CNPJ {CNPJ}).\`
    - **03/02 (Quotas/Participação societária)**: \`{percentual}% DE PARTICIPACAO SOCIETARIA NA EMPRESA {NOME EMPRESA COMPLETO}.\` — ex: "50% DE PARTICIPACAO SOCIETARIA NA EMPRESA ORALVITTA ODONTOLOGIA LTDA."
    - **04/01 (Poupança)**: \`POUPANCA {NOME DA POUPANCA} BANCO {NOME BANCO}.\` — informe agência/conta nos campos específicos
    - **04/02 (RDB/CDB/Tesouro/Fundo renda fixa)**: \`{TIPO: RDB/CDB/TESOURO SELIC/TESOURO IPCA/etc.} {detalhe se aplicável, ex: vencimento} - INFORMADO POR CNPJ {CNPJ_DA_INSTITUICAO}.\` — ex: "TESOURO SELIC 01/03/2027 - INFORMADO POR CNPJ 62.169.875/0001-79"
    - **05/01 (Consórcio)**: \`CONSORCIO {bem alvo} {NOME ADMINISTRADORA}.\`
    - **06/01 (Conta corrente)**: \`CONTA CORRENTE {NOME BANCO}.\` — informe banco/agência/conta nos campos específicos. Se conjunta: \`CONTA CORRENTE CONJUNTA {NOME BANCO} COM {NOME CONJUNTO} CPF {CPF}.\`
    - **07/03 (FII)**: \`{TICKER} {NOME COMPLETO DO FUNDO} - {quantidade} COTAS EM 31/12/{ANO}.\` — ex: "MXRF11 MAXI RENDA FDO INV IMOB - 9 COTAS EM 31/12/2025."
    - **07/06 (ETF)**: \`{TICKER} {NOME COMPLETO DO ETF} - {quantidade} COTAS EM 31/12/{ANO}.\` — ex: "IVVB11 ISHARES S&P 500 FDO INV - 1 COTA EM 31/12/2025."
    - **08/01 (Bitcoin)**: \`QUANTIDADE DE {quantidade_decimal_completa} BTC - BITCOIN - EM 31/12/{ANO} - INFORMADO POR CNPJ {CNPJ_EXCHANGE}.\`
    - **08/02 (Altcoin)**: \`QUANTIDADE DE {quantidade} {SIMBOLO} - {NOME ALTCOIN} - EM 31/12/{ANO} - INFORMADO POR CNPJ {CNPJ_EXCHANGE}.\`
    - **08/03 (Stablecoin)**: \`QUANTIDADE DE {quantidade_decimal_completa} {SIMBOLO} - {NOME STABLECOIN} ({PLATAFORMA}) - EM 31/12/{ANO} - INFORMADO POR CNPJ {CNPJ}.\` — ex: "QUANTIDADE DE 34.3077355200 MUSD - MELI DOLAR (MERCADO LIVRE) - EM 31/12/2025 - INFORMADO POR CNPJ 23.351.302/0001-00"
    - **99/01-99 (Outros)**: \`{DESCRICAO LIVRE EM CAIXA ALTA, ESTRUTURADA COMO TEMPLATE ACIMA QUANDO POSSÍVEL}.\`
    - **DÍVIDA 11 (Empréstimo banco)**: \`EMPRESTIMO {TIPO: CREDIARIO/PESSOAL/CONSIGNADO} {NOME BANCO} AG/CONTA {ag}/{cc} - CONTRATO {nº contrato} FEITO EM {data}.\`
    - **DÍVIDA 12 (Financiamento)**: \`FINANCIAMENTO {bem: CASA/APTO/VEICULO} {NOME BANCO} - CONTRATO {nº}. {detalhe do bem financiado}.\`

FORMATO JSON (sem markdown, sem cercas, sem comentários):
{
  "anoDeclaracao": "2026",
  "anoCalendario": "2025",
  "contribuinte": {
    "nome": "",
    "cpf": "",
    "data_nascimento": "DDMMAAAA",
    "telefone": "",
    "celular": "",
    "email": "",
    "cpf_conjuge": "",
    "possui_conjuge": "Sim|Não",
    "natureza_ocupacao": "código - descrição",
    "ocupacao_principal": "código - descrição",
    "registro_profissional": "",
    "tipo_declaracao": "Declaração de Ajuste Anual Original",
    "recibo_anterior": "",
    "raca_cor": "Não informada",
    "residente_exterior": "Não",
    "alteracao_dados": "Não",
    "doenca_grave": "Não"
  },
  "endereco": { "logradouro": "", "numero": "", "complemento": "", "bairro": "", "municipio": "", "uf": "", "cep": "" },
  "dependentes": [
    { "resumo": "", "codigo": "21", "nome": "", "cpf": "", "data_nascimento": "DDMMAAAA", "email": "", "celular": "", "raca_cor": "Não informada", "mora_com_titular": "Sim" }
  ],
  "alimentandos": [
    { "resumo": "", "nome": "", "cpf": "", "data_nascimento": "DDMMAAAA", "residente": "No Brasil", "alimentando_de": "Titular" }
  ],
  "fontes_pagadoras": [
    { "resumo": "", "cnpj": "", "nome": "", "rendimentos_tributaveis": 0, "decimo_terceiro": 0, "inss": 0, "ir_retido": 0, "ir_retido_13": 0, "origem": "" }
  ],
  "rendimentos_isentos": [
    { "resumo": "", "codigo": "25", "categoria_descricao": "Restituição do imposto sobre a renda de anos-calendário anteriores", "nome_fonte": "", "cnpj_fonte": "", "valor": 0, "beneficiario": "Titular", "origem": "" }
  ],
  "rendimentos_tributacao_exclusiva": [
    { "resumo": "", "nome_fonte": "", "cnpj_fonte": "", "valor": 0, "beneficiario": "Titular", "origem": "" }
  ],
  "pagamentos_efetuados": [
    { "resumo": "", "codigo": "21", "nome_beneficiario": "", "cpf_cnpj_beneficiario": "", "valor_pago": 0, "parc_nao_dedutivel": 0, "descricao": "", "relacionado_a": "Titular", "origem": "" }
  ],
  "doacoes_efetuadas": [],
  "bens": [
    { "resumo": "", "grupo": "04", "codigo": "01", "discriminacao": "identificação curta", "valor_anterior": 0, "valor_atual": 0, "cnpj": "", "banco": "", "agencia": "", "conta": "", "bem_pertencente_a": "Titular", "origem": "" }
  ],
  "dividas": [
    { "resumo": "", "codigo": "11", "discriminacao": "identificação curta", "valor_anterior": 0, "valor_atual": 0, "valor_pago": 0, "credor": "", "origem": "" }
  ],
  "imposto_pago_retido": {
    "ir_retido_titular": 0,
    "ir_retido_dependentes": 0,
    "imposto_complementar": 0,
    "imposto_exterior": 0,
    "imposto_lei_11033": 0,
    "carne_leao_titular": 0,
    "carne_leao_dependentes": 0,
    "imposto_retido_rra": 0
  },
  "resumo": {
    "base_calculo": 0,
    "imposto_devido": 0,
    "deducao_incentivo": 0,
    "imposto_devido_i": 0,
    "aliquota_efetiva": 0,
    "total_imposto_devido": 0,
    "imposto_restituir": 0,
    "saldo_a_pagar": 0,
    "deducao_dependentes": 0,
    "despesas_medicas": 0,
    "despesas_instrucao": 0,
    "pensao_judicial": 0
  },
  "informacoes_bancarias": { "tipo_conta": "Conta Corrente", "banco": "", "agencia": "", "conta": "" },
  "totais": { "rendimentos_tributaveis_total": 0, "decimo_terceiro_total": 0, "inss_total": 0, "ir_retido_total": 0 },
  "observacoes": ""
}

Use 0 pra campos numéricos não encontrados, "" pra strings, [] pra listas vazias. Inclua TODOS os campos do schema. Responda SOMENTE com o JSON.`;
}

// ============================================================
// PROMPT PARA CLAUDE — pede um PATCH baseado no template existente
// ============================================================

function montarPromptPatch(templateInfo, reciboInfo, temFormulario, modoAgente, declAnteriorTexto, reciboPdfTexto) {
  // O template é a declaração ATUAL que está sendo trabalhada (não a do ano anterior).
  // Ex: template = PGD 2026 (ano-cal 2025) → estamos atualizando essa mesma declaração.
  // Os valores armazenados no template são: valor_anterior = 31/12/(anoCal-1), valor_atual = 31/12/anoCal.
  //
  // modoAgente=true → retorna versão CURTA (só resumo do template e contexto). Use quando a IA
  // já tem as regras carregadas como instruções de um agente pré-configurado (Claude Project,
  // Gemini Gem, Custom GPT). Reduz drasticamente o consumo de tokens.
  const anoCalAtual = templateInfo.anoCalendario || "2025";
  const anoCalAtualRef = String(parseInt(anoCalAtual, 10) - 1); // ano-cal-1 só pra referência (ex: 2024)
  const anoDeclAtual = templateInfo.anoDeclaracao || "2026";
  const contrib = templateInfo?.contribuinte;
  const end = templateInfo?.endereco;
  const linhasResumo = [];

  linhasResumo.push(`=== ESTRUTURA DO ARQUIVO DO PGD ${templateInfo.anoDeclaracao || "anterior"} (ano-calendário ${anoCalAtual}) ===\n`);

  if (contrib) {
    linhasResumo.push(`CONTRIBUINTE:`);
    linhasResumo.push(`  nome="${contrib.nome}" cpf=${contrib.cpf} nasc=${contrib.data_nascimento}`);
    linhasResumo.push(`  email="${contrib.email}" tel=${contrib.telefone} titulo_eleitor=${contrib.titulo_eleitor}`);
    if (end) {
      linhasResumo.push(`  endereço: ${end.tipo_logradouro} ${end.logradouro}, ${end.numero}, ${end.complemento}, ${end.bairro}, ${end.municipio}/${end.uf}, CEP ${end.cep}`);
    }
    linhasResumo.push("");
  }

  if (templateInfo?.fontes.length) {
    linhasResumo.push(`FONTES PAGADORAS no template (ano anterior) — ${templateInfo.fontes.length}:`);
    templateInfo.fontes.forEach((f, i) => {
      linhasResumo.push(`  F${i + 1}: CNPJ=${f.cnpj} "${f.nome}" — rend_ant=R$${fmtBRL(f.rendimentos_tributaveis)} 13º_ant=R$${fmtBRL(f.decimo_terceiro)} INSS_ant=R$${fmtBRL(f.inss)} IR_ant=R$${fmtBRL(f.ir_retido)}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.dependentes.length) {
    linhasResumo.push(`DEPENDENTES — ${templateInfo.dependentes.length}:`);
    templateInfo.dependentes.forEach((d, i) => {
      linhasResumo.push(`  D${i + 1}: CPF=${d.cpf} "${d.nome}" nasc=${d.data_nascimento} parentesco=${d.parentesco_cod}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.bens.length) {
    linhasResumo.push(`BENS — ${templateInfo.bens.length}:`);
    templateInfo.bens.forEach((b, i) => {
      const fixo = !bemAtualizavel(b) ? " [VALOR FIXO - NÃO ALTERAR]" : "";
      linhasResumo.push(`  B${i + 1} [grupo ${b.grupo}]${fixo}: "${b.discriminacao.slice(0, 200)}" — valor_${anoCalAtualRef}=R$${fmtBRL(b.valor_anterior)} valor_${anoCalAtual}=R$${fmtBRL(b.valor_atual)}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.dividas.length) {
    linhasResumo.push(`DÍVIDAS — ${templateInfo.dividas.length}:`);
    templateInfo.dividas.forEach((d, i) => {
      linhasResumo.push(`  V${i + 1} [cod ${d.codigo}]: "${d.discriminacao.slice(0, 200)}" — saldo_${anoCalAtualRef}=R$${fmtBRL(d.valor_anterior)} saldo_${anoCalAtual}=R$${fmtBRL(d.valor_atual)} valor_pago_${anoCalAtual}=R$${fmtBRL(d.valor_pago || 0)}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.rendIsentos.length) {
    linhasResumo.push(`RENDIMENTOS ISENTOS — ${templateInfo.rendIsentos.length}:`);
    templateInfo.rendIsentos.forEach((r, i) => {
      linhasResumo.push(`  I${i + 1}: CNPJ=${r.cnpj_fonte} "${r.nome_fonte}" — categoria="${r.descricao}" valor_${anoCalAtual}=R$${fmtBRL(r.valor)}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.pagamentos?.length) {
    linhasResumo.push(`PAGAMENTOS EFETUADOS — ${templateInfo.pagamentos.length}:`);
    templateInfo.pagamentos.forEach((p, i) => {
      linhasResumo.push(`  P${i + 1} [cod ${p.codigo}]: CNPJ/CPF=${p.cnpj_cpf} "${p.nome}" — valor_pago_${anoCalAtual}=R$${fmtBRL(p.valor_pago)}`);
    });
    linhasResumo.push("");
  }

  if (templateInfo?.rendExclusivos?.length) {
    linhasResumo.push(`RENDIMENTOS SUJEITOS À TRIB. EXCLUSIVA — ${templateInfo.rendExclusivos.length}:`);
    templateInfo.rendExclusivos.forEach((e, i) => {
      linhasResumo.push(`  E${i + 1} [cod ${e.codigo}] benef=${e.tipo_beneficiario}: CNPJ=${e.cnpj_fonte} "${e.nome_fonte}" — valor_${anoCalAtual}=R$${fmtBRL(e.valor)}`);
    });
    linhasResumo.push("");
  }

  const resumo = linhasResumo.join("\n");

  // Blocos de texto extraído dos PDFs locais (declaração anterior + recibo). Quando vazios, omitidos.
  const blocoDeclAnterior = declAnteriorTexto
    ? `\n=== DECLARAÇÃO IRPF DO ANO ANTERIOR (texto extraído do PDF) ===\n${declAnteriorTexto}\n`
    : "";
  const blocoReciboPdf = reciboPdfTexto
    ? `\n=== RECIBO DE TRANSMISSÃO (texto extraído do PDF) ===\n${reciboPdfTexto}\n`
    : "";
  const reciboNumero = reciboInfo?.recibo ? `\nNº do recibo (extraído do .REC): ${reciboInfo.recibo}` : "";

  if (modoAgente) {
    // Versão curta: assume que a IA é um agente pré-configurado (Claude Project / Gemini Gem /
    // Custom GPT) que já tem as regras de negócio, schema JSON e tabelas de códigos
    // carregadas como instruções fixas.
    return `=== TEMPLATE DO CLIENTE — ano-calendário ${anoCalAtual}, declaração ${anoDeclAtual} ===

${resumo}${blocoDeclAnterior}${blocoReciboPdf}${reciboNumero}

=== ARQUIVOS NO CHAT ===
- Informes de rendimento, recibos e demais documentos do cliente estão anexados diretamente neste chat (PDFs/imagens).
${temFormulario ? "- FORMULÁRIO COMPLEMENTAR preenchido manualmente (anexado ao chat) — autoritativo: prevalece sobre os informes em caso de divergência" : ""}

Gere o JSON patch conforme suas instruções. Resposta APENAS o JSON, sem texto antes/depois, sem cercas markdown.`;
  }

  const instrucoes = `Você é um assistente especializado em IRPF brasileiro (ano-calendário ${anoCalAtual}, declaração ${anoDeclAtual}).

CONTEXTO:
${resumo}${blocoDeclAnterior}${blocoReciboPdf}${reciboNumero}

ARQUIVOS NO CHAT:
- Informes de rendimento, recibos e demais documentos do cliente estão anexados diretamente neste chat (PDFs/imagens).
${temFormulario ? "- FORMULÁRIO COMPLEMENTAR preenchido manualmente pelo cliente/contador (anexado ao chat). Esta é a FONTE AUTORITATIVA: quando houver divergência com os informes, os valores escritos à mão no formulário PREVALECEM. Os valores entre colchetes no formulário são apenas referência do ano anterior — IGNORE-OS, use só o que foi escrito à mão nas linhas em branco." : ""}

TAREFA:
Produza um JSON "patch" indicando o que ATUALIZAR no arquivo do ano atual com base nos documentos anexados.

REGRAS DURAS:
1. Para itens com [VALOR FIXO - NÃO ALTERAR] (imóveis, veículos, participações societárias): NÃO inclua no patch.
2. **Fontes pagadoras (Reg 21 do .DBK) são SEMPRE pessoa jurídica com CNPJ válido (14 dígitos):**
   - Se o CNPJ existe no template, atualize em "fontes_pagadoras".
   - Se NÃO existe no template, coloque em "fontes_novas" (com CNPJ obrigatório).
   - **NUNCA coloque pessoa física (CPF, 11 dígitos) em "fontes_novas".** Pagadores PF entram em "rendimentos_pf_carne_leao" (regra 9).
3. Para bens financeiros (saldos de CC, fundos, CDB, aplicações): se houver informe correspondente, atualize "valor_atual". Identifique a correspondência pelo nome do banco ou CNPJ na discriminação. Se não houver informe específico, NÃO inclua no patch (mantém valor do template).
4. Para dívidas: atualize "valor_atual" se houver informe do banco credor. Senão, omita.
5. Para rendimentos isentos: indexe por CNPJ da fonte. Atualize valor se houver informe.
6. Para contribuinte/endereço: atualize só os campos que mudaram (mudança de endereço, telefone, etc). Se nada mudou, retorne null.
7. Se você não tiver acesso a informes do ano atual nos arquivos anexados ao chat, retorne patch quase vazio: só o que conseguir confirmar pela declaração anterior ou texto extraído. Use o campo "observacoes" pra alertar.
8. Valores em reais como número decimal (50000.00 = R$ 50.000,00). Datas DDMMAAAA.
9. **Rendimentos recebidos de PESSOA FÍSICA (paciente, cliente PF, locatário PF, etc.):**
   - Vão em "rendimentos_pf_carne_leao" — esses rendimentos serão lançados na ficha **"Rendimentos Tributáveis Recebidos de PF/Exterior (Carnê-Leão)"** do PGD.
   - Identifique cada PF por CPF (11 dígitos) — nunca por CNPJ.
   - Se possível, indique o MÊS de cada recebimento (1-12), pois o Carnê-Leão é mensal.
   - Tipicamente aparece em: recibos de serviços prestados por autônomos (médicos, dentistas, advogados, contadores), aluguéis recebidos de PF, doações recebidas, etc.
10. **NÃO emita itens em "*_atualizados" com valores IDÊNTICOS aos do template.** Se o informe confirma um saldo que já está no template (ex: poupança continua com R$ 0,14, CDB continua zerado), OMITA o item — não há nada pra atualizar. Só inclua em "bens_atualizados" / "dividas_atualizadas" / "rendimentos_isentos_atualizados" / "fontes_pagadoras" quando ao menos UM valor numérico mudou em relação ao template.
11. **VALORES SÃO SEMPRE POSITIVOS (>= 0). NUNCA emita valor negativo em bem, dívida, fonte ou rendimento — o PGD rejeita o arquivo se houver sinal de menos no campo numérico.** Em particular: **SALDO NEGATIVO DE CONTA CORRENTE** (cheque especial / overdraft / "saldo devedor") é uma **DÍVIDA** (reg 28, código 11), NÃO um bem com valor negativo. Coloque em "dividas_novas_aviso" com valor positivo (o módulo do saldo devedor). Da mesma forma, saldos a descoberto em cartão, conta-garantia, etc. são dívidas — nunca bens negativos.
12. **valor_pago em dívidas** corresponde ao campo "Valor Pago em ${anoCalAtual}" do PGD — é a SOMA de tudo que o contribuinte PAGOU dessa dívida no ano (amortização do principal + juros + outros encargos). Em informes de financiamento aparece como "Prestações pagas em ${anoCalAtual}" ou somatório dos pagamentos. Se o informe traz separado (ex.: "Juros pagos R$ 483,85" e "Amortização R$ 6.033,11"), some os dois pra obter valor_pago. Só emita valor_pago quando o informe der essa informação concreta.
13. **PAGAMENTOS EFETUADOS (ficha "Pagamentos Efetuados" do PGD, reg 26 do .DBK):** representa o que o contribuinte PAGOU pra deduzir do IR (ou só declarar, mesmo sem deduzir). **Códigos OFICIAIS do PGD (use estes EXATOS):**
    - **01** Despesas com instrução no Brasil (escola, faculdade, curso técnico) — limite anual por dependente
    - **02** Despesas com instrução no exterior
    - **09** Fonoaudiólogos no Brasil (PF)
    - **10** Médicos no Brasil (PF)
    - **11** Dentistas no Brasil (PF)
    - **12** Psicólogos no Brasil (PF)
    - **13** Fisioterapeutas no Brasil (PF)
    - **14** Terapeutas ocupacionais no Brasil (PF)
    - **15–20** mesmas categorias profissionais, no exterior
    - **21** Hospitais, clínicas, laboratórios e demais PJ que prestam serviços médicos/odontológicos no Brasil
    - **22** Aparelhos ortopédicos e próteses
    - **23** Hospitais/clínicas no exterior
    - **24** Seguros saúde no Brasil
    - **26** Planos de saúde / operadoras no Brasil
    - **27** Planos de saúde no exterior
    - **33** Pensão alimentícia paga (decisão judicial ou acordo extrajudicial)
    - **36** Previdência complementar (PGBL/FAPI)
    - **37** Contribuição previdenciária INSS (empregado doméstico, autônomo etc.)
    - **40** Cooperativa odontológica / médica
    - **60** Aluguel pago (informativo, não dedutível)
    - **70** Honorários advocatícios pagos relacionados a pensão judicial
    - **72** Pensão judicial não-alimentícia
    Use o código CORRETO conforme o tipo. Pra uma LTDA odontológica (CNPJ), use 21. Pra um dentista pessoa física (CPF), use 11. Pra mensalidade escolar, use **01**. Se houver INFORME/RECIBO que confirme pagamento JÁ NO TEMPLATE: "pagamentos_atualizados". Se for NOVO: "pagamentos_novos_aviso".
14. **Pagamentos com R$ 0,00 no template DEVEM ser sugeridos pra REMOÇÃO** — coloque em "pagamentos_a_remover" com motivo "pagamento R$ 0,00 sem recorrência em ${anoCalAtual}". Eles foram declarados ano passado mas não recorreram este ano. Se houver informe atualizando o valor pra > 0, NÃO remova — coloque em "pagamentos_atualizados".
15. **RENDIMENTOS SUJEITOS À TRIBUTAÇÃO EXCLUSIVA / DEFINITIVA (ficha do PGD, reg 88 do .DBK):** valores que já tiveram IR retido na fonte de forma definitiva e não compõem o ajuste anual. Códigos comuns:
    - **06** Rendimentos de aplicações financeiras (CDB pré, RDB, Tesouro Direto, LCI/LCA não-isenta, fundos)
    - **09** Lucros e dividendos isentos? não, são reg 86 → use só pra confirmação
    - **10** 13º salário (parte que tributou exclusivamente)
    - **12** Ganhos de capital em alienação de bens
    - **18** Juros sobre capital próprio (JCP)
    - **24** Outros rendimentos sujeitos a tributação exclusiva
    Se houver informe atualizando valor de rendimento exclusivo JÁ no template (mesma fonte CNPJ + mesmo código): "rendimentos_exclusivos_atualizados". Se for NOVO (fonte/código não está no template): "rendimentos_exclusivos_novos_aviso". Se zerado no informe: "rendimentos_exclusivos_a_remover".
16. **ANTI-DUPLICAÇÃO**: antes de propor qualquer item NOVO (bem, dívida, fonte, rendimento isento, exclusivo, pagamento), VERIFIQUE se já existe item equivalente no resumo do template acima. Critério de matching:
    - **Bens** (B1, B2, ...): mesma raiz de CNPJ + mesma natureza (CDB ≈ RDB ≈ aplicação financeira no mesmo banco). Se o cliente já tem uma aplicação financeira no CNPJ 30.680.829 (Nu Financeira) listada em rendimentos exclusivos (reg 88) ou em bens, NÃO crie outra com a mesma fonte — atualize a existente em "bens_atualizados" ou "rendimentos_exclusivos_atualizados".
    - **Fontes pagadoras**: comparar CNPJ raiz. Não duplique.
    - **Pagamentos**: comparar CNPJ + código. Não duplique.
    - **Rendimentos exclusivos**: comparar CNPJ + código tipo rendimento. Não duplique.
    Quando em dúvida, prefira ATUALIZAR um item existente a CRIAR um novo (a duplicação corrompe a declaração).

FORMATO DO PATCH (JSON, sem markdown, sem cercas):
{
  "contribuinte": null | { "nome"?: "...", "email"?: "...", "telefone"?: "...", "data_nascimento"?: "DDMMAAAA", "titulo_eleitor"?: "..." },
  "endereco": null | { "tipo_logradouro"?: "AVENIDA", "logradouro"?: "...", "numero"?: "...", "complemento"?: "...", "bairro"?: "...", "cep"?: "...", "municipio"?: "...", "uf"?: "MA" },
  "fontes_pagadoras": [
    { "resumo": "{empresa} · {CNPJ curto}", "cnpj": "14_digitos", "nome"?: "...", "rendimentos_tributaveis": 0, "decimo_terceiro": 0, "inss": 0, "ir_retido": 0, "origem": "qual_arquivo.pdf" }
  ],
  "fontes_novas": [
    { "resumo": "...", "cnpj": "14_digitos_obrigatorio", "nome": "...", "rendimentos_tributaveis": 0, "decimo_terceiro": 0, "inss": 0, "ir_retido": 0, "origem": "..." }
  ],
  "rendimentos_pf_carne_leao": [
    { "resumo": "{nome PF} · CPF {curto} · {detalhe}", "cpf": "11_digitos", "nome": "...", "valor_total_ano": 0, "valores_mensais": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0, "12": 0 }, "natureza": "honorarios_servico_prestado | aluguel | outros", "origem": "..." }
  ],
  "bens_atualizados": [
    { "resumo": "{tipo} · {identificação curta}", "idx": 1, "valor_atual": 0, "valor_anterior"?: 0, "origem": "..." }
  ],
  "bens_a_remover": [
    { "idx": 1, "motivo": "ativo vendido/encerrado/zerado em ${anoCalAtual}" }
  ],
  "dividas_atualizadas": [
    { "resumo": "{tipo} · {credor}", "idx": 1, "valor_atual": 0, "valor_anterior"?: 0, "valor_pago"?: 0, "origem": "..." }
  ],
  "dividas_a_remover": [
    { "idx": 1, "motivo": "dívida quitada em ${anoCalAtual}" }
  ],
  "dependentes_atualizados": [
    { "resumo": "{nome} · {parentesco}", "idx": 1, "nome"?: "...", "data_nascimento"?: "DDMMAAAA", "cpf"?: "..." }
  ],
  "dependentes_a_remover": [
    { "idx": 1, "motivo": "dependente saiu da declaração em ${anoCalAtual}" }
  ],
  "rendimentos_isentos_atualizados": [
    { "resumo": "{categoria} · {fonte}", "idx": 1, "valor": 0, "origem": "..." }
  ],
  "rendimentos_exclusivos_atualizados": [
    { "resumo": "{categoria} · {fonte}", "idx": 1, "valor": 0, "codigo": "06", "origem": "..." }
  ],
  "rendimentos_exclusivos_a_remover": [
    { "idx": 1, "motivo": "rendimento não recorreu em ${anoCalAtual}" }
  ],
  "rendimentos_exclusivos_novos_aviso": [
    { "resumo": "{tipo} · {fonte}", "codigo": "06", "tipo_beneficiario": "T", "cpf_beneficiario": "", "cnpj_fonte": "", "nome_fonte": "", "valor": 0, "origem": "" }
  ],
  "pagamentos_atualizados": [
    { "resumo": "{tipo} · {beneficiário}", "idx": 1, "valor_pago": 0, "origem": "..." }
  ],
  "pagamentos_a_remover": [
    { "idx": 1, "motivo": "pagamento R$ 0,00 / não recorreu em ${anoCalAtual} / sem informe" }
  ],
  "bens_novos_aviso": [
    { "resumo": "{tipo} · {identificação} · {instituição}", "grupo": "04", "codigo": "02", "discriminacao": "TEMPLATE RECEITA EM CAIXA ALTA — ver instruções abaixo", "valor_anterior": 0, "valor_atual": 0, "cnpj": "", "banco": "", "agencia": "", "conta": "", "origem": "" }
  ],
  "dividas_novas_aviso": [
    { "resumo": "...", "codigo": "11", "discriminacao": "TEMPLATE RECEITA", "valor_anterior": 0, "valor_atual": 0, "valor_pago": 0, "credor": "", "origem": "" }
  ],
  "pagamentos_novos_aviso": [
    { "resumo": "{tipo} · {beneficiário}", "codigo": "21", "cnpj_cpf": "", "nome": "", "valor_pago": 0, "origem": "" }
  ],
  "dependentes_novos_aviso": [
    { "resumo": "...", "codigo": "21", "nome": "", "cpf": "", "data_nascimento": "DDMMAAAA" }
  ],
  "ano_referencia": "${anoCalAtual}",
  "observacoes": "qualquer ressalva, dado faltante, divergência"
}

INSTRUÇÕES IMPORTANTES:
- O campo "resumo" é OBRIGATÓRIO em cada item — descrição BREVE padronizada (max ~60 chars) que identifica o item, pra facilitar a revisão na UI e ações manuais no PGD.
- O campo "discriminacao" (em bens_novos_aviso, dividas_novas_aviso, fontes_novas) deve seguir os TEMPLATES da Receita Federal em CAIXA ALTA. Exemplos por grupo:
  * **01/11 (Apto)**: \`APTO {nº} BLOCO {bl}, COND. {NOME}, RUA {logr} Nº {n}, BAIRRO {b}, {CIDADE}-{UF}.\`
  * **01/12 (Casa)**: \`IMOVEL CASA E TERRENO, SITUADO NA RUA {logr} Nº {n}, BAIRRO {b}, {CIDADE}-{UF}.\`
  * **02/01 (Veículo)**: \`{MARCA}/{MODELO}, PLACA {PLACA}, ANO {ANO}/{ANO_FAB}, COR {COR}, CHASSI {CHASSI}.\`
  * **03/02 (Participação societária)**: \`{percentual}% DE PARTICIPACAO SOCIETARIA NA EMPRESA {NOME EMPRESA COMPLETO}.\`
  * **04/01 (Poupança)**: \`POUPANCA {NOME} BANCO {BANCO}.\`
  * **04/02 (RDB/CDB/Tesouro)**: \`{TIPO} {detalhe ex: vencimento} - INFORMADO POR CNPJ {CNPJ}.\`
  * **06/01 (Conta corrente)**: \`CONTA CORRENTE {NOME BANCO}.\` (banco/agência/conta vão nos campos)
  * **07/03 (FII)**: \`{TICKER} {NOME COMPLETO} - {quantidade} COTAS EM 31/12/{ANO}.\`
  * **07/06 (ETF)**: \`{TICKER} {NOME COMPLETO} - {quantidade} COTAS EM 31/12/{ANO}.\`
  * **08/01 (Bitcoin)**: \`QUANTIDADE DE {qtd_decimal_completa} BTC - BITCOIN - EM 31/12/{ANO} - INFORMADO POR CNPJ {CNPJ}.\`
  * **08/03 (Stablecoin)**: \`QUANTIDADE DE {qtd_decimal_completa} {SIMBOLO} - {NOME} ({PLATAFORMA}) - EM 31/12/{ANO} - INFORMADO POR CNPJ {CNPJ}.\` — ex: "QUANTIDADE DE 34.3077355200 MUSD - MELI DOLAR (MERCADO LIVRE) - EM 31/12/2025 - INFORMADO POR CNPJ 23.351.302/0001-00"
  * **DÍVIDA 11**: \`EMPRESTIMO {TIPO} {NOME BANCO} AG/CONTA {ag}/{cc} - CONTRATO {nº}.\`
  * **DÍVIDA 12**: \`FINANCIAMENTO {bem} {NOME BANCO} - CONTRATO {nº}.\`
- Os campos "idx" devem corresponder ao número (B1, B2, D1, etc) listado acima.
- **valor_anterior** em bens_atualizados e dividas_atualizadas é OPCIONAL — só emita se o INFORME contradizer o valor armazenado no template pro ano anterior (ano-cal-1). Use quando o cliente comprova que o saldo em 31/12/(ano-cal-1) era diferente do que veio na pré-preenchida — ex: pré-preenchida traz R$ 722,95 em 31/12/2024 mas o informe de rendimentos diz que o saldo em 31/12/2024 era R$ 0,00. Pra a maioria dos casos NÃO emita valor_anterior (o saldo histórico do template já é correto).
- Responda SOMENTE com o JSON. Sem markdown, sem texto adicional, sem cercas \`\`\`.`;

  return instrucoes;
}

// ============================================================
// APLICAÇÃO DO PATCH no template
// ============================================================

function aplicarPatch(templateInfo, patch, aprovacoes, manualOverrides = {}) {
  // aprovacoes é um objeto { 'contrib': bool, 'fonte_<cnpj>': bool, 'bem_<idx>': bool, ... }
  // manualOverrides são edições do contador sobre itens propostos (Fase 1 da edição manual).
  // Chave: ex. "bem_atualizado_3", "bem_novo_0", "fonte_atualizada_5". Valor: subset de campos sobrescritos.
  const linhasOriginais = [...templateInfo.linhas];
  const novasLinhas = [...linhasOriginais];
  const aplicadas = [];

  // Helper: aplica override (se existir) por cima de um item do patch antes de escrever no .DBK.
  // Garante que o valor que vai pra Receita é o EDITADO PELO CONTADOR, não o original da IA.
  const aplicaOv = (item, chave) => {
    const ov = manualOverrides[chave];
    if (!ov) return item;
    // Items "string" legados viram { resumo: string } antes de mesclar
    const base = typeof item === "string" ? { resumo: item } : item;
    return { ...base, ...ov };
  };

  // 16 — contribuinte/endereço
  if (templateInfo.contribuinte && (patch.contribuinte || patch.endereco) && aprovacoes["contrib"] !== false) {
    const idx = templateInfo.contribuinte._idx;
    const novaLinha = modificarReg16(linhasOriginais[idx], patch.contribuinte || {}, patch.endereco || {});
    if (novaLinha !== linhasOriginais[idx]) {
      novasLinhas[idx] = novaLinha;
      aplicadas.push("contribuinte/endereço");
    }
  }

  // 21 — fontes pagadoras existentes (match por CNPJ)
  for (const f of patch.fontes_pagadoras || []) {
    const cnpjLimpo = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
    if (aprovacoes[`fonte_${cnpjLimpo}`] === false) continue;
    const idxTpl = templateInfo.fontes.findIndex((x) => x.cnpj === cnpjLimpo);
    if (idxTpl < 0) continue;
    const fonteTpl = templateInfo.fontes[idxTpl];
    const fFinal = aplicaOv(f, `fonte_atualizada_${idxTpl + 1}`);
    novasLinhas[fonteTpl._idx] = modificarReg21(linhasOriginais[fonteTpl._idx], fFinal);
    aplicadas.push(`fonte ${cnpjLimpo}`);
  }

  // 27 — bens
  for (const b of patch.bens_atualizados || []) {
    if (aprovacoes[`bem_${b.idx}`] === false) continue;
    const tpl = templateInfo.bens[b.idx - 1];
    if (!tpl) continue;
    if (!bemAtualizavel(tpl)) continue; // proteção dupla
    const bFinal = aplicaOv(b, `bem_atualizado_${b.idx}`);
    novasLinhas[tpl._idx] = modificarReg27(linhasOriginais[tpl._idx], bFinal);
    aplicadas.push(`bem B${b.idx}`);
  }

  // 28 — dívidas
  for (const d of patch.dividas_atualizadas || []) {
    if (aprovacoes[`divida_${d.idx}`] === false) continue;
    const tpl = templateInfo.dividas[d.idx - 1];
    if (!tpl) continue;
    const dFinal = aplicaOv(d, `divida_atualizada_${d.idx}`);
    novasLinhas[tpl._idx] = modificarReg28(linhasOriginais[tpl._idx], dFinal);
    aplicadas.push(`dívida V${d.idx}`);
  }

  // 25 — dependentes
  for (const dep of patch.dependentes_atualizados || []) {
    if (aprovacoes[`dep_${dep.idx}`] === false) continue;
    const tpl = templateInfo.dependentes[dep.idx - 1];
    if (!tpl) continue;
    novasLinhas[tpl._idx] = modificarReg25(linhasOriginais[tpl._idx], dep);
    aplicadas.push(`dependente D${dep.idx}`);
  }

  // 86/84 — rendimentos isentos
  for (const _ri of patch.rendimentos_isentos_atualizados || []) {
    const ri = aplicaOv(_ri, `isento_atualizado_${_ri.idx}`);
    if (aprovacoes[`isento_${ri.idx}`] === false) continue;
    const tpl = templateInfo.rendIsentos[ri.idx - 1];
    if (!tpl) continue;
    if (tpl.tipo_reg === "84") {
      // BLOQUEIO DEFENSIVO: reg 84 tem CRC de 12 chars (vs 10 do reg 86 e demais).
      // recalcLinhaCrc assume 10 chars — escrever sem ajustar o CRC corrompe o .DBK
      // e o PGD rejeita o arquivo. Liberar quando engenharia reversa do CRC do reg 84
      // estiver concluída.
      console.warn(`[reg 84] Atualização de rendimento isento I${ri.idx} (tipo lucros/dividendos ou similar) ignorada: edição de reg 84 ainda não suportada.`);
      aplicadas.push(`isento I${ri.idx} (reg 84 — não atualizado, ainda não suportado)`);
      continue;
    }
    novasLinhas[tpl._idx] = modificarReg86(linhasOriginais[tpl._idx], ri);
    aplicadas.push(`isento I${ri.idx}`);
  }

  // 86/84 — rendimentos isentos a REMOVER
  const isentosRemovidos = [];
  for (const ri of patch.rendimentos_isentos_a_remover || []) {
    if (aprovacoes[`isento_remover_${ri.idx}`] === false) continue;
    const tpl = templateInfo.rendIsentos[ri.idx - 1];
    if (!tpl) continue;
    // Remoção (set null) é segura tanto pra reg 86 quanto pra reg 84 — não escreve CRC,
    // só marca a linha pra ser filtrada antes de gerar o arquivo final.
    novasLinhas[tpl._idx] = null;
    isentosRemovidos.push(ri.idx);
    aplicadas.push(`remove isento I${ri.idx}${tpl.tipo_reg === "84" ? " (reg 84)" : ""}`);
  }

  // 26 — pagamentos efetuados (UPDATE)
  for (const _p of patch.pagamentos_atualizados || []) {
    const p = aplicaOv(_p, `pag_atualizado_${_p.idx}`);
    if (aprovacoes[`pag_${p.idx}`] === false) continue;
    const tpl = templateInfo.pagamentos[p.idx - 1];
    if (!tpl) continue;
    novasLinhas[tpl._idx] = modificarReg26(linhasOriginais[tpl._idx], p);
    aplicadas.push(`pagamento P${p.idx}`);
  }

  // 26 — pagamentos a REMOVER (marca como null pra ser filtrado depois)
  const pagamentosRemovidos = [];
  for (const p of patch.pagamentos_a_remover || []) {
    if (aprovacoes[`pag_remover_${p.idx}`] === false) continue;
    const tpl = templateInfo.pagamentos[p.idx - 1];
    if (!tpl) continue;
    novasLinhas[tpl._idx] = null;
    pagamentosRemovidos.push(p.idx);
    aplicadas.push(`remove pagamento P${p.idx}`);
  }

  // 88 — rendimentos sujeitos à tributação exclusiva (UPDATE)
  for (const _e of patch.rendimentos_exclusivos_atualizados || []) {
    const e = aplicaOv(_e, `excl_atualizado_${_e.idx}`);
    if (aprovacoes[`excl_${e.idx}`] === false) continue;
    const tpl = templateInfo.rendExclusivos[e.idx - 1];
    if (!tpl) continue;
    novasLinhas[tpl._idx] = modificarReg88(linhasOriginais[tpl._idx], e);
    aplicadas.push(`exclusivo E${e.idx}`);
  }

  // 88 — rendimentos exclusivos a REMOVER
  const exclusivosRemovidos = [];
  for (const e of patch.rendimentos_exclusivos_a_remover || []) {
    if (aprovacoes[`excl_remover_${e.idx}`] === false) continue;
    const tpl = templateInfo.rendExclusivos[e.idx - 1];
    if (!tpl) continue;
    novasLinhas[tpl._idx] = null;
    exclusivosRemovidos.push(e.idx);
    aplicadas.push(`remove exclusivo E${e.idx}`);
  }

  // ===== Remoções MANUAIS via checkbox REVISAR =====
  // Itens marcados pelo contador na UI mas que não vieram do patch da IA.
  // O contador olha pra um item zerado (status=revisar) e marca pra remover manualmente.
  // Esses items não duplicam patch.*_a_remover — só agimos se o patch não já tratou.
  const remManuais = { bens: [], dividas: [], pagamentos: [], isentos: [], exclusivos: [] };
  const removerSeMarcado = (lista, chavePrefixo, patchRemoverLista, destinoLista, tipoLog) => {
    for (let i = 0; i < lista.length; i++) {
      const idx = i + 1;
      if (aprovacoes[`${chavePrefixo}_revisar_remover_${idx}`] !== true) continue;
      // Evita double-process se patch da IA já marcou esse mesmo idx pra remover
      if ((patchRemoverLista || []).some((x) => x.idx === idx)) continue;
      const tpl = lista[i];
      if (!tpl || tpl._idx == null) continue;
      novasLinhas[tpl._idx] = null;
      destinoLista.push(idx);
      aplicadas.push(`remove ${tipoLog}${idx} (manual)`);
    }
  };
  removerSeMarcado(templateInfo.bens || [],          "bem",    patch.bens_a_remover,                    remManuais.bens,       "bem B");
  removerSeMarcado(templateInfo.dividas || [],       "divida", patch.dividas_a_remover,                 remManuais.dividas,    "dívida V");
  removerSeMarcado(templateInfo.pagamentos || [],    "pag",    patch.pagamentos_a_remover,              remManuais.pagamentos, "pagamento P");
  removerSeMarcado(templateInfo.rendIsentos || [],   "isento", patch.rendimentos_isentos_a_remover,     remManuais.isentos,    "isento I");
  removerSeMarcado(templateInfo.rendExclusivos || [],"excl",   patch.rendimentos_exclusivos_a_remover,  remManuais.exclusivos, "exclusivo E");

  // ===== INSERT de novos itens (constrói linhas do zero e insere antes do T9) =====
  // CPF do contribuinte (necessário no header de cada nova linha)
  const cpfContrib = templateInfo.contribuinte?.cpf || "00000000000";
  // Acumulador de deltas por tipo, pra atualizar o T9 no fim
  const deltasT9 = {};
  if (pagamentosRemovidos.length) deltasT9["26"] = (deltasT9["26"] || 0) - pagamentosRemovidos.length;
  if (exclusivosRemovidos.length) deltasT9["88"] = (deltasT9["88"] || 0) - exclusivosRemovidos.length;
  // Isentos podem ser reg 86 OU reg 84 — contabilizar separado pra o T9 ficar coerente
  for (const idx of isentosRemovidos) {
    const tpl = templateInfo.rendIsentos[idx - 1];
    const tipoReg = tpl?.tipo_reg === "84" ? "84" : "86";
    deltasT9[tipoReg] = (deltasT9[tipoReg] || 0) - 1;
  }
  // Deltas das remoções manuais
  if (remManuais.bens.length)        deltasT9["27"] = (deltasT9["27"] || 0) - remManuais.bens.length;
  if (remManuais.dividas.length)     deltasT9["28"] = (deltasT9["28"] || 0) - remManuais.dividas.length;
  if (remManuais.pagamentos.length)  deltasT9["26"] = (deltasT9["26"] || 0) - remManuais.pagamentos.length;
  if (remManuais.exclusivos.length)  deltasT9["88"] = (deltasT9["88"] || 0) - remManuais.exclusivos.length;
  for (const idx of remManuais.isentos) {
    const tpl = templateInfo.rendIsentos[idx - 1];
    const tipoReg = tpl?.tipo_reg === "84" ? "84" : "86";
    deltasT9[tipoReg] = (deltasT9[tipoReg] || 0) - 1;
  }

  // Achar o índice do T9 (footer) — última linha que começa com "T9"
  let idxT9 = -1;
  for (let i = novasLinhas.length - 1; i >= 0; i--) {
    if (novasLinhas[i] && novasLinhas[i].startsWith("T9")) { idxT9 = i; break; }
  }

  const linhasAInserir = [];

  // 21 — fontes pagadoras NOVAS (PJ apenas, identificadas por CNPJ válido)
  const linhaBase21 = buscarLinhaBase(linhasOriginais, "21");
  (patch.fontes_novas || []).forEach((_f, i) => {
    const f = aplicaOv(_f, `fonte_novo_${i}`);
    if (aprovacoes[`fonte_nova_${i}`] === false) return;
    const cnpj = String(f.cnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) return; // sem CNPJ válido, não é PJ → não grava (PF vai pra outra ficha)
    linhasAInserir.push(criarReg21(cpfContrib, { ...f, cnpj }, linhaBase21));
    deltasT9["21"] = (deltasT9["21"] || 0) + 1;
    aplicadas.push(`fonte nova PJ ${cnpj}`);
  });

  // 27 — bens NOVOS
  const linhaBase27 = buscarLinhaBase(linhasOriginais, "27");
  (patch.bens_novos_aviso || []).forEach((_b, i) => {
    const b = aplicaOv(_b, `bem_novo_${i}`);
    if (aprovacoes[`bem_novo_${i}`] === false) return;
    if (typeof b === "string") return; // legado: aviso textual, não grava
    linhasAInserir.push(criarReg27(cpfContrib, b, linhaBase27));
    deltasT9["27"] = (deltasT9["27"] || 0) + 1;
    aplicadas.push(`bem novo ${b.resumo || b.discriminacao?.slice(0, 30) || ""}`);
  });

  // 28 — dívidas NOVAS
  const linhaBase28 = buscarLinhaBase(linhasOriginais, "28");
  (patch.dividas_novas_aviso || []).forEach((_d, i) => {
    const d = aplicaOv(_d, `divida_novo_${i}`);
    if (aprovacoes[`divida_nova_${i}`] === false) return;
    if (typeof d === "string") return;
    linhasAInserir.push(criarReg28(cpfContrib, d, linhaBase28));
    deltasT9["28"] = (deltasT9["28"] || 0) + 1;
    aplicadas.push(`dívida nova ${d.resumo || d.discriminacao?.slice(0, 30) || ""}`);
  });

  // 26 — pagamentos NOVOS
  const linhaBase26 = buscarLinhaBase(linhasOriginais, "26");
  (patch.pagamentos_novos_aviso || []).forEach((_p, i) => {
    const p = aplicaOv(_p, `pag_novo_${i}`);
    if (aprovacoes[`pag_novo_${i}`] === false) return;
    if (typeof p === "string") return;
    linhasAInserir.push(criarReg26(cpfContrib, p, linhaBase26));
    deltasT9["26"] = (deltasT9["26"] || 0) + 1;
    aplicadas.push(`pagamento novo ${p.resumo || p.nome?.slice(0, 30) || ""}`);
  });

  // 88 — rendimentos exclusivos NOVOS
  const linhaBase88 = buscarLinhaBase(linhasOriginais, "88");
  (patch.rendimentos_exclusivos_novos_aviso || []).forEach((_e, i) => {
    const e = aplicaOv(_e, `excl_novo_${i}`);
    if (aprovacoes[`excl_novo_${i}`] === false) return;
    if (typeof e === "string") return;
    linhasAInserir.push(criarReg88(cpfContrib, e, linhaBase88));
    deltasT9["88"] = (deltasT9["88"] || 0) + 1;
    aplicadas.push(`exclusivo novo ${e.resumo || e.nome_fonte?.slice(0, 30) || ""}`);
  });

  // ===== Carnê-Leão =====
  // (1) Inserir lançamentos individuais (reg 49) — um por mês × pagador × valor
  // (2) Atualizar/criar os 12 reg 22 consolidados com a soma mensal
  //
  // IMPORTANTE: se o template já tem reg 49 preenchidos (cliente que lançou
  // Carnê-Leão manualmente em outra sessão), eles seriam DUPLICADOS pelos
  // novos. Pra evitar isso, removemos todos os reg 49 pré-existentes ANTES
  // de inserir os novos. Garante consistência reg 22 (soma) ↔ reg 49 (parcelas)
  // — sem isso, o PGD descarta a ficha por validação de soma.
  const haPatchPF = (patch.rendimentos_pf_carne_leao || []).some((_, i) => aprovacoes[`pf_${i}`] !== false);
  if (haPatchPF) {
    for (let i = 0; i < novasLinhas.length; i++) {
      if (novasLinhas[i] && novasLinhas[i].startsWith("49")) {
        novasLinhas[i] = null; // marca pra ser filtrado no final
        deltasT9["49"] = (deltasT9["49"] || 0) - 1;
      }
    }
  }

  const somaMensalPF = {}; // { "01": 0, "02": 0, ..., "12": 0 }
  for (let m = 1; m <= 12; m++) somaMensalPF[String(m).padStart(2, "0")] = 0;

  (patch.rendimentos_pf_carne_leao || []).forEach((pf, i) => {
    if (aprovacoes[`pf_${i}`] === false) return;
    const cpfPag = String(pf.cpf || "").replace(/\D/g, "").padStart(11, "0").slice(0, 11);
    if (cpfPag === "00000000000") return; // sem CPF válido, não grava
    const vm = pf.valores_mensais || {};
    for (let m = 1; m <= 12; m++) {
      const valor = Number(vm[String(m)] || vm[String(m).padStart(2, "0")] || 0);
      if (valor <= 0) continue;
      const mes = String(m).padStart(2, "0");
      linhasAInserir.push(criarReg49(cpfContrib, mes, cpfPag, valor));
      deltasT9["49"] = (deltasT9["49"] || 0) + 1;
      somaMensalPF[mes] += valor;
    }
    aplicadas.push(`PF Carnê-Leão ${cpfPag} (R$ ${(pf.valor_total_ano || 0).toFixed(2)})`);
  });

  // Atualizar as 12 linhas reg 22 (se existem no template) com os totais mensais
  // Se algum mês tem valor > 0 mas o template não tem reg 22, cria as 12 do zero
  const regs22NoTemplate = templateInfo.linhas.map((l, i) => l && l.startsWith("22") ? i : -1).filter(i => i >= 0);
  const temSomaMensalPositiva = Object.values(somaMensalPF).some(v => v > 0);

  if (temSomaMensalPositiva) {
    if (regs22NoTemplate.length === 12) {
      // Template já tem os 12 meses pré-alocados: ATUALIZAR
      for (const idx of regs22NoTemplate) {
        const linhaAtual = novasLinhas[idx];
        const mes = linhaAtual.substring(25, 27);
        const soma = somaMensalPF[mes] || 0;
        if (soma > 0) {
          novasLinhas[idx] = atualizarReg22(linhaAtual, soma);
        }
      }
      aplicadas.push(`Carnê-Leão consolidado (${Object.values(somaMensalPF).filter(v => v > 0).length} meses)`);
    } else if (regs22NoTemplate.length === 0) {
      // Cliente NÃO tem reg 22 ainda: CRIAR as 12 linhas mensais
      for (let m = 1; m <= 12; m++) {
        const mes = String(m).padStart(2, "0");
        const soma = somaMensalPF[mes] || 0;
        let linha22 = linhaReg22Vazia(cpfContrib, mes);
        if (soma > 0) linha22 = atualizarReg22(linha22, soma);
        else linha22 = recalcLinhaCrc(linha22);
        linhasAInserir.push(linha22);
        deltasT9["22"] = (deltasT9["22"] || 0) + 1;
      }
      aplicadas.push(`Carnê-Leão (12 meses criados do zero)`);
    }
    // Caso intermediário (template tem N != 12 reg 22) é raro/quebrado — só logamos
  }

  // Inserir as novas linhas ANTES do T9 e atualizar o footer
  if (linhasAInserir.length > 0 && idxT9 >= 0) {
    novasLinhas.splice(idxT9, 0, ...linhasAInserir);
    // idxT9 mudou — agora T9 está em idxT9 + linhasAInserir.length
    const novoIdxT9 = idxT9 + linhasAInserir.length;
    novasLinhas[novoIdxT9] = atualizarT9(novasLinhas[novoIdxT9], deltasT9);
  } else if (Object.values(deltasT9).some(d => d !== 0) && idxT9 >= 0) {
    // Pode haver só remoções (sem inserções) — ainda precisa atualizar T9
    novasLinhas[idxT9] = atualizarT9(novasLinhas[idxT9], deltasT9);
  }

  // Filtrar linhas marcadas como null (reg 49 removidos pelo limpa-Carnê-Leão)
  const linhasFinais = novasLinhas.filter(l => l !== null);

  return { conteudo: linhasFinais.join("\r\n"), aplicadas };
}

// ============================================================
// RELATÓRIO HTML
// ============================================================

function gerarRelatorioHtml(templateInfo, patch, reciboInfo) {
  const anoCalAtual = templateInfo.anoCalendario || "atual";
  const anoCalAnteriorRef = templateInfo.anoCalendario ? String(parseInt(templateInfo.anoCalendario, 10) - 1) : "anterior";
  const c = patch?.contribuinte;
  const e = patch?.endereco;
  const linhaSeMudou = (label, anterior, novo) => {
    if (novo == null || novo === "") return "";
    if (semAcento(String(anterior || "")).toUpperCase() === semAcento(String(novo)).toUpperCase()) return "";
    return `<tr><td class="lbl">${label}</td><td class="ant">${anterior || "—"}</td><td class="arr">→</td><td class="novo">${novo}</td></tr>`;
  };

  const contribRows = c || e
    ? [
        linhaSeMudou("Nome", templateInfo.contribuinte?.nome, c?.nome),
        linhaSeMudou("E-mail", templateInfo.contribuinte?.email, c?.email),
        linhaSeMudou("Telefone", templateInfo.contribuinte?.telefone, c?.telefone),
        linhaSeMudou("Logradouro", templateInfo.endereco?.logradouro, e?.logradouro),
        linhaSeMudou("Número", templateInfo.endereco?.numero, e?.numero),
        linhaSeMudou("Bairro", templateInfo.endereco?.bairro, e?.bairro),
        linhaSeMudou("Município", templateInfo.endereco?.municipio, e?.municipio),
        linhaSeMudou("CEP", templateInfo.endereco?.cep, e?.cep),
      ].filter(Boolean).join("")
    : "";

  const fontesRows = (patch?.fontes_pagadoras || []).map((f) => {
    const tpl = templateInfo.fontes.find((x) => x.cnpj === String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0"));
    return `<tr>
      <td class="mono">${fmtCNPJ(f.cnpj)}</td>
      <td>${tpl?.nome || f.nome || ""}</td>
      <td class="mono right">R$ ${fmtBRL(tpl?.rendimentos_tributaveis)}</td>
      <td class="mono right novo">R$ ${fmtBRL(f.rendimentos_tributaveis)}</td>
      <td class="mono right">R$ ${fmtBRL(tpl?.ir_retido)}</td>
      <td class="mono right novo">R$ ${fmtBRL(f.ir_retido)}</td>
    </tr>`;
  }).join("");

  const bensRows = (patch?.bens_atualizados || []).map((b) => {
    const tpl = templateInfo.bens[b.idx - 1];
    if (!tpl) return "";
    return `<tr>
      <td>B${b.idx} [${tpl.grupo}]</td>
      <td>${(tpl.discriminacao || "").slice(0, 80)}</td>
      <td class="mono right">R$ ${fmtBRL(tpl.valor_atual)}</td>
      <td class="mono right novo">R$ ${fmtBRL(b.valor_atual)}</td>
    </tr>`;
  }).join("");

  const dividasRows = (patch?.dividas_atualizadas || []).map((d) => {
    const tpl = templateInfo.dividas[d.idx - 1];
    if (!tpl) return "";
    return `<tr>
      <td>V${d.idx}</td>
      <td>${(tpl.discriminacao || "").slice(0, 80)}</td>
      <td class="mono right">R$ ${fmtBRL(tpl.valor_atual)}</td>
      <td class="mono right novo">R$ ${fmtBRL(d.valor_atual)}</td>
    </tr>`;
  }).join("");

  const avisos = [
    ...(patch?.fontes_novas || []).map((f) => `Fonte pagadora nova (não no template): ${fmtCNPJ(f.cnpj)} "${f.nome}" — R$ ${fmtBRL(f.rendimentos_tributaveis)}`),
    ...(patch?.bens_novos_aviso || []).map((s) => `Bem novo: ${s}`),
    ...(patch?.dividas_novas_aviso || []).map((s) => `Dívida nova: ${s}`),
    ...(patch?.dependentes_novos_aviso || []).map((s) => `Dependente novo: ${s}`),
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Diff IRPF — ${templateInfo.contribuinte?.nome || ""}</title>
<style>
@import url('${FONT_LINK}');
*{box-sizing:border-box}
body{font-family:'IBM Plex Sans',sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#1a1612;background:#faf8f3;font-size:13px;line-height:1.5}
h1{font-family:'Fraunces',serif;font-weight:500;font-size:28px;margin:0 0 4px;letter-spacing:-0.5px}
h2{font-family:'Fraunces',serif;font-weight:500;font-size:17px;margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid #d4cfc1}
.sub{color:#6b6256;font-size:12px;margin-bottom:24px;letter-spacing:0.5px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin:8px 0}
td,th{padding:6px 10px;text-align:left;border-bottom:1px solid #ebe6d8;vertical-align:top;font-size:12px}
th{font-weight:600;background:#f0ebda;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.mono{font-family:'IBM Plex Mono',monospace;font-size:11px}
.right{text-align:right}
.lbl{color:#6b6256;width:25%}
.ant{color:#8a7f6e;text-decoration:line-through;width:30%}
.arr{color:#6b6256;width:5%}
.novo{color:#2d5a3d;font-weight:600}
.aviso{padding:10px 14px;background:#fdf4e0;border-left:3px solid #c89b2a;margin:6px 0;font-size:12px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #d4cfc1;color:#8a7f6e;font-size:11px}
</style></head><body>
<h1>Diff de Atualização — IRPF</h1>
<div class="sub">${templateInfo.contribuinte?.nome || "—"} · CPF ${fmtCPF(templateInfo.contribuinte?.cpf)} · gerado em ${new Date().toLocaleString("pt-BR")}</div>

${contribRows ? `<h2>Contribuinte / Endereço</h2><table><thead><tr><th>Campo</th><th>Anterior</th><th></th><th>Novo</th></tr></thead><tbody>${contribRows}</tbody></table>` : ""}

${fontesRows ? `<h2>Fontes pagadoras atualizadas</h2><table><thead><tr><th>CNPJ</th><th>Nome</th><th class="right">Rend. ant.</th><th class="right">Rend. novo</th><th class="right">IR ant.</th><th class="right">IR novo</th></tr></thead><tbody>${fontesRows}</tbody></table>` : ""}

${bensRows ? `<h2>Bens com saldo atualizado</h2><table><thead><tr><th>Item</th><th>Discriminação</th><th class="right">Valor 31/12/${anoCalAtual} (template)</th><th class="right">Valor 31/12/${anoCalAtual} (atualizado)</th></tr></thead><tbody>${bensRows}</tbody></table>` : ""}

${dividasRows ? `<h2>Dívidas com saldo atualizado</h2><table><thead><tr><th>Item</th><th>Discriminação</th><th class="right">Saldo 31/12/${anoCalAtual} (template)</th><th class="right">Saldo 31/12/${anoCalAtual} (atualizado)</th></tr></thead><tbody>${dividasRows}</tbody></table>` : ""}

${avisos.length ? `<h2>Itens novos (adicionar manualmente no PGD)</h2>${avisos.map((a) => `<div class="aviso">${a}</div>`).join("")}` : ""}

${reciboInfo?.recibo ? `<h2>Recibo da declaração anterior</h2><p class="mono">Nº ${reciboInfo.recibo} · ${reciboInfo.data} ${reciboInfo.hora}</p>` : ""}

${patch?.observacoes ? `<h2>Observações</h2><p>${patch.observacoes}</p>` : ""}

<div class="footer">Documento de trabalho. Reveja no PGD antes de transmitir.</div>
</body></html>`;
}

// ============================================================
// PDF-FORMULÁRIO COMPLEMENTAR (jsPDF via CDN)
// ============================================================

function carregarJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
    const existente = document.querySelector('script[data-jspdf]');
    if (existente) {
      existente.addEventListener("load", () => resolve(window.jspdf?.jsPDF));
      existente.addEventListener("error", () => reject(new Error("Falha ao carregar jsPDF")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.dataset.jspdf = "1";
    s.async = true;
    s.onload = () => resolve(window.jspdf?.jsPDF);
    s.onerror = () => reject(new Error("Falha ao carregar jsPDF do CDN"));
    document.head.appendChild(s);
  });
}

async function gerarFormularioPdf(templateInfo) {
  const jsPDF = await carregarJsPDF();
  if (!jsPDF) throw new Error("jsPDF indisponível");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const anoCalAtual = templateInfo.anoCalendario || "atual";
  const anoCalAnteriorRef = templateInfo.anoCalendario ? String(parseInt(templateInfo.anoCalendario, 10) - 1) : "anterior";

  // Paleta — mesmas cores semânticas do estúdio web
  const RGB = {
    tinta:    [26, 22, 18],      // #1a1612 - texto principal
    sutil:    [107, 98, 86],     // #6b6256 - texto descritivo
    cinza:    [155, 146, 133],   // #9b9285 - meta info
    verde:    [45, 90, 61],      // #2d5a3d - novos itens (inclusão)
    azul:     [58, 88, 118],     // #3a5876 - atualizações
    laranja:  [204, 107, 42],    // #cc6b2a - atenção
    bgAzul:   [238, 242, 246],   // #eef2f6
    bgVerde:  [238, 244, 239],   // #eef4ef
    bgCinza:  [248, 246, 240],   // suave bg pra cards neutros
    linha:    [200, 195, 184],   // linhas pra preencher
  };
  const setText = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  const MARG_L = 18, MARG_R = 18, LARG = 210 - MARG_L - MARG_R, BOTTOM = 280;
  let y = 22;
  let pagina = 1;

  const cabecalho = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(RGB.cinza);
    doc.text(`Formulário complementar · ${templateInfo.contribuinte?.nome || ""} · CPF ${fmtCPF(templateInfo.contribuinte?.cpf)}`, MARG_L, 10);
    doc.text(`pág. ${pagina}`, 210 - MARG_R - doc.getTextWidth(`pág. ${pagina}`), 10);
    setDraw(RGB.linha);
    doc.setLineWidth(0.2);
    doc.line(MARG_L, 12.5, 210 - MARG_R, 12.5);
    setText(RGB.tinta);
  };

  const novaPagina = () => {
    doc.addPage();
    pagina++;
    y = 22;
    cabecalho();
  };

  const ensure = (h) => { if (y + h > BOTTOM) novaPagina(); };

  // Título de seção: barra colorida lateral + título grande
  const secao = (numero, titulo, subtitulo, cor) => {
    ensure(20);
    y += 4;
    setFill(cor);
    doc.rect(MARG_L, y - 4, 1.5, 12, "F"); // barra lateral vertical
    setText(cor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${numero} · ${titulo}`, MARG_L + 4, y + 1);
    if (subtitulo) {
      setText(RGB.sutil);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(subtitulo, MARG_L + 4, y + 6);
    }
    y += 12;
    setText(RGB.tinta);
  };

  // Linha pra preencher com label de "valor anterior" antes
  const linhaCampo = (labelAnt, xLinha, labelLinha) => {
    doc.setFontSize(8);
    setText(RGB.sutil);
    doc.text(labelAnt, MARG_L + 8, y);
    setDraw(RGB.linha);
    doc.setLineWidth(0.25);
    doc.line(xLinha, y + 0.5, 210 - MARG_R, y + 0.5);
    setText(RGB.cinza);
    doc.setFontSize(7);
    doc.text(labelLinha, xLinha - doc.getTextWidth(labelLinha) - 1.5, y);
    setText(RGB.tinta);
  };

  // === CABEÇALHO PRINCIPAL ===
  setText(RGB.cinza);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("ESTÚDIO WEB IRPF · AJUDA NO PREENCHIMENTO", MARG_L, y);
  y += 10;
  setText(RGB.tinta);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Formulário complementar", MARG_L, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(templateInfo.contribuinte?.nome || "—", MARG_L, y);
  y += 5.5;
  doc.setFontSize(9);
  setText(RGB.sutil);
  doc.text(`CPF ${fmtCPF(templateInfo.contribuinte?.cpf)}  ·  ano-calendário ${anoCalAtual}  ·  gerado em ${new Date().toLocaleDateString("pt-BR")}`, MARG_L, y);
  y += 12;
  setText(RGB.tinta);

  // === CARD DE INSTRUÇÕES ===
  const instr = `Os valores entre [colchetes] são os que estão no template (a declaração que está sendo trabalhada, ano-calendário ${anoCalAtual}). Se algum estiver incorreto ou desatualizado, preencha o valor correto na linha em branco ao lado. Se estiver certo, escreva "igual" ou repita o número. Use a seção 5 pra incluir itens novos. Devolva escaneado/fotografado em PDF.`;
  doc.setFontSize(8.5);
  const linsInstr = doc.splitTextToSize(instr, LARG - 10);
  const alturaInstr = linsInstr.length * 4 + 8;
  setFill(RGB.bgCinza);
  doc.rect(MARG_L, y, LARG, alturaInstr, "F");
  setFill(RGB.cinza);
  doc.rect(MARG_L, y, 1.5, alturaInstr, "F");
  setText(RGB.sutil);
  doc.text(linsInstr, MARG_L + 6, y + 5);
  y += alturaInstr + 10;
  setText(RGB.tinta);

  // === 1. FONTES PAGADORAS (azul = atualização) ===
  if (templateInfo.fontes.length > 0) {
    secao("1", "Fontes pagadoras", `valores recebidos em ${anoCalAtual}`, RGB.azul);
    for (let i = 0; i < templateInfo.fontes.length; i++) {
      const f = templateInfo.fontes[i];
      ensure(32);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(RGB.tinta);
      doc.text(`F${i + 1}`, MARG_L, y);
      doc.text(f.nome, MARG_L + 8, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(RGB.sutil);
      doc.text(`CNPJ ${fmtCNPJ(f.cnpj)}`, MARG_L + 8, y);
      y += 6;
      setText(RGB.tinta);
      const campos = [
        ["Rendimentos", f.rendimentos_tributaveis],
        ["13º salário", f.decimo_terceiro],
        ["INSS retido", f.inss],
        ["IR retido", f.ir_retido],
      ];
      for (const [lbl, val] of campos) {
        linhaCampo(`${lbl} ${anoCalAtual}: [R$ ${fmtBRL(val)}]`, MARG_L + 110, "R$");
        y += 6;
      }
      // separador discreto entre fontes
      if (i < templateInfo.fontes.length - 1) {
        setDraw(RGB.linha);
        doc.setLineWidth(0.15);
        doc.line(MARG_L + 8, y + 1, 210 - MARG_R - 8, y + 1);
        y += 6;
      }
    }
    y += 4;
  }

  // === 2. BENS COM SALDO ATUALIZÁVEL (azul = atualização) ===
  const bensAtualizaveis = templateInfo.bens
    .map((b, i) => ({ b, i: i + 1 }))
    .filter(({ b }) => bemAtualizavel(b));
  if (bensAtualizaveis.length > 0) {
    secao("2", "Bens (saldos em 31/12)", `imóveis, veículos e participações societárias não aparecem aqui — não mudam de valor no IR`, RGB.azul);
    for (const { b, i } of bensAtualizaveis) {
      ensure(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(RGB.tinta);
      const disc = b.discriminacao.length > 90 ? b.discriminacao.slice(0, 90) + "..." : b.discriminacao;
      const ls = doc.splitTextToSize(`B${i}  ${disc}`, LARG - 5);
      doc.text(ls, MARG_L, y);
      y += ls.length * 4;
      doc.setFont("helvetica", "normal");
      if (b.grupo_receita) {
        doc.setFontSize(7.5);
        setText(RGB.cinza);
        doc.text(`Grupo ${b.grupo_receita} · ${b.nome_grupo_receita || ""}`, MARG_L + 8, y);
        y += 4.5;
        setText(RGB.tinta);
      }
      linhaCampo(`Valor 31/12/${anoCalAtual}: [R$ ${fmtBRL(b.valor_atual)}]`, MARG_L + 120, "R$");
      y += 8;
    }
    y += 2;
  }

  // === 3. DÍVIDAS (azul = atualização) ===
  if (templateInfo.dividas.length > 0) {
    secao("3", "Dívidas e ônus reais", `saldos em 31/12/${anoCalAtual}`, RGB.azul);
    for (let i = 0; i < templateInfo.dividas.length; i++) {
      const d = templateInfo.dividas[i];
      ensure(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(RGB.tinta);
      const disc = d.discriminacao.length > 90 ? d.discriminacao.slice(0, 90) + "..." : d.discriminacao;
      const ls = doc.splitTextToSize(`V${i + 1}  ${disc}`, LARG - 5);
      doc.text(ls, MARG_L, y);
      y += ls.length * 4 + 1;
      doc.setFont("helvetica", "normal");
      linhaCampo(`Saldo 31/12/${anoCalAtual}: [R$ ${fmtBRL(d.valor_atual)}]`, MARG_L + 120, "R$");
      y += 8;
    }
    y += 2;
  }

  // === 4. RENDIMENTOS ISENTOS (azul = atualização) ===
  if (templateInfo.rendIsentos.length > 0) {
    secao("4", "Rendimentos isentos", `valores recebidos em ${anoCalAtual} por fonte`, RGB.azul);
    for (let i = 0; i < templateInfo.rendIsentos.length; i++) {
      const r = templateInfo.rendIsentos[i];
      ensure(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(RGB.tinta);
      doc.text(`I${i + 1}`, MARG_L, y);
      doc.text(r.nome_fonte, MARG_L + 8, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setText(RGB.sutil);
      doc.text(`CNPJ ${fmtCNPJ(r.cnpj_fonte)}  ·  ${r.descricao.slice(0, 65)}`, MARG_L + 8, y);
      y += 6;
      setText(RGB.tinta);
      linhaCampo(`Valor ${anoCalAtual}: [R$ ${fmtBRL(r.valor)}]`, MARG_L + 110, "R$");
      y += 8;
    }
    y += 2;
  }

  // === 5. NOVOS ITENS (verde = inclusão) ===
  secao("5", "Novos itens", "fontes pagadoras, bens, dívidas ou dependentes que não constam acima", RGB.verde);
  doc.setFontSize(8);
  setText(RGB.sutil);
  const aviso = `Use as linhas abaixo pra informar itens NOVOS que não apareceram em anos anteriores. Identifique CNPJ ou descrição quando aplicável.`;
  const lsA = doc.splitTextToSize(aviso, LARG);
  doc.text(lsA, MARG_L, y);
  y += lsA.length * 4 + 6;
  setText(RGB.tinta);

  const tiposNovos = [
    ["Nova fonte pagadora (CNPJ + nome + valores)", 3],
    ["Bem novo (saldo, conta, aplicação, CDB, etc.)", 3],
    ["Dívida nova (credor + saldo)", 2],
    ["Dependente novo (nome, CPF, nascimento)", 2],
  ];
  for (const [titulo, n] of tiposNovos) {
    ensure(8 + n * 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setText(RGB.tinta);
    doc.text(titulo, MARG_L, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (let k = 0; k < n; k++) {
      setDraw(RGB.linha);
      doc.setLineWidth(0.25);
      doc.line(MARG_L + 8, y + 0.5, 210 - MARG_R, y + 0.5);
      y += 7;
    }
    y += 3;
  }

  // === RODAPÉ ===
  ensure(22);
  y += 6;
  setDraw(RGB.linha);
  doc.setLineWidth(0.3);
  doc.line(MARG_L, y, 210 - MARG_R, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(RGB.sutil);
  doc.text("Data: ___/___/______", MARG_L, y);
  doc.text("Assinatura: __________________________________", MARG_L + 75, y);
  setText(RGB.tinta);

  // Aplicar cabeçalho em todas as páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    pagina = p;
    cabecalho();
  }

  return doc;
}

// ============================================================
// PDF — formato pré-preenchida da Receita Federal
// Renderiza no padrão visual do PDF emitido pelo PGD via "Imprimir declaração"
// ============================================================

async function gerarPdfDeclaracaoPrePreenchida(dados, opcoes = {}) {
  const jsPDF = await carregarJsPDF();
  if (!jsPDF) throw new Error("jsPDF indisponível");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const PAGE_W = 210, PAGE_H = 297;
  const MARG_L = 10, MARG_R = 10, MARG_T = 8, MARG_B = 14;
  const LARG = PAGE_W - MARG_L - MARG_R;
  const HEADER_H = 16;
  const Y0 = MARG_T + HEADER_H + 4;

  const anoDecl = opcoes.anoDecl || dados.anoDeclaracao || "2026";
  const anoCal = opcoes.anoCal || dados.anoCalendario || "2025";
  const anoCalAnt = String(parseInt(anoCal, 10) - 1);

  const nomeContrib = (dados.contribuinte?.nome || "").toUpperCase();
  const cpfContrib = fmtCPF(dados.contribuinte?.cpf);

  let y = Y0;

  const desenharHeader = () => {
    const yTop = MARG_T;
    const yBot = MARG_T + HEADER_H;
    const xMidHdr = MARG_L + LARG * 0.52;
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(MARG_L, yTop, PAGE_W - MARG_R, yTop);
    doc.line(MARG_L, yBot, PAGE_W - MARG_R, yBot);
    doc.line(xMidHdr, yTop, xMidHdr, yBot);

    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text("NOME:", MARG_L + 1, yTop + 4);
    doc.text("CPF:", MARG_L + 1, yTop + 9);
    doc.text("DECLARAÇÃO DE AJUSTE ANUAL", MARG_L + 1, yTop + 14);

    doc.setFont("helvetica","normal");
    doc.text(nomeContrib, MARG_L + 18, yTop + 4);
    doc.text(cpfContrib, MARG_L + 18, yTop + 9);

    const xRight = xMidHdr + 2;
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text("IMPOSTO SOBRE A RENDA - PESSOA FÍSICA", xRight, yTop + 5.5);
    doc.text(`EXERCÍCIO ${anoDecl}`, xRight, yTop + 12);
    doc.text(`ANO-CALENDÁRIO ${anoCal}`, xRight + 50, yTop + 12);
  };

  const novaPagina = () => { doc.addPage(); y = Y0; desenharHeader(); };
  const ensure = (h) => { if (y + h > PAGE_H - MARG_B) novaPagina(); };

  const tituloSecao = (titulo, valoresEmReais = false) => {
    ensure(12);
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    const maxW = valoresEmReais ? LARG - 35 : LARG;
    const lns = doc.splitTextToSize(titulo, maxW);
    for (let i = 0; i < lns.length; i++) {
      doc.text(lns[i], MARG_L, y + i * 4);
    }
    if (valoresEmReais) {
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      const txt = "(Valores em Reais)";
      doc.text(txt, PAGE_W - MARG_R - doc.getTextWidth(txt), y);
    }
    y += 1.5 + (lns.length - 1) * 4;
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(MARG_L, y, PAGE_W - MARG_R, y);
    y += 4;
  };

  const semInfo = () => {
    ensure(8);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text("Sem Informações", MARG_L, y);
    y += 6;
  };

  const kv = (label, valor, xLabel, xValor) => {
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.setTextColor(60);
    doc.text(label, xLabel, y);
    doc.setTextColor(0);
    doc.text(String(valor || ""), xValor, y);
  };

  // kv com largura máxima — quebra valor em linhas internas e retorna altura extra (mm)
  const kvW = (label, valor, xLabel, xValor, maxW) => {
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.setTextColor(60);
    doc.text(label, xLabel, y);
    doc.setTextColor(0);
    const lns = doc.splitTextToSize(String(valor || ""), maxW);
    doc.text(lns, xValor, y);
    return (lns.length - 1) * 3.5;
  };

  desenharHeader();

  // IDENTIFICAÇÃO
  tituloSecao("IDENTIFICAÇÃO DO CONTRIBUINTE");
  const c = dados.contribuinte || {};
  const e = dados.endereco || {};
  const xMid = MARG_L + LARG / 2;

  kv("Nome:", c.nome || "", MARG_L, MARG_L + 30);
  kv("CPF:", fmtCPF(c.cpf), xMid, xMid + 20); y += 5;
  kv("Data de Nascimento:", fmtData(c.data_nascimento), MARG_L, MARG_L + 30); y += 5;
  kv("Raça/Cor:", c.raca_cor || "Não informada", MARG_L, MARG_L + 30); y += 5;
  kv("Possui cônjuge ou companheiro(a)?", c.possui_conjuge || (c.cpf_conjuge ? "Sim" : "Não"), MARG_L, MARG_L + 60);
  if (c.cpf_conjuge) kv("CPF do cônjuge ou companheiro(a):", fmtCPF(c.cpf_conjuge), xMid - 8, xMid + 50);
  y += 5;
  kv(`Era residente no exterior e passou a ser residente no Brasil em ${anoCal}?`, c.residente_exterior || "Não", MARG_L, MARG_L + 105); y += 5;
  kv("Houve alteração de dados cadastrais?", c.alteracao_dados || "Não", MARG_L, MARG_L + 60); y += 5;
  kv("Há declarante ou dependente com doença grave ou deficiência física ou mental?", c.doenca_grave || "Não", MARG_L, MARG_L + 110); y += 7;

  // Endereço: usa kvW pra logradouro/complemento (que podem ser longos) limitando à coluna esquerda
  const wEsq = xMid - (MARG_L + 30) - 4;
  let extra = kvW("Endereço:", e.logradouro || "", MARG_L, MARG_L + 30, wEsq);
  kv("Número:", e.numero || "", xMid, xMid + 22); y += 5 + extra;
  extra = kvW("Complemento:", e.complemento || "", MARG_L, MARG_L + 30, wEsq);
  kv("Bairro/Distrito:", e.bairro || "", xMid, xMid + 22); y += 5 + extra;
  kv("Município:", e.municipio || "", MARG_L, MARG_L + 30);
  kv("UF:", e.uf || "", xMid, xMid + 22); y += 5;
  kv("CEP:", fmtCEP(e.cep), MARG_L, MARG_L + 30);
  kv("DDD/Telefone:", c.telefone || "", xMid, xMid + 22); y += 5;
  extra = kvW("E-mail:", c.email || "", MARG_L, MARG_L + 30, wEsq);
  kv("DDD/Celular:", c.celular || "", xMid, xMid + 22); y += 7 + extra;

  // Ocupação: campos podem ser longos (ex: "22 - SERVIDOR PÚBLICO DE AUTARQUIA OU FUNDAÇÃO FEDERAL")
  const wFull = LARG - 35 - 4;
  y += kvW("Natureza da Ocupação:", c.natureza_ocupacao || "", MARG_L, MARG_L + 35, wFull); y += 5;
  y += kvW("Ocupação Principal:", c.ocupacao_principal || "", MARG_L, MARG_L + 35, wFull); y += 5;
  if (c.registro_profissional) { kv("Registro profissional:", c.registro_profissional, MARG_L, MARG_L + 35); y += 5; }
  kv("Tipo de declaração:", c.tipo_declaracao || "Declaração de Ajuste Anual Original", MARG_L, MARG_L + 35); y += 5;
  if (c.recibo_anterior) { kv(`Nº do recibo da última declaração entregue do exercício de ${parseInt(anoDecl,10)-1}:`, c.recibo_anterior, MARG_L, MARG_L + 95); y += 5; }
  y += 3;

  // DEPENDENTES
  tituloSecao("DEPENDENTES");
  const deps = dados.dependentes || [];
  if (deps.length === 0) { semInfo(); } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("CÓDIGO", MARG_L, y);
    doc.text("NOME", MARG_L + 18, y);
    doc.text("DATA DE NASCIMENTO", MARG_L + 115, y);
    doc.text("CPF", MARG_L + 165, y);
    y += 2;
    doc.setDrawColor(200); doc.setLineWidth(0.2);
    doc.line(MARG_L, y, PAGE_W - MARG_R, y); y += 4;
    for (const dep of deps) {
      ensure(14);
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(String(dep.codigo || "21"), MARG_L, y);
      doc.text(String(dep.nome || "").toUpperCase(), MARG_L + 18, y);
      doc.text(fmtData(dep.data_nascimento), MARG_L + 115, y);
      doc.text(fmtCPF(dep.cpf), MARG_L + 165, y);
      y += 4;
      doc.setFontSize(7.5); doc.setTextColor(70);
      doc.text(`Email : ${dep.email || ""}`, MARG_L, y);
      doc.text(`Celular : ${dep.celular || ""}`, MARG_L + 80, y);
      doc.text(`Raça/Cor: ${dep.raca_cor || "Não informada"}`, MARG_L + 145, y);
      doc.setTextColor(0); y += 4;
      doc.setFontSize(8);
      doc.text(`Dependente mora com o titular da declaração? ${dep.mora_com_titular || "Sim"}`, MARG_L, y);
      y += 5;
    }
  }

  tituloSecao("ALIMENTANDOS");
  if ((dados.alimentandos || []).length === 0) semInfo();

  novaPagina();

  // RENDIMENTOS PJ TITULAR
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA JURÍDICA PELO TITULAR", true);
  const fontes = dados.fontes_pagadoras || [];
  if (fontes.length === 0) { semInfo(); } else {
    const colX = { nome: MARG_L, rend: MARG_L + 90, inss: MARG_L + 120, ir: MARG_L + 148, dec: MARG_L + 168, irDec: MARG_L + 190 };
    doc.setFont("helvetica","bold"); doc.setFontSize(7);
    doc.text("NOME DA FONTE PAGADORA", colX.nome, y);
    doc.text("REND. RECEBIDOS", colX.rend, y, { align: "right" });
    doc.text("DE PES. JURÍDICA", colX.rend, y + 3, { align: "right" });
    doc.text("CONTR. PREVID.", colX.inss, y, { align: "right" });
    doc.text("OFICIAL", colX.inss, y + 3, { align: "right" });
    doc.text("IMPOSTO RETIDO", colX.ir, y, { align: "right" });
    doc.text("NA FONTE", colX.ir, y + 3, { align: "right" });
    doc.text("13º SALÁRIO", colX.dec, y + 1.5, { align: "right" });
    doc.text("IRRF SOBRE 13º", colX.irDec, y, { align: "right" });
    doc.text("SALÁRIO", colX.irDec, y + 3, { align: "right" });
    y += 8;
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(MARG_L, y - 2, PAGE_W - MARG_R, y - 2);

    let t = { rend: 0, inss: 0, ir: 0, dec: 0, irDec: 0 };
    for (const f of fontes) {
      ensure(12);
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      const ls = doc.splitTextToSize((f.nome || "").toUpperCase(), 95);
      doc.text(ls, colX.nome, y);
      doc.text(fmtBRL(f.rendimentos_tributaveis), colX.rend, y, { align: "right" });
      doc.text(fmtBRL(f.inss), colX.inss, y, { align: "right" });
      doc.text(fmtBRL(f.ir_retido), colX.ir, y, { align: "right" });
      doc.text(fmtBRL(f.decimo_terceiro || 0), colX.dec, y, { align: "right" });
      doc.text(fmtBRL(f.ir_retido_13 || 0), colX.irDec, y, { align: "right" });
      y += Math.max(4, ls.length * 3.5);
      doc.setFontSize(7.5); doc.setTextColor(70);
      doc.text(`CNPJ/CPF: ${fmtCNPJ(f.cnpj)}`, colX.nome, y);
      doc.setTextColor(0); y += 5;
      t.rend += +f.rendimentos_tributaveis || 0; t.inss += +f.inss || 0; t.ir += +f.ir_retido || 0;
      t.dec += +f.decimo_terceiro || 0; t.irDec += +f.ir_retido_13 || 0;
    }
    ensure(6);
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(MARG_L, y - 2.5, PAGE_W - MARG_R, y - 2.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", colX.nome, y);
    doc.text(fmtBRL(t.rend), colX.rend, y, { align: "right" });
    doc.text(fmtBRL(t.inss), colX.inss, y, { align: "right" });
    doc.text(fmtBRL(t.ir), colX.ir, y, { align: "right" });
    doc.text(fmtBRL(t.dec), colX.dec, y, { align: "right" });
    doc.text(fmtBRL(t.irDec), colX.irDec, y, { align: "right" });
    y += 6;
  }

  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA JURÍDICA PELOS DEPENDENTES"); semInfo();
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA FÍSICA E DO EXTERIOR PELO TITULAR"); semInfo();
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA FÍSICA E DO EXTERIOR PELOS DEPENDENTES"); semInfo();

  // RENDIMENTOS ISENTOS
  tituloSecao("RENDIMENTOS ISENTOS E NÃO TRIBUTÁVEIS", true);
  const isentos = dados.rendimentos_isentos || [];
  if (isentos.length === 0) { semInfo(); } else {
    const grupos = {};
    for (const r of isentos) {
      const k = r.codigo || "99";
      if (!grupos[k]) grupos[k] = { categoria: r.categoria_descricao || r.categoria || "", itens: [], total: 0 };
      grupos[k].itens.push(r);
      grupos[k].total += +r.valor || 0;
    }
    let totGeral = 0;
    for (const [cod, g] of Object.entries(grupos)) {
      ensure(10);
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.text(`${cod}. ${g.categoria}`, MARG_L, y);
      doc.text(fmtBRL(g.total), PAGE_W - MARG_R, y, { align: "right" });
      y += 4;
      if (g.itens.length > 0 && (g.itens[0].cnpj_fonte || g.itens[0].nome_fonte || g.itens[0].fonte_nome)) {
        doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(70);
        doc.text("Beneficiário", MARG_L + 5, y);
        doc.text("CPF", MARG_L + 30, y);
        doc.text("CNPJ da Fonte Pagadora", MARG_L + 60, y);
        doc.text("Nome da Fonte Pagadora", MARG_L + 100, y);
        doc.text("Valor", PAGE_W - MARG_R, y, { align: "right" });
        doc.setTextColor(0); y += 3;
        doc.setDrawColor(220); doc.setLineWidth(0.15); doc.line(MARG_L + 5, y, PAGE_W - MARG_R, y); y += 3;
        for (const item of g.itens) {
          ensure(5);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
          doc.text(item.beneficiario || "Titular", MARG_L + 5, y);
          doc.text(fmtCPF(dados.contribuinte?.cpf), MARG_L + 30, y);
          doc.text(fmtCNPJ(item.cnpj_fonte), MARG_L + 60, y);
          const nomeLs = doc.splitTextToSize((item.nome_fonte || item.fonte_nome || "").toUpperCase(), 60);
          doc.text(nomeLs, MARG_L + 100, y);
          doc.text(fmtBRL(item.valor), PAGE_W - MARG_R, y, { align: "right" });
          y += Math.max(4, nomeLs.length * 3.5);
        }
      }
      totGeral += g.total; y += 2;
    }
    ensure(6);
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(MARG_L, y - 2.5, PAGE_W - MARG_R, y - 2.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", MARG_L, y);
    doc.text(fmtBRL(totGeral), PAGE_W - MARG_R, y, { align: "right" });
    y += 6;
  }

  // RENDIMENTOS TRIBUTAÇÃO EXCLUSIVA
  tituloSecao("RENDIMENTOS SUJEITOS À TRIBUTAÇÃO EXCLUSIVA / DEFINITIVA", true);
  const exclusivos = dados.rendimentos_tributacao_exclusiva || [];
  if (exclusivos.length === 0) { semInfo(); } else {
    let totExcl = 0;
    for (const it of exclusivos) totExcl += +it.valor || 0;
    ensure(10);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("06. Rendimentos de aplicações financeiras", MARG_L, y);
    doc.text(fmtBRL(totExcl), PAGE_W - MARG_R, y, { align: "right" });
    y += 4;
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(70);
    doc.text("Beneficiário", MARG_L + 5, y);
    doc.text("CPF", MARG_L + 30, y);
    doc.text("CNPJ da Fonte Pagadora", MARG_L + 60, y);
    doc.text("Nome da Fonte Pagadora", MARG_L + 110, y);
    doc.text("Valor", PAGE_W - MARG_R, y, { align: "right" });
    doc.setTextColor(0); y += 3;
    doc.setDrawColor(220); doc.setLineWidth(0.15); doc.line(MARG_L + 5, y, PAGE_W - MARG_R, y); y += 3;
    for (const item of exclusivos) {
      ensure(5);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      doc.text("Titular", MARG_L + 5, y);
      doc.text(fmtCPF(dados.contribuinte?.cpf), MARG_L + 30, y);
      doc.text(fmtCNPJ(item.cnpj_fonte), MARG_L + 60, y);
      const nomeLs = doc.splitTextToSize((item.nome_fonte || "").toUpperCase(), 60);
      doc.text(nomeLs, MARG_L + 110, y);
      doc.text(fmtBRL(item.valor), PAGE_W - MARG_R, y, { align: "right" });
      y += Math.max(4, nomeLs.length * 3.5);
    }
    y += 1;
    ensure(6);
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(MARG_L, y - 2.5, PAGE_W - MARG_R, y - 2.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", MARG_L, y);
    doc.text(fmtBRL(totExcl), PAGE_W - MARG_R, y, { align: "right" });
    y += 6;
  }

  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA JURÍDICA PELO TITULAR (IMPOSTO COM EXIGIBILIDADE SUSPENSA)"); semInfo();
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS RECEBIDOS DE PESSOA JURÍDICA PELOS DEPENDENTES (IMPOSTO COM EXIGIBILIDADE SUSPENSA)"); semInfo();
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS DE PESSOA JURÍDICA RECEBIDOS ACUMULADAMENTE PELO TITULAR"); semInfo();
  tituloSecao("RENDIMENTOS TRIBUTÁVEIS DE PESSOA JURÍDICA RECEBIDOS ACUMULADAMENTE PELOS DEPENDENTES"); semInfo();

  novaPagina();

  // IMPOSTO PAGO / RETIDO
  tituloSecao("IMPOSTO PAGO / RETIDO", true);
  const ipr = dados.imposto_pago_retido || {};
  const irRetidoTitular = ipr.ir_retido_titular ?? fontes.reduce((s,f) => s + (+f.ir_retido || 0), 0);
  const linhasIPR = [
    ["01. Imposto complementar", ipr.imposto_complementar || 0],
    ["02. Imposto pago no exterior pelo titular e pelos dependentes", ipr.imposto_exterior || 0],
    ["    Imposto devido com os rendimentos no exterior", ipr.imposto_devido_com_exterior || 0],
    ["    Imposto devido sem os rendimentos no exterior", ipr.imposto_devido_sem_exterior || 0],
    ["    Diferença a ser considerada para cálculo do imposto (limite legal)", ipr.diferenca_limite_legal || 0],
    ["03. Imposto sobre a renda na fonte (Lei 11.033/2004)", ipr.imposto_lei_11033 || 0],
    ["04. Imposto retido na fonte do titular", irRetidoTitular],
    ["05. Imposto retido na fonte dos dependentes", ipr.ir_retido_dependentes || 0],
    ["06. Carnê-Leão do titular", ipr.carne_leao_titular || 0],
    ["07. Carnê-Leão dos dependentes", ipr.carne_leao_dependentes || 0],
  ];
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  for (const [lbl, val] of linhasIPR) {
    ensure(5);
    doc.text(lbl, MARG_L, y);
    doc.text(fmtBRL(val), PAGE_W - MARG_R, y, { align: "right" });
    y += 4.5;
  }
  y += 3;

  // PAGAMENTOS EFETUADOS
  tituloSecao("PAGAMENTOS EFETUADOS", true);
  const pagamentos = dados.pagamentos_efetuados || [];
  if (pagamentos.length === 0) { semInfo(); } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("CÓD.", MARG_L, y);
    doc.text("NOME DO BENEFICIÁRIO", MARG_L + 12, y);
    doc.text("CPF/CNPJ DO", MARG_L + 90, y);
    doc.text("BENEFICIÁRIO", MARG_L + 90, y + 3);
    doc.text("VALOR PAGO", MARG_L + 145, y, { align: "right" });
    doc.text("PARC. NÃO", MARG_L + 188, y, { align: "right" });
    doc.text("DEDUTÍVEL", MARG_L + 188, y + 3, { align: "right" });
    y += 7;
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(MARG_L, y - 1, PAGE_W - MARG_R, y - 1); y += 2;

    let secaoAtual = null;
    let totalVP = 0, totalPND = 0;
    for (const p of pagamentos) {
      const sec = p.relacionado_a || "Titular";
      if (sec !== secaoAtual) {
        ensure(6);
        doc.setFont("helvetica","bold"); doc.setFontSize(8);
        doc.text(sec, MARG_L, y); y += 4.5;
        secaoAtual = sec;
      }
      ensure(8);
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(String(p.codigo || ""), MARG_L, y);
      const nomeLs = doc.splitTextToSize((p.nome_beneficiario || "").toUpperCase(), 73);
      doc.text(nomeLs, MARG_L + 12, y);
      const cpfCnpj = (p.cpf_cnpj_beneficiario || "").replace(/\D/g,"");
      doc.text(cpfCnpj.length === 14 ? fmtCNPJ(cpfCnpj) : fmtCPF(cpfCnpj), MARG_L + 90, y);
      doc.text(fmtBRL(p.valor_pago), MARG_L + 145, y, { align: "right" });
      doc.text(fmtBRL(p.parc_nao_dedutivel || 0), MARG_L + 188, y, { align: "right" });
      y += Math.max(4, nomeLs.length * 3.5);
      if (p.descricao) {
        doc.setFontSize(7.5); doc.setTextColor(70);
        doc.text(`Descrição: ${p.descricao}`, MARG_L + 12, y);
        doc.setTextColor(0);
        y += 3.5;
      }
      y += 1.5;
      totalVP += +p.valor_pago || 0;
      totalPND += +p.parc_nao_dedutivel || 0;
    }
    ensure(6);
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(MARG_L, y - 2.5, PAGE_W - MARG_R, y - 2.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", MARG_L, y);
    doc.text(fmtBRL(totalVP), MARG_L + 145, y, { align: "right" });
    doc.text(fmtBRL(totalPND), MARG_L + 188, y, { align: "right" });
    y += 6;
  }

  tituloSecao("DOAÇÕES EFETUADAS");
  if ((dados.doacoes_efetuadas || []).length === 0) semInfo();

  // BENS E DIREITOS
  tituloSecao("DECLARAÇÃO DE BENS E DIREITOS", true);
  ensure(8);
  doc.setFont("helvetica","normal"); doc.setFontSize(8);
  doc.text("Possui perdas a compensar de acordo com a Lei nº 14.754, de 2023 (art. 9º)?", MARG_L, y);
  doc.text(dados.possui_perdas_lei_14754 || "Não", MARG_L + 115, y); y += 5;
  doc.setFont("helvetica","bold"); doc.setFontSize(8);
  doc.text("GRUPO", MARG_L, y);
  doc.text("CÓDIGO", MARG_L + 14, y);
  doc.text("DISCRIMINAÇÃO", MARG_L + 30, y);
  doc.text("SITUAÇÃO EM", MARG_L + 145, y);
  y += 3;
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(80);
  doc.text(`31/12/${anoCalAnt}`, MARG_L + 145, y);
  doc.text(`31/12/${anoCal}`, MARG_L + 175, y);
  doc.setTextColor(0); y += 1;
  doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(MARG_L, y, PAGE_W - MARG_R, y); y += 4;

  const bens = dados.bens || [];
  let totBensAnt = 0, totBensAtual = 0;
  if (bens.length === 0) {
    semInfo();
  } else {
    for (const b of bens) {
      ensure(20);
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(String(b.grupo || "").padStart(2, "0"), MARG_L, y);
      doc.text(String(b.codigo || "").padStart(2, "0"), MARG_L + 14, y);
      const discLs = doc.splitTextToSize((b.discriminacao || "").toUpperCase(), 110);
      doc.text(discLs, MARG_L + 30, y);
      doc.text(fmtBRL(b.valor_anterior), MARG_L + 160, y, { align: "right" });
      doc.text(fmtBRL(b.valor_atual), MARG_L + 190, y, { align: "right" });
      const altura1 = Math.max(4, discLs.length * 3.5);
      y += altura1;
      doc.setFontSize(7.5);
      if (b.pais !== undefined || b.codigo_pais) doc.text(`${b.codigo_pais || "105"} - ${b.pais || "BRASIL"}`, MARG_L + 30, y);
      doc.text(`Bem com usufruto: ${b.usufruto || "Não"}`, MARG_L + 145, y); y += 3.5;
      if (b.cnpj) { doc.text(`CNPJ: ${fmtCNPJ(b.cnpj)}`, MARG_L + 30, y); y += 3.5; }
      if (b.banco || b.agencia || b.conta) {
        const partes = [];
        if (b.banco) partes.push(`Banco: ${b.banco}`);
        if (b.agencia) partes.push(`Agência: ${b.agencia}`);
        if (b.conta) partes.push(`Conta: ${b.conta}`);
        doc.text(partes.join("  "), MARG_L + 30, y);
        if (b.conta_pagamento != null) doc.text(`Conta Pagamento? ${b.conta_pagamento || "Não"}`, MARG_L + 145, y);
        y += 3.5;
      }
      if (b.cpf_pertencente_a !== undefined || b.bem_pertencente_a) {
        doc.text(`Bem ou direito pertencente ao: ${b.bem_pertencente_a || "Titular"}`, MARG_L + 30, y);
        doc.text(`CPF: ${fmtCPF(b.cpf_pertencente || dados.contribuinte?.cpf)}`, MARG_L + 100, y);
        y += 3.5;
      }
      y += 1.5;
      doc.setDrawColor(220); doc.setLineWidth(0.15); doc.line(MARG_L, y - 1, PAGE_W - MARG_R, y - 1); y += 1;
      totBensAnt += +b.valor_anterior || 0;
      totBensAtual += +b.valor_atual || 0;
    }
    ensure(6);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", MARG_L, y);
    doc.text(fmtBRL(totBensAnt), MARG_L + 160, y, { align: "right" });
    doc.text(fmtBRL(totBensAtual), MARG_L + 190, y, { align: "right" });
    y += 6;
  }

  // DÍVIDAS
  tituloSecao("DÍVIDAS E ÔNUS REAIS", true);
  const dividas = dados.dividas || [];
  if (dividas.length === 0) { semInfo(); } else {
    doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
    doc.text("CÓDIGO", MARG_L, y);
    doc.text("DISCRIMINAÇÃO", MARG_L + 18, y);
    doc.text("SITUAÇÃO EM", MARG_L + 138, y, { align: "right" });
    doc.text("SITUAÇÃO EM", MARG_L + 168, y, { align: "right" });
    doc.text("VALOR PAGO", MARG_L + 190, y, { align: "right" });
    y += 3;
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(80);
    doc.text(`31/12/${anoCalAnt}`, MARG_L + 138, y, { align: "right" });
    doc.text(`31/12/${anoCal}`, MARG_L + 168, y, { align: "right" });
    doc.text(`EM ${anoCal}`, MARG_L + 190, y, { align: "right" });
    doc.setTextColor(0); y += 1;
    doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(MARG_L, y, PAGE_W - MARG_R, y); y += 4;

    let totDivAnt = 0, totDivAtual = 0, totPago = 0;
    for (const d of dividas) {
      ensure(10);
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      doc.text(String(d.codigo || "").padStart(2, "0"), MARG_L, y);
      const discLs = doc.splitTextToSize((d.discriminacao || "").toUpperCase(), 105);
      doc.text(discLs, MARG_L + 18, y);
      doc.text(fmtBRL(d.valor_anterior), MARG_L + 138, y, { align: "right" });
      doc.text(fmtBRL(d.valor_atual), MARG_L + 168, y, { align: "right" });
      doc.text(fmtBRL(d.valor_pago || 0), MARG_L + 190, y, { align: "right" });
      y += Math.max(4, discLs.length * 3.5) + 1;
      totDivAnt += +d.valor_anterior || 0;
      totDivAtual += +d.valor_atual || 0;
      totPago += +d.valor_pago || 0;
    }
    ensure(6);
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(MARG_L, y - 2.5, PAGE_W - MARG_R, y - 2.5);
    doc.setFont("helvetica","bold"); doc.setFontSize(8);
    doc.text("TOTAL", MARG_L, y);
    doc.text(fmtBRL(totDivAnt), MARG_L + 138, y, { align: "right" });
    doc.text(fmtBRL(totDivAtual), MARG_L + 168, y, { align: "right" });
    doc.text(fmtBRL(totPago), MARG_L + 190, y, { align: "right" });
    y += 6;
  }

  tituloSecao("DOAÇÕES A PARTIDOS POLÍTICOS E CANDIDATOS A CARGOS ELETIVOS"); semInfo();

  // PÁGINAS SEM INFORMAÇÕES (atividade rural, ganhos de capital, renda variável)
  novaPagina();
  tituloSecao("DEMONSTRATIVO DE ATIVIDADE RURAL - BRASIL");
  tituloSecao("DADOS E IDENTIFICAÇÃO DO IMÓVEL EXPLORADO - BRASIL"); semInfo();
  tituloSecao("RECEITAS E DESPESAS - BRASIL"); semInfo();
  tituloSecao("APURAÇÃO DO RESULTADO - BRASIL"); semInfo();
  tituloSecao("MOVIMENTAÇÃO DO REBANHO - BRASIL"); semInfo();
  tituloSecao("BENS DA ATIVIDADE RURAL - BRASIL"); semInfo();
  tituloSecao("DÍVIDAS VINCULADAS À ATIVIDADE RURAL - BRASIL"); semInfo();

  novaPagina();
  tituloSecao("DEMONSTRATIVO DE ATIVIDADE RURAL - EXTERIOR");
  tituloSecao("DADOS E IDENTIFICAÇÃO DO IMÓVEL EXPLORADO - EXTERIOR"); semInfo();
  tituloSecao("RECEITAS E DESPESAS - EXTERIOR"); semInfo();
  tituloSecao("APURAÇÃO DO RESULTADO - EXTERIOR"); semInfo();
  tituloSecao("MOVIMENTAÇÃO DO REBANHO - EXTERIOR"); semInfo();
  tituloSecao("BENS DA ATIVIDADE RURAL - EXTERIOR"); semInfo();
  tituloSecao("DÍVIDAS VINCULADAS À ATIVIDADE RURAL - EXTERIOR"); semInfo();
  tituloSecao("DEMONSTRATIVO DA APURAÇÃO DOS GANHOS DE CAPITAL"); semInfo();

  novaPagina();
  tituloSecao("RENDA VARIÁVEL - OPERAÇÕES COMUNS/DAYTRADE - TITULAR");
  for (const m of ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"]) {
    tituloSecao(`GANHOS LÍQUIDOS OU PERDAS - ${m}`); semInfo();
  }
  tituloSecao("RENDA VARIÁVEL - OPERAÇÕES COMUNS/DAYTRADE - DEPENDENTES"); semInfo();
  tituloSecao("FUNDOS DE INVESTIMENTO IMOBILIÁRIO OU NAS CADEIAS PRODUTIVAS AGROINDUSTRIAIS - TITULAR"); semInfo();
  tituloSecao("FUNDOS DE INVESTIMENTO IMOBILIÁRIO OU NAS CADEIAS PRODUTIVAS AGROINDUSTRIAIS - DEPENDENTES"); semInfo();
  tituloSecao("DOAÇÕES DIRETAMENTE NA DECLARAÇÃO - ECA"); semInfo();
  tituloSecao("DOAÇÕES DIRETAMENTE NA DECLARAÇÃO - PESSOA IDOSA"); semInfo();

  // RESUMO
  novaPagina();
  ensure(10);
  doc.setFont("helvetica","bold"); doc.setFontSize(11);
  doc.text("RESUMO", MARG_L, y);
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("TRIBUTAÇÃO UTILIZANDO AS DEDUÇÕES LEGAIS", MARG_L + 50, y);
  y += 1.5;
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(MARG_L, y, PAGE_W - MARG_R, y); y += 5;

  const resumo = dados.resumo || {};
  const t = (lbl) => { doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text(lbl, MARG_L, y); y += 5; };
  const lin = (lbl, val) => {
    ensure(8);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    const valStr = fmtBRL(val);
    const valW = doc.getTextWidth(valStr);
    const maxLblW = LARG - valW - 5;
    const lbls = doc.splitTextToSize(lbl, maxLblW);
    doc.text(lbls, MARG_L, y);
    doc.text(valStr, PAGE_W - MARG_R, y, { align: "right" });
    y += Math.max(4.5, lbls.length * 4);
  };

  t("RENDIMENTOS TRIBUTÁVEIS");
  const _rendTitular = resumo.rend_pj_titular ?? fontes.reduce((s,f)=>s+(+f.rendimentos_tributaveis||0),0);
  lin("Recebidos de Pessoa Jurídica pelo titular", _rendTitular);
  lin("Recebidos de Pessoa Jurídica pelos dependentes", resumo.rend_pj_dependentes || 0);
  lin("Recebidos de Pessoa Física/Exterior pelo titular", resumo.rend_pf_titular || 0);
  lin("Recebidos de Pessoa Física/Exterior pelos dependentes", resumo.rend_pf_dependentes || 0);
  lin("Recebidos acumuladamente pelo titular", resumo.rend_acum_titular || 0);
  lin("Recebidos acumuladamente pelos dependentes", resumo.rend_acum_dependentes || 0);
  lin("Resultado tributável da Atividade Rural", resumo.rural || 0);
  doc.setFont("helvetica","bold"); ensure(5);
  doc.text("TOTAL", MARG_L, y);
  const totRend = _rendTitular + (+resumo.rend_pj_dependentes||0) + (+resumo.rend_pf_titular||0) + (+resumo.rend_pf_dependentes||0) + (+resumo.rend_acum_titular||0) + (+resumo.rend_acum_dependentes||0) + (+resumo.rural||0);
  doc.text(fmtBRL(totRend), PAGE_W - MARG_R, y, { align: "right" }); y += 6;

  t("DEDUÇÕES");
  const _contribPrev = resumo.contrib_prev ?? fontes.reduce((s,f)=>s+(+f.inss||0),0);
  lin("Contribuições às previdências oficial e complementar aberta ou fechada de que trata o § 15 do art. 40 da CF/1988 (até o limite do patrocinador)", _contribPrev);
  lin("Contribuição à previdência oficial (Rendimentos recebidos acumuladamente)", resumo.contrib_prev_acum || 0);
  lin("Contribuição à prev. complementar, inclusive o valor para as fechadas de que trata o § 15 do art. 40 da CF/1988 que exceder o limite do patrocinador", resumo.contrib_prev_comp || 0);
  lin("Dependentes", resumo.deducao_dependentes || 0);
  lin("Despesas com instrução", resumo.despesas_instrucao || 0);
  lin("Despesas médicas", resumo.despesas_medicas || 0);
  lin("Pensão alimentícia judicial", resumo.pensao_judicial || 0);
  lin("Pensão alimentícia por escritura pública", resumo.pensao_escritura || 0);
  lin("Pensão alimentícia judicial (Rendimentos recebidos acumuladamente)", resumo.pensao_judicial_acum || 0);
  lin("Livro caixa", resumo.livro_caixa || 0);
  doc.setFont("helvetica","bold"); ensure(5);
  doc.text("TOTAL", MARG_L, y);
  const totDed = _contribPrev + (+resumo.contrib_prev_acum||0) + (+resumo.contrib_prev_comp||0) + (+resumo.deducao_dependentes||0) + (+resumo.despesas_instrucao||0) + (+resumo.despesas_medicas||0) + (+resumo.pensao_judicial||0) + (+resumo.pensao_escritura||0) + (+resumo.pensao_judicial_acum||0) + (+resumo.livro_caixa||0);
  doc.text(fmtBRL(totDed), PAGE_W - MARG_R, y, { align: "right" }); y += 8;

  // 2 colunas: IMPOSTO DEVIDO | IMPOSTO A RESTITUIR/PARCELAMENTO
  const yColInicio = y;
  const xColEsq = MARG_L;
  const xColDir = MARG_L + LARG / 2 + 4;
  const wCol = LARG / 2 - 4;

  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text("IMPOSTO DEVIDO", xColEsq, y); y += 5;
  const linEsq = (lbl, val) => { doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(lbl, xColEsq, y); doc.text(fmtBRL(val), xColEsq + wCol, y, { align: "right" }); y += 4.5; };
  linEsq("Base de cálculo do imposto", resumo.base_calculo || 0);
  linEsq("Imposto devido", resumo.imposto_devido || 0);
  linEsq("Dedução de incentivo", resumo.deducao_incentivo || 0);
  linEsq("Imposto devido I", resumo.imposto_devido_i || resumo.imposto_devido || 0);
  linEsq("Imposto devido RRA", resumo.imposto_devido_rra || 0);
  linEsq("Aliquota efetiva (%)", resumo.aliquota_efetiva || 0);
  linEsq("Total do imposto devido", resumo.total_imposto_devido || resumo.imposto_devido || 0);
  const yEsqFim = y;

  y = yColInicio;
  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("IMPOSTO A RESTITUIR", xColDir, y);
  doc.text(fmtBRL(resumo.imposto_restituir || 0), xColDir + wCol, y, { align: "right" }); y += 5;
  doc.text("SALDO DE IMPOSTO A PAGAR", xColDir, y);
  doc.text(fmtBRL(resumo.saldo_a_pagar || 0), xColDir + wCol, y, { align: "right" }); y += 7;
  doc.setFont("helvetica","bold"); doc.text("PARCELAMENTO", xColDir, y); y += 5;
  const linDir = (lbl, val) => { doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(lbl, xColDir, y); doc.text(String(val), xColDir + wCol, y, { align: "right" }); y += 4.5; };
  linDir("Valor da quota", fmtBRL(resumo.valor_quota || 0));
  linDir("Número de Quotas", resumo.num_quotas || 0);
  y = Math.max(yEsqFim, y) + 6;

  doc.setFont("helvetica","bold"); doc.setFontSize(9);
  doc.text("IMPOSTO PAGO", xColEsq, y);
  doc.text("INFORMAÇÕES BANCÁRIAS", xColDir, y);
  y += 5;
  const yLayoutInicio = y;

  const linImp = (lbl, val) => { doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(lbl, xColEsq, y); doc.text(fmtBRL(val), xColEsq + wCol, y, { align: "right" }); y += 4.5; };
  linImp("Imposto retido na fonte do titular", irRetidoTitular);
  linImp("Imp. retido na fonte dos dependentes", ipr.ir_retido_dependentes || 0);
  linImp("Carnê-Leão do titular", ipr.carne_leao_titular || 0);
  linImp("Carnê-Leão dos dependentes", ipr.carne_leao_dependentes || 0);
  linImp("Imposto complementar", ipr.imposto_complementar || 0);
  linImp("Imposto pago no exterior", ipr.imposto_exterior || 0);
  linImp("Imposto retido na fonte (Lei nº 11.033/2004)", ipr.imposto_lei_11033 || 0);
  linImp("Imposto retido RRA", ipr.imposto_retido_rra || 0);
  doc.setFont("helvetica","bold");
  doc.text("Total do imposto pago", xColEsq, y);
  doc.text(fmtBRL(irRetidoTitular + (+ipr.ir_retido_dependentes||0) + (+ipr.carne_leao_titular||0) + (+ipr.carne_leao_dependentes||0) + (+ipr.imposto_complementar||0) + (+ipr.imposto_exterior||0) + (+ipr.imposto_lei_11033||0) + (+ipr.imposto_retido_rra||0)), xColEsq + wCol, y, { align: "right" });
  const yEsqFim2 = y + 5;

  y = yLayoutInicio;
  const bank = dados.informacoes_bancarias || {};
  const linBank = (lbl, val) => { doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(lbl, xColDir, y); doc.text(String(val || ""), xColDir + wCol, y, { align: "right" }); y += 4.5; };
  linBank("Tipo de Conta", bank.tipo_conta || "");
  linBank("Banco", bank.banco || "");
  linBank("Agência (sem DV)", bank.agencia || "");
  linBank("Conta para crédito", bank.conta || "");
  y = Math.max(yEsqFim2, y) + 6;

  // EVOLUÇÃO PATRIMONIAL + OUTRAS INFORMAÇÕES
  novaPagina();
  tituloSecao("EVOLUÇÃO PATRIMONIAL");
  lin(`Bens e direitos em 31/12/${anoCalAnt}`, totBensAnt);
  lin(`Bens e direitos em 31/12/${anoCal}`, totBensAtual);
  lin(`Dívidas e ônus reais em 31/12/${anoCalAnt}`, dividas.reduce((s,d)=>s+(+d.valor_anterior||0),0));
  lin(`Dívidas e ônus reais em 31/12/${anoCal}`, dividas.reduce((s,d)=>s+(+d.valor_atual||0),0));
  y += 4;

  tituloSecao("OUTRAS INFORMAÇÕES");
  const totIsentos = (dados.rendimentos_isentos || []).reduce((s,r)=>s+(+r.valor||0),0);
  const totExclusivos = (dados.rendimentos_tributacao_exclusiva || []).reduce((s,r)=>s+(+r.valor||0),0);
  lin("Rendimentos isentos e não tributáveis", totIsentos);
  lin("Rendimentos sujeitos à tributação exclusiva/definitiva", totExclusivos);
  lin("Rendimentos tributáveis - imposto com exigibilidade suspensa", 0);
  lin("Depósitos judiciais do imposto", 0);
  lin("Imposto pago sobre Ganhos de Capital", 0);
  lin("Imposto pago Ganhos de Capital Moeda Estrangeira - Bens, direitos e Aplicações Financeiras", 0);
  lin("Total do imposto retido na fonte (Lei nº11.033/2004), conforme dados informados pelo contribuinte", 0);
  lin("Imposto pago sobre Renda Variável", 0);
  lin("Doações a Partidos Políticos e Candidatos a Cargos Eletivos", 0);
  lin("Imposto a pagar sobre o Ganho de Capital - Moeda Estrangeira em Espécie", 0);
  lin("Imposto diferido dos Ganhos de Capital", 0);
  lin("Imposto devido sobre Ganhos de Capital", 0);
  lin("Imposto devido sobre ganhos líquidos em Renda Variável", 0);
  lin("Imposto devido sobre Ganhos de Capital Moeda Estrangeira - Bens, direitos e aplic. financeiras", 0);

  // Footer páginas
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.setTextColor(60);
    const txt = `Página ${p} de ${totalPaginas}`;
    const tw = doc.getTextWidth(txt);
    doc.text(txt, (PAGE_W - tw)/2, PAGE_H - 5);
    doc.setTextColor(0);
  }

  return doc;
}

// ============================================================
// CONSOLIDAR DADOS — converte templateInfo+patch ou dadosExtraidos pro formato esperado pelo PDF
// ============================================================

function consolidarDadosPatch(templateInfo, patch, aprovacoes, reciboInfo) {
  const eAprov = (k) => aprovacoes[k] !== false;
  const c = templateInfo.contribuinte || {};
  const ec = templateInfo.endereco || {};
  const patchContrib = (patch?.contribuinte && aprovacoes["contrib"] !== false) ? patch.contribuinte : {};
  const patchEnd = (patch?.endereco && aprovacoes["contrib"] !== false) ? patch.endereco : {};

  const dados = {
    anoDeclaracao: templateInfo.anoDeclaracao || "0000",
    anoCalendario: templateInfo.anoCalendario || "0000",
    contribuinte: {
      nome: patchContrib.nome || c.nome,
      cpf: c.cpf,
      data_nascimento: c.data_nascimento,
      email: patchContrib.email || c.email,
      telefone: patchContrib.telefone || c.telefone,
      celular: patchContrib.celular || patchContrib.telefone || c.telefone,
      tipo_declaracao: "Declaração de Ajuste Anual Original",
      recibo_anterior: reciboInfo?.numero || "",
    },
    endereco: {
      logradouro: patchEnd.logradouro || ec.logradouro,
      numero: patchEnd.numero || ec.numero,
      complemento: patchEnd.complemento || ec.complemento,
      bairro: patchEnd.bairro || ec.bairro,
      municipio: patchEnd.municipio || ec.municipio,
      uf: patchEnd.uf || ec.uf,
      cep: patchEnd.cep || ec.cep,
    },
    dependentes: (templateInfo.dependentes || []).map((d, i) => {
      const dp = (patch?.dependentes_atualizados || []).find((x) => x.idx === i + 1 && eAprov(`dep_${i+1}`));
      return {
        codigo: d.parentesco_cod || "21",
        nome: dp?.nome || d.nome,
        data_nascimento: dp?.data_nascimento || d.data_nascimento,
        cpf: dp?.cpf || d.cpf,
        mora_com_titular: "Sim",
      };
    }),
    fontes_pagadoras: [],
    rendimentos_isentos: [],
    bens: [],
    dividas: [],
  };

  // Fontes pagadoras: para cada fonte do template, usar valor do patch se aprovado, senão template
  for (let i = 0; i < (templateInfo.fontes || []).length; i++) {
    const f = templateInfo.fontes[i];
    const pf = (patch?.fontes_pagadoras || []).find((x) => (x.cnpj || "").replace(/\D/g, "") === f.cnpj && eAprov(`fonte_${(x.cnpj || "").replace(/\D/g, "")}`));
    dados.fontes_pagadoras.push({
      cnpj: f.cnpj,
      nome: pf?.nome || f.nome,
      rendimentos_tributaveis: pf?.rendimentos_tributaveis ?? f.rendimentos_tributaveis,
      inss: pf?.inss ?? f.inss,
      decimo_terceiro: pf?.decimo_terceiro ?? f.decimo_terceiro,
      ir_retido: pf?.ir_retido ?? f.ir_retido,
    });
  }
  // Fontes novas vindas só no patch (sem correspondente no template)
  for (const pf of (patch?.fontes_pagadoras || [])) {
    const cnpjLimpo = (pf.cnpj || "").replace(/\D/g, "");
    if (!eAprov(`fonte_${cnpjLimpo}`)) continue;
    if (!(templateInfo.fontes || []).some((x) => x.cnpj === cnpjLimpo)) {
      dados.fontes_pagadoras.push({
        cnpj: cnpjLimpo,
        nome: pf.nome || "",
        rendimentos_tributaveis: +pf.rendimentos_tributaveis || 0,
        inss: +pf.inss || 0,
        decimo_terceiro: +pf.decimo_terceiro || 0,
        ir_retido: +pf.ir_retido || 0,
      });
    }
  }

  // Helper interno: idx (1-based) está marcado pra remoção?
  // Considera ambos: a IA propondo via patch.*_a_remover (aprovação default = true)
  // E o contador marcando manualmente em REVISAR (aprovação = true explícito).
  const idxRemovido = (chavePatch, chaveManual) => (patchLista, idx) => {
    if ((patchLista || []).some((x) => x.idx === idx) && aprovacoes[`${chavePatch}_${idx}`] !== false) return true;
    if (aprovacoes[`${chaveManual}_revisar_remover_${idx}`] === true) return true;
    return false;
  };
  const bemRemovido     = idxRemovido("bem_remover",    "bem");
  const dividaRemovida  = idxRemovido("divida_remover", "divida");
  const isentoRemovido  = idxRemovido("isento_remover", "isento");

  // Dependentes a remover (só vem do patch — não há REVISAR pra dependentes)
  const depRemovido = (idx) => (patch?.dependentes_a_remover || []).some((x) => x.idx === idx) && aprovacoes[`dep_remover_${idx}`] !== false;

  // Re-monta a lista de dependentes filtrando os removidos
  dados.dependentes = dados.dependentes.filter((_, i) => !depRemovido(i + 1));

  // Bens: do template, com sobreposição do patch — pula removidos
  for (let i = 0; i < (templateInfo.bens || []).length; i++) {
    if (bemRemovido(patch?.bens_a_remover, i + 1)) continue;
    const b = templateInfo.bens[i];
    const pb = (patch?.bens_atualizados || []).find((x) => x.idx === i + 1 && eAprov(`bem_${i+1}`));
    dados.bens.push({
      grupo: b.grupo,
      codigo: b.codigo || "",
      discriminacao: pb?.discriminacao || b.discriminacao,
      valor_anterior: b.valor_atual,
      valor_atual: pb?.valor_atual ?? b.valor_atual,
      cnpj: pb?.cnpj || "",
      banco: pb?.banco || "",
      agencia: pb?.agencia || "",
      conta: pb?.conta || "",
      bem_pertencente_a: "Titular",
      cpf_pertencente: templateInfo.contribuinte?.cpf,
      codigo_pais: "105",
      pais: "BRASIL",
      usufruto: "Não",
    });
  }

  // Dívidas: do template — pula removidas
  for (let i = 0; i < (templateInfo.dividas || []).length; i++) {
    if (dividaRemovida(patch?.dividas_a_remover, i + 1)) continue;
    const d = templateInfo.dividas[i];
    const pd = (patch?.dividas_atualizadas || []).find((x) => x.idx === i + 1 && eAprov(`div_${i+1}`));
    dados.dividas.push({
      codigo: d.codigo,
      discriminacao: pd?.discriminacao || d.discriminacao,
      valor_anterior: d.valor_atual,
      valor_atual: pd?.valor_atual ?? d.valor_atual,
      valor_pago: pd?.valor_pago || 0,
    });
  }

  // Rendimentos isentos: do template — pula removidos
  for (let i = 0; i < (templateInfo.rendIsentos || []).length; i++) {
    if (isentoRemovido(patch?.rendimentos_isentos_a_remover, i + 1)) continue;
    const r = templateInfo.rendIsentos[i];
    const pr = (patch?.rendimentos_isentos_atualizados || []).find((x) => x.idx === i + 1 && eAprov(`isento_${i+1}`));
    dados.rendimentos_isentos.push({
      codigo: pr?.codigo || "25",
      categoria_descricao: pr?.categoria || r.descricao || "Outros",
      cnpj_fonte: pr?.cnpj_fonte || r.cnpj_fonte,
      nome_fonte: pr?.nome_fonte || r.nome_fonte,
      valor: pr?.valor ?? r.valor,
    });
  }

  return dados;
}

function consolidarDadosConsolidacao(dadosExtraidos, reciboInfo) {
  const dados = {
    anoDeclaracao: dadosExtraidos.anoDeclaracao || "2026",
    anoCalendario: dadosExtraidos.anoCalendario || "2025",
    contribuinte: {
      ...(dadosExtraidos.contribuinte || {}),
      tipo_declaracao: dadosExtraidos.contribuinte?.tipo_declaracao || "Declaração de Ajuste Anual Original",
      recibo_anterior: dadosExtraidos.contribuinte?.recibo_anterior || reciboInfo?.numero || "",
    },
    endereco: dadosExtraidos.endereco || {},
    dependentes: (dadosExtraidos.dependentes || []).map((d) => ({
      codigo: d.codigo || "21",
      nome: d.nome,
      cpf: d.cpf,
      data_nascimento: d.data_nascimento,
      mora_com_titular: d.mora_com_titular || "Sim",
    })),
    alimentandos: dadosExtraidos.alimentandos || [],
    fontes_pagadoras: dadosExtraidos.fontes_pagadoras || [],
    rendimentos_isentos: dadosExtraidos.rendimentos_isentos || [],
    rendimentos_tributacao_exclusiva: dadosExtraidos.rendimentos_tributacao_exclusiva || [],
    pagamentos_efetuados: dadosExtraidos.pagamentos_efetuados || [],
    doacoes_efetuadas: dadosExtraidos.doacoes_efetuadas || [],
    bens: (dadosExtraidos.bens || []).map((b) => ({
      grupo: b.grupo || "",
      codigo: b.codigo || "",
      discriminacao: b.discriminacao,
      valor_anterior: b.valor_anterior ?? b.saldo_anterior ?? 0,
      valor_atual: b.valor_atual ?? b.saldo_atual ?? 0,
      cnpj: b.cnpj || b.cnpj_cpf || "",
      banco: b.banco || "",
      agencia: b.agencia || "",
      conta: b.conta || "",
      bem_pertencente_a: "Titular",
      cpf_pertencente: dadosExtraidos.contribuinte?.cpf,
      codigo_pais: "105",
      pais: "BRASIL",
      usufruto: "Não",
    })),
    dividas: (dadosExtraidos.dividas || []).map((d) => ({
      codigo: d.codigo || "",
      discriminacao: d.discriminacao,
      valor_anterior: d.valor_anterior ?? d.saldo_anterior ?? 0,
      valor_atual: d.valor_atual ?? d.saldo_atual ?? 0,
      valor_pago: d.valor_pago ?? d.prestacoes_pagas ?? 0,
    })),
    imposto_pago_retido: dadosExtraidos.imposto_pago_retido || {},
    resumo: dadosExtraidos.resumo || {},
    informacoes_bancarias: dadosExtraidos.informacoes_bancarias || {},
  };
  // Se tem aplicações financeiras separadas, joga elas como bens grupo 04
  for (const a of (dadosExtraidos.aplicacoes_financeiras || [])) {
    dados.bens.push({
      grupo: "04",
      codigo: "02",
      discriminacao: a.instituicao || a.discriminacao,
      valor_anterior: a.saldo_anterior ?? a.valor_anterior ?? 0,
      valor_atual: a.saldo_atual ?? a.valor_atual ?? 0,
      cnpj: a.cnpj || "",
      bem_pertencente_a: "Titular",
      cpf_pertencente: dadosExtraidos.contribuinte?.cpf,
      codigo_pais: "105",
      pais: "BRASIL",
      usufruto: "Não",
    });
  }
  return dados;
}

// Wrappers compatíveis com a API anterior
async function gerarPdfAlteracoes(templateInfo, patch, aprovacoes, reciboInfo, manualOverrides = {}) {
  const jsPDF = await carregarJsPDF();
  if (!jsPDF) throw new Error("jsPDF indisponível");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const anoCalAtual = templateInfo.anoCalendario || "atual";
  const anoCalAnterior = anoCalAtual && /^\d{4}$/.test(anoCalAtual) ? String(parseInt(anoCalAtual, 10) - 1) : "anterior";
  const anoDecl = templateInfo.anoDeclaracao || "atual";

  // Paleta — mesmas cores semânticas do estúdio web
  const RGB = {
    tinta:    [26, 22, 18],
    sutil:    [107, 98, 86],
    cinza:    [155, 146, 133],
    verde:    [45, 90, 61],
    azul:     [58, 88, 118],
    laranja:  [204, 107, 42],
    vermelho: [139, 44, 26],
    bgAzul:   [238, 242, 246],
    bgVerde:  [238, 244, 239],
    bgLaranja:[252, 238, 224],
    bgCinza:  [248, 246, 240],
    bgVermelho:[246, 233, 229],
    linha:    [200, 195, 184],
  };
  const setText = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  // Desenha badge retangular pequeno (cor sólida + texto branco em CAIXA ALTA).
  // Replica os badges do HTML (REMOVER · REVISAR · ALTERADO · NOVO · CARNÊ-LEÃO).
  const desenhaBadge = (texto, xDireita, yTopo, corFundo) => {
    if (!texto) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const textoUpper = texto.toUpperCase();
    const padX = 1.6;
    const w = doc.getTextWidth(textoUpper) + padX * 2;
    const h = 3.6;
    setFill(corFundo);
    doc.rect(xDireita - w, yTopo, w, h, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(textoUpper, xDireita - w + padX, yTopo + h - 1.1);
    setText(RGB.tinta);
  };

  const MARG_L = 18, MARG_R = 18, LARG = 210 - MARG_L - MARG_R, BOTTOM = 280;
  const X_DIFF_ANT = MARG_L + 88;
  const X_DIFF_SETA = MARG_L + 122;
  const X_DIFF_NOVO = MARG_L + 130;
  let y = 22;
  let pagina = 1;

  const cabecalho = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(RGB.cinza);
    doc.text(`Alterações · ${templateInfo.contribuinte?.nome || ""} · CPF ${fmtCPF(templateInfo.contribuinte?.cpf)}`, MARG_L, 10);
    doc.text(`pág. ${pagina}`, 210 - MARG_R - doc.getTextWidth(`pág. ${pagina}`), 10);
    setDraw(RGB.linha);
    doc.setLineWidth(0.2);
    doc.line(MARG_L, 12.5, 210 - MARG_R, 12.5);
    setText(RGB.tinta);
  };

  const novaPagina = () => {
    doc.addPage();
    pagina++;
    y = 22;
    cabecalho();
  };

  const ensure = (h) => { if (y + h > BOTTOM) novaPagina(); };

  // Título de seção com barra colorida lateral + tipografia serif + linha sutil abaixo
  const secaoColorida = (numero, titulo, qtd, cor) => {
    ensure(24);
    y += 5;
    setFill(cor);
    doc.rect(MARG_L, y - 4, 2.5, 13, "F");
    setText(cor);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text(`${titulo}`, MARG_L + 5.5, y + 1.5);
    setText(RGB.sutil);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`${qtd} ${qtd === 1 ? "item" : "itens"}`, MARG_L + 5.5, y + 6.5);
    // linha sutil de separação abaixo
    setDraw(RGB.linha);
    doc.setLineWidth(0.2);
    doc.line(MARG_L, y + 10, 210 - MARG_R, y + 10);
    y += 15;
    setText(RGB.tinta);
  };

  // Linha de diff: "campo                R$ antes  →  R$ depois"
  const linhaDiff = (label, valorAnt, valorNovo, isMonetario = true) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(RGB.sutil);
    doc.text(label, MARG_L + 6, y);
    setText(RGB.cinza);
    doc.setFontSize(9);
    const ant = isMonetario ? `R$ ${fmtBRL(valorAnt)}` : String(valorAnt || "—");
    const novo = isMonetario ? `R$ ${fmtBRL(valorNovo)}` : String(valorNovo || "—");
    const antW = doc.getTextWidth(ant);
    doc.text(ant, X_DIFF_ANT + 30 - antW, y);
    setText(RGB.azul);
    doc.setFont("helvetica", "bold");
    doc.text("→", X_DIFF_SETA, y);
    setText(RGB.tinta);
    doc.setFont("helvetica", "bold");
    doc.text(novo, X_DIFF_NOVO, y);
    doc.setFont("helvetica", "normal");
    y += 5;
  };

  // Linha simples: "label .............................. R$ valor" (label esq, valor à direita)
  // Se destaque=true, valor em negrito + cor azul (pra "atualizado")
  const linhaValor = (label, valor, destaque = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(destaque ? RGB.azul : RGB.sutil);
    doc.text(label, MARG_L + 6, y);
    const valStr = `R$ ${fmtBRL(valor)}`;
    doc.setFont("helvetica", destaque ? "bold" : "normal");
    setText(destaque ? RGB.azul : RGB.tinta);
    const wVal = doc.getTextWidth(valStr);
    doc.text(valStr, MARG_L + LARG - 6 - wVal, y);
    doc.setFont("helvetica", "normal");
    y += 4.8;
  };

  // Card de item alterado/novo: container com borda esquerda colorida
  const abrirCard = (cor, bgCor) => {
    const yInicio = y;
    return { yInicio, cor, bgCor };
  };
  const fecharCard = (cardCtx, altura) => {
    setFill(cardCtx.bgCor);
    doc.rect(MARG_L, cardCtx.yInicio - 3, LARG, altura + 3, "F");
    setFill(cardCtx.cor);
    doc.rect(MARG_L, cardCtx.yInicio - 3, 1.2, altura + 3, "F");
  };

  // Card completo com header + origem + pares 2-col + linha de destaque opcional + badge
  // pares: array de [label1, valor1, label2, valor2] — cada elemento é uma linha
  // linhaDestaque: string, array de strings ou null — aparece em negrito azul no fim
  // badgeText/badgeCor: opcional — desenha badge no canto direito do header
  // editado: opcional — se true, desenha badge "EDITADO" (âmbar) à esquerda do principal
  const renderCard = (corBorda, bgCor, header, origem, pares, linhaDestaque, badgeText, badgeCor, editado) => {
    const FONT_HEADER = 11;
    const FONT_ORIGEM = 7.8;
    const FONT_CAMPO = 8.5;
    const FONT_DESTAQUE = 10.5;
    const LH_HEADER = 4.8;
    const LH_ORIGEM = 3.8;
    const LH_CAMPO = 4.6;
    const LH_DESTAQUE = 5;
    const X_LBL1 = MARG_L + 6;
    const X_LBL2 = MARG_L + (LARG / 2) + 3;
    const X_VAL1 = MARG_L + 37;
    const X_VAL2 = MARG_L + (LARG / 2) + 34;
    const COL1_W = (LARG / 2) - 37 - 3;
    const COL2_W = (LARG / 2) - 34 - 4;
    // Reserva espaço pro(s) badge(s) no header (à direita)
    const RESERVA_BADGE = badgeText ? (editado ? 42 : 22) : (editado ? 22 : 0);

    // Normalizar linhaDestaque pra array
    const destaqueLinhas = linhaDestaque
      ? (Array.isArray(linhaDestaque) ? linhaDestaque : String(linhaDestaque).split("\n"))
      : [];

    // --- Medir altura ---
    doc.setFont("times", "bold");
    doc.setFontSize(FONT_HEADER);
    const lsHeader = doc.splitTextToSize(header, LARG - 10 - RESERVA_BADGE);
    let alturaH = lsHeader.length * LH_HEADER;
    let alturaO = 0;
    if (origem) {
      doc.setFontSize(FONT_ORIGEM);
      const lsOrigem = doc.splitTextToSize(origem, LARG - 10);
      alturaO = lsOrigem.length * LH_ORIGEM;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_CAMPO);
    const paresMed = [];
    for (const [lbl1, val1, lbl2, val2] of pares) {
      const lsVal1 = doc.splitTextToSize(String(val1 ?? ""), COL1_W);
      const lsVal2 = val2 != null ? doc.splitTextToSize(String(val2 ?? ""), COL2_W) : [""];
      const nlin = Math.max(lsVal1.length, lsVal2.length);
      paresMed.push({ lbl1, lbl2, lsVal1, lsVal2, nlin });
    }
    const alturaPares = paresMed.reduce((acc, p) => acc + p.nlin * LH_CAMPO, 0);
    let alturaD = 0;
    if (destaqueLinhas.length) alturaD = 3 + destaqueLinhas.length * LH_DESTAQUE;
    const alturaTotal = 3 + alturaH + (alturaO ? alturaO + 1 : 0) + 4 + alturaPares + alturaD + 4;

    ensure(alturaTotal + 5);
    const yInicio = y;

    // --- Desenhar bg + borda esquerda colorida ---
    setFill(bgCor);
    doc.rect(MARG_L, yInicio - 1, LARG, alturaTotal, "F");
    setFill(corBorda);
    doc.rect(MARG_L, yInicio - 1, 1.5, alturaTotal, "F");

    // --- Badges no canto superior direito ---
    // Badge principal (status) à direita; badge "EDITADO" (âmbar) à esquerda dele se houve edição.
    let xBadge = MARG_L + LARG - 4;
    if (badgeText) {
      desenhaBadge(badgeText, xBadge, yInicio + 0.8, badgeCor || corBorda);
      xBadge -= 20; // espaço pro próximo
    }
    if (editado) {
      desenhaBadge("EDITADO", xBadge, yInicio + 0.8, [200, 155, 42]); // âmbar (mesmo do HTML)
    }

    // --- Header (tipografia serif, Times Bold) ---
    y += 2;
    doc.setFont("times", "bold");
    doc.setFontSize(FONT_HEADER);
    setText(RGB.tinta);
    doc.text(lsHeader, MARG_L + 6, y + 2.5);
    y += alturaH;

    // --- Origem ---
    if (origem) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(FONT_ORIGEM);
      setText(RGB.sutil);
      const lsOrigem = doc.splitTextToSize(origem, LARG - 10);
      doc.text(lsOrigem, MARG_L + 6, y + 2);
      y += alturaO + 1;
    }

    y += 4;

    // --- Pares 2 colunas ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_CAMPO);
    for (const p of paresMed) {
      setText(RGB.sutil);
      if (p.lbl1) doc.text(p.lbl1 + ":", X_LBL1, y);
      if (p.lbl2) doc.text(p.lbl2 + ":", X_LBL2, y);
      setText(RGB.tinta);
      doc.text(p.lsVal1, X_VAL1, y);
      if (p.lsVal2[0]) doc.text(p.lsVal2, X_VAL2, y);
      y += p.nlin * LH_CAMPO;
    }

    // --- Linha(s) de destaque ---
    if (destaqueLinhas.length) {
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT_DESTAQUE);
      setText(corBorda);
      for (const linha of destaqueLinhas) {
        doc.text(linha, MARG_L + 6, y);
        y += LH_DESTAQUE;
      }
    }

    y = yInicio + alturaTotal + 6;
  };

  // === TÍTULO PRINCIPAL ===
  setText(RGB.cinza);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("ESTÚDIO WEB IRPF", MARG_L, y);
  y += 11;
  setText(RGB.tinta);
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.text("Relatório de alterações", MARG_L, y);
  y += 11;
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.text(templateInfo.contribuinte?.nome || "—", MARG_L, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(RGB.sutil);
  doc.text(`CPF ${fmtCPF(templateInfo.contribuinte?.cpf)}  ·  declaração ${anoDecl} · ano-calendário ${anoCalAtual}  ·  gerado em ${new Date().toLocaleDateString("pt-BR")}`, MARG_L, y);
  y += 14;
  setText(RGB.tinta);

  // === Calcular itens aprovados ===
  const bensAprov = (patch.bens_atualizados || []).filter(b => aprovacoes[`bem_${b.idx}`] !== false);
  const dividasAprov = (patch.dividas_atualizadas || []).filter(d => aprovacoes[`divida_${d.idx}`] !== false);
  const fontesAprov = (patch.fontes_pagadoras || []).filter(f => {
    const cnpj = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
    return aprovacoes[`fonte_${cnpj}`] !== false;
  });
  const isentosAprov = (patch.rendimentos_isentos_atualizados || []).filter(r => aprovacoes[`isento_${r.idx}`] !== false);
  const exclAtualizAprov = (patch.rendimentos_exclusivos_atualizados || []).filter(e => aprovacoes[`excl_${e.idx}`] !== false);
  const depAtualizAprov = (patch.dependentes_atualizados || []).filter(d => aprovacoes[`dep_${d.idx}`] !== false);
  const pagAtualizAprov = (patch.pagamentos_atualizados || []).filter(p => aprovacoes[`pag_${p.idx}`] !== false);
  const contribAprov = (patch.contribuinte || patch.endereco) && aprovacoes["contrib"] !== false;

  // Mantém o índice original do patch (idx) junto com o item — usado pra associar overrides editados pelo contador.
  const fontesNovasAprov = (patch.fontes_novas || []).map((item, idx) => ({item, idx})).filter(({idx}) => aprovacoes[`fonte_nova_${idx}`] !== false);
  const bensNovosAprov = (patch.bens_novos_aviso || []).map((item, idx) => ({item, idx})).filter(({idx}) => aprovacoes[`bem_novo_${idx}`] !== false);
  const dividasNovasAprov = (patch.dividas_novas_aviso || []).map((item, idx) => ({item, idx})).filter(({idx}) => aprovacoes[`divida_nova_${idx}`] !== false);
  const pagNovosAprov = (patch.pagamentos_novos_aviso || []).map((item, idx) => ({item, idx})).filter(({idx}) => aprovacoes[`pag_novo_${idx}`] !== false);
  const exclNovosAprov = (patch.rendimentos_exclusivos_novos_aviso || []).map((item, idx) => ({item, idx})).filter(({idx}) => aprovacoes[`excl_novo_${idx}`] !== false);
  const carneLeaoAprov = (patch.rendimentos_pf_carne_leao || []).filter((_, i) => aprovacoes[`pf_${i}`] !== false);
  const depNovosAprov = patch.dependentes_novos_aviso || [];

  // Helper: combina remoções vindas do patch (IA) com remoções marcadas manualmente
  // pelo contador nos checkboxes de itens REVISAR. As manuais entram com motivo padrão
  // se a IA não tiver proposto a mesma remoção (evitando duplicação).
  const combinarRemovidos = (patchLista, tplLista, chavePatch, chaveManual, motivoManual) => {
    const idxsPatch = new Set();
    const result = [];
    for (const item of (patchLista || [])) {
      if (aprovacoes[`${chavePatch}_${item.idx}`] === false) continue;
      idxsPatch.add(item.idx);
      result.push(item);
    }
    for (let i = 0; i < (tplLista || []).length; i++) {
      const idx = i + 1;
      if (aprovacoes[`${chaveManual}_revisar_remover_${idx}`] !== true) continue;
      if (idxsPatch.has(idx)) continue;
      result.push({ idx, motivo: motivoManual });
    }
    return result;
  };

  const motivoManual = "marcado manualmente em REVISAR";

  // Helper: aplica override (do state manualOverrides) por cima de um item do patch
  // pra que o PDF de Alterações mostre os valores EDITADOS PELO CONTADOR, não os originais da IA.
  const aplicaOv = (item, chave) => {
    const ov = manualOverrides[chave];
    if (!ov) return item;
    // Items "string" legados viram { resumo: string } antes de mesclar
    const base = typeof item === "string" ? { resumo: item } : item;
    return { ...base, ...ov };
  };
  const foiEditado = (chave) => !!manualOverrides[chave];

  const bensRemoverAprov     = combinarRemovidos(patch.bens_a_remover,                   templateInfo.bens,          "bem_remover",    "bem",    motivoManual);
  const dividasRemoverAprov  = combinarRemovidos(patch.dividas_a_remover,                templateInfo.dividas,       "divida_remover", "divida", motivoManual);
  const depRemoverAprov      = (patch.dependentes_a_remover || []).filter(d => aprovacoes[`dep_remover_${d.idx}`] !== false);
  const pagRemoverAprov      = combinarRemovidos(patch.pagamentos_a_remover,             templateInfo.pagamentos,    "pag_remover",    "pag",    motivoManual);
  const isentosRemoverAprov  = combinarRemovidos(patch.rendimentos_isentos_a_remover,    templateInfo.rendIsentos,   "isento_remover", "isento", motivoManual);
  const exclRemoverAprov     = combinarRemovidos(patch.rendimentos_exclusivos_a_remover, templateInfo.rendExclusivos,"excl_remover",   "excl",   motivoManual);

  const totalAlt = (contribAprov ? 1 : 0) + bensAprov.length + dividasAprov.length + fontesAprov.length +
    isentosAprov.length + exclAtualizAprov.length + depAtualizAprov.length + pagAtualizAprov.length +
    fontesNovasAprov.length + bensNovosAprov.length + dividasNovasAprov.length + pagNovosAprov.length + exclNovosAprov.length +
    carneLeaoAprov.length +
    bensRemoverAprov.length + dividasRemoverAprov.length + depRemoverAprov.length + pagRemoverAprov.length + isentosRemoverAprov.length + exclRemoverAprov.length;

  // === SUMÁRIO ===
  if (totalAlt > 0) {
    setFill(RGB.bgCinza);
    const yInicioSumario = y;
    const linhasSumario = [];
    if (contribAprov) linhasSumario.push(`Contribuinte / endereço atualizado`);
    if (fontesAprov.length) linhasSumario.push(`${fontesAprov.length} fonte${fontesAprov.length > 1 ? "s" : ""} pagadora${fontesAprov.length > 1 ? "s" : ""} atualizada${fontesAprov.length > 1 ? "s" : ""}`);
    if (bensAprov.length) linhasSumario.push(`${bensAprov.length} ${bensAprov.length > 1 ? "bens" : "bem"} com saldo atualizado`);
    if (dividasAprov.length) linhasSumario.push(`${dividasAprov.length} dívida${dividasAprov.length > 1 ? "s" : ""} com saldo atualizado`);
    if (isentosAprov.length) linhasSumario.push(`${isentosAprov.length} rendimento${isentosAprov.length > 1 ? "s" : ""} isento${isentosAprov.length > 1 ? "s" : ""} atualizado${isentosAprov.length > 1 ? "s" : ""}`);
    if (exclAtualizAprov.length) linhasSumario.push(`${exclAtualizAprov.length} rendimento${exclAtualizAprov.length > 1 ? "s" : ""} exclusivo${exclAtualizAprov.length > 1 ? "s" : ""} atualizado${exclAtualizAprov.length > 1 ? "s" : ""}`);
    if (depAtualizAprov.length) linhasSumario.push(`${depAtualizAprov.length} dependente${depAtualizAprov.length > 1 ? "s" : ""} atualizado${depAtualizAprov.length > 1 ? "s" : ""}`);
    if (pagAtualizAprov.length) linhasSumario.push(`${pagAtualizAprov.length} pagamento${pagAtualizAprov.length > 1 ? "s" : ""} efetuado${pagAtualizAprov.length > 1 ? "s" : ""} atualizado${pagAtualizAprov.length > 1 ? "s" : ""}`);
    if (fontesNovasAprov.length) linhasSumario.push(`${fontesNovasAprov.length} fonte${fontesNovasAprov.length > 1 ? "s" : ""} nova${fontesNovasAprov.length > 1 ? "s" : ""}`);
    if (bensNovosAprov.length) linhasSumario.push(`${bensNovosAprov.length} ${bensNovosAprov.length > 1 ? "bens novos" : "bem novo"}`);
    if (dividasNovasAprov.length) linhasSumario.push(`${dividasNovasAprov.length} dívida${dividasNovasAprov.length > 1 ? "s" : ""} nova${dividasNovasAprov.length > 1 ? "s" : ""}`);
    if (pagNovosAprov.length) linhasSumario.push(`${pagNovosAprov.length} pagamento${pagNovosAprov.length > 1 ? "s" : ""} novo${pagNovosAprov.length > 1 ? "s" : ""}`);
    if (exclNovosAprov.length) linhasSumario.push(`${exclNovosAprov.length} rendimento${exclNovosAprov.length > 1 ? "s" : ""} exclusivo${exclNovosAprov.length > 1 ? "s" : ""} novo${exclNovosAprov.length > 1 ? "s" : ""}`);
    if (carneLeaoAprov.length) linhasSumario.push(`${carneLeaoAprov.length} pagador${carneLeaoAprov.length > 1 ? "es" : ""} PF (Carnê-Leão)`);
    const totalRemover = bensRemoverAprov.length + dividasRemoverAprov.length + depRemoverAprov.length + pagRemoverAprov.length + isentosRemoverAprov.length + exclRemoverAprov.length;
    if (totalRemover > 0) {
      linhasSumario.push(`${totalRemover} ${totalRemover > 1 ? "itens" : "item"} a remover`);
    }
    const altSumario = linhasSumario.length * 4.5 + 10;
    doc.rect(MARG_L, y, LARG, altSumario, "F");
    setFill(RGB.cinza);
    doc.rect(MARG_L, y, 1.5, altSumario, "F");
    setText(RGB.sutil);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SUMÁRIO", MARG_L + 6, y + 5);
    doc.setFont("helvetica", "normal");
    setText(RGB.tinta);
    let yLinha = y + 10;
    for (const linha of linhasSumario) {
      doc.text(`• ${linha}`, MARG_L + 6, yLinha);
      yLinha += 4.5;
    }
    y += altSumario + 8;
    setText(RGB.tinta);
  } else {
    setText(RGB.sutil);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Nenhuma alteração aprovada.", MARG_L, y);
    y += 10;
    setText(RGB.tinta);
    doc.setFont("helvetica", "normal");
  }

  // === CONTRIBUINTE / ENDEREÇO (alterado / azul) ===
  if (contribAprov) {
    secaoColorida("", "Contribuinte e endereço", 1, RGB.azul);
    ensure(20);
    const c = templateInfo.contribuinte || {};
    const e = templateInfo.endereco || {};
    const yInicio = y;
    y += 3;
    if (patch.contribuinte) {
      for (const [k, v] of Object.entries(patch.contribuinte)) {
        if (v == null || v === "") continue;
        ensure(7);
        linhaDiff(labelLegivel(k), c[k] || "—", v, false);
      }
    }
    if (patch.endereco) {
      for (const [k, v] of Object.entries(patch.endereco)) {
        if (v == null || v === "") continue;
        ensure(7);
        linhaDiff(labelLegivel(k), e[k] || "—", v, false);
      }
    }
    // desenhar background do card
    const altura = y - yInicio + 1;
    setFill(RGB.bgAzul);
    doc.rect(MARG_L, yInicio - 2, LARG, altura, "F");
    setFill(RGB.azul);
    doc.rect(MARG_L, yInicio - 2, 1.2, altura, "F");
    // re-renderizar texto por cima do bg
    y = yInicio + 3;
    if (patch.contribuinte) {
      for (const [k, v] of Object.entries(patch.contribuinte)) {
        if (v == null || v === "") continue;
        linhaDiff(labelLegivel(k), c[k] || "—", v, false);
      }
    }
    if (patch.endereco) {
      for (const [k, v] of Object.entries(patch.endereco)) {
        if (v == null || v === "") continue;
        linhaDiff(labelLegivel(k), e[k] || "—", v, false);
      }
    }
    y += 6;
  }

  // === FONTES PAGADORAS (alterado / azul) ===
  if (fontesAprov.length > 0) {
    secaoColorida("", `Fontes pagadoras atualizadas`, fontesAprov.length, RGB.azul);
    for (const _f of fontesAprov) {
      const cnpjF = String(_f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
      const idxTpl = templateInfo.fontes.findIndex(x => x.cnpj === cnpjF);
      const tpl = idxTpl >= 0 ? templateInfo.fontes[idxTpl] : {};
      const chaveOv = `fonte_atualizada_${idxTpl + 1}`;
      const f = aplicaOv(_f, chaveOv);
      const header = tpl.nome || f.nome || "(sem nome)";
      const pares = [
        ["CNPJ", fmtCNPJ(f.cnpj), "Nome", tpl.nome || f.nome || "—"],
        ["Rendimentos (template)", `R$ ${fmtBRL(tpl.rendimentos_tributaveis ?? 0)}`, "Rendimentos (atualizado)", `R$ ${fmtBRL(f.rendimentos_tributaveis ?? 0)}`],
        ["13º salário (template)", `R$ ${fmtBRL(tpl.decimo_terceiro ?? 0)}`, "13º salário (atualizado)", `R$ ${fmtBRL(f.decimo_terceiro ?? 0)}`],
        ["INSS retido (template)", `R$ ${fmtBRL(tpl.inss ?? 0)}`, "INSS retido (atualizado)", `R$ ${fmtBRL(f.inss ?? 0)}`],
        ["IR retido (template)", `R$ ${fmtBRL(tpl.ir_retido ?? 0)}`, "IR retido (atualizado)", `R$ ${fmtBRL(f.ir_retido ?? 0)}`],
      ];
      renderCard(RGB.azul, RGB.bgAzul, header, f.origem || null, pares, null, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === BENS ATUALIZADOS (alterado / azul) ===
  if (bensAprov.length > 0) {
    secaoColorida("", `${bensAprov.length > 1 ? "Bens" : "Bem"} com saldo atualizado`, bensAprov.length, RGB.azul);
    for (const _b of bensAprov) {
      const chaveOv = `bem_atualizado_${_b.idx}`;
      const b = aplicaOv(_b, chaveOv);
      const tpl = templateInfo.bens[b.idx - 1] || {};
      const anoAnt = !isNaN(parseInt(anoCalAtual, 10)) ? String(parseInt(anoCalAtual, 10) - 1) : "anterior";
      const header = `B${b.idx} · ${tpl.discriminacao || "(sem nome)"}`;
      const pares = [
        ["Grupo Receita", tpl.grupo_receita ?? "—", "Nome Grupo Receita", tpl.nome_grupo_receita ?? "—"],
        ["Cod Tributario", tpl.cod_tributario ?? "—", "Grupo", tpl.grupo ?? "—"],
        ["Codigo", tpl.codigo ?? "—", "Discriminacao", tpl.discriminacao ?? "—"],
        [`Valor 31/12/${anoAnt}`, `R$ ${fmtBRL(tpl.valor_anterior ?? 0)}`, `Valor 31/12/${anoCalAtual}`, `R$ ${fmtBRL(tpl.valor_atual ?? 0)}`],
      ];
      if (tpl.cnpj || tpl.banco || tpl.agencia || tpl.conta) {
        pares.push(["CNPJ", tpl.cnpj ? fmtCNPJ(tpl.cnpj) : "—", "Banco", tpl.banco ?? "—"]);
        pares.push(["Agencia", tpl.agencia ?? "—", "Conta", tpl.conta ?? "—"]);
      }
      // Construir linhas de destaque (multilinha quando há atualização nos dois anos)
      const linhasDestaque = [];
      if (b.valor_anterior != null) linhasDestaque.push(`Valor 31/12/${anoAnt} (atualizado): R$ ${fmtBRL(b.valor_anterior)}`);
      if (b.valor_atual != null) linhasDestaque.push(`Valor 31/12/${anoCalAtual} (atualizado): R$ ${fmtBRL(b.valor_atual)}`);
      const destaque = linhasDestaque.join("\n");
      renderCard(RGB.azul, RGB.bgAzul, header, b.origem || null, pares, destaque, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === DÍVIDAS ATUALIZADAS (alterado / azul) ===
  if (dividasAprov.length > 0) {
    secaoColorida("", `${dividasAprov.length > 1 ? "Dívidas" : "Dívida"} com saldo atualizado`, dividasAprov.length, RGB.azul);
    for (const _d of dividasAprov) {
      const chaveOv = `divida_atualizada_${_d.idx}`;
      const d = aplicaOv(_d, chaveOv);
      const tpl = templateInfo.dividas[d.idx - 1] || {};
      const anoAnt = !isNaN(parseInt(anoCalAtual, 10)) ? String(parseInt(anoCalAtual, 10) - 1) : "anterior";
      const header = `V${d.idx} · ${tpl.discriminacao || "(sem nome)"}`;
      const pares = [
        ["Codigo", tpl.codigo ?? "—", "Discriminacao", tpl.discriminacao ?? "—"],
        [`Saldo 31/12/${anoAnt}`, `R$ ${fmtBRL(tpl.valor_anterior ?? 0)}`, `Saldo 31/12/${anoCalAtual}`, `R$ ${fmtBRL(tpl.valor_atual ?? 0)}`],
        [`Valor Pago em ${anoCalAtual}`, `R$ ${fmtBRL(tpl.valor_pago ?? 0)}`, "", ""],
      ];
      const linhasDestaque = [];
      if (d.valor_anterior != null) linhasDestaque.push(`Saldo 31/12/${anoAnt} (atualizado): R$ ${fmtBRL(d.valor_anterior)}`);
      if (d.valor_atual != null) linhasDestaque.push(`Saldo 31/12/${anoCalAtual} (atualizado): R$ ${fmtBRL(d.valor_atual)}`);
      if (d.valor_pago != null) linhasDestaque.push(`Valor Pago em ${anoCalAtual} (atualizado): R$ ${fmtBRL(d.valor_pago)}`);
      renderCard(RGB.azul, RGB.bgAzul, header, d.origem || null, pares, linhasDestaque, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === RENDIMENTOS ISENTOS (alterado / azul) ===
  if (isentosAprov.length > 0) {
    secaoColorida("", `${isentosAprov.length > 1 ? "Rendimentos isentos atualizados" : "Rendimento isento atualizado"}`, isentosAprov.length, RGB.azul);
    for (const _r of isentosAprov) {
      const chaveOv = `isento_atualizado_${_r.idx}`;
      const r = aplicaOv(_r, chaveOv);
      const tpl = templateInfo.rendIsentos[r.idx - 1] || {};
      const header = `I${r.idx} · ${tpl.nome_fonte || "(sem nome)"}`;
      const pares = [
        ["CNPJ", fmtCNPJ(tpl.cnpj_fonte), "Categoria", tpl.descricao || "—"],
        ["Valor (template)", `R$ ${fmtBRL(tpl.valor ?? 0)}`, "Valor (atualizado)", `R$ ${fmtBRL(r.valor ?? 0)}`],
      ];
      renderCard(RGB.azul, RGB.bgAzul, header, r.origem || null, pares, null, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === PAGAMENTOS EFETUADOS ATUALIZADOS (alterado / azul) ===
  if (pagAtualizAprov.length > 0) {
    secaoColorida("", `${pagAtualizAprov.length > 1 ? "Pagamentos efetuados atualizados" : "Pagamento efetuado atualizado"}`, pagAtualizAprov.length, RGB.azul);
    for (const _p of pagAtualizAprov) {
      const chaveOv = `pag_atualizado_${_p.idx}`;
      const p = aplicaOv(_p, chaveOv);
      const tpl = templateInfo.pagamentos[p.idx - 1] || {};
      const header = `P${p.idx} · ${tpl.nome || "(sem nome)"}`;
      const pares = [
        ["Código", tpl.codigo ?? "—", "CNPJ/CPF", tpl.cnpj_cpf ? (tpl.cnpj_cpf.length === 14 ? fmtCNPJ(tpl.cnpj_cpf) : fmtCPF(tpl.cnpj_cpf)) : "—"],
        ["Beneficiário", tpl.nome ?? "—", "Valor Pago (template)", `R$ ${fmtBRL(tpl.valor_pago ?? 0)}`],
      ];
      const destaque = `Valor Pago em ${anoCalAtual} (atualizado): R$ ${fmtBRL(p.valor_pago)}`;
      renderCard(RGB.azul, RGB.bgAzul, header, p.origem || null, pares, destaque, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === RENDIMENTOS EXCLUSIVOS ATUALIZADOS (alterado / azul) ===
  if (exclAtualizAprov.length > 0) {
    secaoColorida("", `${exclAtualizAprov.length > 1 ? "Rendimentos exclusivos atualizados" : "Rendimento exclusivo atualizado"}`, exclAtualizAprov.length, RGB.azul);
    for (const _e of exclAtualizAprov) {
      const chaveOv = `excl_atualizado_${_e.idx}`;
      const e = aplicaOv(_e, chaveOv);
      const tpl = templateInfo.rendExclusivos[e.idx - 1] || {};
      const header = `E${e.idx} · ${tpl.nome_fonte || "(sem nome)"}`;
      const pares = [
        ["Código", tpl.codigo ?? "—", "CNPJ Fonte", tpl.cnpj_fonte ? fmtCNPJ(tpl.cnpj_fonte) : "—"],
        ["Fonte", tpl.nome_fonte ?? "—", "Valor (template)", `R$ ${fmtBRL(tpl.valor ?? 0)}`],
      ];
      const destaque = `Valor (atualizado): R$ ${fmtBRL(e.valor)}`;
      renderCard(RGB.azul, RGB.bgAzul, header, e.origem || null, pares, destaque, "ALTERADO", RGB.azul, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === FONTES NOVAS (novo / verde) ===
  if (fontesNovasAprov.length > 0) {
    secaoColorida("", `${fontesNovasAprov.length > 1 ? "Fontes pagadoras novas" : "Fonte pagadora nova"}`, fontesNovasAprov.length, RGB.verde);
    for (const {item: _f, idx: idxN} of fontesNovasAprov) {
      const chaveOv = `fonte_novo_${idxN}`;
      const f = aplicaOv(_f, chaveOv);
      const header = `+ ${f.nome || "(sem nome)"}`;
      const pares = [
        ["CNPJ", fmtCNPJ(f.cnpj), "Nome", f.nome || "—"],
        ["Rendimentos", `R$ ${fmtBRL(f.rendimentos_tributaveis ?? 0)}`, "13º salário", `R$ ${fmtBRL(f.decimo_terceiro ?? 0)}`],
        ["INSS retido", `R$ ${fmtBRL(f.inss ?? 0)}`, "IR retido", `R$ ${fmtBRL(f.ir_retido ?? 0)}`],
      ];
      renderCard(RGB.verde, RGB.bgVerde, header, f.origem || null, pares, null, "NOVO", RGB.verde, foiEditado(chaveOv));
    }
    y += 2;
  }

  // === BENS NOVOS (novo / verde) ===
  if (bensNovosAprov.length > 0) {
    secaoColorida("", `${bensNovosAprov.length > 1 ? "Bens novos" : "Bem novo"}`, bensNovosAprov.length, RGB.verde);
    for (const {item: _b, idx: idxN} of bensNovosAprov) {
      const chaveOv = `bem_novo_${idxN}`;
      const b = aplicaOv(_b, chaveOv);
      if (typeof b === "string") {
        ensure(10);
        const yInicio = y;
        const altEstim = 8;
        setFill(RGB.bgVerde);
        doc.rect(MARG_L, yInicio - 2, LARG, altEstim, "F");
        setFill(RGB.verde);
        doc.rect(MARG_L, yInicio - 2, 1.2, altEstim, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(RGB.tinta);
        doc.text(b, MARG_L + 4, y + 1);
        y += altEstim + 2;
      } else {
        const header = b.resumo || `+ ${b.discriminacao || "(sem nome)"}`;
        const pares = [
          ["Grupo Receita", b.grupo_receita ?? "—", "Nome Grupo Receita", b.nome_grupo_receita ?? "—"],
          ["Cod Tributario", b.cod_tributario ?? "—", "Grupo", b.grupo ?? "—"],
          ["Codigo", b.codigo ?? "—", "Discriminacao", b.discriminacao ?? "—"],
          ["Valor Anterior", `R$ ${fmtBRL(b.valor_anterior ?? 0)}`, "Valor Atual", `R$ ${fmtBRL(b.valor_atual ?? 0)}`],
        ];
        if (b.cnpj || b.banco || b.agencia || b.conta) {
          pares.push(["CNPJ", b.cnpj ? fmtCNPJ(b.cnpj) : "—", "Banco", b.banco ?? "—"]);
          pares.push(["Agencia", b.agencia ?? "—", "Conta", b.conta ?? "—"]);
        }
        renderCard(RGB.verde, RGB.bgVerde, header, b.origem || null, pares, null, "NOVO", RGB.verde, foiEditado(chaveOv));
      }
    }
    y += 2;
  }

  // === DÍVIDAS NOVAS (novo / verde) ===
  if (dividasNovasAprov.length > 0) {
    secaoColorida("", "Dívidas novas", dividasNovasAprov.length, RGB.verde);
    for (const {item: _d, idx: idxN} of dividasNovasAprov) {
      const chaveOv = `divida_novo_${idxN}`;
      const d = aplicaOv(_d, chaveOv);
      if (typeof d === "string") {
        ensure(10);
        const altEstim = 8;
        setFill(RGB.bgVerde);
        doc.rect(MARG_L, y - 2, LARG, altEstim, "F");
        setFill(RGB.verde);
        doc.rect(MARG_L, y - 2, 1.2, altEstim, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(RGB.tinta);
        doc.text(d, MARG_L + 4, y + 1);
        y += altEstim + 2;
      } else {
        const header = d.resumo || `+ ${d.discriminacao || "(sem nome)"}`;
        const pares = [
          ["Codigo", d.codigo ?? "—", "Discriminacao", d.discriminacao ?? "—"],
          [`Saldo 31/12/${anoCalAnterior}`, `R$ ${fmtBRL(d.valor_anterior ?? 0)}`, `Saldo 31/12/${anoCalAtual}`, `R$ ${fmtBRL(d.valor_atual ?? 0)}`],
          [`Valor Pago em ${anoCalAtual}`, `R$ ${fmtBRL(d.valor_pago ?? 0)}`, "Credor", d.credor ?? "—"],
        ];
        renderCard(RGB.verde, RGB.bgVerde, header, d.origem || null, pares, null, "NOVO", RGB.verde, foiEditado(chaveOv));
      }
    }
    y += 2;
  }

  // === PAGAMENTOS EFETUADOS NOVOS (novo / verde) ===
  if (pagNovosAprov.length > 0) {
    secaoColorida("", `${pagNovosAprov.length > 1 ? "Pagamentos efetuados novos" : "Pagamento efetuado novo"}`, pagNovosAprov.length, RGB.verde);
    for (const {item: _p, idx: idxN} of pagNovosAprov) {
      const chaveOv = `pag_novo_${idxN}`;
      const p = aplicaOv(_p, chaveOv);
      if (typeof p === "string") {
        ensure(10);
        const yInicio = y;
        const altEstim = 8;
        setFill(RGB.bgVerde);
        doc.rect(MARG_L, yInicio - 2, LARG, altEstim, "F");
        setFill(RGB.verde);
        doc.rect(MARG_L, yInicio - 2, 1.2, altEstim, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(RGB.tinta);
        doc.text(p, MARG_L + 4, y + 1);
        y += altEstim + 2;
      } else {
        const header = p.resumo || `+ [cód ${p.codigo}] ${p.nome || "(sem nome)"}`;
        const cnpjCpf = String(p.cnpj_cpf || p.cnpj || p.cpf || "").replace(/\D/g, "");
        const pares = [
          ["Código", p.codigo ?? "—", "CNPJ/CPF", cnpjCpf ? (cnpjCpf.length === 14 ? fmtCNPJ(cnpjCpf) : fmtCPF(cnpjCpf)) : "—"],
          ["Beneficiário", p.nome ?? "—", "Valor Pago", `R$ ${fmtBRL(p.valor_pago ?? 0)}`],
        ];
        renderCard(RGB.verde, RGB.bgVerde, header, p.origem || null, pares, null, "NOVO", RGB.verde, foiEditado(chaveOv));
      }
    }
    y += 2;
  }

  // === RENDIMENTOS EXCLUSIVOS NOVOS (novo / verde) ===
  if (exclNovosAprov.length > 0) {
    secaoColorida("", `${exclNovosAprov.length > 1 ? "Rendimentos exclusivos novos" : "Rendimento exclusivo novo"}`, exclNovosAprov.length, RGB.verde);
    for (const {item: _e, idx: idxN} of exclNovosAprov) {
      const chaveOv = `excl_novo_${idxN}`;
      const e = aplicaOv(_e, chaveOv);
      if (typeof e === "string") {
        ensure(10);
        const altEstim = 8;
        setFill(RGB.bgVerde);
        doc.rect(MARG_L, y - 2, LARG, altEstim, "F");
        setFill(RGB.verde);
        doc.rect(MARG_L, y - 2, 1.2, altEstim, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(RGB.tinta);
        doc.text(e, MARG_L + 4, y + 1);
        y += altEstim + 2;
      } else {
        const header = e.resumo || `+ [cód ${e.codigo}] ${e.nome_fonte || "(sem nome)"}`;
        const pares = [
          ["Código", e.codigo ?? "—", "Tipo Benef.", e.tipo_beneficiario ?? "T"],
          ["CNPJ Fonte", e.cnpj_fonte ? fmtCNPJ(e.cnpj_fonte) : "—", "CPF Benef.", e.cpf_beneficiario ? fmtCPF(e.cpf_beneficiario) : "—"],
          ["Fonte", e.nome_fonte ?? "—", "Valor", `R$ ${fmtBRL(e.valor ?? 0)}`],
        ];
        renderCard(RGB.verde, RGB.bgVerde, header, e.origem || null, pares, null, "NOVO", RGB.verde, foiEditado(chaveOv));
      }
    }
    y += 2;
  }

  // === CARNÊ-LEÃO PF (novo / verde) ===
  if (carneLeaoAprov.length > 0) {
    secaoColorida("", "Rendimentos PF · Carnê-Leão", carneLeaoAprov.length, RGB.verde);
    for (const p of carneLeaoAprov) {
      ensure(24);
      const yInicio = y;
      const vm = p.valores_mensais || {};
      const meses = Object.entries(vm).filter(([_, v]) => Number(v) > 0).map(([m, v]) => `${m.padStart(2, "0")}: R$ ${fmtBRL(v)}`);
      const linsMeses = doc.splitTextToSize(meses.join("  ·  "), LARG - 12);
      const altEstim = 5 + 4 + 5.5 + (linsMeses.length * 4) + 6;
      setFill(RGB.bgVerde);
      doc.rect(MARG_L, yInicio - 1, LARG, altEstim, "F");
      setFill(RGB.verde);
      doc.rect(MARG_L, yInicio - 1, 1.5, altEstim, "F");
      // Badge CARNÊ-LEÃO no canto direito
      desenhaBadge("CARNÊ-LEÃO", MARG_L + LARG - 4, yInicio + 0.8, RGB.verde);
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      setText(RGB.tinta);
      doc.text(p.nome || "(sem nome)", MARG_L + 6, y + 2.5);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(RGB.sutil);
      doc.text(`CPF ${fmtCPF(p.cpf)}${p.natureza ? "  ·  " + p.natureza : ""}`, MARG_L + 6, y + 2);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      setText(RGB.tinta);
      doc.text(`Total no ano: R$ ${fmtBRL(p.valor_total_ano)}`, MARG_L + 6, y + 2.5);
      y += 5.5;
      if (linsMeses.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(RGB.sutil);
        doc.text(linsMeses, MARG_L + 6, y + 2);
        y += linsMeses.length * 4;
      }
      y += 6;
    }
    y += 2;
  }

  // === ITENS A REMOVER (laranja) ===
  const totalRemoverPdf = bensRemoverAprov.length + dividasRemoverAprov.length + depRemoverAprov.length + pagRemoverAprov.length + isentosRemoverAprov.length + exclRemoverAprov.length;
  if (totalRemoverPdf > 0) {
    secaoColorida("", "Itens a remover", totalRemoverPdf, RGB.laranja);
    const remover = [
      ...bensRemoverAprov.map(b => ({ tipo: "Bem", idx: b.idx, motivo: b.motivo, item: templateInfo.bens[b.idx - 1] })),
      ...dividasRemoverAprov.map(d => ({ tipo: "Dívida", idx: d.idx, motivo: d.motivo, item: templateInfo.dividas[d.idx - 1] })),
      ...depRemoverAprov.map(d => ({ tipo: "Dependente", idx: d.idx, motivo: d.motivo, item: templateInfo.dependentes[d.idx - 1] })),
      ...pagRemoverAprov.map(p => ({ tipo: "Pagamento", idx: p.idx, motivo: p.motivo, item: templateInfo.pagamentos[p.idx - 1] })),
      ...isentosRemoverAprov.map(i => ({ tipo: "Rendimento isento", idx: i.idx, motivo: i.motivo, item: templateInfo.rendIsentos[i.idx - 1] })),
      ...exclRemoverAprov.map(e => ({ tipo: "Rendimento exclusivo", idx: e.idx, motivo: e.motivo, item: templateInfo.rendExclusivos[e.idx - 1] })),
    ];
    // Construtor dos pares por tipo de item — replica o detalhe que o card do HTML mostra.
    // Cada par é [label1, valor1, label2, valor2] e renderiza em 2 colunas.
    const paresParaRemocao = (tipo, item) => {
      if (!item) return [];
      const moeda = (v) => `R$ ${fmtBRL(v ?? 0)}`;
      const ouTraço = (v) => (v == null || v === "" ? "—" : String(v));
      if (tipo === "Bem") {
        return [
          ["Grupo Receita", ouTraço(item.grupo_receita), "Nome Grupo Receita", ouTraço(item.nome_grupo_receita)],
          ["Cod Tributário", ouTraço(item.cod_tributario || item.grupo), "Grupo", ouTraço(item.grupo)],
          ["Código", ouTraço(item.codigo), "Discriminação", ouTraço(item.discriminacao)],
          [`Valor 31/12/${anoCalAnterior}`, moeda(item.valor_anterior), `Valor 31/12/${anoCalAtual}`, moeda(item.valor_atual)],
        ];
      }
      if (tipo === "Dívida") {
        return [
          ["Código", ouTraço(item.codigo), "Discriminação", ouTraço(item.discriminacao)],
          [`Saldo 31/12/${anoCalAnterior}`, moeda(item.valor_anterior), `Saldo 31/12/${anoCalAtual}`, moeda(item.valor_atual)],
          ["Valor pago no ano", moeda(item.valor_pago), "", ""],
        ];
      }
      if (tipo === "Pagamento") {
        const cnpjCpf = String(item.cnpj_cpf || item.cnpj || item.cpf || "").replace(/\D/g, "");
        const cpfCnpjFmt = cnpjCpf ? (cnpjCpf.length === 14 ? fmtCNPJ(cnpjCpf) : fmtCPF(cnpjCpf)) : "—";
        return [
          ["Código", ouTraço(item.codigo), "CNPJ/CPF", cpfCnpjFmt],
          ["Beneficiário", ouTraço(item.nome), "Valor pago", moeda(item.valor_pago)],
        ];
      }
      if (tipo === "Rendimento isento") {
        return [
          ["CNPJ Fonte", item.cnpj_fonte ? fmtCNPJ(item.cnpj_fonte) : "—", "Nome Fonte", ouTraço(item.nome_fonte)],
          ["Descrição", ouTraço(item.descricao), "Valor", moeda(item.valor)],
        ];
      }
      if (tipo === "Rendimento exclusivo") {
        return [
          ["Código", ouTraço(item.codigo), "Tipo Beneficiário", ouTraço(item.tipo_beneficiario || "T")],
          ["CNPJ Fonte", item.cnpj_fonte ? fmtCNPJ(item.cnpj_fonte) : "—", "Nome Fonte", ouTraço(item.nome_fonte)],
          ["Valor", moeda(item.valor), "", ""],
        ];
      }
      if (tipo === "Dependente") {
        return [
          ["Nome", ouTraço(item.nome), "CPF", item.cpf ? fmtCPF(item.cpf) : "—"],
          ["Data de nascimento", item.data_nascimento ? fmtData(item.data_nascimento) : "—", "Parentesco (cód)", ouTraço(item.parentesco_cod)],
        ];
      }
      return [];
    };

    for (const r of remover) {
      const item = r.item || {};
      const nomeBruto = item.discriminacao || item.nome || item.nome_fonte || `${r.tipo} ${r.idx}`;
      const header = `${r.tipo} ${r.idx} · ${nomeBruto}`;
      const origem = r.motivo ? `Motivo: ${r.motivo}` : null;
      const pares = paresParaRemocao(r.tipo, item);
      renderCard(RGB.laranja, RGB.bgLaranja, header, origem, pares, null, "REMOVER", RGB.laranja);
    }
    y += 2;
  }

  // === RODAPÉ ===
  ensure(22);
  y += 8;
  setDraw(RGB.linha);
  doc.setLineWidth(0.3);
  doc.line(MARG_L, y, 210 - MARG_R, y);
  y += 10;
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  setText(RGB.tinta);
  doc.text(`Total de alterações aprovadas: ${totalAlt}`, MARG_L, y);

  // Aplicar cabeçalho em todas as páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    pagina = p;
    cabecalho();
  }

  return doc;
}

async function gerarPdfDeclaracao(templateInfo, patch, aprovacoes, reciboInfo) {
  // mantido por compat com baixarPdfResumo
  const dados = consolidarDadosPatch(templateInfo, patch, aprovacoes, reciboInfo);
  return gerarPdfDeclaracaoPrePreenchida(dados);
}

async function gerarPdfResumo(dadosExtraidos, reciboInfo) {
  const dados = consolidarDadosConsolidacao(dadosExtraidos, reciboInfo);
  return gerarPdfDeclaracaoPrePreenchida(dados);
}


function FileSlot({ rotulo, descricao, accept, file, onChange, multi, files, protegido }) {
  const inputRef = useRef(null);
  const items = multi ? files || [] : file ? [file] : [];
  const cor = protegido ? "#c89b2a" : items.length ? "#2d5a3d" : "#d4cfc1";
  const bg = protegido ? "#fdf4e0" : items.length ? "#eef4ef" : "#fcfaf4";
  return (
    <div
      className="border p-4 transition-colors cursor-pointer"
      style={{ borderColor: cor, background: bg }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 14, fontWeight: 500, color: "#1a1612" }}>{rotulo}</span>
      </div>
      <div style={{ fontSize: 11, color: "#6b6256", marginBottom: 10, lineHeight: 1.4 }}>{descricao}</div>
      <input ref={inputRef} type="file" accept={accept} multiple={multi} className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files || []);
          onChange(multi ? fs : fs[0] || null);
        }}
      />
      {items.length === 0 ? (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8a7f6e" }}>+ clique para selecionar</div>
      ) : (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: protegido ? "#8a6a14" : "#2d5a3d" }}>
          {items.map((f, i) => (
            <div key={i} className="flex justify-between items-center" style={{ marginTop: i > 0 ? 4 : 0 }}>
              <span className="truncate" style={{ maxWidth: "80%" }}>{protegido ? "🔒" : "✓"} {f.name}</span>
              <span style={{ color: "#8a7f6e", fontSize: 10 }}>{(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, label, sub }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "4px 0" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "#2d5a3d" }}
      />
      <span style={{ fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {sub && <div style={{ color: "#6b6256", fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </span>
    </label>
  );
}

function Diff({ ant, novo, valor }) {
  if (ant === novo) {
    return <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#1a1612" }}>{valor ? `R$ ${fmtBRL(novo)}` : novo}</span>;
  }
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
      <span style={{ color: "#8a7f6e", textDecoration: "line-through" }}>{valor ? `R$ ${fmtBRL(ant)}` : ant || "—"}</span>
      <span style={{ color: "#6b6256", margin: "0 6px" }}>→</span>
      <span style={{ color: "#2d5a3d", fontWeight: 600 }}>{valor ? `R$ ${fmtBRL(novo)}` : novo}</span>
    </span>
  );
}

// Detecta se um campo (pelo nome) deve ser formatado como moeda BRL
function ehCampoMonetario(campo) {
  return /^(valor|saldo|rendim|ir_retido|inss|13|decimo|prestac|juros|amortiz|principal|deduc|imposto|tributa|liquido|bruto|montante|total|premio|aporte)/i.test(campo);
}

// Label legível: snake_case -> "Snake case"
// Casos especiais:
//   valor_31_12_AAAA              -> "Valor 31/12/AAAA"
//   valor_atualizado_31_12_AAAA   -> "Valor 31/12/AAAA (atualizado)"
function labelLegivel(campo) {
  let m;
  if (campo === "decimo_terceiro") return "13º Salário";
  if (campo === "valor_pago") return "Valor Pago";
  if (campo === "valor_pago_atualizado") return "Valor Pago (atualizado)";
  if ((m = campo.match(/^valor_atualizado_(\d{2})_(\d{2})_(\d{4})$/))) {
    return `Valor ${m[1]}/${m[2]}/${m[3]} (atualizado)`;
  }
  if ((m = campo.match(/^valor_(\d{2})_(\d{2})_(\d{4})$/))) {
    return `Valor ${m[1]}/${m[2]}/${m[3]}`;
  }
  return campo
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bIr\b/g, "IR")
    .replace(/\bInss\b/g, "INSS")
    .replace(/\bCnpj\b/g, "CNPJ")
    .replace(/\bCpf\b/g, "CPF");
}

// Renderiza um par campo:valor numa linha
// Card de aviso para item novo — renderiza objeto estruturado com cópia por campo,
// ou string legada como linha simples com botão de copiar
function AvisoCard({ item, prefixo }) {
  // Caso 1: string legada (compat com avisos antigos da IA)
  if (typeof item === "string") {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 4, fontSize: 12, color: "#6b6256", lineHeight: 1.6 }}>
        <span style={{ flex: 1 }}>• {item}</span>
        <BotaoCopiar texto={item} label="Copiar descrição" />
      </div>
    );
  }
  // Caso 2: objeto estruturado
  const titulo = item.resumo || item.discriminacao || item.nome || `(${prefixo} novo)`;
  // Campos copiáveis individualmente (com formato pronto pro PGD)
  const camposCopia = [];
  if (item.grupo) camposCopia.push({ label: "Grupo", valor: String(item.grupo).padStart(2, "0") });
  if (item.codigo) camposCopia.push({ label: "Código", valor: String(item.codigo).padStart(2, "0") });
  if (item.discriminacao) camposCopia.push({ label: "Discriminação", valor: item.discriminacao, mono: false, multilinha: true });
  if (item.cnpj) camposCopia.push({ label: "CNPJ", valor: fmtCNPJ(item.cnpj), bruto: String(item.cnpj).replace(/\D/g, ""), mono: true });
  if (item.cpf) camposCopia.push({ label: "CPF", valor: fmtCPF(item.cpf), bruto: String(item.cpf).replace(/\D/g, ""), mono: true });
  if (item.banco) camposCopia.push({ label: "Banco", valor: item.banco, mono: true });
  if (item.agencia) camposCopia.push({ label: "Agência", valor: item.agencia, mono: true });
  if (item.conta) camposCopia.push({ label: "Conta", valor: item.conta, mono: true });
  if (item.valor_anterior != null) camposCopia.push({ label: "Valor 31/12 anterior", valor: `R$ ${fmtBRL(item.valor_anterior)}`, bruto: String(item.valor_anterior), mono: true });
  if (item.valor_atual != null) camposCopia.push({ label: "Valor 31/12 atual", valor: `R$ ${fmtBRL(item.valor_atual)}`, bruto: String(item.valor_atual), mono: true });
  if (item.valor_pago != null && item.valor_pago !== 0) camposCopia.push({ label: "Valor pago", valor: `R$ ${fmtBRL(item.valor_pago)}`, bruto: String(item.valor_pago), mono: true });
  if (item.rendimentos_tributaveis != null) camposCopia.push({ label: "Rendimentos tributáveis", valor: `R$ ${fmtBRL(item.rendimentos_tributaveis)}`, bruto: String(item.rendimentos_tributaveis), mono: true });
  if (item.decimo_terceiro != null && item.decimo_terceiro !== 0) camposCopia.push({ label: "13º salário", valor: `R$ ${fmtBRL(item.decimo_terceiro)}`, bruto: String(item.decimo_terceiro), mono: true });
  if (item.inss != null && item.inss !== 0) camposCopia.push({ label: "INSS", valor: `R$ ${fmtBRL(item.inss)}`, bruto: String(item.inss), mono: true });
  if (item.ir_retido != null && item.ir_retido !== 0) camposCopia.push({ label: "IR retido", valor: `R$ ${fmtBRL(item.ir_retido)}`, bruto: String(item.ir_retido), mono: true });
  if (item.data_nascimento) camposCopia.push({ label: "Data de nascimento", valor: fmtData8(item.data_nascimento), bruto: item.data_nascimento, mono: true });
  if (item.nome && (item.cpf || item.data_nascimento)) camposCopia.push({ label: "Nome", valor: item.nome });
  if (item.credor) camposCopia.push({ label: "Credor", valor: item.credor });
  // Texto completo pra copiar tudo de uma vez (formato PGD-friendly)
  const blocoCompleto = camposCopia.map(c => `${c.label}: ${c.valor}`).join("\n");

  return (
    <div style={{
      padding: "10px 12px",
      background: "#fffdf6",
      border: "1px solid #e8d99a",
      borderRadius: 3,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: "#5a4a14", flex: 1 }}>
          • {titulo}
        </div>
        <BotaoCopiar texto={blocoCompleto} label="Copiar todos os campos formatados" size={12} />
      </div>
      {item.origem && (
        <div style={{ fontSize: 11, color: "#8a7f6e", fontStyle: "italic", marginBottom: 4 }}>
          {item.origem}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "2px 8px", fontSize: 11.5, alignItems: "center" }}>
        {camposCopia.map((c, i) => (
          <Fragment key={i}>
            <span style={{ color: "#8a7f6e", whiteSpace: "nowrap" }}>{c.label}:</span>
            <span style={{
              color: "#1a1612",
              fontFamily: c.mono ? "'IBM Plex Mono', monospace" : "inherit",
              wordBreak: c.multilinha ? "break-word" : "normal",
              whiteSpace: c.multilinha ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>{c.valor}</span>
            <BotaoCopiar texto={c.bruto || c.valor} label={`Copiar ${c.label}`} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Calcula status semáforo de cada item do template comparando com o patch (se houver)
function calcularStatusBem(idx, b, patch) {
  // REVISAR só quando AMBOS valor_anterior e valor_atual = 0 (caso realmente
  // não mapeado: bem fantasma, ou alienação tão antiga que a pré-preenchida
  // não registra mais a transição). Se há mudança documentada (ex: anterior
  // 92.050 → atual 0 = alienação registrada pela pré-preenchida), é "neutro" —
  // fato consumado, nada a fazer.
  const ambosZerados = Number(b.valor_anterior) === 0 && Number(b.valor_atual) === 0;
  if (!patch) return { status: ambosZerados ? "revisar" : "neutro", patchItem: null };
  // a-remover explícito
  if ((patch.bens_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  // atualizado
  const upd = (patch.bens_atualizados || []).find(x => x.idx === idx);
  if (upd) {
    // se valor zerou, marca como remover
    if (Number(upd.valor_atual) === 0 && Number(b.valor_atual) !== 0) return { status: "remover", patchItem: upd };
    return { status: "alterado", patchItem: upd };
  }
  // patch existe mas não tocou nesse item: revisão só se ambos zerados
  return { status: ambosZerados ? "revisar" : "neutro", patchItem: null };
}

function calcularStatusDivida(idx, d, patch) {
  const ambosZerados = Number(d.valor_anterior) === 0 && Number(d.valor_atual) === 0;
  if (!patch) return { status: ambosZerados ? "revisar" : "neutro", patchItem: null };
  if ((patch.dividas_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  const upd = (patch.dividas_atualizadas || []).find(x => x.idx === idx);
  if (upd) {
    if (Number(upd.valor_atual) === 0 && Number(d.valor_atual) !== 0) return { status: "remover", patchItem: upd };
    return { status: "alterado", patchItem: upd };
  }
  return { status: ambosZerados ? "revisar" : "neutro", patchItem: null };
}

function calcularStatusFonte(f, patch) {
  if (!patch) return { status: "neutro", patchItem: null };
  const cnpj = String(f.cnpj || "").replace(/\D/g, "");
  const upd = (patch.fontes_pagadoras || []).find(x => String(x.cnpj || "").replace(/\D/g, "").padStart(14, "0") === cnpj);
  if (upd) return { status: "alterado", patchItem: upd };
  return { status: "neutro", patchItem: null };
}

function calcularStatusRendIsento(idx, r, patch) {
  // Zerado no template é candidato a remoção — mesma lógica de pagamentos.
  const zerado = Number(r.valor) === 0;
  if (!patch) return { status: zerado ? "revisar" : "neutro", patchItem: null };
  if ((patch.rendimentos_isentos_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  const upd = (patch.rendimentos_isentos_atualizados || []).find(x => x.idx === idx);
  if (upd) {
    if (Number(upd.valor) === 0 && Number(r.valor) !== 0) return { status: "remover", patchItem: upd };
    return { status: "alterado", patchItem: upd };
  }
  return { status: zerado ? "revisar" : "neutro", patchItem: null };
}

function calcularStatusDependente(idx, d, patch) {
  if (!patch) return { status: "neutro", patchItem: null };
  if ((patch.dependentes_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  const upd = (patch.dependentes_atualizados || []).find(x => x.idx === idx);
  if (upd) return { status: "alterado", patchItem: upd };
  return { status: "neutro", patchItem: null };
}

function calcularStatusPagamento(idx, p, patch) {
  // Pagamento zerado no template é candidato a remoção (cliente declarou ano passado mas não recorreu)
  const zerado = Number(p.valor_pago) === 0;
  if (!patch) return { status: zerado ? "revisar" : "neutro", patchItem: null };
  if ((patch.pagamentos_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  const upd = (patch.pagamentos_atualizados || []).find(x => x.idx === idx);
  if (upd) return { status: "alterado", patchItem: upd };
  return { status: zerado ? "revisar" : "neutro", patchItem: null };
}

function calcularStatusRendExclusivo(idx, e, patch) {
  // Zerado no template é candidato a remoção — mesma lógica de pagamentos e isentos.
  const zerado = Number(e.valor) === 0;
  if (!patch) return { status: zerado ? "revisar" : "neutro", patchItem: null };
  if ((patch.rendimentos_exclusivos_a_remover || []).some(x => x.idx === idx)) return { status: "remover", patchItem: null };
  const upd = (patch.rendimentos_exclusivos_atualizados || []).find(x => x.idx === idx);
  if (upd) {
    if (Number(upd.valor) === 0 && Number(e.valor) !== 0) return { status: "remover", patchItem: upd };
    return { status: "alterado", patchItem: upd };
  }
  return { status: zerado ? "revisar" : "neutro", patchItem: null };
}

// Combina item do template com valores do patch (pra exibir o estado final no card)
function mesclarItem(itemTemplate, patchItem) {
  if (!patchItem) return itemTemplate;
  return { ...itemTemplate, ...Object.fromEntries(Object.entries(patchItem).filter(([k, v]) => v != null && v !== "" && k !== "idx")) };
}

// Painel detalhado do template — mostra todos os itens com status semáforo
function ConteudoTemplate({ templateInfo, patch, aprovacoes = {}, setAprovacoes = () => {}, manualOverrides = {}, setManualOverrides = () => {} }) {
  if (!templateInfo) return null;

  // Helper: gera os props pro checkbox de remoção manual em itens REVISAR.
  // chavePrefixo: ex "bem", "divida", "pag", "isento", "excl"
  const propsRemoverRevisar = (chavePrefixo, idx) => {
    const chave = `${chavePrefixo}_revisar_remover_${idx}`;
    return {
      marcadoRemover: aprovacoes[chave] === true,
      onMarcarRemover: (v) => setAprovacoes({ ...aprovacoes, [chave]: v }),
    };
  };

  // Helper: gera os props pra edição inline (botão Editar) de itens propostos pela IA.
  // chaveOverride: identificador único, ex "bem_atualizado_3", "fonte_nova_0".
  // Retorna `onSalvarEdicao` que armazena novos valores em manualOverrides,
  // e `editado` indicando se já há override pra esse item.
  const propsEdicao = (chaveOverride) => ({
    onSalvarEdicao: (novosValores) => setManualOverrides({ ...manualOverrides, [chaveOverride]: novosValores }),
    editado: !!manualOverrides[chaveOverride],
  });

  // Helper: aplica override por cima do item (pra refletir edições do contador no card).
  // Mantém todos os campos do item original e sobrescreve apenas os que foram editados.
  const mesclarOverride = (item, chaveOverride) => {
    const ov = manualOverrides[chaveOverride];
    if (!ov) return item;
    const base = typeof item === "string" ? { resumo: item } : item;
    return { ...base, ...ov };
  };

  // Helper: gera props completas pra ItemCard de item ATUALIZADO pela IA (status=alterado).
  // Inclui o item já com override aplicado + callbacks de edição. Pra status neutro/revisar,
  // não habilita edição (Fase 1 só edita itens propostos pela IA).
  const cardPropsAtualizado = (tipo, idx, status, item) => {
    if (status !== "alterado") return { item };
    const chaveOv = `${tipo}_atualizado_${idx}`;
    return { item: mesclarOverride(item, chaveOv), ...propsEdicao(chaveOv) };
  };

  // Helper: gera props completas pra ItemCard de item NOVO (status=novo).
  // Edição sempre habilitada — esses itens vieram inteiros da IA, então faz sentido editar.
  const cardPropsNovo = (tipo, i, item) => {
    const chaveOv = `${tipo}_novo_${i}`;
    return { item: mesclarOverride(item, chaveOv), ...propsEdicao(chaveOv) };
  };

  const Bloco = ({ titulo, itens, vazio }) => {
    if (!itens || itens.length === 0) return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 500 }}>{titulo}</div>
        <div style={{ fontSize: 12, color: COR_SUTIL, fontStyle: "italic", padding: "8px 12px", background: "#f5f1e8" }}>{vazio || "(vazio no template)"}</div>
      </div>
    );
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 500 }}>
          {titulo} <span style={{ color: COR_TINTA }}>· {itens.length}</span>
        </div>
        {itens}
      </div>
    );
  };

  // Contribuinte + Endereço
  const c = templateInfo.contribuinte || {};
  const e = templateInfo.endereco || {};
  const contribItem = {
    resumo: `${c.nome || ""} · CPF ${fmtCPF(c.cpf)}`,
    nome: c.nome,
    cpf: fmtCPF(c.cpf),
    data_nascimento: fmtData8(c.data_nascimento),
    email: c.email,
    telefone: c.telefone,
    titulo_eleitor: c.titulo_eleitor,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    municipio: e.municipio,
    uf: e.uf,
    cep: fmtCEP(e.cep),
  };
  const statusContrib = patch?.contribuinte || patch?.endereco ? "alterado" : "neutro";

  // Bens — exibição mostra valores LITERAIS do template (saldos 31/12 dos 2 anos).
  // Se houver patch, adiciona linha extra "Valor 31/12/{ano-cal do template} (atualizado)"
  // — referente AO MESMO ano-cal, refletindo correção do informe (não projeção pra próximo ano).
  const anoCalTpl = parseInt(templateInfo.anoCalendario, 10);
  const labelAnoAnt = !isNaN(anoCalTpl) ? String(anoCalTpl - 1) : null;
  const labelAnoAtu = !isNaN(anoCalTpl) ? String(anoCalTpl) : null;
  const chaveAnt = labelAnoAnt ? `valor_31_12_${labelAnoAnt}` : "valor_anterior";
  const chaveAtu = labelAnoAtu ? `valor_31_12_${labelAnoAtu}` : "valor_atual";
  const chaveAtualizado = labelAnoAtu ? `valor_atualizado_31_12_${labelAnoAtu}` : "valor_atualizado";
  const chaveAntAtualizado = labelAnoAnt ? `valor_atualizado_31_12_${labelAnoAnt}` : "valor_anterior_atualizado";

  const bensCards = (templateInfo.bens || []).map((b, i) => {
    const { status, patchItem } = calcularStatusBem(i + 1, b, patch);
    const grupoLabel = b.grupo_receita
      ? `Grupo ${b.grupo_receita} · ${b.nome_grupo_receita} · Cód ${b.cod_tributario || b.grupo}`
      : `Cód ${b.grupo}/${b.codigo}`;
    const item = {
      resumo: `${grupoLabel} · ${(b.discriminacao || "").slice(0, 50)}`,
      grupo_receita: b.grupo_receita,
      nome_grupo_receita: b.nome_grupo_receita,
      cod_tributario: b.cod_tributario || b.grupo,
      grupo: b.grupo,
      codigo: b.codigo,
      discriminacao: b.discriminacao,
      [chaveAnt]: b.valor_anterior,
      [chaveAtu]: b.valor_atual,
    };
    if (patchItem && patchItem.valor_anterior != null) {
      item[chaveAntAtualizado] = patchItem.valor_anterior;
    }
    if (patchItem && patchItem.valor_atual != null) {
      item[chaveAtualizado] = patchItem.valor_atual;
    }
    // mescla outros campos do patchItem (mas NÃO valor_anterior/valor_atual, que já tratamos)
    if (patchItem) {
      for (const [k, v] of Object.entries(patchItem)) {
        if (["valor_anterior", "valor_atual", "idx"].includes(k)) continue;
        if (v != null && v !== "") item[k] = v;
      }
    }
    return <ItemCard key={`b${i}`} idx={i + 1} prefixo="B" getHeader={(x) => x.resumo} status={status} {...propsRemoverRevisar("bem", i + 1)} {...cardPropsAtualizado("bem", i + 1, status, item)} />;
  });
  const bensNovosCards = (patch?.bens_novos_aviso || []).map((b, i) => {
    // suporta tanto string legada quanto objeto novo
    if (typeof b === "string") {
      return <ItemCard key={`bn${i}`} idx={(templateInfo.bens?.length || 0) + i + 1} prefixo="B" getHeader={(x) => x.resumo} status="novo" {...cardPropsNovo("bem", i, { resumo: b })} />;
    }
    return <ItemCard key={`bn${i}`} idx={(templateInfo.bens?.length || 0) + i + 1} prefixo="B" getHeader={(x) => x.resumo || x.discriminacao} status="novo" {...cardPropsNovo("bem", i, b)} />;
  });

  // Dívidas — mesma lógica dos bens (literais + projetado se há patch)
  const dividasCards = (templateInfo.dividas || []).map((d, i) => {
    const { status, patchItem } = calcularStatusDivida(i + 1, d, patch);
    const item = {
      resumo: `Código ${d.codigo} · ${(d.discriminacao || "").slice(0, 60)}`,
      codigo: d.codigo,
      discriminacao: d.discriminacao,
      [chaveAnt]: d.valor_anterior,
      [chaveAtu]: d.valor_atual,
      valor_pago: d.valor_pago,
    };
    if (patchItem && patchItem.valor_anterior != null) {
      item[chaveAntAtualizado] = patchItem.valor_anterior;
    }
    if (patchItem && patchItem.valor_atual != null) {
      item[chaveAtualizado] = patchItem.valor_atual;
    }
    if (patchItem && patchItem.valor_pago != null) {
      item.valor_pago_atualizado = patchItem.valor_pago;
    }
    if (patchItem) {
      for (const [k, v] of Object.entries(patchItem)) {
        if (["valor_anterior", "valor_atual", "valor_pago", "idx"].includes(k)) continue;
        if (v != null && v !== "") item[k] = v;
      }
    }
    return <ItemCard key={`d${i}`} idx={i + 1} prefixo="V" getHeader={(x) => x.resumo} status={status} {...propsRemoverRevisar("divida", i + 1)} {...cardPropsAtualizado("divida", i + 1, status, item)} />;
  });
  const dividasNovasCards = (patch?.dividas_novas_aviso || []).map((d, i) => {
    if (typeof d === "string") return <ItemCard key={`dn${i}`} idx={(templateInfo.dividas?.length || 0) + i + 1} prefixo="V" getHeader={(x) => x.resumo} status="novo" {...cardPropsNovo("divida", i, { resumo: d })} />;
    return <ItemCard key={`dn${i}`} idx={(templateInfo.dividas?.length || 0) + i + 1} prefixo="V" getHeader={(x) => x.resumo || x.discriminacao} status="novo" {...cardPropsNovo("divida", i, d)} />;
  });

  // Fontes pagadoras
  const fontesCards = (templateInfo.fontes || []).map((f, i) => {
    const { status, patchItem } = calcularStatusFonte(f, patch);
    const item = mesclarItem({
      resumo: `${f.nome} · ${fmtCNPJ(f.cnpj)}`,
      cnpj: f.cnpj,
      nome: f.nome,
      rendimentos_tributaveis: patchItem?.rendimentos_tributaveis ?? f.rendimentos_tributaveis,
      decimo_terceiro: patchItem?.decimo_terceiro ?? f.decimo_terceiro,
      inss: patchItem?.inss ?? f.inss,
      ir_retido: patchItem?.ir_retido ?? f.ir_retido,
    }, patchItem);
    return <ItemCard key={`f${i}`} idx={i + 1} prefixo="F" getHeader={(x) => x.resumo} status={status} {...cardPropsAtualizado("fonte", i + 1, status, item)} />;
  });
  const fontesNovasCards = (patch?.fontes_novas || []).map((f, i) => (
    <ItemCard key={`fn${i}`} idx={(templateInfo.fontes?.length || 0) + i + 1} prefixo="F" getHeader={(x) => x.resumo || `${x.nome} · ${fmtCNPJ(x.cnpj)}`} status="novo" {...cardPropsNovo("fonte", i, f)} />
  ));

  // Dependentes
  const dependentesCards = (templateInfo.dependentes || []).map((d, i) => {
    const { status, patchItem } = calcularStatusDependente(i + 1, d, patch);
    const item = mesclarItem({
      resumo: `${d.nome} · ${d.parentesco_cod}`,
      nome: d.nome,
      cpf: fmtCPF(d.cpf),
      data_nascimento: fmtData8(d.data_nascimento),
      parentesco_cod: d.parentesco_cod,
    }, patchItem);
    return <ItemCard key={`dep${i}`} item={item} idx={i + 1} prefixo="D" getHeader={(x) => x.resumo} status={status} />;
  });
  const dependentesNovosCards = (patch?.dependentes_novos_aviso || []).map((d, i) => {
    if (typeof d === "string") return <ItemCard key={`depn${i}`} item={{ resumo: d }} idx={(templateInfo.dependentes?.length || 0) + i + 1} prefixo="D" getHeader={(x) => x.resumo} status="novo" />;
    return <ItemCard key={`depn${i}`} item={d} idx={(templateInfo.dependentes?.length || 0) + i + 1} prefixo="D" getHeader={(x) => x.resumo || x.nome} status="novo" />;
  });

  // Rendimentos isentos
  const isentosCards = (templateInfo.rendIsentos || []).map((r, i) => {
    const { status, patchItem } = calcularStatusRendIsento(i + 1, r, patch);
    const item = mesclarItem({
      resumo: `${(r.descricao || "").slice(0, 40)} · ${(r.nome_fonte || "").slice(0, 30)}`,
      cnpj_fonte: r.cnpj_fonte,
      nome_fonte: r.nome_fonte,
      descricao: r.descricao,
      valor_anterior: r.valor,
      valor: patchItem?.valor ?? r.valor,
    }, patchItem);
    return <ItemCard key={`ri${i}`} idx={i + 1} prefixo="RI" getHeader={(x) => x.resumo} status={status} {...propsRemoverRevisar("isento", i + 1)} {...cardPropsAtualizado("isento", i + 1, status, item)} />;
  });

  const pagamentosCards = (templateInfo.pagamentos || []).map((p, i) => {
    const { status, patchItem } = calcularStatusPagamento(i + 1, p, patch);
    const item = {
      resumo: `Cód ${p.codigo} · ${(p.nome || "").slice(0, 50)}`,
      codigo: p.codigo,
      cnpj_cpf: p.cnpj_cpf,
      nome: p.nome,
      valor_pago: p.valor_pago,
    };
    if (patchItem && patchItem.valor_pago != null) {
      item.valor_pago_atualizado = patchItem.valor_pago;
    }
    return <ItemCard key={`p${i}`} idx={i + 1} prefixo="P" getHeader={(x) => x.resumo} status={status} {...propsRemoverRevisar("pag", i + 1)} {...cardPropsAtualizado("pag", i + 1, status, item)} />;
  });
  const pagamentosNovosCards = (patch?.pagamentos_novos_aviso || []).map((p, i) => {
    if (typeof p === "string") return <ItemCard key={`pn${i}`} idx={(templateInfo.pagamentos?.length || 0) + i + 1} prefixo="P" getHeader={(x) => x.resumo} status="novo" {...cardPropsNovo("pag", i, { resumo: p })} />;
    return <ItemCard key={`pn${i}`} idx={(templateInfo.pagamentos?.length || 0) + i + 1} prefixo="P" getHeader={(x) => x.resumo || x.nome || `Cód ${x.codigo}`} status="novo" {...cardPropsNovo("pag", i, p)} />;
  });

  const rendExclusivosCards = (templateInfo.rendExclusivos || []).map((e, i) => {
    const { status, patchItem } = calcularStatusRendExclusivo(i + 1, e, patch);
    const item = {
      resumo: `Cód ${e.codigo} · ${(e.nome_fonte || "").slice(0, 50)}`,
      codigo: e.codigo,
      tipo_beneficiario: e.tipo_beneficiario,
      cnpj_fonte: e.cnpj_fonte,
      nome_fonte: e.nome_fonte,
      valor: e.valor,
    };
    if (patchItem && patchItem.valor != null) item.valor_atualizado = patchItem.valor;
    return <ItemCard key={`re${i}`} idx={i + 1} prefixo="E" getHeader={(x) => x.resumo} status={status} {...propsRemoverRevisar("excl", i + 1)} {...cardPropsAtualizado("excl", i + 1, status, item)} />;
  });
  const rendExclusivosNovosCards = (patch?.rendimentos_exclusivos_novos_aviso || []).map((e, i) => {
    if (typeof e === "string") return <ItemCard key={`ren${i}`} idx={(templateInfo.rendExclusivos?.length || 0) + i + 1} prefixo="E" getHeader={(x) => x.resumo} status="novo" {...cardPropsNovo("excl", i, { resumo: e })} />;
    return <ItemCard key={`ren${i}`} idx={(templateInfo.rendExclusivos?.length || 0) + i + 1} prefixo="E" getHeader={(x) => x.resumo || x.nome_fonte || `Cód ${x.codigo}`} status="novo" {...cardPropsNovo("excl", i, e)} />;
  });

  // Detecta se há algum item já zerado no template (precisa de revisão mesmo sem patch da IA)
  const temItemRevisar =
    (templateInfo.bens || []).some(b => Number(b.valor_atual) === 0) ||
    (templateInfo.dividas || []).some(d => Number(d.valor_atual) === 0) ||
    (templateInfo.pagamentos || []).some(p => Number(p.valor_pago) === 0);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 18, margin: 0 }}>
          Conteúdo do template
        </h3>
        {(patch || temItemRevisar) && (
          <div style={{ display: "flex", gap: 10, fontSize: 11, flexWrap: "wrap" }}>
            <Legenda cor={STATUS_CONFIG.neutro.borda} label="sem alteração" />
            {patch && <Legenda cor={STATUS_CONFIG.novo.borda} label="novo" />}
            {patch && <Legenda cor={STATUS_CONFIG.alterado.borda} label="alterado" />}
            {patch && <Legenda cor={STATUS_CONFIG.remover.borda} label="a remover" />}
            {temItemRevisar && <Legenda cor={STATUS_CONFIG.revisar.borda} label="revisar" />}
          </div>
        )}
      </div>

      <Bloco titulo="Contribuinte / Endereço" itens={[
        <ItemCard key="c" item={contribItem} getHeader={(x) => x.resumo} status={statusContrib} />
      ]} />

      {/* Ordem espelhada do PGD da Receita Federal: dependentes → rendimentos PJ → isentos → exclusivos → pagamentos → bens → dívidas */}
      <Bloco titulo="Dependentes" itens={[...dependentesCards, ...dependentesNovosCards]} vazio="Sem dependentes" />
      <Bloco titulo="Rendimentos tributáveis recebidos de PJ" itens={[...fontesCards, ...fontesNovasCards]} vazio="Nenhuma fonte pagadora no template" />
      <Bloco titulo="Rendimentos isentos e não tributáveis" itens={isentosCards} vazio="Sem rendimentos isentos no template" />
      <Bloco titulo="Rendimentos sujeitos à tributação exclusiva/definitiva" itens={[...rendExclusivosCards, ...rendExclusivosNovosCards]} vazio="Sem rendimentos exclusivos no template" />
      <Bloco titulo="Pagamentos efetuados" itens={[...pagamentosCards, ...pagamentosNovosCards]} vazio="Sem pagamentos no template" />
      <Bloco titulo="Bens e direitos" itens={[...bensCards, ...bensNovosCards]} vazio="Sem bens no template" />
      <Bloco titulo="Dívidas e ônus reais" itens={[...dividasCards, ...dividasNovasCards]} vazio="Sem dívidas no template" />
    </div>
  );
}

function Legenda({ cor, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: COR_SUTIL }}>
      <span style={{ display: "inline-block", width: 10, height: 10, background: cor, borderRadius: 2 }} />
      {label}
    </span>
  );
}

// Botão de copiar discreto — ícone pequeno, posição inline
// Cópia robusta com fallback. navigator.clipboard.writeText falha em iframes
// (caso do claudeusercontent.com), então caímos pra document.execCommand("copy")
// que ainda funciona universalmente apesar de "deprecated".
async function copiarTexto(texto) {
  const str = String(texto ?? "");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(str);
      return true;
    }
  } catch (e) { /* segue pro fallback */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, str.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

function BotaoCopiar({ texto, label = "Copiar", size = 11 }) {
  const [copiado, setCopiado] = useState(false);
  const handler = async (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    const ok = await copiarTexto(texto);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1200);
    } else {
      console.error("Falha ao copiar:", texto);
    }
  };
  return (
    <button
      type="button"
      onClick={handler}
      title={copiado ? "Copiado!" : label}
      style={{
        background: copiado ? "#e8f0e8" : "transparent",
        border: "1px solid",
        borderColor: copiado ? "#2d5a3d" : "#d4cfc1",
        borderRadius: 3,
        padding: "1px 5px",
        cursor: "pointer",
        fontSize: size - 1,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        color: copiado ? "#2d5a3d" : "#8a7f6e",
        lineHeight: 1,
        transition: "all 0.15s",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
      onMouseEnter={(e) => {
        if (!copiado) {
          e.currentTarget.style.borderColor = "#1a1612";
          e.currentTarget.style.color = "#1a1612";
        }
      }}
      onMouseLeave={(e) => {
        if (!copiado) {
          e.currentTarget.style.borderColor = "#d4cfc1";
          e.currentTarget.style.color = "#8a7f6e";
        }
      }}
    >
      {copiado ? "✓" : "⧉"}
    </button>
  );
}

// Campo editável: detecta automaticamente o tipo apropriado (texto / dinheiro / textarea)
// e renderiza o input correspondente. Usado dentro do modo de edição do ItemCard.
function EditableField({ campo, valor, onChange, autoFocus }) {
  const isMonetario = ehCampoMonetario(campo);
  const valorStr = valor == null ? "" : String(valor);
  // Heurística: textarea para campos de texto livre longos (discriminacao, observacoes)
  const isTextarea = !isMonetario && /discrimina|observa|categoria_desc|natureza/i.test(campo);
  const baseStyle = {
    fontSize: 12,
    padding: "4px 6px",
    border: `1px solid ${COR_BORDA}`,
    borderRadius: 3,
    background: "#fff",
    color: COR_TINTA,
    fontFamily: isMonetario ? "'IBM Plex Mono', monospace" : "inherit",
    width: "100%",
    boxSizing: "border-box",
  };
  if (isMonetario) {
    return (
      <input
        type="number"
        step="0.01"
        value={Number.isFinite(Number(valor)) ? Number(valor) : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        autoFocus={autoFocus}
        style={baseStyle}
      />
    );
  }
  if (isTextarea) {
    return (
      <textarea
        value={valorStr}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        rows={3}
        style={{ ...baseStyle, resize: "vertical", minHeight: 60 }}
      />
    );
  }
  return (
    <input
      type="text"
      value={valorStr}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      style={baseStyle}
    />
  );
}

function KV({ campo, valor, monetario, copiavel = true }) {
  if (valor == null || valor === "" || valor === 0 && monetario === false) return null;
  const isMon = monetario !== undefined ? monetario : ehCampoMonetario(campo);
  let display, valorBruto;
  if (isMon) { display = `R$ ${fmtBRL(valor)}`; valorBruto = fmtBRL(valor); }
  else if (typeof valor === "object") { display = JSON.stringify(valor); valorBruto = display; }
  else { display = String(valor); valorBruto = display; }
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.5, alignItems: "center" }}>
      <span style={{ color: "#6b6256", minWidth: 130, flexShrink: 0 }}>{labelLegivel(campo)}:</span>
      <span style={{ fontFamily: isMon ? "'IBM Plex Mono', monospace" : "inherit", color: "#1a1612" }}>{display}</span>
      {copiavel && <BotaoCopiar texto={valorBruto} label={`Copiar ${labelLegivel(campo)}`} />}
    </div>
  );
}

// Gera bloco de texto formatado a partir de um item — pra copiar tudo de uma vez
function formatarItemParaCopia(item, ignoreKeys = []) {
  const skip = new Set(["origem", "_idx", ...ignoreKeys]);
  const linhas = [];
  for (const [k, v] of Object.entries(item)) {
    if (skip.has(k) || v == null || v === "") continue;
    let display;
    if (ehCampoMonetario(k)) display = `R$ ${fmtBRL(v)}`;
    else if (typeof v === "object") display = JSON.stringify(v);
    else display = String(v);
    linhas.push(`${labelLegivel(k)}: ${display}`);
  }
  return linhas.join("\n");
}

// Mapeamento de status visual
const STATUS_CONFIG = {
  // cinza: item sem mudança (passivo, neutro)
  neutro:   { borda: COR_CINZA,    bg: "#fcfaf4",  badge: null,       badgeBg: null,         badgeFg: null },
  // verde: inclusão (item novo)
  novo:     { borda: COR_VERDE,    bg: "#eef4ef",  badge: "NOVO",     badgeBg: COR_VERDE,    badgeFg: "#fff" },
  // azul: alterado/sugerido (mudança esperada, fluxo normal — não é warning)
  alterado: { borda: COR_AZUL,     bg: "#eef2f6",  badge: "ALTERADO", badgeBg: COR_AZUL,     badgeFg: "#fff" },
  // laranja: removido (IA propõe remover ou zerar item ativo)
  remover:  { borda: COR_LARANJA,  bg: "#fceee0",  badge: "REMOVER",  badgeBg: COR_LARANJA,  badgeFg: "#fff" },
  // vermelho: caso não mapeado — saldo já zerado no template; contador decide
  revisar:  { borda: COR_VERMELHO, bg: "#f6e9e5",  badge: "REVISAR",  badgeBg: COR_VERMELHO, badgeFg: "#fff" },
};

// Card de um item da lista — mostra header + metadados + todos os outros campos
// Quando recebe `onSalvarEdicao`, o card ganha botão "Editar" que expande inline
// pra um form com todos os campos editáveis. Ao salvar, chama o callback com os
// novos valores. Quando `editado=true`, mostra badge âmbar "EDITADO" indicando
// que o contador sobrescreveu os valores propostos pela IA.
function ItemCard({ item, idx, prefixo, getHeader, ignoreKeys = [], color, status = "neutro", marcadoRemover, onMarcarRemover, onSalvarEdicao, editado }) {
  const skip = new Set(["origem", "_idx", ...ignoreKeys]);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.neutro;
  const corBorda = color || cfg.borda;
  const header = item.resumo || getHeader(item);
  const camposExtra = Object.entries(item).filter(
    ([k, v]) => !skip.has(k) && k !== "resumo" && v != null && v !== ""
  );
  const textoCompleto = formatarItemParaCopia(item, ignoreKeys);
  const mostrarCheckRemover = status === "revisar" && typeof onMarcarRemover === "function";
  const podeEditar = typeof onSalvarEdicao === "function";

  const [editando, setEditando] = useState(false);
  const [valoresEdicao, setValoresEdicao] = useState({});

  // Lista de campos do form de edição: todos os campos do item, exceto os ignorados,
  // mais "resumo" se existir (pra o contador poder editar o título do card).
  const camposEditaveis = Object.entries(item).filter(
    ([k]) => !skip.has(k) && k !== "resumo"
  );

  const iniciarEdicao = () => {
    const vals = {};
    for (const [k, v] of camposEditaveis) vals[k] = v;
    setValoresEdicao(vals);
    setEditando(true);
  };

  const cancelarEdicao = () => {
    setEditando(false);
    setValoresEdicao({});
  };

  const salvarEdicao = () => {
    // Normaliza: remove campos vazios pra não poluir o override
    const normalizado = {};
    for (const [k, v] of Object.entries(valoresEdicao)) {
      if (v == null || v === "") continue;
      normalizado[k] = v;
    }
    onSalvarEdicao(normalizado);
    setEditando(false);
    setValoresEdicao({});
  };

  return (
    <div style={{
      padding: "12px 14px",
      background: cfg.bg,
      borderLeft: `3px solid ${corBorda}`,
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1612", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {prefixo ? <span style={{ color: "#8a7f6e", fontWeight: 500 }}>{prefixo}{idx}</span> : null}
          <span>{header || "(sem descrição)"}</span>
          {cfg.badge && (
            <span style={{
              background: cfg.badgeBg,
              color: cfg.badgeFg,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.6,
              padding: "2px 6px",
              borderRadius: 2,
              textTransform: "uppercase",
            }}>{cfg.badge}</span>
          )}
          {editado && (
            <span style={{
              background: COR_AMBAR,
              color: "#fff",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.6,
              padding: "2px 6px",
              borderRadius: 2,
              textTransform: "uppercase",
            }}>Editado</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {podeEditar && !editando && (
            <button
              onClick={iniciarEdicao}
              title="Editar campos deste item"
              style={{
                border: `1px solid ${COR_BORDA}`,
                background: "transparent",
                color: COR_SUTIL,
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COR_TINTA; e.currentTarget.style.color = COR_TINTA; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = COR_BORDA; e.currentTarget.style.color = COR_SUTIL; }}
            >
              ✎ Editar
            </button>
          )}
          <BotaoCopiar texto={textoCompleto} label="Copiar item completo" size={12} />
        </div>
      </div>
      {item.origem && (
        <div style={{ fontSize: 11, color: "#8a7f6e", fontStyle: "italic", marginBottom: 6 }}>
          {item.origem}
        </div>
      )}

      {/* MODO EDIÇÃO — form inline substitui os KVs */}
      {editando ? (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COR_BORDA}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {camposEditaveis.map(([k, v]) => {
              // Campos textarea (discriminação) ocupam linha inteira
              const isTextarea = !ehCampoMonetario(k) && /discrimina|observa|categoria|natureza/i.test(k);
              return (
                <div key={k} style={isTextarea ? { gridColumn: "1 / -1" } : {}}>
                  <label style={{ display: "block", fontSize: 11, color: COR_SUTIL, marginBottom: 3 }}>
                    {labelLegivel(k)}
                  </label>
                  <EditableField
                    campo={k}
                    valor={valoresEdicao[k]}
                    onChange={(novo) => setValoresEdicao({ ...valoresEdicao, [k]: novo })}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button
              onClick={cancelarEdicao}
              style={{
                border: `1px solid ${COR_BORDA}`,
                background: "transparent",
                color: COR_SUTIL,
                fontSize: 12,
                padding: "5px 14px",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={salvarEdicao}
              style={{
                border: `1px solid ${corBorda}`,
                background: corBorda,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 14px",
                borderRadius: 3,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Salvar edição
            </button>
          </div>
        </div>
      ) : (
        // MODO LEITURA — exibe os KVs como antes
        camposExtra.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", marginTop: 6 }}>
            {camposExtra.map(([k, v]) => <KV key={k} campo={k} valor={v} />)}
          </div>
        )
      )}

      {mostrarCheckRemover && !editando && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${COR_BORDA}` }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, cursor: "pointer", color: COR_VERMELHO, fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={!!marcadoRemover}
              onChange={(e) => onMarcarRemover(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Marcar pra remover do .DBK e do PDF
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

// Error Boundary — captura erros de render e mostra mensagem em vez de tela branca
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    if (typeof console !== "undefined") {
      console.error("ErrorBoundary capturou:", error);
      console.error("Stack do componente:", info?.componentStack);
    }
  }
  reset = () => this.setState({ error: null, info: null });
  render() {
    if (this.state.error) {
      const e = this.state.error;
      const stack = this.state.info?.componentStack || "";
      const detalhes = `${e.name || "Error"}: ${e.message || String(e)}\n\nStack:\n${e.stack || "(sem stack)"}\n\nComponentStack:\n${stack}`;
      return (
        <div style={{ padding: 24, maxWidth: 900, margin: "40px auto", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
          <div style={{ padding: 20, background: "#fbeae6", border: "2px solid #8b2c1a", borderRadius: 4 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, color: "#8b2c1a", margin: "0 0 12px" }}>
              Erro no estúdio
            </h2>
            <div style={{ fontSize: 14, color: "#1a1612", marginBottom: 12, lineHeight: 1.6 }}>
              Algo deu errado durante a renderização. Os dados que você carregou estão salvos no estado da aplicação,
              mas algum trecho do código tentou acessar uma propriedade inexistente ou rodou em condição não prevista.
            </div>
            <div style={{ background: "#fff", padding: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8b2c1a", marginBottom: 12, whiteSpace: "pre-wrap", maxHeight: 300, overflow: "auto", border: "1px solid #d4cfc1" }}>
              {detalhes}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={this.reset}
                style={{ background: "transparent", color: "#1a1612", border: "1px solid #1a1612", padding: "8px 14px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer", fontWeight: 500 }}
              >
                Tentar continuar
              </button>
              <button
                onClick={() => { copiarTexto(detalhes); }}
                style={{ background: "transparent", color: "#8b2c1a", border: "1px solid #8b2c1a", padding: "8px 14px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer", fontWeight: 500 }}
              >
                Copiar erro pra reportar
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: "transparent", color: "#6b6256", border: "1px solid #d4cfc1", padding: "8px 14px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer", fontWeight: 500 }}
              >
                Recarregar página
              </button>
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "#6b6256" }}>
              Detalhes técnicos completos foram impressos no console (F12).
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Modal de IA — fluxo copy/paste com IA web (sem API).
// Mostra prompt pronto pra copiar, lista de arquivos pra anexar manualmente no chat,
// e textarea pra colar a resposta JSON. Tem toggle entre "modo agente" (prompt curto,
// agente já tem regras) e "modo completo" (prompt longo, qualquer chat).
function ModalIA({ prompt, arquivos, modoAgente, modoAgenteIA, onChangeModoAgente, resposta, onChangeResposta, onAplicar, onCancelar }) {
  const [copiou, setCopiou] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancelar]);

  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiou(true);
      setTimeout(() => setCopiou(false), 2500);
    } catch (e) {
      // Fallback antigo
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopiou(true); setTimeout(() => setCopiou(false), 2500); } catch (_) {}
      document.body.removeChild(ta);
    }
  };

  const btnPrimario = {
    background: COR_VERDE, color: "white", border: "none", padding: "10px 18px",
    fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
    letterSpacing: 0.3, cursor: "pointer", textTransform: "uppercase",
  };
  const btnSecundario = {
    background: "transparent", color: COR_SUTIL, border: `1px solid ${COR_BORDA}`,
    padding: "10px 18px", fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: 500, letterSpacing: 0.3, cursor: "pointer", textTransform: "uppercase",
  };

  // Estilo do toggle de modo
  const tabStyle = (ativo) => ({
    flex: 1,
    padding: "8px 12px",
    border: `1px solid ${ativo ? COR_VERDE : COR_BORDA}`,
    background: ativo ? COR_VERDE : "transparent",
    color: ativo ? "white" : COR_TINTA,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontWeight: ativo ? 500 : 400,
    letterSpacing: 0.3,
    textAlign: "left",
  });

  return (
    <div
      onClick={onCancelar}
      style={{
        position: "fixed", inset: 0, background: "rgba(26, 22, 18, 0.6)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COR_PAPEL, maxWidth: 880, width: "100%", maxHeight: "92vh",
          overflowY: "auto", padding: "28px 32px", border: `1px solid ${COR_BORDA}`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)", fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, letterSpacing: -0.5, margin: 0 }}>
              Processar com IA externa
            </h2>
            <p style={{ fontSize: 13, color: COR_SUTIL, margin: "6px 0 0", lineHeight: 1.5 }}>
              Cole o prompt no chat da sua IA, anexe os arquivos listados, e cole a resposta JSON aqui.
            </p>
          </div>
          <button onClick={onCancelar} aria-label="Cancelar"
            style={{ background: "none", border: "none", fontSize: 22, color: COR_SUTIL, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Toggle de modo */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, color: COR_SUTIL, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Modo de envio
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onChangeModoAgente(true)} style={tabStyle(modoAgente)}>
              <div style={{ fontWeight: 500 }}>Agente pré-configurado</div>
              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>Prompt curto · IA já tem as regras</div>
            </button>
            <button onClick={() => onChangeModoAgente(false)} style={tabStyle(!modoAgente)}>
              <div style={{ fontWeight: 500 }}>Prompt completo</div>
              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>Inclui regras inline · qualquer chat</div>
            </button>
          </div>
          {modoAgente && (
            <p style={{ fontSize: 11.5, color: COR_SUTIL, margin: "8px 0 0", lineHeight: 1.5, padding: "8px 10px", background: "#fafafa", border: `1px solid ${COR_BORDA}` }}>
              <strong>Modo agente:</strong> use no Claude Projects, Gemini Gems, ChatGPT Custom GPT ou outro agente onde você já carregou as instruções e knowledge files. Veja o guia <code>COMO_CRIAR_AGENTE.md</code>.
            </p>
          )}
        </div>

        {/* Passo 1: prompt */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: 0 }}>
              1 · Copie o prompt e cole no chat da IA
              <span style={{ fontSize: 11, color: COR_SUTIL, marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                ({prompt.length.toLocaleString("pt-BR")} chars)
              </span>
            </h3>
            <button onClick={copiarPrompt}
              style={{
                background: copiou ? COR_VERDE : "transparent",
                color: copiou ? "white" : COR_TINTA,
                border: `1px solid ${copiou ? COR_VERDE : COR_BORDA}`,
                padding: "5px 12px", fontSize: 12, cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: 0.3,
              }}
            >
              {copiou ? "✓ Copiado" : "Copiar prompt"}
            </button>
          </div>
          <textarea
            readOnly value={prompt}
            style={{
              width: "100%", height: 140, fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, padding: 10, background: "#fafafa",
              border: `1px solid ${COR_BORDA}`, color: COR_TINTA, resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Passo 2: arquivos */}
        <div style={{ marginBottom: 22 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 8px" }}>
            2 · Anexe os documentos do cliente no chat da IA
          </h3>
          <p style={{ fontSize: 12.5, color: COR_TINTA, margin: "0 0 8px", lineHeight: 1.55 }}>
            Anexe diretamente no chat <strong>todos os informes, recibos e demais documentos</strong> do cliente: bancos, empregadores, corretoras, NFS-e, recibos de PF, etc. PDFs e imagens funcionam.
          </p>
          {arquivos.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: COR_SUTIL, margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Documento{arquivos.length > 1 ? "s" : ""} específico{arquivos.length > 1 ? "s" : ""} pra anexar
              </p>
              <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13, lineHeight: 1.7, color: COR_TINTA }}>
                {arquivos.map((a, i) => (
                  <li key={i}>
                    <strong>{a.nome}</strong>
                    <span style={{ color: COR_SUTIL, fontSize: 11.5 }}> · {a.descricao}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        {/* Passo 3: resposta */}
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 8px" }}>
            3 · Cole a resposta JSON da IA
          </h3>
          <textarea
            value={resposta}
            onChange={(e) => onChangeResposta(e.target.value)}
            placeholder='{ "bens_atualizados": [...], "dividas_atualizadas": [...] }'
            style={{
              width: "100%", height: 180, fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, padding: 10, background: "#fafafa",
              border: `1px solid ${COR_BORDA}`, color: COR_TINTA, resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <p style={{ fontSize: 11.5, color: COR_SUTIL, margin: "6px 0 0", lineHeight: 1.5 }}>
            A IA pode envolver o JSON em <code>```json ... ```</code> — o estúdio remove automaticamente.
          </p>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onCancelar} style={btnSecundario}>Cancelar</button>
          <button onClick={onAplicar} style={btnPrimario} disabled={!resposta.trim()}>
            Aplicar resposta
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal do Inspetor: exibe o relatório markdown do mapeamento de registros do .DBK.
// Conteúdo é renderizado como texto monospace dentro de um <pre> (não interpretamos markdown —
// o relatório foi feito pra colar no Claude, não pra renderização visual rica).
function InspecaoModal({ relatorio, onFechar }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await copiarTexto(relatorio);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,30,30,0.55)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      zIndex: 1000, padding: "32px 20px", overflowY: "auto",
    }}
      onClick={onFechar}>
      <div style={{
        background: "white", maxWidth: 900, width: "100%",
        border: `1px solid ${COR_BORDA}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "16px 22px", borderBottom: `1px solid ${COR_BORDA}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 18, margin: 0 }}>
              Inspeção do .DBK
            </h2>
            <div style={{ fontSize: 11.5, color: COR_SUTIL, marginTop: 2 }}>
              Mapa de registros + dumps. Pronto pra colar no Claude pra investigar um registro novo.
            </div>
          </div>
          <button onClick={onFechar} style={{
            background: "transparent", border: "none", fontSize: 22, cursor: "pointer",
            color: COR_SUTIL, padding: "0 6px",
          }} title="Fechar (Esc)">×</button>
        </div>

        {/* Corpo: relatório em monospace */}
        <div style={{ padding: "0 22px", maxHeight: "65vh", overflowY: "auto" }}>
          <pre style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, lineHeight: 1.55,
            margin: "16px 0", padding: "14px 16px",
            background: "#f6f4ef", border: `1px solid ${COR_BORDA}`,
            whiteSpace: "pre", overflowX: "auto",
            color: COR_TINTA,
          }}>{relatorio}</pre>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 22px", borderTop: `1px solid ${COR_BORDA}`,
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button onClick={copiar} style={{
            background: copiado ? COR_VERDE : COR_TINTA, color: "white",
            border: "none", padding: "8px 18px", fontSize: 12,
            letterSpacing: 0.5, textTransform: "uppercase",
            cursor: "pointer", fontWeight: 500,
          }}>
            {copiado ? "✓ Copiado" : "Copiar relatório"}
          </button>
          <button onClick={onFechar} style={{
            background: "transparent", color: COR_TINTA,
            border: `1px solid ${COR_BORDA}`, padding: "8px 18px", fontSize: 12,
            letterSpacing: 0.5, textTransform: "uppercase",
            cursor: "pointer", fontWeight: 500,
          }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de Ajuda — referência rápida dos 5 slots e fluxo. Conteúdo enxuto (opção B).
function ModalAjuda({ onClose }) {
  // Fecha com ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sec = { marginBottom: 18 };
  const h = { fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 16, margin: "0 0 8px", color: COR_TINTA };
  const p = { fontSize: 13, lineHeight: 1.55, color: COR_TINTA, margin: "0 0 6px" };
  const slot = { fontSize: 12.5, lineHeight: 1.5, color: COR_TINTA, padding: "4px 0", borderBottom: `1px solid ${COR_BORDA}` };
  const rotulo = { fontWeight: 600, color: COR_VERDE };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(26, 22, 18, 0.55)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COR_PAPEL, maxWidth: 620, width: "100%", maxHeight: "85vh",
          overflowY: "auto", padding: "28px 32px", border: `1px solid ${COR_BORDA}`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)", fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>
            Estúdio do Cliente — Referência rápida
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none", border: "none", fontSize: 22, color: COR_SUTIL,
              cursor: "pointer", padding: 4, lineHeight: 1,
            }}
          >✕</button>
        </div>

        <div style={sec}>
          <h3 style={h}>1 · Arquivos (4 slots)</h3>
          <div style={slot}><span style={rotulo}>Template .DBK</span> — backup do PGD do ano anterior (a pré-preenchida vem nesse formato). Obrigatório pra gerar .DBK atualizado.</div>
          <div style={slot}><span style={rotulo}>Declaração anterior (PDF)</span> — texto extraído localmente e embutido no prompt. Não precisa reanexar no chat da IA.</div>
          <div style={slot}><span style={rotulo}>Recibo</span> — .REC (parse local extrai nº do recibo) ou PDF (texto extraído). Útil pra retificadora.</div>
          <div style={{ ...slot, borderBottom: "none" }}><span style={rotulo}>Formulário complementar</span> — preenchido pelo cliente. Anexe no chat da IA — tem prioridade sobre os informes em caso de divergência.</div>
          <p style={{ ...p, marginTop: 10, fontStyle: "italic" }}>Os <strong>informes de rendimento do cliente</strong> (bancos, empregadores, corretoras, recibos de PF) são anexados diretamente no chat da IA, não aqui.</p>
        </div>

        <div style={sec}>
          <h3 style={h}>2 · Processar</h3>
          <p style={p}>Botão libera com template OU pelo menos um PDF. Com template: gera patch (atualizações no .DBK) + PDF. Sem template: só PDF de consolidação.</p>
        </div>

        <div style={sec}>
          <h3 style={h}>3 · Revisar — sistema de cores</h3>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12.5, alignItems: "center" }}>
            <span style={{ width: 12, height: 12, background: COR_CINZA, display: "inline-block" }}></span>
            <span><strong>Cinza</strong> — sem alteração</span>
            <span style={{ width: 12, height: 12, background: COR_VERDE, display: "inline-block" }}></span>
            <span><strong>Verde &quot;NOVO&quot;</strong> — inclusão (item novo, detectado em informe)</span>
            <span style={{ width: 12, height: 12, background: COR_AZUL, display: "inline-block" }}></span>
            <span><strong>Azul &quot;ALTERADO&quot;</strong> — valor sugerido pela IA; revise se confere com o informe</span>
            <span style={{ width: 12, height: 12, background: COR_LARANJA, display: "inline-block" }}></span>
            <span><strong>Laranja &quot;REMOVER&quot;</strong> — IA propõe remover ou zerar item ativo</span>
            <span style={{ width: 12, height: 12, background: COR_VERMELHO, display: "inline-block" }}></span>
            <span><strong>Vermelho &quot;REVISAR&quot;</strong> — saldo já zerado no template; caso não mapeado, decisão manual (alienação, quitação ou lixo)</span>
          </div>
        </div>

        <div style={sec}>
          <h3 style={h}>4 · Exportar</h3>
          <p style={p}>Botões finais geram <strong>.DBK pronto pra restaurar no PGD</strong> (menu &quot;Restaurar de cópia de segurança&quot;) e <strong>PDF no formato pré-preenchida</strong> da Receita.</p>
        </div>

        <div style={{ ...sec, marginBottom: 0, padding: "12px 14px", background: "#f5f1e8", borderLeft: `3px solid ${COR_AMBAR}` }}>
          <h3 style={{ ...h, fontSize: 14 }}>Compatibilidade entre PGDs</h3>
          <p style={{ ...p, margin: 0 }}>
            Template gerado pelo PGD 2025 (ano-cal 2024) precisa ser <strong>reimportado no PGD 2026 primeiro</strong> — abra o programa, &quot;Importar declaração ano anterior&quot;, salve, e use ESSE arquivo aqui. Sem isso, a estrutura binária difere e o estúdio rejeita.
          </p>
        </div>
      </div>
    </div>
  );
}

function EstudioIRPFInner() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = FONT_LINK;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  const [template, setTemplate] = useState(null);
  const [declAnterior, setDeclAnterior] = useState(null);
  const [recibo, setRecibo] = useState(null);
  const [formularioPreenchido, setFormularioPreenchido] = useState(null);

  const [templateInfo, setTemplateInfo] = useState(null);
  const [templateErro, setTemplateErro] = useState(null);
  const [reciboInfo, setReciboInfo] = useState(null);
  const [declAnteriorTexto, setDeclAnteriorTexto] = useState("");
  const [reciboPdfTexto, setReciboPdfTexto] = useState("");
  const [extraindo, setExtraindo] = useState({ decl: false, recibo: false });
  const [arquivosProtegidos, setArquivosProtegidos] = useState([]);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState(null);
  const [errorContext, setErrorContext] = useState(null); // { protegido: nome } pra UI especial
  const [rawResponse, setRawResponse] = useState(null);
  const [patch, setPatch] = useState(null);
  const [dadosExtraidos, setDadosExtraidos] = useState(null); // modo sem template
  const [aprovacoes, setAprovacoes] = useState({});
  // Edições manuais do contador sobre itens propostos pela IA (Fase 1).
  // Chave: `${categoria}_${chave}` (ex: "bem_atualizado_3", "bem_novo_0", "fonte_atualizada_52318822000119")
  // Valor: subset dos campos do item, contendo só o que o contador sobrescreveu.
  const [manualOverrides, setManualOverrides] = useState({});
  const [showAjuda, setShowAjuda] = useState(false);

  // === Fluxo copy/paste com IA web (sem API) ===
  // iaModal guarda o prompt completo + lista de arquivos pra anexar manualmente no chat da IA.
  // Quando o usuário cola a resposta JSON e clica "Aplicar", a Promise dentro de processar() resolve.
  const [iaModal, setIaModal] = useState(null); // { prompt, arquivos: [{nome, descricao}] } | null
  const [inspecaoModal, setInspecaoModal] = useState(null); // string com relatório markdown | null
  const [iaResposta, setIaResposta] = useState("");
  const iaResolveRef = useRef(null);
  // Modo agente: se true, prompt é curto (só resumo) — pressupõe IA com agente pré-configurado
  // (Claude Project, Gemini Gem, Custom GPT). Se false, prompt longo com todas as regras inline.
  const [modoAgenteIA, setModoAgenteIA] = useState(() => {
    try { return localStorage.getItem("estudio.modoAgente") !== "false"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("estudio.modoAgente", String(modoAgenteIA)); } catch {}
  }, [modoAgenteIA]);

  // Ler template DBK imediatamente ao selecionar
  useEffect(() => {
    if (!template) { setTemplateInfo(null); setTemplateErro(null); return; }
    (async () => {
      try {
        const conteudo = await bytesToLatin1(template);
        const info = lerTemplateInfo(conteudo);
        if (!info.contribuinte) throw new Error("Não consegui localizar o registro 16 (contribuinte) no arquivo. Confirme que é um .DBK válido do PGD.");
        setTemplateInfo(info);
        setTemplateErro(null);
      } catch (e) {
        setTemplateErro(e.message);
        setTemplateInfo(null);
      }
    })();
  }, [template]);

  // Ler .REC OU extrair texto do PDF do recibo
  useEffect(() => {
    if (!recibo) { setReciboInfo(null); setReciboPdfTexto(""); return; }
    const ext = recibo.name.toLowerCase();
    if (ext.endsWith(".rec")) {
      parseRec(recibo).then(setReciboInfo).catch((e) => setReciboInfo({ erro: e.message }));
      setReciboPdfTexto("");
    } else if (ext.endsWith(".pdf")) {
      setReciboInfo(null);
      let cancelado = false;
      setExtraindo((s) => ({ ...s, recibo: true }));
      extrairTextoPDF(recibo).then((txt) => {
        if (!cancelado) {
          setReciboPdfTexto(txt);
          setExtraindo((s) => ({ ...s, recibo: false }));
        }
      });
      return () => { cancelado = true; };
    } else {
      setReciboInfo(null);
      setReciboPdfTexto("");
    }
  }, [recibo]);

  // Extrair texto da declaração anterior (PDF)
  useEffect(() => {
    if (!declAnterior) { setDeclAnteriorTexto(""); return; }
    let cancelado = false;
    setExtraindo((s) => ({ ...s, decl: true }));
    extrairTextoPDF(declAnterior).then((txt) => {
      if (!cancelado) {
        setDeclAnteriorTexto(txt);
        setExtraindo((s) => ({ ...s, decl: false }));
      }
    });
    return () => { cancelado = true; };
  }, [declAnterior]);

  // Detectar PDFs protegidos
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const pdfs = [];
      if (declAnterior) pdfs.push(declAnterior);
      if (recibo?.name.toLowerCase().endsWith(".pdf")) pdfs.push(recibo);
      if (formularioPreenchido) pdfs.push(formularioPreenchido);
      const protegidos = [];
      for (const f of pdfs) if (await detectarPdfProtegido(f)) protegidos.push(f.name);
      if (!cancelado) setArquivosProtegidos(protegidos);
    })();
    return () => { cancelado = true; };
  }, [declAnterior, recibo, formularioPreenchido]);

  function reset() {
    setError(null); setErrorContext(null); setRawResponse(null); setStatusMsg("");
  }

  async function processar() {
    reset();

    const temPDFs = declAnterior || (recibo?.name.toLowerCase().endsWith(".pdf")) || formularioPreenchido;

    // Precisa: template OU pelo menos 1 PDF
    if (!template && !temPDFs) {
      setError("Anexe ao menos um template .DBK ou um PDF (declaração anterior, recibo ou formulário complementar).");
      return;
    }
    if (template && !templateInfo) {
      setError("Template anexado mas não foi possível ler. Verifique o arquivo.");
      return;
    }
    if (extraindo.decl || extraindo.recibo) {
      setError("Aguarde a extração de texto dos PDFs terminar antes de processar.");
      return;
    }

    const modoComTemplate = !!templateInfo;
    setPatch(null);
    setDadosExtraidos(null);

    setProcessing(true);
    const trackContent = [];
    try {
      setStatusMsg("Lendo arquivos...");
      // No fluxo standalone (sem API) os arquivos NÃO são enviados pra IA pelo Estúdio.
      // O texto da declaração anterior e do recibo (PDF) já vem embutido no prompt.
      // O formulário complementar continua sendo anexado manualmente pelo contador no chat da IA.
      const arquivosLista = [];
      const addArquivo = (file, descricao) => {
        arquivosLista.push({ nome: file.name, descricao });
        trackContent.push({ file, descricao });
      };
      if (formularioPreenchido) {
        addArquivo(formularioPreenchido, "FORMULÁRIO COMPLEMENTAR PREENCHIDO MANUALMENTE — FONTE AUTORITATIVA: quando houver divergência com outros documentos, este prevalece");
      }

      const prompt = modoComTemplate
        ? montarPromptPatch(templateInfo, reciboInfo, !!formularioPreenchido, modoAgenteIA, declAnteriorTexto, reciboPdfTexto)
        : montarPromptExtracao(reciboInfo, !!formularioPreenchido, declAnteriorTexto, reciboPdfTexto);

      // Abre o modal e aguarda o usuário colar a resposta JSON da IA
      setStatusMsg("Aguardando resposta da IA externa...");
      setIaModal({ prompt, arquivos: arquivosLista, modoAgente: modoAgenteIA });
      const fullText = await new Promise((resolve, reject) => {
        iaResolveRef.current = { resolve, reject };
      });
      setIaModal(null);
      setIaResposta("");
      setRawResponse(fullText);

      let jsonStr = fullText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim();
      const i1 = jsonStr.indexOf("{");
      const i2 = jsonStr.lastIndexOf("}");
      if (i1 >= 0 && i2 > i1) jsonStr = jsonStr.substring(i1, i2 + 1);

      let parsed;
      try { parsed = JSON.parse(jsonStr); } catch (e) { throw new Error(`Resposta não é JSON válido: ${e.message}`); }

      if (modoComTemplate) {
        // === Sanitizar valores negativos ===
        // IRPF não aceita valor negativo em bem/dívida/fonte/rendimento — o PGD rejeita o .DBK
        // se houver sinal "-" no campo de largura fixa. Saldo negativo de conta corrente é DÍVIDA,
        // não bem com valor negativo. Aqui clampamos qualquer negativo em 0 e logamos no console.
        const camposNumericosPorTipo = {
          bens_atualizados: ["valor_atual", "valor_anterior"],
          bens_novos_aviso: ["valor_atual", "valor_anterior"],
          dividas_atualizadas: ["valor_atual", "valor_anterior", "valor_pago"],
          dividas_novas_aviso: ["valor_atual", "valor_anterior", "valor_pago"],
          rendimentos_isentos_atualizados: ["valor"],
          rendimentos_exclusivos_atualizados: ["valor"],
          rendimentos_exclusivos_novos_aviso: ["valor"],
          fontes_pagadoras: ["rendimentos_tributaveis", "decimo_terceiro", "inss", "ir_retido"],
          fontes_novas: ["rendimentos_tributaveis", "decimo_terceiro", "inss", "ir_retido"],
          rendimentos_pf_carne_leao: ["valor_total_ano"],
          pagamentos_atualizados: ["valor_pago"],
          pagamentos_novos_aviso: ["valor_pago"],
        };
        const negativosDescartados = [];
        for (const [tipo, campos] of Object.entries(camposNumericosPorTipo)) {
          if (!Array.isArray(parsed[tipo])) continue;
          parsed[tipo].forEach((item, idx) => {
            for (const k of campos) {
              if (item[k] != null && Number(item[k]) < 0) {
                negativosDescartados.push(`${tipo}[${idx}].${k}=${item[k]}`);
                item[k] = 0;
              }
            }
          });
        }
        if (negativosDescartados.length) {
          console.warn("Valores negativos sanitizados (saldo negativo deveria ser dívida, não bem negativo):", negativosDescartados);
        }

        // === Filtrar no-ops do patch antes de processar ===
        // A IA às vezes "confirma" valores idênticos aos do template (lê informe BB
        // que diz "saldo R$ 0,14" pra um item que já está com R$ 0,14 no template).
        // Esses casos não têm o que aprovar/reprovar — viram ruído na UI. Filtramos
        // silenciosamente. Tolerância de 1 centavo cobre arredondamentos.
        const semMudancaNum = (a, b) => Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.005;
        const semMudancaTxt = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();

        if (parsed.bens_atualizados) {
          parsed.bens_atualizados = parsed.bens_atualizados.filter((b) => {
            const tpl = templateInfo.bens?.[b.idx - 1];
            if (!tpl) return true; // idx fora — preserva pra debug
            // mantém se valor_atual OU valor_anterior diferir do template
            const mudouAtual = b.valor_atual != null && !semMudancaNum(b.valor_atual, tpl.valor_atual);
            const mudouAnterior = b.valor_anterior != null && !semMudancaNum(b.valor_anterior, tpl.valor_anterior);
            return mudouAtual || mudouAnterior;
          });
        }
        if (parsed.dividas_atualizadas) {
          parsed.dividas_atualizadas = parsed.dividas_atualizadas.filter((d) => {
            const tpl = templateInfo.dividas?.[d.idx - 1];
            if (!tpl) return true;
            const mudouAtual = d.valor_atual != null && !semMudancaNum(d.valor_atual, tpl.valor_atual);
            const mudouAnterior = d.valor_anterior != null && !semMudancaNum(d.valor_anterior, tpl.valor_anterior);
            const mudouPago = d.valor_pago != null && !semMudancaNum(d.valor_pago, tpl.valor_pago);
            return mudouAtual || mudouAnterior || mudouPago;
          });
        }
        if (parsed.rendimentos_isentos_atualizados) {
          parsed.rendimentos_isentos_atualizados = parsed.rendimentos_isentos_atualizados.filter((r) => {
            const tpl = templateInfo.rendIsentos?.[r.idx - 1];
            if (!tpl) return true;
            return !semMudancaNum(r.valor, tpl.valor);
          });
        }
        if (parsed.pagamentos_atualizados) {
          parsed.pagamentos_atualizados = parsed.pagamentos_atualizados.filter((p) => {
            const tpl = templateInfo.pagamentos?.[p.idx - 1];
            if (!tpl) return true;
            return p.valor_pago != null && !semMudancaNum(p.valor_pago, tpl.valor_pago);
          });
        }
        if (parsed.rendimentos_exclusivos_atualizados) {
          parsed.rendimentos_exclusivos_atualizados = parsed.rendimentos_exclusivos_atualizados.filter((e) => {
            const tpl = templateInfo.rendExclusivos?.[e.idx - 1];
            if (!tpl) return true;
            return e.valor != null && !semMudancaNum(e.valor, tpl.valor);
          });
        }
        if (parsed.fontes_pagadoras) {
          parsed.fontes_pagadoras = parsed.fontes_pagadoras.filter((f) => {
            const cnpjF = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
            const tpl = (templateInfo.fontes || []).find((x) =>
              String(x.cnpj || "").replace(/\D/g, "").padStart(14, "0") === cnpjF);
            if (!tpl) return true;
            // mantém se QUALQUER um dos 4 campos numéricos mudou
            return ["rendimentos_tributaveis", "decimo_terceiro", "inss", "ir_retido"].some(
              (k) => !semMudancaNum(f[k], tpl[k])
            );
          });
        }
        if (parsed.dependentes_atualizados) {
          parsed.dependentes_atualizados = parsed.dependentes_atualizados.filter((d) => {
            const tpl = templateInfo.dependentes?.[d.idx - 1];
            if (!tpl) return true;
            // mantém se algum campo não-nulo do patch diferir do template
            return Object.entries(d).some(([k, v]) => {
              if (k === "idx" || v == null || v === "") return false;
              return !semMudancaTxt(v, tpl[k]);
            });
          });
        }

        // Inicializar aprovações: tudo aprovado por padrão (atualizações, novos e a remover)
        const apr = {};
        if (parsed.contribuinte || parsed.endereco) apr["contrib"] = true;
        for (const f of parsed.fontes_pagadoras || []) {
          const k = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
          apr[`fonte_${k}`] = true;
        }
        // Fontes novas usam ÍNDICE (não CNPJ) pra evitar colisão quando CNPJ vem vazio (caso PF antes do fix do schema, ou IA esquecer CNPJ)
        for (let i = 0; i < (parsed.fontes_novas || []).length; i++) apr[`fonte_nova_${i}`] = true;
        // Rendimentos PF (Carnê-Leão) — nova ficha, índice posicional
        for (let i = 0; i < (parsed.rendimentos_pf_carne_leao || []).length; i++) apr[`pf_${i}`] = true;
        for (const b of parsed.bens_atualizados || []) apr[`bem_${b.idx}`] = true;
        for (let i = 0; i < (parsed.bens_novos_aviso || []).length; i++) apr[`bem_novo_${i}`] = true;
        for (const b of parsed.bens_a_remover || []) apr[`bem_remover_${b.idx}`] = true;
        for (const d of parsed.dividas_atualizadas || []) apr[`divida_${d.idx}`] = true;
        for (let i = 0; i < (parsed.dividas_novas_aviso || []).length; i++) apr[`divida_nova_${i}`] = true;
        for (const d of parsed.dividas_a_remover || []) apr[`divida_remover_${d.idx}`] = true;
        for (const d of parsed.dependentes_atualizados || []) apr[`dep_${d.idx}`] = true;
        for (let i = 0; i < (parsed.dependentes_novos_aviso || []).length; i++) apr[`dep_novo_${i}`] = true;
        for (const d of parsed.dependentes_a_remover || []) apr[`dep_remover_${d.idx}`] = true;
        for (const r of parsed.rendimentos_isentos_atualizados || []) apr[`isento_${r.idx}`] = true;
        setPatch(parsed);
        setAprovacoes(apr);
      } else {
        setDadosExtraidos(parsed);
      }
      setStatusMsg("");
    } catch (e) {
      setError(e.message || String(e));
      setStatusMsg("");
    } finally {
      setProcessing(false);
    }
  }

  function aplicarRespostaIA() {
    if (!iaResposta.trim()) {
      setError("Cole a resposta JSON da IA antes de aplicar.");
      return;
    }
    iaResolveRef.current?.resolve(iaResposta);
    iaResolveRef.current = null;
  }

  function cancelarIA() {
    iaResolveRef.current?.reject(new Error("Cancelado pelo usuário."));
    iaResolveRef.current = null;
    setIaModal(null);
    setIaResposta("");
  }

  function removerProtegido(nome) {
    if (declAnterior?.name === nome) setDeclAnterior(null);
    if (recibo?.name === nome) setRecibo(null);
    if (formularioPreenchido?.name === nome) setFormularioPreenchido(null);
    setError(null); setErrorContext(null);
  }

  function downloadBlob(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function baixarDbk() {
    try {
      const { conteudo, aplicadas } = aplicarPatch(templateInfo, patch, aprovacoes, manualOverrides);
      const bytes = encodeLatin1(conteudo);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const cpf = (templateInfo.contribuinte?.cpf || "00000000000").replace(/\D/g, "").padStart(11, "0");
      const anoDecl = templateInfo.anoDeclaracao || "0000";
      const anoCal = templateInfo.anoCalendario || "0000";
      // Padrão do PGD para backup: CPF-IRPF-A-{anoDecl}-{anoCal}-ORIGI.DBK
      // Mantém ORIGI pra sobrescrever o backup original (decisão do usuário).
      const filename = `${cpf}-IRPF-A-${anoDecl}-${anoCal}-ORIGI.DBK`;
      downloadBlob(blob, filename);
      setStatusMsg(`${aplicadas.length} alteração(ões) aplicada(s) · arquivo ${filename}`);
    } catch (e) {
      setError(`Falha ao gerar .DBK: ${e.message}`);
    }
  }

  function baixarPatch() {
    const blob = new Blob([JSON.stringify({ patch, aprovacoes, templateInfo: { contribuinte: templateInfo.contribuinte, contagens: templateInfo.contagens } }, null, 2)], { type: "application/json" });
    const cpf = (templateInfo.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
    downloadBlob(blob, `${cpf}_patch.json`);
  }

  async function baixarFormularioPdf() {
    if (!templateInfo) return;
    try {
      setStatusMsg("Gerando formulário PDF...");
      const doc = await gerarFormularioPdf(templateInfo);
      const cpf = (templateInfo.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
      const blob = doc.output("blob");
      downloadBlob(blob, `${cpf}_formulario_complementar.pdf`);
      setStatusMsg("");
    } catch (e) {
      console.error("Erro gerarFormularioPdf:", e);
      setError(`Falha ao gerar formulário PDF: ${e.message || e}`);
      setStatusMsg("");
    }
  }

  async function baixarPdfDeclaracao() {
    if (!templateInfo || !patch) return;
    try {
      setStatusMsg("Gerando PDF de alterações...");
      const doc = await gerarPdfAlteracoes(templateInfo, patch, aprovacoes, reciboInfo, manualOverrides);
      const cpf = (templateInfo.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
      const anoDecl = templateInfo.anoDeclaracao || "0000";
      const anoCal = templateInfo.anoCalendario || "0000";
      const blob = doc.output("blob");
      downloadBlob(blob, `${cpf}-ALTERACOES-${anoDecl}-${anoCal}.pdf`);
      setStatusMsg("");
    } catch (e) {
      console.error("Erro gerarPdfAlteracoes:", e);
      setError(`Falha ao gerar PDF: ${e.message || e}`);
      setStatusMsg("");
    }
  }

  async function baixarPdfResumo() {
    if (!dadosExtraidos) return;
    try {
      setStatusMsg("Gerando PDF...");
      const doc = await gerarPdfResumo(dadosExtraidos, reciboInfo);
      const cpf = (dadosExtraidos.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
      const anoDecl = dadosExtraidos.anoDeclaracao || "2026";
      const anoCal = dadosExtraidos.anoCalendario || "2025";
      const blob = doc.output("blob");
      downloadBlob(blob, `${cpf}-DECLARACAO-${anoDecl}-${anoCal}.pdf`);
      setStatusMsg("");
    } catch (e) {
      console.error("Erro gerarPdfResumo:", e);
      setError(`Falha ao gerar PDF: ${e.message || e}`);
      setStatusMsg("");
    }
  }

  function baixarJsonExtraido() {
    if (!dadosExtraidos) return;
    const blob = new Blob([JSON.stringify(dadosExtraidos, null, 2)], { type: "application/json" });
    const cpf = (dadosExtraidos.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
    downloadBlob(blob, `${cpf}_consolidado.json`);
  }

  function baixarRelatorio() {
    const html = gerarRelatorioHtml(templateInfo, patch, reciboInfo);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const cpf = (templateInfo.contribuinte?.cpf || "sem-cpf").replace(/\D/g, "");
    downloadBlob(blob, `${cpf}_diff.html`);
  }

  // ====== Helpers de contagem das aprovações
  const contarAprovadas = () => {
    let n = 0;
    if ((patch?.contribuinte || patch?.endereco) && aprovacoes["contrib"]) n++;
    for (const f of patch?.fontes_pagadoras || []) {
      const k = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
      if (aprovacoes[`fonte_${k}`]) n++;
    }
    // Fontes novas e PF (Carnê-Leão): índice posicional
    for (let i = 0; i < (patch?.fontes_novas || []).length; i++) if (aprovacoes[`fonte_nova_${i}`]) n++;
    for (let i = 0; i < (patch?.rendimentos_pf_carne_leao || []).length; i++) if (aprovacoes[`pf_${i}`]) n++;
    for (const b of patch?.bens_atualizados || []) if (aprovacoes[`bem_${b.idx}`]) n++;
    for (let i = 0; i < (patch?.bens_novos_aviso || []).length; i++) if (aprovacoes[`bem_novo_${i}`]) n++;
    for (const b of patch?.bens_a_remover || []) if (aprovacoes[`bem_remover_${b.idx}`]) n++;
    for (const d of patch?.dividas_atualizadas || []) if (aprovacoes[`divida_${d.idx}`]) n++;
    for (let i = 0; i < (patch?.dividas_novas_aviso || []).length; i++) if (aprovacoes[`divida_nova_${i}`]) n++;
    for (const d of patch?.dividas_a_remover || []) if (aprovacoes[`divida_remover_${d.idx}`]) n++;
    for (const d of patch?.dependentes_atualizados || []) if (aprovacoes[`dep_${d.idx}`]) n++;
    for (let i = 0; i < (patch?.dependentes_novos_aviso || []).length; i++) if (aprovacoes[`dep_novo_${i}`]) n++;
    for (const d of patch?.dependentes_a_remover || []) if (aprovacoes[`dep_remover_${d.idx}`]) n++;
    for (const r of patch?.rendimentos_isentos_atualizados || []) if (aprovacoes[`isento_${r.idx}`]) n++;
    return n;
  };

  // === RENDER ===

  return (
    <div style={{ minHeight: "100vh", background: COR_PAPEL, fontFamily: "'IBM Plex Sans', sans-serif", color: COR_TINTA, paddingBottom: 80 }}>
      <style>{`
        button { font-family: inherit; }
        .hidden { display: none; }
      `}</style>

      <header style={{ borderBottom: `1px solid ${COR_BORDA}`, padding: "32px 40px 24px", background: "#fdfbf6" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: COR_SUTIL, marginBottom: 4 }}>
              Escritório · Automação IRPF
            </div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 38, letterSpacing: -1, margin: "0 0 4px" }}>
              Estúdio do Cliente
            </h1>
            <div style={{ fontSize: 13, color: COR_SUTIL }}>
              {templateInfo?.anoDeclaracao
                ? `PGD ${templateInfo.anoDeclaracao} · ano-calendário ${templateInfo.anoCalendario} · gerando .DBK corrigido pro mesmo exercício`
                : "Suba o template do PGD pra começar · um cliente por vez"}
            </div>
          </div>
          <button
            onClick={() => setShowAjuda(true)}
            aria-label="Ajuda"
            title="Como usar o estúdio"
            style={{
              flexShrink: 0,
              width: 36, height: 36,
              borderRadius: "50%",
              border: `1px solid ${COR_BORDA}`,
              background: COR_PAPEL,
              color: COR_TINTA,
              fontSize: 18,
              fontFamily: "'Fraunces', serif",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >?</button>
        </div>
      </header>

      {showAjuda && <ModalAjuda onClose={() => setShowAjuda(false)} />}
      {iaModal && (
        <ModalIA
          prompt={iaModal.prompt}
          arquivos={iaModal.arquivos}
          modoAgente={iaModal.modoAgente}
          modoAgenteIA={modoAgenteIA}
          onChangeModoAgente={(v) => {
            setModoAgenteIA(v);
            // Recalcula o prompt pra refletir o novo modo sem fechar o modal
            const novoPrompt = templateInfo
              ? montarPromptPatch(templateInfo, reciboInfo, !!formularioPreenchido, v, declAnteriorTexto, reciboPdfTexto)
              : montarPromptExtracao(reciboInfo, !!formularioPreenchido, declAnteriorTexto, reciboPdfTexto);
            setIaModal({ ...iaModal, prompt: novoPrompt, modoAgente: v });
          }}
          resposta={iaResposta}
          onChangeResposta={setIaResposta}
          onAplicar={aplicarRespostaIA}
          onCancelar={cancelarIA}
        />
      )}

      {inspecaoModal && (
        <InspecaoModal relatorio={inspecaoModal} onFechar={() => setInspecaoModal(null)} />
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 40px" }}>

        {/* SEÇÃO 1 — UPLOADS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px" }}>
            1 · Arquivos
          </h2>
          <div style={{ fontSize: 12, color: COR_SUTIL, marginBottom: 16 }}>
            Para gerar <strong>.DBK</strong>, anexe o template (backup .DBK do PGD). Sem template, o estúdio gera apenas <strong>PDF</strong> de consolidação a partir do que tiver. Os <strong>informes do cliente</strong> (bancos, empregadores, corretoras) são anexados depois, diretamente no chat da IA.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <FileSlot rotulo="Template .DBK" descricao="Backup .DBK do PGD do ano anterior (geralmente o arquivo da pré-preenchida). Obrigatório pra gerar .DBK atualizado."
              accept=".dbk" file={template} onChange={setTemplate} />
            <FileSlot rotulo="Declaração anterior (PDF)" descricao="Útil quando o template não tem todos os dados. Texto extraído localmente e embutido no prompt — não precisa anexar no chat da IA."
              accept=".pdf" file={declAnterior} onChange={setDeclAnterior} protegido={declAnterior && arquivosProtegidos.includes(declAnterior.name)} />
            <FileSlot rotulo="Recibo" descricao=".REC (parse local extrai nº do recibo) ou .PDF (texto extraído e embutido no prompt). Útil pra retificadora."
              accept=".rec,.pdf" file={recibo} onChange={setRecibo} protegido={recibo && arquivosProtegidos.includes(recibo.name)} />
            <FileSlot rotulo="Formulário complementar preenchido" descricao="PDF do formulário gerado abaixo, preenchido à mão pelo cliente. Anexe no chat da IA — tem prioridade sobre os informes."
              accept=".pdf" file={formularioPreenchido} onChange={setFormularioPreenchido}
              protegido={formularioPreenchido && arquivosProtegidos.includes(formularioPreenchido.name)} />
          </div>

          {(extraindo.decl || extraindo.recibo) && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#fdf6e3", border: `1px solid ${COR_BORDA}`, fontSize: 11.5, color: COR_SUTIL, fontFamily: "'IBM Plex Mono', monospace" }}>
              Extraindo texto: {extraindo.decl ? "declaração anterior" : ""}{extraindo.decl && extraindo.recibo ? ", " : ""}{extraindo.recibo ? "recibo" : ""}…
            </div>
          )}

          {/* Resumo do template lido */}
          {templateInfo && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#eef4ef", border: `1px solid ${COR_VERDE}`, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: COR_VERDE }}>Template lido:</strong>{" "}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {templateInfo.contribuinte?.nome} · CPF {fmtCPF(templateInfo.contribuinte?.cpf)} ·
                    {" "}{templateInfo.fontes.length} fontes ·
                    {" "}{templateInfo.bens.length} bens ·
                    {" "}{templateInfo.dividas.length} dívidas ·
                    {" "}{templateInfo.dependentes.length} dependentes ·
                    {" "}{templateInfo.rendIsentos.length} rend. isentos
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setInspecaoModal(gerarRelatorioInspecao(templateInfo))}
                    style={{
                      background: "transparent",
                      color: COR_TINTA,
                      border: `1px solid ${COR_BORDA}`,
                      padding: "6px 12px",
                      fontSize: 11,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}
                    title="Lista todos os tipos de registro do .DBK, indica quais o parser reconhece e gera dumps dos não-reconhecidos"
                  >
                    🔍 Inspecionar .DBK
                  </button>
                  <button
                    onClick={baixarFormularioPdf}
                    style={{
                      background: "transparent",
                      color: COR_VERDE,
                      border: `1px solid ${COR_VERDE}`,
                      padding: "6px 12px",
                      fontSize: 11,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}
                    title="Gera um PDF com os bens, dívidas e fontes do template e campos em branco pra preencher"
                  >
                    ↓ Formulário em PDF
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: COR_SUTIL }}>
                Use o formulário em PDF quando faltar algum informe. Imprima, peça pro cliente preencher à mão, escaneie e re-anexe no slot "Formulário complementar preenchido".
              </div>
            </div>
          )}

          {/* Conteúdo detalhado do template — com semáforo de cores quando há patch */}
          {templateInfo && <ConteudoTemplate templateInfo={templateInfo} patch={patch} aprovacoes={aprovacoes} setAprovacoes={setAprovacoes} manualOverrides={manualOverrides} setManualOverrides={setManualOverrides} />}

          {templateErro && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fbeae6", border: `1px solid ${COR_VERMELHO}`, fontSize: 12, color: COR_VERMELHO }}>
              Erro ao ler template: {templateErro}
            </div>
          )}

          {/* Recibo lido */}
          {reciboInfo && !reciboInfo.erro && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#eef4ef", border: `1px solid ${COR_VERDE}`, fontSize: 12 }}>
              <strong style={{ color: COR_VERDE }}>Recibo lido:</strong>{" "}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                nº {reciboInfo.recibo || "—"} · {reciboInfo.data} {reciboInfo.hora}
              </span>
            </div>
          )}

          {/* Aviso PDFs protegidos */}
          {arquivosProtegidos.length > 0 && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#fdf4e0", borderLeft: `3px solid ${COR_AMBAR}`, fontSize: 12 }}>
              <strong style={{ color: "#8a6a14" }}>PDF(s) protegido(s) por senha detectado(s):</strong>{" "}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#8a6a14" }}>{arquivosProtegidos.join(", ")}</span>
              <div style={{ marginTop: 6, color: "#6b6256", lineHeight: 1.5 }}>
                A API não aceita PDFs com senha. Abra cada arquivo, insira a senha, e use <em>Arquivo › Imprimir › Salvar como PDF</em> ou ferramenta tipo iLovePDF/PDF24 pra gerar versão sem proteção.
              </div>
            </div>
          )}

          {/* Botão processar */}
          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            {(() => {
              const temPDFs = declAnterior || (recibo?.name.toLowerCase().endsWith(".pdf")) || formularioPreenchido;
              const podeProcessar = (template && templateInfo) || temPDFs;
              const labelBotao = processing
                ? "Processando..."
                : (template && templateInfo)
                ? "Processar e gerar patch"
                : temPDFs
                ? "Processar e gerar PDF"
                : "Anexe template ou PDFs";
              return (
                <button onClick={processar} disabled={processing || !podeProcessar}
                  style={{ background: processing || !podeProcessar ? COR_SUTIL : COR_TINTA, color: COR_PAPEL, border: "none",
                    padding: "12px 28px", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                    cursor: processing || !podeProcessar ? "not-allowed" : "pointer", fontWeight: 500 }}>
                  {labelBotao}
                </button>
              );
            })()}
            {(patch || dadosExtraidos) && !processing && (
              <button onClick={() => { setPatch(null); setDadosExtraidos(null); setAprovacoes({}); setRawResponse(null); }}
                style={{ background: "transparent", color: COR_SUTIL, border: `1px solid ${COR_BORDA}`,
                  padding: "12px 20px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer" }}>
                Limpar resultado
              </button>
            )}
            {statusMsg && <span style={{ color: COR_SUTIL, fontSize: 12, fontStyle: "italic" }}>{statusMsg}</span>}
          </div>

          {/* Erro */}
          {error && (
            <div style={{ marginTop: 16, padding: 14, background: "#fbeae6", border: `1px solid ${COR_VERMELHO}` }}>
              <div style={{ fontSize: 12, color: COR_VERMELHO, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Erro</div>
              <div style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: COR_TINTA, wordBreak: "break-word" }}>{error}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {errorContext?.protegido && (
                  <button onClick={() => removerProtegido(errorContext.protegido)}
                    style={{ background: COR_AMBAR, color: "#fff", border: "none", padding: "6px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer" }}>
                    Remover "{errorContext.protegido}"
                  </button>
                )}
                <button onClick={processar}
                  style={{ background: COR_VERMELHO, color: "#fff", border: "none", padding: "6px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer" }}>
                  Tentar novamente
                </button>
                {rawResponse && (
                  <details style={{ fontSize: 11, color: COR_SUTIL }}>
                    <summary style={{ cursor: "pointer" }}>Ver resposta crua da API</summary>
                    <pre style={{ marginTop: 6, padding: 8, background: "#fcfaf4", border: `1px solid ${COR_BORDA}`, maxHeight: 300, overflow: "auto", fontSize: 10 }}>{rawResponse}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SEÇÃO 2 — REVISÃO DAS MUDANÇAS PROPOSTAS */}
        {patch && templateInfo && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px" }}>
              2 · Mudanças propostas
            </h2>
            <div style={{ fontSize: 12, color: COR_SUTIL, marginBottom: 20 }}>
              Cada linha abaixo é uma alteração que será aplicada ao arquivo. Desmarque o que não quer aplicar.
              {" "}<strong>{contarAprovadas()}</strong> de {Object.keys(aprovacoes).length} aprovada(s).
            </div>

            {/* Contribuinte */}
            {(patch.contribuinte || patch.endereco) && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <Checkbox
                  checked={aprovacoes["contrib"] !== false}
                  onChange={(v) => setAprovacoes({ ...aprovacoes, contrib: v })}
                  label="Contribuinte / Endereço"
                  sub={`${Object.keys(patch.contribuinte || {}).length + Object.keys(patch.endereco || {}).length} campo(s)`}
                />
                <table style={{ width: "100%", marginTop: 8, fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {patch.contribuinte && Object.entries(patch.contribuinte).map(([k, v]) => (
                      <tr key={k}><td style={{ color: COR_SUTIL, padding: "3px 0", width: "20%" }}>{k}</td>
                        <td><Diff ant={templateInfo.contribuinte?.[k]} novo={v} /></td></tr>
                    ))}
                    {patch.endereco && Object.entries(patch.endereco).map(([k, v]) => (
                      <tr key={k}><td style={{ color: COR_SUTIL, padding: "3px 0", width: "20%" }}>{k}</td>
                        <td><Diff ant={templateInfo.endereco?.[k]} novo={v} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fontes pagadoras */}
            {(patch.fontes_pagadoras || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Fontes pagadoras · {patch.fontes_pagadoras.length}
                </h3>
                {patch.fontes_pagadoras.map((f) => {
                  const k = String(f.cnpj || "").replace(/\D/g, "").padStart(14, "0");
                  const tpl = templateInfo.fontes.find((x) => x.cnpj === k);
                  const labelTexto = f.resumo || `${fmtCNPJ(f.cnpj)} — ${tpl?.nome || f.nome || "(sem nome)"}`;
                  const textoCopia = [
                    `Fonte pagadora: ${tpl?.nome || f.nome || ""}`,
                    `CNPJ: ${fmtCNPJ(f.cnpj)}`,
                    `Rendimentos tributáveis: R$ ${fmtBRL(f.rendimentos_tributaveis)}`,
                    f.decimo_terceiro ? `13º salário: R$ ${fmtBRL(f.decimo_terceiro)}` : "",
                    `INSS: R$ ${fmtBRL(f.inss)}`,
                    `IR retido: R$ ${fmtBRL(f.ir_retido)}`,
                  ].filter(Boolean).join("\n");
                  return (
                    <div key={k} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={aprovacoes[`fonte_${k}`] !== false}
                            onChange={(v) => setAprovacoes({ ...aprovacoes, [`fonte_${k}`]: v })}
                            label={labelTexto}
                            sub={f.origem}
                          />
                        </div>
                        <BotaoCopiar texto={textoCopia} label="Copiar fonte completa" size={12} />
                      </div>
                      <table style={{ width: "100%", marginTop: 4, fontSize: 12, borderCollapse: "collapse" }}>
                        <tbody>
                          {["rendimentos_tributaveis", "decimo_terceiro", "inss", "ir_retido"].map((campo) => (
                            f[campo] != null && (
                              <tr key={campo}><td style={{ color: COR_SUTIL, padding: "2px 0", width: "30%" }}>{campo.replace("_", " ")}</td>
                                <td style={{ display: "flex", alignItems: "center" }}>
                                  <Diff ant={tpl?.[campo]} novo={f[campo]} valor />
                                  <BotaoCopiar texto={fmtBRL(f[campo])} label={`Copiar ${campo}`} />
                                </td></tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bens */}
            {(patch.bens_atualizados || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Bens · saldo 31/12 · {patch.bens_atualizados.length}
                </h3>
                {patch.bens_atualizados.map((b) => {
                  const tpl = templateInfo.bens[b.idx - 1];
                  if (!tpl) return null;
                  const anoCal = templateInfo.anoCalendario || "";
                  const anoCalAnt = anoCal ? String(parseInt(anoCal, 10) - 1) : "";
                  const labelTexto = b.resumo || `B${b.idx} [grupo ${tpl.grupo}] — ${(tpl.discriminacao || "").slice(0, 90)}${((tpl.discriminacao || "").length) > 90 ? "..." : ""}`;
                  const linhasCopia = [
                    `Bem B${b.idx} (grupo ${tpl.grupo}${tpl.codigo ? `/cód ${tpl.codigo}` : ""})`,
                    `Discriminação: ${tpl.discriminacao}`,
                  ];
                  if (b.valor_anterior != null) {
                    linhasCopia.push(`Valor 31/12/${anoCalAnt} (template): R$ ${fmtBRL(tpl.valor_anterior)}`);
                    linhasCopia.push(`Valor 31/12/${anoCalAnt} (atualizado): R$ ${fmtBRL(b.valor_anterior)}`);
                  }
                  linhasCopia.push(`Valor 31/12/${anoCal} (template): R$ ${fmtBRL(tpl.valor_atual)}`);
                  linhasCopia.push(`Valor 31/12/${anoCal} (atualizado): R$ ${fmtBRL(b.valor_atual)}`);
                  const textoCopia = linhasCopia.join("\n");
                  return (
                    <div key={b.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={aprovacoes[`bem_${b.idx}`] !== false}
                            onChange={(v) => setAprovacoes({ ...aprovacoes, [`bem_${b.idx}`]: v })}
                            label={labelTexto}
                            sub={b.origem}
                          />
                        </div>
                        <BotaoCopiar texto={textoCopia} label="Copiar bem completo" size={12} />
                      </div>
                      <div style={{ marginLeft: 26, marginTop: 4 }}>
                        {b.valor_anterior != null && (
                          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: COR_SUTIL, marginRight: 8, minWidth: 90 }}>31/12/{templateInfo.anoCalendario ? String(parseInt(templateInfo.anoCalendario, 10) - 1) : ""}</span>
                            <Diff ant={tpl.valor_anterior} novo={b.valor_anterior} valor />
                            <BotaoCopiar texto={fmtBRL(b.valor_anterior)} label="Copiar valor anterior atualizado" />
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: COR_SUTIL, marginRight: 8, minWidth: 90 }}>31/12/{templateInfo.anoCalendario || ""}</span>
                          <Diff ant={tpl.valor_atual} novo={b.valor_atual} valor />
                          <BotaoCopiar texto={fmtBRL(b.valor_atual)} label="Copiar valor novo" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dívidas */}
            {(patch.dividas_atualizadas || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dívidas · saldo 31/12 · {patch.dividas_atualizadas.length}
                </h3>
                {patch.dividas_atualizadas.map((d) => {
                  const tpl = templateInfo.dividas[d.idx - 1];
                  if (!tpl) return null;
                  const anoCal = templateInfo.anoCalendario || "";
                  const anoCalAnt = anoCal ? String(parseInt(anoCal, 10) - 1) : "";
                  const labelTexto = d.resumo || `V${d.idx} — ${(tpl.discriminacao || "").slice(0, 90)}${((tpl.discriminacao || "").length) > 90 ? "..." : ""}`;
                  const linhasCopia = [
                    `Dívida V${d.idx} (código ${tpl.codigo})`,
                    `Discriminação: ${tpl.discriminacao}`,
                  ];
                  if (d.valor_anterior != null) {
                    linhasCopia.push(`Saldo 31/12/${anoCalAnt} (template): R$ ${fmtBRL(tpl.valor_anterior)}`);
                    linhasCopia.push(`Saldo 31/12/${anoCalAnt} (atualizado): R$ ${fmtBRL(d.valor_anterior)}`);
                  }
                  linhasCopia.push(`Saldo 31/12/${anoCal} (template): R$ ${fmtBRL(tpl.valor_atual)}`);
                  linhasCopia.push(`Saldo 31/12/${anoCal} (atualizado): R$ ${fmtBRL(d.valor_atual)}`);
                  const textoCopia = linhasCopia.join("\n");
                  return (
                    <div key={d.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={aprovacoes[`divida_${d.idx}`] !== false}
                            onChange={(v) => setAprovacoes({ ...aprovacoes, [`divida_${d.idx}`]: v })}
                            label={labelTexto}
                            sub={d.origem}
                          />
                        </div>
                        <BotaoCopiar texto={textoCopia} label="Copiar dívida completa" size={12} />
                      </div>
                      <div style={{ marginLeft: 26, marginTop: 4 }}>
                        {d.valor_anterior != null && (
                          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: COR_SUTIL, marginRight: 8, minWidth: 90 }}>31/12/{templateInfo.anoCalendario ? String(parseInt(templateInfo.anoCalendario, 10) - 1) : ""}</span>
                            <Diff ant={tpl.valor_anterior} novo={d.valor_anterior} valor />
                            <BotaoCopiar texto={fmtBRL(d.valor_anterior)} label="Copiar saldo anterior atualizado" />
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: COR_SUTIL, marginRight: 8, minWidth: 90 }}>31/12/{templateInfo.anoCalendario || ""}</span>
                          <Diff ant={tpl.valor_atual} novo={d.valor_atual} valor />
                          <BotaoCopiar texto={fmtBRL(d.valor_atual)} label="Copiar valor novo" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dependentes */}
            {(patch.dependentes_atualizados || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dependentes · {patch.dependentes_atualizados.length}
                </h3>
                {patch.dependentes_atualizados.map((d) => {
                  const tpl = templateInfo.dependentes[d.idx - 1];
                  if (!tpl) return null;
                  return (
                    <div key={d.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={aprovacoes[`dep_${d.idx}`] !== false}
                        onChange={(v) => setAprovacoes({ ...aprovacoes, [`dep_${d.idx}`]: v })}
                        label={`D${d.idx} — ${tpl.nome}`}
                      />
                      <table style={{ width: "100%", marginTop: 4, marginLeft: 26, fontSize: 12, borderCollapse: "collapse" }}>
                        <tbody>
                          {Object.entries(d).filter(([k]) => k !== "idx").map(([k, v]) => (
                            <tr key={k}><td style={{ color: COR_SUTIL, padding: "2px 0", width: "30%" }}>{k}</td>
                              <td><Diff ant={tpl[k]} novo={v} /></td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rendimentos isentos */}
            {(patch.rendimentos_isentos_atualizados || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rendimentos isentos · {patch.rendimentos_isentos_atualizados.length}
                </h3>
                {patch.rendimentos_isentos_atualizados.map((r) => {
                  const tpl = templateInfo.rendIsentos[r.idx - 1];
                  if (!tpl) return null;
                  return (
                    <div key={r.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={aprovacoes[`isento_${r.idx}`] !== false}
                        onChange={(v) => setAprovacoes({ ...aprovacoes, [`isento_${r.idx}`]: v })}
                        label={`I${r.idx} — ${tpl.nome_fonte || ""} · ${(tpl.descricao || "").slice(0, 60)}`}
                        sub={r.origem}
                      />
                      <div style={{ marginLeft: 26, marginTop: 4 }}>
                        <Diff ant={tpl.valor} novo={r.valor} valor />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagamentos efetuados atualizados (alterado) */}
            {(patch.pagamentos_atualizados || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Pagamentos efetuados · {patch.pagamentos_atualizados.length}
                </h3>
                {patch.pagamentos_atualizados.map((p) => {
                  const tpl = templateInfo.pagamentos[p.idx - 1];
                  if (!tpl) return null;
                  const textoCopia = [
                    `Pagamento P${p.idx} (código ${tpl.codigo})`,
                    `Beneficiário: ${tpl.nome}`,
                    `CNPJ/CPF: ${tpl.cnpj_cpf}`,
                    `Valor pago (template): R$ ${fmtBRL(tpl.valor_pago)}`,
                    `Valor pago (atualizado): R$ ${fmtBRL(p.valor_pago)}`,
                  ].join("\n");
                  return (
                    <div key={p.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <Checkbox
                            checked={aprovacoes[`pag_${p.idx}`] !== false}
                            onChange={(v) => setAprovacoes({ ...aprovacoes, [`pag_${p.idx}`]: v })}
                            label={`P${p.idx} — [cód ${tpl.codigo}] ${(tpl.nome || "").slice(0, 70)}`}
                            sub={p.origem}
                          />
                        </div>
                        <BotaoCopiar texto={textoCopia} label="Copiar pagamento completo" size={12} />
                      </div>
                      <div style={{ marginLeft: 26, marginTop: 4, display: "flex", alignItems: "center" }}>
                        <Diff ant={tpl.valor_pago} novo={p.valor_pago} valor />
                        <BotaoCopiar texto={fmtBRL(p.valor_pago)} label="Copiar valor novo" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagamentos a remover (laranja) */}
            {(patch.pagamentos_a_remover || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.remover.borda}`, background: STATUS_CONFIG.remover.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.remover.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Pagamentos a remover · {patch.pagamentos_a_remover.length}
                </h3>
                <div style={{ fontSize: 11, color: COR_SUTIL, marginBottom: 8 }}>
                  Pagamentos com R$ 0,00 ou sem recorrência em {templateInfo.anoCalendario || "ano atual"}. Desmarque pra manter no .DBK.
                </div>
                {patch.pagamentos_a_remover.map((p) => {
                  const tpl = templateInfo.pagamentos[p.idx - 1];
                  if (!tpl) return null;
                  return (
                    <div key={p.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={aprovacoes[`pag_remover_${p.idx}`] !== false}
                        onChange={(v) => setAprovacoes({ ...aprovacoes, [`pag_remover_${p.idx}`]: v })}
                        label={`P${p.idx} — [cód ${tpl.codigo}] ${(tpl.nome || "").slice(0, 70)}`}
                        sub={p.motivo || "valor R$ 0,00"}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rendimentos exclusivos atualizados (alterado / azul) */}
            {(patch.rendimentos_exclusivos_atualizados || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.alterado.borda}`, background: STATUS_CONFIG.alterado.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.alterado.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rendimentos exclusivos · {patch.rendimentos_exclusivos_atualizados.length}
                </h3>
                {patch.rendimentos_exclusivos_atualizados.map((e) => {
                  const tpl = templateInfo.rendExclusivos[e.idx - 1];
                  if (!tpl) return null;
                  return (
                    <div key={e.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={aprovacoes[`excl_${e.idx}`] !== false}
                        onChange={(v) => setAprovacoes({ ...aprovacoes, [`excl_${e.idx}`]: v })}
                        label={`E${e.idx} — [cód ${tpl.codigo}] ${(tpl.nome_fonte || "").slice(0, 65)}`}
                        sub={e.origem}
                      />
                      <div style={{ marginLeft: 26, marginTop: 4, display: "flex", alignItems: "center" }}>
                        <Diff ant={tpl.valor} novo={e.valor} valor />
                        <BotaoCopiar texto={fmtBRL(e.valor)} label="Copiar valor novo" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rendimentos exclusivos a remover (laranja) */}
            {(patch.rendimentos_exclusivos_a_remover || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${STATUS_CONFIG.remover.borda}`, background: STATUS_CONFIG.remover.bg }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: STATUS_CONFIG.remover.borda, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rendimentos exclusivos a remover · {patch.rendimentos_exclusivos_a_remover.length}
                </h3>
                {patch.rendimentos_exclusivos_a_remover.map((e) => {
                  const tpl = templateInfo.rendExclusivos[e.idx - 1];
                  if (!tpl) return null;
                  return (
                    <div key={e.idx} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={aprovacoes[`excl_remover_${e.idx}`] !== false}
                        onChange={(v) => setAprovacoes({ ...aprovacoes, [`excl_remover_${e.idx}`]: v })}
                        label={`E${e.idx} — [cód ${tpl.codigo}] ${(tpl.nome_fonte || "").slice(0, 65)}`}
                        sub={e.motivo}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Itens novos — gravados automaticamente no .DBK (PJ + bens + dívidas) */}
            {(patch.fontes_novas?.length > 0 || patch.bens_novos_aviso?.length > 0 || patch.dividas_novas_aviso?.length > 0 || patch.pagamentos_novos_aviso?.length > 0 || patch.rendimentos_exclusivos_novos_aviso?.length > 0) && (
              <div style={{ marginBottom: 16, padding: 16, background: "#eef4ef", borderLeft: `3px solid ${COR_VERDE}` }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 4px", color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Itens novos · serão gravados no .DBK
                </h3>
                <div style={{ fontSize: 11, color: COR_SUTIL, marginBottom: 10 }}>
                  O estúdio constrói as linhas de registro novas e atualiza o footer T9 automaticamente. Desmarque pra excluir do .DBK.
                </div>

                {(patch.fontes_novas || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, fontWeight: 500 }}>
                      Fontes pagadoras PJ novas · {patch.fontes_novas.length}
                    </div>
                    {(patch.fontes_novas || []).map((f, i) => (
                      <div key={`fn${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 6, marginTop: 6 }}>
                        <Checkbox
                          checked={aprovacoes[`fonte_nova_${i}`] !== false}
                          onChange={(v) => setAprovacoes({ ...aprovacoes, [`fonte_nova_${i}`]: v })}
                          label={f.resumo || `${fmtCNPJ(f.cnpj)} — ${f.nome || ""}`}
                          sub={f.origem}
                        />
                        <div style={{ marginLeft: 26, marginTop: 4 }}>
                          <AvisoCard item={f} prefixo="Fonte" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(patch.bens_novos_aviso || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, fontWeight: 500 }}>
                      Bens novos · {patch.bens_novos_aviso.length}
                    </div>
                    {(patch.bens_novos_aviso || []).map((b, i) => (
                      <div key={`bn${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 6, marginTop: 6 }}>
                        <Checkbox
                          checked={aprovacoes[`bem_novo_${i}`] !== false}
                          onChange={(v) => setAprovacoes({ ...aprovacoes, [`bem_novo_${i}`]: v })}
                          label={(typeof b === "string" ? b : (b.resumo || b.discriminacao || "")).slice(0, 100)}
                          sub={typeof b === "object" ? b.origem : undefined}
                        />
                        <div style={{ marginLeft: 26, marginTop: 4 }}>
                          <AvisoCard item={b} prefixo="Bem" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(patch.dividas_novas_aviso || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, fontWeight: 500 }}>
                      Dívidas novas · {patch.dividas_novas_aviso.length}
                    </div>
                    {(patch.dividas_novas_aviso || []).map((d, i) => (
                      <div key={`vn${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 6, marginTop: 6 }}>
                        <Checkbox
                          checked={aprovacoes[`divida_nova_${i}`] !== false}
                          onChange={(v) => setAprovacoes({ ...aprovacoes, [`divida_nova_${i}`]: v })}
                          label={(typeof d === "string" ? d : (d.resumo || d.discriminacao || "")).slice(0, 100)}
                          sub={typeof d === "object" ? d.origem : undefined}
                        />
                        <div style={{ marginLeft: 26, marginTop: 4 }}>
                          <AvisoCard item={d} prefixo="Dívida" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(patch.pagamentos_novos_aviso || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, fontWeight: 500 }}>
                      Pagamentos efetuados novos · {patch.pagamentos_novos_aviso.length}
                    </div>
                    {(patch.pagamentos_novos_aviso || []).map((p, i) => (
                      <div key={`pn${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 6, marginTop: 6 }}>
                        <Checkbox
                          checked={aprovacoes[`pag_novo_${i}`] !== false}
                          onChange={(v) => setAprovacoes({ ...aprovacoes, [`pag_novo_${i}`]: v })}
                          label={(typeof p === "string" ? p : (p.resumo || p.nome || `Cód ${p.codigo}`)).slice(0, 100)}
                          sub={typeof p === "object" ? p.origem : undefined}
                        />
                        <div style={{ marginLeft: 26, marginTop: 4 }}>
                          <AvisoCard item={p} prefixo="Pagamento" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(patch.rendimentos_exclusivos_novos_aviso || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, fontWeight: 500 }}>
                      Rendimentos exclusivos novos · {patch.rendimentos_exclusivos_novos_aviso.length}
                    </div>
                    {(patch.rendimentos_exclusivos_novos_aviso || []).map((e, i) => (
                      <div key={`ren${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 6, marginTop: 6 }}>
                        <Checkbox
                          checked={aprovacoes[`excl_novo_${i}`] !== false}
                          onChange={(v) => setAprovacoes({ ...aprovacoes, [`excl_novo_${i}`]: v })}
                          label={(typeof e === "string" ? e : (e.resumo || e.nome_fonte || `Cód ${e.codigo}`)).slice(0, 100)}
                          sub={typeof e === "object" ? e.origem : undefined}
                        />
                        <div style={{ marginLeft: 26, marginTop: 4 }}>
                          <AvisoCard item={e} prefixo="Rendimento exclusivo" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rendimentos PF (Carnê-Leão) — gravados no .DBK como reg 22 + reg 49 */}
            {(patch.rendimentos_pf_carne_leao || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, background: "#eef4ef", borderLeft: `3px solid ${COR_VERDE}` }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 4px", color: COR_VERDE, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rendimentos de PF (Carnê-Leão) · {patch.rendimentos_pf_carne_leao.length} · serão gravados no .DBK
                </h3>
                <div style={{ fontSize: 11, color: COR_SUTIL, marginBottom: 10 }}>
                  Pagadores pessoa física (CPF). O estúdio grava o consolidado mensal (reg 22) e cada lançamento individual (reg 49) na ficha &quot;Rendimentos Tributáveis Recebidos de PF/Exterior&quot;.
                  <strong> Se o template já tiver Carnê-Leão lançado manualmente, os lançamentos antigos são SUBSTITUÍDOS</strong> pelos novos — não some dois preenchimentos no mesmo .DBK.
                  Atenção: a <em>natureza</em> do rendimento (honorários, aluguéis, etc.) ainda não é gravada — o PGD vai assumir o default; revise depois de restaurar.
                </div>
                {(patch.rendimentos_pf_carne_leao || []).map((p, i) => {
                  const anoCalLabel = templateInfo.anoCalendario || "";
                  const textoCopia = [
                    `Pagador (PF): ${p.nome || ""}`,
                    `CPF: ${fmtCPF(p.cpf)}`,
                    `Valor total no ano: R$ ${fmtBRL(p.valor_total_ano)}`,
                    p.natureza ? `Natureza: ${p.natureza}` : "",
                    p.valores_mensais ? `Mensal: ${Object.entries(p.valores_mensais).filter(([_, v]) => Number(v) > 0).map(([m, v]) => `${m.padStart(2, "0")}${anoCalLabel ? "/" + anoCalLabel : ""} R$ ${fmtBRL(v)}`).join(", ")}` : "",
                  ].filter(Boolean).join("\n");
                  return (
                    <div key={`pf${i}`} style={{ borderTop: `1px dashed ${COR_BORDA}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={aprovacoes[`pf_${i}`] !== false}
                            onChange={(v) => setAprovacoes({ ...aprovacoes, [`pf_${i}`]: v })}
                            label={p.resumo || `${p.nome || ""} · CPF ${fmtCPF(p.cpf)}`}
                            sub={p.origem}
                          />
                        </div>
                        <BotaoCopiar texto={textoCopia} label="Copiar dados pra lançar no PGD" size={12} />
                      </div>
                      <div style={{ marginLeft: 26, marginTop: 4, fontSize: 12, color: COR_TINTA, fontFamily: "'IBM Plex Mono', monospace" }}>
                        Total ano: <strong>R$ {fmtBRL(p.valor_total_ano)}</strong>
                        {p.natureza ? ` · ${p.natureza}` : ""}
                      </div>
                      {p.valores_mensais && Object.values(p.valores_mensais).some((v) => Number(v) > 0) && (
                        <div style={{ marginLeft: 26, marginTop: 4, fontSize: 11, color: COR_SUTIL, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {Object.entries(p.valores_mensais).filter(([_, v]) => Number(v) > 0).map(([m, v]) => `${m.padStart(2, "0")}: R$ ${fmtBRL(v)}`).join(" · ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dependentes novos — ainda manual (sem reg 25 INSERT por enquanto) */}
            {(patch.dependentes_novos_aviso || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, background: "#fdf4e0", borderLeft: `3px solid ${COR_AMBAR}` }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: "#8a6a14", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dependentes novos · adicionar manualmente no PGD
                </h3>
                {(patch.dependentes_novos_aviso || []).map((dep, i) => (
                  <AvisoCard key={`dn${i}`} item={dep} prefixo="Dependente" />
                ))}
              </div>
            )}

            {patch.observacoes && (
              <div style={{ marginBottom: 16, padding: 12, background: "#fcfaf4", border: `1px solid ${COR_BORDA}`, fontSize: 12, color: COR_SUTIL, fontStyle: "italic" }}>
                <strong style={{ fontStyle: "normal", color: COR_TINTA }}>Observações da IA:</strong> {patch.observacoes}
              </div>
            )}

            {/* Caso de patch totalmente vazio */}
            {!patch.contribuinte && !patch.endereco
              && !(patch.fontes_pagadoras?.length) && !(patch.fontes_novas?.length)
              && !(patch.rendimentos_pf_carne_leao?.length)
              && !(patch.bens_atualizados?.length) && !(patch.bens_novos_aviso?.length) && !(patch.bens_a_remover?.length)
              && !(patch.dividas_atualizadas?.length) && !(patch.dividas_novas_aviso?.length) && !(patch.dividas_a_remover?.length)
              && !(patch.dependentes_atualizados?.length) && !(patch.dependentes_novos_aviso?.length) && !(patch.dependentes_a_remover?.length)
              && !(patch.rendimentos_isentos_atualizados?.length) && (
              <div style={{ padding: 16, border: `1px solid ${COR_BORDA}`, background: "#fcfaf4", fontSize: 13, color: COR_SUTIL, textAlign: "center" }}>
                Nenhuma alteração proposta. Provavelmente faltam informes do ano atual — anexe-os e processe novamente.
              </div>
            )}
          </section>
        )}

        {/* SEÇÃO 2 ALTERNATIVA — DADOS CONSOLIDADOS (modo sem template) */}
        {dadosExtraidos && !templateInfo && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px" }}>
              2 · Dados consolidados
            </h2>
            <div style={{ fontSize: 12, color: COR_SUTIL, marginBottom: 20 }}>
              Modo sem template: os dados abaixo foram extraídos dos PDFs. Use o PDF de consolidação como referência pra preencher manualmente no PGD.
            </div>

            {/* Contribuinte */}
            {(dadosExtraidos.contribuinte?.nome || dadosExtraidos.contribuinte?.cpf) && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Contribuinte
                </h3>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {Object.entries(dadosExtraidos.contribuinte || {}).map(([k, v]) => v ? (
                      <tr key={k}>
                        <td style={{ color: COR_SUTIL, padding: "3px 0", width: "25%" }}>{k}</td>
                        <td style={{ fontFamily: ["cpf","telefone","data_nascimento"].includes(k) ? "'IBM Plex Mono', monospace" : "inherit" }}>{v}</td>
                      </tr>
                    ) : null)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fontes pagadoras */}
            {(dadosExtraidos.fontes_pagadoras || []).length > 0 && (
              <div style={{ marginBottom: 16, padding: 16, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Fontes pagadoras · {dadosExtraidos.fontes_pagadoras.length}
                </h3>
                {dadosExtraidos.fontes_pagadoras.map((f, i) => (
                  <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${COR_BORDA}` : "none", paddingTop: i > 0 ? 8 : 0, marginTop: i > 0 ? 8 : 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{f.nome || "(sem nome)"}</div>
                    <div style={{ fontSize: 11, color: COR_SUTIL, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                      CNPJ {fmtCNPJ(f.cnpj)}{f.origem ? ` · ${f.origem}` : ""}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, fontSize: 12 }}>
                      <div><span style={{ color: COR_SUTIL }}>Rendimentos:</span> <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>R$ {fmtBRL(f.rendimentos_tributaveis)}</span></div>
                      <div><span style={{ color: COR_SUTIL }}>13º:</span> <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>R$ {fmtBRL(f.decimo_terceiro)}</span></div>
                      <div><span style={{ color: COR_SUTIL }}>INSS:</span> <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>R$ {fmtBRL(f.inss)}</span></div>
                      <div><span style={{ color: COR_SUTIL }}>IR retido:</span> <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>R$ {fmtBRL(f.ir_retido)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outras seções — cada item em card estruturado, propriedades em linhas */}
            {(dadosExtraidos.bens || []).length > 0 && (
              <div style={{ marginBottom: 12, padding: 14, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Bens · {dadosExtraidos.bens.length}
                </h3>
                {dadosExtraidos.bens.map((item, i) => (
                  <ItemCard
                    key={i} item={item} idx={i + 1} prefixo="B"
                    getHeader={(it) => it.discriminacao || it.descricao || "(sem descrição)"}
                    ignoreKeys={["discriminacao", "descricao"]}
                    color={COR_VERDE}
                  />
                ))}
              </div>
            )}

            {(dadosExtraidos.dividas || []).length > 0 && (
              <div style={{ marginBottom: 12, padding: 14, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dívidas · {dadosExtraidos.dividas.length}
                </h3>
                {dadosExtraidos.dividas.map((item, i) => (
                  <ItemCard
                    key={i} item={item} idx={i + 1} prefixo="V"
                    getHeader={(it) => it.discriminacao || it.descricao || it.credor || "(sem descrição)"}
                    ignoreKeys={["discriminacao", "descricao", "credor"]}
                    color="#8b2c1a"
                  />
                ))}
              </div>
            )}

            {(dadosExtraidos.rendimentos_isentos || []).length > 0 && (
              <div style={{ marginBottom: 12, padding: 14, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Rendimentos isentos · {dadosExtraidos.rendimentos_isentos.length}
                </h3>
                {dadosExtraidos.rendimentos_isentos.map((item, i) => (
                  <ItemCard
                    key={i} item={item} idx={i + 1} prefixo="I"
                    getHeader={(it) => `${it.fonte_nome || it.fonte || "—"}${it.categoria ? ` · ${it.categoria}` : ""}`}
                    ignoreKeys={["fonte_nome", "fonte", "categoria"]}
                    color={COR_VERDE}
                  />
                ))}
              </div>
            )}

            {(dadosExtraidos.aplicacoes_financeiras || []).length > 0 && (
              <div style={{ marginBottom: 12, padding: 14, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Aplicações financeiras · {dadosExtraidos.aplicacoes_financeiras.length}
                </h3>
                {dadosExtraidos.aplicacoes_financeiras.map((item, i) => (
                  <ItemCard
                    key={i} item={item} idx={i + 1} prefixo="A"
                    getHeader={(it) => it.instituicao || it.banco || "—"}
                    ignoreKeys={["instituicao", "banco"]}
                    color={COR_VERDE}
                  />
                ))}
              </div>
            )}

            {(dadosExtraidos.dependentes || []).length > 0 && (
              <div style={{ marginBottom: 12, padding: 14, border: `1px solid ${COR_BORDA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, margin: "0 0 10px", color: COR_SUTIL, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Dependentes · {dadosExtraidos.dependentes.length}
                </h3>
                {dadosExtraidos.dependentes.map((item, i) => (
                  <ItemCard
                    key={i} item={item} idx={i + 1} prefixo="D"
                    getHeader={(it) => it.nome || "—"}
                    ignoreKeys={["nome"]}
                    color={COR_VERDE}
                  />
                ))}
              </div>
            )}

            {/* Totais */}
            {dadosExtraidos.totais && Object.values(dadosExtraidos.totais).some((v) => v) && (
              <div style={{ marginBottom: 16, padding: 16, border: `2px solid ${COR_TINTA}`, background: "#fdfbf6" }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 15, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Totais
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {[
                    ["Rendimentos", dadosExtraidos.totais.rendimentos_tributaveis_total],
                    ["13º", dadosExtraidos.totais.decimo_terceiro_total],
                    ["INSS", dadosExtraidos.totais.inss_total],
                    ["IR retido", dadosExtraidos.totais.ir_retido_total],
                  ].map(([lbl, v]) => (
                    <div key={lbl}>
                      <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: COR_SUTIL }}>{lbl}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 500, marginTop: 2 }}>
                        <span style={{ color: COR_SUTIL, fontSize: 11 }}>R$ </span>{fmtBRL(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dadosExtraidos.observacoes && (
              <div style={{ marginBottom: 16, padding: 12, background: "#fcfaf4", border: `1px solid ${COR_BORDA}`, fontSize: 12, color: COR_SUTIL, fontStyle: "italic" }}>
                <strong style={{ fontStyle: "normal", color: COR_TINTA }}>Observações da IA:</strong> {dadosExtraidos.observacoes}
              </div>
            )}
          </section>
        )}

        {/* SEÇÃO 3 — DOWNLOADS */}
        {patch && templateInfo && (
          <section>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px" }}>
              3 · Gerar arquivos
            </h2>
            <div style={{ fontSize: 12, color: COR_SUTIL, marginBottom: 16 }}>
              Aplica as <strong>{contarAprovadas()}</strong> alteração(ões) aprovadas e gera os arquivos finais.
            </div>

            {/* Dois botões principais lado a lado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <button onClick={baixarDbk} disabled={!patch}
                style={{ background: !patch ? "#c8c2b0" : COR_VERDE, color: COR_PAPEL, border: "none",
                  padding: "18px 24px", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: !patch ? "not-allowed" : "pointer", fontWeight: 600,
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>Baixar .DBK atualizado</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.85 }}>
                  Importar no PGD {templateInfo.anoDeclaracao || ""} → Restaurar de cópia
                </span>
              </button>
              <button onClick={baixarPdfDeclaracao} disabled={!patch}
                style={{ background: !patch ? "#c8c2b0" : COR_TINTA, color: COR_PAPEL, border: "none",
                  padding: "18px 24px", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: !patch ? "not-allowed" : "pointer", fontWeight: 600,
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>Baixar PDF de alterações</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.85 }}>
                  Resumo com diff antes/depois pra conferência ou arquivo
                </span>
              </button>
            </div>

            {/* Saídas secundárias */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <button onClick={baixarRelatorio}
                style={{ background: "transparent", color: COR_SUTIL, border: `1px solid ${COR_BORDA}`, padding: "8px 14px", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer" }}>
                Diff em HTML
              </button>
              <button onClick={baixarPatch}
                style={{ background: "transparent", color: COR_SUTIL, border: `1px solid ${COR_BORDA}`, padding: "8px 14px", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer" }}>
                Patch JSON
              </button>
            </div>

            {/* Avisos */}
            <div style={{ padding: 12, background: "#fdf4e0", borderLeft: `3px solid ${COR_AMBAR}`, fontSize: 11, color: "#6b6256", lineHeight: 1.6 }}>
              <strong style={{ color: "#8a6a14" }}>Compatibilidade de versão:</strong> o .DBK gerado tem a mesma estrutura interna do template ({templateInfo.anoDeclaracao
                ? `PGD ${templateInfo.anoDeclaracao}, ano-cal ${templateInfo.anoCalendario}`
                : "versão detectada"}). Ele só pode ser restaurado no <strong>PGD da mesma versão</strong>. Pra migrar entre anos (ex: usar declaração 2025 no PGD 2026), abra o PGD 2026, vá em <em>"Importar declaração do ano anterior"</em>, salve a versão migrada, e use ESSE arquivo aqui como template.
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: COR_SUTIL, fontStyle: "italic", maxWidth: 760, lineHeight: 1.5 }}>
              <strong>Limitações:</strong> o registro 20 (resumo financeiro) não é reescrito — o PGD recalcula ao restaurar. Bens fixos (imóveis, veículos, participações societárias) não são tocados. Itens novos precisam ser adicionados manualmente no PGD após restaurar.
            </div>
          </section>
        )}

        {/* SEÇÃO 3 ALTERNATIVA — DOWNLOADS (modo sem template) */}
        {dadosExtraidos && !templateInfo && (
          <section>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px" }}>
              3 · Gerar arquivos
            </h2>
            <div style={{ fontSize: 12, color: COR_SUTIL, marginBottom: 16 }}>
              Modo sem template — não é possível gerar .DBK. Pra gerar .DBK, anexe um .DBK do PGD anterior e processe novamente.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <button onClick={baixarPdfResumo}
                style={{ background: COR_TINTA, color: COR_PAPEL, border: "none",
                  padding: "18px 24px", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: "pointer", fontWeight: 600,
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>Baixar PDF de consolidação</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.85 }}>
                  Resumo dos dados extraídos dos documentos
                </span>
              </button>
              <button onClick={baixarJsonExtraido}
                style={{ background: "transparent", color: COR_TINTA, border: `1px solid ${COR_BORDA}`,
                  padding: "18px 24px", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: "pointer", fontWeight: 600,
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>Baixar JSON</span>
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.85 }}>
                  Dados estruturados pra integração ou backup
                </span>
              </button>
            </div>

            <div style={{ padding: 12, background: "#fdf4e0", borderLeft: `3px solid ${COR_AMBAR}`, fontSize: 11, color: "#6b6256", lineHeight: 1.6 }}>
              <strong style={{ color: "#8a6a14" }}>Quer gerar .DBK também?</strong> Anexe um .DBK do PGD do ano anterior no primeiro slot. O estúdio vai usar como template, fazer o diff e devolver um .DBK pronto pra restaurar.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// Export final envolvendo o componente principal em ErrorBoundary
export default function EstudioIRPF() {
  return (
    <ErrorBoundary>
      <EstudioIRPFInner />
    </ErrorBoundary>
  );
}

/**
 * Gera a base local de UFs e municípios a partir da API de Localidades do IBGE.
 *
 * Uso: node scripts/atualizar-base-localidades-ibge.mjs
 *
 * Não grava pacientes, não chama a API em runtime e não altera telas.
 * Se a validação encontrar inconsistência, o script para sem escrever arquivos.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ESTADOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
const MUNICIPIOS_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';
const OBTIDO_EM = new Date().toISOString().slice(0, 10);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'data', 'localizacao');

function normalizeLocationSearch(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ufDe(municipio) {
  const pelaImediata = municipio['regiao-imediata']?.['regiao-intermediaria']?.UF ?? null;
  const pelaMicro = municipio.microrregiao?.mesorregiao?.UF ?? null;
  return { pelaImediata, pelaMicro };
}

function quote(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function main() {
  const [estadosRes, municipiosRes] = await Promise.all([
    fetch(ESTADOS_URL),
    fetch(MUNICIPIOS_URL),
  ]);
  if (!estadosRes.ok) throw new Error(`IBGE estados HTTP ${estadosRes.status}`);
  if (!municipiosRes.ok) throw new Error(`IBGE municípios HTTP ${municipiosRes.status}`);

  const estadosRaw = await estadosRes.json();
  const municipiosRaw = await municipiosRes.json();
  const problemas = [];

  if (!Array.isArray(estadosRaw)) problemas.push('Resposta de estados não é uma lista.');
  if (!Array.isArray(municipiosRaw)) problemas.push('Resposta de municípios não é uma lista.');
  if (problemas.length) {
    console.error(problemas.join('\n'));
    process.exit(1);
  }

  const estados = estadosRaw
    .map((estado) => ({
      nome: typeof estado.nome === 'string' ? estado.nome : '',
      sigla: typeof estado.sigla === 'string' ? estado.sigla : '',
      id: estado.id,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const siglas = new Set();
  for (const estado of estados) {
    if (!estado.nome.trim()) problemas.push(`UF sem nome (id ${estado.id}).`);
    if (!/^[A-Z]{2}$/.test(estado.sigla)) problemas.push(`Sigla inválida: "${estado.sigla}" (${estado.nome}).`);
    if (siglas.has(estado.sigla)) problemas.push(`Sigla duplicada: ${estado.sigla}.`);
    siglas.add(estado.sigla);
  }
  if (estados.length !== 27) {
    problemas.push(`Quantidade de UFs: ${estados.length} (esperado 27).`);
  }

  const municipios = [];
  const codigos = new Map();
  const chaves = new Map();
  const nomesExatos = new Map();

  for (const bruto of municipiosRaw) {
    const nome = typeof bruto.nome === 'string' ? bruto.nome : '';
    const codigoIbge = bruto.id == null ? '' : String(bruto.id);
    const { pelaImediata, pelaMicro } = ufDe(bruto);
    const siglaImediata = pelaImediata?.sigla ?? '';
    const siglaMicro = pelaMicro?.sigla ?? '';

    if (siglaImediata && siglaMicro && siglaImediata !== siglaMicro) {
      problemas.push(
        `UF divergente no município ${codigoIbge || '?' } ${nome}: região imediata ${siglaImediata}, microrregião ${siglaMicro}.`
      );
    }

    const uf = siglaImediata || siglaMicro;
    if (!nome.trim()) problemas.push(`Município sem nome (código ${codigoIbge || '?'}).`);
    if (!uf) problemas.push(`Município sem UF: ${codigoIbge || '?'} ${nome}.`);
    if (!/^\d{7}$/.test(codigoIbge)) {
      problemas.push(`codigoIbge inválido (precisa ser 7 dígitos em string): "${codigoIbge}" ${nome}.`);
    }
    if (uf && !siglas.has(uf)) problemas.push(`UF desconhecida no município ${nome}: ${uf}.`);

    if (codigoIbge) {
      const anterior = codigos.get(codigoIbge);
      if (anterior) {
        problemas.push(`Código IBGE duplicado ${codigoIbge}: "${anterior}" e "${nome}".`);
      }
      codigos.set(codigoIbge, nome);
    }

    const registro = { nome, uf, codigoIbge };
    municipios.push(registro);

    if (uf && nome.trim()) {
      const chave = `${uf}|${normalizeLocationSearch(nome)}`;
      const exata = `${uf}|${nome}`;
      const outro = chaves.get(chave);
      if (outro) {
        problemas.push(
          `Nome normalizado duplicado em ${uf}: "${outro.nome}" (${outro.codigoIbge}) e "${nome}" (${codigoIbge}).`
        );
      }
      chaves.set(chave, registro);
      const outroExato = nomesExatos.get(exata);
      if (outroExato) {
        problemas.push(`Nome oficial duplicado em ${uf}: "${nome}" (${outroExato} e ${codigoIbge}).`);
      }
      nomesExatos.set(exata, codigoIbge);
    }
  }

  municipios.sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome, 'pt-BR'));

  const prefixoPorUf = new Map();
  for (const municipio of municipios) {
    if (!/^\d{7}$/.test(municipio.codigoIbge) || !municipio.uf) continue;
    const prefixo = municipio.codigoIbge.slice(0, 2);
    const visto = prefixoPorUf.get(municipio.uf);
    if (!visto) prefixoPorUf.set(municipio.uf, new Set([prefixo]));
    else visto.add(prefixo);
  }
  for (const [uf, prefixos] of prefixoPorUf) {
    if (prefixos.size !== 1) {
      problemas.push(`UF ${uf} tem mais de um prefixo de código IBGE: ${[...prefixos].join(', ')}.`);
    }
  }

  if (problemas.length) {
    console.error(`Validação falhou com ${problemas.length} problema(s). Nenhum arquivo foi escrito.`);
    for (const problema of problemas) console.error(`- ${problema}`);
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const estadosTs = `/** Gerado por scripts/atualizar-base-localidades-ibge.mjs em ${OBTIDO_EM}. Não editar à mão. */\nexport const estadosBrasil = [\n${estados
    .map((estado) => `  { nome: ${quote(estado.nome)}, sigla: ${quote(estado.sigla)} },`)
    .join('\n')}\n] as const;\n`;

  const fonteTs = `/** Metadados da última geração. Não editar à mão. */\nexport const fonteLocalidadesIbge = {\n  provedor: 'IBGE',\n  obtidoEm: '${OBTIDO_EM}',\n  estadosUrl: '${ESTADOS_URL}',\n  municipiosUrl: '${MUNICIPIOS_URL}',\n  quantidadeEstados: ${estados.length},\n  quantidadeMunicipios: ${municipios.length},\n} as const;\n`;

  const json = `[\n${municipios
    .map((municipio) => `  ${JSON.stringify({ nome: municipio.nome, uf: municipio.uf, codigoIbge: municipio.codigoIbge })}`)
    .join(',\n')}\n]\n`;

  writeFileSync(path.join(outDir, 'estados-brasil.ts'), estadosTs, 'utf8');
  writeFileSync(path.join(outDir, 'fonte.ts'), fonteTs, 'utf8');
  writeFileSync(path.join(outDir, 'municipios-brasil.json'), json, 'utf8');

  const jsonBytes = Buffer.byteLength(json);
  const gzBytes = gzipSync(Buffer.from(json)).length;
  const porUf = new Map();
  for (const municipio of municipios) porUf.set(municipio.uf, (porUf.get(municipio.uf) || 0) + 1);

  const joao = municipios.find((m) => m.codigoIbge === '2507507');
  const comApostrofo = municipios.find((m) => m.nome.includes("'"));
  const comHifen = municipios.find((m) => m.nome.includes('-'));

  console.log(JSON.stringify({
    obtidoEm: OBTIDO_EM,
    estados: estados.length,
    municipios: municipios.length,
    jsonBytes,
    gzipBytes: gzBytes,
    menorUf: [...porUf.entries()].sort((a, b) => a[1] - b[1])[0],
    maiorUf: [...porUf.entries()].sort((a, b) => b[1] - a[1])[0],
    joao,
    comApostrofo,
    comHifen,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

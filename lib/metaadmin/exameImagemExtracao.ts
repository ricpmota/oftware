/** Extração de metadados de laudos de exame de imagem (IA). Server + client (normalização). */

export const TIPOS_EXAME_IMAGEM = [
  'usg',
  'tomografia',
  'ressonancia',
  'raio_x',
  'densitometria',
  'medicina_nuclear',
  'endoscopia',
  'outro',
  'desconhecido',
] as const;

export type TipoExameImagem = (typeof TIPOS_EXAME_IMAGEM)[number];

const TIPO_SET = new Set<string>(TIPOS_EXAME_IMAGEM);

export interface ExameImagemExtracaoNormalizada {
  nomePacienteDocumento: string | null;
  dataExame: string | null;
  tipoExame: TipoExameImagem;
  resumoEquipamentoOuRegiao: string | null;
  avisos: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function mapTipoBrutoParaEnum(raw: unknown): TipoExameImagem {
  if (raw === null || raw === undefined) return 'desconhecido';
  const s = String(raw).trim().toLowerCase();
  if (!s) return 'desconhecido';
  const compact = s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, '_');
  if (TIPO_SET.has(compact)) return compact as TipoExameImagem;
  if (compact.includes('ultrassom') || compact === 'us' || compact.includes('ecograf')) return 'usg';
  if (compact.includes('tomograf') || compact === 'tc' || compact.includes('ct_')) return 'tomografia';
  if (compact.includes('resson') || compact === 'rm' || compact.includes('mri')) return 'ressonancia';
  if (compact.includes('raio') || compact.includes('rx') || compact.includes('radiograf')) return 'raio_x';
  if (compact.includes('densitomet') || compact.includes('dexa')) return 'densitometria';
  if (compact.includes('cintilograf') || compact.includes('pet') || compact.includes('spect'))
    return 'medicina_nuclear';
  if (compact.includes('endoscop') || compact.includes('colonoscop') || compact.includes('gastroscop'))
    return 'endoscopia';
  if (compact.includes('desconhec') || compact.includes('nao_identificado')) return 'desconhecido';
  if (compact.includes('outro')) return 'outro';
  return 'desconhecido';
}

/**
 * Normaliza JSON vindo da API Gemini (defensivo).
 */
export function normalizarRespostaExameImagemIA(raw: unknown): ExameImagemExtracaoNormalizada {
  const out: ExameImagemExtracaoNormalizada = {
    nomePacienteDocumento: null,
    dataExame: null,
    tipoExame: 'desconhecido',
    resumoEquipamentoOuRegiao: null,
    avisos: [],
  };
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;

  const np = o.nomePacienteDocumento;
  if (typeof np === 'string') {
    const nome = np.trim().replace(/\s+/g, ' ');
    out.nomePacienteDocumento = nome || null;
  }

  const de = o.dataExame;
  if (typeof de === 'string' && ISO_DATE.test(de.trim())) {
    out.dataExame = de.trim();
  }

  out.tipoExame = mapTipoBrutoParaEnum(o.tipoExame);

  const res = o.resumoEquipamentoOuRegiao;
  if (typeof res === 'string') {
    const t = res.trim().replace(/\s+/g, ' ');
    out.resumoEquipamentoOuRegiao = t || null;
  }

  const av = o.avisos;
  if (Array.isArray(av)) {
    out.avisos = av.map((x) => String(x).trim()).filter(Boolean);
  }

  return out;
}

/**
 * Combina várias leituras de partes do mesmo laudo (PDF fatiado).
 * Prioriza primeiro tipo não-desconhecido, primeira data/nome/resumo úteis e reúne avisos.
 */
export function mergeExameImagemExtracoes(
  partes: ExameImagemExtracaoNormalizada[]
): ExameImagemExtracaoNormalizada {
  const out: ExameImagemExtracaoNormalizada = {
    nomePacienteDocumento: null,
    dataExame: null,
    tipoExame: 'desconhecido',
    resumoEquipamentoOuRegiao: null,
    avisos: [],
  };
  if (!partes.length) return out;

  const avisoSet = new Set<string>();
  let melhorResumo = '';
  const nomesVistos = new Set<string>();

  for (const p of partes) {
    if (p.nomePacienteDocumento) {
      nomesVistos.add(p.nomePacienteDocumento.trim().toLowerCase());
      if (!out.nomePacienteDocumento) out.nomePacienteDocumento = p.nomePacienteDocumento;
    }
    if (p.dataExame && !out.dataExame) out.dataExame = p.dataExame;
    if (p.tipoExame && p.tipoExame !== 'desconhecido') {
      if (out.tipoExame === 'desconhecido') out.tipoExame = p.tipoExame;
    }
    if (p.resumoEquipamentoOuRegiao) {
      const t = p.resumoEquipamentoOuRegiao.trim();
      if (t.length > melhorResumo.length) {
        melhorResumo = t;
        out.resumoEquipamentoOuRegiao = p.resumoEquipamentoOuRegiao;
      }
    }
    for (const a of p.avisos) {
      if (a.trim()) avisoSet.add(a.trim());
    }
  }

  if (out.tipoExame === 'desconhecido') {
    for (const p of partes) {
      if (p.tipoExame) {
        out.tipoExame = p.tipoExame;
        break;
      }
    }
  }

  if (nomesVistos.size > 1) {
    avisoSet.add('Nomes de paciente diferentes entre partes do PDF; confira o cabeçalho do laudo.');
  }

  out.avisos = Array.from(avisoSet);
  return out;
}


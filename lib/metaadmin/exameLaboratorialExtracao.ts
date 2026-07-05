import {
  EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS,
  isAllowedExameLaboratorialField,
} from '@/lib/metaadmin/exameLaboratorialFormFields';
import { filtrarCamposPorPlausibilidade } from '@/lib/metaadmin/exameLaboratorialPlausibility';

/** Resposta normalizada do backend / modelo (somente leitura + merge no formulário). */
export interface ExameLaboratorialExtracaoNormalizada {
  nomePacienteDocumento: string | null;
  dataExame: string | null;
  camposMapeados: Record<string, number>;
  examesNaoMapeados: string[];
  avisos: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Leucócitos e plaquetas no sistema são em ×10³/µL (ex.: 256 = 256×10³/µL).
 * Laudos brasileiros muitas vezes trazem contagem absoluta (/µL), ~1000× maior.
 */
function normalizarLeucoPlaquetasParaEscala10e3(field: string, value: number): number {
  if (field === 'leucocitos') {
    if (value >= 1000) return value / 1000;
    return value;
  }
  if (field === 'plaquetas') {
    if (value >= 10000) return value / 1000;
    return value;
  }
  return value;
}

function parseNumberSafe(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Normaliza JSON vindo da API (defensivo).
 */
export function normalizarRespostaExameIA(raw: unknown): ExameLaboratorialExtracaoNormalizada {
  const out: ExameLaboratorialExtracaoNormalizada = {
    nomePacienteDocumento: null,
    dataExame: null,
    camposMapeados: {},
    examesNaoMapeados: [],
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

  const cm = o.camposMapeados;
  if (cm && typeof cm === 'object' && !Array.isArray(cm)) {
    for (const [k, v] of Object.entries(cm as Record<string, unknown>)) {
      if (!isAllowedExameLaboratorialField(k)) continue;
      const num = parseNumberSafe(v);
      if (num === null) continue;
      const adjusted =
        k === 'leucocitos' || k === 'plaquetas' ? normalizarLeucoPlaquetasParaEscala10e3(k, num) : num;
      out.camposMapeados[k] = adjusted;
    }
  }

  const nm = o.examesNaoMapeados;
  if (Array.isArray(nm)) {
    out.examesNaoMapeados = nm.map((x) => String(x).trim()).filter(Boolean);
  }

  const av = o.avisos;
  if (Array.isArray(av)) {
    out.avisos = av.map((x) => String(x).trim()).filter(Boolean);
  }

  const filtrado = filtrarCamposPorPlausibilidade(out.camposMapeados, out.avisos);
  out.camposMapeados = filtrado.campos;
  out.avisos = filtrado.avisos;

  return out;
}

export type NovoExameFormState = {
  dataColeta: string;
  [key: string]: string | number | undefined;
};

/**
 * Mescla extração no estado do modal sem persistir.
 *
 * Regras:
 * - dataColeta: só atualiza se applyDate === true e dataExame for YYYY-MM-DD válida.
 * - Campos numéricos: só aplica valores > 0 finitos; chaves fora da allowlist são ignoradas.
 * - Campos já preenchidos: valores retornados pela IA sobrescrevem (médico pode corrigir depois).
 * - replaceLaboratorialFieldsPrior: remove do estado todos os campos da allowlist antes de aplicar
 *   a extração atual, para o laudo não ficar “misturado” com valores de um exame anterior no mesmo modal.
 */
export function applyExameExtraidoToForm(
  prev: NovoExameFormState,
  extracted: ExameLaboratorialExtracaoNormalizada,
  opts: { applyDate: boolean; replaceLaboratorialFieldsPrior?: boolean }
): NovoExameFormState {
  const allowed = new Set(EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS);
  const base: NovoExameFormState =
    opts.replaceLaboratorialFieldsPrior === true
      ? (Object.fromEntries(
          Object.entries(prev).filter(([k]) => k === 'dataColeta' || !allowed.has(k))
        ) as NovoExameFormState)
      : { ...prev };

  const next: NovoExameFormState = { ...base };
  if (opts.applyDate && extracted.dataExame && ISO_DATE.test(extracted.dataExame)) {
    next.dataColeta = extracted.dataExame;
  }
  for (const [k, num] of Object.entries(extracted.camposMapeados)) {
    if (!allowed.has(k)) continue;
    if (!Number.isFinite(num) || num <= 0) continue;
    next[k] = num;
  }
  return next;
}

/** Mensagem única para o modal de aviso (exames só identificados no arquivo, sem campo no sistema). */
export function buildMensagemExamesNaoInseridos(nomes: string[]): string {
  if (nomes.length === 0) return '';
  const lista = nomes.join(', ');
  return `Alguns exames não foram inseridos, como: ${lista}.`;
}

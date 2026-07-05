/**
 * Normalização Firestore → estrutura de paciente para exportação OI.
 * Réplica segura de `normalizePacienteFirestoreData` + conversão de datas
 * (services/pacienteService.ts) — sem dependência do Firebase client SDK.
 */
import { ensureImcOnMedidasIniciais } from '@/lib/meta/medidasIniciaisImc';
import { parseDataNascimentoDiaMesLocal } from '@/utils/dataNascimentoLocal';

export function toDateSafe(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const withToDate = value as { toDate?: () => Date };
  if (typeof withToDate.toDate === 'function') {
    try {
      const d = withToDate.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : undefined;
    } catch {
      return undefined;
    }
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toDateSafeDataNascimento(value: unknown): Date | undefined {
  const d = parseDataNascimentoDiaMesLocal(value);
  return d ?? undefined;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function mapEvolucaoSeguimentoSeg(seg: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    ...seg,
    dataRegistro: toDateSafe(seg.dataRegistro),
    doseAplicada: seg.doseAplicada
      ? {
          ...(seg.doseAplicada as Record<string, unknown>),
          data: toDateSafe((seg.doseAplicada as { data?: unknown }).data),
        }
      : undefined,
  };
  if (seg.marcoZero && typeof seg.marcoZero === 'object') {
    mapped.marcoZero = {
      ...(seg.marcoZero as Record<string, unknown>),
      createdAt: toDateSafe((seg.marcoZero as { createdAt?: unknown }).createdAt),
    };
  }
  return mapped;
}

/** Mesma lógica de `normalizePacienteFirestoreData` em pacienteService.ts */
export function normalizePacienteFirestoreData(raw: Record<string, unknown>): Record<string, unknown> {
  const data = { ...raw };

  const snake =
    (data.dados_clinicos as Record<string, unknown> | undefined) ||
    (data.dadosclinicos as Record<string, unknown> | undefined);

  let dc: Record<string, unknown> = isPlainObject(data.dadosClinicos)
    ? { ...(data.dadosClinicos as Record<string, unknown>) }
    : {};

  if (isPlainObject(snake)) {
    dc = { ...snake, ...dc };
  }

  const miTypo = dc.medidasiniciais;
  if (isPlainObject(miTypo)) {
    const cur = isPlainObject(dc.medidasIniciais) ? (dc.medidasIniciais as Record<string, unknown>) : {};
    dc.medidasIniciais = { ...miTypo, ...cur };
    delete dc.medidasiniciais;
  }

  const rootMiLower = (data as { medidasiniciais?: unknown }).medidasiniciais;
  const rootMi =
    (isPlainObject(data.medidasIniciais) ? data.medidasIniciais : null) ||
    (isPlainObject(rootMiLower) ? rootMiLower : null);
  if (rootMi) {
    const cur = isPlainObject(dc.medidasIniciais) ? (dc.medidasIniciais as Record<string, unknown>) : {};
    dc.medidasIniciais = { ...rootMi, ...cur };
  }

  if (isPlainObject(data.motivacao)) {
    const cur = isPlainObject(dc.motivacao) ? (dc.motivacao as Record<string, unknown>) : {};
    dc.motivacao = { ...(data.motivacao as Record<string, unknown>), ...cur };
  }
  if (data.motivacaoOutro != null && dc.motivacaoOutro == null) {
    dc.motivacaoOutro = data.motivacaoOutro;
  }

  if (isPlainObject(dc.medidasIniciais)) {
    dc.medidasIniciais = ensureImcOnMedidasIniciais(dc.medidasIniciais as Record<string, unknown>);
  }

  data.dadosClinicos = dc;
  return data;
}

export type NormalizedPacienteRaw = Record<string, unknown>;

export function normalizePacienteDocument(
  docId: string,
  raw: Record<string, unknown>
): NormalizedPacienteRaw {
  const data = normalizePacienteFirestoreData(raw);

  let evolucaoSeguimento = data.evolucaoSeguimento;
  if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
    evolucaoSeguimento = evolucaoSeguimento.map((seg) =>
      mapEvolucaoSeguimentoSeg(seg as Record<string, unknown>)
    );
  }

  let planoTerapeutico = data.planoTerapeutico as Record<string, unknown> | undefined;
  if (planoTerapeutico) {
    planoTerapeutico = {
      ...planoTerapeutico,
      startDate: toDateSafe(planoTerapeutico.startDate),
      lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
      nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
    };
  }

  const marcoZero = data.marcoZero;
  const marcoZeroNorm =
    marcoZero && typeof marcoZero === 'object'
      ? {
          ...(marcoZero as Record<string, unknown>),
          createdAt: toDateSafe((marcoZero as { createdAt?: unknown }).createdAt),
        }
      : marcoZero;

  const dadosIdentificacao = (data.dadosIdentificacao as Record<string, unknown>) || {};

  return {
    ...data,
    id: docId,
    statusTratamento: data.statusTratamento || 'pendente',
    dataCadastro: toDateSafe(data.dataCadastro),
    dataAbandono: toDateSafe(data.dataAbandono),
    marcoZero: marcoZeroNorm,
    dadosIdentificacao: {
      ...dadosIdentificacao,
      dataNascimento: toDateSafeDataNascimento(dadosIdentificacao.dataNascimento),
      dataCadastro: toDateSafe(dadosIdentificacao.dataCadastro),
    },
    evolucaoSeguimento,
    planoTerapeutico,
  };
}

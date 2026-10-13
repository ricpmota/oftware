import type { PacienteCompleto } from '@/types/obesidade';

export type AbandonmentPatientRow = {
  id: string;
  nome: string;
  motivo: string;
  dataAbandono: Date | null;
  canIdentify: boolean;
};

export type AbandonmentReasonItem = {
  motivo: string;
  count: number;
  percent: number;
  patients: AbandonmentPatientRow[];
};

export type AbandonmentRanking = {
  totalAbandonos: number;
  totalCarteira: number;
  percentCarteira: number | null;
  items: AbandonmentReasonItem[];
};

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildAbandonmentRanking(
  pacientes: PacienteCompleto[],
  ownPatientIds: Set<string>
): AbandonmentRanking {
  const abandonos = pacientes.filter((p) => p.statusTratamento === 'abandono');
  const byMotivo = new Map<string, AbandonmentPatientRow[]>();

  abandonos.forEach((p) => {
    const motivo = (p.motivoAbandono || '').trim() || 'Não informado';
    const id = p.id || p.userId || '';
    const canIdentify = ownPatientIds.has(p.id) || (!!p.userId && ownPatientIds.has(p.userId));
    const row: AbandonmentPatientRow = {
      id,
      nome: p.dadosIdentificacao?.nomeCompleto || 'Paciente',
      motivo,
      dataAbandono: toDate(p.dataAbandono),
      canIdentify,
    };
    const list = byMotivo.get(motivo) || [];
    list.push(row);
    byMotivo.set(motivo, list);
  });

  const totalAbandonos = abandonos.length;
  const items = [...byMotivo.entries()]
    .map(([motivo, patients]) => ({
      motivo,
      count: patients.length,
      percent: totalAbandonos > 0 ? (patients.length / totalAbandonos) * 100 : 0,
      patients,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAbandonos,
    totalCarteira: pacientes.length,
    percentCarteira: pacientes.length > 0 ? (totalAbandonos / pacientes.length) * 100 : null,
    items,
  };
}

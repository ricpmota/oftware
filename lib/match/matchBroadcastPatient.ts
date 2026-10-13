import type { MatchBroadcastPatient } from '@/lib/match/matchAdminTypes';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function clean(value: unknown, max: number): string {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

/** Nome, cidade e telefone já resolvido. Não carrega dado clínico. */
export function matchBroadcastPatientView(
  id: string,
  data: Record<string, unknown>,
  phone: string | null,
): MatchBroadcastPatient {
  const identity = asRecord(data.dadosIdentificacao);
  const address = asRecord(identity.endereco);
  const digits = (phone || '').replace(/\D/g, '');
  const status = data.status === 'ativo' || data.status === 'inativo' || data.status === 'arquivado' ? data.status : null;
  const treatment =
    data.statusTratamento === 'abandono' ||
    data.statusTratamento === 'pendente' ||
    data.statusTratamento === 'em_tratamento' ||
    data.statusTratamento === 'concluido'
      ? data.statusTratamento
      : null;
  return {
    id,
    name: clean(identity.nomeCompleto, 120) || clean(data.nome, 120) || 'Sem nome',
    city: clean(address.cidade, 80) || null,
    hasPhone: Boolean(phone),
    phoneTail: digits.length >= 4 ? digits.slice(-4) : null,
    status,
    treatment,
  };
}

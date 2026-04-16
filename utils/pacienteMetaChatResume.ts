import type { PacienteCompleto } from '@/types/obesidade';

/** dataNascimento pode vir como Date, string, Timestamp Firestore ({ toDate }), { seconds }, etc. */
export function pacienteMetaTemDataNascimentoCadastro(p: PacienteCompleto | null | undefined): boolean {
  const raw = p?.dadosIdentificacao?.dataNascimento as unknown;
  if (raw == null || raw === '') return false;
  if (raw instanceof Date) return !Number.isNaN(raw.getTime());
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    return !Number.isNaN(d.getTime());
  }
  if (typeof raw === 'object' && raw !== null && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime());
    } catch {
      return false;
    }
  }
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
    const sec = Number((raw as { seconds: unknown }).seconds);
    if (!Number.isFinite(sec)) return false;
    const d = new Date(sec * 1000);
    return !Number.isNaN(d.getTime());
  }
  return false;
}

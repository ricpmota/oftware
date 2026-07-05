/**
 * Handler testável da API OI analisar-paciente.
 * A rota Next.js delega aqui; lógica isolada de Request/Response.
 */
import type { PacienteCompleto } from '@/types/obesidade';
import type { OIAnalysis } from '@/types/oi';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';
import { analisarPaciente } from '@/lib/oi/OIService';

export type AnalisarPacienteHandlerDeps = {
  fetchPacienteRaw: (pacienteId: string) => Promise<Record<string, unknown> | null>;
  analisar?: (paciente: PacienteCompleto) => OIAnalysis;
};

export type AnalisarPacienteSuccess = {
  ok: true;
  analysis: OIAnalysis;
};

export type AnalisarPacienteFailure = {
  ok: false;
  status: 404 | 500;
  error: string;
};

export type AnalisarPacienteResult = AnalisarPacienteSuccess | AnalisarPacienteFailure;

export function parseAnalisarPacienteBody(
  body: unknown
): { pacienteId: string } | { error: string } {
  if (body == null || typeof body !== 'object') {
    return { error: 'Body JSON inválido.' };
  }
  const pacienteId =
    typeof (body as { pacienteId?: unknown }).pacienteId === 'string'
      ? (body as { pacienteId: string }).pacienteId.trim()
      : '';
  if (!pacienteId) {
    return { error: 'Informe pacienteId.' };
  }
  return { pacienteId };
}

export function rawFirestoreDocToPacienteCompleto(
  pacienteId: string,
  raw: Record<string, unknown>
): PacienteCompleto {
  return normalizePacienteDocument(pacienteId, raw) as unknown as PacienteCompleto;
}

export async function executarAnalisePacienteOi(
  pacienteId: string,
  deps: AnalisarPacienteHandlerDeps
): Promise<AnalisarPacienteResult> {
  try {
    const raw = await deps.fetchPacienteRaw(pacienteId);
    if (!raw) {
      return { ok: false, status: 404, error: 'Paciente não encontrado.' };
    }

    const paciente = rawFirestoreDocToPacienteCompleto(pacienteId, raw);
    const analyze = deps.analisar ?? analisarPaciente;
    const analysis = analyze(paciente);

    return { ok: true, analysis };
  } catch {
    return { ok: false, status: 500, error: 'Falha ao analisar paciente.' };
  }
}

/**
 * Cliente HTTP para API interna OI — não importa OIService nem benchmarks.
 */
import { auth } from '@/lib/firebase';
import type { OIAnalysis } from '@/types/oi';

export type FetchOiAnaliseResult =
  | { ok: true; analysis: OIAnalysis }
  | { ok: false; status?: number; error?: string };

export async function fetchOiAnalisePaciente(
  pacienteId: string
): Promise<FetchOiAnaliseResult> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, error: 'Não autenticado' };
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/oi/analisar-paciente', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pacienteId }),
  });

  let data: { ok?: boolean; analysis?: OIAnalysis; error?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, status: res.status, error: 'Resposta inválida da OI.' };
  }

  if (!res.ok || !data.ok || !data.analysis) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? 'Falha ao consultar OI.',
    };
  }

  return { ok: true, analysis: data.analysis };
}

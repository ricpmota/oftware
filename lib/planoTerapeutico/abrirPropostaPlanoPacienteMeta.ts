import { auth } from '@/lib/firebase';
import { planoPacienteJaAssinou } from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';
import { openPlanoTerapeuticoPdfUrl } from '@/utils/planoTerapeuticoPdfGenerate';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';

function abrirUrlExterna(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function urlPdfAssinadoPlano(plano: PlanoTerapeuticoInterativoDocumento | null | undefined): string | null {
  if (!plano) return null;
  return (
    plano.pdfFinalAssinadoUrl?.trim() ||
    plano.pdfAssinadoMedicoUrl?.trim() ||
    (planoPacienteJaAssinou(plano) ? plano.pdfUrl?.trim() : null) ||
    null
  );
}

export type AbrirPropostaPlanoResult = { ok: true } | { ok: false; error: string };

/**
 * Abre a proposta do plano terapêutico no /meta:
 * - assinada → PDF final
 * - pendente → página pública do plano
 */
export async function abrirPropostaPlanoPacienteMeta(args: {
  pacienteId: string;
  plano?: PlanoTerapeuticoInterativoDocumento | null;
}): Promise<AbrirPropostaPlanoResult> {
  const pacienteId = args.pacienteId?.trim();
  if (!pacienteId) return { ok: false, error: 'Paciente não identificado.' };

  const pdfLocal = urlPdfAssinadoPlano(args.plano ?? null);
  if (pdfLocal && planoPacienteJaAssinou(args.plano ?? null)) {
    openPlanoTerapeuticoPdfUrl(pdfLocal);
    return { ok: true };
  }

  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'Faça login para continuar.' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/meta/plano-terapeutico/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pacienteId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      publicUrl?: string;
      pdfAssinadoUrl?: string;
      assinado?: boolean;
    };

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Nenhuma proposta disponível.' };
    }

    const pdfAssinado = data.pdfAssinadoUrl?.trim();
    if (data.assinado && pdfAssinado) {
      openPlanoTerapeuticoPdfUrl(pdfAssinado);
      return { ok: true };
    }

    const publicUrl = data.publicUrl?.trim();
    if (publicUrl) {
      abrirUrlExterna(publicUrl);
      return { ok: true };
    }

    return { ok: false, error: 'Proposta indisponível no momento.' };
  } catch {
    return { ok: false, error: 'Falha de conexão ao abrir a proposta.' };
  }
}

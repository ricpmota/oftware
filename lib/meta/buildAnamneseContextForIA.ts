import type { PacienteCompleto } from '@/types/obesidade';
import { buildPerfilMetabolicoCards } from '@/lib/meta/perfilMetabolicoV3Display';

/** Contexto estruturado enviado ao Gemini (sem PII desnecessária). */
export function buildAnamneseContextForIA(paciente: PacienteCompleto): Record<string, unknown> {
  const dc = paciente.dadosClinicos || {};
  const pm = dc.perfilMetabolicoV3;
  const cards = buildPerfilMetabolicoCards(pm);

  return {
    tipoAvaliacaoInicial: dc.tipoAvaliacaoInicial ?? null,
    medidasIniciais: dc.medidasIniciais ?? null,
    motivacao: dc.motivacao ?? null,
    motivacaoOutro: dc.motivacaoOutro ?? null,
    diagnosticoPrincipal: dc.diagnosticoPrincipal ?? null,
    diagnosticoPrincipalTipos: (dc as { diagnosticoPrincipalTipos?: string[] }).diagnosticoPrincipalTipos ?? null,
    comorbidades: dc.comorbidades ?? null,
    riscos: dc.riscos ?? null,
    historiaTireoidiana: dc.historiaTireoidiana ?? null,
    sintomasGI: dc.sintomasGI ?? null,
    objetivosTratamento: dc.objetivosTratamento ?? null,
    perfilMetabolicoV3: pm ?? null,
    perfilMetabolicoResumoLegivel: cards.map((c) => ({
      bloco: c.title,
      informado: c.informed,
      itens: c.chips,
    })),
    statusTratamento: paciente.statusTratamento ?? null,
  };
}

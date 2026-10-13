import type { PacienteCompleto } from '@/types/obesidade';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { Lembrete } from '@/types/lembrete';
import { PrescricaoService } from '@/services/prescricaoService';
import { PagamentoService } from '@/services/pagamentoService';
import { LembreteService } from '@/services/lembreteService';
import type { PagamentoPaciente } from '@/types/pagamento';
import { trainingSessionService } from '@/services/trainingSessionService';
import { buscarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';
import { buscarEventosNutricaoProntuario } from './nutricaoProntuarioService';
import { extrairEventosAplicacoesDoPlano } from './prontuarioPlanoEventos';
import {
  extrairEventosAniversario,
  extrairEventosAlertas,
  extrairEventosBioimpedancia,
  extrairEventosExamesImagem,
  extrairEventosExamesLab,
  pagamentoParaEventos,
  prescricoesParaEventos,
  trainingSessionsParaEventos,
} from './prontuarioEventExtractors';
import type { EventoTimelineMock } from './prontuarioTypes';

export function lembreteNutriParaEvento(lembrete: Lembrete): EventoTimelineMock {
  const [y, m, d] = lembrete.data.split('-').map(Number);
  const dataFormatada = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return {
    id: `lembrete-${lembrete.id}`,
    tipo: 'lembrete',
    titulo: `Lembrete: ${lembrete.tag}`,
    descricao: lembrete.texto,
    data: dataFormatada,
    origem: 'nutri',
    ...(lembrete.concluido ? { destaque: 'Realizado' } : {}),
    dados: { status: lembrete.concluido ? 'Realizado' : 'Pendente' },
  };
}

function pagamentoNutriParaEventos(pacienteId: string, pagamento: PagamentoPaciente): EventoTimelineMock[] {
  return pagamentoParaEventos({ ...pagamento, pacienteId }).map((e) => ({
    ...e,
    id: `nutri-${e.id}`,
    origem: 'nutri' as const,
    titulo: e.titulo.startsWith('Parcela') ? `Nutri — ${e.titulo}` : `Nutri — ${e.titulo}`,
  }));
}

export function extrairEventosSincronosPacienteNutri(paciente: PacienteCompleto): EventoTimelineMock[] {
  const bioRegs = (paciente as Record<string, unknown>).bioimpedanciaRegistros as
    | BioImpedanciaRegistro[]
    | undefined;
  return [
    ...extrairEventosAniversario(paciente),
    ...extrairEventosAlertas(paciente),
    ...extrairEventosExamesLab(paciente),
    ...extrairEventosExamesImagem(paciente),
    ...(bioRegs ? extrairEventosBioimpedancia(bioRegs) : []),
    ...extrairEventosAplicacoesDoPlano(paciente),
  ];
}

/** Eventos derivados (exames, aplicações, nutri app, prescrições nutri, pagamento nutri, treinos, lembretes). */
export async function carregarEventosDerivadosProntuarioNutri(
  paciente: PacienteCompleto,
  nutricionistaId?: string
): Promise<EventoTimelineMock[]> {
  const id = paciente.id;
  if (!id?.trim()) return [];

  const resultados: EventoTimelineMock[] = [...extrairEventosSincronosPacienteNutri(paciente)];

  try {
    resultados.push(...(await buscarEventosNutricaoProntuario(id)));
  } catch (err) {
    console.error('[Prontuário Nutri] Erro eventos nutrição app:', err);
  }

  try {
    const prescricoes = await PrescricaoService.getPrescricoesByPaciente(id);
    const filtradas = nutricionistaId
      ? prescricoes.filter((p) => p.medicoId === nutricionistaId)
      : prescricoes;
    resultados.push(
      ...prescricoesParaEventos(filtradas).map((e) => ({
        ...e,
        origem: 'nutri' as const,
        titulo: e.titulo.startsWith('Prescrição') || e.titulo.startsWith('Recibo') ? e.titulo : `Prescrição: ${e.titulo}`,
      }))
    );
  } catch (err) {
    console.error('[Prontuário Nutri] Erro prescrições:', err);
  }

  if (nutricionistaId) {
    try {
      const pagamento = await PagamentoService.getPagamentoNutricionistaPorPaciente(
        nutricionistaId,
        id
      );
      if (pagamento) resultados.push(...pagamentoNutriParaEventos(id, pagamento));
    } catch (err) {
      console.error('[Prontuário Nutri] Erro pagamentos nutri:', err);
    }

    try {
      const todos = await LembreteService.getLembretesPorNutricionista(nutricionistaId);
      const doPaciente = todos.filter((l) => l.pacienteId === id);
      resultados.push(...doPaciente.map(lembreteNutriParaEvento));
    } catch (err) {
      console.error('[Prontuário Nutri] Erro lembretes:', err);
    }
  }

  if (!(paciente as Record<string, unknown>).bioimpedanciaRegistros) {
    try {
      const bioRegs = await buscarBioImpedanciaRegistros(id);
      if (bioRegs.length > 0) resultados.push(...extrairEventosBioimpedancia(bioRegs));
    } catch (err) {
      console.error('[Prontuário Nutri] Erro bioimpedância:', err);
    }
  }

  try {
    const sessions = await trainingSessionService.getPatientSessions(id);
    resultados.push(...trainingSessionsParaEventos(sessions));
  } catch (err) {
    console.error('[Prontuário Nutri] Erro treinos:', err);
  }

  return resultados;
}

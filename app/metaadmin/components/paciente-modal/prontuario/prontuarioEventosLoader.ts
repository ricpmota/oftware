import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PacienteCompleto } from '@/types/obesidade';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { Lembrete } from '@/types/lembrete';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import { PagamentoService } from '@/services/pagamentoService';
import { LembreteService } from '@/services/lembreteService';
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
  extrairEventosIA,
  pagamentoParaEventos,
  prescricoesParaEventos,
  progressPhotosParaEventos,
  solicitacoesExamesParaEventos,
  trainingSessionsParaEventos,
  type ProgressPhotoData,
  type SolicitacaoExameData,
} from './prontuarioEventExtractors';
import type { EventoTimelineMock } from './prontuarioTypes';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';

export type ProntuarioVisao = 'medico' | 'nutricionista';

export type CarregarProntuarioAsyncResult = {
  eventosAsync: EventoTimelineMock[];
  eventosLembretes: EventoTimelineMock[];
  prescricoesMap: Map<string, Prescricao>;
  solicitacoesExamesMap: Map<string, SolicitacaoExamesSalva>;
};

export function lembreteParaEventoTimeline(
  lembrete: Lembrete,
  origem: 'medico' | 'nutri' = 'medico'
): EventoTimelineMock {
  const [y, m, d] = lembrete.data.split('-').map(Number);
  const dataFormatada = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return {
    id: `lembrete-${lembrete.id}`,
    tipo: 'lembrete',
    titulo: `Lembrete: ${lembrete.tag}`,
    descricao: lembrete.texto,
    data: dataFormatada,
    origem,
    ...(lembrete.concluido ? { destaque: 'Realizado' } : {}),
    dados: { status: lembrete.concluido ? 'Realizado' : 'Pendente' },
  };
}

/** Eventos síncronos derivados do documento do paciente (igual metaadmin). */
export function extrairEventosSincronosPaciente(
  paciente: PacienteCompleto,
  visao: ProntuarioVisao
): EventoTimelineMock[] {
  const bioRegs = (paciente as Record<string, unknown>).bioimpedanciaRegistros as
    | BioImpedanciaRegistro[]
    | undefined;
  const base = [
    ...extrairEventosAniversario(paciente),
    ...extrairEventosAlertas(paciente),
    ...extrairEventosExamesLab(paciente),
    ...extrairEventosExamesImagem(paciente),
    ...(bioRegs ? extrairEventosBioimpedancia(bioRegs) : []),
  ];
  if (visao === 'medico') {
    base.push(...extrairEventosIA(paciente));
  }
  return base;
}

function pagamentoNutriParaEventos(pacienteId: string, pagamento: Parameters<typeof pagamentoParaEventos>[0]): EventoTimelineMock[] {
  return pagamentoParaEventos({ ...pagamento, pacienteId }).map((e) => ({
    ...e,
    id: `nutri-${e.id}`,
    origem: 'nutri' as const,
    titulo: e.titulo.startsWith('Nutri') ? e.titulo : `Nutri — ${e.titulo}`,
  }));
}

/**
 * Mesmas fontes assíncronas do ProntuarioTab (metaadmin), com variações por visão.
 * Nutricionista: pagamentos/lembretes nutri; sem IA; prescrições de todos (compartilhado).
 */
export async function carregarEventosAsyncProntuario(options: {
  paciente: PacienteCompleto;
  visao: ProntuarioVisao;
  profissionalId?: string;
}): Promise<CarregarProntuarioAsyncResult> {
  const { paciente, visao, profissionalId } = options;
  const id = paciente.id;
  const resultados: EventoTimelineMock[] = [];
  const prescricoesMap = new Map<string, Prescricao>();
  const solicitacoesExamesMap = new Map<string, SolicitacaoExamesSalva>();
  let eventosLembretes: EventoTimelineMock[] = [];

  if (!id?.trim()) {
    return { eventosAsync: [], eventosLembretes: [], prescricoesMap, solicitacoesExamesMap };
  }

  try {
    const prescricoes = await PrescricaoService.getPrescricoesByPaciente(id);
    for (const p of prescricoes) prescricoesMap.set(p.id, p);
    const eventosPresc = prescricoesParaEventos(prescricoes);
    if (visao === 'nutricionista') {
      resultados.push(
        ...eventosPresc.map((e) => ({
          ...e,
          origem: e.origem === 'medico' ? ('medico' as const) : ('nutri' as const),
        }))
      );
    } else {
      resultados.push(...eventosPresc);
    }
  } catch (err) {
    console.error('[Prontuário] Erro prescrições:', err);
  }

  try {
    if (visao === 'nutricionista' && profissionalId) {
      const pagamento = await PagamentoService.getPagamentoNutricionistaPorPaciente(profissionalId, id);
      if (pagamento) resultados.push(...pagamentoNutriParaEventos(id, pagamento));
    } else {
      const pagamento = await PagamentoService.getPagamentoPorPacienteId(id);
      if (pagamento) resultados.push(...pagamentoParaEventos(pagamento));
    }
  } catch (err) {
    console.error('[Prontuário] Erro pagamentos:', err);
  }

  if (!(paciente as Record<string, unknown>).bioimpedanciaRegistros) {
    try {
      const bioRegs = await buscarBioImpedanciaRegistros(id);
      if (bioRegs.length > 0) resultados.push(...extrairEventosBioimpedancia(bioRegs));
    } catch (err) {
      console.error('[Prontuário] Erro bioimpedância:', err);
    }
  }

  try {
    const sessions = await trainingSessionService.getPatientSessions(id);
    resultados.push(...trainingSessionsParaEventos(sessions));
  } catch (err) {
    console.error('[Prontuário] Erro treinos:', err);
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, 'pacientes_completos', id, 'progressPhotos'),
        where('compartilharComMedico', '==', true)
      )
    );
    const toMs = (value: unknown): number => {
      if (value && typeof value === 'object' && 'toDate' in value) {
        return (value as { toDate: () => Date }).toDate().getTime();
      }
      if (value instanceof Date) return value.getTime();
      return 0;
    };
    const fotos: ProgressPhotoData[] = snap.docs
      .map((d) => ({
        id: d.id,
        tipo: (d.data().tipo as string) ?? 'frontal',
        url: (d.data().url as string) ?? '',
        semana: d.data().semana as number | undefined,
        createdAt: d.data().createdAt,
        dataAplicacao: d.data().dataAplicacao,
      }))
      .sort((a, b) => toMs(b.createdAt ?? b.dataAplicacao) - toMs(a.createdAt ?? a.dataAplicacao))
      .slice(0, 30);
    resultados.push(...progressPhotosParaEventos(fotos));
  } catch (err) {
    console.error('[Prontuário] Erro fotos progresso:', err);
  }

  try {
    resultados.push(...(await buscarEventosNutricaoProntuario(id)));
  } catch (err) {
    console.error('[Prontuário] Erro eventos nutrição app:', err);
  }

  try {
    const solSnap = await getDocs(
      query(
        collection(db, 'pacientes_completos', id, 'solicitacoesExames'),
        orderBy('criadoEm', 'desc'),
        limit(30)
      )
    );
    const solicitacoes: SolicitacaoExameData[] = solSnap.docs.map((d) => {
      const data = d.data();
      const salva: SolicitacaoExamesSalva = {
        id: d.id,
        pacienteId: id,
        medicoId: (data.medicoId as string) ?? '',
        exames: (data.exames as string[]) ?? [],
        hipoteseDiagnostica: (data.hipoteseDiagnostica as string) ?? '',
        criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
      };
      solicitacoesExamesMap.set(d.id, salva);
      return {
        id: d.id,
        medicoId: salva.medicoId,
        exames: salva.exames,
        hipoteseDiagnostica: salva.hipoteseDiagnostica,
        criadoEm: data.criadoEm,
      };
    });
    resultados.push(...solicitacoesExamesParaEventos(solicitacoes));
  } catch (err) {
    console.error('[Prontuário] Erro solicitações exames:', err);
  }

  if (profissionalId) {
    try {
      if (visao === 'nutricionista') {
        const todos = await LembreteService.getLembretesPorNutricionista(profissionalId);
        const doPaciente = todos.filter((l) => l.pacienteId === id);
        eventosLembretes = doPaciente.map((l) => lembreteParaEventoTimeline(l, 'nutri'));
      } else {
        const todos = await LembreteService.getLembretesPorMedico(profissionalId);
        const doPaciente = todos.filter((l) => l.pacienteId === id);
        eventosLembretes = doPaciente.map((l) => lembreteParaEventoTimeline(l, 'medico'));
      }
    } catch (err) {
      console.error('[Prontuário] Erro lembretes:', err);
    }
  }

  return { eventosAsync: resultados, eventosLembretes, prescricoesMap, solicitacoesExamesMap };
}

export { extrairEventosAplicacoesDoPlano };

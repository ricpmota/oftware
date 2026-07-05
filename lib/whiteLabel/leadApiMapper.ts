import { Timestamp } from 'firebase-admin/firestore';
import {
  inferEspecialidade,
  parseCrmMetricsFromDoc,
  parseLeadCrmFromDoc,
  parseLeadScoreFromDoc,
} from '@/lib/whiteLabel/leadCrmMapper';

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function mapLeadWhiteLabelDoc(id: string, d: FirebaseFirestore.DocumentData) {
  const crm = parseLeadCrmFromDoc(d);
  const leadScoreDetail = parseLeadScoreFromDoc(d);
  const crmMetrics = parseCrmMetricsFromDoc(d);

  return {
    id,
    nome: d.nome || '',
    whatsapp: d.whatsapp || '',
    email: d.email || '',
    instagram: d.instagram || '',
    situacaoProfissional: d.situacaoProfissional || '',
    objetivo3Anos: d.objetivo3Anos || '',
    interesseReduzirPlantao: d.interesseReduzirPlantao || '',
    interessePlataformaMarca: d.interessePlataformaMarca || '',
    pacientesMes: d.pacientesMes || '',
    realidadeAtual: d.realidadeAtual || '',
    interesseExperienciaDigital: d.interesseExperienciaDigital || '',
    familiaridadeTecnologia: d.familiaridadeTecnologia || '',
    investimentoDisponivel: d.investimentoDisponivel || '',
    prazoInicio: d.prazoInicio || '',
    faturamentoEsperado: d.faturamentoEsperado || '',
    origem: d.origem || 'whitelabel',
    status: d.status || 'novo',
    leadScore: leadScoreDetail.score,
    leadTemperatura:
      leadScoreDetail.category === 'hot'
        ? 'quente'
        : leadScoreDetail.category === 'warm'
          ? 'morno'
          : 'frio',
    observacoes: d.observacoes || '',
    crmMedico: d.crmMedico || '',
    especialidade: inferEspecialidade(d),
    cidade: d.cidade || '',
    estado: d.estado || '',
    crm: {
      stage: crm.stage,
      owner: crm.owner || null,
      updatedAt: toIsoDate(d.crm?.updatedAt),
    },
    leadScoreDetail: {
      score: leadScoreDetail.score,
      category: leadScoreDetail.category,
      updatedAt: toIsoDate(d.leadScoreDetail?.updatedAt || d.updatedAt),
    },
    crmMetrics,
    meeting: d.meeting
      ? {
          availabilityId: d.meeting.availabilityId || '',
          date: d.meeting.date || '',
          startTime: d.meeting.startTime || '',
          endTime: d.meeting.endTime || '',
          googleCalendarEventId: d.meeting.googleCalendarEventId || undefined,
          googleMeetLink: d.meeting.googleMeetLink || undefined,
          status: d.meeting.status || 'scheduled',
          createdAt: toIsoDate(d.meeting.createdAt),
        }
      : undefined,
    createdAt: toIsoDate(d.createdAt),
    updatedAt: toIsoDate(d.updatedAt),
  };
}

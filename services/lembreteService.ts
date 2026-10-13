import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  deleteField,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildLembreteWhatsappNotifyFields } from '@/lib/lembrete/lembreteWhatsappNotify';
import {
  gerarDatasRecorrencia,
  newRecorrenciaId,
  type LembreteRecorrenciaUnidade,
} from '@/lib/lembrete/lembreteRecorrencia';
import type {
  Lembrete,
  LembreteAvisoWhatsApp,
  LembreteTag,
  LembreteWhatsappNotifyStatus,
} from '@/types/lembrete';

const COLLECTION = 'lembretes';

function docToLembrete(docSnap: { id: string; data: () => Record<string, unknown> }): Lembrete {
  const d = docSnap.data();
  const toDate = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const maybe = value as { toDate?: () => Date };
      if (typeof maybe.toDate === 'function') {
        try {
          return maybe.toDate();
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  };

  return {
    id: docSnap.id,
    medicoId: typeof d.medicoId === 'string' ? d.medicoId : undefined,
    nutricionistaId: typeof d.nutricionistaId === 'string' ? d.nutricionistaId : undefined,
    personalTrainerId: typeof d.personalTrainerId === 'string' ? d.personalTrainerId : undefined,
    pacienteId: typeof d.pacienteId === 'string' ? d.pacienteId : '',
    pacienteNome: typeof d.pacienteNome === 'string' ? d.pacienteNome : '',
    data: typeof d.data === 'string' ? d.data : '',
    horario: typeof d.horario === 'string' ? d.horario : undefined,
    avisoWhatsApp: (d.avisoWhatsApp as LembreteAvisoWhatsApp | undefined) ?? undefined,
    telefoneAviso: typeof d.telefoneAviso === 'string' ? d.telefoneAviso : undefined,
    telefoneAvisoDdi: typeof d.telefoneAvisoDdi === 'string' ? d.telefoneAvisoDdi : undefined,
    telefoneAvisoPais: typeof d.telefoneAvisoPais === 'string' ? d.telefoneAvisoPais : undefined,
    notificarPaciente: d.notificarPaciente === true,
    notificarEm: toDate(d.notificarEm),
    whatsappNotifyStatus: (d.whatsappNotifyStatus as LembreteWhatsappNotifyStatus | undefined) ?? undefined,
    whatsappNotificadoEm: toDate(d.whatsappNotificadoEm),
    whatsappNotifyError:
      typeof d.whatsappNotifyError === 'string' ? d.whatsappNotifyError : undefined,
    texto: typeof d.texto === 'string' ? d.texto : '',
    tag: (d.tag as LembreteTag) ?? 'Consulta',
    origem: typeof d.origem === 'string' ? d.origem : undefined,
    criadoEm: toDate(d.criadoEm) ?? new Date(),
    concluido: d.concluido === true,
    recorrenciaId: typeof d.recorrenciaId === 'string' ? d.recorrenciaId : undefined,
    recorrenciaIntervalo:
      typeof d.recorrenciaIntervalo === 'number' ? d.recorrenciaIntervalo : undefined,
    recorrenciaUnidade:
      d.recorrenciaUnidade === 'semanas' || d.recorrenciaUnidade === 'meses'
        ? d.recorrenciaUnidade
        : undefined,
    recorrenciaQuantidade:
      typeof d.recorrenciaQuantidade === 'number' ? d.recorrenciaQuantidade : undefined,
    recorrenciaDataFinal:
      typeof d.recorrenciaDataFinal === 'string' ? d.recorrenciaDataFinal : undefined,
  };
}

function serializeNotifyFieldsForCreate(lembrete: {
  data: string;
  horario?: string;
  avisoWhatsApp?: LembreteAvisoWhatsApp;
  telefoneAviso?: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
  notificarPaciente?: boolean;
}): Record<string, unknown> {
  const fields = buildLembreteWhatsappNotifyFields(lembrete);
  const out: Record<string, unknown> = {
    avisoWhatsApp: fields.avisoWhatsApp ?? 'disabled',
    whatsappNotifyStatus: fields.whatsappNotifyStatus ?? 'skipped',
    notificarPaciente: lembrete.notificarPaciente === true,
  };
  if (fields.horario) out.horario = fields.horario;
  if (fields.notificarEm) out.notificarEm = Timestamp.fromDate(fields.notificarEm);
  const tel = lembrete.telefoneAviso?.replace(/\D/g, '').trim();
  if (tel && fields.avisoWhatsApp !== 'disabled') {
    out.telefoneAviso = tel;
    const ddi = lembrete.telefoneAvisoDdi?.replace(/\D/g, '').trim();
    if (ddi) {
      out.telefoneAvisoDdi = ddi;
      const pais = lembrete.telefoneAvisoPais?.trim();
      if (pais) out.telefoneAvisoPais = pais;
    }
  }
  return out;
}

function serializeNotifyFieldsForUpdate(lembrete: {
  data: string;
  horario?: string;
  avisoWhatsApp?: LembreteAvisoWhatsApp;
  telefoneAviso?: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
  notificarPaciente?: boolean;
}): Record<string, unknown> {
  const fields = buildLembreteWhatsappNotifyFields(lembrete);
  const tel = lembrete.telefoneAviso?.replace(/\D/g, '').trim();
  const ddi = lembrete.telefoneAvisoDdi?.replace(/\D/g, '').trim();
  const pais = lembrete.telefoneAvisoPais?.trim();
  return {
    horario: fields.horario ?? deleteField(),
    avisoWhatsApp: fields.avisoWhatsApp ?? 'disabled',
    telefoneAviso:
      tel && fields.avisoWhatsApp !== 'disabled' ? tel : deleteField(),
    telefoneAvisoDdi:
      tel && ddi && fields.avisoWhatsApp !== 'disabled' ? ddi : deleteField(),
    telefoneAvisoPais:
      tel && ddi && pais && fields.avisoWhatsApp !== 'disabled' ? pais : deleteField(),
    notificarPaciente: lembrete.notificarPaciente === true,
    notificarEm: fields.notificarEm ? Timestamp.fromDate(fields.notificarEm) : deleteField(),
    whatsappNotifyStatus: fields.whatsappNotifyStatus ?? 'skipped',
    whatsappNotifyError: deleteField(),
    whatsappNotificadoEm: deleteField(),
  };
}

export type LembreteWritableFields = Pick<
  Lembrete,
  | 'pacienteId'
  | 'pacienteNome'
  | 'data'
  | 'texto'
  | 'tag'
  | 'horario'
  | 'avisoWhatsApp'
  | 'telefoneAviso'
  | 'telefoneAvisoDdi'
  | 'telefoneAvisoPais'
  | 'notificarPaciente'
  | 'recorrenciaId'
  | 'recorrenciaIntervalo'
  | 'recorrenciaUnidade'
>;

export const LembreteService = {
  async getLembretesPorMedico(medicoId: string): Promise<Lembrete[]> {
    const q = query(collection(db, COLLECTION), where('medicoId', '==', medicoId));
    const snap = await getDocs(q);
    const result = snap.docs.map(docToLembrete);
    result.sort((a, b) => {
      const byDate = a.data.localeCompare(b.data);
      if (byDate !== 0) return byDate;
      return (a.horario ?? '').localeCompare(b.horario ?? '');
    });
    return result;
  },

  async getLembretesPorNutricionista(nutricionistaId: string): Promise<Lembrete[]> {
    const q = query(collection(db, COLLECTION), where('nutricionistaId', '==', nutricionistaId));
    const snap = await getDocs(q);
    const result = snap.docs.map(docToLembrete);
    result.sort((a, b) => {
      const byDate = a.data.localeCompare(b.data);
      if (byDate !== 0) return byDate;
      return (a.horario ?? '').localeCompare(b.horario ?? '');
    });
    return result;
  },

  async getLembretesPorPersonalTrainer(personalTrainerId: string): Promise<Lembrete[]> {
    const q = query(collection(db, COLLECTION), where('personalTrainerId', '==', personalTrainerId));
    const snap = await getDocs(q);
    const result = snap.docs.map(docToLembrete);
    result.sort((a, b) => {
      const byDate = a.data.localeCompare(b.data);
      if (byDate !== 0) return byDate;
      return (a.horario ?? '').localeCompare(b.horario ?? '');
    });
    return result;
  },

  async criarLembrete(
    dados: Omit<
      Lembrete,
      | 'id'
      | 'criadoEm'
      | 'notificarEm'
      | 'whatsappNotifyStatus'
      | 'whatsappNotificadoEm'
      | 'whatsappNotifyError'
    > & {
      horario?: string;
      avisoWhatsApp?: LembreteAvisoWhatsApp;
    },
  ): Promise<string> {
    const notify = serializeNotifyFieldsForCreate({
      data: dados.data,
      horario: dados.horario,
      avisoWhatsApp: dados.avisoWhatsApp,
      telefoneAviso: dados.telefoneAviso,
      telefoneAvisoDdi: dados.telefoneAvisoDdi,
      telefoneAvisoPais: dados.telefoneAvisoPais,
      notificarPaciente: dados.notificarPaciente,
    });
    const payload: Record<string, unknown> = {
      medicoId: dados.medicoId ?? null,
      nutricionistaId: dados.nutricionistaId ?? null,
      personalTrainerId: dados.personalTrainerId ?? null,
      pacienteId: dados.pacienteId,
      pacienteNome: dados.pacienteNome,
      data: dados.data,
      texto: dados.texto,
      tag: dados.tag,
      concluido: dados.concluido ?? false,
      criadoEm: Timestamp.now(),
      ...notify,
    };
    if (dados.recorrenciaId) {
      payload.recorrenciaId = dados.recorrenciaId;
      payload.recorrenciaIntervalo = dados.recorrenciaIntervalo ?? null;
      payload.recorrenciaUnidade = dados.recorrenciaUnidade ?? null;
      payload.origem = dados.origem ?? 'recorrencia';
    } else if (dados.origem) {
      payload.origem = dados.origem;
    }
    const docRef = await addDoc(collection(db, COLLECTION), payload);
    return docRef.id;
  },

  async criarSerieRecorrente(dados: {
    medicoId?: string;
    nutricionistaId?: string;
    personalTrainerId?: string;
    pacienteId: string;
    pacienteNome: string;
    texto: string;
    tag: LembreteTag;
    dataInicio: string;
    horario?: string;
    avisoWhatsApp?: LembreteAvisoWhatsApp;
    telefoneAviso?: string;
    telefoneAvisoDdi?: string;
    telefoneAvisoPais?: string;
    notificarPaciente?: boolean;
    intervalo: number;
    unidade: LembreteRecorrenciaUnidade;
    quantidade?: number;
    dataFinal?: string;
  }): Promise<Lembrete[]> {
    const datas = gerarDatasRecorrencia({
      dataInicio: dados.dataInicio,
      intervalo: dados.intervalo,
      unidade: dados.unidade,
      quantidade: dados.quantidade,
      dataFinal: dados.dataFinal,
    });
    if (datas.length === 0) return [];
    const recorrenciaId = newRecorrenciaId();
    const batch = writeBatch(db);
    const criados: Lembrete[] = [];
    const agora = new Date();
    for (const data of datas) {
      const ref = doc(collection(db, COLLECTION));
      const notify = serializeNotifyFieldsForCreate({
        data,
        horario: dados.horario,
        avisoWhatsApp: dados.avisoWhatsApp,
        telefoneAviso: dados.telefoneAviso,
        telefoneAvisoDdi: dados.telefoneAvisoDdi,
        telefoneAvisoPais: dados.telefoneAvisoPais,
        notificarPaciente: dados.notificarPaciente,
      });
      batch.set(ref, {
        medicoId: dados.medicoId ?? null,
        nutricionistaId: dados.nutricionistaId ?? null,
        personalTrainerId: dados.personalTrainerId ?? null,
        pacienteId: dados.pacienteId,
        pacienteNome: dados.pacienteNome,
        data,
        texto: dados.texto,
        tag: dados.tag,
        concluido: false,
        criadoEm: Timestamp.fromDate(agora),
        origem: 'recorrencia',
        recorrenciaId,
        recorrenciaIntervalo: dados.intervalo,
        recorrenciaUnidade: dados.unidade,
        ...(dados.quantidade ? { recorrenciaQuantidade: dados.quantidade } : {}),
        ...(dados.dataFinal ? { recorrenciaDataFinal: dados.dataFinal } : {}),
        ...notify,
      });
      criados.push({
        id: ref.id,
        medicoId: dados.medicoId,
        nutricionistaId: dados.nutricionistaId,
        personalTrainerId: dados.personalTrainerId,
        pacienteId: dados.pacienteId,
        pacienteNome: dados.pacienteNome,
        data,
        horario: (notify.horario as string | undefined) ?? dados.horario,
        avisoWhatsApp: dados.avisoWhatsApp,
        telefoneAviso: dados.telefoneAviso,
        telefoneAvisoDdi: dados.telefoneAvisoDdi,
        telefoneAvisoPais: dados.telefoneAvisoPais,
        notificarPaciente: dados.notificarPaciente === true,
        texto: dados.texto,
        tag: dados.tag,
        origem: 'recorrencia',
        criadoEm: agora,
        concluido: false,
        recorrenciaId,
        recorrenciaIntervalo: dados.intervalo,
        recorrenciaUnidade: dados.unidade,
        recorrenciaQuantidade: dados.quantidade,
        recorrenciaDataFinal: dados.dataFinal,
      });
    }
    await batch.commit();
    return criados;
  },

  async toggleConcluido(lembreteId: string, concluido: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, lembreteId), { concluido });
  },

  async atualizarLembrete(lembreteId: string, dados: LembreteWritableFields): Promise<void> {
    const notify = serializeNotifyFieldsForUpdate({
      data: dados.data,
      horario: dados.horario,
      avisoWhatsApp: dados.avisoWhatsApp,
      telefoneAviso: dados.telefoneAviso,
      telefoneAvisoDdi: dados.telefoneAvisoDdi,
      telefoneAvisoPais: dados.telefoneAvisoPais,
      notificarPaciente: dados.notificarPaciente,
    });
    await updateDoc(doc(db, COLLECTION, lembreteId), {
      pacienteId: dados.pacienteId,
      pacienteNome: dados.pacienteNome,
      data: dados.data,
      texto: dados.texto,
      tag: dados.tag,
      ...notify,
    });
  },

  async deletarLembrete(lembreteId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, lembreteId));
  },

  async deletarLembretes(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(db, COLLECTION, id));
    }
    await batch.commit();
  },
};

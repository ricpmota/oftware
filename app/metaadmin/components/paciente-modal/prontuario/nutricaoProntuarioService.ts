import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EventoTimelineMock } from './prontuarioTypes';

const COL_PACIENTES = 'pacientes_completos';

const ESTILO_LABEL: Record<string, string> = {
  digestiva: 'Digestiva',
  plant_based: 'Plant based',
  mediterranea: 'Mediterrânea',
  rico_proteina: 'Rica em proteína',
  low_carb_moderada: 'Low carb moderada',
};

export type NutricaoCheckInFirestore = {
  data: string;
  score?: number;
  aderenciaPlano?: number;
  proteinaOk?: boolean;
  frutasOk?: boolean;
  aguaOk?: boolean;
  lixoAlimentar?: boolean;
  sintomasGI?: string;
  humorEnergia?: number;
  horasSono?: string;
  observacoes?: string;
  pesoHoje?: number | null;
  timestamp?: unknown;
};

type PlanoNutricionalFirestore = {
  estilo?: string;
  protDia_g?: number;
  aguaDia_ml?: number;
  criadoEm?: unknown;
  descricaoEstilo?: string;
  hipoteseComportamental?: string;
  opcoesSelecionadas?: Record<string, string>;
  itensCustomizadosPorRefeicao?: Record<string, unknown[]>;
  opcoesCustomizadas?: Record<string, unknown[]>;
  macrosPorRefeicao?: Record<string, unknown>;
};

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    const d = (val as { toDate: () => Date }).toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmtDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function dataDeChaveOuCampo(docId: string, dataField?: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(docId)) {
    const [y, m, d] = docId.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (dataField && /^\d{4}-\d{2}-\d{2}$/.test(dataField)) {
    const [y, m, d] = dataField.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

function planoTemCardapioPersonalizado(plano: PlanoNutricionalFirestore): boolean {
  if (plano.opcoesSelecionadas && Object.keys(plano.opcoesSelecionadas).length > 0) return true;
  if (plano.itensCustomizadosPorRefeicao && Object.keys(plano.itensCustomizadosPorRefeicao).length > 0) {
    return Object.values(plano.itensCustomizadosPorRefeicao).some((arr) => (arr?.length ?? 0) > 0);
  }
  if (plano.opcoesCustomizadas && Object.keys(plano.opcoesCustomizadas).length > 0) {
    return Object.values(plano.opcoesCustomizadas).some((arr) => (arr?.length ?? 0) > 0);
  }
  if (plano.macrosPorRefeicao && Object.keys(plano.macrosPorRefeicao).length > 0) return true;
  return false;
}

function resumirCheckIn(c: NutricaoCheckInFirestore): string {
  const partes: string[] = [];
  if (c.score != null) partes.push(`Score ${Math.round(c.score)}`);
  if (c.aderenciaPlano != null) partes.push(`Aderência ${c.aderenciaPlano}%`);
  const alimentacao: string[] = [];
  if (c.proteinaOk) alimentacao.push('proteína');
  if (c.frutasOk) alimentacao.push('frutas');
  if (c.aguaOk) alimentacao.push('água');
  if (alimentacao.length) partes.push(alimentacao.join(', '));
  if (c.lixoAlimentar) partes.push('lixo alimentar');
  if (c.sintomasGI && c.sintomasGI !== 'nenhum') partes.push(`GI: ${c.sintomasGI}`);
  if (c.humorEnergia != null) partes.push(`humor ${c.humorEnergia}/5`);
  if (c.horasSono) partes.push(`sono ${c.horasSono}`);
  if (c.pesoHoje != null) partes.push(`${c.pesoHoje} kg`);
  if (c.observacoes?.trim()) partes.push(c.observacoes.trim().slice(0, 120));
  return partes.join(' · ') || 'Check-in registrado pelo paciente.';
}

export function planoNutricionalParaEventos(
  plano: PlanoNutricionalFirestore,
  criadoEm: Date
): EventoTimelineMock[] {
  const eventos: EventoTimelineMock[] = [];
  const estilo = ESTILO_LABEL[plano.estilo ?? ''] ?? plano.estilo ?? 'Personalizado';
  const data = fmtDDMMYYYY(criadoEm);

  const descPlano: string[] = [
    `Perfil: ${estilo}`,
    plano.protDia_g != null ? `Meta proteína: ${Math.round(plano.protDia_g)} g/dia` : '',
    plano.aguaDia_ml != null ? `Meta água: ${(plano.aguaDia_ml / 1000).toFixed(1)} L/dia` : '',
  ].filter(Boolean);

  if (plano.hipoteseComportamental?.trim()) {
    const h = plano.hipoteseComportamental.trim();
    descPlano.push(h.length > 200 ? `${h.slice(0, 200)}…` : h);
  }

  eventos.push({
    id: 'nutricao-anamnese-plano',
    tipo: 'nutricao',
    titulo: 'Anamnese nutricional concluída',
    descricao: descPlano.join(' · '),
    data,
    origem: 'paciente',
    destaque: 'Plano Nutri criado',
    dados: { status: 'Anamnese / plano inicial' },
  });

  if (planoTemCardapioPersonalizado(plano)) {
    eventos.push({
      id: 'nutricao-cardapio-configurado',
      tipo: 'nutricao',
      titulo: 'Cardápio personalizado',
      descricao:
        'Paciente montou ou ajustou o cardápio (refeições e opções) no módulo Nutri.',
      data,
      origem: 'paciente',
      destaque: 'Cardápio ativo',
      dados: { status: 'Cardápio configurado' },
    });
  }

  return eventos;
}

export function checkInsNutricaoParaEventos(checkIns: NutricaoCheckInFirestore[]): EventoTimelineMock[] {
  return checkIns.map((c) => {
    const dt =
      dataDeChaveOuCampo(c.data, c.data) ??
      toDate(c.timestamp) ??
      new Date();
    return {
      id: `nutricao-checkin-${c.data}`,
      tipo: 'nutricao',
      titulo: 'Check-in nutricional',
      descricao: resumirCheckIn(c),
      data: fmtDDMMYYYY(dt),
      origem: 'paciente',
      destaque: c.score != null ? `Score ${Math.round(c.score)}` : undefined,
      dados: {
        status: 'Check-in diário',
        ...(c.pesoHoje != null ? { peso: `${c.pesoHoje} kg` } : {}),
      },
    };
  });
}

export function diasChatNutriParaEventos(dateKeys: string[]): EventoTimelineMock[] {
  return dateKeys
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 40)
    .map((dateKey) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        id: `nutricao-chatnutri-${dateKey}`,
        tipo: 'nutricao',
        titulo: 'ChatNutri utilizado',
        descricao: 'Paciente interagiu com o assistente nutricional (mensagens ou análise de refeição).',
        data: fmtDDMMYYYY(dt),
        origem: 'paciente',
        destaque: 'ChatNutri',
        dados: { status: 'Uso do ChatNutri' },
      };
    });
}

/**
 * Carrega eventos de Nutrição do paciente para a timeline do prontuário (médico).
 */
export async function buscarEventosNutricaoProntuario(pacienteId: string): Promise<EventoTimelineMock[]> {
  if (!pacienteId?.trim()) return [];

  const eventos: EventoTimelineMock[] = [];

  const planoSnap = await getDoc(doc(db, COL_PACIENTES, pacienteId, 'nutricao', 'plano'));
  if (planoSnap.exists()) {
    const plano = planoSnap.data() as PlanoNutricionalFirestore;
    const criadoEm = toDate(plano.criadoEm) ?? new Date();
    eventos.push(...planoNutricionalParaEventos(plano, criadoEm));
  }

  const checkInsSnap = await getDocs(
    collection(db, COL_PACIENTES, pacienteId, 'nutricao', 'dados', 'checkins')
  );
  const checkIns: NutricaoCheckInFirestore[] = checkInsSnap.docs.map((docSnap) => {
    const data = docSnap.data();
    const dataCheckIn = /^\d{4}-\d{2}-\d{2}$/.test(docSnap.id)
      ? docSnap.id
      : (data.data as string) || docSnap.id;
    return {
      data: dataCheckIn,
      score: data.score as number | undefined,
      aderenciaPlano: data.aderenciaPlano as number | undefined,
      proteinaOk: data.proteinaOk as boolean | undefined,
      frutasOk: data.frutasOk as boolean | undefined,
      aguaOk: data.aguaOk as boolean | undefined,
      lixoAlimentar: data.lixoAlimentar as boolean | undefined,
      sintomasGI: data.sintomasGI as string | undefined,
      humorEnergia: data.humorEnergia as number | undefined,
      horasSono: data.horasSono as string | undefined,
      observacoes: data.observacoes as string | undefined,
      pesoHoje: data.pesoHoje as number | null | undefined,
      timestamp: data.timestamp,
    };
  });

  checkIns.sort((a, b) => b.data.localeCompare(a.data));
  eventos.push(...checkInsNutricaoParaEventos(checkIns.slice(0, 90)));

  const chatDayKeys = new Set<string>();

  const pacienteSnap = await getDoc(doc(db, COL_PACIENTES, pacienteId));
  const datasFotos = pacienteSnap.data()?.chatNutriDatasComFotos;
  if (Array.isArray(datasFotos)) {
    for (const k of datasFotos) {
      if (typeof k === 'string') chatDayKeys.add(k);
    }
  }

  const chatSnap = await getDocs(collection(db, COL_PACIENTES, pacienteId, 'chatNutri'));
  chatSnap.docs.forEach((d) => chatDayKeys.add(d.id));

  eventos.push(...diasChatNutriParaEventos([...chatDayKeys]));

  return eventos;
}

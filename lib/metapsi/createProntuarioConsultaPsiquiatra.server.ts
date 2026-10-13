/**
 * Persistência server-side de consulta Psi na timeline transversal.
 * Path: pacientes_completos/{pacienteId}/timeline/{eventoId}
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PSIQUIATRAS } from '@/features/metaPsi/metaPsi.constants';
import { hasActivePsiquiatraAccessAdmin } from '@/lib/metapsi/hasActivePsiquiatraAccess.server';
import {
  formatDataHoraConsultaPsi,
  formatPsiquiatraAutorSnapshot,
  isTipoRegistroConsultaPsi,
  montarDadosConsultaPsi,
  montarDescricaoConsultaPsi,
  montarTituloConsultaPsi,
  temInformacaoClinicaConsultaPsi,
  type ProntuarioConsultaPsiPayload,
} from '@/lib/metapsi/prontuarioConsultaPsiquiatra';

const COL_PACIENTES = 'pacientes_completos';
const SUB_TIMELINE = 'timeline';

export type CreateProntuarioConsultaPsiquiatraResult = {
  eventoId: string;
  pacienteId: string;
  tipo: 'consulta';
  origem: 'psiquiatra';
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  destaque?: string;
  dados: ReturnType<typeof montarDadosConsultaPsi>;
  psiquiatraId: string;
  psiquiatraNome: string;
};

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }
  return cleaned;
}

export async function createProntuarioConsultaPsiquiatra(params: {
  pacienteId: string;
  psiquiatraId: string;
  payload: ProntuarioConsultaPsiPayload;
}): Promise<CreateProntuarioConsultaPsiquiatraResult> {
  const pacienteId = String(params.pacienteId || '').trim();
  const psiquiatraId = String(params.psiquiatraId || '').trim();
  if (!pacienteId) throw new Error('pacienteId é obrigatório.');
  if (!psiquiatraId) throw new Error('psiquiatraId é obrigatório.');

  const allowed = await hasActivePsiquiatraAccessAdmin(pacienteId, psiquiatraId);
  if (!allowed) {
    throw Object.assign(new Error('Sem compartilhamento ativo deste paciente.'), {
      status: 403,
    });
  }

  const payload = params.payload || {};
  const tipoRegistro = String(payload.tipoRegistro || 'consulta').trim() || 'consulta';
  if (!isTipoRegistroConsultaPsi(tipoRegistro)) {
    throw Object.assign(new Error('Tipo de registro inválido.'), { status: 400 });
  }
  if (!temInformacaoClinicaConsultaPsi(payload)) {
    throw Object.assign(
      new Error('Preencha pelo menos uma informação clínica antes de salvar.'),
      { status: 400 }
    );
  }

  const db = getFirestoreAdmin();
  const psiSnap = await db.collection(COL_PSIQUIATRAS).doc(psiquiatraId).get();
  if (!psiSnap.exists) {
    throw Object.assign(new Error('Psiquiatra não encontrado.'), { status: 403 });
  }
  const psi = psiSnap.data() || {};
  const psiquiatraNome = formatPsiquiatraAutorSnapshot({
    nome: typeof psi.nome === 'string' ? psi.nome : '',
    genero: psi.genero === 'M' || psi.genero === 'F' || psi.genero === '' ? psi.genero : '',
    registroNumero: typeof psi.registroNumero === 'string' ? psi.registroNumero : '',
    crmUf: typeof psi.crmUf === 'string' ? psi.crmUf : '',
  });

  const { data, hora } = formatDataHoraConsultaPsi(payload.dataRegistro);
  const titulo = montarTituloConsultaPsi(tipoRegistro);
  const descricao = montarDescricaoConsultaPsi(payload);
  const dados = montarDadosConsultaPsi(payload);
  const temAjuste = Boolean(
    String(payload.doseAtual || '').trim() || String(payload.proximaDose || '').trim()
  );
  const destaque = temAjuste ? 'Ajuste terapêutico registrado' : undefined;

  const docPayload = removeUndefined({
    pacienteId,
    tipo: 'consulta' as const,
    titulo,
    descricao,
    data,
    hora,
    origem: 'psiquiatra' as const,
    destaque,
    dados,
    psiquiatraId,
    psiquiatraNome,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
    ativo: true,
  });

  const ref = await db.collection(COL_PACIENTES).doc(pacienteId).collection(SUB_TIMELINE).add(docPayload);

  return {
    eventoId: ref.id,
    pacienteId,
    tipo: 'consulta',
    origem: 'psiquiatra',
    titulo,
    descricao,
    data,
    hora,
    destaque,
    dados,
    psiquiatraId,
    psiquiatraNome,
  };
}

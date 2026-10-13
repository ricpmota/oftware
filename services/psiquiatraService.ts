/**
 * Serviço da identidade profissional do Psiquiatra (`psiquiatras/{authUid}`).
 * Não consulta nutricionistas nem personal_trainers.
 */

import { auth, db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import {
  COL_PSIQUIATRAS,
  PSIQUIATRA_ESPECIALIDADE,
  PSIQUIATRA_STATUS,
} from '@/features/metaPsi/metaPsi.constants';
import { MedicoService } from './medicoService';
import { optionalProfessionalDdiPais } from '@/lib/whatsapp/resolveProfessionalPhone';

/** Patch de aprovação administrativa — apenas `psiquiatras/{uid}`. */
export function psiquiatraApprovalPatch(): { isVerificado: true; status: typeof PSIQUIATRA_STATUS.ATIVO } {
  return {
    isVerificado: true,
    status: PSIQUIATRA_STATUS.ATIVO,
  };
}

/** Validação leve do UID alvo. Autoaprovação permitida (testes / gestor com perfil Psi). */
export function assertCanApprovePsiquiatra(
  _approverUid: string | null | undefined,
  targetUserId: string
): void {
  const target = String(targetUserId || '').trim();
  if (!target) throw new Error('UID inválido.');
}

export function formatPsiquiatraRegistroAdmin(
  psi: Pick<PsiquiatraDoc, 'registroNumero' | 'crmUf'>
): string {
  const crm = String(psi.registroNumero || '').trim();
  const uf = String(psi.crmUf || '').trim();
  if (!crm && !uf) return 'N/A';
  if (crm && uf) return `${crm} / ${uf}`;
  return crm || uf;
}

export function psiquiatraMatchesAdminSearch(
  psi: Pick<PsiquiatraDoc, 'nome' | 'email' | 'registroNumero'>,
  queryText: string
): boolean {
  const q = String(queryText || '').trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const crm = String(psi.registroNumero || '');
  return (
    String(psi.nome || '').toLowerCase().includes(q) ||
    String(psi.email || '').toLowerCase().includes(q) ||
    crm.toLowerCase().includes(q) ||
    (digits.length > 0 && crm.replace(/\D/g, '').includes(digits))
  );
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      const d = maybe.toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

export function isPsiquiatraElegivelParaVinculo(
  psi: Pick<PsiquiatraDoc, 'isVerificado' | 'status'> | null | undefined
): boolean {
  if (!psi) return false;
  return psi.isVerificado === true && psi.status === PSIQUIATRA_STATUS.ATIVO;
}

export function mapPsiquiatraFromFirestore(id: string, data: Record<string, unknown>): PsiquiatraDoc {
  return {
    id,
    userId: String(data.userId || id),
    email: String(data.email || ''),
    nome: String(data.nome || ''),
    registroNumero: String(data.registroNumero || ''),
    crmUf: String(data.crmUf || ''),
    rqe: String(data.rqe || ''),
    especialidade: String(data.especialidade || PSIQUIATRA_ESPECIALIDADE),
    telefone: String(data.telefone || ''),
    ...optionalProfessionalDdiPais(data),
    cidades: Array.isArray(data.cidades) ? (data.cidades as PsiquiatraDoc['cidades']) : [],
    isVerificado: Boolean(data.isVerificado),
    status: data.status === PSIQUIATRA_STATUS.ATIVO ? PSIQUIATRA_STATUS.ATIVO : PSIQUIATRA_STATUS.INATIVO,
    medicoVinculadoIds: Array.isArray(data.medicoVinculadoIds)
      ? (data.medicoVinculadoIds as string[])
      : [],
    dataCadastro: toDate(data.dataCadastro),
    docVerificacaoCnhUrl: typeof data.docVerificacaoCnhUrl === 'string' ? data.docVerificacaoCnhUrl : '',
    docVerificacaoSelfieUrl:
      typeof data.docVerificacaoSelfieUrl === 'string' ? data.docVerificacaoSelfieUrl : '',
    docVerificacaoRegistroUrl:
      typeof data.docVerificacaoRegistroUrl === 'string' ? data.docVerificacaoRegistroUrl : '',
    genero: data.genero === 'M' || data.genero === 'F' ? data.genero : '',
    instagramUsuario: typeof data.instagramUsuario === 'string' ? data.instagramUsuario : '',
    cep: typeof data.cep === 'string' ? data.cep : '',
    nomeLocal: typeof data.nomeLocal === 'string' ? data.nomeLocal : '',
    endereco: typeof data.endereco === 'string' ? data.endereco : '',
    numero: typeof data.numero === 'string' ? data.numero : '',
    pontoReferencia: typeof data.pontoReferencia === 'string' ? data.pontoReferencia : '',
    googleMapsUrl: typeof data.googleMapsUrl === 'string' ? data.googleMapsUrl : '',
    fotoPerfilUrl: typeof data.fotoPerfilUrl === 'string' ? data.fotoPerfilUrl : null,
    organizationId: (data.organizationId as string | null | undefined) ?? null,
    metodoImagensAtivo: (data.metodoImagensAtivo as boolean | null | undefined) ?? null,
  };
}

export class PsiquiatraService {
  static async getPsiquiatraByUserId(userId: string): Promise<PsiquiatraDoc | null> {
    const uid = String(userId || '').trim();
    if (!uid) return null;
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return mapPsiquiatraFromFirestore(docSnap.id, docSnap.data() as Record<string, unknown>);
  }

  static async createOrUpdatePsiquiatra(
    userId: string,
    email: string,
    nome: string
  ): Promise<PsiquiatraDoc> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');

    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const novo: Omit<PsiquiatraDoc, 'id'> = {
        userId: uid,
        email,
        nome,
        registroNumero: '',
        crmUf: '',
        rqe: '',
        especialidade: PSIQUIATRA_ESPECIALIDADE,
        telefone: '',
        cidades: [],
        isVerificado: false,
        status: PSIQUIATRA_STATUS.INATIVO,
        medicoVinculadoIds: [],
        dataCadastro: new Date(),
      };

      await setDoc(docRef, {
        ...novo,
        ...shadowOrganizationFields(),
        dataCadastro: Timestamp.fromDate(novo.dataCadastro),
      });

      return { id: uid, ...novo };
    }

    const data = docSnap.data() as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (!Object.prototype.hasOwnProperty.call(data, 'registroNumero')) updates.registroNumero = '';
    if (!Object.prototype.hasOwnProperty.call(data, 'crmUf')) updates.crmUf = '';
    if (!Object.prototype.hasOwnProperty.call(data, 'rqe')) updates.rqe = '';
    if (!Object.prototype.hasOwnProperty.call(data, 'especialidade')) {
      updates.especialidade = PSIQUIATRA_ESPECIALIDADE;
    }
    if (!Object.prototype.hasOwnProperty.call(data, 'telefone')) updates.telefone = '';
    if (!Object.prototype.hasOwnProperty.call(data, 'cidades')) updates.cidades = [];
    if (!Object.prototype.hasOwnProperty.call(data, 'isVerificado')) updates.isVerificado = false;
    if (!Object.prototype.hasOwnProperty.call(data, 'status')) updates.status = PSIQUIATRA_STATUS.INATIVO;
    if (!Object.prototype.hasOwnProperty.call(data, 'medicoVinculadoIds')) updates.medicoVinculadoIds = [];
    if (!Object.prototype.hasOwnProperty.call(data, 'dataCadastro')) {
      updates.dataCadastro = Timestamp.fromDate(new Date());
    }
    if (data.email !== email) updates.email = email;
    if (data.nome !== nome && nome) updates.nome = nome;

    if (Object.keys(updates).length > 0) {
      await updateDoc(docRef, updates);
    }

    return mapPsiquiatraFromFirestore(docSnap.id, { ...data, ...updates, email, nome: nome || data.nome });
  }

  static async updatePerfil(
    userId: string,
    registroNumero: string,
    telefone: string,
    cidades: { estado: string; cidade: string }[],
    extra?: {
      crmUf?: string;
      rqe?: string;
      genero?: 'M' | 'F' | '';
      instagramUsuario?: string;
      cep?: string;
      nomeLocal?: string;
      endereco?: string;
      numero?: string;
      pontoReferencia?: string;
      googleMapsUrl?: string;
      fotoPerfilUrl?: string | null;
      nome?: string;
      telefoneDdi?: string;
      telefonePais?: string;
    }
  ): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    const extraRest = extra ? { ...extra } : {};
    const ddi = extraRest.telefoneDdi?.trim();
    const pais = extraRest.telefonePais?.trim();
    delete extraRest.telefoneDdi;
    delete extraRest.telefonePais;
    await updateDoc(docRef, {
      registroNumero,
      telefone,
      cidades,
      especialidade: PSIQUIATRA_ESPECIALIDADE,
      ...extraRest,
      ...(ddi ? { telefoneDdi: ddi, telefonePais: pais || null } : {}),
    });
  }

  static async updateFotoPerfil(userId: string, fotoPerfilUrl: string | null): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    await updateDoc(docRef, { fotoPerfilUrl: fotoPerfilUrl?.trim() || null });
  }

  static async updateCadastroVerificacao(
    userId: string,
    data: {
      nome: string;
      telefone: string;
      registroNumero: string;
      crmUf?: string;
      cidades: { estado: string; cidade: string }[];
      docVerificacaoCnhUrl?: string | null;
      docVerificacaoSelfieUrl?: string | null;
      docVerificacaoRegistroUrl?: string | null;
      telefoneDdi?: string;
      telefonePais?: string;
    }
  ): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    await updateDoc(docRef, {
      nome: data.nome,
      telefone: data.telefone,
      registroNumero: data.registroNumero,
      crmUf: data.crmUf || '',
      cidades: data.cidades,
      especialidade: PSIQUIATRA_ESPECIALIDADE,
      docVerificacaoCnhUrl: data.docVerificacaoCnhUrl ?? null,
      docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl ?? null,
      docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl ?? null,
      ...(data.telefoneDdi?.trim()
        ? { telefoneDdi: data.telefoneDdi.trim(), telefonePais: data.telefonePais?.trim() || null }
        : {}),
    });
  }

  static async getAllPsiquiatras(): Promise<PsiquiatraDoc[]> {
    try {
      try {
        const q = query(collection(db, COL_PSIQUIATRAS), orderBy('dataCadastro', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((docSnap) =>
          mapPsiquiatraFromFirestore(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
      } catch (e) {
        console.warn('[getAllPsiquiatras] fallback sem orderBy', e);
        const snap = await getDocs(collection(db, COL_PSIQUIATRAS));
        return snap.docs.map((docSnap) =>
          mapPsiquiatraFromFirestore(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
      }
    } catch (error) {
      console.error('Erro ao listar psiquiatras:', error);
      throw error;
    }
  }

  /** Psiquiatras verificados + ativos (elegíveis a novo vínculo). */
  static async getPsiquiatrasElegiveisParaVinculo(): Promise<PsiquiatraDoc[]> {
    const all = await this.getAllPsiquiatras();
    return all.filter((p) => isPsiquiatraElegivelParaVinculo(p));
  }

  /**
   * Lista psiquiatras que listam o médico em medicoVinculadoIds
   * (aceita doc id ou userId do médico).
   */
  static async getPsiquiatrasVinculadosAoMedico(medicoId: string): Promise<PsiquiatraDoc[]> {
    const medicoIdNorm = String(medicoId || '').trim();
    if (!medicoIdNorm) return [];

    let medicoKeys = [medicoIdNorm];
    try {
      const byId = await MedicoService.getMedicoById(medicoIdNorm).catch(() => null);
      const byUid = byId || (await MedicoService.getMedicoByUserId(medicoIdNorm).catch(() => null));
      if (byUid) {
        medicoKeys = Array.from(
          new Set(
            [byUid.id, byUid.userId, medicoIdNorm].map((x) => String(x || '').trim()).filter(Boolean)
          )
        );
      }
    } catch {
      /* keep medicoIdNorm */
    }

    const all = await this.getAllPsiquiatras();
    return all.filter((psi) => {
      if (!isPsiquiatraElegivelParaVinculo(psi)) return false;
      const ids = Array.isArray(psi.medicoVinculadoIds) ? psi.medicoVinculadoIds : [];
      return ids.some((id) => medicoKeys.includes(String(id)));
    });
  }

  /**
   * Aprova o psiquiatra: isVerificado = true e status = ativo.
   * O cadastro inicial cria inativo + não verificado; a aprovação fecha o ciclo do portal.
   * Não escreve em medicos / nutricionistas / personal_trainers.
   */
  static async verifyPsiquiatra(userId: string): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    assertCanApprovePsiquiatra(auth.currentUser?.uid, uid);
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    await updateDoc(docRef, psiquiatraApprovalPatch());
  }

  static async toggleStatus(userId: string, currentStatus: string): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    const docRef = doc(db, COL_PSIQUIATRAS, uid);
    const newStatus =
      currentStatus === PSIQUIATRA_STATUS.ATIVO
        ? PSIQUIATRA_STATUS.INATIVO
        : PSIQUIATRA_STATUS.ATIVO;
    await updateDoc(docRef, { status: newStatus });
  }

  static async deletePsiquiatra(userId: string): Promise<void> {
    const uid = String(userId || '').trim();
    if (!uid) throw new Error('UID inválido.');
    await deleteDoc(doc(db, COL_PSIQUIATRAS, uid));
  }
}

/**
 * Serviço para gerenciar documentos de Personal Trainers no Firestore
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { COL_PERSONAL_TRAINERS, PERSONAL_STATUS } from '@/features/metaPersonal/metaPersonal.constants';
import { optionalProfessionalDdiPais } from '@/lib/whatsapp/resolveProfessionalPhone';

export class PersonalTrainerService {
  /**
   * Busca o documento do Personal Trainer pelo userId
   */
  static async getPersonalTrainerByUserId(userId: string): Promise<PersonalTrainerDoc | null> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      // Garantir que userId seja o mesmo que o id do documento (o documento é criado com userId como ID)
      const finalUserId = data.userId || docSnap.id;
      return {
        id: docSnap.id,
        userId: finalUserId,
        email: data.email,
        nome: data.nome,
        registroNumero: data.registroNumero || '',
        telefone: data.telefone || '',
        ...optionalProfessionalDdiPais(data as Record<string, unknown>),
        cidades: data.cidades || [],
        isVerificado: data.isVerificado || false,
        status: data.status || PERSONAL_STATUS.INATIVO,
        medicoVinculadoIds: data.medicoVinculadoIds || [],
        dataCadastro: data.dataCadastro?.toDate() || new Date(),
        docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
        docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
        docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        genero: data.genero || '',
        instagramUsuario: data.instagramUsuario || '',
        cep: data.cep || '',
        nomeLocal: data.nomeLocal || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        pontoReferencia: data.pontoReferencia || '',
        googleMapsUrl: data.googleMapsUrl || '',
        fotoPerfilUrl: data.fotoPerfilUrl || null,
        organizationId: data.organizationId ?? null,
        metodoImagensAtivo: data.metodoImagensAtivo ?? null,
      };
    } catch (error) {
      console.error('Erro ao buscar personal trainer:', error);
      throw error;
    }
  }

  /**
   * Cria ou atualiza o documento do Personal Trainer
   * Se não existir, cria com valores padrão
   * Se existir, apenas atualiza campos que não existem (migração leve)
   */
  static async createOrUpdatePersonalTrainer(
    userId: string,
    email: string,
    nome: string
  ): Promise<PersonalTrainerDoc> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Criar novo documento
        const newPersonalTrainer: Omit<PersonalTrainerDoc, 'id'> = {
          userId,
          email,
          nome,
          registroNumero: '',
          telefone: '',
          cidades: [],
          isVerificado: false,
          status: PERSONAL_STATUS.INATIVO,
          medicoVinculadoIds: [],
          dataCadastro: new Date(),
        };

        await setDoc(docRef, {
          ...newPersonalTrainer,
          ...shadowOrganizationFields(),
          dataCadastro: Timestamp.fromDate(newPersonalTrainer.dataCadastro),
        });

        return {
          id: userId,
          ...newPersonalTrainer,
        };
      } else {
        // Atualizar apenas campos que não existem (migração leve)
        const data = docSnap.data();
        const updates: any = {};

        if (!data.hasOwnProperty('registroNumero')) {
          updates.registroNumero = '';
        }
        if (!data.hasOwnProperty('telefone')) {
          updates.telefone = '';
        }
        if (!data.hasOwnProperty('cidades')) {
          updates.cidades = [];
        }
        if (!data.hasOwnProperty('isVerificado')) {
          updates.isVerificado = false;
        }
        if (!data.hasOwnProperty('status')) {
          updates.status = PERSONAL_STATUS.INATIVO;
        }
        if (!data.hasOwnProperty('medicoVinculadoIds')) {
          updates.medicoVinculadoIds = [];
        }
        if (!data.hasOwnProperty('dataCadastro')) {
          updates.dataCadastro = Timestamp.fromDate(new Date());
        }

        // Atualizar email e nome caso tenham mudado
        if (data.email !== email) {
          updates.email = email;
        }
        if (data.nome !== nome) {
          updates.nome = nome;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(docRef, updates);
        }

        return {
          id: docSnap.id,
          userId: data.userId || userId,
          email: data.email || email,
          nome: data.nome || nome,
          registroNumero: data.registroNumero || '',
          telefone: data.telefone || '',
        ...optionalProfessionalDdiPais(data as Record<string, unknown>),
          cidades: data.cidades || [],
          isVerificado: data.isVerificado || false,
          status: data.status || PERSONAL_STATUS.INATIVO,
          medicoVinculadoIds: data.medicoVinculadoIds || [],
          dataCadastro: data.dataCadastro?.toDate() || new Date(),
          docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
          docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
          docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        };
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar personal trainer:', error);
      throw error;
    }
  }

  /**
   * Atualiza o perfil do Personal Trainer (registroNumero, telefone e cidades)
   */
  static async updatePerfil(
    userId: string,
    registroNumero: string,
    telefone: string,
    cidades: { estado: string; cidade: string }[],
    extra?: {
      genero?: 'M' | 'F' | '';
      instagramUsuario?: string;
      cep?: string;
      nomeLocal?: string;
      endereco?: string;
      numero?: string;
      pontoReferencia?: string;
      googleMapsUrl?: string;
      fotoPerfilUrl?: string | null;
      telefoneDdi?: string;
      telefonePais?: string;
    }
  ): Promise<void> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      const extraRest = extra ? { ...extra } : {};
      const ddi = extraRest.telefoneDdi?.trim();
      const pais = extraRest.telefonePais?.trim();
      delete extraRest.telefoneDdi;
      delete extraRest.telefonePais;
      await updateDoc(docRef, {
        registroNumero,
        telefone,
        cidades,
        ...extraRest,
        ...(ddi ? { telefoneDdi: ddi, telefonePais: pais || null } : {}),
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil do personal trainer:', error);
      throw error;
    }
  }

  /** Persiste só a foto de perfil (upload no Meu Perfil → link /dr). */
  static async updateFotoPerfil(userId: string, fotoPerfilUrl: string | null): Promise<void> {
    const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
    await updateDoc(docRef, { fotoPerfilUrl: fotoPerfilUrl?.trim() || null });
  }

  /** Atualiza dados cadastrais e documentos de verificação (fluxo de chat / bloqueio). */
  static async updateCadastroVerificacao(
    userId: string,
    data: {
      nome: string;
      telefone: string;
      registroNumero: string;
      cidades: { estado: string; cidade: string }[];
      docVerificacaoCnhUrl?: string | null;
      docVerificacaoSelfieUrl?: string | null;
      docVerificacaoRegistroUrl?: string | null;
      telefoneDdi?: string;
      telefonePais?: string;
    }
  ): Promise<void> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      await updateDoc(docRef, {
        nome: data.nome,
        telefone: data.telefone,
        registroNumero: data.registroNumero,
        cidades: data.cidades,
        docVerificacaoCnhUrl: data.docVerificacaoCnhUrl ?? null,
        docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl ?? null,
        docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl ?? null,
        ...(data.telefoneDdi?.trim()
          ? { telefoneDdi: data.telefoneDdi.trim(), telefonePais: data.telefonePais?.trim() || null }
          : {}),
      });
    } catch (error) {
      console.error('Erro ao atualizar cadastro de verificação do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista Personal Trainers vinculados a um médico específico.
   * Mesmo padrão dos nutricionistas: scan da collection (confiável) + match por id OU userId do médico.
   */
  static async getPersonalTrainersVinculadosAoMedico(
    medicoId: string,
    opts?: { apenasAtivosVerificados?: boolean; medicoUserId?: string | null }
  ): Promise<PersonalTrainerDoc[]> {
    const medicoIdNorm = String(medicoId || '').trim();
    if (!medicoIdNorm) return [];
    const medicoUserIdNorm = String(opts?.medicoUserId || '').trim();
    const medicoKeys = new Set(
      [medicoIdNorm, medicoUserIdNorm].filter(Boolean)
    );
    const apenasAtivosVerificados = opts?.apenasAtivosVerificados !== false;

    const matchesMedico = (ids: string[]) => ids.some((id) => medicoKeys.has(String(id || '').trim()));

    try {
      let querySnapshot;
      try {
        querySnapshot = await getDocs(collection(db, COL_PERSONAL_TRAINERS));
      } catch (e) {
        console.warn('[getPersonalTrainersVinculadosAoMedico] fallback orderBy', e);
        const q = query(collection(db, COL_PERSONAL_TRAINERS), orderBy('dataCadastro', 'desc'));
        querySnapshot = await getDocs(q);
      }

      // Reforço: também tenta array-contains por id e userId (não substitui o scan)
      const fromArrayContains = new Map<string, PersonalTrainerDoc>();
      for (const key of medicoKeys) {
        try {
          const snap = await getDocs(
            query(
              collection(db, COL_PERSONAL_TRAINERS),
              where('medicoVinculadoIds', 'array-contains', key)
            )
          );
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const finalUserId = String(data.userId || docSnap.id || '').trim();
            fromArrayContains.set(docSnap.id, {
              id: docSnap.id,
              userId: finalUserId,
              email: data.email,
              nome: data.nome,
              registroNumero: data.registroNumero || '',
              telefone: data.telefone || '',
        ...optionalProfessionalDdiPais(data as Record<string, unknown>),
              cidades: data.cidades || [],
              isVerificado: data.isVerificado || false,
              status: data.status || PERSONAL_STATUS.INATIVO,
              medicoVinculadoIds: Array.isArray(data.medicoVinculadoIds)
                ? data.medicoVinculadoIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
                : [],
              dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro || new Date(0),
              docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
              docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
              docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
              organizationId: data.organizationId ?? null,
              metodoImagensAtivo: data.metodoImagensAtivo ?? null,
              fotoPerfilUrl: data.fotoPerfilUrl || null,
            } as PersonalTrainerDoc);
          }
        } catch (e) {
          console.warn('[getPersonalTrainersVinculadosAoMedico] array-contains', key, e);
        }
      }

      const fromScan = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const finalUserId = String(data.userId || docSnap.id || '').trim();
        const medicoVinculadoIds = Array.isArray(data.medicoVinculadoIds)
          ? data.medicoVinculadoIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
          : [];
        return {
          id: docSnap.id,
          userId: finalUserId,
          email: data.email,
          nome: data.nome,
          registroNumero: data.registroNumero || '',
          telefone: data.telefone || '',
        ...optionalProfessionalDdiPais(data as Record<string, unknown>),
          cidades: data.cidades || [],
          isVerificado: data.isVerificado || false,
          status: data.status || PERSONAL_STATUS.INATIVO,
          medicoVinculadoIds,
          dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro || new Date(0),
          docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
          docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
          docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
          organizationId: data.organizationId ?? null,
          metodoImagensAtivo: data.metodoImagensAtivo ?? null,
          fotoPerfilUrl: data.fotoPerfilUrl || null,
        } as PersonalTrainerDoc;
      });

      const byId = new Map<string, PersonalTrainerDoc>();
      for (const p of [...fromScan, ...fromArrayContains.values()]) {
        if (!p?.id && !p?.userId) continue;
        byId.set(p.id || p.userId, p);
      }

      const list = Array.from(byId.values())
        .filter((personal) => {
          if (!personal.userId && !personal.id) return false;
          const ids = Array.isArray(personal.medicoVinculadoIds) ? personal.medicoVinculadoIds : [];
          if (!matchesMedico(ids)) return false;
          if (apenasAtivosVerificados) {
            if (personal.status && String(personal.status) !== PERSONAL_STATUS.ATIVO) return false;
            if (!personal.isVerificado) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const da = a.dataCadastro instanceof Date ? a.dataCadastro.getTime() : 0;
          const db_ = b.dataCadastro instanceof Date ? b.dataCadastro.getTime() : 0;
          return db_ - da;
        });

      return list;
    } catch (error) {
      console.error('Erro ao buscar personal trainers vinculados ao médico:', error);
      throw error;
    }
  }

  /**
   * Lista todos os Personal Trainers
   */
  static async getAllPersonalTrainers(): Promise<PersonalTrainerDoc[]> {
    const mapDoc = (docSnap: { id: string; data: () => Record<string, any> }): PersonalTrainerDoc => {
      const data = docSnap.data();
      const finalUserId = data.userId || docSnap.id;
      return {
        id: docSnap.id,
        userId: finalUserId,
        email: data.email,
        nome: data.nome,
        registroNumero: data.registroNumero || '',
        telefone: data.telefone || '',
        ...optionalProfessionalDdiPais(data as Record<string, unknown>),
        cidades: data.cidades || [],
        isVerificado: data.isVerificado || false,
        status: data.status || PERSONAL_STATUS.INATIVO,
        medicoVinculadoIds: data.medicoVinculadoIds || [],
        dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro || new Date(0),
        docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
        docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
        docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        organizationId: data.organizationId ?? null,
        metodoImagensAtivo: data.metodoImagensAtivo ?? null,
        fotoPerfilUrl: data.fotoPerfilUrl || null,
      } as PersonalTrainerDoc;
    };

    try {
      try {
        const q = query(collection(db, COL_PERSONAL_TRAINERS), orderBy('dataCadastro', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(mapDoc);
      } catch (e) {
        console.warn('[getAllPersonalTrainers] fallback sem orderBy', e);
        const snap = await getDocs(collection(db, COL_PERSONAL_TRAINERS));
        return snap.docs.map(mapDoc);
      }
    } catch (error) {
      console.error('Erro ao listar personal trainers:', error);
      throw error;
    }
  }

  /** IDs (doc + userId) de todos os personais — para exclusão da lista de médicos. */
  static async listAllProfileKeys(): Promise<string[]> {
    const list = await this.getAllPersonalTrainers().catch(() => [] as PersonalTrainerDoc[]);
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const p of list) {
      for (const raw of [p.id, p.userId]) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        keys.push(id);
      }
    }
    return keys;
  }

  /**
   * Verifica um Personal Trainer (isVerificado = true)
   */
  static async verifyPersonalTrainer(userId: string): Promise<void> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      await updateDoc(docRef, {
        isVerificado: true,
      });
    } catch (error) {
      console.error('Erro ao verificar personal trainer:', error);
      throw error;
    }
  }

  /**
   * Alterna o status do Personal Trainer (ativo/inativo)
   */
  static async toggleStatus(userId: string, currentStatus: string): Promise<void> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      const newStatus = currentStatus === PERSONAL_STATUS.ATIVO 
        ? PERSONAL_STATUS.INATIVO 
        : PERSONAL_STATUS.ATIVO;
      
      await updateDoc(docRef, {
        status: newStatus,
      });
    } catch (error) {
      console.error('Erro ao alternar status do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Deleta um Personal Trainer
   */
  static async deletePersonalTrainer(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COL_PERSONAL_TRAINERS, userId));
    } catch (error) {
      console.error('Erro ao deletar personal trainer:', error);
      throw error;
    }
  }
}

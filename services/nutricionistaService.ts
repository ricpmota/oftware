/**
 * Serviço para gerenciar documentos de nutricionistas no Firestore
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { COL_NUTRICIONISTAS, NUTRI_STATUS } from '@/features/metaNutri/metaNutri.constants';
import { optionalProfessionalDdiPais } from '@/lib/whatsapp/resolveProfessionalPhone';

export class NutricionistaService {
  /**
   * Busca o documento do nutricionista pelo userId
   */
  static async getNutricionistaByUserId(userId: string): Promise<NutricionistaDoc | null> {
    try {
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
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
        status: data.status || NUTRI_STATUS.INATIVO,
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
      console.error('Erro ao buscar nutricionista:', error);
      throw error;
    }
  }

  /**
   * Cria ou atualiza o documento do nutricionista
   * Se não existir, cria com valores padrão
   * Se existir, apenas atualiza campos que não existem (migração leve)
   */
  static async createOrUpdateNutricionista(
    userId: string,
    email: string,
    nome: string
  ): Promise<NutricionistaDoc> {
    try {
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Criar novo documento
        const newNutricionista: Omit<NutricionistaDoc, 'id'> = {
          userId,
          email,
          nome,
          registroNumero: '',
          telefone: '',
          cidades: [],
          isVerificado: false,
          status: NUTRI_STATUS.INATIVO,
          medicoVinculadoIds: [],
          dataCadastro: new Date(),
        };

        await setDoc(docRef, {
          ...newNutricionista,
          ...shadowOrganizationFields(),
          dataCadastro: Timestamp.fromDate(newNutricionista.dataCadastro),
        });

        return {
          id: userId,
          ...newNutricionista,
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
          updates.status = NUTRI_STATUS.INATIVO;
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
          status: data.status || NUTRI_STATUS.INATIVO,
          medicoVinculadoIds: data.medicoVinculadoIds || [],
          dataCadastro: data.dataCadastro?.toDate() || new Date(),
          docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
          docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
          docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        };
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar nutricionista:', error);
      throw error;
    }
  }

  /**
   * Atualiza o perfil do nutricionista (registroNumero, telefone e cidades)
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
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
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
      console.error('Erro ao atualizar perfil do nutricionista:', error);
      throw error;
    }
  }

  /** Persiste só a foto de perfil (upload no Meu Perfil → link /dr). */
  static async updateFotoPerfil(userId: string, fotoPerfilUrl: string | null): Promise<void> {
    const docRef = doc(db, COL_NUTRICIONISTAS, userId);
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
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
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
      console.error('Erro ao atualizar cadastro de verificação do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista nutricionistas vinculados a um médico específico.
   * Sem orderBy no Firestore: docs sem dataCadastro seriam omitidos.
   */
  static async getNutricionistasVinculadosAoMedico(medicoId: string): Promise<NutricionistaDoc[]> {
    const medicoIdNorm = String(medicoId || '').trim();
    if (!medicoIdNorm) return [];

    try {
      let querySnapshot;
      try {
        querySnapshot = await getDocs(collection(db, COL_NUTRICIONISTAS));
      } catch (e) {
        console.warn('[getNutricionistasVinculadosAoMedico] fallback query', e);
        const q = query(collection(db, COL_NUTRICIONISTAS), orderBy('dataCadastro', 'desc'));
        querySnapshot = await getDocs(q);
      }

      return querySnapshot.docs
        .map((docSnap) => {
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
            status: data.status || NUTRI_STATUS.INATIVO,
            medicoVinculadoIds,
            dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro || new Date(0),
            docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
            docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
            docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
            organizationId: data.organizationId ?? null,
            metodoImagensAtivo: data.metodoImagensAtivo ?? null,
            fotoPerfilUrl: data.fotoPerfilUrl || null,
          } as NutricionistaDoc;
        })
        .filter((nutri) => {
          if (!nutri.userId && !nutri.id) return false;
          const ids = Array.isArray(nutri.medicoVinculadoIds) ? nutri.medicoVinculadoIds : [];
          if (!ids.includes(medicoIdNorm)) return false;
          if (nutri.status && String(nutri.status) !== NUTRI_STATUS.ATIVO) return false;
          if (!nutri.isVerificado) return false;
          return true;
        })
        .sort((a, b) => {
          const da = a.dataCadastro instanceof Date ? a.dataCadastro.getTime() : 0;
          const db_ = b.dataCadastro instanceof Date ? b.dataCadastro.getTime() : 0;
          return db_ - da;
        });
    } catch (error) {
      console.error('Erro ao buscar nutricionistas vinculados ao médico:', error);
      throw error;
    }
  }

  /**
   * Lista todos os nutricionistas
   */
  static async getAllNutricionistas(): Promise<NutricionistaDoc[]> {
    const mapDoc = (docSnap: { id: string; data: () => Record<string, any> }): NutricionistaDoc => {
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
        status: data.status || NUTRI_STATUS.INATIVO,
        medicoVinculadoIds: data.medicoVinculadoIds || [],
        dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro || new Date(0),
        docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
        docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
        docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        organizationId: data.organizationId ?? null,
        metodoImagensAtivo: data.metodoImagensAtivo ?? null,
        fotoPerfilUrl: data.fotoPerfilUrl || null,
      } as NutricionistaDoc;
    };

    try {
      try {
        const q = query(collection(db, COL_NUTRICIONISTAS), orderBy('dataCadastro', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(mapDoc);
      } catch (e) {
        console.warn('[getAllNutricionistas] fallback sem orderBy', e);
        const snap = await getDocs(collection(db, COL_NUTRICIONISTAS));
        return snap.docs.map(mapDoc);
      }
    } catch (error) {
      console.error('Erro ao listar nutricionistas:', error);
      throw error;
    }
  }

  /** IDs (doc + userId) de todos os nutris — para exclusão da lista de médicos. */
  static async listAllProfileKeys(): Promise<string[]> {
    const list = await this.getAllNutricionistas().catch(() => [] as NutricionistaDoc[]);
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const n of list) {
      for (const raw of [n.id, n.userId]) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        keys.push(id);
      }
    }
    return keys;
  }

  /**
   * Verifica um nutricionista (isVerificado = true)
   */
  static async verifyNutricionista(userId: string): Promise<void> {
    try {
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
      await updateDoc(docRef, {
        isVerificado: true,
      });
    } catch (error) {
      console.error('Erro ao verificar nutricionista:', error);
      throw error;
    }
  }

  /**
   * Alterna o status do nutricionista (ativo/inativo)
   */
  static async toggleStatus(userId: string, currentStatus: string): Promise<void> {
    try {
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
      const newStatus = currentStatus === NUTRI_STATUS.ATIVO 
        ? NUTRI_STATUS.INATIVO 
        : NUTRI_STATUS.ATIVO;
      
      await updateDoc(docRef, {
        status: newStatus,
      });
    } catch (error) {
      console.error('Erro ao alternar status do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Deleta um nutricionista
   */
  static async deleteNutricionista(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COL_NUTRICIONISTAS, userId));
    } catch (error) {
      console.error('Erro ao deletar nutricionista:', error);
      throw error;
    }
  }
}

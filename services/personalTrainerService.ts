/**
 * Serviço para gerenciar documentos de Personal Trainers no Firestore
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { COL_PERSONAL_TRAINERS, PERSONAL_STATUS } from '@/features/metaPersonal/metaPersonal.constants';

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
        cidades: data.cidades || [],
        isVerificado: data.isVerificado || false,
        status: data.status || PERSONAL_STATUS.INATIVO,
        medicoVinculadoIds: data.medicoVinculadoIds || [],
        dataCadastro: data.dataCadastro?.toDate() || new Date(),
        docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
        docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
        docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
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
    cidades: { estado: string; cidade: string }[]
  ): Promise<void> {
    try {
      const docRef = doc(db, COL_PERSONAL_TRAINERS, userId);
      await updateDoc(docRef, {
        registroNumero,
        telefone,
        cidades,
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil do personal trainer:', error);
      throw error;
    }
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
      });
    } catch (error) {
      console.error('Erro ao atualizar cadastro de verificação do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista Personal Trainers vinculados a um médico específico
   */
  static async getPersonalTrainersVinculadosAoMedico(medicoId: string): Promise<PersonalTrainerDoc[]> {
    try {
      const q = query(
        collection(db, COL_PERSONAL_TRAINERS),
        orderBy('dataCadastro', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: data.userId,
            email: data.email,
            nome: data.nome,
            registroNumero: data.registroNumero || '',
            telefone: data.telefone || '',
            cidades: data.cidades || [],
            isVerificado: data.isVerificado || false,
            status: data.status || PERSONAL_STATUS.INATIVO,
            medicoVinculadoIds: data.medicoVinculadoIds || [],
            dataCadastro: data.dataCadastro?.toDate() || new Date(),
            docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
            docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
            docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
          };
        })
        .filter((personal) => 
          personal.isVerificado && 
          personal.status === PERSONAL_STATUS.ATIVO &&
          personal.medicoVinculadoIds.includes(medicoId)
        );
    } catch (error) {
      console.error('Erro ao buscar personal trainers vinculados ao médico:', error);
      throw error;
    }
  }

  /**
   * Lista todos os Personal Trainers
   */
  static async getAllPersonalTrainers(): Promise<PersonalTrainerDoc[]> {
    try {
      const q = query(collection(db, COL_PERSONAL_TRAINERS), orderBy('dataCadastro', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((docSnap) => {
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
          cidades: data.cidades || [],
          isVerificado: data.isVerificado || false,
          status: data.status || PERSONAL_STATUS.INATIVO,
          medicoVinculadoIds: data.medicoVinculadoIds || [],
          dataCadastro: data.dataCadastro?.toDate() || new Date(),
          docVerificacaoCnhUrl: data.docVerificacaoCnhUrl || '',
          docVerificacaoSelfieUrl: data.docVerificacaoSelfieUrl || '',
          docVerificacaoRegistroUrl: data.docVerificacaoRegistroUrl || '',
        };
      });
    } catch (error) {
      console.error('Erro ao listar personal trainers:', error);
      throw error;
    }
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

/**
 * Serviço para gerenciar documentos de nutricionistas no Firestore
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { COL_NUTRICIONISTAS, NUTRI_STATUS } from '@/features/metaNutri/metaNutri.constants';

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
        cidades: data.cidades || [],
        isVerificado: data.isVerificado || false,
        status: data.status || NUTRI_STATUS.INATIVO,
        medicoVinculadoIds: data.medicoVinculadoIds || [],
        dataCadastro: data.dataCadastro?.toDate() || new Date(),
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
          cidades: data.cidades || [],
          isVerificado: data.isVerificado || false,
          status: data.status || NUTRI_STATUS.INATIVO,
          medicoVinculadoIds: data.medicoVinculadoIds || [],
          dataCadastro: data.dataCadastro?.toDate() || new Date(),
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
    cidades: { estado: string; cidade: string }[]
  ): Promise<void> {
    try {
      const docRef = doc(db, COL_NUTRICIONISTAS, userId);
      await updateDoc(docRef, {
        registroNumero,
        telefone,
        cidades,
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista nutricionistas vinculados a um médico específico
   */
  static async getNutricionistasVinculadosAoMedico(medicoId: string): Promise<NutricionistaDoc[]> {
    try {
      const q = query(
        collection(db, COL_NUTRICIONISTAS),
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
            status: data.status || NUTRI_STATUS.INATIVO,
            medicoVinculadoIds: data.medicoVinculadoIds || [],
            dataCadastro: data.dataCadastro?.toDate() || new Date(),
          };
        })
        .filter((nutri) => 
          nutri.isVerificado && 
          nutri.status === NUTRI_STATUS.ATIVO &&
          nutri.medicoVinculadoIds.includes(medicoId)
        );
    } catch (error) {
      console.error('Erro ao buscar nutricionistas vinculados ao médico:', error);
      throw error;
    }
  }

  /**
   * Lista todos os nutricionistas
   */
  static async getAllNutricionistas(): Promise<NutricionistaDoc[]> {
    try {
      const q = query(collection(db, COL_NUTRICIONISTAS), orderBy('dataCadastro', 'desc'));
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
          status: data.status || NUTRI_STATUS.INATIVO,
          medicoVinculadoIds: data.medicoVinculadoIds || [],
          dataCadastro: data.dataCadastro?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Erro ao listar nutricionistas:', error);
      throw error;
    }
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

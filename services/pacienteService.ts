import { collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';

export class PacienteService {
  // Criar ou atualizar paciente completo
  static async createOrUpdatePaciente(paciente: Omit<PacienteCompleto, 'id'>): Promise<string> {
    try {
      // Verificar se já existe paciente com este userId
      const existingQuery = query(collection(db, 'pacientes_completos'), where('userId', '==', paciente.userId));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Atualizar paciente existente
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(doc(db, 'pacientes_completos', existingDoc.id), {
          ...paciente,
          dataCadastro: new Date()
        });
        return existingDoc.id;
      } else {
        // Criar novo paciente
        const docRef = await addDoc(collection(db, 'pacientes_completos'), {
          ...paciente,
          dataCadastro: new Date()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar paciente:', error);
      throw error;
    }
  }

  // Buscar paciente por ID
  static async getPacienteById(pacienteId: string): Promise<PacienteCompleto | null> {
    try {
      const pacienteDoc = await getDoc(doc(db, 'pacientes_completos', pacienteId));
      
      if (!pacienteDoc.exists()) {
        return null;
      }
      
      const data = pacienteDoc.data();
      return {
        id: pacienteDoc.id,
        ...data,
        dataCadastro: data.dataCadastro?.toDate(),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
          dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
        },
      } as PacienteCompleto;
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      throw error;
    }
  }

  // Buscar paciente por userId
  static async getPacienteByUserId(userId: string): Promise<PacienteCompleto | null> {
    try {
      const pacienteQuery = query(collection(db, 'pacientes_completos'), where('userId', '==', userId));
      const pacienteSnapshot = await getDocs(pacienteQuery);
      
      if (pacienteSnapshot.empty) {
        return null;
      }
      
      const data = pacienteSnapshot.docs[0].data();
      return {
        id: pacienteSnapshot.docs[0].id,
        ...data,
        dataCadastro: data.dataCadastro?.toDate(),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
          dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
        },
      } as PacienteCompleto;
    } catch (error) {
      console.error('Erro ao buscar paciente por userId:', error);
      throw error;
    }
  }

  // Buscar todos os pacientes de um médico
  static async getPacientesByMedico(medicoId: string): Promise<PacienteCompleto[]> {
    try {
      const pacientesQuery = query(collection(db, 'pacientes_completos'), where('medicoResponsavelId', '==', medicoId));
      const pacientesSnapshot = await getDocs(pacientesQuery);
      
      return pacientesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate(),
          dadosIdentificacao: {
            ...data.dadosIdentificacao,
            dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
            dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
          },
        } as PacienteCompleto;
      });
    } catch (error) {
      console.error('Erro ao buscar pacientes do médico:', error);
      throw error;
    }
  }

  // Buscar todos os pacientes
  static async getAllPacientes(): Promise<PacienteCompleto[]> {
    try {
      const pacientesSnapshot = await getDocs(collection(db, 'pacientes_completos'));
      return pacientesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate(),
          dadosIdentificacao: {
            ...data.dadosIdentificacao,
            dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
            dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
          },
        } as PacienteCompleto;
      });
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      throw error;
    }
  }
}


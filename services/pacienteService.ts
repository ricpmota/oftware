import { collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';

export class PacienteService {
  // Criar ou atualizar paciente completo
  static async createOrUpdatePaciente(paciente: PacienteCompleto | Omit<PacienteCompleto, 'id'>): Promise<string> {
    try {
      // Se tem id, atualizar diretamente
      if ('id' in paciente && paciente.id) {
        const { id, ...pacienteData } = paciente;
        // Converter datas para Timestamp do Firestore
        const dataToSave: any = {
          ...pacienteData,
          dataCadastro: pacienteData.dataCadastro || new Date()
        };
        
        // Converter dataNascimento se existir
        if (dataToSave.dadosIdentificacao?.dataNascimento) {
          dataToSave.dadosIdentificacao = {
            ...dataToSave.dadosIdentificacao,
            dataNascimento: dataToSave.dadosIdentificacao.dataNascimento instanceof Date 
              ? dataToSave.dadosIdentificacao.dataNascimento 
              : new Date(dataToSave.dadosIdentificacao.dataNascimento)
          };
        }
        
        // Converter dataCadastro se existir
        if (dataToSave.dadosIdentificacao?.dataCadastro) {
          dataToSave.dadosIdentificacao = {
            ...dataToSave.dadosIdentificacao,
            dataCadastro: dataToSave.dadosIdentificacao.dataCadastro instanceof Date 
              ? dataToSave.dadosIdentificacao.dataCadastro 
              : new Date(dataToSave.dadosIdentificacao.dataCadastro)
          };
        }
        
        // Converter datas em evolucaoSeguimento
        if (dataToSave.evolucaoSeguimento) {
          dataToSave.evolucaoSeguimento = dataToSave.evolucaoSeguimento.map((seg: any) => ({
            ...seg,
            dataRegistro: seg.dataRegistro instanceof Date 
              ? seg.dataRegistro 
              : seg.dataRegistro ? new Date(seg.dataRegistro) : new Date(),
            doseAplicada: seg.doseAplicada ? {
              ...seg.doseAplicada,
              data: seg.doseAplicada.data instanceof Date 
                ? seg.doseAplicada.data 
                : seg.doseAplicada.data ? new Date(seg.doseAplicada.data) : new Date()
            } : undefined
          }));
        }
        
        // Converter datas em planoTerapeutico
        if (dataToSave.planoTerapeutico) {
          if (dataToSave.planoTerapeutico.startDate) {
            dataToSave.planoTerapeutico.startDate = dataToSave.planoTerapeutico.startDate instanceof Date
              ? dataToSave.planoTerapeutico.startDate
              : new Date(dataToSave.planoTerapeutico.startDate);
          }
          if (dataToSave.planoTerapeutico.lastDoseChangeAt) {
            dataToSave.planoTerapeutico.lastDoseChangeAt = dataToSave.planoTerapeutico.lastDoseChangeAt instanceof Date
              ? dataToSave.planoTerapeutico.lastDoseChangeAt
              : new Date(dataToSave.planoTerapeutico.lastDoseChangeAt);
          }
          if (dataToSave.planoTerapeutico.nextReviewDate) {
            dataToSave.planoTerapeutico.nextReviewDate = dataToSave.planoTerapeutico.nextReviewDate instanceof Date
              ? dataToSave.planoTerapeutico.nextReviewDate
              : new Date(dataToSave.planoTerapeutico.nextReviewDate);
          }
        }
        
        await updateDoc(doc(db, 'pacientes_completos', id), dataToSave);
        return id;
      }
      
      // Se não tem id, buscar por userId ou criar novo
      const existingQuery = query(collection(db, 'pacientes_completos'), where('userId', '==', paciente.userId));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Atualizar paciente existente
        const existingDoc = existingSnapshot.docs[0];
        const { id, ...pacienteData } = { ...paciente, id: existingDoc.id } as PacienteCompleto;
        
        const dataToSave: any = {
          ...pacienteData,
          dataCadastro: pacienteData.dataCadastro || new Date()
        };
        
        await updateDoc(doc(db, 'pacientes_completos', existingDoc.id), dataToSave);
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
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => ({
          ...seg,
          dataRegistro: seg.dataRegistro?.toDate ? seg.dataRegistro.toDate() : (seg.dataRegistro ? new Date(seg.dataRegistro) : undefined),
          doseAplicada: seg.doseAplicada ? {
            ...seg.doseAplicada,
            data: seg.doseAplicada.data?.toDate ? seg.doseAplicada.data.toDate() : (seg.doseAplicada.data ? new Date(seg.doseAplicada.data) : undefined)
          } : undefined
        }));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: planoTerapeutico.startDate?.toDate ? planoTerapeutico.startDate.toDate() : (planoTerapeutico.startDate ? new Date(planoTerapeutico.startDate) : undefined),
          lastDoseChangeAt: planoTerapeutico.lastDoseChangeAt?.toDate ? planoTerapeutico.lastDoseChangeAt.toDate() : (planoTerapeutico.lastDoseChangeAt ? new Date(planoTerapeutico.lastDoseChangeAt) : undefined),
          nextReviewDate: planoTerapeutico.nextReviewDate?.toDate ? planoTerapeutico.nextReviewDate.toDate() : (planoTerapeutico.nextReviewDate ? new Date(planoTerapeutico.nextReviewDate) : undefined),
        };
      }
      
      return {
        id: pacienteDoc.id,
        ...data,
        dataCadastro: data.dataCadastro?.toDate(),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
          dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
        },
        evolucaoSeguimento,
        planoTerapeutico,
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
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => ({
          ...seg,
          dataRegistro: seg.dataRegistro?.toDate ? seg.dataRegistro.toDate() : (seg.dataRegistro ? new Date(seg.dataRegistro) : undefined),
          doseAplicada: seg.doseAplicada ? {
            ...seg.doseAplicada,
            data: seg.doseAplicada.data?.toDate ? seg.doseAplicada.data.toDate() : (seg.doseAplicada.data ? new Date(seg.doseAplicada.data) : undefined)
          } : undefined
        }));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: planoTerapeutico.startDate?.toDate ? planoTerapeutico.startDate.toDate() : (planoTerapeutico.startDate ? new Date(planoTerapeutico.startDate) : undefined),
          lastDoseChangeAt: planoTerapeutico.lastDoseChangeAt?.toDate ? planoTerapeutico.lastDoseChangeAt.toDate() : (planoTerapeutico.lastDoseChangeAt ? new Date(planoTerapeutico.lastDoseChangeAt) : undefined),
          nextReviewDate: planoTerapeutico.nextReviewDate?.toDate ? planoTerapeutico.nextReviewDate.toDate() : (planoTerapeutico.nextReviewDate ? new Date(planoTerapeutico.nextReviewDate) : undefined),
        };
      }
      
      return {
        id: pacienteSnapshot.docs[0].id,
        ...data,
        dataCadastro: data.dataCadastro?.toDate(),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
          dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
        },
        evolucaoSeguimento,
        planoTerapeutico,
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
        
        // Converter datas em evolucaoSeguimento
        let evolucaoSeguimento = data.evolucaoSeguimento;
        if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
          evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => ({
            ...seg,
            dataRegistro: seg.dataRegistro?.toDate ? seg.dataRegistro.toDate() : (seg.dataRegistro ? new Date(seg.dataRegistro) : undefined),
            doseAplicada: seg.doseAplicada ? {
              ...seg.doseAplicada,
              data: seg.doseAplicada.data?.toDate ? seg.doseAplicada.data.toDate() : (seg.doseAplicada.data ? new Date(seg.doseAplicada.data) : undefined)
            } : undefined
          }));
        }
        
        // Converter datas em planoTerapeutico
        let planoTerapeutico = data.planoTerapeutico;
        if (planoTerapeutico) {
          planoTerapeutico = {
            ...planoTerapeutico,
            startDate: planoTerapeutico.startDate?.toDate ? planoTerapeutico.startDate.toDate() : (planoTerapeutico.startDate ? new Date(planoTerapeutico.startDate) : undefined),
            lastDoseChangeAt: planoTerapeutico.lastDoseChangeAt?.toDate ? planoTerapeutico.lastDoseChangeAt.toDate() : (planoTerapeutico.lastDoseChangeAt ? new Date(planoTerapeutico.lastDoseChangeAt) : undefined),
            nextReviewDate: planoTerapeutico.nextReviewDate?.toDate ? planoTerapeutico.nextReviewDate.toDate() : (planoTerapeutico.nextReviewDate ? new Date(planoTerapeutico.nextReviewDate) : undefined),
          };
        }
        
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate(),
          dadosIdentificacao: {
            ...data.dadosIdentificacao,
            dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
            dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
          },
          evolucaoSeguimento,
          planoTerapeutico,
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


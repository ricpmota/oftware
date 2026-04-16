/**
 * Serviço para gerenciar relacionamentos entre pacientes e Personal Trainers
 * e listar pacientes visíveis para um Personal Trainer
 */

import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { PacientePersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';
import { PacienteService } from './pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { MedicoService } from './medicoService';
import { Medico } from '@/types/medico';

export interface PacienteVisivelPersonal {
  vinculoId: string;
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
}

export class PacientePersonalTrainerService {
  /**
   * Lista vínculos ativos de um Personal Trainer
   */
  static async listActiveVinculosByPersonal(personalTrainerId: string): Promise<PacientePersonalTrainerDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('personalTrainerId', '==', personalTrainerId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });

      // Ordenar no cliente por data de compartilhamento (mais recente primeiro)
      return vinculos.sort((a, b) => {
        const dateA = a.dataCompartilhamento?.getTime() || 0;
        const dateB = b.dataCompartilhamento?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar vínculos ativos do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista pacientes visíveis para um Personal Trainer com dados completos
   * Carrega pacientes e médicos em lote para performance
   */
  static async listPacientesVisiveisByPersonal(personalTrainerId: string): Promise<PacienteVisivelPersonal[]> {
    try {
      // 1. Buscar vínculos ativos
      const vinculos = await this.listActiveVinculosByPersonal(personalTrainerId);
      
      if (vinculos.length === 0) {
        return [];
      }

      // 2. Coletar IDs únicos
      const pacienteIds = [...new Set(vinculos.map(v => v.pacienteId))];
      const medicoIds = [...new Set(vinculos.map(v => v.medicoId))];

      // 3. Carregar pacientes e médicos em paralelo
      const [pacientesData, medicosData] = await Promise.all([
        Promise.all(pacienteIds.map(id => PacienteService.getPacienteById(id))),
        Promise.all(medicoIds.map(id => MedicoService.getMedicoById(id))),
      ]);

      // 4. Criar mapas para lookup rápido
      const pacientesMap = new Map<string, PacienteCompleto>();
      pacientesData.forEach(p => {
        if (p) pacientesMap.set(p.id, p);
      });

      const medicosMap = new Map<string, Medico>();
      medicosData.forEach(m => {
        if (m) medicosMap.set(m.id, m);
      });

      // 5. Montar lista de pacientes visíveis
      const pacientesVisiveis: PacienteVisivelPersonal[] = vinculos
        .map(vinculo => {
          const paciente = pacientesMap.get(vinculo.pacienteId);
          const medico = medicosMap.get(vinculo.medicoId);

          if (!paciente) {
            console.warn(`Paciente ${vinculo.pacienteId} não encontrado`);
            return null;
          }

          return {
            vinculoId: vinculo.id,
            pacienteId: vinculo.pacienteId,
            paciente,
            medicoId: vinculo.medicoId,
            medicoNome: medico?.nome || 'Médico não encontrado',
            medicoGenero: medico?.genero,
            dataCompartilhamento: vinculo.dataCompartilhamento,
            status: vinculo.status,
          };
        })
        .filter((p): p is PacienteVisivelPersonal => p !== null);

      return pacientesVisiveis;
    } catch (error) {
      console.error('Erro ao listar pacientes visíveis do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Verifica se Personal Trainer tem acesso a um paciente
   */
  static async hasAccessToPaciente(personalTrainerId: string, pacienteId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('personalTrainerId', '==', personalTrainerId),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar acesso do personal trainer ao paciente:', error);
      return false;
    }
  }

  /**
   * Busca resumo de um paciente (para uso em listas)
   */
  static async getPacienteResumo(pacienteId: string): Promise<{
    id: string;
    nome: string;
    medicoId?: string;
    medicoNome?: string;
  } | null> {
    try {
      const paciente = await PacienteService.getPacienteById(pacienteId);
      if (!paciente) return null;

      return {
        id: paciente.id,
        nome: paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente sem nome',
        medicoId: paciente.medicoResponsavelId,
        medicoNome: undefined, // Será preenchido pelo método listPacientesVisiveisByPersonal
      };
    } catch (error) {
      console.error('Erro ao buscar resumo do paciente:', error);
      return null;
    }
  }

  /**
   * Lista vínculos ativos por médico e Personal Trainer
   */
  static async listVinculosByMedicoEPersonal(
    medicoId: string,
    personalTrainerId: string
  ): Promise<PacientePersonalTrainerDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('personalTrainerId', '==', personalTrainerId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });

      // Ordenar no cliente por data de compartilhamento (mais recente primeiro)
      return vinculos.sort((a, b) => {
        const dateA = a.dataCompartilhamento?.getTime() || 0;
        const dateB = b.dataCompartilhamento?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar vínculos por médico e personal:', error);
      throw error;
    }
  }

  /**
   * Lista todos os vínculos ativos de um médico (pacientes compartilhados com personais)
   */
  static async listActiveVinculosByMedico(medicoId: string): Promise<PacientePersonalTrainerDoc[]> {
    try {
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('status', '==', 'ativo')
      );
      const querySnapshot = await getDocs(q);
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });
      return vinculos.sort((a, b) => {
        const dateA = a.dataCompartilhamento?.getTime() || 0;
        const dateB = b.dataCompartilhamento?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar vínculos ativos do médico:', error);
      throw error;
    }
  }

  /**
   * Conta pacientes em comum entre médico e Personal Trainer
   */
  static async countPacientesPorPersonalTrainer(
    medicoId: string,
    personalTrainerId: string
  ): Promise<number> {
    try {
      const vinculos = await this.listVinculosByMedicoEPersonal(medicoId, personalTrainerId);
      return vinculos.length;
    } catch (error) {
      console.error('Erro ao contar pacientes por personal trainer:', error);
      return 0;
    }
  }
}

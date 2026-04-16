/**
 * Serviço para gerenciar relacionamentos entre pacientes e nutricionistas
 * e listar pacientes visíveis para um nutricionista
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
import { PacienteNutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import { PacienteService } from './pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { MedicoService } from './medicoService';
import { Medico } from '@/types/medico';

export interface PacienteVisivelNutri {
  vinculoId: string;
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
}

export class PacienteNutricionistaService {
  /**
   * Lista vínculos ativos de um nutricionista
   */
  static async listActiveVinculosByNutri(nutricionistaId: string): Promise<PacienteNutricionistaDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_PACIENTE_NUTRICIONISTA),
        where('nutricionistaId', '==', nutricionistaId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          nutricionistaId: data.nutricionistaId,
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
      console.error('Erro ao listar vínculos ativos do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista pacientes visíveis para um nutricionista com dados completos
   * Carrega pacientes e médicos em lote para performance
   */
  static async listPacientesVisiveisByNutri(nutricionistaId: string): Promise<PacienteVisivelNutri[]> {
    try {
      // 1. Buscar vínculos ativos
      const vinculos = await this.listActiveVinculosByNutri(nutricionistaId);
      
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
      const pacientesVisiveis: PacienteVisivelNutri[] = vinculos
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
        .filter((p): p is PacienteVisivelNutri => p !== null);

      return pacientesVisiveis;
    } catch (error) {
      console.error('Erro ao listar pacientes visíveis do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Verifica se nutricionista tem acesso a um paciente
   */
  static async hasAccessToPaciente(nutricionistaId: string, pacienteId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, COL_PACIENTE_NUTRICIONISTA),
        where('nutricionistaId', '==', nutricionistaId),
        where('pacienteId', '==', pacienteId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar acesso do nutricionista ao paciente:', error);
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
        medicoNome: undefined, // Será preenchido pelo método listPacientesVisiveisByNutri
      };
    } catch (error) {
      console.error('Erro ao buscar resumo do paciente:', error);
      return null;
    }
  }

  /**
   * Lista vínculos ativos por médico e nutricionista
   */
  static async listVinculosByMedicoENutri(
    medicoId: string,
    nutricionistaId: string
  ): Promise<PacienteNutricionistaDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_PACIENTE_NUTRICIONISTA),
        where('medicoId', '==', medicoId),
        where('nutricionistaId', '==', nutricionistaId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          nutricionistaId: data.nutricionistaId,
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
      console.error('Erro ao listar vínculos por médico e nutri:', error);
      throw error;
    }
  }

  /**
   * Conta pacientes em comum entre médico e nutricionista
   */
  static async countPacientesPorNutricionista(
    medicoId: string,
    nutricionistaId: string
  ): Promise<number> {
    try {
      const vinculos = await this.listVinculosByMedicoENutri(medicoId, nutricionistaId);
      return vinculos.length;
    } catch (error) {
      console.error('Erro ao contar pacientes por nutricionista:', error);
      return 0;
    }
  }
}

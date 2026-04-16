/**
 * Serviço para gerenciar planos nutricionais criados por nutricionistas
 * 
 * IMPORTANTE: Os planos nutricionais são armazenados em uma collection separada
 * (nutri_planos) e NÃO dentro de pacientes_completos. O ID é determinístico:
 * ${pacienteId}_${nutricionistaId}
 * 
 * Isso permite que múltiplos nutricionistas tenham seus próprios planos para o mesmo paciente.
 */

import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  Timestamp
} from 'firebase/firestore';

const COL_NUTRI_PLANOS = 'nutri_planos';

/**
 * Interface do Plano Nutricional criado pelo nutricionista
 * Baseado em PlanoNutricional do NutriContent, mas com campos adicionais
 */
export interface NutriPlanoDoc {
  id: string; // Determinístico: ${pacienteId}_${nutricionistaId}
  pacienteId: string;
  nutricionistaId: string;
  nutricionistaNome?: string;
  
  // Dados do plano (mesma estrutura do NutriContent)
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;
  aguaDia_ml: number;
  refeicoes: number;
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  opcoesSelecionadas?: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];
  descricaoEstilo?: string;
  hipoteseComportamental?: string;
  suplementos?: {
    probiotico: string;
    whey: string;
    creatina: string;
  };
  restricoesPaciente?: string[];
  preferenciasProteinaPaciente?: string[];
  
  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string; // nutricionistaId
  atualizadoPor: string; // nutricionistaId
}

/**
 * Gerar ID determinístico do plano
 */
function gerarPlanoId(pacienteId: string, nutricionistaId: string): string {
  return `${pacienteId}_${nutricionistaId}`;
}

export class NutriPlanoService {
  /**
   * Buscar plano nutricional de um paciente criado por um nutricionista
   */
  static async getPlano(
    pacienteId: string,
    nutricionistaId: string
  ): Promise<NutriPlanoDoc | null> {
    try {
      const planoId = gerarPlanoId(pacienteId, nutricionistaId);
      const planoRef = doc(db, COL_NUTRI_PLANOS, planoId);
      const planoSnap = await getDoc(planoRef);

      if (!planoSnap.exists()) {
        return null;
      }

      const data = planoSnap.data();
      return {
        id: planoSnap.id,
        pacienteId: data.pacienteId,
        nutricionistaId: data.nutricionistaId,
        nutricionistaNome: data.nutricionistaNome,
        estilo: data.estilo,
        protDia_g: data.protDia_g,
        aguaDia_ml: data.aguaDia_ml,
        refeicoes: data.refeicoes,
        distribuicaoProteina: data.distribuicaoProteina,
        modeloDia: data.modeloDia,
        opcoesSelecionadas: data.opcoesSelecionadas,
        evitar: data.evitar || [],
        descricaoEstilo: data.descricaoEstilo,
        hipoteseComportamental: data.hipoteseComportamental,
        suplementos: data.suplementos,
        restricoesPaciente: data.restricoesPaciente,
        preferenciasProteinaPaciente: data.preferenciasProteinaPaciente,
        criadoEm: data.criadoEm?.toDate() || new Date(),
        atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
        criadoPor: data.criadoPor,
        atualizadoPor: data.atualizadoPor,
      };
    } catch (error) {
      console.error('Erro ao buscar plano nutricional:', error);
      throw error;
    }
  }

  /**
   * Criar ou atualizar plano nutricional
   * Se o plano já existe, atualiza. Se não, cria.
   */
  static async createOrUpdatePlano(
    pacienteId: string,
    nutricionistaId: string,
    nutricionistaNome: string,
    planoData: Partial<NutriPlanoDoc>
  ): Promise<string> {
    try {
      const planoId = gerarPlanoId(pacienteId, nutricionistaId);
      const planoRef = doc(db, COL_NUTRI_PLANOS, planoId);
      const planoExistente = await getDoc(planoRef);

      const agora = new Date();
      const timestampAgora = Timestamp.fromDate(agora);

      // Dados base
      const dadosBase: Partial<NutriPlanoDoc> = {
        id: planoId,
        pacienteId,
        nutricionistaId,
        nutricionistaNome,
        atualizadoEm: agora,
        atualizadoPor: nutricionistaId,
      };

      if (planoExistente.exists()) {
        // Atualizar plano existente
        const dataExistente = planoExistente.data();
        await setDoc(planoRef, {
          ...dataExistente,
          ...planoData,
          ...dadosBase,
          // Preservar criadoEm e criadoPor
          criadoEm: dataExistente.criadoEm || timestampAgora,
          criadoPor: dataExistente.criadoPor || nutricionistaId,
        }, { merge: true });
      } else {
        // Criar novo plano
        await setDoc(planoRef, {
          ...planoData,
          ...dadosBase,
          criadoEm: agora,
          criadoPor: nutricionistaId,
        });
      }

      return planoId;
    } catch (error) {
      console.error('Erro ao criar/atualizar plano nutricional:', error);
      throw error;
    }
  }

  /**
   * Verificar se nutricionista tem permissão para acessar/editar plano
   * (Por enquanto, apenas o nutricionista que criou pode editar)
   */
  static async hasPermission(
    planoId: string,
    nutricionistaId: string
  ): Promise<boolean> {
    try {
      const planoRef = doc(db, COL_NUTRI_PLANOS, planoId);
      const planoSnap = await getDoc(planoRef);

      if (!planoSnap.exists()) {
        return false;
      }

      const data = planoSnap.data();
      return data.nutricionistaId === nutricionistaId;
    } catch (error) {
      console.error('Erro ao verificar permissão do plano:', error);
      return false;
    }
  }
}

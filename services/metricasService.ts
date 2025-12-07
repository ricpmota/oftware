import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { MetricasEvolucao, AplicacaoRealizada } from '@/types/calendario';
import { AplicacaoService } from './aplicacaoService';

export class MetricasService {
  /**
   * Calcula todas as métricas de evolução do tratamento
   */
  static async calcularMetricas(): Promise<MetricasEvolucao> {
    try {
      // Buscar todos os pacientes em tratamento
      const pacientesQuery = query(
        collection(db, 'pacientes_completos'),
        where('statusTratamento', '==', 'em_tratamento')
      );
      
      const pacientesSnapshot = await getDocs(pacientesQuery);
      const pacientes: PacienteCompleto[] = [];

      for (const doc of pacientesSnapshot.docs) {
        const pacienteData = doc.data();
        pacientes.push({
          id: doc.id,
          ...pacienteData,
          dataCadastro: pacienteData.dataCadastro?.toDate() || new Date(),
        } as PacienteCompleto);
      }

      // Buscar aplicações realizadas
      const aplicacoesRealizadas = await AplicacaoService.buscarAplicacoesRealizadas();

      // Calcular métricas
      const totalPacientes = pacientes.length;
      const totalAplicacoes = aplicacoesRealizadas.length;
      const totalMgAplicadas = aplicacoesRealizadas.reduce((sum, a) => sum + a.dose, 0);
      const mediaMgPorPaciente = totalPacientes > 0 ? totalMgAplicadas / totalPacientes : 0;

      // Distribuição por ciclo
      const distribuicaoCiclos: Record<number, number> = {};
      aplicacoesRealizadas.forEach(a => {
        distribuicaoCiclos[a.numeroAplicacao] = (distribuicaoCiclos[a.numeroAplicacao] || 0) + 1;
      });

      const distribuicaoCiclosArray = Object.entries(distribuicaoCiclos)
        .map(([ciclo, quantidade]) => ({
          ciclo: parseInt(ciclo),
          quantidade,
        }))
        .sort((a, b) => a.ciclo - b.ciclo);

      // Progresso mensal
      const progressoMensal: Record<string, { totalMg: number; totalPacientes: Set<string> }> = {};
      
      aplicacoesRealizadas.forEach(aplicacao => {
        const mes = aplicacao.data.toISOString().substring(0, 7); // "2024-01"
        if (!progressoMensal[mes]) {
          progressoMensal[mes] = { totalMg: 0, totalPacientes: new Set() };
        }
        progressoMensal[mes].totalMg += aplicacao.dose;
        progressoMensal[mes].totalPacientes.add(aplicacao.pacienteId);
      });

      const progressoMensalArray = Object.entries(progressoMensal)
        .map(([mes, dados]) => ({
          mes,
          totalMg: dados.totalMg,
          totalPacientes: dados.totalPacientes.size,
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

      return {
        totalPacientes,
        totalAplicacoes,
        totalMgAplicadas,
        mediaMgPorPaciente,
        distribuicaoCiclos: distribuicaoCiclosArray,
        progressoMensal: progressoMensalArray,
      };
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
      throw error;
    }
  }
}


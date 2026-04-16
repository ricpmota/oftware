import { collection, doc, getDocs, getDoc, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NPSResposta, NPSTipo, classificarNPS, calcularNPS, NPSEstatisticas } from '@/types/nps';

const COLLECTION_NAME = 'nps_respostas';

export class NPSService {
  // Salvar resposta NPS
  static async salvarResposta(resposta: Omit<NPSResposta, 'id' | 'dataResposta' | 'npsClassificacao'>): Promise<string> {
    try {
      const npsClassificacao = classificarNPS(resposta.npsScore);
      
      const respostaData: any = {
        ...resposta,
        npsClassificacao,
        dataResposta: Timestamp.now(),
      };
      
      // Garantir que medicoResponsavelId seja incluído se tipo for 'paciente'
      if (resposta.tipo === 'paciente' && resposta.medicoResponsavelId) {
        respostaData.medicoResponsavelId = resposta.medicoResponsavelId;
      }
      
      console.log('💾 NPSService: Salvando resposta com dados:', {
        tipo: respostaData.tipo,
        userId: respostaData.userId,
        medicoResponsavelId: respostaData.medicoResponsavelId,
        temMedicoResponsavelId: !!respostaData.medicoResponsavelId
      });
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), respostaData);
      console.log('✅ NPSService: Resposta salva com ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao salvar resposta NPS:', error);
      throw error;
    }
  }

  // Verificar se uma resposta NPS está completa
  static isRespostaCompleta(resposta: NPSResposta | null): boolean {
    if (!resposta) return false;
    
    // Verificar se tem NPS score (obrigatório)
    if (resposta.npsScore === null || resposta.npsScore === undefined) {
      return false;
    }
    
    // Verificar se precisa de melhoriaTexto (obrigatório para detratores e neutros)
    const classificacao = classificarNPS(resposta.npsScore);
    if ((classificacao === 'detrator' || classificacao === 'neutro') && !resposta.melhoriaTexto?.trim()) {
      return false;
    }
    
    // Verificar campos específicos do tipo
    if (resposta.tipo === 'paciente') {
      // Para paciente, verificar se tem pelo menos os campos principais
      if (!resposta.paciente) return false;
      const p = resposta.paciente;
      if (!p.acompanhamentoMedico || !p.clarezaTratamento || !p.segurancaPrivacidade || !p.impactoTratamento) {
        return false;
      }
    } else if (resposta.tipo === 'medico') {
      // Para médico, verificar se tem pelo menos os campos principais
      if (!resposta.medico) return false;
      const m = resposta.medico;
      if (!m.facilidadeUso || !m.qualidadeInformacoes || !m.ganhoProfissional || !m.intencaoContinuidade) {
        return false;
      }
    }
    
    return true;
  }

  // Buscar resposta por userId (para verificar se já respondeu)
  static async getRespostaPorUserId(userId: string): Promise<NPSResposta | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      // Ordenar manualmente após buscar (para evitar necessidade de índice composto)
      const docs = snapshot.docs.sort((a, b) => {
        const dataA = a.data().dataResposta?.toDate?.() || a.data().dataResposta || new Date(0);
        const dataB = b.data().dataResposta?.toDate?.() || b.data().dataResposta || new Date(0);
        return new Date(dataB).getTime() - new Date(dataA).getTime();
      });
      
      const data = docs[0].data();
      return {
        id: docs[0].id,
        ...data,
        dataResposta: data.dataResposta?.toDate() || new Date(data.dataResposta) || new Date(),
      } as NPSResposta;
    } catch (error) {
      console.error('Erro ao buscar resposta NPS:', error);
      throw error;
    }
  }

  // Buscar todas as respostas (para dashboard)
  static async getAllRespostas(): Promise<NPSResposta[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('dataResposta', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataResposta: data.dataResposta?.toDate() || new Date(),
        } as NPSResposta;
      });
    } catch (error) {
      console.error('Erro ao buscar todas as respostas NPS:', error);
      throw error;
    }
  }

  // Buscar respostas por tipo
  static async getRespostasPorTipo(tipo: NPSTipo): Promise<NPSResposta[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('tipo', '==', tipo),
        orderBy('dataResposta', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataResposta: data.dataResposta?.toDate() || new Date(),
        } as NPSResposta;
      });
    } catch (error) {
      console.error('Erro ao buscar respostas NPS por tipo:', error);
      throw error;
    }
  }

  // Buscar respostas de pacientes por médico responsável
  static async getRespostasPorMedico(medicoId: string): Promise<NPSResposta[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      const q = query(
        collection(db, COLLECTION_NAME),
        where('tipo', '==', 'paciente'),
        where('medicoResponsavelId', '==', medicoId)
      );
      const snapshot = await getDocs(q);
      
      // Converter e ordenar em memória
      const respostas = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataResposta: data.dataResposta?.toDate() || new Date(),
        } as NPSResposta;
      });
      
      // Ordenar por dataResposta (mais recente primeiro)
      respostas.sort((a, b) => {
        const dataA = a.dataResposta instanceof Date ? a.dataResposta : new Date(a.dataResposta);
        const dataB = b.dataResposta instanceof Date ? b.dataResposta : new Date(b.dataResposta);
        return dataB.getTime() - dataA.getTime();
      });
      
      return respostas;
    } catch (error) {
      console.error('Erro ao buscar respostas NPS por médico:', error);
      throw error;
    }
  }

  // Calcular estatísticas
  static async getEstatisticas(): Promise<NPSEstatisticas> {
    try {
      const todasRespostas = await this.getAllRespostas();
      const respostasPacientes = todasRespostas.filter(r => r.tipo === 'paciente');
      const respostasMedicos = todasRespostas.filter(r => r.tipo === 'medico');
      
      // Calcular NPS
      const npsGeral = calcularNPS(todasRespostas);
      const npsPacientes = calcularNPS(respostasPacientes);
      const npsMedicos = calcularNPS(respostasMedicos);
      
      // Distribuição geral
      const distribuicao = todasRespostas.reduce((acc, r) => {
        acc[r.npsClassificacao]++;
        return acc;
      }, { promotor: 0, neutro: 0, detrator: 0 });
      
      // Distribuição pacientes
      const distribuicaoPacientes = respostasPacientes.reduce((acc, r) => {
        acc[r.npsClassificacao]++;
        return acc;
      }, { promotor: 0, neutro: 0, detrator: 0 });
      
      // Distribuição médicos
      const distribuicaoMedicos = respostasMedicos.reduce((acc, r) => {
        acc[r.npsClassificacao]++;
        return acc;
      }, { promotor: 0, neutro: 0, detrator: 0 });
      
      // Extrair palavras-chave das respostas abertas
      const textos: string[] = [];
      todasRespostas.forEach(r => {
        if (r.melhoriaTexto) textos.push(r.melhoriaTexto);
        if (r.paciente?.motivacaoContinuar) textos.push(r.paciente.motivacaoContinuar);
        if (r.medico?.oQueTornariaIndispensavel) textos.push(r.medico.oQueTornariaIndispensavel);
      });
      
      const palavrasChave = this.extrairPalavrasChave(textos);
      
      // Calcular risco de churn (% detratores + neutros)
      const riscoChurn = todasRespostas.length > 0
        ? ((distribuicao.detrator + distribuicao.neutro) / todasRespostas.length) * 100
        : 0;
      
      return {
        npsGeral,
        npsPacientes,
        npsMedicos,
        totalRespostas: todasRespostas.length,
        totalPacientes: respostasPacientes.length,
        totalMedicos: respostasMedicos.length,
        distribuicao,
        distribuicaoPacientes,
        distribuicaoMedicos,
        palavrasChave,
        riscoChurn,
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas NPS:', error);
      throw error;
    }
  }

  // Extrair palavras-chave mais frequentes
  private static extrairPalavrasChave(textos: string[]): Array<{ palavra: string; frequencia: number }> {
    const palavrasComuns = ['a', 'o', 'e', 'de', 'que', 'um', 'uma', 'em', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'suas', 'numa', 'pelos', 'pelas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'pelos', 'essa', 'num', 'pelas', 'num', 'pelas'];
    
    const contagem: { [key: string]: number } = {};
    
    textos.forEach(texto => {
      if (!texto) return;
      
      const palavras = texto
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 3 && !palavrasComuns.includes(p));
      
      palavras.forEach(palavra => {
        contagem[palavra] = (contagem[palavra] || 0) + 1;
      });
    });
    
    return Object.entries(contagem)
      .map(([palavra, frequencia]) => ({ palavra, frequencia }))
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 20); // Top 20 palavras
  }
}

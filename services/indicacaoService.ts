import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Indicacao } from '@/types/indicacao';
import type { InternationalPhoneFields } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  findMatchingIndicacao,
  indicadoPorPhoneWriteFields,
  indicacaoPhoneWriteFields,
  optionalIndicacaoDdiPais,
} from '@/lib/whatsapp/resolveIndicacaoSolicitacaoPhone';

function mapIndicacao(id: string, data: Record<string, unknown>): Indicacao {
  return {
    id,
    indicadoPor: (data.indicadoPor as string) || '',
    indicadoPorNome: data.indicadoPorNome as string | undefined,
    indicadoPorTelefone: data.indicadoPorTelefone as string | undefined,
    nomePaciente: (data.nomePaciente as string) || '',
    telefonePaciente: (data.telefonePaciente as string) || '',
    estado: (data.estado as string) || '',
    cidade: (data.cidade as string) || '',
    medicoId: (data.medicoId as string) || '',
    medicoNome: (data.medicoNome as string) || '',
    status: (data.status as Indicacao['status']) || 'pendente',
    criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() || new Date(),
    visualizadaEm: (data.visualizadaEm as { toDate?: () => Date })?.toDate?.(),
    virouVendaEm: (data.virouVendaEm as { toDate?: () => Date })?.toDate?.(),
    pagaEm: (data.pagaEm as { toDate?: () => Date })?.toDate?.(),
    pacienteIdVenda: data.pacienteIdVenda as string | undefined,
    ...optionalIndicacaoDdiPais(data),
  };
}

export class IndicacaoService {
  private static COLLECTION = 'indicacoes';

  /**
   * Criar uma nova indicação
   */
  static async criarIndicacao(indicacao: Omit<Indicacao, 'id' | 'criadoEm'>): Promise<string> {
    try {
      const phoneWrite = indicacaoPhoneWriteFields(indicacao);
      const indicadoPorWrite = indicadoPorPhoneWriteFields(indicacao);
      const indicacaoData: Record<string, unknown> = {
        indicadoPor: indicacao.indicadoPor,
        nomePaciente: indicacao.nomePaciente,
        ...phoneWrite,
        estado: indicacao.estado,
        cidade: indicacao.cidade,
        medicoId: indicacao.medicoId,
        medicoNome: indicacao.medicoNome,
        status: 'pendente',
        criadoEm: Timestamp.now(),
        ...indicadoPorWrite,
      };

      if (indicacao.indicadoPorNome) {
        indicacaoData.indicadoPorNome = indicacao.indicadoPorNome;
      }

      const docRef = await addDoc(collection(db, this.COLLECTION), indicacaoData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar indicação:', error);
      throw error;
    }
  }

  /**
   * Buscar indicações por quem indicou (paciente)
   */
  static async getIndicacoesPorPaciente(emailPaciente: string): Promise<Indicacao[]> {
    try {
      console.log('Buscando indicações para email:', emailPaciente);
      
      // Primeiro buscar sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('indicadoPor', '==', emailPaciente)
      );
      const snapshot = await getDocs(q);
      
      console.log('Documentos encontrados:', snapshot.docs.length);
      
      const indicacoes = snapshot.docs.map((docSnap) =>
        mapIndicacao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      console.log('Indicações processadas:', indicacoes.length);
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações do paciente:', error);
      throw error;
    }
  }

  /**
   * Buscar indicações pendentes para um médico
   * Retorna todas as indicações do médico (pendentes, visualizadas, vendas, pagas)
   */
  static async getIndicacoesPendentesPorMedico(medicoId: string): Promise<Indicacao[]> {
    try {
      // Buscar todas as indicações do médico sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('medicoId', '==', medicoId)
      );
      const snapshot = await getDocs(q);
      
      const indicacoes = snapshot.docs.map((docSnap) =>
        mapIndicacao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações pendentes do médico:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as indicações de um médico (para admin)
   */
  static async getIndicacoesPorMedico(medicoId: string): Promise<Indicacao[]> {
    try {
      // Buscar sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('medicoId', '==', medicoId)
      );
      const snapshot = await getDocs(q);
      
      const indicacoes = snapshot.docs.map((docSnap) =>
        mapIndicacao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações do médico:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como visualizada pelo médico
   */
  static async marcarComoVisualizada(indicacaoId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'visualizada',
        visualizadaEm: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como visualizada:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como venda (quando paciente faz login e telefone bate)
   */
  static async marcarComoVenda(indicacaoId: string, pacienteId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'venda',
        virouVendaEm: Timestamp.now(),
        pacienteIdVenda: pacienteId
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como venda:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como paga pelo médico
   */
  static async marcarComoPaga(indicacaoId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'paga',
        pagaEm: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como paga:', error);
      throw error;
    }
  }

  /**
   * Buscar indicação por telefone (matching no cadastro).
   * Firestore: status in ['pendente','visualizada'] — sem where em telefone.
   * Comparação client-side pela chave canônica derivada (não persistida).
   */
  static async getIndicacaoPorTelefone(
    source: string | InternationalPhoneFields,
  ): Promise<Indicacao | null> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('status', 'in', ['pendente', 'visualizada'])
      );
      const snapshot = await getDocs(q);
      const candidatos = snapshot.docs.map((docSnap) =>
        mapIndicacao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      return findMatchingIndicacao(candidatos, source);
    } catch (error) {
      console.error('Erro ao buscar indicação por telefone:', error);
      return null;
    }
  }
}

import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';

export class PrescricaoService {
  private static COLLECTION_NAME = 'prescricoes';

  /**
   * Criar ou atualizar uma prescrição
   */
  static async createOrUpdatePrescricao(prescricao: Omit<Prescricao, 'id'> | Prescricao): Promise<string> {
    try {
      const prescricaoData: any = {
        medicoId: prescricao.medicoId,
        nome: prescricao.nome,
        descricao: prescricao.descricao,
        itens: prescricao.itens,
        isTemplate: prescricao.isTemplate || false,
        atualizadoEm: new Date(),
        criadoPor: prescricao.criadoPor,
      };

      if (prescricao.pacienteId) {
        prescricaoData.pacienteId = prescricao.pacienteId;
      }

      if (prescricao.observacoes) {
        prescricaoData.observacoes = prescricao.observacoes;
      }

      if (prescricao.pesoPaciente) {
        prescricaoData.pesoPaciente = prescricao.pesoPaciente;
      }

      // Se tem ID, atualizar; senão, criar novo
      if ('id' in prescricao && prescricao.id) {
        prescricaoData.criadoEm = prescricao.criadoEm;
        await updateDoc(doc(db, this.COLLECTION_NAME, prescricao.id), prescricaoData);
        return prescricao.id;
      } else {
        prescricaoData.criadoEm = new Date();
        const docRef = doc(collection(db, this.COLLECTION_NAME));
        await setDoc(docRef, prescricaoData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar prescrição:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as prescrições de um médico
   */
  static async getPrescricoesByMedico(medicoId: string): Promise<Prescricao[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('medicoId', '==', medicoId),
        orderBy('atualizadoEm', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          medicoId: data.medicoId,
          pacienteId: data.pacienteId,
          nome: data.nome,
          descricao: data.descricao,
          itens: data.itens || [],
          observacoes: data.observacoes,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor,
          isTemplate: data.isTemplate || false,
          pesoPaciente: data.pesoPaciente,
        } as Prescricao;
      });
    } catch (error) {
      console.error('Erro ao buscar prescrições:', error);
      return [];
    }
  }

  /**
   * Buscar todas as prescrições template (globais)
   */
  static async getPrescricoesTemplate(): Promise<Prescricao[]> {
    try {
      // Buscar sem orderBy primeiro para evitar problemas de índice
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('isTemplate', '==', true)
      );
      
      const snapshot = await getDocs(q);
      console.log('📋 Prescrições template encontradas:', snapshot.docs.length);
      
      const prescricoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          medicoId: data.medicoId,
          pacienteId: data.pacienteId,
          nome: data.nome,
          descricao: data.descricao,
          itens: data.itens || [],
          observacoes: data.observacoes,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor,
          isTemplate: data.isTemplate || false,
          pesoPaciente: data.pesoPaciente,
        } as Prescricao;
      });
      
      // Ordenar no cliente (mais recente primeiro)
      return prescricoes.sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar prescrições template:', error);
      return [];
    }
  }

  /**
   * Criar prescrições padrão globais (templates) se não existirem
   */
  static async criarPrescricoesPadraoGlobais(): Promise<void> {
    try {
      // Verificar quais templates já existem
      const templatesExistentes = await this.getPrescricoesTemplate();
      const nomesExistentes = templatesExistentes.map(t => t.nome);
      
      // Criar templates padrão (sem pacienteId, sem medicoId específico, isTemplate: true)
      // Usar um peso médio de referência (70kg) apenas para criar o template inicial
      // As dosagens serão recalculadas automaticamente quando o template for usado com o peso real do paciente
      const pesoReferencia = 70;
      const itensSuplementar = this.criarPrescricoesPadrao(pesoReferencia);
      const itensProbioticos = this.criarPrescricaoProbioticos();

      // Prescrição 1: Suplementar Padrão
      if (!nomesExistentes.includes('Prescrição Suplementar Padrão')) {
        const prescricaoSuplementar: Omit<Prescricao, 'id'> = {
          medicoId: 'SISTEMA', // ID especial para templates do sistema
          nome: 'Prescrição Suplementar Padrão',
          descricao: 'Prescrição de suplementos para auxiliar no tratamento de perda de peso. As dosagens são ajustadas automaticamente conforme o peso do paciente.',
          itens: itensSuplementar,
          observacoes: 'As dosagens são calculadas automaticamente com base no peso do paciente. A dosagem de Whey Protein é de 1,6g por kg de peso corporal, dividido em 3 tomadas ao dia.',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          criadoPor: 'SISTEMA',
          isTemplate: true,
          pesoPaciente: pesoReferencia
        };
        await this.createOrUpdatePrescricao(prescricaoSuplementar);
        console.log('✅ Prescrição Suplementar Padrão criada');
      }

      // Prescrição 2: Probióticos
      if (!nomesExistentes.includes('Prescrição de Probióticos')) {
        const prescricaoProbioticos: Omit<Prescricao, 'id'> = {
          medicoId: 'SISTEMA',
          nome: 'Prescrição de Probióticos',
          descricao: 'Prescrição de probióticos para uso oral. Manipular em cápsulas.',
          itens: itensProbioticos,
          observacoes: 'Manipular em cápsulas. Tomar 1 cápsula ao deitar, por tempo indeterminado ou conforme orientação médica.',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          criadoPor: 'SISTEMA',
          isTemplate: true
        };
        await this.createOrUpdatePrescricao(prescricaoProbioticos);
        console.log('✅ Prescrição de Probióticos criada');
      }

      console.log('✅ Verificação de prescrições padrão globais concluída');
    } catch (error) {
      console.error('Erro ao criar prescrições padrão globais:', error);
      throw error;
    }
  }

  /**
   * Buscar prescrições de um paciente específico
   */
  static async getPrescricoesByPaciente(pacienteId: string): Promise<Prescricao[]> {
    try {
      // Buscar sem orderBy primeiro para evitar problemas de índice
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('pacienteId', '==', pacienteId)
      );
      
      const snapshot = await getDocs(q);
      console.log(`📋 Prescrições do paciente ${pacienteId} encontradas:`, snapshot.docs.length);
      
      const prescricoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          medicoId: data.medicoId,
          pacienteId: data.pacienteId,
          nome: data.nome,
          descricao: data.descricao,
          itens: data.itens || [],
          observacoes: data.observacoes,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor,
          isTemplate: data.isTemplate || false,
          pesoPaciente: data.pesoPaciente,
        } as Prescricao;
      });
      
      // Ordenar no cliente (mais recente primeiro)
      return prescricoes.sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar prescrições do paciente:', error);
      return [];
    }
  }

  /**
   * Buscar TODAS as prescrições (para debug)
   */
  static async getAllPrescricoes(): Promise<Prescricao[]> {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      console.log('📋 TOTAL de prescrições no Firestore:', snapshot.docs.length);
      
      const prescricoes = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📋 Prescrição encontrada:', {
          id: doc.id,
          nome: data.nome,
          isTemplate: data.isTemplate,
          pacienteId: data.pacienteId,
          medicoId: data.medicoId
        });
        return {
          id: doc.id,
          medicoId: data.medicoId,
          pacienteId: data.pacienteId,
          nome: data.nome,
          descricao: data.descricao,
          itens: data.itens || [],
          observacoes: data.observacoes,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor,
          isTemplate: data.isTemplate || false,
          pesoPaciente: data.pesoPaciente,
        } as Prescricao;
      });
      
      return prescricoes;
    } catch (error) {
      console.error('Erro ao buscar todas as prescrições:', error);
      return [];
    }
  }

  /**
   * Buscar prescrição por ID
   */
  static async getPrescricaoById(id: string): Promise<Prescricao | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          medicoId: data.medicoId,
          pacienteId: data.pacienteId,
          nome: data.nome,
          descricao: data.descricao,
          itens: data.itens || [],
          observacoes: data.observacoes,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor,
          isTemplate: data.isTemplate || false,
          pesoPaciente: data.pesoPaciente,
        } as Prescricao;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar prescrição:', error);
      return null;
    }
  }

  /**
   * Deletar prescrição
   */
  static async deletePrescricao(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
    } catch (error) {
      console.error('Erro ao deletar prescrição:', error);
      throw error;
    }
  }

  /**
   * Criar prescrições padrão baseadas no peso do paciente
   * Nota: As dosagens seguem recomendações gerais para suporte nutricional em perda de peso.
   * Whey Protein: 1,6g/kg/dia é uma dosagem adequada para preservação de massa muscular durante déficit calórico.
   * Creatina: 3,5g/dia é a dosagem padrão de manutenção, benéfica para preservação de força e massa muscular.
   * IMPORTANTE: Sempre ajustar conforme avaliação clínica individual e considerar contraindicações.
   */
  static criarPrescricoesPadrao(pesoKg: number): PrescricaoItem[] {
    const wheyDosagemPorKg = 1.6;
    const wheyDosagemTotal = (pesoKg * wheyDosagemPorKg).toFixed(1);
    const wheyPorRefeicao = (pesoKg * wheyDosagemPorKg / 3).toFixed(1);
    
    return [
      {
        medicamento: 'Whey Protein',
        dosagem: `${wheyDosagemTotal}g por dia (${wheyDosagemPorKg}g por kg de peso corporal)`,
        frequencia: '3x ao dia',
        instrucoes: `Tomar aproximadamente ${wheyPorRefeicao}g de whey protein 3 vezes ao dia (totalizando ${wheyDosagemTotal}g/dia). Preferencialmente após as refeições principais ou após exercícios físicos. A dosagem de 1,6g/kg/dia é recomendada para preservação de massa muscular durante processo de perda de peso.`,
        quantidade: `${wheyDosagemTotal}g/dia`
      },
      {
        medicamento: 'Creatina MAX',
        dosagem: '3,5g por dia',
        frequencia: '1x ao dia',
        instrucoes: 'Tomar 3,5g por dia, diluído em 200ml de água. Preferencialmente após o treino ou junto com uma refeição. A creatina auxilia na preservação de força e massa muscular durante o processo de perda de peso.',
        quantidade: '3,5g/dia'
      }
    ];
  }

  /**
   * Criar prescrição padrão de Probióticos
   */
  static criarPrescricaoProbioticos(): PrescricaoItem[] {
    return [
      {
        medicamento: 'Probióticos',
        dosagem: 'Lactobacillus reuteri 2 bilhões UFC + Lactobacillus gasseri 2 bilhões UFC + Bifidobacterium longum 2 bilhões UFC + Lactobacillus acidophilus 1 bilhão UFC + Inulina 100 mg + FOS (Frutooligossacarídeos) 100 mg',
        frequencia: '1x ao dia',
        instrucoes: 'Manipular em cápsulas. Tomar 1 cápsula ao deitar, por tempo indeterminado ou conforme orientação médica.',
        quantidade: '1 cápsula'
      }
    ];
  }
}


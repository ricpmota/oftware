import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';
import type { PrescricaoPasta } from '@/types/prescricaoPasta';
import { PRESCRICOES_PADRAO } from '@/data/prescricoesPadraoCompleto';

export class PrescricaoService {
  private static COLLECTION_NAME = 'prescricoes';
  private static PASTAS_COLLECTION_NAME = 'prescricao_pastas';

  private static mapDocToPrescricao(id: string, data: Record<string, unknown>): Prescricao {
    return {
      id,
      medicoId: data.medicoId as string,
      pacienteId: (data.pacienteId as string) || undefined,
      pacienteNome: (data.pacienteNome as string) || undefined,
      nome: data.nome as string,
      descricao: (data.descricao as string) ?? '',
      itens: (data.itens as PrescricaoItem[]) ?? [],
      observacoes: (data.observacoes as string) || undefined,
      criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
      atualizadoEm: (data.atualizadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
      criadoPor: (data.criadoPor as string) ?? '',
      isTemplate: data.isTemplate === true,
      pesoPaciente: data.pesoPaciente != null ? Number(data.pesoPaciente) : undefined,
      tipoDocumento: data.tipoDocumento as Prescricao['tipoDocumento'],
      valorConsulta: data.valorConsulta != null ? Number(data.valorConsulta) : undefined,
      dataRecibo: typeof data.dataRecibo === 'string' ? data.dataRecibo : undefined,
      reciboDocumentoProfissional:
        data.reciboDocumentoProfissional === 'cpf' ||
        data.reciboDocumentoProfissional === 'cnpj' ||
        data.reciboDocumentoProfissional === 'omitir'
          ? data.reciboDocumentoProfissional
          : undefined,
      catalogoAba: data.catalogoAba as Prescricao['catalogoAba'],
      pastaId: (data.pastaId as string) || undefined,
      pastaNome: (data.pastaNome as string) || undefined,
    };
  }

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

      // Tratar pacienteId e pacienteNome: se for undefined/null, não incluir (ou remover se estiver atualizando)
      if (prescricao.pacienteId) {
        prescricaoData.pacienteId = prescricao.pacienteId;
      }

      if (prescricao.pacienteNome) {
        prescricaoData.pacienteNome = prescricao.pacienteNome;
      }

      if (prescricao.observacoes) {
        prescricaoData.observacoes = prescricao.observacoes;
      }

      if (prescricao.pesoPaciente) {
        prescricaoData.pesoPaciente = prescricao.pesoPaciente;
      }

      if (prescricao.catalogoAba) prescricaoData.catalogoAba = prescricao.catalogoAba;
      if (prescricao.pastaId) prescricaoData.pastaId = prescricao.pastaId;
      if (prescricao.pastaNome) prescricaoData.pastaNome = prescricao.pastaNome;

      if (prescricao.tipoDocumento === 'recibo_medico') {
        prescricaoData.tipoDocumento = 'recibo_medico';
        if (prescricao.valorConsulta != null && !Number.isNaN(Number(prescricao.valorConsulta))) {
          prescricaoData.valorConsulta = Number(prescricao.valorConsulta);
        }
        if (prescricao.dataRecibo && /^\d{4}-\d{2}-\d{2}$/.test(prescricao.dataRecibo)) {
          prescricaoData.dataRecibo = prescricao.dataRecibo;
        }
        if (
          prescricao.reciboDocumentoProfissional === 'cpf' ||
          prescricao.reciboDocumentoProfissional === 'cnpj' ||
          prescricao.reciboDocumentoProfissional === 'omitir'
        ) {
          prescricaoData.reciboDocumentoProfissional = prescricao.reciboDocumentoProfissional;
        }
      }

      // Se tem ID persistido (string não vazia), atualizar; senão, criar novo
      const prescricaoComId = prescricao as Prescricao;
      const idPersistido =
        typeof prescricaoComId.id === 'string' && prescricaoComId.id.length > 0 ? prescricaoComId.id : null;
      if (idPersistido) {
        prescricaoData.criadoEm = prescricao.criadoEm;
        // Se pacienteId for undefined/null e estiver atualizando, remover os campos do documento
        if (!prescricao.pacienteId) {
          prescricaoData.pacienteId = deleteField();
          prescricaoData.pacienteNome = deleteField();
        } else if (!prescricao.pacienteNome) {
          // Se pacienteId existe mas pacienteNome não, remover pacienteNome
          prescricaoData.pacienteNome = deleteField();
        }
        await updateDoc(doc(db, this.COLLECTION_NAME, idPersistido), prescricaoData);
        return idPersistido;
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
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenar no cliente depois
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('medicoId', '==', medicoId)
      );
      
      const snapshot = await getDocs(q);
      
      const prescricoes = snapshot.docs.map((docSnap) =>
        this.mapDocToPrescricao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
      // Ordenar no cliente (mais recente primeiro)
      return prescricoes.sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());
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
      
      const prescricoes = snapshot.docs.map((docSnap) =>
        this.mapDocToPrescricao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
      // Ordenar no cliente (mais recente primeiro)
      return prescricoes.sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar prescrições template:', error);
      return [];
    }
  }

  /** Pastas do catálogo global (metaadmingeral) — inclui pastas vazias. */
  static async getPastasCatalogoSistema(): Promise<PrescricaoPasta[]> {
    try {
      const q = query(
        collection(db, this.PASTAS_COLLECTION_NAME),
        where('medicoId', '==', 'SISTEMA')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            medicoId: 'SISTEMA' as const,
            catalogoAba: (data.catalogoAba as PrescricaoPasta['catalogoAba']) || 'prescricao',
            nome: String(data.nome ?? ''),
            ordem: typeof data.ordem === 'number' ? data.ordem : 0,
            sistemaPadrao: data.sistemaPadrao === true,
            criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
            atualizadoEm: (data.atualizadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
          };
        })
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    } catch (error) {
      console.error('Erro ao buscar pastas do catálogo SISTEMA:', error);
      return [];
    }
  }

  /**
   * Criar prescrições padrão globais (templates) se não existirem
   */
  static async criarPrescricoesPadraoGlobais(): Promise<void> {
    try {
      // Verificar quais templates já existem (após remover duplicatas/obsoletos do mesmo modelo)
      let templatesExistentes = await this.getPrescricoesTemplate();
      const nomesTemplatesMitocondrialObsoletos = [
        'Micronutrientes — SUPORTE MITOCONDRIAL (ENERGIA CELULAR)',
        'Micronutrientes — coenzima q10 + nadh',
      ];
      for (const t of templatesExistentes) {
        if (t.medicoId === 'SISTEMA' && nomesTemplatesMitocondrialObsoletos.includes(t.nome)) {
          await this.deletePrescricao(t.id);
          console.log('🗑️ Template obsoleto removido:', t.nome);
        }
      }
      templatesExistentes = await this.getPrescricoesTemplate();

      const nomeReciboPadrao = 'Recibo Médico — Consulta padrão';
      const tituloRecibo = (nome: string) => {
        const n = (nome || '').trim();
        return n.includes(' — ') ? n.split(' — ')[1]?.trim() || n : n;
      };
      const normalizarNomeRecibo = (nome: string) =>
        tituloRecibo(nome)
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '');
      const normalizarNomeTemplate = (nome: string) =>
        (nome || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{M}/gu, '');
      const isReciboConsultaPadrao = (t: Prescricao) =>
        t.tipoDocumento === 'recibo_medico' && normalizarNomeRecibo(t.nome).includes('consulta padrao');
      const nomeProbioticosPadrao = 'Prescrição de Probióticos';
      const isProbioticosPadrao = (t: Prescricao) =>
        t.medicoId === 'SISTEMA' && normalizarNomeTemplate(t.nome).includes('probiotico');

      const recibosConsultaPadrao = templatesExistentes.filter(isReciboConsultaPadrao);
      if (recibosConsultaPadrao.length > 1) {
        const canonico =
          recibosConsultaPadrao.find((t) => t.nome === nomeReciboPadrao && t.medicoId === 'SISTEMA') ??
          recibosConsultaPadrao.find((t) => t.medicoId === 'SISTEMA') ??
          recibosConsultaPadrao[0];
        for (const t of recibosConsultaPadrao) {
          if (t.id !== canonico.id) {
            await this.deletePrescricao(t.id);
            console.log('🗑️ Recibo Consulta padrão duplicado removido:', t.nome);
          }
        }
        templatesExistentes = await this.getPrescricoesTemplate();
      }

      const probioticosDuplicados = templatesExistentes.filter(isProbioticosPadrao);
      if (probioticosDuplicados.length > 1) {
        const canonico =
          probioticosDuplicados.find((t) => t.nome === nomeProbioticosPadrao) ?? probioticosDuplicados[0];
        for (const t of probioticosDuplicados) {
          if (t.id !== canonico.id) {
            await this.deletePrescricao(t.id);
            console.log('🗑️ Prescrição de Probióticos duplicada removida:', t.nome);
          }
        }
        templatesExistentes = await this.getPrescricoesTemplate();
      }

      const nomesExistentes = templatesExistentes.map((t) => t.nome);
      
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
      if (!templatesExistentes.some(isProbioticosPadrao)) {
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

      if (!templatesExistentes.some(isReciboConsultaPadrao)) {
        const descReciboPadrao =
          'Consulta médica para avaliação clínica, orientação terapêutica, planejamento metabólico e acompanhamento médico no tratamento da obesidade.';
        const reciboPadrao: Omit<Prescricao, 'id'> = {
          medicoId: 'SISTEMA',
          nome: nomeReciboPadrao,
          descricao: descReciboPadrao,
          itens: [],
          observacoes: '',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          criadoPor: 'SISTEMA',
          isTemplate: true,
          tipoDocumento: 'recibo_medico',
        };
        await this.createOrUpdatePrescricao(reciboPadrao);
        console.log('✅ Recibo Médico padrão (template) criado');
      }

      const nomeMicronutMito = 'Micronutrientes — Coenzima q10 + NADH';
      const defMicronutMito = PRESCRICOES_PADRAO.find((d) => d.nome === nomeMicronutMito);
      if (defMicronutMito && !nomesExistentes.includes(defMicronutMito.nome)) {
        const prescMicronutMito: Omit<Prescricao, 'id'> = {
          medicoId: 'SISTEMA',
          nome: defMicronutMito.nome,
          descricao: defMicronutMito.descricao,
          itens: defMicronutMito.itens,
          observacoes: defMicronutMito.observacoes,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          criadoPor: 'SISTEMA',
          isTemplate: true,
        };
        await this.createOrUpdatePrescricao(prescMicronutMito);
        console.log('✅ Template Micronutrientes — Coenzima q10 + NADH criado');
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
      
      const prescricoes = snapshot.docs.map((docSnap) =>
        this.mapDocToPrescricao(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      
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
      
      const prescricoes = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        console.log('📋 Prescrição encontrada:', {
          id: docSnap.id,
          nome: data.nome,
          isTemplate: data.isTemplate,
          pacienteId: data.pacienteId,
          medicoId: data.medicoId,
        });
        return this.mapDocToPrescricao(docSnap.id, data as Record<string, unknown>);
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
        return this.mapDocToPrescricao(docSnap.id, docSnap.data() as Record<string, unknown>);
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


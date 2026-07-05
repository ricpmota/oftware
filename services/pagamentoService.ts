import { collection, doc, getDoc, setDoc, getDocs, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';

export class PagamentoService {
  private static readonly COLLECTION = 'pagamentos_pacientes';
  private static readonly COLLECTION_NUTRI_PACIENTE = 'pagamentos_nutricionista_paciente';

  private static resolvePagamentoDocId(pagamento: PagamentoPaciente): string {
    const pacienteId = typeof pagamento?.pacienteId === 'string' ? pagamento.pacienteId.trim() : '';
    if (!pacienteId) {
      throw new Error('Pagamento sem pacienteId valido para salvar no Firestore.');
    }
    return pacienteId;
  }

  // Salvar ou atualizar pagamento de um paciente
  static async salvarPagamento(pagamento: PagamentoPaciente): Promise<void> {
    try {
      // Normalizar datas antes de salvar (remover undefined e garantir Date)
      const pagamentoToSave: any = {
        ...pagamento,
        dataUltimaAtualizacao: new Date(),
      };

      if (!pagamentoToSave.dataPagamento) {
        delete pagamentoToSave.dataPagamento;
      }
      if (!pagamentoToSave.dataVencimento) {
        delete pagamentoToSave.dataVencimento;
      }
      if (pagamentoToSave.parcelas && Array.isArray(pagamentoToSave.parcelas)) {
        pagamentoToSave.parcelas = pagamentoToSave.parcelas.map((p: any) => {
          const parcela: any = { ...p };
          if (!parcela.dataPagamento) {
            delete parcela.dataPagamento;
          }
          if (!parcela.dataVencimento) {
            delete parcela.dataVencimento;
          }
          return parcela;
        });
      }

      // Ajustar status automaticamente para "em_aberto" se houver valor pendente vencido
      const hoje = new Date();
      const valorPendente = pagamentoToSave.valorPendente || 0;
      const temParcelaVencida =
        Array.isArray(pagamentoToSave.parcelas) &&
        pagamentoToSave.parcelas.some(
          (p: any) => p.dataVencimento && p.dataVencimento < hoje && p.status !== 'paga'
        );
      const vencimentoGeralVencido =
        pagamentoToSave.dataVencimento && pagamentoToSave.dataVencimento < hoje;

      if (
        valorPendente > 0 &&
        (temParcelaVencida || vencimentoGeralVencido) &&
        pagamentoToSave.statusPagamento !== 'pago'
      ) {
        pagamentoToSave.statusPagamento = 'em_aberto';
      }

      const pagamentoDocId = this.resolvePagamentoDocId(pagamento);
      const pagamentoRef = doc(db, this.COLLECTION, pagamentoDocId);
      await setDoc(
        pagamentoRef,
        pagamentoToSave,
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      throw error;
    }
  }

  // Buscar pagamento de um paciente
  static async getPagamentoPorPacienteId(pacienteId: string): Promise<PagamentoPaciente | null> {
    try {
      const pagamentoRef = doc(db, this.COLLECTION, pacienteId);
      const pagamentoSnap = await getDoc(pagamentoRef);
      
      if (pagamentoSnap.exists()) {
        const data = pagamentoSnap.data();
        return {
          ...data,
          dataUltimaAtualizacao: data.dataUltimaAtualizacao?.toDate() || new Date(),
          dataVencimento: data.dataVencimento?.toDate(),
          dataPagamento: data.dataPagamento?.toDate(),
          parcelas: data.parcelas?.map((p: any) => ({
            ...p,
            dataVencimento: p.dataVencimento?.toDate(),
            dataPagamento: p.dataPagamento?.toDate(),
          })) || [],
        } as PagamentoPaciente;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      throw error;
    }
  }

  /** Busca pagamentos apenas dos pacientes informados (evita full-scan da coleção). */
  static async getPagamentosPorPacienteIds(
    pacienteIds: string[]
  ): Promise<Record<string, PagamentoPaciente>> {
    if (pacienteIds.length === 0) return {};

    const pagamentos: Record<string, PagamentoPaciente> = {};
    const BATCH = 25;
    for (let i = 0; i < pacienteIds.length; i += BATCH) {
      const batch = pacienteIds.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (pacienteId) => {
          const pagamento = await this.getPagamentoPorPacienteId(pacienteId);
          return pagamento ? ([pacienteId, pagamento] as const) : null;
        })
      );
      results.forEach((entry) => {
        if (entry) pagamentos[entry[0]] = entry[1];
      });
    }
    return pagamentos;
  }

  // Buscar todos os pagamentos
  static async getAllPagamentos(): Promise<Record<string, PagamentoPaciente>> {
    try {
      const pagamentosRef = collection(db, this.COLLECTION);
      const pagamentosSnap = await getDocs(pagamentosRef);
      
      const pagamentos: Record<string, PagamentoPaciente> = {};
      pagamentosSnap.forEach((doc) => {
        const data = doc.data();
        pagamentos[doc.id] = {
          ...data,
          dataUltimaAtualizacao: data.dataUltimaAtualizacao?.toDate() || new Date(),
          dataVencimento: data.dataVencimento?.toDate(),
          dataPagamento: data.dataPagamento?.toDate(),
          parcelas: data.parcelas?.map((p: any) => ({
            ...p,
            dataVencimento: p.dataVencimento?.toDate(),
            dataPagamento: p.dataPagamento?.toDate(),
          })) || [],
        } as PagamentoPaciente;
      });
      
      return pagamentos;
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      throw error;
    }
  }

  // ========== VENDAS AVULSAS ==========
  private static readonly COLLECTION_VENDAS_AVULSAS = 'vendas_avulsas';

  // Salvar venda avulsa
  static async salvarVendaAvulsa(venda: Omit<VendaAvulsa, 'id'>): Promise<string> {
    try {
      const vendaToSave: any = {
        ...venda,
        dataUltimaAtualizacao: new Date(),
        dataVenda: venda.dataVenda || new Date(),
      };

      if (!vendaToSave.dataPagamento) {
        delete vendaToSave.dataPagamento;
      }
      if (!vendaToSave.dataVencimento) {
        delete vendaToSave.dataVencimento;
      }
      if (vendaToSave.parcelas && Array.isArray(vendaToSave.parcelas)) {
        vendaToSave.parcelas = vendaToSave.parcelas.map((p: any) => {
          const parcela: any = { ...p };
          if (!parcela.dataPagamento) {
            delete parcela.dataPagamento;
          }
          if (!parcela.dataVencimento) {
            delete parcela.dataVencimento;
          }
          return parcela;
        });
      }

      // Ajustar status automaticamente para "em_aberto" se houver valor pendente vencido
      const hoje = new Date();
      const valorPendente = vendaToSave.valorPendente || 0;
      const temParcelaVencida =
        Array.isArray(vendaToSave.parcelas) &&
        vendaToSave.parcelas.some(
          (p: any) => p.dataVencimento && p.dataVencimento < hoje && p.status !== 'paga'
        );
      const vencimentoGeralVencido =
        vendaToSave.dataVencimento && vendaToSave.dataVencimento < hoje;

      if (
        valorPendente > 0 &&
        (temParcelaVencida || vencimentoGeralVencido) &&
        vendaToSave.statusPagamento !== 'pago'
      ) {
        vendaToSave.statusPagamento = 'em_aberto';
      }

      const vendasRef = collection(db, this.COLLECTION_VENDAS_AVULSAS);
      const docRef = await addDoc(vendasRef, vendaToSave);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar venda avulsa:', error);
      throw error;
    }
  }

  // Atualizar venda avulsa
  static async atualizarVendaAvulsa(venda: VendaAvulsa): Promise<void> {
    try {
      const vendaToSave: any = {
        ...venda,
        dataUltimaAtualizacao: new Date(),
      };

      if (!vendaToSave.dataPagamento) {
        delete vendaToSave.dataPagamento;
      }
      if (!vendaToSave.dataVencimento) {
        delete vendaToSave.dataVencimento;
      }
      if (vendaToSave.parcelas && Array.isArray(vendaToSave.parcelas)) {
        vendaToSave.parcelas = vendaToSave.parcelas.map((p: any) => {
          const parcela: any = { ...p };
          if (!parcela.dataPagamento) {
            delete parcela.dataPagamento;
          }
          if (!parcela.dataVencimento) {
            delete parcela.dataVencimento;
          }
          return parcela;
        });
      }

      // Ajustar status automaticamente
      const hoje = new Date();
      const valorPendente = vendaToSave.valorPendente || 0;
      const temParcelaVencida =
        Array.isArray(vendaToSave.parcelas) &&
        vendaToSave.parcelas.some(
          (p: any) => p.dataVencimento && p.dataVencimento < hoje && p.status !== 'paga'
        );
      const vencimentoGeralVencido =
        vendaToSave.dataVencimento && vendaToSave.dataVencimento < hoje;

      if (
        valorPendente > 0 &&
        (temParcelaVencida || vencimentoGeralVencido) &&
        vendaToSave.statusPagamento !== 'pago'
      ) {
        vendaToSave.statusPagamento = 'em_aberto';
      }

      const vendaRef = doc(db, this.COLLECTION_VENDAS_AVULSAS, venda.id);
      await setDoc(vendaRef, vendaToSave, { merge: true });
    } catch (error) {
      console.error('Erro ao atualizar venda avulsa:', error);
      throw error;
    }
  }

  // Buscar vendas avulsas (opcionalmente filtradas por médico)
  static async getAllVendasAvulsas(medicoId?: string): Promise<VendaAvulsa[]> {
    try {
      let vendasQuery;
      if (medicoId) {
        vendasQuery = query(
          collection(db, this.COLLECTION_VENDAS_AVULSAS),
          where('medicoId', '==', medicoId)
        );
      } else {
        vendasQuery = collection(db, this.COLLECTION_VENDAS_AVULSAS);
      }
      
      const vendasSnap = await getDocs(vendasQuery);
      
      const vendas: VendaAvulsa[] = [];
      vendasSnap.forEach((doc) => {
        const data = doc.data();
        vendas.push({
          id: doc.id,
          ...data,
          dataUltimaAtualizacao: data.dataUltimaAtualizacao?.toDate() || new Date(),
          dataVenda: data.dataVenda?.toDate() || new Date(),
          dataVencimento: data.dataVencimento?.toDate(),
          dataPagamento: data.dataPagamento?.toDate(),
          parcelas: data.parcelas?.map((p: any) => ({
            ...p,
            dataVencimento: p.dataVencimento?.toDate(),
            dataPagamento: p.dataPagamento?.toDate(),
          })) || [],
        } as VendaAvulsa);
      });
      
      return vendas;
    } catch (error) {
      console.error('Erro ao buscar vendas avulsas:', error);
      throw error;
    }
  }

  // Excluir venda avulsa
  static async excluirVendaAvulsa(vendaId: string): Promise<void> {
    try {
      const vendaRef = doc(db, this.COLLECTION_VENDAS_AVULSAS, vendaId);
      await deleteDoc(vendaRef);
    } catch (error) {
      console.error('Erro ao excluir venda avulsa:', error);
      throw error;
    }
  }

  // ========== PAGAMENTOS NUTRICIONISTA × PACIENTE ==========

  private static nutriPacienteDocId(nutricionistaId: string, pacienteId: string): string {
    return `${nutricionistaId}_${pacienteId}`;
  }

  private static mapPagamentoDoc(data: Record<string, unknown>, pacienteId: string): PagamentoPaciente {
    return {
      ...data,
      pacienteId,
      dataUltimaAtualizacao:
        (data.dataUltimaAtualizacao as { toDate?: () => Date })?.toDate?.() || new Date(),
      dataVencimento: (data.dataVencimento as { toDate?: () => Date })?.toDate?.(),
      dataPagamento: (data.dataPagamento as { toDate?: () => Date })?.toDate?.(),
      parcelas:
        (data.parcelas as Array<Record<string, unknown>>)?.map((p) => ({
          ...p,
          dataVencimento: (p.dataVencimento as { toDate?: () => Date })?.toDate?.(),
          dataPagamento: (p.dataPagamento as { toDate?: () => Date })?.toDate?.(),
        })) || [],
    } as PagamentoPaciente;
  }

  static async salvarPagamentoNutricionistaPaciente(
    nutricionistaId: string,
    pacienteId: string,
    pagamento: Omit<PagamentoPaciente, 'pacienteId'>
  ): Promise<void> {
    const docId = this.nutriPacienteDocId(nutricionistaId, pacienteId);
    const ref = doc(db, this.COLLECTION_NUTRI_PACIENTE, docId);
    await setDoc(
      ref,
      {
        ...pagamento,
        nutricionistaId,
        pacienteId,
        pacienteIdRef: pacienteId,
      },
      { merge: true }
    );
  }

  static async getPagamentoNutricionistaPorPaciente(
    nutricionistaId: string,
    pacienteId: string
  ): Promise<PagamentoPaciente | null> {
    const docId = this.nutriPacienteDocId(nutricionistaId, pacienteId);
    const snap = await getDoc(doc(db, this.COLLECTION_NUTRI_PACIENTE, docId));
    if (!snap.exists()) return null;
    return this.mapPagamentoDoc(snap.data() as Record<string, unknown>, pacienteId);
  }

  static async getAllPagamentosNutricionista(
    nutricionistaId: string
  ): Promise<Record<string, PagamentoPaciente>> {
    const q = query(
      collection(db, this.COLLECTION_NUTRI_PACIENTE),
      where('nutricionistaId', '==', nutricionistaId)
    );
    const snap = await getDocs(q);
    const out: Record<string, PagamentoPaciente> = {};
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const pacienteId = (data.pacienteId as string) || d.id.split('_').slice(1).join('_');
      out[pacienteId] = this.mapPagamentoDoc(data, pacienteId);
    });
    return out;
  }
}


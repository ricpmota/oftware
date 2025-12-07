import { collection, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';

/**
 * Remove valores undefined recursivamente de um objeto (Firestore não aceita undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

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
          dataToSave.evolucaoSeguimento = dataToSave.evolucaoSeguimento.map((seg: any) => {
            const cleanedSeg: any = {
              ...seg,
              dataRegistro: seg.dataRegistro instanceof Date 
                ? seg.dataRegistro 
                : seg.dataRegistro ? new Date(seg.dataRegistro) : new Date()
            };
            
            if (seg.doseAplicada) {
              cleanedSeg.doseAplicada = {
                ...seg.doseAplicada,
                data: seg.doseAplicada.data instanceof Date 
                  ? seg.doseAplicada.data 
                  : seg.doseAplicada.data ? new Date(seg.doseAplicada.data) : new Date()
              };
            }
            
            return cleanedSeg;
          });
        }
        
        // Converter datas em planoTerapeutico e remover campos undefined
        if (dataToSave.planoTerapeutico) {
          const plano: any = {};
          
          if (dataToSave.planoTerapeutico.startDate) {
            plano.startDate = dataToSave.planoTerapeutico.startDate instanceof Date
              ? dataToSave.planoTerapeutico.startDate
              : new Date(dataToSave.planoTerapeutico.startDate);
          }
          if (dataToSave.planoTerapeutico.lastDoseChangeAt) {
            plano.lastDoseChangeAt = dataToSave.planoTerapeutico.lastDoseChangeAt instanceof Date
              ? dataToSave.planoTerapeutico.lastDoseChangeAt
              : new Date(dataToSave.planoTerapeutico.lastDoseChangeAt);
          }
          if (dataToSave.planoTerapeutico.nextReviewDate) {
            plano.nextReviewDate = dataToSave.planoTerapeutico.nextReviewDate instanceof Date
              ? dataToSave.planoTerapeutico.nextReviewDate
              : new Date(dataToSave.planoTerapeutico.nextReviewDate);
          }
          
          // Copiar outros campos do planoTerapeutico
          Object.keys(dataToSave.planoTerapeutico).forEach(key => {
            if (key !== 'startDate' && key !== 'lastDoseChangeAt' && key !== 'nextReviewDate') {
              const value = (dataToSave.planoTerapeutico as any)[key];
              if (value !== undefined) {
                plano[key] = value;
              }
            }
          });
          
          dataToSave.planoTerapeutico = plano;
        }
        
        // Remover valores undefined antes de salvar no Firestore
        const cleanedData = removeUndefined(dataToSave);
        
        await updateDoc(doc(db, 'pacientes_completos', id), cleanedData);
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
        
        // Remover valores undefined antes de salvar no Firestore
        const cleanedData = removeUndefined(dataToSave);
        
        await updateDoc(doc(db, 'pacientes_completos', existingDoc.id), cleanedData);
        return existingDoc.id;
      } else {
        // Criar novo paciente
        const dataToSave: any = {
          ...paciente,
          dataCadastro: new Date()
        };
        
        // Remover valores undefined antes de salvar no Firestore
        const cleanedData = removeUndefined(dataToSave);
        
        const docRef = await addDoc(collection(db, 'pacientes_completos'), cleanedData);
        const novoPacienteId = docRef.id;
        
        // Verificar se há indicação pendente com o mesmo telefone
        // Buscar telefone do paciente (pode estar em dadosIdentificacao.telefone)
        const telefonePaciente = paciente.dadosIdentificacao?.telefone || '';
        if (telefonePaciente) {
          try {
            const { IndicacaoService } = await import('@/services/indicacaoService');
            const indicacao = await IndicacaoService.getIndicacaoPorTelefone(telefonePaciente);
            if (indicacao && (indicacao.status === 'pendente' || indicacao.status === 'visualizada')) {
              // Marcar indicação como venda
              await IndicacaoService.marcarComoVenda(indicacao.id, novoPacienteId);
              console.log('✅ Indicação marcada como venda:', indicacao.id);
            }
          } catch (error) {
            // Não bloquear o cadastro se houver erro na verificação de indicação
            console.error('Erro ao verificar indicação:', error);
          }
        }
        
        return novoPacienteId;
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

  // Buscar paciente por email
  static async getPacienteByEmail(email: string): Promise<PacienteCompleto | null> {
    try {
      const pacienteQuery = query(collection(db, 'pacientes_completos'), where('email', '==', email));
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
      console.error('Erro ao buscar paciente por email:', error);
      throw error;
    }
  }

  // Buscar todos os pacientes de um médico (incluindo os que abandonaram)
  static async getPacientesByMedico(medicoId: string): Promise<PacienteCompleto[]> {
    try {
      console.log('🔍 Buscando pacientes para médico ID:', medicoId);
      
      if (!medicoId) {
        console.warn('⚠️ medicoId é vazio ou undefined');
        return [];
      }
      
      // Buscar pacientes ativos do médico
      const pacientesQuery = query(collection(db, 'pacientes_completos'), where('medicoResponsavelId', '==', medicoId));
      const pacientesSnapshot = await getDocs(pacientesQuery);
      console.log('✅ Pacientes ativos encontrados:', pacientesSnapshot.docs.length);
      
      // Buscar pacientes que abandonaram mas que tinham este médico como responsável anterior
      // Primeiro buscar de pacientes_completos (para compatibilidade com dados antigos)
      const pacientesAbandonoQuery = query(
        collection(db, 'pacientes_completos'),
        where('statusTratamento', '==', 'abandono')
      );
      const pacientesAbandonoSnapshot = await getDocs(pacientesAbandonoQuery);
      
      // Filtrar pacientes que abandonaram mas que tinham este médico como responsável anterior
      const pacientesAbandono = pacientesAbandonoSnapshot.docs.filter(doc => {
        const data = doc.data();
        const medicoAnteriorId = data.medicoResponsavelAnteriorId;
        // Comparação robusta (tratando null, undefined e strings)
        const match = String(medicoAnteriorId) === String(medicoId);
        if (match) {
          console.log('📋 Paciente abandonado encontrado em pacientes_completos:', doc.id, 'medicoResponsavelAnteriorId:', medicoAnteriorId);
        }
        return match;
      });
      console.log('✅ Pacientes abandonados em pacientes_completos:', pacientesAbandono.length);
      
      // Buscar também de pacientes_abandono (nova coleção)
      // Primeiro tentar com where, se falhar buscar todos e filtrar
      let pacientesAbandonoNovos: any[] = [];
      try {
        const pacientesAbandonoNovosQuery = query(
          collection(db, 'pacientes_abandono'),
          where('medicoResponsavelAnteriorId', '==', medicoId)
        );
        const pacientesAbandonoNovosSnapshot = await getDocs(pacientesAbandonoNovosQuery);
        pacientesAbandonoNovos = pacientesAbandonoNovosSnapshot.docs;
        console.log('✅ Pacientes abandonados em pacientes_abandono (com where):', pacientesAbandonoNovos.length);
      } catch (error: any) {
        // Se a query falhar (pode ser por falta de índice), buscar todos e filtrar em memória
        console.warn('⚠️ Query com where falhou, buscando todos e filtrando em memória:', error.message);
        const todosAbandonoSnapshot = await getDocs(collection(db, 'pacientes_abandono'));
        console.log('📦 Total de pacientes em pacientes_abandono:', todosAbandonoSnapshot.docs.length);
        
        // Log de todos os pacientes para debug
        todosAbandonoSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          console.log('🔍 Paciente em pacientes_abandono:', {
            id: doc.id,
            nome: data.nome || data.dadosIdentificacao?.nome,
            medicoResponsavelAnteriorId: data.medicoResponsavelAnteriorId,
            medicoIdBuscado: medicoId,
            match: String(data.medicoResponsavelAnteriorId) === String(medicoId)
          });
        });
        
        pacientesAbandonoNovos = todosAbandonoSnapshot.docs.filter(doc => {
          const data = doc.data();
          const medicoAnteriorId = data.medicoResponsavelAnteriorId;
          // Comparação robusta
          const match = String(medicoAnteriorId) === String(medicoId);
          if (match) {
            console.log('📋 Paciente abandonado encontrado (filtrado):', doc.id, 'medicoResponsavelAnteriorId:', medicoAnteriorId, 'nome:', data.nome || data.dadosIdentificacao?.nome);
          }
          return match;
        });
        console.log('✅ Pacientes abandonados em pacientes_abandono (filtrado em memória):', pacientesAbandonoNovos.length);
      }
      
      // Log detalhado dos pacientes encontrados
      pacientesAbandonoNovos.forEach((doc: any) => {
        const data = doc.data();
        console.log('📋 Paciente abandonado encontrado:', doc.id, 'medicoResponsavelAnteriorId:', data.medicoResponsavelAnteriorId, 'nome:', data.nome || data.dadosIdentificacao?.nome);
      });
      
      // Combinar pacientes ativos e que abandonaram (remover duplicatas)
      const todosPacientesIds = new Set();
      const todosPacientesDocs: any[] = [];
      
      [...pacientesSnapshot.docs, ...pacientesAbandono, ...pacientesAbandonoNovos].forEach(doc => {
        if (!todosPacientesIds.has(doc.id)) {
          todosPacientesIds.add(doc.id);
          todosPacientesDocs.push(doc);
        }
      });
      
      console.log('📊 Total de pacientes encontrados:', todosPacientesDocs.length);
      console.log('   - Ativos:', pacientesSnapshot.docs.length);
      console.log('   - Abandonados (pacientes_completos):', pacientesAbandono.length);
      console.log('   - Abandonados (pacientes_abandono):', pacientesAbandonoNovos.length);
      
      return todosPacientesDocs.map(doc => {
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
          statusTratamento: data.statusTratamento || 'abandono', // Garantir que pacientes de pacientes_abandono tenham status abandono
          dataCadastro: data.dataCadastro?.toDate(),
          dataAbandono: data.dataAbandono?.toDate ? data.dataAbandono.toDate() : (data.dataAbandono ? new Date(data.dataAbandono) : undefined),
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

  // Deletar paciente (de pacientes_completos ou pacientes_abandono)
  static async deletePaciente(pacienteId: string): Promise<void> {
    try {
      console.log('🗑️ Deletando paciente:', pacienteId);
      
      // Tentar deletar de pacientes_completos primeiro
      const pacienteCompletoRef = doc(db, 'pacientes_completos', pacienteId);
      const pacienteCompletoDoc = await getDoc(pacienteCompletoRef);
      
      if (pacienteCompletoDoc.exists()) {
        await deleteDoc(pacienteCompletoRef);
        console.log('✅ Paciente deletado de pacientes_completos');
        return;
      }
      
      // Se não encontrou em pacientes_completos, tentar deletar de pacientes_abandono
      const pacienteAbandonoRef = doc(db, 'pacientes_abandono', pacienteId);
      const pacienteAbandonoDoc = await getDoc(pacienteAbandonoRef);
      
      if (pacienteAbandonoDoc.exists()) {
        await deleteDoc(pacienteAbandonoRef);
        console.log('✅ Paciente deletado de pacientes_abandono');
        return;
      }
      
      // Se não encontrou em nenhuma coleção, lançar erro
      throw new Error('Paciente não encontrado em pacientes_completos nem em pacientes_abandono');
    } catch (error) {
      console.error('❌ Erro ao deletar paciente:', error);
      throw error;
    }
  }

  // Mover paciente para pacientes_abandono
  static async moverParaAbandono(pacienteId: string, motivoAbandono?: string, medicoResponsavelAnteriorId?: string | null): Promise<void> {
    try {
      console.log('🔄 Movendo paciente para abandono:', pacienteId);
      
      // Buscar o paciente de pacientes_completos
      const pacienteRef = doc(db, 'pacientes_completos', pacienteId);
      const pacienteDoc = await getDoc(pacienteRef);
      
      if (!pacienteDoc.exists()) {
        throw new Error('Paciente não encontrado');
      }

      const pacienteData = pacienteDoc.data();
      
      // Priorizar o parâmetro passado, senão usar o valor do documento
      // Se o parâmetro for explicitamente passado (mesmo que null), usar ele
      // Caso contrário, usar o valor do documento
      const medicoIdAnterior = medicoResponsavelAnteriorId !== undefined 
        ? medicoResponsavelAnteriorId 
        : (pacienteData.medicoResponsavelId || null);
      
      console.log('👨‍⚕️ Médico responsável anterior:');
      console.log('   - Parâmetro passado:', medicoResponsavelAnteriorId);
      console.log('   - Do documento:', pacienteData.medicoResponsavelId);
      console.log('   - Valor final usado:', medicoIdAnterior);
      
      // Adicionar data de abandono se não existir
      const dataComAbandono = {
        ...pacienteData,
        dataAbandono: pacienteData.dataAbandono || new Date(),
        statusTratamento: 'abandono',
        medicoResponsavelAnteriorId: medicoIdAnterior, // SEMPRE salvar, mesmo se for null
        medicoResponsavelId: null,
        motivoAbandono: motivoAbandono || pacienteData.motivoAbandono || null
      };

      console.log('💾 Salvando em pacientes_abandono:');
      console.log('   - medicoResponsavelAnteriorId:', dataComAbandono.medicoResponsavelAnteriorId);
      console.log('   - motivoAbandono:', dataComAbandono.motivoAbandono);
      console.log('   - statusTratamento:', dataComAbandono.statusTratamento);

      // Salvar em pacientes_abandono
      await setDoc(doc(db, 'pacientes_abandono', pacienteId), removeUndefined(dataComAbandono));
      
      // Deletar de pacientes_completos
      await deleteDoc(pacienteRef);
      
      console.log('✅ Paciente movido para abandono com sucesso');
    } catch (error) {
      console.error('❌ Erro ao mover paciente para abandono:', error);
      throw error;
    }
  }

  // Buscar paciente de abandono por ID
  static async getPacienteAbandonoById(pacienteId: string): Promise<PacienteCompleto | null> {
    try {
      const pacienteDoc = await getDoc(doc(db, 'pacientes_abandono', pacienteId));
      
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
        dataAbandono: data.dataAbandono?.toDate ? data.dataAbandono.toDate() : (data.dataAbandono ? new Date(data.dataAbandono) : undefined),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao?.dataNascimento?.toDate(),
          dataCadastro: data.dadosIdentificacao?.dataCadastro?.toDate(),
        },
        evolucaoSeguimento,
        planoTerapeutico,
      } as PacienteCompleto;
    } catch (error) {
      console.error('Erro ao buscar paciente de abandono:', error);
      throw error;
    }
  }
}


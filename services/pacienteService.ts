import { collection, collectionGroup, doc, getDocs, getDoc, updateDoc, addDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { PacienteCompleto } from '@/types/obesidade';
import { ensureImcOnMedidasIniciais } from '@/lib/meta/medidasIniciaisImc';
import { parseDataNascimentoDiaMesLocal } from '@/utils/dataNascimentoLocal';

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

function toDateSafe(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const withToDate = value as { toDate?: () => Date };
  if (typeof withToDate.toDate === 'function') {
    try {
      const d = withToDate.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : undefined;
    } catch {
      return undefined;
    }
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** dataNascimento: dia civil correto (evita um dia a menos com ISO/UTC no calendário). */
function toDateSafeDataNascimento(value: unknown): Date | undefined {
  const d = parseDataNascimentoDiaMesLocal(value);
  return d ?? undefined;
}

function mapEvolucaoSeguimentoSeg(seg: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    ...seg,
    dataRegistro: toDateSafe(seg.dataRegistro),
    doseAplicada: seg.doseAplicada
      ? {
          ...(seg.doseAplicada as Record<string, unknown>),
          data: toDateSafe((seg.doseAplicada as { data?: unknown }).data),
        }
      : undefined,
  };
  if (seg.marcoZero && typeof seg.marcoZero === 'object') {
    mapped.marcoZero = {
      ...(seg.marcoZero as Record<string, unknown>),
      createdAt: toDateSafe((seg.marcoZero as { createdAt?: unknown }).createdAt),
    };
  }
  return mapped;
}

function normalizeMarcoZeroRoot(marco: unknown): Record<string, unknown> | undefined {
  if (!marco || typeof marco !== 'object') return undefined;
  return {
    ...(marco as Record<string, unknown>),
    createdAt: toDateSafe((marco as { createdAt?: unknown }).createdAt),
  };
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Garante que tudo que o app lê em `dadosClinicos` (metaadmin, /meta) exista mesmo quando
 * o Firestore guardou cópias legadas na raiz do documento ou usou chave errada (`medidasiniciais`).
 * Referência: rotas de conclusão já fazem fallback para `pac.medidasIniciais` na raiz.
 */
function normalizePacienteFirestoreData(raw: Record<string, any>): Record<string, any> {
  const data = { ...raw };

  const snake =
    (data.dados_clinicos as Record<string, any> | undefined) ||
    (data.dadosclinicos as Record<string, any> | undefined);

  let dc: Record<string, any> = isPlainObject(data.dadosClinicos)
    ? { ...(data.dadosClinicos as Record<string, any>) }
    : {};

  if (isPlainObject(snake)) {
    dc = { ...snake, ...dc };
  }

  const miTypo = dc.medidasiniciais;
  if (isPlainObject(miTypo)) {
    const cur = isPlainObject(dc.medidasIniciais) ? (dc.medidasIniciais as Record<string, any>) : {};
    dc.medidasIniciais = { ...miTypo, ...cur };
    delete dc.medidasiniciais;
  }

  const rootMiLower = (data as { medidasiniciais?: unknown }).medidasiniciais;
  const rootMi =
    (isPlainObject(data.medidasIniciais) ? data.medidasIniciais : null) ||
    (isPlainObject(rootMiLower) ? rootMiLower : null);
  if (rootMi) {
    const cur = isPlainObject(dc.medidasIniciais) ? (dc.medidasIniciais as Record<string, any>) : {};
    dc.medidasIniciais = { ...rootMi, ...cur };
  }

  if (isPlainObject(data.motivacao)) {
    const cur = isPlainObject(dc.motivacao) ? (dc.motivacao as Record<string, any>) : {};
    dc.motivacao = { ...(data.motivacao as Record<string, any>), ...cur };
  }
  if (data.motivacaoOutro != null && dc.motivacaoOutro == null) {
    dc.motivacaoOutro = data.motivacaoOutro;
  }

  if (isPlainObject(dc.medidasIniciais)) {
    dc.medidasIniciais = ensureImcOnMedidasIniciais(dc.medidasIniciais as Record<string, unknown>);
  }

  data.dadosClinicos = dc;
  return data;
}

function applyImcBeforeSave<T extends PacienteCompleto | Omit<PacienteCompleto, 'id'>>(paciente: T): T {
  const mi = paciente.dadosClinicos?.medidasIniciais;
  if (!mi) return paciente;
  const nextMi = ensureImcOnMedidasIniciais(mi);
  if (nextMi.imc === mi.imc) return paciente;
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      medidasIniciais: nextMi,
    },
  };
}

export class PacienteService {
  // Criar ou atualizar paciente completo
  static async createOrUpdatePaciente(paciente: PacienteCompleto | Omit<PacienteCompleto, 'id'>): Promise<string> {
    try {
      const pacienteComImc = applyImcBeforeSave(paciente);
      // Se tem id, atualizar diretamente
      if ('id' in pacienteComImc && pacienteComImc.id) {
        const { id, ...pacienteData } = pacienteComImc;
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
      const existingQuery = query(collection(db, 'pacientes_completos'), where('userId', '==', pacienteComImc.userId));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Atualizar paciente existente
        const existingDoc = existingSnapshot.docs[0];
        const { id, ...pacienteData } = { ...pacienteComImc, id: existingDoc.id } as PacienteCompleto;
        
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
        const { id: _ignoredId, ...pacienteSemId } = pacienteComImc as Partial<PacienteCompleto> & { id?: string };
        const dataToSave: any = {
          ...pacienteSemId,
          dataCadastro: new Date()
        };
        
        // Remover valores undefined antes de salvar no Firestore
        const cleanedData = removeUndefined(dataToSave);
        
        const docRef = await addDoc(collection(db, 'pacientes_completos'), {
          ...cleanedData,
          ...shadowOrganizationFields(),
        });
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
      
      const data = normalizePacienteFirestoreData(pacienteDoc.data() as Record<string, any>);
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => mapEvolucaoSeguimentoSeg(seg));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: toDateSafe(planoTerapeutico.startDate),
          lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
          nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
        };
      }
      
      return {
        ...data,
        id: pacienteDoc.id,
        dataCadastro: toDateSafe(data.dataCadastro),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
          dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
        },
        evolucaoSeguimento,
        planoTerapeutico,
        ...(data.marcoZero
          ? { marcoZero: normalizeMarcoZeroRoot(data.marcoZero) as PacienteCompleto['marcoZero'] }
          : {}),
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
      
      const data = normalizePacienteFirestoreData(pacienteSnapshot.docs[0].data() as Record<string, any>);
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => mapEvolucaoSeguimentoSeg(seg));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: toDateSafe(planoTerapeutico.startDate),
          lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
          nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
        };
      }
      
      return {
        ...data,
        id: pacienteSnapshot.docs[0].id,
        dataCadastro: toDateSafe(data.dataCadastro),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
          dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
        },
        evolucaoSeguimento,
        planoTerapeutico,
        ...(data.marcoZero
          ? { marcoZero: normalizeMarcoZeroRoot(data.marcoZero) as PacienteCompleto['marcoZero'] }
          : {}),
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
      
      const data = normalizePacienteFirestoreData(pacienteSnapshot.docs[0].data() as Record<string, any>);
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => mapEvolucaoSeguimentoSeg(seg));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: toDateSafe(planoTerapeutico.startDate),
          lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
          nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
        };
      }
      
      return {
        ...data,
        id: pacienteSnapshot.docs[0].id,
        dataCadastro: toDateSafe(data.dataCadastro),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
          dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
        },
        evolucaoSeguimento,
        planoTerapeutico,
        ...(data.marcoZero
          ? { marcoZero: normalizeMarcoZeroRoot(data.marcoZero) as PacienteCompleto['marcoZero'] }
          : {}),
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
      // Compatibilidade: alguns documentos antigos podem usar medicoResponsavelID (ID maiúsculo)
      const pacientesQuery = query(collection(db, 'pacientes_completos'), where('medicoResponsavelId', '==', medicoId));
      const pacientesSnapshot = await getDocs(pacientesQuery);

      const pacientesQueryLegacy = query(collection(db, 'pacientes_completos'), where('medicoResponsavelID', '==', medicoId));
      const pacientesSnapshotLegacy = await getDocs(pacientesQueryLegacy);

      let pacientesAtivosDocs = [...pacientesSnapshot.docs, ...pacientesSnapshotLegacy.docs];

      // Fallback defensivo: se vier vazio, buscar todos e filtrar em memória
      if (pacientesAtivosDocs.length === 0) {
        console.warn('⚠️ Nenhum ativo por query direta; aplicando fallback em memória');
        const todosPacientesSnapshot = await getDocs(collection(db, 'pacientes_completos'));
        pacientesAtivosDocs = todosPacientesSnapshot.docs.filter((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const medicoResp =
            data.medicoResponsavelId ??
            data.medicoResponsavelID ??
            data.medicoresponsavelid ??
            null;
          return String(medicoResp) === String(medicoId);
        });
      }
      console.log('✅ Pacientes ativos encontrados:', pacientesAtivosDocs.length);
      
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
      
      [...pacientesAtivosDocs, ...pacientesAbandono, ...pacientesAbandonoNovos].forEach(doc => {
        if (!todosPacientesIds.has(doc.id)) {
          todosPacientesIds.add(doc.id);
          todosPacientesDocs.push(doc);
        }
      });
      
      console.log('📊 Total de pacientes encontrados:', todosPacientesDocs.length);
      console.log('   - Ativos:', pacientesAtivosDocs.length);
      console.log('   - Abandonados (pacientes_completos):', pacientesAbandono.length);
      console.log('   - Abandonados (pacientes_abandono):', pacientesAbandonoNovos.length);
      
      return todosPacientesDocs.map(doc => {
        const data = normalizePacienteFirestoreData(doc.data() as Record<string, any>);
        
        // Converter datas em evolucaoSeguimento
        let evolucaoSeguimento = data.evolucaoSeguimento;
        if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
          evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => mapEvolucaoSeguimentoSeg(seg));
        }
        
        // Converter datas em planoTerapeutico
        let planoTerapeutico = data.planoTerapeutico;
        if (planoTerapeutico) {
          planoTerapeutico = {
            ...planoTerapeutico,
            startDate: toDateSafe(planoTerapeutico.startDate),
            lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
            nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
          };
        }
        
        return {
          ...data,
          id: doc.id,
          statusTratamento: data.statusTratamento || 'abandono', // Garantir que pacientes de pacientes_abandono tenham status abandono
          dataCadastro: toDateSafe(data.dataCadastro),
          dataAbandono: toDateSafe(data.dataAbandono),
          dadosIdentificacao: {
            ...data.dadosIdentificacao,
            dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
            dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
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
        const data = normalizePacienteFirestoreData(doc.data() as Record<string, any>);
        return {
          ...data,
          id: doc.id,
          dataCadastro: toDateSafe(data.dataCadastro),
          dadosIdentificacao: {
            ...data.dadosIdentificacao,
            dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
            dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
          },
        } as PacienteCompleto;
      });
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      throw error;
    }
  }

  // Rastrear pacientes que possuem dados apenas em subcolecoes (sem documento raiz valido carregado)
  static async rastrearPacientesEmSubcolecoes(): Promise<Record<string, string[]>> {
    try {
      const resultado: Record<string, Set<string>> = {};

      const registrar = (pacienteId: string, fonte: string) => {
        if (!pacienteId) return;
        if (!resultado[pacienteId]) {
          resultado[pacienteId] = new Set<string>();
        }
        resultado[pacienteId].add(fonte);
      };

      // pacientes_completos/{pacienteId}/nutricao/plano
      const planosSnapshot = await getDocs(collectionGroup(db, 'plano'));
      planosSnapshot.docs.forEach((planoDoc) => {
        const segments = planoDoc.ref.path.split('/');
        if (segments.length >= 4 && segments[0] === 'pacientes_completos' && segments[2] === 'nutricao') {
          registrar(segments[1], 'nutricao/plano');
        }
      });

      // pacientes_completos/{pacienteId}/nutricao/dados
      const dadosSnapshot = await getDocs(collectionGroup(db, 'dados'));
      dadosSnapshot.docs.forEach((dadosDoc) => {
        const segments = dadosDoc.ref.path.split('/');
        if (segments.length >= 4 && segments[0] === 'pacientes_completos' && segments[2] === 'nutricao') {
          registrar(segments[1], 'nutricao/dados');
        }
      });

      return Object.entries(resultado).reduce<Record<string, string[]>>((acc, [pacienteId, fontes]) => {
        acc[pacienteId] = Array.from(fontes);
        return acc;
      }, {});
    } catch (error) {
      console.error('Erro ao rastrear pacientes em subcolecoes:', error);
      return {};
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

      const data = normalizePacienteFirestoreData(pacienteDoc.data() as Record<string, any>);
      
      // Converter datas em evolucaoSeguimento
      let evolucaoSeguimento = data.evolucaoSeguimento;
      if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
        evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => mapEvolucaoSeguimentoSeg(seg));
      }
      
      // Converter datas em planoTerapeutico
      let planoTerapeutico = data.planoTerapeutico;
      if (planoTerapeutico) {
        planoTerapeutico = {
          ...planoTerapeutico,
          startDate: toDateSafe(planoTerapeutico.startDate),
          lastDoseChangeAt: toDateSafe(planoTerapeutico.lastDoseChangeAt),
          nextReviewDate: toDateSafe(planoTerapeutico.nextReviewDate),
        };
      }
      
      return {
        ...data,
        id: pacienteDoc.id,
        dataCadastro: toDateSafe(data.dataCadastro),
        dataAbandono: toDateSafe(data.dataAbandono),
        dadosIdentificacao: {
          ...data.dadosIdentificacao,
          dataNascimento: toDateSafeDataNascimento(data.dadosIdentificacao?.dataNascimento),
          dataCadastro: toDateSafe(data.dadosIdentificacao?.dataCadastro),
        },
        evolucaoSeguimento,
        planoTerapeutico,
        ...(data.marcoZero
          ? { marcoZero: normalizeMarcoZeroRoot(data.marcoZero) as PacienteCompleto['marcoZero'] }
          : {}),
      } as PacienteCompleto;
    } catch (error) {
      console.error('Erro ao buscar paciente de abandono:', error);
      throw error;
    }
  }

  // Remove somente o vínculo do paciente com o médico, mantendo o histórico do paciente.
  static async desvincularPacienteDoMedico(pacienteId: string, medicoId: string): Promise<void> {
    try {
      const pacienteCompletoRef = doc(db, 'pacientes_completos', pacienteId);
      const pacienteCompletoDoc = await getDoc(pacienteCompletoRef);

      if (pacienteCompletoDoc.exists()) {
        const data = pacienteCompletoDoc.data() as Record<string, unknown>;
        const medicoAtual =
          (data.medicoResponsavelId as string | null | undefined) ??
          (data.medicoResponsavelID as string | null | undefined) ??
          (data.medicoresponsavelid as string | null | undefined) ??
          null;

        if (medicoAtual && String(medicoAtual) !== String(medicoId)) {
          throw new Error('Paciente não está vinculado ao médico informado.');
        }

        await updateDoc(pacienteCompletoRef, {
          medicoResponsavelId: null,
          medicoResponsavelID: null,
          medicoresponsavelid: null,
          medicoResponsavelAnteriorId: null,
        });
        return;
      }

      const pacienteAbandonoRef = doc(db, 'pacientes_abandono', pacienteId);
      const pacienteAbandonoDoc = await getDoc(pacienteAbandonoRef);

      if (pacienteAbandonoDoc.exists()) {
        const data = pacienteAbandonoDoc.data() as Record<string, unknown>;
        const medicoAnterior = (data.medicoResponsavelAnteriorId as string | null | undefined) ?? null;

        if (medicoAnterior && String(medicoAnterior) !== String(medicoId)) {
          throw new Error('Paciente não está vinculado ao médico informado.');
        }

        await updateDoc(pacienteAbandonoRef, {
          medicoResponsavelId: null,
          medicoResponsavelID: null,
          medicoresponsavelid: null,
          medicoResponsavelAnteriorId: null,
        });
        return;
      }

      throw new Error('Paciente não encontrado em pacientes_completos nem em pacientes_abandono');
    } catch (error) {
      console.error('Erro ao desvincular paciente do médico:', error);
      throw error;
    }
  }
}


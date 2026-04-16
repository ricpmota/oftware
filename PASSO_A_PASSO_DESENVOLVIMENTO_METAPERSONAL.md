# Passo a Passo - Desenvolvimento do Card de Paciente no /metapersonal 📋

## Objetivo

Padronizar o card de paciente mobile no `/metapersonal` com todas as funcionalidades do `/metaadmin` e `/metanutri`, adaptando os botões conforme especificado.

---

## Requisitos

1. ✅ **Manter o mesmo design do card** com todas as funcionalidades do `/metaadmin` e `/metanutri`
2. ✅ **Botões Editar, Aplicações, Exames, Prescrições:** Funcionalidade igual ao `/metanutri`
3. ✅ **Botão Excluir:** Excluir vínculo entre Personal Trainer e Paciente
4. ✅ **Botão Nutri:** Mesma funcionalidade do `/metaadmin`
5. ✅ **Botão Personal:** Abrir modal igual ao da página `/meta/personal` (onde o personal pode ver e editar treino do paciente)

---

## ETAPA 1: Preparação e Imports

### 1.1 Adicionar Imports Necessários

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar imports do `lucide-react` que faltam:
   ```typescript
   import {
     // ... imports existentes
     ClipboardList,  // Para Prescrições
     ChevronLeft,     // Para modais
     ChevronRight,    // Para modal de grupo de prescrições
     Printer,         // Para imprimir prescrições
     UtensilsCrossed, // Para Nutri
     Dumbbell,        // Já existe
     MessageSquare,   // Para badge de mensagens
     ChevronUp,       // Para grupos expandíveis
   } from 'lucide-react';
   ```

2. Adicionar imports de serviços e tipos:
   ```typescript
   import { PrescricaoService } from '@/services/prescricaoService';
   import { Prescricao, PrescricaoItem } from '@/types/prescricao';
   import jsPDF from 'jspdf';
   import NutriContent from '@/components/NutriContent';
   import { SolicitacaoNutricionistaService } from '@/services/solicitacaoNutricionistaService';
   import { NutricionistaService } from '@/services/nutricionistaService';
   import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
   import { SOLICITACAO_STATUS as SOLICITACAO_STATUS_NUTRI } from '@/features/metaNutri/metaNutri.constants';
   ```

3. Verificar se `CalendarioTreinosPersonal` já está importado (deve estar)

**Referência:** Ver imports do `/metanutri` (linhas 17-91)

---

## ETAPA 2: Adicionar Estados Necessários

### 2.1 Estados para Prescrições

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Após os estados existentes de modal de exames

**Tarefas:**
1. Adicionar estados para modal de Prescrições:
   ```typescript
   // Estados para modal de Prescrições
   const [showModalPrescricoes, setShowModalPrescricoes] = useState(false);
   const [pacientePrescricoesSelecionado, setPacientePrescricoesSelecionado] = useState<PacienteCompleto | null>(null);
   const [prescricoesModal, setPrescricoesModal] = useState<Prescricao[]>([]);
   const [loadingPrescricoesModal, setLoadingPrescricoesModal] = useState(false);
   const [prescricaoSelecionadaModal, setPrescricaoSelecionadaModal] = useState<Prescricao | null>(null);
   const [prescricaoEditandoModal, setPrescricaoEditandoModal] = useState<Prescricao | null>(null);
   const [novaPrescricaoModal, setNovaPrescricaoModal] = useState({
     nome: '',
     descricao: '',
     itens: [] as PrescricaoItem[],
     observacoes: ''
   });
   const [abaPrescricoesModal, setAbaPrescricoesModal] = useState<'salvas' | 'descricao'>('salvas');
   const [gruposPrescricoesExpandidosModal, setGruposPrescricoesExpandidosModal] = useState<Set<string>>(new Set());
   const [showModalGrupoNovaPrescricao, setShowModalGrupoNovaPrescricao] = useState(false);
   const [novaPrescricaoContexto, setNovaPrescricaoContexto] = useState<'desktop' | 'mobile' | null>(null);
   ```

**Referência:** Ver estados do `/metanutri` (linhas 266-282)

---

### 2.2 Estados para Nutrição

**Tarefas:**
1. Adicionar estados para modal de Nutrição (igual ao `/metaadmin`):
   ```typescript
   // Estados para modal de nutrição
   const [showModalNutricao, setShowModalNutricao] = useState(false);
   const [pacienteNutricaoSelecionado, setPacienteNutricaoSelecionado] = useState<PacienteCompleto | null>(null);
   const [planoNutricionalModal, setPlanoNutricionalModal] = useState<any>(null);
   const [checkinsNutricao, setCheckinsNutricao] = useState<any[]>([]);
   const [loadingNutricao, setLoadingNutricao] = useState(false);
   const [activeTabNutricao, setActiveTabNutricao] = useState<'plano' | 'checkins' | 'estatisticas'>('plano');
   const [checkInSelecionado, setCheckInSelecionado] = useState<any | null>(null);
   const [mesCalendarioCheckIns, setMesCalendarioCheckIns] = useState(new Date());
   ```

2. Adicionar estados para compartilhamento com nutricionista:
   ```typescript
   // Estados para compartilhamento com nutricionista
   const [nutricionistasElegiveis, setNutricionistasElegiveis] = useState<NutricionistaDoc[]>([]);
   const [loadingNutricionistasElegiveis, setLoadingNutricionistasElegiveis] = useState(false);
   const [enviandoCompartilhamentoNutri, setEnviandoCompartilhamentoNutri] = useState(false);
   const [vinculosAtivosPacienteNutri, setVinculosAtivosPacienteNutri] = useState<any[]>([]);
   const [solicitacoesCompartilhamentoPacienteNutri, setSolicitacoesCompartilhamentoPacienteNutri] = useState<any[]>([]);
   const [loadingSolicitacoesCompartilhamentoNutri, setLoadingSolicitacoesCompartilhamentoNutri] = useState(false);
   const [pacientesComNutricao, setPacientesComNutricao] = useState<Record<string, boolean>>({});
   ```

**Referência:** Ver estados do `/metaadmin` (linhas 1935-1943 e relacionados)

---

### 2.3 Estados para Personal Trainer (Modal de Edição de Treino)

**Tarefas:**
1. Adicionar estados para modal de Personal Trainer (edição de treino):
   ```typescript
   // Estados para modal de Personal Trainer (edição de treino)
   const [showModalPersonal, setShowModalPersonal] = useState(false);
   const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
   
   // Estados para tabs do modal (igual à página /meta/personal)
   const [activeTabPersonal, setActiveTabPersonal] = useState<'hoje' | 'cronograma' | 'criar' | 'historico' | 'estatisticas' | 'lembretes'>('hoje');
   
   // Estados para treino de hoje
   const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
   const [selectedTodaySessionId, setSelectedTodaySessionId] = useState<string | null>(null);
   const [todayExercises, setTodayExercises] = useState<TrainingSessionExercise[]>([]);
   const [loadingToday, setLoadingToday] = useState(false);
   const [patientNotes, setPatientNotes] = useState('');
   const [savingStatus, setSavingStatus] = useState(false);
   const [savingNotes, setSavingNotes] = useState(false);
   
   // Estados do calendário
   const [mesCalendarioPersonal, setMesCalendarioPersonal] = useState(new Date());
   const [semanaCalendarioPersonal, setSemanaCalendarioPersonal] = useState(new Date());
   const [visualizacaoCalendarioPersonal, setVisualizacaoCalendarioPersonal] = useState<'mes' | 'semana'>('semana');
   const [diaSelecionadoPersonal, setDiaSelecionadoPersonal] = useState<Date | null>(null);
   const [sessoesCalendarioPersonal, setSessoesCalendarioPersonal] = useState<TrainingSession[]>([]);
   const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<TrainingSession | null>(null);
   const [selectedSessionExercisesDetail, setSelectedSessionExercisesDetail] = useState<TrainingSessionExercise[]>([]);
   const [deletingSession, setDeletingSession] = useState(false);
   const [deletingExercise, setDeletingExercise] = useState<string | null>(null);
   
   // Estados do Criar Treino
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedTarget, setSelectedTarget] = useState('');
   const [selectedEquipment, setSelectedEquipment] = useState('');
   const [selectedBodyPart, setSelectedBodyPart] = useState('');
   const [targets, setTargets] = useState<string[]>([]);
   const [equipments, setEquipments] = useState<string[]>([]);
   const [bodyParts, setBodyParts] = useState<string[]>([]);
   const [exercisesResults, setExercisesResults] = useState<Exercise[]>([]);
   const [loadingExercises, setLoadingExercises] = useState(false);
   const [selectedExercises, setSelectedExercises] = useState<Array<Exercise & { sets: number; reps: number; restSec: number }>>([]);
   const [newSessionTitle, setNewSessionTitle] = useState('');
   const [newSessionDate, setNewSessionDate] = useState('');
   const [sessionType, setSessionType] = useState<'single' | 'recurring'>('single');
   const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'custom'>('weekly');
   const [weeksCount, setWeeksCount] = useState(4);
   const [timesPerWeek, setTimesPerWeek] = useState(3);
   const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
   const [creatingSession, setCreatingSession] = useState(false);
   
   // Estados do Histórico
   const [historicoSessions, setHistoricoSessions] = useState<TrainingSession[]>([]);
   const [loadingHistorico, setLoadingHistorico] = useState(false);
   const [selectedSessionDetail, setSelectedSessionDetail] = useState<TrainingSession | null>(null);
   const [selectedSessionExercises, setSelectedSessionExercises] = useState<TrainingSessionExercise[]>([]);
   
   // Estados de Estatísticas
   const [adherence7d, setAdherence7d] = useState(0);
   const [adherence30d, setAdherence30d] = useState(0);
   const [treinosPorSemana, setTreinosPorSemana] = useState<number[]>([]);
   
   // Estados de Lembretes
   const [reminderPrefs, setReminderPrefs] = useState<TrainingReminderPrefs | null>(null);
   const [savingReminder, setSavingReminder] = useState(false);
   ```

2. Adicionar imports de tipos:
   ```typescript
   import type { TrainingSession, TrainingSessionExercise, TrainingReminderPrefs } from '@/types/trainingSession';
   import type { Exercise } from '@/types/exercise';
   import { translateExerciseName, translateBodyPart, translateTarget, translateEquipment } from '@/data/exerciseTranslations';
   ```

**Referência:** Ver estados da página `/meta/personal` (linhas 60-135)

---

### 2.4 Estados para Mensagens Não Lidas

**Tarefas:**
1. Adicionar estado para mensagens não lidas:
   ```typescript
   // Estados para mensagens não lidas
   const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});
   ```

**Referência:** Ver estado do `/metanutri` (linha 261)

---

### 2.5 Estados para Pacientes com Treinos

**Tarefas:**
1. Adicionar estado para pacientes com treinos (para ícone rosa):
   ```typescript
   // Estados para pacientes com treinos (Personal Trainer)
   const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());
   ```

**Referência:** Ver estado do `/metanutri` (linha 264)

---

## ETAPA 3: Adicionar Funções Auxiliares

### 3.1 Funções Auxiliares de Prescrições

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Após as funções helper existentes (se houver) ou antes dos useCallback

**Tarefas:**
1. Adicionar tipos e funções auxiliares de prescrições:
   ```typescript
   // --- Prescrições: subtipos (runtime, sem alterar Firestore) ---
   type PrescricaoSubtipo =
     | 'Base do Tratamento'
     | 'Gastrointestinal'
     | 'Massa Magra & Performance'
     | 'Metabólico / Glicêmico'
     | 'Micronutrientes'
     | 'Sono & Comportamento'
     | 'Hepático / Cardiometabólico'
     | 'Outros';

   const SUBTIPOS_ORDER: PrescricaoSubtipo[] = [
     'Base do Tratamento',
     'Gastrointestinal',
     'Massa Magra & Performance',
     'Metabólico / Glicêmico',
     'Micronutrientes',
     'Sono & Comportamento',
     'Hepático / Cardiometabólico',
     'Outros',
   ];

   function normalizar(s?: string) {
     return (s || '').toLowerCase();
   }

   function getSubtipoPrescricao(p: { nome?: string; descricao?: string; observacoes?: string }): PrescricaoSubtipo {
     const rawNome = (p.nome || '').trim();
     if (rawNome.includes(' — ')) {
       const prefix = rawNome.split(' — ')[0].trim();
       const match = SUBTIPOS_ORDER.find((s) => s === prefix);
       if (match) return match;
     }

     const nome = normalizar(p.nome);
     const desc = normalizar(p.descricao);
     const obs = normalizar(p.observacoes);
     const txt = `${nome} ${desc} ${obs}`;

     if (txt.includes('tirzepatida') || txt.includes('mounjaro') || txt.includes('zepbound') || txt.includes('base do tratamento')) return 'Base do Tratamento';
     if (txt.includes('probiótico') || txt.includes('probiotico') || txt.includes('inulina') || txt.includes('fos') || txt.includes('constip') || txt.includes('náuse') || txt.includes('nause') || txt.includes('empach') || txt.includes('magnésio') || txt.includes('magnesio')) return 'Gastrointestinal';
     if (txt.includes('hmb') || txt.includes('whey') || txt.includes('leucina') || txt.includes('creatina') || txt.includes('massa magra') || txt.includes('sarcopen')) return 'Massa Magra & Performance';
     if (txt.includes('berberina') || txt.includes('cromo') || txt.includes('insulina') || txt.includes('resist') || txt.includes('glic') || txt.includes('homa')) return 'Metabólico / Glicêmico';
     if (txt.includes('vitamina d') || txt.includes('colecalciferol') || txt.includes('b12') || txt.includes('metilcobalamina') || txt.includes('zinco') || txt.includes('selênio') || txt.includes('selenio') || txt.includes('ferrit')) return 'Micronutrientes';
     if (txt.includes('sono') || txt.includes('insônia') || txt.includes('insonia') || txt.includes('melaton') || txt.includes('teanina') || txt.includes('glicina') || txt.includes('compuls')) return 'Sono & Comportamento';
     if (txt.includes('silimarina') || txt.includes('colina') || txt.includes('inositol') || txt.includes('esteat') || txt.includes('tgo') || txt.includes('tgp') || txt.includes('ggt') || txt.includes('omega') || txt.includes('coq10') || txt.includes('ldl') || txt.includes('hdl') || txt.includes('trig')) return 'Hepático / Cardiometabólico';
     return 'Outros';
   }

   function groupBySubtipo<T extends { nome?: string; descricao?: string; observacoes?: string }>(arr: T[]) {
     const map = new Map<PrescricaoSubtipo, T[]>();
     for (const p of arr) {
       const subtipo = getSubtipoPrescricao(p);
       if (!map.has(subtipo)) map.set(subtipo, []);
       map.get(subtipo)!.push(p);
     }
     return SUBTIPOS_ORDER.map((s) => ({ subtipo: s, items: map.get(s) || [] })).filter((g) => g.items.length > 0);
   }

   function getTituloExibicao(nome: string): string {
     const n = (nome || '').trim();
     if (n.includes(' — ')) return n.split(' — ')[1]?.trim() || n;
     return n;
   }
   ```

**Referência:** Ver funções do `/metanutri` (linhas 303-397)

---

## ETAPA 4: Adicionar Funções de Carregamento

### 4.1 Função loadPrescricoesModal

**Tarefas:**
1. Adicionar função para carregar prescrições do paciente:
   ```typescript
   // Carregar prescrições para o modal mobile (por paciente)
   const loadPrescricoesModal = useCallback(async (paciente: PacienteCompleto) => {
     if (!personalTrainer) return;
     try {
       setLoadingPrescricoesModal(true);
       await PrescricaoService.criarPrescricoesPadraoGlobais();
       // Buscar prescrições do personal trainer (usando userId como medicoId no sistema atual)
       const [templates, prescricoesPersonal] = await Promise.all([
         PrescricaoService.getPrescricoesTemplate(),
         PrescricaoService.getPrescricoesByMedico(personalTrainer.userId)
       ]);
       const todas = [
         ...templates,
         ...prescricoesPersonal.filter(x => !x.pacienteId || x.pacienteId === paciente.id)
       ];
       setPrescricoesModal(todas);
       if (prescricaoSelecionadaModal && todas.find(p => p.id === prescricaoSelecionadaModal.id)) {
         // Manter seleção se ainda existir
       } else {
         setPrescricaoSelecionadaModal(null);
         setPrescricaoEditandoModal(null);
         setNovaPrescricaoModal({ nome: '', descricao: '', itens: [], observacoes: '' });
       }
     } catch (error) {
       console.error('Erro ao carregar prescrições (modal):', error);
     } finally {
       setLoadingPrescricoesModal(false);
     }
   }, [personalTrainer]);
   ```

**Referência:** Ver função do `/metanutri` (linhas 1612-1635), adaptar para usar `personalTrainer.userId`

---

### 4.2 Funções para Nutrição (igual ao /metaadmin)

**Tarefas:**
1. Adicionar função para carregar nutricionistas elegíveis:
   ```typescript
   // Função para carregar nutricionistas elegíveis (verificados, ativos e vinculados ao personal trainer)
   const loadNutricionistasElegiveis = useCallback(async () => {
     if (!personalTrainer?.userId) return;
     
     setLoadingNutricionistasElegiveis(true);
     try {
       const todosNutris = await NutricionistaService.getAllNutricionistas();
       // Filtrar: verificados, ativos e vinculados ao personal trainer atual
       const elegiveis = todosNutris.filter(nutri => 
         nutri.isVerificado && 
         nutri.status === 'ativo' && 
         nutri.personalTrainerVinculadoIds?.includes(personalTrainer.userId) // Assumindo que existe este campo
       );
       setNutricionistasElegiveis(elegiveis);
     } catch (error) {
       console.error('Erro ao carregar nutricionistas elegíveis:', error);
     } finally {
       setLoadingNutricionistasElegiveis(false);
     }
   }, [personalTrainer]);
   ```

2. Adicionar função para carregar status de compartilhamento com nutricionista:
   ```typescript
   // Função para carregar status completo de compartilhamento com Nutricionista
   const loadStatusCompartilhamentoNutri = useCallback(async (pacienteId: string) => {
     if (!personalTrainer?.userId || !pacienteId) return;
     
     setLoadingSolicitacoesCompartilhamentoNutri(true);
     try {
       // Buscar vínculos ativos do paciente
       const { COL_PACIENTE_NUTRICIONISTA } = await import('@/features/metaNutri/metaNutri.constants');
       const { db } = await import('@/lib/firebase');
       const { collection, query, where, getDocs } = await import('firebase/firestore');
       
       const q = query(
         collection(db, COL_PACIENTE_NUTRICIONISTA),
         where('pacienteId', '==', pacienteId),
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
         };
       });
       
       // Filtrar vínculos onde o médico está vinculado ao personal trainer
       const vinculosFiltrados = vinculos.filter(v => {
         if (personalTrainer.medicoVinculadoIds && personalTrainer.medicoVinculadoIds.length > 0) {
           return personalTrainer.medicoVinculadoIds.includes(v.medicoId);
         }
         return false;
       });
       
       setVinculosAtivosPacienteNutri(vinculosFiltrados);
       
       // Buscar solicitações pendentes
       const solicitacoes = await SolicitacaoNutricionistaService.getShareRequestsByPaciente(pacienteId);
       const solicitacoesFiltradas = solicitacoes.filter(s => {
         if (personalTrainer.medicoVinculadoIds && personalTrainer.medicoVinculadoIds.length > 0) {
           return personalTrainer.medicoVinculadoIds.includes(s.medicoId);
         }
         return false;
       });
       setSolicitacoesCompartilhamentoPacienteNutri(solicitacoesFiltradas);
     } catch (error) {
       console.error('Erro ao carregar status de compartilhamento nutri:', error);
     } finally {
       setLoadingSolicitacoesCompartilhamentoNutri(false);
     }
   }, [personalTrainer]);
   ```

**Referência:** Ver funções do `/metaadmin` (linhas 3156-3329)

---

### 4.3 Função para Carregar Pacientes com Treinos

**Tarefas:**
1. Adicionar `useEffect` para carregar pacientes com treinos (igual ao `/metanutri`):
   ```typescript
   // Carregar "tem treinos" por paciente (ícone Personal rosa só quando há ao menos 1 treino)
   useEffect(() => {
     if (activeMenu !== 'pacientes' || pacientesVisiveis.length === 0) return;
     let cancelled = false;
     (async () => {
       const ids = new Set<string>();
       const BATCH = 10;
       const opts = { startDate: '2020-01-01' as const, endDate: '2030-12-31' as const };
       for (let i = 0; i < pacientesVisiveis.length; i += BATCH) {
         if (cancelled) return;
         const batch = pacientesVisiveis.map(item => item.paciente).slice(i, i + BATCH);
         const results = await Promise.all(
           batch.map(async (p) => {
             let has = false;
             const toTry: string[] = [];
             if (p.userId) toTry.push(p.userId);
             const prefix = /^(.+)_\d+$/.exec(p.userId || '')?.[1];
             if (prefix) toTry.push(prefix);
             if (p.id) toTry.push(p.id);
             for (const id of toTry) {
               if (has) break;
               try {
                 const s = await trainingSessionService.getPatientSessions(id, opts);
                 has = s.length > 0;
               } catch { /* ignore */ }
             }
             return { userId: p.userId, id: p.id, has };
           })
         );
         results.forEach((r, idx) => {
           if (r.has) {
             const p = batch[idx];
             if (p.userId) ids.add(p.userId);
             if (p.id) ids.add(p.id);
           }
         });
       }
       if (!cancelled) setPacientesComTreinos(ids);
     })();
     return () => { cancelled = true; };
   }, [activeMenu, pacientesVisiveis]);
   ```

**Referência:** Ver `useEffect` do `/metanutri` (linhas 1773-1805)

---

### 4.4 Funções para Modal de Personal Trainer (Edição de Treino)

**Tarefas:**
1. Adicionar funções de carregamento do modal de Personal (baseadas na página `/meta/personal`):
   ```typescript
   // Carregar treino de hoje para o paciente selecionado
   const loadTodaySession = useCallback(async (patientId: string) => {
     if (!patientId) return;
     setLoadingToday(true);
     try {
       const sessions = await trainingSessionService.getTodaySessions(patientId);
       if (sessions.length > 0) {
         setTodaySessions(sessions);
         const firstSession = sessions[0];
         setSelectedTodaySessionId(firstSession.id || null);
         setPatientNotes(firstSession.patientNotes || '');
         if (firstSession.id) {
           const exercises = await trainingSessionService.getSessionExercises(firstSession.id);
           setTodayExercises(exercises);
         } else {
           setTodayExercises([]);
         }
       } else {
         setTodaySessions([]);
         setSelectedTodaySessionId(null);
         setTodayExercises([]);
         setPatientNotes('');
       }
     } catch (error) {
       console.error('Erro ao carregar sessão de hoje:', error);
       setTodaySessions([]);
       setSelectedTodaySessionId(null);
       setTodayExercises([]);
       setPatientNotes('');
     } finally {
       setLoadingToday(false);
     }
   }, []);

   // Carregar sessões do calendário
   const loadCalendarSessions = useCallback(async (patientId: string) => {
     if (!patientId) return;
     try {
       let startDate: string;
       let endDate: string;

       if (visualizacaoCalendarioPersonal === 'semana') {
         const inicioSemana = new Date(semanaCalendarioPersonal);
         inicioSemana.setDate(semanaCalendarioPersonal.getDate() - semanaCalendarioPersonal.getDay());
         inicioSemana.setHours(0, 0, 0, 0);
         
         const fimSemana = new Date(inicioSemana);
         fimSemana.setDate(inicioSemana.getDate() + 6);
         fimSemana.setHours(23, 59, 59, 999);
         
         startDate = toLocalYYYYMMDD(inicioSemana);
         endDate = toLocalYYYYMMDD(fimSemana);
       } else {
         const ano = mesCalendarioPersonal.getFullYear();
         const mes = mesCalendarioPersonal.getMonth();
         const primeiroDia = new Date(ano, mes, 1);
         const ultimoDia = new Date(ano, mes + 1, 0);
         startDate = toLocalYYYYMMDD(primeiroDia);
         endDate = toLocalYYYYMMDD(ultimoDia);
       }

       const sessions = await trainingSessionService.getPatientSessions(patientId, {
         startDate,
         endDate,
       });
       setSessoesCalendarioPersonal(sessions);
     } catch (error) {
       console.error('Erro ao carregar sessões do calendário:', error);
     }
   }, [visualizacaoCalendarioPersonal, mesCalendarioPersonal, semanaCalendarioPersonal]);

   // Função auxiliar toLocalYYYYMMDD
   function toLocalYYYYMMDD(d: Date): string {
     const y = d.getFullYear();
     const m = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${y}-${m}-${day}`;
   }
   ```

2. Adicionar outras funções necessárias (buscar exercícios, criar sessão, etc.) - copiar da página `/meta/personal`

**Referência:** Ver funções da página `/meta/personal` (linhas 148-860)

---

## ETAPA 5: Atualizar Card Mobile de Pacientes

### 5.1 Adicionar Barra de Progresso no Topo

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Dentro do card mobile (linha ~2402), antes do padding

**Tarefas:**
1. Adicionar barra de progresso idêntica ao `/metanutri`:
   ```tsx
   <div key={item.pacienteId} className={`shadow rounded-lg transition-all overflow-hidden ${
     isSelecionado 
       ? 'p-[2px] bg-gradient-to-r from-yellow-500 to-orange-500' 
       : 'border border-gray-200 bg-white'
   }`}>
     <div className={`rounded-lg ${isSelecionado ? 'bg-white' : ''}`}>
       {/* Borda superior: semanas de aplicação */}
       <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
         {/* Barra de progresso (1.5px de espessura, largura conforme %) */}
         <div
           className={`absolute left-0 top-0 transition-all duration-300 ${
             totalSemanas > 0
               ? (semanasAplicadas / totalSemanas) >= 1
                 ? 'bg-green-500 rounded-full'
                 : (semanasAplicadas / totalSemanas) >= 0.5
                 ? 'bg-blue-500'
                 : 'bg-amber-500'
               : 'bg-gray-200 rounded-full'
           }`}
           style={{
             width: totalSemanas > 0
               ? `${Math.min((semanasAplicadas / totalSemanas) * 100, 100)}%`
               : '100%',
             height: '1.5px'
           }}
         />
         {/* Texto centralizado */}
         <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
           {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '–'}
         </div>
       </div>
       <div className="p-4 pt-3">
         {/* Resto do card */}
       </div>
     </div>
   </div>
   ```

**Referência:** Ver card do `/metanutri` (linhas 4594-4618)

---

### 5.2 Atualizar Cabeçalho do Card

**Tarefas:**
1. Adicionar badge de mensagens não lidas (se implementado):
   ```tsx
   {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
       <MessageSquare size={10} className="mr-1" />
       {mensagensNaoLidasPorPaciente[paciente.id]}
     </span>
   )}
   ```

2. Manter estrutura existente do cabeçalho (avatar IMC, nome, badges de status)

**Referência:** Ver cabeçalho do `/metanutri` (linhas 4620-4710)

---

### 5.3 Atualizar Botões de Ação

**Tarefas:**
1. Reorganizar botões para ficarem centralizados:
   ```tsx
   <div className="mb-3">
     <div className="flex items-center justify-center gap-1 flex-wrap">
       {/* Botões aqui */}
     </div>
   </div>
   ```

2. Atualizar cada botão conforme especificação:

   **Botão Editar (Laranja):**
   ```tsx
   <button
     onClick={() => handleVisualizarPaciente(paciente)}
     className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
     title="Visualizar"
   >
     <Edit size={18} />
   </button>
   ```
   **Ação:** Igual ao `/metanutri` - abre modal de visualização

   **Botão Aplicações (Azul):**
   ```tsx
   {(() => {
     const temAplicacoes = (paciente.evolucaoSeguimento || []).length > 0;
     return (
       <button
         onClick={() => {
           const novoEstado = pacienteDetalhesExpandido === item.pacienteId ? null : item.pacienteId;
           setPacienteDetalhesExpandido(novoEstado);
           if (novoEstado) {
             setPacienteCardExpandido(null);
           }
         }}
         className={`p-2 rounded-md transition-colors ${
           pacienteDetalhesExpandido === item.pacienteId
             ? 'bg-blue-600 text-white'
             : temAplicacoes
             ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
             : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
         }`}
         title={pacienteDetalhesExpandido === item.pacienteId ? 'Ocultar Aplicações' : 'Aplicações'}
       >
         <Syringe size={18} />
       </button>
     );
   })()}
   ```
   **Ação:** Igual ao `/metanutri` - toggle de lista de aplicações

   **Botão Exames (Verde):**
   ```tsx
   {(() => {
     const temExames = (paciente.examesLaboratoriais || []).length > 0;
     return (
       <button
         onClick={() => {
           setPacienteExamesSelecionado(paciente);
           setShowModalExames(true);
           // Inicializar com o exame mais recente se houver
           const exames = paciente.examesLaboratoriais || [];
           if (exames.length > 0) {
             const examesOrdenados = [...exames].sort((a, b) => {
               const dateA = a.dataColeta instanceof Date ? a.dataColeta.toISOString().split('T')[0] : (a.dataColeta?.toDate ? a.dataColeta.toDate().toISOString().split('T')[0] : '');
               const dateB = b.dataColeta instanceof Date ? b.dataColeta.toISOString().split('T')[0] : (b.dataColeta?.toDate ? b.dataColeta.toDate().toISOString().split('T')[0] : '');
               return dateB.localeCompare(dateA);
             });
             if (examesOrdenados.length > 0) {
               const dataMaisRecente = examesOrdenados[0].dataColeta instanceof Date 
                 ? examesOrdenados[0].dataColeta.toISOString().split('T')[0]
                 : examesOrdenados[0].dataColeta?.toDate 
                 ? examesOrdenados[0].dataColeta.toDate().toISOString().split('T')[0]
                 : '';
               setExameDataSelecionada(dataMaisRecente);
             }
           } else {
             setExameDataSelecionada('');
           }
         }}
         className={`p-2 rounded-md transition-colors ${
           temExames
             ? 'bg-green-50 text-green-700 hover:bg-green-100'
             : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
         }`}
         title="Exames"
       >
         <FlaskConical size={18} />
       </button>
     );
   })()}
   ```
   **Ação:** Igual ao `/metanutri` - abre modal de exames

   **Botão Prescrições (Roxo):**
   ```tsx
   <button
     onClick={async () => {
       setPacientePrescricoesSelecionado(paciente);
       setShowModalPrescricoes(true);
       setAbaPrescricoesModal('salvas');
       await loadPrescricoesModal(paciente);
     }}
     className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
     title="Prescrições"
   >
     <ClipboardList size={18} />
   </button>
   ```
   **Ação:** Igual ao `/metanutri` - abre modal de prescrições

   **Botão Nutri (Amarelo):**
   ```tsx
   {(() => {
     const temNutricao = pacientesComNutricao[paciente.id] || false;
     return (
       <button
         onClick={async () => {
           setPacienteNutricaoSelecionado(paciente);
           setShowModalNutricao(true);
           setLoadingNutricao(true);
           setActiveTabNutricao('plano');
           setPlanoNutricionalModal(null);
           setCheckinsNutricao([]);
           
           try {
             // Carregar plano nutricional
             const { db } = await import('@/lib/firebase');
             const { doc, getDoc } = await import('firebase/firestore');
             const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
             const planoSnap = await getDoc(planoRef);
             if (planoSnap.exists()) {
               setPlanoNutricionalModal(planoSnap.data());
             } else {
               setPlanoNutricionalModal(null);
             }
             
             // Carregar check-ins
             // ... lógica de carregamento de check-ins
             
             // Carregar nutricionistas elegíveis e status de compartilhamento
             if (personalTrainer?.userId) {
               await loadNutricionistasElegiveis();
               await loadStatusCompartilhamentoNutri(paciente.id);
             }
           } catch (error) {
             console.error('Erro ao carregar dados de nutrição:', error);
           } finally {
             setLoadingNutricao(false);
           }
         }}
         className={`p-2 rounded-md transition-colors ${
           temNutricao
             ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
             : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
         }`}
         title="Nutrição"
       >
         <UtensilsCrossed size={18} />
       </button>
     );
   })()}
   ```
   **Ação:** Igual ao `/metaadmin` - abre modal de nutrição com compartilhamento

   **Botão Personal (Rosa/Cinza):**
   ```tsx
   {(() => {
     const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) || !!(paciente.id && pacientesComTreinos.has(paciente.id));
     return (
       <button
         onClick={async () => {
           setPacientePersonalSelecionado(paciente);
           setShowModalPersonal(true);
           setActiveTabPersonal('hoje');
           
           // Carregar treino de hoje
           const patientId = paciente.userId || paciente.id;
           if (patientId) {
             await loadTodaySession(patientId);
           }
         }}
         className={`p-2 rounded-md transition-colors ${
           temPersonal
             ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
             : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
         }`}
         title="Personal Trainer"
       >
         <Dumbbell size={18} />
       </button>
     );
   })()}
   ```
   **Ação:** Abre modal de Personal Trainer (edição de treino)

   **Botão Excluir (Vermelho):**
   ```tsx
   <button
     onClick={() => handleCancelarCompartilhamentoPersonal(item)}
     className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
     title="Cancelar compartilhamento"
   >
     <Trash2 size={18} />
   </button>
   ```
   **Ação:** Excluir vínculo entre Personal Trainer e Paciente

**Referência:** Ver botões do `/metanutri` (linhas 4726-4857)

---

### 5.4 Criar Handler para Cancelar Compartilhamento

**Tarefas:**
1. Adicionar função para cancelar compartilhamento:
   ```typescript
   // Handler para cancelar compartilhamento (botão Excluir no mobile)
   const handleCancelarCompartilhamentoPersonal = async (item: PacienteVisivelPersonal) => {
     if (!user || !personalTrainer) return;
     
     const nomePaciente = item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'este paciente';
     const nomeMedico = item.medicoNome || 'o médico';
     
     const confirmar = confirm(
       `Tem certeza que deseja cancelar o compartilhamento de ${nomePaciente} com ${nomeMedico}?\n\n` +
       `Esta ação irá:\n` +
       `- Encerrar o compartilhamento ativo\n` +
       `- Deletar o histórico na coleção de solicitações\n\n` +
       `Esta ação não pode ser desfeita.`
     );
     
     if (!confirmar) return;
     
     try {
       await SolicitacaoPersonalTrainerService.endCompartilhamento(
         item.pacienteId,
         user.uid,
         item.medicoId
       );
       
       await loadPacientesList();
       alert('Compartilhamento cancelado com sucesso!');
     } catch (error: any) {
       console.error('Erro ao cancelar compartilhamento:', error);
       alert(error.message || 'Erro ao cancelar compartilhamento.');
     }
   };
   ```

**Referência:** Ver função do `/metanutri` (linhas 1557-1592), adaptar para usar `SolicitacaoPersonalTrainerService.endCompartilhamento`

---

## ETAPA 6: Implementar Modais

### 6.1 Modal de Prescrições

**Tarefas:**
1. Copiar modal completo do `/metanutri` (linhas 9038-9500)
2. Adaptar:
   - Usar `personalTrainer.userId` como `medicoId`
   - PDF: mostrar "CREF" ao invés de "CRN"
   - Título: "PRESCRIÇÃO DE TREINO" ou similar

**Referência:** Ver modal do `/metanutri` (linhas 9038-9500)

---

### 6.2 Modal de Nutrição

**Tarefas:**
1. Copiar modal completo do `/metaadmin` (linhas 28405-29000+)
2. Adaptar:
   - Usar `personalTrainer` ao invés de `medicoPerfil`
   - Usar `loadStatusCompartilhamentoNutri` ao invés de `loadStatusCompartilhamento`
   - Usar `SolicitacaoNutricionistaService` com `personalTrainer.userId` como `medicoId`

**Referência:** Ver modal do `/metaadmin` (linhas 28405-29000+)

---

### 6.3 Modal de Personal Trainer (Edição de Treino)

**Tarefas:**
1. Criar modal baseado na página `/meta/personal`
2. Estrutura do modal:
   ```tsx
   {showModalPersonal && pacientePersonalSelecionado && (
     <div className="fixed inset-0 z-[9999] overflow-y-auto">
       <div className="flex min-h-full items-stretch justify-center px-0 py-0 text-center sm:block sm:min-h-screen sm:p-0">
         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModalPersonal(false)} />
         <div className="fixed inset-0 z-10 flex flex-col overflow-y-auto bg-white sm:static sm:my-8 sm:inline-block sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-lg sm:shadow-xl">
           {/* Header */}
           <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-200">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <Dumbbell className="w-6 h-6 text-pink-600" />
                 <h3 className="text-lg font-semibold text-gray-900">
                   Treinos - {pacientePersonalSelecionado.nome}
                 </h3>
               </div>
               <button onClick={() => setShowModalPersonal(false)} className="text-gray-400 hover:text-gray-500">
                 <X size={24} />
               </button>
             </div>
           </div>
           
           {/* Tabs */}
           <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
             {[
               { id: 'hoje', label: 'Hoje', icon: Calendar },
               { id: 'cronograma', label: 'Cronograma', icon: Calendar },
               { id: 'criar', label: 'Criar', icon: Plus },
               { id: 'historico', label: 'Histórico', icon: History },
               { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
               { id: 'lembretes', label: 'Lembretes', icon: Bell },
             ].map(({ id, label, icon: Icon }) => (
               <button
                 key={id}
                 onClick={() => setActiveTabPersonal(id as any)}
                 className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                   activeTabPersonal === id
                     ? 'border-pink-500 text-pink-700 bg-white'
                     : 'border-transparent text-gray-500 hover:text-gray-700'
                 }`}
               >
                 <Icon size={16} className="mx-auto mb-1" />
                 {label}
               </button>
             ))}
           </div>
           
           {/* Conteúdo das Tabs */}
           <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full px-4 py-4">
             {/* Renderizar conteúdo de cada tab baseado em activeTabPersonal */}
             {/* Copiar lógica da página /meta/personal para cada tab */}
           </div>
         </div>
       </div>
     </div>
   )}
   ```

3. Para cada tab, copiar a lógica da página `/meta/personal`:
   - **Tab Hoje:** Linhas 1006-1200+ da página `/meta/personal`
   - **Tab Cronograma:** Linhas 1200-1600+ da página `/meta/personal`
   - **Tab Criar:** Linhas 1600-2000+ da página `/meta/personal`
   - **Tab Histórico:** Linhas 2000-2200+ da página `/meta/personal`
   - **Tab Estatísticas:** Linhas 2200-2400+ da página `/meta/personal`
   - **Tab Lembretes:** Linhas 2400-2600+ da página `/meta/personal`

4. **Adaptações importantes:**
   - Usar `pacientePersonalSelecionado.userId || pacientePersonalSelecionado.id` como `patientId`
   - Todas as funções devem receber `patientId` como parâmetro
   - `createdBy` deve ser `'personal_trainer'` e `createdById` deve ser `personalTrainer.userId`

**Referência:** Ver página `/meta/personal` completa (linhas 1006-2237)

---

## ETAPA 7: Adicionar Detalhes Expandíveis e Lista de Aplicações

### 7.1 Detalhes Expandíveis

**Tarefas:**
1. Copiar seção de detalhes expandíveis do `/metanutri`
2. Incluir:
   - Caixa de informações clínicas (barra de IMC interativa - se quiser manter)
   - Informações adicionais (cadastro, telefone, cidade, etc.)

**Referência:** Ver detalhes do `/metanutri` (linhas 4862-5341)

---

### 7.2 Lista de Aplicações

**Tarefas:**
1. Copiar lista de aplicações do `/metanutri`
2. Manter mesma estrutura e funcionalidade

**Referência:** Ver lista do `/metanutri` (linhas 5344-5447)

---

## ETAPA 8: Adicionar useEffect para Carregar Dados

### 8.1 Carregar Pacientes com Treinos

**Tarefas:**
1. Adicionar `useEffect` (já especificado na ETAPA 4.3)

### 8.2 Carregar Pacientes com Nutrição

**Tarefas:**
1. Adicionar `useEffect` para carregar pacientes com nutrição:
   ```typescript
   useEffect(() => {
     if (activeMenu !== 'pacientes' || pacientesVisiveis.length === 0) return;
     
     let cancelled = false;
     (async () => {
       const pacientesComNutriMap: Record<string, boolean> = {};
       
       for (const item of pacientesVisiveis) {
         if (cancelled) break;
         try {
           const { db } = await import('@/lib/firebase');
           const { doc, getDoc } = await import('firebase/firestore');
           const planoRef = doc(db, 'pacientes_completos', item.paciente.id, 'nutricao', 'plano');
           const planoSnap = await getDoc(planoRef);
           pacientesComNutriMap[item.paciente.id] = planoSnap.exists();
         } catch {
           pacientesComNutriMap[item.paciente.id] = false;
         }
       }
       
       if (!cancelled) setPacientesComNutricao(pacientesComNutriMap);
     })();
     return () => { cancelled = true; };
   }, [activeMenu, pacientesVisiveis]);
   ```

**Referência:** Ver lógica do `/metaadmin` (linha 6552)

---

## ETAPA 9: Verificar e Ajustar Fechamento de Divs

### 9.1 Verificar Estrutura do Card

**Tarefas:**
1. Garantir que todas as divs estão fechadas corretamente
2. Verificar que a estrutura está:
   ```tsx
   <div key={item.pacienteId} className={...}>
     <div className={...}>
       {/* Barra de progresso */}
       <div className="p-4 pt-3">
         {/* Cabeçalho */}
         {/* Botões de ação */}
         {/* Detalhes expandíveis */}
         {/* Lista de aplicações */}
       </div>
     </div>
   </div>
   ```

---

## ETAPA 10: Testes e Ajustes Finais

### 10.1 Testar Cada Botão

**Tarefas:**
1. **Botão Editar:** Deve abrir modal de visualização
2. **Botão Aplicações:** Deve expandir/recolher lista de aplicações
3. **Botão Exames:** Deve abrir modal de exames
4. **Botão Prescrições:** Deve abrir modal de prescrições
5. **Botão Nutri:** Deve abrir modal de nutrição (igual ao `/metaadmin`)
6. **Botão Personal:** Deve abrir modal de Personal Trainer (edição de treino)
7. **Botão Excluir:** Deve excluir vínculo e recarregar lista

### 10.2 Verificar Ícone Rosa do Personal

**Tarefas:**
1. Verificar se o ícone fica rosa quando há treinos
2. Testar com pacientes com e sem treinos

### 10.3 Verificar Responsividade

**Tarefas:**
1. Testar em mobile e desktop
2. Verificar que cards aparecem apenas em mobile (`lg:hidden`)

---

## Resumo das Etapas

1. ✅ **ETAPA 1:** Preparação e Imports
2. ✅ **ETAPA 2:** Adicionar Estados Necessários
3. ✅ **ETAPA 3:** Adicionar Funções Auxiliares
4. ✅ **ETAPA 4:** Adicionar Funções de Carregamento
5. ✅ **ETAPA 5:** Atualizar Card Mobile de Pacientes
6. ✅ **ETAPA 6:** Implementar Modais
7. ✅ **ETAPA 7:** Adicionar Detalhes Expandíveis e Lista de Aplicações
8. ✅ **ETAPA 8:** Adicionar useEffect para Carregar Dados
9. ✅ **ETAPA 9:** Verificar e Ajustar Fechamento de Divs
10. ✅ **ETAPA 10:** Testes e Ajustes Finais

---

## Notas Importantes

### Diferenças do Contexto

1. **Prescrições:** Usa `personalTrainer.userId` como `medicoId`
2. **Nutrição:** Sistema atual requer `medicoId`, então usar primeiro médico vinculado ao personal trainer
3. **Personal Trainer:** Modal permite edição completa de treinos (criar, editar, deletar)
4. **Excluir:** Remove vínculo entre Personal Trainer e Paciente (não entre médico e paciente)

### Dependências

- Todos os serviços já devem estar disponíveis
- Componentes externos (`NutriContent`, `CalendarioTreinosPersonal`) já existem
- Tipos e constantes já estão definidos

### Ordem de Implementação Recomendada

1. Primeiro: Estados e imports (ETAPAS 1-2)
2. Segundo: Funções auxiliares e de carregamento (ETAPAS 3-4)
3. Terceiro: Atualizar card (ETAPA 5)
4. Quarto: Implementar modais (ETAPA 6)
5. Quinto: Detalhes e aplicações (ETAPA 7)
6. Sexto: useEffects e ajustes (ETAPAS 8-9)
7. Sétimo: Testes (ETAPA 10)

---

## Checklist Final

- [ ] Todos os imports adicionados
- [ ] Todos os estados adicionados
- [ ] Funções auxiliares implementadas
- [ ] Funções de carregamento implementadas
- [ ] Card mobile atualizado com barra de progresso
- [ ] Cabeçalho atualizado com badge de mensagens
- [ ] Botões centralizados e funcionais
- [ ] Modal de Prescrições implementado
- [ ] Modal de Nutrição implementado (igual ao `/metaadmin`)
- [ ] Modal de Personal Trainer implementado (igual ao `/meta/personal`)
- [ ] Handler de excluir vínculo implementado
- [ ] Detalhes expandíveis funcionando
- [ ] Lista de aplicações funcionando
- [ ] Ícone rosa do Personal funcionando
- [ ] Testes realizados
- [ ] Sem erros de lint

---

## Referências de Código

- **Card Mobile:** `/metanutri` linhas 4505-5454
- **Modal Prescrições:** `/metanutri` linhas 9038-9500
- **Modal Nutrição:** `/metaadmin` linhas 28405-29000+
- **Modal Personal (edição):** `/meta/personal` linhas 60-2237
- **Funções auxiliares:** `/metanutri` linhas 303-397
- **Carregamento de treinos:** `/metanutri` linhas 1773-1805

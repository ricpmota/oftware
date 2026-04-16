'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, CheckCircle2, AlertTriangle, Info, Plus, Trash2, Edit2, Save, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { VideoFile, ProgressMap, PlannerSettings, PlannerStats, ScheduleSettings } from '@/types/videoLibrary';
import {
  buildStudyDays,
  calculatePlannerStats,
  generatePlanInput,
} from '@/utils/studyPlannerUtils';
import {
  loadPlannersFromFirestore,
  savePlannerToFirestore,
  deletePlannerFromFirestore,
  loadPlannerFromFirestore,
} from '@/utils/plannerFirestore';
import { saveScheduleToFirestore, deleteScheduleFromFirestore } from '@/utils/scheduleFirestore';
import { generateSchedule } from '@/utils/scheduleGenerator';
import { Schedule, PlanInput } from '@/types/videoLibrary';
import {
  savePlannerStats,
  savePlanInput,
} from '@/utils/plannerStorage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface StudyPlannerProps {
  videos: VideoFile[];
  progressMap: ProgressMap;
  availableSubjects: string[];
  libraryId: string | null; // ID da biblioteca atual
  scheduleSettings?: ScheduleSettings;
  onScheduleSettingsChange?: (settings: ScheduleSettings) => void;
  selectedPlannerId?: string | null;
  onPlannerChange?: (plannerId: string | null, planner: PlannerSettings | null) => void;
}

const WEEKDAYS = [
  { name: 'Dom', index: 0 },
  { name: 'Seg', index: 1 },
  { name: 'Ter', index: 2 },
  { name: 'Qua', index: 3 },
  { name: 'Qui', index: 4 },
  { name: 'Sex', index: 5 },
  { name: 'Sáb', index: 6 },
];

/**
 * Componente de planejador de estudo
 */
export default function StudyPlanner({
  videos,
  progressMap,
  availableSubjects,
  libraryId,
  scheduleSettings: externalScheduleSettings,
  onScheduleSettingsChange,
  selectedPlannerId: externalSelectedPlannerId,
  onPlannerChange,
}: StudyPlannerProps) {
  // Estado das configurações do planejamento atual
  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Seg-Sex por padrão
  const [hoursPerWeekday, setHoursPerWeekday] = useState<{ [weekday: number]: number }>({
    0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0,
  }); // Horas por dia da semana
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectOrder, setSubjectOrder] = useState<string[]>([]);

  // Estado de gerenciamento de planejamentos
  const [plannersList, setPlannersList] = useState<PlannerSettings[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingPlannerId, setEditingPlannerId] = useState<string | null>(null);
  const [isLoadingPlanners, setIsLoadingPlanners] = useState(false);

  // Estatísticas calculadas
  const [stats, setStats] = useState<PlannerStats | null>(null);

  /**
   * Carrega lista de planejamentos do Firestore
   */
  const loadPlanners = useCallback(async () => {
    if (!libraryId) return;
    try {
      setIsLoadingPlanners(true);
      const planners = await loadPlannersFromFirestore(libraryId);
      setPlannersList(planners);
    } catch (error) {
      console.error('Erro ao carregar planejamentos:', error);
    } finally {
      setIsLoadingPlanners(false);
    }
  }, [libraryId]);

  /**
   * Carrega lista de planejamentos quando autenticado e libraryId disponível
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && libraryId) {
        await loadPlanners();
      }
    });

    return () => unsubscribe();
  }, [loadPlanners, libraryId]);

  /**
   * Carrega configurações de um planejamento (sem notificar pai para evitar loops)
   */
  const loadPlannerSettingsInternal = useCallback((settings: PlannerSettings, notifyParent: boolean = true) => {
    setPlannerId(settings.id || null);
    setPlannerName(settings.name || '');
    setStartDate(settings.startDateISO);
    setEndDate(settings.endDateISO);
    setAllowedWeekdays(settings.allowedWeekdays);
    
    // Carregar hoursPerWeekday ou usar padrão
    if (settings.hoursPerWeekday && Object.keys(settings.hoursPerWeekday).length > 0) {
      setHoursPerWeekday(settings.hoursPerWeekday);
    }
    
    setSelectedSubjects(settings.selectedSubjects || []);
    setSubjectOrder(settings.subjectOrder || settings.selectedSubjects || []);
    setIsCreatingNew(false);
    setEditingPlannerId(null);
    
    // Notificar mudança para componente pai apenas se solicitado
    if (notifyParent) {
      onPlannerChange?.(settings.id || null, settings);
    }
  }, [onPlannerChange]);

  /**
   * Carrega configurações de um planejamento (alias público)
   */
  const loadPlannerSettings = useCallback((settings: PlannerSettings) => {
    loadPlannerSettingsInternal(settings, true);
  }, [loadPlannerSettingsInternal]);

  /**
   * Sincroniza com planejamento selecionado externamente
   */
  useEffect(() => {
    if (externalSelectedPlannerId && externalSelectedPlannerId !== plannerId) {
      const planner = plannersList.find(p => p.id === externalSelectedPlannerId);
      if (planner) {
        loadPlannerSettingsInternal(planner, false); // Não notificar pai para evitar loop
      }
    } else if (!externalSelectedPlannerId && plannerId) {
      // Se externamente não há seleção, manter estado interno (não resetar)
    }
  }, [externalSelectedPlannerId, plannersList, plannerId, loadPlannerSettingsInternal]);

  /**
   * Calcula estatísticas quando configurações mudam
   */
  useEffect(() => {
    if (startDate && endDate && allowedWeekdays.length > 0 && selectedSubjects.length > 0) {
      const studyDays = buildStudyDays(startDate, endDate, allowedWeekdays, hoursPerWeekday);
      const calculatedStats = calculatePlannerStats(
        studyDays,
        hoursPerWeekday,
        videos,
        progressMap,
        selectedSubjects
      );
      setStats(calculatedStats);

      // Salvar estatísticas
      savePlannerStats(calculatedStats);

      // Gerar e salvar planInput para Etapa 4
      const planInput = generatePlanInput(studyDays, hoursPerWeekday, videos, selectedSubjects, subjectOrder, plannerId || undefined);
      savePlanInput(planInput);
    } else {
      setStats(null);
    }
  }, [startDate, endDate, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder, videos, progressMap, plannerId]);

  /**
   * Salva planejamento atual no Firestore e cria cronograma automaticamente
   */
  const handleSavePlanner = useCallback(async () => {
    if (!startDate || !endDate || !plannerName.trim()) {
      alert('Preencha nome, data de início e data de fim');
      return;
    }
    
    if (!libraryId) {
      alert('Selecione ou salve uma biblioteca primeiro.');
      return;
    }

    try {
      const settings: PlannerSettings = {
        id: plannerId || undefined,
        libraryId,
        name: plannerName.trim(),
        startDateISO: startDate,
        endDateISO: endDate,
        allowedWeekdays,
        hoursPerWeekday,
        selectedSubjects,
        subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
      };

      const savedId = await savePlannerToFirestore(settings);
      setPlannerId(savedId);
      
      // Recarregar lista
      await loadPlanners();
      
      // Atualizar settings com ID salvo
      const updatedSettings: PlannerSettings = {
        ...settings,
        id: savedId,
      };
      
      // Gerar e salvar cronograma automaticamente
      const studyDays = buildStudyDays(
        startDate,
        endDate,
        allowedWeekdays,
        hoursPerWeekday
      );
      
      const selectedVideos = videos.filter(v => selectedSubjects.includes(v.subject));
      const selectedVideoIds = selectedVideos.map(v => v.videoId);
      
      const planInput: PlanInput = {
        studyDays,
        hoursPerWeekday,
        selectedVideoIds,
        selectedSubjects,
        subjectOrder: subjectOrder.length > 0 ? subjectOrder : selectedSubjects,
        plannerId: savedId,
      };
      
      const schedule = generateSchedule(planInput, videos, progressMap, {
        intercalateSubjects: false,
        splitLongVideos: true,
      });
      
      // Salvar cronograma no Firestore
      await saveScheduleToFirestore(libraryId, schedule);
      
      setIsCreatingNew(false);
      setEditingPlannerId(null);
      
      // Notificar mudança para componente pai
      onPlannerChange?.(savedId, updatedSettings);
      
      alert('Planejamento salvo com sucesso! Cronograma criado automaticamente.');
    } catch (error) {
      console.error('Erro ao salvar planejamento:', error);
      alert('Erro ao salvar planejamento. Tente novamente.');
    }
  }, [plannerId, plannerName, startDate, endDate, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder, libraryId, videos, progressMap, loadPlanners, onPlannerChange]);

  /**
   * Cria novo planejamento
   */
  const handleNewPlanner = useCallback(() => {
    setPlannerId(null);
    setPlannerName('');
    setStartDate('');
    setEndDate('');
    setAllowedWeekdays([1, 2, 3, 4, 5]);
    setHoursPerWeekday({ 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });
    setSelectedSubjects([]);
    setSubjectOrder([]);
    setStats(null);
    setIsCreatingNew(true);
    setEditingPlannerId(null);
    // Notificar componente pai para limpar seleção externa
    onPlannerChange?.(null, null);
  }, [onPlannerChange]);

  /**
   * Deleta planejamento do Firestore e seu cronograma
   */
  const handleDeletePlanner = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este planejamento? O cronograma associado também será excluído.')) return;
    
    if (!libraryId) {
      alert('Erro: biblioteca não selecionada.');
      return;
    }
    
    try {
      // Deletar cronograma primeiro
      try {
        await deleteScheduleFromFirestore(libraryId, id);
      } catch (error) {
        console.error('Erro ao deletar cronograma (pode não existir):', error);
      }
      
      // Deletar planejamento
      await deletePlannerFromFirestore(libraryId, id);
      
      // Se era o ativo, limpar
      if (plannerId === id) {
        handleNewPlanner();
        // Notificar componente pai para limpar schedule e planner
        onPlannerChange?.(null, null);
      }
      
      // Recarregar lista
      await loadPlanners();
    } catch (error) {
      console.error('Erro ao deletar planejamento:', error);
      alert('Erro ao deletar planejamento. Tente novamente.');
    }
  }, [plannerId, libraryId, handleNewPlanner, loadPlanners]);

  /**
   * Toggle de dia da semana
   */
  const toggleWeekday = useCallback((index: number) => {
    setAllowedWeekdays((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort()
    );
  }, []);

  /**
   * Atualiza horas de um dia da semana
   */
  const updateHoursForWeekday = useCallback((weekday: number, hours: number) => {
    setHoursPerWeekday((prev) => ({
      ...prev,
      [weekday]: Math.max(0, hours),
    }));
  }, []);

  /**
   * Toggle de assunto selecionado
   */
  const toggleSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) => {
      const newSelected = prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject];
      
      // Atualizar ordem também
      setSubjectOrder((prevOrder) => {
        if (prev.includes(subject)) {
          // Removendo
          return prevOrder.filter((s) => s !== subject);
        } else {
          // Adicionando no final
          return [...prevOrder, subject];
        }
      });
      
      return newSelected;
    });
  }, []);

  /**
   * Move assunto para cima na ordem
   */
  const moveSubjectUp = useCallback((subject: string) => {
    setSubjectOrder((prev) => {
      const index = prev.indexOf(subject);
      if (index <= 0) return prev;
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  }, []);

  /**
   * Move assunto para baixo na ordem
   */
  const moveSubjectDown = useCallback((subject: string) => {
    setSubjectOrder((prev) => {
      const index = prev.indexOf(subject);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  }, []);


  /**
   * Formata horas para exibição
   */
  const formatHours = useCallback((minutes: number): string => {
    if (minutes === 0) return '0h';
    const absMinutes = Math.abs(minutes);
    const hours = absMinutes / 60;
    const sign = minutes < 0 ? '-' : '';
    if (hours >= 1) {
      return `${sign}${hours.toFixed(1)}h`;
    }
    return `${sign}${absMinutes.toFixed(0)}min`;
  }, []);

  /**
   * Assuntos ordenados (segue subjectOrder, depois adiciona os não ordenados)
   */
  const orderedSelectedSubjects = useMemo(() => {
    const ordered = subjectOrder.filter(s => selectedSubjects.includes(s));
    const unordered = selectedSubjects.filter(s => !subjectOrder.includes(s));
    return [...ordered, ...unordered];
  }, [selectedSubjects, subjectOrder]);

  const getSubjectIconSrc = useCallback((subject: string) => {
    const encoded = encodeURIComponent(subject.trim());
    return `/Oftreview%20Icones/${encoded}.png`;
  }, []);

  const getSubjectShortLabel = useCallback((subject: string) => {
    // Regra especial para Neuroftalmologia
    if (subject.toLowerCase() === 'neuroftalmologia') {
      return 'Neuroftalmo';
    }
    const cleaned = subject.replace(/[.,]/g, ' ').trim();
    const first = cleaned.split(/\s+/)[0];
    return first || subject;
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Planejador de Estudo</h2>
        </div>
        <button
          onClick={handleNewPlanner}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Planejamento
        </button>
      </div>

      {/* Seletor de Planejamento Salvo (Dropdown compacto) */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Planejamento:</label>
        <div className="flex-1 relative">
          <select
            value={externalSelectedPlannerId || plannerId || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) {
                const selectedPlanner = plannersList.find(p => p.id === selectedId);
                if (selectedPlanner) {
                  loadPlannerSettings(selectedPlanner);
                }
              } else {
                handleNewPlanner();
              }
            }}
            onFocus={() => {
              if (plannersList.length === 0) {
                loadPlanners();
              }
            }}
            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
          >
            <option value="">-- Novo Planejamento --</option>
            {plannersList.map((planner) => (
              <option key={planner.id} value={planner.id}>
                {planner.name}
              </option>
            ))}
          </select>
          {plannerId && plannersList.find(p => p.id === plannerId) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (plannerId && confirm('Tem certeza que deseja excluir este planejamento?')) {
                  handleDeletePlanner(plannerId);
                }
              }}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-red-600 hover:bg-red-50 rounded"
              title="Excluir planejamento"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Nome do planejamento */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">Nome do Planejamento</label>
        <input
          type="text"
          value={plannerName}
          onChange={(e) => setPlannerName(e.target.value)}
          placeholder="Ex: Estudo Anual 2025, Foco Catarata, etc."
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Seção Período e Dias da Semana */}
      <div className="grid grid-cols-2 gap-4">
        {/* Coluna 1: Datas */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Período</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data de Fim</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Coluna 2: Dias da Semana e Horas */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Dias da Semana e Horas
          </h3>
          
          {/* Linha 1: Botões dos dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((day) => {
              const isSelected = allowedWeekdays.includes(day.index);
              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => toggleWeekday(day.index)}
                  className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day.name}
                </button>
              );
            })}
          </div>
          
          {/* Linha 2: Inputs de horas */}
          {allowedWeekdays.length > 0 && (
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => {
                const isSelected = allowedWeekdays.includes(day.index);
                return (
                  <div key={day.index} className="flex items-center gap-1">
                    {isSelected ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={hoursPerWeekday[day.index] || 0}
                          onChange={(e) => updateHoursForWeekday(day.index, parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-[10px] text-gray-500">h</span>
                      </>
                    ) : (
                      <div className="w-full" /> // Espaço vazio para manter alinhamento
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Linha 3: Total de horas semanais */}
          {allowedWeekdays.length > 0 && (
            <div className="pt-1 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-medium text-gray-700">Total semanal:</span>
                <span className="text-sm font-bold text-blue-600">
                  {Object.entries(hoursPerWeekday)
                    .filter(([dayIndex]) => allowedWeekdays.includes(parseInt(dayIndex)))
                    .reduce((sum, [, hours]) => sum + (hours || 0), 0)
                    .toFixed(1)}h
                </span>
              </div>
            </div>
          )}
          
          {allowedWeekdays.length === 0 && (
            <p className="text-xs text-red-600">Selecione pelo menos um dia da semana</p>
          )}
        </div>
      </div>

      {/* Seção Assuntos */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Assuntos do Cronograma
        </h3>
        
        {/* Lista de assuntos selecionados (com ordenação) */}
        {orderedSelectedSubjects.length > 0 && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-2">Ordem de Estudo:</p>
            <div className="space-y-1">
              {orderedSelectedSubjects.map((subject, index) => (
                <div key={subject} className="flex items-center gap-2 p-1.5 bg-white rounded border border-blue-100">
                  <span className="text-xs font-medium text-gray-700 w-6">{index + 1}.</span>
                  <span className="flex-1 text-xs text-gray-900">{subject}</span>
                  <button
                    onClick={() => moveSubjectUp(subject)}
                    disabled={index === 0}
                    className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSubjectDown(subject)}
                    disabled={index === orderedSelectedSubjects.length - 1}
                    className="p-0.5 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade de assuntos com ícones */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {availableSubjects.length === 0 ? (
            <div className="col-span-full">
              <p className="text-xs text-gray-500">Nenhum assunto disponível</p>
            </div>
          ) : (
            availableSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'bg-white shadow-sm border-2 border-blue-100'
                      : 'bg-gray-50 border border-gray-200 group-hover:bg-white group-hover:border-blue-200'
                  }`}>
                    <img
                      src={getSubjectIconSrc(subject)}
                      alt={subject}
                      className={`w-full h-full object-contain transition-transform duration-200 ${
                        isSelected ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                      onError={(e) => {
                        // fallback visual simples se ícone não existir
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight transition-colors duration-200 ${
                    isSelected
                      ? 'text-blue-700'
                      : 'text-gray-700 group-hover:text-blue-600'
                  }`}>
                    {getSubjectShortLabel(subject)}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedSubjects.length === 0 && (
          <p className="text-xs text-red-600">Selecione pelo menos um assunto</p>
        )}
      </div>

      {/* Botão Salvar */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={handleSavePlanner}
          disabled={!startDate || !endDate || !plannerName.trim() || selectedSubjects.length === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Planejamento
        </button>
      </div>

      {/* Resumo e Estatísticas */}
      {stats && startDate && endDate && selectedSubjects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Resumo do Planejamento</h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            <div className="bg-blue-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Dias de Estudo</p>
              <p className="text-lg font-bold text-blue-600">{stats.studyDaysCount}</p>
            </div>
            <div className="bg-green-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Capacidade Total</p>
              <p className="text-lg font-bold text-green-600">{formatHours(stats.totalCapacityMinutes)}h</p>
            </div>
            <div className="bg-orange-50 rounded p-2.5">
              <p className="text-xs text-gray-600 mb-0.5">Carga dos Vídeos</p>
              <p className="text-lg font-bold text-orange-600">{formatHours(stats.totalLoadMinutes)}h</p>
            </div>
            <div className={`rounded p-2.5 ${stats.excessMinutes >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-600 mb-0.5">Folga/Excesso</p>
              <p
                className={`text-lg font-bold ${stats.excessMinutes >= 0 ? 'text-purple-600' : 'text-red-600'}`}
              >
                {stats.excessMinutes >= 0 ? '+' : ''}
                {formatHours(stats.excessMinutes)}h
              </p>
            </div>
          </div>

          {/* Percentual de Cobertura */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Percentual de Cobertura</span>
              <span className="text-xs font-bold text-blue-700">{stats.coveragePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.coveragePercent}%` }}
              />
            </div>
          </div>

          {/* Alerta/Recomendações */}
          {stats.excessMinutes < 0 ? (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">Não cabe no período</p>
                  <div className="text-xs text-red-700 space-y-0.5">
                    <p>
                      Ajuste as horas por dia ou o período para acomodar todo o conteúdo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-0.5">Cabe com folga</p>
                  <p className="text-xs text-green-700">
                    Folga de <strong>{formatHours(stats.excessMinutes)}h</strong> (
                    {stats.coveragePercent.toFixed(1)}% de cobertura)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown por Assunto */}
          {stats.perSubjectStats.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Breakdown por Assunto</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">
                        Assunto
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        Vídeos
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        Horas
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        Assistido
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.perSubjectStats.map((stat) => (
                      <tr key={stat.subject} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 font-medium text-gray-900">{stat.subject}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">{stat.videoCount}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700">
                          {stat.totalMinutes.toFixed(1)}h
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700">
                          {stat.watchedMinutes.toFixed(1)}h
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700">
                          {stat.watchedPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

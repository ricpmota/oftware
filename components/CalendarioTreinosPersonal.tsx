'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';
import { trainingSessionService } from '@/services/trainingSessionService';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import {
  translateExerciseName,
  translateTarget,
  translateEquipment,
} from '@/data/exerciseTranslations';

type Visualizacao = 'mes' | 'semana';

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarioTreinosPersonal({
  patientId,
  pacienteId,
  wideRange,
}: {
  patientId: string | undefined;
  pacienteId?: string | undefined;
  /** Modal /metaadmin: buscar 2020–2030 para nunca perder "hoje" e tentar userId + doc id */
  wideRange?: boolean;
}) {
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [semanaCalendario, setSemanaCalendario] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('semana');
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [sessoes, setSessoes] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<TrainingSessionExercise[]>([]);

  const loadSessions = useCallback(async () => {
    const effectiveId = patientId || pacienteId;
    if (!effectiveId) {
      setSessoes([]);
      return;
    }
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;
      const hoje = new Date();
      const hojeStr = toLocalYYYYMMDD(hoje);
      if (wideRange) {
        startDate = '2020-01-01';
        endDate = '2030-12-31';
      } else if (visualizacao === 'semana') {
        const inicio = new Date(semanaCalendario);
        inicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
        inicio.setHours(0, 0, 0, 0);
        const fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);
        fim.setHours(23, 59, 59, 999);
        startDate = toLocalYYYYMMDD(inicio);
        endDate = toLocalYYYYMMDD(fim);
      } else {
        const ano = mesCalendario.getFullYear();
        const mes = mesCalendario.getMonth();
        const primeiro = new Date(ano, mes, 1);
        const ultimo = new Date(ano, mes + 1, 0);
        startDate = toLocalYYYYMMDD(primeiro);
        endDate = toLocalYYYYMMDD(ultimo);
      }
      if (!wideRange) {
        if (hojeStr < startDate) startDate = hojeStr;
        if (hojeStr > endDate) endDate = hojeStr;
      }
      const opts = { startDate, endDate };
      const idsToTry: string[] = [];
      const seen = new Set<string>();
      const add = (id: string) => {
        if (!id || seen.has(id)) return;
        seen.add(id);
        idsToTry.push(id);
      };
      if (patientId) {
        add(patientId);
        const prefix = /^(.+)_\d+$/.exec(patientId)?.[1];
        if (prefix) add(prefix);
      }
      if (pacienteId) add(pacienteId);
      if (idsToTry.length === 0) idsToTry.push(effectiveId);

      const byId = new Map<string, TrainingSession>();
      for (const id of idsToTry) {
        try {
          const list = await trainingSessionService.getPatientSessions(id, opts);
          list.forEach((s) => { if (s.id) byId.set(s.id, s); });
          if (wideRange && typeof window !== 'undefined') {
            console.warn('[CalendarioTreinosPersonal] getPatientSessions', { id, count: list.length, sample: list[0]?.scheduledDate });
          }
        } catch (e) {
          if (wideRange && typeof window !== 'undefined') {
            console.warn('[CalendarioTreinosPersonal] getPatientSessions erro', { id, err: e });
          }
        }
      }
      const list = Array.from(byId.values());
      if (wideRange && typeof window !== 'undefined') {
        console.warn('[CalendarioTreinosPersonal] total sessoes', { patientId, pacienteId, idsToTry, count: list.length });
      }
      setSessoes(list);
    } catch (e) {
      console.error('Erro ao carregar treinos:', e);
      setSessoes([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, pacienteId, wideRange, visualizacao, mesCalendario, semanaCalendario]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionClick = async (session: TrainingSession) => {
    setSelectedSession(session);
    if (session.id) {
      try {
        const ex = await trainingSessionService.getSessionExercises(session.id);
        setSelectedExercises(ex);
      } catch {
        setSelectedExercises([]);
      }
    } else {
      setSelectedExercises([]);
    }
  };

  if (!patientId && !pacienteId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        Calendário indisponível: paciente sem vínculo com /meta.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle Mês / Semana */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Calendar size={16} className="text-pink-600" />
          Calendário dos Treinos
        </h4>
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setVisualizacao('mes')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              visualizacao === 'mes' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('semana')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              visualizacao === 'semana' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {wideRange && !loading && (
        <p className="text-xs text-gray-500">
          Sessões em <code className="bg-gray-100 px-1 rounded">trainingSessions</code>: {sessoes.length}
          {sessoes.length === 0 && ' — Verifique patientId (userId) no console.'}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      ) : visualizacao === 'mes' ? (
        <CalendarioMes
          mesCalendario={mesCalendario}
          setMesCalendario={setMesCalendario}
          diaSelecionado={diaSelecionado}
          setDiaSelecionado={setDiaSelecionado}
          sessoes={sessoes}
          onSessionClick={handleSessionClick}
        />
      ) : (
        <CalendarioSemana
          semanaCalendario={semanaCalendario}
          setSemanaCalendario={setSemanaCalendario}
          diaSelecionado={diaSelecionado}
          setDiaSelecionado={setDiaSelecionado}
          sessoes={sessoes}
          onSessionClick={handleSessionClick}
        />
      )}

      {/* Modal detalhe sessão (somente leitura) */}
      {selectedSession && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedSession.title}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {new Date(selectedSession.scheduledDate).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setSelectedExercises([]);
                }}
                className="rounded p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  selectedSession.status === 'done'
                    ? 'bg-green-100 text-green-800'
                    : selectedSession.status === 'skipped'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {selectedSession.status === 'done'
                  ? 'Feito'
                  : selectedSession.status === 'skipped'
                  ? 'Pulou'
                  : 'Agendado'}
              </span>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Exercícios</h3>
              {selectedExercises.length === 0 ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : (
                selectedExercises.map((ex, i) => (
                  <div
                    key={ex.exerciseId || i}
                    className="flex gap-3 rounded-lg border border-gray-200 p-4"
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        ex.status === 'done'
                          ? 'bg-green-500 text-white'
                          : ex.status === 'skipped'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                      title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                    >
                      {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                    </span>
                    {ex.gifUrl && (
                      <img
                        src={ex.gifUrl}
                        alt={translateExerciseName(ex.name)}
                        className="h-16 w-16 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {i + 1}. {translateExerciseName(ex.name)}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ex.status === 'done'
                              ? 'bg-green-100 text-green-800'
                              : ex.status === 'skipped'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {translateTarget(ex.target)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {translateEquipment(ex.equipment)}
                        </span>
                      </div>
                      {ex.prescription && (
                        <p className="mt-2 text-sm text-gray-600">
                          {ex.prescription.sets} séries × {ex.prescription.reps} repetições • Descanso:{' '}
                          {ex.prescription.restSec}s
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarioMes({
  mesCalendario,
  setMesCalendario,
  diaSelecionado,
  setDiaSelecionado,
  sessoes,
  onSessionClick,
}: {
  mesCalendario: Date;
  setMesCalendario: (d: Date) => void;
  diaSelecionado: Date | null;
  setDiaSelecionado: (d: Date | null) => void;
  sessoes: TrainingSession[];
  onSessionClick: (s: TrainingSession) => void;
}) {
  const [progressos, setProgressos] = useState<Record<string, number>>({});
  const [exercisesPorSessao, setExercisesPorSessao] = useState<Record<string, TrainingSessionExercise[]>>({});
  const [loadingExercisesDia, setLoadingExercisesDia] = useState(false);
  const effectiveDia = diaSelecionado ?? new Date();

  useEffect(() => {
    const dayToUse = diaSelecionado ?? new Date();
    const ds = toLocalYYYYMMDD(dayToUse);
    const utc = dayToUse.toISOString().split('T')[0];
    const isToday = ds === toLocalYYYYMMDD(new Date());
    const sessoesDia = sessoes.filter(
      (s) => s.scheduledDate === ds || (isToday && s.scheduledDate === utc)
    );
    if (sessoesDia.length === 0) {
      setExercisesPorSessao({});
      setLoadingExercisesDia(false);
      return;
    }
    setLoadingExercisesDia(true);
    const load = async () => {
      const map: Record<string, TrainingSessionExercise[]> = {};
      for (const s of sessoesDia) {
        if (!s.id) continue;
        try {
          const ex = await trainingSessionService.getSessionExercises(s.id);
          map[s.id] = ex;
        } catch {
          map[s.id] = [];
        }
      }
      setExercisesPorSessao(map);
      setLoadingExercisesDia(false);
    };
    load();
  }, [diaSelecionado, sessoes]);

  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const hoje = new Date();

  useEffect(() => {
    const calc = async () => {
      const p: Record<string, number> = {};
      const ultimoDia = new Date(ano, mes + 1, 0).getDate();
      const todayLocal = toLocalYYYYMMDD(new Date());
      for (let d = 1; d <= ultimoDia; d++) {
        const data = new Date(ano, mes, d);
        const ds = toLocalYYYYMMDD(data);
        const utc = data.toISOString().split('T')[0];
        const isToday = ds === todayLocal;
        const sessoesDia = sessoes.filter(
          (s) => s.scheduledDate === ds || (isToday && s.scheduledDate === utc)
        );
        if (sessoesDia.length > 0) {
          let total = 0;
          let done = 0;
          for (const s of sessoesDia) {
            if (s.id) {
              try {
                const ex = await trainingSessionService.getSessionExercises(s.id);
                total += ex.length;
                done += ex.filter((e) => e.status === 'done').length;
              } catch {}
            }
          }
          p[ds] = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      }
      setProgressos(p);
    };
    calc();
  }, [sessoes, ano, mes]);

  const dias: (Date | null)[] = [];
  for (let i = 0; i < primeiro.getDay(); i++) dias.push(null);
  for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d));

  const mudarMes = (dir: 'anterior' | 'proximo') => {
    const n = new Date(mesCalendario);
    n.setMonth(mes + (dir === 'proximo' ? 1 : -1));
    setMesCalendario(n);
    setDiaSelecionado(null);
  };

  const getSessoesDia = (data: Date) => {
    const local = toLocalYYYYMMDD(data);
    const utc = data.toISOString().split('T')[0];
    const isToday = local === toLocalYYYYMMDD(new Date());
    return sessoes.filter(
      (s) => s.scheduledDate === local || (isToday && s.scheduledDate === utc)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => mudarMes('anterior')} className="rounded p-2 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold">{meses[mes]} {ano}</span>
        <button type="button" onClick={() => mudarMes('proximo')} className="rounded p-2 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {diasSemana.map((d) => (
            <div key={d} className="p-2 text-center text-sm font-semibold text-gray-700">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            const eHoje = dia && dia.getDate() === hoje.getDate() && dia.getMonth() === hoje.getMonth() && dia.getFullYear() === hoje.getFullYear();
            const sessoesDia = dia ? getSessoesDia(dia) : [];
            const prog = dia ? progressos[toLocalYYYYMMDD(dia)] : 0;
            let bg = 'hover:bg-gray-50';
            if (!dia) bg = 'bg-gray-50';
            else if (eHoje) bg = 'bg-blue-50 hover:bg-blue-100';
            else if (sessoesDia.length > 0) bg = 'bg-emerald-50 hover:bg-emerald-100';
            return (
              <div
                key={i}
                onClick={() => dia && setDiaSelecionado(dia)}
                className={`min-h-[5rem] cursor-pointer border border-gray-200 p-2 ${bg}`}
              >
                {dia && (
                  <>
                    <div className={`mb-1 text-sm font-medium ${eHoje ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                      {dia.getDate()}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {sessoesDia.length > 0 && (
                        <>
                          <div
                            onClick={(e) => { e.stopPropagation(); if (sessoesDia[0]) onSessionClick(sessoesDia[0]); }}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${
                              sessoesDia[0]?.status === 'done' ? 'bg-green-600' : sessoesDia[0]?.status === 'skipped' ? 'bg-red-600' : 'bg-gray-500'
                            }`}
                            title={sessoesDia.map((s) => s.title).join(', ')}
                          >
                            🏋️
                          </div>
                          {prog > 0 && (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                              title={`Progresso: ${prog}%`}
                            >
                              {prog}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Treinos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-gray-500">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button type="button" onClick={() => setDiaSelecionado(null)} className="rounded p-1 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {getSessoesDia(effectiveDia).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum treino neste dia.</p>
        ) : (
          <div className="space-y-3">
            {getSessoesDia(effectiveDia).map((s) => {
              const exs = s.id ? (exercisesPorSessao[s.id] ?? []) : [];
              return (
                <div key={s.id} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => onSessionClick(s)}
                    className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-600">
                        {s.status === 'done' ? 'Feito' : s.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                  <div className="border-t border-gray-200 bg-gray-50/50 px-3 py-2">
                    {loadingExercisesDia && exs.length === 0 ? (
                      <p className="text-xs text-gray-500">Carregando exercícios…</p>
                    ) : exs.length === 0 ? (
                      <p className="text-xs text-gray-500">Nenhum exercício</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {exs.map((ex, i) => (
                          <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                            <span
                              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                ex.status === 'done'
                                  ? 'bg-green-500 text-white'
                                  : ex.status === 'skipped'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}
                              title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                            >
                              {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                            </span>
                            <span className="text-gray-700 truncate">{translateExerciseName(ex.name)}</span>
                            {ex.prescription && (
                              <span className="text-xs text-gray-500 shrink-0">
                                {ex.prescription.sets}×{ex.prescription.reps}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarioSemana({
  semanaCalendario,
  setSemanaCalendario,
  diaSelecionado,
  setDiaSelecionado,
  sessoes,
  onSessionClick,
}: {
  semanaCalendario: Date;
  setSemanaCalendario: (d: Date) => void;
  diaSelecionado: Date | null;
  setDiaSelecionado: (d: Date | null) => void;
  sessoes: TrainingSession[];
  onSessionClick: (s: TrainingSession) => void;
}) {
  const [progressos, setProgressos] = useState<Record<string, number>>({});
  const [exercisesPorSessao, setExercisesPorSessao] = useState<Record<string, TrainingSessionExercise[]>>({});
  const [loadingExercisesDia, setLoadingExercisesDia] = useState(false);
  const effectiveDia = diaSelecionado ?? new Date();

  useEffect(() => {
    const dayToUse = diaSelecionado ?? new Date();
    const ds = toLocalYYYYMMDD(dayToUse);
    const utc = dayToUse.toISOString().split('T')[0];
    const isToday = ds === toLocalYYYYMMDD(new Date());
    const sessoesDia = sessoes.filter(
      (s) => s.scheduledDate === ds || (isToday && s.scheduledDate === utc)
    );
    if (sessoesDia.length === 0) {
      setExercisesPorSessao({});
      setLoadingExercisesDia(false);
      return;
    }
    setLoadingExercisesDia(true);
    const load = async () => {
      const map: Record<string, TrainingSessionExercise[]> = {};
      for (const s of sessoesDia) {
        if (!s.id) continue;
        try {
          const ex = await trainingSessionService.getSessionExercises(s.id);
          map[s.id] = ex;
        } catch {
          map[s.id] = [];
        }
      }
      setExercisesPorSessao(map);
      setLoadingExercisesDia(false);
    };
    load();
  }, [diaSelecionado, sessoes]);

  const inicio = new Date(semanaCalendario);
  inicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
  inicio.setHours(0, 0, 0, 0);
  const dias: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push(d);
  }
  const diasNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const hoje = new Date();

  useEffect(() => {
    const calc = async () => {
      const p: Record<string, number> = {};
      const inicio = new Date(semanaCalendario);
      inicio.setDate(semanaCalendario.getDate() - semanaCalendario.getDay());
      inicio.setHours(0, 0, 0, 0);
      const todayLocal = toLocalYYYYMMDD(new Date());
      for (let i = 0; i < 7; i++) {
        const dia = new Date(inicio);
        dia.setDate(inicio.getDate() + i);
        const ds = toLocalYYYYMMDD(dia);
        const utc = dia.toISOString().split('T')[0];
        const isToday = ds === todayLocal;
        const sessoesDia = sessoes.filter(
          (s) => s.scheduledDate === ds || (isToday && s.scheduledDate === utc)
        );
        if (sessoesDia.length > 0) {
          let total = 0;
          let done = 0;
          for (const s of sessoesDia) {
            if (s.id) {
              try {
                const ex = await trainingSessionService.getSessionExercises(s.id);
                total += ex.length;
                done += ex.filter((e) => e.status === 'done').length;
              } catch {}
            }
          }
          p[ds] = total > 0 ? Math.round((done / total) * 100) : 0;
        }
      }
      setProgressos(p);
    };
    calc();
  }, [sessoes, semanaCalendario]);

  const mudarSemana = (dir: 'anterior' | 'proximo') => {
    const n = new Date(semanaCalendario);
    n.setDate(semanaCalendario.getDate() + (dir === 'proximo' ? 7 : -7));
    setSemanaCalendario(n);
    setDiaSelecionado(null);
  };

  const getSessoesDia = (data: Date) => {
    const local = toLocalYYYYMMDD(data);
    const utc = data.toISOString().split('T')[0];
    const isToday = local === toLocalYYYYMMDD(new Date());
    return sessoes.filter(
      (s) => s.scheduledDate === local || (isToday && s.scheduledDate === utc)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => mudarSemana('anterior')} className="rounded p-2 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold">
          {dias[0].getDate()} – {dias[6].getDate()} de {meses[dias[0].getMonth()]} {dias[0].getFullYear()}
        </span>
        <button type="button" onClick={() => mudarSemana('proximo')} className="rounded p-2 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        {dias.map((dia, i) => {
          const eHoje = dia.getDate() === hoje.getDate() && dia.getMonth() === hoje.getMonth() && dia.getFullYear() === hoje.getFullYear();
          const sessoesDia = getSessoesDia(dia);
          const prog = progressos[toLocalYYYYMMDD(dia)] || 0;
          let bg = 'bg-white hover:bg-gray-50';
          if (eHoje) bg = 'bg-blue-50 hover:bg-blue-100';
          else if (sessoesDia.length > 0) bg = 'bg-emerald-50 hover:bg-emerald-100';
          return (
            <div
              key={i}
              onClick={() => setDiaSelecionado(dia)}
              className={`min-h-[7rem] cursor-pointer border-r border-gray-200 p-3 last:border-r-0 ${bg}`}
            >
              <div className={`mb-1 text-xs ${eHoje ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {diasNomes[i]}
              </div>
              <div className={`text-lg font-bold ${eHoje ? 'text-blue-600' : 'text-gray-900'}`}>{dia.getDate()}</div>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {sessoesDia.length > 0 && (
                  <>
                    <div
                      onClick={(e) => { e.stopPropagation(); if (sessoesDia[0]) onSessionClick(sessoesDia[0]); }}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs text-white ${
                        sessoesDia[0]?.status === 'done' ? 'bg-green-600' : sessoesDia[0]?.status === 'skipped' ? 'bg-red-600' : 'bg-gray-500'
                      }`}
                      title={sessoesDia.map((s) => s.title).join(', ')}
                    >
                      🏋️
                    </div>
                    {prog > 0 && (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                        title={`Progresso: ${prog}%`}
                      >
                        {prog}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Treinos em {effectiveDia.toLocaleDateString('pt-BR')}
            {!diaSelecionado && <span className="ml-1.5 text-sm font-normal text-gray-500">(hoje)</span>}
          </h3>
          {diaSelecionado && (
            <button type="button" onClick={() => setDiaSelecionado(null)} className="rounded p-1 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {getSessoesDia(effectiveDia).length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum treino neste dia.</p>
        ) : (
          <div className="space-y-3">
            {getSessoesDia(effectiveDia).map((s) => {
              const exs = s.id ? (exercisesPorSessao[s.id] ?? []) : [];
              return (
                <div key={s.id} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => onSessionClick(s)}
                    className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-600">
                        {s.status === 'done' ? 'Feito' : s.status === 'skipped' ? 'Pulou' : 'Agendado'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                  <div className="border-t border-gray-200 bg-gray-50/50 px-3 py-2">
                    {loadingExercisesDia && exs.length === 0 ? (
                      <p className="text-xs text-gray-500">Carregando exercícios…</p>
                    ) : exs.length === 0 ? (
                      <p className="text-xs text-gray-500">Nenhum exercício</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {exs.map((ex, i) => (
                          <li key={ex.exerciseId || i} className="flex items-center gap-2 text-sm">
                            <span
                              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                ex.status === 'done'
                                  ? 'bg-green-500 text-white'
                                  : ex.status === 'skipped'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}
                              title={ex.status === 'done' ? 'Feito' : ex.status === 'skipped' ? 'Pulou' : 'Não feito'}
                            >
                              {ex.status === 'done' ? '✓' : ex.status === 'skipped' ? '✗' : '—'}
                            </span>
                            <span className="text-gray-700 truncate">{translateExerciseName(ex.name)}</span>
                            {ex.prescription && (
                              <span className="text-xs text-gray-500 shrink-0">
                                {ex.prescription.sets}×{ex.prescription.reps}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

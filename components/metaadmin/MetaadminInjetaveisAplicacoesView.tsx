'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pill } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import { PacienteService } from '@/services/pacienteService';
import {
  chaveInjetavelCalendario,
  listarInjetaveisPlanejadosNoPeriodo,
  pacienteComInjetavelRealizado,
  type InjetavelPlanejadoItem,
} from '@/utils/injetaveisCalendario';

type Props = {
  paciente: PacienteCompleto;
  onPacienteAtualizado: (paciente: PacienteCompleto) => void;
  /** 'timeline' = calendário + cards (Evolução desktop); 'lista' = só cards (mobile). */
  variant?: 'timeline' | 'lista';
  /**
   * Se false, só exibe o status (paciente em /meta).
   * O check de aplicado fica exclusivo do médico.
   */
  allowToggle?: boolean;
};

function ymdKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MetaadminInjetaveisAplicacoesView({
  paciente,
  onPacienteAtualizado,
  variant = 'timeline',
  allowToggle = true,
}: Props) {
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const rangeAmplo = useMemo(() => {
    const inicio = new Date();
    inicio.setFullYear(inicio.getFullYear() - 2);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date();
    fim.setFullYear(fim.getFullYear() + 3);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim };
  }, []);

  const todasAplicacoes = useMemo(
    () => listarInjetaveisPlanejadosNoPeriodo(paciente, rangeAmplo.inicio, rangeAmplo.fim),
    [paciente, rangeAmplo]
  );

  const aplicacoesMes = useMemo(() => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const mesInicio = new Date(ano, mes, 1);
    const mesFim = new Date(ano, mes + 1, 0);
    mesFim.setHours(23, 59, 59, 999);
    return listarInjetaveisPlanejadosNoPeriodo(paciente, mesInicio, mesFim);
  }, [paciente, mesCalendario]);

  const listaOrdenada = useMemo(
    () => [...todasAplicacoes].sort((a, b) => b.data.getTime() - a.data.getTime()),
    [todasAplicacoes]
  );

  const toggleRealizado = async (item: InjetavelPlanejadoItem) => {
    if (!paciente.id) return;
    const key = chaveInjetavelCalendario(item);
    const novo = !item.realizado;
    setTogglingKey(key);
    try {
      const atualizado = pacienteComInjetavelRealizado(
        paciente,
        item.aplicacaoId,
        item.semana,
        novo
      );
      await PacienteService.createOrUpdatePaciente(atualizado);
      onPacienteAtualizado(atualizado);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingKey(null);
    }
  };

  const renderCard = (item: InjetavelPlanejadoItem) => {
    const key = chaveInjetavelCalendario(item);
    const nome =
      item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'Paciente';
    const busy = togglingKey === key;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataItem = new Date(item.data);
    dataItem.setHours(0, 0, 0, 0);
    const ehFutura = !item.realizado && dataItem.getTime() > hoje.getTime();
    const ehHoje = !item.realizado && dataItem.getTime() === hoje.getTime();

    return (
      <div
        key={key}
        className={`rounded-xl p-4 border-l-4 transition-all ${
          item.realizado
            ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
            : ehFutura || ehHoje
              ? 'border-orange-500 bg-orange-50/80 dark:bg-orange-900/15'
              : 'border-red-500 bg-red-50/80 dark:bg-red-900/15'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold truncate ${
                item.realizado
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {item.protocoloNome}
            </p>
            <p className="text-xs mt-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              Semana {item.semana} ·{' '}
              {item.data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </p>
            {variant === 'lista' && allowToggle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{nome}</p>
            )}
            {item.observacao ? (
              <p className="text-xs mt-1.5 text-gray-700 dark:text-gray-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-md px-2 py-1.5 whitespace-pre-wrap">
                {item.observacao}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Injetável
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200/60 dark:border-gray-700">
          <span
            className={`text-xs font-medium ${
              item.realizado
                ? 'text-green-700 dark:text-green-400'
                : ehFutura || ehHoje
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-red-700 dark:text-red-300'
            }`}
          >
            {item.realizado
              ? 'Aplicado'
              : ehHoje
                ? 'Hoje'
                : ehFutura
                  ? 'Futura'
                  : 'Pendente'}
          </span>
          {allowToggle ? (
            <button
              type="button"
              role="switch"
              aria-checked={!!item.realizado}
              disabled={busy}
              onClick={() => void toggleRealizado(item)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                item.realizado
                  ? 'bg-green-500 focus:ring-green-500'
                  : 'bg-gray-500 dark:bg-gray-400 focus:ring-green-500'
              }`}
              title={item.realizado ? 'Marcar como pendente' : 'Marcar como aplicado'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  item.realizado ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          ) : (
            <span
              className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
                item.realizado
                  ? 'bg-green-600 text-white'
                  : ehHoje || ehFutura
                    ? 'bg-orange-500 text-white'
                    : 'bg-red-600 text-white'
              }`}
            >
              {item.realizado
                ? '✓ Aplicado'
                : ehHoje
                  ? 'Hoje'
                  : ehFutura
                    ? 'Futura'
                    : 'Pendente'}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (todasAplicacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800/30 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 mb-4">
          <Pill className="h-7 w-7" aria-hidden />
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Nenhuma aplicação de injetável
        </p>
        <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
          {allowToggle
            ? 'Configure os protocolos na aba Plano Terapêutico → Injetáveis para ver o calendário e as aplicações aqui.'
            : 'Quando o seu médico configurar os protocolos injetáveis, o cronograma aparecerá aqui.'}
        </p>
      </div>
    );
  }

  if (variant === 'lista') {
    return <div className="space-y-3">{listaOrdenada.map(renderCard)}</div>;
  }

  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();
  const diaSemanaAjustado = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
  const diasCalendario: (number | null)[] = [];
  for (let i = 0; i < diaSemanaAjustado; i++) diasCalendario.push(null);
  for (let d = 1; d <= diasNoMes; d++) diasCalendario.push(d);

  const infoPorData = new Map<string, InjetavelPlanejadoItem[]>();
  for (const item of aplicacoesMes) {
    const key = ymdKey(item.data);
    const list = infoPorData.get(key) || [];
    list.push(item);
    infoPorData.set(key, list);
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">Aplicações de injetáveis</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {todasAplicacoes.filter((a) => a.realizado).length}/{todasAplicacoes.length} aplicadas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {mesCalendario.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h5>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1))
                }
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                type="button"
                onClick={() => setMesCalendario(new Date())}
                className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() =>
                  setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1))
                }
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1 flex-shrink-0">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-gray-700 dark:text-gray-300 py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
            {diasCalendario.map((dia, idx) => {
              if (dia === null) return <div key={idx} />;
              const keyDia = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const itens = infoPorData.get(keyDia) || [];
              const dataDia = new Date(ano, mes, dia);
              dataDia.setHours(0, 0, 0, 0);
              const todosAplicados = itens.length > 0 && itens.every((i) => i.realizado);
              const algumPendente = itens.some((i) => !i.realizado);
              const futuro = dataDia.getTime() > hoje.getTime();

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-start gap-0.5 min-h-[3rem]"
                >
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{dia}</span>
                  {itens.length > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                        todosAplicados
                          ? 'bg-green-500 text-white'
                          : futuro
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                            : algumPendente
                              ? 'bg-orange-500 text-white'
                              : 'bg-emerald-500 text-white'
                      }`}
                      title={itens.map((i) => i.protocoloNome).join(', ')}
                    >
                      {itens.length > 1 ? `${itens.length} inj.` : 'Inj.'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {listaOrdenada.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma aplicação planejada.</p>
          ) : (
            listaOrdenada.map(renderCard)
          )}
        </div>
      </div>
    </div>
  );
}

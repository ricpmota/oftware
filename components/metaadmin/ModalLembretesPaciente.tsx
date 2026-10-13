'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  List,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import ModalNovoLembrete, { type ModalNovoLembreteInitialValues } from '@/components/metaadmin/ModalNovoLembrete';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import { getLembreteTagConfig, type LembreteTag } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';
import type { LembretesMutation } from '@/lib/metaadmin/lembretesMutation';
import {
  agruparRecorrencias,
  formatYmd,
  formatDdMmYy,
  formatarIntervaloRecorrencia,
  gerarDatasRecorrencia,
  LEMBRETE_RECORRENCIA_PRESETS,
  type LembreteRecorrenciaUnidade,
} from '@/lib/lembrete/lembreteRecorrencia';
import DataDdMmYyInput from '@/components/metaadmin/DataDdMmYyInput';

type PastaLembretes = 'calendario' | 'historico' | 'recorrente';

type Props = {
  pacienteNome: string;
  pacienteId: string;
  lembretes: Lembrete[];
  pacientes: PacienteCompleto[];
  medicoId?: string;
  nutricionistaId?: string;
  audience?: 'medico' | 'nutricionista' | 'personal';
  tags?: LembreteTag[];
  isDark?: boolean;
  draftForNew?: ModalNovoLembreteInitialValues;
  defaultTelefoneAviso?: string;
  defaultTelefoneAvisoDdi?: string;
  defaultTelefoneAvisoPais?: string;
  onFechar: () => void;
  onMutate?: (mutation: LembretesMutation) => void;
};

function formatLembreteData(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function sortLembretes(items: Lembrete[]): Lembrete[] {
  return [...items].sort((a, b) => {
    const aDone = a.concluido ? 1 : 0;
    const bDone = b.concluido ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (!a.concluido && !b.concluido) return a.data.localeCompare(b.data);
    return b.data.localeCompare(a.data);
  });
}

function LembreteConcluidoSwitch({
  concluido,
  isDark,
  onToggle,
}: {
  concluido: boolean;
  isDark?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={concluido}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        concluido
          ? isDark
            ? 'bg-[#4CCB7A] focus:ring-[#4CCB7A]'
            : 'bg-green-500 focus:ring-green-500'
          : isDark
            ? 'bg-slate-500 focus:ring-[#4CCB7A]'
            : 'bg-gray-500 dark:bg-gray-400 focus:ring-green-500'
      }`}
      title={concluido ? 'Marcar como pendente' : 'Marcar como realizado'}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          concluido ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ModalLembretesPaciente({
  pacienteNome,
  pacienteId,
  lembretes,
  pacientes,
  medicoId,
  nutricionistaId,
  audience = 'medico',
  tags,
  isDark,
  draftForNew,
  defaultTelefoneAviso,
  defaultTelefoneAvisoDdi,
  defaultTelefoneAvisoPais,
  onFechar,
  onMutate,
}: Props) {
  const [pasta, setPasta] = useState<PastaLembretes>('historico');
  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<ModalNovoLembreteInitialValues | undefined>();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState(() => formatYmd(new Date()));

  const sorted = useMemo(() => sortLembretes(lembretes), [lembretes]);
  const pendentes = lembretes.filter((l) => !l.concluido).length;
  const hojeYmd = formatYmd(new Date());
  const lembretesDoDia = useMemo(
    () => sortLembretes(lembretes.filter((l) => l.data === diaSelecionado)),
    [lembretes, diaSelecionado]
  );
  const diasComLembrete = useMemo(() => {
    const map = new Map<string, { total: number; pendentes: number }>();
    for (const item of lembretes) {
      const cur = map.get(item.data) ?? { total: 0, pendentes: 0 };
      cur.total += 1;
      if (!item.concluido) cur.pendentes += 1;
      map.set(item.data, cur);
    }
    return map;
  }, [lembretes]);

  const d = isDark;
  const bgOverlay = 'bg-black/50';
  const bgModal = d ? 'bg-[#0A1F44] border-white/15' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const textPrimary = d ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white';
  const textSecondary = d ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400';
  const btnPrimary = d
    ? 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#4CCB7A]/90'
    : 'bg-green-600 text-white hover:bg-green-700';
  const borderCls = d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const abrirNovo = (dataPrefill?: string) => {
    const now = new Date();
    const ymd =
      dataPrefill ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setEditandoId(null);
    setFormInitial({
      ...draftForNew,
      pacienteId,
      pacienteNome,
      data: ymd,
    });
    setFormOpen(true);
  };

  const abrirEditar = (lembrete: Lembrete) => {
    setEditandoId(lembrete.id);
    setFormInitial({
      data: lembrete.data,
      horario: lembrete.horario,
      avisoWhatsApp: lembrete.avisoWhatsApp,
      telefoneAviso: lembrete.telefoneAviso,
      telefoneAvisoDdi: lembrete.telefoneAvisoDdi,
      telefoneAvisoPais: lembrete.telefoneAvisoPais,
      notificarPaciente: lembrete.notificarPaciente,
      pacienteId: lembrete.pacienteId,
      pacienteNome: lembrete.pacienteNome,
      texto: lembrete.texto,
      tag: lembrete.tag,
    });
    setFormOpen(true);
  };

  const fecharForm = () => {
    setFormOpen(false);
    setEditandoId(null);
    setFormInitial(undefined);
  };

  const toggleConcluido = async (lembrete: Lembrete) => {
    try {
      const novo = !lembrete.concluido;
      await LembreteService.toggleConcluido(lembrete.id, novo);
      onMutate?.({ op: 'update', id: lembrete.id, patch: { concluido: novo } });
    } catch (err) {
      console.error(err);
    }
  };

  const renderLembreteCard = (lembrete: Lembrete) => {
    const tagCfg = getLembreteTagConfig(lembrete.tag);
    return (
      <div
        key={lembrete.id}
        className={
          d
            ? `rounded-xl p-3 border-2 border-[#2F8FA3] border-l-4 bg-[#0A1F44] ${lembrete.concluido ? 'border-l-[#4CCB7A] opacity-75' : 'border-l-orange-400'}`
            : `rounded-xl p-3 border-l-4 ${lembrete.concluido ? 'border-green-500 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10 opacity-75' : 'border-orange-400 dark:border-orange-500 bg-orange-50/80 dark:bg-orange-900/15'}`
        }
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${d ? 'text-[#E8EDED]/60' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatLembreteData(lembrete.data)}
              {lembrete.horario ? ` · ${lembrete.horario}` : ''}
            </p>
            <p
              className={`text-sm mt-1 ${
                lembrete.concluido
                  ? d
                    ? 'text-[#E8EDED]/50 line-through'
                    : 'text-gray-400 line-through'
                  : d
                    ? 'text-[#E8EDED]/80'
                    : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {lembrete.texto}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${d ? tagCfg.bgDark + ' ' + tagCfg.textDark : tagCfg.bgLight + ' ' + tagCfg.textLight}`}
            >
              {lembrete.tag}
            </span>
            <button
              type="button"
              onClick={() => abrirEditar(lembrete)}
              className={`p-1 rounded transition-colors ${d ? 'text-[#E8EDED]/40 hover:text-[#4CCB7A] hover:bg-white/10' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
              title="Editar lembrete"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Deletar este lembrete?')) return;
                try {
                  await LembreteService.deletarLembrete(lembrete.id);
                  onMutate?.({ op: 'remove', id: lembrete.id });
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`p-1 rounded transition-colors ${d ? 'text-[#E8EDED]/40 hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
              title="Deletar lembrete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className={`flex items-center justify-between pt-2 border-t ${d ? 'border-white/10' : 'border-gray-200/60 dark:border-gray-700'}`}>
          <span
            className={`text-xs font-medium ${
              lembrete.concluido
                ? d
                  ? 'text-[#4CCB7A]'
                  : 'text-green-600 dark:text-green-400'
                : d
                  ? 'text-[#E8EDED]/50'
                  : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {lembrete.concluido ? 'Realizado' : 'Pendente'}
          </span>
          <LembreteConcluidoSwitch
            concluido={!!lembrete.concluido}
            isDark={d}
            onToggle={() => void toggleConcluido(lembrete)}
          />
        </div>
      </div>
    );
  };

  const pastas: Array<{ id: PastaLembretes; nome: string; Icon: typeof CalendarDays }> = [
    { id: 'calendario', nome: 'Calendário', Icon: CalendarDays },
    { id: 'historico', nome: 'Histórico', Icon: List },
    { id: 'recorrente', nome: 'Recorrente', Icon: Repeat },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-[99998] flex items-stretch justify-center p-0 lg:items-center lg:p-4 ${bgOverlay}`}
        onClick={onFechar}
      >
        <div
          className={`flex h-dvh w-full max-h-dvh flex-col rounded-none border-0 shadow-none lg:h-auto lg:max-h-[90vh] lg:w-full lg:max-w-2xl lg:rounded-xl lg:border lg:shadow-2xl ${bgModal}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 lg:px-5 lg:py-4 ${borderCls}`}
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${d ? 'bg-[#2F8FA3] text-[#E8EDED]' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}
              >
                <Bell className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className={`text-lg font-semibold truncate ${textPrimary}`}>Lembretes</h3>
                <p className={`text-xs truncate ${textSecondary}`}>{pacienteNome}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFechar}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${d ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`flex border-b ${borderCls}`}>
            {pastas.map(({ id, nome, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPasta(id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition-colors lg:text-sm ${
                  pasta === id
                    ? d
                      ? 'bg-white/10 text-[#4CCB7A] border-b-2 border-[#4CCB7A]'
                      : 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-500'
                    : d
                      ? 'text-[#E8EDED]/60 hover:bg-white/5'
                      : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" />
                {nome}
              </button>
            ))}
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-3 lg:px-5"
            style={
              pasta === 'recorrente'
                ? { paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }
                : undefined
            }
          >
            {pasta === 'calendario' ? (
              <CalendarioLembretes
                isDark={!!d}
                viewMonth={viewMonth}
                onPrevMonth={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                onNextMonth={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                diaSelecionado={diaSelecionado}
                onSelectDia={setDiaSelecionado}
                hojeYmd={hojeYmd}
                diasComLembrete={diasComLembrete}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            ) : null}

            {pasta === 'calendario' ? (
              <div className="mt-3 space-y-3">
                {lembretesDoDia.length === 0 ? (
                  <p className={`text-sm text-center py-4 ${textSecondary}`}>
                    Nenhum lembrete em {formatLembreteData(diaSelecionado)}.
                  </p>
                ) : (
                  lembretesDoDia.map(renderLembreteCard)
                )}
              </div>
            ) : null}

            {pasta === 'historico' ? (
              <div className="space-y-3">
                {sorted.length === 0 ? (
                  <p className={`text-sm text-center py-8 ${textSecondary}`}>
                    Nenhum lembrete registrado para este paciente.
                  </p>
                ) : (
                  sorted.map(renderLembreteCard)
                )}
              </div>
            ) : null}

            {pasta === 'recorrente' ? (
              <RecorrentePanel
                isDark={!!d}
                lembretes={lembretes}
                pacienteId={pacienteId}
                pacienteNome={pacienteNome}
                medicoId={medicoId}
                nutricionistaId={nutricionistaId}
                tags={tags}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                btnPrimary={btnPrimary}
                borderCls={borderCls}
                onMutate={onMutate}
              />
            ) : null}
          </div>

          {pasta !== 'recorrente' ? (
            <div
              className={`flex items-center justify-between gap-3 border-t px-4 py-3 lg:px-5 lg:py-4 ${borderCls}`}
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              {pendentes > 0 ? (
                <span className={`text-xs ${textSecondary}`}>
                  {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className={`text-xs ${textSecondary}`}>Todos concluídos</span>
              )}
              <button
                type="button"
                onClick={() => abrirNovo(pasta === 'calendario' ? diaSelecionado : undefined)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${btnPrimary}`}
              >
                <Plus className="w-4 h-4" />
                Novo lembrete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {formOpen && (
        <ModalNovoLembrete
          key={editandoId ?? 'novo'}
          pacientes={pacientes}
          isDark={isDark}
          elevatedZIndex
          tags={tags}
          audience={audience}
          lembreteId={editandoId ?? undefined}
          initialValues={formInitial}
          defaultTelefoneAviso={defaultTelefoneAviso}
          defaultTelefoneAvisoDdi={defaultTelefoneAvisoDdi}
          defaultTelefoneAvisoPais={defaultTelefoneAvisoPais}
          onFechar={fecharForm}
          onSalvar={async (dados) => {
            if (editandoId) {
              await LembreteService.atualizarLembrete(editandoId, {
                pacienteId: dados.pacienteId,
                pacienteNome: dados.pacienteNome,
                data: dados.data,
                horario: dados.horario,
                avisoWhatsApp: dados.avisoWhatsApp,
                telefoneAviso: dados.telefoneAviso,
                telefoneAvisoDdi: dados.telefoneAvisoDdi,
                telefoneAvisoPais: dados.telefoneAvisoPais,
                notificarPaciente: dados.notificarPaciente,
                texto: dados.texto,
                tag: dados.tag,
              });
              onMutate?.({
                op: 'update',
                id: editandoId,
                patch: {
                  pacienteId: dados.pacienteId,
                  pacienteNome: dados.pacienteNome,
                  data: dados.data,
                  horario: dados.horario,
                  avisoWhatsApp: dados.avisoWhatsApp,
                  telefoneAviso: dados.telefoneAviso,
                telefoneAvisoDdi: dados.telefoneAvisoDdi,
                telefoneAvisoPais: dados.telefoneAvisoPais,
                  notificarPaciente: dados.notificarPaciente,
                  texto: dados.texto,
                  tag: dados.tag,
                },
              });
            } else {
              const novoId = await LembreteService.criarLembrete({
                medicoId,
                nutricionistaId,
                pacienteId: dados.pacienteId,
                pacienteNome: dados.pacienteNome,
                data: dados.data,
                horario: dados.horario,
                avisoWhatsApp: dados.avisoWhatsApp,
                telefoneAviso: dados.telefoneAviso,
                telefoneAvisoDdi: dados.telefoneAvisoDdi,
                telefoneAvisoPais: dados.telefoneAvisoPais,
                notificarPaciente: dados.notificarPaciente,
                texto: dados.texto,
                tag: dados.tag,
                concluido: false,
              });
              onMutate?.({
                op: 'add',
                lembrete: {
                  id: novoId,
                  medicoId,
                  nutricionistaId,
                  pacienteId: dados.pacienteId,
                  pacienteNome: dados.pacienteNome,
                  data: dados.data,
                  horario: dados.horario,
                  avisoWhatsApp: dados.avisoWhatsApp,
                  telefoneAviso: dados.telefoneAviso,
                telefoneAvisoDdi: dados.telefoneAvisoDdi,
                telefoneAvisoPais: dados.telefoneAvisoPais,
                  notificarPaciente: dados.notificarPaciente,
                  texto: dados.texto,
                  tag: dados.tag,
                  concluido: false,
                  criadoEm: new Date(),
                },
              });
            }
            fecharForm();
          }}
        />
      )}
    </>
  );
}

function CalendarioLembretes({
  isDark,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  diaSelecionado,
  onSelectDia,
  hojeYmd,
  diasComLembrete,
  textPrimary,
  textSecondary,
}: {
  isDark: boolean;
  viewMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  diaSelecionado: string;
  onSelectDia: (ymd: string) => void;
  hojeYmd: string;
  diasComLembrete: Map<string, { total: number; pendentes: number }>;
  textPrimary: string;
  textSecondary: string;
}) {
  const year = viewMonth.getFullYear();
  const monthIndex = viewMonth.getMonth();
  const label = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= lastDate; day++) {
    cells.push(formatYmd(new Date(year, monthIndex, day)));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-500'}`}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className={`text-sm font-semibold capitalize ${textPrimary}`}>{label}</p>
        <button
          type="button"
          onClick={onNextMonth}
          className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-500'}`}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className={`mb-1 grid grid-cols-7 text-center text-[10px] font-semibold ${textSecondary}`}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`empty-${i}`} className="h-9" />;
          const day = Number(ymd.slice(-2));
          const info = diasComLembrete.get(ymd);
          const selected = ymd === diaSelecionado;
          const isToday = ymd === hojeYmd;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelectDia(ymd)}
              className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-xs font-medium ${
                selected
                  ? isDark
                    ? 'bg-[#4CCB7A] text-[#0A1F44]'
                    : 'bg-emerald-600 text-white'
                  : isToday
                    ? isDark
                      ? 'bg-white/10 text-[#E8EDED]'
                      : 'bg-emerald-50 text-emerald-800'
                    : isDark
                      ? 'text-[#E8EDED]/80 hover:bg-white/5'
                      : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {day}
              {info ? (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    selected
                      ? 'bg-white'
                      : info.pendentes > 0
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecorrentePanel({
  isDark,
  lembretes,
  pacienteId,
  pacienteNome,
  medicoId,
  nutricionistaId,
  tags,
  textPrimary,
  textSecondary,
  btnPrimary,
  borderCls,
  onMutate,
}: {
  isDark: boolean;
  lembretes: Lembrete[];
  pacienteId: string;
  pacienteNome: string;
  medicoId?: string;
  nutricionistaId?: string;
  tags?: LembreteTag[];
  textPrimary: string;
  textSecondary: string;
  btnPrimary: string;
  borderCls: string;
  onMutate?: (mutation: LembretesMutation) => void;
}) {
  const tagsDisponiveis = tags && tags.length > 0 ? tags : (['Exames', 'Consulta', 'Envio'] as LembreteTag[]);
  const presets = LEMBRETE_RECORRENCIA_PRESETS.filter((p) => tagsDisponiveis.includes(p.tag));
  const grupos = useMemo(() => agruparRecorrencias(lembretes), [lembretes]);

  const [formAberto, setFormAberto] = useState(false);
  const [presetId, setPresetId] = useState<string>(presets[0]?.id ?? 'custom');
  const [texto, setTexto] = useState(presets[0]?.texto ?? '');
  const [tag, setTag] = useState<LembreteTag>(presets[0]?.tag ?? tagsDisponiveis[0] ?? 'Consulta');
  const [intervalo, setIntervalo] = useState(presets[0]?.intervalo ?? 3);
  const [unidade, setUnidade] = useState<LembreteRecorrenciaUnidade>(presets[0]?.unidade ?? 'meses');
  const [dataInicio, setDataInicio] = useState(formatYmd(new Date()));
  const [horario, setHorario] = useState('');
  const [terminoTipo, setTerminoTipo] = useState<'quantidade' | 'data'>('quantidade');
  const [quantidade, setQuantidade] = useState(3);
  const [dataFinal, setDataFinal] = useState('');
  const [salvando, setSalvando] = useState(false);

  const datasPreview = gerarDatasRecorrencia({
    dataInicio,
    intervalo,
    unidade,
    quantidade: terminoTipo === 'quantidade' ? quantidade : undefined,
    dataFinal: terminoTipo === 'data' ? dataFinal : undefined,
  });
  const terminoValido = datasPreview.length > 0;

  const aplicarPreset = (id: string) => {
    setPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setTexto(preset.texto);
    setTag(preset.tag);
    setIntervalo(preset.intervalo);
    setUnidade(preset.unidade);
  };

  const criar = async () => {
    if (!texto.trim() || intervalo < 1 || !terminoValido) return;
    setSalvando(true);
    try {
      const criados = await LembreteService.criarSerieRecorrente({
        medicoId,
        nutricionistaId,
        pacienteId,
        pacienteNome,
        texto: texto.trim(),
        tag,
        dataInicio,
        horario: horario || undefined,
        intervalo,
        unidade,
        quantidade: terminoTipo === 'quantidade' ? quantidade : undefined,
        dataFinal: terminoTipo === 'data' ? dataFinal : undefined,
      });
      onMutate?.({ op: 'addMany', lembretes: criados });
      setFormAberto(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3">
      {grupos.length === 0 && !formAberto ? (
        <p className={`text-sm text-center py-4 ${textSecondary}`}>
          Nenhuma recorrência. Crie avisos periódicos de exames, consultas ou envio de medicamentos.
        </p>
      ) : (
        grupos.map((grupo) => {
          const tagCfg = getLembreteTagConfig(grupo.tag);
          return (
            <div
              key={grupo.recorrenciaId}
              className={
                isDark
                  ? 'rounded-xl border border-white/10 p-3'
                  : 'rounded-xl border border-gray-200 p-3 bg-slate-50/80'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${textPrimary}`}>{grupo.texto}</p>
                  <p className={`mt-0.5 text-xs ${textSecondary}`}>
                    {formatarIntervaloRecorrencia(grupo.intervalo, grupo.unidade)}
                    {grupo.quantidade
                      ? ` · ${grupo.quantidade}x`
                      : grupo.dataFinal
                        ? ` · até ${formatDdMmYy(grupo.dataFinal)}`
                        : ''}
                    {grupo.proximaData ? ` · próximo ${formatLembreteData(grupo.proximaData)}` : ''}
                  </p>
                  <p className={`mt-1 text-[11px] ${textSecondary}`}>
                    {grupo.pendentes} pendente{grupo.pendentes !== 1 ? 's' : ''} · {grupo.total} aviso
                    {grupo.total !== 1 ? 's' : ''} gerados
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? tagCfg.bgDark + ' ' + tagCfg.textDark : tagCfg.bgLight + ' ' + tagCfg.textLight}`}
                  >
                    {grupo.tag}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          'Excluir esta recorrência e os avisos futuros pendentes? Avisos já realizados são mantidos.'
                        )
                      ) {
                        return;
                      }
                      const ids =
                        grupo.idsPendentesFuturos.length > 0
                          ? grupo.idsPendentesFuturos
                          : lembretes.filter((l) => l.recorrenciaId === grupo.recorrenciaId && !l.concluido).map((l) => l.id);
                      try {
                        await LembreteService.deletarLembretes(ids);
                        onMutate?.({ op: 'removeMany', ids });
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`p-1 rounded ${isDark ? 'text-[#E8EDED]/40 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    title="Excluir recorrência"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {formAberto ? (
        <div className={`rounded-xl border p-3 space-y-3 ${borderCls}`}>
          {presets.length > 0 ? (
            <div className="space-y-1.5">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${textSecondary}`}>
                Modelos
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => aplicarPreset(preset.id)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${
                      presetId === preset.id
                        ? isDark
                          ? 'bg-[#4CCB7A]/20 ring-1 ring-[#4CCB7A] text-[#E8EDED]'
                          : 'bg-emerald-50 ring-1 ring-emerald-500 text-emerald-900'
                        : isDark
                          ? 'bg-white/5 text-[#E8EDED]/80'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200'
                    }`}
                  >
                    <span className="font-semibold">{preset.label}</span>
                    <span className={`ml-1.5 text-xs ${textSecondary}`}>{preset.detalhe}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPresetId('custom')}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    presetId === 'custom'
                      ? isDark
                        ? 'bg-[#4CCB7A]/20 ring-1 ring-[#4CCB7A] text-[#E8EDED]'
                        : 'bg-emerald-50 ring-1 ring-emerald-500 text-emerald-900'
                      : isDark
                        ? 'bg-white/5 text-[#E8EDED]/80'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200'
                  }`}
                >
                  Personalizado
                </button>
              </div>
            </div>
          ) : null}

          <label className={`block text-xs font-medium ${textSecondary}`}>
            Texto
            <input
              value={texto}
              onChange={(e) => {
                setPresetId('custom');
                setTexto(e.target.value);
              }}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className={`block text-xs font-medium ${textSecondary}`}>
              Tipo
              <select
                value={tag}
                onChange={(e) => {
                  setPresetId('custom');
                  setTag(e.target.value as LembreteTag);
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
              >
                {tagsDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={`block text-xs font-medium ${textSecondary}`}>
              Início
              <div className="mt-1">
                <DataDdMmYyInput
                  value={dataInicio}
                  onChange={setDataInicio}
                  isDark={isDark}
                  ariaLabel="Data de início"
                />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className={`block text-xs font-medium ${textSecondary}`}>
              A cada
              <input
                type="number"
                min={1}
                max={24}
                value={intervalo}
                onChange={(e) => {
                  setPresetId('custom');
                  setIntervalo(Math.max(1, Number(e.target.value) || 1));
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
              />
            </label>
            <label className={`block text-xs font-medium ${textSecondary}`}>
              Unidade
              <select
                value={unidade}
                onChange={(e) => {
                  setPresetId('custom');
                  setUnidade(e.target.value as LembreteRecorrenciaUnidade);
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
              >
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
            </label>
            <label className={`block text-xs font-medium ${textSecondary}`}>
              Horário
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
              />
            </label>
          </div>

          <div>
            <p className={`mb-1.5 text-xs font-medium ${textSecondary}`}>Termina</p>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTerminoTipo('quantidade')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  terminoTipo === 'quantidade'
                    ? isDark
                      ? 'bg-[#4CCB7A]/20 ring-1 ring-[#4CCB7A] text-[#E8EDED]'
                      : 'bg-emerald-50 ring-1 ring-emerald-500 text-emerald-900'
                    : isDark
                      ? 'bg-white/5 text-[#E8EDED]/70'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200'
                }`}
              >
                Por vezes
              </button>
              <button
                type="button"
                onClick={() => setTerminoTipo('data')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  terminoTipo === 'data'
                    ? isDark
                      ? 'bg-[#4CCB7A]/20 ring-1 ring-[#4CCB7A] text-[#E8EDED]'
                      : 'bg-emerald-50 ring-1 ring-emerald-500 text-emerald-900'
                    : isDark
                      ? 'bg-white/5 text-[#E8EDED]/70'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200'
                }`}
              >
                Até a data
              </button>
            </div>
            {terminoTipo === 'quantidade' ? (
              <label className={`flex items-center gap-2 text-xs font-medium ${textSecondary}`}>
                Recorrente por
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Math.min(48, Number(e.target.value) || 1)))}
                  className={`w-16 rounded-lg border px-2 py-2 text-center text-sm ${isDark ? 'bg-[#0A1F44] border-white/15 text-[#E8EDED]' : 'border-gray-200 bg-white text-gray-900'}`}
                />
                vezes
              </label>
            ) : (
              <label className={`flex items-center gap-2 text-xs font-medium ${textSecondary}`}>
                Até
                <DataDdMmYyInput
                  value={dataFinal}
                  onChange={setDataFinal}
                  isDark={isDark}
                  ariaLabel="Data final"
                />
              </label>
            )}
            <p className={`mt-1.5 text-[11px] ${textSecondary}`}>
              {terminoValido
                ? `${datasPreview.length} aviso${datasPreview.length !== 1 ? 's' : ''} serão criados.`
                : 'Informe o prazo final (quantidade ou data).'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'text-[#E8EDED]/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando || !texto.trim() || !terminoValido}
              onClick={() => void criar()}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${btnPrimary}`}
            >
              {salvando ? 'Criando...' : 'Criar recorrência'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFormAberto(true)}
          className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold ${btnPrimary}`}
        >
          <Repeat className="h-4 w-4" />
          Nova recorrência
        </button>
      )}
    </div>
  );
}

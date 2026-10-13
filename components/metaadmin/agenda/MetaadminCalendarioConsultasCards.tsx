'use client';

import { useCallback, useState } from 'react';
import { Edit, FileText, Trash2, Video } from 'lucide-react';
import EditarConsultaCalendarioModal from '@/components/profissional/EditarConsultaCalendarioModal';
import { useConfirmarApagarConsulta } from '@/components/profissional/ConfirmarApagarConsultaModal';
import ConfirmarObservacaoProntuarioModal from '@/components/profissional/ConfirmarObservacaoProntuarioModal';
import CalendarioPacienteAuthAvatar from '@/components/metaadmin/CalendarioPacienteAuthAvatar';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';
import { medicoAgendaAuthFetch } from '@/lib/metaadmin/agenda/medicoAgendaAuthFetch';
import { consultasOnDate } from '@/lib/metaadmin/agenda/consultasCalendario';
import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';

type Props = {
  consultas: ConsultaCalendarioItem[];
  date: Date | null;
  isMobile?: boolean;
  isDark?: boolean;
  hideHeading?: boolean;
  onReload: () => void | Promise<void>;
  onOpenProntuario?: (pacienteId: string) => void | Promise<void>;
  onOpenPaciente?: (pacienteId: string) => void | Promise<void>;
  onMensagemConsulta?: (consulta: ConsultaCalendarioItem) => void;
  temTelefonePaciente?: (pacienteId: string) => boolean;
  photoUrlByPacienteId?: Record<string, string | null>;
};

function nomeExibicaoCardMobile(nome: string): string {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  const partes = limpo.split(' ').filter(Boolean);
  if (partes.length <= 2 || limpo.length <= 18) return limpo;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

async function postConsultaUpdate(body: Record<string, unknown>) {
  const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/meetings/update', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'Falha ao atualizar a consulta.');
}

export default function MetaadminCalendarioConsultasCards({
  consultas,
  date,
  isMobile,
  isDark,
  hideHeading,
  onReload,
  onOpenProntuario,
  onOpenPaciente,
  onMensagemConsulta,
  temTelefonePaciente,
  photoUrlByPacienteId,
}: Props) {
  const consultasDia = date ? consultasOnDate(consultas, date) : [];
  const [editingConsulta, setEditingConsulta] = useState<ConsultaCalendarioItem | null>(null);
  const [consultaProntuarioPendente, setConsultaProntuarioPendente] =
    useState<ConsultaCalendarioItem | null>(null);
  const { confirmarApagarConsulta, confirmarApagarConsultaModal } = useConfirmarApagarConsulta();
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [consultaEditError, setConsultaEditError] = useState<string | null>(null);

  const abrirProntuario = useCallback(
    async (consulta: ConsultaCalendarioItem) => {
      const pacienteId = consulta.pacienteId?.trim();
      if (pacienteId && onOpenProntuario) {
        try {
          await onOpenProntuario(pacienteId);
        } catch (error) {
          setConsultaEditError(
            error instanceof Error ? error.message : 'Não foi possível abrir o prontuário.'
          );
        }
        return;
      }
      if (pacienteId && onOpenPaciente) {
        onOpenPaciente(pacienteId);
        return;
      }
      setConsultaEditError('Paciente da consulta não encontrado para abrir o prontuário.');
    },
    [onOpenPaciente, onOpenProntuario]
  );

  const abrirPaciente = useCallback(
    (consulta: ConsultaCalendarioItem) => {
      const pacienteId = consulta.pacienteId?.trim();
      if (pacienteId && onOpenPaciente) {
        void onOpenPaciente(pacienteId);
        return;
      }
      setConsultaEditError('Paciente da consulta não encontrado.');
    },
    [onOpenPaciente]
  );

  const handleSaveConsulta = useCallback(
    async (input: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      observacoes: string;
    }) => {
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await postConsultaUpdate(input);
        setEditingConsulta(null);
        await onReload();
      } catch (error) {
        setConsultaEditError(error instanceof Error ? error.message : 'Falha ao salvar consulta.');
      } finally {
        setSavingConsulta(false);
      }
    },
    [onReload]
  );

  const handleDeleteConsulta = useCallback(
    async (id: string) => {
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await postConsultaUpdate({ id, delete: true });
        setEditingConsulta(null);
        await onReload();
      } catch (error) {
        setConsultaEditError(error instanceof Error ? error.message : 'Falha ao apagar consulta.');
      } finally {
        setSavingConsulta(false);
      }
    },
    [onReload]
  );

  const handleToggleConsultaRealizada = useCallback(
    async (consulta: ConsultaCalendarioItem) => {
      const next = !consulta.realizada;
      setSavingConsulta(true);
      setConsultaEditError(null);
      try {
        await postConsultaUpdate({ id: consulta.id, realizada: next });
        await onReload();
        if (next) setConsultaProntuarioPendente(consulta);
      } catch (error) {
        setConsultaEditError(
          error instanceof Error ? error.message : 'Falha ao atualizar a consulta.'
        );
      } finally {
        setSavingConsulta(false);
      }
    },
    [onReload]
  );

  if (!date || consultasDia.length === 0) return null;

  const titleCls = isDark ? 'text-[#E8EDED]' : 'text-gray-700 dark:text-gray-300';
  const iconWrapCls = isDark
    ? 'bg-[#2F8FA3] text-[#E8EDED]'
    : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400';

  return (
    <>
      <div className="mb-6">
        <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${titleCls}${hideHeading ? ' sr-only' : ''}`}>
          {!isMobile && (
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconWrapCls}`}>
              <Video className="h-4 w-4" />
            </span>
          )}
          {isMobile && (
            <Video className={`h-4 w-4 ${isDark ? 'text-[#2F8FA3]' : 'text-cyan-700 dark:text-cyan-400'}`} />
          )}
          Consultas ({consultasDia.length})
        </h4>
        {consultaEditError && !editingConsulta ? (
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {consultaEditError}
          </p>
        ) : null}
        <div className="space-y-2">
          {consultasDia.map((consulta) => {
            const abrirPacienteDoCard =
              onOpenPaciente && consulta.pacienteId
                ? () => {
                    setConsultaEditError(null);
                    abrirPaciente(consulta);
                  }
                : undefined;
            const realizada = consulta.realizada;
            return (
              <div
                key={consulta.id}
                onClick={abrirPacienteDoCard}
                className={`rounded-xl border px-3 py-2.5 ${
                  realizada
                    ? isDark
                      ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/10'
                      : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-900/20'
                    : isDark
                      ? 'border-[#2F8FA3]/50 bg-[#2F8FA3]/10'
                      : 'border-cyan-200 bg-cyan-50/70 dark:border-cyan-800 dark:bg-cyan-900/20'
                }${abrirPacienteDoCard ? ' cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
                    <CalendarioPacienteAuthAvatar
                      name={consulta.pacienteNome || 'Paciente'}
                      photoUrl={consulta.pacienteId ? photoUrlByPacienteId?.[consulta.pacienteId] ?? null : null}
                      compact={isMobile}
                    />
                    <div className="min-w-0">
                    {onOpenPaciente && consulta.pacienteId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConsultaEditError(null);
                          abrirPaciente(consulta);
                        }}
                        className={`text-left text-sm font-semibold hover:underline ${
                          isDark ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white'
                        }`}
                        title={
                          !isMobile || nomeExibicaoCardMobile(consulta.pacienteNome) === consulta.pacienteNome
                            ? 'Abrir paciente'
                            : consulta.pacienteNome
                        }
                      >
                        {isMobile ? nomeExibicaoCardMobile(consulta.pacienteNome) : consulta.pacienteNome}
                      </button>
                    ) : (
                      <p
                        className={`text-sm font-semibold ${
                          isDark ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white'
                        }`}
                        title={
                          isMobile && nomeExibicaoCardMobile(consulta.pacienteNome) !== consulta.pacienteNome
                            ? consulta.pacienteNome
                            : undefined
                        }
                      >
                        {isMobile ? nomeExibicaoCardMobile(consulta.pacienteNome) : consulta.pacienteNome}
                      </p>
                    )}
                    <p
                      className={`text-xs tabular-nums ${
                        isDark ? 'text-[#4CCB7A]' : 'text-cyan-800 dark:text-cyan-300'
                      }`}
                    >
                      {consulta.startTime} – {consulta.endTime}
                    </p>
                    {consulta.observacoes ? (
                      <p
                        className={`mt-1 line-clamp-2 text-xs ${
                          isDark ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {consulta.observacoes}
                      </p>
                    ) : null}
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {onMensagemConsulta ? (
                      consulta.pacienteId && temTelefonePaciente?.(consulta.pacienteId) ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (realizada) {
                              window.alert('A consulta já foi realizada.');
                              return;
                            }
                            onMensagemConsulta(consulta);
                          }}
                          className="inline-flex shrink-0 items-center justify-center transition-transform hover:scale-[1.04]"
                          title="Enviar mensagem da consulta"
                          aria-label="Enviar mensagem da consulta"
                        >
                          <MetodoEmagrecerIcon icon="mensagens" size={isMobile ? 28 : 32} />
                        </button>
                      ) : (
                        <span className="inline-flex shrink-0 cursor-default" title="Paciente sem telefone cadastrado">
                          <MetodoEmagrecerIcon icon="mensagens" variant="inactive" size={isMobile ? 28 : 32} />
                        </span>
                      )
                    ) : null}
                    {(onOpenProntuario || onOpenPaciente) && consulta.pacienteId ? (
                      <button
                        type="button"
                        title="Abrir prontuário"
                        aria-label="Abrir prontuário do paciente"
                        onClick={() => {
                          setConsultaEditError(null);
                          void abrirProntuario(consulta);
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                          isDark
                            ? 'border-white/15 bg-white/5 text-[#E8EDED] hover:bg-white/10'
                            : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-gray-800 dark:text-cyan-300'
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Editar consulta"
                      aria-label="Editar consulta"
                      disabled={savingConsulta}
                      onClick={() => {
                        setConsultaEditError(null);
                        setEditingConsulta(consulta);
                      }}
                      className={`inline-flex h-8 items-center justify-center rounded-lg border disabled:opacity-50 ${
                        isDark
                          ? 'border-white/15 bg-white/5 text-[#E8EDED] hover:bg-white/10'
                          : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-gray-800 dark:text-cyan-300'
                      } ${isMobile ? 'w-8' : 'gap-1 px-2'}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {isMobile ? null : <span className="text-xs font-medium">Editar</span>}
                    </button>
                    <button
                      type="button"
                      title="Apagar consulta"
                      aria-label="Apagar consulta"
                      disabled={savingConsulta}
                      onClick={() => {
                        confirmarApagarConsulta(consulta.pacienteNome || 'Paciente', () => {
                          void handleDeleteConsulta(consulta.id);
                        });
                      }}
                      className={`inline-flex h-8 items-center justify-center rounded-lg border disabled:opacity-50 ${
                        isDark
                          ? 'border-white/15 bg-white/5 text-[#E8EDED]/80 hover:bg-red-500/20 hover:text-red-200'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-700 dark:border-gray-600 dark:bg-gray-800'
                      } ${isMobile ? 'w-8' : 'gap-1 px-2'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isMobile ? null : <span className="text-xs font-medium">Apagar</span>}
                    </button>
                  </div>
                </div>
                <div
                  className={`mt-2 flex items-center justify-between gap-2 border-t pt-2 ${
                    isDark ? 'border-white/10' : 'border-white/70'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <span
                    className={`text-xs font-medium ${
                      realizada
                        ? isDark
                          ? 'text-[#4CCB7A]'
                          : 'text-green-700 dark:text-green-400'
                        : isDark
                          ? 'text-[#E8EDED]/60'
                          : 'text-gray-500'
                    }`}
                  >
                    {realizada ? 'Consulta realizada' : 'Confirmar realizada'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!realizada}
                    aria-label={
                      realizada ? 'Desmarcar consulta realizada' : 'Marcar consulta como realizada'
                    }
                    disabled={savingConsulta}
                    onClick={() => void handleToggleConsultaRealizada(consulta)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                      realizada
                        ? 'bg-green-500 focus:ring-green-500'
                        : 'bg-gray-400 focus:ring-green-500'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        realizada ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {editingConsulta ? (
        <EditarConsultaCalendarioModal
          consulta={editingConsulta}
          saving={savingConsulta}
          error={consultaEditError}
          onClose={() => {
            if (savingConsulta) return;
            setEditingConsulta(null);
            setConsultaEditError(null);
          }}
          onSave={handleSaveConsulta}
          onDelete={handleDeleteConsulta}
        />
      ) : null}
      {confirmarApagarConsultaModal}
      {consultaProntuarioPendente ? (
        <ConfirmarObservacaoProntuarioModal
          pacienteNome={consultaProntuarioPendente.pacienteNome}
          onNao={() => setConsultaProntuarioPendente(null)}
          onSim={() => {
            const consulta = consultaProntuarioPendente;
            setConsultaProntuarioPendente(null);
            if (consulta) void abrirProntuario(consulta);
          }}
        />
      ) : null}
    </>
  );
}

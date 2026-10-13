'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Plus } from 'lucide-react';
import ModalLembretesPaciente from '@/components/metaadmin/ModalLembretesPaciente';
import ModalNovoLembrete from '@/components/metaadmin/ModalNovoLembrete';
import type { LembretesMutation } from '@/lib/metaadmin/lembretesMutation';
import { formatYmd, startOfDay } from '@/lib/paciente360/paciente360DateUtils';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import { getLembreteTagConfig, type LembreteTag } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  pacienteId: string;
  pacienteNome: string;
  lembretes: Lembrete[];
  pacientes: PacienteCompleto[];
  medicoId?: string;
  nutricionistaId?: string;
  audience?: 'medico' | 'nutricionista' | 'personal';
  tags?: LembreteTag[];
  defaultTelefoneAviso?: string;
  defaultTelefoneAvisoDdi?: string;
  defaultTelefoneAvisoPais?: string;
  /** Sobe o z-index (modal de paciente em z alto, ex. metanutri). */
  elevatedZIndex?: boolean;
  onMutate?: (mutation: LembretesMutation) => void;
};

function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR');
}

function formatFullDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function sortPendentes(items: Lembrete[]): Lembrete[] {
  return [...items].sort((a, b) => {
    const byDate = a.data.localeCompare(b.data);
    if (byDate !== 0) return byDate;
    return (a.horario || '').localeCompare(b.horario || '');
  });
}

export default function PacienteHeaderLembretes({
  pacienteId,
  pacienteNome,
  lembretes,
  pacientes,
  medicoId,
  nutricionistaId,
  audience = 'medico',
  tags,
  defaultTelefoneAviso,
  defaultTelefoneAvisoDdi,
  defaultTelefoneAvisoPais,
  elevatedZIndex = false,
  onMutate,
}: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hojeYmd = formatYmd(startOfDay(new Date()));

  const doPaciente = useMemo(
    () => lembretes.filter((l) => l.pacienteId === pacienteId),
    [lembretes, pacienteId]
  );

  const pendentes = useMemo(
    () => sortPendentes(doPaciente.filter((l) => !l.concluido)),
    [doPaciente]
  );

  const visiveis = pendentes.slice(0, 6);
  const extra = Math.max(0, pendentes.length - visiveis.length);
  const proximo = pendentes[0];
  const atrasado = Boolean(proximo && proximo.data < hojeYmd);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!popoverOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, [popoverOpen, pendentes.length]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setPopoverOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  const abrirNovo = () => {
    setPopoverOpen(false);
    setFormOpen(true);
  };

  const abrirPainel = () => {
    setPopoverOpen(false);
    setPanelOpen(true);
  };

  const pillClass = atrasado
    ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80 hover:bg-rose-100'
    : pendentes.length > 0
      ? 'bg-orange-50 text-orange-800 ring-1 ring-orange-200/80 hover:bg-orange-100'
      : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 hover:bg-orange-50 hover:text-orange-800 hover:ring-orange-200/80';

  return (
    <>
      <div ref={triggerRef} className="flex min-w-0 w-full items-center gap-1.5 lg:w-auto">
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          className={`inline-flex min-w-0 max-w-full flex-1 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors lg:max-w-[13.5rem] lg:flex-none ${pillClass}`}
          title={
            pendentes.length > 0
              ? `${pendentes.length} lembrete${pendentes.length === 1 ? '' : 's'} pendente${pendentes.length === 1 ? '' : 's'}`
              : 'Ver lembretes deste paciente'
          }
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
        >
          <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {proximo ? (
            <>
              <span className="min-w-0 truncate">
                {formatShortDate(proximo.data)}
                {proximo.horario ? ` ${proximo.horario}` : ''}
                {' · '}
                {proximo.tag}
              </span>
              {pendentes.length > 1 ? (
                <span
                  className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${
                    atrasado ? 'bg-rose-500' : 'bg-orange-500'
                  }`}
                >
                  {pendentes.length}
                </span>
              ) : null}
            </>
          ) : (
            <span>Lembretes</span>
          )}
        </button>
        <button
          type="button"
          onClick={abrirNovo}
          className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600"
          title="Novo lembrete"
          aria-label="Novo lembrete"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {mounted && popoverOpen
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Próximos lembretes"
              className={`fixed ${elevatedZIndex ? 'z-[10050]' : 'z-[80]'} w-[20.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`}
              style={{ top: popoverPos.top, right: popoverPos.right }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800">
                  Próximos lembretes
                  {pendentes.length > 0 ? (
                    <span className="ml-1 font-medium text-slate-400">({pendentes.length})</span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={abrirNovo}
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange-600"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  Novo
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {visiveis.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-500">
                    Nenhum lembrete pendente para este paciente.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {visiveis.map((lembrete) => {
                      const tagCfg = getLembreteTagConfig(lembrete.tag);
                      const isAtrasado = lembrete.data < hojeYmd;
                      return (
                        <li key={lembrete.id}>
                          <button
                            type="button"
                            onClick={abrirPainel}
                            className={`w-full rounded-lg border-l-4 px-2.5 py-2 text-left transition-colors hover:bg-slate-50 ${
                              isAtrasado
                                ? 'border-l-rose-400 bg-rose-50/70'
                                : 'border-l-orange-400 bg-orange-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-slate-500">
                                {formatFullDate(lembrete.data)}
                                {lembrete.horario ? ` · ${lembrete.horario}` : ''}
                                {isAtrasado ? ' · atrasado' : ''}
                              </p>
                              <span
                                className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tagCfg.bgLight} ${tagCfg.textLight}`}
                              >
                                {lembrete.tag}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-700">{lembrete.texto}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {extra > 0 ? (
                  <p className="px-2 pt-1 text-center text-[11px] text-slate-400">+{extra} mais</p>
                ) : null}
              </div>

              <div className="border-t border-slate-100 px-3 py-2">
                <button
                  type="button"
                  onClick={abrirPainel}
                  className="w-full rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold text-orange-700 hover:bg-orange-50"
                >
                  Gerenciar lembretes
                </button>
              </div>
            </div>,
            document.body
          )
        : null}

      {mounted && panelOpen
        ? createPortal(
            <ModalLembretesPaciente
              pacienteId={pacienteId}
              pacienteNome={pacienteNome}
              lembretes={doPaciente}
              pacientes={pacientes}
              medicoId={medicoId}
              nutricionistaId={nutricionistaId}
              audience={audience}
              tags={tags}
              defaultTelefoneAviso={defaultTelefoneAviso}
              defaultTelefoneAvisoDdi={defaultTelefoneAvisoDdi}
              defaultTelefoneAvisoPais={defaultTelefoneAvisoPais}
              onFechar={() => setPanelOpen(false)}
              onMutate={onMutate}
            />,
            document.body
          )
        : null}

      {formOpen ? (
        <ModalNovoLembrete
          pacientes={pacientes}
          tags={tags}
          audience={audience}
          elevatedZIndex={elevatedZIndex}
          defaultTelefoneAviso={defaultTelefoneAviso}
          defaultTelefoneAvisoDdi={defaultTelefoneAvisoDdi}
          defaultTelefoneAvisoPais={defaultTelefoneAvisoPais}
          initialValues={{
            pacienteId,
            pacienteNome,
            data: hojeYmd,
          }}
          onFechar={() => setFormOpen(false)}
          onSalvar={async (dados) => {
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
          }}
        />
      ) : null}
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import type { Medico } from '@/types/medico';
import { LembreteService } from '@/services/lembreteService';
import { downloadPrescricaoPdfComoImpressao } from '@/utils/prescricaoPdfDownload';
import { ProntuarioNutriForm } from './ProntuarioNutriForm';
import { ProntuarioTimeline } from './ProntuarioTimeline';
import {
  criarEventoProntuarioNutri,
  criarEventoProntuarioPersonal,
  desativarEventoProntuario,
  listarEventosProntuarioNutriPaginado,
  listarEventosProntuarioPersonalPaginado,
  normalizarEventoTimelinePersonal,
} from './prontuarioService';
import type { EventoTimelineMock, ProntuarioNutriFormValues } from './prontuarioTypes';
import {
  carregarEventosAsyncProntuario,
  extrairEventosAplicacoesDoPlano,
  extrairEventosSincronosPaciente,
} from './prontuarioEventosLoader';
import { combinarEventosSemDuplicar, parseDataTimeline } from './prontuarioPlanoEventos';
import { notifyMedicoNovaConsultaProntuarioClient } from '@/lib/nutri/prontuario/notifyMedicoNovaConsultaClient';

export type ProntuarioNutriTabProps = {
  paciente: PacienteCompleto;
  pacienteId?: string;
  /** Firebase Auth UID do nutricionista (userId). */
  nutricionistaId?: string;
  /** Navega para outra aba do modal (ex.: 4 = Exames). */
  onIrParaAba?: (aba: number) => void;
  /** Médico responsável (cabeçalho do PDF de prescrição). */
  medicoPrescricao?: Medico | null;
  /** Preenche a altura do container pai (modal embutido / tela cheia). */
  fillHeight?: boolean;
  /** Mobile: timeline + botão (+) que abre o formulário em tela cheia (igual metaadmin). */
  mobileMode?: boolean;
  /** Textos e títulos: nutricional (padrão) ou educador físico (metapersonal). */
  variant?: 'nutricionista' | 'personal';
};

const TITULO_POR_TIPO_NUTRI: Record<string, string> = {
  consulta: 'Consulta nutricional',
  retorno: 'Retorno nutricional',
  teleconsulta: 'Teleconsulta nutricional',
  observacao: 'Observação nutricional',
};

const TITULO_POR_TIPO_PERSONAL: Record<string, string> = {
  consulta: 'Consulta Educador Físico',
  retorno: 'Retorno Educador Físico',
  teleconsulta: 'Teleconsulta Educador Físico',
  observacao: 'Observação Educador Físico',
};

function formatDataHoraAtual(): { data: string; hora: string } {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return { data: `${dd}/${mm}/${yyyy}`, hora: `${hh}:${min}` };
}

function montarDescricaoNutri(values: ProntuarioNutriFormValues): string {
  const partes: string[] = [];
  if (values.evolucao.trim()) partes.push(`Evolução: ${values.evolucao.trim()}`);
  if (values.conduta.trim()) partes.push(`Conduta/plano: ${values.conduta.trim()}`);
  if (values.adesao.trim()) partes.push(`Adesão: ${values.adesao.trim()}`);
  return partes.join('\n');
}

export function ProntuarioNutriTab({
  paciente,
  pacienteId,
  nutricionistaId,
  onIrParaAba,
  medicoPrescricao = null,
  fillHeight = false,
  mobileMode = false,
  variant = 'nutricionista',
}: ProntuarioNutriTabProps) {
  const id = pacienteId ?? paciente.id;
  const isPersonal = variant === 'personal';
  const tituloPorTipo = isPersonal ? TITULO_POR_TIPO_PERSONAL : TITULO_POR_TIPO_NUTRI;
  const destaquePadrao = isPersonal ? 'Consulta Educador Físico' : 'Consulta nutricional';
  const statusRegistro = isPersonal ? 'Registro do educador físico' : 'Registro do nutricionista';
  const listarEventosPaginado = isPersonal
    ? listarEventosProntuarioPersonalPaginado
    : listarEventosProntuarioNutriPaginado;
  const [eventos, setEventos] = useState<EventoTimelineMock[]>([]);
  const [eventosLembretes, setEventosLembretes] = useState<EventoTimelineMock[]>([]);
  const [eventosAsync, setEventosAsync] = useState<EventoTimelineMock[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [timelineCursor, setTimelineCursor] = useState<{ criadoEmMs: number; id: string } | null>(null);
  const [temMaisTimeline, setTemMaisTimeline] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [idsRemovidos, setIdsRemovidos] = useState<Set<string>>(() => new Set());
  const [showMobileForm, setShowMobileForm] = useState(false);
  const idsLocaisRef = useRef<Set<string>>(new Set());
  const prescricoesMapRef = useRef<Map<string, Prescricao>>(new Map());

  useEffect(() => {
    setIdsRemovidos(new Set());
  }, [id]);

  const eventosAplicacoesPlano = useMemo(() => extrairEventosAplicacoesDoPlano(paciente), [paciente]);

  const eventosPacienteSync = useMemo(
    () => extrairEventosSincronosPaciente(paciente, 'nutricionista'),
    [paciente]
  );

  const eventosTimeline = useMemo(() => {
    const combinados = combinarEventosSemDuplicar(
      [...eventos, ...eventosLembretes, ...eventosPacienteSync, ...eventosAsync],
      eventosAplicacoesPlano
    );
    if (idsRemovidos.size === 0) return combinados;
    return combinados.filter((e) => !idsRemovidos.has(e.id));
  }, [eventos, eventosLembretes, eventosPacienteSync, eventosAsync, eventosAplicacoesPlano, idsRemovidos]);

  useEffect(() => {
    if (!id?.trim()) return;
    let cancelado = false;
    (async () => {
      try {
        const { eventosAsync: asyncEv, eventosLembretes: lem, prescricoesMap } =
          await carregarEventosAsyncProntuario({
            paciente,
            visao: 'nutricionista',
            profissionalId: nutricionistaId,
          });
        if (!cancelado) {
          prescricoesMapRef.current = prescricoesMap;
          setEventosAsync(asyncEv);
          setEventosLembretes(lem);
        }
      } catch (err) {
        console.error('[Prontuário Nutri] Erro ao carregar eventos derivados:', err);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [id, paciente, nutricionistaId]);

  useEffect(() => {
    if (!id?.trim()) {
      setCarregando(false);
      return;
    }

    let cancelado = false;

    const carregarTimeline = async () => {
      setCarregando(true);
      setErroCarregamento(null);

      try {
        const page = await listarEventosPaginado(id, { pageSize: 30 });
        if (cancelado) return;

        setTimelineCursor(page.nextCursor ?? null);
        setTemMaisTimeline(Boolean(page.nextCursor));

        const convertidos: EventoTimelineMock[] = page.eventos.map((evento) =>
          normalizarEventoTimelinePersonal({
            id: evento.id,
            tipo: evento.tipo,
            titulo: evento.titulo,
            descricao: evento.descricao,
            data: evento.data,
            hora: evento.hora,
            origem: evento.origem,
            destaque: evento.destaque,
            dados: evento.dados,
          })
        );

        const idsFirestore = new Set(convertidos.map((e) => e.id));
        setEventos((prev) => {
          const locais = prev.filter((e) => idsLocaisRef.current.has(e.id) && !idsFirestore.has(e.id));
          return [...locais, ...convertidos];
        });
      } catch (error) {
        if (!cancelado) {
          console.error('[Prontuário Nutri] Falha ao carregar timeline:', error);
          setErroCarregamento('Não foi possível carregar os eventos salvos.');
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregarTimeline();
    return () => {
      cancelado = true;
    };
  }, [id, listarEventosPaginado]);

  const handleCarregarMais = useCallback(async () => {
    if (!id?.trim() || !timelineCursor || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const page = await listarEventosPaginado(id, {
        pageSize: 30,
        cursor: timelineCursor,
      });
      const novos: EventoTimelineMock[] = page.eventos.map((evento) =>
        normalizarEventoTimelinePersonal({
          id: evento.id,
          tipo: evento.tipo,
          titulo: evento.titulo,
          descricao: evento.descricao,
          data: evento.data,
          hora: evento.hora,
          origem: evento.origem,
          destaque: evento.destaque,
          dados: evento.dados,
        })
      );
      setEventos((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        novos.forEach((e) => byId.set(e.id, e));
        return Array.from(byId.values());
      });
      setTimelineCursor(page.nextCursor ?? null);
      setTemMaisTimeline(Boolean(page.nextCursor));
    } catch (error) {
      console.error('[Prontuário Nutri] Falha ao carregar mais:', error);
    } finally {
      setCarregandoMais(false);
    }
  }, [id, timelineCursor, carregandoMais, listarEventosPaginado]);

  const handleSalvar = useCallback(
    async (values: ProntuarioNutriFormValues) => {
      let data: string;
      let hora: string;

      if (values.dataRegistro?.trim()) {
        const [y, m, d] = values.dataRegistro.split('-').map(Number);
        data = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        const now = new Date();
        hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      } else {
        const atual = formatDataHoraAtual();
        data = atual.data;
        hora = atual.hora;
      }

      const titulo = tituloPorTipo[values.tipoRegistro] ?? tituloPorTipo.consulta;
      const localId = `local-${Date.now()}`;
      const novoEvento: EventoTimelineMock = {
        id: localId,
        tipo: isPersonal ? 'atividade_fisica' : 'nutricao',
        titulo,
        descricao: montarDescricaoNutri(values),
        data,
        hora,
        origem: isPersonal ? 'personal' : 'nutri',
        destaque: destaquePadrao,
        dados: {
          status: statusRegistro,
          ...(values.meta.trim() ? { meta: values.meta.trim() } : {}),
        },
      };

      idsLocaisRef.current.add(localId);
      setEventos((prev) => [novoEvento, ...prev]);

      if (!id?.trim()) return;

      const firestoreId = isPersonal
        ? await criarEventoProntuarioPersonal(id, nutricionistaId, {
            titulo,
            descricao: novoEvento.descricao,
            data,
            hora,
            destaque: novoEvento.destaque,
            dados: novoEvento.dados,
          })
        : await criarEventoProntuarioNutri(id, nutricionistaId, {
            titulo,
            descricao: novoEvento.descricao,
            data,
            hora,
            destaque: novoEvento.destaque,
            dados: novoEvento.dados,
          });

      idsLocaisRef.current.delete(localId);
      setEventos((prev) => prev.map((e) => (e.id === localId ? { ...e, id: firestoreId } : e)));

      notifyMedicoNovaConsultaProntuarioClient({
        pacienteId: id,
        data,
        hora,
        titulo,
        variant: isPersonal ? 'personal' : 'nutricionista',
      });
    },
    [id, nutricionistaId, tituloPorTipo, destaquePadrao, statusRegistro, isPersonal]
  );

  const handleApagar = useCallback(
    async (eventoId: string) => {
      setIdsRemovidos((prev) => new Set(prev).add(eventoId));

      if (eventoId.startsWith('lembrete-')) {
        try {
          await LembreteService.deletarLembrete(eventoId.replace('lembrete-', ''));
          setEventosLembretes((prev) => prev.filter((e) => e.id !== eventoId));
        } catch (error) {
          console.error('[Prontuário Nutri] Falha ao apagar lembrete:', error);
          setIdsRemovidos((prev) => {
            const next = new Set(prev);
            next.delete(eventoId);
            return next;
          });
        }
        return;
      }

      setEventos((prev) => prev.filter((e) => e.id !== eventoId));

      if (!id?.trim() || eventoId.startsWith('local-')) return;

      try {
        await desativarEventoProntuario(id, eventoId);
      } catch (error) {
        console.error('[Prontuário Nutri] Falha ao apagar:', error);
        setIdsRemovidos((prev) => {
          const next = new Set(prev);
          next.delete(eventoId);
          return next;
        });
      }
    },
    [id]
  );

  const handleDownloadPrescricao = useCallback(
    async (eventoId: string) => {
      const prescId = eventoId.replace('prescricao-', '');
      const prescricao = prescricoesMapRef.current.get(prescId);
      if (!prescricao) {
        console.warn('[Prontuário Nutri] Prescrição não encontrada para download:', prescId);
        return;
      }
      try {
        await downloadPrescricaoPdfComoImpressao(prescricao, medicoPrescricao ?? null, {
          pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
          pacienteCpf: paciente.dadosIdentificacao?.cpf,
        });
      } catch (err) {
        console.error('[Prontuário Nutri] Erro ao gerar PDF da prescrição:', err);
      }
    },
    [medicoPrescricao, paciente]
  );

  const timeline = (
    <>
      <ProntuarioTimeline
        variant="nutricionista"
        eventos={eventosTimeline}
        prontuarioVazio={!carregando && eventosTimeline.length === 0}
        onIrParaAba={onIrParaAba}
        onDownloadPrescricao={handleDownloadPrescricao}
        onApagar={handleApagar}
        podeApagarEvento={(e) =>
          e.id.startsWith('lembrete-') ||
          (isPersonal
            ? e.origem === 'personal' && e.tipo === 'atividade_fisica'
            : e.origem === 'nutri' && e.tipo === 'nutricao')
        }
      />
      {temMaisTimeline && (
        <div className="pt-3 flex justify-center">
          <button
            type="button"
            onClick={() => void handleCarregarMais()}
            disabled={carregandoMais}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            {carregandoMais ? 'Carregando...' : 'Carregar mais registros'}
          </button>
        </div>
      )}
    </>
  );

  if (mobileMode) {
    return (
      <div className="relative h-full" data-paciente-id={id}>
        {carregando && (
          <p className="py-4 text-center text-sm text-gray-500">Carregando prontuário...</p>
        )}
        {!carregando && erroCarregamento && (
          <p className="py-2 text-sm text-amber-700">{erroCarregamento}</p>
        )}

        <div className="overflow-y-auto pb-20">{timeline}</div>

        <button
          type="button"
          onClick={() => setShowMobileForm(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-transform hover:bg-green-700 active:scale-95"
          aria-label="Nova consulta"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        {showMobileForm ? (
          <div className="fixed inset-0 z-[10000] flex flex-col bg-white">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {isPersonal ? 'Nova consulta' : 'Nova consulta nutricional'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMobileForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ProntuarioNutriForm
                variant={variant}
                onSalvar={async (values) => {
                  await handleSalvar(values);
                  setShowMobileForm(false);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={
        fillHeight
          ? 'h-full min-h-0 flex flex-col gap-3 max-lg:h-auto'
          : 'space-y-4'
      }
      data-paciente-id={id}
    >
      {carregando && <p className="text-sm text-gray-500 flex-shrink-0">Carregando prontuário...</p>}
      {!carregando && erroCarregamento && (
        <p className="text-sm text-amber-700 flex-shrink-0">{erroCarregamento}</p>
      )}

      <div
        className={
          fillHeight
            ? 'grid grid-cols-1 lg:grid-cols-[3fr_2fr] lg:grid-rows-1 gap-6 min-h-0 flex-1'
            : 'grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 min-h-0'
        }
      >
        <div
          className={
            fillHeight
              ? 'min-h-0 lg:overflow-y-auto pr-1'
              : 'min-h-0 lg:max-h-[calc(90vh-280px)] lg:overflow-y-auto pr-1'
          }
        >
          {timeline}
        </div>
        <div
          className={
            fillHeight
              ? 'min-h-0 lg:overflow-y-auto pr-1'
              : 'min-h-0 lg:max-h-[calc(90vh-280px)] lg:overflow-y-auto pr-1'
          }
        >
          <ProntuarioNutriForm onSalvar={handleSalvar} variant={variant} />
        </div>
      </div>
    </div>
  );
}

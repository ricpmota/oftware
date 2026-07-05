'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PacienteCompleto } from '@/types/obesidade';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { ProntuarioForm } from './ProntuarioForm';
import { ProntuarioTimeline } from './ProntuarioTimeline';
import { criarEventoProntuario, desativarEventoProntuario, listarEventosProntuarioPaginado } from './prontuarioService';
import type { EventoTimelineMock, ProntuarioFormValues } from './prontuarioTypes';
import { LembreteService } from '@/services/lembreteService';
import type { Lembrete } from '@/types/lembrete';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import { PagamentoService } from '@/services/pagamentoService';
import { trainingSessionService } from '@/services/trainingSessionService';
import { buscarBioImpedanciaRegistros } from '@/services/bioImpedanciaService';
import { downloadPrescricaoPdfComoImpressao } from '@/utils/prescricaoPdfDownload';
import {
  extrairEventosAniversario,
  extrairEventosAlertas,
  extrairEventosExamesLab,
  extrairEventosExamesImagem,
  extrairEventosIA,
  extrairEventosBioimpedancia,
  extrairEventoConclusaoTratamento,
  prescricoesParaEventos,
  pagamentoParaEventos,
  trainingSessionsParaEventos,
  progressPhotosParaEventos,
  solicitacoesExamesParaEventos,
  type ProgressPhotoData,
  type SolicitacaoExameData,
} from './prontuarioEventExtractors';
import { downloadSolicitacaoExamesPdf, type SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';
import { buscarEventosNutricaoProntuario } from './nutricaoProntuarioService';
import {
  combinarEventosSemDuplicar,
  extrairEventosAplicacoesDoPlano,
  parseDataTimeline,
} from './prontuarioPlanoEventos';

export type ProntuarioTabProps = {
  paciente: PacienteCompleto;
  pacienteId?: string;
  medicoId?: string;
  medico?: Medico | null;
  onIrParaAba?: (aba: number) => void;
  mobileMode?: boolean;
};

const TITULO_POR_TIPO_REGISTRO: Record<string, string> = {
  consulta: 'Consulta médica registrada',
  retorno: 'Retorno registrado',
  teleconsulta: 'Teleconsulta registrada',
  intercorrencia: 'Intercorrência registrada',
  ajuste_dose: 'Ajuste de dose registrado',
  observacao: 'Observação registrada',
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

function montarDescricao(values: ProntuarioFormValues): string {
  const partes: string[] = [];
  if (values.evolucao.trim()) partes.push(`Evolução: ${values.evolucao.trim()}`);
  if (values.sintomas.trim()) partes.push(`Sintomas/efeitos adversos: ${values.sintomas.trim()}`);
  if (values.conduta.trim()) partes.push(`Conduta/plano: ${values.conduta.trim()}`);
  return partes.join('\n');
}

function montarDados(values: ProntuarioFormValues): EventoTimelineMock['dados'] {
  const dados: NonNullable<EventoTimelineMock['dados']> = { status: 'Registro manual' };
  if (values.peso.trim()) dados.peso = values.peso.trim();
  if (values.cintura.trim()) dados.cintura = values.cintura.trim();
  if (values.doseAtual.trim()) dados.dose = values.doseAtual.trim();
  if (values.pressao.trim()) dados.pressao = values.pressao.trim();
  if (values.proximaDose.trim()) dados.proximaDose = values.proximaDose.trim();
  if (values.meta.trim()) dados.meta = values.meta.trim();
  return dados;
}

function lembreteParaEvento(lembrete: Lembrete): EventoTimelineMock {
  const [y, m, d] = lembrete.data.split('-').map(Number);
  const dataFormatada = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return {
    id: `lembrete-${lembrete.id}`,
    tipo: 'lembrete',
    titulo: `Lembrete: ${lembrete.tag}`,
    descricao: lembrete.texto,
    data: dataFormatada,
    origem: 'medico',
    ...(lembrete.concluido ? { destaque: 'Realizado' } : {}),
    dados: { status: lembrete.concluido ? 'Realizado' : 'Pendente' },
  };
}

export function ProntuarioTab({ paciente, pacienteId, medicoId, medico, onIrParaAba, mobileMode }: ProntuarioTabProps) {
  const id = pacienteId ?? paciente.id;
  const [eventos, setEventos] = useState<EventoTimelineMock[]>([]);
  const [eventosLembretes, setEventosLembretes] = useState<EventoTimelineMock[]>([]);
  const [eventosAsync, setEventosAsync] = useState<EventoTimelineMock[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMaisTimeline, setCarregandoMaisTimeline] = useState(false);
  const [timelineCursor, setTimelineCursor] = useState<{ criadoEmMs: number; id: string } | null>(null);
  const [temMaisTimeline, setTemMaisTimeline] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [fotosProgresso, setFotosProgresso] = useState<ProgressPhotoData[]>([]);
  const [idsRemovidos, setIdsRemovidos] = useState<Set<string>>(() => new Set());
  const idsLocaisRef = useRef<Set<string>>(new Set());
  const prescricoesMapRef = useRef<Map<string, Prescricao>>(new Map());
  const solicitacoesExamesMapRef = useRef<Map<string, SolicitacaoExamesSalva>>(new Map());

  useEffect(() => {
    setIdsRemovidos(new Set());
  }, [id]);

  const eventosAplicacoesPlano = useMemo(
    () => extrairEventosAplicacoesDoPlano(paciente),
    [paciente]
  );

  // Etapa 1-3: extratores síncronos derivados do PacienteCompleto
  const eventosPacienteSync = useMemo(() => {
    const bioRegs = (paciente as Record<string, unknown>).bioimpedanciaRegistros as BioImpedanciaRegistro[] | undefined;
    const eventoConclusao = extrairEventoConclusaoTratamento(paciente);
    return [
      ...extrairEventosAniversario(paciente),
      ...extrairEventosAlertas(paciente),
      ...extrairEventosExamesLab(paciente),
      ...extrairEventosExamesImagem(paciente),
      ...extrairEventosIA(paciente),
      ...(bioRegs ? extrairEventosBioimpedancia(bioRegs) : []),
      ...(eventoConclusao ? [eventoConclusao] : []),
    ];
  }, [paciente]);

  const eventosTimeline = useMemo(() => {
    const combinados = combinarEventosSemDuplicar(
      [...eventos, ...eventosLembretes, ...eventosPacienteSync, ...eventosAsync],
      eventosAplicacoesPlano,
    );
    if (idsRemovidos.size === 0) return combinados;
    return combinados.filter((e) => !idsRemovidos.has(e.id));
  }, [eventos, eventosLembretes, eventosPacienteSync, eventosAsync, eventosAplicacoesPlano, idsRemovidos]);

  // Lembretes
  useEffect(() => {
    if (!medicoId || !id) return;
    let cancelado = false;
    (async () => {
      try {
        const todos = await LembreteService.getLembretesPorMedico(medicoId);
        if (cancelado) return;
        const doPaciente = todos.filter(l => l.pacienteId === id);
        setEventosLembretes(doPaciente.map(lembreteParaEvento));
      } catch (err) {
        console.error('[Prontuário] Erro ao carregar lembretes:', err);
      }
    })();
    return () => { cancelado = true; };
  }, [medicoId, id]);

  // Etapa 4-5: fetch assíncrono de collections externas
  useEffect(() => {
    if (!id?.trim()) return;
    let cancelado = false;
    setFotosProgresso([]);

    (async () => {
      const resultados: EventoTimelineMock[] = [];

      // Prescrições
      try {
        const prescricoes = await PrescricaoService.getPrescricoesByPaciente(id);
        if (!cancelado) {
          const map = new Map<string, Prescricao>();
          for (const p of prescricoes) map.set(p.id, p);
          prescricoesMapRef.current = map;
          resultados.push(...prescricoesParaEventos(prescricoes));
        }
      } catch (err) {
        console.error('[Prontuário] Erro prescrições:', err);
      }

      // Pagamentos
      try {
        const pagamento = await PagamentoService.getPagamentoPorPacienteId(id);
        if (!cancelado && pagamento) resultados.push(...pagamentoParaEventos(pagamento));
      } catch (err) {
        console.error('[Prontuário] Erro pagamentos:', err);
      }

      // Bioimpedância (fetch se não veio no objeto)
      if (!(paciente as Record<string, unknown>).bioimpedanciaRegistros) {
        try {
          const bioRegs = await buscarBioImpedanciaRegistros(id);
          if (!cancelado && bioRegs.length > 0) resultados.push(...extrairEventosBioimpedancia(bioRegs));
        } catch (err) {
          console.error('[Prontuário] Erro bioimpedância:', err);
        }
      }

      // Sessões de treino (atividade física)
      try {
        const sessions = await trainingSessionService.getPatientSessions(id);
        if (!cancelado) resultados.push(...trainingSessionsParaEventos(sessions));
      } catch (err) {
        console.error('[Prontuário] Erro treinos:', err);
      }

      // Fotos de progresso (filtro simples + ordenação local — sem índice composto)
      try {
        const snap = await getDocs(
          query(
            collection(db, 'pacientes_completos', id, 'progressPhotos'),
            where('compartilharComMedico', '==', true)
          )
        );
        if (!cancelado) {
          const toMs = (value: unknown): number => {
            if (value && typeof value === 'object' && 'toDate' in value) {
              const d = (value as { toDate: () => Date }).toDate();
              return d.getTime();
            }
            if (value instanceof Date) return value.getTime();
            return 0;
          };
          const fotos: ProgressPhotoData[] = snap.docs
            .map((d) => ({
              id: d.id,
              tipo: (d.data().tipo as string) ?? 'frontal',
              url: (d.data().url as string) ?? '',
              semana: d.data().semana as number | undefined,
              createdAt: d.data().createdAt,
              dataAplicacao: d.data().dataAplicacao,
            }))
            .sort(
              (a, b) =>
                toMs(b.createdAt ?? b.dataAplicacao) - toMs(a.createdAt ?? a.dataAplicacao)
            );
          setFotosProgresso(fotos);
          resultados.push(...progressPhotosParaEventos(fotos.slice(0, 30)));
        }
      } catch (err) {
        console.error('[Prontuário] Erro fotos progresso:', err);
      }

      // Nutrição (anamnese, cardápio, check-ins, ChatNutri — /meta → Nutri)
      try {
        const eventosNutri = await buscarEventosNutricaoProntuario(id);
        if (!cancelado) resultados.push(...eventosNutri);
      } catch (err) {
        console.error('[Prontuário] Erro eventos nutrição:', err);
      }

      // Solicitações de exames
      try {
        const solSnap = await getDocs(
          query(
            collection(db, 'pacientes_completos', id, 'solicitacoesExames'),
            orderBy('criadoEm', 'desc'),
            limit(30)
          )
        );
        if (!cancelado) {
          const map = new Map<string, SolicitacaoExamesSalva>();
          const solicitacoes: SolicitacaoExameData[] = solSnap.docs.map((d) => {
            const data = d.data();
            const salva: SolicitacaoExamesSalva = {
              id: d.id,
              pacienteId: id,
              medicoId: (data.medicoId as string) ?? '',
              exames: (data.exames as string[]) ?? [],
              hipoteseDiagnostica: (data.hipoteseDiagnostica as string) ?? '',
              criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
            };
            map.set(d.id, salva);
            return {
              id: d.id,
              medicoId: salva.medicoId,
              exames: salva.exames,
              hipoteseDiagnostica: salva.hipoteseDiagnostica,
              criadoEm: data.criadoEm,
            };
          });
          solicitacoesExamesMapRef.current = map;
          resultados.push(...solicitacoesExamesParaEventos(solicitacoes));
        }
      } catch (err) {
        console.error('[Prontuário] Erro solicitações exames:', err);
      }

      if (!cancelado) setEventosAsync(resultados);
    })();

    return () => { cancelado = true; };
  }, [id, paciente]);

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
        const page = await listarEventosProntuarioPaginado(id, { pageSize: 30 });
        const eventosFirestore = page.eventos;
        if (cancelado) return;
        setTimelineCursor(page.nextCursor ?? null);
        setTemMaisTimeline(Boolean(page.nextCursor));

        if (eventosFirestore.length > 0) {
          const eventosConvertidos: EventoTimelineMock[] = eventosFirestore.map((evento) => ({
            id: evento.id,
            tipo: evento.tipo,
            titulo: evento.titulo,
            descricao: evento.descricao,
            data: evento.data,
            hora: evento.hora,
            origem: evento.origem,
            destaque: evento.destaque,
            dados: evento.dados,
          }));
          const idsFirestore = new Set(eventosConvertidos.map((e) => e.id));
          setEventos((prev) => {
            const locaisNaoSincronizados = prev.filter(
              (e) => idsLocaisRef.current.has(e.id) && !idsFirestore.has(e.id)
            );
            return [...locaisNaoSincronizados, ...eventosConvertidos];
          });
        } else {
          setEventos((prev) => {
            const locaisNaoSincronizados = prev.filter((e) => idsLocaisRef.current.has(e.id));
            return locaisNaoSincronizados;
          });
        }
      } catch (error) {
        if (cancelado) return;
        console.error('[Prontuário] Falha ao carregar timeline:', error);
        setEventos((prev) => prev.filter((e) => idsLocaisRef.current.has(e.id)));
        setErroCarregamento(
          'Não foi possível carregar os eventos salvos. Tente reabrir a aba.'
        );
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregarTimeline();

    return () => {
      cancelado = true;
    };
  }, [id]);

  const handleCarregarMaisTimeline = useCallback(async () => {
    if (!id?.trim() || !timelineCursor || carregandoMaisTimeline) return;
    setCarregandoMaisTimeline(true);
    try {
      const page = await listarEventosProntuarioPaginado(id, {
        pageSize: 30,
        cursor: timelineCursor,
      });
      const novosEventos: EventoTimelineMock[] = page.eventos.map((evento) => ({
        id: evento.id,
        tipo: evento.tipo,
        titulo: evento.titulo,
        descricao: evento.descricao,
        data: evento.data,
        hora: evento.hora,
        origem: evento.origem,
        destaque: evento.destaque,
        dados: evento.dados,
      }));
      setEventos((prev) => {
        const byId = new Map(prev.map((e) => [e.id, e]));
        novosEventos.forEach((e) => byId.set(e.id, e));
        return Array.from(byId.values()).sort(
          (a, b) => parseDataTimeline(b.data, b.hora) - parseDataTimeline(a.data, a.hora)
        );
      });
      setTimelineCursor(page.nextCursor ?? null);
      setTemMaisTimeline(Boolean(page.nextCursor));
    } catch (error) {
      console.error('[Prontuário] Falha ao carregar mais eventos:', error);
    } finally {
      setCarregandoMaisTimeline(false);
    }
  }, [id, timelineCursor, carregandoMaisTimeline]);

  const handleSalvarRegistro = useCallback(
    async (values: ProntuarioFormValues) => {
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

      const titulo =
        TITULO_POR_TIPO_REGISTRO[values.tipoRegistro] ?? TITULO_POR_TIPO_REGISTRO.consulta;
      const temAjusteTerapeutico = Boolean(values.doseAtual.trim() || values.proximaDose.trim());

      const localId = Date.now().toString();
      const novoEvento: EventoTimelineMock = {
        id: localId,
        tipo: 'consulta',
        titulo,
        descricao: montarDescricao(values),
        data,
        hora,
        origem: 'medico',
        ...(temAjusteTerapeutico ? { destaque: 'Ajuste terapêutico registrado' } : {}),
        dados: montarDados(values),
      };

      idsLocaisRef.current.add(localId);
      setEventos((prev) => [novoEvento, ...prev]);

      if (!id?.trim()) {
        console.warn(
          '[Prontuário] pacienteId ausente — registro mantido apenas na timeline local.'
        );
        return;
      }

      try {
        const firestoreId = await criarEventoProntuario(id, {
          tipo: novoEvento.tipo,
          titulo: novoEvento.titulo,
          descricao: novoEvento.descricao,
          data: novoEvento.data,
          hora: novoEvento.hora,
          origem: novoEvento.origem,
          destaque: novoEvento.destaque,
          dados: novoEvento.dados,
        });
        idsLocaisRef.current.delete(localId);
        setEventos((prev) =>
          prev.map((e) => (e.id === localId ? { ...e, id: firestoreId } : e))
        );
      } catch (error) {
        console.error('[Prontuário] Falha ao salvar evento no Firestore:', error);
        setEventos((prev) =>
          prev.map((evento) =>
            evento.id === localId
              ? {
                  ...evento,
                  dados: {
                    ...evento.dados,
                    status: 'Registro local — falha ao sincronizar',
                  },
                }
              : evento
          )
        );
        throw error;
      }
    },
    [id]
  );

  const handleApagarRegistro = useCallback(
    async (eventoId: string) => {
      setIdsRemovidos((prev) => new Set(prev).add(eventoId));
      setEventos((prev) => prev.filter((e) => e.id !== eventoId));
      setEventosLembretes((prev) => prev.filter((e) => e.id !== eventoId));
      setEventosAsync((prev) => prev.filter((e) => e.id !== eventoId));

      if (!id?.trim()) return;

      try {
        if (eventoId.startsWith('prescricao-')) {
          const prescId = eventoId.replace('prescricao-', '');
          await PrescricaoService.deletePrescricao(prescId);
          prescricoesMapRef.current.delete(prescId);
        } else if (eventoId.startsWith('solicitacao-exame-')) {
          const solId = eventoId.replace('solicitacao-exame-', '');
          await deleteDoc(doc(db, 'pacientes_completos', id, 'solicitacoesExames', solId));
          solicitacoesExamesMapRef.current.delete(solId);
        } else if (eventoId.startsWith('lembrete-')) {
          const lembreteId = eventoId.replace('lembrete-', '');
          await LembreteService.deletarLembrete(lembreteId);
        } else {
          await desativarEventoProntuario(id, eventoId);
        }
      } catch (error) {
        console.error('[Prontuário] Falha ao apagar evento:', error);
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
        console.warn('[Prontuário] Prescrição não encontrada para download:', prescId);
        return;
      }
      try {
        await downloadPrescricaoPdfComoImpressao(prescricao, medico ?? null, {
          pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
          pacienteCpf: paciente.dadosIdentificacao?.cpf,
        });
      } catch (err) {
        console.error('[Prontuário] Erro ao gerar PDF da prescrição:', err);
      }
    },
    [medico, paciente]
  );

  const handleDownloadSolicitacaoExames = useCallback(
    async (eventoId: string) => {
      const solId = eventoId.replace('solicitacao-exame-', '');
      const solicitacao = solicitacoesExamesMapRef.current.get(solId);
      if (!solicitacao) {
        console.warn('[Prontuário] Solicitação de exames não encontrada para download:', solId);
        return;
      }
      const sexoRaw = paciente.dadosIdentificacao?.sexoBiologico;
      const sexo = sexoRaw === 'M' ? 'Masculino' : sexoRaw === 'F' ? 'Feminino' : undefined;
      const dataNasc = paciente.dadosIdentificacao?.dataNascimento
        ? new Date(paciente.dadosIdentificacao.dataNascimento).toLocaleDateString('pt-BR')
        : undefined;
      try {
        await downloadSolicitacaoExamesPdf(solicitacao, medico ?? null, {
          pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
          pacienteCpf: paciente.dadosIdentificacao?.cpf,
          pacienteDataNascimento: dataNasc,
          pacienteSexo: sexo,
        });
      } catch (err) {
        console.error('[Prontuário] Erro ao gerar PDF da solicitação de exames:', err);
      }
    },
    [medico, paciente]
  );

  const [showMobileForm, setShowMobileForm] = useState(false);

  if (mobileMode) {
    return (
      <div className="relative h-full" data-paciente-id={id}>
        {carregando && (
          <p className="text-sm text-gray-500 py-4 text-center">Carregando prontuário...</p>
        )}
        {!carregando && erroCarregamento && (
          <p className="text-sm text-amber-700 py-2">{erroCarregamento}</p>
        )}

        <div className="overflow-y-auto pb-16">
          <ProntuarioTimeline
            eventos={eventosTimeline}
            prontuarioVazio={!carregando && eventosTimeline.length === 0}
            fotosProgresso={fotosProgresso}
            onIrParaAba={onIrParaAba}
            onApagar={handleApagarRegistro}
            onDownloadPrescricao={handleDownloadPrescricao}
            onDownloadSolicitacaoExames={handleDownloadSolicitacaoExames}
          />
          {temMaisTimeline && (
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void handleCarregarMaisTimeline()}
                disabled={carregandoMaisTimeline}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
              >
                {carregandoMaisTimeline ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>

        {/* Botão flutuante (+) */}
        <button
          type="button"
          onClick={() => setShowMobileForm(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
          aria-label="Novo registro"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>

        {/* Modal do formulário mobile - tela inteira */}
        {showMobileForm && (
          <div className="fixed inset-0 bg-white z-[10000] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Novo Registro</h3>
              <button
                type="button"
                onClick={() => setShowMobileForm(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
                aria-label="Fechar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ProntuarioForm onSalvar={async (values) => {
                await handleSalvarRegistro(values);
                setShowMobileForm(false);
              }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-paciente-id={id}>
      {carregando && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando prontuário salvo...</p>
      )}
      {!carregando && erroCarregamento && (
        <p className="text-sm text-amber-700 dark:text-amber-300/90">{erroCarregamento}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 min-h-0">
        <div className="min-h-0 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto pr-1">
          <ProntuarioTimeline
            eventos={eventosTimeline}
            prontuarioVazio={!carregando && eventosTimeline.length === 0}
            fotosProgresso={fotosProgresso}
            onIrParaAba={onIrParaAba}
            onApagar={handleApagarRegistro}
            onDownloadPrescricao={handleDownloadPrescricao}
            onDownloadSolicitacaoExames={handleDownloadSolicitacaoExames}
          />
          {temMaisTimeline && (
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void handleCarregarMaisTimeline()}
                disabled={carregandoMaisTimeline}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/15 text-xs font-medium text-gray-700 dark:text-[#E8EDED]/90 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-60"
              >
                {carregandoMaisTimeline ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto pr-1">
          <ProntuarioForm onSalvar={handleSalvarRegistro} />
        </div>
      </div>
    </div>
  );
}

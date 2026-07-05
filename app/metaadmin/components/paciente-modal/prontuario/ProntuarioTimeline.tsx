'use client';

import { useMemo, useState } from 'react';
import { AplicacaoTimelineCard, ehAplicacaoComPainel } from './AplicacaoTimelineCard';
import { MarcoZeroTimelineCard } from './MarcoZeroTimelineCard';
import { ConclusaoTratamentoTimelineCard } from './ConclusaoTratamentoTimelineCard';
import type { FotoProgressoCarousel } from '@/components/progressPhotos/ProgressPhotosCarouselModal';
import {
  EVENTO_TIMELINE_LABELS,
  type EventoTimelineDados,
  type EventoTimelineMock,
  type EventoTimelineOrigem,
  type EventoTimelineTipo,
} from './prontuarioTypes';

const BADGE_POR_TIPO: Record<EventoTimelineTipo, string> = {
  consulta: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800',
  aplicacao: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
  marco_zero: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  conclusao_tratamento: 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800',
  peso: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
  cintura: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800',
  exame_solicitado: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
  exame_resultado: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800',
  prescricao: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800',
  pagamento: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800',
  aniversario: 'bg-pink-50 text-pink-800 border-pink-200 dark:bg-pink-950/50 dark:text-pink-200 dark:border-pink-800',
  bioimpedancia: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800',
  observacao: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
  ia: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800',
  nutricao: 'bg-lime-50 text-lime-800 border-lime-200 dark:bg-lime-950/50 dark:text-lime-200 dark:border-lime-800',
  atividade_fisica: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800',
  imagem: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:border-fuchsia-800',
  sistema_importante: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800',
  lembrete: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800',
};

const LABEL_TIPO = EVENTO_TIMELINE_LABELS;

const LABEL_ORIGEM: Record<EventoTimelineOrigem, string> = {
  medico: 'Médico',
  paciente: 'Paciente',
  sistema: 'Sistema',
  nutri: 'Nutrição',
  personal: 'Personal',
  admin: 'Admin',
};


type FiltroTimelineAtivo = 'todos' | 'exames' | 'aplicacoes' | EventoTimelineTipo;

const TIPOS_EXAMES: Set<EventoTimelineTipo> = new Set(['exame_solicitado', 'exame_resultado', 'imagem']);
const TIPOS_APLICACOES: Set<EventoTimelineTipo> = new Set(['aplicacao', 'marco_zero', 'peso', 'cintura']);

const FILTROS_TIMELINE: { id: FiltroTimelineAtivo; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'consulta', label: 'Consultas' },
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'conclusao_tratamento', label: 'Conclusão' },
  { id: 'exames', label: 'Exames' },
  { id: 'prescricao', label: 'Prescrições' },
  { id: 'pagamento', label: 'Pagamentos' },
  { id: 'bioimpedancia', label: 'Bioimpedância' },
  { id: 'observacao', label: 'Observações' },
  { id: 'ia', label: 'IA' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'atividade_fisica', label: 'Atividade física' },
  { id: 'sistema_importante', label: 'Alertas' },
  { id: 'aniversario', label: 'Aniversário' },
  { id: 'lembrete', label: 'Lembretes' },
];

const FILTROS_TIMELINE_NUTRI: { id: FiltroTimelineAtivo; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'conclusao_tratamento', label: 'Conclusão' },
  { id: 'exames', label: 'Exames' },
  { id: 'prescricao', label: 'Prescrições' },
  { id: 'pagamento', label: 'Pagamentos' },
  { id: 'bioimpedancia', label: 'Bioimpedância' },
  { id: 'observacao', label: 'Observações' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'atividade_fisica', label: 'Atividade física' },
  { id: 'sistema_importante', label: 'Alertas' },
  { id: 'aniversario', label: 'Aniversário' },
  { id: 'lembrete', label: 'Lembretes' },
];

const DOT_COR_TIPO: Record<EventoTimelineTipo, string> = {
  consulta: 'bg-blue-500',
  aplicacao: 'bg-emerald-500',
  marco_zero: 'bg-amber-500',
  conclusao_tratamento: 'bg-teal-500',
  peso: 'bg-violet-500',
  cintura: 'bg-rose-500',
  exame_solicitado: 'bg-amber-500',
  exame_resultado: 'bg-orange-500',
  prescricao: 'bg-indigo-500',
  pagamento: 'bg-teal-500',
  aniversario: 'bg-pink-500',
  bioimpedancia: 'bg-cyan-500',
  observacao: 'bg-gray-400',
  ia: 'bg-purple-500',
  nutricao: 'bg-lime-500',
  atividade_fisica: 'bg-sky-500',
  imagem: 'bg-fuchsia-500',
  sistema_importante: 'bg-red-500',
  lembrete: 'bg-orange-500',
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseDateParts(dataStr: string, horaStr?: string) {
  const partes = dataStr.split('/');
  if (partes.length !== 3) return null;
  const [dd, mm, yyyy] = partes.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const date = new Date(yyyy, mm - 1, dd);
  if (isNaN(date.getTime())) return null;
  return {
    dia: String(dd),
    mesAno: `${MESES_ABREV[mm - 1]} ${yyyy}`,
    diaSemana: DIAS_SEMANA_ABREV[date.getDay()],
    hora: horaStr,
  };
}

function ehAplicacaoFutura(evento: EventoTimelineMock): boolean {
  if (evento.tipo !== 'aplicacao') return false;
  const partes = evento.data.split('/');
  if (partes.length !== 3) return false;
  const [dd, mm, yyyy] = partes.map(Number);
  if (!dd || !mm || !yyyy) return false;
  const dataEvento = new Date(yyyy, mm - 1, dd);
  dataEvento.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dataEvento.getTime() > hoje.getTime();
}

type SubfiltroAplicacao = 'atuais' | 'todas';

function formatDadosLinhas(dados: EventoTimelineDados): string[] {
  const linhas: string[] = [];
  if (ehAplicacaoComPainel(dados)) return linhas;
  if (dados.peso) linhas.push(`Peso: ${dados.peso}`);
  if (dados.cintura) linhas.push(`Cintura: ${dados.cintura}`);
  if (dados.pressao) linhas.push(`PA: ${dados.pressao}`);
  if (dados.medicamento && dados.dose) {
    linhas.push(`${dados.medicamento} ${dados.dose}`);
  } else if (dados.medicamento) {
    linhas.push(dados.medicamento);
  } else if (dados.dose) {
    linhas.push(`Dose: ${dados.dose}`);
  }
  if (dados.proximaDose) linhas.push(`Próx. dose: ${dados.proximaDose}`);
  if (dados.valor && dados.status) {
    linhas.push(`${dados.valor} — ${dados.status}`);
  } else if (dados.valor) {
    linhas.push(dados.valor);
  } else if (dados.status && dados.status !== 'Registro manual') {
    linhas.push(dados.status);
  }
  if (dados.exame) linhas.push(dados.exame);
  return linhas;
}

const SECOES_CONSULTA_LABELS: Record<string, { label: string; icon: string }> = {
  'Evolução': { label: 'Evolução', icon: '📋' },
  'Sintomas/efeitos adversos': { label: 'Sintomas / Efeitos adversos', icon: '⚠️' },
  'Conduta/plano': { label: 'Conduta / Plano', icon: '🎯' },
  'Meta': { label: 'Meta até próxima consulta', icon: '🏁' },
  'Pressão arterial': { label: 'Pressão arterial', icon: '💓' },
  'Próxima dose': { label: 'Próxima dose', icon: '💉' },
};

function parseDescricaoConsulta(descricao: string): { label: string; icon: string; texto: string }[] {
  const secoes: { label: string; icon: string; texto: string }[] = [];
  const linhas = descricao.split('\n');
  for (const linha of linhas) {
    const match = linha.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const chave = match[1].trim();
      const texto = match[2].trim();
      const meta = SECOES_CONSULTA_LABELS[chave];
      if (meta) {
        secoes.push({ label: meta.label, icon: meta.icon, texto });
      } else {
        secoes.push({ label: chave, icon: '•', texto });
      }
    } else if (linha.trim()) {
      secoes.push({ label: '', icon: '', texto: linha.trim() });
    }
  }
  return secoes;
}

function ehConsultaComSecoes(evento: EventoTimelineMock): boolean {
  return evento.tipo === 'consulta' && evento.descricao.includes(':');
}

function podeApagarPadraoMedico(evento: EventoTimelineMock): boolean {
  return evento.origem === 'medico' && !evento.id.startsWith('plano-');
}

export type ProntuarioTimelineProps = {
  eventos: EventoTimelineMock[];
  prontuarioVazio?: boolean;
  variant?: 'medico' | 'nutricionista';
  fotosProgresso?: FotoProgressoCarousel[];
  onIrParaAba?: (aba: number) => void;
  onApagar?: (eventoId: string) => void;
  podeApagarEvento?: (evento: EventoTimelineMock) => boolean;
  onDownloadPrescricao?: (eventoId: string) => void;
  onDownloadSolicitacaoExames?: (eventoId: string) => void;
};

export function ProntuarioTimeline({
  eventos,
  prontuarioVazio,
  variant = 'medico',
  fotosProgresso = [],
  onIrParaAba,
  onApagar,
  podeApagarEvento,
  onDownloadPrescricao,
  onDownloadSolicitacaoExames,
}: ProntuarioTimelineProps) {
  const filtrosExibidos = variant === 'nutricionista' ? FILTROS_TIMELINE_NUTRI : FILTROS_TIMELINE;
  const resolverPodeApagar = podeApagarEvento ?? podeApagarPadraoMedico;
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTimelineAtivo>('todos');
  const [subfiltroAplicacao, setSubfiltroAplicacao] = useState<SubfiltroAplicacao>('atuais');
  const [confirmandoApagar, setConfirmandoApagar] = useState<string | null>(null);

  const eventosFiltrados = useMemo(() => {
    if (filtroAtivo === 'aplicacoes') {
      const apps = eventos.filter((e) => TIPOS_APLICACOES.has(e.tipo));
      return subfiltroAplicacao === 'atuais' ? apps.filter((e) => !ehAplicacaoFutura(e)) : apps;
    }
    if (filtroAtivo === 'todos') {
      return eventos.filter((e) => !ehAplicacaoFutura(e));
    }
    if (filtroAtivo === 'exames') {
      return eventos.filter((e) => TIPOS_EXAMES.has(e.tipo));
    }
    return eventos.filter((e) => e.tipo === filtroAtivo);
  }, [eventos, filtroAtivo, subfiltroAplicacao]);

  if (prontuarioVazio && eventosFiltrados.length === 0) {
    return (
      <section className="min-w-0">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-gray-400 dark:text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {variant === 'nutricionista'
              ? 'Nenhum registro nutricional ainda'
              : 'Prontuário ainda sem eventos clínicos registrados'}
          </h4>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            {variant === 'nutricionista'
              ? 'Registre uma consulta ou aguarde o paciente usar o módulo Nutri (anamnese, check-ins, ChatNutri).'
              : 'Os registros aparecerão automaticamente conforme consultas, aplicações, exames e evolução do paciente forem documentados.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex flex-wrap gap-1.5 items-center">
        {filtrosExibidos.map((filtro) => {
          const ativo = filtroAtivo === filtro.id;
          return (
            <span key={filtro.id} className="inline-flex items-center gap-0">
              <button
                type="button"
                onClick={() => setFiltroAtivo(filtro.id)}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap ${
                  ativo
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${filtro.id === 'aplicacoes' && ativo ? 'rounded-l-full rounded-r-none border-r-0' : 'rounded-full'}`}
              >
                {filtro.label}
              </button>
              {filtro.id === 'aplicacoes' && ativo && (
                <>
                  <button
                    type="button"
                    onClick={() => setSubfiltroAplicacao('atuais')}
                    className={`px-2 py-1 text-[11px] font-medium border-y transition-colors whitespace-nowrap ${
                      subfiltroAplicacao === 'atuais'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-600'
                    }`}
                  >
                    Atuais
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroAplicacao('todas')}
                    className={`px-2 py-1 text-[11px] font-medium border rounded-r-full transition-colors whitespace-nowrap ${
                      subfiltroAplicacao === 'todas'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-600'
                    }`}
                  >
                    Todas
                  </button>
                </>
              )}
            </span>
          );
        })}
      </div>

      {eventosFiltrados.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
          {filtroAtivo === 'todos'
            ? 'Nenhum evento clínico registrado ainda.'
            : 'Nenhum evento encontrado para este filtro.'}
        </p>
      ) : (
        <ul className="relative space-y-0">
          {eventosFiltrados.map((evento, index) => {
            const linhasDados = evento.dados ? formatDadosLinhas(evento.dados) : [];
            const isLast = index === eventosFiltrados.length - 1;
            const dateParts = parseDateParts(evento.data, evento.hora);

            return (
              <li
                key={evento.id}
                className={`relative grid grid-cols-[80px_20px_1fr] sm:grid-cols-[100px_24px_1fr] gap-2 sm:gap-3 ${isLast ? 'pb-0' : 'pb-6'}`}
              >
                {/* Card de data à esquerda */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 px-2 py-1.5 text-center self-start">
                  {dateParts ? (
                    <>
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase leading-tight">{dateParts.mesAno}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{dateParts.dia}</p>
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">{dateParts.diaSemana}</p>
                      {dateParts.hora && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5 tabular-nums">{dateParts.hora}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{evento.data}</p>
                  )}
                </div>

                {/* Marcador + linha vertical */}
                <div className="relative flex justify-center">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute top-5 bottom-[-24px] left-1/2 -translate-x-1/2 w-px bg-gray-200 dark:bg-gray-700"
                    />
                  )}
                  <span className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full ring-4 ring-white dark:ring-gray-900 shadow-sm ${DOT_COR_TIPO[evento.tipo]}`} />
                </div>

                {/* Card do evento */}
                <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${BADGE_POR_TIPO[evento.tipo]}`}
                    >
                      {LABEL_TIPO[evento.tipo]}
                    </span>
                    {evento.origem && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {LABEL_ORIGEM[evento.origem]}
                      </span>
                    )}
                    <span className="ml-auto text-gray-300 dark:text-gray-600 text-sm leading-none select-none cursor-default" title="Ações">⋮</span>
                  </div>

                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{evento.titulo}</h5>

                  {ehConsultaComSecoes(evento) ? (
                    <>
                      {linhasDados.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {linhasDados.map((linha) => (
                            <span
                              key={linha}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700 rounded-lg px-2.5 py-1"
                            >
                              <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                              {linha}
                            </span>
                          ))}
                        </div>
                      )}

                      {evento.dados?.meta && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 px-3 py-1.5">
                          <span className="text-[11px]">🏁</span>
                          <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{evento.dados.meta}</span>
                        </div>
                      )}

                      <div className="mt-2.5 space-y-2">
                        {parseDescricaoConsulta(evento.descricao).map((secao, i) => (
                          <div key={i} className="rounded-lg bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 px-3 py-2">
                            {secao.label && (
                              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                                {secao.label}
                              </p>
                            )}
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{secao.texto}</p>
                          </div>
                        ))}
                      </div>

                      {evento.destaque && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{evento.destaque}</span>
                        </div>
                      )}
                    </>
                  ) : evento.tipo === 'marco_zero' && evento.dados?.marcoZero ? (
                    <>
                      <MarcoZeroTimelineCard
                        marcoZero={evento.dados.marcoZero}
                        dataInicio={evento.data}
                      />
                      {evento.destaque && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{evento.destaque}</span>
                        </div>
                      )}
                    </>
                  ) : evento.tipo === 'conclusao_tratamento' && evento.dados?.conclusaoTratamento ? (
                    <>
                      <ConclusaoTratamentoTimelineCard conclusao={evento.dados.conclusaoTratamento} />
                      {evento.destaque && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/50 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                          <span className="text-xs font-medium text-teal-800 dark:text-teal-300">{evento.destaque}</span>
                        </div>
                      )}
                    </>
                  ) : evento.tipo === 'aplicacao' && ehAplicacaoComPainel(evento.dados) ? (
                    <>
                      <AplicacaoTimelineCard
                        dados={evento.dados!}
                        descricao={evento.descricao}
                        fotosProgresso={fotosProgresso}
                      />
                      {evento.destaque && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{evento.destaque}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap">{evento.descricao}</p>

                      {evento.destaque && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{evento.destaque}</span>
                        </div>
                      )}

                      {linhasDados.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {linhasDados.map((linha) => (
                            <span
                              key={linha}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700 rounded-lg px-2.5 py-1"
                            >
                              <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                              {linha}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Rodapé: links e ações */}
                  {((evento.tipo === 'exame_solicitado' || evento.tipo === 'exame_resultado') && onIrParaAba) ||
                    (evento.id.startsWith('prescricao-') && onDownloadPrescricao) ||
                    (evento.id.startsWith('solicitacao-exame-') && onDownloadSolicitacaoExames) ||
                    (onApagar && resolverPodeApagar(evento)) ? (
                    <div className="mt-3 flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-700/60">
                      {(evento.tipo === 'exame_solicitado' || evento.tipo === 'exame_resultado') && onIrParaAba && (
                        <button
                          type="button"
                          onClick={() => onIrParaAba(4)}
                          className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors py-1"
                        >
                          Ver na aba Exames →
                        </button>
                      )}
                      {evento.id.startsWith('prescricao-') && onDownloadPrescricao && (
                        <button
                          type="button"
                          onClick={() => onDownloadPrescricao(evento.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                          </svg>
                          Baixar Prescrição
                        </button>
                      )}
                      {evento.id.startsWith('solicitacao-exame-') && onDownloadSolicitacaoExames && (
                        <button
                          type="button"
                          onClick={() => onDownloadSolicitacaoExames(evento.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                          </svg>
                          Baixar Solicitação
                        </button>
                      )}
                      {onApagar && resolverPodeApagar(evento) && (
                        confirmandoApagar === evento.id ? (
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">Apagar?</span>
                            <button
                              type="button"
                              onClick={() => { void onApagar(evento.id); setConfirmandoApagar(null); }}
                              className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoApagar(null)}
                              className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmandoApagar(evento.id)}
                            className="ml-auto p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Apagar registro"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.79.713l.5 7a.75.75 0 01-1.498.107l-.5-7a.75.75 0 01.708-.82zm3.632.713a.75.75 0 10-1.497-.106l-.5 7a.75.75 0 101.498.106l.5-7z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

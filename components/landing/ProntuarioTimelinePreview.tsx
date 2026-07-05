'use client';

import React from 'react';
import {
  EVENTO_TIMELINE_LABELS,
  type EventoTimelineDados,
  type EventoTimelineMock,
  type EventoTimelineOrigem,
  type EventoTimelineTipo,
} from '@/app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes';
import { PRONTUARIO_DEMO_EVENTOS } from '@/components/landing/prontuarioDemoData';

const BADGE_POR_TIPO: Record<EventoTimelineTipo, string> = {
  consulta: 'bg-blue-50 text-blue-800 border-blue-200',
  aplicacao: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  peso: 'bg-violet-50 text-violet-800 border-violet-200',
  cintura: 'bg-rose-50 text-rose-800 border-rose-200',
  exame_solicitado: 'bg-amber-50 text-amber-800 border-amber-200',
  exame_resultado: 'bg-orange-50 text-orange-800 border-orange-200',
  prescricao: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  pagamento: 'bg-teal-50 text-teal-800 border-teal-200',
  aniversario: 'bg-pink-50 text-pink-800 border-pink-200',
  bioimpedancia: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  observacao: 'bg-gray-100 text-gray-800 border-gray-200',
  ia: 'bg-purple-50 text-purple-800 border-purple-200',
  nutricao: 'bg-lime-50 text-lime-800 border-lime-200',
  atividade_fisica: 'bg-sky-50 text-sky-800 border-sky-200',
  imagem: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  sistema_importante: 'bg-red-50 text-red-800 border-red-200',
  lembrete: 'bg-orange-50 text-orange-800 border-orange-200',
};

const DOT_COR_TIPO: Record<EventoTimelineTipo, string> = {
  consulta: 'bg-blue-500',
  aplicacao: 'bg-emerald-500',
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

const LABEL_ORIGEM: Record<EventoTimelineOrigem, string> = {
  medico: 'Médico',
  paciente: 'Paciente',
  sistema: 'Sistema',
  nutri: 'Nutrição',
  personal: 'Personal',
  admin: 'Admin',
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SECOES_CONSULTA_LABELS: Record<string, string> = {
  Evolução: 'Evolução',
  'Sintomas/efeitos adversos': 'Sintomas / Efeitos adversos',
  'Conduta/plano': 'Conduta / Plano',
  Meta: 'Meta até próxima consulta',
};

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

function formatDadosLinhas(dados: EventoTimelineDados): string[] {
  const linhas: string[] = [];
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

function parseDescricaoConsulta(descricao: string): { label: string; texto: string }[] {
  const secoes: { label: string; texto: string }[] = [];
  for (const linha of descricao.split('\n')) {
    const match = linha.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const chave = match[1].trim();
      secoes.push({ label: SECOES_CONSULTA_LABELS[chave] ?? chave, texto: match[2].trim() });
    } else if (linha.trim()) {
      secoes.push({ label: '', texto: linha.trim() });
    }
  }
  return secoes;
}

function ehConsultaComSecoes(evento: EventoTimelineMock): boolean {
  return evento.tipo === 'consulta' && evento.descricao.includes(':');
}

function TimelineEventCard({ evento, isLast }: { evento: EventoTimelineMock; isLast: boolean }) {
  const linhasDados = evento.dados ? formatDadosLinhas(evento.dados) : [];
  const dateParts = parseDateParts(evento.data, evento.hora);

  return (
    <li
      className={`relative grid grid-cols-[72px_18px_1fr] sm:grid-cols-[88px_22px_1fr] gap-2 sm:gap-2.5 ${isLast ? 'pb-0' : 'pb-5'}`}
    >
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-1.5 py-1.5 text-center self-start">
        {dateParts ? (
          <>
            <p className="text-[9px] font-medium text-gray-400 uppercase leading-tight">{dateParts.mesAno}</p>
            <p className="text-lg font-bold text-gray-900 leading-tight mt-0.5">{dateParts.dia}</p>
            <p className="text-[9px] font-medium text-gray-500 leading-tight">{dateParts.diaSemana}</p>
            {dateParts.hora && (
              <p className="text-[9px] text-gray-400 leading-tight mt-0.5 tabular-nums">{dateParts.hora}</p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-gray-500 tabular-nums">{evento.data}</p>
        )}
      </div>

      <div className="relative flex justify-center">
        {!isLast && (
          <span
            aria-hidden="true"
            className="absolute top-4 bottom-[-20px] left-1/2 -translate-x-1/2 w-px bg-gray-200"
          />
        )}
        <span
          className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-[3px] ring-white shadow-sm ${DOT_COR_TIPO[evento.tipo]}`}
        />
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${BADGE_POR_TIPO[evento.tipo]}`}
          >
            {EVENTO_TIMELINE_LABELS[evento.tipo]}
          </span>
          {evento.origem && (
            <span className="text-[10px] text-gray-400 font-medium">{LABEL_ORIGEM[evento.origem]}</span>
          )}
        </div>

        <h5 className="text-[13px] font-semibold text-gray-900 leading-snug">{evento.titulo}</h5>

        {ehConsultaComSecoes(evento) ? (
          <>
            {linhasDados.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {linhasDados.map((linha) => (
                  <span
                    key={linha}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-700 bg-gray-50 border border-gray-200/80 rounded-md px-2 py-0.5"
                  >
                    <span className="h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {linha}
                  </span>
                ))}
              </div>
            )}
            {evento.dados?.meta && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1">
                <span className="text-[10px]">🏁</span>
                <span className="text-[11px] font-medium text-blue-800">{evento.dados.meta}</span>
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              {parseDescricaoConsulta(evento.descricao).map((secao, i) => (
                <div key={i} className="rounded-md bg-gray-50/80 border border-gray-100 px-2.5 py-1.5">
                  {secao.label && (
                    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      {secao.label}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-700 leading-relaxed">{secao.texto}</p>
                </div>
              ))}
            </div>
            {evento.destaque && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium text-emerald-800">{evento.destaque}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{evento.descricao}</p>
            {evento.destaque && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium text-emerald-800">{evento.destaque}</span>
              </div>
            )}
            {linhasDados.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {linhasDados.map((linha) => (
                  <span
                    key={linha}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-700 bg-gray-50 border border-gray-200/80 rounded-md px-2 py-0.5"
                  >
                    <span className="h-1 w-1 rounded-full bg-gray-400 shrink-0" />
                    {linha}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function ProntuarioTimelinePreview() {
  return (
    <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white shadow-lg shadow-black/[0.06] overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#E5E7EB] bg-[#F7F7F7]/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#22C55E]/15">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-[18px] h-[18px] text-[#16A34A]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1D1D1D] truncate">Prontuário compartilhado</p>
            <p className="text-[11px] text-[#5A5A5A] truncate">Mesma jornada · Mesmos dados · Mesma equipe</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[#16A34A] bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full px-2.5 py-1">
          Exemplo
        </span>
      </div>

      <div className="relative px-3 py-4 sm:px-4 sm:py-5 max-h-[min(520px,62vh)] overflow-y-auto">
        <ul className="relative space-y-0">
          {PRONTUARIO_DEMO_EVENTOS.map((evento, index) => (
            <TimelineEventCard
              key={evento.id}
              evento={evento}
              isLast={index === PRONTUARIO_DEMO_EVENTOS.length - 1}
            />
          ))}
        </ul>
        <div
          className="pointer-events-none sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent -mb-4"
          aria-hidden
        />
      </div>
    </div>
  );
}

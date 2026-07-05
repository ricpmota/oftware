'use client';

import { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { checkInSemanalParaExibicao } from '@/lib/aplicacao/checkInSemanalResumo';
import { toneVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import { CheckInSemanalScoreCard } from '@/components/aplicacao/CheckInSemanalScoreCard';
import type { CheckInSemanalScoreResultado } from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import {
  ProgressPhotosCarouselModal,
  type FotoProgressoCarousel,
} from '@/components/progressPhotos/ProgressPhotosCarouselModal';
import { MarcoZeroTimelineCard } from './MarcoZeroTimelineCard';
import type { EventoTimelineDados } from './prontuarioTypes';

type Props = {
  dados: EventoTimelineDados;
  descricao?: string;
  fotosProgresso?: FotoProgressoCarousel[];
};

function ChipMedida({
  label,
  valor,
  tone = 'slate',
}: {
  label: string;
  valor: string;
  tone?: 'slate' | 'violet' | 'rose' | 'sky' | 'emerald' | 'positivo' | 'atencao' | 'neutro';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
    violet: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-200',
    rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200',
    sky: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
    positivo:
      'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    atencao:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    neutro: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 min-w-[88px] ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-bold tabular-nums leading-tight mt-0.5">{valor}</p>
    </div>
  );
}

function parseVariacaoNumero(valor?: string): number | null {
  if (!valor) return null;
  const match = valor.match(/([+-]?\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

export function ehAplicacaoComPainel(dados?: EventoTimelineDados): boolean {
  if (!dados) return false;
  return !!(
    dados.semana != null ||
    dados.peso ||
    dados.cintura ||
    dados.dose ||
    dados.localAplicacao ||
    dados.checkInSemanal ||
    dados.checkInSemanalScore ||
    dados.marcoZero ||
    dados.variacaoPeso ||
    dados.variacaoCircunferencia
  );
}

function scoreTimelineParaCard(
  score: NonNullable<EventoTimelineDados['checkInSemanalScore']>
): CheckInSemanalScoreResultado {
  return {
    score: score.score,
    categoria: score.categoria as CheckInSemanalScoreResultado['categoria'],
    medalha: score.medalha as CheckInSemanalScoreResultado['medalha'],
    titulo: score.titulo,
    mensagemPaciente: score.mensagemPaciente ?? '',
    pontos: {},
    fatoresPositivos: score.fatoresPositivos ?? [],
    pontosDeAtencao: score.pontosDeAtencao ?? [],
  };
}

export function AplicacaoTimelineCard({ dados, descricao, fotosProgresso = [] }: Props) {
  const [modalFotosAberto, setModalFotosAberto] = useState(false);

  const checkInItens = dados.checkInSemanal
    ? checkInSemanalParaExibicao(dados.checkInSemanal)
    : [];
  const comentario = checkInItens.find((item) => item.key === 'comentarioSemana');
  const perguntasCheckIn = checkInItens.filter((item) => item.key !== 'comentarioSemana');

  const fotosDaSemana = useMemo(() => {
    if (dados.semana == null) return [];
    return fotosProgresso.filter((f) => f.semana === dados.semana);
  }, [fotosProgresso, dados.semana]);

  const temFotosSemana = fotosDaSemana.length > 0;

  return (
    <div className="mt-2 space-y-3">
      {descricao?.trim() ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
      ) : null}

      <div className="flex flex-wrap items-start gap-2">
        {dados.semana != null && (
          <ChipMedida label="Semana" valor={String(dados.semana)} tone="emerald" />
        )}
        {dados.dose && <ChipMedida label="Dose" valor={dados.dose} tone="sky" />}
        {dados.peso && <ChipMedida label="Peso" valor={dados.peso} tone="violet" />}
        {dados.cintura && <ChipMedida label="Cintura" valor={dados.cintura} tone="rose" />}
        {dados.variacaoPeso && (
          <ChipMedida
            label="Δ Peso"
            valor={dados.variacaoPeso}
            tone={toneVariacaoMedida(parseVariacaoNumero(dados.variacaoPeso))}
          />
        )}
        {dados.variacaoCircunferencia && (
          <ChipMedida
            label="Δ Abdominal"
            valor={dados.variacaoCircunferencia}
            tone={toneVariacaoMedida(parseVariacaoNumero(dados.variacaoCircunferencia))}
          />
        )}
        {dados.localAplicacao && (
          <ChipMedida label="Local" valor={dados.localAplicacao} tone="slate" />
        )}
        {temFotosSemana && (
          <button
            type="button"
            onClick={() => setModalFotosAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            aria-label={`Ver fotos da semana ${dados.semana}`}
            title="Ver fotos de evolução"
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-semibold">Fotos</span>
          </button>
        )}
      </div>

      {dados.medicamento && !dados.dose && (
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{dados.medicamento}</p>
      )}

      {dados.checkInSemanalScore && (
        <CheckInSemanalScoreCard
          score={scoreTimelineParaCard(dados.checkInSemanalScore)}
          variant="prontuario"
        />
      )}

      {dados.marcoZero && <MarcoZeroTimelineCard marcoZero={dados.marcoZero} />}

      {perguntasCheckIn.length > 0 && (
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
              ✓
            </span>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
              Check-in semanal do paciente
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {perguntasCheckIn.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-white/80 dark:border-emerald-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 shadow-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-snug">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 leading-snug">
                  {item.valor}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {comentario && (
        <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">
            Comentário do paciente
          </p>
          <p className="text-xs text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
            {comentario.valor}
          </p>
        </div>
      )}

      {dados.status && dados.status !== 'Registro manual' && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{dados.status}</span>
        </div>
      )}

      <ProgressPhotosCarouselModal
        aberto={modalFotosAberto}
        onFechar={() => setModalFotosAberto(false)}
        titulo="Fotos de evolução"
        subtitulo={
          dados.semana != null ? `Semana ${dados.semana} — compartilhadas pelo paciente` : undefined
        }
        fotos={fotosProgresso}
        semanaFiltro={dados.semana}
      />
    </div>
  );
}

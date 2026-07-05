'use client';

import { useState } from 'react';
import {
  Activity,
  Apple,
  Edit,
  History,
  Loader2,
  Moon,
  Pill,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { AnamneseInteligenteV3, DadosClinicos, PacienteCompleto } from '@/types/obesidade';
import { buildPerfilMetabolicoCards, getTipoAvaliacaoBadge } from '@/lib/meta/perfilMetabolicoV3Display';
import { PerfilMetabolicoCardEditModal } from '@/components/metaadmin/PerfilMetabolicoCardEditModal';

const CARD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sono: Moon,
  atividade: Activity,
  alimentacao: Apple,
  energia: Zap,
  historico: History,
  medicamentos: Pill,
  barreiras: ShieldAlert,
  expectativa: Target,
};

const SEVERIDADE_CLASS: Record<string, string> = {
  baixa: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  moderada: 'bg-amber-50 text-amber-900 border-amber-200',
  alta: 'bg-rose-50 text-rose-900 border-rose-200',
};

const CONFIANCA_CLASS: Record<string, string> = {
  baixo: 'bg-gray-100 text-gray-700',
  moderado: 'bg-amber-100 text-amber-900',
  alto: 'bg-emerald-100 text-emerald-900',
};

type Props = {
  pacienteId?: string;
  paciente?: PacienteCompleto | null;
  dadosClinicos?: DadosClinicos;
  /** Liberado pelo metaadmingeral (switch por médico). */
  anamneseInteligenteAtivo?: boolean;
  /** Quando false, oculta botão e mensagens de geração (ex.: metanutri). */
  allowGerarAnalise?: boolean;
  className?: string;
  onAnamneseInteligenteUpdated?: (inteligencia: AnamneseInteligenteV3) => void;
  /** Quando informado, exibe botão Editar nos cards e persiste alterações no estado do paciente. */
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
};

export function PerfilMetabolicoInteligenteSection({
  pacienteId,
  paciente,
  dadosClinicos,
  anamneseInteligenteAtivo = false,
  allowGerarAnalise = true,
  className = '',
  onAnamneseInteligenteUpdated,
  setPaciente,
}: Props) {
  const pm = dadosClinicos?.perfilMetabolicoV3;
  const cards = buildPerfilMetabolicoCards(pm);
  const badge = getTipoAvaliacaoBadge(dadosClinicos?.tipoAvaliacaoInicial);
  const ia = dadosClinicos?.anamneseInteligenteV3;

  const [gerando, setGerando] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);
  const [cardEmEdicao, setCardEmEdicao] = useState<{ id: string; title: string } | null>(null);

  const handleGerarAnalise = async () => {
    if (gerando) return;
    if (!anamneseInteligenteAtivo) {
      setErroIa(
        'Análise inteligente não está ativa para sua conta. Solicite a liberação ao administrador do sistema.'
      );
      return;
    }
    if (!pacienteId?.trim()) {
      setErroIa('Salve o paciente antes de gerar a análise.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setErroIa('Faça login novamente para gerar a análise.');
      return;
    }
    setGerando(true);
    setErroIa(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/meta/anamnese-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          idToken,
          paciente: paciente ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json.error === 'string'
            ? json.error
            : 'Não foi possível gerar a análise.';
        setErroIa(msg);
        return;
      }
      if (json.anamneseInteligenteV3) {
        onAnamneseInteligenteUpdated?.(json.anamneseInteligenteV3 as AnamneseInteligenteV3);
      }
    } catch (e) {
      setErroIa(e instanceof Error ? e.message : 'Erro de conexão.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <section
      className={`rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 to-white p-4 md:p-5 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-gray-900 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end">
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {badge && (
            <span
              className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          {allowGerarAnalise &&
            (anamneseInteligenteAtivo ? (
              <button
                type="button"
                disabled={gerando || !pacienteId}
                onClick={() => void handleGerarAnalise()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar análise inteligente
              </button>
            ) : (
              <p className="max-w-xs text-right text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Análise inteligente não contratada. Peça liberação ao administrador.
              </p>
            ))}
        </div>
      </div>

      {erroIa && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {erroIa}
        </div>
      )}

      {ia && (
        <div className="mb-4 space-y-3">
          <article className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-gray-800/80">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo inteligente</h5>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CONFIANCA_CLASS[ia.nivelConfianca] || CONFIANCA_CLASS.baixo}`}
              >
                Confiança {ia.nivelConfianca}
              </span>
              {ia.geradoEm && (
                <span className="text-[10px] text-gray-500">
                  {new Date(ia.geradoEm).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{ia.resumoMedico}</p>
            {ia.perfilComportamental && (
              <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Perfil comportamental: </span>
                {ia.perfilComportamental}
              </p>
            )}
          </article>

          {(ia.highlights ?? []).length > 0 && (
            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
              <h5 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Highlights</h5>
              <ul className="space-y-2">
                {(ia.highlights ?? []).map((h, i) => (
                  <li
                    key={`${h.tipo}-${i}`}
                    className={`rounded-lg border px-3 py-2 ${SEVERIDADE_CLASS[h.severidade] || SEVERIDADE_CLASS.baixa}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide">{h.tipo}</span>
                      <span className="text-xs opacity-75">· {h.severidade}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{h.titulo}</p>
                    <p className="text-xs leading-snug opacity-90">{h.descricao}</p>
                  </li>
                ))}
              </ul>
              {ia.barreirasAdesao.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Barreiras de adesão (IA)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(ia.barreirasAdesao ?? []).map((b) => (
                      <span
                        key={b}
                        className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}

          {(ia.pontosMedicoInvestigar ?? []).length > 0 && (
            <article className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
              <h5 className="mb-2 text-sm font-semibold text-sky-900 dark:text-sky-100">Pontos para investigar</h5>
              <ul className="list-disc space-y-1 pl-4 text-sm text-sky-950 dark:text-sky-100">
                {(ia.pontosMedicoInvestigar ?? []).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          )}
        </div>
      )}

      {allowGerarAnalise && anamneseInteligenteAtivo && !ia && !gerando && !erroIa && (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Use o botão acima para gerar resumo e highlights com IA (não é automático).
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = CARD_ICONS[card.id] || Target;
          return (
            <article
              key={card.id}
              className="rounded-lg border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h5 className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h5>
                {setPaciente && paciente && (
                  <button
                    type="button"
                    onClick={() => setCardEmEdicao({ id: card.id, title: card.title })}
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-violet-700 dark:hover:bg-gray-700 dark:hover:text-violet-300"
                    aria-label={`Editar ${card.title}`}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
              {card.informed && card.chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {card.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Não informado</p>
              )}
            </article>
          );
        })}
      </div>

      {cardEmEdicao && paciente && setPaciente && (
        <PerfilMetabolicoCardEditModal
          open
          cardId={cardEmEdicao.id}
          cardTitle={cardEmEdicao.title}
          paciente={paciente}
          onClose={() => setCardEmEdicao(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setCardEmEdicao(null);
          }}
        />
      )}
    </section>
  );
}

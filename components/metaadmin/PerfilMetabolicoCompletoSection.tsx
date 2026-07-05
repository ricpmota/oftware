'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Apple,
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
import { buildAnamneseV2Cards } from '@/lib/meta/anamneseV2Display';
import { buildPerfilMetabolicoCards, getTipoAvaliacaoBadge } from '@/lib/meta/perfilMetabolicoV3Display';
import { AnamneseV2CardEditModal } from '@/components/metaadmin/AnamneseV2CardEditModal';
import { PerfilMetabolicoCardEditModal } from '@/components/metaadmin/PerfilMetabolicoCardEditModal';
import {
  AnamneseIcons,
  AnamneseSectionCard,
} from '@/components/metaadmin/paciente-modal/anamneseSectionUi';
import { AnamneseTopicCard, type AnamneseTopicCardData } from '@/components/metaadmin/paciente-modal/AnamneseTopicCard';
import type { AnamneseV2SectionId } from '@/components/meta/AnamneseV2EditUI';

const V2_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  motivacao: AnamneseIcons.motivacao,
  diagnostico: AnamneseIcons.diagnostico,
  comorbidades: AnamneseIcons.comorbidades,
  medicacoes: AnamneseIcons.medicacoes,
  alergias: AnamneseIcons.alergias,
  riscos: AnamneseIcons.riscos,
  tireoide: AnamneseIcons.tireoide,
  sintomasGi: AnamneseIcons.sintomasGi,
};

const V3_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

type EditState =
  | { kind: 'v2'; id: AnamneseV2SectionId; title: string }
  | { kind: 'v3'; id: string; title: string };

type Props = {
  pacienteId?: string;
  paciente: PacienteCompleto;
  dadosClinicos?: DadosClinicos;
  anamneseInteligenteAtivo?: boolean;
  allowGerarAnalise?: boolean;
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
  onAnamneseInteligenteUpdated?: (inteligencia: AnamneseInteligenteV3) => void;
};

export function PerfilMetabolicoCompletoSection({
  pacienteId,
  paciente,
  dadosClinicos,
  anamneseInteligenteAtivo = false,
  allowGerarAnalise = true,
  setPaciente,
  onAnamneseInteligenteUpdated,
}: Props) {
  const badge = getTipoAvaliacaoBadge(dadosClinicos?.tipoAvaliacaoInicial);
  const ia = dadosClinicos?.anamneseInteligenteV3;

  const allCards = useMemo(() => {
    const v2 = buildAnamneseV2Cards(dadosClinicos, paciente.dadosIdentificacao?.sexoBiologico).map((c) => ({
      ...c,
      kind: 'v2' as const,
    }));
    const v3 = buildPerfilMetabolicoCards(dadosClinicos?.perfilMetabolicoV3).map((c) => ({
      ...c,
      kind: 'v3' as const,
    }));
    return [...v2, ...v3];
  }, [dadosClinicos, paciente.dadosIdentificacao?.sexoBiologico]);

  const [gerando, setGerando] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);
  const [editando, setEditando] = useState<EditState | null>(null);

  const handleGerarAnalise = async () => {
    if (gerando) return;
    if (!anamneseInteligenteAtivo) {
      setErroIa('Análise inteligente não está ativa para sua conta. Solicite a liberação ao administrador do sistema.');
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
        body: JSON.stringify({ pacienteId, idToken, paciente }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErroIa(typeof json.error === 'string' ? json.error : 'Não foi possível gerar a análise.');
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

  const iconFor = (card: AnamneseTopicCardData & { kind: 'v2' | 'v3' }) =>
    card.kind === 'v2' ? V2_ICONS[card.id] || Target : V3_ICONS[card.id] || Target;

  return (
    <AnamneseSectionCard sectionId="perfil-completo" title="Perfil metabólico completo" icon={Sparkles}>
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
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{erroIa}</div>
      )}

      {ia && (
        <div className="mb-4 space-y-3">
          <article className="rounded-lg border border-violet-200 bg-violet-50/30 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo inteligente</h5>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${CONFIANCA_CLASS[ia.nivelConfianca] || CONFIANCA_CLASS.baixo}`}
              >
                Confiança {ia.nivelConfianca}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">{ia.resumoMedico}</p>
          </article>
          {(ia.highlights ?? []).length > 0 && (
            <ul className="space-y-2">
              {(ia.highlights ?? []).map((h, i) => (
                <li
                  key={`${h.tipo}-${i}`}
                  className={`rounded-lg border px-3 py-2 text-sm ${SEVERIDADE_CLASS[h.severidade] || SEVERIDADE_CLASS.baixa}`}
                >
                  <span className="font-medium">{h.titulo}</span>
                  <p className="text-xs opacity-90">{h.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {allowGerarAnalise && anamneseInteligenteAtivo && !ia && !gerando && !erroIa && (
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Use o botão acima para gerar resumo e highlights com IA (não é automático).
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {allCards.map((card) => (
          <AnamneseTopicCard
            key={`${card.kind}-${card.id}`}
            card={card}
            icon={iconFor(card)}
            onEdit={
              setPaciente
                ? () =>
                    setEditando(
                      card.kind === 'v2'
                        ? { kind: 'v2', id: card.id as AnamneseV2SectionId, title: card.title }
                        : { kind: 'v3', id: card.id, title: card.title }
                    )
                : undefined
            }
          />
        ))}
      </div>

      {editando?.kind === 'v2' && setPaciente && (
        <AnamneseV2CardEditModal
          open
          sectionId={editando.id}
          cardTitle={editando.title}
          paciente={paciente}
          onClose={() => setEditando(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setEditando(null);
          }}
        />
      )}

      {editando?.kind === 'v3' && setPaciente && (
        <PerfilMetabolicoCardEditModal
          open
          cardId={editando.id}
          cardTitle={editando.title}
          paciente={paciente}
          onClose={() => setEditando(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setEditando(null);
          }}
        />
      )}
    </AnamneseSectionCard>
  );
}

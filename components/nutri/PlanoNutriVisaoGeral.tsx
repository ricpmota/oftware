'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Droplet,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  UtensilsCrossed,
} from 'lucide-react';
import type { AnamneseNutricionalSnapshot } from '@/lib/nutri/anamneseNutricional';
import {
  obterIntensidadeDesejadaDoSnapshot,
  rotuloIntensidadeDesejada,
} from '@/lib/nutri/anamneseNutricional';
import {
  REFEICOES_NUTRI_ORDEM,
  rotuloRefeicaoNutri,
  type DistribuicaoMetasRefeicoes,
} from '@/lib/nutri/distribuicaoMetasRefeicoes';
import { formatHydrationLiters } from '@/lib/nutri/hidratacao/hydrationMath';

type EstiloPlano =
  | 'digestiva'
  | 'plant_based'
  | 'mediterranea'
  | 'rico_proteina'
  | 'low_carb_moderada';

type ObjetivoPlano =
  | 'perda_peso'
  | 'recomposicao'
  | 'controle_glicemia'
  | 'melhora_disposicao'
  | 'manutencao';

type MetaEditavel = 'proteina' | 'agua' | 'energia';

export interface PlanoNutriVisaoGeralProps {
  estilo: EstiloPlano;
  descricaoEstilo?: string;
  criadoEm: string | Date;
  protDia_g: number;
  aguaDia_ml: number;
  /** Meta calórica persistida no plano (fonte do cardápio quando definida). */
  caloriasDia_kcal?: number;
  refeicoes: number;
  anamneseNutricional?: AnamneseNutricionalSnapshot;
  restricoesPaciente?: string[];
  preferenciasProteinaPaciente?: string[];
  distribuicaoMetas: DistribuicaoMetasRefeicoes | null;
  onRefazer?: () => void;
  modoNutricionista?: boolean;
  onSalvarMetas?: (metas: {
    protDia_g: number;
    aguaDia_ml: number;
    caloriasDia_kcal: number | null;
  }) => Promise<void> | void;
}

function rotuloEstilo(estilo: EstiloPlano): string {
  const mapa: Record<EstiloPlano, string> = {
    digestiva: 'Digestiva',
    plant_based: 'Plant-based',
    mediterranea: 'Mediterrânea',
    rico_proteina: 'Rica em proteína',
    low_carb_moderada: 'Low carb moderada',
  };
  return mapa[estilo] || estilo;
}

function rotuloObjetivo(objetivo: ObjetivoPlano | string | undefined): string | null {
  if (!objetivo) return null;
  const mapa: Record<string, string> = {
    perda_peso: 'Perda de peso',
    recomposicao: 'Recomposição corporal',
    controle_glicemia: 'Controle glicêmico',
    melhora_disposicao: 'Mais disposição',
    manutencao: 'Manutenção',
  };
  return mapa[objetivo] || null;
}

/** Valor do input em litros (ex.: 2800 ml → "2.8"). A persistência continua em ml. */
function mlParaCampoLitros(ml: number): string {
  const litros = Math.round(ml) / 1000;
  return litros.toLocaleString('en-US', {
    maximumFractionDigits: 3,
    useGrouping: false,
  });
}

function rotuloRestricao(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes('vegan')) return 'Vegano';
  if (t.includes('vegetari')) return 'Vegetariano';
  if (t.includes('lactose')) return 'Sem lactose';
  if (t.includes('glúten') || t.includes('gluten')) return 'Sem glúten';
  return raw;
}

export default function PlanoNutriVisaoGeral({
  estilo,
  descricaoEstilo,
  criadoEm,
  protDia_g,
  aguaDia_ml,
  caloriasDia_kcal,
  refeicoes,
  anamneseNutricional,
  restricoesPaciente = [],
  preferenciasProteinaPaciente = [],
  distribuicaoMetas,
  onRefazer,
  modoNutricionista = false,
  onSalvarMetas,
}: PlanoNutriVisaoGeralProps) {
  const dataCriacao = new Date(criadoEm).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const copos = Math.max(1, Math.round(aguaDia_ml / 250));
  const objetivo = rotuloObjetivo(anamneseNutricional?.objetivoPrincipal);
  const intensidadeRaw = obterIntensidadeDesejadaDoSnapshot(anamneseNutricional);
  const intensidade = intensidadeRaw ? rotuloIntensidadeDesejada(intensidadeRaw) : null;
  const metaKcalCalculada =
    distribuicaoMetas?.status === 'calculada' && distribuicaoMetas.metaCaloricaDiaKcal != null
      ? distribuicaoMetas.metaCaloricaDiaKcal
      : null;
  const metaKcal =
    typeof caloriasDia_kcal === 'number' && Number.isFinite(caloriasDia_kcal) && caloriasDia_kcal > 0
      ? Math.round(caloriasDia_kcal)
      : metaKcalCalculada;
  const chips = [
    objetivo ? { label: objetivo, tone: 'green' as const } : null,
    intensidade ? { label: intensidade, tone: 'teal' as const } : null,
    ...restricoesPaciente.slice(0, 4).map((r) => ({
      label: rotuloRestricao(r),
      tone: 'navy' as const,
    })),
    ...preferenciasProteinaPaciente.slice(0, 2).map((p) => ({
      label: p,
      tone: 'teal' as const,
    })),
  ].filter(Boolean) as { label: string; tone: 'green' | 'teal' | 'navy' }[];

  const maxKcalBar =
    distribuicaoMetas?.status === 'calculada'
      ? Math.max(
          ...REFEICOES_NUTRI_ORDEM.map((k) => distribuicaoMetas.refeicoes[k].caloriasAlvoKcal),
          1
        )
      : 1;

  const podeEditar = Boolean(modoNutricionista && onSalvarMetas);
  const [editando, setEditando] = useState<MetaEditavel | null>(null);
  const [draftValor, setDraftValor] = useState('');
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  useEffect(() => {
    setEditando(null);
    setDraftValor('');
  }, [protDia_g, aguaDia_ml, caloriasDia_kcal, metaKcalCalculada]);

  const iniciarEdicao = (campo: MetaEditavel) => {
    if (!podeEditar) return;
    const atual =
      campo === 'proteina'
        ? String(protDia_g)
        : campo === 'agua'
          ? mlParaCampoLitros(aguaDia_ml)
          : metaKcal == null
            ? ''
            : String(metaKcal);
    setEditando(campo);
    setDraftValor(atual);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setDraftValor('');
  };

  const confirmarEdicao = async () => {
    if (!onSalvarMetas || !editando) return;
    const parsed = Number(String(draftValor).replace(',', '.').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert('Informe um valor numérico válido maior que zero.');
      return;
    }
    const arredondado =
      editando === 'agua' ? Math.round(parsed * 1000) : Math.round(parsed);
    if (arredondado <= 0) {
      alert('Informe um valor numérico válido maior que zero.');
      return;
    }
    setSalvandoMeta(true);
    try {
      await onSalvarMetas({
        protDia_g: editando === 'proteina' ? arredondado : protDia_g,
        aguaDia_ml: editando === 'agua' ? arredondado : aguaDia_ml,
        caloriasDia_kcal:
          editando === 'energia'
            ? arredondado
            : metaKcal != null
              ? metaKcal
              : null,
      });
      setEditando(null);
      setDraftValor('');
    } finally {
      setSalvandoMeta(false);
    }
  };

  const botaoEditar = (campo: MetaEditavel) => {
    if (!podeEditar) return null;
    return (
      <button
        type="button"
        onClick={() => iniciarEdicao(campo)}
        className="ml-auto text-[10px] font-medium text-[#E8EDED]/45 hover:text-[#4CCB7A] transition-colors"
      >
        Editar
      </button>
    );
  };

  const campoEdicao = (
    unidade: string,
    opts?: { min?: number; step?: number }
  ) => (
    <div className="mt-1 space-y-2">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={opts?.min ?? 1}
          step={opts?.step ?? 1}
          value={draftValor}
          onChange={(e) => setDraftValor(e.target.value)}
          disabled={salvandoMeta}
          className="w-full rounded-lg border border-white/20 bg-black/30 px-2 py-1.5 text-sm font-semibold text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-[#4CCB7A]"
          autoFocus
        />
        <span className="shrink-0 text-xs text-[#E8EDED]/55">{unidade}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void confirmarEdicao()}
          disabled={salvandoMeta}
          className="text-[10px] font-semibold text-[#4CCB7A] hover:underline disabled:opacity-50"
        >
          {salvandoMeta ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={cancelarEdicao}
          disabled={salvandoMeta}
          className="text-[10px] font-medium text-[#E8EDED]/45 hover:text-[#E8EDED]/75 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#4CCB7A]/35 bg-[#0A1F44] text-[#E8EDED] shadow-[0_20px_50px_-28px_rgba(10,31,68,0.85)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 12% -10%, rgba(76,203,122,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 95% 10%, rgba(47,143,163,0.4), transparent 50%), linear-gradient(160deg, #0A1F44 0%, #0d2a52 48%, #0A1F44 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(232,237,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(232,237,237,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(180deg, black, transparent 85%)',
        }}
      />

      <div className="relative p-5 sm:p-7 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4CCB7A]/45 bg-[#4CCB7A]/15 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#4CCB7A]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Calculado para o seu perfil
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Plano Nutricional
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#E8EDED]/75">
                Estilo, metas e cardápio automático foram montados com base na sua anamnese,
                restrições, rotina e objetivos — não é um plano genérico.
              </p>
            </div>
            <p className="text-xs text-[#E8EDED]/55">Criado em {dataCriacao}</p>
          </div>

          {onRefazer ? (
            <button
              type="button"
              onClick={onRefazer}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#4CCB7A]/55 hover:bg-[#4CCB7A]/20"
            >
              <RotateCcw className="h-4 w-4 text-[#4CCB7A]" />
              Refazer Plano Nutri
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E8EDED]/55">
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#4CCB7A]" />
              Estilo
            </div>
            <p className="text-base sm:text-lg font-bold text-white leading-snug">
              {rotuloEstilo(estilo)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E8EDED]/55">
              <Activity className="h-3.5 w-3.5 text-[#4CCB7A]" />
              Proteína
              {editando !== 'proteina' && botaoEditar('proteina')}
            </div>
            {editando === 'proteina' ? (
              campoEdicao('g/dia')
            ) : (
              <p className="text-base sm:text-lg font-bold text-white tabular-nums">
                {protDia_g}
                <span className="text-sm font-semibold text-[#E8EDED]/65"> g/dia</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E8EDED]/55">
              <Droplet className="h-3.5 w-3.5 text-[#2F8FA3]" />
              Água
              {editando !== 'agua' && botaoEditar('agua')}
            </div>
            {editando === 'agua' ? (
              campoEdicao('L', { min: 0.1, step: 0.1 })
            ) : (
              <>
                <p className="text-base sm:text-lg font-bold text-white tabular-nums">
                  {formatHydrationLiters(aguaDia_ml).replace(/\s*L$/, '')}
                  <span className="text-sm font-semibold text-[#E8EDED]/65"> L</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#E8EDED]/50">≈ {copos} copos</p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E8EDED]/55">
              <Target className="h-3.5 w-3.5 text-[#2F8FA3]" />
              {metaKcal != null || editando === 'energia' ? 'Energia do dia' : 'Refeições'}
              {editando !== 'energia' && botaoEditar('energia')}
            </div>
            {editando === 'energia' ? (
              campoEdicao('kcal')
            ) : metaKcal != null ? (
              <>
                <p className="text-base sm:text-lg font-bold text-white tabular-nums">
                  {metaKcal.toLocaleString('pt-BR')}
                  <span className="text-sm font-semibold text-[#E8EDED]/65"> kcal</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#E8EDED]/50">{refeicoes} refeições</p>
              </>
            ) : (
              <p className="text-base sm:text-lg font-bold text-white">{refeicoes}</p>
            )}
          </div>
        </div>

        {(chips.length > 0 || descricaoEstilo) && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
              O que entrou no seu cálculo
            </div>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={`${chip.tone}-${chip.label}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      chip.tone === 'green'
                        ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-[#B8F0CC]'
                        : chip.tone === 'teal'
                          ? 'border-[#2F8FA3]/45 bg-[#2F8FA3]/15 text-[#A8D8E4]'
                          : 'border-white/20 bg-white/10 text-[#E8EDED]/90'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3 opacity-80" aria-hidden />
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
            {descricaoEstilo && (
              <p className="text-sm leading-relaxed text-[#E8EDED]/75">{descricaoEstilo}</p>
            )}
          </div>
        )}

        {distribuicaoMetas?.status === 'calculada' && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Distribuição do seu dia</p>
                <p className="text-xs text-[#E8EDED]/55">
                  Metas por refeição usadas na Opção 01 automática do Cardápio
                </p>
              </div>
              <p className="text-xs font-medium text-[#4CCB7A]">
                Proteína diária {distribuicaoMetas.proteinaDiariaG} g
              </p>
            </div>
            <div className="space-y-2.5">
              {REFEICOES_NUTRI_ORDEM.map((key) => {
                const m = distribuicaoMetas.refeicoes[key];
                const pct = Math.round((m.caloriasAlvoKcal / maxKcalBar) * 100);
                return (
                  <div key={key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[9rem_1fr_auto]">
                    <span className="truncate text-xs font-medium text-[#E8EDED]/80">
                      {rotuloRefeicaoNutri(key)}
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                    <span className="min-w-[5.5rem] text-right text-[11px] tabular-nums text-[#E8EDED]/65">
                      {m.caloriasAlvoKcal.toLocaleString('pt-BR')} kcal · {m.proteinaAlvoG} g
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

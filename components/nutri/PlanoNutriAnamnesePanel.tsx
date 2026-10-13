'use client';

import { useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Flame,
  Gauge,
  Scale,
  ShieldCheck,
  Target,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { AnamneseNutricionalSnapshot } from '@/lib/nutri/anamneseNutricional';
import {
  obterIntensidadeDesejadaDoSnapshot,
  rotuloIntensidadeDesejada,
} from '@/lib/nutri/anamneseNutricional';
import {
  montarDadosEnergeticosPaciente,
  rotuloBloqueioEnergetico,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import { calcularEstimativaTmb } from '@/lib/nutri/estimativaMetabolica';
import {
  calcularEstimativaGet,
  rotuloConfiancaAtividade,
  rotuloMotivoGetIndisponivel,
  rotuloNivelAtividadeEnergetica,
} from '@/lib/nutri/estimativaGastoEnergetico';
import {
  calcularEstrategiaEnergetica,
  rotuloAlertaEstrategia,
  rotuloIntensidadeAplicada,
  rotuloMotivoAjusteEstrategia,
  rotuloStatusEstrategia,
} from '@/lib/nutri/estrategiaEnergetica';
import {
  REFEICOES_NUTRI_ORDEM,
  calcularDistribuicaoMetasRefeicoes,
  rotuloAjusteDistribuicao,
  rotuloRefeicaoNutri,
} from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  obterMetasMontagemRefeicao,
  statusFaixaMontagem,
  rotuloTemplateMontagem,
  type GeracaoAutomaticaMeta,
  type OrigemOpcaoRefeicao,
} from '@/lib/nutri/montagemPratoPadrao';
import {
  rotuloGrupoProteina,
  type GrupoProteinaPaciente,
} from '@/lib/nutri/gruposProteicos';

type RefeicaoKey = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

type AnamneseSubTab = 'respostas' | 'energia' | 'distribuicao' | 'opcao01';

interface OpcaoSlotLike {
  calorias_kcal?: number;
  proteina_g?: number;
  origem?: OrigemOpcaoRefeicao;
  geracaoAutomatica?: GeracaoAutomaticaMeta;
}

export interface PlanoNutriAnamnesePanelProps {
  paciente: PacienteCompleto;
  plano: {
    protDia_g?: number;
    distribuicaoProteina?: {
      cafe: string;
      almoco: string;
      jantar: string;
      lanche1: string;
      lanche2: string;
    };
    anamneseNutricional?: AnamneseNutricionalSnapshot;
    restricoesPaciente?: string[];
    preferenciasProteinaPaciente?: string[];
    opcoesSlots?: Partial<Record<RefeicaoKey, OpcaoSlotLike[]>>;
  };
  modoNutricionista?: boolean;
}

const SUB_TABS: {
  id: AnamneseSubTab;
  label: string;
  shortLabel: string;
  profissional?: boolean;
}[] = [
  { id: 'respostas', label: 'Respostas', shortLabel: 'Respostas' },
  { id: 'energia', label: 'Energia', shortLabel: 'Energia', profissional: true },
  { id: 'distribuicao', label: 'Distribuição', shortLabel: 'Distr.', profissional: true },
  { id: 'opcao01', label: 'Opção 01', shortLabel: 'Opção 01', profissional: true },
];

function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function rotuloObjetivo(v: string | undefined): string {
  const mapa: Record<string, string> = {
    perda_peso: 'Perda de peso',
    recomposicao: 'Recomposição corporal',
    controle_glicemia: 'Controle glicêmico',
    melhora_disposicao: 'Mais disposição',
    manutencao: 'Manutenção',
  };
  return (v && mapa[v]) || '—';
}

function rotuloHorarioTrabalho(v: string | undefined): string {
  const mapa: Record<string, string> = {
    diurno: 'Diurno',
    noturno: 'Noturno',
    turnos: 'Turnos rotativos',
  };
  return (v && mapa[v]) || '—';
}

function rotuloHorasSentado(v: string | undefined): string {
  const mapa: Record<string, string> = {
    '<4h': 'Menos de 4 horas',
    '4-8h': '4 a 8 horas',
    '>8h': 'Mais de 8 horas',
  };
  return (v && mapa[v]) || '—';
}

function rotuloAtividade(v: string | undefined): string {
  const mapa: Record<string, string> = {
    nunca: 'Não pratica',
    '1-2x': '1–2× por semana',
    '3-4x': '3–4× por semana',
    '5-7x': '5–7× por semana',
  };
  return (v && mapa[v]) || '—';
}

function rotuloSono(v: string | undefined): string {
  const mapa: Record<string, string> = {
    '<6h': 'Menos de 6 horas',
    '6-8h': '6 a 8 horas',
    '>8h': 'Mais de 8 horas',
  };
  return (v && mapa[v]) || '—';
}

function rotuloHorarioDormir(v: string | undefined): string {
  const mapa: Record<string, string> = {
    '22-00': 'Entre 22h e 00h',
    '00-02': 'Entre 00h e 02h',
    depois_02h: 'Depois das 02h',
  };
  return (v && mapa[v]) || '—';
}

function rotuloAcorda(v: string | undefined): string {
  const mapa: Record<string, string> = {
    sim: 'Sim',
    nao: 'Não',
    as_vezes: 'Às vezes',
  };
  return (v && mapa[v]) || '—';
}

function rotuloRefeicoesDia(v: string | undefined): string {
  const mapa: Record<string, string> = {
    '2-3': '2 a 3 refeições',
    '4-5': '4 a 5 refeições',
    '>5': 'Mais de 5 refeições',
  };
  return (v && mapa[v]) || '—';
}

function rotuloAlcool(v: string | undefined): string {
  const mapa: Record<string, string> = {
    '0': 'Nenhuma',
    '1-3': '1 a 3 doses',
    '4-7': '4 a 7 doses',
    '>7': 'Mais de 7 doses',
  };
  return (v && mapa[v]) || '—';
}

function rotuloFimSemana(v: string | undefined): string {
  const mapa: Record<string, string> = {
    quase_nunca: 'Quase nunca',
    as_vezes: 'Às vezes',
    sempre: 'Sempre',
  };
  return (v && mapa[v]) || '—';
}

function rotuloSintomasGI(v: string | undefined): string {
  const mapa: Record<string, string> = {
    nenhum: 'Nenhum',
    leve: 'Leve',
    moderado: 'Moderado',
    grave: 'Grave',
  };
  return (v && mapa[v]) || '—';
}

function simNao(v: boolean | string | undefined): string {
  if (v === true || v === 'sim') return 'Sim';
  if (v === false || v === 'nao') return 'Não';
  return '—';
}

function MetricCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: typeof Flame;
}) {
  return (
    <div className="rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-white via-[#E8EDED]/50 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:via-[#0A1F44]/80 dark:to-[#2F8FA3]/20 p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
        <Icon className="h-3.5 w-3.5 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED] leading-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-[#0A1F44]/60 dark:text-[#E8EDED]/55">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
  Icon,
}: {
  title: string;
  children: ReactNode;
  Icon?: typeof ClipboardList;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-[#0A1F44]/55 p-4 sm:p-5 shadow-[0_8px_22px_-16px_rgba(10,31,68,0.35)]">
      <div className="mb-3 flex items-center gap-2">
        {Icon ? (
          <Icon className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
        ) : null}
        <h4 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function FactGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ScaleBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-[#0A1F44]/70 dark:text-[#E8EDED]/70">{label}</span>
        <span className="font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
          {value}/10
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#0A1F44]/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-[#0A1F44]/55 dark:text-[#E8EDED]/55">Nenhum informado</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-lg border border-[#2F8FA3]/25 bg-[#2F8FA3]/8 px-2.5 py-1 text-xs font-medium text-[#0A1F44] dark:border-[#4CCB7A]/30 dark:bg-[#4CCB7A]/10 dark:text-[#E8EDED]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok
          ? 'bg-[#4CCB7A]/15 text-[#0A1F44] dark:text-[#B8F0CC] border border-[#4CCB7A]/35'
          : 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/35'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden />
      ) : (
        <AlertTriangle className="h-3 w-3" aria-hidden />
      )}
      {label}
    </span>
  );
}

export default function PlanoNutriAnamnesePanel({
  paciente,
  plano,
  modoNutricionista = false,
}: PlanoNutriAnamnesePanelProps) {
  const calculosGerados = typeof plano.protDia_g === 'number' && plano.protDia_g > 0;
  const tabsVisiveis = SUB_TABS.filter((t) => {
    if (t.profissional && !modoNutricionista) return false;
    if (!calculosGerados && (t.id === 'distribuicao' || t.id === 'opcao01')) return false;
    return true;
  });
  const [subTab, setSubTab] = useState<AnamneseSubTab>(tabsVisiveis[0]?.id || 'respostas');
  const anamnese = plano.anamneseNutricional;

  const dadosEnergeticos = montarDadosEnergeticosPaciente(paciente, {
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
  });
  const estimativaTmb = calcularEstimativaTmb(dadosEnergeticos);
  const estimativaGet = calcularEstimativaGet(estimativaTmb, {
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
    horasSentado: anamnese?.horasSentado ?? null,
  });
  const intensidadeDesejada = obterIntensidadeDesejadaDoSnapshot(anamnese) ?? null;
  const estrategiaEnergetica = calcularEstrategiaEnergetica({
    get: estimativaGet,
    intensidadeDesejada,
    objetivoPrincipal: anamnese?.objetivoPrincipal ?? 'perda_peso',
    sexoBiologico: dadosEnergeticos.sexoBiologico,
    idadeAnos: dadosEnergeticos.idadeAnos,
    imcAtual: dadosEnergeticos.imcAtual,
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
    sintomasGI: anamnese?.sintomasGI ?? 'nenhum',
    efeitoSanfona: anamnese?.efeitoSanfona ?? 'nao',
    fomeEmocional: anamnese?.fomeEmocional ?? false,
    compulsaoNoturna: anamnese?.compulsaoNoturna ?? false,
    gestacaoConfirmada: paciente.dadosClinicos?.riscos?.gestacao === 'sim',
    lactacaoConfirmada: paciente.dadosClinicos?.riscos?.lactacao === 'sim',
  });
  const distribuicaoMetas = calcularDistribuicaoMetasRefeicoes({
    estrategiaEnergetica,
    proteinaDiariaG: calculosGerados ? plano.protDia_g! : 0,
    numeroRefeicoesDia: anamnese?.numeroRefeicoesDia ?? '4-5',
    horarioTrabalho: anamnese?.horarioTrabalho ?? 'diurno',
    fomeMatinal: anamnese?.fomeMatinal ?? 5,
    fomeNoturna: anamnese?.fomeNoturna ?? 5,
    pulaCafeManha: anamnese?.pulaCafeManha ?? false,
    chegaComMuitaFomeJantar: anamnese?.chegaComMuitaFomeJantar ?? false,
    compulsaoNoturna: anamnese?.compulsaoNoturna ?? false,
    sintomasGI: anamnese?.sintomasGI ?? 'nenhum',
    atividadeFisica: anamnese?.atividadeFisica ?? 'nunca',
    objetivoPrincipal: anamnese?.objetivoPrincipal ?? 'perda_peso',
  });

  const origemPeso =
    dadosEnergeticos.peso.origem === 'evolucao'
      ? 'Evolução'
      : dadosEnergeticos.peso.origem === 'medida_inicial'
        ? 'Medida inicial'
        : 'Indisponível';

  const preenchidaEm = anamnese?.preenchidaEm
    ? new Date(anamnese.preenchidaEm).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const maxKcalBar =
    distribuicaoMetas.status === 'calculada'
      ? Math.max(
          ...REFEICOES_NUTRI_ORDEM.map((k) => distribuicaoMetas.refeicoes[k].caloriasAlvoKcal),
          1
        )
      : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2F8FA3]/30 bg-gradient-to-br from-[#2F8FA3]/10 via-white to-[#4CCB7A]/10 dark:from-[#2F8FA3]/20 dark:via-[#0A1F44]/70 dark:to-[#4CCB7A]/15 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
              <h3 className="text-base font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                {calculosGerados ? 'Anamnese e cálculos do plano' : 'Anamnese nutricional'}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-[#0A1F44]/70 dark:text-[#E8EDED]/65 max-w-xl">
              {calculosGerados
                ? 'Respostas da anamnese nutricional e os cálculos gerados a partir delas para montar o plano e a Opção 01.'
                : 'Questionário respondido pelo paciente. Os cálculos do plano alimentar ainda não foram gerados.'}
            </p>
            {preenchidaEm ? (
              <p className="mt-2 text-[11px] text-[#0A1F44]/50 dark:text-[#E8EDED]/45">
                Preenchida em {preenchidaEm}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-4 grid gap-1.5 ${
            tabsVisiveis.length >= 4
              ? 'grid-cols-2 sm:grid-cols-4'
              : tabsVisiveis.length === 1
                ? 'grid-cols-1'
                : 'grid-cols-2 sm:grid-cols-3'
          }`}
          role="tablist"
          aria-label="Seções da anamnese"
        >
          {tabsVisiveis.map((tab) => {
            const ativo = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setSubTab(tab.id)}
                className={`rounded-lg px-2.5 py-2 text-center text-xs sm:text-sm font-semibold transition-all ${
                  ativo
                    ? 'bg-[#0A1F44] text-white shadow-sm dark:bg-[#4CCB7A] dark:text-[#0A1F44]'
                    : 'bg-white/80 text-[#0A1F44]/70 hover:bg-white dark:bg-white/5 dark:text-[#E8EDED]/70 dark:hover:bg-white/10'
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {subTab === 'respostas' && (
        <div className="space-y-4">
          {!anamnese ? (
            <SectionCard title="Sem anamnese registrada" Icon={AlertTriangle}>
              <p className="text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
                Este plano ainda não possui snapshot de anamnese. Refaça o Plano Nutri para capturar
                as respostas do paciente.
              </p>
            </SectionCard>
          ) : (
            <>
              <SectionCard title="Objetivo e intensidade" Icon={Target}>
                <FactGrid
                  items={[
                    {
                      label: 'Objetivo principal',
                      value: rotuloObjetivo(anamnese.objetivoPrincipal),
                    },
                    {
                      label: 'Intensidade desejada',
                      value: intensidadeDesejada
                        ? rotuloIntensidadeDesejada(intensidadeDesejada)
                        : 'Não informada (plano antigo)',
                    },
                  ]}
                />
              </SectionCard>

              <SectionCard title="Rotina e atividade" Icon={Activity}>
                <FactGrid
                  items={[
                    {
                      label: 'Horário de trabalho',
                      value: rotuloHorarioTrabalho(anamnese.horarioTrabalho),
                    },
                    {
                      label: 'Horas sentado',
                      value: rotuloHorasSentado(anamnese.horasSentado),
                    },
                    {
                      label: 'Atividade física',
                      value: rotuloAtividade(anamnese.atividadeFisica),
                    },
                    {
                      label: 'Refeições no dia',
                      value: rotuloRefeicoesDia(anamnese.numeroRefeicoesDia),
                    },
                  ]}
                />
              </SectionCard>

              <SectionCard title="Sono e recuperação" Icon={Gauge}>
                <FactGrid
                  items={[
                    { label: 'Horas de sono', value: rotuloSono(anamnese.sonoHoras) },
                    {
                      label: 'Horário de dormir',
                      value: rotuloHorarioDormir(anamnese.horarioDormir),
                    },
                    {
                      label: 'Acorda descansado',
                      value: rotuloAcorda(anamnese.acordaDescansado),
                    },
                  ]}
                />
              </SectionCard>

              <SectionCard title="Padrões de fome" Icon={Flame}>
                <div className="space-y-3">
                  <ScaleBar label="Fome matinal" value={anamnese.fomeMatinal} />
                  <ScaleBar label="Fome noturna" value={anamnese.fomeNoturna} />
                  <ScaleBar label="Vontade de doce" value={anamnese.vontadeDoce} />
                </div>
                <div className="mt-4">
                  <FactGrid
                    items={[
                      { label: 'Pula café da manhã', value: simNao(anamnese.pulaCafeManha) },
                      {
                        label: 'Chega com muita fome no jantar',
                        value: simNao(anamnese.chegaComMuitaFomeJantar),
                      },
                      { label: 'Fome emocional', value: simNao(anamnese.fomeEmocional) },
                      { label: 'Compulsão noturna', value: simNao(anamnese.compulsaoNoturna) },
                    ]}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Histórico e sintomas" Icon={Scale}>
                <FactGrid
                  items={[
                    {
                      label: 'Dieta nos últimos 12 meses',
                      value: simNao(anamnese.dietaUltimos12Meses),
                    },
                    {
                      label: 'Tipo de dieta',
                      value: anamnese.tipoDieta?.trim() || '—',
                    },
                    {
                      label: 'Efeito sanfona',
                      value:
                        anamnese.efeitoSanfona === 'sim'
                          ? `Sim${anamnese.kgSanfona != null ? ` (${fmtNum(anamnese.kgSanfona, 1)} kg)` : ''}`
                          : 'Não',
                    },
                    {
                      label: 'Peso máx. / mín. (2 anos)',
                      value:
                        anamnese.pesoMaximo2Anos != null || anamnese.pesoMinimo2Anos != null
                          ? `${fmtNum(anamnese.pesoMaximo2Anos, 1)} / ${fmtNum(anamnese.pesoMinimo2Anos, 1)} kg`
                          : '—',
                    },
                    {
                      label: 'Álcool (doses/semana)',
                      value: rotuloAlcool(anamnese.dosesAlcoolSemana),
                    },
                    {
                      label: 'Sai da dieta no fim de semana',
                      value: rotuloFimSemana(anamnese.finalSemanaSaiDieta),
                    },
                    {
                      label: 'Sintomas gastrointestinais',
                      value: rotuloSintomasGI(anamnese.sintomasGI),
                    },
                  ]}
                />
              </SectionCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Restrições" Icon={AlertTriangle}>
                  <ChipList
                    items={
                      (plano.restricoesPaciente?.length
                        ? plano.restricoesPaciente
                        : anamnese.restricoes) || []
                    }
                  />
                </SectionCard>
                <SectionCard title="Preferências proteicas" Icon={UtensilsCrossed}>
                  <ChipList
                    items={
                      (plano.preferenciasProteinaPaciente?.length
                        ? plano.preferenciasProteinaPaciente
                        : anamnese.preferenciasProteina) || []
                    }
                  />
                </SectionCard>
              </div>

              {anamnese.comportamentosAlimentares?.length > 0 ? (
                <SectionCard title="Comportamentos alimentares" Icon={ClipboardList}>
                  <ChipList items={anamnese.comportamentosAlimentares} />
                </SectionCard>
              ) : null}
            </>
          )}
        </div>
      )}

      {subTab === 'energia' && modoNutricionista && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <MetricCard
              label="Peso considerado"
              value={
                dadosEnergeticos.peso.pesoKg != null
                  ? `${fmtNum(dadosEnergeticos.peso.pesoKg, 1)} kg`
                  : '—'
              }
              hint={`Origem: ${origemPeso}`}
              Icon={Scale}
            />
            <MetricCard
              label="IMC atual"
              value={fmtNum(dadosEnergeticos.imcAtual, 1)}
              hint={
                dadosEnergeticos.idadeAnos != null
                  ? `${dadosEnergeticos.idadeAnos} anos`
                  : undefined
              }
              Icon={Activity}
            />
            <MetricCard
              label="TMB estimada"
              value={
                estimativaTmb.status === 'calculada' && estimativaTmb.tmbEstimativaKcalDia != null
                  ? `${fmtNum(estimativaTmb.tmbEstimativaKcalDia)} kcal`
                  : '—'
              }
              hint={estimativaTmb.status === 'calculada' ? 'Mifflin–St Jeor' : 'Indisponível'}
              Icon={Flame}
            />
            <MetricCard
              label="GET estimado"
              value={
                estimativaGet.status === 'calculado' && estimativaGet.getEstimadoKcalDia != null
                  ? `${fmtNum(estimativaGet.getEstimadoKcalDia)} kcal`
                  : '—'
              }
              hint={
                estimativaGet.status === 'calculado'
                  ? rotuloNivelAtividadeEnergetica(estimativaGet.nivelAtividade)
                  : 'Indisponível'
              }
              Icon={Zap}
            />
          </div>

          {!dadosEnergeticos.aptoParaEstimativaEnergetica ? (
            <SectionCard title="Cálculo energético indisponível" Icon={AlertTriangle}>
              <ul className="list-disc space-y-1 pl-4 text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
                {dadosEnergeticos.bloqueios
                  .filter((c) => c !== 'DADOS_INSUFICIENTES')
                  .map((codigo) => (
                    <li key={codigo}>{rotuloBloqueioEnergetico(codigo)}</li>
                  ))}
              </ul>
            </SectionCard>
          ) : (
            <SectionCard title="Detalhes do gasto energético" Icon={Flame}>
              <FactGrid
                items={[
                  {
                    label: 'Fator de atividade',
                    value:
                      estimativaGet.fatorAtividade != null
                        ? fmtNum(estimativaGet.fatorAtividade, 2)
                        : '—',
                  },
                  {
                    label: 'Confiança da atividade',
                    value: estimativaGet.confiancaAtividade
                      ? rotuloConfiancaAtividade(estimativaGet.confiancaAtividade)
                      : '—',
                  },
                  {
                    label: 'Status dos dados',
                    value: 'Completos para estimativa',
                  },
                ]}
              />
              {estimativaGet.status === 'indisponivel' &&
              estimativaGet.motivosIndisponibilidade.length > 0 ? (
                <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">
                  Motivos GET:{' '}
                  {estimativaGet.motivosIndisponibilidade
                    .map(rotuloMotivoGetIndisponivel)
                    .join('; ')}
                </p>
              ) : null}
              <p className="mt-3 text-[11px] leading-snug text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                TMB é estimativa em repouso. GET é estimativa de manutenção com base na atividade
                declarada — ainda não é a meta alimentar.
              </p>
            </SectionCard>
          )}

          <SectionCard title="Estratégia energética proposta" Icon={Target}>
            {estrategiaEnergetica.status === 'indisponivel' ? (
              <p className="text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
                Estratégia energética indisponível.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
                  <MetricCard
                    label="Meta protegida"
                    value={
                      estrategiaEnergetica.metaCaloricaAplicadaKcalDia != null
                        ? `${fmtNum(estrategiaEnergetica.metaCaloricaAplicadaKcalDia)} kcal`
                        : '—'
                    }
                    hint="Usada na distribuição e Opção 01"
                    Icon={ShieldCheck}
                  />
                  <MetricCard
                    label="Meta matemática"
                    value={
                      estrategiaEnergetica.metaCaloricaCalculadaKcalDia != null
                        ? `${fmtNum(estrategiaEnergetica.metaCaloricaCalculadaKcalDia)} kcal`
                        : '—'
                    }
                    Icon={Gauge}
                  />
                  <MetricCard
                    label="Déficit utilizado"
                    value={
                      estrategiaEnergetica.deficitPercentual != null
                        ? `${Math.round(estrategiaEnergetica.deficitPercentual * 100)}%`
                        : '—'
                    }
                    hint={rotuloStatusEstrategia(estrategiaEnergetica.status)}
                    Icon={Zap}
                  />
                </div>
                <FactGrid
                  items={[
                    {
                      label: 'Intensidade desejada',
                      value: estrategiaEnergetica.intensidadeDesejada
                        ? rotuloIntensidadeDesejada(estrategiaEnergetica.intensidadeDesejada)
                        : '—',
                    },
                    {
                      label: 'Intensidade aplicada',
                      value: rotuloIntensidadeAplicada(estrategiaEnergetica.intensidadeAplicada),
                    },
                  ]}
                />
              </>
            )}
            {(estrategiaEnergetica.motivosAjuste.length > 0 ||
              estrategiaEnergetica.alertas.length > 0) && (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber-900 dark:text-amber-200">
                {estrategiaEnergetica.motivosAjuste.map((m) => (
                  <li key={m}>{rotuloMotivoAjusteEstrategia(m)}</li>
                ))}
                {estrategiaEnergetica.alertas.map((a) => (
                  <li key={a}>{rotuloAlertaEstrategia(a)}</li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {subTab === 'distribuicao' && modoNutricionista && (
        <div className="space-y-4">
          {distribuicaoMetas.status !== 'calculada' ? (
            <SectionCard title="Distribuição por refeição" Icon={UtensilsCrossed}>
              <p className="text-sm text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
                Distribuição indisponível — complete os dados energéticos e a anamnese.
              </p>
            </SectionCard>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <MetricCard
                  label="Meta diária"
                  value={`${fmtNum(distribuicaoMetas.metaCaloricaDiaKcal)} kcal`}
                  Icon={Flame}
                />
                <MetricCard
                  label="Proteína diária"
                  value={`${distribuicaoMetas.proteinaDiariaG} g`}
                  Icon={Activity}
                />
              </div>

              <SectionCard title="Distribuição calórica e proteica" Icon={UtensilsCrossed}>
                <div className="space-y-3">
                  {REFEICOES_NUTRI_ORDEM.map((key) => {
                    const m = distribuicaoMetas.refeicoes[key];
                    const pctBar = Math.round((m.caloriasAlvoKcal / maxKcalBar) * 100);
                    return (
                      <div key={key}>
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                            {rotuloRefeicaoNutri(key)}
                          </span>
                          <span className="tabular-nums text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                            {fmtNum(m.caloriasAlvoKcal)} kcal · {m.proteinaAlvoG} g prot ·{' '}
                            {Math.round(m.percentualCalorico * 100)}%
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#0A1F44]/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A]"
                            style={{ width: `${pctBar}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {distribuicaoMetas.ajustesAplicados.length > 0 ? (
                  <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-[#0A1F44]/65 dark:text-[#E8EDED]/60">
                    {distribuicaoMetas.ajustesAplicados.map((a) => (
                      <li key={a}>{rotuloAjusteDistribuicao(a)}</li>
                    ))}
                  </ul>
                ) : null}
              </SectionCard>

              <SectionCard title="Distribuição proteica do dia" Icon={Activity}>
                {(() => {
                  const gaCafe = plano.opcoesSlots?.cafe?.[0]?.geracaoAutomatica;
                  const dist = gaCafe?.distribuicaoProteicaDia;
                  const prefs = (dist?.preferenciasNormalizadas || []) as GrupoProteinaPaciente[];
                  const mapa =
                    dist?.grupoPrincipalPorRefeicao ||
                    ({} as Record<string, GrupoProteinaPaciente | null>);
                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-[#0A1F44]/65 dark:text-[#E8EDED]/60">
                        Proteínas declaradas:{' '}
                        <span className="font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                          {prefs.length
                            ? prefs.map(rotuloGrupoProteina).join(', ')
                            : 'não informadas (padrão)'}
                        </span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        {REFEICOES_NUTRI_ORDEM.map((key) => {
                          const g =
                            mapa[key] ||
                            plano.opcoesSlots?.[key]?.[0]?.geracaoAutomatica
                              ?.grupoProteicoPrincipal ||
                            null;
                          return (
                            <div
                              key={`prot-${key}`}
                              className="rounded-xl border border-[#2F8FA3]/20 bg-[#2F8FA3]/5 dark:bg-[#0A1F44]/40 px-3 py-2.5"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0A1F44]/50 dark:text-[#E8EDED]/45">
                                {rotuloRefeicaoNutri(key)}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                                {g ? rotuloGrupoProteina(g) : '—'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#0A1F44]/60 dark:text-[#E8EDED]/55">
                        Variedade: {dist?.gruposDistintosUsados?.length ?? '—'} grupos proteicos
                      </p>
                      {dist?.alertas?.length ? (
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {dist.alertas.join(', ')}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </SectionCard>
            </>
          )}
        </div>
      )}

      {subTab === 'opcao01' && modoNutricionista && (
        <div className="space-y-4">
          <SectionCard title="Contexto e naturalidade" Icon={CheckCircle2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {REFEICOES_NUTRI_ORDEM.map((key) => {
                const meta = obterMetasMontagemRefeicao(key, distribuicaoMetas, plano);
                const slot01 = plano.opcoesSlots?.[key]?.[0];
                const ga = slot01?.geracaoAutomatica;
                const kcalObtido = slot01?.calorias_kcal || 0;
                const protObtido = slot01?.proteina_g || 0;
                const aproxProt =
                  meta.proteinaAlvoG > 0
                    ? Math.max(
                        0,
                        Math.round(
                          (1 - Math.abs(protObtido - meta.proteinaAlvoG) / meta.proteinaAlvoG) * 100
                        )
                      )
                    : 0;
                const aproxKcal =
                  meta.caloriasAlvoKcal > 0
                    ? Math.max(
                        0,
                        Math.round(
                          (1 -
                            Math.abs(kcalObtido - meta.caloriasAlvoKcal) / meta.caloriasAlvoKcal) *
                            100
                        )
                      )
                    : 0;
                const ctxPct =
                  ga?.scoreContextual != null ? Math.round(ga.scoreContextual * 100) : null;
                return (
                  <div
                    key={`ctx-${key}`}
                    className="rounded-xl border border-[#2F8FA3]/20 bg-gradient-to-br from-white to-[#E8EDED]/60 dark:from-[#0A1F44]/50 dark:to-[#0A1F44]/80 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-[#0A1F44] dark:text-[#E8EDED]">
                        {rotuloRefeicaoNutri(key)}
                      </p>
                      {ctxPct != null ? (
                        <span className="text-[11px] font-bold tabular-nums text-[#2F8FA3] dark:text-[#4CCB7A]">
                          {ctxPct}% natural
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#0A1F44]/65 dark:text-[#E8EDED]/60">
                      Template: {rotuloTemplateMontagem(ga?.templateSelecionado) || '—'}
                    </p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="mb-0.5 flex justify-between text-[10px] text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                          <span>Aprox. proteica</span>
                          <span className="font-semibold tabular-nums">{aproxProt}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#0A1F44]/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#4CCB7A]"
                            style={{ width: `${aproxProt}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 flex justify-between text-[10px] text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                          <span>Aprox. calórica</span>
                          <span className="font-semibold tabular-nums">{aproxKcal}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#0A1F44]/10 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#2F8FA3]"
                            style={{ width: `${aproxKcal}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {ga?.alertas && ga.alertas.length > 0 ? (
                      <p className="mt-2 text-[10px] text-amber-800 dark:text-amber-300">
                        {ga.alertas.join(', ')}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Meta vs obtido (Opção 01)" Icon={Gauge}>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2F8FA3]/25">
                    <th className="py-2 pr-2 font-semibold text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Refeição
                    </th>
                    <th className="py-2 px-1 font-semibold text-right text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Meta kcal
                    </th>
                    <th className="py-2 px-1 font-semibold text-right text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Obtido
                    </th>
                    <th className="py-2 px-1 font-semibold text-right text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Meta prot
                    </th>
                    <th className="py-2 px-1 font-semibold text-right text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Obtido
                    </th>
                    <th className="py-2 pl-2 font-semibold text-[#0A1F44]/70 dark:text-[#E8EDED]/65">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REFEICOES_NUTRI_ORDEM.map((key) => {
                    const meta = obterMetasMontagemRefeicao(key, distribuicaoMetas, plano);
                    const slot01 = plano.opcoesSlots?.[key]?.[0];
                    const kcalObtido = slot01?.calorias_kcal || 0;
                    const protObtido = slot01?.proteina_g || 0;
                    const statusK = statusFaixaMontagem(kcalObtido, meta.caloriasAlvoKcal);
                    const statusP = statusFaixaMontagem(protObtido, meta.proteinaAlvoG);
                    const ok = statusK === 'Dentro' && statusP === 'Dentro';
                    const alertas = slot01?.geracaoAutomatica?.alertas?.join(', ') || '';
                    return (
                      <tr
                        key={key}
                        className="border-b border-[#2F8FA3]/12 align-top last:border-0"
                      >
                        <td className="py-2.5 pr-2">
                          <p className="font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                            {rotuloRefeicaoNutri(key)}
                          </p>
                          {slot01?.origem ? (
                            <span className="mt-0.5 block text-[10px] opacity-60">
                              origem: {slot01.origem}
                            </span>
                          ) : null}
                          {alertas ? (
                            <span className="mt-0.5 block text-[10px] text-amber-800 dark:text-amber-300">
                              {alertas}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums">
                          {fmtNum(meta.caloriasAlvoKcal)}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums font-semibold">
                          {fmtNum(kcalObtido)}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums">
                          {meta.proteinaAlvoG} g
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums font-semibold">
                          {protObtido} g
                        </td>
                        <td className="py-2.5 pl-2">
                          <StatusBadge ok={ok} label={ok ? 'Dentro' : 'Atenção'} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
              Na geração/refazer do plano, a Opção 01 automática usa essas metas quando a
              distribuição está calculada. Edições manuais e TACO não são sobrescritos.
            </p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

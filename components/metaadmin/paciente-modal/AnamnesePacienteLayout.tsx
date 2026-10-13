'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Apple, Check, ChevronRight, Edit, History, LayoutGrid, Moon, Zap } from 'lucide-react';
import type { AnamneseBloco, AnamneseCampo, AnamneseEditTarget, AnamneseIndicador, AnamneseLayout } from '@/lib/meta/anamneseLayout';
import { AnamneseIcons } from '@/components/metaadmin/paciente-modal/anamneseSectionUi';

const RISCO_IDS = new Set(['pancreatitePrevia', 'gastroparesia', 'historicoCMT_MEN2', 'gestacao', 'lactacao']);

const TRIAGEM_SIM_NAO_IDS = new Set([
  'pancreatitePrevia',
  'gastroparesia',
  'historicoCMT_MEN2',
  'gestacao',
  'lactacao',
  'triagemDepressao',
  'triagemIdeacao',
  'vontadeDoces',
  'beliscaEntreRefeicoes',
  'comeAnsiedadeEstresse',
  'perdaControleAlimentar',
]);

const RESPOSTAS_COM_VISIBILIDADE = new Set(['Acorda cansado: Sim', 'Ronca: Sim', 'Menos de 5 h']);

const ORDEM_VISAO = ['diagnostico', 'motivacao', 'tireoide', 'sono', 'atividade'];

const SUBTITULOS: Record<string, string> = {
  indicacao: 'Motivação, diagnóstico e antecedentes principais',
  seguranca: 'Condições que podem impactar o tratamento',
  medicamentos: 'Medicações, alergias e antecedentes',
  mental: 'Humor, ideação e alimentação emocional',
  estilo: 'Sono, movimento, alimentação e rotina',
};

const NUMERO: Record<string, string> = {
  indicacao: 'bg-brand-secondary/10 text-brand-secondary',
  seguranca: 'bg-state-success/15 text-state-success',
  medicamentos: 'bg-brand-secondary/10 text-brand-secondary',
  mental: 'bg-brand-secondary/10 text-brand-secondary',
  estilo: 'bg-brand-secondary/10 text-brand-secondary',
};

const GRIDS: Record<string, string> = {
  indicacao: 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4',
  seguranca: 'grid grid-cols-1 gap-2 @min-[24rem]:grid-cols-2 @min-[36rem]:grid-cols-3',
  medicamentos: 'grid grid-cols-1 gap-2 @min-[28rem]:grid-cols-2',
  mental: 'grid grid-cols-1 gap-2 @min-[34rem]:grid-cols-3',
};

type TomChip = 'neutro' | 'negativo' | 'visivel';
type EstadoSeguranca = 'negativa' | 'incompleta' | 'positiva' | 'neutra';

type Props = {
  layout: AnamneseLayout;
  onEdit?: (target: AnamneseEditTarget) => void;
};

function iconeDoCampo(id: string): LucideIcon {
  const mapa: Record<string, LucideIcon> = {
    motivacao: AnamneseIcons.motivacao,
    diagnostico: AnamneseIcons.diagnostico,
    comorbidades: AnamneseIcons.comorbidades,
    cirurgias: AnamneseIcons.cirurgias,
    pancreatitePrevia: AnamneseIcons.riscos,
    gastroparesia: AnamneseIcons.riscos,
    historicoCMT_MEN2: AnamneseIcons.riscos,
    gestacao: AnamneseIcons.riscos,
    lactacao: AnamneseIcons.riscos,
    tireoide: AnamneseIcons.tireoide,
    sintomasGi: AnamneseIcons.sintomasGi,
    medicacoes: AnamneseIcons.medicacoes,
    alergias: AnamneseIcons.alergias,
    medicamentosDiabetes: AnamneseIcons.medicacoes,
    medicamentos: AnamneseIcons.medicacoes,
    historico: History,
    triagemDepressao: AnamneseIcons.triagemDepressao,
    triagemIdeacao: AnamneseIcons.triagemIdeacao,
    vontadeDoces: Apple,
    beliscaEntreRefeicoes: Apple,
    comeAnsiedadeEstresse: Apple,
    perdaControleAlimentar: Apple,
    sono: Moon,
    atividade: AnamneseIcons.tireoide,
    alimentacao: Apple,
    energia: Zap,
    barreiras: AnamneseIcons.alergias,
    expectativa: AnamneseIcons.objetivos,
  };
  return mapa[id] || AnamneseIcons.diagnostico;
}

function tomDoChip(campoId: string, valor: string): TomChip {
  if (TRIAGEM_SIM_NAO_IDS.has(campoId) && valor === 'Não') return 'negativo';
  if (TRIAGEM_SIM_NAO_IDS.has(campoId) && valor === 'Sim') return 'visivel';
  if (RESPOSTAS_COM_VISIBILIDADE.has(valor)) return 'visivel';
  return 'neutro';
}

const CHIP_TOM: Record<TomChip, string> = {
  neutro:
    'border-brand-accent/15 bg-[color-mix(in_srgb,var(--brand-accent)_8%,var(--surface-card))] text-text-primary dark:text-slate-100',
  negativo:
    'border-state-success/20 bg-[color-mix(in_srgb,var(--state-success)_10%,var(--surface-card))] text-state-success',
  visivel:
    'border-state-warning/25 bg-[color-mix(in_srgb,var(--state-warning)_12%,var(--surface-card))] text-amber-950 dark:text-amber-100',
};

function tomIndicador(id: string, atencao?: boolean): string {
  if (atencao) return 'border-state-warning/25 bg-[color-mix(in_srgb,var(--state-warning)_10%,var(--surface-card))]';
  if (id === 'diagnostico') return 'border-state-danger/15 bg-[color-mix(in_srgb,var(--state-danger)_7%,var(--surface-card))]';
  if (id === 'motivacao') return 'border-brand-accent/15 bg-[color-mix(in_srgb,var(--brand-accent)_8%,var(--surface-card))]';
  if (id === 'tireoide') return 'border-state-success/15 bg-[color-mix(in_srgb,var(--state-success)_8%,var(--surface-card))]';
  if (id === 'sono') return 'border-state-info/15 bg-[color-mix(in_srgb,var(--state-info)_8%,var(--surface-card))]';
  if (id === 'atividade') return 'border-brand-primary/15 bg-[color-mix(in_srgb,var(--brand-primary)_8%,var(--surface-card))]';
  return 'border-border-default bg-surface-card';
}

function ordenarIndicadores(itens: AnamneseIndicador[]) {
  return [...itens].sort((a, b) => {
    const ia = ORDEM_VISAO.indexOf(a.id);
    const ib = ORDEM_VISAO.indexOf(b.id);
    return (ia === -1 ? 20 : ia) - (ib === -1 ? 20 : ib);
  });
}

function estadoSeguranca(bloco: AnamneseBloco | undefined): EstadoSeguranca {
  if (!bloco) return 'neutra';
  const riscos = bloco.campos.filter((campo) => RISCO_IDS.has(campo.id));
  if (riscos.some((campo) => campo.status !== 'preenchido')) return 'incompleta';
  if (riscos.some((campo) => campo.values.some((valor) => valor === 'Sim'))) return 'positiva';
  if (bloco.nenhumFatorRiscoRelatado) return 'negativa';
  return 'neutra';
}

function spanEstilo(id: string) {
  if (id === 'sono') return '@min-[32rem]:col-span-4';
  return '@min-[32rem]:col-span-2';
}

function Valores({ campo }: { campo: AnamneseCampo }) {
  if (campo.values.length === 0) {
    return (
      <p className="inline-flex max-w-full rounded-full border border-border-default bg-slate-50 px-2.5 py-0.5 text-xs leading-5 text-text-secondary dark:bg-slate-800/60">
        Não informado
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {campo.values.map((valor) => (
        <span
          key={`${campo.id}-${valor}`}
          className={`inline-flex max-w-full whitespace-normal break-words rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 ${CHIP_TOM[tomDoChip(campo.id, valor)]}`}
        >
          {valor}
        </span>
      ))}
    </div>
  );
}

function CardClinico({
  campo,
  onEdit,
}: {
  campo: AnamneseCampo;
  onEdit?: (target: AnamneseEditTarget) => void;
}) {
  const Icon = iconeDoCampo(campo.id);
  return (
    <article
      id={`anamnese-campo-${campo.id}`}
      className={`flex h-full min-w-0 scroll-mt-4 flex-col rounded-[10px] border border-border-default bg-surface-card px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/50 ${
        onEdit ? 'transition-colors hover:border-brand-primary/35' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 text-text-secondary dark:bg-slate-800">
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        <h6 className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-text-primary dark:text-slate-100">
          {campo.label}
        </h6>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(campo.edit)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-slate-50 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus dark:hover:bg-slate-800"
            aria-label={`Editar ${campo.label}`}
            title="Editar"
          >
            <Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <Valores campo={campo} />
    </article>
  );
}

function CabecalhoBloco({ bloco }: { bloco: AnamneseBloco }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${NUMERO[bloco.id] || 'bg-slate-100 text-slate-600'}`}
      >
        {bloco.numero}
      </span>
      <h5 className="text-sm font-semibold text-text-primary dark:text-slate-100">{bloco.titulo}</h5>
      {SUBTITULOS[bloco.id] && <p className="text-xs text-text-secondary">{SUBTITULOS[bloco.id]}</p>}
    </div>
  );
}

function NotaSeguranca({ estado }: { estado: EstadoSeguranca }) {
  if (estado === 'negativa') {
    return (
      <div className="mb-2 rounded-lg border border-state-success/25 bg-[color-mix(in_srgb,var(--state-success)_14%,var(--surface-card))] px-2.5 py-2">
        <p className="flex items-start gap-1.5 text-sm font-medium text-state-success">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Triagem principal sem fatores de risco relatados</span>
        </p>
        <p className="mt-0.5 pl-6 text-xs text-state-success/80">Com base nas respostas específicas de segurança.</p>
      </div>
    );
  }
  if (estado === 'incompleta') {
    return (
      <div className="mb-2 rounded-lg border border-state-warning/30 bg-[color-mix(in_srgb,var(--state-warning)_10%,var(--surface-card))] px-2.5 py-2">
        <p className="flex items-start gap-1.5 text-sm font-medium text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>Triagem de segurança incompleta</span>
        </p>
        <p className="mt-0.5 pl-6 text-xs text-amber-900/80 dark:text-amber-100/80">
          Existem informações ainda não respondidas.
        </p>
      </div>
    );
  }
  if (estado === 'positiva') {
    return (
      <div className="mb-2 rounded-lg border border-state-warning/30 bg-[color-mix(in_srgb,var(--state-warning)_10%,var(--surface-card))] px-2.5 py-2">
        <p className="flex items-start gap-1.5 text-sm font-medium text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span>Há informação de segurança que requer revisão</span>
        </p>
      </div>
    );
  }
  return null;
}

function fundoSecao(bloco: AnamneseBloco, estado: EstadoSeguranca) {
  if (bloco.id === 'seguranca' && estado === 'negativa') {
    return 'border-state-success/20 bg-[color-mix(in_srgb,var(--state-success)_6%,var(--surface-card))]';
  }
  return 'border-border-default bg-surface-card dark:border-slate-700 dark:bg-slate-900/30';
}

function Secao({
  bloco,
  estado,
  onEdit,
}: {
  bloco: AnamneseBloco;
  estado: EstadoSeguranca;
  onEdit?: (target: AnamneseEditTarget) => void;
}) {
  const estilo = bloco.id === 'estilo';
  return (
    <section
      id={`anamnese-secao-${bloco.id}`}
      className={`@container min-w-0 scroll-mt-4 rounded-xl border p-2.5 ${fundoSecao(bloco, estado)}`}
    >
      <CabecalhoBloco bloco={bloco} />
      {bloco.id === 'seguranca' && <NotaSeguranca estado={estado} />}
      <div className={estilo ? 'grid grid-cols-1 gap-2 @min-[32rem]:grid-cols-6' : GRIDS[bloco.id]}>
        {bloco.campos.map((item) => (
          <div key={item.id} className={estilo ? `min-w-0 ${spanEstilo(item.id)}` : 'min-w-0'}>
            <CardClinico campo={item} onEdit={onEdit} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnamnesePacienteLayout({ layout, onEdit }: Props) {
  const [mostrarTodasPendencias, setMostrarTodasPendencias] = useState(false);
  const total = layout.pendencias.length;
  const lista = mostrarTodasPendencias ? layout.pendencias : layout.pendencias.slice(0, 4);
  const indicadores = ordenarIndicadores(layout.indicadores);
  const porId = Object.fromEntries(layout.blocos.map((bloco) => [bloco.id, bloco]));
  const segurancaEstado = estadoSeguranca(porId.seguranca);

  const irParaCampo = (id: string) => {
    document.getElementById(`anamnese-campo-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
        <section className="min-w-0 rounded-xl border border-border-default bg-surface-card px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/30">
          <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Visão geral
          </h5>
          {indicadores.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
              {indicadores.map((item) => {
                const Icon = iconeDoCampo(item.id);
                return (
                  <article
                    key={item.id}
                    className={`min-w-0 rounded-[10px] border px-2.5 py-2 ${tomIndicador(item.id, item.atencao)}`}
                  >
                    <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-text-secondary dark:bg-slate-900/40">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <p className="text-sm font-semibold leading-snug text-text-primary dark:text-slate-100">{item.valor}</p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{item.rotulo}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Ainda não há respostas para destacar.</p>
          )}
        </section>

        <section className="flex h-full min-w-0 flex-col rounded-xl border border-state-warning/25 bg-[color-mix(in_srgb,var(--state-warning)_8%,var(--surface-card))] px-3 py-2.5">
          <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Pendências
          </h5>
          {total === 0 ? (
            <p className="mt-2 text-sm text-text-primary dark:text-slate-100">Nenhuma informação pendente.</p>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold leading-tight text-text-primary dark:text-slate-100">
                {total === 1 ? '1 informação' : `${total} informações`}
              </p>
              <p className="text-xs text-text-secondary">{total === 1 ? 'precisa de revisão' : 'precisam de revisão'}</p>
              <ul className="mt-2 space-y-0.5">
                {lista.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => irParaCampo(item.id)}
                      className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1 text-left text-[13px] text-text-primary hover:bg-state-warning/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus dark:text-slate-100"
                    >
                      <span className="text-state-warning" aria-hidden>
                        →
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {total > 4 && !mostrarTodasPendencias && (
                <button
                  type="button"
                  onClick={() => setMostrarTodasPendencias(true)}
                  className="mt-2 self-start text-sm font-medium text-amber-900 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus dark:text-amber-100"
                >
                  Ver todas as pendências
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {porId.indicacao && <Secao bloco={porId.indicacao} estado="neutra" onEdit={onEdit} />}

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {porId.seguranca && <Secao bloco={porId.seguranca} estado={segurancaEstado} onEdit={onEdit} />}
        {porId.medicamentos && <Secao bloco={porId.medicamentos} estado="neutra" onEdit={onEdit} />}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        {porId.mental && <Secao bloco={porId.mental} estado="neutra" onEdit={onEdit} />}
        {porId.estilo && <Secao bloco={porId.estilo} estado="neutra" onEdit={onEdit} />}
      </div>
    </div>
  );
}

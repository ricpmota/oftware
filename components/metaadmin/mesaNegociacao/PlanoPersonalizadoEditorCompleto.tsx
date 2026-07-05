'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Minus, Plus, Wand2 } from 'lucide-react';
import {
  aplicarDoseEmIntervalo,
  adicionarSemanaDose,
  duplicarDoseSemana,
  removerSemanaDose,
  sincronizarSemanasComDuracao,
} from '@/lib/treatment-negotiation/doseSemanalUtils';
import {
  calcularTotalBio,
  calcularTotalExames,
  calcularValorFinalBaseNegociado,
  calcularValorFinalNegociado,
  custoKitsNegociado,
  descontoPorValorFinalManual,
  prepararParametrosNegociado,
  totalMgDoses,
} from '@/lib/treatment-negotiation/investimentoAuto';
import { LABEL_ANALISE_EXAMES } from '@/lib/treatment-negotiation/constants';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

type Props = {
  parametros: ParametrosPlanoPersonalizadoEditavel;
  configuracaoComercial: OrcamentoTerapeuticoConfig;
  onChange: (parametros: ParametrosPlanoPersonalizadoEditavel) => void;
};

function Secao({
  titulo,
  children,
  defaultOpen = true,
}: {
  titulo: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [aberta, setAberta] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">{titulo}</span>
        <span className="text-xs text-slate-500">{aberta ? '−' : '+'}</span>
      </button>
      {aberta ? <div className="p-4 space-y-3 border-t border-slate-100">{children}</div> : null}
    </div>
  );
}

function CampoNum({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
}) {
  const [texto, setTexto] = useState('');
  const [focado, setFocado] = useState(false);

  useEffect(() => {
    if (!focado) {
      setTexto(value != null ? String(value) : '');
    }
  }, [value, focado]);

  const commitar = (raw: string) => {
    if (raw.trim() === '') {
      onChange(min != null ? min : null);
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      onChange(min != null ? min : value);
      return;
    }
    onChange(min != null && n < min ? min : n);
  };

  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        value={focado ? texto : value != null ? String(value) : ''}
        onFocus={() => {
          setFocado(true);
          setTexto(value != null ? String(value) : '');
        }}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          setFocado(false);
          commitar(texto);
        }}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </label>
  );
}

const PASSO_DOSE_MG = 1.25;

function arredondarDoseMg(doseMg: number): number {
  return Math.round(doseMg * 100) / 100;
}

function DoseSemanalStepper({
  doseMg,
  onChange,
}: {
  doseMg: number;
  onChange: (doseMg: number) => void;
}) {
  const podeDiminuir = doseMg > 0;
  return (
    <div className="flex items-center gap-1 ml-auto">
      <button
        type="button"
        title="Diminuir dose"
        disabled={!podeDiminuir}
        onClick={() => onChange(arredondarDoseMg(Math.max(0, doseMg - PASSO_DOSE_MG)))}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-semibold text-slate-900 tabular-nums">
        {doseMg} mg
      </span>
      <button
        type="button"
        title="Aumentar dose"
        onClick={() => onChange(arredondarDoseMg(doseMg + PASSO_DOSE_MG))}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}

export default function PlanoPersonalizadoEditorCompleto({
  parametros,
  configuracaoComercial,
  onChange,
}: Props) {
  const aplicar = (patch: Partial<ParametrosPlanoPersonalizadoEditavel>) => {
    const next = { ...parametros, ...patch };
    if (patch.observacoesMedico != null) next.observacoes = patch.observacoesMedico;
    if (patch.descontoManual != null) {
      next.investimento = {
        ...next.investimento,
        descontoReais: patch.descontoManual,
      };
    }
    onChange(prepararParametrosNegociado(next, configuracaoComercial));
  };

  const set = aplicar;

  const setInv = (patch: Partial<ParametrosPlanoPersonalizadoEditavel['investimento']>) => {
    let investimento = { ...parametros.investimento, ...patch };
    let descontoManual = patch.descontoReais ?? parametros.descontoManual;

    if (patch.valorFinalManual !== undefined) {
      const valorBase = calcularValorFinalBaseNegociado(
        {
          ...parametros,
          investimento: { ...investimento, valorFinalManual: null },
        },
        configuracaoComercial
      );
      const manual = patch.valorFinalManual;
      if (manual != null) {
        const desconto = descontoPorValorFinalManual(manual, valorBase);
        investimento = { ...investimento, descontoReais: desconto };
        descontoManual = desconto;
      } else {
        investimento = { ...investimento, descontoReais: 0 };
        descontoManual = 0;
      }
    }

    onChange(
      prepararParametrosNegociado(
        { ...parametros, investimento, descontoManual },
        configuracaoComercial
      )
    );
  };

  const mgTotal = useMemo(() => totalMgDoses(parametros), [parametros]);
  const bioTotalAuto = useMemo(
    () => calcularTotalBio(parametros, configuracaoComercial),
    [parametros, configuracaoComercial]
  );
  const examesTotalAuto = useMemo(
    () => calcularTotalExames(parametros, configuracaoComercial),
    [parametros, configuracaoComercial]
  );
  const custoKits = useMemo(
    () => custoKitsNegociado(parametros, configuracaoComercial),
    [parametros, configuracaoComercial]
  );
  const valorFinalCalculado = useMemo(
    () => calcularValorFinalNegociado(parametros, configuracaoComercial),
    [parametros, configuracaoComercial]
  );

  const [intervalo, setIntervalo] = useState({ inicio: 1, fim: 4, dose: 2.5 });

  return (
    <div className="space-y-4">
      <Secao titulo="1. Identificação do plano">
        <CampoTexto
          label="Nome do plano"
          value={parametros.nomePlano}
          onChange={(nomePlano) => set({ nomePlano })}
        />
        <CampoTexto
          label="Descrição curta"
          value={parametros.descricaoCurta}
          onChange={(descricaoCurta) => set({ descricaoCurta })}
        />
        <CampoTexto
          label="Observações do médico"
          value={parametros.observacoesMedico}
          onChange={(observacoesMedico) => set({ observacoesMedico })}
          multiline
        />
      </Secao>

      <Secao titulo="2. Objetivo">
        <div className="grid grid-cols-2 gap-3">
          <CampoNum
            label="Peso atual (kg)"
            value={parametros.pesoAtualKg}
            onChange={(pesoAtualKg) => set({ pesoAtualKg })}
            step={0.1}
            min={0}
          />
          <CampoNum
            label="Meta (kg)"
            value={parametros.metaKg}
            onChange={(metaKg) => set({ metaKg: metaKg ?? 0 })}
            step={0.5}
            min={0}
          />
          <CampoNum
            label="Peso alvo (kg)"
            value={parametros.pesoAlvoKg}
            onChange={(pesoAlvoKg) => set({ pesoAlvoKg })}
            step={0.1}
            min={0}
          />
          <CampoNum
            label="Percentual estimado (%)"
            value={parametros.percentualEstimado}
            onChange={(percentualEstimado) => set({ percentualEstimado })}
            step={0.1}
            min={0}
          />
        </div>
      </Secao>

      <Secao titulo="3. Duração">
        <div className="grid grid-cols-2 gap-3">
          <CampoNum
            label="Duração (semanas)"
            value={parametros.semanasPrazo}
            onChange={(semanasPrazo) => {
              if (semanasPrazo == null) return;
              const dosesSemanais = sincronizarSemanasComDuracao(
                parametros.dosesSemanais,
                semanasPrazo
              );
              set({
                semanasPrazo,
                mesesPrazo: Math.max(1, Math.ceil(semanasPrazo / 4)),
                dosesSemanais,
                aplicacoesTotal: semanasPrazo,
                bioValorTotalManual: null,
              });
            }}
            min={1}
          />
          <CampoNum
            label="Duração (meses)"
            value={parametros.mesesPrazo}
            onChange={(mesesPrazo) => {
              if (mesesPrazo == null) return;
              const semanas = Math.max(1, mesesPrazo * 4);
              set({
                mesesPrazo,
                semanasPrazo: semanas,
                dosesSemanais: sincronizarSemanasComDuracao(parametros.dosesSemanais, semanas),
                aplicacoesTotal: semanas,
                bioValorTotalManual: null,
              });
            }}
            min={1}
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Início estimado</span>
            <input
              type="date"
              value={parametros.dataInicioEstimada ?? ''}
              onChange={(e) => set({ dataInicioEstimada: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Término estimado</span>
            <input
              type="date"
              value={parametros.dataTerminoEstimada ?? ''}
              onChange={(e) => set({ dataTerminoEstimada: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </Secao>

      <Secao titulo="4. Doses semanais">
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-900">Aplicar dose em intervalo</p>
          <div className="grid grid-cols-4 gap-2 items-end">
            <CampoNum
              label="Sem. início"
              value={intervalo.inicio}
              onChange={(v) => setIntervalo((s) => ({ ...s, inicio: v ?? 1 }))}
              min={1}
            />
            <CampoNum
              label="Sem. fim"
              value={intervalo.fim}
              onChange={(v) => setIntervalo((s) => ({ ...s, fim: v ?? 1 }))}
              min={1}
            />
            <CampoNum
              label="Dose (mg)"
              value={intervalo.dose}
              onChange={(v) => setIntervalo((s) => ({ ...s, dose: v ?? 0 }))}
              step={0.5}
              min={0}
            />
            <button
              type="button"
              onClick={() =>
                set({
                  dosesSemanais: aplicarDoseEmIntervalo(
                    parametros.dosesSemanais,
                    intervalo.inicio,
                    intervalo.fim,
                    intervalo.dose
                  ),
                })
              }
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Aplicar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              set({
                dosesSemanais: adicionarSemanaDose(parametros.dosesSemanais),
                semanasPrazo: parametros.dosesSemanais.length + 1,
                aplicacoesTotal: parametros.dosesSemanais.length + 1,
              })
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar semana
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {parametros.dosesSemanais.map((d, idx) => (
            <div key={`${d.semana}-${idx}`} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-slate-500 w-12 shrink-0">S{d.semana}</span>
              <DoseSemanalStepper
                doseMg={d.doseMg}
                onChange={(doseMg) => {
                  const copia = [...parametros.dosesSemanais];
                  copia[idx] = { ...copia[idx], doseMg };
                  set({ dosesSemanais: copia });
                }}
              />
              <button
                type="button"
                title="Duplicar semana"
                onClick={() => set({ dosesSemanais: duplicarDoseSemana(parametros.dosesSemanais, idx) })}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Remover semana"
                disabled={parametros.dosesSemanais.length <= 1}
                onClick={() => {
                  const dosesSemanais = removerSemanaDose(parametros.dosesSemanais, idx);
                  set({
                    dosesSemanais,
                    semanasPrazo: dosesSemanais.length,
                    aplicacoesTotal: dosesSemanais.length,
                  });
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-40 shrink-0"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="5. Aplicações" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-3">
          <CampoNum
            label="Total de aplicações"
            value={parametros.aplicacoesTotal}
            onChange={(aplicacoesTotal) => set({ aplicacoesTotal: aplicacoesTotal ?? 0 })}
            min={0}
          />
          <CampoTexto
            label="Frequência"
            value={parametros.aplicacoesFrequencia}
            onChange={(aplicacoesFrequencia) => set({ aplicacoesFrequencia })}
          />
          <CampoNum
            label="Custo por kit (R$)"
            value={parametros.custoPorKit}
            onChange={(custoPorKit) => set({ custoPorKit })}
            step={0.01}
            min={0}
          />
        </div>
      </Secao>

      <Secao titulo="6. Consultas" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <CampoNum
            label="Total"
            value={parametros.consultas}
            onChange={(consultas) => set({ consultas: consultas ?? 0 })}
            min={0}
          />
          <CampoTexto
            label="Frequência"
            value={parametros.consultasFrequencia}
            onChange={(consultasFrequencia) => set({ consultasFrequencia })}
          />
          <CampoNum
            label="Valor unitário (R$)"
            value={parametros.consultasValorUnitario}
            onChange={(consultasValorUnitario) => set({ consultasValorUnitario })}
            step={0.01}
            min={0}
          />
          <CampoNum
            label="Valor total manual (R$)"
            value={parametros.consultasValorTotalManual}
            onChange={(consultasValorTotalManual) => set({ consultasValorTotalManual })}
            step={0.01}
            min={0}
          />
        </div>
      </Secao>

      <Secao titulo="7. Bioimpedância" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Total (frequência semanal)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {parametros.bioimpedancias} · {parametros.semanasPrazo} semanas
            </p>
          </label>
          <CampoTexto
            label="Frequência"
            value={parametros.bioFrequencia}
            onChange={(bioFrequencia) =>
              set({ bioFrequencia, bioValorTotalManual: null })
            }
          />
          <CampoNum
            label="Valor unitário (R$)"
            value={parametros.bioValorUnitario}
            onChange={(bioValorUnitario) =>
              set({ bioValorUnitario, bioValorTotalManual: null })
            }
            step={0.01}
            min={0}
          />
          <CampoNum
            label={`Valor total (R$) — calculado: ${formatarMoedaBRL(bioTotalAuto)}`}
            value={parametros.bioValorTotalManual ?? bioTotalAuto}
            onChange={(bioValorTotalManual) => set({ bioValorTotalManual })}
            step={0.01}
            min={0}
          />
        </div>
      </Secao>

      <Secao titulo={`8. ${LABEL_ANALISE_EXAMES}`} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <CampoNum
            label="Total de análises"
            value={parametros.exames}
            onChange={(exames) => set({ exames: exames ?? 0, examesValorTotalManual: null })}
            min={0}
          />
          <CampoNum
            label="Valor unitário (R$)"
            value={parametros.examesValorUnitario}
            onChange={(examesValorUnitario) =>
              set({ examesValorUnitario, examesValorTotalManual: null })
            }
            step={0.01}
            min={0}
          />
          <CampoNum
            label={`Valor total (R$) — calculado: ${formatarMoedaBRL(examesTotalAuto)}`}
            value={parametros.examesValorTotalManual ?? examesTotalAuto}
            onChange={(examesValorTotalManual) => set({ examesValorTotalManual })}
            step={0.01}
            min={0}
          />
        </div>
        <CampoTexto
          label="Descrição da análise"
          value={parametros.examesDescricao}
          onChange={(examesDescricao) => set({ examesDescricao })}
          multiline
        />
      </Secao>

      <Secao titulo="9. Investimento">
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
          Dose total do plano: <strong className="text-slate-900">{mgTotal} mg</strong>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoNum
            label="Medicação (R$/mg)"
            value={parametros.investimento.valorPorMg}
            onChange={(valorPorMg) => setInv({ valorPorMg })}
            step={0.01}
            min={0}
          />
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Medicação total (R$)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {formatarMoedaBRL(parametros.investimento.valorMedicacao ?? 0)}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Consultas (R$)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {formatarMoedaBRL(parametros.investimento.valorConsultas ?? 0)}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Bioimpedâncias (R$)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {formatarMoedaBRL(parametros.investimento.valorBioimpedancias ?? 0)}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">{LABEL_ANALISE_EXAMES} (R$)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {formatarMoedaBRL(parametros.investimento.valorExames ?? 0)}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Aplicações / kits (R$)</span>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 tabular-nums">
              {formatarMoedaBRL(custoKits)}
            </p>
          </label>
          <CampoNum
            label="Outros custos (R$)"
            value={parametros.investimento.outrosCustos}
            onChange={(outrosCustos) => setInv({ outrosCustos })}
            step={0.01}
            min={0}
          />
          <CampoNum
            label="Margem (R$)"
            value={parametros.investimento.margem}
            onChange={(margem) => setInv({ margem })}
            step={0.01}
            min={0}
          />
          <CampoNum
            label="Desconto (R$)"
            value={parametros.investimento.descontoReais}
            onChange={(descontoReais) => setInv({ descontoReais: descontoReais ?? 0 })}
            step={0.01}
            min={0}
          />
          <CampoNum
            label="Desconto (%)"
            value={parametros.investimento.descontoPercentual}
            onChange={(descontoPercentual) =>
              setInv({ descontoPercentual: descontoPercentual ?? 0 })
            }
            step={0.1}
            min={0}
          />
        </div>
        <CampoNum
          label={`Valor final (R$) — calculado: ${formatarMoedaBRL(valorFinalCalculado)}`}
          value={parametros.investimento.valorFinalManual ?? valorFinalCalculado}
          onChange={(valorFinalManual) => setInv({ valorFinalManual })}
          step={0.01}
          min={0}
        />
        <p className="text-[11px] text-slate-500">
          O valor final é calculado automaticamente. Se digitar um valor menor que o calculado, o
          desconto em reais é preenchido automaticamente.
        </p>
      </Secao>
    </div>
  );
}

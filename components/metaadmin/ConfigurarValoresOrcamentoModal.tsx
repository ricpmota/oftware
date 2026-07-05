'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Settings, X } from 'lucide-react';
import {
  configOrcamentoParaFormulario,
  criarValoresPadraoConfigOrcamento,
} from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import {
  DOSES_MENSAIS_PADRAO_MG,
  type OrcamentoTerapeuticoConfig,
  type TipoDescontoMaximoOrcamento,
} from '@/types/orcamentoTerapeuticoConfig';

export type ConfigOrcamentoFormValues = Omit<
  OrcamentoTerapeuticoConfig,
  'medicoId' | 'createdAt' | 'updatedAt'
>;

type Props = {
  open: boolean;
  configAtual: OrcamentoTerapeuticoConfig | null;
  salvando?: boolean;
  titulo?: string;
  subtitulo?: string;
  botaoConfirmar?: string;
  onClose: () => void;
  onSalvar: (values: ConfigOrcamentoFormValues) => void | Promise<void>;
};

const DOSES_PRESET_MG = [...DOSES_MENSAIS_PADRAO_MG];

function normalizarDoseMg(dose: number): number {
  return Math.round(dose * 10) / 10;
}

function doseMgIgual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function opcoesDosesMensais(atuais: number[]): number[] {
  const mapa = new Map<number, number>();
  for (const dose of [...DOSES_PRESET_MG, ...atuais]) {
    const n = normalizarDoseMg(dose);
    if (n > 0) mapa.set(n, n);
  }
  return [...mapa.values()].sort((a, b) => a - b);
}

function CampoNumero({
  label,
  value,
  onChange,
  step = 0.01,
  suffix,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
          className={`w-full text-sm py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 ${
            prefix ? 'pl-9 pr-3' : suffix ? 'pl-3 pr-9' : 'px-3'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ConfigurarValoresOrcamentoModal({
  open,
  configAtual,
  salvando = false,
  titulo = 'Configurar Valores do Orçamento',
  subtitulo = 'Defina os valores padrão usados no cálculo automático dos orçamentos terapêuticos.',
  botaoConfirmar = 'Salvar e continuar',
  onClose,
  onSalvar,
}: Props) {
  const [form, setForm] = useState<ConfigOrcamentoFormValues>(() =>
    criarValoresPadraoConfigOrcamento()
  );

  useEffect(() => {
    if (open) {
      setForm(configOrcamentoParaFormulario(configAtual));
    }
  }, [open, configAtual]);

  const dosesOpcoes = useMemo(
    () => opcoesDosesMensais(form.dosesMensaisDisponiveisMg),
    [form.dosesMensaisDisponiveisMg]
  );

  if (!open) return null;

  const atualizar = <K extends keyof ConfigOrcamentoFormValues>(
    campo: K,
    valor: ConfigOrcamentoFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const alternarDoseMensal = (dose: number) => {
    const doses = form.dosesMensaisDisponiveisMg.map(normalizarDoseMg);
    const doseNorm = normalizarDoseMg(dose);
    const ativa = doses.some((d) => doseMgIgual(d, doseNorm));
    const next = ativa
      ? doses.filter((d) => !doseMgIgual(d, doseNorm))
      : [...doses, doseNorm].sort((a, b) => a - b);
    if (next.length > 0) {
      atualizar('dosesMensaisDisponiveisMg', next);
    }
  };

  const salvarFormulario = () => {
    void onSalvar({
      ...form,
      margemPadraoPercentual: 0,
      dosesMensaisDisponiveisMg: form.dosesMensaisDisponiveisMg.map(normalizarDoseMg),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden md:items-center md:justify-center md:bg-black/55 md:backdrop-blur-sm md:p-4"
      onClick={salvando ? undefined : onClose}
      role="presentation"
    >
      <div
        className="flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-2xl md:rounded-2xl shadow-2xl bg-white overflow-hidden border-0 md:border md:border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-orcamento-titulo"
      >
        <div className="flex-shrink-0 px-4 sm:px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-4 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                <Settings className="w-5 h-5" />
              </span>
              <div>
                <h2 id="config-orcamento-titulo" className="text-base font-semibold text-slate-900">
                  {titulo}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 sm:px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <CampoNumero
              label="Valor por mg"
              prefix="R$"
              value={form.valorPorMg}
              onChange={(v) => atualizar('valorPorMg', v)}
            />
            <CampoNumero
              label="Kit / aplicação"
              prefix="R$"
              value={form.valorPorKitAplicacao}
              onChange={(v) => atualizar('valorPorKitAplicacao', v)}
            />
            <CampoNumero
              label="Consulta"
              prefix="R$"
              value={form.valorPorConsulta}
              onChange={(v) => atualizar('valorPorConsulta', v)}
            />
            <CampoNumero
              label="Bioimpedância"
              prefix="R$"
              value={form.valorPorBioimpedancia}
              onChange={(v) => atualizar('valorPorBioimpedancia', v)}
            />
            <CampoNumero
              label="Exame"
              prefix="R$"
              value={form.valorPorExame}
              onChange={(v) => atualizar('valorPorExame', v)}
            />
            <CampoNumero
              label="Outros custos"
              prefix="R$"
              value={form.outrosCustosPadrao}
              onChange={(v) => atualizar('outrosCustosPadrao', v)}
            />
            <CampoNumero
              label="Consultas / mês"
              step={0.1}
              value={form.consultasPorMesPadrao}
              onChange={(v) => atualizar('consultasPorMesPadrao', v)}
            />
            <CampoNumero
              label="Bio / mês"
              step={0.1}
              value={form.bioimpedanciasPorMesPadrao}
              onChange={(v) => atualizar('bioimpedanciasPorMesPadrao', v)}
            />
            <CampoNumero
              label="Exames / plano"
              step={1}
              value={form.examesPorPlanoPadrao}
              onChange={(v) => atualizar('examesPorPlanoPadrao', v)}
            />
            <CampoNumero
              label="Desconto máximo"
              step={form.tipoDescontoMaximo === 'percentual' ? 0.1 : 0.01}
              suffix={form.tipoDescontoMaximo === 'percentual' ? '%' : undefined}
              prefix={form.tipoDescontoMaximo === 'valor' ? 'R$' : undefined}
              value={form.descontoMaximo}
              onChange={(v) => atualizar('descontoMaximo', v)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Tipo do desconto máximo
            </label>
            <select
              value={form.tipoDescontoMaximo}
              onChange={(e) =>
                atualizar('tipoDescontoMaximo', e.target.value as TipoDescontoMaximoOrcamento)
              }
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
            >
              <option value="percentual">Percentual (%)</option>
              <option value="valor">Valor fixo (R$)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Planos mensal, trimestral e semestral
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CampoNumero
                label="Dose inicial mensal"
                step={0.5}
                suffix="mg"
                value={form.doseInicialMensalMg}
                onChange={(v) => atualizar('doseInicialMensalMg', v)}
              />
              <CampoNumero
                label="Aplicações mensais"
                step={1}
                value={form.aplicacoesMensais}
                onChange={(v) => atualizar('aplicacoesMensais', Math.max(1, Math.round(v)))}
              />
              <CampoNumero
                label="Desconto trimestral"
                suffix="%"
                step={0.5}
                value={form.descontoPlanoTrimestralPercentual}
                onChange={(v) => atualizar('descontoPlanoTrimestralPercentual', v)}
              />
              <CampoNumero
                label="Desconto semestral"
                suffix="%"
                step={0.5}
                value={form.descontoPlanoSemestralPercentual}
                onChange={(v) => atualizar('descontoPlanoSemestralPercentual', v)}
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Doses disponíveis no mensal
            </p>
            <div className="grid grid-cols-3 gap-2">
              {dosesOpcoes.map((dose) => {
                const ativa = form.dosesMensaisDisponiveisMg.some((d) => doseMgIgual(d, dose));
                return (
                  <button
                    key={dose}
                    type="button"
                    onClick={() => alternarDoseMensal(dose)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      ativa
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                    }`}
                  >
                    {dose} mg
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Desconto por volume de mg
            </p>
            <div className="space-y-2">
              {form.descontosPorVolumeMg.map((faixa, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3">
                  <CampoNumero
                    label={`Mín. mg (${idx + 1})`}
                    step={1}
                    value={faixa.minMg}
                    onChange={(v) => {
                      const next = [...form.descontosPorVolumeMg];
                      next[idx] = { ...next[idx], minMg: v };
                      atualizar('descontosPorVolumeMg', next);
                    }}
                  />
                  <CampoNumero
                    label="Desconto"
                    suffix="%"
                    step={0.5}
                    value={faixa.descontoPercentual}
                    onChange={(v) => {
                      const next = [...form.descontosPorVolumeMg];
                      next[idx] = { ...next[idx], descontoPercentual: v };
                      atualizar('descontosPorVolumeMg', next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 sm:px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white/95 backdrop-blur-md flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={salvarFormulario}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            {botaoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { ArrowDown, Brain } from 'lucide-react';
import type { OiValidationSnapshot } from '@/lib/oi/oiValidationSnapshot';

const ROADMAP_ITEMS = [
  'Validação automática',
  'Comparação previsto × realizado',
  'Precisão por faixa',
  'Precisão por IMC',
  'Precisão por medicamento',
  'Precisão por idade',
  'Precisão por sexo',
  'Precisão por protocolo',
  'Dashboard estatístico',
  'Knowledge Engine',
] as const;

const ARCHITECTURE_STEPS = [
  'Paciente',
  'OI',
  'Benchmark',
  'Inferência',
  'Plano',
  'Orçamento',
  'Resultado',
  'Validação',
  'Novo Benchmark',
] as const;

const PREDICTION_QUALITY_CARDS = [
  'Precisão da estimativa de mg',
  'Precisão da estimativa de semanas',
  'Precisão da estimativa de aplicações',
  'Precisão da perda prevista',
] as const;

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">{label}</p>
      <p className="mt-3 text-xl font-bold text-[#E8EDED] break-words">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#E8EDED]/55">{hint}</p> : null}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type OiValidationPanelProps = {
  snapshot: OiValidationSnapshot;
};

export default function OiValidationPanel({ snapshot }: OiValidationPanelProps) {
  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🧠
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#E8EDED]">OI Validation</h1>
            <p className="mt-1 text-sm text-[#E8EDED]/60 max-w-2xl">
              Centro administrativo de monitoramento da qualidade da Oftware Intelligence (OI). Esta página
              acompanha a evolução do modelo estatístico — não altera inferências em produção.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Resumo Geral */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Resumo Geral</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard label="Versão da OI" value={snapshot.modelVersion} hint="OI_MODEL_VERSION" />
          <SummaryCard
            label="Última atualização dos benchmarks"
            value={formatDate(snapshot.benchmarksLastUpdated)}
          />
          <SummaryCard
            label="Pacientes utilizados"
            value={snapshot.patientsUsed != null ? String(snapshot.patientsUsed) : '—'}
            hint={snapshot.patientsUsed != null ? 'Consolidado offline' : 'Se disponível'}
          />
          <SummaryCard label="Confiabilidade média" value="—" hint="Placeholder — em construção" />
          <SummaryCard label="Precisão média" value="—" hint="Placeholder — em construção" />
        </div>
      </section>

      {/* 2. Qualidade das Previsões */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Qualidade das Previsões
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PREDICTION_QUALITY_CARDS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">{label}</p>
              <p className="mt-3 text-sm font-medium text-[#E8EDED]/50">Em construção</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Benchmarks */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Benchmarks</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#E8EDED]/50">Quantidade de faixas</p>
              <p className="mt-1 text-lg font-semibold text-[#E8EDED]">{snapshot.faixaCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#E8EDED]/50">Origem dos benchmarks</p>
              <p className="mt-1 text-sm font-medium text-[#E8EDED]">{snapshot.benchmarkOrigin}</p>
            </div>
            <div>
              <p className="text-xs text-[#E8EDED]/50">Arquivo utilizado</p>
              <p className="mt-1 text-sm font-medium text-[#E8EDED] break-all">
                {snapshot.benchmarkPathDisplay ??
                  (snapshot.isFallback ? 'Utilizando benchmark fallback' : '—')}
              </p>
            </div>
          </div>
          {snapshot.isFallback && snapshot.benchmarkPathDisplay ? (
            <p className="text-xs text-amber-300/80">
              Arquivo fallback em uso até a primeira exportação offline gerar{' '}
              <code className="text-amber-200/90">tmp/oi/weight_loss_benchmarks.json</code>.
            </p>
          ) : null}
        </div>
      </section>

      {/* 4. Histórico */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Histórico</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr>
                  {['Versão', 'Data', 'Pacientes', 'Observações'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#E8EDED]/45">
                    Nenhum registro ainda — histórico de versões será preenchido nas próximas etapas.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. Roadmap */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Roadmap</h2>
        <ul className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/10">
          {ROADMAP_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-3 px-5 py-3 text-sm text-[#E8EDED]/80">
              <span className="text-[#E8EDED]/40 select-none" aria-hidden>
                ☐
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Arquitetura */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Arquitetura</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
            {ARCHITECTURE_STEPS.map((step, index) => (
              <div key={step} className="flex flex-col items-center w-full">
                <div className="w-full rounded-xl border border-[#4CCB7A]/25 bg-[#4CCB7A]/10 px-4 py-2.5 text-center text-sm font-medium text-[#E8EDED]">
                  {step}
                </div>
                {index < ARCHITECTURE_STEPS.length - 1 ? (
                  <ArrowDown className="h-4 w-4 my-1 text-[#4CCB7A]/50 shrink-0" aria-hidden />
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[#E8EDED]/45 flex items-center justify-center gap-2">
            <Brain className="h-3.5 w-3.5" />
            Ciclo contínuo de melhoria do modelo estatístico
          </p>
        </div>
      </section>

      {/* 7. Próximas Etapas */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Próximas Etapas</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#E8EDED]/75 leading-relaxed space-y-3">
          <p>
            A OI (Oftware Intelligence) ainda está em evolução. O modelo estatístico atual ({snapshot.modelVersion})
            utiliza benchmarks derivados de dados reais de tratamento, mas a validação sistemática da qualidade das
            previsões ainda será implementada.
          </p>
          <p>
            O objetivo desta página é acompanhar continuamente a qualidade dos modelos — medindo precisão,
            confiabilidade e evolução ao longo do tempo — sem alterar a lógica central da OI, que permanece em{' '}
            <code className="text-[#4CCB7A]/90">lib/oi/</code>.
          </p>
          <p className="text-[#E8EDED]/55">
            Toda inferência, benchmark e integração com Orçamento Terapêutico continua centralizada na OI. Esta
            interface é exclusivamente administrativa.
          </p>
        </div>
      </section>
    </div>
  );
}
